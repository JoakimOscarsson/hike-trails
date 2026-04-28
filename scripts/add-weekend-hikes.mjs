import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { resolveLocationFromStart } from "./location.mjs";
import { writeHikeData } from "./write-hike-data.mjs";

const projectRoot = process.cwd();
const hikesPath = path.join(projectRoot, "data", "hikes.json");
const routesDir = path.join(projectRoot, "public", "routes");

const roslagsRules =
  "Weekend route assembled from marked Roslagsleden stages. Follow Allemansrätten and local reserve rules, use official fire places, check current fire bans, camp only where permitted, and pack out all trash.";

const roslagsUtilities =
  "Roslagsleden stages often include rest areas with shelters, fire places, toilets, parking, and SL access at stage starts/ends. Check each linked stage page for current facility status.";

const roslagsWater =
  "Carry enough water between known refill points. Some stages list taps at sports grounds, outdoor centers, museums, or seasonal facilities; verify before relying on them.";

const weekendHikes = [
  {
    id: "varmdoleden-weekend",
    name: "Värmdöleden",
    distanceKm: 25,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/varmdoleden",
    gpxUrls: ["https://www.naturkartan.se/en/stockholms-lan/varmdoleden.gpx"],
    description:
      "A long Värmdö trail from Strömmen toward Saltarö that can be split into shorter stages for a relaxed weekend. It is also possible as a very long day for fast hikers.",
    gettingThere:
      "Use buses and local access points around Värmdö; the route can be divided into shorter stages with several possible start/end points.",
    campingRules:
      "Weekend route. Check Värmdö municipality and reserve-specific rules before camping, use designated fire places where required, check fire bans, and leave no trace.",
    utilities: [
      "Several settlement and bus-access points along the route",
      "Prepared rest spots are noted on Naturkartan",
      "Services vary by stage, so verify before departure"
    ],
    waterSources: [
      "Carry water between services",
      "Natural water should be treated before drinking"
    ],
    notes: [
      "Good borderline day/weekend route",
      "Useful if you want a two-stage coastal Stockholm County hike"
    ]
  },
  {
    id: "roslagsleden-stages-1-2-weekend",
    name: "Roslagsleden stages 1-2: Danderyd to Örsta",
    distanceKm: 28.5,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/danderyd-karby-gard-roslagsleden-etapp-1",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/danderyd-karby-gard-roslagsleden-etapp-1.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2.gpx"
    ],
    description:
      "A very accessible first weekend on Roslagsleden, linking Danderyd, Karby gård, and Örsta through forest, cultural landscapes, and several rest areas.",
    gettingThere:
      "Start near Danderyd/Rinkeby norra and finish around Örsta. Karby gård works as a natural stage break with SL access.",
    campingRules: roslagsRules,
    utilities: [
      "Toilets and water around Enebybergs IP and Rösjöbadet on stage 1",
      "Shelter and fire/rest areas around Gullsjön and Angarnssjöängen on stage 2",
      "SL access at the stage ends"
    ],
    waterSources: [
      "Year-round tap water at Enebybergs IP is listed for stage 1",
      roslagsWater
    ],
    notes: ["Easy-access weekend intro", "Natural break at Karby gård"]
  },
  {
    id: "roslagsleden-stages-2-3-weekend",
    name: "Roslagsleden stages 2-3: Karby gård to Lövhagen",
    distanceKm: 29.2,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/orsta-lovhagen-roslagsleden-etapp-3.gpx"
    ],
    description:
      "A two-stage Roslagsleden weekend from Karby gård via Örsta toward Lövhagen, with nature reserve landscapes and practical rest points.",
    gettingThere:
      "Start at Karby gård and continue via Örsta. Check Naturkartan stage pages and SL for current start/end buses.",
    campingRules: roslagsRules,
    utilities: [roslagsUtilities, "Angarnssjöängen has useful rest/overnight infrastructure according to Naturkartan research"],
    waterSources: [roslagsWater, "Össeby IP water was listed in weekend research for this section"],
    notes: ["Good if you have already done stage 1", "Check wet ground conditions around reserve areas"]
  },
  {
    id: "roslagsleden-stages-3-4-weekend",
    name: "Roslagsleden stages 3-4: Örsta to Domarudden",
    distanceKm: 28.8,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/orsta-lovhagen-roslagsleden-etapp-3",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/orsta-lovhagen-roslagsleden-etapp-3.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden.gpx"
    ],
    description:
      "A compact Roslagsleden weekend ending at Domarudden, with a stronger outdoor-center finish than many other stage combinations.",
    gettingThere:
      "Start around Örsta and finish at Domarudden. Use SL and the Naturkartan stage pages to confirm current connections.",
    campingRules: roslagsRules,
    utilities: ["Domarudden has outdoor-center services, swimming, toilets, food/service, cabins, sauna, and rest areas", roslagsUtilities],
    waterSources: ["Domarudden has year-round water according to weekend research", roslagsWater],
    notes: ["Good two-day split with Domarudden as the destination", "Some sections can be wet after rain"]
  },
  {
    id: "roslagsleden-stages-4-5-weekend",
    name: "Roslagsleden stages 4-5: Lövhagen to Wira bruk",
    distanceKm: 33.3,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk.gpx"
    ],
    description:
      "A fuller Roslagsleden weekend through Domarudden toward Wira bruk, with outdoor-center services and a more rural second half.",
    gettingThere:
      "Start at Lövhagen and finish at Wira bruk. Domarudden is the obvious overnight/service point between stages.",
    campingRules: roslagsRules,
    utilities: ["Domarudden outdoor-center services between stages", roslagsUtilities],
    waterSources: ["Refill at Domarudden before continuing", roslagsWater],
    notes: ["Good proper weekend distance", "Check Naturkartan warnings for wet or beaver-flooded sections"]
  },
  {
    id: "roslagsleden-stages-5-6-weekend",
    name: "Roslagsleden stages 5-6: Domarudden to Penningby",
    distanceKm: 40.2,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6.gpx"
    ],
    description:
      "A wilder two-stage weekend from Domarudden through Wira bruk to Penningby, with shelters, fire places, and rural Roslagen terrain.",
    gettingThere:
      "Start at Domarudden and finish near Penningby. Confirm bus timing carefully, especially for the finish.",
    campingRules: roslagsRules,
    utilities: ["Kvarngården shelter/fireplace/toilet and summer water were identified in research", "Bergshamra has grocery/pizzeria via detour", roslagsUtilities],
    waterSources: ["Seasonal water may be available around Kvarngården", roslagsWater],
    notes: ["More remote feel than the early Roslagsleden stages", "Plan transport and water more carefully"]
  },
  {
    id: "roslagsleden-stages-6-7-weekend",
    name: "Roslagsleden stages 6-7: Wira bruk to Vigelsjö",
    distanceKm: 35.8,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7.gpx"
    ],
    description:
      "A mid-Roslagsleden weekend from Wira bruk through Penningby toward Vigelsjö, linking cultural landscapes with longer forest walking.",
    gettingThere: "Start at Wira bruk and finish near Vigelsjö/Norrtälje. Check SL/regional bus timing before committing.",
    campingRules: roslagsRules,
    utilities: [roslagsUtilities, "Stage services are more spaced out than near Stockholm"],
    waterSources: [roslagsWater],
    notes: ["Good for a quieter Roslagen weekend", "Carry more food and water margin than on stages 1-2"]
  },
  {
    id: "roslagsleden-stages-7-8-weekend",
    name: "Roslagsleden stages 7-8: Penningby to Roslagsbro",
    distanceKm: 28.5,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/vigelsjo-roslagsbro-roslagsleden-etapp-8.gpx"
    ],
    description:
      "A northern Stockholm County Roslagsleden weekend toward Roslagsbro, with Norrtälje-area access and a manageable two-stage distance.",
    gettingThere: "Start near Penningby and finish near Roslagsbro. Use Norrtälje-area buses and Naturkartan stage directions.",
    campingRules: roslagsRules,
    utilities: [roslagsUtilities, "Norrtälje/Vigelsjö area gives better service access than some rural stages"],
    waterSources: [roslagsWater],
    notes: ["Manageable weekend distance", "Good option once you want Roslagsleden beyond the Stockholm suburbs"]
  },
  {
    id: "roslagsleden-stages-8-9-weekend",
    name: "Roslagsleden stages 8-9: Vigelsjö to Gåsvik",
    distanceKm: 36.4,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/vigelsjo-roslagsbro-roslagsleden-etapp-8",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/vigelsjo-roslagsbro-roslagsleden-etapp-8.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9.gpx"
    ],
    description:
      "A longer Roslagsleden weekend from Vigelsjö via Roslagsbro toward Gåsvik, including stage 9's varied Roslagen landscapes, Rådasjön, and Väddö canal area.",
    gettingThere: "Start near Vigelsjö and finish near Gåsvik/Bagghus. Confirm buses before departure.",
    campingRules: roslagsRules,
    utilities: ["Stage 9 lists toilets, rest areas, bathing, and nearby services around Råda, Erikskulle, and Gåsvik", roslagsUtilities],
    waterSources: ["Stage 9 lists water at Vårlyckans IP and seasonal water at Erikskulle", roslagsWater],
    notes: ["Longer two-day option", "Stage 9 includes several good rest areas and a possible paid tent option near Hagsta gård"]
  },
  {
    id: "roslagsleden-stages-9-10-weekend",
    name: "Roslagsleden stages 9-10: Roslagsbro to Sandviken",
    distanceKm: 32.5,
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9",
    gpxUrls: [
      "https://www.naturkartan.se/en/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9.gpx",
      "https://www.naturkartan.se/en/stockholms-lan/gasvik-sandviken-roslagsleden-etapp-10.gpx"
    ],
    description:
      "A northern Roslagsleden weekend from Roslagsbro through Gåsvik to Sandviken, mixing rural roads, forest, lake stops, and coastal Roslagen atmosphere.",
    gettingThere: "Start near Roslagsbro and finish at Sandviken. Check Norrtälje-area bus timing and possible bailouts.",
    campingRules: roslagsRules,
    utilities: ["Stage 9 has several toilets/rest areas and nearby services around Gåsvik", roslagsUtilities],
    waterSources: ["Stage 9 lists water at Vårlyckans IP and seasonal water at Erikskulle", roslagsWater],
    notes: ["Good weekend length with a shorter second stage", "Check seasonal service availability before relying on facilities"]
  }
];

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseGpx(gpx, name) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: true
  });
  const parsed = parser.parse(gpx);
  const features = [];
  const allCoordinates = [];

  for (const track of asArray(parsed.gpx?.trk)) {
    for (const segment of asArray(track.trkseg)) {
      const coordinates = asArray(segment.trkpt)
        .map((point) => [Number(point.lon), Number(point.lat)])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

      if (coordinates.length > 1) {
        allCoordinates.push(...coordinates);
        features.push({
          type: "Feature",
          properties: { name: track.name || name },
          geometry: { type: "LineString", coordinates }
        });
      }
    }
  }

  return { features, coordinates: allCoordinates };
}

function centerFromCoordinates(coordinates) {
  const sums = coordinates.reduce(
    (acc, [lon, lat]) => {
      acc.lon += lon;
      acc.lat += lat;
      return acc;
    },
    { lon: 0, lat: 0 }
  );

  return [Number((sums.lat / coordinates.length).toFixed(6)), Number((sums.lon / coordinates.length).toFixed(6))];
}

async function buildComposite(hike) {
  const features = [];
  const coordinates = [];

  for (const gpxUrl of hike.gpxUrls) {
    const response = await fetch(gpxUrl);
    if (!response.ok) throw new Error(`Failed to fetch ${gpxUrl}: ${response.status}`);
    const parsed = parseGpx(await response.text(), hike.name);
    features.push(...parsed.features);
    coordinates.push(...parsed.coordinates);
  }

  const geojsonPath = `/routes/${hike.id}.geojson`;
  const startCoordinate = coordinates[0];
  const start = [Number(startCoordinate[1].toFixed(6)), Number(startCoordinate[0].toFixed(6))];
  const center = centerFromCoordinates(coordinates);

  await writeFile(
    path.join(projectRoot, "public", geojsonPath),
    JSON.stringify({ type: "FeatureCollection", features }, null, 2)
  );

  return {
    id: hike.id,
    name: hike.name,
    region: "Stockholms län",
    country: "Sweden",
    location: await resolveLocationFromStart(start),
    recommendedTime: "weekend",
    difficulty: "Moderate",
    distanceKm: hike.distanceKm,
    estimatedTime: "2 days",
    routeType: "Point to point",
    season: "April-October",
    description: hike.description,
    gettingThere: hike.gettingThere,
    campingRules: hike.campingRules,
    utilities: hike.utilities,
    waterSources: hike.waterSources,
    notes: [...hike.notes, "Composite weekend route assembled from linked GPX stage files."],
    source: {
      provider: "naturkartan",
      url: hike.sourceUrl,
      lastFetchedAt: new Date().toISOString().slice(0, 10)
    },
    route: {
      status: "ready",
      sourceFormat: "gpx",
      gpxUrl: hike.gpxUrls[0],
      geojsonPath
    },
    map: {
      center,
      zoom: 11,
      externalUrl: hike.sourceUrl
    }
  };
}

await mkdir(routesDir, { recursive: true });
const existing = JSON.parse(await readFile(hikesPath, "utf8"));
const weekendIds = new Set(weekendHikes.map((hike) => hike.id));
const base = existing.filter((hike) => !weekendIds.has(hike.id));
const composites = [];

for (const hike of weekendHikes) {
  composites.push(await buildComposite(hike));
  console.log(`Added ${hike.name}`);
}

const nextHikes = [...composites, ...base];
await writeFile(hikesPath, `${JSON.stringify(nextHikes, null, 2)}\n`);
await writeHikeData(nextHikes);
