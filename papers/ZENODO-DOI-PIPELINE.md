# Zenodo → DOI Pipeline

## Status: ✅ COMPLETE

| Step | Status | Date |
|------|--------|------|
| 1. Connect GitHub to Zenodo | ✅ Done | Feb 15, 2026 |
| 2. Create GitHub Release | ✅ v1.0-paper + v1.1-paper | Feb 15, 2026 |
| 3. Zenodo Archive | ✅ Archived | Feb 15, 2026 |
| 4. DOI Minted | ✅ 10.5281/zenodo.18646886 | Feb 15, 2026 |
| 5. Update all files with DOI | ✅ Paper, CITATION.cff, README, SSRN, ResearchGate | Feb 15, 2026 |
| 6. Verify Indexing | ⏳ Check in 1-2 weeks | — |

**DOI:** [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)
**Zenodo Record:** https://zenodo.org/records/18646886
**v1.0-paper Release:** https://github.com/FTHTrading/2500-donkeys/releases/tag/v1.0-paper
**v1.1-paper Release:** https://github.com/FTHTrading/2500-donkeys/releases/tag/v1.1-paper

---

## Reference: Step-by-Step

### Prerequisites
- GitHub account (FTHTrading)
- Zenodo account (create at https://zenodo.org — use GitHub OAuth)

---

### Step 1: Connect GitHub to Zenodo

1. Go to https://zenodo.org
2. Log in with GitHub
3. Go to https://zenodo.org/account/settings/github/
4. Find `FTHTrading/2500-donkeys` in the list
5. Toggle the switch to **ON**

This tells Zenodo: "Watch this repo. When a release is created, archive it and mint a DOI."

---

### Step 2: Create a GitHub Release

The release has already been tagged. Go to:

https://github.com/FTHTrading/2500-donkeys/releases

Click "Draft a new release" (or it may already be there from the tag).

**Release details:**
- **Tag:** `v1.0-paper`
- **Title:** `v1.0 — Deterministic Literary Publishing (Academic Paper)`
- **Description:**

```
## Deterministic Literary Publishing v1.0

Academic paper and reference implementation for the Literary Protocol Standard (LPS-1).

### What's Included
- 📄 Academic paper: `papers/deterministic-literary-publishing.md`
- 📋 Citation file: `CITATION.cff`
- 🔬 Zenodo metadata: `.zenodo.json`
- 📐 Full LPS-1 specification: `LPS-1.md`
- 🔗 5 deployed smart contracts (source-verified on Polygonscan)
- 🌳 4-tree Merkle architecture with 56 anchored content components
- ✅ 146 automated tests, 0 failures
- 📖 75,000-word reference manuscript

### On-Chain Verification
All contract addresses and transaction hashes are listed in the paper's Appendix A.
Primary contract: [PublishingKernelV2](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code)

### Cite This Work
See `CITATION.cff` or Appendix C of the paper.
```

---

### Step 3: Wait for Zenodo to Archive

After publishing the release:
- Zenodo automatically detects the release
- Archives the repository snapshot
- Mints a DOI
- Usually takes 5-30 minutes

---

### Step 4: Get Your DOI

1. Go to https://zenodo.org/account/settings/github/
2. Find the archived release
3. Copy the DOI (format: `10.5281/zenodo.XXXXXXX`)

---

### Step 5: Update Everything with DOI ✅

All files updated with DOI `10.5281/zenodo.18646886`:

1. ✅ **Paper front matter** — `doi: "10.5281/zenodo.18646886"`
2. ✅ **CITATION.cff** — `doi:` field + `identifiers:` block
3. ✅ **BibTeX in paper** — `doi = {10.5281/zenodo.18646886}`
4. ✅ **SSRN submission** — DOI in abstract and related links section
5. ✅ **ResearchGate** — DOI in publication entry and links
6. ✅ **xxxiii.io** — "Cite This Work" section with DOI, BibTeX, APA
7. ✅ **README.md** — Zenodo DOI badge

Then commit + push + create `v1.0.1-paper` release with DOI in place.

---

### Step 6: Verify Indexing

After 1-2 weeks, check:
- https://scholar.google.com — Search for paper title
- https://search.crossref.org — Search for DOI
- https://zenodo.org/records/XXXXXXX — Zenodo landing page

---

## Zenodo Badge (for README)

After DOI is minted, add to README.md:

```markdown
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX)
```

---

## Important Notes

- Zenodo archives are **permanent**. Once minted, the DOI never expires.
- Each new GitHub release creates a new DOI version.
- Zenodo provides both a version-specific DOI and a concept DOI (resolves to latest).
- The `.zenodo.json` file controls metadata — title, abstract, keywords, license.
- `CITATION.cff` is recognized natively by GitHub (shows "Cite this repository" button).
