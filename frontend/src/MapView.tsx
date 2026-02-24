import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJSONFeatureCollection } from "./types";
import type { Feature } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef, useEffect, useState } from "react";

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
  return `hsl(${hash % 360}, 70%, 50%)`;
}

const borderStyle = (feature: Feature) => {
  const countryName = feature.properties?.country ?? "Unknown";
  return {
    color: "#333",
    weight: 1,
    fillOpacity: 0.6,
    fillColor: getCountryColor(countryName),
  };
};

function MapView({ events, borders }: MapViewProps) {
  const borderLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const eventLayerRef = useRef<L.GeoJSON<any> | null>(null);

  const [selectedMarker, setSelectedMarker] = useState<null | any>(null);

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

  // Tooltip for countries
  const onEachBorderFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties && "country" in feature.properties) {
      layer.bindTooltip(feature.properties.country, { permanent: false, direction: "auto" });
    }
  };

  // Event marker click handler: sets sidebar content
  const onEachEventFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties?.events) {
      layer.on("click", () => setSelectedMarker(feature.properties));
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "90vh", width: "100%" }}>
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Borders layer */}
        <GeoJSON
          ref={borderLayerRef}
          data={borders as GeoJSON.GeoJsonObject}
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

      {/* Sidebar for selected marker */}
      {selectedMarker && (
  <div
    style={{
      width: 320,
      position: "absolute",
      top: 0,
      right: 0,
      height: "100%",
      background: "#fff",
      overflowY: "scroll",
      padding: 16,
      boxShadow: "0 0 10px rgba(0,0,0,0.3)",
      zIndex: 1000,
    }}
  >
    <button
      style={{ float: "right", marginBottom: 16 }}
      onClick={() => setSelectedMarker(null)}
    >
      Close
    </button>
    <h2>Events at this location</h2>

    {selectedMarker.events.map((event: any) => (
      <div key={event.id} style={{ marginBottom: 24 }}>
        <h3>{event.title}</h3>
        <p>
          {[
            event.start_month ? event.start_month.toString().padStart(2, "0") : null,
            event.start_day ? event.start_day.toString().padStart(2, "0") : null,
            event.start_year,
          ]
            .filter(Boolean)
            .join("-")}
          {event.end_year && ` – ${event.end_year}`}
        </p>
        <p>{event.description}</p>

        {/* Sources */}
        {event.sources &&
          ["primary", "secondary"].map((type) => {
            const sourcesOfType = event.sources.filter(
              (s: any) => s.source_type === type
            );
            if (!sourcesOfType.length) return null;

            return (
              <div key={type} style={{ marginTop: 8 }}>
                <h4>{type.charAt(0).toUpperCase() + type.slice(1)} Sources</h4>
                <ul>
                  {sourcesOfType.map((s: any) => (
                    <li key={s.id} style={{ marginBottom: 12 }}>
                      <strong>{s.title}</strong>
                      {s.description && <p style={{ margin: "4px 0" }}>{s.description}</p>}
                      {s.content_type === "photo" ? (
                        <img
                          src={s.url}
                          alt={s.title}
                          style={{ maxWidth: "100%", borderRadius: 4 }}
                        />
                      ) : (
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.url ?? "Link"}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    ))}
  </div>
)}
    </div>
  );
}

export default MapView;