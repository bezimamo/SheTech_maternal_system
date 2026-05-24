import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export interface UploadBufferOptions {
  folder: string;
  format?: string;
  publicId?: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
  }

  /**
   * Upload a raw image buffer to Cloudinary via upload_stream (no local disk).
   */
  uploadBuffer(buffer: Buffer, options: UploadBufferOptions): Promise<CloudinaryUploadResult> {
    const { folder, format = 'png', publicId } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          format,
          resource_type: 'image',
          ...(publicId ? { public_id: publicId, overwrite: true } : {}),
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(error);
            return;
          }
          if (!result?.secure_url) {
            reject(new Error('Cloudinary upload returned no secure_url'));
            return;
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }
}
