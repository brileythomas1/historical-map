import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJSONFeatureCollection } from "./types";
import type { Feature } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  events: GeoJSONFeatureCollection | null;
}

function MapView({ events }: MapViewProps) {
  const onEachFeature = (
    feature: Feature,
    layer: L.Layer
  ) => {
    if (feature.properties && "title" in feature.properties) {
      const props = feature.properties as {
        title: string;
        description?: string;
      };

      layer.bindPopup(
        `<strong>${props.title}</strong><br/>${props.description ?? ""}`
      );
    }
  };

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "90vh", width: "100%" }}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {events && (
        <GeoJSON
          data={events as GeoJSON.GeoJsonObject}
          onEachFeature={onEachFeature as any}
        />
      )}
    </MapContainer>
  );
}

export default MapView;
