#!/usr/bin/env node
/**
 * build-stories-pdf.js — Print-ready PDF for "Private Placement Puppetry"
 *
 * Concatenates manuscript files in order → Pandoc → HTML → Puppeteer → PDF
 * Reuses the existing print-style.css for 5.5" × 8.5" digest trim.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MANUSCRIPT_DIR = path.join(__dirname, "manuscript");
const PUBLISHING_DIR = path.join(ROOT, "publishing");
const DIST_DIR = path.join(ROOT, "dist");
const METADATA_FILE = path.join(__dirname, "book-metadata.json");

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
  "13-the-financial-alchemists-punch-list.md",
  "14-the-exclusivity-trap.md",
  "15-the-off-ledger-revelation.md",
  "16-back-matter.md",
];

function buildBookHTML() {
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
  const parts = [];

  // YAML front matter for Pandoc
  parts.push("---");
  parts.push(`title: "${metadata.title}"`);
  parts.push(`subtitle: "${metadata.subtitle}"`);
  parts.push(`author: "${metadata.author}"`);
  parts.push(`lang: ${metadata.language}`);
  parts.push("---\n\n");

  // Concatenate all manuscript files in order
  for (const file of FILES) {
    const filePath = path.join(MANUSCRIPT_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Missing: ${file}`);
      continue;
    }
    let content = fs.readFileSync(filePath, "utf-8");
    parts.push(content);
    parts.push("\n\n");
  }

  // Write combined markdown
  const combinedPath = path.join(DIST_DIR, "stories-print.md");
  fs.writeFileSync(combinedPath, parts.join("\n"), "utf-8");

  // Convert to HTML via Pandoc
  const htmlPath = path.join(DIST_DIR, "stories-print.html");
  const pandocCmd = [
    "pandoc",
    `"${combinedPath}"`,
    "-o", `"${htmlPath}"`,
    "--from", "markdown+smart+fenced_divs",
    "--to", "html5",
    "--standalone",
    "--wrap=none",
    `--metadata=title:"${metadata.title}"`,
  ].join(" ");

  execSync(pandocCmd, { cwd: DIST_DIR, stdio: "pipe" });

  // Embed the print stylesheet
  let html = fs.readFileSync(htmlPath, "utf-8");
  const cssPath = path.join(PUBLISHING_DIR, "print-style.css");
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    html = html.replace(
      "</head>",
      `<style>\n${cssContent}\n</style>\n</head>`
    );
  }

  // Clean up any stray \newpage literals
  html = html.replace(/\\newpage/g, "");

  fs.writeFileSync(htmlPath, html, "utf-8");
  return htmlPath;
}

async function buildPDF() {
  console.log("[Stories PDF] Starting print-ready PDF build...\n");
  console.log('  Trim: 5.5" × 8.5" (digest)');
  console.log('  Margins: 0.875" gutter, 0.625" outside');
  console.log("  Fonts: Georgia / Times New Roman (system)\n");

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  // Step 1: Build HTML
  console.log("  [1/2] Pandoc: Markdown → HTML...");
  const htmlPath = buildBookHTML();
  console.log(`  ✅ HTML: ${path.basename(htmlPath)}`);

  // Step 2: Puppeteer HTML → PDF
  console.log("  [2/2] Puppeteer: HTML → PDF...");
  const outputPath = path.join(DIST_DIR, "ppe-puppetry-print.pdf");

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--allow-file-access-from-files",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise(r => setTimeout(r, 1000));

    await page.pdf({
      path: outputPath,
      preferCSSPageSize: true,
      margin: {
        top: "0.75in",
        bottom: "0.75in",
        left: "0.875in",
        right: "0.625in",
      },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 1px;"></div>',
      footerTemplate: `
        <div style="font-family: Georgia, 'Times New Roman', serif;
                    font-size: 9px; color: #888;
                    width: 100%; text-align: center;
                    padding-top: 0.2in;">
          <span class="pageNumber"></span>
        </div>
      `,
      printBackground: true,
    });

    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`\n[Stories PDF] ✅ Build complete!`);
    console.log(`[Stories PDF]    Output: ${outputPath}`);
    console.log(`[Stories PDF]    Size: ${sizeMB} MB`);
    console.log(`[Stories PDF]    Trim: 5.5" × 8.5"`);
  } catch (err) {
    console.error(`\n[Stories PDF] ❌ Puppeteer PDF generation failed:`);
    console.error(err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }

  return outputPath;
}

buildPDF();
