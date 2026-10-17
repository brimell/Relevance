# Relevance

> Research finds the developers who need it.

Relevance is an Edinburgh AI Hackathon project for bringing relevant academic research directly into a development team’s GitHub workflow. The planned GitHub App will analyse a repository, match its technical challenges with new arXiv papers, and publish concise, code-specific recommendations as GitHub issues.

## Current status

This repository currently contains:

- a responsive React marketing site;
- a minimal Express API with `GET /api/health`;
- the full product proposal in [`brief.md`](brief.md).

The GitHub App, repository analysis, arXiv ingestion, paper matching, persistence, and issue publication are **not yet implemented**. The findings displayed on the website are illustrative.

## Tech stack

- React 19
- TypeScript 5.9
- Vite 7
- Express 5
- npm workspaces

## Run locally

Requirements: Node.js `20.19+` or `22.12+`, and npm 10+.

```bash
cd web
npm ci
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3001>
- Health check: <http://localhost:3001/api/health>

Vite proxies `/api` requests to the backend during development.

## Commands

Run from `web/`:

```bash
npm run dev             # Start frontend and backend
npm run dev:frontend    # Start only Vite
npm run dev:backend     # Start only Express
npm run typecheck       # Type-check both workspaces
npm run build           # Build both workspaces
```

There is currently no automated test suite.

## Configuration

The backend accepts an optional `PORT` environment variable, defaulting to `3001`:

```bash
PORT=4000 npm run dev:backend
```

`PORT` must be an integer from `1` to `65535`. The Vite proxy remains fixed to port `3001` unless changed in `web/frontend/vite.config.ts`.

## Structure

```text
.
├── brief.md                 # Product plan and intended architecture
├── bot/                     # Placeholder; bot not implemented
└── web/
    ├── frontend/            # React/Vite landing page
    ├── backend/             # Express health-check API
    └── package.json         # Workspace scripts
```

## Team

SweetHomeAlabama256: Afonso Fortuna, Bill Rimell, and Nate Hendrickson.
