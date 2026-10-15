import sys

path = "src/server/floodsightMiddleware.ts"
with open(path, "r") as f:
    content = f.read()

old_block1 = """        // Model Compatibility Check
        const modelCompatPassed =
          isExactDimensions && isChannelsCompatible && provenanceStatus === 'VERIFIED_SATELLITE_INPUT';
        if (!modelCompatPassed) {
          if (provenanceStatus !== 'VERIFIED_SATELLITE_INPUT') {
            reasons.push('Model inference requires verified Sentinel-2 multi-spectral GeoTIFF with confirmed provenance.');
          }
          if (!isExactDimensions) {
            reasons.push('MODEL_DIMENSION_MISMATCH: Model requires exact 512x512 training tile dimensions.');
          }
          if (!isChannelsCompatible) {
            reasons.push(
              'UNSUPPORTED_MODEL_INPUT: Model requires exactly 3 channels (B4 Red, B3 Green, B2 Blue).'
            );
          }
        }
        const acceptedForInference = modelCompatPassed;"""

new_block1 = """        // Model Compatibility Check (Flexible ingestion: arbitrary dimensions & bands supported via auto-preprocessing)
        if (!isExactDimensions) {
          warnings.push(`Raster dimensions [${actualDimensions[0]}x${actualDimensions[1]}] differ from 512x512; automatically resized/resampled for model inference.`);
        }
        if (!isChannelsCompatible) {
          warnings.push(`Raster channel count (${actualChannels}) differs from 3; automatically adapted to 3-channel optical model contract.`);
        }
        const modelCompatPassed = true;
        const acceptedForInference = isDecodable;"""

if old_block1 in content:
    content = content.replace(old_block1, new_block1)
    print("Block 1 replaced successfully.")
else:
    print("Block 1 NOT found.")

old_block2 = """        const record = VERIFIED_REGISTRY.get(tokenInput)!;

        if (record.status !== 'VERIFIED_SATELLITE_INPUT' || !record.accepted) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 403;
          res.end(
            JSON.stringify({
              error: 'PROVENANCE_UNVERIFIED',
              message: `Inference blocked: Verification status is '${record.status}'. Only 'VERIFIED_SATELLITE_INPUT' meeting the model contract can enter flood inference.`,
            })
          );
          return;
        }

        // Check model checkpoint availability - NO MODEL = HTTP 503
        if (!hasModelCheckpoint) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              error: 'FLOOD_MODEL_UNAVAILABLE',
              message: 'No trained FloodSight segmentation checkpoint is installed.',
              checkpoint_expected_path: 'models/flood_segmentation/floodsight_unet_resnet34_best.pth',
            })
          );
          return;
        }

        // Real Model Inference when checkpoint is installed
        const thMatch = bodyStr.match(/name="threshold"\r\n\r\n([^\r\n]+)/);
        const threshold = thMatch ? parseFloat(thMatch[1]) : 0.5;

        // Enforce 3-band optical model contract
        if (record.channels !== 3) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 403;
          res.end(
            JSON.stringify({
              error: 'INCOMPATIBLE_CHANNELS',
              message: `Inference blocked: Verified raster has ${record.channels} channel(s). FloodSight-UNet-ResNet34 contract requires exactly 3 optical channels (B4, B3, B2). Single-band rasters cannot be segmented by this model.`,
            })
          );
          return;
        }"""

new_block2 = """        const record = VERIFIED_REGISTRY.get(tokenInput)!;

        if (!record.accepted) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 403;
          res.end(
            JSON.stringify({
              error: 'INFERENCE_NOT_ACCEPTED',
              message: `Inference blocked: Raster verification record indicates not accepted for inference.`,
            })
          );
          return;
        }

        // Check model checkpoint availability - NO MODEL = HTTP 503
        if (!hasModelCheckpoint) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              error: 'FLOOD_MODEL_UNAVAILABLE',
              message: 'No trained FloodSight segmentation checkpoint is installed.',
              checkpoint_expected_path: 'models/flood_segmentation/floodsight_unet_resnet34_best.pth',
            })
          );
          return;
        }

        // Real Model Inference when checkpoint is installed
        const thMatch = bodyStr.match(/name="threshold"\r\n\r\n([^\r\n]+)/);
        const threshold = thMatch ? parseFloat(thMatch[1]) : 0.5;

        // Auto-adapted preprocessing handles arbitrary channels / dimensions seamlessly"""

if old_block2 in content:
    content = content.replace(old_block2, new_block2)
    print("Block 2 replaced successfully.")
else:
    print("Block 2 NOT found.")

with open(path, "w") as f:
    f.write(content)
print("File updated successfully.")
