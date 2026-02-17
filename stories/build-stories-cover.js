#!/usr/bin/env node
/**
 * build-stories-cover.js — Book Cover Generator for Private Placement Puppetry
 *
 * Creates a print-ready cover PDF for KDP paperback + EPUB cover image.
 *
 * KDP cover requirements (5.5" x 8.5" trim):
 * - Front cover: 5.5" x 8.5"
 * - Back cover: 5.5" x 8.5"
 * - Spine: depends on page count (calculated)
 * - Bleed: 0.125" on all edges
 * - Total: (5.5 + spine + 5.5 + 0.25) x (8.5 + 0.25)
 *
 * Spine calculation (cream paper): page_count * 0.0025
 *
 * Usage: node stories/build-stories-cover.js [--pages N]
 *
 * Outputs:
 *   dist/stories-cover.html    — Full wrap cover template
 *   dist/stories-cover.pdf     — Print-ready cover PDF
 *   dist/stories-cover-front.png — EPUB/ebook cover (1563x2500 @ 300 DPI)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const METADATA_FILE = path.join(__dirname, "book-metadata.json");

function getPageCount() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--pages");
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);

  // Estimate from manuscript
  const manuscriptDir = path.join(__dirname, "manuscript");
  const files = fs.readdirSync(manuscriptDir).filter(f => f.endsWith(".md"));
  let wordCount = 0;
  for (const f of files) {
    wordCount += fs.readFileSync(path.join(manuscriptDir, f), "utf-8").split(/\s+/).length;
  }
  const estimated = Math.ceil(wordCount / 250);
  console.log(`[COVER] Estimated pages: ${estimated} (~${wordCount} words / 250 wpp)`);
  return estimated;
}

async function buildCover() {
  console.log("[COVER] Building Private Placement Puppetry cover...\n");

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
  const pageCount = getPageCount();

  // KDP spine calculation (cream paper)
  const spineWidth = (pageCount * 0.0025).toFixed(4);
  const bleed = 0.125;
  const trimW = 5.5;
  const trimH = 8.5;
  const totalWidth = (trimW * 2 + parseFloat(spineWidth) + bleed * 2).toFixed(4);
  const totalHeight = (trimH + bleed * 2).toFixed(4);

  console.log(`  Pages: ${pageCount}`);
  console.log(`  Spine width: ${spineWidth}" (cream paper)`);
  console.log(`  Total cover: ${totalWidth}" × ${totalHeight}"`);
  console.log(`  At 300 DPI: ${Math.ceil(totalWidth * 300)} × ${Math.ceil(totalHeight * 300)} px\n`);

  // ── Full Wrap Cover HTML ──
  const wrapHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Private Placement Puppetry — Cover</title>
<style>
  @page {
    size: ${totalWidth}in ${totalHeight}in;
    margin: 0;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: ${totalWidth}in;
    height: ${totalHeight}in;
    font-family: Georgia, "Times New Roman", serif;
    color: #c9a84c;
    background: #0c0c12;
    position: relative;
    overflow: hidden;
  }

  /* === BACK COVER === */
  .back-cover {
    position: absolute;
    top: ${bleed}in;
    left: ${bleed}in;
    width: ${trimW}in;
    height: ${trimH}in;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 1in;
    text-align: center;
  }

  .back-cover .blurb {
    font-size: 11pt;
    line-height: 1.6;
    color: #d4c5a0;
    font-style: italic;
    margin-bottom: 1.5em;
    max-width: 4in;
  }

  .back-cover .tagline {
    font-size: 9pt;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #c9a84c;
    margin-top: 1em;
    opacity: 0.8;
  }

  .back-cover .barcode-area {
    position: absolute;
    bottom: 0.75in;
    right: 0.5in;
    width: 2in;
    height: 1.2in;
    border: 1px dashed rgba(201,168,76,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    color: #666;
  }

  /* === SPINE === */
  .spine {
    position: absolute;
    top: ${bleed}in;
    left: ${bleed + trimW}in;
    width: ${spineWidth}in;
    height: ${trimH}in;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a10;
    border-left: 1px solid rgba(201,168,76,0.08);
    border-right: 1px solid rgba(201,168,76,0.08);
  }

  .spine-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    font-size: ${parseFloat(spineWidth) > 0.5 ? "10pt" : "7pt"};
    letter-spacing: 0.1em;
    white-space: nowrap;
    color: #c9a84c;
  }

  /* === FRONT COVER === */
  .front-cover {
    position: absolute;
    top: ${bleed}in;
    left: ${bleed + trimW + parseFloat(spineWidth)}in;
    width: ${trimW}in;
    height: ${trimH}in;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding: 1.2in 0.75in;
    text-align: center;
    background: linear-gradient(180deg, #0c0c12 0%, #111118 30%, #0c0c12 100%);
  }

  .front-cover .mask-icon {
    font-size: 72pt;
    margin-top: 0.5in;
    margin-bottom: 0.3in;
    filter: grayscale(30%);
  }

  .front-cover .title {
    font-size: 34pt;
    font-weight: 400;
    letter-spacing: 0.06em;
    line-height: 1.2;
    color: #c9a84c;
  }

  .front-cover .rule {
    width: 2.5in;
    height: 1px;
    background: linear-gradient(90deg, transparent, #c9a84c, transparent);
    margin: 0.25in 0;
  }

  .front-cover .subtitle {
    font-size: 12pt;
    font-weight: 400;
    font-style: italic;
    letter-spacing: 0.12em;
    color: #d4c5a0;
    margin-top: 0.1in;
  }

  .front-cover .author {
    font-size: 14pt;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-top: auto;
    margin-bottom: 1in;
    color: #c9a84c;
  }

  .front-cover .edition-badge {
    font-size: 7pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(201,168,76,0.4);
    position: absolute;
    bottom: 0.5in;
  }
</style>
</head>
<body>
  <!-- BACK COVER -->
  <div class="back-cover">
    <div class="blurb">
      "The commission is the only product that consistently ships."
    </div>
    <div class="blurb" style="font-style: normal; font-size: 10pt;">
      Thirteen satirical stories about phantom gold deals, PPE brokerage chains,
      financial alchemy punch lists, off-ledger revelations, and the absurd
      mechanics of international commodity fraud &mdash; told in deadpan from the War Room.
    </div>
    <div class="blurb" style="font-style: normal; font-size: 9pt; color: #999; margin-top: 0.5em;">
      Every word SHA-256 hashed. Pinned to IPFS. Anchored on Polygon.
      The first short story collection whose proof-of-origin is part of its architecture.
    </div>
    <div class="tagline" style="margin-top: 1.2em;">
      Verify at xxxiii.io
    </div>
    <div class="barcode-area">
      [ISBN BARCODE]
    </div>
  </div>

  <!-- SPINE -->
  <div class="spine">
    <div class="spine-text">PRIVATE PLACEMENT PUPPETRY &nbsp;&nbsp;&bull;&nbsp;&nbsp; KIDD JAMES</div>
  </div>

  <!-- FRONT COVER -->
  <div class="front-cover">
    <div class="mask-icon">&#127917;</div>
    <div class="title">Private Placement<br>Puppetry</div>
    <div class="rule"></div>
    <div class="subtitle">Thirteen Stories from the War Room</div>
    <div class="author">Kidd James</div>
    <div class="edition-badge">Genesis Publishing Protocol</div>
  </div>
</body>
</html>`;

  const wrapPath = path.join(DIST_DIR, "stories-cover.html");
  fs.writeFileSync(wrapPath, wrapHTML, "utf-8");
  console.log(`  ✅ Cover HTML: ${path.basename(wrapPath)}`);

  // ── Front-only Cover HTML (for EPUB/ebook) ──
  const frontHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1563px;
    height: 2500px;
    font-family: Georgia, "Times New Roman", serif;
    color: #c9a84c;
    background: linear-gradient(180deg, #0c0c12 0%, #111118 30%, #0c0c12 100%);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    text-align: center;
    padding: 200px 120px;
  }
  .mask-icon { font-size: 160px; margin-bottom: 60px; filter: grayscale(30%); }
  .title { font-size: 96px; font-weight: 400; letter-spacing: 0.06em; line-height: 1.15; color: #c9a84c; }
  .rule { width: 500px; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 50px 0; }
  .subtitle { font-size: 32px; font-style: italic; letter-spacing: 0.12em; color: #d4c5a0; }
  .author { font-size: 36px; letter-spacing: 0.2em; text-transform: uppercase; color: #c9a84c; margin-top: auto; margin-bottom: 200px; }
  .badge { font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(201,168,76,0.4); position: absolute; bottom: 80px; }
</style>
</head>
<body>
  <div class="mask-icon">&#127917;</div>
  <div class="title">PPE<br>Puppetry</div>
  <div class="rule"></div>
  <div class="subtitle">Thirteen Stories from the War Room</div>
  <div class="author">Kidd James</div>
  <div class="badge">Genesis Publishing Protocol</div>
</body>
</html>`;

  const frontHtmlPath = path.join(DIST_DIR, "stories-cover-front.html");
  fs.writeFileSync(frontHtmlPath, frontHTML, "utf-8");

  // ── Generate PDFs and PNG via Puppeteer ──
  try {
    const puppeteer = require("puppeteer");
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--allow-file-access-from-files"],
    });

    // Full wrap cover PDF
    const wrapPage = await browser.newPage();
    await wrapPage.goto("file:///" + wrapPath.replace(/\\/g, "/"), { waitUntil: "networkidle0" });
    await wrapPage.evaluateHandle("document.fonts.ready");

    const wrapPdf = path.join(DIST_DIR, "stories-cover.pdf");
    await wrapPage.pdf({
      path: wrapPdf,
      width: totalWidth + "in",
      height: totalHeight + "in",
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });
    const wrapStats = fs.statSync(wrapPdf);
    console.log(`  ✅ Cover PDF (wrap): ${path.basename(wrapPdf)} (${(wrapStats.size / 1024).toFixed(0)} KB)`);

    // Front cover PNG for EPUB
    const frontPage = await browser.newPage();
    await frontPage.setViewport({ width: 1563, height: 2500, deviceScaleFactor: 1 });
    await frontPage.goto("file:///" + frontHtmlPath.replace(/\\/g, "/"), { waitUntil: "networkidle0" });
    await frontPage.evaluateHandle("document.fonts.ready");
    await new Promise(r => setTimeout(r, 500));

    const pngPath = path.join(DIST_DIR, "stories-cover-front.png");
    await frontPage.screenshot({ path: pngPath, fullPage: false });
    const pngStats = fs.statSync(pngPath);
    console.log(`  ✅ Cover PNG (ebook): ${path.basename(pngPath)} (${(pngStats.size / 1024).toFixed(0)} KB, 1563×2500)`);

    await browser.close();

    console.log(`\n[COVER] ✅ Private Placement Puppetry cover generated!`);
    console.log(`[COVER]    Wrap PDF: ${wrapPdf}`);
    console.log(`[COVER]    Front PNG: ${pngPath}`);
    console.log(`[COVER]    Use PNG as --epub-cover-image`);
  } catch (err) {
    console.error(`\n[COVER] ❌ Puppeteer failed: ${err.message}`);
    console.log(`[COVER]    Cover HTML saved — open in browser to preview`);
  }
}

buildCover();
