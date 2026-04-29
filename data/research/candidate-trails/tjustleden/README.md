# Tjustleden research candidate

Trail ID: `tjustleden`  
Research status: Phase 1 overview drafted; Phase 2 completed for Etapp 1 only, then intentionally stopped for handoff.  
Last updated: 2026-04-29T19:23:12+02:00  

This directory is a research-only candidate workspace. It is not wired into runtime hiking data and should not be used by the app until a later normalization/import step.

## Trail overview

Tjustleden is the long-distance hiking trail through Tjust in northern Smaland, primarily in Vastervik municipality, Kalmar lan. Official descriptions place the trail from Mortfors in the south to Falerum in the north, where it connects onward to Ostgotleden. The southern end connects to Ostkustleden.

The main official sequence has nine stages. Official sources describe the trail as about 200 km including loops and branches. The nine main-stage distances sum to about 159 km; the remainder is explained by official loops/connectors such as Ankarsrumsslingan, Vastervik/Tornsfall connectors, the Overum/Holmsjoleden connector, and the Ukna connector.

## Official sources inspected

- Naturskyddsforeningen i Tjust trail overview: https://tjust.naturskyddsforeningen.se/tjustleden/
- Naturskyddsforeningen i Tjust stage descriptions and news page: https://tjust.naturskyddsforeningen.se/etappbeskrivningar-m-m/
- Vastervik municipality Tjustleden page: https://www.vastervik.se/Uppleva-och-gora/Idrott-motion-och-friluftsliv/Friluftsliv-och-motion/Vandringsleder-och-motion/tjustleden/
- Vastervik Outdoor hiking guide: https://www.vastervikoutdoor.com/vandring/
- Naturkartan/Vastervik Outdoor stage pages and GPX downloads, listed in `trail.research.json`.
- OpenStreetMap route relations via Overpass, listed in `trail.research.json`.

Accessed date for this overview pass: 2026-04-29.

## Official main-stage order

| No. | Section ID | Official name | From | To | Official km | Notes |
| --- | --- | --- | --- | --- | ---: | --- |
| 1 | `tjustleden-etapp-1-mortfors-getterum-getgolen` | Mortfors - Getterum - Getgolen | Mortfors | Getgolen | 19.0 | Official GPX found. |
| 2 | `tjustleden-etapp-2-getgolen-hjorted-svartestrom` | Getgolen - Hjorted - Svartestrom | Getgolen | Svartestrom | 18.0 | Official GPX found; one larger GPX step needs geometry check. |
| 3 | `tjustleden-etapp-3-svartestrom-lunds-by-valstad-kvarn` | Svartestrom - Lunds by - Valstad kvarn | Svartestrom | Valstad kvarn | 18.0 | Official page text also says circa 20 km; GPX measures shorter. |
| 4 | `tjustleden-etapp-4-valstad-kvarn-hjorten-tornsfall` | Valstad kvarn - Hjorten - Tornsfall | Valstad kvarn | Tornsfall | 14.0 | Official GPX appears reversed relative to official stage order and shorter than listed distance. |
| 5 | `tjustleden-etapp-5-tornsfall-almvik-hallingeberg` | Tornsfall - Almvik - Hallingeberg | Tornsfall | Hallingeberg | 21.0 | Official GPX found. |
| 6 | `tjustleden-etapp-6-hallingeberg-karrum-odensvi` | Hallingeberg - Karrum - Odensvi | Hallingeberg | Odensvi | 21.0 | Official GPX appears reversed relative to official stage order; OSM has a 2018 reroute note south of Sixgolen. |
| 7 | `tjustleden-etapp-7-odensvi-dalhem-bjorndalen` | Odensvi - Dalhem - Bjorndalen | Odensvi | Bjorndalen | 20.0 | GPX measures longer than official distance. |
| 8 | `tjustleden-etapp-8-bjorndalen-mockelhult-lermon` | Bjorndalen - Mockelhult - Lermon | Bjorndalen | Lermon | 15.0 | Official GPX found; official connector to Overum/Holmsjoleden intersects this stage. |
| 9 | `tjustleden-etapp-9-lermon-kolsebro-falerum` | Lermon - Kolsebro - Falerum | Lermon | Falerum | 13.0 | Official GPX found; no matching OSM Tjustleden relation found in the overview pass. |

## Branches, loops, and connectors

- Ankarsrumsslingan: official loop/connection, about 11.9 km, connected to stage 2/3 around Isgolen/Svartestrom/Ankarsrum.
- Tornsfall/Gagern/Marsbacken connector: official access route toward Vastervik, about 8 km.
- Vastervik - Tornsfall connector: official Vastervik Outdoor route, about 14.6 km. Page slug says "Tornsvall", likely a typo for Tornsfall and needs confirmation before import.
- Stage 8 Overum/Holmsjoleden connector: official connector, about 7 km.
- Stage 9 Ukna connector: official connector, about 3.5 to 4 km.
- Southern trail connection: Ostkustleden at/near Mortfors.
- Northern trail connection: Ostgotleden at/near Falerum.

No official ferry, rowboat, or mandatory bus-transfer segment was found in the overview pass. Section agents still need to check transit access and any local seasonal service limitations.

## High-level rules and access notes

Official overview sources say the trail is marked with orange rings, poles, and arrows. Shelters and privies are described at stage endpoints; Falerum is an exception where the endpoint facility is the railway station rather than a shelter. Trash bins are described at most stage endpoints.

Water is a major planning caveat: the Naturskyddsforeningen overview says there are no fresh-water sources along the trail, though hikers may be able to refill at farms, campgrounds, or other sites by arrangement. Each section file should therefore treat water as unverified unless a reliable point source is found.

Official sources also ask hikers to respect private dwellings and grazing animals. Fireplaces are present at many places, but current fire bans and local restrictions must be checked against municipality/county fire-ban guidance before import text is finalized.

## Geometry summary

Vastervik Outdoor/Naturkartan stage pages expose planning-grade GPX files for all nine main stages and the main official connectors/loops. Endpoint coordinates in the overview research are derived from GPX first/last points and need section-level confirmation against official text, shelters, trailhead signs, OSM, and map imagery.

OSM route relations were found for stages 1-8 and for several connectors/loops, but not for stage 9 in the overview pass. OSM relation metadata should be treated as supporting evidence, not as the primary official source.

## Known source risks

- Official total distance is stated as about 200 km including loops, while the main-stage total is about 159 km.
- Several official GPX lengths differ materially from listed official distances, especially stages 3, 4, 7, and 9.
- Stage 4 and stage 6 official GPX direction appears opposite the official written stage order.
- Stage 3 has an internal distance contradiction: the page text says circa 20 km while the fact block says 18 km.
- Stage 9 lacks an OSM Tjustleden relation in the overview pass.
- Some official page slugs/text contain spelling inconsistencies, including "Ankarumsslingan" for Ankarsrumsslingan and "Tornsvall" for Tornsfall.
- Water, closures/reroutes, dog/livestock restrictions, hunting/forestry periods, and protected-area rules require section-level checks.

## Handoff status

Per user instruction on 2026-04-29, research was stopped after the overview and Etapp 1 synthesis. The completed first-section file is:

- `sections/tjustleden-etapp-1-mortfors-getterum-getgolen.research.json`

Etapp 1 is research-ready for handoff but not import-ready. Remaining blockers before import include Mörtfors start shelter/toilet coordinate verification, official KLT stop/GTFS verification, protected-area overlay near Mörtfors naturreservat, current fire-rule wording, and coordinate verification for pending heritage/swimming POIs.

Sections 2-9 have overview metadata only and still require the required six-lane section research process.
