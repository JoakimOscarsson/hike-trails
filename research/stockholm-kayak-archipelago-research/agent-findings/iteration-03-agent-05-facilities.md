# Iteration 03 Agent 05: Facilities And Logistics

Accessed: 2026-04-26

This pass focused on additional rental, self-service rental, sauna, guest-harbor, ferry and service nodes. It treated the existing seed as already covering the first-pass core facilities.

## Additional Facility Candidates

| id | name | type | area | services / routes served | access | confidence / gaps |
|---|---|---|---|---|---|---|
| `sat-fac-svartso-kajak` | Svartsö Kajak | self-service kayak rental | Svartsö | Kayak rental referenced by Stockholm Archipelago Trail; likely island model. Serves Svartsö, Ingmarsö/Finnhamn/Svartsö/Möja micro-itinerary. | Svartsö ferries to Alsvik, Skälvik, Norra Svartsö, Söderboudd from Stockholm/Vaxholm/Åsättra/Boda. | Medium; need operator page, pickup location, 2026 inventory and safety terms. |
| `sat-fac-solberga-gard-runmaro` | Solberga Gård kayak rental | kayak rental / cafe | Runmarö | Café and kayak rental referenced by SAT; serves Runmarö, Sandhamn and Nämdö combinations from Stavsnäs. | Runmarö ferry from Stavsnäs/Sandhamn. | Medium; need operator page, launch point, rental terms and 2026 hours. |
| `sat-fac-namdo-langvik-sauna` | Nämdö Långvik sauna | public sauna | Nämdö | Archipelago Foundation open sauna; Swish fee; opens Valborg 2026 per findings and closes under fire bans/season changes. | Near Långvik on Nämdö trail; ferry from Stavsnäs year-round, summer from Stockholm/Saltsjöbaden. | High; need coordinate and on-site booking-list details. |
| `sat-fac-mojaskargarden-ostholmen-osterviken-saunas` | Möjaskärgården Ostholmen and Österviken saunas | public sauna | Möjaskärgården | Archipelago Foundation public saunas; seasonal/fire-ban dependent. | Boat/kayak access in Möjaskärgården. | Medium; need exact island coordinates, current status and landing rules. |
| `sat-fac-trasko-storo-saunas` | Träskö-Storö public saunas | public sauna | Träskö-Storö | Two Archipelago Foundation saunas; one large sauna listed as no-booking; seasonal/fire-ban dependent. | Boat/kayak access; relevant from Sollenkroka. | Medium; need coordinates and 2026 status. |
| `sat-fac-grinda-service-cluster` | Grinda Wärdshus / guest-harbor service cluster | guest harbor / food / lodging / campsite-water-toilet candidate | Grinda | Wärdshus, lodging, guest harbor, camping/tenting areas, likely harbor toilets/water/showers. | Södra and Norra Grinda quays; year-round from Vaxholm/Värmdö, summer from central Stockholm. | Medium; split into precise campsite/harbor/water/sauna records after checking operator page. |
| `sat-fac-ingmarso-guest-harbor` | Ingmarsö guest harbor | guest harbor / bike rental / shop / service node | Ingmarsö | Guest harbor, year-round store nearby, bike rental at store, restaurant/bakery/B&B. Serves Ingmarsö/Finnhamn/Brottö/Svartsö/Möja itinerary. | Ingmarsö Södra/Norra ferries from Stockholm/Vaxholm/Åsättra/Boda year-round. | High; need harbor amenity list and coordinates. |
| `sat-fac-orno-kyrkviken-kayakomat-service-cluster` | Ornö Kyrkviken service cluster and Kayakomat | self-service kayak rental / guest harbor / food / shop / transit | Ornö / Kyrkviken | Kayakomat, store, restaurants, summer bakery, guest harbor, Nordsyd ferry stop; serves Ornö, Fjärdlång/Utö summer combinations. | Kyrkviken/Ornö Kyrka by summer ferry/Nordsyd; island bus from Hässelmara car ferry. | High; need exact Kayakomat coordinate and 2026 status. |
| `sat-fac-orno-batvarv-brunnsviken` | Ornö Båtvarv / Brunnsviken | guest harbor / sauna / cabins / bike rental / cafe-shop | Ornö / Lättinge-Brunnsviken | Guest harbor, small camping cabins, micro-store, small café, sauna, bike rental. | Near Lättinge/Brunnsviken; island bus along Ornö main road. | High; need public-vs-guest access for sauna/toilets/water. |
| `sat-fac-nattaro-firepit-network` | Nåttarö designated fire pits | fireplace | Nåttarö | Cooking fire pits at Östermarviken, Skarsand, Nåttarö Storsand and Vänsviken; unusable during fire bans. | On/off route around Nåttarö. | High; need exact coordinates and signage verification. |
| `sat-fac-uto-gruvbryggan-service-cluster` | Utö Gruvbryggan / Gruvbyn service cluster | transit / food / shop / lodging / guest harbor / kayak-rental candidate | Utö | Store, restaurants, bakery, lodging via Utö Värdshus, guest harbor nearby, activities. | Gruvbryggan ferry; Årsta Brygga year-round, summer Stockholm/Saltsjöbaden/Dalarö and Nordsyd. | High; split harbor water/toilet/shower/sauna and kayak operator after Utö/Aktiv Skärgård checks. |
| `sat-fac-fjardlang-guest-harbor-tent-sauna` | Fjärdlång ferry/guest-harbor and tent/sauna nodes | guest harbor / tenting area / sauna / kayak-rowboat rental candidate | Fjärdlång | Guest harbor/natural harbors, tenting area, sauna and kayak/rowboat rental listed by Explore. SAT says hostel temporarily closed and island has little/no service. | Summer Nordsyd from Utö/Ornö; shoulder-season Dalarö Fri-Sun. | Medium; reconcile Explore listings with SAT service warnings. |
| `sat-fac-sandhamn-ksss-guest-harbors` | Sandhamn / KSSS guest harbor nodes | guest harbor / food / lodging / service | Sandhamn / Sandön and Lökholmen | Major summer guest harbors, hotels, restaurants/cafés, activity operators; very seasonal/crowded. | Year-round from Stavsnäs via Runmarö; summer Cinderella and Nordsyd. | High; need public toilet/water nodes and non-boater access. |
| `sat-fac-ingmarso-finnhamn-rowboats` | Båtluffarleden rowboats Ingmarsö-Finnhamn | rowboat connector / launch | Ingmarsö / Finnhamn | Public rowboat crossing; must keep one boat on each side, often requiring extra tow crossing; volatile boat presence. | Kålgårdsön/Femsund side to Finnhamn side on Båtluffarleden. | High; need landing coordinates and current boat count. |
| `sat-fac-nordsydlinjen-sat-logistics` | Nordsydlinjen / North-South SAT ferry logistics | transport / ferry logistics | whole Stockholm archipelago | Seasonal ferry spine connecting many SAT islands; 2026 season stated as June 22-August 16; many piers require raising semaphore/headlamp signal. | Arholma/Norrtälje-Furusund-Sandhamn-Stavsnäs-Dalarö-Nynäshamn; links Yxlan, Möja/Sandhamn, Nämdö, Ornö, Fjärdlång, Utö, Nåttarö depending timetable. | High; need 2026 final timetable and per-section stop list. |

## Already-Seeded Facilities Reconfirmed

- Get Out Kayak Stavsnäs.
- Get Out Kayak Sollenkroka.
- Skärgårdens Kanotcenter.
- Dalarö Kajak.
- Nynäshamns Kajakuthyrning.
- Möja Outdoor.
- Nåttarö Gård & Resort.
- Aktiv Skärgård / Utö.
- Finnhamn Paradisviken / Ragnar's kiosk service cluster.

## Sources

- https://getoutkayak.se/pages/our-locations
- https://stockholmarchipelagotrail.com/questions-and-aswers/
- https://www.explorearchipelago.com/sthlm/central-archipelago/vaxholm/skargardens-kanotcenter-kayaks-outdoor
- https://www.kanotcenter.com/
- https://visitskargarden.se/se-goera/sport-fritid/kayakomat-kajak-och-sup-uthyrning-i-skaergaarden.aspx
- https://dalarokajak.se/en/home/
- https://dalarokajak.se/en/rent-kayak-stockholm/
- https://www.visitstockholm.com/o/dalaro-kajak/
- https://www.explorearchipelago.com/sthlm/southern-archipelago/nynashamn/nynashamn-kayak-rental
- https://www.hyrkajak.se/
- https://stockholmarchipelagotrail.com/section/section-svartso/
- https://mojaoutdoor.se/
- https://www.swedishtouristassociation.com/facilities/stf-moja-hostel/discover/
- https://stockholmarchipelagotrail.com/section/section-moja/
- https://stockholmarchipelagotrail.com/section/section-runmaro/
- https://stockholmarchipelagotrail.com/section/section-namdo/
- https://skargardsstiftelsen.se/var-verksamhet/tillganglig-skargard/bastu/
- https://www.explorearchipelago.com/sthlm/stay-eat-and-do/saunas
- https://stockholmarchipelagotrail.com/section/section-grinda/
- https://www.explorearchipelago.com/sthlm/stay-eat-and-do/glamping-tent-sites
- https://www.explorearchipelago.com/sthlm/stay-eat-and-do/guest-harbors-natural-harbors
- https://skargardsstiftelsen.se/var-verksamhet/tillganglig-skargard/gasthamnar-och-bryggor/
- https://www.explorearchipelago.com/sthlm/central-archipelago/finnhamn/finnhamns-arkipelag-kayak-rental
- https://stockholmarchipelagotrail.com/section/section-finnhamn/
- https://stockholmarchipelagotrail.com/section/section-ingmarso/
- https://stockholmarchipelagotrail.com/section/section-orno/
- https://stockholmarchipelagotrail.com/section/section-nattaro/
- https://skargardsstiftelsen.se/projekt/sustainable-gateways-english/
- https://skargardsstiftelsen.se/var-verksamhet/tillganglig-skargard/grilla/
- https://stockholmarchipelagotrail.com/section/uto/
- https://www.explorearchipelago.com/sthlm/southern-archipelago/uto
- https://www.aktivskargard.se/
- https://www.explorearchipelago.com/sthlm/stay-eat-and-do/rentals
- https://stockholmarchipelagotrail.com/section/section-fjardlang/
- https://stockholmarchipelagotrail.com/section/section-sandhamn/
- https://assets.ctfassets.net/4l7cjdaypzcu/UrqsczDUUVXP3wS6rUTqF/084204d2cbb11957c0992e8fb7f3ac28/linjekarta-waxholmsbolaget-maj2025.pdf
