import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { initTelegram } from './lib/telegram.js';
import './styles.css';

function applyTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
}

initTelegram();
applyTheme();

// Listen for storage changes (e.g., from another tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'theme') {
    document.documentElement.dataset.theme = e.newValue || 'light';
  }
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
