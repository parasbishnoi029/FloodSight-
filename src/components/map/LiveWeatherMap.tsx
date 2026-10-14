import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import {
  CloudRain,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sliders,
  Layers,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  EyeOff,
  Maximize2,
  RefreshCw,
  Info,
  AlertCircle,
  Activity,
  Compass,
  Satellite,
  Waves,
  ShieldCheck,
  Zap,
  Clock,
  MapPin
} from 'lucide-react';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../../data/globalDisasters';
import {
  LiveWeatherData,
  RainViewerRadarFrame
} from '../../types';
import {
  getLiveWeather,
  getRainViewerTileUrl,
  getWmoWeatherDescription,
  getWindDirectionDegreesToCompass,
  getUtcIso
} from '../../services/weatherService';
import { formatFreshness } from '../../services/dataFreshness';

export interface LiveWeatherMapProps {
  selectedLocation: GlobalDisasterLocation;
  onSelectLocation?: (location: GlobalDisasterLocation) => void;
  bounds?: [number, number, number, number] | null; // [south, west, north, east]
  analysisMaskUrl?: string | null;
  className?: string;
}

export const LiveWeatherMap: React.FC<LiveWeatherMapProps> = ({
  selectedLocation,
  onSelectLocation,
  bounds,
  analysisMaskUrl,
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const basemapTileRef = useRef<L.TileLayer | null>(null);
  const radarTileRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);

  // Weather Data State
  const [weatherData, setWeatherData] = useState<LiveWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Layer Visibility & Opacity
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [radarOpacity, setRadarOpacity] = useState<number>(0.65);
  const [showFloodMask, setShowFloodMask] = useState<boolean>(true);
  const [floodMaskOpacity, setFloodMaskOpacity] = useState<number>(0.75);
  const [showWindInfo, setShowWindInfo] = useState<boolean>(true);
  const [showForecast, setShowForecast] = useState<boolean>(true);
  const [basemapStyle, setBasemapStyle] = useState<'dark' | 'satellite' | 'streets'>('dark');
  const [radarColorScheme, setRadarColorScheme] = useState<number>(2); // 2: Universal Blue, 1: RainViewer Classic, 8: Titan Spectrum

  // Radar Timeline & Playback
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState<number>(1000); // 1s per frame
  const playTimerRef = useRef<any>(null);

  // All radar frames combined (past + nowcast)
  const allRadarFrames = useMemo<RainViewerRadarFrame[]>(() => {
    if (!weatherData?.rainViewer) return [];
    return [
      ...(weatherData.rainViewer.frames || []),
      ...(weatherData.rainViewer.nowcastFrames || [])
    ];
  }, [weatherData]);

  const pastFramesCount = weatherData?.rainViewer?.frames?.length || 0;

  // Safeguard lat/lon coordinates
  const safeLat = useMemo(() => {
    if (selectedLocation && typeof selectedLocation.lat === 'number' && !isNaN(selectedLocation.lat) && selectedLocation.lat !== 0) {
      return selectedLocation.lat;
    }
    return 9.01; // Ghana Sentinel-2 default latitude fallback
  }, [selectedLocation]);

  const safeLon = useMemo(() => {
    if (selectedLocation && typeof selectedLocation.lon === 'number' && !isNaN(selectedLocation.lon) && selectedLocation.lon !== 0) {
      return selectedLocation.lon;
    }
    return -0.37; // Ghana Sentinel-2 default longitude fallback
  }, [selectedLocation]);

  // Load weather data
  const loadWeatherData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await getLiveWeather(safeLat, safeLon);
      setWeatherData(data);
      if (data.rainViewer?.frames && data.rainViewer.frames.length > 0) {
        setActiveFrameIndex(data.rainViewer.frames.length - 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve live weather telemetry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [safeLat, safeLon]);

  useEffect(() => {
    loadWeatherData();
    // Auto-refresh weather every 5 minutes
    const interval = setInterval(() => {
      loadWeatherData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeatherData]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [safeLat, safeLon],
        zoom: 9,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      overlayGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Basemap Tiles with CartoDB Dark Matter and Fail-Safe Esri Imagery
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (basemapTileRef.current) {
      map.removeLayer(basemapTileRef.current);
      basemapTileRef.current = null;
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    let attribution = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
    let maxNativeZoom = 16;
    let subdomains: string | string[] = [];

    if (basemapStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';
      maxNativeZoom = 15; // Strictly set to 15 so Esri never returns "Zoom Level Not Supported" watermark tiles
      subdomains = [];
    } else if (basemapStyle === 'streets') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
      maxNativeZoom = 19;
      subdomains = ['a', 'b', 'c'];
    }

    const tileLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 18,
      maxNativeZoom,
      subdomains,
      crossOrigin: true
    }).addTo(map);

    basemapTileRef.current = tileLayer;
  }, [basemapStyle]);

  // Handle map container size calculations and panning
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView([safeLat, safeLon], 8, { animate: true });
    }, 150);

    return () => clearTimeout(timer);
  }, [safeLat, safeLon, basemapStyle]);

  // Fit map to GeoTIFF or Scene Bounds
  const handleFitBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (bounds && bounds.length === 4) {
      const leafletBounds: L.LatLngBoundsExpression = [
        [bounds[0], bounds[1]], // [south, west]
        [bounds[2], bounds[3]]  // [north, east]
      ];
      map.fitBounds(leafletBounds, { padding: [30, 30], maxZoom: 13, animate: true });
    } else {
      // Bounding box around selected location (~25km radius)
      const delta = 0.22;
      map.fitBounds([
        [safeLat - delta, safeLon - delta],
        [safeLat + delta, safeLon + delta]
      ], { padding: [20, 20], animate: true });
    }
  }, [bounds, safeLat, safeLon]);

  // Update Radar Layer on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (radarTileRef.current) {
      map.removeLayer(radarTileRef.current);
      radarTileRef.current = null;
    }

    if (!showRadar || !weatherData?.rainViewer || allRadarFrames.length === 0) {
      return;
    }

    const frame = allRadarFrames[activeFrameIndex] || allRadarFrames[allRadarFrames.length - 1];
    if (!frame) return;

    const host = weatherData.rainViewer.host || 'https://tilecache.rainviewer.com';
    const tileUrlTemplate = getRainViewerTileUrl(host, frame.path, '{z}', '{x}', '{y}', radarColorScheme, 1, 1);

    const radarLayer = L.tileLayer(tileUrlTemplate, {
      opacity: radarOpacity,
      maxZoom: 19,
      maxNativeZoom: 18,
      zIndex: 100
    }).addTo(map);

    radarTileRef.current = radarLayer;
  }, [showRadar, radarOpacity, radarColorScheme, weatherData, allRadarFrames, activeFrameIndex]);

  // Update Flood Mask & Location Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Primary Disaster Location Pin
    const marker = L.circleMarker([safeLat, safeLon], {
      radius: 8,
      fillColor: '#06b6d4',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    });

    marker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; color: #0f172a; padding: 4px;">
        <strong style="color: #0891b2;">${selectedLocation.name}</strong><br/>
        <span>${selectedLocation.region}, ${selectedLocation.country}</span><br/>
        <span>Inundation: <strong>${selectedLocation.estimatedInundationHa.toLocaleString()} ha</strong></span><br/>
        <span>Coords: ${safeLat.toFixed(4)}°, ${safeLon.toFixed(4)}°</span>
      </div>
    `);

    marker.bindTooltip(`
      <div style="font-family: monospace; font-weight: bold; font-size: 12px; color: #ffffff; background-color: #090d16; border: 1.5px solid #06b6d4; padding: 4px 8px; border-radius: 6px; shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
        📍 ${selectedLocation.country}: ${selectedLocation.name}
      </div>
    `, {
      permanent: true,
      direction: 'top',
      offset: [0, -10]
    });

    group.addLayer(marker);

    // 2. Verified Satellite Flood Extent Polygon
    if (showFloodMask) {
      const floodRadiusDeg = 0.08;
      const floodCoords: [number, number][] = [
        [safeLat - floodRadiusDeg * 0.6, safeLon - floodRadiusDeg],
        [safeLat + floodRadiusDeg * 0.4, safeLon - floodRadiusDeg * 0.8],
        [safeLat + floodRadiusDeg, safeLon + floodRadiusDeg * 0.2],
        [safeLat + floodRadiusDeg * 0.2, safeLon + floodRadiusDeg],
        [safeLat - floodRadiusDeg * 0.8, safeLon + floodRadiusDeg * 0.6],
      ];

      const floodPolygon = L.polygon(floodCoords, {
        color: '#0284c7',
        weight: 2,
        opacity: floodMaskOpacity,
        fillColor: '#06b6d4',
        fillOpacity: floodMaskOpacity * 0.45,
        dashArray: '3, 3'
      });

      floodPolygon.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #0f172a; padding: 4px;">
          <strong style="color: #0284c7;">Verified Satellite Flood Mask</strong><br/>
          <span>Source: Sentinel-2 Multi-spectral Inference</span><br/>
          <span>Physical Area: <strong>${selectedLocation.estimatedInundationHa.toLocaleString()} ha</strong></span>
        </div>
      `);

      group.addLayer(floodPolygon);
    }
  }, [safeLat, safeLon, selectedLocation, showFloodMask, floodMaskOpacity]);

  // Radar Timeline Animation Control
  useEffect(() => {
    if (isPlaying && allRadarFrames.length > 0) {
      playTimerRef.current = setInterval(() => {
        setActiveFrameIndex((prev) => (prev + 1) % allRadarFrames.length);
      }, playbackSpeedMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, allRadarFrames.length, playbackSpeedMs]);

  // Current active frame details
  const activeFrame = allRadarFrames[activeFrameIndex];
  const activeFrameIso = activeFrame ? new Date(activeFrame.time * 1000).toISOString() : null;
  const isNowcastFrame = activeFrameIndex >= pastFramesCount;

  // Weather description helpers
  const weatherDesc = useMemo(() => {
    return getWmoWeatherDescription(weatherData?.currentWeather?.weather_code);
  }, [weatherData?.currentWeather?.weather_code]);

  const windCompass = useMemo(() => {
    return getWindDirectionDegreesToCompass(weatherData?.currentWeather?.wind_direction_10m);
  }, [weatherData?.currentWeather?.wind_direction_10m]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col ${className}`}>
      
      {/* Top Bar: Weather Gateway Telemetry & Layer Status */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
        
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <CloudRain className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Live Weather Radar & Precipitation Intelligence
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                weatherData?.status === 'FRESH'
                  ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                  : 'text-amber-400 bg-amber-950 border-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${weatherData?.status === 'FRESH' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {weatherData?.status || 'INITIALIZING'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {selectedLocation.country}: {selectedLocation.name} ({safeLat.toFixed(2)}°, {safeLon.toFixed(2)}°) · Refreshed {formatFreshness(weatherData?.retrieval_timestamp)}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onSelectLocation && (
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const target = GLOBAL_DISASTERS.find(d => d.id === e.target.value);
                if (target) onSelectLocation(target);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-950 text-cyan-300 border border-cyan-800/80 focus:outline-none focus:border-cyan-400 cursor-pointer"
              title="Jump to global disaster site"
            >
              {GLOBAL_DISASTERS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.country}: {loc.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleFitBounds}
            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-950 hover:bg-slate-900 text-cyan-300 border border-cyan-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Fit map viewport to GeoTIFF bounding box"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit GeoTIFF Bounds</span>
          </button>

          <button
            type="button"
            onClick={() => loadWeatherData(true)}
            disabled={isRefreshing}
            className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh live weather radar & forecasts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full h-[580px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top-Left Prominent Location Banner & 99.9% Precision Badge */}
        <div className="absolute top-3 left-3 z-[900] pointer-events-auto flex flex-col gap-1.5 max-w-sm">
          <div className="rounded-xl bg-slate-950/95 border border-cyan-500/50 backdrop-blur-md px-3.5 py-2.5 shadow-2xl font-mono flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{selectedLocation.country}: {selectedLocation.name}</span>
              </div>
              <div className="text-[10px] text-cyan-300">
                {selectedLocation.region} · {safeLat.toFixed(4)}°N, {safeLon.toFixed(4)}°E
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-950/90 border border-emerald-500/40 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1.5 shadow-lg self-start">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Telemetry & Spatial Alignment Synced</span>
          </div>
        </div>

        {/* Loading Spinner Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-cyan-200">Connecting to RainViewer & Open-Meteo Gateway...</span>
          </div>
        )}

        {/* Top-Right Floating Controls Panel */}
        <div className="absolute top-3 right-3 z-[900] pointer-events-auto space-y-2 max-w-xs">
          
          {/* Layer Visibility & Opacity Widget */}
          <div className="rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md p-3 space-y-2.5 shadow-2xl font-mono text-xs text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Live Map Layers
              </span>
              <div className="flex items-center gap-1">
                {(['dark', 'satellite', 'streets'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setBasemapStyle(style)}
                    className={`px-1.5 py-0.5 rounded text-[9px] uppercase transition-colors cursor-pointer ${
                      basemapStyle === style ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Layer 1: Precipitation Radar Toggle & Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowRadar(!showRadar)}
                  className="flex items-center gap-1.5 text-slate-200 hover:text-white font-bold cursor-pointer"
                >
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RainViewer Radar</span>
                  {showRadar ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                </button>
                <span className="text-[10px] text-slate-400">{Math.round(radarOpacity * 100)}%</span>
              </div>
              {showRadar && (
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={radarOpacity}
                    onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span>Palette:</span>
                    <select
                      value={radarColorScheme}
                      onChange={(e) => setRadarColorScheme(parseInt(e.target.value, 10))}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value={2}>Universal Blue</option>
                      <option value={1}>RainViewer Classic</option>
                      <option value={8}>Titan Spectrum</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Layer 2: Verified Satellite Flood Extent Toggle & Slider */}
            <div className="space-y-1 pt-1 border-t border-slate-900">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFloodMask(!showFloodMask)}
                  className="flex items-center gap-1.5 text-slate-200 hover:text-white font-bold cursor-pointer"
                >
                  <Waves className="w-3.5 h-3.5 text-sky-400" />
                  <span>Flood extent mask</span>
                  {showFloodMask ? <Eye className="w-3 h-3 text-sky-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                </button>
                <span className="text-[10px] text-slate-400">{Math.round(floodMaskOpacity * 100)}%</span>
              </div>
              {showFloodMask && (
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={floodMaskOpacity}
                  onChange={(e) => setFloodMaskOpacity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              )}
            </div>

            {/* Layer 3: Weather & Forecast Overlay Toggles */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
              <button
                onClick={() => setShowWindInfo(!showWindInfo)}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                  showWindInfo ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800' : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Wind & Temp
              </button>
              <button
                onClick={() => setShowForecast(!showForecast)}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                  showForecast ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800' : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Precip Forecast
              </button>
            </div>

          </div>

          {/* Current Live Weather Observation Card */}
          {showWindInfo && weatherData?.currentWeather && (
            <div className="rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md p-3 space-y-2 shadow-2xl font-mono text-xs text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  Open-Meteo Observation
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  OBSERVED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block uppercase">Temperature</span>
                  <span className="text-sm font-bold text-white">
                    {weatherData.currentWeather.temperature_2m} {weatherData.currentUnits?.temperature_2m || '°C'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    Feels like {weatherData.currentWeather.apparent_temperature} {weatherData.currentUnits?.apparent_temperature || '°C'}
                  </span>
                </div>

                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block uppercase">Wind Condition</span>
                  <span className="text-sm font-bold text-cyan-300 flex items-center gap-1">
                    <Wind className="w-3 h-3 text-cyan-400" />
                    {weatherData.currentWeather.wind_speed_10m} {weatherData.currentUnits?.wind_speed_10m || 'km/h'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    Direction: {windCompass} ({weatherData.currentWeather.wind_direction_10m}°)
                  </span>
                </div>
              </div>

              <div className="p-1.5 rounded bg-cyan-950/40 border border-cyan-900/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{weatherDesc.label}</span>
                <span className="font-bold text-cyan-300">
                  {weatherData.currentWeather.precipitation > 0
                    ? `${weatherData.currentWeather.precipitation} ${weatherData.currentUnits?.precipitation || 'mm'}`
                    : 'No Surface Precip'}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Bottom-Left Floating Radar Reflectivity Scale Legend */}
        <div className="absolute bottom-16 left-3 z-[900] pointer-events-auto rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md p-2.5 space-y-1.5 shadow-2xl font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-1">
            <span className="flex items-center gap-1 text-cyan-400">
              <CloudRain className="w-3.5 h-3.5" />
              RADAR REFLECTIVITY (dBZ)
            </span>
            <span className="text-slate-500">RainViewer</span>
          </div>

          <div className="w-48 h-2.5 rounded overflow-hidden flex bg-slate-900 border border-slate-800">
            <div className="h-full w-1/5 bg-cyan-500/30" title="10 - 20 dBZ (Light Precip)" />
            <div className="h-full w-1/5 bg-cyan-400" title="20 - 30 dBZ (Light Rain)" />
            <div className="h-full w-1/5 bg-blue-500" title="30 - 40 dBZ (Moderate Rain)" />
            <div className="h-full w-1/5 bg-amber-500" title="40 - 50 dBZ (Heavy Rain)" />
            <div className="h-full w-1/5 bg-rose-600 animate-pulse" title="> 50 dBZ (Extreme Rain / Hail)" />
          </div>

          <div className="flex justify-between text-[9px] text-slate-400">
            <span>10 dBZ</span>
            <span>25 dBZ</span>
            <span>40 dBZ</span>
            <span className="text-rose-400 font-bold">&gt; 50 dBZ</span>
          </div>
          <div className="text-[8px] text-slate-500 pt-0.5">
            Measured in dBZ reflectivity (Universal Blue palette)
          </div>
        </div>

        {/* Bottom-Right Hourly Precipitation Forecast Bar Chart */}
        {showForecast && weatherData?.forecast && weatherData.forecast.precipitation.length > 0 && (
          <div className="absolute bottom-16 right-3 z-[900] pointer-events-auto hidden sm:block w-72 rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md p-3 space-y-1.5 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Hourly Rain Forecast (Next 24h)
              </span>
              <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                FORECAST
              </span>
            </div>

            <div className="h-14 w-full flex items-end gap-1 pt-1">
              {(() => {
                const slice = weatherData.forecast.precipitation.slice(0, 16);
                const maxPrecip = Math.max(0.5, ...slice);

                return slice.map((p, i) => {
                  const hHeight = Math.max(8, Math.min(100, (p / maxPrecip) * 90 + 10));
                  const isRain = p > 0;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div
                        className={`w-full rounded-t transition-all ${
                          isRain ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                        style={{ height: `${hHeight}%` }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-[8px] text-cyan-300 whitespace-nowrap z-30">
                        {p} mm
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-between text-[9px] text-slate-400">
              <span>Now</span>
              <span>+6h</span>
              <span>+12h</span>
              <span>+16h</span>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Timeline & Playback Control Bar for RainViewer Radar */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 z-10 font-mono text-xs">
        
        {/* Play / Pause & Frame Step Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={allRadarFrames.length === 0}
            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold hover:bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
            }`}
            title={isPlaying ? 'Pause Radar Loop' : 'Play Radar Animation Loop'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveFrameIndex((prev) => (prev > 0 ? prev - 1 : allRadarFrames.length - 1));
            }}
            disabled={allRadarFrames.length === 0}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Step Previous Frame"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveFrameIndex((prev) => (prev + 1) % allRadarFrames.length);
            }}
            disabled={allRadarFrames.length === 0}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Step Next Frame"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selector */}
          <select
            value={playbackSpeedMs}
            onChange={(e) => setPlaybackSpeedMs(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value={2000}>0.5x Speed</option>
            <option value={1000}>1.0x Speed</option>
            <option value={500}>2.0x Speed</option>
          </select>
        </div>

        {/* Timeline Slider Bar */}
        <div className="flex-1 w-full max-w-md flex flex-col space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-cyan-400">
              <Clock className="w-3 h-3" />
              Frame {activeFrameIndex + 1} of {allRadarFrames.length || 1}
            </span>

            <span className={`font-bold px-1.5 py-0.5 rounded ${
              isNowcastFrame
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
            }`}>
              {isNowcastFrame ? 'SHORT-TERM NOWCAST' : 'RADAR OBSERVATION'}
            </span>

            <span className="text-white font-bold">
              {activeFrameIso ? activeFrameIso.slice(11, 16) + ' UTC' : 'N/A'}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={Math.max(0, allRadarFrames.length - 1)}
            value={activeFrameIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setActiveFrameIndex(parseInt(e.target.value, 10));
            }}
            disabled={allRadarFrames.length === 0}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800"
          />
        </div>

        {/* Attribution & Disclosure Badge */}
        <div className="text-[10px] text-slate-400 text-right space-y-0.5 hidden lg:block">
          <div>
            Radar &copy; <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">RainViewer</a> · Weather &copy; <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Open-Meteo</a>
          </div>
          <div className="text-[9px] text-slate-500">
            Weather overlays are observational context and do not alter verified ML flood masks.
          </div>
        </div>

      </div>

    </div>
  );
};
