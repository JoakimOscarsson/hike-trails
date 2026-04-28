import React from "react";
import ReactDOM from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ArrowLeft,
  AlertTriangle,
  BusFront,
  CalendarDays,
  Check,
  ChevronDown,
  CircleParking,
  Droplets,
  ExternalLink,
  Filter,
  Flame,
  House,
  Info,
  Layers,
  Landmark,
  MapPin,
  Mountain,
  Search,
  Star,
  Tent,
  Toilet,
  Train,
  Utensils,
  Waves
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  Hike,
  LibraryDetail,
  LibraryIndexItem,
  RecommendedTime,
  TrailAccessPoint,
  TrailCommuteStop,
  TrailFacility,
  TrailSection,
  TrailSystem
} from "./types";
import "./styles.css";

const starredStorageKey = "hike-library-starred";

type DistanceFilter = "all" | "short" | "half-day" | "full-day" | "long";
type RecommendedTimeFilter = "all" | RecommendedTime;
type FacilityType = TrailFacility["type"];
type DistanceRange = { minKm: number; maxKm: number };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isOffRouteFacility(facility: TrailFacility) {
  return facility.routeProximity?.status === "off-route";
}

function facilityProximityText(facility: TrailFacility) {
  if (!isOffRouteFacility(facility)) return "";
  const distance = facility.routeProximity?.distanceKm;
  return distance ? `About ${distance} km from this section's mapped trail line.` : "More than 2 km from this section's mapped trail line.";
}

function selectedAccessPoints(sections: TrailSection[]) {
  return sections.flatMap((section) =>
    (section.accessPoints ?? []).map((accessPoint) => ({
      ...accessPoint,
      sectionId: section.id,
      sectionName: section.name,
      stageNumber: section.stageNumber
    }))
  );
}

function commuteStopLabel(stop: TrailCommuteStop) {
  const type = stop.type === "bus" ? "Bus" : "Train";
  const network = stop.network ? ` · ${stop.network}` : "";
  return `${type}: ${stop.name}${network}`;
}

function hasTrailSystemRouteInRange(item: LibraryIndexItem, minKm: number, maxKm: number) {
  if (item.itemType !== "trail-system") return false;
  const routeDistanceGroups = item.routeGroupDistances?.length ? item.routeGroupDistances : [item.sectionDistances ?? []];
  for (const sectionDistances of routeDistanceGroups) {
    for (let start = 0; start < sectionDistances.length; start += 1) {
      let total = 0;
      for (let end = start; end < sectionDistances.length; end += 1) {
        total += sectionDistances[end];
        if (total > minKm && total <= maxKm) return true;
        if (total > maxKm) break;
      }
    }
  }
  return false;
}

function hasTrailSystemRouteOver(item: LibraryIndexItem, minKm: number) {
  if (item.itemType !== "trail-system") return false;
  const routeDistanceGroups = item.routeGroupDistances?.length ? item.routeGroupDistances : [item.sectionDistances ?? []];
  for (const sectionDistances of routeDistanceGroups) {
    for (let start = 0; start < sectionDistances.length; start += 1) {
      let total = 0;
      for (let end = start; end < sectionDistances.length; end += 1) {
        total += sectionDistances[end];
        if (total > minKm) return true;
      }
    }
  }
  return false;
}

const distanceFilterRanges: Partial<Record<DistanceFilter, DistanceRange>> = {
  short: { minKm: 0, maxKm: 5 },
  "half-day": { minKm: 5, maxKm: 10 },
  "full-day": { minKm: 10, maxKm: 20 }
};

const distanceFilters: Array<{ id: DistanceFilter; label: string; matches: (item: LibraryIndexItem) => boolean }> = [
  { id: "all", label: "Any", matches: () => true },
  {
    id: "short",
    label: "0-5 km",
    matches: (item) =>
      (item.distanceKm > distanceFilterRanges.short!.minKm && item.distanceKm <= distanceFilterRanges.short!.maxKm) ||
      hasTrailSystemRouteInRange(item, distanceFilterRanges.short!.minKm, distanceFilterRanges.short!.maxKm)
  },
  {
    id: "half-day",
    label: "5-10 km",
    matches: (item) =>
      (item.distanceKm > distanceFilterRanges["half-day"]!.minKm &&
        item.distanceKm <= distanceFilterRanges["half-day"]!.maxKm) ||
      hasTrailSystemRouteInRange(
        item,
        distanceFilterRanges["half-day"]!.minKm,
        distanceFilterRanges["half-day"]!.maxKm
      )
  },
  {
    id: "full-day",
    label: "10-20 km",
    matches: (item) =>
      (item.distanceKm > distanceFilterRanges["full-day"]!.minKm &&
        item.distanceKm <= distanceFilterRanges["full-day"]!.maxKm) ||
      hasTrailSystemRouteInRange(
        item,
        distanceFilterRanges["full-day"]!.minKm,
        distanceFilterRanges["full-day"]!.maxKm
      )
  },
  {
    id: "long",
    label: "20+ km",
    matches: (item) => item.distanceKm > 20 || hasTrailSystemRouteOver(item, 20)
  }
];

function matchingSectionRange(sections: TrailSection[], distanceFilter: DistanceFilter) {
  const range = distanceFilterRanges[distanceFilter];
  if (!range) return null;

  let best: { startSectionId: string; endSectionId: string; distanceKm: number } | null = null;

  for (let start = 0; start < sections.length; start += 1) {
    let total = 0;
    for (let end = start; end < sections.length; end += 1) {
      total += sections[end].distanceKm;
      if (total > range.minKm && total <= range.maxKm && (!best || total < best.distanceKm)) {
        best = {
          startSectionId: sections[start].id,
          endSectionId: sections[end].id,
          distanceKm: total
        };
      }
      if (total > range.maxKm) break;
    }
  }

  return best;
}

function fallbackRouteGroups(trailSystem: TrailSystem) {
  return [
    {
      id: "catalog-order",
      name: "Catalog order",
      kind: "mainline" as const,
      sectionIds: trailSystem.sections.map((section) => section.id),
      connectsToSectionIds: [],
      notice: "This trail does not have explicit branch topology yet; sections are shown in catalog order."
    }
  ];
}

function sectionsForRouteGroup(trailSystem: TrailSystem, routeGroupId: string) {
  const sectionLookup = new Map(trailSystem.sections.map((section) => [section.id, section]));
  const groups = trailSystem.routeGroups?.length ? trailSystem.routeGroups : fallbackRouteGroups(trailSystem);
  const group = groups.find((candidate) => candidate.id === routeGroupId) ?? groups[0];
  return {
    group,
    sections: group.sectionIds.map((sectionId) => sectionLookup.get(sectionId)).filter(Boolean) as TrailSection[]
  };
}

function primaryRouteGroups(trailSystem: TrailSystem) {
  const groups = trailSystem.routeGroups?.length ? trailSystem.routeGroups : fallbackRouteGroups(trailSystem);
  const mainlineGroups = groups.filter((group) => group.kind === "mainline");
  return mainlineGroups.length ? mainlineGroups : groups;
}

function matchingRouteGroupRange(trailSystem: TrailSystem, distanceFilter: DistanceFilter) {
  const groups = primaryRouteGroups(trailSystem);
  let best: { routeGroupId: string; startSectionId: string; endSectionId: string; distanceKm: number } | null = null;

  for (const group of groups) {
    const { sections } = sectionsForRouteGroup(trailSystem, group.id);
    const range = matchingSectionRange(sections, distanceFilter);
    if (range && (!best || range.distanceKm < best.distanceKm)) {
      best = { routeGroupId: group.id, ...range };
    }
  }

  return best;
}

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
    return new Set(JSON.parse(window.localStorage.getItem(starredStorageKey) ?? "[]") as string[]);
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
  selectedItem,
  onSelect,
  visibleItems,
  totalItems,
  locationOptions,
  searchQuery,
  onSearchQueryChange,
  locationFilter,
  onLocationFilterChange,
  distanceFilter,
  onDistanceFilterChange,
  recommendedTimeFilter,
  onRecommendedTimeFilterChange,
  starredHikeIds,
  onToggleStar
}: {
  selectedItem: LibraryIndexItem | null;
  onSelect: (item: LibraryIndexItem) => void;
  visibleItems: LibraryIndexItem[];
  totalItems: number;
  locationOptions: string[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  distanceFilter: DistanceFilter;
  onDistanceFilterChange: (value: DistanceFilter) => void;
  recommendedTimeFilter: RecommendedTimeFilter;
  onRecommendedTimeFilterChange: (value: RecommendedTimeFilter) => void;
  starredHikeIds: Set<string>;
  onToggleStar: (id: string) => void;
}) {
  return (
    <aside className="sidebar" aria-label="Hikes">
      <div className="brand">
        <Mountain size={26} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <p>Hike Library</p>
          <span>
            {visibleItems.length} of {totalItems} routes
          </span>
        </div>
      </div>

      <div className="filters" aria-label="Filter hikes">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search hikes"
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

      <nav className="hike-list">
        {visibleItems.length ? (
          visibleItems.map((item) => {
            const isStarred = starredHikeIds.has(item.id);
            const typeLabel = item.itemType === "trail-system" ? "Trail system" : recommendedTimeLabels[item.recommendedTime];

            return (
              <div className={item.id === selectedItem?.id ? "hike-item active" : "hike-item"} key={item.id}>
                <button className="hike-select" onClick={() => onSelect(item)} type="button">
                  <span className="hike-name">{item.name}</span>
                  <span className="hike-meta">
                    {item.location.label} · {typeLabel} · {item.distanceKm || "?"} km
                  </span>
                </button>
                <button
                  className={isStarred ? "star-button active" : "star-button"}
                  onClick={() => onToggleStar(item.id)}
                  type="button"
                  aria-label={isStarred ? `Unstar ${item.name}` : `Star ${item.name}`}
                  title={isStarred ? "Unstar hike" : "Star hike"}
                >
                  <Star size={18} fill={isStarred ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              </div>
            );
          })
        ) : (
          <p className="empty-list">No hikes match these filters.</p>
        )}
      </nav>
    </aside>
  );
}

function LoadingDetails() {
  return (
    <main className="content">
      <section className="description">
        <h2>Loading</h2>
        <p>Fetching hike details...</p>
      </section>
    </main>
  );
}

function RouteMap({ hike }: { hike: Hike }) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      scrollWheelZoom: false
    }).setView(hike.map.center, hike.map.zoom);
    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    const invalidateTimer = window.setTimeout(() => map.invalidateSize(), 0);

    const startIcon = L.divIcon({
      className: "route-marker route-marker-start",
      html: "Start",
      iconSize: [52, 26],
      iconAnchor: [26, 13]
    });

    const finishIcon = L.divIcon({
      className: "route-marker route-marker-finish",
      html: "End",
      iconSize: [44, 26],
      iconAnchor: [22, 13]
    });

    let cancelled = false;

    async function drawRoute() {
      if (!hike.route.geojsonPath) {
        L.marker(hike.map.center).addTo(map);
        return;
      }

      const response = await fetch(hike.route.geojsonPath);
      if (!response.ok) throw new Error(`Could not load ${hike.route.geojsonPath}`);
      const geojson = await response.json();
      if (cancelled) return;

      const layer = L.geoJSON(geojson, {
        style: {
          color: "#d85b36",
          weight: 5,
          opacity: 0.92
        }
      }).addTo(map);

      const firstLine = geojson.features?.find(
        (feature: GeoJSON.Feature) => feature.geometry?.type === "LineString"
      ) as GeoJSON.Feature<GeoJSON.LineString> | undefined;

      const coordinates = firstLine?.geometry.coordinates ?? [];
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];

      if (first) L.marker([first[1], first[0]], { icon: startIcon }).addTo(map);
      if (last) L.marker([last[1], last[0]], { icon: finishIcon }).addTo(map);

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [28, 28] });
      }
    }

    drawRoute().catch(() => {
      L.marker(hike.map.center).addTo(map);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(invalidateTimer);
      map.remove();
    };
  }, [hike]);

  return <div ref={mapRef} className="route-map" />;
}

function TrailSystemMap({
  trailSystem,
  selectedSections,
  facilities,
  visibleFacilityTypes
}: {
  trailSystem: TrailSystem;
  selectedSections: TrailSection[];
  facilities?: TrailFacility[];
  visibleFacilityTypes?: Set<FacilityType>;
}) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const selectedKey = selectedSections.map((section) => section.id).join(":");
  const accessPoints = React.useMemo(() => selectedAccessPoints(selectedSections), [selectedSections]);
  const commuteKey = accessPoints
    .flatMap((accessPoint) => [accessPoint.busStop, accessPoint.trainStop])
    .filter(Boolean)
    .map((stop) => `${stop?.id}:${stop?.distanceKm}`)
    .join("|");
  const facilityKey = (facilities ?? [])
    .filter((facility) => facility.coordinates && (visibleFacilityTypes?.has(facility.type) ?? true))
    .map((facility) => `${facility.id}:${facility.type}`)
    .join("|");

  React.useEffect(() => {
    if (!mapRef.current) return;
    const selectedIds = new Set(selectedKey.split(":").filter(Boolean));
    const markerFacilities = (facilities ?? []).filter(
      (facility) => facility.coordinates && (visibleFacilityTypes?.has(facility.type) ?? true)
    );

    const map = L.map(mapRef.current, {
      zoomControl: false,
      scrollWheelZoom: false
    }).setView(trailSystem.map.center, trailSystem.map.zoom);
    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    const invalidateTimer = window.setTimeout(() => map.invalidateSize(), 0);

    const startIcon = L.divIcon({
      className: "route-marker route-marker-start",
      html: "Start",
      iconSize: [52, 26],
      iconAnchor: [26, 13]
    });

    const finishIcon = L.divIcon({
      className: "route-marker route-marker-finish",
      html: "End",
      iconSize: [44, 26],
      iconAnchor: [22, 13]
    });

    let cancelled = false;

    async function drawSections() {
      const routeResults = await Promise.all(
        trailSystem.sections.map(async (section) => {
          if (!section.route.geojsonPath) return null;
          const response = await fetch(section.route.geojsonPath);
          if (!response.ok) throw new Error(`Could not load ${section.route.geojsonPath}`);
          return { section, geojson: await response.json() };
        })
      );
      if (cancelled) return;

      const selectedLayers: L.Layer[] = [];
      const selectedCoordinates: GeoJSON.Position[] = [];
      const markerLayers: L.Layer[] = [];

      for (const result of routeResults) {
        if (!result) continue;
        const isSelected = selectedIds.has(result.section.id);
        const layer = L.geoJSON(result.geojson, {
          style: {
            color: isSelected ? "#d85b36" : "#768172",
            weight: isSelected ? 6 : 3,
            opacity: isSelected ? 0.95 : 0.34
          }
        }).addTo(map);

        if (isSelected) {
          selectedLayers.push(layer);
          for (const feature of result.geojson.features ?? []) {
            if (feature.geometry?.type === "LineString") {
              selectedCoordinates.push(...feature.geometry.coordinates);
            }
          }
        }
      }

      const first = selectedCoordinates[0];
      const last = selectedCoordinates[selectedCoordinates.length - 1];
      if (first) L.marker([first[1], first[0]], { icon: startIcon }).addTo(map);
      if (last) L.marker([last[1], last[0]], { icon: finishIcon }).addTo(map);

      for (const facility of markerFacilities) {
        if (!facility.coordinates) continue;
        const offRoute = isOffRouteFacility(facility);
        const icon = L.divIcon({
          className: `facility-marker facility-marker-${facility.type}${offRoute ? " facility-marker-off-route" : ""}`,
          html: renderToStaticMarkup(
            <>
              {facilityTypeIcon(facility.type, 14)}
              {offRoute ? <span className="facility-distance-alert">!</span> : null}
            </>
          ),
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        const proximity = facilityProximityText(facility);
        const marker = L.marker(facility.coordinates, {
          icon,
          title: proximity ? `${facility.name}: ${proximity}` : facility.name
        })
          .bindPopup(
            `<strong>${escapeHtml(facility.name)}</strong><br><span>${facilityTypeLabels[facility.type]}</span>${
              proximity ? `<br><em>${escapeHtml(proximity)}</em>` : ""
            }<br>${escapeHtml(facility.description)}`
          )
          .addTo(map);
        if (proximity) marker.bindTooltip(proximity, { direction: "top", offset: [0, -12] });
        markerLayers.push(marker);
      }

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

      for (const stop of commuteStops.values()) {
        const icon = L.divIcon({
          className: `commute-marker commute-marker-${stop.type}`,
          html: renderToStaticMarkup(stop.type === "bus" ? <BusFront size={14} /> : <Train size={14} />),
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        });
        const marker = L.marker(stop.coordinates, {
          icon,
          title: commuteStopLabel(stop)
        })
          .bindPopup(
            `<strong>${escapeHtml(stop.name)}</strong><br><span>${stop.type === "bus" ? "Bus stop" : "Train stop"}</span><br>${escapeHtml(
              stop.accessNames.join(", ")
            )}<br>${formatDistance(stop.distanceKm)} from nearest listed route endpoint.`
          )
          .addTo(map);
        markerLayers.push(marker);
      }

      const bounds = L.featureGroup(selectedLayers).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [28, 28] });
      } else {
        const markerBounds = L.featureGroup(markerLayers).getBounds();
        if (markerBounds.isValid()) {
          map.fitBounds(markerBounds, { padding: [28, 28] });
        }
      }
    }

    drawSections().catch(() => {
      L.marker(trailSystem.map.center).addTo(map);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(invalidateTimer);
      map.remove();
    };
  }, [accessPoints, commuteKey, facilities, facilityKey, selectedKey, trailSystem, visibleFacilityTypes]);

  return <div ref={mapRef} className="route-map" />;
}

const facilityTypeLabels: Record<TrailFacility["type"], string> = {
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
  "unofficial-shelter": "Unofficial shelter"
};

function facilityTypeIcon(type: FacilityType, size = 15) {
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
  }
}

const facilityCategoryGroups: Array<{
  id: string;
  title: string;
  icon: React.ReactNode;
  types: FacilityType[];
}> = [
  { id: "overnight", title: "Camping And Shelters", icon: <Tent size={18} />, types: ["campsite", "shelter", "unofficial-shelter"] },
  { id: "fire-rest", title: "Fireplaces And Rest Areas", icon: <Flame size={18} />, types: ["fireplace", "rest-area"] },
  { id: "water-toilet", title: "Water And Toilets", icon: <Droplets size={18} />, types: ["water", "natural-water", "toilet"] },
  { id: "services", title: "Food, Swimming, Parking, Transit", icon: <Utensils size={18} />, types: ["food", "swimming", "parking", "transit"] },
  { id: "poi-warning", title: "Attractions, Heritage, Warnings", icon: <Landmark size={18} />, types: ["attraction", "heritage", "rule-warning"] }
];

const defaultFacilityTypes: FacilityType[] = [
  "campsite",
  "shelter",
  "unofficial-shelter",
  "fireplace",
  "rest-area",
  "water",
  "natural-water",
  "toilet",
  "food",
  "swimming",
  "parking",
  "transit",
  "attraction",
  "heritage",
  "rule-warning"
];

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
                <button className="facility-group-toggle" type="button" onClick={() => toggleGroup(group.id)}>
                  <span>
                    {group.icon}
                    {group.title}
                  </span>
                  <small>{group.facilities.length}</small>
                  <ChevronDown className={isOpen ? "chevron open" : "chevron"} size={16} aria-hidden="true" />
                </button>

                {isOpen ? (
                  group.facilities.length ? (
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
                  ) : (
                    <p className="empty-group">No researched entries in this category for the selected route.</p>
                  )
                ) : null}
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
  accessPoints: Array<TrailAccessPoint & { sectionId: string; sectionName: string; stageNumber: string | number }>;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <section className="info-block transit-block">
      <button className="facility-group-toggle transit-toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
        <span>
          <Train size={18} aria-hidden="true" />
          Transit Access
        </span>
        <small>{accessPoints.length}</small>
        <ChevronDown className={isOpen ? "chevron open" : "chevron"} size={16} aria-hidden="true" />
      </button>

      {isOpen ? (
        accessPoints.length ? (
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
        )
      ) : null}
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
            className={selectedTypes.has(type) ? "map-filter-chip active" : "map-filter-chip"}
            type="button"
            onClick={() => toggle(type)}
            disabled={!count}
            title={`${selectedTypes.has(type) ? "Hide" : "Show"} ${facilityTypeLabels[type]} (${count})`}
            aria-label={`${selectedTypes.has(type) ? "Hide" : "Show"} ${facilityTypeLabels[type]} (${count})`}
          >
            {facilityTypeIcon(type)}
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
  distanceFilter
}: {
  trailSystem: TrailSystem;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
  distanceFilter: DistanceFilter;
}) {
  const [viewMode, setViewMode] = React.useState<"builder" | "info">("builder");
  const routeGroups = trailSystem.routeGroups?.length ? trailSystem.routeGroups : fallbackRouteGroups(trailSystem);
  const mainRouteGroups = primaryRouteGroups(trailSystem);
  const contextualRouteGroups = routeGroups.filter((group) => group.kind !== "mainline");
  const sectionLookup = React.useMemo(() => new Map(trailSystem.sections.map((section) => [section.id, section])), [trailSystem.sections]);
  const initialRouteMatch = matchingRouteGroupRange(trailSystem, distanceFilter);
  const initialRouteGroup = mainRouteGroups.find((group) => group.id === initialRouteMatch?.routeGroupId) ?? mainRouteGroups[0];
  const initialRouteSections = initialRouteGroup.sectionIds
    .map((sectionId) => sectionLookup.get(sectionId))
    .filter(Boolean) as TrailSection[];
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
  const routeSections = routeGroup.sectionIds
    .map((sectionId) => sectionLookup.get(sectionId))
    .filter(Boolean) as TrailSection[];
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
  const contextSections = selectedContextGroups.flatMap((group) =>
    group.sectionIds.map((sectionId) => sectionLookup.get(sectionId)).filter(Boolean) as TrailSection[]
  );
  const selectedRouteSections = [...selectedSections, ...contextSections].filter(
    (section, index, sections) => sections.findIndex((candidate) => candidate.id === section.id) === index
  );
  const distanceKm = selectedRouteSections.reduce((total, section) => total + section.distanceKm, 0);
  const recommendation = recommendedTimeForDistance(distanceKm);
  const firstSection = selectedSections[0];
  const lastSection = selectedSections[selectedSections.length - 1];
  const selectedFacilities = selectedRouteSections.flatMap((section) => section.facilities ?? []);
  const accessPoints = selectedAccessPoints(selectedRouteSections);
  const selectedPresetId =
    trailSystem.presets.find((preset) => preset.startSectionId === startSectionId && preset.endSectionId === endSectionId)?.id ??
    "";
  const connectedSections = routeGroup.connectsToSectionIds
    .map((sectionId) => sectionLookup.get(sectionId))
    .filter(Boolean) as TrailSection[];
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
    const nextSections = nextGroup.sectionIds
      .map((sectionId) => sectionLookup.get(sectionId))
      .filter(Boolean) as TrailSection[];
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
            title={isStarred ? "Unstar hike" : "Star hike"}
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
            <TrailSystemMap
              trailSystem={trailSystem}
              selectedSections={selectedRouteSections}
              facilities={selectedFacilities}
              visibleFacilityTypes={selectedFacilityTypes}
            />
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
            items={selectedRouteSections.map((section) => `${section.name}: ${section.description}`)}
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
                const groupSections = group.sectionIds
                  .map((sectionId) => sectionLookup.get(sectionId))
                  .filter(Boolean) as TrailSection[];
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
                  const groupSections = group.sectionIds
                    .map((sectionId) => sectionLookup.get(sectionId))
                    .filter(Boolean) as TrailSection[];
                  const groupDistance = groupSections.reduce((total, section) => total + section.distanceKm, 0);
                  const isSelected = selectedContextGroupIds.has(group.id);

                  return (
                    <button
                      key={group.id}
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
            <TrailSystemMap
              trailSystem={trailSystem}
              selectedSections={selectedRouteSections}
              facilities={selectedFacilities}
              visibleFacilityTypes={selectedFacilityTypes}
            />
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
  onToggleStar
}: {
  hike: Hike;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
}) {
  return (
    <main className="content">
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
              title={isStarred ? "Unstar hike" : "Star hike"}
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
        <RouteMap hike={hike} />
        <div className="map-status">
          {hike.route.status === "ready" ? "GPX route drawn" : "Marker only"}
        </div>
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

function App() {
  const [libraryIndex, setLibraryIndex] = React.useState<LibraryIndexItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<LibraryIndexItem | null>(null);
  const [selectedDetail, setSelectedDetail] = React.useState<LibraryDetail | null>(null);
  const [detailsCache, setDetailsCache] = React.useState<Record<string, LibraryDetail>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [locationFilter, setLocationFilter] = React.useState("all");
  const [distanceFilter, setDistanceFilter] = React.useState<DistanceFilter>("all");
  const [recommendedTimeFilter, setRecommendedTimeFilter] = React.useState<RecommendedTimeFilter>("all");
  const [starredHikeIds, setStarredHikeIds] = React.useState<Set<string>>(() => loadStarredHikes());

  React.useEffect(() => {
    let cancelled = false;

    fetch("/data/hikes-index.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load hikes index");
        return response.json() as Promise<LibraryIndexItem[]>;
      })
      .then((items) => {
        if (cancelled) return;
        setLibraryIndex(items);
        setSelectedItem((current) => current ?? items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setLibraryIndex([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!selectedItem) return;

    const cached = detailsCache[selectedItem.id];
    if (cached) {
      setSelectedDetail(cached);
      return;
    }

    let cancelled = false;
    setSelectedDetail(null);

    fetch(selectedItem.detailPath)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${selectedItem.detailPath}`);
        return response.json() as Promise<LibraryDetail>;
      })
      .then((detail) => {
        if (cancelled) return;
        setDetailsCache((current) => ({ ...current, [detail.id]: detail }));
        setSelectedDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setSelectedDetail(null);
      });

    return () => {
      cancelled = true;
    };
  }, [detailsCache, selectedItem]);

  const locationOptions = React.useMemo(
    () => Array.from(new Set(libraryIndex.map((item) => item.location.label))).sort(),
    [libraryIndex]
  );

  const visibleItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const distance = distanceFilters.find((filter) => filter.id === distanceFilter) ?? distanceFilters[0];
    const recommendedTime =
      recommendedTimeFilters.find((filter) => filter.id === recommendedTimeFilter) ?? recommendedTimeFilters[0];

    return libraryIndex
      .filter((item) => {
        const matchesSearch = !query || item.searchText.includes(query);
        const matchesLocation = locationFilter === "all" || item.location.label === locationFilter;
        const matchesDistance = distance.matches(item);
        const matchesRecommendedTime = recommendedTime.matches(item);

        return matchesSearch && matchesLocation && matchesDistance && matchesRecommendedTime;
      })
      .sort((a, b) => Number(starredHikeIds.has(b.id)) - Number(starredHikeIds.has(a.id)));
  }, [distanceFilter, libraryIndex, locationFilter, recommendedTimeFilter, searchQuery, starredHikeIds]);

  React.useEffect(() => {
    if (!selectedItem || (!visibleItems.some((item) => item.id === selectedItem.id) && visibleItems[0])) {
      setSelectedItem(visibleItems[0] ?? null);
    }
  }, [selectedItem, visibleItems]);

  React.useEffect(() => {
    window.localStorage.setItem(starredStorageKey, JSON.stringify(Array.from(starredHikeIds)));
  }, [starredHikeIds]);

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

  return (
    <div className="app-shell">
      <Sidebar
        selectedItem={selectedItem}
        onSelect={setSelectedItem}
        visibleItems={visibleItems}
        totalItems={libraryIndex.length}
        locationOptions={locationOptions}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        distanceFilter={distanceFilter}
        onDistanceFilterChange={setDistanceFilter}
        recommendedTimeFilter={recommendedTimeFilter}
        onRecommendedTimeFilterChange={setRecommendedTimeFilter}
        starredHikeIds={starredHikeIds}
        onToggleStar={toggleStar}
      />
      {selectedDetail ? (
        isTrailSystem(selectedDetail) ? (
          <TrailSystemDetails
            trailSystem={selectedDetail}
            isStarred={starredHikeIds.has(selectedDetail.id)}
            onToggleStar={toggleStar}
            distanceFilter={distanceFilter}
          />
        ) : (
          <HikeDetails
            hike={selectedDetail}
            isStarred={starredHikeIds.has(selectedDetail.id)}
            onToggleStar={toggleStar}
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
