"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const AppError_1 = __importDefault(require("@/shared/errors/AppError"));
const allowedMimeTypes = new Set([
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const allowedExtensions = new Set([".csv", ".xlsx", ".xls"]);
const bulkFileUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const extension = path_1.default.extname(file.originalname || "").toLowerCase();
        const isAllowedMimeType = allowedMimeTypes.has(file.mimetype);
        const isAllowedExtension = allowedExtensions.has(extension);
        if (!isAllowedMimeType && !isAllowedExtension) {
            return cb(new AppError_1.default(400, "Only CSV and Excel files (.csv, .xls, .xlsx) are allowed"));
        }
        cb(null, true);
    },
});
exports.default = bulkFileUpload;
