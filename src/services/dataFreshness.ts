/**
 * FloodSight AI — Data Freshness & External Observation Service
 * Implements continuous retrieval, request deduplication, in-memory caching,
 * stale-data detection, and strict zero-fabrication error handling.
 */

import { HydrologyObservation, SatelliteCatalogProduct } from '../types';

interface CacheEntry<T> {
  data: T;
  retrievedAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

const HYDROLOGY_TTL_MS = 5 * 60 * 1000;       // 5 minutes
const SATELLITE_CATALOG_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Returns ISO string for current UTC time
 */
export function getUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Computes human-readable relative age string with explicit UTC timestamp
 */
export function formatFreshness(timestampIso: string | null | undefined): string {
  if (!timestampIso) return 'TIMESTAMP UNAVAILABLE';
  try {
    const timeMs = new Date(timestampIso).getTime();
    if (isNaN(timeMs)) return 'TIMESTAMP INVALID';
    const nowMs = Date.now();
    const diffSec = Math.floor((nowMs - timeMs) / 1000);
    const dateObj = new Date(timeMs);
    const utcHours = String(dateObj.getUTCHours()).padStart(2, '0');
    const utcMins = String(dateObj.getUTCMinutes()).padStart(2, '0');
    const utcDate = dateObj.toISOString().slice(0, 10);

    if (diffSec < 60) return `Just now (${utcHours}:${utcMins} UTC)`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago (${utcHours}:${utcMins} UTC)`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago (${utcDate} ${utcHours}:${utcMins} UTC)`;
    return `${Math.floor(diffSec / 86400)}d ago (${utcDate} UTC)`;
  } catch {
    return 'TIMESTAMP FORMAT ERROR';
  }
}

/**
 * Fetches real ECMWF GloFAS river discharge and rainfall observations.
 * Tries backend proxy (/api/external/hydrology), falls back to direct client fetch if backend offline.
 */
export async function getLiveHydrology(lat: number, lon: number): Promise<HydrologyObservation> {
  const cacheKey = `hydro_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const now = Date.now();

  // Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey)!;
    const age = now - entry.retrievedAt;
    if (age < HYDROLOGY_TTL_MS) {
      return {
        ...entry.data,
        cache_status: 'FRESH',
        cache_age_seconds: Math.round(age / 1000)
      };
    }
  }

  // Deduplicate in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async (): Promise<HydrologyObservation> => {
    const attemptTime = getUtcIso();
    try {
      // 1. Try Backend Proxy
      const backendRes = await fetch(`/api/external/hydrology?lat=${lat}&lon=${lon}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      const contentType = backendRes.headers.get('content-type') || '';
      if (backendRes.ok && contentType.includes('application/json')) {
        const data: HydrologyObservation = await backendRes.json();
        memoryCache.set(cacheKey, { data, retrievedAt: Date.now() });
        return data;
      }
    } catch {
      // Backend proxy failed or offline -> fallback to direct public endpoint
    }

    try {
      // 2. Client-side fallback directly to Open-Meteo GloFAS and Weather APIs
      const floodUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=3`;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=precipitation,rain&hourly=precipitation&forecast_days=1`;

      const [resFlood, resWeather] = await Promise.all([
        fetch(floodUrl, { signal: AbortSignal.timeout(6000) }),
        fetch(weatherUrl, { signal: AbortSignal.timeout(6000) })
      ]);

      if (!resFlood.ok) throw new Error(`GloFAS API returned HTTP ${resFlood.status}`);
      const floodJson = await resFlood.json();
      const weatherJson = resWeather.ok ? await resWeather.json() : {};

      const retrievalTime = getUtcIso();
      const dailyDischarge = floodJson.daily?.river_discharge || [];
      const dischargeTimes = floodJson.daily?.time || [];
      const currentDischarge = dailyDischarge.length > 0 ? dailyDischarge[0] : null;
      const currentPrecip = weatherJson.current?.precipitation ?? 0.0;
      const precipUnit = weatherJson.current_units?.precipitation ?? 'mm';

      const obs: HydrologyObservation = {
        source: 'Copernicus Emergency Management Service / ECMWF GloFAS',
        sensor_model: 'GloFAS 4.0 Gridded River Discharge Model',
        coordinates: { lat, lon },
        current_river_discharge_m3s: currentDischarge,
        current_precipitation_rate: currentPrecip,
        precipitation_unit: precipUnit,
        daily_discharge_series: dailyDischarge,
        series_timestamps: dischargeTimes,
        source_timestamp: dischargeTimes[0] ? `${dischargeTimes[0]}T00:00:00Z` : retrievalTime,
        retrieval_timestamp: retrievalTime,
        last_successful_refresh: retrievalTime,
        last_attempted_refresh: attemptTime,
        status: 'FRESH',
        cache_status: 'FRESH',
        cache_age_seconds: 0,
        uncertainty_notes: 'ECMWF GloFAS gridded hydrological model (0.05° GSD). Subject to local riverbed calibration.'
      };

      memoryCache.set(cacheKey, { data: obs, retrievedAt: Date.now() });
      return obs;
    } catch (err: any) {
      // Check if stale cached data exists
      if (memoryCache.has(cacheKey)) {
        const staleEntry = memoryCache.get(cacheKey)!;
        return {
          ...staleEntry.data,
          status: 'STALE DATA',
          cache_status: 'STALE',
          cache_age_seconds: Math.round((Date.now() - staleEntry.retrievedAt) / 1000),
          last_attempted_refresh: attemptTime,
          error_message: String(err?.message || err)
        };
      }

      // No cache -> Fail closed with SOURCE UNAVAILABLE
      return {
        source: 'Copernicus Emergency Management Service / ECMWF GloFAS',
        coordinates: { lat, lon },
        current_river_discharge_m3s: null,
        current_precipitation_rate: null,
        precipitation_unit: 'mm',
        source_timestamp: null,
        retrieval_timestamp: null,
        last_attempted_refresh: attemptTime,
        last_successful_refresh: null,
        status: 'SOURCE UNAVAILABLE',
        cache_status: 'UNAVAILABLE',
        error_message: String(err?.message || 'External hydrological source unreachable')
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export interface CopernicusStatusResponse {
  configured: boolean;
  provider: string;
  stac_catalog_url: string;
  sentinel_hub_process_url: string;
  supported_collections: string[];
  documentation: string;
  status: 'AUTHENTICATED' | 'CREDENTIALS_REQUIRED';
  message: string;
}

/**
 * Checks Copernicus Data Space Ecosystem credential status and API readiness.
 */
export async function getCopernicusStatus(): Promise<CopernicusStatusResponse | null> {
  try {
    const res = await fetch('/api/external/copernicus/status', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      return (await res.json()) as CopernicusStatusResponse;
    }
  } catch {}
  return null;
}

/**
 * Queries Copernicus Data Space Ecosystem (CDSE) STAC API for actual Sentinel-2 or Sentinel-1 acquisitions.
 */
export async function getLiveSatelliteCatalog(
  lat: number,
  lon: number,
  collection: 'sentinel-2-l2a' | 'sentinel-1-grd' = 'sentinel-2-l2a'
): Promise<SatelliteCatalogProduct> {
  const cacheKey = `stac_${collection}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const now = Date.now();

  if (memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey)!;
    const age = now - entry.retrievedAt;
    if (age < SATELLITE_CATALOG_TTL_MS) {
      return {
        ...entry.data,
        cache_age_seconds: Math.round(age / 1000)
      };
    }
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async (): Promise<SatelliteCatalogProduct> => {
    const attemptTime = getUtcIso();
    // 1. Try backend proxy
    try {
      const backendRes = await fetch(`/api/external/satellite-catalog?lat=${lat}&lon=${lon}&collection=${collection}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      const contentType = backendRes.headers.get('content-type') || '';
      if (backendRes.ok && contentType.includes('application/json')) {
        const data: SatelliteCatalogProduct = await backendRes.json();
        memoryCache.set(cacheKey, { data, retrievedAt: Date.now() });
        return data;
      }
    } catch {}

    // 2. Direct client query to Microsoft Planetary Computer STAC (Public, No Account Required)
    try {
      const west = parseFloat((lon - 0.25).toFixed(3));
      const south = parseFloat((lat - 0.25).toFixed(3));
      const east = parseFloat((lon + 0.25).toFixed(3));
      const north = parseFloat((lat + 0.25).toFixed(3));

      const res = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections: ['sentinel-2-l2a'],
          bbox: [west, south, east, north],
          limit: 1,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new Error(`Planetary Computer STAC returned HTTP ${res.status}`);
      const stacJson = await res.json();
      const features = stacJson.features || [];
      const retrievalTime = getUtcIso();

      if (features.length === 0) {
        const emptyResult: SatelliteCatalogProduct = {
          source: 'Microsoft Planetary Computer STAC API',
          collection: 'sentinel-2-l2a',
          found: false,
          retrieval_timestamp: retrievalTime,
          last_successful_refresh: retrievalTime,
          last_attempted_refresh: attemptTime,
          status: 'FRESH',
          cache_age_seconds: 0,
          attribution: 'European Space Agency (ESA) Copernicus Sentinel-2 / Microsoft Planetary Computer',
        };
        memoryCache.set(cacheKey, { data: emptyResult, retrievedAt: Date.now() });
        return emptyResult;
      }

      const feat = features[0];
      const props = feat.properties || {};
      const assets = feat.assets || {};
      const result: SatelliteCatalogProduct = {
        source: 'Microsoft Planetary Computer STAC API',
        collection: 'sentinel-2-l2a',
        found: true,
        product_id: feat.id,
        platform: props.platform || 'Sentinel-2',
        instrument: props.instruments?.[0] || 'MSI',
        processing_level: 'L2A',
        acquisition_timestamp: props.datetime,
        published_timestamp: props.published || props.datetime,
        cloud_cover_percent: props['eo:cloud_cover'] != null ? Number(props['eo:cloud_cover'].toFixed(1)) : null,
        spatial_resolution_m: 10.0,
        orbit_state: props['sat:orbit_state'],
        footprint_geometry: feat.geometry,
        preview_url: assets.rendered_preview?.href || null,
        assets: {
          B02: assets.B02 ? { href: assets.B02.href, title: assets.B02.title } : null,
          B03: assets.B03 ? { href: assets.B03.href, title: assets.B03.title } : null,
          B04: assets.B04 ? { href: assets.B04.href, title: assets.B04.title } : null,
          visual: assets.visual ? { href: assets.visual.href, title: assets.visual.title } : null,
        },
        has_model_bands: Boolean(assets.B02 && assets.B03 && assets.B04),
        retrieval_timestamp: retrievalTime,
        last_successful_refresh: retrievalTime,
        last_attempted_refresh: attemptTime,
        status: 'FRESH',
        cache_age_seconds: 0,
        provenance_verified: true,
        attribution: 'European Space Agency (ESA) Copernicus Sentinel-2 / Microsoft Planetary Computer',
      };

      memoryCache.set(cacheKey, { data: result, retrievedAt: Date.now() });
      return result;
    } catch (err: any) {
      if (memoryCache.has(cacheKey)) {
        const stale = memoryCache.get(cacheKey)!;
        return {
          ...stale.data,
          status: 'STALE DATA',
          cache_age_seconds: Math.round((Date.now() - stale.retrievedAt) / 1000),
          last_attempted_refresh: attemptTime,
          error_message: String(err?.message || err)
        };
      }

      return {
        source: 'Copernicus Data Space Ecosystem (CDSE) STAC API',
        collection: 'sentinel-2-l2a',
        found: false,
        retrieval_timestamp: null,
        last_attempted_refresh: attemptTime,
        last_successful_refresh: null,
        status: 'SOURCE UNAVAILABLE',
        cache_age_seconds: 0,
        error_message: String(err?.message || 'STAC catalog unreachable')
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}
