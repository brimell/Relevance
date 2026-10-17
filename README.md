# Relevance

> Research finds the developers who need it.

Relevance is an Edinburgh AI Hackathon project for bringing relevant academic research directly into a development team’s GitHub workflow. The planned GitHub App will analyse a repository, match its technical challenges with new arXiv papers, and publish concise, code-specific recommendations as GitHub issues.

## Local development

Relevance now uses one Python pipeline for API-triggered and scheduled scans. It resolves the selected Git ref to an exact commit, reads README/dependency manifests plus a bounded set of source files, evaluates shortlisted arXiv abstracts through Nebius, stores findings in SQLite, and can publish those same finding records as GitHub issues.

Required services and environment variables:

- `NEBIUS_API_KEY` — required for repository-aware evaluation. The Nebius model is configured in `bot/app/evaluation.py`.
- `GITHUB_TOKEN` — required for private repository ingestion and GitHub issue publication. Public repositories can be scanned without it.
- `RELEVANCE_DB_PATH` — optional SQLite location; defaults to `bot/relevance.db`.
- `RELEVANCE_REPOSITORY_ROOT` — optional local checkout to read instead of GitHub when its directory name matches the selected repository.
- `RELEVANCE_ARXIV_CATEGORIES` and `RELEVANCE_ARXIV_MAX_RESULTS` — optional paper-ingestion controls.

```sh
cd bot
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt

cd ../web
npm install
npm run dev
```

The web process starts the Vite frontend, Express API proxy, and FastAPI service. Add/select a repository in **Repositories**, run a scan, inspect grounded findings, then publish an approved finding. The GitHub Actions workflow invokes the same ingestion, evaluation, persistence, and publication code through `python -m app.daily`.

### Validation

```sh
cd bot && .venv/bin/python -m pytest -q
cd ../web && npm run build
```

## Team

SweetHomeAlabama256: Afonso Fortuna, Bill Rimell, and Nate Hendrickson.
