# Cloudflare Pages Deployment

This project keeps the existing Next.js 16 frontend as a static export and adds authentication through Cloudflare Pages Functions.

## Stack

- Frontend: Next.js 16 static export (`out/`)
- Backend: Cloudflare Pages Functions (`functions/api/*`)
- Database: Cloudflare D1
- Human verification: Cloudflare Turnstile
- Verification email: Resend
- Session persistence: Secure + HttpOnly Cookie

## Build output

- Build command: `npm run build`
- Output directory: `out`

`next.config.ts` still uses `output: "export"`, so the UI remains static. Dynamic auth endpoints are served by Cloudflare Pages Functions and are not implemented with Next Route Handlers.

## Required files

- Frontend public env example: [`.env.example`](/C:/Users/50700/Documents/New%20project/billbook/.env.example)
- Local Pages Functions env example: [`.dev.vars.example`](/C:/Users/50700/Documents/New%20project/billbook/.dev.vars.example)
- D1 schema SQL: [`database/d1-auth-schema.sql`](/C:/Users/50700/Documents/New%20project/billbook/database/d1-auth-schema.sql)

## Cloudflare setup

1. Create a D1 database, for example `billbook-auth`.
2. Run the schema:

```bash
wrangler d1 execute billbook-auth --file=./database/d1-auth-schema.sql
```

3. In Cloudflare Turnstile, create a site key and secret key for your Pages domain.
4. In Resend, verify your sending domain and create an API key.
5. In Cloudflare Pages, bind the D1 database to `AUTH_DB`.
6. In Cloudflare Pages project settings, add these environment variables:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret
SESSION_PEPPER=replace_with_a_long_random_secret
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Billbook <no-reply@example.com>
RESEND_REPLY_TO_EMAIL=support@example.com
SESSION_COOKIE_NAME=billbook_session
SESSION_TTL_DAYS=30
CODE_TTL_MINUTES=10
SEND_CODE_COOLDOWN_SECONDS=60
LOGIN_FAILURE_LIMIT=5
LOGIN_WINDOW_MINUTES=15
COOKIE_SECURE=true
CORS_ALLOW_ORIGIN=https://your-pages-domain.pages.dev
```

## Local preview

1. Create a local env file by copying `.dev.vars.example` to `.dev.vars`.
2. Make sure `.env` contains `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
3. Start the frontend:

```bash
npm run dev
```

4. Or preview the Pages deployment locally:

```bash
npm run preview
```

If you test auth cookies on plain HTTP locally, set `COOKIE_SECURE=false` in `.dev.vars`. Production should always keep it `true`.

## Deploy

```bash
npm run build
wrangler pages deploy out --project-name billbook
```

Repository shortcut:

```bash
npm run deploy:cloudflare
```

Before the first deploy:

1. Create or reuse a Cloudflare Pages project named `billbook`.
2. Make sure Wrangler is authenticated locally.
3. Confirm the Pages project has the `AUTH_DB` binding and all variables listed above.

## API list

- `POST /api/auth/send-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/logout`
- `POST /api/account/delete`

All endpoints return a unified JSON envelope:

```json
{
  "ok": true,
  "data": {}
}
```

or

```json
{
  "ok": false,
  "error": {
    "code": "SOME_CODE",
    "message": "User-friendly message"
  }
}
```

## Security notes

- Passwords are stored with PBKDF2-SHA256, not in plaintext.
- Email verification codes are hashed before storage.
- Session tokens are never stored in localStorage.
- Cookie settings are `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`.
- Verification codes expire after `CODE_TTL_MINUTES`.
- Sending verification codes is throttled by `SEND_CODE_COOLDOWN_SECONDS`.
- Login failures are rate-limited by email and IP.
- `/api/me` is the only frontend recovery point for login persistence after refresh.
- Same-domain deployment is preferred so the browser can send the auth cookie without custom token storage.
