# ADR-0003: Six-Tree Merkle Architecture

**Status:** Accepted  
**Date:** 2026-02-14  
**Author:** Kevan Burns  
**Domain:** Cryptographic Integrity

## Context

A literary manuscript contains multiple content types: narrative text, in-book artifacts (exhibits), cover/chapter images, and AI generation prompts. A single hash of the compiled manuscript proves *overall* integrity but cannot prove the integrity of any *individual* chapter or artifact without re-hashing everything.

The stories collection adds two more types: independent short fiction and TTS audio narrations.

## Decision

**Build six independent Merkle trees — four for the novel, two for the stories — each covering one content type.**

### Novel Trees (4)

| Tree | Leaves | Content |
|------|--------|---------|
| Manuscript | 31 | Every narrative block (SHA-256) |
| Artifact | 5 | Every in-book exhibit |
| Image | 10 | Cover + 9 chapter illustrations |
| Prompt | 10 | AI generation prompts for all images |

**Edition Root** = SHA-256(manuscriptRoot ‖ artifactRoot ‖ imageRoot ‖ promptRoot)

### Stories Trees (2)

| Tree | Leaves | Content |
|------|--------|---------|
| Manuscript | 16 | 13 stories + front/back matter |
| Audio | 13 | Kokoro TTS narrations |

**Combined Hash** = SHA-256(manuscriptRoot ‖ audioRoot)

## Rationale

1. **Granular verification:** A reviewer can request a Merkle inclusion proof for a single chapter without accessing the full manuscript: `npm run lps:proof -- block-12`.
2. **AI transparency:** Prompt trees create a verifiable record of which content was AI-generated and what prompts were used. This is ahead of emerging AI disclosure regulations.
3. **Extensibility:** Adding a new content type (e.g., translations, derivative works) means adding a new tree — no existing tree is modified.
4. **Odd-leaf handling:** Trees with odd leaf counts duplicate the last leaf to maintain balance. This is standard Merkle construction (Bitcoin uses the same approach).

## Consequences

- **Positive:** Per-chapter verification, AI disclosure, and independent content-type integrity.
- **Negative:** Four roots must be combined in a fixed order to produce the edition root. Reordering would produce a different root and break verification.
- **Accepted invariant:** Concatenation order is `manuscriptRoot + artifactRoot + imageRoot + promptRoot` — formalized in INV-C3.

## Alternatives Considered

| Approach | Rejected Because |
|----------|-----------------|
| Single hash of compiled file | No per-chapter granularity |
| Single Merkle tree (all leaves) | Mixes content types — can't verify "just images" |
| Nested trees (tree of trees) | Over-complex for 4 leaf types with known structure |
| Patricia trie | Designed for key-value lookups, not ordered content verification |
