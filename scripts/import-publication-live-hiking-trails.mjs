import { XMLParser } from "fast-xml-parser";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeTrailSystemSourceShards } from "./lib/hiking-source-shards.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(path.join(scriptDir, ".."));
const publicRoutesRoot = path.join(projectRoot, "public", "routes", "hiking");
const sourceResearchRoot = path.join(projectRoot, "data", "research", "candidate-trails");
const checkedAt = "2026-05-01";

const gpxParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: true,
  trimValues: true
});

const allowedFacilityTypes = new Set([
  "campsite",
  "shelter",
  "fireplace",
  "toilet",
  "water",
  "natural-water",
  "food",
  "swimming",
  "parking",
  "transit",
  "rest-area",
  "attraction",
  "heritage",
  "rule-warning",
  "unofficial-shelter",
  "trail-junction",
  "emergency-phone",
  "lodging",
  "waste",
  "hazard",
  "viewpoint",
  "camping",
  "service"
]);

const upplandSupplementalGpx = {
  "upplandsleden-stockholms-lan": "https://www.naturkartan.se/sv/stockholms-lan/upplandsleden-upplands-vasby.gpx",
  "upplandsleden-etapp-1-0-studenternas-ip-sunnersta":
    "https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-1-0-11-5-km.gpx",
  "upplandsleden-etapp-1-1-lunsentorpet-knivsta":
    "https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-1-1.gpx",
  "upplandsleden-etapp-1-2-knivsta-forsbyan":
    "https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-1-2.gpx",
  "upplandsleden-etapp-20-1-osta-ingbo-kallor-rasbo":
    "https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-201-osta-rasbo.gpx",
  "upplandsleden-etapp-20-2-rasbo-huddunge":
    "https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-202-rasbo-huddunge.gpx",
  "upplandsleden-etapp-20-3-huddunge-siggefora":
    "https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-203-huddunge-siggefora.gpx",
  "upplandsleden-avstickare-25-2-boglosa-hallristningsomrade":
    "https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-avstickare-25-2.gpx"
};

const nordNaturkartanGpx = {
  "nordkalottleden-full-14-treriksroset-paltsa":
    "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd02-treriksroset-paltsa.gpx",
  "nordkalottleden-full-15-paltsa-gappohytta":
    "https://www.naturkartan.se/sv/norrbottens-lan/bd-01-vandringsled-gappohyttan-paltsa.gpx",
  "nordkalottleden-full-29-duolbanjunni-hukejaure":
    "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd39-fran-touolpanjunnje-till-hukejaure.gpx",
  "nordkalottleden-full-30-hukejaure-gautelis":
    "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd93-mellan-norska-gransen-och-led-bd39-vid-hukejaure.gpx",
  "nordkalottleden-full-37-vaisaluokta-kutjaure":
    "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd55-mellan-vaisaluokta-och-kutjaurestugan.gpx"
};

const nordE1Stages = {
  "nordkalottleden-full-13-kilpisjarvi-treriksroset": "03.01",
  "nordkalottleden-full-16-gappohytta-rostahytta": "03.03",
  "nordkalottleden-full-17-rostahytta-daertahytta": "03.04",
  "nordkalottleden-full-18-daertahytta-dividalshytta": "03.05",
  "nordkalottleden-full-19-dividalshytta-vuomahytta": "03.06",
  "nordkalottleden-full-20-vuomahytta-gaskashytta": "03.07",
  "nordkalottleden-full-21-gaskashytta-altevasshytta": "03.08",
  "nordkalottleden-full-22-altevasshytta-lappjordhytta": "03.09",
  "nordkalottleden-full-23-lappjordhytta-palnostugan": "03.10",
  "nordkalottleden-full-24-palnostugan-abisko": "03.11",
  "nordkalottleden-full-31-gautelis-skoaddejavre": "04.06",
  "nordkalottleden-full-32-skoaddejavre-sitashytta": "04.07",
  "nordkalottleden-full-33-sitashytta-paurohytta": "04.08",
  "nordkalottleden-full-34-paurohytta-roysvatn": "04.09",
  "nordkalottleden-full-37-vaisaluokta-kutjaure": "04.11",
  "nordkalottleden-full-38-kutjaure-laddejahka": "04.12",
  "nordkalottleden-full-39-laddejahka-arasluokta": "04.13",
  "nordkalottleden-full-40-arasluokta-staloluokta": "04.14",
  "nordkalottleden-full-41-staloluokta-staddajahka": "04.15",
  "nordkalottleden-full-42-staddajahka-sarjesjaure": "04.16",
  "nordkalottleden-full-43-sarjesjaure-sorjushytta": "04.17",
  "nordkalottleden-full-44-sorjushytta-ny-sulitjelma": "04.18"
};

const kungsledenRouteFiles = {
  "nordkalottleden-full-25-abisko-abiskojaure": [
    "public/routes/hiking/kungsleden/sections/kungsleden-section-01-abisko-abiskojaure.geojson"
  ],
  "nordkalottleden-full-26-abiskojaure-alesjaure": [
    "public/routes/hiking/kungsleden/sections/kungsleden-section-02-abiskojaure-alesjaure.geojson"
  ],
  "nordkalottleden-full-27-alesjaure-salka": [
    "public/routes/hiking/kungsleden/sections/kungsleden-section-03-alesjaure-tjaktja.geojson",
    "public/routes/hiking/kungsleden/sections/kungsleden-section-04-tjaktja-salka.geojson"
  ],
  "nordkalottleden-full-28-salka-duolbanjunni-junction": [
    "public/routes/hiking/kungsleden/sections/kungsleden-section-05-salka-singi.geojson"
  ]
};

const padjelantaRouteFiles = {
  "nordkalottleden-kvikkjokk-variant-01-kvikkjokk-tarrekaise": [
    "public/routes/hiking/padjelantaleden/sections/padjelantaleden-stage-10-njunjes-kvikkjokk.geojson",
    "public/routes/hiking/padjelantaleden/sections/padjelantaleden-stage-09-tarrekaise-njunjes.geojson"
  ]
};

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function round(value, decimals = 3) {
  return Number(value.toFixed(decimals));
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function parseNameEndpoints(name) {
  const parts = cleanText(name).split(/\s*[-–]\s*/);
  if (parts.length < 2) return { from: cleanText(name), to: cleanText(name) };
  return { from: parts[0], to: parts.slice(1).join("-") };
}

function packetOfficialId(packet) {
  if (packet?.section?.officialId) return String(packet.section.officialId);
  const name = cleanText(packet?.section?.name);
  const etappMatch = /etapp\s+([0-9]+(?::[0-9]+)?)/i.exec(name);
  if (etappMatch) return etappMatch[1];
  const idMatch = /slinga-([0-9]+)-([0-9]+)/.exec(packet?.id ?? "");
  if (idMatch) return `${idMatch[1]}:${idMatch[2]}`;
  return null;
}

function isLatLonPair(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1])) &&
    Math.abs(Number(value[0])) <= 90 &&
    Math.abs(Number(value[1])) <= 180
  );
}

function toLatLonPair(value) {
  if (!isLatLonPair(value)) return null;
  return [round(Number(value[0]), 6), round(Number(value[1]), 6)];
}

function lonLatToLatLon(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [round(lat, 6), round(lon, 6)];
}

function latLonToLonLat(value) {
  const pair = toLatLonPair(value);
  return pair ? [pair[1], pair[0]] : null;
}

function mapPointToLatLon(point) {
  if (Array.isArray(point)) return toLatLonPair(point);
  return toLatLonPair([point?.lat, point?.lon]);
}

function haversineKm(a, b) {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function lineLengthKm(line) {
  let total = 0;
  for (let index = 1; index < line.length; index += 1) {
    total += haversineKm(line[index - 1], line[index]);
  }
  return total;
}

function collectLineStrings(geojson) {
  const lines = [];

  function collectGeometry(geometry) {
    if (!geometry) return;
    if (geometry.type === "LineString") {
      lines.push((geometry.coordinates ?? []).filter((coordinate) => Array.isArray(coordinate)));
    } else if (geometry.type === "MultiLineString") {
      for (const line of geometry.coordinates ?? []) lines.push(line.filter((coordinate) => Array.isArray(coordinate)));
    } else if (geometry.type === "GeometryCollection") {
      for (const child of geometry.geometries ?? []) collectGeometry(child);
    }
  }

  if (geojson?.type === "FeatureCollection") {
    for (const feature of geojson.features ?? []) collectGeometry(feature.geometry);
  } else if (geojson?.type === "Feature") collectGeometry(geojson.geometry);
  else collectGeometry(geojson);

  return lines.filter((line) => line.length >= 2);
}

function flattenLines(geojson) {
  return collectLineStrings(geojson).flat();
}

function makeFeatureCollection(lines, properties = {}) {
  return {
    type: "FeatureCollection",
    features: lines
      .filter((line) => line.length >= 2)
      .map((line, index) => ({
        type: "Feature",
        properties: { ...properties, segment: index + 1 },
        geometry: {
          type: "LineString",
          coordinates: line.map((coordinate) => [round(Number(coordinate[0]), 6), round(Number(coordinate[1]), 6)])
        }
      }))
  };
}

function featureCollectionStartEnd(geojson) {
  const lines = collectLineStrings(geojson);
  const firstLine = lines[0] ?? [];
  const lastLine = lines[lines.length - 1] ?? [];
  return {
    start: lonLatToLatLon(firstLine[0]),
    end: lonLatToLatLon(lastLine[lastLine.length - 1])
  };
}

function reverseGeojson(geojson) {
  const lines = collectLineStrings(geojson).reverse().map((line) => [...line].reverse());
  const properties = geojson?.features?.[0]?.properties ?? {};
  return makeFeatureCollection(lines, { ...properties, reversedForRuntime: true });
}

function routeLengthKm(geojson) {
  return collectLineStrings(geojson).reduce((sum, line) => sum + lineLengthKm(line), 0);
}

function sliceLineByFraction(line, startFraction, endFraction) {
  if (line.length < 2) return [];
  const total = lineLengthKm(line);
  if (!Number.isFinite(total) || total <= 0) return line;
  const startKm = total * startFraction;
  const endKm = total * endFraction;
  const result = [];
  let travelled = 0;

  for (let index = 1; index < line.length; index += 1) {
    const a = line[index - 1];
    const b = line[index];
    const segmentKm = haversineKm(a, b);
    const nextTravelled = travelled + segmentKm;
    if (nextTravelled >= startKm && travelled <= endKm) {
      if (!result.length) result.push(interpolateCoordinate(a, b, segmentKm ? (startKm - travelled) / segmentKm : 0));
      if (nextTravelled <= endKm) result.push(b);
      else result.push(interpolateCoordinate(a, b, segmentKm ? (endKm - travelled) / segmentKm : 1));
    }
    travelled = nextTravelled;
    if (travelled > endKm) break;
  }
  return result.filter((coordinate, index) => {
    const previous = result[index - 1];
    return !previous || previous[0] !== coordinate[0] || previous[1] !== coordinate[1];
  });
}

function interpolateCoordinate(a, b, fraction) {
  const t = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return [round(a[0] + (b[0] - a[0]) * t, 6), round(a[1] + (b[1] - a[1]) * t, 6)];
}

function splitGeojsonByFraction(geojson, startFraction, endFraction, properties = {}) {
  const line = flattenLines(geojson);
  return makeFeatureCollection([sliceLineByFraction(line, startFraction, endFraction)], properties);
}

function sliceGeojsonAtNearestLatLon(geojson, latLon, direction, properties = {}) {
  const target = latLonToLonLat(latLon);
  const line = flattenLines(geojson);
  if (!target || line.length < 2) return geojson;

  let nearestIndex = 0;
  let nearestKm = Infinity;
  for (const [index, coordinate] of line.entries()) {
    const distanceKm = haversineKm(coordinate, target);
    if (distanceKm < nearestKm) {
      nearestKm = distanceKm;
      nearestIndex = index;
    }
  }
  const sliced = direction === "before" ? line.slice(0, nearestIndex + 1) : line.slice(nearestIndex);
  return makeFeatureCollection([sliced], { ...properties, sliceTargetDistanceKm: round(nearestKm, 3) });
}

function normalizeGpxPoint(point) {
  const lat = Number(point?.["@_lat"]);
  const lon = Number(point?.["@_lon"]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [round(lon, 6), round(lat, 6)];
}

function parseGpx(gpxText, properties = {}, options = {}) {
  const parsed = gpxParser.parse(gpxText);
  const lines = [];

  for (const track of asArray(parsed?.gpx?.trk)) {
    for (const segment of asArray(track?.trkseg)) {
      const line = asArray(segment?.trkpt).map(normalizeGpxPoint).filter(Boolean);
      if (line.length >= 2) lines.push(line);
    }
  }

  if (!lines.length) {
    for (const route of asArray(parsed?.gpx?.rte)) {
      const line = asArray(route?.rtept).map(normalizeGpxPoint).filter(Boolean);
      if (line.length >= 2) lines.push(line);
    }
  }

  const selectedLines = options.keepOnlyFirstLine ? lines.slice(0, 1) : lines;
  const orientedLines = options.reverse ? selectedLines.reverse().map((line) => [...line].reverse()) : selectedLines;
  return makeFeatureCollection(orientedLines, properties);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "hike-trails-data-import/1.0"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function geojsonFromGpxUrl(url, properties, options = {}) {
  const gpxText = await fetchText(url);
  return parseGpx(gpxText, { ...properties, sourceUrl: url, sourceFormat: "gpx" }, options);
}

async function writeRouteGeojson(trailId, sectionId, geojson) {
  const relativePath = path.join("routes", "hiking", trailId, "sections", `${sectionId}.geojson`);
  const outputPath = path.join(projectRoot, "public", relativePath);
  await writeJson(outputPath, geojson);
  return `/${relativePath.split(path.sep).join("/")}`;
}

async function resetTrailRoutes(trailId) {
  await rm(path.join(publicRoutesRoot, trailId), { recursive: true, force: true });
  await mkdir(path.join(publicRoutesRoot, trailId, "sections"), { recursive: true });
}

function sectionRoute(sectionId, routeStatus = "ready", sourceFormat = "geojson") {
  return {
    status: routeStatus,
    sourceFormat,
    geojsonPath: `/routes/hiking/${currentTrailId}/sections/${sectionId}.geojson`
  };
}

let currentTrailId = "";

function toFacilitySource(provider, urls) {
  const url = asArray(urls).find((candidate) => typeof candidate === "string" && candidate.startsWith("http"));
  return {
    provider,
    ...(url ? { url } : {}),
    lastFetchedAt: checkedAt
  };
}

function facilityRouteProximity(row) {
  if (typeof row.routeProximity === "string") return row.routeProximity;
  if (typeof row.routeProximityNote === "string") return row.routeProximityNote;
  if (Number.isFinite(row.routeProximityMeters)) return `${round(row.routeProximityMeters, 0)} m from route.`;
  if (row.routeProximity?.distanceMetersApprox !== undefined) return `${row.routeProximity.distanceMetersApprox} m from route.`;
  if (row.routeProximity?.distanceKmApprox !== undefined) return `${row.routeProximity.distanceKmApprox} km from route.`;
  return undefined;
}

function normalizeFacilityType(type) {
  if (allowedFacilityTypes.has(type)) return type;
  if (type === "poi") return "attraction";
  if (type === "bridge") return "hazard";
  if (type === "hut") return "lodging";
  return "service";
}

function upplandImportRowToFacility(row, sectionId, sourceMap, fallbackUrl) {
  const coordinates = toLatLonPair(row.coords);
  const urls = asArray(row.sources)
    .map((sourceId) => sourceMap?.[sourceId]?.url ?? sourceMap?.[sourceId]?.sourceUrl ?? sourceId)
    .filter((value) => typeof value === "string");
  return {
    id: row.id,
    name: row.name,
    type: normalizeFacilityType(row.type),
    sectionId,
    ...(coordinates ? { coordinates } : {}),
    description: cleanText(row.notes) || undefined,
    source: toFacilitySource("Upplandsleden research", urls.length ? urls : [fallbackUrl]),
    ...(facilityRouteProximity(row) ? { routeProximity: facilityRouteProximity(row) } : {})
  };
}

function stockholmFacilityToRuntime(row, sectionId) {
  const type = normalizeFacilityType(row.type ?? row.types?.[0]);
  const coordinates = toLatLonPair(row.coords ?? row.coordinates);
  return {
    id: row.id ?? row.sourceResearchId,
    name: row.name,
    type,
    sectionId,
    ...(coordinates ? { coordinates } : {}),
    description: cleanText(row.description ?? row.notes) || undefined,
    source: toFacilitySource("Upplandsleden Stockholm County research", row.sources),
    ...(facilityRouteProximity(row) ? { routeProximity: facilityRouteProximity(row) } : {})
  };
}

function nordFacilityToRuntime(row, sectionId) {
  const coordinates = toLatLonPair(row.coordinatesLatLon);
  return {
    id: row.facilityId.replace(row.sectionId, sectionId),
    name: row.name,
    type: normalizeFacilityType(row.primaryType),
    sectionId,
    ...(coordinates ? { coordinates } : {}),
    description: cleanText(row.description ?? asArray(row.caveats).join(" ")) || undefined,
    source: toFacilitySource("Nordkalottleden normalized research", row.sourceUrls),
    ...(facilityRouteProximity(row) ? { routeProximity: facilityRouteProximity(row) } : {})
  };
}

function endpointFacility(name, type, sectionId, coordinates, sourceUrl) {
  if (!coordinates) return null;
  return {
    id: `${sectionId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${type}`,
    name,
    type,
    sectionId,
    coordinates,
    description:
      type === "lodging"
        ? "Endpoint hut/cabin service. Check booking, seasonal opening, and payment/current access conditions before relying on it."
        : "Endpoint or route junction marker used to keep the long-route topology explicit.",
    source: toFacilitySource("route endpoint model", [sourceUrl]),
    routeProximity: "Route endpoint."
  };
}

function coordinatesForSection(geojson, fallbackStart, fallbackEnd) {
  const endpoints = featureCollectionStartEnd(geojson);
  return {
    source: "runtime-route-geometry",
    start: fallbackStart ?? endpoints.start ?? undefined,
    end: fallbackEnd ?? endpoints.end ?? undefined
  };
}

function estimatedTimeForDistance(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return "Varies";
  const minHours = Math.max(1, Math.round(distanceKm / 4.5));
  const maxHours = Math.max(minHours + 1, Math.round(distanceKm / 3));
  return `${minHours}-${maxHours} hours`;
}

async function routeFromSupplementalGpx(trailId, sectionId, url, options, fallbackLine, properties = {}) {
  try {
    const geojson = await geojsonFromGpxUrl(url, { trailId, sectionId, ...properties }, options);
    if (geojson.features.length) return { geojson, routeStatus: "ready", sourceFormat: "geojson", sourceUrl: url };
  } catch (error) {
    if (!fallbackLine) throw error;
  }
  return {
    geojson: makeFeatureCollection([fallbackLine], {
      trailId,
      sectionId,
      ...properties,
      fallbackReason: "Official GPX could not be fetched during import; endpoint corridor only."
    }),
    routeStatus: "manual",
    sourceFormat: "approximate-waypoint-corridor",
    sourceUrl: url
  };
}

async function buildUpplandsleden() {
  currentTrailId = "upplandsleden";
  await resetTrailRoutes(currentTrailId);

  const trailPath = path.join(sourceResearchRoot, currentTrailId, "trail.research.json");
  const trailResearch = await readJson(trailPath);
  const structure = trailResearch.route.routeStructureDraft.uppsalaCountyStructureDraft;
  const officialEtapper = structure.officialEtapper;
  const officialSlingor = structure.officialSlingor;
  const officialRecords = [...officialEtapper, ...officialSlingor];
  const officialById = new Map(officialRecords.map((record) => [record.id, record]));
  const sectionResearchDir = path.join(sourceResearchRoot, currentTrailId, "sections");
  const sectionFiles = (await readdir(sectionResearchDir)).filter((file) => file.endsWith(".research.json"));
  const researchById = new Map();
  const researchByOfficialId = new Map();

  for (const file of sectionFiles) {
    const packet = await readJson(path.join(sectionResearchDir, file));
    researchById.set(packet.id, packet);
    const officialId = packetOfficialId(packet);
    if (officialId) researchByOfficialId.set(officialId, packet);
  }

  const sections = [];
  const sourceWarnings = [];

  async function buildSectionFromPacket(packet, officialRecord = officialById.get(packet.id)) {
    const mapdata = packet.mapdata ?? {};
    const sourceMap = packet.sources ?? {};
    const officialDistance = Number(
      officialRecord?.naturkartanDistanceKm ??
        officialRecord?.distanceKm ??
        officialRecord?.distanceKmMax ??
        packet.section?.officialDistanceKm ??
        packet.section?.distanceKm ??
        mapdata.distanceKm ??
        0
    );
    const computedDistance = Number(mapdata.computedDistanceKm ?? mapdata.distanceKm ?? 0);
    const distanceKm =
      Number.isFinite(officialDistance) &&
      Number.isFinite(computedDistance) &&
      officialDistance > 0 &&
      computedDistance > 0 &&
      Math.abs(computedDistance - officialDistance) >= 3 &&
      (computedDistance / officialDistance < 0.7 || computedDistance / officialDistance > 1.3)
        ? round(computedDistance, 1)
        : round(Number(officialDistance || computedDistance || 0), 1);
    const id = officialRecord?.id ?? packet.id;
    const { from, to } = packet.section?.from
      ? { from: packet.section.from, to: packet.section.to }
      : parseNameEndpoints(packet.section?.name ?? officialRecord?.name ?? id);
    const gpxUrl = mapdata.gpxUrl;
    const keepOnlyFirstLine = asArray(mapdata.drawPolicy).some((policy) => /track 1|first track/i.test(policy));
    const reverse = asArray(mapdata.drawPolicy).some((policy) => /reverse/i.test(policy));
    const fallbackStart = mapPointToLatLon(mapdata.start);
    const fallbackEnd = mapPointToLatLon(mapdata.end);
    const fallbackLine = fallbackStart && fallbackEnd ? [latLonToLonLat(fallbackStart), latLonToLonLat(fallbackEnd)] : null;
    const routeResult = await routeFromSupplementalGpx(
      currentTrailId,
      id,
      gpxUrl,
      { keepOnlyFirstLine, reverse },
      fallbackLine,
      { officialId: officialRecord?.officialId ?? packet.section?.officialId }
    );
    const routePath = await writeRouteGeojson(currentTrailId, id, routeResult.geojson);
    const facilities = (packet.importRows ?? []).map((row) =>
      upplandImportRowToFacility(row, id, sourceMap, mapdata.officialPageUrl)
    );
    const notes = [
      ...(Array.isArray(packet.decisions) ? packet.decisions.map((decision) => decision.decision ?? decision.notes).filter(Boolean) : []),
      ...(officialRecord?.sourceCaveat ? [officialRecord.sourceCaveat] : []),
      distanceKm !== round(Number(officialDistance || 0), 1) && Number.isFinite(officialDistance) && officialDistance > 0
        ? `Official planning distance is ${round(officialDistance, 1)} km, but the current downloadable GPX geometry measures ${distanceKm} km and includes the mapped route option used here.`
        : null,
      id === "upplandsleden-etapp-10-kolarmora-gimo"
        ? "Publication-live notice: current official sources warn that Etapp 10 has poor maintenance/fallen trees/brush and a partly rerouted Kolarmoraån passage; choose another section until the official notice is cleared."
        : null,
      routeResult.routeStatus === "manual"
        ? "Map line is an endpoint corridor because the official GPX could not be fetched during this import; use the official source for navigation."
        : null
    ].filter(Boolean);
    return {
      id,
      stageNumber: officialRecord?.officialId ?? packet.section?.officialId ?? packet.section?.name ?? id,
      name: cleanText(packet.section?.name ?? officialRecord?.name ?? id),
      from,
      to,
      distanceKm,
      estimatedTime: estimatedTimeForDistance(distanceKm),
      description: `Upplandsleden ${officialRecord?.officialId ? `section ${officialRecord.officialId}` : "route option"}: ${from} to ${to}.`,
      utilities: facilities
        .filter((facility) => ["food", "lodging", "shelter", "toilet", "water", "campsite", "camping"].includes(facility.type))
        .map((facility) => `${facility.name} (${facility.type})`)
        .slice(0, 12),
      waterSources: facilities.some((facility) => facility.type === "water" || facility.type === "natural-water")
        ? facilities
            .filter((facility) => facility.type === "water" || facility.type === "natural-water")
            .map((facility) => facility.name)
        : ["No verified potable water source is listed for this section; carry water and treat natural water."],
      notes,
      facilities,
      source: {
        provider: "Naturkartan / Upplandsstiftelsen research packet",
        url: mapdata.officialPageUrl ?? routeResult.sourceUrl,
        lastFetchedAt: checkedAt
      },
      route: {
        status: routeResult.routeStatus,
        sourceFormat: routeResult.sourceFormat,
        geojsonPath: routePath
      },
      endpointCoordinates: coordinatesForSection(routeResult.geojson, fallbackStart, fallbackEnd)
    };
  }

  async function buildSupplementalEtapp(record, extra = {}) {
    const { from, to } = parseNameEndpoints(record.name);
    const id = record.id;
    const gpxUrl = upplandSupplementalGpx[id];
    const routeResult = await routeFromSupplementalGpx(
      currentTrailId,
      id,
      gpxUrl,
      { reverse: Boolean(extra.reverse) },
      extra.fallbackLine,
      { officialId: record.officialId }
    );
    const routePath = await writeRouteGeojson(currentTrailId, id, routeResult.geojson);
    const endpoints = featureCollectionStartEnd(routeResult.geojson);
    return {
      id,
      stageNumber: record.officialId,
      name: record.name,
      from: extra.reverse ? to : from,
      to: extra.reverse ? from : to,
      distanceKm: round(Number(record.naturkartanDistanceKm ?? record.distanceKm ?? routeLengthKm(routeResult.geojson)), 1),
      estimatedTime: estimatedTimeForDistance(Number(record.distanceKm ?? routeLengthKm(routeResult.geojson))),
      description: `Official Upplandsleden ${record.type === "avstickare" ? "side branch" : "section"} ${record.officialId}: ${
        extra.reverse ? `${to} to ${from}` : `${from} to ${to}`
      }.`,
      utilities: [],
      waterSources: ["No verified potable water source is listed for this section; carry water and treat natural water."],
      notes: [
        record.sourceCaveat,
        extra.reverse
          ? "Drawn in reverse of the official page direction so the post-Sigtuna-break route option flows from Forsbyån toward Lunsentorpet."
          : null,
        record.distanceSemantics,
        routeResult.routeStatus === "manual"
          ? "Map line is an endpoint corridor because the official GPX could not be fetched during this import; use the official source for navigation."
          : null
      ].filter(Boolean),
      facilities: [],
      source: {
        provider: "Naturkartan / Upplandsstiftelsen",
        url: gpxUrl?.replace(/\.gpx$/, ""),
        lastFetchedAt: checkedAt
      },
      route: {
        status: routeResult.routeStatus,
        sourceFormat: routeResult.sourceFormat,
        geojsonPath: routePath
      },
      endpointCoordinates: {
        source: "runtime-route-geometry",
        start: endpoints.start ?? undefined,
        end: endpoints.end ?? undefined
      }
    };
  }

  async function buildStockholmCountySection() {
    const record = trailResearch.sections.find((candidate) => candidate.id === "upplandsleden-stockholms-lan");
    const fallbackStart = toLatLonPair(record.routeGeometryDraft.start.coords);
    const fallbackEnd = toLatLonPair(record.routeGeometryDraft.end.coords);
    const fallbackLine = fallbackStart && fallbackEnd ? [latLonToLonLat(fallbackStart), latLonToLonLat(fallbackEnd)] : null;
    const routeResult = await routeFromSupplementalGpx(
      currentTrailId,
      record.id,
      record.routeGeometryDraft.gpxUrl,
      {},
      fallbackLine,
      { officialId: "Stockholm County" }
    );
    if (routeResult.routeStatus === "manual") {
      sourceWarnings.push("Stockholm County GPX returned an error on import; generated endpoint corridor and retained caveat.");
    }
    const routePath = await writeRouteGeojson(currentTrailId, record.id, routeResult.geojson);
    const facilities = [
      ...(record.facilitiesDraft ?? []).filter((row) =>
        String(row.importRecommendation ?? "").startsWith("normal_facility")
      ),
      ...(record.normalPois ?? [])
    ].map((row) => stockholmFacilityToRuntime(row, record.id));
    return {
      id: record.id,
      stageNumber: "Stockholm County",
      name: record.name,
      from: "Barkarby",
      to: "Sigtuna / Hagbyholmsvägen break",
      distanceKm: round(Number(record.distanceKm ?? routeLengthKm(routeResult.geojson)), 1),
      estimatedTime: "3-4 days",
      description:
        "Stockholm County part of Upplandsleden from Barkarby through Järfälla, Upplands Väsby and Sigtuna. Official sources state that it currently stops before the Uppsala County network.",
      utilities: facilities
        .filter((facility) => ["food", "shelter", "toilet", "water"].includes(facility.type))
        .map((facility) => `${facility.name} (${facility.type})`)
        .slice(0, 12),
      waterSources: facilities.some((facility) => facility.type === "water")
        ? facilities.filter((facility) => facility.type === "water").map((facility) => facility.name)
        : ["Carry water between confirmed service clusters."],
      notes: [
        "Do not stitch this section to the Uppsala County Forsbyån endpoint; official sources describe a current break around Sigtuna.",
        "SL/UL transit information is volatile. Use live trip planners before publication or travel.",
        routeResult.routeStatus === "manual"
          ? "The public Naturkartan GPX URL returned an error during this import; this runtime line is an endpoint corridor, not navigation-grade."
          : null
      ].filter(Boolean),
      facilities,
      source: {
        provider: "Naturkartan / municipal research",
        url: record.officialUrl,
        lastFetchedAt: checkedAt
      },
      route: {
        status: routeResult.routeStatus,
        sourceFormat: routeResult.sourceFormat,
        geojsonPath: routePath
      },
      endpointCoordinates: coordinatesForSection(routeResult.geojson, fallbackStart, fallbackEnd)
    };
  }

  sections.push(await buildStockholmCountySection());

  const supplementalIds = new Set([
    "upplandsleden-etapp-1-0-studenternas-ip-sunnersta",
    "upplandsleden-etapp-1-1-lunsentorpet-knivsta",
    "upplandsleden-etapp-1-2-knivsta-forsbyan",
    "upplandsleden-etapp-20-1-osta-ingbo-kallor-rasbo",
    "upplandsleden-etapp-20-2-rasbo-huddunge",
    "upplandsleden-etapp-20-3-huddunge-siggefora",
    "upplandsleden-avstickare-25-2-boglosa-hallristningsomrade"
  ]);

  for (const record of officialEtapper) {
    const packet = researchById.get(record.id) ?? researchByOfficialId.get(record.officialId);
    if (packet) sections.push(await buildSectionFromPacket(packet, record));
    else if (supplementalIds.has(record.id)) {
      sections.push(
        await buildSupplementalEtapp(record, {
          reverse: record.officialId === "1:2"
        })
      );
    }
  }

  for (const record of officialSlingor) {
    const packet = researchById.get(record.id) ?? researchByOfficialId.get(record.officialId);
    if (packet) sections.push(await buildSectionFromPacket(packet, record));
  }

  const sectionIds = new Set(sections.map((section) => section.id));
  const mainUppsalaIds = officialEtapper
    .filter(
      (record) =>
        record.officialId === "1:0" ||
        (/^[0-9]+$/.test(record.officialId) && Number(record.officialId) >= 1 && Number(record.officialId) <= 17)
    )
    .map((record) => record.id)
    .filter((id) => sectionIds.has(id));
  const postBreakIds = [
    "upplandsleden-etapp-1-2-knivsta-forsbyan",
    "upplandsleden-etapp-1-1-lunsentorpet-knivsta"
  ].filter((id) => sectionIds.has(id));
  const westernIds = [
    "upplandsleden-etapp-20-1-osta-ingbo-kallor-rasbo",
    "upplandsleden-etapp-20-2-rasbo-huddunge",
    "upplandsleden-etapp-20-3-huddunge-siggefora",
    ...officialEtapper
      .filter((record) => /^[0-9]+$/.test(record.officialId) && Number(record.officialId) >= 21)
      .map((record) => record.id)
  ].filter((id) => sectionIds.has(id));
  const tarnsjoIds = [
    "upplandsleden-etapp-19-skekarsbo-nora-kyrka-tarnsjo",
    "upplandsleden-etapp-20-nora-kyrka-tarnsjo-osta"
  ].filter((id) => sectionIds.has(id));
  const gysingeId = "upplandsleden-etapp-18-gysinge-skekarsbo";
  const boglosaId = "upplandsleden-avstickare-25-2-boglosa-hallristningsomrade";

  const routeGroups = [
    {
      id: "upplandsleden-stockholm-county-chain",
      name: "Stockholm County chain",
      kind: "mainline",
      sectionIds: ["upplandsleden-stockholms-lan"],
      connectsToSectionIds: [],
      notice: "Stops around Sigtuna. Do not connect automatically to Forsbyån."
    },
    {
      id: "upplandsleden-uppsala-county-chain",
      name: "Uppsala County eastern main sections",
      kind: "mainline",
      sectionIds: mainUppsalaIds,
      connectsToSectionIds: [],
      notice: "Current official sections 1:0 and 1-17. Western/branch chains are modeled separately to avoid hidden joins."
    },
    {
      id: "upplandsleden-forsbyan-knivsta-lunsentorpet-branch",
      name: "Forsbyån-Knivsta-Lunsentorpet option",
      kind: "mainline",
      sectionIds: postBreakIds,
      connectsToSectionIds: [],
      notice: "Modeled separately because the Sigtuna-Forsbyån break is explicit."
    },
    {
      id: "upplandsleden-skekarsbo-gysinge-branch",
      name: "Skekarsbo-Gysinge branch",
      kind: "mainline",
      sectionIds: sectionIds.has(gysingeId) ? [gysingeId] : [],
      connectsToSectionIds: [],
      notice: "Etapp 18 is an official branch/connection, not a hidden continuation from Etapp 17."
    },
    {
      id: "upplandsleden-tarnsjo-osta-chain",
      name: "Tärnsjö-Östa chain",
      kind: "mainline",
      sectionIds: tarnsjoIds,
      connectsToSectionIds: [],
      notice: "Etapp 19-20 route option, kept separate from the western Siggefora continuation."
    },
    {
      id: "upplandsleden-western-continuation-20-1-31",
      name: "Western continuation 20:1-31",
      kind: "mainline",
      sectionIds: westernIds,
      connectsToSectionIds: [],
      notice: "Official side continuation through Rasbo, Huddunge, Siggefora and onward sections 21-31."
    },
    ...(sectionIds.has(boglosaId)
      ? [
          {
            id: "upplandsleden-boglosa-hallristningar-branch",
            name: "Boglösa hällristningar branch",
            kind: "mainline",
            sectionIds: [boglosaId],
            connectsToSectionIds: [],
            notice: "One-way side branch; Naturkartan describes the out-and-back as about 8 km."
          }
        ]
      : []),
    ...officialSlingor
      .filter((record) => sectionIds.has(record.id))
      .map((record) => ({
        id: `${record.id}-route-group`,
        name: `Slinga ${record.officialId}: ${record.name}`,
        kind: "mainline",
        sectionIds: [record.id],
        connectsToSectionIds: [],
        notice: "Official loop modeled as an independently selectable route option."
      }))
  ].filter((group) => group.sectionIds.length);

  const presets = routeGroups.map((group) => ({
    id: group.id.replace(/^upplandsleden-/, ""),
    name: group.name,
    description: group.notice,
    startSectionId: group.sectionIds[0],
    endSectionId: group.sectionIds[group.sectionIds.length - 1]
  }));

  const trailSystem = {
    id: currentTrailId,
    itemType: "trail-system",
    name: "Upplandsleden",
    region: "Stockholms län / Uppsala län",
    country: "Sweden",
    location: {
      label: "Barkarby, Sigtuna, Knivsta, Uppsala län",
      start: [59.404199, 17.866957],
      end: [59.70767, 17.600841]
    },
    recommendedTimes: ["dayhike", "weekend", "3-5-days", "6-plus-days"],
    difficulty: "Easy to demanding, depending on section and current maintenance.",
    distanceKm: round(sections.reduce((sum, section) => sum + section.distanceKm, 0), 1),
    estimatedTime: "Day hikes to multi-week route combinations",
    routeType: "Multi-section trail system with official branches and loops",
    season: "Year-round where conditions allow; spring/autumn wetness and winter conditions vary.",
    description:
      "Standalone Upplandsleden runtime import with the Stockholm County chain, Uppsala County main sections, official branches, and official loops kept as selectable route options.",
    gettingThere:
      "Transit access is generally via SL/UL trains and buses around Barkarby, Sigtuna, Knivsta, Uppsala, Enköping and Älvkarleby. Timetables are volatile; use live planners before travel.",
    utilities: [
      "Shelters, rest areas, toilets, water points and swimming places vary by section.",
      "Seasonal food/service points are described on section details where verified."
    ],
    waterSources: ["Carry water between confirmed taps; treat natural water."],
    notes: [
      "Known break: the Stockholm County route is not joined to the Uppsala County Forsbyån route.",
      "Removed/closed loops 7:1, 8:1 and 10:1 are excluded from active route groups.",
      "Etapp 10 carries a publication-live maintenance/reroute warning in its section notes.",
      ...sourceWarnings
    ],
    source: {
      provider: "Naturkartan / Upplandsstiftelsen / municipal research packets",
      url: "https://www.upplandsstiftelsen.se/hitta-ut/vandra/upplandsleden/",
      lastFetchedAt: checkedAt
    },
    map: {
      center: [59.95, 17.65],
      zoom: 8
    },
    sections,
    routeGroups,
    presets
  };

  await writeTrailSystemSourceShards(trailSystem, { projectRoot });
  return trailSystem;
}

async function loadE1TrackIndex() {
  const text = await fetchText("https://e1.hiking-europe.eu/downloads/gpx/tracks.json");
  const jsonText = text.replace(/^\s*var\s+json_data\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(jsonText);
}

function e1TrackByStage(e1Tracks, stageCode) {
  const track = e1Tracks.find((candidate) => candidate.name?.startsWith(`${stageCode} `));
  if (!track) throw new Error(`Missing E1 track ${stageCode}`);
  return track;
}

async function e1Geojson(e1Tracks, stageCode, sectionId, options = {}) {
  const track = e1TrackByStage(e1Tracks, stageCode);
  const url = new URL(track.gpx, "https://e1.hiking-europe.eu").href;
  const geojson = await geojsonFromGpxUrl(
    url,
    {
      trailId: currentTrailId,
      sectionId,
      source: "E1 Hiking Europe GPX",
      e1Stage: track.name
    },
    options
  );
  return { geojson, sourceUrl: url, sourceName: track.name };
}

async function copyGeojsonFromRelative(relativeFile, properties = {}, options = {}) {
  const geojson = await readJson(path.join(projectRoot, relativeFile));
  let result = makeFeatureCollection(collectLineStrings(geojson), {
    ...geojson.features?.[0]?.properties,
    ...properties
  });
  if (options.reverse) result = reverseGeojson(result);
  return result;
}

async function concatenateGeojsonFiles(relativeFiles, properties = {}, options = {}) {
  const collections = [];
  for (const relativeFile of relativeFiles) {
    collections.push(await copyGeojsonFromRelative(relativeFile, properties, options));
  }
  const lines = collections.flatMap((geojson) => collectLineStrings(geojson));
  return makeFeatureCollection(options.reverseWhole ? lines.reverse().map((line) => [...line].reverse()) : lines, properties);
}

function northernResearchGeometryFile(sectionId) {
  return path.join(
    projectRoot,
    "data",
    "research",
    "candidate-trails",
    "nordkalottleden",
    "geometry",
    "sections",
    `${sectionId}.geojson`
  );
}

function mappedNorthernSectionId(modelSection) {
  const match = /nordkalottleden-kalottireitti-\d+-[a-z0-9-]+/.exec(modelSection.localResearchMapping ?? "");
  return match?.[0] ?? null;
}

async function buildNordRouteGeometry(modelSection, e1Tracks) {
  const properties = {
    trailId: currentTrailId,
    sectionId: modelSection.sectionId,
    sectionOrder: modelSection.order
  };

  const northernId = mappedNorthernSectionId(modelSection);
  if (northernId) {
    const geojson = await readJson(northernResearchGeometryFile(northernId));
    return {
      geojson: reverseGeojson(makeFeatureCollection(collectLineStrings(geojson), properties)),
      routeStatus: "ready",
      sourceFormat: "geojson",
      sourceProvider: "official Geonorge/Luontoon research geometry",
      sourceUrl: geojson.features?.[0]?.properties?.sourceUrl
    };
  }

  if (nordNaturkartanGpx[modelSection.sectionId]) {
    const reverse = modelSection.sectionId === "nordkalottleden-full-14-treriksroset-paltsa";
    const geojson = await geojsonFromGpxUrl(nordNaturkartanGpx[modelSection.sectionId], properties, { reverse });
    return {
      geojson,
      routeStatus: modelSection.sectionId === "nordkalottleden-full-30-hukejaure-gautelis" ? "manual" : "ready",
      sourceFormat:
        modelSection.sectionId === "nordkalottleden-full-30-hukejaure-gautelis"
          ? "approximate-waypoint-corridor"
          : "geojson",
      sourceProvider: "Naturkartan Norrbotten GPX",
      sourceUrl: nordNaturkartanGpx[modelSection.sectionId]
    };
  }

  if (kungsledenRouteFiles[modelSection.sectionId]) {
    let geojson = await concatenateGeojsonFiles(kungsledenRouteFiles[modelSection.sectionId], {
      ...properties,
      source: "shared Kungsleden runtime geometry"
    });
    let routeStatus = "ready";
    let sourceProvider = "shared Kungsleden runtime geometry";
    let sourceFormat = "geojson";
    if (modelSection.sectionId === "nordkalottleden-full-28-salka-duolbanjunni-junction") {
      geojson = splitGeojsonByFraction(geojson, 0, 0.42, {
        ...properties,
        source: "partial shared Kungsleden geometry",
        splitPolicy: "First 42% of Sälka-Singi line used as planning reference for Sälka-Duolbanjunni junction."
      });
      routeStatus = "manual";
      sourceProvider = "partial shared Kungsleden geometry";
      sourceFormat = "approximate-waypoint-corridor";
    }
    return {
      geojson,
      routeStatus,
      sourceFormat,
      sourceProvider,
      sourceUrl: "/routes/hiking/kungsleden/sections"
    };
  }

  if (modelSection.sectionId === "nordkalottleden-full-35-roysvatn-njallajavrre") {
    const { geojson, sourceUrl } = await e1Geojson(e1Tracks, "04.10", modelSection.sectionId);
    return {
      geojson: splitGeojsonByFraction(geojson, 0, 0.5, {
        ...properties,
        source: "E1 GPX split at 50%",
        splitPolicy: "Røysvatn-Vaisaluokta E1 stage split into two runtime planning sections pending official section geometry."
      }),
      routeStatus: "manual",
      sourceFormat: "approximate-waypoint-corridor",
      sourceProvider: "E1 Hiking Europe GPX",
      sourceUrl
    };
  }

  if (modelSection.sectionId === "nordkalottleden-full-36-njallajavrre-vaisaluokta") {
    const { geojson, sourceUrl } = await e1Geojson(e1Tracks, "04.10", modelSection.sectionId);
    return {
      geojson: splitGeojsonByFraction(geojson, 0.5, 1, {
        ...properties,
        source: "E1 GPX split at 50%",
        splitPolicy: "Røysvatn-Vaisaluokta E1 stage split into two runtime planning sections pending official section geometry."
      }),
      routeStatus: "manual",
      sourceFormat: "approximate-waypoint-corridor",
      sourceProvider: "E1 Hiking Europe GPX",
      sourceUrl
    };
  }

  const e1Stage = nordE1Stages[modelSection.sectionId];
  if (e1Stage) {
    const { geojson, sourceUrl } = await e1Geojson(e1Tracks, e1Stage, modelSection.sectionId);
    const sliced =
      modelSection.sectionId === "nordkalottleden-full-13-kilpisjarvi-treriksroset"
        ? sliceGeojsonAtNearestLatLon(geojson, [69.05997, 20.54864], "before", properties)
        : geojson;
    return {
      geojson: sliced,
      routeStatus: e1Stage.startsWith("03.") || e1Stage.startsWith("04.") ? "manual" : "ready",
      sourceFormat: "geojson",
      sourceProvider: "E1 Hiking Europe GPX",
      sourceUrl
    };
  }

  throw new Error(`No Nordkalottleden geometry strategy for ${modelSection.sectionId}`);
}

async function buildNordVariantGeometry(modelSection, e1Tracks, context) {
  const properties = {
    trailId: currentTrailId,
    sectionId: modelSection.sectionId,
    sectionOrder: modelSection.order
  };
  if (padjelantaRouteFiles[modelSection.sectionId]) {
    const geojson = await concatenateGeojsonFiles(padjelantaRouteFiles[modelSection.sectionId], properties, {
      reverse: true,
      reverseWhole: true
    });
    return {
      geojson,
      routeStatus: "manual",
      sourceFormat: "geojson",
      sourceProvider: "shared Padjelantaleden runtime geometry",
      sourceUrl: "/routes/hiking/padjelantaleden/sections"
    };
  }

  if (modelSection.sectionId === "nordkalottleden-kvikkjokk-variant-02-tarrekaise-darreadno") {
    const start = context.variantSectionEnds.get("nordkalottleden-kvikkjokk-variant-01-kvikkjokk-tarrekaise");
    const end = context.variantSectionStarts.get("nordkalottleden-kvikkjokk-variant-03-darreadno-vaimok");
    const line = start && end ? [latLonToLonLat(start), latLonToLonLat(end)] : [[17.52, 67.12], [17.35, 67.05]];
    return {
      geojson: makeFeatureCollection([line], {
        ...properties,
        source: "approximate connector corridor",
        caveat: "Exact Tarrekaise-Darreadno official linework still needs source harvest."
      }),
      routeStatus: "manual",
      sourceFormat: "approximate-waypoint-corridor",
      sourceProvider: "full-route model approximate connector",
      sourceUrl: "https://www.battrafikikvikkjokk.com/nordkalottleden/"
    };
  }

  const routeBySection = {
    "nordkalottleden-kvikkjokk-variant-03-darreadno-vaimok":
      "public/routes/hiking/kungsleden/sections/kungsleden-section-14-tsielekjakkstugan-pitealven.geojson",
    "nordkalottleden-kvikkjokk-variant-04-vaimok-pieskehaure":
      "public/routes/hiking/kungsleden/sections/kungsleden-section-15-pitealven-gasaklahko.geojson",
    "nordkalottleden-kvikkjokk-variant-05-pieskehaure-staddajahka":
      "public/routes/hiking/kungsleden/sections/kungsleden-section-16-gasaklahko-vuonatjviken.geojson"
  };
  const fallbackRoute = routeBySection[modelSection.sectionId];
  if (fallbackRoute) {
    return {
      geojson: await copyGeojsonFromRelative(fallbackRoute, {
        ...properties,
        source: "planning-grade reused mountain route geometry",
        caveat: "Temporary geometry placeholder until BD72/BD73 official GPX harvest succeeds."
      }),
      routeStatus: "manual",
      sourceFormat: "approximate-waypoint-corridor",
      sourceProvider: "planning-grade reused mountain route geometry",
      sourceUrl: "/routes/hiking/kungsleden/sections"
    };
  }

  throw new Error(`No Nordkalottleden variant geometry strategy for ${modelSection.sectionId}`);
}

function nordSectionNotes(modelSection, geometryResult) {
  const notes = [
    modelSection.notes,
    ...(modelSection.caveats ?? []),
    geometryResult.routeStatus === "manual"
      ? "Map geometry is publication-visible but planning-grade/manual for this section; use the named official source for navigation."
      : null,
    /Pältsa|Gappo|Rosta/i.test(`${modelSection.from} ${modelSection.to}`)
      ? "Pältsa/Gappo/Rosta area is remote and weather-exposed; verify hut access, border conditions, and current trail notices."
      : null,
    modelSection.sectionId.includes("30-hukejaure-gautelis")
      ? "The Swedish-side Naturkartan line ends at the Norwegian-border/BD39 context; verify the Gautelishytta continuation before navigation."
      : null,
    modelSection.sectionId.includes("44-sorjushytta-ny-sulitjelma")
      ? "Runtime endpoint is Ny-Sulitjelma/Sulitjelma access context; verify onward road/access details for Sulitjelma proper."
      : null
  ];
  return notes.filter(Boolean).map(cleanText);
}

function nordRuntimeSection(modelSection, geometryResult, routePath, facilities) {
  const measuredKm = routeLengthKm(geometryResult.geojson);
  const distanceKm = round(Number(modelSection.distanceKm ?? measuredKm), 1);
  const endpoints = featureCollectionStartEnd(geometryResult.geojson);
  const endpointFacilities = [
    endpointFacility(modelSection.from, "trail-junction", modelSection.sectionId, endpoints.start, geometryResult.sourceUrl),
    endpointFacility(modelSection.to, /hytta|stugan|stue|hut|cabin/i.test(modelSection.to) ? "lodging" : "trail-junction", modelSection.sectionId, endpoints.end, geometryResult.sourceUrl)
  ].filter(Boolean);
  return {
    id: modelSection.sectionId,
    stageNumber: modelSection.order,
    name: `${modelSection.from} - ${modelSection.to}`,
    from: modelSection.from,
    to: modelSection.to,
    distanceKm,
    estimatedTime: estimatedTimeForDistance(distanceKm),
    description: `Nordkalottleden ${modelSection.order}: ${modelSection.from} to ${modelSection.to}.`,
    utilities: [...facilities, ...endpointFacilities]
      .filter((facility) => ["lodging", "toilet", "water", "food", "service", "shelter"].includes(facility.type))
      .map((facility) => `${facility.name} (${facility.type})`)
      .slice(0, 12),
    waterSources: ["Remote mountain section; carry capacity and treat natural water unless a hut/service page confirms potable water."],
    notes: nordSectionNotes(modelSection, geometryResult),
    facilities: [...facilities, ...endpointFacilities],
    source: {
      provider: geometryResult.sourceProvider,
      url: geometryResult.sourceUrl,
      lastFetchedAt: checkedAt
    },
    route: {
      status: geometryResult.routeStatus,
      sourceFormat: geometryResult.sourceFormat,
      geojsonPath: routePath
    },
    endpointCoordinates: {
      source: "runtime-route-geometry",
      start: endpoints.start ?? undefined,
      end: endpoints.end ?? undefined
    }
  };
}

async function buildNordkalottleden() {
  currentTrailId = "nordkalottleden";
  await resetTrailRoutes(currentTrailId);

  const model = await readJson(
    path.join(sourceResearchRoot, currentTrailId, "full-route-section-model.research.json")
  );
  const facilitiesResearch = await readJson(
    path.join(sourceResearchRoot, currentTrailId, "normalized-candidate", "facilities.research.json")
  );
  const e1Tracks = await loadE1TrackIndex();
  const normalFacilitiesBySection = new Map();
  for (const row of facilitiesResearch.records ?? []) {
    if (row.state !== "normal" && row.importAction !== "import") continue;
    if (!normalFacilitiesBySection.has(row.sectionId)) normalFacilitiesBySection.set(row.sectionId, []);
    normalFacilitiesBySection.get(row.sectionId).push(row);
  }

  const sections = [];
  const mainlineIds = [];
  for (const modelSection of model.preferredMainlineSections) {
    const geometryResult = await buildNordRouteGeometry(modelSection, e1Tracks);
    const routePath = await writeRouteGeojson(currentTrailId, modelSection.sectionId, geometryResult.geojson);
    const sourceSectionId = mappedNorthernSectionId(modelSection) ?? modelSection.sectionId;
    const facilities = (normalFacilitiesBySection.get(sourceSectionId) ?? []).map((row) =>
      nordFacilityToRuntime(row, modelSection.sectionId)
    );
    sections.push(nordRuntimeSection(modelSection, geometryResult, routePath, facilities));
    mainlineIds.push(modelSection.sectionId);
  }

  const variantContext = {
    variantSectionStarts: new Map(),
    variantSectionEnds: new Map()
  };
  const variantGeometryResults = new Map();
  for (const modelSection of model.kvikkjokkVariantSections) {
    if (modelSection.sectionId === "nordkalottleden-kvikkjokk-variant-02-tarrekaise-darreadno") continue;
    const geometryResult = await buildNordVariantGeometry(modelSection, e1Tracks, variantContext);
    variantGeometryResults.set(modelSection.sectionId, geometryResult);
    const endpoints = featureCollectionStartEnd(geometryResult.geojson);
    if (endpoints.start) variantContext.variantSectionStarts.set(modelSection.sectionId, endpoints.start);
    if (endpoints.end) variantContext.variantSectionEnds.set(modelSection.sectionId, endpoints.end);
  }
  for (const modelSection of model.kvikkjokkVariantSections) {
    let geometryResult = variantGeometryResults.get(modelSection.sectionId);
    if (!geometryResult) {
      geometryResult = await buildNordVariantGeometry(modelSection, e1Tracks, variantContext);
    }
    const routePath = await writeRouteGeojson(currentTrailId, modelSection.sectionId, geometryResult.geojson);
    sections.push(nordRuntimeSection(modelSection, geometryResult, routePath, []));
  }

  const variantIds = model.kvikkjokkVariantSections.map((section) => section.sectionId);
  const routeGroups = [
    {
      id: "nordkalottleden-kautokeino-sulitjelma-mainline",
      name: "Kautokeino-Sulitjelma mainline",
      kind: "mainline",
      sectionIds: mainlineIds,
      connectsToSectionIds: [],
      notice:
        "44-section full-route model. Manual/planning-grade sections are retained with explicit caveats instead of hidden connector geometry."
    },
    {
      id: "nordkalottleden-kvikkjokk-sulitjelma-variant",
      name: "Kvikkjokk-Sulitjelma variant",
      kind: "mainline",
      sectionIds: variantIds,
      connectsToSectionIds: [],
      notice:
        "Selectable 5-section variant. Tarrekaise-Darreadno and BD72/BD73 geometry still carries planning-grade caveats."
    }
  ];
  const presets = routeGroups.map((group) => ({
    id: group.id.replace(/^nordkalottleden-/, ""),
    name: group.name,
    description: group.notice,
    startSectionId: group.sectionIds[0],
    endSectionId: group.sectionIds[group.sectionIds.length - 1]
  }));
  const allEndpoints = sections.flatMap((section) => [
    section.endpointCoordinates?.start,
    section.endpointCoordinates?.end
  ]).filter(Boolean);
  const center = allEndpoints.length
    ? [
        round(allEndpoints.reduce((sum, coordinate) => sum + coordinate[0], 0) / allEndpoints.length, 6),
        round(allEndpoints.reduce((sum, coordinate) => sum + coordinate[1], 0) / allEndpoints.length, 6)
      ]
    : [68.4, 18.5];

  const trailSystem = {
    id: currentTrailId,
    itemType: "trail-system",
    name: "Nordkalottleden",
    region: "Finnmark / Troms / Norrbotten / Nordland",
    country: "Norway / Finland / Sweden",
    location: {
      label: "Kautokeino to Sulitjelma, with Kvikkjokk variant",
      start: sections[0]?.endpointCoordinates?.start ?? [69.012971, 23.037072],
      end: sections.find((section) => section.id === "nordkalottleden-full-44-sorjushytta-ny-sulitjelma")?.endpointCoordinates
        ?.end ?? [67.1, 16.0]
    },
    recommendedTimes: ["6-plus-days"],
    difficulty: "Demanding remote mountain route with border, weather, hut and service dependencies.",
    distanceKm: round(sections.reduce((sum, section) => sum + section.distanceKm, 0), 1),
    estimatedTime: "6-8 weeks for the full mainline; variant trips vary.",
    routeType: "Long-distance mountain trail with selectable variant",
    season: "Summer/autumn mountain season; winter is specialist travel.",
    description:
      "Standalone Nordkalottleden runtime import: 44-section Kautokeino-Sulitjelma mainline plus a 5-section Kvikkjokk-Sulitjelma variant.",
    gettingThere:
      "Access is via Kautokeino, Kilpisjärvi, Abisko, Kvikkjokk, Ritsem/Vaisaluokta and Sulitjelma/Ny-Sulitjelma depending on chosen route. Verify buses, boats and hut access close to travel.",
    utilities: [
      "Remote hut/service network is section-specific and seasonal.",
      "Some route files are official linework; manual planning-grade sections are marked in section notes."
    ],
    waterSources: ["Natural water is common but should be treated; hut/service potable water should be verified per location."],
    notes: [
      "Preserves endpoint-zone gaps and manual route-status caveats instead of silently stitching uncertain geometry.",
      "Saraelv/Ovi and private-road/currentness-sensitive endpoints remain described in section notes/facilities.",
      "Pältsa, Gappo, Rosta and Ny-Sulitjelma/Sulitjelma endpoint caveats are visible on affected sections.",
      "Kvikkjokk variant K2-K5 require further official geometry harvest before being navigation-grade."
    ],
    source: {
      provider: "Full-route model plus official/e1/shared runtime geometry",
      url: "data/research/candidate-trails/nordkalottleden/full-route-section-model.research.json",
      lastFetchedAt: checkedAt
    },
    map: {
      center,
      zoom: 5
    },
    sections,
    routeGroups,
    presets
  };

  await writeTrailSystemSourceShards(trailSystem, { projectRoot });
  return trailSystem;
}

const results = [];
results.push(await buildUpplandsleden());
results.push(await buildNordkalottleden());

for (const trail of results) {
  console.log(
    `Imported ${trail.name}: ${trail.sections.length} sections, ${trail.routeGroups.length} route groups, ${trail.distanceKm} km declared.`
  );
}
