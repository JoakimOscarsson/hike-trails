# Development Plan: Stockholm Archipelago Trail Integration

Date: 2026-04-29

Workspace target: `/Users/joakim/Documents/codex/hike-trails`

Status: Slice 10 completed; implementation plan completed.

This is a living development plan for bringing Stockholm Archipelago Trail into the app. It is intentionally concrete: every slice has a scope, likely files, a definition of done, and validation notes. The trail is ferry-dependent, so ferry transfers are first-class route connections, not just text notes.

This document is now tracking implementation progress; runtime changes are committed per slice.

## Agent Start Here

Use this document when implementing Stockholm Archipelago Trail.

Primary inputs:

- `data/research/candidate-trails/stockholm-archipelago-trail/trail.research.json`
- `data/research/candidate-trails/stockholm-archipelago-trail/README.md`
- `data/source/hiking/README.md`
- `docs/data-pipeline.md`
- Current hiking source examples under `data/source/hiking/roslagsleden/` and `data/source/hiking/sormlandsleden/`

Important rule: the candidate research file is an input only. Runtime code must not read `data/research/candidate-trails/**` directly. Import into app-owned source shards first, then generate public runtime data.

## Progress Log

- [x] Reviewed raw Stockholm Archipelago Trail facility types against the current app facility taxonomy.
- [x] Agreed to skip `harbor_services`.
- [x] Agreed that ferries are central and need route-connection rendering on the map.
- [x] Slice 0: Lock the import contract and normalization policy.
- [x] Slice 1: Add ferry-capable transfer and connection data types.
- [x] Slice 2: Map ferry and rowboat transfers between sections.
- [x] Slice 3: Render connection routes on the map.
- [x] Slice 4: Create Stockholm Archipelago Trail hiking source shards.
- [x] Slice 5: Normalize and import facilities.
- [x] Slice 6: Update access, detail, and route-builder UX for ferry-dependent sections.
- [x] Slice 7: Add build scripts and generated runtime outputs.
- [x] Slice 8: Add validation and tests.
- [x] Slice 9: Complete browser/product QA.
- [x] Slice 10: Update documentation and release notes.

## Product Goals

Stockholm Archipelago Trail should feel like a real trail system in the app, not a pile of disconnected island walks.

The app should answer:

- Which official section am I looking at?
- What facilities exist on or near that section?
- How do I move from this section to the next island or section?
- Which ferry, rowboat, bus, or walking connector is part of that transfer?
- Is a transfer seasonal, timetable-dependent, or otherwise volatile?

Ferry and rowboat connections should be drawn as connection routes on the map. These lines are planning references, not navigation tracks.

## Current Facility Policy

Keep the app's visible category set compact. Normalize Stockholm Archipelago Trail facilities into the current app categories unless a type truly needs a new model.

Current category grouping:

| Display group | Facility types |
| --- | --- |
| Warnings | `rule-warning`, `hazard` |
| Shelter and emergency | `shelter`, `unofficial-shelter`, `emergency-phone` |
| Water | `water`, `natural-water` |
| Tent sites | `campsite`, `camping` |
| Fire | `fireplace` |
| Toilets and waste | `toilet`, `waste` |
| Food, lodging, services | `food`, `lodging`, `service` |
| Parking and transit | `parking`, `transit` |
| Places | `rest-area`, `attraction`, `heritage`, `viewpoint`, `swimming` |

Recommended Stockholm Archipelago Trail normalization:

| Raw type | Import policy |
| --- | --- |
| `beach` | Normalize to `swimming`. |
| `shop` | Normalize to `food` when it is grocery/resupply; use `service` only for clearly non-food shops. |
| `accommodation` | Normalize to `lodging`. |
| `transport` | Normalize point facilities to `transit`, but model ferries separately as transfer connections too. |
| `poi` | Normalize case-by-case to `heritage`, `attraction`, or `viewpoint`. |
| `nature` | Normalize to `attraction` or `viewpoint`, depending on whether it is a place or a viewing point. |
| `shelter_fire_rest_area` | Split into separate `shelter`, `fireplace`, and `rest-area` facilities when the source supports all three. |
| `rental` | Normalize to `service` only if useful for hikers; otherwise keep as metadata and suppress from map facilities. |
| `sauna` | Normalize to `service` only if intentionally shown; otherwise suppress from map facilities. |
| `water_campsite_context` | Do not import as a public trail water point unless verified as public trail-relevant water. |
| `harbor_services` | Skip. The user explicitly agreed this can be left out. |

## Ferry Connection Policy

Ferry connections are part of how this trail works. Do not hide them inside free-text access notes.

Each adjacent official section transition should have an explicit connection decision:

- `same-island`: no ferry or connection route needed.
- `walk`: short connector path between endpoints.
- `bus`: land transit connector.
- `ferry`: scheduled public ferry, usually Waxholmsbolaget or equivalent.
- `rowboat`: self-service rowboat or similar official crossing.
- `none`: no normal direct connection; explain the gap.
- `unknown`: temporary state only while importing; validation should reject this before release.

Connection records should include:

- Stable ID.
- From section ID and to section ID.
- Mode.
- From and to labels.
- From and to coordinates.
- Operator or route name when known.
- Timetable/source URL when available.
- Seasonality/currentness warning when relevant.
- Geometry path for drawable connection routes.
- A short public note for route-builder/detail display.

Connection geometry should be visibly different from walking trail geometry. Recommended map treatment: thinner dashed blue/teal line below section route lines, with small ferry/rowboat endpoint markers where useful. Keep it quiet enough that walking route and facilities remain the primary map read.

## Slice 0: Import Contract And Normalization Policy

Status: completed 2026-04-29.

Completion notes:

- Added `scripts/audit-stockholm-archipelago-trail-facilities.mjs`.
- Added `npm run data:sat:facility-audit` and `npm run data:sat:facility-audit:check`.
- Added `data/research/candidate-trails/stockholm-archipelago-trail/facility-normalization-audit.json`.
- Updated the SAT research README with the audit commands.
- Current audit covers 731 facility/POI/suppression/pending records and 98 access/transfer records.
- Current audit has zero unsupported import types, zero unsupported access types, and zero normalized runtime types outside the app facility taxonomy.
- The audit deliberately leaves pending and suppressed records out of import; those remain traceable in the audit output.

Scope:

- Freeze the Stockholm Archipelago Trail import rules before writing generator code.
- Decide which raw research records become public facilities, route transfers, metadata, or suppressed records.
- Confirm the exact source-to-runtime normalization table.

Likely files:

- `docs/planning/stockholm-archipelago-trail-integration-devplan-2026-04-29.md`
- `data/research/candidate-trails/stockholm-archipelago-trail/README.md`
- Future import helper or fixture under `scripts/` if needed.

Work:

- Add a SAT-specific normalization fixture or audit output listing every raw facility type and its import decision.
- Confirm `shop`, `rental`, `sauna`, `nature`, and `poi` case handling.
- Keep `harbor_services` skipped.
- Define how suppressed metadata is preserved for future re-review without leaking into public runtime data.

Definition of done:

- Every raw `facilitiesDraft` and `appImportPreviewDraft` facility type has a documented import decision.
- No raw SAT facility type can silently pass through as an unsupported app type.
- The plan identifies which records become ferry/transfer data instead of ordinary facilities.
- A future agent can run one command or inspect one fixture to see unresolved SAT normalization records.

Validation:

- Add or run an audit that counts unsupported raw SAT facility types.
- Confirm expected unsupported count goes to zero after applying normalization decisions, excluding intentionally suppressed metadata.

## Slice 1: Ferry-Capable Transfer And Connection Data Types

Status: completed 2026-04-29.

Completion notes:

- Added `TrailSectionConnection`, `TrailConnectionEndpoint`, `TrailConnectionMode`, `TrailTransitStop`, and ferry-capable transit typing in `src/types.ts`.
- Added optional `connections.json` support to hiking source shard reads/writes and public trail-system shard writes.
- Added optional runtime loading for trail-system connections through `src/data/library.ts`.
- Added validation for connection IDs, modes, section references, endpoint coordinates, ferry/rowboat navigation-use constraints, route metadata, and connection GeoJSON paths.
- Added runtime probe and unit-test coverage for connection shard loading.
- Existing Roslagsleden and Sörmlandsleden stay valid with no connection records.

Scope:

- Extend the data contract so the app can represent ferry, rowboat, bus, and walking transfers between trail sections.
- Keep existing Roslagsleden and Sormlandsleden data valid.

Likely files:

- `src/types.ts`
- `scripts/validate-data.mjs`
- `scripts/lib/trail-system-builder.mjs`
- `scripts/lib/write-trail-system-shards.mjs` or `scripts/lib/hiking-source-shards.mjs`
- `data/source/hiking/README.md`

Work:

- Add a trail connection/transfer type, for example `TrailSectionConnection`.
- Extend transit stop typing from `bus | train` to include `ferry` where appropriate, or introduce a more general transit stop model.
- Decide whether `rowboat` is a connection mode only or also a visible transit-like point.
- Add runtime fields to trail-system manifest or route groups so section-to-section transfers can be loaded without fetching every section detail.
- Validate connection references, mode values, coordinates, and geometry paths.

Definition of done:

- TypeScript has an explicit model for inter-section connections.
- `ferry` is supported without abusing `bus` or generic `transit`.
- Existing trail systems still validate and render unchanged when they have no connection records.
- Validation rejects unknown connection modes and missing referenced sections.

Validation:

- `npm run data:validate`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`

## Slice 2: Ferry And Rowboat Transfer Mapping

Status: completed 2026-04-29.

Completion notes:

- Added `scripts/build-stockholm-archipelago-trail-connections.mjs`.
- Added `npm run data:sat:connection-plan` and `npm run data:sat:connection-plan:check`.
- Added `data/research/candidate-trails/stockholm-archipelago-trail/section-connection-plan.json`.
- Added 21 public planning-route GeoJSON files under `public/routes/hiking/stockholm-archipelago-trail/connections/`.
- Current plan covers all 21 adjacent official section transitions across 22 entries: 16 ferry-style transfers, 1 rowboat crossing, and 4 walking connectors.
- Exact ferry schedules remain planner/currentness caveats; route lines are approximate planning references rather than navigation tracks.
- Validation passed: `npm run data:sat:connection-plan:check`, `node --check scripts/build-stockholm-archipelago-trail-connections.mjs`, `npm run data:validate`, and `git diff --check`.

Scope:

- Map which ferry, rowboat, bus, or walking route connects each official Stockholm Archipelago Trail section to the next.
- Produce drawable connection route geometry.

Likely files:

- `data/source/hiking/stockholm-archipelago-trail/route-groups.json`
- `data/source/hiking/stockholm-archipelago-trail/connections.json` if a new source shard is introduced.
- `public/routes/hiking/stockholm-archipelago-trail/connections/*.geojson`
- SAT import/build script under `scripts/`

Work:

- Build an ordered section adjacency table from the official SAT section list.
- For every adjacent pair, record one of: same-island, walk, bus, ferry, rowboat, none.
- Add ferry route names or operators where available.
- Draw simple connection geometries between relevant docks/stops. Use straight or lightly shaped lines unless authoritative route geometry exists.
- Mark connection geometry as planning reference, not navigation.
- Keep timetable-dependent details as source/currentness metadata rather than hardcoding schedule promises.

Definition of done:

- Every adjacent official section transition has an explicit connection decision.
- Every `ferry`, `rowboat`, `bus`, or `walk` connection has from/to coordinates and a geometry path.
- Every seasonal or timetable-dependent connection has a public caveat.
- There are no `unknown` connection modes in release data.

Validation:

- Connection geometry files exist and parse as GeoJSON.
- Connection endpoints are within a reasonable distance of their referenced section endpoints or named access points.
- Validation fails if a section adjacency has no connection decision.

## Slice 3: Map Rendering For Connection Routes

Status: completed 2026-04-29.

Completion notes:

- Added `src/map/trailSystemConnections.ts` for selecting drawable adjacent transfer routes from the currently chosen section range.
- Updated `TrailSystemMap` to load selected connection GeoJSON in parallel with section GeoJSON.
- Updated trail-system route drawing to render connection routes as quiet dashed lines below walking route lines, with compact hover tooltips and no new marker-icon sprawl.
- Kept start/end callouts and facility markers in separate upper layers.
- Added unit coverage for adjacent connection selection, including reverse-order stored connections and skipped non-drawable records.
- Fixed overview-map tooltip binding on grouped GeoJSON layers found during browser QA.
- Validation passed: `npm run typecheck`, `npm run test:unit`, `npm run data:validate`, `npm run build`, `git diff --check`, plus browser smoke checks for overview and a non-SAT trail-system detail map.
- SAT-specific browser proof remains for Slice 4/7, once SAT source/runtime shards exist in the app.

Scope:

- Draw ferry/rowboat/transfer routes on trail-system maps.
- Keep them visually distinct from walking trail geometry and facility markers.

Likely files:

- `src/map/TrailSystemMap.tsx`
- `src/map/trailSystemRouteLayers.ts`
- `src/map/hikingCommuteMarkers.tsx`
- `src/map/routeGeometry.ts`
- `src/styles.css`

Work:

- Load connection route GeoJSON alongside selected/context section route geometry.
- Render connection routes below walking route lines.
- Use a consistent connection style, likely dashed with modest opacity.
- Add ferry/rowboat endpoint markers only when they add clarity.
- Ensure facility filter hover highlighting still targets facilities only.
- Ensure start/end callouts stay above connection layers and remain readable.
- Decide whether the overview map shows all ferry connections or only relevant selected/context connections.

Definition of done:

- Selecting SAT sections displays the walking route plus relevant ferry/rowboat/walk/bus connection lines.
- Connection lines do not change facility counts, filter behavior, or facility hover highlighting.
- Start/end labels are not covered by connection routes or ferry markers.
- Desktop and mobile maps remain legible.

Validation:

- Browser inspect a SAT section with at least one ferry transfer.
- Browser inspect a multi-section SAT selection with at least one ferry/rowboat transfer.
- Browser inspect a non-SAT trail system and confirm no visual regression.
- If screenshots are produced, save them under `artifacts/` or `docs/test-reports/` according to the existing workflow.

## Slice 4: Stockholm Archipelago Trail Source Shards

Status: completed 2026-04-29.

Completion notes:

- Added `scripts/build-stockholm-archipelago-trail-source-shards.mjs`.
- Added `npm run data:sat:source-shards` and `npm run data:sat:source-shards:check`.
- Added app-owned source shards under `data/source/hiking/stockholm-archipelago-trail/`.
- Added 22 section shards, 1 mainline route group, 4 presets, and 21 source connection records copied from the Slice 2 plan with plan-only `via` points stripped.
- Generated public runtime shards under `public/data/trail-systems/stockholm-archipelago-trail/`.
- Generated public hiking indexes and overview data now include Stockholm Archipelago Trail as a marker-only trail-system entry.
- Walking section geometry is intentionally `marker-only` in this slice; transfer connection route geometry is available and displayed as planning-reference lines.
- Browser QA confirmed SAT appears in the app, opens the route builder, uses clean section labels, and shows northern ferry connection lines.
- Validation passed: `npm run data:sat:source-shards:check`, `node --check scripts/build-stockholm-archipelago-trail-source-shards.mjs`, `npm run data:build`, `npm run data:validate`, `npm run data:check`, `npm run runtime:probe`, `npm run typecheck`, `npm run test:unit`, `npm run build`, and `git diff --check`.

Scope:

- Create app-owned hiking source shards for Stockholm Archipelago Trail.
- Keep generated runtime data deterministic.

Likely files:

- `data/source/hiking/stockholm-archipelago-trail/manifest.json`
- `data/source/hiking/stockholm-archipelago-trail/sections-index.json`
- `data/source/hiking/stockholm-archipelago-trail/sections/*.json`
- `data/source/hiking/stockholm-archipelago-trail/route-groups.json`
- `data/source/hiking/stockholm-archipelago-trail/presets.json`
- `public/routes/hiking/stockholm-archipelago-trail/*.geojson`

Work:

- Convert official SAT sections into the same source shard structure used by Roslagsleden and Sormlandsleden.
- Import section metadata: name, island/area labels, distance, difficulty, estimated time, route source, and geometry status.
- Generate or add route GeoJSON for each section.
- Add useful presets without over-designing them; island/cluster presets are likely more useful than a single full-trail preset at first.

Definition of done:

- SAT has app-owned source shards and public route geometry.
- Every section in `sections-index.json` has a matching section file.
- Every ready section references an existing route GeoJSON.
- Route order matches official SAT sequence or documented app sequence.
- Generated public runtime data includes SAT in the hiking library index.

Validation:

- `npm run data:build`
- `npm run data:validate`
- `npm run data:check`

## Slice 5: Facility Normalization And Import

Status: completed 2026-04-29.

Completion notes:

- Extended `scripts/build-stockholm-archipelago-trail-source-shards.mjs` to import facilities from the Slice 0 normalization audit.
- Imported only `import_facility`, `normalize_facility`, `case_normalize_facility`, and `split_facility` records.
- Kept pending, suppressed, metadata-only, access, and connection records out of app facilities.
- Imported 284 normalized facilities across 20 of 22 SAT sections.
- Skipped 2 coordinate-less import candidates so every rendered SAT facility has coordinates.
- Split multi-type records into separate typed facilities, including shelter/fire/rest-area records.
- No new facility categories or marker icons were added.
- Browser QA confirmed SAT facility clusters and filter counts render in the builder, and the info view facility list loads without internal audit wording.
- Validation passed: `npm run data:sat:source-shards:check`, `npm run data:build`, `npm run data:validate`, `npm run data:check`, `npm run runtime:probe`, `npm run typecheck`, `npm run test:unit`, `npm run build`, and `git diff --check`.

Scope:

- Normalize SAT facilities into the current app category model.
- Avoid expanding the icon/category set unless the product need is clear.

Likely files:

- `data/source/hiking/stockholm-archipelago-trail/sections/*.json`
- `scripts/validate-data.mjs`
- SAT import helper under `scripts/`
- `src/map/hikingFacilities.tsx` only if category behavior truly changes.
- `src/map/hikingFacilityMarkers.tsx` only if icon behavior truly changes.

Work:

- Apply the normalization table in this plan.
- Split combined records like `shelter_fire_rest_area`.
- Normalize `beach` to `swimming`.
- Normalize grocery/resupply `shop` records to `food`.
- Normalize `accommodation` to `lodging`.
- Normalize useful `rental` and `sauna` records to `service` only if intentionally public.
- Skip `harbor_services`.
- Skip or suppress metadata-only `water_campsite_context` unless verified as public trail-relevant water.
- Keep ferry dock/ferry records as `transit` facilities and as route connections where they connect sections.

Definition of done:

- No imported SAT facility uses an unsupported facility type.
- Every imported SAT facility has coordinates, a section owner, a source, and a route-proximity policy.
- Metadata-only facilities are suppressed intentionally and traceably.
- Map filter counts match rendered markers for SAT sections.

Validation:

- `npm run data:validate`
- Browser inspect SAT facility filters and marker counts.
- Hover each facility filter group and confirm matching icons highlight correctly.

## Slice 6: Access, Detail, And Route-Builder UX

Scope:

- Make SAT understandable in the detail view and route builder, especially when selected sections require ferry transfers.

Likely files:

- `src/components/TrailSystemDetails.tsx`
- `src/components/DetailBlocks.tsx`
- `src/data/trailRouteSelection.ts`
- `src/types.ts`
- `src/styles.css`

Work:

- Show ferry/rowboat/bus/walk transfers in selected-route details.
- Add ferry-aware getting-there/access display where current `busStop` and `trainStop` assumptions are too narrow.
- Decide how multi-section SAT selections behave when sections are separated by ferry transfers.
- Add concise caveats for seasonal/timetable-dependent transfers.
- Keep the UI calm: connections should aid planning without turning the route builder into a timetable app.

Completed:

- Added a selected-transfer helper that returns adjacent ferry/rowboat/bus/walk transfers even when a connection has no drawable map geometry.
- Added a compact transfer summary to the route builder so SAT selections show required transfers before the user enters the detail view.
- Added a `Route Transfers` detail block with mode, endpoints, service/operator, notes, timetable/currentness caveats, and source links.
- Made selected-route access text and transit access cards aware of `ferryStop` and `nearestStop` while keeping bus/train-only trail systems visually unchanged.
- Adjusted the builder header wrapping so transfer counts do not squeeze explanatory text on narrower layouts.

Definition of done:

- A user can select adjacent SAT sections and see the required transfer between them.
- Ferry-dependent sections do not look like they connect by walking route alone.
- Non-SAT trail systems still behave exactly as before.
- Mobile layout handles transfer rows without text overlap.

Validation:

- `npm run test:unit` for route-selection helpers if behavior changes.
- `npm run typecheck`
- Browser inspect route-builder interactions for SAT and an existing trail system.

Completed validation:

- `npm run typecheck`
- `npm run test:unit`
- `npm run data:validate`
- `npm run data:check`
- `npm run runtime:probe`
- `npm run runtime:cache-probe`
- `npm run build`
- `git diff --check`
- Browser QA on `http://localhost:5173/`: SAT builder shows 3 selected transfers for the northern preset; SAT detail view shows one `Route Transfers` block with the expected ferry services and caveats; Roslagsleden builder and detail views do not render empty transfer UI.

## Slice 7: Build Scripts And Generated Runtime Outputs

Scope:

- Add the SAT build path to the existing hiking data pipeline.

Likely files:

- `scripts/build-stockholm-archipelago-trail-system.mjs`
- `scripts/build-hiking-data.mjs`
- `scripts/lib/trail-system-builder.mjs`
- `scripts/lib/hiking-source-shards.mjs`
- `package.json`
- `public/data/**`
- `public/routes/hiking/stockholm-archipelago-trail/**`

Work:

- Reuse existing trail-system builder helpers where possible.
- Add a SAT-specific builder only for SAT-specific import/normalization logic.
- Ensure generated outputs are deterministic and stable under repeated `npm run data:build`.
- Keep source shards as the authoring source; generated public JSON remains disposable.

Completed:

- Confirmed the main `npm run data:build` path reads app-owned hiking source shards, including SAT, and regenerates public trail-system shards from those sources.
- Kept SAT-specific research import logic isolated in `scripts/build-stockholm-archipelago-trail-source-shards.mjs`; the normal public build does not read candidate research directly.
- Added deterministic `connectionsPath` emission to generated trail-system index records when a trail system has connection shards, so SAT advertises `/data/trail-systems/stockholm-archipelago-trail/connections.json` from both the manifest and library index.
- Regenerated the public library indexes; generated churn was limited to the expected SAT `connectionsPath` field.

Definition of done:

- `npm run data:build` includes SAT or calls a documented SAT build slice.
- Generated public SAT data is deterministic.
- `npm run data:check` catches drift.
- Existing hiking and kayaking generated outputs are not rewritten except where the shared index/overview necessarily changes.

Validation:

- `npm run data:build`
- `npm run data:check`
- Review `git diff` to confirm generated churn is limited and expected.

Completed validation:

- `npm run data:build`
- `npm run data:check`
- `npm run data:validate`
- `npm run runtime:probe`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
- `node --check scripts/lib/write-trail-system-shards.mjs`
- `node --check scripts/write-hike-data.mjs`
- `git diff` review: only `connectionsPath` was added to `public/data/library-index.hiking.json` and `public/data/library-index.json`; no unrelated generated data churn.

## Slice 8: Validation And Automated Tests

Scope:

- Make SAT import mistakes hard to ship.
- Cover ferry connections as a data contract, not just a UI feature.

Likely files:

- `scripts/validate-data.mjs`
- `scripts/unit-tests.mjs`
- `scripts/probe-runtime-contract.mjs`
- `scripts/probe-browser-runtime.mjs`
- `scripts/generate-ui-smoke-report.mjs`

Work:

- Validate connection records: IDs, modes, section refs, endpoint coordinates, source URLs, geometry paths.
- Validate ferry/rowboat connection coverage for SAT section adjacency.
- Validate all SAT facilities are normalized to supported types.
- Validate no skipped metadata leaks into runtime facilities.
- Add unit coverage for route-selection behavior when connections exist.
- Add runtime probe coverage so missing connection geometry fails loudly.

Completed:

- Added SAT-specific validation that every adjacent mainline section transition has a connection decision.
- Added SAT-specific validation requiring transfer connections to carry source URLs and `/routes/hiking/stockholm-archipelago-trail/connections/*.geojson` geometry.
- Added SAT facility leak guards so internal normalization fields and disallowed trail-junction runtime facilities fail validation.
- Tightened public library-index validation so systems with connection shards expose matching `connectionsPath` in both index and manifest.
- Extended the runtime probe to verify SAT connection coverage and transfer route files.
- Updated the browser runtime probe for grouped facility filters by exposing `data-facility-types` and testing the `Tent sites` group rather than the old single `Camping` chip.

Definition of done:

- Validation fails when a SAT section transition is missing a connection decision.
- Validation fails when a connection geometry path is missing or malformed.
- Validation fails on unsupported SAT facility types.
- Unit tests cover selected-section connection inclusion.

Validation:

- `npm run data:validate`
- `npm run data:build`
- `npm run data:check`
- `npm run test:unit`
- `npm run runtime:probe`
- `npm run runtime:cache-probe`
- `npm run typecheck`
- `npm run build`
- Browser-capable environments should also run `npm run runtime:browser-probe` and `npm run ui:smoke:artifact`.

Completed validation:

- `node --check scripts/validate-data.mjs`
- `node --check scripts/probe-runtime-contract.mjs`
- `node --check scripts/probe-browser-runtime.mjs`
- `npm run data:build`
- `npm run data:check`
- `npm run data:validate`
- `npm run test:unit`
- `npm run runtime:probe`
- `npm run runtime:cache-probe`
- `npm run runtime:browser-probe`
- `npm run ui:smoke:artifact` (0 findings; tracked report unchanged)
- `npm run typecheck`
- `npm run build`
- `git diff --check`

## Slice 9: Browser And Product QA

Scope:

- Verify the actual user experience in the browser, not only data shape.

Likely files:

- `docs/test-reports/stockholm-archipelago-trail-ui-report-YYYY-MM-DD.md` if saving a report.
- `artifacts/` for temporary screenshots or smoke artifacts.

Work:

- Inspect the library list and search result for SAT.
- Inspect SAT overview map.
- Inspect an island section with normal facilities.
- Inspect a section transition that uses a ferry.
- Inspect a section transition that uses a rowboat if present.
- Inspect selected route-builder ranges with and without transfers.
- Inspect mobile width for filter chips, map controls, transfer rows, and endpoint callouts.
- Confirm ferry/currentness caveats are visible but not noisy.

Completed:

- Added `docs/test-reports/stockholm-archipelago-trail-ui-report-2026-04-29.md`.
- Verified SAT search/list behavior, northern ferry-transfer builder state, rowboat preset transfer state, no-transfer single-section state, detail transfer cards, Arholma facilities, and fresh console logs in the in-app browser.
- Re-ran the browser runtime probe after updating it for grouped `Tent sites` facility filters.
- Re-ran the tracked smoke artifact; it passed with 0 findings and no report diff.

Definition of done:

- SAT can be opened from the app and selected sections render.
- Ferry/rowboat connection routes are visible and understandable.
- Facility filters, hover highlighting, and marker counts still match.
- Start/end indicators and ferry markers do not cover each other in a confusing way.
- Existing Roslagsleden, Sormlandsleden, and kayaking paths still smoke-test cleanly.

Validation:

- In-app browser manual inspection at `http://localhost:5173/`.
- `npm run runtime:browser-probe`
- `npm run ui:smoke:artifact`
- Save any notable screenshots or notes in an artifact or test report.

Completed validation:

- In-app browser manual inspection at `http://localhost:5173/`.
- `npm run runtime:browser-probe`
- `npm run ui:smoke:artifact`
- `git diff --check`

## Slice 10: Documentation And Release Notes

Scope:

- Leave the repo understandable after SAT ships.

Likely files:

- `docs/data-pipeline.md`
- `data/source/hiking/README.md`
- `data/research/candidate-trails/stockholm-archipelago-trail/README.md`
- `docs/testing.md`
- This devplan.

Work:

- Document the SAT source shard layout and connection-route contract.
- Document ferry and timetable volatility.
- Document skipped research metadata, including `harbor_services`.
- Add a short handoff note about known future follow-ups.
- Update this plan's progress log as slices complete.

Completed:

- Updated `data/source/hiking/README.md` with SAT source-shard, connection-route, ferry volatility, and skipped metadata notes.
- Updated `data/research/candidate-trails/stockholm-archipelago-trail/README.md` to mark the research packet as an input for the integrated source shards rather than an unintegrated trail.
- Updated `docs/data-pipeline.md` with the optional `connections.json` runtime contract and SAT integration status.
- Updated `docs/testing.md` with SAT connection validation and grouped facility-filter browser probe coverage.
- Marked this devplan completed through Slice 10.

Definition of done:

- A future agent can tell which SAT data is source, generated runtime, candidate research, or temporary artifact.
- The ferry connection model is documented outside the implementation code.
- Known data caveats are recorded.
- This plan's progress log matches reality.

Completed validation:

- `npm run data:validate`
- `npm run runtime:probe`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

## Recommended Implementation Order

1. Slice 0: contract and normalization policy.
2. Slice 1: data model and validation foundation for connections.
3. Slice 2: ferry/rowboat transfer mapping and connection geometry.
4. Slice 4: SAT source shards and route geometry.
5. Slice 5: facility normalization.
6. Slice 7: build integration.
7. Slice 3 and Slice 6 together: map rendering plus route-builder/detail UX.
8. Slice 8: broader validation and tests.
9. Slice 9: browser QA.
10. Slice 10: docs and release notes.

This order keeps the data contract honest before UI work depends on it. It also lets map rendering use real connection data instead of placeholder ferry lines.

## Open Questions

- Should rowboat crossings be a distinct `rowboat` connection mode or a subtype of `ferry`? Recommendation: distinct mode, because availability and user expectations differ.
- Should all SAT ferry connections appear on the overview map, or only selected/context connections? Recommendation: selected/context first; consider overview later if it remains readable.
- Should seasonal ferries show disabled states outside season, or only caveat text? Recommendation: caveat text for MVP; avoid pretending we have live timetable state.
- Should rentals and saunas be shown as `service`? Recommendation: suppress by default unless the record clearly helps hikers plan the trail.
- Should shops always be `food`? Recommendation: grocery/resupply shops should be `food`; other retail can be `service` or suppressed.

## Full Release Gate

Before calling SAT done, run the strongest practical suite:

```sh
npm run data:build
npm run data:validate
npm run data:check
npm run test:unit
npm run runtime:probe
npm run runtime:cache-probe
npm run typecheck
npm run build
```

When a browser is available, also run:

```sh
npm run runtime:browser-probe
npm run ui:smoke:artifact
```

For a final local confidence check, run:

```sh
npm run test:all
```

## Plan Review

Review status: detailed enough to start implementation, with a few explicit product/data decisions still open.

What is covered well:

- The plan separates data modeling, source import, facility normalization, ferry connection mapping, map rendering, route-builder UX, validation, and browser QA.
- Ferry transfers are first-class route connections with geometry, not buried in notes.
- Definitions of done include both automated checks and manual browser validation.
- The plan keeps the current compact facility category system and avoids icon/category sprawl.
- Existing trail systems are protected by validation and non-regression checks in each relevant slice.

Main risks to watch:

- Ferry timetables and seasonal operation are volatile. The app should store source/currentness metadata and avoid live schedule promises until a real timetable integration exists.
- Connection geometry may be approximate. Label it as a planning reference and avoid navigation claims.
- SAT source data mixes trail facilities, harbor metadata, tourism services, transport, and attractions. The normalization audit must happen before bulk import.
- Route-builder UX can become noisy if every transfer detail is shown at once. Start with concise transfer rows and map connection lines.
- Overview rendering may become cluttered if every ferry connection is always visible. Prefer selected/context rendering first.

Conclusion:

This plan is detailed enough for the next implementation slice. The first concrete task should be Slice 0: create a SAT normalization audit/fixture and lock the import decisions before extending the runtime contract.
