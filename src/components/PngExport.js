import React, { useEffect, useState } from 'react';
import { exportChartPNG } from '../utils';

// One app-wide "Download PNG" control: hovering any card that holds a chart shows the button.
export default function PngExport() {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    const over = e => {
      const card = e.target.closest && e.target.closest('.chart-card');
      if (card && card.querySelector('svg.recharts-surface')) setTarget(t => (t && t.card === card ? t : { card, rect: card.getBoundingClientRect() }));
      else if (!(e.target.closest && e.target.closest('.png-export-btn'))) setTarget(null);
    };
    const scroll = () => setTarget(null);
    document.addEventListener('mouseover', over);
    document.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('mouseover', over); document.removeEventListener('scroll', scroll, true); };
  }, []);
  if (!target) return null;
  const title = target.card.querySelector('.chart-title')?.textContent || 'chart';
  const name = target.card.dataset.filename || 'reach-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return (
    <button className="png-export-btn" title="Download this chart as a PNG"
      onClick={() => { exportChartPNG(target.card, name); if (typeof window.gtag === 'function') window.gtag('event', 'png_download', { chart: title }); }}
      style={{ position: 'fixed', top: target.rect.bottom - 36, left: target.rect.right - 128, zIndex: 60,
        padding: '3px 9px', fontSize: 11, fontFamily: 'var(--font)', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)',
        background: 'white', color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      Download PNG
    </button>
  );
}
