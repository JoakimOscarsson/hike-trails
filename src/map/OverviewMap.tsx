import React from "react";
import L from "leaflet";
import type { LibraryIndexItem, LibraryOverviewFeature, LibraryOverviewFeatureCollection } from "../types";
import { useLeafletMap } from "./useLeafletMap";

const routeColors = ["#d85b36", "#2f6f8f", "#46623b", "#6d5b9b", "#b9802f", "#5f6d7a"];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function routeColor(id: string) {
  return routeColors[hashString(id) % routeColors.length];
}

function overviewStyle(id: string, hoveredItemId: string | null, hoverId = id): L.PathOptions {
  const hasHover = Boolean(hoveredItemId);
  const isHovered = hoveredItemId === hoverId;
  return {
    color: hasHover && !isHovered ? "#8f978c" : routeColor(id),
    fillColor: hasHover && !isHovered ? "#8f978c" : routeColor(id),
    fillOpacity: isHovered ? 0.82 : 0.52,
    opacity: hasHover && !isHovered ? 0.24 : 0.88,
    weight: isHovered ? 7 : 4
  };
}

function overviewPointStyle(id: string, hoveredItemId: string | null, hoverId = id): L.CircleMarkerOptions {
  return {
    ...overviewStyle(id, hoveredItemId, hoverId),
    radius: hoveredItemId === hoverId ? 7 : 5
  };
}

function overviewHitStyle(): L.PathOptions {
  return {
    color: "#000000",
    fillColor: "#000000",
    fillOpacity: 0.01,
    opacity: 0.01,
    weight: 18
  };
}

function overviewPointHitStyle(): L.CircleMarkerOptions {
  return {
    ...overviewHitStyle(),
    radius: 13
  };
}

function tooltipText(properties: LibraryOverviewFeature["properties"]) {
  const distance = Number.isFinite(properties.distanceKm) ? `${properties.distanceKm} km` : "Distance unknown";
  return `${properties.name} · ${distance} · ${properties.difficulty}`;
}

export function OverviewMap({
  overview,
  items,
  hoveredItemId,
  onHoverItemId,
  onSelect
}: {
  overview: LibraryOverviewFeatureCollection;
  items: LibraryIndexItem[];
  hoveredItemId: string | null;
  onHoverItemId: (id: string | null) => void;
  onSelect: (item: LibraryIndexItem) => void;
}) {
  const { containerRef, mapRef } = useLeafletMap([59.35, 17.1], 7);
  const layersRef = React.useRef<Map<string, L.GeoJSON>>(new Map());
  const hoverIdsRef = React.useRef<Map<string, string>>(new Map());
  const itemMap = React.useMemo(() => new Map(items.map((item) => [item.overviewFeatureId ?? item.id, item])), [items]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layerGroup = L.layerGroup().addTo(map);
    const boundsLayers: L.Layer[] = [];
    layersRef.current.clear();
    hoverIdsRef.current.clear();

    for (const feature of overview.features) {
      const id = feature.properties?.id;
      const item = id ? itemMap.get(id) : undefined;
      if (!id || !item) continue;
      const hoverId = item.id;
      const attachFeatureInteractions = (featureLayer: L.Layer) => {
        const attachInteractions = (targetLayer: L.Layer) => {
          targetLayer.on({
            click: () => onSelect(item),
            mouseout: () => onHoverItemId(null),
            mouseover: () => onHoverItemId(hoverId)
          });
          targetLayer.bindTooltip(tooltipText(feature.properties), {
            direction: "top",
            sticky: true
          });
        };

        attachInteractions(featureLayer);
        if ("eachLayer" in featureLayer && typeof featureLayer.eachLayer === "function") {
          featureLayer.eachLayer(attachInteractions);
        }
      };

      const layer = L.geoJSON(feature, {
        style: () => overviewStyle(id, null, hoverId),
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, overviewPointStyle(id, null, hoverId)),
        onEachFeature: (_feature, featureLayer) => attachFeatureInteractions(featureLayer)
      }).addTo(layerGroup);
      L.geoJSON(feature, {
        style: overviewHitStyle,
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, overviewPointHitStyle()),
        onEachFeature: (_feature, featureLayer) => attachFeatureInteractions(featureLayer)
      }).addTo(layerGroup);

      layersRef.current.set(id, layer);
      hoverIdsRef.current.set(id, hoverId);
      boundsLayers.push(layer);
    }

    if (boundsLayers.length) {
      const bounds = L.featureGroup(boundsLayers).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { animate: false, padding: [32, 32] });
    }

    return () => {
      layersRef.current.clear();
      hoverIdsRef.current.clear();
      layerGroup.remove();
    };
  }, [itemMap, mapRef, onHoverItemId, onSelect, overview]);

  React.useEffect(() => {
    for (const [id, layer] of layersRef.current) {
      const hoverId = hoverIdsRef.current.get(id) ?? id;
      layer.setStyle(overviewStyle(id, hoveredItemId, hoverId));
      layer.eachLayer((childLayer) => {
        if (childLayer instanceof L.CircleMarker) childLayer.setRadius(hoveredItemId === hoverId ? 7 : 5);
      });
      if (hoveredItemId === hoverId) layer.bringToFront();
    }
  }, [hoveredItemId]);

  return <div ref={containerRef} className="route-map overview-route-map" />;
}
