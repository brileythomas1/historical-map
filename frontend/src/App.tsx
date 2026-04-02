import { useEffect, useState } from "react";
import MapView from "./MapView";
import type { GeoJSONFeatureCollection } from "./types";

const API_URL = "http://127.0.0.1:5000";


function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function App() {
  const [year, setYear] = useState<number>(1985);
  const debouncedYear = useDebounce(year, 100);

  const [events, setEvents] = useState<GeoJSONFeatureCollection | null>(null);
  const [borders, setBorders] = useState<GeoJSONFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch events
  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/events/${debouncedYear}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setEvents(data);
      } catch (err: any) {
        if (err.name === "AbortError") return; // ignore aborted fetch
        console.error(err);
      }
    }

    fetchEvents();

    return () => controller.abort(); // cancel previous fetch on next effect
  }, [debouncedYear]);

useEffect(() => {
  const controller = new AbortController();

  async function fetchEvents() {
    try {
      setLoading(true); // start loading
      const res = await fetch(`${API_URL}/events/${debouncedYear}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      if (err.name !== "AbortError") console.error(err);
    }
  }

  async function fetchBorders() {
    try {
      const res = await fetch(`${API_URL}/borders/${debouncedYear}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setBorders(data);
    } catch (err: any) {
      if (err.name !== "AbortError") console.error(err);
    }
  }

  Promise.all([fetchEvents(), fetchBorders()]).finally(() => setLoading(false));

  return () => controller.abort();
}, [debouncedYear]);

  return (
    <>
    {loading && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.35)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 5000,
      pointerEvents: "none",
      transition: "opacity 0.3s ease",
    }}
  >
    <div
      style={{
        width: 60,
        height: 60,
        border: "6px solid #ccc",
        borderTop: "6px solid #333",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
  </div>
)}
      <MapView setYear={setYear} year={debouncedYear} events={events} borders={borders} />
    </>
  );
}

export default App;
