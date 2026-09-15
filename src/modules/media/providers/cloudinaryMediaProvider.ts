import { v2 as cloudinary } from "cloudinary";
import { env } from "../../../config/env.config.js";
import { AppError } from "../../../errors/appError.js";
import type { MediaProvider, MediaUploadInput, StoredMedia } from "./mediaProvider.interface.js";

function configureCloudinary() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw AppError.internal("Media storage is not configured", "MEDIA_STORAGE_NOT_CONFIGURED");
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export const cloudinaryMediaProvider: MediaProvider = {
  async upload(input: MediaUploadInput): Promise<StoredMedia> {
    const client = configureCloudinary();

    return new Promise((resolve, reject) => {
      const stream = client.uploader.upload_stream(
        { folder: "asf/media", resource_type: "image" },
        (error, result) => {
          if (error || !result) {
            reject(AppError.internal("Media upload failed", "MEDIA_UPLOAD_FAILED"));
            return;
          }

          resolve({
            provider: "cloudinary",
            publicId: result.public_id,
            secureUrl: result.secure_url,
            resourceType: result.resource_type,
            format: result.format,
            bytes: result.bytes,
            width: result.width ?? null,
            height: result.height ?? null,
          });
        }
      );

      stream.end(input.buffer);
    });
  },

  async delete(publicId: string) {
    const client = configureCloudinary();
    const result = await client.uploader.destroy(publicId, { resource_type: "image" });
    if (result.result !== "ok" && result.result !== "not found") {
      throw AppError.internal("Media deletion failed", "MEDIA_DELETE_FAILED");
    }
  },
};
