#!/usr/bin/env node
/**
 * build-stories-epub.js — KDP-ready EPUB + DOCX for "PPE Puppetry"
 *
 * Concatenates stories manuscript → Pandoc → EPUB3 + DOCX backup.
 * Text-only (no images), fenced_divs for front/back matter styling.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MANUSCRIPT_DIR = path.join(__dirname, "manuscript");
const DIST_DIR = path.join(ROOT, "dist");
const KDP_DIR = path.join(DIST_DIR, "kdp");
const METADATA_FILE = path.join(__dirname, "book-metadata.json");
const IMAGES_DIR = path.join(ROOT, "images");

// Manuscript files in reading order
const FILES = [
  "00-front-matter.md",
  "01-mt799-is-not-money.md",
  "02-the-bank-that-didnt-exist.md",
  "03-commission-above-supply-depth.md",
  "04-the-ghost-monetizer.md",
  "05-the-mandate-that-couldnt-sign.md",
  "06-vault-without-address.md",
  "07-the-compliance-wall.md",
  "08-bonded-but-never-seen.md",
  "09-the-sovereign-whisper.md",
  "10-the-tokenized-mirage.md",
  "11-the-initiator-awakening.md",
  "12-back-matter.md",
];

function buildKdpEpub() {
  console.log("\n[Stories EPUB] Starting KDP EPUB + DOCX build...\n");

  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));

  // Ensure output dirs
  if (!fs.existsSync(KDP_DIR)) fs.mkdirSync(KDP_DIR, { recursive: true });
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  // 1. Concatenate manuscript files
  const parts = [];

  // YAML front matter
  parts.push("---");
  parts.push(`title: "${metadata.title}"`);
  parts.push(`subtitle: "${metadata.subtitle}"`);
  parts.push(`author: "${metadata.author}"`);
  parts.push(`lang: ${metadata.language}`);
  parts.push("---\n\n");

  for (const file of FILES) {
    const filePath = path.join(MANUSCRIPT_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Missing: ${file}`);
      continue;
    }
    let content = fs.readFileSync(filePath, "utf-8");
    // Strip any image references for text-only EPUB
    content = content.replace(/!\[.*?\]\(.*?\)/g, "");
    parts.push(content);
    parts.push("\n\n");
  }

  const combinedPath = path.join(DIST_DIR, "stories-kdp.md");
  fs.writeFileSync(combinedPath, parts.join("\n"), "utf-8");
  console.log(`  ✅ Combined manuscript (text-only): ${path.basename(combinedPath)}`);

  // 2. KDP EPUB Stylesheet
  const epubCSS = `/* KDP EPUB Stylesheet — PPE Puppetry */

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

/* Front matter sections */
.front-matter .half-title {
  text-align: center;
  margin-top: 5em;
  page-break-after: always;
}

.front-matter .title-page {
  text-align: center;
  page-break-after: always;
}

.front-matter .title-page h1 {
  page-break-before: auto;
}

.front-matter .copyright-page {
  font-size: 0.9em;
  page-break-after: always;
}

.front-matter .copyright-page p {
  text-indent: 0;
  text-align: left;
}

.front-matter .dedication {
  text-align: center;
  font-style: italic;
  margin-top: 5em;
  page-break-after: always;
}

.front-matter .epigraph-page {
  margin-top: 4em;
  page-break-after: always;
}

.front-matter .preface {
  page-break-before: always;
}

.front-matter .structure-guide {
  page-break-before: always;
}

/* Back matter */
.back-matter {
  page-break-before: always;
}

.back-matter h2 {
  page-break-before: always;
}

.back-matter p {
  text-indent: 1.5em;
}

.back-matter h2 + p {
  text-indent: 0;
}

.back-matter .glossary p {
  text-indent: 0;
  margin-bottom: 0.8em;
}

.back-matter .colophon p {
  text-indent: 0;
  text-align: center;
}
`;
  const cssPath = path.join(DIST_DIR, "stories-kdp-style.css");
  fs.writeFileSync(cssPath, epubCSS, "utf-8");
  console.log(`  ✅ KDP stylesheet: stories-kdp-style.css`);

  // 3. Cover image (use stories cover if available, fall back to main)
  const storiesCover = path.join(IMAGES_DIR, "cover", "stories-cover-front.png");
  const mainCover = path.join(IMAGES_DIR, "cover", "cover-front.png");
  const coverPng = fs.existsSync(storiesCover) ? storiesCover : (fs.existsSync(mainCover) ? mainCover : null);
  const hasCover = coverPng !== null;

  // 4. Build EPUB
  const epubPath = path.join(KDP_DIR, "ppe-puppetry.epub");
  const pandocEpubArgs = [
    "pandoc",
    `"${combinedPath}"`,
    "-o", `"${epubPath}"`,
    "--from", "markdown+smart+fenced_divs",
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

  console.log(`\n[Stories EPUB] Running Pandoc (EPUB)...`);

  try {
    execSync(pandocEpubArgs, { cwd: DIST_DIR, stdio: "pipe" });
    const stats = fs.statSync(epubPath);
    console.log(`  ✅ EPUB: ${(stats.size / 1024 / 1024).toFixed(2)} MB → ${epubPath}`);
  } catch (err) {
    console.error(`  ❌ EPUB failed:`, err.stderr ? err.stderr.toString() : err.message);
  }

  // 5. Build DOCX backup
  const docxPath = path.join(KDP_DIR, "ppe-puppetry.docx");
  const pandocDocxArgs = [
    "pandoc",
    `"${combinedPath}"`,
    "-o", `"${docxPath}"`,
    "--from", "markdown+smart+fenced_divs",
    "--to", "docx",
    `--metadata=title:"${metadata.title}"`,
    `--metadata=author:"${metadata.author}"`,
    "--toc",
    "--toc-depth=1",
  ].filter(Boolean).join(" ");

  console.log(`[Stories EPUB] Running Pandoc (DOCX backup)...`);

  try {
    execSync(pandocDocxArgs, { cwd: DIST_DIR, stdio: "pipe" });
    const stats = fs.statSync(docxPath);
    console.log(`  ✅ DOCX: ${(stats.size / 1024 / 1024).toFixed(2)} MB → ${docxPath}`);
  } catch (err) {
    console.error(`  ❌ DOCX failed:`, err.stderr ? err.stderr.toString() : err.message);
  }

  console.log(`\n[Stories EPUB] Done. Upload EPUB to KDP.\n`);
}

buildKdpEpub();
