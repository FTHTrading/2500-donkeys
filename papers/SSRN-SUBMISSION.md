# SSRN Submission Guide

## Submission Details

**Title:** Deterministic Literary Publishing: A Multi-Layer Provenance Model for Verifiable Manuscripts

**Author:** Kevan Burns

**Affiliation:** FTH Trading
**Position:** Founder-Architect & Chief Systems Engineer
**Location:** Norcross, Georgia, United States
**Email:** kevan.burns@fthtrading.com
**ORCID:** *(register at https://orcid.org/register — takes 2 minutes)*

---

## Post-Submission: Fix Affiliation on SSRN

SSRN stores affiliation in your **author profile**, not in the paper.

1. Go to https://hq.ssrn.com → click your name in sidebar
2. Find "Affiliation" / "Institutional Information"
3. Enter:
   - **Affiliation:** FTH Trading
   - **Position:** Founder-Architect & Chief Systems Engineer
   - **Location:** Norcross, GA, USA
4. Save — SSRN applies it retroactively to your submission

---

## SSRN Abstract (Character-Optimized)

Traditional publishing relies on institutional trust to establish authorship, version integrity, and distribution provenance. This paper presents a multi-layer provenance architecture that replaces trust with cryptographic verification, enabling any party to independently confirm a manuscript's authenticity, authorship, version history, and compositional integrity without relying on a central authority.

The system combines Merkle tree hashing across four content categories (text, embedded documents, visual assets, AI-generation prompts), content-addressed storage via IPFS, deterministic build pipelines, and append-only blockchain records to produce a five-layer verification stack — from filesystem to on-chain anchor. We formalize this approach as the Literary Protocol Standard (LPS-1), define 14 system invariants, and validate the architecture through a complete deployment accompanying a 75,000-word literary work.

The reference implementation anchors 56 content components across five smart contracts on a production blockchain (Polygon), with cross-chain timestamping on Bitcoin via OpenTimestamps. The complete infrastructure — edition management, ECDSA-enforced authorship, programmable revenue distribution, and on-chain identity declaration — was deployed at a total cost of approximately $2.50 USD. All claims are independently verifiable against public on-chain state and source-verified smart contracts.

The paper contributes: (1) a formal standard for anchoring literary works with cryptographic integrity guarantees; (2) a five-layer verification architecture enabling granular, independent auditability; and (3) a validated reference implementation demonstrating economic accessibility for individual creators.

---

## SSRN Classification

### Primary Network
**Information Systems & eBusiness eJournal**

### Subject Matter Categories (select all that apply)
- Information Systems: Digital Publishing
- Information Systems: Blockchain Applications
- Intellectual Property: Digital Rights Management
- Law & Technology: Digital Evidence
- Computer Science: Cryptographic Protocols

### JEL Codes
- L86 — Information and Internet Services; Computer Software
- O34 — Intellectual Property and Intellectual Capital
- K11 — Property Law

---

## SSRN Keywords
digital provenance, deterministic publishing, Merkle trees, content integrity, reproducible pipelines, literary technology, cryptographic verification, IPFS, content-addressed storage, smart contracts

---

## Submission Steps

1. Go to https://www.ssrn.com/index.cfm/en/
2. Click "Submit a Paper"
3. Select "Information Systems & eBusiness eJournal" as primary network
4. Upload PDF
5. Paste abstract above
6. Add keywords
7. Add JEL codes
8. Set as "Working Paper"
9. Submit

**Important:** Do NOT select any cryptocurrency/blockchain/DeFi categories. Frame as Information Systems + Intellectual Property.

---

## DOI

**DOI:** [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)

Include this DOI in:
- SSRN abstract (final paragraph)
- SSRN "Related Links" field
- Paper PDF front matter

---

## Post-Submission Updates

~~Once DOI is minted via Zenodo:~~ **DONE — DOI minted.**
- ~~Update SSRN abstract to include DOI~~ ✅
- Add DOI to "Related Links" field on SSRN
- ~~Update paper PDF with DOI in front matter~~ ✅

**SSRN Submission Status:** ✅ SUBMITTED (February 15, 2026)
- Paper uploaded and accepted by SSRN
- Affiliation: needs post-submission profile update (see instructions above)
- ORCID: register and add to SSRN author profile
- Review timeline: 24–72 hours for indexing
