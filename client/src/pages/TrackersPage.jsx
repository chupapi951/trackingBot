import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api.js';
import { haptic, showAlert } from '../lib/telegram.js';
import TrackerCard from '../components/TrackerCard.jsx';
import { LinkIcon } from '../components/Icons.jsx';

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'owned', label: 'Мои' },
  { key: 'followed', label: 'Отслеживаемые' },
];

const SORT_OPTIONS = [
  { key: 'updated', label: 'По обновлению' },
  { key: 'name', label: 'По названию' },
  { key: 'progress', label: 'По прогрессу' },
];

export default function TrackersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [code, setCode] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Search & filter state
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated');

  async function load() {
    try {
      setError('');
      const res = await api.getTrackers();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConnect() {
    if (!code.trim()) return;
    setConnecting(true);
    try {
      await api.connect(code.trim());
      haptic('medium');
      setShowConnect(false);
      setCode('');
      setLoading(true);
      await load();
    } catch (e) {
      showAlert(e.message);
    } finally {
      setConnecting(false);
    }
  }

  // Combine, filter, sort
  const trackers = useMemo(() => {
    if (!data) return [];
    let list = [];
    if (filter === 'all' || filter === 'owned') list.push(...(data.owned || []));
    if (filter === 'all' || filter === 'followed') list.push(...(data.followed || []));

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.code && t.code.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title, 'ru');
      if (sortBy === 'progress') {
        const pa = a.stages?.length ? a.stages.filter((s) => s.completed).length / a.stages.length : 0;
        const pb = b.stages?.length ? b.stages.filter((s) => s.completed).length / b.stages.length : 0;
        return pb - pa;
      }
      // 'updated' — default descending by updatedAt
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    return list;
  }, [data, search, filter, sortBy]);

  if (loading) return <div className="spinner" />;

  if (error)
    return (
      <div className="page">
        <div className="empty">
          <div className="big">&#9888;&#65039;</div>
          {error}
        </div>
      </div>
    );

  const owned = data?.owned || [];
  const followed = data?.followed || [];
  const isEmpty = owned.length === 0 && followed.length === 0;

  return (
    <div className="page">
      <h1 className="page-title">Мои трекеры</h1>

      <button className="btn" onClick={() => setShowConnect(true)}>
        <LinkIcon /> Подключиться к трекеру
      </button>

      {!isEmpty && (
        <>
          {/* Search bar */}
          <div className="search-bar" style={{ marginTop: 14 }}>
            <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Поиск по названию или коду…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter chips */}
          <div className="filter-chips">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`chip ${filter === f.key ? 'active' : ''}`}
                onClick={() => { haptic('light'); setFilter(f.key); }}
              >
                {f.label}
              </button>
            ))}
            <span style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                className={`chip ${sortBy === s.key ? 'active' : ''}`}
                onClick={() => { haptic('light'); setSortBy(s.key); }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {isEmpty && (
        <div className="empty">
          <div className="big">&#128230;</div>
          Пока нет трекеров.
          <br />
          Создайте свой в профиле или подключитесь по коду.
        </div>
      )}

      {!isEmpty && trackers.length === 0 && (
        <div className="empty" style={{ padding: '20px 0' }}>
          Ничего не найдено
        </div>
      )}

      {trackers.map((t) => (
        <TrackerCard key={t.id || t._id} tracker={t} />
      ))}

      {showConnect && (
        <div className="modal-backdrop" onClick={() => setShowConnect(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Подключиться к трекеру</h3>
            <p className="hint" style={{ marginTop: 0 }}>
              Введите код трекера, которым с вами поделились.
            </p>
            <div className="field">
              <input
                className="input"
                placeholder="Напр. A1B2C3"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
              />
            </div>
            <button
              className="btn"
              disabled={connecting || !code.trim()}
              onClick={handleConnect}
            >
              {connecting ? 'Подключение…' : 'Подключиться'}
            </button>
            <button
              className="btn secondary"
              style={{ marginTop: 8 }}
              onClick={() => setShowConnect(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
