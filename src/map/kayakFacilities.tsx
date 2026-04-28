import { CircleParking, House, MapPin, Tent, Train, Waves } from "lucide-react";
import type { KayakFacility, KayakFacilityType } from "../types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const kayakFacilityTypeLabels: Record<KayakFacilityType, string> = {
  "kayak-rental": "Kayak rental",
  "canoe-rental": "Canoe rental",
  "self-service-rental": "Self-service rental",
  launch: "Launch",
  parking: "Parking",
  transport: "Transport",
  campsite: "Campsite",
  "guest-harbor-natural-harbor": "Guest/natural harbor"
};

export const kayakFacilityTypeOrder: KayakFacilityType[] = [
  "kayak-rental",
  "canoe-rental",
  "self-service-rental",
  "launch",
  "parking",
  "transport",
  "campsite",
  "guest-harbor-natural-harbor"
];

export function kayakFacilityTypeIcon(type: KayakFacilityType, size = 15) {
  switch (type) {
    case "kayak-rental":
    case "canoe-rental":
    case "self-service-rental":
      return <Waves size={size} aria-hidden="true" />;
    case "launch":
      return <MapPin size={size} aria-hidden="true" />;
    case "parking":
      return <CircleParking size={size} aria-hidden="true" />;
    case "transport":
      return <Train size={size} aria-hidden="true" />;
    case "campsite":
      return <Tent size={size} aria-hidden="true" />;
    case "guest-harbor-natural-harbor":
      return <House size={size} aria-hidden="true" />;
  }
}

export function hasKayakFacilityCoordinates(facility: KayakFacility): facility is KayakFacility & { coordinates: [number, number] } {
  return Array.isArray(facility.coordinates) && facility.coordinates.length === 2;
}

export function kayakFacilityMarkerClass(type: KayakFacilityType) {
  return `facility-marker kayak-facility-marker kayak-facility-marker-${type}`;
}

export function kayakFacilityPopup(facility: KayakFacility) {
  const access = facility.access.length ? `<br><em>${escapeHtml(facility.access.slice(0, 2).join(" "))}</em>` : "";
  return `<strong>${escapeHtml(facility.name)}</strong><br><span>${escapeHtml(kayakFacilityTypeLabels[facility.type])}</span><br>${escapeHtml(
    facility.description
  )}${access}`;
}
