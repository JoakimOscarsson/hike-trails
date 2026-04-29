import type { TrailConnectionMode, TrailSection, TrailSectionConnection } from "../types";

export const trailConnectionModeLabels: Record<TrailConnectionMode, string> = {
  "same-island": "same island",
  walk: "walk",
  bus: "bus",
  ferry: "ferry",
  rowboat: "rowboat",
  none: "no direct connection"
};

const drawableTrailConnectionModes = new Set<TrailConnectionMode>(["walk", "bus", "ferry", "rowboat"]);
const transferTrailConnectionModes = new Set<TrailConnectionMode>(["walk", "bus", "ferry", "rowboat"]);

function uniqueSectionIds(sections: TrailSection[]) {
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const section of sections) {
    if (seen.has(section.id)) continue;
    seen.add(section.id);
    ids.push(section.id);
  }

  return ids;
}

export function isDrawableTrailConnection(connection: TrailSectionConnection) {
  return drawableTrailConnectionModes.has(connection.mode) && Boolean(connection.route?.geojsonPath);
}

export function selectedTrailConnections(
  connections: TrailSectionConnection[] | undefined,
  sections: TrailSection[]
) {
  return selectedAdjacentTrailConnections(connections, sections).filter(isDrawableTrailConnection);
}

export function selectedTrailTransferConnections(
  connections: TrailSectionConnection[] | undefined,
  sections: TrailSection[]
) {
  return selectedAdjacentTrailConnections(connections, sections).filter((connection) => transferTrailConnectionModes.has(connection.mode));
}

function selectedAdjacentTrailConnections(
  connections: TrailSectionConnection[] | undefined,
  sections: TrailSection[]
) {
  if (!connections?.length || sections.length < 2) return [];

  const sectionIds = uniqueSectionIds(sections);
  const adjacentPairs = new Set<string>();
  for (let index = 0; index < sectionIds.length - 1; index += 1) {
    const from = sectionIds[index];
    const to = sectionIds[index + 1];
    adjacentPairs.add(`${from}->${to}`);
    adjacentPairs.add(`${to}->${from}`);
  }

  const selected: TrailSectionConnection[] = [];
  const seenConnectionIds = new Set<string>();
  for (const connection of connections) {
    const pair = `${connection.from.sectionId}->${connection.to.sectionId}`;
    if (!adjacentPairs.has(pair) || seenConnectionIds.has(connection.id)) continue;
    seenConnectionIds.add(connection.id);
    selected.push(connection);
  }

  return selected;
}

export function trailConnectionDisplayName(connection: TrailSectionConnection) {
  const routeLabel = [connection.lineName, connection.operator].filter(Boolean).join(" · ");
  const transferLabel = routeLabel || trailConnectionModeLabels[connection.mode];
  return `${connection.from.label} to ${connection.to.label} · ${transferLabel}`;
}
