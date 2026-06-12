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

## 🤖 MCP Server

Connect Claude Desktop (or any MCP-compatible AI) to Dobby Drive for natural language control — list folders, create nested structures, check sizes, and delete folders via chat.

### Available Tools

| Tool | Description | Example prompt |
|------|-------------|----------------|
| `list_folders` | List folders at any level | "Show me all folders in Projects" |
| `create_folder` | Create a folder at root or nested | "Create a folder called Campaigns inside Projects" |
| `get_folder_size` | Get total recursive size | "How big is the Assets folder?" |
| `delete_folder` | Delete folder and all contents | "Delete the Old folder inside Archive" |

### Build the MCP Server

```bash
cd mcp-server
npm install
npm run build        # outputs to dist/index.js
```

---

### 🪟 Installation — Claude Desktop (Windows Store / MSIX version)

> The standard `mcpServers` config in `claude_desktop_config.json` **does not work** with the Windows Store (MSIX) version of Claude Desktop due to sandbox restrictions. Use the `.dxt` extension method instead.

#### Option A — Double-click install (recommended)

**Step 1: Install the DXT CLI**
```bash
npm install -g @anthropic-ai/dxt
```

**Step 2: Pack the extension**
```bash
cd mcp-server
dxt pack
# outputs: dobby-ads-mcp-server-1.0.0.dxt
```

**Step 3: Install**
Double-click `dobby-ads-mcp-server-1.0.0.dxt` in File Explorer — Claude Desktop will open an install dialog.

**Step 4: Restart Claude Desktop**
Right-click the Claude tray icon → Quit → reopen.

---

#### Option B — Manual install (if double-click doesn't work)

This is a known issue on some Windows setups where `.dxt` file association isn't registered.

**Step 1: Copy files**
```powershell
$extDir = "$env:LOCALAPPDATA\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\Claude Extensions\dobby-drive"
New-Item -ItemType Directory -Path $extDir -Force
Copy-Item -Recurse "mcp-server\dist"         "$extDir\dist"
Copy-Item -Recurse "mcp-server\node_modules" "$extDir\node_modules"
```

**Step 2: Create `manifest.json`** at `$extDir\manifest.json`:
```json
{
  "manifest_version": "0.4",
  "name": "dobby-drive",
  "version": "1.0.0",
  "description": "MCP Server for Dobby Drive - AI-compatible tool server",
  "author": { "name": "your-name" },
  "server": {
    "type": "node",
    "entry_point": "dist/index.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://your-backend/api",
        "AUTH_EMAIL": "demo@dobby.com",
        "AUTH_PASSWORD": "demo123456"
      }
    }
  },
  "license": "MIT"
}
```

**Step 3: Register the extension**
Add the following entry to:
```
%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\extensions-installations.json
```

Inside the `"extensions"` object:
```json
"local.dobby-drive": {
  "id": "local.dobby-drive",
  "version": "1.0.0",
  "hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "installedAt": "2026-01-01T00:00:00.000Z",
  "manifest": {
    "manifest_version": "0.4",
    "name": "dobby-drive",
    "version": "1.0.0",
    "description": "MCP Server for Dobby Drive",
    "author": { "name": "your-name" },
    "server": {
      "type": "node",
      "entry_point": "dist/index.js",
      "mcp_config": {
        "command": "node",
        "args": ["${__dirname}/dist/index.js"],
        "env": {
          "API_BASE_URL": "https://your-backend/api",
          "AUTH_EMAIL": "demo@dobby.com",
          "AUTH_PASSWORD": "demo123456"
        }
      }
    },
    "license": "MIT"
  },
  "signatureInfo": { "status": "unsigned" },
  "source": "local"
}
```

**Step 4: Restart Claude Desktop** and verify by asking: *"Can you access Dobby Drive?"*

---

### 🖥️ Installation — Claude Desktop (Standard .exe installer)

Use the standard `mcpServers` config. The config file is at:
```
%APPDATA%\Claude\claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "dobby-drive": {
      "command": "node",
      "args": ["C:/path/to/mcp-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://your-backend/api",
        "AUTH_EMAIL": "demo@dobby.com",
        "AUTH_PASSWORD": "demo123456"
      }
    }
  }
}
```

Restart Claude Desktop and verify by asking: *"Can you access Dobby Drive?"*

---

### 🍎 Installation — macOS / Linux

Same as the standard `.exe` method above. Config file location:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

---

## 🏗️ Scalability

- **Stateless JWT** — No server sessions, horizontally scalable
- **Materialized Path Pattern** — O(1) ancestor queries, efficient nested folder operations
- **Compound Indexes** — Fast queries on (user, parent), (user, folder)
- **Folder Size Caching** — Cached with dirty-flag invalidation
- **Rate Limiting** — Auth and upload routes protected
- **Connection Pooling** — Mongoose connection pool for MongoDB

## 📝 License

MIT