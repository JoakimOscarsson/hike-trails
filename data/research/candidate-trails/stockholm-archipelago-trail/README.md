# Stockholm Archipelago Trail Research

Status: research-only.

Files:

- `trail.research.json`: whole-trail research packet.
- `facility-normalization-audit.json`: deterministic Slice 0 audit of raw facility, POI, suppression, pending, access, and transfer records against the current app taxonomy.

This trail has not yet been split into per-section packets in this repository. Before integration, split or normalize it into the planned trail-system source contract and validate any route geometry and facility references.

Run the normalization audit with:

```sh
npm run data:sat:facility-audit
```

Check the committed audit output with:

```sh
npm run data:sat:facility-audit:check
```
