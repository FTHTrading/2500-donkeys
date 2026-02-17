# Deployment Procedure

**LPS-1 Reference Implementation — Site Deployment Standard**

---

## Architecture

| Layer | Role | Endpoint |
|-------|------|----------|
| **GitHub** | Source of truth | `FTHTrading/2500-donkeys` (private, master branch) |
| **Cloudflare Pages** | Manually deployed artifact | Project: `2500-donkeys` |
| **Production URL** | Canonical deployment endpoint | `https://production.2500-donkeys.pages.dev` |
| **Custom Domain** | CDN-cached edge layer | `https://xxxiii.io` |

> **Important:** Git Provider is **not connected**. Pushes to GitHub do **not** trigger Cloudflare deployments. Deployment is an explicit release step.

---

## Wrangler Deploy Command

```powershell
npx wrangler pages deploy site --project-name=2500-donkeys --branch=production
```

| Parameter | Value |
|-----------|-------|
| **Source directory** | `site/` |
| **Project name** | `2500-donkeys` |
| **Branch** | `production` |
| **Production alias** | `https://production.2500-donkeys.pages.dev` |
| **Preview pattern** | `https://<hash>.2500-donkeys.pages.dev` |

---

## Pre-Deploy Checklist

Before each production deploy:

- [ ] **1. Run verifier locally**
  ```powershell
  cd verify && node cli.js --path ../manuscript
  ```

- [ ] **2. Confirm contract addresses unchanged**
  Cross-reference `DEPLOYMENTS.md` against `site/index.html` contract badges.

  | Contract | Address |
  |----------|---------|
  | LiteraryAnchor | `0x97f456300817eaE3B40E235857b856dfFE8bba90` |
  | KernelV2 | `0xca9F6604A9b498DB31d113836E2957c0a9aAE037` |
  | AuthorIdentity | `0xB9ffa688A8Bb332221030BbBE46bE5bF03323170` |
  | RoyaltyRouter | `0x44169829489d70aaecbf845870652871C65fC461` |
  | EditionNFT | `0x9e9Cc1486bf440Bd9eAaaD947958524Aaed3f8b0` |
  | StoryNFT | `0xD67e537Dba1236f802432cbDD30Fec3f6D38e7E3` |
  | Kernel (v1) | `0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae` |

- [ ] **3. Confirm edition roots unchanged**
  Verify canonical edition root matches on-chain state via Polygonscan read contract.

- [ ] **4. Commit with semantic message**
  ```powershell
  git add -A
  git commit -m "release: <description>"
  git push origin master
  ```

- [ ] **5. Deploy via Wrangler**
  ```powershell
  npx wrangler pages deploy site --project-name=2500-donkeys --branch=production
  ```

- [ ] **6. Verify production URL**
  Open `https://production.2500-donkeys.pages.dev` and confirm:
  - Hero text renders correctly
  - On-chain state panel populates (block number, contract reads)
  - Navigation links resolve
  - Footer shows correct year and branding
  - Theme toggle works (light/dark)

- [ ] **7. Purge Cloudflare cache**
  In Cloudflare dashboard → `xxxiii.io` → Caching → Purge Everything.
  Or via API:
  ```powershell
  curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" `
    -H "Authorization: Bearer <API_TOKEN>" `
    -H "Content-Type: application/json" `
    -d '{"purge_everything":true}'
  ```

---

## Verification Endpoints

| Purpose | URL |
|---------|-----|
| Production (canonical) | `https://production.2500-donkeys.pages.dev` |
| Custom domain | `https://xxxiii.io` |
| Preview (per-deploy) | `https://<hash>.2500-donkeys.pages.dev` |
| Polygonscan (contracts) | `https://polygonscan.com/address/<contract>#code` |
| Public repo | `https://github.com/FTHTrading/LPS-1-Reference-Implementation` |

---

## Operational Redundancy

If `xxxiii.io` serves stale content after a deploy:

1. Verify at `production.2500-donkeys.pages.dev` (bypasses CDN cache)
2. Share the production URL directly with reviewers if needed
3. Purge Cloudflare cache (see step 7 above)
4. Hard refresh browser (`Ctrl+Shift+R`)

---

## Deployment History

| Date | Commit | Deploy Hash | Notes |
|------|--------|-------------|-------|
| 2026-02-17 | `55821d0` | `dfa7afd9` | CSS contrast fix — orphan vars mapped to theme system |
| 2026-02-17 | `11ae155` | — | Roman numeral data fixes + footer branding |
| 2026-02-16 | `8cca64e` | — | Institutional tone scrub + cold hero rewrite |

---

*Standards don't rely on memory. They rely on procedure.*
