# Upplandsleden Research

Status: imported to runtime data on 2026-05-01.

Files:

- `trail.research.json`: whole-trail summary packet.
- `sections/*.research.json`: 44 section, stage, and loop packets.
- `integration-dedupe.research.json`: dedupe registry for numbered etapper and adjacent/overlapping records.
- Runtime source shards: `data/source/hiking/upplandsleden/`.
- Generated runtime shards: `public/data/trail-systems/upplandsleden/`.
- Generated route geometry: `public/routes/hiking/upplandsleden/sections/`.

Naming note: if a task mentions "Uppsalaleden", the files currently present here are for `upplandsleden`.

Runtime import notes:

- The import uses the current standalone trail-system model with 52 sections: Stockholm County, the current official Uppsala County etapper/branches, and 13 official loops.
- Pending and suppressed research records remain out of normal runtime markers. Parking/transit records are kept as access notes/descriptions unless already handled by the app's existing trail conventions.
- Official loops are modeled as independently selectable main route groups so they draw in the current app without schema changes.
- The Sigtuna-to-Forsbyan break is not joined. Stockholm County and the Forsbyan/Knivsta/Lunsentorpet option are separate route groups.
- Etapp 10 has current maintenance/reroute caution text in the section notes.
- Upplandsstiftelsen's current page lists the active etapper and most loops, while Naturkartan supplies live route pages/GPX for the Stockholm County route, the Sigtuna/Forsbyan break, and loops such as 29:1 Bjorkbackaslingan.

Regeneration:

```bash
npm run data:publication-live-trails:import
npm run data:build:hiking
```
