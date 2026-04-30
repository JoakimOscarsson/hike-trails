# Västra Vätterleden Research

Status: research-only candidate trail. All 8 official section research files are written. Do not import into runtime app data yet.

Trail id: `vastra-vatterleden`

Files:

- `trail.research.json`: whole-trail overview, official stage inventory, source map, and known import risks.
- `sections/*.research.json`: one research packet per official stage. All 8 official stages are now covered.
- `import-risk-resolution.research.json`: follow-up research matrix resolving or downgrading import risks before normalization.
- `geometry/candidate/`: research-only candidate GeoJSON and raw source downloads for all 8 stages.
- `geometry/protected-area-overlays/`: raw Naturvårdsverket WFS protected-area downloads used for rule-scoping overlays.
- `normalized-candidate/protected-area-overlays.research.json`: computed research-only overlay of final candidate route geometry and facility points against protected areas.
- `research-progress.json`: live handoff/status file for this research thread.

Current scope:

- Official trail: Västra Vätterleden, north-to-south from Stenkällegården/Tiveden toward Mullsjö.
- Official structure: 8 stages, with Rankåsleden treated as a side route/alternate, not a numbered Västra Vätterleden stage.
- Research mode: candidate data only. No edits are to be made to `data/source/hiking/**`, `public/data/**`, `public/routes/**`, or generated runtime outputs.
- Current completion: overview, section research, import-risk resolution, normalized candidate artifacts, research-only candidate geometry and protected-area overlay scoping are complete enough for a normalization handoff, but not for runtime import.

Important early caveats:

- Official total distance varies by source: newer Västsverige pages say roughly 177-195 km depending on route variations; Skaraborgsleder's older overview says 195 km in HTML but 189 km in the 2009 overview PDF; stage totals differ depending on whether stage 1 is counted as 30, 31, or 36 km and stage 8 as 29 or 31 km.
- Stage 1 now has explicit research-only candidate geometry for direct-south and Källebacken variants. Keep those variants explicit during runtime import rather than collapsing them into a single line.
- Stage 8 is a single official Västra Vätterleden stage in overview sources, but Naturkartan/Smålandsleden exposes it as two GPX-backed records: Fagerhult-Furusjö and Furusjö-Mullsjö Hotell.
- Stage 8 research found that the continuous mainline starts at the Gagnån VV7/VV8 junction, while Fagerhult village is a separate access connector. Follow-up import-risk research compared current Naturkartan and E1/OSM geometry and resolved the July 2025 Mullsjö reroute signal to an endpoint/trailhead normalization decision: prefer Naturkartan Hotel Mullsjö as official endpoint and retain OSM/E1 as an access cross-check.
- OSM has a complete parent relation and section relations, but OSM names for stages 3 and 4 appear shorter than official stage labels, so endpoint handling needs section-level review.
- Stage 1 and stage 2 branch/alternate geometry is represented in `geometry/candidate/`. The protected-area overlay confirms route/facility overlap for the relevant stage-1 protected-area variants, Stora Röå, Hjoåns dalgång, Hökensås, Hyltan and Gagnån. Hjoåns dalgång fireplace should stay suppressed or pending unless an official exception proves legal use. Natural water should not be imported as potable water without managed-source evidence.

Next safe step:

- Plan the runtime importer mapping from the research-only candidate geometry and protected-area overlay artifacts.
- Do not integrate into `data/source/hiking/**`, `public/data/**`, `public/routes/**`, or generated runtime outputs until explicitly requested.
