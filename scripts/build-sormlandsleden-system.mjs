import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { applySormlandsledenResearchOverlays } from "./sormlandsleden-research-overlays.mjs";
import { buildSormlandsledenRouteGroups } from "./sormlandsleden-route-groups.mjs";
import { annotateTrailSystemFacilityProximity } from "./facility-proximity.mjs";
import { annotateTrailSystemCommuteAccess } from "./commute-access.mjs";
import {
  asArray,
  centerFromCoordinates,
  endpointCoordinatesFromRoute,
  locationFromFirstSectionStart,
  parseGpxFeatureCollection,
  persistTrailSystemBuild,
  runtimeSectionsFromBuiltSections,
  writeRouteFeatureCollection
} from "./lib/trail-system-builder.mjs";

const projectRoot = process.cwd();
const hikesPath = path.join(projectRoot, "data", "hikes.json");
const today = new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSignal = (timeoutMs) =>
  typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(timeoutMs)
    : undefined;

async function fetchTextWithRetry(url, options = {}, retries = 4) {
  const errors = [];
  const timeoutMs = options.timeoutMs ?? 15000;
  const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { ...fetchOptions, signal: fetchOptions.signal ?? fetchSignal(timeoutMs) });
      if (response.ok) return response.text();
      errors.push(`${response.status} ${response.statusText}`.trim());
    } catch (error) {
      errors.push(error.message);
    }
    if (attempt < retries) await sleep(750 * attempt);
  }
  throw new Error(`Failed to fetch ${url}: ${errors.join("; ")}`);
}

const facilityCoordinates = {
  "bjorkhagen-transit": [59.291883, 18.116867],
  "soderbysjon-badplats": [59.282746, 18.147038],
  "soderbysjon-toilet": [59.282746, 18.147038],
  "soderbysjon-fireplace": [59.282746, 18.147038],
  "bjorkhagens-golf-food": [59.2808, 18.1408],
  "sandakallan-source": [59.276486, 18.18698],
  "skogshyddan-access": [59.264283, 18.211217],
  "stralsjobadet": [59.2678, 18.199314],
  "stralsjobadet-toilet": [59.2678, 18.199314],
  "oringebadet": [59.250912, 18.256803],
  "oringebadet-toilet": [59.250912, 18.256803],
  "alby-friluftsgard-food": [59.230717, 18.269683],
  "alby-friluftsgard-toilet": [59.230717, 18.269683],
  "alby-friluftsgard-water": [59.230717, 18.269683],
  "alby-friluftsgard-fireplace": [59.23023188585455, 18.26929493761284],
  "alby-stage-3-fireplace": [59.22972798416833, 18.27098019730187],
  "alby-friluftsgard-swimming": [59.229514, 18.276496],
  "alby-stage-3-swimming": [59.22950329044268, 18.27635228633881],
  "alby-friluftsgard-campsite": [59.230717, 18.269683],
  "hogdalen-source": [59.202, 18.26825],
  "arsjon-shelter": [59.1854, 18.26745],
  "arsjon-fireplace": [59.1854, 18.26745],
  "arsjon-toilet": [59.1854, 18.26745],
  "arsjon-swimming": [59.1854, 18.26745],
  "nyfors-fireplace": [59.22362491696214, 18.26606529291871],
  "nyfors-cultural": [59.22364615507992, 18.267476856708527],
  "tyreso-flaten-fireplace": [59.21936001730563, 18.26169494779435],
  "bylsjon-fireplace": [59.177891, 18.260108],
  "tyresta-by-services": [59.16954773881308, 18.23667169178771],
  "tyresta-by-water": [59.16954773881308, 18.23667169178771],
  "tyresta-by-fireplace": [59.167466, 18.236676],
  "tyresta-by-campsite": [59.1689516427366, 18.2441928853048],
  "skutans-gard-water": [59.16108, 18.18499],
  "rudans-gard-services": [59.164267, 18.132167],
  "rudan-fireplace": [59.1606197963335, 18.1262934207916],
  "rudan-north-accessible-fireplace": [59.1648, 18.1275],
  "rudan-swimming": [59.164267, 18.132167],
  "rudan-parking-transit": [59.164267, 18.132167],
  "rudan-water": [59.16495, 18.130617],
  "riddartorp-pump": [59.144617, 18.07845],
  "oran-east-rest": [59.136, 18.071],
  "svartsjon-rest": [59.132, 18.055],
  "langsjon-shelter": [59.143967, 18.035333],
  "langsjon-fireplace": [59.143967, 18.035333],
  "trehorningen-shelter-west": [59.1503, 18.0354],
  "trehorningen-fireplace-west": [59.1503, 18.0354],
  "trehorningen-shelter-east": [59.151317, 18.0342],
  "trehorningen-fireplace-east": [59.151317, 18.0342],
  "ugglekojan-hut": [59.150083, 18.036817],
  "ugglekojan-fireplace": [59.150083, 18.036817],
  "ugglekojan-toilet": [59.150083, 18.036817],
  "paradiset-entrance": [59.154576, 18.021606],
  "paradiset-fireplace": [59.154576, 18.021606],
  "paradiset-parking": [59.154576, 18.021606],
  "paradiset-shelter": [59.153467, 18.0234],
  "paradiset-pump": [59.153867, 18.02215],
  "karrsjon-rest": [59.16, 17.97],
  "kvarnsjon-shelter": [59.16155, 17.94675],
  "kvarnsjon-spring": [59.161367, 17.9476],
  "lida-friluftsgard-services": [59.163567, 17.881333],
  "lida-toilets": [59.163567, 17.881333],
  "lida-fireplace": [59.163567, 17.881333],
  "lida-tent-meadow": [59.163567, 17.881333],
  "lida-water": [59.163267, 17.881717],
  "lida-getaren-shelter": [59.1613, 17.87615],
  "getaren-shelter": [59.156467, 17.867783],
  "getaren-viewpoint-fireplace": [59.1613, 17.87615],
  "trollsjon-rest": [59.1670003, 17.8060984],
  "varsta-services": [59.1648398, 17.7961302],
  "brotorp-stage-start": [59.17235, 17.798883],
  "brotorpsbadet-services": [59.173, 17.7909],
  "brotorpsbadet-parking": [59.173, 17.7909],
  "brotorpsbadet-fireplace": [59.174029, 17.792462],
  "brotorpsbadet-water-toilet": [59.173, 17.7909],
  "vinterskogen-rest-fireplace": [59.171, 17.786],
  "katarinagarden-bus": [59.1653103, 17.7293821],
  "tysslinge-bus": [59.165593, 17.722361],
  "racehall-olearys": [59.1621676, 17.7410577],
  "ostertalje-gravel-parking": [59.1785, 17.6664],
  "ostertalje-station": [59.17935, 17.666833],
  "eklundsnasbadet": [59.168589, 17.59192],
  "eklundsnasbadet-fireplace": [59.168589, 17.59192],
  "eklundsnasbadet-toilet": [59.168589, 17.59192],
  "eklundsnasbadet-parking": [59.168589, 17.59192],
  "tveta-friluftsgard": [59.157217, 17.597917],
  "tveta-water": [59.157217, 17.597917],
  "tveta-fireplace": [59.157217, 17.597917],
  "tveta-toilet-parking": [59.157217, 17.597917],
  "tvetagarden-masnaren": [59.156667, 17.595],
  "vaskasjon-rest": [59.1341226, 17.57956],
  "skirsjon-rest": [59.12, 17.58],
  "herrvreten-shelter": [59.103617, 17.572567],
  "herrvreten-fireplace": [59.103617, 17.572567],
  "herrvreten-toilet": [59.103617, 17.572567],
  "herrvreten-spring": [59.104667, 17.574417],
  "lerhaga-beach": [59.112, 17.574],
  "jarna-station": [59.093265, 17.568131]
};

function source(provider, url) {
  return { provider, url, lastFetchedAt: today };
}

const curatedSectionSeeds = [
  {
    id: "sormlandsleden-stage-1",
    stageNumber: 1,
    name: "Stage 1: Björkhagen to Skogshyddan",
    from: "Björkhagen",
    to: "Skogshyddan",
    distanceKm: 8.5,
    estimatedTime: "2-3 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-1/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/sormlandsleden-etapp-1.gpx",
    description: "Urban-accessible start through Nackareservatet and Erstavik, with several good exit options but limited reliable drinking water.",
    utilities: [
      "Björkhagen has metro access and nearby city services.",
      "Söderbysjön has bathing, grills, and seasonal toilets; nearby golf/club services vary by season.",
      "Skogshyddan/Lovisedal has local access roads and limited parking rather than a staffed trail service point."
    ],
    waterSources: [
      "Sandakällan is a natural source between Tenntorpsvägen and Sandasjön. Nacka publishes test values, but drinking is still at your own risk.",
      "Carry city water from Björkhagen when starting this stage."
    ],
    notes: [
      "Nackareservatet and Strålsjön-Erstavik rules make this a poor overnight candidate.",
      "Strålsjön-Erstavik forbids tenting; dogs must be leashed and fires are only allowed in a brought grill or designated place.",
      "Fires are only allowed at arranged grill places near Markuskyrkan/outdoor gym and Söderbysjön; otherwise fire is prohibited in the reserve.",
      "Dogs are not allowed on Söderbysjöns badplats June 1-August 31.",
      "2024 comments mention missed or hidden turns around the golf restaurant and golf-course/gravel-road area; keep the GPX visible."
    ],
    facilities: [
      ["bjorkhagen-transit", "Björkhagen metro", "transit", "Metro start with nearby shops and city services.", "sormlandsleden"],
      ["soderbysjon-badplats", "Söderbysjöns friluftsbad", "swimming", "Bathing area with grill places and seasonal toilets; verify season before relying on facilities.", "naturkartan"],
      ["soderbysjon-toilet", "Söderbysjön seasonal toilet", "toilet", "Seasonal toilet at the bathing area; do not assume winter/after-season availability.", "stockholm"],
      ["soderbysjon-fireplace", "Söderbysjön grill places", "fireplace", "Grilling is possible at the bathing area where allowed; bring fuel and respect fire bans.", "stockholm"],
      ["bjorkhagens-golf-food", "Björkhagens golf restaurant", "food", "Nearby restaurant/service option by Söderbysjön; check opening hours.", "stockholm"],
      ["sandakallan-source", "Sandakällan", "water", "Natural spring between Tenntorpsvägen and Sandasjön. Nacka notes drinking is at your own risk even when lab values look good.", "nacka"],
      ["skogshyddan-access", "Skogshyddan access", "parking", "Stage boundary with local road access near Lovisedal/Erstavik; services are limited and tenting is prohibited in Strålsjön-Erstavik.", "sormlandsleden"],
      ["stralsjobadet", "Strålsjöbadet", "swimming", "Bathing place near Skogshyddan with jetties and bathing raft; not ideal for small children due to poor visibility depth.", "naturkartan"],
      ["stralsjobadet-toilet", "Strålsjöbadet seasonal toilet", "toilet", "Toilet during bathing season at Strålsjöbadet.", "naturkartan"]
    ]
  },
  {
    id: "sormlandsleden-stage-2",
    stageNumber: 2,
    name: "Stage 2: Skogshyddan to Alby friluftsgård",
    from: "Skogshyddan",
    to: "Alby friluftsgård",
    distanceKm: 6.5,
    estimatedTime: "1.5-2.5 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-2/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/sormlandsleden-etapp-2.gpx",
    description: "Short connector stage toward Tyresö, useful as part of a Björkhagen-Alby day or an easy start toward Tyresta.",
    utilities: ["Most reliable services are at Alby friluftsgård at the end of the stage."],
    waterSources: ["Carry water in from before Skogshyddan/Sandakällan or use Alby as a practical refill if facilities are open."],
    notes: [
      "Treat this as a low-facility connector: no strong mid-stage water/toilet/shelter evidence was found.",
      "Kolardammarna has an official autumn/winter 2025 sediment-removal reroute via the promenade path to the right of the ponds before reconnecting to the normal route.",
      "Reports through November 16, 2025 still mention weak markings around Kolardammarna and a horse/stable area; a December 27, 2025 response says markings were improved during autumn and will be reviewed again in spring."
    ],
    facilities: [
      ["alby-friluftsgard-food", "Alby friluftsgård", "food", "Outdoor center with cafe, rest cabin, parking, bathing, trails, grill/rest areas, and bus access nearby. Cafe currently Mon-Thu 10:00-14:30, Fri closed, Sat-Sun 10:00-16:00; verify before relying on it.", "tyreso"],
      ["alby-friluftsgard-toilet", "Alby toilets", "toilet", "Tyresö lists toilets at Alby open daily 07:00-22:00.", "tyreso"],
      ["alby-friluftsgard-water", "Alby practical refill", "water", "Practical refill via open facilities at Alby friluftsgård; not a separately verified outdoor drinking-water tap.", "tyreso"],
      ["oringebadet", "Öringebadet / Öringesjön", "swimming", "Mid-stage bathing place at the south end of Öringesjön.", "sormlandsleden"],
      ["oringebadet-toilet", "Öringebadet seasonal toilet", "toilet", "Seasonal toilet reported for Öringebadet; verify in shoulder season.", "badplats"],
      ["alby-friluftsgard-fireplace", "Alby uteklassrum grill place", "fireplace", "Specific Naturkartan grill place at Alby; no wood and no grill grate, so bring wood and grill equipment.", "naturkartan"],
      ["alby-friluftsgard-swimming", "Albybadet", "swimming", "Separate bathing area marker with toilet access and cafe/kiosk-style services in season; changing rooms/sauna are closed until further notice.", "tyreso"],
      ["alby-friluftsgard-campsite", "Alby designated tenting", "campsite", "Only occasional single-night tenting at the designated place by the beach/forest edge; groups over 20 need advance permission.", "tyreso"]
    ]
  },
  {
    id: "sormlandsleden-stage-3",
    stageNumber: 3,
    name: "Stage 3: Alby friluftsgård to Tyresta by",
    from: "Alby friluftsgård",
    to: "Tyresta by",
    distanceKm: 13,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-3/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/alby-friluftsgard-tyresta-sormlandsleden-etapp-3.gpx",
    description: "A strong day hike into Tyresta with better wilderness feel, lake rest points, and researched camping/service options at both Årsjön and Tyresta by.",
    utilities: [
      "Alby friluftsgård and Tyresta by are the strongest service points.",
      "Årsjön has a wind shelter, fireplace, dry toilet, and nearby swimming rocks.",
      "Krusboda grocery near the start and Café Rödkullan at Uddby gård about 0.5 km off-route can be useful if open."
    ],
    waterSources: [
      "Högdalen source is a natural source; treat water and carry backup.",
      "Tyresta by has drinking water at the visitor/farm area."
    ],
    notes: [
      "Steep/slippery sections and boardwalks can be slick year-round; offline map recommended.",
      "Naturkartan warns that bark-beetle-damaged spruces can fall; avoid forest sections during strong wind.",
      "Community reports mention occasional confusing marking and fallen trees between Nyfors and Tyresta; offline map recommended."
    ],
    facilities: [
      ["hogdalen-source", "Högdalen source", "water", "Natural water source on or near the stage. Treat water before drinking.", "sormlandsleden"],
      ["alby-friluftsgard-food", "Alby friluftsgård", "food", "Stage-start service cluster with cafe, toilets, parking, bathing, grill/rest areas, and bus access nearby.", "tyreso"],
      ["alby-friluftsgard-toilet", "Alby toilets", "toilet", "Stage-start toilets at Alby, listed open daily 07:00-22:00.", "tyreso"],
      ["alby-friluftsgard-campsite", "Alby designated tenting", "campsite", "Only occasional single-night tenting at the designated place by the beach/forest edge; groups over 20 need advance permission.", "tyreso"],
      ["alby-stage-3-fireplace", "Alby grill place", "fireplace", "Separate arranged Alby grill place with wood nearby but no grill grate; bring equipment.", "naturkartan"],
      ["alby-stage-3-swimming", "Albybadet / Albysjön", "swimming", "Bathing/toilet marker by Albysjön; simple food/cafe is about 500 m away at Alby friluftsgård.", "naturkartan"],
      ["arsjon-shelter", "Årsjön wind shelter", "shelter", "Shelter with fireplace by Årsjön; suitable rest/overnight point when rules and availability allow.", "naturkartan"],
      ["arsjon-fireplace", "Årsjön fireplace", "fireplace", "Arranged fireplace at the Årsjön shelter/rest area; no guaranteed firewood.", "naturkartan"],
      ["arsjon-toilet", "Årsjön dry toilet", "toilet", "Dry toilet reported with the Årsjön shelter/rest area.", "naturkartan"],
      ["arsjon-swimming", "Årsjön swimming rocks", "swimming", "Lake rest area with nearby swimming rocks.", "naturkartan"],
      ["nyfors-fireplace", "Nyfors grill place", "fireplace", "Arranged grill site near Nyfors; bring your own wood and check fire bans.", "naturkartan"],
      ["nyfors-cultural", "Nyfors", "rest-area", "Waterfall/cultural area near the stage; useful landmark separate from the grill point.", "naturkartan"],
      ["tyreso-flaten-fireplace", "Tyresö-Flaten fireplace", "fireplace", "Distinct arranged fireplace near Tyresö-Flaten with wood box noted by Naturkartan; relevant if routing around the Nyfors/Albysjön side.", "naturkartan"],
      ["bylsjon-fireplace", "Bylsjöns eldplats", "fireplace", "Popular fire/bathing/rest stop after Årsjön; may be occupied or full.", "naturkartan"],
      ["tyresta-by-services", "Tyresta by services", "food", "Visitor area with cafe, toilets, drinking water, parking, bus access, and nearby lodging options.", "tyresta"],
      ["tyresta-by-water", "Tyresta by drinking water", "water", "Reliable refill at the Tyresta by visitor/farm area; verify seasonal building hours if arriving late.", "tyresta"],
      ["tyresta-by-fireplace", "Tyresta by fireplace", "fireplace", "Arranged fire site at Tyresta by; fires in the park/reserve are restricted to arranged sites and may still be banned in dry periods.", "tyresta"],
      ["tyresta-by-campsite", "Tyresta by tent meadow", "campsite", "Only allowed tent place at Tyresta by, max three nights, with WC/outdoor sink; the fireplace is about 400 m away near the cafe.", "tyresta"]
    ]
  },
  {
    id: "sormlandsleden-stage-4",
    stageNumber: 4,
    name: "Stage 4: Tyresta by to Handen / Rudans gård",
    from: "Tyresta by",
    to: "Handen / Rudans gård",
    distanceKm: 10,
    estimatedTime: "2.5-3.5 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-4/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/tyresta-by-handen-rudans-gard-sormlandsleden-etapp-4.gpx",
    description: "A transport-friendly Tyresta-to-Handen stage with water at Tyresta, a possible tap at Skutans gård, and endpoint services at Rudan.",
    utilities: [
      "Tyresta by and Rudans gård are the main service nodes.",
      "Rudan has commuter rail access via Handen, bathing, grills, toilets, parking, and rest areas."
    ],
    waterSources: [
      "Refill at Tyresta by.",
      "Skutans gård has a reported water tap by the stable.",
      "Rudan has water near the gård/outdoor area, but late-day access can vary."
    ],
    notes: [
      "Handen/Rudan marking was historically confusing around OKQ8 and Tuvvägen, but late-2024 comments say it improved; keep Naturkartan/GPX available in the urban section.",
      "Naturkartan warns that bark-beetle-damaged spruces can fall; avoid forest sections during strong wind.",
      "Rudan forbids camping on the Rudans gård meadow and disc golf course; dogs must be leashed and fires are only allowed at designated places."
    ],
    facilities: [
      ["tyresta-by-services", "Tyresta by services", "food", "Cafe, toilets, water, bus, parking, and visitor services at the stage start.", "tyresta"],
      ["tyresta-by-water", "Tyresta by drinking water", "water", "Reliable refill at the Tyresta by visitor/farm area.", "tyresta"],
      ["tyresta-by-fireplace", "Tyresta by fireplace", "fireplace", "Arranged fire site near the cafe; camp stoves are allowed elsewhere only where rules permit, and fire bans apply.", "tyresta"],
      ["tyresta-by-campsite", "Tyresta by tent meadow", "campsite", "Only allowed tent place at Tyresta by, max three nights, with WC/outdoor sink; the fireplace is about 400 m away near the cafe.", "tyresta"],
      ["skutans-gard-water", "Skutans gård water tap", "water", "Official stage text confirms a water tap by the stable; coordinate is best-effort from map data.", "haninge"],
      ["rudans-gard-services", "Rudans gård / Handen services", "toilet", "Toilets currently listed 09:00-19:00. Raststuga: Mon-Thu 09:00-15:30, Fri 09:00-13:30, Sat-Sun 09:00-15:00; late-day access has disappointed hikers.", "haninge"],
      ["rudan-fireplace", "West-side Nedre Rudan grill place", "fireplace", "Separate designated grill marker on the west side of Nedre Rudan; Haninge also lists accessible grill/rest areas by the beach. Fires outside designated places are not allowed.", "naturkartan"],
      ["rudan-north-accessible-fireplace", "North Nedre Rudan accessible grill", "fireplace", "Accessibility-adapted grill/rest point by Nedre Rudasjön beach. Coordinate is approximate until verified from Naturkartan map data.", "haninge"],
      ["rudan-swimming", "Rudan bathing area", "swimming", "Bathing lakes and beach areas at Rudans friluftsområde.", "haninge"],
      ["rudan-parking-transit", "Rudan / Handen access", "parking", "Parking and commuter rail access near Rudans gård and Handen.", "haninge"],
      ["rudan-water", "Rudan water tap", "water", "Reported water tap near Rudans gård/outdoor area.", "haninge"]
    ]
  },
  {
    id: "sormlandsleden-stage-5",
    stageNumber: 5,
    name: "Stage 5: Handen / Rudans gård to Paradiset",
    from: "Handen / Rudans gård",
    to: "Paradiset",
    distanceKm: 11.5,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-5/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/handen-rudans-gard-paradiset-sormlandsleden-etapp-5.gpx",
    description: "A compact but facility-rich stage with multiple shelters and overnight points around Långsjön, Trehörningen, Ugglekojan, and Paradiset.",
    utilities: [
      "Rudan and Paradiset bookend the stage with toilets/water/service access.",
      "Långsjön, Trehörningen, and Ugglekojan create several rest or overnight options."
    ],
    waterSources: [
      "Rudan and Paradiset are the most dependable refills.",
      "Riddartorp pump has conflicting quality reports; treat and avoid relying on it as the only source."
    ],
    notes: [
      "Paradiset/Orlången-area rules allow only careful short tenting where permitted; avoid meadows and sensitive ground.",
      "Paradiset firewood is not guaranteed and the area can be busy.",
      "The Riddartorp boardwalk issue was reported passable again in March 2025; July 2025 comments still mention easy-to-miss turns near Riddartorp/after Öran.",
      "Svartsjön reserve forbids open fire and tenting more than two consecutive nights."
    ],
    facilities: [
      ["rudan-water", "Rudan water tap", "water", "Use this as the practical stage-start refill before the forest section.", "haninge"],
      ["riddartorp-pump", "Riddartorp pump", "water", "Pump with reports of smell/taste and no clear bacterial test guarantee. Treat and carry backup.", "sormlandsleden"],
      ["langsjon-shelter", "Långsjön shelter", "shelter", "Shelter/fireplace by Långsjön with bathing and tent spots reported nearby.", "naturkartan"],
      ["trehorningen-shelter-west", "Trehörningen west shelter", "shelter", "One of two shelters/rest areas by Trehörningen, with fireplace and nearby tent spots.", "naturkartan"],
      ["trehorningen-shelter-east", "Trehörningen east shelter", "shelter", "Second shelter/rest area by Trehörningen, useful when one side is occupied.", "naturkartan"],
      ["ugglekojan-hut", "Ugglekojan", "shelter", "Open simple overnight hut with stove and bunks, plus nearby dry toilet/fireplace, trash bin, bathing, and secondary-source reports of unknown-quality water; first come, first served.", "naturkartan"],
      ["oran-east-rest", "Öran east shore", "swimming", "Officially named rest and preferred swimming place on stage 5; coordinate is route-derived approximate.", "sormlandsleden"],
      ["svartsjon-rest", "Svartsjön rest area", "rest-area", "Officially named rest place. Svartsjön reserve forbids open fire and tenting more than two consecutive nights; coordinate is route-derived approximate.", "sormlandsleden"],
      ["langsjon-fireplace", "Långsjön fireplace", "fireplace", "Separate fireplace marker for filtering at the Långsjön shelter/rest area.", "naturkartan"],
      ["trehorningen-fireplace-west", "Trehörningen west fireplace", "fireplace", "Separate fireplace marker for filtering at the west shelter/rest area.", "naturkartan"],
      ["trehorningen-fireplace-east", "Trehörningen east fireplace", "fireplace", "Separate fireplace marker for filtering at the east shelter/rest area.", "naturkartan"],
      ["ugglekojan-fireplace", "Ugglekojan fireplace", "fireplace", "Fire/grill point associated with Ugglekojan; bring fuel and check fire bans.", "naturkartan"],
      ["ugglekojan-toilet", "Ugglekojan dry toilet", "toilet", "Dry toilet reported by the Ugglekojan hut/shelter cluster.", "naturkartan"],
      ["paradiset-entrance", "Paradiset entrance", "toilet", "Reserve entrance with parking, information, portable/dry toilet, bins, fireplaces, simple shelters, and rental overnight cabins; bring your own firewood.", "naturkartan"],
      ["paradiset-fireplace", "Paradiset fireplaces", "fireplace", "Fireplaces at the entrance cluster; bring your own wood and avoid fires on rock or during fire bans.", "naturkartan"],
      ["paradiset-parking", "Paradiset parking", "parking", "Parking/access marker for the Paradiset entrance cluster.", "naturkartan"],
      ["paradiset-shelter", "Paradiset shelter", "shelter", "Shelter/rest area in the Paradiset cluster.", "naturkartan"],
      ["paradiset-pump", "Paradiset pump", "water", "Important water refill at Paradiset; verify pump status in winter/freezing conditions.", "naturkartan"]
    ]
  },
  {
    id: "sormlandsleden-stage-6",
    stageNumber: 6,
    name: "Stage 6: Paradiset to Lida friluftsgård",
    from: "Paradiset",
    to: "Lida friluftsgård",
    distanceKm: 12,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-6/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/paradiset-lida-friluftsgard-sormlandsleden-etapp-6.gpx",
    description: "A forest-and-lake connector between two major outdoor nodes, with unreliable mid-stage water and better services at Paradiset and Lida.",
    utilities: ["Paradiset and Lida are the reliable service endpoints; mid-stage facilities are simpler rest/shelter points."],
    waterSources: [
      "Paradiset and Lida are the reliable refills.",
      "The old Kvarnsjön spring has recent conflicting reports, including dry periods. Treat it as unreliable."
    ],
    notes: [
      "Carry enough water for the full stage unless you have freshly verified the Kvarnsjön source.",
      "In Paradiset, dogs must be leashed, wood collection/tree damage is not allowed, and fires must not be made on bedrock or cliffs.",
      "Watch markings near Paradiset/Ådran/Bruket trail junctions where local loop trails can be easy to follow by mistake."
    ],
    facilities: [
      ["paradiset-pump", "Paradiset pump", "water", "Start refill before leaving Paradiset.", "naturkartan"],
      ["karrsjon-rest", "Kärrsjön rest/fireplace", "fireplace", "Prepared rest place with benches/open fireplace; tent spots exist but the lake is muddy and poor for swimming. Position is approximate.", "sormlandsleden"],
      ["kvarnsjon-shelter", "Former Kvarnsjön shelter", "shelter", "Shelter/fireplace near former Kvarnsjön; 2026 comment reported good condition, fireplace, and view.", "sormlandsleden"],
      ["kvarnsjon-spring", "Former Kvarnsjön spring", "water", "Natural source with dry reports in 2024 and 2025 but water present in Jan 2026; treat as unreliable.", "sormlandsleden"],
      ["getaren-viewpoint-fireplace", "Getaren viewpoint fireplace", "fireplace", "Viewpoint/rest point before Lida with fireplace and benches, maintained by Lida; likely same cluster as the Lida/Getaren shelter area.", "sormlandsleden"],
      ["lida-friluftsgard-services", "Lida friluftsgård", "food", "Major outdoor center with cafe/restaurant, lodging, rentals, parking, bus access, beach, and paid camping/tent field options.", "lida"],
      ["lida-toilets", "Lida toilets", "toilet", "Lida Gym toilets/water daily 08:00-22:00, Naturport 09:00-16:00, summer toilets 24/7; tent meadow hygiene building/WC is closed in winter.", "lida"],
      ["lida-fireplace", "Lida grill places", "fireplace", "Grilling only at prepared grill places; bring wood/charcoal, no disposable grills, no tree cutting, and respect fire bans.", "lida"],
      ["lida-tent-meadow", "Lida tent meadow", "campsite", "Paid/designated tent meadow; use Lida's booking/rules rather than wild camping near the friluftsgård.", "lida"],
      ["lida-water", "Lida water tap", "water", "Reliable refill around Lida friluftsgård, including water by Lida Gym and tent meadow taps.", "lida"]
    ]
  },
  {
    id: "sormlandsleden-stage-7",
    stageNumber: 7,
    name: "Stage 7: Lida friluftsgård to Brotorp",
    from: "Lida friluftsgård",
    to: "Brotorp",
    distanceKm: 6.5,
    estimatedTime: "1.5-2.5 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-7/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/lida-friluftsgard-brotorp-sormlandsleden-etapp-7.gpx",
    description: "A short stage from Lida toward Vårsta/Brotorp, useful as part of a Paradiset-Lida-Brotorp weekend.",
    utilities: ["Lida is the best service point; Brotorpsbadet/Brosjön has seasonal bathing/toilet/kiosk-style services."],
    waterSources: [
      "Refill at Lida before starting.",
      "Vårsta shops/services may be useful off or near route; opening hours vary."
    ],
    notes: [
      "Older trip reports have questioned natural water quality around Getaren; use taps rather than lake/marsh water where possible.",
      "Sörmlandsleden shelters are free, shared, first-come, and have grill places, but no guaranteed firewood or trash bins."
    ],
    facilities: [
      ["lida-friluftsgard-services", "Lida friluftsgård", "food", "Stage-start outdoor center with cafe/restaurant, parking, bus access, rentals, beach, and overnight options.", "lida"],
      ["lida-toilets", "Lida toilets", "toilet", "Lida Gym toilets/water daily 08:00-22:00, Naturport 09:00-16:00, summer toilets 24/7; tent meadow WC is closed in winter.", "lida"],
      ["lida-tent-meadow", "Lida tent meadow", "campsite", "Paid/designated tent meadow at Lida; use Lida's current booking and seasonal toilet rules.", "lida"],
      ["lida-water", "Lida water tap", "water", "Reliable stage-start refill around Lida friluftsgård.", "lida"],
      ["lida-getaren-shelter", "Lida/Getaren shelter", "shelter", "Shelter/rest area in the Lida/Getaren cluster.", "naturkartan"],
      ["getaren-shelter", "Getaren via wetland shelter", "shelter", "Official Sörmlandsleden shelter via wetland, first-come/shared and not bookable.", "sormlandsleden"],
      ["trollsjon-rest", "Trollsjön", "rest-area", "Notable dead-ice hollow/biotope and stage-manager tip; small swimming spot mentioned in trip reports, but not dependable water.", "sormlandsleden"],
      ["varsta-services", "Vårsta services", "food", "Nearby shops/food and bus options can support resupply, but exact opening hours need checking.", "botkyrka"],
      ["brotorp-stage-start", "Brotorp stage access", "parking", "Official stage access point near Brotorp/Brosjön.", "sormlandsleden"],
      ["brotorpsbadet-services", "Brotorpsbadet / Brosjön", "swimming", "Bathing area with seasonal toilets, kiosk/rest services, grills, playground/sports area, and parking.", "botkyrka"],
      ["brotorpsbadet-water-toilet", "Brotorpsbadet seasonal water/toilets", "toilet", "Official stage page lists fresh water and toilets at Brotorpsbadet in season; do not assume year-round service.", "sormlandsleden"],
      ["brotorpsbadet-fireplace", "Brotorpsbadet grill place", "fireplace", "Two grill surfaces according to Naturkartan; bring charcoal/wood.", "naturkartan"]
    ]
  },
  {
    id: "sormlandsleden-stage-8",
    stageNumber: 8,
    name: "Stage 8: Brotorp to Östertälje",
    from: "Brotorp",
    to: "Östertälje",
    distanceKm: 13,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-8/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/brotorp-ostertalje-sormlandsleden-etapp-8.gpx",
    description: "A longer day toward Södertälje with a few off-route service opportunities and recent reroute/obstruction reports.",
    utilities: [
      "Brotorpsbadet has seasonal local facilities at the start.",
      "Racehall/O'Learys at Skälbyvägen 5 can be a useful food/toilet stop when open.",
      "Östertälje has commuter rail access."
    ],
    waterSources: ["Do not assume dependable natural water; carry enough from Brotorp/Vårsta or refill at commercial services if open."],
    notes: [
      "Official 2025-10-11 fault report: storm-felled trees near/behind Racehall/go-kart hall at Tysslinge; follow the marked minor reroute of about 100 m.",
      "Marking into/out of Östertälje can be weak; keep the GPX available.",
      "Vinterskogen reserve rules leash dogs March 1-September 30 and year-round on marked trails; dogs are not allowed at Brosjön beach.",
      "Community reviews mention asphalt/transport-feeling sections, traffic noise, muddy horse-shared sections after rain, narrow/overgrown path, and occasional weak navigation."
    ],
    facilities: [
      ["brotorpsbadet-services", "Brotorpsbadet / Brosjön", "swimming", "Seasonal bathing/toilet/kiosk-style services at the stage start.", "botkyrka"],
      ["brotorpsbadet-parking", "Brotorpsbadet parking", "parking", "True parking marker at Brotorpsbadet, about 400 m into the stage.", "sormlandsleden"],
      ["brotorpsbadet-water-toilet", "Brotorpsbadet seasonal water/toilets", "toilet", "Stage page lists fresh water and toilets at Brotorpsbadet in season; do not assume year-round service.", "sormlandsleden"],
      ["brotorpsbadet-fireplace", "Brotorpsbadet grill place", "fireplace", "Naturkartan lists two grill surfaces; bring fuel and check fire bans.", "naturkartan"],
      ["vinterskogen-rest-fireplace", "Vinterskogen grill and rest area", "fireplace", "Optional grill house/simple grill and rest area between Brosjön and Mellansjön; coordinate is approximate until map-derived.", "naturkartan"],
      ["katarinagarden-bus", "Katarinagården bus access", "transit", "Bus access/exit point, not a parking or service node.", "sormlandsleden"],
      ["tysslinge-bus", "Tysslinge bus stop", "transit", "Useful mid/late-stage road 225 exit where the trail crosses the road; often easier to locate than Katarinagården.", "sl"],
      ["racehall-olearys", "Racehall / O'Learys Södertälje", "food", "Restaurant/activity center near the trail corridor; verify opening hours before planning around it.", "olearys"],
      ["ostertalje-gravel-parking", "Östertälje gravel parking", "parking", "Gravel parking about 150 m south of the stage 8/9 boundary; coordinate is approximate.", "sormlandsleden"],
      ["ostertalje-station", "Östertälje station", "transit", "Commuter rail endpoint with urban services nearby.", "sl"]
    ]
  },
  {
    id: "sormlandsleden-stage-9",
    stageNumber: 9,
    name: "Stage 9: Östertälje to Tvetaberg",
    from: "Östertälje",
    to: "Tvetaberg",
    distanceKm: 9,
    estimatedTime: "2-3 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-9/",
    gpxUrl: "https://www.naturkartan.se/sv/stockholms-lan/ostertalje-tvetaberg-sormlandsleden-etapp-9.gpx",
    description: "A compact Södertälje-stage with bathing and a strong water/service point at Tveta friluftsgård.",
    utilities: [
      "Östertälje gives commuter rail access.",
      "Eklundsnäsbadet has seasonal toilets, grills, bathing, and parking.",
      "Tveta friluftsgård is the key water/rest endpoint."
    ],
    waterSources: ["Tveta friluftsgård has a water tap by the clubhouse and is the best planned refill."],
    notes: [
      "Södertälje canal and road works have created temporary detours. As of 2026-04-21, the culvert under Stålhamravägen/E20 was closed and hikers were directed around OKQ8 about 300 m farther on.",
      "This is more urban/transport-like than wilderness, with asphalt and residential/industrial stretches.",
      "Comments conflict on marking quality: some recent hikers found it fine, while July 2025 reported long early gaps and March 2026 noted the stage 8/9 board lacked a stage 9 map."
    ],
    facilities: [
      ["ostertalje-station", "Östertälje station", "transit", "Commuter rail stage start/end access.", "sl"],
      ["eklundsnasbadet", "Eklundsnäsbadet", "swimming", "Bathing area with seasonal toilets, grills, and free parking; no camping, no beach dogs June 1-August 31, no alcohol/fishing on the beach.", "sodertalje"],
      ["eklundsnasbadet-fireplace", "Eklundsnäsbadet grill places", "fireplace", "Two grill areas; grilling only at fixed grill sites and toilets are seasonal June-August.", "sodertalje"],
      ["eklundsnasbadet-toilet", "Eklundsnäsbadet seasonal toilet", "toilet", "Seasonal toilet open June-August; separate marker so toilet filtering shows it.", "sodertalje"],
      ["eklundsnasbadet-parking", "Eklundsnäsbadet parking", "parking", "Free parking by the bathing area.", "sodertalje"],
      ["tveta-friluftsgard", "Tveta friluftsgård", "rest-area", "Outdoor/recreation area with parking, fireplace/rest options, and nearby bus access.", "sodertalje"],
      ["tveta-fireplace", "Tveta fireplace", "fireplace", "Fixed grill/fire site near parking/Mullespåret with grill grate; bring your own wood or charcoal.", "naturkartan"],
      ["tveta-water", "Tveta friluftsgård water tap", "water", "Water tap by the clubhouse; useful reliable refill before stage 10.", "sodertalje"]
    ]
  },
  {
    id: "sormlandsleden-stage-10",
    stageNumber: 10,
    name: "Stage 10: Tvetaberg to Järna",
    from: "Tvetaberg",
    to: "Järna",
    distanceKm: 12,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-10/",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/tvetaberg-jarna-sormlandsleden-etapp-10.gpx",
    description: "A rural Södertälje-to-Järna stage with several rest points but less dependable water than the mapped service nodes.",
    utilities: [
      "Tveta is the reliable service/water start.",
      "Järna has commuter rail and town services after the finish.",
      "Herrvreten shelter exists but has had negative condition reports; inspect before relying on it."
    ],
    waterSources: [
      "Fill at Tveta before starting.",
      "Herrvreten spring has conflicting recent reports and may be dry or low-flow; treat as unreliable."
    ],
    notes: [
      "If combining stages 9 and 10, Tveta is the main mid-route refill.",
      "Do not rely on Vaskasjöarna for water or swimming due to proximity/history with the waste facility and leachate concerns.",
      "Skirsjön is better treated as a scenic rest/grill/viewpoint than a dependable bathing or water point.",
      "Recent 2025 comments also describe the stage as well marked and good to walk, despite the Herrvreten caution.",
      "Herrvreten shelter has user reports of vandalism/poor condition and safety concerns; treat it as day-use or caution for overnight."
    ],
    facilities: [
      ["tveta-water", "Tveta friluftsgård water tap", "water", "Best refill before the less-serviced stage to Järna.", "sodertalje"],
      ["tveta-fireplace", "Tveta fireplace", "fireplace", "Fixed grill/fire site near parking/Mullespåret with grill grate; bring your own wood or charcoal.", "naturkartan"],
      ["tveta-toilet-parking", "Tveta parking", "parking", "Parking at Tveta/Tvetagården area. Toilet access is not separately verified here, so do not rely on this as a toilet marker.", "sodertalje"],
      ["tvetagarden-masnaren", "Tvetagården / Måsnaren beach", "swimming", "Optional nearby beach/jetty and lakeside grill area about 100 m from Tvetagården; not a municipal service node.", "tvetagarden"],
      ["vaskasjon-rest", "Vaskasjöarna rest/fireplace", "fireplace", "Official rest/fireplace area near Vaskasjöarna, updated by Telge Återvinning in spring 2023. Position is approximate.", "sormlandsleden"],
      ["skirsjon-rest", "Skirsjön rest/fireplace", "fireplace", "Swimming/rest/fireplace is possible and small parking exists at Norra Kallfors; do not treat it as drinking water. Position is approximate.", "sormlandsleden"],
      ["herrvreten-shelter", "Herrvreten shelter", "shelter", "Shelter with fire site; recent reports mention vandalism, trash, used needles, and safety concerns, so day-use is safer than relying on it overnight.", "naturkartan"],
      ["herrvreten-fireplace", "Herrvreten fireplace", "fireplace", "Separate fire site marker at Herrvreten/Logsjön; bring wood or charcoal and check the shelter condition before relying on it.", "naturkartan"],
      ["herrvreten-toilet", "Herrvreten dry toilet", "toilet", "Dry toilet associated with Herrvreten shelter area; apply the same cleanliness/safety caution as the shelter.", "naturkartan"],
      ["herrvreten-spring", "Herrvreten spring", "water", "Natural source with very inconsistent recent flow, including barely any water on 2025-08-09, dry on 2025-08-10, and water again on 2025-08-13. Do not plan around it.", "sormlandsleden"],
      ["lerhaga-beach", "Lerhaga beach", "swimming", "Municipal beach farther along stage 10; official text notes no parking. Coordinate is approximate until verified.", "sormlandsleden"],
      ["jarna-station", "Järna station", "transit", "Commuter rail endpoint about 1 km from the route finish, with town/grocery resupply options nearby.", "sl"]
    ]
  }
];

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stageSortValue(stage) {
  const [main, branch = "0"] = String(stage).split(":");
  return Number(main) * 100 + Number(branch);
}

function slugFromStage(stage) {
  return String(stage).replace(/:/g, "-");
}

function sectionIdFromStage(stage) {
  return `sormlandsleden-stage-${slugFromStage(stage)}`;
}

function normalizePlaceName(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.+?\)/g, "")
    .replace(/\/.*$/g, "")
    .replace(/,.*$/g, "")
    .replace(/\betapp\b.*$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function estimatedTimeFromDistance(distanceKm) {
  const low = Math.max(1, Math.floor(distanceKm / 4.5));
  const high = Math.max(low + 1, Math.ceil(distanceKm / 3));
  return `${low}-${high} hours`;
}

function inferRecommendedTimes(distanceKm) {
  if (distanceKm <= 20) return ["dayhike"];
  if (distanceKm <= 45) return ["weekend"];
  if (distanceKm <= 90) return ["3-5-days"];
  return ["6-plus-days"];
}

function facilityTypeFromOfficialTitle(title) {
  const lower = title.toLowerCase();
  if (lower.includes("tält")) return "campsite";
  if (lower.includes("vindskydd")) return "shelter";
  if (lower.includes("vatten")) return "water";
  if (lower.includes("wc") || lower.includes("dass")) return "toilet";
  if (lower.includes("parkering")) return "parking";
  if (lower.includes("kollektivtrafik")) return "transit";
  if (lower.includes("sevärdhet") || lower.includes("utsikt")) return "rest-area";
  return "rest-area";
}

function officialFacilityNamesFromDetail(html) {
  const markerBlock = html.match(/<div class="marker-wrapper">([\s\S]*?)<\/div><a rel="next"/)?.[1] ?? "";
  const facilities = [];
  for (const marker of markerBlock.matchAll(/<div class="marker-item(?:[^"]*)">([\s\S]*?)<\/div><\/div>/g)) {
    const block = marker[1];
    const icon = block.match(/icon-arrowdown-([a-z0-9-]+)\.svg/)?.[1];
    const name = stripTags(block.match(/<div class="marker-item--under">([\s\S]*?)<\/div>/)?.[1] ?? "");
    if (!name || name === "undefined") continue;
    facilities.push({ icon, name });
  }
  return facilities;
}

function officialFacilitiesFromListItem(block) {
  return [...block.matchAll(/title="([^"]+)" class="tooltip"/g)]
    .map((match) => match[1])
    .filter((title) => !title.includes("Tillgänglighet"));
}

function mapPointFromDetail(html) {
  const match = html.match(/'coordinates':\s*\[\s*([0-9.]+),\s*([0-9.]+)/);
  if (!match) return undefined;
  return [Number(match[2]), Number(match[1])];
}

function descriptionFromDetail(html) {
  const article = html.match(/<div class="hiking-content-text">([\s\S]*?)<div class="hiking-info-wrapper">/)?.[1];
  if (!article) return undefined;
  const text = stripTags(article);
  return text.length > 700 ? `${text.slice(0, 697).trim()}...` : text;
}

async function fetchOfficialSectionCatalog() {
  console.error("Fetching official Sörmlandsleden section catalog...");
  const html = await fetchTextWithRetry("https://www.sormlandsleden.se/planera-vandring/");
  const items = [];

  for (const hrefMatch of html.matchAll(
    /href="(https:\/\/www\.sormlandsleden\.se\/vandring\/etapp\/[^"]+\/?)" title="Etapp ([^"]+)"/g
  )) {
    const href = hrefMatch[1];
    const stage = hrefMatch[2];
    if (items.some((item) => item.stage === stage)) continue;

    const itemStart = html.lastIndexOf('<div class="hike-list-item">', hrefMatch.index);
    const itemEnd = html.indexOf('<div class="hike-list-item">', hrefMatch.index + 1);
    const block = html.slice(itemStart, itemEnd === -1 ? undefined : itemEnd);
    const route = block.match(/hike-list-item--start-stop etapp"[\s\S]*?>\s*([^<]+?)\s*<span>→<\/span>\s*([^<]+?)\s*<\/a>/);
    const area = stripTags(block.match(/hike-list-item--area"[\s\S]*?>([\s\S]*?)<\/a>/)?.[1] ?? "");
    const distanceKm = Number((block.match(/hike-list-item--length"[\s\S]*?>\s*([0-9.,]+) km/)?.[1] ?? "0").replace(",", "."));
    if (!route || !distanceKm) continue;

    items.push({
      href,
      stage,
      from: route[1].trim(),
      to: route[2].trim(),
      area,
      distanceKm,
      officialFacilityTitles: officialFacilitiesFromListItem(block)
    });
  }

  return items.sort((a, b) => stageSortValue(a.stage) - stageSortValue(b.stage));
}

async function buildAllSectionSeeds(curatedSeeds) {
  const curatedByStage = new Map(curatedSeeds.map((seed) => [String(seed.stageNumber), seed]));
  const officialSections = await fetchOfficialSectionCatalog();
  console.error(`Fetched official catalog with ${officialSections.length} sections; fetching detail pages...`);

  if (officialSections.length !== 94) {
    console.warn(`Expected 94 official Sörmlandsleden sections, found ${officialSections.length}`);
  }

  const generated = [];
  for (const [index, official] of officialSections.entries()) {
    if (index === 0 || (index + 1) % 10 === 0 || index === officialSections.length - 1) {
      console.error(`Fetching official section detail ${index + 1}/${officialSections.length}: ${official.stage}`);
    }
    const curated = curatedByStage.get(official.stage);
    const detailHtml = await fetchTextWithRetry(official.href, { timeoutMs: 12000 }, 2).catch(() => "");
    const mapPoint = mapPointFromDetail(detailHtml);

    if (curated) {
      generated.push({
        ...curated,
        mapPoint: curated.mapPoint ?? mapPoint
      });
      continue;
    }

    const detailFacilities = officialFacilityNamesFromDetail(detailHtml);
    const officialFacilityTitles = official.officialFacilityTitles.length
      ? official.officialFacilityTitles
      : [...new Set(detailFacilities.map((facility) => facility.icon).filter(Boolean))];
    const facilities = officialFacilityTitles.slice(0, 8).map((title, index) => {
      const type = facilityTypeFromOfficialTitle(title);
      const id = `sormlandsleden-stage-${slugFromStage(official.stage)}-official-${type}-${index + 1}`;
      if (mapPoint) facilityCoordinates[id] = mapPoint;
      const named = detailFacilities.find((facility) => facility.icon && title.toLowerCase().includes(facility.icon));
      const name = named?.name || title;
      return [
        id,
        name,
        type,
        `Official Sörmlandsleden lists ${title.toLowerCase()} for this stage. This is an official catalog marker; exact sub-location still needs the same deep facility research pass used for stages 1-10.`,
        "sormlandsleden"
      ];
    });

    generated.push({
      id: `sormlandsleden-stage-${slugFromStage(official.stage)}`,
      stageNumber: official.stage.includes(":") ? official.stage : Number(official.stage),
      name: `Stage ${official.stage}: ${official.from} to ${official.to}`,
      from: official.from,
      to: official.to,
      distanceKm: official.distanceKm,
      estimatedTime: estimatedTimeFromDistance(official.distanceKm),
      sourceUrl: official.href,
      description:
        descriptionFromDetail(detailHtml) ??
        `Official Sörmlandsleden stage ${official.stage}, ${official.from} to ${official.to}.`,
      utilities: [
        `Official area: ${official.area}.`,
        "This stage is in the official 94-stage catalog. It still needs the full enrichment pass across books, hiker blogs, forums, reviews, municipality/reserve pages, and service maps."
      ],
      waterSources: [
        officialFacilityTitles.some((title) => /vatten/i.test(title))
          ? "Official page indicates a water facility on this stage; verify exact location, quality, and seasonal reliability before relying on it."
          : "No verified water refill has been deeply researched for this stage yet; carry enough water until enriched."
      ],
      notes: [
        "Official section imported from Sörmlandsleden.se so the full 94-stage network is represented.",
        "Facility markers on this section are conservative official-summary markers until a deep research pass verifies exact coordinates, current rules, blogs/books, and recent hiker reports."
      ],
      facilities,
      mapPoint
    });
  }

  console.error("Finished official detail pages.");

  return generated;
}

const sectionSeeds = await buildAllSectionSeeds(curatedSectionSeeds);

function haversineDistanceKm(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const radiusKm = 6371.0088;
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLon = toRadians(b[0] - a[0]);
  const angle =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a[1])) * Math.cos(toRadians(b[1])) * Math.sin(deltaLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(angle), Math.sqrt(1 - angle));
}

function routeLengthKm(coordinates) {
  return coordinates.slice(1).reduce((total, coordinate, index) => total + haversineDistanceKm(coordinates[index], coordinate), 0);
}

function coordinateKey(coordinate) {
  return `${coordinate[0].toFixed(6)},${coordinate[1].toFixed(6)}`;
}

class MinHeap {
  values = [];

  push(value) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (this.values[parentIndex][0] <= value[0]) break;
      this.values[index] = this.values[parentIndex];
      index = parentIndex;
    }
    this.values[index] = value;
  }

  pop() {
    if (!this.values.length) return undefined;
    const result = this.values[0];
    const value = this.values.pop();
    if (this.values.length && value) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.values.length) break;
        const child = right < this.values.length && this.values[right][0] < this.values[left][0] ? right : left;
        if (this.values[child][0] >= value[0]) break;
        this.values[index] = this.values[child];
        index = child;
      }
      this.values[index] = value;
    }
    return result;
  }

  get length() {
    return this.values.length;
  }
}

function buildOfficialRouteNetwork(gpxText) {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(gpxText).gpx;
  const nodes = [];
  const nodeIndexByKey = new Map();
  const adjacency = [];
  const segmentEndpointIndexes = [];
  const segments = [];

  function addNode(coordinate) {
    const key = coordinateKey(coordinate);
    const existingIndex = nodeIndexByKey.get(key);
    if (existingIndex !== undefined) return existingIndex;
    const index = nodes.length;
    nodes.push(coordinate);
    nodeIndexByKey.set(key, index);
    adjacency.push([]);
    return index;
  }

  function addEdge(from, to, weight) {
    adjacency[from].push([to, weight]);
    adjacency[to].push([from, weight]);
  }

  for (const track of asArray(parsed?.trk)) {
    for (const segment of asArray(track.trkseg)) {
      const coordinates = asArray(segment.trkpt)
        .map((point) => [Number(point["@_lon"]), Number(point["@_lat"])])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
      if (coordinates.length < 2) continue;

      let previousIndex;
      let firstIndex;
      let lastIndex;
      const indexes = [];
      for (const coordinate of coordinates) {
        const index = addNode(coordinate);
        if (firstIndex === undefined) firstIndex = index;
        if (previousIndex !== undefined) addEdge(previousIndex, index, haversineDistanceKm(nodes[previousIndex], coordinate));
        previousIndex = index;
        lastIndex = index;
        indexes.push(index);
      }

      segmentEndpointIndexes.push(firstIndex, lastIndex);
      segments.push({
        coordinates,
        indexes,
        lengthKm: routeLengthKm(coordinates)
      });
    }
  }

  for (let index = 0; index < segmentEndpointIndexes.length; index += 1) {
    for (let candidateIndex = index + 1; candidateIndex < segmentEndpointIndexes.length; candidateIndex += 1) {
      const from = segmentEndpointIndexes[index];
      const to = segmentEndpointIndexes[candidateIndex];
      const distanceKm = haversineDistanceKm(nodes[from], nodes[to]);
      if (distanceKm > 0 && distanceKm <= 0.55) addEdge(from, to, distanceKm);
    }
  }

  function nearestNode(latLon) {
    const target = [latLon[1], latLon[0]];
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < nodes.length; index += 1) {
      const distance = haversineDistanceKm(target, nodes[index]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    return { index: bestIndex, distanceKm: bestDistance };
  }

  function shortestPathFromNode(startIndex, targetIndexes) {
    const targets = targetIndexes instanceof Set ? targetIndexes : new Set(targetIndexes);
    const distances = new Float64Array(nodes.length);
    distances.fill(Infinity);
    const previous = new Int32Array(nodes.length);
    previous.fill(-1);
    const heap = new MinHeap();
    distances[startIndex] = 0;
    heap.push([0, startIndex]);

    let targetIndex = -1;
    while (heap.length) {
      const [distance, index] = heap.pop();
      if (distance !== distances[index]) continue;
      if (targets.has(index)) {
        targetIndex = index;
        break;
      }
      for (const [nextIndex, weight] of adjacency[index]) {
        const nextDistance = distance + weight;
        if (nextDistance < distances[nextIndex]) {
          distances[nextIndex] = nextDistance;
          previous[nextIndex] = index;
          heap.push([nextDistance, nextIndex]);
        }
      }
    }

    if (targetIndex < 0) return undefined;
    const coordinates = [];
    for (let index = targetIndex; index !== -1; index = previous[index]) {
      coordinates.push(nodes[index]);
    }
    coordinates.reverse();
    return {
      coordinates,
      lengthKm: distances[targetIndex],
      nodeIndexes: coordinates.map((coordinate) => nodeIndexByKey.get(coordinateKey(coordinate))).filter(Number.isInteger)
    };
  }

  function shortestPathBetweenLatLon(startLatLon, endLatLon) {
    const start = nearestNode(startLatLon);
    const end = nearestNode(endLatLon);
    const path = shortestPathFromNode(start.index, new Set([end.index]));
    return path ? { ...path, startSnapKm: start.distanceKm, endSnapKm: end.distanceKm } : undefined;
  }

  function segmentRouteByDistance(startLatLon, distanceKm) {
    const startCoordinate = [startLatLon[1], startLatLon[0]];
    const candidates = [];

    for (const segment of segments) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      for (let index = 0; index < segment.coordinates.length; index += 1) {
        const distance = haversineDistanceKm(startCoordinate, segment.coordinates[index]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }
      if (nearestDistance > 0.35) continue;

      for (const direction of [1, -1]) {
        const coordinates = [segment.coordinates[nearestIndex]];
        const indexes = [segment.indexes[nearestIndex]];
        let walkedKm = 0;
        let index = nearestIndex;
        while (walkedKm < distanceKm && index + direction >= 0 && index + direction < segment.coordinates.length) {
          const nextIndex = index + direction;
          walkedKm += haversineDistanceKm(segment.coordinates[index], segment.coordinates[nextIndex]);
          coordinates.push(segment.coordinates[nextIndex]);
          indexes.push(segment.indexes[nextIndex]);
          index = nextIndex;
        }
        if (coordinates.length > 1) {
          candidates.push({
            coordinates,
            nodeIndexes: indexes,
            lengthKm: walkedKm,
            score: Math.abs(walkedKm - distanceKm) + nearestDistance * 4
          });
        }
      }
    }

    return candidates.sort((a, b) => a.score - b.score)[0];
  }

  return {
    nearestNode,
    shortestPathBetweenLatLon,
    shortestPathFromNode,
    segmentRouteByDistance
  };
}

function routeIsPlausible(route, expectedDistanceKm) {
  if (!route?.coordinates?.length) return false;
  const toleranceKm = Math.max(4, expectedDistanceKm * 0.6);
  return Math.abs(route.lengthKm - expectedDistanceKm) <= toleranceKm;
}

function routeSourceLabel(sourceFormat) {
  if (sourceFormat === "osm-relation") return "OpenStreetMap route relation";
  if (sourceFormat === "official-network-gpx") return "Sörmlandsleden official full GPX";
  return sourceFormat ?? "Unknown route source";
}

function routeFeature(section, route, sourceFormat = "official-network-gpx", sourceUrl) {
  const routePropertyOverrides = new Map([
    [
      "sormlandsleden-stage-5-2",
      {
        routeWarning:
          "Current official Sörmlandsleden page reports an April 2026 reroute between Segersäng and Hemfosa. This drawn line comes from the older official full GPX and should be treated as pending replacement.",
        currentOfficialDistanceKm: 17.5
      }
    ],
    [
      "sormlandsleden-stage-22-1",
      {
        routeWarning:
          "Stage 22:1 is the official 1.5 km Hälleforsnäs station-to-Edströmsvallen connector. Bruksslingan and the Bruksdammen stage junction are continuation/access context after the connector, not part of the official 22:1 distance.",
        currentOfficialDistanceKm: 1.5,
        geometryConfidence: "official-connector-split-from-bruksslingan-continuation"
      }
    ],
    [
      "sormlandsleden-stage-33",
      {
        routeWarning:
          "The official catalog distance is 8 km. Naturkartan currently renders about 7.7 km and this official-network GPX line can measure about 7.5 km, while OSM relation 3690246 sums close to 8.0 km. Keep 8 km as the planning distance and treat small endpoint differences around Lövsjöns sydspets as map-source variation.",
        currentOfficialDistanceKm: 8,
        geometryConfidence: "official-gpx-with-endpoint-variation"
      }
    ],
    [
      "sormlandsleden-stage-34",
      {
        routeWarning:
          "The official catalog distance is 13 km; Sörmlandsleden's 2025 long-distance pass lists 12.5 km and OSM relation 3690159 measures about 12.4 km despite a stale 15 km tag. This drawn line uses the OSM Stage 34 relation because the official full-network GPX shortest path was truncated to about 9 km and missed the Fjällmossen/Lilla Göljen arc.",
        currentOfficialDistanceKm: 13,
        geometryConfidence: "osm-relation-corrected-official-network-truncated"
      }
    ],
    [
      "sormlandsleden-stage-36",
      {
        routeWarning:
          "The official catalog distance is 11 km. Naturkartan currently exposes a stale 7767 m geometry and the official-network GPX shortest path also measured about 7.6 km, missing the Bråviken/Vibberholmen/Nävekvarns klint arc. This drawn line uses OSM relation 3821815, which measures about 10.2 km and matches the visible current stage topology; keep 11 km as the planning distance.",
        currentOfficialDistanceKm: 11,
        geometryConfidence: "osm-relation-corrected-official-network-truncated"
      }
    ],
    [
      "sormlandsleden-stage-36-1",
      {
        routeWarning:
          "The official catalog distance is 9 km. Naturkartan and OSM relation 3696287 measure about 8.5 km, while the official full-network GPX shortest path measured about 8.3 km. This drawn line uses the OSM 36:1 relation for the better current shape, but snaps planning to the official Nävsjön-Gälkhyttan endpoints and keeps 9 km as the planning distance.",
        currentOfficialDistanceKm: 9,
        geometryConfidence: "osm-relation-with-official-endpoint-snap"
      }
    ],
    [
      "sormlandsleden-stage-36-2",
      {
        routeWarning:
          "Stage 36:2 has two official same-endpoint alternatives: the shorter/northern route, listed as 7 km, and the longer Pilthyttedammen/Överdammen shelter route, listed as 9 km. This drawn line is the shorter official-GPX-derived option and measures about 6.3 km; the Överdammen shelter, toilet and fireplace belong to the longer alternative. Naturkartan's 5.1 km geometry appears incomplete for endpoint routing, and OSM relation 3696288 does not cleanly encode both options.",
        currentOfficialDistanceKm: 7,
        alternateOfficialDistanceKm: 9,
        geometryConfidence: "short-option-only-official-alternatives"
      }
    ],
    [
      "sormlandsleden-stage-36-3",
      {
        routeWarning:
          "The current official catalog distance is 5.5 km and Naturkartan lists about 5.3 km. Older long-distance-pass, blog and OSM tag values still say 6.5 km, but the local official-network line and measured OSM relation are in the 5.2-5.4 km range. This stage ends at the Stage 44 junction near Bergshammar, not in Bergshammar village.",
        currentOfficialDistanceKm: 5.5,
        geometryConfidence: "official-gpx-current-distance-stale-older-tags"
      }
    ],
    [
      "sormlandsleden-stage-37",
      {
        routeWarning:
          "The official catalog, Naturkartan and long-distance-pass distance is 6.5 km. This official-network GPX line measures about 5.8 km and OSM relation 3821822 about 5.9 km, while third-party tracks cluster around 5.8-5.9 km. Keep 6.5 km as the planning distance and treat the drawn line as a shorter map-source measurement rather than a broken topology.",
        currentOfficialDistanceKm: 6.5,
        geometryConfidence: "official-gpx-shorter-than-catalog"
      }
    ],
    [
      "sormlandsleden-stage-37-1",
      {
        routeWarning:
          "The official catalog distance is 8 km; the 2025 long-distance pass lists 7.5 km, Naturkartan exposes both 7.2 km and 8466 m, and OSM/AllTrails/blog sources cluster around 8.0-8.5 km. This official-network GPX line measures about 6.9 km. Start and end topology is correct, but the drawn line may be shorter than the currently signed Hyttvallen reroute; follow current orange markings and keep 8 km as the planning distance.",
        currentOfficialDistanceKm: 8,
        geometryConfidence: "official-gpx-shorter-than-current-reroute"
      }
    ],
    [
      "sormlandsleden-stage-37-2",
      {
        routeWarning:
          "The official catalog distance is 8 km and the 2025 long-distance pass lists 7.5 km, while Naturkartan/current official-network geometry measures about 6.8-6.9 km and OSM/third-party sources range roughly 7.1-8.3 km. The official page has an active 2025-10-25 bark-beetle damage notice with a temporary signed reroute and no machine-readable reroute geometry. Use 8 km for planning and follow current orange markings, ribbons and signs on site.",
        currentOfficialDistanceKm: 8,
        geometryConfidence: "active-temporary-reroute-no-machine-geometry"
      }
    ],
    [
      "sormlandsleden-stage-38",
      {
        routeWarning:
          "The official catalog and OSM tag distance is 7 km. Naturkartan/AllTrails/Äventyrligare and OSM measured geometry cluster around 6.7-6.8 km, while this official-network GPX line measures about 6.1 km and Naturkartan also exposes a 6001 m source length. Start/end topology is correct, but the drawn line is source-short, likely around Gullängsberget/variant handling. Use 7 km for planning until refreshed variant geometry is resolved.",
        currentOfficialDistanceKm: 7,
        geometryConfidence: "official-gpx-source-short-variant-area"
      }
    ],
    [
      "sormlandsleden-stage-39",
      {
        routeWarning:
          "The official catalog and long-distance-pass distance is 6 km, while Naturkartan exposes about 5639 m, this local line measures about 5.7 km, OSM relation 3822358 measures about 5.8 km, and third-party sources cluster around 5.77-5.8 km. Start/end topology is continuous from Stage 38 to Stage 40; treat this as normal rounded source-distance drift, not a broken route.",
        currentOfficialDistanceKm: 6,
        geometryConfidence: "rounded-source-distance-drift"
      }
    ],
    [
      "sormlandsleden-stage-40",
      {
        routeWarning:
          "The official catalog distance is 4 km. Naturkartan exposes about 3505 m, this local line measures about 3.4 km, AllTrails lists 3.4 km, Hiking Project 3.1 km, and OSM relation 3822587 measures about 3.4 km even though its distance tag still says 4.5 km. Start/end topology is continuous from Stage 39 at Dragsviken to Stage 41 at Mellsjön; keep 4 km as the planning distance and treat shorter map values as measured-geometry drift.",
        currentOfficialDistanceKm: 4,
        geometryConfidence: "rounded-source-distance-drift-stale-osm-tag"
      }
    ],
    [
      "sormlandsleden-stage-41",
      {
        routeWarning:
          "The official catalog display distance is 7 km, the 2025 long-distance pass lists 7.5 km, Naturkartan exposes about 7375 m, this local official-network line measures about 7.1 km, and Äventyrligare lists about 7.5 km. OSM relation 3822709 is tagged as Stage 41 but currently measures only about 5.45 km and appears to miss the post-2023 routing south of Överbosjön. Use current Sörmlandsleden/Naturkartan geometry and follow orange markings; older GPX/app tracks and OSM-derived 5.5-6 km reports may be stale.",
        currentOfficialDistanceKm: 7,
        alternateOfficialDistanceKm: 7.5,
        geometryConfidence: "official-network-current-osm-stale-after-2023-reroute"
      }
    ],
    [
      "sormlandsleden-stage-42",
      {
        routeWarning:
          "The official catalog display distance is 7 km, the 2025 long-distance pass lists 6.5 km, Naturkartan exposes about 6319 m, this local official-network line measures about 6.3 km, OSM relation 6575013 measures about 6.6 km, Äventyrligare lists about 6.6 km, and AllTrails lists 6.8 km. Start/end topology is continuous from Stage 41 to Stage 43; keep 7 km as the rounded official planning distance while noting current measured geometry is closer to 6.3-6.8 km.",
        currentOfficialDistanceKm: 7,
        alternateOfficialDistanceKm: 6.5,
        geometryConfidence: "rounded-official-distance-current-geometry-shorter"
      }
    ],
    [
      "sormlandsleden-stage-43",
      {
        routeWarning:
          "The official catalog and 2025 long-distance-pass distance is 6 km. Naturkartan exposes about 5863 m, this local official-network line measures about 5.8 km, OSM relation 6575005 measures about 5.95 km despite a stale 5 km distance tag, Äventyrligare lists 5.8 km, while AllTrails and older personal logs around 4.7-5.0 km appear simplified or lower-confidence. Start/end topology is continuous from Stage 42 to Stage 44; keep 6 km as the rounded official planning distance.",
        currentOfficialDistanceKm: 6,
        geometryConfidence: "rounded-official-distance-stale-osm-tag"
      }
    ],
    [
      "sormlandsleden-stage-44-1",
      {
        routeWarning:
          "The official catalog distance is 16.5 km after the July 2025 Jogersöbron-Femöre update. The older official full-network GPX measures about 15.8 km and predates that change, so this drawn line uses OSM relation 9628430, which was updated after the reroute and measures closer to the current official distance despite a stale 15 km distance tag. Do not add the Femöre shelter/loop into this stage unless a future official stage geometry confirms the exact extension.",
        currentOfficialDistanceKm: 16.5,
        geometryConfidence: "osm-relation-post-2025-update-stale-distance-tag"
      }
    ],
    [
      "sormlandsleden-stage-45",
      {
        routeWarning:
          "The official catalog distance is 8 km and Naturkartan exposes about 8.1 km/8328 m. This official-network GPX line is topologically correct from Lindbacke to Oppeby but measures about 7.8 km, while OSM relation 6575118 measures closer to 8.3 km despite a stale 10 km tag. Keep 8 km as the planning distance and treat small city-path differences as map-source variation.",
        currentOfficialDistanceKm: 8,
        geometryConfidence: "official-gpx-topology-correct-city-path-source-drift"
      }
    ],
    [
      "sormlandsleden-stage-45-1",
      {
        routeWarning:
          "The official catalog and OSM relation metadata list Stage 45:1 as 12 km from Nyköpingshus to Strandstugeviken. This drawn line uses OSM relation 9628620 to avoid a stale/wrong official-network GPX segment that pointed west of Nyköping; the point-to-point OSM line measures about 10.5 km, while Naturkartan/AllTrails/Äventyrligare/RouteYou values around 15-20 km appear to include Arnöhalvön loop or connector variants. Keep 12 km as the planning distance and show Arnöhalvön/Gästabudet/Örstigsnäs as related loop options only.",
        currentOfficialDistanceKm: 12,
        geometryConfidence: "osm-relation-point-to-point-loop-variant-distance-drift"
      }
    ],
    [
      "sormlandsleden-stage-53-1",
      {
        routeWarning:
          "The official catalog distance is 8 km, while Naturkartan and the corrected relation geometry are about 6.9 km. This drawn line uses the OSM 53:1 relation because the official full-network GPX currently routes north toward Långmaren/Klacka instead of ending at Källviks brygga.",
        currentOfficialDistanceKm: 8
      }
    ],
    [
      "sormlandsleden-stage-55-1",
      {
        routeWarning:
          "Stage 55:1 was rerouted in spring 2026. The current official route is Vagnhärad station to the main trail at Hungaskogen, 7.2 km, but Sörmlandsleden says the updated map is still pending and many public map sources still show the old Sillekrog route. This drawn line is provisional, built from the best available current endpoints and network geometry.",
        currentOfficialDistanceKm: 7.2,
        geometryConfidence: "provisional-official-map-pending",
        deprecatedRouteWarning:
          "Do not use old Sillekrog-to-Hungaskogen Naturkartan/OSM/AllTrails geometry as the current Stage 55:1 route."
      }
    ],
    [
      "sormlandsleden-stage-62",
      {
        routeWarning:
          "The official catalog distance is 7.7 km. This drawn line uses the OSM Stage 62 relation because the official full-network GPX currently points southwest toward Snäckstavik/Olberga instead of east/northeast toward Getaren and Svarvaretorp. It ends at the best visible Svarvaretorp/Stage 7 junction; Lida services remain an onward Stage 7 continuation.",
        currentOfficialDistanceKm: 7.7,
        geometryConfidence: "osm-relation-corrected-official-network-stale"
      }
    ]
  ]);

  return {
    type: "Feature",
    properties: {
      name: section.name,
      source: routeSourceLabel(sourceFormat),
      sourceFormat,
      sourceUrl,
      lengthKm: Number(route.lengthKm.toFixed(2)),
      ...(routePropertyOverrides.get(section.id) ?? {})
    },
    geometry: {
      type: "LineString",
      coordinates: route.coordinates
    }
  };
}

const osmRelationRouteOverrides = new Map([
  ["sormlandsleden-stage-5-1", { relationId: 2344203 }],
  [
    "sormlandsleden-stage-22-1",
    {
      relationId: 9636667,
      endLatLon: [59.1564234, 16.4869276]
    }
  ],
  [
    "sormlandsleden-stage-31-1",
    {
      relationId: 9631248,
      endLatLon: [58.710121, 16.418001]
    }
  ],
  [
    "sormlandsleden-stage-32",
    {
      relationId: 3692978,
      endLatLon: [58.6802, 16.477983]
    }
  ],
  [
    "sormlandsleden-stage-34",
    {
      relationId: 3690159,
      endLatLon: [58.674983, 16.592933]
    }
  ],
  [
    "sormlandsleden-stage-36",
    {
      relationId: 3821815,
      endLatLon: [58.631133, 16.801333]
    }
  ],
  [
    "sormlandsleden-stage-36-1",
    {
      relationId: 3696287,
      startLatLon: [58.663217, 16.734517],
      endLatLon: [58.6922, 16.810833]
    }
  ],
  [
    "sormlandsleden-stage-44-1",
    {
      relationId: 9628430,
      endLatLon: [58.734791, 16.956522]
    }
  ],
  [
    "sormlandsleden-stage-45-1",
    {
      relationId: 9628620,
      endLatLon: [58.7208, 17.0918]
    }
  ],
  [
    "sormlandsleden-stage-53-1",
    {
      relationId: 8426186,
      endLatLon: [58.778544, 17.484497]
    }
  ],
  [
    "sormlandsleden-stage-62",
    {
      relationId: 5655292,
      endLatLon: [59.1581847, 17.8636362]
    }
  ]
]);

const endpointRouteOverrides = new Map([
  [
    "sormlandsleden-stage-32-2",
    {
      startLatLon: [58.6675, 16.463933],
      endLatLon: [58.6802, 16.477983],
      sourceFormat: "official-provisional-network",
      sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-32-2/"
    }
  ],
  [
    "sormlandsleden-stage-55-1",
    {
      startLatLon: [58.945811, 17.498431],
      endLatLon: [58.908156, 17.518981],
      sourceFormat: "official-provisional-network",
      sourceUrl: "https://www.sormlandsleden.se/vandring/etapp/etapp-55-1/"
    }
  ]
]);

async function routeFromOsmRelation(relationId, startLatLon, endLatLon) {
  const query = `[out:json][timeout:25];relation(${relationId});out geom;`;
  const overpassEndpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
  ];
  let response;
  const errors = [];
  for (let attempt = 1; attempt <= 3 && !response?.ok; attempt += 1) {
    for (const endpoint of overpassEndpoints) {
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "hike-library-local-build/0.1"
          },
          signal: fetchSignal(25000),
          body: new URLSearchParams({ data: query })
        });
        if (response.ok) break;
        errors.push(`${endpoint}: ${response.status}`);
        response = undefined;
      } catch (error) {
        errors.push(`${endpoint}: ${error.message}`);
      }
    }
    if (!response?.ok && attempt < 3) await sleep(1000 * attempt);
  }
  if (!response?.ok) throw new Error(`Failed to fetch OSM relation ${relationId}: ${errors.join("; ")}`);

  const relation = (await response.json()).elements?.find((element) => element.type === "relation");
  if (!relation?.members?.length) throw new Error(`No relation geometry found for OSM relation ${relationId}`);

  const nodes = [];
  const nodeIndexByKey = new Map();
  const adjacency = [];

  function addNode(coordinate) {
    const key = coordinateKey(coordinate);
    const existing = nodeIndexByKey.get(key);
    if (existing !== undefined) return existing;
    const index = nodes.length;
    nodeIndexByKey.set(key, index);
    nodes.push(coordinate);
    adjacency.push([]);
    return index;
  }

  function addEdge(from, to, weight) {
    adjacency[from].push([to, weight]);
    adjacency[to].push([from, weight]);
  }

  for (const member of relation.members) {
    const coordinates = (member.geometry ?? [])
      .map((point) => [Number(point.lon), Number(point.lat)])
      .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
    for (let index = 1; index < coordinates.length; index += 1) {
      const from = addNode(coordinates[index - 1]);
      const to = addNode(coordinates[index]);
      addEdge(from, to, haversineDistanceKm(coordinates[index - 1], coordinates[index]));
    }
  }

  function nearestNode(latLon) {
    const coordinate = [latLon[1], latLon[0]];
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < nodes.length; index += 1) {
      const distance = haversineDistanceKm(coordinate, nodes[index]);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    }
    return bestIndex;
  }

  const startIndex = nearestNode(startLatLon);
  const endIndex = nearestNode(endLatLon);
  const distances = new Float64Array(nodes.length);
  distances.fill(Infinity);
  const previous = new Int32Array(nodes.length);
  previous.fill(-1);
  const heap = new MinHeap();
  distances[startIndex] = 0;
  heap.push([0, startIndex]);

  while (heap.length) {
    const [distance, index] = heap.pop();
    if (distance !== distances[index]) continue;
    if (index === endIndex) break;
    for (const [nextIndex, weight] of adjacency[index]) {
      const nextDistance = distance + weight;
      if (nextDistance < distances[nextIndex]) {
        distances[nextIndex] = nextDistance;
        previous[nextIndex] = index;
        heap.push([nextDistance, nextIndex]);
      }
    }
  }

  if (!Number.isFinite(distances[endIndex])) throw new Error(`No path through OSM relation ${relationId}`);
  const coordinates = [];
  const nodeIndexes = [];
  for (let index = endIndex; index !== -1; index = previous[index]) {
    coordinates.push(nodes[index]);
    nodeIndexes.push(index);
  }
  coordinates.reverse();
  nodeIndexes.reverse();
  return {
    coordinates,
    nodeIndexes,
    lengthKm: distances[endIndex],
    sourceUrl: `https://www.openstreetmap.org/relation/${relationId}`
  };
}

async function buildOfficialRouteGeometryBySection(sectionSeeds) {
  const routeGroups = buildSormlandsledenRouteGroups(sectionSeeds);
  const sectionById = new Map(sectionSeeds.map((section) => [section.id, section]));
  const sectionByStartPlace = new Map(
    sectionSeeds
      .filter((section) => section.mapPoint)
      .map((section) => [normalizePlaceName(section.from), section])
      .filter(([place]) => place)
  );
  const routeBySectionId = new Map();
  const routeNodeIndexesBySectionId = new Map();
  const officialGpxUrl = "https://www.sormlandsleden.se/wp-content/themes/sormlandsleden.se/Leden-2024-12-04.gpx";
  const network = buildOfficialRouteNetwork(await fetchTextWithRetry(officialGpxUrl));

  function routeGroupForSection(sectionId) {
    return routeGroups.find((group) => group.sectionIds.includes(sectionId));
  }

  function nextSectionInGroup(section, group) {
    if (!group) return undefined;
    const index = group.sectionIds.indexOf(section.id);
    if (index >= 0 && index < group.sectionIds.length - 1) {
      return sectionById.get(group.sectionIds[index + 1]);
    }
    return undefined;
  }

  function exactDestinationSection(section) {
    const destination = normalizePlaceName(section.to);
    return destination ? sectionByStartPlace.get(destination) : undefined;
  }

  function targetStageId(section, group) {
    const targetStage = String(section.to).match(/etapp\s*(\d+)/i)?.[1];
    if (targetStage) return sectionIdFromStage(targetStage);
    return group?.connectsToSectionIds?.at(-1);
  }

  function storeRoute(section, route, sourceFormat = "official-network-gpx", gpxUrl = officialGpxUrl) {
    if (!route?.coordinates?.length) return;
    routeBySectionId.set(section.id, {
      geojson: {
        type: "FeatureCollection",
        features: [routeFeature(section, route, sourceFormat, gpxUrl)]
      },
      route,
      gpxUrl,
      sourceFormat
    });
    routeNodeIndexesBySectionId.set(section.id, new Set(route.nodeIndexes));
  }

  for (const group of routeGroups.filter((candidate) => candidate.kind === "mainline")) {
    for (const sectionId of group.sectionIds) {
      const section = sectionById.get(sectionId);
      if (!section?.mapPoint) continue;
      const destination = nextSectionInGroup(section, group) ?? exactDestinationSection(section);
      let route = destination?.mapPoint ? network.shortestPathBetweenLatLon(section.mapPoint, destination.mapPoint) : undefined;
      if (!routeIsPlausible(route, section.distanceKm)) {
        route = network.segmentRouteByDistance(section.mapPoint, section.distanceKm);
      }
      storeRoute(section, route);
    }
  }

  for (const group of routeGroups.filter((candidate) => candidate.kind !== "mainline")) {
    for (const sectionId of group.sectionIds) {
      const section = sectionById.get(sectionId);
      if (!section?.mapPoint) continue;
      const destination = nextSectionInGroup(section, group) ?? exactDestinationSection(section);
      let route = destination?.mapPoint ? network.shortestPathBetweenLatLon(section.mapPoint, destination.mapPoint) : undefined;

      if (!routeIsPlausible(route, section.distanceKm)) {
        const targetSectionId = targetStageId(section, group);
        const targetNodes = targetSectionId ? routeNodeIndexesBySectionId.get(targetSectionId) : undefined;
        if (targetNodes?.size) {
          const start = network.nearestNode(section.mapPoint);
          route = network.shortestPathFromNode(start.index, targetNodes);
        }
      }

      if (!routeIsPlausible(route, section.distanceKm)) {
        route = network.segmentRouteByDistance(section.mapPoint, section.distanceKm);
      }

      storeRoute(section, route);
    }
  }

  for (const [sectionId, override] of osmRelationRouteOverrides) {
    const section = sectionById.get(sectionId);
    if (!section?.mapPoint) continue;
    const destinationLatLon = override.endLatLon ?? exactDestinationSection(section)?.mapPoint ?? sectionById.get("sormlandsleden-stage-5-2")?.mapPoint;
    if (!destinationLatLon) continue;
    const route = await routeFromOsmRelation(override.relationId, section.mapPoint, destinationLatLon);
    storeRoute(section, route, "osm-relation", route.sourceUrl);
  }

  for (const [sectionId, override] of endpointRouteOverrides) {
    const section = sectionById.get(sectionId);
    if (!section) continue;
    const route = network.shortestPathBetweenLatLon(override.startLatLon, override.endLatLon);
    if (!route?.coordinates?.length) continue;
    storeRoute(section, route, override.sourceFormat, override.sourceUrl);
  }

  return routeBySectionId;
}

function hydrateFacility(seed, facilityTuple) {
  const [id, name, type, description, provider] = facilityTuple;
  return {
    id,
    name,
    type,
    sectionId: seed.id,
    coordinates: facilityCoordinates[id],
    description,
    source: source(provider, seed.sourceUrl)
  };
}

const officialRouteGeometryBySectionId = await buildOfficialRouteGeometryBySection(sectionSeeds);

async function buildSection(seed) {
  if (!seed.gpxUrl) {
    const officialRoute = officialRouteGeometryBySectionId.get(seed.id);
    if (officialRoute) {
      const geojsonPath = `/routes/${seed.id}.geojson`;
      await writeRouteFeatureCollection({ projectRoot, geojsonPath, features: officialRoute.geojson.features });

      const coordinates = officialRoute.route.coordinates;
      return {
        id: seed.id,
        stageNumber: seed.stageNumber,
        name: seed.name,
        from: seed.from,
        to: seed.to,
        distanceKm: seed.distanceKm,
        estimatedTime: seed.estimatedTime,
        description: seed.description,
        utilities: seed.utilities,
        waterSources: seed.waterSources,
        notes: seed.notes,
        facilities: seed.facilities.map((facility) => hydrateFacility(seed, facility)),
        source: source("sormlandsleden", seed.sourceUrl),
        route: {
          status: "ready",
          sourceFormat: officialRoute.sourceFormat,
          gpxUrl: officialRoute.gpxUrl,
          geojsonPath
        },
        endpointCoordinates: endpointCoordinatesFromRoute(coordinates),
        start: coordinates[0],
        center: centerFromCoordinates(coordinates)
      };
    }

    return {
      id: seed.id,
      stageNumber: seed.stageNumber,
      name: seed.name,
      from: seed.from,
      to: seed.to,
      distanceKm: seed.distanceKm,
      estimatedTime: seed.estimatedTime,
      description: seed.description,
      utilities: seed.utilities,
      waterSources: seed.waterSources,
      notes: seed.notes,
      facilities: seed.facilities.map((facility) => hydrateFacility(seed, facility)),
      source: source("sormlandsleden", seed.sourceUrl),
      route: {
        status: "marker-only",
        sourceFormat: "official-catalog",
        gpxUrl: "",
        geojsonPath: ""
      },
      endpointCoordinates: seed.mapPoint
        ? {
            source: "official-marker",
            start: seed.mapPoint,
            end: seed.mapPoint
          }
        : undefined,
      start: seed.mapPoint ? [seed.mapPoint[1], seed.mapPoint[0]] : undefined,
      center: seed.mapPoint
    };
  }

  const parsed = parseGpxFeatureCollection(await fetchTextWithRetry(seed.gpxUrl), seed.name);
  if (!parsed.coordinates.length) throw new Error(`No coordinates found for ${seed.name}`);

  const geojsonPath = `/routes/${seed.id}.geojson`;
  await writeRouteFeatureCollection({ projectRoot, geojsonPath, features: parsed.features });

  return {
    id: seed.id,
    stageNumber: seed.stageNumber,
    name: seed.name,
    from: seed.from,
    to: seed.to,
    distanceKm: seed.distanceKm,
    estimatedTime: seed.estimatedTime,
    description: seed.description,
    utilities: seed.utilities,
    waterSources: seed.waterSources,
    notes: seed.notes,
    facilities: seed.facilities.map((facility) => hydrateFacility(seed, facility)),
    source: source("sormlandsleden", seed.sourceUrl),
    route: {
      status: "ready",
      sourceFormat: "gpx",
      gpxUrl: seed.gpxUrl,
      geojsonPath
    },
    endpointCoordinates: endpointCoordinatesFromRoute(parsed.coordinates),
    start: parsed.coordinates[0],
    center: centerFromCoordinates(parsed.coordinates)
  };
}

const sectionsWithCoordinates = [];
for (const seed of sectionSeeds) {
  const section = applySormlandsledenResearchOverlays(await buildSection(seed));
  sectionsWithCoordinates.push(section);
  console.log(`Built ${section.name}`);
}

const location = await locationFromFirstSectionStart(sectionsWithCoordinates);
const distanceKm = Number(sectionsWithCoordinates.reduce((total, section) => total + section.distanceKm, 0).toFixed(1));
const routeGroups = buildSormlandsledenRouteGroups(sectionsWithCoordinates);
const groupedSectionIds = new Set(routeGroups.flatMap((group) => group.sectionIds));
const missingRouteGroupSections = sectionsWithCoordinates.filter((section) => !groupedSectionIds.has(section.id));
if (missingRouteGroupSections.length) {
  console.warn(
    `Route groups do not cover ${missingRouteGroupSections.length} sections: ${missingRouteGroupSections
      .map((section) => section.stageNumber)
      .join(", ")}`
  );
}

const trailSystem = await annotateTrailSystemCommuteAccess(await annotateTrailSystemFacilityProximity({
  id: "sormlandsleden",
  itemType: "trail-system",
  name: "Sörmlandsleden",
  region: "Stockholms län",
  country: "Sweden",
  location,
  recommendedTimes: ["dayhike", "weekend", "3-5-days", "6-plus-days"],
  difficulty: "Moderate",
  distanceKm,
  estimatedTime: "1-94 stages",
  routeType: "Point to point",
  season: "Year-round, best when snow-free",
  description:
    "The official Sörmlandsleden stage catalog with 94 stages and branch connectors. Stages 1-10 are deeply enriched; the remaining official stages are represented from Sörmlandsleden's catalog and marked for the same research workflow across books, hiker blogs, forums, reviews, local rules, and service maps.",
  gettingThere:
    "Start and end access varies by selected stage. The Stockholm-area stages include Björkhagen metro, Handen commuter rail, Östertälje commuter rail, and Järna commuter rail. Later stages span Södermanland and require checking regional buses, train stations, parking, and local road access for the selected section.",
  campingRules:
    "Rules change by reserve. Nackareservatet/Erstavik and Rudan are restrictive enough that overnight plans should use signed/designated places only. Tyresta national park/reserve allows camping only at designated sites such as Tyresta by and selected shelter/rest areas under posted limits. Paradiset/Orlången-area short tenting is more permissive but still excludes sensitive ground, meadows, and signed no-camping areas. Fires should be treated as official-fireplace-only, and current fire bans always override stored data.",
  utilities: [
    "The strongest service nodes are Björkhagen, Alby friluftsgård, Tyresta by, Rudans gård/Handen, Paradiset, Lida friluftsgård, Östertälje, Tveta friluftsgård, and Järna.",
    "Shelter-rich areas include Årsjön, Trehörningen/Ugglekojan, Paradiset, Kvarnsjön, Lida/Getaren, and Herrvreten.",
    "Several facilities are seasonal or after-hours dependent; the app stores known positions but planning should still check the linked source before departure."
  ],
  waterSources: [
    "Most dependable refills are at staffed/outdoor centers: Alby, Tyresta by, Rudan, Paradiset, Lida, Tveta, and urban endpoints.",
    "Natural sources and pumps such as Sandakällan, Högdalen, Riddartorp, Kvarnsjön, and Herrvreten should be treated or filtered and may be dry or poor quality.",
    "Carry enough water between confirmed taps, especially on stages 6, 8, and 10."
  ],
  notes: [
    "The full official catalog is included so filters and route planning do not hide later Sörmlandsleden stages.",
    "Branches such as 5:1, 12:1, and similar connector stages are official sections but not always a simple linear continuation. The route builder groups them separately so branch plans do not accidentally include unrelated mainline sections.",
    "All official stages and branch connectors have route-group coverage, facility enrichment, water status, access context, and reserve/current-condition notes where research found them.",
    "Recent reports mention temporary reroutes, storm-felled trees, or weak markings around Kolardammarna, Rudan/Handen, Tysslinge/Lövstalund, Södertälje canal works, and some forest sections.",
    "Facility coordinates with approximate wording should be verified against signage before using them as sole safety-critical resources."
  ],
  source: source("sormlandsleden", "https://www.sormlandsleden.se/planera-vandring/"),
  map: {
    center: [59.183, 17.99],
    zoom: 9,
    externalUrl: "https://www.sormlandsleden.se/planera-vandring/"
  },
  sections: runtimeSectionsFromBuiltSections(sectionsWithCoordinates),
  routeGroups,
  presets: [
    {
      id: "stockholm-start-day",
      name: "Stockholm start day",
      description: "Stages 1-2, Björkhagen to Alby, 15 km.",
      startSectionId: "sormlandsleden-stage-1",
      endSectionId: "sormlandsleden-stage-2"
    },
    {
      id: "tyresta-day",
      name: "Tyresta day",
      description: "Stage 3, Alby to Tyresta by, 13 km.",
      startSectionId: "sormlandsleden-stage-3",
      endSectionId: "sormlandsleden-stage-3"
    },
    {
      id: "rudan-paradiset-weekend",
      name: "Rudan-Paradiset weekend",
      description: "Stages 4-5, Tyresta by to Paradiset, 21.5 km.",
      startSectionId: "sormlandsleden-stage-4",
      endSectionId: "sormlandsleden-stage-5"
    },
    {
      id: "paradiset-lida-weekend",
      name: "Paradiset-Lida weekend",
      description: "Stages 6-7, Paradiset to Brotorp, 18.5 km.",
      startSectionId: "sormlandsleden-stage-6",
      endSectionId: "sormlandsleden-stage-7"
    },
    {
      id: "sodertalje-jarna",
      name: "Södertälje-Järna",
      description: "Stages 9-10, Östertälje to Järna, 21 km.",
      startSectionId: "sormlandsleden-stage-9",
      endSectionId: "sormlandsleden-stage-10"
    },
    {
      id: "first-ten",
      name: "First ten stages",
      description: "Stages 1-10, Björkhagen to Järna, 102 km.",
      startSectionId: "sormlandsleden-stage-1",
      endSectionId: "sormlandsleden-stage-10"
    },
    {
      id: "official-catalog",
      name: "Main route",
      description: "Continuous mainline stages 1-62. Branch/access routes are separate groups.",
      startSectionId: "sormlandsleden-stage-1",
      endSectionId: "sormlandsleden-stage-62"
    }
  ]
}, { projectRoot, thresholdKm: 2 }));

await persistTrailSystemBuild({
  projectRoot,
  hikesPath,
  trailSystem,
  filterHikes: () => false
});

console.log(`Wrote Sörmlandsleden as one trail system with ${trailSystem.sections.length} sections.`);
