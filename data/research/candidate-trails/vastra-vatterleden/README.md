# Västra Vätterleden Research

Status: research-only candidate trail. Do not import into runtime app data yet.

Trail id: `vastra-vatterleden`

Files:

- `trail.research.json`: whole-trail overview, official stage inventory, source map, and known import risks.
- `sections/*.research.json`: one research packet per official stage, to be written after section-level synthesis.
- `research-progress.json`: live handoff/status file for this research thread.

Current scope:

- Official trail: Västra Vätterleden, north-to-south from Stenkällegården/Tiveden toward Mullsjö.
- Official structure: 8 stages, with Rankåsleden treated as a side route/alternate, not a numbered Västra Vätterleden stage.
- Research mode: candidate data only. No edits are to be made to `data/source/hiking/**`, `public/data/**`, `public/routes/**`, or generated runtime outputs.

Important early caveats:

- Official total distance varies by source: newer Västsverige pages say roughly 177-195 km depending on route variations; Skaraborgsleder's older overview says 195 km in HTML but 189 km in the 2009 overview PDF; stage totals differ depending on whether stage 1 is counted as 30, 31, or 36 km and stage 8 as 29 or 31 km.
- Stage 1 has a route-variation/branch clue around Granvik in the overview text; geometry must not be simplified until GPX/OSM/PDF evidence is reconciled.
- Stage 8 is a single official Västra Vätterleden stage in overview sources, but Naturkartan/Smålandsleden exposes it as two GPX-backed records: Fagerhult-Furusjö and Furusjö-Mullsjö Hotell.
- OSM has a complete parent relation and section relations, but OSM names for stages 3 and 4 appear shorter than official stage labels, so endpoint handling needs section-level review.
