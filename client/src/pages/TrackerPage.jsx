import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatMoney, formatPrice } from '../lib/format.js';
import { haptic, showAlert } from '../lib/telegram.js';
import { showToast } from '../lib/toast.js';
import StageItem from '../components/StageItem.jsx';
import { BackIcon, TrashIcon } from '../components/Icons.jsx';
import AuthImg from '../components/AuthImg.jsx';

const CURRENCIES = ['₽', '$', '€', '¥', '₸', '₴', '₺', 'kr'];

export default function TrackerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [deliveryPriceInput, setDeliveryPriceInput] = useState('');
  const [deliveryTypeInput, setDeliveryTypeInput] = useState('total');
  const [weightInput, setWeightInput] = useState('');
  const [currencyInput, setCurrencyInput] = useState('₽');
  const [savingPrice, setSavingPrice] = useState(false);
  // Lightbox zoom/pan
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  function openEditPrice() {
    setPriceInput(tracker.price != null ? String(tracker.price) : '0');
    setDeliveryPriceInput(tracker.deliveryPrice != null ? String(tracker.deliveryPrice) : '');
    setDeliveryTypeInput(tracker.deliveryPriceType || 'total');
    setWeightInput(tracker.weight != null ? String(tracker.weight) : '');
    setCurrencyInput(tracker.currency || '₽');
    setEditingPrice(true);
  }

  async function savePrice() {
    haptic('light');
    setSavingPrice(true);
    try {
      const updated = await api.updateTracker(id, {
        price: Number(priceInput) || 0,
        deliveryPrice: deliveryPriceInput === '' ? null : Number(deliveryPriceInput),
        deliveryPriceType: deliveryTypeInput,
        weight: weightInput === '' ? null : Number(weightInput),
        currency: currencyInput,
      });
      setTracker(updated);
      setEditingPrice(false);
      showToast('Цена обновлена');
    } catch (e) {
      showAlert(e.message);
    } finally {
      setSavingPrice(false);
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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length);
        setZoomed(false);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => (i + 1) % lightboxPhotos.length);
        setZoomed(false);
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
        setZoomed(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, lightboxPhotos.length]);

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

  const stages = tracker.stages || [];
  const doneCount = stages.filter((s) => s.completed).length;
  const progress = stages.length ? (doneCount / stages.length) * 100 : 0;
  const lightboxSrc = lightboxIndex !== null ? lightboxPhotos[lightboxIndex] : null;

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <BackIcon /> Трекеры
      </button>

      <div className="card" style={{ marginTop: 8 }}>
        <div className="list-meta" style={{ marginTop: 0 }}>
          <strong style={{ fontSize: 17 }}>{tracker.title}</strong>
          {!editingPrice && (
            <span
              onClick={tracker.isOwner ? openEditPrice : undefined}
              style={{ cursor: tracker.isOwner ? 'pointer' : 'default', fontSize: 14 }}
              title={tracker.isOwner ? 'Нажмите для редактирования' : undefined}
            >
              {formatPrice(
                tracker.price,
                tracker.deliveryPrice,
                tracker.deliveryPriceType,
                tracker.weight,
                tracker.currency
              )}
            </span>
          )}
        </div>

        {editingPrice && (
          <div className="price-editor" style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Цена</label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Валюта</label>
                <select
                  className="input"
                  value={currencyInput}
                  onChange={(e) => setCurrencyInput(e.target.value)}
                  style={{ width: 72 }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 8 }}>
              <label>Тип доставки</label>
              <div className="filter-chips" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className={`chip ${deliveryTypeInput === 'total' ? 'active' : ''}`}
                  onClick={() => { haptic('light'); setDeliveryTypeInput('total'); }}
                >
                  Итого
                </button>
                <button
                  type="button"
                  className={`chip ${deliveryTypeInput === 'perKg' ? 'active' : ''}`}
                  onClick={() => { haptic('light'); setDeliveryTypeInput('perKg'); }}
                >
                  За кг
                </button>
              </div>
            </div>

            <div className="row" style={{ marginBottom: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Доставка</label>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  placeholder={deliveryTypeInput === 'perKg' ? 'Цена за кг' : 'Стоимость'}
                  value={deliveryPriceInput}
                  onChange={(e) => setDeliveryPriceInput(e.target.value)}
                />
              </div>
              {deliveryTypeInput === 'perKg' && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Вес (кг)</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={savePrice}
                disabled={savingPrice}
              >
                {savingPrice ? 'Сохранение…' : '✓ Сохранить'}
              </button>
              <button
                className="btn secondary"
                style={{ flex: 1 }}
                onClick={() => setEditingPrice(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

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
              setZoomed(false);
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

      {/* Improved Lightbox */}
      {lightboxSrc && (
        <div
          className="lightbox"
          onClick={() => {
            if (zoomed) setZoomed(false);
            else { setLightboxIndex(null); setZoomed(false); }
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
          }}
          onTouchMove={(e) => {
            if (touchStartX.current === null || lightboxPhotos.length <= 1 || zoomed) return;
            const dx = e.touches[0].clientX - touchStartX.current;
            const dy = Math.abs(e.touches[0].clientY - (touchStartY.current || 0));
            if (Math.abs(dx) > 50 && dy < 40) {
              if (dx < 0) {
                setLightboxIndex((i) => (i + 1) % lightboxPhotos.length);
              } else {
                setLightboxIndex((i) => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length);
              }
              setZoomed(false);
              touchStartX.current = null;
              haptic('light');
            }
          }}
          onTouchEnd={() => {
            touchStartX.current = null;
            touchStartY.current = null;
          }}
        >
          {/* Close button */}
          <button
            className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); setZoomed(false); }}
          >
            ×
          </button>

          {/* Counter */}
          {lightboxPhotos.length > 1 && (
            <span className="lightbox-counter">
              {lightboxIndex + 1} / {lightboxPhotos.length}
            </span>
          )}

          {/* Nav arrows */}
          {lightboxPhotos.length > 1 && !zoomed && (
            <>
              <button
                className="lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length);
                  setZoomed(false);
                }}
              >
                ‹
              </button>
              <button
                className="lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i + 1) % lightboxPhotos.length);
                  setZoomed(false);
                }}
              >
                ›
              </button>
            </>
          )}

          {/* Main image */}
          <div
            className={`lightbox-img-wrap ${zoomed ? 'zoomed' : ''}`}
            onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
          >
            <AuthImg
              key={lightboxSrc}
              src={lightboxSrc}
              alt=""
              className="lightbox-img"
            />
          </div>

          {/* Thumbnail strip */}
          {lightboxPhotos.length > 1 && (
            <div className="lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
              {lightboxPhotos.map((url, i) => (
                <div
                  key={url}
                  className={`lightbox-thumb ${i === lightboxIndex ? 'active' : ''}`}
                  onClick={() => { setLightboxIndex(i); setZoomed(false); }}
                >
                  <AuthImg src={url} alt="" />
                </div>
              ))}
            </div>
          )}

          {/* Zoom hint */}
          <div className="lightbox-hint">
            {zoomed ? 'Нажмите для выхода из зума' : 'Нажмите на фото для зума'}
          </div>
        </div>
      )}
    </div>
  );
}
