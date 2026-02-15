# The 2,500 Donkeys

**A Web3 Literary Protocol by Kidd James**

---

## What This Is

A finance satire novel built as a proof-of-concept for sovereign Web3 publishing.

The story dissects how **narrative outpaces verification in opaque financial ecosystems** — through the lens of discounted gold deals, WhatsApp broker chains, ESG monetization theater, and 2,500 donkeys walking across a desert.

The infrastructure proves that authors can publish immutably, control rights, and anchor authorship on-chain — without publishers, without intermediaries, without permission.

---

## Three Layers (Cleanly Separated)

| Layer | Purpose |
|---|---|
| **The Novel** | Literary satire. Commercially readable. Observational, not preachy. |
| **The Satire** | Critique of narrative leverage in commodity brokerage, ESG hype, and commission culture. |
| **The Protocol** | IPFS + on-chain anchor. Deterministic build. Proof-of-origin. Publishing template. |

---

## Project Structure

```
manuscript/       → Chapter blocks (canonical prose)
artifacts/        → In-book exhibits (IMFPA, commission waterfall, WhatsApp logs, ESG deck)
build/            → Compile, hash, and manifest scripts
dist/             → Compiled output (generated, not committed)
web3/contracts/   → LiteraryAnchor.sol (Polygon)
web3/scripts/     → deploy.js, verify.js, audit.js
web3/test/        → Contract test suite (11 tests)
web3/metadata/    → Genesis hash, CID, chain references
```

---

## Build

```bash
npm run build
```

This runs three steps:

1. **compile** — Concatenates all blocks + artifacts into `dist/final-manuscript.md`
2. **hash** — SHA-256 of the compiled manuscript → `web3/metadata/genesis.json`
3. **manifest** — Per-file hash manifest → `dist/manifest.json`

---

## Publish Pipeline

1. `npm run build` → deterministic manuscript
2. Upload `dist/final-manuscript.md` to IPFS → get CID
3. Deploy `LiteraryAnchor.sol` on Polygon with CID + SHA-256
4. Update `web3/metadata/genesis.json` with contract address + tx hash
5. Export to KDP (ebook + paperback) for reader distribution

---

## Polygon Deployment

### Quick Start

```bash
# 1. Compile the contract
npm run hh:compile

# 2. Run tests (11 tests)
npm run hh:test

# 3. Deploy to Amoy testnet (dry run)
npm run deploy:amoy

# 4. Deploy to Polygon mainnet
npm run deploy:polygon

# 5. Verify on Polygonscan (optional)
npm run verify

# 6. Audit on-chain state vs local genesis.json
npm run audit:chain
```

### Deployer Wallet

```
0xC91668184736BF75C4ecE37473D694efb2A43978
```

Fund with ~0.1 MATIC on Polygon mainnet. Deployment costs < $0.01.

See [web3/DEPLOY.md](web3/DEPLOY.md) for full guide.

---

## The Provenance Stack

| Layer | What It Proves |
|---|---|
| Git history | Authorship timeline |
| SHA-256 hash | Content integrity |
| IPFS CID | Immutable storage |
| On-chain anchor | Timestamped proof-of-origin |
| KDP publication | Commercial distribution record |

---

## What This Is Not

- Not a token sale
- Not a speculation scheme
- Not a conspiracy manifesto
- Not an accusation of any real person or institution

It is satire. It observes behavior. It mirrors patterns.

---

## License

- **Build tooling & contracts:** MIT
- **Literary content:** © Kidd James. All rights reserved.

---

> *"Belief travels faster than verification."*
> — First Law of the Parking Lot
