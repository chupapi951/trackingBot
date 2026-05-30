import { useEffect, useRef, useState } from 'react';
import AuthImg from './AuthImg.jsx';

export default function PhotoViewer({ photos, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef(null);
  const lastTouchMid = useRef(null);
  const lastPinchScale = useRef(1);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const containerRef = useRef(null);
  const controlsTimer = useRef(null);

  function resetZoom() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
  }

  function goTo(index) {
    resetZoom();
    setCurrentIndex(index);
  }

  function prev() {
    if (isAnimating) return;
    setIsAnimating(true);
    goTo((currentIndex - 1 + photos.length) % photos.length);
    setTimeout(() => setIsAnimating(false), 300);
  }

  function next() {
    if (isAnimating) return;
    setIsAnimating(true);
    goTo((currentIndex + 1) % photos.length);
    setTimeout(() => setIsAnimating(false), 300);
  }

  function handleClose() {
    resetZoom();
    onClose();
  }

  function showControlsTemporarily() {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (scaleRef.current <= 1) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }

  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex]);

  useEffect(() => {
    return () => clearTimeout(controlsTimer.current);
  }, []);

  function handleTouchStart(e) {
    showControlsTemporarily();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
      lastTouchMid.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      lastPinchScale.current = scaleRef.current;
      touchStartX.current = null;
      touchStartY.current = null;
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
    }
  }

  function handleTouchMove(e) {
    showControlsTemporarily();
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      let newScale = lastPinchScale.current * (dist / lastTouchDist.current);
      newScale = Math.min(Math.max(newScale, 1), 5);
      scaleRef.current = newScale;
      setScale(newScale);

      if (lastTouchMid.current && scaleRef.current > 1) {
        const dx = midX - lastTouchMid.current.x;
        const dy = midY - lastTouchMid.current.y;
        const newX = translateRef.current.x + dx;
        const newY = translateRef.current.y + dy;
        translateRef.current = { x: newX, y: newY };
        setTranslate({ x: newX, y: newY });
        lastTouchMid.current = { x: midX, y: midY };
      }

      e.preventDefault();
    } else if (e.touches.length === 1 && scaleRef.current > 1 && touchStartX.current !== null) {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - (touchStartY.current || 0);
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        const newX = translateRef.current.x + dx;
        const newY = translateRef.current.y + dy;
        translateRef.current = { x: newX, y: newY };
        setTranslate({ x: newX, y: newY });
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }
      e.preventDefault();
    }
  }

  function handleTouchEnd(e) {
    showControlsTemporarily();
    if (e.touches.length < 2) {
      lastTouchDist.current = null;
      lastTouchMid.current = null;
    }
    if (e.touches.length < 1) {
      touchStartX.current = null;
      touchStartY.current = null;
    }

    if (e.changedTouches.length === 1 && scaleRef.current === 1 && touchStartTime.current !== null) {
      const elapsed = Date.now() - touchStartTime.current;
      const dx = e.changedTouches[0].clientX - (touchStartX.current || 0);
      if (elapsed < 300 && Math.abs(dx) < 10) {
        if (dx > 60) {
          prev();
        } else if (dx < -60) {
          next();
        }
      }
    }
  }

  function handleBgClick(e) {
    if (e.target === e.currentTarget || e.target === containerRef.current) {
      if (scaleRef.current > 1) {
        resetZoom();
      } else {
        handleClose();
      }
    }
  }

  function handleContentClick() {
    if (scaleRef.current > 1) {
      resetZoom();
    }
    showControlsTemporarily();
  }

  const currentPhoto = photos[currentIndex];
  const showNav = photos.length > 1;

  return (
    <div className="pv" onClick={handleBgClick}>
      <div className={`pv-header ${showControls ? 'visible' : ''}`}>
        <button className="pv-close" onClick={handleClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {photos.length > 1 && (
          <span className="pv-counter">{currentIndex + 1} / {photos.length}</span>
        )}
      </div>

      {showNav && scaleRef.current <= 1 && (
        <>
          <button className="pv-nav pv-nav-prev" onClick={(e) => { e.stopPropagation(); prev(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className="pv-nav pv-nav-next" onClick={(e) => { e.stopPropagation(); next(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      <div
        className="pv-content"
        ref={containerRef}
        onClick={(e) => { e.stopPropagation(); handleContentClick(); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AuthImg
          key={currentPhoto + currentIndex}
          src={currentPhoto}
          alt=""
          className="pv-img"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transformOrigin: 'center center',
            transition: scale > 1 ? 'none' : 'transform 0.2s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      {photos.length > 1 && (
        <div className="pv-thumbs">
          {photos.map((url, i) => (
            <div
              key={url}
              className={`pv-thumb ${i === currentIndex ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
            >
              <AuthImg src={url} alt="" />
            </div>
          ))}
        </div>
      )}

      {scaleRef.current > 1 && (
        <div className="pv-zoom-indicator">
          {scaleRef.current.toFixed(1)}×
        </div>
      )}
    </div>
  );
}