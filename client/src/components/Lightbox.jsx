import { useEffect, useRef } from 'react';
import { getInitData, getDevUserId } from '../lib/telegram.js';
import { haptic } from '../lib/telegram.js';

function authHeaders() {
  const initData = getInitData();
  if (initData) return { 'x-telegram-init-data': initData };
  return { 'x-dev-user-id': getDevUserId() };
}

/**
 * Full-screen lightbox with pinch-to-zoom, pan and swipe navigation.
 *
 * All transform manipulation goes directly through DOM refs — zero React
 * re-renders during gestures, so the image never flickers.
 *
 * Touch handlers are attached via addEventListener({ passive: false }) so
 * e.preventDefault() works on iOS/Android.
 */
export default function Lightbox({ photos, index, onClose, onChange }) {
  const imgWrapRef = useRef(null);
  const imgRef     = useRef(null);
  const thumbsRef  = useRef(null);

  // ── blob cache ───────────────────────────────────────────────────────────
  const blobCache = useRef({});
  const revokeSet = useRef(new Set());

  // ── gesture refs (no setState during gesture) ────────────────────────────
  const sc   = useRef(1);   // current scale
  const tx   = useRef(0);   // translateX px
  const ty   = useRef(0);   // translateY px

  const prevDist  = useRef(null);
  const prevMidX  = useRef(0);
  const prevMidY  = useRef(0);

  const t1Start   = useRef(null);   // {x,y} of first touch on touchstart
  const moved     = useRef(false);
  const lastTap   = useRef(0);

  // Expose current index to touch handlers without stale closure
  const indexRef    = useRef(index);
  const photosRef   = useRef(photos);
  const onChangeRef = useRef(onChange);
  const onCloseRef  = useRef(onClose);
  useEffect(() => { indexRef.current    = index;    }, [index]);
  useEffect(() => { photosRef.current   = photos;   }, [photos]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onCloseRef.current  = onClose;  }, [onClose]);

  // ── transform helpers ────────────────────────────────────────────────────

  function applyTransform(animated) {
    const el = imgRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 0.22s ease' : 'none';
    el.style.transform  = `translate(${tx.current}px,${ty.current}px) scale(${sc.current})`;
  }

  function resetTransform(animated) {
    sc.current = 1; tx.current = 0; ty.current = 0;
    applyTransform(animated);
  }

  function clampPan() {
    if (!imgRef.current || !imgWrapRef.current) return;
    if (sc.current <= 1) { tx.current = 0; ty.current = 0; return; }
    const iw = imgRef.current.naturalWidth  || imgRef.current.clientWidth;
    const ih = imgRef.current.naturalHeight || imgRef.current.clientHeight;
    const bw = imgWrapRef.current.clientWidth;
    const bh = imgWrapRef.current.clientHeight;
    const visW = Math.min(iw, bw);
    const visH = Math.min(ih, bh);
    const maxX = Math.max(0, (visW  * sc.current - bw) / 2);
    const maxY = Math.max(0, (visH  * sc.current - bh) / 2);
    tx.current = Math.max(-maxX, Math.min(maxX, tx.current));
    ty.current = Math.max(-maxY, Math.min(maxY, ty.current));
  }

  // ── photo loading ────────────────────────────────────────────────────────

  function loadUrl(url, callback) {
    if (!url) return;
    if (blobCache.current[url]) { callback && callback(blobCache.current[url]); return; }
    fetch(url, { headers: authHeaders() })
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (!blob) return;
        const bu = URL.createObjectURL(blob);
        blobCache.current[url] = bu;
        revokeSet.current.add(bu);
        callback && callback(bu);
      })
      .catch(() => {});
  }

  // When index changes: load photo, pre-fetch neighbours, reset transform
  useEffect(() => {
    const url = photos[index];
    if (!url) return;
    resetTransform(false);

    if (blobCache.current[url]) {
      if (imgRef.current) { imgRef.current.src = blobCache.current[url]; imgRef.current.style.opacity = '1'; }
    } else {
      if (imgRef.current) imgRef.current.style.opacity = '0';
      loadUrl(url, (bu) => {
        if (imgRef.current) { imgRef.current.src = bu; imgRef.current.style.opacity = '1'; }
      });
    }

    // Pre-fetch neighbours silently
    loadUrl(photos[index - 1]);
    loadUrl(photos[index + 1]);

    // Scroll active thumb
    if (thumbsRef.current) {
      const active = thumbsRef.current.querySelector('.lb-thumb-active');
      if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [index]);   // eslint-disable-line

  // ── keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape')        onCloseRef.current();
      else if (e.key === 'ArrowLeft')  go(-1);
      else if (e.key === 'ArrowRight') go(+1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => () => {
    revokeSet.current.forEach(bu => URL.revokeObjectURL(bu));
  }, []);

  // ── navigation ───────────────────────────────────────────────────────────

  function go(dir) {
    const next = indexRef.current + dir;
    if (next < 0 || next >= photosRef.current.length) return;
    resetTransform(false);
    onChangeRef.current(next);
    haptic('light');
  }

  // ── touch handlers — registered as non-passive ───────────────────────────

  useEffect(() => {
    const el = imgWrapRef.current;
    if (!el) return;

    function onStart(e) {
      if (e.touches.length === 2) {
        prevDist.current = hypot(e.touches);
        const m = mid(e.touches);
        prevMidX.current = m.x;
        prevMidY.current = m.y;
        t1Start.current  = null;
      } else {
        t1Start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        moved.current   = false;
      }
    }

    function onMove(e) {
      e.preventDefault();

      if (e.touches.length === 2 && prevDist.current !== null) {
        const d  = hypot(e.touches);
        const m  = mid(e.touches);
        const ds = d / prevDist.current;

        sc.current = Math.min(Math.max(sc.current * ds, 0.5), 6);
        tx.current = tx.current * ds + (m.x - prevMidX.current);
        ty.current = ty.current * ds + (m.y - prevMidY.current);

        prevDist.current = d;
        prevMidX.current = m.x;
        prevMidY.current = m.y;

        applyTransform(false);

      } else if (e.touches.length === 1 && t1Start.current) {
        const dx = e.touches[0].clientX - t1Start.current.x;
        const dy = e.touches[0].clientY - t1Start.current.y;

        if (sc.current > 1.05) {
          tx.current += dx;
          ty.current += dy;
          t1Start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          applyTransform(false);
          moved.current = true;
        } else if (Math.abs(dx) > 8) {
          moved.current = true;
        }
      }
    }

    function onEnd(e) {
      if (e.touches.length < 2) prevDist.current = null;

      if (e.touches.length === 0) {
        // Snap back if barely zoomed
        if (sc.current < 1.05) {
          resetTransform(true);
        } else {
          clampPan();
          applyTransform(true);
        }

        // Swipe to navigate (only at scale ~1)
        if (sc.current <= 1.05 && t1Start.current && moved.current && e.changedTouches.length) {
          const dx = e.changedTouches[0].clientX - t1Start.current.x;
          const dy = Math.abs(e.changedTouches[0].clientY - t1Start.current.y);
          if (Math.abs(dx) > 55 && dy < 80) go(dx < 0 ? 1 : -1);
        }

        // Double-tap
        if (!moved.current && t1Start.current) {
          const now = Date.now();
          if (now - lastTap.current < 280) {
            sc.current > 1 ? resetTransform(true) : (() => { sc.current = 2.8; applyTransform(true); })();
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
        }

        t1Start.current = null;
        moved.current   = false;
      }
    }

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, []);  // single registration, uses refs for all dynamic values

  // ── geometry helpers ─────────────────────────────────────────────────────

  function hypot(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );
  }
  function mid(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="lightbox" style={{ touchAction: 'none' }}>

      <button className="lightbox-close" onClick={onClose}>×</button>

      {photos.length > 1 && (
        <span className="lightbox-counter">{index + 1} / {photos.length}</span>
      )}

      {photos.length > 1 && index > 0 && (
        <button className="lightbox-nav prev" onClick={() => go(-1)}>‹</button>
      )}
      {photos.length > 1 && index < photos.length - 1 && (
        <button className="lightbox-nav next" onClick={() => go(+1)}>›</button>
      )}

      {/* Image container — touch events attached via useEffect */}
      <div
        ref={imgWrapRef}
        className="lightbox-img-wrap"
        style={{ touchAction: 'none', userSelect: 'none', overflow: 'hidden' }}
      >
        <img
          ref={imgRef}
          alt=""
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            objectFit: 'contain',
            display: 'block',
            willChange: 'transform',
            transform: 'translate(0px,0px) scale(1)',
            transformOrigin: 'center center',
            transition: 'opacity 0.15s ease',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>

      {photos.length > 1 && (
        <div ref={thumbsRef} className="lightbox-thumbs">
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

      <div className="lightbox-hint">
        Двойной тап · Сведите пальцы для зума
      </div>
    </div>
  );
}

// ── Thumbnail ────────────────────────────────────────────────────────────────

function ThumbItem({ url, active, onClick }) {
  const imgRef = useRef(null);

  useEffect(() => {
    if (!url || !imgRef.current) return;
    let revoked = false;
    let bu = null;
    fetch(url, { headers: authHeaders() })
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (!blob || revoked || !imgRef.current) return;
        bu = URL.createObjectURL(blob);
        imgRef.current.src = bu;
      })
      .catch(() => {});
    return () => { revoked = true; if (bu) URL.revokeObjectURL(bu); };
  }, [url]);

  return (
    <div className={`lightbox-thumb ${active ? 'lb-thumb-active active' : ''}`} onClick={onClick}>
      <img ref={imgRef} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}
