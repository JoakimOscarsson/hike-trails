export type HikeDifficulty = "Easy" | "Moderate" | "Hard";

export type ActivityKind = "hiking" | "kayaking";

export type LibraryItemKind = "hike" | "trail-system" | "kayak-trip";

export type GeometryStatus = "ready" | "approximate-waypoint-corridor" | "single-point-only" | "missing";

export type NavigationUse = "navigable-route" | "planning-reference" | "not-for-navigation";

export type ResearchConfidence = "low" | "medium" | "high";

export type ResearchStatus = "catalog-only" | "partially-researched" | "planning-grade";

export type KayakWaterZone = "inner" | "middle" | "outer" | "unknown";

export type KayakExposureLevel = "sheltered" | "mixed" | "exposed";

export type KayakRouteConfidence = ResearchConfidence | "medium-high";

export type RouteGeometrySourceFormat =
  | "gpx"
  | "geojson"
  | "manual"
  | "official-network-gpx"
  | "official-provisional-network"
  | "osm-relation"
  | "approximate-waypoint-corridor";

export type HikeSource = {
  provider: string;
  url: string;
  siteId?: string;
  lastFetchedAt?: string;
  title?: string;
  lastAccessedAt?: string;
  notes?: string;
};

export type HikeRoute = {
  status: "ready" | "missing-gpx" | "manual" | "marker-only";
  sourceFormat?: RouteGeometrySourceFormat;
  gpxUrl?: string;
  geojsonPath?: string;
};

export type HikeLocation = {
  type: "swedish-county" | "abroad";
  label: string;
  start: [number, number];
};

export type RecommendedTime = "dayhike" | "weekend" | "3-5-days" | "6-plus-days";

export type TripDuration = "half-day" | RecommendedTime;

export type RouteGeometryRef = {
  geojsonPath?: string;
  geometryStatus: GeometryStatus;
  mapConfidence: ResearchConfidence | "missing";
  navigationUse: NavigationUse;
  sourceFormat: RouteGeometrySourceFormat;
  warning?: string;
};

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
  activity?: "hiking";
  recommendedTimes: RecommendedTime[];
  detailPath: string;
  overviewFeatureId?: string;
  searchText: string;
  normalizedSearchText?: string;
};

export type TrailSection = {
  id: string;
  detailPath?: string;
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
    | "unofficial-shelter"
    | "trail-junction"
    | "lodging"
    | "waste"
    | "hazard"
    | "viewpoint"
    | "camping"
    | "service";
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
  activity?: "hiking";
  recommendedTime: RecommendedTime;
  sectionDistances: number[];
  routeGroupDistances?: number[][];
  manifestPath?: string;
  sectionsIndexPath?: string;
  routeGroupsPath?: string;
  presetsPath?: string;
  overviewFeatureId?: string;
  detailPath?: string;
  searchText: string;
  normalizedSearchText?: string;
};

export type HikingOverviewFeatureProperties = {
  id: string;
  activity: "hiking";
  itemType: "hike" | "trail-system";
  name: string;
  detailPath?: string;
  distanceKm: number;
  estimatedTime: string;
  difficulty: string;
  routeType: string;
  locationLabel: string;
  recommendedTime?: RecommendedTime;
  geometryStatus: GeometryStatus;
};

export type HikingOverviewGeometry = GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Point;

export type HikingOverviewFeature = GeoJSON.Feature<HikingOverviewGeometry, HikingOverviewFeatureProperties>;

export type HikingOverviewFeatureCollection = GeoJSON.FeatureCollection<
  HikingOverviewGeometry,
  HikingOverviewFeatureProperties
> & {
  name?: string;
  generatedFrom?: string;
};

export type GenericLibraryIndexItem = {
  id: string;
  activity: ActivityKind;
  itemType: LibraryItemKind;
  name: string;
  region: string;
  country: string;
  locationLabel: string;
  recommendedTimes: TripDuration[];
  difficulty: string;
  distanceKm: number | null;
  estimatedTime: string;
  routeType: string;
  detailPath?: string;
  manifestPath?: string;
  sectionsIndexPath?: string;
  routeGroupsPath?: string;
  presetsPath?: string;
  overviewGeometryPath?: string;
  searchText: string;
  normalizedSearchText?: string;
  tags?: string[];
};

export type KayakTripIndexItem = GenericLibraryIndexItem & {
  activity: "kayaking";
  itemType: "kayak-trip";
  detailPath: string;
  routePath: string;
  overviewFeatureId: string;
  waterZone: KayakWaterZone;
  archipelagoRegion: string;
  exposureLevel: KayakExposureLevel;
  routeConfidence: KayakRouteConfidence;
  mapConfidence: ResearchConfidence | "missing";
  hasFollowup: boolean;
};

export type KayakPlace = {
  name: string;
  coordinates?: [number, number];
  notes?: string;
};

export type KayakAccess = {
  publicTransport: string[];
  ferry: string[];
  parking: string[];
  launchNotes: string[];
  other: string[];
};

export type KayakTrip = {
  id: string;
  activity: "kayaking";
  itemType: "kayak-trip";
  name: string;
  region: string;
  country: string;
  area: string;
  waterArea: string;
  archipelagoRegion: string;
  waterZone: KayakWaterZone;
  exposureLevel: KayakExposureLevel;
  coverageTags: string[];
  recommendedTimes: TripDuration[];
  difficulty: string;
  distanceKm: number | null;
  estimatedTime: string;
  routeType: string;
  season: string;
  description: string;
  start: KayakPlace | null;
  end: KayakPlace | null;
  waypoints: KayakPlace[];
  access: KayakAccess;
  safety?: {
    exposure?: string;
    crossings?: string[];
    windWeatherNotes?: string[];
    navigationNotes?: string[];
    seasonalNotes?: string[];
    confidence?: KayakRouteConfidence;
  };
  campingRules?: string | string[];
  protectionRules?: {
    summary?: string;
    needsFollowup?: string[];
  } | null;
  facilityRefs: string[];
  rentalRefs: string[];
  facilityNotes: string[];
  sources: HikeSource[];
  research: {
    status: ResearchStatus;
    routeConfidence: KayakRouteConfidence;
    facilityConfidence: ResearchConfidence;
    needsFollowup: string[];
    contradictions: string[];
    corrections: string[];
    caveats: string[];
    sourceFile?: string;
    sourceSnapshotPath: string;
  };
  route: RouteGeometryRef & {
    geojsonPath: string;
    navigationUse: "not-for-navigation";
    warning: string;
  };
  map: {
    center: [number, number];
    zoom: number;
  };
  sourceFile?: string;
};

export type KayakFacilityType =
  | "kayak-rental"
  | "canoe-rental"
  | "self-service-rental"
  | "launch"
  | "parking"
  | "transport"
  | "campsite"
  | "guest-harbor-natural-harbor";

export type KayakFacility = {
  id: string;
  activity: "kayaking";
  name: string;
  type: KayakFacilityType;
  primaryCategory: string;
  categories: string[];
  serviceTags: string[];
  area: string;
  coordinates?: [number, number];
  coordinateSource?: string;
  mapConfidence: ResearchConfidence | string;
  description: string;
  access: string[];
  routeIds: string[];
  candidateRouteIds: string[];
  parkingType: string | null;
  launchCarry: string | null;
  overnightSuitability: string | null;
  bookingModel: string;
  supportsOwnKayak: string;
  sources: HikeSource[];
  needsFollowup: string[];
  sourceFile?: string;
};

export type KayakOverviewFeatureProperties = Omit<KayakTripIndexItem, "searchText" | "normalizedSearchText" | "tags"> & {
  geometryStatus: GeometryStatus;
  mapConfidence: ResearchConfidence | "missing";
  navigationUse: "not-for-navigation";
  warning: string;
};

export type LibraryOverviewFeatureProperties = HikingOverviewFeatureProperties | KayakOverviewFeatureProperties;
export type LibraryOverviewGeometry = GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Point;
export type LibraryOverviewFeature = GeoJSON.Feature<LibraryOverviewGeometry, LibraryOverviewFeatureProperties>;
export type LibraryOverviewFeatureCollection = GeoJSON.FeatureCollection<
  LibraryOverviewGeometry,
  LibraryOverviewFeatureProperties
> & {
  name?: string;
  activity?: ActivityKind;
  generatedFrom?: string;
};

export type TrailSystemManifest = Omit<TrailSystem, "sections" | "routeGroups" | "presets"> & {
  manifestPath?: string;
  sectionsIndexPath?: string;
  routeGroupsPath?: string;
  presetsPath?: string;
};

export type TrailSectionIndexItem = Pick<
  TrailSection,
  "id" | "stageNumber" | "name" | "from" | "to" | "distanceKm" | "estimatedTime" | "endpointCoordinates" | "route"
> & {
  detailPath: string;
};

export type TrailSectionDetail = TrailSection & {
  trailSystemId: string;
};

export type HikingLibraryIndexItem = HikeIndexItem | TrailSystemIndexItem;
export type LibraryIndexItem = HikeIndexItem | TrailSystemIndexItem | KayakTripIndexItem;
export type LibraryDetail = Hike | TrailSystem | KayakTrip;
