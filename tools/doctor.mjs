#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const packageManifest = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
);
const webOnly = process.argv.includes("--web");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--web");
const errors = [];
const warnings = [];
const details = [];
const isWindows = process.platform === "win32";

if (unknownArguments.length > 0) {
  console.error(`Unknown argument(s): ${unknownArguments.join(", ")}. Supported: --web`);
  process.exit(2);
}

function run(command, args, { cwd = repositoryRoot, shell = false } = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    shell,
    windowsHide: true,
  });
}

function outputOf(command, args, options) {
  const result = run(command, args, options);
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim();
}

function npmVersion() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
  ].filter(Boolean);
  const npmCli = candidates.find((candidate) => fs.existsSync(candidate));
  if (npmCli) return outputOf(process.execPath, [npmCli, "--version"]);
  if (!isWindows) return outputOf("npm", ["--version"]);
  return outputOf(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm --version"]);
}

function addError(label, message) {
  errors.push(`${label}: ${message}`);
}

function addWarning(label, message) {
  warnings.push(`${label}: ${message}`);
}

function addDetail(label, message) {
  details.push(`${label}: ${message}`);
}

function checkVersion(label, actual, expected) {
  if (actual === expected) {
    addDetail(label, `${actual} (expected)`);
  } else {
    addError(label, `expected ${expected}, found ${actual || "unavailable"}`);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"));
}

function checkRepositoryFiles() {
  const requiredFiles = [
    ".nvmrc",
    "AGENTS.md",
    "README.md",
    "PRODUCT.md",
    "DESIGN.md",
    "package-lock.json",
    "docs/development/new-machine-setup.md",
    "docs/status/current-development-state.md",
    "docs/status/next-milestones.md",
    "assets/audio/sound-library.v1.json",
    "assets/scenes/playable-scenes.v1.json",
    "assets/runtime-pack.v1.json",
    "contracts/scene-recipe.v1.schema.json",
    "apps/client/.flutter-version",
    "apps/client/pubspec.lock",
  ];
  const missing = requiredFiles.filter(
    (relativePath) => !fs.existsSync(path.join(repositoryRoot, relativePath)),
  );
  if (missing.length > 0) {
    addError("Repository", `missing tracked file(s): ${missing.join(", ")}`);
  } else {
    addDetail("Repository", `${requiredFiles.length} handoff-critical files present`);
  }
}

function checkCatalogs() {
  try {
    const library = readJson("assets/audio/sound-library.v1.json");
    const playableScenes = readJson("assets/scenes/playable-scenes.v1.json");
    const missingAudio = new Set();
    for (const asset of library.assets ?? []) {
      for (const segment of asset.segments ?? []) {
        if (!fs.existsSync(path.join(repositoryRoot, segment.path))) {
          missingAudio.add(segment.path);
        }
      }
    }
    if (missingAudio.size > 0) {
      addError("Audio catalog", `missing file(s): ${[...missingAudio].join(", ")}`);
    }
    const approved = (library.assets ?? []).filter(
      (asset) => asset.releaseStatus === "approved" && asset.availability === "bundled",
    ).length;
    addDetail(
      "Content",
      `${library.assets?.length ?? 0} audio assets (${approved} bundled and approved), ` +
        `${playableScenes.scenes?.length ?? 0} playable scenes`,
    );
  } catch (error) {
    addError("Content", error.message);
  }
}

function checkGit() {
  const gitVersion = outputOf("git", ["--version"]);
  if (!gitVersion) {
    addError("Git", "not available on PATH");
    return;
  }
  addDetail("Git", gitVersion.replace(/^git version\s+/, ""));

  const origin = outputOf("git", ["config", "--get", "remote.origin.url"]);
  if (!origin) {
    addWarning("Git remote", "origin is not configured");
  } else {
    addDetail("Git remote", origin);
    const acceptedOrigins = new Set([
      "git@github.com:MindMobius/sound-scape.git",
      "https://github.com/MindMobius/sound-scape.git",
      "ssh://git@github.com/MindMobius/sound-scape.git",
    ]);
    if (!acceptedOrigins.has(origin)) {
      addWarning("Git remote", "origin differs from the canonical GitHub repository");
    }
  }

  const status = outputOf("git", ["status", "--porcelain"]);
  if (status) addWarning("Working tree", "contains uncommitted files");
  else addDetail("Working tree", "clean");

  const upstream = outputOf("git", [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}",
  ]);
  if (!upstream) {
    addWarning("Git tracking", "current branch has no upstream");
    return;
  }
  const counts = outputOf("git", ["rev-list", "--left-right", "--count", `${upstream}...HEAD`]);
  if (counts) {
    const [behind, ahead] = counts.split(/\s+/);
    addDetail("Git tracking", `${upstream}, behind ${behind}, ahead ${ahead} (fetch to refresh)`);
  }
}

function checkDependencies() {
  if (!fs.existsSync(path.join(repositoryRoot, "node_modules", ".package-lock.json"))) {
    addWarning("Node dependencies", "not restored; run npm ci");
  } else {
    addDetail("Node dependencies", "installed");
  }

  const generatedCatalog = path.join(
    repositoryRoot,
    "apps",
    "client",
    "assets",
    "generated",
    "catalog",
    "sound-library.v1.json",
  );
  if (!fs.existsSync(generatedCatalog)) {
    addWarning("Flutter assets", "generated copy is absent; run npm run assets:sync");
  } else {
    addDetail("Flutter assets", "generated copy is present");
  }
}

function checkFlutter() {
  if (webOnly) {
    addDetail("Flutter", "skipped by --web");
    return;
  }
  const result = run(process.execPath, [path.join(scriptDirectory, "flutter.mjs"), "doctor"]);
  if (result.stdout.trim()) process.stdout.write(`${result.stdout.trim()}\n`);
  if (result.status !== 0 || result.error) {
    const message = result.stderr.trim() || result.error?.message || "doctor failed";
    addError("Flutter", message);
  } else {
    addDetail("Flutter", "pinned SDK found; platform details printed above");
  }
}

console.log(`[soundscape] Environment doctor (${webOnly ? "web" : "full"})`);
checkVersion("Node.js", process.version.replace(/^v/, ""), packageManifest.engines.node);
const expectedNpm = packageManifest.packageManager.replace(/^npm@/, "");
checkVersion("npm", npmVersion(), expectedNpm);
checkRepositoryFiles();
checkCatalogs();
checkGit();
checkDependencies();
checkFlutter();

for (const detail of details) console.log(`PASS ${detail}`);
for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`FAIL ${error}`);

if (errors.length > 0) {
  console.error(
    `[soundscape] Doctor failed with ${errors.length} error(s) and ${warnings.length} warning(s).`,
  );
  process.exitCode = 1;
} else {
  console.log(`[soundscape] Doctor passed with ${warnings.length} warning(s).`);
}
