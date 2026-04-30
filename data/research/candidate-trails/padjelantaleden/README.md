# Padjelantaleden Research

Status: imported to runtime source data on 2026-04-30, with all 10 section packets complete, caveats resolved into normalization policy, and candidate route geometry generated.

Trail ID: `padjelantaleden`

Official spelling: `Padjelantaleden`.

Aliases and source spellings:

- `Badjelánndaleden` / `Badjelánnda Trail`
- `Padjelanta Trail`
- `Padjelantaleden`
- Prompt spelling: `Padeljantaleden` (recorded as a likely transposition; not used for IDs)

## Scope

This folder is the provenance and rebuild workspace for the Padjelantaleden runtime import. The imported app data now lives under:

- `data/source/hiking/padjelantaleden/`
- `public/routes/hiking/padjelantaleden/`

Research artifacts remain isolated under `data/research/candidate-trails/padjelantaleden/` and should be rebuilt before re-importing runtime shards.

Current handoff files:

- `normalization-handoff.research.json`: current per-trail normalization handoff.
- `normalized-candidate/`: generated route, geometry, facility, rule-warning, and import-report artifacts.
- `geometry/candidate/`: generated candidate route GeoJSON plus source downloads and build report.
- `caveats-resolution.research.json`: caveat resolution across all 10 sections.
- `research-progress.json`: current section completion ledger.

Runtime import summary:

- Runtime display distance: 140 km from the normalized section distances.
- Candidate walking geometry total: 133.693 km.
- Route files: 10/10 section GeoJSON files.
- Manual route status: stage 1 and stage 10, because M/S Storlule and Bobäcken-Kvikkjokk boat/access legs are access metadata rather than walking geometry.
- Validation: `npm run data:candidate-normalization:check`, `npm run data:candidate:import -- padjelantaleden`, `npm run data:build`, `npm run data:validate`, and `npm run data:check` passed on 2026-04-30.

## Phase 1 Overview

Official sources describe Padjelantaleden as a remote point-to-point summer hiking trail between Ritsem/Rijtjem in the north and Kvikkjokk/Huhttán in the south, crossing Padjelanta/Badjelánnda National Park in the Laponia World Heritage Site.

The official stage presentation from STF is north-to-south and has 10 stages/hiking days:

| Section ID | Official stage | From | To | Official distance |
| --- | --- | --- | --- | --- |
| `padjelantaleden-stage-01-ritsem-akka-gisuris` | Etapp 1 | Ritsem / STF Akka Fjällstuga | BLT Gisurisstugan | 2 + 14 km |
| `padjelantaleden-stage-02-gisuris-laddejahka` | Etapp 2 | BLT Gisuris/Kisurisstugan | BLT Låddejåhkåstugan | 23 km |
| `padjelantaleden-stage-03-laddejahka-arasluokta` | Etapp 3 | BLT Låddejåhkåstugan | BLT Árasluoktastugorna | 13 km |
| `padjelantaleden-stage-04-arasluokta-staloluokta` | Etapp 4 | BLT Árasluoktastugorna | BLT Stáloluoktastugan | 10 km |
| `padjelantaleden-stage-05-staloluokta-duottar` | Etapp 5 | BLT Stáloluoktastugan | BLT Duottarstugan | 18 km |
| `padjelantaleden-stage-06-duottar-darreluoppal` | Etapp 6 | BLT Duottarstugan | BLT Darreluoppal | 11 km |
| `padjelantaleden-stage-07-darreluoppal-sammarlappa` | Etapp 7 | BLT Darreluoppal | STF Såmmarlappa Fjällstuga | 15 km |
| `padjelantaleden-stage-08-sammarlappa-tarrekaise` | Etapp 8 | STF Såmmarlappa Fjällstuga | STF Tarrekaise Fjällstuga | 13 km |
| `padjelantaleden-stage-09-tarrekaise-njunjes` | Etapp 9 | STF Tarrekaise Fjällstuga | STF Njunjes Fjällstuga | 6 km |
| `padjelantaleden-stage-10-njunjes-kvikkjokk` | Etapp 10 | STF Njunjes Fjällstuga | STF Kvikkjokk Fjällstation | 12 + 3 km |

Headline distance is inconsistent across official and tourism sources:

- STF: 160 km, 9-10 stages, 6-23 km per stage.
- Sveriges Nationalparker: 150-160 km summer trail.
- Länsstyrelsen Norrbotten: about 150 km between Kvikkjokk and Rijtsem/Ritsem.
- Padjelanta.se: a little over 14 Swedish mil and at least 10 days.
- The summed STF stage distances above are about 140 km when the marked walking and named boat components are counted literally.

Import policy: use per-section distances from the official stage inventory, retain the 140/150/160 km contradiction in source caveats, and avoid presenting a single source as the authoritative whole-trail distance. The app runtime distance uses the normalized section sum.

## Access And Connections

Key access/connection records modeled as access metadata rather than walking geometry:

- M/S Storlule boat across Áhkkájávrre/Akkajaure between Ritsem/Rijtjem and Änonjálmme/Áhkká/Vájsáluokta. Weather can cancel sailings.
- Boat from Kvikkjokk to/from Bobäcken over Tarraälven/Tarraätno for the southern access.
- Optional regular helicopter access from Ritsem/Rijtjem or Kvikkjokk/Huhttán to Stáloluokta in summer.
- Alternate northern start via Vájsáluokta and STF Kutjaure, then joining the Padjelantaleden/Nordkalottleden linework toward Låddejåhkå.
- Nordkalottleden overlaps or branches around Árasluokta/Stáloluokta, Kutjaure/Låddejåhkå, and Tarrekaise/Kvikkjokk; do not merge those routes automatically.
- Stage 10 has a route/access ambiguity: official text gives 12 km walking plus 3 km boat to Kvikkjokk, with an indistinct 4 km walking alternative to Gamájåhkå that still requires boat transport over the water.

## Rules And Safety

High-level rules and safety notes for every section packet:

- The trail crosses Padjelanta/Badjelánnda National Park and parts of the wider Laponia World Heritage Site; allemansrätten is limited by protected-area regulations.
- Dogs are prohibited in the Laponia national parks except leashed dogs from 1 January to 30 April. Summer hiking with dogs through Padjelanta/Badjelánnda is therefore not allowed.
- Drone flights in Padjelanta/Badjelánnda, Sarek, and Stora Sjöfallet/Stuor Muorkke national parks require permission.
- Visitors must not intentionally disturb reindeer or reindeer herding. Avoid camping or resting close to private cabins, goahti/kåtor, paths, or reindeer enclosures.
- Cycling is prohibited inside the Laponia national parks/nature reserves except listed roads outside the hiking route context.
- Fishing is prohibited in national parks except in specified waters with the correct permit; Padjelanta.se notes fishing is allowed within 1 km on both sides of Padjelantaleden with Jokkmokkskortet, except from Vuojatädno's eastern shore downstream from Kutjaure.
- Fire use must be checked against current Norrbotten/Jokkmokk fire bans. Länsstyrelsen says the person lighting a fire is responsible and must check local/current restrictions.
- Länsstyrelsen Norrbotten reports current mountain-route/bridge/season information under `Aktuellt i fjällen`; as of 2026-04-29 the visible items are broad snow/ice warnings from March-April 2026 rather than a Padjelantaleden-specific closure.
- Mobile coverage is poor or absent along the trail except at gateway points such as Ritsem, Änonjálmme, Vájsáluokta, and Kvikkjokk; BLT hut camps have emergency phones.
- Weather, high water, snowmelt, and summer bridges are seasonal risks; local/current checks are required at import and user-facing publication time.
- No trash handling in the mountains: pack out all waste.

## Official Geometry Sources

Naturkartan exposes GPX downloads, but not as one GPX per official STF stage. The main linework is grouped and sometimes stored opposite the STF north-to-south stage order:

| Source | Coverage | Stored direction | Computed length | Import note |
| --- | --- | --- | --- | --- |
| `bd58` | Vájsáluokta-Akka-Gisuris-Sáluhávrre | north-to-south | 33.181 km | Includes alternate Vájsáluokta start and northern overlap; extract only needed subsegments for stages 1-2. |
| `bd57` | Kutjaure-Låddejåhkå with last 11 km on Padjelantaleden | north-to-south | 17.244 km | Needed to complete stage 2, but first portion is Kutjaure/Nordkalottleden access rather than official Gisuris-Låddejåhkå. |
| `bd59` | Låddejåhkå-Árasluokta | stored Árasluokta-to-Låddejåhkå | 12.971 km | Reverse for official stage 3. |
| `bd60` | Árasluokta-Stáloluokta | stored Stáloluokta-to-Árasluokta | 10.157 km | Reverse for official stage 4. |
| `bd69` | Stáloluokta-Duottar-Darreluoppal | stored Darreluoppal-to-Stáloluokta | 27.548 km | Reverse and split for stages 5-6; official/Naturkartan stage 5 distance differs by 1 km. |
| `bd70` | Darreluoppal-Såmmarlappa-Tarrekaise | stored Tarrekaise-to-Darreluoppal | 26.536 km | Reverse and split for stages 7-8. |
| `bd71` | Tarrekaise-Njunjes-Kvikkjokk/Bobäcken access | Tarrekaise-to-Kvikkjokk | 22.613 km | Split for stages 9-10 and verify whether linework includes the boat/access segment. |

OSM has incomplete but useful route relations for several Padjelantaleden grouped sections:

- Relation `19111628`: `Padjelantaleden - Section 1`, from `Vaisaluoktastugan` to `Gisuris`.
- Relation `19111627`: `Padjelantaleden - Section 2`, from `Gisuris` to `Låddejåhkå`.
- Relation `19111626`: `Padjelantaleden - Section 5`, from `Stáloluokta` via `Duottar` to `Darreluoppal`.
- Relation `19111625`: `Padjelantaleden - Section 6`, from `Darreluoppal` via `Såmmarlappa` to `Tarrekaise`.

OSM/Naturkartan section numbering does not match STF's 10-day stage numbering. Treat OSM as a geometry cross-check, not as the section authority.

Implemented candidate geometry policy:

- Stages 1-2 use researched OSM relation geometry because the Naturkartan GPX records are grouped or mixed with access/alternate route linework.
- Stages 3-10 use Naturkartan GPX with the documented split/reversal policy from the section research.
- The stage chain is continuous after splitting, except for a 4.8 m source offset between stage 2 and stage 3.
- M/S Storlule, Bobäcken-Kvikkjokk, helicopter access, local Virihaure boats, and the Gamájåhkå walking alternative are not drawn as mainline walking geometry.
- Rebuild with `npm run data:candidate-geometry:padjelantaleden`, then `npm run data:candidate-normalization:build`.

## Sources Checked

- STF Padjelantaleden overview: https://www.svenskaturistforeningen.se/guider-tips/leder/padjelantaleden/
- STF English Padjelanta Trail overview: https://www.swedishtouristassociation.com/trails/padjelantatrail/
- Padjelanta.se overview and hut chain: https://padjelanta.se/
- BLT official site: https://padjelanta.com/
- BLT cabins/map: https://padjelanta.com/en/cabins-and-map/
- BLT pricing/opening times: https://padjelanta.com/priset-och-oppet/
- BLT FAQ: https://padjelanta.com/en/frequently-asked-questions/
- Laponia Badjelánndaleden: https://laponia.nu/upplev/badjelanndaleden/
- Laponia visitor conduct/rules: https://laponia.nu/foreskrifter-qr/
- Sveriges Nationalparker facts: https://www.sverigesnationalparker.se/upptack-nationalparkerna/padjelantabadjelannda-nationalpark/fakta-om-parken
- Sveriges Nationalparker hiking page: https://www.sverigesnationalparker.se/park/padjelanta--badjelannda-nationalpark/upplevelser/vandringar/
- Sveriges Nationalparker access page: https://www.sverigesnationalparker.se/sv/upptack-nationalparkerna/padjelantabadjelannda-nationalpark/besok-parken/hitta-hit
- Sveriges Nationalparker safety/rules page: https://www.sverigesnationalparker.se/park/padjelanta--badjelannda-nationalpark/besoksinformation/sakerhet-och-regler/
- Länsstyrelsen Norrbotten Padjelanta/Badjelánnda: https://www.lansstyrelsen.se/norrbotten/besoksmal/nationalparker/padjelanta-badjelannda.html
- Länsstyrelsen Norrbotten leder och stugor: https://www.lansstyrelsen.se/norrbotten/besoksmal/friluftsliv-och-allemansratt/leder-och-stugor.html
- Länsstyrelsen Norrbotten aktuellt i fjällen: https://www.lansstyrelsen.se/norrbotten/besoksmal/friluftsliv-och-allemansratt/aktuellt-i-fjallen.html
- Länsstyrelsen Norrbotten fire bans: https://www.lansstyrelsen.se/norrbotten/samhalle/sakerhet-och-beredskap/brandrisk-och-eldningsforbud.html
- Naturvårdsverket consolidated regulations NFS 2013:10 with NFS 2023:15 changes: https://www.naturvardsverket.se/48f045/globalassets/nfs/2013/nfs-2013-10k.pdf
- M/S Storlule 2025 timetable PDF: https://www.svenskaturistforeningen.se/app/uploads/2025/04/ms-storlule-tidtabell-2025.pdf
- Båttrafik i Kvikkjokk: https://battrafikikvikkjokk.se/
- Kvikkjokk-Turism booking: https://boka.se/kvikkjokk
- Road to Ritsem 2025 high-season timetable PDF: https://roadtoritsem.com/wp-content/uploads/2025/05/2025-Road-to-Ritsem-hogsasong.pdf
- Länstrafiken/Fjällinje 94 2025 PDF: https://www.iphone.fskab.se/ltn/Fjallinje91o94/250616_250817/Fjallinje91o94_94_250616_250817.pdf

Accessed date for the latest import-prep check: 2026-04-30.

Latest live-source notes:

- STF still presents the trail as 160 km, 9-10 stages, and stage 10 as 12 + 3 km with boat transport over Tarraätno.
- Padjelanta.se now exposes 2026 gateway transport links and describes the trail as a little over 14 mil / at least 10 days.
- The Padjelanta.se Tarraälven page lists a 2026 Kvikkjokk-Bobäcken timetable for 18/6-13/9.
- BLT English pricing/opening text still shows 2025 pricing/opening details, so hut prices/opening conditions remain publication-time checks.

## Remaining Overview Risks

- Dynamic public-transport, boat, helicopter, hut pricing/opening and bridge/current-condition sources still need a publication-time refresh.
- Stage 1's official naming mixes `Ritsem`, `Änonjálmme`, and `STF Akka`; the import should separate boat access from walking geometry.
- Stage 2 remains the weakest source-policy compromise because the runtime geometry uses OSM relation 19111627 where Naturkartan splits the official stage across a northern grouped route and a Kutjaure connector route.
- Several hut names have Swedish, Lule Sámi, and variant spellings: Gisuris/Kisuris, Låddejåhkå/Låddejåkkå, Duottar/Tuottar, Darreluoppal/Tarraluoppal, Stáloluokta/Staloluokta.
