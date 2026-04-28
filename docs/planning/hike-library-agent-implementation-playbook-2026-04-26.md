# Agent Implementation Playbook

Date: 2026-04-26

Workspace target: `/Users/joakim/Documents/New project`

Primary strategy document: `docs/planning/hike-library-development-plan-hiking-kayaking-overview-2026-04-26.md`

This playbook is the agent execution guide. It turns the development plan into concrete implementation steps with definitions of done and tests.

## Document Review

The development plan mostly holds as a standalone strategy document. It includes:

- Product direction.
- Architecture decisions.
- Kayak data assessment.
- Target data model.
- Target public data layout.
- Workstreams.
- Parallel agent boundaries.
- Cross-cutting acceptance criteria.
- Data-processing and UI-testing checklists.

For agents starting implementation, this playbook should be read first. The development plan remains the source of rationale and context.

Required reference documents:

- `docs/planning/hike-library-development-plan-hiking-kayaking-overview-2026-04-26.md`
  - Use for overall product and architecture direction.

- `docs/planning/hike-library-refactor-plan-map-loading-data-pipeline-2026-04-26.md`
  - Use for the original map-loading and data-pipeline reasoning.

- `docs/test-reports/hike-ui-test-report-2026-04-26.md`
  - Use for first-pass UI bugs and reproduction details.

- `docs/test-reports/hike-ui-test-report-round-2-2026-04-26.md`
  - Use for performance, topology, loading/error, search, text zoom, print, and data issues.

- `research/stockholm-kayak-archipelago-research/mapdata/map-readiness-audit.md`
  - Use for kayak map-readiness caveats and counts.

- `research/stockholm-kayak-archipelago-research/mapdata/kayak-map-ready.dataset.json`
  - Use as the first kayak import source, copied into the app repo before runtime use.

Agents do not need to read every raw kayak agent finding before starting. They must preserve the named corrections captured in the development plan and this playbook.

Current workspace note from a read-only recheck on 2026-04-28:

- Sormlandsleden has grown to about 69,700 lines in the current public all-in-one detail JSON. This makes Phase 1A source/runtime sharding more urgent, but it does not change the recommended architecture.
- `data/research/candidate-trails/` now contains research-only candidate inputs for Upplandsleden, Vikingaleden, and Stockholm Archipelago Trail. Agents should not auto-import those files into app runtime data. If a future task scopes them for integration, first convert them into the sharded source/runtime contract and run validation.
- The current workspace still has no `data/source/`, `public/data/overviews/`, or sharded `public/data/trail-systems/<id>/...` runtime files. Do not assume the refactor has already started.

## Non-Negotiable Constraints

- Do not make the runtime app depend on `research/stockholm-kayak-archipelago-research/...`.
- Do not make the runtime app depend directly on `data/research/candidate-trails/...`; those are research/candidate inputs until explicitly normalized.
- Do not import kayak corridors as navigable tracks. They are approximate and `not-for-navigation`.
- Do not add kayak UI before route caching and Leaflet lifecycle fixes are in place.
- Do not edit generated public data by hand once generator ownership exists.
- Do not make route overview load every route detail file.
- Do not introduce new many-thousand-line authored JSON files.
- Do not make large trail systems depend on one many-thousand-line runtime detail JSON.
- Do shard large trail-system source and runtime data into manifests, indexes, and per-section files.
- Do not leave active filters showing a route summary that appears contradictory.
- Do not hide loading/error failures behind "No routes match" or endless "Loading".

## Recommended Branch And PR Slices

Use small PRs. Each PR should have one clear owner and should avoid unrelated churn.

Suggested PR order:

1. Validation and data-contract foundation.
2. Source and runtime data sharding contract.
3. Search normalization and loading/error state fixes.
4. Route geometry cache and Leaflet lifecycle refactor.
5. Hiking overview map.
6. Activity switch and generic library index.
7. Kayak source import and normalization.
8. Kayak overview integration.
9. Kayak trip details.
10. Hiking route topology/distance corrections.
11. Responsive, accessibility, print, favorites, and polish.
12. Optional deep links.

## Phase 0: Workspace Baseline

### Goal

Start safely and make sure agents do not overwrite parallel work.

### Steps

1. Check status.
   - Run `git status --short --branch`.
   - Note existing untracked or modified files.
   - Do not revert anything.

2. Install/check dependencies only if needed.
   - If `node_modules` exists, avoid reinstalling.
   - If dependencies are missing, use the repo's lockfile with `npm install`.

3. Run current baseline commands if safe.
   - `npm run build`
   - If build fails before changes, record the failure and continue only with fixes relevant to your assigned scope.

4. Start a local server only for UI verification.
   - `npm run dev -- --host 127.0.0.1`
   - Or `npm run preview -- --host 127.0.0.1` after a build.

### Definition Of Done

- Agent knows the current workspace state.
- Baseline build status is known.
- No unrelated files were changed.

### Tests

- `git status --short --branch`
- `npm run build`, if safe and dependencies are present.

## Phase 1: Validation And Shared Data Contract

### Goal

Add a read-only safety net before moving data or adding kayaking.

### Primary Files

- `scripts/validate-data.mjs`
- `package.json`
- `src/types.ts`
- Optional: `scripts/lib/search-text.mjs`
- Optional: `docs/data-pipeline.md`

### Implementation Steps

1. Add `scripts/validate-data.mjs`.
   - It must read current `data/` and `public/data/`.
   - It must not write files.
   - It must exit `0` when only known warnings exist.
   - It must exit non-zero for hard failures.

2. Add package scripts.
   - `data:validate`: `node scripts/validate-data.mjs`
   - `typecheck`: `tsc --noEmit`

3. Validate current hiking data.
   - Unique trail-system IDs.
   - Unique section IDs within a system.
   - Unique facility IDs within a section.
   - Public index detail paths exist.
   - `route.geojsonPath` exists when route status is `ready`.
   - Route groups reference known sections.
   - Presets reference known sections.
   - Coordinates are valid `[lat, lon]` pairs for app data and `[lon, lat]` for GeoJSON.
   - Facility `sectionId` matches the containing section.

4. Add warning-level route audits.
   - Adjacent stage endpoint gap audit.
   - Geometry length versus declared distance audit.
   - Start as warnings because current data has known issues.

5. Add kayak validation scaffolding.
   - It may be inactive until kayak data exists.
   - It should validate:
     - `activity: "kayaking"`.
     - `itemType: "kayak-trip"`.
     - `navigationUse`.
     - `geometryStatus`.
     - `mapConfidence`.
     - `facilityRefs` and `rentalRefs` are known IDs.
     - `facilityNotes` can contain free text.

6. Add shared domain types in `src/types.ts`.
   - `ActivityKind`.
   - `LibraryItemKind`.
   - `TripDuration`.
   - `GeometryStatus`.
   - `NavigationUse`.
   - `ResearchConfidence`.
   - New generic index type while preserving existing exports.

7. Add search normalization helper.
   - Unicode NFD normalization.
   - Strip combining marks.
   - Lowercase.
   - Trim repeated whitespace.

### Definition Of Done

- `npm run data:validate` exists and is read-only.
- `npm run typecheck` exists.
- Current data passes validation or reports only known warnings.
- A deliberately broken local route path causes validation failure.
- A deliberately duplicate section ID causes validation failure.
- A deliberately invalid coordinate causes validation failure.
- Shared types compile without breaking the current app.

### Tests

Automated:

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

Manual/local negative tests:

- Temporarily break a route path and confirm `data:validate` fails.
- Temporarily duplicate a section ID and confirm `data:validate` fails.
- Temporarily set a coordinate to `[999, 999]` and confirm `data:validate` fails.
- Revert all deliberate local test edits.

## Phase 1A: Source And Runtime Data Sharding

### Goal

Change the planned data contract so large authored datasets and large runtime payloads are split into small, reviewable, load-on-demand files.

This phase can start as documentation and writer utilities before the app consumes the shards.

### Primary Files

- `docs/data-pipeline.md`
- `scripts/lib/write-trail-system-shards.mjs`
- `scripts/lib/read-source-tree.mjs`
- `scripts/lib/write-public-data.mjs`
- `scripts/validate-data.mjs`
- `src/types.ts`

### Source Data Target

Large trail-system source data should look like:

```text
data/source/trail-systems/<trail-system-id>/
  manifest.json
  sections/
    <section-id>.json
  route-groups.json
  presets.json
  facilities.json
  research-overlays/
    <section-id>.json
```

Kayak source data should look like:

```text
data/source/kayaking/
  trips/
    <trip-id>.json
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

### Runtime Data Target

Large trail-system runtime data should look like:

```text
public/data/trail-systems/<trail-system-id>/
  manifest.json
  sections-index.json
  route-groups.json
  presets.json
  sections/
    <section-id>.json
```

Runtime loading rules:

- Startup loads `library-index.json` and the active activity overview only.
- Selecting a large trail system loads manifest, sections index, route groups, and presets.
- The route builder uses `sections-index.json`, not full section details.
- The info view fetches only selected/context section detail files.
- The map fetches selected/context route geometry through the route cache.
- Legacy `public/data/trail-systems/<id>.json` may exist only as temporary compatibility output.

### Implementation Steps

1. Document source and runtime ownership.
   - Which files are authored.
   - Which files are generated.
   - Which files are compatibility artifacts.
   - Which commands write them.

2. Define TypeScript shapes.
   - `TrailSystemManifest`.
   - `TrailSectionIndexItem`.
   - `TrailSectionDetail`.
   - `TrailSystemRuntimeBundle` if useful for loaded in-memory composition.

3. Add shard writer.
   - Accept existing `TrailSystem` objects initially.
   - Write manifest, sections index, route groups, presets, and section detail files.
   - Keep output deterministic.

4. Add validation for shards.
   - Manifest exists.
   - Sections index exists.
   - Every section index item has a detail file.
   - Every detail file has matching ID.
   - Route groups and presets reference known section IDs.
   - No section detail duplicates full manifest-level data.

5. Add compatibility strategy.
   - Continue writing existing all-in-one trail-system JSON until consumers migrate.
   - Mark it as generated compatibility data in docs.
   - Do not have new runtime code depend on it.

6. Add size/reviewability guidance.
   - Source section/trip files can be research-rich.
   - Shared source files should be split if they become hard to review.
   - Runtime files should be purpose-specific rather than "everything for everything".

### Definition Of Done

- Data pipeline docs explicitly distinguish source shards, runtime shards, and compatibility aggregates.
- A shard writer can produce trail-system manifest, sections index, route groups, presets, and per-section detail files.
- Validation checks shard referential integrity.
- The generic library index can point to `manifestPath` and `sectionsIndexPath` for trail systems.
- No new feature in the plan depends on loading a many-thousand-line trail-system runtime JSON.

### Tests

Automated/data:

- `npm run data:validate`
- Test missing section detail file fails validation.
- Test route group referencing missing section fails validation.
- Test preset referencing missing section fails validation.
- Test manifest/sections-index/detail IDs agree.
- Test legacy all-in-one trail-system JSON is not required by the new validation path once shards exist.

Commands:

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

## Phase 2: Search, Loading, Error, And Selection State

### Goal

Fix app-state issues before adding activity switching.

### Primary Files

- `src/main.tsx`, or extracted `src/hooks/useLibraryIndex.ts`
- `src/hooks/useLibraryDetail.ts`
- `src/components/Sidebar.tsx`
- `src/components/LoadingState.tsx`
- `src/components/ErrorState.tsx`
- `src/utils/search.ts`

### Implementation Steps

1. Extract index loading state.
   - Represent `idle`, `loading`, `ready`, `error`.
   - A corrupt or slow index must not show `0 of 0 routes` as if it were valid data.

2. Extract detail loading state.
   - Represent `idle`, `loading`, `ready`, `error`.
   - A corrupt or hung detail request must show retry/error, not endless loading.

3. Add request timeout or abort support.
   - Use `AbortController`.
   - Clean up on selection change.
   - Avoid state updates after unmount.

4. Fix no-results behavior.
   - When filters produce no visible items, do not show stale previous detail as if it matches.
   - Show a no-results main state.
   - Offer clear search/filters action.

5. Fix active filter versus route summary semantics.
   - Decide one:
     - List filters only affect browse list, and selected route builder is independent.
     - Or distance/time filters also drive the initial route-builder range.
   - Recommended: list filters drive initial selection, then route builder is independent and visibly "Selected route" rather than "filter result".

6. Add accent-insensitive search.
   - Normalize query.
   - Normalize generated search corpus.
   - Support existing `searchText` until `normalizedSearchText` is generated everywhere.

7. Add accessible search name.
   - Use `aria-label="Search routes"` or a visually hidden label.
   - Do not rely on placeholder text.

8. Harden favorites storage.
   - If stored JSON is not an array, discard it.
   - If entries are not strings, discard them.
   - Unknown IDs should be ignored and cleaned on next write.
   - Favorites should be scoped safely once activity is added.

### Definition Of Done

- Slow index load shows loading.
- Corrupt index JSON shows error and retry.
- Corrupt detail JSON shows error and retry.
- No-results search clears stale details.
- ASCII queries match Swedish names with diacritics.
- Search input has an accessible name.
- Bad localStorage favorite values do not become bogus IDs.

### Tests

Automated:

- Unit test `normalizeSearchText("Sörmlandsleden Mellsjön Nynäshamn")`.
- Unit test favorites parser with:
  - valid array.
  - JSON string.
  - object.
  - number.
  - array with non-strings.

Browser tests:

- Intercept `/data/hikes-index.json` with invalid JSON. Expect error state.
- Intercept detail JSON with invalid JSON. Expect error state.
- Search `sormlandsleden`, `mellsjon`, `nynashamn`. Expect matching results.
- Search `zzzz-no-route`. Expect no-results main panel.
- Inspect accessibility tree for searchbox name.

Commands:

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

## Phase 3: Route Geometry Cache

### Goal

Stop repeated route fetches and make route loading reusable for overview, hiking details, and kayaking.

### Primary Files

- `src/map/routeGeometry.ts`
- `src/map/useRouteGeometries.ts`
- `src/map/types.ts`

### Implementation Steps

1. Create route geometry loader.
   - `loadRouteGeometry(path, metadata?)`.
   - Cache successful promises by path.
   - Deduplicate concurrent loads.
   - Track failed paths with retry support.

2. Normalize GeoJSON.
   - Accept FeatureCollection, Feature, LineString, MultiLineString.
   - Return FeatureCollection.
   - Preserve route metadata where provided.

3. Add per-path result shape.
   - `status: "pending" | "ready" | "error"`.
   - `path`.
   - `geojson`.
   - `error`.

4. Add hook for React.
   - Accept `primaryPaths`.
   - Accept `backgroundPaths`.
   - Load primary first.
   - Load background only when requested.
   - Do not throw for one failed path.

5. Add cache clearing only for tests/dev.
   - Do not clear cache on normal activity switch.

### Definition Of Done

- Repeated calls for the same path issue one network request.
- Concurrent calls for the same path share a promise.
- A failed unrelated path does not fail selected route rendering.
- The loader can handle current hiking route GeoJSON and future kayak corridor GeoJSON.

### Tests

Unit tests:

- Same path loaded twice returns cached result.
- Concurrent same-path calls make one fetch.
- Failed path returns error result.
- Feature, FeatureCollection, and LineString normalize to FeatureCollection.

Browser/performance tests:

- Toggle a facility chip 12 times. Route GeoJSON request count should not increase after initial load.
- Change Roslagsleden section range 5 times. Already loaded route files should not refetch.

Commands:

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

## Phase 4: Leaflet Lifecycle And Layer Refactor

### Goal

Fix Leaflet remount exceptions, layer churn, tile churn, and marker-filter refetches.

### Primary Files

- `src/map/useLeafletMap.ts`
- `src/map/routeLayers.ts`
- `src/map/facilityLayers.ts`
- `src/map/markerLayers.ts`
- Extracted `RouteMap.tsx`
- Extracted `TrailSystemMap.tsx`

### Implementation Steps

1. Extract map creation.
   - Create Leaflet map once per map component mount.
   - Add base tile layer once.
   - Add zoom control once.
   - Disable `keyboard` on map unless a deliberate keyboard map mode is built.

2. Add named layer groups.
   - `selectedRoutesLayer`.
   - `backgroundRoutesLayer`.
   - `facilityMarkersLayer`.
   - `commuteMarkersLayer`.
   - `endpointMarkersLayer`.

3. Update layers without recreating map.
   - Changing facility filter updates only facility marker group.
   - Changing selected route updates route and endpoint groups.
   - Changing detail item updates relevant groups but reuses cached geometry.

4. Guard async updates.
   - Track mounted map instance.
   - Do not add layers after cleanup.
   - Cancel or ignore stale async results.

5. Clean up safely.
   - Stop transitions/listeners where possible.
   - Remove layer groups before map removal.
   - Avoid updating removed map instance.

6. Handle per-route errors.
   - Failed selected route: show map warning and remaining markers.
   - Failed background route: omit background route and log/status quietly.

7. Reduce marker focus noise.
   - Decorative map markers should not be tab stops.
   - Focusable markers need descriptive labels.
   - Off-route markers need descriptive labels, not `!`.

### Definition Of Done

- Leaflet `_leaflet_pos` error is not reproducible.
- Facility toggles do not recreate the whole map.
- Facility toggles do not refetch route geometry.
- Preset changes do not recreate the whole map.
- Missing unrelated route file does not blank selected overlays.
- Keyboard tab order is manageable.

### Tests

Browser tests:

- Reproduce old Leaflet transition flow: switch trail systems, change distance filters, enter/exit detail view. Expect no uncaught exceptions.
- Toggle non-zero facility chip 12 times. Expect zero route refetches after initial load.
- Change Sormlandsleden presets 5 times. Expect no repeated fetches for unchanged route paths.
- Intercept one unrelated route as 404. Selected route still renders if its file exists.
- Intercept selected route as 404. Facilities/commute markers still render and map status shows route-load warning.
- Tab through page. Map markers do not create a long noisy focus path.

Commands:

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

## Phase 5: Mobile Map Deferral

### Goal

Stop expensive below-fold map work on mobile while keeping overview maps immediate when they are the main content.

### Primary Files

- `src/hooks/useNearViewport.ts`
- Map wrapper components.
- CSS for mobile layout.

### Implementation Steps

1. Add viewport observer hook.
   - Use `IntersectionObserver`.
   - Fallback to immediate render if unsupported.

2. Apply only to detail maps below the fold.
   - Do not defer overview map when it is the main screen.
   - Do defer route-builder/detail maps that appear far below mobile viewport.

3. Add placeholder.
   - Use stable dimensions.
   - Provide a "Show map" button if manual reveal is better.

4. Ensure layout does not shift badly.
   - Reserve map height.
   - Keep route controls usable.

### Definition Of Done

- Mobile initial load does not fetch tiles/routes for below-fold detail map until near-visible or explicitly shown.
- Overview map still renders as primary content.
- No layout jump when map initializes.

### Tests

Browser tests:

- 390x844 mobile initial route-builder load: no below-fold route/tile burst before scroll.
- Scroll near map: route/tile load begins.
- Activity overview on mobile: overview map renders immediately.

Commands:

- `npm run build`

## Phase 6: Hiking Overview Map

### Goal

Add the unselected overview map for hiking before adding kayaking.

### Primary Files

- `scripts/lib/build-overview-geojson.mjs`
- `public/data/overviews/hiking.geojson`
- `src/map/OverviewMap.tsx`
- `src/components/ActivityOverview.tsx`
- `src/components/Sidebar.tsx`

### Implementation Steps

1. Generate hiking overview GeoJSON.
   - One feature per top-level selectable item.
   - For trail systems, create simplified combined feature or representative route group geometry.
   - For standalone hikes, use route geometry if available.
   - Feature properties must include item ID, activity, item type, name, detail path, distance/time/difficulty, geometry status.

2. Add overview data to index.
   - Either global overview path per activity or per-item overview feature ID.
   - Do not fetch detail JSON to draw overview.

3. Build `OverviewMap`.
   - Fit bounds to all features.
   - Stable distinct route colors.
   - Hover/focus route: highlight it, gray others.
   - Click route: select item.
   - Tooltip: name, distance/time, difficulty.

4. Connect sidebar and map.
   - Hover/focus sidebar item highlights map route.
   - Map hover can highlight matching sidebar item if visible.

5. Add clear selection.
   - Initial state should be no selected item and overview visible.
   - "Back to overview" clears selected item.

### Definition Of Done

- Initial hiking mode shows overview map.
- Overview map draws all hiking top-level items.
- Hovering one route grays all other routes.
- Clicking a route opens existing hiking detail/route-builder interface.
- Overview does not fetch all detail files or all section route files.

### Tests

Automated/data:

- `data:validate` confirms overview feature item IDs match index item IDs.
- Overview GeoJSON parses and has valid coordinates.

Browser:

- Load app. Overview is visible before selection.
- Hover route. Other route paths become gray.
- Click Sormlandsleden route. Route builder opens.
- Back to overview returns to overview map.
- Network panel confirms no detail JSON is fetched until selection.

Commands:

- `npm run data:validate`
- `npm run build`

## Phase 7: Activity Switch And Generic Library Index

### Goal

Introduce top-level Hiking/Kayaking activity structure while preserving hiking behavior.

### Primary Files

- `src/components/ActivitySwitcher.tsx`
- `src/hooks/useLibraryIndex.ts`
- `src/hooks/useLibraryDetail.ts`
- `src/components/Sidebar.tsx`
- `scripts/lib/write-public-data.mjs`
- `public/data/library-index.json`

### Implementation Steps

1. Generate generic `library-index.json`.
   - Include existing hiking items with `activity: "hiking"`.
   - For standalone hikes, use `detailPath`.
   - For trail systems, use `manifestPath`, `sectionsIndexPath`, `routeGroupsPath`, and `presetsPath`.
   - Do not point new trail-system index records at legacy all-in-one detail JSON.
   - Keep `hikes-index.json` during compatibility window.

2. Update app loader.
   - Prefer `library-index.json`.
   - Fallback to `hikes-index.json` only during transition if needed.
   - For trail-system selection, load the sharded manifest/index bundle.
   - For standalone hike selection, load the standalone detail file.

3. Add activity state.
   - Default `hiking`.
   - Switching activity clears selected item and shows that activity's overview.
   - Favorites display only active activity.

4. Add `ActivitySwitcher`.
   - Compact segmented control.
   - Keyboard accessible.
   - Exposes selected state.

5. Make filters activity-aware.
   - Hiking keeps current filters.
   - Kayaking can initially show no data or placeholder until Phase 8.
   - Avoid showing kayak-only filters in hiking mode.

6. Fix app labels.
   - Search placeholder and accessible label should not say only "hikes" once kayaking exists.
   - Use "Search routes" or activity-specific text.

### Definition Of Done

- Generic index loads.
- Hiking mode works with existing items.
- Trail-system route builder can initialize from manifest, sections index, route groups, and presets without fetching all section detail shards.
- Activity switch is visible and accessible.
- Switching to kayaking does not crash even before kayak data exists.
- Switching activity clears stale selected detail.
- Search/filter count is scoped to active activity.

### Tests

Browser:

- Load app. Hiking activity selected.
- Switch to kayaking. Overview/empty state shown, no hiking detail remains.
- Switch back to hiking. Hiking overview shown.
- Search in hiking only affects hiking list.
- Activity switch keyboard navigation works.
- Network: selecting Sormlandsleden does not fetch a legacy all-in-one trail-system JSON once sharded loading is enabled.
- Network: route builder initialization does not fetch every section detail shard.

Commands:

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

## Phase 8: Kayak Data Import

### Goal

Normalize and import the preliminary kayak research into project-owned data.

### Primary Files

- `data/source/kayaking/**`
- `scripts/import-kayak-data.mjs`
- `scripts/lib/normalize-kayak.mjs`
- `public/data/kayak-trips/**`
- `public/data/kayak-facilities.json`
- `public/routes/kayaking/**`
- `public/data/overviews/kayaking.geojson`

### Implementation Steps

1. Snapshot external inputs into repo source.
   - Copy map-ready dataset and GeoJSON inputs into `data/source/kayaking/`.
   - Preserve original generated date and source file fields.

2. Normalize all 34 routes.
   - `activity: "kayaking"`.
   - `itemType: "kayak-trip"`.
   - Normalize `recommendedTimes`.
   - Preserve `distanceKm: null`.
   - Normalize route type and difficulty.
   - Normalize `sources`.
   - Normalize `research`.
   - Preserve named research corrections:
     - Namdoskargarden/Bullero.
     - Langviksskar split.
     - Unknown Stockholm Kayak Trail distances.
     - Runmaro contradiction.
     - Grinda/Gallno taxonomy conflict.
     - Kayakomat Nynashamn/Nickstabadet unreliability.

3. Normalize route geometry.
   - Write one GeoJSON file per kayak trip under `public/routes/kayaking/`.
   - Every kayak route geometry gets:
     - `geometryStatus: "approximate-waypoint-corridor"`.
     - `navigationUse: "not-for-navigation"`.
     - `mapConfidence`.

4. Normalize facilities.
   - Merge facility and parking records into kayak facility output.
   - Keep semantically different records separate.
   - Normalize source strings/objects.
   - Normalize route IDs:
     - Known current routes -> `routeIds`.
     - Future/unknown routes -> `candidateRouteIds`.

5. Normalize route facility links.
   - Known facility IDs -> `facilityRefs`.
   - Known rental IDs -> `rentalRefs`.
   - Free text -> `facilityNotes`.
   - Do not treat free text as IDs.

6. Generate kayak overview.
   - `public/data/overviews/kayaking.geojson`.
   - One feature per kayak trip.
   - Preserve not-for-navigation metadata.

7. Add kayak trips to `library-index.json`.
   - Search corpus includes route names, area, region, water zone, facility notes, rental names, sources where useful.
   - `normalizedSearchText` included.

### Definition Of Done

- 34 kayak trips are present in generic index.
- 34 kayak route GeoJSON files exist or one validated equivalent geometry store exists.
- Kayak overview shows 34 route features.
- Kayak facilities output includes the 61 facility records and 22 parking-category records, unless intentionally merged with documented counts.
- Validation passes with no hard kayak failures.
- All kayak routes retain not-for-navigation caveats.
- No free-text facility notes are treated as facility refs.

### Tests

Automated/data:

- `npm run data:validate`
- Test normalized route count is 34.
- Test every kayak trip detail path exists.
- Test every kayak trip route path exists.
- Test all hard `facilityRefs` and `rentalRefs` exist.
- Test every kayak route has `navigationUse: "not-for-navigation"`.
- Test route with null distance remains null and does not fail.
- Test named corrections are preserved in generated JSON.

Browser:

- Kayaking activity shows 34 routes in list/overview.
- Searching for known kayak route names works.
- Clicking a kayak overview route loads a placeholder/detail without crashing.

Commands:

- `npm run data:validate`
- `npm run build`

## Phase 9: Kayak Overview Integration

### Goal

Make kayaking mode browsable through the overview map.

### Primary Files

- `src/components/ActivityOverview.tsx`
- `src/map/OverviewMap.tsx`
- `src/components/Sidebar.tsx`
- Kayak filter components.

### Implementation Steps

1. Load kayaking overview when activity is kayaking.
   - Use `public/data/overviews/kayaking.geojson`.
   - Do not load all kayak detail JSON.

2. Add kayak list filters.
   - Region.
   - Water zone.
   - Difficulty.
   - Trip duration.
   - Rental support.
   - Unknown distance handling.

3. Apply same hover/click behavior.
   - Hover route: gray others.
   - Click route: select kayak trip.
   - Sidebar focus highlights route.

4. Style approximate corridors.
   - Use a distinct dashed or softer route style.
   - Tooltip should say approximate if space allows.

### Definition Of Done

- Kayaking mode displays overview map.
- All imported kayak corridors are drawn.
- Hovering one kayak route grays the rest.
- Clicking kayak route opens kayak detail state.
- Overview map still does not load all kayak detail JSON.

### Tests

Browser:

- Switch to kayaking.
- Verify overview route count visually or via SVG path count.
- Hover a kayak route. Other routes gray.
- Click a kayak route. Detail loads.
- Network: only overview data loads before click.

Commands:

- `npm run data:validate`
- `npm run build`

## Phase 10: Kayak Trip Detail UI

### Goal

Build a clean kayaking detail experience that reuses shared infrastructure but has kayak-specific content.

### Primary Files

- `src/components/kayaking/KayakTripDetails.tsx`
- `src/components/kayaking/KayakSafetyPanel.tsx`
- `src/components/kayaking/KayakAccessPanel.tsx`
- `src/components/kayaking/KayakFacilityList.tsx`
- `src/components/kayaking/KayakMapFilters.tsx`
- Shared map components.

### Implementation Steps

1. Build kayak facts header.
   - Distance.
   - Estimated time.
   - Difficulty.
   - Exposure.
   - Water zone.
   - Route type.
   - Research confidence.

2. Build kayak map.
   - Route corridor.
   - Start/end/waypoints.
   - Rental centers.
   - Launch/parking.
   - Overnight/service points.
   - Map filters by kayak facility category.

3. Show not-for-navigation warning.
   - Visible near map status.
   - Present in detail metadata.
   - Not alarming, but clear.

4. Build safety panel.
   - Exposure.
   - Crossings.
   - Wind/weather notes.
   - Navigation notes.
   - Seasonal notes.

5. Build access panel.
   - Public transport.
   - Ferry.
   - Parking.
   - Launch notes.

6. Build rental/facility panel.
   - Staffed rentals.
   - Self-service rentals.
   - Booking model.
   - Own-kayak support.
   - Parking type.
   - Launch carry.

7. Build rules/protection panel.
   - Protected areas.
   - Seasonal restrictions.
   - No-navigation/no-landing/camping where present.
   - Fire ban reminder.

8. Build source/follow-up panel.
   - Sources.
   - Needs follow-up.
   - Contradictions.

9. Keep UI clean.
   - Default view should not dump every raw field.
   - Long rules and source lists can be collapsed.
   - Accordions must have `aria-expanded` and `aria-controls`.

### Definition Of Done

- Kayak trip detail renders for all 34 trips.
- Rental centers are visible when linked.
- Launch/parking details are visible when linked.
- Not-for-navigation warning appears for all approximate corridors.
- Kayak-only facility categories do not appear in hiking mode.
- Detail page remains readable on mobile.

### Tests

Automated:

- Render each kayak trip detail with test data and assert no crash.
- Assert not-for-navigation warning renders when `navigationUse` is `not-for-navigation`.
- Assert rental refs resolve to facility cards.

Browser:

- Open city kayak route.
- Open advanced/outer kayak route.
- Toggle kayak facility filters.
- Check mobile layout.
- Check accordion accessibility state.

Commands:

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

## Phase 11: Hiking Topology And Distance Corrections

### Goal

Resolve hiking data correctness issues found by testing.

### Primary Files

- Generator scripts after pipeline split.
- Route source data.
- `scripts/validate-data.mjs`.
- Generated route files through generators only.

### Implementation Steps

1. Implement route direction audit.
   - Compare adjacent section end-to-start gaps.
   - Compare alternate pairings to detect reversed geometry.
   - Flag suspicious transitions.

2. Fix confirmed reversed route geometry.
   - Ensure geometry starts near `from` and ends near `to`.
   - Derive endpoint coordinates after direction normalization.

3. Address known transitions.
   - Roslagsleden stage 3 -> 4.
   - Roslagsleden stage 4 -> 5.
   - Roslagsleden stage 5 -> 6.
   - Roslagsleden stage 6 -> 7.
   - Sormlandsleden early mainline transitions listed in round-2 report.

4. Implement distance audit.
   - Compare declared distance to measured GeoJSON line length.
   - Known mismatches:
     - `sormlandsleden-stage-31-1`.
     - `sormlandsleden-stage-34`.
     - `sormlandsleden-stage-36`.

5. Correct or mark.
   - If geometry is wrong, fix geometry.
   - If official distance is right but geometry is approximate, mark geometry confidence/caveat.
   - Do not silently overwrite official distance with measured value.

### Definition Of Done

- Known endpoint topology failures are fixed or explicitly documented as exceptions.
- Known distance mismatches are fixed or marked.
- Validation reports no unexpected topology failures.
- Commute/access endpoints no longer use reversed route ends.

### Tests

Automated/data:

- `npm run data:validate`
- Dedicated route topology audit passes for fixed known cases.
- Distance audit has no unexplained material mismatch.

Browser:

- Select affected hiking stages.
- Start/end markers appear at correct named ends.
- Transit access corresponds to correct endpoints.

Commands:

- `npm run data:validate`
- `npm run build`

## Phase 12: Responsive, Accessibility, Print, And Visual Polish

### Goal

Close remaining UI test findings and prevent kayak UI from inheriting layout bugs.

### Primary Files

- `src/styles.css`, or split CSS files.
- Shared components.
- Map controls.
- `index.html` for favicon.

### Implementation Steps

1. Fix 901px-1099px overflow.
   - Extend stacked/tablet breakpoint or relax grid min widths.
   - Test 901, 960, 1024, 1100.

2. Fix 200% text zoom.
   - Avoid fixed heights that clip controls.
   - Let builder/list sections expand or scroll intentionally.
   - Ensure zoom buttons and chips do not clip.

3. Add print styles.
   - Expand scrollable route sections in print.
   - Hide interactive-only map controls.
   - Prefer printable route/trip summary and section list.

4. Add ARIA states.
   - Favorites: `aria-pressed`.
   - Map filter chips: `aria-pressed`.
   - Disclosure buttons: `aria-expanded` and `aria-controls`.
   - Active list item: `aria-current` or equivalent.
   - Selected route sections: appropriate selected/current state.

5. Improve touch targets.
   - Star buttons.
   - Facility chips.
   - Zoom controls where controllable.
   - Select/action controls.

6. Improve contrast.
   - Active hike meta text.
   - Selected section number text.
   - Selected section meta text.

7. Improve visible map chip labeling.
   - In roomier layouts, show short labels.
   - In compact layout, keep icons/counts but ensure tooltips and accessible names.

8. Add favicon.

### Definition Of Done

- No horizontal overflow at 901, 960, 1024, 1100 desktop widths.
- No meaningful overflow at 320px mobile.
- 200% text zoom does not clip controls.
- Print output does not clip route/trip content.
- Interactive controls expose state to assistive tech.
- Touch targets are comfortable enough for mobile.
- Contrast issues from reports are resolved.
- Favicon 404 is gone.

### Tests

Browser:

- Viewports: 320x640, 390x844, 900x768, 901x768, 960x768, 1024x768, 1100x768, 1440x900.
- Text zoom simulation at 200%.
- Print preview/PDF.
- Accessibility tree for search, switch, accordions, favorites, chips.
- Keyboard-only navigation through sidebar, overview, route builder, detail.

Commands:

- `npm run build`

## Phase 13: Optional Deep Links

### Goal

Make activity and route selection shareable.

### URL Shape

```text
/
/hiking
/hiking/sormlandsleden
/hiking/sormlandsleden?start=sormlandsleden-stage-1&end=sormlandsleden-stage-2
/kayaking
/kayaking/langholmen-reimersholme-loop
```

### Implementation Steps

1. Add URL parser.
   - Activity.
   - Item ID.
   - Optional hiking start/end section IDs.

2. Add history updates.
   - Selecting overview route updates URL.
   - Back to overview updates URL.
   - Changing hiking route range may update query params.

3. Preserve graceful fallback.
   - Unknown activity -> hiking overview.
   - Unknown item -> activity overview plus error toast/message.
   - Unknown section IDs -> item default route builder.

### Definition Of Done

- Refresh preserves selected activity and item.
- Shared link opens same route/trip.
- Browser Back returns from detail to overview.
- Invalid URLs fail gracefully.

### Tests

Browser:

- Load each URL shape.
- Refresh each detail URL.
- Back/forward between overview and selected item.
- Invalid item ID.

Commands:

- `npm run build`

## Final Release Gate

Before a public kayaking preview or major merge, all of these must pass:

### Commands

- `npm run typecheck`
- `npm run data:validate`
- `npm run build`

### Data Checks

- Current standalone hiking detail paths exist.
- Large hiking trail-system manifest paths exist.
- Large hiking trail-system sections index paths exist.
- Every section in a sections index has a matching section detail shard.
- Current hiking route paths exist.
- Hiking route groups and presets are valid.
- Hiking known topology/distance issues are fixed or explicitly marked.
- 34 kayak trips are indexed.
- Kayak detail paths exist.
- Kayak route paths exist.
- Kayak facility refs resolve.
- Kayak free-text facility notes are not treated as IDs.
- Kayak not-for-navigation metadata is present.

### Browser Checks

- Hiking overview loads without detail fetches.
- Kayaking overview loads without detail fetches.
- Selecting a large hiking trail system loads manifest/index shards, not a legacy all-in-one trail-system JSON.
- Entering the route builder does not fetch every section detail shard.
- Overview hover grays non-hovered routes.
- Overview click opens correct interface.
- Hiking route builder works.
- Kayak detail works.
- Facility toggles do not refetch routes.
- Preset changes do not refetch unchanged routes.
- Missing route file produces partial map warning, not blank UI.
- Index/detail corrupt JSON shows error/retry.
- Search handles diacritics.
- Mobile avoids below-fold map work.
- 901px-1099px layouts do not overflow.
- 200% text zoom works.
- Print output is not clipped.
- Keyboard navigation is coherent.
- Accessibility states are present.

## Agent Handoff Template

Every agent should end with:

```md
## Summary
- What changed.
- What intentionally did not change.

## Files Changed
- List paths.

## Validation
- Commands run and results.
- Browser scenarios run and results.

## Known Follow-ups
- Any deferred items.
- Any warnings from validation.
```
