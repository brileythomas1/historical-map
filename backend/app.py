from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from config import DATABASE_URL

app = Flask(__name__)
CORS(app)

engine = create_engine(DATABASE_URL)

@app.route("/events/<int:year>")
def get_events(year):
    if year < 1985 or year > 1995:
        return jsonify({"error": "year must be between 1985 and 1995"}), 400

    query = text("""
        SELECT
            id,
            title,
            description,
            start_year,
            end_year,
            ST_AsGeoJSON(geom) AS geometry
        FROM historical_events
        WHERE start_year <= :year
          AND (end_year IS NULL OR end_year >= :year)
    """)

    with engine.connect() as conn:
        rows = conn.execute(query, {"year": year}).fetchall()

    features = []
    for r in rows:
        features.append({
            "type": "Feature",
            "geometry": r.geometry and eval(r.geometry),
            "properties": {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "start_year": r.start_year,
                "end_year": r.end_year
            }
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

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
