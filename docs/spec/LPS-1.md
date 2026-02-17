# LPS-1: Literary Publishing Standard

**Status:** Informational
**Version:** 1.0
**Date:** 2026-02-15
**Author:** Kidd James (ORCID: 0009-0008-8425-939X)
**DOI:** [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)
**License:** CC BY 4.0

---

## Abstract

This document specifies the Literary Publishing Standard (LPS-1), a
deterministic protocol for establishing cryptographic proof-of-origin,
content integrity, and immutable anchoring for literary works across
decentralized storage and public blockchains.

The protocol formalizes a forward-only edition lifecycle, Merkle-based
provenance commitments, and independently verifiable build determinism.

## Status of This Memo

This document defines an Informational specification for the literary
publishing community. Distribution of this memo is unlimited.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Design Principles](#3-design-principles)
4. [Protocol Layers](#4-protocol-layers)
5. [Content Hashing](#5-content-hashing)
6. [Merkle Architecture](#6-merkle-architecture)
7. [Edition Lifecycle](#7-edition-lifecycle)
8. [On-Chain Anchoring](#8-on-chain-anchoring)
9. [Cross-Chain Timestamping](#9-cross-chain-timestamping)
10. [Identity Binding](#10-identity-binding)
11. [Compliance Levels](#11-compliance-levels)
12. [Security Considerations](#12-security-considerations)
13. [IANA Considerations](#13-iana-considerations)
14. [References](#14-references)

---

## 1. Introduction

The current literary publishing landscape lacks standardized, independently
verifiable mechanisms for proving when a work was created, by whom, and
whether it has been altered. Traditional copyright registration is
jurisdictional, retrospective, and non-deterministic.

LPS-1 addresses this by defining a six-layer provenance stack that
produces a cryptographically committed edition root, anchored to one or
more public blockchains. Any third party can independently reconstruct
the proof chain from source files alone, without reliance on trusted
intermediaries.

### 1.1 Scope

This specification covers:

- Canonical content hashing (SHA-256, CRLF-normalised)
- Multi-type Merkle tree construction
- Edition root derivation
- On-chain anchor format
- Edition lifecycle state machine
- Compliance level definitions
- Cross-chain timestamping requirements

This specification does not cover:

- Digital Rights Management (DRM)
- Access control mechanisms
- Content distribution methods
- Monetisation or tokenisation models

### 1.2 Motivation

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119.

## 2. Terminology

**Canonical Manuscript** — The CRLF-normalised, UTF-8 encoded source
file whose SHA-256 hash constitutes the authoritative content fingerprint.

**Edition** — A frozen, versioned snapshot of a literary work comprising
manuscript, artefacts, images, and prompt logs, identified by a unique
edition root.

**Edition Root** — SHA-256 hash derived from the ordered concatenation
of independent Merkle roots: `manuscriptRoot ‖ artifactRoot ‖ imageRoot
‖ promptRoot`.

**Anchor** — An immutable on-chain record binding an edition root and
IPFS CID to a specific block number and timestamp on a public blockchain.

**Terminal State** — A state from which no further forward transitions
are possible. Terminal states preserve all historical data.

**Determinism** — The property that identical inputs always produce
identical outputs. Achieved through canonical ordering, CRLF
normalisation, and fixed concatenation sequences.

**Supersession** — The process by which a newer edition replaces an older
edition as canonical. The superseded edition remains on-chain but is
marked non-canonical.

**Content Tree** — A Merkle tree constructed from SHA-256 hashes of a
single content type (manuscript, artefact, image, or prompt log).

**Audio Edition Root** — SHA-256 hash derived from the concatenation of
audio content Merkle root and audio metadata Merkle root.

## 3. Design Principles

### 3.1 Forward-Only

All state transitions MUST be irreversible. Data MUST be preserved in
all terminal states. There is no rollback mechanism by design.

### 3.2 Independently Verifiable

Any third party MUST be able to reconstruct the entire proof chain from
source files alone. No platform or service dependency is permitted for
verification.

### 3.3 Deterministic

Identical source files MUST produce identical hashes, identical Merkle
roots, and identical edition roots regardless of build environment, time,
or operator.

### 3.4 Not DRM

This system does not restrict access. It proves origin. The protocol
MUST NOT implement or require access control mechanisms.

## 4. Protocol Layers

LPS-1 defines a six-layer provenance stack. Each layer is independently
verifiable.

```
Layer   Name            Function
─────   ────            ────────
I       Filesystem      Source files, canonical ordering, version control
II      Git             Commit history, authorship timestamps, diffs
III     SHA-256         FIPS 180-4 cryptographic fingerprint, CRLF-normalised
IV      Merkle Trees    Per-content-type roots combined into edition root
V       IPFS            Content-addressed decentralised storage (CID)
VI      Blockchain      Immutable on-chain anchor, block-level timestamp
```

Each layer adds provenance guarantees that are cryptographically linked
to the layer below it.

## 5. Content Hashing

### 5.1 Normalisation

Before hashing, all text content MUST be:

1. Encoded as UTF-8
2. Normalised to CRLF line endings (`\r\n`)
3. Stripped of trailing whitespace per line

### 5.2 Hash Algorithm

All content hashes MUST use SHA-256 (FIPS 180-4).

### 5.3 Canonical Hash

The canonical hash of a manuscript is the SHA-256 digest of the
normalised source file. This hash MUST be reproducible by any party
with access to the source file.

```
canonical_hash = SHA-256(CRLF_normalise(read_utf8(source_file)))
```

### 5.4 Binary Content

Binary content (images, audio files) MUST be hashed as-is without
normalisation. The SHA-256 digest of the raw byte stream constitutes
the canonical hash.

## 6. Merkle Architecture

### 6.1 Tree Construction

Each content type MUST have its own independent Merkle tree:

- **Manuscript Tree** — Leaves are SHA-256 hashes of normalised chapter/story files
- **Artefact Tree** — Leaves are SHA-256 hashes of supplementary materials
- **Image Tree** — Leaves are SHA-256 hashes of image files
- **Prompt Tree** — Leaves are SHA-256 hashes of AI prompt logs

### 6.2 Leaf Ordering

Leaves MUST be sorted by canonical filename in lexicographic order
before tree construction. This ensures deterministic root derivation
regardless of filesystem enumeration order.

### 6.3 Internal Nodes

Each internal node MUST be computed as:

```
node = SHA-256(left_child ‖ right_child)
```

Where `‖` denotes byte-level concatenation. If a level has an odd
number of nodes, the last node MUST be duplicated.

### 6.4 Edition Root

The edition root MUST be derived from the ordered concatenation of
content-type Merkle roots:

```
edition_root = SHA-256(manuscript_root ‖ artifact_root ‖ image_root ‖ prompt_root)
```

The concatenation order is fixed and MUST NOT vary between
implementations.

### 6.5 Audio Extension (IAPL-1)

When audio content is present, an audio edition root MUST be computed
independently per IAPL-1. See the companion specification for audio
Merkle tree construction.

## 7. Edition Lifecycle

### 7.1 State Machine

An edition progresses through the following states:

```
DRAFT → COMPILED → HASHED → MERKLE_BUILT → PINNED → ANCHORED → PUBLISHED
```

From PUBLISHED, two terminal transitions are possible:

```
PUBLISHED → SUPERSEDED    (replaced by newer edition)
PUBLISHED → RETRACTED     (author-initiated, 48h timelock)
```

### 7.2 State Transition Rules

1. Transitions MUST be forward-only. No backward transitions are
   permitted.
2. Each transition MUST produce a verifiable artefact (hash, root,
   CID, or transaction hash).
3. Terminal states MUST preserve all data from prior states.
4. RETRACTED transitions MUST enforce a 48-hour timelock to prevent
   impulsive withdrawal.

### 7.3 Supersession

When a new edition supersedes an existing one:

1. The previous edition's on-chain record MUST remain accessible.
2. The new edition MUST include a reference to the superseded edition.
3. The superseded edition is marked non-canonical but is never deleted.

## 8. On-Chain Anchoring

### 8.1 Anchor Record

An anchor record MUST contain at minimum:

- Edition index (uint256)
- Edition root (bytes32)
- IPFS CID (string)
- Block timestamp (implicit from block)

### 8.2 Immutability

Once an anchor is recorded on-chain, the edition root and CID MUST NOT
be modifiable by any party, including the contract owner. This is
enforced by the FROZEN state.

### 8.3 Contract Requirements

Anchor contracts MUST NOT use proxy patterns or upgradeability
mechanisms. Protocol evolution MUST occur through new contract
deployments. Previous versions remain permanently accessible on-chain.

## 9. Cross-Chain Timestamping

### 9.1 Purpose

Cross-chain timestamping provides temporal verification independent of
the primary anchor chain. This mitigates single-chain dependency risk.

### 9.2 Requirements

A Level 5 compliant implementation MUST anchor the edition root on at
least two independent blockchains. Recommended secondary chains include
Bitcoin (via OpenTimestamps) or Ethereum L1.

## 10. Identity Binding

### 10.1 ECDSA Signatures

Implementations at Level 4 or above MUST bind author identity to the
edition via ECDSA signature. The signing address MUST be recoverable
on-chain.

### 10.2 Identity Registry

An on-chain identity contract SHOULD map author wallets to external
identifiers (ORCID, DOI) for cross-referencing.

## 11. Compliance Levels

LPS-1 defines six progressive compliance levels. See `COMPLIANCE.md`
for the full compliance matrix.

```
Level   Name                        Core Requirement
─────   ────                        ────────────────
0       Anchor Only                 SHA-256 hash stored on any public chain
1       Deterministic Build         CRLF normalisation + reproducible canonical hash
2       Merkle Provenance           Per-content-type Merkle trees + edition root
3       On-Chain Anchoring          Immutable blockchain record with edition root
4       Signed Canonical Root       ECDSA identity binding + author registry
5       Fully Observable            Cross-chain timestamp + client-side verification
```

Higher levels are strict supersets of lower levels. A Level 3
implementation MUST satisfy all requirements of Levels 0–2.

## 12. Security Considerations

### 12.1 Hash Collision

SHA-256 is considered collision-resistant under current computational
assumptions. Should SHA-256 be compromised, a protocol upgrade path
via new contract deployment is available.

### 12.2 Chain Reorganisation

Short-range block reorganisations on Polygon (or any PoS chain) could
theoretically alter timestamps. Cross-chain timestamping (Level 5)
mitigates this by providing independent temporal anchors.

### 12.3 Key Compromise

If an author's signing key is compromised, the on-chain anchor remains
valid (it is hash-based, not signature-based). However, new editions
signed by the compromised key could constitute false attribution.
Implementations SHOULD support key rotation via identity registry
updates.

### 12.4 IPFS Persistence

IPFS content availability depends on at least one node pinning the CID.
Implementations SHOULD use multiple pinning services. The on-chain
anchor remains valid regardless of IPFS availability — the edition root
is the canonical commitment.

## 13. IANA Considerations

This document has no IANA actions.

## 14. References

### 14.1 Normative References

- **RFC 2119** — Key words for use in RFCs to Indicate Requirement Levels
- **FIPS 180-4** — Secure Hash Standard (SHS)
- **ERC-721** — Non-Fungible Token Standard
- **ERC-2981** — NFT Royalty Standard

### 14.2 Informative References

- **Merkle, R. (1979)** — Secrecy, Authentication, and Public Key Systems
- **IPFS** — InterPlanetary File System, Protocol Labs
- **OpenTimestamps** — Calendar-based Bitcoin timestamping
- **Polygon** — EVM-compatible proof-of-stake chain

---

## Appendix A: Reference Implementation

The reference implementation of LPS-1 is maintained at:

- **Repository:** [FTHTrading/LPS-1-Reference-Implementation](https://github.com/FTHTrading/LPS-1-Reference-Implementation)
- **Deployment:** [FTHTrading/2500-donkeys](https://github.com/FTHTrading/2500-donkeys)
- **Site:** [xxxiii.io](https://xxxiii.io)
- **Compliance Level:** Level 5 — Fully Observable

## Appendix B: Related Specifications

| Spec   | Title                                 | Status   |
|--------|---------------------------------------|----------|
| LPS-1  | Literary Publishing Standard          | Active   |
| IAPL-1 | Immutable Audio Publishing Layer      | Active   |
| LPS-2  | Cross-Chain Anchor Standard           | Draft    |
| LPS-3  | Zero-Knowledge Proof of Origin        | Research |
| LPS-4  | Multi-Author Edition Support          | Proposed |
| LPS-5  | Audio Edition Merkle Standard         | Active   |

## Appendix C: Document History

| Version | Date       | Changes                                        |
|---------|------------|------------------------------------------------|
| 0.1.0   | 2025-06-15 | Initial manuscript hashing pipeline            |
| 1.0.0   | 2026-01-15 | Full Merkle architecture, Polygon deployment   |
| 2.0.0   | 2026-02-15 | Protocol demonstration layer, observability    |
| 2.2.0   | 2026-02-17 | Compliance level formalisation, governance docs |
