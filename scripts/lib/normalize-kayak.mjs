import { normalizeSearchText } from "./search-text.mjs";

const allowedDurations = new Set(["half-day", "day", "dayhike", "weekend", "3-5-days", "6-plus-days"]);
const notForNavigationWarning =
  "Approximate waypoint corridor for planning context only. Do not use this line for navigation.";

const namedRouteCorrections = {
  "stavsnas-namdo-bullero-langviksskar": [
    "Preserve Namdoskargarden/Bullero rule context from research notes.",
    "Preserve Langviksskar split-protection context before any public navigation-grade upgrade."
  ],
  "skt-hjalmo-ladna-runt": ["Stockholm Kayak Trail distances are unknown and must remain null until verified."],
  "stavsnas-runmaro-runt": ["Runmaro metadata contains contradictions that need follow-up before planning-grade use."],
  "grinda-gallno-multiday": ["Grinda/Gallno day-trip versus 4-5-day taxonomy conflict remains unresolved."],
  "kanotcenter-trasko-storo": ["Grinda/Gallno taxonomy context overlaps nearby Trasko-Storo route planning."]
};

const namedFacilityCorrections = {
  "nynashamns-kajakuthyrning": [
    "Do not rely on Kayakomat Nynashamn/Nickstabadet until refreshed; research notes report booking/status conflicts."
  ]
};

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter((item) => item != null) : [value];
}

function textFromUnknown(value) {
  return asArray(value)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function normalizeDuration(value) {
  if (value === "day") return "dayhike";
  return allowedDurations.has(value) ? value : "dayhike";
}

function classifyExposure(route) {
  const coverageTags = new Set((route.coverageTags ?? []).map((tag) => tag.toLowerCase()));
  const text = [
    route.exposure,
    route.difficulty,
    route.waterZone,
    route.waterArea,
    route.classificationNotes,
    ...(route.coverageTags ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasShelteredSignal =
    coverageTags.has("sheltered") || /\b(sheltered|protected|lake|urban|canal|beginner|green)\b/.test(text);
  const hasExposedSignal =
    /\b(outer|outer-archipelago|baltic|alands-hav|swell|advanced|weather-dependent|wind-sensitive|crossings?|unsheltered|exposed|open water|open gaps?)\b/.test(
      text
    );

  if (route.waterZone === "outer") return "exposed";
  if (hasShelteredSignal && hasExposedSignal) {
    const isEasyShelteredInnerRoute =
      route.waterZone === "inner" &&
      coverageTags.has("sheltered") &&
      /\b(beginner|easy|green|canal|lake|urban)\b/.test(text);
    return isEasyShelteredInnerRoute ? "sheltered" : "mixed";
  }
  if (hasExposedSignal) return "exposed";
  if (route.waterZone === "inner" || hasShelteredSignal) {
    return "sheltered";
  }
  return "mixed";
}

function normalizeSource(source, fallbackDate) {
  if (!source) return null;
  if (typeof source === "string") {
    const url = source.startsWith("http") ? source : undefined;
    return {
      provider: url ? new URL(url).hostname.replace(/^www\./, "") : "research-note",
      ...(url ? { url } : { title: source }),
      lastAccessedAt: fallbackDate
    };
  }
  if (typeof source === "object") {
    return {
      provider: source.provider ?? source.title ?? "research-source",
      ...(source.url ? { url: source.url } : {}),
      ...(source.title ? { title: source.title } : {}),
      ...(source.lastAccessedAt ? { lastAccessedAt: source.lastAccessedAt } : fallbackDate ? { lastAccessedAt: fallbackDate } : {}),
      ...(source.notes ? { notes: source.notes } : {})
    };
  }
  return null;
}

function lonLatToLatLon(coordinate) {
  return Array.isArray(coordinate) && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1])
    ? [coordinate[1], coordinate[0]]
    : undefined;
}

function routeCenter(lineString) {
  const coordinates = lineString?.coordinates ?? [];
  if (!coordinates.length) return undefined;
  const sum = coordinates.reduce(
    (current, coordinate) => ({
      lon: current.lon + coordinate[0],
      lat: current.lat + coordinate[1]
    }),
    { lon: 0, lat: 0 }
  );
  return [Number((sum.lat / coordinates.length).toFixed(6)), Number((sum.lon / coordinates.length).toFixed(6))];
}

function detailSearchText(route, facilityNotes) {
  return [
    route.name,
    route.region,
    route.area,
    route.waterArea,
    route.archipelagoRegion,
    route.waterZone,
    route.difficulty,
    route.routeType,
    route.description,
    route.exposure,
    route.classificationNotes,
    route.campingRules,
    ...(route.coverageTags ?? []),
    ...facilityNotes,
    ...(route.needsFollowup ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

function kayakOverviewProperties(indexItem) {
  const { searchText, normalizedSearchText, tags, ...properties } = indexItem;
  return properties;
}

function normalizeResearch(route, dataset) {
  const status = route.researchStatus
    ? "partially-researched"
    : route.confidence === "high"
      ? "partially-researched"
      : "catalog-only";
  return {
    status,
    routeConfidence: route.researchStatus?.routeConfidence ?? route.confidence ?? route.map?.mapConfidence ?? "medium",
    facilityConfidence: route.researchStatus?.facilityConfidence ?? "medium",
    needsFollowup: [...asArray(route.needsFollowup), ...asArray(route.researchStatus?.needsFollowup)],
    contradictions: asArray(route.researchStatus?.contradictions),
    corrections: namedRouteCorrections[route.id] ?? [],
    caveats: dataset.caveats ?? [],
    sourceFile: route.sourceFile,
    sourceSnapshotPath: route.sourceShardPath ?? "data/source/kayaking/source-snapshot/kayak-map-ready.dataset.json"
  };
}

function normalizeFacilityRefs(route, facilityIds) {
  const candidateRefs = [...asArray(route.facilities), ...asArray(route.rentals)];
  const facilityRefs = [];
  const rentalRefs = [];
  const facilityNotes = [];

  for (const value of candidateRefs) {
    if (typeof value !== "string" || !value.trim()) continue;
    if (facilityIds.has(value)) {
      if (asArray(route.rentals).includes(value)) rentalRefs.push(value);
      else facilityRefs.push(value);
    } else {
      facilityNotes.push(value);
    }
  }

  return {
    facilityRefs: [...new Set(facilityRefs)],
    rentalRefs: [...new Set(rentalRefs)],
    facilityNotes: [...new Set(facilityNotes)]
  };
}

export function normalizeKayakRoute(route, { dataset, facilityIds }) {
  const center = routeCenter(route.map?.lineString);
  const routePath = `/routes/kayaking/${route.id}.geojson`;
  const { facilityRefs, rentalRefs, facilityNotes } = normalizeFacilityRefs(route, facilityIds);
  const sources = asArray(route.sources)
    .map((source) => normalizeSource(source, dataset.generatedAt))
    .filter(Boolean);
  const recommendedTimes = asArray(route.recommendedTimes).map(normalizeDuration);
  const distanceKm = Number.isFinite(route.distanceKm) ? route.distanceKm : null;
  const research = normalizeResearch(route, dataset);
  const lineString = route.map?.lineString ?? { type: "LineString", coordinates: [] };
  const exposureLevel = classifyExposure(route);

  const detail = {
    id: route.id,
    activity: "kayaking",
    itemType: "kayak-trip",
    name: route.name,
    region: route.region ?? route.area ?? route.waterArea ?? "Stockholm archipelago",
    country: route.country ?? "Sweden",
    area: route.area ?? route.waterArea ?? route.region ?? "Stockholm archipelago",
    waterArea: route.waterArea ?? route.area ?? "",
    archipelagoRegion: route.archipelagoRegion ?? "unknown",
    waterZone: route.waterZone ?? "unknown",
    exposureLevel,
    coverageTags: route.coverageTags ?? [],
    recommendedTimes: recommendedTimes.length ? recommendedTimes : ["dayhike"],
    difficulty: route.difficulty ?? "Moderate",
    distanceKm,
    estimatedTime: route.estimatedTime ?? "Unknown",
    routeType: route.routeType ?? "Open itinerary",
    season: route.season ?? "May-September, weather permitting",
    description: route.description ?? route.classificationNotes ?? "",
    start: route.start ?? null,
    end: route.end ?? null,
    waypoints: route.waypoints ?? [],
    access: route.access ?? [],
    safety: route.safety ?? {
      exposure: route.exposure ?? "",
      confidence: route.confidence ?? route.map?.mapConfidence ?? "medium"
    },
    campingRules: route.campingRules ?? route.constraints ?? "",
    protectionRules: route.protectionRules ?? null,
    facilityRefs,
    rentalRefs,
    facilityNotes,
    sources,
    research,
    route: {
      geojsonPath: routePath,
      geometryStatus: route.map?.geometryStatus ?? "approximate-waypoint-corridor",
      mapConfidence: route.map?.mapConfidence ?? "medium",
      navigationUse: "not-for-navigation",
      sourceFormat: "approximate-waypoint-corridor",
      warning: notForNavigationWarning
    },
    map: {
      center: center ?? [59.3293, 18.0686],
      zoom: route.waterZone === "outer" ? 9 : 10
    },
    sourceFile: route.sourceFile
  };

  const searchText = normalizeSearchText(detailSearchText(route, facilityNotes));
  const indexItem = {
    id: route.id,
    activity: "kayaking",
    itemType: "kayak-trip",
    name: route.name,
    region: detail.region,
    country: detail.country,
    locationLabel: detail.area,
    recommendedTimes: detail.recommendedTimes,
    difficulty: detail.difficulty,
    distanceKm,
    estimatedTime: detail.estimatedTime,
    routeType: detail.routeType,
    detailPath: `/data/kayak-trips/${route.id}.json`,
    overviewFeatureId: route.id,
    routePath,
    waterZone: detail.waterZone,
    archipelagoRegion: detail.archipelagoRegion,
    exposureLevel: detail.exposureLevel,
    routeConfidence: detail.research.routeConfidence,
    mapConfidence: detail.route.mapConfidence,
    hasFollowup: Boolean(
      detail.research.needsFollowup.length || detail.research.contradictions.length || detail.research.corrections.length
    ),
    searchText,
    tags: [...new Set([detail.archipelagoRegion, detail.waterZone, ...detail.coverageTags].filter(Boolean))]
  };

  const routeGeoJSON = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: route.id,
        properties: {
          id: route.id,
          activity: "kayaking",
          itemType: "kayak-trip",
          name: route.name,
          sourceFile: route.sourceFile,
          geometryStatus: detail.route.geometryStatus,
          mapConfidence: detail.route.mapConfidence,
          navigationUse: detail.route.navigationUse,
          sourceFormat: detail.route.sourceFormat,
          warning: detail.route.warning
        },
        geometry: lineString
      }
    ]
  };

  const overviewFeature = {
    type: "Feature",
    id: route.id,
    properties: {
      ...kayakOverviewProperties(indexItem),
      geometryStatus: detail.route.geometryStatus,
      mapConfidence: detail.route.mapConfidence,
      navigationUse: detail.route.navigationUse,
      warning: detail.route.warning
    },
    geometry: lineString
  };

  return { detail, indexItem, routeGeoJSON, overviewFeature };
}

export function normalizeKayakFacility(record, routeIds) {
  const normalized = record.normalizedFacility ?? {};
  const coordinates = lonLatToLatLon(record.map?.point?.coordinates);
  const sourceList = asArray(record.sources ?? record.source)
    .map((source) => normalizeSource(source))
    .filter(Boolean);
  const rawRouteIds = normalized.routeIds ?? record.linkedRouteIds ?? record.routes ?? [];
  const knownRouteIds = [];
  const candidateRouteIds = [];
  for (const routeId of rawRouteIds) {
    if (routeIds.has(routeId)) knownRouteIds.push(routeId);
    else candidateRouteIds.push(routeId);
  }

  return {
    id: record.id,
    activity: "kayaking",
    name: record.name,
    type: record.type,
    primaryCategory: normalized.primaryCategory ?? record.primaryCategory ?? record.type,
    categories: normalized.categories ?? record.categories ?? [record.type],
    serviceTags: normalized.serviceTags ?? record.serviceTags ?? [],
    area: record.area,
    coordinates,
    coordinateSource: record.map?.coordinateSource ?? record.coordinateSource,
    mapConfidence: record.map?.mapConfidence ?? record.confidence ?? "medium",
    description: textFromUnknown(record.description ?? record.services),
    access: record.access ?? [],
    routeIds: [...new Set(knownRouteIds)],
    candidateRouteIds: [...new Set(candidateRouteIds)],
    parkingType: record.parkingType ?? null,
    launchCarry: record.launchCarry ?? null,
    overnightSuitability: record.overnightSuitability ?? null,
    bookingModel: normalized.bookingModel ?? record.bookingModel ?? "unknown",
    supportsOwnKayak: normalized.supportsOwnKayak ?? record.supportsOwnKayak ?? "unknown",
    sources: sourceList,
    needsFollowup: [...asArray(record.needsFollowup), ...(namedFacilityCorrections[record.id] ?? [])],
    sourceFile: record.sourceFile
  };
}

export function buildKayakOverview(features, generatedAt, generatedFrom = "data/source/kayaking/source-manifest.json") {
  return {
    type: "FeatureCollection",
    name: "Stockholm kayak overview",
    activity: "kayaking",
    generatedFrom,
    generatedAt,
    features
  };
}
