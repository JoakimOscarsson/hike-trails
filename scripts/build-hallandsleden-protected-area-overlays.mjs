import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCandidateLayerOverlays } from "./lib/candidate-protected-area-overlays.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const trailId = "hallandsleden";
const lastUpdated = "2026-04-30";

const bbox = await computeRouteBbox(0.03);
const bboxText = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat},EPSG:4326`;

const watchlist = [
  "Fjärås Bräcka",
  "Äskhult",
  "Lilla Äskhult",
  "Märkedalen",
  "Åkullaboket",
  "Långanskogen",
  "Toppbjär",
  "Grimeton",
  "Bockstens mosse",
  "Nedre Ätran",
  "Högvadsån",
  "Lysegårdsmossen",
  "Skattagård",
  "Frodeparken",
  "Almeberget",
  "Virsehatt",
  "Keddaböke",
  "Fylleån",
  "Hule",
  "Simlångsdalen-Hule",
  "Torvsjön",
  "Hagön",
  "Trönninge ängar",
  "Haverdal",
  "Alet",
  "Gullbranna",
  "Tönnersa",
  "Hökafältet",
  "Södra Skummeslöv",
  "Sandsjöbacka",
  "Tjolöholm",
  "Kungsbackafjorden",
  "Näsbokrok",
  "Steningekusten",
  "Särdal",
  "Enet",
  "Gårdshult",
  "Mästocka",
  "Bollaltebygget",
  "Prästaskogen",
  "Knäreds VV",
  "Smedjeån Skönhult",
  "Stora Neden-Mäsen",
  "Ätran",
  "Sennadalen",
  "Musikedalen",
  "Skogaby"
].map(normalizeText);

const sourceLayers = [
  wfsLayer({
    layerId: "nvr-nature-reserves-route-bbox",
    sourceType: "nature-reserve",
    typeName: "ps-nvr:PS.ProtectedSites.NR",
    recommendation: "Attach reserve rules only to overlapping candidate route or facility context.",
    confidence: "medium-high"
  }),
  wfsLayer({
    layerId: "nvr-cultural-reserves-route-bbox",
    sourceType: "cultural-reserve",
    typeName: "ps-nvr:PS.ProtectedSites.KR",
    recommendation: "Attach cultural-reserve rules only to overlapping candidate route or facility context.",
    confidence: "medium-high"
  }),
  wfsLayer({
    layerId: "nvr-nature-conservation-areas-route-bbox",
    sourceType: "nature-conservation-area",
    typeName: "ps-nvr:PS.ProtectedSites.NVO",
    recommendation: "Attach protected-area rules only to overlapping candidate route or facility context.",
    confidence: "medium"
  }),
  wfsLayer({
    layerId: "nvr-national-parks-route-bbox",
    sourceType: "national-park",
    typeName: "ps-nvr:PS.ProtectedSites.NP",
    recommendation: "Attach national-park rules only to overlapping candidate route or facility context.",
    confidence: "medium-high"
  }),
  wfsLayer({
    layerId: "natura-2000-route-bbox",
    sourceType: "natura-2000",
    typeName: "ps-n2k:PS.ProtectedSites.Natura2000",
    nameProperty: "omradesnamn",
    sourceTypeProperty: "omradestyp",
    recommendation: "Attach Natura 2000 context only where final candidate geometry intersects the polygon.",
    confidence: "medium-high"
  }),
  wfsLayer({
    layerId: "water-protection-route-bbox",
    sourceType: "water-protection-area",
    typeName: "am-restriction:AM.drinkingWaterProtectionArea",
    outputFormat: "json",
    recommendation: "Attach water-protection caveats only to overlapping route or facility context.",
    confidence: "medium-high"
  }),
  wfsLayer({
    layerId: "regulatory-areas-route-bbox",
    sourceType: "regulatory-area",
    typeName: "am-restriction:AM.regulatoryAreas",
    outputFormat: "json",
    nameProperties: ["objektnamn", "foreskriftsomradenamn"],
    sourceTypeProperty: "foreskriftstyp",
    keepProperties: [
      "beslutsstatus",
      "foreskriftstyp",
      "foreskriftssubtyp",
      "frandatum",
      "tilldatum",
      "beskrivning",
      "objektnamn",
      "foreskriftsomradenamn",
      "berordalan"
    ],
    recommendation:
      "Attach access, bird-protection and other regulatory-area warnings only to route or facility overlaps; preserve seasonal dates in warning descriptions.",
    confidence: "medium-high"
  }),
  arcgisBiotopeLayer()
];

const output = await buildCandidateLayerOverlays({
  projectRoot,
  trailId,
  lastUpdated,
  sourceArtifact: `${trailId}/normalization-handoff.research.json`,
  method:
    "Fetched official Naturvårdsverket protected-area/Natura 2000/water-protection/regulatory-area WFS layers and Skogsstyrelsen biotopskydd ArcGIS GeoJSON within the Hallandsleden candidate route bbox, then checked candidate facility points and canonical candidate route GeoJSON segments. Draw-ready GeoJSON is intentionally excluded from route-overlap calculations because it is display QA only.",
  layerSources: sourceLayers,
  routeGeojsonFileFilter: (candidateGeojsonFile) => candidateGeojsonFile.includes("/geometry/canonical/"),
  recordFilter: (record) => record.status === "overlap-detected" || watchlist.some((item) => normalizeText(record.protectedArea).includes(item))
});

console.log(`Built protected-area overlays for ${trailId}.`);
console.log(`Route bbox: ${bboxText}`);
for (const record of output.records) {
  console.log(`- ${record.protectedArea} [${record.sourceLayer}]: ${record.routeOverlaps.length} route overlaps, ${record.facilityOverlaps.length} facility overlaps`);
}

function wfsLayer({
  layerId,
  sourceType,
  typeName,
  outputFormat = "application/json",
  nameProperty = "namn",
  nameProperties = null,
  sourceTypeProperty = "skyddstyp",
  keepProperties = [],
  recommendation,
  confidence
}) {
  const url = new URL(typeName.startsWith("am-restriction:") ? "https://geodata.naturvardsverket.se/geoserver/ows" : "https://geodata.naturvardsverket.se/geoserver/wfs");
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", typeName);
  url.searchParams.set("outputFormat", outputFormat);
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("bbox", bboxText);
  return {
    layerId,
    sourceType,
    sourceUrl: url.toString(),
    nameProperty,
    ...(nameProperties ? { nameProperties } : {}),
    idProperty: "nvrid",
    sourceTypeProperty,
    keepProperties,
    recommendation,
    confidence
  };
}

function arcgisBiotopeLayer() {
  const url = new URL(
    "https://geodpags.skogsstyrelsen.se/arcgis/rest/services/Geodataportal/GeodataportalVisaBiotopskydd/MapServer/0/query"
  );
  url.searchParams.set("f", "geojson");
  url.searchParams.set("where", "1=1");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("geometry", `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`);
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  return {
    layerId: "skogsstyrelsen-biotopskydd-route-bbox",
    sourceType: "biotope-protection-area",
    sourceUrl: url.toString(),
    nameProperty: "Beteckn",
    idProperty: "Beteckn",
    sourceTypeProperty: "Biotyp",
    recommendation: "Attach biotope-protection context only where final candidate geometry intersects the polygon.",
    confidence: "medium-high"
  };
}

async function computeRouteBbox(bufferDegrees) {
  const geometryIndex = await readJson(
    path.join(projectRoot, "data/research/candidate-trails", trailId, "normalized-candidate/route-geometry-index.research.json")
  );
  const bboxState = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  for (const section of geometryIndex.sections ?? []) {
    for (const candidateGeojsonFile of section.candidateGeojsonFiles ?? []) {
      if (!candidateGeojsonFile.includes("/geometry/canonical/")) continue;
      const geojson = await readJson(path.join(projectRoot, candidateGeojsonFile));
      for (const feature of geojsonFeatures(geojson)) addCoordinateBounds(feature.geometry?.coordinates, bboxState);
    }
  }
  if (!Number.isFinite(bboxState.minLon)) throw new Error("Cannot compute bbox for Hallandsleden canonical candidate geometry");
  return {
    minLon: round(bboxState.minLon - bufferDegrees, 6),
    minLat: round(bboxState.minLat - bufferDegrees, 6),
    maxLon: round(bboxState.maxLon + bufferDegrees, 6),
    maxLat: round(bboxState.maxLat + bufferDegrees, 6)
  };
}

function geojsonFeatures(geojson) {
  if (geojson.type === "FeatureCollection") return geojson.features ?? [];
  if (geojson.type === "Feature") return [geojson];
  return [];
}

function addCoordinateBounds(coordinates, bboxState) {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    const [lon, lat] = coordinates;
    bboxState.minLon = Math.min(bboxState.minLon, lon);
    bboxState.minLat = Math.min(bboxState.minLat, lat);
    bboxState.maxLon = Math.max(bboxState.maxLon, lon);
    bboxState.maxLat = Math.max(bboxState.maxLat, lat);
    return;
  }
  for (const child of coordinates) addCoordinateBounds(child, bboxState);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizeText(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function round(value, decimals) {
  return Number(value.toFixed(decimals));
}
