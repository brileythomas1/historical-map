import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Polyline } from "react-leaflet";
import type { GeoJSONFeatureCollection } from "./types";
import type { Feature } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";
import { useRef, useEffect, useState, useMemo } from "react";
import TimeSlider from "./TimeSlider";

interface MapViewProps {
  year: number;
  setYear: (year: number) => void;
  events: GeoJSONFeatureCollection | null;
  borders: GeoJSONFeatureCollection | null;
}

// Two different tile layers for standard and satellite views
const SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const OSM_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// Map country name to a consistent color using a hash function
function getCountryColor(country: string): string {
  let hash = 0;
  for (let i = 0; i < country.length; i++) {
    hash = country.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 70%, 50%)`;  
}



// Sync mini-map view and draw rectangle for current main map bounds
function MiniMapBounds({ parentMap }: { parentMap: L.Map }) {
  const miniMap = useMap();

  useEffect(() => {
    if (!parentMap) return;

    const sync = () => {
      miniMap.setView(parentMap.getCenter(), parentMap.getZoom() - 3);
    };

    sync();
    parentMap.on("move", sync);

    return () => {
      parentMap.off("move", sync);
    };
  }, [parentMap, miniMap]);

  useEffect(() => {
  if (!parentMap) return;

  const rect = L.rectangle(parentMap.getBounds(), {
    color: "#ff7800",
    weight: 1,
    fillOpacity: 0.1,
  }).addTo(miniMap);

  const updateRect = () => {
    rect.setBounds(parentMap.getBounds());
  };

  parentMap.on("move", updateRect);

  return () => {
    parentMap.off("move", updateRect);
    miniMap.removeLayer(rect);
  };
}, [parentMap, miniMap]);


  return null;
}

function MapClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  const map = useMap();

  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng);
    };

    map.on("click", handler);

    return () => {
      map.off("click", handler);
    };
  }, [map, onClick]);

  return null;
}

// Color country borders based on country name
const borderStyle = (feature: Feature) => {
  const countryName = feature.properties?.country ?? "Unknown";
  return {
    color: "#333",
    weight: 1,
    fillOpacity: 0.6,
    fillColor: getCountryColor(countryName),
    interactive: true,
  };
};

// Main MapView component
function MapView({ year, setYear, events, borders }: MapViewProps) {
  const borderLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const eventLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, dragging: false });

  const [mapMode, setMapMode] = useState<"standard" | "satellite">("standard");
  const [selectedMarker, setSelectedMarker] = useState<null | any>(null);
  const [expandedImage, setExpandedImage] = useState<null | { url: string; title: string }>(null);
  const [newsFeed, setNewsFeed] = useState(false);
  const [gameMode, setGameMode] = useState<"idle" | "guessing" | "revealed" | "completed" >("idle");
  const [targetEvent, setTargetEvent] = useState<any | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [markersVisible, setMarkersVisible] = useState(true);
  const [gamePos, setGamePos] = useState({ x: 40, y: 100 });
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [guessLocation, setGuessLocation] = useState<L.LatLng | null>(null);
  const [actualLocation, setActualLocation] = useState<L.LatLng | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Reset marker visibility after game is done
  useEffect(() => {
    if (gameMode === "idle") setMarkersVisible(true);
  }, [gameMode]);

  // Stuff to allow user to drag the game prompt around the screen while playing
  function onMouseDown(e: React.MouseEvent) {
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX - gamePos.x;
    dragRef.current.startY = e.clientY - gamePos.y;
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragRef.current.dragging) return;

    setGamePos({
      x: e.clientX - dragRef.current.startX,
      y: e.clientY - dragRef.current.startY,
    });
  }

  function onMouseUp() {
    dragRef.current.dragging = false;
  }

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [gamePos]);

  // Get random event from current events data for game mode
  function getRandomEvent() {
    if (!events?.features?.length) return null;

    const allEvents = events.features.flatMap(
      (f: any) => f.properties?.events || []
    );

    if (!allEvents.length) return null;

    return allEvents[Math.floor(Math.random() * allEvents.length)];
  }

function startGame() {
    const event = getRandomEvent();
    if (!event) return;

    const result = findEventLocation(event.id);
    if (!result) return;

    const [lng, lat] = result.geometry.coordinates;

    setTargetEvent(event);
    setActualLocation(new L.LatLng(lat, lng));
    setGuessLocation(null);
    setDistance(null);
    setUserAnswer("");

    setGameMode("guessing");

    setMarkersVisible(false);
  }

function endGame() {
    setGameMode("idle");
    setGuessLocation(null);
    setActualLocation(null);
    setDistance(null);
    setTargetEvent(null);
  }


function submitGuess() {
    if (!guessLocation || !actualLocation) return;

    const dist = guessLocation.distanceTo(actualLocation);

    setDistance(dist);
    setGameMode("revealed");

    mapRef.current?.flyTo(actualLocation, 5, { duration: 1 });
  }

  // Iterate through events to find the one with the matching ID and return its location
  function findEventLocation(eventId: string) {
  if (!events?.features) return null;

  for (const feature of events.features as any[]) {
    const match = feature.properties?.events?.find(
      (e: any) => e.id === eventId
    );

    if (match) {
      return {
        event: match,
        geometry: feature.geometry,
      };
    }
  }

  return null;
}

  // ESC key support for closing expanded images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update border and event layers when data changes
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

  // Bind tooltips to country borders and click handlers to event markers
  const onEachBorderFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties && "country" in feature.properties) {
      layer.bindTooltip(feature.properties.country, { sticky: true, interactive: true, permanent: false, direction: "auto" });
    }
  };

  // Select marker and show sidebar when clicking on event features
  const onEachEventFeature = (feature: Feature, layer: L.Layer) => {
    if (feature.properties?.events) {
      layer.on("click", () => setSelectedMarker(feature.properties));
    }
  };

  // Categories for filtering events
  const categories = [
    "political",
    "technological",
    "ecological",
    "space",
    "legal",
    "disaster",
    "cultural",
    "territorial",
    "economic",
  ];

  const categoryColors: Record<string, string> = {
    political: "#3b82f6",
    technological: "#22c55e",
    ecological: "#10b981",
    space: "#6366f1",
    legal: "#a855f7",
    disaster: "#ef4444",
    cultural: "#ec4899",
    territorial: "#f59e0b",
    economic: "#eab308",
  };

  // Filter events based on active categories; if none active, show all
  const filteredEventsGeoJSON = useMemo(() => {
    if (!events) return null;

    if (activeCategories.length === 0) return events;

    return {
      ...events,
      features: events.features.filter((feature: any) => {
        const featureEvents = feature.properties?.events || [];
        return featureEvents.some((e: any) =>
          activeCategories.includes(e.category)
        );
      }),
    };
  }, [events, activeCategories]);

  // Update event layer when filters change
  useEffect(() => {
    if (eventLayerRef.current && filteredEventsGeoJSON) {
      eventLayerRef.current.clearLayers();
      eventLayerRef.current.addData(
        filteredEventsGeoJSON as GeoJSON.GeoJsonObject
      );
    }
  }, [filteredEventsGeoJSON]);

  // When game mode switches to revealed, show event details in sidebar
  useEffect(() => {
  if (gameMode === "revealed" && targetEvent) {
    const result = findEventLocation(targetEvent.id);
    if (!result) return;

    setSelectedMarker({
      events: [result.event],
    });
  }
}, [gameMode, targetEvent]);

  // Sort events by date for news feed
  const sortedEvents = (() => {
  if (!events?.features) return [];

  return events.features
    .flatMap((feature: any) => feature.properties?.events || [])
    .filter((event: any) => {
      if (activeCategories.length === 0) return true;
      return activeCategories.includes(event.category);
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(
        a.start_year,
        (a.start_month || 1) - 1,
        a.start_day || 1
      ).getTime();

      const dateB = new Date(
        b.start_year,
        (b.start_month || 1) - 1,
        b.start_day || 1
      ).getTime();

      return dateA - dateB;
    });
})();
  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* Main map */}
      <MapContainer 
      center={[20, 0]} zoom={2} 
      style={{ height: "100%", width: "100%" }} 
      ref ={mapRef}
      >
        
        {/* Tile Layer to select satellite or normal mode */}
        <TileLayer
          attribution={
            mapMode === "satellite"
              ? "Tiles © Esri"
              : "© OpenStreetMap contributors"
          }
          url={mapMode === "satellite" ? SATELLITE_URL : OSM_URL}
        />
        <GeoJSON
          ref={borderLayerRef}
          data={borders as GeoJSON.GeoJsonObject}
          style={borderStyle as any}
          onEachFeature={onEachBorderFeature as any}
        />

        {markersVisible && (
          <GeoJSON
            ref={eventLayerRef}
            data={filteredEventsGeoJSON as GeoJSON.GeoJsonObject}
            onEachFeature={onEachEventFeature as any}
          />
        )}
        {gameMode === "guessing" && (
          <MapClickHandler onClick={(latlng) => setGuessLocation(latlng)} />
        )}
        {(gameMode === "guessing" || gameMode === "revealed") && guessLocation && (
          <Marker position={guessLocation} />
        )}
        {gameMode !== "guessing" && actualLocation && (
          <>
            <Marker position={actualLocation} />
            {gameMode === "revealed" && guessLocation && actualLocation && (
              <Polyline positions={[guessLocation, actualLocation]} />
            )}
          </>
        )}
        <button
          onClick={() =>
            setMapMode(mapMode === "standard" ? "satellite" : "standard")
          }
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 1000,
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#111",
            color: "white",
            cursor: "pointer",
          }}
        >
          {mapMode === "standard" ? "Satellite" : "Map"}
        </button>
      </MapContainer>
      {/* Filters */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          right: 0,
          transform: "translateY(-50%)",
          zIndex: 1000,
          width: 175,
          padding: "8px 8px",
          borderTopLeftRadius: 14,
          borderBottomLeftRadius: 14,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "-10px 0 25px rgba(0,0,0,0.12)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 8,
            textAlign: "center",
            opacity: 0.7,
            letterSpacing: "0.04em",
          }}
        >
          Filters
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {categories.map((cat) => {
            const active = activeCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategories((prev) =>
                    prev.includes(cat)
                      ? prev.filter((c) => c !== cat)
                      : [...prev, cat]
                  );
                }}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  fontSize: 11,
                  textTransform: "capitalize",
                  transition: "all 0.15s ease",
                  background: active
                    ? categoryColors[cat]
                    : "rgba(255,255,255,0.75)",

                  color: active ? "white" : "#222",

                  boxShadow: active
                    ? `0 6px 16px ${categoryColors[cat]}55`
                    : "0 2px 6px rgba(0,0,0,0.06)",

                  transform: active ? "translateY(-1px)" : "translateY(0)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.95)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.75)";
                  }
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
      {/* Toggle News Feed Tab */}
      <div
          onClick={() => {
            if (gameMode === "guessing" || gameMode === "revealed") return;
            setNewsFeed(!newsFeed);
          }}
        style={{
          position: "absolute",
          top: "50%",
          left: newsFeed ? 328 : 0,
          transform: "translateY(-50%)",
          zIndex: 1500,
          background: "#111",
          color: "white",
          padding: "10px 8px",
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
          cursor: "pointer",
          transition: "left 0.3s ease",
          fontSize: 12,
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {newsFeed ? "Close" : "News"}
      </div>
      {/* News Feed */}
      <div
        style={{
          position: "absolute",
          top: 0,
          transform: newsFeed ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          width: 300,
          cursor: "pointer",
          height: "100%",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          overflowY: "auto",
          padding: "16px 14px",
          boxShadow: "10px 0 30px rgba(0,0,0,0.15)",
          zIndex: 1400,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>
          {year} Events
        </h2>
        {sortedEvents.map((event: any) => (
          <div
            key={event.id}
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "rgba(255,255,255,0.7)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
            onClick={() => {
            const result = findEventLocation(event.id);
            if (!result || !mapRef.current) return;

            setSelectedMarker({
              events: [result.event],
            });

            {/* Fly to event location on map when clicking news feed item */}
            const coords = result.geometry?.coordinates;

            if (coords) {
              const [lng, lat] = coords;
              mapRef.current.flyTo([lat, lng], 5, {
                duration: 0.4,
              });
            }
          }}
          >
            <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>
              {event.title}
            </h3>

            <p style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              {[
                event.start_month?.toString().padStart(2, "0"),
                event.start_day?.toString().padStart(2, "0"),
                event.start_year,
              ]
                .filter(Boolean)
                .join("-")}
            </p>


          </div>
        ))}
      </div>
      {/* Game */}
      {gameMode === "idle" && (
        <button
          onClick={startGame}
          style={{
            position: "absolute",
            top: 70,
            right: 20,
            zIndex: 900,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#1a1a1a",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Start Game
        </button>
      )}
    {/* Show/Hide Markers */}
    <button
      onClick={() => setMarkersVisible(v => !v)}
      style={{
        position: "absolute",
        top: 120,
        right: 20,
        zIndex: 1000,
        padding: "8px 12px",
        borderRadius: 8,
        border: "none",
        background: "#111",
        color: "white",
        cursor: "pointer",
      }}
    >
      {markersVisible ? "Hide Markers" : "Show Markers"}
    </button>
    {/* Game Prompt */}
      {gameMode === "guessing" && targetEvent && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translate(${gamePos.x}px, ${gamePos.y}px)`,
            zIndex: 2000,
            width: 320,
            background: "rgba(255,255,255,0.95)",
            padding: 12,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            fontFamily: "system-ui",
          }}
        >
          <div
            onMouseDown={onMouseDown}
            style={{
              cursor: "grab",
              padding: "6px 8px",
              marginBottom: 8,
              borderRadius: 6,
              background: "rgba(0,0,0,0.05)",
              fontWeight: 600,
              userSelect: "none",
            }}
          >
            Find This Event! (drag here)
          </div>
          <p><b>Year:</b> {targetEvent.start_year}</p>
          <p><b>Title:</b> {targetEvent.title}</p>

          <p>Click the map to place your guess</p>

          <button 
            disabled={!guessLocation}
            onClick={submitGuess}
          >
            Submit Guess
          </button>

          <button onClick={endGame}>Quit</button>
        </div>
      )}
      {gameMode === "revealed" && targetEvent && distance !== null && (
        <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translate(${gamePos.x}px, ${gamePos.y}px)`,
            zIndex: 2000,
            width: 320,
            background: "rgba(255,255,255,0.95)",
            padding: 12,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            fontFamily: "system-ui",
          }}>
          <h3>How close were you?</h3>

          <p>Distance: {(distance / 1000).toFixed(1)} km</p>

          <p style={{ marginTop: 10 }}>
            Now reflect on the event:
          </p>

          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="What did you learn from the sources?"
            style={{ width: "100%", height: 80 }}
          />

          <button
            onClick={() => setGameMode("completed")}
          >
            Finish
          </button>
        </div>
      )}
      {gameMode === "completed" && (
        <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translate(${gamePos.x}px, ${gamePos.y}px)`,
            zIndex: 2000,
            width: 320,
            background: "rgba(255,255,255,0.95)",
            padding: 12,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            fontFamily: "system-ui",}}>
          <h3>Completed!</h3>

          <p>Distance: {(distance! / 1000).toFixed(1)} km</p>

          <p><b>Your reflection:</b></p>
          <p>{userAnswer}</p>

          <button onClick={() => endGame()}>
            End Game
          </button>
        </div>
      )}
      {/* Minimap */}
      {mapRef.current && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              width: 200,
              height: 140,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              border: "2px solid white",
              zIndex: 1000,
            }}
          >
            <MapContainer
              center={[20, 0]}
              zoom={0}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              zoomControl={false}
              attributionControl={false}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                url={mapMode === "satellite" ? SATELLITE_URL : OSM_URL}
              />
              <MiniMapBounds parentMap={mapRef.current} />
            </MapContainer>
          </div>
      )}
      <TimeSlider year={year} setYear={setYear} />

      {/* Sidebar */}
      {selectedMarker && (
        <div
          style={{
            width: 340,
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            overflowY: "auto",
            padding: "20px 18px",
            boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
            zIndex: 1000,
            borderLeft: "1px solid rgba(0,0,0,0.08)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
        <button
          onClick={() => setSelectedMarker(null)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            border: "none",
            background: "rgba(0,0,0,0.05)",
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ✕
        </button>

          <h2 style={{ marginBottom: 16, fontSize: 18 }}>Events at this location</h2>

          {selectedMarker.events.map((event: any) => (
            <div 
            key={event.id} 
              style={{
              marginBottom: 20,
              padding: 14,
              borderRadius: 12,
              background: "rgba(255,255,255,0.7)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              }}>

              <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{event.title}</h3>
              <div
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: 12,
                  fontSize: 11,
                  background: categoryColors[event.category] || "#111",
                  color: "white",
                  marginBottom: 6,
                  textTransform: "capitalize",
                }}
            >
              {event.category}
            </div>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#666" }}>
                {[
                  event.start_month ? event.start_month.toString().padStart(2, "0") : null,
                  event.start_day ? event.start_day.toString().padStart(2, "0") : null,
                  event.start_year,
                ]
                  .filter(Boolean)
                  .join("-")}
              </p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{event.description}</p>

              {event.sources &&
                ["primary", "secondary"].map((type) => {
                  const sourcesOfType = event.sources.filter(
                    (s: any) => s.source_type === type
                  );
                  if (!sourcesOfType.length) return null;

                  return (
                    <div key={type} style={{ marginTop: 8 }}>
                      <h4 style={{
                        margin: "10px 0 6px",
                        fontSize: 13,
                        color: "#444",
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                      }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)} Sources</h4>
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {sourcesOfType.map((s: any) => (
                          <li key={s.id} style={{ marginBottom: 12 }}>
                            <strong>{s.title}</strong>

                            {s.description && (
                              <p style={{ margin: "4px 0" }}>{s.description}</p>
                            )}

                            {/* Photo */}
                            {s.content_type === "photo" && (
                              <img
                                src={s.url}
                                alt={s.title}
                                style={{
                                  maxWidth: "100%",
                                  borderRadius: 8,
                                  marginTop: 6,
                                  cursor: "pointer",
                                  transition: "0.2s",
                                }}
                                onClick={() =>
                                  setExpandedImage({ url: s.url, title: s.title })
                                }
                              />
                            )}

                            {/* Video (currently Youtube only) */}
                            {s.content_type === "video" && (
                              <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden" }}>
                                <iframe
                                  width="100%"
                                  height="200"
                                  src={`https://www.youtube.com/embed/${s.url}`}
                                  title={s.title}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}

                            {/* Other (shouldn't happen but just in case) */}
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

      {/* Expand Image */}
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
            <p style={{ color: "white", marginTop: 10, textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
              {expandedImage.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;