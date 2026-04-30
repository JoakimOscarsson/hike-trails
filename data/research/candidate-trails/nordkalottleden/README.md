# Nordkalottleden Research

Status: research-only candidate, Phase 1 overview complete.

Do not import these files into runtime data without a separate normalization pass. This trail is not yet represented in `data/source/hiking/**`, `public/data/**`, or `public/routes/**`.

Files:

- `trail.research.json`: whole-trail overview, source inventory, candidate section models, contradictions, and import-readiness notes.
- `research-progress.json`: resumable progress state and next actions.
- `sections/*.research.json`: reserved for Phase 2 section packets. No section packet has been written yet.

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

Choose and freeze the Phase 2 section model before spawning per-section research agents. The current safest default is to research the 12 Reisa/Käsivarsi official legs first because they have the cleanest official distance inventory, then separately resolve the Swedish/E1/variant section model before writing Swedish and southern section files.
