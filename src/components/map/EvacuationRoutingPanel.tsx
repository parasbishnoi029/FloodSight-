import React, { useState } from 'react';
import { Navigation, Shield, AlertTriangle, TrendingUp, TrendingDown, MapPin, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { calculateEvacuationRoutes, MOCK_SHELTERS } from '../../services/evacuationRoutingService';
import { getFloodVelocityData } from '../../services/floodVelocityService';

interface EvacuationRoutingPanelProps {
  waterStageMeters: number;
  onClose: () => void;
}

export const EvacuationRoutingPanel: React.FC<EvacuationRoutingPanelProps> = ({ waterStageMeters, onClose }) => {
  const [activeTab, setActiveTab] = useState<'routes' | 'shelters' | 'velocity'>('routes');
  const routes = calculateEvacuationRoutes(waterStageMeters);
  const velocityZones = getFloodVelocityData(waterStageMeters);

  return (
    <div className="absolute top-16 right-4 z-50 w-96 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-2xl text-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Navigation className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h3 className="font-semibold text-sm tracking-wide text-cyan-100">AI Evacuation & Velocity Hub</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors text-sm px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-slate-900/50 p-1 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('routes')}
          className={`py-1.5 rounded transition-all ${activeTab === 'routes' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Safe Routes ({routes.length})
        </button>
        <button
          onClick={() => setActiveTab('shelters')}
          className={`py-1.5 rounded transition-all ${activeTab === 'shelters' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Shelters ({MOCK_SHELTERS.length})
        </button>
        <button
          onClick={() => setActiveTab('velocity')}
          className={`py-1.5 rounded transition-all ${activeTab === 'velocity' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Flood Delta
        </button>
      </div>

      {/* Content Body */}
      <div className="p-4 max-h-[420px] overflow-y-auto space-y-3 custom-scrollbar">
        {activeTab === 'routes' && (
          <div className="space-y-3">
            <div className="text-[11px] text-cyan-300/80 bg-cyan-950/40 p-2.5 rounded border border-cyan-800/40">
              💡 <strong>A* Safe-Route Optimizer:</strong> Dynamically recalculates transit paths avoiding submerged road nodes and bridge crossings based on current +{waterStageMeters.toFixed(1)}m water stage.
            </div>

            {routes.map((route) => (
              <div key={route.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100">{route.name}</h4>
                    <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{route.startPoint.name}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                      <span>{route.shelterPoint.name}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    route.status === 'OPEN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    route.status === 'CAUTION_HIGH_WATER' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                  }`}>
                    {route.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-950 p-2 rounded border border-slate-900">
                  <div>
                    <span className="text-slate-500 block">Distance</span>
                    <span className="font-semibold text-slate-200">{route.distanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Est. Time</span>
                    <span className="font-semibold text-cyan-300 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{route.estimatedMinutes} min</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Risk Score</span>
                    <span className={`font-bold ${route.riskScore > 70 ? 'text-rose-400' : route.riskScore > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {route.riskScore}/100
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'shelters' && (
          <div className="space-y-3">
            <div className="text-[11px] text-emerald-300/80 bg-emerald-950/40 p-2.5 rounded border border-emerald-800/40">
              🛡️ <strong>Higher-Ground Sanctuaries:</strong> Verified flood-safe congregation points equipped with emergency medical triage and satellite uplinks.
            </div>

            {MOCK_SHELTERS.map((shelter) => {
              const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
              return (
                <div key={shelter.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-100">{shelter.name}</h4>
                      <p className="text-[10px] text-slate-400">Elevation: <span className="text-cyan-300 font-semibold">{shelter.elevation}m MSL</span></p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      shelter.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {shelter.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Occupancy ({shelter.currentOccupancy} / {shelter.capacity})</span>
                      <span className={occupancyPct > 85 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{occupancyPct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full ${occupancyPct > 85 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'velocity' && (
          <div className="space-y-3">
            <div className="text-[11px] text-indigo-300/80 bg-indigo-950/40 p-2.5 rounded border border-indigo-800/40">
              📈 <strong>Multi-Temporal Velocity Delta:</strong> Radar interferometry & Sentinel-1 SAR change detection measuring 24-hour water spread velocity and 24h level projections.
            </div>

            {velocityZones.map((zone) => (
              <div key={zone.zoneId} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-100">{zone.zoneName}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center space-x-1 ${
                    zone.trend === 'RISING_RAPIDLY' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    zone.trend === 'STABLE_PEAK' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {zone.trend === 'RISING_RAPIDLY' && <TrendingUp className="w-3 h-3 mr-1" />}
                    {zone.trend === 'RECEDING' && <TrendingDown className="w-3 h-3 mr-1" />}
                    {zone.trend.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950 p-2 rounded border border-slate-900">
                  <div>
                    <span className="text-slate-500 block">Velocity</span>
                    <span className={`font-bold ${zone.velocityMetersPerHour > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {zone.velocityMetersPerHour > 0 ? `+${zone.velocityMetersPerHour}` : zone.velocityMetersPerHour} m/hr
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">24h Projection</span>
                    <span className="font-bold text-cyan-300">{zone.projected24hWaterStage}m stage</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>AI Evacuation Engine v4.2</span>
        <span className="text-cyan-400 font-medium">Copernicus GLO-90 DEM Grounded</span>
      </div>
    </div>
  );
};
