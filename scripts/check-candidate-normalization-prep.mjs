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
    [3, "ready-to-start"],
    [4, "blocked-until-explicit-request"]
  ]);
  for (const [phase, status] of expected) {
    if (phases.get(phase) !== status) addError("normalization-prep", `phase ${phase} must be ${status}`);
  }
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
  if (manifest?.sharedPrepFile !== "normalization-prep.research.json") {
    addError("manifest", "sharedPrepFile must reference normalization-prep.research.json");
  }
  if (manifest?.sharedDecisionFile !== "shared-importer-decisions.research.json") {
    addError("manifest", "sharedDecisionFile must reference shared-importer-decisions.research.json");
  }
  if (manifest?.qualityGateFile !== "normalization-quality-gate.research.json") {
    addError("manifest", "qualityGateFile must reference normalization-quality-gate.research.json");
  }

  const readme = await readFile(path.join(candidateRoot, "README.md"), "utf8");
  for (const fileName of [
    "normalization-prep.research.json",
    "shared-importer-decisions.research.json",
    "normalization-quality-gate.research.json",
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

if (prep && manifest && shared && qualityGate) {
  validateScopeLists(prep, manifest, shared);
  validateSharedDecisions(shared);
  validatePhaseStatus(prep);
  validateQualityGate(qualityGate, prep, manifest);
  await validateDocs(prep, manifest);
  const rows = await validateHandoffs(prep, manifest);
  if (errors.length === 0) {
    console.log(`Candidate normalization prep check passed (${rows.length} trails, ${parsedFiles} JSON/GeoJSON files).`);
    for (const row of rows) {
      console.log(`- ${row.trailId}: ${row.sectionFiles} section files, ${row.openDecisions} open decisions, ${row.status}`);
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
