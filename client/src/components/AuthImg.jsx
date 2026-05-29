import { useEffect, useState } from 'react';
import { getInitData, getDevUserId } from '../lib/telegram.js';

function authHeaders() {
  const initData = getInitData();
  if (initData) return { 'x-telegram-init-data': initData };
  return { 'x-dev-user-id': getDevUserId() };
}

/**
 * <AuthImg src={url} /> — loads image with auth headers and renders via blob URL.
 * Falls back to a transparent placeholder while loading.
 */
export default function AuthImg({ src, alt = '', onClick, style, className }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!src) return;
    let revoked = false;
    let created = null;

    fetch(src, { headers: authHeaders() })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || revoked) return;
        created = URL.createObjectURL(blob);
        setBlobUrl(created);
      })
      .catch(() => {});

    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  if (!blobUrl) {
    return (
      <div
        style={{
          background: 'var(--tg-secondary-bg)',
          aspectRatio: '1',
          borderRadius: 10,
          ...style,
        }}
        className={className}
      />
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      onClick={onClick}
      style={style}
      className={className}
    />
  );
}
