import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';
import { PlusIcon } from '../components/Icons.jsx';
import Analytics from '../components/Analytics.jsx';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getProfile()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="page">
        <div className="empty">
          <div className="big">&#9888;&#65039;</div>
          {error}
        </div>
      </div>
    );

  if (!data) return <div className="spinner" />;

  const { user, stats } = data;
  const initials = (user.displayName || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="page">
      <h1 className="page-title">Профиль</h1>

      <div className="profile-head">
        {user.photoUrl ? (
          <img className="avatar" src={user.photoUrl} alt="" />
        ) : (
          <div className="avatar avatar-fallback">{initials}</div>
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {user.displayName}
          </div>
          {user.username && (
            <div className="hint">@{user.username}</div>
          )}
        </div>
      </div>

      <button
        className="btn"
        onClick={() => {
          haptic('light');
          navigate('/create');
        }}
      >
        <PlusIcon /> Создать трекер
      </button>

      <div className="section-label">Настройки</div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>Уведомления</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={user.notificationsEnabled !== false}
            onChange={(e) => {
              const newVal = e.target.checked;
              haptic('light');
              setData((prev) => ({
                ...prev,
                user: { ...prev.user, notificationsEnabled: newVal },
              }));
              api.setNotifications(newVal).catch(() => {
                // Revert on failure
                setData((prev) => ({
                  ...prev,
                  user: { ...prev.user, notificationsEnabled: !newVal },
                }));
              });
            }}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="section-label">Статистика</div>
      <div className="stats-grid">
        <div className="stat">
          <div className="value">{stats.ownedCount}</div>
          <div className="label">Создано трекеров</div>
        </div>
        <div className="stat">
          <div className="value">{stats.followedCount}</div>
          <div className="label">Отслеживается</div>
        </div>
        <div className="stat">
          <div className="value">
            {stats.completedStages}/{stats.totalStages}
          </div>
          <div className="label">Этапов завершено</div>
        </div>
        <div className="stat">
          <div className="value">{stats.totalPhotos}</div>
          <div className="label">Фотографий</div>
        </div>
        <div className="stat" style={{ gridColumn: '1 / -1' }}>
          <div className="value">{formatMoney(stats.totalValue)}</div>
          <div className="label">Общая стоимость заказов</div>
        </div>
      </div>

      <div className="section-label">Аналитика</div>
      <Analytics />
    </div>
  );
}
