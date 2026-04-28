"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const AppError_1 = __importDefault(require("@/shared/errors/AppError"));
const ApiFeatures_1 = __importDefault(require("@/shared/utils/ApiFeatures"));
const slugify_1 = __importDefault(require("@/shared/utils/slugify"));
const sync_1 = require("csv-parse/sync");
const XLSX = __importStar(require("xlsx"));
const database_config_1 = __importDefault(require("@/infra/database/database.config"));
class ProductService {
    constructor(productRepository, attributeRepository, variantRepository) {
        this.productRepository = productRepository;
        this.attributeRepository = attributeRepository;
        this.variantRepository = variantRepository;
    }
    getAllProducts(queryString) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiFeatures = new ApiFeatures_1.default(queryString)
                .filter()
                .sort()
                .limitFields()
                .paginate()
                .build();
            const { where, orderBy, skip, take, select } = apiFeatures;
            const finalWhere = where && Object.keys(where).length > 0 ? where : {};
            const totalResults = yield this.productRepository.countProducts({
                where: finalWhere,
            });
            const totalPages = Math.ceil(totalResults / take);
            const currentPage = Math.floor(skip / take) + 1;
            const products = yield this.productRepository.findManyProducts({
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
        });
    }
    getProductById(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield this.productRepository.findProductById(productId);
            if (!product) {
                throw new AppError_1.default(404, "Product not found");
            }
            return product;
        });
    }
    getProductBySlug(productSlug) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield this.productRepository.findProductBySlug(productSlug);
            if (!product) {
                throw new AppError_1.default(404, "Product not found");
            }
            return product;
        });
    }
    createProduct(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { variants } = data, productData = __rest(data, ["variants"]);
            if (!variants || variants.length === 0) {
                throw new AppError_1.default(400, "At least one variant is required");
            }
            // Validate SKU format (alphanumeric with dashes, 3-50 characters)
            const skuRegex = /^[a-zA-Z0-9-]+$/;
            variants.forEach((variant, index) => {
                if (!variant.sku ||
                    !skuRegex.test(variant.sku) ||
                    variant.sku.length < 3 ||
                    variant.sku.length > 50) {
                    throw new AppError_1.default(400, `Variant at index ${index} has invalid SKU. Use alphanumeric characters and dashes, 3-50 characters.`);
                }
                if (variant.price <= 0) {
                    throw new AppError_1.default(400, `Variant at index ${index} must have a positive price`);
                }
                if (variant.stock < 0) {
                    throw new AppError_1.default(400, `Variant at index ${index} must have non-negative stock`);
                }
                if (variant.lowStockThreshold && variant.lowStockThreshold < 0) {
                    throw new AppError_1.default(400, `Variant at index ${index} must have non-negative lowStockThreshold`);
                }
            });
            // Validate category and required attributes
            let requiredAttributeIds = [];
            if (productData.categoryId) {
                const category = yield database_config_1.default.category.findUnique({
                    where: { id: productData.categoryId },
                    include: {
                        attributes: {
                            where: { isRequired: true },
                            select: { attributeId: true },
                        },
                    },
                });
                if (!category) {
                    throw new AppError_1.default(404, "Category not found");
                }
                requiredAttributeIds = category.attributes.map((attr) => attr.attributeId);
            }
            // Validate attributes and values in one query
            const allAttributeIds = [
                ...new Set(variants.flatMap((v) => v.attributes.map((a) => a.attributeId))),
            ];
            const allValueIds = [
                ...new Set(variants.flatMap((v) => v.attributes.map((a) => a.valueId))),
            ];
            const [existingAttributes, existingValues] = yield Promise.all([
                database_config_1.default.attribute.findMany({
                    where: { id: { in: allAttributeIds } },
                    select: { id: true },
                }),
                database_config_1.default.attributeValue.findMany({
                    where: { id: { in: allValueIds } },
                    select: { id: true, attributeId: true },
                }),
            ]);
            if (existingAttributes.length !== allAttributeIds.length) {
                throw new AppError_1.default(400, "One or more attribute IDs are invalid");
            }
            if (existingValues.length !== allValueIds.length) {
                throw new AppError_1.default(400, "One or more attribute value IDs are invalid");
            }
            // Validate attribute-value pairs
            variants.forEach((variant, index) => {
                variant.attributes.forEach((attr, attrIndex) => {
                    const value = existingValues.find((v) => v.id === attr.valueId);
                    if (!value || value.attributeId !== attr.attributeId) {
                        throw new AppError_1.default(400, `Attribute value at variant index ${index}, attribute index ${attrIndex} does not belong to the specified attribute`);
                    }
                });
            });
            // Validate unique SKUs
            const existingSkus = yield database_config_1.default.productVariant.findMany({
                where: { sku: { in: variants.map((v) => v.sku) } },
                select: { sku: true },
            });
            if (existingSkus.length > 0) {
                throw new AppError_1.default(400, `Duplicate SKUs detected: ${existingSkus.map((s) => s.sku).join(", ")}`);
            }
            // Validate unique attribute combinations
            const comboKeys = variants.map((variant) => variant.attributes
                .map((attr) => `${attr.attributeId}:${attr.valueId}`)
                .sort()
                .join("|"));
            if (new Set(comboKeys).size !== variants.length) {
                throw new AppError_1.default(400, "Duplicate attribute combinations detected");
            }
            // Validate required attributes
            variants.forEach((variant, index) => {
                const variantAttributeIds = variant.attributes.map((attr) => attr.attributeId);
                const missingAttributes = requiredAttributeIds.filter((id) => !variantAttributeIds.includes(id));
                if (missingAttributes.length > 0) {
                    throw new AppError_1.default(400, `Variant at index ${index} is missing required attributes: ${missingAttributes.join(", ")}`);
                }
            });
            // Create product and variants in a transaction
            return database_config_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const product = yield this.productRepository.createProduct(Object.assign(Object.assign({}, productData), { slug: (0, slugify_1.default)(productData.name) }));
                for (const variant of variants) {
                    yield this.variantRepository.createVariant({
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
            }));
        });
    }
    updateProduct(productId, updatedData) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingProduct = yield this.productRepository.findProductById(productId);
            if (!existingProduct) {
                throw new AppError_1.default(404, "Product not found");
            }
            const { variants } = updatedData, productData = __rest(updatedData, ["variants"]);
            // Validate variants if provided
            if (variants) {
                if (variants.length === 0) {
                    throw new AppError_1.default(400, "At least one variant is required");
                }
                const skuRegex = /^[a-zA-Z0-9-]+$/;
                variants.forEach((variant, index) => {
                    if (!variant.sku ||
                        !skuRegex.test(variant.sku) ||
                        variant.sku.length < 3 ||
                        variant.sku.length > 50) {
                        throw new AppError_1.default(400, `Variant at index ${index} has an invalid SKU. Use alphanumeric characters and dashes, 3-50 characters.`);
                    }
                    if (variant.price <= 0) {
                        throw new AppError_1.default(400, `Variant at index ${index} must have a positive price`);
                    }
                    if (variant.stock < 0) {
                        throw new AppError_1.default(400, `Variant at index ${index} must have a non-negative stock`);
                    }
                    if (variant.lowStockThreshold && variant.lowStockThreshold < 0) {
                        throw new AppError_1.default(400, `Variant at index ${index} must have a non-negative lowStockThreshold`);
                    }
                });
                const allAttributeIds = [
                    ...new Set(variants.flatMap((v) => v.attributes.map((a) => a.attributeId))),
                ];
                const existingAttributes = yield database_config_1.default.attribute.findMany({
                    where: { id: { in: allAttributeIds } },
                });
                if (existingAttributes.length !== allAttributeIds.length) {
                    throw new AppError_1.default(400, "One or more attributes are invalid");
                }
                const allValueIds = [
                    ...new Set(variants.flatMap((v) => v.attributes.map((a) => a.valueId))),
                ];
                const existingValues = yield database_config_1.default.attributeValue.findMany({
                    where: { id: { in: allValueIds } },
                });
                if (existingValues.length !== allValueIds.length) {
                    throw new AppError_1.default(400, "One or more attribute values are invalid");
                }
                const skuSet = new Set(variants.map((v) => v.sku));
                if (skuSet.size !== variants.length) {
                    throw new AppError_1.default(400, "Duplicate SKUs detected");
                }
                const comboKeys = variants.map((variant) => variant.attributes
                    .map((attr) => `${attr.attributeId}:${attr.valueId}`)
                    .sort()
                    .join("|"));
                if (new Set(comboKeys).size !== variants.length) {
                    throw new AppError_1.default(400, "Duplicate attribute combinations detected");
                }
                const categoryId = productData.categoryId || existingProduct.categoryId;
                let requiredAttributeIds = [];
                if (categoryId) {
                    const requiredAttributes = yield database_config_1.default.categoryAttribute.findMany({
                        where: { categoryId, isRequired: true },
                        select: { attributeId: true },
                    });
                    requiredAttributeIds = requiredAttributes.map((attr) => attr.attributeId);
                }
                variants.forEach((variant, index) => {
                    const variantAttributeIds = variant.attributes.map((attr) => attr.attributeId);
                    const missingAttributes = requiredAttributeIds.filter((id) => !variantAttributeIds.includes(id));
                    if (missingAttributes.length > 0) {
                        throw new AppError_1.default(400, `Variant at index ${index} is missing required attributes: ${missingAttributes.join(", ")}`);
                    }
                });
            }
            return database_config_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const updatedProduct = yield this.productRepository.updateProduct(productId, Object.assign(Object.assign({}, productData), (productData.name && { slug: (0, slugify_1.default)(productData.name) })));
                if (variants) {
                    yield database_config_1.default.productVariant.deleteMany({ where: { productId } });
                    for (const variant of variants) {
                        yield this.variantRepository.createVariant({
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
            }));
        });
    }
    bulkCreateProducts(file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!file) {
                throw new AppError_1.default(400, "No file uploaded");
            }
            let records;
            try {
                if (file.mimetype === "text/csv") {
                    records = (0, sync_1.parse)(file.buffer.toString(), {
                        columns: true,
                        skip_empty_lines: true,
                        trim: true,
                    });
                }
                else if (file.mimetype ===
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
                    const workbook = XLSX.read(file.buffer, { type: "buffer" });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    records = XLSX.utils.sheet_to_json(sheet);
                }
                else {
                    throw new AppError_1.default(400, "Unsupported file format. Use CSV or XLSX");
                }
            }
            catch (error) {
                throw new AppError_1.default(400, "Failed to parse file");
            }
            if (records.length === 0) {
                throw new AppError_1.default(400, "File is empty");
            }
            const toBoolean = (value) => {
                if (typeof value === "boolean")
                    return value;
                if (typeof value === "number")
                    return value !== 0;
                if (typeof value === "string") {
                    return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
                }
                return false;
            };
            const toOptionalString = (value) => {
                if (value === undefined || value === null)
                    return undefined;
                const normalized = String(value).trim();
                return normalized.length > 0 ? normalized : undefined;
            };
            const toImages = (value) => {
                const normalized = toOptionalString(value);
                if (!normalized)
                    return [];
                return normalized
                    .split(/[\n,|]/)
                    .map((item) => item.trim())
                    .filter(Boolean);
            };
            const toRecordMap = (record) => Object.fromEntries(Object.entries(record).map(([key, value]) => [
                key.trim().toLowerCase(),
                value,
            ]));
            const categories = yield database_config_1.default.category.findMany({
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
            const categoryBySlug = new Map(categories.map((category) => [category.slug.toLowerCase(), category]));
            const categoryByName = new Map(categories.map((category) => [category.name.toLowerCase(), category]));
            const normalizedRecords = records.map((rawRecord, index) => {
                var _a, _b, _c, _d;
                const rowNumber = index + 2;
                const record = toRecordMap(rawRecord);
                const name = toOptionalString(record.name);
                const sku = toOptionalString(record.sku);
                const price = Number(record.price);
                const stock = Number((_a = record.stock) !== null && _a !== void 0 ? _a : 0);
                const lowStockThreshold = Number((_b = record.lowstockthreshold) !== null && _b !== void 0 ? _b : 10);
                if (!name) {
                    throw new AppError_1.default(400, `Row ${rowNumber}: "name" is required`);
                }
                if (!sku) {
                    throw new AppError_1.default(400, `Row ${rowNumber}: "sku" is required`);
                }
                if (!Number.isFinite(price) || price <= 0) {
                    throw new AppError_1.default(400, `Row ${rowNumber}: "price" must be a positive number`);
                }
                if (!Number.isFinite(stock) || stock < 0) {
                    throw new AppError_1.default(400, `Row ${rowNumber}: "stock" must be a non-negative number`);
                }
                if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
                    throw new AppError_1.default(400, `Row ${rowNumber}: "lowStockThreshold" must be a non-negative number`);
                }
                const categoryId = toOptionalString(record.categoryid);
                const categorySlug = (_c = toOptionalString(record.categoryslug)) === null || _c === void 0 ? void 0 : _c.toLowerCase();
                const categoryName = (_d = toOptionalString(record.categoryname)) === null || _d === void 0 ? void 0 : _d.toLowerCase();
                const category = (categoryId ? categoryById.get(categoryId) : undefined) ||
                    (categorySlug ? categoryBySlug.get(categorySlug) : undefined) ||
                    (categoryName ? categoryByName.get(categoryName) : undefined);
                if (!category) {
                    throw new AppError_1.default(400, `Row ${rowNumber}: provide a valid "categoryId", "categorySlug", or "categoryName"`);
                }
                const attributes = category.attributes.reduce((acc, categoryAttribute) => {
                    var _a;
                    const attribute = categoryAttribute.attribute;
                    const rawValue = (_a = record[attribute.slug.toLowerCase()]) !== null && _a !== void 0 ? _a : record[attribute.name.toLowerCase()];
                    const normalizedValue = toOptionalString(rawValue);
                    if (!normalizedValue) {
                        if (categoryAttribute.isRequired) {
                            throw new AppError_1.default(400, `Row ${rowNumber}: "${attribute.slug}" is required for category "${category.name}"`);
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
                        throw new AppError_1.default(400, `Row ${rowNumber}: invalid value "${normalizedValue}" for attribute "${attribute.slug}"`);
                    }
                    acc.push({
                        attributeId: attribute.id,
                        valueId: matchedValue.id,
                    });
                    return acc;
                }, []);
                return {
                    rowNumber,
                    name,
                    normalizedName: name.toLowerCase(),
                    slug: (0, slugify_1.default)(name),
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
            const ensureNoDuplicatesInFile = (values, fieldName) => {
                const seen = new Map();
                for (const value of values) {
                    const existing = seen.get(value.normalized);
                    if (existing) {
                        throw new AppError_1.default(400, `Duplicate ${fieldName} in file: "${value.label}" appears in rows ${existing.rowNumber} and ${value.rowNumber}`);
                    }
                    seen.set(value.normalized, {
                        rowNumber: value.rowNumber,
                        label: value.label,
                    });
                }
            };
            ensureNoDuplicatesInFile(normalizedRecords.map((record) => ({
                rowNumber: record.rowNumber,
                normalized: record.normalizedSku,
                label: record.sku,
            })), "SKU");
            ensureNoDuplicatesInFile(normalizedRecords.map((record) => ({
                rowNumber: record.rowNumber,
                normalized: record.normalizedName,
                label: record.name,
            })), "product name");
            ensureNoDuplicatesInFile(normalizedRecords.map((record) => ({
                rowNumber: record.rowNumber,
                normalized: record.slug.toLowerCase(),
                label: record.slug,
            })), "product slug");
            const [existingProducts, existingVariants] = yield Promise.all([
                database_config_1.default.product.findMany({
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
                database_config_1.default.productVariant.findMany({
                    where: {
                        sku: { in: normalizedRecords.map((record) => record.sku) },
                    },
                    select: {
                        sku: true,
                    },
                }),
            ]);
            const existingNames = new Set(existingProducts.map((product) => product.name.toLowerCase()));
            const existingSlugs = new Set(existingProducts.map((product) => product.slug.toLowerCase()));
            const existingSkus = new Set(existingVariants.map((variant) => variant.sku.toLowerCase()));
            for (const record of normalizedRecords) {
                if (existingSkus.has(record.normalizedSku)) {
                    throw new AppError_1.default(400, `Row ${record.rowNumber}: SKU "${record.sku}" already exists`);
                }
                if (existingNames.has(record.normalizedName)) {
                    throw new AppError_1.default(400, `Row ${record.rowNumber}: product name "${record.name}" already exists`);
                }
                if (existingSlugs.has(record.slug.toLowerCase())) {
                    throw new AppError_1.default(400, `Row ${record.rowNumber}: product slug "${record.slug}" already exists`);
                }
            }
            let createdCount = 0;
            for (const record of normalizedRecords) {
                yield this.createProduct({
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
        });
    }
    deleteProduct(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield this.productRepository.findProductById(productId);
            if (!product) {
                throw new AppError_1.default(404, "Product not found");
            }
            yield this.productRepository.deleteProduct(productId);
        });
    }
}
exports.ProductService = ProductService;
