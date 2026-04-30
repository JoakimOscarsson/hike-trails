import type { ReactNode } from "react";
import {
  AlertTriangle,
  CircleParking,
  Droplets,
  Flame,
  House,
  Landmark,
  MapPin,
  Mountain,
  PhoneCall,
  Tent,
  Toilet,
  Train,
  Utensils,
  Waves
} from "lucide-react";
import type { TrailAccessPoint, TrailCommuteStop, TrailFacility, TrailSection } from "../types";

export type FacilityType = TrailFacility["type"];
export type SelectedTrailAccessPoint = TrailAccessPoint & {
  sectionId: string;
  sectionName: string;
  stageNumber: string | number;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isOffRouteFacility(facility: TrailFacility) {
  return facility.routeProximity?.status === "off-route";
}

export function isCloseTrailFacility(facility: TrailFacility) {
  const proximity = facility.routeProximity;
  if (!proximity) return true;
  if (proximity.status === "on-route") return true;
  if (proximity.status === "off-route") return false;
  if (typeof proximity.distanceKm !== "number") return true;
  return proximity.distanceKm <= proximity.thresholdKm;
}

export function facilityProximityText(facility: TrailFacility) {
  if (!isOffRouteFacility(facility)) return "";
  const distance = facility.routeProximity?.distanceKm;
  return distance ? `About ${distance} km from this section's mapped trail line.` : "More than 2 km from this section's mapped trail line.";
}

export function selectedAccessPoints(sections: TrailSection[]): SelectedTrailAccessPoint[] {
  return sections.flatMap((section) =>
    (section.accessPoints ?? []).map((accessPoint) => ({
      ...accessPoint,
      sectionId: section.id,
      sectionName: section.name,
      stageNumber: section.stageNumber
    }))
  );
}

export function commuteStopLabel(stop: TrailCommuteStop) {
  const type = stop.type === "bus" ? "Bus" : "Train";
  const network = stop.network ? ` · ${stop.network}` : "";
  return `${type}: ${stop.name}${network}`;
}

export const facilityTypeLabels: Record<TrailFacility["type"], string> = {
  campsite: "Camping",
  shelter: "Shelter",
  fireplace: "Fireplace",
  toilet: "Toilet",
  water: "Water",
  "natural-water": "Natural water",
  food: "Food",
  swimming: "Swimming",
  parking: "Parking",
  transit: "Transit",
  "rest-area": "Rest area",
  attraction: "Attraction",
  heritage: "Heritage",
  "rule-warning": "Rule warning",
  "unofficial-shelter": "Unofficial shelter",
  "trail-junction": "Trail junction",
  "emergency-phone": "Emergency phone",
  lodging: "Lodging",
  waste: "Waste",
  hazard: "Hazard",
  viewpoint: "Viewpoint",
  camping: "Camping",
  service: "Service"
};

export function facilityTypeIcon(type: FacilityType, size = 15) {
  switch (type) {
    case "campsite":
      return <Tent size={size} aria-hidden="true" />;
    case "shelter":
      return <House size={size} aria-hidden="true" />;
    case "fireplace":
      return <Flame size={size} aria-hidden="true" />;
    case "toilet":
      return <Toilet size={size} aria-hidden="true" />;
    case "water":
      return <Droplets size={size} aria-hidden="true" />;
    case "natural-water":
      return <Droplets size={size} aria-hidden="true" />;
    case "food":
      return <Utensils size={size} aria-hidden="true" />;
    case "swimming":
      return <Waves size={size} aria-hidden="true" />;
    case "parking":
      return <CircleParking size={size} aria-hidden="true" />;
    case "transit":
      return <Train size={size} aria-hidden="true" />;
    case "rest-area":
      return <MapPin size={size} aria-hidden="true" />;
    case "attraction":
      return <Mountain size={size} aria-hidden="true" />;
    case "heritage":
      return <Landmark size={size} aria-hidden="true" />;
    case "rule-warning":
      return <AlertTriangle size={size} aria-hidden="true" />;
    case "unofficial-shelter":
      return <House size={size} aria-hidden="true" />;
    case "trail-junction":
      return <MapPin size={size} aria-hidden="true" />;
    case "emergency-phone":
      return <PhoneCall size={size} aria-hidden="true" />;
    case "lodging":
      return <House size={size} aria-hidden="true" />;
    case "waste":
      return <Toilet size={size} aria-hidden="true" />;
    case "hazard":
      return <AlertTriangle size={size} aria-hidden="true" />;
    case "viewpoint":
      return <Mountain size={size} aria-hidden="true" />;
    case "camping":
      return <Tent size={size} aria-hidden="true" />;
    case "service":
      return <Utensils size={size} aria-hidden="true" />;
  }
}

export const facilityCategoryGroups: Array<{
  id: string;
  title: string;
  icon: ReactNode;
  types: FacilityType[];
}> = [
  { id: "warnings", title: "Warnings", icon: <AlertTriangle size={18} />, types: ["rule-warning", "hazard"] },
  { id: "shelter-emergency", title: "Shelter and emergency", icon: <House size={18} />, types: ["shelter", "unofficial-shelter", "emergency-phone"] },
  { id: "water", title: "Water", icon: <Droplets size={18} />, types: ["water", "natural-water"] },
  { id: "tent-sites", title: "Tent sites", icon: <Tent size={18} />, types: ["campsite", "camping"] },
  { id: "fire", title: "Fire", icon: <Flame size={18} />, types: ["fireplace"] },
  { id: "toilets-waste", title: "Toilets and waste", icon: <Toilet size={18} />, types: ["toilet", "waste"] },
  { id: "food-lodging-services", title: "Food, lodging and services", icon: <Utensils size={18} />, types: ["food", "lodging", "service"] },
  { id: "parking-transit", title: "Parking and transit", icon: <Train size={18} />, types: ["parking", "transit"] },
  { id: "places", title: "Places", icon: <Landmark size={18} />, types: ["rest-area", "attraction", "heritage", "viewpoint", "swimming"] }
];

export const defaultFacilityTypes: FacilityType[] = facilityCategoryGroups.flatMap((group) => group.types);
