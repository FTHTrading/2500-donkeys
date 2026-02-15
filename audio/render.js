#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 *  IAPL-1 Audio Renderer — The 2,500 Donkeys
 * ──────────────────────────────────────────────────────────────
 *  Renders manuscript blocks to MP3 via ElevenLabs TTS API.
 *  One audio file per block, aligned with order.json.
 *
 *  Usage:
 *    node audio/render.js                # Render all blocks
 *    node audio/render.js --block 0      # Render single block (by index)
 *    node audio/render.js --force        # Re-render all (overwrite existing)
 *    node audio/render.js --dry-run      # Preview blocks without API calls
 *    node audio/render.js --list-voices  # List available ElevenLabs voices
 *
 *  Environment:
 *    ELEVENLABS_API_KEY  Required. Set in .env
 *
 *  Output:
 *    audio/rendered/block-00-genesis.mp3
 *    audio/rendered/block-01-parking-lots.mp3
 *    ... (31 files total)
 * ══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ override: true });

// ── Paths ─────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(__dirname, 'audio-config.json');
const ORDER_FILE = path.join(ROOT, 'build', 'order.json');
const MANUSCRIPT_DIR = path.join(ROOT, 'manuscript');

// ── Load Configuration ────────────────────────────────────────
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
const API_KEY = process.env.ELEVENLABS_API_KEY;
const OUTPUT_DIR = path.join(ROOT, config.outputDir);

// ── CLI Flags ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const LIST_VOICES = args.includes('--list-voices');
const BLOCK_INDEX = args.includes('--block')
  ? parseInt(args[args.indexOf('--block') + 1], 10)
  : null;

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
 * Strip markdown formatting to produce clean narration text.
 * Preserves paragraph structure for natural TTS pauses.
 */
function stripMarkdown(text) {
  const pp = config.textPreprocessing;
  let out = text;

  // Remove code blocks
  if (pp.stripCodeBlocks) {
    out = out.replace(/```[\s\S]*?```/g, '');
    out = out.replace(/`[^`]+`/g, '');
  }

  // Convert horizontal rules to pauses
  if (pp.stripHorizontalRules) {
    out = out.replace(/^-{3,}$/gm, pp.rulePause || '\n\n');
    out = out.replace(/^\*{3,}$/gm, pp.rulePause || '\n\n');
  }

  // Convert headers to text with pause
  if (pp.stripHeaders) {
    out = out.replace(/^#{1,6}\s+(.+)$/gm, (_, title) => {
      return (pp.headerPause || '\n\n') + title + '\n';
    });
  }

  // Strip emphasis markers but keep text
  if (pp.stripEmphasis) {
    out = out.replace(/\*\*\*(.+?)\*\*\*/g, '$1');  // bold+italic
    out = out.replace(/\*\*(.+?)\*\*/g, '$1');       // bold
    out = out.replace(/\*(.+?)\*/g, '$1');           // italic
    out = out.replace(/__(.+?)__/g, '$1');           // bold
    out = out.replace(/_(.+?)_/g, '$1');             // italic
  }

  // Clean up excessive whitespace
  out = out.replace(/\n{4,}/g, '\n\n\n');
  out = out.trim();

  return out;
}

/**
 * Get the output filename for a block.
 * block-00-genesis.md → block-00-genesis.mp3
 */
function getAudioFilename(blockFile) {
  return blockFile.replace(/\.md$/, '.mp3');
}

/**
 * HTTP request wrapper for ElevenLabs API.
 */
function apiRequest(method, urlPath, body, isBinary = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: urlPath,
      method,
      headers: {
        'xi-api-key': API_KEY,
        'Accept': isBinary ? 'audio/mpeg' : 'application/json',
      }
    };

    if (body) {
      const payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      if (isBinary) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            const errBody = Buffer.concat(chunks).toString();
            reject(new Error(`API ${res.statusCode}: ${errBody}`));
          } else {
            resolve(Buffer.concat(chunks));
          }
        });
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`API ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data));
          }
        });
      }
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * List available voices from ElevenLabs.
 */
async function listVoices() {
  console.log('\n── Available ElevenLabs Voices ──\n');
  const data = await apiRequest('GET', '/v1/voices');

  const voices = data.voices
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`${'Name'.padEnd(25)} ${'Voice ID'.padEnd(25)} ${'Category'.padEnd(15)} Labels`);
  console.log('─'.repeat(90));

  for (const v of voices) {
    const labels = v.labels
      ? Object.entries(v.labels).map(([k, val]) => `${k}:${val}`).join(', ')
      : '';
    console.log(
      `${v.name.padEnd(25)} ${v.voice_id.padEnd(25)} ${(v.category || '').padEnd(15)} ${labels}`
    );
  }

  console.log(`\n${voices.length} voices available\n`);
  console.log('To use a voice, set "voice.id" in audio/audio-config.json');
}

/**
 * Render a single block to MP3 via ElevenLabs TTS.
 */
async function renderBlock(block, index, total) {
  const blockPath = path.join(MANUSCRIPT_DIR, block.file);
  const audioFile = getAudioFilename(block.file);
  const outputPath = path.join(OUTPUT_DIR, audioFile);

  // Check if already rendered
  if (fs.existsSync(outputPath) && !FORCE) {
    const stats = fs.statSync(outputPath);
    console.log(`  [${index + 1}/${total}] SKIP ${audioFile} (${(stats.size / 1024).toFixed(0)} KB exists)`);
    return { id: block.id, file: audioFile, status: 'skipped', sizeBytes: stats.size };
  }

  // Read and preprocess
  const markdown = fs.readFileSync(blockPath, 'utf-8');
  const text = stripMarkdown(markdown);

  if (DRY_RUN) {
    console.log(`  [${index + 1}/${total}] DRY  ${audioFile}`);
    console.log(`         Source: ${block.file} (${markdown.length} chars)`);
    console.log(`         Text:  ${text.length} chars after stripping`);
    console.log(`         First: "${text.slice(0, 80).replace(/\n/g, ' ')}…"`);
    return { id: block.id, file: audioFile, status: 'dry-run', textLength: text.length };
  }

  // Render via ElevenLabs
  console.log(`  [${index + 1}/${total}] RENDER ${audioFile} (${text.length} chars)…`);

  const body = {
    text,
    model_id: config.voice.model,
    voice_settings: config.voice.settings
  };

  const audioBuffer = await apiRequest(
    'POST',
    `/v1/text-to-speech/${config.voice.id}?output_format=${config.format}`,
    body,
    true  // binary response
  );

  fs.writeFileSync(outputPath, audioBuffer);
  const sizeKB = (audioBuffer.length / 1024).toFixed(0);
  console.log(`         ✓ ${sizeKB} KB written`);

  // Rate limiting — be polite to the API
  await sleep(1000);

  return { id: block.id, file: audioFile, status: 'rendered', sizeBytes: audioBuffer.length };
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  IAPL-1 Audio Renderer — The 2,500 Donkeys');
  console.log('══════════════════════════════════════════════════\n');

  // List voices mode
  if (LIST_VOICES) {
    if (!API_KEY) {
      console.error('✗ ELEVENLABS_API_KEY not set in .env');
      process.exit(1);
    }
    await listVoices();
    return;
  }

  // Validate configuration
  if (!API_KEY && !DRY_RUN) {
    console.error('✗ ELEVENLABS_API_KEY not set in .env');
    console.error('  Set it in your .env file or run with --dry-run');
    process.exit(1);
  }

  if (!config.voice.id && !DRY_RUN) {
    console.error('✗ No voice ID configured');
    console.error('  1. Run: node audio/render.js --list-voices');
    console.error('  2. Set "voice.id" in audio/audio-config.json');
    process.exit(1);
  }

  // Load block order
  const order = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf-8'));
  const blocks = order.blocks;

  console.log(`  Voice:    ${config.voice.name || config.voice.id || '(dry-run)'}`);
  console.log(`  Model:    ${config.voice.model}`);
  console.log(`  Format:   ${config.format}`);
  console.log(`  Blocks:   ${blocks.length}`);
  console.log(`  Output:   ${config.outputDir}/`);
  console.log(`  Mode:     ${DRY_RUN ? 'DRY RUN' : FORCE ? 'FORCE (overwrite)' : 'NORMAL (skip existing)'}`);
  console.log('');

  // Ensure output directory
  ensureDir(OUTPUT_DIR);

  // Determine which blocks to render
  let targetBlocks;
  if (BLOCK_INDEX !== null) {
    if (BLOCK_INDEX < 0 || BLOCK_INDEX >= blocks.length) {
      console.error(`✗ Block index ${BLOCK_INDEX} out of range (0–${blocks.length - 1})`);
      process.exit(1);
    }
    targetBlocks = [{ block: blocks[BLOCK_INDEX], index: BLOCK_INDEX }];
  } else {
    targetBlocks = blocks.map((block, index) => ({ block, index }));
  }

  // Render
  console.log('── Rendering ──\n');
  const results = [];

  for (const { block, index } of targetBlocks) {
    try {
      const result = await renderBlock(block, index, blocks.length);
      results.push(result);
    } catch (err) {
      console.error(`  [${index + 1}/${blocks.length}] FAIL ${block.file}: ${err.message}`);
      results.push({ id: block.id, file: getAudioFilename(block.file), status: 'failed', error: err.message });
    }
  }

  // Summary
  console.log('\n── Summary ──\n');
  const rendered = results.filter(r => r.status === 'rendered');
  const skipped = results.filter(r => r.status === 'skipped');
  const failed = results.filter(r => r.status === 'failed');
  const dryRun = results.filter(r => r.status === 'dry-run');

  if (DRY_RUN) {
    console.log(`  ${dryRun.length} blocks previewed`);
    const totalChars = dryRun.reduce((sum, r) => sum + (r.textLength || 0), 0);
    console.log(`  ${totalChars.toLocaleString()} total characters to render`);
    console.log('\n  Run without --dry-run to render audio.\n');
  } else {
    console.log(`  Rendered: ${rendered.length}`);
    console.log(`  Skipped:  ${skipped.length}`);
    console.log(`  Failed:   ${failed.length}`);

    const totalBytes = [...rendered, ...skipped].reduce((sum, r) => sum + (r.sizeBytes || 0), 0);
    console.log(`  Total:    ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

    if (failed.length > 0) {
      console.error('\n  ✗ Some blocks failed to render.');
      process.exit(1);
    }

    if (rendered.length > 0 || skipped.length === blocks.length) {
      console.log('\n  ✓ Audio rendering complete.');
      console.log('  Next: npm run audio:hash    — Build audio Merkle tree\n');
    }
  }
}

main().catch(err => {
  console.error(`\n✗ Fatal error: ${err.message}`);
  process.exit(1);
});
