import type {
  HikingLibraryIndexItem,
  KayakTrip,
  KayakTripIndexItem,
  LibraryDetail,
  LibraryIndexItem,
  TrailSystem,
  TripDuration
} from "../types";

const durationLabels: Record<TripDuration, string> = {
  "half-day": "Half day",
  dayhike: "Day hike",
  weekend: "Weekend",
  "3-5-days": "3-5 days",
  "6-plus-days": "6+ days"
};

export function isKayakTripIndexItem(item: LibraryIndexItem): item is KayakTripIndexItem {
  return item.activity === "kayaking" && item.itemType === "kayak-trip";
}

export function isHikingLibraryIndexItem(item: LibraryIndexItem): item is HikingLibraryIndexItem {
  return (item.activity ?? "hiking") === "hiking" && (item.itemType === "hike" || item.itemType === "trail-system");
}

export function isKayakTrip(detail: LibraryDetail): detail is KayakTrip {
  return "activity" in detail && detail.activity === "kayaking" && detail.itemType === "kayak-trip";
}

export function isTrailSystem(detail: LibraryDetail): detail is TrailSystem {
  return "itemType" in detail && detail.itemType === "trail-system";
}

export function itemLocationLabel(item: LibraryIndexItem) {
  return isKayakTripIndexItem(item) ? item.locationLabel : item.location.label;
}

export function itemDistanceLabel(item: LibraryIndexItem | KayakTrip) {
  return Number.isFinite(item.distanceKm) ? `${item.distanceKm} km` : "Distance unknown";
}

export function durationLabel(duration: TripDuration) {
  return durationLabels[duration] ?? duration;
}

export function itemDurationLabel(item: LibraryIndexItem) {
  if (isKayakTripIndexItem(item)) return item.recommendedTimes.map(durationLabel).join(", ");
  if (item.itemType === "trail-system") return "Trail system";
  return durationLabel(item.recommendedTime);
}

export function itemSearchText(item: LibraryIndexItem) {
  return item.normalizedSearchText ?? item.searchText;
}
