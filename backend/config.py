import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://historian:strongpassword@localhost:5432/historical_map"
)
