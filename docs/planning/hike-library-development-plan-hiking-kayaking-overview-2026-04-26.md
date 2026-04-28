# Development Plan: Hiking, Kayaking, Overview Map, and Refactor Integration

Date: 2026-04-26

Workspace target: `/Users/joakim/Documents/New project`

This plan is intended for future LLM agents. It is detailed by design: each work package has scope, dependencies, files to own, acceptance criteria, and validation notes.

No project files were changed while creating this plan.

## Agent Start Here

Use this document for strategy, architecture, and product direction.

Use `docs/planning/hike-library-agent-implementation-playbook-2026-04-26.md` as the execution guide. It contains the ordered implementation phases, per-phase definitions of done, and test plans.

## Inputs Reviewed

- `docs/planning/hike-library-architecture-review-2026-04-26.md`
- `docs/planning/hike-library-refactor-plan-map-loading-data-pipeline-2026-04-26.md`
- `docs/test-reports/hike-ui-test-report-2026-04-26.md`
- `docs/test-reports/hike-ui-test-report-round-2-2026-04-26.md`
- `research/stockholm-kayak-archipelago-research/compiled/`
- `research/stockholm-kayak-archipelago-research/mapdata/`
- `research/stockholm-kayak-archipelago-research/schemas/kayak-route.schema.json`
- `research/stockholm-kayak-archipelago-research/scripts/build-mapdata.mjs`

## Workspace Recheck: 2026-04-28

A read-only pass over `/Users/joakim/Documents/New project` after additional Sormlandsleden work found that the plan still holds. No workspace files were changed during the recheck.

Important current-state notes for future agents:

- The app is still in the pre-refactor shape: `src/main.tsx`, `src/styles.css`, and `src/types.ts` remain large central files, and no `data/source/`, `public/data/overviews/`, or sharded `public/data/trail-systems/<id>/...` runtime contract exists yet.
- Sormlandsleden has grown significantly. `public/data/trail-systems/sormlandsleden.json` is now about 69,700 lines, with 94 sections and about 2,582 facilities in the combined source data. This reinforces the source/runtime sharding plan; it does not require a different architecture.
- New research contribution files now exist under `data/route-contributions/`, including Upplandsleden, Vikingaleden, and Stockholm Archipelago Trail candidate data. Treat these files as research-only inputs unless a later task explicitly scopes their integration. Do not auto-import them into the runtime app. When they are integrated, normalize them through the same sharded source tree, generated runtime shards, and validation pipeline described in this plan.
- A quick integrity audit of current generated hiking data found no duplicate section IDs, no missing ready-route GeoJSON files, no unknown route-group section references, no unknown preset references, no duplicate facility IDs within sections, and no missing public index detail paths.

## Executive Summary

The earlier refactor plan is still the right foundation, but it needs to be broadened. The app should no longer be treated as a hiking-only app with kayaking bolted on. It should become an activity-aware route library with hiking and kayaking as first-class modes.

The most important architectural adjustment is this:

- Route loading, map layers, overview maps, search, validation, and data generation must become activity-agnostic.
- Hiking can keep its current trail-system builder behavior.
- Kayaking needs its own trip detail experience, safety metadata, launch/rental/facility model, and explicit "approximate corridor, not for navigation" treatment.

The highest-priority sequence is:

1. Add read-only validation and normalize the data contract.
2. Fix route geometry caching and Leaflet lifecycle issues.
3. Add activity-aware app state and a top-level Hiking/Kayaking switch.
4. Add an unselected overview map for the current activity.
5. Import and normalize kayak research data into the project pipeline.
6. Build kayak-specific UI that reuses the shared shell, map, filters, source display, facility list, and index/detail loading.
7. Address the P1/P2 UI test findings as part of the same foundation rather than as later polish.

## Product Direction

The app should support two primary activity modes:

- Hiking
- Kayaking

The current hiking app remains recognizable. The new mode switch should be visible at the top level and should not make the UI feel like two separate apps.

Recommended product framing:

- Current user mental model: "I want to plan an outdoor route."
- Top-level activity switch: "Hiking" and "Kayaking".
- Within each activity:
  - Browse/search/filter route candidates.
  - See an overview map when nothing is selected.
  - Click a route/trail from the map or list.
  - Use the relevant planning interface.

Keep the UI clean by sharing structure:

- Same app shell.
- Same search field.
- Same favorites/recent behavior.
- Same index/detail loading pattern.
- Same map component family.
- Activity-specific filters and details only where they matter.

## Key Architecture Decision

Adopt an activity-aware library model.

```ts
type ActivityKind = "hiking" | "kayaking";

type LibraryItemKind =
  | "hike"
  | "trail-system"
  | "kayak-trip";
```

The existing `Hike`, `TrailSystem`, and `TrailSection` models can remain, but the top-level index and app shell should become generic enough to hold kayak trips.

Recommended index shape:

```ts
type LibraryIndexItem = {
  id: string;
  activity: ActivityKind;
  itemType: LibraryItemKind;
  name: string;
  region: string;
  country: string;
  locationLabel: string;
  recommendedTimes: TripDuration[];
  difficulty: string;
  distanceKm: number | null;
  estimatedTime: string;
  routeType: string;
  detailPath?: string;
  manifestPath?: string;
  sectionsIndexPath?: string;
  overviewGeometryPath?: string;
  searchText: string;
  normalizedSearchText: string;
  tags?: string[];
};
```

Recommended duration model:

```ts
type TripDuration =
  | "half-day"
  | "day"
  | "weekend"
  | "3-5-days"
  | "6-plus-days";
```

Migration note:

- Hiking currently uses `dayhike`.
- Kayaking data uses `day`.
- Plan to migrate the shared index to `day`, while display labels can still say "Day hike" in hiking mode and "Day trip" in kayaking mode.
- During transition, support both `dayhike` and `day` in adapters so old generated data does not break.

Large item loading rule:

- Standalone hikes and kayak trips may use one detail file each.
- Large trail systems must not use one huge all-in detail JSON as the primary runtime contract.
- Large trail systems should expose a small manifest, a lightweight sections index, and per-section detail shards.
- The route builder should use the sections index; the info/detail view should fetch only the selected section details it needs.

## Required Change To Previous Refactor Plan

The previous refactor plan remains valid, with these changes:

1. `src/map/routeGeometry.ts` should not be hiking-specific.
   - It must load exact hiking GPX-derived GeoJSON and approximate kayak corridor GeoJSON.
   - It should expose route metadata such as `geometryStatus`, `mapConfidence`, and `navigationUse`.

2. Route overview generation should move earlier.
   - The new unselected overview map depends on lightweight overview geometry.
   - Do not wait until after all map refactors to generate overview data.

3. Data pipeline ownership should be organized by activity and item type.
   - Hiking trail systems.
   - Kayak trips.
   - Shared facilities where applicable.
   - Kayak-only facilities such as rental centers and launch/parking records.

4. Validation must include kayaking-specific rules.
   - Kayak corridors marked `not-for-navigation`.
   - Kayak facility references are actual IDs, while free-text facility notes are separated.
   - Kayak route records have normalized `itemType`, `researchStatus`, `geometryStatus`, and `mapConfidence`.

5. The map lifecycle fix is now a prerequisite for new feature work.
   - The overview map, kayaking corridors, and activity switching would otherwise amplify the existing Leaflet remount/request-burst bugs.

## Current Kayak Data Assessment

The preliminary kayak research is useful, but it is not import-ready without normalization.

Observed dataset summary:

- `kayak-map-ready.dataset.json` contains 34 routes, 61 facilities, and 22 parking records.
- `kayak-route-corridors.geojson` contains 34 drawable route corridors.
- `kayak-route-points.geojson` contains 190 route point features.
- `kayak-facilities.geojson` contains 61 facility points.
- `kayak-parking.geojson` contains 22 parking points.
- All route corridors are marked as `approximate-waypoint-corridor`.
- All route corridors are marked `navigationUse: "not-for-navigation"`.
- All route map confidence values are currently `medium`.

Important caveats from the kayak research:

- Route lines are approximate waypoint corridors, not GPX tracks.
- Exact launch/rack/toilet/water coordinates still need source-grade verification.
- Store exposure separately from difficulty.
- Volatile fields include rental availability, prices, hours, ferry timetables, fire bans, self-service availability, and protected-area rules.
- Several routes need follow-up before being presented as planning-grade.

Named corrections that must survive import:

- Bullero-related routes should be modeled under current Namdoskargarden National Park rules, not old Bullero reserve assumptions.
- Langviksskar is split between the national park context and the southern Langviksskar nature reserve; do not collapse this into one generic protected-area note.
- Stockholm Kayak Trail pages do not publish exact km distances for the relevant Stavsnas/Sollenkroka/Runmaro stages; keep those distances unknown until measured.
- Runmaro runt has conflicting public metadata; preserve that contradiction instead of choosing one value silently.
- Grinda/Gallno has taxonomy noise where one source labels it as a day trip while route-level material says 4-5 days.
- Kayakomat Nynashamn/Nickstabadet is unreliable for current import because municipal listing and availability/opening status conflict.

Normalization issues found:

- 15 route records from iteration-03 additions have no `itemType`.
- 15 route records from iteration-03 additions have no `researchStatus`.
- Several route distances are `null`.
- Several route `facilities` arrays contain free-text service notes instead of facility IDs.
- Some facility records reference route IDs that are not part of the current 34-route map-ready route set. These should become future/candidate route links, not hard validation failures.
- Sources are mixed between string URLs and structured source objects.
- The kayak schema sketches a route model, but current compiled data does not fully conform to it.

Conclusion:

- Use `mapdata/kayak-map-ready.dataset.json` and its GeoJSON files as the source for a first internal kayak preview.
- Do not import the raw compiled files directly into the app.
- Add a dedicated normalization step that produces app-ready kayak trips and app-ready kayak facilities.

## Target Data Model

### Shared Types

Create shared domain concepts that both hiking and kayaking can use.

```ts
type ActivityKind = "hiking" | "kayaking";

type GeometryStatus =
  | "ready"
  | "approximate-waypoint-corridor"
  | "single-point-only"
  | "missing";

type NavigationUse =
  | "navigable-route"
  | "planning-reference"
  | "not-for-navigation";

type ResearchConfidence = "low" | "medium" | "high";

type ResearchStatus =
  | "catalog-only"
  | "partially-researched"
  | "planning-grade";
```

### Shared Source Shape

```ts
type SourceRef = {
  provider: string;
  url: string;
  title?: string;
  lastAccessedAt?: string;
  lastFetchedAt?: string;
  notes?: string;
};
```

Use this shape for both hiking and kayaking. Current hiking uses `source`, while kayak records often use `sources`; keep both at detail level if needed, but normalize display through a helper.

### Shared Geometry Shape

```ts
type RouteGeometryRef = {
  geojsonPath?: string;
  geometryStatus: GeometryStatus;
  mapConfidence: ResearchConfidence | "missing";
  navigationUse: NavigationUse;
  sourceFormat:
    | "gpx"
    | "geojson"
    | "manual"
    | "official-network-gpx"
    | "osm-relation"
    | "approximate-waypoint-corridor";
  warning?: string;
};
```

For hiking:

- Existing `route.geojsonPath` can map into this structure.
- `navigationUse` is usually `navigable-route` or `planning-reference`.

For kayaking:

- Initial import should set `sourceFormat: "approximate-waypoint-corridor"`.
- Initial import should set `navigationUse: "not-for-navigation"`.
- UI must show a quiet but clear warning on kayak route maps.

### Kayak Trip Type

```ts
type KayakTrip = {
  id: string;
  activity: "kayaking";
  itemType: "kayak-trip";
  name: string;
  region: string;
  country: string;
  waterArea: string;
  archipelagoRegion: "inner-stockholm" | "middle" | "southern" | "northern" | string;
  waterZone: "inner" | "middle" | "outer" | string;
  recommendedTimes: TripDuration[];
  difficulty: "Beginner" | "Easy" | "Moderate" | "Hard" | "Expert" | "Unknown";
  exposure: "sheltered" | "mixed" | "exposed" | "unknown" | string;
  distanceKm: number | null;
  estimatedTime: string;
  routeType: "Loop" | "Out and back" | "Point to point" | "Open itinerary" | "Unknown";
  season: string;
  description: string;
  start: KayakPlace;
  end: KayakPlace;
  waypoints: KayakPlace[];
  access: KayakAccess;
  safety: KayakSafety;
  protectionRules: ProtectionRules;
  campingRules: string;
  facilityRefs: string[];
  rentalRefs: string[];
  facilityNotes: string[];
  sources: SourceRef[];
  research: KayakResearch;
  route: RouteGeometryRef;
  map: {
    center: [number, number];
    zoom: number;
    externalUrl?: string;
  };
};
```

### Kayak Facility Type

Kayaking needs facilities that hiking does not.

```ts
type KayakFacility = {
  id: string;
  activity: "kayaking";
  name: string;
  type:
    | "kayak-rental"
    | "self-service-rental"
    | "canoe-rental"
    | "launch"
    | "landing"
    | "parking"
    | "guest-harbor"
    | "natural-harbor"
    | "transport"
    | "campsite"
    | "toilet"
    | "water"
    | "food"
    | "sauna"
    | "shop";
  primaryCategory:
    | "rental_staffed"
    | "rental_self_service"
    | "parking_launch_access"
    | "launch"
    | "overnight_service"
    | "harbor_landing"
    | "transport"
    | "service";
  coordinates?: [number, number];
  coordinateSource?: string;
  mapConfidence: ResearchConfidence | "missing";
  routeIds: string[];
  candidateRouteIds?: string[];
  serviceTags: string[];
  bookingModel?: string;
  supportsOwnKayak?: "yes" | "no" | "candidate" | "unknown";
  parkingType?: string;
  launchCarry?: string;
  overnightSuitability?: string;
  description: string;
  accessNotes: string[];
  sources: SourceRef[];
  needsFollowup: string[];
};
```

### Search Index Requirements

Every index item should have both:

- `searchText`: display/debug readable text.
- `normalizedSearchText`: lowercase, diacritic-stripped text.

This directly addresses the test finding where `sormlandsleden`, `mellsjon`, and `nynashamn` fail.

## Target Source Data Layout

The source/input side should avoid many-thousand-line JSON files and giant generator scripts. Human-authored or agent-authored data should be split by ownership boundary.

Recommended source layout:

```text
data/source/
  trail-systems/
    roslagsleden/
      manifest.json
      sections/
        stage-1.json
        stage-2.json
      route-groups.json
      presets.json
      facilities.json
    sormlandsleden/
      manifest.json
      sections/
        stage-1.json
        stage-2.json
        stage-5-1.json
      route-groups.json
      presets.json
      research-overlays/
        stage-1.json
        stage-2.json
      official-catalog-import.json
  kayaking/
    trips/
      langholmen-reimersholme-loop.json
      kungsholmen-loop.json
    facilities/
      rentals.json
      launches.json
      parking.json
    imports/
      kayak-map-ready.dataset.json
      kayak-route-corridors.geojson
      kayak-facilities.geojson
      kayak-parking.geojson
```

Source file sizing guidance:

- Prefer one route/trip/section per file when records are research-heavy.
- Keep shared files for genuinely shared concepts such as route groups and presets.
- If a source file is becoming hard to review, split it before adding more data.
- Generator scripts should load these files; they should not contain large embedded route catalogs.

## Target Runtime Public Data Layout

Keep the current files working during migration, but introduce a new generic library payload.

Recommended eventual layout:

```text
public/data/
  library-index.json
  overviews/
    hiking.geojson
    kayaking.geojson
  hikes/
    <hike-id>.json
  trail-systems/
    <trail-system-id>/
      manifest.json
      route-groups.json
      presets.json
      sections-index.json
      sections/
        <section-id>.json
  kayak-trips/
    <kayak-trip-id>.json
  kayak-facilities.json

public/routes/
  hiking/
    <route-id>.geojson
  kayaking/
    <kayak-trip-id>.geojson
```

Compatibility during migration:

- Continue writing `public/data/hikes-index.json` until the app has switched to `library-index.json`.
- Continue writing legacy `public/data/trail-systems/<trail-system-id>.json` only as a temporary compatibility artifact if needed.
- New runtime code should target sharded trail-system data, not the legacy all-in-one trail-system JSON.
- Existing hiking route paths can remain under `public/routes/*.geojson` initially.
- New kayak route paths should use `public/routes/kayaking/*.geojson`.
- Once the new route loader supports both old and new paths, migrate hiking paths only if there is a clear benefit.

Runtime loading rule:

- Startup loads `library-index.json` and active activity overview GeoJSON only.
- Selecting a large trail system loads `manifest.json`, `sections-index.json`, route groups, and presets.
- The route builder uses `sections-index.json`, not full section detail records.
- The map loads only overview geometry or selected/context route geometry through the route cache.
- The info view fetches per-section detail JSON only for selected/context sections.
- Kayak trips may remain one-detail-file-per-trip because the current trip records are naturally bounded.
- No runtime feature should require downloading a many-thousand-line trail-system JSON just to enter the route builder.

## User Experience Plan

### App Shell

Add a top-level activity switch near the current brand/sidebar top.

Recommended control:

- Segmented control with `Hiking` and `Kayaking`.
- It should be keyboard accessible.
- It should use `aria-pressed` or tab semantics.
- It should not be visually huge.

When switching activity:

- Clear the selected item by default and show the overview map.
- Preserve search text only if it feels natural; recommended initial behavior is to clear search to reduce confusing empty states.
- Preserve favorites globally, but display only favorites for the active activity.

### Sidebar/List

Keep a single sidebar list pattern, but make content activity-aware.

Hiking mode list:

- Trail systems and standalone hikes.
- Existing distance/time/location filters.
- Later: group by region or item type when item count grows.

Kayaking mode list:

- Kayak trips.
- Filter by archipelago region.
- Filter by water zone/exposure.
- Filter by recommended time.
- Filter by difficulty.
- Optional filter: rental available / self-service rental / own kayak launch support.

Keep advanced kayak filters collapsed or tucked behind a compact "More filters" control so the UI remains clean.

### Empty And Unselected States

Fix current stale-detail behavior as part of this work.

States:

1. Index loading.
   - Show a real loading state.

2. Index error.
   - Show recoverable error and retry.

3. No selected item.
   - Show the activity overview map.
   - No details.

4. No search/filter results.
   - Sidebar says no matches.
   - Main panel should show a no-results state, not stale previous details.
   - Offer clear filters/search action.

5. Detail loading.
   - Keep previous valid detail visible only if clearly marked, or show detail-level loading in the main area.

6. Detail error/corrupt JSON/hung request.
   - Show clear error with retry.

### Overview Map

New feature: when no item is selected, show all routes/trails for the active activity.

Behavior:

- Draw each route/trail in a distinct stable color.
- On hover/focus of one route:
  - Highlight hovered route.
  - Gray all others.
  - Show lightweight tooltip with name, distance/time, and difficulty.
- On click:
  - Select the corresponding item.
  - For hiking trail systems, open the existing route builder interface.
  - For hiking standalone hikes, open the hike detail interface.
  - For kayak trips, open the kayak trip detail interface.
- On keyboard list focus:
  - Highlight the corresponding route on the map.
- On Escape or "Back to overview":
  - Clear selected item and return to overview.

Important:

- Do not make every Leaflet path a noisy tab stop.
- Prefer list/sidebar keyboard focus as the accessible route-selection mechanism.
- Map hover can remain pointer-first if the sidebar/list provides the same selection ability.

Overview data:

- Hiking overview should not fetch every detailed route section file.
- Generate a lightweight overview FeatureCollection for hiking.
- Kayaking can initially reuse `kayak-route-corridors.geojson`, normalized into `public/data/overviews/kayaking.geojson`.

Recommended overview feature properties:

```ts
type OverviewFeatureProperties = {
  id: string;
  activity: ActivityKind;
  itemType: LibraryItemKind;
  name: string;
  detailPath: string;
  distanceKm: number | null;
  estimatedTime: string;
  difficulty: string;
  routeType: string;
  colorKey: string;
  geometryStatus: GeometryStatus;
  mapConfidence: string;
  navigationUse: NavigationUse;
};
```

### Hiking Detail UX

Keep the current route builder, but fix foundation issues:

- Do not refetch every section route on facility toggles.
- Do not remount Leaflet for simple state changes.
- Show partial map warnings if selected route geometry fails.
- Fix route-group/endpoint topology issues before relying on endpoint-based commute markers.
- Keep filters clearly scoped to list selection versus route-builder selection.

### Kayaking Detail UX

Kayaking should not simply reuse the hiking route-builder UI. Kayak routes are generally whole-trip candidates or open itineraries, not a chain of official trail sections.

Recommended first version:

- Header/facts:
  - Distance, time, difficulty, exposure, water zone.
  - Route type.
  - Research/map confidence.
- Map:
  - Draw route corridor.
  - Draw start/end/waypoint points.
  - Draw linked rentals, launches, parking, camping/service points.
  - Show clear "Approximate corridor, not for navigation" status when applicable.
- Safety block:
  - Exposure.
  - Crossings.
  - Wind/weather notes.
  - Navigation notes.
  - Seasonal restrictions.
- Access block:
  - Public transport.
  - Ferry.
  - Parking.
  - Launch notes.
- Rentals block:
  - Staffed rental.
  - Self-service rental.
  - Booking model.
  - Supports own kayak when known.
- Facilities block:
  - Rental centers.
  - Launch/parking.
  - Water/toilet/food/service.
  - Overnight/camping/harbor.
- Rules/protection block:
  - Protected areas.
  - No-landing/no-navigation/camping restrictions if present.
  - Fire-ban reminder.
- Sources/follow-up block:
  - Sources.
  - Needs follow-up.

Do not show a kayak route as planning-grade unless its `research.status` and `navigationUse` allow it.

## Workstream A: Foundation Validation And Data Contract

### Goal

Create a safe base for all future work. This should happen before the new UI or kayak import.

### Files To Own

- `src/types.ts`
- `scripts/validate-data.mjs`
- `scripts/lib/search-text.mjs` or similar
- `scripts/write-hike-data.mjs` initially, later `scripts/lib/write-public-data.mjs`
- `scripts/lib/write-trail-system-shards.mjs`
- `package.json`
- New docs under `docs/`

### Tasks

1. Add `data:validate`.
   - Read-only.
   - No generated file writes.
   - Exit non-zero on hard failures.

2. Validate current hiking data.
   - Unique top-level IDs.
   - Unique section IDs.
   - Unique facility IDs within section.
   - Existing detail paths.
   - Existing route paths.
   - Valid route group refs.
   - Valid preset refs.
   - Valid coordinate ranges.
   - Facility `sectionId` matches containing section.

3. Add topology/distance warnings from UI tests.
   - Adjacent route handoffs with same named place should be near each other.
   - Geometry length should not materially differ from declared distance without a known exception.
   - Initially warn for known existing mismatches; later tighten.

4. Define shared activity/index types.
   - Add `ActivityKind`, `LibraryItemKind`, and shared duration concepts.
   - Avoid breaking current runtime until consumers migrate.

5. Add normalized search helper.
   - Unicode normalize.
   - Strip combining marks.
   - Lowercase.
   - Normalize Swedish diacritics through decomposition.
   - Use for query and generated `normalizedSearchText`.

6. Define kayak validation rules.
   - Every kayak trip must have `activity: "kayaking"` and `itemType: "kayak-trip"`.
   - Every kayak route must have `geometryStatus`, `mapConfidence`, and `navigationUse`.
   - Any `navigationUse: "not-for-navigation"` route must show a warning in UI later.
   - Facility references must be actual known IDs.
   - Free-text facility notes must not live in `facilityRefs`.
   - Unknown future route IDs in facility records should be `candidateRouteIds`, not hard linked route IDs.

7. Define sharded trail-system validation rules.
   - Every large trail system has a runtime manifest.
   - Every large trail system has a sections index.
   - Every section listed in `sections-index.json` has a matching per-section detail file.
   - Route groups and presets reference section IDs from the sections index.
   - Section detail files do not duplicate large trail-system manifest fields.
   - The legacy all-in-one trail-system JSON is allowed only as a temporary compatibility artifact.

### Acceptance Criteria

- `npm run data:validate` exists and is read-only.
- It passes on the current snapshot or reports known warnings without blocking.
- It catches a missing route file, duplicate ID, and bad coordinate in controlled local tests.
- The plan for generic `library-index.json` is documented before code switches to it.
- The sharded trail-system contract is documented before the app stops reading legacy all-in-one trail-system details.

## Workstream B: Map Engine And Route Loading Refactor

### Goal

Fix the current P1/P2 map issues and make the map reusable for hiking overview, hiking details, and kayaking.

### Files To Own

- `src/map/routeGeometry.ts`
- `src/map/useRouteGeometries.ts`
- `src/map/useLeafletMap.ts`
- `src/map/overviewLayers.ts`
- `src/map/routeLayers.ts`
- `src/map/facilityLayers.ts`
- Existing map components extracted from `src/main.tsx`

### Tasks

1. Add route geometry cache.
   - Cache by path.
   - Deduplicate concurrent requests.
   - Do not retry endlessly on failure.
   - Expose error state per path.

2. Support both detail and overview geometry.
   - Exact hiking route section GeoJSON.
   - Hiking overview FeatureCollection.
   - Kayak approximate corridor GeoJSON.

3. Replace `Promise.all` all-or-nothing route fetches.
   - Use per-route result handling.
   - Selected route failure must not blank facilities and markers.
   - Background/overview route failure must not blank selected route.

4. Split Leaflet map creation from layer updates.
   - Create base map once.
   - Add/remove/update layer groups.
   - Facility toggles update marker layers only.
   - Preset changes update selected route layers only.
   - Trail switching reuses cached geometry where possible.

5. Fix Leaflet cleanup.
   - Stop transitions/listeners before removal.
   - Guard async layer updates after unmount.
   - Avoid updating a removed map instance.

6. Delay below-fold mobile map work.
   - Use IntersectionObserver or a user-triggered map reveal.
   - Ensure overview map remains available as a primary screen when it is the main content.

7. Reduce keyboard tab noise.
   - Leaflet marker/path focus should be deliberate, not accidental.
   - If markers are focusable, labels must be meaningful.
   - Off-route/alert markers cannot be named only `!`.

### Acceptance Criteria

- Facility chip toggles generate zero route GeoJSON refetches.
- Repeated preset changes reuse cached route geometry.
- Switching between hiking trail systems reuses cached route/detail data where appropriate.
- Missing one unrelated route file does not blank selected route/facility overlays.
- Leaflet `_leaflet_pos` runtime exception is no longer reproducible.
- Mobile first load does not render below-fold map work unless the map is visible or intentionally shown.

## Workstream C: Overview Map Feature

### Goal

Add the unselected overview view for the active activity.

### Files To Own

- `src/components/ActivityOverview.tsx`
- `src/map/OverviewMap.tsx`
- `src/map/overviewLayers.ts`
- `scripts/lib/build-overview-geojson.mjs`
- Public overview data outputs.

### Tasks

1. Generate hiking overview geometry.
   - One feature per selectable library item.
   - For trail systems, use simplified combined route geometry.
   - For standalone hikes, use their route geometry when available.
   - Do not require loading every detailed route file at runtime.

2. Generate kayaking overview geometry.
   - Normalize `kayak-route-corridors.geojson` to app overview format.
   - Preserve `not-for-navigation`, `geometryStatus`, and `mapConfidence`.

3. Build `OverviewMap`.
   - Accept `activity`, overview features, hovered item ID, selected item callback.
   - Stable route colors.
   - Hover behavior: hovered route highlighted, all other routes gray.
   - Click behavior: select item.
   - Fit bounds to all active activity features.

4. Coordinate sidebar/list hover with map hover.
   - Hovering or focusing list item highlights route.
   - Hovering map route highlights list row if visible.

5. Add "Back to overview" from selected detail.
   - Clears selected item.
   - Keeps activity mode.
   - Keeps filters/search only if the user explicitly filtered from overview.

6. Handle dense maps cleanly.
   - Tooltips should be short.
   - Avoid permanent labels.
   - Use subdued base map styling and route colors with sufficient contrast.

### Acceptance Criteria

- On initial load or after clearing selection, an overview map appears.
- Hiking overview shows all hiking top-level items.
- Kayaking overview shows all imported kayak trips.
- Hovering one route grays out the rest.
- Clicking a route opens the correct existing or new detail interface.
- The overview map does not fetch all detail JSON files.

## Workstream D: Activity-Aware App Shell

### Goal

Introduce a clean top-level switch between hiking and kayaking.

### Files To Own

- `src/App.tsx` once split, or `src/main.tsx` during transition
- `src/components/ActivitySwitcher.tsx`
- `src/components/Sidebar.tsx`
- `src/hooks/useLibraryIndex.ts`
- `src/hooks/useSelectedItem.ts`
- `src/styles.css` or split CSS modules if introduced

### Tasks

1. Split current `App` state into hooks.
   - Library index loading.
   - Detail loading/cache.
   - Selection.
   - Filters.
   - Favorites.

2. Add `activity` state.
   - Default to hiking unless URL says otherwise.
   - Support future deep-link route.

3. Filter index by activity.
   - Sidebar count should be active-activity count.
   - Search applies within active activity.

4. Add clean activity switch UI.
   - Compact segmented control.
   - Accessible state.
   - Clear labels: Hiking, Kayaking.

5. Update empty/no-results behavior.
   - No results clears stale detail display.
   - Main panel shows no-results state.

6. Make filters activity-specific.
   - Hiking: location, distance, time.
   - Kayaking: region, water zone/exposure, difficulty, trip duration, rental support.

7. Define filter-versus-selection semantics.
   - If filters only affect the sidebar/list, make that visible in a compact way.
   - If filters should drive the selected route range, update route-builder state consistently.
   - Do not leave a selected route summary that appears to contradict active filters.

8. Keep UI restrained.
   - No landing page.
   - First screen should be a usable overview.
   - Avoid over-explaining controls in visible text.

### Acceptance Criteria

- User can switch between Hiking and Kayaking.
- Switching activity does not show stale details from the previous activity.
- Search input has an accessible name.
- ASCII search matches diacritic names.
- No-results state is coherent.
- The UI remains compact and does not feel like two separate apps.

## Workstream E: Kayak Data Import And Normalization

### Goal

Bring the preliminary kayak dataset into the project pipeline safely.

### Source Inputs

- `research/stockholm-kayak-archipelago-research/mapdata/kayak-map-ready.dataset.json`
- `research/stockholm-kayak-archipelago-research/mapdata/kayak-route-corridors.geojson`
- `research/stockholm-kayak-archipelago-research/mapdata/kayak-route-points.geojson`
- `research/stockholm-kayak-archipelago-research/mapdata/kayak-facilities.geojson`
- `research/stockholm-kayak-archipelago-research/mapdata/kayak-parking.geojson`
- `research/stockholm-kayak-archipelago-research/mapdata/map-readiness-audit.json`

### Files To Own

- `data/source/kayaking/**`
- `scripts/import-kayak-data.mjs`
- `scripts/lib/normalize-kayak.mjs`
- `scripts/lib/write-public-data.mjs`
- `public/data/kayak-trips/**`
- `public/data/kayak-facilities.json`
- `public/routes/kayaking/**`

### Tasks

1. Copy or import source data into project-owned source files.
   - Do not make the runtime depend on the external research workspace path.
   - Preserve original source path metadata in generated records.

2. Normalize route records.
   - Add `activity: "kayaking"`.
   - Add `itemType: "kayak-trip"`.
   - Normalize `recommendedTimes` to shared `TripDuration`.
   - Preserve `distanceKm: null` where unknown.
   - Normalize difficulty, route type, region, water zone, and archipelago region.
   - Convert mixed `sources` strings to structured `SourceRef`.
   - Convert route `map.lineString` into per-route GeoJSON files.
   - Set `navigationUse: "not-for-navigation"` for initial approximate corridors.

3. Normalize research status.
   - Convert existing seed `researchStatus` objects into app `research`.
   - For iteration-03 routes that lack `researchStatus`, derive:
     - route confidence from `confidence` where present.
     - facility confidence as `medium` unless evidence says otherwise.
     - status as `partially-researched`.
     - needs follow-up from `needsFollowup`.

4. Preserve named research corrections.
   - Keep Namdoskargarden/Bullero rule context.
   - Keep Langviksskar split-protection context.
   - Keep unknown Stockholm Kayak Trail distances unknown.
   - Keep Runmaro metadata contradiction.
   - Keep Grinda/Gallno day-trip versus 4-5-day contradiction.
   - Exclude or mark Kayakomat Nynashamn/Nickstabadet as unreliable until refreshed.

5. Normalize facilities.
   - Merge facility and parking records into a kayak facility store.
   - Preserve parking as a category/type rather than a separate unrelated model.
   - Deduplicate exact duplicate IDs.
   - Keep records with same coordinates but different semantics as separate if they represent different user decisions, such as rental center and parking.

6. Normalize facility references.
   - Create `facilityRefs` for known facility IDs only.
   - Create `rentalRefs` for known rental/self-service rental IDs only.
   - Move free-text service entries into `facilityNotes`.
   - For facility records pointing to future route IDs, store them in `candidateRouteIds`.

7. Generate public outputs.
   - `public/data/kayak-trips/<id>.json`
   - `public/data/kayak-facilities.json`
   - `public/routes/kayaking/<id>.geojson`
   - `public/data/overviews/kayaking.geojson`
   - Add kayak trips to `public/data/library-index.json`.

8. Validate.
   - All kayak trip detail paths exist.
   - All kayak route GeoJSON files exist.
   - All hard facility refs exist.
   - All coordinate pairs are valid.
   - All kayak route geometries have status/confidence/navigation metadata.
   - All `not-for-navigation` records include a UI warning message.

### Acceptance Criteria

- 34 kayak trips are represented in the generic index.
- 34 kayak route GeoJSON files or equivalent corridor features are available.
- 61 kayak facility records and 22 parking-category records are available or intentionally merged.
- Free-text facility notes are not treated as facility IDs.
- The kayak map-readiness caveats survive into generated app data.
- Validation passes with no hard failures.

## Workstream F: Kayak Trip UI

### Goal

Build a kayaking trip detail experience that reuses app infrastructure but respects kayaking-specific planning needs.

### Files To Own

- `src/components/kayaking/KayakTripDetails.tsx`
- `src/components/kayaking/KayakSafetyPanel.tsx`
- `src/components/kayaking/KayakAccessPanel.tsx`
- `src/components/kayaking/KayakFacilityList.tsx`
- `src/components/kayaking/KayakMapFilters.tsx`
- Shared detail components as needed.

### Tasks

1. Build kayak detail facts.
   - Distance, time, difficulty.
   - Exposure and water zone.
   - Route type.
   - Research/map confidence.

2. Build kayak map.
   - Route corridor.
   - Start/end/waypoints.
   - Linked rentals.
   - Launch/parking.
   - Camping/harbor/service points.
   - Facility filter chips with visible or discoverable labels.

3. Show map caveat.
   - If `navigationUse === "not-for-navigation"`, show "Approximate corridor" / "Not for navigation" status.
   - Do not bury this only in sources.

4. Build safety/access/rules panels.
   - Use accordions only where useful.
   - Add `aria-expanded` and `aria-controls`.
   - Keep text concise in default view; full source/follow-up can be lower down.

5. Build rental/facility display.
   - Staffed rental and self-service rental are kayak-specific.
   - Parking/launch carry matters.
   - Booking model matters.
   - Own-kayak support matters.

6. Preserve clean UI.
   - Do not show every field as a giant wall of text.
   - Use short facts and grouped sections.
   - Long protection rules can be collapsed by default.

### Acceptance Criteria

- Selecting a kayak trip opens a kayak-specific detail page.
- Rental centers are visible for routes that have them.
- Kayak-only facility categories do not appear in hiking mode.
- Approximate corridor warning is shown whenever applicable.
- Accessibility states are present for toggles/accordions.

## Workstream G: Existing UI Test Findings

### Goal

Address known usability, accessibility, performance, and data correctness issues from both UI test reports.

### P1/P2 Must-Fix Before Kayak Public Preview

1. Leaflet runtime exception during map remount/transition.
2. Trail-system maps fetch/draw every section route.
3. Missing route file blanks selected map overlays.
4. Facility toggles refetch route GeoJSON.
5. Preset changes generate massive request bursts.
6. Repeated trail-system switching causes uncached request bursts.
7. Adjacent stage endpoint topology is broken in multiple places.
8. Slow/corrupt index load shows empty filter state instead of load/error.
9. Corrupt/hung detail JSON strands app on loading.
10. Narrow desktop horizontal overflow around 901px-1099px.
11. Active filters can contradict the selected route summary.
12. Keyboard tab order is noisy around Leaflet markers.
13. Collapsible sections lack expanded state.
14. Search is not diacritic-insensitive.
15. Search box has no accessible name.
16. Mobile loads and renders map work below the fold.
17. Static assets and route data need caching strategy beyond local Vite preview behavior.
18. 200% text zoom causes overflow/clipped controls.
19. Print output clips route-builder content.
20. Declared distances differ materially from GeoJSON lengths for known sections.

### P3/P4 Should-Fix During Cleanup

1. Selected route is not URL/history-backed.
2. Non-array favorites storage becomes bogus IDs.
3. Unknown favorite IDs persist.
4. Very narrow widths below 320px overflow.
5. Several contrast combinations miss 4.5:1.
6. Section range changes create tile churn.
7. Reused facility name across types is ambiguous.
8. Touch targets are small.
9. Map filter chips are visually count-only.
10. Search focus indicator is subtle.
11. Missing favicon.

### Implementation Notes

- Route request issues belong in Workstream B.
- Loading/error states belong in Workstream D hooks.
- Topology/distance issues belong in Workstream A validation and Workstream H data correction.
- Filter contradiction belongs in Workstream D route/list state semantics.
- Accessibility state issues belong in all UI work, not one final polish pass.
- Responsive/text zoom/print issues need CSS work before adding new kayak panels, otherwise the new UI will inherit the same overflow pattern.
- Deployment/cache headers should be checked once the app is deployed; client-side route memoization is still required regardless of server headers.

### Acceptance Criteria

- Both old UI reports can be rerun or manually checked with no remaining P1/P2 regressions.
- New kayaking UI does not reintroduce map fetch bursts.
- New overview UI does not reintroduce Leaflet tab-order noise.

## Workstream H: Hiking Data Corrections

### Goal

Fix route correctness issues found during testing so the current hiking product remains trustworthy.

### Files To Own

- Route generation scripts after pipeline split.
- Source trail system records.
- `scripts/validate-data.mjs`.
- Generated route files only through generator commands.

### Tasks

1. Add route direction audit.
   - For adjacent stages in route groups, compare previous end to next start.
   - Also compare alternate pairings to detect reversed geometry.
   - Report likely reversed route files.

2. Normalize route geometry direction.
   - Ensure section geometry starts near `from` and ends near `to`.
   - Use named handoff points when available.
   - Do not rely blindly on raw GPX order.

3. Fix affected transitions.
   - Known examples include Roslagsleden stages 3-6 and Sormlandsleden early mainline transitions listed in round-2 testing.

4. Add distance audit.
   - Compare declared distance to measured GeoJSON length.
   - Known mismatches:
     - `sormlandsleden-stage-31-1`
     - `sormlandsleden-stage-34`
     - `sormlandsleden-stage-36`

5. Decide correction policy.
   - If geometry is wrong, fix geometry.
   - If declared official distance is right but approximate geometry is shorter, mark geometry as approximate or low confidence.
   - Do not silently overwrite official distances with measured geometry.

### Acceptance Criteria

- Known endpoint topology failures are fixed or documented with explicit exceptions.
- Known material distance mismatches are fixed or marked with map confidence/caveat.
- Validation catches future regressions.

## Workstream I: Deep Links And History

### Goal

Make selection shareable and robust as the catalog grows.

This is not required before the first kayak preview, but it becomes more valuable with two activities and overview maps.

Recommended URL shape:

```text
/
/hiking
/hiking/sormlandsleden
/hiking/sormlandsleden?start=sormlandsleden-stage-1&end=sormlandsleden-stage-2
/kayaking
/kayaking/langholmen-reimersholme-loop
```

Tasks:

- Add activity to URL.
- Add selected item to URL.
- Add route builder start/end for hiking trail systems.
- Preserve overview as `/hiking` or `/kayaking`.
- Browser Back should return from detail to overview where appropriate.

Acceptance criteria:

- Refresh preserves selected activity and selected item.
- Share link opens the same route/trip.
- Back/forward behaves predictably.

## Suggested Phase Order

### Phase 0: Preparation And Baseline

Purpose:

- Give future agents a safe starting point.

Tasks:

- Confirm clean/known git state before edits.
- Run existing build if allowed.
- Capture current request counts from UI reports as baseline.
- Add no-write `data:validate` first if not already present.

Exit criteria:

- Agents can run a safe validation command.
- Known issues are tracked as acceptance criteria.

### Phase 1: Data Contract And Validation

Purpose:

- Create shared model and validation guardrails.

Tasks:

- Add shared activity/index types.
- Add search normalization.
- Add validation script.
- Add topology and distance audits as warnings.
- Document source/generated data rules.

Exit criteria:

- Current hiking app still works.
- Validation passes or reports only known warnings.
- Search normalization logic is available for app and generator.

### Phase 1A: Source And Runtime Data Sharding

Purpose:

- Make both authored input data and runtime public data small, reviewable, and load-on-demand.

Tasks:

- Document source shards versus runtime shards versus compatibility aggregates.
- Add writer utilities for trail-system manifest, sections index, route groups, presets, and per-section detail files.
- Update validation for sharded trail-system outputs.
- Update generic index planning so trail systems use `manifestPath` and `sectionsIndexPath`.
- Keep legacy all-in-one trail-system JSON only as temporary compatibility output.

Exit criteria:

- Large trail systems can be represented without one many-thousand-line authored source file.
- Large trail systems can be consumed without downloading one many-thousand-line runtime detail JSON.
- Validation proves manifest/index/detail-shard referential integrity.

### Phase 2: Map Infrastructure Fix

Purpose:

- Fix the biggest performance/resilience bug before adding overview and kayak maps.

Tasks:

- Extract route geometry loader.
- Add cache/deduplication.
- Split Leaflet lifecycle and layer updates.
- Add per-route error handling.
- Stop route refetches on marker toggles/preset changes.
- Delay below-fold mobile map work.

Exit criteria:

- No route request burst on facility toggles.
- No route request burst on preset changes.
- Missing unrelated route file does not blank selected map.
- Leaflet runtime exception is not reproducible.

### Phase 3: Overview Map For Hiking

Purpose:

- Build the new unselected overview pattern with hiking first.

Tasks:

- Generate hiking overview geometry.
- Add `OverviewMap`.
- Add hover/focus/click behavior.
- Add clear-selection/back-to-overview behavior.
- Fix no-results stale detail state.

Exit criteria:

- Initial hiking view can show all top-level hiking items on one map.
- Hover grays other routes.
- Click opens existing route builder/details.

### Phase 4: Activity Switch Shell

Purpose:

- Introduce top-level activity structure before importing kayak runtime data.

Tasks:

- Add activity switch.
- Split filters by activity.
- Prepare generic `library-index.json`.
- Preserve current hiking behavior.

Exit criteria:

- Hiking mode works as before plus overview.
- Kayaking mode can show an empty/coming-data state without breaking app.
- UI remains clean.

### Phase 5: Kayak Data Import

Purpose:

- Normalize and generate app-ready kayak data.

Tasks:

- Import source data from research workspace into project source.
- Normalize 34 kayak trips.
- Normalize kayak facilities.
- Generate kayak detail JSON.
- Generate kayak route GeoJSON.
- Generate kayak overview GeoJSON.
- Add kayak trips to generic index.

Exit criteria:

- Validation passes.
- Kayaking overview draws all imported kayak corridors.
- No raw free-text facility notes are treated as facility IDs.

### Phase 6: Kayak Detail UI

Purpose:

- Build kayak-specific planning detail.

Tasks:

- Add `KayakTripDetails`.
- Add kayak map filters.
- Add safety/access/rental/rules panels.
- Add approximate-corridor warning.
- Add kayak-specific facility icons/categories.

Exit criteria:

- Clicking a kayak route opens a usable kayak detail view.
- Rental centers and launch/parking appear where linked.
- Safety/protection information is visible without clutter.

### Phase 7: Hiking Data Corrections

Purpose:

- Fix topology/distance issues found by testing.

Tasks:

- Normalize route geometry direction.
- Fix or mark known distance mismatches.
- Strengthen validation.

Exit criteria:

- Known topology/distance findings are resolved or explicitly marked.

### Phase 8: Responsive, Accessibility, Print, And Polish

Purpose:

- Close remaining UI test issues.

Tasks:

- Fix 901px-1099px overflow.
- Fix 200% text zoom overflow.
- Add print styles for route/trip details.
- Add missing ARIA states.
- Harden favorites storage.
- Improve contrast and touch targets.
- Add favicon.

Exit criteria:

- Re-run UI test scenarios with no P1/P2 failures.
- Keyboard and screen-reader state is coherent.
- Print route/trip details are not clipped.

### Phase 9: Optional Deep Linking

Purpose:

- Make the bigger app shareable and navigable.

Tasks:

- Add activity/item URLs.
- Add route-builder params.
- Preserve overview URLs.

Exit criteria:

- Refresh/share/back-forward work predictably.

## Parallel Agent Plan

Use these ownership boundaries to reduce conflicts.

### Agent 1: Validation And Data Contract

Owns:

- `src/types.ts`
- `scripts/validate-data.mjs`
- `scripts/lib/search-text.mjs`
- Data pipeline docs.

Avoids:

- Map component code.
- Kayak UI components.

Outputs:

- Safe validation command.
- Shared types.
- Search normalization helper.

### Agent 2: Map Cache And Leaflet Lifecycle

Owns:

- `src/map/**`
- Extracted map components.

Avoids:

- Data migration files.
- Kayak data normalization.

Outputs:

- Cached route loader.
- Stable Leaflet lifecycle.
- Layer update system.

### Agent 3: Overview Map

Owns:

- `src/components/ActivityOverview.tsx`
- `src/map/OverviewMap.tsx`
- Overview GeoJSON generation helpers.

Depends on:

- Agent 2 map cache/lifecycle.

Outputs:

- Hiking overview first.
- Later kayak overview integration.

### Agent 4: Activity Shell And State

Owns:

- `ActivitySwitcher`.
- App-level state hooks.
- Sidebar activity filtering.
- Loading/error/no-results states.

Avoids:

- Deep kayak details.
- Generator internals.

Outputs:

- Hiking/Kayaking switch.
- Coherent empty/loading/error states.

### Agent 5: Kayak Data Normalization

Owns:

- `data/source/kayaking/**`
- `scripts/import-kayak-data.mjs`
- `scripts/lib/normalize-kayak.mjs`
- Kayak generated outputs.

Avoids:

- React UI except type definitions.

Outputs:

- 34 normalized kayak trips.
- Kayak facilities.
- Kayak route/overview GeoJSON.

### Agent 6: Kayak UI

Owns:

- `src/components/kayaking/**`
- Kayak detail components.
- Kayak-specific facility icons/filters.

Depends on:

- Agent 4 activity shell.
- Agent 5 normalized data.
- Agent 2 map infrastructure.

Outputs:

- Kayak trip detail UI.

### Agent 7: UI Test Issue Cleanup

Owns:

- CSS/responsive/print fixes.
- Accessibility attributes.
- Favorites storage hardening.
- Favicon.

Coordinates with:

- Agent 4 for search/loading states.
- Agent 2 for map focus/touch behavior.

Outputs:

- P2/P3 UI test issue closure.

### Agent 8: Hiking Data Corrections

Owns:

- Route direction/distance audit.
- Hiking source/generator fixes.
- Known topology/distance issue resolution.

Avoids:

- Kayak import and UI.

Outputs:

- Corrected or explicitly marked hiking route geometry issues.

## Cross-Cutting Acceptance Criteria

Performance:

- Initial activity overview does not load every detail file.
- Selecting a large trail system does not load a legacy all-in-one trail-system JSON.
- Route builder initialization uses a sections index, not every section detail shard.
- Detail maps load selected/needed geometry first.
- Route geometry is cached by path.
- Facility filter toggles do not fetch route geometry.
- Preset changes do not fetch unchanged route geometry.

Resilience:

- Index load has loading, error, and retry states.
- Detail load has loading, error, and retry states.
- One failed route file does not blank unrelated map layers.
- Corrupt localStorage favorites are discarded.

Accessibility:

- Search input has an accessible name.
- Activity switch exposes selected state.
- Accordions expose expanded/collapsed state.
- Toggle chips expose pressed state.
- Map does not create an excessive tab order.
- Touch targets are increased or have larger hit areas.

Data correctness:

- Validation catches broken detail paths, route paths, coordinates, route-group refs, and facility refs.
- Validation catches missing trail-system manifests, sections indexes, and per-section detail shards.
- Hiking endpoint topology and distance mismatches are audited.
- Kayak approximate corridors are never presented as navigable tracks.
- Kayak facility links are ID-based; free-text service notes are separate.

UX:

- Top-level Hiking/Kayaking switch is visible but compact.
- No selected item shows overview map, not a blank page.
- Hovering an overview route grays all others.
- Clicking an overview route opens the correct planning interface.
- Kayak rental centers and launch/parking are visible only in kayaking mode.
- UI remains clean and avoids showing every raw research field by default.

## Data Processing Checklist For Kayaking

Before importing kayak data into the app:

- [ ] Snapshot the external research inputs into project-owned source files.
- [ ] Normalize all 34 routes to `activity: "kayaking"` and `itemType: "kayak-trip"`.
- [ ] Normalize `recommendedTimes`.
- [ ] Normalize missing iteration-03 `researchStatus`.
- [ ] Preserve named kayak research corrections and contradictions.
- [ ] Preserve `distanceKm: null` for unknown distances and make filters handle unknowns.
- [ ] Normalize source strings to source objects.
- [ ] Split `facilityRefs`, `rentalRefs`, and `facilityNotes`.
- [ ] Move future route links to `candidateRouteIds`.
- [ ] Generate per-route kayak GeoJSON or a route geometry lookup.
- [ ] Generate kayak overview GeoJSON.
- [ ] Generate kayak detail JSON.
- [ ] Generate kayak facilities JSON.
- [ ] Validate all hard references.
- [ ] Preserve `not-for-navigation` caveats.

## Data Processing Checklist For Hiking

Before relying on new overview and route-builder improvements:

- [ ] Split large source trail systems into manifest, route groups, presets, and per-section source files.
- [ ] Generate runtime trail-system manifest, sections index, route groups, presets, and per-section detail shards.
- [ ] Generate hiking overview GeoJSON without loading all detail routes at runtime.
- [ ] Update library index trail-system records to point at manifest and sections index paths.
- [ ] Audit adjacent stage endpoint topology.
- [ ] Fix reversed geometry or endpoint derivation where confirmed.
- [ ] Audit declared distance versus geometry length.
- [ ] Mark approximate/low-confidence route geometry where exact correction is not available.
- [ ] Keep source/generated boundaries documented.
- [ ] Ensure validation is read-only and safe for parallel agents.

## UI Testing Checklist

Run after Phase 2 and again after kayak integration:

- [ ] Facility toggles do not refetch route GeoJSON.
- [ ] Preset changes do not refetch unchanged route GeoJSON.
- [ ] Trail/activity switching does not create request bursts.
- [ ] Selecting Sormlandsleden does not fetch a legacy all-in-one trail-system JSON after sharded loading is enabled.
- [ ] Entering the trail-system route builder does not fetch every section detail shard.
- [ ] Missing route file still shows available markers/facilities.
- [ ] Leaflet runtime exception is not reproduced.
- [ ] No-results search does not show stale details.
- [ ] Corrupt index JSON shows error/retry.
- [ ] Corrupt detail JSON shows error/retry.
- [ ] `sormlandsleden`, `mellsjon`, and `nynashamn` search successfully.
- [ ] Search input has accessible name.
- [ ] Activity switch is keyboard accessible.
- [ ] Overview map hover grays other routes.
- [ ] Overview map click opens correct detail.
- [ ] Mobile does not load below-fold map work unnecessarily.
- [ ] 901px-1099px layouts do not overflow.
- [ ] 200% text zoom does not clip controls.
- [ ] Print output does not clip route/trip content.
- [ ] Favorites storage rejects non-array JSON.
- [ ] Unknown favorite IDs are cleaned or ignored.

## Risks And Mitigations

Risk: Kayak corridors look like exact routes.

- Mitigation: Store and display `navigationUse: "not-for-navigation"` and `geometryStatus: "approximate-waypoint-corridor"`.
- Mitigation: Use slightly different line styling for approximate corridors, such as dashed or softer lines.

Risk: The top-level switch makes the UI feel heavier.

- Mitigation: Use a compact segmented control and keep mode-specific filters concise.
- Mitigation: Show overview map as the main content rather than a marketing/landing page.

Risk: Data migration causes large conflicts.

- Mitigation: Add validation first.
- Mitigation: Split source data by activity and trail/trip.
- Mitigation: Do Roslagsleden/hiking source split separately from kayak import.

Risk: Overview maps reintroduce performance issues.

- Mitigation: Use generated lightweight overview GeoJSON.
- Mitigation: Do not fetch detail JSON or every route file for overview.
- Mitigation: Keep overview layer separate from detail layers.

Risk: Kayak facilities become cluttered.

- Mitigation: Default map filters should show key categories only.
- Mitigation: Rental/launch/parking should be visible; secondary service categories can be toggled.
- Mitigation: Use grouped facility lists and compact map legends.

Risk: Search/filter semantics become confusing.

- Mitigation: Scope filters to active activity.
- Mitigation: Clear selection when filters produce no matches.
- Mitigation: Keep route-builder range selection independent from list filters, but label the relationship clearly.

## Recommended Milestone Plan

### Milestone 1: Stable Hiking Foundation

Includes:

- Validation.
- Source/runtime sharding contract.
- Search normalization.
- Loading/error states.
- Route geometry cache.
- Leaflet lifecycle fix.
- No-results fix.
- Responsive overflow fix.

Success:

- Current hiking app is more stable than today.
- Large trail systems have a path away from all-in-one authored and runtime JSON files.
- No new kayak feature is visible yet.

### Milestone 2: Hiking Overview

Includes:

- Hiking overview GeoJSON.
- Overview map.
- Hover/click behavior.
- Back-to-overview.

Success:

- User can browse all hiking top-level items from a map before selecting.

### Milestone 3: Activity Shell

Includes:

- Hiking/Kayaking switch.
- Generic index loading.
- Activity-specific filter framework.
- Empty kayaking mode placeholder if data is not imported yet.

Success:

- App architecture is ready for kayak data without degrading hiking.

### Milestone 4: Kayak Data Preview

Includes:

- Normalized 34 kayak trips.
- Kayak overview map.
- Kayak facility data.
- Not-for-navigation caveats.

Success:

- User can browse kayak routes on overview map.

### Milestone 5: Kayak Details

Includes:

- Kayak trip detail page.
- Safety/access/rental/facility/rules panels.
- Kayak map filters.

Success:

- User can evaluate a kayak trip without hiking-specific UI clutter.

### Milestone 6: Data Correctness And Polish

Includes:

- Hiking topology fixes.
- Distance mismatch handling.
- Print/text zoom/contrast/touch target polish.
- Optional deep links.

Success:

- App is ready for more trail and kayak data at scale.

## Final Review Notes

This plan intentionally puts infrastructure before visible kayak UI. That is the best approach because the current test reports show that map lifecycle, route fetching, and loading/error states are already stressed with only two hiking trail systems. Adding 34 kayak corridors and facility layers before fixing that foundation would multiply the problems.

The kayak data should be treated as high-value research, not final navigation data. The strongest near-term product value is discovery and planning context: route ideas, relative difficulty/exposure, launch/rental/service options, and rules/caveats. Exact navigation should wait for verified GPX/chart-grade linework.

The overview map is not separate from the refactor; it is a forcing function for the correct architecture. A lightweight generated overview layer lets the app browse many routes without loading every detail payload, and the same map-layer foundation then supports hiking details and kayaking details.
