import React, { useState } from 'react';
import {
  Layers,
  Satellite,
  Waves,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
  Home,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Compass
} from 'lucide-react';

export interface MapLayerConfig {
  satellite: {
    enabled: boolean;
    mode: 'hybrid' | 'satellite' | 'terrain' | 'roadmap';
  };
  floodMask: {
    enabled: boolean;
    opacity: number; // 0.1 to 1.0
    showCore: boolean;
    showBuffer: boolean;
    showContours: boolean;
  };
  emergencyRoutes: {
    enabled: boolean;
    showSafeCorridors: boolean;
    showSeveredRoads: boolean;
    showShelters: boolean;
    opacity: number; // 0.1 to 1.0
  };
}

export const DEFAULT_LAYER_CONFIG: MapLayerConfig = {
  satellite: {
    enabled: true,
    mode: 'hybrid'
  },
  floodMask: {
    enabled: true,
    opacity: 0.65,
    showCore: true,
    showBuffer: true,
    showContours: true
  },
  emergencyRoutes: {
    enabled: true,
    showSafeCorridors: true,
    showSeveredRoads: true,
    showShelters: true,
    opacity: 0.9
  }
};

interface LayerControlProps {
  layers: MapLayerConfig;
  onChange: (newLayers: MapLayerConfig) => void;
  className?: string;
  inundationHectares?: number;
  shelterCount?: number;
  severedRouteCount?: number;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onChange,
  className = '',
  inundationHectares,
  shelterCount = 2,
  severedRouteCount = 1
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // Active layer counter
  const activeCount = [
    layers.satellite.enabled,
    layers.floodMask.enabled,
    layers.emergencyRoutes.enabled
  ].filter(Boolean).length;

  const updateSatellite = (updates: Partial<MapLayerConfig['satellite']>) => {
    onChange({
      ...layers,
      satellite: { ...layers.satellite, ...updates }
    });
  };

  const updateFloodMask = (updates: Partial<MapLayerConfig['floodMask']>) => {
    onChange({
      ...layers,
      floodMask: { ...layers.floodMask, ...updates }
    });
  };

  const updateEmergencyRoutes = (updates: Partial<MapLayerConfig['emergencyRoutes']>) => {
    onChange({
      ...layers,
      emergencyRoutes: { ...layers.emergencyRoutes, ...updates }
    });
  };

  // Preset handlers
  const applyPreset = (preset: 'all' | 'satellite-only' | 'flood-only' | 'evac-only') => {
    switch (preset) {
      case 'all':
        onChange({
          satellite: { enabled: true, mode: 'hybrid' },
          floodMask: { enabled: true, opacity: 0.65, showCore: true, showBuffer: true, showContours: true },
          emergencyRoutes: { enabled: true, showSafeCorridors: true, showSeveredRoads: true, showShelters: true, opacity: 0.9 }
        });
        break;
      case 'satellite-only':
        onChange({
          satellite: { enabled: true, mode: 'satellite' },
          floodMask: { enabled: false, opacity: 0.65, showCore: false, showBuffer: false, showContours: false },
          emergencyRoutes: { enabled: false, showSafeCorridors: false, showSeveredRoads: false, showShelters: false, opacity: 0.9 }
        });
        break;
      case 'flood-only':
        onChange({
          satellite: { enabled: true, mode: 'hybrid' },
          floodMask: { enabled: true, opacity: 0.85, showCore: true, showBuffer: true, showContours: true },
          emergencyRoutes: { enabled: false, showSafeCorridors: false, showSeveredRoads: false, showShelters: false, opacity: 0.9 }
        });
        break;
      case 'evac-only':
        onChange({
          satellite: { enabled: true, mode: 'roadmap' },
          floodMask: { enabled: true, opacity: 0.4, showCore: true, showBuffer: false, showContours: false },
          emergencyRoutes: { enabled: true, showSafeCorridors: true, showSeveredRoads: true, showShelters: true, opacity: 1.0 }
        });
        break;
    }
  };

  return (
    <div className={`font-mono text-xs select-none ${className}`}>
      {/* Outer Shell */}
      <div className="w-80 sm:w-88 rounded-2xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-200">
        
        {/* Header Bar */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide uppercase text-xs">Layer Control</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeCount > 0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-400'
                }`}>
                  {activeCount}/3 Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLegend(!showLegend);
              }}
              title="Toggle Layer Legend"
              className={`p-1 rounded hover:text-white transition-colors cursor-pointer ${
                showLegend ? 'text-cyan-400 bg-cyan-950/50' : 'text-slate-400'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto pr-2">
            
            {/* Quick Tactical Presets */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Tactical Presets</span>
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-1.5 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer truncate"
                  title="Activate All Overlays"
                >
                  All Overlays
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('satellite-only')}
                  className="px-1.5 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer truncate"
                  title="Satellite Basemap Only"
                >
                  Satellite Only
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('flood-only')}
                  className="px-1.5 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer truncate"
                  title="Flood Extent Focused"
                >
                  Flood Mask
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('evac-only')}
                  className="px-1.5 py-1 text-[10px] rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 hover:border-emerald-500/50 transition-colors cursor-pointer truncate"
                  title="Evacuation Routes Focused"
                >
                  Evac Ops
                </button>
              </div>
            </div>

            {/* LAYER 1: SATELLITE IMAGERY */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              layers.satellite.enabled
                ? 'bg-slate-900/80 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                : 'bg-slate-900/30 border-slate-800/80 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    layers.satellite.enabled ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Satellite className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-[11px] block">1. Satellite Imagery</span>
                    <span className="text-[9px] text-slate-400">High-Res Optical Earth Observation</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateSatellite({ enabled: !layers.satellite.enabled })}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    layers.satellite.enabled ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={layers.satellite.enabled ? 'Disable Satellite Layer' : 'Enable Satellite Layer'}
                >
                  {layers.satellite.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {layers.satellite.enabled && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Basemap Mode:</span>
                    <span className="text-cyan-400 font-bold uppercase">{layers.satellite.mode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { key: 'hybrid', label: 'Hybrid' },
                      { key: 'satellite', label: 'Pure Optic' },
                      { key: 'terrain', label: 'Terrain' }
                    ].map((modeItem) => (
                      <button
                        key={modeItem.key}
                        type="button"
                        onClick={() => updateSatellite({ mode: modeItem.key as any })}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                          layers.satellite.mode === modeItem.key
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {modeItem.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* LAYER 2: FLOOD INUNDATION MASKS */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              layers.floodMask.enabled
                ? 'bg-slate-900/80 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                : 'bg-slate-900/30 border-slate-800/80 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    layers.floodMask.enabled ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Waves className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-[11px]">2. Flood Inundation Masks</span>
                      {inundationHectares && (
                        <span className="text-[9px] text-cyan-300 bg-cyan-950/80 px-1 rounded border border-cyan-800/60">
                          {inundationHectares.toLocaleString()} ha
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400">Sen1Floods11 Hydrological Boundary</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateFloodMask({ enabled: !layers.floodMask.enabled })}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    layers.floodMask.enabled ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={layers.floodMask.enabled ? 'Disable Flood Mask' : 'Enable Flood Mask'}
                >
                  {layers.floodMask.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {layers.floodMask.enabled && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-2">
                  {/* Opacity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-cyan-400" />
                        Mask Opacity:
                      </span>
                      <span className="text-cyan-300 font-bold">{Math.round(layers.floodMask.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="1.0"
                      step="0.05"
                      value={layers.floodMask.opacity}
                      onChange={(e) => updateFloodMask({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded cursor-pointer"
                    />
                  </div>

                  {/* Sub-layers checklist */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                    <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layers.floodMask.showCore}
                        onChange={(e) => updateFloodMask({ showCore: e.target.checked })}
                        className="rounded accent-cyan-500"
                      />
                      <span>Deep Core Pool</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layers.floodMask.showBuffer}
                        onChange={(e) => updateFloodMask({ showBuffer: e.target.checked })}
                        className="rounded accent-cyan-500"
                      />
                      <span>Runoff Buffer</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* LAYER 3: EMERGENCY ROUTE OVERLAYS */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              layers.emergencyRoutes.enabled
                ? 'bg-slate-900/80 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                : 'bg-slate-900/30 border-slate-800/80 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    layers.emergencyRoutes.enabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-[11px]">3. Emergency Route Overlays</span>
                      <span className="text-[9px] text-emerald-300 bg-emerald-950/80 px-1 rounded border border-emerald-800/60">
                        {shelterCount} Hubs
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">Evacuation Corridors & Submerged Cuts</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateEmergencyRoutes({ enabled: !layers.emergencyRoutes.enabled })}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    layers.emergencyRoutes.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={layers.emergencyRoutes.enabled ? 'Disable Emergency Routes' : 'Enable Emergency Routes'}
                >
                  {layers.emergencyRoutes.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {layers.emergencyRoutes.enabled && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="space-y-1.5 text-[10px]">
                    <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-1 rounded bg-emerald-400" />
                        <span>High-Ground Safe Corridors</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={layers.emergencyRoutes.showSafeCorridors}
                        onChange={(e) => updateEmergencyRoutes({ showSafeCorridors: e.target.checked })}
                        className="rounded accent-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-1 rounded bg-rose-500 border border-rose-300" />
                        <span>Submerged / Severed Roads</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={layers.emergencyRoutes.showSeveredRoads}
                        onChange={(e) => updateEmergencyRoutes({ showSeveredRoads: e.target.checked })}
                        className="rounded accent-rose-500"
                      />
                    </label>

                    <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                      <span className="flex items-center gap-1.5">
                        <Home className="w-3 h-3 text-amber-400" />
                        <span>Relief Hubs & Muster Shelters</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={layers.emergencyRoutes.showShelters}
                        onChange={(e) => updateEmergencyRoutes({ showShelters: e.target.checked })}
                        className="rounded accent-amber-500"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Tactical Color Legend */}
            {showLegend && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-[10px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="font-bold text-cyan-400 uppercase tracking-wider">Tactical Symbology</span>
                  <span className="text-slate-500">Legend</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3 rounded bg-cyan-500/80 border border-cyan-300 shrink-0" />
                    <span className="text-slate-300">Deep Inundation Core (&gt;2.5m stage)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3 rounded bg-blue-600/40 border border-blue-400 shrink-0" />
                    <span className="text-slate-300">Runoff Basin / Saturated Periphery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-1.5 rounded bg-emerald-400 shrink-0" />
                    <span className="text-slate-300">Open High-Ground Evacuation Ridge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-1.5 rounded bg-rose-500 shrink-0" />
                    <span className="text-slate-300">Severed Highway (Submerged / Impassable)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 border border-white shrink-0" />
                    <span className="text-slate-300">Emergency Base Shelter (Highland Dry)</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
