import { useEffect, useState } from "react";

interface TimeSliderProps {
  year: number;
  setYear: (year: number) => void;
}

function TimeSlider({ year, setYear }: TimeSliderProps) {
  const [playing, setPlaying] = useState(false);

  const minYear = 1985;
  const maxYear = 1995;

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setYear(year < maxYear ? year + 1 : minYear);
    }, 2000);

    return () => clearInterval(interval);
  }, [playing, setYear, year]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "36%",
        width: 340,
        padding: 18,
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        borderRadius: 14,
        boxShadow: "0 15px 40px rgba(0,0,0,0.2)",
        zIndex: 1000,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
      <div
      style={{
        fontSize: 22,
        fontWeight: 600,
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
      key={year}
      >
      {year}
      </div>
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            border: "none",
            background: "#111",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <input
        type="range"
        min={minYear}
        max={maxYear}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        style={{
          width: "100%",
          appearance: "none",
          height: 6,
          borderRadius: 4,
          background: "#ddd",
          outline: "none",
          cursor: "pointer",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginTop: 6,
          color: "#666",
        }}
      >
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  );
}

export default TimeSlider;
