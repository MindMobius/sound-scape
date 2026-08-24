#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = path.join(repositoryRoot, "tools", "freesound-expansion.v1.json");
const catalogPath = path.join(repositoryRoot, "assets", "audio", "sound-library.v1.json");
const runtimePackPath = path.join(repositoryRoot, "assets", "runtime-pack.v1.json");
const ledgerPath = path.join(repositoryRoot, "assets", "audio", "THIRD_PARTY.md");
const headers = { "user-agent": "sound-scape-research/1.0" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decode(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function match(html, pattern) {
  return decode(html.match(pattern)?.[1] ?? "");
}

async function request(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

async function inspect(sourceId) {
  const response = await request(`https://freesound.org/s/${sourceId}/`);
  const html = await response.text();
  const canonical =
    match(html, /<link rel="canonical" href="([^"]+)"/) ||
    match(html, /<meta property="og:url" content="([^"]+)"/);
  const preview = match(html, /data-mp3="([^"]+)"/).replace("-lq.mp3", "-hq.mp3");
  const title = match(html, /data-title="([^"]+)"/);
  const author = match(html, /<meta property="og:audio:artist" content="([^"]+)"/);
  const durationSeconds = Number(match(html, /data-duration="([^"]+)"/));
  if (!canonical || !preview || !title || !author || !Number.isFinite(durationSeconds)) {
    throw new Error(`无法解析 ${sourceId} 的 Freesound 页面元数据`);
  }
  if (!html.includes("Creative Commons 0")) {
    throw new Error(`${sourceId} 页面没有明确标注 Creative Commons 0`);
  }
  const authorUrl = `${new URL(canonical).origin}/people/${canonical.match(/\/people\/([^/]+)\//)?.[1]}/`;
  return {
    canonical,
    preview,
    title,
    author,
    authorUrl,
    durationSeconds,
  };
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function assetId(fileName) {
  return `freesound.${fileName.replace(/^freesound-/, "").replace(/\.mp3$/, "")}.v1`;
}

function renderLedgerRows(entries) {
  return entries
    .map(
      ({ seed, source }) =>
        `| \`${seed.fileName}\` | ${seed.category} | ${source.author} | [${seed.sourceId}](${source.canonical}) | [HQ preview](${source.preview}) | CC0-1.0 |`,
    )
    .join("\n");
}

const seeds = JSON.parse(await fs.readFile(seedPath, "utf8"));
const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const runtimePack = JSON.parse(await fs.readFile(runtimePackPath, "utf8"));
const existingIds = new Set(catalog.assets.map((asset) => asset.id));
const existingPaths = new Set(
  catalog.assets.flatMap((asset) => asset.segments.map((segment) => segment.path)),
);
const imported = [];

async function importOne(seed) {
  const id = assetId(seed.fileName);
  if (existingIds.has(id)) return null;
  const source = await inspect(seed.sourceId);
  const response = await request(source.preview);
  const buffer = Buffer.from(await response.arrayBuffer());
  const assetPath = `assets/audio/${seed.fileName}`;
  if (existingPaths.has(assetPath)) throw new Error(`重复素材路径：${assetPath}`);
  await fs.writeFile(path.join(repositoryRoot, assetPath), buffer);
  const durationMs = Math.round(source.durationSeconds * 1000);
  const segmentId = seed.purpose === "event" ? "event-main" : "loop-main";
  const entry = {
    id,
    metadataVersion: 1,
    fileVersion: 1,
    category: seed.category,
    name: seed.name,
    tags: seed.tags,
    availability: "bundled",
    releaseStatus: "approved",
    sha256: sha256(buffer),
    previewSegmentId: segmentId,
    source: {
      name: "Freesound CC0 公开 HQ 预览",
      url: source.canonical,
      downloadUrl: source.preview,
      provenance: "verified",
      authors: [{ name: source.author, url: source.authorUrl }],
      license: {
        name: "Creative Commons Zero v1.0 Universal",
        spdxId: "CC0-1.0",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
        redistributionAllowed: true,
      },
    },
    segments: [
      {
        id: segmentId,
        path: assetPath,
        purpose: seed.purpose,
        startMs: 0,
        ...(seed.purpose === "event" ? { durationMs } : {}),
      },
    ],
  };
  console.log(`[soundscape] imported ${seed.fileName} (${Math.round(buffer.length / 1024)} KiB)`);
  return { seed, source, entry, assetPath };
}

const pending = seeds.filter((seed) => !existingIds.has(assetId(seed.fileName)));
let cursor = 0;
async function worker() {
  while (cursor < pending.length) {
    const seed = pending[cursor++];
    const result = await importOne(seed);
    if (result) imported.push(result);
    await sleep(150);
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));
imported.sort((a, b) => seeds.indexOf(a.seed) - seeds.indexOf(b.seed));
for (const { entry, assetPath, seed } of imported) {
  catalog.assets.push(entry);
  runtimePack.flutter.files.push({ source: assetPath, target: `audio/${seed.fileName}` });
  existingIds.add(entry.id);
  existingPaths.add(assetPath);
}

if (imported.length === 0) {
  console.log("[soundscape] expansion already imported");
  process.exit(0);
}

catalog.catalogVersion = "2026.08.24-release.3";
catalog.updatedAt = "2026-08-24T12:00:00+08:00";
await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
await fs.writeFile(runtimePackPath, `${JSON.stringify(runtimePack, null, 2)}\n`, "utf8");

const ledger = await fs.readFile(ledgerPath, "utf8");
const marker = "## 独立扩容素材（Freesound CC0）";
const section = `\n\n${marker}\n\n本批素材逐条打开 Freesound 原始页面核验 CC0，再下载公开 HQ 预览；没有复制 Moodist 或其他项目仓库中的音频文件。\n\n| 声景文件 | 类别 | 作者 | 原始页面 | 获取地址 | 授权 |\n| --- | --- | --- | --- | --- | --- |\n${renderLedgerRows(imported)}\n`;
if (!ledger.includes(marker))
  await fs.writeFile(ledgerPath, `${ledger.trimEnd()}${section}\n`, "utf8");

console.log(
  `[soundscape] imported ${imported.length} new CC0 assets; total ${catalog.assets.length}.`,
);
