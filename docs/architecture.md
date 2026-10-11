# FloodSight AI — System Architecture Specification

## Overview

FloodSight AI is an end-to-end geospatial decision-support platform that transforms raw satellite and aerial imagery into verified flood damage intelligence for disaster responders.

```
+-----------------------------------------------------------------------------+
|                           CLIENT TIER (React 19)                            |
|  - Dashboard: Macro flood metrics & live status                             |
|  - Analyze: Dual-mode imagery ingestion & validation wizard                 |
|  - Map View: Multi-layer Leaflet vector/raster viewport                     |
|  - Reports: Incident Command System (ICS) disaster briefs                   |
+-----------------------------------------------------------------------------+
                                       |
                                       | REST API (JSON / Multipart)
                                       v
+-----------------------------------------------------------------------------+
|                          API GATEWAY / SERVER TIER                          |
|  - FastAPI (Python) / Express full-stack proxy router                       |
|  - Payload validation: MIME check, size capping (25MB), sanitization        |
|  - Request job dispatcher & temporary cache management                      |
+-----------------------------------------------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
+------------------------------------+   +------------------------------------+
|     CV & GEOSPATIAL PIPELINE       |   |       FACTUAL GENAI ENGINE         |
|  1. Preprocessing & Cloud Filter   |   |   (@google/genai TypeScript SDK)   |
|  2. NDWI / Multi-Spectral Otsu     |   |                                    |
|  3. Morphological Contour Vectorizer|  |  Ingests ONLY verified metrics:    |
|  4. Road/Bridge Spatial Intersect  |   |  - Flooded Hectares (ha)           |
|  5. Topological BFS Disconnection  |   |  - Cut Road / Bridge counts        |
|  6. Deterministic 4-Factor Scoring |   |  - Isolated Node Clusters          |
+------------------------------------+   +------------------------------------+
                   |                                       |
                   +-------------------+-------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                               OUTPUT LAYER                                  |
|  - GeoJSON Vector Polygons (Flood Inundation)                               |
|  - Highlighted Severed Road Linestrings                                     |
|  - Isolated Community Boundary Geometries                                  |
|  - Deterministic Priority Hotspots (0–100)                                  |
|  - Structured ICS Situation Assessment Document                             |
+-----------------------------------------------------------------------------+
```

---

## Technical Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Leaflet, Lucide Icons.
- **Backend API**: Python FastAPI + Uvicorn (production engine) / Express (embedded runtime).
- **Computer Vision**: Multi-spectral water indexing (NDWI / MNDWI), adaptive bimodal Otsu thresholding, morphological closing/opening.
- **Geospatial & Graph Analysis**: Vector polygon intersection testing, Network graph BFS component disconnection search.
- **Generative AI**: Server-side Gemini 3.8 Flash constrained to structured factual parameters.
