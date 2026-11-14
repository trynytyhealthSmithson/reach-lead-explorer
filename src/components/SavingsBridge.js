import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine, LabelList } from 'recharts';
import ChartCard from './ChartCard';
import { COLORS, CONFIG_LABELS, monthsFor } from '../utils';

const UP = COLORS.green, DOWN = COLORS.red, TOTAL = COLORS.navy;
const f = v => v || 0;
const money = v => {
  if (v == null || !isFinite(v)) return 'n/a';
  const s = v < 0 ? '-' : '', a = Math.abs(v);
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`;
  return `${s}$${Math.round(a)}`;
};
const signed = v => (v > 0 ? '+' : '') + money(v);

// Benchmark for savings = final benchmark + population adjustment (HEBA through PY 2023, PA in PY 2024).
// Gross savings = that benchmark minus total cost of care after stop-loss. CMS publishes every term.
const popAdj = r => f(r.heba_up_amt) + f(r.heba_down_amt);
const benchForSavings = r => f(r.final_benchmark) + popAdj(r);
const benchMonths = r => f(r.bene_cnt) * monthsFor(r.perf_year);

function sumRecs(recs) {
  const s = k => recs.reduce((t, r) => t + f(typeof k === 'function' ? k(r) : r[k]), 0);
  return {
    unadj: s('unadj_benchmark'),
    discount: s(r => r.discount ? -f(r.final_benchmark) * (r.discount / 100) / (1 - r.discount / 100) : 0),
    final: s('final_benchmark'),
    pa: s(popAdj),
    cost: s('tot_cost_care'),
    costNet: s('tot_cost_care_net'),
    gross: s('gross_savings'),
    shared: s('shared_savings'),
    seq: s('shared_savings_seq'),
    bm: s(benchMonths),
  };
}

function waterfall(steps) {
  let cum = 0;
  return steps.map(st => {
    if (st.total) { cum = st.v; return { ...st, range: [Math.min(0, st.v), Math.max(0, st.v)], kind: 'total' }; }
    const next = cum + st.v; const row = { ...st, range: [Math.min(cum, next), Math.max(cum, next)], kind: st.v >= 0 ? 'up' : 'down' }; cum = next; return row;
  });
}

function Waterfall({ rows, height = 340 }) {
  const tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload;
    return <div className="custom-tooltip" style={{ maxWidth: 320 }}><div className="custom-tooltip-title">{r.name}</div>
      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{r.kind === 'total' ? money(r.v) : signed(r.v)}</div>
      {r.note && <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 4, lineHeight: 1.45 }}>{r.note}</div>}</div>;
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows.map(r => ({ ...r, lbl: r.kind === 'total' ? money(r.v) : signed(r.v) }))} margin={{ top: 24, right: 12, left: 8, bottom: 44 }}>
        <CartesianGrid stroke="var(--gray-100)" vertical={false} />
        <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={64} />
        <YAxis tickFormatter={money} tick={{ fontSize: 11 }} width={64} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(32,178,170,0.06)' }} />
        <ReferenceLine y={0} stroke="var(--gray-400)" />
        <Bar dataKey="range" isAnimationActive={false} radius={[3, 3, 3, 3]}>
          {rows.map(r => <Cell key={r.name} fill={r.kind === 'total' ? TOTAL : r.kind === 'up' ? UP : DOWN} />)}
          <LabelList dataKey="lbl" position="top" style={{ fontSize: 11, fill: 'var(--gray-700)', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function SavingsBridge({ perfData, navigateToACO, pinnedACO }) {
  const records = useMemo(() => perfData?.records || [], [perfData]);
  const years = useMemo(() => perfData?.years || [], [perfData]);
  const acos = useMemo(() => {
    const m = {}; records.forEach(r => { m[r.aco_id] = r.aco_name; });
    return Object.entries(m).map(([id, n]) => ({ id, n })).sort((a, b) => a.n.localeCompare(b.n));
  }, [records]);
  const [aco, setAco] = useState(pinnedACO?.aco_id || null);
  const [year, setYear] = useState(years[years.length - 1]);
  const [mode, setMode] = useState('within');
  const [q, setQ] = useState('');

  const acoYears = aco ? records.filter(r => r.aco_id === aco).map(r => r.perf_year) : years;
  const yr = acoYears.includes(year) ? year : acoYears[acoYears.length - 1];
  const prevYr = years[years.indexOf(yr) - 1];
  const cur = records.filter(r => r.perf_year === yr && (!aco || r.aco_id === aco));
  const name = aco ? (acos.find(a => a.id === aco)?.n || aco) : 'All ACO REACH ACOs';
  const one = aco ? cur[0] : null;
  const t = sumRecs(cur);
  const otherAdj = t.final - t.unadj - t.discount;
  const stopLoss = t.cost - t.costNet;

  const benchRows = waterfall([
    { name: 'Unadjusted benchmark', v: t.unadj, total: true, note: 'Benchmark before adjustments, withhold, discounts and the retrospective trend adjustment (CMS definition).' },
    { name: 'Discount', v: t.discount, note: 'Estimated from the published discount rate: final benchmark × discount ÷ (1 − discount). Applies to Global ACOs only.' },
    { name: 'Other adjustments', v: otherAdj, note: 'Everything else between the unadjusted and final benchmark: risk adjustment, trend, the retention withhold and the retrospective trend adjustment. CMS does not publish these separately.' },
    { name: 'Population adjustment', v: t.pa, note: yr >= 2024 ? 'PY 2024 Population Adjustment (formerly HEBA), net of increases and decreases.' : 'Health Equity Benchmark Adjustment (HEBA), net of increases and decreases. Began in PY 2023.' },
    { name: 'Benchmark for savings', v: t.final + t.pa, total: true, note: 'Final benchmark plus the population adjustment.' },
    { name: 'Total cost of care', v: -t.cost, note: 'Total cost of care for aligned beneficiaries before stop-loss.' },
    { name: 'Stop-loss', v: stopLoss, note: 'Reduction in counted cost from the stop-loss arrangement (total cost of care before stop-loss minus after).' },
    { name: 'Gross savings', v: t.gross, total: true, note: 'Benchmark for savings minus total cost of care after stop-loss, as CMS publishes it.' },
  ].filter(s => s.total || Math.abs(s.v) > 0.5));

  const shareRows = waterfall([
    { name: 'Gross savings', v: t.gross, total: true },
    { name: 'Sharing rate, corridors and quality', v: t.shared - t.gross, note: 'Difference between gross savings and the amount shared with the ACO: the sharing rate for Professional ACOs, risk corridors and the quality withhold.' },
    { name: 'Earned (shared) savings', v: t.shared, total: true, note: 'Amount of gross savings to be shared with the ACO (CMS definition).' },
    { name: 'Sequestration', v: t.seq - t.shared, note: 'Federal budget sequestration applied to the shared amount.' },
    { name: 'After sequestration', v: t.seq, total: true },
  ]);

  // Year over year: continuing ACOs split into volume, benchmark PBPM and cost PBPM; program view adds joiners and leavers
  const yoy = useMemo(() => {
    if (!prevYr) return null;
    const P = Object.fromEntries(records.filter(r => r.perf_year === prevYr).map(r => [r.aco_id, r]));
    const C = Object.fromEntries(records.filter(r => r.perf_year === yr).map(r => [r.aco_id, r]));
    const ids = aco ? [aco] : [...new Set([...Object.keys(P), ...Object.keys(C)])];
    let vol = 0, bench = 0, cost = 0, joined = 0, left = 0, nj = 0, nl = 0, s0 = 0, s1 = 0;
    ids.forEach(id => {
      const p = P[id], c = C[id];
      if (p) s0 += f(p.gross_savings);
      if (c) s1 += f(c.gross_savings);
      if (p && c) {
        const m0 = benchMonths(p), m1 = benchMonths(c);
        if (!m0 || !m1) return;
        const b0 = benchForSavings(p) / m0, b1 = benchForSavings(c) / m1, k0 = f(p.tot_cost_care_net) / m0, k1 = f(c.tot_cost_care_net) / m1;
        vol += (m1 - m0) * (b0 - k0); bench += m1 * (b1 - b0); cost -= m1 * (k1 - k0);
      } else if (c) { joined += f(c.gross_savings); nj++; } else if (p) { left -= f(p.gross_savings); nl++; }
    });
    if (aco && !(P[aco] && C[aco])) return { missing: true };
    const steps = [
      { name: `PY ${prevYr} gross savings`, v: s0, total: true },
      !aco && { name: 'ACOs that left', v: left, note: `Last year’s gross savings of the ${nl} ACOs not in PY ${yr} results.` },
      !aco && { name: 'ACOs that joined', v: joined, note: `PY ${yr} gross savings of the ${nj} ACOs new to the results.` },
      { name: 'Beneficiary months', v: vol, note: `Change in aligned beneficiary months, valued at last year’s savings per beneficiary month.${prevYr === 2021 ? ' PY 2021 had nine months.' : ''}` },
      { name: 'Benchmark per beneficiary month', v: bench, note: 'Change in the benchmark for savings per beneficiary month (including the discount and population adjustment), at this year’s volume.' },
      { name: 'Cost per beneficiary month', v: cost, note: 'Change in total cost of care after stop-loss per beneficiary month. Higher cost lowers savings.' },
      { name: `PY ${yr} gross savings`, v: s1, total: true },
    ].filter(Boolean);
    return { rows: waterfall(steps), s0, s1, vol, bench, cost, joined, left, nj, nl };
  }, [records, aco, yr, prevYr]);

  const narrative = (() => {
    if (mode === 'within') {
      const rate = t.final + t.pa ? t.gross / (t.final + t.pa) * 100 : null;
      const cmsBasis = t.gross - t.discount;
      return `In PY ${yr}, ${aco ? 'this ACO' : 'ACO REACH ACOs'} spent ${money(t.costNet)} against a benchmark of ${money(t.final + t.pa)}, for gross savings of ${money(t.gross)} (${rate?.toFixed(2)}% of the benchmark). ${money(t.shared)} of that was shared with ${aco ? 'the ACO' : 'ACOs'}${t.seq !== t.shared ? `, or ${money(t.seq)} after sequestration` : ''}.${t.discount ? ` Adding back the ${money(-t.discount)} discount gives ${money(cmsBasis)}, the basis CMS uses for program results.` : ''}`;
    }
    if (!yoy || yoy.missing) return null;
    const parts = [['beneficiary months', yoy.vol], ['the benchmark per beneficiary month', yoy.bench], ['cost per beneficiary month', yoy.cost]]
      .concat(aco ? [] : [['ACOs that joined', yoy.joined], ['ACOs that left', yoy.left]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const d = yoy.s1 - yoy.s0;
    return `Gross savings ${d >= 0 ? 'rose' : 'fell'} ${money(Math.abs(d))} from PY ${prevYr} to PY ${yr}. The largest driver was ${parts[0][0]} (${signed(parts[0][1])}), followed by ${parts[1][0]} (${signed(parts[1][1])}).`;
  })();

  const csv = rows => {
    const body = [['step', 'amount', 'note'], ...rows.map(r => [r.name, Math.round(r.v), r.note || ''])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + body.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `reach-savings-bridge-${aco || 'program'}-${mode}-py${yr}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const field = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const input = { font: '500 13px var(--font)', padding: '7px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', textTransform: 'none', letterSpacing: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="chart-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
        <label style={{ ...field, flex: '1 1 320px' }}>ACO
          <input list="bridge-acos" style={input} value={q} placeholder="Type an ACO name or ID, or leave blank for the whole program"
            onChange={e => { const v = e.target.value; setQ(v); const m = v.match(/\b(D\d{4})\b/); if (m && acos.some(a => a.id === m[1])) { setAco(m[1]); setQ(''); } }} />
          <datalist id="bridge-acos">{acos.map(a => <option key={a.id} value={`${a.n} (${a.id})`} />)}</datalist>
        </label>
        <label style={field}>Performance Year
          <select style={input} value={yr} onChange={e => setYear(+e.target.value)}>{acoYears.map(y => <option key={y} value={y}>PY {y}</option>)}</select></label>
        <div style={field}>View
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <button className={`filter-pill ${mode === 'within' ? 'active' : ''}`} onClick={() => setMode('within')}>Benchmark to savings</button>
            <button className={`filter-pill ${mode === 'yoy' ? 'active' : ''}`} onClick={() => setMode('yoy')}>Change from prior year</button>
          </div></div>
        {aco && <button className="filter-pill" onClick={() => setAco(null)}>Whole program</button>}
      </div>

      <div className="chart-card" style={{ borderLeft: '4px solid var(--teal)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {aco ? `${aco} · ${CONFIG_LABELS[one?.config_key] || one?.config_key || ''} · ${one?.aco_type || ''}` : `ACO REACH · ${cur.length} ACOs`}
        </div>
        <div className="chart-title" style={{ fontSize: '1.3rem', margin: '4px 0' }}>{name}</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gray-700)', maxWidth: 920 }}>
          {narrative || (mode === 'yoy' && !prevYr ? `PY ${yr} is the first year of results, so there is no prior year to compare.` : `This ACO was not in the results for both PY ${prevYr} and PY ${yr}.`)}
        </p>
        {aco && navigateToACO && <button className="filter-pill" style={{ marginTop: 8 }} onClick={() => navigateToACO({ aco_id: aco, aco_name: name })}>Open the ACO Deep Dive</button>}
      </div>

      {mode === 'within' ? (
        <>
          <ChartCard title={`From Benchmark to Gross Savings, PY ${yr}`} filename={`reach-bridge-benchmark-${aco || 'program'}-py${yr}`}
            sub="Navy bars are totals; green steps raised savings and red steps lowered them. Hover a bar for its definition."
            headerRight={<button className="filter-pill" onClick={() => csv([...benchRows, ...shareRows.slice(1)])}>Download CSV</button>}>
            <Waterfall rows={benchRows} />
          </ChartCard>
          <ChartCard title={`From Gross Savings to Earned Savings, PY ${yr}`} filename={`reach-bridge-shared-${aco || 'program'}-py${yr}`}
            sub="How much of gross savings reached the ACO.">
            <Waterfall rows={shareRows} height={300} />
          </ChartCard>
        </>
      ) : yoy && !yoy.missing ? (
        <ChartCard title={`Change in Gross Savings, PY ${prevYr} to PY ${yr}`} filename={`reach-bridge-yoy-${aco || 'program'}-py${yr}`}
          sub={aco ? 'Splits the change into beneficiary volume, benchmark per beneficiary month and cost per beneficiary month. The three steps add up exactly.' : 'Continuing ACOs are split into volume, benchmark and cost; ACOs that joined or left are shown separately. The steps add up exactly.'}
          headerRight={<button className="filter-pill" onClick={() => csv(yoy.rows)}>Download CSV</button>}>
          <Waterfall rows={yoy.rows} />
        </ChartCard>
      ) : null}

      <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.6 }}>
        Every amount comes from the CMS ACO REACH Financial and Quality Results PUF, which reports results prior to settlement. The only estimated step is the split between the discount and other benchmark adjustments, which uses the published discount rate.
      </div>
    </div>
  );
}
