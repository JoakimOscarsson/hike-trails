import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { endpointCoordinatesFromRoute, parseGpxFeatureCollection } from "./lib/trail-system-builder.mjs";

const REPO_ROOT = process.cwd();
const TRAIL_ID = "stockholm-archipelago-trail";
const RESEARCH_DIR = path.join(REPO_ROOT, "data", "research", "candidate-trails", TRAIL_ID);
const SOURCE_DIR = path.join(REPO_ROOT, "data", "source", "hiking", TRAIL_ID);
const SECTIONS_DIR = path.join(SOURCE_DIR, "sections");
const RESEARCH_PATH = path.join(RESEARCH_DIR, "trail.research.json");
const CONNECTION_PLAN_PATH = path.join(RESEARCH_DIR, "section-connection-plan.json");
const FACILITY_AUDIT_PATH = path.join(RESEARCH_DIR, "facility-normalization-audit.json");
const ROUTE_SOURCES_PATH = path.join(SOURCE_DIR, "route-sources", "index.json");
const OFFICIAL_SECTION_LIST_URL = "https://stockholmarchipelagotrail.com/section/";
const FACILITY_IMPORT_DECISIONS = new Set([
  "import_facility",
  "normalize_facility",
  "case_normalize_facility",
  "split_facility"
]);
const skippedFacilityImports = [];

const checkOnly = process.argv.includes("--check");

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

function bboxCenter(coordinates) {
  const latitudes = coordinates.map(([lat]) => lat);
  const longitudes = coordinates.map(([, lon]) => lon);
  return [
    round((Math.min(...latitudes) + Math.max(...latitudes)) / 2, 5),
    round((Math.min(...longitudes) + Math.max(...longitudes)) / 2, 5)
  ];
}

function connectionWithoutPlanOnlyFields(connection) {
  const { via: _via, ...runtimeConnection } = connection;
  return runtimeConnection;
}

function routeSourcesBySectionId(routeSources) {
  return new Map((routeSources.entries ?? []).map((entry) => [entry.sectionId, entry]));
}

function collectConnectionEndpoints(connections) {
  const incomingBySectionId = new Map();
  const outgoingBySectionId = new Map();
  const coordinates = [];

  for (const connection of connections) {
    outgoingBySectionId.set(connection.from.sectionId, connection);
    incomingBySectionId.set(connection.to.sectionId, connection);
    for (const endpoint of [connection.from, connection.to]) {
      const coordinate = roundLatLon(endpoint.coordinates);
      if (coordinate) coordinates.push(coordinate);
    }
  }

  return { incomingBySectionId, outgoingBySectionId, coordinates };
}

function splitNamedConnector(name) {
  const normalized = name.replace(/^Rowboats\s+/i, "");
  const separator = normalized.includes(" - ") ? " - " : normalized.includes(" – ") ? " – " : null;
  if (!separator) return null;
  const [from, to] = normalized.split(separator).map((part) => part.trim());
  return from && to ? { from, to } : null;
}

function sectionEndpointLabels(section) {
  const split = splitNamedConnector(section.name);
  if (split) return split;
  return { from: section.name, to: section.name };
}

function sectionEndpointCoordinates(sectionId, incoming, outgoing) {
  const start = roundLatLon(incoming?.to.coordinates) ?? roundLatLon(outgoing?.from.coordinates);
  const end = roundLatLon(outgoing?.from.coordinates) ?? roundLatLon(incoming?.to.coordinates) ?? start;
  if (!start && !end) return undefined;
  return {
    source: "approximate",
    ...(start ? { start } : {}),
    ...(end ? { end } : {})
  };
}

function manualRouteCoordinates(entry) {
  return (entry.latLonCoordinates ?? [])
    .map(([lat, lon]) => [lon, lat])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
}

async function routeCoordinates(entry) {
  if (!entry) return [];
  if (entry.sourceFormat === "manual") return manualRouteCoordinates(entry);
  if (entry.sourceFormat !== "gpx") return [];
  const gpxPath = path.join(REPO_ROOT, entry.localPath);
  return parseGpxFeatureCollection(await readFile(gpxPath, "utf8"), entry.sectionId).coordinates;
}

async function sectionRoute(entry) {
  if (!entry) {
    return {
      route: {
        status: "marker-only"
      }
    };
  }

  const coordinates = await routeCoordinates(entry);
  if (coordinates.length < 2) {
    throw new Error(`${entry.sectionId} route source does not contain enough route coordinates`);
  }

  return {
    endpointCoordinates: entry.endpointCoordinates ?? endpointCoordinatesFromRoute(coordinates),
    route: {
      status: "ready",
      sourceFormat: entry.sourceFormat,
      sourceUrl: entry.sourceUrl,
      ...(entry.sourceFormat === "gpx" ? { gpxUrl: entry.sourceUrl } : {}),
      geojsonPath: entry.geojsonPath
    }
  };
}

function sectionSource(section, createdAt) {
  return {
    provider: "stockholm-archipelago-trail",
    url: section.officialUrl ?? OFFICIAL_SECTION_LIST_URL,
    lastFetchedAt: createdAt
  };
}

function textList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string" && item.trim());
  if (typeof value === "string" && value.trim()) return [value];
  if (value && typeof value === "object") {
    return Object.values(value).filter((item) => typeof item === "string" && item.trim());
  }
  return [];
}

function sourceProviderFromUrl(url) {
  if (typeof url !== "string") return "Stockholm Archipelago Trail";
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("stockholmarchipelagotrail")) return "Stockholm Archipelago Trail";
    if (hostname.includes("openstreetmap")) return "OpenStreetMap";
    if (hostname.includes("lansstyrelsen")) return "Länsstyrelsen";
    if (hostname.includes("explorearchipelago")) return "Explore Archipelago";
    if (hostname.includes("trafikverket")) return "Trafikverket";
    return hostname;
  } catch {
    return "Stockholm Archipelago Trail";
  }
}

function recordIdentifier(record) {
  return typeof record?.id === "string" ? record.id : typeof record?.sourceResearchId === "string" ? record.sourceResearchId : null;
}

function collectFacilityRecordIndex(section) {
  const exact = new Map();
  const byId = new Map();

  function visit(value, pathParts) {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, pathParts);
      return;
    }
    if (!value || typeof value !== "object") return;

    const id = recordIdentifier(value);
    if (id && (value.name || value.type || value.coordinates || value.coordinateAnchor)) {
      const origin = pathParts.join(".");
      exact.set(`${origin}:${id}`, value);
      if (!byId.has(id)) byId.set(id, value);
    }

    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === "object") visit(child, [...pathParts, key]);
    }
  }

  for (const [key, value] of Object.entries(section)) visit(value, [key]);
  return { exact, byId };
}

function sourceRecordForDecision(recordIndex, decision) {
  return (
    recordIndex.exact.get(`${decision.origin}:${decision.id}`) ??
    recordIndex.byId.get(decision.id) ?? {
      id: decision.id,
      name: decision.name,
      type: decision.rawType
    }
  );
}

function facilityCoordinates(record) {
  return (
    roundLatLon(record.coordinates) ??
    roundLatLon(record.coordinateAnchor?.coordinates) ??
    roundLatLon(record.optionalApproximateRouteAnchor)
  );
}

function normalizeRouteProximity(record) {
  const raw = record.routeProximity;
  if (raw && typeof raw === "object" && typeof raw.status === "string") {
    return {
      status: raw.status,
      ...(Number.isFinite(raw.distanceKm) ? { distanceKm: raw.distanceKm } : {}),
      thresholdKm: Number.isFinite(raw.thresholdKm) ? raw.thresholdKm : 2,
      ...(raw.note ? { note: raw.note } : {})
    };
  }

  if (typeof raw === "string" && raw.trim()) {
    const lower = raw.toLowerCase();
    const status = lower.includes("off") ? "off-route" : lower.includes("on") ? "on-route" : "unknown";
    return { status, thresholdKm: 2, note: raw };
  }

  const routeDistanceMeters = Number(record.routeDistanceMeters ?? record.nearestOfficialRouteDistanceMeters);
  if (Number.isFinite(routeDistanceMeters)) {
    return {
      status: routeDistanceMeters <= 100 ? "on-route" : "unknown",
      distanceKm: round(routeDistanceMeters / 1000, 3),
      thresholdKm: 2
    };
  }

  return { status: "unknown", thresholdKm: 2 };
}

function facilitySource(record, section, createdAt) {
  const sourceObject = record.source && typeof record.source === "object" ? record.source : null;
  const sourceString = typeof record.source === "string" ? record.source : null;
  const url = sourceObject?.url ?? sourceString ?? record.sources?.[0] ?? section.officialUrl ?? OFFICIAL_SECTION_LIST_URL;
  return {
    provider: sourceObject?.provider ?? sourceProviderFromUrl(url),
    url,
    lastFetchedAt: createdAt,
    ...(sourceObject?.notes ? { notes: sourceObject.notes } : {})
  };
}

function facilityDescription(record, decision) {
  const description = [record.description, record.importCaveat].filter((part) => typeof part === "string" && part.trim()).join(" ");
  return description || `${decision.name}.`;
}

function facilityTypeLabel(type) {
  return type.replace(/-/g, " ");
}

function buildFacilities(section, decisions, createdAt) {
  const recordIndex = collectFacilityRecordIndex(section);
  const facilities = [];
  const seen = new Set();
  const sectionDecisions = decisions.filter(
    (decision) => decision.sectionId === section.id && FACILITY_IMPORT_DECISIONS.has(decision.decision)
  );

  for (const decision of sectionDecisions) {
    const sourceRecord = sourceRecordForDecision(recordIndex, decision);
    const coordinates = facilityCoordinates(sourceRecord);
    if (!coordinates) {
      skippedFacilityImports.push(`${decision.sectionId}/${decision.id}`);
      continue;
    }

    for (const normalizedType of decision.normalizedTypes ?? []) {
      const split = (decision.normalizedTypes ?? []).length > 1;
      const facilityId = split ? `${decision.id}-${normalizedType}` : decision.id;
      if (seen.has(facilityId)) continue;
      seen.add(facilityId);
      facilities.push({
        id: facilityId,
        name: split ? `${decision.name} (${facilityTypeLabel(normalizedType)})` : decision.name,
        type: normalizedType,
        sectionId: section.id,
        coordinates,
        description: facilityDescription(sourceRecord, decision),
        routeProximity: normalizeRouteProximity(sourceRecord),
        source: facilitySource(sourceRecord, section, createdAt)
      });
    }
  }

  return facilities;
}

function sectionNotes(section) {
  return [
    ...(section.routeShape ? [`Route shape: ${section.routeShape}.`] : []),
    ...textList(section.notesDraft)
  ];
}

async function buildSection(section, index, endpointLookups, facilityDecisions, routeSources, createdAt) {
  const incoming = endpointLookups.incomingBySectionId.get(section.id);
  const outgoing = endpointLookups.outgoingBySectionId.get(section.id);
  const labels = sectionEndpointLabels(section);
  const fallbackEndpointCoordinates = sectionEndpointCoordinates(section.id, incoming, outgoing);
  const route = await sectionRoute(routeSources.get(section.id));
  return {
    id: section.id,
    stageNumber: index + 1,
    name: section.name,
    from: labels.from,
    to: labels.to,
    distanceKm: section.distanceKm,
    estimatedTime: section.estimatedTime,
    description: section.descriptionDraft ?? section.routeShape ?? `${section.name} section of Stockholm Archipelago Trail.`,
    utilities: textList(section.utilitiesDraft),
    waterSources: textList(section.waterSourcesDraft),
    notes: sectionNotes(section),
    facilities: buildFacilities(section, facilityDecisions, createdAt),
    ...(route.endpointCoordinates ?? fallbackEndpointCoordinates
      ? { endpointCoordinates: route.endpointCoordinates ?? fallbackEndpointCoordinates }
      : {}),
    accessPoints: [],
    source: sectionSource(section, createdAt),
    route: route.route
  };
}

function buildRouteGroups(sectionIds) {
  return [
    {
      id: "stockholm-archipelago-trail-mainline",
      name: "Official north-south sequence",
      kind: "mainline",
      sectionIds,
      connectsToSectionIds: [],
      notice: "Official SAT section order. Ferry, rowboat, bus, and walking transfers are modeled as separate connection routes."
    }
  ];
}

function buildPresets(sectionIds) {
  return [
    {
      id: "northern-islands",
      name: "Northern islands",
      description: "Arholma to Yxlan, with ferry-dependent transfers between island sections.",
      startSectionId: "sat-arholma",
      endSectionId: "sat-yxlan"
    },
    {
      id: "middle-rowboat-hop",
      name: "Middle rowboat hop",
      description: "Finnhamn to Svartsö, including the official Finnhamn-Ingmarsö rowboat crossing.",
      startSectionId: "sat-finnhamn",
      endSectionId: "sat-svartso"
    },
    {
      id: "southern-islands",
      name: "Southern islands",
      description: "Utö to Landsort through the southern archipelago sections and ferry transfers.",
      startSectionId: "sat-uto",
      endSectionId: "sat-landsort"
    },
    {
      id: "full-route",
      name: "Full route",
      description: "All official Stockholm Archipelago Trail entries in north-south order.",
      startSectionId: sectionIds[0],
      endSectionId: sectionIds[sectionIds.length - 1]
    }
  ];
}

async function buildTrailSystem(research, connectionPlan, facilityAudit, routeSources) {
  const researchSectionsById = new Map(research.sections.map((section) => [section.id, section]));
  const sectionRouteSources = routeSourcesBySectionId(routeSources);
  const orderedSectionIds = connectionPlan.officialSectionOrder.map((entry) => entry.id);
  const missingSections = orderedSectionIds.filter((sectionId) => !researchSectionsById.has(sectionId));
  if (missingSections.length) {
    throw new Error(`Connection plan references missing research sections: ${missingSections.join(", ")}`);
  }

  const runtimeConnections = connectionPlan.connections.map(connectionWithoutPlanOnlyFields);
  const endpointLookups = collectConnectionEndpoints(runtimeConnections);
  const sections = await Promise.all(
    orderedSectionIds.map((sectionId, index) =>
      buildSection(
        researchSectionsById.get(sectionId),
        index,
        endpointLookups,
        facilityAudit.facilityRecordDecisions ?? [],
        sectionRouteSources,
        research.createdAt
      )
    )
  );
  const firstCoordinate = endpointLookups.coordinates[0] ?? [59.85124, 19.10752];
  const totalDistanceKm = roundDistance(sections.reduce((total, section) => total + section.distanceKm, 0));

  return {
    id: TRAIL_ID,
    itemType: "trail-system",
    name: "Stockholm Archipelago Trail",
    region: "Stockholms län",
    country: "Sweden",
    location: {
      type: "swedish-county",
      label: "Stockholms län",
      start: firstCoordinate
    },
    recommendedTimes: ["dayhike", "weekend", "3-5-days", "6-plus-days"],
    difficulty: "Moderate",
    distanceKm: totalDistanceKm,
    estimatedTime: "22 official entries; ferry-dependent multi-day route",
    routeType: "Point to point",
    season: "May-September is the practical main season; ferry timetables and island services vary.",
    description:
      "A ferry-dependent trail system across the Stockholm archipelago. Sections are island hikes, short connectors, and one official rowboat crossing; static data should be paired with current ferry planning before a trip.",
    gettingThere:
      "Use current SL, Waxholmsbolaget, Trafikverket, and operator planners for each section handoff. Some transfers are seasonal, request-stop based, or routed through mainland piers outside peak summer.",
    campingRules:
      "Camping and fires vary by island, reserve, and service operator. Use section notes and local signage, and treat fire bans as overriding all stored data.",
    utilities: [
      "Facilities are island-specific and often seasonal.",
      "Ferries, rowboats, and walking connectors are modeled as route connections, not as ordinary facilities."
    ],
    waterSources: [
      "Carry water unless a current public refill point is confirmed for the chosen island and season.",
      "Some sections have seasonal harbor or service water; natural water must be treated."
    ],
    notes: [
      "Walking section lines are imported from official GPX or official route geometry sources where available.",
      "Transfer connection geometry is available as planning-reference lines and is not a live timetable or navigation promise.",
      "Exact ferry departures, request-stop rules, and disruptions are intentionally not hardcoded."
    ],
    source: {
      provider: "stockholm-archipelago-trail",
      url: OFFICIAL_SECTION_LIST_URL,
      lastFetchedAt: research.createdAt
    },
    map: {
      center: bboxCenter(endpointLookups.coordinates),
      zoom: 8,
      externalUrl: OFFICIAL_SECTION_LIST_URL
    },
    sections,
    routeGroups: buildRouteGroups(orderedSectionIds),
    connections: runtimeConnections,
    presets: buildPresets(orderedSectionIds)
  };
}

function toManifest(trailSystem) {
  const { sections: _sections, routeGroups: _routeGroups, connections: _connections, presets: _presets, ...manifest } = trailSystem;
  return manifest;
}

function expectedShardFiles(trailSystem) {
  const files = new Map([
    [path.join(SOURCE_DIR, "manifest.json"), jsonText(toManifest(trailSystem))],
    [path.join(SOURCE_DIR, "sections-index.json"), jsonText(trailSystem.sections.map((section) => section.id))],
    [path.join(SOURCE_DIR, "route-groups.json"), jsonText(trailSystem.routeGroups)],
    [path.join(SOURCE_DIR, "connections.json"), jsonText(trailSystem.connections)],
    [path.join(SOURCE_DIR, "presets.json"), jsonText(trailSystem.presets)]
  ]);
  for (const section of trailSystem.sections) {
    files.set(path.join(SECTIONS_DIR, `${section.id}.json`), jsonText(section));
  }
  return files;
}

async function extraJsonFiles(directory, expectedFiles) {
  const entries = await readdir(directory).catch(() => []);
  return entries
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(directory, file))
    .filter((filePath) => !expectedFiles.has(filePath));
}

async function checkShards(expectedFiles) {
  const stale = [];
  for (const [filePath, expectedText] of expectedFiles) {
    const actualText = await readFile(filePath, "utf8").catch(() => null);
    if (actualText !== expectedText) stale.push(path.relative(REPO_ROOT, filePath));
  }
  stale.push(...(await extraJsonFiles(SOURCE_DIR, expectedFiles)).map((filePath) => path.relative(REPO_ROOT, filePath)));
  stale.push(...(await extraJsonFiles(SECTIONS_DIR, expectedFiles)).map((filePath) => path.relative(REPO_ROOT, filePath)));

  if (stale.length) {
    for (const filePath of stale) console.error(`${filePath} is stale. Run npm run data:sat:source-shards.`);
    process.exitCode = 1;
    return;
  }

  console.log("Stockholm Archipelago Trail source shards are up to date.");
}

async function writeShards(expectedFiles) {
  await mkdir(SECTIONS_DIR, { recursive: true });
  await Promise.all([...expectedFiles].map(([filePath, text]) => writeFile(filePath, text)));
  await Promise.all([
    ...(await extraJsonFiles(SOURCE_DIR, expectedFiles)).map((filePath) => rm(filePath, { force: true })),
    ...(await extraJsonFiles(SECTIONS_DIR, expectedFiles)).map((filePath) => rm(filePath, { force: true }))
  ]);
}

const [research, connectionPlan, facilityAudit, routeSources] = await Promise.all([
  readJson(RESEARCH_PATH),
  readJson(CONNECTION_PLAN_PATH),
  readJson(FACILITY_AUDIT_PATH),
  readJson(ROUTE_SOURCES_PATH)
]);
const trailSystem = await buildTrailSystem(research, connectionPlan, facilityAudit, routeSources);
const expectedFiles = expectedShardFiles(trailSystem);

if (checkOnly) {
  await checkShards(expectedFiles);
} else {
  await writeShards(expectedFiles);
  const facilityCount = trailSystem.sections.reduce((total, section) => total + section.facilities.length, 0);
  console.log(`Wrote ${trailSystem.sections.length} Stockholm Archipelago Trail source section shards.`);
  console.log(`Wrote ${facilityCount} normalized Stockholm Archipelago Trail source facilities.`);
  if (skippedFacilityImports.length) {
    console.log(`Skipped ${skippedFacilityImports.length} coordinate-less facility import candidates.`);
  }
  console.log(`Wrote ${trailSystem.connections.length} Stockholm Archipelago Trail source connections.`);
}
