import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import type { TrailFacility } from "../types";
import { addCommuteMarker, commuteStopsForAccessPoints, type CommuteMapStop } from "./hikingCommuteMarkers";
import {
  escapeHtml,
  facilityProximityText,
  facilityTypeIcon,
  facilityTypeLabels,
  isCloseTrailFacility,
  isOffRouteFacility,
  type FacilityType,
  type SelectedTrailAccessPoint
} from "./hikingFacilities";

const facilityMarkerSize = 26;
const facilityMarkerAnchor = facilityMarkerSize / 2;
const poiOverlapPixels = 38;
const collapsedClusterSize = 32;
const originDotSize = 14;

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

type FacilityPoiMarkerItem = {
  kind: "facility";
  id: string;
  coordinates: [number, number];
  facility: TrailFacility;
};

type CommutePoiMarkerItem = {
  kind: "commute";
  id: string;
  coordinates: [number, number];
  stop: CommuteMapStop;
};

type PoiMarkerItem = FacilityPoiMarkerItem | CommutePoiMarkerItem;

type PoiMarkerGroup = {
  items: PoiMarkerItem[];
  center: [number, number];
  centerPoint: L.Point;
};

function markerItemClasses(item: PoiMarkerItem) {
  if (item.kind === "facility") return [`facility-cluster-has-${item.facility.type}`];
  return [`commute-cluster-has-${item.stop.type}`];
}

function clusterSummary(items: PoiMarkerItem[]) {
  const facilityCount = items.filter((item) => item.kind === "facility").length;
  const commuteCount = items.length - facilityCount;
  if (facilityCount && commuteCount) return `${facilityCount} facilities and ${commuteCount} transit stops here. Click to expand.`;
  if (commuteCount) return `${commuteCount} transit stops here. Click to expand.`;
  return `${facilityCount} facilities here. Click to expand.`;
}

function clusterIcon(items: PoiMarkerItem[], expanded = false) {
  const hasFacilities = items.some((item) => item.kind === "facility");
  const hasCommute = items.some((item) => item.kind === "commute");
  const clusterTypeClasses = [...new Set(items.flatMap(markerItemClasses))].join(" ");
  const className = [
    "poi-cluster-marker",
    hasFacilities ? "facility-marker facility-cluster-marker" : "",
    hasCommute ? "commute-marker commute-cluster-marker" : "",
    expanded ? "poi-cluster-origin-dot" : "",
    clusterTypeClasses
  ]
    .filter(Boolean)
    .join(" ");
  const size = expanded ? originDotSize : collapsedClusterSize;
  const anchor = size / 2;
  return L.divIcon({
    className,
    html: expanded ? renderToStaticMarkup(<span aria-hidden="true" />) : renderToStaticMarkup(<span>{items.length}</span>),
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor]
  });
}

function setMarkerTitle(marker: L.Marker, title: string) {
  marker.options.title = title;
  marker.getElement()?.setAttribute("title", title);
}

function addPoiMarker({
  coordinates,
  item,
  markerLayerGroup,
  shouldOpen = false,
  spidered = false
}: {
  coordinates?: [number, number];
  item: PoiMarkerItem;
  markerLayerGroup: L.LayerGroup;
  shouldOpen?: boolean;
  spidered?: boolean;
}) {
  if (item.kind === "facility") {
    return addFacilityMarker({
      coordinates,
      facility: item.facility,
      markerLayerGroup,
      shouldOpen,
      spidered
    });
  }

  return addCommuteMarker({
    coordinates,
    markerLayerGroup,
    spidered,
    stop: item.stop
  });
}

function addClusteredPoiMarker({
  items,
  markerLayerGroup,
  map,
  center,
  focusedFacilityId
}: {
  items: PoiMarkerItem[];
  markerLayerGroup: L.LayerGroup;
  map: L.Map;
  center: [number, number];
  focusedFacilityId?: string;
}) {
  const title = clusterSummary(items);
  const marker = L.marker(center, {
    icon: clusterIcon(items),
    title
  })
    .bindTooltip(title, { direction: "top", offset: [0, -14] })
    .addTo(markerLayerGroup);

  const shouldExpandFocusedFacility = focusedFacilityId
    ? items.some((item) => item.kind === "facility" && item.facility.id === focusedFacilityId)
    : false;
  const expandedMarkers: L.Layer[] = [];
  const toggleExpandedPois = () => {
    if (expandedMarkers.length) {
      for (const expandedMarker of expandedMarkers.splice(0)) markerLayerGroup.removeLayer(expandedMarker);
      marker.setIcon(clusterIcon(items));
      marker.bindTooltip(title, { direction: "top", offset: [0, -14] });
      setMarkerTitle(marker, title);
      marker.setZIndexOffset(0);
      return;
    }

    marker.closeTooltip();
    marker.unbindTooltip();
    marker.setIcon(clusterIcon(items, true));
    setMarkerTitle(marker, "Collapse expanded places.");
    marker.setZIndexOffset(900);

    const radius = Math.max(42, 18 + items.length * 5);
    const centerPoint = map.latLngToLayerPoint(center);
    items.forEach((item, index) => {
      const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2;
      const spiderPoint = centerPoint.add(L.point(Math.cos(angle) * radius, Math.sin(angle) * radius));
      const spiderCoordinates = map.layerPointToLatLng(spiderPoint);
      const spiderLeg = L.polyline([center, spiderCoordinates], {
        className: item.kind === "facility" ? "facility-spider-leg poi-spider-leg" : "commute-spider-leg poi-spider-leg",
        color: item.kind === "facility" ? "#20321f" : "#1f4864",
        opacity: 0.55,
        weight: 2
      }).addTo(markerLayerGroup);
      const expandedMarker = addPoiMarker({
        item,
        markerLayerGroup,
        coordinates: [spiderCoordinates.lat, spiderCoordinates.lng],
        spidered: true,
        shouldOpen: item.kind === "facility" && item.facility.id === focusedFacilityId
      });
      expandedMarkers.push(spiderLeg);
      if (expandedMarker) expandedMarkers.push(expandedMarker);
    });
  };
  marker.on("click", toggleExpandedPois);
  if (shouldExpandFocusedFacility) toggleExpandedPois();

  return marker;
}

function createPoiMarkerGroups(items: PoiMarkerItem[], map: L.Map) {
  const groups: PoiMarkerGroup[] = [];

  for (const item of items) {
    const point = map.latLngToLayerPoint(item.coordinates);
    const group = groups.find((candidate) => candidate.centerPoint.distanceTo(point) < poiOverlapPixels);
    if (!group) {
      groups.push({ items: [item], center: item.coordinates, centerPoint: point });
      continue;
    }

    group.items.push(item);
    const averageLat =
      group.items.reduce((sum, groupedItem) => sum + groupedItem.coordinates[0], 0) /
      group.items.length;
    const averageLng =
      group.items.reduce((sum, groupedItem) => sum + groupedItem.coordinates[1], 0) /
      group.items.length;
    group.center = [averageLat, averageLng];
    group.centerPoint = map.latLngToLayerPoint(group.center);
  }

  return groups;
}

function facilityPoiItems(facilities: TrailFacility[]) {
  return facilities.flatMap((facility): PoiMarkerItem[] => {
    if (!facility.coordinates) return [];
    return [{ kind: "facility", id: facility.id, coordinates: facility.coordinates, facility }];
  });
}

function commutePoiItems(accessPoints: SelectedTrailAccessPoint[] = [], visibleTypes?: Set<CommuteMapStop["type"]>) {
  return commuteStopsForAccessPoints(accessPoints)
    .filter((stop) => !visibleTypes || visibleTypes.has(stop.type))
    .map(
      (stop): PoiMarkerItem => ({
        kind: "commute",
        id: stop.id,
        coordinates: stop.coordinates,
        stop
      })
    );
}

export function addHikingPoiMarkers({
  accessPoints,
  facilities,
  markerLayerGroup,
  map,
  focusedFacilityId,
  visibleCommuteTypes
}: {
  accessPoints?: SelectedTrailAccessPoint[];
  facilities: TrailFacility[];
  markerLayerGroup: L.LayerGroup;
  map: L.Map;
  focusedFacilityId?: string;
  visibleCommuteTypes?: Set<CommuteMapStop["type"]>;
}) {
  const markers: L.Layer[] = [];
  const markerItems = [...facilityPoiItems(facilities), ...commutePoiItems(accessPoints, visibleCommuteTypes)];

  for (const group of createPoiMarkerGroups(markerItems, map)) {
    if (group.items.length === 1) {
      const marker = addPoiMarker({
        item: group.items[0],
        markerLayerGroup,
        shouldOpen: group.items[0].kind === "facility" && group.items[0].facility.id === focusedFacilityId
      });
      if (marker) markers.push(marker);
      continue;
    }

    const marker = addClusteredPoiMarker({
      items: group.items,
      markerLayerGroup,
      map,
      center: group.center,
      focusedFacilityId
    });
    if (marker) markers.push(marker);
  }

  return markers;
}
