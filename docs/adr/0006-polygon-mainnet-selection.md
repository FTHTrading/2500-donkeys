# ADR-0006: Polygon Mainnet as Primary Chain

**Status:** Accepted  
**Date:** 2026-02-14  
**Author:** Kevan Burns  
**Domain:** Infrastructure

## Context

The protocol requires an EVM-compatible blockchain with:

- Low transaction costs (multiple contract deployments + edition anchoring)
- Fast finality (anchoring should confirm in seconds, not minutes)
- Source verification infrastructure (Polygonscan/Etherscan equivalent)
- Public RPC availability (no API key required for read-only calls)
- Long-term viability (chain must outlive the author)

## Decision

**Deploy all contracts to Polygon Mainnet (Chain ID 137).**

Seven contracts deployed. Total cost: ~$2.50 in POL.

| Contract | Address | Deploy Cost |
|----------|---------|-------------|
| LiteraryAnchor | `0x97f4...b890` | 0.887 POL |
| PublishingKernel | `0x511c...E8ae` | ~0.15 POL |
| PublishingKernelV2 | `0xca9F...C037` | ~0.45 POL |
| RoyaltyRouter | `0x4416...C461` | ~0.12 POL |
| AuthorIdentity | `0xB9ff...3170` | ~0.18 POL |
| EditionNFT | `0x9e9C...f8b0` | ~0.35 POL |
| StoryNFT | `0xD67e...e7E3` | ~0.40 POL |

## Rationale

1. **Cost:** 7 contract deployments + multiple anchor transactions for ~$2.50. The same on Ethereum L1 would cost ~$500–$2,000 depending on gas prices.
2. **Speed:** Polygon produces blocks every ~2 seconds. Edition anchoring confirms almost immediately.
3. **Verification:** Polygonscan provides full source verification, read/write UI, and event log browsing — critical for independent reviewers.
4. **Public RPCs:** `polygon-rpc.com`, `1rpc.io/matic`, `ankr.com/polygon`, `llamarpc.com` — all free, no API key needed for read calls.
5. **EVM compatibility:** Solidity 0.8.19, OpenZeppelin 4.9.6, Hardhat 2.28.6 — standard toolchain with no chain-specific modifications.
6. **Cross-chain future:** Bitcoin timestamping via OpenTimestamps provides a secondary anchor. Ethereum L1 anchoring is evaluated but not yet deployed (see Cross-Chain section on site).

## Consequences

- **Positive:** Sub-dollar deployment. Fast finality. Full source verification. Public readability.
- **Negative:** Polygon is an L2/sidechain — it inherits Ethereum security partially, not fully. Chain reorgs are theoretically possible (though rare on Polygon PoS).
- **Mitigation:** Bitcoin OpenTimestamps provides a cross-chain temporal anchor. If Polygon chain state were ever disputed, the BTC timestamp provides independent corroboration.

## Alternatives Considered

| Chain | Rejected Because |
|-------|-----------------|
| Ethereum L1 | Gas costs prohibitive ($500+ for 7 deployments) |
| Arbitrum | Newer, less established Polygonscan-equivalent tooling |
| Optimism | Same — viable but Polygon's ecosystem maturity wins |
| Base | Coinbase dependency, less decentralized perception |
| Solana | Non-EVM, different toolchain, less source verification infrastructure |
| Bitcoin (Ordinals) | No smart contract logic, can't store structured edition metadata |
