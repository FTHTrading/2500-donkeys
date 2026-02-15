"""
Kokoro TTS Voice Sampler — Test all available voices for The 2,500 Donkeys
Generates short clips using Kokoro's high-quality neural TTS.
"""
import time
import sys
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent / "voice-samples"
SAMPLE_DIR.mkdir(exist_ok=True)

SAMPLE_TEXT = """There is a moment, and every broker knows it, even if none would name it, when the deal stops being real and starts being inevitable.

Not inevitable because the gold exists. Not because the refinery has confirmed throughput. Not because the assay is validated, the shipping corridor secured, or the vault inspection completed.

Inevitable because enough people have said it is.

This is that moment.

What follows was hashed on a machine in a city that doesn't matter, by a hand that held no gold, signed no IMFPA, and never once confirmed proof of product. The timestamp is immutable. The chain does not forget. The narrative does not require your belief.

It only requires your attention."""

print()
print("=" * 56)
print("  KOKORO TTS — Voice Sample Generator")
print("=" * 56)
print()

print("  Loading Kokoro model...", flush=True)
start_load = time.time()

try:
    from kokoro import KPipeline
    import soundfile as sf
except ImportError as e:
    print(f"  ERROR: {e}")
    print("  Install: pip install kokoro soundfile")
    sys.exit(1)

# Available Kokoro voices/language codes
# a = American English, b = British English
VOICES_TO_TEST = [
    # American English voices
    ("a", "af_heart",   "American Female - Heart (warm)"),
    ("a", "af_alloy",   "American Female - Alloy"),
    ("a", "af_aoede",   "American Female - Aoede"),
    ("a", "af_bella",   "American Female - Bella"),
    ("a", "af_jessica", "American Female - Jessica"),
    ("a", "af_nicole",  "American Female - Nicole"),
    ("a", "af_nova",    "American Female - Nova"),
    ("a", "af_river",   "American Female - River"),
    ("a", "af_sarah",   "American Female - Sarah"),
    ("a", "af_sky",     "American Female - Sky"),
    ("a", "am_adam",    "American Male - Adam"),
    ("a", "am_echo",    "American Male - Echo"),
    ("a", "am_eric",    "American Male - Eric"),
    ("a", "am_fenrir",  "American Male - Fenrir"),
    ("a", "am_liam",    "American Male - Liam"),
    ("a", "am_michael", "American Male - Michael"),
    ("a", "am_onyx",    "American Male - Onyx"),
    ("a", "am_puck",    "American Male - Puck"),
    ("a", "am_santa",   "American Male - Santa"),
    # British English voices
    ("b", "bf_alice",   "British Female - Alice"),
    ("b", "bf_emma",    "British Female - Emma"),
    ("b", "bf_isabella","British Female - Isabella"),
    ("b", "bf_lily",    "British Female - Lily"),
    ("b", "bm_daniel",  "British Male - Daniel"),
    ("b", "bm_fable",   "British Male - Fable"),
    ("b", "bm_george",  "British Male - George"),
    ("b", "bm_lewis",   "British Male - Lewis"),
]

# Prioritize male narrators for this book's tone
PRIORITY_VOICES = [
    "am_adam", "am_echo", "am_fenrir", "am_liam", "am_michael", "am_onyx",
    "bm_daniel", "bm_fable", "bm_george", "bm_lewis",
    "af_heart", "af_nova", "af_river",  # a few female voices for comparison
]

# Filter to priority voices first
priority_tests = [v for v in VOICES_TO_TEST if v[1] in PRIORITY_VOICES]
other_tests = [v for v in VOICES_TO_TEST if v[1] not in PRIORITY_VOICES]

print(f"  Priority voices: {len(priority_tests)}")
print(f"  Other voices: {len(other_tests)}")
print(f"  Sample text: {len(SAMPLE_TEXT)} chars")
print()

# We'll build pipelines as needed
pipelines = {}

def get_pipeline(lang_code):
    if lang_code not in pipelines:
        print(f"  Loading pipeline for lang={lang_code}...", flush=True)
        pipelines[lang_code] = KPipeline(lang_code=lang_code)
    return pipelines[lang_code]

print("── Priority Voices ──\n")

for lang_code, voice_id, description in priority_tests:
    filename = f"kokoro_{voice_id}.wav"
    output_path = SAMPLE_DIR / filename
    
    if output_path.exists():
        size_kb = output_path.stat().st_size // 1024
        print(f"  SKIP  {voice_id:20s} {description:40s} ({size_kb} KB exists)")
        continue
    
    print(f"  GEN   {voice_id:20s} {description:40s} ...", end="", flush=True)
    start = time.time()
    
    try:
        pipeline = get_pipeline(lang_code)
        generator = pipeline(SAMPLE_TEXT, voice=voice_id, speed=0.95)
        
        # Collect all audio chunks
        all_audio = []
        for gs, ps, audio in generator:
            all_audio.append(audio)
        
        if all_audio:
            import numpy as np
            combined = np.concatenate(all_audio)
            sf.write(str(output_path), combined, 24000)
            
            elapsed = time.time() - start
            size_kb = output_path.stat().st_size // 1024
            duration = len(combined) / 24000
            print(f" OK ({size_kb} KB, {duration:.0f}s audio, {elapsed:.1f}s render)")
        else:
            print(f" EMPTY")
    except Exception as e:
        print(f" FAIL: {e}")

print(f"\n── Summary ──\n")
for f in sorted(SAMPLE_DIR.glob("kokoro_*.wav")):
    size_kb = f.stat().st_size // 1024
    print(f"  {f.name:40s}  {size_kb:>6d} KB")

print(f"\n  Samples in: {SAMPLE_DIR}")
print(f"  Play them to compare voice quality.\n")
