# XXXIII Working Group

## Scope

The XXXIII Working Group maintains the Deterministic Literary Publishing
Standard (LPS-1) and its reference implementation. The protocol defines
cryptographic proof-of-origin, content integrity verification, and
immutable on-chain anchoring for literary works.

## Versioning Authority

All specification versions are authored and approved by the Protocol Author.
Version numbers follow semantic versioning (MAJOR.MINOR.PATCH).

| Version | Date       | Description                                    |
|---------|------------|------------------------------------------------|
| 0.1.0   | 2025-06-15 | Initial manuscript hashing pipeline            |
| 1.0.0   | 2026-01-15 | Full Merkle architecture, Polygon deployment   |
| 2.0.0   | 2026-02-15 | Protocol demonstration layer, observability     |

## Decision Process

1. Proposals are filed as GitHub issues with the `proposal` label.
2. Technical evaluation by the Protocol Author.
3. Reference implementation updated to reflect accepted changes.
4. Specification document updated. Version tag applied.

All decisions are recorded as Architecture Decision Records (ADRs) in
`docs/adr/`.

## Roles

| Role                           | Entity      |
|--------------------------------|-------------|
| Protocol Author                | Kidd James  |
| Specification Steward          | XXXIII WG   |
| Reference Implementation       | FTHTrading  |
| Security Review                | Internal    |

## Upgrade Path

The protocol uses non-upgradeable smart contracts. Protocol evolution
occurs through new contract deployments, not proxy upgrades. Previous
versions remain permanently accessible on-chain.

## Future Improvement Proposals

| Proposal | Title                          | Status   |
|----------|--------------------------------|----------|
| LPS-2    | Cross-chain anchor standard    | Draft    |
| LPS-3    | Zero-knowledge proof of origin | Research |
| LPS-4    | Multi-author edition support   | Proposed |
| LPS-5    | Audio edition Merkle standard  | Active   |

## Contact

- GitHub: [FTHTrading/2500-donkeys](https://github.com/FTHTrading/2500-donkeys)
- ORCID: [0009-0008-8425-939X](https://orcid.org/0009-0008-8425-939X)
- DOI: [10.5281/zenodo.18646886](https://doi.org/10.5281/zenodo.18646886)
