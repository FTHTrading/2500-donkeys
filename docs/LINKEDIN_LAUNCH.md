# LPS-1 LinkedIn Launch Package

**Prepared:** February 17, 2026
**Author:** Kidd James (Kevan Burns)
**Protocol:** LPS-1 — Literary Publishing Standard
**Site:** xxxiii.io

---

## 1. Primary Launch Post

> Copy the text below directly into LinkedIn. Stays within the 3,000-character limit. The first three lines appear above "...see more" — they must carry the hook.

---

I built an open standard for proving authorship on-chain. It's live on Polygon Mainnet today.

LPS-1 is a deterministic provenance protocol for digital manuscripts. It uses SHA-256 hashing, Merkle tree commitments, and on-chain anchoring to prove that a specific person wrote a specific work at a specific time — without relying on any publisher, platform, or intermediary.

Here is what's deployed right now:

→ 7 verified smart contracts on Polygon Mainnet
→ 293 tests across 7 suites (100% pass)
→ 2 literary works frozen on-chain with signed Merkle roots
→ 6 Merkle trees (manuscript, audio, image, artifact, prompt, combined)
→ Cross-chain timestamps on Polygon + Bitcoin (OpenTimestamps)
→ Level 5 compliance — the highest tier in the LPS conformance matrix
→ Total deployment cost: under $2.50
→ Zero upgradeability. No admin keys. No proxy patterns.

The entire protocol stack is open source (MIT). The specification is CC BY 4.0. Anyone can implement it. Anyone can verify it.

Why this matters now:

AI-generated text is indistinguishable from human-authored work. There is no standardised mechanism for an author to cryptographically prove when a work was written or that its contents haven't been altered. Copyright registries and publisher attestations are centralised points of failure.

LPS-1 solves this structurally. Given the source files and a Polygon RPC endpoint, any party can reconstruct every hash, verify every Merkle root, and confirm every on-chain anchor. No trusted service required.

What LPS-1 is NOT:
— Not a marketplace or publishing platform
— Not a financial instrument or tokenisation scheme
— Not a product

It is infrastructure. A standard. Like TCP/IP is a standard for packet routing, LPS-1 is a standard for literary provenance.

The specification is RFC-style (14 sections). There is a published research paper (DOI-indexed, open access). A governance model with codified transition criteria. A six-phase roadmap. And a live verification dashboard that reads directly from Polygon — no backend, no caching layer.

Verify it yourself in 90 seconds:
git clone https://github.com/FTHTrading/LPS-1-Reference-Implementation.git
npm install && npx hardhat test

Or view the live protocol dashboard: https://xxxiii.io

The protocol is built. The contracts are deployed. The standard is published. Now looking for:
— External implementors (Level 0 requires a single SHA-256 anchor)
— Security auditors for independent contract review
— Institutional partners (libraries, archives, university presses)

If you work in digital provenance, on-chain infrastructure, or literary technology — this is an open invitation.

MIT licensed. Independently verifiable. Deployed today.

#Polygon #Blockchain #OpenSource #DigitalProvenance #SmartContracts #Web3 #LiteraryTechnology #OpenStandards #Cryptography #PublicGoods

---

## 2. Short Version (Under 1,300 Characters)

> Use this for reposting, cross-posting, or if the long version feels too dense for your network.

---

I built an open standard for proving authorship on a public blockchain. It's deployed on Polygon Mainnet today.

LPS-1 uses SHA-256 hashing, Merkle trees, and on-chain anchoring to let any author prove — cryptographically — that they wrote a specific work at a specific time. No platform. No intermediary. No trust required.

What's live:
→ 7 verified contracts on Polygon
→ 293 tests, Level 5 compliance
→ 2 literary works frozen on-chain
→ MIT licensed, fully open source
→ Total deployment cost: < $2.50

In a world where AI generates text indistinguishable from human writing, authors need deterministic proof-of-origin. Not claims. Not timestamps. Mathematical proof that anyone can verify independently.

The specification, research paper, and full verification suite are public.

Verify it: https://xxxiii.io
Clone it: https://github.com/FTHTrading/LPS-1-Reference-Implementation

Looking for implementors, auditors, and institutional partners.

#Polygon #OpenSource #DigitalProvenance #Web3 #SmartContracts #PublicGoods

---

## 3. Follow-Up Comments (Post in Thread Under Main Post)

> Drop these as replies to your own post, spaced 15–30 minutes apart. Each adds depth without bloating the primary post.

### Comment 1 — The Technical Stack (Post at +15 min)

For the technical audience — here's the protocol stack:

Layer 1: Filesystem — Canonical file ordering, version control
Layer 2: Git — Commit-level authorship with GPG signatures
Layer 3: SHA-256 — FIPS 180-4 hashing at word, paragraph, and chapter level
Layer 4: Merkle Trees — Per-content-type provenance commitments
Layer 5: IPFS — Content-addressed decentralised storage
Layer 6: Polygon — Immutable on-chain anchor with block timestamp

Each layer is independently verifiable. The specification covers all six: https://github.com/FTHTrading/LPS-1-Reference-Implementation/blob/main/spec/LPS-1.md

### Comment 2 — Why Non-Upgradeable (Post at +30 min)

A common question: why non-upgradeable contracts?

Because provenance infrastructure cannot have admin keys. If anyone — including the author — can modify anchored state after deployment, the entire verification model breaks. Trust shifts from mathematics back to people.

All seven contracts are deployed without proxy patterns, without owner overrides, and without governance mechanisms that could alter frozen content. This is a design constraint, not a limitation.

### Comment 3 — The AI Problem (Post at +45 min)

The immediate use case that matters most:

Generative AI can produce text indistinguishable from human writing. Within 24 months, the question "did a human write this?" will be unanswerable by inspection alone.

LPS-1 doesn't detect AI. It provides a different tool: deterministic, timestamped provenance chains that predate publication. If an author anchors their manuscript cryptographically before publishing, the on-chain record proves the work existed in that exact form at that exact time — regardless of how it was created.

That's a verifiable fact, not a claim.

### Comment 4 — Call to Implementors (Post at +60 min)

LPS-1 has five compliance levels. Level 0 requires a single SHA-256 anchor. Level 5 provides full runtime observability.

If you want to build a conformant implementation:
1. Choose a compliance level
2. Clone the reference implementation
3. Run the verification suite
4. Deploy your own anchor contract
5. Submit a conformance statement

The onboarding path is documented at https://xxxiii.io/#implement

Open slots in the conformance registry. MIT licensed. No permission required.

---

## 4. LinkedIn Article (Long-Form)

> Publish this as a LinkedIn Article (not a post). Articles get different distribution, appear on your profile permanently, and support formatting. Publish 24–48 hours after the launch post.

---

**Title:** LPS-1: An Open Standard for Deterministic Literary Provenance

**Subtitle:** How SHA-256 hashing, Merkle trees, and on-chain anchoring solve the authorship verification problem — deployed today on Polygon Mainnet.

---

### The Problem

Digital works have no standardised mechanism for cryptographic proof-of-origin.

An author cannot independently prove when a work was written, that its contents have not been altered, or that a specific individual authored it — without relying on a centralised intermediary. Publishers, ISBN registries, copyright offices, and platform operators serve as de facto authorities on authorship and content integrity. Every one of them is a single point of failure.

This problem is compounded by three converging trends:

**AI-generated content.** Large language models produce text indistinguishable from human-authored work. Within the next two years, surface-level inspection will not be sufficient to determine whether a human wrote a given document. Authors need a mechanism to establish verifiable provenance before publication.

**Platform dependency.** Authors who rely on Amazon, Google, or any single platform for provenance are subject to arbitrary policy changes, service discontinuation, and corporate restructuring. Authorship proof must outlive any company.

**Institutional trust erosion.** Copyright registries and publisher attestations cannot be independently verified without institutional cooperation. They are opaque, centralised, and fragile.

The problem is structural. It requires an open, deterministic standard — not another platform.

### The Solution: LPS-1

LPS-1 (Literary Publishing Standard, version 1) defines a six-layer deterministic provenance protocol:

| Layer | Function | Verification |
|-------|----------|-------------|
| Filesystem | Canonical file ordering | Directory inspection |
| Git | Commit-level authorship | `git verify-commit` |
| SHA-256 | Content fingerprinting | `sha256sum` |
| Merkle Trees | Provenance commitments | Root comparison |
| IPFS | Decentralised storage | CID resolution |
| Polygon | On-chain anchor | RPC read |

The key design properties:

- **Deterministic.** Given identical source files, the protocol produces identical outputs. No randomness. No environment dependency.
- **Forward-only.** Editions move from Draft → Anchored → Frozen. Frozen editions cannot be modified. State transitions are enforced on-chain.
- **Non-upgradeable.** All seven smart contracts use no proxy pattern, no admin key, and no governance override.
- **Client-side verifiable.** Any user can verify any claim using a blockchain RPC endpoint and the source files. No backend required.

### What Is Deployed Today

LPS-1 is not a whitepaper or a proposal. It is a production system on Polygon Mainnet.

- **7 smart contracts** — all source-verified on Polygonscan
- **293 tests** across 7 test suites, plus 58 reference implementation tests
- **2 literary works** anchored and frozen on-chain
- **6 Merkle trees** constructed and committed (manuscript, audio, image, artifact, prompt, combined)
- **Level 5 compliance** — the highest tier in the LPS conformance matrix
- **Total deployment cost** — under $2.50
- **Live verification dashboard** at [xxxiii.io](https://xxxiii.io) reading directly from Polygon RPC

The deployed contracts:

| Contract | Purpose |
|----------|---------|
| LiteraryAnchor | Edition anchoring, hash and CID storage |
| KernelV2 | Edition lifecycle, freeze enforcement |
| AuthorIdentity | ECDSA-bound identity, pseudonym registry |
| RoyaltyRouter | ERC-2981 pull-based royalty routing |
| EditionNFT | ERC-721 edition tokens |
| StoryNFT | ERC-721 story tokens |
| Kernel (v1) | Legacy kernel, superseded by KernelV2 |

Every contract address, every transaction, and every anchored hash is publicly readable on Polygonscan.

### Why Polygon

Polygon Mainnet was selected based on a structured cost-benefit analysis (documented in Architecture Decision Record ADR-0006):

- **Cost.** Sub-cent transaction fees make literary anchoring viable for individual authors. The entire seven-contract deployment cost under $2.50.
- **Finality.** ~2 second block times provide near-immediate confirmation.
- **Verification.** Polygonscan provides free source-code verification accessible to non-technical reviewers.
- **Ecosystem.** Established validator set, institutional adoption, and Ethereum alignment.

LPS-1 is native Polygon infrastructure. Every anchor, every verification read, and every telemetry metric operates on Polygon Mainnet with no intermediary backend.

### How to Verify

Anyone can verify the protocol in 90 seconds:

```
git clone https://github.com/FTHTrading/LPS-1-Reference-Implementation.git
cd LPS-1-Reference-Implementation
npm install
npx hardhat test
```

This runs 58 automated checks: hash comparison, Merkle root reconstruction, on-chain state verification, and edition consistency. Results are deterministic.

The full production verification suite (51 checks against the live deployment):

```
git clone https://github.com/FTHTrading/2500-donkeys.git
cd 2500-donkeys
npm install
npm run lps:verify
```

### The Standard, Not the Product

LPS-1 is designed as a standard, not a product. It includes:

- A formal specification (RFC-style, 14 sections)
- Five compliance levels (L0–L5) with published evidence requirements
- A governance model with codified transition criteria
- A published research paper (DOI-indexed, open access)
- A conformance registry for external implementations
- Architecture Decision Records documenting every structural choice

The specification and all infrastructure are MIT licensed. The research paper and specification documents are CC BY 4.0. Anyone can implement the standard without permission, payment, or platform dependency.

### What Comes Next

The protocol roadmap has six phases:

| Phase | Milestone | Status |
|-------|-----------|--------|
| I | Deterministic Anchor | Complete |
| II | Multi-Author Support | Proposed |
| III | Ethereum L1 Mirror | Research |
| IV | Zero-Knowledge Proofs | Research |
| V | Institutional API + SDK | Planned |
| VI | Multi-Implementation Adoption | Planned |

The immediate priorities: independent security audit of all seven contracts, TypeScript SDK for third-party integration, and onboarding external implementors at any compliance level.

### An Open Invitation

LPS-1 is open infrastructure. The conformance registry has open slots. Level 0 requires a single SHA-256 anchor. Level 5 provides full runtime observability.

If you work in digital provenance, on-chain infrastructure, literary technology, digital humanities, or institutional archiving — this standard is designed for independent implementation.

Protocol dashboard: [xxxiii.io](https://xxxiii.io)
Reference implementation: [github.com/FTHTrading/LPS-1-Reference-Implementation](https://github.com/FTHTrading/LPS-1-Reference-Implementation)
Research paper: [DOI 10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)

---

## 5. Profile Updates

> Update these on your LinkedIn profile before or immediately after the launch post.

### Headline

```
Protocol Author — LPS-1 Open Provenance Standard | Polygon Mainnet | xxxiii.io
```

### About Section (First 3 Lines — Visible Before "See More")

```
Author of LPS-1, an open standard for deterministic literary provenance deployed on Polygon Mainnet. 7 verified contracts. 293 tests. MIT licensed.

Currently seeking external implementors, security auditors, and institutional partners for the first open standard that lets authors cryptographically prove authorship without intermediaries.
```

### Full About Section

```
Author of LPS-1 (Literary Publishing Standard), an open protocol for deterministic digital provenance deployed on Polygon Mainnet.

LPS-1 uses SHA-256 hashing, Merkle tree commitments, and on-chain anchoring to provide cryptographic proof-of-origin for digital manuscripts. The protocol is fully specified (RFC-style, 14 sections), fully deployed (7 verified contracts), fully tested (293 tests), and fully open (MIT license).

What's live today:
• 7 smart contracts on Polygon Mainnet (all source-verified)
• 2 literary works frozen on-chain with signed Merkle roots
• Level 5 compliance (highest tier)
• Live verification dashboard at xxxiii.io
• Published research paper (DOI-indexed)
• Zero upgradeability — no admin keys, no proxy patterns

The protocol is infrastructure, not a product. It is designed for independent implementation by anyone — authors, publishers, libraries, archives.

Currently focused on:
• Independent security audit
• TypeScript SDK for third-party integration
• External implementor onboarding
• Polygon ecosystem grant application

Protocol: xxxiii.io
Code: github.com/FTHTrading/LPS-1-Reference-Implementation
Paper: doi.org/10.5281/zenodo.18646886
```

### Featured Section

Add these as Featured items on your LinkedIn profile:

1. **xxxiii.io** — "LPS-1 Protocol Dashboard — Live on Polygon Mainnet"
2. **GitHub Repo** — "LPS-1 Reference Implementation — MIT Licensed"
3. **Research Paper** — "DOI 10.5281/zenodo.18646886 — Open Access"

---

## 6. Hashtag Strategy

### Primary (Always Include)
```
#Polygon #OpenSource #DigitalProvenance #SmartContracts #Web3
```

### Secondary (Rotate Based on Post Focus)
```
#Blockchain #Cryptography #PublicGoods #OpenStandards #LiteraryTechnology
#EVM #Solidity #MerkleTrees #IPFS #AuthorshipVerification
```

### Contextual (Use When Relevant)
```
#AI #GenerativeAI #ContentAuthenticity #DigitalHumanities
#Publishing #Authors #Copyright #IntellectualProperty
#PolygonMainnet #DeFi #Infrastructure #DevRel
```

---

## 7. Engagement Response Templates

> Pre-written replies for likely questions/comments. Adapt as needed.

### "How is this different from just timestamping a document?"

Timestamping proves a file existed at a point in time. LPS-1 goes further: it hashes content at word, paragraph, and chapter level, constructs Merkle trees per content type, anchors the roots on-chain, binds authorship via ECDSA identity, and enforces a forward-only lifecycle where frozen editions cannot be modified. It's a full provenance stack, not a single hash.

### "Why not use Ethereum mainnet?"

It's documented in ADR-0006. Polygon provides sub-cent transaction costs (the entire 7-contract deployment cost under $2.50), ~2 second finality, and Polygonscan verification — all critical for a standard designed to be accessible to individual authors. Phase III of the roadmap adds an Ethereum L1 mirror for settlement-layer finality.

### "What about NFTs? Is this just another NFT project?"

No. LPS-1 is provenance infrastructure. The ERC-721 contracts (EditionNFT, StoryNFT) represent collectible editions of literary works — they are not securities, carry no governance rights, and are not the protocol's primary function. The core protocol is about hashing, Merkle commitments, and on-chain anchoring. The NFTs are one application layer.

### "How does this help with AI-generated content?"

LPS-1 doesn't detect AI. It provides timestamped, deterministic provenance chains. If an author anchors their manuscript before publication, the on-chain record proves the work existed in exactly that form at that time. This creates a verifiable authorship trail that predates any subsequent AI reproduction.

### "Who is using this?"

One production implementation (XXXIII, Level 5 compliance) with two anchored literary works. The conformance registry is open for external implementors at any compliance level. Level 0 requires only a single SHA-256 anchor — minimal barrier to entry.

### "Is this open source?"

Fully. All contracts, build tools, and verification scripts are MIT licensed. The specification and research paper are CC BY 4.0. The reference implementation repository is public. No permission required to implement.

### "What's the business model?"

There isn't one in the traditional sense. LPS-1 is public goods infrastructure. It's designed to be used, verified, and implemented by anyone without payment or platform dependency. Funding is sought through ecosystem grants (Polygon, Protocol Labs, academic foundations) to support security audits, SDK development, and multi-implementor adoption.

---

## 8. Posting Schedule

| Day | Action | Content |
|-----|--------|---------|
| Day 0 | Primary launch post | Section 1 (main post) |
| Day 0 +15 min | Comment: Technical stack | Section 3, Comment 1 |
| Day 0 +30 min | Comment: Non-upgradeable | Section 3, Comment 2 |
| Day 0 +45 min | Comment: AI problem | Section 3, Comment 3 |
| Day 0 +60 min | Comment: Call to implementors | Section 3, Comment 4 |
| Day 1 | Update profile | Section 5 (headline, about, featured) |
| Day 2 | Publish LinkedIn Article | Section 4 (long-form article) |
| Day 3 | Short repost | Section 2 (short version) |
| Day 7 | Follow-up post | Metrics update, community response |

---

## 9. Direct Outreach Template

> For sending to specific people via LinkedIn DM. Keep it under 300 characters for InMail or standard messages.

### To Polygon Ecosystem / DevRel

```
Hi [Name] — I've deployed an open provenance standard (LPS-1) on Polygon Mainnet. 7 verified contracts, 293 tests, MIT licensed. Live dashboard at xxxiii.io. Looking at Polygon ecosystem grants for security audit and SDK development. Happy to share details.
```

### To Security Auditors

```
Hi [Name] — I have 7 non-upgradeable smart contracts (Solidity 0.8.19, OpenZeppelin) deployed on Polygon Mainnet for a literary provenance protocol. Seeking an independent security audit. All contracts are source-verified on Polygonscan. Details at xxxiii.io.
```

### To Academic / Digital Humanities

```
Hi [Name] — I've published an open standard for cryptographic proof-of-authorship for digital manuscripts. RFC-style spec, DOI-indexed research paper, deployed on Polygon. Could be relevant for digital humanities / archival verification. Paper: doi.org/10.5281/zenodo.18646886
```

### To Web3 Builders / Developers

```
Hi [Name] — Built an open provenance standard for literary works on Polygon. 7 contracts, 293 tests, MIT licensed. Reference implementation is public. Looking for external implementors — Level 0 requires just a single SHA-256 anchor. Repo: github.com/FTHTrading/LPS-1-Reference-Implementation
```

---

## 10. Content Do's and Don'ts

### Do
- Lead with what is deployed, not what is planned
- Use specific numbers (7 contracts, 293 tests, $2.50 deployment)
- Frame as infrastructure/standard, not product/startup
- Reference the live dashboard — it's your strongest proof point
- Keep tone institutional — you're announcing a standard, not pitching a startup

### Don't
- Use "revolutionary," "groundbreaking," "game-changing," or similar
- Lead with the literary works — lead with the protocol
- Describe it as a "project" — it's a standard
- Mention token prices, financial returns, or speculative value
- Over-explain blockchain basics to a technical audience
- Use poetic or emotional language — specification tone throughout
