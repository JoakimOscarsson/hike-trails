import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(parseRootArg(process.argv.slice(2)) ?? path.join(scriptDir, ".."));
const publicRoot = path.join(projectRoot, "public");
const errors = [];
const forbiddenRuntimePathPatterns = [
  { label: "research-only input", pattern: /(^|\/)research(\/|$)/ },
  { label: "app-owned source input", pattern: /(^|\/)data\/source\// },
  { label: "source snapshot input", pattern: /source-snapshot/ },
  { label: "candidate trail research", pattern: /candidate-trails/ },
  { label: "kayak seed research", pattern: /stockholm-kayak-archipelago-research/ }
];

function parseRootArg(args) {
  const index = args.indexOf("--root");
  return index === -1 ? undefined : args[index + 1];
}

function addError(scope, message) {
  errors.push({ scope, message });
}

function publicPath(publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl.trim()) return null;
  const cleanPath = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  const resolved = path.resolve(publicRoot, cleanPath);
  return resolved === publicRoot || resolved.startsWith(publicRoot + path.sep) ? resolved : null;
}

async function pathExists(filePath) {
  if (!filePath) return false;
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, scope) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    addError(scope, `Cannot read valid JSON: ${error.message}`);
    return undefined;
  }
}

async function readPublicJson(publicUrl, scope) {
  const filePath = publicPath(publicUrl);
  if (!filePath) {
    addError(scope, `Path "${publicUrl}" does not resolve inside public/`);
    return undefined;
  }
  if (!(await pathExists(filePath))) {
    addError(scope, `Path does not exist: ${publicUrl}`);
    return undefined;
  }
  return readJson(filePath, scope);
}

function expectShardField(item, field, expectedPath) {
  if (item[field] !== expectedPath) {
    addError(
      `library-index ${item.id}`,
      `${field} must be "${expectedPath}" so the runtime can select shards without legacy detail JSON`
    );
  }
}

function collectDuplicateIds(items) {
  const counts = new Map();
  for (const item of items) {
    if (typeof item?.id === "string" && item.id.trim()) counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

function assertNoForbiddenRuntimePath(scope, field, value) {
  if (typeof value !== "string") return;
  for (const forbidden of forbiddenRuntimePathPatterns) {
    if (forbidden.pattern.test(value)) {
      addError(scope, `${field} must not point at ${forbidden.label}: ${value}`);
    }
  }
}

async function probeTrailSystem(item) {
  const scope = `library-index trail-system ${item.id}`;
  if (item.detailPath) {
    addError(scope, "Trail-system runtime records must not include legacy detailPath");
  }

  const expectedPaths = {
    manifestPath: `/data/trail-systems/${item.id}/manifest.json`,
    sectionsIndexPath: `/data/trail-systems/${item.id}/sections-index.json`,
    routeGroupsPath: `/data/trail-systems/${item.id}/route-groups.json`,
    presetsPath: `/data/trail-systems/${item.id}/presets.json`
  };
  for (const [field, expectedPath] of Object.entries(expectedPaths)) expectShardField(item, field, expectedPath);

  const [manifest, sectionsIndex, routeGroups, presets] = await Promise.all([
    readPublicJson(item.manifestPath, `${scope} manifest`),
    readPublicJson(item.sectionsIndexPath, `${scope} sections-index`),
    readPublicJson(item.routeGroupsPath, `${scope} route-groups`),
    readPublicJson(item.presetsPath, `${scope} presets`)
  ]);

  if (manifest?.id !== item.id) addError(scope, `Manifest id "${manifest?.id}" does not match index id`);
  for (const aggregateField of ["sections", "routeGroups", "presets"]) {
    if (aggregateField in (manifest ?? {})) {
      addError(scope, `manifest.json must not duplicate aggregate field "${aggregateField}"`);
    }
  }
  if (!Array.isArray(sectionsIndex) || sectionsIndex.length === 0) {
    addError(scope, "sections-index must be a non-empty array");
  }
  if (!Array.isArray(routeGroups)) addError(scope, "route-groups must be an array");
  if (!Array.isArray(presets)) addError(scope, "presets must be an array");

  let sectionShardCount = 0;
  const sectionIds = new Set();
  const sectionShardDir = publicPath(`/data/trail-systems/${item.id}/sections/`);
  const sectionShardDirPrefix = sectionShardDir ? `${sectionShardDir}${path.sep}` : null;
  if (Array.isArray(sectionsIndex)) {
    for (const duplicateId of collectDuplicateIds(sectionsIndex)) addError(scope, `sections-index has duplicate ID "${duplicateId}"`);
    for (const section of sectionsIndex) {
      const sectionScope = `${scope} section ${section?.id ?? "(missing id)"}`;
      if (typeof section?.id !== "string" || !section.id.trim()) addError(sectionScope, "section id is required");
      else sectionIds.add(section.id);
      if (typeof section?.name !== "string" || !section.name.trim()) addError(sectionScope, "section name is required");
      if (typeof section?.distanceKm !== "number" || !Number.isFinite(section.distanceKm)) {
        addError(sectionScope, "section distanceKm must be a finite number");
      }
      if (!section?.route || typeof section.route !== "object") addError(sectionScope, "section route summary is required");
      if (typeof section?.detailPath !== "string") {
        addError(sectionScope, "section index record must include detailPath");
        continue;
      }
      if (!section.detailPath.startsWith(`/data/trail-systems/${item.id}/sections/`)) {
        addError(sectionScope, `detailPath must stay inside /data/trail-systems/${item.id}/sections/`);
        continue;
      }
      const detailPath = publicPath(section.detailPath);
      if (!detailPath || !sectionShardDirPrefix || !detailPath.startsWith(sectionShardDirPrefix)) {
        addError(sectionScope, "resolved detailPath must stay inside this trail system's section shard directory");
      } else if (!(await pathExists(detailPath))) {
        addError(sectionScope, `section detail shard does not exist: ${section.detailPath}`);
      } else {
        const detail = await readJson(detailPath, sectionScope);
        if (detail?.id !== section.id) addError(sectionScope, `detail shard id "${detail?.id}" does not match section id`);
        if (detail?.trailSystemId !== item.id) {
          addError(sectionScope, `detail shard trailSystemId "${detail?.trailSystemId}" does not match trail-system id`);
        }
        for (const aggregateField of ["sections", "routeGroups", "presets"]) {
          if (aggregateField in (detail ?? {})) addError(sectionScope, `detail shard must not duplicate "${aggregateField}"`);
        }
        sectionShardCount += 1;
      }
    }
  }

  if (Array.isArray(routeGroups)) {
    for (const duplicateId of collectDuplicateIds(routeGroups)) addError(scope, `route-groups has duplicate ID "${duplicateId}"`);
    for (const routeGroup of routeGroups) {
      const groupScope = `${scope} route group ${routeGroup?.id ?? "(missing id)"}`;
      if (typeof routeGroup?.id !== "string" || !routeGroup.id.trim()) addError(groupScope, "route group id is required");
      if (!Array.isArray(routeGroup?.sectionIds)) {
        addError(groupScope, "sectionIds must be an array");
        continue;
      }
      for (const sectionId of routeGroup.sectionIds) {
        if (!sectionIds.has(sectionId)) addError(groupScope, `sectionIds references unknown section "${sectionId}"`);
      }
    }
  }

  if (Array.isArray(presets)) {
    for (const duplicateId of collectDuplicateIds(presets)) addError(scope, `presets has duplicate ID "${duplicateId}"`);
    for (const preset of presets) {
      const presetScope = `${scope} preset ${preset?.id ?? "(missing id)"}`;
      if (typeof preset?.id !== "string" || !preset.id.trim()) addError(presetScope, "preset id is required");
      if (!sectionIds.has(preset?.startSectionId)) {
        addError(presetScope, `startSectionId references unknown section "${preset?.startSectionId}"`);
      }
      if (!sectionIds.has(preset?.endSectionId)) {
        addError(presetScope, `endSectionId references unknown section "${preset?.endSectionId}"`);
      }
    }
  }

  return {
    id: item.id,
    sections: Array.isArray(sectionsIndex) ? sectionsIndex.length : 0,
    sectionShards: sectionShardCount,
    routeGroups: Array.isArray(routeGroups) ? routeGroups.length : 0,
    presets: Array.isArray(presets) ? presets.length : 0
  };
}

async function loadRuntimeLibraryModule() {
  const modulePath = path.join(projectRoot, "src", "data", "library.ts");
  const source = await readFile(modulePath, "utf8").catch((error) => {
    addError("src/data/library.ts", `Cannot read source: ${error.message}`);
    return "";
  });
  if (!source) return null;
  try {
    const ts = await import("typescript");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
  } catch (error) {
    addError("src/data/library.ts", `Cannot load runtime library module: ${error.message}`);
    return null;
  }
}

async function createPublicFetch({ failLibraryIndex = false, requestedPaths = [] } = {}) {
  return async (publicUrl) => {
    requestedPaths.push(publicUrl);
    if (failLibraryIndex && publicUrl === "/data/library-index.json") {
      return { ok: false, json: async () => ({}) };
    }
    const filePath = publicPath(publicUrl);
    if (!filePath || !(await pathExists(filePath))) return { ok: false, json: async () => ({}) };
    const text = await readFile(filePath, "utf8");
    return {
      ok: true,
      json: async () => JSON.parse(text)
    };
  };
}

async function probeRuntimeLoader(mode, runtimeLibrary) {
  const requestedPaths = [];
  const fetchImpl = await createPublicFetch({ requestedPaths });
  const items = await runtimeLibrary.loadLibraryIndex(fetchImpl).catch((error) => {
    addError(`runtime loader ${mode}`, `loadLibraryIndex failed: ${error.message}`);
    return [];
  });

  for (const item of items.filter((candidate) => candidate.itemType === "trail-system")) {
    const before = requestedPaths.length;
    await runtimeLibrary.loadLibraryDetail(item, fetchImpl).catch((error) => {
      addError(`runtime loader ${mode} ${item.id}`, `loadLibraryDetail failed: ${error.message}`);
    });
    const detailRequests = requestedPaths.slice(before);
    const legacyPath = `/data/trail-systems/${item.id}.json`;
    if (detailRequests.includes(legacyPath)) {
      addError(`runtime loader ${mode} ${item.id}`, `selected trail-system requested legacy all-in-one JSON ${legacyPath}`);
    }
    for (const field of ["manifestPath", "sectionsIndexPath", "routeGroupsPath", "presetsPath"]) {
      if (!detailRequests.includes(item[field])) {
        addError(`runtime loader ${mode} ${item.id}`, `selected trail-system did not request ${field}: ${item[field]}`);
      }
    }
  }

  const kayakItems = items.filter((candidate) => candidate.activity === "kayaking" || candidate.itemType === "kayak-trip");
  if (!kayakItems.length) addError(`runtime loader ${mode}`, "library-index should expose kayak-trip records");
  for (const item of kayakItems) {
    const scope = `runtime loader ${mode} kayak ${item.id}`;
    if (item.activity !== "kayaking") addError(scope, `activity must be "kayaking", got "${item.activity}"`);
    if (item.itemType !== "kayak-trip") addError(scope, `itemType must be "kayak-trip", got "${item.itemType}"`);
    if (!item.detailPath) {
      addError(scope, "kayak-trip index record must include detailPath");
      continue;
    }
    for (const field of ["waterZone", "archipelagoRegion", "exposureLevel", "routeConfidence", "mapConfidence"]) {
      if (typeof item[field] !== "string" || !item[field].trim()) addError(scope, `kayak-trip index record must include ${field}`);
    }
    if (typeof item.hasFollowup !== "boolean") addError(scope, "kayak-trip index record must include boolean hasFollowup");
    if (typeof item.searchText !== "string" || !item.searchText.trim()) addError(scope, "kayak-trip index record must include searchText");
    if ("normalizedSearchText" in item) addError(scope, "kayak-trip index record must not duplicate searchText as normalizedSearchText");
    assertNoForbiddenRuntimePath(scope, "detailPath", item.detailPath);
    assertNoForbiddenRuntimePath(scope, "routePath", item.routePath);

    const before = requestedPaths.length;
    const detail = await runtimeLibrary.loadLibraryDetail(item, fetchImpl).catch((error) => {
      addError(scope, `loadLibraryDetail failed: ${error.message}`);
      return null;
    });
    const detailRequests = requestedPaths.slice(before);
    if (!detailRequests.includes(item.detailPath)) addError(scope, `selected kayak trip did not request detailPath: ${item.detailPath}`);
    for (const requestedPath of detailRequests) assertNoForbiddenRuntimePath(scope, "requested path", requestedPath);
    if (!detail) continue;

    if (detail.id !== item.id) addError(scope, `detail id "${detail.id}" does not match index id`);
    if (detail.activity !== "kayaking") addError(scope, `detail activity must be "kayaking", got "${detail.activity}"`);
    if (detail.itemType !== "kayak-trip") addError(scope, `detail itemType must be "kayak-trip", got "${detail.itemType}"`);
    if (detail.route?.geojsonPath !== item.routePath) {
      addError(scope, `detail route geojsonPath "${detail.route?.geojsonPath}" does not match index routePath "${item.routePath}"`);
    }
    const expectedHasFollowup = Boolean(
      detail.research?.needsFollowup?.length || detail.research?.contradictions?.length || detail.research?.corrections?.length
    );
    const metadataMatches = {
      waterZone: detail.waterZone,
      archipelagoRegion: detail.archipelagoRegion,
      exposureLevel: detail.exposureLevel,
      routeConfidence: detail.research?.routeConfidence,
      mapConfidence: detail.route?.mapConfidence,
      hasFollowup: expectedHasFollowup
    };
    for (const [field, expectedValue] of Object.entries(metadataMatches)) {
      if (item[field] !== expectedValue) {
        addError(scope, `index ${field} "${item[field]}" does not match detail value "${expectedValue}"`);
      }
    }
    if (detail.route?.navigationUse !== "not-for-navigation") {
      addError(scope, `detail route navigationUse must be "not-for-navigation", got "${detail.route?.navigationUse}"`);
    }
    if (typeof detail.route?.warning !== "string" || !detail.route.warning.trim()) {
      addError(scope, "detail route must keep a not-for-navigation warning");
    }
    if (detail.route?.geojsonPath && !(await pathExists(publicPath(detail.route.geojsonPath)))) {
      addError(scope, `detail route geojsonPath does not exist: ${detail.route.geojsonPath}`);
    }
  }
}

async function probeLegacyFallbackRemoval(runtimeLibrary, trailSystems) {
  const indexRequestPaths = [];
  const failingIndexFetch = await createPublicFetch({ failLibraryIndex: true, requestedPaths: indexRequestPaths });
  const loadedFromFallback = await runtimeLibrary
    .loadLibraryIndex(failingIndexFetch)
    .then(() => true)
    .catch(() => false);

  if (loadedFromFallback) {
    addError("runtime loader required library-index", "loadLibraryIndex must fail when /data/library-index.json cannot load");
  }
  if (indexRequestPaths.includes("/data/hikes-index.json")) {
    addError("runtime loader required library-index", "loadLibraryIndex must not request legacy /data/hikes-index.json fallback");
  }

  const trailSystem = trailSystems[0];
  if (!trailSystem) return;

  const legacyPath = `/data/trail-systems/${trailSystem.id}.json`;
  const missingShardItem = {
    ...trailSystem,
    detailPath: legacyPath
  };
  delete missingShardItem.manifestPath;
  delete missingShardItem.sectionsIndexPath;
  delete missingShardItem.routeGroupsPath;
  delete missingShardItem.presetsPath;

  const detailRequestPaths = [];
  const fetchImpl = await createPublicFetch({ requestedPaths: detailRequestPaths });
  const loadedFromLegacyDetail = await runtimeLibrary
    .loadLibraryDetail(missingShardItem, fetchImpl)
    .then(() => true)
    .catch(() => false);

  if (loadedFromLegacyDetail) {
    addError("runtime loader required trail-system shards", "trail-system detail loading must fail when shard paths are missing");
  }
  if (detailRequestPaths.includes(legacyPath)) {
    addError("runtime loader required trail-system shards", `trail-system detail loading must not request legacy ${legacyPath}`);
  }
}

async function probeKayakFacilityLoader(runtimeLibrary, kayakIds) {
  const requestedPaths = [];
  const fetchImpl = await createPublicFetch({ requestedPaths });
  if (typeof runtimeLibrary.loadKayakFacilities !== "function") {
    addError("runtime kayak facilities", "loadKayakFacilities export is missing");
    return { facilities: 0, linkedFacilities: 0 };
  }

  const facilities = await runtimeLibrary.loadKayakFacilities(fetchImpl).catch((error) => {
    addError("runtime kayak facilities", `loadKayakFacilities failed: ${error.message}`);
    return [];
  });
  if (!requestedPaths.includes("/data/kayak-facilities.json")) {
    addError("runtime kayak facilities", "facility loader did not request /data/kayak-facilities.json");
  }
  if (!Array.isArray(facilities)) {
    addError("runtime kayak facilities", "facility loader must return an array");
    return { facilities: 0, linkedFacilities: 0 };
  }

  let linkedFacilities = 0;
  for (const facility of facilities) {
    const scope = `runtime kayak facility ${facility?.id ?? "(missing id)"}`;
    if (facility?.activity !== "kayaking") addError(scope, `activity must be "kayaking", got "${facility?.activity}"`);
    if (typeof facility?.id !== "string" || !facility.id.trim()) addError(scope, "facility id is required");
    if (typeof facility?.type !== "string" || !facility.type.trim()) addError(scope, "facility type is required");
    if (typeof facility?.description !== "string") addError(scope, "description must be a string for runtime rendering");
    assertNoForbiddenRuntimePath(scope, "sourceFile", facility?.sourceFile);
    for (const routeId of facility?.routeIds ?? []) {
      linkedFacilities += 1;
      if (!kayakIds.has(routeId)) addError(scope, `routeIds references unknown kayak trip "${routeId}"`);
    }
  }

  return { facilities: facilities.length, linkedFacilities };
}

async function validateHikingOverviewContract(libraryIndex) {
  const overview = await readPublicJson("/data/overviews/hiking.geojson", "hiking overview");
  if (!overview || !Array.isArray(overview.features)) {
    addError("hiking overview", "Expected FeatureCollection with features");
    return;
  }
  const itemsByOverviewId = new Map(libraryIndex.map((item) => [item.overviewFeatureId ?? item.id, item]));
  for (const feature of overview.features) {
    const id = feature?.properties?.id ?? feature?.id;
    const item = itemsByOverviewId.get(id);
    if (!item) continue;
    if (item.itemType === "trail-system" && "detailPath" in (feature.properties ?? {})) {
      addError(`hiking overview ${id}`, "trail-system overview feature must not expose legacy detailPath");
    }
    if (item.itemType === "hike" && feature.properties?.detailPath !== item.detailPath) {
      addError(`hiking overview ${id}`, "hike overview feature detailPath must match library index");
    }
  }
}

async function validateKayakingOverviewContract(kayaks) {
  const overview = await readPublicJson("/data/overviews/kayaking.geojson", "kayaking overview");
  if (!kayaks.length) {
    addError("library-index", "Expected kayak-trip records in the current hiking-plus-kayak contract");
    return { features: 0 };
  }
  if (!overview || !Array.isArray(overview.features)) {
    addError("kayaking overview", "Expected FeatureCollection with features");
    return { features: 0 };
  }

  const kayaksByOverviewId = new Map(kayaks.map((item) => [item.overviewFeatureId ?? item.id, item]));
  const seenFeatureIds = new Set();
  for (const feature of overview.features) {
    const properties = feature?.properties ?? {};
    const id = properties.id ?? feature?.id;
    const scope = `kayaking overview ${id ?? "(missing id)"}`;
    if (typeof id !== "string" || !id.trim()) {
      addError(scope, "feature id is required");
      continue;
    }
    if (seenFeatureIds.has(id)) addError(scope, `duplicate feature id "${id}"`);
    seenFeatureIds.add(id);

    const item = kayaksByOverviewId.get(id);
    if (!item) {
      addError(scope, "feature does not have a matching kayak library-index record");
      continue;
    }
    if (properties.activity !== "kayaking") addError(scope, `activity must be "kayaking", got "${properties.activity}"`);
    if (properties.itemType !== "kayak-trip") addError(scope, `itemType must be "kayak-trip", got "${properties.itemType}"`);
    for (const field of ["searchText", "normalizedSearchText", "tags"]) {
      if (field in properties) addError(scope, `${field} must not be copied into the compact kayaking overview`);
    }
    if (properties.detailPath !== item.detailPath) addError(scope, "detailPath must match the kayak library-index record");
    if (properties.routePath !== item.routePath) addError(scope, "routePath must match the kayak library-index record");
    for (const field of [
      "waterZone",
      "archipelagoRegion",
      "exposureLevel",
      "routeConfidence",
      "mapConfidence",
      "hasFollowup"
    ]) {
      if (properties[field] !== item[field]) addError(scope, `${field} must match the kayak library-index record`);
    }
    if (properties.navigationUse !== "not-for-navigation") {
      addError(scope, `navigationUse must be "not-for-navigation", got "${properties.navigationUse}"`);
    }
    if (typeof properties.warning !== "string" || !properties.warning.trim()) {
      addError(scope, "feature must keep a not-for-navigation warning");
    }
    assertNoForbiddenRuntimePath(scope, "detailPath", properties.detailPath);
    assertNoForbiddenRuntimePath(scope, "routePath", properties.routePath);

    const coordinates = feature?.geometry?.coordinates;
    if (feature?.geometry?.type !== "LineString" || !Array.isArray(coordinates) || coordinates.length < 2) {
      addError(scope, "feature geometry must be a LineString corridor with at least two coordinates");
    }
  }

  for (const item of kayaks) {
    const overviewId = item.overviewFeatureId ?? item.id;
    if (!seenFeatureIds.has(overviewId)) {
      addError(`kayaking overview ${overviewId}`, "kayak library-index record is missing from the kayaking overview");
    }
  }

  return { features: seenFeatureIds.size };
}

async function main() {
  const libraryIndex = await readPublicJson("/data/library-index.json", "library-index");
  if (!Array.isArray(libraryIndex)) addError("library-index", "Expected an array");

  const items = Array.isArray(libraryIndex) ? libraryIndex : [];
  const trailSystems = items.filter((item) => item.itemType === "trail-system");
  const hikes = items.filter((item) => item.itemType === "hike");
  const kayaks = items.filter((item) => item.activity === "kayaking");

  if (trailSystems.length === 0) addError("library-index", "Expected at least one trail-system record");
  for (const hike of hikes) {
    if (!hike.detailPath) {
      addError(`library-index hike ${hike.id}`, "hike records must keep detailPath");
    } else if (!(await pathExists(publicPath(hike.detailPath)))) {
      addError(`library-index hike ${hike.id}`, `hike detailPath does not exist: ${hike.detailPath}`);
    }
  }

  const trailSystemStats = [];
  for (const item of trailSystems) trailSystemStats.push(await probeTrailSystem(item));
  await validateHikingOverviewContract(items);
  const kayakingOverviewStats = await validateKayakingOverviewContract(kayaks);

  const runtimeLibrary = await loadRuntimeLibraryModule();
  let kayakFacilityStats = { facilities: 0, linkedFacilities: 0 };
  if (runtimeLibrary) {
    await probeRuntimeLoader("library-index", runtimeLibrary);
    await probeLegacyFallbackRemoval(runtimeLibrary, trailSystems);
    kayakFacilityStats = await probeKayakFacilityLoader(
      runtimeLibrary,
      new Set(kayaks.map((item) => item.id).filter((id) => typeof id === "string"))
    );
  }

  if (errors.length) {
    console.error("Runtime contract probe failed:");
    for (const error of errors) console.error(`- ${error.scope}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log("Runtime contract probe passed.");
  console.log(
    `- library-index: ${hikes.length} hike records, ${trailSystems.length} sharded trail-system records, ${kayaks.length} kayak records`
  );
  for (const stat of trailSystemStats) {
    console.log(
      `- ${stat.id}: ${stat.sections} section summaries, ${stat.sectionShards} section shards, ${stat.routeGroups} route groups, ${stat.presets} presets`
    );
  }
  console.log(`- kayaking overview: ${kayakingOverviewStats.features} approximate corridor features`);
  console.log("- kayak-trip detail loading exercises detailPath records through the shared runtime loader");
  console.log(`- kayak facilities: ${kayakFacilityStats.facilities} records, ${kayakFacilityStats.linkedFacilities} route links`);
  console.log("- current trail-system runtime records initialize from shards and do not point at legacy all-in-one JSON");
  console.log("- missing library-index or trail-system shard paths fail without legacy hikes-index/detail JSON fallback");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
