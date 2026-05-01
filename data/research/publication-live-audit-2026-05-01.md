# Publication-Live Audit - 2026-05-01

This note records the same-day checks done while importing Upplandsleden and Nordkalottleden into runtime data.

## Runtime Result

- Library now exposes 16 hiking trail systems.
- New runtime trails:
  - `upplandsleden`: 52 sections, 20 route groups, 20 presets.
  - `nordkalottleden`: 49 sections, 2 route groups, 2 presets.
- Generated public shards and section detail files are present for both trails.
- Pending and suppressed research records were not promoted to normal map markers.

## Source Checks

- Upplandsstiftelsen Etapp 10 page checked as current source for distance/service and active inventory context. Runtime notes keep the maintenance/reroute caution from the research packets.
- Upplandsstiftelsen current inventory page lists Uppsala County etapper, branches and most official loops; Naturkartan supplies the Stockholm County trail, the Sigtuna/Forsbyan break notice, and loop pages such as 29:1 Bjorkbackaslingan.
- Naturkartan Stockholm County page explicitly says the Sigtuna break means the Stockholm County part does not connect to Upplandsleden in Uppsala County.
- Naturkartan Etapp 1:2 page explicitly says there is no marked route onward from Forsbyan to Sigtuna.
- Reisa National Park current Nordkalott Trail page describes the 800 km Sulitjelma-to-Kautokeino trail and lists the Kilpisjarvi-Kautokeino/Reisa legs used by the first 12 mainline sections.
- E1 Hiking Europe current Nordkalottruta page was used as a planning/GPX cross-check for central/southern Nordkalottleden. Its own note says the stage list is E1-scoped and does not depict the complete course, so E1-derived sections are marked manual/planning-grade where appropriate.

## Browser QA

- In-app browser on `http://127.0.0.1:5174/` showed 16 of 16 hiking routes.
- Nordkalottleden opened successfully. The Kautokeino-Sulitjelma mainline and Kvikkjokk-Sulitjelma variant were selectable; the full variant preset selected all K1-K5 sections and rendered a route map.
- Upplandsleden opened successfully. All 13 official loop route groups were selected one by one in the browser; each selected route group stayed selected, showed the Upplandsleden map with route/facility layer, and reported `52/52 official sections assigned to route groups`.
- Browser console error log was empty during the Upplandsleden loop-selection pass.
- Clicking `Select route and view info` did not show the previous section-detail load warning.

## Automated Checks

- `npm run data:publication-live-trails:import`
- `npm run data:build:hiking`
- `npm run data:candidate-normalization:check`
- `npm run data:validate`
- `npm run data:check`
- `npm run runtime:probe`
- `npm run runtime:cache-probe`
- `npm run typecheck`
- `npm run build`

## Remaining Publication Caveats

- Nordkalottleden K2-K5 variant geometry remains planning-grade until official BD72/BD73 and Tarrekaise-Darreadno connector geometry is harvested.
- Nordkalottleden Hukejaure-Gautelis remains partial/manual until complete source-backed linework is found.
- Nordkalottleden Røysvatn-Vaisaluokta is split from a long E1 GPX stage pending an official Njallajavrre/Gamma split.
- All remote hut/boat/bridge/service status should be rechecked near publication because mountain access and seasonal services change quickly.
