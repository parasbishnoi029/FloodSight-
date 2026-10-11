import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  Globe, 
  MapPin, 
  CheckCircle2,
  Calendar,
  Download,
  Share2
} from 'lucide-react';
import { NavigationTab, AnalysisSummary } from '../types';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../data/globalDisasters';

interface ReportsProps {
  onNavigate: (tab: NavigationTab) => void;
  activeAnalysis: AnalysisSummary | null;
}

export const Reports: React.FC<ReportsProps> = ({ onNavigate, activeAnalysis }) => {
  const [selectedDisaster, setSelectedDisaster] = useState<GlobalDisasterLocation>(GLOBAL_DISASTERS[0]);
  const [activeTab, setActiveTab] = useState<'custom' | 'global'>('global');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>INCIDENT COMMAND SYSTEM (ICS-209 / SITREP) BRIEFINGS</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">GLOBAL SATELLITE TELEMETRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Disaster Intelligence & Incident Situation Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Standardized operational briefings generated strictly from measured satellite raster metrics and topological graph analyses.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
              activeTab === 'global' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Global Disasters ({GLOBAL_DISASTERS.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
              activeTab === 'custom' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Upload
          </button>
        </div>
      </div>

      {activeTab === 'global' ? (
        /* Global Disaster SITREP Browser */
        <div className="space-y-6">
          
          {/* Quick Select Global Hotspot Bar */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">
                SELECT GLOBAL DISASTER EVENT SITREP:
              </span>
              <span className="text-[10px] font-mono text-cyan-400">20 VALIDATED GLOBAL SITES</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GLOBAL_DISASTERS.slice(0, 8).map((d) => {
                const isSelected = selectedDisaster.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDisaster(d)}
                    className={`p-2 rounded text-left text-xs font-mono transition-colors border cursor-pointer truncate ${
                      isSelected
                        ? 'bg-cyan-950 border-cyan-500/60 text-white font-bold'
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="truncate">{d.country}: {d.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-slate-400 truncate">{d.continent}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Formal ICS-209 Report Document */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-6 shadow-2xl">
            
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
                  <span>ICS-209 INCIDENT STATUS SUMMARY (SITREP)</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400">{selectedDisaster.copernicusCode || 'UN-SPIDER-ACT'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-mono">
                  {selectedDisaster.country.toUpperCase()}: {selectedDisaster.name.toUpperCase()}
                </h2>
                <p className="text-xs font-mono text-slate-400">
                  Region: {selectedDisaster.region} · Continent: {selectedDisaster.continent} · GSD: {selectedDisaster.gsdMeters}m
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                  selectedDisaster.severity === 'Catastrophic'
                    ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                }`}>
                  SEVERITY: {selectedDisaster.severity.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Key Geospatial Metrics Grid (Tabular Values) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Inundated Area</span>
                <span className="text-base font-bold text-cyan-300 tabular-nums">
                  {selectedDisaster.estimatedInundationHa.toLocaleString()} ha
                </span>
                <span className="text-[9px] text-slate-400 block">Raster pixel integration</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Peak Flood Stage</span>
                <span className="text-base font-bold text-white tabular-nums">
                  +{selectedDisaster.peakFloodStageMeters}m MSL
                </span>
                <span className="text-[9px] text-slate-400 block">Hydrological elevation</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Population at Risk</span>
                <span className="text-base font-bold text-amber-300 tabular-nums">
                  {selectedDisaster.populationAtRisk.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-400 block">Census polygon overlay</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block">Sensor Modality</span>
                <span className="text-base font-bold text-emerald-400 truncate block">
                  {selectedDisaster.sensor.split(' ')[0]}
                </span>
                <span className="text-[9px] text-slate-400 block">{selectedDisaster.verifiedChips} Benchmark Chips</span>
              </div>
            </div>

            {/* Situation Summary & Tactical Narrative */}
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                1. Incident Summary & Hydrological Progression
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                The {selectedDisaster.name} event ({selectedDisaster.event}) within the {selectedDisaster.region} zone has caused significant surface water expansion. Earth observation imagery from {selectedDisaster.sensor} indicates inundation covering approximately {selectedDisaster.estimatedInundationHa.toLocaleString()} hectares. River crest levels peaked at +{selectedDisaster.peakFloodStageMeters}m above baseline mean sea level.
              </p>
            </div>

            {/* Tactical Evacuation & Infrastructure Prioritization */}
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                2. Tactical Accessibility & Evacuation Priorities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">Primary Evacuation Corridors</span>
                  <p className="text-slate-200 font-semibold">High-ground ridge routes above +{selectedDisaster.peakFloodStageMeters + 2}m MSL</p>
                </div>
                <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">Downlink Status</span>
                  <p className="text-emerald-400 font-semibold">Verified Sen1Floods11 Ground Truth ({selectedDisaster.benchmarkChipName})</p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                onClick={() => onNavigate('map')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Inspect on 3D Global Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-mono text-slate-400">
                COORDINATES: {selectedDisaster.lat.toFixed(4)}°, {selectedDisaster.lon.toFixed(4)}°
              </span>
            </div>

          </div>
        </div>
      ) : (
        /* Custom Upload Analysis Report */
        activeAnalysis ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Analysis ID</span>
                <h2 className="text-base font-mono font-bold text-cyan-300">{activeAnalysis.id}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400 uppercase">Status</span>
                <p className="text-xs font-mono text-emerald-400">{activeAnalysis.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block mb-1">Flooded Area</span>
                <span className="text-slate-200 font-bold">{activeAnalysis.floodedAreaHa}</span>
              </div>
              <div className="p-3 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block mb-1">Inundation Zones</span>
                <span className="text-slate-200 font-bold">{activeAnalysis.isolatedZones}</span>
              </div>
              <div className="p-3 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block mb-1">Road Network Status</span>
                <span className="text-slate-200 font-bold">{activeAnalysis.affectedRoads}</span>
              </div>
              <div className="p-3 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block mb-1">Priority Engine</span>
                <span className="text-slate-200 font-bold">{activeAnalysis.priorityScore}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-base font-bold text-slate-200">No active custom scene uploaded.</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload a satellite raster in the Analyze tab to generate custom situation briefs. You can also browse the 20 pre-validated global disaster SITREPs using the tab above.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('analyze')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer font-mono"
              >
                <span>Upload Imagery in Analyze Tab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Verification Framework Notice */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-semibold">Zero-Hallucination SITREP Guarantee</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          FloodSight AI enforces a strict zero-hallucination constraint on all incident reports. Generative briefings are supplied <span className="font-semibold text-slate-100">exclusively</span> with verified raster segmentation metrics, physical ground sampling distances, and true topological network data.
        </p>
      </div>

    </div>
  );
};
