import React from 'react';
import { NavigationTab, HealthStatus } from '../../types';
import { 
  Globe, 
  Radar, 
  Satellite, 
  Layers, 
  FileText, 
  Info,
  Keyboard
} from 'lucide-react';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  health: HealthStatus | null;
  onOpenHotkeys?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, health, onOpenHotkeys }) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'landing', label: 'Overview', icon: <Globe className="w-3.5 h-3.5" />, shortcut: 'H' },
    { id: 'dashboard', label: 'Command Hub', icon: <Radar className="w-3.5 h-3.5" />, shortcut: 'D' },
    { id: 'analyze', label: 'Analysis', icon: <Satellite className="w-3.5 h-3.5" />, shortcut: 'A' },
    { id: 'map', label: 'Tactical Maps', icon: <Layers className="w-3.5 h-3.5" />, shortcut: 'M' },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-3.5 h-3.5" />, shortcut: 'R' },
    { id: 'about', label: 'Methodology', icon: <Info className="w-3.5 h-3.5" />, shortcut: 'I' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[rgba(148,170,195,0.16)] bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.25)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
        
        {/* Zone 1: Distinctive Precision Brand Wordmark */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer select-none group" 
          onClick={() => onSelectTab('landing')}
        >
          <div className="w-7.5 h-7.5 rounded-[9px] bg-[rgba(16,25,37,0.85)] border border-[rgba(148,170,195,0.18)] group-hover:border-[#39B8C8] group-hover:shadow-[0_0_10px_rgba(57,184,200,0.2)] flex items-center justify-center text-[#39B8C8] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)]">
            <Globe className="w-4 h-4 text-[#39B8C8]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold tracking-tight text-[#F3F5F7] text-sm">
              FloodSight
            </span>
            <span className="text-xs font-mono font-medium text-[#39B8C8]">
              AI
            </span>
          </div>
        </div>

        {/* Zone 2: Refined 1-Line Navigation with Clean Spacing & Translucent Active States */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-[9px] cursor-pointer whitespace-nowrap transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] ${
                  active
                    ? 'bg-[rgba(22,34,49,0.85)] text-[#F3F5F7] border border-[rgba(148,170,195,0.22)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                    : 'text-[#AAB8C8] hover:text-[#F3F5F7] hover:bg-[rgba(16,25,37,0.65)] hover:border hover:border-[rgba(148,170,195,0.12)] border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Quick Tools */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenHotkeys && (
            <button
              onClick={onOpenHotkeys}
              title="Keyboard Shortcuts (?)"
              className="px-2.5 py-1.5 rounded-[9px] bg-[rgba(16,25,37,0.78)] border border-[rgba(148,170,195,0.16)] hover:border-[rgba(57,184,200,0.35)] text-[#AAB8C8] hover:text-[#F3F5F7] hover:-translate-y-[1px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <kbd className="text-[10px] font-mono text-[#AAB8C8] bg-[rgba(22,34,49,0.6)] px-1 rounded">?</kbd>
            </button>
          )}

          <button
            onClick={() => onSelectTab('analyze')}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-[9px] bg-[#39B8C8] hover:bg-[#55CAD6] active:bg-[#269AA9] text-[#080D14] hover:-translate-y-[1px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer whitespace-nowrap shadow-[0_2px_8px_rgba(57,184,200,0.2)] font-sans"
          >
            Start Analysis
          </button>
        </div>

      </div>
    </header>
  );
};
