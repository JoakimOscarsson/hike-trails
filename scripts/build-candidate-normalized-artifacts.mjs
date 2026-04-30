import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const candidateRoot = path.join(projectRoot, "data/research/candidate-trails");
const lastUpdated = "2026-04-30";

const shared = await readJson(path.join(candidateRoot, "shared-importer-decisions.research.json"));
const prep = await readJson(path.join(candidateRoot, "normalization-prep.research.json"));
const manifest = await readJson(path.join(candidateRoot, "manifest.json"));

const includedTrails = prep.scope.includedTrails;
const trailManifestById = new Map(manifest.trails.map((trail) => [trail.id, trail]));
const batchSummary = [];
const blockerTriageRows = [];

for (const trailId of includedTrails) {
  const trailRoot = path.join(candidateRoot, trailId);
  const normalizedRoot = path.join(trailRoot, "normalized-candidate");
  await mkdir(normalizedRoot, { recursive: true });

  const handoff = await readJson(path.join(trailRoot, "normalization-handoff.research.json"));
  const sections = await readSections(trailRoot);
  const geojsonFiles = (await walkFiles(trailRoot))
    .filter((filePath) => filePath.endsWith(".geojson") && !filePath.includes(`${path.sep}normalized-candidate${path.sep}`))
    .map((filePath) => toProjectRelative(filePath));

  const routeSections = buildRouteSections(trailId, sections, handoff);
  const geometryIndex = buildGeometryIndex(trailId, sections, handoff, geojsonFiles);
  const facilities = buildFacilities(trailId, sections);
  const ruleWarnings = buildRuleWarnings(trailId, sections, handoff);
  const importReport = buildImportReport(trailId, handoff, routeSections, geometryIndex, facilities, ruleWarnings);

  await writeJson(path.join(normalizedRoot, "route-sections.research.json"), routeSections);
  await writeJson(path.join(normalizedRoot, "route-geometry-index.research.json"), geometryIndex);
  await writeJson(path.join(normalizedRoot, "facilities.research.json"), facilities);
  await writeJson(path.join(normalizedRoot, "rule-warnings.research.json"), ruleWarnings);
  await writeJson(path.join(normalizedRoot, "import-report.research.json"), importReport);

  batchSummary.push({
    trailId,
    sectionCount: routeSections.sections.length,
    geometrySectionsWithCandidateGeojson: geometryIndex.sections.filter((section) => section.candidateGeojsonFiles.length > 0).length,
    facilityRecords: facilities.records.length,
    importedFacilityCandidates: facilities.summary.byState.normal ?? 0,
    pendingFacilityCandidates: facilities.summary.byState["pending-review"] ?? 0,
    suppressedFacilityCandidates: facilities.summary.byState.suppress ?? 0,
    ruleWarningRecords: ruleWarnings.records.length,
    blockerCount: importReport.blockers.length,
    openDecisionCount: importReport.openDecisions.length,
    triageSummary: importReport.triageSummary
  });
  blockerTriageRows.push({
    trailId,
    triageSummary: importReport.triageSummary,
    fixesAppliedNow: importReport.fixesAppliedNow,
    nextFixNow: importReport.fixNowBeforeRuntimeImport,
    deferred: importReport.deferredBeforeRuntimeImport,
    runtimeSchemaNeeded: importReport.runtimeSchemaNeeded,
    items: importReport.blockerTriage
  });
}

await writeJson(path.join(candidateRoot, "phase3-candidate-artifacts.research.json"), {
  schemaVersion: "candidate-normalization-phase3-report/v1",
  lastUpdated,
  status: "complete-initial-candidate-artifacts",
  purpose: "Batch summary for candidate-only normalized artifacts generated from research packets.",
  runtimeImportApproved: false,
  artifactRootPattern: "data/research/candidate-trails/<trail-id>/normalized-candidate/",
  artifactFiles: shared.resolvedSharedDecisions.candidateArtifactLayout.minimumArtifacts,
  includedTrails: batchSummary,
  nextActions: [
    "Work the fix-now queue in blocker-triage.research.json before runtime import work.",
    "Prioritize candidate geometry builds, topology/connectors, facility dedupe and GIS overlays.",
    "Run GIS overlays and live publication checks before user-facing rule warnings.",
    "Keep pending-review and suppress facility records out of runtime output."
  ]
});

const triageItems = blockerTriageRows.flatMap((row) => row.items);
await writeJson(path.join(candidateRoot, "blocker-triage.research.json"), {
  schemaVersion: "candidate-blocker-triage/v1",
  lastUpdated,
  status: "triaged-fix-now-biased",
  purpose: "Review of normalized-candidate import report blockers with a bias toward fixing candidate-prep issues now and deferring only runtime, external, or publication-time work.",
  runtimeImportApproved: false,
  dispositionDefinitions: {
    "resolved-now": "Fixed or resolved during this candidate-prep pass, usually by shared decisions, candidate artifact state, or documentation cleanup.",
    "fix-now": "Actionable repository work that should be done before runtime import and does not inherently require publication-day data.",
    "runtime-schema-needed": "Requires runtime importer or app schema support before it can be fully resolved.",
    "external-source-approval": "Requires source licensing, API credentials, or official/source confirmation outside this repo.",
    "defer-publication-time": "Must be checked close to user-facing publication because the fact is volatile.",
    "runtime-integration-task": "Intentionally waits for an explicit runtime import task.",
    "scope-limitation": "Accepted scope boundary for this candidate import model."
  },
  summary: countBy(triageItems, "disposition"),
  fixNowCount: triageItems.filter((item) => item.disposition === "fix-now").length,
  resolvedNowCount: triageItems.filter((item) => item.disposition === "resolved-now").length,
  trails: blockerTriageRows
});

console.log(`Built normalized candidate artifacts for ${batchSummary.length} trails.`);
for (const row of batchSummary) {
  console.log(
    `- ${row.trailId}: ${row.sectionCount} sections, ${row.facilityRecords} facility records, ${row.ruleWarningRecords} rule warnings`
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function pathExists(filePath) {
  try {
    await readdir(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root) {
  const files = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en", { numeric: true }));
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filePath);
      else if (entry.isFile()) files.push(filePath);
    }
  }

  await walk(root);
  return files;
}

async function readSections(trailRoot) {
  const sectionRoot = path.join(trailRoot, "sections");
  if (!(await pathExists(sectionRoot))) return [];
  const files = (await readdir(sectionRoot))
    .filter((fileName) => fileName.endsWith(".research.json"))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
  const sections = [];
  for (const fileName of files) {
    const sourceFile = path.join(sectionRoot, fileName);
    const data = await readJson(sourceFile);
    sections.push({ data, sourceFile: toProjectRelative(sourceFile) });
  }
  sections.sort(compareSectionRecords);
  return sections;
}

function compareSectionRecords(left, right) {
  const leftKey = sectionSortKey(left.data);
  const rightKey = sectionSortKey(right.data);
  return leftKey.localeCompare(rightKey, "en", { numeric: true });
}

function sectionSortKey(section) {
  const id = getSectionId(section);
  const sectionNumber = section.sectionNumber ?? section.section?.sectionNumber;
  if (typeof sectionNumber === "number") return String(sectionNumber).padStart(4, "0");
  if (typeof sectionNumber === "string") {
    const prefixOrder = new Map([
      ["N", "01"],
      ["M", "02"],
      ["S", "03"],
      ["K", "04"],
      ["HO", "05"]
    ]);
    const match = sectionNumber.match(/^([A-Za-z]+)(\d+)$/);
    if (match) return `${prefixOrder.get(match[1].toUpperCase()) ?? match[1]}-${match[2].padStart(4, "0")}`;
    return sectionNumber;
  }
  const idNumber = id.match(/(?:section|stage|etapp|ho)[-_]?(\d+)/i)?.[1];
  return idNumber ? idNumber.padStart(4, "0") : id;
}

function buildRouteSections(trailId, sections, handoff) {
  return {
    schemaVersion: "candidate-route-sections/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    sourceHandoff: `${trailId}/normalization-handoff.research.json`,
    sharedDecisionFile: "shared-importer-decisions.research.json",
    distancePolicy: shared.resolvedSharedDecisions.distancePolicy.canonicalFieldsForCandidateArtifacts,
    sections: sections.map(({ data, sourceFile }, index) => {
      const sectionId = getSectionId(data);
      const section = data.section ?? data;
      const distance = normalizeDistance(data.distanceKm ?? section.officialDistanceKm ?? section.distanceKm, data.mapdata);
      return prune({
        sectionId,
        sourceFile,
        order: index + 1,
        sectionNumber: data.sectionNumber ?? section.sectionNumber ?? index + 1,
        name: data.name ?? section.name ?? sectionId,
        from: data.from ?? section.from ?? null,
        to: data.to ?? section.to ?? null,
        distance,
        estimatedTime: data.estimatedTime ?? section.estimatedTime ?? null,
        difficulty: data.difficulty ?? section.difficulty ?? null,
        routeType: data.routeType ?? section.routeType ?? null,
        endpoints: normalizeEndpoints(data.endpointCoordinates),
        routeStatus: normalizeRouteStatus(data),
        sourceDirection: extractSourceDirection(data),
        routeGroupHint: inferRouteGroupHint(trailId, data, handoff),
        sourceSummary: extractRouteSourceSummary(data),
        caveats: collectStrings([
          data.sourceContradictions,
          data.openQuestions,
          data.routeGeometry?.recommendedGeometry?.caveats,
          data.mapdata?.qa
        ]).slice(0, 12)
      });
    })
  };
}

function buildGeometryIndex(trailId, sections, handoff, geojsonFiles) {
  const sectionRows = sections.map(({ data, sourceFile }) => {
    const sectionId = getSectionId(data);
    const candidateGeojsonFiles = geojsonFiles.filter((filePath) => {
      const base = path.basename(filePath, ".geojson");
      return base === sectionId || base.includes(sectionId) || sectionId.includes(base);
    });
    const blocked = isBlockedSection(handoff, sectionId);
    const sourceSummary = extractRouteSourceSummary(data);
    return {
      sectionId,
      sourceFile,
      status: blocked
        ? "blocked-for-complete-route-import"
        : candidateGeojsonFiles.length > 0
          ? "candidate-geojson-present"
          : sourceSummary.source || sourceSummary.gpxUrl || sourceSummary.geometrySource
            ? "source-geometry-needs-candidate-geojson"
            : "geometry-needs-research",
      candidateGeojsonFiles,
      sourceSummary,
      transformPolicy: handoff.geometryPlan?.transformPolicy ?? null,
      endpointContinuityIssues: filterSectionRelated(handoff.geometryPlan?.endpointContinuityIssues, sectionId),
      blockedGeometry: blocked ? filterSectionRelated(handoff.geometryPlan?.blockedGeometry, sectionId) : []
    };
  });
  return {
    schemaVersion: "candidate-route-geometry-index/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    geometryPolicy: shared.resolvedSharedDecisions.geometryPolicy,
    sourceArtifactsToUse: handoff.geometryPlan?.sourceArtifactsToUse ?? [],
    sourceArtifactsToSuppress: handoff.geometryPlan?.sourceArtifactsToSuppress ?? [],
    discoveredGeojsonFiles: geojsonFiles,
    summary: countBy(sectionRows, "status"),
    sections: sectionRows
  };
}

function buildFacilities(trailId, sections) {
  const records = [];
  for (const { data, sourceFile } of sections) {
    const sectionId = getSectionId(data);
    for (const [index, facility] of enumerate(data.facilities)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, facility, `facilities.${index}`, null));
    }
    for (const [index, water] of enumerate(data.waterSources)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, water, `waterSources.${index}`, "water"));
    }
    for (const endpoint of ["start", "end"]) {
      for (const [index, access] of enumerate(data.commuteAccess?.[endpoint])) {
        records.push(normalizeFacility(trailId, sectionId, sourceFile, access, `commuteAccess.${endpoint}.${index}`, "transit"));
      }
    }
    for (const [index, parking] of enumerate(data.commuteAccess?.parkingAndTrailheadAccess)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, parking, `commuteAccess.parkingAndTrailheadAccess.${index}`, "parking"));
    }
    for (const [index, row] of enumerate(data.importRows)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, row, `importRows.${index}`, null, "import"));
    }
    for (const [index, row] of enumerate(data.pending)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, row, `pending.${index}`, null, "pending-review"));
    }
    for (const [index, row] of enumerate(data.suppressions)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, row, `suppressions.${index}`, null, "suppress"));
    }
  }

  records.sort((left, right) => left.facilityId.localeCompare(right.facilityId, "en", { numeric: true }));
  return {
    schemaVersion: "candidate-facilities/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    facilityStatePolicy: shared.resolvedSharedDecisions.facilityStatePolicy,
    summary: {
      totalRecords: records.length,
      byState: countBy(records, "state"),
      byPrimaryType: countBy(records, "primaryType")
    },
    records
  };
}

function buildRuleWarnings(trailId, sections, handoff) {
  const records = [];
  for (const { data, sourceFile } of sections) {
    const sectionId = getSectionId(data);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "rulesAndSafety", data.rulesAndSafety);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "campingAndFire", data.campingAndFire);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "conditionReports", data.conditionReports);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "sourceContradictions", data.sourceContradictions);
    addVikingSuppressionWarnings(records, trailId, sectionId, sourceFile, data);
  }

  addStructuredWarnings(records, trailId, null, `${trailId}/normalization-handoff.research.json`, "handoff.ruleWarningPlan", handoff.ruleWarningPlan);
  records.sort((left, right) => left.warningId.localeCompare(right.warningId, "en", { numeric: true }));

  return {
    schemaVersion: "candidate-rule-warnings/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    ruleWarningPolicy: shared.resolvedSharedDecisions.ruleWarningPolicy,
    summary: {
      totalRecords: records.length,
      byCategory: countBy(records, "category"),
      byUserFacingEligibility: countBy(records, "userFacingEligibility")
    },
    records
  };
}

function buildImportReport(trailId, handoff, routeSections, geometryIndex, facilities, ruleWarnings) {
  const minimumArtifacts = shared.resolvedSharedDecisions.candidateArtifactLayout.minimumArtifacts;
  const manifestEntry = trailManifestById.get(trailId);
  const blockers = normalizeBlockers(handoff.blockers);
  const openDecisions = normalizeOpenDecisions(handoff.openDecisionsForUser);
  const blockerTriage = triageBlockers(trailId, blockers, openDecisions);
  return {
    schemaVersion: "candidate-import-report/v1",
    trailId,
    lastUpdated,
    status: "candidate-artifacts-generated-research-only",
    runtimeImportApproved: false,
    sourceHandoff: `${trailId}/normalization-handoff.research.json`,
    artifactFiles: minimumArtifacts,
    manifestSectionFiles: manifestEntry?.files?.sectionFiles ?? null,
    generatedCounts: {
      routeSections: routeSections.sections.length,
      geometrySections: geometryIndex.sections.length,
      geometrySectionsWithCandidateGeojson: geometryIndex.sections.filter((section) => section.candidateGeojsonFiles.length > 0).length,
      facilities: facilities.records.length,
      ruleWarnings: ruleWarnings.records.length
    },
    blockers,
    openDecisions,
    blockerTriage,
    triageSummary: countBy(blockerTriage, "disposition"),
    fixesAppliedNow: blockerTriage.filter((item) => item.disposition === "resolved-now"),
    fixNowBeforeRuntimeImport: blockerTriage.filter((item) => item.disposition === "fix-now"),
    runtimeSchemaNeeded: blockerTriage.filter((item) => item.disposition === "runtime-schema-needed"),
    deferredBeforeRuntimeImport: blockerTriage.filter((item) =>
      ["external-source-approval", "defer-publication-time", "runtime-integration-task", "scope-limitation"].includes(item.disposition)
    ),
    validationChecklist: handoff.validationChecklist ?? [],
    unresolvedBeforeRuntimeImport: blockerTriage
      .filter((item) => item.disposition !== "resolved-now")
      .map((item) => `${item.disposition}: ${item.details}`),
    nextActions: [
      "Handle fixNowBeforeRuntimeImport first unless the linked item truly needs external data.",
      "Keep pending-review and suppress facility states out of runtime output.",
      "Run final GIS overlays and live publication checks before user-facing rule warnings.",
      "Do not write app runtime source data from this report without an explicit runtime integration task."
    ]
  };
}

function normalizeOpenDecisions(decisions) {
  if (!Array.isArray(decisions)) return [];
  return decisions.map((decision, index) => {
    if (typeof decision === "string") {
      return {
        id: `decision-${index + 1}`,
        details: decision
      };
    }
    return prune({
      id: decision.id ?? decision.scope ?? `decision-${index + 1}`,
      status: decision.status ?? null,
      details: decision.description ?? decision.details ?? decision.decision ?? decision.question ?? compactJson(decision)
    });
  });
}

function triageBlockers(trailId, blockers, openDecisions) {
  const blockerItems = blockers.map((blocker) => ({
    itemType: "blocker",
    sourceId: blocker.id,
    status: blocker.status,
    details: blocker.details
  }));
  const decisionItems = openDecisions.map((decision) => ({
    itemType: "open-decision",
    sourceId: decision.id,
    status: decision.status ?? "open-decision",
    details: decision.details
  }));

  return [...blockerItems, ...decisionItems].map((item, index) => ({
    id: `${item.itemType}-${index + 1}`,
    ...item,
    ...classifyTriageItem(trailId, item)
  }));
}

function classifyTriageItem(trailId, item) {
  const text = `${item.sourceId} ${item.status} ${item.details}`.toLowerCase();

  if (text.includes("readme.md status is older")) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Updated Padjelantaleden README status to reflect completed 10-section research and generated candidate artifacts."
    };
  }
  if (
    /pending|suppress|hidden review|stored before verification|facility state|not appear as normal|out of public normalized facilities/.test(text)
  ) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Facilities now carry explicit normal, pending-review, and suppress states in normalized-candidate/facilities.research.json; the checker enforces normalized candidate types and preserved rawTypes."
    };
  }
  if (
    /endpoint snapping|snap policy|segment-break|multilinestring|k4-to-k5|official coastal network gap|stage 8-to-stage 9|stage 21 gap|one chain|separate importable chains|partial\/self-navigation|route model is represented|do not bridge|do not.*snap|do not.*auto-route/.test(
      text
    )
  ) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Shared importer decisions now require preserving source endpoints and explicit gaps/connections instead of silent snapping or invented linework."
    };
  }
  if (
    /parking\/transit|parking and transit|transit choice|side-service radius|side-service\/access|access metadata radius|commercial\/customer-only services|weak transit/.test(
      text
    )
  ) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Parking/transit and access services are normalized as candidate facility/access records with pending/suppress states and live-check caveats."
    };
  }
  if (/generated app outputs|source hiking runtime data|intentionally not been edited|no runtime data has been imported/.test(text)) {
    return {
      disposition: "runtime-integration-task",
      owner: "runtime-import",
      action: "Leave runtime source/generated data untouched until the separate runtime import task is explicitly started."
    };
  }
  if (
    /officialdistancekm|computedgeometrydistancekm|source-direction|schema|runtime schema|app schema|connector model|typed connector|route-group|route groups|aliases|alternate route groups|tail|source direction metadata/.test(
      text
    )
  ) {
    return {
      disposition: "runtime-schema-needed",
      owner: "runtime-importer",
      action: "Candidate artifacts preserve the needed metadata; runtime importer/schema support is needed before public app import."
    };
  }
  if (/source policy|licens|permission|api key|trafiklab|resrobot|approve or reject|source terms|official source|authoritative.*ids/.test(text)) {
    return {
      disposition: "external-source-approval",
      owner: "source-review",
      action: "Resolve source terms, API access, or official-source approval before relying on this item for runtime import."
    };
  }
  if (/gis|overlay|protected-area|water-protection|boundary|rule-warning granularity|rule granularity|clip|clipping|subsegment/.test(text)) {
    return {
      disposition: "fix-now",
      owner: "candidate-gis",
      action: "Run GIS overlays against selected candidate geometry and replace broad warnings with scoped section/subsegment/facility warnings where possible."
    };
  }
  if (
    /publication|live|currentness|recheck|fire|timetable|opening|seasonal|closure|reroute|forestry|hunting|bridge notices|water reliability|quality|boat operators|business hours|acute|service live|transit schedules|availability|fees|passability/.test(
      text
    )
  ) {
    return {
      disposition: "defer-publication-time",
      owner: "publication-check",
      action: "Keep as a publication-time checklist item because the underlying fact can change."
    };
  }
  if (/explicit import task|runtime integration still needs|blocked-until-explicit-import-task/.test(text)) {
    return {
      disposition: "runtime-integration-task",
      owner: "runtime-import",
      action: "Handle when the candidate artifacts are selected for runtime import."
    };
  }
  if (/geometry|geojson|gpx|linework|densification|split|reverse|endpoint connector|endpoint-policy|topology|variant|gap|candidate implementation|visual qa|whole-trail section model|southern endpoint/.test(text)) {
    return {
      disposition: trailId === "nordkalottleden" && /whole-trail|southern endpoint|variants around/.test(text) ? "scope-limitation" : "fix-now",
      owner: "candidate-geometry",
      action:
        trailId === "nordkalottleden" && /whole-trail|southern endpoint|variants around/.test(text)
          ? "Keep the first import scope to the researched 12-section model and defer alternate whole-trail variants."
          : "Build or refine candidate GeoJSON, connector records, endpoint policy, and route topology before runtime import."
    };
  }
  if (/dedupe|taxonomy|cluster|poi|pois|facility|hut|shelter|water|toilet|shop|sauna|waste|viewpoint|minor rest|informal campsites|osm-only/.test(text)) {
    return {
      disposition: "fix-now",
      owner: "candidate-facilities",
      action: "Run the candidate facility dedupe/cluster pass, attach child amenities to parents where appropriate, and leave weak records pending/suppressed."
    };
  }
  if (/no single official source|multiple candidate section models|not whole-trail|researched .* model/.test(text)) {
    return {
      disposition: "scope-limitation",
      owner: "candidate-scope",
      action: "Keep the candidate import scoped to the researched model until a broader official section model is established."
    };
  }

  return {
    disposition: "fix-now",
    owner: "candidate-review",
    action: "Review and resolve in candidate artifacts before runtime import unless a later pass proves it needs external data."
  };
}

function normalizeFacility(trailId, sectionId, sourceFile, raw, sourceCollection, fallbackType, forcedAction) {
  const rawTypes = collectRawFacilityTypes(raw, fallbackType);
  const candidateTypes = normalizeTypes(rawTypes);
  const action = normalizeImportAction(
    forcedAction ??
      raw.importAction ??
      raw.importDecision ??
      raw.importRecommendation ??
      raw.importTreatment ??
      raw.decision
  );
  const coordinates = normalizeCoordinates(raw);
  const idBase = raw.id ?? `${sectionId}-${sourceCollection}-${raw.name ?? raw.stopName ?? raw.type ?? "facility"}`;
  return prune({
    facilityId: slugify(idBase),
    trailId,
    sectionId,
    sourceFile,
    sourceCollection,
    state: importActionToState(action),
    importAction: action,
    primaryType: candidateTypes[0] ?? "service",
    candidateTypes,
    rawTypes,
    name: raw.name ?? raw.stopName ?? raw.label ?? null,
    coordinatesLatLon: coordinates,
    coordinateSource: raw.coordinateSource ?? null,
    confidence: raw.confidence ?? null,
    description: raw.description ?? raw.notes ?? raw.caveat ?? null,
    caveats: collectStrings([raw.caveats, raw.caveat, raw.pendingReason, raw.suppressionReason]),
    routeProximity: raw.routeProximity ?? proximityFromRaw(raw),
    chainageKmApprox: raw.chainageKmApprox ?? raw.alongRouteKm ?? raw.routeKm ?? raw.routeKmApprox ?? null,
    sourceUrls: normalizeSourceUrls(raw),
    sourceRefs: normalizeSourceRefs(raw),
    clusterId: raw.clusterId ?? null,
    originalId: raw.originalId ?? null,
    alternateRouteRefs: raw.alternateRouteRefs ?? null,
    subfacilities: raw.subfacilities ?? raw.subpoints ?? null,
    normalizationNotes: raw.normalizationNotes ?? raw.importNotes ?? null
  });
}

function collectRawFacilityTypes(raw, fallbackType) {
  const rawTypes = unique(
    [
      raw.normalizedCandidateTypes,
      raw.candidateTypes,
      raw.normalizedCandidateType,
      raw.candidateType,
      raw.normalizedType,
      raw.type,
      fallbackType
    ].flatMap((value) => (Array.isArray(value) ? value : value ? [String(value)] : []))
  );
  return rawTypes.length > 0 ? rawTypes : ["service"];
}

function normalizeTypes(rawTypes) {
  const mapped = rawTypes.flatMap((value) => {
    const clean = String(value).trim().toLowerCase();
    if (!clean) return [];
    if (clean.includes("bus") || clean.includes("train") || clean.includes("transit") || clean.includes("station")) return ["transit"];
    if (clean.includes("ferry") || clean.includes("boat") || clean.includes("helicopter") || clean.includes("pickup") || clean.includes("dropoff")) return ["transit"];
    if (clean.includes("parking") || clean.includes("parkering")) return ["parking"];
    if (clean.includes("water") || clean.includes("vatten") || clean.includes("tap") || clean.includes("well") || clean.includes("pump")) {
      return clean.includes("natural") || clean.includes("lake") || clean.includes("stream") || clean.includes("spring") ? ["natural-water"] : ["water"];
    }
    if (clean.includes("shelter") || clean.includes("vindskydd") || clean.includes("rest-hut") || clean.includes("wilderness-hut")) return ["shelter"];
    if (clean.includes("hut") || clean.includes("cabin") || clean.includes("lodging") || clean.includes("hostel") || clean.includes("bed-and-breakfast") || clean.includes("cottage")) {
      return clean.includes("emergency") || clean.includes("rest") || clean.includes("wilderness") ? ["shelter"] : ["lodging"];
    }
    if (clean.includes("fire") || clean.includes("grill") || clean.includes("eld")) return ["fireplace"];
    if (clean.includes("toilet") || clean.includes("wc") || clean.includes("toalett")) return ["toilet"];
    if (clean.includes("waste") || clean.includes("recycling") || clean.includes("trash") || clean.includes("litter")) return ["waste"];
    if (clean.includes("swim") || clean.includes("bad") || clean.includes("bathing") || clean.includes("beach")) return ["swimming"];
    if (clean.includes("heritage") || clean.includes("ruin") || clean.includes("kultur") || clean.includes("historic") || clean.includes("archaeolog") || clean.includes("church") || clean.includes("museum") || clean.includes("mill") || clean.includes("cemetery")) return ["heritage"];
    if (clean.includes("view")) return ["viewpoint"];
    if (clean.includes("attraction") || clean.includes("poi") || clean.includes("sight") || clean.includes("nature") || clean.includes("reserve") || clean.includes("geolog") || clean.includes("peak") || clean.includes("wetland") || clean.includes("landmark")) return ["attraction"];
    if (clean.includes("informal") && clean.includes("tent")) return ["informal-tenting"];
    if (clean.includes("tent") || clean.includes("camp")) return ["camping"];
    if (clean.includes("food") || clean.includes("cafe") || clean.includes("shop") || clean.includes("grocery") || clean.includes("restaurant") || clean.includes("resupply") || clean.includes("provision") || clean.includes("bar")) return ["food"];
    if (clean.includes("phone")) return ["emergency-phone"];
    if (clean.includes("hazard") || clean.includes("warning") || clean.includes("bridge") || clean.includes("ford") || clean.includes("crossing") || clean.includes("boardwalk")) return ["hazard"];
    if (clean.includes("junction") || clean.includes("trailhead") || clean.includes("connector") || clean.includes("route") || clean.includes("access") || clean.includes("endpoint")) return ["trail-junction"];
    if (clean.includes("rest") || clean.includes("picnic") || clean.includes("bench")) return ["rest-area"];
    if (clean.includes("information") || clean.includes("service") || clean.includes("rental") || clean.includes("sauna") || clean.includes("shower") || clean.includes("kitchen") || clean.includes("wifi") || clean.includes("fuel")) return ["service"];
    if (clean === "none" || clean.includes("absence") || clean.includes("negative") || clean.includes("metadata") || clean.includes("context") || clean.includes("note")) return ["service"];
    return ["service"];
  });
  return unique(mapped);
}

function normalizeImportAction(value) {
  if (value == null || value === "") return "pending-review";
  const clean = String(value).toLowerCase();
  if (clean.includes("suppress") || clean.includes("do not import") || clean.includes("metadata only")) return "suppress";
  if (clean.includes("pending") || clean.includes("review") || clean.includes("verify")) return "pending-review";
  if (clean.includes("access")) return "import-as-access";
  if (clean.includes("warning")) return "import-as-rule-warning";
  if (clean.includes("attach") || clean.includes("cluster") || clean.includes("parent")) return "attach-to-parent";
  if (clean.includes("side")) return "side-trip-metadata";
  if (clean.includes("import") || clean === "normal") return "import";
  return clean.replaceAll(" ", "-");
}

function importActionToState(action) {
  if (["import", "import-as-access", "import-as-rule-warning", "attach-to-parent"].includes(action)) return "normal";
  if (action === "suppress") return "suppress";
  return "pending-review";
}

function addStructuredWarnings(records, trailId, sectionId, sourceFile, sourceCollection, value) {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => addWarningRecord(records, trailId, sectionId, sourceFile, `${sourceCollection}.${index}`, item));
    return;
  }
  if (typeof value === "string") {
    addWarningRecord(records, trailId, sectionId, sourceFile, sourceCollection, { summary: value });
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["sourceUrls", "sources", "url", "sourceUrl"].includes(key)) continue;
    if (child == null || child === "" || (Array.isArray(child) && child.length === 0)) continue;
    addWarningRecord(records, trailId, sectionId, sourceFile, `${sourceCollection}.${key}`, child, value);
  }
}

function addWarningRecord(records, trailId, sectionId, sourceFile, sourceCollection, value, parent = {}) {
  const category = sourceCollection.split(".").slice(0, 2).join(".");
  const summary = summarizeWarning(value);
  if (!summary) return;
  records.push(
    prune({
      warningId: slugify(`${trailId}-${sectionId ?? "trail"}-${sourceCollection}`),
      trailId,
      sectionId,
      sourceFile,
      sourceCollection,
      category,
      title: titleFromSourceCollection(sourceCollection),
      summary,
      userFacingEligibility: inferUserFacingEligibility(sourceCollection, summary),
      sourceUrls: normalizeSourceUrls(value).length > 0 ? normalizeSourceUrls(value) : normalizeSourceUrls(parent),
      confidence: value?.confidence ?? parent?.confidence ?? null,
      importAction: inferWarningImportAction(sourceCollection, summary)
    })
  );
}

function addVikingSuppressionWarnings(records, trailId, sectionId, sourceFile, data) {
  for (const [index, row] of enumerate([...(data.pending ?? []), ...(data.suppressions ?? [])])) {
    const text = `${row.type ?? ""} ${row.name ?? ""} ${row.notes ?? ""}`.toLowerCase();
    if (!/(unsafe|non-potable|warning|condition|closure|route|fire|tent|camp|water|private|duplicate|overlap)/.test(text)) continue;
    addWarningRecord(records, trailId, sectionId, sourceFile, `facilityStateWarnings.${index}`, {
      summary: row.notes ?? row.name,
      confidence: row.confidence,
      sourceUrls: row.sourceUrls
    });
  }
}

function summarizeWarning(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(summarizeWarning).filter(Boolean).join(" | ");
  if (typeof value !== "object") return String(value);
  return (
    value.summary ??
    value.details ??
    value.finding ??
    value.notes ??
    value.description ??
    value.importImpact ??
    value.caveat ??
    compactJson(value)
  );
}

function compactJson(value) {
  const text = JSON.stringify(value);
  return text && text !== "{}" ? text : null;
}

function inferUserFacingEligibility(sourceCollection, summary) {
  const text = `${sourceCollection} ${summary}`.toLowerCase();
  if (/(import|normalization|source|gpx|debug|schema)/.test(text) && !/(warning|unsafe|closure|fire|dog|camp|water|hazard|rule)/.test(text)) {
    return "import-maintenance-only";
  }
  if (/(fire|dog|camp|water|closure|reroute|hazard|hunt|protected|reserve|unsafe|private|season|boat|ferry)/.test(text)) {
    return "candidate-hiker-facing";
  }
  return "needs-review";
}

function inferWarningImportAction(sourceCollection, summary) {
  return inferUserFacingEligibility(sourceCollection, summary) === "import-maintenance-only" ? "suppress" : "pending-review";
}

function titleFromSourceCollection(sourceCollection) {
  return sourceCollection
    .split(".")
    .filter((part) => Number.isNaN(Number(part)))
    .slice(-1)[0]
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ");
}

function normalizeDistance(value, mapdata) {
  const result = {
    officialDistanceKm: null,
    computedGeometryDistanceKm: null,
    displayDistanceKm: null,
    distanceCaveats: []
  };
  if (typeof value === "number") {
    result.officialDistanceKm = value;
    result.displayDistanceKm = value;
    return result;
  }
  if (typeof mapdata?.officialDistanceKm === "number") {
    result.officialDistanceKm = mapdata.officialDistanceKm;
    result.displayDistanceKm = mapdata.officialDistanceKm;
  }
  if (typeof mapdata?.computedDistanceKm === "number") result.computedGeometryDistanceKm = mapdata.computedDistanceKm;
  if (!value || typeof value !== "object") return result;

  const official = firstNumber([
    value.official,
    value.value,
    value.preferredOfficialKm,
    value.normalizedApproxWalkingKm,
    value.officialDistanceKm,
    value.displayDistanceKm
  ]);
  const computed = firstNumber([
    value.computedGeometryKm,
    value.computedGeometryDistanceKm,
    value.computedNaturkartanGpx,
    value.osmComputed,
    value.naturkartan,
    value.computed
  ]);
  result.officialDistanceKm = official ?? result.officialDistanceKm;
  result.computedGeometryDistanceKm = computed ?? result.computedGeometryDistanceKm;
  result.displayDistanceKm = result.officialDistanceKm ?? result.computedGeometryDistanceKm;
  result.distanceCaveats = collectStrings([
    value.distanceCaveat,
    value.caveat,
    value.confidence,
    value.sourcePolicy,
    value.otherClaims,
    value.reportedValues,
    value.alternates,
    value.displayRecommendation
  ]);
  return result;
}

function firstNumber(values) {
  for (const value of values.flat()) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const match = value.match(/\d+(?:[.,]\d+)?/);
      if (match) return Number(match[0].replace(",", "."));
    }
  }
  return null;
}

function normalizeEndpoints(endpointCoordinates) {
  if (!endpointCoordinates || typeof endpointCoordinates !== "object") return null;
  return Object.fromEntries(
    Object.entries(endpointCoordinates).map(([key, endpoint]) => [
      key,
      prune({
        label: endpoint.label ?? null,
        coordinatesLatLon: normalizeCoordinatePair(endpoint.coordinates),
        source: endpoint.source ?? null,
        confidence: endpoint.confidence ?? null,
        caveats: collectStrings(endpoint.caveats)
      })
    ])
  );
}

function normalizeRouteStatus(data) {
  const readiness = data.importReadiness;
  if (typeof readiness === "string") return readiness;
  if (readiness?.status) return readiness.status;
  if (data.status) return data.status;
  if (data.mapdata?.canDraw === true) return "mapdata-can-draw";
  return "research-ready";
}

function extractSourceDirection(data) {
  return (
    data.routeGeometry?.recommendedGeometry?.directionRelativeToOfficialOrder ??
    data.routeGeometry?.recommendedGeometry?.sourceDirection ??
    data.mapdata?.directionRelativeToOfficialOrder ??
    null
  );
}

function inferRouteGroupHint(trailId, data, handoff) {
  if (trailId === "hoglandsleden") return "topology-review-required";
  if (trailId === "vikingaleden" && data.mapdata?.overlapsExistingRoute) return "mainline-overlap-alias";
  if (isBlockedSection(handoff, getSectionId(data))) return "partial-or-blocked";
  return "mainline";
}

function extractRouteSourceSummary(data) {
  const routeGeometry = data.routeGeometry ?? {};
  const recommended = routeGeometry.recommendedGeometry ?? {};
  const primaryGeometry = routeGeometry.primaryGeometry ?? {};
  const primaryCandidate = routeGeometry.primaryCandidate ?? {};
  const primary = routeGeometry.primary ?? {};
  const recommendedImportGeometry = routeGeometry.recommendedGeometrySourceForImport ?? {};
  const officialGeometry = routeGeometry.officialGeometry ?? {};
  const firstOfficialSource = Array.isArray(routeGeometry.officialSources) ? routeGeometry.officialSources[0] : null;
  const firstPublicGeometrySource = Array.isArray(routeGeometry.officialOrPublicGeometrySources)
    ? routeGeometry.officialOrPublicGeometrySources[0]
    : null;
  const mapdata = data.mapdata ?? {};
  return prune({
    source:
      recommended.source ??
      routeGeometry.recommendedSource ??
      primaryGeometry.provider ??
      primaryGeometry.source ??
      primaryCandidate.source ??
      primary.sourceName ??
      recommendedImportGeometry.source ??
      (officialGeometry.type ? `official ${officialGeometry.type}` : null) ??
      firstOfficialSource?.type ??
      firstPublicGeometrySource?.source ??
      mapdata.geometrySource ??
      null,
    sourceUrl:
      recommended.sourceUrl ??
      routeGeometry.gpxUrl ??
      primaryGeometry.url ??
      primaryCandidate.url ??
      primary.url ??
      recommendedImportGeometry.url ??
      officialGeometry.url ??
      firstOfficialSource?.url ??
      firstPublicGeometrySource?.url ??
      mapdata.gpxUrl ??
      null,
    gpxUrl:
      routeGeometry.gpxUrl ??
      (primaryGeometry.type?.toLowerCase?.().includes("gpx") ? primaryGeometry.url : null) ??
      (primary.sourceFormat?.toLowerCase?.() === "gpx" ? primary.url : null) ??
      (officialGeometry.type?.toLowerCase?.() === "gpx" ? officialGeometry.url : null) ??
      mapdata.gpxUrl ??
      null,
    classification:
      recommended.classification ??
      routeGeometry.geometryQuality ??
      routeGeometry.navigationGrade ??
      primary.geometryGrade ??
      primaryGeometry.geometryQuality ??
      primaryGeometry.grade ??
      recommendedImportGeometry.grade ??
      officialGeometry.grade ??
      firstOfficialSource?.assessment ??
      routeGeometry.status ??
      null,
    confidence:
      recommended.confidence ??
      primaryGeometry.confidence ??
      primaryCandidate.confidence ??
      primary.confidence ??
      recommendedImportGeometry.confidence ??
      officialGeometry.confidence ??
      null,
    canDraw: mapdata.canDraw ?? null,
    pointCount: mapdata.pointCount ?? primary.pointCount ?? officialGeometry.trackPoints ?? null,
    computedDistanceKm:
      mapdata.computedDistanceKm ??
      primaryGeometry.computedDistanceKm ??
      primary.computedDistanceKm?.normalized ??
      primary.computedDistanceKm ??
      recommendedImportGeometry.computedLengthKm ??
      officialGeometry.computedDistanceKm ??
      routeGeometry.metrics?.naturkartanGpx?.computedDistanceKm ??
      routeGeometry.metrics?.naturkartanApi?.computedDistanceKm ??
      null,
    overlapsExistingRoute: mapdata.overlapsExistingRoute ?? null
  });
}

function isBlockedSection(handoff, sectionId) {
  return JSON.stringify(handoff.sectionCoverage?.blockedSections ?? handoff.geometryPlan?.blockedGeometry ?? "").includes(sectionId);
}

function filterSectionRelated(value, sectionId) {
  if (!value) return [];
  const rows = Array.isArray(value) ? value : [value];
  return rows.filter((row) => JSON.stringify(row).includes(sectionId));
}

function normalizeBlockers(blockers) {
  if (!blockers) return [];
  if (Array.isArray(blockers)) {
    return blockers.map((blocker, index) =>
      typeof blocker === "string"
        ? { id: `blocker-${index + 1}`, status: "unresolved", details: blocker }
        : { id: blocker.id ?? blocker.scope ?? `blocker-${index + 1}`, status: blocker.status ?? "unresolved", details: blocker.description ?? blocker.details ?? compactJson(blocker) }
    );
  }
  if (typeof blockers !== "object") return [{ id: "blocker-1", status: "unresolved", details: String(blockers) }];
  return Object.entries(blockers).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value]).map((item, index) =>
      typeof item === "string"
        ? { id: `${key}-${index + 1}`, status: key, details: item }
        : { id: item.id ?? `${key}-${index + 1}`, status: item.status ?? key, details: item.description ?? item.details ?? compactJson(item) }
    )
  );
}

function normalizeCoordinates(raw) {
  if (Array.isArray(raw.coordinates)) return raw.coordinates;
  if (Array.isArray(raw.coords)) return raw.coords;
  if (typeof raw.lat === "number" && typeof raw.lon === "number") return [raw.lat, raw.lon];
  if (typeof raw.latitude === "number" && typeof raw.longitude === "number") return [raw.latitude, raw.longitude];
  return null;
}

function normalizeCoordinatePair(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && typeof value.lat === "number" && typeof value.lon === "number") return [value.lat, value.lon];
  if (value && typeof value === "object" && typeof value.latitude === "number" && typeof value.longitude === "number") {
    return [value.latitude, value.longitude];
  }
  return null;
}

function proximityFromRaw(raw) {
  const meters = raw.routeProximityMeters ?? raw.routeProximityMetersApprox ?? raw.proximityMetersApprox;
  const km = raw.routeProximityKm ?? raw.distanceFromEndpointKm;
  if (meters == null && km == null) return null;
  return prune({
    distanceMetersApprox: meters ?? (typeof km === "number" ? Math.round(km * 1000) : null),
    distanceKmApprox: km ?? null
  });
}

function normalizeSourceUrls(raw) {
  return unique(
    [
      raw.sourceUrls,
      raw.sourceUrl,
      raw.sources?.filter?.((source) => typeof source === "string" && source.startsWith("http")),
      raw.url
    ]
      .flat(Infinity)
      .filter((value) => typeof value === "string" && value.startsWith("http"))
  );
}

function normalizeSourceRefs(raw) {
  return unique(
    [raw.sources, raw.sourceRefs]
      .flat(Infinity)
      .filter((value) => typeof value === "string" && !value.startsWith("http"))
  );
}

function collectStrings(values) {
  const out = [];
  function visit(value) {
    if (value == null || value === "") return;
    if (typeof value === "string") {
      out.push(value);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      if (value.summary || value.details || value.description || value.finding || value.notes) {
        visit(value.summary ?? value.details ?? value.description ?? value.finding ?? value.notes);
      }
    }
  }
  visit(values);
  return unique(out);
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function getSectionId(data) {
  return data.sectionId ?? data.id ?? data.section?.id;
}

function enumerate(value) {
  return Array.isArray(value) ? value.map((item, index) => [index, item]) : [];
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

function prune(value) {
  if (Array.isArray(value)) return value.map(prune).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value)
    .map(([key, child]) => [key, prune(child)])
    .filter(([, child]) => child !== null && child !== undefined && !(Array.isArray(child) && child.length === 0));
  return Object.fromEntries(entries);
}

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
