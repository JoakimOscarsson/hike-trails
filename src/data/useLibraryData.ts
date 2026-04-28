import React from "react";
import type {
  ActivityKind,
  KayakFacility,
  LibraryDetail,
  LibraryIndexItem,
  LibraryOverviewFeatureCollection
} from "../types";
import type { LoadState } from "./loadState";
import { loadKayakFacilities, loadLibraryDetail, loadLibraryIndex } from "./library";

const overviewPaths: Record<ActivityKind, string> = {
  hiking: "/data/overviews/hiking.geojson",
  kayaking: "/data/overviews/kayaking.geojson"
};

export function useLibraryData(activeActivity: ActivityKind, selectedItem: LibraryIndexItem | null) {
  const [libraryIndex, setLibraryIndex] = React.useState<LibraryIndexItem[]>([]);
  const [indexState, setIndexState] = React.useState<LoadState>({ status: "idle" });
  const [indexLoadAttempt, setIndexLoadAttempt] = React.useState(0);
  const [activityOverviews, setActivityOverviews] = React.useState<
    Partial<Record<ActivityKind, LibraryOverviewFeatureCollection>>
  >({});
  const [overviewStates, setOverviewStates] = React.useState<Record<ActivityKind, LoadState>>({
    hiking: { status: "idle" },
    kayaking: { status: "idle" }
  });
  const [overviewLoadAttempts, setOverviewLoadAttempts] = React.useState<Record<ActivityKind, number>>({
    hiking: 0,
    kayaking: 0
  });
  const [kayakFacilities, setKayakFacilities] = React.useState<KayakFacility[]>([]);
  const [kayakFacilityState, setKayakFacilityState] = React.useState<LoadState>({ status: "idle" });
  const [loadedDetail, setLoadedDetail] = React.useState<{ itemId: string; detail: LibraryDetail } | null>(null);
  const [detailState, setDetailState] = React.useState<LoadState>({ status: "idle" });
  const [detailLoadAttempt, setDetailLoadAttempt] = React.useState(0);
  const [detailsCache, setDetailsCache] = React.useState<Record<string, LibraryDetail>>({});
  const activeOverviewAttempt = overviewLoadAttempts[activeActivity];
  const selectedDetail = selectedItem && loadedDetail?.itemId === selectedItem.id ? loadedDetail.detail : null;
  const effectiveDetailState =
    selectedItem && detailState.status === "ready" && !selectedDetail ? { status: "loading" as const } : detailState;

  React.useEffect(() => {
    let cancelled = false;
    setIndexState({ status: "loading" });

    loadLibraryIndex()
      .then((items) => {
        if (cancelled) return;
        if (!Array.isArray(items)) throw new Error("Library index is not an array");
        setLibraryIndex(items);
        setIndexState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLibraryIndex([]);
          setIndexState({ status: "error", message: error instanceof Error ? error.message : "Could not load routes." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [indexLoadAttempt]);

  React.useEffect(() => {
    if (indexState.status !== "ready") {
      setActivityOverviews({});
      setOverviewStates({ hiking: { status: "idle" }, kayaking: { status: "idle" } });
      return;
    }

    let cancelled = false;
    const activity = activeActivity;
    setOverviewStates((current) => ({ ...current, [activity]: { status: "loading" } }));

    fetch(overviewPaths[activity])
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${activity} overview`);
        return response.json() as Promise<LibraryOverviewFeatureCollection>;
      })
      .then((overview) => {
        if (cancelled) return;
        setActivityOverviews((current) => ({ ...current, [activity]: overview }));
        setOverviewStates((current) => ({ ...current, [activity]: { status: "ready" } }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setActivityOverviews((current) => {
            const next = { ...current };
            delete next[activity];
            return next;
          });
          setOverviewStates((current) => ({
            ...current,
            [activity]: {
              status: "error",
              message: error instanceof Error ? error.message : `Could not load the ${activity} overview.`
            }
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeActivity, activeOverviewAttempt, indexState.status]);

  React.useEffect(() => {
    if (indexState.status !== "ready" || activeActivity !== "kayaking" || kayakFacilityState.status !== "idle") return;

    let cancelled = false;
    setKayakFacilityState({ status: "loading" });

    loadKayakFacilities()
      .then((facilities) => {
        if (cancelled) return;
        if (!Array.isArray(facilities)) throw new Error("Kayak facilities are not an array");
        setKayakFacilities(facilities);
        setKayakFacilityState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setKayakFacilities([]);
          setKayakFacilityState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load kayak facilities."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeActivity, indexState.status, kayakFacilityState.status]);

  React.useEffect(() => {
    if (!selectedItem) {
      setLoadedDetail(null);
      setDetailState({ status: "idle" });
      return;
    }

    const cached = detailsCache[selectedItem.id];
    if (cached) {
      setLoadedDetail({ itemId: selectedItem.id, detail: cached });
      setDetailState({ status: "ready" });
      return;
    }

    let cancelled = false;
    setLoadedDetail(null);
    setDetailState({ status: "loading" });

    loadLibraryDetail(selectedItem)
      .then((detail) => {
        if (cancelled) return;
        setDetailsCache((current) => ({ ...current, [selectedItem.id]: detail }));
        setLoadedDetail({ itemId: selectedItem.id, detail });
        setDetailState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadedDetail(null);
          setDetailState({
            status: "error",
            message: error instanceof Error ? error.message : `Could not load ${selectedItem.name}.`
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailLoadAttempt, detailsCache, selectedItem]);

  const retryIndex = React.useCallback(() => setIndexLoadAttempt((attempt) => attempt + 1), []);
  const retryDetail = React.useCallback(() => setDetailLoadAttempt((attempt) => attempt + 1), []);
  const retryOverview = React.useCallback((activity: ActivityKind) => {
    setOverviewLoadAttempts((current) => ({ ...current, [activity]: current[activity] + 1 }));
  }, []);

  return {
    libraryIndex,
    indexState,
    retryIndex,
    activityOverviews,
    overviewStates,
    retryOverview,
    kayakFacilities,
    kayakFacilityState,
    selectedDetail,
    detailState: effectiveDetailState,
    retryDetail
  };
}
