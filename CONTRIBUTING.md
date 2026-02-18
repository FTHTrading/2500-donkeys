# Contributing to LPS-1

Thank you for your interest in contributing to the Literary Publishing Standard.

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/FTHTrading/2500-donkeys.git
cd 2500-donkeys
npm install

# Compile contracts
npx hardhat compile

# Run tests (293 tests across 7 suites)
npx hardhat test

# Run provenance verifier (58 verification tests)
npm run lps:verify
```

---

## What You Can Contribute

### Code
- **Smart contract improvements** — gas optimisation, test coverage expansion
- **Build pipeline** — deterministic hashing, Merkle tree construction
- **Verification tooling** — client-side verifier, CLI tools
- **Site** — accessibility, performance, UX improvements

### Documentation
- **Specification** — clarity improvements, examples, errata
- **Integration guides** — how to implement LPS-1 in your own project
- **Translations** — specification and documentation

### Research
- **Security analysis** — contract auditing, formal verification
- **Comparative studies** — LPS-1 vs existing provenance standards
- **Implementation reports** — deploying LPS-1 for your own works

---

## Development Guidelines

### Code Style
- Solidity: follow existing contract patterns (Solidity 0.8.19, no proxies, no upgradeability)
- JavaScript/Node.js: ES modules where possible, explicit error handling
- HTML/CSS: semantic markup, accessible by default, no build step for the site

### Commit Messages
Use clear, descriptive commit messages:
```
Fix: resolve dark-on-dark contrast in mint.html
Add: SRI integrity hash for ethers.js CDN load
Harden: multi-RPC fallback for on-chain state panel
```

### Testing
- All contract changes must include corresponding test updates
- Run the full suite before submitting: `npx hardhat test`
- Run the provenance verifier to ensure hash integrity: `npm run lps:verify`

---

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `master`
3. Make your changes with clear commit messages
4. Ensure all tests pass locally
5. Submit a pull request with a description of what changed and why

PRs are reviewed by the protocol maintainer. Expect feedback within 7 days.

---

## Architecture Notes

- **Contracts are non-upgradeable.** Changes to deployed contracts require new deployments and specification amendments.
- **Hashes are deterministic.** Any change to source files will change SHA-256 hashes and break provenance verification. This is by design.
- **The site has no build step.** HTML files in `site/` are deployed directly to Cloudflare Pages via Wrangler.
- **Line endings matter.** Manuscript files use CRLF (enforced via `.gitattributes`) because genesis hashes were computed on Windows.

---

## Specification Amendments

Changes to the LPS-1 specification follow the governance model defined in [`docs/spec/GOVERNANCE.md`](docs/spec/GOVERNANCE.md). Specification amendments require:

1. An RFC-style proposal document
2. Review period (minimum 14 days)
3. Approval by the specification steward

---

## Code of Conduct

This project follows a professional, respectful standard of conduct. Contributors are expected to:

- Engage constructively and in good faith
- Focus on technical merit
- Respect differing viewpoints and experience levels
- Accept constructive criticism gracefully

---

## License

By contributing, you agree that your contributions will be licensed under:
- **MIT** for infrastructure and code
- **CC BY 4.0** for specification and documentation
