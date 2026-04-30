import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const sectionDir = path.join(rootDir, "sections");
const geometryDir = path.join(rootDir, "geometry");
const geometrySectionDir = path.join(geometryDir, "sections");
const sourceDownloadDir = path.join(geometryDir, "source-downloads");

const ACCESSED_DATE = "2026-04-30";
const GENERATED_AT = new Date().toISOString();

const LUONTOON_KALOTTIREITTI_URL =
  "https://www.luontoon.fi/geo/features/collections/public.all_lines_details_view/items?limit=1&source_unique_id=uljas-9F510DA4-B3F2-4389-A7E5-B2F0B2E72D7A";

const GEONORGE_TURRUTEBASEN_UUID = "d1422d17-6d95-4ef1-96ab-8af31744dd63";
const GEONORGE_TURRUTEBASEN_METADATA_URL = `https://kartkatalog.geonorge.no/metadata/${GEONORGE_TURRUTEBASEN_UUID}`;
const GEONORGE_TURRUTEBASEN_CAPABILITIES_URL = `https://nedlasting.geonorge.no/api/capabilities/${GEONORGE_TURRUTEBASEN_UUID}`;

const TURRUTEBASEN_ZIPS = {
  nordreisa: "Friluftsliv_5544_Nordreisa_4326_TurOgFriluftsruter_GPX.zip",
  kautokeino: "Friluftsliv_5612_Kautokeino_4326_TurOgFriluftsruter_GPX.zip"
};

const GPX_URLS = {
  "nordkalottleden-kalottireitti-06-kopmajoki-somashytta":
    "https://e1.hiking-europe.eu/gpx/no-sf-s/no-sf-s-02-06-somashytta-kopmajoki.gpx",
  "nordkalottleden-kalottireitti-07-somashytta-saraelv":
    "https://e1.hiking-europe.eu/gpx/no-sf-s/no-sf-s-02-05-saraelv-somashytta.gpx",
  "nordkalottleden-kalottireitti-08-saraelv-sieimma":
    "https://e1.hiking-europe.eu/gpx/no-sf-s/no-sf-s-02-04-nedrefosshytta-saraelv.gpx",
  "nordkalottleden-kalottireitti-09-sieimma-nedrefoss":
    "https://e1.hiking-europe.eu/gpx/no-sf-s/no-sf-s-02-04-nedrefosshytta-saraelv.gpx",
  "nordkalottleden-kalottireitti-10-nedrefoss-reisavannhytta":
    "https://e1.hiking-europe.eu/gpx/no-sf-s/no-sf-s-02-03-reisavannhytta-nedrefosshytta.gpx",
  "nordkalottleden-kalottireitti-11-reisavannhytta-madam-bongos":
    "https://e1.hiking-europe.eu/gpx/no-sf-s/no-sf-s-02-02-cunovuohppi-reisavannhytta.gpx",
  "nordkalottleden-kalottireitti-12-madam-bongos-kautokeino":
    "https://e1.hiking-europe.eu/gpx/no-sf-s/no-sf-s-02-01-kautokeino-cunovuohppi.gpx"
};

const CONFIG = {
  "nordkalottleden-kalottireitti-01-kilpisjarvi-saarijarvi": {
    sourceKind: "official-luontoon-ogc",
    chain: "kilpisjarviToMeekonjarvi",
    sourceUrl: LUONTOON_KALOTTIREITTI_URL,
    sourceDirection: "Kilpisjärvi to Meekonjärvi via Saarijärvi and Kuonjarjohka",
    appDirection: "Kilpisjärvi to Saarijärvi",
    caveats: [
      "Selected Saarijärvi hut yard is offset from official route-line endpoint; do not invent a hut-yard connector."
    ]
  },
  "nordkalottleden-kalottireitti-02-saarijarvi-kuonjarjohka": {
    sourceKind: "official-luontoon-ogc",
    chain: "kilpisjarviToMeekonjarvi",
    sourceUrl: LUONTOON_KALOTTIREITTI_URL,
    sourceDirection: "Kilpisjärvi to Meekonjärvi via Saarijärvi and Kuonjarjohka",
    appDirection: "Saarijärvi to Kuonjarjohka",
    caveats: [
      "Selected Saarijärvi hut yard is offset from official route-line endpoint; do not invent a hut-yard connector."
    ]
  },
  "nordkalottleden-kalottireitti-03-kuonjarjohka-meekonjarvi": {
    sourceKind: "official-luontoon-ogc",
    chain: "kilpisjarviToMeekonjarvi",
    sourceUrl: LUONTOON_KALOTTIREITTI_URL,
    sourceDirection: "Kilpisjärvi to Meekonjärvi via Saarijärvi and Kuonjarjohka",
    appDirection: "Kuonjarjohka to Meekonjärvi",
    caveats: [
      "Meekonjärvi hut access is represented by official spur linework, not by a synthetic connector."
    ]
  },
  "nordkalottleden-kalottireitti-04-meekonjarvi-pihtsusjarvi": {
    sourceKind: "official-luontoon-ogc",
    chain: "meekonjarviToSomas",
    sourceUrl: LUONTOON_KALOTTIREITTI_URL,
    sourceDirection: "Meekonjärvi to Somas/Kopmajoki-side official route line",
    appDirection: "Meekonjärvi to Pihtsusjärvi",
    caveats: [
      "Meekonjärvi hut access is represented by official spur linework, not by a synthetic connector."
    ]
  },
  "nordkalottleden-kalottireitti-05-pihtsusjarvi-kopmajoki": {
    sourceKind: "official-luontoon-ogc",
    chain: "meekonjarviToSomas",
    sourceUrl: LUONTOON_KALOTTIREITTI_URL,
    sourceDirection: "Meekonjärvi to Somas/Kopmajoki-side official route line",
    appDirection: "Pihtsusjärvi to Kopmajoki",
    caveats: []
  },
  "nordkalottleden-kalottireitti-06-kopmajoki-somashytta": {
    sourceKind: "official-mixed-luontoon-geonorge",
    chain: "kopmajokiToSomashytta",
    sourceUrls: [LUONTOON_KALOTTIREITTI_URL, GEONORGE_TURRUTEBASEN_METADATA_URL],
    sourceDirection:
      "Luontoon/Metsähallitus official line toward Somas plus Kartverket/Geonorge Turrutebasen fin5 line from the Norway-side boundary toward Somashytta",
    appDirection: "Kopmajoki to Somashytta",
    caveats: [
      "Mixed official-source geometry joins Luontoon/Metsähallitus and Kartverket/Geonorge Turrutebasen linework at the Finland-Norway boundary; the source junction gap is recorded in source metadata."
    ]
  },
  "nordkalottleden-kalottireitti-07-somashytta-saraelv": {
    sourceKind: "official-geonorge-turrutebasen-gpx",
    chain: "somashyttaToSaraelv",
    sourceUrls: [GEONORGE_TURRUTEBASEN_METADATA_URL],
    sourceDirection: "Turrutebasen fin5/DNT Troms line clipped from Somashytta to Saraelv",
    appDirection: "Somashytta to Saraelv",
    caveats: [
      "Official wording combines Saraelv/Ovi Raishiin; this chain uses the Turrutebasen fin5 main line plus its Saraelv connector segment."
    ]
  },
  "nordkalottleden-kalottireitti-08-saraelv-sieimma": {
    sourceKind: "official-geonorge-turrutebasen-gpx",
    chain: "oviRaishiinToSieimma",
    sourceUrls: [GEONORGE_TURRUTEBASEN_METADATA_URL],
    sourceDirection: "Turrutebasen Nord-Troms Friluftsråd F_20170508_17 line",
    appDirection: "Ovi Raishiin/Saraelv to Sieimma",
    caveats: [
      "This official municipal/friluftsråd line follows the Ovi Raishiin/Saraelv-to-Sieimma route variant and fits the selected Ovi endpoint better than the E1 GPX mirror."
    ]
  },
  "nordkalottleden-kalottireitti-09-sieimma-nedrefoss": {
    sourceKind: "official-geonorge-turrutebasen-gpx",
    chain: "sieimmaToNedrefoss",
    sourceUrls: [GEONORGE_TURRUTEBASEN_METADATA_URL],
    sourceDirection: "Turrutebasen fin4/DNT Troms line reversed from Sieimma to Nedrefoss",
    appDirection: "Sieimma to Nedrefosshytta",
    caveats: [
      "Official Reisa distance is much longer than clipped E1/OSM route-line distance; boundary semantics remain unresolved."
    ]
  },
  "nordkalottleden-kalottireitti-10-nedrefoss-reisavannhytta": {
    sourceKind: "official-geonorge-turrutebasen-gpx",
    chain: "nedrefossToReisavannhytta",
    sourceUrls: [GEONORGE_TURRUTEBASEN_METADATA_URL],
    sourceDirection: "Turrutebasen E1/DNT Troms line reversed from Nedrefoss to Reisavannhytta",
    appDirection: "Nedrefosshytta to Reisavannhytta",
    caveats: [
      "Turrutebasen E1 line is clipped across a longer municipal route object rather than delivered as a per-section Reisa stage."
    ]
  },
  "nordkalottleden-kalottireitti-11-reisavannhytta-madam-bongos": {
    sourceKind: "official-geonorge-turrutebasen-gpx",
    chain: "reisavannhyttaToCunovuohppi",
    sourceUrls: [GEONORGE_TURRUTEBASEN_METADATA_URL],
    sourceDirection:
      "Turrutebasen E1/DNT Troms and DNT Alta lines joined at the Nordreisa-Kautokeino municipal boundary",
    appDirection: "Reisavannhytta to Čunovuohppi",
    caveats: [
      "Madam Bongos/Čunovuohppi endpoint is offset from route projection and is not active lodging."
    ]
  },
  "nordkalottleden-kalottireitti-12-madam-bongos-kautokeino": {
    sourceKind: "official-geonorge-turrutebasen-gpx",
    chain: "cunovuohppiToKautokeino",
    sourceUrls: [GEONORGE_TURRUTEBASEN_METADATA_URL],
    sourceDirection: "Turrutebasen E1/DNT Alta line clipped from Čunovuohppi to Kautokeino",
    appDirection: "Čunovuohppi to Kautokeino",
    caveats: [
      "OSM child relation 9517537 is incomplete for Kautokeino; this artifact uses official Turrutebasen E1 linework instead.",
      "Madam Bongos/Čunovuohppi road access is private-road/currentness sensitive."
    ]
  }
};

function reverseLine(line) {
  return [...line].reverse();
}

function sameCoord(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-10 && Math.abs(a[1] - b[1]) < 1e-10;
}

function concatLines(...lines) {
  const out = [];
  for (const line of lines) {
    for (const coord of line) {
      if (!out.length || !sameCoord(out[out.length - 1], coord)) out.push(coord);
    }
  }
  return out;
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

function haversineKm(a, b) {
  const radiusKm = 6371.0088;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function lineDistanceKm(line) {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) total += haversineKm(line[i - 1], line[i]);
  return total;
}

function cumulativeDistances(line) {
  const cum = [0];
  for (let i = 1; i < line.length; i += 1) {
    cum.push(cum[i - 1] + haversineKm(line[i - 1], line[i]));
  }
  return cum;
}

function projectForTarget(lon, lat, targetLon, targetLat) {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos(toRad(targetLat));
  return {
    x: (lon - targetLon) * metersPerDegLon,
    y: (lat - targetLat) * metersPerDegLat
  };
}

function unprojectForTarget(x, y, targetLon, targetLat) {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos(toRad(targetLat));
  return [targetLon + x / metersPerDegLon, targetLat + y / metersPerDegLat];
}

function nearestProjection(line, target) {
  const targetLon = target.lon;
  const targetLat = target.lat;
  const cum = cumulativeDistances(line);
  let best = null;

  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1];
    const b = line[i];
    const ap = projectForTarget(a[0], a[1], targetLon, targetLat);
    const bp = projectForTarget(b[0], b[1], targetLon, targetLat);
    const vx = bp.x - ap.x;
    const vy = bp.y - ap.y;
    const len2 = vx * vx + vy * vy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ap.x * vx + ap.y * vy) / len2));
    const px = ap.x + t * vx;
    const py = ap.y + t * vy;
    const gapMeters = Math.sqrt(px * px + py * py);
    const coord = unprojectForTarget(px, py, targetLon, targetLat);
    const measureKm = cum[i - 1] + haversineKm(a, coord);
    const candidate = { segmentIndex: i, t, coord, gapMeters, measureKm };
    if (!best || gapMeters < best.gapMeters) best = candidate;
  }

  return best;
}

function sliceByMeasures(line, startProjection, endProjection) {
  const cum = cumulativeDistances(line);
  const coords = [startProjection.coord];

  for (let i = 0; i < line.length; i += 1) {
    if (cum[i] > startProjection.measureKm && cum[i] < endProjection.measureKm) {
      coords.push(line[i]);
    }
  }

  coords.push(endProjection.coord);
  return coords.filter((coord, index, arr) => index === 0 || !sameCoord(coord, arr[index - 1]));
}

function getEndpointCoord(section, key) {
  const endpoint = section.endpointCoordinates[key];
  const nested = endpoint.coordinates;
  if (nested) return { lat: nested.lat, lon: nested.lon, label: endpoint.label };
  return { lat: endpoint.lat, lon: endpoint.lon, label: endpoint.label };
}

function roundCoord(coord) {
  return [Number(coord[0].toFixed(6)), Number(coord[1].toFixed(6))];
}

function roundNum(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function parseGpx(xml) {
  const points = [...xml.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g)].map((match) => [
    Number(match[2]),
    Number(match[1])
  ]);
  if (points.length < 2) throw new Error("GPX did not contain a usable track");
  return points;
}

function parseGpxRoutes(xml) {
  return [...xml.matchAll(/<rte>[\s\S]*?<\/rte>/g)].map((match, index) => {
    const routeXml = match[0];
    const getText = (tag) =>
      routeXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? "";
    const line = [...routeXml.matchAll(/<rtept\s+lat="([^"]+)"\s+lon="([^"]+)"/g)].map(
      (pointMatch) => [Number(pointMatch[2]), Number(pointMatch[1])]
    );

    return {
      index,
      name: getText("name"),
      cmt: getText("cmt"),
      src: getText("src"),
      type: getText("type"),
      line
    };
  });
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "codex-geometry-qa" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "codex-geometry-qa" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function readZipEntries(buffer) {
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ZIP end-of-central-directory record not found");

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central-directory record");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer, entry) {
  const offset = entry.localOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local-file record for ${entry.name}`);
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.method === 0) return compressed;
  if (entry.method === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}`);
}

async function readFirstGpxFromZip(zipName) {
  const zipPath = path.join(sourceDownloadDir, zipName);
  const buffer = await fs.readFile(zipPath);
  const entries = readZipEntries(buffer);
  const gpxEntry = entries.find((entry) => entry.name.toLowerCase().endsWith(".gpx"));
  if (!gpxEntry) throw new Error(`No GPX entry found in ${zipPath}`);

  return {
    zipName,
    gpxName: gpxEntry.name,
    routes: parseGpxRoutes(readZipEntry(buffer, gpxEntry).toString("utf8"))
  };
}

function routeAt(source, index, expectedName) {
  const route = source.routes[index];
  if (!route) throw new Error(`Missing route index ${index} in ${source.zipName}`);
  if (expectedName && route.name !== expectedName) {
    throw new Error(
      `Unexpected route at index ${index} in ${source.zipName}: expected ${expectedName}, got ${route.name}`
    );
  }
  if (route.line.length < 2) {
    throw new Error(`Route ${route.name} index ${index} in ${source.zipName} has no usable line`);
  }
  return route;
}

function classifyGeometry({ sourceKind, maxGapMeters, warnings }) {
  const isOfficial =
    sourceKind === "official-luontoon-ogc" ||
    sourceKind === "official-geonorge-turrutebasen-gpx" ||
    sourceKind === "official-mixed-luontoon-geonorge";

  if (isOfficial && maxGapMeters <= 30 && warnings.length === 0) {
    return "high-quality official route-line candidate";
  }
  if (isOfficial && maxGapMeters <= 75) {
    return "official route-line candidate; endpoint policy review required";
  }
  if (isOfficial && maxGapMeters <= 175) {
    return "official route-line candidate; endpoint connector/gap review required";
  }
  if (sourceKind === "e1-gpx-osm-derived" && maxGapMeters <= 50 && warnings.length === 0) {
    return "good planning-grade E1/OSM-derived candidate";
  }
  return "planning-grade candidate; normalization required before import";
}

function buildFeature(section, config, clipped, startProjection, endProjection, warnings) {
  const distanceKm = lineDistanceKm(clipped);
  const maxGapMeters = Math.max(startProjection.gapMeters, endProjection.gapMeters);
  const officialDistance =
    typeof section.distanceKm === "object" ? section.distanceKm.official : section.distanceKm;
  const sourceUrls = config.sourceUrls ?? [config.sourceUrl ?? config.gpxUrl].filter(Boolean);
  const sourceUrl = sourceUrls[0] ?? null;
  const quality = classifyGeometry({ sourceKind: config.sourceKind, maxGapMeters, warnings });

  return {
    type: "Feature",
    properties: {
      schemaVersion: 1,
      trailId: "nordkalottleden",
      sectionId: section.sectionId,
      sectionNumber: section.sectionNumber,
      name: section.name,
      sourceKind: config.sourceKind,
      sourceUrl,
      sourceUrls,
      sourceAccessed: ACCESSED_DATE,
      generatedAt: GENERATED_AT,
      sourceDirection: config.sourceDirection,
      appDirection: config.appDirection,
      officialDistanceKm: officialDistance ?? null,
      geometryDistanceKm: roundNum(distanceKm, 3),
      geometryPointCount: clipped.length,
      endpointSnap: {
        start: {
          selectedEndpointLabel: section.endpointCoordinates.start.label,
          selectedEndpoint: {
            lat: getEndpointCoord(section, "start").lat,
            lon: getEndpointCoord(section, "start").lon
          },
          routeLinePoint: {
            lat: roundNum(startProjection.coord[1], 6),
            lon: roundNum(startProjection.coord[0], 6)
          },
          gapMeters: roundNum(startProjection.gapMeters, 1)
        },
        end: {
          selectedEndpointLabel: section.endpointCoordinates.end.label,
          selectedEndpoint: {
            lat: getEndpointCoord(section, "end").lat,
            lon: getEndpointCoord(section, "end").lon
          },
          routeLinePoint: {
            lat: roundNum(endProjection.coord[1], 6),
            lon: roundNum(endProjection.coord[0], 6)
          },
          gapMeters: roundNum(endProjection.gapMeters, 1)
        }
      },
      maxEndpointGapMeters: roundNum(maxGapMeters, 1),
      quality,
      caveats: config.caveats,
      warnings,
      importReadiness: "research geometry artifact only; not runtime app geometry"
    },
    geometry: {
      type: "LineString",
      coordinates: clipped.map(roundCoord)
    }
  };
}

function compareMeasuresOrReverse(line, startTarget, endTarget) {
  let candidateLine = line;
  let startProjection = nearestProjection(candidateLine, startTarget);
  let endProjection = nearestProjection(candidateLine, endTarget);
  let autoReversed = false;

  if (startProjection.measureKm > endProjection.measureKm) {
    candidateLine = reverseLine(candidateLine);
    startProjection = nearestProjection(candidateLine, startTarget);
    endProjection = nearestProjection(candidateLine, endTarget);
    autoReversed = true;
  }

  return { line: candidateLine, startProjection, endProjection, autoReversed };
}

async function loadSections() {
  const files = (await fs.readdir(sectionDir))
    .filter((file) => file.endsWith(".research.json"))
    .sort();
  const sections = [];
  for (const file of files) {
    const json = JSON.parse(await fs.readFile(path.join(sectionDir, file), "utf8"));
    sections.push({ file, ...json });
  }
  return sections;
}

async function loadLuontoonChains() {
  const luontoon = await fetchJson(LUONTOON_KALOTTIREITTI_URL);
  const feature = luontoon.features?.[0];
  if (!feature) throw new Error("Luontoon OGC response did not contain a feature");
  const lines = feature.geometry.coordinates;

  return {
    metadata: {
      sourceUrl: LUONTOON_KALOTTIREITTI_URL,
      sourceUniqueId: feature.properties.source_unique_id,
      featureName: feature.properties.name_fi ?? feature.properties.name_en,
      reportedLengthKm: feature.properties.length_km,
      lineCount: lines.length
    },
    chains: {
      kilpisjarviToMeekonjarvi: concatLines(reverseLine(lines[10]), reverseLine(lines[12]), reverseLine(lines[14])),
      meekonjarviToSomas: reverseLine(lines[14])
    }
  };
}

function buildRouteMetadata(route, source, notes = []) {
  return {
    sourceZip: path.join("geometry", "source-downloads", source.zipName),
    sourceGpx: source.gpxName,
    routeIndex: route.index,
    routeName: route.name,
    routeComment: route.cmt || null,
    routeSource: route.src || null,
    routeType: route.type || null,
    routePointCount: route.line.length,
    routeMeasuredKm: roundNum(lineDistanceKm(route.line), 3),
    notes
  };
}

async function loadTurrutebasenChains(luontoon) {
  const nordreisa = await readFirstGpxFromZip(TURRUTEBASEN_ZIPS.nordreisa);
  const kautokeino = await readFirstGpxFromZip(TURRUTEBASEN_ZIPS.kautokeino);

  const nordreisaFin5Connector = routeAt(nordreisa, 25, "fin5");
  const nordreisaFin5Main = routeAt(nordreisa, 26, "fin5");
  const oviToSieimma = routeAt(nordreisa, 6, "F_20170508_17");
  const nordreisaFin4 = routeAt(nordreisa, 29, "fin4");
  const nordreisaE1 = routeAt(nordreisa, 40, "E1");
  const kautokeinoE1 = routeAt(kautokeino, 4, "E1");

  const luontoonSomasEnd = luontoon.chains.meekonjarviToSomas.at(-1);
  const nordreisaFin5BoundaryEnd = nordreisaFin5Main.line.at(-1);
  const mixedBoundaryGapMeters = roundNum(
    haversineKm(luontoonSomasEnd, nordreisaFin5BoundaryEnd) * 1000,
    1
  );

  return {
    metadata: {
      metadataUrl: GEONORGE_TURRUTEBASEN_METADATA_URL,
      capabilitiesUrl: GEONORGE_TURRUTEBASEN_CAPABILITIES_URL,
      metadataUuid: GEONORGE_TURRUTEBASEN_UUID,
      accessedDate: ACCESSED_DATE,
      sourceZips: [
        path.join("geometry", "source-downloads", TURRUTEBASEN_ZIPS.nordreisa),
        path.join("geometry", "source-downloads", TURRUTEBASEN_ZIPS.kautokeino)
      ],
      note:
        "GPX extracts were ordered from Geonorge Nedlasting API for Nordreisa (5544) and Guovdageaidnu/Kautokeino (5612), WGS84 GPX."
    },
    chains: {
      kopmajokiToSomashytta: concatLines(
        luontoon.chains.meekonjarviToSomas,
        reverseLine(nordreisaFin5Main.line)
      ),
      somashyttaToSaraelv: concatLines(
        reverseLine(nordreisaFin5Main.line),
        nordreisaFin5Connector.line
      ),
      oviRaishiinToSieimma: oviToSieimma.line,
      sieimmaToNedrefoss: reverseLine(nordreisaFin4.line),
      nedrefossToReisavannhytta: reverseLine(nordreisaE1.line),
      reisavannhyttaToCunovuohppi: concatLines(reverseLine(nordreisaE1.line), kautokeinoE1.line),
      cunovuohppiToKautokeino: kautokeinoE1.line
    },
    chainMetadata: {
      kopmajokiToSomashytta: {
        sourceParts: [
          {
            source: "Luontoon/Metsähallitus OGC",
            sourceUrl: LUONTOON_KALOTTIREITTI_URL,
            chain: "meekonjarviToSomas"
          },
          buildRouteMetadata(nordreisaFin5Main, nordreisa, [
            "Reversed for the Norway-side boundary-to-Somashytta portion."
          ])
        ],
        sourceJunctionGapsMeters: [
          {
            from: "Luontoon Somas-side official line endpoint",
            to: "Turrutebasen fin5 Norway-side boundary endpoint",
            gapMeters: mixedBoundaryGapMeters
          }
        ]
      },
      somashyttaToSaraelv: {
        sourceParts: [
          buildRouteMetadata(nordreisaFin5Main, nordreisa, [
            "Reversed and clipped from Somashytta toward the Saraelv connector."
          ]),
          buildRouteMetadata(nordreisaFin5Connector, nordreisa, [
            "Saraelv connector segment appended to reach the selected road/trail endpoint."
          ])
        ]
      },
      oviRaishiinToSieimma: {
        sourceParts: [buildRouteMetadata(oviToSieimma, nordreisa)]
      },
      sieimmaToNedrefoss: {
        sourceParts: [
          buildRouteMetadata(nordreisaFin4, nordreisa, ["Reversed to match section order."])
        ]
      },
      nedrefossToReisavannhytta: {
        sourceParts: [
          buildRouteMetadata(nordreisaE1, nordreisa, [
            "Reversed and clipped from a longer E1 route object."
          ])
        ]
      },
      reisavannhyttaToCunovuohppi: {
        sourceParts: [
          buildRouteMetadata(nordreisaE1, nordreisa, [
            "Reversed for the Reisavannhytta-to-municipal-boundary portion."
          ]),
          buildRouteMetadata(kautokeinoE1, kautokeino, [
            "Clipped from the Nordreisa-Kautokeino boundary toward Čunovuohppi."
          ])
        ]
      },
      cunovuohppiToKautokeino: {
        sourceParts: [
          buildRouteMetadata(kautokeinoE1, kautokeino, [
            "Clipped from a longer E1 route object through Čunovuohppi and Kautokeino."
          ])
        ]
      }
    }
  };
}

async function lineForSection(config, luontoon, turrutebasen) {
  if (config.sourceKind === "official-luontoon-ogc") {
    return {
      line: luontoon.chains[config.chain],
      sourceMetadata: luontoon.metadata
    };
  }

  if (
    config.sourceKind === "official-geonorge-turrutebasen-gpx" ||
    config.sourceKind === "official-mixed-luontoon-geonorge"
  ) {
    return {
      line: turrutebasen.chains[config.chain],
      sourceMetadata: turrutebasen.chainMetadata[config.chain]
    };
  }

  const gpx = parseGpx(await fetchText(config.gpxUrl));
  return {
    line: config.reverseGpx ? reverseLine(gpx) : gpx,
    sourceMetadata: {
      sourceUrl: config.gpxUrl,
      sourceDirection: config.sourceDirection,
      gpxPointCount: gpx.length,
      gpxMeasuredKm: roundNum(lineDistanceKm(gpx), 3)
    }
  };
}

async function main() {
  await fs.mkdir(geometrySectionDir, { recursive: true });

  const sections = await loadSections();
  const luontoon = await loadLuontoonChains();
  const turrutebasen = await loadTurrutebasenChains(luontoon);
  const report = {
    schemaVersion: 1,
    trailId: "nordkalottleden",
    generatedAt: GENERATED_AT,
    accessedDate: ACCESSED_DATE,
    purpose:
      "Research-only candidate geometry artifacts and QA metrics. These files do not integrate Nordkalottleden into runtime app data.",
    sourcePolicy:
      "Prefer official Luontoon/Metsähallitus OGC linework for the Finnish section and official Kartverket/Geonorge Turrutebasen GPX linework for Norwegian sections. Use mixed official Luontoon + Turrutebasen linework for the cross-border Kopmajoki-Somashytta section. Do not create synthetic hut-yard, town-centre, private-road or access connectors.",
    artifacts: [],
    summary: {
      sectionCount: sections.length,
      artifactCount: 0,
      officialLuontoonArtifacts: 0,
      officialGeonorgeArtifacts: 0,
      officialMixedArtifacts: 0,
      e1OsmArtifacts: 0,
      maxEndpointGapMeters: 0,
      maxInterSectionGapMeters: 0,
      sectionsRequiringConnectorOrEndpointPolicy: []
    },
    luontoonSource: luontoon.metadata,
    turrutebasenSource: turrutebasen.metadata
  };

  const collectionFeatures = [];

  for (const section of sections) {
    const config = CONFIG[section.sectionId];
    if (!config) throw new Error(`Missing geometry config for ${section.sectionId}`);

    const { line, sourceMetadata } = await lineForSection(config, luontoon, turrutebasen);
    const startTarget = getEndpointCoord(section, "start");
    const endTarget = getEndpointCoord(section, "end");
    const warnings = [];
    const { line: orderedLine, startProjection, endProjection, autoReversed } =
      compareMeasuresOrReverse(line, startTarget, endTarget);
    if (autoReversed) warnings.push("line order was auto-reversed during clipping");
    if (startProjection.gapMeters > 50) warnings.push("start endpoint gap exceeds 50 m");
    if (endProjection.gapMeters > 50) warnings.push("end endpoint gap exceeds 50 m");
    if (startProjection.gapMeters > 150 || endProjection.gapMeters > 150) {
      warnings.push("endpoint connector or endpoint-policy decision required before navigation-grade import");
    }

    const clipped = sliceByMeasures(orderedLine, startProjection, endProjection);
    const feature = buildFeature(section, config, clipped, startProjection, endProjection, warnings);
    feature.properties.sourceMetadata = sourceMetadata;

    const artifactPath = path.join(geometrySectionDir, `${section.sectionId}.geojson`);
    await fs.writeFile(
      artifactPath,
      `${JSON.stringify({ type: "FeatureCollection", features: [feature] }, null, 2)}\n`
    );

    collectionFeatures.push(feature);

    const artifact = {
      sectionId: section.sectionId,
      sectionNumber: section.sectionNumber,
      path: path.relative(rootDir, artifactPath),
      sourceKind: feature.properties.sourceKind,
      geometryDistanceKm: feature.properties.geometryDistanceKm,
      officialDistanceKm: feature.properties.officialDistanceKm,
      pointCount: feature.properties.geometryPointCount,
      startGapMeters: feature.properties.endpointSnap.start.gapMeters,
      endGapMeters: feature.properties.endpointSnap.end.gapMeters,
      maxEndpointGapMeters: feature.properties.maxEndpointGapMeters,
      quality: feature.properties.quality,
      warnings,
      caveats: feature.properties.caveats
    };

    report.artifacts.push(artifact);
    report.summary.artifactCount += 1;
    if (config.sourceKind === "official-luontoon-ogc") report.summary.officialLuontoonArtifacts += 1;
    if (config.sourceKind === "official-geonorge-turrutebasen-gpx") {
      report.summary.officialGeonorgeArtifacts += 1;
    }
    if (config.sourceKind === "official-mixed-luontoon-geonorge") {
      report.summary.officialMixedArtifacts += 1;
    }
    if (config.sourceKind === "e1-gpx-osm-derived") report.summary.e1OsmArtifacts += 1;
    report.summary.maxEndpointGapMeters = Math.max(
      report.summary.maxEndpointGapMeters,
      feature.properties.maxEndpointGapMeters
    );
    if (warnings.length > 0) report.summary.sectionsRequiringConnectorOrEndpointPolicy.push(section.sectionId);
  }

  report.interSectionContinuity = [];
  const orderedFeatures = [...collectionFeatures].sort(
    (a, b) => a.properties.sectionNumber - b.properties.sectionNumber
  );
  for (let i = 1; i < orderedFeatures.length; i += 1) {
    const previous = orderedFeatures[i - 1];
    const current = orderedFeatures[i];
    const previousEnd = previous.geometry.coordinates.at(-1);
    const currentStart = current.geometry.coordinates[0];
    const gapMeters = roundNum(haversineKm(previousEnd, currentStart) * 1000, 1);
    const continuity = {
      fromSectionId: previous.properties.sectionId,
      toSectionId: current.properties.sectionId,
      fromSectionNumber: previous.properties.sectionNumber,
      toSectionNumber: current.properties.sectionNumber,
      gapMeters,
      status:
        gapMeters > 50
          ? "inter-section connector or endpoint policy required"
          : "continuous within QA threshold"
    };
    report.interSectionContinuity.push(continuity);
    report.summary.maxInterSectionGapMeters = Math.max(
      report.summary.maxInterSectionGapMeters,
      gapMeters
    );
    if (gapMeters > 50) {
      report.summary.sectionsRequiringConnectorOrEndpointPolicy.push(current.properties.sectionId);
    }
  }
  report.summary.sectionsRequiringConnectorOrEndpointPolicy = [
    ...new Set(report.summary.sectionsRequiringConnectorOrEndpointPolicy)
  ];

  await fs.writeFile(
    path.join(geometryDir, "all-sections.geojson"),
    `${JSON.stringify({ type: "FeatureCollection", features: collectionFeatures }, null, 2)}\n`
  );
  await fs.writeFile(
    path.join(geometryDir, "geometry-quality-report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  console.log(
    JSON.stringify(
      {
        artifactCount: report.summary.artifactCount,
        officialLuontoonArtifacts: report.summary.officialLuontoonArtifacts,
        officialGeonorgeArtifacts: report.summary.officialGeonorgeArtifacts,
        officialMixedArtifacts: report.summary.officialMixedArtifacts,
        e1OsmArtifacts: report.summary.e1OsmArtifacts,
        maxEndpointGapMeters: roundNum(report.summary.maxEndpointGapMeters, 1),
        maxInterSectionGapMeters: roundNum(report.summary.maxInterSectionGapMeters, 1),
        sectionsRequiringConnectorOrEndpointPolicy:
          report.summary.sectionsRequiringConnectorOrEndpointPolicy
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
