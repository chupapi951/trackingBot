import { useRef, useState } from 'react';
import { ChevronDown, TrashIcon } from './Icons.jsx';
import { formatDate } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';
import AuthImg from './AuthImg.jsx';

/**
 * Renders a single stage with collapsible body (description + photos).
 * Used both in the create-preview (read-only photos) and on the tracker page.
 *
 * Props:
 *  - stage: { _id, title, description, date, completed, photos[] }
 *  - index
 *  - canManage: owner can toggle completion / add / delete photos
 *  - onToggleComplete(stageId)
 *  - onAddPhoto(stageId, file)
 *  - onDeletePhoto(stageId, photoId)
 *  - onOpenPhoto(url)
 *  - defaultOpen
 */
export default function StageItem({
  stage,
  index,
  canManage = false,
  onToggleComplete,
  onAddPhoto,
  onDeletePhoto,
  onOpenPhoto,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const fileRef = useRef(null);
  const photos = stage.photos || [];
  const hasBody = stage.description || photos.length > 0 || canManage;

  const toggle = () => {
    haptic('light');
    setOpen((o) => !o);
  };

  return (
    <div className="stage">
      <div className="stage-head" onClick={hasBody ? toggle : undefined}>
        <div className={`stage-dot ${stage.completed ? 'done' : ''}`}>
          {stage.completed ? '✓' : index + 1}
        </div>
        <div className="stage-info">
          <div className="stage-title">{stage.title || 'Без названия'}</div>
          {stage.date && (
            <div className="stage-date">{formatDate(stage.date)}</div>
          )}
        </div>
        {photos.length > 0 && (
          <span className="badge" style={{ marginRight: 4 }}>
            {photos.length} фото
          </span>
        )}
        {hasBody && <ChevronDown className={`chevron ${open ? 'open' : ''}`} />}
      </div>

      {open && hasBody && (
        <div className="stage-body">
          {stage.description && (
            <div className="stage-desc">{stage.description}</div>
          )}

          {(photos.length > 0 || canManage) && (
            <div className="photo-grid">
              {photos.map((p) => (
                <div className="photo-wrap" key={p._id || p.url}>
                  <AuthImg
                    src={p.url}
                    alt=""
                    onClick={() => onOpenPhoto?.(p.url)}
                  />
                  {canManage && onDeletePhoto && (
                    <button
                      className="photo-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePhoto(stage._id, p._id);
                      }}
                      aria-label="Удалить фото"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {canManage && onAddPhoto && (
                <>
                  <div
                    className="add-photo"
                    onClick={() => fileRef.current?.click()}
                  >
                    +
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onAddPhoto(stage._id, file);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
            </div>
          )}

          {canManage && onToggleComplete && (
            <button
              className="btn small secondary"
              style={{ marginTop: 12 }}
              onClick={() => onToggleComplete(stage._id)}
            >
              {stage.completed ? 'Отметить незавершённым' : 'Отметить завершённым'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
