import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const hasCloudinaryConfig = () =>
  Boolean(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));

export const uploadToCloudStorage = (file) => {
  if (!file) throw new HttpError(400, 'No file was uploaded.');
  if (!hasCloudinaryConfig()) {
    throw new HttpError(501, 'Cloud storage is not configured. Add Cloudinary keys to .env.');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinaryFolder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          url: result.secure_url,
          file_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      },
    );

    stream.end(file.buffer);
  });
};
