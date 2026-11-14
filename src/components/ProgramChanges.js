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

const PUF_URL = 'https://data.cms.gov/cms-innovation-center-programs/accountable-care-models/aco-reach-financial-and-quality-results';
const MODEL_URL = 'https://www.cms.gov/priorities/innovation/innovation-models/aco-reach';
const DATA_YEARS = perfData.years || [...new Set(records.map(r => r.perf_year))].sort();

const pctOf = (yr, test) => { const rs = records.filter(r => r.perf_year === yr); return rs.length ? rs.filter(test).length : 0; };
const fmtM = v => `$${(v / 1e6).toFixed(1)}M`;

const YEAR_CONTENT = {
  2021: {
    title: 'First Performance Year: Global and Professional Direct Contracting',
    duration: '9 months (April to December)',
    highlights: () => [
      `${yearStats(2021).n} Direct Contracting Entities participated in the first performance year`,
      'Two risk arrangements: Global (100% of savings and losses) and Professional (50%)',
      'Primary Care Capitation (PCC) and Total Care Capitation (TCC, Global only) payment options',
      'Quality was pay-for-reporting: every participant received a 100% quality score',
      `${pctOf(2021, r => r.aco_type === 'High Needs')} High Needs and ${pctOf(2021, r => r.aco_type === 'New Entrant')} New Entrant participants alongside Standard ACOs`,
    ],
    changes: [],
  },
  2022: {
    title: 'First Full Year, Final Year as GPDC',
    duration: '12 months (January to December)',
    highlights: () => [
      `${yearStats(2022).n} participants, up from ${yearStats(2021).n} in PY 2021`,
      'Quality remained mostly pay-for-reporting',
      'CAHPS patient experience measures and Timely Follow-Up were reported; CAHPS did not affect the quality score',
      'In February 2022, CMS announced that GPDC would be redesigned as ACO REACH beginning January 2023',
    ],
    changes: [
      { type: 'Added', text: 'CAHPS summary survey measures reported (pay-for-reporting)' },
      { type: 'Added', text: 'Timely Follow-Up (TFU) quality measure' },
    ],
  },
  2023: {
    title: 'First Year as ACO REACH: Pay-for-Performance Quality',
    duration: '12 months (January to December)',
    highlights: () => {
      const y = records.filter(r => r.perf_year === 2023);
      const up = y.reduce((s, r) => s + (r.heba_up_amt || 0), 0), dn = y.reduce((s, r) => s + (r.heba_down_amt || 0), 0);
      return [
        `${y.length} ACOs participated, covering ${(y.reduce((s, r) => s + (r.bene_cnt || 0), 0) / 1e6).toFixed(1)} million aligned beneficiaries`,
        'Quality moved from pay-for-reporting to pay-for-performance',
        `High Performers Pool began: ${pctOf(2023, r => r.hpp_flag === 'Yes')} ACOs qualified`,
        `Health Equity Benchmark Adjustment began: ${fmtM(up)} in upward and ${fmtM(-dn)} in downward adjustments across all ACOs`,
        `CI/SEP assessed for ACOs that also participated in PY 2022: ${pctOf(2023, r => r.cisep_flag === 'Yes')} of ${pctOf(2023, r => r.cisep_flag != null)} met it`,
        'Health Equity Data Reporting (HEDR) adjustment: up to 10 points added to the quality score for complete beneficiary demographic data',
      ];
    },
    changes: [
      { type: 'Changed', text: 'Quality: pay-for-reporting to pay-for-performance' },
      { type: 'New', text: 'High Performers Pool' },
      { type: 'New', text: 'Health Equity Benchmark Adjustment (HEBA)' },
      { type: 'New', text: 'Health Equity Data Reporting (HEDR) quality adjustment' },
      { type: 'Renamed', text: 'GPDC Model to ACO REACH Model' },
    ],
  },
  2024: {
    title: 'Fourth Performance Year',
    duration: '12 months (January to December)',
    highlights: () => {
      const y = records.filter(r => r.perf_year === 2024);
      const up = y.reduce((s, r) => s + (r.heba_up_amt || 0), 0), dn = y.reduce((s, r) => s + (r.heba_down_amt || 0), 0);
      return [
        `${y.length} ACOs participated, covering ${(y.reduce((s, r) => s + (r.bene_cnt || 0), 0) / 1e6).toFixed(1)} million aligned beneficiaries`,
        `${pctOf(2024, r => r.hpp_flag === 'Yes')} ACOs qualified for the High Performers Pool, up from ${pctOf(2023, r => r.hpp_flag === 'Yes')} in PY 2023`,
        `The benchmark equity adjustment is published as the Population Adjustment: ${fmtM(up)} upward and ${fmtM(-dn)} downward`,
        'The quality data adjustment is published as the Data Reporting (DR) adjustment: 5 points held harmless for demographic reporting, plus up to 5 points for complete social determinants of health data',
        'A CAHPS composite score (share of possible patient experience points earned) is published for the first time',
      ];
    },
    changes: [
      { type: 'Renamed', text: 'HEBA fields published as the Population Adjustment (PA)' },
      { type: 'Renamed', text: 'HEDR adjustment published as the Data Reporting (DR) adjustment, now including social determinants of health data' },
      { type: 'Added', text: 'CAHPS composite score' },
    ],
  },
};

const COLORS_BY_INDEX = [COLORS.teal, COLORS.blue, COLORS.green, COLORS.navy, COLORS.purple, COLORS.amber];

const YEARS = DATA_YEARS.map((year, i) => {
  const c = YEAR_CONTENT[year] || {
    title: `Performance Year ${year}`,
    duration: '12 months (January to December)',
    highlights: () => [`${yearStats(year).n} ACOs participated`],
    changes: [],
  };
  return {
    year, title: c.title, badge: `PY${i + 1}`, color: COLORS_BY_INDEX[i % COLORS_BY_INDEX.length],
    stats: yearStats(year), duration: c.duration, highlights: c.highlights(), changes: c.changes,
    links: [
      { label: `Financial and Quality Results PUF (all years)`, url: PUF_URL },
      { label: 'ACO REACH Model page', url: MODEL_URL },
    ],
  };
});

export default function ProgramChanges() {
  const latestYear = DATA_YEARS[DATA_YEARS.length - 1];
  const [expanded, setExpanded] = useState({ [latestYear]: true });

  const totalACOs = new Set(records.map(r => r.aco_id)).size;
  const peak = YEARS.reduce((m, y) => (y.stats.n > (m?.stats.n || 0) ? y : m), null);
  const totalSavings = records.reduce((s, r) => s + (r.shared_savings || 0), 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Hero summary */}
      <div className="chart-card">
        <div className="chart-title">ACO REACH Model: Program History</div>
        <div className="chart-subtitle">
          The model began in April 2021 as Global and Professional Direct Contracting (GPDC), became ACO REACH
          in January 2023, and runs through December 31, 2026. This page summarizes the structural changes and
          published results for each performance year with public data.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginTop:16 }}>
          {[
            { label:'Performance Years With Data', value:`${DATA_YEARS.length} (PY ${DATA_YEARS[0]} to ${latestYear})` },
            { label:'Unique ACOs', value:`${totalACOs}` },
            { label:'Total Earned Savings', value:`$${(totalSavings/1e9).toFixed(2)}B` },
            { label:'Peak ACO Count', value:`${peak?.stats.n} (PY ${peak?.year})` },
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

      {/* Data sources */}
      <div className="chart-card" style={{ background:'var(--gray-50)' }}>
        <div className="chart-title">Data Sources & Methodology</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>
              Public Use Files (PUFs)
            </div>
            {[
              { label:'ACO REACH Financial and Quality Results (data.cms.gov)', url:PUF_URL },
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
              { label:'ACO REACH Model page', url:MODEL_URL },
              { label:'CMS Innovation Center', url:'https://www.cms.gov/priorities/innovation' },
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
