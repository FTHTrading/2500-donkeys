#!/usr/bin/env node
/**
 * build-reader.js — Generates an interactive flipbook reader
 * Reads manuscript blocks, converts markdown to HTML, embeds chapter images,
 * and produces site/read.html as a self-contained reading experience.
 * 
 * Usage: node build/build-reader.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ORDER = require(path.join(ROOT, 'build', 'order.json'));
const MANUSCRIPT_DIR = path.join(ROOT, 'manuscript');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts');
const IMAGES_DIR = path.join(ROOT, 'images');
const OUTPUT = path.join(ROOT, 'site', 'read.html');

// Map chapter images to block prefixes
const CHAPTER_IMAGES = {
  'block-00': 'ch-00-genesis.png',
  'block-01': 'ch-01-parking-lot.png',
  'block-02': 'ch-02-paper.png',
  'block-03': 'ch-03-whatsapp.png',
  'block-04': 'ch-04-donkeys.png',
  'block-05': 'ch-05-procession.png',
  'block-06': 'ch-06-humanitarian.png',
  'block-07': 'ch-07-silence.png',
  'epilogue': 'ch-ep-genesis-remains.png'
};

/**
 * Convert markdown to HTML (minimal parser — handles the formatting in this manuscript)
 */
function mdToHtml(md) {
  let html = md;

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Em dashes
  html = html.replace(/ — /g, ' &mdash; ');
  html = html.replace(/—/g, '&mdash;');

  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Paragraphs — wrap non-tag lines
  const lines = html.split('\n');
  const result = [];
  let inParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      continue;
    }
    if (line.startsWith('<h') || line.startsWith('<hr') || line.startsWith('<blockquote') || line.startsWith('</blockquote')) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      result.push(line);
    } else {
      if (!inParagraph) {
        result.push('<p>' + line);
        inParagraph = true;
      } else {
        result.push(' ' + line);
      }
    }
  }
  if (inParagraph) result.push('</p>');

  return result.join('\n');
}

/**
 * Get the chapter image for a block filename
 */
function getChapterImage(filename) {
  for (const [prefix, img] of Object.entries(CHAPTER_IMAGES)) {
    if (filename.startsWith(prefix)) {
      const imgPath = path.join(IMAGES_DIR, 'chapters', img);
      if (fs.existsSync(imgPath)) {
        // Convert to base64 for self-contained HTML
        const data = fs.readFileSync(imgPath);
        return `data:image/png;base64,${data.toString('base64')}`;
      }
    }
  }
  return null;
}

/**
 * Get chapter grouping — which major chapter does this sub-block belong to
 */
function getChapterGroup(filename) {
  if (filename.startsWith('epilogue')) return 'epilogue';
  const match = filename.match(/^block-(\d+)/);
  return match ? `block-${match[1]}` : null;
}

// ── Build the book ──

console.log('Building interactive reader...');

// Flatten blocks + their artifact inserts into a single reading order
const blocks = [];
for (const block of ORDER.blocks) {
  // Main block (prose chapter)
  const filePath = path.join(MANUSCRIPT_DIR, block.file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const html = mdToHtml(raw);
  const title = block.title || block.file.replace(/\.md$/, '');
  const chapterGroup = getChapterGroup(block.file);
  const image = getChapterImage(block.file);

  blocks.push({
    index: blocks.length,
    filename: block.file,
    title,
    html,
    chapterGroup,
    image,
    isArtifact: false
  });

  // Insert artifacts that come after this block
  if (block.artifactInserts) {
    for (const insert of block.artifactInserts) {
      const artPath = path.join(ARTIFACT_DIR, insert.artifact);
      const artRaw = fs.readFileSync(artPath, 'utf-8');
      const artHtml = mdToHtml(artRaw);
      const artTitle = insert.artifact
        .replace(/\.md$/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      blocks.push({
        index: blocks.length,
        filename: insert.artifact,
        title: artTitle,
        html: artHtml,
        chapterGroup,
        image: null,
        isArtifact: true
      });
    }
  }
}

// Load cover image
const coverPath = path.join(IMAGES_DIR, 'cover', 'cover-front.png');
let coverDataUri = '';
if (fs.existsSync(coverPath)) {
  const data = fs.readFileSync(coverPath);
  coverDataUri = `data:image/png;base64,${data.toString('base64')}`;
}

// Build chapter navigation data
const chaptersJson = JSON.stringify(blocks.map(b => ({
  title: b.title,
  artifact: b.isArtifact
})));

// Count pages: cover + blocks + colophon
const totalPages = blocks.length + 2;

console.log(`  ${blocks.length} blocks loaded`);
console.log(`  ${Object.keys(CHAPTER_IMAGES).length} chapter images found`);
console.log(`  Cover: ${coverDataUri ? 'yes' : 'no'}`);

// ── Generate HTML ──

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The 2,500 Donkeys — Read</title>
<meta name="description" content="Read The 2,500 Donkeys by Kidd James. An interactive reading experience.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🫏</text></svg>">
<style>
/* ── Reset ── */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

/* ── Core ── */
:root {
  --bg: #0c0c12;
  --bg-page: #111118;
  --text: #d4d4d8;
  --text-dim: #71717a;
  --accent: #c9a84c;
  --accent-dim: rgba(201,168,76,0.15);
  --font-body: 'Georgia', 'Times New Roman', serif;
  --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --page-max: 680px;
}

html { font-size: 18px; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.75;
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}

/* ── Top bar ── */
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 48px;
  background: rgba(12,12,18,0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(201,168,76,0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
  font-family: var(--font-ui);
}

.topbar-title {
  color: var(--accent);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.topbar-progress {
  color: var(--text-dim);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}

.progress-bar {
  position: fixed;
  top: 48px; left: 0;
  height: 2px;
  background: var(--accent);
  transition: width 0.3s ease;
  z-index: 100;
}

/* ── Page container ── */
.book {
  position: absolute;
  top: 50px; bottom: 60px;
  left: 0; right: 0;
  overflow: hidden;
}

.page {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  padding: 40px 24px 60px;
  opacity: 0;
  transform: translateX(40px);
  transition: opacity 0.35s ease, transform 0.35s ease;
  pointer-events: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(201,168,76,0.3) transparent;
}

.page.active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.page.exit-left {
  opacity: 0;
  transform: translateX(-40px);
}

.page-inner {
  max-width: var(--page-max);
  width: 100%;
}

/* ── Cover page ── */
.cover-page {
  justify-content: center;
  text-align: center;
}

.cover-page img {
  max-width: 340px;
  width: 80%;
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 4px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(201,168,76,0.15);
  margin-bottom: 32px;
}

.cover-page h1 {
  color: var(--accent);
  font-size: 2rem;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.cover-page .author {
  color: var(--text-dim);
  font-style: italic;
  font-size: 1rem;
  margin-bottom: 32px;
}

.cover-page .start-btn {
  display: inline-block;
  padding: 12px 32px;
  border: 1px solid var(--accent);
  color: var(--accent);
  text-decoration: none;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;
}

.cover-page .start-btn:hover {
  background: var(--accent);
  color: var(--bg);
}

/* ── Chapter content ── */
.chapter-image {
  width: 100%;
  max-width: 500px;
  margin: 0 auto 32px;
  display: block;
  border-radius: 4px;
  border: 1px solid rgba(201,168,76,0.15);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.page-inner h1 {
  color: var(--accent);
  font-size: 1.5rem;
  text-align: center;
  margin-bottom: 24px;
  letter-spacing: 0.03em;
}

.page-inner h2 {
  color: var(--accent);
  font-size: 1.15rem;
  margin: 28px 0 12px;
}

.page-inner h3 {
  color: var(--text);
  font-size: 1rem;
  margin: 20px 0 8px;
}

.page-inner p {
  margin-bottom: 16px;
  text-align: justify;
  hyphens: auto;
}

.page-inner hr {
  border: none;
  text-align: center;
  margin: 28px 0;
  color: var(--text-dim);
}

.page-inner hr::after {
  content: '· · ·';
  letter-spacing: 0.3em;
}

.page-inner blockquote {
  border-left: 2px solid var(--accent);
  padding: 8px 0 8px 20px;
  margin: 20px 0;
  color: var(--text-dim);
  font-style: italic;
}

.page-inner strong { color: #e4e4e7; }

.page-inner em { color: #a1a1aa; }

/* Artifact badge */
.artifact-badge {
  display: inline-block;
  background: var(--accent-dim);
  color: var(--accent);
  padding: 3px 10px;
  border-radius: 3px;
  font-family: var(--font-ui);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

/* ── Colophon page ── */
.colophon {
  justify-content: center;
  text-align: center;
}

.colophon h2 {
  color: var(--accent);
  font-size: 1.3rem;
  margin-bottom: 24px;
}

.colophon p {
  color: var(--text-dim);
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.colophon a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.colophon a:hover { border-bottom-color: var(--accent); }

/* ── Bottom nav ── */
.bottombar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 56px;
  background: rgba(12,12,18,0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(201,168,76,0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
  font-family: var(--font-ui);
}

.nav-btn {
  padding: 8px 20px;
  border: 1px solid rgba(201,168,76,0.3);
  color: var(--accent);
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--font-ui);
  transition: all 0.2s;
  border-radius: 3px;
}

.nav-btn:hover {
  background: rgba(201,168,76,0.1);
}

.nav-btn:disabled {
  opacity: 0.2;
  cursor: default;
}

.nav-btn:disabled:hover {
  background: transparent;
}

.toc-btn {
  padding: 8px 16px;
  border: 1px solid rgba(201,168,76,0.2);
  color: var(--text-dim);
  background: transparent;
  cursor: pointer;
  font-size: 0.7rem;
  font-family: var(--font-ui);
  border-radius: 3px;
  transition: all 0.2s;
}

.toc-btn:hover {
  color: var(--accent);
  border-color: rgba(201,168,76,0.4);
}

/* ── Table of Contents overlay ── */
.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(12,12,18,0.97);
  z-index: 200;
  display: none;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 60px 20px;
}

.toc-overlay.open { display: flex; }

.toc-overlay h2 {
  color: var(--accent);
  font-size: 1.2rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 32px;
}

.toc-list {
  list-style: none;
  max-width: 500px;
  width: 100%;
}

.toc-list li {
  border-bottom: 1px solid rgba(201,168,76,0.08);
}

.toc-list button {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  padding: 12px 8px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toc-list button:hover {
  color: var(--accent);
  background: rgba(201,168,76,0.05);
}

.toc-list .toc-num {
  color: var(--text-dim);
  font-size: 0.7rem;
  font-family: var(--font-ui);
  min-width: 24px;
  font-variant-numeric: tabular-nums;
}

.toc-list .toc-artifact {
  color: var(--accent);
  font-size: 0.6rem;
  font-family: var(--font-ui);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-left: auto;
}

.toc-close {
  position: fixed;
  top: 20px; right: 20px;
  background: none;
  border: 1px solid rgba(201,168,76,0.3);
  color: var(--accent);
  width: 40px; height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 201;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toc-close:hover { background: rgba(201,168,76,0.1); }

/* ── Mobile ── */
@media (max-width: 640px) {
  html { font-size: 16px; }
  .page { padding: 24px 16px 40px; }
  .page-inner h1 { font-size: 1.25rem; }
  .cover-page img { max-width: 260px; }
  .cover-page h1 { font-size: 1.6rem; }
}
</style>
</head>
<body>

<!-- Top bar -->
<div class="topbar">
  <span class="topbar-title">The 2,500 Donkeys</span>
  <span class="topbar-progress" id="progress-text">Cover</span>
</div>
<div class="progress-bar" id="progress-bar" style="width: 0%"></div>

<!-- Book container -->
<div class="book" id="book">

  <!-- Cover -->
  <div class="page cover-page active" data-page="0">
    ${coverDataUri ? `<img src="${coverDataUri}" alt="Cover — The 2,500 Donkeys">` : ''}
    <h1>The 2,500 Donkeys</h1>
    <p class="author">by Kidd James</p>
    <button class="start-btn" onclick="goTo(1)">Begin Reading</button>
  </div>

  <!-- Chapters -->
${blocks.map((block, i) => {
  const pageNum = i + 1;
  const imgTag = block.image ? `<img class="chapter-image" src="${block.image}" alt="${block.title}">` : '';
  const artifactBadge = block.isArtifact ? '<span class="artifact-badge">Documentary Artifact</span>' : '';
  return `  <div class="page" data-page="${pageNum}">
    <div class="page-inner">
      ${imgTag}
      ${artifactBadge}
      ${block.html}
    </div>
  </div>`;
}).join('\n\n')}

  <!-- Colophon -->
  <div class="page colophon" data-page="${totalPages - 1}">
    <div class="page-inner">
      <h2>Colophon</h2>
      <p><strong style="color:#c9a84c">The 2,500 Donkeys</strong></p>
      <p>by Kidd James (Kevan Burns)</p>
      <p style="margin-top:20px">31 chapters &middot; 5 artifacts &middot; ~75,000 words</p>
      <p>Cryptographically anchored on Polygon &middot; Pinned to IPFS &middot; DOI-archived</p>
      <p style="margin-top:20px">
        <a href="https://xxxiii.io">xxxiii.io</a> &middot;
        <a href="https://github.com/FTHTrading/2500-donkeys">GitHub</a> &middot;
        <a href="https://doi.org/10.5281/zenodo.18646886">DOI</a>
      </p>
      <p style="margin-top:32px;color:#555;font-size:0.8rem">
        <em>"Belief travels faster than verification."</em><br>
        — First Law of the Parking Lot
      </p>
    </div>
  </div>

</div>

<!-- Table of Contents overlay -->
<div class="toc-overlay" id="toc">
  <button class="toc-close" onclick="closeToc()">&times;</button>
  <h2>Table of Contents</h2>
  <ul class="toc-list">
    <li><button onclick="goTo(0);closeToc()"><span class="toc-num"></span> Cover</button></li>
${blocks.map((b, i) => {
  const artifact = b.isArtifact ? '<span class="toc-artifact">Artifact</span>' : '';
  return `    <li><button onclick="goTo(${i+1});closeToc()"><span class="toc-num">${i+1}</span> ${b.title} ${artifact}</button></li>`;
}).join('\n')}
    <li><button onclick="goTo(${totalPages-1});closeToc()"><span class="toc-num"></span> Colophon</button></li>
  </ul>
</div>

<!-- Bottom nav -->
<div class="bottombar">
  <button class="nav-btn" id="prev-btn" onclick="prev()" disabled>&larr; Prev</button>
  <button class="toc-btn" onclick="openToc()">Contents</button>
  <button class="nav-btn" id="next-btn" onclick="next()">Next &rarr;</button>
</div>

<script>
const TOTAL = ${totalPages};
const chapters = ${chaptersJson};
let current = 0;

function goTo(n) {
  if (n < 0 || n >= TOTAL || n === current) return;
  const pages = document.querySelectorAll('.page');
  const old = pages[current];
  const next = pages[n];

  // Direction
  if (n > current) {
    old.classList.remove('active');
    old.classList.add('exit-left');
  } else {
    old.classList.remove('active');
    old.style.transform = 'translateX(40px)';
    old.style.opacity = '0';
  }

  setTimeout(() => {
    old.classList.remove('exit-left');
    old.style.transform = '';
    old.style.opacity = '';
  }, 350);

  next.scrollTop = 0;
  
  if (n > current) {
    next.style.transform = 'translateX(40px)';
  } else {
    next.style.transform = 'translateX(-40px)';
  }
  next.style.opacity = '0';
  
  requestAnimationFrame(() => {
    next.classList.add('active');
    next.style.transform = '';
    next.style.opacity = '';
  });

  current = n;
  updateUI();
}

function next() { goTo(current + 1); }
function prev() { goTo(current - 1); }

function updateUI() {
  // Progress
  const pct = (current / (TOTAL - 1)) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';

  // Progress text
  let label = 'Cover';
  if (current > 0 && current < TOTAL - 1) {
    label = chapters[current - 1].title;
  } else if (current === TOTAL - 1) {
    label = 'Colophon';
  }
  document.getElementById('progress-text').textContent = label + '  (' + current + '/' + (TOTAL-1) + ')';

  // Nav buttons
  document.getElementById('prev-btn').disabled = current === 0;
  document.getElementById('next-btn').disabled = current === TOTAL - 1;
}

function openToc() { document.getElementById('toc').classList.add('open'); }
function closeToc() { document.getElementById('toc').classList.remove('open'); }

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (document.getElementById('toc').classList.contains('open')) {
    if (e.key === 'Escape') closeToc();
    return;
  }
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  if (e.key === 'Escape' || e.key === 't') { openToc(); }
});

// Touch swipe
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 60) {
    if (dx < 0) next();
    else prev();
  }
});

updateUI();
</script>

</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf-8');
console.log(`\\n  ✔ Reader written to site/read.html`);
console.log(`  ✔ ${totalPages} total pages (cover + ${blocks.length} blocks + colophon)`);
console.log(`  ✔ Self-contained — all images embedded as data URIs`);
