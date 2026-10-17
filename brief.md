# Relevance — GitHub Bot Project Plan

**Hackathon theme:** Flip the Script  
**Team:** Three developers  
**Concept:** Research finds the developers who need it.

## Overview

Relevance is a GitHub App that proactively discovers academic research relevant to a repository. It analyses a project's code and goals, monitors new papers from arXiv RSS/Atom feeds, and posts actionable research findings directly to GitHub Issues.

**The reversal:** Instead of developers searching for research, relevant research finds developers within their existing workflow.

## Workflow

1. A developer installs Relevance on a GitHub repository.
2. The bot reads the README, selected source files, dependencies, commits and issues.
3. AI builds a structured profile of the project's objectives, methods and technical challenges.
4. The research pipeline ingests and deduplicates papers from relevant arXiv feeds.
5. Semantic matching shortlists candidate papers for the project.
6. AI evaluates candidates against actual repository code and generates evidence-grounded recommendations.
7. Relevance publishes a concise GitHub issue with citations, affected files and suggested next steps.
8. Subsequent repository changes and scheduled research scans update the findings.

## Developer 1 — GitHub Bot & Infrastructure

**Objective:** Own GitHub integration and end-to-end orchestration.

**Responsibilities**
- Create the GitHub App using Probot and TypeScript.
- Configure installation authentication and minimal repository permissions.
- Retrieve README files, source code, dependencies, commits and open issues.
- Handle installation and push webhooks.
- Support a manual scan trigger, such as `/relevance scan` in an issue comment.
- Publish formatted research findings as GitHub issues or comments.
- Deduplicate alerts and coordinate scheduled or event-triggered scans.
- Deploy and integrate the full application.

**Deliverable:** A working bot that reads an installed repository, invokes the research pipeline and publishes results.

**Suggested ownership:** `src/github/`, `src/bot/`, `src/index.ts`

## Developer 2 — Repository Intelligence

**Objective:** Understand repositories and explain how papers relate to their code.

**Responsibilities**
- Analyse repository content supplied by Developer 1.
- Build a structured project profile containing purpose, technologies, algorithms, research topics and unresolved problems.
- Identify important files, functions, technical assumptions and implementation decisions.
- Refresh profiles when significant changes occur.
- Evaluate shortlisted papers supplied by Developer 3 against the repository.
- Identify potentially affected code and generate grounded, actionable suggestions.
- Express uncertainty and distinguish a paper's actual findings from speculative applications.

**Deliverable:** An AI module producing project profiles and code-specific research insights.

**Suggested ownership:** `src/intelligence/`, `src/repository/`

## Developer 3 — Research Discovery & Matching

**Objective:** Find and rank newly published papers for monitored repositories.

**Responsibilities**
- Ingest arXiv RSS/Atom feeds, initially `cs.AI`, `cs.LG` and `cs.CL`.
- Extract titles, abstracts, authors, identifiers, publication dates and URLs.
- Deduplicate and persist papers.
- Compare paper abstracts with repository research profiles using embeddings or semantic matching.
- Rank candidates and filter out irrelevant publications before detailed AI evaluation.
- Label potential improvements, contradictory findings and new techniques as *candidate* categories, subject to verification.
- Implement periodic feed polling and track which papers have already been evaluated for each repository.
- Supply shortlisted papers to Developer 2.

**Deliverable:** A research pipeline returning ranked candidate papers for a project profile.

**Suggested ownership:** `src/research/`, `src/matching/`, `src/scheduler/`

## Shared Interfaces

Agree on the input/output schemas before implementing the modules. Use mocked responses so all three developers can work in parallel.

| Owner | Function | Input | Output |
|---|---|---|---|
| Developer 1 | `getRepoContext()` | Installation and repository ID | README, selected files, commits and issues |
| Developer 2 | `analyseRepository()` | Repository context | Structured project profile |
| Developer 3 | `discoverPapers()` | Project profile | Ranked candidate papers |
| Developer 2 | `evaluatePaper()` | Profile, repository context and candidate paper | Code-specific research insight |
| Developer 1 | `publishInsights()` | Repository ID and approved insights | GitHub issue or comment |

**Orchestration:** GitHub event or scheduled scan → repository context → project profile → candidate papers → detailed evaluation → publication.

## Example GitHub Issue

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

*This is an illustrative issue, not an actual verified finding.*

For the MVP, prefer **one digest issue with up to three high-quality findings per scan period** over a separate issue for every paper. Include links to the original papers and to specific repository files. Avoid speculative claims presented as established results.

## Recommended Stack

| Component | Technology |
|---|---|
| GitHub bot | Probot + TypeScript |
| GitHub API | GitHub App installation tokens + Octokit |
| Repository intelligence | LLM with structured JSON output |
| Research ingestion | arXiv RSS/Atom feeds |
| Candidate matching | Embeddings and similarity ranking |
| Detailed evaluation | LLM grounded in paper abstracts and repository code |
| Persistence | SQLite for MVP; PostgreSQL if needed |
| Scheduling | Cron or hosted scheduled worker |
| User interface | GitHub Issues and comments |

**Initial GitHub App permissions:** Repository metadata access, Contents (read), and Issues (read/write). Additional permissions may be required for specific webhook subscriptions or expanded features; keep access minimal.

**Operational note:** arXiv feeds update periodically, so daily polling is appropriate for production. Use a prepared collection of genuine papers for a reliable live demonstration.

## Build Order

1. **Bot skeleton:** Install Relevance on a test repository, read its files and create a test issue.
2. **Parallel intelligence pipelines:** Generate a repository profile and ingest a real collection of arXiv papers.
3. **Matching and reasoning:** Rank papers and produce recommendations linked to actual source files.
4. **Automated publication:** Trigger a scan, deduplicate results and publish a concise digest.
5. **Demo hardening:** Validate citations and file paths, handle failures and rehearse the full workflow.

## Hackathon Demonstration

1. Show a GitHub repository containing a recognisable ML implementation.
2. Trigger Relevance via a command or scheduled scan.
3. Show the bot analysing the project and filtering genuine arXiv papers.
4. Open a GitHub issue created by Relevance, containing a real paper, a specific affected file and a verifiable recommendation.
5. Change the repository's implementation or stated objectives, rerun the scan and demonstrate how the recommendations change.

**Success criterion:** From one repository and a collection of genuine papers, Relevance autonomously produces at least one convincing, code-specific, source-linked research recommendation directly on GitHub.

## Scope Discipline

Prioritise the complete **repository → paper → actionable GitHub issue** workflow. Multi-repository dashboards, advanced notification settings, pull-request generation and elaborate background infrastructure are stretch goals. The decisive feature is a trustworthy explanation of *why this particular paper matters to this particular piece of code*.
