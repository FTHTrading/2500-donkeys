#!/usr/bin/env python3
"""
narrate-kokoro.py — Kokoro TTS Narration Engine for The 2,500 Donkeys
=====================================================================

Renders all manuscript blocks + artifacts to MP3 using Kokoro neural TTS.
Free, unlimited, no API key. Runs entirely on CPU (~7-8s per minute of audio.

Voice: bm_george (British Male - George) — deep, authoritative, literary.
Artifacts use bm_daniel (British Male - Daniel) — measured, procedural.

Usage:
  python audio/narrate-kokoro.py                # Render all missing
  python audio/narrate-kokoro.py --force        # Re-render everything
  python audio/narrate-kokoro.py --block 0      # Render specific block
  python audio/narrate-kokoro.py --dry-run      # Preview without rendering

Requires: pip install kokoro soundfile pydub
Requires: ffmpeg (for MP3 encoding)
"""

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

try:
    from kokoro import KPipeline
except ImportError:
    print("ERROR: kokoro not installed. Run: pip install kokoro soundfile")
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
ORDER_FILE = ROOT / "build" / "order.json"
MANUSCRIPT_DIR = ROOT / "manuscript"
ARTIFACTS_DIR = ROOT / "artifacts"
OUTPUT_DIR = ROOT / "audio" / "rendered"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Load order ───────────────────────────────────────────────
with open(ORDER_FILE) as f:
    order = json.load(f)

# ── CLI flags ────────────────────────────────────────────────
args = sys.argv[1:]
DRY_RUN = "--dry-run" in args
FORCE = "--force" in args
BLOCK_INDEX = None
if "--block" in args:
    idx = args.index("--block")
    if idx + 1 < len(args):
        BLOCK_INDEX = int(args[idx + 1])

# ── Voice configuration ─────────────────────────────────────
NARRATOR_VOICE = "bm_george"    # British Male George — literary narrator
DOCUMENT_VOICE = "bm_daniel"    # British Male Daniel — procedural/formal
NARRATOR_SPEED = 0.92           # Slightly slower for storytelling
DOCUMENT_SPEED = 1.0            # Normal speed for documents
SAMPLE_RATE = 24000             # Kokoro native sample rate

# Artifact files that get the document voice
ARTIFACT_FILES = {
    "whatsapp-forward-17.md",
    "commission-waterfall.md",
    "esg-deck-excerpt.md",
    "carbon-registry-summary.md",
    "imfpa-redline-v3.md",
}


def strip_markdown(text: str) -> str:
    """Strip markdown formatting for clean TTS input."""
    # Remove headers
    text = re.sub(r"^#{1,6}\s+.*$", "", text, flags=re.MULTILINE)
    # Remove horizontal rules
    text = re.sub(r"^---+$", "", text, flags=re.MULTILINE)
    # Remove bold/italic markers but keep text
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    # Remove blockquote markers but keep text
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    # Remove inline code markers
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Clean up excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def build_block_list():
    """Build flat list of all blocks (prose + artifacts) in reading order."""
    blocks = []
    for block in order["blocks"]:
        blocks.append({
            "file": block["file"],
            "title": block.get("title", block["file"]),
            "source_dir": MANUSCRIPT_DIR,
            "is_artifact": False,
        })
        if "artifactInserts" in block:
            for insert in block["artifactInserts"]:
                art_name = insert["artifact"]
                title = art_name.replace(".md", "").replace("-", " ").title()
                blocks.append({
                    "file": art_name,
                    "title": title,
                    "source_dir": ARTIFACTS_DIR,
                    "is_artifact": True,
                })
    return blocks


def _find_ffmpeg() -> str:
    """Find ffmpeg executable, checking common locations."""
    import shutil
    path = shutil.which("ffmpeg")
    if path:
        return path
    # WinGet install location
    winget_path = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    for p in winget_path.glob("Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe"):
        return str(p)
    raise FileNotFoundError("ffmpeg not found. Install via: winget install --id Gyan.FFmpeg")

FFMPEG = _find_ffmpeg()


def wav_to_mp3(wav_path: Path, mp3_path: Path):
    """Convert WAV to MP3 using ffmpeg at 192kbps CBR."""
    cmd = [
        FFMPEG, "-y", "-i", str(wav_path),
        "-codec:a", "libmp3lame",
        "-b:a", "192k",
        "-ar", "24000",
        "-ac", "1",
        str(mp3_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")
    # Remove temp WAV
    wav_path.unlink(missing_ok=True)


def render_block(pipeline_b, index: int, block: dict, total: int) -> str:
    """Render a single block to MP3 via Kokoro."""
    filename = block["file"]
    mp3_name = filename.replace(".md", ".mp3")
    output_path = OUTPUT_DIR / mp3_name
    source_path = block["source_dir"] / filename

    # Skip existing?
    if output_path.exists() and not FORCE:
        size_kb = output_path.stat().st_size // 1024
        print(f"  [{index + 1:2d}/{total}] SKIP  {mp3_name} ({size_kb} KB exists)")
        return "skipped"

    # Read + strip markdown
    raw = source_path.read_text(encoding="utf-8")
    text = strip_markdown(raw)

    if not text.strip():
        print(f"  [{index + 1:2d}/{total}] EMPTY {mp3_name}")
        return "skipped"

    # Choose voice
    is_doc = filename in ARTIFACT_FILES
    voice = DOCUMENT_VOICE if is_doc else NARRATOR_VOICE
    speed = DOCUMENT_SPEED if is_doc else NARRATOR_SPEED
    tag = "DOCUMENT" if is_doc else "PROSE"

    if DRY_RUN:
        print(f"  [{index + 1:2d}/{total}] DRY   {mp3_name} ({len(text):,} chars) [{tag}]")
        print(f"           Voice: {voice} | Speed: {speed}")
        return "dry"

    print(f"  [{index + 1:2d}/{total}] RENDER {mp3_name} ({len(text):,} chars) [{tag}]")
    print(f"           Voice: {voice} | Speed: {speed}")

    start = time.time()
    try:
        # Generate audio chunks
        generator = pipeline_b(text, voice=voice, speed=speed)
        all_audio = []
        for gs, ps, audio in generator:
            all_audio.append(audio)

        if not all_audio:
            print(f"           ✗ No audio generated")
            return "failed"

        combined = np.concatenate(all_audio)
        duration = len(combined) / SAMPLE_RATE

        # Write temp WAV then convert to MP3
        wav_path = OUTPUT_DIR / mp3_name.replace(".mp3", ".wav")
        sf.write(str(wav_path), combined, SAMPLE_RATE)
        wav_to_mp3(wav_path, output_path)

        elapsed = time.time() - start
        size_kb = output_path.stat().st_size // 1024
        ratio = elapsed / duration if duration > 0 else 0
        print(f"           ✓ {size_kb:,} KB | {duration:.0f}s audio | {elapsed:.1f}s render ({ratio:.2f}x)")
        return "rendered"

    except Exception as e:
        print(f"           ✗ Failed: {e}")
        # Clean up partial files
        for ext in (".wav", ".mp3"):
            p = OUTPUT_DIR / mp3_name.replace(".mp3", ext)
            p.unlink(missing_ok=True)
        return "failed"


def main():
    blocks = build_block_list()

    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║   KOKORO TTS — The 2,500 Donkeys Narrator       ║")
    print("╚══════════════════════════════════════════════════╝")
    print()
    print(f"  Engine:     Kokoro 82M (hexgrad/Kokoro-82M)")
    print(f"  Narrator:   {NARRATOR_VOICE} (speed {NARRATOR_SPEED})")
    print(f"  Documents:  {DOCUMENT_VOICE} (speed {DOCUMENT_SPEED})")
    print(f"  Blocks:     {len(blocks)} total ({sum(1 for b in blocks if not b['is_artifact'])} prose + {sum(1 for b in blocks if b['is_artifact'])} artifacts)")
    print(f"  Output:     {OUTPUT_DIR.relative_to(ROOT)}/")
    print(f"  Format:     MP3 192kbps CBR")
    mode = "DRY RUN" if DRY_RUN else ("FORCE RE-RENDER" if FORCE else "NORMAL (skip existing)")
    print(f"  Mode:       {mode}")
    print()

    # Load Kokoro pipeline (British English)
    if not DRY_RUN:
        print("  Loading Kokoro model...", flush=True)
        pipeline_b = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
        print("  Model loaded.\n")
    else:
        pipeline_b = None

    print("── Rendering ──\n")

    rendered = 0
    skipped = 0
    failed = 0
    total_bytes = 0
    start_all = time.time()

    for i, block in enumerate(blocks):
        if BLOCK_INDEX is not None and i != BLOCK_INDEX:
            continue

        result = render_block(pipeline_b, i, block, len(blocks))
        if result == "rendered":
            rendered += 1
            mp3_path = OUTPUT_DIR / block["file"].replace(".md", ".mp3")
            if mp3_path.exists():
                total_bytes += mp3_path.stat().st_size
        elif result == "skipped":
            skipped += 1
        elif result == "failed":
            failed += 1

    elapsed_all = time.time() - start_all
    total_mb = total_bytes / (1024 * 1024)

    print()
    print("── Summary ──\n")
    print(f"  Rendered: {rendered}")
    print(f"  Skipped:  {skipped}")
    print(f"  Failed:   {failed}")
    if rendered > 0:
        print(f"  New Size: {total_mb:.1f} MB")
    print(f"  Time:     {elapsed_all:.1f}s")
    print()

    if failed > 0:
        print(f"  ⚠ {failed} block(s) failed. Retry with: python audio/narrate-kokoro.py")
        sys.exit(1)
    elif DRY_RUN:
        total_chars = 0
        for block in blocks:
            raw = (block["source_dir"] / block["file"]).read_text(encoding="utf-8")
            total_chars += len(strip_markdown(raw))
        print(f"  Total characters: {total_chars:,}")
        print(f"  Run without --dry-run to render.\n")
    else:
        print("  ✓ Narration complete.")
        print("  Next: node audio/hash-audio.js  — Rebuild audio Merkle tree")
    print()


if __name__ == "__main__":
    main()
