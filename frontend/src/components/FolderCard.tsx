import React from 'react';
import { Folder, Trash2 } from 'lucide-react';

interface FolderCardProps {
  id: string;
  name: string;
  totalSize: number;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FolderCard: React.FC<FolderCardProps> = ({ id, name, totalSize, onClick, onDelete }) => {
  return (
    <div className="folder-card" onClick={onClick} id={`folder-${id}`}>
      <div className="folder-card-actions">
        <button
          className="folder-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          title="Delete folder"
          id={`delete-folder-${id}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="folder-card-icon">
        <Folder size={24} />
      </div>
      <div className="folder-card-name" title={name}>
        {name}
      </div>
      <div className="folder-card-size">{formatSize(totalSize)}</div>
    </div>
  );
};

export default FolderCard;
