import { renderToStaticMarkup } from "react-dom/server";
import { BusFront, Train } from "lucide-react";
import L from "leaflet";
import type { TrailCommuteStop } from "../types";
import { commuteStopLabel, escapeHtml, type SelectedTrailAccessPoint } from "./hikingFacilities";

const commuteMarkerSize = 25;
const commuteMarkerAnchor = commuteMarkerSize / 2;
const commuteOverlapPixels = 38;

function formatDistance(distanceKm: number) {
  return `${Number(distanceKm.toFixed(1))} km`;
}

export function commuteStopsForAccessPoints(accessPoints: SelectedTrailAccessPoint[]) {
  const commuteStops = new Map<string, TrailCommuteStop & { accessNames: string[] }>();
  for (const accessPoint of accessPoints) {
    for (const stop of [accessPoint.busStop, accessPoint.trainStop]) {
      if (!stop) continue;
      const existing = commuteStops.get(stop.id);
      const accessName = `${accessPoint.placeName} ${accessPoint.endpoint}`;
      if (existing) {
        if (!existing.accessNames.includes(accessName)) existing.accessNames.push(accessName);
      } else {
        commuteStops.set(stop.id, { ...stop, accessNames: [accessName] });
      }
    }
  }
  return [...commuteStops.values()];
}

type CommuteMapStop = TrailCommuteStop & { accessNames: string[] };

type CommuteMarkerGroup = {
  stops: CommuteMapStop[];
  center: [number, number];
  centerPoint: L.Point;
};

function commuteIcon(stop: TrailCommuteStop, spidered = false) {
  return L.divIcon({
    className: `commute-marker commute-marker-${stop.type}${spidered ? " commute-spider-marker" : ""}`,
    html: renderToStaticMarkup(stop.type === "bus" ? <BusFront size={14} /> : <Train size={14} />),
    iconSize: [commuteMarkerSize, commuteMarkerSize],
    iconAnchor: [commuteMarkerAnchor, commuteMarkerAnchor]
  });
}

function commutePopup(stop: CommuteMapStop) {
  return `<strong>${escapeHtml(stop.name)}</strong><br><span>${stop.type === "bus" ? "Bus stop" : "Train stop"}</span><br>${escapeHtml(
    stop.accessNames.join(", ")
  )}<br>${formatDistance(stop.distanceKm)} from nearest listed route endpoint.`;
}

function addCommuteMarker({
  markerLayerGroup,
  coordinates,
  spidered = false,
  stop
}: {
  markerLayerGroup: L.LayerGroup;
  coordinates?: [number, number];
  spidered?: boolean;
  stop: CommuteMapStop;
}) {
  if (!coordinates) return null;
  return L.marker(coordinates, {
    icon: commuteIcon(stop, spidered),
    title: commuteStopLabel(stop),
    zIndexOffset: spidered ? 1000 : 0
  })
    .bindPopup(commutePopup(stop))
    .addTo(markerLayerGroup);
}

function clusteredCommutePopup(stops: CommuteMapStop[]) {
  const items = stops
    .map((stop) => `<li><strong>${escapeHtml(stop.name)}</strong><span>${stop.type === "bus" ? "Bus stop" : "Train stop"}</span></li>`)
    .join("");
  return `<strong>${stops.length} transit stops here</strong><ul class="facility-cluster-popup">${items}</ul>`;
}

function addClusteredCommuteMarker({
  center,
  map,
  markerLayerGroup,
  stops
}: {
  center: [number, number];
  map: L.Map;
  markerLayerGroup: L.LayerGroup;
  stops: CommuteMapStop[];
}) {
  const icon = L.divIcon({
    className: "commute-marker commute-cluster-marker",
    html: renderToStaticMarkup(<span>{stops.length}</span>),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
  const marker = L.marker(center, {
    icon,
    title: `${stops.length} transit stops here. Click to expand.`
  })
    .bindPopup(clusteredCommutePopup(stops))
    .bindTooltip(`${stops.length} transit stops here. Click to expand.`, { direction: "top", offset: [0, -14] })
    .addTo(markerLayerGroup);

  const expandedMarkers: L.Layer[] = [];
  const toggleExpandedStops = () => {
    if (expandedMarkers.length) {
      for (const expandedMarker of expandedMarkers.splice(0)) markerLayerGroup.removeLayer(expandedMarker);
      marker.closePopup();
      return;
    }

    const radius = Math.max(34, 14 + stops.length * 5);
    const centerPoint = map.latLngToLayerPoint(center);
    stops.forEach((stop, index) => {
      const angle = (Math.PI * 2 * index) / stops.length - Math.PI / 2;
      const spiderPoint = centerPoint.add(L.point(Math.cos(angle) * radius, Math.sin(angle) * radius));
      const spiderCoordinates = map.layerPointToLatLng(spiderPoint);
      const spiderLeg = L.polyline([center, spiderCoordinates], {
        className: "commute-spider-leg",
        color: "#1f4864",
        opacity: 0.55,
        weight: 2
      }).addTo(markerLayerGroup);
      const expandedMarker = addCommuteMarker({
        markerLayerGroup,
        coordinates: [spiderCoordinates.lat, spiderCoordinates.lng],
        spidered: true,
        stop
      });
      expandedMarkers.push(spiderLeg);
      if (expandedMarker) expandedMarkers.push(expandedMarker);
    });
    marker.openPopup();
  };

  marker.on("click", toggleExpandedStops);
  return marker;
}

function createCommuteMarkerGroups(stops: CommuteMapStop[], map: L.Map) {
  const groups: CommuteMarkerGroup[] = [];

  for (const stop of stops) {
    const point = map.latLngToLayerPoint(stop.coordinates);
    const group = groups.find((candidate) => candidate.centerPoint.distanceTo(point) < commuteOverlapPixels);
    if (!group) {
      groups.push({ stops: [stop], center: stop.coordinates, centerPoint: point });
      continue;
    }

    group.stops.push(stop);
    const averageLat = group.stops.reduce((sum, groupedStop) => sum + groupedStop.coordinates[0], 0) / group.stops.length;
    const averageLng = group.stops.reduce((sum, groupedStop) => sum + groupedStop.coordinates[1], 0) / group.stops.length;
    group.center = [averageLat, averageLng];
    group.centerPoint = map.latLngToLayerPoint(group.center);
  }

  return groups;
}

export function addHikingCommuteMarkers({
  accessPoints,
  map,
  markerLayerGroup,
  visibleTypes
}: {
  accessPoints: SelectedTrailAccessPoint[];
  map: L.Map;
  markerLayerGroup: L.LayerGroup;
  visibleTypes?: Set<TrailCommuteStop["type"]>;
}) {
  const markers: L.Layer[] = [];
  const stops = commuteStopsForAccessPoints(accessPoints).filter((stop) => !visibleTypes || visibleTypes.has(stop.type));

  for (const group of createCommuteMarkerGroups(stops, map)) {
    if (group.stops.length === 1) {
      const marker = addCommuteMarker({ markerLayerGroup, stop: group.stops[0] });
      if (marker) markers.push(marker);
      continue;
    }

    const marker = addClusteredCommuteMarker({ center: group.center, map, markerLayerGroup, stops: group.stops });
    markers.push(marker);
  }

  return markers;
}
