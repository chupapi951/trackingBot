import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAnalytics()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ margin: '20px auto' }} />;
  if (!data || data.totalDataPoints === 0)
    return <div className="hint" style={{ padding: '12px 0' }}>Недостаточно данных для аналитики. Добавьте этапы с датами в трекеры.</div>;

  const maxDays = Math.max(...data.perTracker.map((t) => t.avgDays), 1);

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div className="hint" style={{ fontSize: 12 }}>Среднее</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.averageDays} дн.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="hint" style={{ fontSize: 12 }}>Медиана</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.medianDays} дн.</div>
          </div>
        </div>
        <div className="hint" style={{ fontSize: 12 }}>
          Время между этапами ({data.totalDataPoints} измерений)
        </div>
      </div>

      {data.perTracker.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>По трекерам (ср. дней между этапами)</div>
          <div className="bar-chart">
            {data.perTracker.slice(0, 8).map((t, i) => (
              <div className="bar-col" key={i}>
                <span className="bar-value">{t.avgDays || '—'}</span>
                <div
                  className="bar"
                  style={{
                    height: `${Math.max((t.avgDays / maxDays) * 100, 4)}%`,
                  }}
                />
                <span className="bar-label">
                  {t.title.length > 6 ? t.title.slice(0, 6) + '…' : t.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
