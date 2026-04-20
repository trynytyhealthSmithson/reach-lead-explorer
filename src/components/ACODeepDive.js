import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { fmt, COLORS, CONFIG_COLORS, CONFIG_LABELS, CAHPS_LABELS } from '../utils';
import acoList from '../data/reach_aco_list.json';
import { generateACOReport } from '../generateACOReport';

const sortedACOs = [...acoList].sort((a, b) => a.aco_name.localeCompare(b.aco_name));

// ── Helper components ────────────────────────────────────────────────────────

function ACOSearch({ onSelect }) {
  const [query, setQuery]   = useState('');
  const [open,  setOpen]    = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return sortedACOs.slice(0, 50);
    const q = query.toLowerCase();
    return sortedACOs.filter(a =>
      a.aco_name.toLowerCase().includes(q) || a.aco_id.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query]);

  const select = (aco) => { setQuery(aco.aco_name); setOpen(false); onSelect(aco); };

  return (
    <div style={{ position:'relative', maxWidth:540 }}>
      <input type="text" value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search ACO name or ID…"
        style={{ width:'100%', padding:'9px 13px', fontSize:13,
          border:'1.5px solid var(--gray-300)', borderRadius:'var(--radius)',
          outline:'none', fontFamily:'var(--font)' }}/>
      {open && results.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:99,
          background:'white', border:'1px solid var(--gray-200)', borderRadius:'var(--radius)',
          boxShadow:'var(--shadow-lg)', maxHeight:340, overflowY:'auto', marginTop:4 }}>
          {results.map(a => (
            <div key={a.aco_id} onMouseDown={() => select(a)}
              style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--gray-100)',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--blue-light)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div>
                <div style={{ fontWeight:500, fontSize:13, color:'var(--navy)' }}>{a.aco_name}</div>
                <div style={{ fontSize:11, color:'var(--gray-500)' }}>
                  {a.aco_id} · First: PY {a.first_part_year} · {a.years_count} yr{a.years_count>1?'s':''}
                  {a.config_keys?.length ? ` · ${a.config_keys.join(', ')}` : ''}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:8 }}>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:12, fontWeight:600,
                  background:'var(--teal-light)', color:'var(--teal-dark)' }}>
                  {a.years_count} yr{a.years_count>1?'s':''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleGroup({ value, options, onChange }) {
  return (
    <div style={{ display:'flex', border:'1px solid var(--gray-300)',
      borderRadius:'var(--radius)', overflow:'hidden', flexShrink:0 }}>
      {options.map((opt,i) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          style={{ padding:'4px 11px', fontSize:11, fontFamily:'var(--font)', cursor:'pointer',
            border:'none', borderRight:i<options.length-1?'1px solid var(--gray-300)':'none',
            background:value===opt.value?'var(--navy)':'white',
            color:value===opt.value?'white':'var(--gray-600)',
            fontWeight:value===opt.value?600:400 }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const KPICard = ({ title, value, sub, color, note }) => (
  <div className="chart-card" style={{ padding:'14px 16px' }}>
    <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase',
      letterSpacing:'0.07em', marginBottom:6 }}>{title}</div>
    <div style={{ fontSize:'1.5rem', fontWeight:700, color: color||'var(--navy)', lineHeight:1 }}>{value}</div>
    {sub  && <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:4 }}>{sub}</div>}
    {note && <div style={{ fontSize:10, color:'var(--gray-400)', marginTop:3, fontStyle:'italic' }}>{note}</div>}
  </div>
);

// ── BenchmarkModeToggle: combined benchmark + savings rate chart ─────────────

function BenchmarkModeToggle({ acoRecords }) {
  const [mode, setMode] = useState('total');

  const data = useMemo(() => acoRecords.map(r => {
    const b = r.bene_cnt || 1;
    const m = r.perf_year === 2021 ? 9 : 12;
    const div = mode==='total' ? 1 : mode==='perbene' ? b : b * m;
    return {
      year:        r.perf_year,
      Benchmark:   r.final_benchmark != null ? +(r.final_benchmark / div).toFixed(mode==='total'?0:2) : null,
      'Total Cost':r.tot_cost_care   != null ? +(r.tot_cost_care   / div).toFixed(mode==='total'?0:2) : null,
      sav_rate:    r.sav_rate,
    };
  }), [acoRecords, mode]);

  const yFmt = mode==='total'   ? v=>`$${(v/1e6).toFixed(1)}M`
             : mode==='perbene' ? v=>`$${Number(v).toLocaleString()}`
             : v=>`$${Number(v).toFixed(2)}`;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontSize:12,color:'var(--gray-500)'}}>
          Gap between lines = gross savings. Bars = savings rate (right axis).
        </div>
        <ToggleGroup value={mode} onChange={setMode} options={[
          {value:'total',   label:'Total ($)'},
          {value:'perbene', label:'Per Bene'},
          {value:'pbpm',    label:'PBPM'},
        ]}/>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{top:8,right:56,left:0,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
          <XAxis dataKey="year" tick={{fontSize:11}}/>
          <YAxis yAxisId="left" tickFormatter={yFmt} tick={{fontSize:11}} width={72}/>
          <YAxis yAxisId="right" orientation="right" tickFormatter={v=>`${Number(v).toFixed(1)}%`}
            tick={{fontSize:11}} width={44} domain={['auto','auto']}/>
          <Tooltip content={({active,payload,label})=>{
            if (!active||!payload?.length) return null;
            return (
              <div className="custom-tooltip">
                <div className="custom-tooltip-title">PY {label}</div>
                {payload.map((p,i)=>p.value!=null&&(
                  <div key={i} className="custom-tooltip-row">
                    <span style={{color:p.color||p.fill}}>{p.name}</span>
                    <span className="custom-tooltip-val">
                      {p.name==='Savings Rate'?`${Number(p.value).toFixed(2)}%`:yFmt(p.value)}
                    </span>
                  </div>
                ))}
              </div>
            );
          }}/>
          <Legend wrapperStyle={{fontSize:11}}/>
          <Line yAxisId="left"  type="monotone" dataKey="Benchmark"  stroke={COLORS.blue} strokeWidth={2.5} dot={{r:5}}/>
          <Line yAxisId="left"  type="monotone" dataKey="Total Cost" stroke={COLORS.red}  strokeWidth={2.5} dot={{r:5}}/>
          <Bar  yAxisId="right" dataKey="sav_rate" name="Savings Rate" radius={[3,3,0,0]} opacity={0.6}>
            {data.map((d,i)=><Cell key={i} fill={(d.sav_rate||0)>0?COLORS.teal:COLORS.red}/>)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── SpendCategoryChart with PBPM / Per Bene / Aggregate toggle ───────────────

function SpendCategoryChart({ acoRecords }) {
  const [mode, setMode] = useState('pbpm');

  const data = useMemo(() => acoRecords.map(r => {
    const b = r.bene_cnt || 1;
    const m = r.perf_year === 2021 ? 9 : 12;
    const div = mode==='pbpm' ? b*m : mode==='perbene' ? b : 1;
    const f   = v => v!=null ? +(v/div).toFixed(mode==='aggregate'?0:2) : null;
    return {
      year:          r.perf_year,
      'Inpatient':   f(r.expnd_inp_all),
      'Physician':   f(r.expnd_pb),
      'Outpatient':  f(r.expnd_opd),
      'SNF':         f(r.expnd_snf),
      'Home Health': f(r.expnd_hha),
      'Hospice':     f(r.expnd_hsp),
    };
  }), [acoRecords, mode]);

  const yFmt = mode==='aggregate' ? v=>`$${(v/1e6).toFixed(0)}M`
             : mode==='perbene'   ? v=>`$${Number(v).toFixed(0)}`
             : v=>`$${Number(v).toFixed(2)}`;

  return (
    <div className="chart-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div>
          <div className="chart-title">Spend by Category</div>
          <div className="chart-subtitle">Stacked spend across service categories by year</div>
        </div>
        <ToggleGroup value={mode} onChange={setMode} options={[
          {value:'pbpm',      label:'PBPM'},
          {value:'perbene',   label:'Per Bene'},
          {value:'aggregate', label:'Total ($)'},
        ]}/>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{top:8,right:16,left:0,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
          <XAxis dataKey="year" tick={{fontSize:11}}/>
          <YAxis tickFormatter={yFmt} tick={{fontSize:11}} width={68}/>
          <Tooltip formatter={v=>[yFmt(v),'']}/>
          <Legend wrapperStyle={{fontSize:11}}/>
          <Bar dataKey="Inpatient"   stackId="a" fill={COLORS.navy}  radius={[0,0,0,0]}/>
          <Bar dataKey="Physician"   stackId="a" fill={COLORS.blue}  radius={[0,0,0,0]}/>
          <Bar dataKey="Outpatient"  stackId="a" fill={COLORS.teal}  radius={[0,0,0,0]}/>
          <Bar dataKey="SNF"         stackId="a" fill={COLORS.amber} radius={[0,0,0,0]}/>
          <Bar dataKey="Home Health" stackId="a" fill={COLORS.green} radius={[0,0,0,0]}/>
          <Bar dataKey="Hospice"     stackId="a" fill={COLORS.coral} radius={[3,3,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


// ── CapitationBreakdownCard with Aggregate / Per Bene / PBPM toggle ──────────

function CapitationBreakdownCard({ acoRecords }) {
  const [capMode, setCapMode] = useState('aggregate');

  const fmtVal = (val, r) => {
    if (val == null) return '—';
    const b = r.bene_cnt || 1;
    const m = r.perf_year === 2021 ? 9 : 12;
    if (capMode === 'aggregate') return `$${(val/1e6).toFixed(1)}M`;
    if (capMode === 'perbene')   return `$${(val/b).toLocaleString(undefined,{maximumFractionDigits:0})}`;
    return `$${(val/(b*m)).toFixed(2)}`;
  };

  const capData = acoRecords.map(r => {
    const tot = r.tot_cost_care || 1;
    return {
      year: r.perf_year,
      'CAP (PCC)':  r.cap_pmt  != null ? +(r.cap_pmt/tot*100).toFixed(1)  : null,
      'ePCC':       r.epcc_pmt != null ? +(r.epcc_pmt/tot*100).toFixed(1) : null,
      'CLM':        r.clm_pmt  != null ? +(r.clm_pmt/tot*100).toFixed(1)  : null,
    };
  });

  const CAPS = [
    { label:'CAP — Primary Care Capitation', key:'cap_pmt', color:COLORS.teal,
      note:'Monthly capitation for PCP services aligned to historical PCP spend. All PCC-arrangement ACOs receive this payment.' },
    { label:'ePCC — Enhanced PCC Capitation', key:'epcc_pmt', color:COLORS.green,
      note:'Additional capitation for ACOs electing Enhanced PCC — a bonus encouraging greater PCP utilization. Only flows to Enhanced PCC electors.' },
    { label:'CLM — Traditional Claims', key:'clm_pmt', color:COLORS.blue,
      note:'Fee-for-service claims outside capitation. Dominant payment type (~95% of total). APO modifies how non-PCP PCP services are structured within this category.' },
  ];

  return (
    <div className="chart-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div className="chart-title">Capitation Payment Breakdown</div>
          <div className="chart-subtitle">
            How total cost of care flows through each payment channel across performance years
          </div>
        </div>
        <ToggleGroup value={capMode} onChange={setCapMode} options={[
          { value:'aggregate', label:'Total ($)' },
          { value:'perbene',   label:'Per Bene' },
          { value:'pbpm',      label:'PBPM' },
        ]}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:8 }}>
        {CAPS.map(p => (
          <div key={p.label} style={{ padding:'16px', borderRadius:'var(--radius)',
            border:`1.5px solid ${p.color}33`, background:`${p.color}06` }}>
            <div style={{ fontSize:10, fontWeight:700, color:p.color, textTransform:'uppercase',
              letterSpacing:'0.06em', marginBottom:10 }}>{p.label}</div>
            {acoRecords.map(r => {
              const val = r[p.key];
              const tot = r.tot_cost_care || 1;
              const pct = val != null ? (val/tot*100).toFixed(1) : null;
              return (
                <div key={r.perf_year} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:8, paddingBottom:8,
                  borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:12, color:'var(--gray-500)', fontWeight:600 }}>PY{r.perf_year}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:20, fontWeight:700, color:'var(--navy)', lineHeight:1 }}>
                      {fmtVal(val, r)}
                    </div>
                    {capMode==='aggregate' && pct && (
                      <div style={{ fontSize:10, color:p.color, marginTop:2 }}>{pct}% of total</div>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize:10, color:'var(--gray-500)', marginTop:4, lineHeight:1.4 }}>
              {p.note}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:16 }}>
        <div style={{ fontSize:12, color:'var(--gray-500)', marginBottom:8, fontWeight:500 }}>
          Payment mix as % of total cost of care
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={capData} margin={{ top:4, right:12, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
            <XAxis dataKey="year" tick={{ fontSize:11 }}/>
            <YAxis tickFormatter={v=>`${v}%`} tick={{ fontSize:11 }}/>
            <Tooltip formatter={(v,n) => [`${v}%`, n]}/>
            <Legend wrapperStyle={{ fontSize:11 }}/>
            <Bar dataKey="CAP (PCC)" stackId="a" fill={COLORS.teal}  radius={[0,0,0,0]}/>
            <Bar dataKey="ePCC"      stackId="a" fill={COLORS.green} radius={[0,0,0,0]}/>
            <Bar dataKey="CLM"       stackId="a" fill={COLORS.blue}  radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


function computeRVM(curr, prev) {
  if (!curr || !prev) return [];
  const py_c = curr.bene_cnt || 1;
  const py_p = prev.bene_cnt || 1;

  const rvm = (name, tier, u_c, u_p, exp_c, exp_p, children) => {
    // Derive per-bene spend from total expense
    const cap_c = exp_c != null ? exp_c / py_c : null;
    const cap_p = exp_p != null ? exp_p / py_p : null;
    const cpe_c = (u_c > 0 && cap_c != null) ? cap_c / (u_c/1000) : null;
    const cpe_p = (u_p > 0 && cap_p != null) ? cap_p / (u_p/1000) : null;

    const total_c = cap_c != null ? cap_c * py_c : null;
    const total_p = cap_p != null ? cap_p * py_p : null;
    const total_d = (total_c != null && total_p != null) ? total_c - total_p : null;

    let panel_eff = null, vol_eff = null, rate_eff = null;
    if (cap_p != null) panel_eff = cap_p * (py_c - py_p);
    if (u_c != null && u_p != null && cpe_p != null)
      vol_eff = (u_c - u_p) / 1000 * cpe_p * py_p;
    if (cpe_c != null && cpe_p != null && u_c != null)
      rate_eff = (cpe_c - cpe_p) * (u_c/1000) * py_c;

    return { name, tier, u_c, u_p, cpe_c, cpe_p, cap_c, cap_p,
      total_c, total_p, total_d, panel_eff, vol_eff, rate_eff,
      children: children || [] };
  };

  return [
    rvm('Inpatient (Total)', 'full',
      curr.adm_n != null ? curr.adm_n / py_c * 1000 : null,
      prev.adm_n != null ? prev.adm_n / py_p * 1000 : null,
      curr.expnd_inp_all, prev.expnd_inp_all, [
        rvm('  Acute',  'mix',
          curr.adm_s_trm_n != null ? curr.adm_s_trm_n / py_c * 1000 : null,
          prev.adm_s_trm_n != null ? prev.adm_s_trm_n / py_p * 1000 : null,
          curr.expnd_inp_s_trm, prev.expnd_inp_s_trm),
        rvm('  Rehab',  'mix',
          curr.adm_rehab_n != null ? curr.adm_rehab_n / py_c * 1000 : null,
          prev.adm_rehab_n != null ? prev.adm_rehab_n / py_p * 1000 : null,
          curr.expnd_inp_rehab, prev.expnd_inp_rehab),
      ]),
    // SNF with LOS + day rate decomposition
    {
      ...rvm('SNF', 'full', curr.p_snf_adm, prev.p_snf_adm, curr.expnd_snf, prev.expnd_snf),
      _snf_detail: {
        los_c: curr.snf_los, los_p: prev.snf_los,
        payperday_c: curr.snf_payperstay && curr.snf_los ? curr.snf_payperstay / curr.snf_los : null,
        payperday_p: prev.snf_payperstay && prev.snf_los ? prev.snf_payperstay / prev.snf_los : null,
      }
    },
    rvm('ED Visits (non-hosp)', 'volume',
      curr.p_edv_vis != null ? curr.p_edv_vis - (curr.p_edv_vis_hosp||0) : null,
      prev.p_edv_vis != null ? prev.p_edv_vis - (prev.p_edv_vis_hosp||0) : null, null, null),
    rvm('PCP E&M Visits', 'volume', curr.p_em_pcp_vis, prev.p_em_pcp_vis, null, null),
    rvm('Specialist E&M',  'volume', curr.p_em_sp_vis,  prev.p_em_sp_vis,  null, null),
    rvm('Outpatient (OPD)', 'spend', null, null, curr.expnd_opd, prev.expnd_opd),
    rvm('Physician / PB',   'spend', null, null, curr.expnd_pb,  prev.expnd_pb),
    rvm('Home Health',      'spend', null, null, curr.expnd_hha, prev.expnd_hha),
    rvm('Hospice',          'spend', null, null, curr.expnd_hsp, prev.expnd_hsp),
  ];
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ACODeepDive({
  perfData, initialACO, initialVersion,
  pinnedACO, pinACO, unpinACO, goToLEAD
}) {
  const [selectedACO, setSelectedACO] = useState(null);
  const [activeTab,   setActiveTab]   = useState('overview');
  const [reportStatus, setReportStatus] = useState(null); // null | 'loading' | string
  const [rvmPair,     setRvmPair]     = useState(null); // {from, to, idx}

  const records = useMemo(() => perfData?.records || [], [perfData]);

  const handleExportReport = async () => {
    if (!aco || !latest) return;
    try {
      await generateACOReport(
        aco, acoRecords, records,
        (msg) => setReportStatus(msg)
      );
      setReportStatus(null);
    } catch (err) {
      console.error('Report generation failed:', err);
      setReportStatus('Error — please try again');
      setTimeout(() => setReportStatus(null), 3000);
    }
  };

  // Handle navigation from Program Overview
  useEffect(() => {
    if (initialACO) setSelectedACO(initialACO);
  }, [initialACO, initialVersion]);

  const aco = selectedACO;

  // All records for this ACO, sorted
  const acoRecords = useMemo(() => {
    if (!aco) return [];
    return records
      .filter(r => r.aco_id === aco.aco_id)
      .sort((a,b) => a.perf_year - b.perf_year);
  }, [aco, records]);

  const latest = acoRecords[acoRecords.length - 1];
  const prior  = acoRecords[acoRecords.length - 2];

  // Year pairs for RVM
  const yearPairs = useMemo(() => {
    const pairs = [];
    for (let i = 1; i < acoRecords.length; i++)
      pairs.push({ from: acoRecords[i-1].perf_year, to: acoRecords[i].perf_year, idx: i });
    return pairs;
  }, [acoRecords]);

  useEffect(() => {
    if (yearPairs.length > 0 && !rvmPair) setRvmPair(yearPairs[yearPairs.length - 1]);
  }, [yearPairs, rvmPair]);

  useEffect(() => {
    if (yearPairs.length > 0) setRvmPair(yearPairs[yearPairs.length - 1]);
  }, [aco?.aco_id]); // eslint-disable-line

  // RVM data
  const rvmRows = useMemo(() => {
    if (!rvmPair) return [];
    return computeRVM(acoRecords[rvmPair.idx], acoRecords[rvmPair.idx - 1]);
  }, [rvmPair, acoRecords]);

  // Peer comparison: same config_key + same perf year as latest
  const peerRecs = useMemo(() => {
    if (!latest) return [];
    return records.filter(r =>
      r.perf_year === latest.perf_year &&
      r.config_key === latest.config_key &&
      r.aco_id !== latest.aco_id
    );
  }, [latest, records]);

  const peerAvg = (key) => {
    const vals = peerRecs.map(r => r[key]).filter(v => v != null);
    return vals.length ? vals.reduce((s,v) => s+v, 0) / vals.length : null;
  };
  const peerPct = (key, val) => {
    if (val == null) return null;
    const vals = [...peerRecs.map(r => r[key]).filter(v => v != null), val].sort((a,b) => a-b);
    const rank = vals.filter(v => v < val).length;
    return Math.round(rank / (vals.length-1) * 100);
  };

  // CAHPS radar data

  // Capitation breakdown handled by CapitationBreakdownCard component



  // ── Format helpers ──
  const fmtM = (v) => v != null ? `$${(v/1e6).toFixed(1)}M` : '—';

  // ── RVM table render helpers ──
  const rvmFmtDollar = (v) => {
    if (v == null) return '—';
    const color = v > 0 ? COLORS.red : COLORS.green; // positive = more spending = bad
    return <span style={{color,fontWeight:600}}>{v>0?'+':''}{fmtM(v)}</span>;
  };

  const isPinned = pinnedACO?.aco_id === aco?.aco_id;

  // ── No ACO selected ──
  if (!aco) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div className="chart-card">
          <div className="chart-title" style={{ marginBottom:16 }}>Search for an ACO</div>
          <ACOSearch onSelect={(a) => { setSelectedACO(a); setActiveTab('overview'); }} />
          {pinnedACO && (
            <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(221,170,102,0.12)',
              borderRadius:'var(--radius)', border:'1px solid rgba(221,170,102,0.3)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--gold)', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:4 }}>📌 Pinned ACO</div>
              <div style={{ fontWeight:600, color:'var(--navy)', marginBottom:6 }}>{pinnedACO.aco_name}</div>
              <button onClick={() => { setSelectedACO(pinnedACO); setActiveTab('overview'); }}
                style={{ padding:'5px 14px', borderRadius:'var(--radius)', fontSize:12,
                  background:'var(--navy)', color:'white', border:'none', cursor:'pointer', fontWeight:600 }}>
                Load Pinned ACO
              </button>
            </div>
          )}
        </div>
        {/* Quick-select for multi-year ACOs */}
        <div className="chart-card">
          <div className="chart-title" style={{ marginBottom:10 }}>Multi-Year ACOs</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {sortedACOs.filter(a => a.years_count === 3).map(a => (
              <button key={a.aco_id}
                onClick={() => { setSelectedACO(a); setActiveTab('overview'); }}
                style={{ padding:'4px 10px', fontSize:11, borderRadius:20, cursor:'pointer',
                  border:'1.5px solid var(--teal)', background:'white', color:'var(--teal-dark)',
                  fontWeight:600 }}>
                {a.aco_name.length > 28 ? a.aco_name.slice(0,28)+'…' : a.aco_name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ACO selected — tabs ──
  const TABS = [
    { id:'overview',   label:'Overview' },
    { id:'rvm',        label:'Rate/Volume/Mix' },
    { id:'quality',    label:'Quality & CAHPS' },
    { id:'utilization',label:'Utilization' },
    { id:'capitation', label:'Capitation' },
    { id:'profile',    label:'Population' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── ACO Header ── */}
      <div style={{ background:'var(--navy)', borderRadius:'var(--radius-lg)', padding:'16px 22px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4,
              textTransform:'uppercase', letterSpacing:'0.06em' }}>
              ACO Deep Dive · {latest?.perf_year && `Last PY: ${latest.perf_year}`}
            </div>
            <div style={{ fontSize:'1.7rem', fontWeight:700, color:'white', lineHeight:1.2, marginBottom:8 }}>
              {aco.aco_name}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{aco.aco_id}</span>
              {latest && (
                <>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:600,
                    background: latest.config_key==='Global/TCC' ? `${COLORS.green}33` :
                                latest.config_key==='Global/PCC' ? `${COLORS.teal}33` : `${COLORS.blue}33`,
                    color:'white' }}>
                    {latest.config_key}
                  </span>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:600,
                    background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)' }}>
                    {aco.aco_type || latest.aco_type}
                  </span>
                  {latest.enhanced_pcc==='Yes' && (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:600,
                      background:'rgba(46,148,120,0.3)', color:COLORS.teal }}>ePCC</span>
                  )}
                  {latest.stop_loss==='Yes' && (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:600,
                      background:'rgba(51,91,116,0.4)', color:'rgba(255,255,255,0.7)' }}>Stop Loss</span>
                  )}
                  {latest.hpp_flag==='Yes' && (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:700,
                      background:`${COLORS.gold}33`, color:COLORS.gold }}>🏆 HPP</span>
                  )}
                  {latest.cisep_flag==='Yes' && (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12, fontWeight:600,
                      background:`${COLORS.green}22`, color:COLORS.teal }}>✓ CI/SEP</span>
                  )}
                </>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={() => setSelectedACO(null)}
              style={{ padding:'6px 12px', borderRadius:'var(--radius)', fontSize:11,
                background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)',
                border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer' }}>
              ← Back
            </button>
            {isPinned ? (
              <button onClick={unpinACO}
                style={{ padding:'6px 12px', borderRadius:'var(--radius)', fontSize:11,
                  background:`${COLORS.gold}22`, color:COLORS.gold, fontWeight:700,
                  border:`1px solid ${COLORS.gold}44`, cursor:'pointer' }}>
                📌 Pinned
              </button>
            ) : (
              <button onClick={() => pinACO && pinACO({
                aco_id:    aco.aco_id,
                aco_name:  aco.aco_name,
                aco_type:  aco.aco_type || latest?.aco_type,
                config_key: latest?.config_key,
                risk_arrangement: latest?.risk_arrangement,
                capitation: latest?.capitation,
                enhanced_pcc: latest?.enhanced_pcc,
                stop_loss: latest?.stop_loss,
                apo_election: latest?.apo_election,
                first_part_year: aco.first_part_year,
                years_count: acoRecords.length,
                latest_year: latest?.perf_year,
                latest_sav_rate: latest?.sav_rate,
                latest_shared: latest?.shared_savings,
                latest_qual: latest?.qual_scr,
                latest_bene_cnt: latest?.bene_cnt,
                cisep_flag: latest?.cisep_flag,
                hpp_flag: latest?.hpp_flag,
                acr_scr: latest?.acr_scr,
                perc_dual: latest?.perc_dual,
                all_records: acoRecords,
              })}
                style={{ padding:'6px 12px', borderRadius:'var(--radius)', fontSize:11,
                  background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)',
                  border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer' }}>
                📌 Pin ACO
              </button>
            )}
            <button onClick={handleExportReport}
              disabled={!!reportStatus}
              style={{ padding:'6px 14px', borderRadius:'var(--radius)', fontSize:11, fontWeight:700,
                background: reportStatus ? 'rgba(255,255,255,0.1)' : 'white',
                color: reportStatus ? 'rgba(255,255,255,0.5)' : 'var(--navy)',
                border:'none', cursor: reportStatus ? 'default' : 'pointer',
                minWidth:160, transition:'all 0.2s' }}>
              {reportStatus || '📄 Export Report →'}
            </button>
            <button onClick={goToLEAD}
              style={{ padding:'6px 14px', borderRadius:'var(--radius)', fontSize:11, fontWeight:700,
                background:`${COLORS.gold}`, color:'var(--navy)',
                border:'none', cursor:'pointer' }}>
              LEAD Transition →
            </button>
          </div>
        </div>

        {/* Year performance badges — evenly distributed */}
        <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
          {[...acoRecords, {perf_year:'peers', sav_rate:null, shared_savings:null, _isPeer:true}].map((r, i) => {
            const isPeer = r._isPeer;
            const isLatest = r.perf_year===latest?.perf_year;
            const isPos = (r.sav_rate||0) > 0;
            return (
              <div key={r.perf_year} style={{ flex:1, minWidth:100, padding:'12px 14px',
                borderRadius:'var(--radius)',
                background: isLatest?'rgba(255,255,255,0.14)':isPeer?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.07)',
                border:`1.5px solid ${isLatest?COLORS.teal+'66':isPeer?'rgba(255,255,255,0.08)':isPos?COLORS.teal+'33':'rgba(255,255,255,0.12)'}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)',
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>
                  {isPeer?'Config Peers':`PY${r.perf_year}${isLatest?' · Latest':''}`}
                </div>
                <div style={{ fontSize:22, fontWeight:800, lineHeight:1,
                  color: isPeer?'rgba(255,255,255,0.65)':isPos?COLORS.teal:COLORS.red }}>
                  {isPeer?peerRecs.length:r.sav_rate!=null?`${r.sav_rate.toFixed(2)}%`:'—'}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:4 }}>
                  {isPeer?`same config PY${latest?.perf_year}`:fmtM(r.shared_savings)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div style={{ display:'flex', gap:2, background:'var(--gray-100)', borderRadius:'var(--radius)',
        padding:3, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'7px 16px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600,
              cursor:'pointer', border:'none', transition:'all 0.15s',
              background: activeTab===t.id ? 'white' : 'transparent',
              color: activeTab===t.id ? 'var(--navy)' : 'var(--gray-500)',
              boxShadow: activeTab===t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* KPI row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <KPICard title="Latest Sav Rate"
              value={latest?.sav_rate!=null?`${latest.sav_rate.toFixed(2)}%`:'—'}
              color={(latest?.sav_rate||0)>0?COLORS.green:COLORS.red}
              sub={prior?.sav_rate!=null?`vs ${prior.sav_rate.toFixed(2)}% in PY${prior.perf_year}`:'First year'}/>
            <KPICard title="Earned Savings"
              value={fmtM(latest?.shared_savings)}
              sub={prior?`vs ${fmtM(prior.shared_savings)} in PY${prior.perf_year}`:''}/>
            <KPICard title="Beneficiaries"
              value={latest?.bene_cnt!=null?fmt.num(latest.bene_cnt):'—'}
              sub={prior?.bene_cnt!=null?`+${fmt.num(latest.bene_cnt-prior.bene_cnt)} vs PY${prior.perf_year}`:''}/>
            <KPICard title="Quality Score"
              value={latest?.qual_scr!=null?`${latest.qual_scr.toFixed(1)}%`:'—'}
              color={latest?.qual_scr!=null&&latest.qual_scr>=75?COLORS.green:COLORS.amber}
              sub={latest?.cisep_flag==='Yes'?'✓ CI/SEP met':latest?.perf_year===2021?'Pay-for-reporting':''}/>
          </div>

          {/* Config context + peer comparison */}
          <div className="grid-2">
            <div className="chart-card">
              <div className="chart-title">Configuration Context</div>
              <div style={{ marginTop:10 }}>
                {[
                  {label:'Risk Arrangement',    value:latest?.risk_arrangement||'—'},
                  {label:'Capitation Type',      value:latest?.capitation||'—'},
                  {label:'Enhanced PCC',         value:latest?.enhanced_pcc||'—', good:latest?.enhanced_pcc==='Yes'},
                  {label:'Stop Loss',            value:latest?.stop_loss||'—'},
                  {label:'APO Election',         value:latest?.apo_election||'—', good:latest?.apo_election==='Yes'},
                  {label:'Discount Rate',        value:latest?.discount!=null?`${latest.discount.toFixed(0)}%`:'—'},
                  {label:'First Part Year',      value:`PY ${aco.first_part_year||'—'}`},
                  {label:'Years Participating',  value:`${acoRecords.length} of 3`},
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--gray-100)' }}>
                    <span style={{ fontSize:12, color:'var(--gray-600)' }}>{row.label}</span>
                    <span style={{ fontSize:12, fontWeight:600,
                      color: row.good!=null?(row.good?COLORS.green:COLORS.gray):'var(--navy)' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, padding:'8px 12px', borderRadius:'var(--radius)',
                background:`${CONFIG_COLORS[latest?.config_key]||COLORS.gray}0f`,
                border:`1px solid ${CONFIG_COLORS[latest?.config_key]||COLORS.gray}22` }}>
                <div style={{ fontSize:10, fontWeight:700, color:CONFIG_COLORS[latest?.config_key]||COLORS.gray,
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                  {CONFIG_LABELS[latest?.config_key]||latest?.config_key}
                </div>
                <div style={{ fontSize:11, color:'var(--gray-600)', lineHeight:1.5 }}>
                  {latest?.config_key==='Global/TCC'
                    ? 'Full Medicare payment flow. Eligible for CARA episode arrangements in LEAD. Highest-performing configuration historically (6.4% avg, 93% savers in PY2023).'
                    : latest?.config_key==='Global/PCC'
                    ? 'Primary care capitation with traditional claims for specialists. Most common configuration (78 ACOs PY2023). Avg 5.2% savings rate in PY2023.'
                    : 'Professional risk — 50% of savings/losses. Lower risk but also lower upside. Avg 2.2% savings in PY2023. LEAD Professional track equivalent.'}
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Peer Comparison vs {latest?.config_key} ACOs (PY{latest?.perf_year})</div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginBottom:12 }}>
                {peerRecs.length} peers in same configuration
              </div>
              {[
                { label:'Savings Rate',     val:latest?.sav_rate,     peerKey:'sav_rate',     fmt_:v=>`${v.toFixed(2)}%`,  lowerBetter:false },
                { label:'Avg Expense PBPM', val:latest?.bene_cnt&&latest?.tot_cost_care?latest.tot_cost_care/latest.bene_cnt/(latest.perf_year===2021?9:12):null,
                  peerKey:null, fmt_:v=>`$${v.toFixed(0)}`, lowerBetter:true },
                { label:'Quality Score',    val:latest?.qual_scr,     peerKey:'qual_scr',     fmt_:v=>`${v.toFixed(1)}%`,  lowerBetter:false },
                { label:'ACR (readmit)',    val:latest?.acr_scr,      peerKey:'acr_scr',      fmt_:v=>v.toFixed(2),         lowerBetter:true  },
                { label:'SNF Admits/1K',    val:latest?.p_snf_adm,    peerKey:'p_snf_adm',    fmt_:v=>`${v.toFixed(1)}`,   lowerBetter:true  },
                { label:'ED Visits/1K',     val:latest?.p_edv_vis,    peerKey:'p_edv_vis',    fmt_:v=>`${v.toFixed(1)}`,   lowerBetter:true  },
                { label:'% Dual Eligible',  val:latest?.perc_dual,    peerKey:'perc_dual',    fmt_:v=>`${v.toFixed(1)}%`,  lowerBetter:null  },
              ].map(row => {
                const peer = row.peerKey ? peerAvg(row.peerKey) : null;
                const pct  = row.peerKey ? peerPct(row.peerKey, row.val) : null;
                const better = row.lowerBetter===false ? (row.val > peer) :
                               row.lowerBetter===true  ? (row.val < peer) : null;
                return (
                  <div key={row.label} style={{ display:'flex', alignItems:'center',
                    padding:'6px 0', borderBottom:'1px solid var(--gray-100)', gap:10 }}>
                    <div style={{ fontSize:11, color:'var(--gray-600)', width:130, flexShrink:0 }}>{row.label}</div>
                    <div style={{ fontSize:13, fontWeight:700,
                      color: better===true?COLORS.green:better===false?COLORS.red:'var(--navy)' }}>
                      {row.val!=null ? row.fmt_(row.val) : '—'}
                    </div>
                    <div style={{ fontSize:10, color:'var(--gray-400)', flex:1 }}>
                      {peer!=null ? `peer avg: ${row.fmt_(peer)}` : ''}
                    </div>
                    {pct!=null && (
                      <div style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:8,
                        background: (row.lowerBetter!==false?pct<40:pct>60) ? `${COLORS.green}18` : (row.lowerBetter!==false?pct>60:pct<40)?`${COLORS.red}18`:'var(--gray-100)',
                        color: (row.lowerBetter!==false?pct<40:pct>60) ? COLORS.green : (row.lowerBetter!==false?pct>60:pct<40)?COLORS.red:'var(--gray-500)' }}>
                        {pct}th pct
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combined: Benchmark vs Cost + Savings Rate overlay */}
          <div className="chart-card">
            <div className="chart-title">Benchmark vs. Actual Expense</div>
            <div className="chart-subtitle">
              Benchmark (blue) vs Total Cost (red) — gap = gross savings. Bars = savings rate (right axis).
            </div>
            <BenchmarkModeToggle acoRecords={acoRecords} />
          </div>

        </div>
      )}

      {/* ── RVM TAB ── */}
      {activeTab==='rvm' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="chart-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <div className="chart-title">Rate / Volume / Mix Analysis</div>
                <div className="chart-subtitle">
                  Decomposes year-over-year spending change into: Panel (enrollment change) ·
                  Volume (utilization rate change) · Rate (cost per event change)
                </div>
              </div>
              {yearPairs.length > 1 && (
                <ToggleGroup value={rvmPair ? `${rvmPair.from}-${rvmPair.to}` : ''} onChange={v => {
                  const [f,t] = v.split('-').map(Number);
                  setRvmPair(yearPairs.find(p => p.from===f && p.to===t));
                }} options={yearPairs.map(p => ({ value:`${p.from}-${p.to}`, label:`PY${p.from}→${p.to}` }))}/>
              )}
            </div>

            {rvmPair && (
              <div style={{ marginBottom:12, padding:'8px 12px', background:'var(--gray-50)',
                borderRadius:'var(--radius)', fontSize:12, color:'var(--gray-600)', display:'flex', gap:20 }}>
                <span>Benes: <strong>{fmt.num(acoRecords[rvmPair.idx-1]?.bene_cnt)} → {fmt.num(acoRecords[rvmPair.idx]?.bene_cnt)}</strong></span>
                <span>Total cost: <strong>{fmtM(acoRecords[rvmPair.idx-1]?.tot_cost_care)} → {fmtM(acoRecords[rvmPair.idx]?.tot_cost_care)}</strong></span>
                <span>Change: {rvmFmtDollar((acoRecords[rvmPair.idx]?.tot_cost_care||0) - (acoRecords[rvmPair.idx-1]?.tot_cost_care||0))}</span>
              </div>
            )}

            {/* Color legend */}
            <div style={{display:'flex',gap:16,marginBottom:12,flexWrap:'wrap'}}>
              {[
                {color:COLORS.blue,  label:'Panel effect (enrollment Δ)'},
                {color:COLORS.navy,  label:'Volume effect (events/bene Δ)'},
                {color:COLORS.teal,  label:'Rate effect (cost/event Δ)'},
                {color:COLORS.red,   label:'Expense increase'},
                {color:COLORS.green, label:'Expense decrease'},
              ].map(l=>(
                <div key={l.label} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:10,height:10,borderRadius:2,background:l.color}}/>
                  <span style={{fontSize:11,color:'var(--gray-600)'}}>{l.label}</span>
                </div>
              ))}
            </div>

            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'var(--gray-50)',borderBottom:'2px solid var(--gray-200)'}}>
                    {['Category','Util Rate /1K','Cost / Event','Total Δ ($M)','Panel ($M)','Volume ($M)','Rate ($M)','Notes'].map(h=>(
                      <th key={h} style={{padding:'7px 10px',textAlign:h==='Category'?'left':'right',
                        fontWeight:600,color:'var(--gray-600)',fontSize:10,
                        textTransform:'uppercase',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rvmRows.map((row, ri) => {
                    const allRows = [row, ...(row.children||[])];
                    return allRows.map((r, si) => {
                      const isMain = si===0;
                      const fmtMv = (v) => v!=null ? (
                        <span style={{fontWeight:isMain?600:400,
                          color:v>0?'var(--red)':v<0?'var(--green)':'var(--gray-500)'}}>
                          {v>0?'+':''}{v.toFixed(1)}
                        </span>
                      ) : <span style={{color:'var(--gray-300)'}}>—</span>;
                      const maxV = Math.max(
                        Math.abs(r.total_d/1e6||0),Math.abs(r.panel_eff/1e6||0),
                        Math.abs(r.vol_eff/1e6||0),Math.abs(r.rate_eff/1e6||0),0.1);
                      // SNF detail rows
                      if (r._snf_detail) {
                        const d = r._snf_detail;
                        const losChange  = d.los_c!=null&&d.los_p!=null ? d.los_c-d.los_p : null;
                        const rateChange = d.payperday_c!=null&&d.payperday_p!=null ? d.payperday_c-d.payperday_p : null;
                        const admitsC = (r.u_c||0)/1000 * (acoRecords[rvmPair.idx]?.bene_cnt||1);
                        const losEffect  = losChange  != null && d.payperday_p ? losChange  * d.payperday_p * admitsC : null;
                        const rateEffect = rateChange != null && d.los_c       ? rateChange * d.los_c       * admitsC : null;
                        return (
                          <React.Fragment key={`${ri}-${si}`}>
                            <tr style={{background:ri%2===0?'var(--gray-50)':'white',borderBottom:'1px solid var(--gray-100)'}}>
                              <td style={{padding:'6px 10px',fontWeight:600,color:'var(--navy)'}}>{r.name}</td>
                              <td style={{padding:'6px 10px',textAlign:'right',color:'var(--gray-700)'}}>
                                {r.u_c!=null&&r.u_p!=null?`${r.u_p?.toFixed(1)} → ${r.u_c?.toFixed(1)}`:'—'}
                              </td>
                              <td style={{padding:'6px 10px',textAlign:'right',color:'var(--gray-700)'}}>
                                {r.cpe_p!=null&&r.cpe_c!=null?`$${Math.round(r.cpe_p).toLocaleString()} → $${Math.round(r.cpe_c).toLocaleString()}`:'—'}
                              </td>
                              <td style={{padding:'6px 10px',textAlign:'right'}}>{r.total_d!=null?fmtMv(r.total_d/1e6):'—'}</td>
                              <td style={{padding:'6px 10px',textAlign:'right'}}>{r.panel_eff!=null?fmtMv(r.panel_eff/1e6):'—'}</td>
                              <td style={{padding:'6px 10px',textAlign:'right'}}>{r.vol_eff!=null?fmtMv(r.vol_eff/1e6):'—'}</td>
                              <td style={{padding:'6px 10px',textAlign:'right'}}>{r.rate_eff!=null?fmtMv(r.rate_eff/1e6):'—'}</td>
                              <td style={{padding:'6px 10px',fontSize:11,color:'var(--gray-400)'}}>Rate = LOS × day rate</td>
                            </tr>
                            <tr style={{background:'#f5faff',borderBottom:'1px solid var(--gray-100)'}}>
                              <td style={{paddingLeft:28,padding:'5px 10px 5px 28px',fontSize:11,color:'var(--gray-500)'}}>
                                ↳ LOS: {d.los_p?.toFixed(1)}→{d.los_c?.toFixed(1)} days
                                {losChange!=null?<span style={{marginLeft:4,color:losChange>0?'var(--red)':'var(--green)'}}> ({losChange>0?'+':''}{losChange.toFixed(1)})</span>:''}
                              </td>
                              <td style={{padding:'5px 10px',textAlign:'right',fontSize:11,color:'var(--gray-500)'}}>
                                Pay/day: ${d.payperday_p?.toFixed(0)}→${d.payperday_c?.toFixed(0)}
                              </td>
                              <td/>
                              <td style={{padding:'5px 10px',textAlign:'right',fontSize:11}}>
                                {losEffect!=null?<span style={{color:losEffect>0?'var(--red)':'var(--green)',fontWeight:600}}>{losEffect>0?'+':''}{(losEffect/1e6).toFixed(2)}M LOS</span>:'—'}
                              </td>
                              <td/>
                              <td style={{padding:'5px 10px',textAlign:'right',fontSize:11}}>
                                {rateEffect!=null?<span style={{color:rateEffect>0?'var(--red)':'var(--green)',fontWeight:600}}>{rateEffect>0?'+':''}{(rateEffect/1e6).toFixed(2)}M rate</span>:'—'}
                              </td>
                              <td/>
                              <td style={{padding:'5px 10px',fontSize:10,color:'var(--gray-400)'}}>LOS effect + day rate effect</td>
                            </tr>
                          </React.Fragment>
                        );
                      }
                      const note = r.tier==='volume'?'Volume only — no spend field'
                                 : r.tier==='spend' ?'Spend trend — no util rate'
                                 : r.tier==='metric'?'Metric (not $ component)'
                                 : r.tier==='mix'   ?'Mix sub-type':'';
                      return (
                        <tr key={`${ri}-${si}`} style={{
                          background:isMain&&ri%2===0?'var(--gray-50)':isMain?'white':'#f8fbff',
                          borderBottom:'1px solid var(--gray-100)'}}>
                          <td style={{padding:'6px 10px',fontWeight:isMain?600:400,
                            color:isMain?'var(--navy)':'var(--gray-600)',
                            paddingLeft:r.tier==='mix'?24:10}}>{r.name}</td>
                          <td style={{padding:'6px 10px',textAlign:'right',color:'var(--gray-700)'}}>
                            {r.u_c!=null&&r.u_p!=null?(
                              <span>
                                {r.u_p?.toFixed(1)} → {r.u_c?.toFixed(1)}
                                <span style={{fontSize:10,marginLeft:4,
                                  color:r.u_c>r.u_p?'var(--red)':'var(--green)'}}>
                                  ({r.u_c>r.u_p?'+':''}{(r.u_c-r.u_p)?.toFixed(1)})
                                </span>
                              </span>
                            ):<span style={{color:'var(--gray-300)'}}>—</span>}
                          </td>
                          <td style={{padding:'6px 10px',textAlign:'right',color:'var(--gray-700)'}}>
                            {r.cpe_c!=null&&r.cpe_p!=null?(
                              <span>
                                ${Math.round(r.cpe_p).toLocaleString()} → ${Math.round(r.cpe_c).toLocaleString()}
                                <span style={{fontSize:10,marginLeft:4,
                                  color:r.cpe_c>r.cpe_p?'var(--red)':'var(--green)'}}>
                                  ({r.cpe_c>r.cpe_p?'+':''}{Math.round(r.cpe_c-r.cpe_p).toLocaleString()})
                                </span>
                              </span>
                            ):<span style={{color:'var(--gray-300)'}}>—</span>}
                          </td>
                          <td style={{padding:'6px 10px',textAlign:'right'}}>
                            {r.total_d!=null?(
                              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
                                {fmtMv(r.total_d/1e6)}
                                <div style={{width:48,height:4,background:'var(--gray-100)',borderRadius:2}}>
                                  <div style={{width:`${Math.min(100,Math.abs(r.total_d/1e6)/maxV*100)}%`,
                                    height:'100%',borderRadius:2,
                                    background:r.total_d>0?'var(--red)':'var(--green)',
                                    marginLeft:r.total_d<0?'auto':0}}/>
                                </div>
                              </div>
                            ):<span style={{color:'var(--gray-300)'}}>—</span>}
                          </td>
                          <td style={{padding:'6px 10px',textAlign:'right'}}>{fmtMv(r.panel_eff!=null?r.panel_eff/1e6:null)}</td>
                          <td style={{padding:'6px 10px',textAlign:'right'}}>{fmtMv(r.vol_eff!=null?r.vol_eff/1e6:null)}</td>
                          <td style={{padding:'6px 10px',textAlign:'right'}}>{fmtMv(r.rate_eff!=null?r.rate_eff/1e6:null)}</td>
                          <td style={{padding:'6px 10px',fontSize:11,color:'var(--gray-400)'}}>{note}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:12,fontSize:11,color:'var(--gray-400)',lineHeight:1.6}}>
              <strong>Panel</strong> = spend change from enrollment growth (same rate & vol, more benes) ·
              <strong> Volume</strong> = change in events per 1K bene-years × prior cost/event ·
              <strong> Rate</strong> = change in cost per event × current utilization ·
              Red = expense increase · Green = expense decrease
            </div>
          </div>

          {/* SNF deep dive */}
          <div className="chart-card">
            <div className="chart-title">SNF Deep Dive</div>
            <div className="chart-subtitle">SNF is the post-acute cost driver most targeted by LEAD's CARA episode arrangements</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:12 }}>
              {[
                {label:'SNF Admits/1K', key:'p_snf_adm',     fmt_: v=>`${v.toFixed(1)}`},
                {label:'Avg LOS (days)',key:'snf_los',        fmt_: v=>`${v.toFixed(1)} days`},
                {label:'Pay Per Stay',  key:'snf_payperstay', fmt_: v=>`$${fmt.num(v)}`},
              ].map(m => (
                <div key={m.label} style={{ padding:'12px 14px', background:'var(--gray-50)',
                  borderRadius:'var(--radius)', border:'1px solid var(--gray-200)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-500)',
                    textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{m.label}</div>
                  {acoRecords.map(r => {
                    const v = r[m.key];
                    const peer = peerAvg(m.key);
                    return (
                      <div key={r.perf_year} style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:11, color:'var(--gray-500)' }}>PY{r.perf_year}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>
                          {v!=null?m.fmt_(v):'—'}
                        </span>
                      </div>
                    );
                  })}
                  {peerAvg(m.key)!=null && (
                    <div style={{ marginTop:6, paddingTop:6, borderTop:'1px solid var(--gray-200)',
                      fontSize:10, color:'var(--gray-400)' }}>
                      Peer avg: {m.fmt_(peerAvg(m.key))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Spend by Category with toggle */}
          <SpendCategoryChart acoRecords={acoRecords} />
        </div>
      )}

      {/* ── QUALITY TAB ── */}
      {activeTab==='quality' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Quality scores trend */}
          <div className="chart-card">
            <div className="chart-title">Quality Score Trend</div>
            <div className="chart-subtitle">
              PY2021: 100% under pay-for-reporting · PY2023: shift to pay-for-performance
            </div>
            <div className="grid-2">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={acoRecords.map(r=>({
                  year:r.perf_year, qual_scr:r.qual_scr, acr:r.acr_scr, uamcc:r.uamcc_scr, tfu:r.tfu_scr
                }))} margin={{top:4,right:16,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
                  <XAxis dataKey="year" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Line type="monotone" dataKey="qual_scr" name="Total Quality (%)" stroke={COLORS.green} strokeWidth={2.5} dot={{r:5}}/>
                  <Line type="monotone" dataKey="tfu" name="TFU (%)" stroke={COLORS.teal} strokeWidth={2} dot={{r:4}}/>
                  <Line type="monotone" dataKey="acr" name="ACR (↓ better)" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="5 3" dot={{r:4}}/>
                  <Line type="monotone" dataKey="uamcc" name="UAMCC (↓ better)" stroke={COLORS.red} strokeWidth={2} strokeDasharray="5 3" dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
              {/* vs peer grid */}
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--gray-600)', marginBottom:10,
                  textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  Latest Year vs Peers (PY{latest?.perf_year})
                </div>
                {[
                  {label:'Total Quality', key:'qual_scr',  fmt_:v=>`${v.toFixed(1)}%`, lowerBetter:false},
                  {label:'ACR',           key:'acr_scr',   fmt_:v=>v.toFixed(2),        lowerBetter:true},
                  {label:'UAMCC',         key:'uamcc_scr', fmt_:v=>v.toFixed(2),        lowerBetter:true},
                  {label:'TFU',           key:'tfu_scr',   fmt_:v=>`${v.toFixed(1)}%`,  lowerBetter:false},
                ].map(m => {
                  const val  = latest?.[m.key];
                  const peer = peerAvg(m.key);
                  const better = val!=null && peer!=null ? (m.lowerBetter?val<peer:val>peer) : null;
                  return (
                    <div key={m.label} style={{ display:'flex', alignItems:'center',
                      padding:'7px 0', borderBottom:'1px solid var(--gray-100)', gap:10 }}>
                      <div style={{ fontSize:12, color:'var(--gray-600)', flex:1 }}>{m.label}</div>
                      <div style={{ fontSize:16, fontWeight:700,
                        color:better===true?COLORS.green:better===false?COLORS.red:'var(--navy)' }}>
                        {val!=null?m.fmt_(val):'—'}
                      </div>
                      {peer!=null && (
                        <div style={{ fontSize:11, color:'var(--gray-400)', minWidth:80 }}>
                          peer: {m.fmt_(peer)}
                          <span style={{ marginLeft:4, color:better===true?COLORS.green:better===false?COLORS.red:'var(--gray-300)' }}>
                            {better===true?'▲':better===false?'▼':''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CAHPS SSM */}
          <div className="chart-card">
            <div className="chart-title">CAHPS SSM — Patient Experience Measures</div>
            <div className="chart-subtitle">
              PY2022 and PY2023 only. All 0–100 scale, higher = better. Vertical bar = peer average for same configuration.
            </div>
            {(() => {
              const hasData = acoRecords.some(r => r.ssm_taci != null || r.ssm_com != null);
              if (!hasData) return (
                <div style={{padding:'20px',textAlign:'center',color:'var(--gray-400)',fontSize:12,
                  background:'var(--gray-50)',borderRadius:'var(--radius)'}}>
                  CAHPS SSM data not available for this ACO (PY2021 only or insufficient survey responses).
                </div>
              );
              return (
                <div>
                  {Object.entries(CAHPS_LABELS).map(([key, label]) => {
                    const val22 = acoRecords.find(r=>r.perf_year===2022)?.[key];
                    const val23 = acoRecords.find(r=>r.perf_year===2023)?.[key];
                    const peer  = peerAvg(key);
                    if (val22==null && val23==null) return null;
                    const latestVal = val23 ?? val22;
                    const better = peer!=null && latestVal!=null ? latestVal > peer : null;
                    return (
                      <div key={key} style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{label}</span>
                          <div style={{display:'flex',gap:16,alignItems:'center'}}>
                            {val22!=null && <span style={{fontSize:11,color:'var(--gray-400)'}}>PY22: {val22.toFixed(1)}%</span>}
                            {val23!=null && (
                              <span style={{fontSize:14,fontWeight:700,
                                color:better===true?COLORS.green:better===false?COLORS.red:'var(--navy)'}}>
                                PY23: {val23.toFixed(1)}%
                              </span>
                            )}
                            {peer!=null && <span style={{fontSize:11,color:'var(--gray-400)'}}>Peer: {peer.toFixed(1)}%</span>}
                          </div>
                        </div>
                        <div style={{position:'relative',height:14,background:'var(--gray-100)',borderRadius:7}}>
                          {val22!=null && <div style={{position:'absolute',top:3,left:0,height:8,
                            width:val22+'%',background:COLORS.blue+'66',borderRadius:4}}/>}
                          {val23!=null && <div style={{position:'absolute',top:3,left:0,height:8,
                            width:val23+'%',
                            background:better===true?COLORS.green:better===false?COLORS.red:COLORS.teal,
                            borderRadius:4,opacity:0.85}}/>}
                          {peer!=null && <div style={{position:'absolute',top:0,left:peer+'%',
                            width:2,height:14,background:COLORS.navy,borderRadius:1,opacity:0.5}}/>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{display:'flex',gap:16,marginTop:10,fontSize:11,color:'var(--gray-500)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:12,height:8,borderRadius:3,background:COLORS.blue+'66'}}/> PY2022
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:12,height:8,borderRadius:3,background:COLORS.teal}}/> PY2023
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:2,height:12,background:COLORS.navy,opacity:0.5}}/> Peer avg
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* CI/SEP and HPP */}
          <div className="chart-card">
            <div className="chart-title">CI/SEP & High Performers Pool Status</div>
            <div className="chart-subtitle">Quality achievement flags — PY2023 only. Both carry forward into LEAD.</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
              <div style={{ padding:'18px', borderRadius:'var(--radius)',
                border:`2px solid ${latest?.cisep_flag==='Yes'?COLORS.green:COLORS.gray}`,
                background: latest?.cisep_flag==='Yes'?`${COLORS.green}08`:'var(--gray-50)' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.06em', marginBottom:8,
                  color: latest?.cisep_flag==='Yes'?COLORS.green:'var(--gray-500)' }}>
                  CI/SEP — Continuous Improvement / Sustained Exceptional Performance
                </div>
                <div style={{ fontSize:32, fontWeight:800,
                  color: latest?.cisep_flag==='Yes'?COLORS.green:COLORS.gray }}>
                  {latest?.cisep_flag||'N/A'}
                </div>
                <div style={{ fontSize:12, color:'var(--gray-600)', marginTop:8, lineHeight:1.5 }}>
                  {latest?.cisep_flag==='Yes'
                    ? 'CI/SEP ACOs averaged 5.80% savings vs 1.07% for non-CI/SEP in PY2023 — a 5.4x difference. CI/SEP is required for HPP eligibility.'
                    : 'CI/SEP only available in PY2023. Requires meeting quality improvement thresholds. Strong CI/SEP performance strengthens LEAD applications.'}
                </div>
              </div>
              <div style={{ padding:'18px', borderRadius:'var(--radius)',
                border:`2px solid ${latest?.hpp_flag==='Yes'?COLORS.gold:COLORS.gray}`,
                background: latest?.hpp_flag==='Yes'?`${COLORS.gold}0a`:'var(--gray-50)' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.06em', marginBottom:8,
                  color: latest?.hpp_flag==='Yes'?COLORS.gold:'var(--gray-500)' }}>
                  HPP — High Performers Pool
                </div>
                <div style={{ fontSize:32, fontWeight:800,
                  color: latest?.hpp_flag==='Yes'?COLORS.gold:COLORS.gray }}>
                  {latest?.hpp_flag||'N/A'}
                </div>
                <div style={{ fontSize:12, color:'var(--gray-600)', marginTop:8, lineHeight:1.5 }}>
                  {latest?.hpp_flag==='Yes'
                    ? '🏆 HPP qualifier. Only 24 of 132 ACOs (18%) qualified. HPP ACOs averaged 8.27% savings and earned $408M — 44% of all PY2023 savings.'
                    : 'HPP launched in PY2023. Requires CI/SEP + above HPP threshold. Carries into LEAD as sustained high-performance incentive.'}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── UTILIZATION TAB ── */}
      {activeTab==='utilization' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="chart-card">
            <div className="chart-title">Utilization Trends vs Peer Average</div>
            <div className="chart-subtitle">Per 1,000 beneficiaries · peer average = same config_key, same PY</div>
            <div style={{ overflowX:'auto', marginTop:12 }}>
              <table className="data-table" style={{ minWidth:600 }}>
                <thead>
                  <tr>
                    <th>Measure</th>
                    {acoRecords.map(r => <th key={r.perf_year} style={{textAlign:'right'}}>PY{r.perf_year}</th>)}
                    <th style={{textAlign:'right'}}>Peer Avg (PY{latest?.perf_year})</th>
                    <th style={{textAlign:'right'}}>vs Peer</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {label:'Inpatient Admits / 1K',  key:'_adm_per1k',      lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'  Acute Admits / 1K',    key:'_adm_s_trm_per1k',lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'  Rehab Admits / 1K',    key:'_adm_rehab_per1k',lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'ED Visits (Total) / 1K', key:'p_edv_vis',       lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'ED → Hosp Admits / 1K',  key:'p_edv_vis_hosp',  lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'ED Non-Hosp / 1K',       key:'_ed_nonhosp',     lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'SNF Admits / 1K',        key:'p_snf_adm',       lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'SNF Avg LOS (days)',      key:'snf_los',         lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'PCP EM Visits / 1K',     key:'p_em_pcp_vis',    lower:false, fmt_:v=>`${v.toFixed(0)}`},
                    {label:'Specialist EM / 1K',     key:'p_em_sp_vis',     lower:true,  fmt_:v=>`${v.toFixed(0)}`},
                    {label:'CT Scans / 1K',          key:'p_ct_vis',        lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'MRI Scans / 1K',         key:'p_mri_vis',       lower:true,  fmt_:v=>`${v.toFixed(1)}`},
                    {label:'Nurse Visits / 1K',      key:'p_nurse_vis',     lower:false, fmt_:v=>`${v.toFixed(0)}`},
                  ].map(m => {
                    const peerVal = m.key==='_ed_nonhosp'
                      ? (() => { const v1=peerAvg('p_edv_vis'), v2=peerAvg('p_edv_vis_hosp'); return v1!=null&&v2!=null?v1-v2:null; })()
                      : m.key==='_adm_per1k'
                      ? (() => { const recs=records.filter(r=>r.perf_year===latest?.perf_year&&r.config_key===latest?.config_key&&r.aco_id!==latest?.aco_id&&!r.is_midyear); const vals=recs.map(r=>r.adm_n!=null&&r.bene_cnt?r.adm_n/r.bene_cnt*1000:null).filter(v=>v!=null); return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:null; })()
                      : m.key==='_adm_s_trm_per1k'
                      ? (() => { const recs=records.filter(r=>r.perf_year===latest?.perf_year&&r.config_key===latest?.config_key&&r.aco_id!==latest?.aco_id&&!r.is_midyear); const vals=recs.map(r=>r.adm_s_trm_n!=null&&r.bene_cnt?r.adm_s_trm_n/r.bene_cnt*1000:null).filter(v=>v!=null); return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:null; })()
                      : m.key==='_adm_rehab_per1k'
                      ? (() => { const recs=records.filter(r=>r.perf_year===latest?.perf_year&&r.config_key===latest?.config_key&&r.aco_id!==latest?.aco_id&&!r.is_midyear); const vals=recs.map(r=>r.adm_rehab_n!=null&&r.bene_cnt?r.adm_rehab_n/r.bene_cnt*1000:null).filter(v=>v!=null); return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:null; })()
                      : peerAvg(m.key);
                    const latVal  = m.key==='_adm_per1k'
                      ? (latest?.adm_n!=null&&latest?.bene_cnt?latest.adm_n/latest.bene_cnt*1000:null)
                      : m.key==='_adm_s_trm_per1k'
                      ? (latest?.adm_s_trm_n!=null&&latest?.bene_cnt?latest.adm_s_trm_n/latest.bene_cnt*1000:null)
                      : m.key==='_adm_rehab_per1k'
                      ? (latest?.adm_rehab_n!=null&&latest?.bene_cnt?latest.adm_rehab_n/latest.bene_cnt*1000:null)
                      : latest?.[m.key];
                    const diff    = latVal!=null && peerVal!=null ? latVal - peerVal : null;
                    const better  = diff!=null && m.lower!==null ? (m.lower ? diff<0 : diff>0) : null;
                    return (
                      <tr key={m.key}>
                        <td style={{fontSize:12}}>{m.label}</td>
                        {acoRecords.map(r => (
                          <td key={r.perf_year} style={{textAlign:'right', fontWeight: r.perf_year===latest?.perf_year?600:400,
                            color:r.perf_year===latest?.perf_year?'var(--navy)':'var(--gray-500)'}}>
                            {m.key==='_ed_nonhosp'
                            ? (r.p_edv_vis!=null && r.p_edv_vis_hosp!=null ? m.fmt_(r.p_edv_vis - r.p_edv_vis_hosp) : '—')
                            : m.key==='_adm_per1k'
                            ? (r.adm_n!=null && r.bene_cnt ? m.fmt_(r.adm_n / r.bene_cnt * 1000) : '—')
                            : m.key==='_adm_s_trm_per1k'
                            ? (r.adm_s_trm_n!=null && r.bene_cnt ? m.fmt_(r.adm_s_trm_n / r.bene_cnt * 1000) : '—')
                            : m.key==='_adm_rehab_per1k'
                            ? (r.adm_rehab_n!=null && r.bene_cnt ? m.fmt_(r.adm_rehab_n / r.bene_cnt * 1000) : '—')
                            : r[m.key]!=null ? m.fmt_(r[m.key]) : '—'}
                          </td>
                        ))}
                        <td style={{textAlign:'right',color:'var(--gray-400)',fontSize:11}}>
                          {peerVal!=null ? m.fmt_(peerVal) : '—'}
                        </td>
                        <td style={{textAlign:'right'}}>
                          {diff!=null && (
                            <span style={{ fontSize:11, fontWeight:600,
                              color: better===true?COLORS.green:better===false?COLORS.red:'var(--gray-400)' }}>
                              {diff>0?'+':''}{m.fmt_(diff)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Utilization Trend Charts</div>
            <div className="grid-2">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={acoRecords.map(r=>({year:r.perf_year, ed:r.p_edv_vis, snf:r.p_snf_adm}))}
                  margin={{top:4,right:12,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
                  <XAxis dataKey="year" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip formatter={(v,n)=>[`${Number(v).toFixed(1)} /1K`,n]}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Line type="monotone" dataKey="ed"  name="ED Visits/1K"  stroke={COLORS.red}   strokeWidth={2} dot={{r:5}}/>
                  <Line type="monotone" dataKey="snf" name="SNF Admits/1K" stroke={COLORS.amber} strokeWidth={2} dot={{r:5}}/>
                </LineChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={acoRecords.map(r=>({year:r.perf_year, pcp:r.p_em_pcp_vis, sp:r.p_em_sp_vis}))}
                  margin={{top:4,right:12,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
                  <XAxis dataKey="year" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip formatter={(v,n)=>[`${Number(v).toFixed(0)} /1K`,n]}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Line type="monotone" dataKey="pcp" name="PCP EM/1K"      stroke={COLORS.teal} strokeWidth={2} dot={{r:5}}/>
                  <Line type="monotone" dataKey="sp"  name="Specialist EM/1K" stroke={COLORS.blue} strokeWidth={2} strokeDasharray="5 3" dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── CAPITATION TAB ── */}
      {activeTab==='capitation' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <CapitationBreakdownCard acoRecords={acoRecords} />

          {/* Alignment breakdown */}
          <div className="chart-card">
            <div className="chart-title">Alignment Elections</div>
            <div className="chart-subtitle">
              ACO-level elections that affect how beneficiaries are attributed and how capitation payments flow.
              Note: the PUF does not report a breakdown of beneficiaries by claims-based vs voluntary alignment.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
              <div style={{padding:'14px',
                background:latest?.apo_election==='Yes'?`${COLORS.teal}08`:'var(--gray-50)',
                borderRadius:'var(--radius)',
                border:`1px solid ${latest?.apo_election==='Yes'?COLORS.teal+'33':'var(--gray-200)'}`}}>
                <div style={{fontSize:10,fontWeight:700,
                  color:latest?.apo_election==='Yes'?COLORS.teal:'var(--gray-500)',
                  textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>
                  APO — Advanced Payment Option
                </div>
                <div style={{fontSize:22,fontWeight:800,
                  color:latest?.apo_election==='Yes'?COLORS.teal:COLORS.gray,marginBottom:4}}>
                  {latest?.apo_election==='Yes'?'Elected':'Not Elected'}
                </div>
                <div style={{fontSize:12,color:'var(--gray-600)',lineHeight:1.5}}>
                  An advance capitation payment arrangement for non-PCP services provided by PCPs.
                  APO supplements the primary care capitation (CAP) payment.
                  {latest?.apo_election==='Yes'
                    ? ' In PY2023, APO-electing ACOs averaged 4.91% savings vs 4.42% for non-APO ACOs.'
                    : ' Not elected by this ACO.'}
                </div>
              </div>
              <div style={{padding:'14px',
                background:latest?.alignment_plus==='Yes'?`${COLORS.green}08`:'var(--gray-50)',
                borderRadius:'var(--radius)',
                border:`1px solid ${latest?.alignment_plus==='Yes'?COLORS.green+'33':'var(--gray-200)'}`}}>
                <div style={{fontSize:10,fontWeight:700,
                  color:latest?.alignment_plus==='Yes'?COLORS.green:'var(--gray-500)',
                  textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>
                  Alignment Plus
                </div>
                <div style={{fontSize:22,fontWeight:800,
                  color:latest?.alignment_plus==='Yes'?COLORS.green:COLORS.gray,marginBottom:4}}>
                  {latest?.alignment_plus==='Yes'?'Elected':'Not Elected'}
                </div>
                <div style={{fontSize:12,color:'var(--gray-600)',lineHeight:1.5}}>
                  ACO election to participate in the Alignment Plus arrangement.
                  In PY2023, 122 of 132 ACOs (92%) elected Alignment Plus.
                  {latest?.alignment_plus==='Yes'
                    ? ' This ACO participates in Alignment Plus.'
                    : ' This ACO does not participate in Alignment Plus.'}
                </div>
              </div>
            </div>
            <div style={{marginTop:12,padding:'10px 14px',background:'var(--gray-50)',
              borderRadius:'var(--radius)',fontSize:11,color:'var(--gray-600)'}}>
              <strong>Note:</strong> The REACH PUF does not report the split between claims-based
              and voluntary beneficiary alignment. CAP = primary care capitation for PCP services ·
              APO = advance for non-PCP services by PCPs · ePCC = enhanced bonus for PCP utilization.
            </div>
          </div>

          {/* Concurrent risk score (PY2023 only) */}
          {latest?.norm_risk_score && (
            <div className="chart-card" style={{ borderLeft:'4px solid var(--teal)' }}>
              <div className="chart-title">Concurrent Risk Score Adjustment (PY2023)</div>
              <div className="chart-subtitle">
                REACH introduced concurrent risk adjustment — benchmarks adjust in real-time based on
                actual patient mix rather than historical claims. Available PY2023 only.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginTop:14 }}>
                {[
                  {label:'Normalized Risk Score', value:latest.norm_risk_score.toFixed(4),
                    note:'Final risk score after normalization (1.0 = avg population)'},
                  {label:'CIF-Capped Risk Score', value:latest.cif_cap_risk?.toFixed(4)||'—',
                    note:'Risk score after applying the Coding Intensity Factor cap'},
                  {label:'Concurrent Adj Impact', value:latest.norm_risk_score&&latest.cif_cap_risk
                    ?(latest.norm_risk_score-latest.cif_cap_risk).toFixed(4):'—',
                    note:'Difference = portion of risk score adjusted by concurrent methodology'},
                ].map(s => (
                  <div key={s.label} style={{ padding:'14px', background:'var(--gray-50)',
                    borderRadius:'var(--radius)', border:'1px solid var(--gray-200)' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-500)',
                      textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontSize:24, fontWeight:800, color:'var(--navy)' }}>{s.value}</div>
                    <div style={{ fontSize:10, color:'var(--gray-400)', marginTop:6, lineHeight:1.4 }}>{s.note}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, padding:'10px 14px', background:'var(--teal-light)',
                borderRadius:'var(--radius)', fontSize:12, color:'var(--teal-dark)' }}>
                <strong>LEAD context:</strong> Concurrent risk adjustment extends to ALL ACOs in LEAD —
                not just those with high-risk populations. Organizations serving complex, high-need
                patients will benefit most from this methodology change.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── POPULATION TAB ── */}
      {activeTab==='profile' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="chart-card">
            <div className="chart-title">Beneficiary Population Profile (PY{latest?.perf_year})</div>
            <div className="grid-2" style={{ marginTop:12 }}>
              {/* Age breakdown */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-600)',
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Age Distribution</div>
                {[
                  {label:'Under 65',  key:'n_ben_age_0_64'},
                  {label:'65–74',     key:'n_ben_age_65_74'},
                  {label:'75–84',     key:'n_ben_age_75_84'},
                  {label:'85+',       key:'n_ben_age_85plus'},
                ].map(row => {
                  const val = latest?.[row.key];
                  const tot = latest?.bene_cnt || 1;
                  const pct = val!=null ? (val/tot*100).toFixed(1) : null;
                  return (
                    <div key={row.key} style={{ display:'flex', alignItems:'center',
                      gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:12, color:'var(--gray-600)', width:70 }}>{row.label}</span>
                      <div style={{ flex:1, height:14, background:'var(--gray-100)', borderRadius:7 }}>
                        <div style={{ height:'100%', width:`${pct||0}%`, background:COLORS.blue,
                          borderRadius:7, transition:'width 0.3s' }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--navy)', width:44,
                        textAlign:'right' }}>{pct!=null?`${pct}%`:'—'}</span>
                    </div>
                  );
                })}
              </div>
              {/* Race breakdown */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-600)',
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Race / Ethnicity</div>
                {[
                  {label:'White',    key:'n_ben_race_white'},
                  {label:'Black',    key:'n_ben_race_black'},
                  {label:'Hispanic', key:'n_ben_race_hisp'},
                  {label:'Asian',    key:'n_ben_race_asian'},
                  {label:'Native',   key:'n_ben_race_native'},
                  {label:'Other',    key:'n_ben_race_other'},
                ].map(row => {
                  const val = latest?.[row.key];
                  const tot = latest?.bene_cnt || 1;
                  const pct = val!=null ? (val/tot*100).toFixed(1) : null;
                  return (
                    <div key={row.key} style={{ display:'flex', alignItems:'center',
                      gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:12, color:'var(--gray-600)', width:70 }}>{row.label}</span>
                      <div style={{ flex:1, height:14, background:'var(--gray-100)', borderRadius:7 }}>
                        <div style={{ height:'100%', width:`${pct||0}%`, background:COLORS.teal,
                          borderRadius:7 }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--navy)', width:44,
                        textAlign:'right' }}>{pct!=null?`${pct}%`:'—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dual + LTI + provider counts */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            <div className="chart-card">
              <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-500)',
                textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Special Populations
              </div>
              {[
                {label:'% Dual Eligible',    key:'perc_dual',  fmt_:v=>`${v.toFixed(1)}%`},
                {label:'% Long-Term Inst.', key:'perc_lti',   fmt_:v=>`${v.toFixed(1)}%`},
              ].map(row => {
                const val = latest?.[row.key];
                const peer = peerAvg(row.key);
                return (
                  <div key={row.key} style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'var(--gray-600)', marginBottom:3 }}>{row.label}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:'var(--navy)' }}>
                      {val!=null ? row.fmt_(val) : '—'}
                    </div>
                    {peer!=null && (
                      <div style={{ fontSize:11, color:'var(--gray-400)' }}>
                        Peer avg: {row.fmt_(peer)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="chart-card">
              <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-500)',
                textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Provider Mix (Latest)
              </div>
              {[
                {label:'PCPs',          key:'n_pcp'},
                {label:'Specialists',   key:'n_spec'},
                {label:'Nurse Practs.', key:'n_np'},
                {label:'Phys Assists.', key:'n_pa'},
              ].map(row => (
                <div key={row.key} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:6, paddingBottom:6,
                  borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:12, color:'var(--gray-600)' }}>{row.label}</span>
                  <strong style={{ fontSize:13, color:'var(--navy)' }}>
                    {latest?.[row.key]!=null ? fmt.num(latest[row.key]) : '—'}
                  </strong>
                </div>
              ))}
            </div>
            <div className="chart-card">
              <div style={{ fontSize:10, fontWeight:700, color:'var(--gray-500)',
                textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Facility Mix (Latest)
              </div>
              {[
                {label:'Hospitals',          key:'n_hosp'},
                {label:'FQHCs',              key:'n_fqhc'},
                {label:'CAHs',               key:'n_cah'},
                {label:'RHCs',               key:'n_rhc'},
              ].map(row => (
                <div key={row.key} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:6, paddingBottom:6,
                  borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:12, color:'var(--gray-600)' }}>{row.label}</span>
                  <strong style={{ fontSize:13, color:'var(--navy)' }}>
                    {latest?.[row.key]!=null ? fmt.num(latest[row.key]) : '—'}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* ACO elections affecting alignment and payments */}
          <div className="chart-card">
            <div className="chart-title">ACO Program Elections</div>
            <div className="chart-subtitle">
              Operational elections made by this ACO. Note: The REACH PUF does not report
              voluntary vs. claims-based beneficiary alignment counts — that breakdown is not
              available at the ACO level in public data.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:14}}>
              {[
                {label:'Advanced Payment Option (APO)',
                 val:latest?.apo_election||'—',
                 active:latest?.apo_election==='Yes', color:COLORS.teal,
                 note:'A capitation advance mechanism that modifies how non-PCP services by PCPs are paid. In PY2023, APO ACOs averaged 4.91% savings vs 4.42% non-APO.'},
                {label:'Alignment Plus',
                 val:latest?.alignment_plus||'—',
                 active:latest?.alignment_plus==='Yes', color:COLORS.green,
                 note:'ACO election to participate in the Alignment Plus arrangement. 122 of 132 PY2023 ACOs (92%) elected this.'},
                {label:'Enhanced PCC',
                 val:latest?.enhanced_pcc||'—',
                 active:latest?.enhanced_pcc==='Yes', color:COLORS.blue,
                 note:'Enhanced Primary Care Capitation — a bonus payment encouraging greater PCP utilization, reflected in EPCC_PMT_AMT.'},
              ].map(item=>(
                <div key={item.label} style={{padding:'14px',borderRadius:'var(--radius)',
                  border:`1.5px solid ${item.active?item.color+'44':'var(--gray-200)'}`,
                  background:item.active?`${item.color}08`:'var(--gray-50)'}}>
                  <div style={{fontSize:10,fontWeight:700,
                    color:item.active?item.color:'var(--gray-400)',
                    textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>
                    {item.label}
                  </div>
                  <div style={{fontSize:22,fontWeight:800,
                    color:item.active?item.color:'var(--gray-400)',marginBottom:6}}>
                    {item.val}
                  </div>
                  <div style={{fontSize:11,color:'var(--gray-600)',lineHeight:1.5}}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* HEBA context if available */}
          {latest?.heba_up_amt!=null && (
            <div className="chart-card" style={{ borderLeft:'4px solid var(--gold)' }}>
              <div className="chart-title">HEBA (Health Equity Benchmark Adjustment) — PY2023</div>
              <div style={{ display:'flex', gap:14, marginTop:12, flexWrap:'wrap' }}>
                {[
                  {label:'Upward Adj',   value:fmt.dollars(latest.heba_up_amt),  color:COLORS.green},
                  {label:'Downward Adj', value:fmt.dollars(latest.heba_down_amt),color:COLORS.red},
                  {label:'Net HEBA',     value:fmt.dollars((latest.heba_up_amt||0)+(latest.heba_down_amt||0)), color:COLORS.teal},
                ].map(s => (
                  <div key={s.label} style={{ flex:1, minWidth:130, padding:'12px 14px',
                    borderRadius:'var(--radius)', border:`1px solid ${s.color}22`, background:`${s.color}06` }}>
                    <div style={{ fontSize:10, fontWeight:700, color:s.color, textTransform:'uppercase',
                      letterSpacing:'0.06em', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:20, fontWeight:800, color:'var(--navy)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
