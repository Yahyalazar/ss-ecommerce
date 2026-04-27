import { v2 as cloudinary } from "cloudinary";

const DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS = Number(
  process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || 180000
);

const resolveUploadTimeout = (timeoutMs?: number) => {
  if (
    typeof timeoutMs === "number" &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
  ) {
    return timeoutMs;
  }

  if (
    Number.isFinite(DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS) &&
    DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS > 0
  ) {
    return DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS;
  }

  return 180000;
};

export const isCloudinaryTimeoutError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const timeoutError = error as { name?: string; http_code?: number };
  return (
    timeoutError.name === "TimeoutError" || timeoutError.http_code === 499
  );
};

interface UploadToCloudinaryOptions {
  folder?: string;
  timeoutMs?: number;
  throwOnAllFailed?: boolean;
}

export const uploadToCloudinary = async (
  files: any,
  options: UploadToCloudinaryOptions = {}
) => {
  try {
    const timeout = resolveUploadTimeout(options.timeoutMs);

    const uploadPromises = files.map(
      (file: any) =>
        new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                disable_promises: true,
                resource_type: "image",
                fetch_format: "webp",
                quality: "auto",
                flags: "progressive",
                folder: options.folder,
                timeout,
              },
              (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error("Upload failed"));
                resolve({
                  url: result.secure_url,
                  public_id: result.public_id,
                });
              }
            )
            .end(file.buffer);
        })
    );

    const results = await Promise.allSettled(uploadPromises);
    const failedUploads = results.filter(
      (result) => result.status === "rejected"
    ) as PromiseRejectedResult[];

    failedUploads.forEach((result, index) => {
      console.error(
        `Cloudinary upload failed for file ${index}:`,
        result.reason
      );
    });

    const successfulUploads = results
      .filter((result) => result.status === "fulfilled")
      .map((result: any) => result.value);

    if (
      options.throwOnAllFailed &&
      successfulUploads.length === 0 &&
      failedUploads.length > 0
    ) {
      throw failedUploads[0].reason;
    }

    return successfulUploads;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    if (options.throwOnAllFailed) {
      throw error;
    }

    return [];
  }
};
