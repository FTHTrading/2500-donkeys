#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 *  DALL-E 3 Image Generator — The 2,500 Donkeys
 * ──────────────────────────────────────────────────────────────
 *  Reads image-prompts.json and generates all chapter
 *  illustrations + cover art via OpenAI's DALL-E 3 API.
 *
 *  Usage:
 *    node images/generate-images.js            # all images
 *    node images/generate-images.js --cover    # cover only
 *    node images/generate-images.js --chapter 3  # single chapter
 *    node images/generate-images.js --chapters   # all chapters
 *    node images/generate-images.js --dry-run    # preview prompts
 * ══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// ── Configuration ─────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGES_DIR = path.resolve(__dirname);
const PROMPTS_FILE = path.join(IMAGES_DIR, 'image-prompts.json');

const DALL_E_ENDPOINT = 'https://api.openai.com/v1/images/generations';

// DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
const SIZE_MAP = {
  cover:   '1024x1792',   // Portrait for cover
  chapter: '1792x1024',   // Landscape for chapter openers
};

const QUALITY = 'hd';       // 'standard' or 'hd'
const STYLE  = 'natural';   // 'vivid' or 'natural'

// Rate limiting: DALL-E 3 allows ~5 images/min on most tiers
const RATE_LIMIT_MS = 15000; // 15s between requests (safe)

// ── Helpers ───────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Call OpenAI DALL-E 3 API
 */
async function generateImage(prompt, size) {
  const body = JSON.stringify({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size,
    quality: QUALITY,
    style: STYLE,
    response_format: 'url',
  });

  return new Promise((resolve, reject) => {
    const url = new URL(DALL_E_ENDPOINT);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`API error ${res.statusCode}: ${parsed.error?.message || data}`));
            return;
          }
          resolve({
            url: parsed.data[0].url,
            revisedPrompt: parsed.data[0].revised_prompt,
          });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}\nRaw: ${data.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Request timed out (120s)'));
    });
    req.write(body);
    req.end();
  });
}

/**
 * Download image from URL to file
 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = (urlStr) => {
      https.get(urlStr, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            const stats = fs.statSync(destPath);
            resolve(stats.size);
          });
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

/**
 * Build the full prompt with global style directives
 */
function buildPrompt(globalStyle, itemPrompt, negative) {
  return `${itemPrompt}\n\nStyle: ${globalStyle}\n\nAvoid: ${negative}`;
}

// ── CLI Parsing ───────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    coverOnly: false,
    chaptersOnly: false,
    singleChapter: null,
    dryRun: false,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--cover':
        opts.coverOnly = true;
        break;
      case '--chapters':
        opts.chaptersOnly = true;
        break;
      case '--chapter':
        opts.singleChapter = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--force':
        opts.force = true;
        break;
      case '--help':
        console.log(`
  DALL-E 3 Image Generator — The 2,500 Donkeys

  Usage:
    node images/generate-images.js              Generate all images
    node images/generate-images.js --cover      Cover only
    node images/generate-images.js --chapters   All chapter images
    node images/generate-images.js --chapter 3  Single chapter (0-indexed)
    node images/generate-images.js --dry-run    Preview prompts, no API calls
    node images/generate-images.js --force      Overwrite existing PNGs

  Environment:
    OPENAI_API_KEY    Required. Set in .env file.
        `);
        process.exit(0);
    }
  }
  return opts;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  // Validate API key
  if (!OPENAI_API_KEY && !opts.dryRun) {
    console.error('✗ OPENAI_API_KEY not found in .env');
    process.exit(1);
  }

  // Load prompts
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
  const { style, cover, chapters } = prompts;

  console.log('');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   DALL-E 3 Image Generator');
  console.log('   The 2,500 Donkeys — Kidd James');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Quality: ${QUALITY}  |  Style: ${STYLE}`);
  console.log(`  Mode: ${opts.dryRun ? 'DRY RUN' : 'LIVE GENERATION'}`);
  console.log('');

  // Build generation queue
  const queue = [];

  // Cover
  if (!opts.chaptersOnly && opts.singleChapter === null) {
    const coverPath = path.join(IMAGES_DIR, cover.file);
    const exists = fs.existsSync(coverPath);
    if (!exists || opts.force) {
      queue.push({
        label: 'COVER',
        prompt: buildPrompt(style.global, cover.prompt, style.negative),
        size: SIZE_MAP.cover,
        destPath: coverPath,
        notes: cover.notes,
      });
    } else {
      console.log(`  ⊘ COVER — already exists (use --force to overwrite)`);
    }
  }

  // Chapters
  if (!opts.coverOnly) {
    const chapterIndices = opts.singleChapter !== null
      ? [opts.singleChapter]
      : chapters.map((_, i) => i);

    for (const i of chapterIndices) {
      if (i < 0 || i >= chapters.length) {
        console.error(`  ✗ Chapter index ${i} out of range (0-${chapters.length - 1})`);
        continue;
      }
      const ch = chapters[i];
      const chPath = path.join(IMAGES_DIR, ch.file);
      const exists = fs.existsSync(chPath);
      if (!exists || opts.force) {
        queue.push({
          label: `CH-${String(i).padStart(2, '0')} [${ch.arc}]`,
          prompt: buildPrompt(style.global, ch.prompt, style.negative),
          size: SIZE_MAP.chapter,
          destPath: chPath,
          notes: ch.scene,
        });
      } else {
        console.log(`  ⊘ CH-${String(i).padStart(2, '0')} [${ch.arc}] — already exists`);
      }
    }
  }

  if (queue.length === 0) {
    console.log('\n  Nothing to generate. All images exist (use --force to overwrite).\n');
    return;
  }

  console.log(`\n  ┌ Generating ${queue.length} image${queue.length > 1 ? 's' : ''}...`);
  console.log(`  │ Estimated time: ~${Math.ceil(queue.length * RATE_LIMIT_MS / 60000)} minutes`);
  console.log('  │');

  // Generation log for metadata
  const generationLog = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const num = `[${i + 1}/${queue.length}]`;

    console.log(`  ├─ ${num} ${item.label}`);
    console.log(`  │  Scene: ${item.notes || 'N/A'}`);
    console.log(`  │  Size: ${item.size}`);
    console.log(`  │  Dest: ${path.relative(IMAGES_DIR, item.destPath)}`);

    if (opts.dryRun) {
      console.log(`  │  Prompt (${item.prompt.length} chars):`);
      console.log(`  │  ${item.prompt.slice(0, 120)}...`);
      console.log('  │');
      continue;
    }

    try {
      // Ensure directory exists
      ensureDir(path.dirname(item.destPath));

      // Generate
      console.log(`  │  ⟳ Calling DALL-E 3...`);
      const result = await generateImage(item.prompt, item.size);

      // Download
      console.log(`  │  ⟳ Downloading...`);
      const fileSize = await downloadImage(result.url, item.destPath);
      const fileSizeKB = (fileSize / 1024).toFixed(0);

      console.log(`  │  ✓ Saved (${fileSizeKB} KB)`);

      if (result.revisedPrompt) {
        console.log(`  │  ℹ Revised prompt: ${result.revisedPrompt.slice(0, 100)}...`);
      }

      // Log
      generationLog.push({
        label: item.label,
        file: path.relative(IMAGES_DIR, item.destPath),
        size: item.size,
        fileSize: `${fileSizeKB} KB`,
        generated: new Date().toISOString(),
        revisedPrompt: result.revisedPrompt || null,
      });

      console.log('  │');

      // Rate limit (skip delay after last item)
      if (i < queue.length - 1) {
        console.log(`  │  ⏱ Rate limit pause (${RATE_LIMIT_MS / 1000}s)...`);
        await sleep(RATE_LIMIT_MS);
      }

    } catch (err) {
      console.error(`  │  ✗ FAILED: ${err.message}`);
      console.log('  │');

      generationLog.push({
        label: item.label,
        file: path.relative(IMAGES_DIR, item.destPath),
        error: err.message,
        timestamp: new Date().toISOString(),
      });

      // Continue with next image on failure
      if (i < queue.length - 1) {
        console.log(`  │  Continuing after error...`);
        await sleep(5000);
      }
    }
  }

  console.log('  └─ Done.');
  console.log('');

  // Write generation log
  if (!opts.dryRun && generationLog.length > 0) {
    const logPath = path.join(IMAGES_DIR, 'generation-log.json');
    const existing = fs.existsSync(logPath)
      ? JSON.parse(fs.readFileSync(logPath, 'utf-8'))
      : [];
    const updated = [...existing, ...generationLog];
    fs.writeFileSync(logPath, JSON.stringify(updated, null, 2));
    console.log(`  Log → ${path.relative(process.cwd(), logPath)}`);
  }

  // Summary
  const succeeded = generationLog.filter(e => !e.error).length;
  const failed = generationLog.filter(e => e.error).length;
  console.log(`\n  Summary: ${succeeded} generated, ${failed} failed, ${queue.length - generationLog.length} skipped`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
