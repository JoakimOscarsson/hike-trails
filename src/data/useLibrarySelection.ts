import React from "react";
import type { ActivityKind, LibraryIndexItem } from "../types";

export function useLibrarySelection() {
  const [activeActivity, setActiveActivity] = React.useState<ActivityKind>("hiking");
  const [selectedItem, setSelectedItem] = React.useState<LibraryIndexItem | null>(null);
  const [hoveredItemId, setHoveredItemId] = React.useState<string | null>(null);

  const selectItem = React.useCallback((item: LibraryIndexItem) => {
    setSelectedItem(item);
    setHoveredItemId(null);
  }, []);

  const backToOverview = React.useCallback(() => {
    setSelectedItem(null);
  }, []);

  const changeActivity = React.useCallback((activity: ActivityKind) => {
    setActiveActivity(activity);
    setSelectedItem(null);
    setHoveredItemId(null);
  }, []);

  const clearSelectedItem = React.useCallback(() => {
    setSelectedItem(null);
  }, []);

  const replaceSelectedItem = React.useCallback((item: LibraryIndexItem) => {
    setSelectedItem(item);
  }, []);

  return {
    activeActivity,
    selectedItem,
    hoveredItemId,
    setHoveredItemId,
    selectItem,
    backToOverview,
    changeActivity,
    replaceSelectedItem,
    clearSelectedItem
  };
}

export function useVisibleItemSelectionGuard({
  selectedItem,
  visibleItems,
  replaceSelectedItem,
  clearSelectedItem
}: {
  selectedItem: LibraryIndexItem | null;
  visibleItems: LibraryIndexItem[];
  replaceSelectedItem: (item: LibraryIndexItem) => void;
  clearSelectedItem: () => void;
}) {
  React.useEffect(() => {
    if (!visibleItems.length) {
      if (selectedItem) clearSelectedItem();
      return;
    }
    if (selectedItem) {
      const currentItem = visibleItems.find((item) => item.id === selectedItem.id);
      if (!currentItem) {
        clearSelectedItem();
      } else if (currentItem !== selectedItem) {
        replaceSelectedItem(currentItem);
      }
    }
  }, [clearSelectedItem, replaceSelectedItem, selectedItem, visibleItems]);
}
