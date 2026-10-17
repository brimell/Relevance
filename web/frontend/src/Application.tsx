import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ApiError,
  createIssue,
  getRepositoryFindings,
  getScan,
  getScanFindings,
  startScan,
  type Finding,
  type Scan,
} from './api'
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
  | 'external'
  | 'filter'
  | 'github'
  | 'menu'
  | 'plus'
  | 'radar'
  | 'search'
  | 'settings'

type Page = 'overview' | 'discoveries' | 'repositories'
type FindingStatus = 'new' | 'saved' | 'dismissed'
type StatusFilter = 'active' | 'all' | FindingStatus
type SourceFilter = 'all' | Finding['source']['type']
type SeverityFilter = 'all' | Finding['severity']

const repository = {
  owner: 'brimell',
  repo: 'SweetHomeAlabama256',
  ref: 'web-dev',
} as const
const repositoryName = `${repository.owner}/${repository.repo}`
const repositoryUrl = `https://github.com/${repositoryName}`
const DEFAULT_SIMULATION_NOTICE = 'Paper metadata is fetched live from arXiv. Repository analysis, relevance scoring, and GitHub issue creation are simulated.'
const MAX_SCAN_POLLS = 10

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    activity: <path d="M4 12h3l2-6 4 12 2-6h5" />,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4Z" />,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
    filter: <path d="M4 5h16M7 12h10M10 19h4" />,
    github: <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.36-1.18-3.36-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.54 9.54 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.56 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    plus: <path d="M12 5v14M5 12h14" />,
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="m12 12 6.4-6.4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.35.73.6 1 .3.28.68.42 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7.6Z" /></>,
  }

  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

function formatDate(value: string | null, fallback = 'Date not provided') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function sourceTypeLabel(finding: Finding) {
  return finding.source.type === 'paper' ? 'Paper finding' : 'CVE finding'
}

function relevanceLabel(finding: Finding) {
  if (finding.relevance === 'high') return 'Strong match'
  if (finding.relevance === 'medium') return 'Worth reviewing'
  return 'Exploratory'
}

function capitalise(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function authorLabel(authors: string[]) {
  if (authors.length === 0) return 'Authors not provided'
  if (authors.length <= 3) return authors.join(', ')
  return `${authors.slice(0, 3).join(', ')} and ${authors.length - 3} more`
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return 'The bot API request failed.'
}

function Application() {
  const [page, setPage] = useState<Page>('overview')
  const [findings, setFindings] = useState<Finding[]>([])
  const [findingsLoading, setFindingsLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [simulationNotice, setSimulationNotice] = useState(DEFAULT_SIMULATION_NOTICE)
  const [scan, setScan] = useState<Scan | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [lastScan, setLastScan] = useState('No scan completed in this API process')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '2024'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [statuses, setStatuses] = useState<Record<string, FindingStatus>>({})
  const [publishingFindingId, setPublishingFindingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)
  const [scanInterval, setScanInterval] = useState('12 hours')
  const [threshold, setThreshold] = useState('Strong matches only')
  const [publishingEnabled, setPublishingEnabled] = useState(false)
  const [topics, setTopics] = useState({ 'cs.AI': true, 'cs.CL': true, 'cs.LG': true })
  const [repositoryInput, setRepositoryInput] = useState('')
  const [connectedRepositories, setConnectedRepositories] = useState([repositoryName])
  const scanRun = useRef(0)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    getRepositoryFindings(repository.owner, repository.repo)
      .then((response) => {
        if (!active) return
        setFindings(response.findings)
        setSimulationNotice(response.simulation_notice)
        setStatuses(Object.fromEntries(response.findings.map((finding) => [finding.id, 'new'])))
        setSelectedId(response.findings[0]?.id ?? null)
        const latest = response.findings.map((finding) => finding.detected_at).sort().at(-1)
        if (latest) setLastScan(`Latest finding detected ${formatDate(latest)}`)
      })
      .catch((error: unknown) => {
        if (active) setApiError(errorMessage(error))
      })
      .finally(() => {
        if (active) setFindingsLoading(false)
      })

    function closeOverlays(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDetailOpen(false)
        setMobileNavOpen(false)
      }
    }

    window.addEventListener('keydown', closeOverlays)
    return () => {
      active = false
      scanRun.current += 1
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
      window.removeEventListener('keydown', closeOverlays)
    }
  }, [])

  const visibleFindings = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    return findings.filter((finding) => {
      const status = statuses[finding.id] ?? 'new'
      const searchable = `${finding.title} ${finding.summary} ${finding.suggested_action} ${finding.source.identifier} ${finding.source.authors.join(' ')}`.toLowerCase()
      const publishedYear = finding.source.published_at ? new Date(finding.source.published_at).getFullYear() : null
      const matchesQuery = !normalisedQuery || searchable.includes(normalisedQuery)
      const matchesSource = sourceFilter === 'all' || finding.source.type === sourceFilter
      const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter
      const matchesDate = dateFilter === 'all' || (publishedYear !== null && publishedYear >= 2024)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? status !== 'dismissed' : status === statusFilter)
      return matchesQuery && matchesSource && matchesSeverity && matchesDate && matchesStatus
    })
  }, [dateFilter, findings, query, severityFilter, sourceFilter, statusFilter, statuses])

  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0] ?? null
  const scanning = scan?.status === 'queued' || scan?.status === 'running'

  const createdIssueCount = findings.filter((finding) => finding.issue.state === 'created').length

  function notify(message: string) {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3600)
  }

  function navigate(nextPage: Page) {
    setPage(nextPage)
    setMobileNavOpen(false)
    if (nextPage !== 'discoveries') setDetailOpen(false)
  }

  function selectFinding(id: string) {
    setSelectedId(id)
    setPage('discoveries')
    setDetailOpen(true)
  }

  function updateFindingStatus(id: string, status: FindingStatus) {
    setStatuses((current) => ({ ...current, [id]: status }))
    notify(status === 'saved' ? 'Finding saved in this browser session.' : status === 'dismissed' ? 'Finding dismissed. Use the status filter to recover it.' : 'Finding returned to the active feed.')
  }

  function clearFilters() {
    setQuery('')
    setSourceFilter('all')
    setSeverityFilter('all')
    setDateFilter('all')
    setStatusFilter('active')
  }

  async function runScan() {
    if (scanning) return
    const run = scanRun.current + 1
    scanRun.current = run
    setApiError(null)

    try {
      let currentScan = await startScan(repository)
      if (scanRun.current !== run) return
      setScan(currentScan)
      setSimulationNotice(currentScan.simulation_notice)

      let pollCount = 0
      while (currentScan.status === 'queued' || currentScan.status === 'running') {
        if (pollCount >= MAX_SCAN_POLLS) {
          throw new Error('The scan did not complete in time. Its state may still be available from the bot API.')
        }
        pollCount += 1
        await wait(1_000)
        if (scanRun.current !== run) return
        currentScan = await getScan(currentScan.id)
        setScan(currentScan)
      }

      if (currentScan.status === 'failed') {
        throw new Error(currentScan.error ?? 'The scan failed without an error message.')
      }

      const response = await getScanFindings(currentScan.id)
      if (scanRun.current !== run) return
      setFindings(response.findings)
      setSimulationNotice(response.simulation_notice)
      setStatuses((current) => ({
        ...Object.fromEntries(response.findings.map((finding) => [finding.id, 'new' as const])),
        ...current,
      }))
      setSelectedId(response.findings[0]?.id ?? null)
      setApiError(null)
      setLastScan(`arXiv checked ${formatDate(currentScan.completed_at)}`)
      notify(`Scan complete: ${response.count} recent ${response.count === 1 ? 'paper' : 'papers'} returned by the bot API.`)
    } catch (error: unknown) {
      const message = errorMessage(error)
      setApiError(message)
      notify(message)
    }
  }

  async function approveIssue(finding: Finding) {
    if (finding.issue.state === 'created' || publishingFindingId !== null) return
    const approved = window.confirm('Approve simulated issue creation? The bot API will not contact GitHub and will return a non-actionable example.invalid URL.')
    if (!approved) return

    setPublishingFindingId(finding.id)
    try {
      const response = await createIssue(finding.id)
      setFindings((current) => current.map((item) => item.id === finding.id
        ? { ...item, issue: { state: response.state, url: response.url, created_at: response.created_at } }
        : item))
      setSimulationNotice(response.simulation_notice)
      notify('Simulated issue created. No request was sent to GitHub.')
    } catch (error: unknown) {
      notify(errorMessage(error))
    } finally {
      setPublishingFindingId(null)
    }
  }

  function connectRepository(event: FormEvent) {
    event.preventDefault()
    const match = repositoryInput.trim().match(/^(?:https?:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)\/?$/i)
    if (!match) {
      notify('Enter a GitHub repository as owner/name or a github.com URL.')
      return
    }
    if (!connectedRepositories.includes(match[1])) setConnectedRepositories((current) => [...current, match[1]])
    setRepositoryInput('')
    notify('Repository added to this browser session. API scanning remains configured for the selected repository.')
  }

  const navigation: { id: Page; label: string; icon: IconName; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'activity' },
    { id: 'discoveries', label: 'Discoveries', icon: 'book', count: findings.filter((finding) => statuses[finding.id] !== 'dismissed').length },
    { id: 'repositories', label: 'Repositories', icon: 'settings' },
  ]

  return (
    <div className={`application ${mobileNavOpen ? 'nav-is-open' : ''}`}>
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span /></span><span>Relevance</span></div>
        <div className="repository-context"><span className="context-label">Selected repository</span><div><Icon name="github" size={17} /><strong>{repositoryName}</strong></div><span className="branch-name">{repository.ref}</span></div>
        <nav>{navigation.map((item) => <button className={`nav-item ${page === item.id ? 'active' : ''}`} key={item.id} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.count !== undefined && <em>{item.count}</em>}</button>)}</nav>
        <div className="monitor-summary"><div><span className={`status-dot ${monitoringEnabled ? '' : 'paused'}`} /><strong>{monitoringEnabled ? 'Schedule preference on' : 'Manual scans only'}</strong></div><p>{monitoringEnabled ? `Every ${scanInterval.toLowerCase()} (preference only)` : 'Use Run scan to query the API'}</p></div>
        <div className="demo-note"><span>Integration boundary</span><p>{simulationNotice}</p></div>
      </aside>

      <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />

      <header className="topbar">
        <button className="menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
        <div className="mobile-brand">Relevance</div>
        <div className="topbar-repository"><strong>{repositoryName}</strong><span>{lastScan}</span></div>
        <div className="topbar-monitor"><span className={`status-dot ${apiError ? 'paused' : ''}`} /><span>{apiError ? 'API unavailable' : 'Bot API linked'}</span></div>
        <button className="scan-button" type="button" onClick={runScan} disabled={scanning}>
          {scanning ? <span className="spinner" aria-hidden="true" /> : <Icon name="radar" size={17} />}
          {scanning ? 'Scanning…' : 'Run scan'}
        </button>
      </header>

      {page === 'overview' && <main className="content-page overview-page">
        <header className="page-header"><div><p className="eyebrow">Bot API workbench</p><h1>Review papers from the shared scan service</h1><p>Fetch recent paper metadata from arXiv, inspect the available evidence and explicitly approve any simulated issue action.</p></div><div className="monitoring-state"><span className={`status-dot ${apiError ? 'paused' : ''}`} /><div><strong>{apiError ? 'API connection failed' : 'API connection ready'}</strong><span>{scanning ? scan.progress.stage : lastScan}</span></div></div></header>

        {apiError && <div className="api-message error" role="alert"><strong>Bot API unavailable</strong><span>{apiError}</span><button onClick={runScan} disabled={scanning}>Retry with a scan</button></div>}
        {scanning && scan && <ScanStatus scan={scan} />}

        <div className="overview-layout">
          <section className="activity-panel" aria-labelledby="activity-title">
            <div className="panel-heading"><div><p className="eyebrow">Shared API state</p><h2 id="activity-title">What the web app received</h2></div><span className="demo-label">Live metadata</span></div>
            <ol className="activity-timeline">
              <li><span className="activity-icon"><Icon name="github" size={16} /></span><div><strong>Repository selected</strong><p>The owner, repository and ref sent to the scan endpoint.</p></div><b>{repositoryName}</b></li>
              <li><span className="activity-icon"><Icon name="radar" size={16} /></span><div><strong>Latest scan state</strong><p>{scan?.progress.stage ?? 'No scan has been started from this browser session.'}</p></div><b>{scan ? capitalise(scan.status) : 'Not run'}</b></li>
              <li><span className="activity-icon"><Icon name="book" size={16} /></span><div><strong>Findings returned</strong><p>Records currently held by the bot API process for this repository.</p></div><b>{findings.length}</b></li>
              <li><span className="activity-icon"><Icon name="github" size={16} /></span><div><strong>Simulated issues</strong><p>Approved issue simulations; no GitHub request was made.</p></div><b>{createdIssueCount}</b></li>
            </ol>
            <footer><Icon name="clock" size={15} /><span>{lastScan}</span><button onClick={() => navigate('repositories')}>View controls <Icon name="arrow" size={14} /></button></footer>
          </section>

          <aside className="run-summary" aria-label="Finding summary"><p className="eyebrow">API findings</p><strong className="summary-number">{findings.length}</strong><h2>{findings.length === 1 ? 'paper available' : 'papers available'}</h2><p>{findingsLoading ? 'Loading repository history from the bot API.' : findings.length > 0 ? 'These records contain live arXiv metadata held in the bot API’s in-memory store.' : 'No papers are stored for this repository yet. Run a scan to query arXiv.'}</p><button onClick={() => findings.length > 0 ? navigate('discoveries') : runScan()} disabled={scanning}>{findings.length > 0 ? 'Review findings' : 'Run first scan'} <Icon name="arrow" size={15} /></button></aside>
        </div>

        <section className="recent-findings" aria-labelledby="recent-title">
          <div className="section-title-row"><div><p className="eyebrow">Recent findings</p><h2 id="recent-title">Returned by the bot API</h2></div><button onClick={() => navigate('discoveries')}>View discoveries</button></div>
          <div className="recent-list">
            {findings.slice(0, 2).map((finding) => <button key={finding.id} onClick={() => selectFinding(finding.id)}><span className="finding-type">{sourceTypeLabel(finding)}</span><strong>{finding.title}</strong><code>{finding.source.identifier}</code><Icon name="chevron" size={17} /></button>)}
            {!findingsLoading && findings.length === 0 && <div className="empty-state"><h2>No scans yet</h2><p>Run a scan to request recent paper metadata from arXiv through the bot API.</p><button onClick={runScan}>Run scan</button></div>}
          </div>
        </section>
      </main>}

      {page === 'discoveries' && <main className="content-page discoveries-page" id="discoveries">
        <div className="discoveries-shell">
          <header className="page-header discoveries-header">
            <div><p className="eyebrow">Shared findings feed</p><h1 id="discoveries-title">Discoveries</h1><p>Review records returned by the bot API and open a finding only when you need its available evidence.</p></div>
            <div className="finding-count"><strong>{visibleFindings.length}</strong><span>{visibleFindings.length === 1 ? 'finding' : 'findings'}</span></div>
          </header>

          {apiError && <div className="api-message error" role="alert"><strong>Feed unavailable</strong><span>{apiError}</span></div>}
          {scanning && scan && <ScanStatus scan={scan} />}

          <section className="discovery-controls" aria-label="Discovery filters">
            <div className="filter-toolbar">
              <label className="search-field"><span className="sr-only">Search discoveries</span><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search finding or source" /></label>
              <label><span>Source</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}><option value="all">All sources</option><option value="paper">Papers</option><option value="cve">CVEs</option></select></label>
              <label><span>Severity</span><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="info">Info</option></select></label>
              <label><span>Published</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as 'all' | '2024')}><option value="all">Any date</option><option value="2024">Since 2024</option></select></label>
              <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="active">Active</option><option value="all">All</option><option value="new">New</option><option value="saved">Saved</option><option value="dismissed">Dismissed</option></select></label>
            </div>
          </section>

          <section className="finding-list" aria-labelledby="discoveries-title">
            {findingsLoading ? <div className="empty-state"><span className="spinner" aria-hidden="true" /><h2>Loading findings</h2><p>Requesting repository history from the bot API.</p></div> : visibleFindings.length > 0 ? visibleFindings.map((finding) => {
              const status = statuses[finding.id] ?? 'new'
              const expanded = detailOpen && selected?.id === finding.id
              return <article className={`finding-row ${expanded ? 'selected' : ''}`} key={finding.id}>
                <div className="finding-row-main">
                  <div className="finding-heading"><span className="finding-type">{sourceTypeLabel(finding)}</span><span className={`priority priority-${finding.severity}`}>{capitalise(finding.severity)} severity</span><span className={`strength ${finding.relevance === 'high' ? 'strong' : ''}`}><Icon name="check" size={13} />{relevanceLabel(finding)}</span></div>
                  <button className="insight-link" onClick={() => expanded ? setDetailOpen(false) : selectFinding(finding.id)} aria-expanded={expanded} aria-controls={`finding-detail-${finding.id}`}><h2>{finding.title}</h2></button>
                  <p className="paper-meta"><a href={finding.source.url} target="_blank" rel="noreferrer">{finding.source.identifier}<Icon name="external" size={12} /></a><span>{authorLabel(finding.source.authors)} · {formatDate(finding.source.published_at)}</span></p>
                  <p className="why-relevant"><strong>arXiv abstract</strong>{finding.summary}</p>
                  <div className="finding-actions">
                    <button className="primary-action" onClick={() => expanded ? setDetailOpen(false) : selectFinding(finding.id)}>{expanded ? 'Hide evidence' : 'View evidence'}</button>
                    <button className={status === 'saved' ? 'active' : ''} onClick={() => updateFindingStatus(finding.id, status === 'saved' ? 'new' : 'saved')}><Icon name="bookmark" size={15} />{status === 'saved' ? 'Saved' : 'Save'}</button>
                    <button onClick={() => updateFindingStatus(finding.id, status === 'dismissed' ? 'new' : 'dismissed')}><Icon name="close" size={15} />{status === 'dismissed' ? 'Restore' : 'Dismiss'}</button>
                    <button onClick={() => approveIssue(finding)} disabled={finding.issue.state === 'created' || publishingFindingId !== null}><Icon name="github" size={15} />{finding.issue.state === 'created' ? 'Simulated issue created' : publishingFindingId === finding.id ? 'Creating…' : 'Create simulated issue'}</button>
                  </div>
                </div>

                {expanded && <div className="finding-detail" id={`finding-detail-${finding.id}`}>
                  <header className="detail-intro"><div><p className="eyebrow">Available evidence</p><h3>{finding.title}</h3><p>{finding.source.identifier} · {formatDate(finding.source.published_at)}</p></div><button className="detail-close" onClick={() => setDetailOpen(false)} aria-label="Close evidence"><Icon name="close" size={17} /></button></header>
                  <div className="detail-grid">
                    <section className="detail-section"><div className="section-heading"><h3>Paper summary</h3><span>Reported by arXiv</span></div><p>{finding.summary}</p></section>
                    <section className="detail-section"><div className="section-heading"><h3>Affected implementation</h3><span>Not provided</span></div><p>The current API schema does not identify affected files or repository excerpts. No code path is inferred by the web application.</p></section>
                    <section className="detail-section source-evidence wide"><h3>Source evidence</h3><p><strong>{authorLabel(finding.source.authors)}</strong>. The title, authors, publication time and abstract above come from arXiv metadata. Relevance has not read or validated the full paper.</p><a href={finding.source.url} target="_blank" rel="noreferrer">Verify at {finding.source.identifier}<Icon name="external" size={12} /></a></section>
                    <section className="detail-section experiment wide"><div className="section-heading"><h3>Suggested action</h3><span>Needs verification</span></div><p>{finding.suggested_action}</p></section>
                    <section className="detail-section wide"><div className="section-heading"><h3>Publication status</h3><span>{finding.issue.state === 'created' ? 'Simulated created' : 'Not created'}</span></div><p>{finding.issue.state === 'created' ? `The API recorded a simulated issue at ${formatDate(finding.issue.created_at)}. Its example.invalid URL is intentionally non-actionable.` : 'No issue simulation has been approved for this finding.'}</p></section>
                  </div>
                  <footer className="detail-actions"><a href={finding.source.url} target="_blank" rel="noreferrer">Open source <Icon name="external" size={14} /></a><button onClick={() => approveIssue(finding)} disabled={finding.issue.state === 'created' || publishingFindingId !== null}><Icon name="github" size={15} />{finding.issue.state === 'created' ? 'Simulated issue created' : publishingFindingId === finding.id ? 'Creating…' : 'Create simulated issue'}</button></footer>
                </div>}
              </article>
            }) : <div className="empty-state"><Icon name="search" size={24} /><h2>{findings.length === 0 ? 'No scans yet' : 'No findings match these filters'}</h2><p>{findings.length === 0 ? 'Run a scan to populate this feed from the bot API.' : 'Dismissed findings remain recoverable through the status filter.'}</p><button onClick={findings.length === 0 ? runScan : clearFilters}>{findings.length === 0 ? 'Run scan' : 'Clear filters'}</button></div>}
          </section>
        </div>
      </main>}

      {page === 'repositories' && <main className="content-page repositories-page">
        <header className="page-header"><div><p className="eyebrow">Repository controls</p><h1>Repositories and monitoring</h1><p>The selected repository is sent to the bot API. Other controls remain browser-only until the API supports them.</p></div><span className="demo-label">Mixed API and local controls</span></header>
        <div className="settings-layout">
          <section className="settings-panel repository-list-panel">
            <div className="panel-heading"><div><h2>Connected repositories</h2><p>Repositories visible in this local workspace.</p></div><span>{connectedRepositories.length}</span></div>
            <div className="repository-list">{connectedRepositories.map((item, index) => <article key={item}><span className="repository-icon"><Icon name="github" /></span><div><strong>{item}</strong><p>{index === 0 ? `Selected · ref ${repository.ref}` : 'Browser-only entry; not selected for API scans'}</p></div><span className={`connection-status ${index === 0 ? '' : 'pending'}`}>{index === 0 ? 'Bot API target' : 'Local only'}</span></article>)}</div>
            <form className="connect-form" onSubmit={connectRepository}><label htmlFor="repository-url">Add another repository</label><div><input id="repository-url" value={repositoryInput} onChange={(event) => setRepositoryInput(event.target.value)} placeholder="owner/repository" /><button type="submit"><Icon name="plus" size={16} />Add repository</button></div><small>Adds a browser-only entry. The current bot API has no repository connection or GitHub authorisation endpoint.</small></form>
          </section>

          <section className="settings-panel monitoring-panel">
            <div className="panel-heading"><div><h2>Monitoring preferences</h2><p>These controls are local preferences; the bot API only supports manual scans.</p></div><label className="switch"><input type="checkbox" checked={monitoringEnabled} onChange={(event) => setMonitoringEnabled(event.target.checked)} /><span /><b>{monitoringEnabled ? 'Preferred' : 'Off'}</b></label></div>
            <div className="settings-fields">
              <label><span>Preferred interval</span><select value={scanInterval} onChange={(event) => setScanInterval(event.target.value)} disabled={!monitoringEnabled}><option>6 hours</option><option>12 hours</option><option>24 hours</option><option>7 days</option></select><small>No background worker consumes this preference.</small></label>
              <fieldset><legend>Research categories</legend>{Object.entries(topics).map(([topic, enabled]) => <label className="checkbox-row" key={topic}><input type="checkbox" checked={enabled} onChange={(event) => setTopics((current) => ({ ...current, [topic]: event.target.checked }))} /><span><strong>{topic}</strong><small>{topic === 'cs.AI' ? 'Artificial Intelligence' : topic === 'cs.CL' ? 'Computation and Language' : 'Machine Learning'}</small></span></label>)}</fieldset>
              <label><span>Notification threshold</span><select value={threshold} onChange={(event) => setThreshold(event.target.value)}><option>Strong matches only</option><option>Strong and worth reviewing</option><option>All evaluated findings</option></select><small>Browser-only preference; it does not filter bot API generation.</small></label>
              <label className="checkbox-row publishing-control"><input type="checkbox" checked={publishingEnabled} onChange={(event) => setPublishingEnabled(event.target.checked)} /><span><strong>Allow simulated issue actions</strong><small>{publishingEnabled ? 'The action still requires confirmation for every finding.' : 'Issue action buttons remain available but always require explicit confirmation.'}</small></span></label>
            </div>
            <footer><button onClick={() => notify('Local preferences saved for this browser session.')}><Icon name="check" size={16} />Save local preferences</button></footer>
          </section>
        </div>
      </main>}

      {toast && <div className="toast" role="status"><Icon name="check" size={16} /><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><Icon name="close" size={15} /></button></div>}
    </div>
  )
}

function ScanStatus({ scan }: { scan: Scan }) {
  const steps = ['Queued', 'Fetching arXiv', 'Complete']
  const currentIndex = scan.status === 'queued' ? 0 : scan.status === 'running' ? 1 : 2
  return <div className="scan-status" role="status" aria-live="polite"><div className="scan-status-copy"><span className="spinner" aria-hidden="true" /><strong>{scan.progress.stage}</strong><span>{scan.progress.completed_steps} of {scan.progress.total_steps} API steps complete</span></div><ol aria-label="Scan progress">{steps.map((item, index) => <li key={item} className={index === currentIndex ? 'current' : ''}>{item}</li>)}</ol></div>
}

export default Application
