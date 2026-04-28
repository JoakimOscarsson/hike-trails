# Data Pipeline And Implementation Status

Last updated: 2026-04-28

This document tracks the data-contract refactor in small implementation slices. It is intentionally explicit about what each slice has and has not changed so the next agent can continue without rereading every planning note.

## Current Boundaries

Runtime data is now in a transitional hiking-plus-kayak public contract. The visible app loads hiking and kayaking records from the shared index. Kayaking has a typed overview/detail branch, compact kayak-specific filters, water/exposure/research-confidence filtering, linked facility rendering on kayak detail maps, and a live browser runtime-path/interaction/accessibility/print probe; richer overview facility layers and caveat-severity workflows remain future work.

As of Slice 22, overview maps still initialize immediately because they are primary navigation surfaces. Non-overview route/detail maps defer on small screens until their reserved map area is near the viewport, reducing below-fold route-geometry and tile work without changing the desktop behavior or public data contract. As of Slice 23, trail-system detail maps render selected/context route geometry only; the hiking overview map remains the full-network orientation surface. As of Slices 24-28, map extraction has moved `DeferredMapMount`, standalone hike `RouteMap`, kayak `KayakTripMap`, and `TrailSystemMap` into `src/map/**`; route-builder orchestration and top-level library load/filter state still live in `src/main.tsx`. As of Slice 31, trail-system route loading/drawing helpers live in `src/map/trailSystemRouteLayers.ts`; as of Slice 32, hiking facility marker rendering lives in `src/map/hikingFacilityMarkers.tsx`; as of Slice 33, hiking commute marker rendering lives in `src/map/hikingCommuteMarkers.tsx`; as of Slice 34, selected-route-first bounds fitting lives in `src/map/fitMapBounds.ts`; as of Slice 40, hiking detail maps and facility lists hide facilities marked off-route by the existing proximity metadata, and same-coordinate hiking facilities render as expandable map clusters. As of Slice 41, sidebar/detail view shells and filter contracts live outside `src/main.tsx`. As of Slice 42, overview routes use a generated deterministic color scale instead of a six-color palette.

Kayak `hasFollowup` is intentionally an internal audit/detail signal as of Slice 19. It stays in the compact public contract for validation and future editorial workflows, but it is not exposed as a sidebar filter because every current kayak route has follow-up/research notes and a visible filter would not narrow the list.

CI gate split as of Slice 20:

- `npm run ci:check` is the portable required gate for environments without a guaranteed browser. It runs data validation, the mocked runtime contract probe, TypeScript typecheck, and production build.
- `npm run ci:check:browser` is the browser-enabled required gate. It runs `ci:check` plus `npm run runtime:browser-probe`.
- `runtime:browser-probe` is intentionally strict: it fails if Chrome/Chromium is unavailable. Browser-enabled CI should install Chrome/Chromium or set `CHROME_BIN` / `BROWSER_BIN`.
- `npm run ui:smoke` generates the current scripted UI smoke report at `docs/test-reports/hike-ui-smoke-report-2026-04-28.md`; it requires Chrome/Chromium like the browser runtime probe.
- `npm run ui:smoke:artifact` runs the same smoke report but writes to `artifacts/ui-smoke/hike-ui-smoke-report.md` for CI artifact upload without touching committed docs.
- As of Slices 29-30 and Slice 38, `.github/workflows/ci.yml` runs `npm run ci:check` in a portable job and `npm run ci:check:browser` plus `npm run ui:smoke:artifact` in a browser-capable job on push, pull request, and manual dispatch. The browser job locates Chrome/Chromium on the GitHub-hosted Ubuntu runner before running the probe and smoke report.

Current validation state: as of Slice 17, `npm run data:validate` passes without known warnings. Earlier slice notes mention hiking endpoint-topology warnings because those warnings existed when those slices were completed; Slice 17 resolved them by aligning route geometry direction and declared endpoint coordinates with stage order.

## Current Milestone Status

Use this section as the quick handoff view. The detailed slice log below remains the source of record for exact implementation notes and historical warnings.

Completed and stable enough to build on:

- Read-only hiking/kayak runtime validation, shared domain types, `data:validate`, `typecheck`, `ci:check`, `ci:check:browser`, and project-owned GitHub Actions checks.
- Hiking trail-system runtime shards and app runtime loading from `library-index.json` plus sharded trail-system data.
- Route geometry cache, per-route load resilience, and Leaflet lifecycle fixes.
- Hiking and kayaking overview/detail runtime paths, kayak source import, kayak detail facility rendering, and compact kayak filters.
- Mobile below-fold map deferral for non-overview maps.
- Trail-system selected/context route loading; detail maps no longer fetch every background route.
- Browser runtime probe and UI smoke report covering runtime paths, selected/context request budgets, overview color variety, filter behavior, accessibility, print polish, and mobile deferral, with CI artifact upload for the smoke report.
- Map component/helper extraction through Slice 34: standalone hike map, kayak trip map, trail-system map, route layers, hiking facility markers, hiking commute markers, and selected-route-first bounds fitting.
- Sidebar/detail view extraction through Slice 41: `LibrarySidebar`, `TrailSystemDetails`, `HikeDetails`, `KayakTripDetails`, shared detail blocks, load-state type, and activity/filter helpers now live in focused modules.
- Trail-system selected section-detail loading is isolated in `src/data/useTrailSectionDetails.ts`.
- Trail-system route-group range and section lookup helpers are isolated in `src/data/trailRouteSelection.ts`.
- Hiking trail-system facility display now uses existing `routeProximity` metadata to keep off-route facilities out of selected-section lists/maps, and overlapping same-coordinate hiking facility markers expand into individual icons.

Still transitional:

- Legacy compatibility files still exist: `public/data/hikes-index.json` and `public/data/trail-systems/<trail-system-id>.json`.
- Runtime code now requires `library-index.json` and trail-system shard paths. Legacy hiking files remain compatibility outputs, not runtime fallbacks.
- Hiking trail-system source now lives in `data/source/hiking/**`; `data/trail-systems.json` is no longer a source input.
- `npm run data:build` is still a local/manual gate for source data, generator, or public contract changes; `ci:check` validates current outputs but does not regenerate them.
- `npm run ui:smoke` still rewrites `docs/test-reports/hike-ui-smoke-report-2026-04-28.md` locally; hosted CI uses `npm run ui:smoke:artifact` instead.
- Candidate trail research and kayak research seed files remain import inputs only, not runtime dependencies.

Recommended next safe milestones:

1. Reassess whether `src/map/TrailSystemMap.tsx` is small enough to pause map extraction.
2. Continue route-builder/data-loading cleanup only in small behavior-preserving slices with browser probes after each change; the next app-shell cleanup candidate is extracting library loading and filter orchestration from `src/main.tsx`.
3. Decide when legacy compatibility hiking JSON can stop being generated, after hosting/deploy needs are clear.
4. Add deploy/cache-header validation only after the static hosting target is known.
5. Decide whether the UI smoke artifact should later include screenshots or be split into a separate optional workflow if runtime becomes too slow.

Current runtime output paths covered by validation:

- `public/data/library-index.json`
- `public/data/overviews/hiking.geojson`
- `public/data/overviews/kayaking.geojson`
- `public/data/trail-systems/<trail-system-id>/manifest.json`
- `public/data/trail-systems/<trail-system-id>/sections-index.json`
- `public/data/trail-systems/<trail-system-id>/route-groups.json`
- `public/data/trail-systems/<trail-system-id>/presets.json`
- `public/data/trail-systems/<trail-system-id>/sections/<section-id>.json`
- `public/data/kayak-trips/<kayak-trip-id>.json`
- `public/data/kayak-facilities.json`
- `public/routes/*.geojson`
- `public/routes/kayaking/<kayak-trip-id>.geojson`

Compatibility outputs still exist:

- `public/data/hikes-index.json`
- `public/data/trail-systems/<trail-system-id>.json`

The app requires `library-index.json` and trail-system shards. If the generic index or shard paths are unavailable, runtime loading fails visibly instead of falling back to legacy all-in-one trail-system JSON.

Current app/generator inputs remain:

- `data/hikes.json`
- `data/source/hiking/**`
- `data/source/kayaking/**`
- `data/commute-stops-osm-cache.json`
- `data/research-progress/sormlandsleden.json`
- `public/data/**`
- `public/routes/**`

Research-only inputs are not runtime data:

- `data/research/candidate-trails/**` is future trail import input only.
- `research/stockholm-kayak-archipelago-research/**` is kayak import seed research only. The repo-owned kayak source now lives under `data/source/kayaking/**`, with reviewable source shards in `routes/`, `facilities/`, `parking/`, and `metadata.json`; runtime code must not depend on `research/**` directly.
- The repo currently has `upplandsleden`, not `uppsalaleden`.

## Target Runtime Contract

Large trail systems should move toward purpose-specific runtime shards:

```text
public/data/trail-systems/<trail-system-id>/
  manifest.json
  sections-index.json
  route-groups.json
  presets.json
  sections/
    <section-id>.json
```

The legacy all-in-one trail-system files may remain temporarily for compatibility, but new runtime code should not depend on downloading a many-thousand-line trail-system payload just to initialize the route builder.

## Slice 1: Validation And Shared Contract Foundation

Status: implemented in the `codex/data-validation-foundation` worktree.

Done:

- Added read-only validation at `scripts/validate-data.mjs`.
- Added `npm run data:validate`.
- Added `npm run typecheck`.
- Validates current hiking source and public data for duplicate IDs, public detail paths, ready route files, route-group references, preset references, app `[lat, lon]` coordinates, GeoJSON `[lon, lat]` coordinates, and facility `sectionId` ownership.
- Adds warning-level audits for adjacent route endpoint gaps and declared distance versus GeoJSON length.
- Adds inactive kayak runtime validation scaffolding for future `public/data/kayak-trips/**` and `public/data/kayak-facilities.json`.
- Adds shared domain/data-contract types in `src/types.ts` without changing current consumers.
- Adds `scripts/lib/search-text.mjs` and updates the hiking data writer so generated `searchText` is diacritic-insensitive without doubling the public index payload.
- Tightens data validation for enum-like fields including route status/source format, route-group kind, recommended times, and facility type.
- Aligns the TypeScript facility-type union and existing hiking facility UI labels/icons with the facility types currently present in generated data.

Not done:

- No generated public JSON was rewritten in this slice.
- No source files were split into `data/source/**`.
- No runtime shard writer was added yet.
- No app runtime code was switched from legacy trail-system detail files to shards.
- No kayak research data was imported into app-owned runtime data.
- No kayak UI was added.
- No route geometry cache or Leaflet lifecycle refactor was added.

Historical validation warnings before Slice 17:

- Roslagsleden has four endpoint-topology warnings matching the round-2 UI test report.
- Sörmlandsleden mainline stages 1-11 have eight endpoint-topology warnings matching the round-2 UI test report.
- Kayak validation reports that no kayak runtime data exists and remains inactive.
- The current route files do not trigger hard failures. Distance mismatch warnings will appear if a section's declared distance diverges materially from its GeoJSON again.
- `searchText` is currently normalized in generated index output. Do not add a second full-length `normalizedSearchText` field until the index contract has been compacted.

## Next Slice: Source And Runtime Sharding Groundwork

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 1.

Done:

- Added deterministic runtime shard writing in `scripts/lib/write-trail-system-shards.mjs`.
- Wired `npm run data:build` / `scripts/write-hike-data.mjs` to generate trail-system shards alongside the legacy all-in-one compatibility JSON files.
- Generated runtime shards for Roslagsleden and Sörmlandsleden:
  - `manifest.json`
  - `sections-index.json`
  - `route-groups.json`
  - `presets.json`
  - `sections/<section-id>.json`
- Added shard pointers to the transitional `public/data/hikes-index.json` records:
  - `manifestPath`
  - `sectionsIndexPath`
  - `routeGroupsPath`
  - `presetsPath`
- Extended validation to verify shard path existence, index-to-shard identity, manifest/section IDs, section detail files, route-group references, route-group connection references, preset references, orphan shard directories, and that manifest/section detail files do not duplicate whole-system collections.
- Kept the current public data contract intact: `detailPath` still points at the legacy all-in-one trail-system JSON files.
- `scripts/write-hike-data.mjs` removes stale shard directories when a trail system disappears from the generated system list.

Not done:

- Runtime app code has not been switched to the shard loader.
- The legacy all-in-one trail-system JSON files have not been removed.
- Source-authored data has not been split into `data/source/**`.
- Route geometry caching and Leaflet lifecycle work has not been done.
- Kayak source import and kayak runtime data remain untouched.

Recommended next work:

1. Add route geometry caching and partial route-load error handling before changing map/runtime loading behavior.
2. Add a trail-system shard loader that can initialize the route builder from `manifest.json`, `sections-index.json`, `route-groups.json`, and `presets.json`.
3. Fetch per-section detail shards only for selected/context sections in the info view.
4. Keep legacy `public/data/trail-systems/<id>.json` compatibility output until the app migration has shipped and been verified.
5. Start `data/source/**` source-authoring splits only after generated runtime shards and validation stay stable.

## Slice 3: Search And Loading/Error State Groundwork

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 2.

Done:

- Added a frontend search normalizer at `src/utils/search.ts`.
- Changed app search to normalize user queries and use normalized index text, fixing searches like `sormlandsleden`, `mellsjon`, and `nynashamn`.
- Added explicit index loading/error state with retry.
- Added explicit detail loading/error state with retry.
- Added an accessible search input name: `aria-label="Search routes"`.
- Changed no-results behavior so stale route details are cleared when filters/search match no routes.
- Added a no-results main-panel state with a clear-filters action.
- Cleaned non-array or non-string favorites data and removes unknown favorite IDs after the index loads.

Not done:

- Route geometry cache had not been added in this slice; it is now covered by Slice 4 below.
- Leaflet lifecycle and map-layer refactor are not done yet.
- Runtime loading still uses legacy all-in-one trail-system detail files.
- The active route-builder range/filter semantics are not fully redesigned yet; this slice only prevents stale details when no list item matches.

Recommended next work:

1. Continue with Slice 4 route-cache/layer loading work below.
2. Keep route cache behavior covered with a small probe or unit test once a test runner exists.

## Slice 4: Route Geometry Cache And Route-Load Resilience

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 3.

Done:

- Added `src/map/routeGeometry.ts`.
- Added `loadRouteGeometry(path)` with module-level promise caching by GeoJSON path.
- Added `clearRouteGeometryCache()` for future tests.
- Normalizes supported GeoJSON inputs into `FeatureCollection`.
- Deletes failed cache entries so a later retry can fetch again.
- Wired existing standalone hike and trail-system maps through the shared loader.
- Replaced trail-system all-or-nothing route loading with per-route error handling so successful route, facility, and commute layers still render when one route file fails.
- Added an on-map route-load warning for failed selected or background route files.
- Trail-system maps now load selected section routes first, draw them, fit bounds, then request background section routes.
- Standalone hike maps now expose a route-load warning and change the map status to `Route unavailable` if a ready route file fails.
- Route-draw failure handlers now respect effect cleanup before updating React state or touching the Leaflet map.

Not done in Slice 4:

- Trail-system maps still request every background section route after selected routes draw; those requests are cached and selected-first, but not yet reduced to viewport/context routes.
- Leaflet map creation and layer updates were intentionally left for Slice 5 below.
- Route-load warnings do not yet have an in-map retry action.
- No kayak corridor runtime loading has been added.

Recommended next work from Slice 4:

1. Continue with the Leaflet lifecycle split in Slice 5.
2. Keep the shard runtime migration separate from the Leaflet lifecycle slice.

## Slice 5: Leaflet Lifecycle And Layer Updates

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 4.

Done:

- Added `src/map/useLeafletMap.ts` for one-time Leaflet map setup per component mount.
- Centralized base tile layer, zoom control, disabled scroll-wheel zoom, and disabled default keyboard map focus in the hook.
- Updated standalone hike maps to keep the Leaflet map instance mounted while route layers are replaced in a layer group.
- Updated trail-system maps to keep the Leaflet map instance mounted while selected/background route layers, facility markers, commute markers, and start/end markers are replaced in layer groups.
- Facility-filter changes and selected-section changes no longer recreate the base Leaflet map, tile layer, or zoom control.
- Async route-draw cleanup now removes only the slice's layer groups and checks cancellation before state/map updates.

Not done:

- Trail-system maps still request every background section route after selected routes draw; this remains a route overview strategy problem, not a Leaflet lifecycle problem.
- Route/facility/commute layer builders are still inline in `src/main.tsx`; they have not yet been split into `routeLayers.ts`, `facilityLayers.ts`, or `markerLayers.ts`.
- There is no automated browser/instrumentation test that counts map creations or route fetches across interactions.
- Route-load warnings do not yet include an in-map retry action.
- No overview map or kayak UI/runtime loading has been added.

Recommended next work:

1. Continue with the hiking overview map in Slice 6.
2. Add lightweight browser/instrumentation coverage for the route-builder interactions that previously recreated maps.
3. Extract route and marker layer builders only if a later slice needs reuse beyond the overview map.

## Slice 6: Hiking Overview Map

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 5.

Done:

- Added generated lightweight hiking overview GeoJSON at `public/data/overviews/hiking.geojson`.
- Added `scripts/lib/build-overview-geojson.mjs` and wired `scripts/write-hike-data.mjs` to regenerate the overview from current public route geometry.
- The overview contains one feature per top-level hiking index item and currently stays at about 108 KB instead of loading all route detail files.
- Added `overviewFeatureId` to generated hiking index items.
- Extended `npm run data:validate` to require the hiking overview file, verify feature IDs against the public index, validate overview GeoJSON coordinates, and check overview feature properties.
- Added `src/map/OverviewMap.tsx` using the shared Leaflet lifecycle hook.
- Added `src/components/ActivityOverview.tsx` as the initial unselected hiking view.
- The app now starts with no selected item, shows the hiking overview before detail selection, and fetches detail JSON only after the user selects a list or map route.
- Sidebar hover/focus highlights the matching map route; map hover highlights the matching sidebar row; map click opens the existing hiking detail or route-builder interface.
- Added "Back to overview" navigation from hiking details and trail-system builder/info views.

Not done:

- The overview is hiking-only; no activity switch, kayak overview, kayak source import, or kayak runtime/UI was added.
- The overview generator uses simplified current route geometry, not a future dedicated overview-source dataset.
- Browser automation has not yet proven that detail JSON is absent before selection or that map click opens details.
- Overview hover/click behavior is implemented for current top-level items but does not yet include dense-map clustering or legends.
- Route/facility layer builders remain inline in `src/main.tsx`.

Recommended next work:

1. Continue with the activity shell and generic index in Slice 7.
2. Add a focused browser smoke test for initial overview, hover/click selection, back-to-overview, and no detail JSON before selection.

## Slice 7: Generic Library Index And Sharded Trail-System Runtime Loading

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 6.

Done:

- `scripts/write-hike-data.mjs` now writes `public/data/library-index.json` alongside the compatibility `hikes-index.json`.
- Generic trail-system records include `activity: "hiking"` and shard paths, but intentionally omit the legacy all-in-one `detailPath`.
- Compatibility `hikes-index.json` still includes the legacy `detailPath` during migration.
- `npm run data:validate` now validates `library-index.json`, requires unique overview feature IDs, rejects trail-system generic records that point at the legacy all-in-one detail JSON, and checks shard paths/references.
- The app initially preferred `library-index.json` and fell back to `hikes-index.json` during the transition; a later cleanup removed that fallback.
- Selecting a trail system loads `manifest.json`, `sections-index.json`, `route-groups.json`, and `presets.json` instead of the legacy all-in-one trail-system file.
- The route builder initializes from section-index summaries.
- Selected/context section detail shards are fetched on demand for facilities, commute access, and info text.
- Added a compact accessible Hiking/Kayaking activity switch.
- Switching activity clears selected detail, search, filters, and hover state.
- Kayaking mode shows a stable empty state until kayak runtime data exists.

Not done:

- No kayak source data, kayak runtime data, kayak overview, or kayak details UI was added.
- The route builder still lives in `src/main.tsx`; hooks/components were not split yet.
- Selected section detail hydration has no explicit inline loading/error UI beyond keeping the route builder usable from summaries.
- The legacy all-in-one trail-system JSON files are still generated for compatibility.
- Browser/network automation has not yet asserted request-by-request that selecting a trail system avoids the legacy all-in-one detail JSON; Slice 8 adds a static/runtime contract probe for the same boundary.

Recommended next work:

1. Run and keep extending `npm run runtime:probe` while the sharded runtime contract is changing.
2. Start kayak source import only after the sharded loading path remains green.
3. Later, stop generating legacy all-in-one trail-system outputs once hosting/deploy compatibility no longer needs them.

## Slice 8: Runtime Contract Probe

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 7.

Done:

- Added `scripts/probe-runtime-contract.mjs`.
- Added `npm run runtime:probe`.
- The probe verifies that `public/data/library-index.json` exists and that current trail-system runtime records do not include the legacy all-in-one `detailPath`.
- The probe walks each trail-system `manifestPath`, `sectionsIndexPath`, `routeGroupsPath`, and `presetsPath` from the generic index and checks the basic runtime initialization shape for section summaries, route groups, and presets.
- The probe checks that section-index records point at existing section detail shards under the matching trail-system shard directory.
- The probe parses section detail shards and verifies they match the section and trail-system IDs.
- The probe checks that `hikes-index.json` still keeps compatibility records with legacy all-in-one `detailPath` values and shard paths during the migration.
- The probe checks that trail-system overview features do not expose legacy all-in-one `detailPath` values.
- The app's index/detail loading code is now in `src/data/library.ts`.
- The probe imports the actual runtime loader from `src/data/library.ts` with a mocked `fetch`, verifies the normal `library-index.json` path requests shards, and verifies missing generic index/shard paths fail without requesting legacy fallback files.

Not done:

- This is not browser request-interception against a live Vite app; it proves the app's shared runtime loader behavior with mocked `fetch`.
- Its first version focused on the hiking sharded runtime loader. Slice 10 extends the same probe to kayak index, overview, and detail loading.
- The legacy all-in-one trail-system JSON files remain in place for compatibility, but the runtime fallback branch has been removed.

Recommended next work:

1. Keep `npm run runtime:probe` focused on the sharded hiking loader while trail-system compatibility remains.
2. Keep kayak UI inactive or empty until kayak runtime validation, route caching, and map lifecycle boundaries are in place.
3. Add browser/network request interception later, once the app has a small automated browser harness.

## Slice 9: Kayak Source Import And Runtime Data

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 8.

Done:

- Added `scripts/build-data.mjs` so `npm run data:build` rebuilds hiking data and then imports kayak runtime data.
- Added `scripts/build-hiking-data.mjs` so `npm run data:build:hiking` rebuilds hiking data and re-runs kayak import afterward, keeping `library-index.json` valid.
- Added `scripts/import-kayak-data.mjs` and `scripts/lib/normalize-kayak.mjs`.
- Added package scripts `data:build:hiking` and `data:kayak:import`.
- Added repo-owned kayak source snapshots under `data/source/kayaking/source-snapshot/`, plus `data/source/kayaking/source-manifest.json` and `README.md`. Slice 16 later adds reviewable source shards beside the raw snapshot.
- Generated 34 kayak trip detail files under `public/data/kayak-trips/`.
- Generated 34 kayak route GeoJSON files under `public/routes/kayaking/`.
- Generated `public/data/kayak-facilities.json` with 61 deduplicated facility records; parking-category records are intentionally merged into this facility store.
- Generated `public/data/overviews/kayaking.geojson` with 34 approximate corridor features.
- Added 34 `activity: "kayaking"` / `itemType: "kayak-trip"` records to `public/data/library-index.json`.
- Preserved `geometryStatus: "approximate-waypoint-corridor"`, `navigationUse: "not-for-navigation"`, map confidence, and warning text on kayak trip details, route GeoJSON, and overview features.
- Preserved named research caveats for Namdoskargarden/Bullero, Langviksskar, unknown Stockholm Kayak Trail distances, Runmaro contradictions, Grinda/Gallno taxonomy conflict, and Kayakomat Nynashamn/Nickstabadet unreliability.
- `npm run data:validate` now activates kayak validation when kayak runtime data exists, including trip counts, facility refs, coordinates, route metadata, route files, overview features, and generic index records.
- The visible React app still filters runtime loading to hiking items only, so kayak records do not reach hiking-specific UI yet.

Not done:

- No kayak overview UI, kayak detail UI, kayak map filters, or kayak-specific facility rendering was added.
- Kayak corridors remain approximate planning references, not navigation-grade tracks.
- The raw source snapshot is generated import input, not a hand-authored editing format; Slice 16 adds smaller source shards for future kayak authoring.
- Default import mode is snapshot-if-missing. Refreshing snapshots from `research/**` is explicit: run `npm run data:kayak:import -- --refresh-source`, review `data/source/kayaking/source-manifest.json`, then run `npm run data:build`.
- Facility normalization only deduplicates exact IDs and keeps semantically different facility/parking records separate.
- Browser/network request interception was not part of this slice; Slice 13 adds it.

Recommended next work:

1. Add a typed kayak branch before allowing `loadLibraryIndex` to return kayak records to the visible app.
2. Build a kayaking overview map from `public/data/overviews/kayaking.geojson`, preserving not-for-navigation warnings.
3. Build kayak detail components separately from hiking details so free-text facility notes, rentals, launch/parking context, and safety caveats are not forced through hiking UI assumptions.
4. Later, split the kayak source snapshot into smaller reviewable source shards if humans will maintain it directly.

## Slice 10: Typed Kayak Runtime Branch And Overview

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 9.

Done:

- `src/data/library.ts` now returns all `library-index.json` records instead of filtering kayak records out at load time.
- Added typed `KayakTripIndexItem`, `KayakTrip`, kayak overview properties, and generic library overview types in `src/types.ts`.
- Added `src/utils/libraryItem.ts` with shared item-label/type guards so list and overview rendering no longer assume hiking-only `location.label` or `recommendedTime` fields.
- The sidebar can list kayaking records using `locationLabel`, nullable distance, and `recommendedTimes`.
- `ActivityOverview` and `OverviewMap` now accept generic overview data and can render both hiking and kayaking overview GeoJSON.
- The app loads `public/data/overviews/hiking.geojson` or `public/data/overviews/kayaking.geojson` based on the active activity.
- Kayaking overview displays all imported kayak trips with an in-map not-for-navigation warning.
- Selecting a kayak trip loads its app-owned detail JSON through the shared detail loader.
- Added a kayak-specific detail view with route corridor rendering, not-for-navigation warning, basic facts, description, safety/access/rules/research notes, and source links.
- Kayak route rendering reuses the route geometry cache and Leaflet lifecycle hook introduced earlier.
- `npm run runtime:probe` now asserts kayak records remain in `library-index.json`, `public/data/overviews/kayaking.geojson` matches those records, kayak detail loading goes through the shared loader, and kayak runtime paths do not point at research-only inputs.

Not done:

- Kayak-specific filters are not implemented yet; the kayaking sidebar currently shows all imported kayak trips.
- Kayak facility layers, parking/rental icons, and facility map filters are not implemented yet.
- The kayak detail view is intentionally compact and does not yet render linked facility records from `public/data/kayak-facilities.json`.
- The same starred-route localStorage store is still shared between hiking and kayaking.
- Kayak corridors remain approximate planning references, not navigation-grade tracks.
- Browser/network request interception is still not in place.

Known warnings and follow-up:

- At the time of this slice, `npm run data:validate` still reported non-blocking hiking endpoint-gap warnings for Roslagsleden and Sörmlandsleden; Slice 17 later resolved them.
- Next slice should add kayak facility loading/rendering from `public/data/kayak-facilities.json`, while keeping free-text facility notes separate from hard facility references.
- After kayak facility rendering, add kayak-specific filters for duration, water zone/exposure, rental availability, launch/parking, and confidence/caveats.
- Before removing any compatibility data, keep `npm run runtime:probe` green for sharded hiking trail-system loading.

Recommended next work:

1. Add kayak facility/rental/parking lookup loading and render linked records in the kayak detail view.
2. Add a kayak facility layer to the kayak map with category-specific icons and toggles.
3. Add compact kayak filters without showing hiking-only distance/time controls in kayaking mode.

## Slice 11: Kayak Facility Runtime Rendering

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 10.

Done:

- Added typed `KayakFacility` / `KayakFacilityType` contracts in `src/types.ts`.
- Added `loadKayakFacilities()` in `src/data/library.ts` for the app-owned `public/data/kayak-facilities.json` runtime file.
- Kayak mode now loads kayak facilities lazily when the kayaking activity is active.
- Kayak trip details now resolve linked facility records from explicit `facilityRefs` / `rentalRefs` and facility `routeIds`.
- Free-text `facilityNotes` remain separate from structured facility records.
- Kayak trip details now render linked rental, launch, parking, transport, campsite, and harbor records with source links when available.
- Kayak trip maps now render linked facility markers using category-specific icons and marker colors.
- Added compact kayak facility map toggles for linked facility types with coordinates.
- `npm run data:validate` now rejects unknown kayak facility `type` values used by the typed UI labels/icons.
- Kayak facility descriptions are normalized to strings during import and validated/probed as strings for runtime popup rendering.
- `npm run runtime:probe` now exercises the kayak facility loader and reports facility record/link counts.

Not done:

- Kayak overview map does not yet show facility markers; facilities are detail-map only.
- Kayak-specific sidebar/list filters are still not implemented.
- Facility records are not grouped into richer rental/parking/launch workflows yet.
- Facility popups show compact descriptions and access notes only; they do not expose every source/follow-up field.
- The shared starred-route localStorage store is still used for hiking and kayaking.
- Browser/network request interception is still not in place.

Known warnings and follow-up:

- At the time of this slice, `npm run data:validate` still reported non-blocking hiking endpoint-gap warnings for Roslagsleden and Sörmlandsleden; Slice 17 later resolved them.
- A future slice should add kayak-specific filters for duration, water zone/exposure, rental availability, launch/parking, and confidence/caveats.
- A future slice should decide whether kayak overview maps need optional facility layers or whether facilities should stay detail-only.
- Keep kayak route warnings visible whenever facility UX grows; linked services must not imply navigation-grade route geometry.

Recommended next work:

1. Add compact kayak sidebar filters that use kayak fields instead of hiking-only distance/time assumptions.
2. Add a browser/network smoke harness or request interception for the runtime data paths.
3. Consider splitting kayak source snapshots into smaller reviewable source shards before expanding authoring.

## Slice 12: Compact Kayak Sidebar Filters

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 11.

Done:

- Kayaking mode now has its own sidebar filters instead of hiding all filters.
- Kayak filters use kayak-compatible fields: search text, area/location label, duration, and linked services.
- Duration filtering supports half-day, day hike, weekend, and multi-day kayak trips.
- Service filtering uses app-owned `public/data/kayak-facilities.json` route links plus facility `type`, `categories`, and `serviceTags` for rental, launch, parking, and overnight services.
- Hiking filters remain unchanged and still use the hiking distance/time controls.
- Activity switching resets both hiking and kayak filter state so a hidden filter does not leak across modes.

Not done:

- Kayak filters do not include map confidence or caveat severity. Water zone, exposure, and route research confidence are covered by Slice 14.
- Service filtering uses facility `routeIds` and service metadata from the public facility store; it does not fetch each kayak detail just to read `facilityRefs` / `rentalRefs`.
- Facility filter options are select controls, not chips or counts.
- Browser/network request interception is still not in place.

Known warnings and follow-up:

- At the time of this slice, `npm run data:validate` still reported non-blocking hiking endpoint-gap warnings for Roslagsleden and Sörmlandsleden; Slice 17 later resolved them.
- A future slice should add caveat/follow-up workflows if `hasFollowup` proves useful in the compact index contract.
- Keep service filtering tied to app-owned runtime data; do not read `research/**` or source snapshots at runtime.

Recommended next work:

1. Use the Slice 14 compact metadata contract as the basis for any future caveat workflow.
2. Consider splitting kayak source snapshots into smaller reviewable source shards before expanding authoring.

## Slice 13: Browser Runtime Request Probe

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 12.

Done:

- Added dependency-free live browser probing in `scripts/probe-browser-runtime.mjs`.
- Added `npm run runtime:browser-probe`.
- The probe starts a Vite server programmatically, launches an installed Chrome/Chromium-family browser through CDP, and records local network requests.
- The probe clicks through hiking overview, Roslagsleden, Sörmlandsleden, kayaking overview, and the Långholmen kayak detail route.
- It asserts `library-index.json`, hiking overview, trail-system initializer shards, selected section detail shards, kayaking overview, kayak facilities, kayak detail JSON, and kayak route GeoJSON are requested.
- It fails if the live app requests `hikes-index.json`, legacy all-in-one trail-system JSON, `research/**`, `data/source/**`, source snapshots, candidate trail research, or kayak seed research paths.
- It fails on 4xx/5xx responses for local `/data/**` and `/routes/**` runtime payloads.
- It caught a Leaflet teardown exception while switching maps; `useLeafletMap` now disables map animations, stops the map, detaches listeners, and removes the map during cleanup.
- Programmatic map `setView` / `fitBounds` calls now use non-animated transitions so pending zoom work does not outlive unmounted map panes.
- Browser/CDP, browser profile, and Vite cleanup now run independently so one cleanup problem does not skip the others.

Not done:

- The probe requires an installed Chrome/Chromium-family browser. Set `CHROME_BIN` or `BROWSER_BIN` if the default search paths do not find one.
- It is not a full visual regression suite and does not take screenshots.
- It exercises representative trail systems and one kayak detail route, not every library item.
- It does not yet assert map tile requests or third-party map availability; runtime data contract paths are the scope.
- It does not replace the mocked `npm run runtime:probe`; keep both because they catch different contract failures.

Known warnings and follow-up:

- At the time of this slice, `npm run data:validate` still reported non-blocking hiking endpoint-gap warnings for Roslagsleden and Sörmlandsleden; Slice 17 later resolved them.
- CI may need a documented Chromium install or `CHROME_BIN` configuration before this can be required in automated checks.
- A future browser probe could add a route-cache counter, screenshot smoke, or request assertions for kayak service-filter interactions.

Recommended next work:

1. Use the Slice 14 compact metadata contract as the basis for any future caveat workflow.
2. Consider splitting kayak source snapshots into smaller reviewable source shards before expanding authoring.
3. Decide whether the browser runtime probe should become a required CI gate once browser availability is standardized.

## Slice 14: Compact Kayak Metadata Filters

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 13.

Done:

- Promoted the smallest currently useful kayak metadata into `public/data/library-index.json` kayak records: `waterZone`, `archipelagoRegion`, `exposureLevel`, `routeConfidence`, `mapConfidence`, and `hasFollowup`.
- Kept these fields compact enough for list/filter use and mirrored them onto `public/data/overviews/kayaking.geojson` feature properties through the existing overview generator.
- Kept kayak index search compact by using normalized `searchText` only; kayak records do not duplicate the same string into `normalizedSearchText`.
- Kept the kayaking overview compact by omitting list-search fields and `tags` from overview feature properties.
- Added `KayakWaterZone`, `KayakExposureLevel`, and `KayakRouteConfidence` shared types for the promoted contract fields.
- Added importer exposure classification from existing source metadata; mixed sheltered/exposed caveats now classify as `mixed`, while easy inner routes with explicit sheltered tags remain `sheltered`.
- Extended `npm run data:validate` so kayak index records, detail files, and overview features validate the promoted fields and so index records must match their detail data.
- Extended `npm run runtime:probe` so the runtime loader checks kayak index metadata against selected detail files and overview properties.
- Added kayak sidebar filters for water zone, exposure, and route research confidence. These filters use the compact index fields and do not fetch every kayak detail file.
- Reset the new kayak filters on activity changes and clear-filter actions.
- Added water zone, exposure, route research confidence, and map confidence to kayak detail facts so selected-route metadata is visible without opening source files.

Not done:

- No map-confidence filter was added; all current imported kayak routes have medium map confidence, so the UI would not yet help users narrow the set.
- No caveat-severity or follow-up filter was added. `hasFollowup` is present in the compact contract for future workflows, but the UI does not yet expose it.
- No kayak overview facility layer was added; linked facilities remain detail-map only.
- No navigation-grade kayak geometry was introduced. Kayak routes remain approximate, not-for-navigation waypoint corridors.
- No kayak source snapshot sharding was done in this slice.
- Browser interaction coverage for the new filters is covered by Slice 15.

Known warnings and follow-up:

- At the time of this slice, `npm run data:validate` still reported non-blocking hiking endpoint-gap warnings for Roslagsleden and Sörmlandsleden; Slice 17 later resolved them.
- `exposureLevel` is derived heuristically from current source fields such as water zone, exposure text, difficulty, and coverage tags. Future source-authoring work can make this field explicit if humans need tighter editorial control.
- `hasFollowup` can support a later caveat/follow-up filter, but that should be designed with clear user-facing wording so research caveats do not look like route safety ratings.
- Slice 15 sets the water/exposure/confidence filters by label and asserts that no kayak detail files are fetched solely to filter the list.
- Keep kayak source splitting separate from runtime filtering; source snapshots are still import input, not runtime input.

Recommended next work:

1. Kayak source snapshots are now split into smaller reviewable app-owned source shards by Slice 16.
2. Slice 19 later decided `hasFollowup` should stay an internal audit/detail signal for now.

## Slice 15: Kayak Filter Browser Interaction Probe

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 14.

Done:

- Extended `scripts/probe-browser-runtime.mjs` so the live browser probe derives expected kayak filter counts from generated `public/data/library-index.json`.
- The browser probe now sets the kayaking Water, Exposure, and Confidence selects by label in the actual UI and dispatches their change events.
- The probe verifies the sidebar route count matches the generated compact metadata after representative filter combinations, including an exposure-only assertion.
- The probe waits for browser requests to settle, then asserts filter changes do not request `public/data/kayak-trips/**` detail JSON or `public/routes/kayaking/**` route GeoJSON.
- The probe still exercises hiking overview, sharded trail-system selection, kayaking overview, kayak facility loading, kayak detail loading, and forbidden runtime paths.

Not done:

- This is still not a screenshot or visual regression test.
- The probe covers representative filter combinations, not every possible select value.
- It does not test service filters, map hover styling, or every kayak detail route.
- It does not run without a local Chrome/Chromium-family browser; CI still needs `CHROME_BIN` or a standardized browser install before making it mandatory.

Known warnings and follow-up:

- At the time of this slice, `npm run data:validate` still reported non-blocking hiking endpoint-gap warnings for Roslagsleden and Sörmlandsleden; Slice 17 later resolved them.
- The browser probe is now doing more UI work, so selector changes in the sidebar can break it even when the runtime contract is intact. Keep the failure messages descriptive when adding more interactions.
- A future probe can add service-filter coverage or screenshot smoke once the kayak service/facility UX grows.

Recommended next work:

1. Kayak source snapshots are now split into smaller reviewable app-owned source shards by Slice 16.
2. Slice 19 later decided `hasFollowup` should stay an internal audit/detail signal for now.
3. Decide whether the browser runtime probe should become a required CI gate once browser availability is standardized.

## Slice 16: Kayak Source Shards

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 15.

Done:

- Added reviewable app-owned kayak source shards under `data/source/kayaking/routes/`, `data/source/kayaking/facilities/`, `data/source/kayaking/parking/`, and `data/source/kayaking/metadata.json`.
- Updated `scripts/import-kayak-data.mjs` so normal imports read those source shards instead of the many-record `source-snapshot/kayak-map-ready.dataset.json`.
- Kept `data/source/kayaking/source-snapshot/**` as raw refresh input only. Normal `npm run data:build` does not overwrite existing reviewable shards.
- Normal imports now fail on partial source-shard state instead of silently rebootstraping reviewed shards from the raw snapshot.
- Kept explicit refresh behavior: `npm run data:kayak:import -- --refresh-source` copies from `research/**` and bootstraps shards from the refreshed snapshot.
- Parking source records live only under `data/source/kayaking/parking/`; the importer treats parking shards as authoritative for parking IDs before generating the combined public facility store.
- Updated `data/source/kayaking/source-manifest.json` to list source shard directories and per-record shard paths.
- Updated generated kayak trip `research.sourceSnapshotPath` values to point at each trip's route source shard.
- Updated the kayaking overview `generatedFrom` value to `data/source/kayaking/source-manifest.json`.
- Extended `npm run data:validate` to validate kayak source shard directories, metadata, manifest shard paths, route shard IDs versus generated kayak trip IDs, source shard filenames, cross-kind parking duplicates, and generated trip source-shard references.
- Extended `npm run runtime:probe` to reject app-owned `data/source/**`, `source-snapshot`, and research-like paths in mocked runtime item/request paths, matching the live browser probe boundary.

Not done:

- The raw source snapshot files are still retained for reproducible refreshes and diffing against research input.
- No hand-authored editorial changes were made to shard contents; this slice only split the existing snapshot into reviewable files and moved importer reads to those shards.
- The public kayak runtime contract still uses generated files under `public/data/**` and `public/routes/**`; runtime code still must not read `data/source/**`.
- The field name `research.sourceSnapshotPath` was preserved for compatibility even though it now points at a reviewable route source shard.
- No kayak UI changes were made.

Known warnings and follow-up:

- At the time of this slice, `npm run data:validate` still reported non-blocking hiking endpoint-gap warnings for Roslagsleden and Sörmlandsleden; Slice 17 later resolved them.
- Future kayak authoring should edit the shard files, then run `npm run data:build`; it should not edit the raw `source-snapshot/kayak-map-ready.dataset.json` unless intentionally refreshing from research input.
- If a shard directory is accidentally left partial, normal import should fail; restore the missing shards or intentionally run `npm run data:kayak:import -- --refresh-source`.
- The source shard schema is still implicit in importer/validator code. Add JSON Schema only if humans begin editing these records frequently.
- Slice 19 later decided `hasFollowup` should stay an internal audit/detail signal for now.

Recommended next work:

1. Slice 19 later decided `hasFollowup` should stay an internal audit/detail signal for now.
2. Decide whether the browser runtime probe should become a required CI gate once browser availability is standardized.

## Slice 17: Hiking Endpoint Topology Cleanup

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 16.

Done:

- Resolved the remaining hiking endpoint-topology warnings reported by `npm run data:validate`.
- Confirmed the warnings were route-direction mismatches rather than missing route files or broken section references.
- Reversed seven hiking route GeoJSON geometries so adjacent sections connect in declared stage order:
  - `public/routes/roslagsleden-stage-4.geojson`
  - `public/routes/roslagsleden-stage-6.geojson`
  - `public/routes/sormlandsleden-stage-3.geojson`
  - `public/routes/sormlandsleden-stage-5.geojson`
  - `public/routes/sormlandsleden-stage-6.geojson`
  - `public/routes/sormlandsleden-stage-9.geojson`
  - `public/routes/sormlandsleden-stage-10.geojson`
- Swapped the matching `endpointCoordinates.start` / `endpointCoordinates.end` values in the then-current hiking source aggregate.
- Regenerated the public hiking index and trail-system compatibility/shard outputs so the source and runtime contracts stay aligned.
- Updated the current documentation boundary so older endpoint-warning notes are marked as historical.

Not done:

- No hiking route paths were redrawn, simplified, or snapped to a different source. This slice only fixed section direction and endpoint metadata.
- No declared hiking distances were recalculated.
- No hiking UI behavior changed.
- No kayak source, runtime, or UI behavior changed.

Known warnings and follow-up:

- `npm run data:validate` now passes without known warnings on the current snapshot.
- The affected GeoJSON files show large line-order diffs because reversing a route reverses every coordinate in that file.
- Future route imports should preserve stage direction and update `endpointCoordinates` with the generated route direction so endpoint-topology validation stays quiet.

Recommended next work:

1. Continue with responsive/accessibility/print polish and a fresh UI test pass against the hiking-plus-kayak app.
2. Slice 19 later decided `hasFollowup` should stay an internal audit/detail signal for now.
3. Decide whether the browser runtime probe should become a required CI gate once browser availability is standardized.

## Slice 18: Responsive, Accessibility, And Print Polish

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 17.

Done:

- Added explicit pressed-state semantics for route-builder section rows and optional route-group buttons with `aria-pressed`.
- Added expanded-state semantics for hiking facility and transit disclosure buttons with `aria-expanded`.
- Added pressed-state semantics for hiking and kayaking map facility filter chips with `aria-pressed`.
- Kept map filter chip accessible names stable while `aria-pressed` carries the visible on/off state.
- Kept hiking facility and transit accordion content mounted while collapsed so print mode can reveal those details.
- Strengthened keyboard focus visibility for buttons, links, and select controls while preserving the existing search-field focus wrapper.
- Improved touch target sizing for coarse-pointer and small-screen layouts, including activity switches, selects, primary/secondary actions, facility toggles, section rows, star buttons, map filter chips, and Leaflet zoom controls.
- Added print styles that hide interactive sidebars/maps/controls, expand route-builder section lists, remove scroll clipping, and keep route details/facility/source content printable.
- Extended `npm run runtime:browser-probe` with UI polish checks for search accessible names, route-builder pressed states, non-focusable Leaflet map containers, mounted printable accordions, and print-media section-list expansion/map hiding.
- Ran two read-only validation-agent passes for the slice and fixed their findings.

Not done:

- No full visual regression suite or screenshot comparison was added.
- No static map image or printable map replacement was added; print mode favors text route/trip details and source/facility content over interactive maps.
- No new below-fold lazy map-loading behavior was added in this slice.
- No kayak caveat/follow-up filter was added.
- No browser probe CI setup was added; the probe still depends on an installed Chrome/Chromium-family browser.

Known warnings and follow-up:

- `npm run runtime:browser-probe` now covers a few accessibility and print regressions, but it is still a smoke probe rather than a complete WCAG or responsive QA pass.
- Print mode intentionally hides maps. Add a static printable map/export only if product requirements call for one.
- Touch target sizing is CSS-only; future screenshot/manual checks should confirm the roomier controls still feel balanced on very dense mobile states.
- Validation-agent findings in this slice were addressed before handoff: closed accordions now print, map filter labels are stable, the browser probe waits for Leaflet, and the context-route assertion forces a range that renders context buttons.

Recommended next work:

1. Run or update a fresh manual UI test report against the hiking-plus-kayak app, including 320px/390px mobile, 200% text zoom, print preview, and keyboard-only navigation.
2. Slice 19 later decided `hasFollowup` should stay an internal audit/detail signal for now.
3. Decide whether the browser runtime probe should become a required CI gate once browser availability is standardized.

## Slice 19: Kayak Follow-Up Signal Decision

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 18.

Done:

- Audited the generated kayak index and confirmed all 34 current kayak records have `hasFollowup: true`.
- Decided `hasFollowup` should stay an internal audit/detail signal for now, not a visible sidebar filter.
- Preserved `hasFollowup` in `public/data/library-index.json` and overview feature properties so validation, probes, and future editorial workflows can still use it.
- Kept detailed research notes visible on kayak detail pages through the existing `Research Notes` block.
- Extended `npm run runtime:browser-probe` to fail if a kayak follow-up filter appears in the sidebar while this decision is active.
- Updated this implementation-status document so future agents can see that the follow-up-filter decision is resolved for the current data set.

Not done:

- No kayak follow-up/caveat filter was added because it would currently match every kayak route and would not narrow the list.
- No caveat severity model or user-facing caveat taxonomy was introduced.
- No kayak source records were edited.
- No generated runtime JSON contract was changed.

Known warnings and follow-up:

- Revisit this decision only after kayak source authoring distinguishes routes with actionable follow-up from routes with ordinary research notes.
- If future data has a meaningful mix of `hasFollowup: true` and `false`, design user-facing wording carefully so the filter does not read like a safety rating.
- `hasFollowup` remains validated as a compact boolean signal and should continue matching the generated detail research fields.

Recommended next work:

1. Run or update a fresh manual UI test report against the hiking-plus-kayak app, including 320px/390px mobile, 200% text zoom, print preview, and keyboard-only navigation.
2. Slice 20 later split CI checks into portable and browser-enabled gates.

## Slice 20: CI Gate Split For Browser Probe

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 19.

Done:

- Added `npm run ci:check` as the portable required gate for CI runners without guaranteed Chrome/Chromium.
- Added `npm run ci:check:browser` as the browser-enabled gate that runs the portable checks plus `npm run runtime:browser-probe`.
- Kept `npm run runtime:browser-probe` strict; it still fails if no Chrome/Chromium-family browser can be found.
- Documented the browser requirement and `CHROME_BIN` / `BROWSER_BIN` escape hatch in the current boundary notes.
- Resolved the milestone question by making browser-probe gating explicit without requiring every environment to have a browser installed.

Not done:

- No `.github/workflows/**` CI file was added because this worktree does not currently have a project-owned GitHub Actions workflow.
- No bundled browser dependency such as Playwright was added.
- No screenshot regression suite was added.

Known warnings and follow-up:

- Browser-enabled CI still needs a runner image with Chrome/Chromium or explicit `CHROME_BIN` / `BROWSER_BIN`.
- If a GitHub Actions workflow is added later, wire `npm run ci:check` into the default job and `npm run ci:check:browser` into a browser-capable job.
- `ci:check` validates committed/generated runtime data but does not run `npm run data:build`; agents should still run `data:build` before handoff when source data, generator code, or public data contracts changed.

Recommended next work:

1. Slice 21 later added a repeatable scripted UI smoke report for the hiking-plus-kayak app.
2. Consider adding a project-owned CI workflow once repository hosting conventions are clear.

## Slice 21: Scripted UI Smoke Report

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 20.

Done:

- Added `npm run ui:smoke`.
- Added `scripts/generate-ui-smoke-report.mjs`, a dependency-free Chrome/CDP smoke runner that starts Vite, exercises representative hiking and kayaking flows, and writes a Markdown report.
- Generated `docs/test-reports/hike-ui-smoke-report-2026-04-28.md`.
- `npm run ui:smoke` exits non-zero when smoke findings are present, after writing the report.
- The smoke report covers hiking overview, Sörmlandsleden builder, Sörmlandsleden info, kayaking overview, one kayak detail route, 200% text zoom, print media, search names, activity switch state, route-button state, disclosure state, and Leaflet focus noise.
- The smoke report records failed `/data/**` and `/routes/**` responses as findings and reports third-party tile request counts separately from local runtime requests.
- Fixed responsive builder overflow exposed by the first smoke run by using a one-column route-builder workspace from 901px through 1120px and allowing context-route metadata to wrap.
- Kept Leaflet internal tile/SVG scroll-width noise visible in the report as overflow candidates while counting only actionable non-Leaflet page overflow as a smoke finding.
- Current generated smoke report completed with zero findings.

Not done:

- No screenshot or pixel-regression suite was added.
- No manual screen-reader test was run.
- The smoke report does not test every route, every filter combination, or every viewport from the older parallel UI reports.
- No project-owned CI workflow was added for `ui:smoke`.

Known warnings and follow-up:

- `npm run ui:smoke` requires Chrome/Chromium; use `CHROME_BIN` or `BROWSER_BIN` if auto-discovery fails.
- The report is intentionally a fast regression snapshot, not a replacement for manual keyboard/screen-reader and visual QA.
- Leaflet internals can still appear in raw overflow candidates; the actionable finding threshold ignores elements inside `.leaflet-container`.
- The route-builder one-column breakpoint now extends through 1120px to cover the narrow residual band above 1100px.

Recommended next work:

1. Consider adding a project-owned CI workflow once repository hosting conventions are clear.
2. Decide whether `npm run ui:smoke` should become part of the browser-capable CI lane after the team is comfortable with its runtime and coverage.

## Slice 22: Below-Fold Mobile Map Deferral

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 21.

Done:

- Added a small `DeferredMapMount` wrapper for non-overview map instances.
- Deferred trail-system info maps, route-builder maps, standalone hike detail maps, and kayak detail maps on screens at or below 620px until their reserved map area is within 220px of the viewport.
- Kept desktop and tablet behavior immediate so existing route/detail map workflows still load normally outside the narrow mobile layout.
- Kept activity overview maps immediate; they remain the primary first-screen navigation surface for hiking and kayaking.
- Added a reserved `.route-map-deferred` placeholder so below-fold map deferral does not collapse the layout before Leaflet mounts.
- Extended `npm run ui:smoke` with a mobile Sörmlandsleden builder assertion that no `/routes/**` GeoJSON requests or OpenStreetMap tile requests are triggered before the below-fold builder map approaches the viewport.
- Fixed mobile compact-facts wrapping and filter-count badge sizing discovered while validating this slice at 390px and 200% text zoom.
- Regenerated `docs/test-reports/hike-ui-smoke-report-2026-04-28.md`; the current report completes with zero findings.

Not done:

- No route-level virtual scrolling or route-geometry chunking was added.
- No screenshot or performance-budget suite was added.
- No desktop map deferral was added.
- No user-facing map reveal control or static map preview was added.
- No public runtime JSON contract was changed.

Known warnings and follow-up:

- Mobile map deferral uses `IntersectionObserver`; browsers without it fall back to immediate map mounting.
- Deferred maps mount once revealed and are not unmounted again when scrolled away.
- The deferral smoke check covers the representative mobile Sörmlandsleden route-builder path, not every detail page or every viewport.
- `npm run ui:smoke` remains browser-dependent and should use `CHROME_BIN` / `BROWSER_BIN` when auto-discovery does not find Chrome/Chromium.

Recommended next work:

1. Consider adding a project-owned CI workflow once repository hosting conventions are clear.
2. Decide whether `npm run ui:smoke` should join the browser-capable CI lane after the team is comfortable with its runtime and coverage.
3. Slice 23 later added selected/context route loading and browser request-budget guards for trail-system maps.

## Slice 23: Selected/Context Trail-System Route Loading

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 22.

Done:

- Removed the post-render background fetch of every unselected trail-system section from `TrailSystemMap`.
- Kept selected main-route sections and selected related/context sections rendered through the shared route geometry cache.
- Kept facility markers, commute markers, route-fit behavior, route-load warnings, and Leaflet lifecycle behavior intact.
- Kept Start/End markers anchored to the main selected route even when related/context branches are selected.
- Avoided relabeling endpoints after partial route-geometry failures by deriving markers from the first/last main-route sections, with endpoint-coordinate fallback when route geometry is unavailable.
- Kept hiking overview maps as the full-network orientation layer instead of recreating that full-network geometry work inside each detail map.
- Added a `npm run ui:smoke` hiking-route request budget assertion that selects a related/context route; the current representative flow now observes 9 hiking `/routes/**` requests, down from the earlier all-background-route burst.
- Added a `npm run runtime:browser-probe` unique hiking-route request budget and context-route toggle so trail-system background route loading fails the browser gate if it returns.
- Regenerated `docs/test-reports/hike-ui-smoke-report-2026-04-28.md`; the current report completes with zero findings.

Not done:

- No viewport-based route geometry loading or route-level virtual scrolling was added.
- No mini overview inset was added to detail maps; users should use the activity overview map for full-network orientation.
- No exact per-route performance budget file was introduced; the budget lives in the two browser scripts for now.
- No public runtime JSON contract was changed.

Known warnings and follow-up:

- The browser budgets are intentionally generous smoke thresholds, not precise performance budgets.
- Detail maps no longer draw grey background sections; this is deliberate to keep detail maps focused on the selected route and facilities.
- Facility-filter changes still redraw selected route layers from cached geometry; they should not create new route network requests.
- Validation-agent findings in this slice were addressed before handoff: probes now toggle a context route, the mobile deferral check waits for late requests before passing, route budgets separate hiking and kayak payloads, and Start/End markers stay tied to the main route.
- `npm run ui:smoke` and `npm run runtime:browser-probe` remain browser-dependent and need Chrome/Chromium or `CHROME_BIN` / `BROWSER_BIN`.

Recommended next work:

1. Consider adding a project-owned CI workflow once repository hosting conventions are clear.
2. Decide whether `npm run ui:smoke` should join the browser-capable CI lane after the team is comfortable with its runtime and coverage.
3. Slice 24 starts the map extraction with the deferred mount wrapper; continue extracting route/detail map components only in small behavior-preserving slices.

## Slice 24: Deferred Map Mount Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 23.

Done:

- Moved the mobile below-fold map deferral wrapper from `src/main.tsx` into `src/map/DeferredMapMount.tsx`.
- Kept the same `max-width: 620px` deferral boundary, `220px` preloading margin, `IntersectionObserver` behavior, media-query fallback, and `.route-map route-map-deferred` placeholder markup.
- Updated `src/main.tsx` to import the wrapper from `src/map/**` while leaving route/detail map behavior unchanged.
- Kept this slice limited to ownership cleanup; no runtime data contract, visual design, or request-budget behavior changed.

Not done:

- No route map, trail-system map, kayak map, facility layer, marker layer, or route layer extraction was done.
- No shared layer helper API was introduced.
- No CSS selector or public data path changed.

Known warnings and follow-up:

- `src/main.tsx` still owns large map components and many map-adjacent helpers; extract them only in small slices with browser probes after each move.
- Future extraction should avoid changing route request budgets, Start/End marker semantics, and mobile deferral behavior in the same slice.
- The deferral component still depends on browser APIs and intentionally falls back to immediate rendering when `IntersectionObserver` is unavailable.

Recommended next work:

1. Slice 25 extracts standalone `RouteMap`; continue only with similarly small behavior-preserving map extraction slices.
2. Keep `TrailSystemMap` extraction separate from any route-layer helper refactor.
3. Consider adding a project-owned CI workflow once repository hosting conventions are clear.

## Slice 25: Standalone Hike Route Map Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 24.

Done:

- Moved the standalone hike `RouteMap` component from `src/main.tsx` into `src/map/RouteMap.tsx`.
- Added `src/map/types.ts` for the shared `HikeMapStatus` type used by standalone hike and kayak route detail status state.
- Kept existing standalone hike map behavior unchanged: marker-only fallback, cached route geometry loading, Start/End markers from the first route line, route-fit behavior, route load warning text, and layer cleanup.
- Updated `src/main.tsx` to import `RouteMap` and `HikeMapStatus` while leaving `TrailSystemMap` and `KayakTripMap` in place.
- Kept this slice limited to ownership cleanup; no runtime data contract, request budget, or visual design changed.

Not done:

- No `TrailSystemMap`, `KayakTripMap`, facility layer, marker layer, or shared route-layer helper extraction was done.
- No route drawing semantics were changed; standalone route markers still use the first `LineString` exactly as before.
- No CSS selectors, browser probes, or public data paths changed.

Known warnings and follow-up:

- `src/main.tsx` still owns the complex trail-system and kayak map components plus map-adjacent helper functions.
- The browser gates cannot currently mount standalone hike `RouteMap` through real app data because the generated library index has zero `itemType: "hike"` records; Slice 25 is covered by typecheck/build plus review, not by a real standalone-hike browser flow.
- Future `TrailSystemMap` extraction should preserve selected/context request budgets and main-route Start/End marker semantics from Slice 23.
- Future `KayakTripMap` extraction should preserve the not-for-navigation warning, facility filtering, and kayak route/facility request boundaries.

Recommended next work:

1. Slice 26 extracts `KayakTripMap`; continue only with similarly small behavior-preserving map extraction slices.
2. Keep `TrailSystemMap` extraction separate from any route-layer helper refactor.
3. Consider adding a project-owned CI workflow once repository hosting conventions are clear.

## Slice 26: Kayak Trip Map Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 25.

Done:

- Moved kayak detail map rendering from `src/main.tsx` into `src/map/KayakTripMap.tsx`.
- Moved shared kayak facility map helpers into `src/map/kayakFacilities.tsx`: facility labels, display order, icons, coordinate guard, marker class, and popup HTML.
- Updated `src/main.tsx` to import the extracted kayak map and shared kayak facility helpers for sidebar chips, detail facility lists, service sorting, and mapped-facility counts.
- Kept existing kayak map behavior unchanged: cached route corridor loading, facility marker filtering, popup content, route/facility bounds fitting, marker fallback on route-load failure, warning display, status callbacks, and layer cleanup.
- Kept this slice limited to ownership cleanup; no runtime data contract, request budget, or visible design changed.

Not done:

- No `TrailSystemMap`, hiking facility layer, commute marker layer, or shared generic route-layer helper extraction was done.
- No kayak overview facility layer or richer caveat workflow was added.
- No kayak source/runtime JSON was changed.

Known warnings and follow-up:

- `src/main.tsx` still owns `TrailSystemMap` and hiking-specific map helper functions.
- Future `TrailSystemMap` extraction should preserve selected/context request budgets, main-route Start/End marker semantics, facility-filter behavior, and commute marker behavior.
- `src/map/kayakFacilities.tsx` intentionally contains small HTML escaping for Leaflet popup markup; keep popup markup sanitized if new facility fields are added.

Recommended next work:

1. Slice 27 extracts hiking facility/transit map helpers; continue only with similarly small behavior-preserving map extraction slices.
2. Keep any future trail-system extraction separate from route request budget changes.
3. Consider adding a project-owned CI workflow once repository hosting conventions are clear.

## Slice 27: Hiking Facility And Transit Helper Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 26.

Done:

- Moved hiking facility and transit helpers from `src/main.tsx` into `src/map/hikingFacilities.tsx`.
- Centralized hiking facility labels, default facility type order, facility category groups, facility icons, off-route/proximity helpers, access-point expansion, commute stop labels, and Leaflet popup HTML escaping.
- Updated `src/main.tsx` to import those helpers for `TrailSystemMap`, `FacilityList`, `FacilityMapFilters`, and `TransitAccessList`.
- Added shared helper types for `FacilityType` and `SelectedTrailAccessPoint`.
- Extended `npm run runtime:browser-probe` to assert hiking facility markers, commute markers, facility filter labels/titles, and facility filter toggling after the helper move.
- Kept this slice limited to ownership cleanup; no runtime data contract, route request budget, visual design, or map behavior changed.

Not done:

- No `TrailSystemMap` component extraction was done.
- No route-layer, facility-marker-layer, commute-marker-layer, or generic popup helper API was introduced.
- No hiking or kayak data files were changed.

Known warnings and follow-up:

- `src/main.tsx` still owns the `TrailSystemMap` component and route-builder state.
- The new helper module contains JSX icons and popup escaping because the current UI still shares the helpers between map markers and non-map facility controls.
- Future `TrailSystemMap` extraction should preserve selected/context request budgets, main-route Start/End marker semantics, facility-filter behavior, and commute marker behavior.
- Validation-agent findings in this slice were addressed before handoff: the browser probe now checks the moved helper behavior directly.

Recommended next work:

1. Slice 28 extracts `TrailSystemMap`; continue with route-layer/facility-layer helper extraction only if it stays behavior-preserving.
2. Keep any future trail-system map behavior work separate from route request budget changes.
3. Consider adding a project-owned CI workflow once repository hosting conventions are clear.

## Slice 28: Trail System Map Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 27.

Done:

- Moved `TrailSystemMap` from `src/main.tsx` into `src/map/TrailSystemMap.tsx`.
- Kept route-builder state, route-group selection, selected/context section derivation, facility type state, and section-detail loading in `src/main.tsx`.
- Preserved selected/context route geometry loading through the shared route cache, including the Slice 23 request-budget behavior.
- Preserved main-route Start/End marker anchoring, endpoint-coordinate fallback after partial route failures, selected-route bounds fitting, facility markers, commute markers, warning text, and layer cleanup.
- Kept this slice limited to component ownership cleanup; no runtime data contract, request budget, or visible design changed.

Not done:

- No route-layer, facility-marker-layer, commute-marker-layer, or generic popup helper API was introduced.
- No trail-system route request strategy changed.
- No hiking or kayak data files were changed.

Known warnings and follow-up:

- `TrailSystemMap.tsx` still contains route drawing, facility marker drawing, commute marker drawing, popup markup, and bounds fitting in one component; those can be split later if needed.
- The component has a private distance formatter for commute popup text so this extraction does not pull broader route-builder formatting helpers out of `src/main.tsx`.
- Future behavior changes should preserve selected/context request budgets and main-route Start/End marker semantics.

Recommended next work:

1. Consider extracting shared map status labels or detail-map shells only if they reduce real duplication.
2. Slice 29 adds the first project-owned portable CI workflow; browser-capable CI remains future work.

## Slice 29: Portable GitHub Actions CI

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 28.

Done:

- Added `.github/workflows/ci.yml` as the first project-owned GitHub Actions workflow.
- Runs on `push`, `pull_request`, and manual `workflow_dispatch`.
- Uses Node.js 20, `npm ci`, npm dependency caching from `package-lock.json`, and `npm run ci:check`.
- Keeps CI portable by running only the non-browser gate: data validation, mocked runtime contract probe, TypeScript typecheck, and production build.
- Grants read-only repository contents permission for the workflow.

Not done:

- No browser-enabled GitHub Actions job was added.
- `npm run runtime:browser-probe` and `npm run ui:smoke` are not run in hosted CI yet.
- No deploy, artifact upload, cache-header validation, or scheduled workflow was added.
- No source/runtime data was changed in this slice.

Known warnings and follow-up:

- Browser-capable CI should install or expose Chrome/Chromium, then run `npm run ci:check:browser` and optionally `npm run ui:smoke`.
- `npm run ci:check` does not run `npm run data:build`; source data, generator code, or public data contract changes still need an explicit local `npm run data:build` before validation.
- The workflow is intentionally independent of remote branch naming because this worktree has no configured remote.

Recommended next work:

1. Slice 30 adds a browser-capable CI job for the current GitHub-hosted Ubuntu runner.
2. Add deploy or cache-header checks only after the static hosting target is known.
3. Continue application refactors only in behavior-preserving slices with browser probes after each map/runtime change.

## Slice 30: Browser-Capable GitHub Actions CI

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 29.

Done:

- Added a `browser-check` job to `.github/workflows/ci.yml`.
- The browser job uses Node.js 20, `npm ci`, npm dependency caching, and the existing `npm run ci:check:browser` script.
- Added an explicit Chrome/Chromium locator step that checks preconfigured `CHROME_BIN` / `BROWSER_BIN`, then exports `CHROME_BIN` from the first known executable before running the browser probe.
- Kept the portable `check` job from Slice 29 so non-browser failures remain easy to identify.
- Kept browser CI focused on the existing runtime browser probe; no app behavior, public data, or source data changed.

Not done:

- `npm run ui:smoke` is still not part of hosted CI because it rewrites `docs/test-reports/hike-ui-smoke-report-2026-04-28.md`.
- No explicit browser installation action or apt install step was added; the job depends on the GitHub-hosted Ubuntu runner exposing Chrome/Chromium at one of the standard paths.
- No artifact upload, screenshot capture, deploy validation, or cache-header validation was added.

Known warnings and follow-up:

- If GitHub changes runner browser paths or a self-hosted runner is used, the locator step checks preconfigured `CHROME_BIN` / `BROWSER_BIN` first and then fails loudly if no executable can be found.
- The browser job repeats the portable checks because `npm run ci:check:browser` intentionally includes `npm run ci:check`; this favors using the project-owned gate script over a custom CI-only command sequence.
- Decide later whether `npm run ui:smoke` should run in CI with generated report artifact upload instead of committing the report on every run.

Recommended next work:

1. Add deploy or cache-header checks only after the static hosting target is known.
2. Continue application refactors in behavior-preserving slices with browser probes after each map/runtime change.
3. Consider extracting route-layer/facility-layer helpers from `TrailSystemMap.tsx` only if the split stays small and measurable.

## Slice 31: Trail-System Route Layer Helper Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 30.

Done:

- Added `src/map/trailSystemRouteLayers.ts` for trail-system route-only helpers.
- Moved unique section selection, route geometry loading, route GeoJSON drawing, failed-route collection, selected-route coordinate extraction, endpoint marker fallback, and route-load warning text out of `TrailSystemMap.tsx`.
- Kept the selected/context route request strategy from Slice 23 unchanged.
- Kept main-route Start/End marker semantics unchanged, including endpoint-coordinate fallback when route geometry is unavailable.
- Kept route-builder state in `src/main.tsx`, and kept facility markers, commute markers, popup markup, and bounds fitting in `TrailSystemMap.tsx`.
- Stabilized `npm run runtime:browser-probe` hiking helper checks by waiting for stable facility/commute marker counts before and after toggling the Camping filter.
- Fixed bounds fallback so Start/End markers are included when route geometry is missing or all selected route layers fail.

Not done:

- No facility-marker, commute-marker, popup, or bounds-fitting helper extraction was done.
- No route request strategy, route styling, public data, source data, or UI design changed.
- No standalone hike or kayak map helper APIs changed.

Known warnings and follow-up:

- `TrailSystemMap.tsx` still owns facility and commute marker rendering; split those only if the next slice can preserve current browser-probe coverage.
- `src/map/trailSystemRouteLayers.ts` is intentionally specific to trail-system route layers rather than a generic map-layer abstraction.
- The browser probe now waits for stable marker counts because React/Leaflet layer updates can otherwise be observed mid-transition.
- Validation-agent findings in this slice were addressed before handoff: docs now correctly say route-builder state remains in `src/main.tsx`, and Start/End fallback markers are included in bounds fallback.

Recommended next work:

1. Consider extracting hiking facility marker helpers from `TrailSystemMap.tsx` in a similarly small slice.
2. Keep commute marker extraction separate from facility marker extraction unless both remain trivial.
3. Add deploy or cache-header checks only after the static hosting target is known.

## Slice 32: Hiking Facility Marker Helper Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 31.

Done:

- Added `src/map/hikingFacilityMarkers.tsx` for hiking facility map marker rendering.
- Moved rendering-time visible facility selection, facility marker icon construction, off-route marker class, distance alert badge, popup HTML, tooltip binding, and marker creation out of `TrailSystemMap.tsx`.
- Kept facility marker refs returned to `TrailSystemMap.tsx` so marker fallback bounds still include visible facilities.
- Kept existing hiking facility labels/icons/proximity helpers in `src/map/hikingFacilities.tsx` for shared sidebar and marker use.
- Kept the browser probe coverage for facility marker counts, commute marker counts, Camping filter label/title, and Camping filter toggling.

Not done:

- No commute marker extraction was done.
- No facility filter UI, facility data, popup content, route request strategy, public data, or source data changed.
- No generic cross-activity marker abstraction was introduced.

Known warnings and follow-up:

- `TrailSystemMap.tsx` still owns commute marker rendering and selected route/facility bounds fitting.
- `TrailSystemMap.tsx` still derives the facility dependency key inline so the map effect tracks visible facility changes.
- `src/map/hikingFacilityMarkers.tsx` is hiking-specific and still uses Leaflet popup HTML escaping through existing helpers.
- Future commute marker extraction should preserve the current commute marker count assertion in `npm run runtime:browser-probe`.

Recommended next work:

1. Consider extracting commute marker helpers from `TrailSystemMap.tsx` in a separate slice.
2. Keep bounds-fitting logic in `TrailSystemMap.tsx` until route, facility, and commute marker refs are stable in their helper boundaries.
3. Add deploy or cache-header checks only after the static hosting target is known.

## Slice 33: Hiking Commute Marker Helper Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 32.

Done:

- Added `src/map/hikingCommuteMarkers.tsx` for hiking commute marker rendering.
- Moved access-point stop aggregation, duplicate commute stop merging, bus/train marker icon construction, commute popup HTML, commute title labels, and commute marker creation out of `TrailSystemMap.tsx`.
- Kept commute marker refs returned to `TrailSystemMap.tsx` so marker fallback bounds still include bus/train markers.
- Kept route, facility, and commute marker helpers activity-specific instead of introducing a generic map abstraction.
- Kept browser probe coverage for commute marker counts and facility-filter toggling that should not change commute marker counts.

Not done:

- No bounds-fitting helper extraction was done.
- No transit sidebar, access-point data, facility marker code, route request strategy, public data, or source data changed.
- No generic cross-activity marker abstraction was introduced.

Known warnings and follow-up:

- `TrailSystemMap.tsx` still owns selected route/facility/commute bounds fitting and the map-local route warning state.
- `src/map/hikingCommuteMarkers.tsx` is hiking-specific and formats Leaflet popup HTML with existing escaping helpers.
- Future bounds-fitting extraction should preserve the Slice 31 fallback fix that includes Start/End markers, facility markers, and commute markers.

Recommended next work:

1. Consider extracting a small bounds-fitting helper from `TrailSystemMap.tsx` only if it can preserve the current selected-route-first behavior.
2. Add deploy or cache-header checks only after the static hosting target is known.
3. Keep larger route-builder state extraction separate from map-layer helper cleanup.

## Slice 34: Map Bounds Helper Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 33.

Done:

- Added `src/map/fitMapBounds.ts` for the shared selected-route-first bounds decision.
- Moved the `TrailSystemMap` bounds fit branch out of the component while preserving the same fit options: no animation and `[28, 28]` padding.
- Preserved the existing priority order: fit selected route layers first, then fall back to marker refs.
- Preserved the Slice 31 fallback behavior where Start/End markers, facility markers, and commute markers are all included in marker fallback bounds.
- Kept route, facility marker, commute marker, and map warning state ownership unchanged.

Not done:

- No route, facility, commute, public data, source data, or UI behavior changed.
- No generic map lifecycle abstraction changed.
- No route-builder state extraction was done.

Known warnings and follow-up:

- `src/map/fitMapBounds.ts` is intentionally tiny; do not expand it into a broad map utility module unless another component needs the same selected-layer fallback behavior.
- `TrailSystemMap.tsx` still owns map-local warning state and the sequencing of route/marker drawing.
- Future route-builder state extraction should remain separate from map helper cleanup.

Recommended next work:

1. Reassess whether `TrailSystemMap.tsx` is small enough to pause map extraction and return to route-builder state/data-loading milestones.
2. Add deploy or cache-header checks only after the static hosting target is known.
3. If continuing extraction, keep each slice tied to an existing browser-probe assertion.

## Slice 35: Current Milestone Status Summary

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 34.

Done:

- Added the `Current Milestone Status` handoff section near the top of this document.
- Summarized completed/stable work across validation, runtime sharding, route cache/lifecycle, hiking/kayak runtime paths, browser probes, GitHub Actions, and map helper extraction.
- Summarized transitional boundaries that future agents must still respect: legacy compatibility outputs, manual `data:build`, local/manual `ui:smoke`, and research-only inputs.
- Added a short recommended next milestone list that points future agents back toward route-builder/data-loading cleanup, legacy fallback decisions, deploy/cache-header validation, and possible CI treatment for `ui:smoke`.

Not done:

- No runtime code, source data, public data, package scripts, or GitHub Actions workflow changed in this slice.
- No existing historical slice notes were removed.
- No new milestone was marked complete beyond what earlier slices already implemented.

Known warnings and follow-up:

- The milestone section is a quick handoff view; use the per-slice notes below for exact behavioral details and historical warnings.
- The list should be updated whenever a future slice changes what is complete, still transitional, or next.

Recommended next work:

1. Continue implementation only after checking the `Current Milestone Status` section against the intended slice.
2. Keep updating this section when a slice changes milestone state, not just the per-slice log.

## Slice 36: Trail Section Detail Loading Hook

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 35.

Done:

- Added `src/data/useTrailSectionDetails.ts`.
- Moved selected trail-section detail cache state, cache reset on trail-system changes, missing-section detection, section detail shard fetches, trail-system ID guard, and silent shard-fetch fallback out of `TrailSystemDetails`.
- Caches successful section detail shards even when other selected shard fetches fail.
- Records failed or mismatched selected section detail paths so bad shards do not refetch in a loop during the same trail-system session.
- Kept `TrailSystemDetails` responsible for route-builder state, selected/context section derivation, detailed section substitution, and rendering.
- Preserved the existing fallback behavior: if a section detail shard fails, the route builder remains usable from section-index summaries.
- Kept runtime paths unchanged; section detail shards are still loaded from each selected section's `detailPath`.

Not done:

- No route-builder selection state extraction was done.
- No shard path, public data, source data, route request strategy, UI behavior, or GitHub Actions workflow changed.
- No new retry UI or visible loading/error state for section-detail shard failures was added.

Known warnings and follow-up:

- Section detail shard fetch failures still fail silently in the UI by design; `npm run data:validate` and runtime probes are the safety net for missing shard paths.
- Route-builder selection derivation remains in `src/main.tsx` and is the next likely cleanup area if continuing the data-loading/route-builder milestone.
- Keep future selection-state extraction separate from changes to selected/context route request budgets.
- Validation-agent findings in this slice were addressed before handoff: partial shard failures keep successful details, mismatched shard IDs do not spin forever, and the hook uses a stable selected-section signature.

Recommended next work:

1. Extract pure route-builder selection derivation helpers only if the slice can preserve current defaults, preset handling, context-route pruning, and distance-filter behavior.
2. Decide later whether section detail shard failures need a visible warning or retry action.
3. Keep updating `Current Milestone Status` when milestone state changes.

## Slice 37: Trail Route Selection Helper Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 36.

Done:

- Added `src/data/trailRouteSelection.ts` for pure trail-system route selection helpers.
- Moved trail distance filter ranges, trail-system index route-distance checks, matching section range selection, fallback route-group generation, reusable route-group helpers, primary route-group selection, section lookup, section ID resolution, and matching route-group range selection out of `src/main.tsx`.
- Updated `TrailSystemDetails` and route-builder option rendering to use shared section lookup and section ID resolution helpers.
- Preserved current defaults and behavior: distance-filter initial route matching, preset fallback, catalog-order fallback route groups, context-route availability, selected/context section request budget, and route-builder rendering.

Not done:

- No React route-builder state extraction was done.
- No UI layout, public data, source data, route request strategy, or GitHub Actions workflow changed.
- No visible route-builder loading/error behavior was added.

Known warnings and follow-up:

- `TrailSystemDetails` still owns route-builder state, view mode, preset application, context-route toggling, and selected-facility filter state.
- `TrailSystemDetails` still performs UI-state-specific route-group lookups for the current selection and preset application.
- Future route-builder extraction is now a larger component/state boundary and should be handled as its own behavior-preserving slice.
- Keep future selection-state changes covered by `npm run runtime:browser-probe` and `npm run ui:smoke` because they guard selected/context route budgets.

Recommended next work:

1. Decide whether to extract route-builder state/view into a component or pause route-builder cleanup.
2. Decide later whether section detail shard failures need a visible warning or retry action.
3. Keep updating `Current Milestone Status` when milestone state changes.

## Slice 38: UI Smoke CI Artifact

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 37.

Done:

- Added `npm run ui:smoke:artifact`, which uses the existing smoke runner's `--output` option to write `artifacts/ui-smoke/hike-ui-smoke-report.md`.
- Added a browser-check workflow step that runs `npm run ui:smoke:artifact` after `npm run ci:check:browser`.
- Added an `actions/upload-artifact@v4` step that uploads the smoke report as `ui-smoke-report`, using `if: always()` so a generated report is still available when smoke findings fail the job.
- Kept `npm run ui:smoke` unchanged for local/manual updates to `docs/test-reports/hike-ui-smoke-report-2026-04-28.md`.
- Kept browser setup unchanged; the same `CHROME_BIN` locator supports both browser probe and smoke artifact runs.

Not done:

- No screenshot artifact, video artifact, deploy validation, or cache-header validation was added.
- No smoke coverage behavior changed.
- No app runtime code, public data, or source data changed in this slice.

Known warnings and follow-up:

- The CI smoke job runs the browser probe and then the smoke report, so the browser-check job is intentionally heavier than the portable job.
- If an earlier browser-check step prevents the smoke step from running, or the smoke runner aborts before writing a report, artifact upload will fail because `if-no-files-found` is `error`.
- Future CI tuning can split smoke into an optional/scheduled workflow if runtime becomes a problem.

Recommended next work:

1. Add deploy/cache-header validation only after the static hosting target is known.
2. Decide whether section detail shard failures need a visible warning or retry action.
3. Keep updating `Current Milestone Status` when milestone state changes.

## Slice 39: Section Detail Shard Warning

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 38.

Done:

- Extended `useTrailSectionDetails` to return both cached details and a selected-section failed shard count.
- Added a compact inline warning on trail-system builder and info pages when one or more selected section detail shards fail or do not match the current trail system.
- Kept the existing non-blocking fallback behavior: selected route details still render from section-index summaries when detail shards fail.
- Added `.inline-warning` styling for the warning state.

Not done:

- No retry action was added for failed selected section detail shards.
- No validation rule, public data, source data, route request strategy, or GitHub Actions workflow changed.
- No detailed filename list is shown in the warning.

Known warnings and follow-up:

- The warning reports a count, not individual section filenames, to avoid exposing public data paths in primary UI.
- Failed detail paths are still remembered for the current trail-system session; the visible warning appears only while the current selected route includes failed detail paths.
- Add a retry affordance later only if real users hit transient shard failures.
- Validation-agent findings in this slice were addressed before handoff: the warning now appears in the default builder view and keeps its intended spacing/color inside description text.

Recommended next work:

1. Add deploy/cache-header validation only after the static hosting target is known.
2. Decide whether route-builder state/view extraction is still worth doing now that pure helpers and shard loading are separated.
3. Keep updating `Current Milestone Status` when milestone state changes.

## Slice 40: Hiking Facility Proximity And Marker Clusters

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 39.

Done:

- Added `isCloseTrailFacility` in `src/map/hikingFacilities.tsx` and applied it before selected hiking facilities reach the facility list or trail-system map.
- Kept the filter read-only and data-contract-compatible: it uses existing `routeProximity` metadata and hides facilities with `status: "off-route"` from both the selected-route facility list and map instead of adding a new runtime dataset.
- Updated hiking map marker rendering so same-coordinate facilities are represented by one count marker.
- Clicking a count marker expands the grouped facilities into individual offset icons around the shared coordinate.
- Kept facility div icons on Leaflet's required absolute positioning and added border-box sizing so the icon anchor stays aligned with the visual center while zooming.
- Extended `npm run runtime:browser-probe` to assert that overlapping hiking facility cluster markers render and can expand into individual markers while preserving the existing facility-filter request-budget checks.

Not done:

- No source data, public JSON, route geometry, kayak map behavior, or legacy compatibility output changed in this slice.
- No third-party Leaflet clustering dependency was added; the overlap handling is a small hiking-specific same-coordinate renderer.
- No distance is recalculated in the browser from route geometry; the runtime trusts the generated `routeProximity` metadata.
- No far/off-route facility warning rows are shown for hidden facilities; the selected-route UI is intentionally close-facility-only for this slice.
- No separate cluster UI was added for kayak facilities.

Known warnings and follow-up:

- Facilities without `routeProximity` still pass through for backward compatibility. Validation should continue ensuring generated hiking facilities include proximity metadata.
- Grouping uses coordinates rounded to five decimal places, so facilities within roughly meter-level precision can share a cluster even if their raw decimals differ slightly.
- The cluster expansion is intentionally simple and does not draw connector lines; add that only if future user testing shows the offset icons are ambiguous.
- If the generator later wants a softer threshold than the current `routeProximity.thresholdKm`, change it in generation/validation rather than adding a second UI-only rule.
- The browser probe checks that at least one overlapping cluster expands, but it does not yet assert exact grouped facility IDs or popup contents.
- The existing route request budget remains path-level; repeated same-path route loads are expected to be served by the route-geometry cache and are not separately counted as a failure.
- The browser runtime probe still relies on the Node global `WebSocket` used by the existing CDP client; it passes in the current Node runtime, but older Node runtimes may need an explicit WebSocket implementation.

Recommended next work:

1. Keep library loading/filter orchestration extraction as the next behavior-preserving cleanup candidate if continuing implementation.
2. Add deploy/cache-header validation only after the static hosting target is known.
3. Decide when legacy compatibility hiking JSON can stop being generated after deploy compatibility is clear.

## Slice 41: App Shell Detail Extraction

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 40.

Done:

- Extracted sidebar rendering and filter controls from `src/main.tsx` into `src/components/LibrarySidebar.tsx`.
- Extracted hiking detail rendering into `src/components/HikeDetails.tsx`.
- Extracted trail-system route-builder/detail rendering into `src/components/TrailSystemDetails.tsx`.
- Extracted kayak detail rendering into `src/components/KayakTripDetails.tsx`.
- Extracted shared detail UI blocks into `src/components/DetailBlocks.tsx`.
- Extracted load-state and filter/domain helper contracts into `src/data/loadState.ts` and `src/data/filters.ts`.
- Reduced `src/main.tsx` to the top-level app coordinator: library/detail loading, selected item state, active activity, filter state, derived item lists, overview selection, and composition of the extracted views.

Not done:

- No runtime data, generated JSON, route geometry, source data, validation rules, map request strategy, or public data contract changed in this slice.
- Route-builder state is still owned by the trail-system detail view because this slice only moved the existing behavior out of `src/main.tsx`.
- Library loading/filter orchestration still lives in `src/main.tsx`; move it into hooks only in a later focused slice.
- Detail components were split by current activity/domain rather than introducing a generic plugin system or route registry.

Known warnings and follow-up:

- `TrailSystemDetails.tsx` is still the largest extracted view because it owns the existing route-builder UI. Split its route-builder state and presentation only if that can stay behavior-preserving.
- `KayakTripDetails.tsx` still contains kayak-specific formatting helpers. Extract them later only if another kayaking view needs the same formatting.
- Keep browser runtime probes after any future app-shell extraction because these changes are easy to typecheck while still accidentally changing runtime fetch order, map behavior, or mobile rendering.

Recommended next work:

1. Extract library loading, activity filter state, and derived visible-item computation from `src/main.tsx` into focused hooks if continuing app-shell cleanup.
2. Keep route-builder extraction as a separate later slice after the loading/filter hook boundary is stable.
3. Add deploy/cache-header validation only after the static hosting target is known.

## Slice 42: Overview Color Scale

Status: implemented in the `codex/data-validation-foundation` worktree after Slice 41.

Done:

- Replaced the six-color overview route palette with `src/map/overviewColors.ts`, a deterministic generated route color scale.
- Kept colors stable by overview feature ID while avoiding exact repeats across the currently rendered overview feature set.
- Added light-map contrast checks and distance spacing before a color is accepted for a feature.
- Updated `OverviewMap` to build one color map from the full overview feature collection so filters do not reshuffle route colors.
- Extended `npm run runtime:browser-probe` to assert that hiking and kayaking overview maps expose a broad set of visible route colors.

Not done:

- No public data, source data, route geometry, or generated overview GeoJSON changed in this slice.
- No legend was added; the current overview interaction still relies on hover highlighting and tooltips.
- No map-tile-aware contrast sampling was added. The check uses a light neutral map background assumption, which matches the current OSM-style map context closely enough for this UI guardrail.

Known warnings and follow-up:

- The color scale can still become visually busy if hundreds of routes are visible at once. At that point, add clustering, category layers, or a hover/search-first interaction instead of trying to solve everything with color alone.
- Exact color uniqueness is guarded for the current data size by the browser probe; future very large datasets may intentionally accept some close colors after the spacing threshold degrades.

Recommended next work:

1. Replace first-import kayak validation magic counts with manifest-derived completeness checks.
2. Keep library loading/filter orchestration extraction as a later app-shell cleanup candidate.
3. Add deploy/cache-header validation only after the static hosting target is known.

## Verification Checklist

Run after each implementation slice:

```bash
npm run data:build   # when source data, generator code, or public data contracts changed
npm run ci:check
npm run runtime:browser-probe   # when Chrome/Chromium is available; equivalent to the extra check in ci:check:browser
git diff --check
```

Use `npm run ci:check:browser` instead of separate `ci:check` plus `runtime:browser-probe` when working in a browser-capable environment.

For validation changes, also run local negative probes for a missing route file, duplicate section ID, and invalid app coordinate, then remove the probe files before handoff.
