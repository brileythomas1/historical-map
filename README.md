# Modernizing the Past: An Interactive Geospatial Web Application for Visualizing History

Briley Thomas, CPSC 4900: Senior Project

## Stack

React + Typescript + Leaflet frontend, Python + Flask backend, PostgreSQL (with PostGIS) Database

## Instructions
The application has been tested to work with the following components:

[Node v.20.19.5](https://nodejs.org/en/download)

[PostgreSQL 18.1 + PostGIS 3.6](https://postgresapp.com/downloads.html)

[Python 3.11](https://www.python.org/downloads/)

Step 1: Download and install the above components.

Step 2: To set up the database, run these command in the terminal.

```createdb historical_map```

```psql -d historical_map -f map_db.sql```

Step 3: Set up Python dependencies.

```pip3.11 install -r backend/requirements.txt```

Step 4: Install dependencies for Node.

```cd frontend```

```npm install```

Step 5: Run Node to start the frontend.

```npm run dev```

Step 6: Open a separate terminal and run these commands to start the backend.

```cd backend```

```python3.11 app.py```

Step 7: Navigate to the URL displayed in the terminal after Step 5 to view the app.

## Acknowledgements
Credit to ETH Zurich for their work in compiling the [CShapes 2.0 dataset](https://icr.ethz.ch/data/cshapes/), which this project made ample use of in its own database.