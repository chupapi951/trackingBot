import express from 'express';
import Tracker from '../models/Tracker.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.use(rateLimit({ windowMs: 60000, max: 60 }));

/**
 * GET /api/profile
 * Returns the current user and account statistics.
 */
router.get('/', async (req, res) => {
  const user = req.user;

  const owned = await Tracker.find({ owner: user._id });
  const connectedTrackerIds = user.connectedTrackers || [];
  const connectedTrackers = await Tracker.find({ _id: { $in: connectedTrackerIds } });
  const followedCount = connectedTrackers.filter(t => String(t.owner) !== String(user._id)).length;

  let totalStages = 0;
  let completedStages = 0;
  let totalPhotos = 0;
  let totalValue = 0;

  owned.forEach((t) => {
    totalStages += t.stages.length;
    completedStages += t.stages.filter((s) => s.completed).length;
    totalPhotos += t.stages.reduce((acc, s) => acc + s.photos.length, 0);
    totalValue += (t.price || 0) + (t.deliveryPrice || 0);
  });

  res.json({
    user: {
      id: user._id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      photoUrl: user.photoUrl,
      displayName: user.displayName,
      createdAt: user.createdAt,
      notificationsEnabled: user.notificationsEnabled,
    },
    stats: {
      ownedCount: owned.length,
      followedCount,
      totalStages,
      completedStages,
      totalPhotos,
      totalValue,
    },
  });
});

/**
 * GET /api/profile/analytics
 * Returns stage completion time analytics:
 * - durations between consecutive stages (in days)
 * - average / median stage duration
 * - per-tracker breakdown for chart
 */
router.get('/analytics', async (req, res) => {
  const owned = await Tracker.find({ owner: req.user._id });

  const allDurations = []; // durations in days between stages
  const perTracker = []; // { title, avgDays }

  owned.forEach((t) => {
    const stages = t.stages || [];
    const datesOnly = stages
      .filter((s) => s.date)
      .map((s) => new Date(s.date).getTime())
      .sort((a, b) => a - b);

    if (datesOnly.length < 2) {
      perTracker.push({ title: t.title, avgDays: 0, stages: stages.length });
      return;
    }

    const durations = [];
    for (let i = 1; i < datesOnly.length; i++) {
      const days = (datesOnly[i] - datesOnly[i - 1]) / (1000 * 60 * 60 * 24);
      durations.push(Math.round(days * 10) / 10);
    }
    allDurations.push(...durations);

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    perTracker.push({
      title: t.title,
      avgDays: Math.round(avg * 10) / 10,
      stages: stages.length,
    });
  });

  // Sort for median
  const sorted = [...allDurations].sort((a, b) => a - b);
  const median =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
  const average =
    allDurations.length === 0
      ? 0
      : Math.round(
          (allDurations.reduce((a, b) => a + b, 0) / allDurations.length) * 10
        ) / 10;

  res.json({
    totalDataPoints: allDurations.length,
    averageDays: average,
    medianDays: Math.round(median * 10) / 10,
    perTracker,
  });
});

/**
 * PATCH /api/profile/notifications
 * Toggle notifications for the user.
 */
router.patch('/notifications', async (req, res) => {
  const { enabled } = req.body;
  req.user.notificationsEnabled = Boolean(enabled);
  await req.user.save();
  res.json({ notificationsEnabled: req.user.notificationsEnabled });
});

export default router;
