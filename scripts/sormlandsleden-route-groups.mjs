function slugFromStage(stage) {
  return String(stage).replace(/:/g, "-");
}

function sectionIdFromStage(stage) {
  return `sormlandsleden-stage-${slugFromStage(stage)}`;
}

function group({ id, name, kind, stages, connectsTo = [], notice }) {
  return {
    id,
    name,
    kind,
    sectionIds: stages.map(sectionIdFromStage),
    connectsToSectionIds: connectsTo.map(sectionIdFromStage),
    notice
  };
}

export function buildSormlandsledenRouteGroups(sections) {
  const sectionIds = new Set(sections.map((section) => section.id));
  const routeGroups = [
    group({
      id: "mainline-1-62",
      name: "Main route, stages 1-62",
      kind: "mainline",
      stages: Array.from({ length: 62 }, (_, index) => index + 1),
      notice:
        "The continuous Sörmlandsleden main route. Branches and access spurs are separate route groups so they are not accidentally stitched into a through-hike."
    }),
    group({
      id: "branch-nynashamn-paradiset",
      name: "Nynäshamn-Ösmo-Hemfosa branch",
      kind: "branch",
      stages: ["5:1", "5:2", "5:3"],
      connectsTo: [6],
      notice:
        "Official branch/access route from Nynäshamn toward the stage 6 area. It is separate from stage 5 and should not be treated as a direct continuation from Handen."
    }),
    group({
      id: "access-huddinge-stage-6",
      name: "Huddinge access to stage 6",
      kind: "access",
      stages: ["6:1"],
      connectsTo: [6],
      notice: "Access connector from Huddinge station to stage 6. Switch to the main route group to continue."
    }),
    group({
      id: "access-molnbo-stage-12",
      name: "Mölnbo access to stage 12",
      kind: "access",
      stages: ["12:1"],
      connectsTo: [12],
      notice: "Short access connector to stage 12, not a standalone through-route."
    }),
    group({
      id: "access-gnesta-stage-13",
      name: "Gnesta access to stage 13",
      kind: "access",
      stages: ["13:1"],
      connectsTo: [13],
      notice: "Access branch from Gnesta to stage 13. It ends at the main route."
    }),
    group({
      id: "access-nykvarn-stage-13",
      name: "Nykvarn access to stage 13",
      kind: "access",
      stages: ["13:2"],
      connectsTo: [13],
      notice: "Access branch from Nykvarn to stage 13. It is not connected to the Gnesta branch in the builder."
    }),
    group({
      id: "access-laggesta-stage-15",
      name: "Läggesta access to stage 15",
      kind: "access",
      stages: ["15:1"],
      connectsTo: [15],
      notice: "Access connector from Läggesta. Use the main route group to continue beyond stage 15."
    }),
    group({
      id: "connector-marviken-skottvang",
      name: "Mellan-Marviken to Skottvång connector",
      kind: "connector",
      stages: ["15:2"],
      connectsTo: [15, 16],
      notice: "Short connector around Marvikarna/Skottvång; shown separately because it overlaps the main-stage area."
    }),
    group({
      id: "access-akers-stage-16",
      name: "Åkers Styckebruk access to Harsjöhult",
      kind: "access",
      stages: ["16:1"],
      connectsTo: [16, 17],
      notice: "Access branch from Åkers Styckebruk to the stage 16/17 area."
    }),
    group({
      id: "access-halleforsnas-station",
      name: "Hälleforsnäs station access",
      kind: "access",
      stages: ["22:1"],
      connectsTo: [22, 23],
      notice: "Very short station connector. It is useful for arrival/departure, not as a separate hike plan."
    }),
    group({
      id: "branch-flen-halleforsnas",
      name: "Flen-Harpsundsvägen-Hälleforsnäs branch",
      kind: "branch",
      stages: ["23:1", "23:2"],
      connectsTo: [22, 23],
      notice: "Branch from Flen into Hälleforsnäs. Continue on the main route from Hälleforsnäs for stage 23 onward."
    }),
    group({
      id: "branch-eskilstuna-svalboviken",
      name: "Eskilstuna-Hållsta-Kvarntorp-Svalboviken branch",
      kind: "branch",
      stages: ["24:1", "24:2", "24:3"],
      connectsTo: [23, 24],
      notice: "Long Eskilstuna branch that reaches Svalboviken. It is separate from the main stage 24 Lundsjön line."
    }),
    group({
      id: "access-stora-djulo-stage-27",
      name: "Stora Djulö access to stage 27",
      kind: "access",
      stages: ["27:1"],
      connectsTo: [27],
      notice: "Short access branch from Stora Djulö to stage 27."
    }),
    group({
      id: "connector-halsbraten-skjutgropen",
      name: "Halsbråten-Skjutgropen connector",
      kind: "connector",
      stages: ["31:1"],
      connectsTo: [31, 32],
      notice: "Connector between the stage 31 and 32 area; shown separately to avoid accidental catalog-order stitching."
    }),
    group({
      id: "access-kolmarden-stage-32",
      name: "Kolmården access to stage 32",
      kind: "access",
      stages: ["32:2"],
      connectsTo: [32],
      notice: "Short access connector from Kolmården zoo to stage 32."
    }),
    group({
      id: "access-kvarsebo-brytsebo",
      name: "Kvarsebo ferry to Brytsebo",
      kind: "access",
      stages: ["33:1"],
      connectsTo: [33, 34],
      notice: "Access branch from Kvarsebo ferry into the Bråviken/Brytsebo area."
    }),
    group({
      id: "branch-navsjon-bergshammar",
      name: "Nävsjön-Gälkhyttan-Fada-Bergshammar branch",
      kind: "branch",
      stages: ["36:1", "36:2", "36:3"],
      connectsTo: [36, 44],
      notice: "Branch from Nävsjön toward Bergshammar. It does not continue through the coastal stages 37-43."
    }),
    group({
      id: "branch-navekvarn-koppartorp",
      name: "Nävekvarn-Kärrgruvorna-Koppartorp branch",
      kind: "branch",
      stages: ["37:1", "37:2"],
      connectsTo: [37, 42],
      notice: "Alternative branch from Nävekvarn to Koppartorp, separate from the coastal main route through stages 38-41."
    }),
    group({
      id: "branch-oxelosund-ryssbergen",
      name: "Oxelösund/Jogersö to Ryssbergen branch",
      kind: "branch",
      stages: ["44:1"],
      connectsTo: [44],
      notice: "Oxelösund branch ending near Ryssbergen/main-stage access. Switch to the main route group to continue."
    }),
    group({
      id: "branch-nykopingshus-coast",
      name: "Nyköpingshus-Strandstugeviken coastal branch",
      kind: "branch",
      stages: ["45:1"],
      connectsTo: [45],
      notice: "Coastal side branch from Nyköpingshus. It ends away from the next main-stage continuation."
    }),
    group({
      id: "access-blommenhof-hallet",
      name: "Blommenhof-Hållet access",
      kind: "access",
      stages: ["45:2"],
      connectsTo: [45],
      notice: "Short urban access connector into the Hållet/stage 45 area."
    }),
    group({
      id: "access-skavsta-slabro",
      name: "Skavsta airport to Släbro access",
      kind: "access",
      stages: ["46:1"],
      connectsTo: [46, 47],
      notice: "Airport access connector. Use the main route group after Släbro/Vittenberga to continue."
    }),
    group({
      id: "connector-frillingmossen-bjorken",
      name: "Frillingmossen to Lake Björken connector",
      kind: "connector",
      stages: ["50:1"],
      connectsTo: [50, 54],
      notice:
        "Shortcut/connector used for Nynäs-area loops. It jumps from the stage 50 area toward stage 54 and should not be mixed with the full mainline unless planned deliberately."
    }),
    group({
      id: "access-kallviks-brygga",
      name: "Sandvik-Källviks brygga access",
      kind: "access",
      stages: ["53:1"],
      connectsTo: [53],
      notice:
        "Access branch to Källviks brygga and Sävö boat options. Without a booked boat/return plan, treat it as an out-and-back or endpoint branch."
    }),
    group({
      id: "access-vagnharad-stage-55",
      name: "Vagnhärad access to stage 55",
      kind: "access",
      stages: ["55:1"],
      connectsTo: [55],
      notice: "Access branch from Vagnhärad after the 2026 reroute. It ends at the stage 55 area."
    })
  ].map((routeGroup) => ({
    ...routeGroup,
    sectionIds: routeGroup.sectionIds.filter((sectionId) => sectionIds.has(sectionId)),
    connectsToSectionIds: routeGroup.connectsToSectionIds.filter((sectionId) => sectionIds.has(sectionId))
  }));

  return routeGroups.filter((routeGroup) => routeGroup.sectionIds.length > 0);
}
