import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { haptic, showAlert } from '../lib/telegram.js';
import StageItem from '../components/StageItem.jsx';
import { PlusIcon, BackIcon, TrashIcon } from '../components/Icons.jsx';

let tempId = 0;
const newStage = () => ({
  _tmp: ++tempId,
  title: '',
  description: '',
  completed: false,
  photos: [],
});

const CURRENCIES = ['₽', '$', '€', '¥', '₸', '₴', '₺', 'kr'];

export default function CreateTrackerPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [deliveryPriceType, setDeliveryPriceType] = useState('total');
  const [weight, setWeight] = useState('');
  const [currency, setCurrency] = useState('₽');
  const [stages, setStages] = useState([newStage()]);
  const [saving, setSaving] = useState(false);

  function updateStage(idx, patch) {
    setStages((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  }
  function removeStage(idx) {
    haptic('light');
    setStages((prev) => prev.filter((_, i) => i !== idx));
  }
  function addStage() {
    haptic('light');
    setStages((prev) => [...prev, newStage()]);
  }

  async function handleSave() {
    if (!title.trim()) {
      showAlert('Введите название трекера');
      return;
    }
    const validStages = stages.filter((s) => s.title.trim());
    setSaving(true);
    try {
      const tracker = await api.createTracker({
        title: title.trim(),
        price: Number(price) || 0,
        deliveryPrice: deliveryPrice === '' ? null : Number(deliveryPrice),
        deliveryPriceType,
        weight: weight === '' ? null : Number(weight),
        currency,
        stages: validStages.map((s) => ({
          title: s.title.trim(),
          description: s.description.trim(),
          completed: s.completed,
        })),
      });
      haptic('medium');
      navigate(`/tracker/${tracker.id || tracker._id}`, { replace: true });
    } catch (e) {
      showAlert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Stages shaped for the live preview component
  const previewStages = stages
    .filter((s) => s.title.trim())
    .map((s) => ({ ...s, _id: s._tmp }));

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <BackIcon /> Назад
      </button>
      <h1 className="page-title">Новый трекер</h1>

      <div className="field">
        <label>Название</label>
        <input
          className="input"
          placeholder="Напр. Кроссовки Nike"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Цена</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ width: 72, flexShrink: 0 }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Доставка</label>
        <div className="filter-chips" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={`chip ${deliveryPriceType === 'total' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setDeliveryPriceType('total'); }}
          >
            Итого
          </button>
          <button
            type="button"
            className={`chip ${deliveryPriceType === 'perKg' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setDeliveryPriceType('perKg'); }}
          >
            За кг
          </button>
        </div>
        <div className="row">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={deliveryPriceType === 'perKg' ? 'Цена за кг' : 'Стоимость'}
            value={deliveryPrice}
            onChange={(e) => setDeliveryPrice(e.target.value)}
          />
          {deliveryPriceType === 'perKg' && (
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="Вес (кг)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="section-label">Этапы</div>
      {stages.map((s, idx) => (
        <div className="card" key={s._tmp}>
          <div className="list-meta" style={{ marginTop: 0, marginBottom: 8 }}>
            <strong>Этап {idx + 1}</strong>
            {stages.length > 1 && (
              <button
                className="back-btn"
                style={{ color: 'var(--red)', margin: 0 }}
                onClick={() => removeStage(idx)}
              >
                <TrashIcon /> удалить
              </button>
            )}
          </div>
          <div className="field">
            <label>Название этапа</label>
            <input
              className="input"
              placeholder="Напр. Заказ оформлен"
              value={s.title}
              onChange={(e) => updateStage(idx, { title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Описание (опц.)</label>
            <textarea
              className="textarea"
              placeholder="Детали этапа…"
              value={s.description}
              onChange={(e) =>
                updateStage(idx, { description: e.target.value })
              }
            />
          </div>
          <div
              className="field"
              style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: 14, color: 'var(--tg-text)' }}>Завершён</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={s.completed}
                  onChange={(e) =>
                    updateStage(idx, { completed: e.target.checked })
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>
        </div>
      ))}

      <button className="btn secondary" onClick={addStage}>
        <PlusIcon /> Добавить этап
      </button>

      {/* Interactive live preview */}
      <div className="section-label">Предпросмотр</div>
      <div className="card">
        <div className="list-meta" style={{ marginTop: 0 }}>
          <strong style={{ fontSize: 15 }}>
            {title || 'Название трекера'}
          </strong>
          {Number(price) > 0 && (
            <span style={{ fontSize: 14, color: 'var(--tg-text)' }}>
              {formatPrice(price, deliveryPrice, deliveryPriceType, weight, currency)}
            </span>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          {previewStages.length === 0 ? (
            <div className="hint">Добавьте этапы, чтобы увидеть превью</div>
          ) : (
            previewStages.map((s, i) => (
              <StageItem key={s._id} stage={s} index={i} />
            ))
          )}
        </div>
      </div>

      <button
        className="btn"
        style={{ marginTop: 8 }}
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? 'Сохранение…' : 'Создать трекер'}
      </button>
    </div>
  );
}
