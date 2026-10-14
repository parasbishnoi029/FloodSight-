# FloodSight AI — Global Satellite Flood Damage Intelligence Platform

> **Earth Observation Track B Entry**: *“When roads, bridges and phone lines are gone, rescuers still need to know where the damage is and who is cut off. Build the system that tells them — from space.”*

---

## 1. Overview & Core Mission

**FloodSight AI** is a verified Earth observation decision-support platform that transforms multi-spectral satellite imagery (Sentinel-2 MSI / Sentinel-1 SAR) into actionable flood inundation intelligence.

Unlike arbitrary AI tools that hallucinate predictions on arbitrary photos, FloodSight AI implements an **authoritative server-side verification gate**: every raster must pass strict multi-stage inspection (file integrity, pixel dimensions, spectral channel counts, data types, and geodetic coordinate headers) before U-Net ResNet-34 segmentation inference is permitted.

---

## 2. End-to-End Verification & Inference Pipeline

```
   Raw Satellite Raster (.tif / .png / .jpg)
                     │
                     ▼
   POST /api/verify-image (Strict Server-Side Inspection)
   ├── File Integrity & Byte Decoding
   ├── Spatial Dimensions (512x512) & 3 Optical Bands (B4, B3, B2)
   ├── Normalization Compatibility & Range Checks
   └── GeoTIFF CRS & 10m Ground Sampling Distance (GSD)
                     │
                     ▼
   [ VERIFICATION VERDICT ]
   ├── VERIFIED_SATELLITE_INPUT  ──► Signed Verification Token Issued
   ├── SUPPORTED_BUT_UNVERIFIED  ──► Proceed with Unreferenced Provenance Warning
   └── REJECTED                  ──► Inference Blocked (HTTP 400 / 415)
                     │
                     ▼
   POST /api/analyze (Verification Token & Hash Check Required)
                     │
                     ▼
   FloodSight-UNet-ResNet34 Inference (Locked Test Split Verified: 0.6176 IoU | 0.7636 Dice | 6.09ms CUDA)
                     │
                     ▼
   3D Extruded Flood Topography Engine (React Three Fiber + WebGL)
   ├── Multi-Scale DEM Elevation Mesh
   ├── Dynamic Flood Water Surface Elevation (+0m to +12m MSL)
   ├── Submerged Road Vectors & Infrastructure Beacons
   └── Depth Hazard Heatmap Shading (Shallow <1m, Moderate 1-3m, Severe >3m)
                     │
                     ▼
   ICS-209 Incident Situation Briefs & Global Tactical Map
```

---

## 3. Global Disaster Monitoring Coverage

The platform continuously tracks **20 ground-truth disaster monitoring epicenters across all 6 inhabited continents**:

- **Africa**: Volta River Basin (Ghana), Niger-Benue Confluence (Nigeria), Pungwe Basin & Beira (Mozambique), White Nile Sudd (South Sudan)
- **Asia**: Brahmaputra Valley (India), Ganges-Brahmaputra Meghna Delta (Bangladesh), Indus River Basin (Pakistan), Mekong River Delta (Vietnam), Kalu Ganga Basin (Sri Lanka)
- **Europe**: Ebro River Valley (Spain), Ahr & Meuse River Valley (Germany), Po River & Emilia-Romagna (Italy)
- **North America**: Mississippi River Delta (USA), Missouri & Platte River Valley (USA), Usumacinta & Grijalva Basin (Mexico)
- **South America**: Mamoré River Basin (Bolivia), Paraná & Paraguay Confluence (Paraguay), Guaíba Lake Basin (Brazil)
- **Oceania**: Fitzroy & Brisbane Basin (Australia), Hawke’s Bay & Esk Valley (New Zealand)

---

## 4. Quantitative Model Performance (Sen1Floods11 Locked Test Split)

> **Phase 2 Gate Status: PHASE 2 ML VERIFIED — SEN1FLOODS11 HAND-LABELED BENCHMARK**
>
> In accordance with Zero-Fabrication governance, evaluation metrics are generated from executing the trained checkpoint on verified real imagery. `FloodSight-UNet-ResNet34 (v1.0.0)` was trained for 40 epochs on Sen1Floods11 (best validation checkpoint at Epoch 38: `0.6080 Val IoU`, `0.7562 Val Dice`) and evaluated on the locked 90-chip held-out test split (`evaluated_at: 2026-10-10T04:36:04Z`). The backend enforces fail-closed model checking (HTTP 503 `FLOOD_MODEL_UNAVAILABLE`) if checkpoint weights are not present locally.

| Metric | Measured Value | Standard | Status |
| :--- | :--- | :--- | :--- |
| **Flood IoU (Intersection over Union)** | `0.6176` | Locked Test Set (90 Hand-Labeled Chips) | `VERIFIED` |
| **Flood Dice / F1 Score** | `0.7636` | Harmonic Mean Precision/Recall | `VERIFIED` |
| **Flood Precision** | `0.7621` | Positive Predictive Accuracy | `VERIFIED` |
| **Flood Recall** | `0.7651` | Water Detection Sensitivity | `VERIFIED` |
| **Pixel Accuracy** | `0.9408` | Overall Ground-Truth Accuracy (Valid Pixels) | `VERIFIED` |
| **Inference Latency** | `6.09 ms (mean) / 5.68 ms (median)` | 512x512 Tile on CUDA | `VERIFIED` |

### Threshold Sensitivity Analysis ($\tau = 0.30 - 0.70$)

| Decision Threshold ($\tau$) | Flood IoU | Flood Dice | Precision | Recall | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$\tau = 0.30$** | `0.5941` | `0.7454` | `0.6846` | `0.8179` | High sensitivity / early flood warning |
| **$\tau = 0.40$** | `0.6111` | `0.7586` | `0.7311` | `0.7882` | Balanced transition zone |
| **$\tau = 0.50$ (Default)** | **`0.6176`** | **`0.7636`** | **`0.7621`** | **`0.7651`** | **Optimal operational threshold** |
| **$\tau = 0.60$** | `0.6020` | `0.7515` | `0.8363` | `0.6824` | Conservative water delineation |
| **$\tau = 0.70$** | `0.5937` | `0.7451` | `0.8666` | `0.6534` | High precision / low false-alarm core |

### Confusion Matrix Summary (Test Split: 20,517,367 Evaluated Valid Pixels)

- **True Positives (TP)**: `1,963,241` pixels
- **False Positives (FP)**: `612,774` pixels
- **False Negatives (FN)**: `602,860` pixels
- **True Negatives (TN)**: `17,338,492` pixels

---

## 5. Security & Zero-Hallucination Policy

1. **Server-Authoritative Gate**: Frontend verification flags are never trusted. Verification tokens are server-generated UUIDv4 records linked to the input file's SHA-256 hash, tracked in an authoritative server-side registry with automatic 1-hour TTL expiration.
2. **Token Lifecycle Disclosure**: Verification tokens reside in process-local bounded storage (1-hour TTL, max 1,000 entries) and reset on server restart. For distributed multi-worker production deployments, durable token stores (Redis/database) or HMAC-signed state tokens are required.
3. **No Arbitrary Inferences**: Unverified photos, graphics, non-geospatial files, and rasters deviating from the 512×512 3-channel optical contract are rejected.
4. **Honest Hectarage**: Physical area is strictly computed when valid GeoTIFF affine transform matrices are present (supporting both projected metric UTM and geographic ellipsoidal geodesic calculation). If unreferenced images are provided, hectarage is reported as unavailable (`null`).
5. **Zero Fabricated Polygons**: Downstream road, bridge, and isolated pocket layers are never synthetically drawn until verified vector intersection models are executed.
6. **Keyless Map Cartography**: Leaflet cartography connects to public keyless OpenStreetMap, Esri High-Resolution World Imagery, and OpenTopoMap services without exposing private credentials.

---

## 6. Local Setup & Execution

### Model Checkpoint Setup (Required for Live Inference)

Due to file size constraints (`350,205,859 bytes`), `.pth` model weights are gitignored. The server enforces a strict fail-closed policy (`HTTP 503 FLOOD_MODEL_UNAVAILABLE`) if the checkpoint is absent. Download and verify the official checkpoint before launching inference:

```bash
python3 scripts/download_drive_file.py 1a2L1ojE_nOj6uz47qKpCd_TSjnwZ30O2 models/flood_segmentation/floodsight_unet_resnet34_best.pth
python3 scripts/verify_checkpoint.py
```

### Frontend (React 19 + TypeScript + Vite)
```bash
npm install
npm run dev
```
Open `http://localhost:3000` to access the full application.

### Backend Verification & Inference Service
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 7. License

Apache 2.0 Open Science License.
