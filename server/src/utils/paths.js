import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_ROOT = path.resolve(__dirname, '../..');
export const UPLOAD_DIR = path.join(SERVER_ROOT, 'uploads');

export function ensureUploadDirectory() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function publicUploadPath(filename) {
  return `/uploads/${filename}`;
}

export function uploadPublicPathToFileUrl(publicPath) {
  const cleanPath = publicPath.replace(/^\/+/, '');
  const filename = path.basename(cleanPath.replace(/^uploads\//, ''));
  return pathToFileURL(path.join(UPLOAD_DIR, filename)).href;
}
