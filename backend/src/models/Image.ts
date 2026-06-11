import mongoose, { Document, Schema } from 'mongoose';

export interface IImage extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cloudinaryId: string;
  folder: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IImage>(
  {
    name: {
      type: String,
      required: [true, 'Image name is required'],
      trim: true,
      minlength: [1, 'Image name cannot be empty'],
      maxlength: [255, 'Image name cannot exceed 255 characters'],
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: {
        values: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'],
        message: 'Invalid image type: {VALUE}',
      },
    },
    size: {
      type: Number,
      required: true,
      min: [1, 'File size must be greater than 0'],
    },
    url: {
      type: String,
      default: '',
    },
    cloudinaryId: {
      type: String,
      default: '',
    },
    folder: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      required: [true, 'Folder is required'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
imageSchema.index({ user: 1, folder: 1 });
imageSchema.index({ folder: 1 });

const Image = mongoose.model<IImage>('Image', imageSchema);
export default Image;
