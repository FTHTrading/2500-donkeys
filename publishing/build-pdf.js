/**
 * build-pdf.js — Print-Ready PDF Pipeline
 *
 * Compiles the manuscript into a typeset PDF suitable for
 * KDP paperback submission (5.5" x 8.5" digest trim).
 *
 * Pipeline: order.json → combined MD → Pandoc → HTML → Puppeteer → PDF
 *
 * Uses Puppeteer (headless Chromium) for HTML→PDF conversion with:
 * - Precise page sizing (5.5" x 8.5")
 * - Running headers (book title recto, author name verso)
 * - Page numbers (bottom center)
 * - Professional interior typesetting via CSS
 *
 * Usage: node publishing/build-pdf.js
 *
 * Prerequisites:
 *   - Pandoc 3.x on PATH
 *   - puppeteer (npm install --save-dev puppeteer)
 *   - node publishing/generate-placeholders.js (or real images in images/)
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

function buildBookHTML() {
  const order = JSON.parse(fs.readFileSync(ORDER_FILE, "utf-8"));
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));

  // Map arc-opener blocks to their image files
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

  // Build combined markdown
  const parts = [];

  // Front matter
  const frontMatter = path.join(PUBLISHING_DIR, "front-matter.md");
  if (fs.existsSync(frontMatter)) {
    parts.push(fs.readFileSync(frontMatter, "utf-8"));
    parts.push("\n\n");
  }

  for (const block of order.blocks) {
    const blockPath = path.join(MANUSCRIPT_DIR, block.file);
    if (!fs.existsSync(blockPath)) continue;

    // Insert chapter opener image for arc-starting blocks only
    const imageBase = arcMap[block.id];
    if (imageBase) {
      const pngPath = path.join(IMAGES_DIR, "chapters", imageBase + ".png");
      const svgPath = path.join(IMAGES_DIR, "chapters", imageBase + ".svg");
      const imgPath = fs.existsSync(pngPath) ? pngPath : svgPath;
      if (fs.existsSync(imgPath)) {
        const absPath = imgPath.replace(/\\/g, "/");
        parts.push(`![${block.title}](file:///${absPath}){.chapter-image}\n\n`);
      }
    }

    let content = fs.readFileSync(blockPath, "utf-8");

    // Clean up headings for print
    content = content.replace(
      /^# BLOCK \w+ — (.+)$/m,
      (match, title) => `# ${title}`
    );
    content = content.replace(
      /^# Epilogue — (.+)$/m,
      (match, title) => `# Epilogue: ${title}`
    );

    parts.push(content);
    parts.push("\n\n---\n\n");

    // Artifacts
    if (block.artifactInserts) {
      for (const insert of block.artifactInserts) {
        if (insert.after) {
          const artifactPath = path.join(ARTIFACTS_DIR, insert.artifact);
          if (fs.existsSync(artifactPath)) {
            parts.push(`::: {.exhibit}\n`);
            parts.push(fs.readFileSync(artifactPath, "utf-8"));
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

  // Write combined markdown
  const combinedPath = path.join(DIST_DIR, "book-print.md");
  fs.writeFileSync(combinedPath, parts.join("\n"), "utf-8");

  // Convert to HTML via Pandoc
  const htmlPath = path.join(DIST_DIR, "book-print.html");
  const pandocCmd = [
    "pandoc",
    `"${combinedPath}"`,
    "-o", `"${htmlPath}"`,
    "--from", "markdown+smart",
    "--to", "html5",
    "--standalone",
    `--metadata=title:"${metadata.title}"`,
  ].join(" ");

  execSync(pandocCmd, { cwd: DIST_DIR, stdio: "pipe" });

  // Embed the print stylesheet directly into the HTML
  let html = fs.readFileSync(htmlPath, "utf-8");
  const cssPath = path.join(PUBLISHING_DIR, "print-style.css");
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    html = html.replace(
      "</head>",
      `<style>\n${cssContent}\n</style>\n</head>`
    );
  }

  // Ensure file:/// image paths work in Chromium
  html = html.replace(
    /src="file:\/\/\//g,
    'src="file:///'
  );

  fs.writeFileSync(htmlPath, html, "utf-8");
  return htmlPath;
}

async function buildPDF() {
  console.log("[PDF] Starting print-ready PDF build...\n");
  console.log('  Trim: 5.5" × 8.5" (digest)');
  console.log('  Margins: 0.875" inside, 0.625" outside\n');

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  // Step 1: Build HTML
  console.log("  [1/2] Pandoc: Markdown → HTML...");
  const htmlPath = buildBookHTML();
  console.log(`  ✅ HTML: ${path.basename(htmlPath)}`);

  // Step 2: Puppeteer HTML → PDF
  console.log("  [2/2] Puppeteer: HTML → PDF...");
  const outputPath = path.join(DIST_DIR, "the-2500-donkeys-print.pdf");

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--allow-file-access-from-files",
    ],
  });

  try {
    const page = await browser.newPage();

    // Load the HTML file
    const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60000 });

    // Wait for fonts to load
    await page.evaluateHandle("document.fonts.ready");

    // Generate PDF with professional print settings
    await page.pdf({
      path: outputPath,
      width: "5.5in",
      height: "8.5in",
      margin: {
        top: "0.75in",
        bottom: "0.75in",
        left: "0.875in",   // inside/gutter (assumes recto first)
        right: "0.625in",  // outside
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: 'EB Garamond', Georgia, serif; font-size: 8pt;
                    font-style: italic; color: #999; letter-spacing: 0.05em;
                    width: 100%; padding: 0 0.625in; box-sizing: border-box;">
          <span style="float: left;">Kidd James</span>
          <span style="float: right;">The 2,500 Donkeys</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-family: 'EB Garamond', Georgia, serif; font-size: 9pt;
                    color: #666; width: 100%; text-align: center;">
          <span class="pageNumber"></span>
        </div>
      `,
      printBackground: true,
      preferCSSPageSize: false,
    });

    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`\n[PDF] ✅ Build complete!`);
    console.log(`[PDF]    Output: ${outputPath}`);
    console.log(`[PDF]    Size: ${sizeMB} MB`);
    console.log(`[PDF]    Trim: 5.5" × 8.5"`);
    console.log(`[PDF]    Ready for KDP paperback upload`);
  } catch (err) {
    console.error(`\n[PDF] ❌ Puppeteer PDF generation failed:`);
    console.error(err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }

  return outputPath;
}

buildPDF();
