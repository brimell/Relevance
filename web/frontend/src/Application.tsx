import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import './application.css'

type IconName =
  | 'archive'
  | 'arrow'
  | 'check'
  | 'chevron'
  | 'close'
  | 'code'
  | 'copy'
  | 'document'
  | 'github'
  | 'menu'
  | 'new'
  | 'panel'
  | 'paperclip'
  | 'search'
  | 'send'
  | 'settings'
  | 'spark'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    archive: <><path d="M4 7.5h16v12H4z" /><path d="M3 4.5h18v3H3zM9 11h6" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    code: <><path d="m9 18-6-6 6-6M15 6l6 6-6 6" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" /><path d="M16 8V5H5v11h3" /></>,
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>,
    github: <path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.65-.2.65-.46v-1.82c-2.62.57-3.18-1.12-3.18-1.12-.43-1.1-1.05-1.39-1.05-1.39-.86-.59.07-.58.07-.58.95.07 1.46.98 1.46.98.84 1.46 2.22 1.03 2.76.79.08-.62.33-1.04.6-1.28-2.1-.24-4.3-1.05-4.3-4.69 0-1.03.37-1.88.98-2.55-.1-.24-.43-1.2.09-2.52 0 0 .8-.25 2.6.98a8.95 8.95 0 0 1 4.72 0c1.8-1.23 2.59-.98 2.59-.98.52 1.32.19 2.28.09 2.52.61.67.98 1.52.98 2.55 0 3.64-2.21 4.44-4.31 4.68.34.29.64.87.64 1.77v2.61c0 .26.17.56.65.46A9.5 9.5 0 0 0 12 2.5Z" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    new: <path d="M12 5v14M5 12h14" />,
    panel: <><rect x="3" y="4" width="18" height="16" /><path d="M15 4v16" /></>,
    paperclip: <path d="m8.5 12.5 5.8-5.8a3 3 0 0 1 4.2 4.2l-7.2 7.2a5 5 0 0 1-7.1-7.1l7.1-7.1" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    send: <><path d="m4 4 17 8-17 8 3-8z" /><path d="M7 12h14" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.6a7 7 0 0 0-.7-1.7l1-1.9-2.1-2.1-1.9 1a7 7 0 0 0-1.7-.7L11 2.5H8l-.6 2a7 7 0 0 0-1.7.7l-1.9-1-2.1 2.1 1 1.9a7 7 0 0 0-.7 1.7l-2 .6v3l2 .6a7 7 0 0 0 .7 1.7l-1 1.9 2.1 2.1 1.9-1a7 7 0 0 0 1.7.7l.6 2h3l.6-2a7 7 0 0 0 1.7-.7l1.9 1 2.1-2.1-1-1.9a7 7 0 0 0 .7-1.7z" transform="translate(1.5) scale(.87)" /></>,
    spark: <path d="M12 2.5c.6 5.4 3.1 8 8 8.5-4.9.5-7.4 3.1-8 8.5-.6-5.4-3.1-8-8-8.5 4.9-.5 7.4-3.1 8-8.5Z" />,
  }

  return <svg className="ui-icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">{paths[name]}</svg>
}

type Conversation = {
  id: number
  title: string
  date: string
  preview: string
}

type Message = {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const initialConversations: Conversation[] = [
  { id: 1, title: 'Improve retrieval accuracy', date: 'Today', preview: 'Compare our chunking approach…' },
  { id: 2, title: 'Recent work on reranking', date: 'Yesterday', preview: 'Research connected to eval.ts' },
  { id: 3, title: 'Evaluate GraphRAG', date: '12 Oct', preview: 'Trade-offs for our current graph…' },
  { id: 4, title: 'Embedding model options', date: '9 Oct', preview: 'A review of three recent models' },
]

const starterPrompts = [
  'What new research could improve our retrieval quality?',
  'Find assumptions in this repository that recent work challenges.',
  'Compare our evaluation setup with current best practice.',
]

function EvidenceBlock({ onOpenSource }: { onOpenSource: (source: string) => void }) {
  return (
    <div className="evidence-block">
      <div className="evidence-heading">
        <span>Strongest connection</span>
        <span className="confidence">HIGH CONFIDENCE</span>
      </div>
      <h3>Structure-aware chunking may improve retrieval quality</h3>
      <p>
        Your pipeline splits documents at a fixed 512-token boundary. That can separate headings from their content and break code blocks midway through a function. A recent evaluation found that chunking around semantic structure improved retrieval on mixed technical documents.
      </p>
      <div className="comparison">
        <div>
          <span>YOUR IMPLEMENTATION</span>
          <button onClick={() => onOpenSource('chunk.ts')}><Icon name="code" size={15} /> src/retrieval/chunk.ts:48</button>
          <code>splitByTokens(document, 512)</code>
        </div>
        <div>
          <span>RESEARCH DIRECTION</span>
          <button onClick={() => onOpenSource('paper')}><Icon name="document" size={15} /> Chen et al. · 2026</button>
          <p>Preserve section and code boundaries before applying the token limit.</p>
        </div>
      </div>
      <div className="recommendation">
        <span>Suggested experiment</span>
        <p>Run both chunkers against the existing 240-query evaluation set. Compare recall@10 and inspect failures on documents containing code.</p>
      </div>
    </div>
  )
}

function Application() {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeConversation, setActiveConversation] = useState(1)
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'user', content: 'What new research could improve our retrieval quality? Focus on changes we can test this week.' },
    { id: 2, role: 'assistant', content: 'I compared the retrieval pipeline, evaluation scripts, and current dependencies against 186 papers published in the last 90 days. One connection is strong enough to test now; two others need more evidence.' },
  ])
  const [draft, setDraft] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const [activeSource, setActiveSource] = useState('chunk.ts')
  const [copied, setCopied] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRequested = useRef(false)

  const conversation = conversations.find((item) => item.id === activeConversation)

  useEffect(() => {
    if (scrollRequested.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isThinking])

  useEffect(() => {
    const compactViewport = window.matchMedia('(max-width: 930px)')
    const closeContextOnCompact = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setContextOpen(false)
    }
    closeContextOnCompact(compactViewport)
    compactViewport.addEventListener('change', closeContextOnCompact)
    return () => compactViewport.removeEventListener('change', closeContextOnCompact)
  }, [])

  function startNewAnalysis(prompt = '') {
    const nextId = Math.max(...conversations.map((item) => item.id), 0) + 1
    const title = prompt ? prompt.replace(/[?.]/g, '').slice(0, 42) : 'New research question'
    setConversations((items) => [{ id: nextId, title, date: 'Now', preview: 'No messages yet' }, ...items])
    setActiveConversation(nextId)
    setMessages([])
    setDraft(prompt)
    setSidebarOpen(false)
    setContextOpen(false)
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus())
  }

  function chooseConversation(id: number) {
    setActiveConversation(id)
    setSidebarOpen(false)
    if (id === 1) {
      setMessages([
        { id: 1, role: 'user', content: 'What new research could improve our retrieval quality? Focus on changes we can test this week.' },
        { id: 2, role: 'assistant', content: 'I compared the retrieval pipeline, evaluation scripts, and current dependencies against 186 papers published in the last 90 days. One connection is strong enough to test now; two others need more evidence.' },
      ])
    } else {
      setMessages([
        { id: 1, role: 'user', content: conversations.find((item) => item.id === id)?.title ?? 'Research this repository' },
        { id: 2, role: 'assistant', content: 'This is a saved analysis thread. Connect the research service to restore its full evidence and citations.' },
      ])
    }
  }

  function sendMessage(event?: FormEvent) {
    event?.preventDefault()
    const message = draft.trim()
    if (!message || isThinking) return
    const userMessage: Message = { id: Date.now(), role: 'user', content: message }
    scrollRequested.current = true
    setMessages((items) => [...items, userMessage])
    setConversations((items) => items.map((item) => item.id === activeConversation ? { ...item, title: item.preview === 'No messages yet' ? message.slice(0, 42) : item.title, preview: message.slice(0, 54) } : item))
    setDraft('')
    setIsThinking(true)
    window.setTimeout(() => {
      setMessages((items) => [...items, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I have the question and repository scope. This scaffold is ready to pass it to the research service; once connected, the response will stream here with file references and paper citations.',
      }])
      setIsThinking(false)
    }, 900)
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  function openSource(source: string) {
    setActiveSource(source)
    setContextOpen(true)
  }

  async function copyAnswer() {
    await navigator.clipboard?.writeText('Structure-aware chunking may improve retrieval quality. Test semantic boundaries against the current 512-token chunker using recall@10.')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`application ${sidebarOpen ? 'sidebar-is-open' : ''} ${contextOpen ? '' : 'context-is-closed'}`}>
      <header className="app-topbar">
        <div className="topbar-leading">
          <button className="icon-button mobile-menu" aria-label="Open conversations" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
          <a className="app-wordmark" href="/" aria-label="Relevance home">RLV<span>.</span></a>
          <div className="repo-switcher">
            <Icon name="github" size={16} />
            <span>acme / rag-engine</span>
            <Icon name="chevron" size={14} />
          </div>
        </div>
        <div className="topbar-actions">
          <span className="scan-status"><Icon name="check" size={14} /> Indexed 14 Oct</span>
          <button className="scan-button"><Icon name="spark" size={16} /> Scan repository</button>
          <button className="icon-button" aria-label="Settings"><Icon name="settings" /></button>
          <button className="avatar-button" aria-label="Account menu">BR</button>
        </div>
      </header>

      {sidebarOpen && <button className="app-scrim" aria-label="Close conversations" onClick={() => setSidebarOpen(false)} />}

      <aside className="conversation-sidebar" aria-label="Research conversations">
        <div className="sidebar-mobile-heading">
          <span>Conversations</span>
          <button className="icon-button" aria-label="Close conversations" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button>
        </div>
        <button className="new-analysis" onClick={() => startNewAnalysis()}><Icon name="new" size={17} /> New analysis</button>
        <button className="sidebar-search"><Icon name="search" size={16} /><span>Search conversations</span><kbd>⌘ K</kbd></button>

        <div className="conversation-list">
          <span className="sidebar-label">Conversations</span>
          {conversations.map((item) => (
            <button key={item.id} className={item.id === activeConversation ? 'conversation-item active' : 'conversation-item'} onClick={() => chooseConversation(item.id)}>
              <span>{item.title}</span>
              <small>{item.date}</small>
              <p>{item.preview}</p>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div><span>Repository scope</span><strong>1,248 files</strong></div>
          <div><span>Research index</span><strong>Updated daily</strong></div>
          <a href="/"><Icon name="arrow" size={16} /> Back to website</a>
        </div>
      </aside>

      <main className="chat-workspace">
        <header className="chat-header">
          <div>
            <span className="mobile-repo">acme / rag-engine</span>
            <h1>{conversation?.title ?? 'New analysis'}</h1>
            <p>{activeConversation === 1 ? 'Repository research · 3 sources' : messages.length === 0 ? 'Repository research · Ready' : 'Repository research · Context attached'}</p>
          </div>
          <div className="chat-header-actions">
            <button className={contextOpen ? 'icon-button active' : 'icon-button'} aria-label="Toggle evidence panel" onClick={() => setContextOpen((open) => !open)}><Icon name="panel" /></button>
            <button className="icon-button" aria-label="Archive conversation"><Icon name="archive" /></button>
          </div>
        </header>

        <div className="message-scroll">
          <div className="message-column">
            {messages.length === 0 ? (
              <section className="empty-state">
                <div className="empty-mark">R</div>
                <span>Ask Relevance</span>
                <h1>What should we investigate?</h1>
                <p>Ask about an implementation decision, a technical constraint, or recent research connected to this repository.</p>
                <div className="starter-prompts">
                  {starterPrompts.map((prompt) => <button key={prompt} onClick={() => setDraft(prompt)}>{prompt}<Icon name="arrow" size={16} /></button>)}
                </div>
              </section>
            ) : (
              messages.map((message, index) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-author">{message.role === 'assistant' ? <span className="relevance-avatar">R</span> : <span className="user-avatar">BR</span>}</div>
                  <div className="message-content">
                    <div className="message-meta"><strong>{message.role === 'assistant' ? 'Relevance' : 'You'}</strong><span>{index < 2 ? '10:42' : 'Now'}</span></div>
                    <p>{message.content}</p>
                    {message.role === 'assistant' && message.id === 2 && activeConversation === 1 && <EvidenceBlock onOpenSource={openSource} />}
                    {message.role === 'assistant' && (
                      <div className="message-tools">
                        <button onClick={copyAnswer}><Icon name={copied ? 'check' : 'copy'} size={15} />{copied ? 'Copied' : 'Copy'}</button>
                        <span>Grounded in repository and paper sources</span>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
            {isThinking && <div className="thinking"><span className="relevance-avatar">R</span><div><strong>Reviewing repository context</strong><span>Comparing files and research sources…</span></div></div>}
            <div ref={endRef} />
          </div>
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={sendMessage}>
            <textarea aria-label="Message Relevance" rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Ask about this repository…" />
            <div className="composer-bottom">
              <div>
                <button type="button" className="composer-tool" aria-label="Attach context"><Icon name="paperclip" size={17} /></button>
                <span className="scope-chip"><Icon name="github" size={13} /> rag-engine</span>
              </div>
              <button className="send-button" type="submit" disabled={!draft.trim() || isThinking} aria-label="Send message"><Icon name="send" size={17} /></button>
            </div>
          </form>
          <p className="composer-note">Relevance can make mistakes. Verify code changes and research claims.</p>
        </div>
      </main>

      <aside className="context-panel" aria-label="Evidence and sources" aria-hidden={!contextOpen}>
        <header>
          <div><span>Evidence</span><small>3 sources</small></div>
          <button className="icon-button" aria-label="Close evidence panel" onClick={() => setContextOpen(false)}><Icon name="close" /></button>
        </header>
        <div className="source-tabs" role="tablist">
          <button className={activeSource === 'chunk.ts' ? 'active' : ''} onClick={() => setActiveSource('chunk.ts')}>Repository</button>
          <button className={activeSource === 'paper' ? 'active' : ''} onClick={() => setActiveSource('paper')}>Papers</button>
        </div>
        {activeSource === 'paper' ? (
          <div className="source-detail paper-source">
            <span className="source-type">RESEARCH PAPER · 2026</span>
            <h2>Structure-Aware Segmentation for Technical Retrieval</h2>
            <p className="authors">L. Chen, M. Rahman, A. Kovács</p>
            <div className="source-section">
              <span>Relevant finding</span>
              <p>Boundary-aware segmentation improved recall on technical documents containing mixed prose and code, particularly at smaller retrieval depths.</p>
            </div>
            <div className="source-section">
              <span>Why it matches</span>
              <p>The evaluation corpus and 512-token baseline are similar to this repository’s current setup.</p>
            </div>
            <button className="source-link">Open on arXiv <Icon name="arrow" size={15} /></button>
          </div>
        ) : (
          <div className="source-detail code-source">
            <div className="file-heading"><Icon name="code" size={16} /><div><strong>chunk.ts</strong><span>src/retrieval</span></div></div>
            <div className="code-preview" aria-label="Code excerpt">
              <span>44</span><code>export function chunkDocument(</code>
              <span>45</span><code>  document: Document,</code>
              <span>46</span><code>  options = defaultOptions</code>
              <span>47</span><code>{'{'}</code>
              <span className="active-line">48</span><code className="active-line">  return splitByTokens(</code>
              <span className="active-line">49</span><code className="active-line">    document.content, 512</code>
              <span className="active-line">50</span><code className="active-line">  )</code>
              <span>51</span><code>{'}'}</code>
            </div>
            <div className="source-section">
              <span>Why this was cited</span>
              <p>The hard-coded token limit creates chunks without checking document structure, headings, or code boundaries.</p>
            </div>
            <button className="source-link"><Icon name="github" size={15} /> Open in GitHub <Icon name="arrow" size={15} /></button>
          </div>
        )}
        <div className="all-sources">
          <span>Other sources</span>
          <button><Icon name="code" size={15} /><div><strong>evaluate.ts</strong><small>src/evaluation · 4 references</small></div></button>
          <button onClick={() => setActiveSource('paper')}><Icon name="document" size={15} /><div><strong>Semantic Boundaries in RAG</strong><small>arXiv · 2025 · 2 references</small></div></button>
        </div>
      </aside>
    </div>
  )
}

export default Application
