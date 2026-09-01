# HydroShield AI: Early Warning & Route Guidance for Flash Floods

**All Things Agentic Hackathon Submission**  
**Tech Stack**: Google Gemini Agent ADK, Google Maps Directions API, Open-Meteo REST API, Python 3, JavaScript (ES6)

---

## Project Overview

### What Happened
On August 26, 2026, a massive glacier and rock collapse occurred at Langtang Lirung in Langtang National Park, Nepal. The resulting debris avalanche triggered a sudden 30-foot surge of water, mud, and ice down the Bhote Koshi, Lende, and Trishuli river corridors across Rasuwa, Nuwakot, and Dhading districts. 

More than 900 workers at local hydropower plants and hundreds of residents in valley settlements were caught unprepared. The primary failure wasn't just the sheer volume of water, but the absence of immediate, actionable warning before low-altitude valley passes were cut off.

### What We Built
HydroShield AI is a real-time emergency monitoring system built around an autonomous agent loop. It continuously ingests river stage height and rainfall telemetry, evaluates hazard thresholds, and translates complex environmental metrics into direct, plain-English instructions. 

When a flood or surge event occurs, the system flags dangerous river valley crossings as impassable and uses the Google Maps Directions API to route users from low-lying valley floors to high-elevation shelters.

---

## Architecture & System Design

```
+------------------------------------+
|  Open-Meteo REST Weather Satellite |
+----------------─┬------------------+
                  | (20-second async polling)
                  v
+------------------------------------+      +--------------------------------+
|  HydroShield Core Telemetry Engine | ---> | Google Maps Directions API     |
|  (State, HTML5 Canvas, DOM)        |      | (Turn-by-turn routing app link)|
+----------------─┬------------------+      +--------------------------------+
                  |
                  v
+------------------------------------+
|  Gemini Agent Loop                 |
|  1. Observe telemetry deltas       |
|  2. Evaluate risk tier (0 to 3)    |
|  3. Execute tools & update UI      |
+------------------------------------+
```

### Core Components

1. **Telemetry Pipeline (`simulation.js`)**:
   - Asynchronously queries the Open-Meteo REST API every 20 seconds.
   - Measures precipitation rate ($R$ in mm/h), topsoil moisture saturation ($S$ as a percentage), and calculates river stage height ($H$ in meters).
   - Manages distinct origin coordinates ($28.2150^\circ\text{N}, 85.3850^\circ\text{E}$) and high-ground destination coordinates ($28.2580^\circ\text{N}, 85.4200^\circ\text{E}$).

2. **Agentic Reasoning Loop (`agent.js`)**:
   - Implements an Observe-Reason-Act pattern inspired by the Google Gemini Agent Development Kit (ADK).
   - Classifies risk levels into four tiers:
     - Tier 0: Normal baseline ($H < 3.0\text{m}$)
     - Tier 1: Flood Advisory ($3.0\text{m} \le H < 4.2\text{m}$)
     - Tier 2/3: Flood Warning / Emergency Danger ($H \ge 4.2\text{m}$ or rapid surge)
   - Automatically executes response actions: updates safety status text, flags flooded river crossings, and generates emergency broadcast messages.

3. **Spatial Route Calculation & Visualization (`map.js` & `main.js`)**:
   - Renders a real-time spatial topographic map on an HTML5 canvas, displaying river channels, radar sweep lines, flood hazard polygons, and evacuation vectors.
   - Interfaces with the Google Maps Directions API to construct driving routes from low valley origins to high-ground destinations, providing a 1-tap deep link into the Google Maps app.

---

## Google Technologies Used

- **Google Gemini Agent Architecture (ADK)**: Formulated the autonomous reasoning loop for continuous environmental evaluation and tool execution.
- **Google Maps Directions API**: Calculates driving routes around blocked river crossings.
- **Google Maps Mobile Integration**: Deep-links origin and destination parameters directly into the Google Maps mobile application (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...`).
- **Google Cloud Platform / Cloud Run**: Scalable container hosting for low-latency backend execution.

---

## Real-World Impact & Future Work

### Future API Integrations
- **Google Maps Traffic API**: In corporate or regional deployments, querying live congestion data will allow the agent to route evacuees away from traffic gridlocks during panicked evacuations.
- **Google Maps Road Hazards & Closures API**: Direct ingestion of road barrier statuses will allow automatic updates to route calculation when landslides occur.
- **Elevation APIs**: Integrating fine-grained digital elevation models will ensure candidate evacuation paths consistently move uphill.

---

## How to Test the Project

### Running Locally
1. Clone the repository and navigate to the root directory:
   ```bash
   cd flash-flood-agent
   ```
2. Start the lightweight Python web server:
   ```bash
   python3 server.py
   ```
3. Open `http://localhost:8080` in your web browser.

### Test Scenarios
- **Normal Day**: Select **Langtang / Trishuli River, Nepal** and click **Normal**. The dashboard shows green status and all roads clear.
- **Storm Surge**: Click **Storm Surge** to observe risk tier escalation and advisory notices.
- **Glacial Debris Avalanche**: Click **Debris Avalanche** to trigger a simulated 30-foot river surge. The system updates the status to **FLOOD EMERGENCY DANGER**, flags the Trishuli valley road as impassable, updates the safe route to **Himalayan High Ridge Plateau**, and logs agent actions in the activity feed.
- **Google Maps Navigation**: Click **Open Turn-by-Turn Route in Google Maps App** at the bottom of the map to verify origin and destination coordinates in Google Maps.

https://github.com/DeviKamakshi/Projects