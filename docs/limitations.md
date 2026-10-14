# FloodSight AI — System Limitations & Ethical Scope

As a serious engineering prototype, FloodSight AI maintains complete technical transparency regarding sensor constraints, algorithmic limitations, and operational boundaries.

---

## 1. Sensor & Physical Limitations

### A. Optical Cloud Occlusion
- **Limitation**: Optical sensors (Sentinel-2, Landsat, PlanetScope) cannot penetrate dense convective cloud cover often present during active cyclone/hurricane downpours.
- **Mitigation / Next Step**: Ingest C-Band / L-Band Synthetic Aperture Radar (Sentinel-1 SAR) to map surface water through cloud decks and at nighttime.

### B. Spatial Ground Resolution
- **Limitation**: At $10\text{m}/\text{pixel}$ ground sampling distance (GSD), small rural culverts, storm ditches, and minor alleys are below the Nyquist resolution limit.
- **Guideline**: Sub-meter aerial or high-resolution commercial imagery (WorldView-3 / SkySat) is required for individual building-level ingress analysis.

---

## 2. Inundation vs. Structural Collapse

- **Limitation**: Satellite imagery confirms **water overtopping and surface submersion**, but cannot inspect underground scour or internal structural integrity.
- **Terminology Rule**: Results are labeled as `Potentially Affected` or `Submerged`, never `Confirmed Structural Failure`. Ground sonar and dive teams are required for structural verification.

---

## 3. Operational & Ethical Boundaries

- **Research Prototype**: FloodSight AI is a decision-support prototype and does not replace emergency rescue dispatch or official meteorological warnings.
- **Zero Hallucination Guarantee**: Generative models are barred from estimating casualty numbers, monetary damage amounts, or rescue outcomes.

---

## 4. U-Net Model Availability & Fail-Closed Boundaries

### A. Missing or Corrupted Checkpoint Behavior
- **Absolute Fail-Closed Policy**: If the U-Net ResNet-34 segmentation checkpoint (`models/flood_segmentation/floodsight_unet_resnet34_best.pth`) is absent, zero-byte, under 300MB, or fails archive validation:
  - **Inference is Completely Blocked**: The system will **never** generate synthetic predictions, default flood masks, or heuristic ratios.
  - **HTTP Status Code**: Requests to `POST /api/analyze` return **HTTP 503 Service Unavailable**.
  - **Error Structure**:
    ```json
    {
      "error": "FLOOD_MODEL_UNAVAILABLE",
      "message": "No trained FloodSight segmentation checkpoint is installed.",
      "checkpoint_expected_path": "models/flood_segmentation/floodsight_unet_resnet34_best.pth"
    }
    ```

### B. Impact on Downstream Inference Results
1. **Mask Generation**: No segmentation raster or GeoJSON vector polygons are emitted.
2. **Flooded Area**: Physical area in hectares is strictly returned as `null` (`NOT AVAILABLE`).
3. **Coverage Fractions**: Coverage percentage is `null` (never substituted with zero or arbitrary numbers).
4. **Confidence Scores**: Mean model confidence is reported as unavailable.
5. **UI Presentation**: The Analyze workspace disables action controls and presents an amber `MODEL: OFFLINE` indicator.
