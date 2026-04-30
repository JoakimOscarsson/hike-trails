import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SECTIONS_DIR = path.join(ROOT, "sections");
const CANONICAL_DIR = path.join(ROOT, "geometry", "canonical");
const DRAW_READY_DIR = path.join(ROOT, "geometry", "draw-ready");
const INDEX_PATH = path.join(ROOT, "geometry", "geometry-index.research.json");
const ACCESS_DATE = "2026-04-30";
const DENSIFY_THRESHOLD_METERS = 250;
const DENSIFY_TARGET_STEP_METERS = 75;

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function distanceMeters(a, b) {
  const radius = 6371008.8;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pointToPosition(point) {
  if (point.ele === null || Number.isNaN(point.ele)) {
    return [round(point.lon), round(point.lat)];
  }
  return [round(point.lon), round(point.lat), round(point.ele, 2)];
}

function parseAttributes(attributeText) {
  const attributes = {};
  for (const match of attributeText.matchAll(/([A-Za-z_:.-]+)\s*=\s*["']([^"']+)["']/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function parseTrackPoints(segmentXml) {
  const points = [];
  for (const match of segmentXml.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g)) {
    const attributes = parseAttributes(match[1]);
    const eleMatch = match[2].match(/<ele>([^<]+)<\/ele>/);
    points.push({
      lat: Number(attributes.lat),
      lon: Number(attributes.lon),
      ele: eleMatch ? Number(eleMatch[1]) : null,
    });
  }
  return points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function parseGpx(gpxText) {
  const segments = [];
  const trackMatches = [...gpxText.matchAll(/<trk\b[^>]*>([\s\S]*?)<\/trk>/g)];
  for (const trackMatch of trackMatches) {
    const trackXml = trackMatch[1];
    const segmentMatches = [...trackXml.matchAll(/<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/g)];
    if (segmentMatches.length === 0) {
      const points = parseTrackPoints(trackXml);
      if (points.length > 0) segments.push(points);
      continue;
    }
    for (const segmentMatch of segmentMatches) {
      const points = parseTrackPoints(segmentMatch[1]);
      if (points.length > 0) segments.push(points);
    }
  }
  if (segments.length === 0) {
    const points = parseTrackPoints(gpxText);
    if (points.length > 0) segments.push(points);
  }
  return segments;
}

function firstOfficialGpxUrl(section) {
  const urls = [];
  const addUrl = (value) => {
    if (typeof value === "string" && value.includes("cdn.hoodin.com") && value.includes(".gpx")) {
      urls.push(value);
    }
  };

  for (const source of section.officialSources ?? []) {
    addUrl(source.url);
  }
  addUrl(section.routeGeometry?.officialGpx?.url);
  addUrl(section.routeGeometry?.officialGeometry?.officialGpx?.url);
  for (const file of section.routeGeometry?.geometryFiles ?? []) {
    if (file.sourceType === "official-gpx" || file.type === "official-gpx") {
      addUrl(file.url);
    }
  }
  for (const source of section.routeGeometry?.sources ?? []) {
    if (source.type === "official-gpx") addUrl(source.url);
  }

  return urls[0] ?? null;
}

function sectionSortKey(section) {
  const number = String(section.sectionNumber ?? "");
  const prefixOrder = { N: 1, M: 2, S: 3, K: 4 };
  const prefix = number.match(/^[A-Za-z]+/)?.[0] ?? "Z";
  const numeric = Number(number.match(/\d+/)?.[0] ?? 999);
  return `${String(prefixOrder[prefix] ?? 9).padStart(2, "0")}-${String(numeric).padStart(3, "0")}-${section.sectionId}`;
}

function analyzeSegments(segments) {
  let totalDistanceMeters = 0;
  let maxInternalGap = null;
  const internalGaps = [];
  const interSegmentGaps = [];
  let pointCount = 0;

  for (const segment of segments) {
    pointCount += segment.length;
    for (let index = 1; index < segment.length; index += 1) {
      const gapMeters = distanceMeters(segment[index - 1], segment[index]);
      totalDistanceMeters += gapMeters;
      if (!maxInternalGap || gapMeters > maxInternalGap.gapMeters) {
        maxInternalGap = {
          segmentIndex: segments.indexOf(segment),
          fromIndex: index - 1,
          toIndex: index,
          gapMeters,
          from: segment[index - 1],
          to: segment[index],
        };
      }
      if (gapMeters > DENSIFY_THRESHOLD_METERS) {
        internalGaps.push({
          segmentIndex: segments.indexOf(segment),
          fromIndex: index - 1,
          toIndex: index,
          gapMeters,
          from: segment[index - 1],
          to: segment[index],
        });
      }
    }
  }

  for (let index = 1; index < segments.length; index += 1) {
    const from = segments[index - 1][segments[index - 1].length - 1];
    const to = segments[index][0];
    interSegmentGaps.push({
      fromSegmentIndex: index - 1,
      toSegmentIndex: index,
      gapMeters: distanceMeters(from, to),
      from,
      to,
    });
  }

  const flatPoints = segments.flat();
  const lats = flatPoints.map((point) => point.lat);
  const lons = flatPoints.map((point) => point.lon);

  return {
    pointCount,
    totalDistanceMeters,
    computedDistanceKm: totalDistanceMeters / 1000,
    maxInternalGap,
    internalGaps,
    interSegmentGaps,
    bounds: {
      minLat: Math.min(...lats),
      minLon: Math.min(...lons),
      maxLat: Math.max(...lats),
      maxLon: Math.max(...lons),
    },
  };
}

function asGeoJson(section, source, segments, analysis, geometryVariant, repairSummary) {
  const lines = segments.map((segment) => segment.map(pointToPosition));
  return {
    type: "Feature",
    properties: {
      trailId: section.trailId,
      sectionId: section.sectionId,
      sectionNumber: section.sectionNumber,
      name: section.name,
      from: section.from,
      to: section.to,
      sourceType: "official-gpx",
      sourceUrl: source.url,
      sourceLastModified: source.lastModified,
      sourceEtag: source.etag,
      sourceSha256: source.sha256,
      accessed: ACCESS_DATE,
      geometryVariant,
      geometryProvenance:
        geometryVariant === "canonical-official"
          ? "Exact official GPX track/segment coordinates converted to GeoJSON."
          : "Official GPX coordinates converted to GeoJSON with linear densification only for long intra-segment jumps; official segment breaks are preserved.",
      coordinateOrder: "lon,lat[,ele]",
      segmentCount: segments.length,
      pointCount: analysis.pointCount,
      computedDistanceKm: round(analysis.computedDistanceKm, 3),
      maxInternalGapMeters: analysis.maxInternalGap ? round(analysis.maxInternalGap.gapMeters, 2) : null,
      repairSummary,
      runtimeImport: false,
    },
    geometry:
      lines.length === 1
        ? { type: "LineString", coordinates: lines[0] }
        : { type: "MultiLineString", coordinates: lines },
  };
}

function densifySegments(segments, internalGaps) {
  let insertedPointCount = 0;
  const gapKey = (gap) => `${gap.segmentIndex}:${gap.fromIndex}:${gap.toIndex}`;
  const gapsByKey = new Set(internalGaps.map(gapKey));
  const repairedSegments = segments.map((segment, segmentIndex) => {
    const nextSegment = [];
    for (let pointIndex = 0; pointIndex < segment.length; pointIndex += 1) {
      const point = segment[pointIndex];
      nextSegment.push(point);
      if (pointIndex === segment.length - 1) continue;
      if (!gapsByKey.has(`${segmentIndex}:${pointIndex}:${pointIndex + 1}`)) continue;

      const next = segment[pointIndex + 1];
      const gapMeters = distanceMeters(point, next);
      const insertions = Math.max(0, Math.ceil(gapMeters / DENSIFY_TARGET_STEP_METERS) - 1);
      for (let step = 1; step <= insertions; step += 1) {
        const fraction = step / (insertions + 1);
        const interpolated = {
          lat: point.lat + (next.lat - point.lat) * fraction,
          lon: point.lon + (next.lon - point.lon) * fraction,
          ele:
            point.ele !== null && next.ele !== null
              ? point.ele + (next.ele - point.ele) * fraction
              : null,
        };
        nextSegment.push(interpolated);
        insertedPointCount += 1;
      }
    }
    return nextSegment;
  });
  return { repairedSegments, insertedPointCount };
}

function classifyIssue(section, analysis, drawAnalysis, insertedPointCount) {
  const issues = [];
  if (analysis.internalGaps.length > 0) {
    issues.push({
      type: "long-internal-segment",
      severity: analysis.maxInternalGap.gapMeters > 1000 ? "high" : "medium",
      status: insertedPointCount > 0 ? "draw-ready-densified" : "canonical-preserved",
      maxGapMeters: round(analysis.maxInternalGap.gapMeters, 2),
      note:
        insertedPointCount > 0
          ? "Draw-ready geometry linearly densifies long intra-segment gaps without changing the official line shape; canonical geometry remains exact official GPX."
          : "Canonical geometry preserves official coordinates.",
    });
  }
  const materialBreaks = analysis.interSegmentGaps.filter((gap) => gap.gapMeters > 25);
  if (materialBreaks.length > 0) {
    issues.push({
      type: "official-multisegment-breaks",
      severity: materialBreaks.some((gap) => gap.gapMeters > 500) ? "high" : "medium",
      status: "preserved-as-breaks",
      count: materialBreaks.length,
      maxGapMeters: round(Math.max(...materialBreaks.map((gap) => gap.gapMeters)), 2),
      note: "Official GPX track/segment breaks are preserved as MultiLineString breaks. No invented connector geometry was added.",
    });
  }
  if (section.sectionId === "hallandsleden-asa-frillesas") {
    issues.push({
      type: "official-network-gap-after-section",
      severity: "high",
      status: "out-of-section-not-bridged",
      note: "K4 Frillesås does not currently connect to K5 Steninge in the official coastal inventory. This is a known official coastal network gap, not missing K4 or K5 geometry.",
    });
  }
  if (drawAnalysis.maxInternalGap && drawAnalysis.maxInternalGap.gapMeters > DENSIFY_THRESHOLD_METERS) {
    issues.push({
      type: "draw-ready-still-has-long-internal-gap",
      severity: "medium",
      status: "needs-manual-review",
      maxGapMeters: round(drawAnalysis.maxInternalGap.gapMeters, 2),
      note: "A long internal gap remains after draw-ready processing.",
    });
  }
  return issues;
}

async function loadSections() {
  const files = (await readdir(SECTIONS_DIR)).filter((file) => file.endsWith(".research.json"));
  const sections = [];
  for (const file of files) {
    const fullPath = path.join(SECTIONS_DIR, file);
    const section = JSON.parse(await readFile(fullPath, "utf8"));
    sections.push({ ...section, file });
  }
  sections.sort((a, b) => sectionSortKey(a).localeCompare(sectionSortKey(b)));
  return sections;
}

async function fetchGpx(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const text = await response.text();
  return {
    text,
    lastModified: response.headers.get("last-modified"),
    etag: response.headers.get("etag"),
    contentType: response.headers.get("content-type"),
    sha256: createHash("sha256").update(text).digest("hex"),
    byteLength: Buffer.byteLength(text),
  };
}

async function main() {
  await mkdir(CANONICAL_DIR, { recursive: true });
  await mkdir(DRAW_READY_DIR, { recursive: true });

  const sections = await loadSections();
  const index = {
    schemaVersion: 1,
    trailId: "hallandsleden",
    generatedAt: "2026-04-30T18:05:00Z",
    generatedBy: "data/research/candidate-trails/hallandsleden/geometry/build-candidate-geometry.mjs",
    scope: "Research-only candidate geometry artifacts under data/research/candidate-trails/hallandsleden/geometry. These are not runtime app data.",
    policy: {
      canonical: "Exact official GPX track/segment coordinates converted to GeoJSON. Use this for provenance and normalization.",
      drawReady: "Canonical geometry with only long intra-segment official jumps linearly densified for renderer compatibility. Official GPX track/segment breaks are preserved. Draw-ready coordinates added by densification are approximate and must not be treated as field-verified trail turns.",
      noInventedConnectors: true,
      densifyThresholdMeters: DENSIFY_THRESHOLD_METERS,
      densifyTargetStepMeters: DENSIFY_TARGET_STEP_METERS,
    },
    summary: {
      sectionCount: 0,
      officialGpxFetched: 0,
      canonicalGeojsonWritten: 0,
      drawReadyGeojsonWritten: 0,
      sectionsWithDrawReadyDensification: 0,
      sectionsWithOfficialBreaks: 0,
      sectionsWithOutOfSectionNetworkGaps: 1,
      unresolvedMissingGeometrySections: 0,
      canonicalMaxInternalGapMeters: null,
      drawReadyMaxInternalGapMeters: null,
      totalInsertedDrawReadyPoints: 0,
    },
    sections: [],
  };

  for (const section of sections) {
    const url = firstOfficialGpxUrl(section);
    if (!url) {
      throw new Error(`No official GPX URL found for ${section.sectionId}`);
    }

    const source = await fetchGpx(url);
    const segments = parseGpx(source.text);
    if (segments.length === 0) {
      throw new Error(`No GPX trackpoints parsed for ${section.sectionId}`);
    }
    const analysis = analyzeSegments(segments);
    const internalGaps = analysis.internalGaps;
    const { repairedSegments, insertedPointCount } = densifySegments(segments, internalGaps);
    const drawAnalysis = analyzeSegments(repairedSegments);

    const canonicalFile = `canonical/${section.sectionId}.geojson`;
    const drawReadyFile = `draw-ready/${section.sectionId}.geojson`;
    const canonicalRepairSummary = {
      insertedPointCount: 0,
      longInternalGapCount: internalGaps.length,
      officialSegmentBreakCount: analysis.interSegmentGaps.length,
      note: "Canonical geometry is exact official GPX converted to GeoJSON.",
    };
    const drawRepairSummary = {
      insertedPointCount,
      longInternalGapCountBefore: internalGaps.length,
      maxInternalGapMetersBefore: analysis.maxInternalGap ? round(analysis.maxInternalGap.gapMeters, 2) : null,
      maxInternalGapMetersAfter: drawAnalysis.maxInternalGap ? round(drawAnalysis.maxInternalGap.gapMeters, 2) : null,
      officialSegmentBreakCountPreserved: analysis.interSegmentGaps.length,
      note:
        insertedPointCount > 0
          ? "Long intra-segment jumps were linearly densified for drawing; official segment breaks were preserved."
          : "No densification was needed; draw-ready geometry equals canonical geometry.",
    };

    await writeFile(
      path.join(ROOT, "geometry", canonicalFile),
      `${JSON.stringify(asGeoJson(section, { url, ...source }, segments, analysis, "canonical-official", canonicalRepairSummary), null, 2)}\n`,
    );
    await writeFile(
      path.join(ROOT, "geometry", drawReadyFile),
      `${JSON.stringify(asGeoJson(section, { url, ...source }, repairedSegments, drawAnalysis, "draw-ready", drawRepairSummary), null, 2)}\n`,
    );

    const materialBreaks = analysis.interSegmentGaps.filter((gap) => gap.gapMeters > 25);
    const issues = classifyIssue(section, analysis, drawAnalysis, insertedPointCount);
    const sectionRecord = {
      sectionId: section.sectionId,
      sectionNumber: section.sectionNumber,
      name: section.name,
      officialGpxUrl: url,
      officialGpx: {
        lastModified: source.lastModified,
        etag: source.etag,
        contentType: source.contentType,
        byteLength: source.byteLength,
        sha256: source.sha256,
      },
      canonicalGeometry: {
        path: `data/research/candidate-trails/hallandsleden/geometry/${canonicalFile}`,
        geometryType: segments.length === 1 ? "LineString" : "MultiLineString",
        segmentCount: segments.length,
        pointCount: analysis.pointCount,
        computedDistanceKm: round(analysis.computedDistanceKm, 3),
        bounds: {
          minLat: round(analysis.bounds.minLat),
          minLon: round(analysis.bounds.minLon),
          maxLat: round(analysis.bounds.maxLat),
          maxLon: round(analysis.bounds.maxLon),
        },
        maxInternalGapMeters: analysis.maxInternalGap ? round(analysis.maxInternalGap.gapMeters, 2) : null,
        longInternalGaps: internalGaps.map((gap) => ({
          segmentIndex: gap.segmentIndex,
          fromIndex: gap.fromIndex,
          toIndex: gap.toIndex,
          gapMeters: round(gap.gapMeters, 2),
          from: { lat: round(gap.from.lat), lon: round(gap.from.lon) },
          to: { lat: round(gap.to.lat), lon: round(gap.to.lon) },
        })),
        officialSegmentBreaks: analysis.interSegmentGaps.map((gap) => ({
          fromSegmentIndex: gap.fromSegmentIndex,
          toSegmentIndex: gap.toSegmentIndex,
          gapMeters: round(gap.gapMeters, 2),
          from: { lat: round(gap.from.lat), lon: round(gap.from.lon) },
          to: { lat: round(gap.to.lat), lon: round(gap.to.lon) },
        })),
      },
      drawReadyGeometry: {
        path: `data/research/candidate-trails/hallandsleden/geometry/${drawReadyFile}`,
        geometryType: repairedSegments.length === 1 ? "LineString" : "MultiLineString",
        segmentCount: repairedSegments.length,
        pointCount: drawAnalysis.pointCount,
        insertedPointCount,
        computedDistanceKm: round(drawAnalysis.computedDistanceKm, 3),
        maxInternalGapMeters: drawAnalysis.maxInternalGap ? round(drawAnalysis.maxInternalGap.gapMeters, 2) : null,
      },
      importGeometryStatus:
        issues.length === 0
          ? "geometry-source-fixed-local-canonical-and-draw-ready"
          : "geometry-source-fixed-with-recorded-caveats",
      unresolvedMissingGeometry: false,
      canonicalGeometryReady: true,
      drawReadyGeometryReady: true,
      drawInstruction:
        materialBreaks.length > 0
          ? "Use draw-ready GeoJSON and preserve MultiLineString breaks; do not bridge official breaks without a future verified connector."
          : "Use draw-ready GeoJSON for display and canonical GeoJSON for provenance.",
      issues,
    };

    index.sections.push(sectionRecord);
  }

  index.summary.sectionCount = index.sections.length;
  index.summary.officialGpxFetched = index.sections.length;
  index.summary.canonicalGeojsonWritten = index.sections.length;
  index.summary.drawReadyGeojsonWritten = index.sections.length;
  index.summary.sectionsWithDrawReadyDensification = index.sections.filter(
    (section) => section.canonicalGeometry.longInternalGaps.length > 0,
  ).length;
  index.summary.sectionsWithOfficialBreaks = index.sections.filter(
    (section) => section.canonicalGeometry.officialSegmentBreaks.some((gap) => gap.gapMeters > 25),
  ).length;
  index.summary.sectionsWithGeometryCaveats = index.sections.filter((section) => section.issues.length > 0).length;
  index.summary.canonicalMaxInternalGapMeters = round(
    Math.max(...index.sections.map((section) => section.canonicalGeometry.maxInternalGapMeters ?? 0)),
    2,
  );
  index.summary.drawReadyMaxInternalGapMeters = round(
    Math.max(...index.sections.map((section) => section.drawReadyGeometry.maxInternalGapMeters ?? 0)),
    2,
  );
  index.summary.totalInsertedDrawReadyPoints = index.sections.reduce(
    (sum, section) => sum + section.drawReadyGeometry.insertedPointCount,
    0,
  );

  await writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
