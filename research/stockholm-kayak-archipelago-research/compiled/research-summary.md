# Stockholm Kayak Archipelago Research Summary

Generated: 2026-04-26

## Output Files

- `compiled/kayak-routes.seed.json`: 19 import-oriented kayak route records.
- `compiled/kayak-facilities.seed.json`: 20 facility, rental, self-service rental, campsite, and service-node records.
- `schemas/kayak-route.schema.json`: first-pass route schema sketch.
- `agent-findings/iteration-01-agent-03-southern-archipelago.md`: preserved raw southern-archipelago findings from the first research wave.

## Strongest Route Anchors

- `stavsnas-namdo-bullero-langviksskar`: high-value advanced route, but must use current Nämdöskärgården National Park rules rather than old Bullerö reserve assumptions.
- `dalaro-day-islands` and `dalaro-galo-overnight`: good beginner/weekend route cluster with strong operator support.
- `bogesund-round-trip`, `vaxholm-fortress-norrhamn-teno`, `tynningo-bjornholmen-oxdjupet`, `grinda-gallno-multiday`: strong Vaxholm/northern-central cluster from Skärgårdens Kanotcenter and official reserve checks.
- `nynashamn-nattaro-rano-alo` and `ankarudden-landsort-runt`: useful southern candidates, but exposed and rule-heavy.
- `langholmen-reimersholme-loop`, `kungsholmen-loop`, `djurgardskanalen-out-and-back`, `brunnsviken-loop`, `sicklasjon-baggensfjarden-canoe-route`: good city/inner-water entry routes.

## Important Corrections

- Bullerö should be modeled under Nämdöskärgården National Park. Current rules include mapped no-navigation/no-landing/camping zones and some restrictions that apply even to kayak/SUP.
- Långviksskär is split: the southern part remains Långviksskär nature reserve, surrounded by the national park, with a 2026 reserve decision.
- Stockholm Kayak Trail public pages do not publish exact km distances for the relevant Stavsnäs/Sollenkroka/Runmarö stages.
- Runmarö runt has conflicting public metadata: one source path says 4 days / 4 of 5, another says 3 days / 3 of 5. Treat as unresolved.
- Grinda/Gällnö is listed as a day trip in one operator index, but the route page itself says 4-5 days. Treat the day-trip label as taxonomy noise.
- Kayakomat Nynäshamn/Nickstabadet is not reliable for current import: municipal listing and Kayakomat availability/opening status conflict.

## Modeling Notes

- Store route lines as flexible corridors until GPX/chart validation exists.
- Store exposure separately from difficulty.
- Store fire bans, bird-protection periods, ferry timetables, prices, opening hours, and self-service availability as volatile.
- Treat Reddit/blog/Wikiloc camp spots as candidate POIs until verified against Länsstyrelsen, Naturkartan, Skärgårdsstiftelsen, national-park appendices, or current nautical charts.
- For kayaking, the app will likely need fields for wind exposure, crossings, landing constraints, launch type, self-service rental support, and route confidence.

## Not Completed Yet

- Full five research iterations of seven agents each were not completed because the environment limits concurrent agents to six and the result set is already large enough to require synthesis.
- The requested five facility-research iterations per finding were not completed; instead, the first import seed includes the strongest route-linked facilities and the highest-impact rule corrections.
- Route coordinates, GPX/GeoJSON linework, and exact launch coordinates remain to be built.
