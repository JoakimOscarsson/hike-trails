import React from "react";
import type { ActivityKind, KayakFacility, LibraryIndexItem } from "../types";
import { isHikingLibraryIndexItem, itemLocationLabel, itemSearchText } from "../utils/libraryItem";
import { normalizeSearchText } from "../utils/search";
import {
  distanceFilters,
  kayakDurationMatches,
  kayakMetadataMatches,
  kayakServiceMatches,
  recommendedTimeFilters,
  type DistanceFilter,
  type KayakConfidenceFilter,
  type KayakDurationFilter,
  type KayakExposureFilter,
  type KayakServiceFilter,
  type KayakWaterZoneFilter,
  type RecommendedTimeFilter
} from "./filters";
import type { LoadState } from "./loadState";

export function useLibraryFilters({
  activeActivity,
  libraryIndex,
  kayakFacilities,
  kayakFacilityState,
  starredItemIds
}: {
  activeActivity: ActivityKind;
  libraryIndex: LibraryIndexItem[];
  kayakFacilities: KayakFacility[];
  kayakFacilityState: LoadState;
  starredItemIds: Set<string>;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [locationFilter, setLocationFilter] = React.useState("all");
  const [distanceFilter, setDistanceFilter] = React.useState<DistanceFilter>("all");
  const [recommendedTimeFilter, setRecommendedTimeFilter] = React.useState<RecommendedTimeFilter>("all");
  const [kayakDurationFilter, setKayakDurationFilter] = React.useState<KayakDurationFilter>("all");
  const [kayakServiceFilter, setKayakServiceFilter] = React.useState<KayakServiceFilter>("all");
  const [kayakWaterZoneFilter, setKayakWaterZoneFilter] = React.useState<KayakWaterZoneFilter>("all");
  const [kayakExposureFilter, setKayakExposureFilter] = React.useState<KayakExposureFilter>("all");
  const [kayakConfidenceFilter, setKayakConfidenceFilter] = React.useState<KayakConfidenceFilter>("all");

  const resetFilters = React.useCallback(() => {
    setSearchQuery("");
    setLocationFilter("all");
    setDistanceFilter("all");
    setRecommendedTimeFilter("all");
    setKayakDurationFilter("all");
    setKayakServiceFilter("all");
    setKayakWaterZoneFilter("all");
    setKayakExposureFilter("all");
    setKayakConfidenceFilter("all");
  }, []);

  const activityItems = React.useMemo(
    () => libraryIndex.filter((item) => (item.activity ?? "hiking") === activeActivity),
    [activeActivity, libraryIndex]
  );

  const locationOptions = React.useMemo(
    () => Array.from(new Set(activityItems.map(itemLocationLabel))).sort(),
    [activityItems]
  );

  const visibleItems = React.useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    const distance = distanceFilters.find((filter) => filter.id === distanceFilter) ?? distanceFilters[0];
    const recommendedTime =
      recommendedTimeFilters.find((filter) => filter.id === recommendedTimeFilter) ?? recommendedTimeFilters[0];

    return activityItems
      .filter((item) => {
        if (activeActivity === "kayaking") {
          const searchableText = itemSearchText(item);
          const matchesSearch = !query || searchableText.includes(query);
          const matchesLocation = locationFilter === "all" || itemLocationLabel(item) === locationFilter;
          const matchesDuration = kayakDurationMatches(item, kayakDurationFilter);
          const matchesService =
            kayakServiceFilter === "all" ||
            kayakFacilityState.status !== "ready" ||
            kayakServiceMatches(item, kayakFacilities, kayakServiceFilter);
          const matchesMetadata = kayakMetadataMatches(item, {
            waterZone: kayakWaterZoneFilter,
            exposure: kayakExposureFilter,
            confidence: kayakConfidenceFilter
          });

          return matchesSearch && matchesLocation && matchesDuration && matchesService && matchesMetadata;
        }
        if (!isHikingLibraryIndexItem(item)) return false;
        const searchableText = itemSearchText(item);
        const matchesSearch = !query || searchableText.includes(query);
        const matchesLocation = locationFilter === "all" || itemLocationLabel(item) === locationFilter;
        const matchesDistance = distance.matches(item);
        const matchesRecommendedTime = recommendedTime.matches(item);

        return matchesSearch && matchesLocation && matchesDistance && matchesRecommendedTime;
      })
      .sort((a, b) => Number(starredItemIds.has(b.id)) - Number(starredItemIds.has(a.id)));
  }, [
    activeActivity,
    activityItems,
    distanceFilter,
    kayakDurationFilter,
    kayakExposureFilter,
    kayakFacilities,
    kayakFacilityState.status,
    kayakConfidenceFilter,
    kayakServiceFilter,
    kayakWaterZoneFilter,
    locationFilter,
    recommendedTimeFilter,
    searchQuery,
    starredItemIds
  ]);

  return {
    activityItems,
    locationOptions,
    visibleItems,
    resetFilters,
    searchQuery,
    setSearchQuery,
    locationFilter,
    setLocationFilter,
    distanceFilter,
    setDistanceFilter,
    recommendedTimeFilter,
    setRecommendedTimeFilter,
    kayakDurationFilter,
    setKayakDurationFilter,
    kayakServiceFilter,
    setKayakServiceFilter,
    kayakWaterZoneFilter,
    setKayakWaterZoneFilter,
    kayakExposureFilter,
    setKayakExposureFilter,
    kayakConfidenceFilter,
    setKayakConfidenceFilter
  };
}
