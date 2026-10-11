import React from 'react';
import { NavigationTab, HealthStatus } from '../../types';
import { 
  Radio, 
  Satellite, 
  Layers, 
  FileText, 
  Info, 
  Radar,
  Mountain
} from 'lucide-react';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  health: HealthStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, health }) => {
  const isHealthy = health?.status === 'healthy';

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'landing', label: 'Overview', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'dashboard', label: 'Command Hub', icon: <Radar className="w-3.5 h-3.5" /> },
    { id: 'analyze', label: 'Verification & Analysis', icon: <Satellite className="w-3.5 h-3.5" /> },
    { id: 'map', label: 'Tactical Map', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'ICS Reports', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'about', label: 'Methodology', icon: <Info className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single Text Element Wordmark */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer select-none" 
          onClick={() => onSelectTab('landing')}
        >
          <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <span className="font-bold tracking-tight text-white text-base">
            FloodSight <span className="text-cyan-400">AI</span>
          </span>
        </div>

        {/* Zone 2: 4-6 Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  active
                    ? 'bg-slate-900 text-cyan-300 border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & System State */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-cyan-400'
              }`}
            />
            <span>{isHealthy ? 'API ONLINE' : 'STANDALONE'}</span>
          </div>

          <button
            onClick={() => onSelectTab('analyze')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors whitespace-nowrap shadow-[0_0_15px_rgba(6,182,212,0.25)]"
          >
            Launch Analysis
          </button>
        </div>

      </div>
    </header>
  );
};
