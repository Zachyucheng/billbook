# Web Development Guide

This document describes the Billbook web frontend and the Cloudflare-hosted backend surface that supports it.

## Scope

The web product is now a public marketing and download surface. The full bookkeeping workspace still exists in the shared frontend codebase, but the website entry point is no longer the bookkeeping product home.

Public web goals:

- show the Billbook product story
- explain the desktop-first value
- link to desktop downloads
- provide legal and security pages
- keep account auth APIs available for the desktop app

## Main directories

- `src/app/page.tsx`: landing page route
- `src/app/privacy/page.tsx`: privacy page
- `src/app/security/page.tsx`: security page
- `src/app/terms/page.tsx`: terms page
- `src/app/workspace/*`: shared workspace routes used by the desktop shell
- `src/components/marketing-page.tsx`: public homepage content
- `src/components/legal-page.tsx`: legal page layout
- `src/components/auth-panel.tsx`: login and registration UI used inside the workspace
- `src/components/billbook-provider.tsx`: workspace state, auth recovery, local persistence
- `functions/api/*`: Cloudflare Pages Functions auth API

## Routing boundary

Current route intent:

- `/`: public landing page
- `/privacy`: legal content
- `/security`: legal content
- `/terms`: legal content
- `/workspace/*`: bookkeeping workspace UI

Maintenance rule:

- Do not move desktop-specific bookkeeping workflows back onto `/`.
- Keep the public website light and promotional.
- Treat `/workspace/*` as shared app UI, primarily for desktop runtime.

## Frontend architecture

The frontend uses:

- Next.js 16
- React 19
- static export build output

Because `next.config.ts` uses `output: "export"`, dynamic app behavior must come from:

- client-side React state
- Cloudflare Pages Functions under `functions/`

Do not add Next Route Handlers for the auth backend unless the deployment architecture changes.

## Auth model

Auth is handled by Cloudflare Pages Functions and D1.

Key endpoints:

- `POST /api/auth/send-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/logout`
- `POST /api/account/delete`

Frontend auth flow:

1. User submits login or registration in the workspace UI.
2. Frontend calls `/api/auth/*`.
3. Server writes an HttpOnly session cookie.
4. Frontend restores session through `/api/me`.

Important maintenance rule:

- Never move session tokens into localStorage.

## Local persistence

Business ledger data is still stored in browser storage through:

- `src/lib/local-ledger.ts`
- `src/lib/local-preferences.ts`

This is separate from Cloudflare auth.

Important maintenance rule:

- Web auth state is server-backed.
- Ledger content is still local-first in the frontend.

## Environment variables

Public frontend variables:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_TURNSTILE_DESKTOP_SITE_KEY`
- `NEXT_PUBLIC_BILLBOOK_WINDOWS_DOWNLOAD_URL`
- `NEXT_PUBLIC_BILLBOOK_MAC_DOWNLOAD_URL`

See:

- `.env.example`
- `.dev.vars.example`

## Local development

Start the website:

```bash
npm run dev
```

Preview the static export through Cloudflare Pages locally:

```bash
npm run preview
```

Quality checks:

```bash
npm run lint
npm run build
```

## Cloudflare deployment

The deployed Pages project is:

- `billbook`

Recommended commands:

```bash
npm run build
wrangler pages deploy out --project-name billbook
```

Repository shortcut:

```bash
npm run deploy:cloudflare
```

That script now expands to:

```bash
npm run build && wrangler pages deploy out --project-name billbook
```

## Deployment checklist

1. Confirm `wrangler.jsonc` still uses `name: "billbook"`.
2. Confirm Pages project `billbook` exists.
3. Confirm D1 binding `AUTH_DB` exists in Pages.
4. Confirm Pages env vars and secrets are configured.
5. Run `npm run deploy:cloudflare`.
6. Verify `/`, `/privacy`, `/terms`, `/security`, and `/api/me`.

## Common maintenance tasks

### Update landing page content

Edit:

- `src/components/marketing-page.tsx`
- `src/lib/site.ts`

### Update legal pages

Edit:

- `src/app/privacy/page.tsx`
- `src/app/security/page.tsx`
- `src/app/terms/page.tsx`
- `src/components/legal-page.tsx`

### Change download URLs

Update:

- Cloudflare Pages env vars for `NEXT_PUBLIC_BILLBOOK_WINDOWS_DOWNLOAD_URL`
- Cloudflare Pages env vars for `NEXT_PUBLIC_BILLBOOK_MAC_DOWNLOAD_URL`

### Change auth backend behavior

Edit:

- `functions/api/*`
- `functions/api/_utils/*`
- `database/d1-auth-schema.sql` if schema changes are needed

## Risks and gotchas

- The website and desktop workspace share frontend code, so route or provider changes can affect both.
- Static export means anything needing server execution must stay in Cloudflare Pages Functions.
- Turnstile often needs separate site keys for hosted Pages and localhost desktop runtime.
