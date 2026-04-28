import { readFile } from "node:fs/promises";

const trailSystem = JSON.parse(await readFile("public/data/trail-systems/sormlandsleden.json", "utf8"));

const deepSourceHints = [
  "sörmlandsleden",
  "sormlandsleden",
  "naturkartan",
  "lansstyrelsen",
  "länsstyrelsen",
  "team vildmark",
  "nya stigar",
  "alltrails",
  "utsidan",
  "traneving",
  "äventyrligare",
  "aventyrligare",
  "guidebook",
  "book",
  "blog",
  "forum",
  "kommun",
  "tyreso",
  "haninge",
  "huddinge",
  "sodertalje",
  "botkyrka",
  "nacka",
  "stockholm",
  "vindskyddskartan",
  "badplats",
  "lida",
  "tyresta",
  "tvetagarden"
];

function isOfficialPlaceholder(facility) {
  return /Official Sörmlandsleden lists/i.test(facility.description);
}

function hasPlaceholderText(section) {
  return [
    section.description,
    ...(section.utilities ?? []),
    ...(section.waterSources ?? []),
    ...(section.notes ?? [])
  ]
    .filter(Boolean)
    .some((entry) =>
      /(still needs the full enrichment pass|official section imported|conservative official-summary markers|exact sub-location still needs|no verified water refill has been deeply researched|until enriched)/i.test(
        entry
      )
    );
}

function hasDeepSource(section) {
  const text = [
    section.description,
    ...(section.utilities ?? []),
    ...(section.waterSources ?? []),
    ...(section.notes ?? []),
    ...(section.facilities ?? []).flatMap((facility) => [
      facility.name,
      facility.description,
      facility.source?.provider,
      facility.source?.url
    ])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return deepSourceHints.some((hint) => text.includes(hint));
}

function sectionScore(section) {
  const facilities = section.facilities ?? [];
  const types = new Set(facilities.map((facility) => facility.type));
  const notes = section.notes ?? [];
  const utilities = section.utilities ?? [];
  const waterSources = section.waterSources ?? [];
  const explicitlySparse = [...utilities, ...waterSources, ...notes].some((entry) =>
    /(no verified|services are sparse|low-service|carry water|no reliable|no official|no trail water)/i.test(entry)
  );
  const facilityTarget = section.distanceKm <= 4 || explicitlySparse ? 1 : 3;
  const typeTarget = section.distanceKm <= 4 || explicitlySparse ? 1 : 2;

  let score = 0;
  if (facilities.length >= facilityTarget) score += 1;
  if (types.size >= typeTarget) score += 1;
  if (notes.length >= 3) score += 1;
  if (waterSources.length > 0 && (waterSources.some((entry) => !/No verified water/i.test(entry)) || explicitlySparse)) score += 1;
  if (hasDeepSource(section)) score += 1;
  if (!facilities.some(isOfficialPlaceholder)) score += 1;
  return score;
}

const rows = trailSystem.sections.map((section) => {
  const facilities = section.facilities ?? [];
  const placeholderFacilities = facilities.filter(isOfficialPlaceholder);
  return {
    stage: section.stageNumber,
    name: section.name,
    distanceKm: section.distanceKm,
    route: section.route?.geojsonPath ? "drawn" : "marker-only",
    facilities: facilities.length,
    facilityTypes: [...new Set(facilities.map((facility) => facility.type))].sort().join(", "),
    placeholders: placeholderFacilities.length,
    placeholderText: hasPlaceholderText(section),
    score: sectionScore(section)
  };
});

const underEnriched = rows.filter((row) => row.score < 5 || row.placeholders > 0 || row.placeholderText);

console.log(
  JSON.stringify(
    {
      sections: rows.length,
      underEnriched: underEnriched.length,
      drawnRoutes: rows.filter((row) => row.route === "drawn").length,
      markerOnlyRoutes: rows.filter((row) => row.route === "marker-only").length,
      sampleUnderEnriched: underEnriched.slice(0, 30)
    },
    null,
    2
  )
);
