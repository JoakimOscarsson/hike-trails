import React from "react";
import { AlertTriangle, CalendarDays, MapPin, Mountain, Route } from "lucide-react";
import type { ActivityKind, LibraryIndexItem, LibraryOverviewFeatureCollection, TripDuration } from "../types";
import { OverviewMap } from "../map/OverviewMap";
import { durationLabel, itemLocationLabel } from "../utils/libraryItem";

type OverviewLoadState = { status: "idle" | "loading" | "ready" | "error"; message?: string };

const overviewLabels: Record<ActivityKind, { eyebrow: string; title: string; mapLabel: string; distanceLabel: string }> = {
  hiking: {
    eyebrow: "Hiking",
    title: "Hiking Routes",
    mapLabel: "Hiking overview map",
    distanceLabel: "Total distance"
  },
  kayaking: {
    eyebrow: "Kayaking",
    title: "Kayak Trips",
    mapLabel: "Kayaking overview map",
    distanceLabel: "Known distance"
  }
};

const durationWeight: Record<TripDuration, number> = {
  "half-day": 0,
  dayhike: 1,
  weekend: 2,
  "3-5-days": 3,
  "6-10-days": 4,
  "10-plus-days": 5,
  "6-plus-days": 4
};

const kayakNavigationWarning = "Approximate waypoint corridor for planning context only. Do not use this line for navigation.";

function OverviewStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="overview-stat">
      <span className="overview-stat-icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

export function ActivityOverview({
  activity,
  items,
  totalItems,
  overview,
  overviewState,
  hoveredItemId,
  onHoverItemId,
  onSelect,
  onRetryOverview
}: {
  activity: ActivityKind;
  items: LibraryIndexItem[];
  totalItems: number;
  overview: LibraryOverviewFeatureCollection | null;
  overviewState: OverviewLoadState;
  hoveredItemId: string | null;
  onHoverItemId: (id: string | null) => void;
  onSelect: (item: LibraryIndexItem) => void;
  onRetryOverview: () => void;
}) {
  const totalDistance = items.reduce(
    (sum, item) => sum + (typeof item.distanceKm === "number" && Number.isFinite(item.distanceKm) ? item.distanceKm : 0),
    0
  );
  const locationCount = new Set(items.map(itemLocationLabel)).size;
  const longestDuration = items.reduce<TripDuration | null>((longest, item) => {
    for (const duration of item.recommendedTimes) {
      if (!longest || durationWeight[duration] > durationWeight[longest]) return duration;
    }
    return longest;
  }, null);
  const labels = overviewLabels[activity];
  const overviewWarnings =
    activity === "kayaking" && overview
      ? [
          ...new Set(
            overview.features
              .map((feature) =>
                feature.properties.activity === "kayaking" && "warning" in feature.properties ? feature.properties.warning : undefined
              )
              .filter((warning): warning is string => typeof warning === "string" && warning.trim().length > 0)
          )
        ]
      : [];
  const mapWarning = activity === "kayaking" ? (overviewWarnings.length ? overviewWarnings.join(" ") : kayakNavigationWarning) : null;

  return (
    <main className="content activity-overview-content">
      <section className="activity-overview-head">
        <div className="title-group">
          <p>{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <span>
            {items.length} of {totalItems} routes
          </span>
        </div>
        <div className="overview-stats">
          <OverviewStat icon={<Route size={17} />} label="Visible routes" value={`${items.length}`} />
          <OverviewStat icon={<MapPin size={17} />} label={labels.distanceLabel} value={`${Math.round(totalDistance)} km`} />
          <OverviewStat icon={<Mountain size={17} />} label="Locations" value={`${locationCount}`} />
          <OverviewStat icon={<CalendarDays size={17} />} label="Longest" value={longestDuration ? durationLabel(longestDuration) : "None"} />
        </div>
      </section>

      <section className="map-panel overview-map-panel" aria-label={labels.mapLabel}>
        {overviewState.status === "ready" && overview ? (
          <OverviewMap
            overview={overview}
            items={items}
            hoveredItemId={hoveredItemId}
            onHoverItemId={onHoverItemId}
            onSelect={onSelect}
          />
        ) : overviewState.status === "error" ? (
          <div className="overview-map-state" role="alert">
            <p>{overviewState.message ?? "Overview map could not load."}</p>
            <button className="secondary-action" type="button" onClick={onRetryOverview}>
              Retry
            </button>
          </div>
        ) : (
          <div className="overview-map-state" role="status">
            Loading overview map...
          </div>
        )}
        {mapWarning ? (
          <div className="map-warning">
            <AlertTriangle size={15} aria-hidden="true" />
            {mapWarning}
          </div>
        ) : null}
        <div className="map-status">{items.length} routes</div>
      </section>
    </main>
  );
}
