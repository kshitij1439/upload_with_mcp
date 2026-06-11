import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (only if env vars are set)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
}

/**
 * Upload a file to Cloudinary.
 * Used in production instead of local file storage.
 */
export const uploadToCloudinary = async (filePath: string): Promise<CloudinaryResult> => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'dobby-drive',
    resource_type: 'image',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    bytes: result.bytes,
    format: result.format,
  };
};

/**
 * Delete a file from Cloudinary by public_id.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete from Cloudinary:', publicId, error);
  }
};

export default cloudinary;
