# Modernizing the Past: An Interactive Geospatial Web Application for Visualizing History

Briley Thomas, CPSC 4900: Senior Project

## Stack

React + Typescript + Leaflet frontend, Python + Flask backend, PostgreSQL (with PostGIS) Database

## Instructions
The application has been tested to work on Mac with the following components:

[Node v.20.20.2](https://nodejs.org/en/download)

[PostgreSQL 18.3 + PostGIS 3.6.2](https://postgresapp.com/downloads.html)

[Python 3.11.0](https://www.python.org/downloads/)

Note that Postgres app is Mac only, and if you are on another system, you may want to use another installer such as the one on the [official PostgreSQL website](https://www.postgresql.org/download/windows/). Make sure you install PostGIS as well and are able to use the ```psql``` command (which allows you to skip Step 2).

Step 1: Download and install the above components.

Step 2: Start the Postgres app and start the instance so it is running.  Open up a terminal window and run this command in the terminal after installing PostgreSQL and in the project directory so that it can use the ```psql``` command:

```
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
```

Step 3: To set up the database, run these command in the terminal from the project directory.

```
createdb historical_map

psql -d historical_map -f map_db.sql
```

Step 4 (Optional but recommended): Create a Python virtual environment.

```
python3.11 -m venv .venv

source .venv/bin/activate
```

Step 5: Install Python dependencies and start the backend.

```
cd backend

pip3.11 install -r requirements.txt

python3.11 app.py
```

Step 6: In a separate terminal in the project directory, install dependencies for Node and start the frontend.

```
cd frontend

nvm use 20

npm install

npm run dev
```

Step 7: Navigate to the URL displayed in the terminal after Step 6 to view the app.

## Acknowledgements
Credit to ETH Zurich for their work in compiling the [CShapes 2.0 dataset](https://icr.ethz.ch/data/cshapes/), which this project made ample use of in its own database.