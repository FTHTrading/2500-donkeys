# v2.2 — Canonical Title Update + Branding Standardisation

**Date:** 2026-02-17
**Commit:** `81f750c` → current
**Scope:** Presentation layer only — no protocol-level changes

---

## Summary

The second collection was deployed on-chain under the working title
**"Private Placement Puppetry" (PPE)**. Following editorial review, the
canonical title has been updated to **"Private Placement Programs" (PPP)**.

This release renames the presentation layer while preserving all on-chain
artefacts in their original, immutable state.

---

## Changes

### Presentation Layer (updated)

| Area | Change |
|------|--------|
| Site pages | All references updated: index, listen, library, mint, read-ppp |
| File rename | `read-ppe.html` → `read-ppp.html` |
| Track IDs | `data-id="ppe-XX"` → `data-id="ppp-XX"` (16 tracks) |
| localStorage keys | `ppe-reader-page` → `ppp-reader-page` |
| Meta tags | `<title>`, `og:title`, `og:url`, `twitter:title`, descriptions |
| Manuscript | `00-front-matter.md` title updated |
| Stories pipeline | narrate, merkle, hash, anchor, cover, PDF scripts updated |
| Deploy script | Display text updated (`deploy-story-nft.js`) |
| CHANGELOG | Entry updated |

### Chain Layer (preserved)

| Artefact | Status |
|----------|--------|
| StoryNFT constructor name | `"Private Placement Puppetry"` — immutable on-chain |
| StoryNFT.test.js assertion | Unchanged — validates on-chain name |
| pre-launch-audit.js check | Unchanged — validates on-chain name |
| Edition Merkle roots | Not regenerated — no content hash changes |
| Audio Merkle roots | Not regenerated — no content hash changes |
| LiteraryAnchor edition notes | Unchanged — anchored state preserved |

### Provenance Footnotes (added)

A single-line provenance note was added in two locations:

1. **read-ppp.html** — Colophon section
2. **index.html** — Deployment Registry (contract footer)

> On-chain deployment (Feb 2026) recorded working title "Private Placement
> Puppetry." Canonical title updated to "Private Placement Programs" in v2.2.

---

## What Did NOT Change

- No smart contract modifications
- No redeployment
- No edition hash regeneration
- No Merkle root recalculation
- No on-chain state mutation
- No test assertion changes

---

## Rationale

"Puppetry" was a working title with satirical tone. "Programs" aligns with
the institutional positioning of the protocol and reads as:

- **The 2,500 Donkeys** — Research
- **Private Placement Programs** — Financial Infrastructure

The on-chain record preserves the original title as historical artefact.
The presentation layer reflects the canonical, forward-facing identity.

This separation of **brand layer** (editable) from **chain layer** (immutable)
is an intentional protocol design decision.
