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

const clusterCoordinatePrecision = 5;
const facilityMarkerSize = 26;
const facilityMarkerAnchor = facilityMarkerSize / 2;

export function visibleHikingMapFacilities(facilities: TrailFacility[] | undefined, visibleFacilityTypes?: Set<FacilityType>) {
  return (facilities ?? []).filter(
    (facility) => facility.coordinates && isCloseTrailFacility(facility) && (visibleFacilityTypes?.has(facility.type) ?? true)
  );
}

function facilityCoordinateKey(facility: TrailFacility) {
  return facility.coordinates?.map((coordinate) => coordinate.toFixed(clusterCoordinatePrecision)).join(":") ?? facility.id;
}

function facilityPopup(facility: TrailFacility) {
  const proximity = facilityProximityText(facility);
  return `<strong>${escapeHtml(facility.name)}</strong><br><span>${facilityTypeLabels[facility.type]}</span>${
    proximity ? `<br><em>${escapeHtml(proximity)}</em>` : ""
  }<br>${escapeHtml(facility.description)}`;
}

function facilityIcon(facility: TrailFacility, offset: [number, number] = [0, 0]) {
  const offRoute = isOffRouteFacility(facility);
  return L.divIcon({
    className: `facility-marker facility-marker-${facility.type}${offRoute ? " facility-marker-off-route" : ""}${
      offset[0] || offset[1] ? " facility-spider-marker" : ""
    }`,
    html: renderToStaticMarkup(
      <>
        {facilityTypeIcon(facility.type, 14)}
        {offRoute ? <span className="facility-distance-alert">!</span> : null}
      </>
    ),
    iconSize: [facilityMarkerSize, facilityMarkerSize],
    iconAnchor: [facilityMarkerAnchor - offset[0], facilityMarkerAnchor - offset[1]],
    popupAnchor: [offset[0], offset[1] - facilityMarkerAnchor]
  });
}

function addFacilityMarker({
  facility,
  markerLayerGroup,
  offset = [0, 0]
}: {
  facility: TrailFacility;
  markerLayerGroup: L.LayerGroup;
  offset?: [number, number];
}) {
  if (!facility.coordinates) return null;
  const proximity = facilityProximityText(facility);
  const marker = L.marker(facility.coordinates, {
    icon: facilityIcon(facility, offset),
    title: proximity ? `${facility.name}: ${proximity}` : facility.name,
    zIndexOffset: offset[0] || offset[1] ? 1000 : 0
  })
    .bindPopup(facilityPopup(facility))
    .addTo(markerLayerGroup);

  if (proximity) marker.bindTooltip(proximity, { direction: "top", offset: [0, -12] });
  return marker;
}

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
  markerLayerGroup
}: {
  facilities: TrailFacility[];
  markerLayerGroup: L.LayerGroup;
}) {
  const coordinates = facilities[0]?.coordinates;
  if (!coordinates) return null;
  const icon = L.divIcon({
    className: "facility-marker facility-cluster-marker",
    html: renderToStaticMarkup(<span>{facilities.length}</span>),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
  const marker = L.marker(coordinates, {
    icon,
    title: `${facilities.length} facilities here. Click to expand.`
  })
    .bindPopup(clusteredFacilityPopup(facilities))
    .bindTooltip(`${facilities.length} facilities here. Click to expand.`, { direction: "top", offset: [0, -14] })
    .addTo(markerLayerGroup);

  const expandedMarkers: L.Layer[] = [];
  const toggleExpandedFacilities = () => {
    if (expandedMarkers.length) {
      for (const expandedMarker of expandedMarkers.splice(0)) markerLayerGroup.removeLayer(expandedMarker);
      marker.closePopup();
      return;
    }

    const radius = Math.max(32, 12 + facilities.length * 4);
    facilities.forEach((facility, index) => {
      const angle = (Math.PI * 2 * index) / facilities.length - Math.PI / 2;
      const expandedMarker = addFacilityMarker({
        facility,
        markerLayerGroup,
        offset: [Math.cos(angle) * radius, Math.sin(angle) * radius]
      });
      if (expandedMarker) expandedMarkers.push(expandedMarker);
    });
    marker.openPopup();
  };
  marker.getElement()?.addEventListener("click", toggleExpandedFacilities);

  return marker;
}

export function addHikingFacilityMarkers({
  facilities,
  markerLayerGroup
}: {
  facilities: TrailFacility[];
  markerLayerGroup: L.LayerGroup;
}) {
  const markers: L.Layer[] = [];
  const facilityGroups = new Map<string, TrailFacility[]>();

  for (const facility of facilities) {
    if (!facility.coordinates) continue;
    const key = facilityCoordinateKey(facility);
    const group = facilityGroups.get(key) ?? [];
    group.push(facility);
    facilityGroups.set(key, group);
  }

  for (const group of facilityGroups.values()) {
    if (group.length === 1) {
      const marker = addFacilityMarker({ facility: group[0], markerLayerGroup });
      if (marker) markers.push(marker);
      continue;
    }

    const marker = addClusteredFacilityMarker({ facilities: group, markerLayerGroup });
    if (marker) markers.push(marker);
  }

  return markers;
}
