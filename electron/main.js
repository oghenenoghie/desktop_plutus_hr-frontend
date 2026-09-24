// Electron main process for the fully offline desktop build.
//
// Orchestrates three local-only processes, none ever reachable off
// 127.0.0.1: an embedded Postgres cluster (persisted under this app's
// userData dir), the bundled FastAPI backend (see
// desktop_plutus_hr-backend's desktop/desktop_main.py — it runs its own
// alembic migrations on every start), and the Next.js standalone server.
// The BrowserWindow just points at the local Next server, same as any
// browser tab.
const { app, BrowserWindow, dialog } = require("electron");
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
let startupLogPath = null;

// Writes straight to a file rather than console.log/console.error: a
// packaged Electron app is a Windows GUI-subsystem executable with no
// attached console, so stdout/stderr redirection from an external launcher
// (e.g. `Start-Process -RedirectStandardOutput`) is not reliable evidence
// of what actually happened during startup. This file is the source of
// truth for diagnosing a hang or crash before the window ever opens.
function logStartup(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  if (startupLogPath) {
    try {
      fs.appendFileSync(startupLogPath, line + "\n");
    } catch {
      // Best-effort — never let logging itself take down startup.
    }
  }
}

// Surfaces an unexpected process death instead of leaving the window open
// on a UI that silently fails every request. The most common real-world
// cause is antivirus quarantining the unsigned backend executable after
// it already started — invisible from inside the renderer, which only
// ever sees "Failed to fetch". Offers to relaunch, since a transient AV
// scan-and-release often succeeds on retry once excluded.
async function reportProcessCrash(processLabel, code, signal) {
  // shutdown() below is what actually flips this flag — bail here only to
  // avoid piling up a second dialog if both processes happen to die around
  // the same time (e.g. the parent app itself is what's being killed).
  if (shuttingDown) return;
  logStartup(`${processLabel} process exited unexpectedly (code=${code}, signal=${signal}).`);
  const detail =
    `The ${processLabel} process stopped running unexpectedly ` +
    `(exit code ${code ?? "unknown"}${signal ? `, signal ${signal}` : ""}).\n\n` +
    "This is often caused by antivirus software quarantining the app's bundled executables, " +
    "since they aren't code-signed yet. Try adding an exclusion for Plutus's install folder " +
    "in your antivirus settings, then relaunch.\n\n" +
    `Details were logged to:\n${startupLogPath}`;
  const response = dialog.showMessageBoxSync(mainWindow ?? undefined, {
    type: "error",
    title: "Plutus Technologies stopped unexpectedly",
    message: `${processLabel} stopped running`,
    detail,
    buttons: ["Relaunch", "Quit"],
    defaultId: 0,
    cancelId: 1,
  });
  await shutdown();
  if (response === 0) {
    app.relaunch();
  }
  app.exit(1);
}

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
  logStartup("startPostgres: importing embedded-postgres...");
  // embedded-postgres ships ESM-only; this file stays CommonJS (Electron's
  // own convention for main.js) so it needs a dynamic import here rather
  // than a top-level require.
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  logStartup("startPostgres: embedded-postgres imported.");

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
  logStartup(`startPostgres: instance created (wasAlreadyInitialised=${wasAlreadyInitialised}).`);

  if (!wasAlreadyInitialised) {
    logStartup("startPostgres: calling initialise()...");
    await postgres.initialise();
    logStartup("startPostgres: initialise() resolved.");
  }
  logStartup("startPostgres: calling start()...");
  await postgres.start();
  logStartup("startPostgres: start() resolved.");
  if (!wasAlreadyInitialised) {
    logStartup("startPostgres: calling createDatabase()...");
    await postgres.createDatabase("plutus");
    logStartup("startPostgres: createDatabase() resolved.");
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

  backendProcess.on("exit", (code, signal) => {
    if (code !== 0) reportProcessCrash("Backend", code, signal);
  });
  backendProcess.on("error", (error) => {
    logStartup(`Backend process failed to spawn: ${error}`);
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

  frontendProcess.on("exit", (code, signal) => {
    if (code !== 0) reportProcessCrash("Frontend", code, signal);
  });
  frontendProcess.on("error", (error) => {
    logStartup(`Frontend process failed to spawn: ${error}`);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    title: "Plutus Technologies",
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
      logStartup(`Error stopping embedded Postgres: ${error}`);
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
    startupLogPath = path.join(userDataDir, "startup.log");
    logStartup("app.whenReady: starting boot sequence.");

    try {
      const pgPassword = await startPostgres(userDataDir);
      logStartup("Postgres ready. Starting backend...");
      startBackend(userDataDir, pgPassword);
      await waitForHttpOk(`http://127.0.0.1:${BACKEND_PORT}/api/v1/health`);
      logStartup("Backend healthy. Starting frontend...");

      startFrontend();
      await waitForHttpOk(`http://127.0.0.1:${FRONTEND_PORT}`);
      logStartup("Frontend healthy. Creating window...");

      await createWindow();
      logStartup("Window created. Boot sequence complete.");
    } catch (error) {
      logStartup(`Failed to start Plutus desktop: ${error && error.stack ? error.stack : error}`);
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
