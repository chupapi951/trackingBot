import { getInitData, getDevUserId, getTelegramUser } from './telegram.js';

function authHeaders() {
  const headers = {};
  const initData = getInitData();
  if (initData) {
    headers['x-telegram-init-data'] = initData;
  } else {
    // Development fallback (server must run with DEV_AUTH=true)
    headers['x-dev-user-id'] = getDevUserId();
    const u = getTelegramUser();
    if (u?.first_name) headers['x-dev-user-name'] = u.first_name;
  }
  return headers;
}

const API_URL = import.meta.env.VITE_API_URL || '';
console.log('API_URL:', API_URL);

async function request(method, path, body, isForm = false) {
  const headers = authHeaders();
  const opts = { method, headers };

  if (body != null) {
    if (isForm) {
      opts.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const url = API_URL ? `${API_URL}/api${path}` : `/api${path}`;
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getProfile: () => request('GET', '/profile'),
  getAnalytics: () => request('GET', '/profile/analytics'),
  setNotifications: (enabled) =>
    request('PATCH', '/profile/notifications', { enabled }),

  getTrackers: () => request('GET', '/trackers'),
  getTracker: (id) => request('GET', `/trackers/${id}`),
  createTracker: (payload) => request('POST', '/trackers', payload),
  updateTracker: (id, payload) => request('PUT', `/trackers/${id}`, payload),
  deleteTracker: (id) => request('DELETE', `/trackers/${id}`),

  connect: (code) => request('POST', '/trackers/connect', { code }),
  disconnect: (id) => request('POST', `/trackers/${id}/disconnect`),

  toggleStage: (id, stageId, completed) =>
    request('PATCH', `/trackers/${id}/stages/${stageId}/complete`, {
      completed,
    }),

  uploadPhoto: (id, stageId, file) => {
    const form = new FormData();
    form.append('photo', file);
    return request(
      'POST',
      `/trackers/${id}/stages/${stageId}/photos`,
      form,
      true
    );
  },

  deletePhoto: (id, stageId, photoId) =>
    request('DELETE', `/trackers/${id}/stages/${stageId}/photos/${photoId}`),
};
