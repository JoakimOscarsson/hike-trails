import React from "react";
import L from "leaflet";

const tileLayerUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function useLeafletMap(center: [number, number], zoom: number) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const centerLat = center[0];
  const centerLon = center[1];

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      fadeAnimation: false,
      keyboard: false,
      markerZoomAnimation: false,
      scrollWheelZoom: false,
      zoomAnimation: false,
      zoomControl: false
    }).setView([centerLat, centerLon], zoom, { animate: false });
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(tileLayerUrl, {
      attribution: tileLayerAttribution
    }).addTo(map);

    const invalidateTimer = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(invalidateTimer);
      mapRef.current = null;
      map.stop();
      map.off();
      map.remove();
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([centerLat, centerLon], zoom, { animate: false });
  }, [centerLat, centerLon, zoom]);

  return { containerRef, mapRef };
}
