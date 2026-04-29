# Upplandsleden Research

Status: integration source prepared; generated source shards live in `data/source/hiking/upplandsleden/`.

Files:

- `trail.research.json`: whole-trail summary packet.
- `sections/*.research.json`: 49 section, stage, side-branch, and loop packets.
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
- Promote no-water, unsafe-water, access, closure, maintenance, and rule warnings as `rule-warning` rather than normal service facilities.

2026-04-29 completeness audit:

- The official Upplandsstiftelsen overview and Naturkartan pages list Etapp 1:0, Etapp 20:1, Etapp 20:2, Etapp 20:3, and Avstickare 25:2; these were present in whole-trail research but missing as generated source shards.
- Added research packets and generated app source for all five records.
- Etapp 20:1-20:3 are now the imported western continuation from Ingbo källor/Råsbo/Huddunge to Siggefora, so the old generated Etapp 20-to-21 missing-shard gap was removed.
- Avstickare 25:2 is a branch route group connected to Etapp 25, with the Boglösa/Hemsta rock-carving area imported as `heritage`.
- All newly added Uppsala County GPX files fetched successfully from Naturkartan on 2026-04-29. The Stockholm County Naturkartan GPX endpoint still returns HTTP 500, but the generator now falls back to the official Naturkartan site shape (`siteId` 16697), so every imported section/loop/branch has drawable route geometry.

Validation target: after editing research or generator logic, run `npm run data:upplandsleden`, `npm run data:upplandsleden:check`, and the normal repository data/type/test checks before pushing.
