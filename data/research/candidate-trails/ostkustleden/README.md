# Ostkustleden Research

Status: research-only candidate packet with normalized candidate artifacts, generated GPX geometry and protected-area overlays. Do not import into runtime app data until an explicit runtime import task is opened.

Trail id: `ostkustleden`

## Scope

This folder contains research for Ostkustleden, a circular hiking trail in Oskarshamn municipality, Kalmar County. The official maintainer is Döderhults Naturskyddsförening. The trail is also published by Oskarshamn/Visit Oskarshamn, Visit Småland, and Naturkartan.

Current research files:

- `trail.research.json`: whole-trail overview, source inventory, section order, distance/source contradictions, and import risks.
- `research-progress.json`: resumable progress log for the trail research thread.
- `sections/*.research.json`: one section research packet per official stage. These files are research-only and should not be consumed by runtime code directly.
- `geometry/candidate/`: generated research-only GeoJSON for all eight Naturkartan GPX section sources plus raw GPX downloads.
- `geometry/protected-area-overlays/`: raw protected-area, Natura 2000, water-protection and biotopskydd downloads used for rule-scoping overlays.
- `normalized-candidate/`: generated normalization handoff artifacts, including `protected-area-overlays.research.json`.

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
- Naturkartan provides GPX download URLs for all eight section pages. Research-only GeoJSON now exists for all eight sections; preserve the Etapp 8 cabin gap as topology metadata and re-review geometry before runtime import.
- Naturkartan also provides section map PDFs for all eight stages, and Oskarshamn hosts a 2025 brochure PDF.

## Known Early Import Risks

- Stage naming uses both `Hällveberg` and the older/URL spelling `Hedvigsberg`; keep `Hällveberg` as the displayed official endpoint unless a later official source requires otherwise.
- Candidate GPX geometry exists for all sections, but stages 1, 3, 4, 5 and 8 should still receive visual QA before runtime import because source GPX files include track breaks, duplicate pieces or sequencing caveats.
- Stage 1 GPX has two track pieces with an apparent break near the Nynäs/Humlenäs end cluster; this may reflect an access or page-geometry issue, not a simple continuous line.
- Stage 7 has an official service detour/access note for Figeholm shopping; model this as access/connection metadata, not as main-stage geometry unless official geometry confirms it.
- Connections to other trails exist or are implied: Lönnebergaleden connects from the Stage 2 area near Eckerhult, and Tjustleden connects at/near Mörtfors. These should be captured as connectors, not merged into Ostkustleden sections.

## Safe Next Step

Use the candidate geometry, normalized candidate artifacts and protected-area overlay report for runtime-import planning. Re-run overlays if route geometry, connector inclusion or official protected-area boundaries change.
