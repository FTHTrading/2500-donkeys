# Private Key Operational Guidelines

**The 2,500 Donkeys — Key Management Policy**  
**Version:** 1.0  
**Date:** February 2026  
**Classification:** Internal — Operational Security

---

## Scope

This document covers the operational security of the author wallet private key used for all on-chain operations across the protocol.

| Field | Value |
|-------|-------|
| **Author Wallet** | `0xC91668184736BF75C4ecE37473D694efb2A43978` |
| **Chain** | Polygon Mainnet (Chain ID 137) |
| **Contracts Controlled** | 7 (all `onlyAuthor` restricted) |
| **Key Usage** | Edition anchoring, identity updates, NFT operations |

## Risk Assessment

### What the key can do:
- Anchor new editions on LiteraryAnchor
- Register and freeze editions on PublishingKernelV2
- Update bibliography on AuthorIdentity
- Mint NFTs on EditionNFT and StoryNFT
- Distribute royalties via RoyaltyRouter

### What the key cannot do:
- Modify existing anchored editions (append-only)
- Unfreeze a frozen edition (permanent)
- Change the `immutable author` address on any contract
- Delete or overwrite the genesis edition
- Modify verified source code on Polygonscan

### Consequence of compromise:
- Attacker could anchor spurious editions (detectable — they won't match IPFS content)
- Attacker could mint unauthorized NFTs (detectable — supply visible on-chain)
- Attacker could update AuthorIdentity bibliography (reversible by re-updating after key recovery)
- Attacker **cannot** alter frozen editions, genesis records, or deployment history

### Consequence of loss:
- No new editions can be anchored
- No new NFTs can be minted
- All existing on-chain state remains intact and verifiable
- Protocol continues to function for verification — only new operations stop

## Storage Guidelines

### Required
- Private key stored in `.env` file (gitignored)
- `.env` never committed to any repository
- `.gitignore` includes `.env` on first line

### Recommended
- Hardware wallet (Ledger, Trezor) for signing transactions
- Encrypted backup of seed phrase / private key in offline storage
- No private key in cloud storage, email, or messaging apps

### Prohibited
- Private key in source code
- Private key in commit history
- Private key in CI/CD environment variables (except ephemeral secrets)
- Private key shared with any third party

## Operational Procedures

### Before anchoring a new edition:
1. Verify local build: `npm run lps:verify`
2. Confirm IPFS pin is accessible via public gateway
3. Double-check edition metadata (title, CID, hash)
4. Sign and submit transaction
5. Verify on Polygonscan within 60 seconds

### Before minting NFTs:
1. Confirm edition is anchored and frozen on KernelV2
2. Verify tier supply configuration matches intent
3. Test mint on Amoy testnet first (if new tier)
4. Sign and submit on mainnet
5. Verify `totalSupply()` incremented correctly

### Incident response (suspected compromise):
1. **Immediately:** Transfer any POL balance to a new wallet
2. **Within 1 hour:** Document the compromise in git history
3. **Within 24 hours:** Deploy new contracts with a new wallet if necessary
4. **Communicate:** Update site and README with new wallet address
5. **Preserve:** All existing on-chain records remain valid — frozen editions are immutable

## Environment File Template

```bash
# .env — NEVER commit this file
POLYGON_RPC=https://polygon-bor-rpc.publicnode.com
AUTHOR_WALLET=0xC91668184736BF75C4ecE37473D694efb2A43978
PRIVATE_KEY=your_private_key_without_0x_prefix
POLYGONSCAN_API_KEY=your_polygonscan_api_key
AMOY_RPC=https://rpc-amoy.polygon.technology
```

## Verification

Confirm the `.env` file is properly gitignored:

```bash
git status --porcelain | grep .env
# Should return nothing — .env must not be tracked
```

---

*Last updated: February 2026*
