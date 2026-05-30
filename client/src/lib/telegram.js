import { init, miniApp, viewport, themeParams, initData, hapticFeedback, popup, on, isTMA } from '@telegram-apps/sdk';

let initialized = false;

export function initTelegram() {
  if (initialized) return;
  try {
    init();
    viewport.expand();
    miniApp.ready();
    initialized = true;
  } catch (e) {
    /* noop */
  }
}

export function applyTheme() {
  const p = themeParams.state;
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

on('theme_changed', applyTheme);

export function getInitData() {
  if (!isTMA()) return '';
  return initData.raw() || '';
}

export function getDevUserId() {
  let id = localStorage.getItem('dev-user-id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('dev-user-id', id);
  }
  return id;
}

export function getTelegramUser() {
  if (!isTMA()) return null;
  return initData.user() || null;
}

export function haptic(type = 'light') {
  try {
    const style = type === 'light' ? 'light' : type === 'medium' ? 'medium' : 'heavy';
    hapticFeedback.impactOccurred(style);
  } catch {
    /* noop */
  }
}

export function showAlert(message) {
  try {
    if (isTMA()) {
      popup.show({ message });
    } else {
      window.alert(message);
    }
  } catch {
    window.alert(message);
  }
}
