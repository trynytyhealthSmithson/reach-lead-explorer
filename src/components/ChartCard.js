import React from 'react';

/**
 * ChartCard: card layout for a chart (title, subtitle, optional header control).
 * The Download PNG button comes from the app-wide PngExport component.
 * Usage: <ChartCard title="My Chart" filename="my-chart">
 *          <ResponsiveContainer>...</ResponsiveContainer>
 *        </ChartCard>
 */
export default function ChartCard({ title, sub, filename, children, style, headerRight }) {

  return (
    <div
      className="chart-card"
      data-filename={filename}
      style={{ position: 'relative', ...style }}
    >
      {/* Header row */}
      {(title || headerRight) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: sub ? 2 : 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            {title && <div className="chart-title">{title}</div>}
            {sub   && <div className="chart-sub">{sub}</div>}
          </div>
          {headerRight}
        </div>
      )}

      {/* Content */}
      {children}

    </div>
  );
}
