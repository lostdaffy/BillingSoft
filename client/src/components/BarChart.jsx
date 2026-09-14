import { useState } from 'react';
import { formatCompactCurrency, formatCurrency } from '../lib/format';

const niceCeiling = (value) => {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate);
  return step * magnitude;
};

/** Grouped vertical bar chart. series: [{ key, label, color }] */
export default function BarChart({ data = [], series = [], height = 260 }) {
  const [hover, setHover] = useState(null);
  const width = 760;
  const pad = { top: 16, right: 8, bottom: 28, left: 56 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const maxValue = niceCeiling(Math.max(0, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0))));
  const groupWidth = data.length ? chartWidth / data.length : chartWidth;
  const barWidth = Math.max(4, Math.min(16, (groupWidth - 12) / Math.max(series.length, 1)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => maxValue * fraction);
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Chart" onMouseLeave={() => setHover(null)}>
        {ticks.map((tick) => {
          const y = pad.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={tick === 0 ? '' : '3 4'} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                {formatCompactCurrency(tick)}
              </text>
            </g>
          );
        })}
        {data.map((row, index) => {
          const groupX = pad.left + index * groupWidth;
          const barsWidth = barWidth * series.length + (series.length - 1) * 2;
          return (
            <g key={row.label} onMouseEnter={() => setHover(index)}>
              <rect x={groupX} y={pad.top} width={groupWidth} height={chartHeight} fill={hover === index ? '#f1f5f9' : 'transparent'} />
              {series.map((s, seriesIndex) => {
                const value = Number(row[s.key]) || 0;
                const barHeight = (value / maxValue) * chartHeight;
                const x = groupX + (groupWidth - barsWidth) / 2 + seriesIndex * (barWidth + 2);
                return <rect key={s.key} x={x} y={pad.top + chartHeight - barHeight} width={barWidth} height={Math.max(barHeight, value ? 1.5 : 0)} rx="2.5" fill={s.color} />;
              })}
              <text x={groupX + groupWidth / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748b">
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-40 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((pad.left + hover * groupWidth + groupWidth / 2) / width) * 100}%` }}
        >
          <p className="mb-1 font-semibold text-slate-900">{hovered.label}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-medium text-slate-900 tabular-nums">{formatCurrency(hovered[s.key])}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
