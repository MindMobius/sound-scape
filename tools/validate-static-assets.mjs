import { access, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

async function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  try {
    return JSON.parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return null;
  }
}

async function exists(relativePath) {
  try {
    await access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    fail(`${relativePath}: file not found`);
    return false;
  }
}

async function listFiles(relativeDirectory) {
  const files = [];

  async function visit(currentDirectory) {
    const entries = await readdir(path.join(repoRoot, currentDirectory), { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = path.posix.join(currentDirectory.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) await visit(relativePath);
      if (entry.isFile()) files.push(relativePath);
    }
  }

  await visit(relativeDirectory);
  return files;
}

function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    }
    offset += segmentLength;
  }

  return null;
}

function imageSize(buffer) {
  return pngSize(buffer) ?? jpegSize(buffer);
}

const catalog = await readJson("assets/catalog.json");
const derivatives = await readJson("assets/derivatives.json");
const sceneIndex = await readJson("assets/scenes/index.json");
const assetIds = new Set();
const assetPaths = new Set();
const catalogById = new Map();
const derivativeIds = new Set();
const derivativePaths = new Set();

if (catalog) {
  if (catalog.schemaVersion !== 1 || catalog.policy !== "static-first") {
    fail("assets/catalog.json: unsupported schema or policy");
  }

  for (const asset of catalog.assets ?? []) {
    if (assetIds.has(asset.id)) fail(`duplicate asset id: ${asset.id}`);
    assetIds.add(asset.id);
    catalogById.set(asset.id, asset);

    if (assetPaths.has(asset.path)) fail(`duplicate asset path: ${asset.path}`);
    assetPaths.add(asset.path);

    const isStaticPath = ["assets/brand/", "assets/scenes/", "assets/ui/"].some((root) =>
      asset.path.startsWith(root),
    );
    if (!isStaticPath || asset.path.includes("/experiments/")) {
      fail(
        `${asset.id}: static catalog path must stay under assets/brand, assets/scenes, or assets/ui`,
      );
    }

    if (asset.path.startsWith("assets/scenes/")) {
      if (!asset.sceneId || !asset.path.startsWith(`assets/scenes/${asset.sceneId}/`)) {
        fail(`${asset.id}: sceneId must match its scene directory`);
      }
    } else if (Object.hasOwn(asset, "sceneId")) {
      fail(`${asset.id}: shared assets must not declare sceneId`);
    }

    if (!(await exists(asset.path)) || !(await exists(asset.prompt))) continue;
    const buffer = await readFile(path.join(repoRoot, asset.path));
    const size = imageSize(buffer);
    if (!size || size.width !== asset.width || size.height !== asset.height) {
      fail(
        `${asset.id}: expected ${asset.width}x${asset.height}, found ${size ? `${size.width}x${size.height}` : "unsupported raster"}`,
      );
    }

    const digest = createHash("sha256").update(buffer).digest("hex");
    if (digest !== asset.sha256) fail(`${asset.id}: SHA-256 mismatch`);
  }
}

if (derivatives) {
  if (derivatives.schemaVersion !== 1 || derivatives.policy !== "web-raster-derivatives") {
    fail("assets/derivatives.json: unsupported schema or policy");
  }

  for (const derivative of derivatives.derivatives ?? []) {
    if (derivativeIds.has(derivative.id)) fail(`duplicate derivative id: ${derivative.id}`);
    derivativeIds.add(derivative.id);
    if (derivativePaths.has(derivative.path)) fail(`duplicate derivative path: ${derivative.path}`);
    derivativePaths.add(derivative.path);

    const source = catalogById.get(derivative.sourceAssetId);
    if (!source)
      fail(
        `${derivative.id}: sourceAssetId ${derivative.sourceAssetId} is not registered in assets/catalog.json`,
      );
    if (!derivative.path.startsWith("assets/scenes/") || !/\.jpe?g$/i.test(derivative.path)) {
      fail(`${derivative.id}: Web raster derivative must be a JPEG under assets/scenes`);
    }
    if (source?.sceneId && !derivative.path.startsWith(`assets/scenes/${source.sceneId}/`)) {
      fail(`${derivative.id}: derivative path must stay with source scene ${source.sceneId}`);
    }
    if (derivative.format !== "jpeg" || derivative.fit !== "cover" || !derivative.encoderQuality) {
      fail(`${derivative.id}: format, fit, and encoderQuality are required`);
    }
    if (!(await exists(derivative.path))) continue;

    const buffer = await readFile(path.join(repoRoot, derivative.path));
    const size = imageSize(buffer);
    if (!size || size.width !== derivative.width || size.height !== derivative.height) {
      fail(
        `${derivative.id}: expected ${derivative.width}x${derivative.height}, found ${size ? `${size.width}x${size.height}` : "unsupported raster"}`,
      );
    }
    const digest = createHash("sha256").update(buffer).digest("hex");
    if (digest !== derivative.sha256) fail(`${derivative.id}: SHA-256 mismatch`);
  }
}

if (catalog && derivatives) {
  const productionRasters = [
    ...(await listFiles("assets/brand")),
    ...(await listFiles("assets/scenes")),
    ...(await listFiles("assets/ui")),
  ].filter((file) => /\.(?:png|jpe?g)$/i.test(file));

  for (const file of productionRasters) {
    if (!assetPaths.has(file) && !derivativePaths.has(file)) {
      fail(
        `${file}: production raster is not registered in assets/catalog.json or assets/derivatives.json`,
      );
    }
  }
}

const sceneIds = new Set();
let fallbackBindings = 0;
let readyBindings = 0;

if (sceneIndex) {
  for (const entry of sceneIndex.scenes ?? []) {
    if (sceneIds.has(entry.id)) fail(`duplicate scene id: ${entry.id}`);
    sceneIds.add(entry.id);
    if (!(await exists(entry.manifest))) continue;

    const scene = await readJson(entry.manifest);
    if (!scene) continue;
    if (scene.id !== entry.id) fail(`${entry.manifest}: id does not match scene index`);
    if (scene.status !== entry.status) fail(`${entry.manifest}: status does not match scene index`);
    if (!scene.prompt?.trim()) fail(`${entry.manifest}: prompt is required`);
    if (!scene.visualBrief?.trim()) fail(`${entry.manifest}: visualBrief is required`);
    if (!Array.isArray(scene.audioLayers) || scene.audioLayers.length < 2) {
      fail(`${entry.manifest}: at least two audio layers are required`);
    }

    for (const slotName of ["hero", "banner", "cover", "thumbnail", "detail"]) {
      const slot = scene.slots?.[slotName];
      if (!slot) {
        fail(`${entry.manifest}: missing ${slotName} slot`);
        continue;
      }
      if (slot.status === "planned" && slot.assetId !== null) {
        fail(`${entry.manifest}: planned ${slotName} must use a null assetId`);
      }
      if (slot.status !== "planned") {
        fallbackBindings += Number(slot.status === "shared-fallback");
        readyBindings += Number(slot.status === "ready");
        const asset = catalogById.get(slot.assetId);
        if (!asset) {
          fail(`${entry.manifest}: ${slotName} references unknown asset ${slot.assetId}`);
        } else if (slot.status === "shared-fallback" && !asset.path.startsWith("assets/brand/")) {
          fail(`${entry.manifest}: shared ${slotName} must reference a brand asset`);
        } else if (
          slot.status === "ready" &&
          !asset.path.startsWith(`assets/scenes/${scene.id}/`)
        ) {
          fail(`${entry.manifest}: ready ${slotName} must reference an asset owned by ${scene.id}`);
        }
      }
    }
  }

  if (!sceneIds.has(sceneIndex.defaultScene)) {
    fail("assets/scenes/index.json: defaultScene is not registered");
  }

  for (const asset of catalog?.assets ?? []) {
    if (asset.sceneId && !sceneIds.has(asset.sceneId)) {
      fail(`${asset.id}: sceneId ${asset.sceneId} is not registered in the scene index`);
    }
  }
}

if (errors.length) {
  console.error(`Static asset validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Static asset validation passed: ${assetIds.size} catalog assets, ${derivativeIds.size} Web derivatives, ${sceneIds.size} scenes, ${readyBindings} ready bindings, ${fallbackBindings} explicit fallback bindings.`,
  );
}
