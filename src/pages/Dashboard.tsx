import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Satellite, 
  UploadCloud, 
  MapPin, 
  AlertTriangle,
  Radar,
  Mountain,
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

  const cinematicEase = [0.2, 0, 0, 1] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: cinematicEase }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left font-sans"
    >
      
      {/* Top Header Glass Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-[rgba(16,25,37,0.76)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[10px] bg-[rgba(22,34,49,0.85)] border border-[rgba(148,170,195,0.18)] flex items-center justify-center text-[#39B8C8] shadow-[0_0_12px_rgba(57,184,200,0.15)]">
            <Radar className="w-5 h-5 text-[#39B8C8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[#F3F5F7] tracking-tight">
                Global Mission Command Hub
              </h1>
              <span className="text-[11px] font-mono text-[#39B8C8] bg-[rgba(57,184,200,0.12)] px-2 py-0.5 rounded-[6px] border border-[rgba(57,184,200,0.25)]">
                20 Global Zones
              </span>
            </div>
            <p className="text-xs text-[#AAB8C8] mt-0.5">
              Earth Observation Disaster Intelligence & Multi-Continental Telemetry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#AAB8C8]">
            <span className="text-[#6E8096]">U-Net Status:</span>
            {isModelAvailable ? (
              <span className="text-[#69B99A] font-medium flex items-center gap-1.5">
                ● Active Checkpoint
              </span>
            ) : (
              <span className="text-[#E9B866] font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Checkpoint Pending
              </span>
            )}
          </div>
          <span className="text-[rgba(148,170,195,0.2)]">|</span>
          <button
            onClick={() => onNavigate('analyze')}
            className="px-4 py-2 rounded-[10px] bg-[#39B8C8] hover:bg-[#55CAD6] active:bg-[#269AA9] text-[#080D14] font-semibold transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-[1px] shadow-[0_2px_12px_rgba(57,184,200,0.25)] flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Launch Analysis</span>
          </button>
        </div>
      </div>

      {/* Honest Checkpoint Status Banner */}
      {!isModelAvailable && (
        <div className="p-4 rounded-xl bg-[rgba(22,34,49,0.85)] backdrop-blur-[16px] border border-[#E9B866]/35 flex items-start gap-3 text-xs font-mono text-[#E9B866] shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
          <AlertTriangle className="w-4 h-4 text-[#E9B866] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#E9B866]">
              Zero-Fabrication Policy: Model Checkpoint Required
            </span>
            <p className="text-[#AAB8C8] leading-relaxed font-sans">
              In accordance with scientific verification standards, the inference service fails closed (<code className="text-[#E9B866]">HTTP 503 FLOOD_MODEL_UNAVAILABLE</code>) until a trained PyTorch model checkpoint (<code className="text-[#39B8C8]">floodsight_unet_resnet34_best.pth</code>) is compiled and verified against the Sen1Floods11 split.
            </p>
          </div>
        </div>
      )}

      {/* Model Contract & Dataset Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.82)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] space-y-1">
          <span className="text-[11px] font-mono text-[#6E8096] block">IoU Metric</span>
          <span className={`text-xl font-bold font-mono tabular-nums ${evalMetrics?.primary_metrics?.iou ? 'text-[#39B8C8]' : 'text-[#E9B866]'}`}>
            {evalMetrics?.primary_metrics?.iou !== undefined ? `${(evalMetrics.primary_metrics.iou * 100).toFixed(1)}%` : 'NOT RUN'}
          </span>
          <p className="text-[11px] text-[#AAB8C8]">Sen1Floods11 Split</p>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.82)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] space-y-1">
          <span className="text-[11px] font-mono text-[#6E8096] block">Dice Metric</span>
          <span className={`text-xl font-bold font-mono tabular-nums ${evalMetrics?.primary_metrics?.dice !== undefined ? 'text-[#69B99A]' : 'text-[#E9B866]'}`}>
            {evalMetrics?.primary_metrics?.dice !== undefined ? `${(evalMetrics.primary_metrics.dice * 100).toFixed(1)}%` : 'NOT RUN'}
          </span>
          <p className="text-[11px] text-[#AAB8C8]">Precision-recall F1</p>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.82)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] space-y-1">
          <span className="text-[11px] font-mono text-[#6E8096] block">Architecture</span>
          <span className="text-sm font-semibold text-[#F3F5F7] truncate block">
            U-Net + ResNet34
          </span>
          <p className="text-[11px] text-[#AAB8C8]">B4 / B3 / B2 Bands</p>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.82)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] space-y-1">
          <span className="text-[11px] font-mono text-[#6E8096] block">Input Tile Size</span>
          <span className="text-xl font-bold font-mono text-[#F3F5F7] tabular-nums">
            512×512
          </span>
          <p className="text-[11px] text-[#AAB8C8]">10.0m GSD Native</p>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.82)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] space-y-1">
          <span className="text-[11px] font-mono text-[#6E8096] block">Inference Engine</span>
          <span className="text-xl font-bold font-mono text-[#39B8C8]">
            CPU / CUDA
          </span>
          <p className="text-[11px] text-[#AAB8C8]">Timed per invocation</p>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.82)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] space-y-1">
          <span className="text-[11px] font-mono text-[#6E8096] block">Test Split Size</span>
          <span className="text-xl font-bold font-mono text-[#F3F5F7] tabular-nums">
            90 chips
          </span>
          <p className="text-[11px] text-[#AAB8C8]">Labeled Ground Truth</p>
        </div>
      </div>

      {/* Global Impact Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#6E8096] block">Total Inundation Area</span>
            <span className="text-xl font-bold font-mono text-[#39B8C8] tabular-nums">
              {totalMonitoredHectares.toLocaleString()} hectares
            </span>
          </div>
          <div className="w-9 h-9 rounded-[9px] bg-[rgba(22,34,49,0.85)] border border-[rgba(148,170,195,0.18)] flex items-center justify-center text-[#39B8C8]">
            <Mountain className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#6E8096] block">Population at Risk</span>
            <span className="text-xl font-bold font-mono text-[#E9B866] tabular-nums">
              {totalPopAtRisk.toLocaleString()} people
            </span>
          </div>
          <div className="w-9 h-9 rounded-[9px] bg-[rgba(22,34,49,0.85)] border border-[rgba(148,170,195,0.18)] flex items-center justify-center text-[#E9B866]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#6E8096] block">Continents Monitored</span>
            <span className="text-xl font-bold font-mono text-[#69B99A]">
              6 Continents
            </span>
          </div>
          <div className="w-9 h-9 rounded-[9px] bg-[rgba(22,34,49,0.85)] border border-[rgba(148,170,195,0.18)] flex items-center justify-center text-[#69B99A]">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Swath Scanner + Disaster Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: 3D Swath Scanner */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-[#39B8C8]" />
              <h2 className="text-xs font-mono font-semibold text-[#F3F5F7] uppercase tracking-wider">
                Sentinel-2 Optical Swath Simulator
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#6E8096]">10m GSD Orbit</span>
          </div>

          <div className="rounded-xl border border-[rgba(148,170,195,0.18)] bg-[rgba(16,25,37,0.76)] backdrop-blur-[18px] backdrop-saturate-[135%] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.36)] overflow-hidden p-2">
            <SensorSwathScanner3D />
          </div>
        </div>

        {/* Right Column: Disaster Locations Catalog */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#39B8C8]" />
              <h2 className="text-xs font-mono font-semibold text-[#F3F5F7] uppercase tracking-wider">
                Global Disaster Observation Sites
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#6E8096]">{GLOBAL_DISASTERS.length} Locations</span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {GLOBAL_DISASTERS.map((spot) => (
              <div
                key={spot.id}
                className="p-3.5 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] hover:bg-[rgba(22,34,49,0.85)] border border-[rgba(148,170,195,0.16)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] text-xs font-mono flex items-center justify-between gap-3 transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer"
                onClick={() => onNavigate('map')}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-1.5 font-semibold text-[#F3F5F7]">
                    <MapPin className="w-3.5 h-3.5 text-[#39B8C8] shrink-0 mt-0.5" />
                    <span className="leading-snug">{spot.country} · {spot.name}</span>
                  </div>
                  <div className="text-[11px] text-[#AAB8C8] truncate mt-0.5 font-sans">
                    {spot.region} · {spot.event} ({spot.copernicusCode || 'EMS'})
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-[6px] font-medium block ${
                    spot.severity === 'Catastrophic' ? 'bg-[rgba(228,119,119,0.14)] text-[#E47777] border border-[rgba(228,119,119,0.3)]' : 'bg-[rgba(57,184,200,0.12)] text-[#39B8C8] border border-[rgba(57,184,200,0.28)]'
                  }`}>
                    {spot.severity}
                  </span>
                  <span className="text-[11px] text-[#AAB8C8] block mt-0.5 tabular-nums">
                    {spot.estimatedInundationHa.toLocaleString()} ha
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </motion.div>
  );
};
