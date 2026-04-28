# Kayaking Source Snapshot

This directory contains app-owned import snapshots derived from `research/stockholm-kayak-archipelago-research/mapdata/`.

`routes/`, `facilities/`, `parking/`, and `metadata.json` are the reviewable app-owned source shards used by the importer.
Normal `npm run data:build` reads those shards and does not overwrite them once they exist.
Run `npm run data:kayak:import -- --refresh-source` only when intentionally refreshing the raw snapshot and bootstrapping shards from research input again.

Runtime code must read generated files under `public/data/` and `public/routes/`, not this source snapshot or the research workspace directly.

The initial kayak corridors are approximate waypoint corridors and remain `not-for-navigation` until upgraded with verified route geometry.
