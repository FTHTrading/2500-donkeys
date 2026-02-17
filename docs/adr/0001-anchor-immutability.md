# ADR-0001: Anchor Immutability — No Upgradeable Proxies

**Status:** Accepted  
**Date:** 2026-02-14  
**Author:** Kevan Burns  
**Domain:** Smart Contracts

## Context

The LiteraryAnchor contract stores the genesis edition in its constructor. Once deployed, the question arises: should the contract support future upgrades via proxy patterns (e.g., UUPS, TransparentProxy)?

Upgradeable proxies would allow fixing bugs or adding features post-deployment. However, the entire protocol premise — *immutable proof-of-origin* — collapses if any party can modify contract logic after deployment.

## Decision

**All contracts are deployed as non-upgradeable, non-proxied implementations.**

- LiteraryAnchor: `immutable author`, genesis set in constructor
- PublishingKernelV2: `immutable author`, freeze is permanent
- RoyaltyRouter: Fixed split logic, pull-based withdrawals
- AuthorIdentity: `immutable author`, ECDSA-bound
- EditionNFT / StoryNFT: Fixed supply caps, immutable metadata URI

No admin keys. No upgrade paths. No governance multisig.

## Rationale

1. **Trust model:** The protocol replaces institutional trust with mathematical verifiability. An upgrade path reintroduces trust dependency on the key holder.
2. **Attack surface:** Proxy contracts add `delegatecall` complexity, storage collision risk, and initialization vulnerabilities (e.g., uninitialized proxy attacks).
3. **Audit simplicity:** Non-upgradeable contracts have a fixed, reviewable attack surface. The code on Polygonscan *is* the code that runs — forever.
4. **Precedent:** ENS NameWrapper, Uniswap V2 core, and other high-assurance contracts chose immutability for the same reasons.

## Consequences

- **Positive:** No rug-pull vector. No admin key compromise risk. Verification is permanent.
- **Negative:** Bugs cannot be patched in-place. New functionality requires deploying a new contract at a new address. Edition history must be migrated manually (which is what PublishingKernelV2 represents — the V2 of PublishingKernel).
- **Accepted trade-off:** Correctness and trust minimization outweigh upgrade convenience.

## Alternatives Considered

| Pattern | Rejected Because |
|---------|-----------------|
| UUPS Proxy | Introduces upgrade authority — contradicts immutability guarantee |
| Transparent Proxy | Admin slot adds complexity without benefit for a single-author system |
| Diamond / EIP-2535 | Extreme over-engineering for a literary anchoring use case |
| Beacon Proxy | Shared implementation mutation breaks per-contract integrity |
