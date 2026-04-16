import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import { fmt, COLORS, TYPE_COLORS } from '../utils';
import trendsData from '../data/reach_program_trends.json';

const LEAD_FEATURES = [
  {
    title: '10-Year Term — No Rebasing',
    icon: '📅',
    reach: 'REACH ran 4 years (2023–2026)',
    lead: 'LEAD runs 2027–2036 with no benchmark reset',
    color: COLORS.teal,
    why: 'REACH ACOs that performed well saw their benchmark adjusted. LEAD locks in a stable reference for a decade — the longer you save, the more compound value you build.',
  },
  {
    title: 'Concurrent Risk Adjustment',
    icon: '⚖️',
    reach: 'First tested in REACH for High Needs ACOs',
    lead: 'Extended to all beneficiaries meeting High Needs criteria',
    color: COLORS.blue,
    why: 'Concurrent adjustment incorporates current-year diagnoses, not just prior-year data. Better reflects real patient complexity — especially for rapidly changing populations.',
  },
  {
    title: 'Beneficiary Engagement Incentives',
    icon: '🤝',
    reach: 'APO (Advanced Payment Option) and Alignment Plus elections',
    lead: 'Part B cost-sharing support + Part D premium buy-down (2029) + nutrition therapy + prevention rewards',
    color: COLORS.green,
    why: 'LEAD gives ACOs more tools to drive patient engagement — directly addressing one of the five core operational barriers to VBC success.',
  },
  {
    title: 'CARA Episode Arrangements',
    icon: '🔗',
    reach: 'No formal specialist risk-sharing framework',
    lead: 'CMS-administered episode risk arrangements with specialists; falls prevention program',
    color: COLORS.amber,
    why: 'Available to Global risk ACOs only. Enables preferred provider relationships and downstream cost accountability — extending the ACO model beyond primary care.',
  },
  {
    title: 'AI Risk Adjustment (2028+)',
    icon: '🤖',
    reach: 'HCC-based risk adjustment',
    lead: 'AI-inferred model testing 2028; full rollout to aged/disabled 2031',
    color: COLORS.purple,
    why: 'Worth monitoring closely. AI scoring may improve accuracy but depends on data standardization that the industry is still building. LEAD participants will be best positioned to inform how this evolves.',
  },
  {
    title: 'Medicare-Medicaid Integration',
    icon: '🌐',
    reach: 'Limited dual-eligible coordination',
    lead: 'Two pilot states developing ACO-Medicaid partnership frameworks',
    color: COLORS.coral,
    why: 'REACH High Needs ACOs served 61% dual-eligible beneficiaries — populations with the most fragmented care. LEAD\'s integration effort directly targets this gap.',
  },
];

export default function LEADTransition({ perfData, pinnedACO, navigateToACO, pinACO }) {
  const records = perfData?.records || [];
  const py2023 = useMemo(() => records.filter(r => r.perf_year === 2023), [records]);

  // Savings rate distribution — who are the strongest LEAD candidates?
  const candidateData = useMemo(() => {
    const tiers = [
      { label: 'Strong (>10%)', count: 0, color: COLORS.green },
      { label: 'Good (5–10%)', count: 0, color: COLORS.teal },
      { label: 'Moderate (0–5%)', count: 0, color: COLORS.blue },
      { label: 'Loss', count: 0, color: COLORS.red },
    ];
    py2023.forEach(r => {
      if (r.sav_rate == null) return;
      if (r.sav_rate > 10)      tiers[0].count++;
      else if (r.sav_rate > 5)  tiers[1].count++;
      else if (r.sav_rate >= 0) tiers[2].count++;
      else                      tiers[3].count++;
    });
    return tiers;
  }, [py2023]);

  // Risk arrangement breakdown — who goes where in LEAD?
  const riskData = useMemo(() => {
    const global = py2023.filter(r => r.risk_arrangement === 'Global');
    const prof   = py2023.filter(r => r.risk_arrangement === 'Professional');
    const globalSavRate = global.reduce((a,r) => a+(r.sav_rate||0), 0) / (global.length||1);
    const profSavRate   = prof.reduce((a,r) => a+(r.sav_rate||0), 0) / (prof.length||1);
    return [
      { name: 'Global Risk', count: global.length, avgSav: globalSavRate.toFixed(2), color: COLORS.green,
        leadPath: 'Global track in LEAD — eligible for CARA' },
      { name: 'Professional Risk', count: prof.length, avgSav: profSavRate.toFixed(2), color: COLORS.blue,
        leadPath: 'Professional track in LEAD' },
    ];
  }, [py2023]);

  // High Needs performance — key for LEAD's concurrent risk adjustment story
  const highNeedsData = useMemo(() => {
    return ['Standard','New Entrant','High Needs'].map(type => {
      const typeRecs = py2023.filter(r => r.aco_type === type);
      const avgSav = typeRecs.reduce((a,r) => a+(r.sav_rate||0), 0) / (typeRecs.length||1);
      const avgDual = typeRecs.reduce((a,r) => a+(r.perc_dual||0), 0) / (typeRecs.length||1);
      return {
        type,
        count: typeRecs.length,
        avgSav: parseFloat(avgSav.toFixed(2)),
        avgDual: parseFloat(avgDual.toFixed(1)),
        color: TYPE_COLORS[type],
      };
    });
  }, [py2023]);

  // REACH → LEAD trajectory narrative stats
  const totalBenes23 = py2023.reduce((a,r) => a+(r.bene_cnt||0), 0);
  const savers23 = py2023.filter(r => r.sav_rate > 0).length;
  const avgSav23 = py2023.reduce((a,r) => a+(r.sav_rate||0), 0) / py2023.length;
  const totalSavings23 = py2023.reduce((a,r) => a+(r.shared_savings||0), 0);
  const highPerf23 = py2023.filter(r => r.hpp_flag === 'Yes').length;

  return (
    <div>
      {/* ── Pinned ACO personalized section ── */}
      {pinnedACO ? (
        <div style={{ background:'var(--navy)', borderRadius:'var(--radius-lg)',
          padding:'20px 24px', marginBottom:20, borderLeft:'4px solid var(--gold)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--gold)', textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:6 }}>📌 Personalized LEAD Analysis — {pinnedACO.aco_name}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.6, marginBottom:16 }}>
            Based on <strong style={{color:'white'}}>{pinnedACO.aco_name}</strong>'s PY{pinnedACO.latest_year} performance
            in the <strong style={{color:COLORS.teal}}>{pinnedACO.config_key}</strong> configuration.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:16 }}>
            {[
              { label:'PY'+pinnedACO.latest_year+' Savings Rate',
                value: pinnedACO.latest_sav_rate!=null?`${pinnedACO.latest_sav_rate.toFixed(2)}%`:'—',
                color: (pinnedACO.latest_sav_rate||0)>0?COLORS.teal:COLORS.red },
              { label:'Quality Score',
                value: pinnedACO.latest_qual!=null?`${pinnedACO.latest_qual.toFixed(1)}%`:'—',
                color: (pinnedACO.latest_qual||0)>=75?COLORS.green:COLORS.amber },
              { label:'CI/SEP Status',
                value: pinnedACO.cisep_flag||'N/A',
                color: pinnedACO.cisep_flag==='Yes'?COLORS.green:COLORS.gray },
              { label:'HPP Qualifier',
                value: pinnedACO.hpp_flag||'N/A',
                color: pinnedACO.hpp_flag==='Yes'?COLORS.gold:COLORS.gray },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginBottom:3,
                  textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {/* Configuration recommendation */}
          <div style={{ padding:'12px 16px', background:'rgba(255,255,255,0.06)',
            borderRadius:'var(--radius)', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:COLORS.gold, marginBottom:6,
              textTransform:'uppercase', letterSpacing:'0.06em' }}>LEAD Track Recommendation</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', lineHeight:1.6 }}>
              {pinnedACO.risk_arrangement==='Global'
                ? `As a ${pinnedACO.config_key} REACH ACO, you are directly aligned with the LEAD Global track. 
                  ${pinnedACO.capitation==='TCC'
                    ? 'Your Total Care Capitation experience puts you in the best position for LEAD — you already operate at full Medicare payment risk.'
                    : 'Consider whether to maintain Primary Care Capitation or upgrade to Total Care Capitation in LEAD, which unlocks CARA episode arrangements.'}`
                : `As a Professional risk REACH ACO, you have two LEAD paths: remain Professional (50% risk) or upgrade to Global 
                   (80-100% risk, higher upside). Your PY${pinnedACO.latest_year} savings rate of ${pinnedACO.latest_sav_rate?.toFixed(2)||'—'}% 
                   ${(pinnedACO.latest_sav_rate||0)>5?'suggests strong readiness for Global track':'suggests building more operational infrastructure before Global risk'}.`}
            </div>
          </div>
          {/* Years experience insight */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div style={{ padding:'8px 14px', background:'rgba(255,255,255,0.06)',
              borderRadius:'var(--radius)', fontSize:12, color:'rgba(255,255,255,0.7)' }}>
              <strong style={{color:'white'}}>{pinnedACO.years_count} year{pinnedACO.years_count>1?'s':''}</strong> in REACH
              {pinnedACO.years_count===3?' — maximum REACH experience, strong LEAD candidate':''}
            </div>
            {pinnedACO.cisep_flag==='Yes' && (
              <div style={{ padding:'8px 14px', background:`${COLORS.green}22`,
                borderRadius:'var(--radius)', fontSize:12, color:COLORS.teal }}>
                ✓ CI/SEP met — HPP eligible in LEAD
              </div>
            )}
            {pinnedACO.hpp_flag==='Yes' && (
              <div style={{ padding:'8px 14px', background:`${COLORS.gold}22`,
                borderRadius:'var(--radius)', fontSize:12, color:COLORS.gold }}>
                🏆 HPP qualifier — top performance tier in LEAD
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={() => navigateToACO && navigateToACO({
              aco_id:pinnedACO.aco_id, aco_name:pinnedACO.aco_name, aco_type:pinnedACO.aco_type
            })} style={{ padding:'6px 14px', borderRadius:'var(--radius)', fontSize:11,
              background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)',
              cursor:'pointer', fontWeight:600 }}>
              ← Back to Deep Dive
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding:'12px 16px', background:'var(--gray-50)', borderRadius:'var(--radius)',
          border:'1px solid var(--gray-200)', marginBottom:20, fontSize:12, color:'var(--gray-600)' }}>
          💡 <strong>Tip:</strong> Pin an ACO from the Deep Dive tab to see a personalized LEAD analysis
          based on that organization's actual REACH performance.
        </div>
      )}

      {/* ── Hero context ── */}
      <div className="lead-banner" style={{ marginBottom: 20 }}>
        <h2>From ACO REACH to LEAD — What the Data Tells Us</h2>
        <p>
          ACO REACH concludes at the end of 2026. The{' '}
          <a href="https://trynytyhealth.com/post-lead-model" target="_blank" rel="noreferrer">
            LEAD Model
          </a>{' '}
          launches January 1, 2027 with a 10-year performance window — the longest CMS has ever tested.
          For organizations currently in REACH, this page analyzes your program's performance trajectory
          and what it means for your LEAD transition decision.
          <strong style={{ color: 'var(--gold)', display: 'block', marginTop: 8 }}>
            ⏱ LEAD applications close May 17, 2026.
          </strong>
        </p>
      </div>

      {/* ── Program stats that feed the LEAD narrative ── */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">PY2023 Savers</div>
          <div className="kpi-value kpi-pos">{savers23}/{py2023.length}</div>
          <div className="kpi-sub">{(savers23/py2023.length*100).toFixed(0)}% generated savings</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg PY2023 Sav Rate</div>
          <div className="kpi-value kpi-pos">{fmt.pct(avgSav23)}</div>
          <div className="kpi-sub">Across all 132 REACH ACOs</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total PY2023 Savings</div>
          <div className="kpi-value">{fmt.dollars(totalSavings23)}</div>
          <div className="kpi-sub">Earned by 96 ACOs</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">High Performers Pool</div>
          <div className="kpi-value">{highPerf23}</div>
          <div className="kpi-sub">ACOs earning HPP bonus in PY2023</div>
        </div>
      </div>

      {/* ── LEAD readiness by savings tier ── */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-title">LEAD Readiness by Savings Performance</div>
          <div className="chart-subtitle">PY 2023 savings rate distribution — strong performers are prime LEAD candidates</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={candidateData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} ACOs`, 'Count']} />
              <Bar dataKey="count" radius={[3,3,0,0]}>
                {candidateData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gray-500)', padding: '8px 12px',
            background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
            <strong style={{ color: 'var(--navy)' }}>
              {candidateData[0].count + candidateData[1].count} ACOs ({((candidateData[0].count + candidateData[1].count)/py2023.length*100).toFixed(0)}%)
            </strong> generated &gt;5% savings in PY2023 — strong LEAD candidates who stand to gain most from the no-rebase structure.
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Risk Track Performance</div>
          <div className="chart-subtitle">Average savings rate by risk arrangement — maps directly to LEAD track selection</div>
          <div style={{ marginTop: 20 }}>
            {riskData.map(r => (
              <div key={r.name} style={{ marginBottom: 20, padding: '16px 18px',
                borderRadius: 'var(--radius)', border: `1.5px solid ${r.color}22`,
                background: `${r.color}08` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--navy)' }}>{r.name}</strong>
                  <span style={{ fontSize: 11, color: r.color, fontWeight: 700 }}>
                    {r.count} ACOs
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: r.color, marginBottom: 4 }}>
                  {r.avgSav}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 6 }}>
                  Average savings rate in PY 2023
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-700)', padding: '6px 10px',
                  background: 'rgba(255,255,255,0.7)', borderRadius: 4 }}>
                  → LEAD path: {r.leadPath}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ACO type performance — High Needs story ── */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-title">Performance by ACO Type — The High Needs Story</div>
        <div className="chart-subtitle">
          LEAD introduces expanded concurrent risk adjustment and lower alignment minimums specifically for High Needs ACOs.
          PY 2023 data shows why this matters.
        </div>
        <div className="grid-3" style={{ marginTop: 14 }}>
          {highNeedsData.map(d => (
            <div key={d.type} style={{ padding: '16px 18px', borderRadius: 'var(--radius)',
              border: `1.5px solid ${d.color}33`, background: `${d.color}06` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: d.color,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                {d.type} ACOs
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', marginBottom: 2 }}>Count</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>{d.count}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', marginBottom: 2 }}>Avg Sav Rate</div>
                  <div style={{ fontSize: 22, fontWeight: 700,
                    color: d.avgSav >= 0 ? COLORS.green : COLORS.red }}>
                    {fmt.pct(d.avgSav)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', marginBottom: 2 }}>Avg % Dual</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>
                    {fmt.pct(d.avgDual)}
                  </div>
                </div>
              </div>
              {d.type === 'High Needs' && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gray-600)',
                  padding: '6px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 4 }}>
                  Serving 61% dual-eligible beneficiaries. LEAD's concurrent risk adjustment and lower alignment minimums are designed specifically for organizations like these.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature comparison ── */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-title" style={{ marginBottom: 4 }}>REACH → LEAD: What Changes</div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 16 }}>
          Key structural differences between ACO REACH and the LEAD Model
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {LEAD_FEATURES.map(f => (
            <div key={f.title} style={{ padding: '14px 16px', borderRadius: 'var(--radius)',
              border: `1px solid ${f.color}22`, borderLeft: `3px solid ${f.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <strong style={{ fontSize: 13, color: 'var(--navy)' }}>{f.title}</strong>
              </div>
              <div style={{ fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--gray-500)' }}>REACH: </span>
                <span style={{ color: 'var(--gray-700)' }}>{f.reach}</span>
              </div>
              <div style={{ fontSize: 11, marginBottom: 8 }}>
                <span style={{ color: f.color, fontWeight: 600 }}>LEAD: </span>
                <span style={{ color: 'var(--gray-700)' }}>{f.lead}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-600)', padding: '6px 10px',
                background: 'var(--gray-50)', borderRadius: 4, lineHeight: 1.5 }}>
                {f.why}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a3a52 0%, #2a5276 100%)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px', textAlign: 'center',
        border: '1px solid rgba(66,186,151,0.25)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>
          Evaluating the LEAD transition for your organization?
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20, lineHeight: 1.7 }}>
          TRYNYTY health:enablement helps ACOs model their financial scenarios under Professional vs. Global risk,
          benchmark their REACH performance against peers, and prepare competitive LEAD applications.
          Applications close <strong style={{ color: 'var(--gold)' }}>May 17, 2026</strong>.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://trynytyhealth.com/contact" target="_blank" rel="noreferrer"
            style={{ padding: '10px 24px', borderRadius: 'var(--radius)', background: 'var(--teal)',
              color: 'var(--navy)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Talk to Our Team →
          </a>
          <a href="https://trynytyhealth.com/post-lead-model" target="_blank" rel="noreferrer"
            style={{ padding: '10px 24px', borderRadius: 'var(--radius)',
              border: '1.5px solid rgba(255,255,255,0.3)', color: 'white',
              fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Read LEAD Overview →
          </a>
          <a href="https://mssppuf.trynytyhealth.com" target="_blank" rel="noreferrer"
            style={{ padding: '10px 24px', borderRadius: 'var(--radius)',
              border: '1.5px solid rgba(255,255,255,0.3)', color: 'white',
              fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            ← MSSP ACO Explorer
          </a>
        </div>
      </div>
    </div>
  );
}
