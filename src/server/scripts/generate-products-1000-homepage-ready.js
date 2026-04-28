const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const inputWorkbookPath = path.join(
  repoRoot,
  "assets",
  "test-data",
  "products_50_local_images_fixed.xlsx"
);
const outputDir = path.join(repoRoot, "assets", "test-data");
const batchCode =
  process.env.PRODUCT_IMPORT_BATCH ||
  new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(2, 12);
const outputWorkbookPath = path.join(
  outputDir,
  "products_1000_homepage_ready.xlsx"
);
const imageFolderName = `homepage-batch-${batchCode}`;
const productImagesDir = path.join(
  repoRoot,
  "src",
  "client",
  "public",
  "assets",
  "seed-images",
  "products",
  imageFolderName
);
const targetRowCount = 1000;

const categoryPalettes = {
  clothing: {
    background: "#eff6ff",
    panel: "#dbeafe",
    accent: "#2563eb",
    text: "#0f172a",
  },
  footwear: {
    background: "#111827",
    panel: "#1f2937",
    accent: "#f59e0b",
    text: "#f9fafb",
  },
  electronics: {
    background: "#020617",
    panel: "#0f172a",
    accent: "#38bdf8",
    text: "#e2e8f0",
  },
  furniture: {
    background: "#fafaf9",
    panel: "#e7e5e4",
    accent: "#a16207",
    text: "#292524",
  },
  accessories: {
    background: "#052e16",
    panel: "#14532d",
    accent: "#22c55e",
    text: "#dcfce7",
  },
  "beauty-personal-care": {
    background: "#fff1f2",
    panel: "#ffe4e6",
    accent: "#e11d48",
    text: "#4c0519",
  },
  sport: {
    background: "#172554",
    panel: "#1d4ed8",
    accent: "#f97316",
    text: "#eff6ff",
  },
  default: {
    background: "#f8fafc",
    panel: "#e2e8f0",
    accent: "#6366f1",
    text: "#0f172a",
  },
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getPalette(categorySlug) {
  return categoryPalettes[categorySlug] || categoryPalettes.default;
}

function createProductSvg({
  title,
  subtitle,
  tag,
  palette,
  fileSlug,
  angle,
}) {
  const circleX = angle === "Front" ? 118 : 530;
  const circleY = angle === "Front" ? 158 : 126;
  const shadowOpacity = angle === "Front" ? "0.18" : "0.24";

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">',
    "  <defs>",
    `    <linearGradient id="bg-${fileSlug}" x1="0" y1="0" x2="1" y2="1">`,
    `      <stop offset="0%" stop-color="${palette.background}" />`,
    `      <stop offset="100%" stop-color="${palette.panel}" />`,
    "    </linearGradient>",
    `    <filter id="shadow-${fileSlug}" x="-20%" y="-20%" width="140%" height="140%">`,
    `      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#000000" flood-opacity="${shadowOpacity}" />`,
    "    </filter>",
    "  </defs>",
    `  <rect width="800" height="800" rx="42" fill="url(#bg-${fileSlug})" />`,
    `  <circle cx="${circleX}" cy="${circleY}" r="150" fill="${palette.accent}" opacity="0.18" />`,
    `  <circle cx="692" cy="668" r="116" fill="${palette.accent}" opacity="0.1" />`,
    `  <rect x="90" y="118" width="620" height="420" rx="34" fill="${palette.panel}" filter="url(#shadow-${fileSlug})" />`,
    `  <rect x="126" y="166" width="548" height="248" rx="28" fill="${palette.accent}" opacity="0.18" />`,
    `  <rect x="126" y="458" width="236" height="12" rx="6" fill="${palette.text}" opacity="0.75" />`,
    `  <rect x="126" y="490" width="176" height="12" rx="6" fill="${palette.text}" opacity="0.45" />`,
    `  <rect x="90" y="590" width="190" height="56" rx="28" fill="${palette.accent}" />`,
    `  <text x="185" y="626" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${palette.background}">${escapeXml(
      tag
    )}</text>`,
    `  <text x="90" y="705" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="${palette.text}">${escapeXml(
      title
    )}</text>`,
    `  <text x="90" y="746" font-family="Arial, sans-serif" font-size="22" fill="${palette.text}" opacity="0.82">${escapeXml(
      subtitle
    )}</text>`,
    "</svg>",
  ].join("\n");
}

function writeSvgFile(filePath, svgContent) {
  fs.writeFileSync(filePath, svgContent, "utf8");
}

function cloneSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

function rotateBoolean(index, interval) {
  return index % interval === 0;
}

function main() {
  if (!fs.existsSync(inputWorkbookPath)) {
    throw new Error(`Source workbook not found: ${inputWorkbookPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(productImagesDir, { recursive: true });

  const workbook = XLSX.readFile(inputWorkbookPath, { cellDates: false });
  const sourceSheetName = workbook.SheetNames[0];
  const sourceSheet = workbook.Sheets[sourceSheetName];
  const templateRows = XLSX.utils.sheet_to_json(sourceSheet, { defval: "" });

  if (templateRows.length === 0) {
    throw new Error("Template workbook is empty.");
  }

  const headers = Object.keys(templateRows[0]);
  const generatedRows = [];
  const imagePathPrefix = `/assets/seed-images/products/${imageFolderName}`;

  for (let index = 0; index < targetRowCount; index += 1) {
    const templateRow = templateRows[index % templateRows.length];
    const sequence = String(index + 1).padStart(4, "0");
    const categorySlug = String(templateRow.categorySlug || "")
      .trim()
      .toLowerCase();
    const categoryName =
      String(templateRow.categoryName || "").trim() || "Product";
    const baseName = String(templateRow.name || "").replace(
      /\s+Batch\s+\d+$/i,
      ""
    );
    const baseSku = String(templateRow.sku || "").replace(/-\d+$/i, "");
    const uniqueName = `${baseName} Home ${sequence} Batch ${batchCode}`;
    const uniqueSku = `${baseSku}-HOME-${batchCode}-${sequence}`;
    const baseSlug = slugify(`${uniqueName}-${uniqueSku}`);
    const palette = getPalette(categorySlug);
    const frontImageName = `${baseSlug}-front.svg`;
    const angleImageName = `${baseSlug}-angle.svg`;
    const frontImagePath = path.join(productImagesDir, frontImageName);
    const angleImagePath = path.join(productImagesDir, angleImageName);
    const reverseIndex = targetRowCount - index;

    writeSvgFile(
      frontImagePath,
      createProductSvg({
        title: uniqueName,
        subtitle: categoryName,
        tag: "Home Feature",
        palette,
        fileSlug: `${baseSlug}-front`,
        angle: "Front",
      })
    );

    writeSvgFile(
      angleImagePath,
      createProductSvg({
        title: uniqueName,
        subtitle: uniqueSku,
        tag: "Catalog View",
        palette,
        fileSlug: `${baseSlug}-angle`,
        angle: "Angle",
      })
    );

    generatedRows.push({
      ...templateRow,
      name: uniqueName,
      sku: uniqueSku,
      images: `${imagePathPrefix}/${frontImageName}|${imagePathPrefix}/${angleImageName}`,
      isNew: true,
      isFeatured: reverseIndex <= 180 || rotateBoolean(index, 2),
      isTrending: reverseIndex <= 220 || rotateBoolean(index, 3),
      isBestSeller: reverseIndex <= 140 || rotateBoolean(index, 4),
    });
  }

  const outputWorkbook = XLSX.utils.book_new();
  const outputSheet = XLSX.utils.json_to_sheet(generatedRows, {
    header: headers,
  });
  outputSheet["!cols"] = headers.map((header) => {
    if (header === "description") return { wch: 56 };
    if (header === "images") return { wch: 92 };
    if (header === "name") return { wch: 42 };
    if (header === "sku") return { wch: 36 };
    return { wch: 16 };
  });

  XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, sourceSheetName);

  workbook.SheetNames.slice(1).forEach((sheetName) => {
    XLSX.utils.book_append_sheet(
      outputWorkbook,
      cloneSheet(workbook.Sheets[sheetName]),
      sheetName
    );
  });

  XLSX.writeFile(outputWorkbook, outputWorkbookPath);

  console.log(`Template workbook: ${inputWorkbookPath}`);
  console.log(`Output workbook: ${outputWorkbookPath}`);
  console.log(`Generated images in: ${productImagesDir}`);
  console.log(`Rows generated: ${generatedRows.length}`);
  console.log(`Batch code: ${batchCode}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
