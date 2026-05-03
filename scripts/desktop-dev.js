/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { spawn } = require("node:child_process");
const electronBinary = require("electron");

const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "web");
const isWin = process.platform === "win32";
const nextBin = path.join(webDir, "node_modules", ".bin", isWin ? "next.cmd" : "next");
const preferredDevUrl =
  process.env.BILLBOOK_DESKTOP_UPSTREAM_URL ||
  process.env.BILLBOOK_DESKTOP_DEV_SERVER_URL ||
  "http://127.0.0.1:3000";
const preferredDevPort = (() => {
  try {
    return Number(new URL(preferredDevUrl).port || "3000");
  } catch {
    return 3000;
  }
})();

function buildUrlForPort(port) {
  const url = new URL(preferredDevUrl);
  url.port = String(port);
  return url.toString();
}

function readResponseBody(response) {
  return new Promise((resolve) => {
    const chunks = [];

    response.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    response.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function canReachBillbookServer(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      if ((response.statusCode || 500) >= 400) {
        response.resume();
        resolve(false);
        return;
      }

      void readResponseBody(response).then((body) => {
        resolve(
          body.includes("Billbook") &&
            (body.includes("/_next/") || body.includes("正在恢复你的账本工作区")),
        );
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => {
      resolve(false);
    });
  });
}

function isPortInUse(port, host = "127.0.0.1") {
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

async function findAvailablePort(startPort, attempts = 10) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    const inUse = await isPortInUse(port);

    if (!inUse) {
      return port;
    }
  }

  throw new Error(`No available port found starting from ${startPort}.`);
}

function waitForServer(url, timeoutMs = 120000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      void canReachBillbookServer(url, 2500).then((available) => {
        if (available) {
          resolve();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(tick, 1000);
      });
    };

    tick();
  });
}

function killPortProcess(port) {
  if (!isWin) return;
  try {
    const cmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a 2>nul`;
    execSync(cmd, { stdio: "ignore", timeout: 5000 });
  } catch {
    // Best effort
  }
}

async function main() {
  const hasRunningDevServer = await canReachBillbookServer(preferredDevUrl);
  let nextDev = null;
  let effectivePort = preferredDevPort;
  let effectiveUrl = preferredDevUrl;
  let startedNextDev = false;

  if (!hasRunningDevServer) {
    effectivePort = await findAvailablePort(preferredDevPort);
    effectiveUrl = buildUrlForPort(effectivePort);
    startedNextDev = true;

    nextDev = spawn(nextBin, ["dev", "--webpack", "--port", String(effectivePort)], {
      cwd: webDir,
      stdio: "inherit",
      env: process.env,
    });

    nextDev.on("error", (error) => {
      process.stderr.write(`Failed to start Next dev server: ${error.message}\n`);
    });
  }

  let electron = null;

  const cleanup = () => {
    if (electron && !electron.killed) {
      electron.kill();
    }

    if (nextDev && !nextDev.killed) {
      nextDev.kill();
    } else if (startedNextDev) {
      killPortProcess(effectivePort);
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitForServer(effectiveUrl);

    electron = spawn(electronBinary, ["."], {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        BILLBOOK_DESKTOP_DEV: "true",
        BILLBOOK_DESKTOP_UPSTREAM_URL: effectiveUrl,
        BILLBOOK_DESKTOP_DB_PATH: path.join(rootDir, "desktop", "state", "billbook.sqlite"),
      },
    });

    electron.on("error", (error) => {
      process.stderr.write(`Failed to start Electron: ${error.message}\n`);
      cleanup();
      process.exit(1);
    });

    electron.on("exit", (code) => {
      cleanup();
      process.exit(code ?? 0);
    });
  } catch (error) {
    cleanup();
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
