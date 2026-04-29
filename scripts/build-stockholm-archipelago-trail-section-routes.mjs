import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseGpxFeatureCollection } from "./lib/trail-system-builder.mjs";

const REPO_ROOT = process.cwd();
const TRAIL_ID = "stockholm-archipelago-trail";
const ROUTE_SOURCES_PATH = path.join(
  REPO_ROOT,
  "data/source/hiking/stockholm-archipelago-trail/route-sources/index.json"
);
const PUBLIC_SECTION_ROUTE_DIR = path.join(REPO_ROOT, "public/routes/hiking", TRAIL_ID, "sections");
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const refresh = args.has("--refresh");

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function projectPath(relativePath) {
  const resolved = path.resolve(REPO_ROOT, relativePath);
  if (resolved !== REPO_ROOT && !resolved.startsWith(REPO_ROOT + path.sep)) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }
  return resolved;
}

function publicPath(publicUrl) {
  const cleanPath = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  return projectPath(path.join("public", cleanPath));
}

function routeFeatureProperties(entry, fallbackName) {
  return {
    name: fallbackName,
    sectionId: entry.sectionId,
    sourceUrl: entry.sourceUrl
  };
}

function featureCollectionForManualLine(entry) {
  const coordinates = (entry.latLonCoordinates ?? [])
    .map(([lat, lon]) => [lon, lat])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (coordinates.length < 2) {
    throw new Error(`${entry.sectionId} manual route needs at least two coordinates`);
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: routeFeatureProperties(entry, entry.sectionId),
        geometry: {
          type: "LineString",
          coordinates
        }
      }
    ]
  };
}

async function featureCollectionForGpx(entry) {
  const gpxPath = projectPath(entry.localPath);
  const { features } = parseGpxFeatureCollection(await readFile(gpxPath, "utf8"), entry.sectionId);
  if (!features.length) throw new Error(`${entry.sectionId} GPX did not contain route features`);
  return {
    type: "FeatureCollection",
    features: features.map((feature) => ({
      ...feature,
      properties: {
        ...routeFeatureProperties(entry, feature.properties?.name ?? entry.sectionId),
        ...feature.properties
      }
    }))
  };
}

async function featureCollectionForEntry(entry) {
  if (entry.sourceFormat === "manual") return featureCollectionForManualLine(entry);
  if (entry.sourceFormat === "gpx") return featureCollectionForGpx(entry);
  throw new Error(`${entry.sectionId} uses unsupported sourceFormat ${entry.sourceFormat}`);
}

async function downloadGpx(entry) {
  if (entry.sourceFormat !== "gpx") return;
  if (!entry.downloadUrl) throw new Error(`${entry.sectionId} is missing downloadUrl`);
  const response = await fetch(entry.downloadUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "hike-trails-data-import/1.0"
    }
  });
  if (!response.ok) throw new Error(`${entry.sectionId} GPX download failed with HTTP ${response.status}`);
  const text = await response.text();
  if (!text.trimStart().startsWith("<?xml") && !text.includes("<gpx")) {
    throw new Error(`${entry.sectionId} GPX download did not return GPX XML`);
  }
  const localPath = projectPath(entry.localPath);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, text.endsWith("\n") ? text : `${text}\n`);
}

async function extraGeojsonFiles(expectedFiles) {
  const entries = await readdir(PUBLIC_SECTION_ROUTE_DIR).catch(() => []);
  return entries
    .filter((file) => file.endsWith(".geojson"))
    .map((file) => path.join(PUBLIC_SECTION_ROUTE_DIR, file))
    .filter((filePath) => !expectedFiles.has(filePath));
}

async function expectedRouteFiles(routeSources) {
  const files = new Map();
  for (const entry of routeSources.entries) {
    const geojson = await featureCollectionForEntry(entry);
    files.set(publicPath(entry.geojsonPath), jsonText(geojson));
  }
  return files;
}

async function checkRouteFiles(files) {
  const stale = [];
  for (const [filePath, expectedText] of files) {
    const actualText = await readFile(filePath, "utf8").catch(() => null);
    if (actualText !== expectedText) stale.push(path.relative(REPO_ROOT, filePath));
  }
  stale.push(...(await extraGeojsonFiles(files)).map((filePath) => path.relative(REPO_ROOT, filePath)));

  if (stale.length) {
    for (const filePath of stale) console.error(`${filePath} is stale. Run npm run data:sat:section-routes.`);
    process.exitCode = 1;
    return;
  }

  console.log("Stockholm Archipelago Trail section routes are up to date.");
}

async function writeRouteFiles(files) {
  await mkdir(PUBLIC_SECTION_ROUTE_DIR, { recursive: true });
  await Promise.all([...files].map(([filePath, text]) => writeFile(filePath, text)));
  await Promise.all((await extraGeojsonFiles(files)).map((filePath) => rm(filePath, { force: true })));
}

const routeSources = await readJson(ROUTE_SOURCES_PATH);
if (!Array.isArray(routeSources.entries)) throw new Error(`${ROUTE_SOURCES_PATH} is missing entries`);

if (refresh) {
  for (const entry of routeSources.entries) await downloadGpx(entry);
}

const files = await expectedRouteFiles(routeSources);

if (checkOnly) {
  await checkRouteFiles(files);
} else {
  await writeRouteFiles(files);
  console.log(`Wrote ${files.size} Stockholm Archipelago Trail section route GeoJSON files.`);
}
