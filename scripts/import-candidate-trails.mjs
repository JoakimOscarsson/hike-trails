import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeTrailSystemSourceShards } from "./lib/hiking-source-shards.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const candidateRoot = path.join(projectRoot, "data/research/candidate-trails");
const publicRoutesRoot = path.join(projectRoot, "public/routes/hiking");

const importConfigs = {
  hogakustenleden: {
    name: "Höga Kustenleden",
    region: "Västernorrlands län",
    country: "Sweden",
    difficulty: "Varied",
    estimatedTime: "7-9 days",
    season: "May-October",
    routeType: "Point to point",
    description:
      "A coastal long-distance trail through the High Coast from Hornöberget to Örnsköldsvik, with forest stages, villages, coastal viewpoints and Skuleskogen National Park.",
    gettingThere:
      "Use the selected section endpoints for access planning. Hornöberget, Ullånger, Skuleberget, Skuleskogen entrances and Örnsköldsvik have the strongest access context; rural sections need current bus or taxi checks.",
    utilities: [
      "Facilities are unevenly distributed; villages, campgrounds and national-park entrances are the strongest service nodes.",
      "Opening hours, seasonal boats and transit should be checked before relying on them."
    ],
    waterSources: [
      "Carry enough water between confirmed refill points.",
      "Natural water and lake/stream water should be treated before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Slåttdalsskrevan is carried as a hazard/current-route caveat and should be rechecked before publication."
    ],
    source: {
      provider: "hoga-kusten/naturkartan-candidate-research",
      url: "https://www.hogakusten.com/sv/hogakustenleden",
      lastFetchedAt: "2026-04-30"
    }
  },
  sjuharadsleden: {
    name: "Sjuhäradsleden",
    region: "Västra Götalands län / Jönköpings län",
    country: "Sweden",
    difficulty: "Moderate",
    estimatedTime: "10 stages",
    season: "April-October",
    routeType: "Point to point",
    description:
      "An orange-marked long-distance trail from Hindås to Hotell Mullsjö through forest, lakes, towns and agricultural landscapes, with ten official stages and E1 context.",
    gettingThere:
      "Use the selected section endpoints for access planning. Hindås, Borås, Ulricehamn and Mullsjö have the strongest transport context; several rural endpoints require current timetable checks.",
    utilities: [
      "Services vary sharply by section; town and campground endpoints are much stronger than the rural forest stages.",
      "Public access to toilets, cafes, lodging and water should be checked before relying on it."
    ],
    waterSources: [
      "No on-route potable water should be assumed unless a selected section lists a verified source.",
      "Natural water should be treated before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Naturkartan/Västkuststiftelsen quality-assurance caveat remains relevant until a newer official source says otherwise."
    ],
    source: {
      provider: "vastsverige/naturkartan-candidate-research",
      url: "https://www.vastsverige.com/sjuharad/natur-och-friluftsliv/vandra/vandringsleder/boras-vandringsleder/sjuharadsleden/",
      lastFetchedAt: "2026-04-30"
    }
  },
  ostkustleden: {
    name: "Ostkustleden",
    region: "Kalmar län",
    country: "Sweden",
    difficulty: "Moderate",
    estimatedTime: "8 stages",
    season: "Year-round when conditions permit",
    routeType: "Point to point",
    description:
      "A circular multi-stage trail in Oskarshamn municipality, linking overnight cabins, forests, lakes and Småland coastal landscapes through eight official stages.",
    gettingThere:
      "Use the selected section endpoints for access planning. Lilla Hycklinge and Oskarshamn-area access are the strongest anchors; cabin endpoints and rural roads need current transport checks.",
    utilities: [
      "Overnight cabins, dry toilets, parking and service points are unevenly distributed by stage.",
      "Cabin, water, fire and seasonal service conditions should be checked before relying on them."
    ],
    waterSources: [
      "Use only listed verified water points as refill context.",
      "Natural lakes and streams should be treated before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Whole-trail headline distance varies by source; runtime distance uses the normalized section display distances."
    ],
    source: {
      provider: "doderhult/naturkartan-candidate-research",
      url: "https://doderhult.naturskyddsforeningen.se/ostkustleden/",
      lastFetchedAt: "2026-04-30"
    }
  },
  "vastra-vatterleden": {
    name: "Västra Vätterleden",
    region: "Västra Götalands län / Jönköpings län",
    country: "Sweden",
    difficulty: "Moderate",
    estimatedTime: "8 stages",
    season: "April-October",
    routeType: "Point to point",
    description:
      "A long-distance trail on the western side of Vättern from the Tiveden/Stenkällegården area toward Mullsjö, with forest, lake, canal and town sections.",
    gettingThere:
      "Use the selected section endpoints for access planning. Forsvik, Hjo, Hökensås/Fagerhult and Mullsjö have the strongest access context; several rural endpoints need current timetable checks.",
    utilities: [
      "Services are concentrated around towns, campgrounds and established trailheads.",
      "Route variants, business opening hours and rural transit should be checked before publication."
    ],
    waterSources: [
      "No natural water should be treated as potable unless a selected section lists a verified source.",
      "Carry water on longer forest stages and treat natural water."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Runtime import uses the normalized primary section geometry; alternate route variants remain caveated in section notes."
    ],
    source: {
      provider: "vastsverige/skaraborgsleder-candidate-research",
      url: "https://www.vastsverige.com/skovde/leder/vastra-vatterleden/",
      lastFetchedAt: "2026-04-30"
    }
  },
  hallandsleden: {
    name: "Hallandsleden",
    region: "Hallands län / Västra Götalands län / Skåne län",
    country: "Sweden",
    difficulty: "Varied",
    estimatedTime: "35 stages",
    season: "April-October",
    routeType: "Trail network",
    description:
      "A long-distance trail network through Halland, with northern, central, southern and coastal chains linking forests, lakes, towns, beaches and protected areas.",
    gettingThere:
      "Use the selected chain and section endpoints for access planning. Kungsbacka, Varberg, Ullared, Oskarström, Halmstad, Knäred and Båstad have the strongest public-transport context; several rural endpoints need current timetable checks.",
    utilities: [
      "Services vary sharply by chain and section; town and resort endpoints are much stronger than inland forest stages.",
      "Shelters, drinking water, toilets, fire permissions, coastal rules, opening hours and transit should be checked before publication."
    ],
    waterSources: [
      "Use only listed verified water points as refill context.",
      "No natural water should be treated as potable without treatment."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "The official overview headline is about 612 km; runtime distance uses the normalized section display distances.",
      "The coastal route has an official gap between Frillesås and Steninge until future coastal stages are published.",
      "Protected-area, beach, dog, hunting, forestry and fire-currentness warnings remain publication-time checks."
    ],
    selectableRouteGroupKinds: ["mainline", "branch"],
    routeGroupNames: {
      "hallandsleden-norra": "Norra delleden",
      "hallandsleden-varberg-branch": "Varberg-Åkulla",
      "hallandsleden-mellersta-west": "Mellersta västra grenen",
      "hallandsleden-mellersta-east": "Mellersta östra grenen",
      "hallandsleden-sodra-west": "Södra västra grenen",
      "hallandsleden-sodra-gyltige-branch": "Kvarnforsen-Gyltige",
      "hallandsleden-sodra-east": "Södra östra grenen",
      "hallandsleden-kustleden-north": "Kusten norr",
      "hallandsleden-kustleden-south": "Kusten söder"
    },
    source: {
      provider: "hallandsleden/official-gpx-candidate-research",
      url: "https://hallandsleden.se/",
      lastFetchedAt: "2026-04-30"
    }
  },
  padjelantaleden: {
    name: "Padjelantaleden",
    region: "Norrbottens län",
    country: "Sweden",
    difficulty: "Moderate to strenuous",
    estimatedTime: "10 stages",
    season: "June-September",
    routeType: "Point to point with boat access",
    description:
      "A remote hut-to-hut mountain trail from the Ritsem/Akka access area to Kvikkjokk through Padjelanta/Badjelánnda and the Laponia World Heritage landscape.",
    gettingThere:
      "Use Ritsem and Kvikkjokk as the main gateway anchors. The northern start requires M/S Storlule or private boat access across Akkajaure, and the southern finish normally requires the Bobäcken-Kvikkjokk boat transfer.",
    utilities: [
      "BLT and STF huts are the main service nodes; many services are seasonal and remote.",
      "Boat, helicopter, hut, payment, food-stock, bridge, weather and gateway transit conditions must be checked before travel."
    ],
    waterSources: [
      "Mountain streams and natural water are common but should be treated unless a section lists a verified potable source.",
      "Carry enough water across exposed sections, especially where section notes warn about dry ground or long distances between huts."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Runtime distance uses the normalized section display distances and totals about 140 km; official overview sources vary between about 140 km, 150 km, 150-160 km and 160 km depending on endpoints and access legs.",
      "The M/S Storlule, Bobäcken-Kvikkjokk, helicopter and local line-boat services are access metadata, not continuous walking geometry.",
      "Stage 1 uses researched OSM relation geometry because the public Naturkartan GPX includes the alternate Vájsáluokta approach; stage 2 uses OSM relation geometry because Naturkartan splits the stage across access-mixed records.",
      "Stages 3-10 use Naturkartan GPX geometry with researched split/reversal policy. Hut centroids are not force-snapped where that would invent unsourced approach linework.",
      "Protected-area rules, fire bans, reindeer/herding restrictions, bridge status, boat timetables, hut opening conditions and weather remain publication-time checks."
    ],
    routeGroupNames: {
      "padjelantaleden-mainline": "Ritsem/Akka-Kvikkjokk mainline"
    },
    manualRouteSectionIds: [
      "padjelantaleden-stage-01-ritsem-akka-gisuris",
      "padjelantaleden-stage-10-njunjes-kvikkjokk"
    ],
    sectionNotesById: {
      "padjelantaleden-stage-01-ritsem-akka-gisuris": [
        "Route geometry is the walking leg from the Akka/Änonjálmme side toward Gisuris. Ritsem access requires M/S Storlule or private boat across Akkajaure and is not walking geometry."
      ],
      "padjelantaleden-stage-02-gisuris-laddejahka": [
        "Route geometry uses researched OSM relation 19111627 because the official Naturkartan linework is split across BD58 and BD57 with Kutjaure/Nordkalottleden access context."
      ],
      "padjelantaleden-stage-10-njunjes-kvikkjokk": [
        "Route geometry is the Njunjes-to-Bobäcken walking leg. The usual Bobäcken-Kvikkjokk finish is a boat transfer and current operator details must be checked."
      ]
    },
    sectionNoteLimit: 7,
    source: {
      provider: "stf-padjelanta-naturkartan-candidate-research",
      url: "https://www.svenskaturistforeningen.se/guider-tips/leder/padjelantaleden/",
      lastFetchedAt: "2026-04-30"
    }
  },
  hoglandsleden: {
    name: "Höglandsleden",
    region: "Jönköpings län / Kalmar län",
    country: "Sweden",
    difficulty: "Moderate to strenuous",
    estimatedTime: "23 stages",
    season: "April-October",
    routeType: "Loop and branches",
    description:
      "A Smålandsleden long-distance trail network across the Småland highlands, with a main loop and official branches toward Mariannelund and Kärringabacka.",
    gettingThere:
      "Use the selected chain and section endpoints for access planning. Sävsjö, Nässjö-area access, Mariannelund, Hok, Byarum and Skillingaryd have the strongest public-transport context; several forest and reserve endpoints need current timetable checks.",
    utilities: [
      "Services are strongest in towns and villages; many forest, lake and reserve stages rely on shelters, rest areas or local facilities.",
      "Water reliability, fire permissions, Storm-Dave clearance, opening hours and transit should be checked before publication."
    ],
    waterSources: [
      "Use only listed verified water points as refill context.",
      "Natural water should be treated before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Runtime topology follows the candidate model: a primary Västra Lägern-main-loop chain plus official Mariannelund and Tomtabacken-Kärringabacka branches.",
      "Official summaries describe both an approximately 300 km loop and a wider 23-stage network; runtime distance uses the normalized section display distances for the imported chains.",
      "Fire-ban, currentness, post-storm clearance, transit and water-reliability checks remain publication-time checks."
    ],
    selectableRouteGroupKinds: ["mainline", "branch"],
    routeGroupNames: {
      "hoglandsleden-main-loop": "Västra Lägern and main loop",
      "hoglandsleden-mariannelund-branch": "Mariannelund branch",
      "hoglandsleden-tomtabacken-karringabacka-branch": "Tomtabacken-Kärringabacka branch"
    },
    source: {
      provider: "smalandsleden/naturkartan-candidate-research",
      url: "https://www.smalandsleden.se/vandringsleder/hoglandsleden-en-del-av-smalandsleden-miniguide-trp-641",
      lastFetchedAt: "2026-04-30"
    }
  },
  tjustleden: {
    name: "Tjustleden",
    region: "Kalmar län / Östergötlands län",
    country: "Sweden",
    difficulty: "Moderate",
    estimatedTime: "9 stages",
    season: "April-October",
    routeType: "Point to point",
    description:
      "A long-distance trail through Tjust from Mörtfors toward Falerum, linking forests, lakes, shelters, villages and onward trail connections toward Ostkustleden and Östgötaleden.",
    gettingThere:
      "Use the selected section endpoints for access planning. Mörtfors, Västervik-area connector context, Överum and Falerum have the strongest access anchors; many rural endpoints need current timetable and legal-parking checks.",
    utilities: [
      "Shelters and toilets are frequent in the candidate data, but exact coordinates and current service status vary by section.",
      "Water, parking, transit, forestry notices, fire permissions and commercial opening hours should be checked before publication."
    ],
    waterSources: [
      "Do not assume potable trail water unless a selected section lists a verified point source.",
      "The trail-owner overview says there are no fresh-water sources along the trail; treat natural water before drinking."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Runtime import uses the official 9-stage mainline and official section display distances, totaling about 159 km.",
      "Official whole-trail descriptions can say about 200 km when loops, connectors and branches are included; those extras are not imported into this runtime route yet.",
      "Several GPX lengths differ from official distances, and sections 4, 6 and 9 retain source-geometry caveats in their section notes.",
      "Acute trail notices, fire bans, forestry passability, parking legality, transit and service opening hours remain publication-time checks."
    ],
    routeGroupNames: {
      "tjustleden-mainline": "Mainline"
    },
    source: {
      provider: "tjust-naturskyddsforeningen/naturkartan-candidate-research",
      url: "https://tjust.naturskyddsforeningen.se/tjustleden/",
      lastFetchedAt: "2026-04-30"
    }
  },
  vikingaleden: {
    name: "Vikingaleden",
    region: "Stockholms län / Uppsala län",
    country: "Sweden",
    difficulty: "Easy to moderate",
    estimatedTime: "12 stages",
    season: "April-October",
    routeType: "Point to point with overlap chain",
    description:
      "A pilgrim and long-distance trail from Grisslehamn to Älvkarleby through Roslagen and northern Uppland, first running independently to Gimo and then continuing north on an Upplandsleden overlap.",
    gettingThere:
      "Use the selected section endpoints for access planning. Grisslehamn, Gimo, Österbybruk, Lövstabruk, Marma and Älvkarleby have the strongest access anchors; rural endpoints and services need current timetable checks.",
    utilities: [
      "Services are strongest in villages, bruk environments and the Upplandsleden overlap facilities; the independent Roslagen stages have lighter service density.",
      "Parking and transit are kept as access context rather than normal trail facilities until the app has a dedicated access layer."
    ],
    waterSources: [
      "Use only listed verified water points as refill context.",
      "Unsafe pump/no-water rows remain suppressed; carry water and treat natural water."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Visit Roslagen confirms the first 63 km runs from Grisslehamn to Gimo and the route then continues north on Upplandsleden.",
      "Sections 7-12 overlap Upplandsleden sections 11-16 and are imported as a separate selectable overlap chain with trail-scoped route files.",
      "The previously missing Visit Roslagen Etapp 12 page is live as vikingaleden-etapp-16 and states it corresponds to Upplandsleden etapp 16.",
      "Branch/context amenities, rule warnings, fire rules, seasonal service status and transit remain publication-time checks."
    ],
    selectableRouteGroupKinds: ["mainline", "branch"],
    routeGroupNames: {
      "vikingaleden-mainline": "Grisslehamn-Gimo",
      "vikingaleden-upplandsleden-overlap": "Gimo-Älvkarleby overlap"
    },
    source: {
      provider: "visit-roslagen/naturkartan-outdooractive-candidate-research",
      url: "https://www.visitroslagen.se/vikingaleden",
      lastFetchedAt: "2026-04-30"
    }
  },
  bohusleden: {
    name: "Bohusleden",
    region: "Västra Götalands län / Hallands län",
    country: "Sweden",
    difficulty: "Varied",
    estimatedTime: "27 stages",
    season: "April-October",
    routeType: "Long-distance trail with explicit self-navigation gap",
    description:
      "A long-distance trail through Bohuslän from Älvsåker toward Strömstad, with forest, lakes, coast-adjacent towns and an official Stage 21 self-navigation gap where the marked trail is not continuous.",
    gettingThere:
      "Use the selected chain and section endpoints for access planning. Gothenburg-area stages, Uddevalla, Munkedal and Strömstad have the strongest public-transport context; northern rural endpoints often require current timetable, pickup or private-access checks.",
    utilities: [
      "Services are dense near towns and outdoor centres, but sparse on the northern forest stages.",
      "Stage 21 is not a normal continuous marked stage; follow the official self-navigation warning and check current Tanum/Västkuststiftelsen guidance before relying on it."
    ],
    waterSources: [
      "Use only listed verified water points as refill context.",
      "Natural water, springs and uncertain taps should be treated or verified before use."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "West Sweden Trails confirms Stage 21 is not a continuous marked stage: marking exists from Flötemarksön to Holmen and from road 164 to Porsås, while the middle requires map-and-compass self-navigation.",
      "Stage 21 runtime geometry uses only the official mapped partial line; do not treat it as a complete 14 km navigable route.",
      "The app imports Bohusleden as separate selectable chains around Stage 21 plus a separate Stage 21 partial/self-navigation entry.",
      "The 49 m Stage 8-to-Stage 9 Bottenstugan handoff is modeled as an explicit reviewed walk connection.",
      "Fire rules, forestry/windfall notices, bridge/raft status, transit and seasonal services remain publication-time checks."
    ],
    selectableRouteGroupKinds: ["mainline", "branch"],
    routeGroupNames: {
      "bohusleden-southern-chain": "Southern chain: Älvsåker-Bottenstugan",
      "bohusleden-middle-chain": "Middle chain: Bottenstugan-Flötemarksön",
      "bohusleden-northern-chain": "Northern chain: Porsås-Strömstad",
      "bohusleden-stage-21-partial": "Stage 21 partial/self-navigation"
    },
    source: {
      provider: "west-sweden-trails/hoodin-candidate-research",
      url: "https://www.westswedentrails.com/en/delled/bohusleden",
      lastFetchedAt: "2026-04-30"
    }
  },
  kungsleden: {
    name: "Kungsleden",
    region: "Norrbottens län / Västerbottens län",
    country: "Sweden",
    difficulty: "Strenuous",
    estimatedTime: "27 stages",
    season: "June-September",
    routeType: "Point to point with boat and transfer gaps",
    description:
      "The classic Swedish mountain trail from Abisko to Hemavan, crossing remote Lapland terrain, national parks, hut systems, lake crossings and long service-sparse sections.",
    gettingThere:
      "Use the selected section endpoints for access planning. Abisko, Vakkotavare, Saltoluokta/Kebnats, Kvikkjokk, Ammarnäs and Hemavan are the strongest access anchors; boats, road transfers and bus legs need current timetable checks.",
    utilities: [
      "STF huts, mountain stations, shelters and village services are concentrated in the northern and southern hut chains; the Kvikkjokk-Ammarnäs middle is more remote.",
      "Several sections require scheduled motorboat, private boat, rowboat or road/boat transfer planning; exact operators, dates, prices and payment rules must be checked before travel."
    ],
    waterSources: [
      "Streams and natural water are common in mountain terrain but should be treated unless a section lists a verified potable source.",
      "Carry enough water across high, exposed or service-sparse stages and do not rely on hut/service access outside season."
    ],
    notes: [
      "Imported from normalized candidate research on 2026-04-30.",
      "Runtime import uses 27 researched Abisko-Hemavan mainline hiking sections and excludes the Singi-Kebnekaise-Nikkaluokta access spur from the main route.",
      "Official summaries describe Kungsleden as more than 450 km; runtime distance uses the normalized 27 section display distances, while generated land/walking route geometry totals about 418.6 km.",
      "Boat, rowboat, road-transfer and service-zone gaps are not silently joined into a walkable line. Affected sections are marked manual in route status and explain the missing transfer in notes.",
      "The Vakkotavare-Saltoluokta handoff is modeled as an explicit transfer because it requires road/bus access to Kebnats plus the Saltoluokta passenger boat.",
      "Boat timetables, bridge status, fire bans, weather, reindeer restrictions, protected-area rules, hut seasons and service opening conditions remain publication-time checks."
    ],
    routeGroupNames: {
      "kungsleden-mainline": "Abisko-Hemavan mainline"
    },
    manualRouteSectionIds: [
      "kungsleden-section-08-teusajaure-vakkotavare",
      "kungsleden-section-10-sitojaure-aktse",
      "kungsleden-section-11-aktse-parte",
      "kungsleden-section-13-kvikkjokk-tsielekjakkstugan",
      "kungsleden-section-17-vuonatjviken-jackvik",
      "kungsleden-section-20-sjnulttjie-ravfallsstugan"
    ],
    sectionNotesById: {
      "kungsleden-section-08-teusajaure-vakkotavare": [
        "Route geometry is land-only candidate linework. The Teusajaure lake crossing is required and must be planned as scheduled boat or rowboat transport, not as continuous hiking geometry."
      ],
      "kungsleden-section-10-sitojaure-aktse": [
        "Route geometry is land-only candidate linework. The Sitojaure/Svijnne boat transport is required before the walking part and current operator details must be checked."
      ],
      "kungsleden-section-11-aktse-parte": [
        "Route geometry is land-only candidate linework. The Aktse-Laitaure crossing and short hut/landing approach are intentionally kept as transfer/access context rather than invented hiking linework."
      ],
      "kungsleden-section-13-kvikkjokk-tsielekjakkstugan": [
        "Route geometry starts after the Kvikkjokk/Sakkat boat transfer. The official section distance includes boat-plus-walk planning context, so check current Kvikkjokk boat operations before relying on it."
      ],
      "kungsleden-section-17-vuonatjviken-jackvik": [
        "Route geometry is multipart planning linework around Riebnes and Kapellströmmarna. This section needs booked Riebnes boat transport and a short rowboat crossing before Jäckvik."
      ],
      "kungsleden-section-20-sjnulttjie-ravfallsstugan": [
        "Route geometry preserves a small source-boundary/service-zone gap around the shelter handoff. Treat the map line as planning-grade and inspect endpoint notes before navigation."
      ]
    },
    sectionNoteLimit: 7,
    source: {
      provider: "naturvardsverket-lansstyrelsen-stf-candidate-research",
      url: "https://www.swedishtouristassociation.com/areas/kungsleden/",
      lastFetchedAt: "2026-04-30"
    }
  }
};

const requestedTrailIds = process.argv.slice(2);
const trailIds = requestedTrailIds.length ? requestedTrailIds : Object.keys(importConfigs);

for (const trailId of trailIds) {
  if (!importConfigs[trailId]) throw new Error(`Unsupported candidate trail import "${trailId}"`);
}

const imported = [];
for (const trailId of trailIds) {
  const trailSystem = await buildTrailSystem(trailId, importConfigs[trailId]);
  await writeTrailSystemSourceShards(trailSystem, { projectRoot });
  await writePublicRouteFiles(trailId, trailSystem.sections);
  imported.push(trailSystem);
}

console.log(`Imported ${imported.length} candidate trail system(s) into runtime source shards.`);
for (const trailSystem of imported) {
  console.log(`- ${trailSystem.id}: ${trailSystem.sections.length} sections, ${trailSystem.distanceKm} km`);
}

async function buildTrailSystem(trailId, config) {
  const [routeSections, routeTopology, routeGeometryIndex, facilities] = await Promise.all([
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/route-sections.research.json")),
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/route-topology.research.json")),
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/route-geometry-index.research.json")),
    readJson(path.join(candidateRoot, trailId, "normalized-candidate/facilities.research.json"))
  ]);

  const sectionGeometryById = new Map((routeGeometryIndex.sections ?? []).map((section) => [section.sectionId, section]));
  const normalFacilitiesBySectionId = groupNormalFacilities(facilities.records ?? []);
  const geometryEndpointsById = await readGeometryEndpointsById(trailId, routeSections.sections ?? [], sectionGeometryById);
  const orderedSections = [...(routeSections.sections ?? [])]
    .sort((left, right) => sectionOrderValue(left) - sectionOrderValue(right))
    .map((section) =>
      toRuntimeSection(
        trailId,
        section,
        sectionGeometryById.get(section.sectionId),
        normalFacilitiesBySectionId.get(section.sectionId) ?? [],
        config,
        geometryEndpointsById.get(section.sectionId)
      )
    );
  const runtimeRouteGroups = toRuntimeRouteGroups(routeTopology.routeGroups ?? [], config);
  const runtimeConnections = toRuntimeConnections(routeTopology.connections ?? [], orderedSections);
  const locationStart = orderedSections[0]?.endpointCoordinates?.start;
  const bounds = await routeBounds(trailId, orderedSections, sectionGeometryById);
  const distanceKm = round(orderedSections.reduce((sum, section) => sum + (Number(section.distanceKm) || 0), 0), 1);

  return {
    id: trailId,
    itemType: "trail-system",
    name: config.name,
    region: config.region,
    country: config.country,
    location: {
      type: "swedish-region",
      label: config.region,
      start: locationStart ?? bounds.center
    },
    recommendedTimes: ["dayhike", "weekend", "3-5-days", "6-plus-days"],
    difficulty: config.difficulty,
    distanceKm,
    estimatedTime: config.estimatedTime,
    routeType: config.routeType,
    season: config.season,
    description: config.description,
    gettingThere: config.gettingThere,
    utilities: config.utilities,
    waterSources: config.waterSources,
    notes: config.notes,
    source: config.source,
    map: {
      center: bounds.center ?? locationStart,
      zoom: 8,
      externalUrl: config.source.url
    },
    sections: orderedSections,
    routeGroups: runtimeRouteGroups,
    connections: runtimeConnections,
    presets: buildPresets(orderedSections, runtimeRouteGroups)
  };
}

function toRuntimeSection(trailId, section, geometryRecord, normalFacilities, config = {}, geometryEndpoints) {
  const routePath = `/routes/hiking/${trailId}/sections/${section.sectionId}.geojson`;
  const timingNotes = estimatedTimeNotes(section.estimatedTime);
  const configNotes = config.sectionNotesById?.[section.sectionId] ?? [];
  const noteLimit = config.sectionNoteLimit ?? 6;
  const caveatNotes = uniqueStrings([
    ...configNotes,
    ...geometryStatusNotes(geometryRecord),
    ...(section.caveats ?? []).filter(isRuntimeSectionNote),
    ...timingNotes.filter(isRuntimeSectionNote)
  ]).slice(0, noteLimit);
  const normalizedStart = endpointLatLon(section.endpoints, "start");
  const normalizedEnd = endpointLatLon(section.endpoints, "end");
  const endpointCoordinates = {
    source: normalizedStart || normalizedEnd ? "candidate-normalized-route" : "candidate-normalized-route-geometry",
    start: normalizedStart ?? geometryEndpoints?.start,
    end: normalizedEnd ?? geometryEndpoints?.end
  };
  return {
    id: section.sectionId,
    stageNumber: section.sectionNumber ?? section.order,
    name: section.name,
    from: section.from,
    to: section.to,
    distanceKm: section.distance?.displayDistanceKm ?? section.distance?.officialDistanceKm ?? section.sourceSummary?.computedDistanceKm,
    estimatedTime: estimatedTimeDisplay(section.estimatedTime),
    description: `${section.from} to ${section.to}. Check current trail, access and service notices before departure.`,
    utilities: sectionUtilities(normalFacilities),
    waterSources: sectionWaterSources(normalFacilities),
    notes: caveatNotes,
    facilities: normalFacilities.map((facility) => toRuntimeFacility(facility)),
    source: {
      provider: section.sourceSummary?.source ?? "candidate-research",
      url: section.sourceSummary?.sourceUrl ?? section.sourceSummary?.gpxUrl,
      lastFetchedAt: "2026-04-30"
    },
    route: {
      status: runtimeRouteStatus(geometryRecord, section, config),
      sourceFormat: "geojson",
      geojsonPath: routePath
    },
    endpointCoordinates
  };
}

function runtimeRouteStatus(geometryRecord, section, config = {}) {
  if ((config.manualRouteSectionIds ?? []).includes(section?.sectionId)) return "manual";
  if (!geometryRecord?.candidateGeojsonFiles?.length) return "manual";
  const text = `${geometryRecord.status ?? ""} ${geometryRecord.sourceSummary?.classification ?? ""}`.toLowerCase();
  return text.includes("blocked") || text.includes("partial") ? "manual" : "ready";
}

function geometryStatusNotes(geometryRecord) {
  const text = `${geometryRecord?.status ?? ""} ${geometryRecord?.sourceSummary?.classification ?? ""}`.toLowerCase();
  if (!text.includes("blocked") && !text.includes("partial")) return [];
  return [
    "Route geometry is partial or policy-blocked in the candidate research; inspect the section caveats before treating it as a navigable route.",
    ...(geometryRecord?.blockedGeometry ?? []).map((item) => item.resolutionRequired).filter(Boolean)
  ];
}

function isRuntimeSectionNote(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  if (text.endsWith("?")) return false;
  if (/^(verify|confirm|check|recheck|resolve|choose|decide|find or verify|treat informal|keep .* (metadata|out of|pending)|do not)/.test(text)) {
    return false;
  }
  return !/(during normalization|before .*publication|before runtime|shortly before import|verify exact|verify whether|verify .* before|decide whether|decide how|resolve how|choose final|find or verify|do not import|do not .* unless|normalization policy decides|later map check|runtime import|broad app estimate|retain both source claims)/.test(
    text
  );
}

function groupNormalFacilities(records) {
  const grouped = new Map();
  for (const record of records) {
    if (record.state !== "normal") continue;
    if (!record.sectionId) continue;
    if (!grouped.has(record.sectionId)) grouped.set(record.sectionId, []);
    grouped.get(record.sectionId).push(record);
  }
  return grouped;
}

function toRuntimeFacility(record) {
  return {
    id: record.facilityId,
    name: record.name,
    type: record.primaryType,
    sectionId: record.sectionId,
    ...(isLatLonPair(record.coordinatesLatLon) ? { coordinates: record.coordinatesLatLon } : {}),
    description: facilityDescription(record),
    source: {
      provider: "candidate-research",
      url: record.sourceUrls?.[0],
      lastFetchedAt: "2026-04-30"
    },
    routeProximity: record.routeProximity
  };
}

function facilityDescription(record) {
  const pieces = [record.description, ...(record.caveats ?? []).slice(0, 2)].filter(Boolean);
  return sanitizeRuntimeText(pieces.join(" "));
}

function sanitizeRuntimeText(value) {
  return String(value ?? "")
    .replace(/\b[Vv]erify\b/g, "Check")
    .replace(/\bbefore (public\/user-facing )?publication\b/g, "before relying on it")
    .replace(/\bpublic-facing publication\b/g, "travel")
    .replace(/\bpublic import\b/g, "travel")
    .trim();
}

function sectionUtilities(facilities) {
  const labels = facilities
    .filter((facility) => ["toilet", "food", "lodging", "shelter", "campsite", "camping", "parking", "transit", "service"].includes(facility.primaryType))
    .slice(0, 8)
    .map((facility) => `${facility.name} (${facility.primaryType})`);
  return labels.length ? labels : ["No normalized service facilities are listed for this section yet."];
}

function sectionWaterSources(facilities) {
  const labels = facilities
    .filter((facility) => ["water", "natural-water"].includes(facility.primaryType))
    .slice(0, 6)
    .map((facility) => `${facility.name}: ${facility.description}`);
  return labels.length ? labels : ["No verified potable water source is listed for this section; carry water and treat natural water."];
}

function toRuntimeRouteGroups(routeGroups, config) {
  const selectableKinds = new Set(config.selectableRouteGroupKinds ?? ["mainline"]);
  return routeGroups.map((group) => ({
    id: group.groupId ?? group.id,
    name: config.routeGroupNames?.[group.groupId ?? group.id] ?? group.name ?? humanizeId(group.groupId ?? group.id),
    kind: selectableKinds.has(group.kind) ? "mainline" : group.kind,
    sectionIds: group.sectionIds ?? [],
    connectsToSectionIds: group.connectsToSectionIds ?? [],
    notice: group.status
      ? `Imported from candidate topology: ${group.status}${selectableKinds.has(group.kind) && group.kind !== "mainline" ? `; candidate ${group.kind} shown as a selectable chain` : ""}.`
      : undefined
  }));
}

function toRuntimeConnections(connections, sections) {
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  return connections
    .filter((connection) => connection.fromSectionId && connection.toSectionId)
    .map((connection) => {
      const fromSection = sectionById.get(connection.fromSectionId);
      const toSection = sectionById.get(connection.toSectionId);
      const fromCoordinates = fromSection?.endpointCoordinates?.end;
      const toCoordinates = toSection?.endpointCoordinates?.start;
      const mode = connection.mode && isLatLonPair(fromCoordinates) && isLatLonPair(toCoordinates) ? connection.mode : "none";
      return {
        id: connection.connectionId,
        mode,
        from: {
          sectionId: connection.fromSectionId,
          label: fromSection?.to ?? fromSection?.name ?? connection.fromSectionId,
          coordinates: fromCoordinates,
          coordinateSource: "route-geometry"
        },
        to: {
          sectionId: connection.toSectionId,
          label: toSection?.from ?? toSection?.name ?? connection.toSectionId,
          coordinates: toCoordinates,
          coordinateSource: "route-geometry"
        },
        currentness: connection.status ? humanizeId(connection.status) : undefined,
        note: connection.importPolicy ?? connection.status ?? "Candidate topology connection.",
        source: {
          provider: "candidate-route-topology",
          url: "",
          lastFetchedAt: "2026-04-30"
        }
      };
    });
}

function buildPresets(sections, routeGroups) {
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const primaryGroups = routeGroups.filter((group) => group.kind === "mainline");
  const groups = primaryGroups.length ? primaryGroups : routeGroups;
  const presets = [];
  for (const group of groups) {
    const groupSections = group.sectionIds.map((sectionId) => sectionById.get(sectionId)).filter(Boolean);
    if (!groupSections.length) continue;
    const isOnlyGroup = groups.length === 1;
    presets.push({
      id: isOnlyGroup ? "full-route" : `full-${group.id}`,
      name: isOnlyGroup ? "Full route" : `Full ${group.name}`,
      description: `All ${groupSections.length} stage${groupSections.length === 1 ? "" : "s"} in ${group.name}.`,
      startSectionId: groupSections[0].id,
      endSectionId: groupSections.at(-1).id
    });
  }

  if (sections.length >= 2 && groups.length <= 1) {
    presets.unshift({
      id: "first-two-stages",
      name: "First two stages",
      description: `Stages ${sections[0].stageNumber}-${sections[1].stageNumber}.`,
      startSectionId: sections[0].id,
      endSectionId: sections[1].id
    });
  }

  return presets.filter((preset) => preset.startSectionId && preset.endSectionId);
}

async function writePublicRouteFiles(trailId, sections) {
  const routeGeometryIndex = await readJson(
    path.join(candidateRoot, trailId, "normalized-candidate/route-geometry-index.research.json")
  );
  const sectionGeometryById = new Map((routeGeometryIndex.sections ?? []).map((section) => [section.sectionId, section]));
  const routeDir = path.join(publicRoutesRoot, trailId, "sections");
  await rm(routeDir, { recursive: true, force: true });
  await mkdir(routeDir, { recursive: true });
  await Promise.all(
    sections.map(async (section) => {
      const sourcePath = routeGeometryPath(trailId, section, sectionGeometryById.get(section.id));
      const candidateGeojson = await readJson(sourcePath);
      const featureCollection = toRouteFeatureCollection(trailId, section, candidateGeojson);
      await writeJson(path.join(routeDir, `${section.id}.geojson`), featureCollection);
    })
  );
}

async function readGeometryEndpointsById(trailId, routeSections, sectionGeometryById) {
  const endpointsById = new Map();
  await Promise.all(
    routeSections.map(async (section) => {
      const sectionId = section.sectionId;
      try {
        const sourcePath = routeGeometryPath(trailId, { id: sectionId }, sectionGeometryById.get(sectionId));
        const geojson = await readJson(sourcePath);
        const lines = [];
        collectLineStrings({ type: "FeatureCollection", features: runtimeRouteFeatures(geojson) }, lines);
        const firstLine = lines.find((line) => line.length > 0);
        const lastLine = [...lines].reverse().find((line) => line.length > 0);
        if (!firstLine || !lastLine) return;
        endpointsById.set(sectionId, {
          start: toLatLon(firstLine[0]),
          end: toLatLon(lastLine.at(-1))
        });
      } catch {
        // Candidate imports may be inspected before geometry has been generated.
      }
    })
  );
  return endpointsById;
}

function toRouteFeatureCollection(trailId, section, candidateGeojson) {
  const features = runtimeRouteFeatures(candidateGeojson);
  return {
    type: "FeatureCollection",
    features: features.map((feature, index) => ({
      type: "Feature",
      properties: {
        ...(feature.properties ?? {}),
        id: section.id,
        trailSystemId: trailId,
        sectionId: section.id,
        name: section.name,
        part: index + 1,
        source: "candidate-normalized-geojson"
      },
      geometry: feature?.geometry ?? candidateGeojson
    }))
  };
}

async function routeBounds(trailId, sections, sectionGeometryById) {
  const coordinates = [];
  for (const section of sections) {
    const routePath = routeGeometryPath(trailId, section, sectionGeometryById.get(section.id));
    try {
      const geojson = await readJson(routePath);
      collectCoordinates({ type: "FeatureCollection", features: runtimeRouteFeatures(geojson) }, coordinates);
    } catch {
      if (section.endpointCoordinates?.start) coordinates.push(toLonLat(section.endpointCoordinates.start));
      if (section.endpointCoordinates?.end) coordinates.push(toLonLat(section.endpointCoordinates.end));
    }
  }
  if (!coordinates.length) return {};
  const lons = coordinates.map((coordinate) => coordinate[0]);
  const lats = coordinates.map((coordinate) => coordinate[1]);
  return {
    center: [round((Math.min(...lats) + Math.max(...lats)) / 2, 6), round((Math.min(...lons) + Math.max(...lons)) / 2, 6)]
  };
}

function collectCoordinates(value, coordinates) {
  if (!value) return;
  if (value.type === "FeatureCollection") {
    for (const feature of value.features ?? []) collectCoordinates(feature, coordinates);
  } else if (value.type === "Feature") {
    collectCoordinates(value.geometry, coordinates);
  } else if (value.type === "LineString") {
    coordinates.push(...(value.coordinates ?? []));
  } else if (value.type === "MultiLineString") {
    for (const line of value.coordinates ?? []) coordinates.push(...line);
  }
}

function collectLineStrings(value, lines) {
  if (!value) return;
  if (value.type === "FeatureCollection") {
    for (const feature of value.features ?? []) collectLineStrings(feature, lines);
  } else if (value.type === "Feature") {
    collectLineStrings(value.geometry, lines);
  } else if (value.type === "LineString") {
    lines.push(value.coordinates ?? []);
  } else if (value.type === "MultiLineString") {
    for (const line of value.coordinates ?? []) lines.push(line);
  }
}

function routeGeometryPath(trailId, section, geometryRecord) {
  const declaredPath = geometryRecord?.candidateGeojsonFiles?.[0];
  if (declaredPath) return path.resolve(projectRoot, declaredPath);
  return path.join(candidateRoot, trailId, "geometry/candidate/sections", `${section.id}.geojson`);
}

function runtimeRouteFeatures(candidateGeojson) {
  const features =
    candidateGeojson.type === "FeatureCollection"
      ? candidateGeojson.features ?? []
      : [{ type: "Feature", properties: {}, geometry: candidateGeojson.type === "Feature" ? candidateGeojson.geometry : candidateGeojson }];
  const primaryFeatures = features.filter((feature) => {
    const role = String(feature.properties?.role ?? "").toLowerCase();
    return role === "mainline" || role === "mainline-primary" || role.includes("mainline-primary");
  });
  return primaryFeatures.length ? primaryFeatures : features;
}

function toLonLat(latLon) {
  return [latLon[1], latLon[0]];
}

function toLatLon(lonLat) {
  return [round(lonLat[1], 6), round(lonLat[0], 6)];
}

function endpointLatLon(endpoints, position) {
  const keys =
    position === "start"
      ? ["start", "continuousTrailStart", "officialNamedStart", "startStageGoalCandidate"]
      : ["end", "endForTrailContinuity", "officialNamedEnd", "endStageGoalCandidate"];
  for (const key of keys) {
    const coordinates = endpoints?.[key]?.coordinatesLatLon;
    if (isLatLonPair(coordinates)) return coordinates;
  }
  return undefined;
}

function sectionOrderValue(section) {
  if (typeof section.order === "number" && Number.isFinite(section.order)) return section.order;
  if (typeof section.sectionNumber === "number" && Number.isFinite(section.sectionNumber)) return section.sectionNumber;
  const match = String(section.sectionNumber ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function isLatLonPair(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)) &&
    Math.abs(value[0]) <= 90 &&
    Math.abs(value[1]) <= 180
  );
}

function uniqueStrings(values) {
  return values.filter((value, index) => typeof value === "string" && value.trim() && values.indexOf(value) === index);
}

function estimatedTimeDisplay(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    for (const key of ["official", "officialStf", "stf", "naturkartan", "derived"]) {
      if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
    }
  }
  return "No official estimate";
}

function estimatedTimeNotes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const notes = [];
  for (const key of ["note", "notes"]) {
    if (typeof value[key] === "string" && value[key].trim()) notes.push(`Timing note: ${value[key].trim()}`);
  }
  if (typeof value.derived === "string" && value.derived.trim()) {
    notes.push(`Derived timing context, not official: ${value.derived.trim()}`);
  }
  notes.push(...(value.otherSources ?? [])
    .map((source) => {
      if (!source?.source || !source?.value) return undefined;
      return `Other timing source (${source.source}): ${source.value}`;
    })
    .filter(Boolean));
  return notes;
}

function humanizeId(value) {
  return String(value ?? "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function round(value, decimals = 1) {
  return Number(value.toFixed(decimals));
}
