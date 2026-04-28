import React from "react";
import L from "leaflet";
import type { TrailFacility, TrailSection, TrailSystem } from "../types";
import { fitSelectedLayersOrMarkers } from "./fitMapBounds";
import { addHikingCommuteMarkers } from "./hikingCommuteMarkers";
import { addHikingFacilityMarkers, visibleHikingMapFacilities } from "./hikingFacilityMarkers";
import { selectedAccessPoints, type FacilityType } from "./hikingFacilities";
import {
  drawTrailSectionRoutes,
  loadTrailSectionRoute,
  trailRouteLoadWarningText,
  trailSectionMarkerLatLng,
  uniqueTrailSections
} from "./trailSystemRouteLayers";
import { useLeafletMap } from "./useLeafletMap";

export type TrailMapFocusTarget = {
  id: string;
  coordinates: [number, number];
  requestId: number;
  zoom?: number;
};

export function TrailSystemMap({
  trailSystem,
  selectedSections,
  primarySections = selectedSections,
  facilities,
  visibleFacilityTypes,
  visibleCommuteTypes,
  focusTarget
}: {
  trailSystem: TrailSystem;
  selectedSections: TrailSection[];
  primarySections?: TrailSection[];
  facilities?: TrailFacility[];
  visibleFacilityTypes?: Set<FacilityType>;
  visibleCommuteTypes?: Set<"bus" | "train">;
  focusTarget?: TrailMapFocusTarget | null;
}) {
  const { containerRef, mapRef } = useLeafletMap(trailSystem.map.center, trailSystem.map.zoom);
  const [routeLoadWarning, setRouteLoadWarning] = React.useState("");
  const selectedKey = selectedSections.map((section) => section.id).join(":");
  const primaryKey = primarySections.map((section) => section.id).join(":");
  const accessPoints = React.useMemo(() => selectedAccessPoints(selectedSections), [selectedSections]);
  const commuteKey = accessPoints
    .flatMap((accessPoint) => [accessPoint.busStop, accessPoint.trainStop])
    .filter(Boolean)
    .filter((stop) => !visibleCommuteTypes || visibleCommuteTypes.has(stop!.type))
    .map((stop) => `${stop?.id}:${stop?.distanceKm}`)
    .join("|");
  const facilityKey = (facilities ?? [])
    .filter((facility) => facility.coordinates && (visibleFacilityTypes?.has(facility.type) ?? true))
    .map((facility) => `${facility.id}:${facility.type}`)
    .join("|");

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.setView(focusTarget.coordinates, Math.max(map.getZoom(), focusTarget.zoom ?? 15), { animate: true });
  }, [focusTarget, mapRef]);

  React.useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap) return;
    const map: L.Map = currentMap;
    const selectedIds = new Set(selectedKey.split(":").filter(Boolean));
    const routeSectionsToLoad = uniqueTrailSections(selectedSections);
    const primaryRouteSections = primarySections.length ? primarySections : routeSectionsToLoad;
    const markerFacilities = visibleHikingMapFacilities(facilities, visibleFacilityTypes);
    const routeLayers = L.layerGroup().addTo(map);
    const markerLayerGroup = L.layerGroup().addTo(map);
    const poiLayerGroup = L.layerGroup().addTo(map);

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
    setRouteLoadWarning("");

    async function drawSections() {
      const markerLayerRefs: L.Layer[] = [];

      const selectedRouteResults = await Promise.all(routeSectionsToLoad.map(loadTrailSectionRoute));
      if (cancelled) return;
      const { selectedLayers, routeCoordinatesBySection, failedRoutes } = drawTrailSectionRoutes({
        routeResults: selectedRouteResults,
        routeLayers,
        selectedIds
      });
      if (failedRoutes.length) setRouteLoadWarning(trailRouteLoadWarningText(failedRoutes));

      const first = trailSectionMarkerLatLng(primaryRouteSections[0], "start", routeCoordinatesBySection);
      const last = trailSectionMarkerLatLng(
        primaryRouteSections[primaryRouteSections.length - 1],
        "end",
        routeCoordinatesBySection
      );
      if (first) {
        const marker = L.marker(first, { icon: startIcon }).addTo(markerLayerGroup);
        markerLayerRefs.push(marker);
      }
      if (last) {
        const marker = L.marker(last, { icon: finishIcon }).addTo(markerLayerGroup);
        markerLayerRefs.push(marker);
      }

      fitSelectedLayersOrMarkers({ map, selectedLayers, markerLayers: markerLayerRefs });
      drawPointsOfInterest();
      if (focusTarget) {
        map.setView(focusTarget.coordinates, Math.max(map.getZoom(), focusTarget.zoom ?? 15), { animate: true });
      }
    }

    function drawPointsOfInterest() {
      poiLayerGroup.clearLayers();
      addHikingFacilityMarkers({
        facilities: markerFacilities,
        markerLayerGroup: poiLayerGroup,
        map,
        focusedFacilityId: focusTarget?.id
      });
      addHikingCommuteMarkers({ accessPoints, markerLayerGroup: poiLayerGroup, visibleTypes: visibleCommuteTypes });
    }

    map.on("zoomend", drawPointsOfInterest);

    drawSections().catch(() => {
      if (cancelled) return;
      setRouteLoadWarning("Map route data could not be drawn.");
      L.marker(trailSystem.map.center).addTo(markerLayerGroup);
    });

    return () => {
      cancelled = true;
      map.off("zoomend", drawPointsOfInterest);
      routeLayers.remove();
      markerLayerGroup.remove();
      poiLayerGroup.remove();
    };
  }, [
    accessPoints,
    commuteKey,
    facilities,
    facilityKey,
    focusTarget,
    primaryKey,
    selectedKey,
    trailSystem,
    visibleCommuteTypes,
    visibleFacilityTypes
  ]);

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
