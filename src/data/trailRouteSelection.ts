import type { LibraryIndexItem, TrailRouteGroup, TrailSection, TrailSystem } from "../types";

export type TrailDistanceFilter = "all" | "short" | "half-day" | "full-day" | "long" | "very-long";
export type TrailDistanceRange = { minKm: number; maxKm?: number };
export type TrailSectionRange = { startSectionId: string; endSectionId: string; distanceKm: number };
export type TrailRouteGroupRange = TrailSectionRange & { routeGroupId: string };

export const trailDistanceFilterRanges: Partial<Record<TrailDistanceFilter, TrailDistanceRange>> = {
  short: { minKm: 0, maxKm: 5 },
  "half-day": { minKm: 5, maxKm: 10 },
  "full-day": { minKm: 10, maxKm: 20 },
  long: { minKm: 20, maxKm: 40 },
  "very-long": { minKm: 40 }
};

function distanceMatchesRange(distanceKm: number, range: TrailDistanceRange) {
  return distanceKm > range.minKm && (typeof range.maxKm !== "number" || distanceKm <= range.maxKm);
}

function routeDistanceGroupsForIndexItem(item: LibraryIndexItem) {
  return item.itemType === "trail-system"
    ? item.routeGroupDistances?.length
      ? item.routeGroupDistances
      : [item.sectionDistances ?? []]
    : [];
}

export function hasTrailSystemRouteInRange(item: LibraryIndexItem, minKm: number, maxKm: number) {
  return hasTrailSystemRouteInDistanceWindow(item, minKm, maxKm);
}

export function hasTrailSystemRouteInDistanceWindow(item: LibraryIndexItem, minKm: number, maxKm?: number) {
  for (const sectionDistances of routeDistanceGroupsForIndexItem(item)) {
    for (let start = 0; start < sectionDistances.length; start += 1) {
      let total = 0;
      for (let end = start; end < sectionDistances.length; end += 1) {
        total += sectionDistances[end];
        if (total > minKm && (typeof maxKm !== "number" || total <= maxKm)) return true;
        if (typeof maxKm === "number" && total > maxKm) break;
      }
    }
  }
  return false;
}

export function hasTrailSystemRouteOver(item: LibraryIndexItem, minKm: number) {
  return hasTrailSystemRouteInDistanceWindow(item, minKm);
}

export function matchingSectionRange(sections: TrailSection[], distanceFilter: TrailDistanceFilter) {
  const range = trailDistanceFilterRanges[distanceFilter];
  if (!range) return null;

  let best: TrailSectionRange | null = null;

  for (let start = 0; start < sections.length; start += 1) {
    let total = 0;
    for (let end = start; end < sections.length; end += 1) {
      total += sections[end].distanceKm;
      if (distanceMatchesRange(total, range) && (!best || total < best.distanceKm)) {
        best = {
          startSectionId: sections[start].id,
          endSectionId: sections[end].id,
          distanceKm: total
        };
      }
      if (typeof range.maxKm === "number" && total > range.maxKm) break;
    }
  }

  return best;
}

export function fallbackRouteGroups(trailSystem: TrailSystem): TrailRouteGroup[] {
  return [
    {
      id: "catalog-order",
      name: "Catalog order",
      kind: "mainline",
      sectionIds: trailSystem.sections.map((section) => section.id),
      connectsToSectionIds: [],
      notice: "This trail does not have explicit branch topology yet; sections are shown in catalog order."
    }
  ];
}

export function routeGroupsForTrailSystem(trailSystem: TrailSystem) {
  return trailSystem.routeGroups?.length ? trailSystem.routeGroups : fallbackRouteGroups(trailSystem);
}

export function sectionLookupForTrailSystem(trailSystem: TrailSystem) {
  return new Map(trailSystem.sections.map((section) => [section.id, section]));
}

export function sectionsForIds(sectionIds: string[], sectionLookup: Map<string, TrailSection>) {
  return sectionIds.map((sectionId) => sectionLookup.get(sectionId)).filter(Boolean) as TrailSection[];
}

export function sectionsForRouteGroup(
  trailSystem: TrailSystem,
  routeGroupId: string,
  sectionLookup = sectionLookupForTrailSystem(trailSystem)
) {
  const groups = routeGroupsForTrailSystem(trailSystem);
  const group = groups.find((candidate) => candidate.id === routeGroupId) ?? groups[0];
  return {
    group,
    sections: sectionsForIds(group.sectionIds, sectionLookup)
  };
}

export function primaryRouteGroups(trailSystem: TrailSystem) {
  const groups = routeGroupsForTrailSystem(trailSystem);
  const mainlineGroups = groups.filter((group) => group.kind === "mainline");
  return mainlineGroups.length ? mainlineGroups : groups;
}

function routeGroupRangeBetweenSections(
  trailSystem: TrailSystem,
  routeGroupId: string,
  startSectionId: string,
  endSectionId: string
) {
  const { sections } = sectionsForRouteGroup(trailSystem, routeGroupId);
  const startIndex = sections.findIndex((section) => section.id === startSectionId);
  const endIndex = sections.findIndex((section) => section.id === endSectionId);
  if (startIndex < 0 || endIndex < startIndex) return null;
  const rangeSections = sections.slice(startIndex, endIndex + 1);
  return {
    routeGroupId,
    startSectionId,
    endSectionId,
    distanceKm: rangeSections.reduce((sum, section) => sum + section.distanceKm, 0)
  };
}

export function matchingPresetRouteGroupRange(trailSystem: TrailSystem, distanceFilter: TrailDistanceFilter) {
  const range = trailDistanceFilterRanges[distanceFilter];
  if (!range) return null;

  for (const preset of trailSystem.presets ?? []) {
    for (const group of primaryRouteGroups(trailSystem)) {
      const routeRange = routeGroupRangeBetweenSections(trailSystem, group.id, preset.startSectionId, preset.endSectionId);
      if (routeRange && distanceMatchesRange(routeRange.distanceKm, range)) return routeRange;
    }
  }

  return null;
}

export function matchingRouteGroupRange(trailSystem: TrailSystem, distanceFilter: TrailDistanceFilter) {
  const presetRange = matchingPresetRouteGroupRange(trailSystem, distanceFilter);
  if (presetRange) return presetRange;

  const groups = primaryRouteGroups(trailSystem);
  let best: TrailRouteGroupRange | null = null;

  for (const group of groups) {
    const { sections } = sectionsForRouteGroup(trailSystem, group.id);
    const range = matchingSectionRange(sections, distanceFilter);
    if (range && (!best || range.distanceKm < best.distanceKm)) {
      best = { routeGroupId: group.id, ...range };
    }
  }

  return best;
}
