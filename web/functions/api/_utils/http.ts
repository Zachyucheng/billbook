type D1Result<T> = {
  results?: T[];
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<D1Result<T>>;
  run: () => Promise<unknown>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement;
};

export type Env = {
  AUTH_DB: D1DatabaseLike;
  TURNSTILE_SECRET_KEY?: string;
  SESSION_PEPPER?: string;
  SESSION_COOKIE_NAME?: string;
  SESSION_TTL_DAYS?: string;
  CODE_TTL_MINUTES?: string;
  SEND_CODE_COOLDOWN_SECONDS?: string;
  LOGIN_FAILURE_LIMIT?: string;
  LOGIN_WINDOW_MINUTES?: string;
  COOKIE_SECURE?: string;
  CORS_ALLOW_ORIGIN?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO_EMAIL?: string;
};

export type PagesContext = {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
};

type JsonErrorShape = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export function jsonSuccess(
  request: Request,
  env: Env,
  data: unknown,
  init?: ResponseInit,
) {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: init?.status ?? 200,
    headers: withBaseHeaders(request, env, init?.headers),
  });
}

export function jsonError(
  request: Request,
  env: Env,
  status: number,
  code: string,
  message: string,
  init?: ResponseInit,
) {
  const body: JsonErrorShape = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: withBaseHeaders(request, env, init?.headers),
  });
}

export function optionsResponse(request: Request, env: Env) {
  return new Response(null, {
    status: 204,
    headers: withBaseHeaders(request, env),
  });
}

export async function readJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("请求体不是合法的 JSON。");
  }
}

export function withBaseHeaders(
  request: Request,
  env: Env,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  const origin = request.headers.get("Origin");
  const allowedOrigin = resolveAllowedOrigin(origin, env.CORS_ALLOW_ORIGIN);

  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Vary", "Origin");
  }

  return headers;
}

function resolveAllowedOrigin(origin: string | null, configuredOrigin?: string) {
  if (!origin) {
    return null;
  }

  if (!configuredOrigin) {
    return origin;
  }

  if (configuredOrigin === "*" || configuredOrigin === origin) {
    return origin;
  }

  const allowList = configuredOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowList.includes(origin) ? origin : null;
}
