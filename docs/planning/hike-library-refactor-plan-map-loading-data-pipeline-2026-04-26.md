# Refactor Plan: Map Loading Scalability and Data Pipeline Ownership

Date: 2026-04-26

Related review: `docs/planning/hike-library-architecture-review-2026-04-26.md`

Workspace target: `/Users/joakim/Documents/New project`

This plan addresses the two highest-impact scalability concerns:

1. Map route loading will not scale.
2. The data pipeline will create conflicts as more trails are added.

The goal is not a big rewrite. The goal is to create clearer ownership boundaries, reduce repeated route fetching, and make it easier for multiple agents to add trails without colliding.

## Guiding Principles

- Preserve the current public data contract first: `/data/hikes-index.json`, detail JSON files, and `/routes/*.geojson` should continue working during the refactor.
- Extract behavior before changing behavior.
- Add read-only validation before large data movement.
- Keep generated output deterministic.
- Avoid touching every trail file at once unless a script can prove the result is unchanged.
- Make each phase independently reviewable.

## Workstream 1: Scalable Map Route Loading

### Current Problem

`TrailSystemMap` currently fetches route GeoJSON for every section in the selected trail system whenever the map effect runs. For Sormlandsleden, that means up to 94 route fetches for one map render. The effect also depends on selected sections, facility filters, facilities, access points, and the full trail-system object, so interactions can recreate the Leaflet map and repeat route work.

This will become a visible usability problem as more long trails are added.

### Target Shape

Move toward this structure:

- A route geometry cache that deduplicates fetches by `geojsonPath`.
- A route loading hook that prioritizes selected sections first.
- A Leaflet map component that creates the map once, then updates layers.
- Optional lightweight overview geometry for unselected sections later.
- Clear loading/error states for partial route failures.

### Phase 1.1: Baseline and Inventory

Deliverables:

- Record current route counts and route file sizes per trail system.
- Identify the largest route files and total per-system route payload.
- Measure current behavior in dev tools or a small local script:
  - Number of route fetches on first selecting Roslagsleden.
  - Number of route fetches on first selecting Sormlandsleden.
  - Number of route fetches after changing start/end section.
  - Number of route fetches after toggling facility filters.

Suggested output:

- Add notes to a temporary report or issue, not source code.
- This phase should be read-only.

Acceptance criteria:

- The team knows what “better” means numerically.
- There is a simple before/after baseline for route fetch counts.

### Phase 1.2: Extract Route Geometry Loading

Create a small route-loading module without changing map behavior yet.

Suggested new module:

- `src/map/routeGeometry.ts`

Responsibilities:

- Export `loadRouteGeometry(path: string): Promise<GeoJSON.FeatureCollection>`.
- Deduplicate concurrent requests for the same path.
- Cache fulfilled route data by path.
- Cache failures carefully, or allow retry after failure.
- Normalize supported GeoJSON forms if needed.

Possible API:

```ts
export type RouteGeometry = {
  path: string;
  geojson: GeoJSON.FeatureCollection;
};

export function loadRouteGeometry(path: string): Promise<RouteGeometry>;
export function clearRouteGeometryCache(): void;
```

Implementation notes:

- Use a module-level `Map<string, Promise<RouteGeometry>>`.
- Keep this independent from React and Leaflet.
- Do not parse route styling or selected-state behavior here.

Acceptance criteria:

- Existing map still works.
- Repeated calls for the same path reuse the same promise/data.
- Unit tests can be added for cache deduplication without rendering React.

### Phase 1.3: Extract Route Selection Helpers

Move pure route-section logic out of `src/main.tsx`.

Suggested new module:

- `src/trails/routePlanning.ts`

Move or duplicate then replace:

- Distance filter matching.
- `matchingSectionRange`.
- `matchingRouteGroupRange`.
- `sectionsForRouteGroup`.
- `primaryRouteGroups`.
- `fallbackRouteGroups`.
- `recommendedTimeForDistance`.

Why this belongs before deeper map work:

- It lets map code receive a clean list of selected/context sections.
- It gives tests a stable target.
- It reduces the chance that route-loading work accidentally changes selection behavior.

Acceptance criteria:

- No functional behavior change.
- Route builder still selects the same sections for existing presets and distance filters.
- The extracted helpers have focused tests or at least a small script-based verification.

### Phase 1.4: Introduce Prioritized Route Loading Hook

Suggested new hook:

- `src/map/useRouteGeometries.ts`

Responsibilities:

- Accept selected route paths and optional background route paths.
- Load selected routes first.
- Load background routes after selected routes, or only when map is idle.
- Return loading state by path.
- Return failed paths without making the whole map fail.

Possible API:

```ts
type UseRouteGeometriesInput = {
  primaryPaths: string[];
  backgroundPaths?: string[];
  loadBackground?: boolean;
};

type UseRouteGeometriesResult = {
  primaryRoutes: RouteGeometry[];
  backgroundRoutes: RouteGeometry[];
  pendingPrimaryCount: number;
  pendingBackgroundCount: number;
  failedPaths: string[];
};
```

Initial behavior:

- Keep rendering all routes if desired, but fetch selected routes first.
- Use the route geometry cache from Phase 1.2.

Acceptance criteria:

- Selecting a short range displays that selected route without waiting for every section.
- Background route failures do not prevent selected route display.
- Toggling facility filters does not refetch route GeoJSON.

### Phase 1.5: Split Leaflet Lifecycle From Layer Updates

Refactor `TrailSystemMap` so map creation and data layer updates are separate.

Suggested structure:

- `TrailSystemMap.tsx`
  - Owns high-level props and hooks.
- `useLeafletMap.ts`
  - Creates/removes the Leaflet map instance.
  - Adds base tile layer and zoom controls once.
- `trailLayers.ts`
  - Adds/updates/removes route layers, facility markers, commute markers, and start/end markers.

Important behavior change:

- The Leaflet map should not be recreated when only selected sections or facility filters change.
- Existing layers should be updated or replaced in layer groups.

Acceptance criteria:

- Facility filter toggles update markers without recreating the whole map.
- Start/end changes update highlighted route layers without recreating the whole map.
- The number of network fetches remains stable after repeated UI interactions.

### Phase 1.6: Add Route Overview Strategy

Once caching and lifecycle are stable, decide how much unselected route geometry the map should draw.

Options:

1. Selected-only first:
   - Fastest.
   - Shows only the route being planned.
   - Best for usability on large systems.

2. Selected plus nearby/context:
   - Load selected range, connected branch/access sections, and immediate neighboring sections.
   - Good balance.

3. Full-system background after idle:
   - Load selected range immediately.
   - Load remaining route files after the map is interactive.
   - Maintains current whole-system context.

4. Generated overview file:
   - Add one simplified `/routes/<trail-system>-overview.geojson`.
   - Draw overview as a lightweight background.
   - Load detailed section GeoJSON only for selected/context sections.

Recommended path:

- Implement option 2 first.
- Add option 4 later if full-system context is important for long trails.

Acceptance criteria:

- Long trail systems remain responsive.
- The user can understand where the selected route sits in the trail system.
- Route loading behavior remains predictable on slow connections.

### Phase 1.7: Tests and Guardrails

Add focused tests or script checks for:

- Route geometry cache deduplication.
- Route selection range behavior.
- Missing route files produce a controlled map state.
- Facility marker filtering does not trigger route reloads.

Suggested package scripts:

- `typecheck`: `tsc --noEmit`
- `test:route-planning`: focused unit tests if a test runner is added.
- `data:validate`: read-only validation from Workstream 2.

## Workstream 4: Data Pipeline Ownership and Conflict Reduction

### Current Problem

Trail data generation is concentrated in large scripts:

- `scripts/build-sormlandsleden-system.mjs`
- `scripts/build-roslagsleden-system.mjs`
- `scripts/sormlandsleden-research-overlays.mjs`
- `scripts/write-hike-data.mjs`

These scripts mix curated content, source URLs, coordinates, scraping/fetching, route transformation, enrichment, validation-like checks, and writes to source/generated files.

As more trails are added, this will cause:

- Merge conflicts.
- Hard-to-review generated diffs.
- Accidental edits to generated files.
- More fragile builds because network fetches and deterministic output are coupled.

### Target Shape

Move toward a pipeline with clear layers:

1. Source data per trail.
2. Shared transform modules.
3. Shared enrichment modules.
4. Read-only validation.
5. Thin build commands.
6. Generated output with clear ownership.

Recommended directory shape:

```text
data/
  source/
    trail-systems/
      sormlandsleden/
        manifest.json
        sections.json
        facilities.json
        route-groups.json
        presets.json
        research-overlays.json
      roslagsleden/
        manifest.json
        sections.json
        facilities.json
        presets.json
  generated/
    optional future location if generated data should move out of public/

scripts/
  build-trail-system.mjs
  build-all-data.mjs
  validate-data.mjs

src/
  data-contract/
    types.ts or schemas.ts
```

This exact structure can be adjusted, but the key idea is per-trail ownership and shared transforms.

### Phase 4.1: Define Source-of-Truth Rules

Add documentation before moving files.

Suggested doc:

- `docs/data-pipeline.md`

Content:

- Which files are source-authored.
- Which files are generated.
- Which generated files are compatibility aggregates.
- Which generated files are runtime shards consumed by the app.
- Which commands rewrite generated files.
- Whether `public/data/` is committed generated output or build output.
- How to add a new trail.
- How to validate without rewriting data.

Acceptance criteria:

- A new agent can tell where to edit trail content.
- A new agent can tell which files not to edit by hand.
- The doc names commands that are safe/read-only vs write-producing.

### Phase 4.2: Add Read-Only Data Validation

Create a validation script before moving source data around.

Suggested script:

- `scripts/validate-data.mjs`

Checks:

- Unique trail-system IDs.
- Unique section IDs within each trail system.
- Unique facility IDs within each section.
- Every `detailPath` in `public/data/hikes-index.json` exists.
- Every `geojsonPath` exists when route status is `ready`.
- Route-group section IDs reference existing sections.
- Preset start/end section IDs reference existing sections.
- Coordinates are valid lat/lon pairs.
- Facility `sectionId` matches containing section.
- Source URLs exist syntactically.
- `researchStatus` exists once that field is introduced.

Run mode:

- Read-only.
- Exit non-zero on failure.
- Print concise failures grouped by trail system.

Package script:

```json
"data:validate": "node scripts/validate-data.mjs"
```

Acceptance criteria:

- Validation passes on the current snapshot.
- It does not modify any files.
- It can be safely run by parallel agents.

### Phase 4.3: Extract Shared Transform Modules

Move logic out of trail-specific build scripts into shared modules.

Suggested modules:

- `scripts/lib/gpx.mjs`
  - GPX parsing.
  - GeoJSON conversion.
  - Center/start coordinate helpers.

- `scripts/lib/geo.mjs`
  - Distance functions.
  - Coordinate validation.
  - Bounds helpers.

- `scripts/lib/trail-system.mjs`
  - Common section hydration.
  - Facility hydration.
  - Trail-system assembly helpers.

- `scripts/lib/write-public-data.mjs`
  - Current `writeHikeData` behavior.
  - Index generation.

Initial approach:

- Extract one helper at a time.
- Keep old script outputs byte-stable where feasible.
- After each extraction, run `data:validate` and compare generated output if writes were performed in a controlled branch.

Acceptance criteria:

- Trail-specific scripts shrink.
- Common route and facility logic is no longer duplicated.
- Generated output remains equivalent.

### Phase 4.4: Move Per-Trail Curated Data Out of Build Scripts

Start with one trail system as a pilot.

Recommended pilot:

- Roslagsleden first, because it has fewer sections than Sormlandsleden.

Move from `scripts/build-roslagsleden-system.mjs` into source files:

- Manifest/system-level metadata.
- Section seeds.
- Facility coordinate table.
- Presets.
- Any trail-specific notes.

Possible source files:

```text
data/source/trail-systems/roslagsleden/manifest.json
data/source/trail-systems/roslagsleden/sections.json
data/source/trail-systems/roslagsleden/facilities.json
data/source/trail-systems/roslagsleden/presets.json
```

Keep route-fetching/build logic in scripts.

Acceptance criteria:

- Adding or editing Roslagsleden section research no longer requires editing a large build script.
- The Roslagsleden build output remains equivalent.
- The structure is documented well enough to use for the next trail.

### Phase 4.5: Generalize Trail-System Build Command

Replace trail-specific scripts with one orchestrator that can build a named trail.

Suggested command:

```bash
node scripts/build-trail-system.mjs roslagsleden
node scripts/build-trail-system.mjs sormlandsleden
node scripts/build-all-data.mjs
```

Responsibilities:

- Load source files for the requested trail.
- Apply shared transforms.
- Apply trail-specific adapters only where needed.
- Write source aggregate data and generated public data.

Important:

- Trail-specific quirks should live in small adapter modules, not giant all-in-one scripts.

Possible adapter structure:

```text
scripts/trail-adapters/
  roslagsleden.mjs
  sormlandsleden.mjs
```

Acceptance criteria:

- A new trail can be introduced by adding source data and a small adapter only if needed.
- Existing scripts can remain as compatibility wrappers temporarily.
- Build commands are predictable and documented.

### Phase 4.6: Move Sormlandsleden Source Data

Once Roslagsleden proves the pattern, move Sormlandsleden.

Suggested split:

```text
data/source/trail-systems/sormlandsleden/
  manifest.json
  sections-core.json
  facilities-core.json
  route-groups.json
  presets.json
  research-overlays.json
  official-catalog-import.json
```

Why more files:

- Sormlandsleden has core manually curated stages, imported catalog stages, research overlays, branch/access topology, and many facilities.
- Splitting those concepts prevents future agents from editing the same file for unrelated work.

Acceptance criteria:

- Research additions can target one source file.
- Route topology edits can target route-group files.
- Generator logic is not modified for ordinary research updates.
- `data:validate` passes after regeneration.

### Phase 4.7: Mark Generated Outputs Clearly

Options:

- Add a `docs/data-pipeline.md` generated-files section.
- Add adjacent metadata files if JSON cannot include comments.
- Consider moving generated source aggregates into `data/generated/`.
- Keep `public/data/` as the deployable generated payload, but split large trail systems into runtime shards.

Recommended near-term rule:

- `data/source/**`: hand-authored source.
- `data/trail-systems.json`: generated aggregate, compatibility layer.
- `public/data/**`: generated deployable payload.
- `public/data/trail-systems/<id>.json`: legacy compatibility artifact only, not the target runtime contract.
- `public/data/trail-systems/<id>/manifest.json`: runtime trail-system manifest.
- `public/data/trail-systems/<id>/sections-index.json`: lightweight route-builder section list.
- `public/data/trail-systems/<id>/sections/<section-id>.json`: selected/context section detail shard.
- `public/routes/**`: generated or imported route payloads; ownership depends on source metadata.

Acceptance criteria:

- Reviewers know when a large JSON diff is generated.
- Agents know not to manually patch generated aggregates.
- Runtime code for large trail systems can avoid loading many-thousand-line all-in-one JSON files.

### Phase 4.7A: Generate Runtime Shards For Large Trail Systems

Add a public-data writer for large trail systems.

Suggested output:

```text
public/data/trail-systems/<trail-system-id>/
  manifest.json
  sections-index.json
  route-groups.json
  presets.json
  sections/
    <section-id>.json
```

Responsibilities:

- `manifest.json` contains system-level metadata only.
- `sections-index.json` contains lightweight route-builder fields only.
- `route-groups.json` and `presets.json` contain topology and suggestions.
- `sections/<section-id>.json` contains section description, notes, facilities, access points, and route metadata.
- Legacy all-in-one JSON can be written temporarily for compatibility, but new runtime code should not depend on it.

Acceptance criteria:

- Every section index item has a matching section detail shard.
- Route groups and presets reference known section IDs.
- Selecting a trail system can initialize the route builder from manifest, sections index, route groups, and presets.
- Entering route info fetches only selected/context section detail shards.

### Phase 4.8: Add Research Completeness Metadata

This is part of scaling the data pipeline because future trails will have mixed quality levels.

Suggested fields:

```ts
type ResearchStatus = "catalog-only" | "partially-researched" | "planning-grade";

type ResearchMetadata = {
  status: ResearchStatus;
  lastVerifiedAt?: string;
  sourceCategories: string[];
  notes?: string[];
};
```

Apply to:

- Trail sections.
- Facilities where relevant.

Validation rules:

- Every section has `research.status`.
- `planning-grade` sections require multiple source categories.
- Facility coordinates are required for map-visible facilities unless explicitly marked unknown.

Acceptance criteria:

- The data model can distinguish deep research from catalog import.
- UI work can later surface this without parsing prose notes.

## Suggested Implementation Order

1. Add `data:validate` read-only script.
2. Extract route planning helpers from `src/main.tsx`.
3. Add route geometry cache.
4. Refactor `TrailSystemMap` to use cached/prioritized route loading.
5. Add map lifecycle/layer split.
6. Document source/generated data rules.
7. Extract shared generator helpers.
8. Add runtime shard writer and validation for large trail systems.
9. Move Roslagsleden source data out of generator script.
10. Generalize build command.
11. Move Sormlandsleden source data.
12. Switch runtime trail-system loading to manifest/index/detail shards.
13. Add research metadata validation and UI surfacing later.

This order gives the team safety rails before large data movement and fixes the most visible scaling issue before expanding the catalog.

## Parallel Work Plan

The work can be split safely once validation exists.

Agent A: Map Loading

- Owns `src/map/**` and map-related imports.
- Implements route geometry cache, hooks, and map lifecycle split.
- Avoids generator/data source files.

Agent B: Route Planning Extraction

- Owns `src/trails/routePlanning.ts` and related tests.
- Moves pure selection/filter logic out of `src/main.tsx`.
- Coordinates with Agent A on exported helper shapes.

Agent C: Data Validation

- Owns `scripts/validate-data.mjs`.
- Adds read-only checks and package script.
- Does not move data files yet.

Agent D: Pipeline Documentation and Roslagsleden Pilot

- Owns `docs/data-pipeline.md`.
- After validation exists, owns `data/source/trail-systems/roslagsleden/**`.
- Keeps generated output changes isolated.

Agent E: Sormlandsleden Migration

- Starts only after Roslagsleden pilot is accepted.
- Owns `data/source/trail-systems/sormlandsleden/**`.
- Avoids changing shared transform modules unless coordinated.

## Risk Controls

- Do not combine map refactor and data migration in the same PR.
- Do not move both Roslagsleden and Sormlandsleden source data in the same first migration PR.
- Run validation before and after any generator refactor.
- Compare generated output before and after transform extraction.
- Keep compatibility wrappers for old commands until the new build commands are stable.
- Use small PRs with one ownership boundary each.

## Definition of Done

Map loading concern is addressed when:

- Selecting a short route range does not require waiting for every route file in the trail system.
- Repeated map interactions do not refetch unchanged route GeoJSON.
- Facility filter toggles do not recreate the whole Leaflet map.
- Missing route files produce controlled partial failure, not a blank map.

Data pipeline concern is addressed when:

- Trail source data is separated by trail.
- Generated files are clearly documented.
- A read-only validator catches broken refs, bad coordinates, duplicates, and invalid route groups.
- Adding a new trail does not require editing a giant shared generator script.
- Parallel agents can work on separate trails or pipeline layers with low conflict risk.
