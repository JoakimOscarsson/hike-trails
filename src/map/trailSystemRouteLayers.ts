import L from "leaflet";
import type { TrailConnectionMode, TrailSection, TrailSectionConnection } from "../types";
import { loadRouteGeometry } from "./routeGeometry";
import { trailConnectionDisplayName } from "./trailSystemConnections";

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

export type LoadedTrailConnectionRoute = {
  state: "loaded";
  connection: TrailSectionConnection;
  geojson: GeoJSON.FeatureCollection;
};

export type FailedTrailConnectionRoute = {
  state: "failed";
  connection: TrailSectionConnection;
  error: unknown;
};

export type TrailConnectionRouteResult = LoadedTrailConnectionRoute | FailedTrailConnectionRoute | null;

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

export async function loadTrailConnectionRoute(connection: TrailSectionConnection): Promise<TrailConnectionRouteResult> {
  const path = connection.route?.geojsonPath;
  if (!path) return null;
  try {
    const { geojson } = await loadRouteGeometry(path);
    return { state: "loaded", connection, geojson };
  } catch (error) {
    return { state: "failed", connection, error };
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

const trailConnectionStyles: Record<TrailConnectionMode, L.PathOptions> = {
  "same-island": {
    color: "#8b8f86",
    weight: 2,
    opacity: 0.4,
    dashArray: "3 7",
    lineCap: "round",
    className: "trail-connection-route trail-connection-route-same-island"
  },
  walk: {
    color: "#796b56",
    weight: 3,
    opacity: 0.66,
    dashArray: "4 7",
    lineCap: "round",
    className: "trail-connection-route trail-connection-route-walk"
  },
  bus: {
    color: "#5267a3",
    weight: 3,
    opacity: 0.68,
    dashArray: "8 8",
    lineCap: "round",
    className: "trail-connection-route trail-connection-route-bus"
  },
  ferry: {
    color: "#176f86",
    weight: 3.5,
    opacity: 0.74,
    dashArray: "9 8",
    lineCap: "round",
    className: "trail-connection-route trail-connection-route-ferry"
  },
  rowboat: {
    color: "#2f7a61",
    weight: 3.5,
    opacity: 0.78,
    dashArray: "2 8",
    lineCap: "round",
    className: "trail-connection-route trail-connection-route-rowboat"
  },
  none: {
    color: "#8b8f86",
    weight: 2,
    opacity: 0.38,
    dashArray: "2 8",
    lineCap: "round",
    className: "trail-connection-route trail-connection-route-none"
  }
};

export function drawTrailConnectionRoutes({
  routeResults,
  routeLayers
}: {
  routeResults: TrailConnectionRouteResult[];
  routeLayers: L.LayerGroup;
}) {
  const connectionLayers: L.GeoJSON[] = [];
  const failedConnectionRoutes: FailedTrailConnectionRoute[] = [];

  for (const result of routeResults) {
    if (!result) continue;
    if (result.state === "failed") {
      failedConnectionRoutes.push(result);
      continue;
    }

    const layer = L.geoJSON(result.geojson, {
      style: trailConnectionStyles[result.connection.mode],
      onEachFeature: (_feature, featureLayer) => {
        featureLayer.bindTooltip(trailConnectionDisplayName(result.connection), {
          className: "trail-connection-tooltip",
          direction: "top",
          sticky: true
        });
      }
    }).addTo(routeLayers);

    connectionLayers.push(layer);
  }

  return { connectionLayers, failedConnectionRoutes };
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

export function trailRouteLoadWarningText(
  failedRoutes: FailedTrailSectionRoute[],
  failedConnectionRoutes: FailedTrailConnectionRoute[] = []
) {
  const parts: string[] = [];
  if (failedRoutes.length) {
    parts.push(`${failedRoutes.length} route file${failedRoutes.length === 1 ? "" : "s"} failed`);
  }
  if (failedConnectionRoutes.length) {
    parts.push(
      `${failedConnectionRoutes.length} connection file${failedConnectionRoutes.length === 1 ? "" : "s"} failed`
    );
  }
  return `Selected map geometry could not fully load. ${parts.join("; ")}.`;
}
