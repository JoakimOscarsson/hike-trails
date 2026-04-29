# Upplandsleden Pending And Suppression Promotion Review

Created: 2026-04-29

Purpose: Work through `pending` and `suppressions` rows one by one before moving anything into normal `importRows`. This is a decision ledger, not an import file.

Decision labels:

- `promote`: enough evidence to become a normal visible facility.
- `promote_branch_scoped`: enough evidence, but only for a branch/loop/alternate geometry scope.
- `keep_pending`: plausible facility, but missing coordinate, access rule, source strength, or currentness.
- `fold_into_existing`: do not make a separate marker; add caveat/detail to an already normal facility.
- `keep_suppressed`: not a public trail facility, not stable enough, or belongs in access/rules/route metadata.

## User Decisions

- Treat Upplandsleden as one trail system, even with the Sigtuna-Forsbyån discontinuity. Model the gap as a known long-standing discontinuity/rule warning inside the system, not as a separate trail and not as a temporary closure.
- Include all loops/slingor in the first import. Branch-only facilities can be promoted when they are attached to the correct loop/route-group scope.
- Treat parking and transit the same as the existing trails: import them as normal facilities when they are route-relevant and have usable coordinates.
- Use `camping` for informal/tolerated tenting. Reserve `campsite` for formal, managed, or clearly designated campsites.
- Include seasonal/commercial services when route-relevant, and put opening conditions in `description`.
- Promote route-story POIs as `heritage` or `attraction` when they have defensible coordinates.
- Promote no-water, unsafe-water, access, and current-condition warnings as `rule-warning` instead of normal service facilities.

## Pending Batch 1

### 1. `upplandsleden-etapp-10-kolarmoraan-tenting-pending`

Source row: `pending`, type `campsite`, name `Possible tenting at Kolarmoraån`

Decision: `promote`

Target facility type: `camping`

Evidence reviewed:

- Naturkartan's Kolarmora shelter object says the place has two shelters, simple fireplaces and a dry toilet, and explicitly describes tenting at the turnaround across the river or flatter ground near the shelters.
- The same object warns that firewood availability is not guaranteed.

Promotion note:

- Promote as an informal low-service tenting option at the existing Kolarmora shelter cluster coordinates, not as a managed campground.
- Suggested description: "Informal tenting is possible by the turnaround across the river or on flatter ground near the Kolarmora shelters. Dry toilet and fireplaces are nearby; bring your own firewood or charcoal because supplied wood is not guaranteed."

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/vindskydd-upplandsleden-etapp-10

### 2. `upplandsleden-etapp-10-gisslaren-tenting-pending`

Source row: `pending`, type `campsite`, name `Possible tenting near Gisslaren shelter`

Decision: `fold_into_existing`

Target facility type: none as a separate normal facility

Evidence reviewed:

- Naturkartan's Gisslaren shelter object confirms a large overnight shelter, fireplace, table and benches.
- Its text says it can be difficult to find an even tent pitch around the shelter.
- The source does not explicitly recommend or designate a tent site.

Promotion note:

- Do not create a separate `campsite` row yet. Fold the tent caveat into the existing Gisslaren shelter/rest-area description if we want users to understand that tenting is uncertain.
- A separate tenting facility would overstate the source.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/vindskydd-upplandsleden-etapp-10-2

### 3. `upplandsleden-etapp-10-southern-gisslaren-swimming-pending`

Source row: `pending`, type `swimming`, name `Southern Gisslaren swimming opportunities`

Decision: `keep_pending`

Target facility type if resolved: `swimming`

Evidence reviewed:

- Naturkartan's Etapp 10 text and Roslagen's Etapp 10 page both describe good rest/swim places in the southern part of Gisslaren.
- No discrete Naturkartan bathing-place object, OSM bathing/beach object, or stable coordinate was found in this pass.

Promotion blocker:

- Needs a defensible point coordinate. The app can technically store facilities without coordinates, but a normal swimming marker without a source-grade point would be weak and easy to mislead on the map.

Next research step:

- Check the official GPX around the southern Gisslaren shore and OSM lake/shoreline data. If we choose a route-snapped approximate point, mark confidence as medium/low and say it is a narrative swim area, not an official bathing place.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-10
- https://roslagen.se/natur-friluftsliv/vandra/upplandsleden-etapp-10/

### 4. `upplandsleden-etapp-10-kolarmora-remote-parking-pending`

Source row: `pending`, type `parking`, name `Remote parking near Kolarmoraån`

Decision: `keep_pending`

Target facility type if resolved: `parking`, or access-layer parking if the importer supports that

Evidence reviewed:

- Naturkartan confirms the Kolarmora shelter cluster cannot be reached by car.
- Naturkartan says one car can be left beside the road near a barred road, about 1.5 km from the Kolarmora rest area.
- No discrete parking object or exact coordinate was found in this pass.

Promotion blocker:

- Needs an exact point for the roadside/barred-road location. It also needs an import policy decision because most Upplandsleden parking rows are currently being kept as access metadata rather than normal facilities.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-10
- https://www.naturkartan.se/sv/uppsala-lan/vindskydd-upplandsleden-etapp-10

### 5. `upplandsleden-etapp-11-glamsmossen-peat-floating-channel`

Source row: `pending`, type `attraction`, name `Glamsmossen peat extraction area and log-floating channel`

Decision: `keep_pending`

Target facility type if resolved: `attraction` or `heritage`

Evidence reviewed:

- Naturkartan's Etapp 11 text confirms peat extraction at Glamsmossen from 1918 to 1951 and says the trail follows a dug floating route used for timber transport between Österby bruk and Gimo.
- OSM way `705680867` is mapped as `waterway=canal` and aligns with the local canal candidate.
- The current app facility model is point-oriented; this is primarily a line/route-story feature.

Promotion blocker:

- Needs either line-feature support or a deliberately chosen interpretive point. Promoting a single point now would invent precision for a feature that is better represented as route narrative or a line.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-etapp-11
- https://www.openstreetmap.org/way/705680867

### 6. `upplandsleden-etapp-11-kakelang-ruins`

Source row: `pending`, type `heritage`, name `Kakeläng ruins`

Decision: `promote`

Target facility type: `heritage`

Evidence reviewed:

- Existing research notes say older Upplandsleden/Florarna and route-context sources corroborate Kakeläng as ruins along the route, while current Naturkartan/Upplandsstiftelsen stage text does not mention it.
- OSM maps two nearby ruined-building footprints: way `1329144744` has `ruined:building=house`; way `1329144745` has `ruined:building=yes`.
- The two OSM footprints are close enough to represent one heritage cluster.

Promotion note:

- Promote as a medium-confidence heritage POI, not as a current official Naturkartan facility.
- Suggested coordinate: centroid around `[60.21063, 18.07005]`, derived from the two OSM ruined-building footprints.
- Suggested description: "Ruins at Kakeläng, corroborated by older Upplandsleden/Florarna route context and mapped as ruined-building remains in OSM. Current official stage text does not highlight it, so treat as a quiet heritage POI rather than a primary facility."

Sources:

- https://www.openstreetmap.org/way/1329144744
- https://www.openstreetmap.org/way/1329144745

### 7. `upplandsleden-etapp-12-western-branch-stormon-shelter`

Source row: `pending`, type `shelter`, name `Vindskydd, Stormon`

Decision: `promote_branch_scoped`

Target facility type: `shelter`

Evidence reviewed:

- Naturkartan's Stormon object confirms a rest place with bench tables, fireplace, shelter and dry toilet.
- Naturkartan's Floranslingan page lists Stormon as a start/end point and lists Stormon shelter as service for the loop.
- The current Etapp 12 main GPX follows the eastern branch, while Stormon belongs to the western/Floranslingan-supported branch.

Promotion note:

- Promote for Floranslingan / western-branch scope.
- Since all loops/slingor are in scope for the first import, promote once the importer can attach the facility to the Floranslingan route group instead of the ordinary Etapp 12 mainline.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/vindskydd-stormon
- https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-slinga-12-2

### 8. `upplandsleden-etapp-12-western-branch-stormon-toilet`

Source row: `pending`, type `toilet`, name `Toalett, Stormon`

Decision: `promote_branch_scoped`

Target facility type: `toilet`

Evidence reviewed:

- Naturkartan's Stormon toilet object confirms a dry toilet.
- The Stormon shelter object also includes a dry toilet in the same rest-place cluster.
- The facility belongs to the western/Floranslingan-supported branch rather than the current Etapp 12 main GPX.

Promotion note:

- Promote for Floranslingan / western-branch scope.
- Since all loops/slingor are in scope for the first import, promote once the importer can attach the facility to the Floranslingan route group instead of the ordinary Etapp 12 mainline.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/toalett-stormon
- https://www.naturkartan.se/sv/uppsala-lan/vindskydd-stormon
- https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-slinga-12-2

### 9. `upplandsleden-etapp-12-western-branch-grillholmen-fireplace`

Source row: `pending`, type `fireplace`, name `Eldplats, Grillholmen`

Decision: `promote_branch_scoped`

Target facility type: `fireplace`

Evidence reviewed:

- Naturkartan's Grillholmen object is typed as `Grillplats/Eldplats`.
- The object describes a rest place with benches and a fireplace on an islet surrounded by mire.
- Naturkartan's Floranslingan page lists Grillholmen as one of the loop rest places.
- The facility belongs to the western/Floranslingan-supported branch rather than the current Etapp 12 main GPX.

Promotion note:

- Promote for Floranslingan / western-branch scope.
- Keep the 2025 firewood note as descriptive caveat if imported.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/eldplats-grillholmen
- https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-slinga-12-2

### 10. `upplandsleden-etapp-12-western-branch-grillholmen-rest-area`

Source row: `pending`, type `rest-area`, name `Rastplats, Grillholmen`

Decision: `promote_branch_scoped`

Target facility type: `rest-area`

Evidence reviewed:

- Naturkartan's Grillholmen object describes benches and a fireplace on an islet, and categorizes the object as both fireplace and rest area.
- Naturkartan's Floranslingan page lists Grillholmen as a rest place on the loop.
- The facility belongs to the western/Floranslingan-supported branch rather than the current Etapp 12 main GPX.

Promotion note:

- Promote for Floranslingan / western-branch scope.
- If the importer clusters same-coordinate services, keep separate `fireplace` and `rest-area` rows. Otherwise fold the rest-area detail into the fireplace row to avoid duplicate markers.

Sources:

- https://www.naturkartan.se/sv/uppsala-lan/eldplats-grillholmen
- https://www.naturkartan.se/sv/uppsala-lan/upplandsleden-slinga-12-2

## Next Queue

Continue pending review at:

11. `upplandsleden-etapp-13-finnsjon-informal-swimming`
12. `upplandsleden-etapp-14-svenbo-tent-possibility`
13. `upplandsleden-etapp-14-knuters-village-remains`
14. `upplandsleden-etapp-15-tingshallarna`
15. `upplandsleden-etapp-16-gropholmarna-tenting`
