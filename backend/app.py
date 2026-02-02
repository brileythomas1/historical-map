from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from config import DATABASE_URL

app = Flask(__name__)
CORS(app)

engine = create_engine(DATABASE_URL)

@app.route("/events")
def get_events():
    year = request.args.get("year", type=int)
    if year is None:
        return jsonify({"error": "year parameter required"}), 400

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

if __name__ == "__main__":
    app.run(debug=True)
