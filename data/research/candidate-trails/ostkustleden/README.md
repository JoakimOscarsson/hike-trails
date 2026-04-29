# Ostkustleden Research

Status: research-only candidate packet. Do not import into runtime app data until the section files have been normalized and reviewed.

Trail id: `ostkustleden`

## Scope

This folder contains research for Ostkustleden, a circular hiking trail in Oskarshamn municipality, Kalmar County. The official maintainer is Döderhults Naturskyddsförening. The trail is also published by Oskarshamn/Visit Oskarshamn, Visit Småland, and Naturkartan.

Current research files:

- `trail.research.json`: whole-trail overview, source inventory, section order, distance/source contradictions, and import risks.
- `research-progress.json`: resumable progress log for the trail research thread.
- `sections/*.research.json`: one section research packet per official stage. These files are research-only and should not be consumed by runtime code directly.

## Official Structure

Ostkustleden is a closed ring with start and finish at Lilla Hycklinge. Official public sources consistently describe eight stages, each ending at an overnight cabin.

1. Etapp 1: Lilla Hycklinge - Nynäs
2. Etapp 2: Nynäs - Lönhult
3. Etapp 3: Lönhult - Krokstorp
4. Etapp 4: Krokstorp - Mörtfors
5. Etapp 5: Mörtfors - Stjärneberg
6. Etapp 6: Stjärneberg - Lilla Laxemar
7. Etapp 7: Lilla Laxemar - Hällveberg
8. Etapp 8: Hällveberg - Lilla Hycklinge

## High-Level Source Notes

- Döderhults Naturskyddsförening and Oskarshamn describe the whole trail as 16 mil / about 160 km.
- Naturkartan's current per-stage distances sum to 152.8 km.
- Döderhults Naturskyddsförening's per-stage rounded descriptions sum to about 154 km.
- Naturkartan provides GPX download URLs for all eight section pages. Several GPX files contain multiple tracks, reversed direction, duplicate pieces, or non-sequential pieces; section research must not assume the raw GPX order is navigation-ready without review.
- Naturkartan also provides section map PDFs for all eight stages, and Oskarshamn hosts a 2025 brochure PDF.

## Known Early Import Risks

- Stage naming uses both `Hällveberg` and the older/URL spelling `Hedvigsberg`; keep `Hällveberg` as the displayed official endpoint unless a later official source requires otherwise.
- Stage 5 and Stage 6 geometry directions appear reversed relative to the written section order, and stages 1, 3, 4, 5, and 8 need track ordering/splitting review before import.
- Stage 1 GPX has two track pieces with an apparent break near the Nynäs/Humlenäs end cluster; this may reflect an access or page-geometry issue, not a simple continuous line.
- Stage 7 has an official service detour/access note for Figeholm shopping; model this as access/connection metadata, not as main-stage geometry unless official geometry confirms it.
- Connections to other trails exist or are implied: Lönnebergaleden connects from the Stage 2 area near Eckerhult, and Tjustleden connects at/near Mörtfors. These should be captured as connectors, not merged into Ostkustleden sections.

## Safe Next Step

Continue section-by-section research. For each official section, collect independent source-angle reports, synthesize them into `sections/<section-id>.research.json`, and keep `research-progress.json` updated after every meaningful pass.
