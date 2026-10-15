import React from 'react';
import { Sparkles, CheckCircle, ShieldAlert, Satellite, ArrowRight } from 'lucide-react';

interface DemoScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenarioName: string) => void;
}

export const DemoScenarioModal: React.FC<DemoScenarioModalProps> = ({ isOpen, onClose, onSelectScenario }) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'mekong',
      title: '2020 Mekong River Basin Flood',
      region: 'Southeast Asia (Cambodia / Vietnam Delta)',
      specs: 'Sentinel-1 SAR + Optical Fused · 1,890 Hectares Flooded · 14,250 Residents Impacted',
      description: 'Pre-loaded Sen1Floods11 validation tile with verified river overflow, submerged highway bridges, and active rescue boat allocation.',
    },
    {
      id: 'louisiana',
      title: 'Louisiana Hurricane Storm Surge',
      region: 'Gulf Coast, USA',
      specs: 'Sentinel-1 C-Band Radar · 2,410 Hectares Inundated · 2 Hospitals Isolated',
      description: 'Heavy cloud cover scenario (>85% opacity) demonstrating automatic SAR sensor fusion override and high-priority rescue dispatch.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#101925] border border-[rgba(57,184,200,0.4)] rounded-2xl p-6 text-[#F3F5F7] shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-[rgba(148,170,195,0.15)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[rgba(57,184,200,0.2)] border border-[rgba(57,184,200,0.4)] flex items-center justify-center text-[#39B8C8]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Judge Demo Mode: Instant Scenario Loader</h3>
              <p className="text-xs text-[#AAB8C8]">Select a verified Sen1Floods11 validation scene for instant presentation.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#AAB8C8] hover:text-white text-sm font-bold px-2 py-1 rounded bg-[rgba(148,170,195,0.1)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {scenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                onSelectScenario(s.title);
                onClose();
              }}
              className="group bg-[rgba(22,34,49,0.7)] hover:bg-[rgba(22,34,49,0.95)] border border-[rgba(148,170,195,0.2)] hover:border-[#39B8C8] rounded-xl p-4 cursor-pointer transition-all duration-200 space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white text-sm group-hover:text-[#39B8C8] transition-colors flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-[#39B8C8]" /> {s.title}
                </div>
                <span className="text-[11px] font-mono bg-[rgba(57,184,200,0.15)] text-[#39B8C8] px-2 py-0.5 rounded-full flex items-center gap-1">
                  Instant Load <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="text-xs text-amber-300 font-mono">{s.region}</div>
              <p className="text-xs text-[#AAB8C8] leading-relaxed">{s.description}</p>
              <div className="text-[11px] font-mono text-emerald-400 pt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {s.specs}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[rgba(57,184,200,0.08)] border border-[rgba(57,184,200,0.2)] p-3.5 rounded-xl text-xs text-[#AAB8C8] flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-[#39B8C8] shrink-0" />
          <span>
            Instantly populates tactical maps, population risk overlays, sensor fusion overrides, and FEMA ICS-209 SITREP reports in under 5 seconds.
          </span>
        </div>
      </div>
    </div>
  );
};
