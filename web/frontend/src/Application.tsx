import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './application.css'

type IconName = 'arrow' | 'book' | 'check' | 'close' | 'code' | 'external' | 'github' | 'menu' | 'radar' | 'search'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    code: <><path d="m9 18-6-6 6-6M15 6l6 6-6 6" /></>,
    external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
    github: <><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.36-1.18-3.36-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.54 9.54 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.56 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="m12 12 6.4-6.4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  }

  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

type Finding = {
  id: string
  title: string
  authors: string
  publishedAt: string
  arxivId: string
  paperUrl: string
  type: 'Potential improvement' | 'New technique'
  strength: 'Strong match' | 'Worth reviewing'
  summary: string
  whyRelevant: string
  files: string[]
  suggestedAction: string
}

const findings: Finding[] = [
  {
    id: 'rag-2005-11401',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: 'Patrick Lewis et al.',
    publishedAt: '22 May 2020',
    arxivId: 'arXiv:2005.11401',
    paperUrl: 'https://arxiv.org/abs/2005.11401',
    type: 'Potential improvement',
    strength: 'Strong match',
    summary: 'The paper combines a language model with retrieved external passages and reports gains on knowledge-intensive tasks.',
    whyRelevant: 'Relevance plans to ground code-specific recommendations in repository context and paper records. The retrieval pattern described here is directly relevant to that planned evidence flow.',
    files: ['brief.md'],
    suggestedAction: 'Use a small held-out set of repository questions to compare grounded answers with and without retrieved project context.',
  },
  {
    id: 'swe-bench-2310-06770',
    title: 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?',
    authors: 'Carlos E. Jimenez et al.',
    publishedAt: '10 October 2023',
    arxivId: 'arXiv:2310.06770',
    paperUrl: 'https://arxiv.org/abs/2310.06770',
    type: 'New technique',
    strength: 'Worth reviewing',
    summary: 'The paper introduces a benchmark built from real GitHub issues and repository snapshots to evaluate code changes.',
    whyRelevant: 'Relevance needs a credible way to evaluate whether a paper-to-code recommendation leads to a useful change. The benchmark structure offers a reference for building repeatable repository-level checks.',
    files: ['brief.md', 'README.md'],
    suggestedAction: 'Define one repository task with a known expected change and use it as the first repeatable evaluation case for generated findings.',
  },
]

const scanStages = ['Reading repository', 'Finding papers', 'Evaluating matches'] as const

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

function Application() {
  const [selectedId, setSelectedId] = useState(findings[0].id)
  const [query, setQuery] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scanStage, setScanStage] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState('Demo data loaded')
  const scanRun = useRef(0)

  useEffect(() => {
    function closeOverlays(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDetailOpen(false)
        setMobileNavOpen(false)
      }
    }

    window.addEventListener('keydown', closeOverlays)
    return () => {
      scanRun.current += 1
      window.removeEventListener('keydown', closeOverlays)
    }
  }, [])

  const visibleFindings = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    if (!normalisedQuery) return findings
    return findings.filter((finding) => `${finding.title} ${finding.authors} ${finding.arxivId} ${finding.whyRelevant}`.toLowerCase().includes(normalisedQuery))
  }, [query])

  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0]
  const scanning = scanStage !== null

  function selectFinding(id: string) {
    setSelectedId(id)
    setDetailOpen(true)
  }

  async function runDemoScan() {
    if (scanning) return
    const run = scanRun.current + 1
    scanRun.current = run
    for (const stage of scanStages) {
      if (scanRun.current !== run) return
      setScanStage(stage)
      await wait(650)
    }
    if (scanRun.current !== run) return
    setScanStage(null)
    setLastScan(`Sample scan completed at ${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date())}`)
  }

  return (
    <div className={`application ${detailOpen ? 'detail-is-open' : ''} ${mobileNavOpen ? 'nav-is-open' : ''}`}>
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span /></span><span>Relevance</span></div>
        <div className="repository-context">
          <span className="context-label">Repository</span>
          <div><Icon name="github" size={17} /><strong>brimell/SweetHomeAlabama256</strong></div>
          <span className="branch-name">web-dev</span>
        </div>
        <nav>
          <a className="nav-item active" href="#discoveries" onClick={() => setMobileNavOpen(false)}><Icon name="book" /><span>Discoveries</span><em>{findings.length}</em></a>
        </nav>
        <div className="demo-note"><span>Demo workspace</span><p>Findings are prepared examples. The research backend is not connected yet.</p></div>
      </aside>

      <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />

      <header className="topbar">
        <button className="menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
        <div className="mobile-brand">Relevance</div>
        <div className="topbar-repository"><strong>brimell/SweetHomeAlabama256</strong><span>{lastScan}</span></div>
        <button className="scan-button" type="button" onClick={runDemoScan} disabled={scanning}>
          {scanning ? <span className="spinner" aria-hidden="true" /> : <Icon name="radar" size={17} />}
          {scanning ? 'Scanning…' : 'Run sample scan'}
        </button>
      </header>

      <main className="workspace" id="discoveries">
        <section className="finding-pane" aria-labelledby="discoveries-title">
          <header className="page-header">
            <div><p className="eyebrow">Research workbench</p><h1 id="discoveries-title">Discoveries</h1><p>Paper-to-code findings for the selected repository.</p></div>
            <div className="finding-count"><strong>{visibleFindings.length}</strong><span>{visibleFindings.length === 1 ? 'finding' : 'findings'}</span></div>
          </header>

          {scanning && <div className="scan-status" role="status" aria-live="polite">
            <div className="scan-status-copy"><span className="spinner" aria-hidden="true" /><strong>{scanStage}</strong><span>Sample scan in progress</span></div>
            <ol aria-label="Scan progress">{scanStages.map((stage) => <li key={stage} className={stage === scanStage ? 'current' : ''}>{stage}</li>)}</ol>
          </div>}

          <div className="list-toolbar">
            <label className="search-field"><span className="sr-only">Search discoveries</span><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search findings" /></label>
            <span>Prepared examples</span>
          </div>

          <div className="finding-list">
            {visibleFindings.length > 0 ? visibleFindings.map((finding) => <article className={`finding-row ${selected.id === finding.id ? 'selected' : ''}`} key={finding.id}>
              <button className="finding-select" onClick={() => selectFinding(finding.id)} aria-label={`View evidence for ${finding.title}`}>
                <div className="finding-heading"><span className="finding-type">{finding.type}</span><span className={`strength ${finding.strength === 'Strong match' ? 'strong' : ''}`}><Icon name="check" size={13} />{finding.strength}</span></div>
                <h2>{finding.title}</h2>
                <p className="paper-meta">{finding.authors} · {finding.publishedAt} · <span>{finding.arxivId}</span></p>
                <p className="why-relevant">{finding.whyRelevant}</p>
                <div className="file-list" aria-label="Affected files">{finding.files.map((file) => <code key={file}><Icon name="code" size={14} />{file}</code>)}</div>
                <span className="view-evidence">View evidence <Icon name="arrow" size={15} /></span>
              </button>
            </article>) : <div className="empty-state"><Icon name="search" size={24} /><h2>No findings match “{query}”</h2><p>Clear the search to return to all sample findings.</p><button onClick={() => setQuery('')}>Clear search</button></div>}
          </div>
        </section>

        <aside className="detail-pane" aria-label="Finding evidence">
          <div className="detail-mobile-header"><button onClick={() => setDetailOpen(false)}><Icon name="arrow" size={16} />Back to discoveries</button><button className="icon-button" onClick={() => setDetailOpen(false)} aria-label="Close evidence"><Icon name="close" /></button></div>
          <div className="detail-scroll">
            <header className="detail-header"><span className="finding-type">{selected.type}</span><h2>{selected.title}</h2><p>{selected.authors} · {selected.arxivId}</p><a href={selected.paperUrl} target="_blank" rel="noreferrer">Open paper <Icon name="external" size={15} /></a></header>
            <section><h3>Summary</h3><p>{selected.summary}</p></section>
            <section><div className="section-heading"><h3>Why Relevance flagged it</h3><span>Possible application</span></div><p>{selected.whyRelevant}</p></section>
            <section><h3>Evidence</h3><dl>
              <div><dt>Source</dt><dd><a href={selected.paperUrl} target="_blank" rel="noreferrer">{selected.arxivId}<Icon name="external" size={13} /></a></dd></div>
              <div><dt>Repository evidence</dt><dd>{selected.files.map((file) => <code key={file}>{file}</code>)}</dd></div>
              <div><dt>Publication status</dt><dd>Not published to GitHub</dd></div>
            </dl></section>
            <section className="experiment"><div className="section-heading"><h3>Suggested experiment</h3><span>Needs verification</span></div><p>{selected.suggestedAction}</p></section>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default Application
