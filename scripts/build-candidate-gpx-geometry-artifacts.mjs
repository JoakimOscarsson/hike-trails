import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const candidateRoot = path.join(projectRoot, "data/research/candidate-trails");
const lastUpdated = "2026-04-30";

const defaultTrailIds = ["hogakustenleden", "sjuharadsleden", "tjustleden"];
const requestedTrailIds = process.argv.slice(2);
const trailIds = requestedTrailIds.length > 0 ? requestedTrailIds : defaultTrailIds;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true
});

const trailBuildPolicy = {
  tjustleden: {
    reverseSectionIds: new Set([
      "tjustleden-etapp-4-valstad-kvarn-hjorten-tornsfall",
      "tjustleden-etapp-6-hallingeberg-karrum-odensvi"
    ]),
    notes: "Sections 4 and 6 are reversed to match official written section order before storing candidate GeoJSON."
  },
  sjuharadsleden: {
    densifySectionIds: new Set(["sjuharadsleden-etapp-7-blackered-prangens-camping"]),
    maxSegmentMeters: 100,
    notes: "Section 7 is densified where official GPX sampling leaves simplified chords; section 6 still needs the separate Rölle cleanup decision before runtime import."
  }
};

const results = [];
const failures = [];

for (const trailId of trailIds) {
  const trailRoot = path.join(candidateRoot, trailId);
  const geometryIndexPath = path.join(trailRoot, "normalized-candidate/route-geometry-index.research.json");
  const geometryIndex = await readJson(geometryIndexPath);
  const outputRoot = path.join(trailRoot, "geometry/candidate");
  const sectionOutputRoot = path.join(outputRoot, "sections");
  const sourceOutputRoot = path.join(outputRoot, "source-downloads");
  await mkdir(sectionOutputRoot, { recursive: true });
  await mkdir(sourceOutputRoot, { recursive: true });

  const trailRows = [];
  for (const section of geometryIndex.sections ?? []) {
    const sourceUrl = section.sourceSummary?.gpxUrl ?? section.sourceSummary?.sourceUrl;
    if (!isGpxUrl(sourceUrl)) continue;

    const row = await buildSectionGeometry({
      trailId,
      sectionId: section.sectionId,
      sourceUrl,
      sourceSummary: section.sourceSummary,
      outputRoot,
      sectionOutputRoot,
      sourceOutputRoot
    });
    trailRows.push(row);
    if (row.status !== "candidate-geojson-written") failures.push(row);
  }

  await writeJson(path.join(outputRoot, "geometry-build-report.research.json"), {
    schemaVersion: "candidate-gpx-geometry-build-report/v1",
    trailId,
    lastUpdated,
    status: failures.some((failure) => failure.trailId === trailId) ? "completed-with-failures" : "candidate-geojson-written",
    runtimeImportApproved: false,
    sourceGeometryIndex: `${trailId}/normalized-candidate/route-geometry-index.research.json`,
    outputDirectory: toProjectRelative(outputRoot),
    buildPolicy: summarizeBuildPolicy(trailId),
    sections: trailRows
  });
  await writeFile(
    path.join(outputRoot, "README.md"),
    [
      `# ${trailId} candidate GPX geometry`,
      "",
      "Research-only candidate geometry generated from section GPX source URLs.",
      "",
      "- Raw GPX downloads are stored under `source-downloads/`.",
      "- Converted GeoJSON files are stored under `sections/`.",
      "- These files are not runtime app source data.",
      "- Rebuild with `npm run data:candidate-geometry:gpx -- <trail-id>`.",
      ""
    ].join("\n")
  );

  results.push({
    trailId,
    sectionsWithGpx: trailRows.length,
    geojsonWritten: trailRows.filter((row) => row.status === "candidate-geojson-written").length,
    failures: trailRows.filter((row) => row.status !== "candidate-geojson-written").length
  });
}

console.log(`Built candidate GPX geometry artifacts for ${results.length} trails.`);
for (const result of results) {
  console.log(`- ${result.trailId}: ${result.geojsonWritten}/${result.sectionsWithGpx} sections written`);
}
if (failures.length > 0) {
  console.error("Candidate GPX geometry failures:");
  for (const failure of failures) console.error(`- ${failure.trailId}/${failure.sectionId}: ${failure.error}`);
  process.exitCode = 1;
}

async function buildSectionGeometry({ trailId, sectionId, sourceUrl, sourceSummary, sectionOutputRoot, sourceOutputRoot }) {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "hike-trails candidate data prep (research-only GPX geometry builder)"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const gpxText = await response.text();
    const parsed = parser.parse(gpxText);
    const lines = extractGpxLines(parsed);
    if (lines.length === 0) throw new Error("No GPX track or route coordinates found");

    const policy = trailBuildPolicy[trailId] ?? {};
    const reverseApplied = policy.reverseSectionIds?.has(sectionId) ?? false;
    const densifyApplied = policy.densifySectionIds?.has(sectionId) ?? false;
    const normalizedLines = lines.map((line) => {
      const maybeReversed = reverseApplied ? [...line].reverse() : line;
      return densifyApplied ? densifyLine(maybeReversed, policy.maxSegmentMeters ?? 100) : maybeReversed;
    });
    const pointCount = normalizedLines.reduce((count, line) => count + line.length, 0);
    const geometry =
      normalizedLines.length === 1
        ? { type: "LineString", coordinates: normalizedLines[0] }
        : { type: "MultiLineString", coordinates: normalizedLines };
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            trailId,
            sectionId,
            candidateGeometry: true,
            runtimeImportApproved: false,
            sourceUrl,
            source: sourceSummary?.source ?? null,
            classification: sourceSummary?.classification ?? null,
            sourceComputedDistanceKm: sourceSummary?.computedDistanceKm ?? null,
            lineCount: normalizedLines.length,
            pointCount,
            reverseApplied,
            densifyApplied,
            buildPolicyNotes: summarizeBuildPolicy(trailId)?.notes ?? null,
            lastUpdated
          },
          geometry
        }
      ]
    };

    await writeFile(path.join(sourceOutputRoot, `${sectionId}.gpx`), gpxText);
    await writeJson(path.join(sectionOutputRoot, `${sectionId}.geojson`), geojson);
    return {
      trailId,
      sectionId,
      status: "candidate-geojson-written",
      sourceUrl,
      outputGeojson: toProjectRelative(path.join(sectionOutputRoot, `${sectionId}.geojson`)),
      rawGpx: toProjectRelative(path.join(sourceOutputRoot, `${sectionId}.gpx`)),
      lineCount: normalizedLines.length,
      pointCount,
      reverseApplied,
      densifyApplied
    };
  } catch (error) {
    return {
      trailId,
      sectionId,
      status: "failed",
      sourceUrl,
      error: error.message
    };
  }
}

function extractGpxLines(parsed) {
  const gpx = parsed.gpx ?? parsed;
  const trackLines = asArray(gpx.trk).flatMap((track) =>
    asArray(track.trkseg)
      .map((segment) => pointsToLine(asArray(segment.trkpt)))
      .filter((line) => line.length > 1)
  );
  const routeLines = asArray(gpx.rte)
    .map((route) => pointsToLine(asArray(route.rtept)))
    .filter((line) => line.length > 1);
  return [...trackLines, ...routeLines];
}

function pointsToLine(points) {
  return points
    .map((point) => {
      const lat = Number(point.lat);
      const lon = Number(point.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const ele = Number(point.ele);
      return Number.isFinite(ele) ? [lon, lat, ele] : [lon, lat];
    })
    .filter(Boolean);
}

function densifyLine(line, maxSegmentMeters) {
  const densified = [];
  for (let index = 0; index < line.length - 1; index += 1) {
    const start = line[index];
    const end = line[index + 1];
    densified.push(start);
    const distance = haversineMeters(start, end);
    const inserts = Math.max(0, Math.ceil(distance / maxSegmentMeters) - 1);
    for (let step = 1; step <= inserts; step += 1) {
      const ratio = step / (inserts + 1);
      densified.push(interpolateCoordinate(start, end, ratio));
    }
  }
  densified.push(line[line.length - 1]);
  return densified;
}

function interpolateCoordinate(start, end, ratio) {
  const dimensions = Math.max(start.length, end.length);
  const coordinate = [];
  for (let index = 0; index < dimensions; index += 1) {
    const startValue = start[index] ?? 0;
    const endValue = end[index] ?? startValue;
    coordinate.push(startValue + (endValue - startValue) * ratio);
  }
  return coordinate;
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

function isGpxUrl(value) {
  return typeof value === "string" && /\.gpx(?:$|[?#])/i.test(value);
}

function summarizeBuildPolicy(trailId) {
  const policy = trailBuildPolicy[trailId];
  if (!policy) return null;
  return {
    reverseSectionIds: [...(policy.reverseSectionIds ?? [])],
    densifySectionIds: [...(policy.densifySectionIds ?? [])],
    maxSegmentMeters: policy.maxSegmentMeters ?? null,
    notes: policy.notes
  };
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
