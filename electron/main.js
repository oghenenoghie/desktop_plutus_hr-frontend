// Electron main process for the fully offline desktop build.
//
// Orchestrates three local-only processes, none ever reachable off
// 127.0.0.1: an embedded Postgres cluster (persisted under this app's
// userData dir), the bundled FastAPI backend (see
// desktop_plutus_hr-backend's desktop/desktop_main.py — it runs its own
// alembic migrations on every start), and the Next.js standalone server.
// The BrowserWindow just points at the local Next server, same as any
// browser tab.
const { app, BrowserWindow, dialog, shell } = require("electron");
const { execFile, spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const { PG_PORT, BACKEND_PORT, FRONTEND_PORT } = require("./ports");

let postgres = null;
let backendProcess = null;
let frontendProcess = null;
let mainWindow = null;
let shuttingDown = false;
let startupLogPath = null;
let startupStepDuring = "getting ready";
const processLogPaths = {};

// 0xC000013A (STATUS_CONTROL_C_EXIT): Windows ended a console process
// because its console window was closed or it received Ctrl+C.
const WIN_CONTROL_C_EXIT = 3221225786;

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
  const likelyCause =
    code === WIN_CONTROL_C_EXIT
      ? "Windows stopped it because its console window was closed or received Ctrl+C. Relaunching should fix this."
      : "This is often caused by antivirus software quarantining the app's bundled executables, " +
        "since they aren't code-signed yet. Try adding an exclusion for Plutus's install folder " +
        "in your antivirus settings, then relaunch.";
  const logs = [startupLogPath, processLogPaths[processLabel]].filter(Boolean).join("\n");
  const detail =
    `The ${processLabel} process stopped running unexpectedly ` +
    `(exit code ${code ?? "unknown"}${signal ? `, signal ${signal}` : ""}).\n\n` +
    `${likelyCause}\n\n` +
    `Details were logged to:\n${logs}`;
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

// Every child below is spawned with windowsHide (which on Windows sets
// CREATE_NO_WINDOW) so it gets no console window of its own. Without it,
// Windows gives each console-subsystem child (plutus-backend.exe is one)
// a visible black console window, since this GUI app has none to share;
// closing that window sends the child CTRL_CLOSE_EVENT and it dies with
// exit code 0xC000013A (3221225786). With no console there is nothing to
// inherit stdio from, so output goes to a per-process log file instead.
function openProcessLog(userDataDir, name) {
  const logPath = path.join(userDataDir, `${name}.log`);
  const fd = fs.openSync(logPath, "a");
  fs.writeSync(fd, `\n[${new Date().toISOString()}] --- starting ${name} ---\n`);
  return { fd, logPath };
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

// initdb takes the cluster's encoding from the environment's locale, and
// with no UTF-8 locale there (LANG unset, C or POSIX: a Linux session that
// sets none, or a Mac app opened from Finder, which gets no LANG at all)
// that is SQL_ASCII. psycopg hands back text from an SQL_ASCII database as
// bytes, and the backend fails on its first connection. So the cluster is
// always UTF-8. The C locale accepts any encoding, and on Windows UTF-8
// works with any locale; elsewhere initdb refuses UTF-8 under a locale with
// another character set (en_US.ISO-8859-1, say), so that falls back to C.
function initdbFlags(env = process.env) {
  if (process.platform === "win32") return ["--encoding=UTF8"];
  const localeFor = (category) => env.LC_ALL || env[category] || env.LANG || "";
  const acceptsUtf8 = (locale) => !locale || /^(C|POSIX)$/i.test(locale) || /utf-?8/i.test(locale);
  return acceptsUtf8(localeFor("LC_CTYPE")) && acceptsUtf8(localeFor("LC_COLLATE"))
    ? ["--encoding=UTF8"]
    : ["--encoding=UTF8", "--locale=C"];
}

// A cluster created before initdbFlags, without a UTF-8 locale, has an
// SQL_ASCII "plutus" database that the backend failed on before running a
// single migration. It holds nothing (no alembic_version table), so it is
// recreated as UTF-8 rather than leaving the app unable to start. A
// database that was ever migrated is left as it is.
async function recreateEmptySqlAsciiDatabase() {
  const admin = postgres.getPgClient();
  await admin.connect();
  try {
    const { rows } = await admin.query(
      "SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = 'plutus'",
    );
    const encoding = rows[0]?.encoding;
    logStartup(`startPostgres: the plutus database's encoding is ${encoding ?? "(no database)"}.`);
    if (encoding !== "SQL_ASCII") return;

    const database = postgres.getPgClient("plutus");
    await database.connect();
    let migrated;
    try {
      const result = await database.query(
        "SELECT to_regclass('public.alembic_version') IS NOT NULL AS migrated",
      );
      migrated = result.rows[0].migrated;
    } finally {
      await database.end();
    }
    if (migrated) {
      logStartup("startPostgres: it has been migrated, so it is left as it is.");
      return;
    }
    logStartup("startPostgres: it was never migrated; recreating it as UTF-8...");
    await admin.query("DROP DATABASE plutus");
    await admin.query("CREATE DATABASE plutus ENCODING 'UTF8' LOCALE 'C' TEMPLATE template0");
    logStartup("startPostgres: recreated the plutus database as UTF-8.");
  } finally {
    await admin.end();
  }
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
    initdbFlags: initdbFlags(),
  });
  logStartup(`startPostgres: instance created (wasAlreadyInitialised=${wasAlreadyInitialised}).`);

  if (!wasAlreadyInitialised) {
    logStartup(`startPostgres: calling initialise() with ${initdbFlags().join(" ")}...`);
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
  try {
    await recreateEmptySqlAsciiDatabase();
  } catch (error) {
    // A repair step, not a requirement: a healthy database starts anyway.
    logStartup(`startPostgres: couldn't check the plutus database's encoding: ${error}`);
  }

  return password;
}

function startBackend(userDataDir, pgPassword) {
  const jwtSecret = getOrCreateSecret(userDataDir, "jwt-secret.txt");
  // The backend migrates as the cluster's superuser (DATABASE_URL), then
  // serves as an ordinary role with this password, so Postgres row-level
  // security keeps each organisation's data apart (app/desktop_main.py).
  const appDbPassword = getOrCreateSecret(userDataDir, "pg-app-password.txt");
  const objectStorageSecret = getOrCreateSecret(userDataDir, "object-storage-secret.txt");
  const objectStorageDir = path.join(userDataDir, "object-storage");
  fs.mkdirSync(objectStorageDir, { recursive: true });

  const backendDir = resourcePath("backend");
  const exeName = process.platform === "win32" ? "plutus-backend.exe" : "plutus-backend";

  const backendLog = openProcessLog(userDataDir, "backend");
  processLogPaths.Backend = backendLog.logPath;
  backendProcess = spawn(path.join(backendDir, exeName), [], {
    cwd: backendDir,
    windowsHide: true,
    stdio: ["ignore", backendLog.fd, backendLog.fd],
    env: {
      ...process.env,
      DATABASE_URL: `postgresql+psycopg://plutus:${pgPassword}@127.0.0.1:${PG_PORT}/plutus`,
      APP_DATABASE_PASSWORD: appDbPassword,
      DESKTOP_BACKEND_HOST: "127.0.0.1",
      DESKTOP_BACKEND_PORT: String(BACKEND_PORT),
      JWT_SECRET: jwtSecret,
      OBJECT_STORAGE_SIGNING_SECRET: objectStorageSecret,
      OBJECT_STORAGE_LOCAL_DIR: objectStorageDir,
      CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${FRONTEND_PORT}`,
      SCHEDULER_ENABLED: "true",
    },
  });

  fs.closeSync(backendLog.fd);

  backendProcess.on("exit", (code, signal) => {
    if (code !== 0) reportProcessCrash("Backend", code, signal);
  });
  backendProcess.on("error", (error) => {
    logStartup(`Backend process failed to spawn: ${error}`);
  });
}

function startFrontend(userDataDir) {
  const frontendDir = resourcePath("frontend");
  const frontendLog = openProcessLog(userDataDir, "frontend");
  processLogPaths.Frontend = frontendLog.logPath;

  // Electron's own binary can run plain Node scripts via
  // ELECTRON_RUN_AS_NODE — this is what lets Next's standalone server.js
  // run without bundling a separate Node runtime for it.
  frontendProcess = spawn(process.execPath, [path.join(frontendDir, "server.js")], {
    cwd: frontendDir,
    windowsHide: true,
    stdio: ["ignore", frontendLog.fd, frontendLog.fd],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(FRONTEND_PORT),
      HOSTNAME: "127.0.0.1",
    },
  });

  fs.closeSync(frontendLog.fd);

  frontendProcess.on("exit", (code, signal) => {
    if (code !== 0) reportProcessCrash("Frontend", code, signal);
  });
  frontendProcess.on("error", (error) => {
    logStartup(`Frontend process failed to spawn: ${error}`);
  });
}

// Opened the moment the app starts and shows electron/startup.html until
// the app itself is ready, then loads it in place. The database, backend
// and web server can take a minute or more to come up (the first start
// after an install or update also updates the database), and with no
// window at all until then, people took it for an app that doesn't open.
function showStartupWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    title: "Plutus Technologies",
    backgroundColor: "#f8f6ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow
    .loadFile(path.join(__dirname, "startup.html"))
    .catch((error) => logStartup(`Startup window failed to load: ${error}`));
}

// Logs the step and shows it on the startup window. `during` finishes
// "It stopped while ..." if startup fails at this step.
function setStartupStep(step, during) {
  startupStepDuring = during;
  logStartup(`Startup step: ${step}`);
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents
    .executeJavaScript(`window.setStatus && window.setStatus(${JSON.stringify(step)})`)
    .catch(() => {});
}

async function showApp() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  await mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`);
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => server.close(() => resolve(false)));
    server.listen(port, "127.0.0.1");
  });
}

// A previous run that crashed, or was ended from Task Manager, can leave
// its database, backend or web server running and holding the ports this
// run needs, and then nothing starts. The single-instance lock below means
// no other Plutus window is open, so anything of ours still holding them
// is a leftover: electron/stop-plutus.ps1 stops it (sparing this process
// and its own helpers). Windows only, where this has been seen.
async function stopLeftoverProcesses() {
  if (process.platform !== "win32") return;
  const ports = [PG_PORT, BACKEND_PORT, FRONTEND_PORT];
  const inUse = await Promise.all(ports.map(isPortInUse));
  const busy = ports.filter((_, i) => inUse[i]);
  if (busy.length === 0) return;
  logStartup(`Ports already in use: ${busy.join(", ")}. Stopping processes left from a previous run...`);
  await new Promise((resolve) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(__dirname, "stop-plutus.ps1"),
        "-ExcludeProcessId",
        String(process.pid),
      ],
      { windowsHide: true, timeout: 60_000 },
      (error) => {
        if (error) logStartup(`Stopping leftover processes failed: ${error}`);
        resolve();
      },
    );
  });
}

// Startup used to fail by closing without a word, with the reason only in
// startup.log. Says what happened and offers the likely fixes instead.
async function reportStartupFailure(error, userDataDir) {
  const reason = error && error.message ? error.message : String(error);
  const response = dialog.showMessageBoxSync(mainWindow ?? undefined, {
    type: "error",
    title: "Plutus Technologies couldn't start",
    message: "Plutus Technologies couldn't start",
    detail:
      `It stopped while ${startupStepDuring}.\n\n` +
      "Try again first: a second attempt often works, especially just after installing or updating.\n\n" +
      "If it keeps happening, antivirus software may be blocking part of the app, since it isn't " +
      "code-signed yet. Allowing Plutus Technologies in your antivirus usually fixes that.\n\n" +
      `Details (${reason}) were saved in:\n${userDataDir}`,
    buttons: ["Try again", "Open details folder", "Quit"],
    defaultId: 0,
    cancelId: 2,
  });
  if (response === 1) await shell.openPath(userDataDir);
  await shutdown();
  if (response === 0) app.relaunch();
  app.exit(1);
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
    showStartupWindow();

    try {
      setStartupStep("Getting ready…", "getting ready");
      await stopLeftoverProcesses();

      setStartupStep("Starting the database…", "starting its database");
      const pgPassword = await startPostgres(userDataDir);

      // The backend updates the database before it answers (always on the
      // first start after an install or update), and on Windows the
      // antivirus scan of its files on first run can take minutes, so this
      // allows far longer than a normal start needs.
      setStartupStep("Updating your data and starting the app…", "starting its backend service");
      startBackend(userDataDir, pgPassword);
      await waitForHttpOk(`http://127.0.0.1:${BACKEND_PORT}/api/v1/health`, { timeoutMs: 5 * 60_000 });

      setStartupStep("Opening Plutus Technologies…", "opening its screens");
      startFrontend(userDataDir);
      await waitForHttpOk(`http://127.0.0.1:${FRONTEND_PORT}`, { timeoutMs: 2 * 60_000 });

      await showApp();
      logStartup("App shown. Boot sequence complete.");
    } catch (error) {
      logStartup(`Failed to start Plutus desktop: ${error && error.stack ? error.stack : error}`);
      // Closing the startup window quits on purpose; that isn't a failure.
      if (shuttingDown) return;
      await reportStartupFailure(error, userDataDir);
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
