import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeTrailSystemSourceShards } from "./lib/hiking-source-shards.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const candidateRoot = path.join(projectRoot, "data/research/candidate-trails");
const publicRoutesRoot = path.join(projectRoot, "public/routes/hiking");

const importConfigs = {
  hogakustenleden: {
    name: "Höga Kustenleden",
    region: "Västernorrlands län",
    country: "Sweden",
    difficulty: "Varied",
    estimatedTime: "7-9 days",
    season: "May-October",
    routeType: "Point to point",
    description:
      "A coastal long-distance trail through the High Coast from Hornöberget to Örnsköldsvik, with forest stages, villages, coastal viewpoints and Skuleskogen National Park.",
    gettingThere:
      "Use the selected section endpoints for access planning. Hornöberget, Ullånger, Skuleberget, Skuleskogen entrances and Örnsköldsvik have the strongest access context; rural sections need current bus or taxi checks.",
    utilities: [
      "Facilities are unevenly distributed; villages, campgrounds and national-park entrances are the strongest service nodes.",
      "Opening hours, seasonal boats and transit should be checked before relying on them."
    ],
    waterSources: [
      "Carry enough water between confirmed refill points.",
      "Natural water and lake/stream water should be treated before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Slåttdalsskrevan is carried as a hazard/current-route caveat and should be rechecked before publication."
    ],
    source: {
      provider: "hoga-kusten/naturkartan-candidate-research",
      url: "https://www.hogakusten.com/sv/hogakustenleden",
      lastFetchedAt: "2026-04-30"
    }
  },
  sjuharadsleden: {
    name: "Sjuhäradsleden",
    region: "Västra Götalands län / Jönköpings län",
    country: "Sweden",
    difficulty: "Moderate",
    estimatedTime: "10 stages",
    season: "April-October",
    routeType: "Point to point",
    description:
      "An orange-marked long-distance trail from Hindås to Hotell Mullsjö through forest, lakes, towns and agricultural landscapes, with ten official stages and E1 context.",
    gettingThere:
      "Use the selected section endpoints for access planning. Hindås, Borås, Ulricehamn and Mullsjö have the strongest transport context; several rural endpoints require current timetable checks.",
    utilities: [
      "Services vary sharply by section; town and campground endpoints are much stronger than the rural forest stages.",
      "Public access to toilets, cafes, lodging and water should be checked before relying on it."
    ],
    waterSources: [
      "No on-route potable water should be assumed unless a selected section lists a verified source.",
      "Natural water should be treated before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Naturkartan/Västkuststiftelsen quality-assurance caveat remains relevant until a newer official source says otherwise."
    ],
    source: {
      provider: "vastsverige/naturkartan-candidate-research",
      url: "https://www.vastsverige.com/sjuharad/natur-och-friluftsliv/vandra/vandringsleder/boras-vandringsleder/sjuharadsleden/",
      lastFetchedAt: "2026-04-30"
    }
  }
};

const requestedTrailIds = process.argv.slice(2);
const trailIds = requestedTrailIds.length ? requestedTrailIds : Object.keys(importConfigs);

for (const trailId of trailIds) {
  if (!importConfigs[trailId]) throw new Error(`Unsupported candidate trail import "${trailId}"`);
}

const imported = [];
for (const trailId of trailIds) {
  const trailSystem = await buildTrailSystem(trailId, importConfigs[trailId]);
  await writeTrailSystemSourceShards(trailSystem, { projectRoot });
  await writePublicRouteFiles(trailId, trailSystem.sections);
  imported.push(trailSystem);
}

console.log(`Imported ${imported.length} candidate trail system(s) into runtime source shards.`);
for (const trailSystem of imported) {
  console.log(`- ${trailSystem.id}: ${trailSystem.sections.length} sections, ${trailSystem.distanceKm} km`);
}

async function buildTrailSystem(trailId, config) {
  const [routeSections, routeTopology, routeGeometryIndex, facilities] = await Promise.all([
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/route-sections.research.json")),
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/route-topology.research.json")),
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/route-geometry-index.research.json")),
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/facilities.research.json"))
  ]);

  const sectionGeometryById = new Map((routeGeometryIndex.sections ?? []).map((section) => [section.sectionId, section]));
  const normalFacilitiesBySectionId = groupNormalFacilities(facilities.records ?? []);
  const sections = (routeSections.sections ?? []).map((section) =>
    toRuntimeSection(trailId, section, sectionGeometryById.get(section.sectionId), normalFacilitiesBySectionId.get(section.sectionId) ?? [])
  );
  const orderedSections = sections.sort((left, right) => (left.stageNumber ?? 0) - (right.stageNumber ?? 0));
  const locationStart = orderedSections[0]?.endpointCoordinates?.start;
  const bounds = await routeBounds(trailId, orderedSections);
  const distanceKm = round(orderedSections.reduce((sum, section) => sum + (Number(section.distanceKm) || 0), 0), 1);

  return {
    id: trailId,
    itemType: "trail-system",
    name: config.name,
    region: config.region,
    country: config.country,
    location: {
      type: "swedish-region",
      label: config.region,
      start: locationStart ?? bounds.center
    },
    recommendedTimes: ["dayhike", "weekend", "3-5-days", "6-plus-days"],
    difficulty: config.difficulty,
    distanceKm,
    estimatedTime: config.estimatedTime,
    routeType: config.routeType,
    season: config.season,
    description: config.description,
    gettingThere: config.gettingThere,
    utilities: config.utilities,
    waterSources: config.waterSources,
    notes: config.notes,
    source: config.source,
    map: {
      center: bounds.center ?? locationStart,
      zoom: 8,
      externalUrl: config.source.url
    },
    sections: orderedSections,
    routeGroups: toRuntimeRouteGroups(routeTopology.routeGroups ?? []),
    presets: buildPresets(trailId, orderedSections)
  };
}

function toRuntimeSection(trailId, section, geometryRecord, normalFacilities) {
  const routePath = `/routes/hiking/${trailId}/sections/${section.sectionId}.geojson`;
  const timingNotes = estimatedTimeNotes(section.estimatedTime);
  const caveatNotes = uniqueStrings([...(section.caveats ?? []), ...timingNotes]).slice(0, 6);
  return {
    id: section.sectionId,
    stageNumber: section.sectionNumber ?? section.order,
    name: section.name,
    from: section.from,
    to: section.to,
    distanceKm: section.distance?.displayDistanceKm ?? section.distance?.officialDistanceKm ?? section.sourceSummary?.computedDistanceKm,
    estimatedTime: displayText(section.estimatedTime),
    description: `${section.from} to ${section.to}. Candidate import from normalized research; verify current notices before publication.`,
    utilities: sectionUtilities(normalFacilities),
    waterSources: sectionWaterSources(normalFacilities),
    notes: caveatNotes,
    facilities: normalFacilities.map((facility) => toRuntimeFacility(facility)),
    source: {
      provider: section.sourceSummary?.source ?? "candidate-research",
      url: section.sourceSummary?.sourceUrl ?? section.sourceSummary?.gpxUrl,
      lastFetchedAt: "2026-04-30"
    },
    route: {
      status: geometryRecord?.candidateGeojsonFiles?.length ? "ready" : "manual",
      sourceFormat: "geojson",
      geojsonPath: routePath
    },
    endpointCoordinates: {
      source: "candidate-normalized-route",
      start: section.endpoints?.start?.coordinatesLatLon,
      end: section.endpoints?.end?.coordinatesLatLon
    }
  };
}

function groupNormalFacilities(records) {
  const grouped = new Map();
  for (const record of records) {
    if (record.state !== "normal") continue;
    if (!record.sectionId || !record.coordinatesLatLon) continue;
    if (!grouped.has(record.sectionId)) grouped.set(record.sectionId, []);
    grouped.get(record.sectionId).push(record);
  }
  return grouped;
}

function toRuntimeFacility(record) {
  return {
    id: record.facilityId,
    name: record.name,
    type: record.primaryType,
    sectionId: record.sectionId,
    coordinates: record.coordinatesLatLon,
    description: facilityDescription(record),
    source: {
      provider: "candidate-research",
      url: record.sourceUrls?.[0],
      lastFetchedAt: "2026-04-30"
    },
    routeProximity: record.routeProximity
  };
}

function facilityDescription(record) {
  const pieces = [record.description, ...(record.caveats ?? []).slice(0, 2)].filter(Boolean);
  return pieces.join(" ");
}

function sectionUtilities(facilities) {
  const labels = facilities
    .filter((facility) => ["toilet", "food", "lodging", "shelter", "campsite", "camping", "parking", "transit", "service"].includes(facility.primaryType))
    .slice(0, 8)
    .map((facility) => `${facility.name} (${facility.primaryType})`);
  return labels.length ? labels : ["No normalized service facilities are listed for this section yet."];
}

function sectionWaterSources(facilities) {
  const labels = facilities
    .filter((facility) => ["water", "natural-water"].includes(facility.primaryType))
    .slice(0, 6)
    .map((facility) => `${facility.name}: ${facility.description}`);
  return labels.length ? labels : ["No verified potable water source is listed for this section; carry water and treat natural water."];
}

function toRuntimeRouteGroups(routeGroups) {
  return routeGroups.map((group) => ({
    id: group.groupId ?? group.id,
    name: group.name ?? group.groupId ?? group.id,
    kind: group.kind,
    sectionIds: group.sectionIds ?? [],
    connectsToSectionIds: group.connectsToSectionIds ?? [],
    notice: group.status ? `Imported from candidate topology: ${group.status}.` : undefined
  }));
}

function buildPresets(trailId, sections) {
  const presets = [
    {
      id: "full-route",
      name: "Full route",
      description: `All ${sections.length} stages.`,
      startSectionId: sections[0]?.id,
      endSectionId: sections.at(-1)?.id
    }
  ];

  if (sections.length >= 2) {
    presets.unshift({
      id: "first-two-stages",
      name: "First two stages",
      description: `Stages ${sections[0].stageNumber}-${sections[1].stageNumber}.`,
      startSectionId: sections[0].id,
      endSectionId: sections[1].id
    });
  }

  return presets.filter((preset) => preset.startSectionId && preset.endSectionId);
}

async function writePublicRouteFiles(trailId, sections) {
  const routeDir = path.join(publicRoutesRoot, trailId, "sections");
  await rm(routeDir, { recursive: true, force: true });
  await mkdir(routeDir, { recursive: true });
  await Promise.all(
    sections.map(async (section) => {
      const sourcePath = path.join(candidateRoot, trailId, "geometry/candidate/sections", `${section.id}.geojson`);
      const candidateGeojson = await readJson(sourcePath);
      const featureCollection = toRouteFeatureCollection(trailId, section, candidateGeojson);
      await writeJson(path.join(routeDir, `${section.id}.geojson`), featureCollection);
    })
  );
}

function toRouteFeatureCollection(trailId, section, candidateGeojson) {
  const feature = candidateGeojson.type === "Feature" ? candidateGeojson : candidateGeojson.features?.[0];
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: section.id,
          trailSystemId: trailId,
          sectionId: section.id,
          name: section.name,
          source: "candidate-normalized-geojson"
        },
        geometry: feature?.geometry ?? candidateGeojson
      }
    ]
  };
}

async function routeBounds(trailId, sections) {
  const coordinates = [];
  for (const section of sections) {
    const routePath = path.join(candidateRoot, trailId, "geometry/candidate/sections", `${section.id}.geojson`);
    try {
      const geojson = await readJson(routePath);
      collectCoordinates(geojson, coordinates);
    } catch {
      if (section.endpointCoordinates?.start) coordinates.push(toLonLat(section.endpointCoordinates.start));
      if (section.endpointCoordinates?.end) coordinates.push(toLonLat(section.endpointCoordinates.end));
    }
  }
  if (!coordinates.length) return {};
  const lons = coordinates.map((coordinate) => coordinate[0]);
  const lats = coordinates.map((coordinate) => coordinate[1]);
  return {
    center: [round((Math.min(...lats) + Math.max(...lats)) / 2, 6), round((Math.min(...lons) + Math.max(...lons)) / 2, 6)]
  };
}

function collectCoordinates(value, coordinates) {
  if (!value) return;
  if (value.type === "FeatureCollection") {
    for (const feature of value.features ?? []) collectCoordinates(feature, coordinates);
  } else if (value.type === "Feature") {
    collectCoordinates(value.geometry, coordinates);
  } else if (value.type === "LineString") {
    coordinates.push(...(value.coordinates ?? []));
  } else if (value.type === "MultiLineString") {
    for (const line of value.coordinates ?? []) coordinates.push(...line);
  }
}

function toLonLat(latLon) {
  return [latLon[1], latLon[0]];
}

function uniqueStrings(values) {
  return values.filter((value, index) => typeof value === "string" && value.trim() && values.indexOf(value) === index);
}

function displayText(value, fallback = "See source") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    for (const key of ["official", "display", "label", "value", "description"]) {
      if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
    }
  }
  return fallback;
}

function estimatedTimeNotes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return (value.otherSources ?? [])
    .map((source) => {
      if (!source?.source || !source?.value) return undefined;
      return `Other timing source (${source.source}): ${source.value}`;
    })
    .filter(Boolean);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function round(value, decimals = 1) {
  return Number(value.toFixed(decimals));
}
