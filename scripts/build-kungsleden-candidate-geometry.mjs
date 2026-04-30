import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const trailId = "kungsleden";
const trailRoot = path.join(projectRoot, "data/research/candidate-trails", trailId);
const sectionsRoot = path.join(trailRoot, "sections");
const geometryRoot = path.join(trailRoot, "geometry/candidate");
const sectionsOutRoot = path.join(geometryRoot, "sections");
const sourceOutRoot = path.join(geometryRoot, "source-downloads");
const normalizedRoot = path.join(trailRoot, "normalized-candidate");
const lastUpdated = "2026-04-30";
const simplifyToleranceMeters = 5;
const gapEdgePenaltyMeters = 50000;
const maxGapEdgeMeters = 40000;
const snapDistanceScoreWeight = 100;

const ledIds = {
  bd21: "30361077",
  bd26: "30466790",
  bd31: "30466819",
  bd38: "30442476",
  bd46: "30466867",
  bd49: "30466872",
  bd50Land: "30466874",
  bd62: "30466917",
  bd63: "30466925",
  bd65: "30466940",
  bd66: "30413122",
  bd77Land: "30424088",
  bd78Land: "30466987",
  bd87: "30467009",
  bd88: "30467012",
  ac20: "30455122",
  ac16: "30454750",
  ac2: "30448885",
  ac3: "30454909"
};

const sectionPlans = [
  plan("kungsleden-section-01-abisko-abiskojaure", ledIds.bd21),
  plan("kungsleden-section-02-abiskojaure-alesjaure", ledIds.bd26),
  plan("kungsleden-section-03-alesjaure-tjaktja", ledIds.bd31),
  plan("kungsleden-section-04-tjaktja-salka", ledIds.bd31),
  plan("kungsleden-section-05-salka-singi", ledIds.bd38),
  plan("kungsleden-section-06-singi-kaitumjaure", ledIds.bd46),
  plan("kungsleden-section-07-kaitumjaure-teusajaure", ledIds.bd49),
  plan("kungsleden-section-08-teusajaure-vakkotavare", ledIds.bd50Land),
  plan("kungsleden-section-09-saltoluokta-sitojaure", ledIds.bd62),
  plan("kungsleden-section-10-sitojaure-aktse", ledIds.bd63),
  plan("kungsleden-section-11-aktse-parte", ledIds.bd65),
  plan("kungsleden-section-12-parte-kvikkjokk", ledIds.bd66),
  plan("kungsleden-section-13-kvikkjokk-tsielekjakkstugan", ledIds.bd77Land),
  plan("kungsleden-section-14-tsielekjakkstugan-pitealven", ledIds.bd77Land),
  plan("kungsleden-section-15-pitealven-gasaklahko", ledIds.bd78Land),
  plan("kungsleden-section-16-gasaklahko-vuonatjviken", ledIds.bd78Land),
  {
    sectionId: "kungsleden-section-17-vuonatjviken-jackvik",
    parts: [
      {
        ledId: ledIds.bd78Land,
        startAnchor: { lat: 66.4876469, lon: 17.1225075 },
        endAnchor: { lat: 66.4259128, lon: 16.9509581 },
        notes:
          "Land-only candidate from the Riebnes west landing to the Kapellstrommarna north-side rowboat landing; the required Riebnes motorboat connector remains transport metadata."
      },
      {
        ledId: ledIds.bd78Land,
        startAnchor: { lat: 66.4229995, lon: 16.9509461 },
        endAnchor: { lat: 66.3834846, lon: 16.9604305 },
        notes:
          "Land-only candidate from the Kapellstrommarna south-side rowboat landing to the official WFS Jackvik foot-line endpoint; the rowboat crossing and Jackvik service-zone offset remain connector/access metadata."
      }
    ]
  },
  plan("kungsleden-section-18-jackvik-adolfstrom", ledIds.bd87),
  {
    sectionId: "kungsleden-section-19-adolfstrom-sjnulttjie",
    parts: [
      {
        ledId: ledIds.bd88,
        startAnchor: { lat: 66.278394, lon: 16.649013 },
        endAnchor: { lat: 66.21104, lon: 16.38408 },
        notes: "Uses the official BD88 mainline between the Adolfstrom harbor/line endpoint and Sjnulttjie mainline junction; the village/service endpoint and shelter spur stay endpoint/access metadata."
      }
    ]
  },
  {
    sectionId: "kungsleden-section-20-sjnulttjie-ravfallsstugan",
    parts: [
      {
        ledId: ledIds.bd88,
        startAnchor: { lat: 66.21104, lon: 16.38408 },
        endAnchor: { lat: 66.1095956, lon: 16.327757 },
        notes: "BD88 mainline from Sjnulttjie junction to the Norrbotten/Vasterbotten handoff zone."
      },
      {
        ledId: ledIds.ac20,
        startAnchor: { lat: 66.11148, lon: 16.3323759 },
        endAnchor: { lat: 66.0954332, lon: 16.1206686 },
        notes: "AC20 mainline from the county-boundary handoff zone to the Ravfallsstugan route-line endpoint; the ca 295 m handoff gap remains explicit."
      }
    ]
  },
  plan("kungsleden-section-21-ravfallsstugan-ammarnas", ledIds.ac20),
  plan("kungsleden-section-22-ammarnas-aigert", ledIds.ac16),
  plan("kungsleden-section-23-aigert-serve", ledIds.ac16),
  plan("kungsleden-section-24-serve-tarnasjo", ledIds.ac16),
  plan("kungsleden-section-25-tarnasjo-syter", ledIds.ac2),
  plan("kungsleden-section-26-syter-viterskalet", ledIds.ac3),
  plan("kungsleden-section-27-viterskalet-hemavan", ledIds.ac3)
];

await mkdir(sectionsOutRoot, { recursive: true });
await mkdir(sourceOutRoot, { recursive: true });
await mkdir(normalizedRoot, { recursive: true });

const sectionDataById = new Map();
for (const sectionPlan of sectionPlans) {
  sectionDataById.set(sectionPlan.sectionId, await readJson(path.join(sectionsRoot, `${sectionPlan.sectionId}.research.json`)));
}

const officialSources = new Map();
for (const ledId of [...new Set(sectionPlans.flatMap((sectionPlan) => sectionPlan.parts.map((part) => part.ledId)))]) {
  officialSources.set(ledId, await fetchOfficialLedSource(ledId));
}

const sectionRecords = [];
const combinedFeatures = [];
for (const sectionPlan of sectionPlans) {
  const section = sectionDataById.get(sectionPlan.sectionId);
  const outputParts = [];
  const sourceParts = [];

  for (const [partIndex, partPlan] of sectionPlan.parts.entries()) {
    const source = officialSources.get(partPlan.ledId);
    const startAnchor = partPlan.startAnchor ?? selectEndpointAnchor(section, "start");
    const endAnchor = partPlan.endAnchor ?? selectEndpointAnchor(section, "end");
    const clipped = clipSourceToAnchors(source, startAnchor, endAnchor);
    const simplifiedParts = clipped.parts.map((line) => simplifyLine(line, simplifyToleranceMeters)).filter((line) => line.length >= 2);
    outputParts.push(...simplifiedParts);
    sourceParts.push({
      partIndex: partIndex + 1,
      ledId: partPlan.ledId,
      statligLedId: source.statligLedIds.join(", "),
      sourceDownload: toProjectRelative(source.outputPath),
      sourceFeatureCount: source.featureCount,
      sourcePartCount: source.sourceLineCount,
      startAnchor,
      endAnchor,
      startSnap: clipped.startSnap,
      endSnap: clipped.endSnap,
      direction: clipped.direction,
      outputLineParts: simplifiedParts.length,
      originalPointCount: clipped.parts.reduce((count, line) => count + line.length, 0),
      simplifiedPointCount: simplifiedParts.reduce((count, line) => count + line.length, 0),
      lengthKm: round(simplifiedParts.reduce((sum, line) => sum + lineLengthMeters(line), 0) / 1000, 3),
      preservedBreaks: clipped.preservedBreaks,
      assemblyGaps: clipped.assemblyGaps,
      notes: partPlan.notes ?? null
    });
  }

  const geometry = outputParts.length === 1 ? { type: "LineString", coordinates: outputParts[0] } : { type: "MultiLineString", coordinates: outputParts };
  const feature = {
    type: "Feature",
    properties: {
      schemaVersion: "candidate-kungsleden-geometry/v1",
      trailId,
      sectionId: sectionPlan.sectionId,
      sectionNumber: section.sectionNumber,
      name: section.name,
      from: section.from,
      to: section.to,
      source: "Naturvardsverket/Lansstyrelsen Leder WFS official state-trail geometry",
      sourceCrs: "EPSG:3006",
      outputCrs: "EPSG:4326",
      generatedAt: lastUpdated,
      simplificationToleranceMeters: simplifyToleranceMeters,
      runtimeImportApproved: false
    },
    geometry
  };

  const sectionOutputPath = path.join(sectionsOutRoot, `${sectionPlan.sectionId}.geojson`);
  await writeJson(sectionOutputPath, feature);
  combinedFeatures.push(feature);

  sectionRecords.push({
    sectionId: sectionPlan.sectionId,
    sectionNumber: section.sectionNumber,
    name: section.name,
    outputGeojson: toProjectRelative(sectionOutputPath),
    geometryType: geometry.type,
    lineParts: outputParts.length,
    lengthKm: round(outputParts.reduce((sum, line) => sum + lineLengthMeters(line), 0) / 1000, 3),
    sourceParts,
    warnings: buildSectionWarnings(sectionPlan, sourceParts)
  });
}

const combinedOutputPath = path.join(geometryRoot, "kungsleden-candidate-section-geometries.geojson");
await writeJson(combinedOutputPath, {
  type: "FeatureCollection",
  features: combinedFeatures
});

const buildReport = {
  schemaVersion: "candidate-kungsleden-geometry-build/v1",
  trailId,
  lastUpdated,
  status: "candidate-geometry-generated-research-only",
  runtimeImportApproved: false,
  sourceArtifact: "kungsleden/geometry-qa-2026-04-30.research.json",
  method:
    "Fetched official Naturvardsverket/Lansstyrelsen Leder WFS features in EPSG:3006 by Led_ID, transformed SWEREF99 TM coordinates to WGS84, assembled multipart state-trail linework, clipped grouped features to researched Kungsleden section anchors, reversed output where needed, preserved non-hiking/transport gaps as MultiLineString breaks, and applied conservative 5 m Douglas-Peucker simplification.",
  summary: {
    sections: sectionRecords.length,
    sectionsWithCandidateGeojson: sectionRecords.filter((record) => record.outputGeojson).length,
    sourceLedIds: officialSources.size,
    multiPartSections: sectionRecords.filter((record) => record.lineParts > 1).length,
    totalLengthKm: round(sectionRecords.reduce((sum, record) => sum + record.lengthKm, 0), 3),
    simplificationToleranceMeters: simplifyToleranceMeters
  },
  sourceDownloads: [...officialSources.values()].map((source) => ({
    ledId: source.ledId,
    statligLedIds: source.statligLedIds,
    ledNames: source.ledNames,
    outputPath: toProjectRelative(source.outputPath),
    featureCount: source.featureCount,
    sourceLineCount: source.sourceLineCount
  })),
  sectionRecords
};
await writeJson(path.join(normalizedRoot, "route-geometry-build.research.json"), buildReport);
await writeFile(
  path.join(geometryRoot, "README.md"),
  [
    "# Kungsleden candidate geometry",
    "",
    "Research-only candidate section geometry generated from official Naturvardsverket/Lansstyrelsen Leder WFS features.",
    "",
    "- Raw source downloads are stored under `source-downloads/` as filtered EPSG:3006 GeoJSON by `Led_ID`.",
    "- Section output GeoJSON files are stored under `sections/` in WGS84 `[longitude, latitude]` order.",
    "- The combined QA FeatureCollection is `kungsleden-candidate-section-geometries.geojson`.",
    "- The normalized build report is `normalized-candidate/route-geometry-build.research.json`.",
    "- Boat, rowboat, ferry, bus and village/hut access offsets are not invented as hiking linework; gaps are preserved as metadata and MultiLineString breaks.",
    "- Rebuild with `npm run data:candidate-geometry:kungsleden`.",
    ""
  ].join("\n")
);

console.log(`Built Kungsleden candidate geometry for ${sectionRecords.length} sections.`);
console.log(`Total candidate land/walking length: ${buildReport.summary.totalLengthKm} km`);
for (const record of sectionRecords) {
  console.log(`- ${record.sectionId}: ${record.lengthKm} km, ${record.geometryType}, ${record.lineParts} part(s)`);
}

function plan(sectionId, ledId) {
  return { sectionId, parts: [{ ledId }] };
}

async function fetchOfficialLedSource(ledId) {
  const sourceUrl = buildLedWfsUrl(ledId);
  const text = await fetchTextWithRetry(sourceUrl, `Leder Led_ID ${ledId}`);
  const sourceGeojson = JSON.parse(text);
  if (!Array.isArray(sourceGeojson.features) || sourceGeojson.features.length === 0) {
    throw new Error(`No official Leder features for Led_ID ${ledId}`);
  }
  const outputPath = path.join(sourceOutRoot, `leder-led-${ledId}-epsg3006.geojson`);
  await writeFile(outputPath, `${JSON.stringify(sourceGeojson)}\n`);

  const sourceLines3006 = sourceGeojson.features.flatMap((feature) => extractLines(feature.geometry));
  const sourceLinesWgs84 = sourceLines3006
    .map((line) => line.map((coordinate) => sweref99tmToWgs84(coordinate[0], coordinate[1])))
    .filter((line) => line.length >= 2);
  const sourceLines = sourceLinesWgs84.map((line) => removeConsecutiveDuplicates(line)).filter((line) => line.length >= 2);
  const properties = sourceGeojson.features.map((feature) => feature.properties ?? {});
  return {
    ledId,
    outputPath,
    sourceUrl,
    featureCount: sourceGeojson.features.length,
    sourceLineCount: sourceLines.length,
    sourceLines,
    statligLedIds: unique(properties.map((property) => property.Statlig_led_ID).filter(Boolean)),
    ledNames: unique(properties.map((property) => property.Lednamn || property.Statlig_led).filter(Boolean)),
    featureProperties: properties
  };
}

function buildLedWfsUrl(ledId) {
  const url = new URL("https://geodata.naturvardsverket.se/leder_friluftsliv/wfs");
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", "Leder_friluftsliv_WFS:LED");
  url.searchParams.set("outputFormat", "GEOJSON");
  url.searchParams.set("srsName", "EPSG:3006");
  url.searchParams.set(
    "filter",
    `<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0"><fes:PropertyIsEqualTo><fes:ValueReference>Led_ID</fes:ValueReference><fes:Literal>${ledId}</fes:Literal></fes:PropertyIsEqualTo></fes:Filter>`
  );
  return url.toString();
}

function clipSourceToAnchors(source, startAnchor, endAnchor) {
  const routed = routeSourceLinesBetweenAnchors(source.sourceLines, startAnchor, endAnchor);
  return {
    parts: routed.parts,
    direction: routed.direction,
    startSnap: summarizeSnap(startAnchor, routed.startSnap),
    endSnap: summarizeSnap(endAnchor, routed.endSnap),
    preservedBreaks: Math.max(0, routed.parts.length - 1),
    assemblyGaps: routed.assemblyGaps
  };
}

function routeSourceLinesBetweenAnchors(sourceLines, startAnchor, endAnchor) {
  const lines = sourceLines.map((line, index) => buildIndexedLine(line, index));
  const graph = buildEndpointGraph(lines);
  const startCandidates = projectAnchorToSourceLines(lines, startAnchor);
  const endCandidates = projectAnchorToSourceLines(lines, endAnchor);
  let bestRoute = null;

  for (const startSnap of startCandidates) {
    for (const endSnap of endCandidates) {
      const candidates = buildRouteCandidates(lines, graph, startSnap, endSnap);
      for (const candidate of candidates) {
        const score =
          candidate.costMeters +
          startSnap.distanceMeters * snapDistanceScoreWeight +
          endSnap.distanceMeters * snapDistanceScoreWeight;
        if (!bestRoute || score < bestRoute.score) {
          bestRoute = {
            ...candidate,
            score,
            startSnap,
            endSnap
          };
        }
      }
    }
  }

  if (!bestRoute || bestRoute.parts.length === 0) {
    throw new Error(`Cannot route official source lines between ${JSON.stringify(startAnchor)} and ${JSON.stringify(endAnchor)}`);
  }

  return {
    parts: bestRoute.parts,
    direction: bestRoute.direction,
    startSnap: bestRoute.startSnap,
    endSnap: bestRoute.endSnap,
    assemblyGaps: bestRoute.assemblyGaps
  };
}

function buildIndexedLine(line, index) {
  const coordinates = removeConsecutiveDuplicates(line);
  const cumulativeMeters = [0];
  for (let coordinateIndex = 1; coordinateIndex < coordinates.length; coordinateIndex += 1) {
    cumulativeMeters.push(cumulativeMeters.at(-1) + haversineMeters(coordinates[coordinateIndex - 1], coordinates[coordinateIndex]));
  }
  return {
    index,
    coordinates,
    cumulativeMeters,
    lengthMeters: cumulativeMeters.at(-1),
    startKey: coordinateKey(coordinates[0]),
    endKey: coordinateKey(coordinates.at(-1))
  };
}

function projectAnchorToSourceLines(lines, anchor) {
  const anchorPoint = anchorToLonLat(anchor);
  return lines
    .map((line) => {
      let best = null;
      for (let segmentIndex = 0; segmentIndex < line.coordinates.length - 1; segmentIndex += 1) {
        const start = line.coordinates[segmentIndex];
        const end = line.coordinates[segmentIndex + 1];
        const projected = projectPointToSegment(anchorPoint, start, end);
        const distanceMeters = haversineMeters(anchorPoint, projected.point);
        const segmentMeters = haversineMeters(start, end);
        const measureMeters = line.cumulativeMeters[segmentIndex] + segmentMeters * projected.t;
        if (!best || distanceMeters < best.distanceMeters) {
          best = {
            lineIndex: line.index,
            segmentIndex,
            point: projected.point,
            distanceMeters,
            measureMeters
          };
        }
      }
      return best;
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}

function buildRouteCandidates(lines, graph, startSnap, endSnap) {
  const candidates = [];
  const startLine = lines[startSnap.lineIndex];
  const endLine = lines[endSnap.lineIndex];

  if (startLine.index === endLine.index && Math.abs(startSnap.measureMeters - endSnap.measureMeters) > 0.5) {
    candidates.push(
      buildRouteFromSteps([
        {
          kind: "line",
          lineIndex: startLine.index,
          coordinates: sliceLineByMeasure(startLine, startSnap.measureMeters, endSnap.measureMeters),
          lengthMeters: Math.abs(endSnap.measureMeters - startSnap.measureMeters)
        }
      ], Math.abs(endSnap.measureMeters - startSnap.measureMeters), "same-source-line")
    );
  }

  if (startLine.index === endLine.index) return candidates.filter(Boolean);

  for (const startExit of buildExitOptions(startLine, startSnap)) {
    for (const endEntry of buildEntryOptions(endLine, endSnap)) {
      const graphRoute = shortestPath(graph, startExit.nodeKey, endEntry.nodeKey);
      if (!graphRoute) continue;
      candidates.push(
        buildRouteFromSteps(
          [startExit.step, ...graphRoute.edges, endEntry.step].filter(Boolean),
          startExit.costMeters + graphRoute.costMeters + endEntry.costMeters,
          "anchor-routed"
        )
      );
    }
  }

  return candidates.filter(Boolean);
}

function buildExitOptions(line, snap) {
  return [
    buildPartialOption(line, snap.measureMeters, 0, line.startKey),
    buildPartialOption(line, snap.measureMeters, line.lengthMeters, line.endKey)
  ];
}

function buildEntryOptions(line, snap) {
  return [
    buildPartialOption(line, 0, snap.measureMeters, line.startKey),
    buildPartialOption(line, line.lengthMeters, snap.measureMeters, line.endKey)
  ];
}

function buildPartialOption(line, fromMeasure, toMeasure, nodeKey) {
  const costMeters = Math.abs(toMeasure - fromMeasure);
  const coordinates = sliceLineByMeasure(line, fromMeasure, toMeasure);
  return {
    nodeKey,
    costMeters,
    step:
      costMeters > 0.5
        ? {
            kind: "line",
            lineIndex: line.index,
            coordinates,
            lengthMeters: costMeters
          }
        : null
  };
}

function buildEndpointGraph(lines) {
  const edgesByNode = new Map();
  const endpointRecords = [];
  for (const line of lines) {
    addGraphEdge(edgesByNode, line.startKey, {
      kind: "line",
      lineIndex: line.index,
      fromNode: line.startKey,
      toNode: line.endKey,
      costMeters: line.lengthMeters,
      lengthMeters: line.lengthMeters,
      coordinates: line.coordinates
    });
    addGraphEdge(edgesByNode, line.endKey, {
      kind: "line",
      lineIndex: line.index,
      fromNode: line.endKey,
      toNode: line.startKey,
      costMeters: line.lengthMeters,
      lengthMeters: line.lengthMeters,
      coordinates: [...line.coordinates].reverse()
    });
    endpointRecords.push(
      { nodeKey: line.startKey, lineIndex: line.index, coordinate: line.coordinates[0] },
      { nodeKey: line.endKey, lineIndex: line.index, coordinate: line.coordinates.at(-1) }
    );
  }

  for (let leftIndex = 0; leftIndex < endpointRecords.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < endpointRecords.length; rightIndex += 1) {
      const left = endpointRecords[leftIndex];
      const right = endpointRecords[rightIndex];
      if (left.nodeKey === right.nodeKey) continue;
      const gapMeters = haversineMeters(left.coordinate, right.coordinate);
      if (gapMeters > maxGapEdgeMeters) continue;
      addGraphEdge(edgesByNode, left.nodeKey, {
        kind: "gap",
        fromNode: left.nodeKey,
        toNode: right.nodeKey,
        fromSourceLineIndex: left.lineIndex,
        toSourceLineIndex: right.lineIndex,
        gapMeters,
        costMeters: gapMeters + gapEdgePenaltyMeters
      });
      addGraphEdge(edgesByNode, right.nodeKey, {
        kind: "gap",
        fromNode: right.nodeKey,
        toNode: left.nodeKey,
        fromSourceLineIndex: right.lineIndex,
        toSourceLineIndex: left.lineIndex,
        gapMeters,
        costMeters: gapMeters + gapEdgePenaltyMeters
      });
    }
  }

  return { edgesByNode };
}

function addGraphEdge(edgesByNode, nodeKey, edge) {
  if (!edgesByNode.has(nodeKey)) edgesByNode.set(nodeKey, []);
  edgesByNode.get(nodeKey).push(edge);
}

function shortestPath(graph, startKey, endKey) {
  if (startKey === endKey) return { costMeters: 0, edges: [] };
  const distances = new Map([[startKey, 0]]);
  const previous = new Map();
  const visited = new Set();

  while (true) {
    let currentKey = null;
    let currentDistance = Infinity;
    for (const [nodeKey, distance] of distances.entries()) {
      if (!visited.has(nodeKey) && distance < currentDistance) {
        currentKey = nodeKey;
        currentDistance = distance;
      }
    }
    if (!currentKey) return null;
    if (currentKey === endKey) break;
    visited.add(currentKey);

    for (const edge of graph.edgesByNode.get(currentKey) ?? []) {
      const nextDistance = currentDistance + edge.costMeters;
      if (nextDistance < (distances.get(edge.toNode) ?? Infinity)) {
        distances.set(edge.toNode, nextDistance);
        previous.set(edge.toNode, { fromNode: currentKey, edge });
      }
    }
  }

  const edges = [];
  let nodeKey = endKey;
  while (nodeKey !== startKey) {
    const entry = previous.get(nodeKey);
    if (!entry) return null;
    edges.push(entry.edge);
    nodeKey = entry.fromNode;
  }
  edges.reverse();
  return { costMeters: distances.get(endKey), edges };
}

function buildRouteFromSteps(steps, costMeters, direction) {
  const parts = [];
  const assemblyGaps = [];
  let currentLine = null;
  for (const step of steps) {
    if (step.kind === "gap") {
      if (currentLine?.length >= 2) parts.push(removeConsecutiveDuplicates(currentLine));
      currentLine = null;
      assemblyGaps.push({
        fromSourceLineIndex: step.fromSourceLineIndex,
        toSourceLineIndex: step.toSourceLineIndex,
        gapMeters: round(step.gapMeters, 1)
      });
      continue;
    }

    const line = removeConsecutiveDuplicates(step.coordinates);
    if (line.length < 2) continue;
    if (!currentLine) {
      currentLine = [...line];
    } else if (sameCoordinate(currentLine.at(-1), line[0])) {
      currentLine.push(...line.slice(1));
    } else {
      parts.push(removeConsecutiveDuplicates(currentLine));
      currentLine = [...line];
    }
  }
  if (currentLine?.length >= 2) parts.push(removeConsecutiveDuplicates(currentLine));
  if (parts.length === 0) return null;
  return { parts, assemblyGaps, costMeters, direction };
}

function sliceLineByMeasure(line, fromMeasure, toMeasure) {
  const forward = fromMeasure <= toMeasure;
  const lowMeasure = forward ? fromMeasure : toMeasure;
  const highMeasure = forward ? toMeasure : fromMeasure;
  const coordinates = [pointAtMeasure(line, lowMeasure)];

  for (let index = 1; index < line.coordinates.length - 1; index += 1) {
    const measure = line.cumulativeMeters[index];
    if (measure > lowMeasure && measure < highMeasure) coordinates.push(line.coordinates[index]);
  }

  coordinates.push(pointAtMeasure(line, highMeasure));
  const sliced = removeConsecutiveDuplicates(coordinates);
  return forward ? sliced : sliced.reverse();
}

function pointAtMeasure(line, measureMeters) {
  if (measureMeters <= 0) return line.coordinates[0];
  if (measureMeters >= line.lengthMeters) return line.coordinates.at(-1);

  for (let index = 1; index < line.coordinates.length; index += 1) {
    const previousMeasure = line.cumulativeMeters[index - 1];
    const nextMeasure = line.cumulativeMeters[index];
    if (measureMeters <= nextMeasure) {
      const segmentMeasure = nextMeasure - previousMeasure;
      const t = segmentMeasure === 0 ? 0 : (measureMeters - previousMeasure) / segmentMeasure;
      const start = line.coordinates[index - 1];
      const end = line.coordinates[index];
      return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
    }
  }

  return line.coordinates.at(-1);
}

function selectEndpointAnchor(section, endpointName) {
  const routePrimary = section.routeGeometry?.primaryCandidate ?? {};
  const endpoint = section.endpointCoordinates?.[endpointName] ?? {};
  const primaryCandidates =
    endpointName === "start"
      ? [routePrimary.sectionStart, routePrimary.start, routePrimary.storedEnd, routePrimary.fullLineStartCoordinates]
      : [routePrimary.sectionEnd, routePrimary.end, routePrimary.storedStart, routePrimary.fullLineEndCoordinates];
  for (const candidate of primaryCandidates) {
    const coordinate = normalizeLatLon(candidate);
    if (coordinate) return coordinate;
  }

  const endpointCandidates = [
    endpoint.routeLineCoordinate,
    endpoint.coordinates,
    endpoint.hutCoordinate,
    endpoint.ledstartCoordinate,
    endpoint.naturumCoordinate,
    ...(endpoint.alternateCoordinates ?? []).map((candidate) => candidate.coordinates)
  ];
  for (const candidate of endpointCandidates) {
    const coordinate = normalizeLatLon(candidate);
    if (coordinate) return coordinate;
  }
  throw new Error(`No ${endpointName} anchor for ${section.sectionId}`);
}

function buildSectionWarnings(sectionPlan, sourceParts) {
  const warnings = [];
  for (const part of sourceParts) {
    if (part.startSnap.distanceMeters > 200 || part.endSnap.distanceMeters > 200) {
      warnings.push(
        `Endpoint anchor is far from selected official line on part ${part.partIndex}: start ${part.startSnap.distanceMeters} m, end ${part.endSnap.distanceMeters} m. Treat as endpoint-zone/access metadata, not final navigation-grade snapping.`
      );
    }
    for (const gap of part.assemblyGaps.filter((gap) => gap.gapMeters > 100)) {
      warnings.push(`Official source multipart assembly has a ${gap.gapMeters} m break before source line ${gap.toSourceLineIndex}; do not interpret as invented hiking connector.`);
    }
  }
  if (sectionPlan.parts.length > 1) {
    const uniqueLedIds = unique(sectionPlan.parts.map((part) => part.ledId));
    warnings.push(
      uniqueLedIds.length > 1
        ? "Section is assembled from multiple official state-trail Led_ID features; preserve inter-feature handoff gaps as metadata/connectors."
        : "Section is assembled from multiple clipped official land/walking parts; preserve transport or endpoint gaps as metadata/connectors."
    );
  }
  return warnings;
}

function summarizeSnap(anchor, snap) {
  return {
    anchor,
    sourceLineIndex: snap.lineIndex,
    snappedPoint: roundCoordinate(snap.point),
    distanceMeters: round(snap.distanceMeters, 1),
    measureKm: round(snap.measureMeters / 1000, 3)
  };
}

function simplifyLine(line, toleranceMeters) {
  if (line.length <= 2 || toleranceMeters <= 0) return line.map(roundCoordinate);
  return douglasPeucker(line, toleranceMeters).map(roundCoordinate);
}

function douglasPeucker(points, toleranceMeters) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let maxIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointToSegmentMeters(points[index], points[0], points.at(-1));
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }
  if (maxDistance <= toleranceMeters) return [points[0], points.at(-1)];
  return [...douglasPeucker(points.slice(0, maxIndex + 1), toleranceMeters).slice(0, -1), ...douglasPeucker(points.slice(maxIndex), toleranceMeters)];
}

function pointToSegmentMeters(point, start, end) {
  const projection = projectPointToSegment(point, start, end);
  return haversineMeters(point, projection.point);
}

function projectPointToSegment(point, start, end) {
  const originLat = toRadians((start[1] + end[1]) / 2);
  const scaleX = 111320 * Math.cos(originLat);
  const scaleY = 110540;
  const px = (point[0] - start[0]) * scaleX;
  const py = (point[1] - start[1]) * scaleY;
  const vx = (end[0] - start[0]) * scaleX;
  const vy = (end[1] - start[1]) * scaleY;
  const length2 = vx * vx + vy * vy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, (px * vx + py * vy) / length2));
  return {
    t,
    point: [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]
  };
}

function sweref99tmToWgs84(easting, northing) {
  const axis = 6378137.0;
  const flattening = 1.0 / 298.257222101;
  const centralMeridian = toRadians(15.0);
  const scale = 0.9996;
  const falseNorthing = 0.0;
  const falseEasting = 500000.0;
  const e2 = flattening * (2.0 - flattening);
  const n = flattening / (2.0 - flattening);
  const aRoof = (axis / (1.0 + n)) * (1.0 + (n * n) / 4.0 + n ** 4 / 64.0);
  const delta1 = n / 2.0 - (2.0 * n * n) / 3.0 + (37.0 * n ** 3) / 96.0 - n ** 4 / 360.0;
  const delta2 = (n * n) / 48.0 + n ** 3 / 15.0 - (437.0 * n ** 4) / 1440.0;
  const delta3 = (17.0 * n ** 3) / 480.0 - (37.0 * n ** 4) / 840.0;
  const delta4 = (4397.0 * n ** 4) / 161280.0;
  const xi = (northing - falseNorthing) / (scale * aRoof);
  const eta = (easting - falseEasting) / (scale * aRoof);
  const xiPrime =
    xi -
    delta1 * Math.sin(2.0 * xi) * Math.cosh(2.0 * eta) -
    delta2 * Math.sin(4.0 * xi) * Math.cosh(4.0 * eta) -
    delta3 * Math.sin(6.0 * xi) * Math.cosh(6.0 * eta) -
    delta4 * Math.sin(8.0 * xi) * Math.cosh(8.0 * eta);
  const etaPrime =
    eta -
    delta1 * Math.cos(2.0 * xi) * Math.sinh(2.0 * eta) -
    delta2 * Math.cos(4.0 * xi) * Math.sinh(4.0 * eta) -
    delta3 * Math.cos(6.0 * xi) * Math.sinh(6.0 * eta) -
    delta4 * Math.cos(8.0 * xi) * Math.sinh(8.0 * eta);
  const phiStar = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime));
  const deltaLambda = Math.atan(Math.sinh(etaPrime) / Math.cos(xiPrime));
  const A = e2 + e2 * e2 + e2 ** 3 + e2 ** 4;
  const B = -((7.0 * e2 * e2 + 17.0 * e2 ** 3 + 30.0 * e2 ** 4) / 6.0);
  const C = (224.0 * e2 ** 3 + 889.0 * e2 ** 4) / 120.0;
  const D = -((4279.0 * e2 ** 4) / 1260.0);
  const latitude =
    phiStar + Math.sin(phiStar) * Math.cos(phiStar) * (A + B * Math.sin(phiStar) ** 2 + C * Math.sin(phiStar) ** 4 + D * Math.sin(phiStar) ** 6);
  const longitude = centralMeridian + deltaLambda;
  return [longitude * 180 / Math.PI, latitude * 180 / Math.PI];
}

function extractLines(geometry) {
  if (geometry?.type === "LineString") return [geometry.coordinates];
  if (geometry?.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function normalizeLatLon(value) {
  if (!value || typeof value !== "object") return null;
  const lat = Number(value.lat ?? value.latitude);
  const lon = Number(value.lon ?? value.lng ?? value.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function anchorToLonLat(anchor) {
  return [anchor.lon, anchor.lat];
}

function lineLengthMeters(line) {
  return line.slice(1).reduce((sum, point, index) => sum + haversineMeters(line[index], point), 0);
}

function haversineMeters(left, right) {
  const earthRadiusMeters = 6371008.8;
  const leftLat = toRadians(left[1]);
  const rightLat = toRadians(right[1]);
  const deltaLat = toRadians(right[1] - left[1]);
  const deltaLon = toRadians(right[0] - left[0]);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function roundCoordinate(coordinate) {
  return [round(coordinate[0], 7), round(coordinate[1], 7)];
}

function round(value, decimals) {
  return Number(value.toFixed(decimals));
}

function sameCoordinate(left, right) {
  return Boolean(left && right && Math.abs(left[0] - right[0]) < 1e-9 && Math.abs(left[1] - right[1]) < 1e-9);
}

function coordinateKey(coordinate) {
  return `${round(coordinate[0], 7)},${round(coordinate[1], 7)}`;
}

function removeConsecutiveDuplicates(line) {
  return line.filter((coordinate, index) => index === 0 || !sameCoordinate(coordinate, line[index - 1]));
}

function unique(values) {
  return [...new Set(values)];
}

async function fetchTextWithRetry(sourceUrl, label) {
  const maxAttempts = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          "user-agent": "hike-trails candidate data prep (research-only Kungsleden geometry builder)"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await delay(500 * attempt);
    }
  }
  throw new Error(`Failed to fetch ${label} after ${maxAttempts} attempts: ${lastError?.message ?? "unknown error"}`, { cause: lastError });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
