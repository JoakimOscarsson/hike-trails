import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const trailId = "vastra-vatterleden";
const trailRoot = path.join(projectRoot, "data/research/candidate-trails", trailId);
const outputRoot = path.join(trailRoot, "geometry/candidate");
const sectionOutputRoot = path.join(outputRoot, "sections");
const sourceOutputRoot = path.join(outputRoot, "source-downloads");
const lastUpdated = "2026-04-30";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true
});

const kmlSources = {
  vgrStages1To8: {
    type: "google-my-maps-kml",
    url: "https://www.google.com/maps/d/kml?mid=1XkKn4FdmCYUZHyYkhDNWSRp1vCqEhRfi&forcekml=1",
    rawFileName: "vgr-stages-1-8.kml"
  },
  stage6: {
    type: "google-my-maps-kml",
    url: "https://www.google.com/maps/d/kml?mid=1n7vxw1r8flUR23uH9wSxfwmaRs77p1ww&forcekml=1",
    rawFileName: "vgr-stage-6.kml"
  },
  stage7: {
    type: "google-my-maps-kml",
    url: "https://www.google.com/maps/d/kml?mid=1t8xNZVB6XtCUzhNP6Jj3hlK7DTwI6Ngc&forcekml=1",
    rawFileName: "vgr-stage-7.kml"
  }
};

const osmRelationSources = {
  stage1SouthShortcut: {
    type: "osm-overpass-relation",
    relationId: 12884700,
    rawFileName: "osm-relation-12884700-stage-1-shortcut-south.json",
    url: "https://overpass-api.de/api/interpreter"
  }
};

const gpxSources = {
  stage8FagerhultFurusjo: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/en/jonkopings-lan/vv8-fagerhult-furusjo.gpx",
    rawFileName: "stage-8-vv8-fagerhult-furusjo.gpx"
  },
  stage8FurusjoMullsjoHotell: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/sv/jonkopings-lan/vv8-furusjo-mullsjo-hotell.gpx",
    rawFileName: "stage-8-vv8-furusjo-mullsjo-hotell.gpx"
  },
  stage8FagerhultAccess: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/sv/jonkopings-lan/anslutning-fagerhult-vv7vv8.gpx",
    rawFileName: "stage-8-fagerhult-vv7-vv8-access.gpx"
  }
};

const kml = (name, options = {}) => ({ kind: "kml", sourceKey: "vgrStages1To8", name, ...options });
const stage6Kml = (name, options = {}) => ({ kind: "kml", sourceKey: "stage6", name, ...options });
const stage7Kml = (name, options = {}) => ({ kind: "kml", sourceKey: "stage7", name, ...options });
const osmRelation = (sourceKey, options = {}) => ({ kind: "osmRelation", sourceKey, ...options });
const gpx = (sourceKey, options = {}) => ({ kind: "gpx", sourceKey, ...options });

const stage1Start = kml("Etapp 1 Stenkällegården-St Djäknasjön");
const stage1ViaDjaknatorp = kml("Etapp 1 St Djäknasjön-Djäknatorp-Granvik");
const stage1ViaDjaknasundet = kml("Etapp 1 St Djäknasjön-Djäknasundet-Granvik");
const stage1GranvikHogsas = kml("Etapp 1 Granvik-Högsås");
const stage1HogsasKallebacken = kml("Etapp 1 Högsås-Källebacken");
const stage1KallebackenKalvoasen = kml("Etapp 1 Källebacken-Kalvöåsen");
const stage1KalvoasenForsvik = kml("Etapp 1 Kalvöåsen-Forsvik");
const stage1SouthShortcut = osmRelation("stage1SouthShortcut", { reverse: true });

const sectionConfigs = [
  {
    sectionId: "vastra-vatterleden-etapp-1-stenkallegarden-forsvik",
    notes:
      "Stage 1 is represented with explicit route variants: two direct-south candidates using the OSM shortcut relation, two longer Källebacken alternates from official KML linework, and the Undenäs side detour.",
    features: [
      {
        role: "mainline-primary-variant",
        variantId: "direct-south-via-djaknasundet",
        title: "Direct south candidate via Djäknäsundet",
        components: [stage1Start, stage1ViaDjaknasundet, stage1GranvikHogsas, stage1SouthShortcut, stage1KalvoasenForsvik]
      },
      {
        role: "mainline-alternate-variant",
        variantId: "direct-south-via-djaknatorp",
        title: "Direct south candidate via Djäknatorp",
        components: [stage1Start, stage1ViaDjaknatorp, stage1GranvikHogsas, stage1SouthShortcut, stage1KalvoasenForsvik]
      },
      {
        role: "mainline-alternate-variant",
        variantId: "kallebacken-via-djaknasundet",
        title: "Källebacken alternate via Djäknäsundet",
        components: [
          stage1Start,
          stage1ViaDjaknasundet,
          stage1GranvikHogsas,
          stage1HogsasKallebacken,
          stage1KallebackenKalvoasen,
          stage1KalvoasenForsvik
        ]
      },
      {
        role: "mainline-alternate-variant",
        variantId: "kallebacken-via-djaknatorp",
        title: "Källebacken alternate via Djäknatorp",
        components: [
          stage1Start,
          stage1ViaDjaknatorp,
          stage1GranvikHogsas,
          stage1HogsasKallebacken,
          stage1KallebackenKalvoasen,
          stage1KalvoasenForsvik
        ]
      },
      {
        role: "side-spur",
        variantId: "kallebacken-undenas-detour",
        title: "Källebacken-Undenäs side detour",
        components: [kml("Etapp 1 Avstickare / Detour Källebacken-Undenäs")]
      }
    ]
  },
  {
    sectionId: "vastra-vatterleden-etapp-2-forsvik-molltorp",
    notes: "Stage 2 includes the direct Fröjden-Bygget mainline and the Skackastugan/Bergsudden alternate.",
    features: [
      {
        role: "mainline-primary",
        variantId: "direct-frojden-bygget",
        title: "Direct mainline via Fröjden-Bygget",
        components: [
          kml("Etapp 2 Forsvik-Fröjden"),
          kml("Etapp 2 Fröjden-Bygget"),
          kml("Etapp 2 Bygget-Mölltorp")
        ]
      },
      {
        role: "mainline-alternate-variant",
        variantId: "via-skackastugan",
        title: "Skackastugan alternate",
        components: [
          kml("Etapp 2 Forsvik-Fröjden"),
          kml("Etapp 2 Fröjden-Skackastugan"),
          kml("Etapp 2 Skackastugan-Bygget"),
          kml("Etapp 2 Bygget-Mölltorp")
        ]
      }
    ]
  },
  {
    sectionId: "vastra-vatterleden-etapp-3-molltorp-gunnarflon-roa",
    notes: "Stage 3 mainline is assembled from the two official KML/Naturkartan segments; Klevaberget stays a side spur.",
    features: [
      {
        role: "mainline-primary",
        variantId: "molltorp-gunnarflon-roasjon",
        title: "Mölltorp-Gunnarflon-Röåsjön mainline",
        components: [kml("Etapp 3 Mölltorp-Gunnarflon"), kml("Etapp 3 Gunnarflon-Röåsjön")]
      },
      {
        role: "side-spur",
        variantId: "klevaberget-viewpoint",
        title: "Klevaberget viewpoint spur",
        components: [kml("Etapp 3 Avstickare utsikt Klevaberget / Detour to view point")]
      }
    ]
  },
  {
    sectionId: "vastra-vatterleden-etapp-4-roa-lunnakulle-hjo",
    notes: "Stage 4 mainline is assembled from four official KML/Naturkartan segments; Skarpås shelter stays a side spur.",
    features: [
      {
        role: "mainline-primary",
        variantId: "roasjon-lunnakulle-skarpas-mullsjon-hjo",
        title: "Röåsjön-Lunnakulle-Skarpås-Mullsjön-Hjo mainline",
        components: [
          kml("Etapp 4 Röåsjön-Lunnakulle"),
          kml("Etapp 4 Lunnakulle-Skarpås"),
          kml("Etapp 4 Skarpås-Mullsjön"),
          kml("Etapp 4 Mullsjön-Hjo")
        ]
      },
      {
        role: "side-spur",
        variantId: "skarpas-shelter",
        title: "Skarpås shelter spur",
        components: [kml("Etapp 4 Avstickare vindskydd / Detour shelter Skarpås")]
      }
    ]
  },
  {
    sectionId: "vastra-vatterleden-etapp-5-hjo-bastasen",
    notes:
      "Stage 5 reverses both official KML/Naturkartan segment directions and drops the tiny duplicate Baståsen backtrack while preserving the actual Baståsen approach.",
    features: [
      {
        role: "mainline-primary",
        variantId: "hjo-mullsjon-bastasen",
        title: "Hjo-Mullsjön-Baståsen mainline",
        components: [
          kml("Etapp 5 Hjo-Mullsjö", { reverse: true }),
          kml("Etapp 5 Mullsjön - Baståsen", { lineIndexes: [2], reverse: true }),
          kml("Etapp 5 Mullsjön - Baståsen", { lineIndexes: [0], reverse: true })
        ]
      }
    ]
  },
  {
    sectionId: "vastra-vatterleden-etapp-6-bastasen-first-camp-hokensas",
    notes: "Stage 6 uses the official KML mainline and stores short official side spurs separately.",
    features: [
      {
        role: "mainline-primary",
        variantId: "bastasen-vitsjon-first-camp-hokensas",
        title: "Baståsen-Vitsjön-First Camp Hökensås mainline",
        components: [stage6Kml("1) Baståsen-Vitsjön-Semesterbyn")]
      },
      {
        role: "side-spur",
        variantId: "bastasen-viewpoint",
        title: "Baståsen viewpoint spur",
        components: [stage6Kml("a) Avstickare till utsikt (Baståsen)")]
      },
      {
        role: "side-spur",
        variantId: "st-bremsahemmet-pestgrav",
        title: "St Bremsahemmet pestgrave spur",
        components: [stage6Kml("b) Avstickare till pestgrav (St Bremsahemmet)")]
      },
      {
        role: "side-spur",
        variantId: "vitsjon-shelter",
        title: "Vitsjön shelter spur",
        components: [stage6Kml("c) Avstickare till vindskydd (Vitsjön)")]
      },
      {
        role: "side-spur",
        variantId: "rackes-hala",
        title: "Rackes håla spur",
        components: [stage6Kml("d) Avstickare till Rackes håla")]
      }
    ]
  },
  {
    sectionId: "vastra-vatterleden-etapp-7-first-camp-hokensas-fagerhult",
    notes: "Stage 7 stores the continuous mainline to Gagnån separately from the official Fagerhult access connector.",
    features: [
      {
        role: "mainline-primary",
        variantId: "first-camp-hokensas-gagnan",
        title: "First Camp Hökensås-Gagnån mainline",
        components: [stage7Kml("1) Semesterbyn-Fagerhult")]
      },
      {
        role: "side-spur",
        variantId: "ibbesjon-shelter",
        title: "Ibbesjön shelter spur",
        components: [stage7Kml("a) Avstickare till vindskydd (Ibbesjön)")]
      },
      {
        role: "side-spur",
        variantId: "stora-ojasjon-grill",
        title: "Stora Öjasjön grill spur",
        components: [stage7Kml("b) Avstickare till grillplats (St Öjasjön)")]
      },
      {
        role: "side-spur",
        variantId: "sydvattnet-rest-area",
        title: "Sydvattnet rest-area spur",
        components: [stage7Kml("c) Avstickare till rastplats (Sydvattnet)")]
      },
      {
        role: "side-spur",
        variantId: "hallsdammsbacken-shelter",
        title: "Hållsdammsbäcken shelter spur",
        components: [stage7Kml("d) Avstickare till vindskydd (Hållsdammsbäcken)")]
      },
      {
        role: "access-connector",
        variantId: "fagerhult-access",
        title: "Fagerhult access connector",
        components: [stage7Kml("2) Accessled till Fagerhult")]
      }
    ]
  },
  {
    sectionId: "vastra-vatterleden-etapp-8-fagerhult-mullsjo",
    notes:
      "Stage 8 mainline is assembled from the two official Naturkartan/Smålandsleden child GPX components, both reversed into planning order; Fagerhult village access remains a connector.",
    features: [
      {
        role: "mainline-primary",
        variantId: "gagnan-furusjo-hotel-mullsjo",
        title: "Gagnån-Furusjö-Hotel Mullsjö mainline",
        components: [
          gpx("stage8FagerhultFurusjo", { reverse: true }),
          gpx("stage8FurusjoMullsjoHotell", { reverse: true })
        ]
      },
      {
        role: "child-mainline-component",
        variantId: "gagnan-furusjo",
        title: "Gagnån/Fagerhult junction-Furusjö child component",
        components: [gpx("stage8FagerhultFurusjo", { reverse: true })]
      },
      {
        role: "child-mainline-component",
        variantId: "furusjo-hotel-mullsjo",
        title: "Furusjö-Hotel Mullsjö child component",
        components: [gpx("stage8FurusjoMullsjoHotell", { reverse: true })]
      },
      {
        role: "access-connector",
        variantId: "fagerhult-vv7-vv8-access",
        title: "Fagerhult-VV7/VV8 access connector",
        components: [gpx("stage8FagerhultAccess")]
      }
    ]
  }
];

const kmlCache = new Map();
const gpxCache = new Map();
const osmRelationCache = new Map();

await mkdir(sectionOutputRoot, { recursive: true });
await mkdir(sourceOutputRoot, { recursive: true });

const rows = [];
for (const config of sectionConfigs) {
  const features = [];
  for (const featureConfig of config.features) {
    features.push(await buildFeature(config.sectionId, featureConfig));
  }

  const geojson = {
    type: "FeatureCollection",
    features
  };
  const outputGeojson = path.join(sectionOutputRoot, `${config.sectionId}.geojson`);
  await writeJson(outputGeojson, geojson);
  rows.push({
    trailId,
    sectionId: config.sectionId,
    status: "candidate-geojson-written",
    outputGeojson: toProjectRelative(outputGeojson),
    featureCount: features.length,
    mainlineFeatureCount: features.filter((feature) => feature.properties.role?.includes("mainline")).length,
    connectorFeatureCount: features.filter((feature) => feature.properties.role === "access-connector").length,
    sideSpurFeatureCount: features.filter((feature) => feature.properties.role === "side-spur").length,
    totalPointCount: features.reduce((count, feature) => count + feature.properties.pointCount, 0),
    notes: config.notes
  });
}

await writeJson(path.join(outputRoot, "geometry-build-report.research.json"), {
  schemaVersion: "candidate-vastra-vatterleden-geometry-build-report/v1",
  trailId,
  lastUpdated,
  status: "candidate-geojson-written",
  runtimeImportApproved: false,
  outputDirectory: toProjectRelative(outputRoot),
  sourceNotes: [
    "Stages 1-7 are generated from official Västsverige/Google My Maps KML linework, with the stage-1 direct-south shortcut generated from OSM relation 12884700 because the official KML only includes the longer Källebacken line.",
    "Stage 8 is generated from the two official Naturkartan/Smålandsleden GPX child components plus the Fagerhult access connector.",
    "These files are research-only candidate artifacts and must not be treated as runtime app source data until the runtime import task approves them."
  ],
  sourceDownloads: [
    ...Object.values(kmlSources).map((source) => ({
      type: source.type,
      url: source.url,
      rawFile: toProjectRelative(path.join(sourceOutputRoot, source.rawFileName))
    })),
    ...Object.values(osmRelationSources).map((source) => ({
      type: source.type,
      relationId: source.relationId,
      url: source.url,
      rawFile: toProjectRelative(path.join(sourceOutputRoot, source.rawFileName))
    })),
    ...Object.values(gpxSources).map((source) => ({
      type: source.type,
      url: source.url,
      rawFile: toProjectRelative(path.join(sourceOutputRoot, source.rawFileName))
    }))
  ],
  sections: rows
});

await writeFile(
  path.join(outputRoot, "README.md"),
  [
    "# vastra-vatterleden candidate geometry",
    "",
    "Research-only candidate geometry generated from official KML/GPX sources and one OSM shortcut relation used by the section-1 research packet.",
    "",
    "- Raw source downloads are stored under `source-downloads/`.",
    "- Converted GeoJSON files are stored under `sections/`.",
    "- Section GeoJSON may include multiple features for mainline variants, side spurs, child components or access connectors.",
    "- These files are not runtime app source data.",
    "- Rebuild with `npm run data:candidate-geometry:vastra-vatterleden`.",
    ""
  ].join("\n")
);

console.log(`Built candidate geometry artifacts for ${trailId}.`);
for (const row of rows) {
  console.log(`- ${row.sectionId}: ${row.featureCount} features, ${row.totalPointCount} points`);
}

async function buildFeature(sectionId, featureConfig) {
  const componentRows = [];
  const lines = [];
  for (const component of featureConfig.components) {
    const resolved = await resolveComponent(component);
    componentRows.push(...resolved.componentRows);
    lines.push(...resolved.lines);
  }

  if (lines.length === 0) {
    throw new Error(`No geometry lines resolved for ${sectionId}/${featureConfig.variantId}`);
  }

  const line = joinComponentLines(lines);
  const sourceUrls = [...new Set(componentRows.map((row) => row.sourceUrl).filter(Boolean))];
  const sourceTypes = [...new Set(componentRows.map((row) => row.sourceType).filter(Boolean))];
  return {
    type: "Feature",
    properties: {
      trailId,
      sectionId,
      candidateGeometry: true,
      runtimeImportApproved: false,
      role: featureConfig.role,
      variantId: featureConfig.variantId,
      title: featureConfig.title,
      sourceTypes,
      sourceUrls,
      components: componentRows,
      componentCount: componentRows.length,
      lineCount: 1,
      pointCount: line.length,
      computedDistanceKm: round(distanceMeters(line) / 1000, 3),
      lastUpdated
    },
    geometry: {
      type: "LineString",
      coordinates: line
    }
  };
}

async function resolveComponent(component) {
  if (component.kind === "kml") return resolveKmlComponent(component);
  if (component.kind === "osmRelation") return resolveOsmRelationComponent(component);
  if (component.kind === "gpx") return resolveGpxComponent(component);
  throw new Error(`Unknown component kind: ${component.kind}`);
}

async function resolveKmlComponent(component) {
  const source = await getKmlSource(component.sourceKey);
  const matches = source.placemarks.filter((placemark) => placemark.name === component.name);
  if (matches.length === 0) throw new Error(`No KML placemark found for ${component.sourceKey}: ${component.name}`);
  const placemark = matches[component.occurrence ?? 0];
  if (!placemark) throw new Error(`No KML placemark occurrence ${component.occurrence} for ${component.name}`);
  const allLines = placemark.lines;
  const lineIndexes = component.lineIndexes ?? allLines.map((_, index) => index);
  const lines = lineIndexes.map((index) => orientLine(allLines[index], component.reverse));
  return {
    lines,
    componentRows: lineIndexes.map((index) => ({
      sourceType: source.type,
      sourceUrl: source.url,
      component: component.name,
      lineIndex: index,
      reverseApplied: Boolean(component.reverse),
      pointCount: allLines[index]?.length ?? 0
    }))
  };
}

async function resolveGpxComponent(component) {
  const source = gpxSources[component.sourceKey];
  if (!source) throw new Error(`Unknown GPX source key: ${component.sourceKey}`);
  const lines = await getGpxLines(component.sourceKey);
  const lineIndexes = component.lineIndexes ?? lines.map((_, index) => index);
  return {
    lines: lineIndexes.map((index) => orientLine(lines[index], component.reverse)),
    componentRows: lineIndexes.map((index) => ({
      sourceType: source.type,
      sourceUrl: source.url,
      component: component.sourceKey,
      lineIndex: index,
      reverseApplied: Boolean(component.reverse),
      pointCount: lines[index]?.length ?? 0
    }))
  };
}

async function resolveOsmRelationComponent(component) {
  const source = osmRelationSources[component.sourceKey];
  if (!source) throw new Error(`Unknown OSM relation source key: ${component.sourceKey}`);
  const lines = await getOsmRelationLines(component.sourceKey);
  const lineIndexes = component.lineIndexes ?? [0];
  return {
    lines: lineIndexes.map((index) => orientLine(lines[index], component.reverse)),
    componentRows: lineIndexes.map((index) => ({
      sourceType: source.type,
      sourceUrl: `https://www.openstreetmap.org/relation/${source.relationId}`,
      relationId: source.relationId,
      component: component.sourceKey,
      lineIndex: index,
      reverseApplied: Boolean(component.reverse),
      pointCount: lines[index]?.length ?? 0
    }))
  };
}

async function getKmlSource(sourceKey) {
  if (kmlCache.has(sourceKey)) return kmlCache.get(sourceKey);
  const source = kmlSources[sourceKey];
  if (!source) throw new Error(`Unknown KML source key: ${sourceKey}`);
  const text = await fetchText(source.url);
  await writeFile(path.join(sourceOutputRoot, source.rawFileName), text);
  const parsed = parser.parse(text);
  const placemarks = collectPlacemarks(parsed.kml ?? parsed)
    .map((placemark) => ({
      name: placemark.name,
      lines: extractKmlLines(placemark)
    }))
    .filter((placemark) => placemark.lines.length > 0);
  const value = { ...source, placemarks };
  kmlCache.set(sourceKey, value);
  return value;
}

async function getGpxLines(sourceKey) {
  if (gpxCache.has(sourceKey)) return gpxCache.get(sourceKey);
  const source = gpxSources[sourceKey];
  if (!source) throw new Error(`Unknown GPX source key: ${sourceKey}`);
  const text = await fetchText(source.url);
  await writeFile(path.join(sourceOutputRoot, source.rawFileName), text);
  const parsed = parser.parse(text);
  const lines = extractGpxLines(parsed);
  if (lines.length === 0) throw new Error(`No GPX track or route coordinates found for ${sourceKey}`);
  gpxCache.set(sourceKey, lines);
  return lines;
}

async function getOsmRelationLines(sourceKey) {
  if (osmRelationCache.has(sourceKey)) return osmRelationCache.get(sourceKey);
  const source = osmRelationSources[sourceKey];
  if (!source) throw new Error(`Unknown OSM relation source key: ${sourceKey}`);
  const query = `[out:json][timeout:25];rel(${source.relationId});(._;>;);out geom;`;
  const response = await fetch(source.url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "hike-trails candidate data prep (research-only Västra Vätterleden geometry builder)"
    },
    body: new URLSearchParams({ data: query })
  });
  if (!response.ok) throw new Error(`Overpass HTTP ${response.status} ${response.statusText} for relation ${source.relationId}`);
  const data = await response.json();
  await writeJson(path.join(sourceOutputRoot, source.rawFileName), data);
  const lines = assembleOverpassRelationLines(data, source.relationId);
  if (lines.length === 0) throw new Error(`No OSM relation geometry found for relation ${source.relationId}`);
  osmRelationCache.set(sourceKey, lines);
  return lines;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "hike-trails candidate data prep (research-only Västra Vätterleden geometry builder)"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function collectPlacemarks(node) {
  if (!node || typeof node !== "object") return [];
  const rows = [];
  if (node.Placemark) rows.push(...asArray(node.Placemark));
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) rows.push(...collectPlacemarks(item));
    } else if (value && typeof value === "object") {
      rows.push(...collectPlacemarks(value));
    }
  }
  return rows;
}

function extractKmlLines(node) {
  if (!node || typeof node !== "object") return [];
  const lines = [];
  if (typeof node.coordinates === "string") {
    const line = node.coordinates
      .trim()
      .split(/\s+/)
      .map((position) => position.split(",").map(Number))
      .map(([lon, lat]) => [lon, lat])
      .filter(isCoordinate);
    if (line.length > 1) lines.push(line);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) lines.push(...extractKmlLines(item));
    } else if (value && typeof value === "object") {
      lines.push(...extractKmlLines(value));
    }
  }
  return lines;
}

function extractGpxLines(parsed) {
  const gpxRoot = parsed.gpx ?? parsed;
  const trackLines = asArray(gpxRoot.trk).flatMap((track) =>
    asArray(track.trkseg)
      .map((segment) => pointsToLine(asArray(segment.trkpt)))
      .filter((line) => line.length > 1)
  );
  const routeLines = asArray(gpxRoot.rte)
    .map((route) => pointsToLine(asArray(route.rtept)))
    .filter((line) => line.length > 1);
  return [...trackLines, ...routeLines];
}

function pointsToLine(points) {
  return points
    .map((point) => [Number(point.lon), Number(point.lat)])
    .filter(isCoordinate);
}

function assembleOverpassRelationLines(data, relationId) {
  const relation = data.elements?.find((element) => element.type === "relation" && element.id === relationId);
  const relationWayIds = new Set(relation?.members?.filter((member) => member.type === "way").map((member) => member.ref) ?? []);
  const unused = (data.elements ?? [])
    .filter((element) => element.type === "way" && relationWayIds.has(element.id) && element.geometry?.length > 1)
    .map((way) => ({
      id: way.id,
      line: way.geometry.map((point) => [Number(point.lon), Number(point.lat)]).filter(isCoordinate)
    }))
    .filter((way) => way.line.length > 1);

  const lines = [];
  while (unused.length > 0) {
    const first = unused.shift();
    let line = [...first.line];
    let changed = true;
    while (changed) {
      changed = false;
      for (let index = 0; index < unused.length; index += 1) {
        const candidate = unused[index].line;
        const best = [
          { distance: haversineMeters(line.at(-1), candidate[0]), mode: "append", line: candidate },
          { distance: haversineMeters(line.at(-1), candidate.at(-1)), mode: "append", line: [...candidate].reverse() },
          { distance: haversineMeters(line[0], candidate.at(-1)), mode: "prepend", line: candidate },
          { distance: haversineMeters(line[0], candidate[0]), mode: "prepend", line: [...candidate].reverse() }
        ].sort((left, right) => left.distance - right.distance)[0];

        if (best.distance > 80) continue;
        if (best.mode === "append") {
          line.push(...best.line.slice(best.distance < 2 ? 1 : 0));
        } else {
          const lineToPrepend = best.distance < 2 ? best.line.slice(0, -1) : best.line;
          line = [...lineToPrepend, ...line];
        }
        unused.splice(index, 1);
        changed = true;
        break;
      }
    }
    lines.push(line);
  }
  return lines.sort((left, right) => distanceMeters(right) - distanceMeters(left));
}

function joinComponentLines(lines) {
  if (lines.length === 0) return [];
  const joined = [...lines[0]];
  for (const rawLine of lines.slice(1)) {
    if (rawLine.length === 0) continue;
    const last = joined.at(-1);
    const forwardDistance = haversineMeters(last, rawLine[0]);
    const reversedDistance = haversineMeters(last, rawLine.at(-1));
    const line = reversedDistance < forwardDistance ? [...rawLine].reverse() : rawLine;
    joined.push(...line.slice(haversineMeters(last, line[0]) < 2 ? 1 : 0));
  }
  return joined;
}

function orientLine(line, reverse) {
  if (!line?.length) return [];
  return reverse ? [...line].reverse() : line;
}

function distanceMeters(line) {
  let sum = 0;
  for (let index = 0; index < line.length - 1; index += 1) {
    sum += haversineMeters(line[index], line[index + 1]);
  }
  return sum;
}

function haversineMeters(left, right) {
  const earthRadiusMeters = 6371008.8;
  const leftLat = toRadians(left[1]);
  const rightLat = toRadians(right[1]);
  const deltaLat = toRadians(right[1] - left[1]);
  const deltaLon = toRadians(right[0] - left[0]);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function isCoordinate(coordinate) {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1])
  );
}

function round(value, decimals) {
  return Number(value.toFixed(decimals));
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
