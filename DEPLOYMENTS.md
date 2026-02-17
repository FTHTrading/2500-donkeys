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

## Smart Contract — LiteraryAnchor

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

## Edition 3 — Stories Placeholder

| Field | Value |
|-------|-------|
| **Edition Index** | 4 |
| **Status** | Immutable — on-chain (placeholder) |
| **IPFS CID** | `pending-ipfs-pin` |
| **Note** | First anchor attempt before IPFS pin was available. Immutable on-chain artifact; superseded by Edition 4 (index 5). |

---

## Edition 4 — Private Placement Puppetry (Stories Collection)

| Field | Value |
|-------|-------|
| **Edition Index** | 5 |
| **Status** | Immutable — on-chain |
| **Work** | *Private Placement Puppetry: Thirteen Stories from the War Room* |
| **Files** | 16 manuscript files |
| **Compiled Size** | 117,109 bytes |
| **SHA-256** | `77bb9f5e3f3a6908f96f2519e6b20b7ee15351b08ba962792da4306bfb3a123a` |
| **IPFS CID** | [`QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV`](https://ipfs.io/ipfs/QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV) |
| **Audio CID** | [`QmbT7L6zcEvXceYkR362zBJkq75A3Qb2y7wVKcCtKyVhYa`](https://ipfs.io/ipfs/QmbT7L6zcEvXceYkR362zBJkq75A3Qb2y7wVKcCtKyVhYa) |
| **Tx Hash** | [`0xd2c9c49d02d31594c5963775973f0646c11382cbba1301e4ef756261491abad3`](https://polygonscan.com/tx/0xd2c9c49d02d31594c5963775973f0646c11382cbba1301e4ef756261491abad3) |
| **Block** | [83,103,627](https://polygonscan.com/block/83103627) |
| **Gas Used** | 283,388 |
| **Date** | February 17, 2026 |

### Merkle Roots (Stories)

| Root | Value |
|------|-------|
| **manuscriptRoot** | `a73efc2af74e71d59daac1f050a1976e786ebc6fb2ace1e826f41517342173d3` |
| **editionRoot** | `a73efc2af74e71d59daac1f050a1976e786ebc6fb2ace1e826f41517342173d3` |
| **audioRoot** | `c0049f05391cd72d7738042efd4bc35b3102db82d8ba205e4f66a84afee995aa` |
| **audioEditionRoot** | `90daad5f90d4617a6fa245fff381049a2a15cd4a1b5dcffee8548e5804d0e6df` |

### On-Chain Note (Immutable)

> `PPE Puppetry — 16 files, 117109 bytes. Stories collection. Audio rendered via Kokoro TTS.`

*Note: The on-chain edition note records the working title "PPE Puppetry" — this is immutable. The canonical title is "Private Placement Puppetry."*

---

## Smart Contract — PublishingKernelV2

| Field | Value |
|-------|-------|
| **Contract** | [`0xca9F6604A9b498DB31d113836E2957c0a9aAE037`](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037) |
| **Source Verified** | [Yes — Polygonscan](https://polygonscan.com/address/0xca9F6604A9b498DB31d113836E2957c0a9aAE037#code) |
| **Solidity** | 0.8.19 |
| **Optimizer** | Enabled, 200 runs, viaIR |
| **Author (immutable)** | [`0xC91668184736BF75C4ecE37473D694efb2A43978`](https://polygonscan.com/address/0xC91668184736BF75C4ecE37473D694efb2A43978) |

### KernelV2 Edition 0 — Genesis

| Field | Value |
|-------|-------|
| **Edition Index** | 0 |
| **Status** | Frozen + ECDSA signed |
| **IPFS CID** | `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK` |
| **SHA-256** | `cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364` |

### KernelV2 Edition 1 — Stories Placeholder

| Field | Value |
|-------|-------|
| **Edition Index** | 1 |
| **Status** | Frozen + ECDSA signed (placeholder) |
| **IPFS CID** | `pending-ipfs-pin` |
| **Note** | First stories anchor attempt before IPFS pin. Immutable on-chain artifact. |

### KernelV2 Edition 2 — Private Placement Puppetry

| Field | Value |
|-------|-------|
| **Edition Index** | 2 |
| **Status** | Frozen + ECDSA signed |
| **IPFS CID** | [`QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV`](https://ipfs.io/ipfs/QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV) |
| **SHA-256** | `77bb9f5e3f3a6908f96f2519e6b20b7ee15351b08ba962792da4306bfb3a123a` |
| **Tx Hash** | [`0x57caeffe39e26352bc83af72fe6aa2ebc0a02284448aaa9026a8aa7661d53245`](https://polygonscan.com/tx/0x57caeffe39e26352bc83af72fe6aa2ebc0a02284448aaa9026a8aa7661d53245) |
| **Block** | [83,103,652](https://polygonscan.com/block/83103652) |
| **Gas Used** | 526,903 |
| **Freeze Tx** | [`0x70b65cdd4146fd24f6649d9143fc12df3751b35db5affecfb3e6f8096b35e4f8`](https://polygonscan.com/tx/0x70b65cdd4146fd24f6649d9143fc12df3751b35db5affecfb3e6f8096b35e4f8) |
| **ECDSA Signed** | Yes (editionRoot signed by author wallet) |

---

## On-Chain State Summary

### LiteraryAnchor

| Field | Value |
|-------|-------|
| **editionCount()** | 6 |
| **genesis().ipfsCID** | `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK` |
| **latest().ipfsCID** | `QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV` |
| **latest().sha256Hash** | `77bb9f5e3f3a6908f96f2519e6b20b7ee15351b08ba962792da4306bfb3a123a` |
| **latest().note** | "PPE Puppetry — 16 files, 117109 bytes. Stories collection. Audio rendered via Kokoro TTS." |

### PublishingKernelV2

| Field | Value |
|-------|-------|
| **editionCount()** | 3 |
| **getEdition(0).ipfsCID** | `QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK` (Genesis, frozen) |
| **getEdition(1).ipfsCID** | `pending-ipfs-pin` (placeholder, frozen) |
| **getEdition(2).ipfsCID** | `QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV` (Stories, frozen) |

### Edition Map (Both Contracts)

| Index | Contract | Work | CID | Status |
|:-----:|----------|------|-----|:------:|
| 0 | LiteraryAnchor | Genesis (Novel) | `QmVQ79NM...` | Immutable |
| 1–3 | LiteraryAnchor | Novel Ed. 2 (nonce triplicate) | `QmPXtEsR...` | Immutable |
| 4 | LiteraryAnchor | Stories (placeholder) | `pending-ipfs-pin` | Immutable |
| 5 | LiteraryAnchor | *Private Placement Puppetry* | `QmahPEAZ...` | Immutable |
| 0 | KernelV2 | Genesis (Novel) | `QmVQ79NM...` | Frozen + Signed |
| 1 | KernelV2 | Stories (placeholder) | `pending-ipfs-pin` | Frozen + Signed |
| 2 | KernelV2 | *Private Placement Puppetry* | `QmahPEAZ...` | Frozen + Signed |

---

## Infrastructure

### IPFS

| Field | Value |
|-------|-------|
| **Runtime** | Kubo v0.39.0 (via IPFS Desktop) |
| **API** | `http://127.0.0.1:5001` |
| **Gateway** | `http://127.0.0.1:8080` |
| **Public Gateway** | `https://ipfs.io/ipfs/` |

#### Pinned CIDs

| CID | Work | Type |
|-----|------|------|
| [`QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK`](https://ipfs.io/ipfs/QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK) | Genesis (Novel) | Recursive |
| [`QmPXtEsRwiWuaKmKNA569XAqFNVySN8pwTdGQrvcdpgtMa`](https://ipfs.io/ipfs/QmPXtEsRwiWuaKmKNA569XAqFNVySN8pwTdGQrvcdpgtMa) | Novel Ed. 2 | Recursive |
| [`QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV`](https://ipfs.io/ipfs/QmahPEAZuWz3dFa55BsNgBEkjBzvWm5M3xbGaRYwm581LV) | *Private Placement Puppetry* (Stories) | Recursive |

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
*Protocol: The 2,500 Donkeys + Private Placement Puppetry*
*Author: Kidd James*
