# Relevance bot API

This directory contains the typed HTTP contract for the Relevance hackathon demo. It is a FastAPI application with generated OpenAPI documentation.

Completed scans fetch real paper metadata from the public arXiv API, inspect the selected repository, and evaluate grounded paper-to-code matches through Nebius. Findings are persisted in SQLite and can be published as GitHub issues.

## Requirements and setup

- Python 3.11 or newer

From `bot/`:

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

- `NEBIUS_API_KEY` is required for repository-aware evaluation. The Nebius model is configured in `app/evaluation.py`.
- `GITHUB_TOKEN` is required for private repository ingestion and GitHub issue publication; public repositories can be scanned without it.
- The machine running the API needs outbound HTTPS access to `export.arxiv.org` and the configured Nebius endpoint.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Useful URLs:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI document: `http://localhost:8000/openapi.json`
- Health check: `http://localhost:8000/health`

## Test

From `bot/`:

```bash
pytest -q
```

## Contract

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/health` | Reports API availability and simulation mode. |
| `POST` | `/api/v1/scans` | Accepts a repository and returns a queued scan with HTTP 202. |
| `GET` | `/api/v1/scans/{scan_id}` | First poll starts the scan; second poll synchronously fetches arXiv and completes or fails it. |
| `GET` | `/api/v1/scans/{scan_id}/findings` | Returns live arXiv paper metadata after completion; returns 409 otherwise. |
| `GET` | `/api/v1/repositories/{owner}/{repo}/findings` | Returns findings held in this process; an unknown valid repository returns an empty list. |
| `POST` | `/api/v1/findings/{finding_id}/issues` | Requires explicit approval and simulates issue creation; repeated creation returns 409. |

Start a scan:

```bash
curl -X POST http://localhost:8000/api/v1/scans \
  -H 'Content-Type: application/json' \
  -d '{"repository":{"owner":"octo-org","repo":"demo-repo","ref":"main"}}'
```

The repository is identified by `owner` and `repo`; `ref` is optional. Scan status is one of `queued`, `running`, `completed`, or `failed`. The response includes typed progress, timestamps, and an optional error.

Polling `GET /api/v1/scans/{scan_id}` advances a scan from `queued` to `running`. The next poll makes one synchronous arXiv request and moves the scan to `completed`. A timeout, HTTP error, invalid configuration, or malformed feed moves it to `failed` with a safe error message. This poll-driven approach deliberately avoids a task queue for the hackathon.

Findings include:

- a `paper` source with its real arXiv identifier, URL, authors, and publication time;
- severity (`critical`, `high`, `medium`, `low`, or `info`);
- relevance (`high`, `medium`, or `low`);
- title, summary, suggested action, and detection timestamp;
- issue state, URL, and creation timestamp.

Approve simulated issue creation:

```bash
curl -X POST http://localhost:8000/api/v1/findings/FINDING_ID/issues \
  -H 'Content-Type: application/json' \
  -d '{"approved":true}'
```

Only the literal `true` is accepted. The endpoint returns 404 for an unknown finding and 409 when an issue has already been created.

## Frontend integration

Use `/openapi.json` as the source of truth for generated frontend types. A typical UI flow is:

1. Submit `POST /api/v1/scans` and retain `id`.
2. Poll `GET /api/v1/scans/{id}` until `status` is `completed` or `failed`.
3. Request `GET /api/v1/scans/{id}/findings` after completion.
4. Display the finding and require a human approval action before posting `{"approved": true}` to the issue endpoint.

A completed scan means arXiv metadata was retrieved. It does not mean the repository was inspected or that the paper is relevant to its code.

## arXiv configuration

The integration uses the public arXiv API and has conservative defaults:

| Variable | Default | Allowed |
| --- | --- | --- |
| `RELEVANCE_ARXIV_CATEGORIES` | `cs.AI,cs.LG,cs.CL` | Non-empty comma-separated category names |
| `RELEVANCE_ARXIV_MAX_RESULTS` | `5` | Integer from 1 to 25 |
| `RELEVANCE_ARXIV_TIMEOUT_SECONDS` | `10` | Integer from 1 to 60 |

Example:

```bash
RELEVANCE_ARXIV_CATEGORIES=cs.AI,cs.SE RELEVANCE_ARXIV_MAX_RESULTS=3 \
  uvicorn app.main:app --reload --port 8000
```

To verify manually, start a scan with the curl command above, request its status twice, then request `/api/v1/scans/{scan_id}/findings`. Each scan performs one live request; there is no scheduler, retry loop, cache, or persistence.

## CORS

`RELEVANCE_CORS_ORIGINS` is an optional comma-separated list of exact allowed origins. It defaults to local frontend development origins:

```text
http://localhost:3000,http://localhost:5173
```

Set it to an empty string to disable CORS middleware, or provide explicit origins for another local frontend. Credentials are disabled, and only `GET`, `POST`, and `Content-Type` are allowed. Do not use `*` when adding authentication later.

All FastAPI process state is lost when the process restarts. Multiple server workers do not share state, so run one worker for this demo.

## Daily GitHub Actions demo

The repository includes `.github/workflows/relevance.yml`. It runs once a day and can also be started from the GitHub Actions **Run workflow** button. The job:

1. Reads categories from `.github/relevance.yml`.
2. Fetches recent arXiv papers and skips IDs recorded by earlier runs.
3. Sends new papers and a bounded repository snapshot to Nebius.
4. Creates one research digest issue when Nebius returns a grounded finding with at least 70% confidence.
5. Stores processed IDs and up to three inferred categories in `[Relevance] Bot state (do not close)`.

Configure the repository before running it:

- Add the Actions secret `NEBIUS_API_KEY`.
- Enable workflow write access to issues if the repository's default Actions permissions prevent it.

The workflow uses the built-in `GITHUB_TOKEN`; no personal access token is required. The state issue is deliberately visible and editable so the demo is easy to inspect and reset. Delete that issue to reset the processed-paper history.

For hackathon simplicity, the agent receives README and dependency-manifest content from the checked-out repository. A GitHub MCP server is not part of this first runnable path.
