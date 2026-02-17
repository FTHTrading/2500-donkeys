```
LPS-1: Deterministic Literary Publishing Standard

Status:        Informational
Updates:       None
Obsoletes:     None
Author:        Kevan Burns (Kidd James)
Organization:  XXXIII Working Group
Date:          February 2026
DOI:           10.5281/zenodo.18646886
ORCID:         0009-0008-8425-939X
```

## Abstract

This document specifies a deterministic literary publishing protocol
that establishes cryptographic proof-of-origin, content integrity,
and immutable anchoring across decentralized storage and public
blockchains.

The protocol defines a forward-only edition lifecycle, Merkle-based
provenance commitments, and independently verifiable build determinism.
It is designed to be implementable by any party using standard
cryptographic primitives and public infrastructure.

## Status of This Memo

This memo provides information for the digital publishing community.
It does not specify an Internet standard. Distribution of this memo
is unlimited.

## Table of Contents

1. Introduction
2. Terminology
3. Protocol Overview
4. Deterministic Build Pipeline
5. Merkle Architecture
6. Edition State Machine
7. On-Chain Anchoring
8. Identity Binding
9. Verification Procedures
10. Compliance Levels
11. Security Considerations
12. IANA Considerations
13. References
14. Acknowledgements
15. Author's Address

## 1. Introduction

Traditional publishing lacks cryptographic guarantees of content
integrity and authorship provenance. Existing systems rely on
institutional trust, centralized timestamps, and mutable databases.

This protocol replaces trust-based provenance with mathematical
verification. Given identical source files, any independent party
MUST be able to reproduce identical hashes, Merkle roots, and
edition roots.

### 1.1. Requirements Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in
this document are to be interpreted as described in RFC 2119.

## 2. Terminology

**Canonical Manuscript**: The CRLF-normalized, UTF-8 encoded (no BOM)
source file whose SHA-256 hash constitutes the authoritative content
fingerprint.

**Edition**: A frozen, versioned snapshot of a literary work comprising
manuscript, artifacts, images, and prompt logs, identified by a unique
edition root.

**Edition Root**: SHA-256 hash derived from the concatenation of four
independent Merkle roots:
`editionRoot = SHA-256(manuscriptRoot || artifactRoot || imageRoot || promptRoot)`

**Anchor**: An immutable on-chain record binding an edition root and
IPFS CID to a specific block number and timestamp on a public
blockchain.

**Terminal State**: A state from which no further forward transitions
are possible. Terminal states preserve all historical data.

**Determinism**: The property that identical inputs always produce
identical outputs through canonical ordering, CRLF normalization,
and fixed concatenation sequences.

**Supersession**: The process by which a newer edition replaces an
older edition as canonical. The superseded edition remains on-chain
but is marked non-canonical.

## 3. Protocol Overview

The protocol defines a six-layer provenance stack. Each layer is
independently verifiable:

```
Layer   Name          Function
─────   ────          ────────
I       Filesystem    Source files, canonical ordering, version control
II      Git           Commit history, authorship timestamps, diffs
III     SHA-256       FIPS 180-4 cryptographic fingerprint
IV      Merkle Trees  Per-content-type roots, combined edition root
V       IPFS          Content-addressed decentralized storage
VI      Blockchain    Immutable on-chain anchor, block-level timestamp
```

## 4. Deterministic Build Pipeline

### 4.1. Normalization

All source files MUST be:
- Encoded as UTF-8 without byte order mark (BOM)
- Line-terminated with LF (0x0A), not CRLF
- Ordered according to a canonical `build/order.json` manifest

### 4.2. Hashing

The canonical hash MUST be computed as:
```
canonical_hash = SHA-256(normalized_file_bytes)
```

Implementations MUST produce identical hashes for identical byte
sequences regardless of operating system or toolchain.

### 4.3. Build Modes

| Mode           | Guarantee                                          |
|----------------|----------------------------------------------------|
| Normal         | Standard compilation                               |
| Deterministic  | Identical output from identical source              |
| Reproducible   | Third-party reproduction from published source only |

## 5. Merkle Architecture

### 5.1. Tree Structure

Each content type maintains an independent Merkle tree:

- **Manuscript Tree**: Chapter-level SHA-256 leaf nodes
- **Artifact Tree**: Build artifact hashes
- **Image Tree**: Image file hashes
- **Prompt Tree**: AI prompt log hashes

For works with audio content, additional trees MAY be defined:
- **Audio Tree**: Per-chapter audio file hashes

### 5.2. Odd-Leaf Handling

When a tree has an odd number of leaves, the last leaf MUST be
duplicated to complete the final pair. This ensures balanced binary
tree construction.

### 5.3. Edition Root Computation

```
editionRoot = SHA-256(manuscriptRoot || artifactRoot || imageRoot || promptRoot)
```

The concatenation order is fixed and MUST NOT be altered.

## 6. Edition State Machine

### 6.1. States

The edition lifecycle is modeled as a monotonic finite-state machine:

```
DRAFT → COMPILED → HASHED → MERKLE_BUILT → PINNED → ANCHORED → PUBLISHED
                                                                    │
                                                         ┌──────────┤
                                                         ↓          ↓
                                                    SUPERSEDED  RETRACTED
```

### 6.2. Transition Rules

- All transitions are forward-only and irreversible.
- No state MAY be revisited once exited.
- SUPERSEDED: Edition replaced by newer canonical edition.
  Historical data is preserved.
- RETRACTED: Author-initiated withdrawal with 48-hour timelock.
  On-chain record is preserved with retraction flag.

### 6.3. Terminal States

SUPERSEDED and RETRACTED are terminal states. All data associated
with terminal-state editions MUST be preserved on-chain and MUST
remain queryable.

## 7. On-Chain Anchoring

### 7.1. Anchor Record

An anchor transaction MUST record:
- Edition root hash
- IPFS CID
- Block number (implicit via transaction inclusion)
- Timestamp (block timestamp)
- Author signature (transaction signer)

### 7.2. Contract Requirements

Anchoring contracts:
- MUST NOT use upgradeable proxy patterns
- MUST restrict anchoring to the registered author address
- MUST implement append-only edition history
- MUST support edition freezing (permanent seal)
- MUST NOT include admin backdoors or privileged withdrawal functions

### 7.3. Reference Deployment

| Contract          | Address                                      | Block       |
|-------------------|----------------------------------------------|-------------|
| LiteraryAnchor    | 0x97f456300817eaE3B40E235857b856dfFE8bba90   | 83,002,198  |
| PublishingKernelV2| 0xca9F6604A9b498DB31d113836E2957c0a9aAE037   | 83,010,944  |
| AuthorIdentity    | 0xB9ffa688A8Bb332221030BbBE46bE5bF03323170   | 83,011,553  |
| EditionNFT        | 0x9e9Cc1486bf440Bd9eAaaD947958524Aaed3f8b0   | 83,110,065  |
| StoryNFT          | 0xD67e537Dba1236f802432cbDD30Fec3f6D38e7E3   | 83,110,129  |
| RoyaltyRouter     | 0x44169829489d70aaecbf845870652871C65fC461   | 83,010,990  |
| PublishingKernel   | 0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae   | 83,008,833  |

Network: Polygon Mainnet (Chain ID 137)
Compiler: Solidity 0.8.19
Framework: Hardhat + OpenZeppelin

## 8. Identity Binding

### 8.1. Author Identity Contract

The AuthorIdentity contract binds an Ethereum address to a
real-world identity via an immutable `author` field set at
construction time.

### 8.2. Properties

- Identity is self-sovereign: no oracle dependency
- Address binding is permanent: no transfer mechanism
- Multiple works MAY be linked to a single identity
- Identity information is publicly readable

## 9. Verification Procedures

### 9.1. Content Verification

1. Obtain source files from the published repository.
2. Normalize line endings to LF.
3. Compute SHA-256 of the canonical manuscript.
4. Compare against the on-chain anchor record.

### 9.2. Tree Verification

1. Compute per-file SHA-256 hashes for each content type.
2. Construct Merkle trees using the canonical ordering.
3. Compute the edition root from the four Merkle roots.
4. Compare against the on-chain edition root.

### 9.3. Chain Verification

1. Query the anchoring contract at the published address.
2. Read the edition record for the specified edition ID.
3. Verify edition root, IPFS CID, and frozen status.
4. Confirm author address matches the AuthorIdentity contract.

## 10. Compliance Levels

| Level | Name                    | Requirements                                  |
|-------|-------------------------|-----------------------------------------------|
| 1     | Deterministic Build     | SHA-256 canonical hash + CRLF normalization    |
| 2     | Merkle Commitments      | Per-type Merkle roots + combined edition root  |
| 3     | On-Chain Anchoring      | Immutable blockchain record with block timestamp|
| 4     | ECDSA Identity Binding  | Signed edition with on-chain author identity   |
| 5     | Cross-Chain Timestamping| Multi-chain anchor for temporal verification   |

A compliant implementation MUST satisfy all requirements of the
claimed level and all lower levels.

## 11. Security Considerations

### 11.1. Hash Collision Resistance

The protocol depends on SHA-256 collision resistance. If a practical
SHA-256 collision is discovered, the content integrity guarantees
of this protocol would be weakened. Implementors SHOULD monitor
NIST guidance on hash function security.

### 11.2. Key Management

Author key compromise permits unauthorized anchoring of new editions
but does not affect the integrity of previously anchored editions.
Key loss is permanent and non-recoverable. Implementors SHOULD
follow established key management practices.

### 11.3. IPFS Availability

IPFS provides content addressing, not availability guarantees.
Content availability depends on active pinning by at least one
node. CID immutability ensures that if content is available, it
is the correct content.

### 11.4. RPC Integrity

Client-side verification depends on honest RPC responses.
Verification across multiple independent endpoints mitigates
this risk. All state is independently verifiable via block
explorer interfaces.

### 11.5. Smart Contract Immutability

Non-upgradeable contracts eliminate governance attacks and proxy
vulnerabilities. The tradeoff is that bugs cannot be patched
in-place. New functionality requires new contract deployments.

## 12. IANA Considerations

This document has no IANA actions.

## 13. References

### 13.1. Normative References

- [RFC 2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.

- [FIPS 180-4] National Institute of Standards and Technology,
  "Secure Hash Standard (SHS)", FIPS PUB 180-4, August 2015.

### 13.2. Informative References

- [MERKLE] Merkle, R., "A Certified Digital Signature", Advances
  in Cryptology — CRYPTO '89, 1979.

- [IPFS] Benet, J., "IPFS - Content Addressed, Versioned, P2P
  File System", 2014.

- [EIP-721] Entriken, W., et al., "ERC-721 Non-Fungible Token
  Standard", Ethereum Improvement Proposals, 2018.

- [EIP-2981] Raible, Z., et al., "ERC-2981 NFT Royalty Standard",
  Ethereum Improvement Proposals, 2020.

## 14. Acknowledgements

This protocol was developed as part of the XXXIII deterministic
literary publishing project. The reference implementation was
deployed and verified on Polygon Mainnet in late 2025 and early
2026.

## 15. Author's Address

Kevan Burns (writing as Kidd James)
XXXIII Working Group
ORCID: 0009-0008-8425-939X

GitHub: https://github.com/FTHTrading/2500-donkeys
DOI: https://doi.org/10.5281/zenodo.18646886

---

*Copyright (c) 2026 Kevan Burns. This document is available under
the Creative Commons Attribution 4.0 International License (CC BY 4.0).*
