# Sen1Floods11 Dataset — Storage & Download Protocol

## Dataset Overview
- **Dataset Name**: Sen1Floods11 (A Georeferenced Dataset for Training and Testing Deep Learning Methods for Flood Detection on Sentinel-1 and Sentinel-2 Imagery)
- **Authors**: Cloud to Street & NASA Earth Exchange (Bonafilia et al., CVPRW EarthVision 2020)
- **Official Repository**: https://github.com/cloudtostreet/Sen1Floods11
- **License**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
- **Spatial Resolution**: 10 meters Ground Sampling Distance (GSD)
- **Sensor Modality**:
  - Optical: Sentinel-2 Multi-Spectral Instrument (MSI) Level-1C / Level-2A
  - Radar: Sentinel-1 Synthetic Aperture Radar (SAR) C-Band Ground Range Detected (GRD) Dual-Pol (VV + VH)

---

## Directory Structure
```
datasets/
└── sen1floods11/
    ├── v1.1/
    │   ├── data/
    │   │   ├── flood_events/
    │   │   │   └── HandLabeled/
    │   │   │       ├── S2Hand/              # Sentinel-2 Optical GeoTIFFs (13 bands or RGB/NIR)
    │   │   │       ├── S1Hand/              # Sentinel-1 SAR GeoTIFFs (VV/VH bands)
    │   │   │       └── LabelHand/           # Ground truth raster masks (0: Land, 1: Water, -1: Permanent/Invalid)
    │   │   └── splits/
    │   │       └── flood_handlabeled/
    │   │           ├── flood_train_data.csv
    │   │           ├── flood_val_data.csv
    │   │           └── flood_test_data.csv
    └── README.md
```

---

## Download & Acquisition Procedure

Run the automated download and inspection script:
```bash
python backend/training/prepare_dataset.py --download-handlabeled
```

Or manually obtain the official tarball:
```bash
# S2 Optical hand-labeled chips (~250 MB)
wget https://storage.googleapis.com/sen1floods11/v1.1/data/flood_events/HandLabeled/S2Hand.tar.gz
# Ground truth masks (~5 MB)
wget https://storage.googleapis.com/sen1floods11/v1.1/data/flood_events/HandLabeled/LabelHand.tar.gz
# Benchmark splits
wget https://storage.googleapis.com/sen1floods11/v1.1/splits/flood_handlabeled/flood_train_data.csv
wget https://storage.googleapis.com/sen1floods11/v1.1/splits/flood_handlabeled/flood_val_data.csv
wget https://storage.googleapis.com/sen1floods11/v1.1/splits/flood_handlabeled/flood_test_data.csv
```

---

## Label Class Definitions & Nodata Handling
- **`0`**: Non-flooded Land / Background.
- **`1`**: Flooded Surface / Inundated Water.
- **`-1`**: Permanent Water Body / Clouds / Nodata (Strictly ignored in loss computation via mask filtering).
