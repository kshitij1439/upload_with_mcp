import React, { useState } from 'react';
import { Trash2, X, Image as ImageIcon } from 'lucide-react';

interface ImageCardProps {
  id: string;
  name: string;
  size: number;
  filename: string;
  mimeType: string;
  apiBaseUrl: string;
  token: string | null;
  onDelete: (e: React.MouseEvent) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const ImageCard: React.FC<ImageCardProps> = ({ id, name, size, filename, apiBaseUrl, token, onDelete }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = `${apiBaseUrl}/images/${filename}/file`;

  return (
    <>
      <div className="image-card" id={`image-${id}`}>
        <div className="image-card-actions">
          <button
            className="image-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            title="Delete image"
            id={`delete-image-${id}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
        {!imgError ? (
          <img
            className="image-card-thumb"
            src={imageUrl}
            alt={name}
            onClick={() => setShowPreview(true)}
            onError={() => setImgError(true)}
            style={{ cursor: 'pointer' }}
            crossOrigin="anonymous"
          />
        ) : (
          <div
            className="image-card-thumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass)',
            }}
          >
            <ImageIcon size={32} color="var(--text-muted)" />
          </div>
        )}
        <div className="image-card-info">
          <div className="image-card-name" title={name}>{name}</div>
          <div className="image-card-size">{formatSize(size)}</div>
        </div>
      </div>

      {showPreview && (
        <div className="image-preview-overlay" onClick={() => setShowPreview(false)}>
          <button className="image-preview-close" onClick={() => setShowPreview(false)}>
            <X size={20} />
          </button>
          <img
            className="image-preview-content"
            src={imageUrl}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            crossOrigin="anonymous"
          />
        </div>
      )}
    </>
  );
};

export default ImageCard;
