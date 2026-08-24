#!/usr/bin/env node

/**
 * Research helper for discovering Freesound CC0 recordings without using the
 * source files from another project. It only writes the candidate report when
 * --out is provided; downloading and catalog registration remain explicit.
 */

import fs from "node:fs/promises";

const terms = process.argv.slice(2).filter((value) => !value.startsWith("--"));
const output = process.argv.find((value) => value.startsWith("--out="))?.slice(6);
const searchTerms =
  terms.length > 0
    ? terms
    : [
        "rain",
        "thunder",
        "wind",
        "river",
        "waves",
        "waterfall",
        "fire",
        "birds",
        "crickets",
        "frog",
        "owl",
        "cafe",
        "library",
        "train",
        "airplane",
        "traffic",
        "footsteps",
        "paper",
        "clock",
        "radio",
        "projector",
        "bubbles",
        "chimes",
      ];

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

function matches(html, pattern) {
  return decode(html.match(pattern)?.[1] ?? "");
}

async function getText(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function search(term) {
  const query = encodeURIComponent(term);
  const url = `https://freesound.org/search/?q=${query}&f=license:%22Creative+Commons+0%22`;
  const html = await getText(url);
  return [...html.matchAll(/href="(\/people\/[^"/]+\/sounds\/\d+\/)"/g)]
    .map((match) => `https://freesound.org${match[1]}`)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function parseCandidate(html, url, term) {
  const mp3 = matches(html, /data-mp3="([^"]+)"/);
  const duration = Number(matches(html, /data-duration="([^"]+)"/));
  const title = matches(html, /data-title="([^"]+)"/);
  const author = matches(html, /<meta property="og:audio:artist" content="([^"]+)"/);
  const description = matches(html, /<meta name="twitter:description" content="([\s\S]*?)"\s*\/>/);
  const license = html.includes("Creative Commons 0") ? "CC0-1.0" : null;
  if (!mp3 || !title || !author || !license || !Number.isFinite(duration)) return null;
  return {
    term,
    id: Number(url.match(/sounds\/(\d+)/)?.[1]),
    url,
    title,
    author,
    durationSeconds: Math.round(duration * 1000) / 1000,
    previewUrl: mp3.replace("-lq.mp3", "-hq.mp3"),
    description: description.replaceAll("\n", " ").replaceAll(/\s+/g, " ").trim(),
    license,
  };
}

const links = new Map();
for (const term of searchTerms) {
  try {
    for (const link of await search(term)) links.set(link, term);
  } catch (error) {
    console.error(`[freesound] search failed for ${term}: ${error.message}`);
  }
  await sleep(250);
}

const candidates = [];
for (const [url, term] of links) {
  try {
    const html = await getText(url);
    const candidate = parseCandidate(html, url, term);
    if (candidate && candidate.durationSeconds >= 8 && candidate.durationSeconds <= 900) {
      candidates.push(candidate);
    }
  } catch (error) {
    console.error(`[freesound] page failed for ${url}: ${error.message}`);
  }
  await sleep(150);
}

candidates.sort((a, b) => a.term.localeCompare(b.term) || b.durationSeconds - a.durationSeconds);
const report = `${JSON.stringify(candidates, null, 2)}\n`;
if (output) await fs.writeFile(output, report, "utf8");
else process.stdout.write(report);
console.error(
  `[freesound] found ${candidates.length} CC0 candidates from ${searchTerms.length} terms.`,
);
