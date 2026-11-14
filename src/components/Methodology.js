import React from 'react';
import trends from '../data/reach_program_trends.json';
import { fmt, CMS_PUBLISHED } from '../utils';

const PUF_URL = 'https://data.cms.gov/cms-innovation-center-programs/accountable-care-models/aco-reach-financial-and-quality-results';

const FILES = [
  [2021, 'PY1_EXPND_FNCL_QLTY_PUF_REDACT_UPDATE.csv', 'Global and Professional Direct Contracting (GPDC), nine months from April 1, 2021'],
  [2022, 'PY2_FNCL_QLTY_CORE_EXP_PUF_REDACT_FINAL 2022', 'GPDC, renamed ACO REACH for PY 2023'],
  [2023, 'py3_fncl_qltypuf_rdx.csv', 'First year under the ACO REACH name; HEBA and pay-for-performance quality begin'],
  [2024, 'py4_fncl_qlty_core_exp_puf_redact_02MAR26.csv', 'HEBA renamed the Population Adjustment; CAHPS composite score added'],
];

const DEFINITIONS = [
  ['Savings rate (ACO level)', 'CMS’s published SAV_RATE: gross savings divided by the final benchmark. The final benchmark already reflects the Global discount, so this rate is lower than the rate CMS uses for program results.'],
  ['Gross savings rate (CMS basis)', 'Rebuilt to match how CMS reports program results: Σ (final benchmark ÷ (1 − discount) + population adjustment) minus Σ total cost of care after stop-loss, divided by the same benchmark. Used on Program Overview, Cohort Explorer and the reconciliation table.'],
  ['Gross savings (PUF)', 'Final benchmark plus the population adjustment, minus total cost of care after stop-loss. This identity reproduces CMS’s published GROSS_SAVINGS field for every ACO in every year.'],
  ['Earned (shared) savings', 'CMS’s SHARED_SAVINGS field: the amount of gross savings to be shared with the ACO, before sequestration. Negative values are shared losses.'],
  ['Net savings to Medicare', 'Gross savings (CMS basis) minus earned savings across all ACOs.'],
  ['Expense PBPM', 'Total cost of care divided by aligned beneficiaries and the months in the performance year. PY 2021 ran nine months (April to December).'],
  ['Population adjustment', 'The Health Equity Benchmark Adjustment (HEBA) in PY 2023, renamed the Population Adjustment in PY 2024. Shown net of increases and decreases.'],
  ['Peers', 'ACOs in the same performance year that share the chosen trait: configuration (default), ACO type, size (half to double the aligned beneficiaries) or all ACOs. Most comparisons use the peer average; clinicians per 1,000 beneficiaries uses the median because a few very large networks skew the average.'],
  ['Savings Bridge, benchmark to savings', 'Every step is a published CMS field except one: the split between the discount and the other benchmark adjustments, which is estimated from the published discount rate as final benchmark × discount ÷ (1 − discount).'],
  ['Savings Bridge, change from prior year', 'For ACOs in both years, the change in gross savings splits exactly into three parts using beneficiary months (m), benchmark per beneficiary month (b) and cost per beneficiary month (c): volume (m₁ − m₀)(b₀ − c₀), benchmark m₁(b₁ − b₀) and cost −m₁(c₁ − c₀). The program view adds ACOs that joined and left.'],
  ['Unreported values', 'CMS publishes some fields as a dash (for example provider counts for 26 ACOs in PY 2024) or leaves them blank. The explorer shows these as not reported and leaves them out of averages; it never treats them as zero.'],
];

export default function Methodology() {
  const rows = trends.map(t => {
    const p = CMS_PUBLISHED[t.year] || {};
    return { year: t.year, items: [
      ['Gross savings', p.gross, t.cms_basis_gross_M],
      ['Net savings to Medicare', p.medicare, t.cms_basis_medicare_M],
      ['Net savings to ACOs', p.acos, t.total_shared_savings],
    ].filter(([, pub]) => pub != null) };
  }).filter(r => r.items.length).reverse();
  const m = v => fmt.dollars(v * 1e6);

  return (
    <div className="chart-card method-page">
      <h2 style={{ marginTop: 0 }}>Methodology and validation</h2>
      <p>The ACO REACH Explorer is a free tool from TRYNYTY health:enablement built entirely from CMS public use files. This page explains how figures are calculated, how they compare with CMS&rsquo;s own published results, and where the public data has limits.</p>

      <h2>Data</h2>
      <ul>
        <li><a href={PUF_URL} target="_blank" rel="noreferrer">CMS ACO REACH Financial and Quality Results</a> public use files, one per performance year, with the CMS data dictionary for each year. CMS describes these as results prior to final settlement.</li>
        <li>No beneficiary-level or proprietary data is used.</li>
        <li>The data pipeline (<code>DataPipe/reach_pipeline.py</code>) reads the four CSVs below and writes every number the explorer shows, so the full build can be rerun when CMS publishes a new year.</li>
      </ul>
      <table>
        <thead><tr><th>Year</th><th>File</th><th className="n">ACOs</th><th>Notes</th></tr></thead>
        <tbody>{FILES.map(([y, f, note]) => (
          <tr key={y}><td>PY {y}</td><td><code style={{ fontSize: 12 }}>{f}</code></td><td className="n">{trends.find(t => t.year === y)?.n_acos ?? '—'}</td><td>{note}</td></tr>
        ))}</tbody>
      </table>
      <p className="small">Scaling: CMS publishes the savings rate, discount, dual and long-term institutional shares and the PY 2024 CAHPS composite as decimals; the explorer shows them as percentages. Quality scores published with a percent sign are kept as published. A few retention withhold values published as 0.02 are read as 2%.</p>

      <h2>Definitions</h2>
      <table><tbody>{DEFINITIONS.map(([k, v]) => (
        <tr key={k}><th style={{ width: 250, textTransform: 'none', fontSize: 13, color: 'var(--navy)', letterSpacing: 0 }}>{k}</th><td>{v}</td></tr>
      ))}</tbody></table>

      <h2>Validation against CMS published results</h2>
      <p>Gross savings, which comes straight from the benchmark and cost of care, lands within 1.2% of CMS&rsquo;s published totals in both years CMS reports it. The split between Medicare and ACOs differs more. The public file reports shared savings prior to final settlement, which is the most likely reason. PY 2021 and PY 2022 Medicare savings match within $0.2 million.</p>
      <table>
        <thead><tr><th>Year</th><th>Figure</th><th className="n">CMS published</th><th className="n">Explorer</th><th className="n">Difference</th></tr></thead>
        <tbody>{rows.flatMap(r => r.items.map(([label, pub, ours], i) => {
          const d = ours - pub, pct = pub ? d / pub * 100 : null;
          return (
            <tr key={`${r.year}${label}`}>
              <td>{i === 0 ? `PY ${r.year}` : ''}</td><td>{label}</td>
              <td className="n">{m(pub)}</td><td className="n">{m(ours)}</td>
              <td className="n" style={{ color: Math.abs(pct) <= 3 ? 'var(--teal-dark)' : 'var(--gray-600)' }}>{d >= 0 ? '+' : '-'}{m(Math.abs(d))} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</td>
            </tr>
          );
        }))}</tbody>
      </table>
      <p className="small">CMS figures: ACO REACH PY 2023 and PY 2024 Financial and Quality Results fact sheets; PY 2021 and PY 2022 Medicare savings as reported in the PY 2024 results summary. CMS did not publish gross savings for PY 2021 or PY 2022, or ACO savings for PY 2021, in those sources.</p>

      <h2>Record checks</h2>
      <ul>
        <li>The pipeline reads every value for all {trends.reduce((s, t) => s + t.n_acos, 0)} ACO-year records directly from the CMS CSV for its year, applying only the scaling described above.</li>
        <li>The gross savings identity above reproduces CMS&rsquo;s GROSS_SAVINGS field for every ACO in every year, which confirms the benchmark, population adjustment and cost fields are read correctly.</li>
      </ul>

      <h2>Limits</h2>
      <ul>
        <li><b>Prior to settlement.</b> Shared savings and losses in the public file can change at final settlement, which is why ACO and Medicare totals differ from CMS&rsquo;s fact sheets.</li>
        <li><b>No geography.</b> The public file has no state or county fields, so there is no map and no same-state peer group.</li>
        <li><b>Risk score from PY 2023.</b> CMS publishes the normalized risk score only from PY 2023, and only as one overall score, not by enrollment type.</li>
        <li><b>Pay-for-reporting years.</b> Every ACO received 100% for quality in PY 2021, and most did in PY 2022, so quality comparisons are most meaningful from PY 2023.</li>
      </ul>
    </div>
  );
}
