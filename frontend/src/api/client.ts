import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Folders API
export const foldersAPI = {
  list: (parent?: string) =>
    api.get('/folders', { params: { parent: parent || 'root' } }),
  get: (id: string) => api.get(`/folders/${id}`),
  create: (data: { name: string; parentId?: string | null }) =>
    api.post('/folders', data),
  rename: (id: string, name: string) =>
    api.put(`/folders/${id}`, { name }),
  delete: (id: string) => api.delete(`/folders/${id}`),
  size: (id: string) => api.get(`/folders/${id}/size`),
  breadcrumb: (id: string) => api.get(`/folders/${id}/breadcrumb`),
};

// Images API
export const imagesAPI = {
  upload: (formData: FormData) =>
    api.post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadMulti: (formData: FormData) =>
    api.post('/images/multi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  get: (id: string) => api.get(`/images/${id}`),
  getFileUrl: (filename: string) =>
    `${API_BASE_URL}/images/${filename}/file`,
  delete: (id: string) => api.delete(`/images/${id}`),
};

export default api;
