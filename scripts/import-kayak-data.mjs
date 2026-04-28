import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeLibraryIndex, writeActivityLibraryIndex } from "./lib/library-index-fragments.mjs";
import { buildKayakOverview, normalizeKayakFacility, normalizeKayakRoute } from "./lib/normalize-kayak.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = path.resolve(path.join(scriptDir, ".."));
const sourceFiles = [
  "kayak-map-ready.dataset.json",
  "kayak-route-corridors.geojson",
  "kayak-route-points.geojson",
  "kayak-facilities.geojson",
  "kayak-parking.geojson",
  "map-readiness-audit.json"
];
const sourceManifestFile = "source-manifest.json";
const sourceMetadataFile = "metadata.json";
const sourceShardDirs = {
  routes: "routes",
  facilities: "facilities",
  parking: "parking"
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function pathExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cleanGeneratedFiles(directory, expectedFiles, extension) {
  await mkdir(directory, { recursive: true });
  const files = await readdir(directory).catch(() => []);
  await Promise.all(
    files
      .filter((file) => file.endsWith(extension) && !expectedFiles.has(file))
      .map((file) => rm(path.join(directory, file), { force: true }))
  );
}

function relativePath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath);
}

function sourceShardPath(projectRoot, kayakSourceDir, kind, id) {
  return relativePath(projectRoot, path.join(kayakSourceDir, sourceShardDirs[kind], `${id}.json`));
}

async function readJsonFiles(directory) {
  const files = (await readdir(directory).catch(() => []))
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  return Promise.all(files.map((file) => readJson(path.join(directory, file))));
}

async function writeSourceShards({ projectRoot, kayakSourceDir, snapshotDir }) {
  const dataset = await readJson(path.join(snapshotDir, "kayak-map-ready.dataset.json"));
  const routesDir = path.join(kayakSourceDir, sourceShardDirs.routes);
  const facilitiesDir = path.join(kayakSourceDir, sourceShardDirs.facilities);
  const parkingDir = path.join(kayakSourceDir, sourceShardDirs.parking);

  await mkdir(routesDir, { recursive: true });
  await mkdir(facilitiesDir, { recursive: true });
  await mkdir(parkingDir, { recursive: true });

  const parking = (dataset.parking ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
  const parkingIds = new Set(parking.map((record) => record.id));
  const routes = (dataset.routes ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
  const facilities = (dataset.facilities ?? []).filter((facility) => !parkingIds.has(facility.id)).sort((a, b) => a.id.localeCompare(b.id));

  await cleanGeneratedFiles(routesDir, new Set(routes.map((route) => `${route.id}.json`)), ".json");
  await cleanGeneratedFiles(facilitiesDir, new Set(facilities.map((facility) => `${facility.id}.json`)), ".json");
  await cleanGeneratedFiles(parkingDir, new Set(parking.map((record) => `${record.id}.json`)), ".json");

  await Promise.all([
    ...routes.map((route) => writeFile(path.join(routesDir, `${route.id}.json`), `${JSON.stringify(route, null, 2)}\n`)),
    ...facilities.map((facility) => writeFile(path.join(facilitiesDir, `${facility.id}.json`), `${JSON.stringify(facility, null, 2)}\n`)),
    ...parking.map((record) => writeFile(path.join(parkingDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`))
  ]);

  await writeFile(
    path.join(kayakSourceDir, sourceMetadataFile),
    `${JSON.stringify(
      {
        generatedAt: dataset.generatedAt,
        status: dataset.status,
        caveats: dataset.caveats ?? [],
        sourceSnapshotPath: relativePath(projectRoot, path.join(snapshotDir, "kayak-map-ready.dataset.json"))
      },
      null,
      2
    )}\n`
  );

  return {
    routes: routes.map((route) => ({ id: route.id, path: sourceShardPath(projectRoot, kayakSourceDir, "routes", route.id) })),
    facilities: facilities.map((facility) => ({ id: facility.id, path: sourceShardPath(projectRoot, kayakSourceDir, "facilities", facility.id) })),
    parking: parking.map((record) => ({ id: record.id, path: sourceShardPath(projectRoot, kayakSourceDir, "parking", record.id) }))
  };
}

async function sourceShardState(kayakSourceDir) {
  const metadataPath = path.join(kayakSourceDir, sourceMetadataFile);
  const routesDir = path.join(kayakSourceDir, sourceShardDirs.routes);
  const facilitiesDir = path.join(kayakSourceDir, sourceShardDirs.facilities);
  const parkingDir = path.join(kayakSourceDir, sourceShardDirs.parking);
  const hasMetadata = await pathExists(metadataPath);
  const [routes, facilities, parking] = await Promise.all([readdir(routesDir).catch(() => []), readdir(facilitiesDir).catch(() => []), readdir(parkingDir).catch(() => [])]);
  const jsonCounts = {
    routes: routes.filter((file) => file.endsWith(".json")).length,
    facilities: facilities.filter((file) => file.endsWith(".json")).length,
    parking: parking.filter((file) => file.endsWith(".json")).length
  };
  return {
    hasMetadata,
    ...jsonCounts,
    hasAny: hasMetadata || jsonCounts.routes > 0 || jsonCounts.facilities > 0 || jsonCounts.parking > 0,
    isComplete: hasMetadata && jsonCounts.routes > 0 && jsonCounts.facilities > 0 && jsonCounts.parking > 0
  };
}

async function loadSourceShards({ projectRoot, kayakSourceDir }) {
  const metadata = await readJson(path.join(kayakSourceDir, sourceMetadataFile));
  const routesDir = path.join(kayakSourceDir, sourceShardDirs.routes);
  const facilitiesDir = path.join(kayakSourceDir, sourceShardDirs.facilities);
  const parkingDir = path.join(kayakSourceDir, sourceShardDirs.parking);
  const [routes, facilities, parking] = await Promise.all([readJsonFiles(routesDir), readJsonFiles(facilitiesDir), readJsonFiles(parkingDir)]);

  return {
    generatedAt: metadata.generatedAt,
    status: metadata.status,
    caveats: metadata.caveats ?? [],
    generatedFrom: relativePath(projectRoot, path.join(kayakSourceDir, sourceManifestFile)),
    routes: routes.map((route) => ({
      ...route,
      sourceShardPath: sourceShardPath(projectRoot, kayakSourceDir, "routes", route.id)
    })),
    facilities: facilities.map((facility) => ({
      ...facility,
      sourceShardPath: sourceShardPath(projectRoot, kayakSourceDir, "facilities", facility.id)
    })),
    parking: parking.map((record) => ({
      ...record,
      sourceShardPath: sourceShardPath(projectRoot, kayakSourceDir, "parking", record.id)
    }))
  };
}

async function snapshotSource({ projectRoot, refreshSourceSnapshot }) {
  const researchMapdataDir = path.join(projectRoot, "research", "stockholm-kayak-archipelago-research", "mapdata");
  const kayakSourceDir = path.join(projectRoot, "data", "source", "kayaking");
  const snapshotDir = path.join(kayakSourceDir, "source-snapshot");
  await mkdir(snapshotDir, { recursive: true });

  const copiedFiles = [];
  for (const file of sourceFiles) {
    const sourcePath = path.join(researchMapdataDir, file);
    const targetPath = path.join(snapshotDir, file);
    if (refreshSourceSnapshot || !(await pathExists(targetPath))) await copyFile(sourcePath, targetPath);
    copiedFiles.push({
      file,
      sourcePath: path.relative(projectRoot, sourcePath),
      snapshotPath: path.relative(projectRoot, targetPath)
    });
  }

  const shardState = await sourceShardState(kayakSourceDir);
  if (!refreshSourceSnapshot && shardState.hasAny && !shardState.isComplete) {
    throw new Error(
      [
        "Kayak source shards are incomplete; normal import will not overwrite reviewable source shards.",
        `Found metadata=${shardState.hasMetadata}, routes=${shardState.routes}, facilities=${shardState.facilities}, parking=${shardState.parking}.`,
        "Restore the missing shard files or run npm run data:kayak:import -- --refresh-source intentionally."
      ].join(" ")
    );
  }
  const wroteShards = refreshSourceSnapshot || !shardState.hasAny;
  const sourceShards = wroteShards
    ? await writeSourceShards({ projectRoot, kayakSourceDir, snapshotDir })
    : {
        routes: (await readJsonFiles(path.join(kayakSourceDir, sourceShardDirs.routes))).map((route) => ({
          id: route.id,
          path: sourceShardPath(projectRoot, kayakSourceDir, "routes", route.id)
        })),
        facilities: (await readJsonFiles(path.join(kayakSourceDir, sourceShardDirs.facilities))).map((facility) => ({
          id: facility.id,
          path: sourceShardPath(projectRoot, kayakSourceDir, "facilities", facility.id)
        })),
        parking: (await readJsonFiles(path.join(kayakSourceDir, sourceShardDirs.parking))).map((record) => ({
          id: record.id,
          path: sourceShardPath(projectRoot, kayakSourceDir, "parking", record.id)
        }))
      };

  await writeFile(
    path.join(kayakSourceDir, sourceManifestFile),
    `${JSON.stringify(
      {
        importedFrom: "research/stockholm-kayak-archipelago-research/mapdata",
        importMode: refreshSourceSnapshot ? "refreshed" : "snapshot-if-missing",
        files: copiedFiles,
        sourceShards: {
          mode: wroteShards ? "bootstrapped-from-snapshot" : "existing-reviewable-shards",
          metadataPath: relativePath(projectRoot, path.join(kayakSourceDir, sourceMetadataFile)),
          routesPath: relativePath(projectRoot, path.join(kayakSourceDir, sourceShardDirs.routes)),
          facilitiesPath: relativePath(projectRoot, path.join(kayakSourceDir, sourceShardDirs.facilities)),
          parkingPath: relativePath(projectRoot, path.join(kayakSourceDir, sourceShardDirs.parking)),
          routes: sourceShards.routes,
          facilities: sourceShards.facilities,
          parking: sourceShards.parking
        }
      },
      null,
      2
    )}\n`
  );

  await writeFile(
    path.join(kayakSourceDir, "README.md"),
    [
      "# Kayaking Source Snapshot",
      "",
      "This directory contains app-owned import snapshots derived from `research/stockholm-kayak-archipelago-research/mapdata/`.",
      "",
      "`routes/`, `facilities/`, `parking/`, and `metadata.json` are the reviewable app-owned source shards used by the importer.",
      "Normal `npm run data:build` reads those shards and does not overwrite them once they exist.",
      "Run `npm run data:kayak:import -- --refresh-source` only when intentionally refreshing the raw snapshot and bootstrapping shards from research input again.",
      "",
      "Runtime code must read generated files under `public/data/` and `public/routes/`, not this source snapshot or the research workspace directly.",
      "",
      "The initial kayak corridors are approximate waypoint corridors and remain `not-for-navigation` until upgraded with verified route geometry.",
      ""
    ].join("\n")
  );

  return { kayakSourceDir, snapshotDir };
}

function mergeFacilities(dataset, routeIds) {
  const byId = new Map();
  for (const record of dataset.facilities ?? []) {
    if (!record?.id || byId.has(record.id)) continue;
    byId.set(record.id, normalizeKayakFacility(record, routeIds));
  }
  for (const record of dataset.parking ?? []) {
    if (!record?.id) continue;
    byId.set(record.id, normalizeKayakFacility(record, routeIds));
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function importKayakData({ projectRoot = defaultProjectRoot, refreshSourceSnapshot = false, composeIndex = true } = {}) {
  const { kayakSourceDir } = await snapshotSource({ projectRoot, refreshSourceSnapshot });
  const publicDataDir = path.join(projectRoot, "public", "data");
  const publicKayakTripsDir = path.join(publicDataDir, "kayak-trips");
  const publicRoutesKayakingDir = path.join(projectRoot, "public", "routes", "kayaking");
  const publicOverviewsDir = path.join(publicDataDir, "overviews");

  const dataset = await loadSourceShards({ projectRoot, kayakSourceDir });
  const routeIds = new Set((dataset.routes ?? []).map((route) => route.id));
  const facilityIds = new Set([...(dataset.facilities ?? []), ...(dataset.parking ?? [])].map((facility) => facility.id));
  const normalizedRoutes = (dataset.routes ?? []).map((route) => normalizeKayakRoute(route, { dataset, facilityIds }));
  const facilities = mergeFacilities(dataset, routeIds);

  await mkdir(publicKayakTripsDir, { recursive: true });
  await mkdir(publicRoutesKayakingDir, { recursive: true });
  await mkdir(publicOverviewsDir, { recursive: true });
  await cleanGeneratedFiles(publicKayakTripsDir, new Set(normalizedRoutes.map(({ detail }) => `${detail.id}.json`)), ".json");
  await cleanGeneratedFiles(publicRoutesKayakingDir, new Set(normalizedRoutes.map(({ detail }) => `${detail.id}.geojson`)), ".geojson");

  await Promise.all(
    normalizedRoutes.map(async ({ detail, routeGeoJSON }) => {
      await writeFile(path.join(publicKayakTripsDir, `${detail.id}.json`), `${JSON.stringify(detail, null, 2)}\n`);
      await writeFile(path.join(publicRoutesKayakingDir, `${detail.id}.geojson`), `${JSON.stringify(routeGeoJSON, null, 2)}\n`);
    })
  );

  await writeFile(path.join(publicDataDir, "kayak-facilities.json"), `${JSON.stringify(facilities, null, 2)}\n`);
  await writeFile(
    path.join(publicOverviewsDir, "kayaking.geojson"),
    `${JSON.stringify(
      buildKayakOverview(
        normalizedRoutes.map(({ overviewFeature }) => overviewFeature),
        dataset.generatedAt,
        dataset.generatedFrom
      ),
      null,
      2
    )}\n`
  );

  const kayakIndexItems = normalizedRoutes.map(({ indexItem }) => indexItem);
  await writeActivityLibraryIndex("kayaking", kayakIndexItems, { projectRoot });
  if (composeIndex) await composeLibraryIndex({ projectRoot });

  console.log(
    `Imported ${normalizedRoutes.length} kayak trips, ${facilities.length} kayak facilities, kayak routes, kayaking overview, and library-index records`
  );
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  await importKayakData({ projectRoot: process.cwd(), refreshSourceSnapshot: process.argv.includes("--refresh-source") });
}
