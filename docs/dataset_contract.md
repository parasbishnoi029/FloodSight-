# FloodSight AI — Dataset Contract

## 1. Input Modality & Sensor
- **Dataset**: Sen1Floods11 (v1.1 Hand-Labeled Benchmark)
- **Sensor**: Sentinel-2 Multi-Spectral Instrument (MSI) Level-1C / Level-2A Top/Bottom-of-Atmosphere.
- **Physical Resolution**: 10.0 meters per pixel (Ground Sampling Distance).
- **Extracted Model Channels**: 3-channel True-Color Optical RGB:
  - Band 4: Red (665 nm)
  - Band 3: Green (560 nm)
  - Band 2: Blue (490 nm)

## 2. Dimensions & Data Types
- **Array Shape**: $(3, 512, 512)$ float32 tensor (channels-first for PyTorch).
- **Source Dtype**: Raw `int16` Digital Numbers (DN) $\in [0, 10000+]$.
- **Normalization Formula**:
  $$\tilde{x} = \text{clip}\left(\frac{\text{DN}}{10000.0}, 0.0, 1.0\right)$$
  $$x_{\text{normalized}} = \frac{\tilde{x} - \mu}{\sigma}$$
  - $\mu = [0.158, 0.164, 0.151]$
  - $\sigma = [0.132, 0.128, 0.134]$

## 3. Label Taxonomy & NoData Handling
- **Class 0**: Non-flooded land / background.
- **Class 1**: Flooded water / inundation surface.
- **Class -1**: Permanent water body / clouds / no-data.
- **NoData Rule**: Pixels with value `-1` are **strictly masked out** of the loss calculation via a valid mask boolean filter `(target >= 0)`. They do not contribute to gradient updates.

## 4. Benchmark Partitioning
- **Training Set**: 252 chips (Official hand-labeled `flood_train_data.csv`)
- **Validation Set**: 89 chips (Official hand-labeled `flood_valid_data.csv`)
- **Test Set**: 90 chips (Official hand-labeled `flood_test_data.csv`)
- **Locked Test Rule**: Hyperparameters and decision thresholds ($\tau$) are optimized exclusively on the validation set. The test set is evaluated exactly once for final reporting.
