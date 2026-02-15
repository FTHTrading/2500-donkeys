# Deployment Registry

**The 2,500 Donkeys — Canonical Deployment Ledger**

All production deployments, anchors, and infrastructure records.

---

## Network

| Field | Value |
|-------|-------|
| **Network** | Polygon Mainnet |
| **Chain ID** | 137 |
| **Currency** | POL (formerly MATIC) |
| **Explorer** | [polygonscan.com](https://polygonscan.com) |
| **RPC Endpoints** | `https://1rpc.io/matic`, `https://polygon-bor-rpc.publicnode.com`, `https://rpc.ankr.com/polygon`, `https://polygon.llamarpc.com` |

---

## Smart Contract

| Field | Value |
|-------|-------|
| **Contract** | [`0x97f456300817eaE3B40E235857b856dfFE8bba90`](https://polygonscan.com/address/0x97f456300817eaE3B40E235857b856dfFE8bba90) |
| **Source Verified** | [Yes — Polygonscan](https://polygonscan.com/address/0x97f456300817eaE3B40E235857b856dfFE8bba90#code) |
| **Solidity** | 0.8.19 |
| **Optimizer** | Enabled, 200 runs |
| **License** | MIT |
| **Author (immutable)** | [`0xC91668184736BF75C4ecE37473D694efb2A43978`](https://polygonscan.com/address/0xC91668184736BF75C4ecE37473D694efb2A43978) |

### Constructor Arguments

```json
[
  "The 2,500 Donkeys",
  "QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK",
  "cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364"
]
```

### Bytecode Hash

```
Compiler: solc 0.8.19+commit.7dd6d404
Optimization: 200 runs
EVM Version: Default (Paris)
```

---

## Deployment Transaction (Genesis)

| Field | Value |
|-------|-------|
| **Tx Hash** | [`0x9c036d1d8e946e0d9c8c520d4818e3d211c137478f7a704b733fbea500f28ec6`](https://polygonscan.com/tx/0x9c036d1d8e946e0d9c8c520d4818e3d211c137478f7a704b733fbea500f28ec6) |
| **Block** | [83,002,198](https://polygonscan.com/block/83002198) |
| **Gas Used** | 1,116,006 |
| **Cost** | 0.887 POL |
| **Deployer** | `0xC91668184736BF75C4ecE37473D694efb2A43978` |
| **Date** | February 14, 2026 |

---

## Edition 1 — Genesis

| Field | Value |
|-------|-------|
| **Edition Index** | 0 |
| **Status** | Immutable — on-chain |
| **Blocks** | 9 narrative + 5 artifacts (14 total) |
| **Compiled Size** | 49,224 bytes |
| **SHA-256** | `cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364` |
| **IPFS CID** | [`QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK`](https://ipfs.io/ipfs/QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK) |
| **Tx Hash** | [`0x9c036d1d...28ec6`](https://polygonscan.com/tx/0x9c036d1d8e946e0d9c8c520d4818e3d211c137478f7a704b733fbea500f28ec6) |
| **Block** | 83,002,198 |
| **Note** | "Genesis Edition" (set in constructor) |

---

## Edition 2 — Expansion

| Field | Value |
|-------|-------|
| **Edition Indices** | 1, 2, 3 (triplicate from nonce recovery — identical content) |
| **Status** | Immutable — on-chain |
| **Blocks** | 31 narrative + 5 artifacts (36 total) |
| **New Blocks** | 22 (Layers A–D expansion) |
| **Compiled Size** | 293,368 bytes |
| **SHA-256** | `9d062421b52d35aa23b73bfc8f66574db78bad9726e45c43a12d0109cdd57d84` |
| **IPFS Root CID** | [`QmPXtEsRwiWuaKmKNA569XAqFNVySN8pwTdGQrvcdpgtMa`](https://ipfs.io/ipfs/QmPXtEsRwiWuaKmKNA569XAqFNVySN8pwTdGQrvcdpgtMa) |
| **Manuscript CID** | [`QmWMeMUgxi6t1Gabn2Wp8N7LrJeF4NKBWxPN1r3XETR81g`](https://ipfs.io/ipfs/QmWMeMUgxi6t1Gabn2Wp8N7LrJeF4NKBWxPN1r3XETR81g) |
| **Manifest CID** | [`QmNwPPcJkd4iqUPUmHUJ8doRHEocbQ1QeoXm1Gpwzb8YPt`](https://ipfs.io/ipfs/QmNwPPcJkd4iqUPUmHUJ8doRHEocbQ1QeoXm1Gpwzb8YPt) |
| **Tx Hash** | [`0xf4bebec46a32419b8e9455994e92f037268f1ad9e839f21f7bce1c5e5fa51915`](https://polygonscan.com/tx/0xf4bebec46a32419b8e9455994e92f037268f1ad9e839f21f7bce1c5e5fa51915) |
| **Block** | [83,004,469](https://polygonscan.com/block/83004469) |
| **Gas Used** | 305,935 |
| **Note** | "Edition 2 — 31 blocks, 293,368 bytes, ~75k words. Layers A–D expansion." |

### Edition 2 — Layer Breakdown

| Layer | Blocks | Focus |
|:-----:|:------:|-------|
| A | 6 | Character depth — Raymond, Gerald, Marcus, Storyteller, Philippe, Seven Families |
| B | 5 | WhatsApp mutations — Lagos, Dubai, Zurich, NGO, Carbon Conference |
| C | 7 | The Procession — 2,500 donkeys across the Sahel |
| D | 4 | Aftermath — Raymond home, groups dying, summit, resurrection |

### Nonce Recovery Note

Edition 2 was anchored three times (indices 1, 2, 3) due to a nonce gap during deployment. All three entries contain identical CID and SHA-256. The `latest()` view function correctly returns Edition 2 data. The duplicates are harmless appendages.

---

## On-Chain State Summary

| Field | Value |
|-------|-------|
| **editionCount()** | 4 |
| **genesis().ipfsCID** | `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK` |
| **latest().ipfsCID** | `QmPXtEsRwiWuaKmKNA569XAqFNVySN8pwTdGQrvcdpgtMa` |
| **latest().sha256Hash** | `9d062421b52d35aa23b73bfc8f66574db78bad9726e45c43a12d0109cdd57d84` |
| **latest().note** | "Edition 2 — 31 blocks, 293,368 bytes, ~75k words. Layers A–D expansion." |

---

## Infrastructure

### IPFS

| Field | Value |
|-------|-------|
| **Runtime** | Kubo v0.39.0 (via IPFS Desktop) |
| **API** | `http://127.0.0.1:5001` |
| **Gateway** | `http://127.0.0.1:8080` |
| **Public Gateway** | `https://ipfs.io/ipfs/` |

### Cloudflare Pages

| Field | Value |
|-------|-------|
| **Project** | `2500-donkeys` |
| **Production URL** | [https://2500-donkeys.pages.dev](https://2500-donkeys.pages.dev) |
| **Custom Domain** | [https://xxxiii.io](https://xxxiii.io) |
| **Custom Domain (www)** | [https://www.xxxiii.io](https://www.xxxiii.io) |
| **DNS** | Cloudflare-managed (Full mode) |
| **SSL** | Active (Google CA) |

### GitHub

| Field | Value |
|-------|-------|
| **Repository** | [FTHTrading/2500-donkeys](https://github.com/FTHTrading/2500-donkeys) |
| **Branch** | `master` |
| **Visibility** | Public |

### Build Environment

| Field | Value |
|-------|-------|
| **Node.js** | v24.13.0 |
| **Hardhat** | 2.28.6 |
| **Ethers** | 6.16.0 |
| **Solidity** | 0.8.19 |
| **Wrangler** | 4.65.0 |
| **OS** | Windows |

---

## Git Commit History (Deployment-Related)

| Hash | Message | Date |
|------|---------|------|
| `91a676c` | Epilogue: replace placeholders with deployed values | Feb 15, 2026 |
| `b7e6226` | Add Cloudflare Pages site for xxxiii.io | Feb 15, 2026 |
| `376aaf0` | Add Edition 2 anchor script | Feb 15, 2026 |
| `36185e2` | Edition 2: expand manuscript from 9 to 31 blocks | Feb 15, 2026 |
| `fbe0896` | README: Sr-level ecosystem architecture + Polygonscan verified | Feb 14, 2026 |
| `ee32d15` | Polygon anchor deployed — Genesis locked | Feb 14, 2026 |

---

*Registry updated: February 2026*
*Protocol: The 2,500 Donkeys*
*Author: Kidd James*
