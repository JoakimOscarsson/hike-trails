# Upplandsleden Research

Status: research-only; integration preparation is in progress.

Files:

- `trail.research.json`: whole-trail summary packet.
- `sections/*.research.json`: 44 section, stage, and loop packets.
- `integration-dedupe.research.json`: dedupe registry for numbered etapper and adjacent/overlapping records.
- `promotion-review.md`: decision ledger for moving `pending` and `suppressions` rows into normal importable facilities.

Naming note: if a task mentions "Uppsalaleden", the files currently present here are for `upplandsleden`.

Integration policy:

- Treat Upplandsleden as one trail system. The Sigtuna-Forsbyån gap is a known long-standing discontinuity inside that system, not a separate trail and not a temporary closure.
- Include all current researched loops/slingor in the first import, with branch-only facilities attached to their loop/route-group scope.
- Normalize into the app-owned `data/source/hiking/upplandsleden/` shard structure used by the existing hiking trails.
- Promote parking and transit the same way the existing trails do when they are route-relevant and have usable coordinates.
- Use `camping` for informal/tolerated tenting and reserve `campsite` for formal, managed, or clearly designated campsites.
- Include seasonal/commercial services when route-relevant, with opening conditions in descriptions rather than separate live-status logic.
- Promote route-story POIs as `heritage` or `attraction` when they have defensible coordinates.
- Promote no-water, unsafe-water, access, and current-condition warnings as `rule-warning` rather than normal service facilities.

Before integration is complete, normalize section packets, apply dedupe decisions, convert facilities into app-supported types, write output into `data/source/hiking/upplandsleden/`, generate route GeoJSON under `public/routes/hiking/upplandsleden/`, and validate generated runtime data.
