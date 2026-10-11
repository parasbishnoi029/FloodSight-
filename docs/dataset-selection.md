# FloodSight AI — Dataset Research & Selection Evaluation

**Track B: Mapping Flood Damage From Space**  
**Task**: Pixel-Level Binary Water & Flood Inundation Segmentation (Class 0: Background / Non-flooded, Class 1: Water / Inundated).

---

## 1. Candidate Public Datasets Investigation

| Metric / Parameter | **Sen1Floods11** (Selected) | **SpaceNet 8 (Flood & Road)** | **CEMS / Copernicus EMS** | **FloodNet (UAV High-Res)** |
| :--- | :--- | :--- | :--- | :--- |
| **Official Source** | Cloud to Street / NASA Earth Exchange / GitHub | SpaceNet LLC / Maxar Technologies | European Space Agency (ESA) / Copernicus | University of Maryland / IEEE GRSS |
| **License** | **CC BY-NC-SA 4.0** (Open science, fully reproducible) | Creative Commons Attribution-ShareAlike 4.0 | Open Access (Copernicus Sentinel Data Policy) | Non-Commercial Research License |
| **Sensor Modality** | **Sentinel-1 SAR (C-Band GRD)** & **Sentinel-2 MSI Optical** | Maxar WorldView-3 High-Res Optical (RGB-NIR) | Sentinel-1 / Sentinel-2 / COSMO-SkyMed | UAV / Drone RGB Imagery (DJI Phantom 4) |
| **Ground Sampling (GSD)** | **10 meters / pixel** (True orbital Earth Observation standard) | 0.5 meters / pixel | 10m – 20m | 0.015 – 0.03 meters / pixel (Sub-decimeter) |
| **Dataset Scale** | **4,831 512×512 GeoTIFF image chips** (446 hand-labeled chips + 4,385 weakly-labeled chips across 11 global flood events) | 1,000+ VHR strips across 4 global flood disasters | Variable activation packages (per-crisis vector shapefiles) | 2,343 RGB images (Hurricane Harvey aerial recon) |
| **Label Format** | **Pixel-level raster GeoTIFF masks** (0: Non-water, 1: Flooded water, -1: Permanent water / No-data) | Vector GeoJSON road linestrings + building polygons + flooded attribute | Vector delineation polygons / Crisis GIS layers | 10-class pixel-level semantic masks |
| **Target Classes** | Binary: 0 = Non-Flooded / Land, 1 = Water / Inundated | Multi-task: Flooded roads, non-flooded roads, flooded buildings | Crisis flood boundary polygon masks | Background, flooded road, submerged building, tree, etc. |
| **Standard Splits** | Fixed benchmark splits: **Train (252 chips)**, **Validation (89 chips)**, **Test (105 chips)** for hand-labeled set | Train / Test splits provided by SpaceNet competition | Disaster-by-disaster event activations | Standard Train (1,451) / Val (450) / Test (442) |
| **Suitability for Track B** | **HIGH**: Purpose-built for satellite flood segmentation; standard peer-reviewed benchmark. | **HIGH (Secondary)**: Exceptional for sub-meter road speed degradation, but heavier raw payload size. | **MEDIUM**: Geared towards emergency vector maps rather than standardized ML image-chip benchmarks. | **LOW for Space Track**: Drone/aerial low-altitude imagery, not orbital spaceborne remote sensing. |
| **Compatibility with Web API** | **HIGH**: 512×512 GeoTIFF & PNG RGB/NIR representations are lightweight, reproducible, and fast to evaluate. | **MEDIUM**: Requires multi-gigabyte GDAL pipelines and complex road graph geometry matching. | **MEDIUM**: Inconsistent raster resolutions across different crisis activations. | **LOW**: Misses orbital cloud, multi-spectral, and satellite GSD characteristics. |

---

## 2. Selected Dataset Recommendation: Sen1Floods11 (Sentinel-2 Optical & Sentinel-1 SAR)

### Why Sen1Floods11?
1. **Scientific Gold Standard**: Developed by NASA Earth Exchange and Cloud to Street, Sen1Floods11 is the most widely cited, rigorous public benchmark for pixel-level flood segmentation.
2. **Global Diversity**: Covers 11 distinct flood disasters spanning 6 continents (USA, Bangladesh, Somalia, Spain, Paraguay, Bolivia, Nigeria, Cambodia, Sri Lanka, India, Ghana), ensuring the model learns diverse biomes (arid soil, urban concrete, tropical vegetation, agricultural floodplains).
3. **Rigorous Quality**: Includes a dedicated set of 446 hand-labeled chips verified by hydrological experts, eliminating label noise present in automated heuristic datasets.
4. **Dual Sensor Track**: Supports both optical multi-spectral (Sentinel-2 RGB + NIR) and all-weather Synthetic Aperture Radar (Sentinel-1 SAR VV/VH), allowing direct comparison of optical vs. SAR water detection.
