import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatPriceWithSeparatedCurrencies } from '../lib/format.js';
import { haptic, showAlert } from '../lib/telegram.js';
import { showToast } from '../lib/toast.js';
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
  const [priceCurrency, setPriceCurrency] = useState('₽');
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [deliveryPriceType, setDeliveryPriceType] = useState('total');
  const [deliveryCurrency, setDeliveryCurrency] = useState('₽');
  const [weight, setWeight] = useState('');
  const [stages, setStages] = useState([newStage()]);
  const [saving, setSaving] = useState(false);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);

  useEffect(() => {
    api.getTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  function applyTemplate(tpl) {
    haptic('medium');
    setPriceCurrency(tpl.priceCurrency || tpl.currency || '₽');
    setDeliveryCurrency(tpl.deliveryCurrency || tpl.currency || '₽');
    setDeliveryPriceType(tpl.deliveryPriceType || 'total');
    setDeliveryPrice('');
    setWeight('');
    if (tpl.stages && tpl.stages.length > 0) {
      setStages(tpl.stages.map((s) => ({
        _tmp: ++tempId,
        title: s.title,
        description: s.description || '',
        completed: false,
        photos: [],
      })));
    }
    setShowTemplates(false);
    showToast(`Шаблон «${tpl.name}» применён`);
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      showAlert('Введите название шаблона');
      return;
    }
    setSavingTemplate(true);
    try {
      const validStages = stages.filter((s) => s.title.trim());
      const tpl = await api.createTemplate({
        name: templateName.trim(),
        priceCurrency,
        deliveryCurrency,
        deliveryPriceType,
        stages: validStages.map((s) => ({
          title: s.title.trim(),
          description: s.description.trim(),
        })),
      });
      setTemplates((prev) => [tpl, ...prev]);
      setShowSaveTemplate(false);
      setTemplateName('');
      showToast('Шаблон сохранён');
    } catch (e) {
      showAlert(e.message);
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(e, tplId) {
    e.stopPropagation();
    haptic('medium');
    setDeletingTemplate(tplId);
    try {
      await api.deleteTemplate(tplId);
      setTemplates((prev) => prev.filter((t) => (t.id || t._id) !== tplId));
      showToast('Шаблон удалён');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setDeletingTemplate(null);
    }
  }

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
        priceCurrency,
        deliveryPrice: deliveryPrice === '' ? null : Number(deliveryPrice),
        deliveryPriceType,
        deliveryCurrency,
        weight: weight === '' ? null : Number(weight),
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
      <h1 className="page-title" style={{ margin: '8px 0 12px' }}>Новый трекер</h1>
      <button
        className="btn"
        style={{ marginBottom: 12 }}
        onClick={() => setShowTemplates(true)}
      >
        📋 Шаблоны
      </button>

      <div className="field">
        <label>Название</label>
        <input
          className="input"
          placeholder="Напр. Кроссовки Nike"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Price + Currency */}
      <div className="field">
        <label>Цена товара</label>
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
            value={priceCurrency}
            onChange={(e) => setPriceCurrency(e.target.value)}
            style={{ width: 72, flexShrink: 0 }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Delivery */}
      <div className="field">
        <label>Стоимость доставки</label>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={deliveryPriceType === 'perKg' ? 'Цена за кг' : 'Стоимость'}
            value={deliveryPrice}
            onChange={(e) => setDeliveryPrice(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="input"
            value={deliveryCurrency}
            onChange={(e) => setDeliveryCurrency(e.target.value)}
            style={{ width: 72, flexShrink: 0 }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {deliveryPriceType === 'perKg' && (
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="Вес (кг)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
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
          {(Number(price) > 0 || Number(deliveryPrice) > 0) && (
            <span style={{ fontSize: 14, color: 'var(--tg-text)' }}>
              {formatPriceWithSeparatedCurrencies(price, priceCurrency, deliveryPrice, deliveryPriceType, weight, deliveryCurrency)}
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

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn"
          style={{ flex: 1 }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Сохранение…' : 'Создать трекер'}
        </button>
        <button
          className="btn secondary"
          style={{ width: 'auto', padding: '14px 16px' }}
          onClick={() => setShowSaveTemplate(true)}
          title="Сохранить как шаблон"
        >
          💾
        </button>
      </div>

      {/* Templates modal */}
      {showTemplates && (
        <div className="modal-backdrop" onClick={() => setShowTemplates(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Шаблоны трекеров</h3>
            {templates.length === 0 ? (
              <p className="hint" style={{ marginTop: 0 }}>
                Шаблонов пока нет. Создайте трекер и сохраните его как шаблон (кнопка 💾).
              </p>
            ) : (
              <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: 12 }}>
                {templates.map((tpl) => {
                  const tid = tpl.id || tpl._id;
                  return (
                    <div
                      key={tid}
                      className="card tappable"
                      style={{ marginBottom: 8 }}
                      onClick={() => applyTemplate(tpl)}
                    >
                      <div className="list-meta" style={{ marginTop: 0 }}>
                        <div>
                          <strong style={{ fontSize: 14 }}>{tpl.name}</strong>
                          <div className="hint" style={{ marginTop: 2 }}>
                            {tpl.stages?.length || 0} эт. · {tpl.priceCurrency || '₽'}
                            {tpl.deliveryCurrency && tpl.deliveryCurrency !== (tpl.priceCurrency || '₽') ? ` / ${tpl.deliveryCurrency}` : ''}
                            {tpl.deliveryPriceType === 'perKg' ? ' · за кг' : ''}
                          </div>
                        </div>
                        <button
                          className="btn small danger"
                          style={{ width: 'auto', padding: '4px 10px' }}
                          disabled={deletingTemplate === tid}
                          onClick={(e) => handleDeleteTemplate(e, tid)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button className="btn secondary" onClick={() => setShowTemplates(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Save as template modal */}
      {showSaveTemplate && (
        <div className="modal-backdrop" onClick={() => setShowSaveTemplate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Сохранить как шаблон</h3>
            <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
              Шаблон сохранит этапы, валюту и тип доставки. Цена не сохраняется.
            </p>
            <div className="field">
              <label>Название шаблона</label>
              <input
                className="input"
                placeholder="Напр. Одежда из Китая"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <button
              className="btn"
              disabled={savingTemplate || !templateName.trim()}
              onClick={handleSaveTemplate}
            >
              {savingTemplate ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              className="btn secondary"
              style={{ marginTop: 8 }}
              onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
