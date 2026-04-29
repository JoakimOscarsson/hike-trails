# Hiking Source Shards

This directory contains the app-owned authoring source for integrated hiking trail systems.

Each trail system is split into reviewable shards:

- `manifest.json`: trail-system metadata without sections, route groups, or presets.
- `sections-index.json`: ordered section IDs; this preserves route-builder order without relying on filenames.
- `sections/<section-id>.json`: one section per file.
- `route-groups.json`: optional route topology groups; keep an empty array when none exist.
- `connections.json`: optional inter-section transfer records, for example ferry, rowboat, bus, or walking connectors. Omit the file when a trail system has no connection records.
- `presets.json`: suggested route-builder presets; keep an empty array when none exist.

`npm run data:build` assembles these shards into generated runtime files under `public/data/`.
Runtime code must not read this source directory directly.

## Stockholm Archipelago Trail Notes

`stockholm-archipelago-trail/` is the app-owned source for the integrated SAT data. Its section records are marker-only for walking geometry today, while `connections.json` models ferry, rowboat, bus/ferry, and walking handoffs between adjacent official entries. Generated public connection routes live under `public/routes/hiking/stockholm-archipelago-trail/connections/` and are planning-reference lines, not navigable ferry tracks.

SAT ferry data is intentionally static and caveated. Keep exact departures, disruptions, request-stop handling, and same-day timetable decisions out of committed source shards; use `seasonality`, `currentness`, `note`, and source links to point users back to live SL, Waxholmsbolaget, Trafikverket, or operator planning.

Research-only records such as `harbor_services`, rental/service metadata, access-only metadata, emergency metadata, pending facilities, suppressed facilities, and trail junctions should not be imported as normal runtime facilities unless a future product decision explicitly adds a supported facility type or view for them.
