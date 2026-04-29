# Sjuhäradsleden Research

Status: research-only candidate data. Do not auto-import or copy into runtime app data.

Trail ID: `sjuharadsleden`

Current scope:

- `trail.research.json`: whole-trail overview and official section inventory.
- `sections/sjuharadsleden-etapp-1-hindas-station-hestrafors-if.research.json`: completed section 1 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-2-hestrafors-if-ik-omega.research.json`: completed section 2 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-3-ik-omega-sok-stugan.research.json`: completed section 3 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-4-sok-stugan-rya-asar.research.json`: completed section 4 packet from the six-agent section research batch.
- `sections/*.research.json`: later per-section packets for sections 5-10.
- `research-progress.json`: continuous handoff/progress ledger for this trail.

Handoff status on 2026-04-29: overview plus sections 1-4 are complete enough for normalization review with caveats. Sections 5-10 remain pending and should be resumed from `research-progress.json`.

## Overview

Sjuhäradsleden is an orange-marked long-distance hiking trail from Hindås to Hotell Mullsjö. Current official tourism and municipal sources describe it as about 140 km / 14 mil, divided into 10 stages, and part of Europaled 1. OpenStreetMap also records the older alias "Knalleleden".

Primary official/current sources checked on 2026-04-29:

- Västsverige/Sjuhärad overview: `https://www.vastsverige.com/sjuharad/natur-och-friluftsliv/vandra/vandringsleder/boras-vandringsleder/sjuharadsleden/`
- Västsverige general overview: `https://www.vastsverige.com/naturupplevelser/vandra/vandringsleder/sjuharadsleden/`
- Borås Stad section inventory: `https://www.boras.se/upplevaochgora/friluftslivochnatur/motionssparochvandringsleder/sjuharadsledenorangefleralangder.5.24ebe11318ec1938e09b18ee.html`
- Naturkartan guide: `https://www.naturkartan.se/sv/sjuharadsleden`
- Naturkartan stage pages and GPX files: `https://www.naturkartan.se/sv/vastra-gotalands-lan/sjuharadsleden-etapp-<n>`
- OpenStreetMap national-trails wiki inventory: `https://wiki.openstreetmap.org/wiki/Sv:Sverige/Vandringsleder/National_trails`

Important currentness caveat: Naturkartan states that the whole Sjuhäradsleden has not yet been fully quality-assured by the trail manager, Västkuststiftelsen, and may have signage/condition/accessibility shortcomings. This should remain visible until contradicted by a newer official quality-assurance source.

## Official Section Order

1. Hindås station - Hestrafors IF
2. Hestrafors IF - IK Omega
3. IK Omega - SOK-stugan
4. SOK-stugan - Rya åsar
5. Rya åsar - Karlsaflogarna
6. Karlsaflogarna - Blackered
7. Blackered - Prångens Camping
8. Prångens Camping - Böne kyrka
9. Böne kyrka - Årås säteri / Årås kvarn
10. Årås säteri / Årås kvarn - Hotell Mullsjö

## Notes For Later Import

- Naturkartan exposes per-stage GPX files for all 10 stages. The GPX coordinate order matches the official Hindås-to-Mullsjö stage order.
- Borås Stad publishes SWEREF 99 TM-style endpoint coordinates. Converted WGS84 coordinates generally agree with GPX endpoints; section-level packets should keep both when useful and explain any endpoint alias differences.
- Section 1 is ready for normalization review with caveats, not runtime import. Important unresolved items include the Hestrafors IF/Bollevi access cluster versus GPX endpoint, possible Klippan naturreservat overlap, winter ski-track sensitivity near Hindås/Hindåsgården, weak end transit, and currentness checks for several facilities.
- Section 2 is ready for normalization review with caveats, not runtime import. Important unresolved items include the Hestrafors IF/Bollevi access cluster versus route-line start, IK Omega route endpoint versus lower Omegastugan/Start etapp 3 access cluster, Abborrsjön/Slätthult shelter and toilet currentness, no confirmed potable water, weak Hestrafors/Brandshed public transport, and dynamic fire-ban checks.
- Section 3 is ready for normalization review with caveats, not runtime import. Important unresolved items include the IK Omega route endpoint versus lower Omegastugan/Olsfors access cluster, Naturkartan section-continuity endpoint versus SOK-stugan/Nordtorp access cluster, Hultafors old/new shelter modeling, SOK-stugan utility public-access verification, no confirmed potable water, weak SOK-stugan end transit, and the Naturkartan/STF QA warning versus Västsverige quality-assured statement.
- Section 4 is ready for normalization review with caveats, not runtime import. Important unresolved items include Naturkartan section-continuity endpoints versus Borås/OSM SOK-stugan and Rya åsar access coordinates, Rya åsar reserve restrictions, SOK-stugan utility public-access verification, Ramshulan water potability, Högplatån/Björbobacken/Sjötorp facility deduplication, and dynamic fire/transit refreshes.
- Stage 8 on the Borås page appears to have a likely typo for Böne kyrka (`4120226` instead of `412026`), while adjacent stage 9 and the GPX endpoint support `412026`.
- OSM lists a parent relation plus 10 child relations and marks all 100 percent complete. Use OSM as a geometry cross-check, not the primary official source.
- Do not integrate into `data/source/hiking/**`, `public/data/**`, or generated outputs from this research directory.
