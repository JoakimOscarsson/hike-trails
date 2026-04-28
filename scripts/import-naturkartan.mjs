import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { resolveLocationFromStart } from "./location.mjs";
import { writeHikeData } from "./write-hike-data.mjs";

const projectRoot = process.cwd();
const hikesPath = path.join(projectRoot, "data", "hikes.json");
const routesDir = path.join(projectRoot, "public", "routes");

const difficultyMap = {
  green: "Easy",
  blue: "Moderate",
  red: "Hard",
  black: "Hard"
};

function text($, selector) {
  return $(selector).first().text().replace(/\s+/g, " ").trim();
}

function sectionText($, heading) {
  const header = $("h2, h3")
    .filter((_, el) => $(el).text().replace(/\s+/g, " ").trim().toLowerCase() === heading)
    .first();

  if (!header.length) return "";

  const detailsContent = header.closest("details").find(".accordion-item__content").first();
  if (detailsContent.length) {
    return detailsContent
      .text()
      .replace(/\bShow more\b|\bShow less\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const values = [];
  let node = header.next();
  while (node.length && !["h2", "h3"].includes(node[0].tagName?.toLowerCase())) {
    const value = node.text().replace(/\bShow more\b|\bShow less\b/g, "").replace(/\s+/g, " ").trim();
    if (value) values.push(value);
    node = node.next();
  }

  return [...new Set(values)].join(" ");
}

function toId(url) {
  const slug = new URL(url).pathname.split("/").filter(Boolean).pop() || "hike";
  return slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function resolveUrl(baseUrl, href) {
  return href ? new URL(href, baseUrl).toString() : undefined;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseGpx(gpx, name) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: true
  });
  const parsed = parser.parse(gpx);
  const tracks = asArray(parsed.gpx?.trk);
  const features = [];
  const allCoordinates = [];

  for (const track of tracks) {
    for (const segment of asArray(track.trkseg)) {
      const coordinates = asArray(segment.trkpt)
        .map((point) => [Number(point.lon), Number(point.lat)])
        .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

      if (coordinates.length > 1) {
        allCoordinates.push(...coordinates);
        features.push({
          type: "Feature",
          properties: { name: track.name || name },
          geometry: {
            type: "LineString",
            coordinates
          }
        });
      }
    }
  }

  return {
    geojson: {
      type: "FeatureCollection",
      features
    },
    coordinates: allCoordinates
  };
}

function centerFromCoordinates(coordinates) {
  if (!coordinates.length) return [59.3293, 18.0686];

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

function startFromCoordinates(coordinates, center) {
  const first = coordinates[0];
  return first ? [Number(first[1].toFixed(6)), Number(first[0].toFixed(6))] : center;
}

function distanceMeters([lonA, latA], [lonB, latB]) {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(latB - latA);
  const deltaLon = toRadians(lonB - lonA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeTypeFromCoordinates(coordinates, fallbackText) {
  if (coordinates.length > 2 && distanceMeters(coordinates[0], coordinates[coordinates.length - 1]) < 120) {
    return "Loop";
  }

  return /circular trail/i.test(fallbackText) ? "Loop" : "Out and back";
}

function extractDistance($) {
  const pageText = $("body").text().replace(/\s+/g, " ");
  const match = pageText.match(/Length\s+([0-9]+(?:[.,][0-9]+)?)\s*km/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function extractDifficulty($) {
  const pageText = $("body").text().replace(/\s+/g, " ");
  const match = pageText.match(/Difficulty\s+([A-Za-z]+)/i);
  const key = match?.[1]?.toLowerCase();
  return key && difficultyMap[key] ? difficultyMap[key] : "Moderate";
}

function recommendedTimeFromDistance(distanceKm) {
  if (!distanceKm || distanceKm <= 25) return "dayhike";
  if (distanceKm <= 50) return "weekend";
  if (distanceKm <= 125) return "3-5-days";
  return "6-plus-days";
}

function extractSiteId(html) {
  return html.match(/data-naturkartan-preselected-site-id="([^"]+)"/)?.[1];
}

async function readHikes() {
  try {
    return JSON.parse(await readFile(hikesPath, "utf8"));
  } catch {
    return [];
  }
}

async function importNaturkartan(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const id = toId(url);
  const name = text($, "h1") || id;
  const gpxHref = $("a[download$='.gpx'], a[href$='.gpx']").first().attr("href");
  const gpxUrl = resolveUrl(url, gpxHref);
  let route = { status: "missing-gpx" };
  let center = [59.3293, 18.0686];
  let routeCoordinates = [];

  await mkdir(routesDir, { recursive: true });

  if (gpxUrl) {
    const gpxResponse = await fetch(gpxUrl);
    if (!gpxResponse.ok) throw new Error(`Failed to fetch ${gpxUrl}: ${gpxResponse.status}`);

    const gpx = await gpxResponse.text();
    const { geojson, coordinates } = parseGpx(gpx, name);
    routeCoordinates = coordinates;
    const geojsonPath = `/routes/${id}.geojson`;
    await writeFile(path.join(projectRoot, "public", geojsonPath), JSON.stringify(geojson, null, 2));

    route = {
      status: "ready",
      sourceFormat: "gpx",
      gpxUrl,
      geojsonPath
    };
    center = centerFromCoordinates(coordinates);
  }

  const utilities = [
    sectionText($, "parking"),
    sectionText($, "communications"),
    sectionText($, "accessibility")
  ].filter(Boolean);
  const start = startFromCoordinates(routeCoordinates, center);
  const location = await resolveLocationFromStart(start);

  const hike = {
    id,
    name,
    region: text($, "a[href*='/stockholms-lan']") || "Stockholms län",
    country: "Sweden",
    location,
    recommendedTime: recommendedTimeFromDistance(extractDistance($)),
    difficulty: extractDifficulty($),
    distanceKm: extractDistance($),
    estimatedTime: sectionText($, "trail details").match(/Time\s+([^]*?)(?:Difficulty|$)/i)?.[1]?.trim() || "See source",
    routeType: routeTypeFromCoordinates(routeCoordinates, $("body").text()),
    season: "See source",
    description: sectionText($, "description") || "See source page for description.",
    gettingThere: sectionText($, "directions") || "See source page for current directions.",
    campingRules: sectionText($, "regulations") || "Check the source page and local authority rules before camping.",
    utilities,
    waterSources: ["Check the route map and local notices before relying on natural water sources."],
    notes: ["Imported from Naturkartan. Review details before relying on them in the field."],
    source: {
      provider: "naturkartan",
      url,
      siteId: extractSiteId(html),
      lastFetchedAt: new Date().toISOString().slice(0, 10)
    },
    route,
    map: {
      center,
      zoom: route.status === "ready" ? 13 : 11,
      externalUrl: url
    }
  };

  const hikes = await readHikes();
  const nextHikes = [hike, ...hikes.filter((item) => item.id !== hike.id)];
  await mkdir(path.dirname(hikesPath), { recursive: true });
  await writeFile(hikesPath, `${JSON.stringify(nextHikes, null, 2)}\n`);
  await writeHikeData(nextHikes);

  console.log(`Imported ${name}`);
  console.log(gpxUrl ? `Route: ${route.geojsonPath}` : "Route: no GPX found");
}

const url = process.argv[2];
if (!url) {
  console.error("Usage: npm run import:naturkartan -- <naturkartan-url>");
  process.exit(1);
}

importNaturkartan(url).catch((error) => {
  console.error(error);
  process.exit(1);
});
