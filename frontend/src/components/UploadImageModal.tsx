import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

interface UploadImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], names: string[]) => Promise<void>;
  folderName: string;
}

interface SelectedFile {
  id: string;
  file: File;
  name: string;
  preview: string;
}

const UploadImageModal: React.FC<UploadImageModalProps> = ({ isOpen, onClose, onUpload, folderName }) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError('');
    
    const newFiles: SelectedFile[] = acceptedFiles.map((file) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: nameWithoutExt,
        preview: URL.createObjectURL(file),
      };
    });

    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > 10) {
        setError('Maximum 10 files can be uploaded at once');
        return combined.slice(0, 10);
      }
      return combined;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'],
    },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (rejections) => {
      const rejection = rejections[0];
      if (rejection?.errors[0]?.code === 'file-too-large') {
        setError('One or more files exceed 10MB limit');
      } else if (rejection?.errors[0]?.code === 'file-invalid-type') {
        setError('Only image files are allowed');
      } else {
        setError('Some files could not be added');
      }
    },
  });

  if (!isOpen) return null;

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleNameChange = (id: string, newName: string) => {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedFiles.length === 0) {
      setError('Please select at least one image file');
      return;
    }

    const hasEmptyName = selectedFiles.some((f) => !f.name.trim());
    if (hasEmptyName) {
      setError('All images must have a name');
      return;
    }

    setLoading(true);
    try {
      const files = selectedFiles.map((f) => f.file);
      const names = selectedFiles.map((f) => f.name.trim());
      await onUpload(files, names);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload images');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    setError('');
    onClose();
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Upload size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Upload Images
          </h3>
          <button className="modal-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Uploading to: <strong style={{ color: 'var(--text-secondary)' }}>{folderName}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
            id="image-dropzone"
            style={{ marginBottom: '1.5rem' }}
          >
            <input {...getInputProps()} />
            <div className="dropzone-icon">
              <ImageIcon size={40} />
            </div>
            <p className="dropzone-text">
              {isDragActive ? 'Drop your images here...' : 'Drag & drop images, or click to browse'}
            </p>
            <p className="dropzone-hint">Select up to 10 images • Supports: JPG, PNG, GIF, WebP, SVG, BMP • Max 10MB each</p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Files to Upload ({selectedFiles.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedFiles.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <img
                      src={fileItem.preview}
                      alt="Thumbnail"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={fileItem.name}
                        onChange={(e) => handleNameChange(fileItem.id, e.target.value)}
                        placeholder="Image name"
                        style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatSize(fileItem.file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(fileItem.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || selectedFiles.length === 0}
            >
              {loading ? 'Uploading...' : `Upload ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadImageModal;
