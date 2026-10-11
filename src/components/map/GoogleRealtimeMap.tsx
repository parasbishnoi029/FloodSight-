// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
  Polygon,
  Polyline
} from '@vis.gl/react-google-maps';
import { 
  Satellite, 
  MapPin, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Compass, 
  Mountain, 
  Waves, 
  Crosshair, 
  Maximize2, 
  Search, 
  Info,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Loader2,
  Navigation,
  Home,
  CheckCircle2,
  Sliders,
  Eye,
  EyeOff
} from 'lucide-react';
import { GlobalDisasterLocation } from '../../data/globalDisasters';
import {
  generateDisasterOverlays,
  DisasterTacticalOverlays,
  EmergencyRoute,
  EmergencyShelter
} from '../../services/floodOverlays';
import {
  LayerControl,
  MapLayerConfig,
  DEFAULT_LAYER_CONFIG
} from './LayerControl';

export interface GoogleRealtimeMapProps {
  locations: GlobalDisasterLocation[];
  selectedLocation: GlobalDisasterLocation;
  onSelectLocation: (location: GlobalDisasterLocation) => void;
  onSwitchTo3D?: (location: GlobalDisasterLocation) => void;
  layerConfig?: MapLayerConfig;
  onLayerConfigChange?: (layers: MapLayerConfig) => void;
  className?: string;
}

interface ElevationProbe {
  lat: number;
  lng: number;
  elevation: number;
  resolution: number;
  locationName?: string;
}

interface PathElevationPoint {
  elevation: number;
  lat: number;
  lng: number;
}

// Inner Controller that has access to useMap and useMapsLibrary
const MapController: React.FC<{
  selectedLocation: GlobalDisasterLocation;
  onProbeResult: (probe: ElevationProbe | null) => void;
  onProfileResult: (profile: PathElevationPoint[]) => void;
  isInspecting: boolean;
}> = ({ selectedLocation, onProbeResult, onProfileResult, isInspecting }) => {
  const map = useMap();
  const elevationLib = useMapsLibrary('elevation');
  const [elevationService, setElevationService] = useState<google.maps.ElevationService | null>(null);

  // Initialize Elevation Service
  useEffect(() => {
    if (elevationLib) {
      setElevationService(new elevationLib.ElevationService());
    }
  }, [elevationLib]);

  // Pan to selected location when changed
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lon });
    map.setZoom(8);
  }, [map, selectedLocation]);

  // Sample real elevation across the river basin for the selected disaster
  useEffect(() => {
    if (!elevationService) return;

    // 1. Single-point elevation for disaster epicenter
    elevationService.getElevationForLocations(
      { locations: [{ lat: selectedLocation.lat, lng: selectedLocation.lon }] },
      (results, status) => {
        if (status === 'OVER_QUERY_LIMIT') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (status === 'OK' && results && results[0]) {
          onProbeResult({
            lat: selectedLocation.lat,
            lng: selectedLocation.lon,
            elevation: Number(results[0].elevation.toFixed(1)),
            resolution: Number(results[0].resolution.toFixed(1)),
            locationName: `${selectedLocation.country}: ${selectedLocation.name}`,
          });
        }
      }
    );

    // 2. Cross-section elevation profile across river basin (5km transect)
    const latDelta = 0.025;
    const lonDelta = 0.025;
    const path = [
      { lat: selectedLocation.lat - latDelta, lng: selectedLocation.lon - lonDelta },
      { lat: selectedLocation.lat + latDelta, lng: selectedLocation.lon + lonDelta }
    ];

    elevationService.getElevationAlongPath(
      { path: path, samples: 16 },
      (results, status) => {
        if (status === 'OVER_QUERY_LIMIT') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (status === 'OK' && results) {
          const profile = results.map((r: google.maps.ElevationResult) => ({
            elevation: Number(r.elevation.toFixed(1)),
            lat: r.location ? r.location.lat() : selectedLocation.lat,
            lng: r.location ? r.location.lng() : selectedLocation.lon
          }));
          onProfileResult(profile);
        }
      }
    );
  }, [elevationService, selectedLocation, onProbeResult, onProfileResult]);

  // Handle map click to probe real ground elevation anywhere
  useEffect(() => {
    if (!map || !elevationService) return;

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      elevationService.getElevationForLocations(
        { locations: [{ lat, lng }] },
        (results, status) => {
          if (status === 'OVER_QUERY_LIMIT') {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          if (status === 'OK' && results && results[0]) {
            onProbeResult({
              lat: Number(lat.toFixed(5)),
              lng: Number(lng.toFixed(5)),
              elevation: Number(results[0].elevation.toFixed(1)),
              resolution: Number(results[0].resolution.toFixed(1)),
              locationName: `Sampled Coordinate (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
            });
          }
        }
      );
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, elevationService, onProbeResult]);

  return null;
};

export const GoogleRealtimeMap: React.FC<GoogleRealtimeMapProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onSwitchTo3D,
  layerConfig: externalLayerConfig,
  onLayerConfigChange,
  className = ''
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Internal layer state if not controlled externally
  const [internalLayers, setInternalLayers] = useState<MapLayerConfig>(DEFAULT_LAYER_CONFIG);
  const layers = externalLayerConfig || internalLayers;

  const handleLayersChange = (newLayers: MapLayerConfig) => {
    if (onLayerConfigChange) {
      onLayerConfigChange(newLayers);
    } else {
      setInternalLayers(newLayers);
    }
  };

  const [activeInfoWindowId, setActiveInfoWindowId] = useState<string | null>(selectedLocation.id);
  const [selectedShelter, setSelectedShelter] = useState<EmergencyShelter | null>(null);
  const [selectedSeveredRoute, setSelectedSeveredRoute] = useState<EmergencyRoute | null>(null);
  const [elevationProbe, setElevationProbe] = useState<ElevationProbe | null>(null);
  const [crossSectionProfile, setCrossSectionProfile] = useState<PathElevationPoint[]>([]);
  const [isLayerControlFloatingOpen, setIsLayerControlFloatingOpen] = useState<boolean>(true);

  // Compute hydrographically modeled tactical overlays for active disaster
  const overlays = useMemo<DisasterTacticalOverlays>(() => {
    return generateDisasterOverlays(selectedLocation);
  }, [selectedLocation]);

  // Determine effective Google Map mapTypeId based on layer configuration
  const mapTypeId = useMemo(() => {
    if (!layers.satellite.enabled) {
      return 'roadmap';
    }
    return layers.satellite.mode;
  }, [layers.satellite.enabled, layers.satellite.mode]);

  // Handle InfoWindow open
  const handleMarkerClick = (location: GlobalDisasterLocation) => {
    onSelectLocation(location);
    setActiveInfoWindowId(location.id);
    setSelectedShelter(null);
    setSelectedSeveredRoute(null);
  };

  // Vulnerability classification based on elevation
  const getVulnerabilityTag = (elevMeters: number) => {
    if (elevMeters < 10) return { label: 'CRITICAL INUNDATION ZONE', color: 'text-rose-400 bg-rose-950/80 border-rose-800' };
    if (elevMeters < 35) return { label: 'HIGH RIVERINE SURGE RISK', color: 'text-amber-400 bg-amber-950/80 border-amber-800' };
    if (elevMeters < 80) return { label: 'MODERATE RUNOFF BASIN', color: 'text-cyan-400 bg-cyan-950/80 border-cyan-800' };
    return { label: 'UPLAND FLOOD WATERSHED', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-800' };
  };

  const activeLayerCount = [
    layers.satellite.enabled,
    layers.floodMask.enabled,
    layers.emergencyRoutes.enabled
  ].filter(Boolean).length;

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col ${className}`}>
      
      {/* Top HUD: Real-Time Map Controls & Layer Bar */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur flex flex-wrap items-center justify-between gap-3 z-10">
        
        {/* Left: Active Live Telemetry & Location Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Satellite className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Google Maps Real-Time Geospatial Analysis
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE ELEVATION API ACTIVE
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {selectedLocation.country}: {selectedLocation.name} · {selectedLocation.estimatedInundationHa.toLocaleString()} ha inundated
            </p>
          </div>
        </div>

        {/* Right: Quick Layer Toggle Badges & Panel Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Quick Layer 1: Satellite Toggle */}
          <button
            type="button"
            onClick={() => handleLayersChange({
              ...layers,
              satellite: { ...layers.satellite, enabled: !layers.satellite.enabled }
            })}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
              layers.satellite.enabled
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle Satellite Imagery Basemap"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Satellite</span>
            <span className={`w-1.5 h-1.5 rounded-full ${layers.satellite.enabled ? 'bg-cyan-400' : 'bg-slate-600'}`} />
          </button>

          {/* Quick Layer 2: Flood Inundation Mask Toggle */}
          <button
            type="button"
            onClick={() => handleLayersChange({
              ...layers,
              floodMask: { ...layers.floodMask, enabled: !layers.floodMask.enabled }
            })}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
              layers.floodMask.enabled
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle Flood Inundation Masks"
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Flood Mask</span>
            <span className={`w-1.5 h-1.5 rounded-full ${layers.floodMask.enabled ? 'bg-cyan-400' : 'bg-slate-600'}`} />
          </button>

          {/* Quick Layer 3: Emergency Routes Toggle */}
          <button
            type="button"
            onClick={() => handleLayersChange({
              ...layers,
              emergencyRoutes: { ...layers.emergencyRoutes, enabled: !layers.emergencyRoutes.enabled }
            })}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
              layers.emergencyRoutes.enabled
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 font-bold shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle Emergency Evacuation Routes"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Evac Routes</span>
            <span className={`w-1.5 h-1.5 rounded-full ${layers.emergencyRoutes.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          </button>

          {/* Detailed Layer Control Panel Trigger */}
          <button
            type="button"
            onClick={() => setIsLayerControlFloatingOpen(!isLayerControlFloatingOpen)}
            className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
              isLayerControlFloatingOpen
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle Detailed Layer Control Panel"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers ({activeLayerCount}/3)</span>
          </button>

        </div>

      </div>

      {/* Main Google Maps Viewport Container */}
      <div className="relative w-full h-[620px]">
        <APIProvider apiKey={apiKey} libraries={['places', 'elevation', 'geometry']}>
          <Map
            defaultCenter={{ lat: selectedLocation.lat, lng: selectedLocation.lon }}
            defaultZoom={7}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapTypeId}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapController
              selectedLocation={selectedLocation}
              onProbeResult={setElevationProbe}
              onProfileResult={setCrossSectionProfile}
              isInspecting={true}
            />

            {/* ========================================================================= */}
            {/* LAYER 2: FLOOD INUNDATION MASKS (POLYGONS & CONTOURS)                     */}
            {/* ========================================================================= */}
            {layers.floodMask.enabled && (
              <>
                {/* Peripheral Runoff / Moderate Saturated Buffer Zone */}
                {layers.floodMask.showBuffer && overlays.floodGeometry.bufferInundationPath.length > 0 && (
                  <Polygon
                    paths={overlays.floodGeometry.bufferInundationPath}
                    strokeColor="#2563eb"
                    strokeOpacity={0.65}
                    strokeWeight={1.5}
                    fillColor="#1d4ed8"
                    fillOpacity={Math.max(0.1, layers.floodMask.opacity * 0.28)}
                    zIndex={5}
                  />
                )}

                {/* Core Deep Flood Inundation Boundary */}
                {layers.floodMask.showCore && overlays.floodGeometry.coreInundationPath.length > 0 && (
                  <Polygon
                    paths={overlays.floodGeometry.coreInundationPath}
                    strokeColor="#06b6d4"
                    strokeOpacity={Math.min(1.0, layers.floodMask.opacity + 0.25)}
                    strokeWeight={2.5}
                    fillColor="#06b6d4"
                    fillOpacity={layers.floodMask.opacity * 0.6}
                    zIndex={10}
                  />
                )}
              </>
            )}

            {/* ========================================================================= */}
            {/* LAYER 3: EMERGENCY EVACUATION ROUTE OVERLAYS & SHELTER HUBS               */}
            {/* ========================================================================= */}
            {layers.emergencyRoutes.enabled && (
              <>
                {/* Evacuation Polylines */}
                {overlays.emergencyRoutes.map((route) => {
                  if (route.type === 'SAFE_CORRIDOR' && !layers.emergencyRoutes.showSafeCorridors) return null;
                  if (route.type === 'SECONDARY_BYPASS' && !layers.emergencyRoutes.showSafeCorridors) return null;
                  if (route.type === 'SEVERED_SUBMERGED' && !layers.emergencyRoutes.showSeveredRoads) return null;

                  const isSevered = route.type === 'SEVERED_SUBMERGED';
                  const isPrimary = route.type === 'SAFE_CORRIDOR';
                  const strokeColor = isSevered ? '#ef4444' : isPrimary ? '#10b981' : '#f59e0b';
                  const strokeWeight = isSevered ? 4.5 : isPrimary ? 4.5 : 3.5;

                  return (
                    <Polyline
                      key={route.id}
                      path={route.path}
                      strokeColor={strokeColor}
                      strokeOpacity={layers.emergencyRoutes.opacity}
                      strokeWeight={strokeWeight}
                      zIndex={isSevered ? 25 : 20}
                    />
                  );
                })}

                {/* Submerged Highway Warning Marker at Severed Road Midpoint */}
                {layers.emergencyRoutes.showSeveredRoads && overlays.emergencyRoutes
                  .filter(r => r.type === 'SEVERED_SUBMERGED')
                  .map((route) => {
                    const midPoint = route.path[1] || route.path[0];
                    return (
                      <AdvancedMarker
                        key={`${route.id}-hazard-pin`}
                        position={midPoint}
                        title="ROAD IMPASSABLE - SUBMERGED"
                        onClick={() => setSelectedSeveredRoute(route)}
                      >
                        <div className="relative cursor-pointer group">
                          <div className="absolute -inset-2 rounded-full bg-rose-500 opacity-70 animate-ping pointer-events-none" />
                          <div className="relative px-2 py-1 rounded bg-rose-600 border-2 border-white text-white font-mono font-bold text-[10px] shadow-xl flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>CUT ROAD</span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })
                }

                {/* Emergency Relief Shelters / Muster Hubs Markers */}
                {layers.emergencyRoutes.showShelters && overlays.shelters.map((shelter) => (
                  <AdvancedMarker
                    key={shelter.id}
                    position={shelter.position}
                    title={shelter.name}
                    onClick={() => setSelectedShelter(shelter)}
                  >
                    <div className="relative cursor-pointer group">
                      <div className="relative px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 border-2 border-white text-white font-mono font-bold text-[10px] shadow-2xl flex items-center gap-1.5 transition-transform group-hover:scale-110">
                        <Home className="w-3.5 h-3.5 text-emerald-200" />
                        <span className="whitespace-nowrap">{shelter.name.split(' ')[0]} Hub</span>
                      </div>
                    </div>
                  </AdvancedMarker>
                ))}
              </>
            )}

            {/* ========================================================================= */}
            {/* DISASTER EPICENTER ADVANCED MARKERS                                       */}
            {/* ========================================================================= */}
            {locations.map((loc) => {
              const isSelected = loc.id === selectedLocation.id;
              const isCatastrophic = loc.severity === 'Catastrophic';
              const markerBg = isCatastrophic ? '#ef4444' : (loc.severity === 'Severe' ? '#06b6d4' : '#10b981');

              return (
                <AdvancedMarker
                  key={loc.id}
                  position={{ lat: loc.lat, lng: loc.lon }}
                  title={`${loc.country}: ${loc.name}`}
                  onClick={() => handleMarkerClick(loc)}
                >
                  <div className="relative cursor-pointer group">
                    <div
                      className="absolute -inset-2 rounded-full opacity-60 animate-ping pointer-events-none"
                      style={{ backgroundColor: markerBg }}
                    />
                    
                    <div
                      className={`relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${
                        isSelected ? 'ring-4 ring-cyan-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: markerBg }}
                    >
                      <Waves className="w-4 h-4" />
                    </div>

                    <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-white shadow pointer-events-none">
                      {loc.name.split(' ')[0]}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Elevation Probe Crosshair Pin if Clicked outside epicenters */}
            {elevationProbe && !locations.some(l => l.lat === elevationProbe.lat && l.lon === elevationProbe.lng) && (
              <AdvancedMarker position={{ lat: elevationProbe.lat, lng: elevationProbe.lng }}>
                <div className="relative cursor-pointer flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center text-slate-950 shadow-lg animate-bounce">
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Interactive InfoWindow for Selected Location */}
            {activeInfoWindowId && (
              <InfoWindow
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lon }}
                onCloseClick={() => setActiveInfoWindowId(null)}
              >
                <div className="font-mono text-slate-900 p-2 min-w-[260px] max-w-[320px] space-y-2">
                  <div className="border-b border-slate-200 pb-1.5 flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-cyan-800 leading-tight">
                        {selectedLocation.country}: {selectedLocation.name}
                      </h3>
                      <p className="text-[11px] text-slate-600">
                        {selectedLocation.region} · {selectedLocation.event}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      selectedLocation.severity === 'Catastrophic' ? 'bg-rose-100 text-rose-800' : 'bg-cyan-100 text-cyan-800'
                    }`}>
                      {selectedLocation.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="bg-slate-100 p-1.5 rounded">
                      <span className="text-[9px] text-slate-500 block uppercase">Inundated Area</span>
                      <strong className="text-cyan-700">{selectedLocation.estimatedInundationHa.toLocaleString()} ha</strong>
                    </div>

                    <div className="bg-slate-100 p-1.5 rounded">
                      <span className="text-[9px] text-slate-500 block uppercase">Population at Risk</span>
                      <strong className="text-rose-700">{selectedLocation.populationAtRisk.toLocaleString()}</strong>
                    </div>

                    <div className="bg-slate-100 p-1.5 rounded">
                      <span className="text-[9px] text-slate-500 block uppercase">Sensor / GSD</span>
                      <strong className="text-slate-800">{selectedLocation.sensor} (10m)</strong>
                    </div>

                    <div className="bg-slate-100 p-1.5 rounded">
                      <span className="text-[9px] text-slate-500 block uppercase">Evac Routes</span>
                      <strong className="text-emerald-700">2 Corridors / 1 Cut</strong>
                    </div>
                  </div>

                  {elevationProbe && (
                    <div className="bg-cyan-50 border border-cyan-200 p-1.5 rounded text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between text-cyan-900 font-bold">
                        <span>Real Ground Elevation:</span>
                        <span>{elevationProbe.elevation} m MSL</span>
                      </div>
                      <div className="text-[9px] text-cyan-700">
                        Resolution: ±{elevationProbe.resolution}m · Lat: {elevationProbe.lat.toFixed(4)}°, Lon: {elevationProbe.lng.toFixed(4)}°
                      </div>
                    </div>
                  )}

                  {onSwitchTo3D && (
                    <button
                      onClick={() => onSwitchTo3D(selectedLocation)}
                      className="w-full py-1.5 px-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Mountain className="w-3.5 h-3.5" />
                      <span>Extrude in 3D Topographic Mesh</span>
                    </button>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* Interactive InfoWindow for Clicked Emergency Shelter */}
            {selectedShelter && (
              <InfoWindow
                position={selectedShelter.position}
                onCloseClick={() => setSelectedShelter(null)}
              >
                <div className="font-mono text-slate-900 p-2 min-w-[240px] max-w-[280px] space-y-2">
                  <div className="border-b border-emerald-200 pb-1 flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-emerald-800 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-emerald-600" />
                        {selectedShelter.name}
                      </h4>
                      <span className="text-[10px] text-slate-500">Designated Upland Shelter</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {selectedShelter.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-emerald-50 border border-emerald-200/60 p-1 rounded">
                      <span className="text-[8px] text-slate-500 uppercase block">Capacity</span>
                      <strong className="text-emerald-900">
                        {selectedShelter.capacityPeople != null ? `${selectedShelter.capacityPeople.toLocaleString()} Persons` : 'NOT VERIFIED'}
                      </strong>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200/60 p-1 rounded">
                      <span className="text-[8px] text-slate-500 uppercase block">Elevation</span>
                      <strong className="text-emerald-900">
                        {selectedShelter.elevationMsl != null ? `+${selectedShelter.elevationMsl}m MSL` : 'NOT VERIFIED'}
                      </strong>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded leading-tight">
                    {selectedShelter.medicalFacilities === true ? ' Equipped with emergency medical post and water supply.' : ' High ground muster hub (facilities status unverified pending ground report).'}
                  </p>
                </div>
              </InfoWindow>
            )}

            {/* Interactive InfoWindow for Clicked Severed Highway Warning */}
            {selectedSeveredRoute && (
              <InfoWindow
                position={selectedSeveredRoute.path[1] || selectedSeveredRoute.path[0]}
                onCloseClick={() => setSelectedSeveredRoute(null)}
              >
                <div className="font-mono text-slate-900 p-2 min-w-[240px] max-w-[280px] space-y-2">
                  <div className="border-b border-rose-200 pb-1 flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Submerged Road Cut
                      </h4>
                      <span className="text-[10px] text-slate-500">{selectedSeveredRoute.name}</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      IMPASSABLE
                    </span>
                  </div>

                  <p className="text-[10px] text-rose-900 bg-rose-50 border border-rose-200 p-1.5 rounded">
                    {selectedSeveredRoute.statusText}
                  </p>

                  <div className="text-[10px] text-slate-600 flex items-center justify-between">
                    <span>Authorized transit:</span>
                    <strong className="text-slate-800">{selectedSeveredRoute.recommendedVehicle || 'RESTRICTED / EMERGENCY ONLY'}</strong>
                  </div>
                </div>
              </InfoWindow>
            )}

          </Map>
        </APIProvider>

        {/* ========================================================================= */}
        {/* FLOATING TACTICAL LAYER CONTROL WIDGET (TOP RIGHT)                        */}
        {/* ========================================================================= */}
        {isLayerControlFloatingOpen && (
          <div className="absolute top-3 right-3 z-20 pointer-events-auto">
            <LayerControl
              layers={layers}
              onChange={handleLayersChange}
              inundationHectares={selectedLocation.estimatedInundationHa}
              shelterCount={overlays.shelters.length}
              severedRouteCount={overlays.emergencyRoutes.filter(r => r.type === 'SEVERED_SUBMERGED').length}
            />
          </div>
        )}

        {/* Real-Time Ground Elevation Probe Overlay Card (Bottom Left) */}
        {elevationProbe && (
          <div className="absolute bottom-4 left-4 z-10 max-w-sm rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md p-3.5 space-y-2 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Mountain className="w-4 h-4" />
                <span>REAL-TIME ELEVATION TELEMETRY</span>
              </div>
              <span className="text-[10px] text-slate-400">Google Elevation API</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">True Terrain Elevation</span>
                <span className="text-2xl font-bold text-white tabular-nums">
                  {elevationProbe.elevation} <span className="text-xs text-cyan-400 font-normal">meters MSL</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Sample Accuracy</span>
                <span className="text-xs text-slate-300">±{elevationProbe.resolution}m GSD</span>
              </div>
            </div>

            {/* Vulnerability Pill */}
            {(() => {
              const tag = getVulnerabilityTag(elevationProbe.elevation);
              return (
                <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${tag.color}`}>
                  <span>{tag.label}</span>
                  <span>Flood Stage: +{selectedLocation.peakFloodStageMeters}m</span>
                </div>
              );
            })()}

            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
              <span>{elevationProbe.locationName || 'Clicked Coordinate'}</span>
              <span className="text-cyan-400">{elevationProbe.lat}° N, {elevationProbe.lng}° E</span>
            </div>
          </div>
        )}

        {/* Real-Time River Basin Cross-Section Profile (Bottom Right) */}
        {crossSectionProfile.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 hidden sm:block w-72 rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md p-3 space-y-2 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                River Basin Cross-Section (5km)
              </span>
              <span className="text-[9px] text-slate-400">16 Samples</span>
            </div>

            {/* Mini SVG Elevation Transect Chart */}
            <div className="h-16 w-full flex items-end gap-1 pt-2">
              {(() => {
                const elevs = crossSectionProfile.map(p => p.elevation);
                const min = Math.min(...elevs);
                const max = Math.max(...elevs);
                const range = Math.max(1, max - min);

                return crossSectionProfile.map((pt, i) => {
                  const heightPercent = Math.max(10, Math.min(100, ((pt.elevation - min) / range) * 90 + 10));
                  const isWaterLevel = pt.elevation <= (min + selectedLocation.peakFloodStageMeters);

                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          isWaterLevel ? 'bg-cyan-500/80 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-slate-700 hover:bg-slate-500'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-[8px] whitespace-nowrap text-cyan-300 z-20">
                        {pt.elevation}m
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Upstream Ridge</span>
              <span className="text-cyan-400">Valley / River Bed</span>
              <span>Downstream Basin</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
