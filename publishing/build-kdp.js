/**
 * build-kdp.js — KDP Submission Package Builder
 *
 * Validates, copies, and prepares all files needed for Amazon KDP upload.
 * Generates a kdp-metadata.json sheet and a pre-submission checklist.
 *
 * Outputs to dist/kdp/:
 *   - the-2500-donkeys.epub        (Kindle ebook upload)
 *   - the-2500-donkeys-print.pdf   (Paperback interior)
 *   - cover.pdf                    (Full wrap cover for paperback)
 *   - kdp-metadata.json            (Copy-paste reference for KDP dashboard)
 *   - checklist.txt                (Pre-submission validation report)
 *
 * Usage:
 *   node publishing/build-kdp.js              # validate + package
 *   node publishing/build-kdp.js --check-only # validate only, don't copy
 *
 * Prerequisites:
 *   npm run pub:all   (to generate EPUB, PDF, cover)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ══════════════════════════════════════════════════════════════════════
//  PATHS
// ══════════════════════════════════════════════════════════════════════

const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const KDP_DIR = path.join(DIST_DIR, "kdp");
const METADATA_FILE = path.join(__dirname, "book-metadata.json");
const EDITION_FILE = path.join(DIST_DIR, "edition.json");

// Source files
const EPUB_SRC = path.join(DIST_DIR, "the-2500-donkeys.epub");
const PDF_SRC = path.join(DIST_DIR, "the-2500-donkeys-print.pdf");
const COVER_SRC = path.join(DIST_DIR, "cover.pdf");

// ══════════════════════════════════════════════════════════════════════
//  KDP LIMITS & REQUIREMENTS
// ══════════════════════════════════════════════════════════════════════

const KDP = {
  epub: {
    maxSizeMB: 650,          // KDP max ebook file size
    minSizeKB: 1,            // Sanity check — shouldn't be empty
  },
  pdf: {
    maxSizeMB: 650,          // KDP max interior PDF
    minSizeKB: 10,
  },
  cover: {
    minSizeKB: 10,
  },
  // KDP recommended cover dimensions for 5.5" x 8.5" trim
  coverDimensions: {
    frontWidthIn: 5.5,
    frontHeightIn: 8.5,
    bleedIn: 0.125,
    dpi: 300,
  },
  pricing: {
    suggestedEbook: "$9.99",
    suggestedPaperback: "$16.99",
    currency: "USD",
  },
  trim: {
    width: "5.5 in",
    height: "8.5 in",
  },
  categories: [
    "Fiction > Satirical",
    "Fiction > Literary",
  ],
};

// ══════════════════════════════════════════════════════════════════════
//  CHECKLIST ENGINE
// ══════════════════════════════════════════════════════════════════════

const checks = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(label, detail) {
  checks.push({ status: "PASS", label, detail });
  passCount++;
}

function fail(label, detail) {
  checks.push({ status: "FAIL", label, detail });
  failCount++;
}

function warn(label, detail) {
  checks.push({ status: "WARN", label, detail });
  warnCount++;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

// ══════════════════════════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════════════════════════

function validate() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  KDP Package Builder — The 2,500 Donkeys               ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ── 1. Source file existence ───────────────────────────────────────
  console.log("  Phase 1: Source Files\n");

  if (fs.existsSync(EPUB_SRC)) {
    const stat = fs.statSync(EPUB_SRC);
    const sizeMB = stat.size / (1024 * 1024);
    pass("EPUB exists", `${formatSize(stat.size)} at dist/the-2500-donkeys.epub`);

    if (sizeMB > KDP.epub.maxSizeMB) {
      fail("EPUB size", `${formatSize(stat.size)} exceeds KDP limit of ${KDP.epub.maxSizeMB} MB`);
    } else if (stat.size < KDP.epub.minSizeKB * 1024) {
      fail("EPUB size", `${formatSize(stat.size)} — file appears empty or corrupt`);
    } else {
      pass("EPUB size OK", `${formatSize(stat.size)} (limit: ${KDP.epub.maxSizeMB} MB)`);
    }
  } else {
    fail("EPUB missing", "Run 'npm run pub:epub' first");
  }

  if (fs.existsSync(PDF_SRC)) {
    const stat = fs.statSync(PDF_SRC);
    const sizeMB = stat.size / (1024 * 1024);
    pass("Interior PDF exists", `${formatSize(stat.size)} at dist/the-2500-donkeys-print.pdf`);

    if (sizeMB > KDP.pdf.maxSizeMB) {
      fail("PDF size", `${formatSize(stat.size)} exceeds KDP limit of ${KDP.pdf.maxSizeMB} MB`);
    } else if (stat.size < KDP.pdf.minSizeKB * 1024) {
      fail("PDF size", `${formatSize(stat.size)} — file appears empty or corrupt`);
    } else {
      pass("PDF size OK", `${formatSize(stat.size)} (limit: ${KDP.pdf.maxSizeMB} MB)`);
    }
  } else {
    fail("Interior PDF missing", "Run 'npm run pub:pdf' first");
  }

  if (fs.existsSync(COVER_SRC)) {
    const stat = fs.statSync(COVER_SRC);
    pass("Cover PDF exists", `${formatSize(stat.size)} at dist/cover.pdf`);

    if (stat.size < KDP.cover.minSizeKB * 1024) {
      fail("Cover size", `${formatSize(stat.size)} — file appears empty`);
    } else {
      pass("Cover size OK", formatSize(stat.size));
    }
  } else {
    fail("Cover PDF missing", "Run 'npm run pub:cover' first");
  }

  // ── 2. Metadata ────────────────────────────────────────────────────
  console.log("\n  Phase 2: Metadata\n");

  let metadata = null;
  if (fs.existsSync(METADATA_FILE)) {
    try {
      metadata = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
      pass("book-metadata.json loaded", metadata.title);
    } catch (e) {
      fail("book-metadata.json", `Parse error: ${e.message}`);
    }
  } else {
    fail("book-metadata.json missing", "Expected at publishing/book-metadata.json");
  }

  if (metadata) {
    // Required fields
    const requiredFields = ["title", "author", "description", "categories", "keywords"];
    for (const field of requiredFields) {
      if (metadata[field]) {
        pass(`Metadata: ${field}`, typeof metadata[field] === "string"
          ? metadata[field].substring(0, 60) + (metadata[field].length > 60 ? "..." : "")
          : JSON.stringify(metadata[field]).substring(0, 60));
      } else {
        fail(`Metadata: ${field}`, "Missing — required for KDP listing");
      }
    }

    // ISBN check
    if (metadata.isbn && (metadata.isbn.ebook || metadata.isbn.paperback)) {
      if (metadata.isbn.ebook) pass("ISBN (ebook)", metadata.isbn.ebook);
      if (metadata.isbn.paperback) pass("ISBN (paperback)", metadata.isbn.paperback);
    } else {
      warn("ISBN not set", "You can use KDP's free ISBN or purchase from Bowker (myidentifiers.com)");
    }

    // Keywords count (KDP allows up to 7)
    if (metadata.keywords && metadata.keywords.length > 0) {
      if (metadata.keywords.length > 7) {
        warn("Keywords", `${metadata.keywords.length} keywords — KDP allows max 7. First 7 will be used.`);
      } else {
        pass("Keywords count", `${metadata.keywords.length}/7`);
      }
    }

    // Categories (KDP allows 2)
    if (metadata.categories && metadata.categories.length > 0) {
      if (metadata.categories.length > 2) {
        warn("Categories", `${metadata.categories.length} listed — KDP allows max 2. First 2 will be used.`);
      } else {
        pass("Categories count", `${metadata.categories.length}/2`);
      }
    }
  }

  // ── 3. Edition / Provenance ────────────────────────────────────────
  console.log("\n  Phase 3: Provenance Chain\n");

  let edition = null;
  if (fs.existsSync(EDITION_FILE)) {
    try {
      edition = JSON.parse(fs.readFileSync(EDITION_FILE, "utf-8"));
      pass("edition.json loaded", edition.edition || "unknown");
    } catch (e) {
      fail("edition.json", `Parse error: ${e.message}`);
    }
  } else {
    warn("edition.json missing", "Run 'npm run build' to generate provenance data");
  }

  if (edition) {
    if (edition.sha256) pass("SHA-256 hash", edition.sha256.substring(0, 16) + "...");
    if (edition.ipfs_cid) pass("IPFS CID", edition.ipfs_cid);
    if (edition.edition_root) pass("Edition root", edition.edition_root.substring(0, 24) + "...");
    if (edition.anchors?.polygon?.contract) {
      pass("LiteraryAnchor", edition.anchors.polygon.contract);
    }
    if (edition.anchors?.polygon?.kernel_v2_contract) {
      pass("PublishingKernelV2", edition.anchors.polygon.kernel_v2_contract);
    }
  }

  // ── 4. File integrity ──────────────────────────────────────────────
  console.log("\n  Phase 4: File Integrity\n");

  if (fs.existsSync(EPUB_SRC)) {
    const hash = sha256File(EPUB_SRC);
    pass("EPUB SHA-256", hash.substring(0, 16) + "...");
  }
  if (fs.existsSync(PDF_SRC)) {
    const hash = sha256File(PDF_SRC);
    pass("PDF SHA-256", hash.substring(0, 16) + "...");
  }
  if (fs.existsSync(COVER_SRC)) {
    const hash = sha256File(COVER_SRC);
    pass("Cover SHA-256", hash.substring(0, 16) + "...");
  }

  // ── 5. KDP-specific checks ────────────────────────────────────────
  console.log("\n  Phase 5: KDP Requirements\n");

  if (metadata) {
    // Trim size
    if (metadata.trim?.width === "5.5in" && metadata.trim?.height === "8.5in") {
      pass("Trim size", "5.5\" x 8.5\" (digest) — KDP standard");
    } else {
      warn("Trim size", `${metadata.trim?.width} x ${metadata.trim?.height} — verify KDP supports this size`);
    }

    // Description length (KDP max: 4000 chars)
    if (metadata.description) {
      if (metadata.description.length > 4000) {
        fail("Description length", `${metadata.description.length} chars — KDP max is 4,000`);
      } else {
        pass("Description length", `${metadata.description.length}/4,000 chars`);
      }
    }
  }

  // EPUB format check (first 2 bytes should be PK for zip)
  if (fs.existsSync(EPUB_SRC)) {
    const header = Buffer.alloc(4);
    const fd = fs.openSync(EPUB_SRC, "r");
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    if (header[0] === 0x50 && header[1] === 0x4B) {
      pass("EPUB format", "Valid ZIP/EPUB container");
    } else {
      fail("EPUB format", "File does not appear to be a valid EPUB (ZIP) container");
    }
  }

  // PDF format check (first 5 bytes should be %PDF-)
  if (fs.existsSync(PDF_SRC)) {
    const header = Buffer.alloc(5);
    const fd = fs.openSync(PDF_SRC, "r");
    fs.readSync(fd, header, 0, 5, 0);
    fs.closeSync(fd);
    if (header.toString("ascii") === "%PDF-") {
      pass("PDF format", "Valid PDF header");
    } else {
      fail("PDF format", "File does not appear to be a valid PDF");
    }
  }

  return { metadata, edition };
}

// ══════════════════════════════════════════════════════════════════════
//  KDP METADATA SHEET
// ══════════════════════════════════════════════════════════════════════

function buildKdpMetadata(metadata, edition) {
  const kdpMeta = {
    _note: "Copy-paste reference for the KDP dashboard. Generated by build-kdp.js.",
    _generated: new Date().toISOString(),

    // ── Book Details ──────────────────────────────────────────
    bookDetails: {
      language: metadata?.language || "English",
      title: metadata?.title || "The 2,500 Donkeys",
      subtitle: metadata?.subtitle || "A Novel",
      seriesName: "",
      editionNumber: edition?.edition || "",
      author: metadata?.author || "Kidd James",
      contributors: [],
      description: metadata?.description || "",
    },

    // ── Categories & Keywords ─────────────────────────────────
    discovery: {
      categories: (metadata?.categories || KDP.categories).slice(0, 2),
      keywords: (metadata?.keywords || []).slice(0, 7),
    },

    // ── ISBN ──────────────────────────────────────────────────
    isbn: {
      ebook: metadata?.isbn?.ebook || "USE_KDP_FREE_ISBN",
      paperback: metadata?.isbn?.paperback || "USE_KDP_FREE_ISBN",
      note: "Set to 'USE_KDP_FREE_ISBN' for Amazon's free ISBN, or enter a Bowker ISBN",
    },

    // ── Pricing ──────────────────────────────────────────────
    pricing: {
      ebook: KDP.pricing.suggestedEbook,
      paperback: KDP.pricing.suggestedPaperback,
      currency: KDP.pricing.currency,
      kindleUnlimited: false,
      note: "KU enrollment requires 90-day exclusivity. Set to false for wide distribution.",
    },

    // ── Print Specifications ─────────────────────────────────
    printSpec: {
      trimWidth: metadata?.trim?.width || KDP.trim.width,
      trimHeight: metadata?.trim?.height || KDP.trim.height,
      bleed: "No bleed (interior)",
      paperColor: "Cream",
      inkColor: "Black & white",
      coverFinish: "Matte",
      drm: false,
      drmNote: "Disabled — literary protocol = open access philosophy",
    },

    // ── Rights & Distribution ────────────────────────────────
    rights: {
      copyrightHolder: metadata?.rights || "© 2026 Kidd James. All rights reserved.",
      publishingRights: "I own the copyright and hold the necessary publishing rights",
      territories: "All territories (worldwide)",
      adultContent: false,
    },

    // ── Provenance (for colophon reference) ──────────────────
    provenance: {
      sha256: edition?.sha256 || "",
      ipfsCID: edition?.ipfs_cid || "",
      editionRoot: edition?.edition_root || "",
      literaryAnchor: edition?.anchors?.polygon?.contract || "",
      publishingKernelV2: edition?.anchors?.polygon?.kernel_v2_contract || "",
      royaltyRouter: edition?.anchors?.polygon?.royalty_router || "",
      authorIdentity: edition?.anchors?.polygon?.author_identity || "",
      polygonChainId: 137,
      authorWallet: edition?.anchors?.polygon?.deployer || "",
    },

    // ── Files to Upload ──────────────────────────────────────
    files: {
      ebookUpload: "the-2500-donkeys.epub",
      paperbackInterior: "the-2500-donkeys-print.pdf",
      paperbackCover: "cover.pdf",
      coverImageForEbook: "Extract front cover from cover.pdf or provide a 2550x3300 JPG",
    },

    // ── Distribution Channels ────────────────────────────────
    distribution: {
      primary: {
        name: "Amazon KDP",
        url: "https://kdp.amazon.com",
        formats: ["EPUB (ebook)", "PDF (paperback)"],
        note: "Create separate listings for ebook and paperback",
      },
      secondary: [
        {
          name: "IngramSpark",
          url: "https://www.ingramspark.com",
          requires: "Bowker ISBN",
          formats: ["EPUB", "PDF"],
          reach: "Bookstores, libraries, international",
        },
        {
          name: "Apple Books",
          url: "https://authors.apple.com",
          requires: "Bowker ISBN or Apple-assigned",
          formats: ["EPUB"],
          reach: "Apple ecosystem worldwide",
        },
        {
          name: "Barnes & Noble Press",
          url: "https://press.barnesandnoble.com",
          requires: "Free or Bowker ISBN",
          formats: ["EPUB"],
          reach: "B&N / Nook ecosystem",
        },
        {
          name: "Kobo Writing Life",
          url: "https://www.kobo.com/writinglife",
          requires: "Free",
          formats: ["EPUB"],
          reach: "International (strong in Canada, EU)",
        },
        {
          name: "Google Play Books",
          url: "https://play.google.com/books/publish",
          requires: "Bowker ISBN recommended",
          formats: ["EPUB", "PDF"],
          reach: "Google ecosystem worldwide",
        },
        {
          name: "Draft2Digital",
          url: "https://www.draft2digital.com",
          requires: "Free ISBN available",
          formats: ["EPUB"],
          reach: "Aggregator — distributes to multiple platforms",
          note: "Alternative to managing each platform individually",
        },
      ],
      web3: [
        {
          name: "IPFS (already pinned)",
          cid: edition?.ipfs_cid || "",
          gateway: `https://ipfs.io/ipfs/${edition?.ipfs_cid || ""}`,
        },
        {
          name: "xxxiii.io",
          url: "https://xxxiii.io",
          note: "Cloudflare Pages — full book reader, verification, gallery",
        },
        {
          name: "EditionNFT",
          contract: "Not yet deployed",
          note: "Tiered NFT (Genesis 1/1, Founder 33, Public 2500) — deploy with deploy-edition-nft.js",
        },
      ],
    },
  };

  return kdpMeta;
}

// ══════════════════════════════════════════════════════════════════════
//  CHECKLIST REPORT
// ══════════════════════════════════════════════════════════════════════

function buildChecklist() {
  const lines = [];
  const now = new Date().toISOString();

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("  KDP PRE-SUBMISSION CHECKLIST");
  lines.push("  The 2,500 Donkeys — by Kidd James");
  lines.push(`  Generated: ${now}`);
  lines.push("═══════════════════════════════════════════════════════════════\n");

  for (const check of checks) {
    const icon = check.status === "PASS" ? "✓" : check.status === "FAIL" ? "✗" : "⚠";
    const pad = check.status === "PASS" ? " " : check.status === "FAIL" ? " " : "";
    lines.push(`  ${icon}${pad} ${check.label}`);
    if (check.detail) {
      lines.push(`     ${check.detail}`);
    }
  }

  lines.push("");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`  RESULT: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);

  if (failCount === 0) {
    lines.push("  STATUS: ✓ READY FOR KDP UPLOAD");
  } else {
    lines.push("  STATUS: ✗ FIX FAILURES BEFORE UPLOADING");
  }
  lines.push("───────────────────────────────────────────────────────────────\n");

  // ── Manual verification steps ─────────────────────────────────────
  lines.push("  MANUAL CHECKS (verify in KDP Print Previewer):\n");
  lines.push("  [ ] Interior margins are correct (gutter: 0.875\", outside: 0.625\")");
  lines.push("  [ ] Chapter openers start on recto (right-hand) pages");
  lines.push("  [ ] Drop caps render correctly");
  lines.push("  [ ] Running headers present (\"The 2,500 Donkeys\" / \"Kidd James\")");
  lines.push("  [ ] Page numbers visible at bottom center");
  lines.push("  [ ] Cover spine text aligns with page count");
  lines.push("  [ ] Cover barcode area is clear (back cover, bottom right)");
  lines.push("  [ ] \"Look Inside\" preview checked after publishing");
  lines.push("  [ ] Colophon references correct IPFS CID and contract addresses");
  lines.push("  [ ] Copyright page matches metadata year and rights statement\n");

  // ── Amazon KDP dashboard steps ─────────────────────────────────────
  lines.push("  KDP UPLOAD STEPS:\n");
  lines.push("  1. Go to https://kdp.amazon.com");
  lines.push("  2. Click '+ Create' → 'Kindle eBook' for ebook listing");
  lines.push("  3. Fill in details from kdp-metadata.json");
  lines.push("  4. Upload the-2500-donkeys.epub as manuscript");
  lines.push("  5. Upload cover image (extract front from cover.pdf → 2550×3300 JPG)");
  lines.push("  6. Set price and territories");
  lines.push("  7. Click 'Publish Your Kindle eBook'");
  lines.push("  8. Repeat steps 2-7 with '+ Create' → 'Paperback'");
  lines.push("     Upload the-2500-donkeys-print.pdf (interior) + cover.pdf (cover)\n");

  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════════
//  PACKAGE
// ══════════════════════════════════════════════════════════════════════

function packageFiles() {
  // Create KDP directory
  if (!fs.existsSync(KDP_DIR)) {
    fs.mkdirSync(KDP_DIR, { recursive: true });
  }

  const copied = [];

  // Copy EPUB
  if (fs.existsSync(EPUB_SRC)) {
    fs.copyFileSync(EPUB_SRC, path.join(KDP_DIR, "the-2500-donkeys.epub"));
    copied.push("the-2500-donkeys.epub");
  }

  // Copy interior PDF
  if (fs.existsSync(PDF_SRC)) {
    fs.copyFileSync(PDF_SRC, path.join(KDP_DIR, "the-2500-donkeys-print.pdf"));
    copied.push("the-2500-donkeys-print.pdf");
  }

  // Copy cover
  if (fs.existsSync(COVER_SRC)) {
    fs.copyFileSync(COVER_SRC, path.join(KDP_DIR, "cover.pdf"));
    copied.push("cover.pdf");
  }

  return copied;
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════

function main() {
  const checkOnly = process.argv.includes("--check-only");

  // Run validation
  const { metadata, edition } = validate();

  // Print checklist summary
  console.log("\n" + "─".repeat(60));
  console.log(`  ${passCount} passed  |  ${failCount} failed  |  ${warnCount} warnings`);

  if (failCount > 0) {
    console.log("  STATUS: ✗ Fix failures before packaging\n");
  } else {
    console.log("  STATUS: ✓ Ready for KDP\n");
  }

  if (checkOnly) {
    console.log("  --check-only: Skipping file copy.\n");
    process.exit(failCount > 0 ? 1 : 0);
  }

  // Build KDP metadata sheet
  const kdpMeta = buildKdpMetadata(metadata, edition);
  const kdpMetaPath = path.join(KDP_DIR, "kdp-metadata.json");

  if (!fs.existsSync(KDP_DIR)) {
    fs.mkdirSync(KDP_DIR, { recursive: true });
  }

  fs.writeFileSync(kdpMetaPath, JSON.stringify(kdpMeta, null, 2), "utf-8");
  console.log("  ✓ Generated kdp-metadata.json");

  // Build checklist
  const checklist = buildChecklist();
  const checklistPath = path.join(KDP_DIR, "checklist.txt");
  fs.writeFileSync(checklistPath, checklist, "utf-8");
  console.log("  ✓ Generated checklist.txt");

  // Copy files
  const copied = packageFiles();
  for (const f of copied) {
    console.log(`  ✓ Copied ${f}`);
  }

  console.log(`\n  KDP package ready at: dist/kdp/`);
  console.log(`  ${copied.length + 2} files total (${copied.length} uploads + metadata + checklist)\n`);

  // Print distribution summary
  console.log("  ── Distribution Channels ────────────────────────────────");
  console.log("  PRIMARY:");
  console.log("    Amazon KDP      → https://kdp.amazon.com");
  console.log("  SECONDARY (requires Bowker ISBN):");
  console.log("    IngramSpark     → https://www.ingramspark.com");
  console.log("    Apple Books     → https://authors.apple.com");
  console.log("    B&N Press       → https://press.barnesandnoble.com");
  console.log("    Kobo            → https://www.kobo.com/writinglife");
  console.log("    Google Play     → https://play.google.com/books/publish");
  console.log("    Draft2Digital   → https://www.draft2digital.com");
  console.log("  WEB3:");
  console.log("    IPFS            → Already pinned");
  console.log("    xxxiii.io       → Live");
  console.log("    EditionNFT      → Ready to deploy\n");

  process.exit(failCount > 0 ? 1 : 0);
}

main();
