"""
Voice Sample Generator — Compare OpenAI TTS voices for The 2,500 Donkeys
Generates short audio clips using each voice + model combination.
"""
import os
import time
from pathlib import Path
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

SAMPLE_DIR = Path(__file__).resolve().parent / "voice-samples"
SAMPLE_DIR.mkdir(exist_ok=True)

# Literary sample from Block 0 (Genesis Hash) — perfect for testing narrative tone
SAMPLE_TEXT = """There is a moment — and every broker knows it, even if none would name it — when the deal stops being real and starts being inevitable.

Not inevitable because the gold exists. Not because the refinery has confirmed throughput. Not because the assay is validated, the shipping corridor secured, or the vault inspection completed.

Inevitable because enough people have said it is.

This is that moment.

What follows was hashed on a machine in a city that doesn't matter, by a hand that held no gold, signed no IMFPA, and never once confirmed proof of product. The timestamp is immutable. The chain does not forget. The narrative does not require your belief.

It only requires your attention."""

# Best voices for literary narration (male-leaning, authoritative, cinematic)
VOICES_TO_TEST = [
    # gpt-4o-mini-tts — newest, supports instructions for tone/emotion
    ("gpt-4o-mini-tts", "ash",     "Speak as a seasoned documentary narrator. Measured, authoritative, with gravitas. This is literary fiction about international fraud."),
    ("gpt-4o-mini-tts", "onyx",    "Speak as a seasoned documentary narrator. Measured, authoritative, with gravitas. This is literary fiction about international fraud."),
    ("gpt-4o-mini-tts", "echo",    "Speak as a seasoned documentary narrator. Measured, authoritative, with gravitas. This is literary fiction about international fraud."),
    ("gpt-4o-mini-tts", "sage",    "Speak as a seasoned documentary narrator. Measured, authoritative, with gravitas. This is literary fiction about international fraud."),
    ("gpt-4o-mini-tts", "coral",   "Speak as a seasoned documentary narrator. Measured, authoritative, with gravitas. This is literary fiction about international fraud."),
    ("gpt-4o-mini-tts", "ballad",  "Speak as a seasoned documentary narrator. Measured, authoritative, with gravitas. This is literary fiction about international fraud."),
    ("gpt-4o-mini-tts", "fable",   "Speak as a seasoned documentary narrator. Measured, authoritative, with gravitas. This is literary fiction about international fraud."),
    # tts-1-hd — established, clean, no instructions
    ("tts-1-hd", "onyx",   None),
    ("tts-1-hd", "echo",   None),
    ("tts-1-hd", "fable",  None),
    ("tts-1-hd", "nova",   None),
]

print()
print("=" * 56)
print("  VOICE SAMPLE GENERATOR — The 2,500 Donkeys")
print("=" * 56)
print(f"\n  Sample text: {len(SAMPLE_TEXT)} chars")
print(f"  Output: {SAMPLE_DIR}/")
print(f"  Voices: {len(VOICES_TO_TEST)} combinations\n")

for model, voice, instructions in VOICES_TO_TEST:
    filename = f"{model}_{voice}.mp3"
    output_path = SAMPLE_DIR / filename
    
    if output_path.exists():
        print(f"  SKIP  {filename} (exists)")
        continue
    
    print(f"  GEN   {filename} ...", end="", flush=True)
    start = time.time()
    
    try:
        kwargs = {
            "model": model,
            "voice": voice,
            "input": SAMPLE_TEXT,
            "response_format": "mp3",
        }
        if instructions and "gpt-4o" in model:
            kwargs["instructions"] = instructions
        
        response = client.audio.speech.create(**kwargs)
        response.stream_to_file(str(output_path))
        
        elapsed = time.time() - start
        size_kb = output_path.stat().st_size // 1024
        print(f" OK ({size_kb} KB, {elapsed:.1f}s)")
    except Exception as e:
        print(f" FAIL: {e}")

# Summary
print(f"\n── Samples Generated ──\n")
for f in sorted(SAMPLE_DIR.glob("*.mp3")):
    size_kb = f.stat().st_size // 1024
    print(f"  {f.name:45s}  {size_kb:>5d} KB")

print(f"\n  Listen to the samples in: {SAMPLE_DIR}")
print(f"  Pick the voice that sounds best for the book.\n")
