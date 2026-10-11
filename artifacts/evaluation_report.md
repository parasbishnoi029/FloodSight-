# FloodSight AI — Model Evaluation Report

**Model**: FloodSight-UNet-ResNet34 (v1.0.0)  
**Dataset**: Sen1Floods11 Sentinel-2 Optical (Held-Out Test Set)  
**Hardware Evaluated**: cuda  

---

## 1. Primary Segmentation Metrics (Threshold $\tau = 0.50$)

| Metric | Measured Test Value | Description |
| :--- | :--- | :--- |
| **Flood IoU (Intersection over Union)** | **0.6176** | Overlap between predicted flood surface and expert label |
| **Flood Dice / F1 Score** | **0.7636** | Harmonic mean of precision and recall |
| **Precision** | **0.7621** | True flood pixels / Total predicted flood pixels |
| **Recall** | **0.7651** | True flood pixels / Total actual ground-truth flood pixels |
| **Pixel Accuracy** | **0.9408** | Overall percentage of correctly classified valid pixels |

---

## 2. Real Inference Latency ($512 \times 512$ tile)

- **Mean Latency**: **6.09 ms**
- **Median Latency**: **5.68 ms**
- **Hardware Architecture**: CUDA
