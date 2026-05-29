import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatPriceWithSeparatedCurrencies } from '../lib/format.js';
import { haptic, showAlert } from '../lib/telegram.js';
import { showToast } from '../lib/toast.js';
import StageItem from '../components/StageItem.jsx';
import { BackIcon, TrashIcon, EditIcon, PlusIcon } from '../components/Icons.jsx';
import AuthImg from '../components/AuthImg.jsx';

const CURRENCIES = ['₽', '$', '€', '¥', '₸', '₴', '₺', 'kr'];

let tempId = 0;
const newStage = () => ({ _tmp: ++tempId, title: '', description: '', completed: false, photos: [] });

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
  const [editing, setEditing] = useState(false);

  // Edit mode state
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPriceCurrency, setEditPriceCurrency] = useState('₽');
  const [editDeliveryPrice, setEditDeliveryPrice] = useState('');
  const [editDeliveryType, setEditDeliveryType] = useState('total');
  const [editDeliveryCurrency, setEditDeliveryCurrency] = useState('₽');
  const [editWeight, setEditWeight] = useState('');
  const [editStages, setEditStages] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

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

  useEffect(() => { load(); }, [id]);

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

  function openEdit() {
    if (!tracker.isOwner) return;
    setEditTitle(tracker.title || '');
    setEditPrice(tracker.price != null ? String(tracker.price) : '');
    setEditPriceCurrency(tracker.priceCurrency || '₽');
    setEditDeliveryPrice(tracker.deliveryPrice != null ? String(tracker.deliveryPrice) : '');
    setEditDeliveryType(tracker.deliveryPriceType || 'total');
    setEditDeliveryCurrency(tracker.deliveryCurrency || '₽');
    setEditWeight(tracker.weight != null ? String(tracker.weight) : '');
    setEditStages((tracker.stages || []).map((s) => ({ ...s, _tmp: ++tempId })));
    setEditing(true);
  }

  function updateEditStage(idx, patch) {
    setEditStages((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function removeEditStage(idx) {
    haptic('light');
    setEditStages((prev) => prev.filter((_, i) => i !== idx));
  }

  function addEditStage() {
    haptic('light');
    setEditStages((prev) => [...prev, newStage()]);
  }

  async function saveEdit() {
    if (!editTitle.trim()) {
      showAlert('Введите название трекера');
      return;
    }
    const validStages = editStages.filter((s) => s.title.trim());
    setSavingEdit(true);
    try {
      const updated = await api.updateTracker(id, {
        title: editTitle.trim(),
        price: Number(editPrice) || 0,
        priceCurrency: editPriceCurrency,
        deliveryPrice: editDeliveryPrice === '' ? null : Number(editDeliveryPrice),
        deliveryPriceType: editDeliveryType,
        deliveryCurrency: editDeliveryCurrency,
        weight: editWeight === '' ? null : Number(editWeight),
        stages: validStages.map((s) => ({
          ...(s._id ? { _id: s._id } : {}),
          title: s.title.trim(),
          description: s.description.trim(),
          completed: Boolean(s.completed),
        })),
      });
      setTracker(updated);
      setEditing(false);
      showToast('Трекер обновлён');
    } catch (e) {
      showAlert(e.message);
    } finally {
      setSavingEdit(false);
    }
  }

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

  if (error) return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}><BackIcon /> Назад</button>
      <div className="empty"><div className="big">⚠️</div>{error}</div>
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

      {/* Edit mode */}
      {editing ? (
        <div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Название</label>
            <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
          </div>

          <div className="field">
            <label>Цена товара</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type="number" inputMode="decimal" placeholder="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ flex: 1 }} />
              <select className="input" value={editPriceCurrency} onChange={(e) => setEditPriceCurrency(e.target.value)} style={{ width: 72 }}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Стоимость доставки</label>
            <div className="filter-chips" style={{ marginBottom: 8 }}>
              <button type="button" className={`chip ${editDeliveryType === 'total' ? 'active' : ''}`} onClick={() => { haptic('light'); setEditDeliveryType('total'); }}>Итого</button>
              <button type="button" className={`chip ${editDeliveryType === 'perKg' ? 'active' : ''}`} onClick={() => { haptic('light'); setEditDeliveryType('perKg'); }}>За кг</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type="number" inputMode="decimal" placeholder={editDeliveryType === 'perKg' ? 'Цена за кг' : 'Стоимость'} value={editDeliveryPrice} onChange={(e) => setEditDeliveryPrice(e.target.value)} style={{ flex: 1 }} />
              <select className="input" value={editDeliveryCurrency} onChange={(e) => setEditDeliveryCurrency(e.target.value)} style={{ width: 72 }}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {editDeliveryType === 'perKg' && (
              <input className="input" type="number" inputMode="decimal" placeholder="Вес (кг)" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} style={{ marginTop: 8 }} />
            )}
          </div>

          <div className="section-label">Этапы</div>
          {editStages.map((s, idx) => (
            <div className="card" key={s._tmp}>
              <div className="list-meta" style={{ marginTop: 0, marginBottom: 8 }}>
                <strong>Этап {idx + 1}</strong>
                {editStages.length > 1 && (
                  <button className="back-btn" style={{ color: 'var(--red)', margin: 0 }} onClick={() => removeEditStage(idx)}>
                    <TrashIcon /> удалить
                  </button>
                )}
              </div>
              <div className="field">
                <label>Название</label>
                <input className="input" placeholder="Напр. Заказ оформлен" value={s.title} onChange={(e) => updateEditStage(idx, { title: e.target.value })} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Описание (опц.)</label>
                <textarea className="textarea" placeholder="Детали этапа…" value={s.description} onChange={(e) => updateEditStage(idx, { description: e.target.value })} />
              </div>
            </div>
          ))}
          <button className="btn secondary" onClick={addEditStage}><PlusIcon /> Добавить этап</button>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" style={{ flex: 1 }} onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Сохранение…' : '✓ Сохранить'}
            </button>
            <button className="btn secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        /* View mode */
        <div>
          <div className="card" style={{ marginTop: 8 }}>
            <div className="list-meta" style={{ marginTop: 0 }}>
              <strong style={{ fontSize: 17 }}>{tracker.title}</strong>
              {tracker.isOwner && (
                <button className="back-btn" style={{ margin: 0, fontSize: 14 }} onClick={openEdit}>
                  <EditIcon /> ред.
                </button>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="hint">Цена товара:</span>
                  <span>{formatPriceWithSeparatedCurrencies(tracker.price, tracker.priceCurrency, null, 'total', null, null)}</span>
                </div>
                {tracker.deliveryPrice != null && tracker.deliveryPrice > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="hint">Доставка:</span>
                    <span>
                      {tracker.deliveryPriceType === 'perKg'
                        ? `${tracker.deliveryPrice} ${tracker.deliveryCurrency}/кг${tracker.weight ? ` × ${tracker.weight} кг` : ''}`
                        : `${tracker.deliveryPrice.toLocaleString('ru-RU')} ${tracker.deliveryCurrency}`
                      }
                    </span>
                  </div>
                )}
                {(tracker.price > 0 || (tracker.deliveryPrice > 0)) && (
                  <div className="divider" style={{ margin: '8px 0' }} />
                )}
                {(tracker.price > 0 || (tracker.deliveryPrice > 0)) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Итого:</span>
                    <span>
                      {formatPriceWithSeparatedCurrencies(
                        tracker.price, tracker.priceCurrency,
                        tracker.deliveryPrice || 0, tracker.deliveryPriceType,
                        tracker.weight, tracker.deliveryCurrency
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="list-meta" style={{ marginTop: 12 }}>
              <span className="hint">{doneCount} / {stages.length} этапов завершено</span>
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
                  {tracker.isOwner ? 'Нажмите на этап, чтобы увидеть детали и добавить фото' : 'Нажмите на этап, чтобы увидеть детали'}
                </div>
              </>
            )}
          </div>

          {stages.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}>Пока нет этапов</div>
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
                >{tracker.code}</span></span> с тем, кому хотите открыть доступ к трекеру.
              </p>
              <button className="btn danger" onClick={handleDelete} disabled={deleting}>
                <TrashIcon /> Удалить трекер
              </button>
            </>
          ) : (
            <button className="btn secondary" onClick={handleDisconnect}>Отключиться от трекера</button>
          )}
        </div>
      )}

      {/* Lightbox */}
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
              if (dx < 0) setLightboxIndex((i) => (i + 1) % lightboxPhotos.length);
              else setLightboxIndex((i) => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length);
              setZoomed(false);
              touchStartX.current = null;
              haptic('light');
            }
          }}
          onTouchEnd={() => { touchStartX.current = null; touchStartY.current = null; }}
        >
          <button className="lightbox-close" onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); setZoomed(false); }}>×</button>
          {lightboxPhotos.length > 1 && (
            <span className="lightbox-counter">{lightboxIndex + 1} / {lightboxPhotos.length}</span>
          )}
          {lightboxPhotos.length > 1 && !zoomed && (
            <>
              <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length); setZoomed(false); }}>‹</button>
              <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % lightboxPhotos.length); setZoomed(false); }}>›</button>
            </>
          )}
          <div className={`lightbox-img-wrap ${zoomed ? 'zoomed' : ''}`} onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}>
            <AuthImg key={lightboxSrc} src={lightboxSrc} alt="" className="lightbox-img" />
          </div>
          {lightboxPhotos.length > 1 && (
            <div className="lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
              {lightboxPhotos.map((url, i) => (
                <div key={url} className={`lightbox-thumb ${i === lightboxIndex ? 'active' : ''}`} onClick={() => { setLightboxIndex(i); setZoomed(false); }}>
                  <AuthImg src={url} alt="" />
                </div>
              ))}
            </div>
          )}
          <div className="lightbox-hint">{zoomed ? 'Нажмите для выхода из зума' : 'Нажмите на фото для зума'}</div>
        </div>
      )}
    </div>
  );
}