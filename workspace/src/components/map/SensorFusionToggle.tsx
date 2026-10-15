import React, { useState } from 'react';
import { SensorFusionService, SensorMode } from '../../services/sensorFusionService';
import { Satellite, Radar, CloudRain } from 'lucide-react';

export const SensorFusionToggle: React.FC = () => {
  const [mode, setMode] = useState<SensorMode>('auto_fused');
  const [cloudOpacity, setCloudOpacity] = useState<number>(35);

  const status = SensorFusionService.getStatus(cloudOpacity);

  const handleModeChange = (newMode: SensorMode, force: 'optical' | 'sar' | null = null) => {
    setMode(newMode);
    SensorFusionService.setMode(newMode, force);
  };

  return (
    <div className="bg-[rgba(16,25,37,0.88)] backdrop-blur-md border border-[rgba(148,170,195,0.2)] rounded-xl p-3.5 text-xs text-[#F3F5F7] shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-[rgba(148,170,195,0.12)] pb-2">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-[#39B8C8]" />
          <span className="font-semibold text-sm">Multi-Sensor Fusion & Cloud Penetration</span>
        </div>
        <span className="font-mono text-[10px] bg-[rgba(57,184,200,0.15)] text-[#39B8C8] px-2 py-0.5 rounded-full">
          {status.activeSensor}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[rgba(8,13,20,0.6)] rounded-lg">
        <button
          onClick={() => handleModeChange('auto_fused', null)}
          className={`py-1.5 px-2 rounded-md font-medium transition cursor-pointer text-center ${
            mode === 'auto_fused' ? 'bg-[#39B8C8] text-[#080D14]' : 'text-[#AAB8C8] hover:text-white'
          }`}
        >
          Auto Fused
        </button>
        <button
          onClick={() => handleModeChange('optical', 'optical')}
          className={`py-1.5 px-2 rounded-md font-medium transition cursor-pointer text-center ${
            mode === 'optical' ? 'bg-[#39B8C8] text-[#080D14]' : 'text-[#AAB8C8] hover:text-white'
          }`}
        >
          Sentinel-2 Optical
        </button>
        <button
          onClick={() => handleModeChange('sar', 'sar')}
          className={`py-1.5 px-2 rounded-md font-medium transition cursor-pointer text-center ${
            mode === 'sar' ? 'bg-[#39B8C8] text-[#080D14]' : 'text-[#AAB8C8] hover:text-white'
          }`}
        >
          Sentinel-1 SAR
        </button>
      </div>

      <div className="space-y-1.5 bg-[rgba(22,34,49,0.5)] p-2.5 rounded-lg border border-[rgba(148,170,195,0.1)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#AAB8C8] flex items-center gap-1">
            <CloudRain className="w-3.5 h-3.5 text-blue-400" /> Simulated Cloud Opacity:
          </span>
          <span className="font-mono font-bold text-[#39B8C8]">{cloudOpacity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={cloudOpacity}
          onChange={(e) => setCloudOpacity(Number(e.target.value))}
          className="w-full accent-[#39B8C8] cursor-pointer"
        />
        <p className="text-[11px] text-[#AAB8C8] italic leading-relaxed pt-1">
          {status.reason}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
        <div className="bg-[rgba(8,13,20,0.4)] p-2 rounded border border-[rgba(148,170,195,0.08)]">
          <div className="text-[#AAB8C8]">Resolution / Bands:</div>
          <div className="font-mono text-[#F3F5F7] mt-0.5">{status.resolution}</div>
        </div>
        <div className="bg-[rgba(8,13,20,0.4)] p-2 rounded border border-[rgba(148,170,195,0.08)]">
          <div className="text-[#AAB8C8]">Penetration:</div>
          <div className="font-mono text-[#39B8C8] mt-0.5">{status.penetration}</div>
        </div>
      </div>
    </div>
  );
};
