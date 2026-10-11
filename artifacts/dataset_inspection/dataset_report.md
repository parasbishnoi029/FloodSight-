# FloodSight AI — Sen1Floods11 Dataset Inspection Report (Phase 2)

**Status**: `DATASET_AVAILABLE`  
**Dataset**: Sen1Floods11 (v1.1)  
**Training Clearance**: **TRAIN_ALLOWED**  
**Timestamp**: 2026-10-09T11:17:55Z  

---

## 1. Split Sample Statistics

| Split | Chip Count | Percentage of Benchmark | Status |
| :--- | :--- | :--- | :--- |
| **Train Split** (`flood_train_data.csv`) | **252** | 58.5% | Split File Verified |
| **Validation Split** (`flood_val_data.csv`) | **89** | 20.6% | Split File Verified |
| **Held-Out Test Split** (`flood_test_data.csv`) | **90** | 20.9% | Split File Verified |
| **Total Split Chips** | **431** | 100.0% | Complete Splits |

- **Duplicate Chip IDs**: 0 duplicates detected across splits.

---

## 2. Actual TIFF Imagery & Label Verification

| Inspection Item | Observed Value | Expected Benchmark Target |
| :--- | :--- | :--- |
| **Imagery Root Directory** | `/app/applet/datasets/sen1floods11/v1.1/data/flood_events/HandLabeled` | `datasets/sen1floods11/v1.1/data/flood_events/HandLabeled` |
| **S2Hand Directory Present** | `True` | `True` |
| **LabelHand Directory Present** | `True` | `True` |
| **Missing S2 Images** | **0 / 431** | 0 missing |
| **Missing Ground Truth Labels** | **0 / 431** | 0 missing |
| **Corrupted TIFFs** | **0** | 0 corrupted |

---

## 3. Raster Dimensions, Channels & Geospatial Characteristics

| Property | Status / Inspected Value | Contract Specification |
| :--- | :--- | :--- |
| **Image Dimensions** | `[512, 512]` | `[512, 512]` |
| **Mask Dimensions** | `[512, 512]` | `[512, 512]` |
| **Image Dtype** | `int16` | `uint16` / `float32` |
| **Mask Dtype** | `int16` | `int16` |
| **Channel Count** | `13` | 13 Bands (Raw S2) / 3 Bands (RGB Model) |
| **Raw Value Range** | `[44.0, 5658.0]` | `[0, 10000+]` (Surface Reflectance DN) |
| **Mask Unique Values** | `[-1, 0, 1]` | `[-1, 0, 1]` |
| **No-Data Value** | `[-1]` | `-1` (Ignored in Loss) |
| **Invalid Pixels Count** | `2875` | Masked out during training |
| **Geospatial CRS** | `(1, 1, 0, 7, 1024, 0, 1, 2, 1025, 0, 1, 1, 2048, 0, 1, 4326, 2049, 34737, 7, 0, 2054, 0, 1, 9102, 2057, 34736, 1, 1, 2059, 34736, 1, 0)` | WGS 84 / UTM |
| **Ground Pixel Resolution** | `10.0m` | 10.0 meters / pixel |
| **Target Bands for U-Net** | `Sentinel-2 MSI 13 Bands (B1-B12)` | B4 (Red), B3 (Green), B2 (Blue) |

---

## 4. Phase 2 Training Policy & Actionable Instructions

> **CRITICAL RULE ENFORCEMENT**:
> Status: **`DATASET_AVAILABLE`**
> Decision: **`TRAIN_ALLOWED`**
> Reason: All 431 TIFF tiles and ground-truth masks present and verified.

### Dataset Placement Instructions:
1. Place raw Sentinel-2 GeoTIFF imagery in:
   `datasets/sen1floods11/v1.1/data/flood_events/HandLabeled/S2Hand/`
2. Place ground-truth flood masks in:
   `datasets/sen1floods11/v1.1/data/flood_events/HandLabeled/LabelHand/`
3. Download via GCS public bucket:
   ```bash
   gsutil -m cp -r gs://sen1floods11/v1.1/data/flood_events/HandLabeled/S2Hand datasets/sen1floods11/v1.1/data/flood_events/HandLabeled/
   gsutil -m cp -r gs://sen1floods11/v1.1/data/flood_events/HandLabeled/LabelHand datasets/sen1floods11/v1.1/data/flood_events/HandLabeled/
   ```
4. Re-run dataset inspection:
   ```bash
   python -m backend.training.inspect_dataset
   ```
