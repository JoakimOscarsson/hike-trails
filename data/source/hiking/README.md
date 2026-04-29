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
