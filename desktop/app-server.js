/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const zlib = require("node:zlib");
const { pipeline } = require("node:stream/promises");

const DEFAULT_SERVER_HOST = "127.0.0.1";
const DEFAULT_SERVER_PORT = 3210;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function buildOrigin(host, port) {
  return `http://${host}:${port}`;
}

function isPortInUse(port, host = DEFAULT_SERVER_HOST) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        resolve(true);
        return;
      }

      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(false));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort(startPort, attempts = 30) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    const inUse = await isPortInUse(port);

    if (!inUse) {
      return port;
    }
  }

  throw new Error(`No available port found starting from ${startPort}.`);
}

function shouldProxyAuth(pathname) {
  return pathname === "/api/logout" || pathname === "/api/account/delete" || pathname.startsWith("/api/");
}

function isExpiredCookie(attributes) {
  const maxAge = attributes.find((attribute) =>
    attribute.toLowerCase().startsWith("max-age="),
  );

  if (maxAge) {
    const value = Number(maxAge.split("=")[1]);
    if (Number.isFinite(value) && value <= 0) {
      return true;
    }
  }

  const expires = attributes.find((attribute) =>
    attribute.toLowerCase().startsWith("expires="),
  );

  if (!expires) {
    return false;
  }

  const value = expires.slice("expires=".length).trim();
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

class DesktopAppServer {
  constructor(options) {
    this.mode = options.mode;
    this.host = options.host || DEFAULT_SERVER_HOST;
    this.preferredPort = options.port || DEFAULT_SERVER_PORT;
    this.upstreamUrl = options.upstreamUrl ? new URL(options.upstreamUrl) : null;
    this.authBaseUrl = new URL(options.authBaseUrl);
    this.staticDir = options.staticDir;
    this.sessionStorePath = options.sessionStorePath;
    this.encryptString = options.encryptString;
    this.decryptString = options.decryptString;
    this.remoteCookies = new Map();
    this.server = null;
    this.port = null;
    this.origin = null;
  }

  async start() {
    if (this.server) {
      return this.origin;
    }

    if (this.mode === "production") {
      const indexPath = path.join(this.staticDir, "index.html");
      await fsp.access(indexPath);
    }

    await this.loadPersistedSession();

    this.port = await findAvailablePort(this.preferredPort, 50);
    this.origin = buildOrigin(this.host, this.port);
    this.server = http.createServer((request, response) => {
      void this.handleRequest(request, response).catch((error) => {
        response.writeHead(500, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(
          JSON.stringify({
            ok: false,
            error: {
              code: "DESKTOP_SERVER_ERROR",
              message: error instanceof Error ? error.message : String(error),
            },
          }),
        );
      });
    });

    this.server.on("upgrade", (request, socket, head) => {
      if (this.mode !== "development" || !this.upstreamUrl) {
        socket.destroy();
        return;
      }

      this.handleUpgrade(request, socket, head).catch(() => {
        socket.destroy();
      });
    });

    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, this.host, () => {
        this.server.off("error", reject);
        resolve();
      });
    });

    return this.origin;
  }

  async stop() {
    if (!this.server) {
      return;
    }

    const activeServer = this.server;
    this.server = null;
    this.origin = null;
    this.port = null;

    await new Promise((resolve, reject) => {
      activeServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  getUrl() {
    if (!this.origin) {
      throw new Error("Desktop app server has not been started.");
    }

    return this.origin;
  }

  getStatus() {
    return {
      mode: this.mode,
      origin: this.origin,
      authBaseUrl: this.authBaseUrl.toString(),
      upstreamUrl: this.upstreamUrl?.toString() ?? null,
      hasRemoteSession: this.remoteCookies.size > 0,
    };
  }

  async handleRequest(request, response) {
    const requestUrl = new URL(request.url || "/", this.getUrl());

    if (requestUrl.pathname === "/__desktop/health") {
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify({
          ok: true,
          data: this.getStatus(),
        }),
      );
      return;
    }

    if (shouldProxyAuth(requestUrl.pathname)) {
      await this.proxyAuthRequest(request, response, requestUrl);
      return;
    }

    if (this.mode === "development") {
      await this.proxyUpstreamRequest(request, response);
      return;
    }

    await this.serveStaticRequest(request, response, requestUrl);
  }

  async proxyAuthRequest(request, response, requestUrl) {
    const targetUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, this.authBaseUrl);
    const requestBody = await this.readRequestBody(request);
    const headers = new Headers();

    for (const [name, value] of Object.entries(request.headers)) {
      if (!value) {
        continue;
      }

      const lowerName = name.toLowerCase();
      if (["connection", "content-length", "cookie", "host"].includes(lowerName)) {
        continue;
      }

      if (Array.isArray(value)) {
        headers.set(name, value.join(", "));
      } else {
        headers.set(name, value);
      }
    }

    const cookieHeader = this.serializeRemoteCookies();
    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    headers.set("X-Billbook-Desktop", "true");
    headers.set("X-Forwarded-Host", request.headers.host || this.host);
    headers.set("X-Forwarded-Proto", "http");

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method || "GET",
      headers,
      body: this.canRequestHaveBody(request.method) ? requestBody : undefined,
      redirect: "manual",
    });

    const setCookieHeaders = this.getSetCookieHeaders(upstreamResponse);
    if (setCookieHeaders.length > 0) {
      this.applyRemoteSetCookies(setCookieHeaders);
      await this.persistSession();
    }

    const responseHeaders = {};
    upstreamResponse.headers.forEach((value, key) => {
      const lowerName = key.toLowerCase();
      if (["content-encoding", "content-length", "set-cookie", "transfer-encoding"].includes(lowerName)) {
        return;
      }

      responseHeaders[key] = value;
    });

    responseHeaders["Cache-Control"] = responseHeaders["Cache-Control"] || "no-store";
    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    response.writeHead(upstreamResponse.status, responseHeaders);
    response.end(responseBody);
  }

  async proxyUpstreamRequest(request, response) {
    if (!this.upstreamUrl) {
      throw new Error("Missing desktop dev upstream URL.");
    }

    await new Promise((resolve, reject) => {
      const upstreamRequest = http.request(
        {
          protocol: this.upstreamUrl.protocol,
          hostname: this.upstreamUrl.hostname,
          port: this.upstreamUrl.port,
          method: request.method,
          path: request.url,
          headers: {
            ...request.headers,
            host: this.upstreamUrl.host,
          },
        },
        (upstreamResponse) => {
          response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
          upstreamResponse.pipe(response);
          upstreamResponse.on("end", resolve);
        },
      );

      upstreamRequest.on("error", reject);
      request.pipe(upstreamRequest);
    });
  }

  async handleUpgrade(request, socket, head) {
    if (!this.upstreamUrl || this.upstreamUrl.protocol !== "http:") {
      socket.destroy();
      return;
    }

    const upstreamSocket = net.connect(
      Number(this.upstreamUrl.port || "80"),
      this.upstreamUrl.hostname,
      () => {
        const headerLines = Object.entries(request.headers).map(([name, value]) => {
          if (Array.isArray(value)) {
            return `${name}: ${value.join(", ")}`;
          }

          return `${name}: ${value ?? ""}`;
        });

        const rawRequest = [
          `${request.method} ${request.url} HTTP/${request.httpVersion}`,
          `host: ${this.upstreamUrl.host}`,
          ...headerLines.filter((line) => !line.toLowerCase().startsWith("host:")),
          "",
          "",
        ].join("\r\n");

        upstreamSocket.write(rawRequest);
        if (head && head.length > 0) {
          upstreamSocket.write(head);
        }

        socket.pipe(upstreamSocket).pipe(socket);
      },
    );

    upstreamSocket.on("error", () => {
      socket.destroy();
    });

    socket.on("error", () => {
      upstreamSocket.destroy();
    });
  }

  async serveStaticRequest(request, response, requestUrl) {
    const filePath = await this.resolveStaticFilePath(requestUrl.pathname);

    if (!filePath) {
      const notFoundPath = path.join(this.staticDir, "404.html");
      if (await this.fileExists(notFoundPath)) {
        await this.sendStaticFile(request, response, notFoundPath, 404);
        return;
      }

      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("Not Found");
      return;
    }

    await this.sendStaticFile(request, response, filePath, 200);
  }

  async resolveStaticFilePath(pathname) {
    const normalizedPath = decodeURIComponent(pathname);
    const relativePath = normalizedPath.replace(/^\/+/, "");
    const candidates = [];

    if (!relativePath) {
      candidates.push("index.html");
    } else {
      candidates.push(relativePath);
      candidates.push(path.join(relativePath, "index.html"));

      if (!path.extname(relativePath)) {
        candidates.push(`${relativePath}.html`);
      }
    }

    for (const candidate of candidates) {
      const resolvedPath = path.resolve(this.staticDir, candidate);
      if (!resolvedPath.startsWith(path.resolve(this.staticDir))) {
        continue;
      }

      if (await this.fileExists(resolvedPath)) {
        return resolvedPath;
      }
    }

    return null;
  }

  async sendStaticFile(request, response, filePath, statusCode) {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] || "application/octet-stream";
    const stat = await fsp.stat(filePath);

    // ETag: file mtime (epoch ms) + size hex
    const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;

    const responseHeaders = {
      "Content-Type": contentType,
      "Cache-Control": "no-cache, must-revalidate",
    };

    // Support conditional 304 (browser cache revalidation)
    if (request.headers["if-none-match"] === etag) {
      response.writeHead(304, responseHeaders);
      response.end();
      return;
    }

    responseHeaders["ETag"] = etag;

    if (request.method === "HEAD") {
      response.writeHead(statusCode, responseHeaders);
      response.end();
      return;
    }

    // Gzip / brotli compression for text-like resources
    const acceptEncoding = (request.headers["accept-encoding"] || "").toLowerCase();
    const canCompress = /text|javascript|json|xml/.test(contentType);
    const readStream = fs.createReadStream(filePath);

    if (canCompress && stat.size > 512) {
      if (acceptEncoding.includes("br")) {
        responseHeaders["Content-Encoding"] = "br";
        delete responseHeaders["Content-Length"];
        response.writeHead(statusCode, responseHeaders);
        await pipeline(readStream, zlib.createBrotliCompress(), response);
        return;
      }

      if (acceptEncoding.includes("gzip")) {
        responseHeaders["Content-Encoding"] = "gzip";
        delete responseHeaders["Content-Length"];
        response.writeHead(statusCode, responseHeaders);
        await pipeline(readStream, zlib.createGzip(), response);
        return;
      }
    }

    responseHeaders["Content-Length"] = stat.size;
    response.writeHead(statusCode, responseHeaders);
    await pipeline(readStream, response);
  }

  async readRequestBody(request) {
    const chunks = [];

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  canRequestHaveBody(method) {
    return !["GET", "HEAD"].includes((method || "GET").toUpperCase());
  }

  getSetCookieHeaders(response) {
    if (typeof response.headers.getSetCookie === "function") {
      return response.headers.getSetCookie();
    }

    const singleHeader = response.headers.get("set-cookie");
    return singleHeader ? [singleHeader] : [];
  }

  applyRemoteSetCookies(setCookieHeaders) {
    for (const rawCookie of setCookieHeaders) {
      const parts = rawCookie.split(";").map((part) => part.trim());
      const [nameValue, ...attributes] = parts;
      const separatorIndex = nameValue.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const name = nameValue.slice(0, separatorIndex).trim();
      const value = nameValue.slice(separatorIndex + 1).trim();

      if (!value || isExpiredCookie(attributes)) {
        this.remoteCookies.delete(name);
        continue;
      }

      this.remoteCookies.set(name, value);
    }
  }

  serializeRemoteCookies() {
    return [...this.remoteCookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  async loadPersistedSession() {
    if (!this.sessionStorePath) {
      return;
    }

    try {
      const storedValue = await fsp.readFile(this.sessionStorePath, "utf8");
      const decryptedValue = this.decryptString ? this.decryptString(storedValue) : storedValue;
      const payload = JSON.parse(decryptedValue);

      this.remoteCookies = new Map(
        Object.entries(payload.cookies || {}).filter(
          ([name, value]) => typeof name === "string" && typeof value === "string" && value.length > 0,
        ),
      );
    } catch (error) {
      if (error && error.code === "ENOENT") {
        // File doesn't exist yet — first launch, clean state
        return;
      }

      process.stderr.write(
        `[billbook] failed to load persisted session: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      this.remoteCookies.clear();
    }
  }

  async persistSession() {
    if (!this.sessionStorePath) {
      return;
    }

    await fsp.mkdir(path.dirname(this.sessionStorePath), { recursive: true });
    const payload = JSON.stringify({
      cookies: Object.fromEntries(this.remoteCookies.entries()),
    });
    const value = this.encryptString ? this.encryptString(payload) : payload;
    await fsp.writeFile(this.sessionStorePath, value, "utf8");
  }

  async fileExists(filePath) {
    try {
      const stat = await fsp.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }
}

module.exports = {
  DesktopAppServer,
};
