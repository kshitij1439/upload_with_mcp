import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const AUTH_EMAIL = process.env.AUTH_EMAIL || '';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '';

let api: AxiosInstance;
let authToken: string | null = null;

/**
 * Authenticate with the Dobby Drive API and get a JWT token.
 */
async function ensureAuth(): Promise<void> {
  if (authToken) return;

  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: AUTH_EMAIL,
      password: AUTH_PASSWORD,
    });
    authToken = response.data.data.token;
    api = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${authToken}` },
    });
  } catch (error: any) {
    throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Find a folder by name within a parent folder.
 */
async function findFolderByName(
  name: string,
  parentId: string | null
): Promise<any | null> {
  await ensureAuth();
  const parent = parentId || 'root';
  const response = await api.get('/folders', { params: { parent } });
  const folders = response.data.data.folders;
  return folders.find((f: any) => f.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Resolve a folder path like "Projects/Campaigns" to a folder ID.
 */
async function resolveFolderPath(path: string): Promise<string | null> {
  const parts = path.split('/').filter(Boolean);
  let currentParentId: string | null = null;

  for (const part of parts) {
    const folder = await findFolderByName(part, currentParentId);
    if (!folder) return null;
    currentParentId = folder._id;
  }

  return currentParentId;
}

// Create MCP Server
const server = new McpServer({
  name: 'dobby-drive',
  version: '1.0.0',
});

// Tool: Create Folder
server.tool(
  'create_folder',
  'Create a new folder in Dobby Drive. You can specify a parent folder path for nested folders.',
  {
    name: z.string().describe('Name of the folder to create'),
    parentPath: z
      .string()
      .optional()
      .describe('Path to the parent folder (e.g., "Projects/Campaigns"). Leave empty for root level.'),
  } as any,
  async (args: any) => {
    const { name, parentPath } = args;
    try {
      await ensureAuth();

      let parentId: string | null = null;
      if (parentPath) {
        parentId = await resolveFolderPath(parentPath);
        if (!parentId) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ Parent folder "${parentPath}" not found. Please create it first.`,
              },
            ],
          };
        }
      }

      const response = await api.post('/folders', { name, parentId });
      const folder = response.data.data.folder;

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Folder "${folder.name}" created successfully${parentPath ? ` inside "${parentPath}"` : ' at root level'}.\nFolder ID: ${folder._id}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Error: ${error.response?.data?.message || error.message}`,
          },
        ],
      };
    }
  }
);

// Tool: List Folders
server.tool(
  'list_folders',
  'List folders in Dobby Drive. Optionally specify a parent folder path.',
  {
    parentPath: z
      .string()
      .optional()
      .describe('Path to the parent folder. Leave empty for root level.'),
  } as any,
  async (args: any) => {
    const { parentPath } = args;
    try {
      await ensureAuth();

      let parent = 'root';
      if (parentPath) {
        const folderId = await resolveFolderPath(parentPath);
        if (!folderId) {
          return {
            content: [{ type: 'text' as const, text: `❌ Folder "${parentPath}" not found.` }],
          };
        }
        parent = folderId;
      }

      const response = await api.get('/folders', { params: { parent } });
      const folders = response.data.data.folders;

      if (folders.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `📁 No folders found${parentPath ? ` in "${parentPath}"` : ' at root level'}.`,
            },
          ],
        };
      }

      const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      const list = folders
        .map((f: any) => `  📁 ${f.name} (${formatSize(f.totalSize || 0)})`)
        .join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `📂 Folders${parentPath ? ` in "${parentPath}"` : ' (root)'}:\n${list}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          { type: 'text' as const, text: `❌ Error: ${error.response?.data?.message || error.message}` },
        ],
      };
    }
  }
);

// Tool: Get Folder Size
server.tool(
  'get_folder_size',
  'Get the total size of a folder including all nested folders and images.',
  {
    folderPath: z.string().describe('Path to the folder (e.g., "Projects/Campaigns")'),
  } as any,
  async (args: any) => {
    const { folderPath } = args;
    try {
      await ensureAuth();

      const folderId = await resolveFolderPath(folderPath);
      if (!folderId) {
        return {
          content: [{ type: 'text' as const, text: `❌ Folder "${folderPath}" not found.` }],
        };
      }

      const response = await api.get(`/folders/${folderId}/size`);
      const { totalSize } = response.data.data;

      const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: `📊 Folder "${folderPath}" total size: ${formatSize(totalSize)} (${totalSize.toLocaleString()} bytes)`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          { type: 'text' as const, text: `❌ Error: ${error.response?.data?.message || error.message}` },
        ],
      };
    }
  }
);

// Tool: Delete Folder
server.tool(
  'delete_folder',
  'Delete a folder and all its contents from Dobby Drive.',
  {
    folderPath: z.string().describe('Path to the folder to delete (e.g., "Projects/Old")'),
  } as any,
  async (args: any) => {
    const { folderPath } = args;
    try {
      await ensureAuth();

      const folderId = await resolveFolderPath(folderPath);
      if (!folderId) {
        return {
          content: [{ type: 'text' as const, text: `❌ Folder "${folderPath}" not found.` }],
        };
      }

      const response = await api.delete(`/folders/${folderId}`);
      const { deletedFolders, deletedImages } = response.data.data;

      return {
        content: [
          {
            type: 'text' as const,
            text: `🗑️ Deleted "${folderPath}" — ${deletedFolders} folder(s) and ${deletedImages} image(s) removed.`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          { type: 'text' as const, text: `❌ Error: ${error.response?.data?.message || error.message}` },
        ],
      };
    }
  }
);

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🤖 Dobby Drive MCP Server running on stdio');
}

main().catch(console.error);
