# Polygon Deployment Guide

Step-by-step: anchoring **The 2,500 Donkeys** on Polygon.

---

## Prerequisites

- Node.js 18+
- `.env` file with `PRIVATE_KEY` and `POLYGON_RPC` set
- MATIC in deployer wallet for gas (~0.01-0.05 MATIC)

---

## Deployer Wallet

```
Address: 0xC91668184736BF75C4ecE37473D694efb2A43978
```

Fund this address on **Polygon Mainnet** with a small amount of MATIC (0.1 is plenty).

For testnet dry-runs, get free Amoy MATIC from:
- https://faucet.polygon.technology/

---

## Step 1 — Compile the contract

```powershell
npm run hh:compile
```

Compiles `web3/contracts/LiteraryAnchor.sol` with Solidity 0.8.19.

---

## Step 2 — Run tests

```powershell
npm run hh:test
```

Runs the full test suite against a local Hardhat node.

---

## Step 3a — Deploy to Amoy testnet (dry run)

```powershell
npm run deploy:amoy
```

This deploys to Polygon's Amoy testnet. Use this to verify everything works before mainnet.

---

## Step 3b — Deploy to Polygon mainnet

```powershell
npm run deploy:polygon
```

This will:
1. Read CID + SHA-256 from `web3/metadata/genesis.json`
2. Deploy `LiteraryAnchor` with those constructor args
3. Update `genesis.json` with contract address, tx hash, block number
4. Save `web3/metadata/deployment-receipt.json`

---

## Step 4 — Verify on Polygonscan (optional)

Get a free API key from [polygonscan.com/apis](https://polygonscan.com/apis).

Add to `.env`:
```
POLYGONSCAN_API_KEY=your_key_here
```

Then:
```powershell
npm run verify
```

---

## Step 5 — Audit deployed contract

```powershell
npm run audit:chain
```

Cross-checks on-chain data against local `genesis.json` to confirm CID and SHA-256 match.

---

## Step 6 — Commit the anchor

```powershell
git add .
git commit -m "Polygon anchor deployed — Genesis locked"
git push origin master
```

---

## Cost Estimate

| Item | Estimated Cost |
|------|---------------|
| Contract deployment | ~0.005-0.02 MATIC |
| MATIC price | ~$0.30-0.50 |
| **Total cost** | **< $0.01 USD** |

Polygon is extremely cheap. A full deployment costs less than a penny.

---

## After Deployment

Your five-layer provenance stack is complete:

1. **Filesystem** — local file timestamps
2. **Git** — commit history + SHA in message
3. **SHA-256** — deterministic hash of compiled manuscript
4. **IPFS** — content-addressed immutable storage
5. **Polygon** — on-chain timestamped anchor

The book is cryptographically sealed.
