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
// Run electron/build-frontend.js and the backend's desktop/build.sh
// first. BACKEND_DIST_DIR overrides where the backend bundle is read
// from; it defaults to the sibling checkout layout this was developed
// against (../desktop_plutus_hr-backend next to this repo) and to what
// the CI workflow (.github/workflows/build-desktop.yml) checks it out to.
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

fs.mkdirSync(resourcesDir, { recursive: true });
prepareFrontend();
prepareBackend();
console.log(`Desktop resources assembled at ${resourcesDir}`);
