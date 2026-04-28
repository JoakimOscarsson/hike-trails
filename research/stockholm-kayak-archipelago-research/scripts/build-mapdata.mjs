import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "mapdata");

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const slug = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const point = (lat, lon, source = "gazetteer-approximate") => ({
  lat,
  lon,
  source,
});

const gazetteer = new Map(
  Object.entries({
    // Stockholm city and Mälaren.
    "långholmen": point(59.3212, 18.0276),
    "långholmen pålsundskanalen": point(59.3195, 18.0305),
    "pålsundskanalen": point(59.3195, 18.0305),
    "tantolunden": point(59.3135, 18.041),
    "reimersholme": point(59.318, 18.0245),
    "hornstull": point(59.3163, 18.0336),
    "kristineberg kajakkompaniet": point(59.334, 18.004),
    "karlbergskanalen": point(59.338, 18.031),
    "stockholm city hall": point(59.3275, 18.054),
    "norr mälarstrand": point(59.3223, 18.043),
    "djurgårdskanalen": point(59.333, 18.145),
    "djurgårdskanalen east": point(59.333, 18.155),
    "frescati": point(59.366, 18.057),
    "frescati kayakomat or brunnsvikens kanotklubb": point(59.366, 18.057),
    "bergianska trädgården": point(59.366, 18.049),
    "hagaparken": point(59.362, 18.026),
    "frösundavik": point(59.369, 18.021),
    "brunnsviken": point(59.36, 18.045),
    "brunnsvikens kanotklubb frescati": point(59.366, 18.057),
    "ålkistan": point(59.36, 18.075),
    "bockholmen": point(59.37, 18.08),
    "stocksundet": point(59.38, 18.07),
    "edsviken": point(59.41, 17.99),
    "edsberg edsviken": point(59.44, 17.96),
    "sicklasjön sickla kanal area": point(59.302, 18.125),
    "sicklasjön": point(59.302, 18.125),
    "järlasjön": point(59.305, 18.168),
    "kolbottensjön": point(59.307, 18.218),
    "duvnäsviken": point(59.302, 18.236),
    "baggensstäket": point(59.298, 18.287),
    "baggensfjärden": point(59.287, 18.295),
    "söderkajak vinterviksvägen 52": point(59.309, 17.996),
    "vinterviken": point(59.309, 17.996),
    "rotholmen": point(59.312, 17.984),
    "lindholmen": point(59.317, 17.967),
    "fågelön": point(59.3, 17.89),
    "kärsön": point(59.322, 17.905),
    "drottningholm": point(59.321, 17.886),
    "essingeöarna": point(59.321, 18.0),
    "kungsholmen": point(59.332, 18.035),
    "liljeholmsbron": point(59.312, 18.025),
    "loopen": point(59.309, 18.027),
    "årsta holmar": point(59.303, 18.055),
    "skanstullsbron": point(59.306, 18.077),
    "hammarbyslussen": point(59.304, 18.083),
    "drevviken gudö area": point(59.207, 18.198),
    "drevviken": point(59.21, 18.12),
    "gudö å": point(59.207, 18.198),
    "långsjön": point(59.209, 18.23),
    "gammelströmmen": point(59.213, 18.246),
    "tyresö flaten": point(59.222, 18.255),
    "nyfors": point(59.225, 18.268),
    "albysjön": point(59.234, 18.285),
    "uddbyviken": point(59.244, 18.3),
    "kalvfjärden": point(59.24, 18.35),

    // Vaxholm and central archipelago.
    "skärgårdens kanotcenter vaxholm": point(59.426, 18.333),
    "skärgårdens kanotcenter resarö": point(59.426, 18.333),
    "skärgårdens kanotcenter resarö or lillsved boda a to b": point(59.426, 18.333),
    "skärgårdens kanotcenter or alternate pickup": point(59.426, 18.333),
    "resarö": point(59.426, 18.333),
    "bogesund nature reserve": point(59.399, 18.25),
    "vaxholm fortress": point(59.403, 18.36),
    "norrhamn": point(59.406, 18.35),
    "tenö beach": point(59.426, 18.405),
    "tynningö": point(59.392, 18.4),
    "björnholmen": point(59.372, 18.42),
    "oxdjupet": point(59.392, 18.45),
    "stegesundet": point(59.405, 18.39),
    "grinda": point(59.411, 18.56),
    "gällnö": point(59.392, 18.64),
    "gällnö coast": point(59.392, 18.64),
    "svartsö": point(59.443, 18.74),
    "lådna": point(59.421, 18.705),
    "hjälmö lådna": point(59.43, 18.68),
    "träskö storö": point(59.43, 18.76),
    "norra stavsudda": point(59.42, 18.82),
    "finnhamn": point(59.48, 18.82),
    "husarö": point(59.51, 18.87),
    "hallonstenarna": point(59.5, 18.95),
    "östra lagnö själbottna area": point(59.53, 18.75),
    "östra lagnö": point(59.53, 18.75),
    "själbottna östra lagnö": point(59.54, 18.78),
    "svartlögafjärden approach": point(59.55, 18.88),

    // Stavsnäs, Sandhamn, Nämdö, Möja.
    "stavsnäs gästhamn": point(59.287, 18.694),
    "stavsnäs kayak center": point(59.287, 18.694),
    "stavsnäs or boat return": point(59.287, 18.694),
    "sollenkroka brygga": point(59.439, 18.658),
    "runmarö": point(59.289, 18.77),
    "east side of runmarö": point(59.29, 18.84),
    "kanholmsfjärden": point(59.37, 18.78),
    "harö hasselö corridor": point(59.4, 18.74),
    "sandhamn or möja optional variants": point(59.35, 18.9),
    "sandhamn": point(59.289, 18.915),
    "möja": point(59.41, 18.87),
    "nämdö north coast": point(59.22, 18.71),
    "bullerön": point(59.2, 18.88),
    "långviksskär": point(59.16, 18.87),

    // Dalarö, Haninge, southern archipelago.
    "dalarö": point(59.13, 18.41),
    "dalarö kajak askfatshamnen": point(59.135, 18.417),
    "rågholmen": point(59.14, 18.47),
    "dalarö skans": point(59.13, 18.45),
    "kymendö": point(59.05, 18.5),
    "gålö havsbad": point(59.105, 18.3),
    "fjärdlång": point(59.03, 18.53),
    "villinge": point(59.0, 18.61),
    "utö guest harbour aktiv skärgård": point(58.97, 18.32),
    "utö": point(58.97, 18.32),
    "kyrkviken": point(59.06, 18.43),
    "ängsholmen": point(58.94, 18.36),
    "järnholmssund": point(58.97, 18.41),
    "nynäshamn lövhagen": point(58.89, 17.96),
    "nynäshamn": point(58.902, 17.95),
    "ålö utö or nynäshamn return": point(58.97, 18.25),
    "nåttarö": point(58.87, 18.12),
    "rånö": point(58.94, 18.18),
    "ålö": point(58.97, 18.25),
    "ankarudden torö": point(58.82, 17.84),
    "krogen läskär": point(58.775, 17.86),
    "österhamn": point(58.76, 17.87),
    "landsort lighthouse": point(58.742, 17.865),
    "västerhamn": point(58.75, 17.86),
    "ornö": point(59.06, 18.43),
    "kayakomat kyrkviken ornö": point(59.06, 18.43),
    "ornö local shorelines": point(59.055, 18.45),
    "possible outer island extensions for experienced paddlers": point(59.04, 18.52),
    "torö ankarudden or nynäshamn side launch": point(58.82, 17.84),
    "järflotta": point(58.83, 17.8),
    "skvallerhamn": point(58.835, 17.81),
    "sågviken": point(58.84, 17.79),
    "karlsvik": point(58.82, 17.79),
    "råholmssundet": point(58.82, 17.82),
    "björkviks havsbad": point(59.2, 18.52),
    "kayakomat björkviks havsbad": point(59.2, 18.52),
    "björnö": point(59.2, 18.55),
    "torpesand": point(59.2, 18.56),

    // Northern Roslagen.
    "gräddö brygga": point(59.76, 19.03),
    "lidö": point(59.78, 19.08),
    "northwest shelter area": point(59.79, 19.06),
    "räfsnäs rävsnäs ramp": point(59.75, 19.1),
    "räfsnäs or kapellskär": point(59.735, 19.08),
    "tjockö south": point(59.76, 19.13),
    "fejan": point(59.73, 19.15),
    "vattungarna": point(59.8, 19.2),
    "håkanskär": point(59.83, 19.17),
    "gisslingö tyvön": point(59.8, 19.13),
    "lönnskär": point(59.77, 19.18),
    "östersjö brygga or simpnäs": point(59.91, 19.06),
    "arholma": point(59.86, 19.11),
    "idöfladen": point(59.86, 19.17),
    "blomsterfållan": point(59.87, 19.15),
    "kajak uteliv furusund": point(59.66, 18.92),
    "furusund": point(59.66, 18.92),
    "högmarsö varvet area": point(59.63, 18.88),
    "ängsö svartviken": point(59.63, 18.76),
    "hemudden": point(59.63, 18.77),
    "norrviken": point(59.64, 18.76),
    "östra lagnö or bromskär blidö": point(59.56, 18.82),
    "svartlöga": point(59.55, 18.93),
    "rödlöga": point(59.6, 19.02),
    "röder": point(59.66, 19.07),
    "ängskär return variants": point(59.62, 19.0),
    "håkanskär vattungarna or söderarm line": point(59.82, 19.18),
    "rammskären": point(59.75, 19.25),
    "norrpada": point(59.74, 19.2),
  }).map(([key, value]) => [slug(key), value])
);

const facilityCoordsById = new Map(
  Object.entries({
    "kanotcenter-vaxholm": point(59.426, 18.333),
    "getout-stavsnas": point(59.287, 18.694),
    "getout-sollenkroka": point(59.439, 18.658),
    "dalaro-kajak-askfatshamnen": point(59.135, 18.417),
    "kayakomat-bjorkvik": point(59.2, 18.52),
    "kayakomat-grisslinge": point(59.313, 18.425),
    "kayakomat-lannersta": point(59.296, 18.252),
    "kayakomat-frescati": point(59.366, 18.057),
    "kayakomat-djurgardskanalen": point(59.333, 18.145),
    "langholmen-kajak": point(59.3195, 18.0305),
    "kajakkompaniet-kristineberg": point(59.334, 18.004),
    "pampas-kayak-sup": point(59.346, 18.013),
    "galo-havsbad": point(59.105, 18.3),
    "bullero-national-park-entry": point(59.2, 18.88),
    "grinda-harbor-office": point(59.411, 18.56),
    "finnhamns-arkipelag-ragnars-kiosk": point(59.48, 18.82),
    "moja-outdoor": point(59.41, 18.87),
    "nattaro-gard-resort": point(58.87, 18.12),
    "nynashamns-kajakuthyrning": point(58.89, 17.96),
    "aktiv-skargard-uto": point(58.97, 18.32),
    "kajak-uteliv-graddo": point(59.76, 19.03),
    "kajak-uteliv-furusund": point(59.66, 18.92),
    "kayakomat-furusund": point(59.66, 18.92),
    "arholma-nord-kajakuthyrning": point(59.86, 19.11),
    "gallno-kajak": point(59.392, 18.64),
    "hemviken-kajak-ljustero": point(59.53, 18.75),
    "kayakomat-ljustero-linanas": point(59.473, 18.72),
    "soderkajak-vinterviken": point(59.309, 17.996),
    "sjostaden-kajak": point(59.303, 18.111),
    "kayakomat-saltsjo-duvnas": point(59.302, 18.236),
    "kajakboden-gudo": point(59.207, 18.198),
    "kanotboden-kumlabadet": point(59.224, 18.23),
    "kayakomat-tyreso-strandbadet": point(59.242, 18.314),
    "brunnsvikens-kanotklubb": point(59.366, 18.057),
    "kayakomat-segeludden-edsviken": point(59.414, 17.98),
    "kayakomat-orno-kyrkviken": point(59.06, 18.43),
    "jarflotta-natural-harbors": point(58.835, 17.81),
    "arsta-havsbad-launch": point(59.083, 18.146),
    "nordsydlinjen-sat-logistics": point(59.25, 18.55, "network-centroid"),
  })
);

function lookup(name) {
  if (!name) return null;
  const direct = gazetteer.get(slug(name));
  if (direct) return { ...direct, matched: name };
  const normalized = slug(name)
    .replace(/\bkayakomat\b/g, "")
    .replace(/\bstockholm\b/g, "")
    .replace(/\bkayak\b/g, "")
    .replace(/\bkajak\b/g, "")
    .replace(/\bgästhamn\b/g, "")
    .replace(/\bguest harbour\b/g, "")
    .replace(/\bguest harbor\b/g, "")
    .replace(/\barea\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (gazetteer.has(normalized)) return { ...gazetteer.get(normalized), matched: name };
  for (const [key, coord] of gazetteer.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...coord, matched: name, source: `${coord.source}:fuzzy` };
    }
  }
  return null;
}

const routeFiles = [
  "compiled/kayak-routes.seed.json",
  "compiled/kayak-routes.iteration-03-additions.json",
];
const facilityFiles = [
  "compiled/kayak-facilities.seed.json",
  "compiled/kayak-facilities.iteration-03-additions.json",
  "compiled/kayak-parking.seed.json",
];

const routes = routeFiles.flatMap((file) =>
  readJson(file).routes.map((route) => ({ ...route, sourceFile: file }))
);
const facilities = facilityFiles.flatMap((file) =>
  readJson(file).facilities.map((facility) => ({ ...facility, sourceFile: file }))
);

function routePointName(value) {
  if (!value) return null;
  return typeof value === "string" ? value : value.name;
}

function routePointFeature(route, name, role, index, coord) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [coord.lon, coord.lat],
    },
    properties: {
      routeId: route.id,
      routeName: route.name,
      role,
      index,
      name,
      coordinateSource: coord.source,
      coordinateMatchedFrom: coord.matched,
      sourceFile: route.sourceFile,
    },
  };
}

function routeEntries(route) {
  const entries = [];
  const start = routePointName(route.start);
  const end = routePointName(route.end);
  if (start) entries.push({ name: start, role: "start" });
  if (Array.isArray(route.waypoints)) {
    for (const waypoint of route.waypoints) {
      const name = routePointName(waypoint);
      if (name) entries.push({ name, role: "waypoint" });
    }
  }
  if (end) entries.push({ name: end, role: "end" });
  return entries;
}

function recordCoordinate(record) {
  if (
    Array.isArray(record.coordinates) &&
    record.coordinates.length === 2 &&
    Number.isFinite(record.coordinates[0]) &&
    Number.isFinite(record.coordinates[1])
  ) {
    return point(record.coordinates[0], record.coordinates[1], "record-coordinate");
  }
  return null;
}

const routeFeatures = [];
const routePointFeatures = [];
const routeAudit = [];
const enrichedRoutes = [];

for (const route of routes) {
  const entries = routeEntries(route);
  const mapped = entries
    .map((entry, index) => ({ ...entry, index, coord: lookup(entry.name) }))
    .filter((entry) => entry.coord);
  const missing = entries.filter((entry) => !lookup(entry.name)).map((entry) => entry.name);
  const lineCoordinates = mapped.map((entry) => [entry.coord.lon, entry.coord.lat]);
  const uniqueLineCoordinates = lineCoordinates.filter(
    (coord, index) => index === 0 || coord[0] !== lineCoordinates[index - 1][0] || coord[1] !== lineCoordinates[index - 1][1]
  );

  for (const entry of mapped) {
    routePointFeatures.push(routePointFeature(route, entry.name, entry.role, entry.index, entry.coord));
  }

  const geometryStatus =
    uniqueLineCoordinates.length >= 2
      ? "approximate-waypoint-corridor"
      : uniqueLineCoordinates.length === 1
        ? "single-point-only"
        : "missing";

  if (uniqueLineCoordinates.length >= 2) {
    routeFeatures.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: uniqueLineCoordinates,
      },
      properties: {
        id: route.id,
        name: route.name,
        sourceFile: route.sourceFile,
        geometryStatus,
        mapConfidence: missing.length === 0 ? "medium" : "low",
        navigationUse: "not-for-navigation",
        distanceKm: route.distanceKm ?? null,
        estimatedTime: route.estimatedTime ?? null,
        difficulty: route.difficulty ?? null,
        recommendedTimes: route.recommendedTimes ?? null,
        routeType: route.routeType ?? null,
        archipelagoRegion: route.archipelagoRegion ?? null,
        waterZone: route.waterZone ?? null,
        coverageTags: route.coverageTags ?? [],
        classificationNotes: route.classificationNotes ?? null,
        exposure: route.exposure ?? route.safety?.exposure ?? null,
        protectionSummary: route.protectionRules?.summary ?? null,
        protectedAreas: route.protectionRules?.protectedAreas?.map((area) => area.name) ?? [],
        seasonalRestrictionCount: route.protectionRules?.seasonalRestrictions?.length ?? 0,
        protectionRuleConfidence: route.protectionRules?.ruleConfidence ?? null,
        constraints: route.constraints ?? route.campingRules ?? null,
        sources: route.sources ?? null,
        needsFollowup: route.needsFollowup ?? route.researchStatus?.needsFollowup ?? [],
        missingMapPoints: missing,
      },
    });
  }

  enrichedRoutes.push({
    ...route,
    map: {
      geometryStatus,
      mapConfidence: uniqueLineCoordinates.length >= 2 && missing.length === 0 ? "medium" : "low",
      navigationUse: "not-for-navigation",
      lineString:
        uniqueLineCoordinates.length >= 2
          ? {
              type: "LineString",
              coordinates: uniqueLineCoordinates,
            }
          : null,
      points: mapped.map((entry) => ({
        name: entry.name,
        role: entry.role,
        index: entry.index,
        coordinates: [entry.coord.lon, entry.coord.lat],
        coordinateSource: entry.coord.source,
      })),
      missingPointNames: missing,
    },
  });

  routeAudit.push({
    id: route.id,
    name: route.name,
    geometryStatus,
    mappedPointCount: mapped.length,
    totalPointCount: entries.length,
    missingPointNames: missing,
    mapConfidence: uniqueLineCoordinates.length >= 2 && missing.length === 0 ? "medium" : "low",
    sourceFile: route.sourceFile,
  });
}

const facilityFeatures = [];
const parkingFeatures = [];
const facilityAudit = [];
const enrichedFacilities = [];

for (const facility of facilities) {
  const coord =
    recordCoordinate(facility) ||
    facilityCoordsById.get(facility.id) ||
    lookup(facility.name) ||
    lookup(facility.area) ||
    null;
  if (coord) {
    const feature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [coord.lon, coord.lat],
      },
      properties: {
        id: facility.id,
        name: facility.name,
        type: facility.type,
        area: facility.area ?? null,
        sourceFile: facility.sourceFile,
        coordinateSource: coord.source,
        mapConfidence: facility.confidence ?? (coord.source === "network-centroid" ? "low" : "medium"),
        routes: facility.bestForRouteIds ?? facility.linkedRouteIds ?? facility.routesServed ?? [],
        services: facility.services ?? facility.description ?? null,
        access: facility.access ?? null,
        parkingType: facility.parkingType ?? null,
        launchCarry: facility.launchCarry ?? null,
        overnightSuitability: facility.overnightSuitability ?? null,
        primaryCategory: facility.normalizedFacility?.primaryCategory ?? null,
        categories: facility.normalizedFacility?.categories ?? [],
        serviceTags: facility.normalizedFacility?.serviceTags ?? [],
        bookingModel: facility.normalizedFacility?.bookingModel ?? null,
        supportsOwnKayak: facility.normalizedFacility?.supportsOwnKayak ?? null,
        sources: facility.sources ?? null,
        source: facility.source ?? null,
        needsFollowup: facility.needsFollowup ?? [],
      },
    };
    facilityFeatures.push(feature);
    if (facility.type === "parking") parkingFeatures.push(feature);
  }
  enrichedFacilities.push({
    ...facility,
    map: coord
      ? {
          point: {
            type: "Point",
            coordinates: [coord.lon, coord.lat],
          },
          coordinateSource: coord.source,
          mapConfidence: facility.confidence ?? (coord.source === "network-centroid" ? "low" : "medium"),
        }
      : {
          point: null,
          coordinateSource: null,
          mapConfidence: "missing",
        },
  });
  facilityAudit.push({
    id: facility.id,
    name: facility.name,
    type: facility.type,
    area: facility.area ?? null,
    hasMapPoint: Boolean(coord),
    coordinateSource: coord?.source ?? null,
    mapConfidence: coord ? (facility.confidence ?? (coord.source === "network-centroid" ? "low" : "medium")) : "missing",
    sourceFile: facility.sourceFile,
  });
}

const fc = (features) => ({ type: "FeatureCollection", features });

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "kayak-route-corridors.geojson"), `${JSON.stringify(fc(routeFeatures), null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "kayak-route-points.geojson"), `${JSON.stringify(fc(routePointFeatures), null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "kayak-facilities.geojson"), `${JSON.stringify(fc(facilityFeatures), null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "kayak-parking.geojson"), `${JSON.stringify(fc(parkingFeatures), null, 2)}\n`);
fs.writeFileSync(
  path.join(outDir, "kayak-map-ready.dataset.json"),
  `${JSON.stringify(
    {
      generatedAt: "2026-04-26",
      status: "map-ready-research-dataset",
      caveats: [
        "Route geometries are approximate waypoint corridors, not GPX tracks and not navigational advice.",
        "Facilities use approximate point coordinates when exact rack/harbor/building coordinates were not available in the source record.",
        "Keep original sources and needsFollowup fields attached during import.",
      ],
      routes: enrichedRoutes,
      facilities: enrichedFacilities,
      parking: enrichedFacilities.filter((facility) => facility.type === "parking"),
    },
    null,
    2
  )}\n`
);

const audit = {
  generatedAt: "2026-04-26",
  summary: {
    routeRecords: routes.length,
    routeCorridorsDrawable: routeFeatures.length,
    routePointFeatures: routePointFeatures.length,
    facilityRecords: facilities.length,
    facilityPointsDrawable: facilityFeatures.length,
    parkingRecords: facilities.filter((facility) => facility.type === "parking").length,
    parkingPointsDrawable: parkingFeatures.length,
    routeRecordsWithMissingPoints: routeAudit.filter((entry) => entry.missingPointNames.length > 0).length,
    facilityRecordsWithoutPoint: facilityAudit.filter((entry) => !entry.hasMapPoint).length,
  },
  routeAudit,
  facilityAudit,
  caveats: [
    "Route geometries are approximate waypoint corridors, not GPX tracks and not navigational advice.",
    "Several kayak routes are weather-dependent route corridors; exact linework should be replaced with GPX/hand-drawn chart-safe paths before public navigation use.",
    "Facilities use approximate point coordinates when exact rack/harbor/building coordinates were not available in the source record.",
  ],
};
fs.writeFileSync(path.join(outDir, "map-readiness-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);

const markdown = [
  "# Map Readiness Audit",
  "",
  "Generated: 2026-04-26",
  "",
  "## Summary",
  "",
  `- Route records: ${audit.summary.routeRecords}`,
  `- Drawable route corridors: ${audit.summary.routeCorridorsDrawable}`,
  `- Route point features: ${audit.summary.routePointFeatures}`,
  `- Facility records: ${audit.summary.facilityRecords}`,
  `- Drawable facility points: ${audit.summary.facilityPointsDrawable}`,
  `- Parking records: ${audit.summary.parkingRecords}`,
  `- Drawable parking points: ${audit.summary.parkingPointsDrawable}`,
  `- Route records with missing points: ${audit.summary.routeRecordsWithMissingPoints}`,
  `- Facility records without points: ${audit.summary.facilityRecordsWithoutPoint}`,
  "",
  "## Caveats",
  "",
  "- Route lines are approximate waypoint corridors, not GPX tracks.",
  "- Use `geometryStatus`, `mapConfidence`, and `navigationUse` in the app to avoid presenting approximate lines as navigable tracks.",
  "- Exact launch/rack/toilet/water coordinates still need source-grade verification for production.",
  "",
  "## Files",
  "",
  "- `mapdata/kayak-route-corridors.geojson`",
  "- `mapdata/kayak-route-points.geojson`",
  "- `mapdata/kayak-facilities.geojson`",
  "- `mapdata/kayak-parking.geojson`",
  "- `mapdata/kayak-map-ready.dataset.json`",
  "- `mapdata/map-readiness-audit.json`",
  "",
].join("\n");

fs.writeFileSync(path.join(outDir, "map-readiness-audit.md"), `${markdown}\n`);

console.log(JSON.stringify(audit.summary, null, 2));
