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
  },
  ostkustleden: {
    name: "Ostkustleden",
    region: "Kalmar län",
    country: "Sweden",
    difficulty: "Moderate",
    estimatedTime: "8 stages",
    season: "Year-round when conditions permit",
    routeType: "Point to point",
    description:
      "A circular multi-stage trail in Oskarshamn municipality, linking overnight cabins, forests, lakes and Småland coastal landscapes through eight official stages.",
    gettingThere:
      "Use the selected section endpoints for access planning. Lilla Hycklinge and Oskarshamn-area access are the strongest anchors; cabin endpoints and rural roads need current transport checks.",
    utilities: [
      "Overnight cabins, dry toilets, parking and service points are unevenly distributed by stage.",
      "Cabin, water, fire and seasonal service conditions should be checked before relying on them."
    ],
    waterSources: [
      "Use only listed verified water points as refill context.",
      "Natural lakes and streams should be treated before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Whole-trail headline distance varies by source; runtime distance uses the normalized section display distances."
    ],
    source: {
      provider: "doderhult/naturkartan-candidate-research",
      url: "https://doderhult.naturskyddsforeningen.se/ostkustleden/",
      lastFetchedAt: "2026-04-30"
    }
  },
  "vastra-vatterleden": {
    name: "Västra Vätterleden",
    region: "Västra Götalands län / Jönköpings län",
    country: "Sweden",
    difficulty: "Moderate",
    estimatedTime: "8 stages",
    season: "April-October",
    routeType: "Point to point",
    description:
      "A long-distance trail on the western side of Vättern from the Tiveden/Stenkällegården area toward Mullsjö, with forest, lake, canal and town sections.",
    gettingThere:
      "Use the selected section endpoints for access planning. Forsvik, Hjo, Hökensås/Fagerhult and Mullsjö have the strongest access context; several rural endpoints need current timetable checks.",
    utilities: [
      "Services are concentrated around towns, campgrounds and established trailheads.",
      "Route variants, business opening hours and rural transit should be checked before publication."
    ],
    waterSources: [
      "No natural water should be treated as potable unless a selected section lists a verified source.",
      "Carry water on longer forest stages and treat natural water."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Runtime import uses the normalized primary section geometry; alternate route variants remain caveated in section notes."
    ],
    source: {
      provider: "vastsverige/skaraborgsleder-candidate-research",
      url: "https://www.vastsverige.com/skovde/leder/vastra-vatterleden/",
      lastFetchedAt: "2026-04-30"
    }
  },
  hallandsleden: {
    name: "Hallandsleden",
    region: "Hallands län / Västra Götalands län / Skåne län",
    country: "Sweden",
    difficulty: "Varied",
    estimatedTime: "35 stages",
    season: "April-October",
    routeType: "Trail network",
    description:
      "A long-distance trail network through Halland, with northern, central, southern and coastal chains linking forests, lakes, towns, beaches and protected areas.",
    gettingThere:
      "Use the selected chain and section endpoints for access planning. Kungsbacka, Varberg, Ullared, Oskarström, Halmstad, Knäred and Båstad have the strongest public-transport context; several rural endpoints need current timetable checks.",
    utilities: [
      "Services vary sharply by chain and section; town and resort endpoints are much stronger than inland forest stages.",
      "Shelters, drinking water, toilets, fire permissions, coastal rules, opening hours and transit should be checked before publication."
    ],
    waterSources: [
      "Use only listed verified water points as refill context.",
      "No natural water should be treated as potable without treatment."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "The official overview headline is about 612 km; runtime distance uses the normalized section display distances.",
      "The coastal route has an official gap between Frillesås and Steninge until future coastal stages are published.",
      "Protected-area, beach, dog, hunting, forestry and fire-currentness warnings remain publication-time checks."
    ],
    selectableRouteGroupKinds: ["mainline", "branch"],
    routeGroupNames: {
      "hallandsleden-norra": "Norra delleden",
      "hallandsleden-varberg-branch": "Varberg-Åkulla",
      "hallandsleden-mellersta-west": "Mellersta västra grenen",
      "hallandsleden-mellersta-east": "Mellersta östra grenen",
      "hallandsleden-sodra-west": "Södra västra grenen",
      "hallandsleden-sodra-gyltige-branch": "Kvarnforsen-Gyltige",
      "hallandsleden-sodra-east": "Södra östra grenen",
      "hallandsleden-kustleden-north": "Kusten norr",
      "hallandsleden-kustleden-south": "Kusten söder"
    },
    source: {
      provider: "hallandsleden/official-gpx-candidate-research",
      url: "https://hallandsleden.se/",
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
  const orderedSections = [...(routeSections.sections ?? [])]
    .sort((left, right) => sectionOrderValue(left) - sectionOrderValue(right))
    .map((section) =>
      toRuntimeSection(trailId, section, sectionGeometryById.get(section.sectionId), normalFacilitiesBySectionId.get(section.sectionId) ?? [])
    );
  const runtimeRouteGroups = toRuntimeRouteGroups(routeTopology.routeGroups ?? [], config);
  const runtimeConnections = toRuntimeConnections(routeTopology.connections ?? [], orderedSections);
  const locationStart = orderedSections[0]?.endpointCoordinates?.start;
  const bounds = await routeBounds(trailId, orderedSections, sectionGeometryById);
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
    routeGroups: runtimeRouteGroups,
    connections: runtimeConnections,
    presets: buildPresets(orderedSections, runtimeRouteGroups)
  };
}

function toRuntimeSection(trailId, section, geometryRecord, normalFacilities) {
  const routePath = `/routes/hiking/${trailId}/sections/${section.sectionId}.geojson`;
  const timingNotes = estimatedTimeNotes(section.estimatedTime);
  const caveatNotes = uniqueStrings([...(section.caveats ?? []), ...timingNotes]).slice(0, 6);
  const endpointCoordinates = {
    source: "candidate-normalized-route",
    start: endpointLatLon(section.endpoints, "start"),
    end: endpointLatLon(section.endpoints, "end")
  };
  return {
    id: section.sectionId,
    stageNumber: section.sectionNumber ?? section.order,
    name: section.name,
    from: section.from,
    to: section.to,
    distanceKm: section.distance?.displayDistanceKm ?? section.distance?.officialDistanceKm ?? section.sourceSummary?.computedDistanceKm,
    estimatedTime: estimatedTimeDisplay(section.estimatedTime),
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
    endpointCoordinates
  };
}

function groupNormalFacilities(records) {
  const grouped = new Map();
  for (const record of records) {
    if (record.state !== "normal") continue;
    if (!record.sectionId) continue;
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
    ...(isLatLonPair(record.coordinatesLatLon) ? { coordinates: record.coordinatesLatLon } : {}),
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

function toRuntimeRouteGroups(routeGroups, config) {
  const selectableKinds = new Set(config.selectableRouteGroupKinds ?? ["mainline"]);
  return routeGroups.map((group) => ({
    id: group.groupId ?? group.id,
    name: config.routeGroupNames?.[group.groupId ?? group.id] ?? group.name ?? humanizeId(group.groupId ?? group.id),
    kind: selectableKinds.has(group.kind) ? "mainline" : group.kind,
    sectionIds: group.sectionIds ?? [],
    connectsToSectionIds: group.connectsToSectionIds ?? [],
    notice: group.status
      ? `Imported from candidate topology: ${group.status}${selectableKinds.has(group.kind) && group.kind !== "mainline" ? `; candidate ${group.kind} shown as a selectable chain` : ""}.`
      : undefined
  }));
}

function toRuntimeConnections(connections, sections) {
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  return connections
    .filter((connection) => connection.fromSectionId && connection.toSectionId)
    .map((connection) => {
      const fromSection = sectionById.get(connection.fromSectionId);
      const toSection = sectionById.get(connection.toSectionId);
      const fromCoordinates = fromSection?.endpointCoordinates?.end;
      const toCoordinates = toSection?.endpointCoordinates?.start;
      const mode = connection.mode && isLatLonPair(fromCoordinates) && isLatLonPair(toCoordinates) ? connection.mode : "none";
      return {
        id: connection.connectionId,
        mode,
        from: {
          sectionId: connection.fromSectionId,
          label: fromSection?.to ?? fromSection?.name ?? connection.fromSectionId,
          coordinates: fromCoordinates,
          coordinateSource: "route-geometry"
        },
        to: {
          sectionId: connection.toSectionId,
          label: toSection?.from ?? toSection?.name ?? connection.toSectionId,
          coordinates: toCoordinates,
          coordinateSource: "route-geometry"
        },
        currentness: connection.status ? humanizeId(connection.status) : undefined,
        note: connection.importPolicy ?? connection.status ?? "Candidate topology connection.",
        source: {
          provider: "candidate-route-topology",
          url: "",
          lastFetchedAt: "2026-04-30"
        }
      };
    });
}

function buildPresets(sections, routeGroups) {
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const primaryGroups = routeGroups.filter((group) => group.kind === "mainline");
  const groups = primaryGroups.length ? primaryGroups : routeGroups;
  const presets = [];
  for (const group of groups) {
    const groupSections = group.sectionIds.map((sectionId) => sectionById.get(sectionId)).filter(Boolean);
    if (!groupSections.length) continue;
    const isOnlyGroup = groups.length === 1;
    presets.push({
      id: isOnlyGroup ? "full-route" : `full-${group.id}`,
      name: isOnlyGroup ? "Full route" : `Full ${group.name}`,
      description: `All ${groupSections.length} stage${groupSections.length === 1 ? "" : "s"} in ${group.name}.`,
      startSectionId: groupSections[0].id,
      endSectionId: groupSections.at(-1).id
    });
  }

  if (sections.length >= 2 && groups.length <= 1) {
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
  const routeGeometryIndex = await readJson(
    path.join(candidateRoot, trailId, "normalized-candidate/route-geometry-index.research.json")
  );
  const sectionGeometryById = new Map((routeGeometryIndex.sections ?? []).map((section) => [section.sectionId, section]));
  const routeDir = path.join(publicRoutesRoot, trailId, "sections");
  await rm(routeDir, { recursive: true, force: true });
  await mkdir(routeDir, { recursive: true });
  await Promise.all(
    sections.map(async (section) => {
      const sourcePath = routeGeometryPath(trailId, section, sectionGeometryById.get(section.id));
      const candidateGeojson = await readJson(sourcePath);
      const featureCollection = toRouteFeatureCollection(trailId, section, candidateGeojson);
      await writeJson(path.join(routeDir, `${section.id}.geojson`), featureCollection);
    })
  );
}

function toRouteFeatureCollection(trailId, section, candidateGeojson) {
  const features = runtimeRouteFeatures(candidateGeojson);
  return {
    type: "FeatureCollection",
    features: features.map((feature, index) => ({
      type: "Feature",
      properties: {
        ...(feature.properties ?? {}),
        id: section.id,
        trailSystemId: trailId,
        sectionId: section.id,
        name: section.name,
        part: index + 1,
        source: "candidate-normalized-geojson"
      },
      geometry: feature?.geometry ?? candidateGeojson
    }))
  };
}

async function routeBounds(trailId, sections, sectionGeometryById) {
  const coordinates = [];
  for (const section of sections) {
    const routePath = routeGeometryPath(trailId, section, sectionGeometryById.get(section.id));
    try {
      const geojson = await readJson(routePath);
      collectCoordinates({ type: "FeatureCollection", features: runtimeRouteFeatures(geojson) }, coordinates);
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

function routeGeometryPath(trailId, section, geometryRecord) {
  const declaredPath = geometryRecord?.candidateGeojsonFiles?.[0];
  if (declaredPath) return path.resolve(projectRoot, declaredPath);
  return path.join(candidateRoot, trailId, "geometry/candidate/sections", `${section.id}.geojson`);
}

function runtimeRouteFeatures(candidateGeojson) {
  const features =
    candidateGeojson.type === "FeatureCollection"
      ? candidateGeojson.features ?? []
      : [{ type: "Feature", properties: {}, geometry: candidateGeojson.type === "Feature" ? candidateGeojson.geometry : candidateGeojson }];
  const primaryFeatures = features.filter((feature) => {
    const role = String(feature.properties?.role ?? "").toLowerCase();
    return role === "mainline" || role === "mainline-primary" || role.includes("mainline-primary");
  });
  return primaryFeatures.length ? primaryFeatures : features;
}

function toLonLat(latLon) {
  return [latLon[1], latLon[0]];
}

function endpointLatLon(endpoints, position) {
  const keys =
    position === "start"
      ? ["start", "continuousTrailStart", "officialNamedStart", "startStageGoalCandidate"]
      : ["end", "endForTrailContinuity", "officialNamedEnd", "endStageGoalCandidate"];
  for (const key of keys) {
    const coordinates = endpoints?.[key]?.coordinatesLatLon;
    if (isLatLonPair(coordinates)) return coordinates;
  }
  return undefined;
}

function sectionOrderValue(section) {
  if (typeof section.order === "number" && Number.isFinite(section.order)) return section.order;
  if (typeof section.sectionNumber === "number" && Number.isFinite(section.sectionNumber)) return section.sectionNumber;
  const match = String(section.sectionNumber ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function isLatLonPair(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)) &&
    Math.abs(value[0]) <= 90 &&
    Math.abs(value[1]) <= 180
  );
}

function uniqueStrings(values) {
  return values.filter((value, index) => typeof value === "string" && value.trim() && values.indexOf(value) === index);
}

function estimatedTimeDisplay(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof value.official === "string" && value.official.trim()) {
    return value.official.trim();
  }
  return "No official estimate";
}

function estimatedTimeNotes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const notes = [];
  for (const key of ["note", "notes"]) {
    if (typeof value[key] === "string" && value[key].trim()) notes.push(`Timing note: ${value[key].trim()}`);
  }
  if (typeof value.derived === "string" && value.derived.trim()) {
    notes.push(`Derived timing context, not official: ${value.derived.trim()}`);
  }
  notes.push(...(value.otherSources ?? [])
    .map((source) => {
      if (!source?.source || !source?.value) return undefined;
      return `Other timing source (${source.source}): ${source.value}`;
    })
    .filter(Boolean));
  return notes;
}

function humanizeId(value) {
  return String(value ?? "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
