import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { fmt, COLORS, CONFIG_COLORS, CONFIG_LABELS, PROGRAM_EVENTS, YEAR_NARRATIVES } from '../utils';
import trendsData from '../data/reach_program_trends.json';
import configMatrix from '../data/reach_config_matrix.json';

// ── Helper components ─────────────────────────────────────────────────────────

function ToggleGroup({ value, options, onChange }) {
  return (
    <div style={{ display:'flex', border:'1px solid var(--gray-300)',
      borderRadius:'var(--radius)', overflow:'hidden', flexShrink:0 }}>
      {options.map((opt,i) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          style={{ padding:'4px 12px', fontSize:12, fontFamily:'var(--font)', cursor:'pointer',
            border:'none', borderRight: i<options.length-1?'1px solid var(--gray-300)':'none',
            background: value===opt.value?'var(--navy)':'white',
            color: value===opt.value?'white':'var(--gray-600)',
            fontWeight: value===opt.value?600:400 }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function YearFilter({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:6 }}>
      {[2021,2022,2023].map(yr => (
        <button key={yr} onClick={() => onChange(yr)}
          style={{ padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            border:`1.5px solid ${value===yr?'var(--teal)':'var(--gray-300)'}`,
            background: value===yr?'var(--teal)':'white',
            color: value===yr?'var(--navy)':'var(--gray-600)' }}>
          PY {yr}
        </button>
      ))}
    </div>
  );
}

const Tip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-title">PY {label}</div>
      {payload.map((p,i) => p.value != null && (
        <div key={i} className="custom-tooltip-row">
          <span style={{ color: p.color||p.fill }}>{p.name}</span>
          <span className="custom-tooltip-val">{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
      {PROGRAM_EVENTS[label] && (
        <div style={{ marginTop:6, fontSize:10, color:'var(--gray-500)',
          borderTop:'1px solid var(--gray-200)', paddingTop:5 }}>
          {PROGRAM_EVENTS[label]}
        </div>
      )}
    </div>
  );
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ECATS = [
  {key:'expnd_pb',      label:'Physician'},
  {key:'expnd_inp_all', label:'Inpatient'},
  {key:'expnd_opd',     label:'Outpatient'},
  {key:'expnd_snf',     label:'SNF'},
  {key:'expnd_hha',     label:'Home Health'},
  {key:'expnd_hsp',     label:'Hospice'},
  {key:'expnd_dme',     label:'DME'},
  {key:'expnd_ambupay', label:'Amb Surg'},
];
const ECOLS = [COLORS.blue,COLORS.navy,COLORS.teal,COLORS.amber,COLORS.green,COLORS.coral,COLORS.gray,COLORS.purple];

const TREEMAP_COLORS = {
  'Global|TCC':              '#1D6B3E',
  'Global|PCC+ePCC+APO':     '#2e9478',
  'Global|PCC+ePCC':         '#42BA97',
  'Global|PCC':              '#8bd5c0',
  'Professional|PCC+ePCC+APO':'#335B74',
  'Professional|PCC+ePCC':   '#4a7a94',
  'Professional|PCC':        '#7aaabe',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ProgramOverview({ perfData, navigateToACO }) {
  const [savMode,      setSavMode]      = useState('aggregate');
  const [expndMode,    setExpndMode]    = useState('aggregate');
  const [selectedYear, setSelectedYear] = useState(2023);
  const [configYear,   setConfigYear]   = useState(2023);
  const [sortCol,      setSortCol]      = useState('avg_sav');
  const [sortDir,      setSortDir]      = useState('desc');
  const [qualView,     setQualView]     = useState('tqs');
  const [acoSearch,    setAcoSearch]    = useState('');

  const records = useMemo(() => perfData?.records || [], [perfData]);

  // ── Chart data: true program-level savings rate ───────────────────────────
  const chartData = useMemo(() => trendsData.map(t => {
    const yr      = records.filter(r => r.perf_year === t.year);
    const months  = t.year === 2021 ? 9 : 12;
    const totBnk  = yr.reduce((s,r) => s+(r.final_benchmark||0), 0);
    const totCst  = yr.reduce((s,r) => s+(r.tot_cost_care||0), 0);
    const totBen  = yr.reduce((s,r) => s+(r.bene_cnt||0), 0);
    const totSav  = yr.reduce((s,r) => s+(r.shared_savings||0), 0);
    const benMon  = totBen * months;
    const validE  = yr.filter(r => r.bene_cnt > 0);
    const avgExpPBPM = validE.length > 0
      ? validE.reduce((s,r) => s+(r.tot_cost_care||0)/(r.bene_cnt*months), 0) / validE.length
      : null;
    return {
      year:           t.year,
      n_acos:         t.n_acos,
      n_savers:       t.n_savers,
      pct_savers:     t.pct_savers,
      avg_sav_rate:   t.avg_sav_rate,
      prog_sav_rate:  totBnk > 0 ? +((totBnk-totCst)/totBnk*100).toFixed(3) : null,
      total_shared_M: t.total_shared_savings,
      shared_perbene: totBen > 0 ? +(totSav/totBen).toFixed(2) : null,
      shared_pbpm:    benMon > 0 ? +(totSav/benMon).toFixed(2) : null,
      total_benes:    t.total_benes,
      avg_qual:       t.avg_qual_scr,
      avg_acr:        t.avg_acr_scr,
      avg_uamcc:      t.avg_uamcc_scr,
      avg_exp_pbpm:   avgExpPBPM != null ? +avgExpPBPM.toFixed(2) : null,
    };
  }), [records]);

  const latest = chartData[chartData.length-1];
  const prior  = chartData[chartData.length-2];

  // ── Savings toggle ────────────────────────────────────────────────────────
  const savKey  = {aggregate:'total_shared_M', perbene:'shared_perbene', pbpm:'shared_pbpm'}[savMode];
  const savFmt  = {aggregate:v=>`$${v}M`, perbene:v=>`$${Number(v).toFixed(0)}`, pbpm:v=>`$${Number(v).toFixed(2)}`}[savMode];

  // ── Selected year ─────────────────────────────────────────────────────────
  const selRecs   = useMemo(() => records.filter(r => r.perf_year === selectedYear), [records, selectedYear]);
  const selTrend  = chartData.find(d => d.year === selectedYear);
  const selMonths = selectedYear === 2021 ? 9 : 12;
  const selBenes  = selRecs.reduce((s,r) => s+(r.bene_cnt||0), 0);
  const selSavings= selRecs.reduce((s,r) => s+(r.shared_savings||0), 0);

  // Savings distribution buckets
  const savBuckets = useMemo(() => [
    {label:'< -10%', min:-Infinity, max:-10, pos:false},
    {label:'-10–-5%',min:-10,       max:-5,  pos:false},
    {label:'-5–0%',  min:-5,        max:0,   pos:false},
    {label:'0–5%',   min:0,         max:5,   pos:true},
    {label:'5–10%',  min:5,         max:10,  pos:true},
    {label:'10–15%', min:10,        max:15,  pos:true},
    {label:'>15%',   min:15,        max:Infinity, pos:true},
  ].map(b => ({
    label: b.label, pos: b.pos,
    count: selRecs.filter(r => r.sav_rate != null && r.sav_rate >= b.min && r.sav_rate < b.max).length,
  })), [selRecs]);

  // Expenditure
  const expndData = useMemo(() => {
    const totals = {};
    selRecs.forEach(r => ECATS.forEach(c => {
      if (r[c.key] != null) totals[c.label] = (totals[c.label]||0) + r[c.key];
    }));
    return ECATS.map(c => {
      const raw = totals[c.label] || 0;
      return {
        label:     c.label,
        aggregate: +(raw/1e6).toFixed(1),
        perbene:   selBenes > 0 ? +(raw/selBenes).toFixed(2) : 0,
        pbpm:      selBenes > 0 ? +(raw/(selBenes*selMonths)).toFixed(2) : 0,
      };
    }).sort((a,b) => b.aggregate - a.aggregate);
  }, [selRecs, selBenes, selMonths]);
  const expndFmt = {aggregate:v=>`$${v}M`, perbene:v=>`$${Number(v).toFixed(0)}`, pbpm:v=>`$${Number(v).toFixed(2)}`}[expndMode];

  // Risk arrangement
  const riskData = useMemo(() => ['Global','Professional'].map(type => {
    const recs = selRecs.filter(r => r.risk_arrangement === type);
    const avg  = recs.length ? recs.reduce((s,r) => s+(r.sav_rate||0), 0) / recs.length : null;
    return { name:type, count:recs.length, avgSav: avg != null ? +avg.toFixed(2) : null,
      color: type==='Global' ? COLORS.green : COLORS.blue };
  }), [selRecs]);

  // Config performance for config year
  const configData = useMemo(() => {
    const prefix = `py${configYear}_`;
    return configMatrix
      .filter(m => m[`${prefix}count`] != null && m[`${prefix}count`] > 0)
      .map(m => ({
        label:       `${m.risk}/${m.cap}`,
        config_key:  `${m.risk}/${m.cap}`,
        enhanced_pcc: m.enhanced_pcc,
        stop_loss:   m.stop_loss,
        count:       m[`${prefix}count`],
        avg_sav:     m[`${prefix}avg_sav`],
        pct_sav:     m[`${prefix}pct_sav`],
        shared_M:    m[`${prefix}total_shared_M`],
        color:       CONFIG_COLORS[`${m.risk}/${m.cap}`] || COLORS.gray,
      }))
      .sort((a,b) => (b.avg_sav||0) - (a.avg_sav||0));
  }, [configYear]);

  // Sorted config data for table
  const sortedConfig = useMemo(() => [...configData].sort((a,b) => {
    const av = sortCol==='count'?a.count : sortCol==='avg_sav'?(a.avg_sav||0) : sortCol==='pct_sav'?(a.pct_sav||0) : (a.shared_M||0);
    const bv = sortCol==='count'?b.count : sortCol==='avg_sav'?(b.avg_sav||0) : sortCol==='pct_sav'?(b.pct_sav||0) : (b.shared_M||0);
    return sortDir==='desc' ? bv-av : av-bv;
  }), [configData, sortCol, sortDir]);

  // Utilization
  const utilData = useMemo(() => chartData.map(t => {
    const yr  = records.filter(r => r.perf_year === t.year);
    const avg = key => yr.length ? yr.reduce((s,r) => s+(r[key]||0), 0)/yr.length : null;
    return {
      year: t.year,
      'ED Visits/1K':  avg('p_edv_vis')  != null ? +avg('p_edv_vis').toFixed(1)  : null,
      'SNF Admits/1K': avg('p_snf_adm')  != null ? +avg('p_snf_adm').toFixed(1)  : null,
      'PCP EM/1K':     avg('p_em_pcp_vis') != null ? +avg('p_em_pcp_vis').toFixed(1) : null,
      'Spec EM/1K':    avg('p_em_sp_vis') != null ? +avg('p_em_sp_vis').toFixed(1) : null,
    };
  }), [chartData, records]);

  // Longitudinal cohort
  const longData = useMemo(() => {
    const ids21 = new Set(records.filter(r => r.perf_year===2021).map(r => r.aco_id));
    const ids22 = new Set(records.filter(r => r.perf_year===2022).map(r => r.aco_id));
    const ids23 = new Set(records.filter(r => r.perf_year===2023).map(r => r.aco_id));
    const all3  = [...ids21].filter(id => ids22.has(id) && ids23.has(id));
    const avgSav = (ids, yr) => {
      const recs = records.filter(r => ids.includes(r.aco_id) && r.perf_year===yr && r.sav_rate!=null);
      return recs.length ? +(recs.reduce((s,r) => s+r.sav_rate, 0)/recs.length).toFixed(2) : null;
    };
    const pAvg = {};
    trendsData.forEach(t => { pAvg[String(t.year)] = t.avg_sav_rate; });
    return [
      { cohort:'All-3-Year (n=44)', py2021:avgSav(all3,2021), py2022:avgSav(all3,2022), py2023:avgSav(all3,2023) },
      { cohort:'Program Avg',       py2021:pAvg['2021']??null, py2022:pAvg['2022']??null, py2023:pAvg['2023']??null },
    ];
  }, [records]);

  // HEBA summary
  const hebaSummary = useMemo(() => {
    const py23    = records.filter(r => r.perf_year===2023);
    const upTotal = py23.reduce((s,r) => s+(r.heba_up_amt||0), 0);
    const dnTotal = py23.reduce((s,r) => s+(r.heba_down_amt||0), 0);
    const upCount = py23.filter(r => (r.heba_up_amt||0)>0).length;
    return { upTotal, dnTotal, upCount, net:upTotal+dnTotal, n:py23.length };
  }, [records]);

  // CAHPS comparison
  const cahpsCompData = useMemo(() => {
    const labels = {
      ssm_taci:'Timely Access', ssm_com:'Communication', ssm_cc:'Care Coordination',
      ssm_sdm:'Shared Decision', ssm_pr:'Provider Rating', ssm_chos:'Choice/Provider',
      ssm_hpe:'Health Promotion', ssm_spr:'Specialist Rating',
    };
    return Object.entries(labels).map(([key, measure]) => {
      const py22 = records.filter(r => r.perf_year===2022 && r[key]!=null);
      const py23 = records.filter(r => r.perf_year===2023 && r[key]!=null);
      return {
        measure,
        PY2022: py22.length ? +(py22.reduce((s,r) => s+r[key], 0)/py22.length).toFixed(1) : null,
        PY2023: py23.length ? +(py23.reduce((s,r) => s+r[key], 0)/py23.length).toFixed(1) : null,
      };
    }).filter(d => d.PY2022!=null || d.PY2023!=null);
  }, [records]);

  // All-time rollup
  const allSavings = records.reduce((s,r) => s+(r.shared_savings||0), 0);

  // SortTh helper
  const SortTh = ({ col, label, right }) => (
    <th style={{ textAlign:right?'right':'left', cursor:'pointer', userSelect:'none' }}
      onClick={() => { setSortDir(sortCol===col && sortDir==='desc' ? 'asc' : 'desc'); setSortCol(col); }}>
      {label} {sortCol===col ? (sortDir==='desc'?'↓':'↑') : <span style={{color:'var(--gray-300)'}}>↕</span>}
    </th>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Context banner */}
      <div className="lead-banner">
        <h2>ACO REACH Model — PY 2021–2023</h2>
        <p>
          The ACO REACH Model (formerly GPDC) introduced prospective capitated payments,
          concurrent risk adjustment, and health equity provisions — all of which carry forward
          into the <a href="https://trynytyhealth.com/post-lead-model" target="_blank" rel="noreferrer">LEAD Model</a>{' '}
          launching January 1, 2027.{' '}
          <strong style={{color:'var(--gold)'}}>LEAD applications close May 17, 2026.</strong>
        </p>
      </div>

      {/* All-time bar */}
      <div style={{background:'var(--navy)',borderRadius:'var(--radius-lg)',padding:'20px 24px'}}>
        <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14}}>
          All-Time Program Summary · PY 2021–2023
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20}}>
          {[
            {label:'Unique ACOs',          value: fmt.num(new Set(records.map(r=>r.aco_id)).size)},
            {label:'Total Earned Savings',  value: fmt.dollars(allSavings)},
            {label:'PY 2023 Beneficiaries', value: fmt.shortNum(records.filter(r=>r.perf_year===2023).reduce((s,r)=>s+(r.bene_cnt||0),0))},
            {label:'PY 2023 High Performers',value:`${records.filter(r=>r.perf_year===2023&&r.hpp_flag==='Yes').length} of 132 ACOs`},
          ].map(s => (
            <div key={s.label}>
              <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{s.label}</div>
              <div style={{fontSize:'1.7rem',fontWeight:700,color:'var(--teal)',lineHeight:1.1}}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div>
        <div style={{fontSize:11,fontWeight:600,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>
          Most Recent Performance Year (PY {latest?.year})
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
          {[
            { title:'ACOs Participating',   value:fmt.num(latest?.n_acos),
              delta:`${(latest?.n_acos-prior?.n_acos)>0?'+':''}${latest?.n_acos-prior?.n_acos} vs PY ${prior?.year}` },
            { title:'Earned Savings',       value:fmt.dollars(records.filter(r=>r.perf_year===latest?.year).reduce((s,r)=>s+(r.shared_savings||0),0)),
              delta:`vs ${fmt.dollars(records.filter(r=>r.perf_year===prior?.year).reduce((s,r)=>s+(r.shared_savings||0),0))} in PY ${prior?.year}` },
            { title:'% Earning Savings',    value:`${latest?.pct_savers}%`,
              delta:`${(latest?.pct_savers-prior?.pct_savers)>0?'+':''}${(latest?.pct_savers-prior?.pct_savers).toFixed(1)}pp vs PY ${prior?.year}` },
            { title:'Program Savings Rate', value:latest?.prog_sav_rate!=null?`${latest.prog_sav_rate.toFixed(2)}%`:'—',
              note:'(Σ Benchmark − Σ Expense) ÷ Σ Benchmark',
              delta:prior?.prog_sav_rate!=null?`${(latest?.prog_sav_rate-prior?.prog_sav_rate)>0?'+':''}${(latest?.prog_sav_rate-prior?.prog_sav_rate).toFixed(2)}pp vs PY ${prior?.year}`:''},
            { title:'Assigned Beneficiaries', value:fmt.shortNum(latest?.total_benes),
              delta:`+${fmt.shortNum(latest?.total_benes-prior?.total_benes)} vs PY ${prior?.year}` },
            { title:'Avg Expense PBPM',     value:latest?.avg_exp_pbpm!=null?`$${Number(latest.avg_exp_pbpm).toFixed(2)}`:'—',
              delta:prior?.avg_exp_pbpm!=null?`${(latest?.avg_exp_pbpm-prior?.avg_exp_pbpm)>0?'+':''}$${(latest?.avg_exp_pbpm-prior?.avg_exp_pbpm).toFixed(2)} vs PY ${prior?.year}`:''},
          ].map((k,ki) => (
            <div className="chart-card" key={ki} style={{padding:'14px 18px'}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>
                {k.title}{k.note&&<span style={{fontWeight:400,color:'var(--gray-400)',fontSize:10,marginLeft:4}}>({k.note})</span>}
              </div>
              <div style={{fontSize:'1.6rem',fontWeight:700,color:'var(--navy)',lineHeight:1}}>{k.value}</div>
              {k.delta&&<div style={{fontSize:11,color:'var(--gray-500)',marginTop:4}}>{k.delta}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Performance Matrix */}
      <div className="chart-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div>
            <div className="chart-title">Configuration Performance Matrix</div>
            <div className="chart-subtitle">
              How ACO performance varies by Risk × Capitation × Enhanced PCC × Stop Loss.
              This analysis is not published by CMS — derived from the participant-level PUF.
            </div>
          </div>
          <YearFilter value={configYear} onChange={setConfigYear} />
        </div>

        {/* Summary cards for 3 main configs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
          {[
            {key:'Global/TCC',          label:'Global / Total Care Cap',      desc:'Full Medicare payment flow',     color:COLORS.green},
            {key:'Global/PCC',          label:'Global / Primary Care Cap',     desc:'Primary care cap + claims',      color:COLORS.teal},
            {key:'Professional/PCC',    label:'Professional / Primary Care Cap',desc:'50% shared savings/losses',    color:COLORS.blue},
          ].map(cfg => {
            const d       = configData.filter(r => r.config_key===cfg.key);
            const tot     = d.reduce((s,r) => s+r.count, 0);
            const allSav  = d.filter(r => r.avg_sav!=null);
            const wavg    = allSav.length ? allSav.reduce((s,r) => s+(r.avg_sav||0)*r.count, 0)/allSav.reduce((s,r)=>s+r.count,0) : null;
            const allPct  = d.filter(r => r.pct_sav!=null);
            const avgPct  = allPct.length ? allPct.reduce((s,r) => s+(r.pct_sav||0)*r.count, 0)/allPct.reduce((s,r)=>s+r.count,0) : null;
            return (
              <div key={cfg.key} style={{padding:'16px',borderRadius:'var(--radius)',
                border:`1.5px solid ${cfg.color}44`, background:`${cfg.color}08`,
                borderTop:`3px solid ${cfg.color}`}}>
                <div style={{fontSize:10,fontWeight:700,color:cfg.color,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>{cfg.label}</div>
                <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:12}}>{cfg.desc}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,
                  borderTop:'1px solid rgba(0,0,0,0.08)',paddingTop:12}}>
                  {[
                    {label:'ACOs',        val:String(tot),                              color:'var(--navy)'},
                    {label:'Avg Sav Rate',val:wavg!=null?`${wavg.toFixed(1)}%`:'—',    color:wavg!=null&&wavg>0?COLORS.green:COLORS.red},
                    {label:'% Savers',    val:avgPct!=null?`${avgPct.toFixed(0)}%`:'—',color:'var(--navy)'},
                  ].map((m,mi) => (
                    <div key={m.label} style={{textAlign:'center',
                      borderRight:mi<2?'1px solid rgba(0,0,0,0.08)':'none', padding:'0 10px'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'var(--gray-500)',
                        textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{m.label}</div>
                      <div style={{fontSize:30,fontWeight:800,color:m.color,lineHeight:1}}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sortable detail table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Configuration</th>
                <th>Enhanced PCC</th>
                <th>Stop Loss</th>
                <SortTh col="count"    label="ACOs"         right />
                <SortTh col="avg_sav"  label="Avg Sav Rate" right />
                <SortTh col="pct_sav"  label="% Savers"     right />
                <SortTh col="shared_M" label="Total Shared"  right />
              </tr>
            </thead>
            <tbody>
              {sortedConfig.map((row,i) => (
                <tr key={i}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:8,borderRadius:2,background:row.color,flexShrink:0}}/>
                      <span style={{fontWeight:500}}>{CONFIG_LABELS[row.config_key]||row.config_key}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:12,fontWeight:600,
                      background:row.enhanced_pcc==='Yes'?'var(--teal-light)':'var(--gray-100)',
                      color:row.enhanced_pcc==='Yes'?'var(--teal-dark)':'var(--gray-500)'}}>
                      {row.enhanced_pcc}
                    </span>
                  </td>
                  <td>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:12,fontWeight:600,
                      background:row.stop_loss==='Yes'?'var(--blue-light)':'var(--gray-100)',
                      color:row.stop_loss==='Yes'?'var(--blue)':'var(--gray-500)'}}>
                      {row.stop_loss}
                    </span>
                  </td>
                  <td style={{textAlign:'right',fontWeight:600}}>{row.count}</td>
                  <td style={{textAlign:'right'}}>
                    <strong style={{color:row.avg_sav>0?COLORS.green:COLORS.red}}>
                      {row.avg_sav!=null?`${row.avg_sav}%`:'—'}
                    </strong>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                      <div style={{width:60,height:6,background:'var(--gray-200)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${row.pct_sav||0}%`,
                          background:row.pct_sav>=70?COLORS.green:row.pct_sav>=50?COLORS.teal:COLORS.red,
                          borderRadius:3}}/>
                      </div>
                      <span style={{fontWeight:600,fontSize:12}}>{row.pct_sav!=null?`${row.pct_sav}%`:'—'}</span>
                    </div>
                  </td>
                  <td style={{textAlign:'right',color:'var(--gray-700)'}}>
                    {row.shared_M!=null?`$${row.shared_M}M`:'—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:10,fontSize:11,color:'var(--gray-600)',padding:'8px 12px',
          background:'var(--gray-50)',borderRadius:'var(--radius)'}}>
          <strong>Key finding PY {configYear}:</strong> Global/TCC without stop loss averaged{' '}
          {configData.find(d=>d.config_key==='Global/TCC'&&d.stop_loss==='No')?.avg_sav?.toFixed(1)}% savings
          with {configData.find(d=>d.config_key==='Global/TCC'&&d.stop_loss==='No')?.pct_sav}% savers
          — the highest-performing configuration. This maps to the Global track in LEAD.
        </div>
      </div>

      {/* ACO Participation & Beneficiaries */}
      <div className="chart-card">
        <div className="chart-title">ACO Participation & Assigned Beneficiaries</div>
        <div className="chart-subtitle">Number of ACOs (bars, left) and total aligned beneficiaries (line, right)</div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{top:8,right:56,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
            <XAxis dataKey="year" tick={{fontSize:11}}/>
            <YAxis yAxisId="left" tick={{fontSize:11}} width={40} domain={[0,160]}/>
            <YAxis yAxisId="right" orientation="right" tick={{fontSize:11}} width={60} tickFormatter={v=>fmt.shortNum(v)}/>
            <Tooltip content={({active,payload,label})=>{
              if(!active||!payload?.length) return null;
              return (
                <div className="custom-tooltip">
                  <div className="custom-tooltip-title">PY {label}</div>
                  {payload.map((p,i)=>(
                    <div key={i} className="custom-tooltip-row">
                      <span style={{color:p.color||p.fill}}>{p.name}</span>
                      <span className="custom-tooltip-val">{p.name==='ACOs'?p.value:fmt.shortNum(p.value)}</span>
                    </div>
                  ))}
                  {PROGRAM_EVENTS[label]&&<div style={{marginTop:6,fontSize:10,color:'var(--gray-500)',borderTop:'1px solid var(--gray-200)',paddingTop:5}}>{PROGRAM_EVENTS[label]}</div>}
                </div>
              );
            }}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar yAxisId="left" dataKey="n_acos" name="ACOs" fill={COLORS.blue} radius={[3,3,0,0]}/>
            <Line yAxisId="right" type="monotone" dataKey="total_benes" name="Beneficiaries"
              stroke={COLORS.teal} strokeWidth={2.5} dot={{r:5,fill:COLORS.teal}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Program Savings Rate — dual axis */}
      <div className="chart-card">
        <div className="chart-title">Program Savings Rate</div>
        <div className="chart-subtitle">
          (Σ Benchmark − Σ Total Cost) ÷ Σ Benchmark — true program-level rate weighted by ACO size (left axis).
          % ACOs generating savings on right axis.
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={chartData} margin={{top:8,right:56,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
            <XAxis dataKey="year" tick={{fontSize:11}}/>
            <YAxis yAxisId="left" tickFormatter={v=>`${v}%`} tick={{fontSize:11}} width={44} domain={[0,8]}/>
            <YAxis yAxisId="right" orientation="right" tickFormatter={v=>`${v}%`} tick={{fontSize:11}} width={44} domain={[0,100]}/>
            <ReferenceLine yAxisId="left" y={0} stroke="var(--gray-400)" strokeDasharray="4 4"/>
            <Tooltip content={({active,payload,label})=>{
              if(!active||!payload?.length) return null;
              return (
                <div className="custom-tooltip">
                  <div className="custom-tooltip-title">PY {label}</div>
                  {payload.map((p,i)=>p.value!=null&&(
                    <div key={i} className="custom-tooltip-row">
                      <span style={{color:p.color||p.fill}}>{p.name}</span>
                      <span className="custom-tooltip-val">{Number(p.value).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              );
            }}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar yAxisId="left" dataKey="prog_sav_rate" name="Program Savings Rate" radius={[3,3,0,0]}>
              {chartData.map((d,i)=><Cell key={i} fill={d.prog_sav_rate>=0?COLORS.teal:COLORS.red}/>)}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="pct_savers" name="% ACOs Saving"
              stroke={COLORS.blue} strokeWidth={2.5} strokeDasharray="5 3" dot={{r:5}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Total Shared Savings */}
      <div className="chart-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div>
            <div className="chart-title">Total Shared Savings</div>
            <div className="chart-subtitle">Earned savings by performance year</div>
          </div>
          <ToggleGroup value={savMode} onChange={setSavMode} options={[
            {value:'aggregate',label:'Total ($M)'},{value:'perbene',label:'Per Bene'},{value:'pbpm',label:'PBPM'}
          ]}/>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{top:4,right:12,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
            <XAxis dataKey="year" tick={{fontSize:11}}/>
            <YAxis tickFormatter={savFmt} tick={{fontSize:11}}/>
            <Tooltip formatter={v=>[savFmt(v),'Shared Savings']}/>
            <Bar dataKey={savKey} name="Shared Savings" radius={[3,3,0,0]}>
              {chartData.map((_,i)=><Cell key={i} fill={i===chartData.length-1?COLORS.teal:COLORS.blue}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quality Trends — tabbed */}
      <div className="chart-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div>
            <div className="chart-title">Quality Measure Trends</div>
            <div className="chart-subtitle">
              PY 2021: 100% under pay-for-reporting. PY 2023: shift to pay-for-performance — scores reflect actual performance.
            </div>
          </div>
          <ToggleGroup value={qualView} onChange={setQualView} options={[
            {value:'tqs',   label:'Quality Score'},
            {value:'claims',label:'Claims Measures'},
            {value:'cahps', label:'CAHPS'},
          ]}/>
        </div>

        {qualView==='tqs' && (
          <div className="grid-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{top:4,right:12,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
                <XAxis dataKey="year" tick={{fontSize:11}}/>
                <YAxis domain={[0,105]} tickFormatter={v=>`${v}%`} tick={{fontSize:11}}/>
                <Tooltip formatter={v=>[`${Number(v).toFixed(1)}%`,'Avg Quality Score']}/>
                <Line type="monotone" dataKey="avg_qual" name="Avg Quality Score"
                  stroke={COLORS.green} strokeWidth={2.5} dot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{padding:'4px 0'}}>
              {[
                {yr:2021, val:100,  note:'Pay-for-reporting — all ACOs received 100%'},
                {yr:2022, val:99.4, note:'Still largely P4R — only 11 ACOs below 100%'},
                {yr:2023, val:79.4, note:'First P4P year — scores reflect actual performance'},
              ].map(row => (
                <div key={row.yr} style={{display:'flex',gap:12,alignItems:'flex-start',
                  padding:'10px 14px',marginBottom:6,borderRadius:'var(--radius)',
                  background:row.yr===2023?'var(--amber-light)':'var(--gray-50)',
                  border:`1px solid ${row.yr===2023?'rgba(212,134,10,0.2)':'var(--gray-200)'}`}}>
                  <div style={{fontWeight:700,color:'var(--navy)',minWidth:40}}>PY{row.yr}</div>
                  <div style={{fontSize:22,fontWeight:800,color:row.yr===2023?COLORS.amber:COLORS.green,minWidth:56}}>{row.val}%</div>
                  <div style={{fontSize:11,color:'var(--gray-600)',lineHeight:1.5,paddingTop:4}}>{row.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {qualView==='claims' && (
          <div>
            <div style={{marginBottom:10,fontSize:12,color:'var(--gray-500)'}}>
              ACR = All-Condition Readmissions (lower = better) · UAMCC = Unplanned Admissions for Multiple Chronic Conditions (lower = better) · TFU = Timely Follow-Up (higher = better, PY2022+ only)
            </div>
            <div className="grid-2">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.filter(d=>d.avg_acr!=null)} margin={{top:4,right:12,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
                  <XAxis dataKey="year" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Line type="monotone" dataKey="avg_acr"   name="ACR (↓ better)"   stroke={COLORS.red}   strokeWidth={2.5} dot={{r:5}}/>
                  <Line type="monotone" dataKey="avg_uamcc" name="UAMCC (↓ better)" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="5 3" dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
              <div>
                {[
                  {yr:2022, acr:15.64, uamcc:34.30, tfu:68.31},
                  {yr:2023, acr:15.77, uamcc:35.37, tfu:71.80},
                ].map(row => (
                  <div key={row.yr} style={{display:'flex',gap:10,padding:'10px 14px',marginBottom:6,
                    borderRadius:'var(--radius)',background:'var(--gray-50)',border:'1px solid var(--gray-200)'}}>
                    <div style={{fontWeight:700,color:'var(--navy)',minWidth:42}}>PY{row.yr}</div>
                    <div style={{display:'flex',gap:16,fontSize:12}}>
                      <span>ACR: <strong>{row.acr}%</strong></span>
                      <span>UAMCC: <strong>{row.uamcc}</strong></span>
                      <span>TFU: <strong>{row.tfu}%</strong></span>
                    </div>
                  </div>
                ))}
                <div style={{marginTop:8,fontSize:11,color:'var(--gray-600)',padding:'8px 12px',
                  background:'var(--blue-light)',borderRadius:'var(--radius)'}}>
                  TFU not available PY2021. ACR and UAMCC slightly worsened PY22→23, consistent with
                  expanded high-needs participation in PY2023.
                </div>
              </div>
            </div>
          </div>
        )}

        {qualView==='cahps' && (
          <div>
            <div style={{marginBottom:10,fontSize:12,color:'var(--gray-500)'}}>
              CAHPS SSM measures — available PY2022 and PY2023 only. Higher = better. All scores on 0–100 scale.
            </div>
            {cahpsCompData.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cahpsCompData} layout="vertical"
                  margin={{top:4,right:60,left:130,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
                  <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:10}}/>
                  <YAxis type="category" dataKey="measure" tick={{fontSize:10}} width={130} interval={0}/>
                  <Tooltip formatter={v=>[`${Number(v).toFixed(1)}%`,'']}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="PY2022" fill={COLORS.blue} radius={[0,2,2,0]}/>
                  <Bar dataKey="PY2023" fill={COLORS.teal} radius={[0,2,2,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{marginTop:10,fontSize:11,color:'var(--gray-500)',padding:'8px 12px',
              background:'var(--gray-50)',borderRadius:'var(--radius)'}}>
              Communication and Choice of Provider score highest (90%+). Shared Decision Making and
              Specialist Provider Rating are lowest — consistent with national primary care patterns. PY2021 not available.
            </div>
          </div>
        )}
      </div>

      {/* Utilization Trends */}
      <div className="chart-card">
        <div className="chart-title">Utilization Trends</div>
        <div className="chart-subtitle">
          Average per 1,000 beneficiaries. Note: PY2021 is 9 months — not directly comparable on annualized basis.
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={utilData} margin={{top:8,right:16,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
            <XAxis dataKey="year" tick={{fontSize:11}}/>
            <YAxis tick={{fontSize:11}}/>
            <Tooltip content={<Tip formatter={(v,n)=>`${Number(v).toFixed(1)} / 1K`}/>}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Line type="monotone" dataKey="ED Visits/1K"  stroke={COLORS.red}   strokeWidth={2} dot={{r:4}}/>
            <Line type="monotone" dataKey="SNF Admits/1K" stroke={COLORS.amber} strokeWidth={2} dot={{r:4}}/>
            <Line type="monotone" dataKey="PCP EM/1K"     stroke={COLORS.teal}  strokeWidth={2} dot={{r:4}}/>
            <Line type="monotone" dataKey="Spec EM/1K"    stroke={COLORS.blue}  strokeWidth={2} strokeDasharray="5 3" dot={{r:3}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Longitudinal */}
      <div className="chart-card">
        <div className="chart-title">Longitudinal ACO Performance</div>
        <div className="chart-subtitle">
          44 ACOs participated all 3 years. Their trajectory (3.95% → 6.95% → 7.41%) demonstrates
          compounding experience — the core argument for LEAD's 10-year term. 70% improved over the period.
        </div>
        <div style={{display:'flex',gap:16,marginTop:16,flexWrap:'wrap'}}>
          {longData.map((row,ri) => {
            const color = ri===0 ? COLORS.teal : COLORS.blue;
            return (
              <div key={row.cohort} style={{flex:1,minWidth:200}}>
                <div style={{fontSize:11,fontWeight:700,color,marginBottom:8}}>{row.cohort}</div>
                <div style={{display:'flex',gap:8}}>
                  {[2021,2022,2023].map((yr,i) => {
                    const val = row[`py${yr}`];
                    return (
                      <div key={yr} style={{flex:1,textAlign:'center',padding:'10px 6px',
                        background:i===2?`${color}18`:'var(--gray-50)',
                        borderRadius:'var(--radius)',border:`1px solid ${color}22`}}>
                        <div style={{fontSize:10,color:'var(--gray-500)',marginBottom:4}}>PY{yr}</div>
                        <div style={{fontSize:18,fontWeight:700,color}}>
                          {val!=null ? `${Number(val).toFixed(2)}%` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:12,padding:'10px 14px',background:'var(--teal-light)',
          borderRadius:'var(--radius)',fontSize:12,color:'var(--teal-dark)',fontWeight:500}}>
          → LEAD's 10-year no-rebase structure is designed for organizations with this trajectory.
          The longer you perform, the more the stable benchmark compounds in your favor.
        </div>
      </div>

      {/* HEBA */}
      <div className="chart-card" style={{borderLeft:'4px solid var(--gold)'}}>
        <div className="chart-title">Health Equity Benchmark Adjustment (HEBA) — PY 2023</div>
        <div className="chart-subtitle">
          Unique to ACO REACH and LEAD — no equivalent in MSSP. HEBA adjusts each ACO's benchmark
          to account for historically suppressed spending in underserved communities.
        </div>
        <div style={{display:'flex',gap:16,marginTop:14,flexWrap:'wrap'}}>
          {[
            {label:'ACOs Receiving Upward Adj', value:fmt.num(hebaSummary.upCount), sub:`Total: ${fmt.dollars(hebaSummary.upTotal)}`, color:COLORS.green},
            {label:'ACOs Receiving Downward Adj',value:fmt.num(hebaSummary.n),       sub:`Total: ${fmt.dollars(hebaSummary.dnTotal)}`, color:COLORS.red},
            {label:'Net Program Impact',         value:fmt.dollars(hebaSummary.net),  sub:'Near-neutral by design',                   color:COLORS.teal},
          ].map(s => (
            <div key={s.label} style={{flex:1,minWidth:160,padding:'16px',
              borderRadius:'var(--radius)',border:`1px solid ${s.color}22`,background:`${s.color}06`}}>
              <div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{s.label}</div>
              <div style={{fontSize:36,fontWeight:800,color:'var(--navy)',lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:13,color:'var(--gray-600)',marginTop:7,fontWeight:600}}>{s.sub}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,padding:'10px 14px',background:'var(--gold-light)',
          borderRadius:'var(--radius)',fontSize:12,color:'var(--amber)'}}>
          <strong>LEAD context:</strong> HEBA carries forward into LEAD with expanded application.
          ACOs serving dually eligible and underserved populations will benefit from more accurate
          benchmark-setting — directly addressing the historical disincentive to care for complex populations.
        </div>
      </div>

      {/* Year filter */}
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Year Detail:</div>
        <YearFilter value={selectedYear} onChange={setSelectedYear}/>
      </div>

      {/* Year narrative */}
      <div style={{background:'var(--navy)',borderRadius:'var(--radius-lg)',padding:'16px 20px',borderLeft:'4px solid var(--teal)'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--teal)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>
          PY {selectedYear} — Program Context
        </div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.7}}>
          {YEAR_NARRATIVES[selectedYear]}
        </div>
        <div style={{display:'flex',gap:28,marginTop:14,flexWrap:'wrap'}}>
          {[
            {label:'ACOs',           value:selTrend?.n_acos},
            {label:'Savers',         value:`${selTrend?.n_savers} (${selTrend?.pct_savers}%)`},
            {label:'Program Sav Rate',value:selTrend?.prog_sav_rate!=null?`${selTrend.prog_sav_rate.toFixed(2)}%`:'—'},
            {label:'Shared Savings', value:fmt.dollars(selSavings)},
            {label:'Avg Quality',    value:selTrend?.avg_qual!=null?`${Number(selTrend.avg_qual).toFixed(1)}%`:'—'},
          ].map(s => (
            <div key={s.label}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>{s.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:'var(--teal)',lineHeight:1}}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Arrangement + Treemap */}
      <div className="chart-card">
        <div className="chart-title">PY {selectedYear} — Risk Arrangement & Configuration Breakdown</div>
        <div className="chart-subtitle">Box width = proportion of ACOs in each configuration. Hover for details.</div>

        {/* Risk summary cards */}
        <div style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap'}}>
          {riskData.map(r => (
            <div key={r.name} style={{flex:1,minWidth:180,padding:'16px 18px',
              borderRadius:'var(--radius)',border:`1.5px solid ${r.color}44`,background:`${r.color}08`,
              borderTop:`3px solid ${r.color}`}}>
              <div style={{fontSize:11,fontWeight:700,color:r.color,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{r.name} Risk</div>
              <div style={{display:'flex',gap:14,alignItems:'baseline'}}>
                <div style={{fontSize:32,fontWeight:800,color:'var(--navy)',lineHeight:1}}>{r.count}</div>
                <div style={{fontSize:13,color:'var(--gray-500)'}}>({selTrend?Math.round(r.count/selTrend.n_acos*100):0}% of program)</div>
              </div>
              {r.avgSav!=null && (
                <div style={{fontSize:13,color:'var(--gray-600)',marginTop:8,fontWeight:500}}>
                  Avg savings rate: <strong style={{fontSize:16,color:r.avgSav>=0?COLORS.green:COLORS.red}}>{r.avgSav.toFixed(2)}%</strong>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Treemap proportional bars */}
        {(() => {
          const cfgGroups = {};
          selRecs.forEach(r => {
            const risk = r.risk_arrangement;
            const epcc = r.enhanced_pcc==='Yes';
            const apo  = r.apo_election==='Yes';
            const cap  = r.capitation;
            let lbl = cap==='TCC' ? 'TCC' : (epcc ? (apo ? 'PCC+ePCC+APO' : 'PCC+ePCC') : 'PCC');
            const key = `${risk}|${lbl}`;
            if (!cfgGroups[key]) cfgGroups[key] = {risk,cap,epcc,apo,label:lbl,count:0,sav_rates:[],shared:[],benes:[]};
            cfgGroups[key].count++;
            if (r.sav_rate!=null)       cfgGroups[key].sav_rates.push(r.sav_rate);
            if (r.shared_savings!=null) cfgGroups[key].shared.push(r.shared_savings);
            if (r.bene_cnt!=null)       cfgGroups[key].benes.push(r.bene_cnt);
          });
          const groups = Object.values(cfgGroups).map(g => ({
            ...g,
            avg_sav:    g.sav_rates.length ? +(g.sav_rates.reduce((s,v)=>s+v,0)/g.sav_rates.length).toFixed(2) : null,
            pct_sav:    g.sav_rates.length ? Math.round(g.sav_rates.filter(v=>v>0).length/g.sav_rates.length*100) : null,
            total_shared: g.shared.reduce((s,v)=>s+v,0),
            total_benes:  g.benes.reduce((s,v)=>s+v,0),
          })).sort((a,b) => { if(a.risk!==b.risk) return a.risk==='Global'?-1:1; return b.count-a.count; });

          return (
            <div>
              {['Global','Professional'].map(riskType => {
                const rg = groups.filter(g => g.risk===riskType);
                const rt = rg.reduce((s,g) => s+g.count, 0);
                return (
                  <div key={riskType} style={{marginBottom:14}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>
                      {riskType} Risk ({rt} ACOs)
                    </div>
                    <div style={{display:'flex',gap:3,height:80}}>
                      {rg.map(g => {
                        const w = rt>0 ? g.count/rt*100 : 0;
                        const bc = TREEMAP_COLORS[`${g.risk}|${g.label}`] || COLORS.gray;
                        return (
                          <div key={g.label}
                            title={`${g.risk} / ${g.label}\n${g.count} ACOs\nAvg sav: ${g.avg_sav!=null?g.avg_sav+'%':'—'}\n% Savers: ${g.pct_sav!=null?g.pct_sav+'%':'—'}\nTotal shared: ${g.total_shared>0?'$'+(g.total_shared/1e6).toFixed(0)+'M':'—'}\nBeneficiaries: ${g.total_benes>0?(g.total_benes/1000).toFixed(0)+'K':'—'}`}
                            style={{flex:`0 0 ${w}%`,background:bc,borderRadius:'var(--radius-sm)',
                              cursor:'default',display:'flex',flexDirection:'column',
                              justifyContent:'space-between',padding:'7px 9px',minWidth:44,
                              transition:'filter 0.15s',overflow:'hidden'}}
                            onMouseEnter={e=>e.currentTarget.style.filter='brightness(1.15)'}
                            onMouseLeave={e=>e.currentTarget.style.filter='none'}>
                            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.9)',lineHeight:1.2}}>{g.label}</div>
                            <div>
                              <div style={{fontSize:15,fontWeight:800,color:'white',lineHeight:1}}>{g.count}</div>
                              {g.avg_sav!=null && <div style={{fontSize:9,color:'rgba(255,255,255,0.8)',marginTop:1}}>{g.avg_sav>0?'+':''}{g.avg_sav}%</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:8}}>
                {[
                  {label:'TCC = Total Care Capitation',    color:'#1D6B3E'},
                  {label:'PCC = Primary Care Capitation',  color:'#42BA97'},
                  {label:'ePCC = Enhanced PCC election',   color:'#4a7a94'},
                  {label:'APO = Advanced Payment Option',    color:'#335B74'},
                ].map(l => (
                  <div key={l.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'var(--gray-600)'}}>
                    <div style={{width:10,height:10,borderRadius:2,background:l.color,flexShrink:0}}/>
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Option flags */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:16}}>
          {[
            {label:'Enhanced PCC Elected',      yes:selRecs.filter(r=>r.enhanced_pcc==='Yes').length, total:selRecs.length, color:COLORS.green, note:'Higher primary care cap in exchange for tighter care management'},
            {label:'APO (Advanced Payment Option) Elected',yes:selRecs.filter(r=>r.apo_election==='Yes').length,total:selRecs.length, color:COLORS.teal,  note:'Advance capitation for non-PCP services by PCPs; APO ACOs averaged 4.91% savings vs 4.42% non-APO in PY2023'},
            {label:'Stop Loss Elected',           yes:selRecs.filter(r=>r.stop_loss==='Yes').length,   total:selRecs.length, color:COLORS.blue,  note:'Reinsurance against catastrophic individual patient costs'},
          ].map(item => {
            const pct = item.total > 0 ? Math.round(item.yes/item.total*100) : 0;
            return (
              <div key={item.label} style={{padding:'12px 14px',borderRadius:'var(--radius)',background:'var(--gray-50)',border:'1px solid var(--gray-200)'}}>
                <div style={{fontSize:10,fontWeight:700,color:item.color,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{item.label}</div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                  <div style={{fontSize:22,fontWeight:700,color:'var(--navy)'}}>{item.yes}</div>
                  <div style={{flex:1}}>
                    <div style={{height:6,background:'var(--gray-200)',borderRadius:3}}>
                      <div style={{height:'100%',width:`${pct}%`,background:item.color,borderRadius:3}}/>
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-500)',marginTop:2}}>{pct}% of {item.total} ACOs</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:'var(--gray-500)',lineHeight:1.5}}>{item.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* High Performers Pool */}
      {selectedYear===2023 && (
        <div className="chart-card" style={{borderLeft:'4px solid var(--gold)'}}>
          <div className="chart-title">High Performers Pool (HPP) — PY 2023 Only</div>
          <div className="chart-subtitle">
            ACOs meeting CI/SEP requirements AND performing above the High Performers threshold
            receive an additional bonus from a shared pool. Carries forward into LEAD.
          </div>
          <div style={{display:'flex',gap:16,marginTop:14,flexWrap:'wrap'}}>
            {[
              {label:'HPP Qualifiers',       value:`${selRecs.filter(r=>r.hpp_flag==='Yes').length}`, sub:'of 132 ACOs (18%)',              color:COLORS.gold},
              {label:'HPP Avg Savings Rate', value:`${(()=>{const h=selRecs.filter(r=>r.hpp_flag==='Yes'&&r.sav_rate!=null);return h.length?(h.reduce((s,r)=>s+r.sav_rate,0)/h.length).toFixed(2):0})()}%`, sub:'vs 4.0% non-HPP avg', color:COLORS.green},
              {label:'HPP Total Savings',    value:fmt.dollars(selRecs.filter(r=>r.hpp_flag==='Yes').reduce((s,r)=>s+(r.shared_savings||0),0)), sub:'= 44% of all PY2023 savings', color:COLORS.teal},
              {label:'CI/SEP Met',           value:`${selRecs.filter(r=>r.cisep_flag==='Yes').length}`, sub:'of 83 eligible ACOs (88%)',        color:COLORS.blue},
            ].map(s => (
              <div key={s.label} style={{flex:1,minWidth:140,padding:'16px',
                borderRadius:'var(--radius)',border:`1px solid ${s.color}22`,background:`${s.color}08`}}>
                <div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{s.label}</div>
                <div style={{fontSize:30,fontWeight:800,color:'var(--navy)',lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:12,color:'var(--gray-600)',marginTop:6,fontWeight:600}}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,padding:'10px 14px',background:'var(--gold-light)',borderRadius:'var(--radius)',fontSize:12,color:'var(--amber)'}}>
            <strong>LEAD context:</strong> The CI/SEP framework and HPP both carry into LEAD.
            ACOs meeting CI/SEP in REACH start LEAD with demonstrated track records that strengthen their application.
          </div>
          {/* HPP ACO table */}
          <div style={{marginTop:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--gray-700)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'}}>
              PY 2023 High Performers Pool — All Qualifying ACOs
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ACO Name</th>
                    <th>Type</th>
                    <th>Config</th>
                    <th style={{textAlign:'right'}}>Sav Rate</th>
                    <th style={{textAlign:'right'}}>Quality</th>
                    <th style={{textAlign:'right'}}>ACR</th>
                    <th style={{textAlign:'right'}}>TFU</th>
                    <th style={{textAlign:'right'}}>Beneficiaries</th>
                  </tr>
                </thead>
                <tbody>
                  {selRecs.filter(r=>r.hpp_flag==='Yes')
                    .sort((a,b)=>(b.sav_rate||0)-(a.sav_rate||0))
                    .map(r => (
                    <tr key={r.aco_id} style={{cursor:'pointer'}}
                      onClick={() => navigateToACO && navigateToACO({aco_id:r.aco_id,aco_name:r.aco_name,aco_type:r.aco_type})}>
                      <td>
                        <div style={{fontWeight:600,color:'var(--navy)',fontSize:12}}>{r.aco_name}</div>
                        <div style={{fontSize:10,color:'var(--gray-400)'}}>{r.aco_id}</div>
                      </td>
                      <td style={{fontSize:11,color:'var(--gray-600)'}}>{r.aco_type}</td>
                      <td style={{fontSize:10,fontWeight:600,color:'var(--gray-600)'}}>{r.config_key}</td>
                      <td style={{textAlign:'right'}}><strong style={{color:COLORS.green}}>{r.sav_rate!=null?`${r.sav_rate.toFixed(2)}%`:'—'}</strong></td>
                      <td style={{textAlign:'right'}}>{r.qual_scr!=null?`${r.qual_scr.toFixed(1)}%`:'—'}</td>
                      <td style={{textAlign:'right'}}>{r.acr_scr!=null?r.acr_scr.toFixed(2):'—'}</td>
                      <td style={{textAlign:'right'}}>{r.tfu_scr!=null?`${r.tfu_scr.toFixed(1)}%`:'—'}</td>
                      <td style={{textAlign:'right'}}>{r.bene_cnt!=null?fmt.num(r.bene_cnt):'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{fontSize:11,color:'var(--gray-400)',marginTop:6}}>Click any row → ACO Deep Dive</div>
          </div>
        </div>
      )}

      {/* Savings Distribution + Expenditure */}
      <div className="grid-2">
        <div className="chart-card">
          <div className="chart-title">PY {selectedYear} Savings Rate Distribution</div>
          <div className="chart-subtitle">Number of ACOs in each savings/loss band</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={savBuckets} margin={{top:4,right:12,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
              <XAxis dataKey="label" tick={{fontSize:9}} angle={-15} textAnchor="end" height={36}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip formatter={v=>[`${v} ACOs`,'Count']}/>
              <Bar dataKey="count" radius={[3,3,0,0]}>
                {savBuckets.map((b,i)=><Cell key={i} fill={b.pos?COLORS.teal:COLORS.red}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div className="chart-title">PY {selectedYear} Expenditure by Category</div>
              <div className="chart-subtitle">Total spend across all ACOs</div>
            </div>
            <ToggleGroup value={expndMode} onChange={setExpndMode} options={[
              {value:'aggregate',label:'Total ($M)'},{value:'perbene',label:'Per Bene'},{value:'pbpm',label:'PBPM'}
            ]}/>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={expndData} layout="vertical" margin={{top:4,right:40,left:70,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)"/>
              <XAxis type="number" tickFormatter={expndFmt} tick={{fontSize:10}}/>
              <YAxis type="category" dataKey="label" tick={{fontSize:10}} width={72} interval={0}/>
              <Tooltip formatter={v=>[expndFmt(v),'']}/>
              <Bar dataKey={expndMode} radius={[0,3,3,0]}>
                {expndData.map((_,i)=><Cell key={i} fill={ECOLS[i%8]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-Year Timeline */}
      <div className="chart-card">
        <div className="chart-title">Year-by-Year Program Timeline</div>
        <div className="chart-subtitle">Key metrics and structural changes across all performance years</div>
        <div style={{overflowX:'auto',marginTop:12}}>
          <table className="data-table" style={{minWidth:700}}>
            <thead>
              <tr>
                <th>Year</th>
                <th>Program</th>
                <th style={{textAlign:'right'}}>ACOs</th>
                <th style={{textAlign:'right'}}>Beneficiaries</th>
                <th style={{textAlign:'right'}}>Prog Sav Rate</th>
                <th style={{textAlign:'right'}}>Shared Savings</th>
                <th style={{textAlign:'right'}}>% Savers</th>
                <th style={{textAlign:'right'}}>Avg Quality</th>
                <th>Key Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                {yr:2021, prog:'GPDC',      months:'9-mo',  key:'Program launched (Apr–Dec). Pay-for-reporting quality. 53 ACOs.'},
                {yr:2022, prog:'GPDC',      months:'12-mo', key:'First full year. 99 ACOs. CAHPS SSM added. Quality still P4R.'},
                {yr:2023, prog:'ACO REACH', months:'12-mo', key:'Rebrand to ACO REACH. 132 ACOs. P4P quality shift. HEBA introduced. HPP launched.'},
              ].map(row => {
                const t   = chartData.find(d => d.year===row.yr);
                const sav = records.filter(r=>r.perf_year===row.yr).reduce((s,r)=>s+(r.shared_savings||0),0);
                return (
                  <tr key={row.yr}>
                    <td>
                      <strong style={{color:'var(--navy)',fontSize:15}}>{row.yr}</strong>
                      <div style={{fontSize:10,color:'var(--gray-400)'}}>{row.months}</div>
                    </td>
                    <td><span style={{fontSize:11,fontWeight:600,color:row.yr===2023?COLORS.teal:COLORS.blue}}>{row.prog}</span></td>
                    <td style={{textAlign:'right',fontWeight:600}}>{t?.n_acos||'—'}</td>
                    <td style={{textAlign:'right'}}>{t?fmt.shortNum(t.total_benes):'—'}</td>
                    <td style={{textAlign:'right'}}>
                      <strong style={{color:t?.prog_sav_rate>0?COLORS.green:COLORS.red}}>
                        {t?.prog_sav_rate!=null?`${t.prog_sav_rate.toFixed(2)}%`:'—'}
                      </strong>
                    </td>
                    <td style={{textAlign:'right'}}>{fmt.dollars(sav)}</td>
                    <td style={{textAlign:'right'}}>{t?.pct_savers!=null?`${t.pct_savers}%`:'—'}</td>
                    <td style={{textAlign:'right'}}>{t?.avg_qual!=null?`${Number(t.avg_qual).toFixed(1)}%`:'—'}</td>
                    <td style={{fontSize:11,color:'var(--gray-600)',maxWidth:220}}>{row.key}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* All ACOs search table */}
      <div className="chart-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div className="chart-title">All ACOs — Key Metrics</div>
            <div className="chart-subtitle">Search across all {selRecs.length} ACOs for PY {selectedYear}</div>
          </div>
          <input type="text" value={acoSearch} onChange={e => setAcoSearch(e.target.value)}
            placeholder="Search ACO name or ID…"
            style={{padding:'7px 12px',border:'1.5px solid var(--gray-300)',borderRadius:'var(--radius)',
              fontSize:13,fontFamily:'var(--font)',outline:'none',width:260}}/>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ACO Name</th>
                <th>Type</th>
                <th>Config</th>
                <th style={{textAlign:'right'}}>Sav Rate</th>
                <th style={{textAlign:'right'}}>Shared Savings</th>
                <th style={{textAlign:'right'}}>Beneficiaries</th>
                <th style={{textAlign:'right'}}>Quality</th>
                <th style={{textAlign:'right'}}>ACR</th>
                <th style={{textAlign:'right'}}>% Dual</th>
              </tr>
            </thead>
            <tbody>
              {selRecs
                .filter(r => {
                  if (!acoSearch.trim()) return true;
                  const q = acoSearch.toLowerCase();
                  return r.aco_name?.toLowerCase().includes(q) || r.aco_id?.toLowerCase().includes(q);
                })
                .sort((a,b) => (b.sav_rate||0)-(a.sav_rate||0))
                .slice(0,50)
                .map(r => (
                <tr key={r.aco_id} style={{cursor:'pointer'}}
                  onClick={() => navigateToACO && navigateToACO({aco_id:r.aco_id,aco_name:r.aco_name,aco_type:r.aco_type})}>
                  <td>
                    <div style={{fontWeight:600,color:'var(--navy)',fontSize:12}}>{r.aco_name}</div>
                    <div style={{fontSize:10,color:'var(--gray-400)'}}>{r.aco_id}</div>
                  </td>
                  <td style={{fontSize:11,color:'var(--gray-600)'}}>{r.aco_type}</td>
                  <td style={{fontSize:10,fontWeight:600,color:'var(--gray-600)'}}>{r.config_key}</td>
                  <td style={{textAlign:'right'}}>
                    <strong style={{color:(r.sav_rate||0)>0?COLORS.green:COLORS.red}}>
                      {r.sav_rate!=null?`${r.sav_rate.toFixed(2)}%`:'—'}
                    </strong>
                  </td>
                  <td style={{textAlign:'right'}}>{fmt.dollars(r.shared_savings)}</td>
                  <td style={{textAlign:'right'}}>{r.bene_cnt!=null?fmt.num(r.bene_cnt):'—'}</td>
                  <td style={{textAlign:'right'}}>{r.qual_scr!=null?`${r.qual_scr.toFixed(1)}%`:'—'}</td>
                  <td style={{textAlign:'right'}}>{r.acr_scr!=null?r.acr_scr.toFixed(2):'—'}</td>
                  <td style={{textAlign:'right'}}>{r.perc_dual!=null?`${r.perc_dual.toFixed(1)}%`:'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:8,fontSize:11,color:'var(--gray-400)'}}>
          Showing top 50 by savings rate. Click any row → Deep Dive. Year filter above controls which PY is shown.
        </div>
      </div>

    </div>
  );
}
