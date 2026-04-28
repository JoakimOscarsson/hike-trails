import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import type { TrailFacility } from "../types";
import {
  escapeHtml,
  facilityProximityText,
  facilityTypeIcon,
  facilityTypeLabels,
  isCloseTrailFacility,
  isOffRouteFacility,
  type FacilityType
} from "./hikingFacilities";

const facilityMarkerSize = 26;
const facilityMarkerAnchor = facilityMarkerSize / 2;
const markerOverlapPixels = 30;

export function visibleHikingMapFacilities(facilities: TrailFacility[] | undefined, visibleFacilityTypes?: Set<FacilityType>) {
  return (facilities ?? []).filter(
    (facility) => facility.coordinates && isCloseTrailFacility(facility) && (visibleFacilityTypes?.has(facility.type) ?? true)
  );
}

function facilityPopup(facility: TrailFacility) {
  const proximity = facilityProximityText(facility);
  return `<strong>${escapeHtml(facility.name)}</strong><br><span>${facilityTypeLabels[facility.type]}</span>${
    proximity ? `<br><em>${escapeHtml(proximity)}</em>` : ""
  }<br>${escapeHtml(facility.description)}`;
}

function facilityIcon(facility: TrailFacility, spidered = false) {
  const offRoute = isOffRouteFacility(facility);
  return L.divIcon({
    className: `facility-marker facility-marker-${facility.type}${offRoute ? " facility-marker-off-route" : ""}${
      spidered ? " facility-spider-marker" : ""
    }`,
    html: renderToStaticMarkup(
      <>
        {facilityTypeIcon(facility.type, 14)}
        {offRoute ? <span className="facility-distance-alert">!</span> : null}
      </>
    ),
    iconSize: [facilityMarkerSize, facilityMarkerSize],
    iconAnchor: [facilityMarkerAnchor, facilityMarkerAnchor],
    popupAnchor: [0, -facilityMarkerAnchor]
  });
}

function addFacilityMarker({
  facility,
  markerLayerGroup,
  coordinates = facility.coordinates,
  spidered = false,
  shouldOpen = false
}: {
  facility: TrailFacility;
  markerLayerGroup: L.LayerGroup;
  coordinates?: [number, number];
  spidered?: boolean;
  shouldOpen?: boolean;
}) {
  if (!coordinates) return null;
  const proximity = facilityProximityText(facility);
  const marker = L.marker(coordinates, {
    icon: facilityIcon(facility, spidered),
    title: proximity ? `${facility.name}: ${proximity}` : facility.name,
    zIndexOffset: spidered ? 1000 : 0
  })
    .bindPopup(facilityPopup(facility))
    .addTo(markerLayerGroup);

  if (proximity) marker.bindTooltip(proximity, { direction: "top", offset: [0, -12] });
  if (shouldOpen) marker.openPopup();
  return marker;
}

type FacilityMarkerGroup = {
  facilities: TrailFacility[];
  center: [number, number];
  centerPoint: L.Point;
};

function clusteredFacilityPopup(facilities: TrailFacility[]) {
  const items = facilities
    .map(
      (facility) =>
        `<li><strong>${escapeHtml(facility.name)}</strong><span>${escapeHtml(facilityTypeLabels[facility.type])}</span></li>`
    )
    .join("");
  return `<strong>${facilities.length} facilities here</strong><ul class="facility-cluster-popup">${items}</ul>`;
}

function addClusteredFacilityMarker({
  facilities,
  markerLayerGroup,
  map,
  center,
  focusedFacilityId
}: {
  facilities: TrailFacility[];
  markerLayerGroup: L.LayerGroup;
  map: L.Map;
  center: [number, number];
  focusedFacilityId?: string;
}) {
  const icon = L.divIcon({
    className: "facility-marker facility-cluster-marker",
    html: renderToStaticMarkup(<span>{facilities.length}</span>),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
  const marker = L.marker(center, {
    icon,
    title: `${facilities.length} facilities here. Click to expand.`
  })
    .bindPopup(clusteredFacilityPopup(facilities))
    .bindTooltip(`${facilities.length} facilities here. Click to expand.`, { direction: "top", offset: [0, -14] })
    .addTo(markerLayerGroup);
  if (focusedFacilityId && facilities.some((facility) => facility.id === focusedFacilityId)) {
    marker.openPopup();
  }

  const expandedMarkers: L.Layer[] = [];
  const toggleExpandedFacilities = () => {
    if (expandedMarkers.length) {
      for (const expandedMarker of expandedMarkers.splice(0)) markerLayerGroup.removeLayer(expandedMarker);
      marker.closePopup();
      return;
    }

    const radius = Math.max(34, 14 + facilities.length * 5);
    const centerPoint = map.latLngToLayerPoint(center);
    facilities.forEach((facility, index) => {
      const angle = (Math.PI * 2 * index) / facilities.length - Math.PI / 2;
      const spiderPoint = centerPoint.add(L.point(Math.cos(angle) * radius, Math.sin(angle) * radius));
      const spiderCoordinates = map.layerPointToLatLng(spiderPoint);
      const spiderLeg = L.polyline([center, spiderCoordinates], {
        className: "facility-spider-leg",
        color: "#20321f",
        opacity: 0.55,
        weight: 2
      }).addTo(markerLayerGroup);
      const expandedMarker = addFacilityMarker({
        facility,
        markerLayerGroup,
        coordinates: [spiderCoordinates.lat, spiderCoordinates.lng],
        spidered: true,
        shouldOpen: facility.id === focusedFacilityId
      });
      expandedMarkers.push(spiderLeg);
      if (expandedMarker) expandedMarkers.push(expandedMarker);
    });
    marker.openPopup();
  };
  marker.on("click", toggleExpandedFacilities);

  return marker;
}

function createFacilityMarkerGroups(facilities: TrailFacility[], map: L.Map) {
  const groups: FacilityMarkerGroup[] = [];

  for (const facility of facilities) {
    if (!facility.coordinates) continue;
    const point = map.latLngToLayerPoint(facility.coordinates);
    const group = groups.find((candidate) => candidate.centerPoint.distanceTo(point) < markerOverlapPixels);
    if (!group) {
      groups.push({ facilities: [facility], center: facility.coordinates, centerPoint: point });
      continue;
    }

    group.facilities.push(facility);
    const averageLat =
      group.facilities.reduce((sum, groupedFacility) => sum + (groupedFacility.coordinates?.[0] ?? 0), 0) /
      group.facilities.length;
    const averageLng =
      group.facilities.reduce((sum, groupedFacility) => sum + (groupedFacility.coordinates?.[1] ?? 0), 0) /
      group.facilities.length;
    group.center = [averageLat, averageLng];
    group.centerPoint = map.latLngToLayerPoint(group.center);
  }

  return groups;
}

export function addHikingFacilityMarkers({
  facilities,
  markerLayerGroup,
  map,
  focusedFacilityId
}: {
  facilities: TrailFacility[];
  markerLayerGroup: L.LayerGroup;
  map: L.Map;
  focusedFacilityId?: string;
}) {
  const markers: L.Layer[] = [];

  for (const group of createFacilityMarkerGroups(facilities, map)) {
    if (group.facilities.length === 1) {
      const marker = addFacilityMarker({
        facility: group.facilities[0],
        markerLayerGroup,
        shouldOpen: group.facilities[0].id === focusedFacilityId
      });
      if (marker) markers.push(marker);
      continue;
    }

    const marker = addClusteredFacilityMarker({
      facilities: group.facilities,
      markerLayerGroup,
      map,
      center: group.center,
      focusedFacilityId
    });
    if (marker) markers.push(marker);
  }

  return markers;
}
