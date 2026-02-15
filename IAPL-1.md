# IAPL-1: Immutable Audio Provenance Layer

> Version 1.0.0 — Draft Specification

---

## Abstract

IAPL-1 defines a parallel audio provenance layer for the Literary Protocol Standard (LPS-1). It specifies how audiobook narration maps to manuscript blocks, how audio files are hashed into a Merkle tree, and how the resulting `audioRoot` integrates with the existing provenance chain without modifying the on-chain `MerkleRoots` struct.

The audio layer is **additive** — it does not alter the existing edition root or any on-chain state. It provides an independent, verifiable proof that a specific audio rendering corresponds to a specific manuscript state.

---

## 1. Motivation

LPS-1 proves text provenance: every chapter is hashed, Merkle-treed, and anchored on-chain. But a literary work distributed as an audiobook introduces a new content layer that needs its own provenance chain.

**Questions IAPL-1 answers:**

- Which audio files correspond to which manuscript blocks?
- Was the narration generated from the canonical text?
- Has any audio file been modified since rendering?
- Can a third party independently verify audio integrity without access to the rendering service?

---

## 2. Architecture

### 2.1 Relationship to LPS-1

```
LPS-1 (existing)                    IAPL-1 (new)
─────────────────                   ──────────────
manuscriptRoot ──────┐              
artifactRoot ────────┤              audioRoot
imageRoot ───────────┤                │
promptRoot ──────────┤                │
                     ▼                ▼
              editionRoot       audioEditionRoot
              (on-chain)        = sha256(editionRoot + audioRoot)
```

- `editionRoot` remains unchanged: `sha256(mRoot + aRoot + iRoot + pRoot)`
- `audioRoot` is computed from per-block audio file hashes
- `audioEditionRoot` binds the audio layer to the text layer: `sha256(editionRoot + audioRoot)`
- The existing on-chain `MerkleRoots` struct is not modified

### 2.2 Block Alignment

Audio files map 1:1 to manuscript blocks as defined in `build/order.json`:

| Manuscript Block | Audio File |
|-----------------|------------|
| `block-00-genesis.md` | `block-00-genesis.mp3` |
| `block-01-parking-lots.md` | `block-01-parking-lots.mp3` |
| ... | ... |
| `epilogue.md` | `epilogue.mp3` |

This alignment ensures that:

1. Every block has exactly one audio rendering
2. Merkle tree leaf order matches manuscript tree leaf order
3. Individual blocks can be verified independently

### 2.3 Merkle Tree Construction

The audio Merkle tree uses the same scheme as LPS-1:

- **Hash function:** SHA-256
- **Concatenation:** Ordered (position-aware): `sha256(left + right)`
- **Odd leaf rule:** Duplicate last leaf
- **Leaf hashes:** SHA-256 of raw audio file bytes

```
audioRoot
├── sha256(block-00.mp3 + block-01.mp3)
│   ├── sha256(block-00-genesis.mp3)
│   └── sha256(block-01-parking-lots.mp3)
├── sha256(block-01a.mp3 + block-01b.mp3)
│   ├── sha256(block-01a-raymonds-deal.mp3)
│   └── sha256(block-01b-first-broker.mp3)
└── ... (31 leaves total)
```

---

## 3. File Structure

```
audio/
├── audio-config.json          Voice + model configuration
├── render.js                  ElevenLabs TTS rendering script
├── hash-audio.js              Audio hash + Merkle tree builder
└── rendered/                  Generated audio files (gitignored)
    ├── block-00-genesis.mp3
    ├── block-01-parking-lots.mp3
    └── ... (31 files)

dist/
├── audio-manifest.json        Audio metadata + hashes + Merkle tree
└── merkle.json                Updated with audio tree (5th tree)
```

---

## 4. Audio Configuration

`audio/audio-config.json`:

```json
{
  "version": "IAPL-1",
  "voice": {
    "id": "<elevenlabs-voice-id>",
    "name": "<voice-name>",
    "model": "eleven_multilingual_v2"
  },
  "format": "mp3_44100_128",
  "stripMarkdown": true,
  "outputDir": "audio/rendered",
  "blockSource": "build/order.json"
}
```

### 4.1 Voice Selection Criteria

The voice should match the work's documented style guide:

> "Calm, controlled, intelligent, observational. Think Morgan Freeman narrating a financial autopsy."

Recommended ElevenLabs characteristics:
- Male voice
- British or neutral accent
- Low pitch, measured cadence
- Documentary/audiobook style

### 4.2 Text Preprocessing

Before TTS rendering, markdown is stripped to plain text:

1. Remove headers (`#`, `##`, etc.) — convert to pause markers
2. Remove emphasis markers (`*`, `**`, `_`)
3. Remove horizontal rules (`---`) — convert to long pause
4. Preserve paragraph breaks as natural pauses
5. Remove code blocks and inline code
6. Preserve em-dashes as read punctuation

---

## 5. Rendering Pipeline

### 5.1 Process

```
order.json → read block files → strip markdown → TTS render → save MP3
                                                      ↓
                                              audio/rendered/*.mp3
```

### 5.2 ElevenLabs API

- **Endpoint:** `POST /v1/text-to-speech/{voice_id}`
- **Model:** `eleven_multilingual_v2` (highest quality)
- **Format:** MP3 44.1kHz 128kbps
- **Rate limiting:** Respect API rate limits, sequential rendering
- **Idempotency:** Skip blocks where MP3 already exists (unless `--force`)

### 5.3 CLI Usage

```bash
npm run audio:render              # Render all blocks
npm run audio:render -- --block 0 # Render single block
npm run audio:render -- --force   # Re-render all (overwrite)
npm run audio:render -- --dry-run # Preview without calling API
```

---

## 6. Hashing Pipeline

### 6.1 Process

```
audio/rendered/*.mp3 → SHA-256 each → build Merkle tree → audioRoot
                                            ↓
                                   dist/audio-manifest.json
```

### 6.2 Audio Manifest Schema

`dist/audio-manifest.json`:

```json
{
  "version": "IAPL-1",
  "generatedAt": "<ISO-8601>",
  "edition": "edition-2",
  "voice": {
    "id": "<voice-id>",
    "name": "<voice-name>",
    "model": "<model>"
  },
  "audioRoot": "<sha256-hex>",
  "audioEditionRoot": "<sha256(editionRoot + audioRoot)>",
  "blocks": [
    {
      "id": "block-00",
      "file": "block-00-genesis.mp3",
      "sourceBlock": "block-00-genesis.md",
      "sha256": "<hash>",
      "sizeBytes": 1234567,
      "durationSeconds": 180.5
    }
  ],
  "tree": {
    "root": "<audioRoot>",
    "leafCount": 31,
    "leaves": [ ... ],
    "algorithm": "sha256",
    "merkleScheme": "ordered-concatenation",
    "oddLeafRule": "duplicate-last"
  }
}
```

---

## 7. Verification

### 7.1 Extensions to lps-verify

IAPL-1 adds a conditional Phase 6 to `lps-verify`:

| Check | What It Proves |
|-------|----------------|
| Audio manifest exists | dist/audio-manifest.json present |
| All 31 audio files present | Every block has a rendered MP3 |
| File hashes match manifest | SHA-256 of each MP3 matches stored hash |
| Audio Merkle root matches | Rebuilt tree root equals stored audioRoot |
| audioEditionRoot correct | sha256(editionRoot + audioRoot) matches |
| Cross-reference with text | Audio blocks align with manuscript blocks |

**Phase 6 is skipped gracefully** if no audio files exist. This preserves backward compatibility — repositories without audio still pass all 51 checks.

### 7.2 Standalone Audio Verification

```bash
npm run audio:verify    # Verify audio layer independently
```

---

## 8. Integration with genesis.json

When audio is rendered and hashed, `genesis.json` gains an `audio` section:

```json
{
  "roots": {
    "editionRoot": "...",
    "manuscriptRoot": "...",
    "artifactRoot": "...",
    "imageRoot": "...",
    "promptRoot": "...",
    "audioRoot": "...",
    "audioEditionRoot": "..."
  },
  "audio": {
    "version": "IAPL-1",
    "voice": { "id": "...", "name": "...", "model": "..." },
    "blockCount": 31,
    "totalSizeBytes": 0,
    "totalDurationSeconds": 0,
    "manifest": "dist/audio-manifest.json"
  }
}
```

---

## 9. On-Chain Anchoring (Future)

IAPL-1 v1.0 stores audioRoot off-chain in manifest files. Future versions may anchor audioRoot on-chain via:

1. **LiteraryAnchor edition note:** Store audioRoot in the edition note field
2. **New AudioAnchor contract:** Dedicated contract for audio provenance
3. **KernelV3:** Extended MerkleRoots struct with audioRoot field

Until on-chain anchoring is implemented, the audio Merkle tree is verifiable locally and via IPFS.

---

## 10. Security Considerations

- Audio files are large (MB range) — SHA-256 hashing is the integrity mechanism
- MP3 encoding is deterministic for same input + same encoder settings
- Voice cloning attacks are outside IAPL-1's scope — the layer proves file integrity, not voice authenticity
- The `audioEditionRoot` binding ensures audio cannot be attributed to a different manuscript version

---

## 11. Conformance

A conforming IAPL-1 implementation MUST:

1. Hash audio files using SHA-256
2. Build Merkle trees using ordered (position-aware) concatenation
3. Map audio files 1:1 to manuscript blocks
4. Produce a machine-readable audio manifest
5. Compute `audioEditionRoot = sha256(editionRoot + audioRoot)`

A conforming IAPL-1 implementation MAY:

1. Support multiple audio formats (WAV, FLAC, MP3)
2. Support multiple narration voices
3. Include duration and bitrate metadata
4. Anchor audioRoot on-chain

---

## References

- [LPS-1](LPS-1.md) — Literary Protocol Standard v1
- [Deterministic Literary Publishing](https://doi.org/10.5281/zenodo.18646886) — Research paper
- [ElevenLabs API](https://docs.elevenlabs.io/api-reference) — Text-to-speech rendering
