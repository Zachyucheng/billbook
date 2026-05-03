/* eslint-disable @typescript-eslint/no-require-imports */
const { EventEmitter } = require("node:events");
const { spawn } = require("node:child_process");

function parseArgs(value) {
  if (!value) {
    return [];
  }

  return value
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

class HermesManager extends EventEmitter {
  constructor() {
    super();
    this.command = process.env.BILLBOOK_HERMES_COMMAND || "hermes";
    this.args = parseArgs(process.env.BILLBOOK_HERMES_ARGS || "agent");
    this.cwd = process.env.BILLBOOK_HERMES_CWD || process.cwd();
    this.child = null;
    this.logs = [];
    this.lastError = null;
    this.lastExitCode = null;
  }

  appendLog(message) {
    const lines = String(message)
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);

    for (const line of lines) {
      this.logs.push(line);
    }

    if (this.logs.length > 120) {
      this.logs = this.logs.slice(-120);
    }
  }

  getStatus() {
    return {
      configured: Boolean(this.command),
      running: Boolean(this.child),
      command: [this.command, ...this.args].join(" "),
      cwd: this.cwd,
      lastError: this.lastError,
      lastExitCode: this.lastExitCode,
      recentLogs: this.logs.slice(-20),
    };
  }

  emitStatus() {
    this.emit("status", this.getStatus());
  }

  async start() {
    if (this.child) {
      return this.getStatus();
    }

    this.lastError = null;
    this.lastExitCode = null;

    try {
      this.child = spawn(this.command, this.args, {
        cwd: this.cwd,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.emitStatus();
      return this.getStatus();
    }

    this.appendLog(`Starting Hermes: ${this.command} ${this.args.join(" ")}`.trim());

    this.child.stdout?.on("data", (chunk) => {
      this.appendLog(chunk);
      this.emitStatus();
    });

    this.child.stderr?.on("data", (chunk) => {
      this.appendLog(chunk);
      this.emitStatus();
    });

    this.child.on("error", (error) => {
      this.lastError = error.message;
      this.appendLog(`Hermes error: ${error.message}`);
      this.child = null;
      this.emitStatus();
    });

    this.child.on("exit", (code) => {
      this.lastExitCode = code;
      this.appendLog(`Hermes exited with code ${code ?? "null"}`);
      this.child = null;
      this.emitStatus();
    });

    this.emitStatus();
    return this.getStatus();
  }

  async stop() {
    if (!this.child) {
      return this.getStatus();
    }

    const child = this.child;
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {}
      }, 3000);

      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });

      try {
        child.kill("SIGTERM");
      } catch {
        clearTimeout(timeout);
        resolve();
      }
    });

    return this.getStatus();
  }

  async restart() {
    await this.stop();
    return this.start();
  }
}

module.exports = {
  HermesManager,
};
