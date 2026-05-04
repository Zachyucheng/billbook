# MCP Development Guide

This document describes the Billbook desktop MCP layer for future maintenance.

## Purpose

The MCP server is a local stdio service used by Hermes or other MCP clients. It exposes Billbook desktop context and bookkeeping tools without giving the renderer unrestricted Node.js access.

Current entry point:

- `desktop/mcp/billbook-server.mjs`

Current data source:

- `desktop/ledger-sqlite.js`

## Runtime model

1. The Billbook desktop app runs Electron.
2. The renderer syncs the current workspace snapshot into local SQLite.
3. The local MCP server reads and writes that SQLite store.
4. Hermes calls MCP tools through stdio.

This means the MCP layer is local-first. It does not talk to browser localStorage directly, and it does not call Cloudflare auth APIs for bookkeeping actions.

## Main files

- `desktop/mcp/billbook-server.mjs`: MCP schema registration and tool descriptions
- `desktop/ledger-sqlite.js`: SQLite schema, sync logic, read/write helpers, reporting helpers
- `desktop/main.js`: Electron IPC for `desktop:sync-workspace`
- `src/components/billbook-provider.tsx`: renderer-side workspace sync trigger
- `docs/desktop-mcp-roadmap.md`: roadmap notes and transition history

## Tool groups

### Context and diagnostics

- `get_project_overview`
- `get_desktop_runtime_guide`
- `read_billbook_doc`
- `get_desktop_environment`
- `get_database_status`

Use these when Hermes needs environment awareness before taking action.

### Lookup

- `list_ledgers`
- `list_categories`
- `search_transactions`
- `find_last_transaction`

Use these for retrieval-only questions such as:

- “上一次吃螺蛳粉是什么时候”
- “有哪些消费分类”
- “最近 30 天有哪些理发记录”

### Mutation

- `create_transaction`

This tool is currently the only write path in the MCP layer. It creates one transaction and returns history-display insight when enabled.

Important behavior:

- Only `expense` is supported right now.
- The caller supplies `objectId` and `categoryId`.
- `accountId` is not exposed to the caller.
- For long-term categories, `spreadDays` uses the category default unless the caller overrides it for the current transaction.

### Statistics

- `summarize_object`
- `summarize_category`
- `compare_category_periods`
- `export_report`

Use these when Hermes should answer aggregate questions instead of scanning raw transactions manually.

### Planning

- `list_recurring_plans`

Use this for subscriptions, fixed costs, and upcoming reminders.

## Data contract notes

The MCP layer assumes these rules:

- A transaction must belong to one object.
- A transaction must belong to one category.
- Amounts must be positive numbers.
- Dates are normalized as `YYYY-MM-DD`.
- Long-term spending uses per-transaction `spreadDays`, with category-level default cycle as fallback.
- History-display feedback is read from workspace advanced settings after a successful write.

## How workspace sync works

Renderer sync payload shape:

- `accountId`
- `accountEmail`
- `workspaceUserName`
- `syncedAt`
- `state`

The sync source is created in `src/components/billbook-provider.tsx` by `createDesktopWorkspaceSyncPayload(...)`.

Important maintenance note:

- The renderer remains the source of truth for the web workspace state.
- SQLite is the stable source of truth for MCP reads and writes.
- If the product later moves fully to SQLite, sync responsibilities should be redesigned instead of continuing to mirror full snapshots forever.

## Adding a new MCP tool

1. Add the method to `desktop/ledger-sqlite.js`.
2. Keep validation close to the data layer.
3. Register the tool in `desktop/mcp/billbook-server.mjs` with a tight `zod` schema.
4. Return stable JSON that Hermes can consume directly.
5. Update this document and `docs/desktop-mcp-roadmap.md`.
6. Run `npm run lint` and `npm run build`.

Preferred response shape:

- `found` / `ok` boolean when relevant
- normalized record payload
- short `summary` string for agent-friendly narration

## Current limitations

- No batch transaction write tool yet
- No category-creation confirmation tool yet
- No direct tool for editing or deleting transactions
- No dedicated draft / confirm / commit workflow yet
- Renderer state and SQLite state can diverge if sync fails or if MCP writes are not reflected back into the renderer

## Recommended next additions

- `create_category_with_confirmation`
- `batch_create_transactions`
- `update_transaction`
- `delete_transaction`
- `find_transactions_in_range`
- `summarize_recurring_plan`

## Local commands

Start the MCP server only:

```bash
npm run mcp:billbook
```

Run the full desktop app in development:

```bash
npm run desktop:dev
```

Check quality:

```bash
npm run lint
npm run build
```
