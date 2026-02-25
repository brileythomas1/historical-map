import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJSONFeatureCollection } from "./types";
import type { Feature } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef, useEffect, useState } from "react";
import TimeSlider from "./TimeSlider";

interface MapViewProps {
  year: number;
  setYear: (year: number) => void;
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



function MapView({ year, setYear, events, borders }: MapViewProps) {
  const borderLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const eventLayerRef = useRef<L.GeoJSON<any> | null>(null);

  const [selectedMarker, setSelectedMarker] = useState<null | any>(null);

  // NEW: expanded image state
  const [expandedImage, setExpandedImage] = useState<null | { url: string; title: string }>(null);

  // ESC key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (borderLayerRef.current && borders) {
      borderLayerRef.current.clearLayers();
      borderLayerRef.current.addData(borders as GeoJSON.GeoJsonObject);
    }
  }, [borders]);

  useEffect(() => {
    if (eventLayerRef.current && events) {
      eventLayerRef.current.clearLayers();
      eventLayerRef.current.addData(events as GeoJSON.GeoJsonObject);
    }
  }, [events]);

  const onEachBorderFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties && "country" in feature.properties) {
      layer.bindTooltip(feature.properties.country, { permanent: false, direction: "auto" });
    }
  };

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

        <GeoJSON
          ref={borderLayerRef}
          data={borders as GeoJSON.GeoJsonObject}
          style={borderStyle as any}
          onEachFeature={onEachBorderFeature as any}
        />

        <GeoJSON
          ref={eventLayerRef}
          data={events as GeoJSON.GeoJsonObject}
          onEachFeature={onEachEventFeature as any}
        />
      </MapContainer>
      <TimeSlider year={year} setYear={setYear} />

      {/* Sidebar */}
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

                            {s.description && (
                              <p style={{ margin: "4px 0" }}>{s.description}</p>
                            )}

                            {/* PHOTO (click to expand) */}
                            {s.content_type === "photo" && (
                              <img
                                src={s.url}
                                alt={s.title}
                                style={{
                                  maxWidth: "100%",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  transition: "0.2s",
                                }}
                                onClick={() =>
                                  setExpandedImage({ url: s.url, title: s.title })
                                }
                              />
                            )}

                            {/* VIDEO */}
                            {s.content_type === "video" && (
                              <div style={{ marginTop: 8 }}>
                                <iframe
                                  width="100%"
                                  height="200"
                                  src={`https://www.youtube.com/embed/${s.url}`}
                                  title={s.title}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}

                            {/* OTHER */}
                            {s.content_type !== "photo" &&
                              s.content_type !== "video" && (
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Source
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

      {/* IMAGE MODAL */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}
          >
            <button
              onClick={() => setExpandedImage(null)}
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                background: "white",
                border: "none",
                padding: "8px 12px",
                cursor: "pointer",
                borderRadius: 4,
                fontWeight: "bold",
              }}
            >
              Close
            </button>

            <img
              src={expandedImage.url}
              alt={expandedImage.title}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 6,
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
              }}
            />
            <p style={{ color: "white", marginTop: 10, textAlign: "center" }}>
              {expandedImage.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;