import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { fmt, COLORS, CONFIG_COLORS, CAHPS_LABELS } from '../utils';
import ChartCard from './ChartCard';
import KPITooltip, { TOOLTIPS } from './KPITooltip';

// Claims-based measures, with definitions from the CMS data dictionary (see Glossary)
const MEASURES = {
  acr_scr:   { label: 'All-Condition Readmission', short: 'ACR', higher: false, unit: '%', note: 'Risk-standardized all-condition readmission rate. Lower is better.' },
  uamcc_scr: { label: 'Unplanned Admissions, Multiple Chronic Conditions', short: 'UAMCC', higher: false, unit: '', note: 'Risk-standardized unplanned admissions per 100 person-years. Lower is better.' },
  tfu_scr:   { label: 'Timely Follow-Up After Acute Exacerbations', short: 'TFU', higher: true, unit: '%', note: 'Share of acute exacerbations of chronic conditions with timely follow-up. Higher is better. Reported from PY 2022 for Standard and New Entrant ACOs.' },
  dah_scr:   { label: 'Days at Home', short: 'DAH', higher: true, unit: '', note: 'Days at home for patients with complex, chronic conditions. Higher is better. High Needs ACOs only.' },
};
const CAHPS_SHORT = {
  ssm_taci: 'Timely Care', ssm_com: 'Communication', ssm_cc: 'Care Coordination', ssm_sdm: 'Shared Decisions',
  ssm_pr: 'Provider Rating', ssm_chos: 'Office Staff', ssm_hpe: 'Health Promotion', ssm_spr: 'Stewardship of Resources',
};
const CAHPS_KEYS = Object.keys(CAHPS_LABELS);
const LINE_COLORS = [COLORS.navy, COLORS.teal, COLORS.blue, COLORS.green, COLORS.amber, COLORS.red, COLORS.gold, COLORS.slate];

const avg = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const median = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const r1 = v => v == null ? null : +v.toFixed(2);

function histogram(vals, bins = 8) {
  const v = vals.filter(x => x != null); if (v.length < 2) return [];
  const lo = Math.min(...v), hi = Math.max(...v), w = (hi - lo) / bins || 1;
  return Array.from({ length: bins }, (_, i) => {
    const a = lo + i * w, b = i === bins - 1 ? hi + 1e-9 : a + w;
    return { label: `${a.toFixed(1)} to ${(a + w).toFixed(1)}`, mid: a + w / 2, count: v.filter(x => x >= a && x < b).length };
  });
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload; if (!d?.aco_name) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-title">{d.aco_name}</div>
      <div className="custom-tooltip-row"><span>Quality Score</span><span className="custom-tooltip-val">{fmt.pct(d.qual_scr, 1)}</span></div>
      <div className="custom-tooltip-row"><span>Savings Rate</span><span className="custom-tooltip-val">{fmt.pct(d.sav_rate, 2)}</span></div>
      <div className="custom-tooltip-row"><span>HPP</span><span className="custom-tooltip-val">{d.hpp_flag || '—'}</span></div>
    </div>
  );
};

export default function QualityDashboard({ perfData, navigateToACO, pinnedACO }) {
  const records = useMemo(() => perfData?.records || [], [perfData]);
  const years = useMemo(() => perfData?.years || [], [perfData]);
  const [year, setYear] = useState(years[years.length - 1]);
  const [type, setType] = useState('All');
  const [measure, setMeasure] = useState('acr_scr');
  const [sortCol, setSortCol] = useState('qual_scr');
  const [sortDir, setSortDir] = useState('desc');
  const [showAll, setShowAll] = useState(false);

  const recs = useMemo(() => records.filter(r => r.perf_year === year && (type === 'All' || r.aco_type === type)), [records, year, type]);
  const pinned = pinnedACO ? recs.find(r => r.aco_id === pinnedACO.aco_id) : null;

  const kpis = useMemo(() => ({
    avgQual: avg(recs.map(r => r.qual_scr)),
    medQual: median(recs.map(r => r.qual_scr)),
    full: recs.filter(r => r.qual_scr >= 100).length,
    hpp: recs.filter(r => r.hpp_flag === 'Yes').length,
    cisep: recs.filter(r => r.cisep_flag === 'Yes').length,
    flagged: recs.filter(r => r.hpp_flag).length,
    cahps: avg(recs.map(r => r.cahps_scr)),
  }), [recs]);

  const qualDist = useMemo(() => [['Under 60', 0, 60], ['60 to 70', 60, 70], ['70 to 80', 70, 80], ['80 to 90', 80, 90], ['90 to 99', 90, 99.5], ['100', 99.5, 101]]
    .map(([label, a, b]) => ({ label, count: recs.filter(r => r.qual_scr != null && r.qual_scr >= a && r.qual_scr < b).length })), [recs]);
  const qualVaries = new Set(recs.map(r => r.qual_scr)).size > 1;

  const measureRecs = recs.filter(r => r[measure] != null);
  const hist = useMemo(() => histogram(measureRecs.map(r => r[measure])), [measureRecs, measure]);
  const pinnedVal = pinned?.[measure];

  // Program averages across years (all ACO types, so the trend is not reshaped by the filter)
  const measureTrend = useMemo(() => years.map(y => {
    const yr = records.filter(r => r.perf_year === y && (type === 'All' || r.aco_type === type));
    const o = { year: `PY ${y}` };
    Object.keys(MEASURES).forEach(k => { o[k] = r1(avg(yr.map(r => r[k]))); });
    CAHPS_KEYS.forEach(k => { o[k] = r1(avg(yr.map(r => r[k]))); });
    o.qual_scr = r1(avg(yr.map(r => r.qual_scr)));
    return o;
  }), [records, years, type]);
  const cahpsYears = measureTrend.filter(t => CAHPS_KEYS.some(k => t[k] != null));

  const cahpsBars = CAHPS_KEYS.map(k => ({
    key: k, label: CAHPS_SHORT[k], avg: r1(avg(recs.map(r => r[k]))), aco: pinned ? r1(pinned[k]) : null,
  })).filter(d => d.avg != null);

  const sorted = useMemo(() => [...recs].sort((a, b) => {
    const av = a[sortCol] ?? (sortDir === 'desc' ? -Infinity : Infinity), bv = b[sortCol] ?? (sortDir === 'desc' ? -Infinity : Infinity);
    if (typeof av === 'string') return sortDir === 'desc' ? String(bv).localeCompare(av) : av.localeCompare(String(bv));
    return sortDir === 'desc' ? bv - av : av - bv;
  }), [recs, sortCol, sortDir]);
  const sortBy = c => { if (sortCol === c) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortCol(c); setSortDir(MEASURES[c] && !MEASURES[c].higher ? 'asc' : 'desc'); } };

  const selectStyle = { padding: '7px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'var(--font)', background: 'white' };
  const lbl = t => <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t}</div>;
  const Th = ({ col, children }) => (
    <th onClick={() => sortBy(col)} style={{ cursor: 'pointer', color: sortCol === col ? 'var(--teal-dark)' : undefined }}>
      {children} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );
  const M = MEASURES[measure];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>{lbl('Performance Year')}
          <select style={selectStyle} value={year} onChange={e => setYear(+e.target.value)}>{years.map(y => <option key={y} value={y}>PY {y}</option>)}</select></div>
        <div>{lbl('ACO Type')}
          <select style={selectStyle} value={type} onChange={e => setType(e.target.value)}>{['All', 'Standard', 'New Entrant', 'High Needs'].map(t => <option key={t}>{t}</option>)}</select></div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', maxWidth: 520, lineHeight: 1.5 }}>
          {year === 2021 ? 'PY 2021 was pay-for-reporting, so every ACO received a 100% quality score.'
            : year === 2022 ? 'PY 2022 was mostly pay-for-reporting, so quality scores cluster near 100%.'
              : 'Quality has been pay-for-performance since PY 2023.'}
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        {[
          ['Avg Quality Score', fmt.pct(kpis.avgQual, 1), `Median ${fmt.pct(kpis.medQual, 1)}`, TOOLTIPS.qual_scr],
          ['ACOs at 100%', `${kpis.full} of ${recs.length}`, recs.length ? `${Math.round(kpis.full / recs.length * 100)}% of ACOs` : '', null],
          ['High Performers Pool', kpis.flagged ? `${kpis.hpp} of ${kpis.flagged}` : 'Not reported', kpis.flagged ? 'ACOs qualifying' : 'Reported from PY 2023', TOOLTIPS.hpp],
          [year >= 2024 ? 'Avg CAHPS Composite' : 'CI/SEP Met', year >= 2024 ? fmt.pct(kpis.cahps, 1) : (kpis.flagged ? `${kpis.cisep} of ${kpis.flagged}` : 'Not reported'),
            year >= 2024 ? `CI/SEP met: ${kpis.cisep} of ${kpis.flagged}` : (kpis.flagged ? 'ACOs meeting the criteria' : 'Reported from PY 2023'), null],
        ].map(([l, v, sub, t]) => (
          <div className="kpi-card" key={l}>
            <div className="kpi-label">{t ? <KPITooltip {...t} label={l} /> : l}</div>
            <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{v}</div>
            <div className="kpi-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid-2">
        <ChartCard title={`Quality Score vs. Savings Rate, PY ${year}`} sub="Each dot is one ACO, colored by configuration. Larger outlined dots qualified for the High Performers Pool." filename={`reach-quality-vs-savings-py${year}`}>
          {qualVaries ? (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="qual_scr" type="number" domain={['dataMin', 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v)}%`}
                  label={{ value: 'Quality Score', position: 'insideBottom', offset: -6, fontSize: 11 }} />
                <YAxis dataKey="sav_rate" type="number" tick={{ fontSize: 11 }} width={44} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip content={<Tip />} />
                <ReferenceLine y={0} stroke="var(--gray-400)" />
                <Scatter data={recs.filter(r => r.qual_scr != null && r.sav_rate != null)} isAnimationActive={false}
                  shape={p => {
                    const isPin = pinned && p.payload.aco_id === pinned.aco_id, hpp = p.payload.hpp_flag === 'Yes';
                    return <circle cx={p.cx} cy={p.cy} r={isPin ? 8 : hpp ? 5.5 : 4} fill={CONFIG_COLORS[p.payload.config_key] || COLORS.gray}
                      fillOpacity={pinned ? (isPin ? 1 : 0.2) : 0.75} stroke={isPin ? COLORS.navy : hpp ? COLORS.gold : 'none'} strokeWidth={2} />;
                  }} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">Every ACO received a 100% quality score in PY {year}, so there is nothing to compare.</div>}
        </ChartCard>

        <ChartCard title={`Quality Score Distribution, PY ${year}`} sub="Number of ACOs in each quality score band" filename={`reach-quality-distribution-py${year}`}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={qualDist} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={34} />
              <Tooltip formatter={v => [v, 'ACOs']} />
              <Bar dataKey="count" fill={COLORS.teal} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Claims-Based Quality Measures" filename={`reach-${MEASURES[measure].short.toLowerCase()}-py${year}`}
        sub={M.note}
        headerRight={
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            {Object.entries(MEASURES).map(([k, m]) => (
              <button key={k} className={`filter-pill ${measure === k ? 'active' : ''}`} onClick={() => setMeasure(k)}>{m.short}</button>
            ))}
          </div>}>
        <div className="chart-grid-2" style={{ marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>
              {M.label}: distribution across {measureRecs.length} ACOs, PY {year}
              {pinnedVal != null && <span style={{ color: 'var(--teal-dark)' }}> · {pinned.aco_name}: {pinnedVal.toFixed(2)}{M.unit}</span>}
            </div>
            {hist.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hist} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip formatter={v => [v, 'ACOs']} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {hist.map((h, i) => {
                      const hasPin = pinnedVal != null && pinnedVal >= h.mid - (hist[1].mid - hist[0].mid) / 2 && pinnedVal < h.mid + (hist[1].mid - hist[0].mid) / 2 + (i === hist.length - 1 ? 1e-9 : 0);
                      return <Cell key={h.label} fill={hasPin ? COLORS.navy : COLORS.teal} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state">{M.short} is not reported for these ACOs in PY {year}.</div>}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>Program average by year{type !== 'All' ? ` (${type})` : ''}</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={measureTrend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} domain={['auto', 'auto']} tickFormatter={v => v.toFixed(1)} />
                <Tooltip formatter={v => [`${v}${M.unit}`, M.short]} />
                <Line dataKey={measure} stroke={COLORS.teal} strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{M.higher ? 'Higher is better.' : 'Lower is better.'}</div>
          </div>
        </div>
      </ChartCard>

      <div className="chart-grid-2">
        <ChartCard title={`CAHPS Patient Experience, PY ${year}`} filename={`reach-cahps-py${year}`}
          sub={pinned ? `Program average vs. ${pinned.aco_name} (pinned)` : 'Program average by survey measure. Pin an ACO to compare.'}>
          {cahpsBars.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cahpsBars} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n) => [v == null ? '—' : v.toFixed(1), n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="avg" name="Program average" fill={COLORS.slate} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                {pinned && <Bar dataKey="aco" name={pinned.aco_name} fill={COLORS.teal} radius={[0, 3, 3, 0]} isAnimationActive={false} />}
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">CAHPS results are not published for PY {year}.</div>}
        </ChartCard>

        <ChartCard title="CAHPS Trends: Program Average" filename="reach-cahps-trends"
          sub={`Average score by survey measure, PY ${cahpsYears[0]?.year.slice(3) || ''} to ${cahpsYears[cahpsYears.length - 1]?.year.slice(3) || ''}`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cahpsYears} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={34} domain={['auto', 'auto']} />
              <Tooltip formatter={(v, n) => [v?.toFixed(1), n]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {CAHPS_KEYS.map((k, i) => <Line key={k} dataKey={k} name={CAHPS_SHORT[k]} stroke={LINE_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="chart-title">ACO Quality Results, PY {year}</div>
            <div className="chart-sub" style={{ marginBottom: 0 }}>Click a column to sort. Readmission and admissions sort lowest first because lower is better.</div>
          </div>
          <button className="filter-pill" onClick={() => setShowAll(s => !s)}>{showAll ? 'Show top 20' : `Show all ${sorted.length}`}</button>
        </div>
        <div className="table-scroll">
          <table className="data-table cohort-table">
            <thead><tr>
              <Th col="aco_name">ACO</Th><Th col="aco_type">Type</Th><Th col="qual_scr">Quality</Th>
              <Th col="acr_scr">ACR</Th><Th col="uamcc_scr">UAMCC</Th><Th col="tfu_scr">TFU</Th><Th col="dah_scr">DAH</Th>
              {year >= 2024 && <Th col="cahps_scr">CAHPS</Th>}<Th col="hpp_flag">HPP</Th><Th col="cisep_flag">CI/SEP</Th><Th col="sav_rate">Savings Rate</Th>
            </tr></thead>
            <tbody>{(showAll ? sorted : sorted.slice(0, 20)).map(r => (
              <tr key={r.aco_id} style={{ background: pinned?.aco_id === r.aco_id ? 'var(--teal-light)' : undefined }}>
                <td><button onClick={() => navigateToACO(r)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--navy)', fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', fontSize: 13 }}>{r.aco_name}</button>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{r.aco_id}</div></td>
                <td>{r.aco_type}</td>
                <td style={{ fontWeight: 600 }}>{fmt.pct(r.qual_scr, 1)}</td>
                <td>{r.acr_scr?.toFixed(2) ?? '—'}</td><td>{r.uamcc_scr?.toFixed(2) ?? '—'}</td>
                <td>{r.tfu_scr?.toFixed(2) ?? '—'}</td><td>{r.dah_scr?.toFixed(1) ?? '—'}</td>
                {year >= 2024 && <td>{r.cahps_scr?.toFixed(1) ?? '—'}</td>}
                <td>{r.hpp_flag === 'Yes' ? <span className="badge badge-saver">HPP</span> : (r.hpp_flag || '—')}</td>
                <td>{r.cisep_flag || '—'}</td>
                <td style={{ color: r.sav_rate >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmt.pct(r.sav_rate, 2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
