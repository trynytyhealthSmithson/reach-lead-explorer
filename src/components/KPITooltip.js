import React from 'react';

/**
 * KPITooltip: wraps a label with a ? icon that shows a definition on hover.
 * Usage: <KPITooltip {...TOOLTIPS.sav_rate} />
 */
export default function KPITooltip({ term, label, def }) {
  return (
    <span className="kpi-tooltip-wrap">
      {label || term}
      <span className="kpi-tooltip-icon" aria-label={`Definition of ${term}`}>?</span>
      <span className="kpi-tooltip-popup" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
        <strong style={{ display: 'block', marginBottom: 3, color: '#20B2AA' }}>{term}</strong>
        {def}
      </span>
    </span>
  );
}

// Definitions follow the CMS ACO REACH Financial and Quality Results data dictionary.
export const TOOLTIPS = {
  sav_rate: { term: 'Savings Rate', def: 'Gross savings divided by the final benchmark, as CMS publishes it. Positive means the ACO spent less than its benchmark. The final benchmark already reflects the Global discount.' },
  gross_rate_cms: { term: 'Gross Savings Rate (CMS basis)', def: 'Savings measured against the benchmark before the Global discount, using total cost of care after stop-loss, the way CMS reports program results. Rebuilt from the ACO-level PUF.' },
  shared_savings: { term: 'Earned Savings (Shared Savings)', def: 'The portion of gross savings (or losses) attributed to the ACO after the risk arrangement, discount and quality adjustments. Negative values are shared losses.' },
  shared_per_bene: { term: 'Earned Savings per Beneficiary', def: 'Earned (shared) savings divided by aligned beneficiaries for the year.' },
  qual_scr: { term: 'Quality Score', def: 'The share of the quality withhold the ACO earns back, from 0 to 100%. PY 2021 and most of PY 2022 were pay-for-reporting; pay-for-performance began in PY 2023.' },
  risk_score: { term: 'Normalized Risk Score', def: 'Normalized weighted average risk score of the ACO\u2019s aligned beneficiaries. CMS publishes it from PY 2023.' },
  exp_pbpm: { term: 'Expense PBPM', def: 'Total cost of care divided by aligned beneficiaries and months in the performance year (nine months in PY 2021).' },
  bene_cnt: { term: 'Aligned Beneficiaries', def: 'Beneficiaries aligned to the ACO through claims or voluntary alignment for the performance year.' },
  hpp: { term: 'High Performers Pool', def: 'ACOs whose quality ranks high enough to share in withheld dollars redistributed by CMS.' },
  config: { term: 'Configuration', def: 'Risk arrangement (Global or Professional) combined with capitation type (Total Care or Primary Care).' },
};
