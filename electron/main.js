// Electron main process for the fully offline desktop build.
//
// Orchestrates three local-only processes, none ever reachable off
// 127.0.0.1: an embedded Postgres cluster (persisted under this app's
// userData dir), the bundled FastAPI backend (see
// desktop_plutus_hr-backend's desktop/desktop_main.py — it runs its own
// alembic migrations on every start), and the Next.js standalone server.
// The BrowserWindow just points at the local Next server, same as any
// browser tab.
const { app, BrowserWindow } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { PG_PORT, BACKEND_PORT, FRONTEND_PORT } = require("./ports");

let postgres = null;
let backendProcess = null;
let frontendProcess = null;
let mainWindow = null;
let shuttingDown = false;

function resourcePath(...segments) {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", "resources");
  return path.join(base, ...segments);
}

function getOrCreateSecret(dir, filename) {
  const filePath = path.join(dir, filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf8").trim();
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(filePath, secret, { mode: 0o600 });
  return secret;
}

async function waitForHttpOk(url, { timeoutMs = 60_000, intervalMs = 400 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} responded with ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

async function startPostgres(userDataDir) {
  // embedded-postgres ships ESM-only; this file stays CommonJS (Electron's
  // own convention for main.js) so it needs a dynamic import here rather
  // than a top-level require.
  const { default: EmbeddedPostgres } = await import("embedded-postgres");

  const databaseDir = path.join(userDataDir, "pgdata");
  const wasAlreadyInitialised = fs.existsSync(databaseDir);
  const password = getOrCreateSecret(userDataDir, "pg-password.txt");

  postgres = new EmbeddedPostgres({
    databaseDir,
    user: "plutus",
    password,
    port: PG_PORT,
    persistent: true,
  });

  if (!wasAlreadyInitialised) {
    await postgres.initialise();
  }
  await postgres.start();
  if (!wasAlreadyInitialised) {
    await postgres.createDatabase("plutus");
  }

  return password;
}

function startBackend(userDataDir, pgPassword) {
  const jwtSecret = getOrCreateSecret(userDataDir, "jwt-secret.txt");
  const objectStorageSecret = getOrCreateSecret(userDataDir, "object-storage-secret.txt");
  const objectStorageDir = path.join(userDataDir, "object-storage");
  fs.mkdirSync(objectStorageDir, { recursive: true });

  const backendDir = resourcePath("backend");
  const exeName = process.platform === "win32" ? "plutus-backend.exe" : "plutus-backend";

  backendProcess = spawn(path.join(backendDir, exeName), [], {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: `postgresql+psycopg://plutus:${pgPassword}@127.0.0.1:${PG_PORT}/plutus`,
      DESKTOP_BACKEND_HOST: "127.0.0.1",
      DESKTOP_BACKEND_PORT: String(BACKEND_PORT),
      JWT_SECRET: jwtSecret,
      OBJECT_STORAGE_SIGNING_SECRET: objectStorageSecret,
      OBJECT_STORAGE_LOCAL_DIR: objectStorageDir,
      CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${FRONTEND_PORT}`,
      SCHEDULER_ENABLED: "true",
    },
  });

  backendProcess.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`Backend process exited unexpectedly with code ${code}`);
    }
  });
}

function startFrontend() {
  const frontendDir = resourcePath("frontend");

  // Electron's own binary can run plain Node scripts via
  // ELECTRON_RUN_AS_NODE — this is what lets Next's standalone server.js
  // run without bundling a separate Node runtime for it.
  frontendProcess = spawn(process.execPath, [path.join(frontendDir, "server.js")], {
    cwd: frontendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(FRONTEND_PORT),
      HOSTNAME: "127.0.0.1",
    },
  });

  frontendProcess.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`Frontend process exited unexpectedly with code ${code}`);
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    title: "Plutus",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  await mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`);
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (frontendProcess) frontendProcess.kill();
  if (backendProcess) backendProcess.kill();
  if (postgres) {
    try {
      await postgres.stop();
    } catch (error) {
      console.error("Error stopping embedded Postgres:", error);
    }
  }
}

// A second launch (a user double-clicking the app again, or an installer
// that auto-runs it right after our own explicit launch — as some silent
// NSIS installs do) would otherwise try to bind the same fixed ports the
// first instance already holds. Fail that second launch immediately and
// hand focus back to the running window instead.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const userDataDir = app.getPath("userData");
    fs.mkdirSync(userDataDir, { recursive: true });

    try {
      const pgPassword = await startPostgres(userDataDir);
      startBackend(userDataDir, pgPassword);
      await waitForHttpOk(`http://127.0.0.1:${BACKEND_PORT}/api/v1/health`);

      startFrontend();
      await waitForHttpOk(`http://127.0.0.1:${FRONTEND_PORT}`);

      await createWindow();
    } catch (error) {
      console.error("Failed to start Plutus desktop:", error);
      await shutdown();
      app.exit(1);
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", async (event) => {
    if (shuttingDown) return;
    event.preventDefault();
    await shutdown();
    app.exit(0);
  });
}
