import React, { useState, useMemo } from 'react';

const TERMS = [
  // Financial & Savings
  { section:'Financial & Savings', term:'Savings Rate', abbr:'SAV_RATE',
    def:'Gross savings divided by the final benchmark: (Benchmark minus Total Cost of Care) ÷ Benchmark × 100. A positive rate means the ACO spent less than its benchmark; a negative rate means it spent more. The Program Overview also shows a program-level rate that weights each ACO by its benchmark.' },
  { section:'Financial & Savings', term:'Gross Savings', abbr:'GROSS_SAVINGS',
    def:'Final benchmark minus total cost of care. The savings amount before the sharing rate, discount and quality adjustments are applied.' },
  { section:'Financial & Savings', term:'Earned Savings (Shared Savings)', abbr:'SHARED_SAVINGS',
    def:'The portion of gross savings (or losses) attributed to the ACO after the risk arrangement, discount and quality adjustments. Negative values are shared losses.' },
  { section:'Financial & Savings', term:'Final Benchmark', abbr:'FINAL_BENCHMARK',
    def:'The spending target used to calculate savings. Built from historical and regional baselines and adjusted for risk, trend, the discount and the retention withhold. In the published file, the final benchmark is shown before HEBA.' },
  { section:'Financial & Savings', term:'Per Beneficiary Per Month', abbr:'PBPM',
    def:'Total dollars ÷ (beneficiaries × months). Makes ACOs of different sizes comparable. PY 2021 uses 9 months; later years use 12.' },
  { section:'Financial & Savings', term:'Discount', abbr:'DISCOUNT',
    def:'A percentage reduction applied to the benchmark for Global risk ACOs: 2% in PY 2021 and PY 2022 and 3% in PY 2023 in the published files. Professional risk ACOs have no discount.' },
  { section:'Financial & Savings', term:'Retention Withhold', abbr:'RETENTION_WITHHOLD',
    def:'A percentage withheld under the model\'s financial methodology. Most ACOs show 0% in the published files; a few show 2%.' },
  { section:'Financial & Savings', term:'Stop Loss', abbr:'STOP_LOSS_ELECTION',
    def:'An optional arrangement, available to Global and Professional ACOs, that limits the ACO\'s exposure to spending on very high-cost beneficiaries.' },

  // Benchmarking & Risk Adjustment
  { section:'Benchmarking & Risk Adjustment', term:'Normalized Risk Score', abbr:'NORM_RISK_SCORE',
    def:'Normalized weighted average risk score for the ACO\'s aligned beneficiaries. Published from PY 2023.' },
  { section:'Benchmarking & Risk Adjustment', term:'Risk Score After CIF and Cap', abbr:'CIF_CAP_RISK',
    def:'The normalized risk score adjusted for the coding intensity factor (CIF) and the risk score cap, which limit how much risk score growth can raise the benchmark. Published from PY 2023.' },
  { section:'Benchmarking & Risk Adjustment', term:'Concurrent Risk Adjustment', abbr:null,
    def:'Risk adjustment that uses diagnoses from the performance year itself rather than the prior year. In ACO REACH it applies to High Needs Population ACOs; other ACOs use prospective risk adjustment.' },
  { section:'Benchmarking & Risk Adjustment', term:'Benchmark Years', abbr:'BY1 / BY2 / BY3',
    def:'The three historical years used to build an ACO\'s historical baseline. BY3 is the most recent. The PUF publishes baseline PBPM amounts and risk scores for each benchmark year.' },
  { section:'Benchmarking & Risk Adjustment', term:'Health Equity Benchmark Adjustment', abbr:'HEBA',
    def:'Raises the benchmark for aligned beneficiaries from the most underserved communities and lowers it slightly for those from the least underserved. Began in PY 2023. The PUF reports each ACO\'s total upward and downward HEBA dollars and months.' },
  { section:'Benchmarking & Risk Adjustment', term:'Health Equity Data Reporting Adjustment', abbr:'HEDR / HDR_ADJUST',
    def:'Up to 10 percentage points added to the Total Quality Score for complete beneficiary-reported demographic data submitted to CMS, with the score capped at 100%. Began in PY 2023.' },

  // Payment & Capitation
  { section:'Payment & Capitation', term:'Primary Care Capitation', abbr:'PCC / CAP_PMT_AMT',
    def:'A monthly capitation payment for primary care services. Available to Global and Professional ACOs. CAP_PMT_AMT is the total primary care capitation amount.' },
  { section:'Payment & Capitation', term:'Enhanced Primary Care Capitation', abbr:'ePCC / EPCC_PMT_AMT',
    def:'An election to receive primary care capitation at a higher percentage than Basic PCC. EPCC_PMT_AMT is the total enhanced PCC amount; in PY 2023 the median for electing ACOs was about $52 per beneficiary per month.' },
  { section:'Payment & Capitation', term:'Claims Payments', abbr:'CLM / CLM_PMT_AMT',
    def:'Total aggregate fee-for-service claim payments made outside capitation. For most ACOs this is the large majority of payments.' },
  { section:'Payment & Capitation', term:'Advanced Payment Option', abbr:'APO',
    def:'An election, available to ACOs with Primary Care Capitation, to receive prospective monthly payments for non-primary-care services in place of part of the fee-for-service claims payments for those services.' },
  { section:'Payment & Capitation', term:'Total Care Capitation', abbr:'TCC',
    def:'Capitation covering most Part A and Part B services furnished by the ACO\'s participating (and preferred) providers, not only primary care. Available only to Global risk ACOs.' },
  { section:'Payment & Capitation', term:'Capitation Arrangement', abbr:'CAPITATION_ARRANGEMENT',
    def:'The payment option elected by the ACO: Primary Care Capitation (PCC) or Total Care Capitation (TCC). Only Global risk ACOs may elect TCC.' },
  { section:'Payment & Capitation', term:'Alignment Plus', abbr:'ALIGNMENT_PLUS',
    def:'An ACO-level election reported in the PUF. The PUF does not report how many beneficiaries were aligned through each method.' },

  // Quality Measures
  { section:'Quality Measures', term:'Total Quality Score', abbr:'QUAL_SCR',
    def:'The share of the quality withhold the ACO earns back, from 0 to 100%. PY 2021 was pay-for-reporting (every ACO received 100%), PY 2022 was mostly pay-for-reporting, and quality became pay-for-performance in PY 2023.' },
  { section:'Quality Measures', term:'All-Condition Readmission', abbr:'ACR / ACR_SCR',
    def:'Risk-standardized all-condition readmission rate. Lower is better. Reported as ACH_SCR in the PY 2021 file.' },
  { section:'Quality Measures', term:'Unplanned Admissions for Multiple Chronic Conditions', abbr:'UAMCC / UAMCC_SCR',
    def:'Risk-standardized, all-cause unplanned admissions per 100 person-years for patients with multiple chronic conditions. Lower is better.' },
  { section:'Quality Measures', term:'Timely Follow-Up After Acute Exacerbations of Chronic Conditions', abbr:'TFU / TFU_SCR',
    def:'Share of acute exacerbations of chronic conditions with timely follow-up. Higher is better. Reported from PY 2022 for Standard and New Entrant ACOs.' },
  { section:'Quality Measures', term:'Days at Home', abbr:'DAH / DAH_SCR',
    def:'Days at home for patients with complex, chronic conditions. Higher is better. Reported for High Needs Population ACOs.' },
  { section:'Quality Measures', term:'Continuous Improvement / Sustained Exceptional Performance', abbr:'CI/SEP',
    def:'A quality flag reported from PY 2023 indicating whether the ACO met the CI/SEP criteria. Assessed only for ACOs that also participated in the prior performance year.' },
  { section:'Quality Measures', term:'High Performers Pool', abbr:'HPP',
    def:'An additional financial benefit for quality performance, reported from PY 2023. In PY 2023, 24 of 132 ACOs qualified, and all of them also met CI/SEP.' },
  { section:'Quality Measures', term:'CAHPS Summary Survey Measures', abbr:'SSM',
    def:'Patient experience measures from the CAHPS survey: Getting Timely Care, Appointments, and Information (TACI); How Well Providers Communicate (COM); Care Coordination (CC); Shared Decision Making (SDM); Patient Rating of Provider (PR); Courteous and Helpful Office Staff (CHOS); Health Promotion and Education (HPE); and Stewardship of Patient Resources (SPR). Not reported for PY 2021; pay-for-reporting in PY 2022.' },

  // ACO Structure & Participation
  { section:'ACO Structure & Participation', term:'Risk Arrangement', abbr:'RISK_ARRANGEMENT',
    def:'Global (100% of savings and losses) or Professional (50% of savings and losses).' },
  { section:'ACO Structure & Participation', term:'ACO Type', abbr:'ACO_TYPE',
    def:'Standard, New Entrant or High Needs. Standard ACOs generally already serve a Medicare fee-for-service population; New Entrants have not traditionally served one and can build alignment over time; High Needs Population ACOs serve beneficiaries with complex needs.' },
  { section:'ACO Structure & Participation', term:'Configuration', abbr:null,
    def:'In this explorer, the combination of risk arrangement and capitation type (Global/TCC, Global/PCC or Professional/PCC), sometimes split further by the Enhanced PCC and stop-loss elections.' },
  { section:'ACO Structure & Participation', term:'Aligned Beneficiaries', abbr:'BENE_CNT',
    def:'Total Medicare beneficiaries aligned to the ACO for the performance year, through claims-based or voluntary alignment. The PUF does not report the split. Reported as ALIGNED_BENEFICIARIES in the PY 2021 file.' },
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
          ACO REACH Explorer. Terms are drawn from CMS program documentation and
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
