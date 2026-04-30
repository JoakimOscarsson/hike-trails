# Candidate Trails

These folders hold the research packets, normalization handoffs, and import-prep
artifacts for candidate trails. Several candidates have now been promoted into
runtime source/public data; the inventory below is the source of truth for each
trail's current import posture.

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
- `npm run data:candidate:import`: import the approved candidate slice into runtime source shards, public trail-system shards, and route GeoJSON.

## Current Inventory

| Trail ID | Name | Files | Readiness | Notes |
| --- | --- | ---: | --- | --- |
| `bohusleden` | Bohusleden | 27 sections | Imported to runtime data | Runtime source/public shards and 27 section route files exist; Stage 21 is deliberately a separate partial/self-navigation entry because official sources say the marked stage is not continuous. |
| `hallandsleden` | Hallandsleden | 35 sections | Imported to runtime data | Runtime source/public shards and 35 section route files exist; 9 selectable chains preserve the branched inland network and the official coastal gap. |
| `hogakustenleden` | Höga Kustenleden | 9 sections | Imported to runtime data | Runtime source/public shards and 9 section route files exist; section 2 distance and section 7 difficulty caveats are retained in notes. |
| `hoglandsleden` | Höglandsleden | 23 sections | Imported to runtime data | Runtime source/public shards and 23 section route files exist; 3 selectable chains preserve the primary loop and official branch topology. |
| `kungsleden` | Kungsleden | 27 sections | Imported to runtime data | Runtime source/public shards and 27 section route files exist; official state-trail geometry is used with boat/rowboat/road gaps kept explicit in section notes/manual route status plus one Vakkotavare-Saltoluokta transfer. |
| `nordkalottleden` | Nordkalottleden | 12 sections | Prep complete for scoped segment; not full-trail import ready | Official-source geometry artifacts exist for the Reisa/Käsivarsi/Kautokeino 12-leg model. Live source checks confirm the full trail is about 800 km with Kvikkjokk/Sulitjelma southern variants, so do not import this as the full Nordkalottleden until whole-trail coverage is researched. |
| `ostkustleden` | Ostkustleden | 8 sections | Imported to runtime data | Runtime source/public shards and 8 section route files exist; opening/service caveats are retained in notes and descriptions. |
| `padjelantaleden` | Padjelantaleden | 10 sections | Imported to runtime data | Runtime source/public shards and 10 section route files exist; stages 1 and 10 are manual because boat/access legs are deliberately not joined into walking geometry. |
| `sjuharadsleden` | Sjuhäradsleden | 10 sections | Imported to runtime data | Runtime source/public shards and 10 section route files exist; estimated-time details are normalized into section notes. |
| `tjustleden` | Tjustleden | 9 sections | Imported to runtime data | Runtime source/public shards and 9 mainline section route files exist; official loop/connector extras remain caveated outside the selected runtime route. |
| `vastra-vatterleden` | Västra Vätterleden | 8 sections | Imported to runtime data | Runtime source/public shards and 8 primary section route files exist; alternate/access variants remain caveated outside the selected runtime geometry. |
| `vikingaleden` | Vikingaleden | 12 sections | Imported to runtime data | Runtime source/public shards and 12 route files exist; live overview and Etapp 12 checked; sections 7-12 import as a selectable Upplandsleden-overlap chain. |
| `stockholm-archipelago-trail` | Stockholm Archipelago Trail | 1 summary | Research-only / existing app work | Whole-trail research file; separate from the current 12-trail prep batch. |
| `upplandsleden` | Upplandsleden | 44 section/loop files | Existing app/reference data | Has a dedupe registry and is used as reference context for Vikingaleden overlap. |

## Integration Rule

Do not point runtime code, generator scripts, or validation rules directly at this
folder. Runtime integration must go through the candidate importer and produce
normalized source data under `data/source/hiking/<trail-id>/`, generated public
trail-system shards under `public/data/trail-systems/<trail-id>/`, and route
GeoJSON under `public/routes/hiking/<trail-id>/`.
