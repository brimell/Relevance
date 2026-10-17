import { useMemo, useState, type FormEvent } from 'react'
import './application.css'

type IconName =
  | 'activity'
  | 'arrow'
  | 'check'
  | 'chevron'
  | 'close'
  | 'code'
  | 'comment'
  | 'github'
  | 'issue'
  | 'menu'
  | 'plus'
  | 'search'
  | 'settings'
  | 'spark'
  | 'tag'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <><path d="M3 12h3l2-7 4 14 2-7h7" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    chevron: <><path d="m8 10 4 4 4-4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    code: <><path d="m9 18-6-6 6-6M15 6l6 6-6 6" /></>,
    comment: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /></>,
    github: <><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.36-1.18-3.36-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.54 9.54 0 0 1 5 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.56 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></>,
    issue: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.55 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.4v-4h.09A1.7 1.7 0 0 0 4.2 8.55a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.55 4.2a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.4h4v.09A1.7 1.7 0 0 0 15 4.2a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.55c.38.28.82.42 1.29.42h.09v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4ZM18.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7Z" /></>,
    tag: <><path d="M20 13 13 20l-9-9V4h7Z" /><path d="M8.5 8.5h.01" /></>,
  }
  return <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

type Status = 'open' | 'resolved'
type Label = 'research' | 'performance' | 'security' | 'architecture' | 'discussion'

type Issue = {
  id: number
  title: string
  summary: string
  body: string
  author: string
  avatar: string
  status: Status
  labels: Label[]
  comments: number
  votes: number
  time: string
  file?: string
  confidence?: number
}

const initialIssues: Issue[] = [
  {
    id: 42,
    title: 'Adaptive chunking could improve retrieval quality',
    summary: 'A new paper maps directly to the fixed-size segmentation in our retrieval pipeline.',
    body: 'The current retriever splits every document at 512 tokens, including code blocks and section boundaries. Recent work on context-aware segmentation reports stronger retrieval performance while preserving semantic structure.',
    author: 'relevance[bot]', avatar: 'R', status: 'open', labels: ['research', 'performance'], comments: 8, votes: 24, time: '12 min ago', file: 'src/retrieval/chunk.ts:48', confidence: 92,
  },
  {
    id: 41,
    title: 'Evaluate prompt injection defenses for indexed documents',
    summary: 'Untrusted repository content currently enters the context window without a trust boundary.',
    body: 'The indexing pipeline treats documentation and issue content as trusted instructions. This discussion tracks options for separating data from instructions before expanding repository ingestion.',
    author: 'Maya Chen', avatar: 'MC', status: 'open', labels: ['security', 'discussion'], comments: 12, votes: 31, time: '1 hr ago', file: 'src/context/build.ts:112', confidence: 88,
  },
  {
    id: 39,
    title: 'Cache paper embeddings between scheduled scans',
    summary: 'Repeated embedding work is the largest cost in the nightly research scan.',
    body: 'Paper embeddings only need to change when the source abstract changes. We should persist them by arXiv identifier and content hash, then only embed new or revised records.',
    author: 'Noah Williams', avatar: 'NW', status: 'open', labels: ['performance', 'architecture'], comments: 5, votes: 17, time: 'Yesterday', file: 'src/matching/embed.ts:27', confidence: 84,
  },
  {
    id: 38,
    title: 'Show evidence quality separately from match confidence',
    summary: 'A strong semantic match does not always mean the underlying claim is well supported.',
    body: 'The finding card currently combines relevance and evidence into one score. Splitting those measures will make uncertainty clearer and help reviewers prioritize what needs verification.',
    author: 'Afonso F.', avatar: 'AF', status: 'open', labels: ['discussion', 'research'], comments: 9, votes: 28, time: '2 days ago', confidence: 78,
  },
  {
    id: 35,
    title: 'Add repository language detection to project profiles',
    summary: 'Language-aware profiles now improve source selection and paper matching.',
    body: 'Implemented language detection using repository metadata and file extensions. The top languages are included in project profiles and used during candidate ranking.',
    author: 'relevance[bot]', avatar: 'R', status: 'resolved', labels: ['architecture'], comments: 3, votes: 11, time: '4 days ago', file: 'src/profile/languages.ts', confidence: 96,
  },
]

const labelNames: Record<Label, string> = {
  research: 'Research', performance: 'Performance', security: 'Security', architecture: 'Architecture', discussion: 'Discussion',
}

function Application() {
  const [issues, setIssues] = useState(initialIssues)
  const [selectedId, setSelectedId] = useState(42)
  const [status, setStatus] = useState<'all' | Status>('open')
  const [activeLabel, setActiveLabel] = useState<Label | null>(null)
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [newIssueOpen, setNewIssueOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [commentPosted, setCommentPosted] = useState(false)

  const filteredIssues = useMemo(() => issues.filter((issue) => {
    const matchesStatus = status === 'all' || issue.status === status
    const matchesLabel = !activeLabel || issue.labels.includes(activeLabel)
    const text = `${issue.title} ${issue.summary}`.toLowerCase()
    return matchesStatus && matchesLabel && text.includes(query.toLowerCase())
  }), [issues, status, activeLabel, query])

  const selected = issues.find((issue) => issue.id === selectedId) ?? filteredIssues[0]
  const openCount = issues.filter((issue) => issue.status === 'open').length
  const resolvedCount = issues.filter((issue) => issue.status === 'resolved').length

  function selectIssue(id: number) {
    setSelectedId(id)
    setDetailOpen(true)
  }

  function createIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') || '').trim()
    const body = String(data.get('body') || '').trim()
    if (!title || !body) return
    const id = Math.max(...issues.map((issue) => issue.id)) + 1
    setIssues((current) => [{ id, title, summary: body, body, author: 'You', avatar: 'YO', status: 'open', labels: ['discussion'], comments: 0, votes: 1, time: 'Just now' }, ...current])
    setSelectedId(id)
    setStatus('open')
    setActiveLabel(null)
    setNewIssueOpen(false)
    setDetailOpen(true)
  }

  function postComment(event: FormEvent) {
    event.preventDefault()
    if (!comment.trim() || !selected) return
    setIssues((current) => current.map((issue) => issue.id === selected.id ? { ...issue, comments: issue.comments + 1 } : issue))
    setComment('')
    setCommentPosted(true)
  }

  return (
    <div className={`application ${sidebarOpen ? 'sidebar-is-open' : ''} ${detailOpen ? 'detail-is-open' : ''}`}>
      <header className="app-topbar">
        <div className="topbar-brand">
          <button className="mobile-icon" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <a className="app-wordmark" href="/">RLV<span>.</span></a>
          <div className="topbar-divider" />
          <button className="repo-switcher"><Icon name="github" /><strong>acme / rag-engine</strong><Icon name="chevron" size={15} /></button>
        </div>
        <div className="topbar-actions">
          <div className="scan-pill"><span /><span className="scan-copy">Last scan completed · 12m</span></div>
          <button className="icon-button" aria-label="Settings"><Icon name="settings" /></button>
          <button className="avatar-button">BR</button>
        </div>
      </header>

      <aside className="app-sidebar">
        <div className="sidebar-mobile-head"><a className="app-wordmark" href="/">RLV<span>.</span></a><button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><Icon name="close" /></button></div>
        <nav className="main-nav" aria-label="Application navigation">
          <span className="nav-heading">Workspace</span>
          <button className="active"><Icon name="issue" /><span>Issues</span><em>{openCount}</em></button>
          <button><Icon name="activity" /><span>Scan activity</span></button>
          <button><Icon name="code" /><span>Project profile</span></button>
          <button><Icon name="tag" /><span>Research topics</span></button>
        </nav>
        <div className="sidebar-section">
          <div className="sidebar-section-title"><span>Labels</span><button aria-label="Add label"><Icon name="plus" size={15} /></button></div>
          {(Object.keys(labelNames) as Label[]).map((label) => (
            <button className={`label-filter ${activeLabel === label ? 'active' : ''}`} key={label} onClick={() => setActiveLabel(activeLabel === label ? null : label)}>
              <i className={`label-dot ${label}`} />{labelNames[label]}
              <span>{issues.filter((issue) => issue.labels.includes(label)).length}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-card">
          <div className="bot-mark"><Icon name="spark" /></div>
          <div><strong>Research monitor</strong><p>Watching 8 topics across 3 feeds.</p></div>
          <button>Configure <Icon name="arrow" size={14} /></button>
        </div>
      </aside>

      <main className="issues-workspace">
        <section className="issues-list-pane">
          <header className="issues-header">
            <div><p className="overline">Repository workspace</p><h1>Issues</h1><p>Research findings and team discussions.</p></div>
            <button className="primary-button" onClick={() => setNewIssueOpen(true)}><Icon name="plus" size={17} /> New issue</button>
          </header>

          <div className="issue-toolbar">
            <div className="status-tabs">
              <button className={status === 'open' ? 'active' : ''} onClick={() => setStatus('open')}><Icon name="issue" size={16} /> Open <span>{openCount}</span></button>
              <button className={status === 'resolved' ? 'active' : ''} onClick={() => setStatus('resolved')}><Icon name="check" size={16} /> Resolved <span>{resolvedCount}</span></button>
              <button className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')}>All</button>
            </div>
            <label className="issue-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issues…" /></label>
          </div>

          {activeLabel && <div className="active-filter">Filtered by <span><i className={`label-dot ${activeLabel}`} />{labelNames[activeLabel]}</span><button onClick={() => setActiveLabel(null)}>Clear <Icon name="close" size={13} /></button></div>}

          <div className="issue-list">
            {filteredIssues.length ? filteredIssues.map((issue) => (
              <article key={issue.id} className={`issue-row ${selected?.id === issue.id ? 'selected' : ''}`} onClick={() => selectIssue(issue.id)}>
                <div className={`status-icon ${issue.status}`}><Icon name={issue.status === 'open' ? 'issue' : 'check'} size={18} /></div>
                <div className="issue-row-main">
                  <div className="issue-row-title"><h2>{issue.title}</h2>{issue.confidence && <span className="match-score"><Icon name="spark" size={12} /> {issue.confidence}% match</span>}</div>
                  <p>{issue.summary}</p>
                  <div className="issue-row-meta"><span>#{issue.id}</span><span>opened {issue.time} by {issue.author}</span>{issue.labels.map((label) => <span className={`issue-label ${label}`} key={label}>{labelNames[label]}</span>)}</div>
                </div>
                <div className="issue-stats"><span title="Votes">↑ {issue.votes}</span><span><Icon name="comment" size={14} /> {issue.comments}</span></div>
              </article>
            )) : <div className="empty-list"><div><Icon name="search" size={24} /></div><h2>No issues found</h2><p>Try changing your filters or search query.</p></div>}
          </div>
        </section>

        {selected && <aside className="issue-detail">
          <div className="detail-mobile-head"><button onClick={() => setDetailOpen(false)}><span>←</span> All issues</button><button className="icon-button" onClick={() => setDetailOpen(false)} aria-label="Close issue"><Icon name="close" /></button></div>
          <header className="detail-header">
            <div className="detail-kicker"><span className={`state-badge ${selected.status}`}><Icon name={selected.status === 'open' ? 'issue' : 'check'} size={14} /> {selected.status}</span><span>#{selected.id}</span></div>
            <h2>{selected.title}</h2>
            <p>Opened {selected.time} by <strong>{selected.author}</strong></p>
            <div className="detail-labels">{selected.labels.map((label) => <span className={`issue-label ${label}`} key={label}>{labelNames[label]}</span>)}</div>
          </header>
          <div className="detail-scroll">
            <article className="post-card">
              <div className="post-author"><span className={`post-avatar ${selected.author.includes('bot') ? 'bot' : ''}`}>{selected.avatar}</span><div><strong>{selected.author}</strong>{selected.author.includes('bot') && <em>BOT</em>}<span>opened this issue</span></div><button>•••</button></div>
              <div className="post-content"><p>{selected.body}</p>
                {selected.confidence && <div className="evidence-card"><div className="evidence-title"><span><Icon name="spark" size={15} /> Relevance evidence</span><strong>{selected.confidence}% match</strong></div>{selected.file && <div className="file-reference"><Icon name="code" size={15} /><code>{selected.file}</code><Icon name="arrow" size={14} /></div>}<p>Suggested next step: validate the finding against the current implementation and evaluation set before adopting the change.</p><a href="https://arxiv.org" target="_blank" rel="noreferrer">View paper and sources <Icon name="arrow" size={14} /></a></div>}
              </div>
              <div className="post-reactions"><button>↑ <span>{selected.votes}</span></button><button>Useful</button><button>Needs evidence</button></div>
            </article>
            <div className="discussion-divider"><span>{selected.comments} {selected.comments === 1 ? 'reply' : 'replies'}</span></div>
            <article className="reply-card"><span className="post-avatar blue">AF</span><div><header><strong>Afonso F.</strong><span>8 minutes ago</span></header><p>This looks actionable. I’d benchmark it against our current baseline first and track latency alongside retrieval quality.</p><div><button>↑ 6</button><button>Reply</button></div></div></article>
            {commentPosted && <article className="reply-card new-reply"><span className="post-avatar">YO</span><div><header><strong>You</strong><span>just now</span></header><p>Added a new reply to this discussion.</p></div></article>}
          </div>
          <form className="reply-composer" onSubmit={postComment}><div className="reply-avatar">BR</div><div><textarea value={comment} onChange={(event) => { setComment(event.target.value); setCommentPosted(false) }} placeholder="Add to the discussion…" rows={3} /><footer><span>Markdown supported</span><button disabled={!comment.trim()}>Comment</button></footer></div></form>
        </aside>}
      </main>

      <button className="app-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />

      {newIssueOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setNewIssueOpen(false)}><section className="new-issue-modal" role="dialog" aria-modal="true" aria-labelledby="new-issue-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="modal-icon"><Icon name="issue" /></span><div><h2 id="new-issue-title">Create a new issue</h2><p>Start a discussion for this repository.</p></div></div><button className="icon-button" onClick={() => setNewIssueOpen(false)} aria-label="Close"><Icon name="close" /></button></header><form onSubmit={createIssue}><label>Title<input name="title" autoFocus required placeholder="What should the team discuss?" /></label><label>Description<textarea name="body" required rows={7} placeholder="Share context, evidence, and a suggested next step…" /></label><div className="modal-note"><Icon name="spark" size={16} /><span>Relevance will connect supporting research after the next scan.</span></div><footer><button type="button" className="cancel-button" onClick={() => setNewIssueOpen(false)}>Cancel</button><button className="primary-button" type="submit">Create issue <Icon name="arrow" size={16} /></button></footer></form></section></div>}
    </div>
  )
}

export default Application
