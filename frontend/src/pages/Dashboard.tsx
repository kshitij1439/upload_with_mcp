import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { foldersAPI, imagesAPI } from '../api/client';
import Navbar from '../components/Navbar';
import Breadcrumb from '../components/Breadcrumb';
import FolderCard from '../components/FolderCard';
import ImageCard from '../components/ImageCard';
import CreateFolderModal from '../components/CreateFolderModal';
import UploadImageModal from '../components/UploadImageModal';
import { FolderPlus, Upload, FolderOpen, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface FolderItem {
  _id: string;
  name: string;
  totalSize: number;
  parent: string | null;
}

interface ImageItem {
  _id: string;
  name: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface BreadcrumbItem {
  _id: string;
  name: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('My Drive');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadImage, setShowUploadImage] = useState(false);

  const loadContents = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      if (folderId) {
        // Load folder contents
        const response = await foldersAPI.get(folderId);
        const data = response.data.data;
        setFolders(data.subfolders || []);
        setImages(data.images || []);
        setBreadcrumb(data.breadcrumb || []);
        setCurrentFolderName(data.folder?.name || 'Folder');
      } else {
        // Load root
        const response = await foldersAPI.list('root');
        setFolders(response.data.data.folders || []);
        setImages([]);
        setBreadcrumb([]);
        setCurrentFolderName('My Drive');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load contents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContents(currentFolderId);
  }, [currentFolderId, loadContents]);

  const handleNavigateFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = async (name: string) => {
    await foldersAPI.create({ name, parentId: currentFolderId });
    toast.success(`Folder "${name}" created!`);
    loadContents(currentFolderId);
  };

  const handleUploadImages = async (files: File[], names: string[]) => {
    if (!currentFolderId) {
      toast.error('Please navigate into a folder first to upload images');
      return;
    }

    const formData = new FormData();
    formData.append('folderId', currentFolderId);
    files.forEach((file) => {
      formData.append('images', file);
    });
    names.forEach((name) => {
      formData.append('names', name);
    });

    await imagesAPI.uploadMulti(formData);
    toast.success(`${files.length} image(s) uploaded!`);
    loadContents(currentFolderId);
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`Delete folder "${folderName}" and all its contents? This cannot be undone.`)) {
      return;
    }

    try {
      await foldersAPI.delete(folderId);
      toast.success(`Folder "${folderName}" deleted`);
      loadContents(currentFolderId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete folder');
    }
  };

  const handleDeleteImage = async (imageId: string, imageName: string) => {
    if (!window.confirm(`Delete image "${imageName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await imagesAPI.delete(imageId);
      toast.success(`Image "${imageName}" deleted`);
      loadContents(currentFolderId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete image');
    }
  };

  return (
    <div>
      <Navbar />

      <div className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <Breadcrumb items={breadcrumb} onNavigate={handleNavigateFolder} />
          <div className="dashboard-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCreateFolder(true)}
              id="create-folder-btn"
            >
              <FolderPlus size={16} />
              New Folder
            </button>
            {currentFolderId && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowUploadImage(true)}
                id="upload-image-btn"
              >
                <Upload size={16} />
                Upload Image
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="content-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        ) : (
          <>
            {/* Folders Section */}
            {folders.length > 0 && (
              <>
                <div className="section-header">
                  <FolderOpen size={16} color="var(--text-muted)" />
                  <span className="section-title">Folders</span>
                  <span className="section-count">{folders.length}</span>
                </div>
                <div className="content-grid">
                  {folders.map((folder) => (
                    <FolderCard
                      key={folder._id}
                      id={folder._id}
                      name={folder.name}
                      totalSize={folder.totalSize}
                      onClick={() => handleNavigateFolder(folder._id)}
                      onDelete={() => handleDeleteFolder(folder._id, folder.name)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Images Section */}
            {images.length > 0 && (
              <>
                <div className="section-header">
                  <ImageIcon size={16} color="var(--text-muted)" />
                  <span className="section-title">Images</span>
                  <span className="section-count">{images.length}</span>
                </div>
                <div className="content-grid">
                  {images.map((image) => (
                    <ImageCard
                      key={image._id}
                      id={image._id}
                      name={image.name}
                      size={image.size}
                      filename={image.filename}
                      mimeType={image.mimeType}
                      apiBaseUrl={API_BASE}
                      token={token}
                      onDelete={() => handleDeleteImage(image._id, image.name)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {folders.length === 0 && images.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FolderOpen size={64} />
                </div>
                <h3 className="empty-state-title">
                  {currentFolderId ? 'This folder is empty' : 'No folders yet'}
                </h3>
                <p className="empty-state-text">
                  {currentFolderId
                    ? 'Upload images or create subfolders to get started'
                    : 'Create your first folder to start organizing your images'}
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateFolder(true)}
                  >
                    <FolderPlus size={16} />
                    Create Folder
                  </button>
                  {currentFolderId && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowUploadImage(true)}
                    >
                      <Upload size={16} />
                      Upload Image
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={handleCreateFolder}
        parentName={currentFolderId ? currentFolderName : undefined}
      />

      <UploadImageModal
        isOpen={showUploadImage}
        onClose={() => setShowUploadImage(false)}
        onUpload={handleUploadImages}
        folderName={currentFolderName}
      />
    </div>
  );
};

export default Dashboard;
