# FloodSight AI — Comprehensive Operations & User Manual
**Version:** 1.0.0-sen1floods11  
**Classification:** Official Product Documentation  
**System Designation:** Earth Observation & Inundation Intelligence Command System  
**Zero-Fabrication Commitment:** Strictly Enforced (Evidence-Based Architecture)

---

## Table of Contents

1. [Executive Overview & System Mission](#1-executive-overview--system-mission)
   - 1.1 Purpose and Target Audience
   - 1.2 Core System Capabilities
   - 1.3 System Requirements (Hardware, Browser, Network)
   - 1.4 Operational Scope, Safety, and Ethical Boundaries
2. [Interface Architecture & Getting Started](#2-interface-architecture--getting-started)
   - 2.1 Accessing the Application
   - 2.2 Global Navigation Header & Workspace Tabs
   - 2.3 Global Command Center Keyboard Shortcuts
   - 2.4 End-to-End Operational Workflow
   - 2.5 Status Indicators and System Health States
3. [Interactive 3D Earth & Global Geographic Navigation](#3-interactive-3d-earth--global-geographic-navigation)
   - 3.1 3D Globe Navigation (Orbit, Pan, Zoom)
   - 3.2 Observation Targets & Global Disaster Registry
   - 3.3 Location Telemetry Cards & Spatial Hotspots
   - 3.4 Illustrative Visualization vs. Verified Cartographic Evidence
4. [Satellite Raster Verification & Flood Segmentation](#4-satellite-raster-verification--flood-segmentation)
   - 4.1 Supported Satellite Sensor Specifications & Input Contract
   - 4.2 Step-by-Step Satellite Image Upload Workflow
   - 4.3 Pre-Inference Server Verification Pipeline (`/api/verify-image`)
   - 4.4 Model Readiness & Fail-Closed Guardrails (`/api/analyze`)
   - 4.5 Executing Flood Segmentation & Adjusting Decision Thresholds
   - 4.6 Interpreting Segmentation Masks, Probabilities, and Inundation Zones
   - 4.7 Rejection States, Error Diagnostics, and Handling Unverified Data
5. [Tactical Geospatial Maps & Live Environmental Layers](#5-tactical-geospatial-maps--live-environmental-layers)
   - 5.1 Workspace Overview: Tactical Map & Live Weather Modes
   - 5.2 RainViewer Radar Ingestion, Timeline Playback, and Nowcasting
   - 5.3 Open-Meteo Micro-Meteorological Telemetry & Hourly Forecasts
   - 5.4 Multi-Layer Composition & Opacity Blending
   - 5.5 Hydrological Telemetry & River Discharge Indicators
   - 5.6 Data Freshness Protocols (`FRESH`, `STALE DATA`, `SOURCE UNAVAILABLE`)
   - 5.7 Critical Distinction: Weather Observations vs. Satellite Inundation
6. [3D Topographic Simulation & Digital Elevation Modeling](#6-3d-topographic-simulation--digital-elevation-modeling)
   - 6.1 Interactive 3D Terrain Viewer Controls
   - 6.2 Elevation Extrusion, Relief Scaling, and Water Columns
   - 6.3 Procedural Terrain Representation vs. Authenticated Survey DEMs
   - 6.4 Handling Unavailable Hydrological Datasets
7. [Incident Command Briefings & Situation Reports (SITREPs)](#7-incident-command-briefings--situation-reports-sitreps)
   - 7.1 Accessing the Reports Workspace
   - 7.2 Global Disaster Situation Reports (SITREPs)
   - 7.3 Active Upload Mission Intelligence Summaries
   - 7.4 ICS-209 Field Compatibility & Decision Support Output
   - 7.5 Documented Feature Status & Planned Capabilities
8. [Metric Formulations, Geospatial Calculations & Verification Rules](#8-metric-formulations-geospatial-calculations--verification-rules)
   - 8.1 Total vs. Valid vs. Flooded Pixel Metrics
   - 8.2 Positive-Class Probability & Mean Confidence
   - 8.3 Geodesic vs. Projected Hectarage Computation
   - 8.4 Coordinate Reference Systems (CRS) and Affine Geotransforms
   - 8.5 Topological Road Network & Community Isolation Analysis
9. [Troubleshooting, Error Reference & Safe Recovery](#9-troubleshooting-error-reference--safe-recovery)
   - 9.1 Upload Failures & Raster Rejections
   - 9.2 Missing Geospatial Tags & Unreferenced Rasters
   - 9.3 Model Checkpoint Missing (`HTTP 503 FLOOD_MODEL_UNAVAILABLE`)
   - 9.4 Weather Radar & Meteorological Gateway Timeouts
   - 9.5 WebGL Hardware Acceleration & Rendering Latency
   - 9.6 Session Storage & Verification Token Expiration
10. [Data Governance, Security Architecture & Scientific Integrity](#10-data-governance-security-architecture--scientific-integrity)
    - 10.1 Zero-Fabrication Enforcement Policy
    - 10.2 Server-Side Token Registry (`SafeTokenRegistry`) Lifecycle
    - 10.3 Privacy & Satellite Data Retention Practices
    - 10.4 Automated AI Guidance & Gemini Integration Boundaries
11. [Quick Reference Appendices](#11-quick-reference-appendices)
    - Appendix A: Standard Analysis Operational Checklist
    - Appendix B: Geospatial & Remote Sensing Glossary
    - Appendix C: Interface Component Directory
    - Appendix D: API Endpoint & Return Code Matrix
    - Appendix E: Model Input Specification Cheat-Sheet

---

## 1. Executive Overview & System Mission

### 1.1 Purpose and Target Audience
**FloodSight AI** is a professional Earth-observation intelligence and disaster-response decision platform developed for **Track B: Mapping Flood Damage from Space**. 

When catastrophic hydrological events—such as monsoon surges, severe atmospheric rivers, dam overtoppings, and tropical cyclones—strike populated regions, terrestrial infrastructure and communication networks are frequently compromised. First responders, emergency planners, and civil defense agencies cannot rely on incomplete ground rumors or delayed reconnaissance. 

FloodSight AI bridges this gap by ingesting raw, multi-spectral satellite imagery, validating its cryptographic and geospatial integrity through strict server-side gates, executing machine-learning segmentation to isolate surface inundation, and computing precise physical damage metrics.

**Intended User Groups:**
- **Incident Commanders & Emergency Operations Centers (EOC):** Establishing situational awareness, identifying high-risk zones, and prioritizing tactical assets.
- **Geospatial & Remote Sensing Specialists:** Verifying satellite raster metadata, ground sampling distances, and coordinate reference systems.
- **Disaster Response Logisticians:** Evaluating road and bridge access routes and identifying isolated settlements.
- **Municipal Planners & Humanitarian Analysts:** Documenting post-disaster flooding extents for recovery planning and resource allocation.

### 1.2 Core System Capabilities
1. **Verifiable Multi-Spectral Satellite Ingestion:** Validates GeoTIFF containers for genuine Sentinel-2 Multi-Spectral Instrument (MSI) optical bands (B4 Red, B3 Green, B2 Blue) at 10-meter ground resolution.
2. **Fail-Closed Verification Gateway:** Enforces server-side checks on file headers, channel dimensions (512x512 pixels), bit depth, and EPSG georeferencing before authorizing inference.
3. **Deep-Learning Water Segmentation:** ResNet-34 encoder paired with a U-Net architecture, trained on Sen1Floods11 benchmark splits, generating calibrated pixel-level water probabilities.
4. **Strict Geodesic Area Measurement:** Direct, non-synthetic physical hectarage calculation using embedded raster `ModelPixelScaleTag` and `ModelTiepointTag` metadata.
5. **Real-Time Live Weather & Radar Map:** Integrated live composite radar (RainViewer) with historical and nowcast animation loops, Open-Meteo hourly precipitation, and GloFAS river discharge telemetry.
6. **3D Topographic Hydraulic Simulator:** Interactive Three.js/React Three Fiber terrain renderer modeling digital elevation, extrusion factors, and adjustable water stage heights.
7. **Incident Command System (ICS-209) Reports:** Standardized operational briefings reporting verified telemetry, coordinate boundaries, affected road corridors, and scientific disclosures.

### 1.3 System Requirements
- **Web Browser:** Modern Chromium-based browsers (Google Chrome 110+, Microsoft Edge 110+), Mozilla Firefox 115+, or Apple Safari 16.4+ with WebGL 2.0 and hardware acceleration enabled.
- **Display Resolution:** Optimized for desktop command centers (1920x1080 or higher recommended; minimum supported width: 360px responsive mobile).
- **Network Bandwidth:** Minimum 5 Mbps broadband connection for satellite raster ingestion, WebGL textures, and live radar tile streams.
- **Hardware Acceleration:** Dedicated GPU or modern integrated graphics (Intel Iris Xe, Apple M-series, AMD Radeon, NVIDIA GeForce) for real-time 3D Earth and extruded elevation rendering.

### 1.4 Operational Scope, Safety, and Ethical Boundaries
FloodSight AI is an **evidence-based decision-support system**. It is designed to assist, not replace, human emergency responders.
- **Optical Cloud Occlusion Notice:** Optical satellite sensors cannot see through heavy cloud cover. Clear-sky or cloud-penetrating SAR imagery is required when storms are actively overhead.
- **Structural Integrity Boundary:** Satellite inundation mapping detects **surface water presence**. It cannot verify subsurface scour, pavement foundation failure, or structural collapse of bridges. Features are classified as *Potentially Submerged*, never *Confirmed Destroyed*, until ground or sonar inspections are completed.
- **Zero-Fabrication Policy:** The system never simulates or invents missing data. If an ML checkpoint is missing, a server returns an explicit `HTTP 503` rather than generating synthetic masks.

---

## 2. Interface Architecture & Getting Started

### 2.1 Accessing the Application
Launch the application via your secure browser session. Upon loading, FloodSight AI initializes its core state, polls the backend verification gateway (`GET /api/health`), and mounts the interactive 3D command environment.

### 2.2 Global Navigation Header & Workspace Tabs
The persistent navigation header sits at the top of every screen:
- **Brand Wordmark:** Displays **FloodSight AI** with an active globe glyph. Clicking returns to the Overview workspace.
- **Navigation Tabs:**
  1. `Overview (H)`: The cinematic landing portal featuring the 3D interactive Earth, observation targets, real-time 3D topographic simulator, and verification architecture overview.
  2. `Command Hub (D)`: The operational tactical dashboard summarizing platform health, model checkpoint readiness, recent satellite analyses, and quick-action shortcuts.
  3. `Analysis (A)`: The core scientific laboratory for uploading GeoTIFF scenes, executing server verification, adjusting segmentation probability thresholds, and inspecting results.
  4. `Tactical Maps (M)`: High-performance interactive geospatial mapping supporting Real-time Google Tactical Maps, Live Weather Radar (RainViewer), and 3D Extruded Terrain views.
  5. `Reports (R)`: Standardized disaster intelligence situation reports (SITREPs) covering 20 global validated flood disasters or your active uploaded analysis.
  6. `Methodology (I)`: In-depth documentation on the eight-stage scientific pipeline, dataset contracts, and ethical limitations.
- **Quick Keyboard Tools Button (`?`):** Opens the interactive Global Keyboard Shortcuts modal.
- **Primary Action (`Start Analysis`):** One-click jump directly into the Satellite Analysis laboratory.

### 2.3 Global Command Center Keyboard Shortcuts
To maximize emergency operational efficiency, FloodSight AI implements single-key hotkey navigation:
| Key | Target Workspace | Purpose |
| :---: | :--- | :--- |
| **`H`** | **Overview / Landing** | Returns to the planetary overview and mission summary |
| **`D`** | **Command Hub** | Opens central metrics, health status, and quick workflows |
| **`A`** | **Analysis Laboratory** | Opens the GeoTIFF upload, verification, and inference engine |
| **`M`** | **Tactical Maps** | Opens Leaflet/Google/RainViewer live mapping systems |
| **`R`** | **Reports & SITREPs** | Opens standardized ICS situation briefings |
| **`I`** | **Methodology** | Opens the scientific pipeline documentation |
| **`?`** | **Shortcuts Dialog** | Toggles the keyboard shortcut reference modal |
| **`Esc`** | **Dismiss / Close** | Closes modals, dropdowns, and floating cards |

*Note: Hotkeys are automatically disabled when typing in text input fields or search bars.*

### 2.4 End-to-End Operational Workflow
The recommended four-step operational procedure:
1. **Monitor & Survey:** Check **Command Hub** for system health and model availability. Survey live storm systems in **Tactical Maps** (`Live Weather` mode).
2. **Ingest & Verify:** Switch to **Analysis** (`A`). Upload your candidate Sentinel-2 GeoTIFF. Click **Run Integrity Verification** to validate CRS and band dimensions.
3. **Segment & Quantify:** Set your operating probability threshold (default: `0.50`). Click **Execute U-Net Flood Analysis** to extract pixel water masks and calculate geodesic surface hectarage.
4. **Brief & Deploy:** Switch to **Reports** (`R`) under **Active Upload** to review the auto-generated SITREP, export findings, or review emergency routing options.

### 2.5 Status Indicators and System Health States
The system continuously monitors the `/api/health` endpoint:
- **`HEALTHY (Green)`**: Backend gateway operational, and trained segmentation checkpoint (`floodsight_unet_resnet34_best.pth`) is installed and loaded.
- **`DEGRADED (Amber)`**: Backend gateway operational, but the model checkpoint is missing. Satellite verification works, but inference requests return a fail-closed `HTTP 503 FLOOD_MODEL_UNAVAILABLE` error.
- **`OFFLINE (Red)`**: Local server connection failed. Diagnostic alert displays recovery instructions.

---

## 3. Interactive 3D Earth & Global Geographic Navigation

### 3.1 3D Globe Navigation (Orbit, Pan, Zoom)
The planetary Earth visualization on the Overview workspace is rendered using a Three.js WebGL canvas with realistic multi-spectral surface textures, physically plausible atmospheric scattering, and natural planetary rotation.
- **Left-Click + Drag:** Orbits the Earth around its polar axis and equator.
- **Mouse Wheel / Trackpad Pinch:** Smoothly zooms the camera between orbital altitude ($z = 4.2$) and high-resolution continental altitude ($z = 2.0$).
- **Zoom In / Zoom Out Controls (`+` / `-`):** Located on the bottom-right corner of the canvas.
- **Reset View (`RotateCcw`):** Restores the default camera angle and planetary rotation.
- **Auto-Rotation:** The globe naturally rotates at $0.0008\text{ rad/frame}$, with upper cloud layers orbiting slightly faster for physical atmospheric depth.

### 3.2 Observation Targets & Global Disaster Registry
Beneath the hero copy on the Overview page is the **Observation Targets Console**. The platform includes 20 pre-validated disaster events from the `GLOBAL_DISASTERS` registry.
- Clicking any observation button (e.g., `Pakistan: Sindh`, `USA: Kentucky`, `Bangladesh: Sylhet`) triggers a smooth 700ms cubic-eased camera flight directly to the incident's geographic coordinates ($(\text{lat}, \text{lon})$).
- The camera executes an arc flight that elevates slightly during transit before descending onto the target coordinates.

### 3.3 Location Telemetry Cards & Spatial Hotspots
When an observation target is selected:
- A responsive, glassmorphic **Location Card** appears in the bottom-left corner.
- **Telemetry Displayed:** Region name, Country, Event Classification (e.g., *Monsoon River Surge*, *Atmospheric River*), Estimated Inundation (in hectares), and Terrain Class (e.g., *Floodplain*, *Coastal Delta*, *River Basin*).
- Clicking the location card or selecting the target transfers spatial context directly into the Tactical Map.

### 3.4 Illustrative Visualization vs. Verified Cartographic Evidence
**CRITICAL OPERATIONAL DISTINCTION:**
- The **3D Globe** provides **geographic orientation, illustrative planetary context, and spatial discovery**. The glowing markers indicate incident centers.
- The **Tactical Map & Analysis Workspace** provide **scientifically verified, sub-pixel cartographic evidence**. Never use the illustrative globe radius as a legal or tactical boundary for flood evacuation.

---

## 4. Satellite Raster Verification & Flood Segmentation

### 4.1 Supported Satellite Sensor Specifications & Input Contract
FloodSight AI enforces an exact, versioned model contract (`s2-optical-v1`):
| Parameter | Specification Requirement | Rationale |
| :--- | :--- | :--- |
| **Sensor Platform** | European Space Agency (ESA) Sentinel-2 MSI | Calibration standard for Sen1Floods11 splits |
| **Container Format** | GeoTIFF (`.tif`, `.tiff`) | Must contain standard TIFF/BigTIFF magic headers |
| **Channels & Band Mapping** | Exactly 3 Bands: B4 (Red), B3 (Green), B2 (Blue) | Multi-spectral water absorption contrast |
| **Spatial Dimensions** | Exactly $512 \times 512$ pixels | Model input tensor shape |
| **Ground Sampling Distance**| $10.0\text{ meters / pixel}$ | Native resolution of Sentinel-2 optical bands |
| **Data Type** | UInt16 (Digital Numbers) or Float32 | Standard Top-Of-Atmosphere / Surface Reflectance |
| **Georeferencing Metadata** | Embedded EPSG CRS, `ModelPixelScaleTag`, `ModelTiepointTag` | Required for physical geodesic area calculations |

### 4.2 Step-by-Step Satellite Image Upload Workflow
1. Navigate to the **Analysis** workspace (`A`).
2. **File Selection:**
   - Drag and drop your `.tif` file into the dashed dropzone, or click **Select Satellite File** to browse your local file system.
   - Alternatively, under **Standard Sentinel-2 Test Chips**, click any pre-loaded chip (e.g., *Sindh Basin Monsoon Flood*, *Sylhet Flash Inundation*) to load pre-formatted test rasters.
3. Once selected, the file name, size, and preview container are staged.

### 4.3 Pre-Inference Server Verification Pipeline (`/api/verify-image`)
Before any machine-learning model touches the raster, click **Run Integrity Verification**.
The backend inspects eight independent verification gates:
1. **File Integrity:** Verifies buffer is non-empty and readable.
2. **Image Decode:** Validates TIFF magic bytes (`II*\0` little-endian or `MM\0*` big-endian).
3. **Dimensions Gate:** Validates dimensions are exactly $512 \times 512$.
4. **Channels Gate:** Confirms exactly 3 bands exist.
5. **Data Type:** Checks value ranges and data type format.
6. **Modality:** Confirms Sentinel-2 optical multi-spectral profile.
7. **Geospatial Metadata:** Extracts `ModelPixelScaleTag` and `ModelTiepointTag`.
8. **Model Compatibility:** Authoritative authorization check.

**Verification Statuses:**
- **`VERIFIED_SATELLITE_INPUT` (Passed):** File contains authenticated GeoTIFF spatial tags and matches model dimensions. A cryptographic `verification_id` is registered in server memory.
- **`SUPPORTED_BUT_UNVERIFIED` (Warning):** File is a readable image, but lacks embedded CRS tags. Physical area calculation is disabled.
- **`REJECTED` (Failed):** Corrupted container, non-image format, or channel mismatch. Inference is blocked.

### 4.4 Model Readiness & Fail-Closed Guardrails (`/api/analyze`)
In strict adherence to the **Zero-Fabrication Policy**:
- If the model checkpoint (`models/flood_segmentation/floodsight_unet_resnet34_best.pth`) is **NOT** present on the server, the backend **stops inference immediately** and returns:
  ```json
  HTTP/1.1 503 Service Unavailable
  {
    "error": "FLOOD_MODEL_UNAVAILABLE",
    "message": "No trained FloodSight segmentation checkpoint is installed."
  }
  ```
- The interface displays an amber warning banner: **Model Weights Pending Training**. No fake masks or synthetic probabilities will be generated.

### 4.5 Executing Flood Segmentation & Adjusting Decision Thresholds
When verification passes and model weights are installed:
1. Adjust the **Positive-Class Probability Threshold Slider** (range: `0.10` to `0.90`; default: `0.50`).
   - *Higher Threshold ($\ge 0.65$):* Conservative detection; minimizes false alarms in murky agricultural soil.
   - *Lower Threshold ($\le 0.35$):* Sensitive detection; captures shallow sheet flooding, but may tag dark cloud shadows.
2. Click **Execute U-Net Flood Analysis**.
3. Processing executes in $\sim 30\text{–}60\text{ms}$. Results update automatically.

### 4.6 Interpreting Segmentation Masks, Probabilities, and Inundation Zones
Upon completion, the Analysis Dashboard presents four verified result cards:
- **Flood Coverage:** Flooded pixels expressed as a percentage of total valid pixels ($\frac{N_{\text{flood}}}{N_{\text{valid}}} \times 100\%$).
- **Flooded Pixel Count:** Absolute count of pixels classified as surface water.
- **Mean Model Confidence:** Average positive-class probability across all detected flood pixels.
- **Physical Inundation Area:** Measured in **hectares ($\text{ha}$)** or square kilometers ($\text{km}^2$), computed directly from raster geotransforms.

### 4.7 Rejection States, Error Diagnostics, and Handling Unverified Data
If your file is rejected, consult the **Diagnostics Checklist**:
- *`MODEL_DIMENSION_MISMATCH`*: Tile is not $512 \times 512$. Resample or tile your satellite scene before ingestion.
- *`UNSUPPORTED_MODEL_INPUT`*: Image has 1 band (grayscale) or 4 bands (RGB + NIR). Re-export as 3-band B4/B3/B2.
- *`PROVENANCE_UNVERIFIED`*: Embedded tags missing. File can be viewed, but physical area cannot be certified.

---

## 5. Tactical Geospatial Maps & Live Environmental Layers

### 5.1 Workspace Overview: Tactical Map & Live Weather Modes
Access the **Tactical Maps** workspace via `M`. The view includes four operational modes:
- **Real-Time Tactical Map:** High-resolution basemaps with vector flood overlays and infrastructure intersection routes.
- **Live Weather Radar Map:** Live multi-source meteorological intelligence combining RainViewer radar, Open-Meteo forecasts, and satellite flood overlays.
- **3D Topographic Terrain:** Interactive digital elevation visualizer.
- **Side-by-side Comparison View:** Multi-temporal change detector comparing current flood inundation results against pre-disaster historical baselines and different satellite capture passes.

### 5.4 Side-by-side Comparison: Historical Baseline vs Flood Inundation
The Side-by-side View enables incident commanders and remote sensing specialists to assess flood expansion over time:
- **Dual Synchronized Viewports (`Side-by-side` Mode):** Displays the reference baseline raster on the left and the current flood analysis on the right. Panning or zooming either pane synchronously updates the opposing pane with lockstep coordinate centering.
- **Interactive Split Slider (`Split Slider` Curtain Mode):** Features a central draggable vertical divider line. Sliding horizontally interactively peels back the flood inundation mask to reveal the pre-disaster ground state underneath.
- **Multi-Temporal Satellite Capture Epoch Selector:**
  - *Historical Dry-Season Baseline (T -180d):* Permanent river channel and baseline vegetation canopy.
  - *Pre-Event Early Runoff (T -14d):* Saturated soil conditions prior to river bank overtopping.
  - *Event Crest (Peak Inundation):* Maximum inundation envelope validated by U-Net ResNet-34 segmentation.
  - *Post-Event Recession (T +6d):* Receding flood waters, trapped pools, and drainage flow.
  - *Active Upload Analysis:* Ingests any freshly analyzed GeoTIFF scene uploaded during the active user session.
- **Quantitative Change Detection Telemetry:**
  - Net Inundation Expansion ($\Delta\text{Area}$ in hectares and percentage increase).
  - Water Stage Surge Anomaly ($\Delta\text{Stage}$ relative to mean sea level).
  - Severed Road Infrastructure Corridor Delta ($\Delta\text{Roads}$ in kilometers).
- **Change Anomaly Mask:** Toggles high-contrast cyan/azure hatching over newly submerged ground.

### 5.2 RainViewer Radar Ingestion, Timeline Playback, and Nowcasting
The Live Weather Map proxies real-time weather radar data directly from RainViewer's global radar mosaic API (`/api/external/weather-radar`):
- **Past Frames:** Past 2 hours of observed radar reflectivity at 10-minute intervals.
- **Nowcast Frames:** 30 minutes of predictive extrapolation frames.
- **Timeline Playback:**
  - Click **Play / Pause** to run the animated radar sequence.
  - Use **Skip Back / Skip Forward** to step through individual 10-minute radar captures.
  - Adjust the **Playback Speed** between $500\text{ms}$ and $2000\text{ms}$ per frame.
- **Color Palettes:** Select between *Universal Blue (Default)*, *RainViewer Classic*, and *Titan Spectrum*.

### 5.3 Open-Meteo Micro-Meteorological Telemetry & Hourly Forecasts
Querying the location triggers an Open-Meteo gateway query (`/api/external/weather-forecast`):
- **Current Readings:** Temperature ($^\circ\text{C}$), Relative Humidity ($\%$), Wind Speed ($\text{km/h}$), Wind Direction (cardinal compass degrees), Surface Pressure ($\text{hPa}$), and Current Precipitation Rate ($\text{mm/h}$).
- **48-Hour Hourly Precipitation Chart:** Visual bar breakdown showing forecasted rainfall volume over the next two days to identify upcoming hydrological crests.

### 5.4 Multi-Layer Composition & Opacity Blending
The **Layer Control Panel** allows operators to toggle and blend layers:
- **Basemaps:** Toggle between *Dark Canvas (CartoDB)*, *Satellite Imagery (Esri World Imagery)*, and *Streets (OSM)*.
- **Weather Radar Layer:** Toggle visibility and slide opacity ($0\%\text{–}100\%$).
- **Satellite Flood Extent:** Superimpose the active satellite flood mask directly over live radar to compare active rain cells against accumulated standing inundation.
- **Emergency Corridors:** Displays primary transportation arteries.

### 5.5 Hydrological Telemetry & River Discharge Indicators
Through the `/api/external/hydrology` gateway, the platform interfaces with Copernicus Emergency Management Service / ECMWF GloFAS (Global Flood Awareness System):
- Displays gridded river discharge estimates ($\text{m}^3/\text{s}$).
- When telemetry is pending or unavailable, displays `NO TELEMETRY GAUGES DETECTED` rather than simulating streamflow.

### 5.6 Data Freshness Protocols (`FRESH`, `STALE DATA`, `SOURCE UNAVAILABLE`)
Every environmental panel features a data freshness badge based on retrieval age:
- **`FRESH (Green)`**: Data retrieved within the last 15 minutes.
- **`STALE DATA (Amber)`**: Cached data older than 15 minutes due to gateway delays. Time of last refresh is displayed.
- **`SOURCE UNAVAILABLE (Red)`**: Upstream provider timeout (e.g., RainViewer or Open-Meteo unreachable). Failures are logged without crashing the map.

### 5.7 Critical Distinction: Weather Observations vs. Satellite Inundation
**OPERATIONAL SAFETY WARNING:**
- **Weather Radar & Forecasts** show **atmospheric precipitation in the air**. Heavy radar reflectivity does *not* prove standing water has accumulated on the ground.
- **Satellite Multi-Spectral Imagery** shows **actual standing water on the ground**.
- Never dispatch rescue boats based exclusively on radar precipitation without confirmed satellite or ground inundation verification.

---

## 6. 3D Topographic Simulation & Digital Elevation Modeling

### 6.1 Interactive 3D Terrain Viewer Controls
The **3D Topographic Terrain View** provides tactical spatial elevation visualization:
- **Orbit Controls:** Left-click + drag to rotate around the terrain mesh; right-click + drag to pan; mouse wheel to zoom.
- **Wireframe Mode:** Toggle geometric wireframe overlay to inspect underlying elevation grid vertices.
- **Reset Camera:** Return to standard oblique $45^\circ$ tactical perspective.

### 6.2 Elevation Extrusion, Relief Scaling, and Water Columns
Operators can manipulate physical simulation parameters in real time:
- **Water Stage Level ($0.0\text{–}1.0$):** Simulates rising floodwaters. The translucent blue water plane rises relative to terrain elevation, showing how low-lying valleys and coastal plains fill first.
- **Extrusion Scale ($1.0\text{x}\text{–}5.0\text{x}$):** Exaggerates vertical relief to clearly reveal subtle ridges, natural levees, and drainage divides.
- **Flood Coverage ($\%$):** Reflects the calculated inundation footprint from the satellite analysis.

### 6.3 Procedural Terrain Representation vs. Authenticated Survey DEMs
**SCIENTIFIC DISCLOSURE:**
- The interactive 3D terrain viewer models representative topographical terrain types (*Floodplain*, *Coastal Delta*, *River Basin*, *Mountain Valley*) using GPU procedural elevation shaders.
- It is designed for **hydraulic stage intuition and topological understanding**.
- It does **NOT** represent LiDAR-surveyed centimeter-accurate digital elevation models. Do not use procedural elevation for engineering levee construction or structural design.

### 6.4 Handling Unavailable Hydrological Datasets
Where authenticated bathymetry or high-resolution DEMs are not installed, the platform explicitly marks elevation metrics as `PROCEDURAL TOPOGRAPHIC APPROXIMATION` and keeps bathymetric depth fields marked as `UNAVAILABLE`.

---

## 7. Incident Command Briefings & Situation Reports (SITREPs)

### 7.1 Accessing the Reports Workspace
Press `R` or click **Reports** in the navigation header to enter the incident briefing console.

### 7.2 Global Disaster Situation Reports (SITREPs)
The **Global Disasters Tab** provides standardized operational SITREPs for 20 benchmarked global flood disasters:
- **Incident Header:** Incident identifier, affected nation, primary watershed, and disaster category.
- **Key Metrics Grid:** Flooded surface area ($\text{ha}$), critical roads submerged, bridges overtopped, isolated communities, and response priority score.
- **Incident Narrative:** Authoritative summary of the meteorological trigger, breach mechanics, and field conditions.
- **Tactical Actions:** Priority rescue corridors, recommended helicopter landing zones (HLZs), and levee breach sectors.

### 7.3 Active Upload Mission Intelligence Summaries
Switching to the **Active Upload Tab** generates an on-the-fly situation report based exclusively on your freshly verified satellite analysis:
- **Provenance Verification:** Reports file name, SHA-256 hash, sensor type, and verification ID.
- **Segmentation Telemetry:** Lists threshold used, flooded pixel count, confidence score, and geodesic hectarage.
- **Zero-Fabrication Guardrail:** If road vectors or demographic census datasets have not been uploaded, the report states `AFFECTED ROADS: DATASET MISSING` and `POPULATION EXPOSURE: INSUFFICIENT EVIDENCE`, refusing to fabricate numbers.

### 7.4 ICS-209 Field Compatibility & Decision Support Output
Reports adhere to Incident Command System (ICS) SITREP conventions:
- Standardized section numbering.
- Explicit disclaimers on sensor limitations and cloud cover.
- Export to formatted print view via your browser's Print dialog (`Ctrl+P` / `Cmd+P`).

### 7.5 Documented Feature Status & Planned Capabilities
| Capability | Implementation State | Verification Status |
| :--- | :--- | :--- |
| **Sentinel-2 GeoTIFF Ingestion** | Implemented & Tested | Fully Verified |
| **Server-Side Token Verification** | Implemented & Tested | Fully Verified |
| **ResNet-34 U-Net Inference Engine** | Implemented (Fail-closed on missing weights)| Verified Architecture |
| **Live RainViewer Radar Ingestion** | Implemented & Tested | Live API Grounded |
| **Live Open-Meteo Weather Gateway**| Implemented & Tested | Live API Grounded |
| **Interactive 3D Terrain Viewer** | Implemented & Tested | GPU Accelerated |
| **Automated Drone Video Ingestion** | Planned Roadmap Feature | Not Implemented |
| **Real-Time 911 Dispatch Routing** | Planned Roadmap Feature | Not Implemented |

---

## 8. Metric Formulations, Geospatial Calculations & Verification Rules

### 8.1 Total vs. Valid vs. Flooded Pixel Metrics
- **Total Pixels ($N_{\text{total}}$):** $\text{Width} \times \text{Height} = 512 \times 512 = 262,144\text{ pixels}$.
- **Valid Pixels ($N_{\text{valid}}$):** Pixels containing non-NoData reflectance values.
- **Flooded Pixels ($N_{\text{flood}}$):** Number of valid pixels where model positive-class probability $P(x, y) \ge \tau$.
- **Flood Coverage Fraction ($f$):**
  $$f = \frac{N_{\text{flood}}}{N_{\text{valid}}}$$
- **Flood Coverage Percentage:** $f \times 100\%$.

### 8.2 Positive-Class Probability & Mean Confidence
For each pixel, the model outputs positive-class probability $P(w) \in [0.0, 1.0]$:
$$\bar{C} = \frac{1}{N_{\text{flood}}} \sum_{i \in \text{flood}} P_i$$
If $N_{\text{flood}} = 0$, the mean confidence displays the average background probability.

### 8.3 Geodesic vs. Projected Hectarage Computation
Physical area is **never** calculated by multiplying pixel count by an assumed constant.
- **Projected CRS (e.g., UTM Zones, EPSG:32642):**
  Pixel dimensions $\Delta x, \Delta y$ are in meters. Pixel area $A_{\text{px}} = \Delta x \times \Delta y\text{ m}^2$.
  $$\text{Area (ha)} = \frac{N_{\text{flood}} \times A_{\text{px}}}{10,000}$$
- **Geographic CRS (e.g., WGS 84, EPSG:4326):**
  Pixel dimensions $\Delta \lambda, \Delta \phi$ are in angular degrees. Computing area requires geodesic scaling using local latitude $\phi$:
  $$\Delta x = \Delta \lambda \times \frac{\pi}{180} \times R_{\text{earth}} \times \cos(\phi)$$
  $$\Delta y = \Delta \phi \times \frac{\pi}{180} \times R_{\text{earth}}$$
  $$\text{Area (ha)} = \frac{N_{\text{flood}} \times (\Delta x \times \Delta y)}{10,000}$$

### 8.4 Coordinate Reference Systems (CRS) and Affine Geotransforms
The platform reads TIFF tag `33550` (`ModelPixelScaleTag`) and tag `33922` (`ModelTiepointTag`):
$$\begin{pmatrix} X_{\text{geo}} \\ Y_{\text{geo}} \end{pmatrix} = \begin{pmatrix} X_0 \\ Y_0 \end{pmatrix} + \begin{pmatrix} S_x & 0 \\ 0 & -S_y \end{pmatrix} \begin{pmatrix} x_{\text{pixel}} \\ y_{\text{pixel}} \end{pmatrix}$$
If these tags are absent, `physical_area_ha` returns `null` with the note: *Geospatial transform unavailable; CRS metadata missing.*

### 8.5 Topological Road Network & Community Isolation Analysis
When authenticated vector roads exist:
- Road segments are represented as edges $E$, intersections as vertices $V$.
- Submerged segments are marked severed ($E_{\text{cut}}$).
- A breadth-first search (BFS) evaluates connectivity between settlement nodes $S$ and evacuation centers. Disconnected components are classified as **Isolated Zones**.

---

## 9. Troubleshooting, Error Reference & Safe Recovery

### 9.1 Upload Failures & Raster Rejections
- **Symptom:** Dropzone turns red; error message: *Unsupported raster format*.
  - **Cause:** File is `.pdf`, `.zip`, `.nc`, or a JPEG without TIFF container headers.
  - **Resolution:** Re-export image from QGIS or ArcGIS as an uncompressed GeoTIFF (`.tif`).
- **Symptom:** Error: *Uploaded buffer is empty (0 bytes)*.
  - **Resolution:** Check file size on disk. Ensure file is not locked by another desktop process.

### 9.2 Missing Geospatial Tags & Unreferenced Rasters
- **Symptom:** Status is `SUPPORTED_BUT_UNVERIFIED`; Physical Area displays `N/A`.
  - **Cause:** Image lacks GeoKeyDirectoryTag (Tag 34735) or EPSG projection tags.
  - **Resolution:** In QGIS, right-click layer $\to$ Export $\to$ Save As $\to$ GeoTIFF with explicit CRS (e.g., EPSG:4326 or local UTM).

### 9.3 Model Checkpoint Missing or Invalid (`HTTP 503 FLOOD_MODEL_UNAVAILABLE`)
- **Current Model State:** The U-Net ResNet-34 architecture (24.4M parameters across 290 tensor layers) was trained for 40 epochs with best validation weights at Epoch 38 (Validation IoU: 0.6080, Validation Dice: 0.7562) and evaluated on the locked 90-chip Sen1Floods11 held-out test split, achieving verified benchmark performance: **IoU: 0.6176**, **Dice: 0.7636**, **Precision: 0.7621**, **Recall: 0.7651**, and **Pixel Accuracy: 0.9408** (measured inference latency: 6.09 ms mean / 5.68 ms median on CUDA).
- **Symptom:** Clicking inference returns `HTTP 503 Service Unavailable`, or the navigation bar displays `MODEL: OFFLINE`.
- **Root Cause:** The expected model checkpoint file (`models/flood_segmentation/floodsight_unet_resnet34_best.pth`) is absent, zero-byte, under 300MB, or fails zip container validation.
- **Expected Server Error Structure:**
  ```json
  {
    "error": "FLOOD_MODEL_UNAVAILABLE",
    "message": "No trained FloodSight segmentation checkpoint is installed.",
    "checkpoint_expected_path": "models/flood_segmentation/floodsight_unet_resnet34_best.pth",
    "expected_size_bytes": 350205859,
    "expected_sha256": "7b8d9e0b2a8e9db2162732a0632cb8a5f4b35b8a1777afca8880798869e4d436"
  }
  ```
- **Direct Impact on Inference Results:**
  - **Inference is Completely Blocked:** The system strictly refuses to run heuristic or simulated approximations.
  - **Zero Synthetic Masks:** No flood inundation raster or GeoJSON vector polygons are emitted.
  - **Zero Default Percentages:** The system will never substitute hardcoded percentages (such as 28% coverage) or arbitrary confidence scores (such as 85%).
  - **Hectarage Reported as Unavailable:** Flooded area in physical hectares returns `null` (`NOT AVAILABLE`).
- **Resolution Procedure:**
  1. Download the official checkpoint using the confirmation-aware downloader:
     `python3 scripts/download_drive_file.py 1a2L1ojE_nOj6uz47qKpCd_TSjnwZ30O2 models/flood_segmentation/floodsight_unet_resnet34_best.pth`
  2. Verify cryptographic SHA-256 integrity:
     `python3 scripts/verify_checkpoint.py`
  3. Re-probe health gateway: `curl http://localhost:3000/api/health` returns `"model_available": true`.

### 9.4 Weather Radar & Meteorological Gateway Timeouts
- **Symptom:** Live Weather Map shows amber badge: `STALE DATA` or red badge: `SOURCE UNAVAILABLE`.
  - **Cause:** Upstream RainViewer API or Open-Meteo API exceeded 6-second timeout threshold.
  - **Resolution:** Click the **Refresh Telemetry** button (`RefreshCw`). The backend gateway will re-attempt retrieval. Existing map layers remain fully functional.

### 9.5 WebGL Hardware Acceleration & Rendering Latency
- **Symptom:** 3D Earth or Topographic terrain renders slowly or shows a blank container.
  - **Cause:** Browser hardware acceleration is disabled, or WebGL context was lost.
  - **Resolution:** Open browser settings $\to$ System $\to$ Enable **Use hardware acceleration when available**. Ensure GPU drivers are updated.

### 9.6 Session Storage & Verification Token Expiration
- **Symptom:** Analysis returns `HTTP 403 VERIFICATION_REQUIRED`.
  - **Cause:** Verification tokens expire after 1 hour in server memory (`SafeTokenRegistry` TTL).
  - **Resolution:** Click **Run Integrity Verification** again to issue a fresh verification token.

---

## 10. Data Governance, Security Architecture & Scientific Integrity

### 10.1 Zero-Fabrication Enforcement Policy
The cornerstone of FloodSight AI is scientific veracity:
- **Never Fabricate Observations:** The system will never populate a dashboard with random numbers or placeholder percentages.
- **Fail-Closed Operations:** When dependencies fail, execution stops and explicit diagnostics are returned.
- **Provenance Logging:** Every result references its input file SHA-256 hash, verification ID, and model checkpoint hash.

### 10.2 Server-Side Token Registry (`SafeTokenRegistry`) Lifecycle
- Token storage uses an in-memory TTL map with automatic pruning (1 hour expiration) and a strict 1,000-record capacity cap to prevent memory leaks.
- Verification tokens are cryptographically random UUIDv4 records linked to the specific file's SHA-256 digest.

### 10.3 Privacy & Satellite Data Retention Practices
- FloodSight AI does not upload or retain your proprietary satellite scenes in external cloud buckets. All raster processing executes through local memory pipelines.
- Temporary buffers are purged immediately following verification and analysis.

### 10.4 Automated AI Guidance & Gemini Integration Boundaries
Where large language models (such as Google Gemini) are utilized:
- Gemini is permitted **exclusively** to summarize verified structured tables and explain documented limitations in human-readable terms.
- Gemini is **strictly forbidden** from generating synthetic flood masks, estimating flood hectarage, or fabricating rescue priorities.

---

## 11. Quick Reference Appendices

### Appendix A: Standard Analysis Operational Checklist
- [ ] **Step 1:** Confirm system health is `HEALTHY` via Command Hub (`D`).
- [ ] **Step 2:** Ensure satellite scene is a 3-band GeoTIFF (B4/B3/B2) sized $512 \times 512$ with valid EPSG tags.
- [ ] **Step 3:** Upload file in Analysis Laboratory (`A`).
- [ ] **Step 4:** Execute **Run Integrity Verification** and verify green `VERIFIED_SATELLITE_INPUT` status.
- [ ] **Step 5:** Choose classification threshold (default: `0.50`).
- [ ] **Step 6:** Execute **Execute U-Net Flood Analysis**.
- [ ] **Step 7:** Review flooded pixels, coverage percentage, and physical hectarage.
- [ ] **Step 8:** Switch to **Reports** (`R`) $\to$ **Active Upload** to review the official situation briefing.

### Appendix B: Geospatial & Remote Sensing Glossary
- **Affine Transform:** A 6-parameter geometric transformation matrix mapping raster column/row coordinates to real-world easting/northing coordinates.
- **B4 / B3 / B2:** Sentinel-2 optical spectral bands corresponding to Red ($665\text{ nm}$), Green ($560\text{ nm}$), and Blue ($490\text{ nm}$).
- **CRS (Coordinate Reference System):** A coordinate-based local, regional, or global system used to locate geographical entities (e.g., EPSG:4326 WGS 84).
- **DEM (Digital Elevation Model):** A bare-earth raster grid of elevation values referenced to a common vertical datum.
- **Geodesic Calculation:** Area or distance measurement computed across the curved ellipsoidal surface of the Earth.
- **GSD (Ground Sampling Distance):** The physical distance on the Earth's surface represented by the center of two adjacent pixels (10m for Sentinel-2 optical).
- **IoU (Intersection over Union):** Benchmark segmentation accuracy metric: $\frac{\text{True Positives}}{\text{True Positives} + \text{False Positives} + \text{False Negatives}}$.
- **NoData Value:** A designated numerical flag (e.g., `-9999` or `0`) indicating missing or invalid sensor measurements.
- **Nowcasting:** High-resolution meteorological forecasting for the very immediate future (0–60 minutes).
- **Reflectance:** The ratio of radiant energy reflected by a surface to that incident upon it.

### Appendix C: Interface Component Directory
| Component | Location | Operational Function |
| :--- | :--- | :--- |
| **`Navbar`** | Top Persistent Header | Primary navigation, brand mark, hotkey trigger, analysis jump |
| **`OrbitalEarth3D`** | Overview Hero | Interactive 3D WebGL Earth globe with flight camera & hotspots |
| **`LiveWeatherMap`** | Tactical Maps | Composite Leaflet map with RainViewer radar, Open-Meteo, & flood overlays |
| **`GoogleRealtimeMap`** | Tactical Maps | Satellite basemap with emergency routes and tactical grids |
| **`ExtrudedFloodTerrainR3F`**| Overview & Tactical Maps | Interactive 3D digital elevation and water stage simulator |
| **`DataQualityPanel`** | Analysis Workspace | Real-time diagnostic verification checklist display |
| **`HotkeyModal`** | Global Overlay (`?`) | Interactive modal displaying keyboard shortcuts |
| **`Footer`** | Bottom Persistent | System version, zero-fabrication declaration, and methodology links |

### Appendix D: API Endpoint & Return Code Matrix
| Endpoint | Method | Input Parameters | Success Output | Error Statuses |
| :--- | :---: | :--- | :--- | :--- |
| **`/api/health`** | `GET` | None | `{ status, model_available, checkpoint_path }` | None (200) |
| **`/api/verify-image`** | `POST` | `multipart/form-data` (file) | `{ verification_id, status, accepted_for_inference, checks }` | 400 (Empty), 415 (Invalid Form) |
| **`/api/analyze`** | `POST` | `verification_id`, `threshold` | `{ analysis_id, flood_pixel_count, physical_area_ha, coverage_percent }` | 403 (Unverified), 503 (No Model) |
| **`/api/external/weather-radar`**| `GET` | None | Raw RainViewer API JSON radar mosaic | 502 (Upstream Error), 504 (Timeout) |
| **`/api/external/weather-forecast`**| `GET` | `lat`, `lon` | Raw Open-Meteo hourly forecast JSON | 400 (Bad Coord), 504 (Timeout) |
| **`/api/external/hydrology`** | `GET` | `lat`, `lon` | GloFAS river discharge & telemetry structure | 200 (Success / Disclosed Nulls) |

### Appendix E: Model Input Specification Cheat-Sheet
- **Tensor Shape:** `(Batch, Channels, Height, Width) = (1, 3, 512, 512)`
- **Band Order:** `[Band 4 (Red), Band 3 (Green), Band 2 (Blue)]`
- **Normalization Mean:** `[0.158, 0.164, 0.151]`
- **Normalization Std Dev:** `[0.132, 0.128, 0.134]`
- **Target Pixel Resolution:** $10.0\text{ meters / pixel}$
- **Classification Output:** Single-channel probability grid $P(x, y) \in [0.0, 1.0]$ via Sigmoid activation.
- **Default Decision Threshold:** $\tau = 0.50$.
