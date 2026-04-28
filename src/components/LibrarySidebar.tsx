import React from "react";
import { AlertTriangle, CalendarDays, Filter, Info, Layers, Mountain, Search, Star, Waves } from "lucide-react";
import type { ActivityKind, LibraryIndexItem } from "../types";
import { ActivitySwitcher } from "./ActivitySwitcher";
import type { LoadState } from "../data/loadState";
import {
  distanceFilters,
  kayakConfidenceFilters,
  kayakDurationFilters,
  kayakExposureFilters,
  kayakServiceFilters,
  kayakWaterZoneFilters,
  recommendedTimeFilters,
  type DistanceFilter,
  type KayakConfidenceFilter,
  type KayakDurationFilter,
  type KayakExposureFilter,
  type KayakServiceFilter,
  type KayakWaterZoneFilter,
  type RecommendedTimeFilter
} from "../data/filters";
import { itemDistanceLabel, itemDurationLabel, itemLocationLabel } from "../utils/libraryItem";

export function Sidebar({
  activeActivity,
  onActivityChange,
  selectedItem,
  onSelect,
  visibleItems,
  totalItems,
  indexState,
  locationOptions,
  searchQuery,
  onSearchQueryChange,
  locationFilter,
  onLocationFilterChange,
  distanceFilter,
  onDistanceFilterChange,
  recommendedTimeFilter,
  onRecommendedTimeFilterChange,
  kayakDurationFilter,
  onKayakDurationFilterChange,
  kayakServiceFilter,
  onKayakServiceFilterChange,
  kayakWaterZoneFilter,
  onKayakWaterZoneFilterChange,
  kayakExposureFilter,
  onKayakExposureFilterChange,
  kayakConfidenceFilter,
  onKayakConfidenceFilterChange,
  kayakFacilityState,
  hoveredItemId,
  onHoverItemId,
  starredHikeIds,
  onToggleStar
}: {
  activeActivity: ActivityKind;
  onActivityChange: (activity: ActivityKind) => void;
  selectedItem: LibraryIndexItem | null;
  onSelect: (item: LibraryIndexItem) => void;
  visibleItems: LibraryIndexItem[];
  totalItems: number;
  indexState: LoadState;
  locationOptions: string[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  distanceFilter: DistanceFilter;
  onDistanceFilterChange: (value: DistanceFilter) => void;
  recommendedTimeFilter: RecommendedTimeFilter;
  onRecommendedTimeFilterChange: (value: RecommendedTimeFilter) => void;
  kayakDurationFilter: KayakDurationFilter;
  onKayakDurationFilterChange: (value: KayakDurationFilter) => void;
  kayakServiceFilter: KayakServiceFilter;
  onKayakServiceFilterChange: (value: KayakServiceFilter) => void;
  kayakWaterZoneFilter: KayakWaterZoneFilter;
  onKayakWaterZoneFilterChange: (value: KayakWaterZoneFilter) => void;
  kayakExposureFilter: KayakExposureFilter;
  onKayakExposureFilterChange: (value: KayakExposureFilter) => void;
  kayakConfidenceFilter: KayakConfidenceFilter;
  onKayakConfidenceFilterChange: (value: KayakConfidenceFilter) => void;
  kayakFacilityState: LoadState;
  hoveredItemId: string | null;
  onHoverItemId: (id: string | null) => void;
  starredHikeIds: Set<string>;
  onToggleStar: (id: string) => void;
}) {
  return (
    <aside className="sidebar" aria-label="Routes">
      <div className="brand">
        <Mountain size={26} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <p>Hike Library</p>
          <span>
            {indexState.status === "loading" ? "Loading routes" : `${visibleItems.length} of ${totalItems} routes`}
          </span>
        </div>
      </div>

      <ActivitySwitcher activeActivity={activeActivity} onChange={onActivityChange} />

      {activeActivity === "hiking" ? (
        <div className="filters" aria-label="Filter routes">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search routes"
              placeholder="Search routes"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </label>

          <label className="select-field">
            <span>
              <Filter size={15} aria-hidden="true" />
              Location
            </span>
            <select value={locationFilter} onChange={(event) => onLocationFilterChange(event.target.value)}>
              <option value="all">All locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>
              <Filter size={15} aria-hidden="true" />
              Distance
            </span>
            <select
              value={distanceFilter}
              onChange={(event) => onDistanceFilterChange(event.target.value as DistanceFilter)}
            >
              {distanceFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>
              <CalendarDays size={15} aria-hidden="true" />
              Time
            </span>
            <select
              value={recommendedTimeFilter}
              onChange={(event) => onRecommendedTimeFilterChange(event.target.value as RecommendedTimeFilter)}
            >
              {recommendedTimeFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="filters kayak-sidebar-filters" aria-label="Filter kayak routes">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search kayak routes"
              placeholder="Search routes"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </label>

          <label className="select-field">
            <span>
              <Filter size={15} aria-hidden="true" />
              Area
            </span>
            <select value={locationFilter} onChange={(event) => onLocationFilterChange(event.target.value)}>
              <option value="all">All areas</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>
              <CalendarDays size={15} aria-hidden="true" />
              Duration
            </span>
            <select
              value={kayakDurationFilter}
              onChange={(event) => onKayakDurationFilterChange(event.target.value as KayakDurationFilter)}
            >
              {kayakDurationFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>
              <Layers size={15} aria-hidden="true" />
              Services
            </span>
            <select
              value={kayakServiceFilter}
              onChange={(event) => onKayakServiceFilterChange(event.target.value as KayakServiceFilter)}
              disabled={kayakFacilityState.status !== "ready"}
            >
              {kayakServiceFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>
              <Waves size={15} aria-hidden="true" />
              Water
            </span>
            <select
              value={kayakWaterZoneFilter}
              onChange={(event) => onKayakWaterZoneFilterChange(event.target.value as KayakWaterZoneFilter)}
            >
              {kayakWaterZoneFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>
              <AlertTriangle size={15} aria-hidden="true" />
              Exposure
            </span>
            <select
              value={kayakExposureFilter}
              onChange={(event) => onKayakExposureFilterChange(event.target.value as KayakExposureFilter)}
            >
              {kayakExposureFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>
              <Info size={15} aria-hidden="true" />
              Confidence
            </span>
            <select
              value={kayakConfidenceFilter}
              onChange={(event) => onKayakConfidenceFilterChange(event.target.value as KayakConfidenceFilter)}
            >
              {kayakConfidenceFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <nav className="hike-list">
        {indexState.status === "loading" ? (
          <p className="empty-list">Loading route index...</p>
        ) : indexState.status === "error" ? (
          <p className="empty-list">Route index could not be loaded.</p>
        ) : visibleItems.length ? (
          visibleItems.map((item) => {
            const isStarred = starredHikeIds.has(item.id);
            const typeLabel = itemDurationLabel(item);

            return (
              <div
                className={[
                  "hike-item",
                  item.id === selectedItem?.id ? "active" : "",
                  item.id === hoveredItemId ? "hovered" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={item.id}
                onBlur={() => onHoverItemId(null)}
                onFocus={() => onHoverItemId(item.id)}
                onMouseEnter={() => onHoverItemId(item.id)}
                onMouseLeave={() => onHoverItemId(null)}
              >
                <button className="hike-select" onClick={() => onSelect(item)} type="button">
                  <span className="hike-name">{item.name}</span>
                  <span className="hike-meta">
                    {itemLocationLabel(item)} · {typeLabel} · {itemDistanceLabel(item)}
                  </span>
                </button>
                <button
                  className={isStarred ? "star-button active" : "star-button"}
                  onClick={() => onToggleStar(item.id)}
                  type="button"
                  aria-label={isStarred ? `Unstar ${item.name}` : `Star ${item.name}`}
                  title={isStarred ? "Unstar route" : "Star route"}
                >
                  <Star size={18} fill={isStarred ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              </div>
            );
          })
        ) : (
          <p className="empty-list">No routes match these filters.</p>
        )}
      </nav>
    </aside>
  );
}
