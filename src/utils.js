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
  dollarsM: (v) => v == null ? "—" : `${v < 0 ? "-" : ""}$${Math.abs(Number(v)).toFixed(1)}M`,
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

// CAHPS SSM measure labels (names from the CMS ACO REACH Financial and Quality Results data dictionary)
export const CAHPS_LABELS = {
  ssm_taci: 'Getting Timely Care, Appointments, and Information',
  ssm_com:  'How Well Providers Communicate',
  ssm_cc:   'Care Coordination',
  ssm_sdm:  'Shared Decision Making',
  ssm_pr:   'Patient Rating of Provider',
  ssm_chos: 'Courteous and Helpful Office Staff',
  ssm_hpe:  'Health Promotion and Education',
  ssm_spr:  'Stewardship of Patient Resources',
};

export const ordinal = (n) => {
  const v = Math.round(n);
  const t = v % 100;
  if (t >= 11 && t <= 13) return `${v}th`;
  return `${v}${({ 1: 'st', 2: 'nd', 3: 'rd' })[v % 10] || 'th'}`;
};

export const PROGRAM_EVENTS = {
  2021: '9-month first year (April to December) · GPDC · Pay-for-reporting quality',
  2022: 'First full 12-month year · Final GPDC year · CAHPS measures reported',
  2023: 'Renamed ACO REACH · Pay-for-performance quality · HEBA and High Performers Pool begin',
  2024: 'Fourth ACO REACH year · High Performers Pool grows · Population Adjustment and Data Reporting adjustment',
};

export const YEAR_NARRATIVES = {
  2021: 'The first performance year: 53 ACOs (then called Direct Contracting Entities) in a 9-month performance period, April to December, under the Global and Professional Direct Contracting (GPDC) Model. Quality was pay-for-reporting, so every ACO received a 100% quality score.',
  2022: 'The model grew to 99 ACOs in its first full 12-month year, still operating as GPDC. CMS announced in February 2022 that GPDC would be redesigned as ACO REACH effective January 2023. CAHPS patient experience measures were reported but did not affect the quality score.',
  2024: 'The fourth performance year, with 115 ACOs and about 2.5 million aligned beneficiaries. 49 ACOs qualified for the High Performers Pool, up from 24. In the PY 2024 file, CMS publishes the benchmark equity adjustment as the Population Adjustment and the quality data adjustment as the Data Reporting adjustment, and adds a CAHPS composite score.',
  2023: 'The first year as ACO REACH, with 132 ACOs and about 2 million aligned beneficiaries. Quality moved to pay-for-performance, and the average quality score fell from 99% to 79%. The Health Equity Benchmark Adjustment (HEBA) and the High Performers Pool began; 24 ACOs qualified for the pool.',
};
