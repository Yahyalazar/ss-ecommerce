"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = exports.isCloudinaryTimeoutError = void 0;
const cloudinary_1 = require("cloudinary");
const DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || 180000);
const resolveUploadTimeout = (timeoutMs) => {
    if (typeof timeoutMs === "number" &&
        Number.isFinite(timeoutMs) &&
        timeoutMs > 0) {
        return timeoutMs;
    }
    if (Number.isFinite(DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS) &&
        DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS > 0) {
        return DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS;
    }
    return 180000;
};
const isCloudinaryTimeoutError = (error) => {
    if (!error || typeof error !== "object") {
        return false;
    }
    const timeoutError = error;
    return (timeoutError.name === "TimeoutError" || timeoutError.http_code === 499);
};
exports.isCloudinaryTimeoutError = isCloudinaryTimeoutError;
const uploadToCloudinary = (files_1, ...args_1) => __awaiter(void 0, [files_1, ...args_1], void 0, function* (files, options = {}) {
    try {
        const timeout = resolveUploadTimeout(options.timeoutMs);
        const uploadPromises = files.map((file) => new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader
                .upload_stream({
                disable_promises: true,
                resource_type: "image",
                fetch_format: "webp",
                quality: "auto",
                flags: "progressive",
                folder: options.folder,
                timeout,
            }, (error, result) => {
                if (error)
                    return reject(error);
                if (!result)
                    return reject(new Error("Upload failed"));
                resolve({
                    url: result.secure_url,
                    public_id: result.public_id,
                });
            })
                .end(file.buffer);
        }));
        const results = yield Promise.allSettled(uploadPromises);
        const failedUploads = results.filter((result) => result.status === "rejected");
        failedUploads.forEach((result, index) => {
            console.error(`Cloudinary upload failed for file ${index}:`, result.reason);
        });
        const successfulUploads = results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value);
        if (options.throwOnAllFailed &&
            successfulUploads.length === 0 &&
            failedUploads.length > 0) {
            throw failedUploads[0].reason;
        }
        return successfulUploads;
    }
    catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        if (options.throwOnAllFailed) {
            throw error;
        }
        return [];
    }
});
exports.uploadToCloudinary = uploadToCloudinary;
