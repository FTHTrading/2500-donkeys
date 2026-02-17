#!/usr/bin/env node
/**
 * md-to-reader-pages.js — Convert story markdown files to HTML reader pages
 */
const fs = require('fs');
const path = require('path');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/—/g, '&mdash;')
    .replace(/–/g, '&ndash;')
    .replace(/é/g, '&eacute;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\u201c/g, '&ldquo;')
    .replace(/\u201d/g, '&rdquo;')
    .replace(/\u2018/g, '&lsquo;')
    .replace(/\u2019/g, '&rsquo;')
    .replace(/"/g, '&ldquo;')
    .replace(/'/g, '&rsquo;')
    .replace(/\n/g, '<br>');
}

function mdToHtml(md) {
  let text = md.replace(/\r\n/g, '\n').replace(/\\newpage\s*/g, '');
  let blocks = text.split(/\n\n+/);
  let html = '';
  let inList = false;
  let listType = '';

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    // Skip main title
    if (block.startsWith('# ') && !block.startsWith('## ')) continue;

    // HR
    if (block === '---') {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      html += '<hr>\n';
      continue;
    }

    // Blockquote
    if (block.startsWith('> ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      let q = block.replace(/^> /gm, '');
      q = escapeHtml(q);
      html += `<blockquote>${q}</blockquote>\n`;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(block)) {
      if (inList && listType !== 'ol') { html += `</${listType}>\n`; inList = false; }
      if (!inList) { html += '<ol>\n'; inList = true; listType = 'ol'; }
      let lines = block.split('\n');
      for (let line of lines) {
        let m = line.match(/^\d+\.\s+(.*)/);
        if (m) html += `<li>${escapeHtml(m[1])}</li>\n`;
      }
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(block)) {
      if (inList && listType !== 'ul') { html += `</${listType}>\n`; inList = false; }
      if (!inList) { html += '<ul>\n'; inList = true; listType = 'ul'; }
      let lines = block.split('\n');
      for (let line of lines) {
        let m = line.match(/^[-*]\s+(.*)/);
        if (m) html += `<li>${escapeHtml(m[1])}</li>\n`;
      }
      continue;
    }

    // Close list
    if (inList) { html += `</${listType}>\n`; inList = false; }

    // Subheading
    if (block.startsWith('## ')) {
      html += `<h2>${escapeHtml(block.slice(3))}</h2>\n`;
      continue;
    }

    // Paragraph
    html += `<p>${escapeHtml(block)}</p>\n`;
  }

  if (inList) html += `</${listType}>\n`;
  return html;
}

function getTitle(md) {
  const m = md.match(/^# (.+)/m);
  return m ? m[1] : 'Untitled';
}

const ROOT = path.resolve(__dirname, '..');
const files = [
  { file: 'stories/manuscript/13-the-financial-alchemists-punch-list.md', audio: '13-the-financial-alchemists-punch-list.mp3', page: 13, storyNum: 12 },
  { file: 'stories/manuscript/14-the-exclusivity-trap.md', audio: '14-the-exclusivity-trap.mp3', page: 14, storyNum: 13 },
  { file: 'stories/manuscript/15-the-off-ledger-revelation.md', audio: '15-the-off-ledger-revelation.mp3', page: 15, storyNum: 14 },
];

let allHtml = '';
for (const f of files) {
  const md = fs.readFileSync(path.join(ROOT, f.file), 'utf-8');
  const title = getTitle(md);
  const body = mdToHtml(md);
  const safeTitle = title.replace(/'/g, '&rsquo;');

  allHtml += `\n  <!-- PAGE ${f.page}: Story ${f.storyNum} \u2014 ${safeTitle} -->\n`;
  allHtml += `  <div class="page" data-page="${f.page}">\n`;
  allHtml += `    <div class="page-inner">\n`;
  allHtml += `      <div class="audio-player" data-src="audio/stories/${f.audio}">\n`;
  allHtml += `        <button class="play-btn" onclick="toggleAudio(this)" title="Listen">&#9654;</button>\n`;
  allHtml += `        <span class="audio-label">Listen</span>\n`;
  allHtml += `        <div class="audio-bar" onclick="seekAudio(event, this)"><div class="audio-bar-fill"></div></div>\n`;
  allHtml += `        <span class="audio-time">--:--</span>\n`;
  allHtml += `      </div>\n`;
  allHtml += `      <h1>${safeTitle}</h1>\n`;
  allHtml += body;
  allHtml += `    </div>\n`;
  allHtml += `  </div>\n`;
}

const outPath = path.join(ROOT, 'dist', 'new-pages.html');
fs.writeFileSync(outPath, allHtml);
console.log(`Written ${outPath} (${allHtml.length} chars)`);
