import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  arcgisGeojsonSource,
  buildCandidateProtectedAreaOverlays,
  drinkingWaterWfsSource,
  naturaWfsSource,
  nvrWfsSource
} from "./lib/candidate-protected-area-overlays.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const trailId = "ostkustleden";
const lastUpdated = "2026-04-30";

const sourceDescriptors = [
  {
    areaName: "Humlenäs reserve and Natura 2000",
    recommendation: "Attach Humlenäs visitor rules only to the overlapping Nynäs/Humlenäs route and facility context.",
    confidence: "high",
    sources: [
      nvrWfsSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2002273", "Humlenäs"),
      naturaWfsSource("Humlenäs")
    ]
  },
  {
    areaName: "Bråbygden Natura 2000",
    recommendation: "Use as environmental/context warning only where final route geometry intersects the Natura 2000 polygon.",
    confidence: "medium-high",
    sources: [naturaWfsSource("Bråbygden")]
  },
  {
    areaName: "Krokshult reserve and Natura 2000",
    recommendation: "Do not apply Krokshult rules unless the final route/access geometry intersects.",
    confidence: "medium-high",
    sources: [
      nvrWfsSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2002269", "Krokshult"),
      naturaWfsSource("Krokshult")
    ]
  },
  {
    areaName: "Misterhults skärgård nature reserve",
    recommendation: "Keep as off-route coastal/archipelago context unless route or access geometry intersects.",
    confidence: "medium-high",
    sources: [nvrWfsSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2002259", "Misterhults skärgård")]
  },
  {
    areaName: "Tjustgöl nature reserve",
    recommendation: "Do not attach Tjustgöl rules to stage 6 unless final geometry intersects the reserve boundary.",
    confidence: "medium-high",
    sources: [nvrWfsSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2053929", "Tjustgöl")]
  },
  {
    areaName: "Figeholm reserve and Natura 2000",
    recommendation: "Attach Figeholm reserve visitor rules to overlapping stage-7 route/facility context.",
    confidence: "high",
    sources: [
      nvrWfsSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2012989", "Figeholm"),
      naturaWfsSource("Figeholm")
    ]
  },
  {
    areaName: "Stamsjövägen nature reserve",
    recommendation: "Keep as nearby Fårbo/E22 context unless final route/access geometry intersects.",
    confidence: "medium-high",
    sources: [nvrWfsSource("nature-reserve", "ps-nvr:PS.ProtectedSites.NR", "2022669", "Stamsjövägen")]
  },
  {
    areaName: "Stensjö by cultural reserve",
    recommendation: "Attach cultural-reserve rules to overlapping stage-8 route and facility context.",
    confidence: "high",
    sources: [nvrWfsSource("cultural-reserve", "ps-nvr:PS.ProtectedSites.KR", "2054561", "Stensjö by")]
  },
  {
    areaName: "Viråns vattensystem Natura 2000",
    recommendation: "Attach Natura 2000 context only where final stage-8 route geometry intersects the river-system polygon.",
    confidence: "medium-high",
    sources: [naturaWfsSource("Viråns vattensystem")]
  },
  {
    areaName: "Hummeln/Kristdala water-protection area",
    recommendation: "Attach water-protection caveats only to overlapping route/facility context near Hummeln/Kristdala.",
    confidence: "medium-high",
    sources: [drinkingWaterWfsSource("2058321", "Hummeln/Kristdala")]
  },
  {
    areaName: "Eckern and Djupeträsk water-protection area",
    recommendation: "Attach water-protection caveats only where final route/facility geometry intersects.",
    confidence: "medium-high",
    sources: [drinkingWaterWfsSource("2011726", "Eckern och Djupeträsk")]
  },
  {
    areaName: "Fårbo water-protection area",
    recommendation: "Keep as nearby environmental constraint unless final route/access geometry intersects.",
    confidence: "medium-high",
    sources: [drinkingWaterWfsSource("2011723", "Fårbo")]
  },
  {
    areaName: "Bockara water-protection area",
    recommendation: "Do not attach water-protection caveats unless final route/access geometry intersects.",
    confidence: "medium-high",
    sources: [drinkingWaterWfsSource("2011724", "Bockara")]
  },
  {
    areaName: "Älvehult water-protection area",
    recommendation: "Do not attach water-protection caveats unless final route/access geometry intersects.",
    confidence: "medium-high",
    sources: [drinkingWaterWfsSource("2011725", "Älvehult")]
  },
  {
    areaName: "Biotopskydd SK 568-2007",
    recommendation: "Attach biotope-protection context only where final stage-8 route/access geometry intersects.",
    confidence: "medium-high",
    sources: [
      arcgisGeojsonSource(
        "biotope-protection-area",
        "SK 568-2007",
        "SK 568-2007",
        "https://geodpags.skogsstyrelsen.se/arcgis/rest/services/Geodataportal/GeodataportalVisaBiotopskydd/MapServer/0/query?f=geojson&where=Beteckn%3D%27SK%20568-2007%27&outFields=*&outSR=4326"
      )
    ]
  }
];

const output = await buildCandidateProtectedAreaOverlays({
  projectRoot,
  trailId,
  lastUpdated,
  sourceArtifact: `${trailId}/normalization-handoff.research.json`,
  method:
    "Fetched official Naturvårdsverket NVR/Natura 2000/water-protection WFS polygons plus Skogsstyrelsen biotopskydd ArcGIS GeoJSON for the boundary-sensitive Ostkustleden rule list, then checked all normalized candidate facility points and generated candidate GPX route GeoJSON segments.",
  sourceDescriptors
});

console.log(`Built protected-area overlays for ${trailId}.`);
for (const record of output.records) {
  console.log(`- ${record.protectedArea}: ${record.routeOverlaps.length} route overlaps, ${record.facilityOverlaps.length} facility overlaps`);
}
