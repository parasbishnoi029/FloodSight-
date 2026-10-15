/**
 * FloodSight AI — Production Live Weather & Radar Service
 * Integrates RainViewer Live Weather Radar Tile API and Open-Meteo Weather Observations / Forecasts.
 * Implements strict zero-fabrication policies, deduplication, and in-memory caching.
 */

import {
  RainViewerMetadata,
  RainViewerRadarFrame,
  OpenMeteoCurrentWeather,
  OpenMeteoHourlyForecast,
  LiveWeatherData
} from '../types';

interface CacheEntry<T> {
  data: T;
  retrievedAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

const RADAR_TTL_MS = 5 * 60 * 1000;    // 5 minutes
const WEATHER_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Returns ISO string for current UTC time
 */
export function getUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Constructs the tile URL for a given RainViewer radar frame
 * Tile template: {host}{path}/256/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
 */
export function getRainViewerTileUrl(
  host: string,
  path: string,
  z: number | string,
  x: number | string,
  y: number | string,
  colorScheme: number = 2, // Universal Blue / RainViewer default
  smooth: number = 1,
  snow: number = 1
): string {
  const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.endsWith('/256')) {
    cleanPath = cleanPath.slice(0, -4);
  } else if (cleanPath.endsWith('/512')) {
    cleanPath = cleanPath.slice(0, -4);
  }
  return `${cleanHost}${cleanPath}/256/${z}/${x}/${y}/${colorScheme}/${smooth}_${snow}.png`;
}

/**
 * Fetches RainViewer live radar metadata
 */
export async function getRainViewerMetadata(): Promise<RainViewerMetadata | null> {
  const cacheKey = 'rainviewer_metadata';
  const now = Date.now();

  if (memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey)!;
    if (now - entry.retrievedAt < RADAR_TTL_MS) {
      return entry.data;
    }
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async (): Promise<RainViewerMetadata | null> => {
    try {
      // 1. Try backend proxy first if available
      try {
        const proxyRes = await fetch('/api/external/weather-radar', {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000)
        });
        if (proxyRes.ok) {
          const contentType = proxyRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data: RainViewerMetadata = await proxyRes.json();
            memoryCache.set(cacheKey, { data, retrievedAt: Date.now() });
            return data;
          }
        }
      } catch {
        // Fallback to direct client call
      }

      // 2. Direct RainViewer metadata call
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) throw new Error(`RainViewer API returned HTTP ${res.status}`);
      const data: RainViewerMetadata = await res.json();
      memoryCache.set(cacheKey, { data, retrievedAt: Date.now() });
      return data;
    } catch (err) {
      if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey)!.data;
      }
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches Open-Meteo live weather conditions and forecast
 */
export async function getLiveWeather(lat: number, lon: number): Promise<LiveWeatherData> {
  const cacheKey = `weather_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const now = Date.now();
  const attemptTime = getUtcIso();

  if (memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey)!;
    const age = now - entry.retrievedAt;
    if (age < WEATHER_TTL_MS) {
      return {
        ...entry.data,
        status: 'FRESH'
      };
    }
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async (): Promise<LiveWeatherData> => {
    try {
      // Fetch RainViewer metadata and Open-Meteo in parallel
      const fetchWeatherFromProxyOrDirect = async () => {
        const queryUrl = `/api/external/weather-forecast?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
        try {
          const proxyRes = await fetch(queryUrl, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(6000)
          });
          if (proxyRes.ok) {
            const contentType = proxyRes.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              return await proxyRes.json();
            }
          }
        } catch {
          // Proxy fallback
        }

        const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=precipitation,rain,showers,weather_code,wind_speed_10m&forecast_days=2&timezone=UTC`;
        const directRes = await fetch(directUrl, { signal: AbortSignal.timeout(8000) });
        if (!directRes.ok) {
          throw new Error(`Open-Meteo API returned HTTP ${directRes.status}`);
        }
        return await directRes.json();
      };

      const [radarMeta, weatherJson] = await Promise.all([
        getRainViewerMetadata(),
        fetchWeatherFromProxyOrDirect()
      ]);
      const retrievalTime = getUtcIso();

      // Extract RainViewer frames if available
      let rainViewerData: LiveWeatherData['rainViewer'] | undefined = undefined;
      if (radarMeta && radarMeta.radar) {
        const pastFrames = radarMeta.radar.past || [];
        const nowcastFrames = radarMeta.radar.nowcast || [];
        const satelliteFrames = radarMeta.satellite?.infrared || [];
        rainViewerData = {
          host: radarMeta.host || 'https://tilecache.rainviewer.com',
          frames: pastFrames,
          nowcastFrames: nowcastFrames,
          satelliteFrames: satelliteFrames,
          selectedFrameIndex: pastFrames.length > 0 ? pastFrames.length - 1 : 0,
          generatedTime: radarMeta.generated ? new Date(radarMeta.generated * 1000).toISOString() : retrievalTime
        };
      }

      const result: LiveWeatherData = {
        source: 'RainViewer Radar Tile API & Open-Meteo Weather API',
        coordinates: { lat, lon },
        rainViewer: rainViewerData,
        currentWeather: weatherJson.current,
        currentUnits: weatherJson.current_units,
        forecast: weatherJson.hourly,
        forecastUnits: weatherJson.hourly_units,
        retrieval_timestamp: retrievalTime,
        last_successful_refresh: retrievalTime,
        last_attempted_refresh: attemptTime,
        status: 'FRESH'
      };

      memoryCache.set(cacheKey, { data: result, retrievedAt: Date.now() });
      return result;
    } catch (err: any) {
      if (memoryCache.has(cacheKey)) {
        const stale = memoryCache.get(cacheKey)!.data;
        return {
          ...stale,
          status: 'STALE DATA',
          last_attempted_refresh: attemptTime,
          error_message: String(err?.message || err)
        };
      }

      return {
        source: 'RainViewer & Open-Meteo API',
        coordinates: { lat, lon },
        retrieval_timestamp: null,
        last_successful_refresh: null,
        last_attempted_refresh: attemptTime,
        status: 'SOURCE UNAVAILABLE',
        error_message: String(err?.message || 'Weather endpoints unreachable')
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Maps WMO Weather Interpretation Codes (Open-Meteo) to human-readable strings
 */
export function getWmoWeatherDescription(code: number | null | undefined): { label: string; icon: string } {
  if (code == null) return { label: 'Unknown Weather', icon: 'cloud' };

  switch (code) {
    case 0:
      return { label: 'Clear Sky', icon: 'sun' };
    case 1:
      return { label: 'Mainly Clear', icon: 'sun-cloud' };
    case 2:
      return { label: 'Partly Cloudy', icon: 'cloud-sun' };
    case 3:
      return { label: 'Overcast', icon: 'cloud' };
    case 45:
    case 48:
      return { label: 'Foggy / Rime Fog', icon: 'fog' };
    case 51:
      return { label: 'Light Drizzle', icon: 'drizzle' };
    case 53:
      return { label: 'Moderate Drizzle', icon: 'drizzle' };
    case 55:
      return { label: 'Dense Drizzle', icon: 'drizzle' };
    case 61:
      return { label: 'Slight Rain', icon: 'rain' };
    case 63:
      return { label: 'Moderate Rain', icon: 'rain' };
    case 65:
      return { label: 'Heavy Torrential Rain', icon: 'heavy-rain' };
    case 71:
    case 73:
    case 75:
      return { label: 'Snowfall', icon: 'snow' };
    case 80:
      return { label: 'Slight Rain Showers', icon: 'showers' };
    case 81:
      return { label: 'Moderate Rain Showers', icon: 'showers' };
    case 82:
      return { label: 'Violent Rain Showers', icon: 'heavy-rain' };
    case 95:
      return { label: 'Thunderstorm', icon: 'thunderstorm' };
    case 96:
    case 99:
      return { label: 'Severe Thunderstorm with Hail', icon: 'thunderstorm' };
    default:
      return { label: `Weather Code ${code}`, icon: 'cloud' };
  }
}

/**
 * Converts wind direction angle in degrees into 8-point compass direction
 */
export function getWindDirectionDegreesToCompass(deg: number | null | undefined): string {
  if (deg == null) return 'N/A';
  const val = Math.floor((deg / 45) + 0.5);
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[val % 8];
}
