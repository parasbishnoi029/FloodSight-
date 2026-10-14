#!/usr/bin/env python3
"""
FloodSight AI — Model Checkpoint Verification Script
Validates the cryptographic integrity, byte size, archive structure, and metadata
of the trained PyTorch segmentation checkpoint against model_manifest.json.
"""

import hashlib
import json
import os
import sys
import zipfile

MANIFEST_PATH = "models/flood_segmentation/model_manifest.json"
CHECKPOINT_PATH = "models/flood_segmentation/floodsight_unet_resnet34_best.pth"

def main():
    print("=================================================================")
    print(" FloodSight AI — Model Checkpoint Verification")
    print("=================================================================")

    if not os.path.exists(MANIFEST_PATH):
        print(f"[-] FAILED: Manifest not found at {MANIFEST_PATH}")
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    expected_filename = manifest.get("checkpoint_filename", "floodsight_unet_resnet34_best.pth")
    expected_sha256 = manifest.get("checkpoint_sha256", "")
    expected_size = manifest.get("checkpoint_size_bytes", 0)

    checkpoint_file = os.path.join(os.path.dirname(MANIFEST_PATH), expected_filename)
    if not os.path.exists(checkpoint_file):
        print(f"[-] FAILED: Checkpoint file not found: {checkpoint_file}")
        print("    Run: python3 scripts/download_drive_file.py 1a2L1ojE_nOj6uz47qKpCd_TSjnwZ30O2 " + checkpoint_file)
        sys.exit(1)

    actual_size = os.path.getsize(checkpoint_file)
    print(f"[+] Found Checkpoint: {checkpoint_file}")
    print(f"    Size: {actual_size:,} bytes ({actual_size / (1024*1024):.2f} MB)")

    if actual_size != expected_size:
        print(f"[-] SIZE MISMATCH: Expected {expected_size:,} bytes, got {actual_size:,} bytes")
        sys.exit(1)
    else:
        print(f"[+] Size matches manifest: {expected_size:,} bytes")

    print("[*] Computing SHA-256 hash (this may take a few seconds)...")
    sha256_hash = hashlib.sha256()
    with open(checkpoint_file, "rb") as f:
        for byte_block in iter(lambda: f.read(4096 * 1024), b""):
            sha256_hash.update(byte_block)
    actual_sha256 = sha256_hash.hexdigest()

    print(f"    Actual SHA-256:   {actual_sha256}")
    print(f"    Expected SHA-256: {expected_sha256}")

    if actual_sha256.lower() != expected_sha256.lower():
        print("[-] HASH MISMATCH: SHA-256 does not match manifest.")
        sys.exit(1)
    else:
        print("[+] SHA-256 cryptographic signature verified successfully.")

    print("[*] Inspecting PyTorch zip container...")
    try:
        with zipfile.ZipFile(checkpoint_file, "r") as z:
            entries = z.namelist()
            print(f"[+] Valid zip container detected with {len(entries)} entries.")
            data_pkl = any("data.pkl" in e for e in entries)
            if not data_pkl:
                print("[-] WARNING: data.pkl not found in zip archive.")
                sys.exit(1)
            print("[+] PyTorch serialization structure verified (data.pkl present).")
    except Exception as e:
        print(f"[-] FAILED to open as valid zip container: {e}")
        sys.exit(1)

    print("\n[+] SUCCESS: Model checkpoint is VALID, AUTHENTIC, and READY for inference.")
    print("=================================================================")
    sys.exit(0)

if __name__ == "__main__":
    main()
