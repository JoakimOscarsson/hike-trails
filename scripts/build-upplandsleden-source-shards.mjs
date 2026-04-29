import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { writeTrailSystemSourceShards } from "./lib/hiking-source-shards.mjs";

const REPO_ROOT = process.cwd();
const TRAIL_ID = "upplandsleden";
const LAST_FETCHED_AT = "2026-04-29";
const RESEARCH_DIR = path.join(
  REPO_ROOT,
  "data",
  "research",
  "candidate-trails",
  TRAIL_ID,
);
const SECTION_RESEARCH_DIR = path.join(RESEARCH_DIR, "sections");
const SOURCE_DIR = path.join(REPO_ROOT, "data", "source", "hiking", TRAIL_ID);
const SOURCE_SECTIONS_DIR = path.join(SOURCE_DIR, "sections");
const PUBLIC_ROUTE_DIR = path.join(
  REPO_ROOT,
  "public",
  "routes",
  "hiking",
  TRAIL_ID,
  "sections",
);
const PUBLIC_ROUTE_PREFIX = `/routes/hiking/${TRAIL_ID}/sections`;
const checkOnly = process.argv.includes("--check");

const SUPPORTED_FACILITY_TYPES = new Set([
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
  "service",
]);

const SPECIAL_SECTION_IDS = [
  "upplandsleden-stockholms-lan",
  "upplandsleden-etapp-1-2-knivsta-forsbyan",
  "upplandsleden-etapp-1-1-lunsentorpet-knivsta",
];

const MAINLINE_GROUPS = [
  {
    id: "upplandsleden-stockholm-county",
    name: "Stockholm County part",
    sectionIds: ["upplandsleden-stockholms-lan"],
    notice:
      "Stockholm County Upplandsleden is kept in the same trail system, but the Sigtuna-Forsbyan gap is a known long-standing discontinuity before the Uppsala County network.",
  },
  {
    id: "upplandsleden-uppsala-east",
    name: "Sunnersta to Langhall",
    sectionIds: [
      "upplandsleden-etapp-1-sunnersta-nyby",
      "upplandsleden-etapp-2-nyby-fjallnora",
      "upplandsleden-etapp-3-fjallnora-lanna",
      "upplandsleden-etapp-4-lanna-almunge",
      "upplandsleden-etapp-5-almunge-sodersjon",
      "upplandsleden-etapp-6-sodersjon-knutby",
      "upplandsleden-etapp-7-knutby-bennebol",
      "upplandsleden-etapp-8-bennebol-pansarudden",
      "upplandsleden-etapp-9-pansarudden-kolarmora",
      "upplandsleden-etapp-10-kolarmora-gimo",
      "upplandsleden-etapp-11-gimo-osterbybruk",
      "upplandsleden-etapp-12-osterbybruk-rison",
      "upplandsleden-etapp-13-rison-lovstabruk",
      "upplandsleden-etapp-14-lovstabruk-vastland",
      "upplandsleden-etapp-15-vastland-marma",
      "upplandsleden-etapp-16-marma-alvkarleby",
      "upplandsleden-etapp-17-alvkarleby-langhall",
    ],
    notice:
      "Main Uppsala County sequence from Sunnersta to Langhall. Use the post-Sigtuna connector group for the Forsbyan-Knivsta-Lunsentorpet approach, and treat Etapp 10's active maintenance warning as current planning context.",
  },
  {
    id: "upplandsleden-gysinge-osta",
    name: "Gysinge, Skekarsbo and Osta branch",
    sectionIds: [
      "upplandsleden-etapp-18-skekarsbo-gysinge",
      "upplandsleden-etapp-19-skekarsbo-nora-kyrka",
      "upplandsleden-etapp-20-nora-kyrka-osta",
    ],
    notice:
      "Western/northern branch around Gysinge, Skekarsbo, Nora kyrka/Tarnsjo and Osta. Some official GPX files are stored opposite the narrative walking direction, so follow the section map rather than assuming catalog direction means walking direction.",
  },
  {
    id: "upplandsleden-siggefora-sanka",
    name: "Siggefora to Sanka",
    sectionIds: [
      "upplandsleden-etapp-21-siggeforasjon-tenasjon",
      "upplandsleden-etapp-22-tenasjon-skattmansoadalen",
      "upplandsleden-etapp-23-skattmansoadalen-harnevi-ip",
      "upplandsleden-etapp-24-harnevi-ip-gansta",
      "upplandsleden-etapp-25-gansta-boglosa",
      "upplandsleden-etapp-26-boglosa-lillkyrka",
      "upplandsleden-etapp-27-lillkyrka-veckholm",
      "upplandsleden-etapp-28-veckholm-harjaro",
      "upplandsleden-etapp-29-balsta-haggeby",
      "upplandsleden-etapp-30-haggeby-skokloster",
      "upplandsleden-etapp-31-skokloster-sanka",
    ],
    notice:
      "Southern/western Upplandsleden sequence from Siggefora through Enkoping and Skokloster to Sanka. It is separated from Etapp 20 in this import because Etapp 20:1-20:3 are not yet normalized as source shards.",
  },
];

const LOOP_CONNECTIONS = {
  "upplandsleden-slinga-2-1": ["upplandsleden-etapp-2-nyby-fjallnora"],
  "upplandsleden-slinga-3-1": ["upplandsleden-etapp-3-fjallnora-lanna"],
  "upplandsleden-slinga-11-1": ["upplandsleden-etapp-11-gimo-osterbybruk"],
  "upplandsleden-slinga-12-1": ["upplandsleden-etapp-12-osterbybruk-rison"],
  "upplandsleden-slinga-12-2": ["upplandsleden-etapp-12-osterbybruk-rison"],
  "upplandsleden-slinga-21-1": [
    "upplandsleden-etapp-21-siggeforasjon-tenasjon",
  ],
  "upplandsleden-slinga-23-1": [
    "upplandsleden-etapp-23-skattmansoadalen-harnevi-ip",
  ],
  "upplandsleden-slinga-24-1": ["upplandsleden-etapp-24-harnevi-ip-gansta"],
  "upplandsleden-slinga-25-1": ["upplandsleden-etapp-25-gansta-boglosa"],
  "upplandsleden-slinga-28-1": ["upplandsleden-etapp-28-veckholm-harjaro"],
  "upplandsleden-slinga-29-1": ["upplandsleden-etapp-29-balsta-haggeby"],
  "upplandsleden-slinga-30-1": ["upplandsleden-etapp-30-haggeby-skokloster"],
  "upplandsleden-slinga-31-1": ["upplandsleden-etapp-31-skokloster-sanka"],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function round(value, decimals = 6) {
  return Number(value.toFixed(decimals));
}

function roundDistance(value) {
  return Number(value.toFixed(1));
}

function roundLatLon(coordinates) {
  if (!Array.isArray(coordinates)) return null;
  const [lat, lon] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [round(lat), round(lon)];
}

function lonLatFromLatLon(coordinates) {
  const rounded = roundLatLon(coordinates);
  return rounded ? [rounded[1], rounded[0]] : null;
}

function latLonFromLonLat(coordinates) {
  if (!Array.isArray(coordinates)) return null;
  const [lon, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [round(lat), round(lon)];
}

function haversineKmLatLon(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Infinity;
  const toRad = (value) => (value * Math.PI) / 180;
  const radiusKm = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const value =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * radiusKm * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function haversineKmLonLat(a, b) {
  return haversineKmLatLon(latLonFromLonLat(a), latLonFromLonLat(b));
}

async function fetchTextWithRetry(url, retries = 4) {
  const errors = [];
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (response.ok) return response.text();
      errors.push(`${response.status} ${response.statusText}`.trim());
    } catch (error) {
      errors.push(error.message);
    }
    if (attempt < retries) await sleep(750 * attempt);
  }
  throw new Error(`Failed to fetch ${url}: ${errors.join("; ")}`);
}

function parseGpxLines(gpxText) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const gpx = parser.parse(gpxText).gpx;
  const lines = [];
  for (const track of asArray(gpx?.trk)) {
    for (const segment of asArray(track.trkseg)) {
      const coordinates = asArray(segment.trkpt)
        .map((point) => [
          Number(point["@_lon"] ?? point.lon),
          Number(point["@_lat"] ?? point.lat),
        ])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
      if (coordinates.length >= 2)
        lines.push({ name: track.name, coordinates });
    }
  }
  return lines;
}

function shouldReverseLines(lines, targetStart, targetEnd) {
  if (!lines.length || !targetStart || !targetEnd) return false;
  const first = latLonFromLonLat(lines[0].coordinates[0]);
  const lastLine = lines[lines.length - 1].coordinates;
  const last = latLonFromLonLat(lastLine[lastLine.length - 1]);
  const direct =
    haversineKmLatLon(first, targetStart) + haversineKmLatLon(last, targetEnd);
  const reversed =
    haversineKmLatLon(last, targetStart) + haversineKmLatLon(first, targetEnd);
  return reversed + 0.05 < direct;
}

function splitLineOnGaps(line, thresholdMeters) {
  const splitLines = [];
  let current = [];
  for (const coordinate of line) {
    const previous = current[current.length - 1];
    if (
      previous &&
      haversineKmLonLat(previous, coordinate) * 1000 > thresholdMeters
    ) {
      if (current.length >= 2) splitLines.push(current);
      current = [];
    }
    current.push(coordinate);
  }
  if (current.length >= 2) splitLines.push(current);
  return splitLines;
}

function featureCollectionFromGpx(
  gpxText,
  { name, targetStart, targetEnd, splitGapMeters = 500 },
) {
  let lines = parseGpxLines(gpxText);
  if (shouldReverseLines(lines, targetStart, targetEnd)) {
    lines = lines
      .slice()
      .reverse()
      .map((line) => ({
        ...line,
        coordinates: line.coordinates.slice().reverse(),
      }));
  }

  const features = lines.flatMap((line, lineIndex) =>
    splitLineOnGaps(line.coordinates, splitGapMeters).map(
      (coordinates, splitIndex) => ({
        type: "Feature",
        properties: { name, segment: lineIndex + 1, split: splitIndex + 1 },
        geometry: { type: "LineString", coordinates },
      }),
    ),
  );

  return {
    type: "FeatureCollection",
    features,
  };
}

function featureCollectionCoordinates(featureCollection) {
  return (featureCollection.features ?? []).flatMap(
    (feature) => feature.geometry?.coordinates ?? [],
  );
}

function bboxCenterFromLonLat(coordinates) {
  const latitudes = coordinates.map(([, lat]) => lat);
  const longitudes = coordinates.map(([lon]) => lon);
  return [
    round((Math.min(...latitudes) + Math.max(...latitudes)) / 2, 5),
    round((Math.min(...longitudes) + Math.max(...longitudes)) / 2, 5),
  ];
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function textList(...values) {
  return values.flatMap((value) => {
    if (!value) return [];
    if (Array.isArray(value))
      return value.filter((item) => typeof item === "string" && item.trim());
    if (typeof value === "string" && value.trim()) return [value];
    return [];
  });
}

function sourceProviderFromUrl(url) {
  if (typeof url !== "string") return "Upplandsleden";
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("naturkartan")) return "Naturkartan";
    if (hostname.includes("upplandsstiftelsen")) return "Upplandsstiftelsen";
    if (hostname.includes("lansstyrelsen")) return "Lansstyrelsen";
    if (hostname.includes("openstreetmap")) return "OpenStreetMap";
    if (hostname.includes("ul.se")) return "UL";
    if (hostname.includes("tierp.se")) return "Tierp kommun";
    if (hostname.includes("enkoping.se")) return "Enkopings kommun";
    if (hostname.includes("jarfalla.se")) return "Jarfalla kommun";
    return hostname;
  } catch {
    return "Upplandsleden";
  }
}

function sourceUrlFromKey(packet, sourceKey) {
  const source = packet.sources?.[sourceKey];
  if (typeof source === "string") return source;
  if (source && typeof source === "object" && typeof source.url === "string")
    return source.url;
  return null;
}

function sourceForRow(packet, row, fallbackUrl) {
  const direct =
    row.source?.url ?? (typeof row.source === "string" ? row.source : null);
  const keyed = asArray(row.sources)
    .map((sourceKey) => sourceUrlFromKey(packet, sourceKey))
    .find(Boolean);
  const url = direct ?? keyed ?? fallbackUrl;
  return {
    provider: sourceProviderFromUrl(url),
    url,
    lastFetchedAt: LAST_FETCHED_AT,
  };
}

function rowText(row) {
  return [
    row.id,
    row.name,
    row.type,
    row.notes,
    row.description,
    row.caveat,
    row.importCaveat,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isInformalTenting(row) {
  const text = rowText(row);
  if (/\bcamping\b/.test(text) || /camping\/badplats/.test(text)) return false;
  return /informal|possible tent|primitive tent|tolerated|möjlig tält|tältmöjlighet|tältbar|tältning vid|tenting possible|possible nearby/.test(
    text,
  );
}

function isNegativeTransit(row) {
  return /ingen buss|no bus|no car|no numbered|gap|handoff|ej direkt|inget/.test(
    rowText(row),
  );
}

function isWarningLike(row) {
  return /warning|varning|unsafe|non-potable|ej tjänligt|no water|no-water|closure|removed|avbrott|gap|reroute|underhåll|maintenance|rules|föreskrift|fire ban|eldnings|no car|ingen buss|current|gpx|discontinuity/.test(
    rowText(row),
  );
}

function isLeakageOrDuplicate(row) {
  return /leakage|overlap|dedupe|duplicate|already handled|folded into|not .* route point|do not import|suppress .* separate|neighbor|neighbour|metadata only|context only|route metadata only/.test(
    rowText(row),
  );
}

function normalizedPromotionType(row, bucket) {
  if (row.type === "route_metadata")
    return isWarningLike(row) ? "rule-warning" : null;
  if (row.type === "water" && isWarningLike(row)) return "rule-warning";
  if (row.type === "transit" && isNegativeTransit(row)) return "rule-warning";
  if (row.type === "campsite" && isInformalTenting(row)) return "camping";
  if (SUPPORTED_FACILITY_TYPES.has(row.type)) return row.type;
  return bucket === "suppressions" && isWarningLike(row)
    ? "rule-warning"
    : null;
}

function shouldPromoteRow(row, bucket) {
  const type = normalizedPromotionType(row, bucket);
  const hasCoords = Boolean(roundLatLon(row.coords ?? row.coordinates));
  if (!type) return false;
  if (bucket === "importRows") return true;
  if (bucket === "pending") return type === "rule-warning" || hasCoords;
  if (type === "rule-warning") return true;
  if (["parking", "transit"].includes(type))
    return hasCoords && !isNegativeTransit(row);
  if (type === "food") return hasCoords;
  if (["heritage", "attraction"].includes(type))
    return hasCoords && !isLeakageOrDuplicate(row);
  return false;
}

function routeProximityForRow(row, hasCoordinates) {
  if (!hasCoordinates) return undefined;
  const raw = row.routeProximity;
  if (raw && typeof raw === "object") {
    const alternateMeters = Number(raw.alternateGpxDistanceMetersApprox);
    if (Number.isFinite(alternateMeters)) {
      return {
        status: "on-route",
        distanceKm: round(alternateMeters / 1000, 3),
        thresholdKm: Number.isFinite(raw.thresholdKm) ? raw.thresholdKm : 2,
        ...(raw.note ? { note: raw.note } : {}),
      };
    }
    if (typeof raw.status === "string") {
      return {
        status: raw.status,
        ...(Number.isFinite(raw.distanceKm)
          ? { distanceKm: raw.distanceKm }
          : {}),
        thresholdKm: Number.isFinite(raw.thresholdKm) ? raw.thresholdKm : 2,
        ...(raw.note ? { note: raw.note } : {}),
      };
    }
  }

  const meters = Number(
    row.routeProximityMeters ??
      row.routeProximityMetersApprox ??
      row.proximityMetersApprox ??
      row.nearestOfficialRouteDistanceMeters,
  );
  if (Number.isFinite(meters)) {
    return {
      status: meters <= 200 ? "on-route" : "unknown",
      distanceKm: round(meters / 1000, 3),
      thresholdKm: 2,
    };
  }

  return { status: "unknown", thresholdKm: 2 };
}

function descriptionForRow(row, type, origin) {
  const parts = textList(
    row.description,
    row.notes,
    row.caveat,
    row.importCaveat,
  );
  if (origin === "promoted-suppression") {
    parts.push(
      "Promoted during Upplandsleden normalization from a suppression row under the current app policy.",
    );
  } else if (origin === "promoted-pending") {
    parts.push(
      "Promoted during Upplandsleden normalization from a pending row under the current app policy.",
    );
  }
  if (type === "camping")
    parts.push("Informal/tolerated tenting, not a managed campsite.");
  return parts.join(" ") || `${row.name}.`;
}

function facilityFromRow(packet, row, sectionId, bucket, fallbackSourceUrl) {
  const type = normalizedPromotionType(row, bucket);
  if (!type || !shouldPromoteRow(row, bucket)) return null;
  const coordinates = roundLatLon(row.coords ?? row.coordinates);
  const origin =
    bucket === "importRows"
      ? "import-row"
      : bucket === "pending"
        ? "promoted-pending"
        : "promoted-suppression";
  return {
    id: row.id,
    name: row.name,
    type,
    sectionId,
    ...(coordinates ? { coordinates } : {}),
    description: descriptionForRow(row, type, origin),
    ...(routeProximityForRow(row, Boolean(coordinates))
      ? { routeProximity: routeProximityForRow(row, Boolean(coordinates)) }
      : {}),
    source: sourceForRow(packet, row, fallbackSourceUrl),
    _origin: origin,
  };
}

function facilityFromPreviewRow(section, previewRow, fallbackSourceUrl) {
  const coordinates = roundLatLon(previewRow.coords ?? previewRow.coordinates);
  const type =
    previewRow.type === "campsite" && isInformalTenting(previewRow)
      ? "camping"
      : previewRow.type;
  if (!SUPPORTED_FACILITY_TYPES.has(type) || !coordinates) return null;
  const meters = Number(previewRow.routeProximityMeters);
  return {
    id: previewRow.sourceResearchId,
    name: previewRow.name,
    type,
    sectionId: section.id,
    coordinates,
    description:
      textList(previewRow.notes, previewRow.caveat).join(" ") ||
      `${previewRow.name}.`,
    routeProximity: Number.isFinite(meters)
      ? {
          status: meters <= 200 ? "on-route" : "unknown",
          distanceKm: round(meters / 1000, 3),
          thresholdKm: 2,
        }
      : { status: "unknown", thresholdKm: 2 },
    source: {
      provider: sourceProviderFromUrl(fallbackSourceUrl),
      url: fallbackSourceUrl,
      lastFetchedAt: LAST_FETCHED_AT,
    },
    _origin: "embedded-preview",
  };
}

function stripFacilityPrefix(name) {
  return String(name ?? "")
    .replace(
      /^(parkering|busshållplats|vatten|toalett|torrtoalett|eldstad|eldplats|grillplats|rastplats|badplats|vindskydd|tältplats|handpump|café|cafe|service|restaurang|minilivs)[,:]?\s+/i,
      "",
    )
    .trim();
}

function canonicalFacilityKey(facility) {
  if (!facility.coordinates) return null;
  const [lat, lon] = facility.coordinates;
  const place = slugify(stripFacilityPrefix(facility.name));
  return `${facility.type}:${lat.toFixed(4)}:${lon.toFixed(4)}:${place}`;
}

function dedupeFacilityIds(sections) {
  const groups = new Map();
  for (const section of sections) {
    for (const facility of section.facilities) {
      const key = canonicalFacilityKey(facility);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(facility);
    }
  }

  let deduped = 0;
  for (const facilities of groups.values()) {
    if (facilities.length < 2) continue;
    const canonicalId = facilities
      .map((facility) => facility.id)
      .sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
    for (const facility of facilities) {
      if (facility.id !== canonicalId) {
        facility.id = canonicalId;
        deduped += 1;
      }
    }
  }
  return deduped;
}

function removeInternalFields(sections) {
  for (const section of sections) {
    for (const facility of section.facilities) {
      delete facility._origin;
    }
  }
}

function fallbackSourceUrl(packet) {
  return (
    packet.mapdata?.officialPageUrl ??
    packet.mapdata?.upplandsstiftelsenPageUrl ??
    "https://www.upplandsstiftelsen.se/hitta-ut/vandra/upplandsleden/"
  );
}

function sectionTargetEndpoints(packet, specialRouteFlow) {
  if (specialRouteFlow) return specialRouteFlow;
  const start = roundLatLon(
    packet.mapdata?.start ?? packet.routeGeometryDraft?.start?.coords,
  );
  const end = roundLatLon(
    packet.mapdata?.end ?? packet.routeGeometryDraft?.end?.coords,
  );
  return { start, end };
}

function sectionDistance(packet) {
  const official = Number(
    packet.section?.officialDistanceKm ??
      packet.section?.distanceKm ??
      packet.distanceKm ??
      packet.mapdata?.officialDistanceKm,
  );
  const computed = Number(
    packet.mapdata?.computedDistanceKm ??
      packet.mapdata?.distanceKm ??
      packet.routeGeometryDraft?.distanceKmComputedFromGpx,
  );
  if (
    Number.isFinite(official) &&
    Number.isFinite(computed) &&
    Math.abs(computed - official) >= 3 &&
    (computed / official > 1.3 || computed / official < 0.7)
  ) {
    return roundDistance(computed);
  }
  return roundDistance(
    Number(
      packet.section?.officialDistanceKm ??
        packet.section?.distanceKm ??
        packet.distanceKm ??
        packet.mapdata?.officialDistanceKm ??
        packet.mapdata?.distanceKm ??
        packet.mapdata?.computedDistanceKm ??
        packet.routeGeometryDraft?.naturkartanListedDistanceKm ??
        packet.routeGeometryDraft?.distanceKmComputedFromGpx,
    ),
  );
}

function sectionOfficialId(packet) {
  const match = packet.id.match(/etapp-(\d+)(?:-(\d+))?|slinga-(\d+)-(\d+)/);
  if (packet.section?.officialId) return packet.section.officialId;
  if (packet.id === "upplandsleden-stockholms-lan") return "Stockholm";
  if (match?.[1] && match?.[2]) return `${match[1]}:${match[2]}`;
  if (match?.[1]) return match[1];
  if (match?.[3] && match?.[4]) return `${match[3]}:${match[4]}`;
  return packet.id;
}

function sectionName(packet, from, to) {
  const officialId = sectionOfficialId(packet);
  if (packet.id === "upplandsleden-stockholms-lan")
    return "Stockholm County: Barkarby to Sigtuna";
  if (packet.section?.type === "loop")
    return `Slinga ${officialId}: ${packet.section.name}`;
  if (String(officialId).includes(":"))
    return `Etapp ${officialId}: ${from} to ${to}`;
  return `Etapp ${officialId}: ${from} to ${to}`;
}

function sectionDescription(packet) {
  const routeCaveat =
    packet.id === "upplandsleden-stockholms-lan"
      ? "Stockholm County part of Upplandsleden; the trail currently has a known discontinuity before Forsbyan and the Uppsala County network."
      : packet.section?.type === "loop"
        ? `Official Upplandsleden loop ${packet.section.officialId ?? ""} around ${packet.section.name}.`
        : (packet.section?.name ??
          packet.name ??
          packet.sourceRouteName ??
          "Upplandsleden section.");
  return {
    short: routeCaveat,
    ...(packet.section?.notes || packet.routeShape
      ? { long: textList(packet.section?.notes, packet.routeShape).join(" ") }
      : {}),
  };
}

function buildFacilitiesForPacket(packet, sectionId) {
  const sourceUrl = fallbackSourceUrl(packet);
  if (Array.isArray(packet.appImportPreviewDraft)) {
    return packet.appImportPreviewDraft
      .map((row) => facilityFromPreviewRow(packet, row, sourceUrl))
      .filter(Boolean);
  }
  return [
    ...(packet.importRows ?? []).map((row) =>
      facilityFromRow(packet, row, sectionId, "importRows", sourceUrl),
    ),
    ...(packet.pending ?? []).map((row) =>
      facilityFromRow(packet, row, sectionId, "pending", sourceUrl),
    ),
    ...(packet.suppressions ?? []).map((row) =>
      facilityFromRow(packet, row, sectionId, "suppressions", sourceUrl),
    ),
  ].filter(Boolean);
}

function packetRouteUrl(packet) {
  return packet.mapdata?.gpxUrl ?? packet.routeGeometryDraft?.gpxUrl;
}

async function buildRoute(packet, name, targetEndpoints) {
  const gpxUrl = packetRouteUrl(packet);
  if (!gpxUrl)
    return {
      route: { status: "marker-only" },
      endpointCoordinates: undefined,
      routeFeatureCollection: null,
    };
  let gpxText;
  try {
    gpxText = await fetchTextWithRetry(gpxUrl);
  } catch (error) {
    return {
      endpointCoordinates: {
        source:
          targetEndpoints.start || targetEndpoints.end
            ? "approximate"
            : "route-geometry",
        ...(targetEndpoints.start ? { start: targetEndpoints.start } : {}),
        ...(targetEndpoints.end ? { end: targetEndpoints.end } : {}),
      },
      route: {
        status: "missing-gpx",
        sourceFormat: "gpx",
        gpxUrl,
      },
      routeFeatureCollection: null,
      routeFetchWarning: error.message,
    };
  }
  const splitGapMeters = Math.min(
    500,
    Number(
      packet.mapdata?.finalQa?.maxGapMeters ??
        packet.mapdata?.maxGapMeters ??
        500,
    ),
  );
  const routeFeatureCollection = featureCollectionFromGpx(gpxText, {
    name,
    targetStart: targetEndpoints.start,
    targetEnd: targetEndpoints.end,
    splitGapMeters: Number.isFinite(splitGapMeters) ? splitGapMeters : 500,
  });
  if (!routeFeatureCollection.features.length)
    throw new Error(`${packet.id} GPX did not produce route features`);
  const routePath = `${PUBLIC_ROUTE_PREFIX}/${packet.id}.geojson`;
  return {
    endpointCoordinates: {
      source: "route-geometry",
      ...(targetEndpoints.start ? { start: targetEndpoints.start } : {}),
      ...(targetEndpoints.end ? { end: targetEndpoints.end } : {}),
    },
    route: {
      status: "ready",
      sourceFormat: "gpx",
      gpxUrl,
      geojsonPath: routePath,
    },
    routeFeatureCollection,
  };
}

async function buildSection(packet, stageNumber, specialRouteFlow) {
  const officialId = sectionOfficialId(packet);
  const endpoints = sectionTargetEndpoints(packet, specialRouteFlow);
  const from =
    specialRouteFlow?.from ??
    packet.section?.from ??
    packet.routeGeometryDraft?.start?.name ??
    packet.section?.name ??
    packet.name ??
    packet.id;
  const to =
    specialRouteFlow?.to ??
    packet.section?.to ??
    packet.routeGeometryDraft?.end?.name ??
    packet.section?.name ??
    packet.name ??
    packet.id;
  const name = sectionName(packet, from, to);
  const builtRoute = await buildRoute(packet, name, endpoints);
  const routeFetchNotes = builtRoute.routeFetchWarning
    ? [`Route GPX fetch failed during import: ${builtRoute.routeFetchWarning}`]
    : [];

  return {
    section: {
      id: packet.id,
      stageNumber: officialId || stageNumber,
      name,
      from,
      to,
      distanceKm: sectionDistance(packet),
      estimatedTime: packet.estimatedTime ?? "Varies by section",
      description: sectionDescription(packet),
      utilities: sectionUtilities(packet),
      waterSources: sectionWaterSources(packet),
      notes: [...sectionNotes(packet), ...routeFetchNotes],
      facilities: buildFacilitiesForPacket(packet, packet.id),
      ...(builtRoute.endpointCoordinates
        ? { endpointCoordinates: builtRoute.endpointCoordinates }
        : {}),
      accessPoints: [],
      source: {
        provider: sourceProviderFromUrl(fallbackSourceUrl(packet)),
        url: fallbackSourceUrl(packet),
        lastFetchedAt: LAST_FETCHED_AT,
      },
      route: builtRoute.route,
    },
    routeFeatureCollection: builtRoute.routeFeatureCollection,
  };
}

function sectionUtilities(packet) {
  const counts = new Map();
  for (const row of packet.importRows ?? packet.appImportPreviewDraft ?? [])
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  const types = [...counts.keys()].filter((type) =>
    SUPPORTED_FACILITY_TYPES.has(type),
  );
  return types.length
    ? [
        `Mapped facilities on this section include ${types.map((type) => type.replace(/-/g, " ")).join(", ")}.`,
      ]
    : [];
}

function sectionWaterSources(packet) {
  const rows = packet.importRows ?? packet.appImportPreviewDraft ?? [];
  const waterRows = rows.filter((row) =>
    ["water", "natural-water"].includes(row.type),
  );
  if (!waterRows.length)
    return [
      "Carry enough water unless a current refill point is listed for the selected section.",
    ];
  return [
    "Use listed water rows as planning-grade refill information; seasonal access, non-potable warnings, and local signage override static data.",
  ];
}

function sectionNotes(packet) {
  const notes = [
    packet.section?.notes,
    ...(packet.mapdata?.drawPolicy ?? []),
    ...(packet.routeGeometryDraft?.drawabilityNotes ?? []),
    ...(packet.mapdata?.qa ?? []).filter((note) =>
      /warning|gap|break|reroute|closure|do not|preserve/i.test(note),
    ),
  ].filter(Boolean);
  return textList(notes);
}

function specialRouteFlowForSection(section) {
  if (section.id === "upplandsleden-etapp-18-skekarsbo-gysinge") {
    return {
      from: "Gysinge",
      to: "Skekarsbo",
      start: roundLatLon(section.mapdata?.end),
      end: roundLatLon(section.mapdata?.start),
    };
  }
  if (section.id === "upplandsleden-etapp-1-2-knivsta-forsbyan") {
    return {
      from: "Forsbyan",
      to: "Knivsta",
      start: roundLatLon(
        section.routeGeometryDraft?.postStockholmDrawStart?.coords ??
          section.routeGeometryDraft?.end?.coords,
      ),
      end: roundLatLon(
        section.routeGeometryDraft?.postStockholmDrawEnd?.coords ??
          section.routeGeometryDraft?.start?.coords,
      ),
    };
  }
  if (section.id === "upplandsleden-etapp-1-1-lunsentorpet-knivsta") {
    return {
      from: "Knivsta",
      to: "Lunsentorpet",
      start: roundLatLon(
        section.routeGeometryDraft?.gpxStart?.coords ??
          section.routeGeometryDraft?.end?.coords,
      ),
      end: roundLatLon(
        section.routeGeometryDraft?.gpxEnd?.coords ??
          section.routeGeometryDraft?.start?.coords,
      ),
    };
  }
  return null;
}

async function loadResearchPackets() {
  const trail = await readJson(path.join(RESEARCH_DIR, "trail.research.json"));
  const specialPackets = SPECIAL_SECTION_IDS.map((sectionId) =>
    trail.sections.find((section) => section.id === sectionId),
  ).filter(Boolean);
  const files = (await readdir(SECTION_RESEARCH_DIR))
    .filter((file) => file.endsWith(".research.json"))
    .sort((a, b) => a.localeCompare(b));
  const filePackets = await Promise.all(
    files.map((file) => readJson(path.join(SECTION_RESEARCH_DIR, file))),
  );
  const filePacketIds = new Set(filePackets.map((packet) => packet.id));
  return [
    ...specialPackets.filter((packet) => !filePacketIds.has(packet.id)),
    ...filePackets,
  ];
}

function sortSections(sections) {
  const order = [
    "upplandsleden-stockholms-lan",
    "upplandsleden-etapp-1-2-knivsta-forsbyan",
    "upplandsleden-etapp-1-1-lunsentorpet-knivsta",
    ...MAINLINE_GROUPS.flatMap((group) => group.sectionIds),
    ...Object.keys(LOOP_CONNECTIONS),
  ];
  const index = new Map(order.map((id, position) => [id, position]));
  return sections
    .slice()
    .sort(
      (a, b) =>
        (index.get(a.id) ?? 9999) - (index.get(b.id) ?? 9999) ||
        a.id.localeCompare(b.id),
    );
}

function buildRouteGroups(sectionIds) {
  const sectionIdSet = new Set(sectionIds);
  const groups = MAINLINE_GROUPS.filter((group) =>
    group.sectionIds.every((sectionId) => sectionIdSet.has(sectionId)),
  ).map((group) => ({
    id: group.id,
    name: group.name,
    kind: "mainline",
    sectionIds: group.sectionIds,
    connectsToSectionIds: [],
    notice: group.notice,
  }));

  if (
    sectionIdSet.has("upplandsleden-etapp-1-2-knivsta-forsbyan") &&
    sectionIdSet.has("upplandsleden-etapp-1-1-lunsentorpet-knivsta")
  ) {
    groups.push({
      id: "upplandsleden-post-sigtuna-connector",
      name: "Forsbyan-Knivsta-Lunsentorpet connector",
      kind: "connector",
      sectionIds: [
        "upplandsleden-etapp-1-2-knivsta-forsbyan",
        "upplandsleden-etapp-1-1-lunsentorpet-knivsta",
      ],
      connectsToSectionIds: [
        "upplandsleden-stockholms-lan",
        "upplandsleden-etapp-1-sunnersta-nyby",
      ].filter((sectionId) => sectionIdSet.has(sectionId)),
      notice:
        "Connector inside the same Upplandsleden trail system. It does not close the Sigtuna-Forsbyan break; use it only after planning the known discontinuity separately.",
    });
  }

  for (const [loopId, connectsToSectionIds] of Object.entries(
    LOOP_CONNECTIONS,
  )) {
    if (!sectionIdSet.has(loopId)) continue;
    groups.push({
      id: `${loopId}-route-group`,
      name: `Loop ${loopId.replace("upplandsleden-slinga-", "").replace("-", ":")}`,
      kind: "branch",
      sectionIds: [loopId],
      connectsToSectionIds: connectsToSectionIds.filter((sectionId) =>
        sectionIdSet.has(sectionId),
      ),
      notice:
        "Official Upplandsleden loop imported as a related route option, not stitched into the main section geometry.",
    });
  }

  return groups;
}

function buildConnections(sectionsById) {
  const stockholm = sectionsById.get("upplandsleden-stockholms-lan");
  const forsbyan = sectionsById.get("upplandsleden-etapp-1-2-knivsta-forsbyan");
  const etapp20 = sectionsById.get("upplandsleden-etapp-20-nora-kyrka-osta");
  const etapp21 = sectionsById.get(
    "upplandsleden-etapp-21-siggeforasjon-tenasjon",
  );
  return [
    stockholm && forsbyan
      ? {
          id: "upplandsleden-sigtuna-forsbyan-discontinuity",
          mode: "none",
          from: {
            sectionId: stockholm.id,
            label: "Sigtuna / Stockholm County endpoint",
            coordinates: stockholm.endpointCoordinates?.end,
            coordinateSource: "route-geometry",
          },
          to: {
            sectionId: forsbyan.id,
            label: "Forsbyan",
            coordinates: forsbyan.endpointCoordinates?.start,
            coordinateSource: "route-geometry",
          },
          currentness:
            "Long-standing discontinuity verified during 2026-04-29 research.",
          note: "Known long-standing break between the Stockholm County route and the Uppsala County route. Do not treat it as a temporary closure or draw an implied walking connector.",
          source: {
            provider: "Upplandsstiftelsen",
            url: "https://www.upplandsstiftelsen.se/hitta-ut/vandra/upplandsleden/",
            lastFetchedAt: LAST_FETCHED_AT,
          },
          route: {
            geometryStatus: "missing",
            mapConfidence: "high",
            navigationUse: "not-for-navigation",
            sourceFormat: "manual",
            warning:
              "No official connector geometry is imported for the Sigtuna-Forsbyan gap.",
          },
        }
      : null,
    etapp20 && etapp21
      ? {
          id: "upplandsleden-etapp-20-to-21-missing-source-shards",
          mode: "none",
          from: {
            sectionId: etapp20.id,
            label: etapp20.to,
            coordinates: etapp20.endpointCoordinates?.end,
            coordinateSource: "route-geometry",
          },
          to: {
            sectionId: etapp21.id,
            label: etapp21.from,
            coordinates: etapp21.endpointCoordinates?.start,
            coordinateSource: "route-geometry",
          },
          currentness: "Import-scope caveat for this generated shard set.",
          note: "Etapp 20:1-20:3 are noted in research as the western continuation but are not yet normalized into source shards, so Etapp 20 and Etapp 21 remain separate main route groups.",
          source: {
            provider: "Upplandsleden research",
            url: "https://www.upplandsstiftelsen.se/hitta-ut/vandra/upplandsleden/",
            lastFetchedAt: LAST_FETCHED_AT,
          },
          route: {
            geometryStatus: "missing",
            mapConfidence: "medium",
            navigationUse: "not-for-navigation",
            sourceFormat: "manual",
            warning: "Missing normalized Etapp 20:1-20:3 source shards.",
          },
        }
      : null,
  ].filter(Boolean);
}

function buildPresets(sectionsById) {
  const candidates = [
    {
      id: "stockholm-county",
      name: "Stockholm County part",
      description:
        "Barkarby to the Sigtuna-side endpoint, ending before the known discontinuity.",
      startSectionId: "upplandsleden-stockholms-lan",
      endSectionId: "upplandsleden-stockholms-lan",
    },
    {
      id: "uppsala-east-week",
      name: "Sunnersta to Langhall",
      description:
        "The main Uppsala County east/north sequence through Fjallnora, Gimo, Florarna and Alvkarleby.",
      startSectionId: "upplandsleden-etapp-1-sunnersta-nyby",
      endSectionId: "upplandsleden-etapp-17-alvkarleby-langhall",
    },
    {
      id: "gysinge-osta",
      name: "Gysinge and Osta branch",
      description:
        "Branch sequence around Gysinge, Skekarsbo, Tarnsjo/Nora kyrka and Osta.",
      startSectionId: "upplandsleden-etapp-18-skekarsbo-gysinge",
      endSectionId: "upplandsleden-etapp-20-nora-kyrka-osta",
    },
    {
      id: "siggefora-sanka",
      name: "Siggefora to Sanka",
      description:
        "Southern/western sequence from Siggefora via Enkoping and Skokloster to Sanka.",
      startSectionId: "upplandsleden-etapp-21-siggeforasjon-tenasjon",
      endSectionId: "upplandsleden-etapp-31-skokloster-sanka",
    },
  ];
  return candidates.filter(
    (preset) =>
      sectionsById.has(preset.startSectionId) &&
      sectionsById.has(preset.endSectionId),
  );
}

function buildManifest(sections, routeGroups, connections, presets) {
  const coordinates = sections.flatMap((section) => [
    ...(section.endpointCoordinates?.start
      ? [lonLatFromLatLon(section.endpointCoordinates.start)]
      : []),
    ...(section.endpointCoordinates?.end
      ? [lonLatFromLatLon(section.endpointCoordinates.end)]
      : []),
  ]);
  const totalDistanceKm = roundDistance(
    sections.reduce((total, section) => total + section.distanceKm, 0),
  );
  return {
    id: TRAIL_ID,
    itemType: "trail-system",
    name: "Upplandsleden",
    region: "Stockholms lan and Uppsala lan",
    country: "Sweden",
    location: {
      type: "swedish-county",
      label: "Stockholms lan and Uppsala lan",
      start: sections[0]?.endpointCoordinates?.start ?? [59.404199, 17.866957],
    },
    recommendedTimes: ["dayhike", "weekend", "3-5-days", "6-plus-days"],
    difficulty: "Moderate",
    distanceKm: totalDistanceKm,
    estimatedTime: `${sections.length} imported sections and loops`,
    routeType: "Point to point",
    season:
      "April-October is the practical main hiking season; services, ferries and water vary by section.",
    description:
      "A large Uppland trail system imported as route groups rather than one simple continuous line. The Stockholm County part, Uppsala County sections, branches and loops live in one trail system, with known discontinuities called out explicitly.",
    gettingThere:
      "Use section facilities for static parking and transit planning, then verify current UL, SL, municipality and operator information before travelling. Some endpoints have no bus and some parking is very small.",
    campingRules:
      "Use `campsite` for formal or clearly designated campsites and `camping` for informal/tolerated tenting. Allemansratten is still limited by reserves, national parks, local rules, fire bans and signage.",
    utilities: [
      "Parking and transit are imported as normal planning facilities when route-relevant coordinates exist.",
      "Commercial and seasonal services are included with opening/access caveats in descriptions.",
      "Loops/slingor are related route groups, not merged into main etapp geometry.",
    ],
    waterSources: [
      "Carry water unless the selected section has a current listed refill point.",
      "Unsafe or unavailable water is represented as rule warnings rather than drinking-water facilities.",
      "Natural water must be treated.",
    ],
    notes: [
      "The Sigtuna-Forsbyan break is treated as a long-standing discontinuity inside one trail system, not as a temporary closure.",
      "Etapp 20:1-20:3 are not yet normalized as source shards, so Etapp 20 and Etapp 21 are separated into different route groups.",
      "Generated route GeoJSON uses official Naturkartan GPX and splits large GPX jumps instead of drawing false connectors.",
    ],
    source: {
      provider: "Upplandsstiftelsen",
      url: "https://www.upplandsstiftelsen.se/hitta-ut/vandra/upplandsleden/",
      lastFetchedAt: LAST_FETCHED_AT,
    },
    map: {
      center: coordinates.length
        ? bboxCenterFromLonLat(coordinates)
        : [60.05, 17.75],
      zoom: 8,
      externalUrl:
        "https://www.upplandsstiftelsen.se/hitta-ut/vandra/upplandsleden/",
    },
    sections,
    routeGroups,
    connections,
    presets,
  };
}

function expectedSourceFiles(trailSystem) {
  const { sections, routeGroups, connections, presets, ...manifest } =
    trailSystem;
  const files = new Map([
    [path.join(SOURCE_DIR, "manifest.json"), jsonText(manifest)],
    [
      path.join(SOURCE_DIR, "sections-index.json"),
      jsonText(sections.map((section) => section.id)),
    ],
    [path.join(SOURCE_DIR, "route-groups.json"), jsonText(routeGroups)],
    [path.join(SOURCE_DIR, "connections.json"), jsonText(connections)],
    [path.join(SOURCE_DIR, "presets.json"), jsonText(presets)],
    [path.join(SOURCE_DIR, "README.md"), sourceReadme(trailSystem)],
  ]);
  for (const section of sections)
    files.set(
      path.join(SOURCE_SECTIONS_DIR, `${section.id}.json`),
      jsonText(section),
    );
  return files;
}

function sourceReadme(trailSystem) {
  const facilityCounts = {};
  for (const facility of trailSystem.sections.flatMap(
    (section) => section.facilities,
  )) {
    facilityCounts[facility.type] = (facilityCounts[facility.type] ?? 0) + 1;
  }
  return `# Upplandsleden Source Shards

Generated by \`npm run data:upplandsleden\` from \`data/research/candidate-trails/upplandsleden\`.

- Generated at source date: ${LAST_FETCHED_AT}
- Sections and loops: ${trailSystem.sections.length}
- Route groups: ${trailSystem.routeGroups.length}
- Explicit non-route connections/gaps: ${trailSystem.connections.length}
- Facilities: ${trailSystem.sections.reduce((total, section) => total + section.facilities.length, 0)}

Facility counts:

${Object.entries(facilityCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([type, count]) => `- \`${type}\`: ${count}`)
  .join("\n")}

Normalization notes:

- Upplandsleden is one trail system with multiple route groups, not multiple app trails.
- The Sigtuna-Forsbyan gap is modeled as a long-standing discontinuity.
- Parking and transit rows with route-relevant coordinates are imported as normal facilities.
- Informal/tolerated tenting is \`camping\`; formal or managed sites are \`campsite\`.
- Unsafe/no-water/current-condition records are \`rule-warning\` rows.
- Official loops/slingor are imported as branch route groups.
`;
}

function expectedRouteFiles(routeOutputs) {
  return new Map(
    routeOutputs.map(({ sectionId, featureCollection }) => [
      path.join(PUBLIC_ROUTE_DIR, `${sectionId}.geojson`),
      jsonText(featureCollection),
    ]),
  );
}

async function extraJsonFiles(directory, expectedFiles) {
  const files = await readdir(directory).catch(() => []);
  return files
    .filter((file) => file.endsWith(".json") || file.endsWith(".geojson"))
    .map((file) => path.join(directory, file))
    .filter((filePath) => !expectedFiles.has(filePath));
}

async function checkFiles(expectedFiles, label) {
  const stale = [];
  for (const [filePath, expectedText] of expectedFiles) {
    const actualText = await readFile(filePath, "utf8").catch(() => null);
    if (actualText !== expectedText)
      stale.push(path.relative(REPO_ROOT, filePath));
  }
  for (const filePath of stale)
    console.error(`${filePath} is stale. Run npm run data:upplandsleden.`);
  if (stale.length) process.exitCode = 1;
  else console.log(`${label} are up to date.`);
}

async function writeExpectedFiles(expectedFiles) {
  await Promise.all(
    [...expectedFiles].map(async ([filePath, text]) => {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, text);
    }),
  );
}

async function buildTrailSystem() {
  const packets = await loadResearchPackets();
  const built = [];
  for (let index = 0; index < packets.length; index += 1) {
    const packet = packets[index];
    built.push(
      await buildSection(packet, index + 1, specialRouteFlowForSection(packet)),
    );
  }

  const sections = sortSections(built.map((entry) => entry.section));
  const dedupedFacilityIds = dedupeFacilityIds(sections);
  removeInternalFields(sections);

  const sectionIds = sections.map((section) => section.id);
  const routeGroups = buildRouteGroups(sectionIds);
  const sectionsById = new Map(
    sections.map((section) => [section.id, section]),
  );
  const connections = buildConnections(sectionsById);
  const presets = buildPresets(sectionsById);
  const trailSystem = buildManifest(
    sections,
    routeGroups,
    connections,
    presets,
  );
  const routeOutputs = built
    .filter((entry) => entry.routeFeatureCollection)
    .map((entry) => ({
      sectionId: entry.section.id,
      featureCollection: entry.routeFeatureCollection,
    }));
  return { trailSystem, routeOutputs, dedupedFacilityIds };
}

const { trailSystem, routeOutputs, dedupedFacilityIds } =
  await buildTrailSystem();
const sourceFiles = expectedSourceFiles(trailSystem);
const routeFiles = expectedRouteFiles(routeOutputs);

if (checkOnly) {
  await checkFiles(sourceFiles, "Upplandsleden source shards");
  await checkFiles(routeFiles, "Upplandsleden route GeoJSON");
} else {
  await writeTrailSystemSourceShards(trailSystem, { projectRoot: REPO_ROOT });
  await writeExpectedFiles(
    new Map([[path.join(SOURCE_DIR, "README.md"), sourceReadme(trailSystem)]]),
  );
  await writeExpectedFiles(routeFiles);
  await Promise.all([
    ...(await extraJsonFiles(SOURCE_SECTIONS_DIR, sourceFiles)).map(
      (filePath) => rm(filePath, { force: true }),
    ),
    ...(await extraJsonFiles(PUBLIC_ROUTE_DIR, routeFiles)).map((filePath) =>
      rm(filePath, { force: true }),
    ),
  ]);
  console.log(
    `Wrote ${trailSystem.sections.length} Upplandsleden source sections.`,
  );
  console.log(
    `Wrote ${routeOutputs.length} Upplandsleden route GeoJSON files.`,
  );
  console.log(
    `Wrote ${trailSystem.sections.reduce((total, section) => total + section.facilities.length, 0)} normalized facilities.`,
  );
  console.log(
    `Applied ${dedupedFacilityIds} cross-section facility ID dedupe decisions.`,
  );
}
