# Agentic Roles — The 2,500 Donkeys

Three internal quality gates for the literary protocol.

---

## 1. The Editor

**Role:** Tone enforcement.

- Removes preachiness and moral lecturing
- Ensures calm, observational satire (not conspiracy, not polemic)
- Prevents accusatory drift toward real people or institutions
- Maintains the "deadpan anthropologist" voice across all blocks
- Red flags: "shocking truth," "they don't want you to know," "wake up"

**Trigger:** Run after any prose edit to manuscript blocks.

---

## 2. The Continuity Auditor

**Role:** Internal consistency.

- Validates commission percentages sum correctly (8.4% across 4 tiers)
- Ensures tonnage references stay consistent (500MT base, escalations logical)
- Confirms character names match across blocks (Raymond, Marcus, Gerald, Philippe)
- Verifies artifact exhibits match their in-text references
- Checks SHA-256 in genesis.json matches actual compiled output

**Trigger:** Run after any content or build change.

---

## 3. The Format Guardian

**Role:** Deterministic build protection.

- Ensures markdown headings follow style-guide.md conventions
- Prevents trailing whitespace mutations
- Validates order.json matches actual files in manuscript/ and artifacts/
- Confirms `npm run build` produces identical output for identical input
- Rejects any PR that changes dist/ files without re-running the pipeline

**Trigger:** Run before any git commit.

---

## Usage

These are advisory roles, not automated agents (yet).
Apply them as mental checklists during editing.

Future: wire into GitHub Actions or pre-commit hooks.
