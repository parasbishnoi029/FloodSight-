import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>FloodSight AI — Track B: Mapping Flood Damage From Space</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">National Hackathon Project</span>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Research Prototype · Decision-support only · No fabricated predictions</span>
        </div>
      </div>
    </footer>
  );
};
