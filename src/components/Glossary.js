import React, { useState, useMemo } from 'react';

const TERMS = [
  // ── Financial & Savings ─────────────────────────────────────────────────────
  { section:'Financial & Savings', term:'Savings Rate', abbr:'SAV_RATE',
    def:'Gross savings divided by the final benchmark. Calculated as (Benchmark − Total Cost of Care) ÷ Benchmark × 100. A positive rate means the ACO spent less than its target; negative means overspending. In PY2023, ACO REACH averaged a 3.41% program-level savings rate.' },
  { section:'Financial & Savings', term:'Gross Savings', abbr:null,
    def:'Final benchmark minus total cost of care after stop-loss. The full savings amount before any discount, quality adjustment, or sharing rate is applied.' },
  { section:'Financial & Savings', term:'Earned Savings (Shared Savings)', abbr:null,
    def:'The portion of gross savings that CMS pays to the ACO. Determined by the sharing rate and discount. In PY2023, ACO REACH ACOs earned $923.3M in shared savings payments.' },
  { section:'Financial & Savings', term:'Final Benchmark', abbr:null,
    def:'The spending target an ACO must beat to generate savings. Derived from historical and regional baselines, adjusted for risk scores, trends, and equity adjustments. Compared against total cost of care to determine gross savings.' },
  { section:'Financial & Savings', term:'Per Beneficiary Per Month', abbr:'PBPM',
    def:'A normalized cost or payment metric: total dollars ÷ (beneficiaries × months). Enables fair comparison across ACOs of different sizes and across years with different enrollment counts. PY2021 uses 9 months; PY2022 and PY2023 use 12 months.' },
  { section:'Financial & Savings', term:'Discount', abbr:null,
    def:'A percentage withheld from earned savings based on the risk arrangement. Global risk ACOs face a lower discount than Professional risk ACOs, reflecting their greater financial accountability.' },
  { section:'Financial & Savings', term:'Retention Withhold', abbr:null,
    def:'An amount withheld by CMS from shared savings payments, returned to the ACO in subsequent years contingent on continued participation and performance.' },
  { section:'Financial & Savings', term:'Stop Loss', abbr:null,
    def:'An optional arrangement for Global risk ACOs that caps financial losses. ACOs electing stop loss give up a portion of savings upside in exchange for protection against large unexpected expenditures.' },

  // ── Benchmark & Risk ────────────────────────────────────────────────────────
  { section:'Benchmarking & Risk Adjustment', term:'Normalized Risk Score', abbr:'NORM_RISK_SCORE',
    def:'A weighted average risk score across the ACO\'s attributed beneficiary population, normalized relative to the broader Medicare population. A score of 1.0 indicates average Medicare risk; scores above 1.0 reflect higher-acuity populations.' },
  { section:'Benchmarking & Risk Adjustment', term:'CIF-Capped Risk Score', abbr:'CIF_CAP_RISK',
    def:'The normalized risk score after applying the Coding Intensity Factor (CIF) cap. The CIF limits the extent to which coding improvement alone can inflate risk scores, ensuring benchmark adjustments reflect true patient complexity rather than documentation patterns.' },
  { section:'Benchmarking & Risk Adjustment', term:'Concurrent Risk Adjustment', abbr:null,
    def:'A methodology introduced in PY2023 that incorporates current-year diagnoses into risk score calculations rather than relying solely on historical claims data. Provides more accurate reflection of actual patient complexity. Available for High Needs ACOs in REACH; extended to all in LEAD.' },
  { section:'Benchmarking & Risk Adjustment', term:'Historical Benchmark', abbr:'HIST_BNCHMK',
    def:'The baseline spending amount derived from three historical benchmark years (BY1, BY2, BY3) prior to the performance year. Weighted more heavily toward recent years.' },
  { section:'Benchmarking & Risk Adjustment', term:'Benchmark Years', abbr:'BY1 / BY2 / BY3',
    def:'The three historical years used to compute an ACO\'s spending baseline. BY3 is most recent; BY1 is oldest. Performance year spending is compared against the adjusted benchmark to determine savings or losses.' },
  { section:'Benchmarking & Risk Adjustment', term:'Health Equity Benchmark Adjustment', abbr:'HEBA',
    def:'An adjustment to the benchmark that accounts for historically suppressed spending in communities serving dually eligible and underserved beneficiaries. Introduced in PY2022. In PY2023, all 132 ACOs received both upward ($70.4M total) and downward ($69.7M total) adjustments — net-neutral by design but directionally corrective.' },
  { section:'Benchmarking & Risk Adjustment', term:'Health Equity Data Reporting Adjustment', abbr:'HEDR / HDR_ADJUST',
    def:'A quality score bonus of up to 10 percentage points awarded for completeness of beneficiary-reported demographic data submitted to CMS. Introduced in PY2023. Total Quality Score capped at 100%.' },

  // ── Payment & Capitation ────────────────────────────────────────────────────
  { section:'Payment & Capitation', term:'Primary Care Capitation', abbr:'CAP / CAP_PMT_AMT',
    def:'A monthly capitation payment for primary care services provided to attributed beneficiaries. Set prospectively based on historical PCP spend. All ACOs with a PCC capitation arrangement receive CAP payments. Distinct from the ePCC bonus.' },
  { section:'Payment & Capitation', term:'Enhanced Primary Care Capitation', abbr:'ePCC / EPCC_PMT_AMT',
    def:'An additional capitation payment for ACOs that elected the Enhanced PCC arrangement. Acts as a bonus to encourage greater PCP utilization and care coordination. Only flows to ACOs that elected ENHANCED_PCC_ELECTION = Yes. In PY2023, Enhanced PCC electors averaged ~$52 PBPM in ePCC vs ~$1 for non-electors.' },
  { section:'Payment & Capitation', term:'Traditional Claims Payment', abbr:'CLM / CLM_PMT_AMT',
    def:'Fee-for-service claims paid outside of capitation arrangements. The dominant payment channel for most REACH ACOs, comprising approximately 90–95% of total cost of care. APO modifies how some non-PCP services within this channel are structured.' },
  { section:'Payment & Capitation', term:'Advanced Payment Option', abbr:'APO',
    def:'An ACO election (APO_ELECTION) that modifies the capitation payment structure for non-PCP services provided by PCPs. An advance payment mechanism — not a voluntary beneficiary alignment method. In PY2023, APO-electing ACOs averaged 4.91% savings vs 4.42% for non-APO ACOs.' },
  { section:'Payment & Capitation', term:'Total Care Capitation', abbr:'TCC',
    def:'A capitation arrangement where the ACO receives a capitated payment covering the full range of Medicare Part A and Part B services (not just primary care). Only Global risk ACOs can elect TCC. Associated with higher savings rates — PY2023 TCC ACOs without stop loss averaged 6.4% savings.' },
  { section:'Payment & Capitation', term:'Capitation Arrangement', abbr:null,
    def:'The payment structure elected by the ACO: either Primary Care Capitation (PCC) or Total Care Capitation (TCC). PCC covers only primary care services; TCC covers all Part A/B services. Only Global risk ACOs may elect TCC.' },
  { section:'Payment & Capitation', term:'Alignment Plus', abbr:null,
    def:'An ACO-level election to participate in the Alignment Plus arrangement. 122 of 132 PY2023 ACOs (92%) elected Alignment Plus. The specific operational implications of this election are defined by CMS program rules.' },

  // ── Quality ──────────────────────────────────────────────────────────────────
  { section:'Quality Measures', term:'Total Quality Score', abbr:'QUAL_SCR',
    def:'The proportion of the quality withhold that an ACO earns back, expressed as a percentage (0–100). In PY2021, all ACOs received 100% under pay-for-reporting. In PY2022, measures were pay-for-reporting but displayed. In PY2023, the shift to pay-for-performance drove average scores to ~79%.' },
  { section:'Quality Measures', term:'All-Condition Readmissions', abbr:'ACR / ACR_SCR',
    def:'Risk-standardized all-condition readmissions rate. A lower score indicates better performance — fewer patients are being readmitted after discharge. One of the core REACH quality measures affecting the quality withhold.' },
  { section:'Quality Measures', term:'Unplanned Admissions for Multiple Chronic Conditions', abbr:'UAMCC / UAMCC_SCR',
    def:'Risk-standardized, all-cause unplanned admissions per 100 person-years for patients with multiple chronic conditions. Lower is better. Targets high-need patients who are particularly vulnerable to avoidable hospitalizations.' },
  { section:'Quality Measures', term:'Timely Follow-Up After Acute Exacerbation', abbr:'TFU / TFU_SCR',
    def:'The percentage of patients receiving a timely follow-up visit after an acute exacerbation of a chronic condition. Higher is better. Applies to Standard and New Entrant ACOs. Was pay-for-reporting in PY2022.' },
  { section:'Quality Measures', term:'Days at Home', abbr:'DAH / DAH_SCR',
    def:'Days at Home for patients with complex, chronic conditions. Higher is better. Applies only to High Needs Population ACOs. Was pay-for-reporting in PY2022.' },
  { section:'Quality Measures', term:'Continuous Improvement / Sustained Exceptional Performance', abbr:'CI/SEP',
    def:'A quality achievement flag (PY2023 only). ACOs meeting CI/SEP criteria demonstrated either meaningful improvement or sustained excellence in quality performance. CI/SEP ACOs averaged 5.80% savings vs 1.07% for non-CI/SEP — a 5.4× difference. Required for HPP eligibility.' },
  { section:'Quality Measures', term:'High Performers Pool', abbr:'HPP',
    def:'A bonus payment pool launched in PY2023 for ACOs meeting CI/SEP criteria and achieving performance above the HPP threshold. Only 24 of 132 PY2023 ACOs (18%) qualified. HPP ACOs averaged 8.27% savings and earned $408M — 44% of all PY2023 earned savings.' },
  { section:'Quality Measures', term:'CAHPS Summary Survey Measures', abbr:'SSM',
    def:'Patient experience survey measures drawn from the Consumer Assessment of Healthcare Providers and Systems (CAHPS) survey. Includes: Getting Timely Appointments, Care, and Information (TACI); How Well Providers Communicate (COM); Care Coordination (CC); Shared Decision Making (SDM); Patient\'s Rating of Provider (PR); Courteous and Helpful Office Staff (CHOS); Health Promotion and Education (HPE); Stewardship of Patient Resources (SPR). CAHPS was pay-for-reporting in PY2022; pay-for-performance in PY2023.' },

  // ── ACO Structure ────────────────────────────────────────────────────────────
  { section:'ACO Structure & Participation', term:'Risk Arrangement', abbr:null,
    def:'The financial risk election made by the ACO: either Global (full risk — 80–100% of savings/losses) or Professional (partial risk — 50% of savings/losses). Global risk ACOs are eligible for higher sharing rates and TCC capitation but face greater downside exposure.' },
  { section:'ACO Structure & Participation', term:'ACO Type', abbr:null,
    def:'Classification of the ACO\'s experience level: Standard (established organizations with prior ACO/risk experience), New Entrant (organizations new to Medicare risk arrangements), or High Needs Population (DCEs serving predominantly high-need patients, typically including D-SNP and PACE organizations).' },
  { section:'ACO Structure & Participation', term:'Configuration', abbr:null,
    def:'The combination of risk arrangement and capitation type: Global/TCC, Global/PCC, or Professional/PCC. In PY2023, Global/TCC without stop loss was the highest-performing configuration (6.4% avg savings, 93% earning savings). Global/PCC had 78 ACOs with 5.2% avg savings.' },
  { section:'ACO Structure & Participation', term:'Aligned Beneficiaries', abbr:'BENE_CNT',
    def:'Total Medicare beneficiaries attributed to the ACO for the performance year. Attribution follows claims-based patterns — beneficiaries are aligned based on their primary care utilization. The REACH PUF does not break out voluntary vs claims-based alignment counts.' },

  // ── LEAD Model ───────────────────────────────────────────────────────────────
  { section:'LEAD Model (2027–2036)', term:'LEAD Model', abbr:'LEAD',
    def:'The Longitudinal Excellence, Accountability, and Data-Driven (LEAD) Model — the successor to ACO REACH, launching January 1, 2027 and running through 2036. Retains the core ACO REACH structure (Global/Professional risk, capitation, HEBA) while adding a 10-year no-rebase term, expanded beneficiary engagement tools, and CARA episode arrangements.' },
  { section:'LEAD Model (2027–2036)', term:'CARA Episode Arrangements', abbr:'CARA',
    def:'Condition-specific episode payment arrangements available to Global risk LEAD ACOs. Administered by CMS, these enable ACOs to share savings or losses with specialists for defined clinical episodes (e.g., joint replacement, cardiac events). Enable preferred provider relationships and extend accountability beyond primary care.' },
  { section:'LEAD Model (2027–2036)', term:'10-Year No-Rebase Term', abbr:null,
    def:'A structural feature of LEAD that locks in the benchmark for the full 10-year model term without annual rebasing. In REACH, benchmarks were recalculated each year, making it progressively harder for efficient ACOs to show savings. LEAD\'s stable benchmark rewards compounding performance over time.' },
  { section:'LEAD Model (2027–2036)', term:'LEAD Application Deadline', abbr:null,
    def:'Applications to participate in the LEAD Model are due May 17, 2026. The LEAD Model launches January 1, 2027. Organizations that participated in ACO REACH are well-positioned to apply given their familiarity with capitation, concurrent risk adjustment, and HEBA.' },
];

const SECTIONS = [...new Set(TERMS.map(t => t.section))];

export default function Glossary() {
  const [query, setQuery]       = useState('');
  const [activeSection, setSection] = useState('All');

  const sections = ['All', ...SECTIONS];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return TERMS.filter(t => {
      const matchSection = activeSection === 'All' || t.section === activeSection;
      const matchQuery   = !q ||
        t.term.toLowerCase().includes(q) ||
        (t.abbr && t.abbr.toLowerCase().includes(q)) ||
        t.def.toLowerCase().includes(q);
      return matchSection && matchQuery;
    });
  }, [query, activeSection]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => {
      if (!g[t.section]) g[t.section] = [];
      g[t.section].push(t);
    });
    return g;
  }, [filtered]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div className="chart-card">
        <div className="chart-title">Glossary & Key Terms</div>
        <div className="chart-subtitle">
          Definitions for key metrics, program terms, and acronyms used throughout the
          ACO REACH → LEAD Explorer. Terms are drawn from CMS program documentation and
          the ACO REACH Public Use File data dictionaries.
        </div>

        {/* Search */}
        <div style={{ marginTop:14 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search terms, acronyms, or definitions…"
            style={{ width:'100%', maxWidth:520, padding:'9px 14px', fontSize:13,
              border:'1.5px solid var(--gray-300)', borderRadius:'var(--radius)',
              outline:'none', fontFamily:'var(--font)' }}
          />
        </div>

        {/* Section filter pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:12 }}>
          {sections.map(s => (
            <button key={s} onClick={() => setSection(s)}
              style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:600,
                cursor:'pointer', border:'1.5px solid',
                borderColor: activeSection===s ? 'var(--teal)' : 'var(--gray-300)',
                background: activeSection===s ? 'var(--teal-light)' : 'white',
                color: activeSection===s ? 'var(--teal-dark)' : 'var(--gray-600)',
                fontFamily:'var(--font)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Term groups */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign:'center', padding:'40px', color:'var(--gray-400)', fontSize:13 }}>
          No terms match "{query}"
        </div>
      )}

      {Object.entries(grouped).map(([section, terms]) => (
        <div key={section} className="chart-card">
          <div style={{ fontSize:11, fontWeight:700, color:'var(--teal-dark)',
            textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>
            {section}
          </div>
          {terms.map((t, i) => (
            <div key={t.term} style={{
              display:'grid', gridTemplateColumns:'220px 1fr',
              gap:16, padding:'12px 0',
              borderBottom: i < terms.length-1 ? '1px solid var(--gray-100)' : 'none',
              alignItems:'start',
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)',
                  lineHeight:1.3 }}>{t.term}</div>
                {t.abbr && (
                  <div style={{ fontSize:11, color:'var(--teal-dark)', marginTop:3,
                    fontWeight:600 }}>{t.abbr}</div>
                )}
              </div>
              <div style={{ fontSize:13, color:'var(--gray-700)', lineHeight:1.6 }}>
                {t.def}
              </div>
            </div>
          ))}
        </div>
      ))}

    </div>
  );
}
