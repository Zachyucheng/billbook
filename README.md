# Billbook

Billbook is a desktop-first bookkeeping product built with Next.js 16, Electron, and Cloudflare Pages Functions. The public website now acts as a landing page and download surface, while the full bookkeeping workspace lives in the desktop application.

## Architecture

- `src/`: marketing site, workspace UI, and shared frontend code
- `src/components/billbook-provider.tsx`: local workspace state, account session bridging, and browser persistence
- `functions/api/*`: Cloudflare Pages Functions auth API
- `desktop/`: Electron shell, preload bridge, Hermes lifecycle manager, and local MCP server
- `database/d1-auth-schema.sql`: D1 authentication schema
- `docs/cloudflare-pages-deployment.md`: Cloudflare Pages deployment notes
- `docs/desktop-mcp-roadmap.md`: desktop app + MCP transition notes
- `docs/web-development.md`: web maintenance guide
- `docs/desktop-development.md`: desktop maintenance guide
- `docs/mcp-development.md`: MCP maintenance guide

Current behavior:

- Public web root `/` is a promotional landing page for the desktop app.
- Desktop workspace routes live under `/workspace/*`.
- Ledger business data remains in browser local storage so the desktop workspace can keep a stable local-first flow.
- Login, registration, email verification, logout, account deletion, and session cookies are handled by Cloudflare Pages Functions.
- Refreshing the page restores auth state by calling `/api/me` with an HttpOnly Cookie.
- The desktop shell now always boots through a local desktop gateway. In development it proxies page traffic to Next dev, and in desktop mode it serves the exported `out/` build while forwarding `/api/*` auth traffic to the deployed Cloudflare backend.

## Development

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Start the Electron desktop shell against the local Next.js dev server:

```bash
npm run desktop:dev
```

Start the local MCP server that Hermes or other MCP clients can consume:

```bash
npm run mcp:billbook
```

## Verification

```bash
npm run lint
npm run build
```

## Cloudflare Pages Deployment

Because `next.config.ts` uses `output: "export"`, `npm run build` generates a static `out/` directory. Pages Functions under `functions/` are deployed alongside the static assets.

Recommended Cloudflare Pages settings:

- Build command: `npm run build`
- Build output directory: `out`

## Notes

- Existing browser data from the old account-scoped local storage layout is read as a legacy fallback and will continue to load.
- Public frontend config should go into `.env` / Cloudflare Pages build variables, such as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- If your Turnstile site key only allows the hosted Pages domain, set `NEXT_PUBLIC_TURNSTILE_DESKTOP_SITE_KEY` to a second key that also allows `localhost` / `127.0.0.1` so desktop login and registration can complete.
- Desktop download links on the landing page are driven by `NEXT_PUBLIC_BILLBOOK_WINDOWS_DOWNLOAD_URL` and `NEXT_PUBLIC_BILLBOOK_MAC_DOWNLOAD_URL`.
- Private backend secrets should go into Pages / Wrangler secret variables, such as `SESSION_PEPPER` and `RESEND_API_KEY`.
- The packaged desktop app now boots into `/workspace/` through the local desktop gateway instead of loading the hosted site directly.
- Hermes integration starts from the Electron main process and the local MCP server, not from direct renderer Node access.
