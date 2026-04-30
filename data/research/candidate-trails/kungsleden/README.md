# Kungsleden Research

Status: phase 2 section research complete as a research-only candidate. Do not integrate into runtime data yet.

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

## Phase 2 Section Research

All 27 mainline Kungsleden section packets have been researched and written under `sections/`.

Current handoff:

- Section files validate as JSON.
- Section 27, `Viterskalet-Hemavan`, is complete with caveats resolved around Hemavan endpoint convention, Naturkartan GPX availability, AC3 geometry clipping and side-route facility suppression.
- Cross-trail geometry QA is complete in `geometry-qa-2026-04-30.research.json`.
- Official Naturvårdsverket/Länsstyrelsen master geometry candidates were found for all section groups, with relevant summer hiking features at `GEOMETRIKVALITET <=20 meter`.
- Geometry-affecting caveats are addressed for research by source hierarchy, clipping/splitting, direction normalization, endpoint-zone handling and typed connector policy.
- The candidate is ready for a research-only QA and normalization-planning pass.
- The candidate is not ready for runtime integration.

## Safe Next Work

Do not run generated-data or runtime import commands yet. Next, use the geometry QA packet to write a research-only normalization/import specification covering source policy, EPSG:3006-to-WGS84 transformation, official feature assembly, section clipping/splitting, direction normalization, endpoint-zone handling, typed boat/rowboat/road connectors, route simplification, shared facility deduplication, taxonomy mapping and live-currentness refresh requirements.
