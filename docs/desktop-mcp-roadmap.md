# Desktop + MCP Roadmap

This repository is now focused on two layers:

1. The existing web product and Cloudflare auth backend.
2. A future desktop shell that wraps the web product and adds local MCP capabilities.

## Current scaffold

The first desktop scaffold is now in place:

- `desktop/main.js`: Electron entry point
- `desktop/preload.js`: secure renderer bridge
- `desktop/hermes-manager.js`: Hermes sidecar lifecycle control
- `desktop/mcp/billbook-server.mjs`: local stdio MCP server
- `scripts/desktop-dev.js`: one-command local desktop development
- `.mcp.json`: local MCP discovery for Next devtools and Billbook desktop

## Current data layer

The second phase adds a local SQLite sync layer:

- `desktop/ledger-sqlite.js`: persists a local Billbook SQLite database
- The renderer can now sync the current browser workspace into SQLite from the settings page
- Electron now auto-syncs workspace changes into SQLite with a short debounce
- MCP tools now read the SQLite store instead of browser localStorage

Current MCP tools:

- `get_database_status`
- `list_ledgers`
- `list_categories`
- `create_transaction`
- `search_transactions`
- `find_last_transaction`
- `summarize_category`
- `list_recurring_plans`
- `compare_category_periods`
- `export_report`
- `summarize_object`

## Scenario-driven structure

The MCP surface is now organized around four common Hermes workflow layers:

1. Retrieval
   - `search_transactions`
   - `find_last_transaction`
2. Mutation
   - `create_transaction`
3. Statistics
   - `summarize_object`
   - `summarize_category`
   - `compare_category_periods`
4. Planning / reminders
   - `list_recurring_plans`

This structure covers examples such as:

- "When was the last time I ate luosifen?"
- "How much did I spend on dining this month?"
- "Is my milk-tea spending higher than the previous 30-day period?"
- "What subscriptions or fixed costs are due next week?"

## Recommended default direction

- Desktop shell: Electron
- UI reuse: keep the current Next.js frontend as the primary interface
- Local integration: run an MCP client or helper process from the desktop shell
- Cloud auth: continue using the existing Cloudflare Pages + D1 + session cookie flow

## Why this path fits the current repo

- The current app already works as a browser-first product.
- Cloudflare Pages remains the simplest hosted auth/backend layer.
- A desktop shell can add local file access, local AI tools, and MCP workflows without rewriting the product.

## Suggested next implementation steps

1. Add a desktop workspace such as `desktop/` with Electron main/preload processes.
2. Point the desktop window at the local dev server in development and the exported web build in production.
3. Define the first MCP use cases, such as local file import/export, report generation, or AI assistant actions.
4. Add a secure IPC boundary so the renderer never gets unrestricted Node access.
5. Keep authentication on the existing `/api/*` backend unless a local-only desktop mode is explicitly needed later.

## What to build next

1. Expand the MCP server further with mutation-safe tools such as `create_transaction_draft`, `create_category_with_confirmation`, and batch transaction helpers.
2. Add installer and packaging workflows after the Hermes command path is stable on your machine.
3. Consider moving the browser workspace source of truth itself from localStorage to SQLite so web and desktop stop diverging over time.

## Security baseline for the desktop phase

- Enable `contextIsolation`
- Disable unrestricted `nodeIntegration`
- Expose only audited preload APIs
- Keep secrets out of the renderer and out of localStorage
- Reuse the current server-side session cookie model whenever possible
