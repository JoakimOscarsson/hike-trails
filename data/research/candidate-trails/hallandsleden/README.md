# Hallandsleden Research

Status: research-only candidate trail packet. Do not import these files automatically.

Trail ID: `hallandsleden`

Phase 1 overview is complete from the live official Hallandsleden site/API as accessed 2026-04-29. Phase 2 has completed section files for N1, N2, N3, N4, N5, N6, N7, N8, M1, M2, and M3. Work should resume with M4.

## Files

- `trail.research.json`: whole-trail overview, official source URLs, subtrail structure, section inventory, overview rules/currentness risks.
- `research-progress.json`: resumable progress ledger for this trail.
- `sections/hallandsleden-alvsaker-naturum-fjaras-bracka.research.json`: N1 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-naturum-fjaras-bracka-askhults-by.research.json`: N2 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-askhults-by-stattared.research.json`: N3 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-stattared-veddige.research.json`: N4 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-veddige-nosslinge.research.json`: N5 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-nosslinge-akulla.research.json`: N6 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-akulla-astad.research.json`: N7 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-varberg-akulla.research.json`: N8 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-akulla-ullared.research.json`: M1 section research synthesized from the required six-lane agent batch.
- `sections/hallandsleden-ullared-karnebygd.research.json`: M2 section research synthesized from the required six-lane agent batch, with a replacement route-geometry lane after the first geometry agent stalled.
- `sections/hallandsleden-karnebygd-atran.research.json`: M3 section research synthesized from the required six-lane agent batch.
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

## Completed Sections

- N1 `hallandsleden-alvsaker-naturum-fjaras-bracka`: research-ready with caveats. Main caveats are the Fjärås Bräcka shelter/camping rule ambiguity, the Stensjön toilet season conflict, and a misleading official API `line.geometry` field that should not be used for import.
- N2 `hallandsleden-naturum-fjaras-bracka-askhults-by`: research-ready with caveats. Main caveats are the Äskhult shelter fireplace versus reserve fire prohibition, seasonal Äskhult water/toilet access, Axtorp distance/service caveats, Stensjön off-section facility records, and non-canonical Naturkartan/OSM/API `line.geometry` clues.
- N3 `hallandsleden-askhults-by-stattared`: research-ready with caveats. Main caveats are Äskhult/Lilla Äskhult fire and tent boundary rules, seasonal Äskhult water/toilet access, Stättared water and parking verification, sparse Stättared transit access, stale Stensjön prose, and non-canonical API `line.geometry`/Naturkartan/OSM distance clues.
- N4 `hallandsleden-stattared-veddige`: research-ready with caveats. Main caveats are the 2024 reroute north of Veddige, stale Stättared-Dranstugan geometry in Naturkartan/OSM/API `line.geometry`, remote Stättared bus access, Stättared water/toilet normalization, and Dranstugan facilities being adjacent/legacy context rather than on-route current N4.
- N5 `hallandsleden-veddige-nosslinge`: research-ready with caveats. Main caveats are the official GPX `desc` saying `Total: 8.6 km` despite the 28 km official section distance, the four-part MultiLineString/gap handling, the misleading overview API `line.geometry` starting near Dranstugan, the practical endpoint being at Gällarpesjön/Gällarp rather than Nösslinge church, Dranstugan/Nösslinge water verification, sparse Hallandstrafiken line 661 access, and Stora Neden-Mäsen water-protection context near the endpoint.
- N6 `hallandsleden-nosslinge-akulla`: research-ready with caveats. Main caveats are the practical start being Gällarpesjön/Gällarp rather than Nösslinge church, official `geo_json`/GPX being canonical while API `line.geometry`/Naturkartan/OSM preserve older 18 km Åkulla linework, 2024 reroutes at Nedre Lia/Lilla Neten and Åkulla east of Yasjön, the Naturkartan Åkulla/banvallen/Yasjöhult bridge and missing-orange-marking advisory, seasonal Åkturen endpoint transit, Märkedalen/Åkullaboket reserve rules, Yasjön raft seasonality, and Långasjön rest-place coordinate verification.
- N7 `hallandsleden-akulla-astad`: research-ready with caveats. Main caveats are official GPX/API `geo_json` being canonical while API `line.geometry` and OSM preserve a longer older/access-style Ästad endpoint, the practical endpoint being Byasjön shelter rather than Ästad stop/Vingård, N6/N7/M7 junction continuity, 2024 Kalvsjön reroute currentness, Åkulla/Byasjön shelter and service dedupe, seasonal Yasjön raft access, Långanskogen/Toppbjär/Åkullaboket reserve rules, and weak endpoint transit from Byasjön to Hållplats Ästad.
- N8 `hallandsleden-varberg-akulla`: research-ready with caveats. Main caveats are official GPX/API `geo_json` being canonical while API `line.geometry` and OSM preserve a different harbor-side Varberg start, N8 being a western Varberg branch/spur into Åkulla rather than a continuation after N7, the official GPX endpoint sitting about 60-65 m from the shared Åkulla junction, dense Varberg urban service over-inclusion, seasonal Åkturen endpoint access, Åkulla/Yasjön facility dedupe, Grimeton and Bockstens mosse side-trip handling, and dynamic fire/reserve/currentness checks.
- M1 `hallandsleden-akulla-ullared`: research-ready with caveats. Main caveats are official GPX/API `geo_json`/Naturkartan shape being canonical while API `line.geometry`, OSM and many route apps preserve the old Åkulla-Kogstorp/Kogstorp-Kärnebygd split, Naturkartan visible metadata saying 11.0 km/red despite current 17 km/blue official data, Åkulla multi-section service/facility dedupe, seasonal Åkturen start access, strong Ullared bus-terminal access but dense Gekås/Ullared service over-inclusion, Yasjön island access seasonality, Kogstorp lacking verified water, Åkullaboket/Nedre Ätran rules context, and sparse current full-stage field reports.
- M2 `hallandsleden-ullared-karnebygd`: research-ready with caveats. Main caveats are official GPX/API `geo_json`/Naturkartan shape being canonical while API `line.geometry` and OSM preserve old Kogstorp-Kärnebygd segmentation, the English Hallandsleden page still using stale Ullared-Kvarnlyckan naming, Ullared service over-inclusion, weak Kärnebygd transit access, Kogstorp shelter/linbasta leakage to suppress, no reliable mid-stage potable water, Högvadsån Natura 2000 and water-protection contexts, and dynamic fire-risk/currentness checks.
- M3 `hallandsleden-karnebygd-atran`: research-ready with caveats. Main caveats are official GPX/API `geo_json` being canonical while API `line.geometry` and OSM preserve old Kärnebygd-Eseredssjön geometry, the English Hallandsleden page still using stale Kvarnlyckan-Ätran naming, Naturkartan/Pacer/local sources preserving Eseredssjön naming, weak Kärnebygd transit access, strong Ätran endpoint access, side-distance Kärnebygd/Eseredssjön shelters, no campsite or mid-stage potable water, Ätran endpoint water-protection overlap, and dynamic fire/currentness checks.

## Next Safe Step

Resume Phase 2 with `hallandsleden-atran-langesjon` (M4): spawn the six required research/report agents, synthesize their findings, write the section JSON, then update `research-progress.json`. Pay attention to Ätran/Eseredssjön handoff from M3, old Eseredssjön-Långesjön segmentation, official GPX/API/Naturkartan/OSM geometry conflicts, Ätran endpoint access/service dedupe, Långesjön endpoint access, and water/shelter/campsite status.
