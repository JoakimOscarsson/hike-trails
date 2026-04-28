import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cachePath = path.join(process.cwd(), "data", "commute-stops-osm-cache.json");
const cacheVersion = 2;
const bbox = {
  south: 58.3,
  west: 15.2,
  north: 60.1,
  east: 19.2
};

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceKm([latA, lonA], [latB, lonB]) {
  const earthRadiusKm = 6371.0088;
  const dLat = toRadians(latB - latA);
  const dLon = toRadians(lonB - lonA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function elementCoordinates(element) {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : undefined;
}

function stopName(element) {
  const tags = element.tags ?? {};
  return tags.name || tags["name:sv"] || tags.ref || tags.local_ref || `${element.type}/${element.id}`;
}

function isTrainStop(tags) {
  const tagText = JSON.stringify(tags).toLowerCase();
  if (
    /heritage|museum|historic|abandoned|disused|preserved|museispårvägen|museisparvagen/.test(tagText) ||
    tags.tourism === "attraction"
  ) {
    return false;
  }

  return (
    (/^(station|halt|tram_stop|subway_entrance|stop|platform)$/i.test(tags.railway ?? "") &&
      Boolean(
        tags.network ||
          tags.operator ||
          tags.route_ref ||
          tags.train === "yes" ||
          tags.tram === "yes" ||
          tags.subway === "yes" ||
          tags.light_rail === "yes" ||
          /^(subway|light_rail|train|rail|tram)$/i.test(tags.station ?? "")
      )) ||
    ["train", "light_rail", "tram", "subway", "rail"].some((key) => tags[key] === "yes") ||
    /^(subway|light_rail|train|rail|tram)$/i.test(tags.station ?? "")
  );
}

function isBusStop(tags) {
  return tags.highway === "bus_stop" || tags.bus === "yes" || /bus/i.test(tags.public_transport ?? "");
}

function isExcludedCommuteStop(stop) {
  const stopText = `${stop.name} ${stop.network}`.toLowerCase();
  return /museispårvägen|museisparvagen/.test(stopText);
}

function classifyStop(element) {
  const tags = element.tags ?? {};
  const train = isTrainStop(tags);
  const bus = isBusStop(tags);
  if (train) return "train";
  if (bus) return "bus";
  return undefined;
}

function normalizeStops(elements) {
  const seen = new Set();
  const stops = [];

  for (const element of elements) {
    const type = classifyStop(element);
    const coordinates = elementCoordinates(element);
    if (!type || !coordinates) continue;

    const name = stopName(element);
    const key = `${type}:${name.toLowerCase()}:${coordinates.map((value) => value.toFixed(5)).join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    stops.push({
      id: `osm-${element.type}-${element.id}-${type}`,
      osmId: `${element.type}/${element.id}`,
      name,
      type,
      coordinates,
      network: element.tags?.network || element.tags?.operator || element.tags?.brand || "",
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
    });
  }

  return stops;
}

async function fetchRegionalStops() {
  const query = `[out:json][timeout:90];
(
  node["highway"="bus_stop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["highway"="bus_stop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  relation["highway"="bus_stop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["railway"~"^(station|halt|tram_stop|subway_entrance|stop|platform)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["railway"~"^(station|halt|tram_stop|subway_entrance|stop|platform)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  relation["railway"~"^(station|halt|tram_stop|subway_entrance|stop|platform)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["public_transport"~"^(platform|stop_position|station)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["public_transport"~"^(platform|stop_position|station)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  relation["public_transport"~"^(platform|stop_position|station)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center tags;`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "hike-library-dev/0.1"
    },
    body: new URLSearchParams({ data: query })
  });

  if (!response.ok) throw new Error(`Overpass failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  const stops = normalizeStops(payload.elements ?? []);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    `${JSON.stringify({ version: cacheVersion, fetchedAt: new Date().toISOString(), bbox, stops }, null, 2)}\n`
  );
  return stops;
}

async function loadRegionalStops() {
  const cached = await readFile(cachePath, "utf8")
    .then((content) => JSON.parse(content))
    .catch(() => undefined);
  if (cached?.version === cacheVersion && cached?.stops?.length) return cached.stops;
  return fetchRegionalStops();
}

function nearestStop(stops, coordinates, type) {
  const candidates = stops.filter(
    (stop) => stop.type === type && !isExcludedCommuteStop(stop) && !/^(node|way|relation)\//.test(stop.name)
  );
  let best;

  for (const stop of candidates) {
    const distance = distanceKm(coordinates, stop.coordinates);
    if (!best || distance < best.distanceKm) {
      best = { ...stop, distanceKm: Number(distance.toFixed(2)) };
    }
  }

  return best;
}

function readEndpoint(section, endpoint) {
  const coordinates = section.endpointCoordinates?.[endpoint];
  if (!coordinates) return undefined;
  return {
    id: `${section.id}-${endpoint}`,
    endpoint,
    placeName: endpoint === "start" ? section.from : section.to,
    coordinates,
    coordinateSource: section.endpointCoordinates?.source ?? "approximate"
  };
}

export async function annotateTrailSystemCommuteAccess(trailSystem) {
  const stops = await loadRegionalStops();

  return {
    ...trailSystem,
    sections: (trailSystem.sections ?? []).map((section) => {
      const accessPoints = ["start", "end"].flatMap((endpoint) => {
        const accessPoint = readEndpoint(section, endpoint);
        if (!accessPoint) return [];

        const busStop = nearestStop(stops, accessPoint.coordinates, "bus");
        const trainStop = nearestStop(stops, accessPoint.coordinates, "train");
        const nearestStopOverall =
          !trainStop || (busStop && busStop.distanceKm <= trainStop.distanceKm) ? busStop : trainStop;

        return [
          {
            ...accessPoint,
            busStop,
            trainStop,
            nearestStop: nearestStopOverall
          }
        ];
      });

      return { ...section, accessPoints };
    })
  };
}
