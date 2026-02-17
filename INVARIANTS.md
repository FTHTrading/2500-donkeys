# Protocol Invariants

**The 2,500 Donkeys — System Guarantees**
**Version:** 1.1

These are the invariants that must hold at all times across both works (novel and stories collection). If any invariant is violated, the protocol is in an inconsistent state and must be corrected before further operations.

---

## 1. Content Invariants

### INV-C1: Hash-Content Binding
The SHA-256 hash stored on-chain must match the SHA-256 of the IPFS-pinned content for the same edition.

```
sha256(ipfs_get(edition.ipfsCID)) == edition.sha256Hash
```

**Verification:** Download content via IPFS CID, compute SHA-256, compare against on-chain value.

### INV-C2: CID Determinism
The IPFS CID is derived from content. Adding identical content to IPFS must produce the identical CID.

```
ipfs_add(content_A) == ipfs_add(content_B)  iff  content_A == content_B
```

**Verification:** Re-add local `dist/` folder to IPFS; CID must match the stored CID.

### INV-C3: Build Determinism
The build pipeline is deterministic. Identical source files in identical order produce byte-identical output.

```
compile(manuscript, order) → output_A
compile(manuscript, order) → output_B
output_A == output_B
```

**Verification:** Run `npm run build` twice without changing sources; compare `dist/final-manuscript.md` byte-for-byte.

### INV-C4: Manifest Integrity
Every file tracked in `dist/manifest.json` must have a SHA-256 that matches its actual content.

```
for file in manifest:
    sha256(read(file.path)) == file.sha256
```

**Verification:** Run `node build/manifest.js` and compare against stored manifest.

### INV-C5: Order Completeness
Every file listed in `build/order.json` must exist in `manuscript/` or `artifacts/`. No block is compiled that doesn't exist. No existing block is omitted.

```
for entry in order.blocks:
    exists(manuscript/{entry.file}) OR exists(artifacts/{entry.artifact})
```

### INV-C6: Stories Merkle Integrity
The stories collection maintains two independent Merkle trees (manuscript + audio). The combined hash on-chain must equal `H(manuscriptRoot ‖ audioRoot)` where both roots are computed from the current source files.

```
stories_manuscriptRoot = merkle(stories/manuscript/*.md)
stories_audioRoot = merkle(stories/audio/*.mp3)
on_chain.combinedHash == sha256(stories_manuscriptRoot ‖ stories_audioRoot)
```

**Verification:** Run `node stories/stories-merkle.js` and `node stories/hash-stories-audio.js`; compare roots against KernelV2 Edition 2 on-chain.

---

## 2. Contract Invariants

### INV-K1: Author Immutability
The author address is set at deployment and cannot be changed. The `immutable` keyword enforces this at the EVM level.

```solidity
address public immutable author;  // Set once in constructor, stored in bytecode
```

**Verification:** Read `author()` on Polygonscan. Must equal `0xC91668184736BF75C4ecE37473D694efb2A43978`.

### INV-K2: Genesis Permanence
`editions[0]` is set in the constructor. No function exists to modify it. The genesis edition cannot be overwritten, deleted, or altered.

```
editions[0].ipfsCID == constructor_arg._ipfsCID  (forever)
editions[0].sha256Hash == constructor_arg._sha256Hash  (forever)
```

**Verification:** Call `genesis()` on Polygonscan. Compare against constructor arguments.

### INV-K3: Append-Only Editions
Editions can only be added, never removed or modified. The `editions` array grows monotonically.

```
editionCount(t₁) <= editionCount(t₂)  for all t₁ < t₂
```

**Verification:** `editionCount()` never decreases between queries.

### INV-K4: Author-Only Anchoring
Only the author address can call `anchorEdition()`. All other callers are rejected.

```solidity
modifier onlyAuthor() {
    require(msg.sender == author, "Only the author can anchor editions");
    _;
}
```

**Verification:** Attempt `anchorEdition()` from a non-author address. Must revert.

### INV-K5: Sequential Indexing
Edition indices are sequential starting from 0. No gaps, no reordering.

```
editions[0] = genesis
editions[1] = first anchored edition
editions[n] = nth edition
editionCount() == n + 1
```

### INV-K6: Timestamp Monotonicity
Each edition's timestamp is greater than or equal to the previous edition's timestamp (block timestamps are monotonically non-decreasing on Polygon).

```
editions[n].timestamp >= editions[n-1].timestamp
```

---

## 3. Provenance Invariants

### INV-P1: Five-Layer Alignment
For any published edition, all five provenance layers must be consistent:

| Layer | Artifact | Must Match |
|:-----:|----------|------------|
| 1 | Filesystem | Source files exist locally |
| 2 | Git | Commit contains the edition's source files |
| 3 | SHA-256 | Hash matches compiled output |
| 4 | IPFS | CID resolves to content matching the hash |
| 5 | Polygon | On-chain record stores correct CID + hash |

**Violation of any layer breaks the provenance chain.**

### INV-P2: Cross-Layer Consistency
The SHA-256 stored in `genesis.json` (local), the SHA-256 in the IPFS-pinned manifest, and the SHA-256 on-chain must all be identical for the same edition.

```
genesis.json.sha256 == on_chain.sha256Hash == sha256(ipfs_content)
```

### INV-P3: Timestamp Priority
The on-chain timestamp for any edition must be later than the git commit that introduced the corresponding manuscript content. This proves content existed before anchoring.

---

## 4. Build Pipeline Invariants

### INV-B1: No Uncommitted Anchoring
No edition should be anchored on-chain until the corresponding source files are committed to git. The git history must contain the source before the chain contains the anchor.

### INV-B2: Pipeline Ordering
Build steps must execute in order: compile → hash → manifest. Running hash before compile is invalid. Running manifest before hash is invalid.

### INV-B3: No Manual Artifacts
The files in `dist/` must only be produced by the build pipeline. Manual editing of `dist/final-manuscript.md` or `dist/manifest.json` violates determinism.

---

## 5. Supply Invariants (Future NFT Editions)

### INV-S1: Genesis Singularity
If a Genesis NFT is minted, its supply is 1. It cannot be duplicated.

### INV-S2: Fixed Founder Supply
Founder edition supply, once set in the NFT contract constructor, cannot be increased.

### INV-S3: Capped Public Supply
Public edition supply has a hard cap enforced by the smart contract. No admin function can increase it.

### INV-S4: No Retroactive Minting
NFT editions must reference an already-anchored on-chain edition. You cannot mint an NFT for an edition that hasn't been anchored yet.

---

## 6. Invariant Monitoring

### Automated Checks

| Check | Command | Frequency |
|-------|---------|-----------|
| Build determinism (novel) | `npm run build` + compare hash | Every commit |
| Build determinism (stories) | `node stories/stories-merkle.js` + compare hash | Every commit |
| On-chain audit | `node web3/scripts/audit.js` | After each anchor |
| Manifest integrity | `node build/manifest.js` + diff | Every commit |
| Edition count (LiteraryAnchor) | `editionCount()` on-chain query | Weekly |
| Edition count (KernelV2) | `editionCount()` on-chain query | Weekly |

### Manual Checks

| Check | Procedure | Frequency |
|-------|-----------|-----------|
| IPFS availability | Fetch CID via public gateway | Monthly |
| Author address | `author()` on Polygonscan | After any concern |
| Genesis integrity | `genesis()` on Polygonscan | After any concern |

---

## 7. Violation Response

If an invariant is violated:

1. **Stop.** Do not anchor new editions until the violation is understood.
2. **Diagnose.** Determine which invariant broke and why.
3. **Correct.** Fix the source cause (re-pin IPFS, correct build, etc.).
4. **Document.** Record the violation and resolution in the git history.
5. **Resume.** Only anchor new editions after all invariants hold again.

---

*Invariants formalized: February 2026*
*Protocol: The 2,500 Donkeys + Private Placement Puppetry*
*Author: Kidd James*
