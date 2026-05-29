import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'app-theme';

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;

  // Follow Telegram theme if available
  const tgColorScheme = window.Telegram?.WebApp?.colorScheme;
  if (tgColorScheme) return tgColorScheme;

  // Follow system preference
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();

    const handleThemeChange = () => {
      const newTheme = tg.colorScheme;
      if (newTheme === 'dark' || newTheme === 'light') {
        setThemeState(newTheme);
      }
    };

    tg.onEvent('themeChanged', handleThemeChange);
    return () => tg.offEvent('themeChanged', handleThemeChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((t) => {
    if (t === 'dark' || t === 'light') setThemeState(t);
  }, []);

  return { theme, toggleTheme, setTheme, isDark: theme === 'dark' };
}
