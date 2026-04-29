import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const RESEARCH_DIR = path.join(
  REPO_ROOT,
  "data/research/candidate-trails/stockholm-archipelago-trail",
);
const RESEARCH_PATH = path.join(RESEARCH_DIR, "trail.research.json");
const CONNECTION_PLAN_PATH = path.join(RESEARCH_DIR, "section-connection-plan.json");
const PUBLIC_CONNECTION_ROUTE_DIR = path.join(
  REPO_ROOT,
  "public/routes/hiking/stockholm-archipelago-trail/connections",
);

const OFFICIAL_SECTIONS_SOURCE = {
  provider: "Stockholm Archipelago Trail",
  url: "https://stockholmarchipelagotrail.com/section/",
  title: "Explore all sections",
  notes: "Official north-south section list, checked during Slice 2."
};

const SAT_FAQ_SOURCE = {
  provider: "Stockholm Archipelago Trail",
  url: "https://stockholmarchipelagotrail.com/questions-and-aswers/",
  title: "Questions and answers",
  notes:
    "Official ferry departure-point and North-South Line caveats. The FAQ says the 2026 North-South Line runs June 22-August 16 and exact timetables should be checked."
};

const ROWBOAT_SOURCE = {
  provider: "Stockholm Archipelago Trail",
  url: "https://stockholmarchipelagotrail.com/section/rowboats-finnhamn-ingmarso/",
  title: "Rowboats between the Finnhamn & Ingmarsö sections",
  notes:
    "Official rowboat connector page. The page describes the 400 m crossing and the requirement that one rowboat stays on each side."
};

const PLANNING_WARNING =
  "Approximate planning connection line only. Use current SL/Waxholmsbolaget/Trafikverket planning for exact ferry routes, stops, dates, request stops, and disruptions.";

const args = new Set(process.argv.slice(2));

const EXTRA_ACCESS_POINTS = {
  "sat-sandhamn-stavsnas-vinterhamn": {
    id: "sat-sandhamn-stavsnas-vinterhamn",
    sectionId: "sat-sandhamn",
    sectionName: "Sandhamn",
    name: "Stavsnäs Vinterhamn",
    type: "mainland_transfer_hub",
    coordinates: [59.2865665, 18.7043247]
  },
  "sat-nynashamn-fiskehamn": {
    id: "sat-nynashamn-fiskehamn",
    sectionId: "mainland-transfer",
    sectionName: "Mainland transfer",
    name: "Nynäshamns Fiskehamn",
    type: "mainland_transfer_hub",
    coordinates: [58.9035, 17.9505],
    coordinateSource: "approximate"
  },
  "sat-ankarudden-brygga": {
    id: "sat-ankarudden-brygga",
    sectionId: "mainland-transfer",
    sectionName: "Mainland transfer",
    name: "Ankarudden brygga",
    type: "mainland_transfer_hub",
    coordinates: [58.801328, 17.836025],
    coordinateSource: "approximate"
  }
};

const CONNECTION_DRAFTS = [
  {
    id: "sat-arholma-to-lido",
    mode: "ferry",
    fromSectionId: "sat-arholma",
    toSectionId: "sat-lido",
    fromAccessId: "sat-arholma-brygga",
    toAccessId: "sat-lido-brygga",
    operator: "Waxholmsbolaget / local northern archipelago boats",
    lineName: "Line 30 and/or summer North-South Line; planner may route via Simpnäs/Räfsnäs",
    source: SAT_FAQ_SOURCE,
    seasonality:
      "Year-round access exists through mainland piers; direct island-hopping is strongest during the summer North-South Line window.",
    note:
      "Move between Arholma and Lidö through the public boat network. Outside summer, expect a mainland transfer between Simpnäs and Räfsnäs rather than a direct island-to-island hop."
  },
  {
    id: "sat-lido-to-furusund",
    mode: "ferry",
    fromSectionId: "sat-lido",
    toSectionId: "sat-furusund",
    fromAccessId: "sat-lido-brygga",
    toAccessId: "sat-furusund-access-passenger-pier",
    operator: "Waxholmsbolaget / SL",
    lineName: "Northern archipelago ferry plus possible Räfsnäs/Furusund land transfer",
    source: SAT_FAQ_SOURCE,
    seasonality: "Planner-dependent; summer services may differ from shoulder-season services.",
    note:
      "Use Waxholmsbolaget/SL planning between Lidö/Räfsnäs and Furusund. This should render as a planning connection, not a guaranteed direct ferry."
  },
  {
    id: "sat-furusund-to-yxlan",
    mode: "ferry",
    fromSectionId: "sat-furusund",
    toSectionId: "sat-yxlan",
    fromAccessId: "sat-furusund-access-road-ferry",
    toAccessId: "sat-yxlan-access-kopmanholm",
    operator: "Trafikverket",
    lineName: "Furusundsleden road ferry",
    source: {
      provider: "Trafikverket",
      url: "https://www.trafikverket.se/resa-och-trafik/farjetrafik/furusundsleden/",
      title: "Furusundsleden"
    },
    note: "Use the free Furusund-Köpmanholm/Yxlan road ferry to continue from Furusund to the Yxlan section."
  },
  {
    id: "sat-yxlan-to-finnhamn",
    mode: "ferry",
    fromSectionId: "sat-yxlan",
    toSectionId: "sat-finnhamn",
    fromAccessId: "sat-yxlan-access-waxholmsbolaget-kopmanholm",
    toAccessId: "sat-finnhamn-access-ferry-jetty",
    operator: "Waxholmsbolaget",
    lineName: "Planner-verified ferry to Finnhamn; summer North-South Line may help",
    source: SAT_FAQ_SOURCE,
    seasonality: "Exact ferry pattern is date-specific and may require request/booking at some stops.",
    note:
      "After Yxlan, plan a ferry transfer to Finnhamn. The official Finnhamn-Ingmarsö rowboat crossing is modeled as its own following route section, not as a transfer line."
  },
  {
    id: "sat-finnhamn-to-rowboats",
    mode: "walk",
    fromSectionId: "sat-finnhamn",
    toSectionId: "sat-rowboats-finnhamn-ingmarso",
    fromAccessId: "sat-finnhamn-access-ferry-jetty",
    toAccessId: "sat-rowboats-access-idholmen-landing",
    operator: "Stockholm Archipelago Trail",
    lineName: "Local Finnhamn/Idholmen trail connection",
    source: ROWBOAT_SOURCE,
    note:
      "Walk from the Finnhamn ferry/section hub to the Idholmen rowboat landing, where the separate rowboat route section begins."
  },
  {
    id: "sat-rowboats-to-ingmarso",
    mode: "same-island",
    fromSectionId: "sat-rowboats-finnhamn-ingmarso",
    toSectionId: "sat-ingmarso",
    fromAccessId: "sat-rowboats-access-kalgardson-landing",
    toAccessId: "sat-ingmarso-access-rowboat-connection",
    operator: "Stockholm Archipelago Trail",
    lineName: "Kålgårdsön/Ingmarsö route continuity",
    source: ROWBOAT_SOURCE,
    note:
      "The rowboat section lands at Kålgårdsön, where the Ingmarsö section continues. No separate rowboat transfer line is needed."
  },
  {
    id: "sat-ingmarso-to-brotto",
    mode: "walk",
    fromSectionId: "sat-ingmarso",
    toSectionId: "sat-brotto",
    fromAccessId: "sat-ingmarso-access-sodra-brygga",
    toAccessId: "sat-brotto-ingmarso-gate-connection",
    operator: "Stockholm Archipelago Trail",
    lineName: "Ingmarsö-Brottö land connector",
    source: OFFICIAL_SECTIONS_SOURCE,
    note:
      "Ingmarsö and Brottö are connected by road/trail on land. Treat this as a walking connection rather than a ferry transfer."
  },
  {
    id: "sat-brotto-to-svartso",
    mode: "ferry",
    fromSectionId: "sat-brotto",
    toSectionId: "sat-svartso",
    fromAccessId: "sat-brotto-access-brotto-brygga",
    toAccessId: "sat-svartso-access-alsvik",
    operator: "Waxholmsbolaget",
    lineName: "Åsättra / central archipelago ferry corridor, often line 13 variants",
    source: SAT_FAQ_SOURCE,
    seasonality: "Exact stops and request/booking rules depend on date and direction.",
    note:
      "Use the public ferry network between Brottö and Svartsö, normally through the Åsättra/central archipelago corridor."
  },
  {
    id: "sat-svartso-to-moja",
    mode: "ferry",
    fromSectionId: "sat-svartso",
    toSectionId: "sat-moja",
    fromAccessId: "sat-svartso-access-soderboudd",
    toAccessId: "sat-moja-access-langvik",
    operator: "Waxholmsbolaget",
    lineName: "Central archipelago ferry corridor; planner may route via line 13/14 or North-South Line",
    source: SAT_FAQ_SOURCE,
    seasonality: "Summer North-South Line may simplify this; off-season routing is planner-dependent.",
    note:
      "Connect Svartsö and Möja through Waxholmsbolaget planning. Söderboudd to Långvik is a useful map-level planning line, not a promised direct sailing."
  },
  {
    id: "sat-moja-to-grinda",
    mode: "ferry",
    fromSectionId: "sat-moja",
    toSectionId: "sat-grinda",
    fromAccessId: "sat-moja-access-berg",
    toAccessId: "sat-grinda-access-sodra-grinda",
    operator: "Waxholmsbolaget",
    lineName: "Central archipelago ferry corridor; planner or North-South Line",
    source: SAT_FAQ_SOURCE,
    seasonality: "Date-specific; exact departures should stay planner-driven.",
    note:
      "Use current ferry planning between Möja and Grinda. The map connection should show the island-hop relationship without implying a live timetable."
  },
  {
    id: "sat-grinda-to-sandhamn",
    mode: "ferry",
    fromSectionId: "sat-grinda",
    toSectionId: "sat-sandhamn",
    fromAccessId: "sat-grinda-access-sodra-grinda",
    toAccessId: "sat-sandhamn-access-sandhamn-brygga",
    operator: "Waxholmsbolaget",
    lineName: "Stockholm/Vaxholm/Sandhamn corridor or North-South Line",
    source: SAT_FAQ_SOURCE,
    seasonality: "Usually planner-dependent; some options may require transfer via Stockholm, Vaxholm, or Stavsnäs.",
    note:
      "Plan Grinda to Sandhamn as a ferry transfer using the current public boat network. Render as a high-level planning route only."
  },
  {
    id: "sat-sandhamn-to-runmaro",
    mode: "ferry",
    fromSectionId: "sat-sandhamn",
    toSectionId: "sat-runmaro",
    fromAccessId: "sat-sandhamn-access-sandhamn-brygga",
    toAccessId: "sat-runmaro-access-styrsvik",
    viaAccessIds: ["sat-sandhamn-stavsnas-vinterhamn"],
    operator: "Waxholmsbolaget",
    lineName: "Sandhamn-Stavsnäs plus Stavsnäs-Runmarö planning transfer",
    source: SAT_FAQ_SOURCE,
    seasonality: "Planner-dependent; check exact date and pier semaphore/request rules.",
    note:
      "Connect Sandhamn and Runmarö via the Stavsnäs ferry hub unless a direct planner result exists for the hiking date."
  },
  {
    id: "sat-runmaro-to-namdo",
    mode: "ferry",
    fromSectionId: "sat-runmaro",
    toSectionId: "sat-namdo",
    fromAccessId: "sat-runmaro-access-styrsvik",
    toAccessId: "sat-namdo-access-solvik",
    viaAccessIds: ["sat-runmaro-access-stavsnas-vinterhamn"],
    operator: "Waxholmsbolaget",
    lineName: "Stavsnäs southern/central archipelago ferry transfer",
    source: SAT_FAQ_SOURCE,
    seasonality: "Planner-dependent with possible request stops.",
    note:
      "Use the Stavsnäs ferry hub to move between Runmarö and Nämdö unless the current planner provides a direct sailing."
  },
  {
    id: "sat-namdo-to-orno",
    mode: "ferry",
    fromSectionId: "sat-namdo",
    toSectionId: "sat-orno",
    fromAccessId: "sat-namdo-access-solvik",
    toAccessId: "sat-orno-access-hasselmara",
    viaAccessIds: ["sat-namdo-access-stavsnas-vinterhamn", "sat-orno-access-dalaro-hotellbryggan"],
    operator: "Waxholmsbolaget / SL",
    lineName: "Stavsnäs or Dalarö transfer; North-South Line may help in summer",
    source: SAT_FAQ_SOURCE,
    seasonality: "This is a compound transfer and should stay planner-verified.",
    note:
      "Nämdö to Ornö is not a simple fixed connection in this plan. Use public transport planning, likely via Stavsnäs/Dalarö or the summer North-South Line."
  },
  {
    id: "sat-orno-to-fjardlang",
    mode: "ferry",
    fromSectionId: "sat-orno",
    toSectionId: "sat-fjardlang",
    fromAccessId: "sat-orno-access-orno-church-quay",
    toAccessId: "sat-fjardlang-access-fjardlang-brygga",
    viaAccessIds: ["sat-orno-access-dalaro-hotellbryggan"],
    operator: "Waxholmsbolaget",
    lineName: "Dalarö southern archipelago ferry transfer, often line 19 patterns",
    source: SAT_FAQ_SOURCE,
    seasonality: "Exact stop sequence and dates should be planner-driven.",
    note:
      "Connect Ornö and Fjärdlång through the Dalarö ferry corridor. The map line is a planning shape, not a direct ferry-track guarantee."
  },
  {
    id: "sat-fjardlang-to-uto",
    mode: "ferry",
    fromSectionId: "sat-fjardlang",
    toSectionId: "sat-uto",
    fromAccessId: "sat-fjardlang-access-fjardlang-brygga",
    toAccessId: "sat-uto-access-gruvbryggan-line-21",
    operator: "Waxholmsbolaget",
    lineName: "Dalarö/Utö or summer North-South Line planning transfer",
    source: SAT_FAQ_SOURCE,
    seasonality: "Planner-dependent; direct/static summer patterns should not be hardcoded.",
    note:
      "Plan Fjärdlång to Utö through Waxholmsbolaget. The connection can be direct or transfer-based depending on date."
  },
  {
    id: "sat-uto-to-uto-alo-connector",
    mode: "walk",
    fromSectionId: "sat-uto",
    toSectionId: "sat-uto-alo-connector",
    fromAccessId: "sat-uto-access-spranga-brygga-line-21",
    toAccessId: "sat-uto-alo-connector-continuity-access",
    operator: "Stockholm Archipelago Trail",
    lineName: "Utö-Ålö walked connector continuity",
    source: OFFICIAL_SECTIONS_SOURCE,
    note:
      "Continue by land from the Utö section into the Utö-Ålö connector."
  },
  {
    id: "sat-uto-alo-connector-to-alo",
    mode: "walk",
    fromSectionId: "sat-uto-alo-connector",
    toSectionId: "sat-alo",
    fromAccessId: "sat-uto-alo-connector-continuity-access",
    toAccessId: "sat-alo-access-alo-brygga-line-22-nynashamn",
    operator: "Stockholm Archipelago Trail",
    lineName: "Ålö Bridge / Ålö land continuation",
    source: OFFICIAL_SECTIONS_SOURCE,
    note:
      "Continue by land from the Utö-Ålö connector into the Ålö section."
  },
  {
    id: "sat-alo-to-rano",
    mode: "ferry",
    fromSectionId: "sat-alo",
    toSectionId: "sat-rano",
    fromAccessId: "sat-alo-access-alo-brygga-line-22-nynashamn",
    toAccessId: "sat-rano-access-rano-brygga-line-22-nynashamn",
    operator: "Waxholmsbolaget / Utö Express",
    lineName: "Line 22A/22B Nynäshamn-Nåttarö-Ålö",
    source: SAT_FAQ_SOURCE,
    seasonality: "Current line 22 exact times are date-specific; use live planner.",
    note:
      "Use line 22 planning between Ålö and Rånö. The line normally also serves Nåttarö in the southern archipelago chain."
  },
  {
    id: "sat-rano-to-nattaro",
    mode: "ferry",
    fromSectionId: "sat-rano",
    toSectionId: "sat-nattaro",
    fromAccessId: "sat-rano-access-rano-brygga-line-22-nynashamn",
    toAccessId: "sat-nattaro-ferry-quay",
    operator: "Waxholmsbolaget / Utö Express",
    lineName: "Line 22A/22B Nynäshamn-Nåttarö-Ålö",
    source: SAT_FAQ_SOURCE,
    seasonality: "Current line 22 exact times are date-specific; use live planner.",
    note:
      "Use line 22 planning between Rånö and Nåttarö."
  },
  {
    id: "sat-nattaro-to-landsort",
    mode: "ferry",
    fromSectionId: "sat-nattaro",
    toSectionId: "sat-landsort",
    fromAccessId: "sat-nattaro-ferry-quay",
    toAccessId: "sat-landsort-east-harbor-ferry",
    viaAccessIds: ["sat-nynashamn-fiskehamn", "sat-ankarudden-brygga"],
    operator: "Waxholmsbolaget / SL",
    lineName: "Line 22 to Nynäshamn, SL 852 to Ankarudden, line 29 to Landsort",
    source: SAT_FAQ_SOURCE,
    seasonality:
      "Compound transfer. Line 29 docking on Landsort can shift between harbours depending on weather and ice; exact summer static schedules should stay live-planner-only until current.",
    note:
      "There is no normal direct continuation from Nåttarö to Landsort. Return to the mainland, transfer from Nynäshamn to Ankarudden, then take the Landsort ferry."
  }
];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toLonLat([lat, lon]) {
  return [lon, lat];
}

function routePathFor(connectionId) {
  return `/routes/hiking/stockholm-archipelago-trail/connections/${connectionId}.geojson`;
}

function orderedSectionsForRoute(research) {
  const sections = [...(research.sections ?? [])];
  const rowboatIndex = sections.findIndex((section) => section.id === "sat-rowboats-finnhamn-ingmarso");
  const finnhamnIndex = sections.findIndex((section) => section.id === "sat-finnhamn");

  if (rowboatIndex !== -1 && finnhamnIndex !== -1 && rowboatIndex < finnhamnIndex) {
    const [rowboatSection] = sections.splice(rowboatIndex, 1);
    const updatedFinnhamnIndex = sections.findIndex((section) => section.id === "sat-finnhamn");
    sections.splice(updatedFinnhamnIndex + 1, 0, rowboatSection);
  }

  return sections;
}

function collectAccessPoints(research) {
  const accessPoints = new Map(Object.entries(EXTRA_ACCESS_POINTS));

  for (const section of research.sections ?? []) {
    const addRecord = (record, origin) => {
      if (!isObject(record) || !record.id || !Array.isArray(record.coordinates)) return;
      accessPoints.set(record.id, {
        id: record.id,
        sectionId: section.id,
        sectionName: section.name,
        name: record.name,
        type: record.type,
        coordinates: record.coordinates,
        coordinateSource: record.coordinateSource ?? "research",
        origin
      });
    };

    const accessRecords = Array.isArray(section.accessMetadataDraft)
      ? section.accessMetadataDraft
      : isObject(section.accessMetadataDraft)
        ? [section.accessMetadataDraft]
        : [];
    for (const record of accessRecords) addRecord(record, "accessMetadataDraft");
    for (const record of section.facilitiesDraft ?? []) {
      if (["transit", "transport"].includes(record.type)) addRecord(record, "facilitiesDraft");
    }
  }

  return accessPoints;
}

function connectionEndpoint(sectionId, accessId, accessPoints) {
  const accessPoint = accessPoints.get(accessId);
  if (!accessPoint) throw new Error(`Missing access point "${accessId}" for ${sectionId}`);
  return {
    sectionId,
    label: accessPoint.name,
    coordinates: accessPoint.coordinates,
    coordinateSource: accessPoint.coordinateSource === "approximate" ? "approximate" : "transit-stop"
  };
}

function buildConnection(draft, accessPoints) {
  const via = (draft.viaAccessIds ?? []).map((accessId) => {
    const accessPoint = accessPoints.get(accessId);
    if (!accessPoint) throw new Error(`Missing via access point "${accessId}" for ${draft.id}`);
    return {
      id: accessPoint.id,
      label: accessPoint.name,
      coordinates: accessPoint.coordinates,
      coordinateSource: accessPoint.coordinateSource === "approximate" ? "approximate" : "transit-stop"
    };
  });

  const route =
    draft.mode === "same-island" || draft.mode === "none"
      ? null
      : {
          geojsonPath: routePathFor(draft.id),
          geometryStatus: "approximate-waypoint-corridor",
          mapConfidence: draft.mode === "rowboat" || draft.mode === "walk" ? "high" : "medium",
          navigationUse: "planning-reference",
          sourceFormat: "manual",
          warning: PLANNING_WARNING
        };

  return {
    id: draft.id,
    mode: draft.mode,
    from: connectionEndpoint(draft.fromSectionId, draft.fromAccessId, accessPoints),
    to: connectionEndpoint(draft.toSectionId, draft.toAccessId, accessPoints),
    ...(via.length ? { via } : {}),
    operator: draft.operator,
    lineName: draft.lineName,
    ...(draft.seasonality ? { seasonality: draft.seasonality } : {}),
    ...(draft.mode === "same-island"
      ? {}
      : { currentness: "Planner/timetable-dependent. Do not store exact departures in this static connection plan." }),
    note: draft.note,
    source: draft.source,
    ...(route ? { route } : {})
  };
}

function routeFeatureFor(connection) {
  const points = [connection.from, ...(connection.via ?? []), connection.to].map((point) => point.coordinates);
  return {
    type: "FeatureCollection",
    name: `${connection.id} connection route`,
    features: [
      {
        type: "Feature",
        properties: {
          id: connection.id,
          activity: "hiking",
          itemType: "trail-connection",
          mode: connection.mode,
          fromSectionId: connection.from.sectionId,
          toSectionId: connection.to.sectionId,
          name: `${connection.from.label} to ${connection.to.label}`,
          operator: connection.operator,
          lineName: connection.lineName,
          geometryStatus: connection.route.geometryStatus,
          mapConfidence: connection.route.mapConfidence,
          navigationUse: connection.route.navigationUse,
          warning: connection.route.warning
        },
        geometry: {
          type: "LineString",
          coordinates: points.map(toLonLat)
        }
      }
    ]
  };
}

function validatePlan(research, connections, orderedSections) {
  const researchSectionIds = new Set((research.sections ?? []).map((section) => section.id));
  const sectionIds = orderedSections.map((section) => section.id);
  const sectionIdSet = new Set(sectionIds);
  const expectedConnectionCount = Math.max(0, sectionIds.length - 1);
  const errors = [];

  if (sectionIds.length !== researchSectionIds.size) {
    errors.push(`Expected route order to contain ${researchSectionIds.size} sections, found ${sectionIds.length}`);
  }
  for (const sectionId of sectionIds) {
    if (!researchSectionIds.has(sectionId)) errors.push(`Route order contains unknown research section ${sectionId}`);
  }
  for (const sectionId of researchSectionIds) {
    if (!sectionIdSet.has(sectionId)) errors.push(`Route order is missing research section ${sectionId}`);
  }

  if (connections.length !== expectedConnectionCount) {
    errors.push(`Expected ${expectedConnectionCount} adjacent connections, found ${connections.length}`);
  }

  const connectionByPair = new Set(connections.map((connection) => `${connection.from.sectionId}->${connection.to.sectionId}`));
  for (let index = 1; index < sectionIds.length; index += 1) {
    const pair = `${sectionIds[index - 1]}->${sectionIds[index]}`;
    if (!connectionByPair.has(pair)) errors.push(`Missing adjacent connection ${pair}`);
  }

  for (const connection of connections) {
    if (!sectionIdSet.has(connection.from.sectionId)) errors.push(`${connection.id} has unknown from section ${connection.from.sectionId}`);
    if (!sectionIdSet.has(connection.to.sectionId)) errors.push(`${connection.id} has unknown to section ${connection.to.sectionId}`);
    if (connection.mode === "unknown") errors.push(`${connection.id} still has unknown mode`);
    for (const endpoint of [connection.from, ...(connection.via ?? []), connection.to]) {
      if (!Array.isArray(endpoint.coordinates) || endpoint.coordinates.length !== 2) {
        errors.push(`${connection.id} endpoint ${endpoint.label} is missing coordinates`);
      }
    }
    if (!["same-island", "none"].includes(connection.mode) && !connection.route?.geojsonPath) {
      errors.push(`${connection.id} is missing route.geojsonPath`);
    }
  }

  if (errors.length) throw new Error(errors.join("\n"));
}

function createPlan(research) {
  const accessPoints = collectAccessPoints(research);
  const orderedSections = orderedSectionsForRoute(research);
  const connections = CONNECTION_DRAFTS.map((draft) => buildConnection(draft, accessPoints));
  validatePlan(research, connections, orderedSections);

  return {
    planVersion: 1,
    sourceTrailId: research.id,
    sourceCreatedAt: research.createdAt,
    generatedBy: path.relative(REPO_ROOT, fileURLToPath(import.meta.url)),
    sourcePath: path.relative(REPO_ROOT, RESEARCH_PATH),
    purpose:
      "Slice 2 ferry/transfer mapping for Stockholm Archipelago Trail. The official Finnhamn-Ingmarsö rowboat crossing is modeled as a route section; remaining transfer lines are planning connection routes, not navigation tracks or timetable promises.",
    sourceUrls: [OFFICIAL_SECTIONS_SOURCE, SAT_FAQ_SOURCE, ROWBOAT_SOURCE],
    currentness:
      "Static route relationships are captured here. Exact ferry departures, request stops, summer timetables, route deviations, weather docking, and disruptions must be checked in live official planners.",
    officialSectionOrder: orderedSections.map((section, index) => ({
      order: index + 1,
      id: section.id,
      name: section.name,
      sectionType: section.sectionType ?? "section",
      transferMode: section.transferMode ?? null
    })),
    coverage: {
      sectionCount: research.sections?.length ?? 0,
      adjacentConnectionCount: connections.length,
      modes: Object.fromEntries(
        [...new Set(connections.map((connection) => connection.mode))]
          .sort()
          .map((mode) => [mode, connections.filter((connection) => connection.mode === mode).length])
      ),
      allAdjacentOfficialPairsCovered: true
    },
    connections
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeConnectionRoutes(connections) {
  await mkdir(PUBLIC_CONNECTION_ROUTE_DIR, { recursive: true });
  const expectedFiles = new Set(
    connections
      .filter((connection) => connection.route?.geojsonPath)
      .map((connection) => `${connection.id}.geojson`)
  );
  const existingFiles = await readdir(PUBLIC_CONNECTION_ROUTE_DIR).catch(() => []);
  await Promise.all(
    existingFiles
      .filter((file) => file.endsWith(".geojson") && !expectedFiles.has(file))
      .map((file) => rm(path.join(PUBLIC_CONNECTION_ROUTE_DIR, file), { force: true })),
  );
  await Promise.all(
    connections
      .filter((connection) => connection.route?.geojsonPath)
      .map((connection) =>
        writeJson(path.join(PUBLIC_CONNECTION_ROUTE_DIR, `${connection.id}.geojson`), routeFeatureFor(connection)),
      ),
  );
}

async function generatedTexts() {
  const research = JSON.parse(await readFile(RESEARCH_PATH, "utf8"));
  const plan = createPlan(research);
  const files = new Map([[CONNECTION_PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`]]);
  for (const connection of plan.connections.filter((candidate) => candidate.route?.geojsonPath)) {
    files.set(
      path.join(PUBLIC_CONNECTION_ROUTE_DIR, `${connection.id}.geojson`),
      `${JSON.stringify(routeFeatureFor(connection), null, 2)}\n`,
    );
  }
  return { plan, files };
}

async function main() {
  const { plan, files } = await generatedTexts();

  if (args.has("--check")) {
    for (const [filePath, expected] of files) {
      const existing = await readFile(filePath, "utf8").catch(() => null);
      if (existing !== expected) {
        console.error(`${path.relative(REPO_ROOT, filePath)} is stale. Run npm run data:sat:connection-plan.`);
        process.exitCode = 1;
        return;
      }
    }
    console.log("Stockholm Archipelago Trail connection plan is up to date.");
    return;
  }

  await mkdir(RESEARCH_DIR, { recursive: true });
  await writeJson(CONNECTION_PLAN_PATH, plan);
  await writeConnectionRoutes(plan.connections);
  const drawableConnectionCount = plan.connections.filter((connection) => connection.route?.geojsonPath).length;
  console.log(`Wrote ${path.relative(REPO_ROOT, CONNECTION_PLAN_PATH)}.`);
  console.log(`Wrote ${drawableConnectionCount} connection route GeoJSON files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
