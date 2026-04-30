# Nordkalottleden Research

Status: 12-section Reisa/Käsivarsi/Kautokeino candidate artifacts are generated and internally consistent, but this is not full-trail import ready.

Do not import these files as `nordkalottleden` runtime data yet. Live source checks on 2026-04-30 still describe Nordkalottleden/Nordkalottruta as an approximately 800 km trail with southern endpoint/variant logic around Kvikkjokk and Sulitjelma. The local 12-section model covers the official Reisa/Käsivarsi/Kautokeino sector only.

Files:

- `trail.research.json`: whole-trail overview, source inventory, candidate section models, contradictions, and import-readiness notes.
- `research-progress.json`: resumable progress state and next actions.
- `sections/*.research.json`: 12 researched Reisa/Käsivarsi/Kautokeino section packets.
- `geometry/sections/*.geojson`: official-source candidate section geometry for those 12 section packets.
- `normalized-candidate/*.research.json`: normalized candidate artifacts for the scoped 12-section model.

Trail identity:

- Swedish: Nordkalottleden.
- Norwegian: Nordkalottruta.
- Finnish: Kalottireitti.
- English aliases: Nordkalott Trail, Arctic Trail / Arctic Route.

Phase 1 conclusion:

Official and near-official sources support an approximately 800 km marked summer hiking route through Norway, Sweden, and Finland. The strongest whole-trail endpoint model is Kautokeino / Guovdageaidnu to Sulitjelma / Sulidälbmá, with a Swedish southern variant or access branch around Kvikkjokk / Huhttán. The route also has important branch/access logic around Kilpisjärvi, Treriksröset, Pältsa, Abisko, Hukejaure/Gautelis, Ritsem/Vaisaluokta, Padjelanta, and Reisa.

Current local scope:

- The prepared 12-section model follows the official Reisa National Park distance inventory from Kilpisjärvi to Kautokeino.
- Live source check: Reisa National Park describes the full Nordkalott Trail as 800 km from Sulitjelma to Kautokeino and lists the 12 Kilpisjärvi-Kautokeino legs used here: <https://reisanasjonalpark.no/en/nordkalott-trail/>.
- Live source check: Båttrafik i Kvikkjokk describes Nordkalottleden as about 800 km with Kautokeino and Kvikkjokk endpoint framing and a Kvikkjokk-Sulitjelma section: <https://www.battrafikikvikkjokk.se/nordkalottleden_eng.html>.
- Candidate geometry uses Luontoon/Metsähallitus linework for Finnish sections, Geonorge/Turrutebasen linework for Norwegian sections, and a mixed official-source handoff for the cross-border Kopmajoki-Somashytta section.
- Endpoint/connector gaps are already explicit in `normalized-candidate/route-topology.research.json`: Saarijärvi hut-yard offset, section 6 source-boundary handoff, Saraelv/Ovi Raishiin endpoint-zone gap, and Madam Bongos/Čunovuohppi legacy endpoint metadata.
- This scoped model can be imported later only if the app deliberately supports partial named segments. It should not be presented as the full Nordkalottleden trail.

Important import caution:

There is no single clean official stage inventory comparable to Upplandsleden. Sources publish overlapping regional inventories:

- Reisa National Park provides a strong 12-leg hut/distance inventory for the Kilpisjärvi-Reisa-Kautokeino sector.
- Naturkartan/Länsstyrelsen provides Swedish official segment pages, often shared with Kungsleden, Padjelantaleden, or Laponia-managed routes.
- E1 Hiking Europe provides a useful OSM-derived GPX seed in north-to-south order, but it is incomplete and has known distance/geometry issues.
- UT.no provides valuable DNT/hut context, but its top Nordkalottruta route proposal explicitly warns that the map track and distance/day metadata are wrong.

Recommended next safe step:

Research and freeze the missing whole-trail section model before importing Nordkalottleden as a full trail. Use the 12-section model as a scoped northern segment reference, then add the Swedish/Norwegian southern legs and variant decisions before runtime import.
