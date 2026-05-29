import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import { authMiddleware } from './middleware/auth.js';
import trackersRouter from './routes/trackers.js';
import profileRouter from './routes/profile.js';
import uploadsRouter from './routes/uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tracking_bot';

// Production CORS: restrict to known origins
const allowedOrigin = process.env.PUBLIC_URL || null;
const corsOptions =
  process.env.DEV_AUTH === 'true' || !allowedOrigin
    ? { origin: true, credentials: true }
    : {
        origin: (origin, cb) => {
          if (!origin || origin === allowedOrigin) cb(null, true);
          else cb(new Error('Not allowed by CORS'));
        },
        credentials: true,
      };
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

// Health check (no auth required)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// All API routes require an authenticated user
app.use('/api', authMiddleware);
app.use('/api/trackers', trackersRouter);
app.use('/api/profile', profileRouter);

// Protected uploads — sits under /api so authMiddleware runs first
app.use('/api/uploads', uploadsRouter);

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message || 'Server error' });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
