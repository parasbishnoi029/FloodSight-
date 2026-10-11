# FloodSight AI — Model Architecture Selection & Training Strategy

## 1. Candidate Model Architecture Evaluation

| Architecture | Backbone / Encoder | Parameter Count | GPU / CPU Feasibility | Inference Latency (512×512) | Flood IoU Benchmark | Recommended? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **U-Net + ResNet34 Encoder** | **ResNet-34 (Pretrained ImageNet)** | **~24.4 M** | **HIGH**: Feasible on modest GPU (T4/V100) or Colab in <30 min; CPU inference in ~45ms. | **~45 ms** | **~0.78–0.84 IoU** | **YES (Recommended)** |
| **SegFormer (B0 / B1)** | Mix Transformer (MiT-B0) | ~3.7 M | **HIGH**: Lightweight, but requires specialized HuggingFace Vision transformer setup. | ~60 ms | ~0.76–0.82 IoU | Alternative |
| **DeepLabV3+** | ResNet-50 / MobileNetV2 | ~40.0 M | **MEDIUM**: Higher memory footprint; ASPP layer can over-smooth narrow flood channels and ditches. | ~95 ms | ~0.79–0.83 IoU | Alternative |
| **Custom Vanilla U-Net** | None (Trained from scratch) | ~31.0 M | **MEDIUM**: Requires significantly larger dataset or longer convergence without pretrained transfer learning. | ~50 ms | ~0.65–0.72 IoU | Not Recommended |

---

## 2. Selected Architecture: U-Net with Pretrained ResNet-34 Encoder

### Why This Architecture?
1. **Multi-Scale Skip Connections**: U-Net's encoder-decoder skip connections retain sharp spatial high-frequency details (narrow irrigation canals, road ditches, shoreline contours) that dilated convolutions (DeepLab) often smooth out.
2. **Transfer Learning Efficiency**: Pretrained ResNet-34 encoder weights provide robust edge, texture, and spectral gradient feature extractors out of the box, requiring far fewer training epochs on satellite imagery.
3. **Inference Latency & CPU Feasibility**: At 24.4M parameters, the PyTorch model footprint is ~95 MB. When exported to TorchScript / ONNX, it evaluates a 512×512 satellite tile in ~45 ms on CPU, making it perfectly suited for FastAPI cloud deployment without requiring expensive 24/7 GPU instances.
4. **Reproducibility**: Standardized, clean PyTorch implementation with zero esoteric dependencies.

---

## 3. Training & Loss Specification

- **Input Dimension**: $3 \times 512 \times 512$ (Optical RGB / Sentinel-2 B4, B3, B2 or False-Color NIR-Red-Green B8-B4-B3).
- **Output Mask**: $1 \times 512 \times 512$ binary probability map ($p \in [0, 1]$), thresholded at $\tau = 0.50$ (configurable).
- **Loss Function**: **Compound BCE + Dice Loss**:
  $$\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{BCE}} + \mathcal{L}_{\text{Dice}} = -\frac{1}{N}\sum (y \log \hat{y} + (1-y)\log(1-\hat{y})) + \left(1 - \frac{2 |Y \cap \hat{Y}| + \epsilon}{|Y| + |\hat{Y}| + \epsilon}\right)$$
  - *Why Compound Loss?* Flood pixels frequently occupy $<10\%$ of a satellite scene (severe class imbalance). BCE provides smooth gradient descent at early stages, while Dice Loss directly optimizes the overlap metric without bias toward the dominant background landmass.
- **Optimizer**: AdamW ($\beta_1 = 0.9, \beta_2 = 0.999$, weight decay $= 10^{-4}$).
- **Learning Rate Strategy**: Cosine Annealing with Warm Restarts ($\text{lr}_{\text{initial}} = 3 \times 10^{-4}, \text{lr}_{\text{min}} = 10^{-6}$).
- **Augmentation Pipeline**: Geographically valid transformations only:
  - Random Horizontal & Vertical Flips ($p = 0.5$)
  - Random Orthogonal Rotations ($90^\circ, 180^\circ, 270^\circ$, $p = 0.5$)
  - Mild Color Jitter (Brightness $\pm 10\%$, Contrast $\pm 10\%$) to simulate sun angle and atmospheric haze variations.
  - *Forbidden*: Extreme shearing, elastic distortions, or non-affine warping that alters geospatial linear infrastructure.
- **Evaluation Metrics (Strictly Calculated)**:
  - $\text{IoU} = \frac{\text{TP}}{\text{TP} + \text{FP} + \text{FN}}$
  - $\text{Dice / F1} = \frac{2\text{TP}}{2\text{TP} + \text{FP} + \text{FN}}$
  - $\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}$
  - $\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}$
  - Mean Inference Latency (ms)
