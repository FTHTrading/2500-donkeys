# ADR-0005: ECDSA Author Identity Binding

**Status:** Accepted  
**Date:** 2026-02-14  
**Author:** Kevan Burns  
**Domain:** Identity & Authentication

## Context

Literary protocols need a way to bind a real-world author identity (pen name, legal name, organization) to an on-chain wallet address. Without this binding, anyone who knows the contract address could claim authorship.

Two fundamental approaches exist:

1. **Oracle-based:** A trusted third party (e.g., ENS, World ID) attests to identity.
2. **Self-sovereign:** The author cryptographically signs their identity claim with their deployment wallet.

## Decision

**Self-sovereign identity via ECDSA signature binding in the AuthorIdentity contract.**

The AuthorIdentity contract stores:
- Author identity (real name, pseudonym, organization, domain, Amazon URL)
- Bibliography (12 works with titles, ISBNs, and on-chain edition references)
- Linked contracts (4 contract addresses in the protocol ecosystem)

All write operations are restricted to the `immutable author` address set at deployment. The author's wallet signature is the sole proof of identity — no external oracle, no multisig, no governance vote.

## Rationale

1. **No trust dependency:** Oracle-based identity requires trusting the oracle. ECDSA binding requires trusting only the private key holder — which is the author.
2. **Composability:** Any contract or frontend can call `getIdentity()` and `verifySignature()` to confirm authorship without off-chain lookups.
3. **Cost:** Single deployment transaction. No ongoing oracle fees or subscription costs.
4. **Legal alignment:** The pen name → wallet binding creates a timestamped, immutable record that can serve as evidence in IP disputes.

## Implementation

```solidity
address public immutable author;

modifier onlyAuthor() {
    require(msg.sender == author, "Only the author");
    _;
}

function getIdentity() external view returns (Identity memory);
function getBibliographyCount() external view returns (uint256);
function getLinkedContractCount() external view returns (uint256);
```

The `author` address is `0xC91668184736BF75C4ecE37473D694efb2A43978` — set once at deployment, stored in contract bytecode, unmodifiable.

## Consequences

- **Positive:** Zero ongoing cost, no oracle dependency, composable on-chain identity.
- **Negative:** If the author wallet private key is compromised, the attacker could update bibliography entries (but cannot change the `author` address itself, nor modify frozen editions on other contracts).
- **Mitigation:** See `security/private-key-operational-guidelines.md`.

## Alternatives Considered

| Approach | Rejected Because |
|----------|-----------------|
| ENS name resolution | Requires ENS registration, annual renewal, Ethereum L1 dependency |
| World ID / Proof of Humanity | Biometric dependency, centralized verification |
| Multisig governance | Over-complex for a single-author system |
| DID (Decentralized Identifier) | Spec fragmentation, no widely-adopted Polygon implementation |
