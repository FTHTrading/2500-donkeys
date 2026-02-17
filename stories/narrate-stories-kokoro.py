#!/usr/bin/env python3
"""
narrate-stories-kokoro.py — Kokoro TTS Narration for PPE Puppetry
=================================================================

Renders all 13 manuscript files to MP3 using Kokoro neural TTS.
Free, unlimited, no API key. Runs entirely on CPU.

Voice: bm_george (British Male - George) — deep, authoritative, literary.
       "A museum narrator describing a civilization that collapsed quietly."

Back matter uses bm_daniel (British Male - Daniel) — measured, procedural.

Usage:
  python stories/narrate-stories-kokoro.py                # Render all missing
  python stories/narrate-stories-kokoro.py --force        # Re-render everything
  python stories/narrate-stories-kokoro.py --chapter 3    # Render specific chapter
  python stories/narrate-stories-kokoro.py --dry-run      # Preview without rendering

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

# Prevent transformers from importing TensorFlow (hangs on Windows)
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

import numpy as np
import soundfile as sf

try:
    from kokoro import KPipeline
except ImportError:
    print("ERROR: kokoro not installed. Run: pip install kokoro soundfile")
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
MANUSCRIPT_DIR = Path(__file__).resolve().parent / "manuscript"
OUTPUT_DIR = ROOT / "audio" / "rendered-stories"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Manuscript files in reading order
FILES = [
    "00-front-matter.md",
    "01-mt799-is-not-money.md",
    "02-the-bank-that-didnt-exist.md",
    "03-commission-above-supply-depth.md",
    "04-the-ghost-monetizer.md",
    "05-the-mandate-that-couldnt-sign.md",
    "06-vault-without-address.md",
    "07-the-compliance-wall.md",
    "08-bonded-but-never-seen.md",
    "09-the-sovereign-whisper.md",
    "10-the-tokenized-mirage.md",
    "11-the-initiator-awakening.md",
    "12-back-matter.md",
]

# ── CLI flags ────────────────────────────────────────────────
args = sys.argv[1:]
DRY_RUN = "--dry-run" in args
FORCE = "--force" in args
CHAPTER_INDEX = None
if "--chapter" in args:
    idx = args.index("--chapter")
    if idx + 1 < len(args):
        CHAPTER_INDEX = int(args[idx + 1])

# ── Voice configuration ─────────────────────────────────────
NARRATOR_VOICE = "bm_george"    # British Male George — literary narrator
DOCUMENT_VOICE = "bm_daniel"    # British Male Daniel — procedural/formal
NARRATOR_SPEED = 0.92           # Slightly slower — deadpan storytelling
DOCUMENT_SPEED = 1.0            # Normal speed for glossary/back matter
SAMPLE_RATE = 24000             # Kokoro native sample rate

# Files that get the document voice (back matter)
DOCUMENT_FILES = {
    "00-front-matter.md",
    "12-back-matter.md",
}


def strip_markdown(text: str) -> str:
    """Strip markdown formatting for clean TTS input."""
    # Remove fenced div markers ::: {.class}
    text = re.sub(r"^:::\s*\{[^}]*\}\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^:::\s*$", "", text, flags=re.MULTILINE)
    # Remove headers but keep as pause markers
    text = re.sub(r"^#{1,6}\s+(.+)$", r"\n\n\1.\n\n", text, flags=re.MULTILINE)
    # Remove horizontal rules
    text = re.sub(r"^---+$", "\n\n", text, flags=re.MULTILINE)
    text = re.sub(r"^\*\s*\*\s*\*\s*$", "\n\n", text, flags=re.MULTILINE)
    # Remove bold/italic markers but keep text
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    # Remove blockquote markers but keep text
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    # Remove inline code markers
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Remove image references
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    # Remove link syntax, keep text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Clean up excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _find_ffmpeg() -> str:
    """Find ffmpeg executable."""
    import shutil
    path = shutil.which("ffmpeg")
    if path:
        return path
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
    wav_path.unlink(missing_ok=True)


def render_chapter(pipeline_b, index: int, filename: str, total: int) -> str:
    """Render a single chapter to MP3 via Kokoro."""
    mp3_name = filename.replace(".md", ".mp3")
    output_path = OUTPUT_DIR / mp3_name
    source_path = MANUSCRIPT_DIR / filename

    # Skip existing?
    if output_path.exists() and not FORCE:
        size_kb = output_path.stat().st_size // 1024
        print(f"  [{index:2d}/{total}] SKIP  {mp3_name} ({size_kb} KB exists)")
        return "skipped"

    # Read + strip markdown
    raw = source_path.read_text(encoding="utf-8")
    text = strip_markdown(raw)

    if not text.strip():
        print(f"  [{index:2d}/{total}] EMPTY {mp3_name}")
        return "skipped"

    # Choose voice
    is_doc = filename in DOCUMENT_FILES
    voice = DOCUMENT_VOICE if is_doc else NARRATOR_VOICE
    speed = DOCUMENT_SPEED if is_doc else NARRATOR_SPEED
    tag = "DOCUMENT" if is_doc else "STORY"

    if DRY_RUN:
        print(f"  [{index:2d}/{total}] DRY   {mp3_name} ({len(text):,} chars) [{tag}]")
        print(f"           Voice: {voice} | Speed: {speed}")
        return "dry"

    print(f"  [{index:2d}/{total}] RENDER {mp3_name} ({len(text):,} chars) [{tag}]")
    print(f"           Voice: {voice} | Speed: {speed}")

    start = time.time()
    try:
        generator = pipeline_b(text, voice=voice, speed=speed)
        all_audio = []
        for gs, ps, audio in generator:
            all_audio.append(audio)

        if not all_audio:
            print(f"           ✗ No audio generated")
            return "failed"

        combined = np.concatenate(all_audio)
        duration = len(combined) / SAMPLE_RATE

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
        for ext in (".wav", ".mp3"):
            p = OUTPUT_DIR / mp3_name.replace(".mp3", ext)
            p.unlink(missing_ok=True)
        return "failed"


def main():
    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║   KOKORO TTS — PPE Puppetry Narrator             ║")
    print("╚══════════════════════════════════════════════════╝")
    print()
    print(f"  Engine:     Kokoro 82M (hexgrad/Kokoro-82M)")
    print(f"  Narrator:   {NARRATOR_VOICE} (speed {NARRATOR_SPEED})")
    print(f"  Documents:  {DOCUMENT_VOICE} (speed {DOCUMENT_SPEED})")
    print(f"  Chapters:   {len(FILES)} total")
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

    for i, filename in enumerate(FILES):
        if CHAPTER_INDEX is not None and i != CHAPTER_INDEX:
            continue

        result = render_chapter(pipeline_b, i + 1, filename, len(FILES))
        if result == "rendered":
            rendered += 1
            mp3_path = OUTPUT_DIR / filename.replace(".md", ".mp3")
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
        print(f"  ⚠ {failed} chapter(s) failed. Retry with: python stories/narrate-stories-kokoro.py")
        sys.exit(1)
    elif DRY_RUN:
        total_chars = 0
        for filename in FILES:
            raw = (MANUSCRIPT_DIR / filename).read_text(encoding="utf-8")
            total_chars += len(strip_markdown(raw))
        print(f"  Total characters: {total_chars:,}")
        print(f"  Run without --dry-run to render.\n")
    else:
        print("  ✓ Narration complete.")
        print("  Next: node stories/hash-stories-audio.js  — Build audio Merkle tree")
    print()


if __name__ == "__main__":
    main()
