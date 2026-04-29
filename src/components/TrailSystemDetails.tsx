import React from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronDown, ExternalLink, Info, Layers, MapPin, Route, Star, Tent, Train } from "lucide-react";
import type { TrailAccessPoint, TrailCommuteStop, TrailFacility, TrailSection, TrailSectionConnection, TrailSystem, TrailTransitStop } from "../types";
import { useTrailSectionDetails } from "../data/useTrailSectionDetails";
import {
  matchingRouteGroupRange,
  primaryRouteGroups,
  routeGroupsForTrailSystem,
  sectionLookupForTrailSystem,
  sectionsForIds
} from "../data/trailRouteSelection";
import {
  formatDistance,
  recommendedTimeForDistance,
  recommendedTimeLabels,
  routeGroupKindLabels,
  type DistanceFilter,
  type RecommendedTimeFilter
} from "../data/filters";
import { DeferredMapMount } from "../map/DeferredMapMount";
import { TrailSystemMap, type TrailMapFocusTarget } from "../map/TrailSystemMap";
import { selectedTrailTransferConnections, trailConnectionModeLabels } from "../map/trailSystemConnections";
import {
  defaultFacilityTypes,
  facilityCategoryGroups,
  facilityProximityText,
  facilityTypeLabels,
  isCloseTrailFacility,
  isOffRouteFacility,
  selectedAccessPoints,
  type FacilityType,
  type SelectedTrailAccessPoint
} from "../map/hikingFacilities";
import { BackToOverviewButton, DetailRow, InfoList } from "./DetailBlocks";

const campingRulePattern = /camp|tent|fire|grill|overnight|leash|dog|reserve|national park|designated/i;
type FacilityCategoryGroup = (typeof facilityCategoryGroups)[number];

function uniqueStrings(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function sectionLabel(section: Pick<TrailSection, "stageNumber">) {
  return `Stage ${section.stageNumber}`;
}

function routePickerSectionLabel(section: Pick<TrailSection, "stageNumber" | "from" | "to">) {
  const endpointLabel = section.from === section.to ? section.from : `${section.from} -> ${section.to}`;
  return `${section.stageNumber}. ${endpointLabel}`;
}

function selectedRouteDescription({
  sections,
  distanceKm,
  routeGroupLabel,
  firstSection,
  lastSection
}: {
  sections: TrailSection[];
  distanceKm: number;
  routeGroupLabel: string;
  firstSection: TrailSection;
  lastSection: TrailSection;
}) {
  const sectionSummaries = sections
    .map((section) => `${sectionLabel(section)}: ${section.description}`)
    .filter((summary) => !summary.endsWith(": "))
    .slice(0, 5);
  const remainingCount = Math.max(0, sections.length - sectionSummaries.length);
  const remainingText = remainingCount ? ` ${remainingCount} more selected section${remainingCount === 1 ? "" : "s"} are listed below.` : "";

  return [
    `${firstSection.from} to ${lastSection.to} is a ${formatDistance(distanceKm)} ${routeGroupLabel.toLowerCase()} selection across ${sections.length} main section${sections.length === 1 ? "" : "s"}.`,
    sectionSummaries.join(" "),
    remainingText
  ]
    .filter(Boolean)
    .join(" ");
}

function accessPointForEndpoint(section: TrailSection, endpoint: TrailAccessPoint["endpoint"]) {
  return section.accessPoints?.find((accessPoint) => accessPoint.endpoint === endpoint);
}

function commuteStopText(label: string, stop?: TrailCommuteStop) {
  return stop ? `${label} ${stop.name} (${formatDistance(stop.distanceKm)})` : `${label} not researched`;
}

function transitStopText(label: string, stop: TrailTransitStop) {
  return `${label} ${stop.name} (${formatDistance(stop.distanceKm)})`;
}

function isSameTransitStop(a?: TrailTransitStop, b?: TrailTransitStop) {
  return Boolean(a && b && a.id === b.id);
}

function accessPointText(label: string, accessPoint?: TrailAccessPoint) {
  if (!accessPoint) return `${label}: no section-specific transit data is attached yet.`;
  const approximation = accessPoint.coordinateSource === "route-geometry" ? "" : " Approximate endpoint coordinate.";
  const stopItems = [
    commuteStopText("Bus", accessPoint.busStop),
    commuteStopText("train", accessPoint.trainStop)
  ];

  if (accessPoint.ferryStop) {
    stopItems.push(transitStopText("ferry", accessPoint.ferryStop));
  } else if (
    accessPoint.nearestStop &&
    !isSameTransitStop(accessPoint.nearestStop, accessPoint.busStop) &&
    !isSameTransitStop(accessPoint.nearestStop, accessPoint.trainStop)
  ) {
    stopItems.push(transitStopText(accessPoint.nearestStop.type === "ferry" ? "nearest ferry" : "nearest stop", accessPoint.nearestStop));
  }

  return `${label}: ${accessPoint.placeName}. ${stopItems.join("; ")}.${approximation}`;
}

function selectedRouteGettingThereItems(sections: TrailSection[]) {
  const firstSection = sections[0];
  const lastSection = sections[sections.length - 1];
  if (!firstSection || !lastSection) return ["No selected section access data is attached yet."];

  const items = [
    accessPointText("Selected start", accessPointForEndpoint(firstSection, "start")),
    accessPointText("Selected end", accessPointForEndpoint(lastSection, "end"))
  ];

  if (sections.length > 1) {
    items.push("Intermediate stage access points remain available in the Transit Access section below.");
  }

  return items;
}

function selectedRouteCampingRuleItems(sections: TrailSection[]) {
  const noteItems = sections.flatMap((section) =>
    uniqueStrings(section.notes ?? [])
      .filter((note) => campingRulePattern.test(note))
      .map((note) => `${sectionLabel(section)}: ${note}`)
  );
  const facilityItems = sections.flatMap((section) =>
    (section.facilities ?? [])
      .filter((facility) => ["campsite", "camping", "shelter", "unofficial-shelter", "fireplace", "rule-warning"].includes(facility.type))
      .map((facility) => `${facilityTypeLabels[facility.type]} - ${facility.name}: ${facility.description}`)
  );
  const items = uniqueStrings([...noteItems, ...facilityItems]);

  if (!items.length) return ["No selected-section camping or fire-rule notes are attached yet; check posted local rules before overnight plans."];
  if (items.length <= 8) return items;
  return [...items.slice(0, 8), `${items.length - 8} more camping, fire, or rule notes are attached to the selected sections below.`];
}

function routeTransferTitle(connection: TrailSectionConnection) {
  return `${connection.from.label} to ${connection.to.label}`;
}

function routeTransferService(connection: TrailSectionConnection) {
  return [connection.lineName, connection.operator].filter(Boolean).join(" · ");
}

function routeTransferMode(connection: TrailSectionConnection) {
  return trailConnectionModeLabels[connection.mode];
}

function RouteTransferList({ connections }: { connections: TrailSectionConnection[] }) {
  if (!connections.length) return null;

  return (
    <section className="info-block transfer-block">
      <div className="transfer-block-head">
        <h2>
          <Route size={18} aria-hidden="true" />
          Route Transfers
        </h2>
        <span>{connections.length}</span>
      </div>
      <div className="transfer-list">
        {connections.map((connection) => {
          const service = routeTransferService(connection);
          const sourceUrl = connection.timetableUrl ?? connection.source?.url;
          const sourceLabel = connection.timetableUrl ? "Timetable" : connection.source?.provider ?? "Source";

          return (
            <article className="transfer-item" key={connection.id}>
              <span className="transfer-kind">{routeTransferMode(connection)}</span>
              <h3>{routeTransferTitle(connection)}</h3>
              {service ? <p className="transfer-service">{service}</p> : null}
              <p>{connection.note}</p>
              {connection.seasonality || connection.currentness ? (
                <div className="transfer-caveats">
                  {connection.seasonality ? <small>{connection.seasonality}</small> : null}
                  {connection.currentness ? <small>{connection.currentness}</small> : null}
                </div>
              ) : null}
              {sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  {sourceLabel}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SelectedTransferSummary({ connections }: { connections: TrailSectionConnection[] }) {
  if (!connections.length) return null;
  const visibleConnections = connections.slice(0, 4);
  const hiddenCount = Math.max(0, connections.length - visibleConnections.length);

  return (
    <section className="selected-transfer-summary" aria-label="Selected route transfers">
      <div className="selected-transfer-head">
        <Route size={16} aria-hidden="true" />
        <strong>
          {connections.length} transfer{connections.length === 1 ? "" : "s"} in this selection
        </strong>
      </div>
      <ul className="selected-transfer-list">
        {visibleConnections.map((connection) => {
          const service = routeTransferService(connection);

          return (
            <li key={connection.id}>
              <span>{routeTransferMode(connection)}</span>
              <strong>{routeTransferTitle(connection)}</strong>
              {service ? <small>{service}</small> : null}
            </li>
          );
        })}
        {hiddenCount ? <li className="selected-transfer-more">{hiddenCount} more transfer{hiddenCount === 1 ? "" : "s"}</li> : null}
      </ul>
    </section>
  );
}

export function FacilityList({
  facilities,
  onFocusFacility
}: {
  facilities: TrailFacility[];
  onFocusFacility: (facility: TrailFacility) => void;
}) {
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
            const panelId = `facility-panel-${group.id}`;

            return (
              <div className="facility-group" key={group.id}>
                <button
                  aria-controls={panelId}
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
                  <div id={panelId} className={isOpen ? "facility-panel" : "facility-panel collapsed"}>
                    <div className="facility-list">
                      {group.facilities.map((facility) => (
                        <article className="facility-item" key={facility.id}>
                          <button
                            aria-label={facility.coordinates ? `Show ${facility.name} on map` : undefined}
                            className="facility-focus-button"
                            disabled={!facility.coordinates}
                            onClick={() => onFocusFacility(facility)}
                            type="button"
                          >
                            <span className="facility-kind">
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
                            {facility.coordinates ? (
                              <span className="facility-focus-action">
                                <MapPin size={14} aria-hidden="true" />
                                Show on map
                              </span>
                            ) : null}
                          </button>
                          <a href={facility.source.url} target="_blank" rel="noreferrer">
                            Source
                            <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p id={panelId} className={isOpen ? "empty-group facility-panel" : "empty-group facility-panel collapsed"}>
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

function CommuteStopLine({ label, stop }: { label: string; stop?: TrailTransitStop }) {
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

function TransitAccessCard({
  accessPoint,
  label,
  emphasis = false
}: {
  accessPoint: SelectedTrailAccessPoint;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <article className={emphasis ? "transit-item selected-endpoint" : "transit-item"} key={accessPoint.id}>
      <div>
        <span>
          {label}
          {accessPoint.coordinateSource !== "route-geometry" ? " · approximate" : ""}
        </span>
        <h3>{accessPoint.placeName}</h3>
      </div>
      <div className="commute-lines">
        <CommuteStopLine label="Bus" stop={accessPoint.busStop} />
        <CommuteStopLine label="Train" stop={accessPoint.trainStop} />
        {accessPoint.ferryStop ? <CommuteStopLine label="Ferry" stop={accessPoint.ferryStop} /> : null}
        {accessPoint.nearestStop &&
        !isSameTransitStop(accessPoint.nearestStop, accessPoint.busStop) &&
        !isSameTransitStop(accessPoint.nearestStop, accessPoint.trainStop) &&
        !isSameTransitStop(accessPoint.nearestStop, accessPoint.ferryStop) ? (
          <CommuteStopLine label={accessPoint.nearestStop.type === "ferry" ? "Ferry" : "Near"} stop={accessPoint.nearestStop} />
        ) : null}
      </div>
    </article>
  );
}

function TransitAccessList({ sections }: { sections: TrailSection[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const accessPoints = selectedAccessPoints(sections);
  const firstSection = sections[0];
  const lastSection = sections[sections.length - 1];
  const selectedStart = firstSection
    ? accessPoints.find((accessPoint) => accessPoint.sectionId === firstSection.id && accessPoint.endpoint === "start")
    : undefined;
  const selectedEnd = lastSection
    ? accessPoints.find((accessPoint) => accessPoint.sectionId === lastSection.id && accessPoint.endpoint === "end")
    : undefined;
  const selectedStartId = selectedStart?.id;
  const selectedEndId = selectedEnd?.id;
  const intermediateAccessPoints = accessPoints.filter(
    (accessPoint) => accessPoint.id !== selectedStartId && accessPoint.id !== selectedEndId
  );

  return (
    <section className="info-block transit-block">
      <div className="transit-block-head">
        <h2>
          <Train size={18} aria-hidden="true" />
          Transit Access
        </h2>
        <span>{accessPoints.length}</span>
      </div>

      {accessPoints.length ? (
        <>
          {selectedStart || selectedEnd ? (
            <div className="transit-list selected-transit-list">
              {selectedStart ? (
                <TransitAccessCard accessPoint={selectedStart} label="Selected start" emphasis />
              ) : null}
              {selectedEnd ? <TransitAccessCard accessPoint={selectedEnd} label="Selected end" emphasis /> : null}
            </div>
          ) : null}

          {intermediateAccessPoints.length ? (
            <>
              <button
                aria-controls="transit-access-panel"
                aria-expanded={isOpen}
                className="facility-group-toggle transit-toggle"
                type="button"
                onClick={() => setIsOpen((current) => !current)}
              >
                <span>Intermediate stage access</span>
                <small>{intermediateAccessPoints.length}</small>
                <ChevronDown className={isOpen ? "chevron open" : "chevron"} size={16} aria-hidden="true" />
              </button>
              <div id="transit-access-panel" className={isOpen ? "transit-panel" : "transit-panel collapsed"}>
                <div className="transit-list">
                  {intermediateAccessPoints.map((accessPoint) => (
                    <TransitAccessCard
                      accessPoint={accessPoint}
                      key={accessPoint.id}
                      label={`${sectionLabel(accessPoint)} · ${accessPoint.endpoint}`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <p>No transit access points are attached to this route yet.</p>
      )}
    </section>
  );
}

function commuteTypesForFacilityGroup(group: FacilityCategoryGroup): TrailCommuteStop["type"][] {
  return group.id === "parking-transit" ? ["bus", "train"] : [];
}

function FacilityMapFilters({
  selectedTypes,
  onChange,
  facilities,
  accessPoints,
  selectedCommuteTypes,
  onCommuteChange,
  onHighlightGroupChange
}: {
  selectedTypes: Set<FacilityType>;
  onChange: (types: Set<FacilityType>) => void;
  facilities: TrailFacility[];
  accessPoints: SelectedTrailAccessPoint[];
  selectedCommuteTypes: Set<TrailCommuteStop["type"]>;
  onCommuteChange: (types: Set<TrailCommuteStop["type"]>) => void;
  onHighlightGroupChange: (groupId: string | null) => void;
}) {
  const commuteCounts = React.useMemo(
    () =>
      (["bus", "train"] as const).map((type) => {
        const stopIds = new Set(
          accessPoints.flatMap((accessPoint) => [accessPoint.busStop, accessPoint.trainStop]).filter((stop) => stop?.type === type).map((stop) => stop!.id)
        );
        return { type, count: stopIds.size };
      }),
    [accessPoints]
  );
  const categoryCounts = React.useMemo(
    () =>
      facilityCategoryGroups.map((group) => {
        const facilityCount = facilities.filter((facility) => group.types.includes(facility.type) && facility.coordinates).length;
        const commuteCount = group.id === "parking-transit" ? commuteCounts.reduce((total, item) => total + item.count, 0) : 0;
        return { ...group, count: facilityCount + commuteCount };
      }),
    [commuteCounts, facilities]
  );

  function toggleCategory(group: (typeof facilityCategoryGroups)[number]) {
    const next = new Set(selectedTypes);
    const commuteTypes = commuteTypesForFacilityGroup(group);
    const allFacilitiesSelected = group.types.every((type) => selectedTypes.has(type));
    const allCommuteSelected = commuteTypes.every((type) => selectedCommuteTypes.has(type));
    const shouldShow = !(allFacilitiesSelected && allCommuteSelected);

    for (const type of group.types) {
      if (shouldShow) next.add(type);
      else next.delete(type);
    }
    onChange(next);

    if (commuteTypes.length) {
      const nextCommute = new Set(selectedCommuteTypes);
      for (const type of commuteTypes) {
        if (shouldShow) nextCommute.add(type);
        else nextCommute.delete(type);
      }
      onCommuteChange(nextCommute);
    }
  }

  return (
    <div className="map-filter-panel" aria-label="Map facility filters">
      <div className="map-filter-title" title="Map filters" aria-label="Map filters">
        <Layers size={14} aria-hidden="true" />
      </div>
      <div className="map-filter-options">
        {categoryCounts.map((group) => {
          const isActive =
            group.types.every((type) => selectedTypes.has(type)) &&
            (group.id !== "parking-transit" || (selectedCommuteTypes.has("bus") && selectedCommuteTypes.has("train")));
          return (
            <button
              key={group.id}
              aria-pressed={isActive}
              className={isActive ? "map-filter-chip active" : "map-filter-chip"}
              type="button"
              onClick={() => toggleCategory(group)}
              onBlur={() => onHighlightGroupChange(null)}
              disabled={!group.count}
              data-facility-group={group.id}
              data-facility-types={group.types.join(" ")}
              onFocus={() => onHighlightGroupChange(group.id)}
              onMouseEnter={() => onHighlightGroupChange(group.id)}
              onMouseLeave={() => onHighlightGroupChange(null)}
              onPointerEnter={() => onHighlightGroupChange(group.id)}
              onPointerLeave={() => onHighlightGroupChange(null)}
              title={`${isActive ? "Hide" : "Show"} ${group.title} (${group.count})`}
              aria-label={`${group.title} (${group.count})`}
            >
              {group.icon}
              <span>{group.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TrailSystemDetails({
  trailSystem,
  isStarred,
  onToggleStar,
  distanceFilter,
  recommendedTimeFilter,
  onBackToOverview
}: {
  trailSystem: TrailSystem;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
  distanceFilter: DistanceFilter;
  recommendedTimeFilter: RecommendedTimeFilter;
  onBackToOverview: () => void;
}) {
  const [viewMode, setViewMode] = React.useState<"builder" | "info">("builder");
  const routeGroups = routeGroupsForTrailSystem(trailSystem);
  const mainRouteGroups = primaryRouteGroups(trailSystem);
  const contextualRouteGroups = routeGroups.filter((group) => group.kind !== "mainline");
  const sectionLookup = React.useMemo(() => sectionLookupForTrailSystem(trailSystem), [trailSystem]);
  const routeSeedFilter = distanceFilter !== "all" ? distanceFilter : recommendedTimeFilter;
  const initialRouteMatch = matchingRouteGroupRange(trailSystem, routeSeedFilter);
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
  const [selectedCommuteTypes, setSelectedCommuteTypes] = React.useState<Set<TrailCommuteStop["type"]>>(
    () => new Set(["bus", "train"])
  );
  const [highlightedFacilityGroupId, setHighlightedFacilityGroupId] = React.useState<string | null>(null);
  const [selectedContextGroupIds, setSelectedContextGroupIds] = React.useState<Set<string>>(() => new Set());
  const [mapFocusTarget, setMapFocusTarget] = React.useState<TrailMapFocusTarget | null>(null);
  const contentTopRef = React.useRef<HTMLElement | null>(null);
  const mapRegionRef = React.useRef<HTMLDivElement | null>(null);

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
  const selectedDescription = selectedRouteDescription({
    sections: detailedPrimaryRouteSections,
    distanceKm,
    routeGroupLabel,
    firstSection,
    lastSection
  });
  const gettingThereItems = selectedRouteGettingThereItems(detailedPrimaryRouteSections);
  const campingRuleItems = selectedRouteCampingRuleItems(detailedPrimaryRouteSections);
  const selectedTransferConnections = selectedTrailTransferConnections(trailSystem.connections, detailedPrimaryRouteSections);

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
    const nextRange = matchingRouteGroupRange(trailSystem, routeSeedFilter);
    if (!nextRange) return;
    setRouteGroupId(nextRange.routeGroupId);
    setStartSectionId(nextRange.startSectionId);
    setEndSectionId(nextRange.endSectionId);
    setSelectedContextGroupIds(new Set());
    setViewMode("builder");
  }, [routeSeedFilter, trailSystem]);

  React.useEffect(() => {
    if (viewMode !== "info" || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    window.requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [viewMode]);

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

  function focusFacilityOnMap(facility: TrailFacility) {
    if (!facility.coordinates) return;
    const shouldScrollMap = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
    setSelectedFacilityTypes((current) => {
      if (current.has(facility.type)) return current;
      return new Set([...current, facility.type]);
    });
    setMapFocusTarget((current) => ({
      id: facility.id,
      coordinates: facility.coordinates!,
      requestId: (current?.requestId ?? 0) + 1,
      zoom: 15
    }));
    if (shouldScrollMap) {
      window.requestAnimationFrame(() => {
        mapRegionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
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
        <DetailRow icon={<Info size={18} />} label="Range" value={`${firstSection.from} to ${lastSection.to}`} />
      </dl>
    </section>
  );

  if (viewMode === "info") {
    return (
      <main className="content" ref={contentTopRef}>
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
              {selectedContextGroups.length ? ` · ${selectedContextGroups.length} related option${selectedContextGroups.length === 1 ? "" : "s"}` : ""}
              {selectedTransferConnections.length ? ` · ${selectedTransferConnections.length} transfer${selectedTransferConnections.length === 1 ? "" : "s"}` : ""} · {formatDistance(distanceKm)}
            </span>
          </div>
        </section>

        <div className="map-with-controls" data-highlight-group={highlightedFacilityGroupId ?? undefined} ref={mapRegionRef}>
          <section className="map-panel" aria-label={`${trailSystem.name} map`}>
            <DeferredMapMount>
              <TrailSystemMap
                trailSystem={trailSystem}
                selectedSections={detailedSelectedRouteSections}
                primarySections={detailedPrimaryRouteSections}
                facilities={selectedFacilities}
                visibleFacilityTypes={selectedFacilityTypes}
                visibleCommuteTypes={selectedCommuteTypes}
                focusTarget={mapFocusTarget}
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
            accessPoints={accessPoints}
            selectedTypes={selectedFacilityTypes}
            onChange={setSelectedFacilityTypes}
            selectedCommuteTypes={selectedCommuteTypes}
            onCommuteChange={setSelectedCommuteTypes}
            onHighlightGroupChange={setHighlightedFacilityGroupId}
          />
        </div>

        <section className="description">
          <h2>Description</h2>
          <p>{selectedDescription}</p>
          {sectionDetailWarning}
        </section>

        <div className="info-grid">
          <InfoList title="Getting There" icon={<Train size={18} />} items={gettingThereItems} />
          <RouteTransferList connections={selectedTransferConnections} />

          <InfoList title="Camping Rules" icon={<Tent size={18} />} items={campingRuleItems} />

          <TransitAccessList sections={detailedPrimaryRouteSections} />
          <FacilityList facilities={selectedFacilities} onFocusFacility={focusFacilityOnMap} />
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
              {selectedContextGroups.length ? ` + ${contextSections.length} related` : ""}
              {selectedTransferConnections.length ? ` · ${selectedTransferConnections.length} transfer${selectedTransferConnections.length === 1 ? "" : "s"}` : ""} · {formatDistance(distanceKm)}
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
                <span>Related route options</span>
                <small>Connected to this range</small>
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
                    {routePickerSectionLabel(section)}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span>End</span>
              <select value={endSectionId} onChange={(event) => setEndSectionId(event.target.value)}>
                {routeSections.map((section, index) => (
                  <option key={section.id} value={section.id} disabled={index < startIndex}>
                    {routePickerSectionLabel(section)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SelectedTransferSummary connections={selectedTransferConnections} />

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

        <div className="map-with-controls" data-highlight-group={highlightedFacilityGroupId ?? undefined} ref={mapRegionRef}>
          <section className="map-panel builder-map-panel" aria-label={`${trailSystem.name} map`}>
            <DeferredMapMount>
              <TrailSystemMap
                trailSystem={trailSystem}
                selectedSections={detailedSelectedRouteSections}
                primarySections={detailedPrimaryRouteSections}
                facilities={selectedFacilities}
                visibleFacilityTypes={selectedFacilityTypes}
                visibleCommuteTypes={selectedCommuteTypes}
                focusTarget={mapFocusTarget}
              />
            </DeferredMapMount>
            <div className="map-status">Route + facilities</div>
          </section>
          <FacilityMapFilters
            facilities={selectedFacilities}
            accessPoints={accessPoints}
            selectedTypes={selectedFacilityTypes}
            onChange={setSelectedFacilityTypes}
            selectedCommuteTypes={selectedCommuteTypes}
            onCommuteChange={setSelectedCommuteTypes}
            onHighlightGroupChange={setHighlightedFacilityGroupId}
          />
        </div>
      </section>

    </main>
  );
}
