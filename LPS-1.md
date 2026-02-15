# Literary Protocol Standard v1 (LPS-1)

**Status:** Draft  
**Author:** Kevan Burnzy / FTH Trading  
**Created:** 2025  
**Reference Implementation:** The 2,500 Donkeys  

---

## Abstract

LPS-1 defines a standard for anchoring literary works on-chain with cryptographic integrity guarantees. It specifies how manuscripts, artifacts, images, and AI-generated content are hashed into Merkle trees, anchored via smart contracts, and verified by anyone with access to the source files and chain state.

This standard transforms publishing from a trust-based model ("the publisher says this is the real version") into a verification-based model ("the chain proves this is the real version").

---

## 1. Terminology

| Term | Definition |
|------|-----------|
| **Block** | A discrete unit of manuscript text (chapter, section, sub-section) |
| **Artifact** | An embedded document (contract, email, report) inserted into the manuscript |
| **Edition** | A complete, compiled, and anchored version of the work |
| **Edition Root** | The composite hash of all Merkle tree roots for an edition |
| **Manuscript Root** | Merkle root of all text blocks in canonical order |
| **Artifact Root** | Merkle root of all embedded artifacts |
| **Image Root** | Merkle root of all visual assets (cover, chapter illustrations) |
| **Prompt Root** | Merkle root of all AI generation prompts |
| **Canonical** | The edition currently designated as authoritative |
| **Superseded** | An edition replaced by a newer version |
| **Retracted** | An edition withdrawn by the author with a stated reason |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EDITION ROOT                          │
│         H(manuscriptRoot ‖ artifactRoot ‖               │
│           imageRoot ‖ promptRoot)                        │
├──────────────┬──────────────┬────────────┬──────────────┤
│ manuscript   │ artifact     │ image      │ prompt       │
│ Root         │ Root         │ Root       │ Root         │
├──────────────┼──────────────┼────────────┼──────────────┤
│ block-00  ██ │ carbon    ██ │ cover  ██  │ style    ██  │
│ block-01  ██ │ waterfall ██ │ ch-00  ██  │ cover    ██  │
│ block-01a ██ │ esg       ██ │ ch-01  ██  │ genesis  ██  │
│ ...       ██ │ imfpa     ██ │ ...    ██  │ ...      ██  │
│ epilogue  ██ │ whatsapp  ██ │ ch-ep  ██  │ silence  ██  │
└──────────────┴──────────────┴────────────┴──────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐      ┌────────────────────┐
│  PublishingKernel│      │   RoyaltyRouter    │
│  (on-chain)      │      │   (on-chain)       │
│                  │◄────►│                    │
│  - editions[]    │      │  - payees[]        │
│  - licenses[]    │      │  - recoupment      │
│  - roots         │      │  - balances        │
└─────────────────┘      └────────────────────┘
         │
         ▼
┌──────────────────────────┐
│     IPFS / Filecoin      │
│  Immutable manuscript    │
│  storage                 │
└──────────────────────────┘
```

---

## 3. Merkle Tree Specification

### 3.1 Hash Algorithm

All hashes use **SHA-256** (hex-encoded, lowercase, 64 characters).

### 3.2 Tree Construction

1. **Leaf hashes**: SHA-256 of the raw file content (UTF-8 for text, binary for images)
2. **Internal nodes**: `H(leftChild ‖ rightChild)` where `‖` is string concatenation of hex digests
3. **Odd leaf rule**: If a layer has an odd number of nodes, the last node is duplicated before pairing
4. **Ordering**: Leaves are ordered by their canonical position in `order.json` (manuscript), alphabetical sort (artifacts, images), or document order (prompts)

### 3.3 Tree Categories

| Tree | Source | Leaf Type |
|------|--------|-----------|
| `manuscriptRoot` | `manuscript/*.md` ordered by `order.json` | SHA-256 of file content |
| `artifactRoot` | `artifacts/*.md` alphabetically sorted | SHA-256 of file content |
| `imageRoot` | `images/cover/*.png` + `images/chapters/*.png` sorted | SHA-256 of file content |
| `promptRoot` | `image-prompts.json` entries in document order | SHA-256 of JSON-serialized prompt object |

### 3.4 Edition Root

```
editionRoot = SHA-256(manuscriptRoot ‖ artifactRoot ‖ imageRoot ‖ promptRoot)
```

The edition root is the single value anchored on-chain. From this root, any individual component can be verified via Merkle proof.

### 3.5 Proof Format

A Merkle proof for leaf at index `i` is an array of sibling hashes:

```json
{
  "leafHash": "8709654f...",
  "proof": [
    { "hash": "d788a3bc...", "position": "right" },
    { "hash": "a1b2c3d4...", "position": "left" },
    { "hash": "e5f6a7b8...", "position": "right" }
  ]
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

---

## 4. Smart Contract Standard

### 4.1 PublishingKernel

The `PublishingKernel` contract is the on-chain anchor for a literary work.

#### 4.1.1 Edition Struct

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

#### 4.1.2 Required Events

| Event | Parameters | When |
|-------|-----------|------|
| `EditionAnchored` | `editionId, ipfsCID, editionRoot, timestamp, note` | New edition anchored |
| `EditionSuperseded` | `oldEditionId, newEditionId` | Edition replaced |
| `EditionRetracted` | `editionId, reason, timestamp` | Edition withdrawn |
| `CanonicalityChanged` | `editionId, isCanonical` | Canonical status changed |
| `LicenseGranted` | `licenseId, editionId, grantee, templateId` | License issued |
| `LicenseRevoked` | `licenseId, timestamp` | License revoked |

#### 4.1.3 Required Functions

| Function | Access | Description |
|----------|--------|-------------|
| `anchorEdition(...)` | Author | Anchor a new edition with Merkle roots |
| `anchorEditionWithProvenance(...)` | Author | Anchor with AI model/prompt metadata |
| `supersede(old, new)` | Author | Mark old edition as superseded by new |
| `retract(id, reason)` | Author | Retract an edition |
| `setCanonical(id, bool)` | Author | Set/unset canonical status |
| `grantLicense(...)` | Author | Grant a license for an edition |
| `revokeLicense(id)` | Author | Revoke a license |

#### 4.1.4 Required Views

| View | Returns |
|------|---------|
| `editionCount()` | Total editions |
| `genesis()` | First edition |
| `latest()` | Most recent edition |
| `canonicalEdition()` | Current canonical edition |
| `isAnchored(editionRoot)` | Whether a root has been anchored |
| `getEditionRoots(id)` | Merkle roots for an edition |

### 4.2 RoyaltyRouter

The `RoyaltyRouter` contract handles programmable revenue distribution.

#### 4.2.1 Split Model

- Splits are defined in **basis points** (1 bp = 0.01%, 10000 bp = 100%)
- All payee basis points must sum to exactly 10000
- Distribution uses a **pull pattern** (payees withdraw accumulated balances)

#### 4.2.2 Recoupment Waterfall

When a recoupment is active:
1. Incoming funds are split: `recoupBasisPoints%` goes to recoupment recipient
2. Remaining funds are split among payees per normal basis points
3. Once `totalOwed` is fully recouped, all funds go to normal splits

#### 4.2.3 Required Events

| Event | When |
|-------|------|
| `FundsReceived` | ETH/MATIC received |
| `FundsDistributed` | Funds allocated to balances |
| `RecoupmentPayment` | Payment applied to recoupment |
| `RecoupmentCompleted` | Advance fully recovered |
| `Withdrawal` | Payee withdraws balance |

---

## 5. Manifest Specification (v2)

The manifest is the off-chain companion to the on-chain anchors.

### 5.1 Schema

```json
{
  "schema": "literary-protocol-standard",
  "schemaVersion": "1.0.0",
  "manifestVersion": 2,
  "title": "string",
  "author": "string",
  "edition": "string",
  "generated": "ISO-8601",

  "roots": {
    "editionRoot": "bytes32-hex",
    "manuscriptRoot": "bytes32-hex",
    "artifactRoot": "bytes32-hex",
    "imageRoot": "bytes32-hex",
    "promptRoot": "bytes32-hex",
    "algorithm": "sha256",
    "merkleScheme": "sorted-pair-concatenation",
    "oddLeafRule": "duplicate-last"
  },

  "chain": {
    "network": "polygon",
    "chainId": 137,
    "contract": "0x...",
    "deployTx": "0x...",
    "deployBlock": 12345678
  },

  "ipfs": {
    "genesisCID": "Qm...",
    "edition2CID": "Qm...",
    "gateway": "https://ipfs.io/ipfs/"
  },

  "files": {
    "total": 47,
    "byCategory": {
      "manuscript": 31,
      "artifact": 5,
      "image": 10,
      "compiled": 1
    },
    "entries": [
      {
        "path": "manuscript/block-00-genesis.md",
        "category": "manuscript",
        "sizeBytes": 1234,
        "sha256": "hex-digest",
        "modified": "ISO-8601"
      }
    ]
  }
}
```

---

## 6. Build Pipeline

### 6.1 Required Steps

```
order.json ──► compile.js ──► dist/final-manuscript.md
                                    │
                                    ▼
                              hash.js ──► web3/metadata/genesis.json
                                    │
                                    ▼
                              merkle.js ──► dist/merkle.json
                                    │
                                    ▼
                              manifest.js ──► dist/manifest.json
```

### 6.2 Determinism Requirements

- Block ordering MUST be determined by `order.json`, not filesystem order
- Artifact insertion points MUST be defined in `order.json` block entries
- Image ordering MUST be: cover first, then chapters alphabetically
- Prompt ordering MUST match document order in `image-prompts.json`
- All hashes MUST be SHA-256, lowercase hex, 64 characters

---

## 7. Verification Protocol

### 7.1 Full Verification (any verifier)

1. **Obtain source files** from IPFS using the edition's CID
2. **Run `merkle.js`** to recompute all leaf hashes and Merkle roots
3. **Compare `editionRoot`** against the on-chain value via `getEditionRoots(editionId)`
4. If match: the work is intact and authentic

### 7.2 Single-Chapter Verification

1. Obtain the chapter file
2. Compute `SHA-256(fileContent)`
3. Obtain the Merkle proof from `merkle.json`
4. Walk the proof up to `manuscriptRoot`
5. Verify `manuscriptRoot` contributes to the on-chain `editionRoot`

### 7.3 Image Provenance Verification

1. Obtain the image file
2. Compute `SHA-256(imageContent)`
3. Verify against `imageRoot` via Merkle proof
4. Obtain `promptSetHash` from the edition's on-chain data
5. Verify the prompt configuration matches the `promptSetHash`

---

## 8. AI Provenance

### 8.1 Disclosure Requirements

Any edition that includes AI-generated content MUST declare:
- `aiModel`: The model used (e.g., `"stable-diffusion-xl-base-1.0"`)
- `promptSetHash`: SHA-256 of the serialized prompt configuration

### 8.2 Prompt Anchoring

The `promptRoot` Merkle tree ensures that the exact prompts used to generate AI content are permanently recorded. This enables:
- Reproducibility verification (same prompts should produce similar outputs)
- Disclosure compliance (what was the AI asked to generate?)
- Provenance chain (human-authored prompts directing AI generation)

---

## 9. License Templates

### 9.1 Standard Templates

| Template ID | Description |
|-------------|-------------|
| `CC-BY-4.0` | Creative Commons Attribution |
| `CC-BY-NC-4.0` | Creative Commons Attribution-NonCommercial |
| `exclusive-print` | Exclusive print rights for territory/term |
| `exclusive-digital` | Exclusive digital distribution rights |
| `exclusive-audio` | Exclusive audiobook rights |
| `non-exclusive-all` | Non-exclusive, all media |

### 9.2 On-Chain License Record

Licenses are recorded on-chain via `PublishingKernel.grantLicense()` with:
- Edition ID (which version is licensed)
- Grantee address (who holds the license)
- Template ID (which standard terms apply)
- Territory (ISO 3166 country code or `"GLOBAL"`)
- Term (start timestamp, end timestamp; 0 = perpetual)
- Fields of use (`"print"`, `"digital"`, `"audio"`, `"all"`)
- Royalty router address (linked revenue split contract)

---

## 10. Backward Compatibility

### 10.1 Genesis Anchor

The original `LiteraryAnchor` contract remains the genesis anchor. The `PublishingKernel` contract stores the genesis anchor's address at `genesisAnchor` to establish lineage.

### 10.2 Migration Path

Existing works anchored with `LiteraryAnchor` can upgrade to LPS-1 by:
1. Running the Merkle tree builder on existing source files
2. Deploying `PublishingKernel` with `genesisAnchor` set to the original contract address
3. The genesis edition in `PublishingKernel` inherits the original CID and hash

---

## 11. Security Considerations

- **Author key management**: The author's private key controls all edition, license, and retraction operations
- **Immutability**: Once anchored, an edition's roots cannot be changed; only retraction is possible
- **Merkle proof soundness**: SHA-256 collision resistance ensures proof integrity
- **Pull pattern**: `RoyaltyRouter` uses pull-based withdrawals to prevent reentrancy
- **Emergency sweep**: Owner can recover stuck funds, but this is logged on-chain

---

## 12. Reference Implementation

The reference implementation is **The 2,500 Donkeys**:

- **Genesis Anchor**: `0x97f456300817eaE3B40E235857b856dfFE8bba90` (Polygon)
- **IPFS Genesis**: `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK`
- **Repository**: github.com/FTHTrading/2500-donkeys
- **Site**: xxxiii.io

---

*LPS-1 is sovereign infrastructure. No gatekeepers. No intermediaries. Just math, chain, and the work itself.*
