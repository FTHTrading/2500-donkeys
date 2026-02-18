# Security Policy

**Project:** LPS-1 — Literary Publishing Standard
**Maintainer:** XXXIII Working Group (FTH Trading)
**Scope:** Smart contracts, site infrastructure, build pipeline

---

## Reporting a Vulnerability

If you discover a security vulnerability in the LPS-1 protocol, smart contracts, or site infrastructure, please report it responsibly:

**Email:** kevan.burns@fthtrading.com
**Subject line:** `[SECURITY] LPS-1 — <brief description>`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Affected component (contract, site, pipeline)
- Potential impact assessment

We will acknowledge receipt within 48 hours and provide an initial assessment within 7 days.

**Do not** open a public GitHub issue for security vulnerabilities.

---

## Scope

The following components are in scope for security reports:

| Component | Location | Type |
|-----------|----------|------|
| LiteraryAnchor | `0x97f456300817eaE3B40E235857b856dfFE8bba90` | Smart contract (Polygon) |
| KernelV2 | `0xca9F6604A9b498DB31d113836E2957c0a9aAE037` | Smart contract (Polygon) |
| AuthorIdentity | `0xB9ffa688A8Bb332221030BbBE46bE5bF03323170` | Smart contract (Polygon) |
| RoyaltyRouter | `0x44169829489d70aaecbf845870652871C65fC461` | Smart contract (Polygon) |
| EditionNFT | `0x9e9Cc1486bf440Bd9eAaaD947958524Aaed3f8b0` | Smart contract (Polygon) |
| StoryNFT | `0xD67e537Dba1236f802432cbDD30Fec3f6D38e7E3` | Smart contract (Polygon) |
| Kernel (v1) | `0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae` | Smart contract (Polygon) |
| Site | `xxxiii.io` | Static site (Cloudflare Pages) |
| Build pipeline | `scripts/`, `verify/` | Node.js tooling |

---

## Security Documentation

- **Threat Model:** [`security/threat-model.md`](security/threat-model.md) — Full threat analysis with categorised risks and mitigations
- **Key Management:** [`security/private-key-operational-guidelines.md`](security/private-key-operational-guidelines.md) — Operational security for signing keys

---

## Security Properties

All seven smart contracts are **non-upgradeable by design**:

- No proxy pattern
- No admin key
- No governance override
- No `selfdestruct` or `delegatecall`
- Forward-only edition lifecycle (Draft → Anchored → Frozen)

State transitions are enforced on-chain. Once an edition is frozen, it cannot be modified or deleted by any party, including the contract deployer.

---

## Third-Party Audit

A third-party security audit of all seven deployed contracts is planned and budgeted as part of the Phase II roadmap. The audit report will be published in this repository upon completion.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.1 (current) | Yes |
| < 1.0 | No |
