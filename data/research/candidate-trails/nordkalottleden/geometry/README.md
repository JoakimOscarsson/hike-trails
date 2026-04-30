# Nordkalottleden Geometry QA Artifacts

Research-only candidate geometry for the Reisa/Käsivarsi/Kautokeino 12-section model. These files are not runtime app data and have not been imported into `data/source/hiking`, `public/data`, or `public/routes`.

## Files

- `sections/*.geojson` - one clipped candidate LineString per researched section.
- `all-sections.geojson` - combined FeatureCollection for visual QA.
- `geometry-quality-report.json` - source choice, measured length, endpoint snap gaps, warnings and quality status.
- `source-downloads/*.zip` - research-only Kartverket/Geonorge Turrutebasen GPX extracts used or checked during geometry QA.
- `../tools/build-geometry-artifacts.mjs` - repeatable generator for the GeoJSON artifacts and QA report.

## Source Policy

- Sections 1-5 use official Luontoon/Metsähallitus OGC linework for `Kalottireitti` where it covers the route.
- Section 6 uses mixed official linework: Luontoon/Metsähallitus to the Finland-Norway boundary and Kartverket/Geonorge Turrutebasen GPX from the boundary toward Somashytta. The source-boundary junction gap is about 36.8 m and is recorded in the generated source metadata.
- Sections 7-12 use official Kartverket/Geonorge Turrutebasen GPX route lines from the Nordreisa and Guovdageaidnu/Kautokeino municipality extracts.
- The generator clips to researched section endpoints by projecting them onto the source route line.
- The generator does not invent straight-line hut-yard, town-centre, private-road or access connectors. Endpoint gaps are recorded as QA findings instead.

## Current QA Summary

- 12 section artifacts generated and JSON-validated.
- 5 artifacts are based on official Luontoon/Metsähallitus OGC geometry.
- 6 artifacts are based on official Kartverket/Geonorge Turrutebasen GPX geometry.
- 1 artifact is mixed official Luontoon/Metsähallitus plus Kartverket/Geonorge Turrutebasen geometry.
- Sections 3-10 are high-quality official route-line candidates.
- Sections 1, 2, 8, 11 and 12 still require endpoint connector or endpoint-policy decisions before navigation-grade import. Section 8 is included because of the inter-section Saraelv-to-Ovi continuity gap from section 7.

## Remaining Geometry Blockers

- Sections 1-2: current Saarijärvi hut yard is about 152 m from the official route line. Do not add a synthetic connector without source-backed spur evidence.
- Sections 7-8: the section 7 artifact ends at the selected Saraelv route endpoint while section 8 starts at Ovi Raishiin; the inter-section continuity gap is about 1.0 km and needs connector or compound-endpoint policy.
- Sections 11-12: Madam Bongos / Čunovuohppi place coordinate is about 65 m from the Turrutebasen E1 route projection and is a closed/legacy endpoint, not active lodging.
- Section 6: mixed official-source boundary join is about 36.8 m; keep this as a source-junction QA note unless a cleaner cross-border official extract is found.
- No section now depends on E1/OSM planning-grade geometry for the generated candidate artifacts, but these remain research artifacts only and are not runtime import data.
