export const fmt = {
  dollars: (v) => {
    if (v == null) return '—';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1e9) return `${sign}$${(abs/1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs/1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}$${(abs/1e3).toFixed(0)}K`;
    return `${sign}$${Number(abs).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  },
  dollarsM: (v) => v == null ? '—' : `$${Number(v).toFixed(1)}M`,
  pct:  (v, d=1) => v == null ? '—' : `${Number(v).toFixed(d)}%`,
  num:  (v) => v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }),
  shortNum: (v) => {
    if (v == null) return '—';
    if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`;
    return String(Math.round(v));
  },
  delta: (v, d=2) => {
    if (v == null) return '—';
    return `${v > 0 ? '+' : ''}${Number(v).toFixed(d)}%`;
  },
};

export const COLORS = {
  navy:    '#1a3a52',
  teal:    '#42BA97',
  blue:    '#335B74',
  green:   '#2e7d4f',
  red:     '#c0392b',
  amber:   '#d4860a',
  gold:    '#ddaa66',
  purple:  '#6b4ca8',
  coral:   '#e07b54',
  gray:    '#adb5bd',
  slate:   '#5a7a94',
};

export const TYPE_COLORS = {
  'Standard':    '#335B74',
  'New Entrant': '#42BA97',
  'High Needs':  '#d4860a',
};

export const CONFIG_COLORS = {
  'Global/TCC':        '#2e7d4f',  // best performer — green
  'Global/PCC':        '#42BA97',  // solid — teal
  'Professional/PCC':  '#335B74',  // lowest — blue
};

export const CONFIG_LABELS = {
  'Global/TCC': 'Global / Total Care Cap',
  'Global/PCC': 'Global / Primary Care Cap',
  'Professional/PCC': 'Professional / Primary Care Cap',
};

// CAHPS SSM measure labels
export const CAHPS_LABELS = {
  ssm_taci: 'Timely Access to Care',
  ssm_com:  'Communication',
  ssm_cc:   'Care Coordination',
  ssm_sdm:  'Shared Decision Making',
  ssm_pr:   'Provider Rating',
  ssm_chos: 'Choice of Provider',
  ssm_hpe:  'Health Promotion',
  ssm_spr:  'Specialist Provider Rating',
};

export const REACH_YEARS = [2021, 2022, 2023];

export const PROGRAM_EVENTS = {
  2021: '9-month founding year (Apr–Dec) · GPDC · Pay-for-reporting quality',
  2022: 'First full 12-month year · 99 ACOs · GPDC final year',
  2023: 'Renamed ACO REACH · 132 ACOs · Pay-for-performance quality · HPP introduced',
};

export const YEAR_NARRATIVES = {
  2021: 'The founding year — 53 ACOs in a 9-month performance period (April–December). All ACOs earned 100% quality scores under pay-for-reporting. Program operated as GPDC before the ACO REACH rebrand. Capitation payments flowed entirely through traditional claims (CLM) with modest Primary Care Cap (CAP) top-up.',
  2022: 'The program expanded to 99 ACOs for its first full 12-month year. Average savings rate jumped to 6.5% for Global/PCC ACOs. The GPDC rebranded to ACO REACH effective January 2023. CAHPS SSM patient experience measures added.',
  2023: 'Fully operational as ACO REACH. 132 ACOs, 2M+ beneficiaries. Quality shifted from pay-for-reporting to pay-for-performance — driving average scores from 99% to 79%, the most visible structural change. The Health Equity Benchmark Adjustment (HEBA) introduced. High Performers Pool launched — 24 ACOs earned bonus payments averaging 8.27% savings.',
};

// LEAD model key dates
export const LEAD_DATES = {
  announced:   'December 18, 2025',
  rfa_released:'March 31, 2026',
  deadline:    'May 17, 2026',
  launch:      'January 1, 2027',
  end:         'December 31, 2036',
};
