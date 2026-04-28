# Hike Library Architecture Review

Date: 2026-04-26

Workspace reviewed: `/Users/joakim/Documents/New project`

This review was done read-only against the project workspace. The only file created was this report, outside the workspace.

## Executive Summary

The current architecture is workable for an early, static-data hiking library. It has a simple deployment model: Vite serves a React app, `public/data/hikes-index.json` provides a small library index, detail JSON files are fetched on demand, and route GeoJSON files are loaded by Leaflet maps.

The biggest architectural issue is not that the app is broken. In the current snapshot, the generated public data is internally consistent: the index details exist, route files referenced by both trail systems exist, Sormlandsleden route groups cover all 94 sections, and I found no duplicate section IDs or duplicate facility IDs within sections.

The main risk is that the project has outgrown its current file/module boundaries. Runtime UI, map behavior, filtering, route-building state, and fetch/cache behavior all live in one 1,725-line `src/main.tsx`. The data pipeline is similarly concentrated in large generator scripts with embedded curated content, network fetches, data transformations, and file writes mixed together. That makes parallel agent work risky and makes regressions likely once the dataset or UI grows.

## Architecture Snapshot

- Frontend: React 18 + Vite + TypeScript + Leaflet.
- Runtime data loading:
  - `/data/hikes-index.json` is fetched at startup.
  - Each selected item fetches a detail file from `detailPath`.
  - Route GeoJSON files are fetched from `geojsonPath` when maps render.
- Source data:
  - `data/trail-systems.json` currently contains 2 systems.
  - `public/data/hikes-index.json` currently contains 2 index items.
  - Public detail files contain Roslagsleden with 10 sections and Sormlandsleden with 94 sections.
- Data generation:
  - `scripts/write-hike-data.mjs` writes index and public detail JSON.
  - `scripts/build-sormlandsleden-system.mjs` and `scripts/build-roslagsleden-system.mjs` build large trail-system records and route files.
  - Supporting scripts annotate facility proximity, commute access, route groups, audits, and imports.

## Findings

### 1. The frontend is a monolith now

`src/main.tsx` contains data loading, filters, sidebar, detail views, trail builder, facility accordions, map rendering, popup HTML construction, local storage, and route-selection logic. This is already past the point where file-level ownership is clear.

Concrete examples:

- Route map rendering starts around `src/main.tsx:480`.
- Trail-system map rendering starts around `src/main.tsx:563`.
- Trail builder state and derived route logic starts around `src/main.tsx:1030`.
- App-level data fetch/cache/filter state starts around `src/main.tsx:1564`.

Impact:

- Parallel edits will frequently collide in the same file.
- UI changes can accidentally affect map lifecycle or route-building behavior.
- There is no clean place to test pure logic like route range matching, route group selection, facility filtering, or search behavior.

Recommendation:

Split by responsibility before adding much more behavior:

- `data/loading.ts` or hooks for index/detail fetch and cache.
- `route-planning.ts` for distance filters, route groups, selected section ranges, and recommendations.
- `maps/RouteMap.tsx` and `maps/TrailSystemMap.tsx`.
- `components/Sidebar.tsx`, `TrailSystemDetails.tsx`, `HikeDetails.tsx`, `FacilityList.tsx`, and related small components.

This does not require a framework change. It is mostly extracting existing code into stable modules.

### 2. Trail-system maps refetch every route on most changes

`TrailSystemMap` fetches every section route for the selected trail system inside `Promise.all(trailSystem.sections.map(...))` at `src/main.tsx:621-629`. For Sormlandsleden, that means the map attempts to load all 94 route files when the map renders, even if the user selects a short route range.

The effect dependencies include selected sections, facility filters, facilities, access points, and full `trailSystem` object (`src/main.tsx:745`). Changing map facility filters can recreate the Leaflet map and redo route loading work.

Impact:

- Sormlandsleden is already large enough for unnecessary network/file churn.
- Facility toggles and route changes can become visibly sluggish.
- Scaling to more trail systems or longer routes will amplify this.

Recommendation:

Cache GeoJSON by `geojsonPath` in a module-level or hook-level cache, and separate "load all route geometry once" from "restyle selected layers". A pragmatic middle step is to fetch only selected sections plus nearby/context sections, then optionally draw unselected routes from a cached lightweight overview.

### 3. Data generation mixes curated source data, scraping, transforms, and writes

`scripts/build-sormlandsleden-system.mjs` is about 1,514 lines. It contains facility coordinate tables, curated section seeds, official GPX/network route logic, OSM overrides, facility hydration, research overlays, commute access, proximity annotation, and writes to `data/` and `public/`.

Similar shape exists in `scripts/build-roslagsleden-system.mjs`.

Impact:

- It is hard to review whether a change is source-data research, transformation logic, or output mechanics.
- Network-dependent builds are harder to reproduce.
- A small change to a generator can rewrite large public data files.
- Conflict risk is high for parallel agents because many edits target the same large scripts and generated JSON.

Recommendation:

Separate the pipeline into:

- Curated seed data files, ideally JSON or small typed JS modules per trail/system.
- Pure transformation modules for GPX parsing, route grouping, proximity, commute annotation, and index shaping.
- Thin command scripts that orchestrate reads/writes.
- A generated-data contract that makes it clear which files are source of truth and which files are derived.

### 4. Source-of-truth boundaries are ambiguous

The repo contains both source JSON under `data/` and generated public JSON under `public/data/`. The generator also removes stale public detail files in `scripts/write-hike-data.mjs:118-129`, writes the index at `scripts/write-hike-data.mjs:132-135`, and writes detail files at `scripts/write-hike-data.mjs:137-147`.

That is fine mechanically, but the architecture does not strongly mark generated files as generated, and there is no visible validation gate that checks that generated output matches source inputs.

Impact:

- Humans and agents may edit generated files directly.
- Parallel work can diverge if one agent changes source data while another changes public output.
- Review diffs will be noisy and hard to reason about.

Recommendation:

Add generated-file headers where possible, document source-of-truth rules, and add a `data:check` script that regenerates to a temporary directory or validates references without rewriting tracked files. Keep `data/` authoritative and treat `public/data/` plus most route files as build artifacts unless there is a deliberate reason not to.

### 5. Runtime data is trusted without validation

The TypeScript types in `src/types.ts` describe expected shapes, but runtime JSON fetches in `src/main.tsx:1578-1621` cast fetched JSON directly to TypeScript types. If generated or manually edited data is malformed, the app may silently show an empty/loading state or fail later in a less obvious place.

Impact:

- Bad generated data can become a runtime UI bug.
- The app currently catches fetch errors, but not schema errors with clear messages.
- Planning-grade data needs confidence in correctness, especially around routes, coordinates, and facilities.

Recommendation:

Add a lightweight validation layer in the data pipeline first, then optionally in runtime. Even a custom Node validation script that checks required fields, coordinate ranges, route references, unique IDs, route group references, and facility source URLs would catch most high-impact issues. A library such as Zod can help if the project is willing to add a dependency.

### 6. Research completeness is represented in docs, not architecture

`docs/sormlandsleden-research-standard.md:25-28` says Roslagsleden and Sormlandsleden stages 1-10 have deeper enrichment, while Sormlandsleden stages beyond 10 need a full enrichment pass before being treated as complete.

However, the runtime trail-system model does not expose a clear per-section research/completeness status. The app can show later sections and facilities without a structured quality signal beyond prose notes.

Impact:

- Users may over-trust incomplete facility data.
- Filtering/search can mix planning-grade and catalog-grade sections.
- Future agents may not know which sections need research unless they read docs and data carefully.

Recommendation:

Add explicit metadata to sections and facilities, such as `researchStatus`, `confidence`, `lastVerifiedAt`, and `sourceCategories`. Then let the UI surface that status quietly in detail views and let audits enforce it.

### 7. Current verification surface is thin

`package.json` has `dev`, `build`, `data:build`, `data:roslagsleden`, `import:naturkartan`, and `preview`, but no dedicated test, lint, type-only, or data validation command.

Impact:

- Agents cannot quickly check their changes without either running a full build or risking generated-file writes.
- Data changes lack a standard safety net.
- UI logic has no unit tests despite having meaningful pure logic in the frontend.

Recommendation:

Add low-write or no-write checks:

- `typecheck`: `tsc --noEmit`.
- `data:validate`: read-only validation of source and public generated data.
- Unit tests for route matching, distance filters, route group selection, and index generation.
- Optional smoke test that starts Vite and verifies index/detail/route fetches.

## What Looks Healthy

- The overall static-site architecture is appropriate for this kind of app.
- The index/detail split is a good pattern and keeps startup data small.
- Trail systems are modeled separately from standalone hikes, which fits the domain.
- Route groups are a useful abstraction for mainline/branch/access planning.
- Existing audit scripts show the project already values data quality.
- The current generated public data is internally consistent in the checks I ran.

## Priority Recommendations

1. Extract pure route/search/filter logic from `src/main.tsx` into testable modules.
2. Add a read-only data validation command.
3. Cache route GeoJSON loading and avoid refetching all sections on every map interaction.
4. Split large trail generator scripts into source data, transforms, and write orchestration.
5. Add explicit research/completeness metadata to sections and facilities.

## Read-Only Checks Performed

- Listed project files and key config files.
- Reviewed `src/main.tsx`, `src/types.ts`, `src/styles.css`, generator scripts, audit helpers, and research docs.
- Parsed current source and generated JSON.
- Checked that public index detail paths exist.
- Checked that trail-system route `geojsonPath` references exist.
- Checked for duplicate section IDs and duplicate facility IDs within sections.
- Checked route-group references for unknown section IDs.

Results:

- `data/trail-systems.json`: 2 systems.
- `public/data/hikes-index.json`: 2 index items.
- Roslagsleden public detail: 10 sections.
- Sormlandsleden public detail: 94 sections.
- Missing public detail paths: 0.
- Missing route files: 0.
- Unknown route-group section references: 0.
- Duplicate section IDs found: 0.
