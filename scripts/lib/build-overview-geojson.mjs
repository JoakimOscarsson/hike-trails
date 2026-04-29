import { readFile } from "node:fs/promises";
import path from "node:path";

const simplifyTolerance = 0.0012;
const maxPointsPerLine = 90;

function publicFilePath(publicRoot, publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl.trim()) return null;
  const cleanPath = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  const resolved = path.resolve(publicRoot, cleanPath);
  return resolved === publicRoot || resolved.startsWith(publicRoot + path.sep) ? resolved : null;
}

function isLonLatPair(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function collectLineStrings(geojson) {
  const lines = [];

  function collectGeometry(geometry) {
    if (!geometry) return;
    if (geometry.type === "LineString") {
      lines.push(geometry.coordinates ?? []);
    } else if (geometry.type === "MultiLineString") {
      lines.push(...(geometry.coordinates ?? []));
    } else if (geometry.type === "GeometryCollection") {
      for (const child of geometry.geometries ?? []) collectGeometry(child);
    }
  }

  if (geojson?.type === "FeatureCollection") {
    for (const feature of geojson.features ?? []) collectGeometry(feature.geometry);
  } else if (geojson?.type === "Feature") collectGeometry(geojson.geometry);
  else collectGeometry(geojson);

  return lines;
}

function perpendicularDistanceSquared(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  }
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  const projected = [start[0] + t * dx, start[1] + t * dy];
  return (point[0] - projected[0]) ** 2 + (point[1] - projected[1]) ** 2;
}

function ramerDouglasPeucker(line, tolerance) {
  if (line.length <= 2) return line;
  let maxDistance = 0;
  let maxIndex = 0;
  const threshold = tolerance * tolerance;

  for (let index = 1; index < line.length - 1; index += 1) {
    const distance = perpendicularDistanceSquared(line[index], line[0], line[line.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxDistance <= threshold) return [line[0], line[line.length - 1]];
  return [
    ...ramerDouglasPeucker(line.slice(0, maxIndex + 1), tolerance).slice(0, -1),
    ...ramerDouglasPeucker(line.slice(maxIndex), tolerance)
  ];
}

function sampleLine(line, maxPoints) {
  if (line.length <= maxPoints) return line;
  const sampled = [];
  const step = (line.length - 1) / (maxPoints - 1);
  for (let index = 0; index < maxPoints; index += 1) {
    sampled.push(line[Math.round(index * step)]);
  }
  return sampled;
}

function roundCoordinate(coordinate) {
  return [Number(coordinate[0].toFixed(6)), Number(coordinate[1].toFixed(6))];
}

function simplifyLine(line) {
  const cleaned = [];
  for (const coordinate of line) {
    if (!isLonLatPair(coordinate)) continue;
    const rounded = roundCoordinate(coordinate);
    const previous = cleaned[cleaned.length - 1];
    if (!previous || previous[0] !== rounded[0] || previous[1] !== rounded[1]) cleaned.push(rounded);
  }
  if (cleaned.length < 2) return [];
  return sampleLine(ramerDouglasPeucker(cleaned, simplifyTolerance), maxPointsPerLine);
}

async function readRouteLines(publicRoot, publicUrl) {
  const filePath = publicFilePath(publicRoot, publicUrl);
  if (!filePath) return [];
  try {
    const geojson = JSON.parse(await readFile(filePath, "utf8"));
    return collectLineStrings(geojson).map(simplifyLine).filter((line) => line.length >= 2);
  } catch {
    return [];
  }
}

function fallbackPoint(item) {
  const latLon = item.location?.start ?? item.map?.center;
  return Array.isArray(latLon) && Number.isFinite(latLon[0]) && Number.isFinite(latLon[1]) ? [latLon[1], latLon[0]] : null;
}

function featureGeometry(lines, item) {
  if (lines.length === 1) return { type: "LineString", coordinates: lines[0] };
  if (lines.length > 1) return { type: "MultiLineString", coordinates: lines };
  const point = fallbackPoint(item);
  return point ? { type: "Point", coordinates: point } : null;
}

function uniqueStrings(values) {
  return values.filter((value, index) => typeof value === "string" && value.trim() && values.indexOf(value) === index);
}

function overviewSectionIds(trailSystem) {
  const groupedSectionIds = uniqueStrings(
    (trailSystem.routeGroups ?? []).flatMap((group) => (Array.isArray(group.sectionIds) ? group.sectionIds : []))
  );
  if (groupedSectionIds.length) return groupedSectionIds;
  return uniqueStrings((trailSystem.sections ?? []).map((section) => section.id));
}

function overviewProperties(item, itemType, geometryStatus, detailPath) {
  const properties = {
    id: item.id,
    activity: "hiking",
    itemType,
    name: item.name,
    distanceKm: item.distanceKm,
    estimatedTime: item.estimatedTime,
    difficulty: item.difficulty,
    routeType: item.routeType,
    locationLabel: item.location?.label ?? item.region,
    recommendedTime: item.recommendedTime ?? item.recommendedTimes?.[0],
    geometryStatus
  };
  if (detailPath) properties.detailPath = detailPath;
  return properties;
}

function connectionOverlay(connection, lines) {
  if (connection.mode === "walk" || !lines.length) return null;
  return {
    mode: connection.mode,
    coordinates: lines
  };
}

async function hikeFeature(hike, publicRoot) {
  const lines = hike.route?.geojsonPath ? await readRouteLines(publicRoot, hike.route.geojsonPath) : [];
  const geometry = featureGeometry(lines, hike);
  if (!geometry) return null;
  return {
    type: "Feature",
    id: hike.id,
    properties: overviewProperties(hike, "hike", lines.length ? "ready" : "single-point-only", `/data/hikes/${hike.id}.json`),
    geometry
  };
}

async function trailSystemFeature(trailSystem, publicRoot) {
  const sectionsById = new Map((trailSystem.sections ?? []).map((section) => [section.id, section]));
  const sections = overviewSectionIds(trailSystem)
    .map((sectionId) => sectionsById.get(sectionId))
    .filter(Boolean);
  const sectionLines = (
    await Promise.all(sections.map((section) => (section.route?.geojsonPath ? readRouteLines(publicRoot, section.route.geojsonPath) : [])))
  ).flat();
  const connectionResults = (
    await Promise.all(
      (trailSystem.connections ?? []).map(async (connection) => ({
        connection,
        lines: connection.route?.geojsonPath ? await readRouteLines(publicRoot, connection.route.geojsonPath) : []
      }))
    )
  ).filter((result) => result.lines.length);
  const walkConnectionLines = connectionResults
    .filter((result) => result.connection.mode === "walk")
    .flatMap((result) => result.lines);
  const connectionOverlays = connectionResults
    .map((result) => connectionOverlay(result.connection, result.lines))
    .filter(Boolean);
  const lines = [...sectionLines, ...walkConnectionLines];
  const geometry = featureGeometry(lines, trailSystem);
  if (!geometry) return null;
  const properties = overviewProperties(trailSystem, "trail-system", lines.length ? "ready" : "single-point-only");
  if (connectionOverlays.length) {
    properties.connectionOverlays = connectionOverlays;
  }
  return {
    type: "Feature",
    id: trailSystem.id,
    properties,
    geometry
  };
}

export async function buildHikingOverviewGeoJSON({ hikes = [], trailSystems = [], publicRoot }) {
  const features = (
    await Promise.all([
      ...trailSystems.map((trailSystem) => trailSystemFeature(trailSystem, publicRoot)),
      ...hikes.map((hike) => hikeFeature(hike, publicRoot))
    ])
  ).filter(Boolean);

  return {
    type: "FeatureCollection",
    name: "hiking-overview",
    generatedFrom: "current hiking public route and classified connection geometry",
    features
  };
}
