import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(parseRootArg(process.argv.slice(2)) ?? path.join(scriptDir, ".."));
const publicRoot = path.join(projectRoot, "public");

const errors = [];
const warnings = [];
const parsedJson = new Map();
const routeCache = new Map();
const indexedTrailSystemIds = new Set();

const allowedRecommendedTimes = new Set(["dayhike", "weekend", "3-5-days", "6-plus-days"]);
const allowedTripDurations = new Set(["half-day", "dayhike", "weekend", "3-5-days", "6-plus-days"]);
const allowedRouteStatuses = new Set(["ready", "missing-gpx", "manual", "marker-only"]);
const allowedRouteSourceFormats = new Set([
  "gpx",
  "geojson",
  "manual",
  "official-network-gpx",
  "official-provisional-network",
  "osm-relation",
  "approximate-waypoint-corridor"
]);
const allowedNavigationUses = new Set(["navigable-route", "planning-reference", "not-for-navigation"]);
const allowedMapConfidences = new Set(["low", "medium", "high", "missing"]);
const allowedKayakWaterZones = new Set(["inner", "middle", "outer", "unknown"]);
const allowedKayakExposureLevels = new Set(["sheltered", "mixed", "exposed"]);
const allowedKayakRouteConfidences = new Set(["low", "medium", "medium-high", "high"]);
const allowedRouteGroupKinds = new Set(["mainline", "branch", "access", "connector"]);
const allowedGeometryStatuses = new Set(["ready", "approximate-waypoint-corridor", "single-point-only", "missing"]);
const allowedOverviewGeometryStatuses = new Set(["ready", "single-point-only", "missing"]);
const allowedFacilityTypes = new Set([
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
  "lodging",
  "waste",
  "hazard",
  "viewpoint",
  "camping",
  "service"
]);
const allowedKayakFacilityTypes = new Set([
  "kayak-rental",
  "canoe-rental",
  "self-service-rental",
  "launch",
  "parking",
  "transport",
  "campsite",
  "guest-harbor-natural-harbor"
]);

function parseRootArg(args) {
  const index = args.indexOf("--root");
  return index === -1 ? undefined : args[index + 1];
}

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

function publicPath(publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl.trim()) return null;
  const cleanPath = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  const resolved = path.resolve(publicRoot, cleanPath);
  return resolved === publicRoot || resolved.startsWith(publicRoot + path.sep) ? resolved : null;
}

function projectPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim() || path.isAbsolute(relativePath)) return null;
  const resolved = path.resolve(projectRoot, relativePath);
  return resolved === projectRoot || resolved.startsWith(projectRoot + path.sep) ? resolved : null;
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

async function readJson(filePath, scope = displayPath(filePath)) {
  const resolved = path.resolve(filePath);
  if (parsedJson.has(resolved)) return parsedJson.get(resolved);
  try {
    const value = JSON.parse(await readFile(resolved, "utf8"));
    parsedJson.set(resolved, value);
    return value;
  } catch (error) {
    addError(scope, `Cannot read valid JSON: ${error.message}`);
    return undefined;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isLatLonPair(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    value[0] >= -90 &&
    value[0] <= 90 &&
    value[1] >= -180 &&
    value[1] <= 180
  );
}

function isLonLatPair(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function validateLatLon(scope, label, value, { required = false } = {}) {
  if (value == null) {
    if (required) addError(scope, `${label} is required`);
    return;
  }
  if (!isLatLonPair(value)) addError(scope, `${label} must be a valid [lat, lon] pair`);
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

function valuesEqual(a, b) {
  return a === b || (isFiniteNumber(a) && isFiniteNumber(b) && Math.abs(a - b) < 0.001);
}

function validateMatches(scope, label, actual, expected) {
  if (!valuesEqual(actual, expected)) addError(scope, `${label} "${actual}" does not match index value "${expected}"`);
}

function validateEnum(scope, label, value, allowedValues, { required = true } = {}) {
  if (value == null || value === "") {
    if (required) addError(scope, `${label} is required`);
    return;
  }
  if (!allowedValues.has(value)) addError(scope, `${label} has unsupported value "${value}"`);
}

function haversineKmLatLon(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const radiusKm = 6371.0088;
  const deltaLat = toRadians(b[0] - a[0]);
  const deltaLon = toRadians(b[1] - a[1]);
  const angle =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a[0])) * Math.cos(toRadians(b[0])) * Math.sin(deltaLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(angle), Math.sqrt(1 - angle));
}

function haversineKmLonLat(a, b) {
  return haversineKmLatLon([a[1], a[0]], [b[1], b[0]]);
}

function validateGeojsonCoordinates(scope, geometry, pathParts = []) {
  if (!geometry) return;
  if (geometry.type === "Point") {
    if (!isLonLatPair(geometry.coordinates)) {
      addError(scope, `Invalid GeoJSON [lon, lat] coordinate at ${pathParts.join(".") || "geometry"}`);
    }
    return;
  }
  if (geometry.type === "LineString" || geometry.type === "MultiPoint") {
    for (const [index, coordinate] of (geometry.coordinates ?? []).entries()) {
      if (!isLonLatPair(coordinate)) addError(scope, `Invalid GeoJSON [lon, lat] coordinate at ${[...pathParts, index].join(".")}`);
    }
    return;
  }
  if (geometry.type === "Polygon" || geometry.type === "MultiLineString") {
    for (const [lineIndex, line] of (geometry.coordinates ?? []).entries()) {
      for (const [index, coordinate] of line.entries()) {
        if (!isLonLatPair(coordinate)) {
          addError(scope, `Invalid GeoJSON [lon, lat] coordinate at ${[...pathParts, lineIndex, index].join(".")}`);
        }
      }
    }
    return;
  }
  if (geometry.type === "MultiPolygon") {
    for (const [polygonIndex, polygon] of (geometry.coordinates ?? []).entries()) {
      for (const [ringIndex, ring] of polygon.entries()) {
        for (const [index, coordinate] of ring.entries()) {
          if (!isLonLatPair(coordinate)) {
            addError(
              scope,
              `Invalid GeoJSON [lon, lat] coordinate at ${[...pathParts, polygonIndex, ringIndex, index].join(".")}`
            );
          }
        }
      }
    }
    return;
  }
  if (geometry.type === "GeometryCollection") {
    for (const [index, child] of (geometry.geometries ?? []).entries()) {
      validateGeojsonCoordinates(scope, child, [...pathParts, index]);
    }
  }
}

function routeLengthKm(geojson) {
  let total = 0;

  const addLine = (line) => {
    for (let index = 1; index < line.length; index += 1) {
      if (isLonLatPair(line[index - 1]) && isLonLatPair(line[index])) {
        total += haversineKmLonLat(line[index - 1], line[index]);
      }
    }
  };

  const collectGeometry = (geometry) => {
    if (!geometry) return;
    if (geometry.type === "LineString") addLine(geometry.coordinates ?? []);
    else if (geometry.type === "MultiLineString") {
      for (const line of geometry.coordinates ?? []) addLine(line);
    } else if (geometry.type === "GeometryCollection") {
      for (const child of geometry.geometries ?? []) collectGeometry(child);
    }
  };

  if (geojson?.type === "FeatureCollection") {
    for (const feature of geojson.features ?? []) collectGeometry(feature.geometry);
  } else if (geojson?.type === "Feature") collectGeometry(geojson.geometry);
  else collectGeometry(geojson);

  return total;
}

function validateGeojson(geojson, scope) {
  const supportedTypes = new Set([
    "FeatureCollection",
    "Feature",
    "LineString",
    "MultiLineString",
    "Point",
    "MultiPoint",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection"
  ]);
  if (!supportedTypes.has(geojson?.type)) {
    addError(scope, `Unsupported or missing GeoJSON type "${geojson?.type}"`);
    return;
  }
  if (geojson.type === "FeatureCollection") {
    if (!Array.isArray(geojson.features)) addError(scope, "FeatureCollection.features must be an array");
    for (const [index, feature] of (geojson.features ?? []).entries()) {
      validateGeojsonCoordinates(scope, feature.geometry, ["features", index, "geometry"]);
    }
  } else if (geojson.type === "Feature") {
    validateGeojsonCoordinates(scope, geojson.geometry, ["geometry"]);
  } else {
    validateGeojsonCoordinates(scope, geojson, ["geometry"]);
  }
}

async function loadRouteGeojson(publicUrl, scope) {
  const filePath = publicPath(publicUrl);
  if (!filePath) {
    addError(scope, `Route path "${publicUrl}" does not resolve inside public/`);
    return undefined;
  }
  if (routeCache.has(filePath)) return routeCache.get(filePath);
  const geojson = await readJson(filePath, `${scope} ${publicUrl}`);
  if (geojson) validateGeojson(geojson, `${scope} ${publicUrl}`);
  routeCache.set(filePath, geojson);
  return geojson;
}

function validateHike(hike, scope) {
  if (!isObject(hike)) {
    addError(scope, "Hike entry must be an object");
    return;
  }
  validateEnum(scope, "recommendedTime", hike.recommendedTime, allowedRecommendedTimes);
  validateEnum(scope, "route.status", hike.route?.status, allowedRouteStatuses);
  validateEnum(scope, "route.sourceFormat", hike.route?.sourceFormat, allowedRouteSourceFormats, { required: false });
  validateLatLon(scope, "location.start", hike.location?.start, { required: true });
  validateLatLon(scope, "map.center", hike.map?.center, { required: true });
}

function validateTripDurations(scope, values) {
  if (!Array.isArray(values) || values.length === 0) {
    addError(scope, "recommendedTimes must be a non-empty array");
    return;
  }
  for (const value of values) validateEnum(scope, "recommendedTimes", value, allowedTripDurations);
}

async function validateTrailSystem(trailSystem, scope, { runRouteAudits = true } = {}) {
  if (!isObject(trailSystem)) {
    addError(scope, "Trail system entry must be an object");
    return;
  }

  const sections = Array.isArray(trailSystem.sections) ? trailSystem.sections : [];
  if (!sections.length) addError(scope, "Trail system must contain at least one section");
  for (const [index, recommendedTime] of (trailSystem.recommendedTimes ?? []).entries()) {
    validateEnum(scope, `recommendedTimes[${index}]`, recommendedTime, allowedRecommendedTimes);
  }
  validateLatLon(scope, "location.start", trailSystem.location?.start, { required: true });
  validateLatLon(scope, "map.center", trailSystem.map?.center, { required: true });
  validateUnique(scope, "section IDs", sections.map((section) => section.id));

  const sectionIds = new Set(sections.map((section) => section.id).filter((id) => typeof id === "string"));
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const routeGeojsonBySectionId = new Map();

  for (const section of sections) {
    const sectionScope = `${scope} section ${section.id ?? "(missing id)"}`;
    validateEnum(sectionScope, "route.status", section.route?.status, allowedRouteStatuses);
    validateEnum(sectionScope, "route.sourceFormat", section.route?.sourceFormat, allowedRouteSourceFormats, { required: false });
    validateLatLon(sectionScope, "endpointCoordinates.start", section.endpointCoordinates?.start);
    validateLatLon(sectionScope, "endpointCoordinates.end", section.endpointCoordinates?.end);
    validateUnique(sectionScope, "facility IDs", (section.facilities ?? []).map((facility) => facility.id));

    for (const [index, accessPoint] of (section.accessPoints ?? []).entries()) {
      const accessScope = `${sectionScope} accessPoints[${index}]`;
      validateLatLon(accessScope, "coordinates", accessPoint.coordinates, { required: true });
      for (const stopKey of ["busStop", "trainStop", "nearestStop"]) {
        if (accessPoint[stopKey]) {
          validateLatLon(accessScope, `${stopKey}.coordinates`, accessPoint[stopKey].coordinates, { required: true });
        }
      }
    }

    for (const facility of section.facilities ?? []) {
      const facilityScope = `${sectionScope} facility ${facility.id ?? "(missing id)"}`;
      validateEnum(facilityScope, "type", facility.type, allowedFacilityTypes);
      if (facility.sectionId !== section.id) {
        addError(facilityScope, `facility.sectionId "${facility.sectionId}" does not match containing section "${section.id}"`);
      }
      validateLatLon(facilityScope, "coordinates", facility.coordinates);
    }

    if (section.route?.status === "ready") {
      if (!section.route.geojsonPath) {
        addError(sectionScope, "ready route is missing geojsonPath");
      } else {
        const routePath = publicPath(section.route.geojsonPath);
        if (!routePath || !(await pathExists(routePath))) {
          addError(sectionScope, `ready route file does not exist: ${section.route.geojsonPath}`);
        } else if (runRouteAudits) {
          const geojson = await loadRouteGeojson(section.route.geojsonPath, sectionScope);
          if (geojson) routeGeojsonBySectionId.set(section.id, geojson);
        }
      }
    }
  }

  for (const routeGroup of trailSystem.routeGroups ?? []) {
    const groupScope = `${scope} routeGroup ${routeGroup.id ?? "(missing id)"}`;
    validateEnum(groupScope, "kind", routeGroup.kind, allowedRouteGroupKinds);
    validateUnique(groupScope, "route group section IDs", routeGroup.sectionIds ?? []);
    for (const sectionId of routeGroup.sectionIds ?? []) {
      if (!sectionIds.has(sectionId)) addError(groupScope, `references unknown section "${sectionId}"`);
    }
    for (const sectionId of routeGroup.connectsToSectionIds ?? []) {
      if (!sectionIds.has(sectionId)) addError(groupScope, `connectsToSectionIds references unknown section "${sectionId}"`);
    }
  }

  for (const preset of trailSystem.presets ?? []) {
    const presetScope = `${scope} preset ${preset.id ?? "(missing id)"}`;
    if (!sectionIds.has(preset.startSectionId)) {
      addError(presetScope, `startSectionId references unknown section "${preset.startSectionId}"`);
    }
    if (!sectionIds.has(preset.endSectionId)) {
      addError(presetScope, `endSectionId references unknown section "${preset.endSectionId}"`);
    }
  }

  if (runRouteAudits) {
    auditEndpointGaps(trailSystem, scope, sections, sectionsById);
    auditRouteDistances(scope, sections, routeGeojsonBySectionId);
  }
}

function fallbackRouteGroup(trailSystem, sections) {
  return {
    id: `${trailSystem.id}-sections`,
    sectionIds: sections.map((section) => section.id)
  };
}

function auditEndpointGaps(trailSystem, scope, sections, sectionsById) {
  const groups = trailSystem.routeGroups?.length ? trailSystem.routeGroups : [fallbackRouteGroup(trailSystem, sections)];
  for (const group of groups) {
    for (let index = 1; index < (group.sectionIds ?? []).length; index += 1) {
      const previous = sectionsById.get(group.sectionIds[index - 1]);
      const next = sectionsById.get(group.sectionIds[index]);
      const previousEnd = previous?.endpointCoordinates?.end;
      const previousStart = previous?.endpointCoordinates?.start;
      const nextStart = next?.endpointCoordinates?.start;
      const nextEnd = next?.endpointCoordinates?.end;
      if (!isLatLonPair(previousEnd) || !isLatLonPair(nextStart)) continue;

      const directGapKm = haversineKmLatLon(previousEnd, nextStart);
      const alternateDistances = [
        ["previous start to next start", previousStart, nextStart],
        ["previous end to next end", previousEnd, nextEnd],
        ["previous start to next end", previousStart, nextEnd]
      ]
        .filter(([, a, b]) => isLatLonPair(a) && isLatLonPair(b))
        .map(([label, a, b]) => ({ label, distanceKm: haversineKmLatLon(a, b) }))
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const bestAlternate = alternateDistances[0];
      if (directGapKm > 2 && bestAlternate && bestAlternate.distanceKm < Math.min(0.3, directGapKm / 5)) {
        addWarning(
          `${scope} routeGroup ${group.id}`,
          `endpoint gap ${previous.id} -> ${next.id} is ${directGapKm.toFixed(2)} km; ${bestAlternate.label} is ${bestAlternate.distanceKm.toFixed(2)} km`
        );
      }
    }
  }
}

function auditRouteDistances(scope, sections, routeGeojsonBySectionId) {
  for (const section of sections) {
    const geojson = routeGeojsonBySectionId.get(section.id);
    if (!geojson || !isFiniteNumber(section.distanceKm) || section.distanceKm <= 0) continue;
    const measuredKm = routeLengthKm(geojson);
    if (!Number.isFinite(measuredKm) || measuredKm <= 0) continue;

    const deltaKm = measuredKm - section.distanceKm;
    const ratio = measuredKm / section.distanceKm;
    if (Math.abs(deltaKm) >= 3 && (ratio < 0.7 || ratio > 1.3)) {
      addWarning(
        `${scope} section ${section.id}`,
        `declared distance ${section.distanceKm.toFixed(1)} km differs from GeoJSON ${measuredKm.toFixed(1)} km (${deltaKm >= 0 ? "+" : ""}${deltaKm.toFixed(1)} km, ratio ${ratio.toFixed(2)})`
      );
    }
  }
}

async function validatePublicIndex() {
  const indexPath = path.join(publicRoot, "data", "hikes-index.json");
  const index = await readJson(indexPath);
  if (!Array.isArray(index)) {
    addError(displayPath(indexPath), "Public index must be an array");
    return;
  }

  validateUnique("public/data/hikes-index.json", "index item IDs", index.map((item) => item.id));

  for (const item of index) {
    const scope = `public index item ${item.id ?? "(missing id)"}`;
    if (!item.detailPath) {
      addError(scope, "detailPath is required");
      continue;
    }
    const detailPath = publicPath(item.detailPath);
    if (!detailPath) {
      addError(scope, `detailPath "${item.detailPath}" does not resolve inside public/`);
      continue;
    }
    if (!(await pathExists(detailPath))) {
      addError(scope, `detailPath does not exist: ${item.detailPath}`);
      continue;
    }
    const detail = await readJson(detailPath, `${scope} ${item.detailPath}`);
    if (detail?.id && item.id && detail.id !== item.id) {
      addError(scope, `detail ID "${detail.id}" does not match index ID "${item.id}"`);
    }
    if (!item.overviewFeatureId) addError(scope, "overviewFeatureId is required for hiking overview mapping");
    if (item.itemType === "trail-system") {
      indexedTrailSystemIds.add(item.id);
      await validateTrailSystem(detail, `${scope} detail`, { runRouteAudits: false });
    } else if (item.itemType === "hike") validateHike(detail, `${scope} detail`);

    const shardPathFields = ["manifestPath", "sectionsIndexPath", "routeGroupsPath", "presetsPath"];
    const presentShardPathFields = shardPathFields.filter((field) => item[field]);
    if (presentShardPathFields.length) {
      const expectedShardPaths = {
        manifestPath: `/data/trail-systems/${item.id}/manifest.json`,
        sectionsIndexPath: `/data/trail-systems/${item.id}/sections-index.json`,
        routeGroupsPath: `/data/trail-systems/${item.id}/route-groups.json`,
        presetsPath: `/data/trail-systems/${item.id}/presets.json`
      };
      for (const field of shardPathFields) {
        if (!item[field]) {
          addError(scope, `${field} is required when trail-system shard paths are present`);
          continue;
        }
        if (item[field] !== expectedShardPaths[field]) {
          addError(scope, `${field} must be "${expectedShardPaths[field]}"`);
        }
        const shardPath = publicPath(item[field]);
        if (!shardPath || !(await pathExists(shardPath))) addError(scope, `${field} does not exist: ${item[field]}`);
      }
      const manifestPath = publicPath(item.manifestPath);
      if (manifestPath) {
        const manifest = await readJson(manifestPath, `${scope} manifest`);
        if (manifest?.id !== item.id) addError(scope, `manifest ID "${manifest?.id}" does not match index ID "${item.id}"`);
      }
      const sectionsIndexPath = publicPath(item.sectionsIndexPath);
      if (sectionsIndexPath) {
        const sectionsIndex = await readJson(sectionsIndexPath, `${scope} sections-index`);
        if (!Array.isArray(sectionsIndex)) addError(scope, "sectionsIndexPath must point to an array");
        else {
          for (const section of sectionsIndex) {
            if (typeof section.detailPath !== "string" || !section.detailPath.startsWith(`/data/trail-systems/${item.id}/sections/`)) {
              addError(scope, `section ${section.id ?? "(missing id)"} detailPath must live under /data/trail-systems/${item.id}/sections/`);
            }
          }
        }
      }
    }
  }

  await validateHikingOverview(index);
}

async function validateHikingOverview(index) {
  const overviewPath = path.join(publicRoot, "data", "overviews", "hiking.geojson");
  const overviewScope = "public/data/overviews/hiking.geojson";
  if (!(await pathExists(overviewPath))) {
    addError(overviewScope, "Hiking overview GeoJSON is required");
    return;
  }

  const overview = await readJson(overviewPath, overviewScope);
  if (!overview) return;
  validateGeojson(overview, overviewScope);
  if (overview.type !== "FeatureCollection" || !Array.isArray(overview.features)) {
    addError(overviewScope, "Hiking overview must be a FeatureCollection");
    return;
  }

  const hikingIndexItems = index.filter((item) => (item.activity ?? "hiking") === "hiking");
  const overviewFeatureIds = hikingIndexItems.map((item) => item.overviewFeatureId ?? item.id);
  validateUnique("public/data/hikes-index.json", "overview feature IDs", overviewFeatureIds);
  const expectedItems = new Map(hikingIndexItems.map((item) => [item.overviewFeatureId ?? item.id, item]));
  if (expectedItems.size !== hikingIndexItems.length) {
    addError(overviewScope, "Each hiking index item must map to one unique overview feature");
  }
  const featureIds = overview.features.map((feature) => feature?.properties?.id ?? feature?.id);
  validateUnique(overviewScope, "overview feature IDs", featureIds);
  const seenIds = new Set();

  for (const [featureIndex, feature] of overview.features.entries()) {
    const featureScope = `${overviewScope} feature[${featureIndex}]`;
    const properties = feature?.properties ?? {};
    const featureId = properties.id ?? feature?.id;
    if (typeof featureId !== "string" || !featureId.trim()) {
      addError(featureScope, "feature id is required");
      continue;
    }
    seenIds.add(featureId);
    const item = expectedItems.get(featureId);
    if (!item) {
      addError(featureScope, `references unknown index item "${featureId}"`);
      continue;
    }
    if (properties.activity !== "hiking") addError(featureScope, `activity must be "hiking"`);
    if (properties.itemType !== item.itemType) addError(featureScope, `itemType "${properties.itemType}" does not match index item`);
    if (item.itemType === "hike") {
      if (properties.detailPath !== item.detailPath) addError(featureScope, `detailPath does not match index item`);
    } else if ("detailPath" in properties) {
      addError(featureScope, "trail-system overview features must not expose legacy all-in-one detailPath");
    }
    if (typeof properties.name !== "string" || !properties.name.trim()) addError(featureScope, "name is required");
    else validateMatches(featureScope, "name", properties.name, item.name);
    validateMatches(featureScope, "distanceKm", properties.distanceKm, item.distanceKm);
    validateMatches(featureScope, "estimatedTime", properties.estimatedTime, item.estimatedTime);
    validateMatches(featureScope, "difficulty", properties.difficulty, item.difficulty);
    validateMatches(featureScope, "routeType", properties.routeType, item.routeType);
    validateMatches(featureScope, "recommendedTime", properties.recommendedTime, item.recommendedTime);
    validateEnum(featureScope, "geometryStatus", properties.geometryStatus, allowedOverviewGeometryStatuses);
    if (!["LineString", "MultiLineString", "Point"].includes(feature.geometry?.type)) {
      addError(featureScope, `geometry type must be LineString, MultiLineString, or Point`);
    }
  }

  for (const featureId of expectedItems.keys()) {
    if (!seenIds.has(featureId)) addError(overviewScope, `missing feature for index item "${featureId}"`);
  }
}

async function validateActivityLibraryIndexFragments(index) {
  const fragments = [
    ["hiking", await readJson(path.join(publicRoot, "data", "library-index.hiking.json"), "public/data/library-index.hiking.json")],
    ["kayaking", await readJson(path.join(publicRoot, "data", "library-index.kayaking.json"), "public/data/library-index.kayaking.json")]
  ];
  const composed = [];

  for (const [activity, fragment] of fragments) {
    const scope = `public/data/library-index.${activity}.json`;
    if (!Array.isArray(fragment)) {
      addError(scope, "Activity library-index fragment must be an array");
      continue;
    }
    validateUnique(scope, "fragment item IDs", fragment.map((item) => item.id));
    for (const item of fragment) {
      if ((item.activity ?? "hiking") !== activity) {
        addError(`${scope} item ${item.id ?? "(missing id)"}`, `activity must be "${activity}"`);
      }
    }
    composed.push(...fragment);
  }

  if (JSON.stringify(composed) !== JSON.stringify(index)) {
    addError("public/data/library-index.json", "Composed library index must exactly match the hiking and kayaking activity fragments");
  }
}

async function validateLibraryIndex() {
  const indexPath = path.join(publicRoot, "data", "library-index.json");
  const scope = "public/data/library-index.json";
  const index = await readJson(indexPath, scope);
  const compatibilityIndex = await readJson(path.join(publicRoot, "data", "hikes-index.json"), "public/data/hikes-index.json");
  if (!Array.isArray(index)) {
    addError(scope, "Generic library index must be an array");
    return;
  }

  validateUnique(scope, "library index item IDs", index.map((item) => item.id));
  validateUnique(scope, "overview feature IDs", index.map((item) => item.overviewFeatureId ?? item.id));
  await validateActivityLibraryIndexFragments(index);

  if (Array.isArray(compatibilityIndex)) {
    const compatibilityItems = new Map(compatibilityIndex.map((item) => [item.id, item]));
    const genericHikingItems = new Map(index.filter((item) => (item.activity ?? "hiking") === "hiking").map((item) => [item.id, item]));
    for (const compatibilityItem of compatibilityIndex) {
      const itemScope = `${scope} item ${compatibilityItem.id ?? "(missing id)"}`;
      const item = genericHikingItems.get(compatibilityItem.id);
      if (!item) {
        addError(itemScope, "missing item from generic index");
        continue;
      }
      for (const field of [
        "activity",
        "itemType",
        "name",
        "region",
        "country",
        "recommendedTime",
        "difficulty",
        "distanceKm",
        "estimatedTime",
        "routeType",
        "overviewFeatureId",
        "searchText"
      ]) {
        validateMatches(itemScope, field, item[field], compatibilityItem[field]);
      }
      if (item.location?.label !== compatibilityItem.location?.label) {
        addError(itemScope, `location.label "${item.location?.label}" does not match compatibility index value "${compatibilityItem.location?.label}"`);
      }
      if (item.itemType === "hike") validateMatches(itemScope, "detailPath", item.detailPath, compatibilityItem.detailPath);
      if (item.itemType === "trail-system") {
        for (const field of ["manifestPath", "sectionsIndexPath", "routeGroupsPath", "presetsPath"]) {
          validateMatches(itemScope, field, item[field], compatibilityItem[field]);
        }
      }
    }

    for (const id of genericHikingItems.keys()) {
      if (!compatibilityItems.has(id)) addError(`${scope} item ${id}`, "generic index item is not present in compatibility index");
    }
  }

  for (const item of index) {
    const itemScope = `${scope} item ${item.id ?? "(missing id)"}`;
    validateEnum(itemScope, "activity", item.activity, new Set(["hiking", "kayaking"]));
    if (item.activity === "kayaking") {
      if (item.itemType !== "kayak-trip") addError(itemScope, 'kayak activity itemType must be "kayak-trip"');
      validateTripDurations(itemScope, item.recommendedTimes);
      validateEnum(itemScope, "waterZone", item.waterZone, allowedKayakWaterZones);
      validateEnum(itemScope, "exposureLevel", item.exposureLevel, allowedKayakExposureLevels);
      validateEnum(itemScope, "routeConfidence", item.routeConfidence, allowedKayakRouteConfidences);
      validateEnum(itemScope, "mapConfidence", item.mapConfidence, allowedMapConfidences);
      if (typeof item.archipelagoRegion !== "string" || !item.archipelagoRegion.trim()) addError(itemScope, "archipelagoRegion is required");
      if (typeof item.hasFollowup !== "boolean") addError(itemScope, "hasFollowup must be a boolean");
      if (!item.detailPath) {
        addError(itemScope, "kayak-trip detailPath is required");
      } else {
        const detailPath = publicPath(item.detailPath);
        if (!detailPath || !(await pathExists(detailPath))) addError(itemScope, `kayak-trip detailPath does not exist: ${item.detailPath}`);
        else {
          const detail = await readJson(detailPath, `${itemScope} ${item.detailPath}`);
          if (detail?.id !== item.id) addError(itemScope, `detail ID "${detail?.id}" does not match index ID "${item.id}"`);
          validateMatches(itemScope, "name", detail?.name, item.name);
          validateMatches(itemScope, "region", detail?.region, item.region);
          validateMatches(itemScope, "country", detail?.country, item.country);
          validateMatches(itemScope, "distanceKm", detail?.distanceKm, item.distanceKm);
          validateMatches(itemScope, "routePath", detail?.route?.geojsonPath, item.routePath);
          validateMatches(itemScope, "waterZone", detail?.waterZone, item.waterZone);
          validateMatches(itemScope, "archipelagoRegion", detail?.archipelagoRegion, item.archipelagoRegion);
          validateMatches(itemScope, "exposureLevel", detail?.exposureLevel, item.exposureLevel);
          validateMatches(itemScope, "routeConfidence", detail?.research?.routeConfidence, item.routeConfidence);
          validateMatches(itemScope, "mapConfidence", detail?.route?.mapConfidence, item.mapConfidence);
          const hasFollowup = Boolean(
            detail?.research?.needsFollowup?.length || detail?.research?.contradictions?.length || detail?.research?.corrections?.length
          );
          validateMatches(itemScope, "hasFollowup", hasFollowup, item.hasFollowup);
        }
      }
      if (!item.routePath) {
        addError(itemScope, "routePath is required");
      } else {
        const routePath = publicPath(item.routePath);
        if (!routePath || !(await pathExists(routePath))) addError(itemScope, `routePath does not exist: ${item.routePath}`);
      }
      if (typeof item.locationLabel !== "string" || !item.locationLabel.trim()) addError(itemScope, "locationLabel is required");
      if (typeof item.searchText !== "string" || !item.searchText.trim()) {
        addError(itemScope, "searchText is required");
      }
      if ("normalizedSearchText" in item) {
        addError(itemScope, "normalizedSearchText must not duplicate kayak searchText");
      }
      continue;
    }

    if (!["hike", "trail-system"].includes(item.itemType)) {
      addError(itemScope, `unsupported itemType "${item.itemType}"`);
      continue;
    }
    if (!item.overviewFeatureId) addError(itemScope, "overviewFeatureId is required");

    if (item.itemType === "hike") {
      if (!item.detailPath) {
        addError(itemScope, "hike detailPath is required");
        continue;
      }
      const detailPath = publicPath(item.detailPath);
      if (!detailPath || !(await pathExists(detailPath))) {
        addError(itemScope, `hike detailPath does not exist: ${item.detailPath}`);
        continue;
      }
      const detail = await readJson(detailPath, `${itemScope} ${item.detailPath}`);
      if (detail?.id !== item.id) addError(itemScope, `detail ID "${detail?.id}" does not match index ID "${item.id}"`);
      validateHike(detail, `${itemScope} detail`);
      continue;
    }

    if (item.detailPath) {
      addError(itemScope, "trail-system library-index records must not point at legacy all-in-one detailPath");
    }

    const expectedShardPaths = {
      manifestPath: `/data/trail-systems/${item.id}/manifest.json`,
      sectionsIndexPath: `/data/trail-systems/${item.id}/sections-index.json`,
      routeGroupsPath: `/data/trail-systems/${item.id}/route-groups.json`,
      presetsPath: `/data/trail-systems/${item.id}/presets.json`
    };

    const loadedShards = {};
    for (const [field, expectedPath] of Object.entries(expectedShardPaths)) {
      if (item[field] !== expectedPath) addError(itemScope, `${field} must be "${expectedPath}"`);
      const filePath = publicPath(item[field]);
      if (!filePath || !(await pathExists(filePath))) {
        addError(itemScope, `${field} does not exist: ${item[field]}`);
        continue;
      }
      loadedShards[field] = await readJson(filePath, `${itemScope} ${field}`);
    }

    const manifest = loadedShards.manifestPath;
    const sectionsIndex = loadedShards.sectionsIndexPath;
    const routeGroups = loadedShards.routeGroupsPath;
    const presets = loadedShards.presetsPath;

    if (manifest?.id !== item.id) addError(itemScope, `manifest ID "${manifest?.id}" does not match index ID "${item.id}"`);
    if (!Array.isArray(sectionsIndex)) addError(itemScope, "sectionsIndexPath must point to an array");
    if (!Array.isArray(routeGroups)) addError(itemScope, "routeGroupsPath must point to an array");
    if (!Array.isArray(presets)) addError(itemScope, "presetsPath must point to an array");

    if (Array.isArray(sectionsIndex)) {
      const sectionIds = new Set(sectionsIndex.map((section) => section.id).filter((id) => typeof id === "string"));
      validateUnique(itemScope, "sections-index IDs", sectionsIndex.map((section) => section.id));
      for (const section of sectionsIndex) {
        const sectionScope = `${itemScope} section ${section.id ?? "(missing id)"}`;
        if (typeof section.detailPath !== "string" || !section.detailPath.startsWith(`/data/trail-systems/${item.id}/sections/`)) {
          addError(sectionScope, "detailPath must point at this trail system's section shard directory");
        } else {
          const detailPath = publicPath(section.detailPath);
          if (!detailPath || !(await pathExists(detailPath))) addError(sectionScope, `section detail shard does not exist: ${section.detailPath}`);
        }
        validateEnum(sectionScope, "route.status", section.route?.status, allowedRouteStatuses);
        validateLatLon(sectionScope, "endpointCoordinates.start", section.endpointCoordinates?.start);
        validateLatLon(sectionScope, "endpointCoordinates.end", section.endpointCoordinates?.end);
      }

      if (Array.isArray(routeGroups)) {
        for (const routeGroup of routeGroups) {
          const groupScope = `${itemScope} routeGroup ${routeGroup.id ?? "(missing id)"}`;
          for (const sectionId of routeGroup.sectionIds ?? []) {
            if (!sectionIds.has(sectionId)) addError(groupScope, `references unknown section "${sectionId}"`);
          }
          for (const sectionId of routeGroup.connectsToSectionIds ?? []) {
            if (!sectionIds.has(sectionId)) addError(groupScope, `connectsToSectionIds references unknown section "${sectionId}"`);
          }
        }
      }

      if (Array.isArray(presets)) {
        for (const preset of presets) {
          const presetScope = `${itemScope} preset ${preset.id ?? "(missing id)"}`;
          if (!sectionIds.has(preset.startSectionId)) addError(presetScope, `startSectionId references unknown section "${preset.startSectionId}"`);
          if (!sectionIds.has(preset.endSectionId)) addError(presetScope, `endSectionId references unknown section "${preset.endSectionId}"`);
        }
      }
    }
  }
}

async function readHikingSourceTrailSystems() {
  const hikingSourceDir = path.join(projectRoot, "data", "source", "hiking");
  const entries = (await readdir(hikingSourceDir, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  const trailSystems = [];

  if (!entries.length) {
    addError("data/source/hiking", "Expected at least one hiking trail-system source shard directory");
    return trailSystems;
  }

  for (const entry of entries) {
    const systemDir = path.join(hikingSourceDir, entry.name);
    const sectionsDir = path.join(systemDir, "sections");
    const scope = `data/source/hiking/${entry.name}`;
    const manifest = await readJson(path.join(systemDir, "manifest.json"), `${scope}/manifest.json`);
    const sectionIds = (await readJson(path.join(systemDir, "sections-index.json"), `${scope}/sections-index.json`)) ?? [];
    const routeGroups = (await readJson(path.join(systemDir, "route-groups.json"), `${scope}/route-groups.json`)) ?? [];
    const presets = (await readJson(path.join(systemDir, "presets.json"), `${scope}/presets.json`)) ?? [];
    const sectionFiles = new Set((await readdir(sectionsDir).catch(() => [])).filter((file) => file.endsWith(".json")));
    const sections = [];

    if (!isObject(manifest)) {
      addError(`${scope}/manifest.json`, "Expected an object manifest");
      continue;
    }
    if (manifest.id !== entry.name) addError(`${scope}/manifest.json`, `manifest ID must match directory name "${entry.name}"`);
    for (const field of ["sections", "routeGroups", "presets"]) {
      if (field in manifest) addError(`${scope}/manifest.json`, `manifest must not duplicate ${field}; keep it in its source shard`);
    }
    if (!Array.isArray(sectionIds)) addError(`${scope}/sections-index.json`, "Expected an array of ordered section IDs");
    if (!Array.isArray(routeGroups)) addError(`${scope}/route-groups.json`, "Expected an array");
    if (!Array.isArray(presets)) addError(`${scope}/presets.json`, "Expected an array");
    if (!sectionFiles.size) addError(`${scope}/sections`, "Expected at least one section shard");
    validateUnique(`${scope}/sections-index.json`, "section IDs", Array.isArray(sectionIds) ? sectionIds : []);

    for (const sectionId of Array.isArray(sectionIds) ? sectionIds : []) {
      const sectionFile = `${sectionId}.json`;
      if (!sectionFiles.has(sectionFile)) addError(`${scope}/sections-index.json`, `section shard is missing: ${sectionFile}`);
    }
    for (const sectionFile of sectionFiles) {
      const sectionId = sectionFile.replace(/\.json$/, "");
      if (Array.isArray(sectionIds) && !sectionIds.includes(sectionId)) {
        addError(`${scope}/sections/${sectionFile}`, "section shard is not listed in sections-index.json");
      }
    }

    for (const sectionId of Array.isArray(sectionIds) ? sectionIds : []) {
      const sectionFile = `${sectionId}.json`;
      if (!sectionFiles.has(sectionFile)) continue;
      const section = await readJson(path.join(sectionsDir, sectionFile), `${scope}/sections/${sectionFile}`);
      if (!isObject(section)) {
        addError(`${scope}/sections/${sectionFile}`, "Expected an object section shard");
        continue;
      }
      if (section.id !== sectionId) {
        addError(`${scope}/sections/${sectionFile}`, `section ID "${section.id}" must match file name`);
      }
      sections.push(section);
    }

    trailSystems.push({
      ...manifest,
      sections,
      ...(Array.isArray(routeGroups) && routeGroups.length ? { routeGroups } : {}),
      presets: Array.isArray(presets) ? presets : []
    });
  }

  return trailSystems;
}

async function validateSourceData() {
  const hikesPath = path.join(projectRoot, "data", "hikes.json");
  const hikes = (await readJson(hikesPath)) ?? [];
  const trailSystems = await readHikingSourceTrailSystems();

  if (!Array.isArray(hikes)) addError(displayPath(hikesPath), "Expected an array");
  else {
    validateUnique("data/hikes.json", "hike IDs", hikes.map((hike) => hike.id));
    for (const hike of hikes) validateHike(hike, `data/hikes.json hike ${hike.id ?? "(missing id)"}`);
  }

  validateUnique("data/source/hiking", "trail-system IDs", trailSystems.map((system) => system.id));
  for (const trailSystem of trailSystems) {
    await validateTrailSystem(trailSystem, `data/source/hiking/${trailSystem.id ?? "(missing id)"}`);
  }
}

async function validateCommuteCache() {
  const cachePath = path.join(projectRoot, "data", "commute-stops-osm-cache.json");
  if (!(await pathExists(cachePath))) return;
  const cache = await readJson(cachePath);
  if (!isObject(cache)) {
    addError(displayPath(cachePath), "Expected an object cache");
    return;
  }
  for (const [key, entry] of Object.entries(cache)) {
    if (Array.isArray(entry)) {
      for (const [index, stop] of entry.entries()) {
        validateLatLon(`data/commute-stops-osm-cache.json ${key}[${index}]`, "coordinates", stop.coordinates);
      }
    } else if (entry?.coordinates) {
      validateLatLon(`data/commute-stops-osm-cache.json ${key}`, "coordinates", entry.coordinates);
    }
  }
}

async function validateResearchProgress() {
  const progressPath = path.join(projectRoot, "data", "research-progress", "sormlandsleden.json");
  if (!(await pathExists(progressPath))) return;
  const progress = await readJson(progressPath);
  if (!isObject(progress)) addError(displayPath(progressPath), "Expected an object");
}

async function validateAllRouteFiles() {
  const routesDir = path.join(publicRoot, "routes");
  let files = [];
  try {
    files = await readdir(routesDir, { recursive: true });
  } catch {
    return;
  }
  await Promise.all(
    files
      .filter((file) => file.endsWith(".geojson"))
      .map(async (file) => {
        const filePath = path.join(routesDir, file);
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) return;
        const geojson = await readJson(filePath);
        if (geojson) validateGeojson(geojson, displayPath(filePath));
      })
  );
}

async function validateTrailSystemShards() {
  const trailSystemsDir = path.join(publicRoot, "data", "trail-systems");
  let entries = [];
  try {
    entries = await readdir(trailSystemsDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const systemDir = path.join(trailSystemsDir, entry.name);
    const scope = `public data shard ${entry.name}`;
    if (indexedTrailSystemIds.size && !indexedTrailSystemIds.has(entry.name)) {
      addError(scope, "orphan shard directory is not referenced by public/data/hikes-index.json");
    }
    const manifestPath = path.join(systemDir, "manifest.json");
    const sectionsIndexPath = path.join(systemDir, "sections-index.json");
    const routeGroupsPath = path.join(systemDir, "route-groups.json");
    const presetsPath = path.join(systemDir, "presets.json");

    for (const requiredPath of [manifestPath, sectionsIndexPath]) {
      if (!(await pathExists(requiredPath))) addError(scope, `missing ${path.basename(requiredPath)}`);
    }

    const manifest = await readJson(manifestPath, `${scope} manifest`);
    const sectionsIndex = await readJson(sectionsIndexPath, `${scope} sections-index`);
    const routeGroups = (await pathExists(routeGroupsPath)) ? await readJson(routeGroupsPath, `${scope} route-groups`) : [];
    const presets = (await pathExists(presetsPath)) ? await readJson(presetsPath, `${scope} presets`) : [];

    if (manifest?.id !== entry.name) addError(scope, `manifest ID "${manifest?.id}" does not match shard directory "${entry.name}"`);
    for (const field of ["sections", "routeGroups", "presets"]) {
      if (field in (manifest ?? {})) addError(scope, `manifest.json must not duplicate ${field}`);
    }
    if (!Array.isArray(sectionsIndex)) {
      addError(scope, "sections-index.json must be an array");
      continue;
    }
    if (!Array.isArray(routeGroups)) addError(scope, "route-groups.json must be an array");
    if (!Array.isArray(presets)) addError(scope, "presets.json must be an array");

    validateUnique(scope, "sections-index IDs", sectionsIndex.map((section) => section.id));
    const sectionIds = new Set(sectionsIndex.map((section) => section.id));

    for (const section of sectionsIndex) {
      if (!section.detailPath) addError(scope, `section ${section.id} is missing detailPath`);
      const detailPath = section.detailPath ? publicPath(section.detailPath) : null;
      if (!detailPath || !(await pathExists(detailPath))) {
        addError(scope, `section ${section.id} detail file is missing`);
        continue;
      }
      const detail = await readJson(detailPath, `${scope} section ${section.id}`);
      if (detail?.id !== section.id) addError(scope, `section detail ID "${detail?.id}" does not match index ID "${section.id}"`);
      if (detail?.trailSystemId !== entry.name) {
        addError(scope, `section ${section.id} trailSystemId "${detail.trailSystemId}" does not match "${entry.name}"`);
      }
      for (const field of ["sections", "routeGroups", "presets"]) {
        if (field in (detail ?? {})) addError(scope, `section ${section.id} detail must not duplicate ${field}`);
      }
    }

    for (const routeGroup of Array.isArray(routeGroups) ? routeGroups : []) {
      for (const sectionId of routeGroup.sectionIds ?? []) {
        if (!sectionIds.has(sectionId)) addError(scope, `route group ${routeGroup.id} references unknown section "${sectionId}"`);
      }
      for (const sectionId of routeGroup.connectsToSectionIds ?? []) {
        if (!sectionIds.has(sectionId)) addError(scope, `route group ${routeGroup.id} connects to unknown section "${sectionId}"`);
      }
    }
    for (const preset of Array.isArray(presets) ? presets : []) {
      if (!sectionIds.has(preset.startSectionId)) {
        addError(scope, `preset ${preset.id} references unknown start section "${preset.startSectionId}"`);
      }
      if (!sectionIds.has(preset.endSectionId)) {
        addError(scope, `preset ${preset.id} references unknown end section "${preset.endSectionId}"`);
      }
    }
  }
}

function validateKayakRouteGeojsonMetadata(geojson, scope, trip) {
  if (geojson?.type !== "FeatureCollection" || !Array.isArray(geojson.features) || geojson.features.length === 0) {
    addError(scope, "kayak route GeoJSON must be a non-empty FeatureCollection");
    return;
  }
  for (const [index, feature] of geojson.features.entries()) {
    const featureScope = `${scope} feature[${index}]`;
    const properties = feature?.properties ?? {};
    if (properties.activity !== "kayaking") addError(featureScope, 'activity must be "kayaking"');
    if (properties.itemType !== "kayak-trip") addError(featureScope, 'itemType must be "kayak-trip"');
    if (properties.id !== trip.id) addError(featureScope, `id "${properties.id}" does not match trip "${trip.id}"`);
    validateEnum(featureScope, "geometryStatus", properties.geometryStatus, allowedGeometryStatuses);
    validateEnum(featureScope, "mapConfidence", properties.mapConfidence, allowedMapConfidences);
    if (properties.navigationUse !== "not-for-navigation") addError(featureScope, 'navigationUse must remain "not-for-navigation"');
    if (typeof properties.warning !== "string") addError(featureScope, "not-for-navigation route features must include warning");
  }
}

function validateSourceShardRecord(record, scope) {
  if (!isObject(record)) {
    addError(scope, "source shard must be an object");
    return;
  }
  if (typeof record.id !== "string" || !record.id.trim()) addError(scope, "id is required");
}

async function readKayakSourceShards(kind) {
  const directory = path.join(projectRoot, "data", "source", "kayaking", kind);
  const scope = `data/source/kayaking/${kind}`;
  if (!(await pathExists(directory))) {
    addError(scope, "source shard directory is required");
    return [];
  }
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort((a, b) => a.localeCompare(b));
  if (!files.length) addError(scope, "source shard directory must contain JSON records");
  const records = [];
  for (const file of files) {
    const filePath = path.join(directory, file);
    const record = await readJson(filePath, `${scope}/${file}`);
    validateSourceShardRecord(record, `${scope}/${file}`);
    if (record?.id && file !== `${record.id}.json`) addError(`${scope}/${file}`, `filename must match id "${record.id}"`);
    records.push(record);
  }
  validateUnique(scope, "source shard IDs", records.map((record) => record?.id));
  return records;
}

function kayakSourceShardPath(kind, id) {
  return `data/source/kayaking/${kind}/${id}.json`;
}

function validateKayakManifestShardList(sourceShards, kind, records) {
  const manifestScope = `data/source/kayaking/source-manifest.json sourceShards.${kind}`;
  const manifestRecords = sourceShards?.[kind];
  if (!Array.isArray(manifestRecords)) {
    addError(manifestScope, "must be an array of source shard entries");
    return;
  }

  validateUnique(manifestScope, "manifest source shard IDs", manifestRecords.map((entry) => entry?.id));
  const manifestIds = new Set();
  for (const [index, entry] of manifestRecords.entries()) {
    const entryScope = `${manifestScope}[${index}]`;
    if (!isObject(entry)) {
      addError(entryScope, "manifest source shard entry must be an object");
      continue;
    }
    if (typeof entry.id !== "string" || !entry.id.trim()) {
      addError(entryScope, "id is required");
      continue;
    }
    manifestIds.add(entry.id);
    const expectedPath = kayakSourceShardPath(kind, entry.id);
    if (entry.path !== expectedPath) addError(entryScope, `path must be "${expectedPath}"`);
  }

  const recordIds = new Set(records.map((record) => record?.id).filter((id) => typeof id === "string"));
  for (const recordId of recordIds) {
    if (!manifestIds.has(recordId)) addError(manifestScope, `missing manifest entry for source shard "${recordId}"`);
  }
  for (const manifestId of manifestIds) {
    if (!recordIds.has(manifestId)) addError(manifestScope, `manifest entry "${manifestId}" does not have a source shard file`);
  }
}

async function validateKayakSourceShards(tripIds) {
  const sourceRoot = path.join(projectRoot, "data", "source", "kayaking");
  const sourceScope = "data/source/kayaking";
  const metadataPath = path.join(sourceRoot, "metadata.json");
  const manifestPath = path.join(sourceRoot, "source-manifest.json");
  let sourceShards = null;
  if (!(await pathExists(metadataPath))) addError(`${sourceScope}/metadata.json`, "metadata.json is required");
  else {
    const metadata = await readJson(metadataPath, `${sourceScope}/metadata.json`);
    if (typeof metadata?.generatedAt !== "string" || !metadata.generatedAt.trim()) addError(`${sourceScope}/metadata.json`, "generatedAt is required");
    if (typeof metadata?.status !== "string" || !metadata.status.trim()) addError(`${sourceScope}/metadata.json`, "status is required");
    if (!Array.isArray(metadata?.caveats)) addError(`${sourceScope}/metadata.json`, "caveats must be an array");
  }

  if (!(await pathExists(manifestPath))) addError(`${sourceScope}/source-manifest.json`, "source-manifest.json is required");
  else {
    const manifest = await readJson(manifestPath, `${sourceScope}/source-manifest.json`);
    sourceShards = manifest?.sourceShards;
    if (!isObject(sourceShards)) addError(`${sourceScope}/source-manifest.json`, "sourceShards metadata is required");
    for (const field of ["metadataPath", "routesPath", "facilitiesPath", "parkingPath"]) {
      const value = sourceShards?.[field];
      if (typeof value !== "string" || !value.startsWith("data/source/kayaking/")) {
        addError(`${sourceScope}/source-manifest.json`, `${field} must point at data/source/kayaking`);
      }
    }
  }

  const [routes, facilities, parking] = await Promise.all([
    readKayakSourceShards("routes"),
    readKayakSourceShards("facilities"),
    readKayakSourceShards("parking")
  ]);
  const routeIds = new Set(routes.map((route) => route?.id).filter((id) => typeof id === "string"));
  const facilityIds = new Set(facilities.map((facility) => facility?.id).filter((id) => typeof id === "string"));
  const parkingIds = new Set(parking.map((parkingRecord) => parkingRecord?.id).filter((id) => typeof id === "string"));
  validateKayakManifestShardList(sourceShards, "routes", routes);
  validateKayakManifestShardList(sourceShards, "facilities", facilities);
  validateKayakManifestShardList(sourceShards, "parking", parking);
  for (const parkingRecord of parking) {
    if (facilityIds.has(parkingRecord?.id)) {
      addError(
        "data/source/kayaking",
        `parking source shard "${parkingRecord.id}" must not be duplicated under data/source/kayaking/facilities`
      );
    }
  }
  for (const tripId of tripIds) {
    if (!routeIds.has(tripId)) addError("data/source/kayaking/routes", `missing source route shard for kayak trip "${tripId}"`);
  }
  if (routeIds.size !== tripIds.size) {
    for (const routeId of routeIds) {
      if (!tripIds.has(routeId)) addError("data/source/kayaking/routes", `route source shard "${routeId}" has no generated kayak trip`);
    }
  }
  return {
    routeIds,
    facilityIds,
    parkingIds,
    expectedRuntimeFacilityIds: new Set([...facilityIds, ...parkingIds])
  };
}

async function validateKayakTrip(trip, scope, { facilityIds = null } = {}) {
  if (!isObject(trip)) {
    addError(scope, "Kayak trip must be an object");
    return;
  }
  if (trip.activity !== "kayaking") addError(scope, 'activity must be "kayaking"');
  if (trip.itemType !== "kayak-trip") addError(scope, 'itemType must be "kayak-trip"');
  validateTripDurations(scope, trip.recommendedTimes);
  validateEnum(scope, "waterZone", trip.waterZone, allowedKayakWaterZones);
  validateEnum(scope, "exposureLevel", trip.exposureLevel, allowedKayakExposureLevels);
  validateEnum(scope, "research.routeConfidence", trip.research?.routeConfidence, allowedKayakRouteConfidences);
  if (trip.distanceKm !== null && !isFiniteNumber(trip.distanceKm)) addError(scope, "distanceKm must be a finite number or null");
  validateLatLon(scope, "map.center", trip.map?.center, { required: true });
  validateEnum(scope, "route.geometryStatus", trip.route?.geometryStatus, allowedGeometryStatuses);
  validateEnum(scope, "route.mapConfidence", trip.route?.mapConfidence, allowedMapConfidences);
  if (trip.route?.navigationUse !== "not-for-navigation") addError(scope, 'route.navigationUse must remain "not-for-navigation"');
  validateEnum(scope, "route.sourceFormat", trip.route?.sourceFormat, allowedRouteSourceFormats);
  if (typeof trip.route?.warning !== "string") addError(scope, "not-for-navigation routes must include route.warning");
  if (typeof trip.research?.sourceSnapshotPath !== "string" || !trip.research.sourceSnapshotPath.startsWith("data/source/kayaking/routes/")) {
    addError(scope, "research.sourceSnapshotPath must point at an app-owned kayak route source shard");
  } else {
    const sourcePath = projectPath(trip.research.sourceSnapshotPath);
    if (!sourcePath || !(await pathExists(sourcePath))) addError(scope, `research.sourceSnapshotPath does not exist: ${trip.research.sourceSnapshotPath}`);
  }
  if (!Array.isArray(trip.facilityNotes)) addError(scope, "facilityNotes must be an array");
  for (const field of ["facilityRefs", "rentalRefs"]) {
    if (!Array.isArray(trip[field])) addError(scope, `${field} must be an array`);
    for (const facilityId of trip[field] ?? []) {
      if (facilityIds && !facilityIds.has(facilityId)) addError(scope, `${field} references unknown facility "${facilityId}"`);
    }
  }
  if (trip.route?.geojsonPath) {
    const routePath = publicPath(trip.route.geojsonPath);
    if (!routePath || !(await pathExists(routePath))) addError(scope, `route GeoJSON does not exist: ${trip.route.geojsonPath}`);
    else {
      const geojson = await loadRouteGeojson(trip.route.geojsonPath, scope);
      validateKayakRouteGeojsonMetadata(geojson, `${scope} ${trip.route.geojsonPath}`, trip);
    }
  } else {
    addError(scope, "route.geojsonPath is required");
  }
}

async function validateKayakingOverview(tripIds) {
  const overviewPath = path.join(publicRoot, "data", "overviews", "kayaking.geojson");
  const overviewScope = "public/data/overviews/kayaking.geojson";
  if (!(await pathExists(overviewPath))) {
    addError(overviewScope, "Kayaking overview GeoJSON is required when kayak runtime data exists");
    return;
  }
  const overview = await readJson(overviewPath, overviewScope);
  if (overview?.generatedFrom !== "data/source/kayaking/source-manifest.json") {
    addError(overviewScope, 'generatedFrom must be "data/source/kayaking/source-manifest.json"');
  }
  validateGeojson(overview, overviewScope);
  if (overview?.type !== "FeatureCollection" || !Array.isArray(overview.features)) {
    addError(overviewScope, "Kayaking overview must be a FeatureCollection");
    return;
  }
  const featureIds = new Set();
  for (const [index, feature] of overview.features.entries()) {
    const featureScope = `${overviewScope} feature[${index}]`;
    const properties = feature?.properties ?? {};
    const id = properties.id ?? feature?.id;
    featureIds.add(id);
    if (!tripIds.has(id)) addError(featureScope, `references unknown kayak trip "${id}"`);
    if (properties.activity !== "kayaking") addError(featureScope, 'activity must be "kayaking"');
    if (properties.itemType !== "kayak-trip") addError(featureScope, 'itemType must be "kayak-trip"');
    for (const field of ["searchText", "normalizedSearchText", "tags"]) {
      if (field in properties) addError(featureScope, `${field} must not be copied into the compact kayaking overview`);
    }
    validateEnum(featureScope, "waterZone", properties.waterZone, allowedKayakWaterZones);
    validateEnum(featureScope, "exposureLevel", properties.exposureLevel, allowedKayakExposureLevels);
    validateEnum(featureScope, "routeConfidence", properties.routeConfidence, allowedKayakRouteConfidences);
    validateEnum(featureScope, "geometryStatus", properties.geometryStatus, allowedGeometryStatuses);
    validateEnum(featureScope, "mapConfidence", properties.mapConfidence, allowedMapConfidences);
    if (typeof properties.archipelagoRegion !== "string" || !properties.archipelagoRegion.trim()) {
      addError(featureScope, "archipelagoRegion is required");
    }
    if (typeof properties.hasFollowup !== "boolean") addError(featureScope, "hasFollowup must be a boolean");
    if (properties.navigationUse !== "not-for-navigation") addError(featureScope, 'navigationUse must remain "not-for-navigation"');
    if (typeof properties.warning !== "string") addError(featureScope, "not-for-navigation overview features must include warning");
  }
  for (const tripId of tripIds) {
    if (!featureIds.has(tripId)) addError(overviewScope, `missing feature for kayak trip "${tripId}"`);
  }
}

async function validateKayakRuntimeData() {
  const kayakTripsDir = path.join(publicRoot, "data", "kayak-trips");
  const kayakFacilitiesPath = path.join(publicRoot, "data", "kayak-facilities.json");
  const hasTripsDir = await pathExists(kayakTripsDir);
  const hasFacilities = await pathExists(kayakFacilitiesPath);
  if (!hasTripsDir && !hasFacilities) {
    addWarning("kayaking", "No kayak runtime data found; kayak validation scaffolding is inactive.");
    return;
  }

  const facilities = hasFacilities ? await readJson(kayakFacilitiesPath, "public/data/kayak-facilities.json") : [];
  const facilityIds = new Set();
  const facilitiesById = new Map();
  if (Array.isArray(facilities)) {
    validateUnique("public/data/kayak-facilities.json", "kayak facility IDs", facilities.map((facility) => facility.id));
    for (const facility of facilities) {
      facilityIds.add(facility.id);
      facilitiesById.set(facility.id, facility);
      if (facility.activity !== "kayaking") addError(`kayak facility ${facility.id}`, 'activity must be "kayaking"');
      validateEnum(`kayak facility ${facility.id}`, "type", facility.type, allowedKayakFacilityTypes);
      if (typeof facility.description !== "string") addError(`kayak facility ${facility.id}`, "description must be a string");
      validateLatLon(`kayak facility ${facility.id}`, "coordinates", facility.coordinates);
      for (const routeId of facility.routeIds ?? []) {
        if (typeof routeId !== "string" || !routeId.trim()) addError(`kayak facility ${facility.id}`, "routeIds must contain route IDs");
      }
    }
  } else {
    addError("public/data/kayak-facilities.json", "Expected an array");
  }

  if (!hasTripsDir) return;
  const tripFiles = (await readdir(kayakTripsDir)).filter((file) => file.endsWith(".json")).sort((a, b) => a.localeCompare(b));
  const tripIds = new Set();
  const trips = [];
  for (const file of tripFiles) {
    const tripPath = path.join(kayakTripsDir, file);
    const trip = await readJson(tripPath);
    tripIds.add(trip?.id);
    trips.push({ trip, file });
  }
  validateUnique("public/data/kayak-trips", "kayak trip IDs", trips.map(({ trip }) => trip?.id));
  const kayakSource = await validateKayakSourceShards(tripIds);
  if (kayakSource.routeIds.size && tripFiles.length !== kayakSource.routeIds.size) {
    addError(
      "public/data/kayak-trips",
      `Expected ${kayakSource.routeIds.size} kayak trip detail files from source route shards, found ${tripFiles.length}`
    );
  }
  if (Array.isArray(facilities) && kayakSource.expectedRuntimeFacilityIds.size) {
    if (facilities.length !== kayakSource.expectedRuntimeFacilityIds.size) {
      addError(
        "public/data/kayak-facilities.json",
        `Expected ${kayakSource.expectedRuntimeFacilityIds.size} facility records from source facility/parking shards, found ${facilities.length}`
      );
    }
    for (const expectedFacilityId of kayakSource.expectedRuntimeFacilityIds) {
      if (!facilityIds.has(expectedFacilityId)) {
        addError("public/data/kayak-facilities.json", `missing facility record generated from source shard "${expectedFacilityId}"`);
      }
    }
    for (const facilityId of facilityIds) {
      if (!kayakSource.expectedRuntimeFacilityIds.has(facilityId)) {
        addError("public/data/kayak-facilities.json", `facility record "${facilityId}" has no source facility or parking shard`);
      }
    }
    for (const parkingId of kayakSource.parkingIds) {
      const facility = facilitiesById.get(parkingId);
      const isParking = facility?.type === "parking" || (facility?.categories ?? []).includes("parking");
      if (!isParking) {
        addError("public/data/kayak-facilities.json", `source parking shard "${parkingId}" is not marked as parking in runtime facilities`);
      }
    }
  }

  if (Array.isArray(facilities)) {
    for (const facility of facilities) {
      for (const routeId of facility.routeIds ?? []) {
        if (!tripIds.has(routeId)) addError(`kayak facility ${facility.id}`, `routeIds references unknown kayak trip "${routeId}"`);
      }
    }
  }

  for (const { trip, file } of trips) {
    const scope = `kayak trip ${trip?.id ?? file}`;
    await validateKayakTrip(trip, scope, { facilityIds });
  }
  await validateKayakingOverview(tripIds);

  const libraryIndex = await readJson(path.join(publicRoot, "data", "library-index.json"), "public/data/library-index.json");
  if (Array.isArray(libraryIndex)) {
    const kayakItems = libraryIndex.filter((item) => item.activity === "kayaking");
    if (kayakItems.length !== tripFiles.length) {
      addError("public/data/library-index.json", `Expected ${tripFiles.length} kayak-trip index records, found ${kayakItems.length}`);
    }
    for (const tripId of tripIds) {
      if (!kayakItems.some((item) => item.id === tripId)) {
        addError("public/data/library-index.json", `missing kayak-trip index record for "${tripId}"`);
      }
    }
  }
}

function groupMessages(messages) {
  const grouped = new Map();
  for (const { scope, message } of messages) {
    const list = grouped.get(scope) ?? [];
    list.push(message);
    grouped.set(scope, list);
  }
  return grouped;
}

function printGroupedMessages(grouped, writer) {
  const entries = [...grouped.entries()];
  const maxEntries = 60;
  for (const [scope, messages] of entries.slice(0, maxEntries)) {
    writer(`- ${scope}`);
    for (const message of messages) writer(`  - ${message}`);
  }
  if (entries.length > maxEntries) {
    writer(`- ... ${entries.length - maxEntries} more scope${entries.length - maxEntries === 1 ? "" : "s"}`);
  }
}

function printResults() {
  if (errors.length) {
    console.error(`Data validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}.`);
    printGroupedMessages(groupMessages(errors), console.error);
  } else {
    console.log("Data validation passed with no hard failures.");
  }

  if (warnings.length) {
    console.log(`Warnings (${warnings.length}, non-blocking):`);
    printGroupedMessages(groupMessages(warnings), console.log);
  }
}

await validateSourceData();
await validatePublicIndex();
await validateLibraryIndex();
await validateCommuteCache();
await validateResearchProgress();
await validateAllRouteFiles();
await validateTrailSystemShards();
await validateKayakRuntimeData();

printResults();
process.exitCode = errors.length ? 1 : 0;
