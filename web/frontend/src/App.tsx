const steps = [
  {
    number: '01',
    title: 'Read the repository',
    body: 'Relevance builds a working profile from your README, source, dependencies, commits, and open issues.',
    tag: 'PROJECT CONTEXT',
  },
  {
    number: '02',
    title: 'Watch the literature',
    body: 'New papers are collected and ranked against the actual methods and challenges in your codebase.',
    tag: 'ARXIV SIGNAL',
  },
  {
    number: '03',
    title: 'Explain the connection',
    body: 'The strongest matches become grounded recommendations with citations and relevant file paths.',
    tag: 'CODE-SPECIFIC',
  },
  {
    number: '04',
    title: 'Deliver it in GitHub',
    body: 'One focused digest lands where the team already works, ready to discuss and act on.',
    tag: 'ISSUE DIGEST',
  },
]

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18">
      <path d="M3 9h11M10 4l5 5-5 5" />
    </svg>
  )
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.42c.58.1.78-.25.78-.56v-2.2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.74-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.96 10.96 0 0 1 5.75 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.59.23 2.76.11 3.05a4.45 4.45 0 0 1 1.19 3.09c0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.79.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  )
}

function App() {
  return (
    <main>
      <section className="hero" id="top">
        <nav className="nav" aria-label="Main navigation">
          <a className="wordmark" href="#top" aria-label="Relevance home">
            RLV<span>.</span>
          </a>
          <div className="nav-links">
            <a href="#method">Method</a>
            <a href="#example">Example</a>
            <a className="nav-cta" href="#access">
              Early access <ArrowIcon />
            </a>
          </div>
        </nav>

        <div className="hero-signal" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="signal-core">
            <span>R</span>
          </div>
          <div className="paper paper-one">
            <span>cs.LG</span>
            <i />
            <i />
            <i />
          </div>
          <div className="paper paper-two">
            <span>cs.AI</span>
            <i />
            <i />
          </div>
          <div className="paper paper-three">
            <span>cs.CL</span>
            <i />
            <i />
            <i />
          </div>
          <div className="code-ribbon code-ribbon-one">src/retrieval.ts · 0.92 match</div>
          <div className="code-ribbon code-ribbon-two">new paper · evidence found</div>
          <span className="coordinate coordinate-one">55.9533° N</span>
          <span className="coordinate coordinate-two">SCAN / 001</span>
        </div>

        <div className="hero-copy">
          <p className="eyebrow reveal-one">Research intelligence for living codebases</p>
          <h1 className="reveal-two">RELEVANCE</h1>
          <p className="hero-line reveal-three">Research finds your repository.</p>
          <p className="hero-body reveal-three">
            Relevance reads the work, watches the literature, and opens a focused GitHub issue when a new paper deserves your attention.
          </p>
          <a className="primary-action reveal-four" href="#method">
            See how it works <ArrowIcon />
          </a>
        </div>

        <div className="hero-footer">
          <span>GitHub-native research discovery</span>
          <a href="#method">Scroll to explore ↓</a>
        </div>
      </section>

      <section className="manifesto" aria-labelledby="manifesto-title">
        <div className="section-kicker">The reversal</div>
        <div className="manifesto-copy">
          <h2 id="manifesto-title">
            Stop searching for<br />
            <span>what your code needs.</span>
          </h2>
          <p>
            Most useful research never reaches implementation. Relevance flips the script: the right paper arrives with a reason, a file, and a next step.
          </p>
        </div>
        <div className="manifesto-index" aria-hidden="true">
          <span>01</span>
          <div />
          <span>04</span>
        </div>
      </section>

      <section className="method" id="method" aria-labelledby="method-title">
        <header className="section-header">
          <div>
            <p className="section-kicker light">How it works</p>
            <h2 id="method-title">From code to evidence.</h2>
          </div>
          <p>Four quiet steps. One useful interruption.</p>
        </header>

        <div className="steps">
          {steps.map((step) => (
            <article className="step" key={step.number}>
              <div className="step-number">{step.number}</div>
              <div className="step-copy">
                <span>{step.tag}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <div className="step-arrow" aria-hidden="true">
                ↘
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="example" id="example" aria-labelledby="example-title">
        <header className="example-heading">
          <p className="section-kicker">What arrives</p>
          <h2 id="example-title">Signal, with receipts.</h2>
          <p>A concise digest ties genuine research to the code it could change.</p>
        </header>

        <div className="issue-shell">
          <div className="issue-topbar">
            <div className="issue-repo">
              <GitHubMark />
              <span>acme / rag-engine</span>
            </div>
            <span className="example-label">ILLUSTRATIVE OUTPUT</span>
          </div>
          <div className="issue-content">
            <aside className="issue-meta">
              <span className="bot-avatar">R</span>
              <div>
                <strong>relevance[bot]</strong>
                <span>opened this issue now</span>
              </div>
            </aside>
            <article className="issue-body">
              <div className="issue-state">● RESEARCH DIGEST</div>
              <h3>Adaptive chunking may improve your retrieval pipeline</h3>
              <p className="issue-lead">
                A new paper proposes a context-aware segmentation method that may address a limitation in your current fixed-size chunking approach.
              </p>
              <div className="finding-row">
                <span>WHY IT MATTERS</span>
                <p>Your retriever splits every document at 512 tokens, including code blocks and section boundaries.</p>
              </div>
              <div className="finding-row">
                <span>RELEVANT CODE</span>
                <code>src/retrieval/chunk.ts:48</code>
              </div>
              <div className="finding-row">
                <span>SUGGESTED NEXT STEP</span>
                <p>Compare the paper’s method against the current pipeline on your existing evaluation set.</p>
              </div>
              <a className="paper-link" href="#access">
                View paper and evidence <ArrowIcon />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="access" id="access" aria-labelledby="access-title">
        <div className="access-stamp" aria-hidden="true">
          <span>R</span>
          <small>EST. 2026</small>
        </div>
        <p className="section-kicker light">Hackathon preview</p>
        <h2 id="access-title">Put research<br />on the issue list.</h2>
        <p>Built for teams that would rather ship the insight than bookmark the paper.</p>
        <a className="light-action" href="mailto:hello@relevance.dev?subject=Relevance%20early%20access">
          Request early access <ArrowIcon />
        </a>
      </section>

      <footer>
        <a className="wordmark footer-mark" href="#top">
          RLV<span>.</span>
        </a>
        <p>Research finds the developers who need it.</p>
        <div>
          <span>Edinburgh AI Hackathon</span>
          <span>© 2026 Relevance</span>
        </div>
      </footer>
    </main>
  )
}

export default App
