import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const expectedWorkspaces = ["apps/web", "packages/*", "prototypes/optical-membrane-field"];
const skippedDirectories = new Set([
  ".dart_tool",
  ".git",
  ".idea",
  ".vite",
  "build",
  "dist",
  "node_modules",
]);
const textExtensions = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".dart",
  ".h",
  ".html",
  ".js",
  ".json",
  ".kts",
  ".kt",
  ".mjs",
  ".plist",
  ".swift",
  ".xml",
  ".yaml",
  ".yml",
]);

function fail(message) {
  errors.push(message);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  try {
    return JSON.parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return null;
  }
}

async function listFiles(relativeRoot) {
  const files = [];
  const absoluteRoot = path.join(repositoryRoot, relativeRoot);
  if (!(await exists(absoluteRoot))) return files;

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      if (entry.isFile()) files.push(target);
    }
  }

  await visit(absoluteRoot);
  return files;
}

function repositoryPath(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
}

const rootPackage = await readJson("package.json");
if (rootPackage) {
  if (JSON.stringify(rootPackage.workspaces) !== JSON.stringify(expectedWorkspaces)) {
    fail(`package.json: workspaces must be ${expectedWorkspaces.join(", ")}`);
  }
}

const workspacePackages = new Map([
  ["apps/web/package.json", "@soundscape/web"],
  ["packages/web-visual/package.json", "@soundscape/web-visual"],
  [
    "prototypes/optical-membrane-field/package.json",
    "@soundscape/prototype-optical-membrane-field",
  ],
]);

for (const [manifestPath, expectedName] of workspacePackages) {
  const manifest = await readJson(manifestPath);
  if (manifest?.name !== expectedName) {
    fail(`${manifestPath}: package name must be ${expectedName}`);
  }
}

for (const consumer of [
  "apps/web/package.json",
  "prototypes/optical-membrane-field/package.json",
]) {
  const manifest = await readJson(consumer);
  if (manifest?.dependencies?.["@soundscape/web-visual"] !== "0.1.0") {
    fail(`${consumer}: must depend on @soundscape/web-visual 0.1.0`);
  }
}

const legacyClientRoot = path.join(repositoryRoot, "apps", "mobile");
if (await exists(legacyClientRoot)) fail("apps/mobile: legacy client directory must not exist");

const clientManifest = await readFile(
  path.join(repositoryRoot, "apps", "client", "pubspec.yaml"),
  "utf8",
);
if (!/^name: soundscape_client$/m.test(clientManifest)) {
  fail("apps/client/pubspec.yaml: Dart package name must be soundscape_client");
}

const runtimePack = await readJson("assets/runtime-pack.v1.json");
if (runtimePack?.flutter?.outputRoot !== "apps/client/assets/generated") {
  fail("assets/runtime-pack.v1.json: Flutter outputRoot must target apps/client");
}

for (const root of ["apps", "packages", "prototypes"]) {
  for (const file of await listFiles(root)) {
    if (path.basename(file) === "package-lock.json") {
      fail(`${repositoryPath(file)}: nested npm lockfiles are forbidden`);
    }
  }
}

for (const root of ["apps/web", "apps/client"]) {
  for (const file of await listFiles(root)) {
    if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
    const content = await readFile(file, "utf8");
    if (/assets[\\/]experiments[\\/]/.test(content)) {
      fail(`${repositoryPath(file)}: formal apps cannot depend on experimental assets`);
    }
    if (/(?:^|["'`])(?:\.\.[\\/])+prototypes[\\/]/m.test(content)) {
      fail(`${repositoryPath(file)}: formal apps cannot depend on prototypes`);
    }
  }
}

for (const file of await listFiles("packages")) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const content = await readFile(file, "utf8");
  if (/(?:^|["'`])(?:\.\.[\\/])+apps[\\/]/m.test(content)) {
    fail(`${repositoryPath(file)}: shared packages cannot depend on apps`);
  }
  if (/(?:^|["'`])(?:\.\.[\\/])+prototypes[\\/]/m.test(content)) {
    fail(`${repositoryPath(file)}: shared packages cannot depend on prototypes`);
  }
}

if (errors.length) {
  console.error(`Repository boundary validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `[soundscape] Repository boundaries verified: ${workspacePackages.size} npm workspaces, ` +
      "one Node lockfile, canonical Flutter client, and no formal dependency on experiments.",
  );
}
