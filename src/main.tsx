import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import { ActivityOverview } from "./components/ActivityOverview";
import { HikeDetails } from "./components/HikeDetails";
import { KayakTripDetails } from "./components/KayakTripDetails";
import { Sidebar } from "./components/LibrarySidebar";
import { LoadingDetails, StatePanel } from "./components/DetailBlocks";
import { TrailSystemDetails } from "./components/TrailSystemDetails";
import { useLibraryData } from "./data/useLibraryData";
import { useLibraryFilters } from "./data/useLibraryFilters";
import { useLibrarySelection, useVisibleItemSelectionGuard } from "./data/useLibrarySelection";
import { useStarredItems } from "./data/useStarredItems";
import { isKayakTrip, isTrailSystem } from "./utils/libraryItem";
import "./styles.css";

function App() {
  const {
    activeActivity,
    selectedItem,
    hoveredItemId,
    setHoveredItemId,
    selectItem,
    backToOverview,
    replaceSelectedItem,
    clearSelectedItem
  } = useLibrarySelection();
  const {
    libraryIndex,
    indexState,
    retryIndex,
    activityOverviews,
    overviewStates,
    retryOverview,
    kayakFacilities,
    kayakFacilityState,
    selectedDetail,
    detailState,
    retryDetail
  } = useLibraryData(activeActivity, selectedItem);
  const { starredItemIds, toggleStar } = useStarredItems(libraryIndex);
  const filters = useLibraryFilters({
    activeActivity,
    libraryIndex,
    kayakFacilities,
    kayakFacilityState,
    starredItemIds
  });
  const {
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
  } = filters;

  useVisibleItemSelectionGuard({ selectedItem, visibleItems, replaceSelectedItem, clearSelectedItem });

  return (
    <div className="app-shell">
      <Sidebar
        activeActivity={activeActivity}
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
        starredHikeIds={starredItemIds}
        onToggleStar={toggleStar}
      />
      {indexState.status === "loading" || indexState.status === "idle" ? (
        <StatePanel title="Loading" message="Fetching route library..." />
      ) : indexState.status === "error" ? (
        <StatePanel
          title="Could not load routes"
          message={indexState.message ?? "The route library could not be loaded."}
          actionLabel="Retry"
          onAction={retryIndex}
        />
      ) : !visibleItems.length ? (
        <StatePanel
          title="No routes found"
          message="No routes match the active search and filters."
          actionLabel="Clear filters"
          onAction={resetFilters}
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
          onRetryOverview={() => retryOverview(activeActivity)}
        />
      ) : detailState.status === "error" ? (
        <StatePanel
          title="Could not load route details"
          message={detailState.message ?? "The selected route details could not be loaded."}
          actionLabel="Retry"
          onAction={retryDetail}
          secondaryActionLabel="Back to overview"
          onSecondaryAction={backToOverview}
        />
      ) : selectedDetail ? (
        isTrailSystem(selectedDetail) ? (
          <TrailSystemDetails
            key={selectedDetail.id}
            trailSystem={selectedDetail}
            isStarred={starredItemIds.has(selectedDetail.id)}
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
            isStarred={starredItemIds.has(selectedDetail.id)}
            onToggleStar={toggleStar}
            onBackToOverview={backToOverview}
          />
        ) : (
          <HikeDetails
            key={selectedDetail.id}
            hike={selectedDetail}
            isStarred={starredItemIds.has(selectedDetail.id)}
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
