# Press Release — For Distribution

**FOR IMMEDIATE RELEASE**

---

## Independent Researcher Publishes First Formally Verified Literary Provenance Architecture

**DOI-indexed paper documents a five-layer cryptographic system for manuscript verification — deployed for under $2.50**

---

**NORCROSS, GA — February 15, 2026** — Kevan Burns, founder of FTH Trading, has published a formal research paper documenting the first complete provenance architecture for literary publishing built entirely on open, verifiable infrastructure.

The paper, *"Deterministic Literary Publishing: A Multi-Layer Provenance Model for Verifiable Manuscripts"* (DOI: 10.5281/zenodo.18646886), describes a five-layer verification system that enables any third party to independently confirm a manuscript's authorship, version integrity, and temporal existence — without relying on publishers, platforms, or institutional intermediaries.

### The Problem

Traditional publishing provides no mechanism for an author to prove — with cryptographic certainty — when a manuscript existed in its exact form. Copyright registration is slow, expensive, and non-verifiable by third parties. Platform upload timestamps are controlled by the platform, not the author. No existing system provides granular, chapter-level integrity verification.

### The Architecture

Burns designed and deployed a system combining:

- **Merkle tree hashing** across 56 content components (chapters, embedded documents, visual assets, AI-generation prompts)
- **Content-addressed storage** via IPFS, producing deterministic identifiers
- **On-chain anchoring** via five smart contracts on Polygon mainnet
- **Cross-chain timestamping** on Bitcoin via OpenTimestamps
- **ECDSA-enforced authorship** binding a cryptographic identity to the manuscript

The system was validated through a complete deployment accompanying a 75,000-word literary work, *The 2,500 Donkeys*. Total infrastructure cost: approximately $2.50 USD.

### Independently Verifiable

Every claim in the paper is verifiable against public state:

- All five smart contracts are source-verified on Polygonscan
- The manuscript bundle is pinned to IPFS with a deterministic content identifier
- 146 automated tests cover all protocol invariants
- The paper itself is archived with Zenodo and assigned a persistent DOI

### Why It Matters

"The question isn't whether blockchain can store manuscripts — that's trivial," said Burns. "The question is whether a single author, with no institutional backing, can construct a verification chain that an independent third party can audit from end to end. This paper demonstrates that the answer is yes, and the cost is negligible."

The architecture is formalized as the Literary Protocol Standard (LPS-1) and is applicable beyond literature — to legal documents, regulatory filings, academic manuscripts, or any context where provenance and temporal verification are requirements.

### Availability

- **Paper:** https://doi.org/10.5281/zenodo.18646886
- **SSRN:** Submitted for indexing (February 15, 2026)
- **Source code:** https://github.com/FTHTrading/2500-donkeys (MIT license)
- **Project site:** https://xxxiii.io
- **ORCID:** https://orcid.org/0009-0008-8425-939X

### About FTH Trading

FTH Trading is a research and infrastructure firm focused on deterministic systems for publishing, provenance, and digital verification. Founded by Kevan Burns in 2024, the firm operates from Norcross, Georgia.

---

**Media Contact:**
Kevan Burns
kevan.burns@fthtrading.com
FTH Trading, Inc.
https://xxxiii.io

---

*###*
