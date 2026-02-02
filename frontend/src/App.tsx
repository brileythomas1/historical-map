import { useEffect, useState } from "react";
import MapView from "./MapView";
import TimeSlider from "./TimeSlider";
import type { GeoJSONFeatureCollection } from "./types";

const API_URL = "http://127.0.0.1:5000/events";

function App() {
  const [year, setYear] = useState<number>(1453);
  const [events, setEvents] = useState<GeoJSONFeatureCollection | null>(null);

  useEffect(() => {
    fetch(`${API_URL}?year=${year}`)
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error(err));
  }, [year]);

  return (
    <>
      <TimeSlider year={year} setYear={setYear} />
      <MapView events={events} />
    </>
  );
}

export default App;
