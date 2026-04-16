import React, { useState, useEffect } from 'react';
import ProgramOverview from './components/ProgramOverview';
import ACODeepDive from './components/ACODeepDive';
import LEADTransition from './components/LEADTransition';
import ProgramChanges from './components/ProgramChanges';
import Glossary from './components/Glossary';

const NAV = [
  { id: 'overview', label: 'Program Overview', icon: '📈', section: 'Analysis' },
  { id: 'aco',      label: 'ACO Deep Dive',   icon: '🏥', section: 'Analysis' },
  { id: 'lead',     label: 'LEAD Transition',  icon: '🚀', section: 'Analysis' },
  { id: 'changes',  label: 'Program Changes',  icon: '📋', section: 'Reference' },
  { id: 'glossary', label: 'Glossary & Terms', icon: '📖', section: 'Reference' },
];

const PAGE_TITLES = {
  overview: 'Program Overview',
  aco:      'ACO Deep Dive',
  lead:     'LEAD Model Transition',
  changes:  'Program Changes',
  glossary: 'Glossary & Terms',
};

export default function App() {
  const [page, setPage]                   = useState('overview');
  const [perfData, setPerfData]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [deepDiveACO, setDeepDiveACO]     = useState(null);
  const [deepDiveVersion, setDeepDiveVersion] = useState(0);
  const [pinnedACO, setPinnedACO]         = useState(null);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/reach_performance.json`)
      .then(r => r.json())
      .then(d => { setPerfData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const navigateToACO = (aco) => {
    setDeepDiveACO(aco);
    setDeepDiveVersion(v => v + 1);
    setPage('aco');
  };

  const pinACO = (aco) => setPinnedACO(aco);
  const unpinACO = () => setPinnedACO(null);

  const goToLEAD = () => setPage('lead');

  const sections = [...new Set(NAV.map(n => n.section))];
  const totalACOYears = perfData?.total || 284;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">TRYNYTY</div>
          <div style={{ fontSize: '0.78rem', fontWeight: 400, marginTop: 2 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>health</span>
            <span style={{ color: '#0070C0' }}>:enablement</span>
          </div>
          <div className="sidebar-brand-sub" style={{ marginTop: 8 }}>
            ACO REACH → LEAD<br />Explorer
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {NAV.filter(n => n.section === section).map(item => (
                <button key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Pinned ACO indicator */}
        {pinnedACO && (
          <div style={{ margin: '0 10px 12px', padding: '10px 12px',
            background: 'rgba(221,170,102,0.15)', borderRadius: 'var(--radius)',
            border: '1px solid rgba(221,170,102,0.3)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              📌 Pinned ACO
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'white',
              lineHeight: 1.3, marginBottom: 6 }}>
              {pinnedACO.aco_name}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { navigateToACO(pinnedACO); }}
                style={{ flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 600,
                  background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                Deep Dive
              </button>
              <button onClick={goToLEAD}
                style={{ flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 600,
                  background: 'rgba(221,170,102,0.2)', color: 'var(--gold)', borderRadius: 4,
                  border: '1px solid rgba(221,170,102,0.3)', cursor: 'pointer' }}>
                LEAD →
              </button>
              <button onClick={unpinACO}
                style={{ padding: '4px 8px', fontSize: 10, color: 'rgba(255,255,255,0.4)',
                  background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          Data: CMS ACO REACH PUF<br />
          PY 2021 – 2023 &nbsp;|&nbsp; {totalACOYears} ACO-years
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
            Source: CMS Innovation Center<br />
            PY 2024 data pending release
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <a href="https://mssppuf.trynytyhealth.com" target="_blank" rel="noreferrer"
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textDecoration: 'none' }}>
              ← MSSP ACO Explorer
            </a>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="topbar-title">{PAGE_TITLES[page]}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {pinnedACO && (
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600,
                padding: '3px 10px', borderRadius: 20, background: 'var(--amber-light)',
                border: '1px solid rgba(212,134,10,0.25)' }}>
                📌 {pinnedACO.aco_id}
              </span>
            )}
            <span className="topbar-badge">PY 2021 – 2023</span>
            <a href="https://trynytyhealth.com/post-lead-model" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--teal-dark)', fontWeight: 700,
                padding: '3px 10px', borderRadius: 20, background: 'var(--teal-light)',
                border: '1px solid rgba(46,148,120,0.25)', textDecoration: 'none' }}>
              LEAD deadline: May 17 →
            </a>
          </div>
        </div>

        <div className="page-content">
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⟳</div>
              Loading dataset…
            </div>
          ) : (
            <>
              {page === 'overview' && (
                <ProgramOverview perfData={perfData} navigateToACO={navigateToACO} pinnedACO={pinnedACO} />
              )}
              {page === 'aco' && (
                <ACODeepDive perfData={perfData} initialACO={deepDiveACO}
                  initialVersion={deepDiveVersion} pinnedACO={pinnedACO}
                  pinACO={pinACO} unpinACO={unpinACO} goToLEAD={goToLEAD} />
              )}
              {page === 'lead' && (
                <LEADTransition perfData={perfData} pinnedACO={pinnedACO}
                  navigateToACO={navigateToACO} pinACO={pinACO} />
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
