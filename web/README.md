# Relevance web

The web workspace contains a focused Relevance research workbench and a minimal Express server. The current interface uses clearly labelled sample findings while the GitHub App and research pipeline are being connected. Its baseline journey is: review the selected repository, run a sample scan, browse discoveries and inspect the evidence for a finding.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Run locally

```bash
cd web
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:3001`. During development, Vite proxies `/api` requests to Express.

## Useful commands

```bash
npm run build
npm run typecheck
npm run dev:frontend
npm run dev:backend
```

The server currently exposes `GET /api/health` so deployment and integration work can confirm that the process is alive.

## Current demo boundary

The repository, paper records and scan stages shown in the interface are prepared demonstration data. The interface does not claim to run the research pipeline or publish GitHub issues. Replace the local `findings` data in `frontend/src/Application.tsx` with the shared findings API when that backend is available.
