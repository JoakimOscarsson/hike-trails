# Kungsleden Research

Status: imported to runtime data on 2026-04-30 after source-policy, transfer-policy, facility-taxonomy and section-14 geometry fixes.

Trail id: `kungsleden`

## Phase 1 Overview

Kungsleden is the official Swedish long-distance mountain trail between Abisko in Norrbotten and Hemavan in Vasterbotten. STF describes the trail as just over 450 km and as passing through Abisko, Stora Sjofallet, Sarek and Pieljekaise national parks. The County Administrative Board of Norrbotten describes it as Sweden's oldest and best-known hiking trail, from Abisko to Hemavan, with a developed hut system in the north.

For import planning, this candidate treats the main Abisko-Hemavan Kungsleden line as 27 hiking sections, plus non-hiking/access connection metadata. This avoids duplicating the popular Singi-Kebnekaise-Nikkaluokta access route, which STF includes in its public Kungsleden stage pages but explicitly says is not part of the official Kungsleden between Singi and Nikkaluokta.

Primary official source families:

- STF Kungsleden overview and five route-group pages.
- Länsstyrelsen Norrbotten state-trail and Naturkartan pages.
- Länsstyrelsen Västerbotten trail and Naturkartan pages.
- Naturkartan route pages and embedded map linework.
- National park/protected-area rule pages for Abisko, Laponia parks, Pieljekaise, Vindelfjällen and Tjålmejaure.

Important import-shaping findings:

- Mainline section count: 27 hiking sections, based on STF day-stage order after excluding non-main access legs and modelling transfer/boat gaps separately.
- STF public route groups: Abisko-Nikkaluokta, Nikkaluokta-Saltoluokta, Saltoluokta-Kvikkjokk, Kvikkjokk-Ammarnäs, Ammarnäs-Hemavan.
- Non-main or connection records needed: Singi-Kebnekaise-Nikkaluokta access spur; Vakkotavare-Kebnats road/bus plus Kebnats-Saltoluokta M/S Langas transfer; several lake crossings by scheduled motorboat and/or rowboat.
- STF page contradiction: Kvikkjokk-Ammarnäs summary says 8 stages but the page lists 9 stage headings. This candidate preserves the listed 9 sections until Phase 2 can confirm the intended grouping.
- Distance contradiction: official overview says just over 450 km; summed STF mainline hiking-stage distances are about 434 km, while adding the 30 km Vakkotavare-Saltoluokta road/boat transfer plus named boat crossings brings planning mileage closer to 470 km. Keep distance semantics explicit during normalization.
- Naturkartan GPX availability is mixed: some route slugs return downloadable GPX, while some early Norrbotten route slugs returned HTTP 500 on 2026-04-29. Per-section geometry must verify each source independently.

## Files

- `trail.research.json`: whole-trail overview packet and official section order.
- `research-progress.json`: resumable progress ledger.
- `sections/*.research.json`: one file per section after Phase 2 synthesis.
- `geometry/candidate/source-downloads/*.geojson`: filtered official Naturvårdsverket/Länsstyrelsen Leder WFS source downloads in EPSG:3006, by `Led_ID`.
- `geometry/candidate/sections/*.geojson`: generated WGS84 candidate section geometry for all 27 Kungsleden sections.
- `geometry/candidate/kungsleden-candidate-section-geometries.geojson`: combined generated section FeatureCollection for map/overlay QA.
- `normalized-candidate/route-geometry-build.research.json`: reproducible geometry build report with snaps, source parts, preserved gaps and warnings.
- Runtime source/public shards under `data/source/hiking/kungsleden/`, `public/data/trail-systems/kungsleden/` and `public/routes/hiking/kungsleden/sections/`.

## Phase 2 Section Research

All 27 mainline Kungsleden section packets have been researched and written under `sections/`.

Current handoff:

- Section files validate as JSON.
- Section 27, `Viterskalet-Hemavan`, is complete with caveats resolved around Hemavan endpoint convention, Naturkartan GPX availability, AC3 geometry clipping and side-route facility suppression.
- Cross-trail geometry QA is complete in `geometry-qa-2026-04-30.research.json`.
- Official Naturvårdsverket/Länsstyrelsen master geometry candidates were found for all section groups, with relevant summer hiking features at `GEOMETRIKVALITET <=20 meter`.
- Geometry-affecting caveats are addressed for research by source hierarchy, clipping/splitting, direction normalization, endpoint-zone handling and typed connector policy.
- Candidate GeoJSON is generated for all 27 sections from official EPSG:3006 Leder WFS linework, transformed to WGS84, anchor-routed through multipart source features, clipped/split to researched section anchors and simplified at 5 m tolerance.
- The generated land/walking section geometry totals 418.647 km after fixing section 14 to start at the researched Tsiele split instead of the full BD77 Mallenjarka line start.
- Runtime distance is the normalized 27-section display-distance sum, 434 km. Official public summaries still describe the whole trail as more than 450 km because transfer/boat/access semantics differ by source.
- Boat, rowboat, road transfer and service-zone offsets are intentionally kept as transfer/access metadata or section notes rather than invented hiking linework.
- The runtime import has one main route group, `kungsleden-mainline`, and one explicit Vakkotavare-Saltoluokta transfer. Sections 8, 10, 11, 13, 17 and 20 are marked `manual` route status because their map line is planning-grade or land-only around required transfer/gap context.
- Runtime validation, generated-data checks and Kungsleden route-file sanity checks passed after import.
- The initial runtime import carried the full facility inventory into section details but did not carry point coordinates into map markers. On 2026-05-01 the candidate importer was updated to backfill runtime facility coordinates from the section research packets when the normalized facility record lacks a point coordinate. After regenerating Kungsleden, 292 of 306 runtime facilities have map coordinates; the remaining unplaced records are broad water/service/transfer context without a safe single point.

## Safe Next Work

Before user-facing publication, refresh volatile facts: boat timetables/operators/payment, Vakkotavare-Kebnats-Saltoluokta transfer planning, bridge status, hut seasons, fire bans, weather, reindeer/hunting/fishing restrictions, protected-area rules, parking and service openings. If the app later gains typed in-section transfer geometry, sections 8, 10, 11, 13 and 17 are the first places to upgrade from notes/manual status.
