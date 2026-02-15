# Product Hunt Launch — xxxiii.io

*Submit after HN response is measured. Best: Tuesday 12:01 AM PT.*

---

## Listing Details

### Name
```
xxxiii.io — Deterministic Literary Publishing Protocol
```

### Tagline (60 chars max)
```
Cryptographic provenance for manuscripts — for under $3
```

### Description

xxxiii.io is a reference implementation of deterministic literary publishing — a protocol that lets any author build a multi-layer, independently verifiable provenance chain for their manuscript.

The system anchors a novel's content hashes on-chain, pins the manuscript to IPFS, timestamps it on Bitcoin, and wraps the whole thing in academic citation infrastructure (DOI, ORCID, CITATION.cff).

**Five verification layers:**
- SHA-256 hashes per chapter → Merkle tree
- IPFS content-addressed storage (deterministic CID)
- On-chain anchor: 5 smart contracts on Polygon (source-verified)
- Author identity: ECDSA-signed wallet-to-pen-name binding
- Bitcoin timestamp via OpenTimestamps

**Total cost:** ~$2.50 for the complete provenance chain.

The architecture is formalized in a peer-verifiable research paper with DOI [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886), 14 system invariants, and 146 passing tests.

This is infrastructure, not speculation. No NFTs, no tokens, no marketplace.

### Topics
```
Open Source, Developer Tools, Publishing, Blockchain
```

### Website
```
https://xxxiii.io
```

### Links

| Label | URL |
|-------|-----|
| Research Paper (DOI) | https://doi.org/10.5281/zenodo.18646886 |
| GitHub (MIT) | https://github.com/FTHTrading/2500-donkeys |
| ORCID | https://orcid.org/0009-0008-8425-939X |
| Polygonscan (contracts) | https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code |

### Thumbnail / Gallery

Suggested images (in priority order):
1. xxxiii.io site screenshot (hero section)
2. Polygonscan contract verification screenshot
3. Academic PDF title page
4. Merkle tree diagram (if one exists)

### Maker Comment (post immediately after launch)

Hi PH 👋

I'm Kevan — I built this as a single-author experiment to answer a question: can one person, with no institutional backing, construct a complete provenance chain for a literary manuscript using only open infrastructure?

The answer is yes, and the total cost was about $2.50.

The novel is *The 2,500 Donkeys* — 75,000 words about phantom gold deals, WhatsApp broker chains, and an actual donkey herd crossing the Sahel. But the interesting part isn't the novel — it's the infrastructure underneath it.

Every hash, every contract, every verification step is independently auditable. The research paper documents the full architecture.

I'm here to answer any questions about the protocol, the threat model, or why I think this pattern generalizes beyond literature.

---

## Launch Checklist

- [ ] Have 5+ hunter friends ready to upvote at launch
- [ ] Maker comment drafted (above)
- [ ] Gallery images prepared (4 screenshots)
- [x] Medium article published: [link](https://medium.com/@kevanbtc/a-deterministic-publishing-experiment-and-the-infrastructure-paper-it-produced-8a4d7b6e9288)
- [ ] Twitter thread posted (cross-promote)
- [ ] Reply to every comment within first 3 hours

## Timing

- **Best day:** Tuesday
- **Launch time:** 12:01 AM PT (Product Hunt resets daily at midnight PT)
- **Promotion window:** First 6 hours are critical
- **Coordinate with:** Twitter thread at 9 AM ET same day

## Framing Rules

Same as all channels:
- Infrastructure, not Web3
- Provenance, not blockchain
- Verification, not decentralization
- Lead with the problem (no provenance in publishing), not the solution (smart contracts)
- The novel is the test case, not the product
