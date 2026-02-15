/**
 * build-paper-pdf.js — Academic Paper PDF Generator
 *
 * Converts the deterministic-literary-publishing.md paper into a
 * journal-quality PDF using Puppeteer (headless Chromium).
 *
 * Features:
 *   - Two-column body, single-column abstract/title
 *   - Page numbers (bottom center)
 *   - DOI visible on first page
 *   - Table of contents
 *   - Proper reference formatting
 *   - Professional typography (Computer Modern / Latin Modern feel)
 *
 * Usage: node papers/build-paper-pdf.js
 *
 * Prerequisites: puppeteer, marked (npm install)
 */

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const ROOT = path.resolve(__dirname, "..");
const PAPER_MD = path.join(__dirname, "deterministic-literary-publishing.md");
const DIST_DIR = path.join(ROOT, "dist");
const OUTPUT_PDF = path.join(DIST_DIR, "deterministic-literary-publishing.pdf");
const OUTPUT_HTML = path.join(DIST_DIR, "paper-preview.html");

// ─── Parse YAML front matter ───────────────────────────────────────
function parseFrontMatter(md) {
  // Normalize line endings
  md = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: md };
  const meta = {};
  match[1].split("\n").forEach((line) => {
    // Handle: key: "value with : colons"
    const quoted = line.match(/^(\w+):\s*"(.*)"\s*$/);
    if (quoted) {
      meta[quoted[1]] = quoted[2];
      return;
    }
    // Handle: key: value
    const plain = line.match(/^(\w+):\s*(.+?)\s*$/);
    if (plain) meta[plain[1]] = plain[2];
  });
  return { meta, body: match[2] };
}

// ─── Extract sections for TOC ──────────────────────────────────────
function extractTOC(html) {
  const entries = [];
  const re = /<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, "");
    entries.push({ id: m[1], text });
  }
  return entries;
}

// ─── Build HTML ────────────────────────────────────────────────────
function buildHTML() {
  const raw = fs.readFileSync(PAPER_MD, "utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const { meta, body } = parseFrontMatter(raw);

  // Configure marked v17 renderer
  const renderer = {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = text
        .replace(/<[^>]+>/g, "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
  };

  marked.use({ renderer, gfm: true });

  // Split into title block and body
  // Remove the duplicate title heading (first # heading) since we render it in the title block
  let bodyContent = body.replace(
    /^#\s+Deterministic Literary Publishing.*?\n/m,
    ""
  );

  // Remove the author/affiliation block (we render it in the title block)
  bodyContent = bodyContent.replace(
    /\*\*Kevan Burns\*\*[\s\S]*?\*\*License:\*\*.*?\n/m,
    ""
  );

  // Remove any leading ---
  bodyContent = bodyContent.replace(/^---\n/, "");

  // Split at Abstract to handle it specially
  const abstractMatch = bodyContent.match(
    /## Abstract\n\n([\s\S]*?)(?=\n\n\*\*Keywords:\*\*)/
  );
  const keywordsMatch = bodyContent.match(
    /\*\*Keywords:\*\*\s*(.*?)(?=\n\n---|\n\n##)/
  );
  const abstract = abstractMatch ? abstractMatch[1].trim() : "";
  const keywords = keywordsMatch ? keywordsMatch[1].trim() : "";

  // Everything after the abstract/keywords section
  const bodyAfterAbstract = bodyContent
    .replace(/## Abstract[\s\S]*?(?=\n## \d)/, "")
    .replace(/^---\n/, "");

  const bodyHTML = marked.parse(bodyAfterAbstract);
  const toc = extractTOC(bodyHTML);

  // Build TOC HTML
  const tocHTML = toc
    .map((e) => {
      const isAppendix = e.text.startsWith("Appendix");
      const cls = isAppendix ? ' class="toc-appendix"' : "";
      return `<li${cls}><a href="#${e.id}">${e.text}</a></li>`;
    })
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.title || "Paper"}</title>
<style>
/* ── Page Setup ─────────────────────────────────────────── */
@page {
  size: letter;
  margin: 1in 0.75in 1in 0.75in;
}

@page :first {
  margin-top: 0.75in;
}

/* ── Typography ─────────────────────────────────────────── */
:root {
  --serif: "Georgia", "Times New Roman", "Times", serif;
  --sans: "Segoe UI", "Helvetica Neue", "Arial", sans-serif;
  --mono: "Consolas", "Courier New", monospace;
  --text-color: #1a1a1a;
  --muted: #555;
  --accent: #2c5282;
  --rule: #ccc;
  --bg-code: #f5f5f5;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--serif);
  font-size: 10.5pt;
  line-height: 1.5;
  color: var(--text-color);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Title Block (single column) ────────────────────────── */
.title-block {
  text-align: center;
  padding: 0.25in 0.5in 0.3in;
  border-bottom: 2pt solid var(--text-color);
  margin-bottom: 0.25in;
  page-break-after: avoid;
}

.title-block h1 {
  font-family: var(--serif);
  font-size: 18pt;
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 0.15in;
  letter-spacing: -0.01em;
}

.title-block .author {
  font-size: 12pt;
  font-weight: 600;
  margin-bottom: 0.04in;
}

.title-block .affiliation {
  font-size: 10pt;
  color: var(--muted);
  font-style: italic;
  margin-bottom: 0.04in;
}

.title-block .email {
  font-size: 9pt;
  color: var(--muted);
  font-family: var(--mono);
  margin-bottom: 0.04in;
}

.title-block .orcid {
  font-size: 8.5pt;
  color: var(--muted);
  margin-bottom: 0.08in;
}

.title-block .orcid a {
  color: var(--link);
  text-decoration: none;
}

.title-block .meta-line {
  font-size: 8.5pt;
  color: var(--muted);
}

.title-block .meta-line a {
  color: var(--accent);
  text-decoration: none;
}

.doi-line {
  font-size: 9pt;
  font-weight: 600;
  margin-top: 0.06in;
}

.doi-line a {
  color: var(--accent);
  text-decoration: none;
}

/* ── Abstract (single column, boxed) ────────────────────── */
.abstract-block {
  margin: 0.15in 0 0.15in 0;
  padding: 0.12in 0.2in;
  background: #fafafa;
  border-left: 3pt solid var(--accent);
  page-break-after: avoid;
}

.abstract-block h2 {
  font-family: var(--sans);
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-bottom: 0.06in;
}

.abstract-block p {
  font-size: 9.5pt;
  line-height: 1.45;
  text-align: justify;
}

.keywords {
  font-size: 8.5pt;
  color: var(--muted);
  margin-top: 0.08in;
  line-height: 1.4;
}

.keywords strong {
  color: var(--text-color);
}

/* ── Table of Contents ──────────────────────────────────── */
.toc-block {
  margin: 0.15in 0 0.2in 0;
  padding: 0.1in 0.2in;
  border: 1pt solid var(--rule);
  page-break-after: avoid;
  column-count: 2;
  column-gap: 0.3in;
}

.toc-block h2 {
  font-family: var(--sans);
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  margin-bottom: 0.06in;
  column-span: all;
}

.toc-block ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-block li {
  font-size: 8.5pt;
  line-height: 1.65;
  padding-left: 0;
}

.toc-block li.toc-appendix {
  color: var(--muted);
}

.toc-block a {
  color: var(--text-color);
  text-decoration: none;
}

.toc-block a:hover {
  color: var(--accent);
}

/* ── Two-Column Body ────────────────────────────────────── */
.body-content {
  column-count: 2;
  column-gap: 0.3in;
  column-rule: 0.5pt solid #e0e0e0;
  text-align: justify;
  hyphens: auto;
  -webkit-hyphens: auto;
}

/* ── Headings ───────────────────────────────────────────── */
h2 {
  font-family: var(--sans);
  font-size: 12pt;
  font-weight: 700;
  margin-top: 0.22in;
  margin-bottom: 0.08in;
  color: var(--text-color);
  column-span: all;
  border-bottom: 0.75pt solid var(--rule);
  padding-bottom: 0.03in;
  page-break-after: avoid;
}

h3 {
  font-family: var(--sans);
  font-size: 10pt;
  font-weight: 700;
  margin-top: 0.15in;
  margin-bottom: 0.05in;
  color: #333;
  page-break-after: avoid;
}

h4 {
  font-family: var(--sans);
  font-size: 9.5pt;
  font-weight: 600;
  font-style: italic;
  margin-top: 0.1in;
  margin-bottom: 0.04in;
  color: #444;
}

/* ── Paragraphs ─────────────────────────────────────────── */
p {
  margin-bottom: 0.08in;
  text-indent: 0;
  orphans: 3;
  widows: 3;
}

/* ── Lists ──────────────────────────────────────────────── */
ol, ul {
  margin: 0.06in 0 0.08in 0.2in;
  padding: 0;
}

li {
  margin-bottom: 0.03in;
  font-size: 10pt;
}

/* ── Code ───────────────────────────────────────────────── */
code {
  font-family: var(--mono);
  font-size: 8.5pt;
  background: var(--bg-code);
  padding: 0.01in 0.04in;
  border-radius: 2px;
}

pre {
  background: var(--bg-code);
  border: 0.5pt solid var(--rule);
  border-radius: 3px;
  padding: 0.08in 0.1in;
  overflow-x: auto;
  font-size: 7.5pt;
  line-height: 1.4;
  margin: 0.08in 0 0.1in 0;
  break-inside: avoid;
}

pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

/* ── Tables ─────────────────────────────────────────────── */
.table-wrap {
  break-inside: avoid;
  margin: 0.08in 0 0.1in 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
  line-height: 1.35;
}

thead {
  background: #f0f0f0;
}

th {
  font-family: var(--sans);
  font-weight: 700;
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.04in 0.06in;
  border-bottom: 1.5pt solid var(--text-color);
  text-align: left;
}

td {
  padding: 0.03in 0.06in;
  border-bottom: 0.5pt solid #e0e0e0;
  vertical-align: top;
}

tr:last-child td {
  border-bottom: 1pt solid var(--text-color);
}

/* ── Blockquotes ────────────────────────────────────────── */
blockquote {
  border-left: 2pt solid var(--accent);
  margin: 0.08in 0 0.08in 0.1in;
  padding: 0.04in 0.1in;
  color: var(--muted);
  font-style: italic;
  font-size: 9.5pt;
}

/* ── Links ──────────────────────────────────────────────── */
a {
  color: var(--accent);
  text-decoration: none;
}

/* ── Horizontal Rules ───────────────────────────────────── */
hr {
  border: none;
  border-top: 0.5pt solid var(--rule);
  margin: 0.15in 0;
  column-span: all;
}

/* ── Strong/Em ──────────────────────────────────────────── */
strong {
  font-weight: 700;
}

em {
  font-style: italic;
}

/* ── References section ─────────────────────────────────── */
#references ~ p,
#references ~ ol li {
  font-size: 9pt;
  line-height: 1.4;
}

/* ── Appendix styling ───────────────────────────────────── */
[id^="appendix"] {
  margin-top: 0.15in;
}

/* ── Footer on every page ───────────────────────────────── */
.page-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 8pt;
  color: var(--muted);
}

/* ── Print adjustments ──────────────────────────────────── */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* ── Copyright footer on first page ─────────────────────── */
.license-footer {
  font-size: 7.5pt;
  color: var(--muted);
  text-align: center;
  margin-top: 0.08in;
  padding-top: 0.06in;
  border-top: 0.5pt solid var(--rule);
}
</style>
</head>
<body>

<!-- ─── Title Block ──────────────────────────────────────── -->
<div class="title-block">
  <h1>${meta.title || "Untitled"}</h1>
  <div class="author">Kevan Burns</div>
  <div class="affiliation">Independent Researcher &middot; FTH Trading, Norcross, GA</div>
  <div class="email">kevan.burns@fthtrading.com</div>
  <div class="orcid">ORCID: <a href="https://orcid.org/0009-0008-8425-939X">0009-0008-8425-939X</a></div>
  <div class="meta-line">
    Version ${meta.version || "1.0"} &mdash; ${meta.date || "2026"}
    &nbsp;|&nbsp;
    <a href="https://github.com/FTHTrading/2500-donkeys">GitHub Repository</a>
  </div>
  <div class="doi-line">
    DOI: <a href="https://doi.org/${meta.doi || ""}">${meta.doi || ""}</a>
  </div>
  <div class="license-footer">
    &copy; 2026 Kevan Burns. Licensed under
    <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
    Literary content &copy; Kevan Burns, all rights reserved.
  </div>
</div>

<!-- ─── Abstract ─────────────────────────────────────────── -->
<div class="abstract-block">
  <h2>Abstract</h2>
  <p>${abstract}</p>
  <div class="keywords"><strong>Keywords:</strong> ${keywords}</div>
</div>

<!-- ─── Table of Contents ────────────────────────────────── -->
<div class="toc-block">
  <h2>Contents</h2>
  <ul>
    ${tocHTML}
  </ul>
</div>

<!-- ─── Body ─────────────────────────────────────────────── -->
<div class="body-content">
${bodyHTML}
</div>

</body>
</html>`;
}

// ─── Generate PDF ──────────────────────────────────────────
async function generatePDF() {
  console.log("[PAPER-PDF] Building academic PDF...\n");

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  // Step 1: Build HTML
  console.log("  [1/2] Markdown → HTML (with academic styling)...");
  const html = buildHTML();

  // Save HTML for preview/debugging
  fs.writeFileSync(OUTPUT_HTML, html, "utf-8");
  console.log(`  ✅ HTML preview: ${path.relative(ROOT, OUTPUT_HTML)}`);

  // Step 2: Puppeteer → PDF
  console.log("  [2/2] Puppeteer: HTML → PDF...");

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Load HTML content directly
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for fonts
    await page.evaluateHandle("document.fonts.ready");

    // Generate PDF
    await page.pdf({
      path: OUTPUT_PDF,
      format: "Letter",
      margin: {
        top: "0.85in",
        bottom: "0.75in",
        left: "0.75in",
        right: "0.75in",
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: Georgia, serif; font-size: 7.5pt;
                    color: #999; width: 100%; padding: 0 0.75in;
                    box-sizing: border-box; text-align: center;">
          Burns (2026) &mdash; Deterministic Literary Publishing
        </div>
      `,
      footerTemplate: `
        <div style="font-family: Georgia, serif; font-size: 8pt;
                    color: #666; width: 100%; text-align: center;
                    padding: 0 0.75in; box-sizing: border-box;">
          <span class="pageNumber"></span>
        </div>
      `,
      printBackground: true,
      preferCSSPageSize: false,
    });

    const stats = fs.statSync(OUTPUT_PDF);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const sizeKB = (stats.size / 1024).toFixed(0);

    console.log(`\n[PAPER-PDF] ✅ Academic PDF generated successfully!`);
    console.log(`[PAPER-PDF]    Output: ${path.relative(ROOT, OUTPUT_PDF)}`);
    console.log(`[PAPER-PDF]    Size: ${sizeKB} KB (${sizeMB} MB)`);
    console.log(`[PAPER-PDF]    Format: US Letter (8.5" × 11")`);
    console.log(`[PAPER-PDF]    Layout: Two-column academic`);
    console.log(
      `[PAPER-PDF]    DOI: https://doi.org/10.5281/zenodo.18646886`
    );
    console.log(
      `\n[PAPER-PDF] Ready for SSRN and ResearchGate upload.\n`
    );
  } catch (err) {
    console.error(`\n[PAPER-PDF] ❌ PDF generation failed:`);
    console.error(err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generatePDF();
