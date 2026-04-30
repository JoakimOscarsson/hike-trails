import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function nvrWfsSource(sourceType, typeName, nvrid, sourceName) {
  return {
    sourceType,
    sourceName,
    sourceId: nvrid,
    sourceUrl: buildWfsUrl("https://geodata.naturvardsverket.se/geoserver/wfs", typeName, `nvrid='${nvrid}'`)
  };
}

export function naturaWfsSource(sourceName) {
  return {
    sourceType: "natura-2000",
    sourceName,
    sourceId: sourceName,
    sourceUrl: buildWfsUrl(
      "https://geodata.naturvardsverket.se/geoserver/wfs",
      "ps-n2k:PS.ProtectedSites.Natura2000",
      `omradesnamn='${sourceName}'`
    )
  };
}

export function drinkingWaterWfsSource(nvrid, sourceName) {
  return {
    sourceType: "water-protection-area",
    sourceName,
    sourceId: nvrid,
    sourceUrl: buildWfsUrl(
      "https://geodata.naturvardsverket.se/geoserver/ows",
      "am-restriction:AM.drinkingWaterProtectionArea",
      `nvrid='${nvrid}'`,
      "json"
    )
  };
}

export function arcgisGeojsonSource(sourceType, sourceName, sourceId, sourceUrl) {
  return { sourceType, sourceName, sourceId, sourceUrl };
}

export async function buildCandidateProtectedAreaOverlays({
  projectRoot,
  trailId,
  lastUpdated,
  sourceArtifact,
  method,
  sourceDescriptors,
  routeGeojsonFileFilter = null
}) {
  const trailRoot = path.join(projectRoot, "data/research/candidate-trails", trailId);
  const normalizedRoot = path.join(trailRoot, "normalized-candidate");
  const overlayRoot = path.join(trailRoot, "geometry/protected-area-overlays");
  const sourceDownloadRoot = path.join(overlayRoot, "source-downloads");

  await mkdir(sourceDownloadRoot, { recursive: true });

  const facilities = await readJson(path.join(normalizedRoot, "facilities.research.json"));
  const geometryIndex = await readJson(path.join(normalizedRoot, "route-geometry-index.research.json"));
  const routeLineIndex = await loadRouteLineIndex(projectRoot, geometryIndex.sections ?? [], routeGeojsonFileFilter);

  const records = [];
  for (const descriptor of sourceDescriptors) {
    const sourceDownloads = [];
    const sourceUrls = [];
    const polygons = [];
    for (const source of descriptor.sources) {
      const sourceGeojson = await fetchSourceGeojson(sourceDownloadRoot, descriptor, source);
      const sourcePolygons = extractPolygons(sourceGeojson);
      if (sourcePolygons.length === 0) throw new Error(`No polygon geometry found for ${descriptor.areaName}: ${source.sourceName}`);
      polygons.push(...sourcePolygons);
      sourceDownloads.push(toProjectRelative(projectRoot, source.outputPath));
      sourceUrls.push(source.sourceUrl);
    }

    const facilityOverlaps = findFacilityOverlaps(polygons, facilities.records ?? []);
    const routeOverlaps = findRouteOverlaps(polygons, routeLineIndex);
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
    sourceArtifact,
    method,
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
      `# ${trailId} protected-area overlays`,
      "",
      `Research-only protected-area clipping artifact for ${trailId} candidate normalization.`,
      "",
      "- Raw source GeoJSON downloads are stored under `source-downloads/`.",
      "- The generated normalized overlay artifact is `normalized-candidate/protected-area-overlays.research.json`.",
      "- This is not runtime app source data.",
      `- Rebuild with \`npm run data:candidate-overlays:${trailId}\`.`,
      ""
    ].join("\n")
  );

  return output;
}

export async function buildCandidateLayerOverlays({
  projectRoot,
  trailId,
  lastUpdated,
  sourceArtifact,
  method,
  layerSources,
  routeGeojsonFileFilter = null,
  recordFilter = null
}) {
  const trailRoot = path.join(projectRoot, "data/research/candidate-trails", trailId);
  const normalizedRoot = path.join(trailRoot, "normalized-candidate");
  const overlayRoot = path.join(trailRoot, "geometry/protected-area-overlays");
  const sourceDownloadRoot = path.join(overlayRoot, "source-downloads");

  await mkdir(sourceDownloadRoot, { recursive: true });

  const facilities = await readJson(path.join(normalizedRoot, "facilities.research.json"));
  const geometryIndex = await readJson(path.join(normalizedRoot, "route-geometry-index.research.json"));
  const routeLineIndex = await loadRouteLineIndex(projectRoot, geometryIndex.sections ?? [], routeGeojsonFileFilter);

  const records = [];
  for (const layer of layerSources) {
    const sourceGeojson = await fetchLayerGeojson(sourceDownloadRoot, layer);
    const sourceDownload = toProjectRelative(projectRoot, layer.outputPath);
    for (const [featureIndex, feature] of (sourceGeojson.features ?? []).entries()) {
      const polygons = extractPolygons({ type: "FeatureCollection", features: [feature] });
      if (polygons.length === 0) continue;
      const facilityOverlaps = findFacilityOverlaps(polygons, facilities.records ?? []);
      const routeOverlaps = findRouteOverlaps(polygons, routeLineIndex);
      const properties = feature.properties ?? {};
      const protectedArea = String(
        firstPresentProperty(properties, [...(layer.nameProperties ?? [layer.nameProperty]), "namn", "omradesnamn"]) ?? `feature ${featureIndex + 1}`
      );
      const sourceId = properties[layer.idProperty] ?? properties.nvrid ?? properties.objectid ?? properties.OBJECTID ?? feature.id ?? null;
      const sourceType = layer.sourceTypeProperty ? properties[layer.sourceTypeProperty] : null;
      const sourceProperties = selectSourceProperties(properties, layer.keepProperties);
      const record = {
        overlayId: `${trailId}-${slugify(layer.layerId)}-${slugify(protectedArea)}-${slugify(sourceId ?? featureIndex + 1)}`,
        protectedArea,
        status: routeOverlaps.length > 0 || facilityOverlaps.length > 0 ? "overlap-detected" : "no-candidate-overlap",
        sourceLayer: layer.layerId,
        sourceType: sourceType ?? layer.sourceType,
        sourceId,
        sourceUrls: [layer.sourceUrl],
        sourceDownloads: [sourceDownload],
        recommendation: layer.recommendation,
        confidence: layer.confidence,
        ...(Object.keys(sourceProperties).length > 0 ? { sourceProperties } : {}),
        routeOverlaps,
        facilityOverlaps
      };
      if (!recordFilter || recordFilter(record, feature, layer)) records.push(record);
    }
  }

  records.sort(
    (left, right) =>
      Number(right.status === "overlap-detected") - Number(left.status === "overlap-detected") ||
      left.sourceLayer.localeCompare(right.sourceLayer, "en", { numeric: true }) ||
      left.protectedArea.localeCompare(right.protectedArea, "sv", { numeric: true })
  );

  const output = {
    schemaVersion: "candidate-protected-area-overlays/v1",
    trailId,
    lastUpdated,
    status: "candidate-gis-overlay-computed-research-only",
    runtimeImportApproved: false,
    sourceArtifact,
    method,
    summary: {
      protectedAreas: records.length,
      protectedAreasWithRouteOverlap: records.filter((record) => record.routeOverlaps.length > 0).length,
      protectedAreasWithFacilityOverlap: records.filter((record) => record.facilityOverlaps.length > 0).length,
      routeOverlapRecords: records.reduce((count, record) => count + record.routeOverlaps.length, 0),
      facilityOverlapRecords: records.reduce((count, record) => count + record.facilityOverlaps.length, 0),
      sourceLayers: layerSources.length
    },
    records
  };

  await writeJson(path.join(normalizedRoot, "protected-area-overlays.research.json"), output);
  await writeFile(
    path.join(overlayRoot, "README.md"),
    [
      `# ${trailId} protected-area overlays`,
      "",
      `Research-only protected-area clipping artifact for ${trailId} candidate normalization.`,
      "",
      "- Raw source GeoJSON downloads are stored under `source-downloads/`.",
      "- The generated normalized overlay artifact is `normalized-candidate/protected-area-overlays.research.json`.",
      "- This is not runtime app source data.",
      `- Rebuild with \`npm run data:candidate-overlays:${trailId}\`.`,
      ""
    ].join("\n")
  );

  return output;
}

function buildWfsUrl(baseUrl, typeName, cqlFilter, outputFormat = "application/json") {
  const url = new URL(baseUrl);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", typeName);
  url.searchParams.set("outputFormat", outputFormat);
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("CQL_FILTER", cqlFilter);
  return url.toString();
}

async function fetchSourceGeojson(sourceDownloadRoot, descriptor, source) {
  const text = await fetchTextWithRetry(source.sourceUrl, descriptor.areaName);
  if (!text.trim().startsWith("{")) throw new Error(`Non-JSON source response for ${descriptor.areaName}: ${source.sourceUrl}`);
  const geojson = JSON.parse(text);
  if ((geojson.features ?? []).length === 0) throw new Error(`No source features for ${descriptor.areaName}: ${source.sourceName}`);
  const outputPath = path.join(
    sourceDownloadRoot,
    `${slugify(descriptor.areaName)}-${slugify(source.sourceType)}-${slugify(source.sourceId ?? source.sourceName)}.geojson`
  );
  source.outputPath = outputPath;
  await writeJson(outputPath, geojson);
  return geojson;
}

async function fetchLayerGeojson(sourceDownloadRoot, layer) {
  const text = await fetchTextWithRetry(layer.sourceUrl, layer.layerId);
  if (!text.trim().startsWith("{")) throw new Error(`Non-JSON source response for ${layer.layerId}: ${layer.sourceUrl}`);
  const geojson = JSON.parse(text);
  const outputPath = path.join(sourceDownloadRoot, `${slugify(layer.layerId)}.geojson`);
  layer.outputPath = outputPath;
  await writeFile(outputPath, `${JSON.stringify(geojson)}\n`);
  return geojson;
}

async function fetchTextWithRetry(sourceUrl, label) {
  const maxAttempts = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          "user-agent": "hike-trails candidate data prep (research-only protected-area overlay builder)"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await delay(500 * attempt);
    }
  }
  throw new Error(`Failed to fetch ${label} after ${maxAttempts} attempts: ${lastError?.message ?? "unknown error"}`, { cause: lastError });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function selectSourceProperties(properties, keepProperties = []) {
  return Object.fromEntries(
    keepProperties
      .filter((key) => properties[key] !== undefined && properties[key] !== null && properties[key] !== "")
      .map((key) => [key, properties[key]])
  );
}

function firstPresentProperty(properties, keys) {
  for (const key of keys.filter(Boolean)) {
    const value = properties[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
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

async function loadRouteLineIndex(projectRoot, sections, routeGeojsonFileFilter) {
  const routeLineIndex = [];
  for (const section of sections) {
    const files = [];
    for (const candidateGeojsonFile of section.candidateGeojsonFiles ?? []) {
      if (routeGeojsonFileFilter && !routeGeojsonFileFilter(candidateGeojsonFile, section)) continue;
      const geojson = await readJson(path.join(projectRoot, candidateGeojsonFile));
      files.push({
        sourceGeojson: candidateGeojsonFile,
        lines: extractGeojsonLines(geojson)
      });
    }
    routeLineIndex.push({
      sectionId: section.sectionId,
      files
    });
  }
  return routeLineIndex;
}

function findRouteOverlaps(polygons, routeLineIndex) {
  const overlaps = [];
  for (const section of routeLineIndex) {
    const sectionRanges = [];
    for (const file of section.files) {
      for (const [lineIndex, line] of file.lines.entries()) {
        const rangesKm = linePolygonOverlapRanges(line, polygons);
        if (rangesKm.length > 0) {
          sectionRanges.push({
            sourceGeojson: file.sourceGeojson,
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

function toProjectRelative(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
