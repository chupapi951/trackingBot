import express from 'express';
import path from 'path';
import fs from 'fs';
import Tracker from '../models/Tracker.js';
import { UPLOAD_DIR } from '../lib/upload.js';

const router = express.Router();

/**
 * GET /api/uploads/:filename
 * Serves a photo only if the authenticated user owns or follows the tracker it belongs to.
 */
router.get('/:filename', async (req, res) => {
  const { filename } = req.params;

  // Basic path traversal guard
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const tracker = await Tracker.findOne({ 'stages.photos.filename': filename });

  if (!tracker) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Check access: owner or follower
  const userId = String(req.user._id);
  const isOwner = String(tracker.owner) === userId;
  const isFollower = tracker.followers.some((f) => String(f) === userId);

  if (!isOwner && !isFollower) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

export default router;
