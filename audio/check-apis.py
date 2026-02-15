"""Check TTS API availability and quotas."""
import requests
import os
import json

print("=" * 50)
print("  TTS API STATUS CHECK")
print("=" * 50)

# ── ElevenLabs ──
print("\n── ElevenLabs ──")
el_key = os.environ.get("ELEVENLABS_API_KEY", "")
print(f"  Key: {len(el_key)} chars")
if el_key:
    try:
        r = requests.get(
            "https://api.elevenlabs.io/v1/user/subscription",
            headers={"xi-api-key": el_key},
            timeout=10,
        )
        d = r.json()
        if "detail" in d:
            detail = d["detail"]
            if isinstance(detail, dict):
                print(f"  Status: {detail.get('status', 'error')}")
                print(f"  Message: {detail.get('message', 'unknown')}")
            else:
                print(f"  Error: {detail}")
        else:
            used = d.get("character_count", 0)
            limit = d.get("character_limit", 0)
            remaining = limit - used
            tier = d.get("tier", "unknown")
            next_reset = d.get("next_character_count_reset_unix", 0)
            print(f"  Tier: {tier}")
            print(f"  Used: {used:,} / {limit:,}")
            print(f"  Remaining: {remaining:,} characters")
            if remaining > 0:
                print("  >> AVAILABLE for rendering")
            else:
                print("  >> QUOTA EXHAUSTED")
    except Exception as e:
        print(f"  Error: {e}")
else:
    print("  Not configured")

# ── OpenAI TTS ──
print("\n── OpenAI TTS ──")
oa_key = os.environ.get("OPENAI_API_KEY", "")
print(f"  Key: {len(oa_key)} chars")
if oa_key:
    try:
        # Check models endpoint to verify key works
        r = requests.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {oa_key}"},
            timeout=10,
        )
        if r.status_code == 200:
            models = r.json().get("data", [])
            tts_models = [m["id"] for m in models if "tts" in m["id"].lower()]
            print(f"  Status: Active")
            print(f"  TTS Models: {tts_models}")
            print(f"  Available voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer")
            print("  >> AVAILABLE for rendering")
        else:
            d = r.json()
            err = d.get("error", {})
            print(f"  Status: {err.get('type', r.status_code)}")
            print(f"  Message: {err.get('message', 'unknown')}")
    except Exception as e:
        print(f"  Error: {e}")
else:
    print("  Not configured")

print()
