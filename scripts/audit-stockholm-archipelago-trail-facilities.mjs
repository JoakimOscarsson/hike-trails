import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const RESEARCH_DIR = path.join(
  REPO_ROOT,
  "data/research/candidate-trails/stockholm-archipelago-trail",
);
const RESEARCH_PATH = path.join(RESEARCH_DIR, "trail.research.json");
const AUDIT_PATH = path.join(RESEARCH_DIR, "facility-normalization-audit.json");

const APP_FACILITY_TYPES = [
  "campsite",
  "shelter",
  "fireplace",
  "toilet",
  "water",
  "natural-water",
  "food",
  "swimming",
  "parking",
  "transit",
  "rest-area",
  "attraction",
  "heritage",
  "rule-warning",
  "unofficial-shelter",
  "trail-junction",
  "emergency-phone",
  "lodging",
  "waste",
  "hazard",
  "viewpoint",
  "camping",
  "service",
];

const APP_TYPE_SET = new Set(APP_FACILITY_TYPES);

const CATEGORY_BY_TYPE = {
  "rule-warning": "warnings",
  hazard: "warnings",
  shelter: "shelter-emergency",
  "unofficial-shelter": "shelter-emergency",
  "emergency-phone": "shelter-emergency",
  water: "water",
  "natural-water": "water",
  campsite: "tent-sites",
  camping: "tent-sites",
  fireplace: "fire",
  toilet: "toilets-waste",
  waste: "toilets-waste",
  food: "food-lodging-services",
  lodging: "food-lodging-services",
  service: "food-lodging-services",
  parking: "parking-transit",
  transit: "parking-transit",
  "rest-area": "places",
  attraction: "places",
  heritage: "places",
  viewpoint: "places",
  swimming: "places",
  "trail-junction": "not-shown",
};

const DIRECT_IMPORT_TYPES = [
  "attraction",
  "camping",
  "campsite",
  "fireplace",
  "food",
  "heritage",
  "lodging",
  "parking",
  "rest-area",
  "service",
  "shelter",
  "swimming",
  "toilet",
  "transit",
  "viewpoint",
  "water",
];

const FACILITY_POLICIES = Object.fromEntries(
  DIRECT_IMPORT_TYPES.map((type) => [
    type,
    {
      action: "import_facility",
      normalizedTypes: [type],
      category: CATEGORY_BY_TYPE[type],
      note: "Already matches the current app facility taxonomy.",
    },
  ]),
);

Object.assign(FACILITY_POLICIES, {
  accommodation: {
    action: "normalize_facility",
    normalizedTypes: ["lodging"],
    category: CATEGORY_BY_TYPE.lodging,
    note: "Accommodation is shown with lodging/services rather than as shelter.",
  },
  beach: {
    action: "normalize_facility",
    normalizedTypes: ["swimming"],
    category: CATEGORY_BY_TYPE.swimming,
    note: "Beach records belong in the Places group as swimming.",
  },
  bay_and_swimming: {
    action: "normalize_facility",
    normalizedTypes: ["swimming"],
    category: CATEGORY_BY_TYPE.swimming,
    note: "Bay/swimming records belong in the Places group as swimming.",
  },
  cultural_agricultural: {
    action: "normalize_facility",
    normalizedTypes: ["heritage"],
    category: CATEGORY_BY_TYPE.heritage,
    note: "Agricultural history is a heritage POI.",
  },
  cultural_history: {
    action: "normalize_facility",
    normalizedTypes: ["heritage"],
    category: CATEGORY_BY_TYPE.heritage,
    note: "Cultural-history records are heritage POIs.",
  },
  harbor_services: {
    action: "suppress_metadata",
    normalizedTypes: [],
    category: null,
    note: "Harbor-service clusters are marina metadata; the user explicitly agreed to skip them.",
  },
  nature: {
    action: "case_normalize_facility",
    normalizedTypes: ["attraction", "viewpoint"],
    category: CATEGORY_BY_TYPE.attraction,
    note: "Natural features become attraction or viewpoint depending on the record.",
  },
  nature_reserve: {
    action: "normalize_facility",
    normalizedTypes: ["attraction"],
    category: CATEGORY_BY_TYPE.attraction,
    note: "Nature reserve context is a Places attraction when it is useful to show.",
  },
  natural_swim_rest: {
    action: "normalize_facility",
    normalizedTypes: ["swimming"],
    category: CATEGORY_BY_TYPE.swimming,
    note: "Natural swim/rest records should use the swimming icon rather than creating a new type.",
  },
  poi: {
    action: "case_normalize_facility",
    normalizedTypes: ["heritage", "attraction", "viewpoint"],
    category: CATEGORY_BY_TYPE.attraction,
    note: "POIs are mapped by record to heritage, attraction, or viewpoint.",
  },
  rental: {
    action: "suppress_by_default",
    normalizedTypes: ["service"],
    category: CATEGORY_BY_TYPE.service,
    note: "Rentals are optional/paid services. Import as service only after an explicit product decision.",
  },
  public_bathing_place: {
    action: "normalize_facility",
    normalizedTypes: ["swimming"],
    category: CATEGORY_BY_TYPE.swimming,
    note: "Public bathing places belong in the Places group as swimming.",
  },
  rest_cultural: {
    action: "normalize_facility",
    normalizedTypes: ["rest-area"],
    category: CATEGORY_BY_TYPE["rest-area"],
    note: "Rest/cultural hybrid records should use rest-area unless a stronger heritage reading is needed.",
  },
  route_feature: {
    action: "normalize_facility",
    normalizedTypes: ["attraction"],
    category: CATEGORY_BY_TYPE.attraction,
    note: "Named route features can be quiet Places attractions without a new icon.",
  },
  sauna: {
    action: "suppress_by_default",
    normalizedTypes: ["service"],
    category: CATEGORY_BY_TYPE.service,
    note: "Saunas are optional/paid services. Suppress unless intentionally shown as service.",
  },
  shelter_fire_rest_area: {
    action: "split_facility",
    normalizedTypes: ["shelter", "fireplace", "rest-area"],
    category: "multiple",
    note: "Split into shelter, fire, and rest-area records where the source supports all three.",
  },
  shop: {
    action: "normalize_facility",
    normalizedTypes: ["food"],
    category: CATEGORY_BY_TYPE.food,
    note: "Grocery/resupply shops belong with food; non-food shops can be service or suppressed later.",
  },
  snorkeling: {
    action: "normalize_facility",
    normalizedTypes: ["swimming"],
    category: CATEGORY_BY_TYPE.swimming,
    note: "Snorkel-trail records belong with swimming rather than a separate category.",
  },
  transport: {
    action: "move_to_access_or_connection",
    normalizedTypes: ["transit"],
    category: CATEGORY_BY_TYPE.transit,
    note: "Transport records should feed access/connection modeling; only render as transit points when useful.",
  },
  water_campsite_context: {
    action: "suppress_metadata",
    normalizedTypes: [],
    category: null,
    note: "Campground/service-context water is not a public trail refill unless separately verified.",
  },
});

const ACCESS_POLICIES = {
  access: {
    action: "hold_for_access_model",
    connectionMode: "access",
    note: "General access point. Do not import as an ordinary facility.",
  },
  bus_ferry_transfer: {
    action: "hold_for_connection_model",
    connectionMode: "ferry",
    note: "Potential ferry transfer with a land-transit leg.",
  },
  connector_access: {
    action: "hold_for_connection_model",
    connectionMode: "walk",
    note: "Connector access point for chaining sections.",
  },
  island_bus_route_metadata: {
    action: "suppress_metadata",
    connectionMode: "bus",
    note: "Route metadata only; not a map facility.",
  },
  land_to_ferry_transfer_metadata: {
    action: "hold_for_connection_model",
    connectionMode: "ferry",
    note: "Transfer metadata for connecting land transit to ferry.",
  },
  mainland_bus_route_metadata: {
    action: "suppress_metadata",
    connectionMode: "bus",
    note: "Route metadata only; not a map facility.",
  },
  mainland_transfer_hub: {
    action: "hold_for_access_model",
    connectionMode: "access",
    note: "Mainland transfer hub; useful for access display, not a trail facility.",
  },
  nearby_island_transfer_metadata: {
    action: "suppress_metadata",
    connectionMode: "ferry",
    note: "Nearby-island transfer context only.",
  },
  private_transport: {
    action: "suppress_metadata",
    connectionMode: "private",
    note: "Private transport is fallback context, not a public trail connection.",
  },
  public_ferry_quay: {
    action: "hold_for_connection_model",
    connectionMode: "ferry",
    note: "Public ferry quay; candidate for ferry stop or connection endpoint.",
  },
  public_ferry_route_metadata: {
    action: "hold_for_connection_model",
    connectionMode: "ferry",
    note: "Ferry-route metadata for Slice 2 transfer mapping.",
  },
  rowboat_crossing: {
    action: "hold_for_connection_model",
    connectionMode: "rowboat",
    note: "Self-service rowboat crossing; official route section, not a facility.",
  },
  seasonal_public_ferry_route_metadata: {
    action: "hold_for_connection_model",
    connectionMode: "ferry",
    note: "Seasonal ferry-route metadata; needs currentness caveat.",
  },
  trail_connection: {
    action: "hold_for_connection_model",
    connectionMode: "walk",
    note: "Trail-to-trail connector point.",
  },
  waxholmsbolaget_ferry_stop: {
    action: "hold_for_connection_model",
    connectionMode: "ferry",
    note: "Waxholmsbolaget ferry stop; candidate for transit point and connection endpoint.",
  },
  waxholmsbolaget_ferry_stop_indirect: {
    action: "hold_for_connection_model",
    connectionMode: "ferry",
    note: "Indirect Waxholmsbolaget access point; candidate for access display, not a normal section facility.",
  },
  missing_access_type: {
    action: "needs_source_cleanup",
    connectionMode: "unknown",
    note: "Access metadata record lacks a type. Clean up before importing as connection data.",
  },
};

const args = new Set(process.argv.slice(2));

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flattenRecords(value) {
  if (!Array.isArray(value)) {
    return isObject(value) || typeof value === "string" ? [value] : [];
  }

  return value.flatMap((item) => {
    if (Array.isArray(item)) {
      return flattenRecords(item);
    }
    return isObject(item) || typeof item === "string" ? [item] : [];
  });
}

function stableRecordId(section, origin, record, index) {
  if (isObject(record) && typeof record.id === "string") {
    return record.id;
  }
  if (isObject(record) && typeof record.sourceResearchId === "string") {
    return record.sourceResearchId;
  }
  return `${section.id}:${origin}:${index + 1}`;
}

function rawTypeOf(record) {
  if (typeof record === "string") {
    return "free_text_note";
  }
  if (!isObject(record)) {
    return "unknown";
  }
  if (typeof record.type === "string") {
    return record.type;
  }
  if (typeof record.proposedType === "string") {
    return record.proposedType;
  }
  if (Array.isArray(record.proposedTypes)) {
    return record.proposedTypes.join("|");
  }
  if (typeof record.integrationCategory === "string") {
    return record.integrationCategory;
  }
  return "missing_type";
}

function rawAccessTypeOf(record) {
  if (typeof record === "string") {
    return "free_text_note";
  }
  if (!isObject(record)) {
    return "missing_access_type";
  }
  if (typeof record.type === "string") {
    return record.type;
  }
  if (
    record.scheduledPublicTransport === true &&
    (record.primaryFerryLine || record.primaryLine || record.primaryPublicTransportOperator)
  ) {
    return "public_ferry_route_metadata";
  }
  return "missing_access_type";
}

function hasExplicitSuppressPolicy(record) {
  if (!isObject(record)) {
    return false;
  }
  if (record.notTrailFacility === true) {
    return true;
  }
  const renderPolicy = String(record.renderPolicy ?? "");
  return renderPolicy.includes("never_render") || renderPolicy.includes("service_metadata_only");
}

function choosePoiNormalizedType(record) {
  const text = [
    record.name,
    record.subtype,
    record.description,
    record.note,
    record.integrationCategory,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /viewpoint|utsikt|lookout|high point|klint|lighthouse|fyr|tower|bird tower|scenic/.test(
      text,
    )
  ) {
    return "viewpoint";
  }
  if (
    /heritage|historic|cultural|battery|batteri|oven|ryssugn|compass|inscription|ristning|windmill|kvarn|telegraph|labyrinth|museum|villa|church|kyrk/.test(
      text,
    )
  ) {
    return "heritage";
  }
  return "attraction";
}

function policyForFacilityRecord(record, origin) {
  if (typeof record === "string") {
    return {
      action: "suppress_free_text_note",
      normalizedTypes: [],
      category: null,
      note: "Free-text suppression or pending note. Keep as research context only.",
    };
  }

  if (!isObject(record)) {
    return {
      action: "unsupported_record_shape",
      normalizedTypes: [],
      category: null,
      note: "Record is neither an object nor a string.",
    };
  }

  const rawType = rawTypeOf(record);

  if (origin.includes("facilitiesToSuppressDraft")) {
    return {
      action: "suppress_metadata",
      normalizedTypes: [],
      category: null,
      note: "Explicitly listed in facilitiesToSuppressDraft.",
    };
  }

  if (origin.includes("pending")) {
    return {
      action: "hold_pending_review",
      normalizedTypes: [],
      category: null,
      note: "Pending record. Do not import until reviewed in a later slice.",
    };
  }

  if (hasExplicitSuppressPolicy(record)) {
    return {
      action: "suppress_metadata",
      normalizedTypes: [],
      category: null,
      note: "Record is explicitly marked as notTrailFacility or never-render metadata.",
    };
  }

  const basePolicy = FACILITY_POLICIES[rawType];
  if (!basePolicy) {
    return {
      action: "unsupported_import_type",
      normalizedTypes: [],
      category: null,
      note: `No SAT normalization policy exists for raw type "${rawType}".`,
    };
  }

  if (rawType === "poi" || rawType === "nature") {
    const normalizedType = choosePoiNormalizedType(record);
    return {
      ...basePolicy,
      normalizedTypes: [normalizedType],
      category: CATEGORY_BY_TYPE[normalizedType],
      note: `${basePolicy.note} This record maps to ${normalizedType}.`,
    };
  }

  return basePolicy;
}

function policyForAccessRecord(record) {
  if (typeof record === "string") {
    return {
      action: "suppress_free_text_note",
      connectionMode: null,
      note: "Free-text access note. Keep as research context only.",
    };
  }

  const rawType = rawAccessTypeOf(record);
  return (
    ACCESS_POLICIES[rawType] ?? {
      action: "unsupported_access_type",
      connectionMode: "unknown",
      note: `No SAT access/transfer policy exists for raw type "${rawType}".`,
    }
  );
}

function summarizeBy(records, getKey) {
  const counts = new Map();
  for (const record of records) {
    const key = getKey(record) ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function collectFacilityRecords(sections) {
  const records = [];

  for (const section of sections) {
    const addRecords = (origin, values) => {
      flattenRecords(values).forEach((record, index) => {
        const policy = policyForFacilityRecord(record, origin);
        records.push({
          id: stableRecordId(section, origin, record, index),
          sectionId: section.id,
          sectionName: section.name,
          origin,
          rawType: rawTypeOf(record),
          name: isObject(record) ? (record.name ?? null) : null,
          decision: policy.action,
          normalizedTypes: policy.normalizedTypes,
          category: policy.category,
          note: policy.note,
        });
      });
    };

    addRecords("facilitiesDraft", section.facilitiesDraft);
    addRecords("facilitiesToSuppressDraft", section.facilitiesToSuppressDraft);
    addRecords("pendingFacilityDraft", section.pendingFacilityDraft);
    addRecords("pendingPoiDraft", section.pendingPoiDraft);
    addRecords("secondaryPoiDraft", section.secondaryPoiDraft);
    addRecords("pointsOfInterestDraft", section.pointsOfInterestDraft);

    if (Array.isArray(section.appImportPreviewDraft)) {
      addRecords("appImportPreviewDraft", section.appImportPreviewDraft);
    } else if (isObject(section.appImportPreviewDraft)) {
      addRecords(
        "appImportPreviewDraft.trailFacilityCandidates",
        section.appImportPreviewDraft.trailFacilityCandidates,
      );
      addRecords("appImportPreviewDraft.poiCandidates", section.appImportPreviewDraft.poiCandidates);
      addRecords(
        "appImportPreviewDraft.manualOrSideFacilityOnly",
        section.appImportPreviewDraft.manualOrSideFacilityOnly,
      );
      addRecords(
        "appImportPreviewDraft.shouldNotBeNormalYet",
        section.appImportPreviewDraft.shouldNotBeNormalYet,
      );
    }
  }

  return records;
}

function collectAccessRecords(sections) {
  const records = [];

  for (const section of sections) {
    flattenRecords(section.accessMetadataDraft).forEach((record, index) => {
      const policy = policyForAccessRecord(record);
      const rawType = rawAccessTypeOf(record);
      records.push({
        id: stableRecordId(section, "accessMetadataDraft", record, index),
        sectionId: section.id,
        sectionName: section.name,
        origin: "accessMetadataDraft",
        rawType,
        name: isObject(record) ? (record.name ?? null) : null,
        decision: policy.action,
        connectionMode: policy.connectionMode,
        note: policy.note,
      });
    });

    if (section.sectionType === "transfer" || section.transferMode) {
      const isRowboatSection = section.id === "sat-rowboats-finnhamn-ingmarso";
      records.push({
        id: section.id,
        sectionId: section.id,
        sectionName: section.name,
        origin: "section.transferMode",
        rawType: section.transferMode ?? "missing_transfer_mode",
        name: section.name,
        decision: "hold_for_connection_model",
        connectionMode: section.transferMode ?? "unknown",
        note: isRowboatSection
          ? "Section-level rowboat crossing. Model as an official route section, not as an inter-section transfer line."
          : "Section-level transfer. Model as an inter-section connection route in Slice 1/2.",
      });
    }
  }

  return records;
}

function createAudit(research) {
  const facilityRecords = collectFacilityRecords(research.sections ?? []);
  const accessRecords = collectAccessRecords(research.sections ?? []);
  const unsupportedImportRecords = facilityRecords.filter(
    (record) => record.decision === "unsupported_import_type",
  );
  const unsupportedAccessRecords = accessRecords.filter(
    (record) => record.decision === "unsupported_access_type",
  );
  const unsupportedRuntimeTypesAfterPolicy = [
    ...new Set(
      facilityRecords
        .flatMap((record) => record.normalizedTypes)
        .filter((type) => !APP_TYPE_SET.has(type)),
    ),
  ].sort();

  return {
    auditVersion: 1,
    sourceTrailId: research.id,
    sourceCreatedAt: research.createdAt,
    sourcePath: path.relative(REPO_ROOT, RESEARCH_PATH),
    generatedBy: path.relative(REPO_ROOT, fileURLToPath(import.meta.url)),
    purpose:
      "Slice 0 audit for Stockholm Archipelago Trail facility normalization and transfer/access candidates.",
    currentAppFacilityTypes: APP_FACILITY_TYPES,
    currentCategoryByType: CATEGORY_BY_TYPE,
    facilityTypePolicies: FACILITY_POLICIES,
    accessTypePolicies: ACCESS_POLICIES,
    summary: {
      sectionCount: research.sections?.length ?? 0,
      facilityRecordCount: facilityRecords.length,
      accessOrTransferRecordCount: accessRecords.length,
      facilityRecordsByOrigin: summarizeBy(facilityRecords, (record) => record.origin),
      facilityRecordsByRawType: summarizeBy(facilityRecords, (record) => record.rawType),
      facilityRecordsByDecision: summarizeBy(facilityRecords, (record) => record.decision),
      accessRecordsByRawType: summarizeBy(accessRecords, (record) => record.rawType),
      accessRecordsByDecision: summarizeBy(accessRecords, (record) => record.decision),
      connectionModesByDecision: summarizeBy(accessRecords, (record) => record.connectionMode),
      unsupportedImportRecordCount: unsupportedImportRecords.length,
      unsupportedAccessRecordCount: unsupportedAccessRecords.length,
      unsupportedRuntimeTypesAfterPolicy,
    },
    unresolved: {
      unsupportedImportRecords,
      unsupportedAccessRecords,
      unsupportedRuntimeTypesAfterPolicy,
    },
    recordsNeedingLaterReview: facilityRecords.filter((record) =>
      [
        "case_normalize_facility",
        "hold_pending_review",
        "move_to_access_or_connection",
        "split_facility",
        "suppress_by_default",
      ].includes(record.decision),
    ),
    transferAndAccessCandidates: accessRecords.filter((record) =>
      ["hold_for_access_model", "hold_for_connection_model"].includes(record.decision),
    ),
    facilityRecordDecisions: facilityRecords,
    accessRecordDecisions: accessRecords,
  };
}

async function main() {
  const research = JSON.parse(await readFile(RESEARCH_PATH, "utf8"));
  const audit = createAudit(research);
  const auditText = `${JSON.stringify(audit, null, 2)}\n`;

  const hasUnresolved =
    audit.unresolved.unsupportedImportRecords.length > 0 ||
    audit.unresolved.unsupportedAccessRecords.length > 0 ||
    audit.unresolved.unsupportedRuntimeTypesAfterPolicy.length > 0;

  if (args.has("--stdout")) {
    process.stdout.write(auditText);
  } else if (args.has("--check")) {
    const existing = await readFile(AUDIT_PATH, "utf8");
    if (existing !== auditText) {
      console.error(
        `${path.relative(REPO_ROOT, AUDIT_PATH)} is stale. Run npm run data:sat:facility-audit.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(`${path.relative(REPO_ROOT, AUDIT_PATH)} is up to date.`);
  } else {
    await writeFile(AUDIT_PATH, auditText);
    console.log(`Wrote ${path.relative(REPO_ROOT, AUDIT_PATH)}.`);
  }

  if (hasUnresolved) {
    console.error("SAT facility audit has unresolved import/access policy gaps.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
