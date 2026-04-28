import { readFile } from "node:fs/promises";

const trailSystem = JSON.parse(await readFile("public/data/trail-systems/sormlandsleden.json", "utf8"));

const sparsePattern =
  /(no verified|no reliable|carry water|low-service|access connector|short connector|services are sparse|no trail water|no official water)/i;
const fireCampPattern =
  /(fire|fires|grill|camp|camping|tent|tält|reserve|naturreservat|shelter|vindskydd|fireplace|dogs|leash|eld)/i;
const accessPattern = /(parking|parkering|bus|train|station|transit|access|commuter|road)/i;
const currentPattern =
  /(202[3-6]|current|comment|reroute|hazard|warning|fallen|bark|logging|mud|dry|unavailable|season|verify|closed|risk|reported)/i;
const externalEvidencePattern =
  /(naturkartan|länsstyrelsen|lansstyrelsen|team vildmark|nya stigar|alltrails|utsidan|traneving|blog|forum|comment|municipal|kommun|reserve|visit|friluftsfrämjandet|guide|book|reddit|trailforks|komoot|gaia|äventyrligare|aventyrligare)/i;

function sectionText(section) {
  return [
    section.description,
    ...(section.utilities ?? []),
    ...(section.waterSources ?? []),
    ...(section.notes ?? []),
    ...(section.facilities ?? []).flatMap((facility) => [
      facility.name,
      facility.description,
      facility.source?.provider
    ])
  ]
    .filter(Boolean)
    .join(" ");
}

function auditSection(section) {
  const text = sectionText(section);
  const facilities = section.facilities ?? [];
  const facilityTypes = new Set(facilities.map((facility) => facility.type));
  const intentionallySparse = sparsePattern.test(text) || section.distanceKm <= 4;
  const minimumFacilities = intentionallySparse ? 1 : 4;
  const minimumTypes = intentionallySparse ? 1 : 3;

  const checks = {
    facilities: facilities.length >= minimumFacilities,
    facilityTypes: facilityTypes.size >= minimumTypes,
    waterStatus: (section.waterSources ?? []).length > 0,
    accessContext:
      accessPattern.test(text) || facilities.some((facility) => ["parking", "transit", "food"].includes(facility.type)),
    fireCampingRules: fireCampPattern.test(text),
    currentCondition: intentionallySparse || currentPattern.test(text),
    externalEvidence: externalEvidencePattern.test(text),
    validCoordinates: facilities.every(
      (facility) =>
        Array.isArray(facility.coordinates) &&
        facility.coordinates.length === 2 &&
        facility.coordinates.every(Number.isFinite)
    )
  };

  return {
    stage: section.stageNumber,
    name: section.name,
    distanceKm: section.distanceKm,
    facilities: facilities.length,
    facilityTypes: [...facilityTypes].sort(),
    intentionallySparse,
    missing: Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name)
  };
}

const rows = trailSystem.sections.map(auditSection);
const weak = rows.filter((row) => row.missing.length > 0);

console.log(
  JSON.stringify(
    {
      sections: rows.length,
      weakCount: weak.length,
      weak
    },
    null,
    2
  )
);
