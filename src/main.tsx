import React from "react";
import ReactDOM from "react-dom/client";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Droplets,
  ExternalLink,
  Filter,
  Info,
  Layers,
  MapPin,
  Mountain,
  Search,
  Star,
  Tent,
  Toilet,
  Train,
  Waves
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import type {
  ActivityKind,
  Hike,
  KayakExposureLevel,
  KayakFacility,
  KayakFacilityType,
  KayakRouteConfidence,
  KayakTrip,
  KayakWaterZone,
  LibraryDetail,
  LibraryIndexItem,
  LibraryOverviewFeatureCollection,
  RecommendedTime,
  TrailCommuteStop,
  TrailFacility,
  TrailSystem,
  TripDuration
} from "./types";
import { ActivitySwitcher } from "./components/ActivitySwitcher";
import { ActivityOverview } from "./components/ActivityOverview";
import { loadKayakFacilities, loadLibraryDetail, loadLibraryIndex } from "./data/library";
import {
  hasTrailSystemRouteInRange,
  hasTrailSystemRouteOver,
  matchingRouteGroupRange,
  primaryRouteGroups,
  routeGroupsForTrailSystem,
  sectionLookupForTrailSystem,
  sectionsForIds,
  trailDistanceFilterRanges,
  type TrailDistanceFilter as DistanceFilter
} from "./data/trailRouteSelection";
import { useTrailSectionDetails } from "./data/useTrailSectionDetails";
import { DeferredMapMount } from "./map/DeferredMapMount";
import {
  commuteStopLabel,
  defaultFacilityTypes,
  escapeHtml,
  facilityCategoryGroups,
  facilityProximityText,
  facilityTypeIcon,
  facilityTypeLabels,
  isCloseTrailFacility,
  isOffRouteFacility,
  selectedAccessPoints,
  type FacilityType,
  type SelectedTrailAccessPoint
} from "./map/hikingFacilities";
import {
  hasKayakFacilityCoordinates,
  kayakFacilityTypeIcon,
  kayakFacilityTypeLabels,
  kayakFacilityTypeOrder
} from "./map/kayakFacilities";
import { KayakTripMap } from "./map/KayakTripMap";
import { RouteMap } from "./map/RouteMap";
import type { HikeMapStatus } from "./map/types";
import { TrailSystemMap } from "./map/TrailSystemMap";
import {
  durationLabel,
  isHikingLibraryIndexItem,
  isKayakTripIndexItem,
  isKayakTrip,
  itemDistanceLabel,
  itemDurationLabel,
  itemLocationLabel,
  itemSearchText
} from "./utils/libraryItem";
import { normalizeSearchText } from "./utils/search";
import "./styles.css";

const starredStorageKey = "hike-library-starred";

type RecommendedTimeFilter = "all" | RecommendedTime;
type KayakDurationFilter = "all" | "half-day" | "dayhike" | "weekend" | "multi-day";
type KayakServiceFilter = "all" | "rental" | "launch" | "parking" | "overnight";
type KayakWaterZoneFilter = "all" | KayakWaterZone;
type KayakExposureFilter = "all" | KayakExposureLevel;
type KayakConfidenceFilter = "all" | KayakRouteConfidence;
type LoadState = { status: "idle" | "loading" | "ready" | "error"; message?: string };

const overviewPaths: Record<ActivityKind, string> = {
  hiking: "/data/overviews/hiking.geojson",
  kayaking: "/data/overviews/kayaking.geojson"
};

const distanceFilterRanges = trailDistanceFilterRanges;

const distanceFilters: Array<{ id: DistanceFilter; label: string; matches: (item: LibraryIndexItem) => boolean }> = [
  { id: "all", label: "Any", matches: () => true },
  {
    id: "short",
    label: "0-5 km",
    matches: (item) => {
      const distanceKm = typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm) ? item.distanceKm : 0;
      return (
        (distanceKm > distanceFilterRanges.short!.minKm && distanceKm <= distanceFilterRanges.short!.maxKm) ||
        hasTrailSystemRouteInRange(item, distanceFilterRanges.short!.minKm, distanceFilterRanges.short!.maxKm)
      );
    }
  },
  {
    id: "half-day",
    label: "5-10 km",
    matches: (item) => {
      const distanceKm = typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm) ? item.distanceKm : 0;
      return (
        (distanceKm > distanceFilterRanges["half-day"]!.minKm &&
          distanceKm <= distanceFilterRanges["half-day"]!.maxKm) ||
        hasTrailSystemRouteInRange(
          item,
          distanceFilterRanges["half-day"]!.minKm,
          distanceFilterRanges["half-day"]!.maxKm
        )
      );
    }
  },
  {
    id: "full-day",
    label: "10-20 km",
    matches: (item) => {
      const distanceKm = typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm) ? item.distanceKm : 0;
      return (
        (distanceKm > distanceFilterRanges["full-day"]!.minKm &&
          distanceKm <= distanceFilterRanges["full-day"]!.maxKm) ||
        hasTrailSystemRouteInRange(
          item,
          distanceFilterRanges["full-day"]!.minKm,
          distanceFilterRanges["full-day"]!.maxKm
        )
      );
    }
  },
  {
    id: "long",
    label: "20+ km",
    matches: (item) =>
      (typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm) ? item.distanceKm > 20 : false) ||
      hasTrailSystemRouteOver(item, 20)
  }
];

const routeGroupKindLabels = {
  mainline: "Main route",
  branch: "Branch",
  access: "Access",
  connector: "Connector"
};

const recommendedTimeLabels: Record<RecommendedTime, string> = {
  dayhike: "Day hike",
  weekend: "Weekend",
  "3-5-days": "3-5 days",
  "6-plus-days": "6+ days"
};

const recommendedTimeFilters: Array<{
  id: RecommendedTimeFilter;
  label: string;
  matches: (item: LibraryIndexItem) => boolean;
}> = [
  { id: "all", label: "Any", matches: () => true },
  ...Object.entries(recommendedTimeLabels).map(([id, label]) => ({
    id: id as RecommendedTime,
    label,
    matches: (item: LibraryIndexItem) => item.recommendedTimes.includes(id as RecommendedTime)
  }))
];

const kayakDurationFilters: Array<{ id: KayakDurationFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "half-day", label: "Half day" },
  { id: "dayhike", label: "Day hike" },
  { id: "weekend", label: "Weekend" },
  { id: "multi-day", label: "Multi-day" }
];

const kayakServiceFilters: Array<{ id: KayakServiceFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "rental", label: "Rental" },
  { id: "launch", label: "Launch" },
  { id: "parking", label: "Parking" },
  { id: "overnight", label: "Overnight" }
];

const kayakWaterZoneFilters: Array<{ id: KayakWaterZoneFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "inner", label: "Inner" },
  { id: "middle", label: "Middle" },
  { id: "outer", label: "Outer" },
  { id: "unknown", label: "Unknown" }
];

const kayakExposureFilters: Array<{ id: KayakExposureFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "sheltered", label: "Sheltered" },
  { id: "mixed", label: "Mixed" },
  { id: "exposed", label: "Exposed" }
];

const kayakConfidenceFilters: Array<{ id: KayakConfidenceFilter; label: string }> = [
  { id: "all", label: "Any" },
  { id: "high", label: "High" },
  { id: "medium-high", label: "Medium-high" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" }
];

function isTrailSystem(detail: LibraryDetail): detail is TrailSystem {
  return "itemType" in detail && detail.itemType === "trail-system";
}

function recommendedTimeForDistance(distanceKm: number): RecommendedTime {
  if (distanceKm <= 20) return "dayhike";
  if (distanceKm <= 50) return "weekend";
  if (distanceKm <= 125) return "3-5-days";
  return "6-plus-days";
}

function formatDistance(distanceKm: number) {
  return `${Number(distanceKm.toFixed(1))} km`;
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

function DetailRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="detail-row">
      <div className="detail-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}

function InfoList({
  title,
  icon,
  items
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <section className="info-block">
      <h2>
        <span aria-hidden="true">{icon}</span>
        {title}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Sidebar({
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

function StatePanel({
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <main className="content">
      <section className="description state-panel">
        <h2>{title}</h2>
        <p>{message}</p>
        {actionLabel && onAction ? (
          <div className="state-actions">
            <button className="secondary-action" type="button" onClick={onAction}>
              {actionLabel}
            </button>
            {secondaryActionLabel && onSecondaryAction ? (
              <button className="secondary-action" type="button" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function LoadingDetails() {
  return <StatePanel title="Loading" message="Fetching route details..." />;
}

function BackToOverviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="secondary-action overview-back" type="button" onClick={onClick}>
      <ArrowLeft size={17} aria-hidden="true" />
      Back to overview
    </button>
  );
}

function kayakFacilityTypeSortValue(type: KayakFacilityType) {
  const index = kayakFacilityTypeOrder.indexOf(type);
  return index === -1 ? kayakFacilityTypeOrder.length : index;
}

function linkedKayakFacilities(trip: KayakTrip, facilities: KayakFacility[]) {
  const explicitFacilityIds = new Set([...trip.facilityRefs, ...trip.rentalRefs]);
  return facilities
    .filter((facility) => explicitFacilityIds.has(facility.id) || facility.routeIds.includes(trip.id))
    .sort((a, b) => kayakFacilityTypeSortValue(a.type) - kayakFacilityTypeSortValue(b.type) || a.name.localeCompare(b.name));
}

function kayakFacilityServiceMatches(facility: KayakFacility, filter: KayakServiceFilter) {
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

function kayakDurationMatches(item: LibraryIndexItem, filter: KayakDurationFilter) {
  if (filter === "all") return true;
  if (filter === "multi-day") return item.recommendedTimes.includes("3-5-days") || item.recommendedTimes.includes("6-plus-days");
  return item.recommendedTimes.some((duration) => duration === filter);
}

function kayakServiceMatches(item: LibraryIndexItem, facilities: KayakFacility[], filter: KayakServiceFilter) {
  if (filter === "all") return true;
  if (!isKayakTripIndexItem(item)) return false;
  return facilities.some((facility) => facility.routeIds.includes(item.id) && kayakFacilityServiceMatches(facility, filter));
}

function kayakMetadataMatches(
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

function FacilityList({ facilities }: { facilities: TrailFacility[] }) {
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(() => new Set());
  const facilityCounts = React.useMemo(
    () =>
      facilityCategoryGroups.map((group) => ({
        ...group,
        facilities: facilities.filter((facility) => group.types.includes(facility.type))
      })),
    [facilities]
  );

  function toggleGroup(id: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="info-block facility-block">
      <h2>
        <Layers size={18} aria-hidden="true" />
        Facilities
      </h2>
      {facilities.length ? (
        <div className="facility-accordion">
          {facilityCounts.map((group) => {
            const isOpen = openGroups.has(group.id);

            return (
              <div className="facility-group" key={group.id}>
                <button
                  aria-expanded={isOpen}
                  className="facility-group-toggle"
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                >
                  <span>
                    {group.icon}
                    {group.title}
                  </span>
                  <small>{group.facilities.length}</small>
                  <ChevronDown className={isOpen ? "chevron open" : "chevron"} size={16} aria-hidden="true" />
                </button>

                {group.facilities.length ? (
                  <div className={isOpen ? "facility-panel" : "facility-panel collapsed"}>
                    <div className="facility-list">
                      {group.facilities.map((facility) => (
                        <article className="facility-item" key={facility.id}>
                          <div>
                            <span>
                              {facilityTypeLabels[facility.type]}
                              {isOffRouteFacility(facility) ? (
                                <strong className="facility-distance-inline" title={facilityProximityText(facility)}>
                                  !
                                </strong>
                              ) : null}
                            </span>
                            <h3>{facility.name}</h3>
                            <p>{facility.description}</p>
                            {isOffRouteFacility(facility) ? (
                              <p className="facility-distance-note">{facilityProximityText(facility)}</p>
                            ) : null}
                          </div>
                          <a href={facility.source.url} target="_blank" rel="noreferrer">
                            Source
                            <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className={isOpen ? "empty-group facility-panel" : "empty-group facility-panel collapsed"}>
                    No researched entries in this category for the selected route.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p>No researched camping, fireplace, toilet, or water points are attached to this selected section range yet.</p>
      )}
    </section>
  );
}

function CommuteStopLine({ label, stop }: { label: string; stop?: TrailCommuteStop }) {
  return (
    <span className={stop ? "commute-line" : "commute-line missing"}>
      <strong>{label}</strong>
      {stop ? (
        <>
          {stop.name}
          <small>{formatDistance(stop.distanceKm)}</small>
        </>
      ) : (
        <>No stop found</>
      )}
    </span>
  );
}

function TransitAccessList({
  accessPoints
}: {
  accessPoints: SelectedTrailAccessPoint[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <section className="info-block transit-block">
      <button
        aria-expanded={isOpen}
        className="facility-group-toggle transit-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          <Train size={18} aria-hidden="true" />
          Transit Access
        </span>
        <small>{accessPoints.length}</small>
        <ChevronDown className={isOpen ? "chevron open" : "chevron"} size={16} aria-hidden="true" />
      </button>

      <div className={isOpen ? "transit-panel" : "transit-panel collapsed"}>
        {accessPoints.length ? (
          <div className="transit-list">
            {accessPoints.map((accessPoint) => (
              <article className="transit-item" key={accessPoint.id}>
                <div>
                  <span>
                    Stage {accessPoint.stageNumber} · {accessPoint.endpoint}
                    {accessPoint.coordinateSource !== "route-geometry" ? " · approximate" : ""}
                  </span>
                  <h3>{accessPoint.placeName}</h3>
                </div>
                <div className="commute-lines">
                  <CommuteStopLine label="Bus" stop={accessPoint.busStop} />
                  <CommuteStopLine label="Train" stop={accessPoint.trainStop} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No transit access points are attached to this route yet.</p>
        )}
      </div>
    </section>
  );
}

function FacilityMapFilters({
  selectedTypes,
  onChange,
  facilities
}: {
  selectedTypes: Set<FacilityType>;
  onChange: (types: Set<FacilityType>) => void;
  facilities: TrailFacility[];
}) {
  const counts = React.useMemo(
    () =>
      defaultFacilityTypes.map((type) => ({
        type,
        count: facilities.filter((facility) => facility.type === type && facility.coordinates).length
      })),
    [facilities]
  );

  function toggle(type: FacilityType) {
    const next = new Set(selectedTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange(next);
  }

  return (
    <div className="map-filter-panel" aria-label="Map facility filters">
      <div className="map-filter-title" title="Map filters" aria-label="Map filters">
        <Layers size={14} aria-hidden="true" />
      </div>
      <div className="map-filter-options">
        {counts.map(({ type, count }) => (
          <button
            key={type}
            aria-pressed={selectedTypes.has(type)}
            className={selectedTypes.has(type) ? "map-filter-chip active" : "map-filter-chip"}
            type="button"
            onClick={() => toggle(type)}
            disabled={!count}
            title={`${selectedTypes.has(type) ? "Hide" : "Show"} ${facilityTypeLabels[type]} (${count})`}
            aria-label={`${facilityTypeLabels[type]} (${count})`}
          >
            {facilityTypeIcon(type)}
            <span>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function KayakFacilityMapFilters({
  selectedTypes,
  onChange,
  facilities
}: {
  selectedTypes: Set<KayakFacilityType>;
  onChange: (types: Set<KayakFacilityType>) => void;
  facilities: KayakFacility[];
}) {
  const counts = React.useMemo(
    () =>
      kayakFacilityTypeOrder
        .map((type) => ({
          type,
          count: facilities.filter((facility) => facility.type === type && hasKayakFacilityCoordinates(facility)).length
        }))
        .filter(({ count }) => count > 0),
    [facilities]
  );

  function toggle(type: KayakFacilityType) {
    const next = new Set(selectedTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange(next);
  }

  if (!counts.length) return null;

  return (
    <div className="map-filter-panel" aria-label="Kayak facility map filters">
      <div className="map-filter-title" title="Map filters" aria-label="Map filters">
        <Layers size={14} aria-hidden="true" />
      </div>
      <div className="map-filter-options">
        {counts.map(({ type, count }) => (
          <button
            key={type}
            aria-pressed={selectedTypes.has(type)}
            className={selectedTypes.has(type) ? "map-filter-chip active" : "map-filter-chip"}
            type="button"
            onClick={() => toggle(type)}
            title={`${selectedTypes.has(type) ? "Hide" : "Show"} ${kayakFacilityTypeLabels[type]} (${count})`}
            aria-label={`${kayakFacilityTypeLabels[type]} (${count})`}
          >
            {kayakFacilityTypeIcon(type)}
            <span>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TrailSystemDetails({
  trailSystem,
  isStarred,
  onToggleStar,
  distanceFilter,
  onBackToOverview
}: {
  trailSystem: TrailSystem;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
  distanceFilter: DistanceFilter;
  onBackToOverview: () => void;
}) {
  const [viewMode, setViewMode] = React.useState<"builder" | "info">("builder");
  const routeGroups = routeGroupsForTrailSystem(trailSystem);
  const mainRouteGroups = primaryRouteGroups(trailSystem);
  const contextualRouteGroups = routeGroups.filter((group) => group.kind !== "mainline");
  const sectionLookup = React.useMemo(() => sectionLookupForTrailSystem(trailSystem), [trailSystem]);
  const initialRouteMatch = matchingRouteGroupRange(trailSystem, distanceFilter);
  const initialRouteGroup = mainRouteGroups.find((group) => group.id === initialRouteMatch?.routeGroupId) ?? mainRouteGroups[0];
  const initialRouteSections = sectionsForIds(initialRouteGroup.sectionIds, sectionLookup);
  const [routeGroupId, setRouteGroupId] = React.useState(initialRouteGroup.id);
  const [startSectionId, setStartSectionId] = React.useState(
    initialRouteMatch?.startSectionId ?? trailSystem.presets[0]?.startSectionId ?? initialRouteSections[0]?.id ?? trailSystem.sections[0].id
  );
  const [endSectionId, setEndSectionId] = React.useState(
    initialRouteMatch?.endSectionId ??
      trailSystem.presets[0]?.endSectionId ??
      initialRouteSections[0]?.id ??
      trailSystem.sections[0].id
  );
  const [selectedFacilityTypes, setSelectedFacilityTypes] = React.useState<Set<FacilityType>>(
    () => new Set(defaultFacilityTypes)
  );
  const [selectedContextGroupIds, setSelectedContextGroupIds] = React.useState<Set<string>>(() => new Set());

  const routeGroup = mainRouteGroups.find((group) => group.id === routeGroupId) ?? mainRouteGroups[0];
  const routeSections = sectionsForIds(routeGroup.sectionIds, sectionLookup);
  const startIndex = Math.max(
    0,
    routeSections.findIndex((section) => section.id === startSectionId)
  );
  const rawEndIndex = routeSections.findIndex((section) => section.id === endSectionId);
  const endIndex = Math.max(startIndex, rawEndIndex < 0 ? startIndex : rawEndIndex);
  const selectedSections = routeSections.slice(startIndex, endIndex + 1);
  const selectedSectionIds = new Set(selectedSections.map((section) => section.id));
  const availableContextGroups = contextualRouteGroups.filter((group) =>
    group.connectsToSectionIds.some((sectionId) => selectedSectionIds.has(sectionId))
  );
  const selectedContextGroups = availableContextGroups.filter((group) => selectedContextGroupIds.has(group.id));
  const contextSections = selectedContextGroups.flatMap((group) => sectionsForIds(group.sectionIds, sectionLookup));
  const selectedRouteSections = [...selectedSections, ...contextSections].filter(
    (section, index, sections) => sections.findIndex((candidate) => candidate.id === section.id) === index
  );
  const sectionDetailsState = useTrailSectionDetails(trailSystem.id, selectedRouteSections);
  const detailedPrimaryRouteSections = selectedSections.map((section) => sectionDetailsState.details[section.id] ?? section);
  const detailedSelectedRouteSections = selectedRouteSections.map((section) => sectionDetailsState.details[section.id] ?? section);
  const distanceKm = selectedRouteSections.reduce((total, section) => total + section.distanceKm, 0);
  const recommendation = recommendedTimeForDistance(distanceKm);
  const firstSection = selectedSections[0];
  const lastSection = selectedSections[selectedSections.length - 1];
  const selectedFacilities = detailedSelectedRouteSections
    .flatMap((section) => section.facilities ?? [])
    .filter(isCloseTrailFacility)
    .filter((facility, index, facilities) => facilities.findIndex((candidate) => candidate.id === facility.id) === index);
  const accessPoints = selectedAccessPoints(detailedSelectedRouteSections);
  const selectedPresetId =
    trailSystem.presets.find((preset) => preset.startSectionId === startSectionId && preset.endSectionId === endSectionId)?.id ??
    "";
  const connectedSections = sectionsForIds(routeGroup.connectsToSectionIds, sectionLookup);
  const groupedSectionIds = new Set(routeGroups.flatMap((group) => group.sectionIds));
  const coveredSections = trailSystem.sections.filter((section) => groupedSectionIds.has(section.id)).length;
  const routeGroupLabel = routeGroupKindLabels[routeGroup.kind];

  React.useEffect(() => {
    if (rawEndIndex >= 0 && rawEndIndex < startIndex) {
      setEndSectionId(routeSections[startIndex].id);
    }
  }, [rawEndIndex, routeSections, startIndex]);

  React.useEffect(() => {
    if (!routeSections.length) return;
    if (!routeSections.some((section) => section.id === startSectionId)) {
      setStartSectionId(routeSections[0].id);
      setEndSectionId(routeSections[0].id);
      return;
    }
    if (!routeSections.some((section) => section.id === endSectionId)) {
      setEndSectionId(startSectionId);
    }
  }, [endSectionId, routeSections, startSectionId]);

  React.useEffect(() => {
    const availableIds = new Set(availableContextGroups.map((group) => group.id));
    setSelectedContextGroupIds((current) => {
      const next = new Set([...current].filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [availableContextGroups]);

  React.useEffect(() => {
    const nextRange = matchingRouteGroupRange(trailSystem, distanceFilter);
    if (!nextRange) return;
    setRouteGroupId(nextRange.routeGroupId);
    setStartSectionId(nextRange.startSectionId);
    setEndSectionId(nextRange.endSectionId);
    setSelectedContextGroupIds(new Set());
    setViewMode("builder");
  }, [distanceFilter, trailSystem]);

  function applyPreset(start: string, end: string) {
    const presetGroup = mainRouteGroups.find((group) => group.sectionIds.includes(start) && group.sectionIds.includes(end));
    if (presetGroup) setRouteGroupId(presetGroup.id);
    setStartSectionId(start);
    setEndSectionId(end);
    setSelectedContextGroupIds(new Set());
    setViewMode("builder");
  }

  function applyPresetId(presetId: string) {
    const preset = trailSystem.presets.find((candidate) => candidate.id === presetId);
    if (preset) applyPreset(preset.startSectionId, preset.endSectionId);
  }

  function applyRouteGroupId(nextRouteGroupId: string) {
    const nextGroup = mainRouteGroups.find((candidate) => candidate.id === nextRouteGroupId);
    if (!nextGroup) return;
    const nextSections = sectionsForIds(nextGroup.sectionIds, sectionLookup);
    setRouteGroupId(nextGroup.id);
    setStartSectionId(nextSections[0]?.id ?? trailSystem.sections[0].id);
    setEndSectionId(nextSections[0]?.id ?? trailSystem.sections[0].id);
    setSelectedContextGroupIds(new Set());
    setViewMode("builder");
  }

  function toggleContextGroup(groupId: string) {
    setSelectedContextGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const sectionDetailWarning = sectionDetailsState.failedCount ? (
    <p className="inline-warning" role="status">
      <AlertTriangle size={15} aria-hidden="true" />
      {sectionDetailsState.failedCount} selected section detail file
      {sectionDetailsState.failedCount === 1 ? "" : "s"} could not load; showing available summary data.
    </p>
  ) : null;

  const overview = (
    <section className="overview">
      <div className="title-group">
        <p>{trailSystem.location.label}</p>
        <div className="title-line">
          <h1>{trailSystem.name}</h1>
          <button
            className={isStarred ? "hero-star active" : "hero-star"}
            onClick={() => onToggleStar(trailSystem.id)}
            type="button"
            aria-label={isStarred ? `Unstar ${trailSystem.name}` : `Star ${trailSystem.name}`}
            title={isStarred ? "Unstar route" : "Star route"}
          >
            <Star size={23} fill={isStarred ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </div>
        <span>
          {trailSystem.region} · Trail system · {trailSystem.sections.length} sections
        </span>
      </div>

      <dl className="facts">
        <DetailRow icon={<MapPin size={18} />} label="Selected" value={formatDistance(distanceKm)} />
        <DetailRow icon={<CalendarDays size={18} />} label="Recommended" value={recommendedTimeLabels[recommendation]} />
        <DetailRow icon={<Mountain size={18} />} label="Difficulty" value={trailSystem.difficulty} />
        <DetailRow icon={<Info size={18} />} label="Range" value={`${firstSection.from} to ${lastSection.to}`} />
      </dl>
    </section>
  );

  if (viewMode === "info") {
    return (
      <main className="content">
        <BackToOverviewButton onClick={onBackToOverview} />
        {overview}

        <section className="selected-route-bar">
          <button className="secondary-action" type="button" onClick={() => setViewMode("builder")}>
            <ArrowLeft size={17} aria-hidden="true" />
            Edit route
          </button>
          <div>
            <strong>{firstSection.from} to {lastSection.to}</strong>
            <span>
              {routeGroupLabel} · {selectedSections.length} main sections
              {selectedContextGroups.length ? ` · ${selectedContextGroups.length} related option${selectedContextGroups.length === 1 ? "" : "s"}` : ""} · {formatDistance(distanceKm)}
            </span>
          </div>
        </section>

        <div className="map-with-controls">
          <section className="map-panel" aria-label={`${trailSystem.name} map`}>
            <DeferredMapMount>
              <TrailSystemMap
                trailSystem={trailSystem}
                selectedSections={detailedSelectedRouteSections}
                primarySections={detailedPrimaryRouteSections}
                facilities={selectedFacilities}
                visibleFacilityTypes={selectedFacilityTypes}
              />
            </DeferredMapMount>
            <div className="map-status">Selected sections highlighted</div>
            <a href={trailSystem.map.externalUrl} target="_blank" rel="noreferrer">
              Open source
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </section>
          <FacilityMapFilters
            facilities={selectedFacilities}
            selectedTypes={selectedFacilityTypes}
            onChange={setSelectedFacilityTypes}
          />
        </div>

        <section className="description">
          <h2>Description</h2>
          <p>{trailSystem.description}</p>
          {sectionDetailWarning}
        </section>

        <div className="info-grid">
          <section className="info-block">
            <h2>
              <Train size={18} aria-hidden="true" />
              Getting There
            </h2>
            <p>{trailSystem.gettingThere}</p>
          </section>

          <section className="info-block">
            <h2>
              <Tent size={18} aria-hidden="true" />
              Camping Rules
            </h2>
            <p>{trailSystem.campingRules}</p>
          </section>

          <FacilityList facilities={selectedFacilities} />
          <TransitAccessList accessPoints={accessPoints} />
          <InfoList
            title="Selected Sections"
            icon={<Info size={18} />}
            items={detailedSelectedRouteSections.map((section) => `${section.name}: ${section.description || "Section detail is loading."}`)}
          />

          <section className="info-block source-block">
            <h2>
              <ExternalLink size={18} aria-hidden="true" />
              Source
            </h2>
            <p>
              {trailSystem.source.provider === "naturkartan" ? "Naturkartan" : "Manual"}{" "}
              {trailSystem.source.lastFetchedAt ? `· fetched ${trailSystem.source.lastFetchedAt}` : ""}
            </p>
            <a href={trailSystem.source.url} target="_blank" rel="noreferrer">
              View source
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="content trail-builder-content">
      <section className="builder-toolbar">
        <BackToOverviewButton onClick={onBackToOverview} />
        <div className="compact-title">
          <p>{trailSystem.location.label}</p>
          <h1>{trailSystem.name}</h1>
        </div>
        <dl className="compact-facts">
          <DetailRow icon={<MapPin size={16} />} label="Selected" value={formatDistance(distanceKm)} />
          <DetailRow icon={<CalendarDays size={16} />} label="Time" value={recommendedTimeLabels[recommendation]} />
          <DetailRow icon={<Info size={16} />} label="Range" value={`${firstSection.from} to ${lastSection.to}`} />
        </dl>
      </section>

      <section className="builder-workspace">
        <div className="trail-builder" aria-label="Trail section builder">
          <div className="builder-head">
            <div>
              <h2>Build Route</h2>
              <p>Choose a main-route range. Related branches and access routes appear when they connect to it.</p>
              {sectionDetailWarning}
            </div>
            <div className="selected-summary">
              {selectedSections.length} main
              {selectedContextGroups.length ? ` + ${contextSections.length} related` : ""} · {formatDistance(distanceKm)}
            </div>
          </div>

          {mainRouteGroups.length > 1 ? (
            <label className="select-field route-group-select">
              <span>Main route</span>
              <select value={routeGroupId} onChange={(event) => applyRouteGroupId(event.target.value)}>
                {mainRouteGroups.map((group) => {
                  const groupSections = sectionsForIds(group.sectionIds, sectionLookup);
                  const groupDistance = groupSections.reduce((total, section) => total + section.distanceKm, 0);
                  return (
                    <option key={group.id} value={group.id}>
                      {routeGroupKindLabels[group.kind]} - {group.name} ({groupSections.length}, {formatDistance(groupDistance)})
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}

          {availableContextGroups.length ? (
            <section className="context-routes">
              <div className="context-routes-head">
                <span>Related access and branch options</span>
                <small>Shown for the selected main-route range</small>
              </div>
              <div className="context-route-list">
                {availableContextGroups.map((group) => {
                  const groupSections = sectionsForIds(group.sectionIds, sectionLookup);
                  const groupDistance = groupSections.reduce((total, section) => total + section.distanceKm, 0);
                  const isSelected = selectedContextGroupIds.has(group.id);

                  return (
                    <button
                      key={group.id}
                      aria-pressed={isSelected}
                      className={isSelected ? "context-route selected" : "context-route"}
                      type="button"
                      onClick={() => toggleContextGroup(group.id)}
                    >
                      <span>{routeGroupKindLabels[group.kind]}</span>
                      <strong>{group.name}</strong>
                      <small>{groupSections.length} section{groupSections.length === 1 ? "" : "s"} · {formatDistance(groupDistance)}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <label className="select-field preset-select">
            <span>Suggested route</span>
            <select value={selectedPresetId} onChange={(event) => applyPresetId(event.target.value)}>
              <option value="">Custom route</option>
              {trailSystem.presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} - {preset.description}
                </option>
              ))}
            </select>
          </label>

          <div className="section-controls">
            <label className="select-field">
              <span>Start</span>
              <select value={startSectionId} onChange={(event) => setStartSectionId(event.target.value)}>
                {routeSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.stageNumber}. {section.from}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span>End</span>
              <select value={endSectionId} onChange={(event) => setEndSectionId(event.target.value)}>
                {routeSections.map((section, index) => (
                  <option key={section.id} value={section.id} disabled={index < startIndex}>
                    {section.stageNumber}. {section.to}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="section-list">
            {routeSections.map((section, index) => {
              const isSelected = index >= startIndex && index <= endIndex;

              return (
                <button
                  key={section.id}
                  aria-pressed={isSelected}
                  className={isSelected ? "section-row selected" : "section-row"}
                  type="button"
                  onClick={() => {
                    if (index < startIndex) setStartSectionId(section.id);
                    else setEndSectionId(section.id);
                  }}
                >
                  <span>{section.stageNumber}</span>
                  <strong>{section.from} to {section.to}</strong>
                  <small>
                    {routeGroupLabel} · {formatDistance(section.distanceKm)} · {section.estimatedTime}
                  </small>
                </button>
              );
            })}
          </div>

          <div className="route-coverage">
            {coveredSections}/{trailSystem.sections.length} official sections assigned to route groups · {routeGroups.length} groups
          </div>

          <button className="primary-action" type="button" onClick={() => setViewMode("info")}>
            <Check size={18} aria-hidden="true" />
            Select route and view info
          </button>
        </div>

        <div className="map-with-controls">
          <section className="map-panel builder-map-panel" aria-label={`${trailSystem.name} map`}>
            <DeferredMapMount>
              <TrailSystemMap
                trailSystem={trailSystem}
                selectedSections={detailedSelectedRouteSections}
                primarySections={detailedPrimaryRouteSections}
                facilities={selectedFacilities}
                visibleFacilityTypes={selectedFacilityTypes}
              />
            </DeferredMapMount>
            <div className="map-status">Route + facilities</div>
          </section>
          <FacilityMapFilters
            facilities={selectedFacilities}
            selectedTypes={selectedFacilityTypes}
            onChange={setSelectedFacilityTypes}
          />
        </div>
      </section>

    </main>
  );
}

function HikeDetails({
  hike,
  isStarred,
  onToggleStar,
  onBackToOverview
}: {
  hike: Hike;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
  onBackToOverview: () => void;
}) {
  const [routeMapStatus, setRouteMapStatus] = React.useState<HikeMapStatus>(
    hike.route.geojsonPath ? "loading" : "marker-only"
  );
  const handleRouteLoadStateChange = React.useCallback((status: HikeMapStatus) => {
    setRouteMapStatus(status);
  }, []);

  React.useEffect(() => {
    setRouteMapStatus(hike.route.geojsonPath ? "loading" : "marker-only");
  }, [hike.id, hike.route.geojsonPath]);

  const routeMapStatusLabel: Record<HikeMapStatus, string> = {
    loading: "Loading route",
    ready: "GPX route drawn",
    "marker-only": "Marker only",
    error: "Route unavailable"
  };

  return (
    <main className="content">
      <BackToOverviewButton onClick={onBackToOverview} />
      <section className="overview">
        <div className="title-group">
          <p>{hike.location.label}</p>
          <div className="title-line">
            <h1>{hike.name}</h1>
            <button
              className={isStarred ? "hero-star active" : "hero-star"}
              onClick={() => onToggleStar(hike.id)}
              type="button"
              aria-label={isStarred ? `Unstar ${hike.name}` : `Star ${hike.name}`}
              title={isStarred ? "Unstar route" : "Star route"}
            >
              <Star size={23} fill={isStarred ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          </div>
          <span>
            {hike.region} · {hike.routeType}
          </span>
        </div>

        <dl className="facts">
          <DetailRow icon={<MapPin size={18} />} label="Distance" value={`${hike.distanceKm} km`} />
          <DetailRow icon={<CalendarDays size={18} />} label="Best season" value={hike.season} />
          <DetailRow icon={<Mountain size={18} />} label="Difficulty" value={hike.difficulty} />
          <DetailRow icon={<Info size={18} />} label="Recommended" value={recommendedTimeLabels[hike.recommendedTime]} />
        </dl>
      </section>

      <section className="map-panel" aria-label={`${hike.name} map`}>
        <DeferredMapMount>
          <RouteMap hike={hike} onLoadStateChange={handleRouteLoadStateChange} />
        </DeferredMapMount>
        <div className="map-status">{routeMapStatusLabel[routeMapStatus]}</div>
        <a href={hike.map.externalUrl} target="_blank" rel="noreferrer">
          Open source
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </section>

      <section className="description">
        <h2>Description</h2>
        <p>{hike.description}</p>
      </section>

      <div className="info-grid">
        <section className="info-block">
          <h2>
            <Train size={18} aria-hidden="true" />
            Getting There
          </h2>
          <p>{hike.gettingThere}</p>
        </section>

        <section className="info-block">
          <h2>
            <Tent size={18} aria-hidden="true" />
            Camping Rules
          </h2>
          <p>{hike.campingRules}</p>
        </section>

        <InfoList title="Utilities Nearby" icon={<Toilet size={18} />} items={hike.utilities} />
        <InfoList title="Water" icon={<Droplets size={18} />} items={hike.waterSources} />
        <InfoList title="Notes" icon={<Info size={18} />} items={hike.notes} />

        <section className="info-block source-block">
          <h2>
            <ExternalLink size={18} aria-hidden="true" />
            Source
          </h2>
          <p>
            {hike.source.provider === "naturkartan" ? "Naturkartan" : "Manual"}{" "}
            {hike.source.lastFetchedAt ? `· fetched ${hike.source.lastFetchedAt}` : ""}
          </p>
          <a href={hike.source.url} target="_blank" rel="noreferrer">
            View source
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          {hike.route.gpxUrl ? (
            <a href={hike.route.gpxUrl} target="_blank" rel="noreferrer">
              Download GPX
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function listFromUnknown(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (typeof value !== "object") return [];

  return Object.values(value)
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function kayakSafetyItems(trip: KayakTrip) {
  return [
    trip.safety?.exposure,
    ...(trip.safety?.crossings ?? []),
    ...(trip.safety?.windWeatherNotes ?? []),
    ...(trip.safety?.navigationNotes ?? []),
    ...(trip.safety?.seasonalNotes ?? [])
  ].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function kayakCampingText(trip: KayakTrip) {
  if (Array.isArray(trip.campingRules)) return trip.campingRules.join(" ");
  return trip.campingRules ?? trip.protectionRules?.summary ?? "";
}

function formatDurations(durations: TripDuration[]) {
  return durations.map(durationLabel).join(", ");
}

function formatMetadataValue(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function KayakFacilityBlock({
  facilities,
  facilityNotes,
  facilityState
}: {
  facilities: KayakFacility[];
  facilityNotes: string[];
  facilityState: LoadState;
}) {
  const hasFacilityContent = facilities.length > 0 || facilityNotes.length > 0;

  return (
    <section className="info-block facility-block kayak-facility-block">
      <h2>
        <Layers size={18} aria-hidden="true" />
        Facilities
      </h2>
      {facilityState.status === "loading" ? <p>Loading linked facility records.</p> : null}
      {facilityState.status === "error" ? <p>{facilityState.message ?? "Linked kayak facilities could not load."}</p> : null}
      {facilities.length ? (
        <div className="facility-list kayak-facility-list">
          {facilities.map((facility) => {
            const source = facility.sources.find((candidate) => candidate.url);

            return (
              <article className="facility-item kayak-facility-item" key={facility.id}>
                <div>
                  <span>
                    {kayakFacilityTypeIcon(facility.type, 13)}
                    {kayakFacilityTypeLabels[facility.type]}
                  </span>
                  <h3>{facility.name}</h3>
                  <p>{facility.description}</p>
                  {facility.access.length ? <p className="facility-distance-note">{facility.access.slice(0, 2).join(" ")}</p> : null}
                  {facility.needsFollowup.length ? (
                    <p className="facility-distance-note">{facility.needsFollowup.slice(0, 2).join(" ")}</p>
                  ) : null}
                </div>
                {source ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Source
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
      {facilityNotes.length ? (
        <ul className="kayak-facility-notes">
          {facilityNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {!hasFacilityContent && facilityState.status === "ready" ? <p>No linked facility records are attached to this kayak trip yet.</p> : null}
    </section>
  );
}

function KayakTripDetails({
  trip,
  kayakFacilities,
  kayakFacilityState,
  isStarred,
  onToggleStar,
  onBackToOverview
}: {
  trip: KayakTrip;
  kayakFacilities: KayakFacility[];
  kayakFacilityState: LoadState;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
  onBackToOverview: () => void;
}) {
  const [routeMapStatus, setRouteMapStatus] = React.useState<HikeMapStatus>("loading");
  const [selectedKayakFacilityTypes, setSelectedKayakFacilityTypes] = React.useState<Set<KayakFacilityType>>(() => new Set());
  const accessItems = listFromUnknown(trip.access);
  const safetyItems = kayakSafetyItems(trip);
  const linkedFacilities = React.useMemo(() => linkedKayakFacilities(trip, kayakFacilities), [kayakFacilities, trip]);
  const linkedFacilityTypesKey = React.useMemo(
    () => [...new Set(linkedFacilities.map((facility) => facility.type))].sort().join("|"),
    [linkedFacilities]
  );
  const mappedFacilityCount = linkedFacilities.filter(
    (facility) => hasKayakFacilityCoordinates(facility) && selectedKayakFacilityTypes.has(facility.type)
  ).length;
  const followUpItems = [
    ...(trip.research.needsFollowup ?? []),
    ...(trip.research.contradictions ?? []),
    ...(trip.research.corrections ?? [])
  ];
  const sourceLinks = trip.sources.filter((source) => source.url);
  const routeMapStatusLabel: Record<HikeMapStatus, string> = {
    loading: "Loading corridor",
    ready: "Approximate corridor",
    "marker-only": "Marker only",
    error: "Corridor unavailable"
  };

  React.useEffect(() => {
    setRouteMapStatus("loading");
  }, [trip.id]);

  React.useEffect(() => {
    setSelectedKayakFacilityTypes(new Set(linkedFacilities.map((facility) => facility.type)));
  }, [linkedFacilities, linkedFacilityTypesKey, trip.id]);

  return (
    <main className="content">
      <BackToOverviewButton onClick={onBackToOverview} />
      <section className="overview">
        <div className="title-group">
          <p>{trip.area}</p>
          <div className="title-line">
            <h1>{trip.name}</h1>
            <button
              className={isStarred ? "hero-star active" : "hero-star"}
              onClick={() => onToggleStar(trip.id)}
              type="button"
              aria-label={isStarred ? `Unstar ${trip.name}` : `Star ${trip.name}`}
              title={isStarred ? "Unstar route" : "Star route"}
            >
              <Star size={23} fill={isStarred ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          </div>
          <span>
            {trip.region} · {trip.routeType}
          </span>
        </div>

        <dl className="facts">
          <DetailRow icon={<MapPin size={18} />} label="Distance" value={itemDistanceLabel(trip)} />
          <DetailRow icon={<CalendarDays size={18} />} label="Time" value={formatDurations(trip.recommendedTimes)} />
          <DetailRow icon={<Mountain size={18} />} label="Difficulty" value={trip.difficulty} />
          <DetailRow icon={<Waves size={18} />} label="Water" value={formatMetadataValue(trip.waterZone)} />
          <DetailRow icon={<AlertTriangle size={18} />} label="Exposure" value={formatMetadataValue(trip.exposureLevel)} />
          <DetailRow icon={<Info size={18} />} label="Research" value={formatMetadataValue(trip.research.routeConfidence)} />
          <DetailRow icon={<Info size={18} />} label="Map Confidence" value={formatMetadataValue(trip.route.mapConfidence)} />
        </dl>
      </section>

      <div className="map-with-controls">
        <section className="map-panel" aria-label={`${trip.name} map`}>
          <div className="map-warning">
            <AlertTriangle size={15} aria-hidden="true" />
            {trip.route.warning}
          </div>
          <DeferredMapMount>
            <KayakTripMap
              trip={trip}
              facilities={linkedFacilities}
              visibleFacilityTypes={selectedKayakFacilityTypes}
              onLoadStateChange={setRouteMapStatus}
            />
          </DeferredMapMount>
          <div className="map-status">
            {routeMapStatusLabel[routeMapStatus]}
            {mappedFacilityCount ? ` · ${mappedFacilityCount} facilities` : ""}
          </div>
        </section>
        <KayakFacilityMapFilters
          facilities={linkedFacilities}
          selectedTypes={selectedKayakFacilityTypes}
          onChange={setSelectedKayakFacilityTypes}
        />
      </div>

      <section className="description">
        <h2>Description</h2>
        <p>{trip.description}</p>
      </section>

      <div className="info-grid">
        {safetyItems.length ? <InfoList title="Safety" icon={<AlertTriangle size={18} />} items={safetyItems} /> : null}
        {accessItems.length ? <InfoList title="Access" icon={<Train size={18} />} items={accessItems} /> : null}
        <KayakFacilityBlock facilities={linkedFacilities} facilityNotes={trip.facilityNotes} facilityState={kayakFacilityState} />
        {kayakCampingText(trip) ? (
          <section className="info-block">
            <h2>
              <Tent size={18} aria-hidden="true" />
              Rules
            </h2>
            <p>{kayakCampingText(trip)}</p>
          </section>
        ) : null}
        {followUpItems.length ? <InfoList title="Research Notes" icon={<Info size={18} />} items={followUpItems} /> : null}
        {sourceLinks.length ? (
          <section className="info-block source-block">
            <h2>
              <ExternalLink size={18} aria-hidden="true" />
              Sources
            </h2>
            {sourceLinks.slice(0, 4).map((source) => (
              <a href={source.url} key={`${source.provider}-${source.url}`} target="_blank" rel="noreferrer">
                {source.title ?? source.provider}
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
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
