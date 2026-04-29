# Stockholm Archipelago Trail Research

Status: research input for an integrated trail system.

Files:

- `trail.research.json`: whole-trail research packet.
- `facility-normalization-audit.json`: deterministic Slice 0 audit of raw facility, POI, suppression, pending, access, and transfer records against the current app taxonomy.
- `section-connection-plan.json`: deterministic Slice 2 plan for ferry, bus/ferry, walking, and same-island continuity decisions between official SAT entries. The Finnhamn-Ingmarsö rowboat crossing is modeled as a section route, not as a transfer line.

The app-owned SAT source now lives under `data/source/hiking/stockholm-archipelago-trail/`. Runtime code must use generated public shards under `public/data/trail-systems/stockholm-archipelago-trail/`; it must not read this research directory directly.

This research packet remains useful for rebuilding audits, connection planning, and source shards, but it includes suppressed, pending, metadata-only, access-only, and transfer records that are not normal runtime facilities. `harbor_services` is intentionally skipped for the current app surface.

Section route GPX snapshots are app-owned source artifacts under `data/source/hiking/stockholm-archipelago-trail/route-sources/`. Refresh them only when deliberately updating official route geometry provenance.

Run the normalization audit with:

```sh
npm run data:sat:facility-audit
```

Check the committed audit output with:

```sh
npm run data:sat:facility-audit:check
```

Build the connection plan and public planning-route GeoJSON files with:

```sh
npm run data:sat:connection-plan
```

Check the committed connection plan output with:

```sh
npm run data:sat:connection-plan:check
```

Build public SAT section route GeoJSON files from committed route snapshots with:

```sh
npm run data:sat:section-routes
```

Refresh committed GPX snapshots from their official download URLs only when intentionally updating route provenance:

```sh
npm run data:sat:section-routes -- --refresh
```

Check the committed section route output with:

```sh
npm run data:sat:section-routes:check
```

Build the app-owned source shards from this research packet and the connection plan with:

```sh
npm run data:sat:source-shards
```

Check the committed source shards with:

```sh
npm run data:sat:source-shards:check
```

After source shard changes, regenerate public runtime data with:

```sh
npm run data:build
```

Then run:

```sh
npm run data:validate
npm run data:check
```
