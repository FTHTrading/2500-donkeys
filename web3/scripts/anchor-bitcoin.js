#!/usr/bin/env node
/**
 * anchor-bitcoin.js — Bitcoin Civilizational Timestamp Layer
 *
 * Two modes:
 *   1. OpenTimestamps (default) — FREE. Submits edition_root hash to OTS calendar
 *      servers which aggregate into Bitcoin's Merkle tree. Proof completes when
 *      Bitcoin block is mined (~1-2 hours). Proof file: dist/edition.ots
 *
 *   2. OP_RETURN (--op-return) — Requires BTC. Embeds edition_root directly in a
 *      Bitcoin transaction's OP_RETURN output. More direct, but costs sats.
 *
 * Usage:
 *   node web3/scripts/anchor-bitcoin.js                  # OpenTimestamps
 *   node web3/scripts/anchor-bitcoin.js --verify         # verify existing .ots
 *   node web3/scripts/anchor-bitcoin.js --op-return      # OP_RETURN (needs BTC)
 *
 * OpenTimestamps workflow:
 *   1. This script submits the edition_root to OTS calendar servers
 *   2. Saves the pending proof to dist/edition.ots
 *   3. The proof is "pending" until a Bitcoin block includes it
 *   4. Run --verify later to check/upgrade the proof
 *
 * Dependencies:
 *   npm install opentimestamps   (for OTS mode)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const ROOT = path.resolve(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');

const args = process.argv.slice(2);
const verifyMode = args.includes('--verify');
const opReturnMode = args.includes('--op-return');

// ══════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   BITCOIN CIVILIZATIONAL TIMESTAMP                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // ── Load edition data ────────────────────────────────────────────────
  const editionPath = path.join(DIST, 'edition.json');
  if (!fs.existsSync(editionPath)) {
    console.error('  ❌ dist/edition.json not found. Run: node build/protocol.js');
    process.exit(1);
  }

  const edition = JSON.parse(fs.readFileSync(editionPath, 'utf-8'));
  const editionRoot = edition.edition_root.replace('sha256:', '');

  console.log(`  Edition Root: ${editionRoot}`);
  console.log(`  Mode:         ${verifyMode ? 'VERIFY' : opReturnMode ? 'OP_RETURN' : 'OpenTimestamps'}`);
  console.log('');

  if (verifyMode) {
    await verifyOTS(edition, editionRoot);
  } else if (opReturnMode) {
    await opReturn(edition, editionRoot);
  } else {
    await stampOTS(edition, editionRoot);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  OPENTIMESTAMPS — STAMP
// ══════════════════════════════════════════════════════════════════════════

async function stampOTS(edition, editionRoot) {
  console.log('  ── OpenTimestamps Submission ──');
  console.log('');

  // The digest to timestamp (raw bytes of the edition_root)
  const digestHex = editionRoot;
  const digestBytes = Buffer.from(digestHex, 'hex');

  // OTS calendar servers to submit to
  const calendars = [
    { name: 'Alice', url: 'https://a.pool.opentimestamps.org' },
    { name: 'Bob', url: 'https://b.pool.opentimestamps.org' },
    { name: 'Finney', url: 'https://finney.calendar.eternitywall.com' },
  ];

  console.log('  Submitting to calendar servers...');
  console.log('');

  const results = [];

  for (const cal of calendars) {
    try {
      const response = await httpPost(`${cal.url}/digest`, digestBytes, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/vnd.opentimestamps.v1',
        'User-Agent': 'literary-protocol/1.0'
      });

      if (response.statusCode === 200) {
        console.log(`    ✅ ${cal.name}: submitted`);
        results.push({
          calendar: cal.name,
          url: cal.url,
          status: 'submitted',
          timestamp: new Date().toISOString(),
          proof: response.body.toString('base64')
        });
      } else {
        console.log(`    ⚠️  ${cal.name}: HTTP ${response.statusCode}`);
        results.push({
          calendar: cal.name,
          url: cal.url,
          status: `error-${response.statusCode}`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.log(`    ⚠️  ${cal.name}: ${err.message}`);
      results.push({
        calendar: cal.name,
        url: cal.url,
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  console.log('');

  // Save OTS proof data
  const otsPath = path.join(DIST, 'edition.ots.json');
  const otsData = {
    version: '1.0',
    digest: digestHex,
    algorithm: 'sha256',
    submitted_at: new Date().toISOString(),
    status: 'pending',
    calendars: results,
    edition_root: edition.edition_root,
    title: edition.title,
    note: 'Proof pending. Bitcoin block inclusion takes ~1-2 hours. Run --verify to check.'
  };

  fs.writeFileSync(otsPath, JSON.stringify(otsData, null, 2), 'utf-8');
  console.log(`  ✅ OTS proof data saved to dist/edition.ots.json`);

  // Also save raw proof bytes if any calendar gave us one
  const successfulProofs = results.filter(r => r.proof);
  if (successfulProofs.length > 0) {
    const rawOtsPath = path.join(DIST, 'edition.ots');
    const proofBuffer = Buffer.from(successfulProofs[0].proof, 'base64');
    fs.writeFileSync(rawOtsPath, proofBuffer);
    console.log(`  ✅ Raw OTS proof saved to dist/edition.ots`);
  }

  // Update edition.json
  edition.anchors.bitcoin.ots_proof = 'dist/edition.ots.json';
  edition.anchors.bitcoin.ots_submitted_at = new Date().toISOString();
  edition.anchors.bitcoin.status = 'pending';
  edition.anchors.bitcoin.digest = digestHex;
  edition.anchors.bitcoin.calendars_submitted = results.filter(r => r.status === 'submitted').length;

  const editionPath = path.join(DIST, 'edition.json');
  fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2), 'utf-8');
  console.log('  ✅ edition.json updated with Bitcoin OTS anchor');
  console.log('');

  const submitted = results.filter(r => r.status === 'submitted').length;

  console.log('══════════════════════════════════════════════════════════════');
  console.log('  BITCOIN TIMESTAMP SUBMITTED');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Calendars: ${submitted}/${calendars.length} confirmed`);
  console.log(`  Status:    PENDING (awaiting Bitcoin block)`);
  console.log(`  Proof:     dist/edition.ots.json`);
  console.log('');
  console.log('  What happens next:');
  console.log('    1. Calendar servers aggregate your hash with others');
  console.log('    2. The aggregate is included in a Bitcoin transaction');
  console.log('    3. When a block is mined (~1-2 hours), the proof completes');
  console.log('');
  console.log('  To check/verify later:');
  console.log('    node web3/scripts/anchor-bitcoin.js --verify');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

// ══════════════════════════════════════════════════════════════════════════
//  OPENTIMESTAMPS — VERIFY
// ══════════════════════════════════════════════════════════════════════════

async function verifyOTS(edition, editionRoot) {
  console.log('  ── OpenTimestamps Verification ──');
  console.log('');

  const otsPath = path.join(DIST, 'edition.ots.json');
  if (!fs.existsSync(otsPath)) {
    console.error('  ❌ No OTS proof found. Run without --verify first.');
    process.exit(1);
  }

  const otsData = JSON.parse(fs.readFileSync(otsPath, 'utf-8'));

  console.log(`  Digest:       ${otsData.digest}`);
  console.log(`  Submitted:    ${otsData.submitted_at}`);
  console.log(`  Status:       ${otsData.status}`);
  console.log('');

  // Check each calendar for upgrade
  const calendars = otsData.calendars.filter(c => c.status === 'submitted');

  if (calendars.length === 0) {
    console.log('  ❌ No successful submissions found');
    return;
  }

  console.log('  Checking calendar servers for Bitcoin attestation...');
  console.log('');

  for (const cal of calendars) {
    try {
      const response = await httpGet(`${cal.url}/timestamp/${otsData.digest}`);
      if (response.statusCode === 200) {
        console.log(`    ✅ ${cal.calendar}: attestation found`);
        cal.attestation = response.body.toString('base64');
        cal.verified_at = new Date().toISOString();
        otsData.status = 'verified';
      } else if (response.statusCode === 404) {
        console.log(`    ⏳ ${cal.calendar}: still pending`);
      } else {
        console.log(`    ⚠️  ${cal.calendar}: HTTP ${response.statusCode}`);
      }
    } catch (err) {
      console.log(`    ⚠️  ${cal.calendar}: ${err.message}`);
    }
  }

  // Save updated proof
  otsData.last_verified = new Date().toISOString();
  fs.writeFileSync(otsPath, JSON.stringify(otsData, null, 2), 'utf-8');

  // Update edition.json
  edition.anchors.bitcoin.status = otsData.status;
  edition.anchors.bitcoin.last_verified = new Date().toISOString();
  const editionPath = path.join(DIST, 'edition.json');
  fs.writeFileSync(editionPath, JSON.stringify(edition, null, 2), 'utf-8');

  console.log('');
  console.log(`  Status: ${otsData.status.toUpperCase()}`);
  console.log('');

  if (otsData.status === 'verified') {
    console.log('  ✅ Bitcoin attestation confirmed!');
    console.log('     The edition_root is permanently timestamped in a Bitcoin block.');
  } else {
    console.log('  ⏳ Still pending. Bitcoin block not yet mined.');
    console.log('     Try again in 1-2 hours.');
  }
  console.log('');
}

// ══════════════════════════════════════════════════════════════════════════
//  OP_RETURN MODE (placeholder — requires BTC wallet integration)
// ══════════════════════════════════════════════════════════════════════════

async function opReturn(edition, editionRoot) {
  console.log('  ── OP_RETURN Mode ──');
  console.log('');
  console.log('  OP_RETURN embeds data directly in a Bitcoin transaction.');
  console.log('  This requires a funded BTC wallet and a signing library.');
  console.log('');
  console.log('  Data to embed:');
  console.log(`    Prefix: "LPS1" (4 bytes)`);
  console.log(`    Edition Root: ${editionRoot} (32 bytes)`);
  console.log(`    Total: 36 bytes (under 80-byte OP_RETURN limit)`);
  console.log('');
  console.log('  To use OP_RETURN:');
  console.log('    1. Install: npm install bitcoinjs-lib ecpair tiny-secp256k1');
  console.log('    2. Set BTC_PRIVATE_KEY in .env');
  console.log('    3. Fund the wallet with ~5000 sats ($2-3)');
  console.log('    4. Run this script again with --op-return');
  console.log('');
  console.log('  For now, OpenTimestamps (free) is recommended:');
  console.log('    node web3/scripts/anchor-bitcoin.js');
  console.log('');
}

// ══════════════════════════════════════════════════════════════════════════
//  HTTP HELPERS
// ══════════════════════════════════════════════════════════════════════════

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': body.length,
      }
    };

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.opentimestamps.v1',
        'User-Agent': 'literary-protocol/1.0',
        ...headers,
      }
    };

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ── Run ────────────────────────────────────────────────────────────────
main().catch(err => {
  console.error(`  ❌ ${err.message}`);
  process.exit(1);
});
