import multer from "multer";
import AppError from "@/shared/errors/AppError";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new AppError(400, "Only images are allowed"));
    }
    cb(null, true);
  },
});

export default upload;
