# IPFS Upload Guide

## Prerequisites

You need one of these services (both have free tiers):

- **Pinata** — https://www.pinata.cloud (1GB free)
- **web3.storage** — https://web3.storage (5GB free)

## What to Upload

After running `npm run build`, upload:

1. `dist/final-manuscript.md` — The canonical compiled manuscript
2. `dist/manifest.json` — The tamper-evident file manifest

Optionally, upload the entire project as a directory pin for full archival.

## Using Pinata (Recommended for Simplicity)

### Via Web UI:
1. Create account at pinata.cloud
2. Go to "Files" → "Upload" → "File"
3. Upload `dist/final-manuscript.md`
4. Copy the CID

### Via CLI:
```bash
npm install -g @pinata/sdk
```

Or use curl:
```bash
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@dist/final-manuscript.md"
```

## After Upload

1. Copy the CID (e.g., `QmXyz...` or `bafy...`)
2. Update `web3/metadata/genesis.json`:
   - Set `ipfs.cid` to the CID
   - Set `ipfs.pinnedAt` to current ISO timestamp
   - Set `ipfs.gateway` to `https://ipfs.io/ipfs/YOUR_CID`
3. Verify access: open `https://ipfs.io/ipfs/YOUR_CID` in a browser

## The CID Is Your Literary Fingerprint

- Same content always produces the same CID
- If anyone changes a single character, the CID changes
- The CID is permanent — as long as at least one node pins it

This is your proof of first publication.
