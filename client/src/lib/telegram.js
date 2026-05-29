// Thin wrapper around the Telegram WebApp SDK with safe fallbacks for
// local development outside of Telegram.

export const tg = window.Telegram?.WebApp;

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    // Apply Telegram theme to CSS variables when available
    applyTheme();
    tg.onEvent?.('themeChanged', applyTheme);
  } catch (e) {
    /* noop */
  }
}

function applyTheme() {
  const p = tg?.themeParams;
  if (!p) return;
  const root = document.documentElement;
  const map = {
    '--tg-bg': p.bg_color,
    '--tg-text': p.text_color,
    '--tg-hint': p.hint_color,
    '--tg-link': p.link_color,
    '--tg-button': p.button_color,
    '--tg-button-text': p.button_text_color,
    '--tg-secondary-bg': p.secondary_bg_color,
  };
  Object.entries(map).forEach(([k, v]) => {
    if (v) root.style.setProperty(k, v);
  });
}

export function getInitData() {
  return tg?.initData || '';
}

// In development, return a stable fake telegram id so the dev-auth path works.
export function getDevUserId() {
  let id = localStorage.getItem('dev-user-id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('dev-user-id', id);
  }
  return id;
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}

export function haptic(type = 'light') {
  try {
    tg?.HapticFeedback?.impactOccurred?.(type);
  } catch {
    /* noop */
  }
}

export function showAlert(message) {
  if (tg?.showAlert) tg.showAlert(message);
  else window.alert(message);
}
