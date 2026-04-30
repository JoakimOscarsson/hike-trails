# Kungsleden candidate geometry

Research-only candidate section geometry generated from official Naturvardsverket/Lansstyrelsen Leder WFS features.

- Raw source downloads are stored under `source-downloads/` as filtered EPSG:3006 GeoJSON by `Led_ID`.
- Section output GeoJSON files are stored under `sections/` in WGS84 `[longitude, latitude]` order.
- The combined QA FeatureCollection is `kungsleden-candidate-section-geometries.geojson`.
- The normalized build report is `normalized-candidate/route-geometry-build.research.json`.
- Boat, rowboat, ferry, bus and village/hut access offsets are not invented as hiking linework; gaps are preserved as metadata and MultiLineString breaks.
- Rebuild with `npm run data:candidate-geometry:kungsleden`.
