# Relevance bot API

This directory contains the typed HTTP contract for the Relevance hackathon demo. It is a FastAPI application with generated OpenAPI documentation.

> **Simulation boundary:** this implementation is an in-memory deterministic demo. It does not clone or inspect repositories, query paper or CVE feeds, persist data, authenticate with GitHub, or create GitHub issues. API responses include `simulated: true` and a notice. Generated issue links use the reserved `example.invalid` domain and are not actionable.

## Requirements and setup

- Python 3.11 or newer

From `bot/`:

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
```

No secrets are required.

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
| `GET` | `/api/v1/scans/{scan_id}` | Returns status and advances the demo scan one state per poll. |
| `GET` | `/api/v1/scans/{scan_id}/findings` | Returns completed scan findings; returns 409 while active. |
| `GET` | `/api/v1/repositories/{owner}/{repo}/findings` | Returns findings held in this process; an unknown valid repository returns an empty list. |
| `POST` | `/api/v1/findings/{finding_id}/issues` | Requires explicit approval and simulates issue creation; repeated creation returns 409. |

Start a scan:

```bash
curl -X POST http://localhost:8000/api/v1/scans \
  -H 'Content-Type: application/json' \
  -d '{"repository":{"owner":"octo-org","repo":"demo-repo","ref":"main"}}'
```

The repository is identified by `owner` and `repo`; `ref` is optional. Scan status is one of `queued`, `running`, `completed`, or `failed`. The response includes typed progress, timestamps, and an optional error. `failed` is reserved in the contract for a future live worker; the deterministic demo does not generate failures.

Polling `GET /api/v1/scans/{scan_id}` advances a demo scan from `queued` to `running`, then from `running` to `completed`. This poll-driven transition is deterministic and replaces a real task queue only for the demo.

Findings include:

- a `paper` or `cve` source, identifier, URL, and optional publication time;
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

Do not infer live behavior from `status: completed` in this build; it means only that deterministic demo data is ready.

## CORS

`RELEVANCE_CORS_ORIGINS` is an optional comma-separated list of exact allowed origins. It defaults to local frontend development origins:

```text
http://localhost:3000,http://localhost:5173
```

Set it to an empty string to disable CORS middleware, or provide explicit origins for another local frontend. Credentials are disabled, and only `GET`, `POST`, and `Content-Type` are allowed. Do not use `*` when adding authentication later.

All state is lost when the process restarts. Multiple server workers do not share state, so run one worker for this demo.
