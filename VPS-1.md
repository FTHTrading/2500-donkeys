# Verifiable Publishing Standard v1 (VPS-1)

> **Status:** Draft  
> **Version:** 1.0.0  
> **Authors:** Kevan Burns (Kidd James) / FTH Trading  
> **Created:** 2025  
> **Incorporates:** LPS-1 (Literary Protocol Standard v1), IAPL-1 (Immutable Audio Provenance Layer v1)  
> **Reference Implementation:** [The 2,500 Donkeys](https://github.com/FTHTrading/2500-donkeys)  
> **DOI:** [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)

---

## Abstract

VPS-1 defines a complete, portable standard for deterministic literary publishing with cryptographic provenance. It unifies two complementary layers — **text provenance** (LPS-1) and **audio provenance** (IAPL-1) — into a single specification that any publisher, platform, or independent author can implement from scratch without access to the reference implementation.

The standard transforms publishing from a trust-based model ("the publisher says this is the real version") into a verification-based model ("the chain proves this is the real version, and here is the math").

A conforming implementation produces literary works where:

1. Every chapter is individually verifiable via Merkle proof
2. Every audio rendering is cryptographically bound to its source text
3. The entire work is anchored on a public blockchain
4. Any third party can independently verify integrity without publisher cooperation
5. Builds are fully reproducible — identical inputs produce byte-identical outputs

---

## 1. Terminology

| Term | Definition |
|------|-----------|
| **Block** | A discrete unit of manuscript text (chapter, section, sub-section) |
| **Artifact** | An embedded document (contract, email, report) inserted into the manuscript |
| **Edition** | A complete, compiled, and anchored version of the work |
| **Edition Root** | Composite hash of all text-layer Merkle tree roots |
| **Manuscript Root** | Merkle root of all text blocks in canonical order |
| **Artifact Root** | Merkle root of all embedded artifacts |
| **Image Root** | Merkle root of all visual assets |
| **Prompt Root** | Merkle root of all AI generation prompts |
| **Audio Root** | Merkle root of all audio renderings (IAPL-1) |
| **Audio Edition Root** | Cross-layer binding: `sha256(editionRoot + audioRoot)` |
| **Canonical** | The edition currently designated as authoritative |
| **Superseded** | An edition replaced by a newer version |
| **Retracted** | An edition withdrawn by the author with a stated reason |
| **Deterministic Build** | A build pipeline that strips non-deterministic metadata (timestamps) from output |
| **Reproducible Build** | A deterministic build where all pipeline metadata (including genesis timestamps) is frozen |
| **Merkle Proof** | An array of sibling hashes sufficient to verify a leaf's inclusion in a Merkle tree |
| **Provenance Chain** | The layered evidence linking source files to on-chain anchors |

---

## 2. Architecture

### 2.1 Layer Model

VPS-1 defines a six-layer provenance stack:

```
┌────────────────────────────────────────────────────────────────────┐
│  Layer 6 — AUDIO PROVENANCE (IAPL-1)                               │
│  Per-block audio hashes → audioRoot → audioEditionRoot             │
├────────────────────────────────────────────────────────────────────┤
│  Layer 5 — BLOCKCHAIN ANCHOR                                       │
│  Edition root + CID + hash anchored in smart contract              │
├────────────────────────────────────────────────────────────────────┤
│  Layer 4 — CONTENT-ADDRESSED STORAGE (IPFS)                       │
│  Immutable, content-addressed manuscript storage                   │
├────────────────────────────────────────────────────────────────────┤
│  Layer 3 — MERKLE TREES                                            │
│  4 trees (manuscript, artifact, image, prompt) → Edition Root      │
├────────────────────────────────────────────────────────────────────┤
│  Layer 2 — VERSION CONTROL (Git)                                   │
│  Commit history, author identity, SHA in commit messages           │
├────────────────────────────────────────────────────────────────────┤
│  Layer 1 — FILESYSTEM                                              │
│  Source files, creation timestamps, local integrity                 │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dual-Root Architecture

VPS-1 maintains **two independent Merkle root hierarchies** that are cryptographically bound:

```
TEXT LAYER (LPS-1)                    AUDIO LAYER (IAPL-1)
──────────────────                    ────────────────────
manuscriptRoot ──────┐                audioRoot
artifactRoot ────────┤                  │
imageRoot ───────────┤                  │
promptRoot ──────────┤                  │
                     ▼                  ▼
              editionRoot         audioEditionRoot
              (on-chain)          = sha256(editionRoot + audioRoot)
                     │                  │
                     └──────┬───────────┘
                            ▼
                    COMPLETE PROVENANCE
                (text + audio, cross-verified)
```

**Key design principle:** The audio layer is **additive**. It does not alter the text-layer edition root or any on-chain state. This means:

- Text-only works are fully conforming (audio is optional)
- Audio can be added to an existing anchored edition without re-anchoring
- The `audioEditionRoot` binding proves audio was generated from a specific text edition

### 2.3 State Machine

An edition progresses through these states:

```
DRAFT → COMPILED → HASHED → PINNED → ANCHORED → PUBLISHED
  │         │          │        │          │          │
  │  compile.js   hash.js  ipfs add  anchorEdition  live
  │         │          │        │          │          │
  ▼         ▼          ▼        ▼          ▼          ▼
source   dist/      genesis   IPFS     on-chain    public
files    final-     .json     CID      entry       access
         ms.md                                     
```

At any point after COMPILED, the audio layer can be rendered and bound:

```
COMPILED (text) → RENDERED (audio) → HASHED (audio) → BOUND
       │                │                  │              │
  render.js        hash-audio.js    audioEditionRoot   manifest
       │                │                  │              │
       ▼                ▼                  ▼              ▼
   audio/*.mp3    audio-manifest    sha256(eRoot+aRoot)  dist/
```

---

## 3. Merkle Tree Specification

### 3.1 Hash Algorithm

All hashes use **SHA-256**, represented as lowercase hexadecimal strings (64 characters).

### 3.2 Tree Construction Rules

1. **Leaf hashes:** SHA-256 of raw file content (UTF-8 for text, binary for audio/images)
2. **Internal nodes:** `H(leftChild ‖ rightChild)` where `‖` is string concatenation of hex digests
3. **Odd leaf rule:** If a layer has an odd number of nodes, the last node is **duplicated** before pairing
4. **Ordering:** Strict. Leaves are ordered by their canonical position (see §3.4). Implementations MUST NOT sort pairs before hashing.

### 3.3 Concatenation Scheme

VPS-1 uses **ordered concatenation**, NOT sorted-pair concatenation:

```
node = sha256(left_hex + right_hex)     // CORRECT: ordered
node = sha256(min(a, b) + max(a, b))    // WRONG: sorted
```

This is critical for proof verification. The proof format (§3.6) records whether each sibling is a `left` or `right` neighbor, which is necessary for ordered concatenation.

### 3.4 Tree Categories

| Tree | Source | Leaf Type | Order |
|------|--------|-----------|-------|
| `manuscriptRoot` | `manuscript/*.md` | SHA-256 of file content | `order.json` block sequence |
| `artifactRoot` | `artifacts/*.md` | SHA-256 of file content | Alphabetical sort |
| `imageRoot` | `images/**/*.png` | SHA-256 of file content | Cover first, then chapters alphabetically |
| `promptRoot` | `image-prompts.json` | SHA-256 of serialized prompt object | Document order |
| `audioRoot` | `audio/rendered/*.mp3` | SHA-256 of file content | Same order as `manuscriptRoot` |

### 3.5 Composite Roots

**Edition Root** (text layer):
```
editionRoot = SHA-256(manuscriptRoot ‖ artifactRoot ‖ imageRoot ‖ promptRoot)
```

**Audio Edition Root** (cross-layer binding):
```
audioEditionRoot = SHA-256(editionRoot ‖ audioRoot)
```

### 3.6 Proof Format

A Merkle inclusion proof for leaf at index `i`:

```json
{
  "blockIndex": 12,
  "blockFile": "block-12-due-diligence.md",
  "leafHash": "8709654f...",
  "root": "6719ed7f...",
  "proof": [
    { "hash": "d788a3bc...", "position": "right" },
    { "hash": "a1b2c3d4...", "position": "left" },
    { "hash": "e5f6a7b8...", "position": "right" }
  ],
  "valid": true
}
```

**Verification algorithm:**
```
current = leafHash
for each step in proof:
  if step.position == "left":
    current = H(step.hash ‖ current)
  else:
    current = H(current ‖ step.hash)
assert current == root
```

### 3.7 Cross-Layer Proof

To verify that an audio file corresponds to a specific manuscript block:

1. Verify the audio leaf against `audioRoot` (audio Merkle proof)
2. Verify the text leaf against `manuscriptRoot` (text Merkle proof)
3. Verify `manuscriptRoot` contributes to `editionRoot` (root composition)
4. Verify `audioEditionRoot == sha256(editionRoot + audioRoot)` (cross-layer binding)

If all four checks pass, the audio file is cryptographically bound to the text block.

---

## 4. Build Pipeline

### 4.1 Required Steps

```
order.json ──► compile ──► dist/final-manuscript.md
                                 │
                                 ▼
                            hash ──► genesis.json
                                 │
                                 ▼
                            merkle ──► dist/merkle.json
                                 │
                                 ▼
                            manifest ──► dist/manifest.json
```

### 4.2 Build Modes

| Mode | Flag | Behavior |
|------|------|----------|
| **Normal** | *(none)* | Full build with live timestamps |
| **Deterministic** | `--deterministic` | Strips compile-time metadata (timestamps, generation notes) from manuscript output |
| **Reproducible** | `--reproducible` | Deterministic + freezes `build.timestamp` in genesis.json to string `"REPRODUCIBLE"` |

**Deterministic mode** guarantees: identical source files → identical `dist/final-manuscript.md` → identical manuscript hash.

**Reproducible mode** guarantees: identical source files → identical `dist/final-manuscript.md` → identical `genesis.json` (byte-for-byte) → identical genesis SHA-256. This is the strongest reproducibility guarantee.

### 4.3 Determinism Requirements

- Block ordering MUST be determined by `order.json`, not filesystem order
- Artifact insertion points MUST be defined in `order.json` block entries
- Image ordering MUST be: cover first, then chapters alphabetically
- Prompt ordering MUST match document order in the prompt configuration
- All hashes MUST be SHA-256, lowercase hex, 64 characters
- Compiled output MUST NOT contain non-deterministic content (random values, locale-dependent formatting)

### 4.4 Audio Pipeline

```
order.json ──► render ──► audio/rendered/*.mp3
                                │
                                ▼
                          hash-audio ──► dist/audio-manifest.json
```

Audio rendering is **not required to be deterministic** — the same text rendered twice by the same TTS engine may produce different audio bytes. However, once rendered and hashed, the audio files are **immutable**. Any modification invalidates the Merkle tree.

---

## 5. Smart Contract Standard

### 5.1 PublishingKernel

The `PublishingKernel` contract is the on-chain anchor for a literary work.

#### 5.1.1 Edition Struct

```solidity
struct MerkleRoots {
    bytes32 manuscriptRoot;
    bytes32 artifactRoot;
    bytes32 imageRoot;
    bytes32 promptRoot;
    bytes32 editionRoot;
}

struct Edition {
    string  ipfsCID;
    string  sha256Hash;
    string  title;
    string  note;
    uint256 timestamp;
    MerkleRoots roots;
    uint256 supersedesEdition;
    bool    isCanonical;
    bool    isRetracted;
    string  retractionReason;
    string  aiModel;
    bytes32 promptSetHash;
    bytes   authorSignature;
}
```

**Note:** The `MerkleRoots` struct contains five fields (manuscript, artifact, image, prompt, edition). It does **not** contain `audioRoot`. The audio layer is anchored off-chain via `audioEditionRoot` in the manifest. Future protocol versions may extend the struct or introduce a dedicated `AudioAnchor` contract.

#### 5.1.2 Required Events

| Event | Parameters | When |
|-------|-----------|------|
| `EditionAnchored` | `editionId, ipfsCID, editionRoot, timestamp, note` | New edition anchored |
| `EditionSuperseded` | `oldEditionId, newEditionId` | Edition replaced |
| `EditionRetracted` | `editionId, reason, timestamp` | Edition withdrawn |
| `CanonicalityChanged` | `editionId, isCanonical` | Canonical status changed |
| `LicenseGranted` | `licenseId, editionId, grantee, templateId` | License issued |
| `LicenseRevoked` | `licenseId, timestamp` | License revoked |

#### 5.1.3 Required Functions

| Function | Access | Description |
|----------|--------|-------------|
| `anchorEdition(...)` | Author | Anchor a new edition with Merkle roots |
| `anchorEditionWithProvenance(...)` | Author | Anchor with AI model/prompt metadata |
| `supersede(old, new)` | Author | Mark old edition as superseded |
| `retract(id, reason)` | Author | Retract an edition |
| `setCanonical(id, bool)` | Author | Set/unset canonical status |
| `grantLicense(...)` | Author | Grant a license for an edition |
| `revokeLicense(id)` | Author | Revoke a license |

#### 5.1.4 Required Views

| View | Returns |
|------|---------|
| `editionCount()` | Total editions |
| `genesis()` | First edition |
| `latest()` | Most recent edition |
| `canonicalEdition()` | Current canonical edition |
| `isAnchored(editionRoot)` | Whether a root has been anchored |
| `getEditionRoots(id)` | Merkle roots for an edition |

### 5.2 RoyaltyRouter

The `RoyaltyRouter` contract handles programmable revenue distribution.

- Splits defined in **basis points** (1 bp = 0.01%, 10000 bp = 100%)
- All payee basis points MUST sum to exactly 10000
- Distribution uses a **pull pattern** (payees withdraw accumulated balances)
- Recoupment waterfall: when active, incoming funds split between recoupment recipient and normal payees until `totalOwed` is fully recouped

### 5.3 AuthorIdentity

The `AuthorIdentity` contract links a wallet address to a human identity.

- Stores pseudonym, real name, organization, domain
- Maintains a bibliography of linked works (contract addresses)
- Provides on-chain identity verification without requiring external oracles

---

## 6. Manifest Specification

### 6.1 Genesis Manifest (genesis.json)

The genesis manifest is the off-chain companion to the on-chain anchors. It MUST contain:

```json
{
  "edition": "string",
  "title": "string",
  "author": "string",
  "build": {
    "timestamp": "ISO-8601 | 'REPRODUCIBLE'",
    "sha256": "hex-64",
    "sizeBytes": "number",
    "fileCount": "number"
  },
  "roots": {
    "editionRoot": "hex-64",
    "manuscriptRoot": "hex-64",
    "artifactRoot": "hex-64",
    "imageRoot": "hex-64",
    "promptRoot": "hex-64"
  },
  "chain": {
    "network": "string",
    "chainId": "number",
    "contracts": { ... }
  },
  "ipfs": {
    "cid": "string",
    "gateway": "string"
  }
}
```

When audio is present, the manifest gains:

```json
{
  "roots": {
    "audioRoot": "hex-64",
    "audioEditionRoot": "hex-64"
  },
  "audio": {
    "version": "IAPL-1",
    "voice": { "id": "...", "name": "...", "model": "..." },
    "blockCount": "number",
    "manifest": "dist/audio-manifest.json"
  }
}
```

### 6.2 Audio Manifest (audio-manifest.json)

```json
{
  "version": "IAPL-1",
  "generatedAt": "ISO-8601",
  "edition": "string",
  "voice": {
    "id": "string",
    "name": "string",
    "model": "string"
  },
  "audioRoot": "hex-64",
  "audioEditionRoot": "hex-64",
  "blocks": [
    {
      "id": "block-00",
      "file": "block-00-genesis.mp3",
      "sourceBlock": "block-00-genesis.md",
      "sha256": "hex-64",
      "sizeBytes": "number",
      "durationSeconds": "number"
    }
  ],
  "tree": {
    "root": "hex-64",
    "leafCount": "number",
    "leaves": ["hex-64"],
    "algorithm": "sha256",
    "merkleScheme": "ordered-concatenation",
    "oddLeafRule": "duplicate-last"
  }
}
```

### 6.3 File Manifest (manifest.json)

Tracks all files in the distribution with per-file SHA-256 hashes:

```json
{
  "schema": "literary-protocol-standard",
  "schemaVersion": "1.0.0",
  "files": {
    "total": "number",
    "entries": [
      {
        "path": "relative/path",
        "category": "manuscript | artifact | image | compiled",
        "sizeBytes": "number",
        "sha256": "hex-64"
      }
    ]
  }
}
```

---

## 7. Verification Protocol

### 7.1 Verification Phases

A conforming verifier MUST implement the following phases:

| Phase | Name | Checks | Required |
|:-----:|------|:------:|:--------:|
| 1 | **Source Integrity** | Source files exist, block count matches order.json, all blocks present | YES |
| 2 | **Build Integrity** | Compiled manuscript hash and size match genesis.json | YES |
| 3 | **Merkle Integrity** | All 5 roots recomputed and matched against merkle.json and genesis.json; per-block Merkle proofs validated | YES |
| 4 | **On-Chain Integrity** | Contract state matches local records (CID, hash, roots, author, title, edition status) | YES |
| 5 | **Identity Integrity** | AuthorIdentity contract matches expected pseudonym, real name, organization; bibliography and linked contracts verified | YES |
| 6 | **Audio Integrity** | Audio manifest present, all audio files present, per-file hashes match, audio Merkle root recomputed, audioEditionRoot verified, cross-reference with text blocks | CONDITIONAL |

**Phase 6 is skipped gracefully** if no audio files or audio manifest exist. Repositories without audio still pass all text-layer checks.

### 7.2 Verification Output Modes

| Mode | Flag | Output |
|------|------|--------|
| **Human** | *(none)* | Formatted console output with pass/fail indicators |
| **JSON** | `--json` | Machine-readable JSON to stdout; all console output suppressed |
| **Proof** | `--proof block-N` | Merkle inclusion proof for a specific block (text + audio if available) |

#### 7.2.1 JSON Report Schema

```json
{
  "version": "1.1.0",
  "timestamp": "ISO-8601",
  "verdict": "PASS | FAIL",
  "passed": "number",
  "failed": "number",
  "warns": "number",
  "checks": [
    {
      "phase": "number",
      "label": "string",
      "result": "PASS | FAIL | WARN",
      "detail": "string (optional)"
    }
  ]
}
```

#### 7.2.2 Block Proof Schema

```json
{
  "block": "block-12",
  "blockIndex": 12,
  "text": {
    "file": "block-12-due-diligence.md",
    "leafHash": "hex-64",
    "root": "hex-64",
    "proof": [
      { "hash": "hex-64", "position": "left | right" }
    ],
    "valid": true
  },
  "audio": {
    "file": "block-12-due-diligence.mp3",
    "leafHash": "hex-64",
    "root": "hex-64",
    "proof": [
      { "hash": "hex-64", "position": "left | right" }
    ],
    "valid": true
  }
}
```

The `audio` section is present only when `dist/audio-manifest.json` exists.

### 7.3 Full Verification Procedure

1. **Obtain source files** from IPFS using the edition's CID
2. **Recompute** all leaf hashes and Merkle roots from source
3. **Compare** `editionRoot` against the on-chain value via `getEditionRoots(editionId)`
4. **If audio exists:** recompute `audioRoot` from rendered files, verify `audioEditionRoot`
5. **If match:** the work is intact, authentic, and (if audio exists) the audio layer is bound

### 7.4 Single-Block Verification

Any individual block can be verified without processing the entire work:

1. Obtain the block file (text or audio)
2. Compute `SHA-256(fileContent)`
3. Obtain the Merkle proof (from `merkle.json` or via `--proof block-N`)
4. Walk the proof up to the root
5. Verify the root against the on-chain value

---

## 8. System Invariants

A conforming VPS-1 implementation MUST maintain these invariants at all times.

### 8.1 Content Invariants

| ID | Invariant | Rule |
|----|-----------|------|
| C1 | Hash-Content Binding | `sha256(ipfs_get(edition.CID)) == edition.sha256Hash` |
| C2 | CID Determinism | Identical content → identical CID |
| C3 | Build Determinism | `compile(src, order) → output₁ == output₂` (deterministic mode) |
| C4 | Manifest Integrity | Every file in manifest has matching SHA-256 |
| C5 | Order Completeness | Every block in `order.json` exists; no block omitted |

### 8.2 Contract Invariants

| ID | Invariant | Rule |
|----|-----------|------|
| K1 | Author Immutability | `author` address set at deployment, enforced by `immutable` keyword |
| K2 | Genesis Permanence | `editions[0]` set in constructor, cannot be modified |
| K3 | Append-Only Editions | Editions can only be added, never removed or modified |
| K4 | Author-Only Anchoring | Only `author` can call `anchorEdition()` |
| K5 | Sequential Indexing | Edition indices are sequential starting from 0 |
| K6 | Timestamp Monotonicity | `editions[n].timestamp >= editions[n-1].timestamp` |

### 8.3 Provenance Invariants

| ID | Invariant | Rule |
|----|-----------|------|
| P1 | Five-Layer Alignment | Filesystem, Git, SHA-256, IPFS, and chain all consistent |
| P2 | Cross-Layer Consistency | `genesis.json.sha256 == on_chain.sha256Hash == sha256(ipfs_content)` |
| P3 | Timestamp Priority | On-chain timestamp > git commit timestamp (content existed before anchor) |

### 8.4 Audio Invariants (IAPL-1)

| ID | Invariant | Rule |
|----|-----------|------|
| A1 | Block Alignment | Audio files map 1:1 to manuscript blocks in identical order |
| A2 | Audio Root Integrity | `audioRoot` recomputed from files matches manifest |
| A3 | Cross-Layer Binding | `audioEditionRoot == sha256(editionRoot + audioRoot)` |
| A4 | Audio Additivity | Adding/removing audio does not alter `editionRoot` |

### 8.5 Build Pipeline Invariants

| ID | Invariant | Rule |
|----|-----------|------|
| B1 | No Uncommitted Anchoring | Source files committed to git before on-chain anchor |
| B2 | Pipeline Ordering | compile → hash → manifest (strict sequence) |
| B3 | No Manual Artifacts | `dist/` files produced only by pipeline, never manually edited |

---

## 9. AI Provenance

### 9.1 Disclosure Requirements

Any edition that includes AI-generated content MUST declare:

- `aiModel`: The model used (e.g., `"stable-diffusion-xl-base-1.0"`)
- `promptSetHash`: SHA-256 of the serialized prompt configuration

### 9.2 Prompt Anchoring

The `promptRoot` Merkle tree ensures that the exact prompts used to generate AI content are permanently recorded. This enables:

- **Reproducibility verification:** Same prompts should produce similar outputs
- **Disclosure compliance:** What was the AI asked to generate?
- **Provenance chain:** Human-authored prompts directing AI generation

### 9.3 Audio AI Provenance

When audio is generated by a text-to-speech engine, the audio configuration (voice ID, model, settings) is recorded in `audio-config.json` and referenced in the audio manifest. This establishes:

- Which TTS model rendered the audio
- Which voice configuration was used
- Whether the rendering can be reproduced with the same settings

---

## 10. License Management

### 10.1 On-Chain Licensing

Licenses are recorded on-chain via `PublishingKernel.grantLicense()` with:

| Field | Description |
|-------|-------------|
| Edition ID | Which version is licensed |
| Grantee address | Who holds the license |
| Template ID | Which standard terms apply |
| Territory | ISO 3166 country code or `"GLOBAL"` |
| Term | Start timestamp, end timestamp; 0 = perpetual |
| Fields of use | `"print"`, `"digital"`, `"audio"`, `"all"` |
| Royalty router | Linked revenue split contract |

### 10.2 Standard Templates

| Template ID | Description |
|-------------|-------------|
| `CC-BY-4.0` | Creative Commons Attribution |
| `CC-BY-NC-4.0` | Creative Commons Attribution-NonCommercial |
| `exclusive-print` | Exclusive print rights for territory/term |
| `exclusive-digital` | Exclusive digital distribution rights |
| `exclusive-audio` | Exclusive audiobook rights |
| `non-exclusive-all` | Non-exclusive, all media |

---

## 11. Security Considerations

### 11.1 Key Management

The author's private key controls all edition, license, and retraction operations. Loss of the key means loss of protocol control. Implementations SHOULD document key recovery procedures.

### 11.2 Immutability

Once anchored, an edition's roots cannot be changed. Only retraction (with a stated reason) is possible. This is by design — immutability is the foundation of verifiability.

### 11.3 Merkle Proof Soundness

SHA-256 collision resistance (2^128 security level) ensures proof integrity. An attacker cannot produce a different file that hashes to the same leaf without breaking SHA-256.

### 11.4 Audio Layer Security

- Audio files are large (MB range) — SHA-256 hashing is the integrity mechanism
- Voice cloning attacks are outside VPS-1's scope — the standard proves file integrity, not voice authenticity
- The `audioEditionRoot` binding ensures audio cannot be attributed to a different manuscript version

### 11.5 Reproducibility vs. Timestamps

Normal builds include live timestamps, which are useful for provenance but prevent byte-level reproducibility. The `--reproducible` flag trades temporal metadata for determinism. Implementations SHOULD use normal mode for production anchoring and reproducible mode for CI/verification.

### 11.6 Pull-Based Revenue

`RoyaltyRouter` uses pull-based withdrawals to prevent reentrancy attacks. Payees call `withdraw()` to claim accumulated balances.

---

## 12. Conformance Levels

### 12.1 Level 1: Text Provenance (LPS-1 Core)

A Level 1 implementation MUST:

1. Hash all source files using SHA-256
2. Build Merkle trees using ordered concatenation with odd-leaf duplication
3. Produce a compiled manuscript from a canonical block order
4. Compute `editionRoot = sha256(manuscriptRoot + artifactRoot + imageRoot + promptRoot)`
5. Generate a genesis manifest (`genesis.json`) with roots, hash, and build metadata
6. Anchor the edition on a public blockchain
7. Pin content on IPFS or equivalent content-addressed storage
8. Pass all Phase 1–5 verification checks

### 12.2 Level 2: Audio Provenance (LPS-1 + IAPL-1)

A Level 2 implementation MUST satisfy all Level 1 requirements, AND:

1. Render audio files mapped 1:1 to manuscript blocks
2. Hash audio files using SHA-256
3. Build an audio Merkle tree using the same scheme as text trees
4. Compute `audioEditionRoot = sha256(editionRoot + audioRoot)`
5. Produce an audio manifest with per-block metadata
6. Pass all Phase 6 verification checks

### 12.3 Level 3: Full Reproducibility (LPS-1 + IAPL-1 + Reproducible Builds)

A Level 3 implementation MUST satisfy all Level 2 requirements, AND:

1. Support `--deterministic` builds (identical source → identical compiled output)
2. Support `--reproducible` builds (identical source → identical genesis.json)
3. Produce machine-readable verification output (`--json`)
4. Support per-block Merkle proofs (`--proof block-N`)
5. Achieve byte-identical genesis.json across independent builds from the same source

---

## 13. Reference Implementation

The reference implementation is **The 2,500 Donkeys**:

| Component | Value |
|-----------|-------|
| **Repository** | [github.com/FTHTrading/2500-donkeys](https://github.com/FTHTrading/2500-donkeys) |
| **Site** | [xxxiii.io](https://xxxiii.io) |
| **Genesis Anchor** | `0x97f456300817eaE3B40E235857b856dfFE8bba90` (Polygon) |
| **PublishingKernel** | `0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae` (Polygon) |
| **PublishingKernelV2** | `0xca9F6604A9b498DB31d113836E2957c0a9aAE037` (Polygon) |
| **RoyaltyRouter** | `0x44169829489d70aaecbf845870652871C65fC461` (Polygon) |
| **AuthorIdentity** | `0xB9ffa688A8Bb332221030BbBE46bE5bF03323170` (Polygon) |
| **IPFS Genesis CID** | `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK` |
| **Edition Root** | `6719ed7f9e142a39a4a7db533895562bdf5379cf7f9816ed7cbe045ca359594e` |
| **DOI** | [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886) |
| **ORCID** | [0009-0008-8425-939X](https://orcid.org/0009-0008-8425-939X) |
| **Conformance** | Level 3 |
| **Verifier Version** | 1.1.0 |
| **Tests** | 146 passing |
| **Verification Checks** | 51 (Phase 1–5) + conditional Phase 6 |

### 13.1 Quick Commands

```bash
# Build
npm run build                    # Normal build
npm run build:deterministic      # Deterministic (no timestamps in manuscript)
npm run build:reproducible       # Fully reproducible (frozen genesis timestamp)

# Verify
npm run lps:verify               # Human-readable verification
npm run lps:verify:json           # Machine-readable JSON output
npm run lps:proof -- block-12     # Merkle proof for specific block

# Audio (IAPL-1)
npm run audio:render              # Render all blocks via ElevenLabs TTS
npm run audio:hash                # Build audio Merkle tree
npm run audio:verify              # Verify audio layer independently
npm run audio:all                 # Full audio pipeline

# Test
npx hardhat test                  # Run all 146 contract tests
```

---

## 14. Backward Compatibility

### 14.1 Genesis Anchor Migration

Existing works anchored with a genesis `LiteraryAnchor` contract can upgrade to VPS-1 by:

1. Running the Merkle tree builder on existing source files
2. Deploying `PublishingKernel` with `genesisAnchor` set to the original contract address
3. The genesis edition in `PublishingKernel` inherits the original CID and hash

### 14.2 Audio Layer Addition

Audio can be added to any existing VPS-1 Level 1 work without:

- Modifying the on-chain edition
- Re-pinning to IPFS
- Re-anchoring the edition root

The audio layer is purely additive — it extends provenance without altering it.

---

## 15. Future Extensions

The following extensions are anticipated but not specified in VPS-1 v1.0.0:

| Extension | Description |
|-----------|-------------|
| On-chain `audioRoot` | Dedicated `AudioAnchor` contract or extended `MerkleRoots` struct |
| Multi-voice editions | Multiple narrators with per-voice Merkle trees |
| Translation layers | Parallel text trees for translated editions |
| NFT editions | Genesis, Founder, and Public supply tiers with on-chain anchoring |
| Cross-chain anchoring | Anchors on multiple chains for redundancy |
| Streaming proofs | Real-time block-level verification during audio playback |

---

## References

1. LPS-1 — Literary Protocol Standard v1 (internal specification)
2. IAPL-1 — Immutable Audio Provenance Layer v1 (internal specification)
3. Burns, K. (2025). *Deterministic Literary Publishing: A Blockchain-Native Protocol for Manuscript Integrity*. Zenodo. [doi:10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)
4. Merkle, R. C. (1987). A Digital Signature Based on a Conventional Encryption Function. *CRYPTO '87*.
5. NIST FIPS 180-4 — Secure Hash Standard (SHA-256)
6. EIP-2981 — NFT Royalty Standard

---

*VPS-1 is sovereign infrastructure. No gatekeepers. No intermediaries. Just math, chain, and the work itself.*
