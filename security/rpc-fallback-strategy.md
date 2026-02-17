# RPC Fallback Strategy

**The 2,500 Donkeys — Chain Read Resilience**  
**Version:** 1.0  
**Date:** February 2026

---

## Overview

The xxxiii.io site reads live chain state from Polygon mainnet via public RPC endpoints. Public RPCs have no SLA — they can rate-limit, go down, or return errors at any time. This document defines the fallback strategy.

## Current Configuration

```javascript
// Primary RPC (site/index.html)
var RPC = 'https://polygon-rpc.com';
```

**Why `polygon-rpc.com`:**
- Official Polygon Foundation endpoint
- No API key required
- Supports all standard JSON-RPC methods
- Reasonable rate limits for read-only calls

## Fallback Endpoints

If the primary RPC fails, the following endpoints can be substituted. All are free, public, and require no authentication for read-only calls.

| Priority | Endpoint | Provider | Rate Limit |
|----------|----------|----------|------------|
| 1 (Primary) | `https://polygon-rpc.com` | Polygon Foundation | ~100 req/s |
| 2 | `https://1rpc.io/matic` | Automata 1RPC | Privacy-preserving, moderate |
| 3 | `https://polygon-bor-rpc.publicnode.com` | PublicNode | ~50 req/s |
| 4 | `https://rpc.ankr.com/polygon` | Ankr | ~30 req/s (free tier) |
| 5 | `https://polygon.llamarpc.com` | LlamaRPC | ~30 req/s |

## Failure Modes

### Mode 1: RPC Timeout (> 10s)
**Behavior:** ethers.js throws a timeout error. `Promise.allSettled` catches it.  
**User impact:** One or more chain data cards show em-dashes (—). Green dot turns red.  
**Resolution:** Click "Refresh" to retry. If persistent, requires code change to fallback RPC.

### Mode 2: Rate Limiting (HTTP 429)
**Behavior:** RPC returns 429 Too Many Requests.  
**User impact:** Same as timeout — partial data, error state.  
**Resolution:** Unlikely with current usage (11 read calls + 3 event queries per page load). Only triggered by aggressive manual refreshing.

### Mode 3: RPC Data Inconsistency
**Behavior:** RPC returns stale or incorrect data (rare but possible with load-balanced endpoints).  
**User impact:** Data may be slightly behind the head block.  
**Resolution:** Cross-verify against Polygonscan. The site is informational — the chain is the source of truth.

### Mode 4: Complete RPC Outage
**Behavior:** All endpoints unreachable.  
**User impact:** Entire Live Chain Status section shows loading state.  
**Resolution:** All contracts remain independently verifiable on Polygonscan. Links to read-contract pages are provided in the Verify section.

## Future Enhancement: Automatic Fallback

When the site warrants it, implement a fallback array:

```javascript
var RPC_ENDPOINTS = [
  'https://polygon-rpc.com',
  'https://1rpc.io/matic',
  'https://polygon-bor-rpc.publicnode.com',
  'https://rpc.ankr.com/polygon'
];

async function getProvider() {
  for (var i = 0; i < RPC_ENDPOINTS.length; i++) {
    try {
      var provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[i]);
      await provider.getBlockNumber(); // health check
      return provider;
    } catch(e) { continue; }
  }
  throw new Error('All RPCs unreachable');
}
```

**Not implemented yet** because:
- Single-user site with low traffic
- Primary RPC has been reliable
- Adds code complexity without current need

Will be implemented when traffic volume or reliability data justifies it.

## Monitoring

Currently manual. If the green dot on the site is not green, investigate:

1. Open browser DevTools → Console → look for `[XXXIII] Chain read error`
2. Test primary RPC: `curl https://polygon-rpc.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`
3. If primary is down, update `RPC` variable in `site/index.html` to next fallback
4. Deploy updated site to Cloudflare Pages

---

*Last updated: February 2026*
