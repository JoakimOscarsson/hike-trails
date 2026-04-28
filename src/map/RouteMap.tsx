import React from "react";
import L from "leaflet";
import type { Hike } from "../types";
import { loadRouteGeometry } from "./routeGeometry";
import type { HikeMapStatus } from "./types";
import { useLeafletMap } from "./useLeafletMap";

export function RouteMap({
  hike,
  onLoadStateChange
}: {
  hike: Hike;
  onLoadStateChange?: (status: HikeMapStatus) => void;
}) {
  const { containerRef, mapRef } = useLeafletMap(hike.map.center, hike.map.zoom);
  const [routeLoadWarning, setRouteLoadWarning] = React.useState("");

  React.useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap) return;
    const map: L.Map = currentMap;
    setRouteLoadWarning("");
    onLoadStateChange?.(hike.route.geojsonPath ? "loading" : "marker-only");
    const routeLayers = L.layerGroup().addTo(map);

    const startIcon = L.divIcon({
      className: "route-marker route-marker-start",
      html: "Start",
      iconSize: [52, 26],
      iconAnchor: [26, 13]
    });

    const finishIcon = L.divIcon({
      className: "route-marker route-marker-finish",
      html: "End",
      iconSize: [44, 26],
      iconAnchor: [22, 13]
    });

    let cancelled = false;

    async function drawRoute() {
      if (!hike.route.geojsonPath) {
        L.marker(hike.map.center).addTo(routeLayers);
        onLoadStateChange?.("marker-only");
        return;
      }

      const { geojson } = await loadRouteGeometry(hike.route.geojsonPath);
      if (cancelled) return;

      const layer = L.geoJSON(geojson, {
        style: {
          color: "#d85b36",
          weight: 5,
          opacity: 0.92
        }
      }).addTo(routeLayers);

      const firstLine = geojson.features?.find(
        (feature: GeoJSON.Feature) => feature.geometry?.type === "LineString"
      ) as GeoJSON.Feature<GeoJSON.LineString> | undefined;

      const coordinates = firstLine?.geometry.coordinates ?? [];
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];

      if (first) L.marker([first[1], first[0]], { icon: startIcon }).addTo(routeLayers);
      if (last) L.marker([last[1], last[0]], { icon: finishIcon }).addTo(routeLayers);

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { animate: false, padding: [28, 28] });
      }
      onLoadStateChange?.("ready");
    }

    drawRoute().catch(() => {
      if (cancelled) return;
      setRouteLoadWarning("Route geometry could not load.");
      onLoadStateChange?.("error");
      L.marker(hike.map.center).addTo(routeLayers);
    });

    return () => {
      cancelled = true;
      routeLayers.remove();
    };
  }, [hike, onLoadStateChange]);

  return (
    <>
      <div ref={containerRef} className="route-map" />
      {routeLoadWarning ? (
        <div className="map-warning" role="status">
          {routeLoadWarning}
        </div>
      ) : null}
    </>
  );
}
