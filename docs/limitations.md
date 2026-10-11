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
