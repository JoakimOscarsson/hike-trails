import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "data", "hikes.json");
const trailSystemsPath = path.join(projectRoot, "data", "trail-systems.json");
const publicDataDir = path.join(projectRoot, "public", "data");
const publicHikesDir = path.join(publicDataDir, "hikes");
const publicTrailSystemsDir = path.join(publicDataDir, "trail-systems");

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
  return {
    itemType: "hike",
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
    searchText: searchableText(hike)
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
  return {
    itemType: "trail-system",
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
    searchText: searchableTrailText(trailSystem)
  };
}

export async function writeHikeData(hikes, trailSystems) {
  const systems = trailSystems ?? JSON.parse(await readFile(trailSystemsPath, "utf8").catch(() => "[]"));
  await mkdir(publicHikesDir, { recursive: true });
  await mkdir(publicTrailSystemsDir, { recursive: true });

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

  await writeFile(
    path.join(publicDataDir, "hikes-index.json"),
    `${JSON.stringify([...systems.map(toTrailSystemIndexItem), ...hikes.map(toIndexItem)], null, 2)}\n`
  );

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
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  const hikes = JSON.parse(await readFile(sourcePath, "utf8"));
  const trailSystems = JSON.parse(await readFile(trailSystemsPath, "utf8").catch(() => "[]"));
  await writeHikeData(hikes, trailSystems);
  console.log(`Wrote ${hikes.length} hike detail files, ${trailSystems.length} trail systems, and index`);
}
