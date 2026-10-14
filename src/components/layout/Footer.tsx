import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[rgba(148,170,195,0.14)] bg-[rgba(10,16,25,0.85)] backdrop-blur-[16px] py-5 text-xs text-[#AAB8C8] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#39B8C8] shrink-0" />
          <span className="text-[#F3F5F7]">FloodSight AI — Track B: Mapping Flood Damage From Space</span>
          <span className="text-[rgba(148,170,195,0.3)]">·</span>
          <span className="text-[#AAB8C8]">Scientific Earth Observation</span>
        </div>
        
        <div className="flex items-center gap-2 text-[#AAB8C8]">
          <AlertCircle className="w-3.5 h-3.5 text-[#E9B866] shrink-0" />
          <span>Decision-Support Prototype · Verified Inputs Only · Zero-Fabrication Policy</span>
        </div>
      </div>
    </footer>
  );
};
