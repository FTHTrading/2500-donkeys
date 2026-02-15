# Twitter/X Thread — Deterministic Publishing

*Post after Medium article is live. Include Medium link in final tweet.*

---

## Thread (copy each tweet separately)

### Tweet 1 (hook)

I built a cryptographic provenance chain for a 75,000-word novel.

Five verification layers. Five smart contracts. Total cost: $2.50.

Then I wrote the research paper.

🧵 Thread:

---

### Tweet 2 (the problem)

Publishing has a provenance gap.

You can prove when a manuscript was uploaded, submitted, or published. You cannot prove — with cryptographic certainty — that the words existed in their exact form before any of those events.

I wanted to fix that.

---

### Tweet 3 (the architecture)

The system has five layers:

① SHA-256 hash per chapter → Merkle tree
② IPFS pin → deterministic CID
③ On-chain anchor → Polygon mainnet (immutable)
④ Author identity → ECDSA-signed wallet↔pen name binding
⑤ Bitcoin timestamp → OpenTimestamps cross-chain

Each layer is independently verifiable. No trust required.

---

### Tweet 4 (the cost)

Total infrastructure cost:

• 5 contract deployments on Polygon: ~$1.80
• IPFS pinning: free (Pinata)
• Zenodo archival + DOI: free
• Bitcoin timestamp: free

Full multi-layer provenance for less than a coffee.

---

### Tweet 5 (not NFTs)

To be clear: this is not about NFTs.

No token. No marketplace. No financialization.

The smart contracts are infrastructure — they store hashes, the same way a library catalog stores call numbers. The purpose is provenance, not speculation.

---

### Tweet 6 (the paper)

I formalized the architecture in a peer-verifiable research paper:

"Deterministic Literary Publishing: A Multi-Layer Provenance Model for Verifiable Manuscripts"

• DOI: doi.org/10.5281/zenodo.18646886
• ~4,800 words, 11 sections
• 14 system invariants, 146 tests passing

---

### Tweet 7 (verification)

You can verify the manuscript hash yourself:

```
shasum -a 256 genesis-manuscript-v1.txt
→ d1b9a57f618f...5f68363c
```

Then check it on-chain:
→ polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#readContract

The hash matches. The timestamp is immutable.

---

### Tweet 8 (close + links)

Everything is open:

📄 Paper: doi.org/10.5281/zenodo.18646886
🔗 Site: xxxiii.io
💻 Source: github.com/FTHTrading/2500-donkeys
🆔 ORCID: orcid.org/0009-0008-8425-939X
✍️ Deep dive: medium.com/@kevanbtc/a-deterministic-publishing-experiment-and-the-infrastructure-paper-it-produced-8a4d7b6e9288

146 tests. 5 verified contracts. Full source.
If you work on provenance, publishing, or document authentication — the paper is for you.

---

### Tweet 9 (optional — the novel)

Oh, and the novel?

It's a deadpan anthropological account of phantom gold deals, WhatsApp broker chains, and 2,500 donkeys walking across the Sahel.

That's coming soon too.

---

## Posting Notes

- **Best time:** Tue–Thu, 9–11 AM ET
- **Post Tweet 1, then reply-chain the rest** — do NOT use a thread-unrolling tool
- ~~**Add the Medium article link** to Tweet 8~~ ✅ Done
- **Pin Tweet 1** to your profile after posting
- **Hashtags (Tweet 1 only):** none — threads perform better without them
- **Images:** Consider a screenshot of the Polygonscan verification or the Merkle tree diagram
- **Engagement:** Reply to every response in the first hour. Be technical. Don't defend "crypto."

## Key Framing Rules

- Say "infrastructure" not "Web3"
- Say "provenance" not "blockchain"
- Say "verification" not "decentralized"
- If someone says "just use GPG": GPG proves identity, not temporal existence or granular integrity
- If someone asks about Polygon: cost ($0.003/tx), finality, EVM tooling
