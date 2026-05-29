import User from '../models/User.js';

const BOT_API = 'https://api.telegram.org/bot';

/**
 * Send a Telegram notification to a user.
 * Silently fails if token is missing or request errors.
 */
async function sendTelegramMessage(chatId, text) {
  const token = process.env.BOT_TOKEN;
  if (!token || token === 'your_telegram_bot_token_here') return;
  if (!chatId) return;

  try {
    await fetch(`${BOT_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error('Telegram notify error:', err.message);
  }
}

/**
 * Notify all followers (except excludeUserId) about a tracker stage change.
 *
 * @param {Object} tracker - The tracker document (with followers populated or as ObjectIds)
 * @param {String} excludeUserId - The user who made the change (don't notify them)
 * @param {String} stageName - The name of the stage that changed
 * @param {'completed'|'updated'|'photo_added'} action - What happened
 */
export async function notifyFollowers(tracker, excludeUserId, stageName, action) {
  const followerIds = (tracker.followers || [])
    .map((f) => String(f._id || f))
    .filter((id) => id !== String(excludeUserId));

  if (followerIds.length === 0) return;

  const users = await User.find({
    _id: { $in: followerIds },
    notificationsEnabled: true,
    chatId: { $ne: '' },
  }).select('chatId');

  if (users.length === 0) return;

  const actionText =
    action === 'completed'
      ? 'завершён'
      : action === 'photo_added'
        ? 'добавлено фото'
        : 'обновлён';

  const message =
    `<b>${tracker.title}</b>\n` +
    `Этап «${stageName}» — ${actionText}`;

  // Send in parallel, don't await all (fire and forget)
  users.forEach((u) => sendTelegramMessage(u.chatId, message));
}

/**
 * Notify all followers about a new stage being added to the tracker.
 */
export async function notifyNewStage(tracker, excludeUserId, stageName) {
  const followerIds = (tracker.followers || [])
    .map((f) => String(f._id || f))
    .filter((id) => id !== String(excludeUserId));

  if (followerIds.length === 0) return;

  const users = await User.find({
    _id: { $in: followerIds },
    notificationsEnabled: true,
    chatId: { $ne: '' },
  }).select('chatId');

  if (users.length === 0) return;

  const message =
    `<b>${tracker.title}</b>\n` +
    `Добавлен новый этап: «${stageName}»`;

  users.forEach((u) => sendTelegramMessage(u.chatId, message));
}
