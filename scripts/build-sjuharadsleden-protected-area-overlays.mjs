import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const trailId = "sjuharadsleden";
const trailRoot = path.join(projectRoot, "data/research/candidate-trails", trailId);
const normalizedRoot = path.join(trailRoot, "normalized-candidate");
const overlayRoot = path.join(trailRoot, "geometry/protected-area-overlays");
const sourceDownloadRoot = path.join(overlayRoot, "source-downloads");
const lastUpdated = "2026-04-30";

await mkdir(sourceDownloadRoot, { recursive: true });

const caveatResolution = await readJson(path.join(trailRoot, "caveat-resolution.research.json"));
const facilities = await readJson(path.join(normalizedRoot, "facilities.research.json"));
const geometryIndex = await readJson(path.join(normalizedRoot, "route-geometry-index.research.json"));

const records = [];
for (const check of caveatResolution.protectedAreaClipChecks ?? []) {
  const sourceGeojson = await fetchSourceGeojson(check);
  const polygons = extractPolygons(sourceGeojson);
  if (polygons.length === 0) throw new Error(`No polygon geometry found for ${check.areaName}`);

  const facilityOverlaps = findFacilityOverlaps(polygons, facilities.records ?? []);
  const routeOverlaps = await findRouteOverlaps(polygons, geometryIndex.sections ?? []);

  records.push({
    overlayId: `${trailId}-${slugify(check.areaName)}`,
    protectedArea: check.areaName,
    nvrid: check.nvrid ?? null,
    status: routeOverlaps.length > 0 || facilityOverlaps.length > 0 ? "overlap-detected" : "no-candidate-overlap",
    sourceUrls: [check.sourceUrl, check.officialRulesSourceUrl].filter(Boolean),
    sourceDownloads: [
      toProjectRelative(path.join(sourceDownloadRoot, `${slugify(check.areaName)}-${check.nvrid ?? "source"}.geojson`))
    ],
    sourceCheckResult: check.result ?? null,
    recommendation: check.importImpact ?? null,
    confidence: check.confidence ?? null,
    caveat: check.caveat ?? null,
    routeOverlaps,
    facilityOverlaps
  });
}

const output = {
  schemaVersion: "candidate-protected-area-overlays/v1",
  trailId,
  lastUpdated,
  status: "candidate-gis-overlay-computed-research-only",
  runtimeImportApproved: false,
  sourceArtifact: `${trailId}/caveat-resolution.research.json`,
  method:
    "Fetched the protected-area WFS polygons listed by the caveat-resolution packet and checked all normalized candidate facility points plus all candidate route GeoJSON segments.",
  summary: {
    protectedAreas: records.length,
    protectedAreasWithRouteOverlap: records.filter((record) => record.routeOverlaps.length > 0).length,
    protectedAreasWithFacilityOverlap: records.filter((record) => record.facilityOverlaps.length > 0).length,
    routeOverlapRecords: records.reduce((count, record) => count + record.routeOverlaps.length, 0),
    facilityOverlapRecords: records.reduce((count, record) => count + record.facilityOverlaps.length, 0)
  },
  records
};

await writeJson(path.join(normalizedRoot, "protected-area-overlays.research.json"), output);
await writeFile(
  path.join(overlayRoot, "README.md"),
  [
    "# sjuharadsleden protected-area overlays",
    "",
    "Research-only protected-area clipping artifact for Sjuhäradsleden candidate normalization.",
    "",
    "- Raw NVR WFS protected-area GeoJSON downloads are stored under `source-downloads/`.",
    "- The generated normalized overlay artifact is `normalized-candidate/protected-area-overlays.research.json`.",
    "- This is not runtime app source data.",
    "- Rebuild with `npm run data:candidate-overlays:sjuharadsleden`.",
    ""
  ].join("\n")
);

console.log(`Built protected-area overlays for ${trailId}.`);
for (const record of records) {
  console.log(`- ${record.protectedArea}: ${record.routeOverlaps.length} route overlaps, ${record.facilityOverlaps.length} facility overlaps`);
}

async function fetchSourceGeojson(check) {
  const response = await fetch(check.sourceUrl, {
    headers: {
      "user-agent": "hike-trails candidate data prep (research-only protected-area overlay builder)"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}: ${check.sourceUrl}`);
  const geojson = await response.json();
  await writeJson(path.join(sourceDownloadRoot, `${slugify(check.areaName)}-${check.nvrid ?? "source"}.geojson`), geojson);
  return geojson;
}

function findFacilityOverlaps(polygons, recordsToCheck) {
  return recordsToCheck
    .map((facility) => {
      const coordinate = normalizeFacilityCoordinate(facility.coordinatesLatLon);
      if (!coordinate || !isPointInPolygons(coordinate, polygons)) return null;
      return {
        facilityId: facility.facilityId,
        sectionId: facility.sectionId,
        name: facility.name,
        candidateType: facility.candidateType ?? null,
        state: facility.state ?? null,
        importAction: facility.importAction ?? null,
        coordinatesLatLon: facility.coordinatesLatLon
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.sectionId.localeCompare(right.sectionId, "en", { numeric: true }) || left.name.localeCompare(right.name));
}

async function findRouteOverlaps(polygons, sections) {
  const overlaps = [];
  for (const section of sections) {
    const sectionRanges = [];
    for (const candidateGeojsonFile of section.candidateGeojsonFiles ?? []) {
      const geojson = await readJson(path.join(projectRoot, candidateGeojsonFile));
      const lines = extractGeojsonLines(geojson);
      for (const [lineIndex, line] of lines.entries()) {
        const rangesKm = linePolygonOverlapRanges(line, polygons);
        if (rangesKm.length > 0) {
          sectionRanges.push({
            sourceGeojson: candidateGeojsonFile,
            lineIndex,
            rangesKm
          });
        }
      }
    }
    if (sectionRanges.length > 0) {
      overlaps.push({
        sectionId: section.sectionId,
        status: "route-segment-overlap",
        overlaps: sectionRanges
      });
    }
  }
  return overlaps;
}

function linePolygonOverlapRanges(line, polygons) {
  const ranges = [];
  let cumulativeMeters = 0;
  for (let index = 0; index < line.length - 1; index += 1) {
    const start = line[index];
    const end = line[index + 1];
    const segmentMeters = haversineMeters(start, end);
    if (isSegmentInPolygons(start, end, polygons)) {
      ranges.push({
        startKm: round(cumulativeMeters / 1000, 3),
        endKm: round((cumulativeMeters + segmentMeters) / 1000, 3)
      });
    }
    cumulativeMeters += segmentMeters;
  }
  return mergeRanges(ranges);
}

function isSegmentInPolygons(start, end, polygons) {
  if (isPointInPolygons(start, polygons) || isPointInPolygons(end, polygons)) return true;
  return polygons.some((polygon) => polygon.some((ring) => segmentIntersectsRing(start, end, ring)));
}

function isPointInPolygons(point, polygons) {
  return polygons.some((polygon) => {
    const [outer, ...holes] = polygon;
    return pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole));
  });
}

function segmentIntersectsRing(leftStart, leftEnd, ring) {
  for (let index = 0; index < ring.length - 1; index += 1) {
    if (segmentsIntersect(leftStart, leftEnd, ring[index], ring[index + 1])) return true;
  }
  return false;
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function pointInRing(point, ring) {
  let inside = false;
  for (let left = 0, right = ring.length - 1; left < ring.length; right = left++) {
    const leftPoint = ring[left];
    const rightPoint = ring[right];
    const intersects =
      leftPoint[1] > point[1] !== rightPoint[1] > point[1] &&
      point[0] < ((rightPoint[0] - leftPoint[0]) * (point[1] - leftPoint[1])) / (rightPoint[1] - leftPoint[1]) + leftPoint[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function mergeRanges(ranges) {
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.startKm <= previous.endKm + 0.05) {
      previous.endKm = Math.max(previous.endKm, range.endKm);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function extractPolygons(geojson) {
  return (geojson.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type === "Polygon") return [normalizePolygon(feature.geometry.coordinates)];
    if (feature.geometry?.type === "MultiPolygon") return feature.geometry.coordinates.map(normalizePolygon);
    return [];
  });
}

function normalizePolygon(polygon) {
  return polygon.map((ring) => ring.map((position) => [Number(position[0]), Number(position[1])]));
}

function extractGeojsonLines(geojson) {
  const features = geojson.type === "FeatureCollection" ? geojson.features ?? [] : geojson.type === "Feature" ? [geojson] : [];
  return features.flatMap((feature) => {
    const geometry = feature.geometry;
    if (geometry?.type === "LineString") return [geometry.coordinates.map(normalizeLineCoordinate).filter(Boolean)];
    if (geometry?.type === "MultiLineString") {
      return geometry.coordinates.map((line) => line.map(normalizeLineCoordinate).filter(Boolean));
    }
    return [];
  });
}

function normalizeLineCoordinate(position) {
  const lon = Number(position?.[0]);
  const lat = Number(position?.[1]);
  return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
}

function normalizeFacilityCoordinate(coordinatesLatLon) {
  if (!Array.isArray(coordinatesLatLon)) return null;
  const lat = Number(coordinatesLatLon[0]);
  const lon = Number(coordinatesLatLon[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null;
}

function haversineMeters(left, right) {
  const earthRadiusMeters = 6371008.8;
  const leftLat = toRadians(left[1]);
  const rightLat = toRadians(right[1]);
  const deltaLat = toRadians(right[1] - left[1]);
  const deltaLon = toRadians(right[0] - left[0]);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function round(value, decimals) {
  return Number(value.toFixed(decimals));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
