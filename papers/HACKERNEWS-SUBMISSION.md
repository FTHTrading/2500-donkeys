# Hacker News Submission

## Title (80 char limit)

```
Show HN: I built a cryptographic provenance chain for a novel — for $2.50
```

**Alternative titles (pick whichever feels right):**
```
Show HN: Five-layer verification architecture for literary manuscripts
```
```
Show HN: Deterministic publishing — Merkle trees + IPFS + on-chain anchoring
```

---

## URL

```
https://doi.org/10.5281/zenodo.18646886
```

*(Link directly to the DOI/Zenodo paper — more credible than linking to the project site)*

---

## Comment (post immediately after submission)

I wrote a 75,000-word novel and used it as a test case for building a
complete provenance architecture using only open infrastructure.

The system has five layers:

1. SHA-256 hash of every chapter → Merkle tree
2. IPFS pin of the manuscript bundle (deterministic CID)
3. On-chain anchor: 5 smart contracts on Polygon storing the Merkle root + edition metadata
4. Author identity: ECDSA-signed binding of wallet → pen name
5. Bitcoin timestamp via OpenTimestamps for cross-chain corroboration

Total cost for 5 contract deployments + all on-chain writes: ~$2.50.

The paper formalizes this as "LPS-1" (Literary Protocol Standard) and
defines 14 system invariants. 146 tests pass. All contracts are
source-verified on Polygonscan. The manuscript is pinned on IPFS.

Every claim in the paper is independently verifiable — no trust required.

Project site: https://xxxiii.io
Source: https://github.com/FTHTrading/2500-donkeys (MIT)
Paper: https://doi.org/10.5281/zenodo.18646886 (CC-BY-4.0)

Happy to answer questions about the architecture, threat model,
or why I think this pattern generalizes beyond literature.

---

## Timing Notes

- **Best days:** Tuesday, Wednesday, Thursday
- **Best time:** 8–10 AM ET (13:00–15:00 UTC)
- **Avoid:** Weekends, Monday mornings, Friday afternoons
- **Tag:** Show HN (requires you to be the creator)

## Engagement Strategy

- Respond to every comment within the first 2 hours
- Be technical and specific — HN rewards depth
- Don't defend crypto/blockchain — frame as infrastructure
- If asked "why not just GPG sign it?": explain that GPG proves identity but not temporal existence or granular chapter-level integrity
- If asked "why Polygon?": cost ($0.003/tx), finality, EVM compatibility
- If asked about the novel: brief, deadpan — "it's about phantom gold deals and donkeys"
