import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ApiError,
  addRepository,
  createIssue,
  getProjectProfile,
  getRepositories,
  getRepositoryFindings,
  getScan,
  getScanFindings,
  startScan,
  updateFindingStatus as persistFindingStatus,
  type Finding,
  type ProjectProfile,
  type RepositoryConnection,
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
type FindingStatus = Finding['user_status']
type StatusFilter = 'active' | 'all' | FindingStatus
type SourceFilter = 'all' | Finding['source']['type']
type SeverityFilter = 'all' | Finding['severity']

const pagePaths: Record<Page, string> = {
  overview: '/',
  discoveries: '/discoveries',
  repositories: '/repositories',
}
const SELECTED_REPOSITORY_STORAGE_KEY = 'relevance:selected-repository'
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

function findingTypeLabel(finding: Finding) {
  const labels: Record<Finding['finding_type'], string> = {
    potential_improvement: 'Potential improvement',
    challenges_assumption: 'Challenges an assumption',
    new_technique: 'New technique',
  }
  return labels[finding.finding_type]
}

function evidenceLabel(finding: Finding) {
  const labels: Record<Finding['evidence_label'], string> = {
    strong_match: 'Strong match',
    worth_reviewing: 'Worth reviewing',
    exploratory: 'Exploratory',
  }
  return labels[finding.evidence_label]
}

function repositoryKey(repository: Pick<RepositoryConnection, 'owner' | 'repo' | 'ref'>) {
  return `${repository.owner}/${repository.repo}@${repository.ref}`
}

function repositoryFileUrl(repository: RepositoryConnection, path: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const revision = repository.analysed_sha ?? repository.ref ?? 'HEAD'
  return `https://github.com/${repository.owner}/${repository.repo}/blob/${encodeURIComponent(revision)}/${encodedPath}`
}

function readStoredRepositoryKey() {
  try {
    return window.localStorage.getItem(SELECTED_REPOSITORY_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeRepositoryKey(key: string) {
  try {
    window.localStorage.setItem(SELECTED_REPOSITORY_STORAGE_KEY, key)
  } catch {
    // Repository selection still works when browser storage is unavailable.
  }
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

function pageFromPath(pathname: string): Page {
  const normalisedPath = pathname.replace(/\/+$/, '') || '/'
  return (Object.entries(pagePaths).find(([, path]) => path === normalisedPath)?.[0] as Page | undefined) ?? 'overview'
}

function Application() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname))
  const [repositories, setRepositories] = useState<RepositoryConnection[]>([])
  const [repositoriesLoading, setRepositoriesLoading] = useState(true)
  const [selectedRepository, setSelectedRepository] = useState<RepositoryConnection | null>(null)
  const [projectProfile, setProjectProfile] = useState<ProjectProfile | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [findingsLoading, setFindingsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
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
  const [updatingFindingId, setUpdatingFindingId] = useState<string | null>(null)
  const [publishingFindingId, setPublishingFindingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)
  const [scanInterval, setScanInterval] = useState('12 hours')
  const [threshold, setThreshold] = useState('Strong matches only')
  const [confirmIssueCreation, setConfirmIssueCreation] = useState(true)
  const [topics, setTopics] = useState({ 'cs.AI': true, 'cs.CL': true, 'cs.LG': true })
  const [repositoryInput, setRepositoryInput] = useState('')
  const [repositoryRefInput, setRepositoryRefInput] = useState('main')
  const [addingRepository, setAddingRepository] = useState(false)
  const [repositoryReload, setRepositoryReload] = useState(0)
  const scanRun = useRef(0)
  const toastTimer = useRef<number | null>(null)
  const repositoryName = selectedRepository ? `${selectedRepository.owner}/${selectedRepository.repo}` : 'No repository selected'
  const repositoryUrl = selectedRepository ? `https://github.com/${repositoryName}` : null

  useEffect(() => {
    let active = true
    setRepositoriesLoading(true)

    getRepositories()
      .then((response) => {
        if (!active) return
        setRepositories(response.repositories)
        const storedKey = readStoredRepositoryKey()
        const preferred = response.repositories.find((item) => repositoryKey(item) === storedKey) ?? response.repositories[0] ?? null
        setSelectedRepository(preferred)
        if (preferred) storeRepositoryKey(repositoryKey(preferred))
        setApiError(null)
      })
      .catch((error: unknown) => {
        if (active) setApiError(errorMessage(error))
      })
      .finally(() => {
        if (active) setRepositoriesLoading(false)
      })

    return () => {
      active = false
    }
  }, [repositoryReload])

  useEffect(() => {
    if (!selectedRepository) {
      setFindings([])
      setProjectProfile(null)
      setFindingsLoading(false)
      setSelectedId(null)
      setLastScan('No repository selected')
      return
    }

    let active = true
    scanRun.current += 1
    setFindingsLoading(true)
    setFindings([])
    setProjectProfile(null)
    setSelectedId(null)
    setDetailOpen(false)
    setScan(null)
    setApiError(null)
    setLastScan(selectedRepository.analysed_sha ? `Analysed commit ${selectedRepository.analysed_sha.slice(0, 7)}` : 'No scans yet')

    Promise.all([
      getRepositoryFindings(selectedRepository.owner, selectedRepository.repo),
      getProjectProfile(selectedRepository.owner, selectedRepository.repo).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }),
    ])
      .then(([response, profile]) => {
        if (!active) return
        setFindings(response.findings)
        setProjectProfile(profile)
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

    return () => {
      active = false
    }
  }, [selectedRepository?.owner, selectedRepository?.repo, selectedRepository?.ref])

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

  useEffect(() => {
    function syncPageFromUrl() {
      const nextPage = pageFromPath(window.location.pathname)
      setPage(nextPage)
      setMobileNavOpen(false)
      if (nextPage !== 'discoveries') setDetailOpen(false)
    }

    window.addEventListener('popstate', syncPageFromUrl)
    return () => window.removeEventListener('popstate', syncPageFromUrl)
  }, [])

  const visibleFindings = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    return findings.filter((finding) => {
      const searchable = `${finding.title} ${finding.summary} ${finding.why_relevant} ${finding.suggested_action} ${finding.source.identifier} ${finding.source.authors.join(' ')} ${finding.affected_files.map((file) => file.path).join(' ')}`.toLowerCase()
      const publishedYear = finding.source.published_at ? new Date(finding.source.published_at).getFullYear() : null
      const matchesQuery = !normalisedQuery || searchable.includes(normalisedQuery)
      const matchesSource = sourceFilter === 'all' || finding.source.type === sourceFilter
      const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter
      const matchesDate = dateFilter === 'all' || (publishedYear !== null && publishedYear >= 2024)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? finding.user_status !== 'dismissed' : finding.user_status === statusFilter)
      return matchesQuery && matchesSource && matchesSeverity && matchesDate && matchesStatus
    })
  }, [dateFilter, findings, query, severityFilter, sourceFilter, statusFilter])

  const selected = findings.find((finding) => finding.id === selectedId) ?? findings[0] ?? null
  const scanning = scan?.status === 'queued' || scan?.status === 'running'

  const createdIssueCount = findings.filter((finding) => finding.issue.state === 'created').length

  function notify(message: string) {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3600)
  }

  function navigate(nextPage: Page) {
    if (window.location.pathname !== pagePaths[nextPage]) {
      window.history.pushState(null, '', pagePaths[nextPage])
    }
    setPage(nextPage)
    setMobileNavOpen(false)
    if (nextPage !== 'discoveries') setDetailOpen(false)
  }

  function selectFinding(id: string) {
    setSelectedId(id)
    navigate('discoveries')
    setDetailOpen(true)
  }

  async function updateFindingStatus(id: string, status: FindingStatus) {
    if (updatingFindingId !== null) return
    setUpdatingFindingId(id)
    try {
      const updated = await persistFindingStatus(id, status)
      setFindings((current) => current.map((finding) => finding.id === id ? updated : finding))
      notify(status === 'saved' ? 'Finding saved.' : status === 'dismissed' ? 'Finding dismissed. Use the status filter to recover it.' : 'Finding returned to the active feed.')
    } catch (error: unknown) {
      notify(errorMessage(error))
    } finally {
      setUpdatingFindingId(null)
    }
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
    if (!selectedRepository) {
      notify('Select or add a repository before running a scan.')
      return
    }
    const scannedRepository = selectedRepository
    const run = scanRun.current + 1
    scanRun.current = run
    setApiError(null)

    try {
      let currentScan = await startScan({ owner: scannedRepository.owner, repo: scannedRepository.repo, ref: scannedRepository.ref })
      if (scanRun.current !== run) return
      setScan(currentScan)

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

      const [response, profile] = await Promise.all([
        getScanFindings(currentScan.id),
        getProjectProfile(scannedRepository.owner, scannedRepository.repo).catch(() => null),
      ])
      if (scanRun.current !== run) return
      setFindings(response.findings)
      setProjectProfile(profile)
      setSelectedId(response.findings[0]?.id ?? null)
      setRepositories((current) => current.map((item) => repositoryKey(item) === repositoryKey(scannedRepository) ? { ...item, analysed_sha: currentScan.analysed_sha } : item))
      setSelectedRepository((current) => current && repositoryKey(current) === repositoryKey(scannedRepository) ? { ...current, analysed_sha: currentScan.analysed_sha } : current)
      setApiError(null)
      setLastScan(`Scan completed ${formatDate(currentScan.completed_at)}`)
      notify(`Scan complete: ${response.count} ${response.count === 1 ? 'finding' : 'findings'} returned for ${scannedRepository.owner}/${scannedRepository.repo}.`)
    } catch (error: unknown) {
      const message = errorMessage(error)
      setApiError(message)
      notify(message)
    }
  }

  async function approveIssue(finding: Finding) {
    if (finding.issue.state === 'created' || publishingFindingId !== null) return
    if (!selectedRepository?.github_connected) {
      notify('Connect GitHub for this repository before creating an issue.')
      return
    }
    if (confirmIssueCreation && !window.confirm(`Create a GitHub issue for this finding in ${repositoryName}?`)) return

    setPublishingFindingId(finding.id)
    try {
      const response = await createIssue(finding.id)
      setFindings((current) => current.map((item) => item.id === response.finding_id
        ? { ...item, issue: response.issue }
        : item))
      notify(response.issue.state === 'created' ? `GitHub issue${response.issue.number ? ` #${response.issue.number}` : ''} created.` : response.issue.error ?? 'GitHub issue creation failed.')
    } catch (error: unknown) {
      notify(errorMessage(error))
    } finally {
      setPublishingFindingId(null)
    }
  }

  function selectRepository(repository: RepositoryConnection) {
    scanRun.current += 1
    setSelectedRepository(repository)
    storeRepositoryKey(repositoryKey(repository))
    setApiError(null)
  }

  async function connectRepository(event: FormEvent) {
    event.preventDefault()
    const match = repositoryInput.trim().match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+)\/?$/i)
    const ref = repositoryRefInput.trim()
    if (!match || !ref) {
      notify('Enter a GitHub repository as owner/name and a branch or ref.')
      return
    }

    setAddingRepository(true)
    try {
      const connected = await addRepository({ owner: match[1], repo: match[2], ref })
      setRepositories((current) => [...current.filter((item) => repositoryKey(item) !== repositoryKey(connected)), connected])
      selectRepository(connected)
      setRepositoryInput('')
      notify(`${connected.owner}/${connected.repo} added and selected.`)
    } catch (error: unknown) {
      notify(errorMessage(error))
    } finally {
      setAddingRepository(false)
    }
  }

  const navigation: { id: Page; label: string; icon: IconName; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'activity' },
    { id: 'discoveries', label: 'Discoveries', icon: 'book', count: findings.filter((finding) => finding.user_status !== 'dismissed').length },
    { id: 'repositories', label: 'Repositories', icon: 'settings' },
  ]

  return (
    <div className={`application ${mobileNavOpen ? 'nav-is-open' : ''}`}>
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span /></span><span>Relevance</span></div>
        <div className="repository-context"><span className="context-label">Selected repository</span><div><Icon name="github" size={17} /><strong>{repositoryName}</strong></div><span className="branch-name">{selectedRepository?.ref ?? 'Add a repository to begin'}</span></div>
        <nav>{navigation.map((item) => <button className={`nav-item ${page === item.id ? 'active' : ''}`} key={item.id} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.count !== undefined && <em>{item.count}</em>}</button>)}</nav>
        <div className="monitor-summary"><div><span className={`status-dot ${monitoringEnabled ? '' : 'paused'}`} /><strong>{monitoringEnabled ? 'Schedule preference on' : 'Manual scans only'}</strong></div><p>{monitoringEnabled ? `Every ${scanInterval.toLowerCase()} (preference only)` : 'Use Run scan to query the API'}</p></div>
        <div className="demo-note"><span>GitHub status</span><p>{selectedRepository?.github_connected ? `Connected for ${repositoryName}. Findings can be published as GitHub issues.` : selectedRepository ? `Not connected for ${repositoryName}. Configure GITHUB_TOKEN on the server to enable issue creation.` : 'Add a repository to start scanning.'}</p></div>
      </aside>

      <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />

      <header className="topbar">
        <button className="menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
        <div className="mobile-brand">Relevance</div>
        <div className="topbar-repository"><strong>{repositoryName}</strong><span>{lastScan}</span></div>
        <div className="topbar-monitor"><span className={`status-dot ${apiError ? 'paused' : ''}`} /><span>{apiError ? 'API unavailable' : 'Bot API linked'}</span></div>
        <button className="scan-button" type="button" onClick={runScan} disabled={scanning || !selectedRepository}>
          {scanning ? <span className="spinner" aria-hidden="true" /> : <Icon name="radar" size={17} />}
          {scanning ? 'Scanning…' : 'Run scan'}
        </button>
      </header>

      {page === 'overview' && <main className="content-page overview-page">
        <header className="page-header"><div><p className="eyebrow">Research workbench</p><h1>Review research relevant to {repositoryName}</h1><p>Inspect paper evidence, repository-specific inferences and suggested experiments before publishing a finding to GitHub.</p></div><div className="monitoring-state"><span className={`status-dot ${apiError ? 'paused' : ''}`} /><div><strong>{apiError ? 'API connection failed' : 'API connection ready'}</strong><span>{scanning ? scan.progress.stage : lastScan}</span></div></div></header>

        {apiError && <div className="api-message error" role="alert"><strong>Bot API unavailable</strong><span>{apiError}</span><button onClick={() => selectedRepository ? runScan() : setRepositoryReload((value) => value + 1)} disabled={scanning}>{selectedRepository ? 'Retry with a scan' : 'Retry repositories'}</button></div>}
        {selectedRepository && !selectedRepository.github_connected && <div className="api-message"><strong>GitHub not connected</strong><span>Scans and findings are available for {repositoryName}, but findings cannot be published as issues until GitHub credentials are configured on the API server.</span></div>}
        {scanning && scan && <ScanStatus scan={scan} />}

        <div className="overview-layout">
          <section className="activity-panel" aria-labelledby="activity-title">
            <div className="panel-heading"><div><p className="eyebrow">Shared API state</p><h2 id="activity-title">What the web app received</h2></div><span className="demo-label">Live metadata</span></div>
            <ol className="activity-timeline">
              <li><span className="activity-icon"><Icon name="github" size={16} /></span><div><strong>Repository selected</strong><p>{selectedRepository ? `Ref ${selectedRepository.ref}${selectedRepository.analysed_sha ? ` · analysed ${selectedRepository.analysed_sha.slice(0, 7)}` : ''}` : 'Add a repository from repository controls.'}</p></div><b>{repositoryName}</b></li>
              <li><span className="activity-icon"><Icon name="radar" size={16} /></span><div><strong>Project profile</strong><p>{projectProfile ? `${projectProfile.summary.slice(0, 140)}${projectProfile.summary.length > 140 ? '…' : ''}` : 'Run a scan to generate a repository profile from README, manifests, and source files.'}</p></div><b>{projectProfile ? `${projectProfile.key_files.length} files` : 'Pending'}</b></li>
              <li><span className="activity-icon"><Icon name="book" size={16} /></span><div><strong>Findings returned</strong><p>Records currently held by the shared store for this repository.</p></div><b>{findings.length}</b></li>
              <li><span className="activity-icon"><Icon name="github" size={16} /></span><div><strong>GitHub issues</strong><p>Findings published to GitHub for this repository.</p></div><b>{createdIssueCount}</b></li>
            </ol>
            <footer><Icon name="clock" size={15} /><span>{lastScan}</span><button onClick={() => navigate('repositories')}>View controls <Icon name="arrow" size={14} /></button></footer>
          </section>

          <aside className="run-summary" aria-label="Finding summary"><p className="eyebrow">Repository findings</p><strong className="summary-number">{findings.length}</strong><h2>{findings.length === 1 ? 'finding available' : 'findings available'}</h2><p>{findingsLoading ? `Loading findings for ${repositoryName}.` : findings.length > 0 ? `Research evaluated against ${repositoryName}.` : selectedRepository ? 'No findings are stored for this repository yet. Run a scan to analyse it.' : 'Add a repository before running a scan.'}</p><button onClick={() => findings.length > 0 ? navigate('discoveries') : selectedRepository ? runScan() : navigate('repositories')} disabled={scanning}>{findings.length > 0 ? 'Review findings' : selectedRepository ? 'Run first scan' : 'Add repository'} <Icon name="arrow" size={15} /></button></aside>
        </div>

        <section className="recent-findings" aria-labelledby="recent-title">
          <div className="section-title-row"><div><p className="eyebrow">Recent findings</p><h2 id="recent-title">Returned by the bot API</h2></div><button onClick={() => navigate('discoveries')}>View discoveries</button></div>
          <div className="recent-list">
            {findings.slice(0, 2).map((finding) => <button key={finding.id} onClick={() => selectFinding(finding.id)}><span className="finding-type">{findingTypeLabel(finding)}</span><strong>{finding.title}</strong><code>{finding.source.identifier}</code><Icon name="chevron" size={17} /></button>)}
            {!findingsLoading && findings.length === 0 && <div className="empty-state"><h2>{selectedRepository ? 'No scans yet' : 'No repository selected'}</h2><p>{selectedRepository ? `Run a scan to analyse ${repositoryName} and find relevant research.` : 'Add and select a repository before running a scan.'}</p><button onClick={selectedRepository ? runScan : () => navigate('repositories')}>{selectedRepository ? 'Run scan' : 'Add repository'}</button></div>}
          </div>
        </section>
      </main>}

      {page === 'discoveries' && <main className="content-page discoveries-page" id="discoveries">
        <div className="discoveries-shell">
          <header className="page-header discoveries-header">
            <div><p className="eyebrow">{repositoryName}</p><h1 id="discoveries-title">Discoveries</h1><p>Review paper claims separately from Relevance’s inferred connection to this repository.</p></div>
            <div className="finding-count"><strong>{visibleFindings.length}</strong><span>{visibleFindings.length === 1 ? 'finding' : 'findings'}</span></div>
          </header>

          {apiError && <div className="api-message error" role="alert"><strong>Feed unavailable</strong><span>{apiError}</span></div>}
          {selectedRepository && !selectedRepository.github_connected && <div className="api-message"><strong>GitHub not connected</strong><span>You can review and manage findings for {repositoryName}, but issue publishing is unavailable until GITHUB_TOKEN is configured.</span></div>}
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
            {findingsLoading ? <div className="empty-state"><span className="spinner" aria-hidden="true" /><h2>Loading findings</h2><p>Requesting findings for {repositoryName}.</p></div> : visibleFindings.length > 0 ? visibleFindings.map((finding) => {
              const status = finding.user_status
              const expanded = detailOpen && selected?.id === finding.id
              const firstAffectedFile = finding.affected_files[0]
              const issueActionDisabled = !selectedRepository?.github_connected || publishingFindingId !== null
              return <article className={`finding-row ${expanded ? 'selected' : ''}`} key={finding.id}>
                <div className="finding-row-main">
                  <div className="finding-heading"><span className="finding-type">{findingTypeLabel(finding)}</span><span className={`priority priority-${finding.severity}`}>{capitalise(finding.severity)} severity</span><span className={`strength ${finding.evidence_label === 'strong_match' ? 'strong' : ''}`}><Icon name="check" size={13} />{evidenceLabel(finding)}</span></div>
                  <button className="insight-link" onClick={() => expanded ? setDetailOpen(false) : selectFinding(finding.id)} aria-expanded={expanded} aria-controls={`finding-detail-${finding.id}`}><h2>{finding.title}</h2></button>
                  <p className="paper-meta"><a href={finding.source.url} target="_blank" rel="noreferrer">{finding.source.identifier}<Icon name="external" size={12} /></a><span>{authorLabel(finding.source.authors)} · {formatDate(finding.source.published_at)}</span></p>
                  <p className="why-relevant"><strong>Why Relevance flagged it · inference</strong>{finding.why_relevant}</p>
                  <div className="finding-footer">
                    {firstAffectedFile && selectedRepository ? <a className="affected-file" href={repositoryFileUrl(selectedRepository, firstAffectedFile.path)} target="_blank" rel="noreferrer"><code>{firstAffectedFile.path}</code>{finding.affected_files.length > 1 && <span>+{finding.affected_files.length - 1} more</span>}<Icon name="external" size={12} /></a> : <span className="affected-file">No affected files identified</span>}
                    <div className="finding-actions">
                      <button className="primary-action" onClick={() => expanded ? setDetailOpen(false) : selectFinding(finding.id)}>{expanded ? 'Hide evidence' : 'View evidence'}</button>
                      <button className={status === 'saved' ? 'active' : ''} onClick={() => updateFindingStatus(finding.id, status === 'saved' ? 'new' : 'saved')} disabled={updatingFindingId !== null}><Icon name="bookmark" size={15} />{updatingFindingId === finding.id ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save'}</button>
                      <button onClick={() => updateFindingStatus(finding.id, status === 'dismissed' ? 'new' : 'dismissed')} disabled={updatingFindingId !== null}><Icon name="close" size={15} />{updatingFindingId === finding.id ? 'Updating…' : status === 'dismissed' ? 'Restore' : 'Dismiss'}</button>
                      {finding.issue.state === 'created' ? finding.issue.url ? <a href={finding.issue.url} target="_blank" rel="noreferrer"><Icon name="github" size={15} />Open on GitHub</a> : <button disabled><Icon name="github" size={15} />Issue created</button> : <button onClick={() => approveIssue(finding)} disabled={issueActionDisabled} title={!selectedRepository?.github_connected ? 'Connect GitHub to publish this finding' : undefined}><Icon name="github" size={15} />{publishingFindingId === finding.id ? 'Creating…' : finding.issue.state === 'failed' ? 'Retry GitHub issue' : 'Create GitHub issue'}</button>}
                    </div>
                  </div>
                </div>

                {expanded && <div className="finding-detail" id={`finding-detail-${finding.id}`}>
                  <header className="detail-intro"><div><p className="eyebrow">Finding evidence</p><h3>{finding.title}</h3><p>{finding.source.identifier} · {formatDate(finding.source.published_at)} · analysed {finding.analysed_sha.slice(0, 7)}</p></div><button className="detail-close" onClick={() => setDetailOpen(false)} aria-label="Close evidence"><Icon name="close" size={17} /></button></header>
                  <div className="detail-grid">
                    <section className="detail-section"><div className="section-heading"><h3>Paper summary</h3><span>Source claim</span></div><p>{finding.summary}</p></section>
                    <section className="detail-section"><div className="section-heading"><h3>Why Relevance flagged it</h3><span>Inference</span></div><p>{finding.why_relevant}</p></section>
                    {finding.affected_files.length > 0 ? finding.affected_files.map((file) => <section className="detail-section detail-code wide" key={file.path}><div className="section-heading"><h3>Affected file</h3>{selectedRepository && <a href={repositoryFileUrl(selectedRepository, file.path)} target="_blank" rel="noreferrer"><code>{file.path}</code><Icon name="external" size={12} /></a>}</div><pre><span>{file.excerpt}</span></pre></section>) : <section className="detail-section wide"><div className="section-heading"><h3>Affected implementation</h3><span>None identified</span></div><p>This finding does not identify a specific repository file.</p></section>}
                    <section className="detail-section source-evidence wide"><h3>Source evidence</h3><p><strong>{authorLabel(finding.source.authors)}</strong>. The paper metadata and summary are attributed to the source. Relevance’s repository connection above is an inference and needs verification.</p><a href={finding.source.url} target="_blank" rel="noreferrer">Verify at {finding.source.identifier}<Icon name="external" size={12} /></a></section>
                    <section className="detail-section experiment wide"><div className="section-heading"><h3>Suggested experiment</h3><span>Needs verification</span></div><p>{finding.suggested_action}</p></section>
                    <section className="detail-section wide"><div className="section-heading"><h3>Publication status</h3><span>{finding.issue.state === 'created' ? 'Published' : finding.issue.state === 'failed' ? 'Failed' : 'Not published'}</span></div><p>{finding.issue.state === 'created' ? `Published as GitHub issue${finding.issue.number ? ` #${finding.issue.number}` : ''} on ${formatDate(finding.issue.created_at)}.` : finding.issue.state === 'failed' ? finding.issue.error ?? 'GitHub issue creation failed without an error message.' : selectedRepository?.github_connected ? 'This finding has not been published to GitHub.' : 'GitHub is not connected for this repository, so this finding cannot be published yet.'}</p>{finding.issue.url && <a href={finding.issue.url} target="_blank" rel="noreferrer">Open GitHub issue <Icon name="external" size={12} /></a>}</section>
                  </div>
                  <footer className="detail-actions"><a href={finding.source.url} target="_blank" rel="noreferrer">Open paper <Icon name="external" size={14} /></a>{repositoryUrl && <a href={repositoryUrl} target="_blank" rel="noreferrer">Open repository <Icon name="external" size={14} /></a>}{finding.issue.state !== 'created' && <button onClick={() => approveIssue(finding)} disabled={issueActionDisabled}><Icon name="github" size={15} />{publishingFindingId === finding.id ? 'Creating…' : finding.issue.state === 'failed' ? 'Retry GitHub issue' : 'Create GitHub issue'}</button>}</footer>
                </div>}
              </article>
            }) : <div className="empty-state"><Icon name="search" size={24} /><h2>{!selectedRepository ? 'No repository selected' : findings.length === 0 ? 'No scans yet' : 'No findings match these filters'}</h2><p>{!selectedRepository ? 'Add and select a repository to view its findings.' : findings.length === 0 ? `Run a scan to find research relevant to ${repositoryName}.` : 'Dismissed findings remain recoverable through the status filter.'}</p><button onClick={!selectedRepository ? () => navigate('repositories') : findings.length === 0 ? runScan : clearFilters}>{!selectedRepository ? 'Add repository' : findings.length === 0 ? 'Run scan' : 'Clear filters'}</button></div>}
          </section>
        </div>
      </main>}

      {page === 'repositories' && <main className="content-page repositories-page">
        <header className="page-header"><div><p className="eyebrow">Repository controls</p><h1>Repositories and monitoring</h1><p>Add repositories through the API and choose which one to scan and review.</p></div><span className="demo-label">API repositories</span></header>
        <div className="settings-layout">
          <section className="settings-panel repository-list-panel">
            <div className="panel-heading"><div><h2>Connected repositories</h2><p>Repositories available to this Relevance workspace.</p></div><span>{repositories.length}</span></div>
            <div className="repository-list">{repositoriesLoading ? <div className="empty-state"><span className="spinner" aria-hidden="true" /><h2>Loading repositories</h2></div> : repositories.length > 0 ? repositories.map((item) => {
              const selected = selectedRepository !== null && repositoryKey(item) === repositoryKey(selectedRepository)
              return <article key={repositoryKey(item)}><span className="repository-icon"><Icon name="github" /></span><div><strong>{item.owner}/{item.repo}</strong><p>Ref {item.ref} · {item.github_connected ? 'GitHub connected' : 'GitHub not connected'}{item.analysed_sha ? ` · analysed ${item.analysed_sha.slice(0, 7)}` : ''}</p></div><button type="button" className={`connection-status ${selected ? '' : 'pending'}`} onClick={() => selectRepository(item)} disabled={selected}>{selected ? 'Selected' : 'Select'}</button></article>
            }) : <div className="empty-state"><h2>No repositories connected</h2><p>Add a repository below to begin.</p></div>}</div>
            <form className="connect-form" onSubmit={connectRepository}><label htmlFor="repository-url">Add another repository</label><div><input id="repository-url" value={repositoryInput} onChange={(event) => setRepositoryInput(event.target.value)} placeholder="owner/repository" disabled={addingRepository} /><input value={repositoryRefInput} onChange={(event) => setRepositoryRefInput(event.target.value)} placeholder="branch or ref" aria-label="Branch or ref" disabled={addingRepository} /><button type="submit" disabled={addingRepository}><Icon name="plus" size={16} />{addingRepository ? 'Adding…' : 'Add repository'}</button></div><small>The repository is persisted by the API and selected after it is added. Set GITHUB_TOKEN on the server to enable private repository access and GitHub issue creation.</small></form>
          </section>

          <section className="settings-panel monitoring-panel">
            <div className="panel-heading"><div><h2>Monitoring preferences</h2><p>These controls are local preferences; the bot API only supports manual scans.</p></div><label className="switch"><input type="checkbox" checked={monitoringEnabled} onChange={(event) => setMonitoringEnabled(event.target.checked)} /><span /><b>{monitoringEnabled ? 'Preferred' : 'Off'}</b></label></div>
            <div className="settings-fields">
              <label><span>Preferred interval</span><select value={scanInterval} onChange={(event) => setScanInterval(event.target.value)} disabled={!monitoringEnabled}><option>6 hours</option><option>12 hours</option><option>24 hours</option><option>7 days</option></select><small>No background worker consumes this preference.</small></label>
              <fieldset><legend>Research categories</legend>{Object.entries(topics).map(([topic, enabled]) => <label className="checkbox-row" key={topic}><input type="checkbox" checked={enabled} onChange={(event) => setTopics((current) => ({ ...current, [topic]: event.target.checked }))} /><span><strong>{topic}</strong><small>{topic === 'cs.AI' ? 'Artificial Intelligence' : topic === 'cs.CL' ? 'Computation and Language' : 'Machine Learning'}</small></span></label>)}</fieldset>
              <label><span>Notification threshold</span><select value={threshold} onChange={(event) => setThreshold(event.target.value)}><option>Strong matches only</option><option>Strong and worth reviewing</option><option>All evaluated findings</option></select><small>Browser-only preference; it does not filter bot API generation.</small></label>
              <label className="checkbox-row publishing-control"><input type="checkbox" checked={confirmIssueCreation} onChange={(event) => setConfirmIssueCreation(event.target.checked)} /><span><strong>Confirm GitHub issue creation</strong><small>{confirmIssueCreation ? 'Ask before publishing each finding to GitHub.' : 'Publish immediately when Create GitHub issue is selected.'}</small></span></label>
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
  const steps = ['Queued', 'Evaluating repository & papers', 'Complete']
  const currentIndex = scan.status === 'queued' ? 0 : scan.status === 'running' ? 1 : 2
  return <div className="scan-status" role="status" aria-live="polite"><div className="scan-status-copy"><span className="spinner" aria-hidden="true" /><strong>{scan.progress.stage}</strong><span>{scan.progress.completed_steps} of {scan.progress.total_steps} API steps complete</span></div><ol aria-label="Scan progress">{steps.map((item, index) => <li key={item} className={index === currentIndex ? 'current' : ''}>{item}</li>)}</ol></div>
}

export default Application
