import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://localhost:5432/historical_map"
)
