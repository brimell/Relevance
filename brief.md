# RepoRadar — Research That Finds You

**Hackathon Theme:** Flip the Script  
**Category:** Agentic AI, Developer Tools, Research Discovery

## 1. The Concept

RepoRadar is a proactive AI research assistant that continuously monitors a developer's GitHub project and discovers academic research relevant to what they're building.

Traditionally, developers must actively search for research papers, follow new developments and determine whether discoveries are applicable to their projects.

**RepoRadar flips this relationship: instead of developers searching for research, research finds the developers who need it.**

By combining GitHub repository analysis with arXiv RSS feeds, RepoRadar understands a project's objectives, technologies and current challenges. It identifies newly published papers that could improve the implementation, challenge existing assumptions or introduce useful techniques.

## 2. How It Works

1. **Connect a GitHub repository.** The user provides a repository URL. RepoRadar analyses its README, source code, dependencies, issues and recent commits to understand what the project is trying to accomplish.

2. **Build a research profile.** AI extracts the project's technical objectives, methods, current implementation and unresolved problems, maintaining an evolving representation of its research interests.

3. **Monitor academic publications.** RepoRadar periodically ingests new papers from relevant arXiv RSS feeds, such as machine learning, artificial intelligence and natural language processing.

4. **Evaluate relevance.** An AI system matches publications against the repository's research profile, assesses their potential usefulness and identifies possible contradictions with existing approaches.

5. **Proactively notify the developer.** When a sufficiently relevant discovery appears, RepoRadar generates an actionable alert explaining the paper, its significance and exactly which parts of the project it could affect.

6. **Keep up with changes.** As the repository evolves, RepoRadar updates its understanding and adapts future recommendations.

## 3. Example Use Case

A developer is building an AI application that uses retrieval-augmented generation (RAG).

RepoRadar analyses their repository and discovers that the system uses a conventional fixed-size text-chunking strategy.

A newly published arXiv paper proposes an alternative retrieval method that may perform better for the project's use case.

Rather than the developer having to discover this paper independently, RepoRadar sends an alert:

> **New research relevant to your project**
>
> A new paper introduces a retrieval strategy that may improve how your system selects relevant context.
>
> **Why this matters:** Your current implementation uses fixed-size chunking in `src/retrieval.py`. The proposed technique could address limitations in retrieving information spread across multiple sections.
>
> **Suggested action:** Compare the proposed method against your current retrieval pipeline using your existing evaluation dataset.
>
> **Source:** Paper title, authors and arXiv link.

The developer can investigate the finding, dismiss it or save it for later.

## 4. Core Features — Hackathon MVP

- **GitHub integration:** Analyse a public repository and extract its technical context.
- **arXiv RSS integration:** Retrieve publications from relevant subject categories.
- **AI relevance engine:** Rank papers by their applicability to the repository, rather than just keyword overlap.
- **Research alerts:** Surface important discoveries with concise explanations and direct links to the affected code.
- **Research dashboard:** Display discovered papers, relevance explanations and recommended actions.
- **Project-aware updates:** Refresh the project's research profile when its code or objectives change.

### Stretch Goals

- **Contradiction detection:** Identify papers whose reported findings challenge assumptions made by the project, with appropriate uncertainty.
- **GitHub Issues integration:** Suggest research-backed improvements as draft GitHub issues.
- **Personalised feedback:** Learn from papers the developer saves, dismisses or considers useful.
- **Multi-repository intelligence:** Discover relevant research across several projects.

## 5. Technical Architecture

**Frontend:** Next.js, React, Tailwind CSS  
**Backend:** Python/FastAPI or Node.js  
**Integrations:** GitHub API, arXiv RSS/Atom feeds  
**AI:** LLM for repository understanding, research interpretation and actionable recommendations  
**Retrieval:** Embeddings and semantic similarity, followed by LLM-based relevance evaluation  
**Database:** PostgreSQL with pgvector, or a simpler store for the initial prototype

**Processing pipeline:**

GitHub Repository → Repository Analysis → Project Research Profile

arXiv RSS Feeds → Paper Extraction → Semantic Filtering → AI Relevance Assessment

Project Profile + Relevant Papers → Research Insights → Developer Notifications

## 6. Team Responsibilities

| Developer | Responsibility |
|---|---|
| 1 | GitHub integration and repository understanding |
| 2 | arXiv ingestion, embeddings and paper matching |
| 3 | LLM reasoning, relevance evaluation and notification generation |
| 4 | Frontend dashboard, user experience and integration |

## 7. Hackathon Demonstration

The demonstration begins with an existing GitHub repository containing a recognisable machine-learning implementation.

1. Connect the repository to RepoRadar.
2. Show AI automatically identifying the project's purpose, methods and dependencies.
3. Ingest a prepared collection of genuine arXiv papers through the research pipeline.
4. Watch RepoRadar distinguish irrelevant publications from genuinely applicable research.
5. Open a high-priority alert linking a specific paper to a particular file or implementation decision.
6. Modify the repository's focus and demonstrate how its research recommendations change.

**The decisive moment:** A new research paper appears, and the system independently explains a concrete improvement to the user's existing code—without the developer ever searching or prompting it.

## 8. Why It Fits “Flip the Script”

**Traditional workflow:** Developer → Searches literature → Finds papers → Evaluates relevance → Improves project.

**RepoRadar workflow:** New research → Finds relevant projects → Explains its significance → Alerts developer.

RepoRadar reverses research discovery from an active, labour-intensive process into a contextual, proactive service.

**Pitch:** *What if research papers could find the people building the things they could improve?*
