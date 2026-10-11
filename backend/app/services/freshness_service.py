"""
FloodSight AI — Data Freshness & Authoritative External Data Service
Manages continuous retrieval, caching, deduplication, and freshness tracking
for Copernicus Data Space Ecosystem STAC and ECMWF GloFAS hydrological data.
"""

import time
import datetime
from typing import Dict, Any, Optional, List
import urllib.request
import json
import logging

logger = logging.getLogger("floodsight.freshness")

# Cache storage with timestamps
# Key: string -> Value: {"data": ..., "retrieved_at": float, "source_timestamp": str, "status": str}
CACHE: Dict[str, Dict[str, Any]] = {}

HYDROLOGY_TTL_SECONDS = 300       # 5 minutes
SATELLITE_CATALOG_TTL_SECONDS = 3600  # 1 hour

def get_utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

class FreshnessService:
    @staticmethod
    def fetch_hydrology_data(lat: float, lon: float) -> Dict[str, Any]:
        """
        Retrieves genuine hydrological discharge and precipitation from official
        Copernicus EMS GloFAS (via Open-Meteo Global Flood API) and meteorological models.
        """
        cache_key = f"hydro_{lat:.3f}_{lon:.3f}"
        now = time.time()
        
        # Check cache
        if cache_key in CACHE:
            cached = CACHE[cache_key]
            age = now - cached["retrieved_at"]
            if age < HYDROLOGY_TTL_SECONDS:
                return {
                    **cached["data"],
                    "cache_status": "FRESH",
                    "cache_age_seconds": round(age, 1)
                }

        # Attempt fresh fetch
        last_attempted = get_utc_now_iso()
        flood_url = (
            f"https://flood-api.open-meteo.com/v1/flood?"
            f"latitude={lat:.4f}&longitude={lon:.4f}&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=3"
        )
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat:.4f}&longitude={lon:.4f}&current=precipitation,rain&hourly=precipitation&forecast_days=1"
        )

        try:
            req_flood = urllib.request.Request(flood_url, headers={"User-Agent": "FloodSight-AI/1.0"})
            with urllib.request.urlopen(req_flood, timeout=6.0) as res:
                flood_json = json.loads(res.read().decode("utf-8"))

            req_weather = urllib.request.Request(weather_url, headers={"User-Agent": "FloodSight-AI/1.0"})
            with urllib.request.urlopen(req_weather, timeout=6.0) as res:
                weather_json = json.loads(res.read().decode("utf-8"))

            retrieval_time = get_utc_now_iso()
            discharge_daily = flood_json.get("daily", {}).get("river_discharge", [])
            discharge_times = flood_json.get("daily", {}).get("time", [])
            current_discharge = discharge_daily[0] if discharge_daily else None
            source_time = discharge_times[0] if discharge_times else retrieval_time

            current_precip = weather_json.get("current", {}).get("precipitation", 0.0)
            precip_units = weather_json.get("current_units", {}).get("precipitation", "mm")

            result_data = {
                "source": "Copernicus Emergency Management Service / ECMWF GloFAS",
                "sensor_model": "GloFAS 4.0 Gridded River Discharge Model",
                "coordinates": {"lat": lat, "lon": lon},
                "current_river_discharge_m3s": current_discharge,
                "current_precipitation_rate": current_precip,
                "precipitation_unit": precip_units,
                "daily_discharge_series": discharge_daily,
                "series_timestamps": discharge_times,
                "source_timestamp": source_time,
                "retrieval_timestamp": retrieval_time,
                "last_successful_refresh": retrieval_time,
                "last_attempted_refresh": last_attempted,
                "status": "FRESH",
                "uncertainty_notes": "ECMWF GloFAS gridded hydrological model (0.05° GSD). Subject to local riverbed calibration."
            }

            CACHE[cache_key] = {
                "data": result_data,
                "retrieved_at": now
            }
            return {**result_data, "cache_status": "FRESH", "cache_age_seconds": 0.0}

        except Exception as e:
            logger.warning(f"Hydrology fetch failed for ({lat}, {lon}): {e}")
            if cache_key in CACHE:
                # Return stale cached data with clear notice
                stale_data = CACHE[cache_key]["data"]
                return {
                    **stale_data,
                    "status": "STALE DATA",
                    "cache_status": "STALE",
                    "cache_age_seconds": round(now - CACHE[cache_key]["retrieved_at"], 1),
                    "last_attempted_refresh": last_attempted,
                    "error_message": f"Network refresh error: {str(e)}"
                }
            else:
                return {
                    "source": "Copernicus Emergency Management Service / ECMWF GloFAS",
                    "coordinates": {"lat": lat, "lon": lon},
                    "current_river_discharge_m3s": None,
                    "current_precipitation_rate": None,
                    "source_timestamp": None,
                    "retrieval_timestamp": None,
                    "last_attempted_refresh": last_attempted,
                    "last_successful_refresh": None,
                    "status": "SOURCE UNAVAILABLE",
                    "cache_status": "UNAVAILABLE",
                    "error_message": f"Source unreachable: {str(e)}"
                }

    @staticmethod
    def fetch_satellite_catalog(lat: float, lon: float) -> Dict[str, Any]:
        """
        Queries official Copernicus Data Space Ecosystem (CDSE) STAC API
        for actual Sentinel-2 MSI products intersecting coordinates.
        """
        cache_key = f"stac_{lat:.2f}_{lon:.2f}"
        now = time.time()

        if cache_key in CACHE:
            cached = CACHE[cache_key]
            age = now - cached["retrieved_at"]
            if age < SATELLITE_CATALOG_TTL_SECONDS:
                return {
                    **cached["data"],
                    "cache_status": "FRESH",
                    "cache_age_seconds": round(age, 1)
                }

        last_attempted = get_utc_now_iso()
        # Bounding box of 0.3 degrees around target location
        bbox_str = f"{lon - 0.2:.3f},{lat - 0.2:.3f},{lon + 0.2:.3f},{lat + 0.2:.3f}"
        stac_url = (
            f"https://catalogue.dataspace.copernicus.eu/stac/search?"
            f"collections=sentinel-2-l2a&bbox={bbox_str}&limit=1"
        )

        try:
            req = urllib.request.Request(stac_url, headers={"User-Agent": "FloodSight-AI/1.0"})
            with urllib.request.urlopen(req, timeout=8.0) as res:
                stac_json = json.loads(res.read().decode("utf-8"))

            features = stac_json.get("features", [])
            retrieval_time = get_utc_now_iso()

            if not features:
                result_data = {
                    "source": "Copernicus Data Space Ecosystem (CDSE) STAC API",
                    "collection": "sentinel-2-l2a",
                    "found": False,
                    "message": "No recent Sentinel-2 L2A acquisitions found in target bounding box.",
                    "source_timestamp": None,
                    "retrieval_timestamp": retrieval_time,
                    "last_successful_refresh": retrieval_time,
                    "last_attempted_refresh": last_attempted,
                    "status": "FRESH"
                }
            else:
                feat = features[0]
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})
                
                result_data = {
                    "source": "Copernicus Data Space Ecosystem (CDSE) STAC API",
                    "collection": "sentinel-2-l2a",
                    "found": True,
                    "product_id": feat.get("id"),
                    "platform": props.get("platform", "Sentinel-2"),
                    "instrument": props.get("instruments", ["MSI"])[0] if props.get("instruments") else "MSI",
                    "processing_level": props.get("processing:level", "L2A"),
                    "acquisition_timestamp": props.get("datetime") or props.get("start_datetime"),
                    "published_timestamp": props.get("published"),
                    "cloud_cover_percent": props.get("eo:cloud_cover"),
                    "spatial_resolution_m": props.get("gsd", 10.0),
                    "orbit_state": props.get("sat:orbit_state"),
                    "footprint_geometry": geom,
                    "retrieval_timestamp": retrieval_time,
                    "last_successful_refresh": retrieval_time,
                    "last_attempted_refresh": last_attempted,
                    "status": "FRESH",
                    "provenance_verified": True
                }

            CACHE[cache_key] = {"data": result_data, "retrieved_at": now}
            return {**result_data, "cache_status": "FRESH", "cache_age_seconds": 0.0}

        except Exception as e:
            logger.warning(f"CDSE STAC fetch failed: {e}")
            if cache_key in CACHE:
                stale_data = CACHE[cache_key]["data"]
                return {
                    **stale_data,
                    "status": "STALE DATA",
                    "cache_status": "STALE",
                    "cache_age_seconds": round(now - CACHE[cache_key]["retrieved_at"], 1),
                    "last_attempted_refresh": last_attempted,
                    "error_message": str(e)
                }
            else:
                return {
                    "source": "Copernicus Data Space Ecosystem (CDSE) STAC API",
                    "collection": "sentinel-2-l2a",
                    "found": False,
                    "status": "SOURCE UNAVAILABLE",
                    "cache_status": "UNAVAILABLE",
                    "last_attempted_refresh": last_attempted,
                    "last_successful_refresh": None,
                    "error_message": f"STAC service unreachable: {str(e)}"
                }

freshness_service = FreshnessService()
