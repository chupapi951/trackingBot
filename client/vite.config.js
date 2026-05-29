import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const env = loadEnv('', process.cwd(), '');
const apiUrl = env.VITE_API_URL || 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': apiUrl,
      '/uploads': apiUrl,
    },
  },
});
