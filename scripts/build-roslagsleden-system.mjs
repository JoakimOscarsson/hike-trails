import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { resolveLocationFromStart } from "./location.mjs";
import { writeHikeData } from "./write-hike-data.mjs";
import { annotateTrailSystemFacilityProximity } from "./facility-proximity.mjs";
import { annotateTrailSystemCommuteAccess } from "./commute-access.mjs";

const projectRoot = process.cwd();
const hikesPath = path.join(projectRoot, "data", "hikes.json");
const trailSystemsPath = path.join(projectRoot, "data", "trail-systems.json");
const routesDir = path.join(projectRoot, "public", "routes");

const facilityCoordinates = {
  "fjaturen-shelter": [59.455831, 18.001051],
  "fjaturen-fireplace": [59.455831, 18.001051],
  "enebybergs-ip-water": [59.4253, 18.0427],
  "enebybergs-motionsspar-fireplace": [59.4257458, 18.0210624],
  "sodersattra-rest-area": [59.4259, 18.0145],
  "kolartorp-fireplace": [59.4324, 17.9866],
  "rosjobadet-camping": [59.4463, 17.9549],
  "karby-gard-food": [59.4793, 18.053],
  "karingsjon-shelter": [59.460954, 18.003403],
  "stora-ladangen-campsite": [59.5057, 18.1169],
  "stora-ladangen-toilet": [59.5057, 18.1169],
  "skogberga-shelter": [59.4924, 18.0957],
  "skogberga-fireplace": [59.4924, 18.0957],
  "gullsjon-shelter": [59.478393, 18.085717],
  "taby-ip-water": [59.4439, 18.0712],
  "skavloten-off-route-service": [59.4864, 18.1042],
  "angarnssjoangen-campsite": [59.5407, 18.1702],
  "angarnssjoangen-fireplace": [59.5407, 18.1702],
  "vallentuna-ip-water": [59.53501, 18.09541],
  "vallentuna-ip-toilet": [59.53501, 18.09541],
  "orsta-accessible-toilet": [59.5427244, 18.1673194],
  "orsta-parking": [59.541216, 18.169594],
  "angarnssjoangen-shelter-stage-3": [59.543169, 18.167254],
  "angarnssjoangen-tent-stage-3": [59.545895, 18.16917],
  "angarnssjoangen-fireplace-stage-3": [59.545895, 18.16917],
  "osseby-ip-water": [59.5486, 18.2468],
  "brottby-services": [59.5624, 18.2417],
  "kvarnstugan-brottby": [59.5618, 18.2443],
  "romossen-shelter": [59.5929, 18.2927],
  "romossen-fireplace": [59.5929, 18.2927],
  "lilla-harsjon-rest-area": [59.570752, 18.332527],
  "lilla-harsjon-campsite": [59.570752, 18.332527],
  "domarudden-water": [59.5188, 18.3429],
  "domarudden-food": [59.5188, 18.3429],
  "trehorningen-fireplace": [59.529742, 18.356553],
  "brollsta-golf-water": [59.5267, 18.3008],
  "domarudden-designated-tenting": [59.5188, 18.3429],
  "domarudden-bad-shelters": [59.516297, 18.344301],
  "drangsjon-shelter": [59.516697, 18.340416],
  "drangsjon-fireplace": [59.516697, 18.340416],
  "oppsjon-rest-area": [59.543636, 18.380941],
  "viren-campsite": [59.578064, 18.534501],
  "norrsand-viren-swimming": [59.578064, 18.534501],
  "vira-bruk-food": [59.6811, 18.6812],
  "vira-bruk-water": [59.6811, 18.6812],
  "domaruddens-badplats-stage-5": [59.5188, 18.3429],
  "kvarngarden-rest-area": [59.6388, 18.6294],
  "kvarngarden-water": [59.6388, 18.6294],
  "bergshamra-services": [59.6348, 18.6314],
  "grevinnans-ra-rest-house": [59.662217, 18.630318],
  "gunnsjon-swimming": [59.6487, 18.6407],
  "morabadet-swimming": [59.632526, 18.668282],
  "linneladan-stage-6-water": [59.68151, 18.681457],
  "penningby-toilet": [59.6811, 18.6812],
  "penningby-slott-parking": [59.681499, 18.672701],
  "karleksudden-badplats": [59.752912, 18.729163],
  "kyrksjon-rest-area": [59.7197, 18.7096],
  "kvisthamrabacken-fireplace": [59.7489, 18.6917],
  "borgmastarholmen-fireplace": [59.7604, 18.7063],
  "linneladan-water": [59.6816, 18.681],
  "norrtalje-services": [59.7582, 18.7049],
  "lommarbadet": [59.7711, 18.6915],
  "norrtalje-camping": [59.7703, 18.6846],
  "gillfjarden-rest-area": [59.78993, 18.730238],
  "farsna-shelter": [59.774984, 18.68827],
  "farsna-cafe-toilet": [59.774984, 18.68827],
  "farsna-skogslekplats": [59.774984, 18.68827],
  "gillfjarden-fireplace": [59.78993, 18.730238],
  "varlyckans-ip-stage-8-water": [59.837049, 18.739731],
  "roslagsbro-canoe-put-in": [59.829691, 18.73691],
  "roslagsbro-parking-transit": [59.8357, 18.7401],
  "varlyckans-ip-fireplace": [59.837049, 18.739731],
  "varlyckans-ip-water": [59.837049, 18.739731],
  "tandrudan-toilet": [59.8682, 18.7715],
  "rada-rest-area": [59.903744, 18.821077],
  "hagsta-gard-campsite": [59.8892, 18.7851],
  "flottskar-fireplace": [59.9221, 18.8128],
  "erikskulle-water": [59.890339, 18.712601],
  "erikskulle-toilet": [59.890339, 18.712601],
  "bagghus-gasvik-toilet": [59.9388, 18.8259],
  "vaddo-gardsmejeri": [59.9749, 18.8126],
  "sandvikens-camping": [59.979617, 18.87774],
  "sandvikens-camping-toilet": [59.979617, 18.87774],
  "bagghusbron-toilet-stage-10": [59.9388, 18.8259],
  "almsta-services": [59.9665, 18.8082],
  "almsta-guestharbour-water": [59.976906, 18.810295],
  "vikingalunden-ip": [59.975371, 18.821927],
  "vikingalunden-fireplace": [59.97591, 18.82521],
  "sandviken-badplats": [59.9816, 18.8869]
};

const roslagsledenCompositeIds = new Set([
  "danderyd-karby-gard-roslagsleden-etapp-1",
  "karby-gard-orsta-roslagsleden-etapp-2",
  "roslagsleden-stages-1-2-weekend",
  "roslagsleden-stages-2-3-weekend",
  "roslagsleden-stages-3-4-weekend",
  "roslagsleden-stages-4-5-weekend",
  "roslagsleden-stages-5-6-weekend",
  "roslagsleden-stages-6-7-weekend",
  "roslagsleden-stages-7-8-weekend",
  "roslagsleden-stages-8-9-weekend",
  "roslagsleden-stages-9-10-weekend"
]);

function isOldRoslagsledenStandalone(hike) {
  return roslagsledenCompositeIds.has(hike.id) || /roslagsleden/i.test(`${hike.name ?? ""} ${hike.source?.url ?? ""}`);
}

const sectionSeeds = [
  {
    id: "roslagsleden-stage-1",
    stageNumber: 1,
    name: "Stage 1: Danderyd to Karby gård",
    from: "Danderyd",
    to: "Karby gård",
    distanceKm: 15.1,
    estimatedTime: "4-5 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/danderyd-karby-gard-roslagsleden-etapp-1",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/danderyd-karby-gard-roslagsleden-etapp-1.gpx",
    description: "Accessible first Roslagsleden stage from suburban Danderyd into lakes, forest, and Karby gård.",
    utilities: [
      "SL access near the start and Karby gård at the end.",
      "Enebybergs IP has year-round daytime toilets and year-round outdoor water tap.",
      "Rösjöbadet/Rösjöbaden has camping, restaurant/bar, cabins/glamping, bathing, toilets, and showers.",
      "Karby gård has weekend cafe/light meals, craft shop, exhibitions, parking, and bus access."
    ],
    waterSources: [
      "Enebybergs IP outdoor water tap is listed year-round.",
      "Rösjöbadet/Rösjöbaden has staffed service facilities; verify guest access and opening hours."
    ],
    notes: [
      "Good public-transport start for a larger Roslagsleden trip.",
      "Treat lake water and Grillplatser shoreline water as raw surface water, not drinking refill."
    ],
    facilities: [
      {
        id: "fjaturen-shelter",
        name: "Vindskydd Fjäturen",
        type: "shelter",
        description: "Shelter with fireplace and benches by Fjäturen. Naturkartan notes that there is no firewood storage.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/vindskydd-fjaturen"
      },
      {
        id: "fjaturen-fireplace",
        name: "Fjäturen fireplace",
        type: "fireplace",
        description: "Official fireplace at Vindskydd Fjäturen on stage 1; bring your own firewood.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/vindskydd-fjaturen"
      },
      {
        id: "enebybergs-ip-water",
        name: "Enebybergs IP water and toilet",
        type: "water",
        description: "Year-round outdoor water tap and year-round daytime toilets; also parking limits on weekdays.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/danderyd-karby-gard-roslagsleden-etapp-1"
      },
      {
        id: "enebybergs-motionsspar-fireplace",
        name: "Grillplats Enebybergs motionsspår",
        type: "fireplace",
        description: "Separate official grill/fireplace near Enebybergs motionsspår with benches. Roslagsleden passes close by; bring your own wood.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/grillplats-rinkebyskogen"
      },
      {
        id: "sodersattra-rest-area",
        name: "Södersättra",
        type: "rest-area",
        description: "Rest/fire area with fireplace, firewood, benches, and dry toilet listed on the stage inventory.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/danderyd-karby-gard-roslagsleden-etapp-1"
      },
      {
        id: "kolartorp-fireplace",
        name: "Kolartorp",
        type: "fireplace",
        description: "Accessible fireplace with firewood and benches listed on the stage inventory.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/danderyd-karby-gard-roslagsleden-etapp-1"
      },
      {
        id: "rosjobadet-camping",
        name: "Rösjöbaden / Rösjöbadet",
        type: "campsite",
        description: "Year-round camping with cabins/glamping, restaurant/bar, bathing area, changing rooms, toilet, grill, and nearby cafe/minigolf.",
        sourceUrl: "https://rosjobaden.se/"
      },
      {
        id: "karby-gard-food",
        name: "Karby gård",
        type: "food",
        description: "Cafe/light meals, craft shop, exhibitions, free parking, and bus access; weekend opening is commonly 12-16 but should be checked.",
        sourceUrl: "https://www.karbygard.se/"
      },
      {
        id: "karingsjon-shelter",
        name: "Käringsjön SV",
        type: "shelter",
        description: "Lakeside shelter and fireplace. Naturkartan reports no firewood; Grillplatser marks it as suitable for overnighting.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/vindskydd-karingsjon"
      }
    ]
  },
  {
    id: "roslagsleden-stage-2",
    stageNumber: 2,
    name: "Stage 2: Karby gård to Örsta",
    from: "Karby gård",
    to: "Örsta",
    distanceKm: 13.4,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2.gpx",
    description: "A varied stage with cultural landscapes, forest, and rest areas around Angarnssjöängen.",
    utilities: [
      "Gullsjön, Skogberga, Stora Ladängen, and Angarnssjöängen/Örsta provide the main rest/camp/fire options.",
      "Täby IP/Vikingavallen has year-round outdoor water, daytime toilet, and shower/changing rooms.",
      "Skavlöten is about 3 km off trail with beach, shelter, fireplaces, toilets, showers/sauna access, and seasonal/weekend service."
    ],
    waterSources: [
      "Täby IP/Vikingavallen outdoor tap is listed year-round, 24/7.",
      "Skavlöten water tap is listed summer-only.",
      "Stora Ladängen photos mention a non-potable pump; do not treat it as drinking water."
    ],
    notes: [
      "Natural continuation from stage 1 for an easy first weekend.",
      "Angarnssjöängen is a reserve: tent only in the designated area, max two consecutive nights; fires only at designated places."
    ],
    facilities: [
      {
        id: "stora-ladangen-campsite",
        name: "Tältplats Stora Ladängen",
        type: "campsite",
        description: "Tent camping is permitted by the Vallentuna-owned house at Stora Ladängen. Fireplace nearby; bring your own firewood.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/taltplats-stora-ladangen"
      },
      {
        id: "stora-ladangen-toilet",
        name: "Stora Ladängen toilet",
        type: "toilet",
        description: "Naturkartan lists a toilet at Tältplats Stora Ladängen.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/taltplats-stora-ladangen"
      },
      {
        id: "skogberga-shelter",
        name: "Vindskydd Skogberga / Fågelsången",
        type: "shelter",
        description: "Rest area with shelter, fireplace, benches, and tables. Community trip reports also call this Fågelsången; Grillplatser marks it suitable for overnighting.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/vindskydd-skogberga"
      },
      {
        id: "skogberga-fireplace",
        name: "Skogberga fireplace",
        type: "fireplace",
        description: "Official fireplace at Vindskydd Skogberga; bring your own firewood and make fires safely.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/vindskydd-skogberga"
      },
      {
        id: "gullsjon-shelter",
        name: "Gullsjön",
        type: "shelter",
        description: "Shelter, fireplace, benches, and lakeside rest; Grillplatser marks it as suitable for overnighting.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/vindskydd-gullsjon"
      },
      {
        id: "taby-ip-water",
        name: "Täby IP / Vikingavallen",
        type: "water",
        description: "Year-round outdoor water tap, daytime toilet, and year-round shower/changing-room access listed on the stage inventory.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2"
      },
      {
        id: "vallentuna-ip-water",
        name: "Vallentuna IP water",
        type: "water",
        description: "Off-route service option with year-round outdoor drinking-water tap listed 24/7, plus showers/changing/sauna when facilities are open.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2"
      },
      {
        id: "vallentuna-ip-toilet",
        name: "Vallentuna IP toilet",
        type: "toilet",
        description: "Off-route daytime toilet at Vallentuna IP, useful if continuing toward Örsta/Angarnssjöängen.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/karby-gard-orsta-roslagsleden-etapp-2"
      },
      {
        id: "skavloten-off-route-service",
        name: "Skavlötens friluftsgård",
        type: "rest-area",
        description: "About 3 km off trail: beach, shelter, fireplaces, benches, toilets, shower/sauna access, seasonal/weekend service, and summer-only water tap.",
        sourceUrl: "https://www.taby.se/fritid-och-kultur/idrott-och-motion/friluftsanlaggningar/skavlotens-friluftsanlaggning/"
      },
      {
        id: "angarnssjoangen-campsite",
        name: "Angarnssjöängen / Örsta tent area",
        type: "campsite",
        description: "Designated tent area with shelter, grill/fireplace, benches, and toilet. Tenting outside the designated area is forbidden; max two consecutive nights.",
        sourceUrl: "https://www.lansstyrelsen.se/stockholm/besoksmal/naturreservat/angarnssjoangen.html"
      },
      {
        id: "angarnssjoangen-fireplace",
        name: "Angarnssjöängen / Örsta fireplace",
        type: "fireplace",
        description: "Designated fire/grill place in the reserve; Länsstyrelsen says fires only at designated places.",
        sourceUrl: "https://www.lansstyrelsen.se/stockholm/besoksmal/naturreservat/angarnssjoangen.html"
      },
      {
        id: "orsta-accessible-toilet",
        name: "Örsta naturcentrum accessible toilet",
        type: "toilet",
        description: "Accessible toilet behind the red Naturcentrum building at Örsta. Local birding group notes the tap water here is not suitable as drinking water.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/angarnssjoangen-tillganglihetsanpassad-toalett"
      },
      {
        id: "orsta-parking",
        name: "Örsta entrance parking",
        type: "parking",
        description: "Main Angarnssjöängen/Örsta parking by the stage end; Naturkartan lists max 72 hours.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/parkering-vid-orsta"
      }
    ]
  },
  {
    id: "roslagsleden-stage-3",
    stageNumber: 3,
    name: "Stage 3: Örsta to Lövhagen",
    from: "Örsta",
    to: "Lövhagen",
    distanceKm: 15.8,
    estimatedTime: "4-5 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/orsta-lovhagen-roslagsleden-etapp-3",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/orsta-lovhagen-roslagsleden-etapp-3.gpx",
    description: "A northbound stage through quieter Roslagen terrain toward Lövhagen.",
    utilities: [
      "At the Örsta/Angarnssjöängen start there are shelters, designated tenting/fire areas, parking, benches, and an accessible toilet.",
      "Össeby IP has freshwater refill, toilet, shower, benches, and fireplace.",
      "Brottby/Karby has grocery, fuel, food-service options, bus links, and commuter parking.",
      "Römossen has shelter/fireplace but is far from water."
    ],
    waterSources: [
      "Össeby IP outdoor water tap is listed year-round, 24/7.",
      "Carry water for Römossen and the Lövhagen side; sources warn Römossen is far from water."
    ],
    notes: [
      "Works well as part of a two-stage weekend with stage 2 or 4.",
      "Lövhagen has bus connection but no reliable parking; verify any nearby golf-course parking before using it."
    ],
    facilities: [
      {
        id: "angarnssjoangen-shelter-stage-3",
        name: "Vindskydd Angarnssjöängen",
        type: "shelter",
        description: "Two shelters with benches near the Örsta/Angarnssjöängen start; wood, fireplace, and toilet are nearby.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/vindskydd-angarnssjoangen"
      },
      {
        id: "angarnssjoangen-tent-stage-3",
        name: "Tältplats Angarnssjöängen",
        type: "campsite",
        description: "Designated reserve tent area with table and fireplace; tenting is allowed up to two consecutive nights and outside this area is forbidden.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/rastplats-10"
      },
      {
        id: "angarnssjoangen-fireplace-stage-3",
        name: "Angarnssjöängen tent-area fireplace",
        type: "fireplace",
        description: "Designated fire place at the Angarnssjöängen tent area; bring your own wood and follow reserve fire rules.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/rastplats-10"
      },
      {
        id: "osseby-ip-water",
        name: "Össeby IP",
        type: "water",
        description: "Freshwater refill, year-round outdoor water tap, toilet/daytime access, shower, benches, and fireplace; check sports-ground access.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-3-orsta-lovhagen"
      },
      {
        id: "brottby-services",
        name: "Brottby / Karby",
        type: "food",
        description: "Resupply point with ICA Nära Brottbyhallen, fuel, food-service options, bus connections, and commuter parking.",
        sourceUrl: "https://www.ica.se/butiker/oppettider/brottby/"
      },
      {
        id: "kvarnstugan-brottby",
        name: "Kvarnstugan / Kvarnbacken",
        type: "food",
        description: "Seasonal/event cafe and serving by Össeby Hembygdsförening; good rest stop near the route but not reliable unless open.",
        sourceUrl: "https://www.ossebyhbf.se/"
      },
      {
        id: "romossen-shelter",
        name: "Römossen",
        type: "shelter",
        description: "Shelter directly by Roslagsleden with fireplace/grill and benches. Sources warn it is far from water; bring water and firewood.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/rastplats-romossen"
      },
      {
        id: "romossen-fireplace",
        name: "Römossen fireplace",
        type: "fireplace",
        description: "Fireplace with grate at Römossen; no firewood was observed in user-map/blog reports, so bring your own.",
        sourceUrl: "https://grillplatser.nu/Grillplats/Visa/Romossen"
      }
    ]
  },
  {
    id: "roslagsleden-stage-4",
    stageNumber: 4,
    name: "Stage 4: Lövhagen to Domarudden",
    from: "Lövhagen",
    to: "Domarudden",
    distanceKm: 13,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden.gpx",
    description: "A compact stage ending at Domarudden, one of the most useful service points on the route.",
    utilities: [
      "Domarudden has outdoor-center services, toilets, swimming, cabins, sauna, food/service options, shelters, fireplaces, playground, tracks, and outdoor gym.",
      "Brollsta golf course may have summer water and restaurant access; ask permission and treat as seasonal.",
      "Lilla Harsjön and Trehörningen provide the main wild-feeling rest/fire/shelter points."
    ],
    waterSources: [
      "Domarudden outdoor tap is listed year-round, 24/7.",
      "Brollsta golf course outdoor water tap is summer-only and permission-based."
    ],
    notes: [
      "Domarudden is a strong overnight or finish point.",
      "Domarudden tenting is only at designated places; no motorhome pitches.",
      "Current Domarudden service details for 2026 are partly planned/seasonal, so check opening hours."
    ],
    facilities: [
      {
        id: "lilla-harsjon-rest-area",
        name: "Lilla Harsjön",
        type: "rest-area",
        description: "Rest area with shelter, campsite, fireplace, benches, dry toilet, and swimming from rocks.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden"
      },
      {
        id: "lilla-harsjon-campsite",
        name: "Lilla Harsjön tent place",
        type: "campsite",
        description: "Naturkartan lists tenting at Lilla Harsjön on stage 4.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden"
      },
      {
        id: "domarudden-water",
        name: "Domarudden water tap",
        type: "water",
        description: "Outdoor water tap listed as available year-round, 24 hours.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden"
      },
      {
        id: "domarudden-food",
        name: "Domaruddens friluftsgård",
        type: "food",
        description: "Outdoor center area with swimming, toilets, grill places, tracks, playground, and water. Restaurant, cabin, sauna, and kiosk operations have been reported closed indefinitely since 2024, so verify before relying on food/lodging.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden"
      },
      {
        id: "trehorningen-fireplace",
        name: "Trehörningen rest area",
        type: "fireplace",
        description: "Shelter and fireplace by Trehörningen. Naturkartan currently warns it can be hard to reach dry-shod because of beaver flooding.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden"
      },
      {
        id: "brollsta-golf-water",
        name: "Brollsta golf course water",
        type: "water",
        description: "Summer outdoor water tap; ask permission before filling. Restaurant/food is seasonal.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-4-lovhagen-domarudden"
      },
      {
        id: "domarudden-designated-tenting",
        name: "Domarudden designated tenting",
        type: "campsite",
        description: "Tenting allowed only at designated places at Domarudden; no motorhome pitches. Check Österåker's current map/signage.",
        sourceUrl: "https://www.osteraker.se/specialsidor/kommunalaverksamheter/kulturochfritid/lovhogtiderevenemangsperioder/sommariosteraker/tabussentilldomarudden.106.40523b741958b6adf74148fc.html"
      },
      {
        id: "domarudden-bad-shelters",
        name: "Domaruddens bad",
        type: "rest-area",
        description: "Bathing area with two shelters, several grill places, toilet/dry toilet nearby, benches, and firewood that is restocked but not guaranteed.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/vindskydd-domaruddens-bad-bbc035f4-f9ae-4248-b9e2-65819041116c"
      },
      {
        id: "drangsjon-shelter",
        name: "Vindskydd Drängsjön",
        type: "shelter",
        description: "Separate shelter by Drängsjön near Domarudden with fireplace; bring your own wood to be safe.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/vindskydd-drangsjon"
      },
      {
        id: "drangsjon-fireplace",
        name: "Drängsjön fireplace",
        type: "fireplace",
        description: "Official fireplace at Vindskydd Drängsjön near Domarudden.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/vindskydd-drangsjon"
      }
    ]
  },
  {
    id: "roslagsleden-stage-5",
    stageNumber: 5,
    name: "Stage 5: Domarudden to Wira bruk",
    from: "Domarudden",
    to: "Wira bruk",
    distanceKm: 20.3,
    estimatedTime: "5-7 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk.gpx",
    description: "A longer rural stage from Domarudden toward the historic Wira bruk area.",
    utilities: [
      "Domaruddens badplats has shelter, fireplace, grill hut, firewood, benches, toilets, and water at the start.",
      "Oppsjön and Viren are the main wild-feeling shelter/fire/tent points.",
      "Wira bruk has year-round toilet and indoor water, plus restaurant/cafe/shop with seasonal opening."
    ],
    waterSources: [
      "Domarudden outdoor tap is listed year-round, 24/7.",
      "Wira bruk indoor tap is listed year-round.",
      "Natural lake water should be treated before drinking."
    ],
    notes: [
      "Better with a careful water and transport plan than the early stages.",
      "Beaver dams/flooding may make passage difficult near the Trehörningen/Mörtviken outlet north of Wira."
    ],
    facilities: [
      {
        id: "oppsjon-rest-area",
        name: "Oppsjön rest area",
        type: "rest-area",
        description: "Shelter and grill/fireplace about 5 km after Domarudden. Grillplatser marks it suitable for overnighting, but shoreline access can be awkward.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk"
      },
      {
        id: "viren-campsite",
        name: "Norrsand / Viren shoreline tent place",
        type: "campsite",
        description: "Near Viren/Norrsand, Naturkartan describes a shelter with fireplace and room to pitch a tent; community shelter maps use the Norrsand / Viren name.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk"
      },
      {
        id: "norrsand-viren-swimming",
        name: "Norrsand / Viren badplats",
        type: "swimming",
        description: "Natural bathing spot at Viren/Norrsand with rocks and a small beach, close to the shelter/tent area.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk"
      },
      {
        id: "vira-bruk-food",
        name: "Wira bruk",
        type: "food",
        description: "Stage end with museum, restaurant/cafe, blacksmith shop, year-round toilet, and indoor water tap; opening is seasonal/weekend-oriented.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk"
      },
      {
        id: "vira-bruk-water",
        name: "Wira bruk water",
        type: "water",
        description: "Indoor water tap listed year-round at Wira bruk.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk"
      },
      {
        id: "domaruddens-badplats-stage-5",
        name: "Domaruddens badplats",
        type: "rest-area",
        description: "Stage-start service node with shelter, fireplace, grill hut, firewood, benches, toilet, and year-round drinking-water tap nearby.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsleden-etapp-5-domarudden-wira-bruk"
      }
    ]
  },
  {
    id: "roslagsleden-stage-6",
    stageNumber: 6,
    name: "Stage 6: Wira bruk to Penningby",
    from: "Wira bruk",
    to: "Penningby",
    distanceKm: 19.9,
    estimatedTime: "5-6 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6.gpx",
    description: "A mid-Roslagsleden stage through forest, rural landscapes, and smaller service nodes.",
    utilities: [
      "Kvarngården has shelter, fireplace, toilet, and drinking-water refill when the summer cafe/museum is open.",
      "Bergshamra has a grocery store and pizzeria about 2 km off trail.",
      "Penningby has year-round toilet access."
    ],
    waterSources: [
      "Kvarngården has drinking-water refill possibilities when Linneladan/cafe is open; ask permission and buy something.",
      "No water is listed at Grevinnans Rå, so carry water for that fire/rest house."
    ],
    notes: [
      "Naturkartan and AllTrails both flag stage 6 as rougher than many stages; reports mention overgrown/wet sections north of Wira bruk.",
      "Public transport and resupply need more planning here."
    ],
    facilities: [
      {
        id: "kvarngarden-rest-area",
        name: "Kvarngården",
        type: "rest-area",
        description: "Rest area at Bergshamra with shelter, fireplace, dry toilet/toilet, and drinking-water refill possibilities when the summer cafe/museum is open.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6?guide_id=102"
      },
      {
        id: "kvarngarden-water",
        name: "Kvarngården water",
        type: "water",
        description: "Indoor water tap available in summer when Linneladan is open; ask permission and preferably support the cafe.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6?guide_id=102"
      },
      {
        id: "bergshamra-services",
        name: "Bergshamra services",
        type: "food",
        description: "Grocery store and pizzeria about 2 km off trail in Bergshamra.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6?guide_id=102"
      },
      {
        id: "grevinnans-ra-rest-house",
        name: "Grevinnans Rå / Jerlings stuga",
        type: "shelter",
        description: "Open, free rest house also called Jerlings stuga in trip reports, with dry toilet and fireplace. Bring your own firewood and water for extinguishing; no nearby watercourse is listed.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6?guide_id=102"
      },
      {
        id: "gunnsjon-swimming",
        name: "Gunnsjön badplats",
        type: "swimming",
        description: "Swimming area with sandy beach, jetty, and year-round toilet.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6?guide_id=102"
      },
      {
        id: "morabadet-swimming",
        name: "Morabadet",
        type: "swimming",
        description: "Off-route bathing place near Bergshamra with sandy beach, jetty, changing rooms, and toilet.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/morabadet"
      },
      {
        id: "linneladan-stage-6-water",
        name: "Linneladan water and cafe",
        type: "water",
        description: "Indoor water tap/cafe at Linneladan when open in summer; ask permission before filling.",
        sourceUrl: "https://www.linneladan.se/kontakt/"
      },
      {
        id: "penningby-toilet",
        name: "Penningby toilet",
        type: "toilet",
        description: "Year-round toilet listed at Penningby near the stage end.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/wira-bruk-penningby-roslagsleden-etapp-6?guide_id=102"
      }
    ]
  },
  {
    id: "roslagsleden-stage-7",
    stageNumber: 7,
    name: "Stage 7: Penningby to Vigelsjö",
    from: "Penningby",
    to: "Vigelsjö",
    distanceKm: 15.9,
    estimatedTime: "4-5 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7.gpx",
    description: "A quieter Roslagen stage leading toward the Norrtälje/Vigelsjö area.",
    utilities: [
      "Norrtälje has shops, restaurants, accommodation, activities, and cultural services.",
      "Kärleksudden and Lommarbadet have beach/toilet services.",
      "Penningby, Kärleksudden, and Lommarbadet have year-round toilets listed."
    ],
    waterSources: [
      "Linneladan has an indoor tap in summer when open; ask permission.",
      "Norrtälje restaurants and cafes are listed as water-refill options.",
      "Lommarbadet has an indoor water tap in summer."
    ],
    notes: [
      "Naturkartan notes 3.5 km on trafficked road between Penningby and Lönsvik; it suggests bus between Penningby slott and Gläntan as an alternative.",
      "Visit Roslagen notes a temporary reroute on parts of stage 7; follow current markings.",
      "Do not rely on older reports of a Fäglasjön shelter; later reports say it was removed and current Naturkartan does not list it."
    ],
    facilities: [
      {
        id: "penningby-slott-parking",
        name: "Penningby slott parking",
        type: "parking",
        description: "Stage-start service at Penningby slott with parking, nearby bus stop, and year-round toilet listed on Naturkartan.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7"
      },
      {
        id: "kyrksjon-rest-area",
        name: "Kyrksjön",
        type: "rest-area",
        description: "Rest area by Kyrksjön with benches and a natural swimming spot with steep rocks nearby.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7"
      },
      {
        id: "kvisthamrabacken-fireplace",
        name: "Kvisthamrabacken",
        type: "fireplace",
        description: "Rest area with fireplace and benches.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7"
      },
      {
        id: "borgmastarholmen-fireplace",
        name: "Borgmästarholmen",
        type: "fireplace",
        description: "Rest area with fireplace and benches near the Norrtälje section.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7"
      },
      {
        id: "karleksudden-badplats",
        name: "Kärleksuddens badplats",
        type: "swimming",
        description: "Separate Norrtälje beach/service point with cafe/ice cream, toilet, parking, benches, and bathing. Fireplace information conflicts across sources, so do not rely on it.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/badplats-karleksudden"
      },
      {
        id: "linneladan-water",
        name: "Linneladan water",
        type: "water",
        description: "Indoor water tap in summer when Linneladan is open; ask permission and support the cafe.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7"
      },
      {
        id: "norrtalje-services",
        name: "Norrtälje",
        type: "food",
        description: "Town services with shops, restaurants, accommodation, events, and cafe water-refill possibilities.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-7-penningby-vigelsjo"
      },
      {
        id: "lommarbadet",
        name: "Lommarbadet",
        type: "swimming",
        description: "Swimming area with sandy beach, jetty, changing rooms, accessible toilet/ramp, waterslide, year-round toilet, and summer indoor water tap.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/penningby-vigelsjo-roslagsleden-etapp-7"
      },
      {
        id: "norrtalje-camping",
        name: "Norrtälje Camping",
        type: "campsite",
        description: "Paid camping/lodging option near Vigelsjö/Lommaren if you want a formal overnight rather than relying on allemansrätten near settled areas.",
        sourceUrl: "https://www.visitroslagen.se/norrtalje-camping"
      }
    ]
  },
  {
    id: "roslagsleden-stage-8",
    stageNumber: 8,
    name: "Stage 8: Vigelsjö to Roslagsbro",
    from: "Vigelsjö",
    to: "Roslagsbro",
    distanceKm: 12.6,
    estimatedTime: "3-4 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/vigelsjo-roslagsbro-roslagsleden-etapp-8",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/vigelsjo-roslagsbro-roslagsleden-etapp-8.gpx",
    description: "A manageable northern Stockholm County stage from Vigelsjö toward Roslagsbro.",
    utilities: [
      "Färsna has shelters/fireplaces, farm/cafe, nature centre, toilets, and several rest/fire areas.",
      "Gillfjärden has beach, jetty, changing hut, fireplace, dry toilet, and parking.",
      "Roslagsbro has smaller parking and several bus stops with connections to Norrtälje."
    ],
    waterSources: [
      "Lommarbadet has a summer indoor water tap.",
      "Färsna/Vårlyckan water access for non-guests is not clearly guaranteed; ask at cafe/hostel when open.",
      "Carry water from Vigelsjö/Norrtälje if facilities may be closed."
    ],
    notes: [
      "Pairs naturally with stage 9 for a longer weekend.",
      "Färsna reserve fires should be kept to designated grill places; check local signage before camping."
    ],
    facilities: [
      {
        id: "gillfjarden-rest-area",
        name: "Gillfjärden",
        type: "rest-area",
        description: "Beach/rest area with jetty, changing hut, benches, dry toilet, playground, and bus stop about 1.5 km away. Current municipal beach inventory says no parking.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-8-vigelsjo-roslagsbro"
      },
      {
        id: "farsna-shelter",
        name: "Färsna shelter",
        type: "shelter",
        description: "Shelter near Färsna gård/Roslagsleden with fireplace; user reports also confirm shelter/grill at the forest playground.",
        sourceUrl: "https://www.teamvildmark.se/2015/07/roslagsleden-etapp-8-roslagsbro.html"
      },
      {
        id: "farsna-cafe-toilet",
        name: "Färsna gård",
        type: "food",
        description: "Farm/cafe/nature-centre area with year-round toilet, 4H animals, tractor museum/tools, and cafe/service when open.",
        sourceUrl: "https://www.norrtalje.se/info/kultur-och-fritid/idrott-motion-friluftsliv/friluftsomraden/farsna-gard/"
      },
      {
        id: "farsna-skogslekplats",
        name: "Färsna skogslekplats",
        type: "rest-area",
        description: "Forest playground/rest area with shelter, grill, benches, and bench tables, about 1.5 km from Färsna gård and near Roslagsleden.",
        sourceUrl: "https://www.lansstyrelsen.se/stockholm/besoksmal/naturreservat/farsna.html"
      },
      {
        id: "gillfjarden-fireplace",
        name: "Gillfjärden fireplace",
        type: "fireplace",
        description: "Official fireplace at Gillfjärden beach/rest area.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-8-vigelsjo-roslagsbro"
      },
      {
        id: "varlyckans-ip-stage-8-water",
        name: "Vårlyckans IP water and toilet",
        type: "water",
        description: "Stage-end sports-ground service at Roslagsbro with year-round outdoor drinking-water tap, toilet, fireplace, changing rooms, football fields, and parking.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/varlyckans-ip"
      },
      {
        id: "roslagsbro-canoe-put-in",
        name: "Roslagsbro kyrka canoe put-in",
        type: "rest-area",
        description: "Nearby canoe launch by Roslagsbro church on the Roslagsbro-Kvisthamraviken canoe route; useful if combining hiking and paddling.",
        sourceUrl: "https://www.norrtalje.se/info/kultur-och-fritid/idrott-motion-friluftsliv/kanotleder/roslagsbro-kvisthamraviken/"
      },
      {
        id: "roslagsbro-parking-transit",
        name: "Roslagsbro transit and parking",
        type: "parking",
        description: "Smaller parking by Broströmmen/Roslagsbro and several bus stops with Norrtälje connections.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-8-vigelsjo-roslagsbro"
      }
    ]
  },
  {
    id: "roslagsleden-stage-9",
    stageNumber: 9,
    name: "Stage 9: Roslagsbro to Gåsvik",
    from: "Roslagsbro",
    to: "Gåsvik",
    distanceKm: 23.8,
    estimatedTime: "6-8 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9.gpx",
    description: "A long northern stage with varied Roslagen landscapes, Rådasjön, and Väddö canal area.",
    utilities: [
      "Vårlyckans IP/hostel has toilet, water, fireplace, grill, showers/sauna, parking, kiosk during matches, and a 24h vending machine.",
      "Tandrudan, Råda, Flottskär, and Bagghus/Gåsvik are the main rest/service points.",
      "Gåsvik food is uncertain; current local information suggests restaurant/shop access may be seasonal or closed."
    ],
    waterSources: [
      "Vårlyckans IP outdoor water tap is listed year-round.",
      "Erikskulle has indoor water when open in summer.",
      "Older Roslagsleden water lists mention Gåsvik/B&B options; verify before relying on them."
    ],
    notes: [
      "This is one of the bigger single-stage days in the builder.",
      "Råda reserve has stricter rules: fire may be prohibited by reserve rules despite fireplace reports; verify current signage and Länsstyrelsen rules."
    ],
    facilities: [
      {
        id: "varlyckans-ip-fireplace",
        name: "Vårlyckans IP",
        type: "fireplace",
        description: "Naturkartan lists fireplace and benches; hostel sources add parking, kiosk during matches, 24h vending machine, outdoor grill, showers, and sauna.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9"
      },
      {
        id: "varlyckans-ip-water",
        name: "Vårlyckans IP water and toilet",
        type: "water",
        description: "Outdoor water tap and toilet listed year-round at Vårlyckans IP.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9"
      },
      {
        id: "tandrudan-toilet",
        name: "Tandrudan",
        type: "toilet",
        description: "Rest spot with benches and dry toilet.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9"
      },
      {
        id: "rada-rest-area",
        name: "Råda badplats",
        type: "rest-area",
        description: "Bathing area with shelter, benches, toilet, changing room, jetty, and parking. Fireplace reports conflict with Norrtälje's beach inventory, so verify on site.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9"
      },
      {
        id: "hagsta-gard-campsite",
        name: "Hagsta gård paid tent spots",
        type: "campsite",
        description: "Naturkartan says tent camping is possible for a fee at pitches by Hagsta gård.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9"
      },
      {
        id: "flottskar-fireplace",
        name: "Flottskär",
        type: "fireplace",
        description: "Rest area by the jetty with grill/fireplace, table/benches, canoe launch/jetty, and horse rest paddock.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9"
      },
      {
        id: "erikskulle-water",
        name: "Erikskulle hembygdsgård",
        type: "water",
        description: "Indoor water tap and toilet when open in summer; picnic-friendly museum grounds near the trail.",
        sourceUrl: "https://www.norrtalje.se/info/kultur-och-fritid/kultur-och-konst/norrtalje-museerkulturarv-och-stadsarkiv/norrtalje-museer/lokala-museer/soderbykarl---erikskulle-hembygdsgard-och-museum/"
      },
      {
        id: "erikskulle-toilet",
        name: "Erikskulle toilet",
        type: "toilet",
        description: "Toilet at Erikskulle friluftsmuseum, likely dependent on summer/opening hours.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/erikskulle-friluftsmuseum"
      },
      {
        id: "bagghus-gasvik-toilet",
        name: "Bagghusbron / Gåsvik",
        type: "toilet",
        description: "Summer dry toilet around weeks 19-45 near the stage finish; nearest bus stop is Bagghus vägskäl.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/roslagsbro-bagghus-gasvik-roslagsleden-etapp-9"
      }
    ]
  },
  {
    id: "roslagsleden-stage-10",
    stageNumber: 10,
    name: "Stage 10: Gåsvik to Sandviken",
    from: "Gåsvik",
    to: "Sandviken",
    distanceKm: 8.7,
    estimatedTime: "2-3 hours",
    sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/gasvik-sandviken-roslagsleden-etapp-10",
    gpxUrl: "https://www.naturkartan.se/en/stockholms-lan/gasvik-sandviken-roslagsleden-etapp-10.gpx",
    description: "A shorter northern stage from Gåsvik to Sandviken with coastal Roslagen atmosphere.",
    utilities: [
      "Älmsta is the main resupply point with grocery, pharmacy, shops, restaurants, and cafes.",
      "Vikingalunden IP/Folkpark has fireplace, benches, rest hut, year-round toilet, summer water tap, and parking.",
      "Väddö Gårdsmejeri is just north of the trail with farm shop, cafe/food, WC, and parking.",
      "Sandvikens/Väddö Havsbad has camping, cottages, toilets/showers, kitchen/laundry, beach, cafe/reception, and basic groceries."
    ],
    waterSources: [
      "Vikingalunden IP has a summer outdoor water tap.",
      "Sandvikens camping/service facilities may provide water when open; confirm guest access before relying on it."
    ],
    notes: [
      "Useful as an easier second day after stage 9.",
      "Nearest bus from Sandviken finish is Älmsta busstation, about 4.5 km from the stage end."
    ],
    facilities: [
      {
        id: "vaddo-gardsmejeri",
        name: "Väddö Gårdsmejeri",
        type: "food",
        description: "Farm shop, cafe/food, WC, and parking just north of Roslagsleden.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-10-gasvik-sandviken"
      },
      {
        id: "sandvikens-camping",
        name: "Sandvikens camping",
        type: "campsite",
        description: "Trail-end camping/Väddö Havsbad with tent/caravan/motorhome pitches, cottages, toilets/HWC, showers, kitchen, laundry, sandy beach, cafe/reception, and basic groceries.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-10-gasvik-sandviken"
      },
      {
        id: "sandvikens-camping-toilet",
        name: "Sandvikens camping toilet",
        type: "toilet",
        description: "Toilet facilities listed at Sandvikens camping.",
        sourceUrl: "https://www.visitroslagen.se/roslagsleden-etapp-10-gasvik-sandviken"
      },
      {
        id: "bagghusbron-toilet-stage-10",
        name: "Bagghusbron dry toilet",
        type: "toilet",
        description: "Summer dry toilet around weeks 19-45 at the stage start area.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/gasvik-sandviken-roslagsleden-etapp-10"
      },
      {
        id: "almsta-services",
        name: "Älmsta",
        type: "food",
        description: "Main resupply point with grocery, pharmacy/apotek, shops, restaurants, and cafes.",
        sourceUrl: "https://www.norrtalje.se/roslagsleden"
      },
      {
        id: "almsta-guestharbour-water",
        name: "Älmsta gästhamn",
        type: "water",
        description: "Guest harbour service point with fresh water, toilet, shower, sauna, laundry, and sewage disposal; useful but check harbour season/access.",
        sourceUrl: "https://www.harbourmaps.com/en/harbour/elmsta-almsta-gasthamn"
      },
      {
        id: "vikingalunden-ip",
        name: "Vikingalunden IP / Folkpark",
        type: "rest-area",
        description: "Fireplace, benches, rest hut, year-round toilet, summer outdoor water tap, and parking; changing room/shower/sauna when activity is happening.",
        sourceUrl: "https://www.naturkartan.se/sv/stockholms-lan/gasvik-sandviken-roslagsleden-etapp-10"
      },
      {
        id: "vikingalunden-fireplace",
        name: "Grillplats Vikingalunden",
        type: "fireplace",
        description: "Separate grill place near Vikingalunden IP with fire ring, benches, and a small rest hut/rastkåta for bad weather.",
        sourceUrl: "https://www.naturkartan.se/en/stockholms-lan/grillplats-vikingalunden"
      },
      {
        id: "sandviken-badplats",
        name: "Sandviken badplats",
        type: "swimming",
        description: "Beach with toilet, changing room, parking, kiosk/cafe, and playground. Fireplace information conflicts across sources, so do not rely on it for cooking.",
        sourceUrl: "https://www.norrtalje.se/info/kultur-och-fritid/bad/badplatser/sandviken/"
      }
    ]
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
  const coordinates = [];

  for (const track of asArray(parsed.gpx?.trk)) {
    for (const segment of asArray(track.trkseg)) {
      const segmentCoordinates = asArray(segment.trkpt)
        .map((point) => [Number(point.lon), Number(point.lat)])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

      if (segmentCoordinates.length > 1) {
        coordinates.push(...segmentCoordinates);
        features.push({
          type: "Feature",
          properties: { name: track.name || name },
          geometry: { type: "LineString", coordinates: segmentCoordinates }
        });
      }
    }
  }

  return { features, coordinates };
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

async function buildSection(seed) {
  const response = await fetch(seed.gpxUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${seed.gpxUrl}: ${response.status}`);

  const parsed = parseGpx(await response.text(), seed.name);
  if (!parsed.coordinates.length) throw new Error(`No coordinates found for ${seed.name}`);

  const geojsonPath = `/routes/${seed.id}.geojson`;
  await writeFile(
    path.join(projectRoot, "public", geojsonPath),
    `${JSON.stringify({ type: "FeatureCollection", features: parsed.features }, null, 2)}\n`
  );

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
    facilities: seed.facilities.map((facility) => ({
      id: facility.id,
      name: facility.name,
      type: facility.type,
      sectionId: seed.id,
      coordinates: facilityCoordinates[facility.id],
      description: facility.description,
      source: {
        provider: "naturkartan",
        url: facility.sourceUrl,
        lastFetchedAt: new Date().toISOString().slice(0, 10)
      }
    })),
    source: {
      provider: "naturkartan",
      url: seed.sourceUrl,
      lastFetchedAt: new Date().toISOString().slice(0, 10)
    },
    route: {
      status: "ready",
      sourceFormat: "gpx",
      gpxUrl: seed.gpxUrl,
      geojsonPath
    },
    endpointCoordinates: {
      source: "route-geometry",
      start: [parsed.coordinates[0][1], parsed.coordinates[0][0]],
      end: [
        parsed.coordinates[parsed.coordinates.length - 1][1],
        parsed.coordinates[parsed.coordinates.length - 1][0]
      ]
    },
    start: parsed.coordinates[0],
    center: centerFromCoordinates(parsed.coordinates)
  };
}

await mkdir(routesDir, { recursive: true });

const sectionsWithCoordinates = [];
for (const seed of sectionSeeds) {
  const section = await buildSection(seed);
  sectionsWithCoordinates.push(section);
  console.log(`Built ${section.name}`);
}

const firstStart = sectionsWithCoordinates[0].start;
const location = await resolveLocationFromStart([
  Number(firstStart[1].toFixed(6)),
  Number(firstStart[0].toFixed(6))
]);
const distanceKm = Number(sectionsWithCoordinates.reduce((total, section) => total + section.distanceKm, 0).toFixed(1));

const trailSystem = await annotateTrailSystemCommuteAccess(await annotateTrailSystemFacilityProximity({
  id: "roslagsleden",
  itemType: "trail-system",
  name: "Roslagsleden",
  region: "Stockholms län",
  country: "Sweden",
  location,
  recommendedTimes: ["dayhike", "weekend", "3-5-days", "6-plus-days"],
  difficulty: "Moderate",
  distanceKm,
  estimatedTime: "1-10 stages",
  routeType: "Point to point",
  season: "April-October",
  description:
    "A long marked trail through Roslagen. Instead of listing every overlapping weekend combination as its own hike, choose a contiguous range of stages and let the map and summary update.",
  gettingThere:
    "Use the selected stage start and end points to plan transport. Early stages are easiest by SL from Stockholm; northern stages require more careful bus timing around Norrtälje, Roslagsbro, Gåsvik, and Sandviken.",
  campingRules:
    "Use the selected-route facility list for known official fireplaces and designated tent places. In general, allemansrätten may allow short tent stays, but reserves and local rules override that. Fires should be treated as official-fireplace-only, and fire bans override every source. If a selected section has no researched campsite or fireplace, treat camping and fires as unverified and check signage, Länsstyrelsen, municipality pages, Krisinformation, and Brandrisk Ute before relying on it.",
  utilities: [
    "Facilities vary by stage: toilets, shelters, rest areas, bathing, outdoor centers, and nearby services are not evenly distributed.",
    "Domarudden and the Norrtälje/Vigelsjö area are stronger service nodes than the rural middle stages."
  ],
  waterSources: [
    "Carry enough water between confirmed refill points.",
    "Some stages list taps or seasonal water; verify current status on Naturkartan before relying on them.",
    "Natural water should be treated before drinking."
  ],
  notes: [
    "The builder currently supports contiguous section ranges.",
    "Section facts are intentionally conservative until we add automated per-stage fact refreshes."
  ],
  source: {
    provider: "naturkartan",
    url: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden",
    lastFetchedAt: new Date().toISOString().slice(0, 10)
  },
  map: {
    center: [59.6505, 18.4301],
    zoom: 9,
    externalUrl: "https://www.naturkartan.se/en/stockholms-lan/roslagsleden"
  },
  sections: sectionsWithCoordinates.map(({ start, center, ...section }) => section),
  presets: [
    {
      id: "intro-weekend",
      name: "Intro weekend",
      description: "Stages 1-2, Danderyd to Örsta, 28.5 km.",
      startSectionId: "roslagsleden-stage-1",
      endSectionId: "roslagsleden-stage-2"
    },
    {
      id: "domarudden-weekend",
      name: "Domarudden weekend",
      description: "Stages 3-4, Örsta to Domarudden, 28.8 km.",
      startSectionId: "roslagsleden-stage-3",
      endSectionId: "roslagsleden-stage-4"
    },
    {
      id: "northern-weekend",
      name: "Northern weekend",
      description: "Stages 9-10, Roslagsbro to Sandviken, 32.5 km.",
      startSectionId: "roslagsleden-stage-9",
      endSectionId: "roslagsleden-stage-10"
    },
    {
      id: "full-route",
      name: "Full route",
      description: `Stages 1-10, Danderyd to Sandviken, ${distanceKm} km.`,
      startSectionId: "roslagsleden-stage-1",
      endSectionId: "roslagsleden-stage-10"
    }
  ]
}, { projectRoot, thresholdKm: 2 }));

const hikes = JSON.parse(await readFile(hikesPath, "utf8"));
const nextHikes = hikes.filter((hike) => !isOldRoslagsledenStandalone(hike));
const trailSystems = JSON.parse(await readFile(trailSystemsPath, "utf8").catch(() => "[]"));
const nextTrailSystems = [trailSystem, ...trailSystems.filter((system) => system.id !== trailSystem.id)];

await writeFile(hikesPath, `${JSON.stringify(nextHikes, null, 2)}\n`);
await writeFile(trailSystemsPath, `${JSON.stringify(nextTrailSystems, null, 2)}\n`);
await writeHikeData(nextHikes, nextTrailSystems);

console.log(`Wrote Roslagsleden as one trail system with ${trailSystem.sections.length} sections.`);
