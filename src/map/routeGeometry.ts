export type RouteGeometry = {
  path: string;
  geojson: GeoJSON.FeatureCollection;
};

const routeGeometryCache = new Map<string, Promise<RouteGeometry>>();

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
  if (cached) return cached;

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
      routeGeometryCache.delete(path);
      throw error;
    });

  routeGeometryCache.set(path, request);
  return request;
}

export function clearRouteGeometryCache() {
  routeGeometryCache.clear();
}
