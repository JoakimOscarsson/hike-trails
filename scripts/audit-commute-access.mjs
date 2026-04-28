import { readHikingSourceData } from "./lib/hiking-source-shards.mjs";

const trailIds = ["roslagsleden", "sormlandsleden"];

function isBusTagged(tags) {
  return tags.highway === "bus_stop" || tags.bus === "yes" || /bus/i.test(tags.public_transport ?? "");
}

function isTrainTagged(tags) {
  const tagText = JSON.stringify(tags).toLowerCase();
  if (
    /heritage|museum|historic|abandoned|disused|preserved|museispårvägen|museisparvagen/.test(tagText) ||
    tags.tourism === "attraction"
  ) {
    return false;
  }

  return (
    (Boolean(tags.railway) &&
      Boolean(tags.network || tags.operator || tags.route_ref || /^(subway|light_rail|train|rail|tram)$/i.test(tags.station ?? ""))) ||
    ["train", "light_rail", "tram", "subway", "rail"].some((key) => tags[key] === "yes") ||
    /^(subway|light_rail|train|rail|tram)$/i.test(tags.station ?? "")
  );
}

function stopRows(trailSystem) {
  return (trailSystem.sections ?? []).flatMap((section) =>
    (section.accessPoints ?? []).flatMap((accessPoint) =>
      [
        ["bus", accessPoint.busStop],
        ["train", accessPoint.trainStop]
      ]
        .filter(([, stop]) => stop)
        .map(([expectedType, stop]) => ({
          trail: trailSystem.id,
          sectionId: section.id,
          stage: section.stageNumber,
          endpoint: accessPoint.endpoint,
          placeName: accessPoint.placeName,
          expectedType,
          stop
        }))
    )
  );
}

function overpassIdParts(rows) {
  const groups = { node: new Set(), way: new Set(), relation: new Set() };
  for (const row of rows) {
    const [type, id] = row.stop.osmId.split("/");
    groups[type]?.add(id);
  }

  return Object.entries(groups)
    .filter(([, ids]) => ids.size)
    .map(([type, ids]) => `${type}(id:${[...ids].join(",")});`)
    .join("");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchUsedOsmElements(rows) {
  const query = `[out:json][timeout:90];(${overpassIdParts(rows)});out center tags;`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
  ];
  const errors = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "hike-library-dev/0.1"
          },
          signal: AbortSignal.timeout(30000),
          body: new URLSearchParams({ data: query })
        });

        if (response.ok) {
          const payload = await response.json();
          return new Map((payload.elements ?? []).map((element) => [`${element.type}/${element.id}`, element]));
        }

        errors.push(`${endpoint}: ${response.status} ${response.statusText}`.trim());
      } catch (error) {
        errors.push(`${endpoint}: ${error.message}`);
      }
    }

    if (attempt < 3) await sleep(1000 * attempt);
  }

  throw new Error(`Overpass failed: ${errors.join("; ")}`);
}

const sourceSystems = await readHikingSourceData();
const systems = trailIds.map((id) => sourceSystems.find((system) => system.id === id)).filter(Boolean);
const rows = systems.flatMap(stopRows);
const osmElements = await fetchUsedOsmElements(rows);

const rowsWithTags = rows.map((row) => {
  const element = osmElements.get(row.stop.osmId);
  const tags = element?.tags ?? {};
  const typeOk = row.expectedType === "bus" ? isBusTagged(tags) : isTrainTagged(tags);
  const suspiciousDistance = row.expectedType === "bus" ? row.stop.distanceKm > 8 : row.stop.distanceKm > 50;

  return {
    ...row,
    tags,
    typeOk,
    suspiciousDistance,
    unnamed: !row.stop.name || /^(node|way|relation)\//.test(row.stop.name)
  };
});

const failures = rowsWithTags.filter((row) => !row.typeOk || row.unnamed);
const distanceWarnings = rowsWithTags.filter((row) => row.suspiciousDistance);

const summaryByTrail = systems.map((system) => {
  const accessPoints = (system.sections ?? []).flatMap((section) => section.accessPoints ?? []);
  const trailRows = rowsWithTags.filter((row) => row.trail === system.id);
  return {
    id: system.id,
    sections: system.sections.length,
    accessPoints: accessPoints.length,
    busStops: trailRows.filter((row) => row.expectedType === "bus").length,
    trainStops: trailRows.filter((row) => row.expectedType === "train").length,
    approximateAccessPoints: accessPoints.filter((accessPoint) => accessPoint.coordinateSource !== "route-geometry").length,
    typeFailures: trailRows.filter((row) => !row.typeOk || row.unnamed).length,
    maxBusKm: Math.max(...trailRows.filter((row) => row.expectedType === "bus").map((row) => row.stop.distanceKm)),
    maxTrainKm: Math.max(...trailRows.filter((row) => row.expectedType === "train").map((row) => row.stop.distanceKm))
  };
});

console.log(
  JSON.stringify(
    {
      usedStops: new Set(rows.map((row) => row.stop.osmId)).size,
      stopAssignments: rows.length,
      summaryByTrail,
      failures: failures.map((row) => ({
        trail: row.trail,
        stage: row.stage,
        endpoint: row.endpoint,
        placeName: row.placeName,
        expectedType: row.expectedType,
        stopName: row.stop.name,
        osmId: row.stop.osmId,
        tags: row.tags
      })),
      distanceWarnings: distanceWarnings.map((row) => ({
        trail: row.trail,
        stage: row.stage,
        endpoint: row.endpoint,
        placeName: row.placeName,
        expectedType: row.expectedType,
        stopName: row.stop.name,
        distanceKm: row.stop.distanceKm
      }))
    },
    null,
    2
  )
);

if (failures.length) process.exitCode = 1;
