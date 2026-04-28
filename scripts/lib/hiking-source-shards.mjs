import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function hikingSourceDir(projectRoot) {
  return path.join(projectRoot, "data", "source", "hiking");
}

function systemSourceDir(projectRoot, trailSystemId) {
  return path.join(hikingSourceDir(projectRoot), trailSystemId);
}

async function pathExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

function toManifest(trailSystem) {
  const { sections: _sections, routeGroups: _routeGroups, presets: _presets, ...manifest } = trailSystem;
  return manifest;
}

function assembleTrailSystem({ manifest, sections, routeGroups, presets }) {
  return {
    ...manifest,
    sections,
    ...(routeGroups.length ? { routeGroups } : {}),
    presets
  };
}

export async function readHikingSourceData({ projectRoot = process.cwd() } = {}) {
  const root = hikingSourceDir(projectRoot);
  const entries = (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  return Promise.all(
    entries.map(async (entry) => {
      const systemDir = path.join(root, entry.name);
      const sectionsDir = path.join(systemDir, "sections");
      const sectionsIndexPath = path.join(systemDir, "sections-index.json");
      const routeGroupsPath = path.join(systemDir, "route-groups.json");
      const presetsPath = path.join(systemDir, "presets.json");
      const [manifest, sectionFiles, sectionIds, routeGroups, presets] = await Promise.all([
        readJson(path.join(systemDir, "manifest.json")),
        readdir(sectionsDir).catch(() => []),
        pathExists(sectionsIndexPath).then((exists) => (exists ? readJson(sectionsIndexPath) : [])),
        pathExists(routeGroupsPath).then((exists) => (exists ? readJson(routeGroupsPath) : [])),
        pathExists(presetsPath).then((exists) => (exists ? readJson(presetsPath) : []))
      ]);
      const indexedSectionFiles = Array.isArray(sectionIds) ? sectionIds.map((sectionId) => `${sectionId}.json`) : [];
      const orderedSectionFiles = indexedSectionFiles.length
        ? indexedSectionFiles
        : sectionFiles.filter((file) => file.endsWith(".json")).sort((a, b) => a.localeCompare(b));

      const sections = await Promise.all(
        orderedSectionFiles.map((file) => readJson(path.join(sectionsDir, file)))
      );

      return assembleTrailSystem({
        manifest,
        sections,
        routeGroups: Array.isArray(routeGroups) ? routeGroups : [],
        presets: Array.isArray(presets) ? presets : []
      });
    })
  );
}

export async function writeTrailSystemSourceShards(trailSystem, { projectRoot = process.cwd() } = {}) {
  const systemDir = systemSourceDir(projectRoot, trailSystem.id);
  const sectionsDir = path.join(systemDir, "sections");
  const sections = trailSystem.sections ?? [];

  await mkdir(sectionsDir, { recursive: true });
  await Promise.all([
    writeJson(path.join(systemDir, "manifest.json"), toManifest(trailSystem)),
    writeJson(path.join(systemDir, "sections-index.json"), sections.map((section) => section.id)),
    writeJson(path.join(systemDir, "route-groups.json"), trailSystem.routeGroups ?? []),
    writeJson(path.join(systemDir, "presets.json"), trailSystem.presets ?? []),
    ...sections.map((section) => writeJson(path.join(sectionsDir, `${section.id}.json`), section))
  ]);

  await removeUnexpectedJsonFiles(sectionsDir, new Set(sections.map((section) => `${section.id}.json`)));
}

export async function writeHikingSourceData(trailSystems, { projectRoot = process.cwd() } = {}) {
  const root = hikingSourceDir(projectRoot);
  const systemIds = new Set(trailSystems.map((trailSystem) => trailSystem.id));
  await mkdir(root, { recursive: true });

  await Promise.all(
    (await readdir(root, { withFileTypes: true }).catch(() => []))
      .filter((entry) => entry.isDirectory() && !systemIds.has(entry.name))
      .map((entry) => rm(path.join(root, entry.name), { recursive: true, force: true }))
  );

  await Promise.all(trailSystems.map((trailSystem) => writeTrailSystemSourceShards(trailSystem, { projectRoot })));
}
