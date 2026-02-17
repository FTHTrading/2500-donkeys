# LinkedIn Post — Deterministic Literary Publishing

> Ready to paste into LinkedIn. Short-form, professional, credibility-focused.

---

## Post

I wrote a 75,000-word novel, then built a multi-layer provenance system to prove — cryptographically — when the manuscript was completed.

Then I validated it with a second literary work — a 13-story short fiction collection — using a different TTS engine, a different tree topology, and the same protocol framework. Two works. One verification standard.

Then I wrote the research paper documenting how it works.

**"Deterministic Literary Publishing: A Multi-Layer Provenance Model for Verifiable Manuscripts"**

The core question: Can a single author, with no institutional backing, construct a verification chain that a third party can independently audit?

The answer is yes. Five smart contracts on Polygon. IPFS content addressing. Merkle trees over every chapter. Bitcoin timestamp corroboration. Total infrastructure cost: under $2.

The entire system ships with an independent verifier — `npm run lps:verify` — that anyone can run without keys, credentials, or backend access. It reconstructs the manuscript, rebuilds all four Merkle trees from source, queries on-chain state, and cross-validates every layer. 51 checks. Zero trust required.

The paper is archived on Zenodo with a DOI. The source code, contracts, tests, and verifier are open on GitHub. Everything is independently verifiable — and that's not a claim, it's a command you can run.

This isn't about NFTs or tokens — it's about document provenance infrastructure. The same architecture applies to legal documents, academic manuscripts, regulatory filings, or any context where "when did this version exist?" is a meaningful question.

📄 Paper: https://doi.org/10.5281/zenodo.18646886
✍️ Deep dive: https://medium.com/@kevanbtc/a-deterministic-publishing-experiment-and-the-infrastructure-paper-it-produced-8a4d7b6e9288
💻 Source: https://github.com/FTHTrading/2500-donkeys
🔍 Verify it yourself: `git clone` → `npm install` → `npm run lps:verify`
🌐 Project: https://xxxiii.io

#DigitalProvenance #Publishing #Research #OpenSource #Infrastructure

---

## Notes for posting

- **Character count:** ~1,400 (well within LinkedIn's 3,000 limit)
- **Tone:** Professional, factual, no hype
- **CTA:** Dual — implicit (links) + explicit (clone → verify command)
- **Key addition:** The verifier paragraph transforms "independently verifiable" from a claim into a reproducible action
- **Hashtags:** Infrastructure-focused, avoids crypto/Web3/NFT tags deliberately
- **Best posting time:** Tuesday–Thursday, 8–10 AM ET
- **Consider:** Adding the PDF as a document attachment to the post for higher engagement
