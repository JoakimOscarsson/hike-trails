# Bohusleden Research

Status: imported to runtime data with explicit Stage 21 partial/self-navigation handling.

Handoff status on 2026-04-30: whole-trail overview plus Stages 1-27 research are complete. Stage 21 remains blocked for normal complete-route treatment, so runtime import keeps it as a separate partial/self-navigation entry using only the official mapped partial line.

2026-04-30 import decision:

- West Sweden Trails says Stage 21 is not a continuous marked stage: marking exists from Flötemarksön to Holmen and from road 164 to Porsås, and hikers must self-navigate the middle with map and compass.
- The runtime model imports the southern, middle and northern Bohusleden chains separately, plus a selectable Stage 21 partial/self-navigation entry.
- Stage 21 route status is `manual` even though the official partial geometry is retained for context; it must not be treated as a complete navigable 14 km route.
- A normalization bug that mapped `cleanup_station` shelter/service clusters to `transit` was fixed before import.

Files:

- `trail.research.json`: whole-trail official overview and source-risk packet.
- `research-progress.json`: continuously updated handoff/progress tracker.
- `sections/bohusleden-stage-1-alvsaker-stensjon.research.json`: completed Stage 1 research packet.
- `sections/bohusleden-stage-2-stensjon-skatas.research.json`: completed Stage 2 research packet.
- `sections/bohusleden-stage-3-skatas-kasjon.research.json`: completed Stage 3 research packet.
- `sections/bohusleden-stage-4-kasjon-jonsered.research.json`: completed Stage 4 research packet.
- `sections/bohusleden-stage-5-jonsered-angereds-kyrka.research.json`: completed Stage 5 research packet.
- `sections/bohusleden-stage-6-angereds-kyrka-fontin.research.json`: completed Stage 6 research packet.
- `sections/bohusleden-stage-7-fontin-grandalen.research.json`: completed Stage 7 research packet.
- `sections/bohusleden-stage-8-grandalen-bottenstugan.research.json`: completed Stage 8 research packet.
- `sections/bohusleden-stage-9-bottenstugan-lysevatten.research.json`: completed Stage 9 research packet.
- `sections/bohusleden-stage-10-lysevatten-hasterod.research.json`: completed Stage 10 research packet.
- `sections/bohusleden-stage-11-hasterod-vassbovik.research.json`: completed Stage 11 research packet.
- `sections/bohusleden-stage-12-vassbovik-glimmingen.research.json`: completed Stage 12 research packet.
- `sections/bohusleden-stage-13-glimmingen-bjursjon.research.json`: completed Stage 13 research packet.
- `sections/bohusleden-stage-14-bjursjon-metsjo.research.json`: completed Stage 14 research packet.
- `sections/bohusleden-stage-15-metsjo-kaserna.research.json`: completed Stage 15 research packet.
- `sections/bohusleden-stage-16-kaserna-borgmastarbruket.research.json`: completed Stage 16 research packet.
- `sections/bohusleden-stage-17-borgmastarbruket-kyrkoryr.research.json`: completed Stage 17 research packet.
- `sections/bohusleden-stage-18-kyrkoryr-kynnefjalls-natur.research.json`: completed Stage 18 research packet.
- `sections/bohusleden-stage-19-kynnefjalls-natur-vaktarekullen.research.json`: completed Stage 19 research packet.
- `sections/bohusleden-stage-20-vaktarekullen-flotemarkson.research.json`: completed Stage 20 research packet.
- `sections/bohusleden-stage-21-flotemarkson-porsas.research.json`: completed Stage 21 research packet, but not ready for normal import because full-stage geometry is missing/blocking.
- `sections/bohusleden-stage-22-porsas-nornas.research.json`: completed Stage 22 research packet.
- `sections/bohusleden-stage-23-nornas-vassbotten.research.json`: completed Stage 23 research packet.
- `sections/bohusleden-stage-24-vassbotten-havedalen.research.json`: completed Stage 24 research packet.
- `sections/bohusleden-stage-25-havedalen-krokstrand.research.json`: completed Stage 25 research packet.
- `sections/bohusleden-stage-26-krokstrand-hogstad.research.json`: completed Stage 26 research packet.
- `sections/bohusleden-stage-27-hogstad-stromstad.research.json`: completed Stage 27 research packet.
- `sections/*.research.json`: one section packet per official stage.
- `mapdata/`: research-only candidate mapdata generated from the primary official WST/Hoodin GPX sources recorded in the section packets.
- `geometry/protected-area-overlays/`: research-only official GIS source downloads for protected-area, Natura 2000, water-protection, regulatory-area and biotopskydd overlay QA.
- `normalized-candidate/protected-area-overlays.research.json`: computed route/facility overlap artifact for rule-warning scoping.

Phase 1 official-source pass on 2026-04-29: West Sweden Trails/Bohusleden currently lists 27 stages and a headline distance of about 350 km from Älvsåker to Strömstad. The official structured stage distances sum to 353.5 km.

Mapdata hardening pass on 2026-04-30: `mapdata/sections/*.geojson` now contains one de-duplicated GeoJSON LineString per official stage, and `mapdata/bohusleden-candidate-section-geometries.geojson` contains the combined QA FeatureCollection. The mapdata package has 26 full official stage geometries ready for later normalization with caveats, plus one partial official Stage 21 geometry that is explicitly blocked for complete route import. `mapdata/index.json` records geometry metrics, continuity gaps, source policy, generated files and blocking issues. `mapdata/validation-report.json` records the JSON/GeoJSON shape checks and official GPX URL resolution checks.

Protected-area overlay pass on 2026-04-30: `normalized-candidate/protected-area-overlays.research.json` now records route-bbox official GIS checks against Bohusleden candidate route geometry and facility points. The artifact retains 95 protected/restriction records: 47 with route overlap, 38 with facility overlap, 66 route-overlap records and 379 facility-overlap records across protected areas, Natura 2000, water-protection areas, regulatory areas and biotopskydd. Warning granularity is now resolved for normalization prep: use route-subsegment warnings for route overlaps, facility/site notes for point overlaps, and keep volatile fire, transit, closure and service checks as publication-time whole-trail/section checks. Stage 21 remains partial-geometry only; the overlay scopes the candidate linework and does not solve the missing full-stage corridor.

Important early caveats:

- Current official southern start is Älvsåker, while older/secondary naming still appears as Lindome or Blåvättnerna.
- Official stage geometry is available as GeoJSON LineString data in the West Sweden Trails public API.
- The official geometries for Stage 21 and Stage 22 have an approximately 4.3 km discontinuity; do not stitch these automatically.
- Stage 21 targeted QA confirmed the WST/Naturkartan/OSM linework is partial: about 4.4 km despite stated 14 km, with an official not-continuously-marked/self-navigation warning and a 4.296 km gap to Stage 22 start.
- Stage 8 to Stage 9 has a small official continuity gap of about 49.4 m at Bottenstugan; review before route-chain import rather than silently snapping.
- Stages 1-27 have completed six-agent research batches, synthesis, transit/access, facilities, route geometry, rules/safety, and field-report passes.
- No runtime app/source/generated data has been edited or generated.

Stage 1 key caveats:

- Use official West Sweden Trails/Hoodin GPX or map API linework as primary geometry after de-duplicating consecutive repeated coordinates; OSM relation 279950 strongly corroborates it.
- Treat Naturkartan Stage 1 GPX as secondary/planning-grade because it keeps stale Blåvättnerna framing and diverges from official/OSM linework near Bunketorp.
- Several Stage 1 facilities are import-ready, but Stora Hassungaredssjön toilet/swimming/shelter claims, opening-hours-dependent services, firepit coordinates, and protected-area polygon overlaps need verification before runtime import.

Stage 2 key caveats:

- Use official West Sweden Trails/Hoodin GPX as primary geometry after de-duplicating consecutive repeated coordinates; OSM relation 279634 strongly corroborates it.
- Preserve the distance discrepancy: WST lists 9 km, computed WST/OSM geometry is about 8.64 km, Naturkartan lists 8.3 km, and Västsverige/Mölndal lists 8 km.
- Delsjöområdet rules are high-confidence for the route, while Gunnebo and Rådasjön reserve overlap needs polygon verification before final import warnings.
- Current access evidence favors Västtrafik stop Gunnebo Park for the Stensjön start, while WST text names Kristinedal; resolve before public import.
- Delsjöbadet/Toalett Delsjön/Grillplats Delsjön/Stora Delsjöns strand need cluster/deduplication handling before runtime import.

Stage 3 key caveats:

- Use official West Sweden Trails/Hoodin GPX as primary geometry after de-duplicating repeated coordinates; WST API and Naturkartan match it, and OSM relation 280005 strongly corroborates it.
- Preserve the distance discrepancy: WST/Naturkartan list 10 km, computed WST geometry is about 9.73 km, OSM relation geometry is about 9.55 km, and Västsverige/Partille lists 8.3 km.
- Treat Gotaleden and Vildmarksleden as overlapping route context only; do not substitute their geometry for Bohusleden Stage 3.
- Delsjöområdet and Knipeflågsbergen protected-area rules are relevant, but exact reserve entry/exit points and Knipeflågsbergen tenting wording need polygon/full-decision verification before public rule warnings.
- Härlanda tjärn, Getryggen/Gött läge, and Kåsjöbadet facility clusters need de-duplication and season/opening checks before runtime import.

Stage 4 key caveats:

- Use official West Sweden Trails/Hoodin GPX as primary geometry after de-duplicating triplicated coordinates; Naturkartan corroborates with matching endpoints, while OSM relation 280010 is fresher but shorter.
- Preserve the distance discrepancy: WST lists 8 km, computed WST geometry is about 7.89 km, Naturkartan lists 7.9 km/5 h, OSM computes about 7.56 km, and Västsverige/Partille lists 9 km.
- Treat Gotaleden as fully overlapping route context and Vildmarksleden as partial overlap context; do not substitute their geometry for Bohusleden Stage 4.
- Kåsjön water-protection rules at the start and Jonsereds strömmar rules at the finish need final polygon/subsegment verification before public rule warnings.
- Maderna/Madern, Råhult, Kåsjöbadet, and Jonsered service clusters need de-duplication and season/opening checks before runtime import.

Stage 5 key caveats:

- Use official West Sweden Trails/Hoodin GPX as primary geometry for the main line after de-duplicating triplicated coordinates; Naturkartan corroborates, while OSM relation 11075111 has an Angereds-side endpoint about 299 m from the official endpoint.
- Preserve the Jonsered-Freden shortcut as an alternate candidate: WST prose describes the route choice and OSM relation 1670963 likely represents it, but WST/Naturkartan geometry only encodes the main line.
- Surface the active Ramsjön bridge warning: the old suspension bridge is closed/unsafe/collapsed and hikers should use only the new bridge.
- Bokedalen and Björnareåsen reserve rules are relevant, but exact entry/exit subsegments need polygon verification.
- Freden, Lilla Ramsjön, Humlebadet, Jonsered services, and Angereds endpoint facilities need cluster/deduplication handling; Freden water should not be marked guaranteed potable without manager/on-site verification.

Stage 6 key caveats:

- Use official West Sweden Trails/Hoodin GPX as primary geometry after de-duplicating repeated coordinates; Naturkartan corroborates with matching endpoints, while OSM relation 1898532 is only planning-grade because of a start offset and member-order gaps.
- Preserve the distance discrepancy: WST lists 17 km, computed WST geometry is about 17.303 km, Naturkartan lists 17.3 km, Västsverige/Kungälv lists 16 km, and route apps vary more widely.
- Larjeån, Vättlefjäll, Göta och Nordre älvs dalgång, and Fontin protected-area rules are relevant, but exact subsegments need polygon verification.
- Gäddevatten shelters/fireplaces are high-confidence, but tenting/camping status conflicts between sources; do not mark as formal campsite until signage or manager guidance confirms.
- Stora Mölnesjön, Skärsjölund, Gäddevatten, Bohus/Kungälv services, and Fontin/Kotten facilities need cluster/deduplication handling; Angered water, Skyrsjön west shelters, and Fontin viewpoint/grill should remain pending.
- Retain the 2026-04-08 Västkuststiftelsen windfall alert as a currentness caveat and live-check WST, fire risk, transit, bathing-water, and service hours before publication.

Stage 7 key caveats:

- Use official West Sweden Trails/Hoodin GPX/API as primary geometry after de-duplicating repeated coordinates; Naturkartan is a simplified matching subset, while OSM relation 125205 is corroboration only because its tag still says 19 km and its endpoints differ from official coordinates.
- Preserve the distance discrepancy: WST lists 16 km, computed WST geometry is about 16.413 km, Naturkartan lists 16.4 km, and several municipal/OSM/older sources still carry 19 km.
- Treat WST `Avverkning Romelanda` as an active Stage 7 forestry/currentness caution until removed; no reroute text was found.
- Fontin and Svartedalen protected-area rules plus Lysegården water-protection context are relevant, but exact subsegments need polygon verification.
- Romesjön is a local tent/rest/swim cluster with high-water and bathing-season caveats; do not generalize camping permission to Fontin or Grandalen/Svartedalen.
- Dalen water should not be marked guaranteed potable without manager or on-site verification, and Grandalen bus service is sparse enough to require date-specific journey planning.

Stage 8 key caveats:

- Use official West Sweden Trails/Hoodin GPX/API as primary geometry after de-duplicating repeated coordinates; Naturkartan is a simplified matching subset, while OSM relation 125129 is validation-only because its `distance=7 km` tag is stale and endpoints differ from official coordinates.
- Preserve the distance discrepancy: WST lists 8.5 km, computed WST geometry is about 8.127 km, Naturkartan lists 8.1 km/computes about 8.072 km, Naturkartan prose reportedly says 7.5 km, and OSM computes about 8.013 km.
- Document the official 49.4 m continuity gap from Stage 8 end to Stage 9 start at Bottenstugan; do not auto-stitch until Stage 9 synthesis confirms handling.
- Treat WST forestry/gravel-road work between Ovre and Nedre Langevatten and the Svartedalen post-Storm Dave windfall warning as active currentness cautions until removed by official sources.
- Bottenstugan water should be imported only as seasonal/check-ahead because Vastkuststiftelsen says summer-half-year drinking water, while older Kungalv booking text says water must be brought.
- Suppress Bottenstugan building as lodging while renovation closure remains in force; cluster Bottenstugan shelters, fireplace, dry toilet, tent place, water tap, information board, waste basket, and possible grillkata/access shelter before runtime import.
- Grandalen bus service is sparse, Anvik should remain check-ahead/local-service access unless fixed scheduled transit is verified, and Diserods centrum is an off-route transfer hub.

Stage 9 key caveats:

- Use official WST/Hoodin GPX/API or identical Naturkartan linework as primary geometry after de-duplicating repeated coordinates; OSM relation 125098 is validation-only because it has an internal gap and non-sequential member order.
- Preserve the official 49.432 m continuity gap between Stage 8 end and Stage 9 start at Bottenstugan; do not auto-stitch without an explicit normalization decision.
- Preserve the source contradictions: WST lists 12 km, 4-5 h, red/hard, while Naturkartan lists 12.1 km, 7 h, blue/medium and has a Stage 9 title under an `etapp-7` URL.
- Treat the 2026-04-09 Svartedalen storm/windfall advisory after Storm Dave as active until removed; no direct Stage 9 closure/reroute was found, and adjacent Stage 8 forestry status should not be assigned to Stage 9.
- Bottenstugan water is summer-half-year/check-ahead only, and the Bottenstugan building remains closed for renovation; import the outdoor trailhead cluster but suppress the building as lodging.
- Cluster Bottenstugan, Härsvattnet/Nellys, and Stora Hästevatten shelter/fire/waste/cleanup records carefully before runtime import; verify Lysevatten rest/fire/swim and OSM-only side facilities before importing.
- Public transport is valid but sparse: Anvik/Ålevattnet/Broan had no sample weekend departures, timetables need recheck after 2026-06-14, and no reliable central bailout was found.

Stage 10 key caveats:

- Use official WST/Hoodin GPX/API or matching Naturkartan GPX as primary geometry after de-duplicating repeated coordinates; OSM relation 125070 extends about 723 m north of the official Håsteröd endpoint and should be validation/context only.
- Preserve the distance discrepancy: WST lists 12 km/4-5 h/medium, the WST linked GPX computes about 11.728 km, Naturkartan lists 11.7 km/5 h, and OSM computes about 12.720 km because of its endpoint mismatch.
- Djupevatten shelter/fire/waste/seating/swim cluster is high-confidence, but the separate unauthorized homemade structure beside it should be suppressed as a facility and retained only as a hazard/currentness warning until official removal status is confirmed.
- Stage 10 has no confirmed drinking water or toilet; do not import water/toilet records unless newer official evidence appears.
- No direct protected-area/Natura intersection was found in the initial WFS screen, but final line-buffer protected-area and water-protection overlay is still needed before public rule warnings.
- Håsteröd has no fixed public-transport stop; Broan/Västersjön serve the Lysevatten side, Gränsen is distant/non-official for the north end, and Lilla Edet Närtrafik is pre-booked rural access.
- Recheck Västtrafik line 333/332 schedules after 2026-06-14 plus Lilla Edet storm-felled-tree warnings and fire-risk/fire-ban status before publication.

Stage 11 key caveats:

- Use official WST/Hoodin GPX/API or matching Naturkartan GPX as primary geometry after de-duplicating repeated coordinates; OSM relation 125010 starts about 723 m north of the official Håsteröd endpoint and should be validation/context only.
- Preserve the modern route/currentness issue: current WST/Naturkartan geometry is about 22.276 km and recent 2024-2025 reports describe a changed Vassbovik/Ivarsbosjön finish with 6-8 km of gravel/road walking and clear-cut exposure; older 15-18 km route-app values are stale.
- Bredfjället and Bredfjället östra reserve rules affect Stage 11; no fires, no tenting/camping, dogs leashed/no unleashed dogs, no riding, and no motor vehicles on relevant subsegments.
- Store Väktor shelter is importable, but its fire/grill metadata conflicts with Bredfjället no-fire rules; suppress as usable fire facility unless official local signage or manager guidance confirms an exception.
- Vargfjället water/toilet/shower is a private/conditional service point with voluntary contribution/contact-owner caveats; the OSM-only old spring should remain pending and treated/filter/verify only.
- Håsteröd and Vassbovik have no fixed endpoint bus stops; practical endpoint access is pre-booked Närtrafik at Högen 141 and Vassbo, while Gränsen/Råane bro/Underås are distant fixed-route alternatives.
- Stage 11 intersects Köperödssjöarna water protection area; do not mark natural water potable and avoid contamination/washing/waste/toileting near watercourses and lakes.

Stage 12 key caveats:

- Use official WST/Hoodin GPX/API or exact matching Naturkartan geometry as primary after de-duplicating repeated coordinates; OSM relation 124985 strongly corroborates but should remain QA/context.
- Preserve the Glimmingen motorstadion warning: Naturkartan says the route no longer goes through the motorstadion, follows outside edges, and crosses motor tracks that may also be orange-marked.
- Stenshult is the main importable facility cluster, with WST shelter plus water/toilet and OSM fire/bench corroboration, but WST and OSM shelter coordinates differ by about 130 m and need clustering/coordinate review.
- Do not import Stenshult firepit as guaranteed usable fire; keep it pending/restricted until current fire-ban status and local signage/manager guidance are checked.
- Vassbovik has no practical fixed-route stop within about 5 km; model it as weak access with taxi/drop-off/Närtrafik check-ahead, while Glimmingen has fixed Västtrafik stops within about 70-100 m.
- Stage 12 intersects Köperödssjöarna water protection area for roughly 9.3 km from around km 2.86 to Glimmingen; Bäveån Nedre and Högalidsberget are nearby context, not Stage 12 route restrictions.
- No official campsite/rest-place, endpoint accommodation, official parking, food/drink service, bathing place, or on-route shop was found for Stage 12.

Stage 13 key caveats:

- Use official WST/Hoodin GPX/API or exact matching Naturkartan geometry as primary after de-duplicating repeated coordinates; OSM relation 1899756 is continuous but QA-only because it diverges locally by about 120 m near Bjursjön.
- Preserve the endpoint-access distinction: Glimmingen has strong fixed Västtrafik bus access, while Bjursjön is parking-focused; Kopperöds viadukt is a distant fixed-route approach about 2.1 km away, not endpoint service.
- Skalbanksmuseet/Kuröd is the strongest mid-stage transit and service access, but museum toilet/tap-water availability is opening-dependent and the operator page says the museum opens again June 2026.
- Köperödssjön shelter is importable as a shelter/overnight wind shelter with an off-route spur and unknown water quality; do not import it as a formal campsite.
- Do not model Stage 13 as generally tent-friendly: Bäveån nedre bans tents/caravans and Kuröds skalbankar bans camping.
- Add protected-area and water-protection rule context for Bäveån nedre, Kuröds skalbankar, and Köperödssjöarna; final normalization should assign exact subsegments/subzones by GIS overlay.
- Bjursjöstugan/Bjursjön has useful endpoint facilities, but water/toilet/cafe and bathing-place details are seasonal or opening/currentness dependent; live-check before publication.
- Retain currentness cautions for wet/slippery conditions, wayfinding around the Bjursjön trail network, and 2026 Uddevalla forestry work at Kuröd and Glimmingen/Inskogen.

Stage 14 key caveats:

- Use official WST/Hoodin GPX/API or matching Naturkartan GPX as primary after de-duplicating triplicated coordinates; Naturkartan API is simplified and OSM relation 4490199 is QA-only because its Metsjö junction is about 205 m beyond the official endpoint.
- Preserve WST's endpoint access warning: neither Bjursjön nor Metsjö has endpoint public transport. Bjursjön and Metsjön are parking/taxi oriented; Lillmossegatan/Dalaberg are walk-in start approaches and Skredsvik/Högstorp are distant taxi-transfer context for Metsjö.
- Ålslån, Hällerstugan, Kåtan Västra Krokevattnet, Krokestugan, and Metsjön form the main facility spine. Alias WST Åleslån to Ålslån and treat Hällerstugan/Hällestugan spelling variants as one facility unless later local sources distinguish them.
- Water at Bjursjön/Bjursjöstugan, Ålslån, and Hällerstugan is conditional or verify-on-site; do not mark any as guaranteed potable without current confirmation.
- Stage 14 overlaps Köperödssjöarna water protection area for much of the stage, then Herrestadsfjället II and Herrestadsfjället reserves near the end; final normalization should assign exact subsegments with GIS line-buffer overlay.
- Do not present Stage 14 as generally tent-friendly. WST campsite category returned no items, and reserve rules constrain fire, campers/vehicles, dogs, boats, and organized camp activities.
- Fire/grill records at Ålslån, Hällerstugan, Kåtan, Krokestugan, and Metsjön must be restricted to manager-designated places and live fire-ban/local-signage checks.
- Retain wet/muddy/slick-boardwalk currentness caveats around Havskuren/boardwalk areas and live-check Friluftsfrämjandet/Uddevalla maintenance, cabin access, and fire-risk notices before publication.

Stage 15 key caveats:

- Use official WST/Hoodin GPX/API or exact matching Naturkartan GPX as primary after de-duplicating repeated coordinates; OSM relation 4489940 is QA-only because its Metsjö start is about 204.5 m from the official endpoint.
- Preserve the main currentness flag: the bridge in Strömmarna must not be used and hikers should use the hand-pulled raft over Munkedalsälven; raft operation is water-level/ice/maintenance dependent and must be live-checked.
- Model the Kaserna bridge/reconstruction notice separately from the Strömmarna bridge/raft issue; both can affect endpoint or route access.
- Stage 15 access is asymmetric: Metsjö is car/taxi-first with no practical scheduled transit, while Kaserna has workable walk-in bus/train access through Pumpbron, Stenbron and Munkedal station. Hattefjälls bro is the strongest mid-stage bus bailout, but exact-date rural timetable checks are required.
- Main importable facility records include Metsjön, Pölevattnets rastplats, Kärrevattnet/Övre Trästickeln/Viksjön shelters, Modalenstugan, Lyan, Transportflotte, Strömmarna grill/parking and Kaserna/Kanotcentralen. Cluster Strömmarna fire coordinates and keep Transportflotte as crossing/status metadata rather than ordinary amenity if possible.
- Water is weak: WST dricksvatten returned no Stage 15 places; Kaserna water is only when the canoe centre is staffed, Modalen water is natural/untreated, and shelter-area water candidates should not be imported as potable.
- Stage 15 intersects Herrestadsfjället, Vågsäter and Strömmarna nature reserves; final normalization should assign exact rule subsegments with GIS line-buffer overlay. No direct Natura 2000, water-protection or access-ban crossing was found in the GPX point screen.
- Do not present Stage 15 as generally tent-friendly. Vågsäter bans camping, Strömmarna limits tenting outside prepared campsites, and no official stage campsite category was found.
- Fire rules are segment-specific: Herrestadsfjället designated places only, Vågsäter no fires, Strömmarna prepared fire sites only, plus live fire-ban checks.
- Retain recent currentness caveats for muddy/overgrown/obstruction reports on the Viksjön/Kaserna part, Viksjön toilet condition, steep/technical Strömmarna terrain and stale route-app staging.

Stage 16 key caveats:

- Use official WST/Hoodin GPX/API or matching Naturkartan GPX as primary after de-duplicating repeated coordinates, but classify it as planning-grade/near-navigation-grade rather than dense navigation-grade: 633 raw points, 211 unique points, computed about 5.976 km, with long spans up to about 195 m.
- Treat Kaserna - Borgmästarbruket as canonical. WST body text and Naturkartan URL contain Kaserna-Harska wording, but WST title/API/GPX, Munkedal, OSM and adjacent-stage continuity support Borgmästarbruket as the Stage 16 endpoint.
- Preserve spelling variants for matching: WST uses Borgmästarbruket, OSM uses Borgmästarebruket, and a municipal typo appears as Bogmästarbruket.
- Reconcile Kaserna bridge status before import: WST still surfaces yearless bridge-closure/reconstruction text, while Munkedal notices say the 2025 road-bridge closure reopened on 2025-11-28.
- Stage 16 access is stronger than Stage 15: Kaserna has parking/Hembygdsgården/canoe-centre context, Stenbron/Pumpbron serve the start side on bus 835, and Smedbergskrysset serves Borgmästarbruket on bus 836. Exact-date Västtrafik and Bohusbanan replacement-bus checks are required.
- Main facilities are Kaserna/Kanotcentralen, Brålandsfallet, Borgmästarbruket and its parking/boards, plus nearby Brålands Gård, Munkedals Herrgård/Gamla Bruket and Fura/pond OSM-only picnic/shelter/fire candidates. Keep town services off-route unless the import model supports them.
- Water is conditional only: Kaserna water when the canoe centre is staffed, Brålands Gård water as commercial/seasonal nearby service, and river water untreated. Do not import free always-available potable water.
- Camping is not an official free stage campsite; Brålands Gård is commercial nearby camping/lodging. Do not apply Harska/Södra Harska camping rules to the official Stage 16 line unless geometry extends past Borgmästarbruket.
- Stage 16 likely intersects Örekilsälven nature reserve/Natura 2000 SE0520163 based on official text; final normalization needs GIS line/polygon overlay for exact subsegments. Dogs must not be loose, fishing requires permits, and biotope-restoration work from 2025 can affect water clarity/local access.
- Fire status needs live checks with Krisinformation/Fyrbodal/Munkedal; OSM firepits should stay pending or carry prepared-site/local-signage caveats.
- Retain currentness caveats for wet/muddy conditions around Brålandsfallet/Borgmästarbruket, Kaserna toilet/parking service conflicts, and route-app wrong-direction/Harska naming issues.

Stage 17 key caveats:

- Correct the overview seed: Stage 17 is officially Borgmästarbruket to Kyrkoryr. Harska is an intermediate area, and Svarteborg/Dingle records are distant off-route or access context.
- Use official WST/Hoodin GPX/API or exact matching Naturkartan GPX as primary after de-duplicating repeated coordinates: 1189 raw points, 407 unique points, computed about 11.292 km, zero official gaps to Stages 16 and 18. GPX elevation values are unusable zeroes.
- OSM relation 4492787 corroborates the route but has a small apparent member-order gap near the start and uses Borgmästarebruket spelling; use WST Borgmästarbruket as canonical and preserve variants for matching.
- Treat third-party route apps as stale-risk: AllTrails users reported wrong directions/route mismatch after the reroute, and Pacer mistranslates Kyrkoryr as "Church choir".
- Stage 17 access is asymmetric: Smedbergskrysset on bus 836 and Borgmästarbruket parking are strong start access, while Kyrkoryr has weak endpoint transit via Hagaskog or Svarteborg östra on line 834, both requiring multi-kilometer road connectors or pickup.
- Main facilities are Borgmästarbruket/parking/boards, Torps herrgård, Harska/Södra Harska reserve, Etapptavla Harska, Vindskydd Harska/Harskabukten, Harska spring, and Kyrkoryr endpoint map. Suppress distant Svarteborg/Dingle services from core Stage 17 unless modeled as off-route access/resupply.
- No confirmed potable water: WST dricksvatten returned zero, the Harska spring is natural/unconfirmed, and Harskabukten lake water is untreated.
- No official campsite or accommodation: WST campsite/accommodation evidence is absent, Harska shelter should not imply tenting, and Södra Harska prohibits camping.
- Suppress or keep pending the OSM Harska firepit because Södra Harska reserve rules prohibit fires; do not expose it as usable unless a legal designated-site exception is verified.
- Södra Harska rules are high-confidence: no picking/digging plants, no loose dogs, no camping, no fires. Final normalization needs GIS line/polygon overlay for exact subsegments and for Kärnsjön/Örekilsälven water/Natura context.
- Retain currentness caveats for no Stage 17-specific closure found, adjacent Strömmarna/Stage 15 closure context for linked hikes, and wet/slippery forest/lakeside sections around Harska after rain.

Stage 18 key caveats:

- Use current official Stage 18 identity: Kyrkoryr to Kynnefjälls natur, 10 km, WST Blue/medium, 3-4 h. Do not use legacy Svarteborg-Lunden endpoints, Bredmossen/Lunden geometry, or stale third-party route traces.
- Naturkartan and some route apps still carry stale Svarteborg-Lunden slugs/titles, but Naturkartan's current title and GPX match WST. WST/Naturkartan are canonical; treat AllTrails/Pacer/Wikiloc/Vandringstjejen as currentness or stale-risk context only.
- Use official WST/Hoodin GPX/API or exact matching Naturkartan GPX as primary after de-duplicating repeated coordinates: 1695 raw points, 565 unique points, computed about 9.992 km, zero official gaps to Stages 17 and 19. GPX elevation values are zero or missing.
- Classify Stage 18 geometry as planning-grade rather than clean navigation-grade: WST/Naturkartan have triplicated points, sparse spans up to about 200 m, and OSM relation 4492797 shares continuity but places the Kynnefjälls natur endpoint about 60 m from the official WST endpoint.
- Preserve the Kynnefjälls natur endpoint QA issue. Use WST [58.618192, 11.690120] for now, but keep OSM/facility cluster [58.618528, 11.689299] / KynnefjällsNatur geocode nearby as a signage/snap check before import.
- Stage 18 access is asymmetric: Kyrkoryr has no confirmed official transit or public parking and should be modeled as road-access-only, while Bråmarkenvägen on Västtrafik line 834 is the official end access but has very sparse weekday service. Skrapeland/Grinås/Gunghult/Hagaskog are sparse line 834 bailout candidates only.
- Importable or useful records include Kyrkoryr map, Skrapeland, Kärnsjön picnic/view, Bråmarkenvägen, KynnefjällsNatur service node, KynnefjällsNatur map board, and customer-parking metadata. Keep OSM-only firepits pending.
- Suppress off-route WST/place-feed artifacts for core Stage 18: Bredmossen, Gadderöd, Etapptavla Svarteborg, Svarteborgs kyrka, Svarteborg toilet/water, Wauglen, and the shelter/toilet north of KynnefjällsNatur unless the app later supports off-route access/service metadata.
- Water is conditional only: KynnefjällsNatur water/toilet/service likely depends on customer/staffed access, and Kärnsjön is protected surface water, not a potable source. No public natural water/tap was found along the stage.
- No on-route public campsite or shelter was found. KynnefjällsNatur is commercial/private accommodation and should not be modeled as wild camping.
- Kynnefjäll reserve/Natura rules and Kärnsjön water-protection sensitivity matter near the endpoint, but final normalization must assign exact subsegments by GIS overlay. Kynnefjäll reserve allows fires and tents only at manager-designated places; Sätret rules may be stricter.
- Retain 2026 currentness warnings for planned Kynnefjäll nature-conservation burns, Västkuststiftelsen windfall notices, dynamic fire bans, and the 2026-04-11 AllTrails report noting a lot of asphalt and hard parking.

Stage 19 key caveats:

- Use current official Stage 19 identity: Kynnefjälls natur to Vaktarekullen, 16 km, WST Blue/medium, 5-6 h. Treat Lunden - Vaktarekullen as a legacy alias only, even though it remains in WST English prose, Naturkartan slug/GPX filename, OSM wiki, and older route-app/blog sources.
- Use official WST/Hoodin GPX/API or exact matching Naturkartan GPX/API as primary after de-duplicating repeated coordinates: 2109 raw points, 703 unique points, computed about 16.376 km, zero official gaps to Stages 18 and 20. GPX elevation values are unusable zeroes/missing.
- Stage 19 geometry is navigation-grade after de-duplication, but preserve the Kynnefjälls natur start QA issue: OSM's shared Stage 18/19 endpoint is about 60 m from the official WST endpoint near the KynnefjällsNatur facility/junction.
- Stage 19 is the first Kynnefjäll wilderness stage in WST's wording: sparse roads, sparse public transport, no near-trail resupply, and remote plateau conditions. Add conservative access/safety copy.
- Access is asymmetric: Bråmarkenvägen line 834 and KynnefjällsNatur road access serve the start, but Vaktarekullen itself is not road/transit accessible. Kasebo parking is the strongest north-side road connector and should be modeled as connector/access metadata, not as the official endpoint.
- Main importable facilities are KynnefjällsNatur, Äntervattnet shelter/toilet/fireplace, Påsholk Äntervattnet, Säveleken shelter/fireplace, Vaktarekullen overnight cabin, Vaktarekullen dry toilet, Vaktarekullen fire/viewpoint, and Vaktarekullen spring. Keep Sågen, unnamed picnic site, and OSM-only early shelter/toilet pending.
- Reconcile Säveleken shelter coordinates before final import: WST and OSM differ by about 120 m. Vaktarekullen cabin coordinates are best aligned between Naturkartan/OSM; WST is nearby.
- Suppress or model only as detour/access/connector metadata: Bredmossen, Etapptavla Lunden, Minnesstenen/Vaktarestugan, Kasebo, Rastplats Kasebo, Lilla Holmevatten shelter, and Stora Holmevatten shelter. Do not import them as on-route Stage 19 core facilities without connector modeling.
- Water is not potable as-is. KynnefjällsNatur water is access/staffing dependent; Vaktarekullen spring is official but should be boiled/treated and verified; no official potable water was found at Äntervattnet, Säveleken, Kasebo, or Stora Holmevatten.
- Kynnefjäll reserve rules are strict: fires and tents only at manager-designated places, no motor vehicles, boats/canoes only on designated waters, and plant/moss/lichen restrictions. Final normalization must assign Kynnefjäll A/B/Sätret, Natura 2000, Bredmossen adjacency, and possible water-protection subsegments by GIS overlay.
- Stora Holmevatten has sensitive birdlife warnings; do not encourage resting/picnicking near nests or shoreline disturbance, especially spring/summer.
- Retain 2026 currentness warnings for planned Kynnefjäll nature-conservation burns affecting Stages 19-20, short-notice closures/reroutes, months-long post-burn falling-tree risk, Västkuststiftelsen windthrow notices, dynamic fire bans, wet/boggy terrain, and winter wayfinding difficulty.

Stage 20 key caveats:

- Use current official Stage 20 identity: Vaktarekullen to Flötemarksön, 12 km, WST Blue/medium, 5 h. Treat Holmen and Flötemarksön (Holmen) as legacy/alias context only; do not use old Vaktarekullen-Holmen 17.3-17.5 km route-app tracks.
- Use official WST/Hoodin GPX/API or exact matching Naturkartan GPX as primary after de-duplicating repeated coordinates: 1119 raw points, 373 unique points, computed about 11.869 km, zero official gaps to Stages 19 and 21. GPX elevation values are unusable zeroes.
- OSM relation 4492886 corroborates the current route and endpoints, but computes about 12.568 km and is more detailed/longer than WST. Use OSM as QA/corroboration, not as primary geometry unless a later normalization pass explicitly chooses to snap/augment the centerline.
- Preserve spelling variants for matching: Vaktarekullen is canonical, Vaktarkullen appears as an official prose typo, Vaktarstugan is a facility alias, and the official GPX filename's `flotemarkssjon` should not become a place name.
- Access is remote: neither Vaktarekullen nor Flötemarksön is directly reachable by public transport. Kasebo is the strongest start-side connector, Mickelskogen is a longer alternative, and Flötemarksön has road pickup/drop-off with very limited bridge parking.
- Reconcile Kasebo access/parking coordinates before import. Access and facilities lanes found conflicting approximate Kasebo points, while the access role itself is high-confidence.
- Main importable facilities are Vaktarekullen open cabin/toilet/fire/water, Stora Holmevatten shelter/fire/view detour, Sjökärrssjön shelter/toilet/fire, Påsholk Sjökärrssjön, Götbergshagen rest shelter, and Flötemarksön endpoint map. Keep OSM-only Sälesjön viewpoint and unnamed Flötemarksön firepit pending.
- Suppress or model only as access/private-service metadata: Kasebo, Rastplats Kasebo/Lilla Holmevatten, Mickelskogen, Flötemarksön bridge parking, Flötemarkens Vildmarkscamp, Viking Republic/Hinterland camp, Roslund shelter, Tingvall B&B, Lilla Holmevatten, and Säveleken.
- Water is weak: WST Stage 20 returned no `dricksvatten` entries. Vaktarekullen spring/well should be boiled/treated and verified; lake/natural water near Stora Holmevatten and Sjökärrssjön is not potable as-is.
- Kynnefjäll reserve rules are strict and subarea-specific: fires and tents only at manager-designated places, with Kynnefjäll-Sätret stricter on fire. Final normalization must assign Kynnefjäll A/B/Sätret and Natura 2000 subsegments by GIS overlay.
- Stora Holmevatten has sensitive birdlife and fishing restrictions; avoid encouraging shoreline disturbance or informal camping/resting near nesting areas.
- Retain 2026 currentness warnings for planned Kynnefjäll nature-conservation burns affecting Stages 19-20, short-notice closures/reroutes, months-long post-burn falling-tree risk, Västkuststiftelsen windthrow notices, dynamic fire bans, old-burn/regrowth route visibility, and remote plateau/winter wayfinding difficulty.
- Carry the Stage 21 warning forward: official/OSM Stage 21 linework appears partial relative to stated 14 km, and official text says it is not continuously marked. Do not merge Stage 20 with Stage 21 or stitch beyond Flötemarksön.

Stage 21 key caveats:

- Use current official Stage 21 identity: Flötemarksön to Porsås, 14 km, WST Red/hard, 5-6 h. Preserve the official metadata, but do not treat the available GPX/API geometry as the full stage.
- Stage 21 is not ready for normal route import. WST/Hoodin GPX/API, Naturkartan GPX/API, and OSM relation 4493075 all cover only about 4.4 km from Flötemarksön to the Holmen/O 964 area, while the official stage remains 14 km to Porsås.
- The official WST text says this is not a continuous marked stage. Flötemarksön to Holmen bridge is marked, road 164 to Porsås is marked, and Holmen bridge to road 164 requires self-navigation with map and compass.
- Use the Stage 21 GPX endpoint `[58.810347, 11.692371]` only as the mapped partial-line/Holmen handoff. Do not call it Porsås. Porsås/Stage 22 context is around `[58.848690, 11.683167]`, with WST Porsås information board `[58.848724, 11.683316]` and parking `[58.848521, 11.679744]`.
- Preserve the 4.296 km straight-line gap from the Stage 21 GPX end to the Stage 22 start as a blocking geometry issue. Do not bridge, snap, or straight-line the gap without authoritative geometry or an explicit partial-route/self-navigation model.
- Current fixed transit is weak: no direct fixed Västtrafik stop was found for Flötemarksön, Flötemarken, Porsås, Loviseholm, Norane, or Nornäs. WST's Loviseholm bus note is stale/unverified and needs direct Västtrafik/GTFS confirmation.
- Practical access is road drop-off/pickup at Flötemarksön, Holmen/O 964, road 164/Loviseholm area, or Porsås/Stage 22 access where roads permit; Tanum or Dals-Ed Närtrafik/taxi may be needed.
- Facility handling must separate mapped first-segment records from Porsås/Stage 22 context. Importable/pending candidates include Flötemarksön trailhead map, Roslund shelter/toilet/fire/rest cluster, Flötemarkens private camp/service, Viking Republic duplicate/private-service check, Porsås information/parking, and Loviseholm access pending verification.
- Suppress Daletjärnen as an overnight shelter unless fresh evidence shows it is usable; current facility evidence says it is ruined. Nornäs shelter belongs to Stage 22/route-planning context, not Stage 21 core import.
- No official public potable-water source was found. Flötemarkens Vildmarkscamp water is private/customer/check-ahead; Roslund/natural water is untreated.
- Add Kynne älv Natura/bird-protection seasonal access review near the mapped start. Resolve whether access restrictions affect the road/trail bridge or only water/shore/boat traffic, and reconcile 15 June versus 15 July restriction dates before rule import.
- Because Stage 21 requires self-navigation, include Bredmossen Fiskelössjön as an off-route safety/rules risk: no public entry 1 April-30 June, no camping, no fire, and no unleashed dogs. Do not route variants through it.

Stage 22 key caveats:

- Use current official Stage 22 identity: Porsås to Nornäs, 7 km, WST Blue/medium, 3 h. Naturkartan lists 6.9 km; computed WST/Naturkartan GPX length is about 6.922 km.
- Use official WST/Hoodin GPX or exact matching Naturkartan GPX as primary geometry after de-duplicating consecutive duplicate coordinates: 1182 raw points, about 394 effective vertices, exact start `[58.848690, 11.683167]`, exact end `[58.888056, 11.668606]`, and exact join to Stage 23.
- OSM relation 4493088 corroborates Stage 22 but should remain planning-grade/QA only. OSM Stage 23 has a member-order jump and should not be used for chaining without repair.
- Do not modify Stage 22 geometry to solve the Stage 21 problem. Preserve the 4.296 km gap from the Stage 21 GPX end near Holmen to the Stage 22 Porsås start as a Stage 21 self-navigation/full-geometry issue.
- Access is weak: no direct fixed Västtrafik stop was confirmed for Porsås, Loviseholm, Nornäs, Norane, or Dals Högen. Treat WST's Loviseholm bus note as stale/unverified until a live Västtrafik/GTFS check confirms it.
- For Nornäs car access, carry the Swedish WST private-road warning: respect signs from road 166 and use the Norane/road 166 approach where appropriate; exact parking/walking route still needs verification.
- Main importable facilities are Porsås information board, Porsås small parking, and the Nornäs shelter/fire/toilet/info/waste/swim cluster. Porsås historic cairn is attraction-scope dependent; DANO 1 Lövön Mellan is off-route/pending.
- No official public potable water was found. Nornäs has shelter, toilet, trash/swim/lake context, but lake/surface water should be treated and must not be imported as drinking water.
- Rules/safety pass found no confirmed protected-area, Natura 2000, or water-protection restriction intersecting the official Stage 22 GPX. Keep Noraneälven as nearby context only and live-check fire bans/deviations before publication.

Stage 23 key caveats:

- Use current official Stage 23 identity: Nornäs to Vassbotten, 13 km, WST hard/red, 5-6 h. Naturkartan lists 13.5 km/360 min/red and its API links to Dals-Ed, while WST attributes the stage to Tanum; keep WST canonical and preserve the contradiction.
- Use official WST/Hoodin GPX or exact matching WST API/Naturkartan GPX as primary geometry after de-duplicating consecutive duplicate coordinates: 1650 raw points, 550 effective vertices, computed about 13.463 km, exact start `[58.888056, 11.668606]`, exact end `[58.875212, 11.533793]`, and exact joins to Stages 22 and 24.
- OSM relation 4493102 is useful QA/currentness context, but do not import it as primary geometry. Naive OSM way concatenation creates a false 1.686 km jump unless relation way orientation is solved.
- Access remains weak at Nornäs: no confirmed fixed transit, and the Swedish WST private-road warning from road 166/Norane must be carried forward. Vassbotten has a stop page/GTFS point, but line 952 currently has no timetable.
- Practical access fallbacks include Holkekärr on Västtrafik line 883 and Holtet in Norway on Østfold line 302. Holtet/cross-border access needs Norwegian-side rule and ticketing verification before app recommendations.
- Main importable facilities are the Nornäs shelter/fire/toilet/info/waste/swim cluster and Älgafallet/Elgåfossen waterfall. Älgafallet Swedish parking, Enningsdalen rest area, Bullarebygdens camping/services, Jill's Diner, Högens gård and DANO Lövön need access/off-route/commercial scoping.
- No official public potable water was found. Do not import Nornäs lake water, Bullarebygdens customer taps, Enningsdalen water, or natural streams/lakes as public drinking water.
- Field reports support active/open use but retain hard/hilly, brush/overgrowth, and Älgafallet seasonal water-flow caveats. Outdooractive uses stale Stage 17 numbering and should not provide current numbering/difficulty.
- Rules/safety pass found no confirmed direct protected-area, Natura 2000, water-protection or access-ban intersection. Run final GIS overlay before public warnings, and do not attach Kynnefjäll reserve/burn/windfall context to Stage 23 without proof.
- Keep currentness warnings for unmarked navigation, private forest/hunting/forestry activity, fire-ban live checks, and possible stale geometry until Tanum/WST publish a coherent full route.

Stage 24 key caveats:

- Use current official Stage 24 identity: Vassbotten to Håvedalen, 19 km, WST hard/red, 7-8 h. Naturkartan lists 19.1 km/480 min/red; Västsverige has a minor `Vasbotten` spelling variant, but `Vassbotten` is canonical.
- Use official WST/Hoodin GPX/API, Naturkartan GPX, or Västsverige KMZ as primary geometry after de-duplicating repeated coordinates: 2748 raw WST points, 916 effective vertices, computed about 19.113 km, exact start `[58.875212, 11.533793]`, exact end `[58.939741, 11.426410]`, and exact joins to Stages 23 and 25.
- OSM relation 4487796 is QA/context only. It has endpoint mismatches, excursion members, a duplicate excursion way and computes about 20.061 km, so do not use it as the main route geometry.
- Access is sparse. Vassbotten stop is essentially at the start but line 952 had no current timetable; Holtet in Norway, Holkekärr and Hovsäter are fallback approaches. Allemarksvägen is the best north endpoint stop on Västtrafik line 893, with Håvedalen/Stora Åseröd/Håve as additional sparse bailouts.
- Main importable facilities are Rastplats Eigdesjön, Snarsmon cultural/information site, the Ekelidsvattnet detour rest/rock-shelter/fireplace, Tolvmanstegen map boards if in scope, and the Allemarken/Håvedalen shelter/toilet/fire/waste cluster. Eigde and Älgafallet parking, Älgafallet cluster, Bullarebygdens and Villa chez KoS should be access/off-route/commercial metadata rather than core on-route facilities.
- No reliable public potable water was found. Do not import Bullarebygdens/customer taps, lakes or streams as public drinking water, and retain the WST remote-stage warning to carry enough provisions.
- Rules/safety pass found no confirmed direct protected-area, Natura 2000, water-protection or bird-access restriction intersecting the official GPX. Do not attach nearby Bredmossen/Fiskelössjön, Flåghult or Bolsjöarna/Nedre Bolsjön rules without GIS proof.
- Retain currentness warnings for five Skogsstyrelsen forestry-notification polygons near km 2.2, 2.6, 16.37 and 16.54. These are not official Bohusleden closures, but can mean machinery, changed surfaces, signs or temporary local routing.
- Recheck WST/Naturkartan live status, Skogsstyrelsen forestry notifications, Västtrafik/Entur timetables, and Tanum/Strömstad fire bans before public import.

Stage 25 key caveats:

- Use current official Stage 25 identity: Håvedalen to Krokstrand, 11 km, WST hard/red, 3-4 h. Naturkartan/Pacer/OSM slugs may use `Krogstrand`; keep `Krokstrand` canonical and use `Krogstrand` only as a search/stale-spelling caveat.
- Use official WST/Hoodin GPX/API or identical Naturkartan GPX/API as primary geometry after de-duplicating repeated coordinates: 1812 raw points, 604 effective vertices, computed about 10.880 km, exact start `[58.939741, 11.426410]`, exact end `[59.006333, 11.422291]`, and exact joins to Stages 24 and 26.
- Do not use Västsverige KMZ or OSM relation 4487258 as primary geometry. The KMZ is reverse/partial/stale and misses about 651 m of the official Håvedalen start approach; OSM starts about 652.6 m from the official start and ends about 106.8 m from the official end.
- Access is comparatively strong for the northern Bohusleden but still sparse: Allemarksvägen is essentially at the official start, Björneröd is closest to the official end, and Krokstrand/Björnerödsgården/Skog are alternatives. Recheck line 893 and related Västtrafik service live, especially after the 2026-06-15 timetable change.
- Main importable facilities are Vindskydd Sandvatten, Utsikt Idefjorden, Grillplats Krokstrand, and Krokstrand/Björneröd endpoint parking. OSM picnic tables and guideposts are pending/scope-dependent; Allemarken, Villa chez KoS, Björnerödspiggen, Bakke Camping and Stenhoggern are off-route/commercial/pending context.
- No reliable public potable water was found. Do not import Sandvatten lake/shelter barrels, shelter water, lakes, streams or Idefjorden as drinking water. Retain dry-period water-scarcity and filter/treat-water warnings.
- Field reports support passability but add a caution near the Idefjorden/Sandviken descent: May 2024 reports noted mud, fallen trees and a steep awkward passage that may be worse when wet.
- Rules/safety pass found no confirmed direct protected-area, Natura 2000, water-protection, reserve-access or forestry-notice intersection. Keep nearby Flåghult/Näsinge water protection and adjacent Skogsstyrelsen A 40652-2024 as context/cautions only, not route restrictions.
- Krokstrand food/service availability is not guaranteed; do not present Stenhoggern, Folkets Hus or other village services as open without current verification.

Stage 26 key caveats:

- Use current official Stage 26 identity: Krokstrand to Högstad, 13 km, WST hard/red, 5-6 h. Preserve typos/stale variants only as caveats: WST body has `Krokstand`, Naturkartan/OSM may use `Krogstrand`, and Lagunen reverses direction as Nedre Högstad-Krokstrand.
- Use official WST/Hoodin GPX/API as primary geometry after de-duplicating repeated coordinates: 1893 raw points, 630 effective vertices, computed about 13.293 km, exact start `[59.006333, 11.422291]`, exact end `[58.951745, 11.302371]`, and exact joins to Stages 25 and 27.
- Treat Naturkartan, Västsverige KML/KMZ, OSM relation 4486898 and Äventyrligare as QA/planning only. OSM is continuous but starts about 106.8 m from the official start; Västsverige/Visit Strömstad also has stale 17 km/medium/4-5 h facts.
- The official name says Krokstrand, but the current WST 13 km line starts near Björneröd/Björnerödspiggen parking rather than Krokstrand village center. Model Krokstrand village bus/parking/grill/service records as off-route access context, not core Stage 26 facilities.
- Main importable facilities are Björnerödspiggen shelter/fire/view tower, Björnerödspiggen parking/access, Högstad end board, Påsholk Högstad, and Massleberg/Jörlov rock carvings. Reconcile Björnerödspiggen shelter coordinates before import; WST is about 144 m from route while OSM/Vindskyddskartan/Grillplatser are about 11 m from route.
- OSM-only pit toilets near the route are pending because source tags include fixme/duplicate concerns. Do not import without verification.
- No reliable public potable water was found. Do not import Björnerödspiggen water barrel/rainwater, shelter water, streams, private wells, or commercial/customer water as drinking water.
- Access is possible but sparse: Björneröd is closest to the current start, Högstad is about 0.5 km from the end, and line 893 is the main bus thread. Check Västtrafik live, prebooking requirements, Närtrafik eligibility, and the 2026-06-15 timetable change before publication.
- Rules/safety pass found no direct protected-area, Natura 2000, Ramsar, water-protection, forestry-notice, or WST deviation intersection. Still run final GIS overlay and live fire/status checks before public import.

Stage 27 key caveats:

- Use current official Stage 27 identity: Högstad to Strömstad, 15 km, WST medium/blue, 5 h. Västsverige/PDF also confirm 15 km/medium, but Västsverige gives approximately 4-5 h.
- Use official WST/Hoodin GPX/API as primary geometry after de-duplicating repeated coordinates: 1983 raw points, 661 effective vertices, computed about 14.935 km, exact start `[58.951745, 11.302371]`, exact end `[58.937119, 11.174108]`, and exact join from Stage 26.
- Preserve the WST GPX filename caveat: `Etapp27_Krokstrand_stromstad.gpx` is stale/misleading, but the current stage identity and geometry are Högstad-Strömstad.
- Naturkartan site 21746 is a high-quality simplified match with exact endpoints and about 14.931 km computed length. Strömstad municipality ArcGIS is official municipal corroboration. OSM relation 1695270 is useful QA, but exclude its duplicated `role=excursion` side spur from main geometry.
- Do not use the Västsverige/Google My Maps KMZ as route geometry. It covers only about 10.009 km, starts about 5.304 km into the official WST route, and ends about 292 m from the WST endpoint.
- Access is strong at Strömstad and rural at Högstad: Högstad bus stop is about 529 m from the official start on Västtrafik line 893, while Strömstad station is about 59 m from the official end with train/bus service. Recheck Västtrafik line 893/963, Västtågen, and Närtrafik eligibility before publication.
- Main importable facilities are Etapptavla Högstad, the Rogstad/Hillern shelter-fire-viewpoint cluster, Informationstavla Ekemyr, and selected Strömstad endpoint services such as the Koster waiting-hall toilet. Keep most Strömstad shops/lodging/bathhouse/harbour records as endpoint access metadata, not core route facilities.
- No reliable on-route public potable water was found. Suppress Rogstad rainwater barrel as drinking water, and keep Strömstad endpoint taps/harbour water pending or access metadata until season/current public access is verified.
- No official free trail campsite was found. Rogstad/Hillern is a shelter/rest cluster; Strömstads Camping/First Camp City is commercial endpoint lodging/camping.
- Rules/safety pass found no direct protected-area, Natura 2000, water-protection, animal/plant-protection, cultural-reserve, or WST deviation intersection. Still run final GIS overlay and live status checks before import.
- Retain currentness warnings for Skogsstyrelsen forestry notification `A 60768-2022` near Högstad. Treat it as a field/currentness caution only, not a closure, unless WST/field/local sources confirm active impact.
- Recheck WST/Naturkartan live status, Strömstad/Krisinformation fire bans, Västtrafik timetables, endpoint water/toilet seasonality, and Strömstad summer parking/access conditions before public import.
