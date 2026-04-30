import type {
  KayakExposureLevel,
  KayakFacility,
  KayakRouteConfidence,
  KayakWaterZone,
  LibraryIndexItem,
  RecommendedTime
} from "../types";
import {
  hasTrailSystemRouteInDistanceWindow,
  hasTrailSystemRouteOver,
  trailDistanceFilterRanges,
  trailTimeFilterRanges,
  type TrailDistanceFilter as DistanceFilter
} from "./trailRouteSelection";
import { isKayakTripIndexItem } from "../utils/libraryItem";

export type { DistanceFilter };
export type HikingTimeFilter = Exclude<RecommendedTime, "6-plus-days">;
export type RecommendedTimeFilter = "all" | HikingTimeFilter;
export type KayakDurationFilter = "all" | "half-day" | "dayhike" | "weekend" | "multi-day";
export type KayakServiceFilter = "all" | "rental" | "launch" | "parking" | "overnight";
export type KayakWaterZoneFilter = "all" | KayakWaterZone;
export type KayakExposureFilter = "all" | KayakExposureLevel;
export type KayakConfidenceFilter = "all" | KayakRouteConfidence;

export const distanceFilterRanges = trailDistanceFilterRanges;

function finiteItemDistance(item: LibraryIndexItem) {
  return typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm) ? item.distanceKm : null;
}

function itemDistanceInWindow(item: LibraryIndexItem, minKm: number, maxKm?: number) {
  const distanceKm = finiteItemDistance(item);
  return (
    (distanceKm !== null && distanceKm > minKm && (typeof maxKm !== "number" || distanceKm <= maxKm)) ||
    hasTrailSystemRouteInDistanceWindow(item, minKm, maxKm)
  );
}

export const distanceFilters: Array<{ id: DistanceFilter; label: string; matches: (item: LibraryIndexItem) => boolean }> = [
  { id: "all", label: "Any", matches: () => true },
  {
    id: "short",
    label: "0-5 km",
    matches: (item) => itemDistanceInWindow(item, distanceFilterRanges.short!.minKm, distanceFilterRanges.short!.maxKm)
  },
  {
    id: "half-day",
    label: "5-10 km",
    matches: (item) =>
      itemDistanceInWindow(item, distanceFilterRanges["half-day"]!.minKm, distanceFilterRanges["half-day"]!.maxKm)
  },
  {
    id: "full-day",
    label: "10-20 km",
    matches: (item) =>
      itemDistanceInWindow(item, distanceFilterRanges["full-day"]!.minKm, distanceFilterRanges["full-day"]!.maxKm)
  },
  {
    id: "long",
    label: "20-40 km",
    matches: (item) => itemDistanceInWindow(item, distanceFilterRanges.long!.minKm, distanceFilterRanges.long!.maxKm)
  },
  {
    id: "very-long",
    label: "40+ km",
    matches: (item) =>
      (typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm)
        ? item.distanceKm > distanceFilterRanges["very-long"]!.minKm
        : false) || hasTrailSystemRouteOver(item, distanceFilterRanges["very-long"]!.minKm)
  }
];

export const routeGroupKindLabels = {
  mainline: "Main route",
  branch: "Branch",
  access: "Access",
  connector: "Connector"
};

export const recommendedTimeLabels: Record<RecommendedTime, string> = {
  dayhike: "Day hike",
  weekend: "Weekend",
  "3-5-days": "3-5 days",
  "6-10-days": "6-10 days",
  "10-plus-days": "10+ days",
  "6-plus-days": "6-10 days"
};

const legacyTimeFilters: Partial<Record<HikingTimeFilter, RecommendedTime>> = {
  "6-10-days": "6-plus-days"
};

export const recommendedTimeFilters: Array<{
  id: RecommendedTimeFilter;
  label: string;
  matches: (item: LibraryIndexItem) => boolean;
}> = [
  { id: "all", label: "Any", matches: () => true },
  ...Object.entries(trailTimeFilterRanges).map(([id, window]) => ({
    id: id as HikingTimeFilter,
    label: recommendedTimeLabels[id as HikingTimeFilter],
    matches: (item: LibraryIndexItem) => {
      if (itemDistanceInWindow(item, window.minKm, window.maxKm)) return true;
      const legacyTime = legacyTimeFilters[id as HikingTimeFilter];
      const recommendedTimes = item.recommendedTimes ?? [];
      return recommendedTimes.includes(id as RecommendedTime) || (legacyTime ? recommendedTimes.includes(legacyTime) : false);
    }
  }))
];

export const kayakDurationFilters: Array<{ id: KayakDurationFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "half-day", label: "Half day" },
  { id: "dayhike", label: "Day hike" },
  { id: "weekend", label: "Weekend" },
  { id: "multi-day", label: "Multi-day" }
];

export const kayakServiceFilters: Array<{ id: KayakServiceFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "rental", label: "Rental" },
  { id: "launch", label: "Launch" },
  { id: "parking", label: "Parking" },
  { id: "overnight", label: "Overnight" }
];

export const kayakWaterZoneFilters: Array<{ id: KayakWaterZoneFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "inner", label: "Inner" },
  { id: "middle", label: "Middle" },
  { id: "outer", label: "Outer" },
  { id: "unknown", label: "Unknown" }
];

export const kayakExposureFilters: Array<{ id: KayakExposureFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "sheltered", label: "Sheltered" },
  { id: "mixed", label: "Mixed" },
  { id: "exposed", label: "Exposed" }
];

export const kayakConfidenceFilters: Array<{ id: KayakConfidenceFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "high", label: "High" },
  { id: "medium-high", label: "Medium-high" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" }
];

export function recommendedTimeForDistance(distanceKm: number): RecommendedTime {
  if (distanceKm <= 20) return "dayhike";
  if (distanceKm <= 50) return "weekend";
  if (distanceKm <= 125) return "3-5-days";
  if (distanceKm <= 250) return "6-10-days";
  return "10-plus-days";
}

export function formatDistance(distanceKm: number) {
  return `${Number(distanceKm.toFixed(1))} km`;
}

export function kayakFacilityServiceMatches(facility: KayakFacility, filter: KayakServiceFilter) {
  const signals = new Set([facility.type, facility.primaryCategory, ...facility.categories, ...facility.serviceTags]);
  switch (filter) {
    case "all":
      return true;
    case "rental":
      return (
        signals.has("kayak-rental") ||
        signals.has("canoe-rental") ||
        signals.has("self-service-rental") ||
        signals.has("rental") ||
        signals.has("staffed-rental")
      );
    case "launch":
      return signals.has("launch") || signals.has("launch-access");
    case "parking":
      return signals.has("parking");
    case "overnight":
      return (
        signals.has("campsite") ||
        signals.has("camping") ||
        signals.has("guest-harbor-natural-harbor") ||
        signals.has("natural-harbor") ||
        signals.has("harbor")
      );
  }
}

export function kayakDurationMatches(item: LibraryIndexItem, filter: KayakDurationFilter) {
  if (filter === "all") return true;
  if (filter === "multi-day") {
    return item.recommendedTimes.some((duration) =>
      ["3-5-days", "6-10-days", "10-plus-days", "6-plus-days"].includes(duration)
    );
  }
  return item.recommendedTimes.some((duration) => duration === filter);
}

export function kayakServiceMatches(item: LibraryIndexItem, facilities: KayakFacility[], filter: KayakServiceFilter) {
  if (filter === "all") return true;
  if (!isKayakTripIndexItem(item)) return false;
  return facilities.some((facility) => facility.routeIds.includes(item.id) && kayakFacilityServiceMatches(facility, filter));
}

export function kayakMetadataMatches(
  item: LibraryIndexItem,
  {
    waterZone,
    exposure,
    confidence
  }: {
    waterZone: KayakWaterZoneFilter;
    exposure: KayakExposureFilter;
    confidence: KayakConfidenceFilter;
  }
) {
  if (!isKayakTripIndexItem(item)) return false;
  return (
    (waterZone === "all" || item.waterZone === waterZone) &&
    (exposure === "all" || item.exposureLevel === exposure) &&
    (confidence === "all" || item.routeConfidence === confidence)
  );
}
