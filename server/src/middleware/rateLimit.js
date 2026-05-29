// Simple in-memory rate limiter (for production use a proper solution like rate-limiter-flexible)
const rateLimitStore = new Map();

export function rateLimit(options = { windowMs: 60000, max: 60 }) {
  const { windowMs, max } = options;
  return (req, res, next) => {
    const key = req.user?._id || req.ip;
    const now = Date.now();
    const record = rateLimitStore.get(key) || { count: 0, reset: now + windowMs };
    if (now > record.reset) {
      record.count = 0;
      record.reset = now + windowMs;
    }
    record.count++;
    rateLimitStore.set(key, record);
    if (record.count > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}