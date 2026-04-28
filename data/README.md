# Data Directory

This directory contains both current app inputs and research-only candidate inputs. Keep those roles separate.

## Current App/Generator Inputs

- `hikes.json`: current standalone hike source data used by `scripts/write-hike-data.mjs`.
- `source/hiking/`: current sharded hiking trail-system source used by the build/generator scripts.
- `source/kayaking/`: current sharded kayaking source used by the kayak import/generator scripts.
- `commute-stops-osm-cache.json`: cached OSM transit-stop data used by `scripts/commute-access.mjs`.
- `research-progress/sormlandsleden.json`: Sormlandsleden research progress/support data for already integrated trail work.

Generated runtime data for the app lives in `public/data/`, and generated route geometry lives in `public/routes/`.

## Research-Only Candidate Data

Unfinished trail research lives under `research/candidate-trails/`.

These files are not app runtime data and should not be imported directly. Before any of them become part of the app, convert them through the planned normalized/sharded source pipeline, then regenerate runtime data and run validation.
