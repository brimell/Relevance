
# Relevance — GitHub Bot & Local Website Project Plan

**Hackathon theme:** Flip the Script  
**Team:** Three developers  
**Concept:** Research finds the developers who need it.

## Overview

Relevance is a proactive AI research assistant with **two complementary parts**:

1. **GitHub bot:** A GitHub App that monitors repositories, analyses their code and objectives, discovers relevant academic papers from arXiv RSS/Atom feeds, and publishes actionable findings as GitHub issues or comments.
2. **Locally hosted website:** A browser-based graphical user interface (GUI), running on the user's own machine, for connecting and selecting repositories, reviewing discovered papers, inspecting explanations, initiating scans, and managing research preferences and alerts.

Both parts use **the same research engine and persistent data**. The GitHub bot works autonomously; the local website gives the developer an interactive way to explore and control it. The website is not a replacement for the bot, and the bot should remain useful when the website is closed, provided its background service is running.

**The reversal:** Instead of developers continually searching for research, relevant research finds them in their existing development workflow.

## Product Architecture

```text
                GitHub repository          arXiv RSS/Atom feeds
                       |                           |
                       v                           v
             Repository ingestion          Paper ingestion
                       |                           |
                       v                           v
                Project profile ----> Candidate matching
                                              |
                                              v
                                   Code-aware AI evaluation
                                              |
                                              v
                                  Shared findings database
                                      /              \
                                     v                v
                           GitHub bot / App      Local web GUI
                           Issues + comments    Review + controls
```

The two interfaces share a backend API, research profiles, papers, findings and scan state. A scheduled job or GitHub event can initiate a scan, and a user can initiate the same scan from the local website.

## User Workflow

1. The developer installs the Relevance GitHub App on a selected repository.
2. The local website lists or accepts the repositories accessible to the app and lets the developer choose one to inspect.
3. The backend retrieves the README, relevant source files, dependencies, commits and issues.
4. AI constructs a structured profile of the project's purpose, techniques, assumptions and unresolved challenges.
5. The research engine ingests new papers from relevant arXiv feeds and deduplicates them.
6. Semantic matching shortlists potentially useful papers; an LLM evaluates them against specific code and project decisions.
7. High-confidence findings appear in the **local website**, with explanations, source links, affected files and suggested actions.
8. The **GitHub bot** publishes selected high-value findings in a digest issue or comment without requiring the developer to open the website.
9. The user can inspect, save or dismiss findings, change preferences and manually trigger a fresh scan from the GUI.
10. Subsequent repository changes and scheduled research checks refresh the findings.

## Developer 1 — GitHub Bot & Infrastructure

**Objective:** Build the GitHub-native experience and the backend plumbing used by both interfaces.

**Responsibilities**
- Create the GitHub App using **Probot and TypeScript**.
- Implement GitHub App installation authentication, webhook verification and minimal repository permissions.
- Retrieve README files, relevant source code, dependencies, recent commits and open issues.
- Listen for installation and push events, and support a manual trigger such as `/relevance scan` in an issue comment.
- Publish well-formatted research digests as GitHub issues or comments, with links to papers and affected files.
- Deduplicate posted findings and avoid notification spam.
- Expose or coordinate the shared backend endpoints for repository context, scan requests and publishing findings.
- Integrate the research engine and local website with the GitHub App's data and workflows.
- Provide a reliable way to receive GitHub webhooks during the hackathon (for example, a temporary HTTPS tunnel).

**Deliverable:** An installed GitHub bot that can analyse a repository, trigger the shared research pipeline and publish useful results, with API endpoints usable by the local website.

**Suggested ownership:** `src/bot/`, `src/github/`, `src/server/`, `src/index.ts`

## Developer 2 — AI Research Intelligence

**Objective:** Own the end-to-end research engine: understand code, discover relevant publications and generate grounded recommendations.

**Responsibilities**
- Turn repository content supplied by Developer 1 into a structured project profile: objectives, technologies, methods, assumptions and important files.
- Ingest arXiv RSS/Atom feeds, initially `cs.AI`, `cs.LG` and `cs.CL`.
- Extract paper titles, abstracts, authors, identifiers, dates and source URLs; deduplicate publications.
- Match papers to project profiles using embeddings or another inexpensive semantic filter.
- Use an LLM to evaluate shortlisted papers against repository code and identify potentially affected files.
- Explain whether each paper offers a possible improvement, challenges an assumption or introduces a relevant development; clearly distinguish established findings from conjecture.
- Generate structured findings with relevance explanations, citations, affected code, suggested actions and uncertainty.
- Track already evaluated papers and refresh project profiles after significant code changes.
- Provide a reusable scan function callable by both the GitHub bot and local GUI.

**Deliverable:** A research pipeline that takes a repository context and returns ranked, code-specific, evidence-grounded research findings.

**Suggested ownership:** `src/intelligence/`, `src/research/`, `src/matching/`

**Scope note:** This is the most algorithmically demanding workstream. For the MVP, analyse a limited selection of repository files and a prepared collection of genuine papers first; add live feed polling and more elaborate ranking only after end-to-end matching works.

## Developer 3 — Locally Hosted Website & GUI

**Objective:** Build the user-facing local web application for interacting with the bot and its research findings.

**Responsibilities**
- Build a locally hosted **Next.js/React** website, accessed through a browser at a localhost address.
- Provide repository selection and onboarding guidance for installing the GitHub App.
- Display the AI-generated repository profile and the project's monitored research topics.
- Build a research dashboard showing relevant papers, summaries, publication dates, relevance explanations and links to the original arXiv sources.
- Display affected repository files, actionable suggestions and the corresponding GitHub issue when one has been published.
- Allow users to **run a scan**, view its progress, and inspect newly generated findings.
- Support saving, dismissing or filtering findings and editing simple monitoring preferences.
- Connect the GUI to the shared backend API and database; handle loading, error and empty states.
- Own the interactive portion of the hackathon demonstration.

**Deliverable:** A working localhost website that allows a user to select a repository, trigger the shared AI pipeline, review findings and navigate to GitHub-published alerts.

**Suggested ownership:** `web/`, `src/components/`, `src/app/` (or equivalent frontend folders)

## Shared Interfaces and Contracts

Agree on the JSON shapes before implementing. All developers should be able to build against mocked responses without waiting for the other components.

| Owner | Function / endpoint | Input | Output |
|---|---|---|---|
| Dev 1 | `getRepoContext()` | Installation + repository ID | README, relevant files, commits, issues |
| Dev 2 | `analyseRepository()` | Repository context | Structured project profile |
| Dev 2 | `discoverPapers()` | Project profile | Ranked candidate papers |
| Dev 2 | `evaluatePaper()` | Project profile + code + paper | Code-specific research finding |
| Dev 1 | `publishInsights()` | Repository ID + approved findings | GitHub issue/comment URL |
| Dev 1 + 2 | `POST /api/repos/:id/scan` | Repository ID | Scan ID and status |
| Dev 1 | `GET /api/repos` | Local user/app context | Accessible monitored repositories |
| Dev 1 + 2 | `GET /api/repos/:id/findings` | Repository ID | Stored findings and publication state |
| Dev 1 + 2 | `GET /api/scans/:id` | Scan ID | Progress, result or error |
| Dev 3 | Local GUI | Shared API responses | Dashboard, controls and research views |

**Shared finding fields (minimum):** `id`, `repositoryId`, `paperTitle`, `paperUrl`, `publishedAt`, `summary`, `whyRelevant`, `affectedFiles`, `suggestedAction`, `status`, `githubIssueUrl` (optional).

**Single source of truth:** Both interfaces should read the same stored findings. Scanning from the GUI must not create a separate research process from scanning through the bot.

## GitHub Bot Experience

The bot proactively publishes a digest such as:

> **[Relevance] New research may improve your retrieval pipeline**
>
> **New research discovery**  
> A recently published paper proposes a retrieval technique potentially relevant to your RAG implementation.
>
> **Why this matters**  
> Your project uses fixed-size document chunking. The paper describes an alternative that may address some limitations.
>
> **Relevant code:** `src/retrieval.py`  
> **Suggested action:** Compare the proposed method with the existing retrieval pipeline using a representative evaluation dataset.  
> **Source:** Paper title, authors, publication date and arXiv URL.

*Illustrative issue, not a verified research finding.*

For the MVP, prefer **one digest issue with up to three high-quality findings per scan period**, rather than one issue for every candidate paper. Link to the paper and the relevant repository files, and never imply an improvement is proven without evidence.

## Local Website Experience

The local GUI complements GitHub's issue interface rather than duplicating it entirely. Its MVP screens are:

1. **Repositories:** Select an installed repository, view its scan status and start a scan.
2. **Project understanding:** Inspect the AI-generated project profile, techniques, keywords and important files.
3. **Research feed:** Browse ranked discoveries with paper titles, arXiv links, relevance explanations and suggested actions.
4. **Finding details:** Inspect a paper's connection to specific source files, save/dismiss it and open its GitHub issue if published.
5. **Preferences (minimal):** Choose monitored topics and whether high-value findings should be posted to GitHub.

**Primary demo interaction:** Open the local website, choose a repository, click **Scan**, observe the research analysis, inspect a specific paper-to-code match, then open the corresponding GitHub issue created by the bot.

## Recommended Stack

| Component | Technology |
|---|---|
| GitHub bot | Probot + TypeScript |
| GitHub API | GitHub App installation tokens + Octokit |
| Local website | Next.js + React, served on localhost |
| Shared API / orchestration | Node.js/TypeScript; reuse the Probot backend where practical |
| Repository understanding | LLM with structured JSON output |
| Paper ingestion | arXiv RSS/Atom feeds |
| Candidate matching | Embeddings + similarity ranking |
| Detailed evaluation | LLM grounded in abstracts and repository code |
| Persistence | SQLite for a single-machine MVP |
| Scheduling | Local cron/worker for MVP; hosted worker if deployed |
| Notifications | GitHub Issues/comments; findings visible in local GUI |

**Initial GitHub App permissions:** Repository metadata, Contents (read) and Issues (read/write). Add further permissions only when needed for the chosen events and features.

**Local hosting constraint:** A browser served on `localhost` is not publicly reachable by GitHub webhooks. During development, use a temporary HTTPS tunnel to the bot's webhook endpoint, or trigger scans manually and poll GitHub. If the bot and scheduler run only on a developer's laptop, autonomous monitoring stops when that machine is off. Continuous monitoring after the hackathon requires an always-on service. Never expose GitHub App private keys or installation tokens to the browser; keep them in the local server process.

**arXiv note:** RSS/Atom feeds update periodically rather than instantaneously. Use real, previously collected papers for the live demonstration, and keep feed polling separate from manual repository scans.

## Build Order

1. **Agree on contracts:** Shared finding schema, scan lifecycle and mock API responses; create a common repository with separate ownership boundaries.
2. **Build in parallel:** Dev 1 creates a working GitHub App and test issue; Dev 2 matches a real paper to a sample repository; Dev 3 builds the localhost GUI using mocks.
3. **Connect the pipeline:** Repository context → project profile → candidate papers → grounded finding → shared database.
4. **Connect both interfaces:** GUI initiates and displays a scan; bot publishes the same stored findings to GitHub.
5. **Add automation:** Webhook-triggered refreshes, scheduled checks and deduplication after the end-to-end path is reliable.
6. **Harden the demo:** Check paper links, cited files, errors and repeatability; rehearse the full local website → GitHub issue journey.

## Hackathon Demonstration

1. Show a GitHub repository with a recognisable machine-learning implementation and the Relevance GitHub App installed.
2. Open the **locally hosted Relevance website** and select the repository.
3. Display the project's automatically generated research profile.
4. Click **Scan** and show the system filtering a collection of genuine arXiv papers.
5. Open a high-value finding in the GUI, showing a real paper, a specific affected source file and a verifiable recommendation.
6. Show the **GitHub bot** publishing that finding in a properly formatted issue, then follow the link from the GUI to GitHub.
7. If time permits, change the repository's implementation or goals and demonstrate how the recommendations change.

**Success criterion:** Relevance can analyse a real repository, discover at least one convincing paper-to-code connection, display it in a local GUI, and publish it to GitHub through the bot. Both interfaces show the same finding.

## Scope Discipline

The MVP has **two surfaces, one intelligence pipeline**. Do not build two independent backends, a public SaaS dashboard, multi-user account management or elaborate notification infrastructure. Prioritise the complete **repository → research finding → localhost GUI + GitHub issue** journey. The differentiating feature remains a trustworthy explanation of *why this particular paper matters to this particular piece of code*.
