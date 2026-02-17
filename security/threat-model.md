# Threat Model

**The 2,500 Donkeys — Protocol Security Assessment**  
**Version:** 1.0  
**Date:** February 2026  
**Author:** Kevan Burns

---

## 1. System Boundaries

The protocol operates across five layers, each with distinct trust assumptions and attack surfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY                           │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ Local FS  │──│   Git     │──│  IPFS Pin  │              │
│  │ (author)  │  │ (GitHub)  │  │ (pinning)  │              │
│  └───────────┘  └───────────┘  └───────────┘              │
│        │              │              │                      │
│        └──────────────┼──────────────┘                      │
│                       ▼                                     │
│              ┌──────────────┐                               │
│              │   Polygon    │  ← Immutable after deploy     │
│              │  (7 contracts)│                               │
│              └──────────────┘                               │
│                       │                                     │
│                       ▼                                     │
│              ┌──────────────┐                               │
│              │   Bitcoin    │  ← Cross-chain timestamp      │
│              │  (OTS proof) │                               │
│              └──────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

## 2. Threat Categories

### 2.1 Smart Contract Threats

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| **Unauthorized anchoring** | Critical | `onlyAuthor` modifier on all write functions. `immutable author` address set in constructor. | ✅ Mitigated |
| **Proxy upgrade attack** | Critical | No proxy pattern. No upgrade mechanism. No admin keys. See ADR-0001. | ✅ Mitigated |
| **Reentrancy** | High | RoyaltyRouter uses pull-based withdrawal. No external calls in state-changing functions. | ✅ Mitigated |
| **Integer overflow** | Medium | Solidity 0.8.19 has built-in overflow checks. No `unchecked` blocks. | ✅ Mitigated |
| **Front-running** | Low | Edition anchoring is author-only. No public-facing transactions to front-run. | ✅ N/A |
| **Storage collision** | N/A | No proxy pattern — no delegatecall, no storage layout concerns. | ✅ N/A |
| **Selfdestruct** | N/A | No `selfdestruct` in any contract. Cannot be bricked. | ✅ Mitigated |

### 2.2 Key Management Threats

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| **Private key compromise** | Critical | See `private-key-operational-guidelines.md`. Hardware wallet recommended. | ⚠️ Operational |
| **Key loss** | High | Non-recoverable — but all data is on-chain and on IPFS. Protocol state survives key loss. Only new anchoring stops. | ⚠️ Documented |
| **Phishing / social engineering** | Medium | Single operator. No team keys to phish. No multisig signers to compromise. | ✅ Low exposure |

### 2.3 Infrastructure Threats

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| **RPC endpoint failure** | Medium | Graceful degradation in UI. Fallback RPCs documented. See `rpc-fallback-strategy.md`. | ✅ Mitigated |
| **IPFS content unavailability** | Medium | Content pinned on multiple services. CID is deterministic — can be re-pinned from source. | ✅ Mitigated |
| **GitHub repository deletion** | Low | Protocol state lives on-chain. Manuscript can be rebuilt from IPFS CID. Git is convenience, not dependency. | ✅ Mitigated |
| **Cloudflare Pages outage** | Low | Site is static HTML. Can be redeployed anywhere. Chain reads work from any ethers.js environment. | ✅ Mitigated |
| **DNS hijacking (xxxiii.io)** | Medium | Site is informational only. No wallet connections, no write transactions. Worst case: misinformation, not fund loss. | ⚠️ Operational |

### 2.4 Content Integrity Threats

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| **Silent manuscript revision** | Critical | SHA-256 hash on-chain. Any modification produces a different hash. Detectable by anyone. | ✅ Mitigated |
| **Merkle tree manipulation** | High | Trees are rebuilt from source and compared against on-chain roots. `npm run lps:verify` catches discrepancies. | ✅ Mitigated |
| **Build pipeline tampering** | Medium | CI runs verification on every push. `npm run build:reproducible` produces byte-identical output. | ✅ Mitigated |
| **Forged authorship claim** | High | AuthorIdentity contract binds pen name to ECDSA-verified wallet address. Forgery requires private key. | ✅ Mitigated |

## 3. Attack Scenarios

### Scenario A: Attacker claims to be the author
**Vector:** Deploy a new contract with copied CIDs.  
**Defense:** On-chain timestamps. The original deployment at block 83,002,198 predates any copy. AuthorIdentity contract provides ECDSA-verified binding. Polygonscan deployment timestamps are immutable.

### Scenario B: Attacker modifies manuscript and claims it's canonical
**Vector:** Alter a chapter, recompile, claim new version is "the real one."  
**Defense:** On-chain SHA-256 doesn't match. On-chain edition root doesn't match. `npm run lps:verify` fails at Phase 3 (Merkle) and Phase 4 (On-Chain). The frozen canonical edition on KernelV2 is immutable.

### Scenario C: RPC returns false data
**Vector:** Compromised or malicious RPC endpoint returns fabricated contract reads.  
**Defense:** Users can verify against Polygonscan directly. Multiple independent RPCs produce the same results. Site observability is informational — the source of truth is the chain, not the site.

## 4. Security Properties

| Property | Guarantee |
|----------|-----------|
| **Immutability** | No function exists to modify deployed contract logic |
| **Author exclusivity** | Only `0xC916...3978` can anchor, register, or modify |
| **Append-only history** | Editions can be added but never removed or modified |
| **Freeze permanence** | Once `isFrozen = true`, no function can unfreeze |
| **Deterministic verification** | Any third party can independently verify all claims |

## 5. Out of Scope

- Token economics (no tokens exist)
- MEV (no public-facing transactions)
- Governance attacks (no governance mechanism)
- Bridge exploits (no cross-chain token bridges)
- Flash loan attacks (no DeFi integrations)

---

*Last updated: February 2026*
