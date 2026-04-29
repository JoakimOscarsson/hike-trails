# Sjuhäradsleden Research

Status: research-only candidate data. Do not auto-import or copy into runtime app data.

Trail ID: `sjuharadsleden`

Current scope:

- `trail.research.json`: whole-trail overview and official section inventory.
- `sections/sjuharadsleden-etapp-1-hindas-station-hestrafors-if.research.json`: completed section 1 packet from the six-agent section research batch.
- `sections/*.research.json`: later per-section packets for sections 2-10.
- `research-progress.json`: continuous handoff/progress ledger for this trail.

Handoff status on 2026-04-29: per user change of plan, this branch intentionally stops after the overview and section 1. Sections 2-10 remain pending and should be resumed from `research-progress.json` in a new thread/worktree.

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
- Stage 8 on the Borås page appears to have a likely typo for Böne kyrka (`4120226` instead of `412026`), while adjacent stage 9 and the GPX endpoint support `412026`.
- OSM lists a parent relation plus 10 child relations and marks all 100 percent complete. Use OSM as a geometry cross-check, not the primary official source.
- Do not integrate into `data/source/hiking/**`, `public/data/**`, or generated outputs from this research directory.
