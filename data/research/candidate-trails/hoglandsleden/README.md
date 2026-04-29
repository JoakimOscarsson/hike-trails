# Höglandsleden Research

Status: research-only candidate trail. Do not import into runtime app data yet.

Trail ID: `hoglandsleden`

## Files

- `trail.research.json`: whole-trail overview and official section inventory.
- `sections/*.research.json`: per-section research packets, one file per official HÖ stage.
- `research-progress.json`: running handoff/progress tracker for this research thread.

## Handoff Status

This branch intentionally stops after the whole-trail overview and HÖ1 section research.

- Whole-trail overview: complete for candidate handoff.
- HÖ1 Västra Lägern - Skuruhatt: complete for research handoff and ready for normalization with caveats.
- HÖ2-HÖ23: not yet section-researched.

## Current Official Structure

Current Smålandsleden pages present Höglandsleden as 23 official stages, HÖ1-HÖ23.

The official overview says Höglandsleden can be walked as a ca 300 km loop plus connector stages. The per-stage official page distances sum to 428.6 km across all HÖ1-HÖ23 pages, which aligns with municipal descriptions of the trail as 44 mil/440 km.

Working topology interpretation for later normalization:

- Main loop: HÖ2 plus HÖ4-HÖ17, 298.3 km by official stage distances.
- Connector/branch material:
  - HÖ1 Västra Lägern-Skuruhatt, connecting Anebyleden and Östgötaleden.
  - HÖ3 Valbacken-Mariannelund, connecting toward Mariannelund/Emilleden and the Kalmar county side.
  - HÖ18-HÖ23 Vikskvarn-Kärringabacka, a west branch toward Vaggeryd/Gnosjö/Hestra and Järnbärarleden.

This topology should be verified during section synthesis before any route-group import design.

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

This directory is intentionally isolated from runtime data. Do not edit `data/source/hiking/**`, `public/data/**`, `public/routes/**`, or generated outputs from this research thread.
