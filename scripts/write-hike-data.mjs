import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildHikingOverviewGeoJSON } from "./lib/build-overview-geojson.mjs";
import { readHikingSourceData } from "./lib/hiking-source-shards.mjs";
import { composeLibraryIndex, writeActivityLibraryIndex } from "./lib/library-index-fragments.mjs";
import { normalizeSearchText } from "./lib/search-text.mjs";
import { trailSystemShardIndexPaths, writeTrailSystemShards } from "./lib/write-trail-system-shards.mjs";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "data", "hikes.json");
const publicDataDir = path.join(projectRoot, "public", "data");
const publicHikesDir = path.join(publicDataDir, "hikes");
const publicTrailSystemsDir = path.join(publicDataDir, "trail-systems");
const publicOverviewsDir = path.join(publicDataDir, "overviews");
const publicRoot = path.join(projectRoot, "public");

const recommendedTimeLabels = {
  dayhike: "Day hike",
  weekend: "Weekend",
  "3-5-days": "3-5 days",
  "6-plus-days": "6+ days"
};

function searchableText(hike) {
  return [
    hike.name,
    hike.region,
    hike.country,
    hike.location?.label,
    recommendedTimeLabels[hike.recommendedTime],
    hike.difficulty,
    hike.routeType,
    hike.distanceKm ? `${hike.distanceKm} km` : "",
    hike.description,
    hike.gettingThere,
    ...(hike.utilities ?? []),
    ...(hike.waterSources ?? []),
    ...(hike.notes ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function toIndexItem(hike) {
  const searchText = searchableText(hike);
  return {
    itemType: "hike",
    activity: "hiking",
    id: hike.id,
    name: hike.name,
    region: hike.region,
    country: hike.country,
    location: hike.location,
    recommendedTime: hike.recommendedTime,
    recommendedTimes: [hike.recommendedTime],
    difficulty: hike.difficulty,
    distanceKm: hike.distanceKm,
    estimatedTime: hike.estimatedTime,
    routeType: hike.routeType,
    detailPath: `/data/hikes/${hike.id}.json`,
    overviewFeatureId: hike.id,
    searchText: normalizeSearchText(searchText)
  };
}

function searchableTrailText(trailSystem) {
  return [
    trailSystem.name,
    trailSystem.region,
    trailSystem.country,
    trailSystem.location?.label,
    ...(trailSystem.recommendedTimes ?? []).map((time) => recommendedTimeLabels[time]),
    trailSystem.difficulty,
    trailSystem.routeType,
    trailSystem.distanceKm ? `${trailSystem.distanceKm} km` : "",
    trailSystem.description,
    trailSystem.gettingThere,
    ...(trailSystem.utilities ?? []),
    ...(trailSystem.waterSources ?? []),
    ...(trailSystem.notes ?? []),
    ...(trailSystem.sections ?? []).flatMap((section) => [
      section.name,
      section.from,
      section.to,
      section.description,
      ...(section.utilities ?? []),
      ...(section.waterSources ?? []),
      ...(section.notes ?? [])
    ])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function toTrailSystemIndexItem(trailSystem) {
  const searchText = searchableTrailText(trailSystem);
  return {
    itemType: "trail-system",
    activity: "hiking",
    id: trailSystem.id,
    name: trailSystem.name,
    region: trailSystem.region,
    country: trailSystem.country,
    location: trailSystem.location,
    recommendedTime: trailSystem.recommendedTimes?.[0] ?? "weekend",
    recommendedTimes: trailSystem.recommendedTimes ?? ["weekend"],
    difficulty: trailSystem.difficulty,
    distanceKm: trailSystem.distanceKm,
    sectionDistances: (trailSystem.sections ?? []).map((section) => section.distanceKm),
    routeGroupDistances: (trailSystem.routeGroups ?? []).map((group) =>
      (group.sectionIds ?? [])
        .map((sectionId) => (trailSystem.sections ?? []).find((section) => section.id === sectionId)?.distanceKm)
        .filter((distance) => Number.isFinite(distance))
    ),
    estimatedTime: trailSystem.estimatedTime,
    routeType: trailSystem.routeType,
    detailPath: `/data/trail-systems/${trailSystem.id}.json`,
    overviewFeatureId: trailSystem.id,
    ...trailSystemShardIndexPaths(trailSystem.id),
    searchText: normalizeSearchText(searchText)
  };
}

function toLibraryIndexItem(item) {
  if (item.itemType !== "trail-system") return item;
  const { detailPath, ...runtimeItem } = item;
  return runtimeItem;
}

export async function writeHikeData(hikes, trailSystems, { composeIndex = true } = {}) {
  const systems = trailSystems ?? (await readHikingSourceData({ projectRoot }));
  const systemIds = new Set(systems.map((system) => system.id));
  await mkdir(publicHikesDir, { recursive: true });
  await mkdir(publicTrailSystemsDir, { recursive: true });
  await mkdir(publicOverviewsDir, { recursive: true });

  await Promise.all(
    [
      [publicHikesDir, new Set(hikes.map((hike) => `${hike.id}.json`))],
      [publicTrailSystemsDir, new Set(systems.map((system) => `${system.id}.json`))]
    ].map(async ([directory, expectedFiles]) => {
      const files = await readdir(directory).catch(() => []);
      await Promise.all(
        files
          .filter((file) => file.endsWith(".json") && !expectedFiles.has(file))
          .map((file) => rm(path.join(directory, file), { force: true }))
      );
    })
  );

  await Promise.all(
    (await readdir(publicTrailSystemsDir, { withFileTypes: true }).catch(() => []))
      .filter((entry) => entry.isDirectory() && !systemIds.has(entry.name))
      .map((entry) => rm(path.join(publicTrailSystemsDir, entry.name), { recursive: true, force: true }))
  );

  const compatibilityIndex = [...systems.map(toTrailSystemIndexItem), ...hikes.map(toIndexItem)];
  const libraryIndex = compatibilityIndex.map(toLibraryIndexItem);

  await writeFile(path.join(publicDataDir, "hikes-index.json"), `${JSON.stringify(compatibilityIndex, null, 2)}\n`);
  await writeActivityLibraryIndex("hiking", libraryIndex, { projectRoot });

  await Promise.all(
    hikes.map((hike) => writeFile(path.join(publicHikesDir, `${hike.id}.json`), `${JSON.stringify(hike, null, 2)}\n`))
  );
  await Promise.all(
    systems.map((trailSystem) =>
      writeFile(
        path.join(publicTrailSystemsDir, `${trailSystem.id}.json`),
        `${JSON.stringify(trailSystem, null, 2)}\n`
      )
    )
  );
  await Promise.all(systems.map((trailSystem) => writeTrailSystemShards(trailSystem, publicTrailSystemsDir)));
  const hikingOverview = await buildHikingOverviewGeoJSON({ hikes, trailSystems: systems, publicRoot });
  await writeFile(path.join(publicOverviewsDir, "hiking.geojson"), `${JSON.stringify(hikingOverview, null, 2)}\n`);
  if (composeIndex) await composeLibraryIndex({ projectRoot });
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  const hikes = JSON.parse(await readFile(sourcePath, "utf8"));
  const trailSystems = await readHikingSourceData({ projectRoot });
  await writeHikeData(hikes, trailSystems);
  console.log(
    `Wrote ${hikes.length} hike detail files, ${trailSystems.length} trail systems, trail-system shards, hiking overview, compatibility index, and library index`
  );
}
