import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { customAlphabet } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const nameId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${nameId()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export function buildFileUrl(req, filename) {
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  // Protected URL — served via /api/uploads which requires authentication
  return `${base.replace(/\/$/, '')}/api/uploads/${filename}`;
}

export function removeFile(filename) {
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.promises.unlink(filePath).catch(() => {});
}
