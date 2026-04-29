import { renderToStaticMarkup } from "react-dom/server";
import { BusFront, Train } from "lucide-react";
import L from "leaflet";
import type { TrailCommuteStop } from "../types";
import { commuteStopLabel, escapeHtml, type SelectedTrailAccessPoint } from "./hikingFacilities";

const commuteMarkerSize = 25;
const commuteMarkerAnchor = commuteMarkerSize / 2;

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

export type CommuteMapStop = TrailCommuteStop & { accessNames: string[] };

export function commuteIcon(stop: TrailCommuteStop, spidered = false) {
  return L.divIcon({
    className: `commute-marker commute-marker-${stop.type}${spidered ? " commute-spider-marker" : ""}`,
    html: renderToStaticMarkup(stop.type === "bus" ? <BusFront size={14} /> : <Train size={14} />),
    iconSize: [commuteMarkerSize, commuteMarkerSize],
    iconAnchor: [commuteMarkerAnchor, commuteMarkerAnchor]
  });
}

export function commutePopup(stop: CommuteMapStop) {
  return `<strong>${escapeHtml(stop.name)}</strong><br><span>${stop.type === "bus" ? "Bus stop" : "Train stop"}</span><br>${escapeHtml(
    stop.accessNames.join(", ")
  )}<br>${formatDistance(stop.distanceKm)} from nearest listed route endpoint.`;
}

export function addCommuteMarker({
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
