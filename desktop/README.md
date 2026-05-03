# Billbook Desktop

This folder contains the first desktop shell for Billbook.

## What is included

- `main.js`: Electron main process that loads the existing Billbook web UI
- `preload.js`: safe renderer bridge for desktop-only capabilities
- `hermes-manager.js`: local Hermes sidecar lifecycle management
- `ledger-sqlite.js`: local SQLite-backed ledger sync store
- `mcp/billbook-server.mjs`: local MCP server that exposes Billbook desktop context

## Default runtime model

- Development: Electron loads `/workspace/` through a local desktop gateway, which proxies page traffic to the active Next dev server.
- Packaged/Desktop default: Electron loads `/workspace/` through a local desktop gateway, which serves the exported `out/` build.

This keeps the existing Cloudflare auth flow intact through a local `/api/*` proxy while still giving the desktop shell access to local processes and MCP tooling.

## Desktop ledger sync

The current web workspace still lives in browser storage. The desktop shell now adds a local SQLite file that can be synced from the renderer so Hermes and MCP tools have a stable local data source.

- Desktop app default DB path: Electron `userData/billbook.sqlite`
- CLI / standalone MCP default DB path: `desktop/state/billbook.sqlite`
- Override with: `BILLBOOK_DESKTOP_DB_PATH`
- When Billbook runs in Electron, workspace changes now auto-sync into SQLite with a short debounce.

## Environment variables

- `BILLBOOK_DESKTOP_DEV=true`
- `BILLBOOK_DESKTOP_UPSTREAM_URL=http://127.0.0.1:3000`
- `BILLBOOK_DESKTOP_AUTH_BASE_URL=https://billbook.pages.dev`
- `BILLBOOK_DESKTOP_SERVER_PORT=3210`
- `NEXT_PUBLIC_TURNSTILE_DESKTOP_SITE_KEY=optional_localhost_turnstile_key`
- `BILLBOOK_HERMES_COMMAND=hermes`
- `BILLBOOK_HERMES_ARGS=agent`
- `BILLBOOK_HERMES_CWD=C:\path\to\workspace`
- `BILLBOOK_HERMES_AUTO_START=true`

## Commands

```bash
npm run desktop:dev
npm run desktop:start
npm run mcp:billbook
```
