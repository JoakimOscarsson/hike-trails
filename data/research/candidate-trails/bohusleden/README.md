# Bohusleden Research

Status: research-only candidate. Do not import into runtime app data yet.

Handoff status on 2026-04-29: whole-trail overview and Stage 1 research are complete enough for a later normalization pass. Per user request, work stops here for this thread; stages 2-27 remain pending.

Files:

- `trail.research.json`: whole-trail official overview and source-risk packet.
- `research-progress.json`: continuously updated handoff/progress tracker.
- `sections/bohusleden-stage-1-alvsaker-stensjon.research.json`: completed Stage 1 research packet.
- `sections/*.research.json`: one section packet per official stage; stages 2-27 still need Phase 2 research.

Phase 1 official-source pass on 2026-04-29: West Sweden Trails/Bohusleden currently lists 27 stages and a headline distance of about 350 km from Älvsåker to Strömstad. The official structured stage distances sum to 353.5 km.

Important early caveats:

- Current official southern start is Älvsåker, while older/secondary naming still appears as Lindome or Blåvättnerna.
- Official stage geometry is available as GeoJSON LineString data in the West Sweden Trails public API.
- The official geometries for Stage 21 and Stage 22 have an approximately 4.3 km discontinuity; do not stitch these automatically.
- Stage 1 has completed its six-agent research batch, synthesis, transit/access, facilities, route geometry, rules/safety, and field-report pass.
- Stages 2-27 still need six-agent research batches, transit/access, facility coordinates, protected-area rules, Naturkartan/OSM cross-checks, and field reports.

Stage 1 key caveats:

- Use official West Sweden Trails/Hoodin GPX or map API linework as primary geometry after de-duplicating consecutive repeated coordinates; OSM relation 279950 strongly corroborates it.
- Treat Naturkartan Stage 1 GPX as secondary/planning-grade because it keeps stale Blåvättnerna framing and diverges from official/OSM linework near Bunketorp.
- Several Stage 1 facilities are import-ready, but Stora Hassungaredssjön toilet/swimming/shelter claims, opening-hours-dependent services, firepit coordinates, and protected-area polygon overlaps need verification before runtime import.
