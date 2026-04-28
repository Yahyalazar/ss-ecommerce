import multer from "multer";
import path from "path";
import AppError from "@/shared/errors/AppError";

const allowedMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const allowedExtensions = new Set([".csv", ".xlsx", ".xls"]);

const bulkFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isAllowedMimeType = allowedMimeTypes.has(file.mimetype);
    const isAllowedExtension = allowedExtensions.has(extension);

    if (!isAllowedMimeType && !isAllowedExtension) {
      return cb(
        new AppError(
          400,
          "Only CSV and Excel files (.csv, .xls, .xlsx) are allowed"
        )
      );
    }

    cb(null, true);
  },
});

export default bulkFileUpload;
