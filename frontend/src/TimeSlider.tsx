interface TimeSliderProps {
  year: number;
  setYear: (year: number) => void;
}



function TimeSlider({ year, setYear }: TimeSliderProps) {
  return (
    <div style={{ padding: "10px" }}>
      <input
        type="range"
        min={1985}
        max={1995}
        value={year}
        onChange={e => setYear(Number(e.target.value))}
      />
      <div><strong>Year:</strong> {year}</div>
    </div>
  );
}

export default TimeSlider;
