import React from "react";
import type { TrailSection, TrailSectionDetail } from "../types";
import { fetchJson } from "./library";

export type TrailSectionDetailsState = {
  details: Record<string, TrailSectionDetail>;
  failedCount: number;
};

export function useTrailSectionDetails(trailSystemId: string, selectedSections: TrailSection[]) {
  const [sectionDetailsCache, setSectionDetailsCache] = React.useState<Record<string, TrailSectionDetail>>({});
  const [failedSectionDetailKeys, setFailedSectionDetailKeys] = React.useState<Set<string>>(() => new Set());
  const selectedSectionDetailKey = selectedSections.map((section) => section.detailPath ?? section.id).join("|");
  const selectedSectionsByKey = React.useMemo(
    () =>
      new Map(
        selectedSections.map((section) => [
          section.detailPath ?? section.id,
          section
        ])
      ),
    [selectedSectionDetailKey]
  );

  React.useEffect(() => {
    setSectionDetailsCache({});
    setFailedSectionDetailKeys(new Set());
  }, [trailSystemId]);

  React.useEffect(() => {
    const missingSections = [...selectedSectionsByKey.values()].filter(
      (section) =>
        section.detailPath &&
        !sectionDetailsCache[section.id] &&
        !failedSectionDetailKeys.has(section.detailPath)
    );
    if (!missingSections.length) return;

    let cancelled = false;
    Promise.allSettled(
      missingSections.map((section) =>
        fetchJson<TrailSectionDetail>(section.detailPath!).then((detail) => ({ sectionId: section.id, detail }))
      )
    ).then((results) => {
      if (cancelled) return;
      const loadedDetails: Array<{ sectionId: string; detail: TrailSectionDetail }> = [];
      const failedDetailPaths: string[] = [];

      results.forEach((result, index) => {
        const section = missingSections[index];
        if (!section.detailPath) return;
        if (result.status === "fulfilled" && result.value.detail.trailSystemId === trailSystemId) {
          loadedDetails.push(result.value);
        } else {
          failedDetailPaths.push(section.detailPath);
        }
      });

      if (loadedDetails.length) {
        setSectionDetailsCache((current) => {
          const next = { ...current };
          for (const { sectionId, detail } of loadedDetails) next[sectionId] = detail;
          return next;
        });
      }

      if (failedDetailPaths.length) {
        // Keep the route builder usable from section-index summaries; validation catches missing section shards.
        setFailedSectionDetailKeys((current) => new Set([...current, ...failedDetailPaths]));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [failedSectionDetailKeys, sectionDetailsCache, selectedSectionDetailKey, selectedSectionsByKey, trailSystemId]);

  return React.useMemo<TrailSectionDetailsState>(
    () => ({
      details: sectionDetailsCache,
      failedCount: [...failedSectionDetailKeys].filter((key) => selectedSectionsByKey.has(key)).length
    }),
    [failedSectionDetailKeys, sectionDetailsCache, selectedSectionsByKey]
  );
}
