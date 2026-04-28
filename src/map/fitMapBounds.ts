import L from "leaflet";

const mapFitOptions: L.FitBoundsOptions = { animate: false, padding: [28, 28] };

function boundsForLayers(layers: L.Layer[]) {
  return L.featureGroup(layers).getBounds();
}

export function fitSelectedLayersOrMarkers({
  map,
  selectedLayers,
  markerLayers
}: {
  map: L.Map;
  selectedLayers: L.Layer[];
  markerLayers: L.Layer[];
}) {
  const selectedBounds = boundsForLayers(selectedLayers);
  if (selectedBounds.isValid()) {
    map.fitBounds(selectedBounds, mapFitOptions);
    return;
  }

  const markerBounds = boundsForLayers(markerLayers);
  if (markerBounds.isValid()) {
    map.fitBounds(markerBounds, mapFitOptions);
  }
}
