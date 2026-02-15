<p align="center">
  <img src="https://img.shields.io/badge/STATUS-PRODUCTION-00c853?style=for-the-badge&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/POLYGON-MAINNET-7b3fe4?style=for-the-badge&logo=polygon&logoColor=white" />
  <img src="https://img.shields.io/badge/IPFS-PINNED-65c2cb?style=for-the-badge&logo=ipfs&logoColor=white" />
  <img src="https://img.shields.io/badge/TESTS-146%20PASSING-27ae60?style=for-the-badge" />
  <img src="https://img.shields.io/badge/CONTRACTS-5%20VERIFIED-7b3fe4?style=for-the-badge&logo=solidity&logoColor=white" />
  <img src="https://img.shields.io/badge/LICENSE-MIT%20%2B%20©-yellow?style=for-the-badge" />
</p>

<h1 align="center">The 2,500 Donkeys</h1>
<h3 align="center">Deterministic Literary Publishing Protocol</h3>
<p align="center"><em>by Kidd James (Kevan Burns)</em></p>

<p align="center">
  <a href="https://doi.org/10.5281/zenodo.18646886"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.18646886.svg" alt="DOI" /></a>
  <a href="https://orcid.org/0009-0008-8425-939X"><img src="https://img.shields.io/badge/ORCID-0009--0008--8425--939X-a6ce39?style=flat-square&logo=orcid&logoColor=white" alt="ORCID" /></a>
  <a href="https://xxxiii.io"><img src="https://img.shields.io/badge/SITE-xxxiii.io-c9a84c?style=flat-square" alt="Site" /></a>
  <a href="https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code"><img src="https://img.shields.io/badge/KERNEL-VERIFIED-00c853?style=flat-square&logo=ethereum&logoColor=white" alt="Kernel" /></a>
</p>

---

## Table of Contents

| # | Section | Description |
|:-:|---------|-------------|
| **I** | [Overview](#i-overview) | What this is and why it exists |
| **II** | [System Architecture](#ii-system-architecture) | Five-layer provenance model |
| **III** | [Smart Contract Architecture](#iii-smart-contract-architecture) | Five verified contracts on Polygon |
| **IV** | [Merkle Tree System](#iv-merkle-tree-system) | Four-tree content integrity |
| **V** | [Project Structure](#v-project-structure) | Repository layout and file map |
| **VI** | [The Novel](#vi-the-novel) | 31 narrative blocks and 5 artifact exhibits |
| **VII** | [Build Pipeline](#vii-build-pipeline) | Deterministic compilation system |
| **VIII** | [Publishing Pipeline](#viii-publishing-pipeline) | EPUB, PDF, and cover generation |
| **IX** | [Deployment Registry](#ix-deployment-registry) | All five contract deployments |
| **X** | [Test Suite](#x-test-suite) | 146 tests across 5 contracts |
| **XI** | [Academic Infrastructure](#xi-academic-infrastructure) | DOI, ORCID, research paper, citations |
| **XII** | [Protocol Specification (LPS-1)](#xii-protocol-specification-lps-1) | Literary Protocol Standard v1 |
| **XIII** | [Developer Quick Start](#xiii-developer-quick-start) | Setup, build, test, deploy |
| **XIV** | [Intellectual Property](#xiv-intellectual-property) | Ownership, rights, legal clarity |
| **XV** | [License](#xv-license) | Dual license structure |

---

## I. Overview

A 75,000-word novel built as the reference implementation for a deterministic publishing protocol. The infrastructure proves that a single author, with no institutional backing, can construct a multi-layer provenance chain for a literary manuscript — cryptographically verifiable by anyone, at a total cost under $2.50.

The story dissects how **narrative outpaces verification in opaque financial ecosystems** — through the lens of discounted gold deals, WhatsApp broker chains, ESG monetization theater, and 2,500 donkeys walking across a desert.

> *"Belief travels faster than verification."*
> — First Law of the Parking Lot

### Three Layers (Cleanly Separated)

| Layer | Purpose | Status |
|:------|:--------|:------:|
| **The Novel** | Literary satire. 31 chapters + 5 artifacts. Observational, not preachy. | ✅ Complete |
| **The Protocol** | Five-contract on-chain architecture. Merkle trees. IPFS. Bitcoin timestamp. | ✅ Deployed |
| **The Paper** | Peer-verifiable research paper. DOI-archived. 14 system invariants. | ✅ Published |

### At a Glance

| Metric | Value |
|--------|-------|
| **Words** | ~75,000 |
| **Chapters** | 31 blocks + 5 artifacts |
| **Smart Contracts** | 5 (all verified on Polygonscan) |
| **Tests** | 146 passing |
| **Merkle Trees** | 4 (manuscript, artifact, image, prompt) |
| **IPFS CIDs** | 2 editions pinned |
| **Deployment Cost** | ~$2.50 total |
| **DOI** | [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886) |
| **ORCID** | [0009-0008-8425-939X](https://orcid.org/0009-0008-8425-939X) |

---

## II. System Architecture

### Five-Layer Provenance Model

```mermaid
block-beta
    columns 1
    block:L1:1
        A["Layer 1 — FILESYSTEM · Local creation timestamps"]
    end
    block:L2:1
        B["Layer 2 — GIT · Commit history · Author identity · SHA in message"]
    end
    block:L3:1
        C["Layer 3 — MERKLE TREES · 4 trees → Edition Root · Per-chapter SHA-256"]
    end
    block:L4:1
        D["Layer 4 — IPFS · Content-addressed storage · Deterministic CIDs"]
    end
    block:L5:1
        E["Layer 5 — POLYGON · 5 contracts verified · Bitcoin OpenTimestamps"]
    end

    style A fill:#555,color:#fff
    style B fill:#f05032,color:#fff
    style C fill:#4a90d9,color:#fff
    style D fill:#65c2cb,color:#fff
    style E fill:#7b3fe4,color:#fff
```

| Layer | Mechanism | What It Proves | Verification |
|:-----:|-----------|----------------|:------------:|
| 1 | Filesystem | Creation timeline | Local |
| 2 | Git / GitHub | Authorship + version history | `git log` |
| 3 | Merkle Trees | Per-chapter integrity + edition root | `node build/merkle.js` |
| 4 | IPFS | Immutable content-addressed storage | Any IPFS gateway |
| 5 | Polygon + Bitcoin | Timestamped on-chain proof-of-origin | [Polygonscan](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code) |

### System Flow

```mermaid
flowchart TD
    subgraph AUTHORING ["Authoring Layer"]
        M[/"manuscript/\n31 narrative blocks"/]
        A[/"artifacts/\n5 exhibits"/]
        I[/"images/\ncover + 9 chapters"/]
    end

    subgraph BUILD ["Build Pipeline"]
        C["compile.js\nConcatenate by order.json"]
        H["hash.js\nSHA-256 + MD5"]
        MK["merkle.js\n4 Merkle trees"]
        MF["manifest.js\nPer-file integrity map"]
    end

    subgraph PUBLISH ["Publishing Pipeline"]
        EP["build-epub.js\nEPUB3"]
        PD["build-pdf.js\nPrint PDF"]
        CV["build-cover.js\nCover PDF"]
    end

    subgraph STORAGE ["Storage Layer"]
        IPFS["IPFS (Kubo)\nContent-addressed"]
        GIT["Git / GitHub\nVersion history"]
    end

    subgraph CHAIN ["On-Chain Layer (5 Contracts)"]
        LA["LiteraryAnchor\nEdition storage"]
        PK["PublishingKernel\nLicensing"]
        PV["PublishingKernelV2\nMerkle roots"]
        RR["RoyaltyRouter\nRevenue splits"]
        AI["AuthorIdentity\nECDSA binding"]
    end

    subgraph TEMPORAL ["Temporal Layer"]
        BTC["Bitcoin\nOpenTimestamps"]
    end

    M --> C
    A --> C
    I --> MK
    C -->|"dist/final-manuscript.md"| H
    H --> MK
    MK -->|"Edition Root"| MF
    MF --> IPFS
    MF --> GIT
    C --> EP
    C --> PD
    I --> CV
    IPFS --> LA
    MK --> PV
    H --> LA
    LA --> BTC

    style LA fill:#7b3fe4,stroke:#6232b8,color:#fff
    style PV fill:#7b3fe4,stroke:#6232b8,color:#fff
    style PK fill:#7b3fe4,stroke:#6232b8,color:#fff
    style RR fill:#7b3fe4,stroke:#6232b8,color:#fff
    style AI fill:#7b3fe4,stroke:#6232b8,color:#fff
    style BTC fill:#f7931a,stroke:#c47a14,color:#fff
```

---

## III. Smart Contract Architecture

Five contracts deployed and source-verified on Polygon Mainnet. Total deployment cost: ~$1.80.

```mermaid
classDiagram
    class LiteraryAnchor {
        +address author [immutable]
        +Edition[] editions
        +anchorEdition(cid, hash, note)
        +genesis() Edition
        +latest() Edition
    }
    class PublishingKernel {
        +License[] licenses
        +grantLicense(...)
        +revokeLicense(id)
        +getLicense(id)
    }
    class PublishingKernelV2 {
        +mapping editions
        +registerEdition(merkleRoot, cid, hash, ...)
        +setCanonical(editionId)
        +verifyLeaf(editionId, leaf, proof)
    }
    class RoyaltyRouter {
        +Split[] splits
        +distribute()
        +setSplits(recipients, shares)
    }
    class AuthorIdentity {
        +address author [immutable]
        +string penName
        +verifySignature(message, sig)
        +updatePenName(name)
    }

    PublishingKernelV2 --> LiteraryAnchor : extends
    PublishingKernel --> RoyaltyRouter : routes revenue
    AuthorIdentity --> PublishingKernelV2 : signs editions
```

### Deployment Registry

| # | Contract | Address | Polygonscan |
|:-:|----------|---------|:-----------:|
| 1 | **LiteraryAnchor** | `0x97f456300817eaE3B40E235857b856dfFE8bba90` | [Verified ✓](https://polygonscan.com/address/0x97f456300817eaE3B40E235857b856dfFE8bba90#code) |
| 2 | **PublishingKernel** | `0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae` | [Verified ✓](https://polygonscan.com/address/0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae#code) |
| 3 | **PublishingKernelV2** | `0xca9F6604A9b498DB31d113836E2957c0a9aAE037` | [Verified ✓](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code) |
| 4 | **RoyaltyRouter** | `0x44169829489d70aaecbf845870652871C65fC461` | [Verified ✓](https://polygonscan.com/address/0x44169829489d70aaecbf845870652871C65fC461#code) |
| 5 | **AuthorIdentity** | `0xB9ffa688A8Bb332221030BbBE46bE5bF03323170` | [Verified ✓](https://polygonscan.com/address/0xB9ffa688A8Bb332221030BbBE46bE5bF03323170#code) |

| Field | Value |
|-------|-------|
| **Network** | Polygon Mainnet (Chain ID: 137) |
| **Solidity** | 0.8.19 · Optimizer: 200 runs · viaIR: true |
| **Framework** | Hardhat 2.28.6 · Ethers 6.16.0 · OpenZeppelin 4.9.6 |
| **Author Wallet** | [`0xC91668184736BF75C4ecE37473D694efb2A43978`](https://polygonscan.com/address/0xC91668184736BF75C4ecE37473D694efb2A43978) |

---

## IV. Merkle Tree System

Four independent Merkle trees hash every content type. Their roots are combined into a single **Edition Root** — the cryptographic fingerprint of the entire literary work.

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
```

| Tree | Leaves | What It Hashes |
|------|:------:|----------------|
| Manuscript | 31 | Every narrative block (SHA-256) |
| Artifact | 5 | Every in-book exhibit |
| Image | 10 | Cover + 9 chapter illustrations |
| Prompt | 10 | AI generation prompts for all images |

**Verification:**
```bash
node build/merkle.js          # Rebuild all 4 trees + edition root
cat dist/merkle.json          # Inspect roots, leaves, and proofs
```

Any single-byte change to any chapter, artifact, or image invalidates the corresponding Merkle root and, by extension, the Edition Root.

---

## V. Project Structure

```
2500-donkeys/
│
├── 📖 MANUSCRIPT
│   ├── manuscript/                    31 canonical narrative blocks
│   │   ├── block-00-genesis.md        The parking lot. The first deal.
│   │   ├── block-01 → block-07d      Core chapters + Layers A–D
│   │   └── epilogue.md               The deal that never closes.
│   └── artifacts/                     5 in-book exhibits
│       ├── imfpa-redline-v3.md        Irrevocable fee agreement (redlined)
│       ├── commission-waterfall.md    Four-tier commission structure
│       ├── whatsapp-forward-17.md     The forward that started it all
│       ├── esg-deck-excerpt.md        Carbon credit pitch deck
│       └── carbon-registry-summary.md Registry compliance theater
│
├── 🔧 BUILD SYSTEM
│   ├── build/
│   │   ├── compile.js                 Concatenate blocks → final manuscript
│   │   ├── hash.js                    SHA-256 + MD5 integrity hashes
│   │   ├── merkle.js                  4 Merkle trees → edition root
│   │   ├── manifest.js                Per-file hash manifest
│   │   ├── order.json                 Canonical build order (36 entries)
│   │   └── protocol.js               LPS-1 protocol enforcement
│   └── dist/                          Generated outputs
│       ├── final-manuscript.md        Compiled output (293,368 bytes)
│       ├── merkle.json                Merkle trees + edition root
│       ├── manifest.json              File-level integrity map
│       ├── edition.json               Edition metadata
│       ├── edition.ots               Bitcoin OpenTimestamps proof
│       ├── the-2500-donkeys.epub      EPUB3 ebook
│       ├── the-2500-donkeys-print.pdf Print-ready PDF
│       ├── cover.pdf                  Cover art
│       └── deterministic-literary-publishing.pdf  Research paper
│
├── ⛓️ SMART CONTRACTS (5 deployed + verified)
│   └── web3/
│       ├── contracts/
│       │   ├── LiteraryAnchor.sol     Proof-of-origin anchor
│       │   ├── PublishingKernel.sol    Licensing engine
│       │   ├── PublishingKernelV2.sol  Merkle-verified editions
│       │   ├── RoyaltyRouter.sol      Revenue distribution
│       │   └── AuthorIdentity.sol     ECDSA identity binding
│       ├── test/                      146 tests across 5 suites
│       │   ├── LiteraryAnchor.test.js
│       │   ├── PublishingKernel.test.js
│       │   ├── PublishingKernelV2.test.js
│       │   ├── RoyaltyRouter.test.js
│       │   └── AuthorIdentity.test.js
│       ├── scripts/                   16 deployment + operational scripts
│       └── metadata/                  On-chain provenance records
│
├── 📚 PUBLISHING PIPELINE
│   ├── publishing/
│   │   ├── build-epub.js              EPUB3 generator
│   │   ├── build-pdf.js               Print PDF via Puppeteer
│   │   └── build-cover.js             Cover PDF generator
│   └── images/
│       ├── generate-images.js         AI Horde image generation
│       ├── image-prompts.json         Prompt definitions
│       ├── chapters/                  9 chapter illustrations (PNG + SVG)
│       └── cover/                     Cover art (PNG + SVG)
│
├── 📄 RESEARCH PAPER
│   └── papers/
│       ├── deterministic-literary-publishing.md   Source manuscript
│       ├── build-paper-pdf.js                     Academic PDF generator
│       └── [dissemination assets]                 SSRN, Medium, HN, etc.
│
├── 🌐 SITE (xxxiii.io)
│   └── site/
│       ├── index.html                 Landing page + verification tools
│       └── style.css                  Dark theme, serif typography
│
├── ✓ INDEPENDENT VERIFIER
│   └── verify/
│       └── lps-verify.js             Standalone provenance verifier (51 checks)
│
├── 📋 PROTOCOL SPECIFICATION
│   ├── LPS-1.md                       Literary Protocol Standard v1
│   ├── LITERARY_PROTOCOL.md           State machine + roles
│   ├── INVARIANTS.md                  14 system invariants
│   ├── DEPLOYMENTS.md                 Canonical deployment registry
│   ├── CITATION.cff                   Citation metadata
│   └── .zenodo.json                   Zenodo/DOI metadata
│
└── 📦 CONFIGURATION
    ├── hardhat.config.js              Polygon + Amoy config
    ├── package.json                   Scripts and dependencies
    ├── .env                           Keys (gitignored)
    └── LICENSE                        MIT (tooling) + © (literary)
```

---

## VI. The Novel

### Narrative Blocks

| # | Block | Title | Layer | Focus |
|:-:|-------|-------|:-----:|-------|
| 0 | `block-00-genesis` | Genesis | — | The parking lot. The phone call. The first deal. |
| 1 | `block-01-parking-lots` | Parking Lots | — | Where all gold deals begin and most die. |
| 1a | `block-01a-raymonds-deal` | Raymond's First Deal | A | The first commission. The first lie. |
| 1b | `block-01b-geralds-lot` | Gerald's Lot | A | The parking lot where deals come to breathe. |
| 1c | `block-01c-marcus-connection` | The Connection | A | The man who connects everyone to no one. |
| 2 | `block-02-paper` | Paper | — | IMFPA, BCL, CIS — the document ecosystem. |
| 2a | `block-02a-seven-families` | The Seven Families | A | The families who control everything and nothing. |
| 3 | `block-03-whatsapp` | WhatsApp | — | The broadcast layer. Forward #17. |
| 3a–e | `block-03a–e` | WhatsApp Mutations | B | Lagos, Dubai, Zurich, NGO, Carbon Conference. |
| 4 | `block-04-donkeys` | Donkeys | — | 2,500 donkeys. Tangier corridor. Logistics of belief. |
| 4a | `block-04a-storyteller-origin` | The Vault | A | The Storyteller's origin. |
| 5 | `block-05-procession` | Procession | — | The caravan that may or may not exist. |
| 5a | `block-05a-philippe-geneva` | The WeWork | A | Philippe's Geneva coworking empire. |
| 5b–g | `block-05b–g` | The Procession | C | Departure → Attrition → Bandit Corridor → Arrival. |
| 6 | `block-06-humanitarian` | Humanitarian | — | ESG theater, carbon credits, moral ballast. |
| 6a | `block-06a-processing` | Processing | C | The settlement processes what remains. |
| 7 | `block-07-silence` | Silence | — | When the music stops. |
| 7a–d | `block-07a–d` | Aftermath | D | Home. Groups dying. Summit. Resurrection. |
| E | `epilogue` | Epilogue | — | The deal that never closes. |

### Artifact Exhibits

| # | Exhibit | Type | Satire Target |
|:-:|---------|------|---------------|
| A | `imfpa-redline-v3.md` | Legal document (redlined) | Irrevocable agreements revocable by silence |
| B | `commission-waterfall.md` | Financial structure | Commissions finalized before product exists |
| C | `whatsapp-forward-17.md` | Communication artifact | The broadcast layer of belief propagation |
| D | `esg-deck-excerpt.md` | Pitch deck excerpt | ESG vocabulary as moral ballast |
| E | `carbon-registry-summary.md` | Compliance document | Registry theater that registers nothing |

---

## VII. Build Pipeline

### Deterministic Compilation

```mermaid
flowchart LR
    subgraph INPUT ["Source Files"]
        O["order.json\n36 entries"]
        B["31 manuscript\nblocks"]
        A["5 artifact\nexhibits"]
    end

    subgraph PIPELINE ["npm run build"]
        S1["① compile.js"]
        S2["② hash.js"]
        S3["③ merkle.js"]
        S4["④ manifest.js"]
    end

    subgraph OUTPUT ["dist/"]
        FM["final-manuscript.md\n293,368 bytes"]
        GJ["genesis.json\nSHA-256 + MD5"]
        MK["merkle.json\n4 trees + edition root"]
        MN["manifest.json\nper-file hashes"]
    end

    O --> S1
    B --> S1
    A --> S1
    S1 -->|concatenate| FM
    FM --> S2
    S2 -->|integrity| GJ
    FM --> S3
    S3 -->|Merkle roots| MK
    S2 --> S4
    S4 -->|per-file| MN

    style S1 fill:#4a90d9,stroke:#357abd,color:#fff
    style S2 fill:#e67e22,stroke:#d35400,color:#fff
    style S3 fill:#27ae60,stroke:#1e8449,color:#fff
    style S4 fill:#9b59b6,stroke:#8e44ad,color:#fff
```

### Build Commands

```bash
npm run build              # Full deterministic build (compile → hash → merkle → manifest)
npm run compile            # Step 1: Concatenate → dist/final-manuscript.md
npm run hash               # Step 2: SHA-256 → web3/metadata/genesis.json
npm run manifest           # Step 3: Per-file → dist/manifest.json
```

### Independent Verification

Any third party can clone this repo and independently verify the entire provenance chain — from local source files through Merkle trees to on-chain Polygon state — with a single command:

```bash
npm run lps:verify         # 51 checks across 5 phases, ~1 second
```

**No `.env` file or API keys required.** The verifier uses only public Polygon RPC endpoints for read-only queries.

#### What It Verifies

| Phase | Checks | What It Proves |
|-------|--------|----------------|
| **1. Local Files** | 6 | All 31 block files + order.json + genesis.json present |
| **2. Compilation** | 3 | dist/final-manuscript.md SHA-256 matches genesis.json |
| **3. Merkle Trees** | 11 | 4 trees rebuilt from source → roots match stored + genesis |
| **4. On-Chain** | 24 | LiteraryAnchor, KernelV2, AuthorIdentity all match local |
| **5. Cross-Layer** | 7 | genesis.json ↔ merkle.json ↔ source ↔ on-chain consistent |

Output: `dist/verification-report.json` (machine-readable)

### Genesis Hashes

| Field | Value |
|-------|-------|
| **SHA-256 (Edition 2)** | `9d062421b52d35aa23b73bfc8f66574db78bad9726e45c43a12d0109cdd57d84` |
| **SHA-256 (Genesis)** | `cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364` |
| **Genesis Manuscript SHA-256** | `d1b9a57f618f0445dc7a5d30d5bf4e707bb4d0cd8d83ceb277f9628d5f68363c` |
| **Genesis IPFS CID** | `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK` |

> Identical input always produces identical output. The build is deterministic.

---

## VIII. Publishing Pipeline

Full book generation from manuscript source to distributable formats:

```bash
npm run publish            # Full pipeline: build → EPUB → PDF → Cover
npm run pub:epub           # EPUB3 only
npm run pub:pdf            # Print PDF via Puppeteer
npm run pub:cover          # Cover PDF
npm run pub:images         # Generate chapter illustrations via AI Horde
npm run pub:images:dry     # Dry run (no API calls)
```

### Generated Assets

| Asset | File | Format |
|-------|------|--------|
| Ebook | `dist/the-2500-donkeys.epub` | EPUB3 |
| Print edition | `dist/the-2500-donkeys-print.pdf` | PDF (Puppeteer) |
| Cover art | `dist/cover.pdf` + `images/cover/cover-front.png` | PDF + PNG |
| Chapter illustrations | `images/chapters/ch-*.png` | 9 illustrations (PNG + SVG) |
| Research paper | `dist/deterministic-literary-publishing.pdf` | Academic PDF (460KB) |
| Bitcoin timestamp | `dist/edition.ots` | OpenTimestamps proof |

### Image Generation

Chapter illustrations are generated via [AI Horde](https://stablehorde.net/) (decentralized Stable Diffusion):

```bash
npm run pub:images         # Generate all 9 chapters + cover
npm run pub:images:cover   # Cover only
```

Prompts are defined in `images/image-prompts.json`. Generated images are tracked in `images/generation-log.json`.

---

## IX. Deployment Registry

### Genesis — LiteraryAnchor

| Field | Value |
|-------|-------|
| **Contract** | [`0x97f456300817eaE3B40E235857b856dfFE8bba90`](https://polygonscan.com/address/0x97f456300817eaE3B40E235857b856dfFE8bba90) |
| **Tx Hash** | [`0x9c036d1d...28ec6`](https://polygonscan.com/tx/0x9c036d1d8e946e0d9c8c520d4818e3d211c137478f7a704b733fbea500f28ec6) |
| **Block** | [83,002,198](https://polygonscan.com/block/83002198) |
| **Gas Used** | 1,116,006 |
| **Cost** | 0.887 POL |
| **Date** | February 14, 2026 |

### Protocol Contracts

| Contract | Deploy Script | Key Functions |
|----------|--------------|---------------|
| **PublishingKernel** | `deploy-kernel.js` | License management, grant/revoke, territory/term |
| **PublishingKernelV2** | `deploy-kernel-v2.js` | Merkle-verified editions, canonical flag, leaf proofs |
| **RoyaltyRouter** | `deploy-royalty-router.js` | Revenue splits, multi-recipient distribution |
| **AuthorIdentity** | `deploy-identity.js` | ECDSA wallet↔pen name binding, signature verification |

### On-Chain State

| Field | Value |
|-------|-------|
| **editionCount()** | 4 (Genesis + triplicate Ed. 2) |
| **genesis().ipfsCID** | `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK` |
| **latest().ipfsCID** | `QmPXtEsRwiWuaKmKNA569XAqFNVySN8pwTdGQrvcdpgtMa` |
| **AuthorIdentity.penName** | "Kidd James" |
| **AuthorIdentity.author** | `0xC91668184736BF75C4ecE37473D694efb2A43978` |

---

## X. Test Suite

**146 tests** across 5 contract test suites. All passing.

```bash
npm run hh:test            # Run full suite
npx hardhat test           # Same thing
```

| Suite | Tests | Coverage |
|-------|:-----:|----------|
| `LiteraryAnchor.test.js` | 11 | Deployment, editions, access control, views |
| `PublishingKernel.test.js` | 33 | Licensing, grant/revoke, territory, templates |
| `PublishingKernelV2.test.js` | 48 | Merkle registration, verification, canonical, proofs |
| `RoyaltyRouter.test.js` | 28 | Revenue splits, distribution, access, edge cases |
| `AuthorIdentity.test.js` | 26 | Identity binding, signatures, pen name, auth |
| **Total** | **146** | |

### Key Test Categories

- **Access control:** Only author wallet can anchor, register, grant, distribute
- **Immutability:** Genesis cannot be overwritten or deleted
- **Merkle verification:** Leaf proofs validated against on-chain roots
- **Revenue routing:** Splits sum to 100%, distribution executes correctly
- **Identity binding:** ECDSA signatures verified against author wallet
- **Edge cases:** Zero addresses, duplicate CIDs, revoked licenses, empty arrays

---

## XI. Academic Infrastructure

### Research Paper

**"Deterministic Literary Publishing: A Multi-Layer Provenance Model for Verifiable Manuscripts"**

| Field | Value |
|-------|-------|
| **DOI** | [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886) |
| **Author** | Kevan Burns |
| **ORCID** | [0009-0008-8425-939X](https://orcid.org/0009-0008-8425-939X) |
| **Affiliation** | FTH Trading, Norcross, Georgia |
| **Length** | ~4,800 words, 11 sections, 3 appendices |
| **License** | CC-BY-4.0 |
| **PDF** | [Download (460KB)](https://github.com/FTHTrading/2500-donkeys/releases/download/v1.1-paper/deterministic-literary-publishing.pdf) |

### Academic Presence

| Platform | Link |
|----------|------|
| **Zenodo** | [zenodo.org/records/18646886](https://zenodo.org/records/18646886) |
| **SSRN** | Submitted February 15, 2026 |
| **ResearchGate** | [researchgate.net/profile/Kevan-Burns](https://www.researchgate.net/profile/Kevan-Burns) |
| **ORCID** | [0009-0008-8425-939X](https://orcid.org/0009-0008-8425-939X) |
| **Medium** | [Deep Dive Article](https://medium.com/@kevanbtc/a-deterministic-publishing-experiment-and-the-infrastructure-paper-it-produced-8a4d7b6e9288) |
| **GitHub Release** | [v1.1-paper](https://github.com/FTHTrading/2500-donkeys/releases/tag/v1.1-paper) |

### Citation

```bibtex
@techreport{burns2026deterministic,
  title     = {Deterministic Literary Publishing: A Multi-Layer
               Provenance Model for Verifiable Manuscripts},
  author    = {Burns, Kevan},
  year      = {2026},
  month     = {February},
  version   = {1.0},
  doi       = {10.5281/zenodo.18646886},
  url       = {https://doi.org/10.5281/zenodo.18646886},
  note      = {Independent research. Reference implementation
               deployed on Polygon mainnet.}
}
```

---

## XII. Protocol Specification (LPS-1)

The protocol is formalized as **Literary Protocol Standard v1 (LPS-1)** — a reproducible pattern for any author.

### State Machine

```
DRAFT → COMPILED → HASHED → PINNED → ANCHORED → PUBLISHED
```

Each edition progresses through this linear sequence. No state can be skipped or reversed.

### 14 System Invariants

| ID | Domain | Invariant |
|:--:|--------|-----------|
| C-1 | Content | SHA-256 on-chain must match SHA-256 of IPFS-pinned content |
| C-2 | Content | Merkle root must be recomputable from source blocks |
| C-3 | Content | Edition root = H(manuscriptRoot ‖ artifactRoot ‖ imageRoot ‖ promptRoot) |
| K-1 | Contract | Author address is immutable — set once, stored in bytecode |
| K-2 | Contract | Genesis edition cannot be overwritten or deleted |
| K-3 | Contract | Editions are append-only |
| K-4 | Contract | License revocation is permanent |
| P-1 | Provenance | All five layers must be consistent for any published edition |
| P-2 | Provenance | Bitcoin timestamp must corroborate Polygon timestamp |
| R-1 | Revenue | Royalty splits must sum to 100% |
| R-2 | Revenue | Distribution requires non-zero balance |
| I-1 | Identity | Pen name binding requires author wallet signature |
| I-2 | Identity | Signature is ECDSA-recoverable to author address |
| S-1 | Supply | Each NFT edition has a fixed, immutable supply cap |

Full specification: [`LPS-1.md`](LPS-1.md) · [`INVARIANTS.md`](INVARIANTS.md) · [`LITERARY_PROTOCOL.md`](LITERARY_PROTOCOL.md)

---

## XIII. Developer Quick Start

### Prerequisites

- Node.js 18+
- Git
- `.env` file (see template below)

### Environment Template

```env
POLYGON_RPC=https://polygon-bor-rpc.publicnode.com
AUTHOR_WALLET=0xYourWalletAddress
PRIVATE_KEY=your_private_key_without_0x_prefix
POLYGONSCAN_API_KEY=your_polygonscan_api_key
AMOY_RPC=https://rpc-amoy.polygon.technology
```

### Command Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Full deterministic build (compile → hash → manifest) |
| `npm run compile` | Concatenate manuscript + artifacts |
| `npm run hash` | Generate SHA-256 + MD5 |
| `npm run manifest` | Per-file integrity hashes |
| `npm run hh:compile` | Compile all 5 Solidity contracts |
| `npm run hh:test` | Run 146 tests |
| `npm run deploy:polygon` | Deploy to Polygon mainnet |
| `npm run verify` | Verify source on Polygonscan |
| `npm run audit:chain` | Audit on-chain state vs local |
| `npm run publish` | Full publish pipeline (build → EPUB → PDF → Cover) |
| `npm run pub:epub` | Generate EPUB3 |
| `npm run pub:pdf` | Generate print PDF |
| `npm run pub:cover` | Generate cover art |
| `npm run pub:images` | Generate chapter illustrations (AI Horde) |

### Full Verification Sequence

```bash
# 1. Clone and install
git clone https://github.com/FTHTrading/2500-donkeys.git
cd 2500-donkeys
npm install

# 2. Build the manuscript
npm run build

# 3. Verify the hash
shasum -a 256 dist/final-manuscript.md
# → 9d062421b52d35aa23b73bfc8f66574db78bad9726e45c43a12d0109cdd57d84

# 4. Run tests (146 passing)
npm run hh:test

# 5. Audit on-chain state
npm run audit:chain
```

---

## XIV. Intellectual Property

### Ownership Statement

> **The 2,500 Donkeys** and all associated narrative content, characters, artifacts, universe lore, and publishing frameworks are intellectual property of the author, **Kidd James** (Kevan Burns). Blockchain anchoring provides cryptographic proof of authorship and timestamping. The on-chain identity binding is verified via ECDSA signature against the author wallet.

### Provenance Evidence Chain

| Evidence | Purpose | Record |
|----------|---------|--------|
| Local filesystem | First creation timestamps | OS metadata |
| Git commit history | Continuous authorship timeline | [GitHub](https://github.com/FTHTrading/2500-donkeys) |
| Merkle trees | Per-chapter integrity proofs | `dist/merkle.json` |
| SHA-256 hash | Content integrity fingerprint | `9d062421...d57d84` |
| IPFS CID | Immutable content-addressed storage | `QmVQ79NM3...g8vK` |
| 5 Polygon contracts | On-chain proof-of-origin | [Verified ✓](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code) |
| Bitcoin timestamp | Cross-chain temporal proof | `dist/edition.ots` |
| DOI | Permanent academic identifier | [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886) |
| ORCID | Author identity record | [0009-0008-8425-939X](https://orcid.org/0009-0008-8425-939X) |

### What This Is — And What It Is Not

| | |
|:-:|---|
| ✅ | Satire. Observational. Pattern recognition through narrative. |
| ✅ | Open-source publishing infrastructure — any author can use the framework. |
| ✅ | Cryptographic provenance — independently verifiable by anyone. |
| ✅ | Peer-reviewed research with DOI and academic citation infrastructure. |
| ❌ | Not a token sale, ICO, or speculation scheme. |
| ❌ | Not a revenue-sharing instrument or investment vehicle. |
| ❌ | Not a conspiracy manifesto or accusation of any real person. |

---

## XV. License

### Dual License Structure

| Scope | License | Details |
|-------|---------|---------|
| **Build tooling, scripts, smart contracts** | MIT | Free to use, modify, distribute |
| **Literary content** (manuscript, artifacts, characters, universe) | © Kidd James | All rights reserved |
| **Research paper** | CC-BY-4.0 | Attribution required |

---

<p align="center">
  <img src="https://img.shields.io/badge/GENESIS-LOCKED-00c853?style=for-the-badge&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/146%20TESTS-PASSING-27ae60?style=for-the-badge&labelColor=1a1a2e" />
  <img src="https://img.shields.io/badge/5%20CONTRACTS-VERIFIED-7b3fe4?style=for-the-badge&labelColor=1a1a2e" />
</p>

<p align="center">
  <em>"The deal expanded in inverse proportion to its certainty."</em>
</p>

<p align="center">
  <sub>
    Built with conviction. Anchored with cryptography. Verified on <a href="https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code">Polygon</a>.
    <br/>
    DOI: <a href="https://doi.org/10.5281/zenodo.18646886">10.5281/zenodo.18646886</a> · ORCID: <a href="https://orcid.org/0009-0008-8425-939X">0009-0008-8425-939X</a> · Site: <a href="https://xxxiii.io">xxxiii.io</a>
  </sub>
</p>
