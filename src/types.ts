export type HikeDifficulty = "Easy" | "Moderate" | "Hard";

export type HikeSource = {
  provider: string;
  url: string;
  siteId?: string;
  lastFetchedAt?: string;
};

export type HikeRoute = {
  status: "ready" | "missing-gpx" | "manual" | "marker-only";
  sourceFormat?: "gpx" | "geojson" | "manual" | "official-network-gpx" | "osm-relation";
  gpxUrl?: string;
  geojsonPath?: string;
};

export type HikeLocation = {
  type: "swedish-county" | "abroad";
  label: string;
  start: [number, number];
};

export type RecommendedTime = "dayhike" | "weekend" | "3-5-days" | "6-plus-days";

export type Hike = {
  id: string;
  name: string;
  region: string;
  country: string;
  location: HikeLocation;
  recommendedTime: RecommendedTime;
  difficulty: HikeDifficulty;
  distanceKm: number;
  estimatedTime: string;
  routeType: "Loop" | "Out and back" | "Point to point";
  season: string;
  description: string;
  gettingThere: string;
  campingRules: string;
  utilities: string[];
  waterSources: string[];
  notes: string[];
  source: HikeSource;
  route: HikeRoute;
  map: {
    center: [number, number];
    zoom: number;
    externalUrl: string;
  };
};

export type HikeIndexItem = Pick<
  Hike,
  | "id"
  | "name"
  | "region"
  | "country"
  | "location"
  | "recommendedTime"
  | "difficulty"
  | "distanceKm"
  | "estimatedTime"
  | "routeType"
> & {
  itemType: "hike";
  recommendedTimes: RecommendedTime[];
  detailPath: string;
  searchText: string;
};

export type TrailSection = {
  id: string;
  stageNumber: number | string;
  name: string;
  from: string;
  to: string;
  distanceKm: number;
  estimatedTime: string;
  description: string;
  utilities: string[];
  waterSources: string[];
  notes: string[];
  facilities: TrailFacility[];
  endpointCoordinates?: {
    source: "route-geometry" | "official-marker" | "approximate";
    start?: [number, number];
    end?: [number, number];
  };
  accessPoints?: TrailAccessPoint[];
  source: HikeSource;
  route: HikeRoute;
};

export type TrailCommuteStop = {
  id: string;
  osmId?: string;
  name: string;
  type: "bus" | "train";
  coordinates: [number, number];
  distanceKm: number;
  network?: string;
  sourceUrl?: string;
};

export type TrailAccessPoint = {
  id: string;
  endpoint: "start" | "end";
  placeName: string;
  coordinates: [number, number];
  coordinateSource: "route-geometry" | "official-marker" | "approximate";
  busStop?: TrailCommuteStop;
  trainStop?: TrailCommuteStop;
  nearestStop?: TrailCommuteStop;
};

export type TrailFacility = {
  id: string;
  name: string;
  type:
    | "campsite"
    | "shelter"
    | "fireplace"
    | "toilet"
    | "water"
    | "natural-water"
    | "food"
    | "swimming"
    | "parking"
    | "transit"
    | "rest-area"
    | "attraction"
    | "heritage"
    | "rule-warning"
    | "unofficial-shelter";
  sectionId: string;
  coordinates?: [number, number];
  description: string;
  routeProximity?: {
    status: "on-route" | "off-route" | "unknown";
    distanceKm?: number;
    thresholdKm: number;
    note?: string;
  };
  source: HikeSource;
};

export type TrailPreset = {
  id: string;
  name: string;
  description: string;
  startSectionId: string;
  endSectionId: string;
};

export type TrailRouteGroup = {
  id: string;
  name: string;
  kind: "mainline" | "branch" | "access" | "connector";
  sectionIds: string[];
  connectsToSectionIds: string[];
  notice: string;
};

export type TrailSystem = {
  id: string;
  itemType: "trail-system";
  name: string;
  region: string;
  country: string;
  location: HikeLocation;
  recommendedTimes: RecommendedTime[];
  difficulty: HikeDifficulty;
  distanceKm: number;
  estimatedTime: string;
  routeType: "Point to point";
  season: string;
  description: string;
  gettingThere: string;
  campingRules: string;
  utilities: string[];
  waterSources: string[];
  notes: string[];
  source: HikeSource;
  map: {
    center: [number, number];
    zoom: number;
    externalUrl: string;
  };
  sections: TrailSection[];
  routeGroups?: TrailRouteGroup[];
  presets: TrailPreset[];
};

export type TrailSystemIndexItem = Pick<
  TrailSystem,
  | "id"
  | "itemType"
  | "name"
  | "region"
  | "country"
  | "location"
  | "recommendedTimes"
  | "difficulty"
  | "distanceKm"
  | "estimatedTime"
  | "routeType"
> & {
  recommendedTime: RecommendedTime;
  sectionDistances: number[];
  routeGroupDistances?: number[][];
  detailPath: string;
  searchText: string;
};

export type LibraryIndexItem = HikeIndexItem | TrailSystemIndexItem;
export type LibraryDetail = Hike | TrailSystem;
