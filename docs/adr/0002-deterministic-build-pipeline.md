# ADR-0002: Deterministic Build Pipeline

**Status:** Accepted  
**Date:** 2026-02-14  
**Author:** Kevan Burns  
**Domain:** Build System

## Context

Literary manuscripts are typically compiled through ad-hoc processes — copy-paste into Word, export to PDF, submit to distributor. This creates no reproducibility guarantee. If two people compile the same source files, they may get different outputs due to timestamp injection, platform-dependent line endings, or non-deterministic file ordering.

The protocol requires that **identical source files always produce identical output**, byte-for-byte.

## Decision

**Implement a three-mode deterministic build pipeline.**

| Mode | Flag | Guarantee |
|------|------|-----------|
| Normal | (none) | Live timestamps, standard concatenation |
| Deterministic | `--deterministic` | Strips timestamp → identical source produces identical `dist/final-manuscript.md` |
| Reproducible | `--reproducible` | Frozen genesis timestamp → byte-identical `genesis.json` across machines |

Key implementation details:

1. **Canonical ordering:** `build/order.json` defines the exact sequence of 36 entries (31 blocks + 5 artifacts). No filesystem glob ordering.
2. **CRLF normalization:** All files normalized to CRLF before hashing via `.gitattributes` (`* text=auto eol=crlf`).
3. **UTF-8 without BOM:** No byte-order marks. Consistent encoding across Windows/Linux/macOS.
4. **SHA-256 hashing:** FIPS 180-4 compliant. Computed after normalization.
5. **No mutable state:** Build scripts read files, concatenate, hash. No environment variables, no random seeds, no network calls.

## Rationale

1. **Verifiability:** Anyone can clone the repo, run `npm run build`, and confirm the SHA-256 matches `genesis.json` and on-chain records.
2. **CI enforcement:** GitHub Actions runs `npm run lps:verify` on every push. If the build isn't deterministic, CI fails.
3. **Cross-platform:** The `.gitattributes` CRLF normalization solved a real bug where Linux CI produced different hashes than Windows development (commit `4cf8fc8`).

## Consequences

- **Positive:** Build reproducibility is mathematically guaranteed. Third-party verification requires only `git clone && npm install && npm run lps:verify`.
- **Negative:** Adding new manuscript blocks requires updating `build/order.json` manually. Forgetting a block breaks the build.
- **Accepted trade-off:** Manual ordering prevents silent omission — a feature, not a bug.

## Evidence

```bash
# Two independent builds produce identical output:
npm run build:deterministic
shasum -a 256 dist/final-manuscript.md
# → 9d062421b52d35aa23b73bfc8f66574db78bad9726e45c43a12d0109cdd57d84

npm run build:deterministic  
shasum -a 256 dist/final-manuscript.md
# → 9d062421b52d35aa23b73bfc8f66574db78bad9726e45c43a12d0109cdd57d84
```
