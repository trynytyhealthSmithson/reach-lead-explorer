// generateACOReport.js
// Browser-side PPTX generation using PptxGenJS loaded from CDN
// Called from ACODeepDive when user clicks "Export Executive Report"

// ── Brand colors (no # prefix - pptxgenjs requirement) ────────────────────
const NAVY    = "0D1F2D";
const NAVY2   = "1A3A52";
const TEAL    = "42BA97";
const WHITE   = "FFFFFF";
const SLATE   = "94A3B8";
const SLATE_L = "CBD5E1";
const GOLD    = "DDAA66";
const GRAY_50 = "F8FAFC";
const RED     = "C53030";
const GREEN   = "2E7D4F";

const makeShadow = () => ({ type:"outer", blur:8, offset:3, angle:135, color:"000000", opacity:0.12 });

// ── Load pptxgenjs from CDN (cached after first load) ─────────────────────
function loadPptxGenJS() {
  return new Promise((resolve, reject) => {
    if (window.PptxGenJS) { resolve(window.PptxGenJS); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
    script.onload = () => resolve(window.PptxGenJS);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── Helper: peer average across records ───────────────────────────────────
function calcPeerAvg(peerRecs, key) {
  const vals = peerRecs.map(r => r[key]).filter(v => v != null && !isNaN(v));
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

function calcPeerPct(peerRecs, key, val) {
  if (val == null) return null;
  const vals = [...peerRecs.map(r => r[key]).filter(v => v != null), val].sort((a, b) => a - b);
  const rank = vals.filter(v => v < val).length;
  return Math.round(rank / Math.max(vals.length - 1, 1) * 100);
}

function fmtM(v) {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e9) return `$${(v/1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v/1e6).toFixed(1)}M`;
  return `$${(v/1e3).toFixed(0)}K`;
}

// ── Main export function ───────────────────────────────────────────────────
export async function generateACOReport(aco, acoRecords, allRecords, onProgress) {
  onProgress?.('Loading report engine...');

  const PptxGenJS = await loadPptxGenJS();
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.title = `ACO REACH → LEAD: ${aco.aco_name}`;

  const latest = acoRecords[acoRecords.length - 1];
  const prior  = acoRecords[acoRecords.length - 2];

  // Peer records: same config_key, same latest perf year, different ACO
  const peerRecs = allRecords.filter(r =>
    r.perf_year === latest?.perf_year &&
    r.config_key === latest?.config_key &&
    r.aco_id !== latest?.aco_id
  );

  const savPct = peerPct => peerPct != null ? `${peerPct}th pct` : '';
  const peerAvgSav = calcPeerAvg(peerRecs, 'sav_rate');
  const savRatePct = calcPeerPct(peerRecs, 'sav_rate', latest?.sav_rate);

  onProgress?.('Building slides...');

  // ── SLIDE 1: Cover ────────────────────────────────────────────────────────
  const s1 = pres.addSlide();
  s1.background = { color: NAVY };

  s1.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:0.08, h:5.625, fill:{ color:TEAL } });

  // Deadline badge
  s1.addShape(pres.shapes.RECTANGLE, { x:7.1, y:0.28, w:2.6, h:0.42,
    fill:{ color:GOLD }, line:{ color:GOLD } });
  s1.addText("LEAD Deadline: May 17, 2026", { x:7.1, y:0.28, w:2.6, h:0.42,
    fontSize:10, bold:true, color:NAVY, fontFace:"Calibri", align:"center", margin:0 });

  s1.addText("TRYNYTY", { x:0.35, y:0.32, w:3, h:0.38,
    fontSize:20, bold:true, color:WHITE, fontFace:"Calibri", charSpacing:3, margin:0 });
  s1.addText("health:enablement", { x:0.35, y:0.68, w:3, h:0.22,
    fontSize:10, color:TEAL, fontFace:"Calibri", margin:0 });

  s1.addText("ACO REACH → LEAD", { x:0.35, y:1.3, w:9.3, h:0.55,
    fontSize:36, bold:true, color:WHITE, fontFace:"Calibri", margin:0 });
  s1.addText("Executive Intelligence Report", { x:0.35, y:1.85, w:9.3, h:0.48,
    fontSize:30, color:TEAL, fontFace:"Calibri", italic:true, margin:0 });

  // ACO name banner
  s1.addShape(pres.shapes.RECTANGLE, { x:0.35, y:2.5, w:9.3, h:0.75,
    fill:{ color:NAVY2 }, line:{ color:TEAL, width:1 } });
  s1.addText(aco.aco_name, { x:0.5, y:2.5, w:9.0, h:0.75,
    fontSize:22, bold:true, color:WHITE, fontFace:"Calibri", valign:"middle", margin:0 });

  // Config tags
  const tags = [
    latest?.risk_arrangement || '—',
    latest?.capitation || '—',
    latest?.config_key || '—',
    latest?.aco_type || '—',
    ...(latest?.enhanced_pcc === 'Yes' ? ['Enhanced PCC'] : []),
    ...(latest?.stop_loss === 'Yes' ? ['Stop Loss'] : []),
  ];
  let tx = 0.35;
  tags.forEach(tag => {
    s1.addShape(pres.shapes.RECTANGLE, { x:tx, y:3.4, w:tag.length*0.1+0.6, h:0.32,
      fill:{ color:"0A1929" }, line:{ color:TEAL, width:0.5 } });
    s1.addText(tag, { x:tx+0.05, y:3.4, w:tag.length*0.1+0.5, h:0.32,
      fontSize:10, bold:true, color:TEAL, fontFace:"Calibri", valign:"middle", margin:0 });
    tx += tag.length*0.1+0.75;
  });

  // Bottom stats
  s1.addShape(pres.shapes.RECTANGLE, { x:0.35, y:4.35, w:9.3, h:1.0,
    fill:{ color:"0A1929" }, line:{ color:"0A1929" } });

  const stats1 = [
    { v: latest?.sav_rate != null ? `${latest.sav_rate.toFixed(2)}%` : '—',
      l: `PY${latest?.perf_year} Savings Rate`,
      c: (latest?.sav_rate||0) > 0 ? TEAL : "FC8181" },
    { v: fmtM(latest?.shared_savings), l: 'Earned Savings', c: TEAL },
    { v: latest?.bene_cnt != null ? latest.bene_cnt.toLocaleString() : '—', l: 'Beneficiaries', c: WHITE },
    { v: `${acoRecords.length} of 3`, l: 'REACH Years', c: WHITE },
    { v: latest?.cisep_flag === 'Yes' ? '✓ Yes' : 'No',
      l: 'CI/SEP Status',
      c: latest?.cisep_flag === 'Yes' ? TEAL : SLATE },
  ];
  stats1.forEach((s, i) => {
    const sx = 0.55 + i * 1.85;
    s1.addText(s.v, { x:sx, y:4.43, w:1.7, h:0.42,
      fontSize:18, bold:true, color:s.c, fontFace:"Calibri", margin:0 });
    s1.addText(s.l, { x:sx, y:4.83, w:1.7, h:0.22,
      fontSize:9, color:SLATE, fontFace:"Calibri", margin:0 });
  });

  s1.addText(`Prepared by TRYNYTY health:enablement  |  Andrew@trynytyhealth.com  |  ${new Date().toLocaleDateString('en-US', {month:'long', year:'numeric'})}`, {
    x:0.35, y:5.38, w:9.3, h:0.18,
    fontSize:8, color:"4A6080", fontFace:"Calibri", margin:0 });

  // ── SLIDE 2: 3-Year Performance Trajectory ────────────────────────────────
  onProgress?.('Building performance slides...');
  const s2 = pres.addSlide();
  s2.background = { color: GRAY_50 };

  s2.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:1.05, fill:{ color:NAVY2 } });
  s2.addText("SAVINGS RATE TRAJECTORY", {
    x:0.35, y:0.1, w:9, h:0.25,
    fontSize:10, bold:true, color:TEAL, fontFace:"Calibri", charSpacing:1.5, margin:0 });
  s2.addText(`${aco.aco_name} — ${acoRecords.length}-Year Performance vs. Program & Peers`, {
    x:0.35, y:0.4, w:9, h:0.48,
    fontSize:18, bold:true, color:WHITE, fontFace:"Calibri", margin:0 });

  // Year-by-year performance cards
  acoRecords.forEach((r, i) => {
    const cx = 0.35 + i * 3.2;
    const isLatest = i === acoRecords.length - 1;
    s2.addShape(pres.shapes.RECTANGLE, { x:cx, y:1.15, w:3.0, h:1.9,
      fill:{ color:WHITE }, shadow:makeShadow(),
      line:{ color: isLatest ? TEAL : "E2E8F0", width: isLatest ? 1.5 : 0.5 } });
    s2.addShape(pres.shapes.RECTANGLE, { x:cx, y:1.15, w:0.06, h:1.9,
      fill:{ color:(r.sav_rate||0)>0?TEAL:RED }, line:{ color:(r.sav_rate||0)>0?TEAL:RED } });
    s2.addText(`PY${r.perf_year}${isLatest?' (Latest)':''}`, {
      x:cx+0.15, y:1.22, w:2.75, h:0.22,
      fontSize:10, bold:true, color:SLATE, fontFace:"Calibri", margin:0 });
    s2.addText(r.sav_rate != null ? `${r.sav_rate.toFixed(2)}%` : '—', {
      x:cx+0.15, y:1.45, w:2.75, h:0.6,
      fontSize:34, bold:true, color:(r.sav_rate||0)>0?TEAL:RED, fontFace:"Calibri", margin:0 });
    s2.addText(`Earned: ${fmtM(r.shared_savings)}`, {
      x:cx+0.15, y:2.02, w:2.75, h:0.22,
      fontSize:11, color:NAVY2, fontFace:"Calibri", margin:0 });
    s2.addText(`Quality: ${r.qual_scr != null ? r.qual_scr.toFixed(1)+'%' : '—'}  |  Benes: ${r.bene_cnt?.toLocaleString()||'—'}`, {
      x:cx+0.15, y:2.25, w:2.75, h:0.22,
      fontSize:10, color:SLATE, fontFace:"Calibri", margin:0 });
    if (isLatest) s2.addText('Latest Year', {
      x:cx+0.15, y:2.62, w:1.2, h:0.22,
      fontSize:9, bold:true, color:TEAL, fontFace:"Calibri", margin:0 });
  });

  // Peer comparison bar
  s2.addShape(pres.shapes.RECTANGLE, { x:0.35, y:3.2, w:9.3, h:1.9,
    fill:{ color:WHITE }, shadow:makeShadow(), line:{ color:"E2E8F0", width:0.5 } });
  s2.addText(`PY${latest?.perf_year} Peer Comparison — ${latest?.config_key} Configuration (${peerRecs.length} peers)`, {
    x:0.55, y:3.28, w:9, h:0.25,
    fontSize:11, bold:true, color:NAVY2, fontFace:"Calibri", margin:0 });

  const peerMetrics = [
    { l:'Savings Rate', v:latest?.sav_rate, peer:peerAvgSav,
      fmt:v=>`${v.toFixed(2)}%`, pct:savRatePct, lowerBetter:false },
    { l:'Quality Score', v:latest?.qual_scr, peer:calcPeerAvg(peerRecs,'qual_scr'),
      fmt:v=>`${v.toFixed(1)}%`, pct:calcPeerPct(peerRecs,'qual_scr',latest?.qual_scr), lowerBetter:false },
    { l:'ACR (Readmit)', v:latest?.acr_scr, peer:calcPeerAvg(peerRecs,'acr_scr'),
      fmt:v=>v.toFixed(2), pct:calcPeerPct(peerRecs,'acr_scr',latest?.acr_scr), lowerBetter:true },
    { l:'SNF Admits/1K', v:latest?.p_snf_adm, peer:calcPeerAvg(peerRecs,'p_snf_adm'),
      fmt:v=>`${v.toFixed(1)}`, pct:calcPeerPct(peerRecs,'p_snf_adm',latest?.p_snf_adm), lowerBetter:true },
    { l:'ED Visits/1K', v:latest?.p_edv_vis, peer:calcPeerAvg(peerRecs,'p_edv_vis'),
      fmt:v=>`${v.toFixed(1)}`, pct:calcPeerPct(peerRecs,'p_edv_vis',latest?.p_edv_vis), lowerBetter:true },
  ];

  peerMetrics.forEach((m, i) => {
    const mx = 0.55 + i * 1.84;
    const better = m.v != null && m.peer != null
      ? (m.lowerBetter ? m.v < m.peer : m.v > m.peer) : null;
    const col = better === true ? TEAL : better === false ? RED : NAVY2;

    s2.addText(m.l, { x:mx, y:3.6, w:1.7, h:0.2,
      fontSize:9, bold:true, color:SLATE, fontFace:"Calibri", margin:0 });
    s2.addText(m.v != null ? m.fmt(m.v) : '—', { x:mx, y:3.82, w:1.7, h:0.42,
      fontSize:22, bold:true, color:col, fontFace:"Calibri", margin:0 });
    s2.addText(m.peer != null ? `Peer avg: ${m.fmt(m.peer)}` : '', {
      x:mx, y:4.24, w:1.7, h:0.2,
      fontSize:9, color:SLATE, fontFace:"Calibri", margin:0 });
    if (m.pct != null) {
      s2.addText(`${m.pct}th pct`, { x:mx, y:4.45, w:1.7, h:0.2,
        fontSize:9, bold:true, color:col, fontFace:"Calibri", margin:0 });
    }
  });

  s2.addText(`Source: CMS ACO REACH PUF PY${latest?.perf_year}  |  Peer group: ${peerRecs.length} ${latest?.config_key} ACOs`, {
    x:0.35, y:5.38, w:9.3, h:0.18,
    fontSize:8, color:SLATE, fontFace:"Calibri", margin:0 });

  // ── SLIDE 3: Quality & Clinical Profile ───────────────────────────────────
  onProgress?.('Building quality slide...');
  const s3 = pres.addSlide();
  s3.background = { color: GRAY_50 };

  s3.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:1.05, fill:{ color:NAVY2 } });
  s3.addText("QUALITY & CLINICAL PROFILE", {
    x:0.35, y:0.1, w:9, h:0.25,
    fontSize:10, bold:true, color:TEAL, fontFace:"Calibri", charSpacing:1.5, margin:0 });
  s3.addText(`${aco.aco_name} — PY${latest?.perf_year} Quality Performance`, {
    x:0.35, y:0.4, w:9, h:0.48,
    fontSize:18, bold:true, color:WHITE, fontFace:"Calibri", margin:0 });

  // CI/SEP and HPP status cards
  [[
    { label:'CI/SEP Status', value: latest?.cisep_flag||'N/A',
      active: latest?.cisep_flag==='Yes',
      note: latest?.cisep_flag==='Yes'
        ? 'CI/SEP ACOs averaged 5.80% savings vs 1.07% for non-CI/SEP'
        : 'CI/SEP qualification strengthens LEAD readiness' },
    { label:'HPP Qualification', value: latest?.hpp_flag||'N/A',
      active: latest?.hpp_flag==='Yes',
      note: latest?.hpp_flag==='Yes'
        ? 'Top 18% of PY2023 ACOs. HPP ACOs earned 44% of all shared savings.'
        : 'HPP requires CI/SEP + above HPP threshold' },
  ]].flat().forEach((item, i) => {
    const cx = 0.35 + i * 4.8;
    const col = item.active ? TEAL : SLATE;
    s3.addShape(pres.shapes.RECTANGLE, { x:cx, y:1.15, w:4.5, h:1.3,
      fill:{ color:WHITE }, shadow:makeShadow(),
      line:{ color: item.active ? TEAL : "E2E8F0", width: item.active ? 1.5 : 0.5 } });
    s3.addText(item.label, { x:cx+0.15, y:1.22, w:4.2, h:0.22,
      fontSize:10, bold:true, color:SLATE, fontFace:"Calibri", charSpacing:0.5, margin:0 });
    s3.addText(item.value, { x:cx+0.15, y:1.45, w:4.2, h:0.48,
      fontSize:28, bold:true, color:col, fontFace:"Calibri", margin:0 });
    s3.addText(item.note, { x:cx+0.15, y:1.95, w:4.2, h:0.35,
      fontSize:10, color:SLATE, fontFace:"Calibri", margin:0 });
  });

  // Quality trend table
  s3.addShape(pres.shapes.RECTANGLE, { x:0.35, y:2.6, w:9.3, h:2.55,
    fill:{ color:WHITE }, shadow:makeShadow(), line:{ color:"E2E8F0", width:0.5 } });
  s3.addText("Quality Measures — Trend & Peer Comparison", {
    x:0.55, y:2.68, w:9, h:0.25,
    fontSize:11, bold:true, color:NAVY2, fontFace:"Calibri", margin:0 });

  const qualMetrics = [
    { l:'Total Quality Score', keys:['qual_scr'], fmt:v=>`${v.toFixed(1)}%`, peerKey:'qual_scr', lowerBetter:false },
    { l:'ACR (↓ better)', keys:['acr_scr'], fmt:v=>v.toFixed(2), peerKey:'acr_scr', lowerBetter:true },
    { l:'UAMCC (↓ better)', keys:['uamcc_scr'], fmt:v=>v.toFixed(2), peerKey:'uamcc_scr', lowerBetter:true },
    { l:'TFU (↑ better)', keys:['tfu_scr'], fmt:v=>`${v.toFixed(1)}%`, peerKey:'tfu_scr', lowerBetter:false },
  ];

  // Table header
  const hdrY = 3.0;
  s3.addText("Measure", { x:0.55, y:hdrY, w:2.5, h:0.22, fontSize:9, bold:true, color:SLATE, fontFace:"Calibri", margin:0 });
  acoRecords.forEach((r, i) => {
    s3.addText(`PY${r.perf_year}`, { x:3.15+i*1.1, y:hdrY, w:1.0, h:0.22,
      fontSize:9, bold:true, color:SLATE, fontFace:"Calibri", align:"center", margin:0 });
  });
  s3.addText("Peer Avg", { x:6.55, y:hdrY, w:1.0, h:0.22, fontSize:9, bold:true, color:SLATE, fontFace:"Calibri", align:"center", margin:0 });
  s3.addText("Pct Rank", { x:7.7, y:hdrY, w:1.2, h:0.22, fontSize:9, bold:true, color:SLATE, fontFace:"Calibri", align:"center", margin:0 });

  qualMetrics.forEach((m, ri) => {
    const ry = 3.3 + ri * 0.44;
    const bg = ri % 2 === 0 ? "F8FAFC" : WHITE;
    s3.addShape(pres.shapes.RECTANGLE, { x:0.45, y:ry, w:9.1, h:0.42,
      fill:{ color:bg }, line:{ color:"E2E8F0", width:0.3 } });
    s3.addText(m.l, { x:0.55, y:ry+0.08, w:2.5, h:0.28,
      fontSize:11, color:NAVY2, fontFace:"Calibri", margin:0 });

    acoRecords.forEach((r, ci) => {
      const val = r[m.keys[0]];
      s3.addText(val != null ? m.fmt(val) : '—', {
        x:3.15+ci*1.1, y:ry+0.08, w:1.0, h:0.28,
        fontSize:11, color:NAVY2, fontFace:"Calibri", align:"center", margin:0 });
    });

    const peer = calcPeerAvg(peerRecs, m.peerKey);
    const latVal = latest?.[m.keys[0]];
    const pct = calcPeerPct(peerRecs, m.peerKey, latVal);
    const better = latVal != null && peer != null ? (m.lowerBetter ? latVal < peer : latVal > peer) : null;
    const col = better === true ? TEAL : better === false ? RED : SLATE;

    s3.addText(peer != null ? m.fmt(peer) : '—', {
      x:6.55, y:ry+0.08, w:1.0, h:0.28,
      fontSize:11, color:SLATE, fontFace:"Calibri", align:"center", margin:0 });
    if (pct != null) {
      s3.addText(`${pct}th`, { x:7.7, y:ry+0.08, w:1.2, h:0.28,
        fontSize:11, bold:true, color:col, fontFace:"Calibri", align:"center", margin:0 });
    }
  });

  s3.addText(`Source: CMS ACO REACH PUF  |  PY2021: Pay-for-reporting (all scores = 100%)  |  PY2022: Pay-for-reporting  |  PY2023: Pay-for-performance`, {
    x:0.35, y:5.38, w:9.3, h:0.18,
    fontSize:8, color:SLATE, fontFace:"Calibri", margin:0 });

  // ── SLIDE 4: LEAD Readiness Assessment ────────────────────────────────────
  onProgress?.('Building LEAD assessment slide...');
  const s4 = pres.addSlide();
  s4.background = { color: NAVY };

  s4.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:0.08, h:5.625, fill:{ color:TEAL } });

  s4.addText("LEAD MODEL READINESS ASSESSMENT", {
    x:0.35, y:0.2, w:9.3, h:0.25,
    fontSize:10, bold:true, color:TEAL, fontFace:"Calibri", charSpacing:1.5, margin:0 });
  s4.addText(`${aco.aco_name}`, {
    x:0.35, y:0.5, w:9.3, h:0.55,
    fontSize:26, bold:true, color:WHITE, fontFace:"Calibri", margin:0 });

  // Readiness tier
  const savRate = latest?.sav_rate || 0;
  const hasCI = latest?.cisep_flag === 'Yes';
  const hasHPP = latest?.hpp_flag === 'Yes';
  const yearsCount = acoRecords.length;

  let tier, tierColor, tierDesc;
  if (hasHPP || (savRate > 8 && hasCI)) {
    tier = "LEAD Ready — Elite"; tierColor = GOLD;
    tierDesc = "Top-tier REACH performance. Maximum LEAD readiness. Strong candidate for Global/TCC with CARA.";
  } else if (savRate > 5 && hasCI) {
    tier = "LEAD Ready — Strong"; tierColor = TEAL;
    tierDesc = "Consistent savings above program average with CI/SEP. Well-positioned for LEAD transition.";
  } else if (savRate > 0 && yearsCount >= 2) {
    tier = "LEAD Ready — Developing"; tierColor = "5EEAD4";
    tierDesc = "Positive savings trajectory. LEAD's 10-year structure and stable benchmark work in your favor.";
  } else {
    tier = "LEAD — Build Foundation"; tierColor = GOLD;
    tierDesc = "LEAD offers a fresh start with better incentive structure. Now is the time to assess the path.";
  }

  s4.addShape(pres.shapes.RECTANGLE, { x:0.35, y:1.15, w:9.3, h:0.75,
    fill:{ color:"0A1929" }, line:{ color:tierColor, width:1.5 } });
  s4.addText("READINESS TIER", { x:0.55, y:1.2, w:3, h:0.22,
    fontSize:9, bold:true, color:SLATE, fontFace:"Calibri", charSpacing:1, margin:0 });
  s4.addText(tier, { x:0.55, y:1.42, w:6, h:0.35,
    fontSize:20, bold:true, color:tierColor, fontFace:"Calibri", margin:0 });
  s4.addText(tierDesc, { x:6.3, y:1.22, w:3.1, h:0.55,
    fontSize:10, color:SLATE_L, fontFace:"Calibri", margin:0 });

  // Track recommendation
  const isGlobal = latest?.risk_arrangement === 'Global';
  const isTCC = latest?.capitation === 'TCC';

  s4.addShape(pres.shapes.RECTANGLE, { x:0.35, y:2.05, w:9.3, h:1.3,
    fill:{ color:"0A1929" }, line:{ color:"1E3A5A", width:0.5 } });
  s4.addText("RECOMMENDED LEAD TRACK", { x:0.55, y:2.12, w:5, h:0.22,
    fontSize:9, bold:true, color:TEAL, fontFace:"Calibri", charSpacing:1, margin:0 });
  s4.addText(isGlobal ? "Global Track" : "Professional Track (consider upgrading to Global)", {
    x:0.55, y:2.37, w:9.0, h:0.35,
    fontSize:18, bold:true, color:WHITE, fontFace:"Calibri", margin:0 });
  s4.addText(isGlobal
    ? `As a ${latest?.config_key} ACO, you map directly to LEAD's Global track. ${isTCC ? 'Your TCC experience positions you well for CARA episode arrangements.' : 'Consider TCC in LEAD to unlock CARA episode arrangements with specialists.'}`
    : `Professional risk gives you a lower-risk entry point. With a ${savRate.toFixed(2)}% savings rate, upgrading to Global track in LEAD would significantly increase your earnings potential.`,
    { x:0.55, y:2.75, w:9.0, h:0.5,
      fontSize:11, color:SLATE_L, fontFace:"Calibri", margin:0 });

  // Key factors grid
  const factors = [
    { l:'CARA Eligibility', v: isGlobal ? '✓ Eligible' : '✗ Global track required',
      c: isGlobal ? TEAL : SLATE },
    { l:'HEBA Advantage', v:'✓ All ACOs',
      c: TEAL },
    { l:'10-Year No-Rebase', v:'✓ Full benefit',
      c: TEAL },
    { l:'Concurrent Risk Adj.', v: latest?.aco_type === 'High Needs' ? '✓ Full' : '✓ HN criteria',
      c: TEAL },
    { l:'CI/SEP → HPP Path', v: hasCI ? '✓ Eligible' : hasHPP ? '✓ Qualified' : 'Work toward CI/SEP',
      c: hasCI || hasHPP ? TEAL : GOLD },
  ];

  factors.forEach((f, i) => {
    const fx = 0.35 + i * 1.88;
    s4.addShape(pres.shapes.RECTANGLE, { x:fx, y:3.5, w:1.78, h:1.05,
      fill:{ color:"061020" }, line:{ color:"1E3A5A", width:0.5 } });
    s4.addText(f.l, { x:fx+0.1, y:3.57, w:1.58, h:0.28,
      fontSize:9, bold:true, color:SLATE, fontFace:"Calibri", margin:0 });
    s4.addText(f.v, { x:fx+0.1, y:3.88, w:1.58, h:0.42,
      fontSize:11, bold:true, color:f.c, fontFace:"Calibri", margin:0 });
  });

  s4.addText("Application deadline: May 17, 2026  |  LEAD Model launches: January 1, 2027", {
    x:0.35, y:5.38, w:9.3, h:0.18,
    fontSize:8, color:"4A6080", fontFace:"Calibri", margin:0 });

  // ── SLIDE 5: The Ask ───────────────────────────────────────────────────────
  onProgress?.('Building final slide...');
  const s5 = pres.addSlide();
  s5.background = { color: NAVY };

  s5.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:0.08, h:5.625, fill:{ color:TEAL } });

  s5.addText("TRYNYTY", { x:0.35, y:0.28, w:4, h:0.42,
    fontSize:24, bold:true, color:WHITE, fontFace:"Calibri", charSpacing:3, margin:0 });
  s5.addText("health:enablement", { x:0.35, y:0.68, w:4, h:0.25,
    fontSize:12, color:TEAL, fontFace:"Calibri", margin:0 });

  s5.addText("What this data means for your LEAD strategy\nis exactly what we should talk about.", {
    x:0.35, y:1.15, w:5.2, h:1.1,
    fontSize:18, bold:true, color:WHITE, fontFace:"Calibri", margin:0 });

  s5.addText("HOW WE CAN HELP", { x:0.35, y:2.4, w:5, h:0.22,
    fontSize:9, bold:true, color:TEAL, fontFace:"Calibri", charSpacing:1.5, margin:0 });
  [
    "LEAD application strategy & track selection",
    "Financial modeling specific to your configuration",
    "Benchmark & risk score optimization",
    "Custom analytics & performance dashboards",
    "Ongoing VBC program management",
  ].forEach((svc, i) => {
    s5.addShape(pres.shapes.RECTANGLE, { x:0.35, y:2.7+i*0.38, w:0.06, h:0.06,
      fill:{ color:TEAL }, line:{ color:TEAL } });
    s5.addText(svc, { x:0.5, y:2.63+i*0.38, w:4.7, h:0.32,
      fontSize:11, color:SLATE_L, fontFace:"Calibri", margin:0 });
  });

  // CTA box
  s5.addShape(pres.shapes.RECTANGLE, { x:5.8, y:0.28, w:3.85, h:5.05,
    fill:{ color:"0A1929" }, line:{ color:TEAL, width:1 } });

  s5.addText("Ready to talk?", { x:6.0, y:0.52, w:3.45, h:0.48,
    fontSize:22, bold:true, color:WHITE, fontFace:"Calibri", margin:0 });
  s5.addText(`Based on ${aco.aco_name}'s ${savRate.toFixed(2)}% savings rate and ${yearsCount} years of REACH experience, let's discuss what LEAD means for your organization.`, {
    x:6.0, y:1.08, w:3.45, h:1.0,
    fontSize:11, color:SLATE_L, fontFace:"Calibri", margin:0 });

  s5.addShape(pres.shapes.RECTANGLE, { x:6.0, y:2.25, w:3.45, h:0.52,
    fill:{ color:TEAL }, line:{ color:TEAL } });
  s5.addText("Schedule a Conversation →", { x:6.0, y:2.25, w:3.45, h:0.52,
    fontSize:13, bold:true, color:NAVY, fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
  s5.addText("trynytyhealth.com/contact", { x:6.0, y:2.85, w:3.45, h:0.25,
    fontSize:11, color:TEAL, fontFace:"Calibri", align:"center", margin:0 });

  s5.addShape(pres.shapes.LINE, { x:6.0, y:3.28, w:3.45, h:0,
    line:{ color:"1E3A5A", width:0.5 } });

  s5.addText("Or explore your data in the free tool:", { x:6.0, y:3.4, w:3.45, h:0.25,
    fontSize:11, color:SLATE, fontFace:"Calibri", margin:0 });
  s5.addShape(pres.shapes.RECTANGLE, { x:6.0, y:3.72, w:3.45, h:0.48,
    fill:{ color:"1E3A5A" }, line:{ color:TEAL, width:0.5 } });
  s5.addText("ACO REACH → LEAD Explorer →", { x:6.0, y:3.72, w:3.45, h:0.48,
    fontSize:11, bold:true, color:TEAL, fontFace:"Calibri", align:"center", valign:"middle", margin:0 });
  s5.addText("reachpuf.trynytyhealth.com", { x:6.0, y:4.28, w:3.45, h:0.22,
    fontSize:10, color:SLATE, fontFace:"Calibri", align:"center", margin:0 });
  s5.addText("Andrew@trynytyhealth.com  |  Chicago, IL", {
    x:6.0, y:4.68, w:3.45, h:0.22,
    fontSize:9, color:"4A6080", fontFace:"Calibri", align:"center", margin:0 });

  s5.addShape(pres.shapes.RECTANGLE, { x:0, y:5.4, w:10, h:0.225,
    fill:{ color:"061020" }, line:{ color:"061020" } });
  s5.addText("© 2026 TRYNYTY health:enablement  |  Analysis based on CMS ACO REACH Public Use Files  |  Free for educational use", {
    x:0.35, y:5.42, w:9.3, h:0.18,
    fontSize:7, color:"4A6080", fontFace:"Calibri", margin:0 });

  // ── Write file ────────────────────────────────────────────────────────────
  onProgress?.('Generating file...');
  const safeName = aco.aco_name.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  await pres.writeFile({ fileName: `TRYNYTY_LEAD_Report_${safeName}.pptx` });
  onProgress?.(null); // clear
}
