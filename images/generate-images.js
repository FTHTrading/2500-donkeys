#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 *  AI Horde Image Generator — The 2,500 Donkeys
 * ──────────────────────────────────────────────────────────────
 *  Reads image-prompts.json and generates all chapter
 *  illustrations + cover art via AI Horde (free, no auth).
 *
 *  Uses community-run Stable Diffusion workers.
 *  No API key required (anonymous access).
 *
 *  Usage:
 *    node images/generate-images.js            # all images
 *    node images/generate-images.js --cover    # cover only
 *    node images/generate-images.js --chapter 3  # single chapter
 *    node images/generate-images.js --chapters   # all chapters
 *    node images/generate-images.js --dry-run    # preview prompts
 *    node images/generate-images.js --force      # overwrite existing
 *
 *  Environment:
 *    HORDE_API_KEY  Optional. Get free at: https://aihorde.net/register
 *                   Anonymous access works but is slower.
 * ══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ── Configuration ─────────────────────────────────────────────
const HORDE_API_KEY = process.env.HORDE_API_KEY || '0000000000'; // anon key
const IMAGES_DIR = path.resolve(__dirname);
const PROMPTS_FILE = path.join(IMAGES_DIR, 'image-prompts.json');

// AI Horde endpoints
const HORDE_API = 'https://aihorde.net/api/v2';
const POLL_INTERVAL_MS = 5000;  // 5s between status checks
const MAX_POLL_ATTEMPTS = 120;  // 10 minutes max per image

// Generation params (512x512 stays within free tier limits of 620x620)
const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;
const STEPS = 25;
const SAMPLER = 'k_euler';

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
 * Submit an image generation request to AI Horde
 * Returns the job ID
 */
async function submitGeneration(prompt, negativePrompt) {
  const body = {
    prompt: negativePrompt
      ? `${prompt} ### ${negativePrompt}`
      : prompt,
    params: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      steps: STEPS,
      n: 1,
      sampler_name: SAMPLER,
      cfg_scale: 7.5,
    },
    nsfw: false,
    censor_nsfw: true,
    trusted_workers: false,
    slow_workers: true,
    models: ['stable_diffusion'],
  };

  const res = await fetch(`${HORDE_API}/generate/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': HORDE_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(data.message || `Submit failed: ${JSON.stringify(data)}`);
  }

  return data.id;
}

/**
 * Poll AI Horde for generation status, then download the result
 * Returns raw image Buffer
 */
async function pollAndDownload(jobId) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const check = await fetch(`${HORDE_API}/generate/check/${jobId}`);
    const status = await check.json();

    if (status.faulted) {
      throw new Error('Generation faulted on worker');
    }

    if (status.done) {
      // Fetch the completed result
      const result = await fetch(`${HORDE_API}/generate/status/${jobId}`);
      const gen = await result.json();

      if (!gen.generations || !gen.generations[0]) {
        throw new Error('No image in completed result');
      }

      const imgUrl = gen.generations[0].img;
      const imgRes = await fetch(imgUrl);

      if (!imgRes.ok) {
        throw new Error(`Image download failed: HTTP ${imgRes.status}`);
      }

      return Buffer.from(await imgRes.arrayBuffer());
    }

    // Still processing — show ETA
    const eta = status.wait_time || '?';
    const pos = status.queue_position || 0;
    process.stdout.write(`\r  │  ⏳ Waiting... ETA ${eta}s  queue #${pos}   `);
  }

  throw new Error(`Timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Generate a single image end-to-end
 */
async function generateImage(prompt, negativePrompt) {
  const jobId = await submitGeneration(prompt, negativePrompt);
  process.stdout.write(`\r  │  ⏳ Job ${jobId.slice(0, 8)}... queued   `);
  const buffer = await pollAndDownload(jobId);
  process.stdout.write('\r' + ' '.repeat(60) + '\r'); // clear progress line
  return buffer;
}

/**
 * Build the full prompt with global style directives
 */
function buildPrompt(globalStyle, itemPrompt) {
  return `${itemPrompt} ${globalStyle}`;
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
  AI Horde Image Generator — The 2,500 Donkeys

  Usage:
    node images/generate-images.js              Generate all images
    node images/generate-images.js --cover      Cover only
    node images/generate-images.js --chapters   All chapter images
    node images/generate-images.js --chapter 3  Single chapter (0-indexed)
    node images/generate-images.js --dry-run    Preview prompts, no API calls
    node images/generate-images.js --force      Overwrite existing PNGs

  AI Horde: Free community-run Stable Diffusion.
  No API key required. Anonymous jobs may take 30-120s per image.

  Environment:
    HORDE_API_KEY    Optional. Register free at https://aihorde.net/register
        `);
        process.exit(0);
    }
  }
  return opts;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  // Load prompts
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
  const { style, cover, chapters } = prompts;

  console.log('');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   AI Horde Image Generator');
  console.log('   The 2,500 Donkeys — Kidd James');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`  Backend: AI Horde (community Stable Diffusion)`);
  console.log(`  Size: ${IMAGE_WIDTH}×${IMAGE_HEIGHT}  Steps: ${STEPS}`);
  console.log(`  Auth: ${HORDE_API_KEY === '0000000000' ? 'Anonymous (slower)' : 'API key set ✓'}`);
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
        prompt: buildPrompt(style.global, cover.prompt),
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
          prompt: buildPrompt(style.global, ch.prompt),
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

  const estMinutes = Math.ceil(queue.length * 1.5); // ~90s per image average
  console.log(`\n  ┌ Generating ${queue.length} image${queue.length > 1 ? 's' : ''}...`);
  console.log(`  │ Estimated time: ~${estMinutes} minutes (anonymous queue)`);
  console.log('  │');

  // Generation log for metadata
  const generationLog = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const num = `[${i + 1}/${queue.length}]`;

    console.log(`  ├─ ${num} ${item.label}`);
    console.log(`  │  Scene: ${item.notes || 'N/A'}`);
    console.log(`  │  Dest: ${path.relative(IMAGES_DIR, item.destPath)}`);

    if (opts.dryRun) {
      console.log(`  │  Prompt (${item.prompt.length} chars):`);
      console.log(`  │  ${item.prompt.slice(0, 120)}...`);
      console.log('  │');
      continue;
    }

    const startTime = Date.now();

    try {
      // Ensure directory exists
      ensureDir(path.dirname(item.destPath));

      // Generate
      console.log(`  │  ⟳ Submitting to AI Horde...`);
      const imageBuffer = await generateImage(
        item.prompt,
        style.negative
      );

      // Save
      fs.writeFileSync(item.destPath, imageBuffer);
      const fileSizeKB = (imageBuffer.length / 1024).toFixed(0);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

      console.log(`  │  ✓ Saved (${fileSizeKB} KB, ${elapsed}s)`);

      // Log
      generationLog.push({
        label: item.label,
        file: path.relative(IMAGES_DIR, item.destPath),
        backend: 'AI Horde (stable_diffusion)',
        fileSize: `${fileSizeKB} KB`,
        elapsed: `${elapsed}s`,
        generated: new Date().toISOString(),
      });

      console.log('  │');

    } catch (err) {
      console.error(`  │  ✗ FAILED: ${err.message}`);
      console.log('  │');

      generationLog.push({
        label: item.label,
        file: path.relative(IMAGES_DIR, item.destPath),
        backend: 'AI Horde',
        error: err.message,
        timestamp: new Date().toISOString(),
      });

      // Continue with next image on failure
      if (i < queue.length - 1) {
        console.log(`  │  Continuing after error...`);
        await sleep(3000);
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
