import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJSONFeatureCollection } from "./types";
import type { Feature } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef, useEffect } from "react";

interface MapViewProps {
  year: number;
  events: GeoJSONFeatureCollection | null;
  borders: GeoJSONFeatureCollection | null;
}

function getCountryColor(country: string): string {
  let hash = 0;
  for (let i = 0; i < country.length; i++) {
    hash = country.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 50%)`;
  return color;
}

const borderStyle = (feature: Feature) => {
  const countryName = feature.properties?.country ?? "Unknown";
  return {
    color: "#333",          // border color
    weight: 1,
    fillOpacity: 0.6,
    fillColor: getCountryColor(countryName),
  };
};



function MapView({ events, borders }: MapViewProps) {
  const borderLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const eventLayerRef = useRef<L.GeoJSON<any> | null>(null);

  // Update borders in-place
  useEffect(() => {
    if (borderLayerRef.current && borders) {
      borderLayerRef.current.clearLayers();
      borderLayerRef.current.addData(borders as GeoJSON.GeoJsonObject);
    }
  }, [borders]);

  // Update events in-place
  useEffect(() => {
    if (eventLayerRef.current && events) {
      eventLayerRef.current.clearLayers();
      eventLayerRef.current.addData(events as GeoJSON.GeoJsonObject);
    }
  }, [events]);

  const onEachEventFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties && "title" in feature.properties) {
      const props = feature.properties as { title: string; description?: string };
      layer.bindPopup(`<strong>${props.title}</strong><br/>${props.description ?? ""}`);
    }
  };

    // Function to attach tooltip to each country
  const onEachBorderFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties && "country" in feature.properties) {
      const countryName = feature.properties.country;
      layer.bindTooltip(countryName, { permanent: false, direction: "auto" });
    }
  };

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: "90vh", width: "100%" }}>
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Borders layer */}
      <GeoJSON
        ref={borderLayerRef}
        data={borders as GeoJSON.GeoJsonObject} // initial load
        style={borderStyle as any}
        onEachFeature={onEachBorderFeature as any}
      />

      {/* Events layer */}
      <GeoJSON
        ref={eventLayerRef}
        data={events as GeoJSON.GeoJsonObject}
        onEachFeature={onEachEventFeature as any}
      />
    </MapContainer>
  );
}

export default MapView;