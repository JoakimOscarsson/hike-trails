# Map Readiness Audit

Generated: 2026-04-26

## Summary

- Route records: 34
- Drawable route corridors: 34
- Route point features: 190
- Facility records: 61
- Drawable facility points: 61
- Parking records: 22
- Drawable parking points: 22
- Route records with missing points: 0
- Facility records without points: 0

## Caveats

- Route lines are approximate waypoint corridors, not GPX tracks.
- Use `geometryStatus`, `mapConfidence`, and `navigationUse` in the app to avoid presenting approximate lines as navigable tracks.
- Exact launch/rack/toilet/water coordinates still need source-grade verification for production.

## Files

- `mapdata/kayak-route-corridors.geojson`
- `mapdata/kayak-route-points.geojson`
- `mapdata/kayak-facilities.geojson`
- `mapdata/kayak-parking.geojson`
- `mapdata/kayak-map-ready.dataset.json`
- `mapdata/map-readiness-audit.json`
