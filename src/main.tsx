import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import type {
  ActivityKind,
  KayakFacility,
  LibraryDetail,
  LibraryIndexItem,
  LibraryOverviewFeatureCollection,
  TrailSystem
} from "./types";
import { ActivityOverview } from "./components/ActivityOverview";
import { HikeDetails } from "./components/HikeDetails";
import { KayakTripDetails } from "./components/KayakTripDetails";
import { Sidebar } from "./components/LibrarySidebar";
import { LoadingDetails, StatePanel } from "./components/DetailBlocks";
import { TrailSystemDetails } from "./components/TrailSystemDetails";
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
} from "./data/filters";
import type { LoadState } from "./data/loadState";
import { loadKayakFacilities, loadLibraryDetail, loadLibraryIndex } from "./data/library";
import { isHikingLibraryIndexItem, isKayakTrip, itemLocationLabel, itemSearchText } from "./utils/libraryItem";
import { normalizeSearchText } from "./utils/search";
import "./styles.css";

const starredStorageKey = "hike-library-starred";

const overviewPaths: Record<ActivityKind, string> = {
  hiking: "/data/overviews/hiking.geojson",
  kayaking: "/data/overviews/kayaking.geojson"
};

function isTrailSystem(detail: LibraryDetail): detail is TrailSystem {
  return "itemType" in detail && detail.itemType === "trail-system";
}

function loadStarredHikes() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(starredStorageKey) ?? "[]");
    if (!Array.isArray(stored)) return new Set<string>();
    return new Set(stored.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set<string>();
  }
}

function App() {
  const [libraryIndex, setLibraryIndex] = React.useState<LibraryIndexItem[]>([]);
  const [indexState, setIndexState] = React.useState<LoadState>({ status: "idle" });
  const [indexLoadAttempt, setIndexLoadAttempt] = React.useState(0);
  const [activeActivity, setActiveActivity] = React.useState<ActivityKind>("hiking");
  const [activityOverviews, setActivityOverviews] = React.useState<
    Partial<Record<ActivityKind, LibraryOverviewFeatureCollection>>
  >({});
  const [overviewStates, setOverviewStates] = React.useState<Record<ActivityKind, LoadState>>({
    hiking: { status: "idle" },
    kayaking: { status: "idle" }
  });
  const [overviewLoadAttempts, setOverviewLoadAttempts] = React.useState<Record<ActivityKind, number>>({
    hiking: 0,
    kayaking: 0
  });
  const [kayakFacilities, setKayakFacilities] = React.useState<KayakFacility[]>([]);
  const [kayakFacilityState, setKayakFacilityState] = React.useState<LoadState>({ status: "idle" });
  const [selectedItem, setSelectedItem] = React.useState<LibraryIndexItem | null>(null);
  const [selectedDetail, setSelectedDetail] = React.useState<LibraryDetail | null>(null);
  const [detailState, setDetailState] = React.useState<LoadState>({ status: "idle" });
  const [detailLoadAttempt, setDetailLoadAttempt] = React.useState(0);
  const [detailsCache, setDetailsCache] = React.useState<Record<string, LibraryDetail>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [locationFilter, setLocationFilter] = React.useState("all");
  const [distanceFilter, setDistanceFilter] = React.useState<DistanceFilter>("all");
  const [recommendedTimeFilter, setRecommendedTimeFilter] = React.useState<RecommendedTimeFilter>("all");
  const [kayakDurationFilter, setKayakDurationFilter] = React.useState<KayakDurationFilter>("all");
  const [kayakServiceFilter, setKayakServiceFilter] = React.useState<KayakServiceFilter>("all");
  const [kayakWaterZoneFilter, setKayakWaterZoneFilter] = React.useState<KayakWaterZoneFilter>("all");
  const [kayakExposureFilter, setKayakExposureFilter] = React.useState<KayakExposureFilter>("all");
  const [kayakConfidenceFilter, setKayakConfidenceFilter] = React.useState<KayakConfidenceFilter>("all");
  const [starredHikeIds, setStarredHikeIds] = React.useState<Set<string>>(() => loadStarredHikes());
  const [hoveredItemId, setHoveredItemId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIndexState({ status: "loading" });

    loadLibraryIndex()
      .then((items) => {
        if (cancelled) return;
        if (!Array.isArray(items)) throw new Error("Library index is not an array");
        setLibraryIndex(items);
        setIndexState({ status: "ready" });
        setSelectedItem((current) => (current ? items.find((item) => item.id === current.id) ?? null : null));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLibraryIndex([]);
          setSelectedItem(null);
          setSelectedDetail(null);
          setIndexState({ status: "error", message: error instanceof Error ? error.message : "Could not load routes." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [indexLoadAttempt]);

  React.useEffect(() => {
    if (indexState.status !== "ready") {
      setActivityOverviews({});
      setOverviewStates({ hiking: { status: "idle" }, kayaking: { status: "idle" } });
      return;
    }

    let cancelled = false;
    const activity = activeActivity;
    setOverviewStates((current) => ({ ...current, [activity]: { status: "loading" } }));

    fetch(overviewPaths[activity])
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${activity} overview`);
        return response.json() as Promise<LibraryOverviewFeatureCollection>;
      })
      .then((overview) => {
        if (cancelled) return;
        setActivityOverviews((current) => ({ ...current, [activity]: overview }));
        setOverviewStates((current) => ({ ...current, [activity]: { status: "ready" } }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setActivityOverviews((current) => {
            const next = { ...current };
            delete next[activity];
            return next;
          });
          setOverviewStates((current) => ({
            ...current,
            [activity]: {
              status: "error",
              message: error instanceof Error ? error.message : `Could not load the ${activity} overview.`
            }
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeActivity, indexState.status, overviewLoadAttempts]);

  React.useEffect(() => {
    if (indexState.status !== "ready" || activeActivity !== "kayaking" || kayakFacilityState.status !== "idle") return;

    let cancelled = false;
    setKayakFacilityState({ status: "loading" });

    loadKayakFacilities()
      .then((facilities) => {
        if (cancelled) return;
        if (!Array.isArray(facilities)) throw new Error("Kayak facilities are not an array");
        setKayakFacilities(facilities);
        setKayakFacilityState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setKayakFacilities([]);
          setKayakFacilityState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load kayak facilities."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeActivity, indexState.status]);

  React.useEffect(() => {
    if (!selectedItem) {
      setSelectedDetail(null);
      setDetailState({ status: "idle" });
      return;
    }

    const cached = detailsCache[selectedItem.id];
    if (cached) {
      setSelectedDetail(cached);
      setDetailState({ status: "ready" });
      return;
    }

    let cancelled = false;
    setSelectedDetail(null);
    setDetailState({ status: "loading" });

    loadLibraryDetail(selectedItem)
      .then((detail) => {
        if (cancelled) return;
        setDetailsCache((current) => ({ ...current, [selectedItem.id]: detail }));
        setSelectedDetail(detail);
        setDetailState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSelectedDetail(null);
          setDetailState({
            status: "error",
            message: error instanceof Error ? error.message : `Could not load ${selectedItem.name}.`
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailLoadAttempt, detailsCache, selectedItem]);

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
      .sort((a, b) => Number(starredHikeIds.has(b.id)) - Number(starredHikeIds.has(a.id)));
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
    starredHikeIds
  ]);

  React.useEffect(() => {
    if (!visibleItems.length) {
      if (selectedItem) setSelectedItem(null);
      return;
    }
    if (selectedItem && !visibleItems.some((item) => item.id === selectedItem.id)) {
      setSelectedItem(null);
    }
  }, [selectedItem, visibleItems]);

  React.useEffect(() => {
    window.localStorage.setItem(starredStorageKey, JSON.stringify(Array.from(starredHikeIds)));
  }, [starredHikeIds]);

  React.useEffect(() => {
    if (!libraryIndex.length) return;
    const knownIds = new Set(libraryIndex.map((item) => item.id));
    setStarredHikeIds((current) => {
      const filtered = new Set([...current].filter((id) => knownIds.has(id)));
      return filtered.size === current.size ? current : filtered;
    });
  }, [libraryIndex]);

  function toggleStar(id: string) {
    setStarredHikeIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  const selectItem = React.useCallback((item: LibraryIndexItem) => {
    setSelectedItem(item);
    setSelectedDetail(null);
    setDetailState({ status: "loading" });
    setHoveredItemId(null);
  }, []);

  const backToOverview = React.useCallback(() => {
    setSelectedItem(null);
    setSelectedDetail(null);
    setDetailState({ status: "idle" });
  }, []);

  const changeActivity = React.useCallback((activity: ActivityKind) => {
    setActiveActivity(activity);
    setSelectedItem(null);
    setSelectedDetail(null);
    setDetailState({ status: "idle" });
    setSearchQuery("");
    setLocationFilter("all");
    setDistanceFilter("all");
    setRecommendedTimeFilter("all");
    setKayakDurationFilter("all");
    setKayakServiceFilter("all");
    setKayakWaterZoneFilter("all");
    setKayakExposureFilter("all");
    setKayakConfidenceFilter("all");
    setHoveredItemId(null);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        activeActivity={activeActivity}
        onActivityChange={changeActivity}
        selectedItem={selectedItem}
        onSelect={selectItem}
        visibleItems={visibleItems}
        totalItems={activityItems.length}
        indexState={indexState}
        locationOptions={locationOptions}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        distanceFilter={distanceFilter}
        onDistanceFilterChange={setDistanceFilter}
        recommendedTimeFilter={recommendedTimeFilter}
        onRecommendedTimeFilterChange={setRecommendedTimeFilter}
        kayakDurationFilter={kayakDurationFilter}
        onKayakDurationFilterChange={setKayakDurationFilter}
        kayakServiceFilter={kayakServiceFilter}
        onKayakServiceFilterChange={setKayakServiceFilter}
        kayakWaterZoneFilter={kayakWaterZoneFilter}
        onKayakWaterZoneFilterChange={setKayakWaterZoneFilter}
        kayakExposureFilter={kayakExposureFilter}
        onKayakExposureFilterChange={setKayakExposureFilter}
        kayakConfidenceFilter={kayakConfidenceFilter}
        onKayakConfidenceFilterChange={setKayakConfidenceFilter}
        kayakFacilityState={kayakFacilityState}
        hoveredItemId={hoveredItemId}
        onHoverItemId={setHoveredItemId}
        starredHikeIds={starredHikeIds}
        onToggleStar={toggleStar}
      />
      {indexState.status === "loading" || indexState.status === "idle" ? (
        <StatePanel title="Loading" message="Fetching route library..." />
      ) : indexState.status === "error" ? (
        <StatePanel
          title="Could not load routes"
          message={indexState.message ?? "The route library could not be loaded."}
          actionLabel="Retry"
          onAction={() => setIndexLoadAttempt((attempt) => attempt + 1)}
        />
      ) : !visibleItems.length ? (
        <StatePanel
          title="No routes found"
          message="No routes match the active search and filters."
          actionLabel="Clear filters"
          onAction={() => {
            setSearchQuery("");
            setLocationFilter("all");
            setDistanceFilter("all");
            setRecommendedTimeFilter("all");
            setKayakDurationFilter("all");
            setKayakServiceFilter("all");
            setKayakWaterZoneFilter("all");
            setKayakExposureFilter("all");
            setKayakConfidenceFilter("all");
          }}
        />
      ) : !selectedItem ? (
        <ActivityOverview
          activity={activeActivity}
          items={visibleItems}
          totalItems={activityItems.length}
          overview={activityOverviews[activeActivity] ?? null}
          overviewState={overviewStates[activeActivity]}
          hoveredItemId={hoveredItemId}
          onHoverItemId={setHoveredItemId}
          onSelect={selectItem}
          onRetryOverview={() =>
            setOverviewLoadAttempts((current) => ({ ...current, [activeActivity]: current[activeActivity] + 1 }))
          }
        />
      ) : detailState.status === "error" ? (
        <StatePanel
          title="Could not load route details"
          message={detailState.message ?? "The selected route details could not be loaded."}
          actionLabel="Retry"
          onAction={() => setDetailLoadAttempt((attempt) => attempt + 1)}
          secondaryActionLabel="Back to overview"
          onSecondaryAction={backToOverview}
        />
      ) : selectedDetail ? (
        isTrailSystem(selectedDetail) ? (
          <TrailSystemDetails
            key={selectedDetail.id}
            trailSystem={selectedDetail}
            isStarred={starredHikeIds.has(selectedDetail.id)}
            onToggleStar={toggleStar}
            distanceFilter={distanceFilter}
            onBackToOverview={backToOverview}
          />
        ) : isKayakTrip(selectedDetail) ? (
          <KayakTripDetails
            key={selectedDetail.id}
            trip={selectedDetail}
            kayakFacilities={kayakFacilities}
            kayakFacilityState={kayakFacilityState}
            isStarred={starredHikeIds.has(selectedDetail.id)}
            onToggleStar={toggleStar}
            onBackToOverview={backToOverview}
          />
        ) : (
          <HikeDetails
            key={selectedDetail.id}
            hike={selectedDetail}
            isStarred={starredHikeIds.has(selectedDetail.id)}
            onToggleStar={toggleStar}
            onBackToOverview={backToOverview}
          />
        )
      ) : (
        <LoadingDetails />
      )}
    </div>
  );
}

const rootElement = document.getElementById("root") as HTMLElement;
const root =
  (window as typeof window & { __hikeLibraryRoot?: ReactDOM.Root }).__hikeLibraryRoot ??
  ReactDOM.createRoot(rootElement);
(window as typeof window & { __hikeLibraryRoot?: ReactDOM.Root }).__hikeLibraryRoot = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
