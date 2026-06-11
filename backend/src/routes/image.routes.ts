import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Image from '../models/Image';
import Folder from '../models/Folder';
import { auth } from '../middleware/auth';
import upload from '../middleware/upload';
import { invalidateFolderSizeCache } from '../utils/folderSize';
import { isValidObjectId } from '../utils/helpers';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import fs from 'fs';
import path from 'path';

const router = Router();

// ─── PUBLIC ROUTE (no auth) ─── image file serving ───
// This must be BEFORE router.use(auth) so <img> tags work without JWT
router.get('/:filename/file', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filename = req.params.filename as string;
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const filePath = path.resolve(uploadDir, filename);

    // Security: ensure the resolved path is within uploads dir
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!filePath.startsWith(resolvedUploadDir)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }

    // Cache for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// ─── ALL ROUTES BELOW REQUIRE AUTH ───
router.use(auth);

/**
 * POST /api/images
 * Upload single image to a folder
 */
router.post(
  '/',
  upload.single('image'),
  [
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Image name is required (1-255 chars)'),
    body('folderId').notEmpty().withMessage('Folder ID is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file provided' });
        return;
      }

      const { name, folderId } = req.body;
      const userId = req.userId!;

      if (!isValidObjectId(folderId as string)) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, message: 'Invalid folder ID' });
        return;
      }

      // Verify folder exists and belongs to user
      const folder = await Folder.findOne({ _id: folderId, user: userId });
      if (!folder) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ success: false, message: 'Folder not found or access denied' });
        return;
      }

      // Upload to Cloudinary in production, otherwise use local path
      let imageUrl = `/api/images/${req.file.filename}/file`;
      let cloudinaryId = '';

      if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const cloudResult = await uploadToCloudinary(req.file.path);
          imageUrl = cloudResult.secure_url;
          cloudinaryId = cloudResult.public_id;
          // Remove local file after Cloudinary upload
          fs.unlinkSync(req.file.path);
        } catch (cloudErr) {
          console.error('Cloudinary upload failed, using local storage:', cloudErr);
        }
      }

      const image = await Image.create({
        name,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: imageUrl,
        cloudinaryId,
        folder: folderId,
        user: userId,
      });

      // Invalidate folder size cache
      await invalidateFolderSizeCache(folderId as string, userId);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: { image },
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

/**
 * POST /api/images/multi
 * Upload multiple images to a folder at once
 */
router.post(
  '/multi',
  upload.array('images', 10), // max 10 images at once
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const files = req.files as Express.Multer.File[] | undefined;
    try {
      const { folderId } = req.body;
      const userId = req.userId!;

      if (!folderId || !isValidObjectId(folderId as string)) {
        if (files) files.forEach((f) => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        res.status(400).json({ success: false, message: 'Valid folder ID is required' });
        return;
      }

      if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: 'No image files provided' });
        return;
      }

      // Verify folder
      const folder = await Folder.findOne({ _id: folderId, user: userId });
      if (!folder) {
        files.forEach((f) => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        res.status(404).json({ success: false, message: 'Folder not found or access denied' });
        return;
      }

      const uploaded: any[] = [];
      const errors: string[] = [];

      for (const file of files) {
        try {
          let imageUrl = `/api/images/${file.filename}/file`;
          let cloudinaryId = '';

          if (process.env.CLOUDINARY_CLOUD_NAME) {
            try {
              const cloudResult = await uploadToCloudinary(file.path);
              imageUrl = cloudResult.secure_url;
              cloudinaryId = cloudResult.public_id;
              fs.unlinkSync(file.path);
            } catch (cloudErr) {
              console.error('Cloudinary upload failed for', file.originalname);
            }
          }

          // Use provided names or original filenames
          const names = req.body.names;
          const nameArray = Array.isArray(names) ? names : names ? [names] : [];
          const imageName = nameArray[uploaded.length] || file.originalname.replace(/\.[^/.]+$/, '');

          const image = await Image.create({
            name: imageName,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: imageUrl,
            cloudinaryId,
            folder: folderId,
            user: userId,
          });

          uploaded.push(image);
        } catch (err: any) {
          errors.push(`Failed to upload ${file.originalname}: ${err.message}`);
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
      }

      // Invalidate folder size cache once for all uploads
      await invalidateFolderSizeCache(folderId as string, userId);

      res.status(201).json({
        success: true,
        message: `${uploaded.length} image(s) uploaded successfully${errors.length ? `, ${errors.length} failed` : ''}`,
        data: { images: uploaded, errors },
      });
    } catch (error) {
      if (files) files.forEach((f) => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      next(error);
    }
  }
);

/**
 * GET /api/images/:id
 * Get image metadata
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid image ID' });
      return;
    }

    const image = await Image.findOne({ _id: id, user: userId });
    if (!image) {
      res.status(404).json({ success: false, message: 'Image not found' });
      return;
    }

    res.json({ success: true, data: { image } });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/images/:id
 * Delete an image
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid image ID' });
      return;
    }

    const image = await Image.findOne({ _id: id, user: userId });
    if (!image) {
      res.status(404).json({ success: false, message: 'Image not found' });
      return;
    }

    // Delete from Cloudinary if applicable
    if (image.cloudinaryId) {
      await deleteFromCloudinary(image.cloudinaryId);
    }

    // Delete file from disk
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const filePath = path.join(uploadDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const folderId = image.folder.toString();
    await Image.deleteOne({ _id: id });

    // Invalidate folder size cache
    await invalidateFolderSizeCache(folderId, userId);

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
