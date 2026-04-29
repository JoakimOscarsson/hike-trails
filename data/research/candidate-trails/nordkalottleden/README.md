# Nordkalottleden Research

Status: research-only candidate, Phase 1 overview complete; first section research complete.

Do not import these files into runtime data without a separate normalization pass. This trail is not yet represented in `data/source/hiking/**`, `public/data/**`, or `public/routes/**`.

Files:

- `trail.research.json`: whole-trail overview, source inventory, candidate section models, contradictions, and import-readiness notes.
- `research-progress.json`: resumable progress state and next actions.
- `sections/nordkalottleden-kalottireitti-01-kilpisjarvi-saarijarvi.research.json`: first Phase 2 section packet, covering Kilpisjärvi to Saarijärvi.

Trail identity:

- Swedish: Nordkalottleden.
- Norwegian: Nordkalottruta.
- Finnish: Kalottireitti.
- English aliases: Nordkalott Trail, Arctic Trail / Arctic Route.

Phase 1 conclusion:

Official and near-official sources support an approximately 800 km marked summer hiking route through Norway, Sweden, and Finland. The strongest whole-trail endpoint model is Kautokeino / Guovdageaidnu to Sulitjelma / Sulidälbmá, with a Swedish southern variant or access branch around Kvikkjokk / Huhttán. The route also has important branch/access logic around Kilpisjärvi, Treriksröset, Pältsa, Abisko, Hukejaure/Gautelis, Ritsem/Vaisaluokta, Padjelanta, and Reisa.

Important import caution:

There is no single clean official stage inventory comparable to Upplandsleden. Sources publish overlapping regional inventories:

- Reisa National Park provides a strong 12-leg hut/distance inventory for the Kilpisjärvi-Reisa-Kautokeino sector.
- Naturkartan/Länsstyrelsen provides Swedish official segment pages, often shared with Kungsleden, Padjelantaleden, or Laponia-managed routes.
- E1 Hiking Europe provides a useful OSM-derived GPX seed in north-to-south order, but it is incomplete and has known distance/geometry issues.
- UT.no provides valuable DNT/hut context, but its top Nordkalottruta route proposal explicitly warns that the map track and distance/day metadata are wrong.

Recommended next safe step:

Stop here for handoff. This branch contains the Phase 1 overview and the first section packet only.

First section handoff:

- Section ID: `nordkalottleden-kalottireitti-01-kilpisjarvi-saarijarvi`.
- Official order model: Reisa/Käsivarsi official 12-leg inventory, section 1.
- Official distance: 11 km.
- Geometry status: planning-grade. Luontoon/Metsähallitus map linework is authoritative but not yet extracted as a standalone GPX/KML/GeoJSON; OSM relation 9518275 is a usable candidate if reversed and trimmed; E1 GPX is not suitable as-is because it measures about 18.4 km and continues beyond the official Kilpisjärvi stage endpoint.
- Import blocker: Saarijärvi endpoint ambiguity between older route/bridge cluster and the 2023 new hut yard.
- Access status: Kilpisjärvi has bus/parking access; Saarijärvi has no scheduled motorized access and should be modeled as a wilderness hut endpoint with walk-out/backtracking access.
- Facility status: Saarijärvi huts are strong candidates but need final endpoint/duplicate-coordinate cleanup; Tsahkaljärvi facilities remain pending public/private verification.

Recommended next safe step after handoff:

Run a targeted geometry-normalization pass for section 1 before any runtime import work. Extract or visually validate Luontoon/Metsähallitus linework, reverse/trim OSM relation 9518275 if needed, resolve Saarijärvi endpoint semantics, then decide which pending facilities become import rows.
