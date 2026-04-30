# Candidate Trails

These trail datasets are research results, not app-ready source data.

## Layout

Each candidate trail may contain:

- `trail.research.json`: whole-trail research summary or early one-file research packet.
- `sections/*.research.json`: section, stage, or loop research packets.
- `normalization-handoff.research.json`: shared-shape handoff for the next import-prep pass.
- `integration-dedupe.research.json`: cross-section dedupe notes to apply during import.
- `README.md`: human-facing status and integration notes.

Shared coordination files:

- `normalization-prep.research.json`: batch-level status and phase tracking.
- `shared-importer-decisions.research.json`: shared importer-model decisions for distances, geometry, connectors, partial sections, direction reversal, facilities, rule warnings, and overlap dedupe.
- `normalization-quality-gate.research.json`: consistency audit result for starting candidate normalized artifacts.
- `phase3-candidate-artifacts.research.json`: batch summary for generated candidate-only normalized artifacts.
- `blocker-triage.research.json`: per-trail blocker disposition with a bias toward fixing candidate-prep issues before runtime import.
- `geometry-topology-fix-pass.research.json`: first fix-now pass documenting explicit route topology, gap, connector and display-distance decisions.
- `manifest.json`: machine-readable candidate inventory.

Generated supplemental per-trail artifact:

- `normalized-candidate/route-topology.research.json`: candidate-only route groups, known gaps/connections, and display policies. It is research/prep data and is not app runtime source.
- `normalized-candidate/facility-clusters.research.json`: candidate-only facility dedupe/taxonomy clusters for parent sites, duplicate section-boundary records, and child amenities.

Candidate artifact commands:

- `npm run data:candidate-normalization:build`: rebuild `normalized-candidate/` artifacts from research packets.
- `npm run data:candidate-normalization:check`: validate handoffs, shared decisions, phase 3 report, and generated candidate artifacts.
- `npm run data:candidate-geometry:gpx`: rebuild research-only candidate GeoJSON from section GPX source URLs for GPX-backed trails.

## Current Inventory

| Trail ID | Name | Files | Readiness | Notes |
| --- | --- | ---: | --- | --- |
| `bohusleden` | Bohusleden | 27 sections | Candidate artifacts generated | Mapdata exists for 26 full stages; Stage 21 remains a partial/self-navigation geometry blocker. |
| `hallandsleden` | Hallandsleden | 35 sections | Candidate artifacts generated | Canonical and draw-ready geometry artifacts exist for all sections. |
| `hogakustenleden` | Höga Kustenleden | 9 sections | Candidate artifacts generated | Needs geometry artifact build and source-caveat policies for section 2 distance and section 7 difficulty. |
| `hoglandsleden` | Höglandsleden | 23 sections | Candidate artifacts generated | Section research is complete; geometry package is partial. |
| `kungsleden` | Kungsleden | 27 sections | Candidate artifacts generated | Geometry QA exists; source/licensing and endpoint conventions remain open. |
| `nordkalottleden` | Nordkalottleden | 12 sections | Candidate artifacts generated | Official-source geometry artifacts exist; endpoint/connector gaps must remain explicit. |
| `ostkustleden` | Ostkustleden | 8 sections | Candidate artifacts generated | Has caveat resolution, current verification, and normalization planning files. |
| `padjelantaleden` | Padjelantaleden | 10 sections | Candidate artifacts generated | Needs remote access, hut cluster, and seasonal bridge/boat policies during import. |
| `sjuharadsleden` | Sjuhäradsleden | 10 sections | Candidate artifacts generated | Has caveat resolution; next work is geometry cleanup and facility/rule normalization. |
| `tjustleden` | Tjustleden | 9 sections | Candidate artifacts generated | Requires importer support for official/computed distance, tails/connectors, direction reversal, and pending/suppress states. |
| `vastra-vatterleden` | Västra Vätterleden | 8 sections | Candidate artifacts generated | Has static import-readiness and risk-resolution notes; needs route/connector geometry normalization. |
| `vikingaleden` | Vikingaleden | 12 sections | Candidate artifacts generated | Needs Upplandsleden overlap dedupe for sections 7-12. |
| `stockholm-archipelago-trail` | Stockholm Archipelago Trail | 1 summary | Research-only / existing app work | Whole-trail research file; separate from the current 12-trail prep batch. |
| `upplandsleden` | Upplandsleden | 44 section/loop files | Existing app/reference data | Has a dedupe registry and is used as reference context for Vikingaleden overlap. |

## Integration Rule

Do not point runtime code, generator scripts, or validation rules directly at this folder unless the task is explicitly about importing candidate trails. Integration should produce normalized source data under the future `data/source/trail-systems/<trail-id>/` contract, then generated runtime shards under `public/data/`.
