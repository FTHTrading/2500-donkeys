#!/usr/bin/env node
/**
 * update-reader.js — Apply all updates to read-ppp.html for Edition 2 (13 stories)
 */
const fs = require('fs');
const path = require('path');

const READER = path.resolve(__dirname, '..', 'site', 'read-ppp.html');
const NEW_PAGES = path.resolve(__dirname, '..', 'dist', 'new-pages.html');

let html = fs.readFileSync(READER, 'utf-8');
const newPages = fs.readFileSync(NEW_PAGES, 'utf-8');

// ── 1. Meta description ──
html = html.replace(
  'Read Private Placement Programs: Ten Stories from the War Room',
  'Read Private Placement Programs: Thirteen Stories from the War Room'
);

// ── 2. Cover subtitle ──
html = html.replace(
  '<p class="subtitle">Ten Stories from the War Room</p>',
  '<p class="subtitle">Thirteen Stories from the War Room</p>'
);

// ── 3. Front matter heading ──
html = html.replace(
  '<h2>Ten Stories from the War Room</h2>',
  '<h2>Thirteen Stories from the War Room</h2>'
);

// ── 4. Front matter body ──
html = html.replace(
  'These ten stories take place in the War Room.',
  'These thirteen stories take place in the War Room.'
);

// ── 5. Insert 3 new story pages before the glossary page ──
// Find the glossary comment and insert before it
html = html.replace(
  '  <!-- PAGE 13: Back Matter / Glossary -->',
  newPages + '\n  <!-- PAGE 16: Back Matter / Glossary -->'
);

// ── 6. Update glossary page number ──
html = html.replace(
  /data-page="13">\s*\n\s*<div class="page-inner">\s*\n\s*<div class="audio-player" data-src="audio\/stories\/12-back-matter\.mp3">/,
  'data-page="16">\n    <div class="page-inner">\n      <div class="audio-player" data-src="audio/stories/16-back-matter.mp3">'
);

// ── 7. Add new glossary entries ──
// Insert 43-101 before AML
html = html.replace(
  '<div class="glossary-entry"><p><strong>AML</strong>',
  '<div class="glossary-entry"><p><strong>43-101</strong> &mdash; National Instrument 43-101. A Canadian securities regulation governing the disclosure of scientific and technical information about mineral projects. Requires qualified geologists, defined sampling, independent labs, and public filing. Costs $250K&ndash;$2M. Takes six to eighteen months. In the War Room, &ldquo;or equivalent&rdquo; reduces it to a three-page PDF in Comic Sans.</p></div>\n<div class="glossary-entry"><p><strong>AML</strong>'
);

// Insert CIF after BVI
html = html.replace(
  '</p></div>\n<div class="glossary-entry"><p><strong>ERC-20</strong>',
  '</p></div>\n<div class="glossary-entry"><p><strong>CIF</strong> &mdash; Cost, Insurance, and Freight. An Incoterm used by people who ship things. Occasionally mentioned by people who have never shipped anything.</p></div>\n<div class="glossary-entry"><p><strong>DTC</strong> &mdash; Depository Trust Company. The central securities depository in the United States. In the War Room, it becomes a mystical &ldquo;global server&rdquo; that holds off-ledger funds accessible through codes provided after you sign an exclusivity agreement.</p></div>\n<div class="glossary-entry"><p><strong>ERC-20</strong>'
);

// Insert Insurance Wrap + IPIP + Irrevocable Letter of Exclusivity after IMFPA, before KYC
html = html.replace(
  '</p></div>\n<div class="glossary-entry"><p><strong>KYC</strong>',
  '</p></div>\n<div class="glossary-entry"><p><strong>Insurance Wrap</strong> &mdash; An insurance policy wrapped around the estimated value of an unextracted mineral asset, transforming dirt into a financial instrument. The philosopher&rsquo;s stone of the punch list. Minimum value: $500 million. Available from insurers whose names are disclosed upon engagement.</p></div>\n<div class="glossary-entry"><p><strong>IPIP</strong> &mdash; Interbank Payment and Information Processing. In institutional banking, a settlement framework. In the War Room, a mystical server pathway that converts off-ledger billions to on-ledger reality through codes, screens, and encouragement.</p></div>\n<div class="glossary-entry"><p><strong>Irrevocable Letter of Exclusivity</strong> &mdash; A document that commits a client exclusively to a desk they haven&rsquo;t verified, for a program they haven&rsquo;t seen operate, with terms they cannot negotiate. Must be signed in blue ink. Cannot be modified. The exclusivity is real. Everything it applies to is hypothetical.</p></div>\n<div class="glossary-entry"><p><strong>KYC</strong>'
);

// Insert LOI after LBMA
html = html.replace(
  '</p></div>\n<div class="glossary-entry"><p><strong>LTV</strong>',
  '</p></div>\n<div class="glossary-entry"><p><strong>LOI</strong> &mdash; Letter of Intent. A psychological commitment device. Not a contract. Not binding. Not a trade. A statement of mood.</p></div>\n<div class="glossary-entry"><p><strong>LTV</strong>'
);

// Insert MT199 after LTV, before MT760
html = html.replace(
  '</p></div>\n<div class="glossary-entry"><p><strong>MT760</strong>',
  '</p></div>\n<div class="glossary-entry"><p><strong>MT199</strong> &mdash; A free-format SWIFT bank-to-bank message. Carries no financial obligation. Confirms no funds. Transfers nothing. In the War Room, it is the golden key that unlocks off-ledger platforms worth fifty billion dollars.</p></div>\n<div class="glossary-entry"><p><strong>MT760</strong>'
);

// Insert NCNDA + Off-Ledger after MT799, before OTG
html = html.replace(
  '</p></div>\n<div class="glossary-entry"><p><strong>OTG</strong>',
  '</p></div>\n<div class="glossary-entry"><p><strong>NCNDA</strong> &mdash; Non-Circumvention, Non-Disclosure Agreement. A document that protects broker chains from being bypassed. The chain&rsquo;s seatbelt.</p></div>\n<div class="glossary-entry"><p><strong>Off-Ledger</strong> &mdash; Money that exists but cannot be seen. Money that is real but cannot be counted. Money that belongs to someone but cannot be verified by anyone other than the person who claims it exists. Schr&ouml;dinger&rsquo;s capital.</p></div>\n<div class="glossary-entry"><p><strong>OTG</strong>'
);

// Insert POP + Punch List after POF, before SBLC
html = html.replace(
  '</p></div>\n<div class="glossary-entry"><p><strong>SBLC</strong>',
  '</p></div>\n<div class="glossary-entry"><p><strong>POP</strong> &mdash; Proof of Product. A document showing the product exists. Required after proof of funds, which is the wrong order, but the War Room does not concern itself with chronological logic.</p></div>\n<div class="glossary-entry"><p><strong>Punch List</strong> &mdash; A sacred liturgical document listing all required paperwork for program engagement. Verification flows upward (client to desk); promises flow downward (desk to client). Complete packages only. No exceptions. Blue ink required.</p></div>\n<div class="glossary-entry"><p><strong>SBLC</strong>'
);

// Insert SKR + SOF + SOW after SGS, before SWIFT
html = html.replace(
  '</p></div>\n<div class="glossary-entry"><p><strong>SWIFT</strong>',
  '</p></div>\n<div class="glossary-entry"><p><strong>SKR</strong> &mdash; Safe Keeping Receipt. A document from a vault confirming something is stored there. Not automatically transferable title. Not automatically negotiable. Often automatically misrepresented.</p></div>\n<div class="glossary-entry"><p><strong>SOF</strong> &mdash; Source of Funds. Where the money comes from. The question that ends the most conversations.</p></div>\n<div class="glossary-entry"><p><strong>SOW</strong> &mdash; Source of Wealth. How the money was originally generated. The more specific the answer, the better. &ldquo;Diversified business interests&rdquo; is not specific.</p></div>\n<div class="glossary-entry"><p><strong>SWIFT</strong>'
);

// ── 8. Update colophon page number and subtitle ──
html = html.replace(
  'data-page="14">',
  'data-page="17">'
);
html = html.replace(
  '<p><em>PPE Programs: Ten Stories from the War Room</em></p>',
  '<p><em>Private Placement Programs: Thirteen Stories from the War Room</em></p>'
);

// ── 9. Update TOC ──
html = html.replace(
  `    <li><button onclick="tocGo(13)"><span class="toc-num">&mdash;</span> Glossary &amp; Back Matter</button></li>
    <li><button onclick="tocGo(14)"><span class="toc-num">&mdash;</span> Colophon</button></li>`,
  `    <li><button onclick="tocGo(13)"><span class="toc-num">12</span> The Financial Alchemist&rsquo;s Punch List</button></li>
    <li><button onclick="tocGo(14)"><span class="toc-num">13</span> The Exclusivity Trap</button></li>
    <li><button onclick="tocGo(15)"><span class="toc-num">14</span> The Off-Ledger Revelation</button></li>
    <li><button onclick="tocGo(16)"><span class="toc-num">&mdash;</span> Glossary &amp; Back Matter</button></li>
    <li><button onclick="tocGo(17)"><span class="toc-num">&mdash;</span> Colophon</button></li>`
);

// ── 10. Update titles array ──
html = html.replace(
  `  '11 \\u00b7 The Initiator Awakening',
  'Glossary',
  'Colophon'`,
  `  '11 \\u00b7 The Initiator Awakening',
  '12 \\u00b7 The Financial Alchemist\\'s Punch List',
  '13 \\u00b7 The Exclusivity Trap',
  '14 \\u00b7 The Off-Ledger Revelation',
  'Glossary',
  'Colophon'`
);

fs.writeFileSync(READER, html);
console.log('Updated read-ppp.html');
console.log('Total length:', html.length, 'chars');

// Verify page count
const pageMatches = html.match(/data-page="/g);
console.log('Total data-page attributes:', pageMatches ? pageMatches.length : 0);
