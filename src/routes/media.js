import multer from 'multer';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadToCloudStorage } from '../services/storage.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 250 } });
export const mediaRouter = Router();

mediaRouter.post('/upload', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const uploaded = await uploadToCloudStorage(req.file);
  res.status(201).json(uploaded);
}));
