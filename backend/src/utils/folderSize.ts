import mongoose from 'mongoose';
import Folder, { IFolder } from '../models/Folder';
import Image from '../models/Image';

/**
 * Calculate the total size of a folder including all nested subfolders.
 * Uses materialized path for efficient querying — single DB call for all descendants.
 */
export const calculateFolderSize = async (folderId: string, userId: string): Promise<number> => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) return 0;

  // If cached size is not stale, return it
  if (!folder.sizeStale && folder.cachedSize >= 0) {
    return folder.cachedSize;
  }

  // Get all descendant folder IDs using materialized path
  const folderPath = folder.path + folder._id.toString() + '/';
  const descendantFolders = await Folder.find({
    user: userId,
    path: { $regex: `^${escapeRegex(folderPath)}` },
  }).select('_id');

  const allFolderIds = [
    new mongoose.Types.ObjectId(folderId),
    ...descendantFolders.map((f) => f._id),
  ];

  // Sum all image sizes in one aggregation query
  const result = await Image.aggregate([
    {
      $match: {
        folder: { $in: allFolderIds },
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$size' },
      },
    },
  ]);

  const totalSize = result.length > 0 ? result[0].totalSize : 0;

  // Update cache
  await Folder.updateOne(
    { _id: folderId },
    { cachedSize: totalSize, sizeStale: false }
  );

  return totalSize;
};

/**
 * Invalidate folder size cache for a folder and all its ancestors.
 */
export const invalidateFolderSizeCache = async (folderId: string, userId: string): Promise<void> => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) return;

  // Get all ancestor IDs from the materialized path
  const pathSegments = folder.path.split('/').filter(Boolean);
  const ancestorIds = pathSegments.map((id) => new mongoose.Types.ObjectId(id));

  // Mark current folder and all ancestors as stale
  await Folder.updateMany(
    {
      _id: { $in: [...ancestorIds, folder._id] },
      user: userId,
    },
    { sizeStale: true }
  );
};

/**
 * Get folder breadcrumb (ancestor chain) for navigation.
 */
export const getFolderBreadcrumb = async (
  folderId: string,
  userId: string
): Promise<Array<{ _id: string; name: string }>> => {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) return [];

  const pathSegments = folder.path.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return [{ _id: folder._id.toString(), name: folder.name }];
  }

  const ancestors = await Folder.find({
    _id: { $in: pathSegments },
    user: userId,
  }).select('_id name');

  // Sort ancestors by their position in the path
  const orderedAncestors = pathSegments
    .map((id) => ancestors.find((a) => a._id.toString() === id))
    .filter(Boolean)
    .map((a) => ({ _id: a!._id.toString(), name: a!.name }));

  // Add current folder at the end
  orderedAncestors.push({ _id: folder._id.toString(), name: folder.name });

  return orderedAncestors;
};

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
