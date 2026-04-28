import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { resolveLocationFromStart } from "../location.mjs";
import { readHikingSourceData, writeHikingSourceData } from "./hiking-source-shards.mjs";
import { writeHikeData } from "../write-hike-data.mjs";

export function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseGpxFeatureCollection(gpxText, fallbackName) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const gpx = parser.parse(gpxText).gpx;
  const features = [];
  const coordinates = [];

  for (const track of asArray(gpx?.trk)) {
    for (const segment of asArray(track.trkseg)) {
      const segmentCoordinates = asArray(segment.trkpt)
        .map((point) => [Number(point["@_lon"] ?? point.lon), Number(point["@_lat"] ?? point.lat)])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
      if (!segmentCoordinates.length) continue;
      coordinates.push(...segmentCoordinates);
      features.push({
        type: "Feature",
        properties: { name: track.name || fallbackName },
        geometry: { type: "LineString", coordinates: segmentCoordinates }
      });
    }
  }

  return { features, coordinates };
}

export function centerFromCoordinates(coordinates) {
  const sums = coordinates.reduce(
    (acc, [lon, lat]) => {
      acc.lon += lon;
      acc.lat += lat;
      return acc;
    },
    { lon: 0, lat: 0 }
  );

  return [Number((sums.lat / coordinates.length).toFixed(6)), Number((sums.lon / coordinates.length).toFixed(6))];
}

export function endpointCoordinatesFromRoute(coordinates) {
  return {
    source: "route-geometry",
    start: [coordinates[0][1], coordinates[0][0]],
    end: [coordinates[coordinates.length - 1][1], coordinates[coordinates.length - 1][0]]
  };
}

export async function writeRouteFeatureCollection({ projectRoot, geojsonPath, features }) {
  const publicPath = path.join(projectRoot, "public", geojsonPath);
  await mkdir(path.dirname(publicPath), { recursive: true });
  await writeFile(publicPath, `${JSON.stringify({ type: "FeatureCollection", features }, null, 2)}\n`);
}

export function runtimeSectionsFromBuiltSections(sections) {
  return sections.map(({ start: _start, center: _center, ...section }) => section);
}

export async function locationFromFirstSectionStart(sections) {
  const firstStart = sections[0]?.start;
  if (!firstStart) throw new Error("Cannot resolve trail-system location without a first section start coordinate");
  return resolveLocationFromStart([Number(firstStart[1].toFixed(6)), Number(firstStart[0].toFixed(6))]);
}

export async function persistTrailSystemBuild({
  projectRoot = process.cwd(),
  hikesPath = path.join(projectRoot, "data", "hikes.json"),
  trailSystem,
  filterHikes = () => true
}) {
  const hikes = JSON.parse(await readFile(hikesPath, "utf8"));
  const nextHikes = hikes.filter(filterHikes);
  const trailSystems = await readHikingSourceData({ projectRoot });
  const replaced = trailSystems.some((system) => system.id === trailSystem.id);
  const nextTrailSystems = replaced
    ? trailSystems.map((system) => (system.id === trailSystem.id ? trailSystem : system))
    : [...trailSystems, trailSystem];

  await writeFile(hikesPath, `${JSON.stringify(nextHikes, null, 2)}\n`);
  await writeHikingSourceData(nextTrailSystems, { projectRoot });
  await writeHikeData(nextHikes, nextTrailSystems);

  return { nextHikes, nextTrailSystems };
}
