# Högakustenleden Research

Status: imported to runtime data from the candidate packet. The research files
remain source evidence only; the app consumes the generated `data/source/hiking`,
`public/data/trail-systems`, and route GeoJSON outputs.

Trail ID: `hogakustenleden`

## Current Packet

The local candidate packet now has all 9 current sections researched under
`sections/*.research.json`, plus a synchronized `research-progress.json` and
`trail.research.json` overview. The normalized candidate packet also includes
`protected-area-overlays.research.json`, which converts the caveat-resolution
boundary pass into section/chainage rule scopes.

Use the active Höga Kusten tourism pages and current Naturkartan section pages
as the baseline. Older 7-stage and 13-stage variants appear in official or
semi-official sources and should be retained only as legacy/reference caveats
unless a newer official update changes the current structure.

## Import Posture

Imported with the following caveats retained as notes or import decisions:

- Section 2 distance display policy: use the Höga Kusten 26.8 km value while
  preserving Naturkartan/GPX distance contradictions as metadata.
- Section 7 difficulty: prefer the more conservative Naturkartan red/krävande
  posture while preserving the Höga Kusten `Medel` source caveat.
- Slåttdalsskrevan: model as hazard/avoid-through-passage/current-route
  warning, and recheck official notices before publishing.
- Protected-area rules: apply Skuleskogen, Skuleberget, Balesudden, and
  Hörnsjön rules only to the affected route portions recorded in
  `normalized-candidate/protected-area-overlays.research.json`.
- Transit: replace DinTur/Fskab research stop ids with authoritative GTFS or
  ResRobot ids if available during import.
