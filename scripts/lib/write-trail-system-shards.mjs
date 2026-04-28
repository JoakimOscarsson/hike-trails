import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function runtimePath(...parts) {
  return `/data/trail-systems/${parts.join("/")}`;
}

function omitKeys(value, keys) {
  const next = { ...value };
  for (const key of keys) delete next[key];
  return next;
}

function toManifest(trailSystem) {
  return {
    ...omitKeys(trailSystem, ["sections", "routeGroups", "presets"]),
    manifestPath: runtimePath(trailSystem.id, "manifest.json"),
    sectionsIndexPath: runtimePath(trailSystem.id, "sections-index.json"),
    routeGroupsPath: runtimePath(trailSystem.id, "route-groups.json"),
    presetsPath: runtimePath(trailSystem.id, "presets.json")
  };
}

function toSectionIndexItem(trailSystemId, section) {
  return {
    id: section.id,
    stageNumber: section.stageNumber,
    name: section.name,
    from: section.from,
    to: section.to,
    distanceKm: section.distanceKm,
    estimatedTime: section.estimatedTime,
    endpointCoordinates: section.endpointCoordinates,
    route: section.route,
    detailPath: runtimePath(trailSystemId, "sections", `${section.id}.json`)
  };
}

function toSectionDetail(trailSystemId, section) {
  return {
    trailSystemId,
    ...section
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function removeUnexpectedJsonFiles(directory, expectedFiles) {
  const files = await readdir(directory).catch(() => []);
  await Promise.all(
    files
      .filter((file) => file.endsWith(".json") && !expectedFiles.has(file))
      .map((file) => rm(path.join(directory, file), { force: true }))
  );
}

export async function writeTrailSystemShards(trailSystem, publicTrailSystemsDir) {
  const systemDir = path.join(publicTrailSystemsDir, trailSystem.id);
  const sectionsDir = path.join(systemDir, "sections");
  const sections = trailSystem.sections ?? [];

  await mkdir(sectionsDir, { recursive: true });

  await Promise.all([
    writeJson(path.join(systemDir, "manifest.json"), toManifest(trailSystem)),
    writeJson(path.join(systemDir, "sections-index.json"), sections.map((section) => toSectionIndexItem(trailSystem.id, section))),
    writeJson(path.join(systemDir, "route-groups.json"), trailSystem.routeGroups ?? []),
    writeJson(path.join(systemDir, "presets.json"), trailSystem.presets ?? [])
  ]);

  await Promise.all(
    sections.map((section) => writeJson(path.join(sectionsDir, `${section.id}.json`), toSectionDetail(trailSystem.id, section)))
  );

  await removeUnexpectedJsonFiles(sectionsDir, new Set(sections.map((section) => `${section.id}.json`)));
}

export function trailSystemShardIndexPaths(trailSystemId) {
  return {
    manifestPath: runtimePath(trailSystemId, "manifest.json"),
    sectionsIndexPath: runtimePath(trailSystemId, "sections-index.json"),
    routeGroupsPath: runtimePath(trailSystemId, "route-groups.json"),
    presetsPath: runtimePath(trailSystemId, "presets.json")
  };
}
