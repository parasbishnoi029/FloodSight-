import React, { useState } from 'react';
import { FloodHydrologyService, TimeStepSimulation } from '../../services/floodHydrologyService';
import { Clock, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface FloodTimeMachineBarProps {
  onTimeChange?: (sim: TimeStepSimulation) => void;
}

export const FloodTimeMachineBar: React.FC<FloodTimeMachineBarProps> = ({ onTimeChange }) => {
  const [hour, setHour] = useState<number>(0);
  const simulation = FloodHydrologyService.getSimulationForHour(hour);

  const handleSliderChange = (val: number) => {
    setHour(val);
    const sim = FloodHydrologyService.getSimulationForHour(val);
    if (onTimeChange) {
      onTimeChange(sim);
    }
  };

  return (
    <div className="bg-[rgba(16,25,37,0.9)] backdrop-blur-md border border-[rgba(148,170,195,0.22)] rounded-xl p-3.5 text-xs text-[#F3F5F7] shadow-2xl space-y-3">
      <div className="flex items-center justify-between border-b border-[rgba(148,170,195,0.12)] pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#39B8C8]" />
          <span className="font-semibold text-sm">Interactive Basin Hydrology Time-Machine</span>
        </div>
        <span className="font-mono text-xs text-[#39B8C8] bg-[rgba(57,184,200,0.15)] px-2.5 py-0.5 rounded-full font-bold">
          {simulation.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between font-mono text-[11px] text-[#AAB8C8]">
          <span>T+0h (Now)</span>
          <span>T+3h (Peak)</span>
          <span>T+6h</span>
          <span>T+12h</span>
          <span>T+24h (Recession)</span>
        </div>
        <input
          type="range"
          min="0"
          max="24"
          step="3"
          value={hour}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full accent-[#39B8C8] cursor-pointer h-2 bg-[rgba(8,13,20,0.8)] rounded-lg"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
        <div className="bg-[rgba(8,13,20,0.6)] p-2.5 rounded-lg border border-[rgba(148,170,195,0.08)]">
          <div className="text-[#AAB8C8] text-[10px]">Water Stage Level</div>
          <div className="font-mono text-sm font-bold text-white mt-0.5">{simulation.waterStageMeters} meters</div>
        </div>
        <div className="bg-[rgba(8,13,20,0.6)] p-2.5 rounded-lg border border-[rgba(148,170,195,0.08)]">
          <div className="text-[#AAB8C8] text-[10px]">Inundated Area</div>
          <div className="font-mono text-sm font-bold text-[#39B8C8] mt-0.5">{simulation.floodedAreaHectares} hectares</div>
        </div>
        <div className="bg-[rgba(8,13,20,0.6)] p-2.5 rounded-lg border border-[rgba(148,170,195,0.08)]">
          <div className="text-[#AAB8C8] text-[10px]">Submerged Bridges</div>
          <div className="font-mono text-sm font-bold text-red-400 mt-0.5">{simulation.submergedBridgesCount} bridges</div>
        </div>
        <div className="bg-[rgba(8,13,20,0.6)] p-2.5 rounded-lg border border-[rgba(148,170,195,0.08)]">
          <div className="text-[#AAB8C8] text-[10px]">Velocity Trend</div>
          <div className="font-mono text-xs font-semibold text-amber-400 mt-0.5">{simulation.velocityTrend}</div>
        </div>
      </div>
    </div>
  );
};
