# Högakustenleden Research

Status: research-only candidate. Do not import into runtime app data yet.

Trail ID: `hogakustenleden`

## Phase 1 Overview

The active Höga Kusten tourism pages describe **Höga Kusten-leden / Högakustenleden / High Coast Trail** as a 135 km trail from Hornöberget to Örnsköldsvik, divided into **9 current official sections**. The current destination-site pages and current Naturkartan guide are the best import baseline for section order.

There is a significant source-currentness risk: multiple official or semi-official sources still preserve older splits:

- Active Höga Kusten page: 9 sections, 135 km.
- Current Naturkartan guide and per-section pages: 9 current pages with downloadable GPX, but section 2 has a distance conflict.
- Höga Kusten PDF guide at `https://www.hogakusten.com/sv/media/265`: 13 sections, 128.6 km.
- STF signature trail pages: 7 stages, about 140 km.
- Legacy `hogakustenleden.com`: 13 sections, 128 km, explicitly says the page was being refreshed in 2016.

For later normalization, treat the 9-section Höga Kusten tourism structure as current, and keep 7- and 13-stage structures as legacy references only unless a later official update reverses this.

## Current Official Section Order

| Section | Name | Distance | Time | Difficulty | Current official page |
| --- | --- | ---: | --- | --- | --- |
| 1 | Hornöberget-Lövvik | 11.0 km | 5-6 h | Svår | https://www.hogakusten.com/sv/hogakustenleden/etapp-1-hornoberget-lovvik |
| 2 | Lövvik-Gavik | 26.8 km | 10-12 h | Svår | https://www.hogakusten.com/sv/hogakustenleden/etapp-2-lovvik-gavik |
| 3 | Gavik-Lappudden | 9.4 km | 3 h | Lätt | https://www.hogakusten.com/sv/hogakustenleden/etapp-3-gavik-lappudden |
| 4 | Lappudden-Ullånger | 14.6 km | 6-7 h | Medel | https://www.hogakusten.com/sv/hogakustenleden/etapp-4-lappudden-ullanger |
| 5 | Ullånger-Skuleberget | 20.8 km | 7-9 h | Svår | https://www.hogakusten.com/sv/hogakustenleden/etapp-5-ullanger-skuleberget |
| 6 | Skuleberget-Entré Syd Skuleskogens nationalpark | 10.86 km | 3 h | Svår | https://www.hogakusten.com/sv/hoga-kusten-leden-etapp-6-skuleberget-entresyd |
| 7 | Entré Syd-Entré Nord Skuleskogens nationalpark | 7.5 km | 2-3 h | Medel on Höga Kusten; Röd/krävande on Naturkartan | https://www.hogakusten.com/sv/hoga-kusten-leden-etapp-7-entresyd-entrenord |
| 8 | Entré Nord-Balesuddens naturreservat | 20.0 km | 6-7 h | Medel | https://www.hogakusten.com/sv/hoga-kusten-leden-etapp-8-entrenord-balesudden |
| 9 | Balesuddens naturreservat-Örnsköldsvik | 18.8 km | 6 h | Medel | https://www.hogakusten.com/sv/hoga-kusten-leden-etapp-9-balesudden-ovik |

## Overview Findings

- County: Västernorrlands län.
- Municipalities: Kramfors and Örnsköldsvik, with the trail moving north from Hornöberget/Sandöverken through Nordingrå, Ullånger, Docksta, Skuleberget, Skuleskogen, Köpmanholmen, Balesudden, Svedjeholmen, and Örnsköldsvik.
- Route direction: current official order is south to north, Hornöberget to Örnsköldsvik. Sources say the trail can be hiked both directions.
- Branches and alternates: Ulvöleden is listed as an official side trail/detour, not part of the 9 main stages. Other detours include Valkallen, Rödhällorna, Älgaberget, Rödklitten, Fäberget, Getsvedjeberget/Predikstolen, Balesberget/Balestjärnen, and town/service access spurs.
- Ferries/boats: section 4 notes seasonal boat connections from Ullånger to Ulvön; section 8 notes boat traffic from Köpmanholmen/Kläppa to Trysunda and Ulvön. Treat these as nearby access/side-trip metadata unless a later section pass finds they are required for the main route.
- Current GPX: each active Naturkartan section GPX returned HTTP 200 on 2026-04-29. No official KML or GeoJSON source found in the overview pass.
- Transit overview: DinTur route 50 is cited for Hornöberget, Ullånger, Docksta, Naturum Höga Kusten E4/Skuleberget, and Skule Entré V E4; route 421 is cited between Köpmanholmen and Örnsköldsvik. Örnsköldsvik has train and bus access. Section-level stop coordinates remain for Phase 2.
- Camping/fire overview: normal Swedish public-access rules apply outside protected areas; the official guide says tenting is broadly possible if done responsibly, but Skuleskogen National Park allows tenting only at designated sites during 1 May-30 September and fires only at designated sites during that period.
- Dogs: official guidance says dogs are welcome but must be leashed; Skuleskogen National Park requires dogs to be leashed.
- Water overview: official pages warn water can be hard to find, especially in high summer. Naturkartan and Höga Kusten list taps, wells, streams, guest harbors, and commercial refills, but reliability and coordinates need section-level verification.

## Import Posture

The trail is ready for section-level research against the active 9-section structure. It is not ready for normalization because:

- Section 2 distance conflicts affect declared distance and route QA.
- Section 7 difficulty conflicts between current official pages.
- Legacy 7- and 13-stage splits can pollute search results, GPX slug names, and service text.
- Commute endpoints, facility coordinates, and protected-area restrictions still need section-level research.

Next safe step: run the requested six-lane agent batch for each of the 9 active sections, then write one `sections/<section-id>.research.json` file per section without editing app runtime data.
