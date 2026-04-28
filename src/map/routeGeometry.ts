export type RouteGeometry = {
  path: string;
  geojson: GeoJSON.FeatureCollection;
};

const routeGeometryCache = new Map<string, Promise<RouteGeometry>>();
export const maxRouteGeometryCacheEntries = 96;

function normalizeGeoJSON(value: GeoJSON.GeoJSON): GeoJSON.FeatureCollection {
  if (value.type === "FeatureCollection") return value;
  if (value.type === "Feature") {
    return {
      type: "FeatureCollection",
      features: [value]
    };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: value as GeoJSON.Geometry
      }
    ]
  };
}

export function loadRouteGeometry(path: string): Promise<RouteGeometry> {
  const cached = routeGeometryCache.get(path);
  if (cached) {
    routeGeometryCache.delete(path);
    routeGeometryCache.set(path, cached);
    return cached;
  }

  const request = fetch(path)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return response.json() as Promise<GeoJSON.GeoJSON>;
    })
    .then((geojson) => ({
      path,
      geojson: normalizeGeoJSON(geojson)
    }))
    .catch((error) => {
      if (routeGeometryCache.get(path) === request) routeGeometryCache.delete(path);
      throw error;
    });

  routeGeometryCache.set(path, request);
  while (routeGeometryCache.size > maxRouteGeometryCacheEntries) {
    const oldestPath = routeGeometryCache.keys().next().value;
    if (!oldestPath) break;
    routeGeometryCache.delete(oldestPath);
  }
  return request;
}

export function clearRouteGeometryCache() {
  routeGeometryCache.clear();
}

export function getRouteGeometryCacheDiagnostics() {
  return {
    size: routeGeometryCache.size,
    limit: maxRouteGeometryCacheEntries,
    paths: [...routeGeometryCache.keys()]
  };
}
