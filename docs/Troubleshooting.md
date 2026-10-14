# FloodSight AI — Diagnostic & Troubleshooting Guide

**Document ID:** `DOC-TROUBLESHOOTING-001`  
**Classification:** Operational Documentation  
**Applicable Version:** `1.0.0-sen1floods11`  
**Policy Enforcement:** Absolute Zero-Fabrication & Server-Authoritative Verification  

---

## 1. Overview & Architectural Philosophy

FloodSight AI operates under a strict **Fail-Closed Governance Model**:

> **Zero-Fabrication Principle:** When any critical dependency (satellite imagery, geospatial metadata, trained model weights, or cryptographic verification tokens) is missing, unverified, or damaged, the system **must refuse inference and report an explicit failure**. The application will never synthesize mock flood percentages, invent confidence scores, or generate plausible-looking numbers to mask an error.

This troubleshooting guide explains how to interpret standard HTTP error responses, diagnose file upload rejections, verify model checkpoint integrity, and resolve operational issues.

---

## 2. HTTP 503 Service Unavailable: `FLOOD_MODEL_UNAVAILABLE`

### 2.1 What It Means
When a client sends a request to `POST /api/analyze`, the server inspects the filesystem to ensure a genuine, validated PyTorch segmentation checkpoint is installed. If the checkpoint file is missing, zero-byte, corrupted, or an invalid stub, the gateway **strictly aborts inference** and returns an HTTP 503 response.

### 2.2 Standard Error Response Payload
```json
{
  "error": "FLOOD_MODEL_UNAVAILABLE",
  "message": "No trained FloodSight segmentation checkpoint is installed.",
  "checkpoint_expected_path": "models/flood_segmentation/floodsight_unet_resnet34_best.pth",
  "expected_size_bytes": 350205859,
  "expected_sha256": "7b8d9e0b2a8e9db2162732a0632cb8a5f4b35b8a1777afca8880798869e4d436",
  "action_required": "Obtain and install the official trained FloodSight checkpoint before running inference."
}
```

### 2.3 Identifying the Issue in the User Interface
1. **Global Health Indicator (Navigation Bar):** The top navbar displays `MODEL: OFFLINE` with an amber warning badge.
2. **Dashboard Overview:** The Model Availability card shows `CHECKPOINT MISSING` with a warning banner explaining that Phase 2 ML training/checkpoint installation has not occurred.
3. **Analyze Workspace:** The **Run Segmentation Inference** button is disabled, and an informative diagnostic panel states:
   > *"Trained segmentation checkpoint is currently absent (`floodsight_unet_resnet34_best.pth`). Simulated or hardcoded predictions are strictly forbidden. Running inference will fail-closed with HTTP 503 until the model checkpoint is restored."*

### 2.4 Diagnostic Steps
Run a health probe against the gateway:
```bash
curl -s http://localhost:3000/api/health | jq .
```

**Expected Response when Checkpoint is Absent:**
```json
{
  "status": "degraded",
  "service": "FloodSight Verification & Inference Gateway",
  "version": "1.0.0-sen1floods11",
  "model_available": false,
  "checkpoint_path": null
}
```

### 2.5 Resolution Procedure
1. Verify whether the checkpoint file exists in the expected directory:
   ```bash
   ls -lh models/flood_segmentation/floodsight_unet_resnet34_best.pth
   ```
2. If missing, download the genuine model checkpoint using the documented retrieval script:
   ```bash
   python3 scripts/download_drive_file.py 1a2L1ojE_nOj6uz47qKpCd_TSjnwZ30O2 models/flood_segmentation/floodsight_unet_resnet34_best.pth
   ```
3. Restart or re-probe the server. Once the file is present, `GET /api/health` will return `"model_available": true`.

---

## 3. Checkpoint Hash & File Integrity Mismatches

### 3.1 What It Means
Even if a file exists at `models/flood_segmentation/floodsight_unet_resnet34_best.pth`, the gateway verifies that the file is an authentic PyTorch binary checkpoint matching the official manifest. If the file is a partial download, corrupted archive, or placeholder, inference remains locked.

### 3.2 The Google Drive "Virus Scan Warning" Trap
A frequent source of corrupted checkpoints occurs when downloading large files (>100 MB) from Google Drive using standard `curl` or `wget` without handling Google's large-file confirmation cookie.
- **Symptom:** The downloaded file is only **2,481 bytes** in size.
- **Cause:** The saved file contains Google's HTML page (`Google Drive can't scan this file for viruses...`) instead of the actual 334 MB model weights.
- **Server Reaction:** The server inspects the first 4 bytes. If the zip magic header (`PK\x03\x04` or `0x50 0x4B 0x03 0x04`) is missing or size is under 300 MB, the server marks `model_available: false`.

### 3.3 Validating Checkpoint Integrity
Run the authoritative verification script:
```bash
python3 scripts/verify_checkpoint.py
```

Or manually verify the cryptographic SHA-256 hash against `models/flood_segmentation/model_manifest.json`:
```bash
sha256sum models/flood_segmentation/floodsight_unet_resnet34_best.pth
```

**Authoritative Checkpoint Signature:**
- **Filename:** `floodsight_unet_resnet34_best.pth`
- **Expected Byte Size:** `350,205,859 bytes` (~334.0 MB)
- **Expected SHA-256:** `7b8d9e0b2a8e9db2162732a0632cb8a5f4b35b8a1777afca8880798869e4d436`
- **Internal Structure:** Valid PyTorch zip container with 734 entries, containing `epoch: 38`, `val_iou: 0.6080`, and 290 tensor layers.

---

## 4. File Upload Rejections (`POST /api/verify-image`)

Before any raster can be analyzed, it must pass the server-side verification gate. Rejections are categorized below:

### 4.1 HTTP 415: Unsupported Media Type
- **Error Condition:** The uploaded file is not a supported raster format, or the upload was submitted without `multipart/form-data`.
- **Accepted Formats:** GeoTIFF (`.tif`, `.tiff`), PNG (`.png`), JPEG (`.jpg`, `.jpeg`).
- **Standard Response:**
  ```json
  {
    "error": "UNSUPPORTED_MEDIA_TYPE",
    "message": "Only GeoTIFF (.tif/.tiff), PNG, or JPEG raster formats are supported."
  }
  ```
- **Resolution:** Ensure the raster is exported as a standard GeoTIFF with uncompressed or LZW/DEFLATE compression.

### 4.2 HTTP 400 / Rejection: Dimensionality Mismatch
- **Contract Requirement:** The FloodSight U-Net ResNet-34 model contract expects square input tiles of exactly **$512 \times 512$ pixels**.
- **Rejection Reason in Response:**
  ```json
  {
    "status": "REJECTED",
    "reasons": [
      "Image dimensions [1024, 768] do not match model contract [512, 512]."
    ]
  }
  ```
- **Resolution:** Chip or tile the input raster to $512 \times 512$ using GDAL or GIS software:
  ```bash
  gdal_translate -srcwin 0 0 512 512 input_scene.tif chip_512x512.tif
  ```

### 4.3 HTTP 400 / Rejection: Channel Count Mismatch
- **Contract Requirement:** Exactly **3 spectral optical channels** in the order:
  1. Band 1: **B4 (Red, ~665 nm)**
  2. Band 2: **B3 (Green, ~560 nm)**
  3. Band 3: **B2 (Blue, ~490 nm)**
- **Rejection Reason in Response:**
  ```json
  {
    "status": "REJECTED",
    "reasons": [
      "Image has 1 channel(s); model contract requires exactly 3 channels (B4/B3/B2)."
    ]
  }
  ```
- **Resolution:** For full 13-band Sentinel-2 Level-1C/2A products, extract bands B4, B3, and B2 into a 3-band composite GeoTIFF:
  ```bash
  gdal_merge.py -separate -o s2_rgb_chip.tif B04.jp2 B03.jp2 B02.jp2
  ```

### 4.4 Non-Geospatial or Arbitrary Photo Warning
- **Condition:** The file is decodable as an RGB raster, but lacks GeoTIFF ModelTiepointTag (33922), ModelPixelScaleTag (33550), or CRS projection metadata.
- **Verification Verdict:** `SUPPORTED_BUT_UNVERIFIED`
- **Operational Impact:**
  - The image can proceed to analysis if the model is installed, but the **Physical Inundation Area (hectares)** calculation will return `null`.
  - The UI will explicitly display: `GEOSPATIAL METADATA UNAVAILABLE`.
  - Area will never be guessed from pixel counts alone.

---

## 5. Token Authorization Failures (`POST /api/analyze`)

The inference endpoint cannot be called directly with arbitrary files; it requires a valid, server-issued verification token.

### 5.1 HTTP 403: `VERIFICATION_REQUIRED`
- **Cause:** The `verification_id` form field was missing, malformed, or not found in the active server registry.
- **Resolution:** Always submit the file to `POST /api/verify-image` first, obtain `verification_id`, and pass it alongside the file to `POST /api/analyze`.

### 5.2 HTTP 403: `PROVENANCE_UNVERIFIED`
- **Cause:** The raster was submitted to verification, but received a `REJECTED` status due to incompatible dimensions, channels, or corrupt bytes.
- **Message:**
  ```json
  {
    "error": "PROVENANCE_UNVERIFIED",
    "message": "Inference blocked: Verification status is 'REJECTED'. Only 'VERIFIED_SATELLITE_INPUT' meeting the model contract can enter flood inference."
  }
  ```
- **Resolution:** Resolve the data contract issues listed in the `reasons` array of the verification response.

### 5.3 Token Lifecycle & Server Restarts
- **In-Memory Registry:** Verification tokens are issued with a **1-hour Time-to-Live (TTL)**.
- If the development server is restarted, all existing in-memory tokens are invalidated.
- **Resolution:** Re-upload the file in the Analyze workspace to generate a fresh verification token.

---

## 6. HTTP 422: `RASTER_DECODE_FAILED`

### 6.1 What It Means
The file header declared a valid GeoTIFF structure, but the internal raster strip data was truncated, incomplete, or unreadable.

### 6.2 Zero-Fabrication Rule
Earlier mock versions of the software used synthetic contrast ratios or default 28% coverage when strip decoding failed. Under current hardened governance:
- **No synthetic fallbacks are permitted.**
- The gateway returns HTTP 422:
  ```json
  {
    "error": "RASTER_DECODE_FAILED",
    "message": "Failed to decode raster strip data from input GeoTIFF. Synthetic or fallback predictions are strictly disallowed under the Zero-Fabrication policy."
  }
  ```
- **Resolution:** Verify file integrity and ensure the upload was not interrupted mid-transfer.

---

## 7. Diagnostic Quick-Reference Matrix

| HTTP Code | Error Key | Primary Cause | User-Facing Action |
| :---: | :--- | :--- | :--- |
| **503** | `FLOOD_MODEL_UNAVAILABLE` | Checkpoint file missing, size < 300MB, or not installed | Download checkpoint via `scripts/download_drive_file.py` |
| **415** | `UNSUPPORTED_MEDIA_TYPE` | Non-raster file format or invalid Content-Type | Upload GeoTIFF (`.tif`), PNG, or JPEG raster |
| **400** | `REJECTED` (Dimensions) | Raster is not $512 \times 512$ pixels | Crop/tile image to $512 \times 512$ |
| **400** | `REJECTED` (Channels) | Channel count is not 3 (e.g., 1-band SAR or 4-band RGBA) | Composite optical bands B4 (Red), B3 (Green), B2 (Blue) |
| **403** | `VERIFICATION_REQUIRED` | Direct call to `/api/analyze` without verification token | Pass file through `/api/verify-image` first |
| **403** | `PROVENANCE_UNVERIFIED` | Attempting inference on a rejected verification token | Review verification reasons and fix input raster |
| **422** | `RASTER_DECODE_FAILED` | Truncated raster buffer or damaged GeoTIFF strips | Re-export raster without corrupted strip offsets |
| **200** | Area shows `null` | Unreferenced image lacking GeoTIFF affine tags | Expected behavior: unreferenced images cannot compute hectares |

---

## 8. Verification Checklist for System Operators

Before deploying FloodSight AI in an operational disaster-response setting, verify:

- [ ] **Gateway Health:** `curl -s http://localhost:3000/api/health` returns status `200` and `model_available: true`.
- [ ] **Checkpoint SHA-256:** `python3 scripts/verify_checkpoint.py` outputs `ALL CHECKPOINT INTEGRITY CHECKS PASSED`.
- [ ] **Test Split State:** Held-out test evaluation displays `NOT_VERIFIED` / `NOT_RUN` (truthful reporting; no synthetic metrics).
- [ ] **Georeferenced Hectarage:** Sample GeoTIFF with UTM or Geodetic CRS computes genuine physical area in hectares.
- [ ] **Fail-Closed Verification:** Corrupt or non-512x512 images are strictly rejected before inference.
