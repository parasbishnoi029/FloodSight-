import React, { useEffect, useState } from 'react';
import { 
  Radio, 
  Satellite, 
  Layers, 
  UploadCloud, 
  ArrowRight, 
  Activity, 
  Server, 
  MapPin, 
  Maximize2,
  AlertTriangle,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Radar,
  Mountain,
  FileText,
  Globe,
  AlertCircle
} from 'lucide-react';
import { NavigationTab, HealthStatus, ModelEvaluationMetrics } from '../types';
import { getModelEvaluationMetrics, checkBackendHealth } from '../services/api';
import { SensorSwathScanner3D } from '../components/3d/SensorSwathScanner3D';
import { GLOBAL_DISASTERS } from '../data/globalDisasters';

interface DashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  health: HealthStatus | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  health,
}) => {
  const [evalMetrics, setEvalMetrics] = useState<ModelEvaluationMetrics | null>(null);
  const [isModelAvailable, setIsModelAvailable] = useState<boolean>(false);

  useEffect(() => {
    getModelEvaluationMetrics().then((data) => {
      if (data) setEvalMetrics(data);
    });

    checkBackendHealth().then((h) => {
      setIsModelAvailable(Boolean(h.model_available));
    });
  }, []);

  const totalMonitoredHectares = GLOBAL_DISASTERS.reduce((acc, d) => acc + d.estimatedInundationHa, 0);
  const totalPopAtRisk = GLOBAL_DISASTERS.reduce((acc, d) => acc + d.populationAtRisk, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Tactical Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Radar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-mono text-white tracking-wider uppercase">
                Global Mission Command Hub
              </h1>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                20 GLOBAL MONITORING ZONES
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Earth Observation Disaster Intelligence & Multi-Continental Telemetry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-400">U-NET STATUS:</span>
            {isModelAvailable ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ONLINE (CHECKPOINT ACTIVE)
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                CHECKPOINT PENDING (HTTP 503)
              </span>
            )}
          </div>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => onNavigate('analyze')}
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Launch Analysis</span>
          </button>
        </div>
      </div>

      {/* Honest Checkpoint Status Banner */}
      {!isModelAvailable && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-xs font-mono text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-amber-300">
              ZERO-FABRICATION GOVERNANCE: CHECKPOINT NOT INSTALLED
            </span>
            <p className="text-slate-300 leading-relaxed">
              In accordance with technical verification rules, the backend fails closed (HTTP 503 <code className="text-amber-300 font-bold">FLOOD_MODEL_UNAVAILABLE</code>) until a trained PyTorch model checkpoint (<code className="text-cyan-300">floodsight_unet_resnet34_best.pth</code>) is compiled and verified against the Sen1Floods11 test split. No mock inference numbers are presented.
            </p>
          </div>
        </div>
      )}

      {/* Model Contract & Dataset Architecture Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Evaluation Metric: IoU</span>
          <span className={`text-xl font-bold font-mono tabular-nums ${evalMetrics?.primary_metrics?.iou ? 'text-cyan-400' : 'text-amber-400'}`}>
            {evalMetrics?.primary_metrics?.iou !== undefined ? `${(evalMetrics.primary_metrics.iou * 100).toFixed(1)}%` : 'NOT RUN'}
          </span>
          <p className="text-[10px] text-slate-400">Sen1Floods11 Test Split</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Evaluation Metric: Dice</span>
          <span className={`text-xl font-bold font-mono tabular-nums ${evalMetrics?.primary_metrics?.dice !== undefined ? 'text-emerald-400' : 'text-amber-400'}`}>
            {evalMetrics?.primary_metrics?.dice !== undefined ? `${(evalMetrics.primary_metrics.dice * 100).toFixed(1)}%` : 'NOT RUN'}
          </span>
          <p className="text-[10px] text-slate-400">Harmonic precision-recall</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Architecture</span>
          <span className="text-sm font-bold font-mono text-white truncate block">
            U-Net + ResNet34
          </span>
          <p className="text-[10px] text-slate-400">B4 / B3 / B2 Bands</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Input Tile Size</span>
          <span className="text-xl font-bold font-mono text-white tabular-nums">
            512×512
          </span>
          <p className="text-[10px] text-slate-400">10.0m GSD Native</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Inference Mode</span>
          <span className="text-xl font-bold font-mono text-cyan-300">
            CPU / CUDA
          </span>
          <p className="text-[10px] text-slate-400">Timed per invocation</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Dataset Test Split</span>
          <span className="text-xl font-bold font-mono text-white tabular-nums">
            90 chips
          </span>
          <p className="text-[10px] text-slate-400">Hand-Labeled Ground Truth</p>
        </div>
      </div>

      {/* Global Impact Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Active Inundation</span>
            <span className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
              {totalMonitoredHectares.toLocaleString()} hectares
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Mountain className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Global Population at Risk</span>
            <span className="text-xl font-bold font-mono text-amber-300 tabular-nums">
              {totalPopAtRisk.toLocaleString()} people
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Continents Monitored</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              6 Inhabited Continents
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Scanner + Global Dataset Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: 3D Multispectral Swath Scanner */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Sentinel-2 Optical Swath Simulator
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">10m GSD Orbit</span>
          </div>

          <SensorSwathScanner3D />
        </div>

        {/* Right Column: Global Disaster Hotspots Catalog */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Global Monitored Disaster Sites
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">{GLOBAL_DISASTERS.length} Locations</span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {GLOBAL_DISASTERS.map((spot) => (
              <div
                key={spot.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{spot.country} · {spot.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {spot.region} · {spot.event} ({spot.copernicusCode || 'EMS'})
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold block ${
                    spot.severity === 'Catastrophic' ? 'bg-rose-950 text-rose-300' : 'bg-cyan-950 text-cyan-300'
                  }`}>
                    {spot.severity}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {spot.estimatedInundationHa.toLocaleString()} ha
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
