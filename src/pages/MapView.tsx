import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Layers, 
  Eye, 
  EyeOff,
  Compass, 
  Maximize2, 
  Info, 
  Crosshair, 
  SlidersHorizontal,
  Activity,
  AlertTriangle,
  Satellite,
  MapPin,
  Map as MapIcon,
  Mountain,
  Waves,
  Search,
  Globe,
  Filter,
  ChevronRight,
  Columns,
  Navigation,
  ShieldCheck,
  CloudRain
} from 'lucide-react';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../data/globalDisasters';
import { ExtrudedFloodTerrainR3F } from '../components/3d/ExtrudedFloodTerrainR3F';
import { GoogleRealtimeMap } from '../components/map/GoogleRealtimeMap';
import { LiveWeatherMap } from '../components/map/LiveWeatherMap';
import { SideBySideCompareView } from '../components/map/SideBySideCompareView';
import { MapLayerConfig, DEFAULT_LAYER_CONFIG } from '../components/map/LayerControl';
import { AnalysisSummary } from '../types';

export interface MapViewProps {
  activeAnalysis?: AnalysisSummary | null;
}

export const MapView: React.FC<MapViewProps> = ({ activeAnalysis }) => {
  const [viewMode, setViewMode] = useState<'realtime-google' | 'live-weather' | '3d-terrain' | 'split-view'>('realtime-google');
  const [selectedHotspot, setSelectedHotspot] = useState<GlobalDisasterLocation>(GLOBAL_DISASTERS[0]);
  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Global layer control state across MapView
  const [layerConfig, setLayerConfig] = useState<MapLayerConfig>(DEFAULT_LAYER_CONFIG);

  // Filtered disaster list
  const filteredDisasters = useMemo(() => {
    return GLOBAL_DISASTERS.filter((spot) => {
      const matchCont = selectedContinent === 'All' || spot.continent === selectedContinent;
      const matchSev = severityFilter === 'All' || spot.severity === severityFilter;
      const matchQuery =
        searchQuery.trim() === '' ||
        spot.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.event.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCont && matchSev && matchQuery;
    });
  }, [selectedContinent, severityFilter, searchQuery]);

  const handleSelectLocation = (spot: GlobalDisasterLocation) => {
    setSelectedHotspot(spot);
  };

  const handleSwitchTo3D = (spot: GlobalDisasterLocation) => {
    setSelectedHotspot(spot);
    setViewMode('3d-terrain');
  };

  // Toggle individual layers from the top header
  const toggleLayer = (layerKey: 'satellite' | 'floodMask' | 'confidenceHeatmap' | 'emergencyRoutes') => {
    setLayerConfig(prev => ({
      ...prev,
      [layerKey]: {
        ...prev[layerKey],
        enabled: !prev[layerKey].enabled
      }
    }));
  };

  const activeLayersCount = [
    layerConfig.satellite.enabled,
    layerConfig.floodMask.enabled,
    layerConfig.confidenceHeatmap.enabled,
    layerConfig.emergencyRoutes.enabled
  ].filter(Boolean).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-[calc(100vh-4rem)] w-full bg-[#020613] flex flex-col p-3 sm:p-5 space-y-3 text-left"
    >
      
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl glass-panel border border-slate-800 backdrop-blur-md shadow-lg">
        
        {/* Left: Active Location Details */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            {viewMode === '3d-terrain' ? (
              <Mountain className="w-5 h-5" />
            ) : viewMode === 'split-view' ? (
              <Columns className="w-5 h-5" />
            ) : (
              <Satellite className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
                {viewMode === '3d-terrain'
                  ? '3D Extruded Topography & Flood Inundation'
                  : viewMode === 'split-view'
                  ? 'Side-by-side View: Historical Baseline vs Flood Analysis'
                  : viewMode === 'live-weather'
                  ? 'Real-Time Radar & Precipitation Telemetry'
                  : 'Real-Time Google Satellite & Elevation Analysis'}
              </h1>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                {selectedHotspot.country} · {selectedHotspot.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedHotspot.event} · Inundation: <strong className="text-cyan-300">{selectedHotspot.estimatedInundationHa.toLocaleString()} ha</strong> ({selectedHotspot.sensor})
            </p>
          </div>
        </div>

        {/* Center: Global Layer Control Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 self-start lg:self-auto flex-wrap">
          <div className="px-2 py-1 text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Layers:</span>
          </div>

          {/* Toggle Satellite Imagery */}
          <button
            type="button"
            onClick={() => toggleLayer('satellite')}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              layerConfig.satellite.enabled
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-slate-800'
            }`}
            title="Toggle Satellite Imagery Layer"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Satellite</span>
            {layerConfig.satellite.enabled ? (
              <Eye className="w-3 h-3 text-cyan-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-slate-600" />
            )}
          </button>

          {/* Toggle Flood Inundation Masks */}
          <button
            type="button"
            onClick={() => toggleLayer('floodMask')}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              layerConfig.floodMask.enabled
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-slate-800'
            }`}
            title="Toggle Flood Inundation Mask Layer"
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Flood Mask</span>
            {layerConfig.floodMask.enabled ? (
              <Eye className="w-3 h-3 text-cyan-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-slate-600" />
            )}
          </button>

          {/* Toggle Confidence Heatmap (Model Uncertainty) */}
          <button
            type="button"
            onClick={() => toggleLayer('confidenceHeatmap')}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              layerConfig.confidenceHeatmap.enabled
                ? 'bg-amber-950 text-amber-300 border border-amber-500/50 font-bold shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-slate-800'
            }`}
            title="Toggle Model Confidence Heatmap (Show areas of higher classification uncertainty)"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Confidence Heatmap</span>
            {layerConfig.confidenceHeatmap.enabled ? (
              <Eye className="w-3 h-3 text-amber-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-slate-600" />
            )}
          </button>

          {/* Toggle Emergency Route Overlays */}
          <button
            type="button"
            onClick={() => toggleLayer('emergencyRoutes')}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              layerConfig.emergencyRoutes.enabled
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-slate-800'
            }`}
            title="Toggle Emergency Evacuation Routes Layer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Emergency Routes</span>
            {layerConfig.emergencyRoutes.enabled ? (
              <Eye className="w-3 h-3 text-emerald-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-slate-600" />
            )}
          </button>
        </div>

        {/* Right: Mode Switcher & Sidebar Toggle */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('realtime-google')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'realtime-google'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Real-Time Maps</span>
            </button>

            <button
              onClick={() => setViewMode('live-weather')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'live-weather'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>Live Weather Map</span>
            </button>

            <button
              onClick={() => setViewMode('3d-terrain')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === '3d-terrain'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>3D Extrusion</span>
            </button>

            <button
              onClick={() => setViewMode('split-view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'split-view'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Side-by-side View</span>
            </button>
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3 py-2 text-xs font-mono rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isSidebarOpen
                ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Locations Sidebar"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disasters ({filteredDisasters.length})</span>
          </button>
        </div>

      </div>

      {/* Main Content Layout: Viewport + Sidebar Side-by-Side */}
      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* Main Spatial Viewport */}
        <div className={`w-full transition-all duration-300 ${isSidebarOpen ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'}`}>
          {viewMode === 'realtime-google' && (
            <GoogleRealtimeMap
              locations={filteredDisasters}
              selectedLocation={selectedHotspot}
              onSelectLocation={handleSelectLocation}
              onSwitchTo3D={handleSwitchTo3D}
              layerConfig={layerConfig}
              onLayerConfigChange={setLayerConfig}
              activeAnalysis={activeAnalysis}
              className="w-full"
            />
          )}

          {viewMode === 'live-weather' && (
            <LiveWeatherMap
              selectedLocation={selectedHotspot}
              onSelectLocation={handleSelectLocation}
              className="w-full"
            />
          )}

          {viewMode === '3d-terrain' && (
            <ExtrudedFloodTerrainR3F
              key={selectedHotspot.id}
              selectedLocation={`${selectedHotspot.name}, ${selectedHotspot.country}`}
              terrainType={selectedHotspot.terrainType}
              floodCoveragePercent={
                layerConfig.floodMask.enabled
                  ? Math.min(85, Math.max(15, (selectedHotspot.estimatedInundationHa / 1500) * layerConfig.floodMask.opacity))
                  : 0
              }
              initialWaterLevel={
                layerConfig.floodMask.enabled
                  ? Math.min(0.8, Math.max(0.2, (selectedHotspot.peakFloodStageMeters / 10) * layerConfig.floodMask.opacity))
                  : 0.05
              }
              extrusionScale={2.0}
              className="w-full"
            />
          )}

          {viewMode === 'split-view' && (
            <SideBySideCompareView
              key={`side-by-side-${selectedHotspot.id}`}
              selectedLocation={selectedHotspot}
              activeAnalysis={activeAnalysis}
              className="w-full"
            />
          )}
        </div>

        {/* Global Disaster Catalog Sidebar */}
        {isSidebarOpen && (
          <div className="w-full lg:col-span-4 xl:col-span-3 rounded-2xl glass-panel p-3.5 space-y-3 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                  Global Disaster Catalog
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {filteredDisasters.length} Sites
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country, river, basin..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Continent Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {['All', 'Africa', 'Asia', 'Europe', 'Americas', 'Oceania'].map((c) => {
                const isAll = c === 'All';
                const contKey = c === 'Americas' ? 'North America' : c;
                const isSelected = selectedContinent === (isAll ? 'All' : contKey);
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedContinent(isAll ? 'All' : contKey)}
                    className={`px-2 py-1 text-[10px] font-mono rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {/* Disaster Location Cards List */}
            <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
              {filteredDisasters.map((spot) => {
                const isSelected = selectedHotspot.id === spot.id;
                return (
                  <button
                    key={spot.id}
                    onClick={() => handleSelectLocation(spot)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-mono transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white'
                        : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold flex items-start gap-1.5">
                        <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className="leading-snug">{spot.country} · {spot.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {spot.region} · {spot.event}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                        <span>{spot.estimatedInundationHa.toLocaleString()} ha</span>
                        <span>·</span>
                        <span className="text-cyan-400">{spot.verifiedChips} chips</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        spot.severity === 'Catastrophic' ? 'bg-rose-950 text-rose-300 border border-rose-800/50' : 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                      }`}>
                        {spot.severity}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tactical Overlays Status Card */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  ACTIVE OVERLAYS ({activeLayersCount}/3)
                </span>
                <span className="text-emerald-400 font-bold">READY</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[9px] text-center pt-1 border-t border-slate-900">
                <div className={`p-1 rounded ${layerConfig.satellite.enabled ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-900 text-slate-600'}`}>
                  Satellite
                </div>
                <div className={`p-1 rounded ${layerConfig.floodMask.enabled ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-900 text-slate-600'}`}>
                  Flood Mask
                </div>
                <div className={`p-1 rounded ${layerConfig.emergencyRoutes.enabled ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-900 text-slate-600'}`}>
                  Evac Routes
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

    </motion.div>
  );
};
