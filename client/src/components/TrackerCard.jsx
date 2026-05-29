import { useNavigate } from 'react-router-dom';
import { formatMoney } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';
import { showToast } from '../lib/toast.js';
import { useState } from 'react';

export default function TrackerCard({ tracker }) {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const total = (tracker.price || 0) + (tracker.deliveryPrice || 0);
  const stages = tracker.stages || [];
  const done = stages.filter((s) => s.completed).length;
  const progress = stages.length ? (done / stages.length) * 100 : 0;

  const ownerInfo = tracker.ownerInfo;

  return (
    <div
      className="card tappable"
      onClick={() => {
        haptic('light');
        navigate(`/tracker/${tracker.id || tracker._id}`);
      }}
    >
      <div className="list-meta" style={{ marginTop: 0 }}>
        <strong style={{ fontSize: 15 }}>{tracker.title}</strong>
        <span className="tracker-price">{formatMoney(total, tracker.currency)}</span>
      </div>

      <div className="list-meta">
        <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!tracker.isOwner && ownerInfo && (
            ownerInfo.photoUrl ? (
              <img
                src={ownerInfo.photoUrl}
                alt=""
                style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--tg-secondary-bg)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700
              }}>
                {(ownerInfo.firstName || '?').charAt(0)}
              </span>
            )
          )}
{done} / {stages.length} этапов
        </span>
        {tracker.isOwner ? (
          <span className="code-pill-wrap">
            <span
              className={`code-pill hidden ${revealed ? 'revealed' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setRevealed(true);
                navigator.clipboard.writeText(tracker.code);
                haptic('light');
                showToast('Скопировано');
              }}
            >{tracker.code}</span>
          </span>
        ) : (
          <span className="badge">подключён</span>
        )}
      </div>

      {stages.length > 0 && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
