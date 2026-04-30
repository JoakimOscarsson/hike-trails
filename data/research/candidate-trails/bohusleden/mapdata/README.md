# Bohusleden Candidate Mapdata

Research-only mapdata generated on 2026-04-30 from the section research packets in `data/research/candidate-trails/bohusleden/sections/`. Do not import these files into runtime data without a separate normalization task.

## What Is Here

- `sections/*.geojson`: one de-duplicated candidate GeoJSON LineString per official stage, sourced from the primary WST/Hoodin GPX recorded in each section research file.
- `bohusleden-candidate-section-geometries.geojson`: combined FeatureCollection for QA and visual inspection.
- `index.json`: geometry metrics, continuity gaps, source policy, and blocked-import status.
- `validation-report.json`: JSON/GeoJSON shape checks, official GPX URL checks, continuity findings, and normalization instructions.
- `reference/bohusleden-stage-21-osm-old-unblazed-reference.geojson`: OpenStreetMap old/unblazed relation 14328643, retained only as reference for Stage 21 resolution.

## Import Position

Stages 1-20 and 22-27 have full official candidate geometry that is ready for a later normalization pass with the caveats already captured in their section research JSON files. Stage 21 has only partial official geometry and must not be imported as a complete route.

## Stage 21

The official WST page still says Stage 21 is not a continuous marked stage. The official GPX/Naturkartan/current OSM relation cover only the marked Flötemarksön-to-Holmen segment, about 4.4 km, while the official stage is 14 km to Porsås. The middle requires self-navigation and must not be filled by straight-line stitching or automatic routing.

The OSM old-route reference is explicitly tagged as no longer blazed. It is not importable, but may help future field verification or a request to Tanum municipality/WST for authoritative corridor data.

## Validation Rules

- GeoJSON coordinate order is [longitude, latitude].
- Consecutive duplicate WST GPX coordinates were removed; no simplification or snapping was applied.
- Validation on 2026-04-30 confirmed all 27 official WST/Hoodin GPX source URLs return HTTP 200 and all generated section files are valid GeoJSON Feature LineStrings with no consecutive duplicate coordinates.
- Runtime app data, source hiking data, public data, routes, and generated outputs were not touched.
