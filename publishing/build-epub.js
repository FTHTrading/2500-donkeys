/**
 * build-epub.js — EPUB Export Pipeline
 *
 * Compiles the manuscript into a Pandoc-ready format and generates
 * an EPUB file suitable for KDP, Apple Books, and other retailers.
 *
 * Pipeline: order.json → front matter + blocks + back matter → Pandoc → EPUB
 *
 * Usage: node publishing/build-epub.js
 *
 * Prerequisites:
 *   - Pandoc 3.x installed and on PATH
 *   - npm run build (to ensure dist/final-manuscript.md exists)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MANUSCRIPT_DIR = path.join(ROOT, "manuscript");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const PUBLISHING_DIR = __dirname;
const DIST_DIR = path.join(ROOT, "dist");
const IMAGES_DIR = path.join(ROOT, "images");
const ORDER_FILE = path.join(ROOT, "build", "order.json");
const METADATA_FILE = path.join(PUBLISHING_DIR, "book-metadata.json");

function buildEpub() {
  console.log("[EPUB] Starting EPUB build...\n");

  const order = JSON.parse(fs.readFileSync(ORDER_FILE, "utf-8"));
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));

  // Ensure dist exists
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  // 1. Build the combined manuscript for Pandoc
  const parts = [];

  // Front matter
  const frontMatter = path.join(PUBLISHING_DIR, "front-matter.md");
  if (fs.existsSync(frontMatter)) {
    parts.push(fs.readFileSync(frontMatter, "utf-8"));
    parts.push("\n\n");
  }

  // Map blocks to their arc for chapter image lookup
  const arcMap = {
    "block-00": "ch-00-genesis",
    "block-01": "ch-01-parking-lot",
    "block-02": "ch-02-paper",
    "block-03": "ch-03-whatsapp",
    "block-04": "ch-04-donkeys",
    "block-05": "ch-05-procession",
    "block-06": "ch-06-humanitarian",
    "block-07": "ch-07-silence",
    "epilogue": "ch-ep-genesis-remains"
  };

  // Compile each block
  for (const block of order.blocks) {
    const blockPath = path.join(MANUSCRIPT_DIR, block.file);
    if (!fs.existsSync(blockPath)) {
      console.warn(`  ⚠️  Missing block: ${block.file}`);
      continue;
    }

    // Check for chapter opener image
    const arcKey = block.id.replace(/[a-g]$/, "").replace(/-$/, "");
    const imageBase = arcMap[arcKey] || arcMap[block.id];
    if (imageBase) {
      // Check for real PNG first, then SVG placeholder
      const pngPath = path.join(IMAGES_DIR, "chapters", imageBase + ".png");
      const svgPath = path.join(IMAGES_DIR, "chapters", imageBase + ".svg");
      if (fs.existsSync(pngPath)) {
        const relPath = path.relative(DIST_DIR, pngPath).replace(/\\/g, "/");
        parts.push(`![${block.title}](${relPath})\n\n`);
      } else if (fs.existsSync(svgPath) && block.id === arcKey) {
        // Only insert SVG for arc-opener blocks, not sub-blocks
        const relPath = path.relative(DIST_DIR, svgPath).replace(/\\/g, "/");
        parts.push(`![${block.title}](${relPath})\n\n`);
      }
    }

    let content = fs.readFileSync(blockPath, "utf-8");

    // Transform block headings to proper chapter headings for EPUB navigation
    // BLOCK 0 — Genesis Hash → Genesis Hash (as H1 for chapter nav)
    content = content.replace(
      /^# BLOCK \w+ — (.+)$/m,
      (match, title) => `# ${title}`
    );
    // Also handle epilogue format
    content = content.replace(
      /^# Epilogue — (.+)$/m,
      (match, title) => `# Epilogue: ${title}`
    );

    parts.push(content);
    parts.push("\n\n---\n\n");

    // Insert artifacts
    if (block.artifactInserts) {
      for (const insert of block.artifactInserts) {
        if (insert.after) {
          const artifactPath = path.join(ARTIFACTS_DIR, insert.artifact);
          if (fs.existsSync(artifactPath)) {
            let artifactContent = fs.readFileSync(artifactPath, "utf-8");
            // Prefix artifact with "Exhibit" styling
            const artifactTitle = insert.artifact
              .replace(".md", "")
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            parts.push(`\n\n::: {.exhibit}\n`);
            parts.push(artifactContent);
            parts.push(`\n:::\n\n---\n\n`);
          }
        }
      }
    }
  }

  // Back matter
  const backMatter = path.join(PUBLISHING_DIR, "back-matter.md");
  if (fs.existsSync(backMatter)) {
    parts.push(fs.readFileSync(backMatter, "utf-8"));
  }

  // Write combined file
  const combinedPath = path.join(DIST_DIR, "book-combined.md");
  fs.writeFileSync(combinedPath, parts.join("\n"), "utf-8");
  console.log(`  ✅ Combined manuscript: ${path.basename(combinedPath)}`);

  // 2. Create EPUB metadata YAML
  const epubMeta = `---
title: "${metadata.title}"
subtitle: "${metadata.subtitle}"
author: "${metadata.author}"
lang: ${metadata.language}
publisher: "${metadata.publisher}"
date: "${metadata.date}"
rights: "${metadata.rights}"
description: "${metadata.description}"
css: epub-style.css
---
`;
  const metaPath = path.join(DIST_DIR, "epub-metadata.yaml");
  fs.writeFileSync(metaPath, epubMeta, "utf-8");

  // 3. Create EPUB stylesheet
  const epubCSS = `/* EPUB Stylesheet — The 2,500 Donkeys */

@import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap');

body {
  font-family: "Crimson Text", Georgia, serif;
  font-size: 1em;
  line-height: 1.6;
  color: #1a1a1a;
  margin: 0;
  padding: 0;
}

h1 {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.8em;
  font-weight: 400;
  text-align: center;
  margin-top: 3em;
  margin-bottom: 1.5em;
  letter-spacing: 0.05em;
  page-break-before: always;
}

h2 {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.3em;
  font-weight: 400;
  text-align: center;
  margin-top: 2em;
  margin-bottom: 1em;
  letter-spacing: 0.03em;
}

h3 {
  font-family: "EB Garamond", Georgia, serif;
  font-size: 1.1em;
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

p {
  text-indent: 1.5em;
  margin: 0;
  padding: 0;
  text-align: justify;
  widows: 2;
  orphans: 2;
}

/* First paragraph after heading — no indent */
h1 + p, h2 + p, h3 + p, hr + p, blockquote + p {
  text-indent: 0;
}

blockquote {
  font-style: italic;
  margin: 1.5em 2em;
  text-indent: 0;
  color: #333;
}

blockquote p {
  text-indent: 0;
}

hr {
  border: none;
  text-align: center;
  margin: 2em 0;
}

hr::after {
  content: "* * *";
  letter-spacing: 0.5em;
  color: #999;
  font-size: 0.8em;
}

/* Scene breaks within chapters */
hr + p {
  text-indent: 0;
}

/* Artifact exhibits */
.exhibit {
  font-family: "Courier New", monospace;
  font-size: 0.85em;
  background: #f5f5f0;
  padding: 1em;
  margin: 1.5em 0;
  border-left: 3px solid #c9a84c;
}

/* Tables */
table {
  font-size: 0.85em;
  border-collapse: collapse;
  margin: 1em auto;
  width: 90%;
}

th, td {
  border: 1px solid #ccc;
  padding: 0.4em 0.6em;
  text-align: left;
}

th {
  background: #f0ede6;
  font-weight: 600;
}

/* Code blocks (hashes, CIDs) */
code {
  font-family: "Courier New", monospace;
  font-size: 0.85em;
  background: #f5f5f0;
  padding: 0.1em 0.3em;
}

pre {
  font-family: "Courier New", monospace;
  font-size: 0.8em;
  background: #f5f5f0;
  padding: 1em;
  overflow-x: auto;
  white-space: pre-wrap;
}

/* Chapter images */
img {
  display: block;
  max-width: 100%;
  margin: 1em auto;
}

/* Strong emphasis — for character names, key terms */
strong {
  font-weight: 600;
}

/* Emoji styling (WhatsApp artifacts) */
.emoji {
  font-style: normal;
}
`;
  const cssPath = path.join(DIST_DIR, "epub-style.css");
  fs.writeFileSync(cssPath, epubCSS, "utf-8");
  console.log(`  ✅ EPUB stylesheet: epub-style.css`);

  // 4. Check for cover image
  const coverPng = path.join(IMAGES_DIR, "cover", "cover-front.png");
  const coverSvg = path.join(IMAGES_DIR, "cover", "cover-front.svg");
  const hasCover = fs.existsSync(coverPng);
  const coverArg = hasCover ? `--epub-cover-image="${coverPng}"` : "";

  // 5. Run Pandoc
  const outputPath = path.join(DIST_DIR, "the-2500-donkeys.epub");

  const pandocCmd = [
    "pandoc",
    `"${combinedPath}"`,
    "-o", `"${outputPath}"`,
    "--from", "markdown+smart",
    "--to", "epub3",
    `--metadata-file="${metaPath}"`,
    `--css="${cssPath}"`,
    "--toc",
    "--toc-depth=1",
    "--split-level=1",
    "--epub-chapter-level=1",
    coverArg,
  ].filter(Boolean).join(" ");

  console.log(`\n[EPUB] Running Pandoc...`);
  console.log(`  Command: pandoc → ${path.basename(outputPath)}\n`);

  try {
    execSync(pandocCmd, { cwd: DIST_DIR, stdio: "pipe" });
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`[EPUB] ✅ Build complete!`);
    console.log(`[EPUB]    Output: ${outputPath}`);
    console.log(`[EPUB]    Size: ${sizeMB} MB`);
    console.log(`[EPUB]    Format: EPUB 3`);
  } catch (err) {
    console.error(`[EPUB] ❌ Pandoc failed:`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
    process.exit(1);
  }

  // Cleanup intermediate files (optional — keep for debugging)
  // fs.unlinkSync(combinedPath);
  // fs.unlinkSync(metaPath);

  return outputPath;
}

buildEpub();
