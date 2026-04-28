import { readFile } from "node:fs/promises";
import { readHikingSourceData } from "./lib/hiking-source-shards.mjs";

const trailSystem = (await readHikingSourceData()).find((system) => system.id === "sormlandsleden");
if (!trailSystem) throw new Error("Could not find sormlandsleden in data/source/hiking");

const sections = trailSystem.sections ?? [];
const routeGroups = trailSystem.routeGroups ?? [];
const sectionIds = new Set(sections.map((section) => section.id));
const sectionById = new Map(sections.map((section) => [section.id, section]));
const groupEntries = routeGroups.flatMap((group) =>
  (group.sectionIds ?? []).map((sectionId) => ({
    groupId: group.id,
    sectionId
  }))
);

function haversineDistanceKm(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const radiusKm = 6371.0088;
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLon = toRadians(b[0] - a[0]);
  const angle =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a[1])) * Math.cos(toRadians(b[1])) * Math.sin(deltaLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(angle), Math.sqrt(1 - angle));
}

async function routeCoordinates(section) {
  if (!section.route?.geojsonPath) return [];
  const geojson = JSON.parse(await readFile(`public${section.route.geojsonPath}`, "utf8"));
  return (geojson.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type === "LineString") return feature.geometry.coordinates ?? [];
    if (feature.geometry?.type === "MultiLineString") return (feature.geometry.coordinates ?? []).flat();
    return [];
  });
}

function sampled(coordinates) {
  if (coordinates.length <= 120) return coordinates;
  const interval = Math.ceil(coordinates.length / 120);
  return coordinates.filter((_, index) => index % interval === 0);
}

function minDistanceBetweenRoutes(routeA, routeB) {
  const sampledA = sampled(routeA);
  const sampledB = sampled(routeB);
  let minDistance = Infinity;
  for (const a of sampledA) {
    for (const b of sampledB) {
      minDistance = Math.min(minDistance, haversineDistanceKm(a, b));
    }
  }
  return minDistance;
}

const groupedIds = new Set(groupEntries.map((entry) => entry.sectionId));
const duplicateIds = [...new Set(groupEntries.map((entry) => entry.sectionId))].filter(
  (sectionId) => groupEntries.filter((entry) => entry.sectionId === sectionId).length > 1
);
const missingSections = sections
  .filter((section) => !groupedIds.has(section.id))
  .map((section) => ({ id: section.id, stage: section.stageNumber, name: section.name }));
const unknownSections = groupEntries
  .filter((entry) => !sectionIds.has(entry.sectionId))
  .map((entry) => ({ groupId: entry.groupId, sectionId: entry.sectionId }));
const branchSections = sections.filter((section) => String(section.stageNumber).includes(":"));
const groupedBranchSections = branchSections.filter((section) => groupedIds.has(section.id));
const groupsWithoutNotice = routeGroups.filter((group) => !group.notice || !group.kind || !(group.sectionIds ?? []).length);
const nonMainGroupsWithoutConnections = routeGroups.filter(
  (group) => group.kind !== "mainline" && !(group.connectsToSectionIds ?? []).length
);
const unknownConnections = routeGroups.flatMap((group) =>
  (group.connectsToSectionIds ?? [])
    .filter((sectionId) => !sectionIds.has(sectionId))
    .map((sectionId) => ({ groupId: group.id, sectionId }))
);
const undrawnSections = sections
  .filter((section) => !section.route?.geojsonPath || section.route?.status !== "ready")
  .map((section) => ({ id: section.id, stage: section.stageNumber, name: section.name }));
const emptyRouteSections = [];
const routeCoordinatesBySectionId = new Map();
const acceptedDistantConnectionGroups = new Map([
  [
    "access-vagnharad-stage-55",
    "Sörmlandsleden states this connector was rerouted in spring 2026 and that the updated map is still pending; the route is drawn from the best available official GPX data for visibility."
  ]
]);

for (const section of sections) {
  const coordinates = await routeCoordinates(section);
  routeCoordinatesBySectionId.set(section.id, coordinates);
  if (!coordinates.length) {
    emptyRouteSections.push({ id: section.id, stage: section.stageNumber, name: section.name });
  }
}

const distantConnectionGroups = [];
for (const group of routeGroups.filter((candidate) => candidate.kind !== "mainline")) {
  const groupRoute = (group.sectionIds ?? []).flatMap((sectionId) => routeCoordinatesBySectionId.get(sectionId) ?? []);
  const connectedRoute = (group.connectsToSectionIds ?? []).flatMap((sectionId) => routeCoordinatesBySectionId.get(sectionId) ?? []);
  const distanceKm = groupRoute.length && connectedRoute.length ? minDistanceBetweenRoutes(groupRoute, connectedRoute) : Infinity;
  if (!Number.isFinite(distanceKm) || distanceKm > 2.2) {
    distantConnectionGroups.push({
      id: group.id,
      kind: group.kind,
      connectsTo: (group.connectsToSectionIds ?? []).map((sectionId) => sectionById.get(sectionId)?.stageNumber ?? sectionId),
      minDistanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(2)) : null,
      acceptedReason: acceptedDistantConnectionGroups.get(group.id)
    });
  }
}

const unacceptedDistantConnectionGroups = distantConnectionGroups.filter(
  (group) => !acceptedDistantConnectionGroups.has(group.id)
);

console.log(
  JSON.stringify(
    {
      sections: sections.length,
      routeGroups: routeGroups.length,
      branchSections: branchSections.length,
      groupedBranchSections: groupedBranchSections.length,
      missingSections,
      duplicateIds,
      unknownSections,
      groupsWithoutNotice: groupsWithoutNotice.map((group) => group.id),
      nonMainGroupsWithoutConnections: nonMainGroupsWithoutConnections.map((group) => group.id),
      unknownConnections,
      undrawnSections,
      emptyRouteSections,
      distantConnectionGroups,
      unacceptedDistantConnectionGroups,
      ok:
        missingSections.length === 0 &&
        duplicateIds.length === 0 &&
        unknownSections.length === 0 &&
        groupsWithoutNotice.length === 0 &&
        nonMainGroupsWithoutConnections.length === 0 &&
        unknownConnections.length === 0 &&
        undrawnSections.length === 0 &&
        emptyRouteSections.length === 0 &&
        unacceptedDistantConnectionGroups.length === 0 &&
        groupedBranchSections.length === branchSections.length
    },
    null,
    2
  )
);
