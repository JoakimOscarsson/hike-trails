import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const candidateRoot = path.join(projectRoot, "data/research/candidate-trails");
const lastUpdated = "2026-04-30";

const shared = await readJson(path.join(candidateRoot, "shared-importer-decisions.research.json"));
const prep = await readJson(path.join(candidateRoot, "normalization-prep.research.json"));
const manifest = await readJson(path.join(candidateRoot, "manifest.json"));

const includedTrails = prep.scope.includedTrails;
const trailManifestById = new Map(manifest.trails.map((trail) => [trail.id, trail]));
const supplementalArtifactFiles = ["route-topology.research.json"];
const batchSummary = [];
const topologyFixRows = [];
const blockerTriageRows = [];

const topologyDecisionConfig = {
  bohusleden: {
    status: "candidate-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "bohusleden-stage-21-partial-route-model",
        fixNowItemRefs: ["hardBlockers-1"],
        decision:
          "Keep Stage 21 out of the default complete-route chain until authoritative complete linework exists; preserve the researched partial/self-navigation span as explicit candidate metadata."
      }
    ],
    routeGroups: [
      {
        groupId: "bohusleden-southern-chain",
        kind: "mainline",
        sectionOrders: [1, 2, 3, 4, 5, 6, 7, 8],
        status: "candidate-importable-after-geometry-validation",
        notes: "Stages 1-8 form the southern walked chain ending at Bottenstugan."
      },
      {
        groupId: "bohusleden-middle-chain",
        kind: "mainline",
        sectionOrders: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        status: "candidate-importable-after-geometry-validation",
        notes: "Stages 9-20 resume from Bottenstugan and stop before the partial Stage 21 span."
      },
      {
        groupId: "bohusleden-northern-chain",
        kind: "mainline",
        sectionOrders: [22, 23, 24, 25, 26, 27],
        status: "candidate-importable-after-geometry-validation",
        notes: "Stages 22-27 remain a separate northern chain unless runtime UX can show the Stage 21 gap clearly."
      },
      {
        groupId: "bohusleden-stage-21-partial",
        kind: "branch",
        sectionOrders: [21],
        status: "research-only-partial-self-navigation",
        notes: "Not eligible for ordinary complete-route import under the shared partial/self-navigation policy."
      }
    ],
    connections: [
      {
        connectionId: "bohusleden-stage-8-to-9-bottenstugan",
        fromSectionOrder: 8,
        toSectionOrder: 9,
        mode: "walk",
        status: "reviewed-short-walk-connection-needed",
        distanceMetersApprox: 49.4,
        importPolicy: "Represent as an explicit reviewed walk connection if runtime route graph support is used; do not silently move endpoints."
      },
      {
        connectionId: "bohusleden-stage-21-to-22-known-gap",
        fromSectionOrder: 21,
        toSectionOrder: 22,
        mode: "none",
        status: "known-gap",
        distanceMetersApprox: 4296.3,
        importPolicy: "Do not bridge or auto-route; show Stage 21/22 separation visibly if partial Stage 21 is ever exposed."
      }
    ],
    remainingGeometryWork: [
      "Validate candidate GeoJSON for Stages 1-20 and 22-27 before runtime import.",
      "Stage 21 still requires authoritative complete geometry or explicit missing-route runtime UX before it can be shown as a route section."
    ],
    triageResolvedSourceIds: ["hardBlockers-1"],
    triageResolvedAction:
      "Route topology now models Stage 21 as research-only partial/self-navigation and keeps the southern, middle and northern chains separate instead of treating Stage 21 as complete."
  },
  hallandsleden: {
    status: "candidate-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "hallandsleden-k4-k5-official-gap",
        fixNowItemRefs: ["hardBlockers-3"],
        decision:
          "Treat the K4 Frillesas to K5 Steninge break as an official network gap, not a missing connector to invent."
      }
    ],
    routeGroups: [
      { groupId: "hallandsleden-norra", kind: "mainline", sectionRefs: ["N1", "N2", "N3", "N4", "N5", "N6", "N7"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-varberg-branch", kind: "branch", sectionRefs: ["N8"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-mellersta-west", kind: "mainline", sectionRefs: ["M1", "M2", "M3", "M4", "M5", "M6"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-mellersta-east", kind: "branch", sectionRefs: ["M7", "M8"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-sodra-west", kind: "mainline", sectionRefs: ["S1", "S2", "S4", "S5"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-sodra-gyltige-branch", kind: "branch", sectionRefs: ["S3"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-sodra-east", kind: "branch", sectionRefs: ["S6", "S7", "S8", "S9"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-kustleden-north", kind: "mainline", sectionRefs: ["K1", "K2", "K3", "K4"], status: "candidate-topology-explicit" },
      { groupId: "hallandsleden-kustleden-south", kind: "mainline", sectionRefs: ["K5", "K6", "K7", "K8", "K9", "K10"], status: "candidate-topology-explicit" }
    ],
    connections: [
      {
        connectionId: "hallandsleden-k4-to-k5-official-gap",
        fromSectionRef: "K4",
        toSectionRef: "K5",
        mode: "none",
        status: "official-network-gap",
        importPolicy: "Keep visible as two coastal chains unless an official connector is later published."
      },
      {
        connectionId: "hallandsleden-akulla-junction",
        mode: "walk",
        status: "shared-junction-node-candidate",
        importPolicy: "Use shared-node topology at Akulla/Ästad/Byasjön/Kvarnforsen/Gyltige/Frodeparken/Oskarström/Koarp only after preserving original endpoints in provenance."
      }
    ],
    remainingGeometryWork: ["Run protected-area and water-protection GIS overlays against the selected canonical lines before public rule warnings."],
    triageResolvedSourceIds: ["hardBlockers-3"],
    triageResolvedAction: "Route topology now preserves K4-K5 as an explicit official network gap with separate coastal route groups."
  },
  hogakustenleden: {
    status: "candidate-display-and-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "hogakustenleden-section-2-distance-display",
        fixNowItemRefs: ["hogakustenleden-section-2-distance-display"],
        decision: "Use the Höga Kusten 26.8 km section distance for display while preserving Naturkartan/GPX contradictions as metadata."
      },
      {
        id: "hogakustenleden-section-7-difficulty-display",
        fixNowItemRefs: ["hogakustenleden-section-7-difficulty"],
        decision: "Prefer the conservative Naturkartan red/krävande difficulty while preserving the Höga Kusten Medel caveat."
      }
    ],
    routeGroups: [{ groupId: "hogakustenleden-mainline", kind: "mainline", allSections: true, status: "candidate-topology-explicit" }],
    connections: [],
    displayPolicies: [
      {
        scope: "section-2",
        displayDistanceKm: 26.8,
        contradictionPolicy: "Preserve alternate source/computed distances in distanceCaveats."
      },
      {
        scope: "section-7",
        displayDifficulty: "red/krävande",
        contradictionPolicy: "Keep Höga Kusten Medel as a source caveat."
      }
    ],
    remainingGeometryWork: ["Build final candidate geometry artifacts and run protected-area clipping before runtime import."],
    triageResolvedSourceIds: ["hogakustenleden-section-2-distance-display", "hogakustenleden-section-7-difficulty"],
    triageResolvedAction: "Display policy is now explicit in route-topology.research.json while source contradictions remain preserved."
  },
  hoglandsleden: {
    status: "candidate-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "hoglandsleden-route-builder-topology",
        fixNowItemRefs: ["decision-1"],
        decision:
          "Model Höglandsleden as a main loop with official branches rather than one undifferentiated chain: HÖ3 as the Mariannelund branch and HÖ18-HÖ23 as the Tomtabacken-Kärringabacka branch."
      }
    ],
    routeGroups: [
      {
        groupId: "hoglandsleden-main-loop",
        kind: "mainline",
        sectionOrders: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        status: "candidate-topology-explicit",
        notes: "Main loop/primary official chain through Skuruhatt, Valbacken, Sävsjö, Vikskvarn, Ränneborg and back to Skuruhatt."
      },
      {
        groupId: "hoglandsleden-mariannelund-branch",
        kind: "branch",
        sectionOrders: [3],
        status: "candidate-topology-explicit",
        notes: "Official branch from Valbacken to Mariannelund."
      },
      {
        groupId: "hoglandsleden-tomtabacken-karringabacka-branch",
        kind: "branch",
        sectionOrders: [18, 19, 20, 21, 22, 23],
        status: "candidate-topology-explicit",
        notes: "Official branch from Vikskvarn through Tomtabacken, Hok, Byarum and Skillingaryd to Kärringabacka."
      }
    ],
    connections: [
      {
        connectionId: "hoglandsleden-valbacken-branch-junction",
        fromSectionOrder: 2,
        toSectionOrder: 3,
        mode: "walk",
        status: "official-branch-junction",
        importPolicy: "Represent HÖ3 as a branch from the Valbacken junction."
      },
      {
        connectionId: "hoglandsleden-vikskvarn-branch-junction",
        fromSectionOrder: 14,
        toSectionOrder: 18,
        mode: "walk",
        status: "official-branch-junction",
        importPolicy: "Represent HÖ18-HÖ23 as the Tomtabacken/Kärringabacka branch from Vikskvarn."
      }
    ],
    remainingGeometryWork: ["Complete candidate geometry package for the selected route groups before runtime import."],
    triageResolvedSourceIds: ["decision-1"],
    triageResolvedAction: "Route-builder topology is now fixed as main loop plus Mariannelund and Tomtabacken-Kärringabacka branches."
  },
  kungsleden: {
    status: "candidate-topology-recorded-needs-geometry-and-source-policy",
    decisionsApplied: [
      {
        id: "kungsleden-selected-section-chain",
        decision:
          "Keep the researched 27-section chain as the candidate topology, with non-walk transfers and water/road crossings represented as explicit connector metadata during the later importer pass."
      }
    ],
    routeGroups: [{ groupId: "kungsleden-mainline", kind: "mainline", allSections: true, status: "candidate-topology-recorded" }],
    connections: [],
    remainingGeometryWork: [
      "Transform EPSG:3006 official geometry to WGS84, assemble multi-part lines, apply endpoint-zone snapping policy and reverse directions where needed.",
      "Resolve source-policy and connector taxonomy decisions before runtime import."
    ]
  },
  nordkalottleden: {
    status: "candidate-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "nordkalottleden-endpoint-zone-policy",
        fixNowItemRefs: ["blocker-2", "blocker-3", "blocker-4", "blocker-5", "decision-2", "decision-4"],
        decision:
          "Keep the researched 12-section model as the candidate mainline and represent Saarijärvi, Saraelv/Ovi Raishiin, Madam Bongos/Čunovuohppi and the section 6 source-boundary mismatch as explicit endpoint-zone/known-gap metadata."
      }
    ],
    routeGroups: [{ groupId: "nordkalottleden-mainline-12-section-model", kind: "mainline", allSections: true, status: "candidate-topology-explicit" }],
    connections: [
      {
        connectionId: "nordkalottleden-saarijarvi-hut-yard-offset",
        fromSectionOrder: 1,
        toSectionOrder: 2,
        mode: "none",
        status: "endpoint-zone-metadata",
        distanceMetersApprox: 152.3,
        importPolicy: "Do not invent a hut-yard connector; expose hut access only as endpoint/access metadata if supported."
      },
      {
        connectionId: "nordkalottleden-section-6-source-boundary",
        fromSectionOrder: 6,
        toSectionOrder: 7,
        mode: "walk",
        status: "source-boundary-gap-needs-review",
        distanceMetersApprox: 36.8,
        importPolicy: "Preserve the mixed-source boundary and review before creating any shared route graph node."
      },
      {
        connectionId: "nordkalottleden-saraelv-ovi-raishiin-endpoint-zone",
        fromSectionOrder: 7,
        toSectionOrder: 8,
        mode: "none",
        status: "compound-endpoint-zone",
        distanceMetersApprox: 1003.9,
        importPolicy: "Do not draw a seamless line from Saraelv to Ovi Raishiin without separately sourced connector geometry."
      },
      {
        connectionId: "nordkalottleden-madam-bongos-legacy-endpoint",
        fromSectionOrder: 11,
        toSectionOrder: 12,
        mode: "none",
        status: "legacy-place-access-metadata",
        distanceMetersApprox: 65.4,
        importPolicy: "Treat Madam Bongos/Čunovuohppi as legacy endpoint/access metadata, never as active lodging."
      }
    ],
    remainingGeometryWork: [
      "Review the section 6 source-boundary gap before creating runtime graph nodes.",
      "Keep alternate whole-trail variants outside the 12-section model as a scope limitation."
    ],
    triageResolvedSourceIds: ["blocker-2", "blocker-3", "blocker-4", "blocker-5", "decision-2", "decision-4"],
    triageResolvedAction:
      "Endpoint/connector policy is now explicit: hut-yard and legacy lodging offsets stay metadata, Saraelv/Ovi remains a compound endpoint gap, and no seamless connector is invented."
  },
  ostkustleden: {
    status: "candidate-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "ostkustleden-etapp-8-cabin-gap-policy",
        fixNowItemRefs: ["decision-1"],
        decision:
          "Keep the 156.4 m Etapp 8 official-GPX-to-Lilla-Hycklinge-cabin gap as metadata only unless a separate authoritative access leg is sourced."
      },
      {
        id: "ostkustleden-candidate-geometry-prototype-scope",
        fixNowItemRefs: ["decision-3"],
        decision:
          "Approve candidate-only geometry normalization under the research folder; runtime source data remains untouched until a separate import task."
      }
    ],
    routeGroups: [{ groupId: "ostkustleden-main-ring", kind: "mainline", allSections: true, status: "candidate-topology-explicit" }],
    connections: [
      {
        connectionId: "ostkustleden-etapp-8-to-lilla-hycklinge-cabin",
        fromSectionOrder: 8,
        toSectionOrder: 1,
        mode: "none",
        status: "metadata-only-cabin-gap",
        distanceMetersApprox: 156.4,
        importPolicy: "Do not add an access leg to the default route until separately sourced."
      }
    ],
    remainingGeometryWork: ["Run boundary-sensitive GIS overlays against final normalized ring geometry."],
    triageResolvedSourceIds: ["decision-1", "decision-3"],
    triageResolvedAction: "Route topology now keeps the Etapp 8 cabin gap as metadata and approves candidate-only prototype work."
  },
  padjelantaleden: {
    status: "candidate-display-and-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "padjelantaleden-headline-distance-policy",
        fixNowItemRefs: ["decision-1"],
        decision:
          "Do not publish a single official headline distance yet; use section-level display distances and preserve the 140/150/150-160/160 km source claims until geometry split review."
      }
    ],
    routeGroups: [{ groupId: "padjelantaleden-mainline", kind: "mainline", allSections: true, status: "candidate-topology-explicit" }],
    connections: [
      {
        connectionId: "padjelantaleden-ritsem-akka-boat-access",
        fromSectionOrder: 1,
        mode: "boat",
        status: "access-connector-metadata",
        importPolicy: "Keep M/S Storlule and trailhead boat access as connector/access metadata, not walking route geometry."
      },
      {
        connectionId: "padjelantaleden-kvikkjokk-bobacken-boat-access",
        fromSectionOrder: 10,
        mode: "boat",
        status: "access-connector-metadata",
        importPolicy: "Keep Kvikkjokk-Bobäcken boat logistics in the description/connector layer until runtime connector support exists."
      }
    ],
    displayPolicies: [
      {
        scope: "whole-trail",
        displayDistanceKm: null,
        contradictionPolicy: "Suppress single headline total; show section distances and source-claim caveats."
      }
    ],
    remainingGeometryWork: ["Complete geometry split review and connector/runtime schema work for boats, helicopter access and alternates."],
    triageResolvedSourceIds: ["decision-1"],
    triageResolvedAction: "Distance policy now suppresses a single headline total and keeps contradictory whole-trail claims as metadata."
  },
  sjuharadsleden: {
    status: "candidate-topology-recorded-needs-geometry-normalization",
    decisionsApplied: [
      {
        id: "sjuharadsleden-mainline-selected",
        decision:
          "Keep the researched 10-section mainline order, while leaving section 6 cleanup and section 7 densification as real geometry work before runtime import."
      }
    ],
    routeGroups: [{ groupId: "sjuharadsleden-mainline", kind: "mainline", allSections: true, status: "candidate-topology-recorded" }],
    connections: [],
    remainingGeometryWork: [
      "Normalize section 6 Rölle duplicate/parallel/spur artifacts into one mainline.",
      "Densify/resample the known section 7 simplified chord before runtime route import."
    ]
  },
  tjustleden: {
    status: "candidate-topology-recorded-needs-runtime-schema",
    decisionsApplied: [
      {
        id: "tjustleden-mainline-and-tail-policy",
        decision:
          "Keep the researched 9-section mainline and preserve terminal tails/connectors explicitly instead of trimming or silently merging them."
      }
    ],
    routeGroups: [{ groupId: "tjustleden-mainline", kind: "mainline", allSections: true, status: "candidate-topology-recorded" }],
    connections: [],
    remainingGeometryWork: ["Finalize normalized geometry before overlays and runtime route import."]
  },
  "vastra-vatterleden": {
    status: "candidate-topology-decisions-applied",
    decisionsApplied: [
      {
        id: "vastra-vatterleden-candidate-prototype-scope",
        fixNowItemRefs: ["decision-3"],
        decision:
          "Approve candidate-only route/connector geometry prototype scope: stage variants and child components may be normalized under research artifacts only; runtime source data remains untouched."
      }
    ],
    routeGroups: [
      { groupId: "vastra-vatterleden-mainline", kind: "mainline", allSections: true, status: "candidate-topology-explicit" },
      {
        groupId: "vastra-vatterleden-stage-1-alternate",
        kind: "branch",
        sectionOrders: [1],
        status: "variant-metadata",
        notes: "Stage 1 primary/alternate variants must remain explicit during geometry normalization."
      },
      {
        groupId: "vastra-vatterleden-stage-2-skackastugan-alternate",
        kind: "branch",
        sectionOrders: [2],
        status: "variant-metadata",
        notes: "Stage 2 direct line is primary; Skackastugan remains an alternate branch."
      }
    ],
    connections: [
      {
        connectionId: "vastra-vatterleden-stage-7-fagerhult-access",
        fromSectionOrder: 7,
        toSectionOrder: 8,
        mode: "walk",
        status: "mainline-access-split",
        importPolicy: "Treat Gagnån as the mainline handoff and Fagerhult as access/connector metadata unless final geometry proves otherwise."
      },
      {
        connectionId: "vastra-vatterleden-stage-8-child-components",
        fromSectionOrder: 8,
        mode: "walk",
        status: "child-geometry-components",
        importPolicy: "Keep stage 8 child GPX components under one section and normalize Furusjö-Mullsjö Hotell direction to the official endpoint."
      }
    ],
    remainingGeometryWork: [
      "Implement stage 1 variants, stage 2 alternate, stages 3-5 assembly/reversal, stage 7 access split and stage 8 child components before runtime route import.",
      "Run protected-area overlays against the final normalized geometry."
    ],
    triageResolvedSourceIds: ["decision-3"],
    triageResolvedAction: "Candidate-only geometry prototype scope is now approved and explicitly barred from writing runtime source data."
  },
  vikingaleden: {
    status: "candidate-topology-recorded-needs-overlap-dedupe",
    decisionsApplied: [
      {
        id: "vikingaleden-overlap-alias-policy",
        decision:
          "Keep the 12-section Vikingaleden candidate topology while preserving sections 7-12 as Upplandsleden overlap aliases for the later dedupe/import pass."
      }
    ],
    routeGroups: [
      { groupId: "vikingaleden-mainline", kind: "mainline", sectionOrders: [1, 2, 3, 4, 5, 6], status: "candidate-topology-recorded" },
      { groupId: "vikingaleden-upplandsleden-overlap", kind: "branch", sectionOrders: [7, 8, 9, 10, 11, 12], status: "overlap-alias-metadata" }
    ],
    connections: [],
    remainingGeometryWork: ["Run Upplandsleden overlap dedupe for sections 7-12 before runtime import."]
  }
};

const policyDecisionConfig = {
  hoglandsleden: {
    triageResolvedSourceIds: ["decision-3"],
    action:
      "Shared trail-specific decisions now include the Höglandsleden service scope: commercial/bookable services are caveated metadata, and weak rural transit remains access metadata unless current useful service is verified."
  },
  kungsleden: {
    triageResolvedSourceIds: ["decision-4"],
    action:
      "Shared trail-specific decisions now define the Kungsleden facility taxonomy for hut clusters, child amenities, transport, services, water, bridges, viewpoints, Naturum, parking and pending unverified subfacilities."
  },
  nordkalottleden: {
    triageResolvedSourceIds: ["decision-5"],
    action:
      "Shared trail-specific decisions now use per-section or per-country warnings for Finland/Norway/Sweden rule differences and reserve route-level warnings for whole-model facts."
  },
  "vastra-vatterleden": {
    triageResolvedSourceIds: ["decision-1", "decision-2"],
    action:
      "Shared trail-specific decisions now scope optional businesses as caveated side-service/access metadata and keep Rankåsleden/regional long-distance links as future connector metadata unless explicitly selected."
  },
  vikingaleden: {
    triageResolvedSourceIds: ["blocker-1"],
    action:
      "The existing Vikingaleden trail.research.json is now explicitly accepted as the candidate trail overview for this prep pass; later official overview refreshes can update metadata without blocking normalization."
  }
};

for (const trailId of includedTrails) {
  const trailRoot = path.join(candidateRoot, trailId);
  const normalizedRoot = path.join(trailRoot, "normalized-candidate");
  await mkdir(normalizedRoot, { recursive: true });

  const handoff = await readJson(path.join(trailRoot, "normalization-handoff.research.json"));
  const sections = await readSections(trailRoot);
  const geojsonFiles = (await walkFiles(trailRoot))
    .filter((filePath) => filePath.endsWith(".geojson") && !filePath.includes(`${path.sep}normalized-candidate${path.sep}`))
    .map((filePath) => toProjectRelative(filePath));

  const routeSections = buildRouteSections(trailId, sections, handoff);
  const geometryIndex = buildGeometryIndex(trailId, sections, handoff, geojsonFiles);
  const routeTopology = buildRouteTopology(trailId, routeSections, handoff);
  const facilities = buildFacilities(trailId, sections);
  const ruleWarnings = buildRuleWarnings(trailId, sections, handoff);
  const importReport = buildImportReport(trailId, handoff, routeSections, geometryIndex, routeTopology, facilities, ruleWarnings);

  await writeJson(path.join(normalizedRoot, "route-sections.research.json"), routeSections);
  await writeJson(path.join(normalizedRoot, "route-geometry-index.research.json"), geometryIndex);
  await writeJson(path.join(normalizedRoot, "route-topology.research.json"), routeTopology);
  await writeJson(path.join(normalizedRoot, "facilities.research.json"), facilities);
  await writeJson(path.join(normalizedRoot, "rule-warnings.research.json"), ruleWarnings);
  await writeJson(path.join(normalizedRoot, "import-report.research.json"), importReport);

  batchSummary.push({
    trailId,
    sectionCount: routeSections.sections.length,
    geometrySectionsWithCandidateGeojson: geometryIndex.sections.filter((section) => section.candidateGeojsonFiles.length > 0).length,
    facilityRecords: facilities.records.length,
    importedFacilityCandidates: facilities.summary.byState.normal ?? 0,
    pendingFacilityCandidates: facilities.summary.byState["pending-review"] ?? 0,
    suppressedFacilityCandidates: facilities.summary.byState.suppress ?? 0,
    ruleWarningRecords: ruleWarnings.records.length,
    topologyDecisions: routeTopology.decisionsApplied.length,
    routeGroups: routeTopology.routeGroups.length,
    topologyConnections: routeTopology.connections.length,
    blockerCount: importReport.blockers.length,
    openDecisionCount: importReport.openDecisions.length,
    triageSummary: importReport.triageSummary
  });
  topologyFixRows.push({
    trailId,
    status: routeTopology.status,
    decisionsApplied: routeTopology.decisionsApplied,
    routeGroups: routeTopology.routeGroups,
    connections: routeTopology.connections,
    displayPolicies: routeTopology.displayPolicies,
    remainingGeometryWork: routeTopology.remainingGeometryWork
  });
  blockerTriageRows.push({
    trailId,
    triageSummary: importReport.triageSummary,
    fixesAppliedNow: importReport.fixesAppliedNow,
    nextFixNow: importReport.fixNowBeforeRuntimeImport,
    deferred: importReport.deferredBeforeRuntimeImport,
    runtimeSchemaNeeded: importReport.runtimeSchemaNeeded,
    items: importReport.blockerTriage
  });
}

await writeJson(path.join(candidateRoot, "phase3-candidate-artifacts.research.json"), {
  schemaVersion: "candidate-normalization-phase3-report/v1",
  lastUpdated,
  status: "complete-initial-candidate-artifacts",
  purpose: "Batch summary for candidate-only normalized artifacts generated from research packets.",
  runtimeImportApproved: false,
  artifactRootPattern: "data/research/candidate-trails/<trail-id>/normalized-candidate/",
  artifactFiles: shared.resolvedSharedDecisions.candidateArtifactLayout.minimumArtifacts,
  supplementalArtifactFiles,
  includedTrails: batchSummary,
  nextActions: [
    "Work the fix-now queue in blocker-triage.research.json before runtime import work.",
    "Prioritize candidate geometry builds, topology/connectors, facility dedupe and GIS overlays.",
    "Run GIS overlays and live publication checks before user-facing rule warnings.",
    "Keep pending-review and suppress facility records out of runtime output."
  ]
});

await writeJson(path.join(candidateRoot, "geometry-topology-fix-pass.research.json"), {
  schemaVersion: "candidate-geometry-topology-fix-pass/v1",
  lastUpdated,
  status: "topology-decisions-applied",
  purpose:
    "First fix-now pass for candidate trails: make route topology, known gaps, connector policies, and display-distance decisions explicit before runtime import work.",
  runtimeImportApproved: false,
  artifactRootPattern: "data/research/candidate-trails/<trail-id>/normalized-candidate/route-topology.research.json",
  includedTrails: topologyFixRows,
  remainingFixNowCategories: [
    "Actual candidate GeoJSON assembly/normalization where the selected topology still lacks route linework.",
    "GIS overlays against final normalized geometry for protected-area and restriction warnings.",
    "Facility dedupe and taxonomy passes where the blocker is about POI clustering rather than route topology."
  ]
});

const triageItems = blockerTriageRows.flatMap((row) => row.items);
await writeJson(path.join(candidateRoot, "blocker-triage.research.json"), {
  schemaVersion: "candidate-blocker-triage/v1",
  lastUpdated,
  status: "triaged-fix-now-biased",
  purpose: "Review of normalized-candidate import report blockers with a bias toward fixing candidate-prep issues now and deferring only runtime, external, or publication-time work.",
  runtimeImportApproved: false,
  dispositionDefinitions: {
    "resolved-now": "Fixed or resolved during this candidate-prep pass, usually by shared decisions, candidate artifact state, or documentation cleanup.",
    "fix-now": "Actionable repository work that should be done before runtime import and does not inherently require publication-day data.",
    "runtime-schema-needed": "Requires runtime importer or app schema support before it can be fully resolved.",
    "external-source-approval": "Requires source licensing, API credentials, or official/source confirmation outside this repo.",
    "defer-publication-time": "Must be checked close to user-facing publication because the fact is volatile.",
    "runtime-integration-task": "Intentionally waits for an explicit runtime import task.",
    "scope-limitation": "Accepted scope boundary for this candidate import model."
  },
  summary: countBy(triageItems, "disposition"),
  fixNowCount: triageItems.filter((item) => item.disposition === "fix-now").length,
  resolvedNowCount: triageItems.filter((item) => item.disposition === "resolved-now").length,
  trails: blockerTriageRows
});

console.log(`Built normalized candidate artifacts for ${batchSummary.length} trails.`);
for (const row of batchSummary) {
  console.log(
    `- ${row.trailId}: ${row.sectionCount} sections, ${row.facilityRecords} facility records, ${row.ruleWarningRecords} rule warnings`
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function pathExists(filePath) {
  try {
    await readdir(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root) {
  const files = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en", { numeric: true }));
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filePath);
      else if (entry.isFile()) files.push(filePath);
    }
  }

  await walk(root);
  return files;
}

async function readSections(trailRoot) {
  const sectionRoot = path.join(trailRoot, "sections");
  if (!(await pathExists(sectionRoot))) return [];
  const files = (await readdir(sectionRoot))
    .filter((fileName) => fileName.endsWith(".research.json"))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
  const sections = [];
  for (const fileName of files) {
    const sourceFile = path.join(sectionRoot, fileName);
    const data = await readJson(sourceFile);
    sections.push({ data, sourceFile: toProjectRelative(sourceFile) });
  }
  sections.sort(compareSectionRecords);
  return sections;
}

function compareSectionRecords(left, right) {
  const leftKey = sectionSortKey(left.data);
  const rightKey = sectionSortKey(right.data);
  return leftKey.localeCompare(rightKey, "en", { numeric: true });
}

function sectionSortKey(section) {
  const id = getSectionId(section);
  const sectionNumber = section.sectionNumber ?? section.section?.sectionNumber;
  if (typeof sectionNumber === "number") return String(sectionNumber).padStart(4, "0");
  if (typeof sectionNumber === "string") {
    const prefixOrder = new Map([
      ["N", "01"],
      ["M", "02"],
      ["S", "03"],
      ["K", "04"],
      ["HO", "05"]
    ]);
    const match = sectionNumber.match(/^([A-Za-z]+)(\d+)$/);
    if (match) return `${prefixOrder.get(match[1].toUpperCase()) ?? match[1]}-${match[2].padStart(4, "0")}`;
    return sectionNumber;
  }
  const idNumber = id.match(/(?:section|stage|etapp|ho)[-_]?(\d+)/i)?.[1];
  return idNumber ? idNumber.padStart(4, "0") : id;
}

function buildRouteSections(trailId, sections, handoff) {
  return {
    schemaVersion: "candidate-route-sections/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    sourceHandoff: `${trailId}/normalization-handoff.research.json`,
    sharedDecisionFile: "shared-importer-decisions.research.json",
    distancePolicy: shared.resolvedSharedDecisions.distancePolicy.canonicalFieldsForCandidateArtifacts,
    sections: sections.map(({ data, sourceFile }, index) => {
      const sectionId = getSectionId(data);
      const section = data.section ?? data;
      const distance = normalizeDistance(data.distanceKm ?? section.officialDistanceKm ?? section.distanceKm, data.mapdata);
      return prune({
        sectionId,
        sourceFile,
        order: index + 1,
        sectionNumber: data.sectionNumber ?? section.sectionNumber ?? index + 1,
        name: data.name ?? section.name ?? sectionId,
        from: data.from ?? section.from ?? null,
        to: data.to ?? section.to ?? null,
        distance,
        estimatedTime: data.estimatedTime ?? section.estimatedTime ?? null,
        difficulty: data.difficulty ?? section.difficulty ?? null,
        routeType: data.routeType ?? section.routeType ?? null,
        endpoints: normalizeEndpoints(data.endpointCoordinates),
        routeStatus: normalizeRouteStatus(data),
        sourceDirection: extractSourceDirection(data),
        routeGroupHint: inferRouteGroupHint(trailId, data, handoff),
        sourceSummary: extractRouteSourceSummary(data),
        caveats: collectStrings([
          data.sourceContradictions,
          data.openQuestions,
          data.routeGeometry?.recommendedGeometry?.caveats,
          data.mapdata?.qa
        ]).slice(0, 12)
      });
    })
  };
}

function buildGeometryIndex(trailId, sections, handoff, geojsonFiles) {
  const sectionRows = sections.map(({ data, sourceFile }) => {
    const sectionId = getSectionId(data);
    const candidateGeojsonFiles = geojsonFiles.filter((filePath) => {
      const base = path.basename(filePath, ".geojson");
      return base === sectionId || base.includes(sectionId) || sectionId.includes(base);
    });
    const blocked = isBlockedSection(handoff, sectionId);
    const sourceSummary = extractRouteSourceSummary(data);
    return {
      sectionId,
      sourceFile,
      status: blocked
        ? "blocked-for-complete-route-import"
        : candidateGeojsonFiles.length > 0
          ? "candidate-geojson-present"
          : sourceSummary.source || sourceSummary.gpxUrl || sourceSummary.geometrySource
            ? "source-geometry-needs-candidate-geojson"
            : "geometry-needs-research",
      candidateGeojsonFiles,
      sourceSummary,
      transformPolicy: handoff.geometryPlan?.transformPolicy ?? null,
      endpointContinuityIssues: filterSectionRelated(handoff.geometryPlan?.endpointContinuityIssues, sectionId),
      blockedGeometry: blocked ? filterSectionRelated(handoff.geometryPlan?.blockedGeometry, sectionId) : []
    };
  });
  return {
    schemaVersion: "candidate-route-geometry-index/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    geometryPolicy: shared.resolvedSharedDecisions.geometryPolicy,
    sourceArtifactsToUse: handoff.geometryPlan?.sourceArtifactsToUse ?? [],
    sourceArtifactsToSuppress: handoff.geometryPlan?.sourceArtifactsToSuppress ?? [],
    discoveredGeojsonFiles: geojsonFiles,
    summary: countBy(sectionRows, "status"),
    sections: sectionRows
  };
}

function buildRouteTopology(trailId, routeSections, handoff) {
  const config = topologyDecisionConfig[trailId] ?? {
    status: "candidate-topology-recorded",
    decisionsApplied: [{ id: `${trailId}-mainline-topology`, decision: "Use the researched section order as the candidate mainline." }],
    routeGroups: [{ groupId: `${trailId}-mainline`, kind: "mainline", allSections: true, status: "candidate-topology-recorded" }],
    connections: [],
    remainingGeometryWork: ["Review candidate geometry before runtime import."]
  };
  const unresolvedSectionRefs = [];
  const routeGroups = (config.routeGroups ?? []).map((group) => {
    const sectionIds = resolveSectionIds(routeSections.sections, group, unresolvedSectionRefs);
    return prune({
      groupId: group.groupId,
      kind: group.kind,
      status: group.status,
      sectionIds,
      notes: group.notes ?? null
    });
  });
  const connections = (config.connections ?? []).map((connection) =>
    prune({
      connectionId: connection.connectionId,
      fromSectionId: resolveConnectionSectionId(routeSections.sections, connection, "from", unresolvedSectionRefs),
      toSectionId: resolveConnectionSectionId(routeSections.sections, connection, "to", unresolvedSectionRefs),
      mode: connection.mode,
      status: connection.status,
      distanceMetersApprox: connection.distanceMetersApprox ?? null,
      importPolicy: connection.importPolicy ?? null
    })
  );

  return {
    schemaVersion: "candidate-route-topology/v1",
    trailId,
    lastUpdated,
    status: config.status,
    runtimeImportApproved: false,
    sourceHandoff: `${trailId}/normalization-handoff.research.json`,
    sharedDecisionFile: "shared-importer-decisions.research.json",
    topologyPolicy: shared.resolvedSharedDecisions.routeTopologyPolicy,
    topologySourceSummary: summarizeTopologySource(handoff),
    decisionsApplied: config.decisionsApplied ?? [],
    routeGroups,
    connections,
    displayPolicies: config.displayPolicies ?? [],
    remainingGeometryWork: config.remainingGeometryWork ?? [],
    unresolvedSectionRefs
  };
}

function summarizeTopologySource(handoff) {
  return prune({
    importOrder: handoff.importOrder ?? null,
    geometryPlanSummary: handoff.geometryPlan?.summary ?? handoff.geometryPlan?.decision ?? null,
    endpointContinuityIssues: handoff.geometryPlan?.endpointContinuityIssues ?? null,
    blockedGeometry: handoff.geometryPlan?.blockedGeometry ?? null
  });
}

function resolveSectionIds(sections, group, unresolvedSectionRefs) {
  if (group.allSections) return sections.map((section) => section.sectionId);
  const refs = [
    ...(group.sectionOrders ?? []).map((value) => ({ kind: "order", value })),
    ...(group.sectionRefs ?? []).map((value) => ({ kind: "sectionNumber", value })),
    ...(group.sectionIds ?? []).map((value) => ({ kind: "sectionId", value }))
  ];
  return refs.flatMap((ref) => {
    const section = findSection(sections, ref);
    if (!section) {
      unresolvedSectionRefs.push({ scope: group.groupId, ...ref });
      return [];
    }
    return [section.sectionId];
  });
}

function resolveConnectionSectionId(sections, connection, side, unresolvedSectionRefs) {
  const orderKey = `${side}SectionOrder`;
  const refKey = `${side}SectionRef`;
  const idKey = `${side}SectionId`;
  const ref =
    connection[orderKey] != null
      ? { kind: "order", value: connection[orderKey] }
      : connection[refKey] != null
        ? { kind: "sectionNumber", value: connection[refKey] }
        : connection[idKey] != null
          ? { kind: "sectionId", value: connection[idKey] }
          : null;
  if (!ref) return null;
  const section = findSection(sections, ref);
  if (!section) {
    unresolvedSectionRefs.push({ scope: connection.connectionId, side, ...ref });
    return null;
  }
  return section.sectionId;
}

function findSection(sections, ref) {
  if (ref.kind === "order") return sections.find((section) => section.order === ref.value);
  if (ref.kind === "sectionNumber") return sections.find((section) => String(section.sectionNumber) === String(ref.value));
  if (ref.kind === "sectionId") return sections.find((section) => section.sectionId === ref.value);
  return null;
}

function buildFacilities(trailId, sections) {
  const records = [];
  for (const { data, sourceFile } of sections) {
    const sectionId = getSectionId(data);
    for (const [index, facility] of enumerate(data.facilities)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, facility, `facilities.${index}`, null));
    }
    for (const [index, water] of enumerate(data.waterSources)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, water, `waterSources.${index}`, "water"));
    }
    for (const endpoint of ["start", "end"]) {
      for (const [index, access] of enumerate(data.commuteAccess?.[endpoint])) {
        records.push(normalizeFacility(trailId, sectionId, sourceFile, access, `commuteAccess.${endpoint}.${index}`, "transit"));
      }
    }
    for (const [index, parking] of enumerate(data.commuteAccess?.parkingAndTrailheadAccess)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, parking, `commuteAccess.parkingAndTrailheadAccess.${index}`, "parking"));
    }
    for (const [index, row] of enumerate(data.importRows)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, row, `importRows.${index}`, null, "import"));
    }
    for (const [index, row] of enumerate(data.pending)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, row, `pending.${index}`, null, "pending-review"));
    }
    for (const [index, row] of enumerate(data.suppressions)) {
      records.push(normalizeFacility(trailId, sectionId, sourceFile, row, `suppressions.${index}`, null, "suppress"));
    }
  }

  records.sort((left, right) => left.facilityId.localeCompare(right.facilityId, "en", { numeric: true }));
  return {
    schemaVersion: "candidate-facilities/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    facilityStatePolicy: shared.resolvedSharedDecisions.facilityStatePolicy,
    summary: {
      totalRecords: records.length,
      byState: countBy(records, "state"),
      byPrimaryType: countBy(records, "primaryType")
    },
    records
  };
}

function buildRuleWarnings(trailId, sections, handoff) {
  const records = [];
  for (const { data, sourceFile } of sections) {
    const sectionId = getSectionId(data);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "rulesAndSafety", data.rulesAndSafety);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "campingAndFire", data.campingAndFire);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "conditionReports", data.conditionReports);
    addStructuredWarnings(records, trailId, sectionId, sourceFile, "sourceContradictions", data.sourceContradictions);
    addVikingSuppressionWarnings(records, trailId, sectionId, sourceFile, data);
  }

  addStructuredWarnings(records, trailId, null, `${trailId}/normalization-handoff.research.json`, "handoff.ruleWarningPlan", handoff.ruleWarningPlan);
  records.sort((left, right) => left.warningId.localeCompare(right.warningId, "en", { numeric: true }));

  return {
    schemaVersion: "candidate-rule-warnings/v1",
    trailId,
    lastUpdated,
    status: "candidate-normalized-research-only",
    runtimeImportApproved: false,
    ruleWarningPolicy: shared.resolvedSharedDecisions.ruleWarningPolicy,
    summary: {
      totalRecords: records.length,
      byCategory: countBy(records, "category"),
      byUserFacingEligibility: countBy(records, "userFacingEligibility")
    },
    records
  };
}

function buildImportReport(trailId, handoff, routeSections, geometryIndex, routeTopology, facilities, ruleWarnings) {
  const minimumArtifacts = shared.resolvedSharedDecisions.candidateArtifactLayout.minimumArtifacts;
  const manifestEntry = trailManifestById.get(trailId);
  const blockers = normalizeBlockers(handoff.blockers);
  const openDecisions = normalizeOpenDecisions(handoff.openDecisionsForUser);
  const blockerTriage = triageBlockers(trailId, blockers, openDecisions);
  return {
    schemaVersion: "candidate-import-report/v1",
    trailId,
    lastUpdated,
    status: "candidate-artifacts-generated-research-only",
    runtimeImportApproved: false,
    sourceHandoff: `${trailId}/normalization-handoff.research.json`,
    artifactFiles: minimumArtifacts,
    supplementalArtifactFiles,
    manifestSectionFiles: manifestEntry?.files?.sectionFiles ?? null,
    generatedCounts: {
      routeSections: routeSections.sections.length,
      geometrySections: geometryIndex.sections.length,
      geometrySectionsWithCandidateGeojson: geometryIndex.sections.filter((section) => section.candidateGeojsonFiles.length > 0).length,
      routeTopologyDecisions: routeTopology.decisionsApplied.length,
      routeGroups: routeTopology.routeGroups.length,
      routeTopologyConnections: routeTopology.connections.length,
      facilities: facilities.records.length,
      ruleWarnings: ruleWarnings.records.length
    },
    routeTopologySummary: {
      status: routeTopology.status,
      decisionIds: routeTopology.decisionsApplied.map((decision) => decision.id),
      routeGroupIds: routeTopology.routeGroups.map((group) => group.groupId),
      connectionIds: routeTopology.connections.map((connection) => connection.connectionId)
    },
    blockers,
    openDecisions,
    blockerTriage,
    triageSummary: countBy(blockerTriage, "disposition"),
    fixesAppliedNow: blockerTriage.filter((item) => item.disposition === "resolved-now"),
    fixNowBeforeRuntimeImport: blockerTriage.filter((item) => item.disposition === "fix-now"),
    runtimeSchemaNeeded: blockerTriage.filter((item) => item.disposition === "runtime-schema-needed"),
    deferredBeforeRuntimeImport: blockerTriage.filter((item) =>
      ["external-source-approval", "defer-publication-time", "runtime-integration-task", "scope-limitation"].includes(item.disposition)
    ),
    validationChecklist: handoff.validationChecklist ?? [],
    unresolvedBeforeRuntimeImport: blockerTriage
      .filter((item) => item.disposition !== "resolved-now")
      .map((item) => `${item.disposition}: ${item.details}`),
    nextActions: [
      "Handle fixNowBeforeRuntimeImport first unless the linked item truly needs external data.",
      "Keep pending-review and suppress facility states out of runtime output.",
      "Run final GIS overlays and live publication checks before user-facing rule warnings.",
      "Do not write app runtime source data from this report without an explicit runtime integration task."
    ]
  };
}

function normalizeOpenDecisions(decisions) {
  if (!Array.isArray(decisions)) return [];
  return decisions.map((decision, index) => {
    if (typeof decision === "string") {
      return {
        id: `decision-${index + 1}`,
        details: decision
      };
    }
    return prune({
      id: decision.id ?? decision.scope ?? `decision-${index + 1}`,
      status: decision.status ?? null,
      details: decision.description ?? decision.details ?? decision.decision ?? decision.question ?? compactJson(decision)
    });
  });
}

function triageBlockers(trailId, blockers, openDecisions) {
  const blockerItems = blockers.map((blocker) => ({
    itemType: "blocker",
    sourceId: blocker.id,
    status: blocker.status,
    details: blocker.details
  }));
  const decisionItems = openDecisions.map((decision) => ({
    itemType: "open-decision",
    sourceId: decision.id,
    status: decision.status ?? "open-decision",
    details: decision.details
  }));

  return [...blockerItems, ...decisionItems].map((item, index) => ({
    id: `${item.itemType}-${index + 1}`,
    ...item,
    ...classifyTriageItem(trailId, item)
  }));
}

function classifyTriageItem(trailId, item) {
  const text = `${item.sourceId} ${item.status} ${item.details}`.toLowerCase();
  const topologyResolution = topologyDecisionConfig[trailId];

  if (topologyResolution?.triageResolvedSourceIds?.includes(item.sourceId)) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: topologyResolution.triageResolvedAction ?? "Resolved by explicit route topology decisions in normalized-candidate/route-topology.research.json."
    };
  }
  const policyResolution = policyDecisionConfig[trailId];

  if (policyResolution?.triageResolvedSourceIds?.includes(item.sourceId)) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: policyResolution.action
    };
  }

  if (text.includes("readme.md status is older")) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Updated Padjelantaleden README status to reflect completed 10-section research and generated candidate artifacts."
    };
  }
  if (
    /pending|suppress|hidden review|stored before verification|facility state|not appear as normal|out of public normalized facilities/.test(text)
  ) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Facilities now carry explicit normal, pending-review, and suppress states in normalized-candidate/facilities.research.json; the checker enforces normalized candidate types and preserved rawTypes."
    };
  }
  if (
    /endpoint snapping|snap policy|segment-break|multilinestring|k4-to-k5|official coastal network gap|stage 8-to-stage 9|stage 21 gap|one chain|separate importable chains|partial\/self-navigation|route model is represented|do not bridge|do not.*snap|do not.*auto-route/.test(
      text
    )
  ) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Shared importer decisions now require preserving source endpoints and explicit gaps/connections instead of silent snapping or invented linework."
    };
  }
  if (
    /parking\/transit|parking and transit|transit choice|side-service radius|side-service\/access|access metadata radius|commercial\/customer-only services|weak transit/.test(
      text
    )
  ) {
    return {
      disposition: "resolved-now",
      owner: "candidate-data",
      action: "Parking/transit and access services are normalized as candidate facility/access records with pending/suppress states and live-check caveats."
    };
  }
  if (/generated app outputs|source hiking runtime data|intentionally not been edited|no runtime data has been imported/.test(text)) {
    return {
      disposition: "runtime-integration-task",
      owner: "runtime-import",
      action: "Leave runtime source/generated data untouched until the separate runtime import task is explicitly started."
    };
  }
  if (
    /officialdistancekm|computedgeometrydistancekm|source-direction|schema|runtime schema|app schema|connector model|typed connector|typed boat|rowboat|ferry\/water|road\/bus transfer|route-group|route groups|aliases|alternate route groups|tail|source direction metadata/.test(
      text
    )
  ) {
    return {
      disposition: "runtime-schema-needed",
      owner: "runtime-importer",
      action: "Candidate artifacts preserve the needed metadata; runtime importer/schema support is needed before public app import."
    };
  }
  if (/source[- ]policy|licens|permission|api key|trafiklab|resrobot|approve or reject|source terms|official source|authoritative.*ids/.test(text)) {
    return {
      disposition: "external-source-approval",
      owner: "source-review",
      action: "Resolve source terms, API access, or official-source approval before relying on this item for runtime import."
    };
  }
  if (/live currentness refresh|currentness refresh|pre-publication refresh/.test(text)) {
    return {
      disposition: "defer-publication-time",
      owner: "publication-check",
      action: "Keep as a publication-time checklist item because the underlying fact can change."
    };
  }
  if (/gis|overlay|protected-area|water-protection|boundary|rule-warning granularity|rule granularity|clip|clipping|subsegment/.test(text)) {
    return {
      disposition: "fix-now",
      owner: "candidate-gis",
      action: "Run GIS overlays against selected candidate geometry and replace broad warnings with scoped section/subsegment/facility warnings where possible."
    };
  }
  if (
    /publication|live|currentness|recheck|fire|timetable|opening|seasonal|closure|reroute|forestry|hunting|bridge notices|water reliability|quality|boat operators|business hours|acute|service live|transit schedules|availability|fees|passability/.test(
      text
    )
  ) {
    return {
      disposition: "defer-publication-time",
      owner: "publication-check",
      action: "Keep as a publication-time checklist item because the underlying fact can change."
    };
  }
  if (/explicit import task|runtime integration still needs|blocked-until-explicit-import-task/.test(text)) {
    return {
      disposition: "runtime-integration-task",
      owner: "runtime-import",
      action: "Handle when the candidate artifacts are selected for runtime import."
    };
  }
  if (/geometry|geojson|gpx|linework|densification|split|reverse|endpoint connector|endpoint-policy|topology|variant|gap|candidate implementation|visual qa|whole-trail section model|southern endpoint/.test(text)) {
    return {
      disposition: trailId === "nordkalottleden" && /whole-trail|southern endpoint|variants around/.test(text) ? "scope-limitation" : "fix-now",
      owner: "candidate-geometry",
      action:
        trailId === "nordkalottleden" && /whole-trail|southern endpoint|variants around/.test(text)
          ? "Keep the first import scope to the researched 12-section model and defer alternate whole-trail variants."
          : "Build or refine candidate GeoJSON, connector records, endpoint policy, and route topology before runtime import."
    };
  }
  if (/dedupe|taxonomy|cluster|poi|pois|facility|hut|shelter|water|toilet|shop|sauna|waste|viewpoint|minor rest|informal campsites|osm-only/.test(text)) {
    return {
      disposition: "fix-now",
      owner: "candidate-facilities",
      action: "Run the candidate facility dedupe/cluster pass, attach child amenities to parents where appropriate, and leave weak records pending/suppressed."
    };
  }
  if (/no single official source|multiple candidate section models|not whole-trail|researched .* model/.test(text)) {
    return {
      disposition: "scope-limitation",
      owner: "candidate-scope",
      action: "Keep the candidate import scoped to the researched model until a broader official section model is established."
    };
  }

  return {
    disposition: "fix-now",
    owner: "candidate-review",
    action: "Review and resolve in candidate artifacts before runtime import unless a later pass proves it needs external data."
  };
}

function normalizeFacility(trailId, sectionId, sourceFile, raw, sourceCollection, fallbackType, forcedAction) {
  const rawTypes = collectRawFacilityTypes(raw, fallbackType);
  const candidateTypes = normalizeTypes(rawTypes);
  const action = normalizeImportAction(
    forcedAction ??
      raw.importAction ??
      raw.importDecision ??
      raw.importRecommendation ??
      raw.importTreatment ??
      raw.decision
  );
  const coordinates = normalizeCoordinates(raw);
  const idBase = raw.id ?? `${sectionId}-${sourceCollection}-${raw.name ?? raw.stopName ?? raw.type ?? "facility"}`;
  return prune({
    facilityId: slugify(idBase),
    trailId,
    sectionId,
    sourceFile,
    sourceCollection,
    state: importActionToState(action),
    importAction: action,
    primaryType: candidateTypes[0] ?? "service",
    candidateTypes,
    rawTypes,
    name: raw.name ?? raw.stopName ?? raw.label ?? null,
    coordinatesLatLon: coordinates,
    coordinateSource: raw.coordinateSource ?? null,
    confidence: raw.confidence ?? null,
    description: raw.description ?? raw.notes ?? raw.caveat ?? null,
    caveats: collectStrings([raw.caveats, raw.caveat, raw.pendingReason, raw.suppressionReason]),
    routeProximity: raw.routeProximity ?? proximityFromRaw(raw),
    chainageKmApprox: raw.chainageKmApprox ?? raw.alongRouteKm ?? raw.routeKm ?? raw.routeKmApprox ?? null,
    sourceUrls: normalizeSourceUrls(raw),
    sourceRefs: normalizeSourceRefs(raw),
    clusterId: raw.clusterId ?? null,
    originalId: raw.originalId ?? null,
    alternateRouteRefs: raw.alternateRouteRefs ?? null,
    subfacilities: raw.subfacilities ?? raw.subpoints ?? null,
    normalizationNotes: raw.normalizationNotes ?? raw.importNotes ?? null
  });
}

function collectRawFacilityTypes(raw, fallbackType) {
  const rawTypes = unique(
    [
      raw.normalizedCandidateTypes,
      raw.candidateTypes,
      raw.normalizedCandidateType,
      raw.candidateType,
      raw.normalizedType,
      raw.type,
      fallbackType
    ].flatMap((value) => (Array.isArray(value) ? value : value ? [String(value)] : []))
  );
  return rawTypes.length > 0 ? rawTypes : ["service"];
}

function normalizeTypes(rawTypes) {
  const mapped = rawTypes.flatMap((value) => {
    const clean = String(value).trim().toLowerCase();
    if (!clean) return [];
    if (clean.includes("bus") || clean.includes("train") || clean.includes("transit") || clean.includes("station")) return ["transit"];
    if (clean.includes("ferry") || clean.includes("boat") || clean.includes("helicopter") || clean.includes("pickup") || clean.includes("dropoff")) return ["transit"];
    if (clean.includes("parking") || clean.includes("parkering")) return ["parking"];
    if (clean.includes("water") || clean.includes("vatten") || clean.includes("tap") || clean.includes("well") || clean.includes("pump")) {
      return clean.includes("natural") || clean.includes("lake") || clean.includes("stream") || clean.includes("spring") ? ["natural-water"] : ["water"];
    }
    if (clean.includes("shelter") || clean.includes("vindskydd") || clean.includes("rest-hut") || clean.includes("wilderness-hut")) return ["shelter"];
    if (clean.includes("hut") || clean.includes("cabin") || clean.includes("lodging") || clean.includes("hostel") || clean.includes("bed-and-breakfast") || clean.includes("cottage")) {
      return clean.includes("emergency") || clean.includes("rest") || clean.includes("wilderness") ? ["shelter"] : ["lodging"];
    }
    if (clean.includes("fire") || clean.includes("grill") || clean.includes("eld")) return ["fireplace"];
    if (clean.includes("toilet") || clean.includes("wc") || clean.includes("toalett")) return ["toilet"];
    if (clean.includes("waste") || clean.includes("recycling") || clean.includes("trash") || clean.includes("litter")) return ["waste"];
    if (clean.includes("swim") || clean.includes("bad") || clean.includes("bathing") || clean.includes("beach")) return ["swimming"];
    if (clean.includes("heritage") || clean.includes("ruin") || clean.includes("kultur") || clean.includes("historic") || clean.includes("archaeolog") || clean.includes("church") || clean.includes("museum") || clean.includes("mill") || clean.includes("cemetery")) return ["heritage"];
    if (clean.includes("view")) return ["viewpoint"];
    if (clean.includes("attraction") || clean.includes("poi") || clean.includes("sight") || clean.includes("nature") || clean.includes("reserve") || clean.includes("geolog") || clean.includes("peak") || clean.includes("wetland") || clean.includes("landmark")) return ["attraction"];
    if (clean.includes("informal") && clean.includes("tent")) return ["informal-tenting"];
    if (clean.includes("tent") || clean.includes("camp")) return ["camping"];
    if (clean.includes("food") || clean.includes("cafe") || clean.includes("shop") || clean.includes("grocery") || clean.includes("restaurant") || clean.includes("resupply") || clean.includes("provision") || clean.includes("bar")) return ["food"];
    if (clean.includes("phone")) return ["emergency-phone"];
    if (clean.includes("hazard") || clean.includes("warning") || clean.includes("bridge") || clean.includes("ford") || clean.includes("crossing") || clean.includes("boardwalk")) return ["hazard"];
    if (clean.includes("junction") || clean.includes("trailhead") || clean.includes("connector") || clean.includes("route") || clean.includes("access") || clean.includes("endpoint")) return ["trail-junction"];
    if (clean.includes("rest") || clean.includes("picnic") || clean.includes("bench")) return ["rest-area"];
    if (clean.includes("information") || clean.includes("service") || clean.includes("rental") || clean.includes("sauna") || clean.includes("shower") || clean.includes("kitchen") || clean.includes("wifi") || clean.includes("fuel")) return ["service"];
    if (clean === "none" || clean.includes("absence") || clean.includes("negative") || clean.includes("metadata") || clean.includes("context") || clean.includes("note")) return ["service"];
    return ["service"];
  });
  return unique(mapped);
}

function normalizeImportAction(value) {
  if (value == null || value === "") return "pending-review";
  const clean = String(value).toLowerCase();
  if (clean.includes("suppress") || clean.includes("do not import") || clean.includes("metadata only")) return "suppress";
  if (clean.includes("pending") || clean.includes("review") || clean.includes("verify")) return "pending-review";
  if (clean.includes("access")) return "import-as-access";
  if (clean.includes("warning")) return "import-as-rule-warning";
  if (clean.includes("attach") || clean.includes("cluster") || clean.includes("parent")) return "attach-to-parent";
  if (clean.includes("side")) return "side-trip-metadata";
  if (clean.includes("import") || clean === "normal") return "import";
  return clean.replaceAll(" ", "-");
}

function importActionToState(action) {
  if (["import", "import-as-access", "import-as-rule-warning", "attach-to-parent"].includes(action)) return "normal";
  if (action === "suppress") return "suppress";
  return "pending-review";
}

function addStructuredWarnings(records, trailId, sectionId, sourceFile, sourceCollection, value) {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => addWarningRecord(records, trailId, sectionId, sourceFile, `${sourceCollection}.${index}`, item));
    return;
  }
  if (typeof value === "string") {
    addWarningRecord(records, trailId, sectionId, sourceFile, sourceCollection, { summary: value });
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["sourceUrls", "sources", "url", "sourceUrl"].includes(key)) continue;
    if (child == null || child === "" || (Array.isArray(child) && child.length === 0)) continue;
    addWarningRecord(records, trailId, sectionId, sourceFile, `${sourceCollection}.${key}`, child, value);
  }
}

function addWarningRecord(records, trailId, sectionId, sourceFile, sourceCollection, value, parent = {}) {
  const category = sourceCollection.split(".").slice(0, 2).join(".");
  const summary = summarizeWarning(value);
  if (!summary) return;
  records.push(
    prune({
      warningId: slugify(`${trailId}-${sectionId ?? "trail"}-${sourceCollection}`),
      trailId,
      sectionId,
      sourceFile,
      sourceCollection,
      category,
      title: titleFromSourceCollection(sourceCollection),
      summary,
      userFacingEligibility: inferUserFacingEligibility(sourceCollection, summary),
      sourceUrls: normalizeSourceUrls(value).length > 0 ? normalizeSourceUrls(value) : normalizeSourceUrls(parent),
      confidence: value?.confidence ?? parent?.confidence ?? null,
      importAction: inferWarningImportAction(sourceCollection, summary)
    })
  );
}

function addVikingSuppressionWarnings(records, trailId, sectionId, sourceFile, data) {
  for (const [index, row] of enumerate([...(data.pending ?? []), ...(data.suppressions ?? [])])) {
    const text = `${row.type ?? ""} ${row.name ?? ""} ${row.notes ?? ""}`.toLowerCase();
    if (!/(unsafe|non-potable|warning|condition|closure|route|fire|tent|camp|water|private|duplicate|overlap)/.test(text)) continue;
    addWarningRecord(records, trailId, sectionId, sourceFile, `facilityStateWarnings.${index}`, {
      summary: row.notes ?? row.name,
      confidence: row.confidence,
      sourceUrls: row.sourceUrls
    });
  }
}

function summarizeWarning(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(summarizeWarning).filter(Boolean).join(" | ");
  if (typeof value !== "object") return String(value);
  return (
    value.summary ??
    value.details ??
    value.finding ??
    value.notes ??
    value.description ??
    value.importImpact ??
    value.caveat ??
    compactJson(value)
  );
}

function compactJson(value) {
  const text = JSON.stringify(value);
  return text && text !== "{}" ? text : null;
}

function inferUserFacingEligibility(sourceCollection, summary) {
  const text = `${sourceCollection} ${summary}`.toLowerCase();
  if (/(import|normalization|source|gpx|debug|schema)/.test(text) && !/(warning|unsafe|closure|fire|dog|camp|water|hazard|rule)/.test(text)) {
    return "import-maintenance-only";
  }
  if (/(fire|dog|camp|water|closure|reroute|hazard|hunt|protected|reserve|unsafe|private|season|boat|ferry)/.test(text)) {
    return "candidate-hiker-facing";
  }
  return "needs-review";
}

function inferWarningImportAction(sourceCollection, summary) {
  return inferUserFacingEligibility(sourceCollection, summary) === "import-maintenance-only" ? "suppress" : "pending-review";
}

function titleFromSourceCollection(sourceCollection) {
  return sourceCollection
    .split(".")
    .filter((part) => Number.isNaN(Number(part)))
    .slice(-1)[0]
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ");
}

function normalizeDistance(value, mapdata) {
  const result = {
    officialDistanceKm: null,
    computedGeometryDistanceKm: null,
    displayDistanceKm: null,
    distanceCaveats: []
  };
  if (typeof value === "number") {
    result.officialDistanceKm = value;
    result.displayDistanceKm = value;
    return result;
  }
  if (typeof mapdata?.officialDistanceKm === "number") {
    result.officialDistanceKm = mapdata.officialDistanceKm;
    result.displayDistanceKm = mapdata.officialDistanceKm;
  }
  if (typeof mapdata?.computedDistanceKm === "number") result.computedGeometryDistanceKm = mapdata.computedDistanceKm;
  if (!value || typeof value !== "object") return result;

  const official = firstNumber([
    value.official,
    value.value,
    value.preferredOfficialKm,
    value.normalizedApproxWalkingKm,
    value.officialDistanceKm,
    value.displayDistanceKm
  ]);
  const computed = firstNumber([
    value.computedGeometryKm,
    value.computedGeometryDistanceKm,
    value.computedNaturkartanGpx,
    value.osmComputed,
    value.naturkartan,
    value.computed
  ]);
  result.officialDistanceKm = official ?? result.officialDistanceKm;
  result.computedGeometryDistanceKm = computed ?? result.computedGeometryDistanceKm;
  result.displayDistanceKm = result.officialDistanceKm ?? result.computedGeometryDistanceKm;
  result.distanceCaveats = collectStrings([
    value.distanceCaveat,
    value.caveat,
    value.confidence,
    value.sourcePolicy,
    value.otherClaims,
    value.reportedValues,
    value.alternates,
    value.displayRecommendation
  ]);
  return result;
}

function firstNumber(values) {
  for (const value of values.flat()) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const match = value.match(/\d+(?:[.,]\d+)?/);
      if (match) return Number(match[0].replace(",", "."));
    }
  }
  return null;
}

function normalizeEndpoints(endpointCoordinates) {
  if (!endpointCoordinates || typeof endpointCoordinates !== "object") return null;
  return Object.fromEntries(
    Object.entries(endpointCoordinates).map(([key, endpoint]) => [
      key,
      prune({
        label: endpoint.label ?? null,
        coordinatesLatLon: normalizeCoordinatePair(endpoint.coordinates),
        source: endpoint.source ?? null,
        confidence: endpoint.confidence ?? null,
        caveats: collectStrings(endpoint.caveats)
      })
    ])
  );
}

function normalizeRouteStatus(data) {
  const readiness = data.importReadiness;
  if (typeof readiness === "string") return readiness;
  if (readiness?.status) return readiness.status;
  if (data.status) return data.status;
  if (data.mapdata?.canDraw === true) return "mapdata-can-draw";
  return "research-ready";
}

function extractSourceDirection(data) {
  return (
    data.routeGeometry?.recommendedGeometry?.directionRelativeToOfficialOrder ??
    data.routeGeometry?.recommendedGeometry?.sourceDirection ??
    data.mapdata?.directionRelativeToOfficialOrder ??
    null
  );
}

function inferRouteGroupHint(trailId, data, handoff) {
  if (trailId === "hoglandsleden") return "topology-review-required";
  if (trailId === "vikingaleden" && data.mapdata?.overlapsExistingRoute) return "mainline-overlap-alias";
  if (isBlockedSection(handoff, getSectionId(data))) return "partial-or-blocked";
  return "mainline";
}

function extractRouteSourceSummary(data) {
  const routeGeometry = data.routeGeometry ?? {};
  const recommended = routeGeometry.recommendedGeometry ?? {};
  const primaryGeometry = routeGeometry.primaryGeometry ?? {};
  const primaryCandidate = routeGeometry.primaryCandidate ?? {};
  const primary = routeGeometry.primary ?? {};
  const recommendedImportGeometry = routeGeometry.recommendedGeometrySourceForImport ?? {};
  const officialGeometry = routeGeometry.officialGeometry ?? {};
  const firstOfficialSource = Array.isArray(routeGeometry.officialSources) ? routeGeometry.officialSources[0] : null;
  const firstPublicGeometrySource = Array.isArray(routeGeometry.officialOrPublicGeometrySources)
    ? routeGeometry.officialOrPublicGeometrySources[0]
    : null;
  const mapdata = data.mapdata ?? {};
  return prune({
    source:
      recommended.source ??
      routeGeometry.recommendedSource ??
      primaryGeometry.provider ??
      primaryGeometry.source ??
      primaryCandidate.source ??
      primary.sourceName ??
      recommendedImportGeometry.source ??
      (officialGeometry.type ? `official ${officialGeometry.type}` : null) ??
      firstOfficialSource?.type ??
      firstPublicGeometrySource?.source ??
      mapdata.geometrySource ??
      null,
    sourceUrl:
      recommended.sourceUrl ??
      routeGeometry.gpxUrl ??
      primaryGeometry.url ??
      primaryCandidate.url ??
      primary.url ??
      recommendedImportGeometry.url ??
      officialGeometry.url ??
      firstOfficialSource?.url ??
      firstPublicGeometrySource?.url ??
      mapdata.gpxUrl ??
      null,
    gpxUrl:
      routeGeometry.gpxUrl ??
      (primaryGeometry.type?.toLowerCase?.().includes("gpx") ? primaryGeometry.url : null) ??
      (primary.sourceFormat?.toLowerCase?.() === "gpx" ? primary.url : null) ??
      (officialGeometry.type?.toLowerCase?.() === "gpx" ? officialGeometry.url : null) ??
      mapdata.gpxUrl ??
      null,
    classification:
      recommended.classification ??
      routeGeometry.geometryQuality ??
      routeGeometry.navigationGrade ??
      primary.geometryGrade ??
      primaryGeometry.geometryQuality ??
      primaryGeometry.grade ??
      recommendedImportGeometry.grade ??
      officialGeometry.grade ??
      firstOfficialSource?.assessment ??
      routeGeometry.status ??
      null,
    confidence:
      recommended.confidence ??
      primaryGeometry.confidence ??
      primaryCandidate.confidence ??
      primary.confidence ??
      recommendedImportGeometry.confidence ??
      officialGeometry.confidence ??
      null,
    canDraw: mapdata.canDraw ?? null,
    pointCount: mapdata.pointCount ?? primary.pointCount ?? officialGeometry.trackPoints ?? null,
    computedDistanceKm:
      mapdata.computedDistanceKm ??
      primaryGeometry.computedDistanceKm ??
      primary.computedDistanceKm?.normalized ??
      primary.computedDistanceKm ??
      recommendedImportGeometry.computedLengthKm ??
      officialGeometry.computedDistanceKm ??
      routeGeometry.metrics?.naturkartanGpx?.computedDistanceKm ??
      routeGeometry.metrics?.naturkartanApi?.computedDistanceKm ??
      null,
    overlapsExistingRoute: mapdata.overlapsExistingRoute ?? null
  });
}

function isBlockedSection(handoff, sectionId) {
  return JSON.stringify(handoff.sectionCoverage?.blockedSections ?? handoff.geometryPlan?.blockedGeometry ?? "").includes(sectionId);
}

function filterSectionRelated(value, sectionId) {
  if (!value) return [];
  const rows = Array.isArray(value) ? value : [value];
  return rows.filter((row) => JSON.stringify(row).includes(sectionId));
}

function normalizeBlockers(blockers) {
  if (!blockers) return [];
  if (Array.isArray(blockers)) {
    return blockers.map((blocker, index) =>
      typeof blocker === "string"
        ? { id: `blocker-${index + 1}`, status: "unresolved", details: blocker }
        : { id: blocker.id ?? blocker.scope ?? `blocker-${index + 1}`, status: blocker.status ?? "unresolved", details: blocker.description ?? blocker.details ?? compactJson(blocker) }
    );
  }
  if (typeof blockers !== "object") return [{ id: "blocker-1", status: "unresolved", details: String(blockers) }];
  return Object.entries(blockers).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value]).map((item, index) =>
      typeof item === "string"
        ? { id: `${key}-${index + 1}`, status: key, details: item }
        : { id: item.id ?? `${key}-${index + 1}`, status: item.status ?? key, details: item.description ?? item.details ?? compactJson(item) }
    )
  );
}

function normalizeCoordinates(raw) {
  if (Array.isArray(raw.coordinates)) return raw.coordinates;
  if (Array.isArray(raw.coords)) return raw.coords;
  if (typeof raw.lat === "number" && typeof raw.lon === "number") return [raw.lat, raw.lon];
  if (typeof raw.latitude === "number" && typeof raw.longitude === "number") return [raw.latitude, raw.longitude];
  return null;
}

function normalizeCoordinatePair(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && typeof value.lat === "number" && typeof value.lon === "number") return [value.lat, value.lon];
  if (value && typeof value === "object" && typeof value.latitude === "number" && typeof value.longitude === "number") {
    return [value.latitude, value.longitude];
  }
  return null;
}

function proximityFromRaw(raw) {
  const meters = raw.routeProximityMeters ?? raw.routeProximityMetersApprox ?? raw.proximityMetersApprox;
  const km = raw.routeProximityKm ?? raw.distanceFromEndpointKm;
  if (meters == null && km == null) return null;
  return prune({
    distanceMetersApprox: meters ?? (typeof km === "number" ? Math.round(km * 1000) : null),
    distanceKmApprox: km ?? null
  });
}

function normalizeSourceUrls(raw) {
  return unique(
    [
      raw.sourceUrls,
      raw.sourceUrl,
      raw.sources?.filter?.((source) => typeof source === "string" && source.startsWith("http")),
      raw.url
    ]
      .flat(Infinity)
      .filter((value) => typeof value === "string" && value.startsWith("http"))
  );
}

function normalizeSourceRefs(raw) {
  return unique(
    [raw.sources, raw.sourceRefs]
      .flat(Infinity)
      .filter((value) => typeof value === "string" && !value.startsWith("http"))
  );
}

function collectStrings(values) {
  const out = [];
  function visit(value) {
    if (value == null || value === "") return;
    if (typeof value === "string") {
      out.push(value);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      if (value.summary || value.details || value.description || value.finding || value.notes) {
        visit(value.summary ?? value.details ?? value.description ?? value.finding ?? value.notes);
      }
    }
  }
  visit(values);
  return unique(out);
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function getSectionId(data) {
  return data.sectionId ?? data.id ?? data.section?.id;
}

function enumerate(value) {
  return Array.isArray(value) ? value.map((item, index) => [index, item]) : [];
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

function prune(value) {
  if (Array.isArray(value)) return value.map(prune).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value)
    .map(([key, child]) => [key, prune(child)])
    .filter(([, child]) => child !== null && child !== undefined && !(Array.isArray(child) && child.length === 0));
  return Object.fromEntries(entries);
}

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
