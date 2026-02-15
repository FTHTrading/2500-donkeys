# PUBLISHING GUIDE

## The 2,500 Donkeys — From Manuscript to Market

This document covers the complete publishing pipeline: image creation,
typesetting, format generation, and distribution.

---

## I. Architecture

```
manuscript/        → 31 blocks (Markdown source)
artifacts/         → 5 embedded exhibits
images/
  chapters/        → 9 chapter opener illustrations
  cover/           → Front cover artwork
publishing/
  book-metadata.json   → Title, author, trim, typography spec
  front-matter.md      → Half-title, title page, copyright, epigraph
  back-matter.md       → Acknowledgments, about, colophon
  build-epub.js        → Markdown → EPUB3
  build-pdf.js         → Markdown → HTML → PDF (Puppeteer)
  build-cover.js       → Cover template → PDF
  print-style.css      → Interior typesetting CSS
  generate-placeholders.js → SVG placeholder images
  image-prompts.json   → DALL-E / Midjourney prompt library
dist/              → Build outputs (gitignored)
```

---

## II. Quick Start

### Prerequisites

| Tool | Install | Version |
|------|---------|---------|
| Node.js | nodejs.org | ≥ 18 |
| Pandoc | `winget install JohnMacFarlane.Pandoc` | ≥ 3.x |
| Puppeteer | `npm install` (included in devDeps) | auto |

### Build Everything

```bash
npm run publish        # compile + hash + manifest + epub + pdf + cover
```

### Build Individual Formats

```bash
npm run pub:epub       # → dist/the-2500-donkeys.epub
npm run pub:pdf        # → dist/the-2500-donkeys-print.pdf
npm run pub:cover      # → dist/cover.pdf
npm run pub:placeholders   # regenerate placeholder images
```

---

## III. Image System

### Chapter Openers

Nine chapter illustrations, one per narrative arc:

| Arc | File | Scene |
|-----|------|-------|
| 0 — Genesis | ch-00-genesis | Laptop screen glowing in empty parking lot |
| 1 — The Deal | ch-01-parking-lot | Two SUVs, strip mall, dusk |
| 2 — The Paper | ch-02-paper | Legal documents, conference table, pens |
| 3 — The Mutation | ch-03-whatsapp | WhatsApp screens mosaic |
| 4 — The Donkeys | ch-04-donkeys | Single donkey in warehouse |
| 5 — The Procession | ch-05-procession | Caravan stretching to horizon |
| 6 — The Settlement | ch-06-humanitarian | UN tents, compound |
| 7 — The Silence | ch-07-silence | Empty office, aftermath |
| Epilogue | ch-ep-genesis-remains | Dawn, different parking lot |

### Image Workflow

1. **Placeholders** (current): SVG files in `images/chapters/`
2. **Generate art**: Use prompts from `images/image-prompts.json`
   - Each prompt includes scene description, mood, and style directives
   - Global style: B&W pencil illustration, high contrast, literary fiction
   - Resolution: 1500×1000px (chapter), 2550×3300px (cover)
3. **Replace**: Drop PNG files alongside SVGs — the build prefers `.png` over `.svg`
4. **Rebuild**: `npm run pub:all`

### Image Prompts

Prompts are stored in `images/image-prompts.json` and are ready for:
- DALL-E 3 (via OpenAI API)
- Midjourney (paste prompt directly)
- Stable Diffusion (adapt style tokens)
- Manual commission (use scene descriptions as briefs)

### Cover Artwork

The cover system (`build-cover.js`) generates a full wrap-around cover:
- **Front**: 5.5" × 8.5"
- **Back**: 5.5" × 8.5" (includes blurb + barcode area)
- **Spine**: Calculated from page count (cream paper: pages × 0.0025")
- **Bleed**: 0.125" all edges
- **Total**: ~11.72" × 8.75" at 300 DPI (3516 × 2625 px)

To add custom cover art:
1. Place artwork at `images/cover/cover-front.png`
2. Run `npm run pub:cover`
3. The builder composites your art with title/author text overlay

---

## IV. Typesetting Specification

### Trim & Margins

| Property | Value |
|----------|-------|
| Trim size | 5.5" × 8.5" (digest) |
| Inside margin (gutter) | 0.875" |
| Outside margin | 0.625" |
| Top margin | 0.75" |
| Bottom margin | 0.75" |
| Paper | Cream (for spine calculation) |

### Typography

| Element | Font | Size | Notes |
|---------|------|------|-------|
| Body text | Crimson Text | 11pt | 1.5 line-height, justified, hyphenated |
| Headings | EB Garamond | 22pt | Centered, 0.08em letter-spacing |
| Drop caps | EB Garamond | 3.2em | First letter of each chapter |
| Page numbers | EB Garamond | 9pt | Bottom center |
| Running headers | EB Garamond | 8pt | "The 2,500 Donkeys" recto / "Kidd James" verso |

### Layout Rules

- Chapters start on recto (right-hand) pages
- First paragraph after heading: no indent, drop cap
- Subsequent paragraphs: 1.5em indent
- Scene breaks: `• • •` centered
- Widows/orphans: minimum 2 lines
- Artifacts: monospace, gold left border, shaded background

---

## V. EPUB Details

### Specifications

- Format: EPUB 3
- Table of contents: auto-generated (1 level)
- Chapter splitting: at `<h1>` boundaries
- Images: embedded in EPUB archive
- CSS: custom stylesheet (serif body, exhibit styling)
- Metadata: Dublin Core from `book-metadata.json`

### Validation

Before submission, validate the EPUB:
```bash
# Install epubcheck
java -jar epubcheck.jar dist/the-2500-donkeys.epub

# Or use the online validator:
# https://www.w3.org/publishing/epubcheck/
```

---

## VI. PDF Details

### Pipeline

```
Markdown → (Pandoc) → HTML → (Puppeteer/Chromium) → PDF
```

The two-stage pipeline gives us:
1. **Pandoc**: Smart typography (curly quotes, em dashes), Markdown extensions
2. **Puppeteer**: Precise page sizing, font rendering, header/footer templates

### Print CSS Features

The `print-style.css` handles:
- `@page` rules for 5.5" × 8.5" trim
- Drop caps via `::first-letter`
- Scene breaks (`<hr>` → `• • •`)
- Exhibit panels (`.exhibit` class)
- Widow/orphan control
- Hyphenation

Running headers and page numbers are injected by Puppeteer's
`headerTemplate` / `footerTemplate` system.

---

## VII. KDP Submission Checklist

### Ebook (Kindle)

- [ ] EPUB validated with epubcheck (0 errors)
- [ ] Cover image: 2550 × 3300 px, RGB, JPG/TIFF
- [ ] Categories: Fiction > Satirical, Fiction > Literary
- [ ] Keywords: satire, finance, gold trade, blockchain, literary fiction
- [ ] Description: copy from `book-metadata.json`
- [ ] Price set (suggest $9.99 ebook)
- [ ] DRM: disabled (literary protocol = open access philosophy)

### Paperback

- [ ] Interior PDF: 5.5" × 8.5", no bleed in interior
- [ ] Cover PDF: full wrap, correct spine width for page count
- [ ] Paper: cream
- [ ] Ink: black & white (interior)
- [ ] ISBN: KDP free or Bowker-purchased
- [ ] Price set (suggest $16.99 paperback)
- [ ] Print previewer: check margins, headers, page breaks

### Both Formats

- [ ] Copyright page matches metadata
- [ ] Blockchain anchor referenced in colophon
- [ ] CIDs and contract address correct
- [ ] Author bio current
- [ ] "Look Inside" preview checked post-publish

---

## VIII. ISBN Strategy

**Option A: KDP Free ISBN**
- Free, assigned by Amazon
- Listed as "Independently Published"
- Only usable on Amazon

**Option B: Bowker ISBN**
- Purchase from myidentifiers.com ($125 single / $295 pack of 10)
- Lists your imprint ("Genesis Publishing Protocol")
- Usable across all retailers
- Separate ISBNs needed for ebook vs paperback

Recommendation: Use KDP free ISBN for initial launch, upgrade to
Bowker ISBN if expanding to other retailers (IngramSpark, B&N, etc.)

---

## IX. Distribution Channels

### Primary

| Channel | Format | Notes |
|---------|--------|-------|
| Amazon KDP | EPUB + PDF | Primary storefront |
| Kindle Unlimited | EPUB | Enrollment optional (exclusivity required) |

### Secondary (requires Bowker ISBN)

| Channel | Format | Notes |
|---------|--------|-------|
| IngramSpark | PDF + EPUB | Bookstore/library distribution |
| Barnes & Noble Press | EPUB | Nook ecosystem |
| Apple Books | EPUB | Apple ecosystem |
| Kobo | EPUB | International reach |
| Google Play Books | EPUB/PDF | Google ecosystem |

### Web3 Native

| Channel | Format | Notes |
|---------|--------|-------|
| IPFS | Raw blocks | Already anchored |
| xxxiii.io | Web reader | Cloudflare Pages site |
| NFT editions | Token-gated | Future possibility via LiteraryAnchor.sol |

---

## X. File Outputs

After running `npm run publish`:

```
dist/
  the-2500-donkeys.epub         # Ebook (EPUB 3)
  the-2500-donkeys-print.pdf    # Paperback interior (5.5" × 8.5")
  cover.pdf                     # Full wrap cover
  cover.html                    # Cover preview (browser)
  book-combined.md              # Combined manuscript (EPUB source)
  book-print.md                 # Combined manuscript (PDF source)
  book-print.html               # Typeset HTML (PDF intermediate)
  final-manuscript.md           # Legacy compiled manuscript
```

---

## XI. Versioning

Book versions align with on-chain editions:
- **Edition 1 (Genesis)**: Original 9 blocks
- **Edition 2**: Expanded 31 blocks — current publishing target
- Future editions: amend via `LiteraryAnchor.sol` → rebuild → republish

The colophon (back matter) includes the IPFS CID and contract address,
creating a verifiable link between the physical book and the on-chain record.

---

*Publishing pipeline built for The 2,500 Donkeys literary protocol.*
*All formats generated from a single Markdown source of truth.*
