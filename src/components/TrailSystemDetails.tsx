import React from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronDown, ExternalLink, Info, Layers, MapPin, Star, Tent, Train } from "lucide-react";
import type { TrailCommuteStop, TrailFacility, TrailSystem } from "../types";
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
  type DistanceFilter
} from "../data/filters";
import { DeferredMapMount } from "../map/DeferredMapMount";
import { TrailSystemMap } from "../map/TrailSystemMap";
import {
  defaultFacilityTypes,
  facilityCategoryGroups,
  facilityProximityText,
  facilityTypeIcon,
  facilityTypeLabels,
  isCloseTrailFacility,
  isOffRouteFacility,
  selectedAccessPoints,
  type FacilityType,
  type SelectedTrailAccessPoint
} from "../map/hikingFacilities";
import { BackToOverviewButton, DetailRow, InfoList } from "./DetailBlocks";

export function FacilityList({ facilities }: { facilities: TrailFacility[] }) {
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

export function TrailSystemDetails({
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
