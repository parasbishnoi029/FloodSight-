# FloodSight AI — Model Card: FloodSight-UNet-ResNet34 (v1.0.0)

**Document ID:** `MC-UNET-RESNET34-001`  
**Classification:** Official Machine Learning Model Specification  
**Architecture:** U-Net with Pretrained ResNet-34 Backbone  
**Target Modality:** Multi-Spectral Optical Satellite Imagery (Sentinel-2 MSI)  
**Governance Standard:** Absolute Zero-Fabrication Policy & Fail-Closed Processing  

---

## 1. Model Overview & Architecture

- **Model Identifier:** `FloodSight-UNet-ResNet34`
- **Model Version:** `1.0.0`
- **Task:** Pixel-level binary flood water inundation segmentation.
- **Architecture Specification:**
  - **Encoder Backbone:** Deep Residual Network (ResNet-34) with ImageNet initialization (34 weighted convolutional layers across 4 residual stages).
  - **Decoder:** 4-stage multi-scale bilinear upsampling decoder with identity skip connections from corresponding encoder activation maps (`dec4` through `dec1`).
  - **Bottleneck:** Double convolutional block with $3 \times 3$ kernel, batch normalization, and ReLU activations (512 feature channels).
  - **Head:** Final $3 \times 3$ convolution reducing feature maps to 1 output logit channel, followed by Sigmoid activation for binary positive-class probability $p \in [0, 1]$.
- **Parameter Count:** 24,428,737 trainable parameters (290 layer state dict keys).
- **Target Platform:** PyTorch 1.13+ (CPU / CUDA compatible).

---

## 2. Checkpoint State & Verification Lifecycle

### 2.1 Authoritative Checkpoint Signature
- **Checkpoint Relative Path:** `models/flood_segmentation/floodsight_unet_resnet34_best.pth`
- **Exact Byte Length:** `350,205,859 bytes` (~334.0 MB)
- **Cryptographic Hash (SHA-256):** `7b8d9e0b2a8e9db2162732a0632cb8a5f4b35b8a1777afca8880798869e4d436`
- **Container Format:** PyTorch Zip Archive (734 internal records with `data.pkl` and persistent tensor stores).
- **Manifest Reference:** Formally indexed in `models/flood_segmentation/model_manifest.json`.

### 2.2 Model Training State (Sen1Floods11 Hand-Labeled Partitions)
The checkpoint represents the best validated state from supervised training on the Sen1Floods11 dataset:
- **Dataset Version:** Sen1Floods11 v1.1 Hand-Labeled Partition.
- **Input Bands:** Sentinel-2 MSI Optical Bands B4 (Red), B3 (Green), B2 (Blue).
- **Native Resolution:** 10.0 meters Ground Sampling Distance (GSD).
- **Optimization Strategy:** AdamW optimizer ($\text{lr} = 3 \times 10^{-4}$), batch size 8.
- **Compound Loss Function:** $0.5 \times \text{BCE} + 0.5 \times \text{Dice Loss}$.
- **Best Validation Epoch:** **Epoch 38**
  - **Validation IoU (Jaccard Index):** **0.6080** ($60.80\%$)
  - **Validation Dice / F1 Score:** **0.7562** ($75.62\%$)
  - **Validation Precision:** **0.6945** ($69.45\%$)
  - **Validation Recall:** **0.8300** ($83.00\%$)
  - **Validation Pixel Accuracy:** **0.9410** ($94.10\%$)

### 2.3 Held-Out Test Set Evaluation State
In accordance with the **Phase 2 Completion Gate** and **Zero-Fabrication Policy**:
- **Status:** **`NOT_VERIFIED` / `NOT_RUN`**
- **Test Set Specification:** 90 locked chips (`flood_test_data.csv`).
- **Policy Enforcement:** Held-out test evaluation has not executed in this deployment environment because full test set rasters are held off-node. Numerical test metrics are strictly recorded as `null` (not zero, not fabricated).

---

## 3. Application Behavior When Checkpoint Is Missing or Invalid

FloodSight AI enforces a **fail-closed architecture**. The application explicitly distinguishes between file presence, file validity, and model readiness.

```
                  POST /api/analyze (Incoming Request)
                                 │
                                 ▼
                     Verification Token Valid?
                                 │
                        YES ─────┴───── NO ──► HTTP 403 FORBIDDEN
                                 │
                                 ▼
                   Checkpoint Present on Filesystem?
                     (models/flood_segmentation/*.pth)
                                 │
                        YES ─────┴───── NO ──► HTTP 503 SERVICE UNAVAILABLE
                                 │             (FLOOD_MODEL_UNAVAILABLE)
                                 ▼
                    File Size >= 300MB & Valid
                   PyTorch Zip Header (PK\x03\x04)?
                                 │
                        YES ─────┴───── NO ──► HTTP 503 SERVICE UNAVAILABLE
                                 │             (INVALID_OR_CORRUPT_CHECKPOINT)
                                 ▼
                      Execute Model Inference
                     (Zero Synthetic Fallbacks)
```

### 3.1 Scenario A: Checkpoint File Missing
- **Trigger:** `models/flood_segmentation/floodsight_unet_resnet34_best.pth` does not exist.
- **HTTP Response Code:** `503 Service Unavailable`
- **JSON Error Payload:**
  ```json
  {
    "error": "FLOOD_MODEL_UNAVAILABLE",
    "message": "No trained FloodSight segmentation checkpoint is installed.",
    "checkpoint_expected_path": "models/flood_segmentation/floodsight_unet_resnet34_best.pth",
    "expected_size_bytes": 350205859,
    "expected_sha256": "7b8d9e0b2a8e9db2162732a0632cb8a5f4b35b8a1777afca8880798869e4d436",
    "action_required": "Deploy genuine model checkpoint before requesting inference."
  }
  ```

### 3.2 Scenario B: Checkpoint File Invalid or Corrupted
- **Trigger:** Checkpoint file exists but fails size verification ($< 300\text{ MB}$), fails SHA-256 integrity, or contains non-binary contents (such as Google Drive virus-scan warning HTML).
- **HTTP Response Code:** `503 Service Unavailable`
- **JSON Error Payload:**
  ```json
  {
    "error": "FLOOD_MODEL_UNAVAILABLE",
    "message": "Installed checkpoint file failed integrity verification (invalid archive structure or size mismatch).",
    "checkpoint_expected_path": "models/flood_segmentation/floodsight_unet_resnet34_best.pth"
  }
  ```

### 3.3 Gateway Health Endpoint Reporting (`GET /api/health`)
When the checkpoint is missing or invalid:
```json
{
  "status": "degraded",
  "service": "FloodSight Verification & Inference Gateway",
  "version": "1.0.0-sen1floods11",
  "model_available": false,
  "checkpoint_path": null
}
```

---

## 4. Impact on User Interface & Inference Results

When the U-Net model is unavailable, the application strictly adheres to the following behavioral guarantees:

### 4.1 Impact on Inference Results
1. **Zero Predicted Masks:** No binary water masks, segmentation overlays, or GeoJSON polygons are produced.
2. **Zero Coverage Percentages:** The system will **never** substitute default or estimated percentages (e.g., hardcoded 28% coverage).
3. **Zero Inundation Hectarage:** Flooded area in hectares is strictly reported as `null` (`NOT AVAILABLE`).
4. **Zero Simulated Confidence:** No synthetic confidence scores (e.g., 85%) are generated.
5. **No AI Hallucinations:** Generative reporting engines (Incident Briefs) receive a structured `UNAVAILABLE` flag and will not synthesize damage statistics.

### 4.2 Impact on User Experience & UI Indicators
1. **Top Navigation Bar:**
   - Status badge displays `MODEL: OFFLINE` with an amber indicator dot.
2. **Dashboard Overview:**
   - Model Status card displays `CHECKPOINT MISSING`.
   - Metric summary cards display `NOT RUN` with amber badges instead of synthetic numbers.
3. **Analyze Workspace:**
   - The **Analyze** action button is completely disabled.
   - A prominent warning banner is displayed:
     > *"Trained segmentation checkpoint is currently absent (`floodsight_unet_resnet34_best.pth`). Simulated or hardcoded predictions are strictly forbidden. Running inference will fail-closed with HTTP 503 until Phase 2 model training is executed."*
4. **Map View:**
   - Model prediction layers are unavailable. Only raw base satellite imagery and verified weather radar tiles are shown.

---

## 5. Model Input Contract & Preprocessing

When the model is operational, incoming imagery must strictly satisfy the versioned input contract:

- **Modality:** Sentinel-2 MSI Multi-Spectral Instrument (Level-1C or Level-2A).
- **Channels:** Exactly 3 channels in RGB order:
  - Band 4 (Red, $\lambda \approx 665\text{ nm}$)
  - Band 3 (Green, $\lambda \approx 560\text{ nm}$)
  - Band 2 (Blue, $\lambda \approx 490\text{ nm}$)
- **Tile Dimensions:** Exactly $512 \times 512$ pixels.
- **Data Type:** Float32 tensor with shape `(1, 3, 512, 512)`.
- **Scaling:** Raw Digital Numbers scaled by $\text{DN} / 10000.0$ and clipped to $[0.0, 1.0]$.
- **Normalization Parameters:**
  - Mean ($\mu$): `[0.158, 0.164, 0.151]`
  - Standard Deviation ($\sigma$): `[0.132, 0.128, 0.134]`
- **Operating Threshold ($\tau$):** Default $\tau = 0.50$ (configurable in $[0.10, 0.90]$).

---

## 6. Checkpoint Restoration Procedure

To restore the operational state of the U-Net model:

1. **Automated Download Script:**
   ```bash
   python3 scripts/download_drive_file.py 1a2L1ojE_nOj6uz47qKpCd_TSjnwZ30O2 models/flood_segmentation/floodsight_unet_resnet34_best.pth
   ```
2. **Integrity Verification:**
   ```bash
   python3 scripts/verify_checkpoint.py
   ```
3. **Gateway Verification:**
   ```bash
   curl -s http://localhost:3000/api/health | jq .model_available
   # Expected output: true
   ```
