# Candidate Trails

These trail datasets are research results, not app-ready source data.

## Layout

Each candidate trail may contain:

- `trail.research.json`: whole-trail research summary or early one-file research packet.
- `sections/*.research.json`: section, stage, or loop research packets.
- `integration-dedupe.research.json`: cross-section dedupe notes to apply during import.
- `README.md`: human-facing status and integration notes.

## Current Inventory

| Trail ID | Name | Files | Readiness | Notes |
| --- | --- | ---: | --- | --- |
| `stockholm-archipelago-trail` | Stockholm Archipelago Trail | 1 | Research-only | Still a whole-trail file. Split/normalize before import. |
| `upplandsleden` | Upplandsleden | 46 | Research-only | 1 trail summary, 44 section/loop files, 1 dedupe registry. |
| `vikingaleden` | Vikingaleden | 12 | Research-only | 12 section files; no top-level summary yet. |

## Integration Rule

Do not point runtime code, generator scripts, or validation rules directly at this folder unless the task is explicitly about importing candidate trails. Integration should produce normalized source data under the future `data/source/trail-systems/<trail-id>/` contract, then generated runtime shards under `public/data/`.
