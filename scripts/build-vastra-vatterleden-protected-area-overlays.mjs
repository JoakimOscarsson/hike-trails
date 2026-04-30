import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const trailId = "vastra-vatterleden";
const trailRoot = path.join(projectRoot, "data/research/candidate-trails", trailId);
const normalizedRoot = path.join(trailRoot, "normalized-candidate");
const overlayRoot = path.join(trailRoot, "geometry/protected-area-overlays");
const sourceDownloadRoot = path.join(overlayRoot, "source-downloads");
const lastUpdated = "2026-04-30";

const sourceDescriptors = [
  {
    areaName: "Tiveden national park",
    recommendation: "Do not apply national-park rules section-wide to stage 1 unless a selected variant or connector intersects.",
    confidence: "medium-high",
    sources: [nvrSource("national-park", "ps-nvr:PS.ProtectedSites.NP", "2001216", "Tiveden")]
  },
  {
    areaName: "Valekleven-Ombo öar reserve and Natura 2000",
    recommendation: "Apply protected-area rules only to overlapping stage-1 variant or connector geometry.",
    confidence: "medium-high",
    sources: [
      nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2000332", "Valekleven-Ombo öar"),
      naturaSource("Valekleven-Ombo öar")
    ]
  },
  {
    areaName: "Granvik nature reserve",
    recommendation: "Apply reserve rules only to overlapping stage-1 variant or connector geometry.",
    confidence: "medium-high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2000571", "Granvik")]
  },
  {
    areaName: "Bölets ängar nature reserve",
    recommendation: "Apply reserve rules only to overlapping stage-1 variant or connector geometry.",
    confidence: "medium-high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2000573", "Bölets ängar")]
  },
  {
    areaName: "Bölskullen nature conservation area",
    recommendation: "Apply protected-area rules only to overlapping stage-1 variant or connector geometry.",
    confidence: "medium-high",
    sources: [nvrSource("nature-conservation-area", "ps-nvr:PS.ProtectedSites.NVO", "2000376", "Bölskullen")]
  },
  {
    areaName: "Håketjärnarna nature reserve",
    recommendation: "Apply reserve rules only to overlapping stage-1 variant or connector geometry.",
    confidence: "medium-high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2014934", "Håketjärnarna")]
  },
  {
    areaName: "Stora Röå nature reserve",
    recommendation: "Use Stora Röå rules for overlapping stage-3, stage-4 and facility context only.",
    confidence: "high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2000600", "Stora Röå")]
  },
  {
    areaName: "Röå alsumpskog reserve and Natura 2000",
    recommendation: "Do not attach Röå alsumpskog rules unless selected route/access geometry proves overlap.",
    confidence: "medium-high",
    sources: [
      nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2000336", "Röå alsumpskog"),
      naturaSource("Röå alsumpskog")
    ]
  },
  {
    areaName: "Hjoåns dalgång reserve and Natura 2000",
    recommendation:
      "Use Hjoåns dalgång rules only for overlapping route/facility context; keep the mapped firepoint suppressed or pending because the standing reserve rule prohibits fire.",
    confidence: "high",
    sources: [
      nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2000411", "Hjoåns dalgång"),
      naturaSource("Hjoåns dalgång")
    ]
  },
  {
    areaName: "Västra Vättern Natura 2000",
    recommendation: "Do not attach water-area rules unless selected shore/water connector geometry intersects the polygon.",
    confidence: "medium-high",
    sources: [naturaSource("Västra Vättern")]
  },
  {
    areaName: "Hökensås nature conservation area",
    recommendation: "Apply Hökensås NVO rules to overlapping stage-6, stage-7 and facility context.",
    confidence: "high",
    sources: [
      nvrSource("nature-conservation-area", "ps-nvr:PS.ProtectedSites.NVO", "2001952", "Hökensås"),
      nvrSource("nature-conservation-area", "ps-nvr:PS.ProtectedSites.NVO", "2002586", "Hökensås")
    ]
  },
  {
    areaName: "Hyltan nature reserve",
    recommendation: "Apply Hyltan rules only to overlapping stage-6 route/facility context.",
    confidence: "high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2000412", "Hyltan")]
  },
  {
    areaName: "Gagnån reserve and Natura 2000",
    recommendation: "Apply Gagnån rules to overlapping stage-8 geometry; do not apply them to stage-7 facilities unless overlap is proven.",
    confidence: "high",
    sources: [
      nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2001372", "Gagnån"),
      naturaSource("Gagnån")
    ]
  },
  {
    areaName: "Ryfors reserve and Natura 2000",
    recommendation: "Keep as nearby/continuation context unless selected route/access geometry proves overlap.",
    confidence: "medium-high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2001381", "Ryfors"), naturaSource("Ryfors")]
  },
  {
    areaName: "Stråkens strandskogar nature reserve",
    recommendation: "Keep as nearby/continuation context unless selected route/access geometry proves overlap.",
    confidence: "medium-high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2065122", "Stråkens strandskogar")]
  },
  {
    areaName: "Västra Fagerhult Natura 2000",
    recommendation: "Keep as nearby/continuation context unless selected route/access geometry proves overlap.",
    confidence: "medium-high",
    sources: [naturaSource("Västra Fagerhult")]
  },
  {
    areaName: "Norra Fågelås nature reserve",
    recommendation: "Keep as nearby context unless selected route/access geometry proves overlap.",
    confidence: "medium-high",
    sources: [nvrSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2046449", "Norra Fågelås")]
  }
];

await mkdir(sourceDownloadRoot, { recursive: true });

const facilities = await readJson(path.join(normalizedRoot, "facilities.research.json"));
const geometryIndex = await readJson(path.join(normalizedRoot, "route-geometry-index.research.json"));

const records = [];
for (const descriptor of sourceDescriptors) {
  const sourceDownloads = [];
  const sourceUrls = [];
  const polygons = [];
  for (const source of descriptor.sources) {
    const sourceGeojson = await fetchSourceGeojson(descriptor, source);
    const sourcePolygons = extractPolygons(sourceGeojson);
    if (sourcePolygons.length === 0) throw new Error(`No polygon geometry found for ${descriptor.areaName}: ${source.sourceName}`);
    polygons.push(...sourcePolygons);
    sourceDownloads.push(toProjectRelative(source.outputPath));
    sourceUrls.push(source.sourceUrl);
  }

  const facilityOverlaps = findFacilityOverlaps(polygons, facilities.records ?? []);
  const routeOverlaps = await findRouteOverlaps(polygons, geometryIndex.sections ?? []);
  records.push({
    overlayId: `${trailId}-${slugify(descriptor.areaName)}`,
    protectedArea: descriptor.areaName,
    status: routeOverlaps.length > 0 || facilityOverlaps.length > 0 ? "overlap-detected" : "no-candidate-overlap",
    sourceUrls,
    sourceDownloads,
    recommendation: descriptor.recommendation,
    confidence: descriptor.confidence,
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
  sourceArtifact: `${trailId}/import-readiness-resolution.research.json`,
  method:
    "Fetched official Naturvårdsverket NVR/Natura 2000 WFS polygons named by the Västra Vätterleden readiness packet and checked all normalized candidate facility points plus all candidate route GeoJSON segments.",
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
    "# vastra-vatterleden protected-area overlays",
    "",
    "Research-only protected-area clipping artifact for Västra Vätterleden candidate normalization.",
    "",
    "- Raw Naturvårdsverket WFS protected-area GeoJSON downloads are stored under `source-downloads/`.",
    "- The generated normalized overlay artifact is `normalized-candidate/protected-area-overlays.research.json`.",
    "- This is not runtime app source data.",
    "- Rebuild with `npm run data:candidate-overlays:vastra-vatterleden`.",
    ""
  ].join("\n")
);

console.log(`Built protected-area overlays for ${trailId}.`);
for (const record of records) {
  console.log(`- ${record.protectedArea}: ${record.routeOverlaps.length} route overlaps, ${record.facilityOverlaps.length} facility overlaps`);
}

function nvrSource(sourceType, typeName, nvrid, sourceName) {
  const sourceUrl = buildWfsUrl(typeName, `nvrid='${nvrid}'`);
  return { sourceType, typeName, nvrid, sourceName, sourceUrl };
}

function naturaSource(sourceName) {
  const sourceUrl = buildWfsUrl("ps-n2k:PS.ProtectedSites.Natura2000", `omradesnamn='${sourceName}'`);
  return { sourceType: "natura-2000", typeName: "ps-n2k:PS.ProtectedSites.Natura2000", sourceName, sourceUrl };
}

function buildWfsUrl(typeName, cqlFilter) {
  const url = new URL("https://geodata.naturvardsverket.se/geoserver/wfs");
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", typeName);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("CQL_FILTER", cqlFilter);
  return url.toString();
}

async function fetchSourceGeojson(descriptor, source) {
  const response = await fetch(source.sourceUrl, {
    headers: {
      "user-agent": "hike-trails candidate data prep (research-only protected-area overlay builder)"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}: ${source.sourceUrl}`);
  const geojson = await response.json();
  if ((geojson.features ?? []).length === 0) throw new Error(`No WFS features for ${descriptor.areaName}: ${source.sourceName}`);
  const outputPath = path.join(
    sourceDownloadRoot,
    `${slugify(descriptor.areaName)}-${slugify(source.sourceType)}-${source.nvrid ?? slugify(source.sourceName)}.geojson`
  );
  source.outputPath = outputPath;
  await writeJson(outputPath, geojson);
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
