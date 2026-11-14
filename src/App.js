import React, { useState, useEffect, useCallback } from 'react';
import ProgramOverview from './components/ProgramOverview';
import ACODeepDive from './components/ACODeepDive';
import ProgramChanges from './components/ProgramChanges';
import Glossary from './components/Glossary';
import acoList from './data/reach_aco_list.json';

const NAV = [
  { id: 'overview', label: 'Program Overview', section: 'Analysis' },
  { id: 'aco',      label: 'ACO Deep Dive',    section: 'Analysis' },
  { id: 'changes',  label: 'Program Changes',  section: 'Reference' },
  { id: 'glossary', label: 'Glossary & Terms', section: 'Reference' },
];
const PAGE_TITLES = Object.fromEntries(NAV.map(n => [n.id, n.label]));
const ACO_BY_ID = Object.fromEntries(acoList.map(a => [a.aco_id, a]));

// Hash routes: #overview, #aco, #aco/D0116, #changes, #glossary
function parseHash() {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  const [page, id] = h.split('/');
  return { page: PAGE_TITLES[page] ? page : 'overview', acoId: page === 'aco' && id ? decodeURIComponent(id) : null };
}

function Brand() {
  return (
    <a className="sidebar-brand" href="https://www.trynytyhealth.com/tools" title="TRYNYTY health:enablement">
      <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="" />
      <span className="brand-word">TRYNYTY<span className="t2">health<b>:enablement</b></span></span>
    </a>
  );
}

export default function App() {
  const [page, setPageState]                = useState(() => parseHash().page);
  const [perfData, setPerfData]             = useState(null);
  const [loading, setLoading]               = useState(true);
  const [deepDiveACO, setDeepDiveACO]       = useState(null);
  const [deepDiveVersion, setDeepDiveVersion] = useState(0);
  const [pinnedACO, setPinnedACO]           = useState(null);
  const [drawerOpen, setDrawerOpen]         = useState(false);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/reach_performance.json`)
      .then(r => r.json())
      .then(d => { setPerfData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const setPage = useCallback((p, acoId = null) => {
    const target = acoId ? `#aco/${encodeURIComponent(acoId)}` : `#${p}`;
    if (window.location.hash !== target) window.location.hash = target;
    setPageState(p);
  }, []);

  useEffect(() => {
    const apply = () => {
      const { page: p, acoId } = parseHash();
      setPageState(p);
      if (acoId && ACO_BY_ID[acoId]) { setDeepDiveACO(ACO_BY_ID[acoId]); setDeepDiveVersion(v => v + 1); }
      document.title = `${PAGE_TITLES[p]}${acoId && ACO_BY_ID[acoId] ? ': ' + ACO_BY_ID[acoId].aco_name : ''} | ACO REACH Explorer | TRYNYTY health:enablement`;
      if (typeof window.gtag === 'function') window.gtag('event', 'page_view', { page_title: PAGE_TITLES[p], page_location: window.location.href });
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const navigateToACO = (aco) => {
    setDeepDiveACO(aco);
    setDeepDiveVersion(v => v + 1);
    setPage('aco', aco?.aco_id);
  };

  const pinACO = (aco) => setPinnedACO(aco);
  const unpinACO = () => setPinnedACO(null);

  const years = perfData?.years || [];
  const yearSpan = years.length ? `PY ${years[0]} to ${years[years.length - 1]}` : '';
  const sections = [...new Set(NAV.map(n => n.section))];

  const navList = (
    <nav className="sidebar-nav">
      {sections.map(section => (
        <div key={section}>
          <div className="nav-section-label">{section}</div>
          {NAV.filter(n => n.section === section).map(item => (
            <button key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setDrawerOpen(false); }}>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-app">ACO REACH Explorer</div>
        {navList}
        <div className="sidebar-footer">
          Data: CMS ACO REACH Financial and Quality Results public use files<br />
          {yearSpan} &nbsp;|&nbsp; {perfData?.total || 0} ACO performance records
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            Source: CMS Innovation Center<br />
            <a href="#changes">Program history and data sources</a>
          </div>
        </div>
      </aside>

      <div className={`mobile-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <Brand />
        <div className="sidebar-app">ACO REACH Explorer</div>
        {navList}
      </div>

      <div className="main-area">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <button className="hamburger-btn" onClick={() => setDrawerOpen(o => !o)} aria-label="Menu"
              style={{ display: 'none', flexDirection: 'column', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
              <span style={{ display: 'block', width: 20, height: 2, background: 'var(--gray-600)', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 20, height: 2, background: 'var(--gray-600)', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 20, height: 2, background: 'var(--gray-600)', borderRadius: 2 }} />
            </button>
            <div className="topbar-title">{PAGE_TITLES[page]}</div>
          </div>
          <div className="topbar-links">
            {yearSpan && <span className="topbar-badge">{yearSpan}</span>}
            <a href="https://mssppuf.trynytyhealth.com" target="_blank" rel="noreferrer">MSSP ACO Explorer</a>
            <a href="https://www.trynytyhealth.com/tools">More TRYNYTY tools</a>
          </div>
        </div>

        {pinnedACO && (
          <div className="pinned-aco-banner">
            <div>
              <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{pinnedACO.aco_name || pinnedACO.aco_id}</span>
              <span style={{ color: 'var(--gray-400)', margin: '0 8px' }}>·</span>
              <span style={{ color: 'var(--gray-600)', fontSize: 12 }}>Pinned ACO</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => navigateToACO(pinnedACO)}
                style={{ padding: '4px 12px', borderRadius: 'var(--radius)', border: '1.5px solid var(--teal)',
                  background: 'white', color: 'var(--teal-dark)', fontSize: 12, fontWeight: 600 }}>
                View Deep Dive
              </button>
              <button onClick={unpinACO}
                style={{ padding: '4px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-300)',
                  background: 'white', color: 'var(--gray-500)', fontSize: 12 }}>
                Unpin
              </button>
            </div>
          </div>
        )}

        <div className="page-content">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-500)' }}>Loading dataset…</div>
          ) : (
            <>
              {page === 'overview' && <ProgramOverview perfData={perfData} navigateToACO={navigateToACO} pinnedACO={pinnedACO} />}
              {page === 'aco' && (
                <ACODeepDive perfData={perfData} initialACO={deepDiveACO}
                  initialVersion={deepDiveVersion} pinnedACO={pinnedACO}
                  pinACO={pinACO} unpinACO={unpinACO} />
              )}
              {page === 'changes'  && <ProgramChanges />}
              {page === 'glossary' && <Glossary />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
