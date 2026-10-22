#!/usr/bin/env node
// Assembles resources/ — everything electron-builder ships as extraResources
// (see electron-builder.yml) alongside the packaged app, outside app.asar so
// electron/main.js can spawn them as plain subprocesses:
//
//   resources/frontend/  — Next.js standalone build (.next/standalone +
//                           .next/static + public), per Next's own
//                           documented standalone-deployment layout.
//   resources/backend/   — the PyInstaller onedir bundle built by
//                           desktop_plutus_hr-backend's desktop/build.sh.
//
// On Windows it also puts Microsoft's Visual C++ runtime DLLs next to the
// embedded Postgres programs (see bundleVcRuntime below).
//
// Run electron/build-frontend.js and the backend's desktop/build.sh
// first. BACKEND_DIST_DIR overrides where the backend bundle is read
// from; it defaults to the sibling checkout layout this was developed
// against (../desktop_plutus_hr-backend next to this repo) and to what
// the CI workflow (.github/workflows/build-desktop.yml) checks it out to.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const resourcesDir = path.join(repoRoot, "resources");

function copyDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

function requireDir(dir, hint) {
  if (!fs.existsSync(dir)) {
    console.error(`Missing required directory: ${dir}\n${hint}`);
    process.exit(1);
  }
}

function prepareFrontend() {
  const standaloneDir = path.join(repoRoot, ".next", "standalone");
  requireDir(standaloneDir, "Run `npm run electron:build-frontend` first.");

  const dest = path.join(resourcesDir, "frontend");
  copyDir(standaloneDir, dest);

  const staticDir = path.join(repoRoot, ".next", "static");
  if (fs.existsSync(staticDir)) {
    fs.cpSync(staticDir, path.join(dest, ".next", "static"), { recursive: true });
  }

  const publicDir = path.join(repoRoot, "public");
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, path.join(dest, "public"), { recursive: true });
  }
}

function prepareBackend() {
  const backendDistDir =
    process.env.BACKEND_DIST_DIR ||
    path.join(repoRoot, "..", "desktop_plutus_hr-backend", "dist", "plutus-backend");
  requireDir(
    backendDistDir,
    "Build it with desktop/build.sh in desktop_plutus_hr-backend, or set BACKEND_DIST_DIR.",
  );

  copyDir(backendDistDir, path.join(resourcesDir, "backend"));
}

// The embedded Postgres programs (initdb.exe, postgres.exe, pg_ctl.exe and
// their DLLs) need Microsoft's Visual C++ runtime (VCRUNTIME140.dll,
// VCRUNTIME140_1.dll, MSVCP140.dll), which isn't part of Windows and which
// @embedded-postgres/windows-x64 doesn't include. On a PC without the
// Visual C++ Redistributable, initdb failed to start (0xC0000135, DLL not
// found) and the app couldn't create its database. Windows looks for a
// program's DLLs in its own folder first, so this copies them there from
// Visual Studio's redistributable folder, the copy Microsoft provides for
// shipping with an app. VC_RUNTIME_DIR overrides where they're read from.
function findVcRuntimeDir() {
  if (process.env.VC_RUNTIME_DIR) return process.env.VC_RUNTIME_DIR;
  const vswhere = path.join(
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    "Microsoft Visual Studio",
    "Installer",
    "vswhere.exe",
  );
  if (!fs.existsSync(vswhere)) return null;
  const found = execFileSync(
    vswhere,
    ["-latest", "-products", "*", "-find", "VC\\Redist\\MSVC\\*\\x64\\Microsoft.VC*.CRT"],
    { encoding: "utf8" },
  );
  // Visual Studio keeps a redistributable folder per installed toolset
  // (e.g. 14.29 for VS 2019's next to 14.4x and later), and vswhere lists
  // them oldest first. Use the newest: binaries built with a newer
  // toolset, like the embedded Postgres's ICU libraries, crash (0xC0000005)
  // with an older MSVCP140.dll.
  const versionOf = (dir) => {
    const match = /\\MSVC\\(\d+)\.(\d+)\.(\d+)\\/i.exec(dir);
    return match ? match.slice(1).map(Number) : [0, 0, 0];
  };
  const candidates = found
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((dir) => dir && fs.existsSync(path.join(dir, "vcruntime140.dll")))
    .sort((a, b) => {
      const [va, vb] = [versionOf(a), versionOf(b)];
      return vb[0] - va[0] || vb[1] - va[1] || vb[2] - va[2];
    });
  console.log(`Visual C++ runtime folders found (newest first):\n  ${candidates.join("\n  ")}`);
  return candidates[0] || null;
}

function bundleVcRuntime() {
  if (process.platform !== "win32") return;
  const runtimeDir = findVcRuntimeDir();
  if (!runtimeDir) {
    console.error(
      "Couldn't find the Visual C++ runtime DLLs (Visual Studio's VC\\Redist\\MSVC\\*\\x64\\Microsoft.VC*.CRT).\n" +
        "Install Visual Studio's C++ build tools, or set VC_RUNTIME_DIR to a folder containing vcruntime140.dll.",
    );
    process.exit(1);
  }
  const postgresBin = path.join(
    repoRoot,
    "node_modules",
    "@embedded-postgres",
    "windows-x64",
    "native",
    "bin",
  );
  requireDir(postgresBin, "Run `npm ci` first.");
  const dlls = fs.readdirSync(runtimeDir).filter((name) => name.toLowerCase().endsWith(".dll"));
  for (const dll of dlls) {
    fs.copyFileSync(path.join(runtimeDir, dll), path.join(postgresBin, dll));
  }
  console.log(`Copied ${dlls.join(", ")} from ${runtimeDir} to ${postgresBin}`);
}

fs.mkdirSync(resourcesDir, { recursive: true });
prepareFrontend();
prepareBackend();
bundleVcRuntime();
console.log(`Desktop resources assembled at ${resourcesDir}`);
