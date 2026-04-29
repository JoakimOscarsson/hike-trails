import L from "leaflet";

type RouteEndpointKind = "start" | "end";

const endpointIconSize: L.PointTuple = [112, 58];
const endpointAnchors: Record<RouteEndpointKind, L.PointTuple> = {
  start: [88, 38],
  end: [24, 20]
};

export function routeEndpointIcon(kind: RouteEndpointKind) {
  const label = kind === "start" ? "Start" : "End";
  return L.divIcon({
    className: `route-endpoint-marker route-endpoint-marker-${kind}`,
    html: `<span class="route-endpoint-label">${label}</span><span class="route-endpoint-line" aria-hidden="true"></span><span class="route-endpoint-dot" aria-hidden="true"></span>`,
    iconSize: endpointIconSize,
    iconAnchor: endpointAnchors[kind]
  });
}

export function addRouteEndpointMarker({
  coordinates,
  kind,
  layerGroup
}: {
  coordinates: [number, number];
  kind: RouteEndpointKind;
  layerGroup: L.LayerGroup;
}) {
  return L.marker(coordinates, {
    icon: routeEndpointIcon(kind),
    interactive: false,
    keyboard: false,
    zIndexOffset: 2200
  }).addTo(layerGroup);
}
