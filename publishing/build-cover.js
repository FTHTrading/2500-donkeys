/**
 * build-cover.js — Book Cover Generator
 *
 * Creates a print-ready cover PDF for KDP paperback.
 *
 * KDP cover requirements (5.5" x 8.5" trim):
 * - Front cover: 5.5" x 8.5"
 * - Back cover: 5.5" x 8.5"
 * - Spine: depends on page count (calculated)
 * - Bleed: 0.125" on all edges
 * - Total dimensions: (5.5 + spine + 5.5 + 0.25) x (8.5 + 0.25)
 * - Resolution: 300 DPI minimum
 * - Color space: CMYK preferred, RGB accepted
 *
 * Spine calculation (cream paper): spine_width = page_count * 0.0025
 * Spine calculation (white paper):  spine_width = page_count * 0.002252
 *
 * Usage: node publishing/build-cover.js [--pages N]
 *
 * This generates an HTML cover template that can be:
 * 1. Used as-is with WeasyPrint for a text-based cover
 * 2. Used as a positioning guide for overlay with real artwork
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DIST_DIR = path.resolve(__dirname, "..", "dist");
const IMAGES_DIR = path.resolve(__dirname, "..", "images");

// Parse page count from args or estimate from manuscript
function getPageCount() {
  const args = process.argv.slice(2);
  const pagesIdx = args.indexOf("--pages");
  if (pagesIdx !== -1 && args[pagesIdx + 1]) {
    return parseInt(args[pagesIdx + 1], 10);
  }

  // Estimate from manuscript size
  // Average ~250 words/page for 5.5x8.5 fiction
  const manuscriptPath = path.join(DIST_DIR, "final-manuscript.md");
  if (fs.existsSync(manuscriptPath)) {
    const content = fs.readFileSync(manuscriptPath, "utf-8");
    const wordCount = content.split(/\s+/).length;
    const estimated = Math.ceil(wordCount / 250);
    console.log(`[COVER] Estimated pages: ${estimated} (~${wordCount} words / 250 wpp)`);
    return estimated;
  }

  console.log("[COVER] No manuscript found, using default 300 pages");
  return 300;
}

async function buildCover() {
  console.log("[COVER] Building cover template...\n");

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  const pageCount = getPageCount();

  // KDP spine calculation (cream paper)
  const spineWidth = (pageCount * 0.0025).toFixed(4);
  const bleed = 0.125;

  // Total cover dimensions
  const trimW = 5.5;
  const trimH = 8.5;
  const totalWidth = (trimW * 2 + parseFloat(spineWidth) + bleed * 2).toFixed(4);
  const totalHeight = (trimH + bleed * 2).toFixed(4);

  console.log(`  Pages: ${pageCount}`);
  console.log(`  Spine width: ${spineWidth}" (cream paper)`);
  console.log(`  Total cover: ${totalWidth}" × ${totalHeight}"`);
  console.log(`  At 300 DPI: ${Math.ceil(totalWidth * 300)} × ${Math.ceil(totalHeight * 300)} px\n`);

  // Check for cover artwork
  const coverArt = path.join(IMAGES_DIR, "cover", "cover-front.png");
  const hasArt = fs.existsSync(coverArt);

  const coverHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>The 2,500 Donkeys — Cover</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap');

  @page {
    size: ${totalWidth}in ${totalHeight}in;
    margin: 0;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: ${totalWidth}in;
    height: ${totalHeight}in;
    font-family: "EB Garamond", Georgia, serif;
    color: #c9a84c;
    background: #1a1a2e;
    position: relative;
    overflow: hidden;
  }

  /* === LAYOUT GUIDES === */
  .bleed-area {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
  }

  .safe-area {
    position: absolute;
    top: ${bleed + 0.25}in;
    left: ${bleed + 0.25}in;
    right: ${bleed + 0.25}in;
    bottom: ${bleed + 0.25}in;
    /* border: 0.5px dashed rgba(201,168,76,0.2); — uncomment for guide lines */
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
    background: #15152a;
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
    ${hasArt ? `background-image: url('file:///${coverArt.replace(/\\/g, "/")}');
    background-size: cover;
    background-position: center;` : ""}
  }

  .front-cover .title {
    font-size: 36pt;
    font-weight: 400;
    letter-spacing: 0.08em;
    line-height: 1.2;
    margin-top: 0.8in;
    color: #c9a84c;
    ${hasArt ? "text-shadow: 2px 2px 8px rgba(0,0,0,0.8);" : ""}
  }

  .front-cover .subtitle {
    font-size: 14pt;
    font-weight: 400;
    font-style: italic;
    letter-spacing: 0.15em;
    margin-top: 0.3in;
    color: #d4c5a0;
    ${hasArt ? "text-shadow: 1px 1px 4px rgba(0,0,0,0.8);" : ""}
  }

  .front-cover .author {
    font-size: 16pt;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-top: auto;
    margin-bottom: 1in;
    color: #c9a84c;
    ${hasArt ? "text-shadow: 1px 1px 6px rgba(0,0,0,0.8);" : ""}
  }

  .front-cover .rule {
    width: 2in;
    height: 1px;
    background: #c9a84c;
    opacity: 0.5;
    margin: 0.2in 0;
  }
</style>
</head>
<body>
  <!-- BACK COVER -->
  <div class="back-cover">
    <div class="blurb">
      "The deal expanded in inverse proportion to its certainty."
    </div>
    <div class="blurb" style="font-style: normal; font-size: 10pt;">
      A satirical novel about phantom gold deals, WhatsApp broker chains,
      and 2,500 donkeys walking across the Sahel — reconstructed from
      a cryptographic archive hashed before the deal closed.
    </div>
    <div class="blurb" style="font-style: normal; font-size: 9pt; color: #999; margin-top: 0.5em;">
      Every word SHA-256 hashed. Pinned to IPFS. Anchored on Polygon.
      The first novel whose proof-of-origin is part of the narrative.
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
    <div class="spine-text">THE 2,500 DONKEYS &nbsp;&nbsp;•&nbsp;&nbsp; KIDD JAMES</div>
  </div>

  <!-- FRONT COVER -->
  <div class="front-cover">
    <div class="title">The 2,500<br>Donkeys</div>
    <div class="rule"></div>
    <div class="subtitle">A Novel</div>
    <div class="author">Kidd James</div>
  </div>
</body>
</html>`;

  const htmlPath = path.join(DIST_DIR, "cover.html");
  fs.writeFileSync(htmlPath, coverHTML, "utf-8");
  console.log(`  ✅ Cover HTML: ${path.basename(htmlPath)}`);

  // Generate PDF via Puppeteer
  const pdfPath = path.join(DIST_DIR, "cover.pdf");
  try {
    const puppeteer = require("puppeteer");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--allow-file-access-from-files"],
    });
    const page = await browser.newPage();
    const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    await page.pdf({
      path: pdfPath,
      width: `${totalWidth}in`,
      height: `${totalHeight}in`,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });
    await browser.close();

    const stats = fs.statSync(pdfPath);
    console.log(`  ✅ Cover PDF: ${path.basename(pdfPath)} (${(stats.size / 1024).toFixed(0)} KB)`);
    console.log(`\n[COVER] ✅ Cover template generated!`);
    console.log(`[COVER]    Replace artwork in images/cover/cover-front.png`);
    console.log(`[COVER]    Then re-run to composite with text overlay`);
  } catch (err) {
    console.error(`\n[COVER] ❌ PDF generation failed: ${err.message}`);
    console.log(`[COVER]    Cover HTML saved — open in browser to preview`);
  }

  return pdfPath;
}

buildCover();
