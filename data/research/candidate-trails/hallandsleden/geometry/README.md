# Hallandsleden Candidate Geometry

Research-only geometry artifacts for the Hallandsleden candidate packet.

These files are not runtime app data. They exist so later normalization/import work has concrete, reviewed geometry inputs without re-fetching or guessing route linework.

## Files

- `canonical/*.geojson`: exact official Hallandsleden GPX track/segment coordinates converted to GeoJSON. Use these for provenance and normalization.
- `draw-ready/*.geojson`: display-oriented copies of the official geometry. Long intra-segment jumps over 250 m are linearly densified so renderers are not left with very sparse linework. Official GPX track/segment breaks are preserved.
- `geometry-index.research.json`: index of all 35 section geometry files, source URLs, source headers/hashes, point counts, distances, gaps, densification counts and caveats.
- `build-candidate-geometry.mjs`: reproducible builder used to fetch the official GPX files and regenerate the artifacts.

## Policy

- Do not treat these files as app runtime data.
- Do not bridge official MultiLineString or track/segment breaks unless a later verified connector source is found.
- Draw-ready densification does not change the official line shape. Added points are approximate interpolation between official GPX points and are only for rendering/QA convenience.
- Canonical geometry remains the exact official GPX conversion.

## Current Status

Generated on 2026-04-30 from 35 official Hallandsleden GPX files.

- Official GPX fetched: 35 / 35.
- Canonical GeoJSON written: 35 / 35.
- Draw-ready GeoJSON written: 35 / 35.
- Unresolved missing geometry sections: 0.
- Draw-ready maximum intra-segment gap: 248.99 m.
- Preserved official segment-break sections: N5, K3, K4.
- Preserved official out-of-section network gap: K4 Frillesås to K5 Steninge.

The main unresolved geometry decisions are import policy decisions, not missing source files: whether to preserve or explicitly model official segment breaks, whether to snap adjacent endpoints, and whether to keep the official coastal K4-to-K5 gap visible as a network gap.
