import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import type { KayakFacility, KayakFacilityType, KayakTrip } from "../types";
import {
  hasKayakFacilityCoordinates,
  kayakFacilityMarkerClass,
  kayakFacilityPopup,
  kayakFacilityTypeIcon,
  kayakFacilityTypeLabels
} from "./kayakFacilities";
import { loadRouteGeometry } from "./routeGeometry";
import type { HikeMapStatus } from "./types";
import { useLeafletMap } from "./useLeafletMap";

export function KayakTripMap({
  trip,
  facilities,
  visibleFacilityTypes,
  onLoadStateChange
}: {
  trip: KayakTrip;
  facilities: KayakFacility[];
  visibleFacilityTypes: Set<KayakFacilityType>;
  onLoadStateChange?: (status: HikeMapStatus) => void;
}) {
  const { containerRef, mapRef } = useLeafletMap(trip.map.center, trip.map.zoom);
  const [routeLoadWarning, setRouteLoadWarning] = React.useState("");
  const facilityKey = facilities
    .filter((facility) => hasKayakFacilityCoordinates(facility) && visibleFacilityTypes.has(facility.type))
    .map((facility) => `${facility.id}:${facility.type}`)
    .join("|");

  React.useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap) return;
    const map: L.Map = currentMap;
    const routeLayers = L.layerGroup().addTo(map);
    const markerLayerGroup = L.layerGroup().addTo(map);
    const markerLayerRefs: L.Layer[] = [];
    const markerFacilities = facilities.filter(
      (facility): facility is KayakFacility & { coordinates: [number, number] } =>
        hasKayakFacilityCoordinates(facility) && visibleFacilityTypes.has(facility.type)
    );
    setRouteLoadWarning("");
    onLoadStateChange?.("loading");

    function drawFacilities() {
      for (const facility of markerFacilities) {
        const icon = L.divIcon({
          className: kayakFacilityMarkerClass(facility.type),
          html: renderToStaticMarkup(kayakFacilityTypeIcon(facility.type, 14)),
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        const marker = L.marker(facility.coordinates, {
          icon,
          title: `${facility.name}: ${kayakFacilityTypeLabels[facility.type]}`
        })
          .bindPopup(kayakFacilityPopup(facility))
          .addTo(markerLayerGroup);
        markerLayerRefs.push(marker);
      }
    }

    let cancelled = false;
    loadRouteGeometry(trip.route.geojsonPath)
      .then(({ geojson }) => {
        if (cancelled) return;
        const routeLayer = L.geoJSON(geojson, {
          style: {
            color: "#2f6f8f",
            opacity: 0.9,
            weight: 5
          }
        }).addTo(routeLayers);
        drawFacilities();
        const bounds = L.featureGroup([routeLayer, ...markerLayerRefs]).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { animate: false, padding: [26, 26] });
        onLoadStateChange?.("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRouteLoadWarning(error instanceof Error ? error.message : "Could not load kayak route corridor.");
        L.marker(trip.map.center).addTo(routeLayers);
        drawFacilities();
        const markerBounds = L.featureGroup(markerLayerRefs).getBounds();
        if (markerBounds.isValid()) map.fitBounds(markerBounds, { animate: false, padding: [26, 26] });
        else map.setView(trip.map.center, trip.map.zoom, { animate: false });
        onLoadStateChange?.("error");
      });

    return () => {
      cancelled = true;
      routeLayers.remove();
      markerLayerGroup.remove();
    };
  }, [facilities, facilityKey, mapRef, onLoadStateChange, trip, visibleFacilityTypes]);

  return (
    <>
      {routeLoadWarning ? <div className="map-warning">{routeLoadWarning}</div> : null}
      <div ref={containerRef} className="route-map" />
    </>
  );
}
