import React from "react";
import { CalendarDays, Droplets, ExternalLink, Info, MapPin, Mountain, Star, Tent, Toilet, Train } from "lucide-react";
import type { Hike } from "../types";
import { recommendedTimeLabels } from "../data/filters";
import { DeferredMapMount } from "../map/DeferredMapMount";
import { RouteMap } from "../map/RouteMap";
import type { HikeMapStatus } from "../map/types";
import { BackToOverviewButton, DetailRow, InfoList } from "./DetailBlocks";

export function HikeDetails({
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
