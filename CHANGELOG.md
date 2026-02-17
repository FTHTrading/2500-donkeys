# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Tags follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v3.0.0] — 2026-02-18

### Added
- **Role Structure** — `docs/roles/` with institutional team framework
  - `CORE_TEAM.md` — Protocol Author, Specification Editor, Infrastructure Maintainer, Security Reviewer
  - `CONTRIBUTORS.md` — 5 contribution pathways, quality standards, IP/licensing
  - `REVIEWERS.md` — 3 review types, criteria matrix, standard/emergency/breaking processes
- **ROADMAP.md** — 6-phase milestone-based development trajectory
  - Phase I: Deterministic Anchor (complete) → Phase VI: Multi-Implementation Adoption
  - Funding alignment and risk assessment per phase
- **LPS-STACK.md** — full protocol stack formalization (`docs/spec/`)
  - 6-layer architecture: Infrastructure → Core Protocol → Audio → Distribution → Compliance → Observability
  - Component tables, stack interaction model, improvement proposals registry
- **FUNDING_BRIEF.md** — institutional positioning document
  - Problem framing, measurable impact metrics, budget categories
  - Grant alignment: NEH, Mellon, IMLS, Protocol Labs, ETH Foundation, Polygon Village
- **Compliance Framework** — `docs/spec/COMPLIANCE.md` with L0–L5 conformance matrix
- **Governance Model** — `docs/spec/GOVERNANCE.md` author-led → working group transition
- **Working Group Scope** — `docs/WORKING_GROUP.md` with future proposals (LPS-2 through LPS-5)
- **Release Notes v2.2** — `docs/RELEASE_NOTES_v2.2.md` documenting PPP rename + provenance footnotes
- **Site sections expanded** — 22 → 24 sections on xxxiii.io
  - Section VI: LPS Protocol Stack — 6-layer stack visualization with spec links
  - Section XXIII: Implementation Roadmap — 6-phase timeline with active phase indicator
  - Governance links (Roadmap, LPS Stack, Core Team) added to Implementation Status
- **ANNOUNCEMENT_LPS1_v1.0.md** — public release announcement and executive one-pager

### Changed
- All section numerals renumbered I–XXIV with strict light/dark alternation
- "Private Placement Entertainment" → "Private Placement Programs" across codebase (`81f750c`)
- Provenance footnotes added to narrative sections (`50925ab`)

---

## [v2.1.0] — 2026-02-17

### Added
- **Observability Layer** — live chain state from Polygon mainnet via ethers.js v6 (`c00653c`)
  - 11 parallel contract reads via `Promise.allSettled`
  - Event timeline (EditionAnchored, EditionFrozen) from last ~200k blocks
  - Green/loading/error status indicator, manual refresh
  - Responsive 4-quadrant grid: Literary Anchor, KernelV2, Author Identity, NFT Layer
- **Architecture Decision Records** — `docs/adr/` with 6 structured ADRs
  - ADR-0001: Anchor Immutability — No Upgradeable Proxies
  - ADR-0002: Deterministic Build Pipeline
  - ADR-0003: Six-Tree Merkle Architecture
  - ADR-0004: Client-Side Observability (No Backend)
  - ADR-0005: ECDSA Author Identity Binding
  - ADR-0006: Polygon Mainnet as Primary Chain
- **Security documentation** — `security/` folder
  - Threat model with categorized threats, attack scenarios, and mitigation status
  - RPC fallback strategy with 5 prioritized endpoints
  - Private key operational guidelines
- **CHANGELOG.md** — this file
- **Protocol metrics bar** on site — live test count, contract count, blocks since genesis

---

## [v2.0.0] — 2026-02-17

### Added
- **Protocol Interface Layer** — site transformed from documentation to demonstration (`0c6532f`)
  - Section IV: Protocol Layer — five-layer provenance stack visualization
  - Section VI: Merkle Architecture — interactive four-tree convergence diagram
  - Section VII: State Machine — DRAFT → PUBLISHED pipeline with clickable stages
  - Section IX: Contract Architecture — 7 contracts with deployment details
  - Section XI: System Invariants — expandable card grid
  - Section XIII: Cross-Chain Anchoring — Polygon + Bitcoin + Ethereum planned
  - Section XIV: Why This Matters — five core value propositions
  - Protocol badges in hero (Solidity, Hardhat, OpenZeppelin, Deterministic Build, MIT)
  - Reference Implementation links in Verify section

### Changed
- Site architecture from single column to multi-section protocol interface
- Navigation updated with Protocol, Pipeline, Contracts, Live links

---

## [v1.1.0] — 2026-02-16

### Added
- **EditionNFT** contract — ERC-721 + ERC-2981, 3-tier supply (Genesis/Founder/Public), deployed and verified (`e2c811d`)
- **StoryNFT** contract — ERC-721 + ERC-2981, XIV stories, deployed and verified (`e2c811d`)
- **Private Placement Programs** — 13 satirical stories, full pipeline (`d3d11d3`)
  - Manuscript Merkle tree (16 leaves)
  - Kokoro TTS narration (13 MP3s, `bm_george` narrator)
  - Audio Merkle tree (13 leaves)
  - On-chain anchor: LiteraryAnchor Edition 5, KernelV2 Edition 2 (frozen)
- **Professional PDF typesetting** — Puppeteer 5.5×8.5 digest format (`076eb83`)
- **KDP publishing pipeline** — EPUB/DOCX build, front/back matter rewrite (`5cb9b39`)
- **LPS Verify CI** — GitHub Actions runs 51+ checks on every push (`84730b2`)
- VPS-1 unified verification standard (`2d1d477`)
- IAPL-1 Immutable Audio Provenance Layer (`8c0b29f`)
- Gallery page with 21 AI-generated images
- Listen page with 36 audio tracks

### Fixed
- Cross-platform CRLF normalization via `.gitattributes` (`4cf8fc8`)
- CI line-ending consistency for Merkle verification (`4657d4d`, `cb1724d`)
- Image/prompt root divergence classified as WARN not FAIL in LPS Verify (`32207e0`)

---

## [v1.0.0] — 2026-02-15

### Added
- **Research paper** — "Deterministic Literary Publishing" published on Zenodo (`92b159a`)
  - DOI: 10.5281/zenodo.18646886
  - ORCID: 0009-0008-8425-939X
  - PDF generator, SSRN submission, citation infrastructure
- Academic dissemination: ResearchGate, Medium, ORCID wiring
- xxxiii.io citation section with APA/BibTeX/Chicago

---

## [v0.9.0] — 2026-02-14

### Added
- **AuthorIdentity** deployed and verified — 12 works + 4 linked contracts (`a803a24`)
- **PublishingKernelV2** deployed — ECDSA enforced, edition FROZEN, canonical set (`ee969a9`)
  - Merkle-verified editions with 5-root structure
  - Freeze mechanism (permanent, irreversible)
  - Author ECDSA signature on editions
- **RoyaltyRouter** deployed — pull-based revenue distribution (`ead6528`)
- **PublishingKernel** deployed — licensing engine with territory/term (`71cb987`)
- LPS-1 protocol specification formalized (`48160a1`)
- Protocol state machine, invariants document, deployment registry (`c6b7100`)

---

## [v0.1.0] — 2026-02-14

### Added
- **Genesis** — literary protocol initialized (`d929861`)
  - 9 narrative blocks + 5 artifact exhibits
  - IPFS pinning (Kubo node)
  - SHA-256 canonical hash: `cdef74d1...578364`
  - Genesis CID: `QmVQ79NM3qxA...g8vK`
- **LiteraryAnchor** deployed to Polygon mainnet — genesis locked (`ee32d15`)
  - Contract: `0x97f456300817eaE3B40E235857b856dfFE8bba90`
  - Block: 83,002,198
  - Cost: 0.887 POL
- Hardhat infrastructure: 11 tests passing, deploy/verify scripts (`23f7920`)
- Edition 2 expansion: 31 blocks, ~75k words (`36185e2`)
- Cloudflare Pages site for xxxiii.io (`b7e6226`)

---

[v3.0.0]: https://github.com/FTHTrading/2500-donkeys/compare/v2.1-observability...v3.0-standards-foundation
[v2.1.0]: https://github.com/FTHTrading/2500-donkeys/compare/v2.0-protocol...v2.1-observability
[v2.0.0]: https://github.com/FTHTrading/2500-donkeys/compare/v1.1-paper...v2.0-protocol
[v1.1.0]: https://github.com/FTHTrading/2500-donkeys/compare/v1.0-paper...v1.1-paper
[v1.0.0]: https://github.com/FTHTrading/2500-donkeys/compare/v0.9.0...v1.0-paper
[v0.9.0]: https://github.com/FTHTrading/2500-donkeys/compare/v0.1.0...v0.9.0
[v0.1.0]: https://github.com/FTHTrading/2500-donkeys/commits/v0.1.0
