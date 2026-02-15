#!/usr/bin/env python3
"""
narrate.py — Internal Narration Engine for The 2,500 Donkeys
============================================================

Renders all manuscript blocks to MP3 using Microsoft Edge neural TTS.
Free, unlimited, no API key required. Our own system.

Features:
  - Voice profiles: narrator, document, warm, female — per-chapter overrides
  - SSML annotations: pauses at chapter breaks, section dividers, em dashes
  - Storytelling flow: controlled pacing for literary narration
  - Skip existing: only re-renders changed or missing files
  - Parallel-safe: renders sequentially with ordered output

Usage:
  python audio/narrate.py                  # Render all missing chapters
  python audio/narrate.py --force          # Re-render everything
  python audio/narrate.py --block 0        # Render specific block index
  python audio/narrate.py --profile warm   # Use alternate voice profile
  python audio/narrate.py --dry-run        # Preview without rendering
  python audio/narrate.py --list-voices    # Show available voices

Requires: pip install edge-tts
"""

import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("ERROR: edge-tts not installed. Run: pip install edge-tts")
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
VOICES_FILE = ROOT / "audio" / "voices.json"
ORDER_FILE = ROOT / "build" / "order.json"
MANUSCRIPT_DIR = ROOT / "manuscript"
ARTIFACTS_DIR = ROOT / "artifacts"

# ── Load Configuration ──────────────────────────────────────
with open(VOICES_FILE) as f:
    config = json.load(f)

with open(ORDER_FILE) as f:
    order = json.load(f)

OUTPUT_DIR = ROOT / config["outputDir"]
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── CLI Args ─────────────────────────────────────────────────
args = sys.argv[1:]
DRY_RUN = "--dry-run" in args
FORCE = "--force" in args
LIST_VOICES = "--list-voices" in args
PROFILE_OVERRIDE = None
BLOCK_INDEX = None

if "--profile" in args:
    idx = args.index("--profile")
    if idx + 1 < len(args):
        PROFILE_OVERRIDE = args[idx + 1]

if "--block" in args:
    idx = args.index("--block")
    if idx + 1 < len(args):
        BLOCK_INDEX = int(args[idx + 1])


def strip_markdown(text: str) -> str:
    """Strip markdown formatting for clean TTS input."""
    # Remove headers (# lines)
    text = re.sub(r"^#{1,6}\s+.*$", "", text, flags=re.MULTILINE)
    # Remove horizontal rules
    text = re.sub(r"^---+$", "", text, flags=re.MULTILINE)
    # Remove bold/italic markers but keep text
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    # Remove blockquote markers
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    # Clean up multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def text_to_ssml(text: str, profile: dict, ssml_config: dict) -> str:
    """
    Convert narration text to SSML with proper storytelling pacing.
    Adds pauses at paragraph breaks, section dividers, and em dashes.
    """
    voice = profile["voice"]
    rate = profile.get("rate", "+0%")
    pitch = profile.get("pitch", "+0Hz")

    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    ssml_parts = []
    ssml_parts.append(f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">')
    ssml_parts.append(f'<voice name="{voice}">')
    ssml_parts.append(f'<prosody rate="{rate}" pitch="{pitch}">')

    for i, para in enumerate(paragraphs):
        # Handle section breaks (lines that were ---)
        if para == "":
            ssml_parts.append(f'<break time="{ssml_config["sectionBreakPause"]}"/>')
            continue

        # Add em dash pauses
        para = para.replace(" — ", f' <break time="{ssml_config["emDashPause"]}"/> ')
        para = para.replace("—", f'<break time="{ssml_config["emDashPause"]}"/>')

        ssml_parts.append(f"<p>{para}</p>")

        # Paragraph pause
        if i < len(paragraphs) - 1:
            ssml_parts.append(f'<break time="{ssml_config["paragraphPause"]}"/>')

    ssml_parts.append("</prosody>")
    ssml_parts.append("</voice>")
    ssml_parts.append("</speak>")

    return "\n".join(ssml_parts)


def get_voice_profile(filename: str) -> dict:
    """Get the voice profile for a given file."""
    if PROFILE_OVERRIDE and PROFILE_OVERRIDE in config["profiles"]:
        return config["profiles"][PROFILE_OVERRIDE]

    overrides = config["chapterVoices"]["overrides"]
    if filename in overrides:
        profile_name = overrides[filename]
    else:
        profile_name = config["chapterVoices"]["default"]

    return config["profiles"][profile_name]


def build_block_list():
    """Build the flat list of blocks in reading order."""
    blocks = []
    for block in order["blocks"]:
        blocks.append({
            "file": block["file"],
            "title": block.get("title", block["file"]),
            "source_dir": MANUSCRIPT_DIR,
            "is_artifact": False,
        })
        # Insert artifacts after their parent block
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


async def list_voices():
    """List available voices."""
    voices = await edge_tts.list_voices()
    en_voices = [v for v in voices if v["Locale"].startswith("en-")]
    print(f"\n── Available English Voices ({len(en_voices)}) ──\n")
    for v in sorted(en_voices, key=lambda x: x["ShortName"]):
        cats = ", ".join(v.get("VoiceTag", {}).get("ContentCategories", "").split(","))
        pers = v.get("VoiceTag", {}).get("VoicePersonalities", "")
        print(f"  {v['ShortName']:40s} {v['Gender']:8s} {cats}")
        if pers:
            print(f"  {'':40s}          {pers}")
    print(f"\n  Current profiles:")
    for name, p in config["profiles"].items():
        print(f"    {name:20s} → {p['voice']}")
    print()


async def render_block(index: int, block: dict, total: int):
    """Render a single block to MP3."""
    filename = block["file"]
    title = block["title"]
    mp3_name = filename.replace(".md", ".mp3")
    output_path = OUTPUT_DIR / mp3_name
    source_path = block["source_dir"] / filename

    # Skip existing?
    if output_path.exists() and not FORCE:
        size_kb = output_path.stat().st_size // 1024
        print(f"  [{index + 1}/{total}] SKIP  {mp3_name} ({size_kb} KB exists)")
        return "skipped"

    # Read source
    raw = source_path.read_text(encoding="utf-8")
    text = strip_markdown(raw)

    if DRY_RUN:
        tag = "ARTIFACT" if block["is_artifact"] else "PROSE"
        profile = get_voice_profile(filename)
        print(f'  [{index + 1}/{total}] DRY   {mp3_name} ({len(text)} chars) [{tag}]')
        print(f'         Voice: {profile["voice"]} | Rate: {profile.get("rate", "+0%")}')
        snippet = text[:60].replace("\n", " ")
        print(f'         > "{snippet}…"')
        return "dry"

    # Get voice profile
    profile = get_voice_profile(filename)
    voice = profile["voice"]
    rate = profile.get("rate", "+0%")
    pitch = profile.get("pitch", "+0Hz")

    tag = "ARTIFACT" if block["is_artifact"] else "PROSE"
    print(f"  [{index + 1}/{total}] RENDER {mp3_name} ({len(text)} chars) [{tag}]")
    print(f"         Voice: {voice} | Rate: {rate}")

    max_retries = 4
    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await communicate.save(str(output_path))

            size_kb = output_path.stat().st_size // 1024
            if size_kb == 0:
                print(f"         ✗ Empty file — voice may not support this text length")
                output_path.unlink(missing_ok=True)
                return "failed"

            print(f"         ✓ {size_kb} KB written")
            return "rendered"
        except Exception as e:
            output_path.unlink(missing_ok=True)
            if attempt < max_retries - 1:
                wait = 2 ** attempt * 3  # 3s, 6s, 12s
                print(f"         ⟳ Retry {attempt + 1}/{max_retries - 1} in {wait}s — {type(e).__name__}")
                await asyncio.sleep(wait)
            else:
                print(f"         ✗ Failed after {max_retries} attempts: {e}")
                return "failed"


async def main():
    blocks = build_block_list()

    print()
    print("══════════════════════════════════════════════════")
    print("  DONKEY NARRATOR — Internal Narration Engine")
    print("══════════════════════════════════════════════════")
    print()

    if LIST_VOICES:
        await list_voices()
        return

    default_profile = config["profiles"][config["chapterVoices"]["default"]]
    mode = "DRY RUN" if DRY_RUN else ("FORCE" if FORCE else "NORMAL (skip existing)")

    print(f"  Engine:   Microsoft Edge Neural TTS (free, unlimited)")
    print(f"  Primary:  {default_profile['voice']} ({config['chapterVoices']['default']})")
    print(f"  Rate:     {default_profile.get('rate', '+0%')}")
    print(f"  Blocks:   {len(blocks)} ({sum(1 for b in blocks if not b['is_artifact'])} prose + {sum(1 for b in blocks if b['is_artifact'])} artifacts)")
    print(f"  Output:   {OUTPUT_DIR.relative_to(ROOT)}/")
    print(f"  Mode:     {mode}")
    if PROFILE_OVERRIDE:
        p = config["profiles"].get(PROFILE_OVERRIDE, {})
        print(f"  Override: {PROFILE_OVERRIDE} → {p.get('voice', '?')}")
    print()
    print("── Rendering ──")
    print()

    rendered = 0
    skipped = 0
    failed = 0
    total_bytes = 0
    start = time.time()

    for i, block in enumerate(blocks):
        if BLOCK_INDEX is not None and i != BLOCK_INDEX:
            continue

        result = await render_block(i, block, len(blocks))
        if result == "rendered":
            rendered += 1
            mp3_path = OUTPUT_DIR / block["file"].replace(".md", ".mp3")
            if mp3_path.exists():
                total_bytes += mp3_path.stat().st_size
        elif result == "skipped":
            skipped += 1
        elif result == "failed":
            failed += 1

    elapsed = time.time() - start
    total_mb = total_bytes / (1024 * 1024)

    print()
    print("── Summary ──")
    print()
    print(f"  Rendered: {rendered}")
    print(f"  Skipped:  {skipped}")
    print(f"  Failed:   {failed}")
    if rendered > 0:
        print(f"  Size:     {total_mb:.1f} MB")
    print(f"  Time:     {elapsed:.1f}s")
    print()

    if failed > 0:
        print(f"  ⚠ {failed} block(s) failed. Retry with: python audio/narrate.py")
        sys.exit(1)
    elif DRY_RUN:
        total_chars = 0
        for block in blocks:
            raw = (block["source_dir"] / block["file"]).read_text(encoding="utf-8")
            total_chars += len(strip_markdown(raw))
        print(f"  Total characters: {total_chars:,}")
        print(f"  Run without --dry-run to render audio.")
    else:
        print("  ✓ Narration complete.")
        print("  Next: node audio/hash-audio.js  — Build audio Merkle tree")
    print()


if __name__ == "__main__":
    asyncio.run(main())
