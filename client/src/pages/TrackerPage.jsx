import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatMoney, formatDate } from '../lib/format.js';
import { haptic, showAlert } from '../lib/telegram.js';
import { showToast } from '../lib/toast.js';
import StageItem from '../components/StageItem.jsx';
import { BackIcon, TrashIcon } from '../components/Icons.jsx';
import AuthImg from '../components/AuthImg.jsx';

export default function TrackerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [deliveryPriceInput, setDeliveryPriceInput] = useState('');
  const touchStartX = useRef(null);

  function openEditDelivery() {
    setDeliveryPriceInput(tracker.deliveryPrice != null ? String(tracker.deliveryPrice) : '');
    setEditingPrice(true);
  }

  async function saveDeliveryPrice() {
    haptic('light');
    try {
      const updated = await api.updateTracker(id, {
        deliveryPrice: deliveryPriceInput === '' ? null : Number(deliveryPriceInput),
      });
      setTracker(updated);
      setEditingPrice(false);
    } catch (e) {
      showAlert(e.message);
    }
  }

  async function load() {
    try {
      const res = await api.getTracker(id);
      setTracker(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') {
        const newIdx = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
        setLightboxIndex(newIdx);
        setLightboxSrc(lightboxPhotos[newIdx]);
      } else if (e.key === 'ArrowRight') {
        const newIdx = (lightboxIndex + 1) % lightboxPhotos.length;
        setLightboxIndex(newIdx);
        setLightboxSrc(lightboxPhotos[newIdx]);
      } else if (e.key === 'Escape') {
        setLightboxSrc(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxSrc, lightboxIndex, lightboxPhotos]);

  async function handleToggleComplete(stageId) {
    const stage = tracker.stages.find((s) => String(s._id) === String(stageId));
    if (!stage) return;
    haptic('light');
    try {
      const updated = await api.toggleStage(id, stageId, !stage.completed);
      setTracker(updated);
    } catch (e) {
      showAlert(e.message);
    }
  }

  async function handleAddPhoto(stageId, file) {
    haptic('light');
    try {
      const updated = await api.uploadPhoto(id, stageId, file);
      setTracker(updated);
    } catch (e) {
      showAlert(e.message);
    }
  }

  async function handleDeletePhoto(stageId, photoId) {
    haptic('light');
    try {
      const updated = await api.deletePhoto(id, stageId, photoId);
      setTracker(updated);
    } catch (e) {
      showAlert(e.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Удалить трекер? Это действие необратимо.')) return;
    setDeleting(true);
    try {
      await api.deleteTracker(id);
      haptic('medium');
      navigate('/', { replace: true });
    } catch (e) {
      showAlert(e.message);
      setDeleting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await api.disconnect(id);
      haptic('medium');
      navigate('/');
    } catch (e) {
      showAlert(e.message);
    }
  }

  if (loading) return <div className="spinner" />;

  if (error)
    return (
      <div className="page">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <BackIcon /> Назад
        </button>
        <div className="empty">
          <div className="big">⚠️</div>
          {error}
        </div>
      </div>
    );

  if (!tracker) return null;

  const total = (tracker.price || 0) + (tracker.deliveryPrice || 0);
  const stages = tracker.stages || [];
  const doneCount = stages.filter((s) => s.completed).length;
  const progress = stages.length ? (doneCount / stages.length) * 100 : 0;

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <BackIcon /> Трекеры
      </button>

      <div className="card" style={{ marginTop: 8 }}>
        <div className="list-meta" style={{ marginTop: 0 }}>
          <strong style={{ fontSize: 17 }}>{tracker.title}</strong>
          {editingPrice ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder="Доставка"
                value={deliveryPriceInput}
                onChange={(e) => setDeliveryPriceInput(e.target.value)}
                style={{ width: 80, padding: '6px 10px', fontSize: 14 }}
                autoFocus
              />
              <button className="btn small" onClick={saveDeliveryPrice} style={{ padding: '6px 12px' }}>✓</button>
              <button className="btn small secondary" onClick={() => setEditingPrice(false)} style={{ padding: '6px 12px' }}>✕</button>
            </div>
          ) : (
            <span
              className="tracker-price"
              onClick={tracker.isOwner ? openEditDelivery : undefined}
              style={{ cursor: tracker.isOwner ? 'pointer' : 'default' }}
              title={tracker.isOwner ? 'Нажмите для редактирования' : undefined}
            >
              {formatMoney(total, tracker.currency)}
            </span>
          )}
        </div>

        <div className="list-meta">
          <span className="hint">
            {doneCount} / {stages.length} этапов завершено
          </span>
          {tracker.isOwner && (
            <span className="code-pill-wrap">
              <span
                className={`code-pill hidden ${codeRevealed ? 'revealed' : ''}`}
                onClick={() => {
                  setCodeRevealed(true);
                  navigator.clipboard.writeText(tracker.code);
                  haptic('light');
                  showToast('Скопировано');
                }}
              >{tracker.code}</span>
            </span>
          )}
        </div>

        {stages.length > 0 && (
          <>
            <div className="progress-bar">
              <div style={{ width: `${progress}%` }} />
            </div>
            <div className="hint" style={{ marginTop: 6 }}>
              {tracker.isOwner
                ? 'Нажмите на этап, чтобы увидеть детали и добавить фото'
                : 'Нажмите на этап, чтобы увидеть детали'}
            </div>
          </>
        )}
      </div>

      {stages.length === 0 ? (
        <div className="empty" style={{ padding: '20px 0' }}>
          Пока нет этапов
        </div>
      ) : (
        stages.map((s, i) => (
          <StageItem
            key={s._id}
            stage={s}
            index={i}
            canManage={tracker.isOwner}
            onToggleComplete={handleToggleComplete}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
            onOpenPhoto={(url, photos) => {
              setLightboxPhotos(photos.map(p => p.url));
              setLightboxIndex(photos.findIndex(p => p.url === url));
              setLightboxSrc(url);
            }}
            defaultOpen={i === 0}
          />
        ))
      )}

      <div className="divider" />

      {tracker.isOwner ? (
        <>
          <p className="hint" style={{ marginBottom: 12 }}>
            Поделитесь кодом <span className="code-pill-wrap"><span
              className={`code-pill hidden ${codeRevealed ? 'revealed' : ''}`}
              onClick={() => {
                setCodeRevealed(true);
                navigator.clipboard.writeText(tracker.code);
                haptic('light');
                showToast('Скопировано');
              }}
            >{tracker.code}</span></span> с тем,
            кому хотите открыть доступ к трекеру.
          </p>
          <button
            className="btn danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            <TrashIcon /> Удалить трекер
          </button>
        </>
      ) : (
        <button className="btn secondary" onClick={handleDisconnect}>
          Отключиться от трекера
        </button>
      )}

      {lightboxSrc && (
        <div
          className="lightbox"
          onClick={() => setLightboxSrc(null)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchMove={(e) => {
            if (touchStartX.current === null || lightboxPhotos.length <= 1) return;
            const dx = e.touches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) {
              if (dx < 0) {
                const newIdx = (lightboxIndex + 1) % lightboxPhotos.length;
                setLightboxIndex(newIdx);
                setLightboxSrc(lightboxPhotos[newIdx]);
              } else {
                const newIdx = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
                setLightboxIndex(newIdx);
                setLightboxSrc(lightboxPhotos[newIdx]);
              }
              touchStartX.current = null;
              haptic('light');
            }
          }}
          onTouchEnd={() => { touchStartX.current = null; }}
        >
          <button
            className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
          >
            ×
          </button>
          {lightboxPhotos.length > 1 && (
            <>
              <span className="lightbox-counter">{lightboxIndex + 1} / {lightboxPhotos.length}</span>
              <button
                className="lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIdx = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
                  setLightboxIndex(newIdx);
                  setLightboxSrc(lightboxPhotos[newIdx]);
                }}
              >
                ‹
              </button>
              <button
                className="lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIdx = (lightboxIndex + 1) % lightboxPhotos.length;
                  setLightboxIndex(newIdx);
                  setLightboxSrc(lightboxPhotos[newIdx]);
                }}
              >
                ›
              </button>
            </>
          )}
          <div className="lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            <AuthImg
              src={lightboxSrc}
              alt=""
              onClick={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
