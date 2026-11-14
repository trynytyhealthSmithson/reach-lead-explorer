import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { fmt, COLORS, CONFIG_COLORS, CONFIG_LABELS, expensePBPM, sharedPerBene } from '../utils';
import ChartCard from './ChartCard';
import KPITooltip, { TOOLTIPS } from './KPITooltip';

const CONFIG_OPTIONS = ['All', 'Global/TCC', 'Global/PCC', 'Professional/PCC'];
const TYPE_OPTIONS = ['All', 'Standard', 'New Entrant', 'High Needs'];
const SIZE_OPTIONS = ['All', 'Small (under 5K)', 'Medium (5K to 20K)', 'Large (over 20K)'];
const ROWS_OPTIONS = [15, 25, 50, 'All'];

const sizeLabel = n => n == null ? 'Unknown' : n < 5000 ? 'Small (under 5K)' : n < 20000 ? 'Medium (5K to 20K)' : 'Large (over 20K)';
const avg = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const sum = a => a.filter(x => x != null && !isNaN(x)).reduce((s, x) => s + x, 0);
const money2 = v => v == null ? '—' : `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const benchPreDiscount = r => r.final_benchmark == null ? null
  : r.final_benchmark / (1 - (r.discount || 0) / 100) + (r.heba_up_amt || 0) + (r.heba_down_amt || 0);

function trend(points) {
  const n = points.length; if (n < 3) return null;
  const sx = sum(points.map(p => p.x)), sy = sum(points.map(p => p.y));
  const sxy = sum(points.map(p => p.x * p.y)), sxx = sum(points.map(p => p.x * p.x));
  const d = n * sxx - sx * sx; if (!d) return null;
  const m = (n * sxy - sx * sy) / d, b = (sy - m * sx) / n;
  const xs = points.map(p => p.x), lo = Math.min(...xs), hi = Math.max(...xs);
  return [{ x: lo, y: m * lo + b }, { x: hi, y: m * hi + b }];
}

function cohortStats(recs) {
  if (!recs.length) return null;
  const bench = sum(recs.map(benchPreDiscount)), cost = sum(recs.map(r => r.tot_cost_care_net));
  return {
    n: recs.length,
    pctEarning: recs.filter(r => (r.shared_savings || 0) > 0).length / recs.length * 100,
    avgSavRate: avg(recs.map(r => r.sav_rate)),
    grossRateCMS: bench ? (bench - cost) / bench * 100 : null,
    totalEarned: sum(recs.map(r => r.shared_savings)),
    avgQual: avg(recs.map(r => r.qual_scr)),
    avgPBPM: avg(recs.map(expensePBPM)),
    benes: sum(recs.map(r => r.bene_cnt)),
  };
}

const Tip = ({ active, payload, rows }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload; if (!d?.aco_name) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-title">{d.aco_name}</div>
      {rows.map(([l, f]) => (
        <div className="custom-tooltip-row" key={l}><span>{l}</span><span className="custom-tooltip-val">{f(d)}</span></div>
      ))}
    </div>
  );
};

export default function CohortExplorer({ perfData, navigateToACO, pinnedACO, pinACO }) {
  const records = useMemo(() => perfData?.records || [], [perfData]);
  const years = perfData?.years || [];
  const [year, setYear] = useState(years[years.length - 1]);
  const [config, setConfig] = useState('All');
  const [type, setType] = useState('All');
  const [size, setSize] = useState('All');
  const [epcc, setEpcc] = useState(false);
  const [stopLoss, setStopLoss] = useState(false);
  const [hppOnly, setHpp] = useState(false);
  const [minYears, setMinYears] = useState(1);
  const [sortCol, setSortCol] = useState('sav_rate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(15);
  const [selected, setSelected] = useState(new Set());

  const tenure = useMemo(() => {
    const t = {}; records.forEach(r => { t[r.aco_id] = (t[r.aco_id] || 0) + 1; }); return t;
  }, [records]);

  const filtered = useMemo(() => records.filter(r =>
    r.perf_year === year
    && (config === 'All' || r.config_key === config)
    && (type === 'All' || r.aco_type === type)
    && (size === 'All' || sizeLabel(r.bene_cnt) === size)
    && (!epcc || r.enhanced_pcc === 'Yes')
    && (!stopLoss || r.stop_loss === 'Yes')
    && (!hppOnly || r.hpp_flag === 'Yes')
    && (tenure[r.aco_id] || 1) >= minYears
  ).map(r => ({ ...r, exp_pbpm: expensePBPM(r), shared_per_bene: sharedPerBene(r), years_in: tenure[r.aco_id] || 1 })),
  [records, year, config, type, size, epcc, stopLoss, hppOnly, minYears, tenure]);

  const stats = useMemo(() => cohortStats(filtered), [filtered]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === 'string' || typeof bv === 'string') {
      const c = String(av ?? '').localeCompare(String(bv ?? '')); return sortDir === 'desc' ? -c : c;
    }
    const an = av ?? -Infinity, bn = bv ?? -Infinity; return sortDir === 'desc' ? bn - an : an - bn;
  }), [filtered, sortCol, sortDir]);

  const pinnedRec = pinnedACO ? filtered.find(r => r.aco_id === pinnedACO.aco_id) : null;
  const earnQual = filtered.filter(r => r.shared_per_bene != null && r.qual_scr != null);
  const earnQualTrend = useMemo(() => trend(earnQual.map(r => ({ x: r.qual_scr, y: r.shared_per_bene }))), [earnQual]);
  const rateRisk = filtered.filter(r => r.sav_rate != null && r.norm_risk_score != null);
  const rateRiskTrend = useMemo(() => trend(rateRisk.map(r => ({ x: r.norm_risk_score, y: r.sav_rate }))), [rateRisk]);
  const qualVaries = new Set(earnQual.map(r => r.qual_scr)).size > 1;

  const dist = useMemo(() => [
    ['Below -5%', -Infinity, -5], ['-5 to 0%', -5, 0], ['0 to 5%', 0, 5], ['5 to 10%', 5, 10],
    ['10 to 15%', 10, 15], ['15% and up', 15, Infinity],
  ].map(([label, lo, hi]) => ({ label, pos: lo >= 0, count: filtered.filter(r => r.sav_rate != null && r.sav_rate >= lo && r.sav_rate < hi).length })),
  [filtered]);

  const configMix = useMemo(() => {
    const c = {}; filtered.forEach(r => { c[r.config_key] = (c[r.config_key] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const pageSize = rows === 'All' ? 99999 : rows;
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const pages = Math.ceil(sorted.length / pageSize);
  const reset = () => setPage(0);
  const sortBy = col => { if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortCol(col); setSortDir('desc'); } reset(); };
  const toggle = id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selRecs = sorted.filter(r => selected.has(r.aco_id));
  const selStats = cohortStats(selRecs);

  const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const exportCSV = (recs, name) => {
    const head = ['ACO ID', 'ACO Name', 'Configuration', 'ACO Type', 'Aligned Beneficiaries', 'Savings Rate (%)', 'Earned Savings ($)',
      'Earned Savings per Beneficiary ($)', 'Quality Score', 'Expense PBPM ($)', 'Normalized Risk Score', 'Enhanced PCC', 'Stop Loss', 'High Performers Pool', 'Years in REACH'];
    const body = recs.map(r => [r.aco_id, r.aco_name, CONFIG_LABELS[r.config_key] || r.config_key, r.aco_type, r.bene_cnt,
      r.sav_rate?.toFixed(2), r.shared_savings?.toFixed(0), r.shared_per_bene?.toFixed(2), r.qual_scr?.toFixed(1),
      r.exp_pbpm?.toFixed(2), r.norm_risk_score?.toFixed(3), r.enhanced_pcc, r.stop_loss, r.hpp_flag, r.years_in]);
    const note = [`Source: CMS ACO REACH Financial and Quality Results public use files via TRYNYTY health:enablement ACO REACH Explorer (reachpuf.trynytyhealth.com). PY ${year}.`];
    const csv = [head, ...body, [], note].map(r => r.map(csvCell).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
    if (typeof window.gtag === 'function') window.gtag('event', 'csv_download', { table: 'reach_cohort', year });
  };

  const selectStyle = { padding: '7px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'var(--font)', background: 'white', cursor: 'pointer' };
  const label = t => <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t}</div>;
  const check = (t, v, set) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: 13, cursor: 'pointer', background: 'white' }}>
      <input type="checkbox" checked={v} onChange={e => { set(e.target.checked); reset(); }} /> {t}
    </label>
  );
  const dot = (fillFor) => (p) => {
    const isPin = pinnedRec && p.payload?.aco_id === pinnedRec.aco_id;
    const isSel = selected.has(p.payload?.aco_id);
    const op = pinnedRec ? (isPin ? 1 : 0.18) : 0.75;
    return <circle cx={p.cx} cy={p.cy} r={isPin ? 8 : isSel ? 6 : 4} fill={fillFor(p.payload)} fillOpacity={op}
      stroke={isPin || isSel ? COLORS.navy : 'none'} strokeWidth={2} style={{ cursor: 'pointer' }}
      onClick={() => toggle(p.payload.aco_id)} />;
  };
  const Th = ({ col, children, tip }) => (
    <th onClick={() => sortBy(col)} style={{ cursor: 'pointer', color: sortCol === col ? 'var(--teal-dark)' : undefined }}>
      {tip ? <KPITooltip {...tip} label={children} /> : children} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );

  const compMetrics = [
    ['Configuration', r => CONFIG_LABELS[r.config_key] || r.config_key],
    ['ACO Type', r => r.aco_type],
    ['Beneficiaries', r => fmt.num(r.bene_cnt)],
    ['Savings Rate', r => fmt.pct(r.sav_rate, 2), r => r.sav_rate, true],
    ['Earned Savings', r => fmt.dollars(r.shared_savings), r => r.shared_savings, true],
    ['Earned per Beneficiary', r => money2(r.shared_per_bene), r => r.shared_per_bene, true],
    ['Quality Score', r => fmt.pct(r.qual_scr, 1), r => r.qual_scr, true],
    ['Expense PBPM', r => money2(r.exp_pbpm), r => r.exp_pbpm, false],
    ['Risk Score', r => r.norm_risk_score?.toFixed(3) ?? '—'],
    ['Years in REACH', r => `${r.years_in} of ${years.length}`],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="chart-card">
        <div className="chart-title" style={{ marginBottom: 14 }}>Filter Cohort</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>{label('Performance Year')}
            <select style={selectStyle} value={year} onChange={e => { setYear(+e.target.value); setSelected(new Set()); reset(); }}>
              {years.map(y => <option key={y} value={y}>PY {y}</option>)}</select></div>
          <div>{label('Configuration')}
            <select style={selectStyle} value={config} onChange={e => { setConfig(e.target.value); reset(); }}>
              {CONFIG_OPTIONS.map(c => <option key={c} value={c}>{c === 'All' ? 'All' : CONFIG_LABELS[c]}</option>)}</select></div>
          <div>{label('ACO Type')}
            <select style={selectStyle} value={type} onChange={e => { setType(e.target.value); reset(); }}>
              {TYPE_OPTIONS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div>{label('ACO Size')}
            <select style={selectStyle} value={size} onChange={e => { setSize(e.target.value); reset(); }}>
              {SIZE_OPTIONS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div>{label('Min Years in REACH')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <input type="range" min={1} max={years.length} value={minYears} onChange={e => { setMinYears(+e.target.value); reset(); }} style={{ width: 90 }} />
              <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{minYears}{minYears > 1 ? '+' : ''}</span></div></div>
          <div>{label('Elections')}
            <div style={{ display: 'flex', gap: 8 }}>
              {check('Enhanced PCC', epcc, setEpcc)}{check('Stop Loss', stopLoss, setStopLoss)}{check('High Performers Pool', hppOnly, setHpp)}
            </div></div>
        </div>
      </div>

      {stats ? (
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          {[
            ['ACOs in Cohort', fmt.num(stats.n), null],
            ['% Earning Savings', fmt.pct(stats.pctEarning, 1), null],
            ['Avg Savings Rate', fmt.pct(stats.avgSavRate, 2), TOOLTIPS.sav_rate],
            ['Gross Savings Rate (CMS basis)', fmt.pct(stats.grossRateCMS, 2), TOOLTIPS.gross_rate_cms],
            ['Total Earned Savings', fmt.dollars(stats.totalEarned), TOOLTIPS.shared_savings],
            ['Avg Quality Score', fmt.pct(stats.avgQual, 1), TOOLTIPS.qual_scr],
            ['Avg Expense PBPM', money2(stats.avgPBPM), TOOLTIPS.exp_pbpm],
            ['Aligned Beneficiaries', fmt.shortNum(stats.benes), TOOLTIPS.bene_cnt],
          ].map(([l, v, t]) => (
            <div className="kpi-card" key={l}>
              <div className="kpi-label">{t ? <KPITooltip {...t} label={l} /> : l}</div>
              <div className="kpi-value" style={{ fontSize: '1.35rem' }}>{v}</div>
            </div>
          ))}
        </div>
      ) : <div className="chart-card empty-state">No ACOs match these filters.</div>}

      {stats && (
        <div className="chart-card" style={{ padding: '12px 20px', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuration mix:</span>
          {configMix.map(([k, n]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: CONFIG_COLORS[k] || COLORS.gray }} />
              {CONFIG_LABELS[k] || k} <b style={{ color: 'var(--navy)' }}>{n}</b>
              <span style={{ color: 'var(--gray-400)' }}>({Math.round(n / stats.n * 100)}%)</span>
            </span>
          ))}
        </div>
      )}

      {selStats && (
        <div className="chart-card" style={{ border: '2px solid var(--teal)', padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--teal-light)', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="chart-title" style={{ marginBottom: 2 }}>
                {selRecs.length >= 2 && selRecs.length <= 5 ? 'ACO Side-by-Side Comparison' : `Selected Cohort: ${selRecs.length} ACO${selRecs.length > 1 ? 's' : ''}`}
              </div>
              <div className="chart-sub" style={{ marginBottom: 0 }}>Select 2 to 5 ACOs for side-by-side; 6 or more shows the group totals. PY {year}.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="filter-pill" onClick={() => exportCSV(selRecs, `reach-selection-py${year}.csv`)}>Download CSV</button>
              <button className="filter-pill" onClick={() => setSelected(new Set())}>Clear</button>
            </div>
          </div>
          {selRecs.length >= 2 && selRecs.length <= 5 ? (
            <div className="tbl-scroll">
              <table className="data-table">
                <thead><tr><th>Metric</th>{selRecs.map(r => <th key={r.aco_id} style={{ textTransform: 'none', letterSpacing: 0 }}>{r.aco_name}<div style={{ fontWeight: 400, color: 'var(--teal-dark)' }}>{r.aco_id}</div></th>)}</tr></thead>
                <tbody>{compMetrics.map(([l, f, val, hiBest]) => {
                  const vals = val ? selRecs.map(val).filter(v => v != null) : [];
                  const best = vals.length ? (hiBest ? Math.max(...vals) : Math.min(...vals)) : null;
                  return (<tr key={l}><td style={{ fontWeight: 600, color: 'var(--gray-600)' }}>{l}</td>
                    {selRecs.map(r => <td key={r.aco_id} style={{ fontWeight: val && val(r) === best ? 700 : 400, color: val && val(r) === best ? 'var(--teal-dark)' : undefined }}>{f(r)}</td>)}</tr>);
                })}</tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {[['% Earning Savings', fmt.pct(selStats.pctEarning, 1)], ['Avg Savings Rate', fmt.pct(selStats.avgSavRate, 2)],
                ['Gross Rate (CMS basis)', fmt.pct(selStats.grossRateCMS, 2)], ['Total Earned', fmt.dollars(selStats.totalEarned)],
                ['Avg Quality Score', fmt.pct(selStats.avgQual, 1)], ['Avg Expense PBPM', money2(selStats.avgPBPM)]].map(([l, v]) => (
                <div key={l} className="kpi-card" style={{ padding: '10px 12px' }}><div className="kpi-label">{l}</div><div className="kpi-value" style={{ fontSize: '1.1rem' }}>{v}</div></div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="chart-grid-2">
        <ChartCard title="Earned Savings per Beneficiary vs. Quality Score" filename={`reach-cohort-earned-vs-quality-py${year}`}
          sub={`Each dot is one ACO, PY ${year}. Click a dot to add it to the comparison. Line shows the trend.`}>
          {qualVaries ? (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="qual_scr" type="number" domain={['dataMin', 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v)}%`}
                  label={{ value: 'Quality Score', position: 'insideBottom', offset: -6, fontSize: 11 }} />
                <YAxis dataKey="shared_per_bene" type="number" tick={{ fontSize: 11 }} width={56}
                  tickFormatter={v => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString()}`} />
                <Tooltip content={<Tip rows={[['Quality Score', d => fmt.pct(d.qual_scr, 1)], ['Earned per Beneficiary', d => money2(d.shared_per_bene)], ['Savings Rate', d => fmt.pct(d.sav_rate, 2)]]} />} />
                <ReferenceLine y={0} stroke="var(--gray-400)" />
                <Scatter data={earnQual} shape={dot(d => d.shared_per_bene >= 0 ? COLORS.teal : COLORS.red)} isAnimationActive={false} />
                {earnQualTrend && <Scatter data={earnQualTrend.map(p => ({ qual_scr: p.x, shared_per_bene: p.y }))} line={{ stroke: COLORS.navy, strokeDasharray: '5 4' }} shape={() => null} isAnimationActive={false} />}
              </ScatterChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">Every ACO received the same quality score in PY {year} (pay-for-reporting), so there is nothing to plot. Choose PY 2023 or later.</div>}
        </ChartCard>

        <ChartCard title="Savings Rate vs. Normalized Risk Score" filename={`reach-cohort-rate-vs-risk-py${year}`}
          sub={`Each dot is one ACO, PY ${year}. Colored by configuration. Line shows the trend.`}>
          {rateRisk.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="norm_risk_score" type="number" domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(2)}
                  label={{ value: 'Normalized Risk Score', position: 'insideBottom', offset: -6, fontSize: 11 }} />
                <YAxis dataKey="sav_rate" type="number" tick={{ fontSize: 11 }} width={46} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip content={<Tip rows={[['Risk Score', d => d.norm_risk_score?.toFixed(3)], ['Savings Rate', d => fmt.pct(d.sav_rate, 2)], ['Beneficiaries', d => fmt.num(d.bene_cnt)]]} />} />
                <ReferenceLine y={0} stroke="var(--gray-400)" />
                <Scatter data={rateRisk} shape={dot(d => CONFIG_COLORS[d.config_key] || COLORS.gray)} isAnimationActive={false} />
                {rateRiskTrend && <Scatter data={rateRiskTrend.map(p => ({ norm_risk_score: p.x, sav_rate: p.y }))} line={{ stroke: COLORS.navy, strokeDasharray: '5 4' }} shape={() => null} isAnimationActive={false} />}
              </ScatterChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">CMS publishes the normalized risk score from PY 2023. Choose PY 2023 or later.</div>}
        </ChartCard>
      </div>

      <ChartCard title="Savings Rate Distribution" filename={`reach-cohort-distribution-py${year}`}
        sub={`Number of ACOs in each savings rate band, PY ${year}`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dist} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={34} />
            <Tooltip formatter={v => [v, 'ACOs']} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {dist.map(d => <Cell key={d.label} fill={d.pos ? COLORS.teal : COLORS.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div>
            <div className="chart-title">ACOs in Cohort</div>
            <div className="chart-sub" style={{ marginBottom: 0 }}>Check rows to compare. Click a name to open its deep dive.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <button className="filter-pill" onClick={() => setSelected(new Set(sorted.map(r => r.aco_id)))}>Select all</button>
            <button className="filter-pill" onClick={() => exportCSV(sorted, `reach-cohort-py${year}.csv`)}>Download CSV</button>
            Rows
            <select style={{ ...selectStyle, padding: '4px 6px' }} value={rows} onChange={e => { setRows(e.target.value === 'All' ? 'All' : +e.target.value); reset(); }}>
              {ROWS_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table cohort-table">
            <thead><tr>
              <th />
              <Th col="aco_name">ACO</Th>
              <Th col="config_key" tip={TOOLTIPS.config}>Configuration</Th>
              <Th col="bene_cnt">Beneficiaries</Th>
              <Th col="sav_rate" tip={TOOLTIPS.sav_rate}>Savings Rate</Th>
              <Th col="shared_savings" tip={TOOLTIPS.shared_savings}>Earned Savings</Th>
              <Th col="shared_per_bene" tip={TOOLTIPS.shared_per_bene}>Per Beneficiary</Th>
              <Th col="qual_scr" tip={TOOLTIPS.qual_scr}>Quality</Th>
              <Th col="exp_pbpm" tip={TOOLTIPS.exp_pbpm}>Expense PBPM</Th>
              <Th col="norm_risk_score" tip={TOOLTIPS.risk_score}>Risk Score</Th>
              <th />
            </tr></thead>
            <tbody>{paged.map(r => (
              <tr key={r.aco_id} style={{ background: selected.has(r.aco_id) ? 'var(--teal-light)' : undefined }}>
                <td><input type="checkbox" checked={selected.has(r.aco_id)} onChange={() => toggle(r.aco_id)} aria-label={`Select ${r.aco_name}`} /></td>
                <td><button onClick={() => navigateToACO(r)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--navy)', fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', fontSize: 13 }}>{r.aco_name}</button>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{r.aco_id} · {r.aco_type}</div></td>
                <td>{CONFIG_LABELS[r.config_key] || r.config_key}</td>
                <td>{fmt.num(r.bene_cnt)}</td>
                <td style={{ fontWeight: 600, color: r.sav_rate >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt.pct(r.sav_rate, 2)}</td>
                <td>{fmt.dollars(r.shared_savings)}</td>
                <td>{money2(r.shared_per_bene)}</td>
                <td>{fmt.pct(r.qual_scr, 1)}</td>
                <td>{money2(r.exp_pbpm)}</td>
                <td>{r.norm_risk_score?.toFixed(3) ?? '—'}</td>
                <td><button className="filter-pill" style={{ padding: '2px 8px' }} onClick={() => pinACO(r)}>{pinnedACO?.aco_id === r.aco_id ? 'Pinned' : 'Pin'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 12, color: 'var(--gray-500)' }}>
            <button className="filter-pill" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
            Page {page + 1} of {pages}
            <button className="filter-pill" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
