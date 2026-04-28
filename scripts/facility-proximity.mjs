import { readFile } from "node:fs/promises";
import path from "node:path";

const earthRadiusKm = 6371.0088;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function projectPoint([lon, lat], originLat) {
  return {
    x: earthRadiusKm * toRadians(lon) * Math.cos(toRadians(originLat)),
    y: earthRadiusKm * toRadians(lat)
  };
}

function distanceToSegmentKm(point, segmentStart, segmentEnd, originLat) {
  const p = projectPoint([point.lon, point.lat], originLat);
  const a = projectPoint(segmentStart, originLat);
  const b = projectPoint(segmentEnd, originLat);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / segmentLengthSquared));
  const closest = {
    x: a.x + t * dx,
    y: a.y + t * dy
  };

  return Math.hypot(p.x - closest.x, p.y - closest.y);
}

function featureLineStrings(feature) {
  if (feature.geometry?.type === "LineString") return [feature.geometry.coordinates];
  if (feature.geometry?.type === "MultiLineString") return feature.geometry.coordinates;
  return [];
}

function geojsonLineStrings(geojson) {
  if (geojson.type === "FeatureCollection") {
    return (geojson.features ?? []).flatMap(featureLineStrings);
  }
  if (geojson.type === "Feature") return featureLineStrings(geojson);
  if (geojson.type === "LineString") return [geojson.coordinates];
  if (geojson.type === "MultiLineString") return geojson.coordinates;
  return [];
}

function nearestDistanceToLinesKm(facilityCoordinates, lines) {
  const [lat, lon] = facilityCoordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;

  const point = { lat, lon };
  let nearest = Number.POSITIVE_INFINITY;

  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      const start = line[index - 1];
      const end = line[index];
      if (!start || !end) continue;
      nearest = Math.min(nearest, distanceToSegmentKm(point, start, end, lat));
    }
  }

  return Number.isFinite(nearest) ? nearest : undefined;
}

async function loadSectionLines(section, projectRoot) {
  if (!section.route?.geojsonPath) return [];
  const routePath = path.join(projectRoot, "public", section.route.geojsonPath.replace(/^\//, ""));
  const geojson = JSON.parse(await readFile(routePath, "utf8"));
  return geojsonLineStrings(geojson);
}

export async function annotateTrailSystemFacilityProximity(trailSystem, { projectRoot, thresholdKm = 2 } = {}) {
  const nextSections = [];

  for (const section of trailSystem.sections ?? []) {
    const lines = await loadSectionLines(section, projectRoot);
    const facilities = (section.facilities ?? []).map((facility) => {
      if (!facility.coordinates) {
        return {
          ...facility,
          routeProximity: {
            status: "unknown",
            thresholdKm,
            note: "No facility coordinates available."
          }
        };
      }

      if (!lines.length) {
        return {
          ...facility,
          routeProximity: {
            status: "unknown",
            thresholdKm,
            note: "No route geometry available for this section yet."
          }
        };
      }

      const distanceKm = nearestDistanceToLinesKm(facility.coordinates, lines);
      if (!Number.isFinite(distanceKm)) {
        return {
          ...facility,
          routeProximity: {
            status: "unknown",
            thresholdKm,
            note: "Could not calculate distance to the route line."
          }
        };
      }

      const roundedDistanceKm = Number(distanceKm.toFixed(2));
      return {
        ...facility,
        routeProximity: {
          status: roundedDistanceKm > thresholdKm ? "off-route" : "on-route",
          distanceKm: roundedDistanceKm,
          thresholdKm
        }
      };
    });

    nextSections.push({ ...section, facilities });
  }

  return { ...trailSystem, sections: nextSections };
}
