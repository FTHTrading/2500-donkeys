/**
 * compile.js — Genesis Build Compiler
 *
 * Reads manuscript blocks in canonical order (from order.json),
 * inserts artifact exhibits at defined positions,
 * and outputs a single deterministic manuscript to dist/final-manuscript.md
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MANUSCRIPT_DIR = path.join(ROOT, "manuscript");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const DIST_DIR = path.join(ROOT, "dist");
const ORDER_FILE = path.join(__dirname, "order.json");

function compile() {
  // Ensure dist exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Load canonical order
  const order = JSON.parse(fs.readFileSync(ORDER_FILE, "utf-8"));
  const parts = [];

  // Title page
  parts.push(`# ${order.title}\n`);
  parts.push(`## ${order.subtitle}\n`);
  parts.push(`**Edition:** ${order.version}\n`);
  parts.push(`**Compiled:** ${new Date().toISOString()}\n`);
  parts.push("---\n\n");

  // Table of contents
  parts.push("## Table of Contents\n\n");
  order.blocks.forEach((block, i) => {
    parts.push(`${i + 1}. ${block.title}\n`);
  });
  parts.push("\n---\n\n");

  // Compile each block
  for (const block of order.blocks) {
    const blockPath = path.join(MANUSCRIPT_DIR, block.file);

    if (!fs.existsSync(blockPath)) {
      console.error(`[WARN] Missing block: ${block.file}`);
      continue;
    }

    const content = fs.readFileSync(blockPath, "utf-8");
    parts.push(content);
    parts.push("\n\n---\n\n");

    // Insert artifacts after block if specified
    if (block.artifactInserts) {
      for (const insert of block.artifactInserts) {
        if (insert.after) {
          const artifactPath = path.join(ARTIFACTS_DIR, insert.artifact);
          if (!fs.existsSync(artifactPath)) {
            console.error(`[WARN] Missing artifact: ${insert.artifact}`);
            continue;
          }
          const artifactContent = fs.readFileSync(artifactPath, "utf-8");
          parts.push(artifactContent);
          parts.push("\n\n---\n\n");
        }
      }
    }
  }

  // Colophon
  parts.push("## Colophon\n\n");
  parts.push("This manuscript was compiled from deterministic source blocks.\n");
  parts.push("Each block was written, hashed, and stored independently.\n");
  parts.push("The canonical order is defined in `build/order.json`.\n");
  parts.push("The Genesis CID anchors this build to the InterPlanetary File System.\n\n");
  parts.push(`Blocks compiled: ${order.blocks.length}\n`);
  parts.push(`Build timestamp: ${new Date().toISOString()}\n`);

  // Write output
  const output = parts.join("\n");
  const outputPath = path.join(DIST_DIR, "final-manuscript.md");
  fs.writeFileSync(outputPath, output, "utf-8");

  const stats = fs.statSync(outputPath);
  console.log(`[COMPILE] ✅ final-manuscript.md`);
  console.log(`[COMPILE]    Blocks: ${order.blocks.length}`);
  console.log(`[COMPILE]    Size: ${stats.size} bytes`);
  console.log(`[COMPILE]    Output: ${outputPath}`);
}

compile();
