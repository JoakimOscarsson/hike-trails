import L from "leaflet";
import type { TrailSection } from "../types";
import { loadRouteGeometry } from "./routeGeometry";

export type LoadedTrailSectionRoute = {
  state: "loaded";
  section: TrailSection;
  geojson: GeoJSON.FeatureCollection;
};

export type FailedTrailSectionRoute = {
  state: "failed";
  section: TrailSection;
  error: unknown;
};

export type TrailSectionRouteResult = LoadedTrailSectionRoute | FailedTrailSectionRoute | null;

export function uniqueTrailSections(sections: TrailSection[]) {
  return sections.filter((section, index) => sections.findIndex((candidate) => candidate.id === section.id) === index);
}

export async function loadTrailSectionRoute(section: TrailSection): Promise<TrailSectionRouteResult> {
  if (!section.route.geojsonPath) return null;
  try {
    const { geojson } = await loadRouteGeometry(section.route.geojsonPath);
    return { state: "loaded", section, geojson };
  } catch (error) {
    return { state: "failed", section, error };
  }
}

function coordinatesFromGeoJSON(geojson: GeoJSON.FeatureCollection) {
  const coordinates: GeoJSON.Position[] = [];
  for (const feature of geojson.features ?? []) {
    if (feature.geometry?.type === "LineString") {
      coordinates.push(...feature.geometry.coordinates);
    }
    if (feature.geometry?.type === "MultiLineString") {
      for (const line of feature.geometry.coordinates) coordinates.push(...line);
    }
  }
  return coordinates;
}

export function drawTrailSectionRoutes({
  routeResults,
  routeLayers,
  selectedIds
}: {
  routeResults: TrailSectionRouteResult[];
  routeLayers: L.LayerGroup;
  selectedIds: Set<string>;
}) {
  const selectedLayers: L.GeoJSON[] = [];
  const routeCoordinatesBySection = new Map<string, GeoJSON.Position[]>();
  const failedRoutes: FailedTrailSectionRoute[] = [];

  for (const result of routeResults) {
    if (!result) continue;
    if (result.state === "failed") {
      failedRoutes.push(result);
      continue;
    }

    const isSelected = selectedIds.has(result.section.id);
    const layer = L.geoJSON(result.geojson, {
      style: {
        color: isSelected ? "#d85b36" : "#768172",
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 0.95 : 0.34
      }
    }).addTo(routeLayers);

    if (isSelected) {
      selectedLayers.push(layer);
      routeCoordinatesBySection.set(result.section.id, coordinatesFromGeoJSON(result.geojson));
    }
  }

  return { selectedLayers, routeCoordinatesBySection, failedRoutes };
}

export function trailSectionMarkerLatLng(
  section: TrailSection | undefined,
  endpoint: "start" | "end",
  routeCoordinatesBySection: Map<string, GeoJSON.Position[]>
) {
  if (!section) return null;
  const coordinates = routeCoordinatesBySection.get(section.id) ?? [];
  const routeCoordinate = endpoint === "start" ? coordinates[0] : coordinates[coordinates.length - 1];
  if (routeCoordinate) return [routeCoordinate[1], routeCoordinate[0]] as [number, number];
  return section.endpointCoordinates?.[endpoint] ?? null;
}

export function trailRouteLoadWarningText(failedRoutes: FailedTrailSectionRoute[]) {
  return `Selected route geometry could not fully load. ${failedRoutes.length} route file${
    failedRoutes.length === 1 ? "" : "s"
  } failed.`;
}
