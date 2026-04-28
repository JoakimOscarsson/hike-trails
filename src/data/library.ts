import type {
  Hike,
  KayakFacility,
  KayakTrip,
  LibraryDetail,
  LibraryIndexItem,
  TrailPreset,
  TrailRouteGroup,
  TrailSection,
  TrailSectionIndexItem,
  TrailSystem,
  TrailSystemManifest
} from "../types";

type FetchLike = (input: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export async function fetchJson<T>(publicPath: string, fetchImpl: FetchLike = fetch): Promise<T> {
  const response = await fetchImpl(publicPath);
  if (!response.ok) throw new Error(`Could not load ${publicPath}`);
  return response.json() as Promise<T>;
}

export function withDefaultActivity(items: LibraryIndexItem[]): LibraryIndexItem[] {
  return items.map((item) => (item.activity ? item : { ...item, activity: "hiking" })) as LibraryIndexItem[];
}

export async function loadLibraryIndex(fetchImpl: FetchLike = fetch) {
  try {
    return withDefaultActivity(await fetchJson<LibraryIndexItem[]>("/data/library-index.json", fetchImpl));
  } catch {
    return withDefaultActivity(await fetchJson<LibraryIndexItem[]>("/data/hikes-index.json", fetchImpl));
  }
}

export async function loadKayakFacilities(fetchImpl: FetchLike = fetch) {
  return fetchJson<KayakFacility[]>("/data/kayak-facilities.json", fetchImpl);
}

type TrailSystemIndexRecord = Extract<LibraryIndexItem, { itemType: "trail-system" }>;

export function hasTrailSystemShardPaths(item: TrailSystemIndexRecord) {
  return Boolean(item.manifestPath && item.sectionsIndexPath && item.routeGroupsPath && item.presetsPath);
}

function sectionIndexToRuntimeSection(section: TrailSectionIndexItem, manifest: TrailSystemManifest): TrailSection {
  return {
    ...section,
    description: "",
    utilities: [],
    waterSources: [],
    notes: [],
    facilities: [],
    accessPoints: [],
    source: manifest.source
  };
}

export async function loadTrailSystemFromShards(
  item: TrailSystemIndexRecord,
  fetchImpl: FetchLike = fetch
): Promise<TrailSystem> {
  if (!hasTrailSystemShardPaths(item)) {
    if (!item.detailPath) throw new Error(`Trail system ${item.name} is missing shard paths and detailPath fallback.`);
    return fetchJson<TrailSystem>(item.detailPath, fetchImpl);
  }

  const [manifest, sectionsIndex, routeGroups, presets] = await Promise.all([
    fetchJson<TrailSystemManifest>(item.manifestPath!, fetchImpl),
    fetchJson<TrailSectionIndexItem[]>(item.sectionsIndexPath!, fetchImpl),
    fetchJson<TrailRouteGroup[]>(item.routeGroupsPath!, fetchImpl),
    fetchJson<TrailPreset[]>(item.presetsPath!, fetchImpl)
  ]);

  return {
    ...manifest,
    sections: sectionsIndex.map((section) => sectionIndexToRuntimeSection(section, manifest)),
    routeGroups,
    presets
  };
}

export async function loadLibraryDetail(item: LibraryIndexItem, fetchImpl: FetchLike = fetch): Promise<LibraryDetail> {
  if (item.itemType === "trail-system") return loadTrailSystemFromShards(item, fetchImpl);
  if (item.itemType === "kayak-trip") {
    if (!item.detailPath) throw new Error(`Kayak trip ${item.name} is missing detailPath.`);
    return fetchJson<KayakTrip>(item.detailPath, fetchImpl);
  }
  if (!item.detailPath) throw new Error(`Route ${item.name} is missing detailPath.`);
  return fetchJson<Hike>(item.detailPath, fetchImpl);
}
