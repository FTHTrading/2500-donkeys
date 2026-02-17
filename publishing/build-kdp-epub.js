/**
 * build-kdp-epub.js — KDP-Compatible EPUB Builder
 *
 * Builds a clean EPUB specifically for Amazon KDP:
 *   - No chapter images (KDP processes text-only better)
 *   - No external font imports
 *   - No SVG cover wrapper issues
 *   - Baseline-compatible CSS
 *   - Also builds a DOCX as backup
 *
 * Usage: node publishing/build-kdp-epub.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MANUSCRIPT_DIR = path.join(ROOT, "manuscript");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const PUBLISHING_DIR = __dirname;
const DIST_DIR = path.join(ROOT, "dist");
const KDP_DIR = path.join(DIST_DIR, "kdp");
const IMAGES_DIR = path.join(ROOT, "images");
const ORDER_FILE = path.join(ROOT, "build", "order.json");
const METADATA_FILE = path.join(PUBLISHING_DIR, "book-metadata.json");

function buildKdpEpub() {
  console.log("[KDP-EPUB] Starting KDP-compatible EPUB build...\n");

  const order = JSON.parse(fs.readFileSync(ORDER_FILE, "utf-8"));
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));

  // Ensure dirs exist
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
  if (!fs.existsSync(KDP_DIR)) fs.mkdirSync(KDP_DIR, { recursive: true });

  // 1. Build combined manuscript — TEXT ONLY, no images
  const parts = [];

  // Front matter
  const frontMatter = path.join(PUBLISHING_DIR, "front-matter.md");
  if (fs.existsSync(frontMatter)) {
    parts.push(fs.readFileSync(frontMatter, "utf-8"));
    parts.push("\n\n");
  }

  // Compile each block — NO chapter images
  for (const block of order.blocks) {
    const blockPath = path.join(MANUSCRIPT_DIR, block.file);
    if (!fs.existsSync(blockPath)) {
      console.warn(`  ⚠️  Missing block: ${block.file}`);
      continue;
    }

    let content = fs.readFileSync(blockPath, "utf-8");

    // Transform block headings
    content = content.replace(
      /^# BLOCK \w+ — (.+)$/m,
      (match, title) => `# ${title}`
    );
    content = content.replace(
      /^# Epilogue — (.+)$/m,
      (match, title) => `# Epilogue: ${title}`
    );

    // Remove any inline image references that might exist in the markdown
    content = content.replace(/!\[.*?\]\(.*?\)\n*/g, "");

    parts.push(content);
    parts.push("\n\n---\n\n");

    // Insert artifacts
    if (block.artifactInserts) {
      for (const insert of block.artifactInserts) {
        if (insert.after) {
          const artifactPath = path.join(ARTIFACTS_DIR, insert.artifact);
          if (fs.existsSync(artifactPath)) {
            let artifactContent = fs.readFileSync(artifactPath, "utf-8");
            parts.push(`\n\n> **[Exhibit]**\n>\n`);
            // Convert artifact to blockquote format for cleaner rendering
            const lines = artifactContent.split("\n");
            for (const line of lines) {
              parts.push(`> ${line}\n`);
            }
            parts.push(`\n---\n\n`);
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
  const combinedPath = path.join(DIST_DIR, "kdp-book.md");
  fs.writeFileSync(combinedPath, parts.join("\n"), "utf-8");
  console.log(`  ✅ Combined manuscript (text-only): ${path.basename(combinedPath)}`);

  // 2. Create clean EPUB CSS — NO external imports
  const epubCSS = `/* KDP EPUB Stylesheet — The 2,500 Donkeys */

body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.6;
  color: #1a1a1a;
  margin: 0;
  padding: 0;
}

h1 {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.8em;
  font-weight: normal;
  text-align: center;
  margin-top: 3em;
  margin-bottom: 1.5em;
  letter-spacing: 0.05em;
  page-break-before: always;
}

h2 {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.3em;
  font-weight: normal;
  text-align: center;
  margin-top: 2em;
  margin-bottom: 1em;
}

h3 {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.1em;
  font-weight: bold;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

p {
  text-indent: 1.5em;
  margin: 0;
  padding: 0;
  text-align: justify;
}

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
}

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
  font-weight: bold;
}

code {
  font-family: "Courier New", monospace;
  font-size: 0.85em;
}

pre {
  font-family: "Courier New", monospace;
  font-size: 0.8em;
  padding: 1em;
  white-space: pre-wrap;
  word-wrap: break-word;
}

strong {
  font-weight: bold;
}
`;
  const cssPath = path.join(DIST_DIR, "kdp-style.css");
  fs.writeFileSync(cssPath, epubCSS, "utf-8");
  console.log(`  ✅ KDP stylesheet: kdp-style.css`);

  // 3. Cover image
  const coverPng = path.join(IMAGES_DIR, "cover", "cover-front.png");
  const hasCover = fs.existsSync(coverPng);

  // 4. Build EPUB with Pandoc — minimal flags for KDP compatibility
  const epubPath = path.join(KDP_DIR, "the-2500-donkeys.epub");

  const pandocEpubArgs = [
    "pandoc",
    `"${combinedPath}"`,
    "-o", `"${epubPath}"`,
    "--from", "markdown+smart",
    "--to", "epub3",
    `--metadata=title:"${metadata.title}"`,
    `--metadata=author:"${metadata.author}"`,
    `--metadata=lang:${metadata.language}`,
    `--metadata=description:"${metadata.description}"`,
    `--css="${cssPath}"`,
    "--toc",
    "--toc-depth=1",
    "--split-level=1",
    "--epub-chapter-level=1",
    hasCover ? `--epub-cover-image="${coverPng}"` : "",
  ].filter(Boolean).join(" ");

  console.log(`\n[KDP-EPUB] Running Pandoc (EPUB)...`);

  try {
    execSync(pandocEpubArgs, { cwd: DIST_DIR, stdio: "pipe" });
    const stats = fs.statSync(epubPath);
    console.log(`  ✅ EPUB: ${(stats.size / 1024 / 1024).toFixed(2)} MB → ${epubPath}`);
  } catch (err) {
    console.error(`  ❌ EPUB failed:`, err.stderr ? err.stderr.toString() : err.message);
  }

  // 5. Build DOCX as backup
  const docxPath = path.join(KDP_DIR, "the-2500-donkeys.docx");

  const pandocDocxArgs = [
    "pandoc",
    `"${combinedPath}"`,
    "-o", `"${docxPath}"`,
    "--from", "markdown+smart",
    "--to", "docx",
    `--metadata=title:"${metadata.title}"`,
    `--metadata=author:"${metadata.author}"`,
    "--toc",
    "--toc-depth=1",
  ].filter(Boolean).join(" ");

  console.log(`[KDP-EPUB] Running Pandoc (DOCX backup)...`);

  try {
    execSync(pandocDocxArgs, { cwd: DIST_DIR, stdio: "pipe" });
    const stats = fs.statSync(docxPath);
    console.log(`  ✅ DOCX: ${(stats.size / 1024 / 1024).toFixed(2)} MB → ${docxPath}`);
  } catch (err) {
    console.error(`  ❌ DOCX failed:`, err.stderr ? err.stderr.toString() : err.message);
  }

  console.log(`\n[KDP-EPUB] Done. Upload EPUB to KDP. If it fails, try the DOCX.\n`);
}

buildKdpEpub();
