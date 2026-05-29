import express from 'express';
import mongoose from 'mongoose';
import Tracker from '../models/Tracker.js';
import User from '../models/User.js';
import { upload, buildFileUrl, removeFile } from '../lib/upload.js';
import { notifyFollowers } from '../lib/notify.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Apply rate limiting to all tracker routes
router.use(rateLimit({ windowMs: 60000, max: 60 }));

// Helper: is the current user the owner of a tracker?
function isOwner(tracker, user) {
  return String(tracker.owner) === String(user._id);
}

/**
 * GET /api/trackers
 * Returns trackers owned by the user + trackers they follow.
 */
router.get('/', async (req, res) => {
  const owned = await Tracker.find({ owner: req.user._id }).populate('owner', '_id firstName photoUrl').sort('-updatedAt');
  const followed = await Tracker.find({
    followers: req.user._id,
    owner: { $ne: req.user._id },
  }).populate('owner', '_id firstName photoUrl').sort('-updatedAt');

  res.json({
    owned: owned.map((t) => decorate(t, req.user)),
    followed: followed.map((t) => decorate(t, req.user)),
  });
});

/**
 * GET /api/trackers/:id
 */
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const tracker = await Tracker.findById(req.params.id).populate('owner', '_id firstName photoUrl');
  if (!tracker) return res.status(404).json({ error: 'Not found' });

  const allowed =
    isOwner(tracker, req.user) ||
    tracker.followers.some((f) => String(f) === String(req.user._id));

  if (!allowed) {
    return res.status(403).json({ error: 'No access to this tracker' });
  }

  res.json(decorate(tracker, req.user));
});

/**
 * POST /api/trackers
 * Create a new tracker.
 */
router.post('/', async (req, res) => {
  const { title, price, deliveryPrice, currency, stages } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const cleanStages = Array.isArray(stages)
    ? stages
        .filter((s) => s && s.title && s.title.trim())
        .map((s) => ({
          title: s.title.trim(),
          description: s.description?.trim() || '',
          date: s.date ? new Date(s.date) : null,
          completed: Boolean(s.completed),
          photos: [],
        }))
    : [];

  const tracker = await Tracker.create({
    owner: req.user._id,
    title: title.trim(),
    price: Number(price) || 0,
    deliveryPrice:
      deliveryPrice === '' || deliveryPrice == null
        ? null
        : Number(deliveryPrice),
    currency: currency || '₽',
    stages: cleanStages,
    followers: [req.user._id],
  });

  res.status(201).json(decorate(tracker, req.user));
});

/**
 * PUT /api/trackers/:id
 * Update tracker details (owner only).
 */
router.put('/:id', async (req, res) => {
  const tracker = await Tracker.findById(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'Not found' });
  if (!isOwner(tracker, req.user))
    return res.status(403).json({ error: 'Only owner can edit' });

  const { title, price, deliveryPrice, currency, stages } = req.body;

  if (title !== undefined) tracker.title = String(title).trim();
  if (price !== undefined) tracker.price = Number(price) || 0;
  if (deliveryPrice !== undefined)
    tracker.deliveryPrice =
      deliveryPrice === '' || deliveryPrice == null
        ? null
        : Number(deliveryPrice);
  if (currency !== undefined) tracker.currency = currency;

  if (Array.isArray(stages)) {
    // Merge stages, preserving photos for existing stages by _id
    const existingById = new Map(
      tracker.stages.map((s) => [String(s._id), s])
    );
    tracker.stages = stages
      .filter((s) => s && s.title && s.title.trim())
      .map((s) => {
        const prev = s._id ? existingById.get(String(s._id)) : null;
        return {
          ...(prev ? { _id: prev._id } : {}),
          title: s.title.trim(),
          description: s.description?.trim() || '',
          date: s.date ? new Date(s.date) : null,
          completed: Boolean(s.completed),
          photos: prev ? prev.photos : [],
        };
      });
  }

  await tracker.save();
  res.json(decorate(tracker, req.user));
});

/**
 * DELETE /api/trackers/:id  (owner only)
 */
router.delete('/:id', async (req, res) => {
  const tracker = await Tracker.findById(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'Not found' });
  if (!isOwner(tracker, req.user))
    return res.status(403).json({ error: 'Only owner can delete' });

  // Remove all photo files
  tracker.stages.forEach((s) =>
    s.photos.forEach((p) => removeFile(p.filename))
  );

  await tracker.deleteOne();
  await User.updateMany(
    { connectedTrackers: tracker._id },
    { $pull: { connectedTrackers: tracker._id } }
  );

  res.json({ ok: true });
});

/**
 * POST /api/trackers/connect
 * Connect (follow) a tracker by its share code.
 */
router.post('/connect', async (req, res) => {
  const code = (req.body.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const tracker = await Tracker.findOne({ code });
  if (!tracker)
    return res.status(404).json({ error: 'Tracker with this code not found' });

  if (isOwner(tracker, req.user)) {
    return res.json(decorate(tracker, req.user)); // already owner
  }

  const already = tracker.followers.some(
    (f) => String(f) === String(req.user._id)
  );
  if (!already) {
    tracker.followers.push(req.user._id);
    await tracker.save();
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { connectedTrackers: tracker._id } }
    );
  }

  res.json(decorate(tracker, req.user));
});

/**
 * POST /api/trackers/:id/disconnect
 * Stop following a tracker (followers only, not owner).
 */
router.post('/:id/disconnect', async (req, res) => {
  const tracker = await Tracker.findById(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'Not found' });
  if (isOwner(tracker, req.user))
    return res.status(400).json({ error: 'Owner cannot disconnect' });

  tracker.followers = tracker.followers.filter(
    (f) => String(f) !== String(req.user._id)
  );
  await tracker.save();
  await User.updateOne(
    { _id: req.user._id },
    { $pull: { connectedTrackers: tracker._id } }
  );

  res.json({ ok: true });
});

/**
 * PATCH /api/trackers/:id/stages/:stageId/complete
 * Toggle stage completion (owner only).
 */
router.patch('/:id/stages/:stageId/complete', async (req, res) => {
  const tracker = await Tracker.findById(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'Not found' });
  if (!isOwner(tracker, req.user))
    return res.status(403).json({ error: 'Only owner can update stages' });

  const stage = tracker.stages.id(req.params.stageId);
  if (!stage) return res.status(404).json({ error: 'Stage not found' });

  stage.completed = req.body.completed ?? !stage.completed;
  if (stage.completed && !stage.date) stage.date = new Date();
  await tracker.save();

  // Notify followers
  notifyFollowers(
    tracker,
    req.user._id,
    stage.title,
    stage.completed ? 'completed' : 'updated'
  );

  res.json(decorate(tracker, req.user));
});

/**
 * POST /api/trackers/:id/stages/:stageId/photos
 * Upload a photo to a stage (owner only).
 */
router.post(
  '/:id/stages/:stageId/photos',
  upload.single('photo'),
  async (req, res) => {
    const tracker = await Tracker.findById(req.params.id);
    if (!tracker) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({ error: 'Not found' });
    }
    if (!isOwner(tracker, req.user)) {
      if (req.file) removeFile(req.file.filename);
      return res.status(403).json({ error: 'Only owner can add photos' });
    }
    const stage = tracker.stages.id(req.params.stageId);
    if (!stage) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({ error: 'Stage not found' });
    }
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    stage.photos.push({
      url: buildFileUrl(req, req.file.filename),
      filename: req.file.filename,
    });
    await tracker.save();

    // Notify followers about new photo
    notifyFollowers(tracker, req.user._id, stage.title, 'photo_added');

    res.status(201).json(decorate(tracker, req.user));
  }
);

/**
 * DELETE /api/trackers/:id/stages/:stageId/photos/:photoId
 * Remove a photo (owner only).
 */
router.delete(
  '/:id/stages/:stageId/photos/:photoId',
  async (req, res) => {
    const tracker = await Tracker.findById(req.params.id);
    if (!tracker) return res.status(404).json({ error: 'Not found' });
    if (!isOwner(tracker, req.user))
      return res.status(403).json({ error: 'Only owner can remove photos' });

    const stage = tracker.stages.id(req.params.stageId);
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const photo = stage.photos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    removeFile(photo.filename);
    photo.deleteOne();
    await tracker.save();

    res.json(decorate(tracker, req.user));
  }
);

// Attach computed fields useful for the client
function decorate(tracker, user) {
  const obj = tracker.toJSON();
  // owner may be populated (object) or just an ObjectId
  const ownerId = tracker.owner?._id || tracker.owner;
  obj.isOwner = String(ownerId) === String(user._id);
  obj.followersCount = tracker.followers.length;
  if (tracker.populated('owner') && tracker.owner) {
    obj.ownerInfo = {
      id: tracker.owner._id,
      firstName: tracker.owner.firstName,
      photoUrl: tracker.owner.photoUrl || '',
    };
  }
  return obj;
}

export default router;
