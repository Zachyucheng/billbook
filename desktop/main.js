/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell, Tray, nativeImage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { DesktopAppServer } = require("./app-server");
const { LedgerSqliteStore } = require("./ledger-sqlite");

const DEFAULT_AUTH_BASE_URL = "https://billbook.pages.dev";
const DEFAULT_DEV_UPSTREAM_URL = "http://127.0.0.1:3000";
const DESKTOP_ENTRY_PATH = "/workspace/";
const DESKTOP_SESSION_FILE = "desktop-auth-session.json";
let ledgerStore = null;
let latestDatabaseStatus = null;
let appServer = null;
let tray = null;
let mainWindow = null;

/* ---------- helpers ---------- */

async function readDatabaseStatus() {
  if (!ledgerStore) return null;
  try {
    latestDatabaseStatus = await ledgerStore.getDatabaseStatus();
  } catch (error) {
    latestDatabaseStatus = {
      path: ledgerStore.dbPath,
      exists: false,
      workspaceName: "",
      syncedAt: null,
      accountEmail: "",
      objectCount: 0,
      transactionCount: 0,
      categoryCount: 0,
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
  return latestDatabaseStatus;
}

function isDevelopment() {
  return process.env.BILLBOOK_DESKTOP_DEV === "true";
}

function resolveStartUrl() {
  if (!appServer) throw new Error("Desktop app server has not been started yet.");
  return new URL(DESKTOP_ENTRY_PATH, appServer.getUrl()).toString();
}

/* ---------- window ---------- */

function createWindow() {
  const startUrl = resolveStartUrl();
  const iconPath = path.join(__dirname, "app-icon.png");

  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: "#f4efe6",
    title: "Billbook Desktop",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const allowedOrigin = new URL(startUrl).origin;

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(allowedOrigin)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Close → hide to tray instead of quitting
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadURL(startUrl);
}

/* ---------- tray ---------- */

function getTrayIconPath() {
  return path.join(__dirname, "tray-icon.png");
}

function isAutoStartEnabled() {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}

function isMcpEnabled() {
  const flagPath = path.join(__dirname, "state", ".hermes-access");
  try {
    if (!fs.existsSync(flagPath)) return true;
    return fs.readFileSync(flagPath, "utf8").trim() !== "disabled";
  } catch {
    return true;
  }
}

async function setMcpEnabled(enabled) {
  const flagPath = path.join(__dirname, "state", ".hermes-access");
  await fsp.mkdir(path.dirname(flagPath), { recursive: true });
  await fsp.writeFile(flagPath, enabled ? "enabled" : "disabled", "utf8");
}

function buildTrayMenu() {
  const autoStart = isAutoStartEnabled();
  const mcpOn = isMcpEnabled();

  return Menu.buildFromTemplate([
    {
      label: "打开主面板",
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: `开机自启`,
      type: "checkbox",
      checked: autoStart,
      click: (menuItem) => {
        try {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked });
          // rebuild to keep state consistent
          tray.setContextMenu(buildTrayMenu());
        } catch (e) {
          console.error("Auto-start toggle failed:", e);
        }
      },
    },
    {
      label: "MCP 访问",
      type: "checkbox",
      checked: mcpOn,
      click: async (menuItem) => {
        await setMcpEnabled(menuItem.checked);
        // broadcast to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("desktop:hermes-access-changed", menuItem.checked);
        }
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  // On Windows 32×32 is fine; resize to 16×16 for high-DPI
  tray = new Tray(icon);
  tray.setToolTip("Billbook Desktop");
  tray.setContextMenu(buildTrayMenu());

  // Left-click → show window
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Auto-rebuild menu on right-click to reflect latest state
  tray.on("right-click", () => {
    tray.setContextMenu(buildTrayMenu());
  });
}

/* ---------- encryption ---------- */

function encryptDesktopSession(value) {
  if (!safeStorage.isEncryptionAvailable()) return value;
  return safeStorage.encryptString(value).toString("base64");
}

function decryptDesktopSession(value) {
  if (!safeStorage.isEncryptionAvailable()) return value;
  try {
    return safeStorage.decryptString(Buffer.from(value, "base64"));
  } catch {
    return value;
  }
}

/* ---------- app server ---------- */

async function startDesktopAppServer() {
  const rootDir = path.resolve(__dirname, "..");
  const mode = isDevelopment() ? "development" : "production";
  const authBaseUrl =
    process.env.BILLBOOK_DESKTOP_AUTH_BASE_URL ||
    process.env.BILLBOOK_DESKTOP_APP_URL ||
    DEFAULT_AUTH_BASE_URL;
  const upstreamUrl =
    process.env.BILLBOOK_DESKTOP_UPSTREAM_URL ||
    process.env.BILLBOOK_DESKTOP_DEV_SERVER_URL ||
    DEFAULT_DEV_UPSTREAM_URL;

  appServer = new DesktopAppServer({
    mode,
    authBaseUrl,
    upstreamUrl,
    staticDir: path.join(rootDir, "out"),
    port: Number(process.env.BILLBOOK_DESKTOP_SERVER_PORT || "3210"),
    sessionStorePath: path.join(app.getPath("userData"), DESKTOP_SESSION_FILE),
    encryptString: encryptDesktopSession,
    decryptString: decryptDesktopSession,
  });

  await appServer.start();
}

/* ---------- MCP helpers ---------- */

function getHermesAccessFlagPath() {
  return path.join(__dirname, "state", ".hermes-access");
}

function isHermesAccessEnabled() {
  try {
    const flagPath = getHermesAccessFlagPath();
    if (!fs.existsSync(flagPath)) return true;
    return fs.readFileSync(flagPath, "utf8").trim() !== "disabled";
  } catch {
    return true;
  }
}

async function setHermesAccessFlag(enabled) {
  const flagPath = getHermesAccessFlagPath();
  await fsp.mkdir(path.dirname(flagPath), { recursive: true });
  await fsp.writeFile(flagPath, enabled ? "enabled" : "disabled", "utf8");
}

function broadcastDatabaseStatus() {
  if (!latestDatabaseStatus) return;
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send("desktop:database-status", latestDatabaseStatus);
  }
}

/* ---------- application menu ---------- */

function buildApplicationMenu() {
  const isMac = process.platform === "darwin";
  return Menu.buildFromTemplate([
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
      ],
    },
  ]);
}

/* ---------- lifecycle ---------- */

app.isQuitting = false;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady()
  .then(async () => {
    Menu.setApplicationMenu(buildApplicationMenu());

    ledgerStore = new LedgerSqliteStore({
      dbPath:
        (process.env.BILLBOOK_DESKTOP_DB_PATH || path.join(__dirname, "state", "billbook.sqlite")).trim(),
    });
    void readDatabaseStatus().then(() => {
      broadcastDatabaseStatus();
    });

    ipcMain.handle("desktop:get-environment", async () => ({
      isDesktop: true,
      isDevelopment: isDevelopment(),
      appUrl: resolveStartUrl(),
    }));

    ipcMain.handle("desktop:get-hermes-access", async () => isHermesAccessEnabled());
    ipcMain.handle("desktop:set-hermes-access", async (_event, enabled) => {
      await setHermesAccessFlag(Boolean(enabled));
      return isHermesAccessEnabled();
    });
    ipcMain.handle("desktop:get-database-status", async () => {
      return readDatabaseStatus();
    });
    ipcMain.handle("desktop:sync-workspace", async (_event, payload) => {
      latestDatabaseStatus = await ledgerStore.syncWorkspace(payload);
      broadcastDatabaseStatus();
      return latestDatabaseStatus;
    });
    ipcMain.handle("desktop:read-workspace-state", async () => {
      return ledgerStore.readWorkspaceSnapshot();
    });

    // IPC for tray status queries from renderer
    ipcMain.handle("desktop:get-tray-status", async () => ({
      autoStart: isAutoStartEnabled(),
      mcpEnabled: isMcpEnabled(),
    }));
    ipcMain.handle("desktop:set-auto-start", async (_event, enabled) => {
      app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
      if (tray) tray.setContextMenu(buildTrayMenu());
      return isAutoStartEnabled();
    });

    await startDesktopAppServer();
    createWindow();
    createTray();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[billbook] desktop bootstrap failed: ${message}\n`);
    dialog.showErrorBox("Billbook Startup Error", `The application failed to start:\n\n${message}`);
    app.quit();
  });

app.on("window-all-closed", () => {
  // Don't quit — tray keeps the process alive
});

app.on("before-quit", async () => {
  app.isQuitting = true;
  await appServer?.stop();
});
