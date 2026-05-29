import { useEffect, useState } from 'react';
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
  const [deleting, setDeleting] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);

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
          <span className="tracker-price">{formatMoney(total, tracker.currency)}</span>
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
            onOpenPhoto={setLightboxSrc}
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
        <div className="lightbox" onClick={() => setLightboxSrc(null)}>
          <AuthImg
            src={lightboxSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
