#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");
const packPath = path.join(repositoryRoot, "assets", "runtime-pack.v1.json");
const playableCatalogPath = path.join(
  repositoryRoot,
  "assets",
  "scenes",
  "playable-scenes.v1.json",
);
const sceneIndexPath = path.join(repositoryRoot, "assets", "scenes", "index.json");
const assetCatalogPath = path.join(repositoryRoot, "assets", "catalog.json");
const derivativeCatalogPath = path.join(repositoryRoot, "assets", "derivatives.json");
const sceneRecipeSchemaPath = path.join(repositoryRoot, "contracts", "scene-recipe.v1.schema.json");
const playableSchemaPath = path.join(repositoryRoot, "contracts", "playable-scenes.v1.schema.json");
const generatedSceneCatalogPath = path.join(
  repositoryRoot,
  "apps",
  "client",
  "lib",
  "domain",
  "generated",
  "soundscape_catalog.g.dart",
);
const allowedOutputRoot = path.join(repositoryRoot, "apps", "client", "assets", "generated");

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveRepositoryPath(relativePath, label) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath)
  ) {
    fail(`${label} must be a non-empty repository-relative path.`);
  }
  const resolved = path.resolve(repositoryRoot, relativePath);
  const relative = path.relative(repositoryRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`${label} escapes the repository: ${relativePath}`);
  }
  return resolved;
}

function normalizedRelativePath(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string.`);
  const normalized = value.replaceAll("\\", "/");
  if (
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    fail(`${label} is not a safe relative path: ${value}`);
  }
  return normalized;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function uniqueMap(items, key, label) {
  const result = new Map();
  for (const item of items) {
    const value = item[key];
    if (result.has(value)) fail(`${label} contains duplicate ${key}: ${value}.`);
    result.set(value, item);
  }
  return result;
}

function required(map, key, label) {
  const value = map.get(key);
  if (value === undefined) fail(`${label} is not registered: ${key}.`);
  return value;
}

function validatePlayableCatalog(catalog) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const recipeSchema = readJson(sceneRecipeSchemaPath);
  ajv.addSchema(recipeSchema);
  const validate = ajv.compile(readJson(playableSchemaPath));
  if (!validate(catalog)) {
    fail(`Playable scene catalog is invalid: ${ajv.errorsText(validate.errors)}.`);
  }
}

function dartString(value) {
  const escaped = value
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("$", "\\$")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t");
  return `'${escaped}'`;
}

function dartNumber(value) {
  if (!Number.isFinite(value)) fail(`Cannot generate a non-finite Dart number: ${value}.`);
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

function generatedLayer(layer) {
  const segments = layer.segmentIds.map(dartString).join(", ");
  return `      SoundLayerDefinition(
        id: ${dartString(layer.id)},
        name: ${dartString(layer.name)},
        assetId: ${dartString(layer.assetId)},
        segmentIds: <String>[${segments}],
        kind: SoundLayerKind.${layer.kind},
        baseGain: ${dartNumber(layer.baseGain)},
        intensityGain: ${dartNumber(layer.intensityGain)},
        richnessGain: ${dartNumber(layer.richnessGain)},
        pan: ${dartNumber(layer.pan)},
        enabledByDefault: ${layer.enabledByDefault},
        eventPolicy: SoundEventPolicy(
          minimumSilence: Duration(
            milliseconds: ${layer.eventPolicy.minimumSilenceMs},
          ),
          maximumSilence: Duration(
            milliseconds: ${layer.eventPolicy.maximumSilenceMs},
          ),
          scheduleLead: Duration(
            milliseconds: ${layer.eventPolicy.scheduleLeadMs},
          ),
          noImmediateRepeat: ${layer.eventPolicy.noImmediateRepeat},
        ),
        dynamics: SoundLayerDynamics(
          gainVariation: ${dartNumber(layer.dynamics.gainVariation)},
          panVariation: ${dartNumber(layer.dynamics.panVariation)},
          minimumChangeInterval: Duration(
            milliseconds: ${layer.dynamics.minimumChangeIntervalMs},
          ),
          maximumChangeInterval: Duration(
            milliseconds: ${layer.dynamics.maximumChangeIntervalMs},
          ),
          minimumTransition: Duration(
            milliseconds: ${layer.dynamics.minimumTransitionMs},
          ),
          maximumTransition: Duration(
            milliseconds: ${layer.dynamics.maximumTransitionMs},
          ),
        ),
      ),`;
}

function generatedScene(entry) {
  const { manifest, recipe, coverAsset, heroAsset } = entry;
  return `  SoundscapeScene(
    schemaVersion: ${recipe.schemaVersion},
    seed: ${recipe.seed},
    id: ${dartString(manifest.id)},
    name: ${dartString(manifest.name)},
    description: ${dartString(manifest.description)},
    coverAsset: ${dartString(coverAsset)},
    heroAsset: ${dartString(heroAsset)},
    defaultIntensity: ${dartNumber(recipe.macros.intensity)},
    defaultRichness: ${dartNumber(recipe.macros.richness)},
    layers: <SoundLayerDefinition>[
${recipe.layers.map(generatedLayer).join("\n")}
    ],
  ),`;
}

function generatedSceneCatalog(entries) {
  return `// Generated by tools/sync-runtime-assets.mjs. Do not edit.
// dart format off
import '../soundscape_scene.dart';

const generatedSoundscapeScenes = <SoundscapeScene>[
${entries.map(generatedScene).join("\n")}
];
// dart format on
`;
}

function buildGeneratedSceneCatalog({ catalog, mappingBySource }) {
  const playableCatalog = readJson(playableCatalogPath);
  validatePlayableCatalog(playableCatalog);

  const sceneIndex = readJson(sceneIndexPath);
  const assetCatalog = readJson(assetCatalogPath);
  const derivativeCatalog = readJson(derivativeCatalogPath);
  const playableById = uniqueMap(playableCatalog.scenes, "sceneId", "Playable scene catalog");
  const soundAssetById = uniqueMap(catalog.assets, "id", "Sound library");
  const staticAssetById = uniqueMap(assetCatalog.assets, "id", "Static asset catalog");
  const derivativeBySourceId = uniqueMap(
    derivativeCatalog.derivatives,
    "sourceAssetId",
    "Web derivative catalog",
  );

  function runtimeVisualPath(scene, slotName) {
    const sourceAssetId = scene.slots?.[slotName]?.assetId;
    const sourceAsset = required(
      staticAssetById,
      sourceAssetId,
      `${scene.id}/${slotName} source asset`,
    );
    const derivative = required(
      derivativeBySourceId,
      sourceAsset.id,
      `${scene.id}/${slotName} derivative`,
    );
    const target = required(
      mappingBySource,
      derivative.path,
      `${scene.id}/${slotName} Flutter runtime mapping`,
    );
    return `assets/generated/${target}`;
  }

  const entries = [];
  const indexedSceneIds = new Set();
  for (const indexEntry of sceneIndex.scenes) {
    if (indexedSceneIds.has(indexEntry.id))
      fail(`Scene index contains duplicate id: ${indexEntry.id}.`);
    indexedSceneIds.add(indexEntry.id);
    const playable = playableById.get(indexEntry.id);
    if (!playable) continue;

    const manifestPath = resolveRepositoryPath(indexEntry.manifest, `${indexEntry.id} manifest`);
    const scene = readJson(manifestPath);
    if (scene.id !== indexEntry.id) fail(`${indexEntry.manifest} does not match the scene index.`);
    if (playable.recipe.sceneId !== scene.id) {
      fail(`${scene.id} recipe sceneId does not match its manifest.`);
    }

    const previewAsset = required(
      soundAssetById,
      playable.previewAudioAssetId,
      `${scene.id} preview audio asset`,
    );
    if (!previewAsset.segments.some((segment) => segment.id === previewAsset.previewSegmentId)) {
      fail(`${scene.id} preview audio asset is missing segment ${previewAsset.previewSegmentId}.`);
    }

    const layerIds = new Set();
    for (const layer of playable.recipe.layers) {
      if (layerIds.has(layer.id)) fail(`${scene.id} contains duplicate layer id: ${layer.id}.`);
      layerIds.add(layer.id);
      if (layer.eventPolicy.maximumSilenceMs < layer.eventPolicy.minimumSilenceMs) {
        fail(`${scene.id}/${layer.id} has an inverted silence range.`);
      }
      if (
        layer.dynamics.maximumChangeIntervalMs < layer.dynamics.minimumChangeIntervalMs ||
        layer.dynamics.maximumTransitionMs < layer.dynamics.minimumTransitionMs
      ) {
        fail(`${scene.id}/${layer.id} has an inverted dynamics range.`);
      }
      const soundAsset = required(soundAssetById, layer.assetId, `${scene.id}/${layer.id} asset`);
      const segmentIds = new Set(soundAsset.segments.map((segment) => segment.id));
      for (const segmentId of layer.segmentIds) {
        if (!segmentIds.has(segmentId)) {
          fail(`${scene.id}/${layer.id} references unknown segment ${segmentId}.`);
        }
      }
    }

    entries.push({
      manifest: scene,
      recipe: playable.recipe,
      coverAsset: runtimeVisualPath(scene, "cover"),
      heroAsset: runtimeVisualPath(scene, "hero"),
    });
  }

  for (const sceneId of playableById.keys()) {
    if (!indexedSceneIds.has(sceneId))
      fail(`Playable scene is missing from the scene index: ${sceneId}.`);
  }
  if (entries.length === 0 || entries[0].manifest.id !== sceneIndex.defaultScene) {
    fail(`The first playable scene must be the default scene ${sceneIndex.defaultScene}.`);
  }

  return generatedSceneCatalog(entries);
}

function buildRuntimePack() {
  const manifest = readJson(packPath);
  if (manifest.schemaVersion !== 1 || typeof manifest.flutter !== "object") {
    fail("assets/runtime-pack.v1.json uses an unsupported schema.");
  }

  const outputRoot = resolveRepositoryPath(manifest.flutter.outputRoot, "flutter.outputRoot");
  if (outputRoot !== allowedOutputRoot) {
    fail("Flutter runtime assets must stay under apps/client/assets/generated.");
  }

  const mappings = manifest.flutter.files.map((entry, index) => {
    const sourceRelative = normalizedRelativePath(entry.source, `flutter.files[${index}].source`);
    const targetRelative = normalizedRelativePath(entry.target, `flutter.files[${index}].target`);
    const sourcePath = resolveRepositoryPath(sourceRelative, "runtime asset source");
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      fail(`Runtime asset source is missing: ${sourceRelative}`);
    }
    return { sourceRelative, sourcePath, targetRelative };
  });

  const sourcePaths = new Set(mappings.map((entry) => entry.sourceRelative));
  const targetPaths = new Set(mappings.map((entry) => entry.targetRelative));
  if (sourcePaths.size !== mappings.length || targetPaths.size !== mappings.length) {
    fail("Runtime asset mappings contain duplicate source or target paths.");
  }

  const catalogSource = resolveRepositoryPath(
    manifest.flutter.catalogSource,
    "flutter.catalogSource",
  );
  const catalogTarget = normalizedRelativePath(
    manifest.flutter.catalogTarget,
    "flutter.catalogTarget",
  );
  if (targetPaths.has(catalogTarget)) {
    fail(`Catalog target collides with a runtime asset: ${catalogTarget}`);
  }

  const catalog = readJson(catalogSource);
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.assets)) {
    fail("The canonical sound library uses an unsupported schema.");
  }
  const mappingBySource = new Map(
    mappings.map((entry) => [entry.sourceRelative, entry.targetRelative]),
  );
  const runtimeCatalog = structuredClone(catalog);

  for (const asset of runtimeCatalog.assets) {
    const segmentSources = new Set();
    for (const segment of asset.segments ?? []) {
      const sourceRelative = normalizedRelativePath(segment.path, `${asset.id}/${segment.id}.path`);
      const targetRelative = mappingBySource.get(sourceRelative);
      if (!targetRelative) {
        fail(`${asset.id}/${segment.id} is not mapped into the Flutter pack.`);
      }
      segmentSources.add(sourceRelative);
      segment.path = `assets/generated/${targetRelative}`;
    }
    for (const sourceRelative of segmentSources) {
      const actualHash = sha256(resolveRepositoryPath(sourceRelative, "catalog asset"));
      if (actualHash !== asset.sha256) {
        fail(`${asset.id} hash mismatch: catalog=${asset.sha256}, actual=${actualHash}`);
      }
    }
  }

  return {
    outputRoot,
    files: mappings,
    catalogTarget,
    catalogContent: `${JSON.stringify(runtimeCatalog, null, 2)}\n`,
    generatedSceneCatalog: buildGeneratedSceneCatalog({ catalog, mappingBySource }),
  };
}

function filesEqual(first, second) {
  return (
    fs.existsSync(first) &&
    fs.existsSync(second) &&
    fs.statSync(first).size === fs.statSync(second).size &&
    sha256(first) === sha256(second)
  );
}

function checkRuntimePack(pack) {
  const issues = [];
  for (const entry of pack.files) {
    const targetPath = path.join(pack.outputRoot, entry.targetRelative);
    if (!filesEqual(entry.sourcePath, targetPath)) issues.push(entry.targetRelative);
  }
  const catalogPath = path.join(pack.outputRoot, pack.catalogTarget);
  if (!fs.existsSync(catalogPath) || fs.readFileSync(catalogPath, "utf8") !== pack.catalogContent) {
    issues.push(pack.catalogTarget);
  }
  if (
    !fs.existsSync(generatedSceneCatalogPath) ||
    fs.readFileSync(generatedSceneCatalogPath, "utf8") !== pack.generatedSceneCatalog
  ) {
    issues.push(path.relative(repositoryRoot, generatedSceneCatalogPath).replaceAll("\\", "/"));
  }
  if (issues.length > 0) {
    fail(`Flutter runtime pack is missing or stale: ${issues.join(", ")}`);
  }
  console.log(
    `[soundscape] Runtime asset pack and generated scene catalog verified ` +
      `(${pack.files.length} files).`,
  );
}

function writeRuntimePack(pack) {
  fs.rmSync(pack.outputRoot, { recursive: true, force: true });
  fs.mkdirSync(pack.outputRoot, { recursive: true });
  for (const entry of pack.files) {
    const targetPath = path.join(pack.outputRoot, entry.targetRelative);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(entry.sourcePath, targetPath);
  }
  const catalogPath = path.join(pack.outputRoot, pack.catalogTarget);
  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(catalogPath, pack.catalogContent, "utf8");
  fs.mkdirSync(path.dirname(generatedSceneCatalogPath), { recursive: true });
  fs.writeFileSync(generatedSceneCatalogPath, pack.generatedSceneCatalog, "utf8");
  console.log(
    `[soundscape] Runtime asset pack and generated scene catalog synced ` +
      `(${pack.files.length} files).`,
  );
}

export function syncRuntimeAssets({ check = false } = {}) {
  const pack = buildRuntimePack();
  if (check) checkRuntimePack(pack);
  else writeRuntimePack(pack);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    syncRuntimeAssets({ check: process.argv.includes("--check") });
  } catch (error) {
    console.error(`\n[soundscape] ${error.message}`);
    process.exitCode = 1;
  }
}
