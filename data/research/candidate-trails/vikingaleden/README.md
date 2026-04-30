# Vikingaleden Research

Status: imported to runtime data from the candidate packet. Sections 7-12 are
kept as a separate selectable Upplandsleden-overlap chain.

Files:

- `trail.research.json`: trail-level overview generated from the researched
  section packets.
- `research-progress.json`: section coverage and import-readiness handoff.
- `sections/*.research.json`: 12 section packets.

Several Vikingaleden records overlap with Upplandsleden source context, so the
runtime import keeps a trail-scoped Vikingaleden identity while preserving the
overlap chain and dedupe context against
`data/research/candidate-trails/upplandsleden/`.

2026-04-30 prep decisions:

- Live Visit Roslagen overview confirms the 12-stage model from Grisslehamn to Älvkarleby: the first 63 km run to Gimo, then the trail continues north on Upplandsleden.
- Visit Roslagen Etapp 12 is live again at `https://www.visitroslagen.se/vikingaleden-etapp-16` and states that it corresponds to Upplandsleden etapp 16.
- Candidate GPX-derived GeoJSON exists for all 12 sections, and computed geometry distances match the normalized section distances.
- Runtime import keeps Vikingaleden as a separate trail with trail-scoped route files. Sections 7-12 are a separate selectable Upplandsleden-overlap chain.
- Parking/transit stay access metadata, branch/context amenities stay pending, and rule-warning rows stay out of visible facilities until the app has dedicated layers for those concepts.
