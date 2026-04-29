# Hallandsleden Research

Status: research-only candidate trail packet. Do not import these files automatically.

Trail ID: `hallandsleden`

Phase 1 overview is complete from the live official Hallandsleden site/API as accessed 2026-04-29. Phase 2 has one completed section file for N1, then work paused by request for handoff to another computer.

## Files

- `trail.research.json`: whole-trail overview, official source URLs, subtrail structure, section inventory, overview rules/currentness risks.
- `research-progress.json`: resumable progress ledger for this trail.
- `sections/hallandsleden-alvsaker-naturum-fjaras-bracka.research.json`: N1 section research synthesized from the required six-lane agent batch.
- `sections/*.research.json`: remaining section files, to be written after future section research batches.

## Official Overview

The current official site reports Hallandsleden as 612 km. The live official section inventory found in this pass has 35 sections across four subtrails:

- Norra delleden: 8 sections, 135.8 km
- Mellersta delleden: 8 sections, 146 km
- Södra delleden: 9 sections, 185.9 km
- Kusten: 10 sections, 143.2 km

The inland route is branched rather than a single line. It meets Bohusleden at Älvsåker in the north and Skåneleden at Koarp in the south. The coastal route is still being completed; official text says coastal stages in Falkenberg and Varberg are planned to be added during 2026-2027.

## Source Caveats

- Use the live official site/API inventory for this candidate. Older external pages may still say about 435 km, 26 stages, or three parts.
- Official 2024 reroutes are in the digital map, while paper maps printed in June 2022 still contain old alignments.
- Some official map API records have empty linework even though section GPX downloads exist, so section geometry needs GPX parsing and independent endpoint checks.

## Completed Section

- N1 `hallandsleden-alvsaker-naturum-fjaras-bracka`: research-ready with caveats. Main caveats are the Fjärås Bräcka shelter/camping rule ambiguity, the Stensjön toilet season conflict, and a misleading official API `line.geometry` field that should not be used for import.

## Next Safe Step

Resume Phase 2 with `hallandsleden-naturum-fjaras-bracka-askhults-by`: spawn the six required research/report agents, synthesize their findings, write the section JSON, then update `research-progress.json`.
