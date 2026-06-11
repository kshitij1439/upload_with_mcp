# Dobby Drive — Smart Cloud Storage

A full-stack web application for managing images in nested folders, similar to Google Drive. Built for the Dobby Ads Full Stack Developer Assignment.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=nodedotjs)
![React](https://img.shields.io/badge/React-18+-blue?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)

## 🚀 Features

- **🔐 Authentication** — Signup, Login, Logout with JWT tokens (no Firebase)
- **📁 Nested Folders** — Create unlimited nested folders (up to 10 levels deep), just like Google Drive
- **📊 Folder Size** — Each folder displays total size including all nested sub-folders and images
- **🖼️ Image Upload** — Drag & drop image upload with preview (supports JPG, PNG, GIF, WebP, SVG, BMP)
- **🔒 User Isolation** — Users can only see their own folders and images
- **🤖 MCP Server (Bonus)** — AI assistant integration via Model Context Protocol

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js, Express.js, TypeScript |
| Frontend | React 18, TypeScript, Vite |
| Database | MongoDB with Mongoose ODM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File Upload | Multer |
| MCP | @modelcontextprotocol/sdk |

## 📦 Project Structure

```
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── middleware/    # Auth, upload, error handling
│   │   ├── models/       # Mongoose schemas (User, Folder, Image)
│   │   ├── routes/       # API route handlers
│   │   ├── utils/        # Folder size calculation, helpers
│   │   └── server.ts     # Express app entry point
│   └── uploads/          # Uploaded images (gitignored)
├── frontend/             # React + Vite SPA
│   ├── src/
│   │   ├── api/          # Axios client with JWT interceptor
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # Auth context provider
│   │   └── pages/        # Login, Signup, Dashboard
│   └── index.html
├── mcp-server/           # MCP tool server (bonus)
│   └── src/index.ts      # MCP tools for AI assistants
└── README.md
```

## 🏃 Running Locally

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
git clone <repo-url>
cd dobby-drive

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# (Optional) Install MCP server
cd ../mcp-server && npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dobby-ads
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Start Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## 🔑 Demo Credentials

```
Email: demo@dobby.com
Password: demo123456
```

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user profile |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/folders` | Create folder (with optional parentId) |
| GET | `/api/folders?parent=root` | List root folders |
| GET | `/api/folders/:id` | Get folder contents |
| GET | `/api/folders/:id/size` | Get recursive folder size |
| GET | `/api/folders/:id/breadcrumb` | Get breadcrumb path |
| PUT | `/api/folders/:id` | Rename folder |
| DELETE | `/api/folders/:id` | Delete folder (cascade) |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/images` | Upload image (multipart) |
| GET | `/api/images/:id` | Get image metadata |
| GET | `/api/images/:filename/file` | Serve image file |
| DELETE | `/api/images/:id` | Delete image |

## 🤖 MCP Server (Bonus)

Connect Claude Desktop (or any MCP-compatible AI) to Dobby Drive:

### Claude Desktop Config (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "dobby-drive": {
      "command": "npx",
      "args": ["tsx", "path/to/mcp-server/src/index.ts"],
      "env": {
        "API_BASE_URL": "http://localhost:5000/api",
        "AUTH_EMAIL": "demo@dobby.com",
        "AUTH_PASSWORD": "demo123456"
      }
    }
  }
}
```

### Available MCP Tools:
- **create_folder** — Create a folder (e.g., "Create a folder called Campaigns inside Projects")
- **list_folders** — List folders at any level
- **get_folder_size** — Get total folder size
- **delete_folder** — Delete a folder and its contents

## 🏗️ Scalability

- **Stateless JWT** — No server sessions, horizontally scalable
- **Materialized Path Pattern** — O(1) ancestor queries, efficient nested folder operations
- **Compound Indexes** — Fast queries on (user, parent), (user, folder)
- **Folder Size Caching** — Cached with dirty-flag invalidation
- **Rate Limiting** — Auth and upload routes protected
- **Connection Pooling** — Mongoose connection pool for MongoDB

## 📝 License

MIT
