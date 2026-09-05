import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from './logger';

const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info('Cloudinary storage engine configured.');
} else {
  logger.warn('Cloudinary not configured. Using local disk storage fallback.');
}

export interface UploadResult {
  url: string;
  storageKey: string;
  bytes: number;
}

export async function uploadMedicalDocument(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadResult> {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'medilocker_records',
          resource_type: 'auto',
          filename_override: originalFilename,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload returned null'));
          }
          resolve({
            url: result.secure_url,
            storageKey: result.public_id,
            bytes: result.bytes,
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  // Local Disk Storage Fallback
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeFilename = `${Date.now()}-${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(uploadsDir, safeFilename);

  await fs.promises.writeFile(filePath, fileBuffer);

  return {
    url: `/uploads/${safeFilename}`,
    storageKey: filePath,
    bytes: fileBuffer.length,
  };
}
