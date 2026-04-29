import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { buildHikingOverviewGeoJSON } from "./lib/build-overview-geojson.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function fakeFetch(fixtures) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (input) => {
      calls.push(input);
      if (!Object.prototype.hasOwnProperty.call(fixtures, input)) {
        return {
          ok: false,
          json: async () => ({})
        };
      }
      return {
        ok: true,
        json: async () => fixtures[input]
      };
    }
  };
}

function hexColorPattern() {
  return /^#[0-9a-f]{6}$/;
}

function namedFilter(filters, id) {
  const filter = filters.find((candidate) => candidate.id === id);
  assert.ok(filter, `Expected filter "${id}" to exist`);
  return filter;
}

async function writeRouteFixture(publicRoot, publicUrl, coordinates) {
  const cleanPath = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  const filePath = path.join(publicRoot, cleanPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates
      }
    })}\n`
  );
}

const vite = await createViteServer({
  root: projectRoot,
  logLevel: "error",
  server: {
    middlewareMode: true
  },
  appType: "custom"
});

try {
  const [
    { normalizeSearchText },
    { buildOverviewColorMap, fallbackOverviewColor },
    routeSelection,
    trailConnections,
    filters,
    library,
    libraryItem
  ] = await Promise.all([
    vite.ssrLoadModule("/src/utils/search.ts"),
    vite.ssrLoadModule("/src/map/overviewColors.ts"),
    vite.ssrLoadModule("/src/data/trailRouteSelection.ts"),
    vite.ssrLoadModule("/src/map/trailSystemConnections.ts"),
    vite.ssrLoadModule("/src/data/filters.ts"),
    vite.ssrLoadModule("/src/data/library.ts"),
    vite.ssrLoadModule("/src/utils/libraryItem.ts")
  ]);

  test("normalizes search text for diacritics, casing, and whitespace", () => {
    assert.equal(normalizeSearchText("  Sormlandsleden   Nynashamn  "), "sormlandsleden nynashamn");
    assert.equal(normalizeSearchText("  Sörmlandsleden   Nynäshamn ÅÄÖ  "), "sormlandsleden nynashamn aao");
  });

  test("splits combined county labels for location filtering", () => {
    assert.deepEqual(
      libraryItem.itemLocationFilterLabels({
        activity: "hiking",
        itemType: "trail-system",
        location: { label: "Stockholms län and Uppsala län" }
      }),
      ["Stockholms län", "Uppsala län"]
    );
    assert.deepEqual(
      libraryItem.itemLocationFilterLabels({
        activity: "kayaking",
        itemType: "kayak-trip",
        locationLabel: "Dalarö / Gålö"
      }),
      ["Dalarö / Gålö"]
    );
  });

  test("builds deterministic overview colors without duplicate IDs", () => {
    const ids = ["trail-a", "trail-b", "trail-a", "", "trail-c"];
    const colorMap = buildOverviewColorMap(ids);
    const repeatedColorMap = buildOverviewColorMap(ids);

    assert.equal(colorMap.size, 3);
    assert.deepEqual([...colorMap.entries()], [...repeatedColorMap.entries()]);
    assert.equal(fallbackOverviewColor("trail-a"), fallbackOverviewColor("trail-a"));
    assert.match(fallbackOverviewColor("trail-a"), hexColorPattern());

    for (const color of colorMap.values()) {
      assert.match(color, hexColorPattern());
    }
  });

  test("selects shortest contiguous trail-section ranges for distance filters", () => {
    const sections = [
      { id: "a", distanceKm: 4 },
      { id: "b", distanceKm: 4 },
      { id: "c", distanceKm: 7 },
      { id: "d", distanceKm: 13 }
    ];

    assert.deepEqual(routeSelection.matchingSectionRange(sections, "short"), {
      startSectionId: "a",
      endSectionId: "a",
      distanceKm: 4
    });
    assert.deepEqual(routeSelection.matchingSectionRange(sections, "half-day"), {
      startSectionId: "c",
      endSectionId: "c",
      distanceKm: 7
    });
    assert.deepEqual(routeSelection.matchingSectionRange(sections, "full-day"), {
      startSectionId: "b",
      endSectionId: "c",
      distanceKm: 11
    });
    assert.deepEqual(routeSelection.matchingSectionRange(sections, "long"), {
      startSectionId: "b",
      endSectionId: "d",
      distanceKm: 24
    });
    assert.equal(routeSelection.matchingSectionRange(sections, "all"), null);
  });

  test("uses mainline route groups and catalog fallback for trail-system ranges", () => {
    const trailSystem = {
      id: "trail-system",
      sections: [
        { id: "a", distanceKm: 4 },
        { id: "b", distanceKm: 4 },
        { id: "c", distanceKm: 7 },
        { id: "d", distanceKm: 13 }
      ],
      routeGroups: [
        { id: "main-east", name: "Main east", kind: "mainline", sectionIds: ["a", "b"], connectsToSectionIds: [] },
        { id: "branch", name: "Branch", kind: "branch", sectionIds: ["a"], connectsToSectionIds: [] },
        { id: "main-west", name: "Main west", kind: "mainline", sectionIds: ["c", "d"], connectsToSectionIds: [] }
      ]
    };

    assert.deepEqual(routeSelection.matchingRouteGroupRange(trailSystem, "half-day"), {
      routeGroupId: "main-west",
      startSectionId: "c",
      endSectionId: "c",
      distanceKm: 7
    });

    assert.deepEqual(routeSelection.fallbackRouteGroups({ sections: trailSystem.sections }), [
      {
        id: "catalog-order",
        name: "Catalog order",
        kind: "mainline",
        sectionIds: ["a", "b", "c", "d"],
        connectsToSectionIds: [],
        notice: "This trail does not have explicit branch topology yet; sections are shown in catalog order."
      }
    ]);
  });

  test("includes trail-system branches and connections in hiking overview geometry", async () => {
    const publicRoot = await mkdtemp(path.join(tmpdir(), "hiking-overview-"));
    try {
      await Promise.all([
        writeRouteFixture(publicRoot, "/routes/main.geojson", [
          [18, 59],
          [18.1, 59.1]
        ]),
        writeRouteFixture(publicRoot, "/routes/branch.geojson", [
          [18.2, 59.2],
          [18.3, 59.3]
        ]),
        writeRouteFixture(publicRoot, "/routes/walk-connection.geojson", [
          [18.4, 59.4],
          [18.5, 59.5]
        ]),
        writeRouteFixture(publicRoot, "/routes/ferry-connection.geojson", [
          [18.6, 59.6],
          [18.7, 59.7]
        ])
      ]);

      const overview = await buildHikingOverviewGeoJSON({
        publicRoot,
        trailSystems: [
          {
            id: "trail-system",
            name: "Trail System",
            location: { label: "Test" },
            sections: [
              { id: "main", route: { geojsonPath: "/routes/main.geojson" } },
              { id: "branch", route: { geojsonPath: "/routes/branch.geojson" } }
            ],
            routeGroups: [
              { id: "mainline", kind: "mainline", sectionIds: ["main"], connectsToSectionIds: [] },
              { id: "branch", kind: "branch", sectionIds: ["branch"], connectsToSectionIds: ["main"] }
            ],
            connections: [
              {
                id: "main-branch-walk",
                mode: "walk",
                from: { sectionId: "main" },
                to: { sectionId: "branch" },
                route: { geojsonPath: "/routes/walk-connection.geojson" }
              },
              {
                id: "main-branch-ferry",
                mode: "ferry",
                from: { sectionId: "main" },
                to: { sectionId: "branch" },
                route: { geojsonPath: "/routes/ferry-connection.geojson" }
              }
            ]
          }
        ]
      });

      const feature = overview.features.find((candidate) => candidate.properties.id === "trail-system");
      assert.ok(feature);
      assert.equal(feature.geometry.type, "MultiLineString");
      assert.deepEqual(feature.geometry.coordinates, [
        [
          [18, 59],
          [18.1, 59.1]
        ],
        [
          [18.2, 59.2],
          [18.3, 59.3]
        ],
        [
          [18.4, 59.4],
          [18.5, 59.5]
        ]
      ]);
      assert.deepEqual(feature.properties.connectionOverlays, [
        {
          mode: "ferry",
          coordinates: [
            [
              [18.6, 59.6],
              [18.7, 59.7]
            ]
          ]
        }
      ]);
    } finally {
      await rm(publicRoot, { recursive: true, force: true });
    }
  });

  test("keeps a higher-resolution overview trace for Stockholm Archipelago Trail", async () => {
    const publicRoot = await mkdtemp(path.join(tmpdir(), "hiking-overview-"));
    try {
      await writeRouteFixture(publicRoot, "/routes/subtle-bends.geojson", [
        [18, 59],
        [18.001, 59.0004],
        [18.002, 59],
        [18.003, 59.0004],
        [18.004, 59]
      ]);

      const overview = await buildHikingOverviewGeoJSON({
        publicRoot,
        trailSystems: [
          {
            id: "ordinary-trail",
            name: "Ordinary Trail",
            location: { label: "Test" },
            sections: [{ id: "ordinary-section", route: { geojsonPath: "/routes/subtle-bends.geojson" } }],
            routeGroups: [{ id: "main", kind: "mainline", sectionIds: ["ordinary-section"], connectsToSectionIds: [] }]
          },
          {
            id: "stockholm-archipelago-trail",
            name: "Stockholm Archipelago Trail",
            location: { label: "Test" },
            sections: [{ id: "sat-section", route: { geojsonPath: "/routes/subtle-bends.geojson" } }],
            routeGroups: [{ id: "main", kind: "mainline", sectionIds: ["sat-section"], connectsToSectionIds: [] }]
          }
        ]
      });

      const ordinaryFeature = overview.features.find((candidate) => candidate.properties.id === "ordinary-trail");
      const satFeature = overview.features.find((candidate) => candidate.properties.id === "stockholm-archipelago-trail");
      assert.ok(ordinaryFeature);
      assert.ok(satFeature);
      assert.equal(ordinaryFeature.geometry.type, "LineString");
      assert.equal(satFeature.geometry.type, "LineString");
      assert.equal(ordinaryFeature.geometry.coordinates.length, 2);
      assert.ok(satFeature.geometry.coordinates.length > ordinaryFeature.geometry.coordinates.length);
    } finally {
      await rm(publicRoot, { recursive: true, force: true });
    }
  });

  test("prefers curated trail-system presets when they match distance filters", () => {
    const trailSystem = {
      id: "trail-system",
      sections: [
        { id: "a", distanceKm: 8 },
        { id: "b", distanceKm: 7 },
        { id: "c", distanceKm: 13 },
        { id: "d", distanceKm: 10 },
        { id: "e", distanceKm: 12 }
      ],
      routeGroups: [
        { id: "main", name: "Main", kind: "mainline", sectionIds: ["a", "b", "c", "d", "e"], connectsToSectionIds: [] }
      ],
      presets: [
        { id: "shorter-preset", name: "Shorter preset", startSectionId: "a", endSectionId: "b" },
        { id: "curated-weekend", name: "Curated weekend", startSectionId: "a", endSectionId: "d" }
      ]
    };

    assert.deepEqual(routeSelection.matchingRouteGroupRange(trailSystem, "long"), {
      routeGroupId: "main",
      startSectionId: "a",
      endSectionId: "d",
      distanceKm: 38
    });
  });

  test("uses hiking time windows for trail-system route ranges", () => {
    const trailSystem = {
      id: "trail-system",
      sections: [
        { id: "a", distanceKm: 8 },
        { id: "b", distanceKm: 7 },
        { id: "c", distanceKm: 13 },
        { id: "d", distanceKm: 10 },
        { id: "e", distanceKm: 12 },
        { id: "f", distanceKm: 65 }
      ],
      routeGroups: [
        { id: "main", name: "Main", kind: "mainline", sectionIds: ["a", "b", "c", "d", "e", "f"], connectsToSectionIds: [] }
      ],
      presets: [
        { id: "stockholm-start-day", name: "Stockholm start day", startSectionId: "a", endSectionId: "b" },
        { id: "curated-weekend", name: "Curated weekend", startSectionId: "c", endSectionId: "e" }
      ]
    };

    assert.deepEqual(routeSelection.matchingRouteGroupRange(trailSystem, "weekend"), {
      routeGroupId: "main",
      startSectionId: "c",
      endSectionId: "e",
      distanceKm: 35
    });
    assert.deepEqual(routeSelection.matchingRouteGroupRange(trailSystem, "3-5-days"), {
      routeGroupId: "main",
      startSectionId: "f",
      endSectionId: "f",
      distanceKm: 65
    });
  });

  test("selects drawable adjacent trail-system connections for the chosen section range", () => {
    const sections = [{ id: "stage-1" }, { id: "stage-2" }, { id: "stage-3" }, { id: "stage-2" }];
    const route = {
      geojsonPath: "/routes/connection.geojson",
      geometryStatus: "ready",
      mapConfidence: "high",
      navigationUse: "planning-reference",
      sourceFormat: "manual"
    };
    const connections = [
      {
        id: "stage-1-stage-2",
        mode: "ferry",
        from: { sectionId: "stage-1", label: "Stage 1 quay" },
        to: { sectionId: "stage-2", label: "Stage 2 quay" },
        note: "Ferry connection.",
        route
      },
      {
        id: "stage-3-stage-2",
        mode: "rowboat",
        from: { sectionId: "stage-3", label: "Stage 3 boat" },
        to: { sectionId: "stage-2", label: "Stage 2 boat" },
        note: "Reverse-order rowboat connection.",
        route
      },
      {
        id: "stage-1-stage-3-direct",
        mode: "ferry",
        from: { sectionId: "stage-1", label: "Stage 1" },
        to: { sectionId: "stage-3", label: "Stage 3" },
        note: "Non-adjacent connection.",
        route
      },
      {
        id: "stage-2-stage-3-missing-route",
        mode: "walk",
        from: { sectionId: "stage-2", label: "Stage 2" },
        to: { sectionId: "stage-3", label: "Stage 3" },
        note: "Missing route."
      },
      {
        id: "stage-1-stage-2-same-island",
        mode: "same-island",
        from: { sectionId: "stage-1", label: "Stage 1" },
        to: { sectionId: "stage-2", label: "Stage 2" },
        note: "No drawable transfer.",
        route
      }
    ];

    assert.deepEqual(
      trailConnections.selectedTrailConnections(connections, sections).map((connection) => connection.id),
      ["stage-1-stage-2", "stage-3-stage-2"]
    );
  });

  test("selects adjacent route transfers without requiring map geometry", () => {
    const sections = [{ id: "stage-1" }, { id: "stage-2" }, { id: "stage-3" }];
    const connections = [
      {
        id: "stage-1-stage-2-ferry",
        mode: "ferry",
        from: { sectionId: "stage-1", label: "Stage 1 quay" },
        to: { sectionId: "stage-2", label: "Stage 2 quay" },
        note: "Use ferry."
      },
      {
        id: "stage-2-stage-3-bus",
        mode: "bus",
        from: { sectionId: "stage-2", label: "Stage 2 stop" },
        to: { sectionId: "stage-3", label: "Stage 3 stop" },
        note: "Use bus."
      },
      {
        id: "stage-1-stage-3-rowboat",
        mode: "rowboat",
        from: { sectionId: "stage-1", label: "Stage 1 boats" },
        to: { sectionId: "stage-3", label: "Stage 3 boats" },
        note: "Not adjacent in this selection."
      },
      {
        id: "stage-1-stage-2-same-island",
        mode: "same-island",
        from: { sectionId: "stage-1", label: "Stage 1" },
        to: { sectionId: "stage-2", label: "Stage 2" },
        note: "No transfer needed."
      }
    ];

    assert.deepEqual(
      trailConnections.selectedTrailTransferConnections(connections, sections).map((connection) => connection.id),
      ["stage-1-stage-2-ferry", "stage-2-stage-3-bus"]
    );
  });

  test("matches trail-system distance filters against route-group distance windows", () => {
    const trailSystemItem = {
      id: "trail-system",
      itemType: "trail-system",
      distanceKm: 150,
      sectionDistances: [150],
      routeGroupDistances: [[3, 4, 9], [25], [42]]
    };

    assert.equal(routeSelection.hasTrailSystemRouteInRange(trailSystemItem, 5, 10), true);
    assert.equal(routeSelection.hasTrailSystemRouteOver(trailSystemItem, 20), true);
    assert.equal(namedFilter(filters.distanceFilters, "short").matches(trailSystemItem), true);
    assert.equal(namedFilter(filters.distanceFilters, "half-day").matches(trailSystemItem), true);
    assert.equal(namedFilter(filters.distanceFilters, "long").matches(trailSystemItem), true);
    assert.equal(namedFilter(filters.distanceFilters, "very-long").matches(trailSystemItem), true);
    assert.equal(namedFilter(filters.recommendedTimeFilters, "10-plus-days").matches(trailSystemItem), false);
  });

  test("matches kayak duration, service, and metadata filters", () => {
    const kayakItem = {
      id: "kayak-1",
      activity: "kayaking",
      itemType: "kayak-trip",
      recommendedTimes: ["3-5-days"],
      waterZone: "outer",
      exposureLevel: "exposed",
      routeConfidence: "medium-high"
    };
    const hikeItem = {
      id: "hike-1",
      activity: "hiking",
      itemType: "hike",
      recommendedTimes: ["dayhike"]
    };
    const facilities = [
      {
        id: "rental",
        routeIds: ["kayak-1"],
        type: "kayak-rental",
        primaryCategory: "",
        categories: [],
        serviceTags: []
      },
      {
        id: "parking",
        routeIds: ["kayak-1"],
        type: "parking",
        primaryCategory: "",
        categories: ["parking"],
        serviceTags: []
      },
      {
        id: "overnight",
        routeIds: ["kayak-1"],
        type: "launch",
        primaryCategory: "",
        categories: [],
        serviceTags: ["natural-harbor"]
      },
      {
        id: "other-route",
        routeIds: ["other"],
        type: "kayak-rental",
        primaryCategory: "",
        categories: [],
        serviceTags: []
      }
    ];

    assert.equal(filters.kayakDurationMatches(kayakItem, "multi-day"), true);
    assert.equal(filters.kayakDurationMatches(kayakItem, "weekend"), false);
    assert.equal(filters.kayakServiceMatches(kayakItem, facilities, "rental"), true);
    assert.equal(filters.kayakServiceMatches(kayakItem, facilities, "parking"), true);
    assert.equal(filters.kayakServiceMatches(kayakItem, facilities, "overnight"), true);
    assert.equal(filters.kayakServiceMatches(hikeItem, facilities, "rental"), false);
    assert.equal(
      filters.kayakMetadataMatches(kayakItem, {
        waterZone: "outer",
        exposure: "exposed",
        confidence: "medium-high"
      }),
      true
    );
    assert.equal(
      filters.kayakMetadataMatches(hikeItem, {
        waterZone: "all",
        exposure: "all",
        confidence: "all"
      }),
      false
    );
  });

  test("defaults legacy hiking index records while preserving explicit activity", async () => {
    const { calls, fetchImpl } = fakeFetch({
      "/data/library-index.json": [
        { id: "legacy-hike", itemType: "hike", recommendedTimes: ["dayhike"] },
        { id: "kayak", activity: "kayaking", itemType: "kayak-trip", recommendedTimes: ["dayhike"] }
      ]
    });

    const items = await library.loadLibraryIndex(fetchImpl);

    assert.deepEqual(calls, ["/data/library-index.json"]);
    assert.equal(items[0].activity, "hiking");
    assert.equal(items[1].activity, "kayaking");
  });

  test("loads trail-system runtime shards into lightweight runtime sections", async () => {
    const manifest = {
      id: "trail-system",
      itemType: "trail-system",
      name: "Trail System",
      connectionsPath: "/connections.json",
      source: { provider: "test-source", url: "https://example.com/source" }
    };
    const sectionsIndex = [
      {
        id: "stage-1",
        stageNumber: 1,
        name: "Stage 1",
        from: "Start",
        to: "Finish",
        distanceKm: 8,
        estimatedTime: "2 h",
        detailPath: "/data/trail-systems/trail-system/sections/stage-1.json",
        route: { status: "ready", geojsonPath: "/routes/stage-1.geojson" }
      }
    ];
    const routeGroups = [
      { id: "main", name: "Main", kind: "mainline", sectionIds: ["stage-1"], connectsToSectionIds: [] }
    ];
    const connections = [
      {
        id: "stage-1-ferry",
        mode: "ferry",
        from: { sectionId: "stage-1", label: "Start quay", coordinates: [59, 18] },
        to: { sectionId: "stage-1", label: "Finish quay", coordinates: [59.1, 18.1] },
        note: "Test ferry connection."
      }
    ];
    const presets = [{ id: "stage-1", name: "Stage 1", startSectionId: "stage-1", endSectionId: "stage-1" }];
    const { calls, fetchImpl } = fakeFetch({
      "/manifest.json": manifest,
      "/sections-index.json": sectionsIndex,
      "/route-groups.json": routeGroups,
      "/connections.json": connections,
      "/presets.json": presets
    });

    const trailSystem = await library.loadTrailSystemFromShards(
      {
        itemType: "trail-system",
        name: "Trail System",
        manifestPath: "/manifest.json",
        sectionsIndexPath: "/sections-index.json",
        routeGroupsPath: "/route-groups.json",
        presetsPath: "/presets.json"
      },
      fetchImpl
    );

    assert.deepEqual(calls.sort(), ["/connections.json", "/manifest.json", "/presets.json", "/route-groups.json", "/sections-index.json"]);
    assert.equal(trailSystem.id, "trail-system");
    assert.deepEqual(trailSystem.routeGroups, routeGroups);
    assert.deepEqual(trailSystem.connections, connections);
    assert.deepEqual(trailSystem.presets, presets);
    assert.equal(trailSystem.sections[0].description, "");
    assert.deepEqual(trailSystem.sections[0].utilities, []);
    assert.deepEqual(trailSystem.sections[0].waterSources, []);
    assert.deepEqual(trailSystem.sections[0].notes, []);
    assert.deepEqual(trailSystem.sections[0].facilities, []);
    assert.deepEqual(trailSystem.sections[0].accessPoints, []);
    assert.deepEqual(trailSystem.sections[0].source, manifest.source);
  });

  test("surfaces loader errors for missing paths and failed fetches", async () => {
    const { calls, fetchImpl } = fakeFetch({});

    await assert.rejects(
      () => library.loadTrailSystemFromShards({ itemType: "trail-system", name: "Broken Trail" }, fetchImpl),
      /missing required shard paths/
    );
    assert.deepEqual(calls, []);
    await assert.rejects(() => library.fetchJson("/missing.json", fetchImpl), /Could not load \/missing\.json/);
  });

  test("dispatches library detail loading by item type", async () => {
    const hikeDetail = { id: "hike-1", itemType: "hike" };
    const kayakDetail = { id: "kayak-1", itemType: "kayak-trip", activity: "kayaking" };
    const { calls, fetchImpl } = fakeFetch({
      "/hike.json": hikeDetail,
      "/kayak.json": kayakDetail
    });

    assert.deepEqual(
      await library.loadLibraryDetail({ itemType: "hike", name: "Hike", detailPath: "/hike.json" }, fetchImpl),
      hikeDetail
    );
    assert.deepEqual(
      await library.loadLibraryDetail(
        { itemType: "kayak-trip", name: "Kayak", detailPath: "/kayak.json" },
        fetchImpl
      ),
      kayakDetail
    );
    await assert.rejects(
      () => library.loadLibraryDetail({ itemType: "kayak-trip", name: "Broken Kayak" }, fetchImpl),
      /missing detailPath/
    );
    assert.deepEqual(calls, ["/hike.json", "/kayak.json"]);
  });

  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`not ok ${name}`);
      console.error(error?.stack ?? error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    console.error(`${failures} of ${tests.length} unit tests failed.`);
  } else {
    console.log(`Unit tests passed (${tests.length}).`);
  }
} finally {
  await vite.close();
}
