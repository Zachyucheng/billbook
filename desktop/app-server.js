/* eslint-disable @typescript-eslint/no-require-imports */
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

class DesktopAppServer {
  constructor(options) {
    this.mode = options.mode;
    this.host = options.host || DEFAULT_SERVER_HOST;
    this.preferredPort = options.port || DEFAULT_SERVER_PORT;
    this.upstreamUrl = options.upstreamUrl ? new URL(options.upstreamUrl) : null;
    this.staticDir = options.staticDir;
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
      upstreamUrl: this.upstreamUrl?.toString() ?? null,
    };
  }

  async handleRequest(request, response) {
    const requestUrl = new URL(request.url || "/", this.getUrl());

    // Health endpoint
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

    // Dev mode: proxy everything to Next.js dev server
    if (this.mode === "development") {
      await this.proxyUpstreamRequest(request, response);
      return;
    }

    // Production mode: serve static files
    await this.serveStaticRequest(request, response, requestUrl);
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

    const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;

    const responseHeaders = {
      "Content-Type": contentType,
      "Cache-Control": "no-cache, must-revalidate",
    };

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
