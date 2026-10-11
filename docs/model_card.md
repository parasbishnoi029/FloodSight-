# FloodSight AI — Model Card: FloodSight-UNet-ResNet34 (v1.0.0)

## 1. Model Overview
- **Model Name**: FloodSight-UNet-ResNet34
- **Model Version**: `1.0.0`
- **Architecture**: U-Net with ResNet-34 Encoder Backbone and Multi-Scale Bilinear Skip Decoders
- **Task**: Pixel-Level Binary Flood Water Inundation Segmentation
- **Model Checkpoint**: `models/flood_segmentation/floodsight_unet_resnet34_best.pth`
- **Trained Parameters**: 24.4 Million

---

## 2. Dataset & Benchmark Modality
- **Benchmark Dataset**: Sen1Floods11 (v1.1 Hand-Labeled Partition)
- **Sensor**: Sentinel-2 Multi-Spectral Instrument (MSI) Level-1C / Level-2A
- **Input Channels**: 3 Optical Bands (Band 4 Red, Band 3 Green, Band 2 Blue)
- **Physical Ground Sampling Distance (GSD)**: 10.0 meters per pixel
- **Dataset Partitioning**:
  - **Train Split**: 252 Hand-Labeled Chips (`flood_train_data.csv`)
  - **Validation Split**: 89 Hand-Labeled Chips (`flood_val_data.csv`)
  - **Held-Out Locked Test Split**: 90 Hand-Labeled Chips (`flood_test_data.csv`)

---

## 3. Quantitative Test Metrics (Locked Test Set)

*Note: In accordance with zero-fabrication governance, evaluation metrics are generated strictly from executing checkpoints on verified datasets. Since training has not yet completed, metrics are reported honestly as NOT RUN.*

| Metric | Measured Value | Description |
| :--- | :--- | :--- |
| **Flood IoU (Intersection over Union)** | **NOT RUN** | Overlap between predicted flood surface and expert label |
| **Flood Dice / F1 Score** | **NOT RUN** | Harmonic mean of precision and recall |
| **Flood Precision** | **NOT RUN** | True flood pixels / Total predicted flood pixels |
| **Flood Recall** | **NOT RUN** | True flood pixels / Total actual ground-truth flood pixels |
| **Pixel Accuracy** | **NOT RUN** | Overall percentage of correctly classified valid pixels |
| **Inference Latency** | **NOT RUN** | Single $512 \times 512$ tile measured dynamically at runtime |

---

## 4. Input Contract & Preprocessing
- **Dimensions**: $512 \times 512$ pixels (Channels-First `(3, 512, 512)`)
- **Digital Number Scaling**: $\text{DN} / 10000.0$ clipped to $[0.0, 1.0]$
- **Normalization Mean**: $\mu = [0.158, 0.164, 0.151]$
- **Normalization Std**: $\sigma = [0.132, 0.128, 0.134]$
- **NoData Rule**: Label `-1` (permanent water bodies, cloud occlusions) is strictly masked out from loss computation and evaluation.

---

## 5. Limitations & Operational Guidelines
1. **Cloud & Shadow Occlusion**: Optical Sentinel-2 imagery cannot penetrate dense storm cloud cover. For heavy cloud events, SAR (Sentinel-1 C-band) is required.
2. **Narrow Urban Infrastructure**: With 10m ground resolution, narrow residential alleyways ($<5\text{m}$) cannot be resolved. Infrastructure models (e.g. SpaceNet 8) are recommended for sub-meter road networks.
3. **Physical Hectarage**: Physical area is strictly computed when valid GeoTIFF affine transform matrices are present. If unreferenced images are provided, hectarage is marked unavailable.
