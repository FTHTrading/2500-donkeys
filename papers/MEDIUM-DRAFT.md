# What Happens When You Hash a Novel Before You Publish It

*A deterministic publishing experiment — and the infrastructure paper it produced.*

---

There is a problem in publishing that nobody talks about because nobody has a solution for it.

**You cannot prove when a manuscript was finished.**

You can prove when it was uploaded. You can prove when it was submitted. You can prove when it was published. But you cannot prove — with cryptographic certainty — that the words existed in their exact form before any of those events occurred.

This matters more than people think.

---

## The Experiment

I wrote a 75,000-word novel called *The 2,500 Donkeys*. It's a deadpan anthropological account of phantom gold deals, WhatsApp broker chains, and a herd of actual donkeys walking across the Sahel. The plot doesn't matter for this article. What matters is what I did with the manuscript *before* I published it.

I hashed every chapter. Built a Merkle tree. Anchored the root on-chain. Pinned the content to IPFS. Then I wrote a research paper describing the architecture.

Then I did it again with a completely different literary format — a 13-story short fiction collection called *Private Placement Puppetry* — using a different TTS engine, a different tree topology, and the same protocol. Two works, one verification framework.

Not because I thought somebody would steal my novel. Because I wanted to know if the infrastructure was *possible* — whether a single author, with no institutional backing, could construct a multi-layer provenance chain that a third party could independently verify. And then whether that protocol could *generalize* beyond a single manuscript format.

The answer is yes. And the cost was under $2.

---

## The Architecture (Brief)

The system has five layers:

1. **Content Layer** — SHA-256 hash of every block (chapter), organized into a Merkle tree.
2. **Storage Layer** — IPFS pin of the manuscript bundle. The CID is deterministic — identical content always produces the same hash.
3. **Anchor Layer** — On-chain smart contract storing the Merkle root, edition metadata, and timestamp. Polygon mainnet. Immutable.
4. **Identity Layer** — On-chain author identity binding a wallet address to a pen name, with an off-chain signature.
5. **Temporal Layer** — Bitcoin OpenTimestamps submission, providing second-chain corroboration.

Each layer is independently verifiable. No trust required. No intermediary. No platform dependency.

---

## Why This Is Not About NFTs

I want to be precise here, because the word "blockchain" triggers a specific set of assumptions.

This project does not sell NFTs. There is no token. There is no marketplace. The smart contracts are infrastructure — they store hashes and metadata, the same way a library catalog stores call numbers. The contracts are verified and readable on Polygonscan. Anyone can audit them.

The purpose is *provenance*, not *financialization*.

If you removed the blockchain component entirely and replaced it with a notarized letter to a lawyer, the architectural logic would be identical. The blockchain just happens to be cheaper, faster, and independently auditable.

---

## The Research Paper

I formalized the architecture in an academic paper:

**"Deterministic Literary Publishing: A Multi-Layer Provenance Model for Verifiable Manuscripts"**

- DOI: [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)
- Archived on Zenodo with full source code
- ~4,800 words, 11 sections, peer-verifiable appendices
- Reference implementation deployed on Polygon mainnet

The paper describes the protocol in enough detail that someone could reproduce it independently. That was the point.

---

## What I Learned

**1. The tooling exists, but nobody has assembled it for this purpose.**

SHA-256. Merkle trees. IPFS. Smart contracts. DOIs. Every component has been available for years. Nobody had built the pipeline specifically for literary manuscripts.

**2. Cost is not a barrier.**

Five contract deployments on Polygon: ~$1.80 total. IPFS pinning: free (Pinata's free tier). Zenodo archival: free. DOI: free. The entire provenance chain cost less than a coffee.

**3. The verification path matters more than the anchor.**

Storing a hash is trivial. What matters is whether a third party can reconstruct the hash from the source material and confirm it matches. The paper spends more time on verification procedures than on any other component.

**4. Academic infrastructure gives it permanence.**

A GitHub repo can be deleted. A website can go offline. A DOI — backed by Zenodo's institutional archive — persists. Adding academic citation infrastructure (CITATION.cff, BibTeX, DOI badge) transforms a project into a citable reference.

---

## The Verification Command

If you want to verify the manuscript hash yourself:

```bash
shasum -a 256 genesis-manuscript-v1.txt
# Expected: d1b9a57f618f0445dc7a5d30d5bf4e707bb4d0cd8d83ceb277f9628d5f68363c
```

Then check it against the on-chain record:

→ [PublishingKernelV2 on Polygonscan](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#readContract)

The hash matches. The timestamp is immutable. The manuscript predates the publication.

---

## What's Next

The novel itself publishes soon — EPUB and PDF, generated deterministically from the same source files. The stories collection (*Private Placement Puppetry*) is already anchored and frozen on-chain. The infrastructure paper is available now via the DOI above. The full source — contracts, tests, build scripts, Merkle construction — is open on [GitHub](https://github.com/FTHTrading/2500-donkeys).

If you work on digital provenance, document authentication, or scholarly publishing infrastructure, the paper may be directly relevant to your work. If you just want to read a strange novel about phantom gold — or 13 short stories about the same dysfunctional industry — those are coming too.

---

*Kevan Burns is an independent researcher focused on deterministic publishing infrastructure. The reference implementation described in this article is deployed on Polygon mainnet and archived with Zenodo under DOI [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886).*

---

**Tags:** `digital-provenance` · `publishing` · `infrastructure` · `research` · `open-source`
