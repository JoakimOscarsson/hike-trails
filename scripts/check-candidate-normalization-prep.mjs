import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const candidateRoot = path.join(projectRoot, "data/research/candidate-trails");

const expectedDecisionKeys = [
  "candidateArtifactLayout",
  "distancePolicy",
  "geometryPolicy",
  "endpointContinuityPolicy",
  "routeTopologyPolicy",
  "partialAndSelfNavigationPolicy",
  "directionReversalPolicy",
  "facilityStatePolicy",
  "ruleWarningPolicy",
  "overlapDedupePolicy",
  "sourceAndCurrentnessPolicy"
];

const expectedQualityCheckIds = [
  "json-and-geojson-parse",
  "handoff-contract",
  "section-coverage",
  "shared-decision-coverage",
  "existing-app-consistency",
  "runtime-write-safety"
];

const expectedCandidateArtifactFiles = [
  "route-sections.research.json",
  "route-geometry-index.research.json",
  "facilities.research.json",
  "rule-warnings.research.json",
  "import-report.research.json"
];

const expectedSupplementalCandidateArtifactFiles = ["route-topology.research.json"];

const allowedCandidateFacilityTypes = new Set([
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
  "informal-tenting"
]);

const allowedFacilityStates = new Set(["normal", "pending-review", "suppress"]);
const allowedTriageDispositions = new Set([
  "resolved-now",
  "fix-now",
  "runtime-schema-needed",
  "external-source-approval",
  "defer-publication-time",
  "runtime-integration-task",
  "scope-limitation"
]);

const errors = [];
const warnings = [];

function addError(scope, message) {
  errors.push({ scope, message });
}

function addWarning(scope, message) {
  warnings.push({ scope, message });
}

function displayPath(filePath) {
  const relative = path.relative(projectRoot, filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    addError(displayPath(filePath), `Cannot parse JSON: ${error.message}`);
    return undefined;
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root) {
  const files = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(filePath);
      } else if (entry.isFile()) {
        files.push(filePath);
      }
    }
  }

  await walk(root);
  return files;
}

function collectNumbers(value) {
  const numbers = [];

  function visit(node) {
    if (typeof node === "number" && Number.isInteger(node) && node >= 0) {
      numbers.push(node);
      return;
    }
    if (Array.isArray(node)) {
      numbers.push(node.length);
      for (const item of node) visit(item);
      return;
    }
    if (!isObject(node)) return;
    for (const child of Object.values(node)) visit(child);
  }

  visit(value);
  return numbers;
}

function validateRequiredKeys(scope, value, requiredKeys) {
  for (const key of requiredKeys) {
    if (!(key in value)) addError(scope, `Missing required key "${key}"`);
  }
}

function validateUnique(scope, label, values) {
  const seen = new Map();
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) {
      addError(scope, `${label} contains a missing or non-string ID`);
      continue;
    }
    seen.set(value, (seen.get(value) ?? 0) + 1);
  }
  for (const [value, count] of seen) {
    if (count > 1) addError(scope, `${label} contains duplicate ID "${value}"`);
  }
}

async function validateJsonParse() {
  const files = await walkFiles(candidateRoot);
  let checked = 0;
  for (const file of files) {
    if (!/\.(json|geojson)$/.test(file)) continue;
    checked += 1;
    await readJson(file);
  }
  return checked;
}

function validateScopeLists(prep, manifest, shared) {
  const prepIncluded = prep?.scope?.includedTrails ?? [];
  const manifestIncluded = (manifest?.trails ?? [])
    .filter((trail) => trail.readiness === "normalization-prep")
    .map((trail) => trail.id);
  const sharedIncluded = shared?.scope?.includedTrails ?? [];
  const sharedTrailSpecific = Object.keys(shared?.trailSpecificDecisions ?? {});

  if (!arraysEqual(prepIncluded, manifestIncluded)) {
    addError("candidate scope", "normalization-prep includedTrails does not match manifest normalization-prep trails");
  }
  if (!arraysEqual(prepIncluded, sharedIncluded)) {
    addError("candidate scope", "shared-importer-decisions includedTrails does not match normalization-prep");
  }
  if (!arraysEqual(prepIncluded, sharedTrailSpecific)) {
    addError("candidate scope", "shared-importer-decisions trailSpecificDecisions keys do not match normalization-prep");
  }
}

async function validateHandoffs(prep, manifest) {
  const requiredKeys = prep?.handoffFileContract?.requiredTopLevelKeys ?? [];
  const trailsById = new Map((manifest?.trails ?? []).map((trail) => [trail.id, trail]));
  const includedTrails = prep?.scope?.includedTrails ?? [];
  const rows = [];

  for (const trailId of includedTrails) {
    const trail = trailsById.get(trailId);
    const handoffPath = path.join(candidateRoot, trailId, "normalization-handoff.research.json");
    const handoff = await readJson(handoffPath);
    if (!handoff) continue;

    const scope = displayPath(handoffPath);
    validateRequiredKeys(scope, handoff, requiredKeys);

    if (handoff.schemaVersion !== prep.handoffFileContract.schemaVersion) {
      addError(scope, `schemaVersion must be ${prep.handoffFileContract.schemaVersion}`);
    }
    if (handoff.trailId !== trailId) addError(scope, `trailId "${handoff.trailId}" does not match folder "${trailId}"`);
    if (typeof handoff.status !== "string" || !handoff.status.trim()) addError(scope, "status must be a non-empty string");
    if (!Array.isArray(handoff.openDecisionsForUser)) addError(scope, "openDecisionsForUser must be an array");
    if (!Array.isArray(handoff.validationChecklist)) addError(scope, "validationChecklist must be an array");
    if (!Array.isArray(handoff.blockers) && !isObject(handoff.blockers)) addError(scope, "blockers must be an array or structured object");
    for (const key of ["geometryPlan", "facilityPlan", "ruleWarningPlan", "importOrder"]) {
      if (!isObject(handoff[key]) && !Array.isArray(handoff[key])) addError(scope, `${key} must be structured data`);
    }

    const sectionsPath = path.join(candidateRoot, trailId, "sections");
    const sectionFiles = (await pathExists(sectionsPath))
      ? (await readdir(sectionsPath)).filter((fileName) => fileName.endsWith(".research.json"))
      : [];
    const actualSectionCount = sectionFiles.length;
    const manifestSectionCount = trail?.files?.sectionFiles;
    if (actualSectionCount !== manifestSectionCount) {
      addError(scope, `actual section file count ${actualSectionCount} does not match manifest ${manifestSectionCount}`);
    }

    const coverageNumbers = collectNumbers(handoff.sectionCoverage);
    if (!coverageNumbers.includes(actualSectionCount)) {
      addError(scope, `sectionCoverage does not contain actual section count ${actualSectionCount}`);
    }

    rows.push({
      trailId,
      status: handoff.status,
      sectionFiles: actualSectionCount,
      openDecisions: handoff.openDecisionsForUser?.length ?? 0
    });
  }

  return rows;
}

function validateSharedDecisions(shared) {
  if (shared?.status !== "complete-for-candidate-normalization") {
    addError("shared-importer-decisions", "status must be complete-for-candidate-normalization");
  }
  if (shared?.scope?.runtimeImportApproved !== false) {
    addError("shared-importer-decisions", "runtimeImportApproved must remain false");
  }

  const actualDecisionKeys = Object.keys(shared?.resolvedSharedDecisions ?? {});
  for (const key of expectedDecisionKeys) {
    if (!actualDecisionKeys.includes(key)) addError("shared-importer-decisions", `Missing resolved shared decision "${key}"`);
  }
  for (const key of actualDecisionKeys) {
    if (!expectedDecisionKeys.includes(key)) addWarning("shared-importer-decisions", `Unexpected resolved shared decision "${key}"`);
  }

  const layout = shared?.resolvedSharedDecisions?.candidateArtifactLayout;
  const minimumArtifacts = layout?.minimumArtifacts ?? [];
  for (const fileName of [
    "route-sections.research.json",
    "route-geometry-index.research.json",
    "facilities.research.json",
    "rule-warnings.research.json",
    "import-report.research.json"
  ]) {
    if (!minimumArtifacts.includes(fileName)) addError("shared-importer-decisions", `candidate artifact layout missing ${fileName}`);
  }
}

function validatePhaseStatus(prep) {
  const phases = new Map((prep?.executionPhases ?? []).map((phase) => [phase.phase, phase.status]));
  const expected = new Map([
    [1, "complete"],
    [2, "complete"],
    [3, "complete-initial-candidate-artifacts"],
    [4, "blocked-until-explicit-request"]
  ]);
  for (const [phase, status] of expected) {
    if (phases.get(phase) !== status) addError("normalization-prep", `phase ${phase} must be ${status}`);
  }
}

function validatePhase3Report(phase3Report, prep, manifest) {
  if (phase3Report?.schemaVersion !== "candidate-normalization-phase3-report/v1") {
    addError("phase3-candidate-artifacts", "schemaVersion must be candidate-normalization-phase3-report/v1");
  }
  if (phase3Report?.status !== "complete-initial-candidate-artifacts") {
    addError("phase3-candidate-artifacts", "status must be complete-initial-candidate-artifacts");
  }
  if (phase3Report?.runtimeImportApproved !== false) {
    addError("phase3-candidate-artifacts", "runtimeImportApproved must remain false");
  }
  if (!arraysEqual(phase3Report?.artifactFiles ?? [], expectedCandidateArtifactFiles)) {
    addError("phase3-candidate-artifacts", "artifactFiles must match the shared candidate artifact contract");
  }
  if (!arraysEqual(phase3Report?.supplementalArtifactFiles ?? [], expectedSupplementalCandidateArtifactFiles)) {
    addError("phase3-candidate-artifacts", "supplementalArtifactFiles must list route-topology.research.json");
  }

  const reportTrailIds = (phase3Report?.includedTrails ?? []).map((trail) => trail.trailId);
  if (!arraysEqual(reportTrailIds, prep?.scope?.includedTrails ?? [])) {
    addError("phase3-candidate-artifacts", "includedTrails must match normalization-prep order");
  }

  const manifestCounts = new Map(
    (manifest?.trails ?? [])
      .filter((trail) => trail.readiness === "normalization-prep")
      .map((trail) => [trail.id, trail.files?.sectionFiles])
  );
  for (const trail of phase3Report?.includedTrails ?? []) {
    if (trail.sectionCount !== manifestCounts.get(trail.trailId)) {
      addError("phase3-candidate-artifacts", `${trail.trailId} sectionCount must match manifest`);
    }
  }
}

async function validateNormalizedCandidateArtifacts(prep, manifest) {
  const trailsById = new Map((manifest?.trails ?? []).map((trail) => [trail.id, trail]));
  const rows = [];

  for (const trailId of prep?.scope?.includedTrails ?? []) {
    const manifestSectionCount = trailsById.get(trailId)?.files?.sectionFiles;
    const artifactRoot = path.join(candidateRoot, trailId, "normalized-candidate");
    for (const fileName of expectedCandidateArtifactFiles) {
      if (!(await pathExists(path.join(artifactRoot, fileName)))) {
        addError(`${trailId}/normalized-candidate`, `Missing ${fileName}`);
      }
    }
    for (const fileName of expectedSupplementalCandidateArtifactFiles) {
      if (!(await pathExists(path.join(artifactRoot, fileName)))) {
        addError(`${trailId}/normalized-candidate`, `Missing supplemental ${fileName}`);
      }
    }

    const routeSections = await readJson(path.join(artifactRoot, "route-sections.research.json"));
    const geometryIndex = await readJson(path.join(artifactRoot, "route-geometry-index.research.json"));
    const routeTopology = await readJson(path.join(artifactRoot, "route-topology.research.json"));
    const facilities = await readJson(path.join(artifactRoot, "facilities.research.json"));
    const ruleWarnings = await readJson(path.join(artifactRoot, "rule-warnings.research.json"));
    const importReport = await readJson(path.join(artifactRoot, "import-report.research.json"));
    if (!routeSections || !geometryIndex || !routeTopology || !facilities || !ruleWarnings || !importReport) continue;

    const scope = `${trailId}/normalized-candidate`;
    validateArtifactHeader(scope, routeSections, trailId, "candidate-route-sections/v1");
    validateArtifactHeader(scope, geometryIndex, trailId, "candidate-route-geometry-index/v1");
    validateArtifactHeader(scope, routeTopology, trailId, "candidate-route-topology/v1");
    validateArtifactHeader(scope, facilities, trailId, "candidate-facilities/v1");
    validateArtifactHeader(scope, ruleWarnings, trailId, "candidate-rule-warnings/v1");
    validateArtifactHeader(scope, importReport, trailId, "candidate-import-report/v1");

    if ((routeSections.sections ?? []).length !== manifestSectionCount) {
      addError(scope, `route section count must match manifest ${manifestSectionCount}`);
    }
    if ((geometryIndex.sections ?? []).length !== manifestSectionCount) {
      addError(scope, `geometry section count must match manifest ${manifestSectionCount}`);
    }
    for (const section of geometryIndex.sections ?? []) {
      for (const candidateGeojsonFile of section.candidateGeojsonFiles ?? []) {
        const geojson = await readJson(path.join(projectRoot, candidateGeojsonFile));
        if (!geojson) continue;
        const hasFeatureCollection = geojson.type === "FeatureCollection" && Array.isArray(geojson.features) && geojson.features.length > 0;
        const hasSingleFeature = geojson.type === "Feature" && isObject(geojson.geometry);
        if (!hasFeatureCollection && !hasSingleFeature) {
          addError(scope, `candidate geometry ${candidateGeojsonFile} must be a non-empty FeatureCollection or Feature`);
        }
      }
    }
    if (facilities.summary?.totalRecords !== (facilities.records ?? []).length) {
      addError(scope, "facility summary totalRecords must match records length");
    }
    if (ruleWarnings.summary?.totalRecords !== (ruleWarnings.records ?? []).length) {
      addError(scope, "rule warning summary totalRecords must match records length");
    }
    if (importReport.manifestSectionFiles !== manifestSectionCount) {
      addError(scope, "import report manifestSectionFiles must match manifest");
    }
    if (importReport.generatedCounts?.routeSections !== (routeSections.sections ?? []).length) {
      addError(scope, "import report routeSections count must match route artifact");
    }
    if (importReport.generatedCounts?.geometrySections !== (geometryIndex.sections ?? []).length) {
      addError(scope, "import report geometrySections count must match geometry artifact");
    }
    if (importReport.generatedCounts?.routeTopologyDecisions !== (routeTopology.decisionsApplied ?? []).length) {
      addError(scope, "import report routeTopologyDecisions count must match topology artifact");
    }
    if (importReport.generatedCounts?.routeGroups !== (routeTopology.routeGroups ?? []).length) {
      addError(scope, "import report routeGroups count must match topology artifact");
    }
    if (importReport.generatedCounts?.routeTopologyConnections !== (routeTopology.connections ?? []).length) {
      addError(scope, "import report routeTopologyConnections count must match topology artifact");
    }
    if (importReport.generatedCounts?.facilities !== (facilities.records ?? []).length) {
      addError(scope, "import report facilities count must match facilities artifact");
    }
    if (importReport.generatedCounts?.ruleWarnings !== (ruleWarnings.records ?? []).length) {
      addError(scope, "import report ruleWarnings count must match rule warnings artifact");
    }
    if (importReport.runtimeImportApproved !== false) {
      addError(scope, "import report runtimeImportApproved must remain false");
    }
    if (!Array.isArray(importReport.blockerTriage) || importReport.blockerTriage.length === 0) {
      addError(scope, "import report must include blockerTriage");
    }
    for (const item of importReport.blockerTriage ?? []) {
      if (!allowedTriageDispositions.has(item.disposition)) {
        addError(scope, `triage item ${item.id} has unsupported disposition ${item.disposition}`);
      }
      if (typeof item.action !== "string" || !item.action.trim()) {
        addError(scope, `triage item ${item.id} must include action`);
      }
    }

    validateUnique(scope, "route section IDs", (routeSections.sections ?? []).map((section) => section.sectionId));
    const routeSectionIds = new Set((routeSections.sections ?? []).map((section) => section.sectionId));
    validateUnique(scope, "route group IDs", (routeTopology.routeGroups ?? []).map((group) => group.groupId));
    validateUnique(scope, "route topology connection IDs", (routeTopology.connections ?? []).map((connection) => connection.connectionId));
    if ((routeTopology.unresolvedSectionRefs ?? []).length > 0) {
      addError(scope, "route topology contains unresolvedSectionRefs");
    }
    for (const group of routeTopology.routeGroups ?? []) {
      if (!["mainline", "branch", "access", "connector"].includes(group.kind)) {
        addError(scope, `route group ${group.groupId} has unsupported kind ${group.kind}`);
      }
      if (!Array.isArray(group.sectionIds) || group.sectionIds.length === 0) {
        addError(scope, `route group ${group.groupId} must contain sectionIds`);
      }
      for (const sectionId of group.sectionIds ?? []) {
        if (!routeSectionIds.has(sectionId)) addError(scope, `route group ${group.groupId} references unknown section ${sectionId}`);
      }
    }
    for (const connection of routeTopology.connections ?? []) {
      for (const key of ["fromSectionId", "toSectionId"]) {
        if (connection[key] && !routeSectionIds.has(connection[key])) {
          addError(scope, `route topology connection ${connection.connectionId} references unknown ${key} ${connection[key]}`);
        }
      }
    }
    validateUnique(scope, "facility IDs", (facilities.records ?? []).map((facility) => facility.facilityId));
    for (const facility of facilities.records ?? []) {
      if (!allowedFacilityStates.has(facility.state)) addError(scope, `facility ${facility.facilityId} has unsupported state ${facility.state}`);
      if (!Array.isArray(facility.candidateTypes) || facility.candidateTypes.length === 0) {
        addError(scope, `facility ${facility.facilityId} must have candidateTypes`);
      }
      for (const type of facility.candidateTypes ?? []) {
        if (!allowedCandidateFacilityTypes.has(type)) {
          addError(scope, `facility ${facility.facilityId} has unsupported candidateType ${type}`);
        }
      }
      if (!Array.isArray(facility.rawTypes) || facility.rawTypes.length === 0) {
        addError(scope, `facility ${facility.facilityId} must preserve rawTypes`);
      }
    }
    validateUnique(scope, "rule warning IDs", (ruleWarnings.records ?? []).map((warning) => warning.warningId));

    rows.push({
      trailId,
      sections: routeSections.sections.length,
      routeGroups: routeTopology.routeGroups.length,
      facilities: facilities.records.length,
      ruleWarnings: ruleWarnings.records.length
    });
  }

  return rows;
}

function validateBlockerTriage(triageReport, prep) {
  if (triageReport?.schemaVersion !== "candidate-blocker-triage/v1") {
    addError("blocker-triage", "schemaVersion must be candidate-blocker-triage/v1");
  }
  if (triageReport?.status !== "triaged-fix-now-biased") {
    addError("blocker-triage", "status must be triaged-fix-now-biased");
  }
  if (triageReport?.runtimeImportApproved !== false) {
    addError("blocker-triage", "runtimeImportApproved must remain false");
  }
  const trailIds = (triageReport?.trails ?? []).map((trail) => trail.trailId);
  if (!arraysEqual(trailIds, prep?.scope?.includedTrails ?? [])) {
    addError("blocker-triage", "trail order must match normalization-prep");
  }
  const items = (triageReport?.trails ?? []).flatMap((trail) => trail.items ?? []);
  if (items.length === 0) addError("blocker-triage", "must include triage items");
  for (const item of items) {
    if (!allowedTriageDispositions.has(item.disposition)) {
      addError("blocker-triage", `item ${item.id} has unsupported disposition ${item.disposition}`);
    }
  }
}

function validateGeometryTopologyFixPass(geometryTopologyFix, prep) {
  if (geometryTopologyFix?.schemaVersion !== "candidate-geometry-topology-fix-pass/v1") {
    addError("geometry-topology-fix-pass", "schemaVersion must be candidate-geometry-topology-fix-pass/v1");
  }
  if (geometryTopologyFix?.status !== "topology-decisions-applied") {
    addError("geometry-topology-fix-pass", "status must be topology-decisions-applied");
  }
  if (geometryTopologyFix?.runtimeImportApproved !== false) {
    addError("geometry-topology-fix-pass", "runtimeImportApproved must remain false");
  }
  const trailIds = (geometryTopologyFix?.includedTrails ?? []).map((trail) => trail.trailId);
  if (!arraysEqual(trailIds, prep?.scope?.includedTrails ?? [])) {
    addError("geometry-topology-fix-pass", "trail order must match normalization-prep");
  }
  for (const trail of geometryTopologyFix?.includedTrails ?? []) {
    if (!Array.isArray(trail.decisionsApplied) || trail.decisionsApplied.length === 0) {
      addError("geometry-topology-fix-pass", `${trail.trailId} must include at least one topology/display decision`);
    }
    if (!Array.isArray(trail.routeGroups) || trail.routeGroups.length === 0) {
      addError("geometry-topology-fix-pass", `${trail.trailId} must include routeGroups`);
    }
  }
}

function validateArtifactHeader(scope, artifact, trailId, schemaVersion) {
  if (artifact.schemaVersion !== schemaVersion) addError(scope, `schemaVersion must be ${schemaVersion}`);
  if (artifact.trailId !== trailId) addError(scope, `trailId must be ${trailId}`);
  if (artifact.runtimeImportApproved !== false) addError(scope, "runtimeImportApproved must remain false");
}

function validateQualityGate(qualityGate, prep, manifest) {
  if (qualityGate?.schemaVersion !== "candidate-normalization-quality-gate/v1") {
    addError("normalization-quality-gate", "schemaVersion must be candidate-normalization-quality-gate/v1");
  }
  if (qualityGate?.status !== "passed-for-candidate-artifact-start") {
    addError("normalization-quality-gate", "status must be passed-for-candidate-artifact-start");
  }
  if (qualityGate?.scope?.runtimeImportApproved !== false) {
    addError("normalization-quality-gate", "runtimeImportApproved must remain false");
  }
  if (!arraysEqual(qualityGate?.scope?.includedTrails ?? [], prep?.scope?.includedTrails ?? [])) {
    addError("normalization-quality-gate", "includedTrails must match normalization-prep");
  }

  const checks = new Map((qualityGate?.checks ?? []).map((check) => [check.id, check.status]));
  for (const id of expectedQualityCheckIds) {
    if (checks.get(id) !== "passed") addError("normalization-quality-gate", `check ${id} must be present with status passed`);
  }

  const manifestCounts = new Map(
    (manifest?.trails ?? [])
      .filter((trail) => trail.readiness === "normalization-prep")
      .map((trail) => [trail.id, trail.files?.sectionFiles])
  );
  const matrix = qualityGate?.readinessMatrix ?? [];
  const matrixIds = matrix.map((row) => row.trailId);
  if (!arraysEqual(matrixIds, prep?.scope?.includedTrails ?? [])) {
    addError("normalization-quality-gate", "readinessMatrix trail order must match normalization-prep");
  }
  for (const row of matrix) {
    if (row.sectionFiles !== manifestCounts.get(row.trailId)) {
      addError("normalization-quality-gate", `${row.trailId} readinessMatrix sectionFiles must match manifest`);
    }
    if (!Array.isArray(row.knownBlockers) || row.knownBlockers.length === 0) {
      addError("normalization-quality-gate", `${row.trailId} must list knownBlockers`);
    }
  }
}

async function validateDocs(prep, manifest) {
  if (prep?.sharedDecisionFile !== "shared-importer-decisions.research.json") {
    addError("normalization-prep", "sharedDecisionFile must reference shared-importer-decisions.research.json");
  }
  if (prep?.qualityGateFile !== "normalization-quality-gate.research.json") {
    addError("normalization-prep", "qualityGateFile must reference normalization-quality-gate.research.json");
  }
  if (prep?.phase3ReportFile !== "phase3-candidate-artifacts.research.json") {
    addError("normalization-prep", "phase3ReportFile must reference phase3-candidate-artifacts.research.json");
  }
  if (prep?.blockerTriageFile !== "blocker-triage.research.json") {
    addError("normalization-prep", "blockerTriageFile must reference blocker-triage.research.json");
  }
  if (prep?.geometryTopologyFixFile !== "geometry-topology-fix-pass.research.json") {
    addError("normalization-prep", "geometryTopologyFixFile must reference geometry-topology-fix-pass.research.json");
  }
  if (manifest?.sharedPrepFile !== "normalization-prep.research.json") {
    addError("manifest", "sharedPrepFile must reference normalization-prep.research.json");
  }
  if (manifest?.sharedDecisionFile !== "shared-importer-decisions.research.json") {
    addError("manifest", "sharedDecisionFile must reference shared-importer-decisions.research.json");
  }
  if (manifest?.qualityGateFile !== "normalization-quality-gate.research.json") {
    addError("manifest", "qualityGateFile must reference normalization-quality-gate.research.json");
  }
  if (manifest?.phase3ReportFile !== "phase3-candidate-artifacts.research.json") {
    addError("manifest", "phase3ReportFile must reference phase3-candidate-artifacts.research.json");
  }
  if (manifest?.blockerTriageFile !== "blocker-triage.research.json") {
    addError("manifest", "blockerTriageFile must reference blocker-triage.research.json");
  }
  if (manifest?.geometryTopologyFixFile !== "geometry-topology-fix-pass.research.json") {
    addError("manifest", "geometryTopologyFixFile must reference geometry-topology-fix-pass.research.json");
  }

  const readme = await readFile(path.join(candidateRoot, "README.md"), "utf8");
  for (const fileName of [
    "normalization-prep.research.json",
    "shared-importer-decisions.research.json",
    "normalization-quality-gate.research.json",
    "phase3-candidate-artifacts.research.json",
    "blocker-triage.research.json",
    "geometry-topology-fix-pass.research.json",
    "manifest.json"
  ]) {
    if (!readme.includes(fileName)) addError("README", `Missing shared coordination file mention for ${fileName}`);
  }
}

const parsedFiles = await validateJsonParse();
const prep = await readJson(path.join(candidateRoot, "normalization-prep.research.json"));
const manifest = await readJson(path.join(candidateRoot, "manifest.json"));
const shared = await readJson(path.join(candidateRoot, "shared-importer-decisions.research.json"));
const qualityGate = await readJson(path.join(candidateRoot, "normalization-quality-gate.research.json"));
const phase3Report = await readJson(path.join(candidateRoot, "phase3-candidate-artifacts.research.json"));
const blockerTriage = await readJson(path.join(candidateRoot, "blocker-triage.research.json"));
const geometryTopologyFix = await readJson(path.join(candidateRoot, "geometry-topology-fix-pass.research.json"));

if (prep && manifest && shared && qualityGate && phase3Report && blockerTriage && geometryTopologyFix) {
  validateScopeLists(prep, manifest, shared);
  validateSharedDecisions(shared);
  validatePhaseStatus(prep);
  validateQualityGate(qualityGate, prep, manifest);
  validatePhase3Report(phase3Report, prep, manifest);
  validateBlockerTriage(blockerTriage, prep);
  validateGeometryTopologyFixPass(geometryTopologyFix, prep);
  await validateDocs(prep, manifest);
  const rows = await validateHandoffs(prep, manifest);
  const artifactRows = await validateNormalizedCandidateArtifacts(prep, manifest);
  if (errors.length === 0) {
    console.log(`Candidate normalization check passed (${rows.length} trails, ${parsedFiles} JSON/GeoJSON files).`);
    for (const row of rows) {
      console.log(`- ${row.trailId}: ${row.sectionFiles} section files, ${row.openDecisions} open decisions, ${row.status}`);
    }
    for (const row of artifactRows) {
      console.log(
        `  artifacts ${row.trailId}: ${row.sections} sections, ${row.routeGroups} route groups, ${row.facilities} facilities, ${row.ruleWarnings} rule warnings`
      );
    }
  }
}

if (warnings.length > 0) {
  console.warn("Candidate normalization prep warnings:");
  for (const warning of warnings) console.warn(`- ${warning.scope}: ${warning.message}`);
}

if (errors.length > 0) {
  console.error("Candidate normalization prep check failed:");
  for (const error of errors) console.error(`- ${error.scope}: ${error.message}`);
  process.exitCode = 1;
}
