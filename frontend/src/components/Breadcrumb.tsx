import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  _id: string;
  name: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onNavigate }) => {
  return (
    <div className="breadcrumb">
      <div className="breadcrumb-item">
        <span className="breadcrumb-link" onClick={() => onNavigate(null)} id="breadcrumb-root">
          <Home size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
          My Drive
        </span>
      </div>

      {items.map((item, index) => (
        <div className="breadcrumb-item" key={item._id}>
          <ChevronRight size={14} className="breadcrumb-separator" />
          {index === items.length - 1 ? (
            <span className="breadcrumb-current">{item.name}</span>
          ) : (
            <span
              className="breadcrumb-link"
              onClick={() => onNavigate(item._id)}
              id={`breadcrumb-${item._id}`}
            >
              {item.name}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default Breadcrumb;
