import React from "react";
import { AlertTriangle, CalendarDays, ExternalLink, Info, Layers, MapPin, Mountain, Star, Tent, Train, Waves } from "lucide-react";
import type { KayakFacility, KayakFacilityType, KayakTrip, TripDuration } from "../types";
import type { LoadState } from "../data/loadState";
import { DeferredMapMount } from "../map/DeferredMapMount";
import { KayakTripMap } from "../map/KayakTripMap";
import type { HikeMapStatus } from "../map/types";
import {
  hasKayakFacilityCoordinates,
  kayakFacilityTypeIcon,
  kayakFacilityTypeLabels,
  kayakFacilityTypeOrder
} from "../map/kayakFacilities";
import { durationLabel, itemDistanceLabel } from "../utils/libraryItem";
import { BackToOverviewButton, DetailRow, InfoList } from "./DetailBlocks";

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

function kayakSafetyItems(trip: KayakTrip) {
  return [
    trip.safety?.exposure,
    ...(trip.safety?.crossings ?? []),
    ...(trip.safety?.windWeatherNotes ?? []),
    ...(trip.safety?.navigationNotes ?? []),
    ...(trip.safety?.seasonalNotes ?? [])
  ].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function kayakAccessItems(access: KayakTrip["access"]) {
  return [
    ...access.publicTransport,
    ...access.ferry,
    ...access.parking,
    ...access.launchNotes,
    ...access.other
  ].filter((item) => item.trim().length > 0);
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

export function KayakTripDetails({
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
  const accessItems = kayakAccessItems(trip.access);
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
