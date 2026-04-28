import AppError from "@/shared/errors/AppError";
import ApiFeatures from "@/shared/utils/ApiFeatures";
import { ProductRepository } from "./product.repository";
import slugify from "@/shared/utils/slugify";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import prisma from "@/infra/database/database.config";
import { AttributeRepository } from "../attribute/attribute.repository";
import { VariantRepository } from "../variant/variant.repository";

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private attributeRepository: AttributeRepository,
    private variantRepository: VariantRepository
  ) {}

  async getAllProducts(queryString: Record<string, any>) {
    const apiFeatures = new ApiFeatures(queryString)
      .filter()
      .sort()
      .limitFields()
      .paginate()
      .build();

    const { where, orderBy, skip, take, select } = apiFeatures;

    const finalWhere = where && Object.keys(where).length > 0 ? where : {};

    const totalResults = await this.productRepository.countProducts({
      where: finalWhere,
    });

    const totalPages = Math.ceil(totalResults / take);
    const currentPage = Math.floor(skip / take) + 1;

    const products = await this.productRepository.findManyProducts({
      where: finalWhere,
      orderBy: orderBy || { createdAt: "desc" },
      skip,
      take,
      select,
    });

    return {
      products,
      totalResults,
      totalPages,
      currentPage,
      resultsPerPage: take,
    };
  }

  async getProductById(productId: string) {
    const product = await this.productRepository.findProductById(productId);
    if (!product) {
      throw new AppError(404, "Product not found");
    }
    return product;
  }

  async getProductBySlug(productSlug: string) {
    const product = await this.productRepository.findProductBySlug(productSlug);
    if (!product) {
      throw new AppError(404, "Product not found");
    }
    return product;
  }

  async createProduct(data: {
    name: string;
    description?: string;
    isNew?: boolean;
    isTrending?: boolean;
    isBestSeller?: boolean;
    isFeatured?: boolean;
    categoryId?: string;
    variants?: {
      sku: string;
      price: number;
      images: string[];
      stock: number;
      lowStockThreshold?: number;
      barcode?: string;
      warehouseLocation?: string;
      attributes: { attributeId: string; valueId: string }[];
    }[];
  }) {
    const { variants, ...productData } = data;

    if (!variants || variants.length === 0) {
      throw new AppError(400, "At least one variant is required");
    }

    // Validate SKU format (alphanumeric with dashes, 3-50 characters)
    const skuRegex = /^[a-zA-Z0-9-]+$/;
    variants.forEach((variant, index) => {
      if (
        !variant.sku ||
        !skuRegex.test(variant.sku) ||
        variant.sku.length < 3 ||
        variant.sku.length > 50
      ) {
        throw new AppError(
          400,
          `Variant at index ${index} has invalid SKU. Use alphanumeric characters and dashes, 3-50 characters.`
        );
      }
      if (variant.price <= 0) {
        throw new AppError(
          400,
          `Variant at index ${index} must have a positive price`
        );
      }
      if (variant.stock < 0) {
        throw new AppError(
          400,
          `Variant at index ${index} must have non-negative stock`
        );
      }
      if (variant.lowStockThreshold && variant.lowStockThreshold < 0) {
        throw new AppError(
          400,
          `Variant at index ${index} must have non-negative lowStockThreshold`
        );
      }
    });

    // Validate category and required attributes
    let requiredAttributeIds: string[] = [];
    if (productData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId },
        include: {
          attributes: {
            where: { isRequired: true },
            select: { attributeId: true },
          },
        },
      });
      if (!category) {
        throw new AppError(404, "Category not found");
      }
      requiredAttributeIds = category.attributes.map(
        (attr) => attr.attributeId
      );
    }

    // Validate attributes and values in one query
    const allAttributeIds = [
      ...new Set(
        variants.flatMap((v) => v.attributes.map((a) => a.attributeId))
      ),
    ];
    const allValueIds = [
      ...new Set(variants.flatMap((v) => v.attributes.map((a) => a.valueId))),
    ];
    const [existingAttributes, existingValues] = await Promise.all([
      prisma.attribute.findMany({
        where: { id: { in: allAttributeIds } },
        select: { id: true },
      }),
      prisma.attributeValue.findMany({
        where: { id: { in: allValueIds } },
        select: { id: true, attributeId: true },
      }),
    ]);

    if (existingAttributes.length !== allAttributeIds.length) {
      throw new AppError(400, "One or more attribute IDs are invalid");
    }
    if (existingValues.length !== allValueIds.length) {
      throw new AppError(400, "One or more attribute value IDs are invalid");
    }

    // Validate attribute-value pairs
    variants.forEach((variant, index) => {
      variant.attributes.forEach((attr, attrIndex) => {
        const value = existingValues.find((v) => v.id === attr.valueId);
        if (!value || value.attributeId !== attr.attributeId) {
          throw new AppError(
            400,
            `Attribute value at variant index ${index}, attribute index ${attrIndex} does not belong to the specified attribute`
          );
        }
      });
    });

    // Validate unique SKUs
    const existingSkus = await prisma.productVariant.findMany({
      where: { sku: { in: variants.map((v) => v.sku) } },
      select: { sku: true },
    });
    if (existingSkus.length > 0) {
      throw new AppError(
        400,
        `Duplicate SKUs detected: ${existingSkus.map((s) => s.sku).join(", ")}`
      );
    }

    // Validate unique attribute combinations
    const comboKeys = variants.map((variant) =>
      variant.attributes
        .map((attr) => `${attr.attributeId}:${attr.valueId}`)
        .sort()
        .join("|")
    );
    if (new Set(comboKeys).size !== variants.length) {
      throw new AppError(400, "Duplicate attribute combinations detected");
    }

    // Validate required attributes
    variants.forEach((variant, index) => {
      const variantAttributeIds = variant.attributes.map(
        (attr) => attr.attributeId
      );
      const missingAttributes = requiredAttributeIds.filter(
        (id) => !variantAttributeIds.includes(id)
      );
      if (missingAttributes.length > 0) {
        throw new AppError(
          400,
          `Variant at index ${index} is missing required attributes: ${missingAttributes.join(
            ", "
          )}`
        );
      }
    });

    // Create product and variants in a transaction
    return prisma.$transaction(async (tx) => {
      const product = await this.productRepository.createProduct({
        ...productData,
        slug: slugify(productData.name),
      });

      for (const variant of variants) {
        await this.variantRepository.createVariant({
          productId: product.id,
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold || 10,
          barcode: variant.barcode,
          warehouseLocation: variant.warehouseLocation,
          attributes: variant.attributes,
          images: variant.images || [],
        });
      }

      return this.productRepository.findProductById(product.id);
    });
  }

  async updateProduct(
    productId: string,
    updatedData: Partial<{
      name: string;
      description?: string;
      basePrice: number;
      discount?: number;
      isNew?: boolean;
      isTrending?: boolean;
      isBestSeller?: boolean;
      isFeatured?: boolean;
      categoryId?: string;
      variants?: {
        sku: string;
        price: number;
        images: string[];
        stock: number;
        lowStockThreshold?: number;
        barcode?: string;
        warehouseLocation?: string;
        attributes: { attributeId: string; valueId: string }[];
      }[];
    }>
  ) {
    const existingProduct = await this.productRepository.findProductById(
      productId
    );
    if (!existingProduct) {
      throw new AppError(404, "Product not found");
    }

    const { variants, ...productData } = updatedData;

    // Validate variants if provided
    if (variants) {
      if (variants.length === 0) {
        throw new AppError(400, "At least one variant is required");
      }

      const skuRegex = /^[a-zA-Z0-9-]+$/;
      variants.forEach((variant, index) => {
        if (
          !variant.sku ||
          !skuRegex.test(variant.sku) ||
          variant.sku.length < 3 ||
          variant.sku.length > 50
        ) {
          throw new AppError(
            400,
            `Variant at index ${index} has an invalid SKU. Use alphanumeric characters and dashes, 3-50 characters.`
          );
        }
        if (variant.price <= 0) {
          throw new AppError(
            400,
            `Variant at index ${index} must have a positive price`
          );
        }
        if (variant.stock < 0) {
          throw new AppError(
            400,
            `Variant at index ${index} must have a non-negative stock`
          );
        }
        if (variant.lowStockThreshold && variant.lowStockThreshold < 0) {
          throw new AppError(
            400,
            `Variant at index ${index} must have a non-negative lowStockThreshold`
          );
        }
      });

      const allAttributeIds = [
        ...new Set(
          variants.flatMap((v) => v.attributes.map((a) => a.attributeId))
        ),
      ];
      const existingAttributes = await prisma.attribute.findMany({
        where: { id: { in: allAttributeIds } },
      });
      if (existingAttributes.length !== allAttributeIds.length) {
        throw new AppError(400, "One or more attributes are invalid");
      }

      const allValueIds = [
        ...new Set(variants.flatMap((v) => v.attributes.map((a) => a.valueId))),
      ];
      const existingValues = await prisma.attributeValue.findMany({
        where: { id: { in: allValueIds } },
      });
      if (existingValues.length !== allValueIds.length) {
        throw new AppError(400, "One or more attribute values are invalid");
      }

      const skuSet = new Set(variants.map((v) => v.sku));
      if (skuSet.size !== variants.length) {
        throw new AppError(400, "Duplicate SKUs detected");
      }

      const comboKeys = variants.map((variant) =>
        variant.attributes
          .map((attr) => `${attr.attributeId}:${attr.valueId}`)
          .sort()
          .join("|")
      );
      if (new Set(comboKeys).size !== variants.length) {
        throw new AppError(400, "Duplicate attribute combinations detected");
      }

      const categoryId = productData.categoryId || existingProduct.categoryId;
      let requiredAttributeIds: string[] = [];
      if (categoryId) {
        const requiredAttributes = await prisma.categoryAttribute.findMany({
          where: { categoryId, isRequired: true },
          select: { attributeId: true },
        });
        requiredAttributeIds = requiredAttributes.map(
          (attr) => attr.attributeId
        );
      }

      variants.forEach((variant, index) => {
        const variantAttributeIds = variant.attributes.map(
          (attr) => attr.attributeId
        );
        const missingAttributes = requiredAttributeIds.filter(
          (id) => !variantAttributeIds.includes(id)
        );
        if (missingAttributes.length > 0) {
          throw new AppError(
            400,
            `Variant at index ${index} is missing required attributes: ${missingAttributes.join(
              ", "
            )}`
          );
        }
      });
    }

    return prisma.$transaction(async (tx) => {
      const updatedProduct = await this.productRepository.updateProduct(
        productId,
        {
          ...productData,
          ...(productData.name && { slug: slugify(productData.name) }),
        }
      );

      if (variants) {
        await prisma.productVariant.deleteMany({ where: { productId } });
        for (const variant of variants) {
          await this.variantRepository.createVariant({
            productId,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            lowStockThreshold: variant.lowStockThreshold || 10,
            barcode: variant.barcode,
            warehouseLocation: variant.warehouseLocation,
            attributes: variant.attributes,
            images: variant.images || [],
          });
        }
      }

      return this.productRepository.findProductById(productId);
    });
  }

  async bulkCreateProducts(file: Express.Multer.File) {
    if (!file) {
      throw new AppError(400, "No file uploaded");
    }

    let records: any[];
    try {
      if (file.mimetype === "text/csv") {
        records = parse(file.buffer.toString(), {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } else if (
        file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        records = XLSX.utils.sheet_to_json(sheet);
      } else {
        throw new AppError(400, "Unsupported file format. Use CSV or XLSX");
      }
    } catch (error) {
      throw new AppError(400, "Failed to parse file");
    }

    if (records.length === 0) {
      throw new AppError(400, "File is empty");
    }

    const toBoolean = (value: unknown) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
      }
      return false;
    };

    const toOptionalString = (value: unknown) => {
      if (value === undefined || value === null) return undefined;
      const normalized = String(value).trim();
      return normalized.length > 0 ? normalized : undefined;
    };

    const toImages = (value: unknown) => {
      const normalized = toOptionalString(value);
      if (!normalized) return [] as string[];

      return normalized
        .split(/[\n,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    };

    const toRecordMap = (record: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(record).map(([key, value]) => [
          key.trim().toLowerCase(),
          value,
        ])
      ) as Record<string, unknown>;

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

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const categoryBySlug = new Map(
      categories.map((category) => [category.slug.toLowerCase(), category])
    );
    const categoryByName = new Map(
      categories.map((category) => [category.name.toLowerCase(), category])
    );

    const normalizedRecords = records.map((rawRecord, index) => {
      const rowNumber = index + 2;
      const record = toRecordMap(rawRecord as Record<string, unknown>);

      const name = toOptionalString(record.name);
      const sku = toOptionalString(record.sku);
      const price = Number(record.price);
      const stock = Number(record.stock ?? 0);
      const lowStockThreshold = Number(record.lowstockthreshold ?? 10);

      if (!name) {
        throw new AppError(400, `Row ${rowNumber}: "name" is required`);
      }

      if (!sku) {
        throw new AppError(400, `Row ${rowNumber}: "sku" is required`);
      }

      if (!Number.isFinite(price) || price <= 0) {
        throw new AppError(
          400,
          `Row ${rowNumber}: "price" must be a positive number`
        );
      }

      if (!Number.isFinite(stock) || stock < 0) {
        throw new AppError(
          400,
          `Row ${rowNumber}: "stock" must be a non-negative number`
        );
      }

      if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
        throw new AppError(
          400,
          `Row ${rowNumber}: "lowStockThreshold" must be a non-negative number`
        );
      }

      const categoryId = toOptionalString(record.categoryid);
      const categorySlug = toOptionalString(record.categoryslug)?.toLowerCase();
      const categoryName = toOptionalString(record.categoryname)?.toLowerCase();

      const category =
        (categoryId ? categoryById.get(categoryId) : undefined) ||
        (categorySlug ? categoryBySlug.get(categorySlug) : undefined) ||
        (categoryName ? categoryByName.get(categoryName) : undefined);

      if (!category) {
        throw new AppError(
          400,
          `Row ${rowNumber}: provide a valid "categoryId", "categorySlug", or "categoryName"`
        );
      }

      const attributes = category.attributes.reduce(
        (acc, categoryAttribute) => {
          const attribute = categoryAttribute.attribute;
          const rawValue =
            record[attribute.slug.toLowerCase()] ??
            record[attribute.name.toLowerCase()];

          const normalizedValue = toOptionalString(rawValue);

          if (!normalizedValue) {
            if (categoryAttribute.isRequired) {
              throw new AppError(
                400,
                `Row ${rowNumber}: "${attribute.slug}" is required for category "${category.name}"`
              );
            }

            return acc;
          }

          const matchedValue = attribute.values.find((value) => {
            const slug = value.slug.trim().toLowerCase();
            const label = value.value.trim().toLowerCase();
            const candidate = normalizedValue.trim().toLowerCase();

            return slug === candidate || label === candidate;
          });

          if (!matchedValue) {
            throw new AppError(
              400,
              `Row ${rowNumber}: invalid value "${normalizedValue}" for attribute "${attribute.slug}"`
            );
          }

          acc.push({
            attributeId: attribute.id,
            valueId: matchedValue.id,
          });

          return acc;
        },
        [] as { attributeId: string; valueId: string }[]
      );

      return {
        rowNumber,
        name,
        normalizedName: name.toLowerCase(),
        slug: slugify(name),
        sku,
        normalizedSku: sku.toLowerCase(),
        price,
        stock,
        lowStockThreshold,
        category,
        description: toOptionalString(record.description),
        isNew: toBoolean(record.isnew),
        isTrending: toBoolean(record.istrending),
        isBestSeller: toBoolean(record.isbestseller),
        isFeatured: toBoolean(record.isfeatured),
        barcode: toOptionalString(record.barcode),
        warehouseLocation: toOptionalString(record.warehouselocation),
        images: toImages(record.images),
        attributes,
      };
    });

    const ensureNoDuplicatesInFile = (
      values: { rowNumber: number; normalized: string; label: string }[],
      fieldName: string
    ) => {
      const seen = new Map<string, { rowNumber: number; label: string }>();

      for (const value of values) {
        const existing = seen.get(value.normalized);
        if (existing) {
          throw new AppError(
            400,
            `Duplicate ${fieldName} in file: "${value.label}" appears in rows ${existing.rowNumber} and ${value.rowNumber}`
          );
        }

        seen.set(value.normalized, {
          rowNumber: value.rowNumber,
          label: value.label,
        });
      }
    };

    ensureNoDuplicatesInFile(
      normalizedRecords.map((record) => ({
        rowNumber: record.rowNumber,
        normalized: record.normalizedSku,
        label: record.sku,
      })),
      "SKU"
    );

    ensureNoDuplicatesInFile(
      normalizedRecords.map((record) => ({
        rowNumber: record.rowNumber,
        normalized: record.normalizedName,
        label: record.name,
      })),
      "product name"
    );

    ensureNoDuplicatesInFile(
      normalizedRecords.map((record) => ({
        rowNumber: record.rowNumber,
        normalized: record.slug.toLowerCase(),
        label: record.slug,
      })),
      "product slug"
    );

    const [existingProducts, existingVariants] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { in: normalizedRecords.map((record) => record.name) } },
            { slug: { in: normalizedRecords.map((record) => record.slug) } },
          ],
        },
        select: {
          name: true,
          slug: true,
        },
      }),
      prisma.productVariant.findMany({
        where: {
          sku: { in: normalizedRecords.map((record) => record.sku) },
        },
        select: {
          sku: true,
        },
      }),
    ]);

    const existingNames = new Set(
      existingProducts.map((product) => product.name.toLowerCase())
    );
    const existingSlugs = new Set(
      existingProducts.map((product) => product.slug.toLowerCase())
    );
    const existingSkus = new Set(
      existingVariants.map((variant) => variant.sku.toLowerCase())
    );

    for (const record of normalizedRecords) {
      if (existingSkus.has(record.normalizedSku)) {
        throw new AppError(
          400,
          `Row ${record.rowNumber}: SKU "${record.sku}" already exists`
        );
      }

      if (existingNames.has(record.normalizedName)) {
        throw new AppError(
          400,
          `Row ${record.rowNumber}: product name "${record.name}" already exists`
        );
      }

      if (existingSlugs.has(record.slug.toLowerCase())) {
        throw new AppError(
          400,
          `Row ${record.rowNumber}: product slug "${record.slug}" already exists`
        );
      }
    }

    let createdCount = 0;

    for (const record of normalizedRecords) {
      await this.createProduct({
        name: record.name,
        description: record.description,
        isNew: record.isNew,
        isTrending: record.isTrending,
        isBestSeller: record.isBestSeller,
        isFeatured: record.isFeatured,
        categoryId: record.category.id,
        variants: [
          {
            sku: record.sku,
            price: record.price,
            stock: record.stock,
            lowStockThreshold: record.lowStockThreshold,
            barcode: record.barcode,
            warehouseLocation: record.warehouseLocation,
            images: record.images,
            attributes: record.attributes,
          },
        ],
      });

      createdCount += 1;
    }

    return { count: createdCount };
  }

  async deleteProduct(productId: string) {
    const product = await this.productRepository.findProductById(productId);
    if (!product) {
      throw new AppError(404, "Product not found");
    }

    await this.productRepository.deleteProduct(productId);
  }
}
