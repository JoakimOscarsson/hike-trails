import React from "react";
import L from "leaflet";
import type { LibraryIndexItem, LibraryOverviewFeature, LibraryOverviewFeatureCollection } from "../types";
import { buildOverviewColorMap, fallbackOverviewColor } from "./overviewColors";
import { useLeafletMap } from "./useLeafletMap";

type OverviewLayerRefs = {
  routeLayer: L.GeoJSON;
  connectionLayers: L.GeoJSON[];
};

function routeColor(id: string, colorById: Map<string, string>) {
  return colorById.get(id) ?? fallbackOverviewColor(id);
}

function overviewStyle(id: string, hoveredItemId: string | null, colorById: Map<string, string>, hoverId = id): L.PathOptions {
  const hasHover = Boolean(hoveredItemId);
  const isHovered = hoveredItemId === hoverId;
  const color = routeColor(id, colorById);
  return {
    color: hasHover && !isHovered ? "#8f978c" : color,
    fillColor: hasHover && !isHovered ? "#8f978c" : color,
    fillOpacity: isHovered ? 0.82 : 0.52,
    opacity: hasHover && !isHovered ? 0.24 : 0.88,
    weight: isHovered ? 7 : 4
  };
}

function overviewConnectionStyle(
  id: string,
  hoveredItemId: string | null,
  colorById: Map<string, string>,
  hoverId = id
): L.PathOptions {
  const style = overviewStyle(id, hoveredItemId, colorById, hoverId);
  return {
    ...style,
    dashArray: "8 9",
    lineCap: "round",
    opacity: Math.min((style.opacity ?? 0.88) + 0.08, 0.96),
    weight: hoveredItemId === hoverId ? 6 : 3.5
  };
}

function overviewPointStyle(
  id: string,
  hoveredItemId: string | null,
  colorById: Map<string, string>,
  hoverId = id
): L.CircleMarkerOptions {
  return {
    ...overviewStyle(id, hoveredItemId, colorById, hoverId),
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

function connectionOverlayFeatures(feature: LibraryOverviewFeature) {
  const overlays = "connectionOverlays" in feature.properties ? (feature.properties.connectionOverlays ?? []) : [];
  return overlays.map((overlay, index) => ({
    type: "Feature" as const,
    id: `${feature.properties.id}-connection-${index}`,
    properties: feature.properties,
    geometry: {
      type: overlay.coordinates.length === 1 ? ("LineString" as const) : ("MultiLineString" as const),
      coordinates: overlay.coordinates.length === 1 ? overlay.coordinates[0] : overlay.coordinates
    }
  }));
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
  const layersRef = React.useRef<Map<string, OverviewLayerRefs>>(new Map());
  const hoverIdsRef = React.useRef<Map<string, string>>(new Map());
  const itemMap = React.useMemo(() => new Map(items.map((item) => [item.overviewFeatureId ?? item.id, item])), [items]);
  const colorById = React.useMemo(
    () => buildOverviewColorMap(overview.features.map((feature) => feature.properties?.id).filter((id): id is string => Boolean(id))),
    [overview]
  );

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

        if ("eachLayer" in featureLayer && typeof featureLayer.eachLayer === "function") {
          featureLayer.eachLayer(attachInteractions);
        } else {
          attachInteractions(featureLayer);
        }
      };

      const layer = L.geoJSON(feature, {
        style: () => overviewStyle(id, null, colorById, hoverId),
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, overviewPointStyle(id, null, colorById, hoverId)),
        onEachFeature: (_feature, featureLayer) => attachFeatureInteractions(featureLayer)
      }).addTo(layerGroup);
      const connectionLayers = connectionOverlayFeatures(feature).map((connectionFeature) =>
        L.geoJSON(connectionFeature, {
          style: () => overviewConnectionStyle(id, null, colorById, hoverId),
          onEachFeature: (_feature, featureLayer) => attachFeatureInteractions(featureLayer)
        }).addTo(layerGroup)
      );
      L.geoJSON(feature, {
        style: overviewHitStyle,
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, overviewPointHitStyle()),
        onEachFeature: (_feature, featureLayer) => attachFeatureInteractions(featureLayer)
      }).addTo(layerGroup);
      for (const connectionFeature of connectionOverlayFeatures(feature)) {
        L.geoJSON(connectionFeature, {
          style: overviewHitStyle,
          onEachFeature: (_feature, featureLayer) => attachFeatureInteractions(featureLayer)
        }).addTo(layerGroup);
      }

      layersRef.current.set(id, { routeLayer: layer, connectionLayers });
      hoverIdsRef.current.set(id, hoverId);
      boundsLayers.push(layer);
      boundsLayers.push(...connectionLayers);
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
  }, [colorById, itemMap, mapRef, onHoverItemId, onSelect, overview]);

  React.useEffect(() => {
    for (const [id, { routeLayer, connectionLayers }] of layersRef.current) {
      const hoverId = hoverIdsRef.current.get(id) ?? id;
      routeLayer.setStyle(overviewStyle(id, hoveredItemId, colorById, hoverId));
      routeLayer.eachLayer((childLayer) => {
        if (childLayer instanceof L.CircleMarker) childLayer.setRadius(hoveredItemId === hoverId ? 7 : 5);
      });
      for (const connectionLayer of connectionLayers) {
        connectionLayer.setStyle(overviewConnectionStyle(id, hoveredItemId, colorById, hoverId));
      }
      if (hoveredItemId === hoverId) {
        routeLayer.bringToFront();
        for (const connectionLayer of connectionLayers) connectionLayer.bringToFront();
      }
    }
  }, [colorById, hoveredItemId]);

  return <div ref={containerRef} className="route-map overview-route-map" />;
}
