"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const chatUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10,
    },
    fileFilter: (req, file, cb) => {
        const isImage = file.mimetype.startsWith("image/");
        const isAudio = file.mimetype.startsWith("audio/");
        if (!isImage && !isAudio) {
            return cb(new Error("Only image and audio files are allowed"));
        }
        cb(null, true);
    },
});
exports.default = chatUpload;
