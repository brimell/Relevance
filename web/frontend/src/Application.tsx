import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import './application.css'

type IconName =
  | 'activity'
  | 'arrow'
  | 'bookmark'
  | 'book'
  | 'check'
  | 'chevron'
  | 'clock'
  | 'close'
  | 'code'
  | 'external'
  | 'filter'
  | 'folder'
  | 'github'
  | 'menu'
  | 'plus'
  | 'radar'
  | 'search'
  | 'settings'

type Page = 'overview' | 'discoveries' | 'repositories'
type FindingType = 'Potential improvement' | 'Contradictory finding' | 'New technique'
type Priority = 'High' | 'Medium'
type FindingStatus = 'new' | 'saved' | 'dismissed'
type StatusFilter = 'active' | 'all' | FindingStatus

type Finding = {
  id: string
  insight: string
  title: string
  authors: string
  publishedAt: string
  publishedYear: number
  arxivId: string
  paperUrl: string
  type: FindingType
  priority: Priority
  strength: 'Strong match' | 'Worth reviewing'
  summary: string
  whyRelevant: string
  evidence: string
  evidenceContext: string
  code: {
    path: string
    reference: string
    lines: string[]
  }
  suggestedAction: string
  investigation: string
}

type ActivityStep = {
  label: string
  result: string
  detail: string
  icon: IconName
}

const repositoryName = 'brimell/SweetHomeAlabama256'
const repositoryUrl = `https://github.com/${repositoryName}`

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    activity: <><path d="M4 12h3l2-6 4 12 2-6h5" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    bookmark: <><path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4Z" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    code: <><path d="m9 18-6-6 6-6M15 6l6 6-6 6" /></>,
    external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4" /></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>,
    github: <><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.36-1.18-3.36-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.54 9.54 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.56 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="m12 12 6.4-6.4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.35.73.6 1 .3.28.68.42 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7.6Z" /></>,
  }

  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const findings: Finding[] = [
  {
    id: 'rag-2005-11401',
    insight: 'Your findings API should return its evidence, not only scan state',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: 'Patrick Lewis et al.',
    publishedAt: '22 May 2020',
    publishedYear: 2020,
    arxivId: 'arXiv:2005.11401',
    paperUrl: 'https://arxiv.org/abs/2005.11401',
    type: 'Potential improvement',
    priority: 'High',
    strength: 'Strong match',
    summary: 'The paper combines a parametric language model with retrieved, non-parametric passages and evaluates the resulting grounded generation system on knowledge-intensive tasks.',
    whyRelevant: 'The local server currently exposes health state but no response shape that keeps a recommendation, paper source and repository evidence together. The planned finding contract already calls for that provenance.',
    evidence: '“RAG models generate more specific, diverse and factual language than a state-of-the-art parametric-only seq2seq baseline.”',
    evidenceContext: 'Claim reported in the paper abstract; it does not establish performance for this repository.',
    code: {
      path: 'web/backend/src/index.ts',
      reference: 'lines 25–31',
      lines: [
        "app.get('/api/health', (_request, response) => {",
        '  response.status(200).json({',
        "    status: 'ok',",
        "    service: 'relevance-web',",
        '    timestamp: new Date().toISOString(),',
        '  })',
        '})',
      ],
    },
    suggestedAction: 'Add a GET findings endpoint whose response includes the paper URL, attributed claim, affected path and the repository excerpt used by the evaluator.',
    investigation: 'The paper supports retrieving external passages during generation. For this repository, the testable implication is narrower: compare answers produced from the finding text alone with answers that must cite both the paper record and the stored repository excerpt.',
  },
  {
    id: 'lost-middle-2307-03172',
    insight: 'A repository-wide prompt may bury the code that matters',
    title: 'Lost in the Middle: How Language Models Use Long Contexts',
    authors: 'Nelson F. Liu et al.',
    publishedAt: '6 July 2023',
    publishedYear: 2023,
    arxivId: 'arXiv:2307.03172',
    paperUrl: 'https://arxiv.org/abs/2307.03172',
    type: 'Contradictory finding',
    priority: 'High',
    strength: 'Strong match',
    summary: 'The paper studies how language models use information placed at different positions in long inputs and reports substantial sensitivity to where relevant evidence appears.',
    whyRelevant: 'The project plan moves from repository files to one structured project profile. If too much unranked source is supplied at once, relevant implementation details may be underused even when they fit within the context window.',
    evidence: '“Performance is often highest when relevant information occurs at the beginning or end of the input context, and significantly degrades when models must access relevant information in the middle of long contexts.”',
    evidenceContext: 'Finding reported in the paper abstract across the authors’ multi-document QA and key-value retrieval evaluations.',
    code: {
      path: 'brief.md',
      reference: 'lines 45–50',
      lines: [
        'The developer installs the Relevance GitHub App.',
        'The backend retrieves README and relevant source files.',
        'AI constructs a structured profile of the project.',
        'The research engine ingests new papers.',
        'Semantic matching shortlists potentially useful papers.',
      ],
    },
    suggestedAction: 'Evaluate profile quality with the same critical file placed first, middle and last; then retrieve and rank small excerpts before asking the model to reason over them.',
    investigation: 'The paper challenges the assumption that a larger context automatically makes every included file equally usable. It does not show that this repository currently fails; a position-sensitivity test would verify whether the concern applies.',
  },
  {
    id: 'swe-bench-2310-06770',
    insight: 'Turn each recommendation into a repeatable repository-level task',
    title: 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?',
    authors: 'Carlos E. Jimenez et al.',
    publishedAt: '10 October 2023',
    publishedYear: 2023,
    arxivId: 'arXiv:2310.06770',
    paperUrl: 'https://arxiv.org/abs/2310.06770',
    type: 'New technique',
    priority: 'Medium',
    strength: 'Worth reviewing',
    summary: 'The paper introduces a benchmark built from real GitHub issues and repository snapshots, with evaluation based on whether a proposed change resolves the associated tests.',
    whyRelevant: 'The sample scan demonstrates lifecycle state, but it does not yet prove that a recommendation leads to a useful code change. A repository-level task and expected check would make a finding falsifiable.',
    evidence: '“SWE-bench requires models to resolve real-world GitHub issues.”',
    evidenceContext: 'Task definition from the paper abstract; benchmark results should not be treated as expected performance for Relevance.',
    code: {
      path: 'web/frontend/src/Application.tsx',
      reference: 'runSampleScan()',
      lines: [
        'for (const stage of scanStages) {',
        '  setScanStage(stage)',
        '  await wait(650)',
        '}',
        "setLastScan('Sample scan completed')",
      ],
    },
    suggestedAction: 'Attach one expected repository change and one executable check to each high-priority finding before it is eligible for GitHub publication.',
    investigation: 'SWE-bench provides a useful evaluation shape—repository snapshot, issue and tests—not a drop-in metric. Start with one curated finding and record whether a developer can reproduce the suggested change and validation.',
  },
]

const activity: ActivityStep[] = [
  { label: 'Repository analysed', result: '26 files read', detail: 'README, brief and web workspace profiled', icon: 'code' },
  { label: 'Papers examined', result: '37 candidates', detail: 'cs.AI, cs.CL and cs.LG sources checked', icon: 'book' },
  { label: 'Candidates shortlisted', result: '4 papers', detail: 'Repository fit evaluated against source evidence', icon: 'filter' },
  { label: 'Findings produced', result: '2 findings', detail: 'One low-evidence candidate omitted', icon: 'activity' },
  { label: 'GitHub publication', result: '1 issue draft', detail: 'Publication simulated in this demo workspace', icon: 'github' },
]

const scanStages = ['Reading repository', 'Finding papers', 'Evaluating matches', 'Preparing publication'] as const

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

function sourceUrl(finding: Finding) {
  return `${repositoryUrl}/blob/web-dev/${finding.code.path}`
}

function githubIssueUrl(finding: Finding) {
  const title = `[Relevance] ${finding.insight}`
  const body = [
    `## ${finding.insight}`,
    '',
    `**Finding type:** ${finding.type}`,
    `**Affected code:** \`${finding.code.path}\` (${finding.code.reference})`,
    '',
    finding.whyRelevant,
    '',
    `**Suggested experiment:** ${finding.suggestedAction}`,
    '',
    `**Source:** [${finding.title}](${finding.paperUrl}) (${finding.arxivId})`,
    '',
    '_Drafted from the Relevance demo workspace. Review the evidence before publishing._',
  ].join('\n')
  return `${repositoryUrl}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

function Application() {
  const [page, setPage] = useState<Page>('overview')
  const [selectedId, setSelectedId] = useState(findings[0].id)
  const [query, setQuery] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scanStage, setScanStage] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState('Autonomous demo run · 18 minutes ago')
  const [typeFilter, setTypeFilter] = useState<'all' | FindingType>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '2023' | '2020'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [statuses, setStatuses] = useState<Record<string, FindingStatus>>(() => Object.fromEntries(findings.map((finding) => [finding.id, 'new'])))
  const [investigating, setInvestigating] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [monitoringEnabled, setMonitoringEnabled] = useState(true)
  const [scanInterval, setScanInterval] = useState('12 hours')
  const [threshold, setThreshold] = useState('Strong matches only')
  const [publishingEnabled, setPublishingEnabled] = useState(false)
  const [topics, setTopics] = useState({ 'cs.AI': true, 'cs.CL': true, 'cs.LG': true })
  const [repositoryInput, setRepositoryInput] = useState('')
  const [connectedRepositories, setConnectedRepositories] = useState([repositoryName])
  const scanRun = useRef(0)
  const toastTimer = useRef<number | null>(null)

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
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
      window.removeEventListener('keydown', closeOverlays)
    }
  }, [])

  const visibleFindings = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    return findings.filter((finding) => {
      const status = statuses[finding.id]
      const matchesQuery = !normalisedQuery || `${finding.insight} ${finding.title} ${finding.authors} ${finding.arxivId} ${finding.whyRelevant} ${finding.code.path}`.toLowerCase().includes(normalisedQuery)
      const matchesType = typeFilter === 'all' || finding.type === typeFilter
      const matchesPriority = priorityFilter === 'all' || finding.priority === priorityFilter
      const matchesDate = dateFilter === 'all' || (dateFilter === '2023' ? finding.publishedYear >= 2023 : finding.publishedYear >= 2020)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? status !== 'dismissed' : status === statusFilter)
      return matchesQuery && matchesType && matchesPriority && matchesDate && matchesStatus
    })
  }, [dateFilter, priorityFilter, query, statusFilter, statuses, typeFilter])

  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0]
  const scanning = scanStage !== null
  const activeFilterCount = [typeFilter, priorityFilter, dateFilter].filter((value) => value !== 'all').length + (statusFilter !== 'active' ? 1 : 0)

  function notify(message: string) {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }

  function navigate(nextPage: Page) {
    setPage(nextPage)
    setMobileNavOpen(false)
    if (nextPage !== 'discoveries') setDetailOpen(false)
  }

  function selectFinding(id: string, investigate = false) {
    setSelectedId(id)
    setPage('discoveries')
    setDetailOpen(true)
    setInvestigating(investigate)
    setQuestion('')
    setAnswer(null)
  }

  function updateFindingStatus(id: string, status: FindingStatus) {
    setStatuses((current) => ({ ...current, [id]: status }))
    notify(status === 'saved' ? 'Finding saved in this demo session.' : status === 'dismissed' ? 'Finding dismissed. Use the status filter to recover it.' : 'Finding returned to the active feed.')
  }

  function clearFilters() {
    setQuery('')
    setTypeFilter('all')
    setPriorityFilter('all')
    setDateFilter('all')
    setStatusFilter('active')
  }

  async function runSampleScan() {
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
    setLastScan(`Manual demo check completed at ${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date())}`)
    notify('Demo scan complete: 37 papers checked and 2 findings retained.')
  }

  function askQuestion(event: FormEvent) {
    event.preventDefault()
    if (!question.trim()) return
    setAnswer(selected.investigation)
  }

  function connectRepository(event: FormEvent) {
    event.preventDefault()
    const match = repositoryInput.trim().match(/^(?:https?:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)\/?$/i)
    if (!match) {
      notify('Enter a GitHub repository as owner/name or a github.com URL.')
      return
    }
    if (!connectedRepositories.includes(match[1])) {
      setConnectedRepositories((current) => [...current, match[1]])
    }
    setRepositoryInput('')
    notify('Repository added to this demo session. GitHub App authorisation is not connected.')
  }

  const navigation: { id: Page; label: string; icon: IconName; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'activity' },
    { id: 'discoveries', label: 'Discoveries', icon: 'book', count: findings.filter((finding) => statuses[finding.id] !== 'dismissed').length },
    { id: 'repositories', label: 'Repositories', icon: 'settings' },
  ]

  return (
    <div className={`application ${detailOpen ? 'detail-is-open' : ''} ${mobileNavOpen ? 'nav-is-open' : ''}`}>
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span /></span><span>Relevance</span></div>
        <div className="repository-context">
          <span className="context-label">Selected repository</span>
          <div><Icon name="github" size={17} /><strong>{repositoryName}</strong></div>
          <span className="branch-name">web-dev</span>
        </div>
        <nav>
          {navigation.map((item) => <button className={`nav-item ${page === item.id ? 'active' : ''}`} key={item.id} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.count !== undefined && <em>{item.count}</em>}</button>)}
        </nav>
        <div className="monitor-summary">
          <div><span className={`status-dot ${monitoringEnabled ? '' : 'paused'}`} /><strong>{monitoringEnabled ? 'Demo monitoring on' : 'Demo monitoring paused'}</strong></div>
          <p>{monitoringEnabled ? `Checks every ${scanInterval.toLowerCase()}` : 'Scheduled checks disabled'}</p>
        </div>
        <div className="demo-note"><span>Prepared demo workspace</span><p>Research, activity and preferences are illustrative and local to this browser session. No GitHub issue is posted automatically.</p></div>
      </aside>

      <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />

      <header className="topbar">
        <button className="menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
        <div className="mobile-brand">Relevance</div>
        <div className="topbar-repository"><strong>{repositoryName}</strong><span>{lastScan}</span></div>
        <div className="topbar-monitor"><span className={`status-dot ${monitoringEnabled ? '' : 'paused'}`} /><span>{monitoringEnabled ? 'Monitoring' : 'Paused'}</span></div>
        <button className="scan-button" type="button" onClick={runSampleScan} disabled={scanning}>
          {scanning ? <span className="spinner" aria-hidden="true" /> : <Icon name="radar" size={17} />}
          {scanning ? 'Checking…' : 'Check now'}
        </button>
      </header>

      {page === 'overview' && <main className="content-page overview-page">
        <header className="page-header">
          <div><p className="eyebrow">Autonomous research monitor</p><h1>Research is already looking for you</h1><p>Relevance checks new work against this repository and only surfaces findings with a specific code connection.</p></div>
          <div className="monitoring-state"><span className={`status-dot ${monitoringEnabled ? '' : 'paused'}`} /><div><strong>{monitoringEnabled ? 'Monitoring enabled' : 'Monitoring paused'}</strong><span>Next demo check in {monitoringEnabled ? scanInterval.toLowerCase() : '—'}</span></div></div>
        </header>

        {scanning && <ScanStatus stage={scanStage} />}

        <div className="overview-layout">
          <section className="activity-panel" aria-labelledby="activity-title">
            <div className="panel-heading"><div><p className="eyebrow">Latest autonomous run</p><h2 id="activity-title">What Relevance did in the background</h2></div><span className="demo-label">Illustrative run</span></div>
            <ol className="activity-timeline">
              {activity.map((step) => <li key={step.label}><span className="activity-icon"><Icon name={step.icon} size={16} /></span><div><strong>{step.label}</strong><p>{step.detail}</p></div><b>{step.result}</b></li>)}
            </ol>
            <footer><Icon name="clock" size={15} /><span>Completed 18 minutes ago</span><button onClick={() => navigate('repositories')}>Adjust schedule <Icon name="arrow" size={14} /></button></footer>
          </section>

          <aside className="run-summary" aria-label="Autonomous run summary">
            <p className="eyebrow">Signal retained</p>
            <strong className="summary-number">2</strong>
            <h2>findings from 37 papers</h2>
            <p>Thirty-three papers were rejected before detailed evaluation. One shortlisted paper was omitted because the repository evidence was too weak.</p>
            <button onClick={() => navigate('discoveries')}>Review findings <Icon name="arrow" size={15} /></button>
          </aside>
        </div>

        <section className="recent-findings" aria-labelledby="recent-title">
          <div className="section-title-row"><div><p className="eyebrow">Recent findings</p><h2 id="recent-title">Connected to this implementation</h2></div><button onClick={() => navigate('discoveries')}>View all discoveries</button></div>
          <div className="recent-list">
            {findings.slice(0, 2).map((finding) => <button key={finding.id} onClick={() => selectFinding(finding.id)}><span className="finding-type">{finding.type}</span><strong>{finding.insight}</strong><code><Icon name="code" size={14} />{finding.code.path}</code><Icon name="chevron" size={17} /></button>)}
          </div>
        </section>
      </main>}

      {page === 'discoveries' && <main className="workspace" id="discoveries">
        <section className="finding-pane" aria-labelledby="discoveries-title">
          <header className="page-header compact">
            <div><p className="eyebrow">Evidence-backed feed</p><h1 id="discoveries-title">Discoveries</h1><p>Start with the affected implementation, then inspect the paper and reasoning.</p></div>
            <div className="finding-count"><strong>{visibleFindings.length}</strong><span>{visibleFindings.length === 1 ? 'finding' : 'findings'}</span></div>
          </header>

          {scanning && <ScanStatus stage={scanStage} />}

          <div className="filter-toolbar">
            <label className="search-field"><span className="sr-only">Search discoveries</span><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search insight, file or paper" /></label>
            <div className="filter-count"><Icon name="filter" size={15} />{activeFilterCount > 0 ? `${activeFilterCount} filters` : 'Filters'}</div>
            <label><span>Type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | FindingType)}><option value="all">All types</option><option>Potential improvement</option><option>Contradictory finding</option><option>New technique</option></select></label>
            <label><span>Priority</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)}><option value="all">All priorities</option><option>High</option><option>Medium</option></select></label>
            <label><span>Published</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as 'all' | '2023' | '2020')}><option value="all">Any date</option><option value="2023">Since 2023</option><option value="2020">Since 2020</option></select></label>
            <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="active">Active</option><option value="all">All</option><option value="new">New</option><option value="saved">Saved</option><option value="dismissed">Dismissed</option></select></label>
          </div>

          <div className="finding-list">
            {visibleFindings.length > 0 ? visibleFindings.map((finding) => {
              const status = statuses[finding.id]
              return <article className={`finding-row ${selected.id === finding.id ? 'selected' : ''}`} key={finding.id}>
                <div className="finding-row-main">
                  <div className="finding-heading"><span className="finding-type">{finding.type}</span><span className={`priority priority-${finding.priority.toLowerCase()}`}>{finding.priority} priority</span><span className={`strength ${finding.strength === 'Strong match' ? 'strong' : ''}`}><Icon name="check" size={13} />{finding.strength}</span></div>
                  <button className="insight-link" onClick={() => selectFinding(finding.id)}><h2>{finding.insight}</h2></button>
                  <p className="paper-meta"><a href={finding.paperUrl} target="_blank" rel="noreferrer">{finding.title}<Icon name="external" size={12} /></a><span>{finding.authors} · {finding.publishedAt} · {finding.arxivId}</span></p>
                  <a className="code-excerpt" href={sourceUrl(finding)} target="_blank" rel="noreferrer" aria-label={`Open ${finding.code.path} on GitHub`}>
                    <span><Icon name="code" size={15} /><code>{finding.code.path}</code><small>{finding.code.reference}</small><Icon name="external" size={13} /></span>
                    <pre>{finding.code.lines.slice(0, 3).map((line, index) => <span key={`${line}-${index}`}><b>{index + 1}</b>{line}</span>)}</pre>
                  </a>
                  <p className="why-relevant"><strong>Why this matters</strong>{finding.whyRelevant}</p>
                  <div className="finding-actions">
                    <button className="primary-action" onClick={() => selectFinding(finding.id)}>View evidence</button>
                    <button onClick={() => selectFinding(finding.id, true)}><Icon name="search" size={15} />Investigate</button>
                    <button className={status === 'saved' ? 'active' : ''} onClick={() => updateFindingStatus(finding.id, status === 'saved' ? 'new' : 'saved')}><Icon name="bookmark" size={15} />{status === 'saved' ? 'Saved' : 'Save'}</button>
                    <button onClick={() => updateFindingStatus(finding.id, status === 'dismissed' ? 'new' : 'dismissed')}><Icon name="close" size={15} />{status === 'dismissed' ? 'Restore' : 'Dismiss'}</button>
                    <a href={githubIssueUrl(finding)} target="_blank" rel="noreferrer"><Icon name="github" size={15} />Create GitHub issue</a>
                  </div>
                </div>
              </article>
            }) : <div className="empty-state"><Icon name="search" size={24} /><h2>No findings match these filters</h2><p>Dismissed findings remain recoverable through the status filter.</p><button onClick={clearFilters}>Clear filters</button></div>}
          </div>
        </section>

        <aside className="detail-pane" aria-label="Finding evidence">
          <div className="detail-mobile-header"><button onClick={() => setDetailOpen(false)}><Icon name="arrow" size={16} />Back to discoveries</button><button className="icon-button" onClick={() => setDetailOpen(false)} aria-label="Close evidence"><Icon name="close" /></button></div>
          <div className="detail-scroll">
            <header className="detail-header"><div className="finding-heading"><span className="finding-type">{selected.type}</span><span className={`priority priority-${selected.priority.toLowerCase()}`}>{selected.priority} priority</span></div><h2>{selected.insight}</h2><p>{selected.title}</p><div className="detail-links"><a href={selected.paperUrl} target="_blank" rel="noreferrer">Open paper <Icon name="external" size={14} /></a><a href={sourceUrl(selected)} target="_blank" rel="noreferrer">Open code <Icon name="external" size={14} /></a></div></header>

            <section className="detail-code"><div className="section-heading"><h3>Affected implementation</h3><a href={sourceUrl(selected)} target="_blank" rel="noreferrer"><code>{selected.code.path}</code><Icon name="external" size={12} /></a></div><pre>{selected.code.lines.map((line, index) => <span key={`${line}-${index}`}><b>{index + 1}</b>{line}</span>)}</pre></section>
            <section><div className="section-heading"><h3>Reasoning</h3><span>Possible application</span></div><p>{selected.whyRelevant}</p></section>
            <section className="source-evidence"><h3>Source evidence</h3><blockquote>{selected.evidence}</blockquote><p>{selected.evidenceContext}</p><a href={selected.paperUrl} target="_blank" rel="noreferrer">Verify in {selected.arxivId}<Icon name="external" size={12} /></a></section>
            <section><h3>What the paper reports</h3><p>{selected.summary}</p></section>
            <section className="experiment"><div className="section-heading"><h3>Suggested experiment</h3><span>Needs verification</span></div><p>{selected.suggestedAction}</p></section>

            <section className="investigate-section">
              <div className="section-heading"><h3>Investigate with repository context</h3><span>Prepared demo</span></div>
              <p>Ask about the cited claim and affected code. Answers are constrained to the evidence shown above.</p>
              {(investigating || answer) && <form onSubmit={askQuestion}><label htmlFor="investigation-question">Question</label><textarea id="investigation-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={`How does this apply to ${selected.code.path}?`} rows={3} /><button type="submit" disabled={!question.trim()}>Ask with evidence</button></form>}
              {!investigating && !answer && <button className="investigate-button" onClick={() => setInvestigating(true)}><Icon name="search" size={15} />Start investigation</button>}
              {answer && <div className="investigation-answer" role="status"><strong>Evidence-guided response</strong><p>{answer}</p><small>Prepared from the cited abstract claim and repository excerpt; no full paper or code execution was used.</small></div>}
            </section>

            <section className="detail-actions"><button className={statuses[selected.id] === 'saved' ? 'active' : ''} onClick={() => updateFindingStatus(selected.id, statuses[selected.id] === 'saved' ? 'new' : 'saved')}><Icon name="bookmark" size={15} />{statuses[selected.id] === 'saved' ? 'Saved' : 'Save'}</button><button onClick={() => updateFindingStatus(selected.id, 'dismissed')}><Icon name="close" size={15} />Dismiss</button><a href={githubIssueUrl(selected)} target="_blank" rel="noreferrer"><Icon name="github" size={15} />Create issue draft</a></section>
          </div>
        </aside>
      </main>}

      {page === 'repositories' && <main className="content-page repositories-page">
        <header className="page-header"><div><p className="eyebrow">Repository controls</p><h1>Repositories and monitoring</h1><p>Choose what Relevance watches, how often it checks, and which findings are eligible for notification.</p></div><span className="demo-label">Session-only demo controls</span></header>

        <div className="settings-layout">
          <section className="settings-panel repository-list-panel">
            <div className="panel-heading"><div><h2>Connected repositories</h2><p>Repositories available to this local workspace.</p></div><span>{connectedRepositories.length}</span></div>
            <div className="repository-list">
              {connectedRepositories.map((repository, index) => <article key={repository}><span className="repository-icon"><Icon name="github" /></span><div><strong>{repository}</strong><p>{index === 0 ? 'Selected · branch web-dev' : 'Awaiting first analysis'}</p></div><span className={`connection-status ${index === 0 ? '' : 'pending'}`}>{index === 0 ? 'Local repository' : 'Demo only'}</span></article>)}
            </div>
            <form className="connect-form" onSubmit={connectRepository}><label htmlFor="repository-url">Connect another repository</label><div><input id="repository-url" value={repositoryInput} onChange={(event) => setRepositoryInput(event.target.value)} placeholder="owner/repository" /><button type="submit"><Icon name="plus" size={16} />Add repository</button></div><small>Adds a repository to this browser session only. GitHub App authorisation requires the shared backend.</small></form>
          </section>

          <section className="settings-panel monitoring-panel">
            <div className="panel-heading"><div><h2>Autonomous monitoring</h2><p>Schedule research checks without requiring the dashboard to be open.</p></div><label className="switch"><input type="checkbox" checked={monitoringEnabled} onChange={(event) => setMonitoringEnabled(event.target.checked)} /><span /><b>{monitoringEnabled ? 'Enabled' : 'Paused'}</b></label></div>
            <div className="settings-fields">
              <label><span>Scan interval</span><select value={scanInterval} onChange={(event) => setScanInterval(event.target.value)} disabled={!monitoringEnabled}><option>6 hours</option><option>12 hours</option><option>24 hours</option><option>7 days</option></select><small>Demo preference; no background worker is connected.</small></label>
              <fieldset><legend>Research categories</legend>{Object.entries(topics).map(([topic, enabled]) => <label className="checkbox-row" key={topic}><input type="checkbox" checked={enabled} onChange={(event) => setTopics((current) => ({ ...current, [topic]: event.target.checked }))} /><span><strong>{topic}</strong><small>{topic === 'cs.AI' ? 'Artificial Intelligence' : topic === 'cs.CL' ? 'Computation and Language' : 'Machine Learning'}</small></span></label>)}</fieldset>
              <label><span>Notification threshold</span><select value={threshold} onChange={(event) => setThreshold(event.target.value)}><option>Strong matches only</option><option>Strong and worth reviewing</option><option>All evaluated findings</option></select><small>Controls which findings are eligible for notification.</small></label>
              <label className="checkbox-row publishing-control"><input type="checkbox" checked={publishingEnabled} onChange={(event) => setPublishingEnabled(event.target.checked)} /><span><strong>Allow GitHub issue publishing</strong><small>{publishingEnabled ? 'Enabled as a demo preference; the backend remains disconnected.' : 'Findings stay in the local workbench until reviewed.'}</small></span></label>
            </div>
            <footer><button onClick={() => notify('Demo monitoring preferences saved for this session.')}><Icon name="check" size={16} />Save demo preferences</button></footer>
          </section>
        </div>
      </main>}

      {toast && <div className="toast" role="status"><Icon name="check" size={16} /><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><Icon name="close" size={15} /></button></div>}
    </div>
  )
}

function ScanStatus({ stage }: { stage: string | null }) {
  return <div className="scan-status" role="status" aria-live="polite"><div className="scan-status-copy"><span className="spinner" aria-hidden="true" /><strong>{stage}</strong><span>Manual demo check in progress</span></div><ol aria-label="Scan progress">{scanStages.map((item) => <li key={item} className={item === stage ? 'current' : ''}>{item}</li>)}</ol></div>
}

export default Application
