import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  parent: mongoose.Types.ObjectId | null;
  user: mongoose.Types.ObjectId;
  path: string; // Materialized path: "/parentId/grandparentId/"
  depth: number;
  cachedSize: number;
  sizeStale: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      minlength: [1, 'Folder name cannot be empty'],
      maxlength: [255, 'Folder name cannot exceed 255 characters'],
      validate: {
        validator: function (v: string) {
          // No slashes, backslashes, or control characters
          return !/[\/\\<>:"|?*\x00-\x1f]/.test(v);
        },
        message: 'Folder name contains invalid characters',
      },
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    path: {
      type: String,
      default: '/',
    },
    depth: {
      type: Number,
      default: 0,
      max: [10, 'Maximum folder nesting depth is 10 levels'],
    },
    cachedSize: {
      type: Number,
      default: 0,
    },
    sizeStale: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performance
folderSchema.index({ user: 1, parent: 1 });
folderSchema.index({ user: 1, name: 1, parent: 1 }, { unique: true });
folderSchema.index({ path: 1 });
folderSchema.index({ user: 1, path: 1 });

// Handle duplicate folder name error
folderSchema.post('save', function (error: any, doc: any, next: any) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('A folder with this name already exists in this location'));
  } else {
    next(error);
  }
});

const Folder = mongoose.model<IFolder>('Folder', folderSchema);
export default Folder;
