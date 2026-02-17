# LPS-1: Polygon Grant Application Narrative

**Applicant:** XXXIII Working Group (FTHTrading)
**Protocol:** Literary Publishing Standard (LPS-1)
**Network:** Polygon Mainnet (Chain ID 137)
**Date:** February 2026
**Contact:** xxxiii.io | github.com/FTHTrading/LPS-1-Reference-Implementation

---

## 1. Executive Summary

LPS-1 is an open, deterministic provenance standard for verifiable digital manuscripts, deployed live on Polygon Mainnet.

The protocol establishes cryptographic proof-of-origin, content integrity, and immutable authorship binding using SHA-256 hashing, Merkle tree commitments, IPFS pinning, and on-chain anchoring — without relying on any trusted intermediary. It is fully specified (RFC-style, 14 sections), fully deployed (7 verified contracts, zero upgradeability), fully tested (293 tests across 7 suites), and fully open (MIT license, CC BY 4.0 specification).

LPS-1 is public goods infrastructure. It is not a platform, marketplace, or publishing tool. It is a standard for proving that a specific person wrote a specific work at a specific time — using mathematics, not intermediaries.

---

## 2. Problem Statement

Digital works have no standardised mechanism for cryptographic proof-of-origin.

Authors cannot independently prove when a work was written, that its contents have not been altered, or that a specific individual authored it — without relying on centralised intermediaries. Existing publishing infrastructure depends on institutional trust: publishers, distributors, and platform operators serve as de facto authorities on authorship and content integrity.

This problem is compounded by three converging trends:

**AI-generated content proliferation.** As generative AI produces text indistinguishable from human-authored work, the need for deterministic, verifiable authorship proof becomes critical. No existing standard addresses this.

**Platform dependency risk.** Authors who rely on Amazon, Google, or any single platform for provenance are subject to arbitrary policy changes, deplatforming, and corporate dissolution. Authorship proof must be platform-independent.

**Institutional trust erosion.** Copyright registries, ISBN databases, and publisher attestations are centralised points of failure. They cannot be independently verified without institutional cooperation.

The problem is structural. It is not solved by digitisation, e-book platforms, or blockchain-based marketplaces. These tools replicate the same trust model in digital form. What is required is an open, deterministic standard that anyone can implement and anyone can verify.

---

## 3. Solution: The LPS-1 Protocol

LPS-1 defines a deterministic protocol for literary provenance with six independently verifiable layers:

| Layer | Function | Verification Method |
|-------|----------|-------------------|
| Filesystem | Canonical file ordering and version control | `git log`, directory inspection |
| Git | Commit-level authorship history with GPG signatures | `git verify-commit` |
| SHA-256 | FIPS 180-4 cryptographic fingerprint at word/paragraph/chapter level | `sha256sum` |
| Merkle Trees | Per-content-type provenance commitments (manuscript, audio, image, artifact) | Root comparison against on-chain anchor |
| IPFS | Content-addressed decentralised storage | CID resolution |
| Polygon | Immutable on-chain anchor with block timestamp | Direct RPC read, Polygonscan verification |

Additionally, cross-chain timestamping via Bitcoin (OpenTimestamps) provides independent temporal attestation on the most secure public blockchain.

**Key protocol properties:**

- **Deterministic builds.** Given identical source files, the protocol produces identical hashes. No randomness, no environment dependency.
- **Forward-only lifecycle.** Editions move from Draft → Anchored → Frozen. Frozen editions cannot be modified or deleted. State transitions are enforced on-chain.
- **Zero upgradeability.** All seven smart contracts are non-upgradeable by design. No proxy pattern, no admin key, no governance override.
- **Client-side verification.** Any user can verify any claim using only a blockchain RPC endpoint and publicly available source files. No backend, no API key, no trusted service.

---

## 4. What Is Already Live

LPS-1 is not a proposal. It is a deployed, production system on Polygon Mainnet.

| Metric | Value |
|--------|-------|
| Smart contracts deployed and verified | 7 / 7 |
| Test coverage | 293 tests across 7 suites |
| Reference implementation verification tests | 58 (37 contract + 21 pipeline) |
| Compliance level achieved | Level 5 — Fully Observable |
| Reference implementations frozen on-chain | 2 (The 2,500 Donkeys, Private Placement Programs) |
| Merkle trees constructed and anchored | 6 (manuscript, audio, image, artifact, prompt, combined) |
| Cross-chain timestamps | Polygon + Bitcoin (OpenTimestamps) |
| Architecture Decision Records | 6 documented |
| Specification status | Informational, RFC-style, 14 sections |
| Research paper | Published, DOI-indexed, open access |
| Client-side verification dashboard | Live at xxxiii.io |
| Upgrade mechanism | None (non-upgradeable by design) |
| License | MIT (infrastructure), CC BY 4.0 (specification) |

**Deployed contracts (all verified on Polygonscan):**

| Contract | Address | Function |
|----------|---------|----------|
| LiteraryAnchor | `0x97f456300817eaE3B40E235857b856dfFE8bba90` | Edition anchoring, hash/CID storage |
| KernelV2 | `0xca9F6604A9b498DB31d113836E2957c0a9aAE037` | Edition lifecycle, freeze enforcement |
| AuthorIdentity | `0xB9ffa688A8Bb332221030BbBE46bE5bF03323170` | ECDSA-bound identity, pseudonym registry |
| RoyaltyRouter | `0x44169829489d70aaecbf845870652871C65fC461` | ERC-2981 routing |
| EditionNFT | `0x9e9Cc1486bf440Bd9eAaaD947958524Aaed3f8b0` | ERC-721 edition tokens |
| StoryNFT | `0xD67e537Dba1236f802432cbDD30Fec3f6D38e7E3` | ERC-721 story tokens |
| Kernel (v1) | `0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae` | Legacy kernel (superseded) |

---

## 5. Why Polygon

Polygon Mainnet was selected as the primary settlement layer based on a structured cost-benefit analysis (documented in ADR-0006):

| Factor | Assessment |
|--------|-----------|
| Transaction cost | < $0.01 per anchor operation |
| Finality | ~2 second block times |
| EVM compatibility | Full Solidity 0.8.19 support, standard tooling |
| Verification | Polygonscan source verification, public RPC endpoints |
| Ecosystem | Established validator set, institutional adoption |
| Longevity | Polygon Labs backing, Ethereum-aligned roadmap |

LPS-1 is native Polygon infrastructure. Every contract, every anchor, every verification read operates on Polygon Mainnet. The protocol's live telemetry dashboard at xxxiii.io reads directly from Polygon RPC — no intermediary backend, no caching layer, no API abstraction.

---

## 6. Grant Request Scope

This grant funds the transition from single-implementation protocol to multi-implementation standard. Four phases:

### Phase II — Multi-Author Support
- Co-author identity binding with shared ECDSA governance
- Delegation support for institutional publishers
- Shared edition lifecycle management
- **Deliverable:** Updated AuthorIdentity contract + specification amendment

### Phase IV — zk-Proof Inclusion
- Zero-knowledge Merkle inclusion proofs for privacy-preserving verification
- Proof generation library (TypeScript + Solidity verifier)
- **Deliverable:** zk-SNARK verifier contract on Polygon, npm package

### Phase V — Institutional API + SDK
- REST verification endpoints (OpenAPI 3.x)
- TypeScript SDK for programmatic anchoring and verification
- Integration guides for libraries, archives, and publishers
- **Deliverable:** Published npm package, hosted API documentation

### Independent Security Review
- Third-party audit of all seven deployed contracts
- Formal verification of critical state transitions (freeze, anchor)
- **Deliverable:** Published audit report, remediation documentation

---

## 7. Budget Allocation

| Category | Allocation | Scope |
|----------|-----------|-------|
| Protocol Engineering | 40% | Multi-author contracts, zk-proof system, SDK development |
| Security Audit | 25% | Third-party contract audit, formal verification |
| Documentation & SDK | 20% | OpenAPI specification, integration guides, npm packaging |
| Ecosystem Outreach | 15% | Implementor onboarding, academic partnerships, conference presentation |

Budget is structured for accountability. Each phase has discrete deliverables with on-chain verification. Contract deployments are publicly verifiable. All code is MIT-licensed and pushed to the public repository.

---

## 8. Public Goods Impact

LPS-1 is public goods infrastructure. It is designed to be used by anyone, verified by anyone, and implemented by anyone — without permission, payment, or platform dependency.

### Open Reproducibility
Every claim made by the protocol is independently reproducible. Given the source files and a Polygon RPC endpoint, any party can reconstruct every hash, verify every Merkle root, and confirm every on-chain anchor. No trusted service required.

### Platform-Independent Verification
Authors using LPS-1 do not depend on any platform, publisher, or service provider to prove authorship. The proof exists on-chain, is readable by anyone, and persists independently of the author's continued participation.

### AI Transparency Layer
In an era of generative AI, LPS-1 provides a mechanism for authors to cryptographically distinguish human-authored works from AI-generated content — not through claims, but through deterministic, timestamped provenance chains that predate the work's publication.

### Cultural Infrastructure
Literary works are cultural artifacts. Their provenance should be as verifiable as financial transactions. LPS-1 treats literary publishing with the same cryptographic rigour that blockchain applies to value transfer.

### Standards-Grade Design
LPS-1 is not a product. It is a standard. It has:
- A formal specification (RFC-style, 14 sections)
- Compliance levels (L0–L5 with published evidence requirements)
- A governance model (author-led → working group transition)
- A published research paper (DOI-indexed, open access)
- A conformance registry for external implementations

---

## 9. Adoption Strategy

### Current State
- 1 production implementation (XXXIII, Level 5)
- 2 frozen reference implementations on-chain
- Public "Become an Implementor" onboarding path at xxxiii.io
- Open conformance registry accepting external submissions

### Growth Path
1. **Implementor onboarding.** Five-step process published at xxxiii.io: choose compliance level, clone repo, run verifier, deploy anchor, submit conformance statement.
2. **Academic adoption.** Research paper published with DOI. Protocol suitable for digital humanities grants (NEH, Mellon Foundation, IMLS).
3. **Institutional integration.** Phase V delivers REST API for library and archive integration. Enables institutional verification without requiring blockchain expertise.
4. **Cross-ecosystem reach.** Phase III (Ethereum L1 mirror) extends protocol to settlement-layer finality, broadening the implementor base beyond Polygon.

### Success Metrics
| Metric | 6 Months | 12 Months |
|--------|----------|-----------|
| External implementations | 1+ | 3+ |
| Specification amendments | 1 (multi-author) | 2 (multi-author, zk) |
| Npm package downloads | — | 500+ |
| Security audit | Initiated | Published |
| Governance transition | — | Working group formed |

---

## 10. Team

| Role | Name | Responsibility |
|------|------|---------------|
| Protocol Author | Kidd James | Specification, contract architecture, reference implementation |
| Specification Steward | XXXIII Working Group | Specification maintenance, amendment review |
| Reference Implementation | FTHTrading | Repository management, CI/CD, test infrastructure |
| Security Review | Independent (2026) | Contract audit, formal verification |

---

## 11. References

| Resource | Link |
|----------|------|
| Protocol Site | [xxxiii.io](https://xxxiii.io) |
| LPS-1 Specification | [spec/LPS-1.md](https://github.com/FTHTrading/LPS-1-Reference-Implementation/blob/main/spec/LPS-1.md) |
| LPS Protocol Stack | [spec/LPS-STACK.md](https://github.com/FTHTrading/LPS-1-Reference-Implementation/blob/main/spec/LPS-STACK.md) |
| Compliance Matrix | [spec/COMPLIANCE.md](https://github.com/FTHTrading/LPS-1-Reference-Implementation/blob/main/spec/COMPLIANCE.md) |
| Governance Model | [spec/GOVERNANCE.md](https://github.com/FTHTrading/LPS-1-Reference-Implementation/blob/main/spec/GOVERNANCE.md) |
| Roadmap | [docs/ROADMAP.md](https://github.com/FTHTrading/LPS-1-Reference-Implementation/blob/main/docs/ROADMAP.md) |
| Funding Brief | [docs/FUNDING_BRIEF.md](https://github.com/FTHTrading/LPS-1-Reference-Implementation/blob/main/docs/FUNDING_BRIEF.md) |
| Research Paper | [DOI 10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886) |
| Public Repository | [GitHub](https://github.com/FTHTrading/LPS-1-Reference-Implementation) |
| LiteraryAnchor Contract | [Polygonscan](https://polygonscan.com/address/0x97f456300817eaE3B40E235857b856dfFE8bba90#code) |
| KernelV2 Contract | [Polygonscan](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code) |
