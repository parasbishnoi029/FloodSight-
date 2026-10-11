"""
FloodSight AI — Sen1Floods11 Dataset Preparation & Acquisition Tool (Phase 2)
Provides robust, resumable download, integrity validation, safe extraction,
and split manifest verification for official Sen1Floods11 v1.1 satellite rasters.
"""

import os
import sys
import csv
import json
import shutil
import hashlib
import tarfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_DIR = BASE_DIR / "datasets" / "sen1floods11" / "v1.1"
DATA_DIR = DATASET_DIR / "data" / "flood_events" / "HandLabeled"
SPLITS_DIR = DATASET_DIR / "splits" / "flood_handlabeled"
ARTIFACTS_DIR = BASE_DIR / "artifacts" / "dataset_inspection"

# Sen1Floods11 Official Google Cloud Storage URLs
BASE_GCS_URL = "https://storage.googleapis.com/sen1floods11/v1.1"
SPLIT_URLS = {
    "train": f"{BASE_GCS_URL}/splits/flood_handlabeled/flood_train_data.csv",
    "val": f"{BASE_GCS_URL}/splits/flood_handlabeled/flood_val_data.csv",
    "test": f"{BASE_GCS_URL}/splits/flood_handlabeled/flood_test_data.csv",
}
GCS_HANDLABELED_ROOT = f"{BASE_GCS_URL}/data/flood_events/HandLabeled"

def check_disk_space(target_path: Path, required_bytes: int = 2 * 1024 * 1024 * 1024) -> bool:
    """Verifies sufficient free disk space before downloading or extracting."""
    total, used, free = shutil.disk_usage(target_path if target_path.exists() else target_path.parent)
    if free < required_bytes:
        raise OSError(
            f"INSUFFICIENT_DISK_SPACE: Required {required_bytes / (1024**3):.2f} GB, "
            f"but only {free / (1024**3):.2f} GB available on {target_path}."
        )
    return True

def ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "S2Hand").mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "LabelHand").mkdir(parents=True, exist_ok=True)

def safe_extract_tar(tar_path: Path, target_dir: Path) -> int:
    """
    Safely extracts tar.gz archives preventing Zip Slip / path traversal attacks.
    Validates every member path remains strictly within target_dir.
    """
    if not tar_path.exists():
        raise FileNotFoundError(f"Tar archive '{tar_path}' does not exist.")

    # Validate gzip magic bytes \x1f\x8b
    with open(tar_path, "rb") as f:
        magic = f.read(2)
        if magic != b"\x1f\x8b":
            raise ValueError(f"Archive '{tar_path}' is corrupted: invalid gzip magic header {magic!r}.")

    target_resolved = target_dir.resolve()
    extracted_count = 0

    with tarfile.open(tar_path, "r:gz") as tar:
        for member in tar.getmembers():
            # Check for path traversal attempts
            dest_path = (target_resolved / member.name).resolve()
            if not str(dest_path).startswith(str(target_resolved)):
                raise ValueError(f"Security Alert: Unsafe tar member path '{member.name}' attempts directory traversal.")
            if member.issym() or member.islnk():
                # Disallow symlinks to prevent arbitrary link creation
                continue
            tar.extract(member, path=target_dir)
            extracted_count += 1

    return extracted_count

def download_file_resumable(url: str, dest_path: Path, max_retries: int = 3) -> bool:
    """
    Resumable download supporting HTTP Range headers and integrity validation.
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(dest_path.suffix + ".part")

    initial_size = temp_path.stat().st_size if temp_path.exists() else 0

    headers = {"User-Agent": "FloodSight-AI-Downloader/1.0"}
    if initial_size > 0:
        headers["Range"] = f"bytes={initial_size}-"

    req = urllib.request.Request(url, headers=headers)
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                mode = "ab" if initial_size > 0 and resp.status == 206 else "wb"
                if mode == "wb":
                    initial_size = 0
                with open(temp_path, mode) as f:
                    while True:
                        chunk = resp.read(65536)
                        if not chunk:
                            break
                        f.write(chunk)
            # Rename temp to destination atomically
            temp_path.replace(dest_path)
            return True
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"[ERROR] Failed downloading {url}: {e}", file=sys.stderr)
                return False
    return False

def verify_tiff_file(path: Path) -> bool:
    """Checks that a TIFF file is non-empty and has valid TIFF magic bytes."""
    if not path.exists() or path.stat().st_size < 8:
        return False
    try:
        with open(path, "rb") as f:
            header = f.read(4)
            # II*\0 (little-endian) or MM\0* (big-endian)
            return header in (b"II*\x00", b"MM\x00*")
    except Exception:
        return False

def fetch_splits() -> Dict[str, List[str]]:
    """Loads benchmark split chip lists from local CSVs or downloads them."""
    ensure_dirs()
    splits_data: Dict[str, List[str]] = {}
    for split_name, url in SPLIT_URLS.items():
        dest = SPLITS_DIR / f"flood_{split_name}_data.csv"
        if not dest.exists():
            download_file_resumable(url, dest)
        if dest.exists():
            with open(dest, mode="r", encoding="utf-8") as f:
                reader = csv.reader(f)
                chips = [
                    row[0].strip().replace("_S1Hand.tif", "").replace("_S2Hand.tif", "").replace("_LabelHand.tif", "").replace(".tif", "")
                    for row in reader if row and row[0].strip()
                ]
                splits_data[split_name] = chips
        else:
            splits_data[split_name] = []
    return splits_data

def download_single_chip(chip_id: str) -> Tuple[str, bool, bool]:
    """Downloads both S2Hand and LabelHand TIFFs for a given chip ID."""
    s2_file = DATA_DIR / "S2Hand" / f"{chip_id}_S2Hand.tif"
    lbl_file = DATA_DIR / "LabelHand" / f"{chip_id}_LabelHand.tif"

    s2_ok = verify_tiff_file(s2_file)
    lbl_ok = verify_tiff_file(lbl_file)

    if not s2_ok:
        s2_url = f"{GCS_HANDLABELED_ROOT}/S2Hand/{chip_id}_S2Hand.tif"
        s2_ok = download_file_resumable(s2_url, s2_file) and verify_tiff_file(s2_file)

    if not lbl_ok:
        lbl_url = f"{GCS_HANDLABELED_ROOT}/LabelHand/{chip_id}_LabelHand.tif"
        lbl_ok = download_file_resumable(lbl_url, lbl_file) and verify_tiff_file(lbl_file)

    return chip_id, s2_ok, lbl_ok

def download_sen1floods11_dataset(max_workers: int = 8, limit: Optional[int] = None) -> Dict[str, Any]:
    """
    Downloads official Sen1Floods11 Hand-Labeled S2Hand and LabelHand GeoTIFFs
    concurrently with resumption, disk space verification, and integrity checks.
    """
    ensure_dirs()
    check_disk_space(DATA_DIR, required_bytes=1024 * 1024 * 1024) # Ensure >= 1 GB free

    splits = fetch_splits()
    all_chips: List[str] = []
    for split_chips in splits.values():
        for c in split_chips:
            if c not in all_chips:
                all_chips.append(c)

    if limit is not None:
        all_chips = all_chips[:limit]

    total_chips = len(all_chips)
    print(f"\n=======================================================")
    print(f"  DOWNLOADING SEN1FLOODS11 SATELLITE CHIPS ({total_chips} total)")
    print(f"  Target: {DATA_DIR}")
    print(f"=======================================================\n")

    successful_s2 = 0
    successful_lbl = 0
    failed_chips = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(download_single_chip, chip): chip for chip in all_chips}
        done_count = 0
        for future in as_completed(futures):
            chip_id, s2_ok, lbl_ok = future.result()
            done_count += 1
            if s2_ok:
                successful_s2 += 1
            if lbl_ok:
                successful_lbl += 1
            if not (s2_ok and lbl_ok):
                failed_chips.append(chip_id)

            if done_count % 25 == 0 or done_count == total_chips:
                pct = (done_count / total_chips) * 100.0
                print(f"Progress: [{done_count}/{total_chips}] ({pct:.1f}%) | S2 OK: {successful_s2} | Labels OK: {successful_lbl}")

    summary = {
        "total_requested": total_chips,
        "s2_downloaded": successful_s2,
        "labels_downloaded": successful_lbl,
        "failed_count": len(failed_chips),
        "failed_chips": failed_chips
    }
    return summary

def verify_against_split_manifests() -> Dict[str, Any]:
    """
    Verifies every expected image and mask against the existing split manifests.
    Never marks the dataset as downloaded merely because CSV files exist.
    """
    splits = fetch_splits()
    s2_dir = DATA_DIR / "S2Hand"
    lbl_dir = DATA_DIR / "LabelHand"

    manifest_report: Dict[str, Any] = {
        "status": "INCOMPLETE",
        "splits": {},
        "totals": {
            "expected_chips": 0,
            "present_images": 0,
            "present_labels": 0,
            "complete_pairs": 0,
            "missing_images": 0,
            "missing_labels": 0
        }
    }

    total_expected = 0
    total_imgs = 0
    total_lbls = 0
    total_pairs = 0

    for split_name, chips in splits.items():
        split_stat = {
            "expected": len(chips),
            "present_images": 0,
            "present_labels": 0,
            "complete_pairs": 0,
            "missing_images": [],
            "missing_labels": []
        }
        for chip_id in chips:
            s2_ok = verify_tiff_file(s2_dir / f"{chip_id}_S2Hand.tif")
            lbl_ok = verify_tiff_file(lbl_dir / f"{chip_id}_LabelHand.tif")

            if s2_ok:
                split_stat["present_images"] += 1
            else:
                split_stat["missing_images"].append(f"{chip_id}_S2Hand.tif")

            if lbl_ok:
                split_stat["present_labels"] += 1
            else:
                split_stat["missing_labels"].append(f"{chip_id}_LabelHand.tif")

            if s2_ok and lbl_ok:
                split_stat["complete_pairs"] += 1

        manifest_report["splits"][split_name] = split_stat
        total_expected += len(chips)
        total_imgs += split_stat["present_images"]
        total_lbls += split_stat["present_labels"]
        total_pairs += split_stat["complete_pairs"]

    manifest_report["totals"]["expected_chips"] = total_expected
    manifest_report["totals"]["present_images"] = total_imgs
    manifest_report["totals"]["present_labels"] = total_lbls
    manifest_report["totals"]["complete_pairs"] = total_pairs
    manifest_report["totals"]["missing_images"] = total_expected - total_imgs
    manifest_report["totals"]["missing_labels"] = total_expected - total_lbls

    if total_expected > 0 and total_pairs == total_expected:
        manifest_report["status"] = "VERIFIED_COMPLETE"
    else:
        manifest_report["status"] = "PARTIAL_OR_MISSING"

    return manifest_report

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Sen1Floods11 Dataset Preparation")
    parser.add_argument("--download", action="store_true", help="Download official Sen1Floods11 chips")
    parser.add_argument("--verify", action="store_true", help="Verify chips against split manifests")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of chips to download (for testing)")
    args = parser.parse_args()

    if args.download:
        download_sen1floods11_dataset(limit=args.limit)

    rep = verify_against_split_manifests()
    print("\n=======================================================")
    print(f"MANIFEST VERIFICATION STATUS: {rep['status']}")
    print(f"Total Expected: {rep['totals']['expected_chips']}")
    print(f"Complete Pairs: {rep['totals']['complete_pairs']}")
    print(f"Missing Images: {rep['totals']['missing_images']} | Missing Labels: {rep['totals']['missing_labels']}")
    print("=======================================================")
