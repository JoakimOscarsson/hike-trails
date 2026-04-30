import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const trailId = "padjelantaleden";
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

const osmSources = {
  stage1: {
    type: "osm-relation-full",
    relationId: 19111628,
    url: "https://api.openstreetmap.org/api/0.6/relation/19111628/full",
    rawFileName: "osm-relation-19111628-stage-1.xml",
    sourceLabel: "OSM relation 19111628"
  },
  stage2: {
    type: "osm-relation-full",
    relationId: 19111627,
    url: "https://api.openstreetmap.org/api/0.6/relation/19111627/full",
    rawFileName: "osm-relation-19111627-stage-2.xml",
    sourceLabel: "OSM relation 19111627"
  }
};

const gpxSources = {
  bd59: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd59-mellan-ladejakkstugorna-och-arasluoktastugorna.gpx",
    rawFileName: "naturkartan-bd59-laddejahka-arasluokta.gpx",
    sourceLabel: "Naturkartan BD59 GPX"
  },
  bd60: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd60-mellan-arasluoktastugorna-och-staloluokta.gpx",
    rawFileName: "naturkartan-bd60-arasluokta-staloluokta.gpx",
    sourceLabel: "Naturkartan BD60 GPX"
  },
  bd69: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd69-fran-staloluokta-via-touttarstugorna-till-tarraluoppalstugorna.gpx",
    rawFileName: "naturkartan-bd69-staloluokta-duottar-darreluoppal.gpx",
    sourceLabel: "Naturkartan BD69 GPX"
  },
  bd70: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd70-fran-tarraluoppalstugorna-via-sammarluoppastugan-till-tarrekaisestugorna.gpx",
    rawFileName: "naturkartan-bd70-darreluoppal-sammarlappa-tarrekaise.gpx",
    sourceLabel: "Naturkartan BD70 GPX"
  },
  bd71: {
    type: "naturkartan-gpx",
    url: "https://www.naturkartan.se/sv/norrbottens-lan/vandringsled-bd71-mellan-tarrekaisestugorna-och-kvikkjokk.gpx",
    rawFileName: "naturkartan-bd71-tarrekaise-njunjes-kvikkjokk.gpx",
    sourceLabel: "Naturkartan BD71 GPX"
  }
};

const osm = (sourceKey, options = {}) => ({ kind: "osm", sourceKey, ...options });
const gpx = (sourceKey, options = {}) => ({ kind: "gpx", sourceKey, ...options });

const sectionConfigs = [
  {
    sectionId: "padjelantaleden-stage-01-ritsem-akka-gisuris",
    officialDisplayDistanceKm: 16,
    notes: "OSM relation 19111628 is used because the grouped BD58 GPX includes the alternate Vájsáluokta approach and does not isolate the official walking leg cleanly.",
    component: osm("stage1")
  },
  {
    sectionId: "padjelantaleden-stage-02-gisuris-laddejahka",
    officialDisplayDistanceKm: 23,
    notes: "OSM relation 19111627 is used because the official Naturkartan linework is split across BD58 and BD57 with Kutjaure/Nordkalottleden access geometry.",
    component: osm("stage2", { wayIds: ["130511878", "1297206455", "1297206454", "1297206453", "1297206452", "421352228"] })
  },
  {
    sectionId: "padjelantaleden-stage-03-laddejahka-arasluokta",
    officialDisplayDistanceKm: 13,
    notes: "BD59 is stored Árasluokta-to-Låddejåhkå, so it is reversed for the STF north-to-south section order.",
    component: gpx("bd59", { reverse: true })
  },
  {
    sectionId: "padjelantaleden-stage-04-arasluokta-staloluokta",
    officialDisplayDistanceKm: 10,
    notes: "BD60 is stored Stáloluokta-to-Árasluokta, so it is reversed for the STF north-to-south section order.",
    component: gpx("bd60", { reverse: true })
  },
  {
    sectionId: "padjelantaleden-stage-05-staloluokta-duottar",
    officialDisplayDistanceKm: 18,
    notes: "BD69 is split at the researched Duottar index 419 and the Stáloluokta-side endpoint, then reversed to Stáloluokta-to-Duottar.",
    component: gpx("bd69", { startIndex: 419, endIndex: 1220, reverse: true })
  },
  {
    sectionId: "padjelantaleden-stage-06-duottar-darreluoppal",
    officialDisplayDistanceKm: 11,
    notes: "BD69 points 0 through 419 are reversed to keep the shared Duottar split continuous with stage 5.",
    component: gpx("bd69", { startIndex: 0, endIndex: 419, reverse: true })
  },
  {
    sectionId: "padjelantaleden-stage-07-darreluoppal-sammarlappa",
    officialDisplayDistanceKm: 15,
    notes: "BD70 is split at the researched Såmmarlappa index 469 and reversed from Darreluoppal to Såmmarlappa.",
    component: gpx("bd70", { startIndex: 469, endIndex: 1337, reverse: true })
  },
  {
    sectionId: "padjelantaleden-stage-08-sammarlappa-tarrekaise",
    officialDisplayDistanceKm: 13,
    notes: "BD70 points 0 through 469 are reversed to keep the shared Såmmarlappa split continuous with stage 7.",
    component: gpx("bd70", { startIndex: 0, endIndex: 469, reverse: true })
  },
  {
    sectionId: "padjelantaleden-stage-09-tarrekaise-njunjes",
    officialDisplayDistanceKm: 6,
    notes: "BD71 points 0 through 529 are used so the route remains continuous with the BD70 Tarrekaise endpoint; the STF display distance remains 6 km.",
    component: gpx("bd71", { startIndex: 0, endIndex: 529 })
  },
  {
    sectionId: "padjelantaleden-stage-10-njunjes-kvikkjokk",
    officialDisplayDistanceKm: 15,
    notes: "BD71 points 529 through 1371 represent the Njunjes-to-Bobäcken walking leg only; Bobäcken-Kvikkjokk remains boat/access metadata.",
    component: gpx("bd71", { startIndex: 529, endIndex: 1371 })
  }
];

const sourceCache = new Map();
const sectionRows = [];

await mkdir(sectionOutputRoot, { recursive: true });
await mkdir(sourceOutputRoot, { recursive: true });

for (const config of sectionConfigs) {
  const line = await resolveComponent(config.component);
  const distanceKm = round(lineDistanceKm(line), 3);
  const featureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          trailId,
          sectionId: config.sectionId,
          candidateGeometry: true,
          runtimeImportApproved: false,
          role: "mainline-primary",
          source: sourceLabel(config.component),
          sourceUrl: sourceUrl(config.component),
          sourceFormat: sourceType(config.component),
          officialDisplayDistanceKm: config.officialDisplayDistanceKm,
          computedDistanceKm: distanceKm,
          pointCount: line.length,
          splitPolicy: summarizeSplit(config.component),
          notes: config.notes,
          lastUpdated
        },
        geometry: {
          type: "LineString",
          coordinates: line
        }
      }
    ]
  };

  const outputGeojson = path.join(sectionOutputRoot, `${config.sectionId}.geojson`);
  await writeJson(outputGeojson, featureCollection);
  sectionRows.push({
    sectionId: config.sectionId,
    status: "candidate-geojson-written",
    source: sourceLabel(config.component),
    sourceUrl: sourceUrl(config.component),
    outputGeojson: toProjectRelative(outputGeojson),
    officialDisplayDistanceKm: config.officialDisplayDistanceKm,
    computedDistanceKm: distanceKm,
    pointCount: line.length,
    startLatLon: toLatLon(line[0]),
    endLatLon: toLatLon(line.at(-1)),
    notes: config.notes
  });
}

const continuity = buildContinuityReport(sectionRows);
await writeJson(path.join(outputRoot, "geometry-build-report.research.json"), {
  schemaVersion: "padjelantaleden-candidate-geometry-build-report/v1",
  trailId,
  lastUpdated,
  status: continuity.some((row) => row.gapMeters > 200) ? "candidate-geojson-written-with-gaps" : "candidate-geojson-written",
  runtimeImportApproved: false,
  outputDirectory: toProjectRelative(outputRoot),
  buildPolicy: {
    sourcePriority:
      "Use the researched stage-specific OSM relations for stages 1-2 where Naturkartan linework is grouped or access-mixed; use Naturkartan GPX splits/reversals for stages 3-10.",
    connectorPolicy:
      "M/S Storlule, Bobäcken-Kvikkjokk boat transfer, helicopter access and local line boats remain access metadata rather than walking geometry.",
    endpointPolicy:
      "Preserve researched route-line split points. Do not snap to hut centroids where that would invent unsourced approach geometry."
  },
  sources: [
    ...Object.values(osmSources).map((source) => ({ id: source.relationId, type: source.type, url: source.url, rawFile: toProjectRelative(path.join(sourceOutputRoot, source.rawFileName)) })),
    ...Object.values(gpxSources).map((source) => ({ id: source.rawFileName.replace(/\..+$/, ""), type: source.type, url: source.url, rawFile: toProjectRelative(path.join(sourceOutputRoot, source.rawFileName)) }))
  ],
  sections: sectionRows,
  continuity
});

await writeFile(
  path.join(outputRoot, "README.md"),
  [
    "# Padjelantaleden candidate geometry",
    "",
    "Research-only candidate geometry generated from the Padjelantaleden section packets.",
    "",
    "- Stages 1-2 use researched OSM relation geometry because the official Naturkartan GPX records do not isolate those stages cleanly.",
    "- Stages 3-10 use Naturkartan GPX records with the documented split and reversal policy from the section research.",
    "- Bobäcken-Kvikkjokk, M/S Storlule, helicopter access and local boat services are not walking geometry.",
    "- Rebuild with `npm run data:candidate-geometry:padjelantaleden`.",
    ""
  ].join("\n")
);

console.log(`Built Padjelantaleden candidate geometry for ${sectionRows.length} sections.`);
for (const row of sectionRows) {
  console.log(`- ${row.sectionId}: ${row.computedDistanceKm} km, ${row.pointCount} points`);
}
for (const row of continuity) {
  console.log(`  continuity ${row.fromSectionId} -> ${row.toSectionId}: ${row.gapMeters} m`);
}

async function resolveComponent(component) {
  if (component.kind === "osm") return resolveOsmComponent(component);
  if (component.kind === "gpx") return resolveGpxComponent(component);
  throw new Error(`Unsupported component kind ${component.kind}`);
}

async function resolveOsmComponent(component) {
  const source = osmSources[component.sourceKey];
  const xml = await fetchText(source.url, {
    "user-agent": "hike-trails Padjelantaleden candidate geometry builder"
  });
  await writeFile(path.join(sourceOutputRoot, source.rawFileName), xml);
  const parsed = parser.parse(xml);
  const osmRoot = parsed.osm ?? parsed;
  const nodes = new Map(asArray(osmRoot.node).map((node) => [String(node.id), [Number(node.lon), Number(node.lat)]]));
  const ways = new Map(
    asArray(osmRoot.way).map((way) => [
      String(way.id),
      asArray(way.nd)
        .map((nodeRef) => nodes.get(String(nodeRef.ref)))
        .filter(Boolean)
    ])
  );
  const relation = asArray(osmRoot.relation).find((candidate) => String(candidate.id) === String(source.relationId));
  const relationWayIds = asArray(relation?.member)
    .filter((member) => member.type === "way")
    .map((member) => String(member.ref));
  const wayIds = component.wayIds ?? relationWayIds;
  const lines = wayIds.map((wayId) => ways.get(String(wayId))).filter((line) => line?.length > 1);
  if (lines.length === 0) throw new Error(`No way geometry for ${source.sourceLabel}`);
  return joinComponentLines(lines);
}

async function resolveGpxComponent(component) {
  const source = gpxSources[component.sourceKey];
  const gpxText = await fetchText(source.url, {
    "user-agent": "hike-trails Padjelantaleden candidate geometry builder"
  });
  await writeFile(path.join(sourceOutputRoot, source.rawFileName), gpxText);
  const parsed = parser.parse(gpxText);
  const lines = extractGpxLines(parsed);
  if (lines.length === 0) throw new Error(`No GPX line geometry for ${source.sourceLabel}`);
  let line = joinComponentLines(lines);
  const startIndex = component.startIndex ?? 0;
  const endIndex = component.endIndex ?? line.length - 1;
  line = line.slice(startIndex, endIndex + 1);
  if (component.reverse) line = [...line].reverse();
  if (line.length < 2) throw new Error(`GPX slice for ${source.sourceLabel} is too short`);
  return line;
}

async function fetchText(url, headers = {}) {
  if (sourceCache.has(url)) return sourceCache.get(url);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`);
  const text = await response.text();
  sourceCache.set(url, text);
  return text;
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
    .map((point) => {
      const lat = Number(point.lat);
      const lon = Number(point.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const ele = Number(point.ele);
      return Number.isFinite(ele) ? [lon, lat, ele] : [lon, lat];
    })
    .filter(Boolean);
}

function joinComponentLines(lines) {
  if (lines.length === 0) return [];
  const joined = [...lines[0]];
  for (const line of lines.slice(1)) {
    if (line.length === 0) continue;
    const last = joined[joined.length - 1];
    const forwardDistance = haversineMeters(last, line[0]);
    const reversedDistance = haversineMeters(last, line[line.length - 1]);
    const oriented = reversedDistance < forwardDistance ? [...line].reverse() : line;
    const startIndex = haversineMeters(last, oriented[0]) < 2 ? 1 : 0;
    joined.push(...oriented.slice(startIndex));
  }
  return joined;
}

function buildContinuityReport(rows) {
  const gaps = [];
  for (let index = 0; index < rows.length - 1; index += 1) {
    const from = rows[index];
    const to = rows[index + 1];
    gaps.push({
      fromSectionId: from.sectionId,
      toSectionId: to.sectionId,
      gapMeters: round(haversineMeters(toLonLat(from.endLatLon), toLonLat(to.startLatLon)), 1),
      fromEndLatLon: from.endLatLon,
      toStartLatLon: to.startLatLon
    });
  }
  return gaps;
}

function summarizeSplit(component) {
  if (component.kind === "osm") return component.wayIds ? `OSM relation member way order: ${component.wayIds.join(", ")}` : "OSM relation way order";
  const pieces = [`source=${component.sourceKey}`];
  if (component.startIndex != null || component.endIndex != null) pieces.push(`indices=${component.startIndex ?? 0}..${component.endIndex ?? "end"}`);
  if (component.reverse) pieces.push("reversed");
  return pieces.join("; ");
}

function sourceLabel(component) {
  return component.kind === "osm" ? osmSources[component.sourceKey].sourceLabel : gpxSources[component.sourceKey].sourceLabel;
}

function sourceUrl(component) {
  return component.kind === "osm" ? osmSources[component.sourceKey].url : gpxSources[component.sourceKey].url;
}

function sourceType(component) {
  return component.kind === "osm" ? osmSources[component.sourceKey].type : gpxSources[component.sourceKey].type;
}

function lineDistanceKm(line) {
  let meters = 0;
  for (let index = 1; index < line.length; index += 1) meters += haversineMeters(line[index - 1], line[index]);
  return meters / 1000;
}

function haversineMeters(left, right) {
  const radius = 6371008.8;
  const lat1 = toRadians(left[1]);
  const lat2 = toRadians(right[1]);
  const deltaLat = toRadians(right[1] - left[1]);
  const deltaLon = toRadians(right[0] - left[0]);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function toLatLon(coordinate) {
  return [round(coordinate[1], 7), round(coordinate[0], 7)];
}

function toLonLat(latLon) {
  return [latLon[1], latLon[0]];
}

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function round(value, decimals = 3) {
  return Number(value.toFixed(decimals));
}
