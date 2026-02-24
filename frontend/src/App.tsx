import { useEffect, useState } from "react";
import MapView from "./MapView";
import TimeSlider from "./TimeSlider";
import type { GeoJSONFeatureCollection } from "./types";

const API_URL = "http://127.0.0.1:5000";

// Debounce hook
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

  // Fetch events
  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      try {
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

  // Fetch borders
  useEffect(() => {
    const controller = new AbortController();

    async function fetchBorders() {
      try {
        const res = await fetch(`${API_URL}/borders/${debouncedYear}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setBorders(data); // only update state when fetch succeeds
      } catch (err: any) {
        if (err.name === "AbortError") return; // ignore aborted fetch
        console.error(err);
      }
    }

    fetchBorders();

    return () => controller.abort();
  }, [debouncedYear]);

  return (
    <>
      <TimeSlider year={year} setYear={setYear} />
      <MapView year={debouncedYear} events={events} borders={borders} />
    </>
  );
}

export default App;
