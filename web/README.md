# Relevance web

The web workspace contains the Relevance research workbench and a small Express server that proxies the bot API. The integrated journey is: run a simulated scan, poll its real API status, review returned findings, inspect the evidence available in the shared schema, and explicitly approve simulated issue creation.

> **Simulation boundary:** the bot is an in-memory deterministic demo. It does not inspect the repository, query research/CVE feeds, persist data, authenticate with GitHub, or create GitHub issues. The web application displays the API's simulation notice and does not open its non-actionable `example.invalid` issue URLs.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Python 3.11 or newer

## Install

From the repository root:

```bash
python3 -m venv bot/.venv
bot/.venv/bin/python -m pip install -r bot/requirements-dev.txt
cd web
npm install
```

The default scripts use `python3`. Activate `bot/.venv` before running them, or run the bot separately with the virtual environment command shown below.

## Run locally

With a Python environment containing the bot dependencies active:

```bash
cd web
npm run dev
```

This starts:

- frontend: `http://localhost:5173`
- Express web API: `http://localhost:3001`
- FastAPI bot: `http://localhost:8000`

The browser sends same-origin `/api/v1` requests. Vite proxies them to Express, and Express forwards them to FastAPI. Set `BOT_API_URL` if FastAPI is not available at `http://localhost:8000`; see `.env.example` for supported server variables.

To run the services separately:

```bash
bot/.venv/bin/python -m uvicorn app.main:app --app-dir bot --reload --port 8000
cd web
npm run dev:backend
npm run dev:frontend
```

## Useful commands

```bash
npm run build
npm run typecheck
npm run dev:frontend
npm run dev:backend
npm run dev:bot
```

`GET /api/health` checks the Express process. Bot API requests are available through Express under `/api/v1`; the upstream FastAPI contract and Swagger UI remain available directly at `http://localhost:8000/openapi.json` and `http://localhost:8000/docs`.

## API integration

The typed client in `frontend/src/api.ts` mirrors the schemas published by the bot's OpenAPI document. The UI uses:

- `GET /api/v1/repositories/{owner}/{repo}/findings`
- `POST /api/v1/scans`
- `GET /api/v1/scans/{scan_id}`
- `GET /api/v1/scans/{scan_id}/findings`
- `POST /api/v1/findings/{finding_id}/issues`

Fields absent from the shared API—such as affected files, repository excerpts, paper authors and quoted evidence—are shown as unavailable rather than filled with sample content.
