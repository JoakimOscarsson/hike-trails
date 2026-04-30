import React from "react";
import type { LibraryIndexItem } from "../types";

const starredStorageKey = "hike-library-starred";

function loadStarredItems() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const stored = JSON.parse(window.localStorage.getItem(starredStorageKey) ?? "[]");
    if (!Array.isArray(stored)) return new Set<string>();
    return new Set(stored.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set<string>();
  }
}

export function useStarredItems(libraryIndex: LibraryIndexItem[]) {
  const [starredItemIds, setStarredItemIds] = React.useState<Set<string>>(() => loadStarredItems());

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(starredStorageKey, JSON.stringify(Array.from(starredItemIds)));
  }, [starredItemIds]);

  React.useEffect(() => {
    if (!libraryIndex.length) return;
    const knownIds = new Set(libraryIndex.map((item) => item.id));
    setStarredItemIds((current) => {
      const filtered = new Set([...current].filter((id) => knownIds.has(id)));
      return filtered.size === current.size ? current : filtered;
    });
  }, [libraryIndex]);

  const toggleStar = React.useCallback((id: string) => {
    setStarredItemIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  return { starredItemIds, toggleStar };
}
