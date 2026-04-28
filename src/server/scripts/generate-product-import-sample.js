const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const productImagesDir = path.join(
  repoRoot,
  "src",
  "client",
  "public",
  "assets",
  "seed-images",
  "products"
);
const outputDir = path.join(repoRoot, "assets", "test-data");
const workbookPath = path.join(outputDir, "product-import-sample.xlsx");
const batchCode =
  process.env.PRODUCT_IMPORT_BATCH ||
  new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(2, 12);

const coreHeaders = [
  "name",
  "description",
  "categorySlug",
  "categoryName",
  "sku",
  "price",
  "stock",
  "lowStockThreshold",
  "barcode",
  "warehouseLocation",
  "images",
  "isNew",
  "isTrending",
  "isBestSeller",
  "isFeatured",
];

const preferredAttributeOrder = [
  "size",
  "color",
  "material",
  "storage",
  "brand",
  "gender",
];

const preferredAttributeValues = {
  size: ["M", "L", "XL", "S", "XS", "XXL"],
  color: ["Black", "White", "Blue", "Green", "Red", "Yellow"],
  material: ["Cotton", "Leather", "Polyester", "Wood", "Metal"],
  storage: ["256GB", "1TB", "512GB", "128GB"],
  brand: ["Samsung", "Nike", "IKEA", "Apple", "Adidas", "Dove", "Nivea"],
  gender: ["MIX", "MALE", "FEMALE"],
};

const baseProducts = [
  {
    name: "Atlas Tablet 256",
    description:
      "11-inch tablet for demos and import testing with a bright display.",
    categorySlug: "electronics",
    sku: "ATL-TAB-256",
    price: 799.99,
    stock: 18,
    lowStockThreshold: 5,
    barcode: "100000000001",
    warehouseLocation: "A-01-02",
    isNew: true,
    isTrending: true,
    isBestSeller: false,
    isFeatured: true,
    storage: "256GB",
    color: "Black",
    brand: "Samsung",
    palette: {
      background: "#0f172a",
      accent: "#38bdf8",
      panel: "#1e293b",
      text: "#e2e8f0",
    },
  },
  {
    name: "Harbor Cotton Tee",
    description: "Soft everyday t-shirt for testing clothing imports.",
    categorySlug: "clothing",
    sku: "HRB-TEE-WHT-M",
    price: 24.5,
    stock: 42,
    lowStockThreshold: 8,
    barcode: "100000000002",
    warehouseLocation: "B-03-01",
    isNew: true,
    isTrending: true,
    isBestSeller: true,
    isFeatured: true,
    size: "M",
    color: "White",
    gender: "MIX",
    palette: {
      background: "#f8fafc",
      accent: "#2563eb",
      panel: "#dbeafe",
      text: "#0f172a",
    },
  },
  {
    name: "Nova Runner Sneakers",
    description: "Comfort sneakers sample product for footwear imports.",
    categorySlug: "footwear",
    sku: "NVA-RUN-BLK-L",
    price: 109.99,
    stock: 26,
    lowStockThreshold: 6,
    barcode: "100000000003",
    warehouseLocation: "C-02-05",
    isNew: false,
    isTrending: true,
    isBestSeller: true,
    isFeatured: false,
    size: "L",
    color: "Black",
    material: "Leather",
    brand: "Nike",
    palette: {
      background: "#111827",
      accent: "#f59e0b",
      panel: "#1f2937",
      text: "#f9fafb",
    },
  },
  {
    name: "Oakline Writing Desk",
    description: "Wood desk sample with furniture-specific attributes.",
    categorySlug: "furniture",
    sku: "OKL-DSK-WHT",
    price: 349.0,
    stock: 9,
    lowStockThreshold: 2,
    barcode: "100000000004",
    warehouseLocation: "D-01-01",
    isNew: false,
    isTrending: false,
    isBestSeller: false,
    isFeatured: true,
    material: "Wood",
    color: "White",
    brand: "IKEA",
    palette: {
      background: "#f5f5f4",
      accent: "#92400e",
      panel: "#e7e5e4",
      text: "#292524",
    },
  },
  {
    name: "Metro Travel Backpack",
    description: "Accessory sample product with no required attributes.",
    categorySlug: "accessories",
    sku: "MTR-BAG-GRN",
    price: 68.75,
    stock: 31,
    lowStockThreshold: 7,
    barcode: "100000000005",
    warehouseLocation: "E-04-03",
    isNew: true,
    isTrending: true,
    isBestSeller: false,
    isFeatured: false,
    color: "Green",
    palette: {
      background: "#052e16",
      accent: "#22c55e",
      panel: "#14532d",
      text: "#dcfce7",
    },
  },
  {
    name: "Aurora Zip Hoodie",
    description: "Layered hoodie sample for bulk clothing uploads.",
    categorySlug: "clothing",
    sku: "ARR-HOD-BLU-XL",
    price: 59.9,
    stock: 22,
    lowStockThreshold: 5,
    barcode: "100000000006",
    warehouseLocation: "B-02-04",
    isNew: true,
    isTrending: false,
    isBestSeller: true,
    isFeatured: false,
    size: "XL",
    color: "Blue",
    gender: "MIX",
    palette: {
      background: "#172554",
      accent: "#60a5fa",
      panel: "#1d4ed8",
      text: "#eff6ff",
    },
  },
  {
    name: "Pulse Gaming Laptop 1TB",
    description: "High-performance laptop sample for electronics testing.",
    categorySlug: "electronics",
    sku: "PLS-LTP-1TB",
    price: 1899.99,
    stock: 7,
    lowStockThreshold: 2,
    barcode: "100000000007",
    warehouseLocation: "A-02-01",
    isNew: false,
    isTrending: true,
    isBestSeller: true,
    isFeatured: true,
    storage: "1TB",
    color: "Black",
    brand: "Samsung",
    palette: {
      background: "#020617",
      accent: "#a855f7",
      panel: "#111827",
      text: "#f5f3ff",
    },
  },
  {
    name: "Luma Accent Chair",
    description: "Furniture sample with leather material and bold styling.",
    categorySlug: "furniture",
    sku: "LMA-CHR-GRN",
    price: 289.49,
    stock: 11,
    lowStockThreshold: 3,
    barcode: "100000000008",
    warehouseLocation: "D-03-02",
    isNew: true,
    isTrending: false,
    isBestSeller: false,
    isFeatured: true,
    material: "Leather",
    color: "Green",
    brand: "IKEA",
    palette: {
      background: "#052e16",
      accent: "#facc15",
      panel: "#166534",
      text: "#fefce8",
    },
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function createProductSvg({ title, subtitle, label, palette, fileSlug, angle }) {
  const accentX = angle === "Front" ? 120 : 500;
  const accentY = angle === "Front" ? 170 : 110;
  const shadowOpacity = angle === "Front" ? "0.18" : "0.28";

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">',
    "<defs>",
    `  <linearGradient id="bg-${fileSlug}" x1="0" y1="0" x2="1" y2="1">`,
    `    <stop offset="0%" stop-color="${palette.background}" />`,
    `    <stop offset="100%" stop-color="${palette.panel}" />`,
    "  </linearGradient>",
    `  <filter id="shadow-${fileSlug}" x="-20%" y="-20%" width="140%" height="140%">`,
    `    <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="${shadowOpacity}" />`,
    "  </filter>",
    "</defs>",
    `  <rect width="800" height="800" rx="48" fill="url(#bg-${fileSlug})" />`,
    `  <circle cx="${accentX}" cy="${accentY}" r="150" fill="${palette.accent}" opacity="0.18" />`,
    `  <circle cx="700" cy="670" r="120" fill="${palette.accent}" opacity="0.12" />`,
    `  <rect x="90" y="120" width="620" height="420" rx="36" fill="${palette.panel}" filter="url(#shadow-${fileSlug})" />`,
    `  <rect x="130" y="170" width="540" height="250" rx="28" fill="${palette.accent}" opacity="0.18" />`,
    `  <rect x="130" y="460" width="220" height="12" rx="6" fill="${palette.text}" opacity="0.75" />`,
    `  <rect x="130" y="492" width="160" height="12" rx="6" fill="${palette.text}" opacity="0.45" />`,
    `  <rect x="90" y="590" width="180" height="54" rx="27" fill="${palette.accent}" />`,
    `  <text x="180" y="625" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${palette.background}">${escapeXml(
      label
    )}</text>`,
    `  <text x="90" y="705" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="${palette.text}">${escapeXml(
      title
    )}</text>`,
    `  <text x="90" y="748" font-family="Arial, sans-serif" font-size="24" fill="${palette.text}" opacity="0.82">${escapeXml(
      subtitle
    )}</text>`,
    "</svg>",
  ].join("\n");
}

function writeSvgFile(filePath, svgContent) {
  fs.writeFileSync(filePath, svgContent, "utf8");
}

function getOrderedAttributeHeaders(attributeHeaders) {
  return [
    ...preferredAttributeOrder.filter((header) => attributeHeaders.has(header)),
    ...Array.from(attributeHeaders)
      .filter((header) => !preferredAttributeOrder.includes(header))
      .sort((left, right) => left.localeCompare(right)),
  ];
}

function pickAttributeValue({ providedValue, allowedValues, attributeSlug }) {
  const normalizedAllowed = new Map(
    allowedValues.map((value) => [normalizeValue(value), value])
  );

  if (providedValue) {
    const exactMatch = normalizedAllowed.get(normalizeValue(providedValue));
    if (exactMatch) {
      return exactMatch;
    }
  }

  const preferredValues = preferredAttributeValues[attributeSlug] || [];
  for (const candidate of preferredValues) {
    const matchedValue = normalizedAllowed.get(normalizeValue(candidate));
    if (matchedValue) {
      return matchedValue;
    }
  }

  return allowedValues[0] || "";
}

async function loadCategoryMap(prisma) {
  const categories = await prisma.category.findMany({
    include: {
      attributes: {
        include: {
          attribute: {
            include: {
              values: true,
            },
          },
        },
      },
    },
  });

  return new Map(
    categories.map((category) => [category.slug.toLowerCase(), category])
  );
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const categoryBySlug = await loadCategoryMap(prisma);
    const attributeHeaders = new Set();

    for (const product of baseProducts) {
      const category = categoryBySlug.get(product.categorySlug.toLowerCase());

      if (!category) {
        throw new Error(
          `Category "${product.categorySlug}" was not found in the database`
        );
      }

      for (const categoryAttribute of category.attributes) {
        attributeHeaders.add(categoryAttribute.attribute.slug);
      }
    }

    const orderedAttributeHeaders = getOrderedAttributeHeaders(attributeHeaders);

    fs.mkdirSync(productImagesDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    const rows = baseProducts.map((product) => {
      const category = categoryBySlug.get(product.categorySlug.toLowerCase());
      const uniqueName = `${product.name} Batch ${batchCode}`;
      const uniqueSku = `${product.sku}-${batchCode}`;
      const baseSlug = slugify(uniqueName);
      const imageOneName = `${baseSlug}-front.svg`;
      const imageTwoName = `${baseSlug}-angle.svg`;
      const imageOnePath = path.join(productImagesDir, imageOneName);
      const imageTwoPath = path.join(productImagesDir, imageTwoName);
      const attributeValues = {};

      for (const categoryAttribute of category.attributes) {
        const attributeSlug = categoryAttribute.attribute.slug;
        const allowedValues = categoryAttribute.attribute.values.map(
          (value) => value.value
        );
        const chosenValue = pickAttributeValue({
          providedValue: product[attributeSlug],
          allowedValues,
          attributeSlug,
        });

        if (categoryAttribute.isRequired && !chosenValue) {
          throw new Error(
            `Category "${category.name}" requires attribute "${attributeSlug}" but it has no allowed values`
          );
        }

        if (chosenValue) {
          attributeValues[attributeSlug] = chosenValue;
        }
      }

      writeSvgFile(
        imageOnePath,
        createProductSvg({
          title: uniqueName,
          subtitle: category.name,
          label: "Front View",
          palette: product.palette,
          fileSlug: `${baseSlug}-front`,
          angle: "Front",
        })
      );

      writeSvgFile(
        imageTwoPath,
        createProductSvg({
          title: uniqueName,
          subtitle: uniqueSku,
          label: "Angle View",
          palette: product.palette,
          fileSlug: `${baseSlug}-angle`,
          angle: "Angle",
        })
      );

      const row = {
        name: uniqueName,
        description: product.description,
        categorySlug: category.slug,
        categoryName: category.name,
        sku: uniqueSku,
        price: product.price,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        barcode: product.barcode,
        warehouseLocation: product.warehouseLocation,
        images: `/assets/seed-images/products/${imageOneName}|/assets/seed-images/products/${imageTwoName}`,
        isNew: product.isNew,
        isTrending: product.isTrending,
        isBestSeller: product.isBestSeller,
        isFeatured: product.isFeatured,
      };

      for (const attributeHeader of orderedAttributeHeaders) {
        row[attributeHeader] = attributeValues[attributeHeader] || "";
      }

      return row;
    });

    const worksheetHeaders = [...coreHeaders, ...orderedAttributeHeaders];
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: worksheetHeaders,
    });
    worksheet["!cols"] = worksheetHeaders.map((header) => {
      if (header === "description") return { wch: 56 };
      if (header === "images") return { wch: 88 };
      if (header === "name") return { wch: 34 };
      if (header === "sku") return { wch: 24 };
      return { wch: 16 };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, workbookPath);

    console.log(`Created workbook: ${workbookPath}`);
    console.log(`Created product images in: ${productImagesDir}`);
    console.log(`Rows generated: ${rows.length}`);
    console.log(`Batch code: ${batchCode}`);
    console.log(`Attribute columns: ${orderedAttributeHeaders.join(", ")}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
