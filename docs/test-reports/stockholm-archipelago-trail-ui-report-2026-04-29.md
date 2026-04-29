# Stockholm Archipelago Trail UI QA

Date: 2026-04-29
Target: `http://localhost:5173/`

## Summary

No blocking product issues were found in the SAT browser pass.

## Manual Checks

- Library search: searching `archipelago` returned the Stockholm Archipelago Trail and hid Roslagsleden.
- Northern islands preset: builder showed `3 transfers in this selection`, with ferry rows for Arholma-Lido, Lido-Furusund, and Furusund-Yxlan.
- Northern map: dashed ferry connection routes, offset start/end labels, facility filters, and marker counts were visible without obvious overlap at the inspected viewport.
- Detail view: `Route Transfers` rendered 3 transfer cards with service/operator text, seasonal/currentness caveats, and 3 source links.
- Rowboat preset: builder showed the expected rowboat, walk, and ferry transfer sequence for Finnhamn to Svartso.
- Single-section state: selecting Arholma to Arholma hid the transfer summary and showed `1 main · 13.4 km`.
- Facilities: Arholma detail view showed grouped facility counts; expanding `Food, lodging and services` exposed `Arholma Handel`.
- Console: after a fresh reload, no new browser error logs were recorded.

## Automated Checks

- `npm run runtime:browser-probe` passed.
- `npm run ui:smoke:artifact` passed with 0 findings and did not change the tracked smoke report.

## Coverage Notes

- Scripted smoke covers mobile, narrow mobile, large mobile, tablet, desktop, print, and 200% text layouts for the shared hiking builder/detail surfaces.
- SAT-specific transfer rows were manually inspected in the in-app browser viewport; no separate SAT mobile screenshot artifact was saved in this slice.
