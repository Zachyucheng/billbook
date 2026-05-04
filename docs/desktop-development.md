# Desktop Development Guide

This document describes the Billbook desktop app for future maintenance.

## Purpose

The desktop app is the primary bookkeeping runtime. It wraps the shared workspace UI in Electron, adds a local gateway, manages Hermes, and exposes local MCP capabilities.

## Main files

- `desktop/main.js`: Electron main process bootstrap and IPC registration
- `desktop/preload.js`: safe renderer bridge
- `desktop/app-server.js`: local desktop gateway and auth proxy
- `desktop/hermes-manager.js`: Hermes lifecycle management
- `desktop/ledger-sqlite.js`: local SQLite store
- `desktop/mcp/billbook-server.mjs`: local MCP server
- `scripts/desktop-dev.js`: dev launcher for Next + Electron

## Runtime architecture

### Development mode

1. `scripts/desktop-dev.js` checks whether a Billbook Next dev server is already running.
2. If not, it starts `next dev`.
3. Electron starts with `BILLBOOK_DESKTOP_DEV=true`.
4. `desktop/app-server.js` runs a local gateway.
5. Page traffic proxies to the Next dev server.
6. `/api/*` traffic proxies to the Cloudflare auth backend.

### Production desktop mode

1. `npm run build` generates `out/`.
2. Electron starts.
3. `desktop/app-server.js` serves the static `out/` build locally.
4. `/api/*` traffic still proxies to the Cloudflare auth backend.

## Why the desktop gateway exists

The local gateway solves several desktop-specific problems:

- keeps the desktop app independent from directly loading the hosted website
- makes packaged desktop builds work from local static files
- preserves Cloudflare auth through proxied `/api/*` requests
- persists remote auth cookies locally for desktop session recovery

## Authentication model

Desktop auth still depends on the Cloudflare Pages backend.

Key behavior:

- desktop does not own a separate auth backend
- login and registration go through proxied `/api/*`
- remote session cookies are stored by the local gateway
- Electron encrypts stored session content when `safeStorage` is available

Important maintenance rule:

- Do not bypass the local gateway by loading the public site directly inside Electron.

## Local data model

The desktop app has two local data layers:

1. Renderer workspace state
   - managed in `src/components/billbook-provider.tsx`
   - still stored in browser storage

2. SQLite sync state
   - managed in `desktop/ledger-sqlite.js`
   - used by MCP and desktop tooling

Important maintenance rule:

- When changing bookkeeping behavior, think about both layers.
- If a feature changes transaction semantics, update renderer state logic and SQLite sync logic together.

## Long-term spending behavior

Current intended behavior:

1. Create a long-term category with a default cycle.
2. When recording a transaction, use the default cycle unless the current entry overrides it.
3. A one-off override changes only that transaction.

Relevant files:

- `src/components/workspace-ui.tsx`
- `src/components/ledger-page.tsx`
- `src/components/billbook-provider.tsx`
- `src/lib/types.ts`

## Desktop IPC surface

Current renderer bridge responsibilities include:

- reading desktop environment info
- reading Hermes status
- starting Hermes
- stopping Hermes
- restarting Hermes
- reading database status
- syncing workspace snapshots

If you add new desktop-only capabilities, prefer:

1. add a small preload bridge
2. handle it in `desktop/main.js`
3. keep privileged logic out of the renderer

## Hermes integration

Hermes is managed from the Electron main process.

Important environment variables:

- `BILLBOOK_HERMES_COMMAND`
- `BILLBOOK_HERMES_ARGS`
- `BILLBOOK_HERMES_CWD`
- `BILLBOOK_HERMES_AUTO_START`

Local MCP command:

```bash
npm run mcp:billbook
```

## Desktop commands

Development:

```bash
npm run desktop:dev
```

Production-style local run:

```bash
npm run desktop:start
```

Quality checks:

```bash
npm run lint
npm run build
```

## Packaging assumptions

The repository does not yet include a final installer pipeline. The current `desktop:start` command is for local production-style verification, not packaged distribution.

## Common maintenance tasks

### Desktop fails to launch

Check:

- `scripts/desktop-dev.js`
- `desktop/main.js`
- `desktop/app-server.js`
- whether port `3000` is running the Billbook dev server

### Desktop login fails

Check:

- `BILLBOOK_DESKTOP_AUTH_BASE_URL`
- Cloudflare `/api/*` availability
- Turnstile site key configuration
- desktop session persistence in the local gateway

### Hermes is unavailable

Check:

- `desktop/hermes-manager.js`
- `BILLBOOK_HERMES_COMMAND`
- `BILLBOOK_HERMES_ARGS`
- `BILLBOOK_HERMES_CWD`
- whether `npm run mcp:billbook` works on its own

### MCP sees stale data

Check:

- renderer workspace sync timing in `src/components/billbook-provider.tsx`
- latest DB status in `desktop/ledger-sqlite.js`
- whether MCP writes need to be reflected back into renderer state

## Risks and gotchas

- The desktop UI and website share the same frontend codebase, so a shared component change can affect both runtimes.
- SQLite is currently a mirrored local data source, not the only source of truth for the renderer.
- Packaged desktop auth still depends on the hosted Cloudflare backend being available.
