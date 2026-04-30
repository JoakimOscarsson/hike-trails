# Höglandsleden Research

Status: imported to runtime data from the candidate packet. The research files
remain source evidence only; the app consumes the generated `data/source/hiking`,
`public/data/trail-systems`, and route GeoJSON outputs.

Trail ID: `hoglandsleden`

## Files

- `trail.research.json`: whole-trail overview and official section inventory.
- `sections/*.research.json`: per-section research packets, one file per official HÖ stage.
- `research-progress.json`: running handoff/progress tracker for this research thread.
- `geometry/candidate/`: generated research-only GeoJSON for all 23 Naturkartan GPX section sources plus raw GPX downloads.
- `geometry/protected-area-overlays/`: raw route-bbox protected-area, Natura 2000, water-protection and biotopskydd downloads used for rule-scoping overlays.
- `normalized-candidate/`: generated candidate normalization artifacts, including `protected-area-overlays.research.json`.

## Handoff Status

This packet contains the whole-trail overview plus completed HÖ1, HÖ2, HÖ3, HÖ4, HÖ5, HÖ6, HÖ7, HÖ8, HÖ9, HÖ10, HÖ11, HÖ12, HÖ13, HÖ14, HÖ15, HÖ16, HÖ17, HÖ18, HÖ19, HÖ20, HÖ21, HÖ22, and HÖ23 section research. Runtime import now exposes the primary loop and official branch topology as selectable chains.

- Whole-trail overview: complete for candidate handoff.
- HÖ1 Västra Lägern - Skuruhatt: complete for research handoff and ready for normalization with caveats.
- HÖ2 Skuruhatt - Valbacken: complete for research handoff and ready for normalization with caveats.
- HÖ3 Valbacken - Mariannelund: complete for research handoff and ready for normalization with caveats.
- HÖ4 Valbacken - Lilla Bjälkerum: complete for research handoff and ready for normalization with caveats.
- HÖ5 Lilla Bjälkerum - Ädelfors: complete for research handoff and ready for normalization with caveats.
- HÖ6 Ädelfors - Högarps kulturreservat: complete for research handoff and ready for normalization with caveats.
- HÖ7 Högarps kulturreservat - Lemnhult: complete for research handoff and ready for normalization with caveats.
- HÖ8 Lemnhult - Lindshammar: complete for research handoff and ready for normalization with caveats.
- HÖ9 Lindshammar - Ramkvilla: complete for research handoff and ready for normalization with caveats.
- HÖ10 Ramkvilla - Asa: complete for research handoff and ready for normalization with caveats.
- HÖ11 Asa - Hultsjö: complete for research handoff and ready for normalization with caveats.
- HÖ12 Hultsjö - Sävsjö: complete for research handoff and ready for normalization with caveats.
- HÖ13 Sävsjö - Forsa: complete for research handoff and ready for normalization with caveats.
- HÖ14 Forsa - Vikskvarn: complete for research handoff and ready for normalization with caveats.
- HÖ15 Vikskvarn - Lövhult: complete for research handoff and ready for normalization with caveats.
- HÖ16 Lövhult - Ränneborg: complete for research handoff and ready for normalization with caveats.
- HÖ17 Ränneborg - Skuruhatt: complete for research handoff and ready for normalization with caveats.
- HÖ18 Vikskvarn - Tomtabacken: complete for research handoff and ready for normalization with caveats.
- HÖ19 Tomtabacken - Hok: complete for research handoff and ready for normalization with caveats.
- HÖ20 Hok - Byarum: complete for research handoff and ready for normalization with caveats.
- HÖ21 Byarum - Skillingaryd: complete for research handoff and ready for normalization with caveats.
- HÖ22 Skillingaryd - Åsafors: complete for research handoff and ready for normalization with caveats.
- HÖ23 Åsafors - Kärringabacka: complete for research handoff and ready for normalization; targeted caveat pass completed. Remaining issues are explicit import rules or live pre-publication checks, not unresolved structural blockers.

All 23 sections now have research-only generated GPX GeoJSON under `geometry/candidate/sections/`. HÖ23 also retains the earlier targeted research GeoJSON at `geometry/hoglandsleden-ho23-asafors-karringabacka.official-gpx-derived.geojson` as a source cross-check. These files are retained as research inputs; runtime data is generated separately under the app data directories.

## Current Official Structure

Current Smålandsleden pages present Höglandsleden as 23 official stages, HÖ1-HÖ23.

The official overview says Höglandsleden can be walked as a ca 300 km loop plus connector stages. The per-stage official page distances sum to 428.6 km across all HÖ1-HÖ23 pages, which aligns with municipal descriptions of the trail as 44 mil/440 km.

Working topology interpretation for later normalization:

- Main loop: HÖ2 plus HÖ4-HÖ17, 298.3 km by official stage distances.
- Connector/branch material:
  - HÖ1 Västra Lägern-Skuruhatt, connecting Anebyleden and Östgötaleden.
  - HÖ3 Valbacken-Mariannelund, connecting toward Mariannelund/Emilleden and the Kalmar county side.
  - HÖ18-HÖ23 Vikskvarn-Kärringabacka, a west branch toward Vaggeryd/Gnosjö/Hestra and Järnbärarleden.

This topology is represented in the normalized candidate artifacts as main loop plus branch/connector metadata and should still receive visual QA before any runtime route-group import.

## Primary Sources

- Smålandsleden official overview: https://www.smalandsleden.se/vandringsleder/hoglandsleden-en-del-av-smalandsleden-miniguide-trp-641
- Smålandsleden official stage pages: `https://www.smalandsleden.se/karta/<stage-slug>`
- Naturkartan official stage pages and GPX downloads: `https://www.naturkartan.se/sv/jonkopings-lan/<stage-slug>`
- Nässjö municipality: https://nassjo.se/uppleva-och-gora/aktivitet/hoglandsleden-i-flera-etapper.html
- Vetlanda municipality: https://vetlanda.se/uppleva-och-gora/aktorer/smalandsleden
- Sävsjö municipality: https://vrigstad.savsjo.se/kultur-och-fritid/friluftsliv-och-motion/hoglandsleden.html
- Eksjö municipality: https://eksjo.se/kultur-och-fritid/fritid-och-friluftsliv/vandringsleder
- Gnosjö tourism: https://www.gnosjoandan.com/en/visit-gnosjo/outdoor/hiking/hoglandsleden/

## Safety Notes

This directory is intentionally isolated from runtime data. Use the candidate importer to regenerate runtime data rather than wiring app code directly to these research files.
