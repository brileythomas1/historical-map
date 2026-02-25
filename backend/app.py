from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from config import DATABASE_URL
from collections import defaultdict

app = Flask(__name__)
CORS(app)

engine = create_engine(DATABASE_URL)

@app.route("/events/<int:year>")
def get_events(year):
    if year < 1985 or year > 1995:
        return jsonify({"error": "Year must be between 1985 and 1995"}), 400

    query = text("""
        SELECT
            he.id,
            he.title,
            he.description,
            he.start_year,
            he.start_month,
            he.start_day,
            he.end_year,
            he.end_month,
            he.end_day,
            ST_AsGeoJSON(he.geom) AS geometry
        FROM historical_events he
        WHERE he.start_year <= :year
          AND (he.end_year IS NULL OR he.end_year >= :year)
    """)

    # Fetch sources for events
    sources_query = text("""
        SELECT es.event_id, s.id AS source_id, s.title, s.source_type, s.content_type, s.url, s.description
        FROM event_sources es
        JOIN sources s ON es.source_id = s.id
    """)

    # Get our events and sources
    with engine.connect() as conn:
        events_rows = conn.execute(query, {"year": year}).fetchall()
        sources_rows = conn.execute(sources_query).fetchall()

    # Map sources by event_id
    sources_by_event = defaultdict(list)
    for s in sources_rows:
        sources_by_event[s.event_id].append({
            "id": s.source_id,
            "title": s.title,
            "source_type": s.source_type,
            "content_type": s.content_type,
            "url": s.url,
            "description": s.description
        })

    # Aggregate events by coordinates
    events_by_location = defaultdict(list)
    for r in events_rows:
        geom = eval(r.geometry) if r.geometry else None
        if not geom:
            continue
        coords = tuple(geom["coordinates"])
        event_data = {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "start_year": r.start_year,
            "start_month": r.start_month,
            "start_day": r.start_day,
            "end_year": r.end_year,
            "end_month": r.end_month,
            "end_day": r.end_day,
            "sources": sources_by_event.get(r.id, [])
        }
        events_by_location[coords].append(event_data)

    # Convert to GeoJSON features
    features = []
    for coords, events in events_by_location.items():
        # Sort events chronologically
        events.sort(key=lambda e: (
            e["start_year"],
            e.get("start_month") or 0,
            e.get("start_day") or 0
        ))
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": coords},
            "properties": {"events": events}
        })

    return jsonify({"type": "FeatureCollection", "features": features})

@app.route("/borders/<int:year>")
def get_borders(year):
    query = text("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'country', cntry_name,
                        'gwcode', gwcode
                    )
                )
            )
        )
        FROM cshapes
        WHERE gwsyear <= :year
        AND gweyear >= :year
    """)

    with engine.connect() as conn:
        result = conn.execute(query, {"year": year}).scalar()

    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
