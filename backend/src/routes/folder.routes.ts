import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Folder from '../models/Folder';
import Image from '../models/Image';
import { auth } from '../middleware/auth';
import { calculateFolderSize, invalidateFolderSizeCache, getFolderBreadcrumb } from '../utils/folderSize';
import { isValidObjectId } from '../utils/helpers';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(auth);

// POST /api/folders - Create a new folder
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Folder name must be between 1 and 255 characters')
      .custom((value) => {
        if (/[\/\\<>:"|?*\x00-\x1f]/.test(value)) {
          throw new Error('Folder name contains invalid characters');
        }
        return true;
      }),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return;
      }

      const { name, parentId } = req.body;
      const userId = req.userId!;
      let parentPath = '/';
      let depth = 0;

      if (parentId && parentId !== 'null') {
        if (!isValidObjectId(parentId)) {
          res.status(400).json({ success: false, message: 'Invalid parent folder ID' });
          return;
        }
        const parentFolder = await Folder.findOne({ _id: parentId, user: userId });
        if (!parentFolder) {
          res.status(404).json({ success: false, message: 'Parent folder not found or access denied' });
          return;
        }
        parentPath = parentFolder.path + parentFolder._id.toString() + '/';
        depth = parentFolder.depth + 1;
        if (depth > 10) {
          res.status(400).json({ success: false, message: 'Maximum folder nesting depth of 10 levels reached' });
          return;
        }
      }

      // Check duplicate
      const existing = await Folder.findOne({
        name,
        parent: parentId && parentId !== 'null' ? parentId : null,
        user: userId,
      });
      if (existing) {
        res.status(409).json({ success: false, message: 'A folder with this name already exists in this location' });
        return;
      }

      const folder = await Folder.create({
        name,
        parent: parentId && parentId !== 'null' ? parentId : null,
        user: userId,
        path: parentPath,
        depth,
      });

      res.status(201).json({ success: true, message: 'Folder created successfully', data: { folder } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/folders - List folders
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId!;
    const parentParam = req.query.parent as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    let parentFilter: any = null;
    if (parentParam && parentParam !== 'root') {
      if (!isValidObjectId(parentParam)) {
        res.status(400).json({ success: false, message: 'Invalid parent folder ID' });
        return;
      }
      const parentFolder = await Folder.findOne({ _id: parentParam, user: userId });
      if (!parentFolder) {
        res.status(404).json({ success: false, message: 'Parent folder not found' });
        return;
      }
      parentFilter = parentParam;
    }

    const [folders, total] = await Promise.all([
      Folder.find({ user: userId, parent: parentFilter }).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Folder.countDocuments({ user: userId, parent: parentFilter }),
    ]);

    const foldersWithSize = await Promise.all(
      folders.map(async (folder) => {
        const size = await calculateFolderSize(folder._id.toString(), userId);
        return { ...folder, totalSize: size };
      })
    );

    res.json({
      success: true,
      data: { folders: foldersWithSize, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/folders/:id - Get folder contents
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid folder ID' });
      return;
    }

    const folder = await Folder.findOne({ _id: id, user: userId });
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }

    const [subfolders, images, totalSize, breadcrumb] = await Promise.all([
      Folder.find({ user: userId, parent: id }).sort({ name: 1 }).lean(),
      Image.find({ user: userId, folder: id }).sort({ name: 1 }).lean(),
      calculateFolderSize(id, userId),
      getFolderBreadcrumb(id, userId),
    ]);

    const subfoldersWithSize = await Promise.all(
      subfolders.map(async (sf) => {
        const size = await calculateFolderSize(sf._id.toString(), userId);
        return { ...sf, totalSize: size };
      })
    );

    res.json({
      success: true,
      data: { folder: { ...folder.toObject(), totalSize }, subfolders: subfoldersWithSize, images, breadcrumb },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/folders/:id/size
router.get('/:id/size', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid folder ID' });
      return;
    }
    const folder = await Folder.findOne({ _id: id, user: userId });
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }
    const totalSize = await calculateFolderSize(id, userId);
    res.json({ success: true, data: { folderId: id, totalSize } });
  } catch (error) {
    next(error);
  }
});

// GET /api/folders/:id/breadcrumb
router.get('/:id/breadcrumb', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid folder ID' });
      return;
    }
    const breadcrumb = await getFolderBreadcrumb(id, userId);
    res.json({ success: true, data: { breadcrumb } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/folders/:id - Rename
router.put(
  '/:id',
  [body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name required')],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }
      const id = req.params.id as string;
      const { name } = req.body;
      const userId = req.userId!;
      if (!isValidObjectId(id)) {
        res.status(400).json({ success: false, message: 'Invalid folder ID' });
        return;
      }
      const folder = await Folder.findOne({ _id: id, user: userId });
      if (!folder) {
        res.status(404).json({ success: false, message: 'Folder not found' });
        return;
      }
      const duplicate = await Folder.findOne({ name, parent: folder.parent, user: userId, _id: { $ne: id } });
      if (duplicate) {
        res.status(409).json({ success: false, message: 'A folder with this name already exists here' });
        return;
      }
      folder.name = name;
      await folder.save();
      res.json({ success: true, message: 'Folder renamed', data: { folder } });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/folders/:id - Cascade delete
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid folder ID' });
      return;
    }
    const folder = await Folder.findOne({ _id: id, user: userId });
    if (!folder) {
      res.status(404).json({ success: false, message: 'Folder not found' });
      return;
    }

    const folderPath = folder.path + folder._id.toString() + '/';
    const descendants = await Folder.find({
      user: userId,
      path: { $regex: `^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
    }).select('_id');

    const allIds = [new mongoose.Types.ObjectId(id), ...descendants.map((f) => f._id)];

    // Delete files from disk
    const imgs = await Image.find({ folder: { $in: allIds }, user: userId }).select('filename');
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    for (const img of imgs) {
      const fp = path.join(uploadDir, img.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await Promise.all([
      Image.deleteMany({ folder: { $in: allIds }, user: userId }),
      Folder.deleteMany({ _id: { $in: allIds }, user: userId }),
    ]);

    if (folder.parent) {
      await invalidateFolderSizeCache(folder.parent.toString(), userId);
    }

    res.json({
      success: true,
      message: 'Folder and contents deleted',
      data: { deletedFolders: allIds.length, deletedImages: imgs.length },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
