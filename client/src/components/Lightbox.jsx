import { useEffect, useRef, useCallback } from 'react';
import { getInitData, getDevUserId } from '../lib/telegram.js';
import { haptic } from '../lib/telegram.js';

function authHeaders() {
  const initData = getInitData();
  if (initData) return { 'x-telegram-init-data': initData };
  return { 'x-dev-user-id': getDevUserId() };
}

/**
 * Full-screen lightbox with real pinch-to-zoom and pan.
 * All transform state is held in refs — no React re-renders during gestures.
 *
 * Props:
 *   photos    – string[]  list of URLs
 *   index     – number    current index
 *   onClose   – () => void
 *   onChange  – (newIndex: number) => void
 */
export default function Lightbox({ photos, index, onClose, onChange }) {
  const backdropRef = useRef(null);
  const imgWrapRef  = useRef(null);
  const imgRef      = useRef(null);
  const thumbsRef   = useRef(null);

  // Blob URL cache so we never re-fetch the same photo
  const blobCache   = useRef({});   // url -> blobUrl
  const revokeSet   = useRef(new Set());

  // Gesture state — all refs, no setState
  const scale       = useRef(1);
  const tx          = useRef(0);    // translateX in screen px
  const ty          = useRef(0);    // translateY in screen px

  // Touch tracking
  const prevDist    = useRef(null);
  const prevMidX    = useRef(0);
  const prevMidY    = useRef(0);
  const singleStart = useRef(null); // { x, y } for single-finger swipe/pan
  const singleMoved = useRef(false);
  const lastTap     = useRef(0);

  // ─── helpers ─────────────────────────────────────────────────────────────

  function applyTransform(animated = false) {
    const el = imgRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 0.25s ease' : 'none';
    el.style.transform  = `translate(${tx.current}px, ${ty.current}px) scale(${scale.current})`;
  }

  function resetTransform(animated = true) {
    scale.current = 1;
    tx.current    = 0;
    ty.current    = 0;
    applyTransform(animated);
  }

  function clampPan() {
    if (!imgRef.current || !imgWrapRef.current) return;
    const s   = scale.current;
    if (s <= 1) { tx.current = 0; ty.current = 0; return; }
    const img = imgRef.current.getBoundingClientRect();
    const box = imgWrapRef.current.getBoundingClientRect();
    const maxX = Math.max(0, (img.width  * s - box.width)  / 2 / s);
    const maxY = Math.max(0, (img.height * s - box.height) / 2 / s);
    tx.current = Math.max(-maxX, Math.min(maxX, tx.current));
    ty.current = Math.max(-maxY, Math.min(maxY, ty.current));
  }

  // ─── load photo into <img> element ───────────────────────────────────────

  const loadPhoto = useCallback((url) => {
    if (!url || !imgRef.current) return;

    if (blobCache.current[url]) {
      imgRef.current.src = blobCache.current[url];
      imgRef.current.style.opacity = '1';
      return;
    }

    imgRef.current.style.opacity = '0.4';
    fetch(url, { headers: authHeaders() })
      .then((r) => r.ok ? r.blob() : null)
      .then((blob) => {
        if (!blob) return;
        const bu = URL.createObjectURL(blob);
        blobCache.current[url] = bu;
        revokeSet.current.add(bu);
        if (imgRef.current) {
          imgRef.current.src = bu;
          imgRef.current.style.opacity = '1';
        }
      })
      .catch(() => {});
  }, []);

  // ─── load current photo whenever index changes ───────────────────────────

  useEffect(() => {
    if (!photos[index]) return;
    resetTransform(false);
    loadPhoto(photos[index]);

    // Pre-fetch neighbours
    if (photos[index - 1]) loadNeighbour(photos[index - 1]);
    if (photos[index + 1]) loadNeighbour(photos[index + 1]);

    // Scroll active thumb into view
    if (thumbsRef.current) {
      const active = thumbsRef.current.querySelector('.active');
      if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [index, photos]);

  function loadNeighbour(url) {
    if (blobCache.current[url]) return;
    fetch(url, { headers: authHeaders() })
      .then((r) => r.ok ? r.blob() : null)
      .then((blob) => {
        if (!blob) return;
        const bu = URL.createObjectURL(blob);
        blobCache.current[url] = bu;
        revokeSet.current.add(bu);
      })
      .catch(() => {});
  }

  // ─── keyboard nav ────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')       { onClose(); }
      else if (e.key === 'ArrowLeft')  { go(-1); }
      else if (e.key === 'ArrowRight') { go(+1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, photos.length]);

  // ─── cleanup blobs on unmount ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      revokeSet.current.forEach((bu) => URL.revokeObjectURL(bu));
      revokeSet.current.clear();
      blobCache.current = {};
    };
  }, []);

  // ─── navigation ──────────────────────────────────────────────────────────

  function go(dir) {
    const next = index + dir;
    if (next < 0 || next >= photos.length) return;
    resetTransform(false);
    onChange(next);
    haptic('light');
  }

  // ─── touch handlers ──────────────────────────────────────────────────────

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      // Start pinch
      prevDist.current = dist(e.touches);
      const mid = midpoint(e.touches);
      prevMidX.current = mid.x;
      prevMidY.current = mid.y;
      singleStart.current = null;
    } else if (e.touches.length === 1) {
      singleStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      singleMoved.current = false;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 2 && prevDist.current !== null) {
      const d    = dist(e.touches);
      const mid  = midpoint(e.touches);
      const ds   = d / prevDist.current;

      const newScale = Math.min(Math.max(scale.current * ds, 0.8), 6);

      // Translate so the midpoint stays fixed
      const dmx = mid.x - prevMidX.current;
      const dmy = mid.y - prevMidY.current;

      scale.current  = newScale;
      tx.current     = tx.current * ds + dmx;
      ty.current     = ty.current * ds + dmy;

      prevDist.current = d;
      prevMidX.current = mid.x;
      prevMidY.current = mid.y;

      applyTransform(false);

    } else if (e.touches.length === 1 && singleStart.current) {
      const dx = e.touches[0].clientX - singleStart.current.x;
      const dy = e.touches[0].clientY - singleStart.current.y;

      if (scale.current > 1) {
        // Pan mode
        tx.current += dx;
        ty.current += dy;
        singleStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        applyTransform(false);
        singleMoved.current = true;
      } else {
        // Swipe to navigate — only horizontal
        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
          singleMoved.current = true;
        }
      }
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) {
      prevDist.current = null;
    }

    // Snap scale: if released near 1 — reset
    if (e.touches.length === 0) {
      if (scale.current < 1.1) {
        resetTransform(true);
      } else {
        clampPan();
        applyTransform(true);
      }

      // Swipe navigation — only when not zoomed
      if (scale.current <= 1.1 && singleStart.current && singleMoved.current) {
        const dx = (e.changedTouches[0]?.clientX ?? 0) - singleStart.current.x;
        const dy = Math.abs((e.changedTouches[0]?.clientY ?? 0) - singleStart.current.y);
        if (Math.abs(dx) > 60 && dy < 80) {
          go(dx < 0 ? 1 : -1);
        }
      }

      // Double-tap to zoom/reset
      if (!singleMoved.current && singleStart.current) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          if (scale.current > 1) {
            resetTransform(true);
          } else {
            scale.current = 2.5;
            applyTransform(true);
          }
          lastTap.current = 0;
        } else {
          lastTap.current = now;
        }
      }

      singleStart.current = null;
      singleMoved.current = false;
    }
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  function dist(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );
  }

  function midpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      className="lightbox"
      style={{ touchAction: 'none' }}
    >
      {/* Close */}
      <button
        className="lightbox-close"
        onClick={onClose}
      >×</button>

      {/* Counter */}
      {photos.length > 1 && (
        <span className="lightbox-counter">{index + 1} / {photos.length}</span>
      )}

      {/* Prev / Next arrows */}
      {photos.length > 1 && index > 0 && (
        <button className="lightbox-nav prev" onClick={() => go(-1)}>‹</button>
      )}
      {photos.length > 1 && index < photos.length - 1 && (
        <button className="lightbox-nav next" onClick={() => go(+1)}>›</button>
      )}

      {/* Image area */}
      <div
        ref={imgWrapRef}
        className="lightbox-img-wrap"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imgRef}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            objectFit: 'contain',
            display: 'block',
            willChange: 'transform',
            transform: 'translate(0,0) scale(1)',
            transformOrigin: 'center center',
            transition: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            draggable: false,
          }}
          draggable={false}
        />
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div
          ref={thumbsRef}
          className="lightbox-thumbs"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((url, i) => (
            <ThumbItem
              key={url}
              url={url}
              active={i === index}
              onClick={() => { resetTransform(false); onChange(i); }}
            />
          ))}
        </div>
      )}

      {/* Hint */}
      <div className="lightbox-hint">
        Сведите пальцы для увеличения · Двойной тап для зума
      </div>
    </div>
  );
}

// ─── Thumbnail sub-component ────────────────────────────────────────────────

function ThumbItem({ url, active, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!url || !ref.current) return;
    fetch(url, { headers: authHeaders() })
      .then((r) => r.ok ? r.blob() : null)
      .then((blob) => {
        if (!blob || !ref.current) return;
        ref.current.src = URL.createObjectURL(blob);
      })
      .catch(() => {});
  }, [url]);

  return (
    <div
      className={`lightbox-thumb ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <img ref={ref} alt="" draggable={false} />
    </div>
  );
}
