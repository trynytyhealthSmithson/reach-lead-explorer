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
  navy:    '#112240',
  teal:    '#20B2AA',
  blue:    '#4a6fa5',
  green:   '#178a84',
  red:     '#b4471f',
  amber:   '#d4860a',
  gold:    '#c99a3b',
  purple:  '#1a3a5c',
  coral:   '#e07b54',
  gray:    '#c8d0db',
  slate:   '#8892a4',
};

export const TYPE_COLORS = {
  'Standard':    '#4a6fa5',
  'New Entrant': '#20B2AA',
  'High Needs':  '#d4860a',
};

export const CONFIG_COLORS = {
  'Global/TCC':        '#178a84',  // best performer — green
  'Global/PCC':        '#20B2AA',  // solid — teal
  'Professional/PCC':  '#4a6fa5',  // lowest — blue
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

// Download the chart inside a card as a 2x PNG (shared with the MSSP Explorer)
export function exportChartPNG(cardEl, filename = 'chart') {
  if (!cardEl) return;
  const svg = cardEl.querySelector('svg.recharts-surface, svg');
  if (!svg) { alert('No chart found to export.'); return; }

  // Clone and add white background
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%');
  bg.setAttribute('fill', 'white');
  clone.insertBefore(bg, clone.firstChild);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob   = new Blob([svgStr], { type: 'image/svg+xml' });
  const url    = URL.createObjectURL(blob);

  // Draw onto canvas for PNG
  const img = new Image();
  img.onload = () => {
    const w = svg.clientWidth  || parseInt(svg.getAttribute('width'))  || 800;
    const h = svg.clientHeight || parseInt(svg.getAttribute('height')) || 400;
    const canvas = document.createElement('canvas');
    canvas.width  = w * 2; canvas.height = h * 2; // 2x for retina
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = url;
}

// Months in each performance year (PY 2021 started April 1)
export const PY_MONTHS = { 2021: 9 };
export const monthsFor = (y) => PY_MONTHS[y] || 12;
export const expensePBPM = (r) => (r && r.tot_cost_care != null && r.bene_cnt)
  ? r.tot_cost_care / (r.bene_cnt * monthsFor(r.perf_year)) : null;
export const sharedPerBene = (r) => (r && r.shared_savings != null && r.bene_cnt) ? r.shared_savings / r.bene_cnt : null;

// CMS published program results ($ millions), using the most recent CMS statement of each figure.
// PY 2024 and the PY 2023 Medicare and ACO figures: PY 2024 Financial and Quality Results fact sheet
// (which restates PY 2023 net to ACOs as $948.2M; the PY 2023 sheet said $948.4M). PY 2023 gross: PY 2023 fact sheet.
// PY 2021 and PY 2022 Medicare savings: as reported in the PY 2024 results summary.
export const CMS_PUBLISHED = {
  2021: { medicare: 70.4 },
  2022: { medicare: 371.1, acos: 484.1 },
  2023: { gross: 1643, medicare: 694.6, acos: 948.2 },
  2024: { gross: 2511, medicare: 988.3, acos: 1522 },
};
