// Board-ready PowerPoint deck for one ACO REACH ACO, matching the MSSP Explorer deck: action titles,
// native editable charts and tables, TRYNYTY branding.
// Slides: cover, summary, scorecard, savings bridge, benchmark to savings, configuration and payments,
// spending by service vs peers, utilization vs peers, quality, methodology and contact.

const NAVY = '0B1829', NAVY2 = '112240', TEAL = '20B2AA', TEALD = '178A84', RED = 'B4471F', SLATE = '8892A4', INK = '1D2A3A', LIGHT = 'F4F7FB', LINE = 'DEE4EC', WHITE = 'FFFFFF';
const HEAD = 'Georgia', BODY = 'Calibri';
const W = 10;
const MONTHS = { 2021: 9 };
const months = y => MONTHS[y] || 12;
const CONFIG = { 'Global/TCC': 'Global, Total Care Capitation', 'Global/PCC': 'Global, Primary Care Capitation', 'Professional/PCC': 'Professional, Primary Care Capitation' };
const SVC = [['expnd_inp_all', 'Inpatient'], ['expnd_opd', 'Hospital outpatient'], ['expnd_pb', 'Physician and supplier'], ['expnd_snf', 'Skilled nursing'],
  ['expnd_hha', 'Home health'], ['expnd_hsp', 'Hospice'], ['expnd_dme', 'Durable medical equipment'], ['expnd_ambupay', 'Ambulance']];
// [key, label, higherIsBetter (null = no judgment)]
const UTIL = [['_adm', 'Inpatient admissions per 1,000', false], ['p_edv_vis', 'ED visits per 1,000', false], ['p_snf_adm', 'SNF admissions per 1,000', false],
  ['snf_los', 'SNF length of stay (days)', false], ['p_em_pcp_vis', 'PCP E&M visits per 1,000', true], ['p_em_sp_vis', 'Specialist E&M visits per 1,000', null],
  ['p_ct_vis', 'CT scans per 1,000', false], ['p_mri_vis', 'MRI scans per 1,000', false]];
const QUAL = [['acr_scr', 'All-condition readmission (%)', false], ['uamcc_scr', 'Unplanned admissions, multiple chronic conditions', false],
  ['tfu_scr', 'Timely follow-up after exacerbations (%)', true], ['dah_scr', 'Days at home', true], ['cahps_scr', 'CAHPS composite', true]];

const f = v => v || 0;
const lc = t => /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
const median = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pctRank = (v, arr, higher = true) => { const s = arr.filter(x => x != null && isFinite(x)); if (v == null || !s.length) return null; const below = s.filter(x => higher ? x < v : x > v).length, eq = s.filter(x => x === v).length; return (below + eq / 2) / s.length; };
const ord = p => { if (p == null) return 'n/a'; const n = Math.round(p * 100); const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); return n + s; };
const money = (v, dec = 1) => { if (v == null || !isFinite(v)) return 'n/a'; const s = v < 0 ? '-' : '', a = Math.abs(v); return a >= 1e9 ? `${s}$${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${s}$${(a / 1e6).toFixed(dec)}M` : a >= 1e3 ? `${s}$${(a / 1e3).toFixed(0)}K` : `${s}$${Math.round(a)}`; };
const usd = v => v == null || !isFinite(v) ? 'n/a' : `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString()}`;
const signed = (v, fn = money) => (v > 0 ? '+' : '') + fn(v);
const pct = (v, d = 1) => v == null || !isFinite(v) ? 'n/a' : `${Number(v).toFixed(d)}%`; // REACH rates are already percentages
const n0 = v => v == null || !isFinite(v) ? 'n/a' : Math.round(v).toLocaleString();
const perBene = (r, k) => r && r[k] != null && r.bene_cnt ? r[k] / r.bene_cnt * 12 / months(r.perf_year) : null; // annualized
const util = (r, k) => !r ? null : k === '_adm' ? (r.adm_n != null && r.bene_cnt ? r.adm_n / r.bene_cnt * 1000 : null) : r[k];
const benchForSavings = r => f(r.final_benchmark) + f(r.heba_up_amt) + f(r.heba_down_amt);

let pptxPromise = null;
const loadPptx = () => pptxPromise || (pptxPromise = new Promise((resolve, reject) => {
  if (window.PptxGenJS) return resolve(window.PptxGenJS);
  const sc = document.createElement('script'); sc.src = `${process.env.PUBLIC_URL}/vendor/pptxgen-4.0.1.bundle.js`;
  sc.onload = () => resolve(window.PptxGenJS); sc.onerror = () => { pptxPromise = null; reject(new Error('Could not load the PowerPoint engine')); };
  document.head.appendChild(sc);
}));

export async function generateREACHDeck(aco, acoRecords, allRecords, onProgress) {
  onProgress?.('Loading report engine...');
  const PptxGenJS = await loadPptx();
  const recs = acoRecords.slice().sort((a, b) => a.perf_year - b.perf_year);
  const L = recs[recs.length - 1], Y = L.perf_year, P = recs.find(r => r.perf_year === Y - 1);
  const name = (L.aco_name || aco.aco_name || aco.aco_id).trim(), id = aco.aco_id;
  const yearRows = y => allRecords.filter(r => r.perf_year === y);
  const all = yearRows(Y);
  const peers = all.filter(r => r.config_key === L.config_key && r.aco_id !== id);
  const peerLabel = `${CONFIG[L.config_key] || L.config_key} ACOs, PY ${Y} (${peers.length})`;
  const earnedYears = recs.filter(r => f(r.shared_savings) > 0).length;
  const totalEarned = recs.reduce((s, r) => s + Math.max(0, f(r.shared_savings)), 0);
  const savPr = pctRank(L.sav_rate, peers.map(r => r.sav_rate));
  const qPr = Y >= 2023 ? pctRank(L.qual_scr, peers.map(r => r.qual_scr)) : null;

  // Year-over-year bridge: volume, benchmark per beneficiary month, cost per beneficiary month (adds up exactly)
  let bridge = null;
  if (P) {
    const m0 = f(P.bene_cnt) * months(P.perf_year), m1 = f(L.bene_cnt) * months(Y);
    if (m0 && m1) {
      const b0 = benchForSavings(P) / m0, b1 = benchForSavings(L) / m1, c0 = f(P.tot_cost_care_net) / m0, c1 = f(L.tot_cost_care_net) / m1;
      bridge = { s0: f(P.gross_savings), s1: f(L.gross_savings), vol: (m1 - m0) * (b0 - c0), bench: m1 * (b1 - b0), cost: -m1 * (c1 - c0), b0, b1, c0, c1, m0, m1 };
    }
  }

  const span = recs[0].perf_year === Y ? `PY ${Y}` : `PY ${recs[0].perf_year} to ${Y}`;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9'; pres.author = 'TRYNYTY health:enablement'; pres.company = 'TRYNYTY health:enablement';
  pres.title = `${name}: ACO REACH results through PY ${Y}`;
  let page = 0;
  const SOURCE = `Source: CMS ACO REACH Financial and Quality Results public use files, ${span} (results prior to settlement).`;
  const frame = (kicker, title, source) => {
    const s = pres.addSlide(); page++;
    s.background = { color: WHITE };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.06, fill: { color: TEAL }, line: { color: TEAL } });
    s.addText(kicker.toUpperCase(), { x: 0.45, y: 0.22, w: 9.1, h: 0.25, fontFace: BODY, fontSize: 10, bold: true, color: TEALD, charSpacing: 1.5, margin: 0 });
    s.addText(title, { x: 0.45, y: 0.46, w: 9.1, h: 0.7, fontFace: HEAD, fontSize: 21, color: NAVY, valign: 'top', margin: 0, fit: 'shrink' });
    s.addShape(pres.shapes.LINE, { x: 0.45, y: 5.22, w: 9.1, h: 0, line: { color: LINE, width: 0.75 } });
    s.addText(source || SOURCE, { x: 0.45, y: 5.26, w: 7.4, h: 0.26, fontFace: BODY, fontSize: 8, color: SLATE, margin: 0 });
    s.addText(`TRYNYTY health:enablement  ·  ${page}`, { x: 7.6, y: 5.26, w: 1.95, h: 0.26, fontFace: BODY, fontSize: 8, color: SLATE, align: 'right', margin: 0 });
    return s;
  };
  const kpi = (s, x, y, w, v, l, color = NAVY) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.95, fill: { color: LIGHT }, line: { color: LINE, width: 0.5 }, rectRadius: 0.06 });
    s.addText(v, { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.5, fontFace: HEAD, fontSize: 22, color, margin: 0, fit: 'shrink' });
    s.addText(l, { x: x + 0.15, y: y + 0.56, w: w - 0.3, h: 0.34, fontFace: BODY, fontSize: 9, color: '5B6778', margin: 0, valign: 'top' });
  };
  const hdr = t => ({ text: t, options: { bold: true, color: '5B6778', fill: { color: 'F8FAFC' }, fontSize: 9 } });
  const waterfallShapes = (s, bars, cy = 1.45, chh = 2.85) => {
    const lo = Math.min(0, ...bars.map(x => Math.min(x.a, x.b))), hi = Math.max(0, ...bars.map(x => Math.max(x.a, x.b)));
    const cx = 0.55, cw = 9.0, bw = cw / bars.length, yOf = v => cy + chh - (v - lo) / (hi - lo || 1) * chh;
    s.addShape(pres.shapes.LINE, { x: cx, y: yOf(0), w: cw, h: 0, line: { color: 'C8D0DB', width: 0.75 } });
    bars.forEach((x, i) => {
      const y1 = yOf(Math.max(x.a, x.b)), y2 = yOf(Math.min(x.a, x.b)), bx = cx + i * bw + bw * 0.15;
      const col = x.t === 'total' ? NAVY : x.t === 'up' ? TEALD : RED;
      s.addShape(pres.shapes.RECTANGLE, { x: bx, y: y1, w: bw * 0.7, h: Math.max(0.02, y2 - y1), fill: { color: col }, line: { color: col } });
      s.addText(x.t === 'total' ? money(x.b) : signed(x.v), { x: bx - 0.15, y: y1 - 0.26, w: bw * 0.7 + 0.3, h: 0.24, fontFace: BODY, fontSize: 10, bold: true, color: col, align: 'center', margin: 0 });
      s.addText(x.l, { x: cx + i * bw, y: cy + chh + 0.08, w: bw, h: 0.5, fontFace: BODY, fontSize: 8.5, color: '5B6778', align: 'center', valign: 'top', margin: 0 });
    });
  };
  const steps = (start, startLabel, list, endLabel, end) => {
    const bars = [{ l: startLabel, a: 0, b: start, t: 'total' }]; let cum = start;
    list.forEach(([l, v]) => { bars.push({ l, a: cum, b: cum + v, t: v >= 0 ? 'up' : 'down', v }); cum += v; });
    bars.push({ l: endLabel, a: 0, b: end, t: 'total' });
    return bars;
  };

  // ---- 1. Cover
  onProgress?.('Building slides...');
  {
    const s = pres.addSlide(); page++;
    s.background = { color: NAVY };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.08, fill: { color: TEAL }, line: { color: TEAL } });
    s.addImage({ path: `${window.location.origin}/logo.png`, x: 0.5, y: 0.45, w: 0.5, h: 0.51 });
    s.addText([{ text: 'TRYNYTY', options: { bold: true, color: WHITE, fontSize: 16, breakLine: true } }, { text: 'health:enablement', options: { color: TEAL, fontSize: 11 } }], { x: 1.1, y: 0.42, w: 4, h: 0.6, fontFace: BODY, margin: 0 });
    s.addText(`ACO REACH RESULTS, ${span.toUpperCase()}`, { x: 0.5, y: 1.45, w: 9, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: TEAL, charSpacing: 1.5, margin: 0 });
    s.addText(name, { x: 0.5, y: 1.8, w: 9, h: 1.2, fontFace: HEAD, fontSize: 34, color: WHITE, valign: 'top', margin: 0, fit: 'shrink' });
    s.addText(`${id}  ·  ${CONFIG[L.config_key] || L.config_key}  ·  ${L.aco_type}  ·  ${recs.length} performance year${recs.length > 1 ? 's' : ''}`, { x: 0.5, y: 3.05, w: 9, h: 0.3, fontFace: BODY, fontSize: 12, color: 'C8D0DB', margin: 0 });
    [[pct(L.sav_rate, 2), `savings rate, PY ${Y}`], [money(f(L.shared_savings)), f(L.shared_savings) < 0 ? `shared losses, PY ${Y}` : `earned savings, PY ${Y}`],
      [L.qual_scr != null ? pct(L.qual_scr) : 'n/a', `quality score, PY ${Y}`], [money(totalEarned), `earned savings, all years`]].forEach(([v, l], i) => {
      const x = 0.5 + i * 2.3;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.6, w: 2.1, h: 0.95, fill: { color: NAVY2 }, line: { color: '28466A', width: 0.5 }, rectRadius: 0.06 });
      s.addText(v, { x: x + 0.15, y: 3.66, w: 1.85, h: 0.5, fontFace: HEAD, fontSize: 22, color: TEAL, margin: 0, fit: 'shrink' });
      s.addText(l, { x: x + 0.15, y: 4.14, w: 1.85, h: 0.3, fontFace: BODY, fontSize: 9, color: 'A8B2C4', margin: 0 });
    });
    s.addText(`Prepared by TRYNYTY health:enablement from CMS public use files  ·  ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}  ·  reachpuf.trynytyhealth.com/#aco/${id}`, { x: 0.5, y: 5.05, w: 9, h: 0.3, fontFace: BODY, fontSize: 9, color: '8892A4', margin: 0 });
  }

  // ---- 2. Summary
  const svcGaps = SVC.map(([k, l]) => ({ l, v: perBene(L, k), m: median(peers.map(r => perBene(r, k))) }))
    .filter(x => x.v != null && x.m).map(x => ({ ...x, gap: x.v - x.m })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const takeaways = [];
  const res = f(L.shared_savings) > 0 ? `earned ${money(L.shared_savings)} in shared savings` : f(L.shared_savings) < 0 ? `owed ${money(-L.shared_savings)} in shared losses` : 'did not earn shared savings';
  takeaways.push(`In PY ${Y}, ${name} spent ${pct(Math.abs(L.sav_rate), 2)} ${L.sav_rate >= 0 ? 'below' : 'above'} its benchmark and ${res}${recs.length > 1 ? `; it has earned savings in ${earnedYears} of ${recs.length} performance years` : ''}.`);
  if (bridge) {
    const parts = [['beneficiary months', bridge.vol], ['the benchmark per beneficiary month', bridge.bench], ['cost per beneficiary month', bridge.cost]].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const d = bridge.s1 - bridge.s0;
    takeaways.push(`Gross savings ${d >= 0 ? 'rose' : 'fell'} ${money(Math.abs(d))} from PY ${Y - 1}; the biggest moves were ${parts[0][0]} (${signed(parts[0][1])}) and ${parts[1][0]} (${signed(parts[1][1])}).`);
  }
  if (savPr != null) takeaways.push(`Against ${peers.length} ${CONFIG[L.config_key] || L.config_key} ACOs in PY ${Y}, its savings rate ranks in the ${ord(savPr)} percentile${qPr != null ? ` and its quality score in the ${ord(qPr)} percentile` : ''}.`);
  if (svcGaps.length) takeaways.push(`The largest spending gap to peers is ${lc(svcGaps[0].l)}: ${usd(svcGaps[0].v)} per beneficiary per year vs a peer median of ${usd(svcGaps[0].m)} (${signed(svcGaps[0].gap, usd)}).`);
  {
    const s = frame('Summary', takeaways[0]);
    s.addText(takeaways.slice(1).map(t => ({ text: t, options: { bullet: { indent: 14 }, paraSpaceAfter: 10 } })), { x: 0.45, y: 1.35, w: 5.6, h: 3.6, fontFace: BODY, fontSize: 13, color: INK, valign: 'top', margin: 0 });
    kpi(s, 6.4, 1.35, 3.15, n0(L.bene_cnt), `aligned beneficiaries, PY ${Y}`);
    kpi(s, 6.4, 2.42, 3.15, ord(savPr), `savings rate percentile among ${peers.length} peers`, TEALD);
    kpi(s, 6.4, 3.49, 3.15, qPr != null ? ord(qPr) : 'n/a', qPr != null ? 'quality score percentile among peers' : 'quality was pay-for-reporting this year', TEALD);
  }

  // ---- 3. Scorecard
  onProgress?.('Building scorecard...');
  {
    const ys = recs.map(r => r.perf_year);
    const pick = y => recs.find(r => r.perf_year === y);
    const best = recs.slice().sort((a, b) => f(b.sav_rate) - f(a.sav_rate))[0];
    const beat = ys.filter(y => f(pick(y).sav_rate) > f(median(yearRows(y).map(r => r.sav_rate)))).length;
    const short = name.split(/,| \(/)[0];
    const s = frame('Scorecard', ys.length > 1
      ? `${short} has beaten the median ACO’s savings rate in ${beat} of ${ys.length} years; its best year was PY ${best.perf_year} at ${pct(best.sav_rate, 2)}`
      : `In its one performance year, PY ${Y}, ${short} posted a ${pct(L.sav_rate, 2)} savings rate against a median of ${pct(median(all.map(r => r.sav_rate)), 2)}`);
    s.addChart(pres.charts.LINE, [
      { name: name.length > 28 ? name.slice(0, 26) + '…' : name, labels: ys.map(String), values: ys.map(y => +f(pick(y).sav_rate).toFixed(2)) },
      { name: 'Median ACO', labels: ys.map(String), values: ys.map(y => +f(median(yearRows(y).map(r => r.sav_rate))).toFixed(2)) },
    ], { x: 0.35, y: 1.25, w: 4.9, h: 3.85, chartColors: [TEAL, SLATE], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 6,
      showLegend: true, legendPos: 'b', legendFontSize: 9, valAxisLabelFormatCode: '0.0"%"', valAxisLabelFontSize: 9, catAxisLabelFontSize: 9,
      valGridLine: { color: 'EEF1F5', size: 0.5 }, catGridLine: { style: 'none' }, showTitle: true, title: 'Savings rate, ACO vs median ACO', titleFontSize: 11, titleColor: NAVY });
    const rows = [[hdr('PY'), hdr('Aligned'), hdr('Savings rate'), hdr('Earned'), hdr('Quality')]].concat(ys.slice().reverse().map(y => {
      const r = pick(y); return [String(y), n0(r.bene_cnt), pct(r.sav_rate, 2), money(f(r.shared_savings)), r.qual_scr != null ? pct(r.qual_scr) : 'n/a'];
    }));
    s.addTable(rows, { x: 5.45, y: 1.25, w: 4.1, colW: [0.55, 0.95, 0.95, 0.95, 0.7], fontFace: BODY, fontSize: 9, color: INK, border: { type: 'solid', color: LINE, pt: 0.5 }, align: 'right', rowH: 0.26, autoPage: false });
    if (ys[0] === 2021) s.addText('PY 2021 covers nine months (April to December).', { x: 5.45, y: 4.85, w: 4.1, h: 0.25, fontFace: BODY, fontSize: 8.5, color: '5B6778', margin: 0 });
  }

  // ---- 4. Savings bridge, change from prior year
  if (bridge) {
    onProgress?.('Building savings bridge...');
    const d = bridge.s1 - bridge.s0;
    const list = [['Beneficiary months', bridge.vol], ['Benchmark per beneficiary month', bridge.bench], ['Cost per beneficiary month', bridge.cost]];
    const top = list.slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    const s = frame('Savings bridge', `Gross savings ${d >= 0 ? 'rose' : 'fell'} ${money(Math.abs(d))} from PY ${Y - 1} to PY ${Y}, and the ${lc(top[0])} was the largest single move (${signed(top[1])})`,
      'Source: CMS ACO REACH Financial and Quality Results PUF. Gross savings = benchmark (with population adjustment) minus cost after stop-loss. Steps add up exactly.');
    waterfallShapes(s, steps(bridge.s0, `PY ${Y - 1} gross savings`, list, `PY ${Y} gross savings`, bridge.s1));
    s.addText(`Benchmark per beneficiary month ${usd(bridge.b0)} to ${usd(bridge.b1)}; cost per beneficiary month ${usd(bridge.c0)} to ${usd(bridge.c1)}; beneficiary months ${n0(bridge.m0)} to ${n0(bridge.m1)}.`,
      { x: 0.45, y: 4.85, w: 9.1, h: 0.3, fontFace: BODY, fontSize: 9.5, color: '5B6778', margin: 0 });
  }

  // ---- 5. Benchmark to savings, latest year
  {
    const disc = L.discount ? -f(L.final_benchmark) * (L.discount / 100) / (1 - L.discount / 100) : 0;
    const other = f(L.final_benchmark) - f(L.unadj_benchmark) - disc, pa = f(L.heba_up_amt) + f(L.heba_down_amt), stop = f(L.tot_cost_care) - f(L.tot_cost_care_net);
    const gain = f(L.gross_savings) >= 0;
    const s = frame('Benchmark to savings', gain
      ? `Against a ${money(benchForSavings(L))} benchmark, the ACO spent ${money(L.tot_cost_care_net)} in PY ${Y}, leaving ${money(L.gross_savings)} in gross savings and ${money(L.shared_savings)} shared with the ACO`
      : `Against a ${money(benchForSavings(L))} benchmark, the ACO spent ${money(L.tot_cost_care_net)} in PY ${Y}, a gross loss of ${money(-f(L.gross_savings))}, of which the ACO owes ${money(-f(L.shared_savings))}`,
      'Source: CMS ACO REACH Financial and Quality Results PUF. The discount is estimated from the published rate; other adjustments are the remainder between the unadjusted and final benchmark.');
    s.addTable([[hdr(`PY ${Y}`), hdr('Amount'), hdr('Per beneficiary')],
      ...[['Unadjusted benchmark', L.unadj_benchmark], ['Discount (estimated)', disc], ['Other adjustments (risk, trend, withhold)', other], ['Population adjustment', pa],
        ['Benchmark for savings', benchForSavings(L)], ['Total cost of care before stop-loss', -f(L.tot_cost_care)], ['Stop-loss', stop], ['Gross savings', L.gross_savings],
        ['Sharing, corridors and quality', f(L.shared_savings) - f(L.gross_savings)], ['Earned (shared) savings', L.shared_savings], ['Sequestration', f(L.shared_savings_seq) - f(L.shared_savings)], ['After sequestration', L.shared_savings_seq]]
        .map(([l, v]) => {
          const tot = /^(Benchmark for|Gross|Earned|After)/.test(l);
          const cell = t => tot ? { text: t, options: { bold: true, color: NAVY } } : t;
          return [cell(l), cell(money(v)), cell(L.bene_cnt ? usd(f(v) / L.bene_cnt) : 'n/a')];
        })],
      { x: 0.45, y: 1.3, w: 6.2, colW: [3.4, 1.4, 1.4], fontFace: BODY, fontSize: 10, color: INK, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.28, align: 'left' });
    kpi(s, 6.9, 1.3, 2.65, pct(L.sav_rate, 2), 'savings rate (gross savings over final benchmark)', TEALD);
    kpi(s, 6.9, 2.37, 2.65, L.discount ? pct(L.discount, 0) : 'None', 'discount on the benchmark');
    kpi(s, 6.9, 3.44, 2.65, f(L.gross_savings) ? pct(f(L.shared_savings) / f(L.gross_savings) * 100, 0) : 'n/a', gain ? 'share of gross savings earned by the ACO' : 'share of the gross loss owed by the ACO');
  }

  // ---- 6. Configuration and payments
  {
    const payTot = f(L.cap_pmt) + f(L.epcc_pmt) + f(L.clm_pmt);
    // Same basis as the Deep Dive's Configuration Context and peer panel: other ACOs with a savings rate, this ACO left out
    const g = all.filter(r => r.config_key === L.config_key && r.aco_id !== id && r.sav_rate != null);
    const s = frame('Configuration and payments', g.length ? `${CONFIG[L.config_key] || L.config_key}: ${g.length + 1} ACOs used this configuration in PY ${Y}; the other ${g.length} averaged a ${pct(g.reduce((a, r) => a + r.sav_rate, 0) / g.length, 2)} savings rate` : `${CONFIG[L.config_key] || L.config_key}, PY ${Y}`);
    if (payTot) s.addChart(pres.charts.DOUGHNUT, [{ name: 'Payments', labels: ['Capitation', 'Enhanced PCC', 'Fee-for-service claims'], values: [f(L.cap_pmt), f(L.epcc_pmt), f(L.clm_pmt)].map(v => Math.round(v)) }],
      { x: 0.35, y: 1.25, w: 4.4, h: 3.85, chartColors: [TEAL, NAVY2, 'C8D0DB'], holeSize: 55, showLegend: true, legendPos: 'b', legendFontSize: 9, showPercent: true, dataLabelColor: WHITE, dataLabelFontSize: 9,
        showTitle: true, title: `How Medicare paid for care, PY ${Y}`, titleFontSize: 11, titleColor: NAVY });
    s.addTable([[hdr('Election'), hdr('This ACO')],
      ['Risk arrangement', L.risk_arrangement || 'n/a'], ['Capitation', L.capitation === 'TCC' ? 'Total Care' : L.capitation === 'PCC' ? 'Primary Care' : (L.capitation || 'n/a')],
      ['Enhanced PCC', L.enhanced_pcc || 'n/a'], ['Advanced Payment Option', L.apo_election || 'n/a'], ['Stop-loss', L.stop_loss || 'n/a'],
      ['Discount', L.discount ? pct(L.discount, 0) : 'None'], ['High Performers Pool', L.hpp_flag || 'Not reported'], ['First performance year', L.first_part_year ? String(L.first_part_year) : 'n/a']],
      { x: 5.0, y: 1.35, w: 4.55, colW: [2.6, 1.95], fontFace: BODY, fontSize: 10.5, color: INK, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.34, align: 'left' });
  }

  // ---- 7. Spending by service vs peers
  onProgress?.('Building peer comparisons...');
  if (svcGaps.length) {
    const rows = SVC.map(([k, l]) => ({ l, v: perBene(L, k), m: median(peers.map(r => perBene(r, k))) })).filter(x => x.v != null && x.m != null);
    const g = svcGaps[0];
    const s = frame('Spending by service vs peers', `${g.l} spending is ${usd(Math.abs(g.gap))} per beneficiary ${g.gap > 0 ? 'above' : 'below'} the peer median, the largest gap of any service`,
      `Source: CMS ACO REACH PUF, PY ${Y}. Annual spending per aligned beneficiary. Peers: ${peerLabel}.`);
    s.addChart(pres.charts.BAR, [{ name: 'This ACO', labels: rows.map(x => x.l), values: rows.map(x => Math.round(x.v)) }, { name: 'Peer median', labels: rows.map(x => x.l), values: rows.map(x => Math.round(x.m)) }],
      { x: 0.35, y: 1.25, w: 6.0, h: 3.9, barDir: 'bar', barGrouping: 'clustered', chartColors: [TEAL, 'C8D0DB'], showLegend: true, legendPos: 'b', legendFontSize: 9,
        catAxisLabelFontSize: 9, valAxisLabelFontSize: 8, valAxisLabelFormatCode: '$#,##0', catAxisOrientation: 'maxMin', valGridLine: { color: 'EEF1F5', size: 0.5 }, showValue: false });
    s.addTable([[hdr('Service'), hdr('Gap to peers')]].concat(rows.map(x => [x.l, { text: signed(x.v - x.m, usd), options: { color: x.v > x.m ? RED : TEALD, bold: true } }])),
      { x: 6.55, y: 1.35, w: 3.0, colW: [1.95, 1.05], fontFace: BODY, fontSize: 9.5, color: INK, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.3, align: 'left' });
  }

  // ---- 8. Utilization vs peers
  {
    const rows = UTIL.map(([k, l, hb]) => ({ l, v: util(L, k), m: median(peers.map(r => util(r, k))), hb, pr: pctRank(util(L, k), peers.map(r => util(r, k)), true) })).filter(x => x.v != null && x.m);
    const worst = rows.filter(x => x.hb === false).sort((a, b) => (b.v / b.m) - (a.v / a.m))[0];
    const short = l => l.replace(/ per 1,000| \(days\)/, '');
    const s = frame('Utilization vs peers', worst ? `${short(worst.l)} ${/s$/.test(short(worst.l)) ? 'are' : 'is'} ${Math.abs((worst.v / worst.m - 1) * 100).toFixed(0)}% ${worst.v > worst.m ? 'above' : 'below'} the peer median, the ${worst.v > worst.m ? 'largest overrun' : 'smallest ratio'} among the utilization measures` : 'Utilization vs peers',
      `Source: CMS ACO REACH PUF, PY ${Y}. Peers: ${peerLabel}.`);
    s.addTable([[hdr('Measure'), hdr('This ACO'), hdr('Peer median'), hdr('Difference'), hdr('Peer percentile')]].concat(rows.map(x => {
      const good = x.hb == null ? null : (x.hb ? x.v >= x.m : x.v <= x.m);
      return [x.l, x.v >= 100 ? n0(x.v) : x.v.toFixed(1), x.m >= 100 ? n0(x.m) : x.m.toFixed(1), { text: `${x.v >= x.m ? '+' : ''}${((x.v / x.m - 1) * 100).toFixed(0)}%`, options: { color: good == null ? INK : good ? TEALD : RED, bold: true } }, ord(x.pr)];
    })), { x: 0.45, y: 1.35, w: 9.1, colW: [3.6, 1.3, 1.4, 1.3, 1.5], fontFace: BODY, fontSize: 11, color: INK, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.36 });
    s.addText('Green marks a better-than-median result (fewer admissions, ED visits, SNF days and imaging; more primary care visits). Specialist visits are shown without a judgment. Percentile is the share of peers with a lower value.', { x: 0.45, y: 4.7, w: 9.1, h: 0.45, fontFace: BODY, fontSize: 9, color: '5B6778', margin: 0 });
  }

  // ---- 9. Quality
  {
    const ys = recs.map(r => r.perf_year);
    const rows = QUAL.map(([k, l, hb]) => ({ l, v: L[k], m: median(all.map(r => r[k])), pr: pctRank(L[k], all.map(r => r[k]), hb), hb })).filter(x => x.v != null && x.m != null);
    const ranked = rows.filter(x => x.pr != null).sort((a, b) => b.pr - a.pr);
    const qAll = Y >= 2023 ? pctRank(L.qual_scr, all.map(r => r.qual_scr)) : null;
    const title = `Quality score ${L.qual_scr != null ? pct(L.qual_scr) : 'n/a'} in PY ${Y}${qAll != null ? ` (${ord(qAll)} percentile of all ACOs)` : ''}${ranked.length > 1 ? `; strongest on ${lc(ranked[0].l.replace(/ \(%\)$/, ''))}, weakest on ${lc(ranked[ranked.length - 1].l.replace(/ \(%\)$/, ''))}` : ''}`;
    const s = frame('Quality', title, `Source: CMS ACO REACH PUF. Percentiles compare with all ACOs in PY ${Y}, with direction handled for measures where lower is better. PY 2021 was pay-for-reporting.`);
    s.addChart(pres.charts.BAR, [{ name: 'This ACO', labels: ys.map(String), values: ys.map(y => +f(recs.find(r => r.perf_year === y).qual_scr).toFixed(1)) },
      { name: 'Median ACO', labels: ys.map(String), values: ys.map(y => +f(median(yearRows(y).map(r => r.qual_scr))).toFixed(1)) }],
      { x: 0.35, y: 1.3, w: 3.6, h: 3.75, barDir: 'col', barGrouping: 'clustered', chartColors: [TEAL, 'C8D0DB'], showLegend: true, legendPos: 'b', legendFontSize: 9, valAxisMinVal: 0, valAxisMaxVal: 100,
        valAxisLabelFontSize: 8, catAxisLabelFontSize: 9, showValue: false, valGridLine: { color: 'EEF1F5', size: 0.5 }, showTitle: true, title: 'Total quality score', titleFontSize: 11, titleColor: NAVY });
    s.addTable([[hdr('Measure'), hdr('ACO'), hdr('Median'), hdr('Percentile')]].concat(rows.map(x => [x.l, x.v.toFixed(1), x.m.toFixed(1),
      { text: ord(x.pr), options: { bold: true, color: x.pr >= 0.6 ? TEALD : x.pr <= 0.4 ? RED : INK } }])),
      { x: 4.15, y: 1.3, w: 5.4, colW: [2.9, 0.8, 0.8, 0.9], fontFace: BODY, fontSize: 9.5, color: INK, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.3 });
    const flags = [L.hpp_flag && `High Performers Pool: ${L.hpp_flag}`, L.cisep_flag && `CI/SEP met: ${L.cisep_flag}`].filter(Boolean).join('   ·   ');
    if (flags) s.addText(flags, { x: 4.15, y: 4.75, w: 5.4, h: 0.3, fontFace: BODY, fontSize: 10, bold: true, color: TEALD, margin: 0 });
  }

  // ---- 10. Methodology and contact
  {
    const s = frame('About this report', 'Built from CMS public data and reconciled to CMS published program results', 'TRYNYTY health:enablement  ·  Andrew@trynytyhealth.com  ·  www.trynytyhealth.com');
    s.addText([
      { text: 'Data. ', options: { bold: true } }, { text: `CMS ACO REACH Financial and Quality Results public use files, ${span}. CMS describes these as results prior to final settlement.`, options: { breakLine: true } },
      { text: 'Savings. ', options: { bold: true } }, { text: 'Savings rate is CMS’s published rate: gross savings over the final benchmark. Earned savings is CMS’s shared savings amount (negative for losses owed).', options: { breakLine: true } },
      { text: 'Savings bridge. ', options: { bold: true } }, { text: 'The change in gross savings splits exactly into beneficiary months (at last year’s savings per month), the benchmark per beneficiary month and cost per beneficiary month.', options: { breakLine: true } },
      { text: 'Peers. ', options: { bold: true } }, { text: `${peerLabel}. Percentiles are the share of peers with a lower value, with direction handled for measures where lower is better.`, options: { breakLine: true } },
      { text: 'Validation. ', options: { bold: true } }, { text: 'Program gross savings in the explorer lands within 1.2% of CMS’s published totals. Full methodology: reachpuf.trynytyhealth.com, Methodology and validation.' },
    ], { x: 0.45, y: 1.3, w: 5.9, h: 3.8, fontFace: BODY, fontSize: 10.5, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.6, y: 1.3, w: 2.95, h: 3.6, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.08 });
    s.addText([
      { text: 'Want the full picture?', options: { fontFace: HEAD, fontSize: 18, color: WHITE, breakLine: true } },
      { text: 'TRYNYTY helps ACOs and health systems turn results like these into strategy: benchmark planning, spending drivers, quality and network performance.', options: { fontSize: 10.5, color: 'C8D0DB', breakLine: true } },
      { text: ' ', options: { breakLine: true } },
      { text: 'Andrew@trynytyhealth.com', options: { fontSize: 11, bold: true, color: TEAL, breakLine: true } },
      { text: `reachpuf.trynytyhealth.com/#aco/${id}`, options: { fontSize: 9.5, color: TEAL } },
    ], { x: 6.8, y: 1.45, w: 2.6, h: 3.3, fontFace: BODY, valign: 'top', margin: 0, paraSpaceAfter: 6 });
  }

  onProgress?.('Saving file...');
  const safe = name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
  await pres.writeFile({ fileName: `${safe}_${id}_ACO_REACH_PY${Y}.pptx` });
}
