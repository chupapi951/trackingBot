import crypto from 'crypto';
import User from '../models/User.js';

/**
 * Validates Telegram WebApp initData per the official algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  // Check auth_date is not older than 24 hours (Telegram spec)
  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return null;

  const userRaw = params.get('user');
  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

/**
 * Express middleware that resolves the current user from Telegram initData.
 * Falls back to a dev user if DEV_AUTH=true and no valid initData provided.
 */
export async function authMiddleware(req, res, next) {
  try {
    const initData =
      req.headers['x-telegram-init-data'] || req.query.initData || '';
    const botToken = process.env.BOT_TOKEN;
    const devAuth = process.env.DEV_AUTH === 'true';

    let tgUser = null;

    if (initData && botToken && botToken !== 'your_telegram_bot_token_here') {
      tgUser = validateInitData(initData, botToken);
    }

    // Development fallback: identify user via header, no signature check.
    if (!tgUser && devAuth) {
      const devId = req.headers['x-dev-user-id'] || 'dev-user-1';
      tgUser = {
        id: devId,
        first_name: req.headers['x-dev-user-name'] || 'Dev',
        last_name: '',
        username: 'devuser',
      };
    }

    if (!tgUser) {
      return res.status(401).json({ error: 'Unauthorized: invalid initData' });
    }

    const telegramId = String(tgUser.id);
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = await User.create({
        telegramId,
        firstName: tgUser.first_name || '',
        lastName: tgUser.last_name || '',
        username: tgUser.username || '',
        photoUrl: tgUser.photo_url || '',
        chatId: telegramId, // For private chats, chat_id equals user_id
      });
    } else {
      // Keep profile fresh
      user.firstName = tgUser.first_name ?? user.firstName;
      user.lastName = tgUser.last_name ?? user.lastName;
      user.username = tgUser.username ?? user.username;
      if (tgUser.photo_url) user.photoUrl = tgUser.photo_url;
      if (!user.chatId) user.chatId = telegramId;
      await user.save();
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Auth failure' });
  }
}
