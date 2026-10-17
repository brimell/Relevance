# Relevance web

The web workspace contains the initial Relevance marketing site and a minimal Express server. It is intentionally a presentation-only scaffold: the GitHub App, research pipeline, and installation flow are not connected yet.

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
