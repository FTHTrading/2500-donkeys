# ADR-0004: Client-Side Observability (No Backend)

**Status:** Accepted  
**Date:** 2026-02-17  
**Author:** Kevan Burns  
**Domain:** Site Architecture

## Context

The xxxiii.io site needs to display live protocol state — edition counts, freeze status, NFT supply, event history — to prove the system is running, not just documented. Three approaches were evaluated:

1. **Server-side API:** Backend service polls chain, caches data, serves JSON to frontend.
2. **Serverless functions:** Cloudflare Workers or Vercel Edge Functions read chain state on request.
3. **Client-side direct RPC:** Browser loads ethers.js, reads chain state directly from public RPCs.

## Decision

**Client-side direct RPC via ethers.js v6.**

Architecture: `Browser → ethers.js → Public Polygon RPC → Read-only contract calls`

- No backend server. No API keys. No caching layer. No server state.
- Ethers.js v6.13.4 loaded via CDN (`jsdelivr.net`)
- Public RPC: `polygon-rpc.com` (no authentication required for read calls)
- All reads via `Promise.allSettled` for graceful partial failure
- Event logs queried from last ~200k blocks (~7 days on Polygon)

## Rationale

1. **Zero infrastructure:** The site is static HTML/CSS/JS on Cloudflare Pages. No server to maintain, no uptime to monitor, no credentials to rotate.
2. **Trustlessness:** Users verify chain state themselves. The site doesn't tell them what the chain says — their browser reads it directly. No intermediary.
3. **Cost:** $0/month. No backend hosting, no database, no API subscription.
4. **Censorship resistance:** Even if the site goes down, the contract state is readable by anyone with ethers.js and a Polygon RPC.
5. **Consistency with protocol values:** A protocol about eliminating trust intermediaries should not introduce a trust intermediary in its own interface.

## Implementation Details

- **Read-only ABIs:** Minimal human-readable ABI strings for each contract — only the view functions needed.
- **Parallel reads:** 11 independent contract calls dispatched simultaneously via `Promise.allSettled`.
- **Graceful degradation:** If any single read fails, the rest still populate. Failed fields show em-dashes.
- **Event decoding:** `EditionAnchored` and `EditionFrozen` events decoded and rendered in a timeline.
- **Manual refresh:** Button triggers re-read. No auto-polling (respects RPC rate limits).

## Consequences

- **Positive:** Zero operational cost, full trustlessness, no backend attack surface.
- **Negative:** Depends on public RPC availability. If `polygon-rpc.com` is down, reads fail. Mitigated by graceful degradation + error state UI.
- **Future consideration:** Add RPC fallback array (Ankr, 1RPC, LlamaRPC) for redundancy. See `security/rpc-fallback-strategy.md`.

## Alternatives Considered

| Approach | Rejected Because |
|----------|-----------------|
| Server-side API | Adds infrastructure cost, maintenance burden, and trust dependency |
| Serverless edge functions | Still requires deployment pipeline and API key management |
| The Graph subgraph | Complex deployment, hosted service dependency, indexing lag |
| Alchemy/Infura SDK | API key required, rate limits, vendor lock-in |
