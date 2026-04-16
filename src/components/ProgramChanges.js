import React, { useState } from 'react';
import { COLORS } from '../utils';
import perfData from '../data/reach_performance.json';

const records = perfData.records || [];

function yearStats(year) {
  const yr = records.filter(r => r.perf_year === year);
  const savers = yr.filter(r => (r.sav_rate || 0) > 0).length;
  const savings = yr.reduce((s, r) => s + (r.shared_savings || 0), 0);
  const avgSav = yr.length ? yr.reduce((s, r) => s + (r.sav_rate || 0), 0) / yr.length : 0;
  return { n: yr.length, savers, savings, avgSav };
}

const YEARS = [
  {
    year: 2021,
    title: 'Program Launch — Global DC Model',
    badge: 'PY1',
    color: COLORS.teal,
    stats: yearStats(2021),
    duration: '9 months (Apr–Dec)',
    highlights: [
      'Launched as the Global and Professional Direct Contracting (GPDC) Model under the Trump administration',
      '53 Direct Contracting Entities (DCEs) participated in the first performance year',
      'Two risk arrangements: Global (full risk) and Professional (50% risk)',
      'Primary Care Capitation (PCC) and Total Care Capitation (TCC) arrangements introduced',
      'Pay-for-reporting quality model — ACOs received quality withhold back regardless of score',
      'Advanced Payment Option (APO) and Alignment Plus elections established',
      'Enhanced PCC election introduced to incentivize PCP utilization',
      '9-month performance period due to mid-year launch',
    ],
    changes: [],
    links: [
      { label: 'GPDC Model Overview', url: 'https://innovation.cms.gov/innovation-models/gpdc-model' },
      { label: 'PY1 Financial & Quality Results PUF', url: 'https://innovation.cms.gov/data-and-reports/2022/gpdc-puf' },
      { label: 'PY1 Data Dictionary', url: 'https://innovation.cms.gov/data-and-reports/2022/gpdc-puf' },
    ],
  },
  {
    year: 2022,
    title: 'Renamed to ACO REACH — Equity Focus Added',
    badge: 'PY2',
    color: COLORS.blue,
    stats: yearStats(2022),
    duration: '12 months (Jan–Dec)',
    highlights: [
      'Model renamed from GPDC to ACO Realizing Equity, Access, and Community Health (ACO REACH) under the Biden administration',
      '99 ACOs participated — nearly doubling from PY1',
      'Health Equity Benchmark Adjustment (HEBA) introduced to correct for historically suppressed spending in underserved communities',
      'CI/SEP (Continuous Improvement / Sustained Exceptional Performance) criteria established for PY2023 eligibility',
      'Stop Loss arrangement available to Global risk ACOs for the first time',
      'CAHPS SSM patient experience measures introduced (pay-for-reporting in PY2)',
      'TFU (Timely Follow-Up) and DAH (Days at Home) quality measures added',
      'New Entrant entity type created for organizations new to Medicare risk',
    ],
    changes: [
      { type: 'Added', text: 'HEBA adjustment — first-ever CMS mechanism to correct equity-related benchmark suppression' },
      { type: 'Added', text: 'Stop Loss option for Global risk ACOs' },
      { type: 'Added', text: 'CAHPS SSM quality measures (pay-for-reporting)' },
      { type: 'Renamed', text: 'GPDC Model → ACO REACH Model' },
    ],
    links: [
      { label: 'ACO REACH Model Page', url: 'https://innovation.cms.gov/innovation-models/aco-reach' },
      { label: 'PY2 Financial & Quality Results PUF', url: 'https://innovation.cms.gov/data-and-reports/2023/aco-reach-puf' },
      { label: 'PY2 Data Dictionary', url: 'https://innovation.cms.gov/data-and-reports/2023/aco-reach-puf' },
      { label: 'HEBA Methodology', url: 'https://innovation.cms.gov/innovation-models/aco-reach' },
    ],
  },
  {
    year: 2023,
    title: 'Full Maturity — Pay-for-Performance & HPP Launch',
    badge: 'PY3',
    color: COLORS.green,
    stats: yearStats(2023),
    duration: '12 months (Jan–Dec)',
    highlights: [
      '132 ACOs participated — 25% growth from PY2, covering 2M+ beneficiaries',
      'Quality shifted from pay-for-reporting to pay-for-performance — largest structural quality change in the model',
      'High Performers Pool (HPP) launched — 24 ACOs qualified for bonus payments averaging 8.27% savings',
      'Concurrent risk adjustment introduced for High Needs ACOs — benchmarks now incorporate current-year diagnoses',
      'HEBA fully operational — all 132 ACOs received both upward ($70.4M) and downward ($69.7M) adjustments',
      'Total earned savings reached $923.3M — largest single-year savings in the model',
      'CI/SEP ACOs (64 of 132) averaged 5.80% savings vs 1.07% for non-CI/SEP — a 5.4× difference',
      'Program declared final year of ACO REACH; transition to LEAD Model announced',
    ],
    changes: [
      { type: 'New', text: 'High Performers Pool (HPP) — bonus payments for top-performing ACOs' },
      { type: 'New', text: 'Concurrent risk adjustment for High Needs ACOs' },
      { type: 'Changed', text: 'Quality: Pay-for-Reporting → Pay-for-Performance' },
      { type: 'Changed', text: 'CAHPS SSM measures now count toward quality score (no longer just reported)' },
      { type: 'Added', text: 'HEDR (Health Equity Data Reporting) adjustment — up to 10pp quality bonus for demographic data collection' },
    ],
    links: [
      { label: 'PY3 Financial & Quality Results PUF', url: 'https://innovation.cms.gov/data-and-reports/2024/aco-reach-puf' },
      { label: 'PY3 Data Dictionary', url: 'https://innovation.cms.gov/data-and-reports/2024/aco-reach-puf' },
      { label: 'ACO REACH PY3 Results Press Release', url: 'https://www.cms.gov/newsroom/press-releases' },
      { label: 'HPP Methodology', url: 'https://innovation.cms.gov/innovation-models/aco-reach' },
    ],
  },
];

const LEAD_TIMELINE = [
  { date: 'Nov 2024', event: 'CMS announces LEAD Model as ACO REACH successor' },
  { date: 'Mar 2025', event: 'LEAD Request for Applications (RFA) released' },
  { date: 'May 17, 2026', event: 'LEAD application deadline', highlight: true },
  { date: 'Jan 1, 2027', event: 'LEAD Model performance year 1 begins' },
  { date: '2027–2036', event: '10-year model term — no benchmark rebasing' },
];

export default function ProgramChanges() {
  const [expanded, setExpanded] = useState({ 2023: true });

  const totalACOs = 150;
  const totalSavings = records.reduce((s, r) => s + (r.shared_savings || 0), 0);
  const py3 = yearStats(2023);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Hero summary */}
      <div className="chart-card">
        <div className="chart-title">ACO REACH Model — Program History</div>
        <div className="chart-subtitle">
          The ACO REACH Model (formerly Global and Professional Direct Contracting) ran from April 2021
          through December 2026. This page summarizes key regulatory changes, structural milestones, and
          actual performance data for each year, alongside links to official CMS documentation.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginTop:16 }}>
          {[
            { label:'Performance Years', value:'3 (PY1–PY3)' },
            { label:'Unique ACOs', value:`${totalACOs}` },
            { label:'Total Earned Savings', value:`$${(totalSavings/1e9).toFixed(2)}B` },
            { label:'Peak ACO Count', value:`132 (PY2023)` },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'1.7rem', fontWeight:800, color:'var(--teal)' }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Year rows */}
      {YEARS.map(yr => {
        const isOpen = expanded[yr.year];
        const s = yr.stats;
        const savPct = s.n ? ((s.savers / s.n) * 100).toFixed(0) : '—';
        const avgSav = s.avgSav.toFixed(2);
        const earnedM = (s.savings / 1e6).toFixed(1);

        return (
          <div key={yr.year} className="chart-card" style={{ padding:0, overflow:'hidden' }}>
            {/* Header row */}
            <div onClick={() => setExpanded(e => ({ ...e, [yr.year]: !isOpen }))}
              style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 24px',
                cursor:'pointer', userSelect:'none',
                background: isOpen ? 'var(--gray-50)' : 'white' }}>
              <div style={{ width:52, height:52, borderRadius:10, flexShrink:0,
                background:`${yr.color}18`, display:'flex', alignItems:'center',
                justifyContent:'center', flexDirection:'column' }}>
                <div style={{ fontSize:16, fontWeight:800, color:yr.color }}>{yr.year}</div>
                <div style={{ fontSize:9, fontWeight:700, color:yr.color, letterSpacing:'0.05em' }}>{yr.badge}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'1rem', fontWeight:600, color:'var(--navy)', marginBottom:4 }}>
                  {yr.title}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                    background:`${yr.color}18`, color:yr.color, fontWeight:600 }}>
                    {s.n} ACOs
                  </span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                    background:'var(--green-light)', color:'var(--green)', fontWeight:600 }}>
                    ${earnedM}M earned
                  </span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                    background:'var(--blue-light)', color:'var(--blue)', fontWeight:600 }}>
                    {savPct}% earning savings
                  </span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                    background:'var(--gray-100)', color:'var(--gray-600)', fontWeight:600 }}>
                    {avgSav}% avg savings rate
                  </span>
                  <span style={{ fontSize:11, color:'var(--gray-400)' }}>{yr.duration}</span>
                </div>
              </div>
              <div style={{ fontSize:18, color:'var(--gray-400)', transform: isOpen ? 'rotate(180deg)' : 'none',
                transition:'transform 0.2s' }}>▾</div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding:'0 24px 24px', borderTop:'1px solid var(--gray-100)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:20 }}>
                  {/* Highlights */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)',
                      textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                      Key Highlights
                    </div>
                    {yr.highlights.map((h, i) => (
                      <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:yr.color,
                          flexShrink:0, marginTop:6 }}/>
                        <span style={{ fontSize:12, color:'var(--gray-700)', lineHeight:1.5 }}>{h}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {/* Changes */}
                    {yr.changes.length > 0 && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)',
                          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                          Structural Changes vs Prior Year
                        </div>
                        {yr.changes.map((ch, i) => {
                          const typeColor = ch.type==='New'?COLORS.green:ch.type==='Added'?COLORS.teal:ch.type==='Renamed'?COLORS.amber:COLORS.blue;
                          return (
                            <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
                              <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px',
                                borderRadius:6, background:`${typeColor}18`, color:typeColor,
                                flexShrink:0, marginTop:1 }}>{ch.type}</span>
                              <span style={{ fontSize:12, color:'var(--gray-700)', lineHeight:1.5 }}>{ch.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* CMS Links */}
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-500)',
                        textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                        CMS Resources
                      </div>
                      {yr.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7,
                            fontSize:12, color:'var(--teal-dark)', textDecoration:'none' }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
                          <span style={{ fontSize:14 }}>↗</span>
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* LEAD Transition Timeline */}
      <div className="chart-card" style={{ borderLeft:`4px solid ${COLORS.gold}` }}>
        <div className="chart-title">What Comes Next — LEAD Model Timeline</div>
        <div className="chart-subtitle">
          ACO REACH concluded at the end of PY2023 (December 2026). The LEAD Model
          (Making Care Primary's successor) launches January 1, 2027.
        </div>
        <div style={{ marginTop:16 }}>
          {LEAD_TIMELINE.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:16, marginBottom:14, alignItems:'flex-start' }}>
              <div style={{ width:100, flexShrink:0, fontSize:12, fontWeight:700,
                color: item.highlight ? COLORS.gold : 'var(--gray-500)',
                paddingTop:1 }}>
                {item.date}
              </div>
              <div style={{ flex:1, padding:'8px 12px', borderRadius:'var(--radius)',
                background: item.highlight ? `${COLORS.gold}0f` : 'var(--gray-50)',
                border: item.highlight ? `1px solid ${COLORS.gold}44` : '1px solid var(--gray-200)' }}>
                <div style={{ fontSize:12, color: item.highlight ? 'var(--navy)' : 'var(--gray-700)',
                  fontWeight: item.highlight ? 700 : 400 }}>
                  {item.event}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8 }}>
          {[
            { label:'LEAD Model Page', url:'https://innovation.cms.gov/innovation-models/making-care-primary' },
            { label:'LEAD RFA', url:'https://innovation.cms.gov/media/document/lead-rfa' },
            { label:'LEAD Fact Sheet', url:'https://www.cms.gov/newsroom/fact-sheets' },
          ].map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12,
                color:'var(--teal-dark)', padding:'5px 12px', borderRadius:20,
                border:'1px solid var(--teal)', textDecoration:'none',
                background:'var(--teal-light)' }}
              onMouseEnter={e => e.currentTarget.style.background=COLORS.teal+'22'}
              onMouseLeave={e => e.currentTarget.style.background='var(--teal-light)'}>
              ↗ {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Data sources */}
      <div className="chart-card" style={{ background:'var(--gray-50)' }}>
        <div className="chart-title">Data Sources & Methodology</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>
              Public Use Files (PUFs)
            </div>
            {[
              { label:'PY2021 ACO REACH PUF', url:'https://innovation.cms.gov/data-and-reports/2022/gpdc-puf' },
              { label:'PY2022 ACO REACH PUF', url:'https://innovation.cms.gov/data-and-reports/2023/aco-reach-puf' },
              { label:'PY2023 ACO REACH PUF', url:'https://innovation.cms.gov/data-and-reports/2024/aco-reach-puf' },
            ].map(link => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                style={{ display:'block', fontSize:12, color:'var(--teal-dark)', marginBottom:6,
                  textDecoration:'none' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
                ↗ {link.label}
              </a>
            ))}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>
              Additional CMS Resources
            </div>
            {[
              { label:'ACO REACH Model Overview', url:'https://innovation.cms.gov/innovation-models/aco-reach' },
              { label:'ACO REACH Methodology Documents', url:'https://innovation.cms.gov/innovation-models/aco-reach' },
              { label:'CMS Innovation Center', url:'https://innovation.cms.gov' },
              { label:'LEAD Model (Making Care Primary)', url:'https://innovation.cms.gov/innovation-models/making-care-primary' },
            ].map(link => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                style={{ display:'block', fontSize:12, color:'var(--teal-dark)', marginBottom:6,
                  textDecoration:'none' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
                ↗ {link.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ marginTop:12, fontSize:11, color:'var(--gray-400)', lineHeight:1.6 }}>
          All performance statistics are computed from CMS ACO REACH Public Use Files.
          Savings rates and earned savings figures are based on CMS-reported values.
          This tool is maintained by TRYNYTY health:enablement and is not affiliated with or
          endorsed by CMS or the Innovation Center.
        </div>
      </div>

    </div>
  );
}
