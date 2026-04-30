# Sjuhäradsleden Research

Status: imported to runtime data from the candidate packet. The research files
remain source evidence only; the app consumes the generated `data/source/hiking`,
`public/data/trail-systems`, and route GeoJSON outputs.

Trail ID: `sjuharadsleden`

Current scope:

- `trail.research.json`: whole-trail overview and official section inventory.
- `caveat-resolution.research.json`: normalization-readiness decisions for endpoint aliases, geometry caveats, protected-area clipping, water/fire/transit handling and remaining import-day checks.
- `normalized-candidate/protected-area-overlays.research.json`: computed NVR polygon checks against all normalized candidate facility points and candidate route GeoJSON segments for the protected areas identified in the caveat-resolution pass.
- `sections/sjuharadsleden-etapp-1-hindas-station-hestrafors-if.research.json`: completed section 1 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-2-hestrafors-if-ik-omega.research.json`: completed section 2 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-3-ik-omega-sok-stugan.research.json`: completed section 3 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-4-sok-stugan-rya-asar.research.json`: completed section 4 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-5-rya-asar-karlsaflogarna.research.json`: completed section 5 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-6-karlsaflogarna-blackered.research.json`: completed section 6 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-7-blackered-prangens-camping.research.json`: completed section 7 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-8-prangens-camping-bone-kyrka.research.json`: completed section 8 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-9-bone-kyrka-aras-sateri.research.json`: completed section 9 packet from the six-agent section research batch.
- `sections/sjuharadsleden-etapp-10-aras-sateri-hotell-mullsjo.research.json`: completed section 10 packet from the six-agent section research batch.
- `research-progress.json`: continuous handoff/progress ledger for this trail.

Handoff status on 2026-04-30: overview plus sections 1-10 are complete enough for runtime import, and the previous caveats now have explicit decisions, computed protected-area overlays, runtime notes, or publication-day deferrals.

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
- Sections 1-10 have been imported with their caveats resolved into endpoint/access
  semantics, suppressed/pending facilities, rule warnings, runtime notes, or
  publication-day checks.
- Caveat-resolution pass on 2026-04-30 resolved the import policy for these items: use Naturkartan GPX/API as primary geometry, treat OSM as cross-check, deduplicate official route endpoints from access/facility clusters, suppress or keep pending unverified potable-water and fire claims, suppress Struntfiskeboa firepit under Årås reserve rules, and use publication-day checks for fire and transit status.
- OSM lists a parent relation plus 10 child relations and marks all 100 percent complete. Use OSM as a geometry cross-check, not the primary official source.
- Use the candidate importer to regenerate runtime data rather than wiring app code directly to these research files.
