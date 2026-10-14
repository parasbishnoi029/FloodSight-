import React, { useState } from 'react';
import { motion } from 'motion/react';
import { OrbitalEarth3D, ExtrudedFloodTerrainR3F } from '../components/3d';
import { NavigationTab } from '../types';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../data/globalDisasters';
import { 
  ArrowRight, 
  Map, 
  ShieldCheck,
  Satellite,
  Waves,
  Layers,
  ChevronRight,
  Crosshair,
  FileCheck2
} from 'lucide-react';

interface LandingProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  const [selectedDisaster, setSelectedDisaster] = useState<GlobalDisasterLocation>(GLOBAL_DISASTERS[0]);

  // Cinematic motion easing curve
  const cinematicEase = [0.2, 0, 0, 1] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: cinematicEase }}
      className="bg-[#080D14] text-[#F3F5F7] font-sans min-h-screen"
    >
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: EDITORIAL GEOSPATIAL COMPOSITION                         */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden border-b border-[rgba(148,170,195,0.12)] bg-[radial-gradient(ellipse_80%_60%_at_65%_45%,rgba(16,25,37,0.45),rgba(8,13,20,1))]">
        
        {/* Subtle, integrated atmospheric radiance behind Earth */}
        <div 
          aria-hidden="true" 
          className="absolute right-[-8%] top-1/2 -translate-y-1/2 w-[650px] lg:w-[820px] h-[650px] lg:h-[820px] rounded-full pointer-events-none opacity-75"
          style={{
            background: 'radial-gradient(circle, rgba(28, 56, 82, 0.30) 0%, rgba(16, 35, 54, 0.12) 42%, rgba(8, 13, 20, 0) 72%)',
            filter: 'blur(48px)'
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 pb-12 sm:pb-16 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center min-h-[520px] lg:min-h-[580px]">
            
            {/* Hero Left: Editorial Copy & Focused Actions with Staggered Entrance */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-5 sm:space-y-6 text-left z-10">
              
              {/* Quiet Technical Eyebrow */}
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.0, ease: cinematicEase }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] text-xs font-medium text-[#AAB8C8] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] w-fit"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#39B8C8] shadow-[0_0_8px_rgba(57,184,200,0.6)]" />
                <span className="text-[#F3F5F7]">Earth Observation & Inundation Intelligence</span>
              </motion.div>

              {/* Authoritative Headline */}
              <motion.h1 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.06, ease: cinematicEase }}
                className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#F3F5F7] leading-[1.14]"
              >
                See the changing shape of our world.
              </motion.h1>

              {/* Restrained Supporting Paragraph */}
              <motion.p 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.12, ease: cinematicEase }}
                className="text-sm sm:text-base text-[#AAB8C8] leading-relaxed max-w-lg"
              >
                Analyze multi-spectral satellite imagery, map flood extent, and evaluate geospatial damage through verifiable, zero-fabrication Earth-observation pipelines.
              </motion.p>

              {/* Primary & Secondary Actions */}
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18, ease: cinematicEase }}
                className="pt-1 flex flex-wrap items-center gap-3"
              >
                <button
                  onClick={() => onNavigate('analyze')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-[10px] bg-[#39B8C8] hover:bg-[#55CAD6] active:bg-[#269AA9] text-[#080D14] hover:-translate-y-[1px] shadow-[0_2px_8px_rgba(57,184,200,0.2)] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer"
                >
                  <span>Start an analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('map')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium rounded-[10px] bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] hover:bg-[rgba(22,34,49,0.85)] text-[#F3F5F7] border border-[rgba(148,170,195,0.16)] hover:border-[rgba(57,184,200,0.32)] hover:-translate-y-[1px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer"
                >
                  <Map className="w-4 h-4 text-[#AAB8C8]" />
                  <span>Explore the map</span>
                </button>
              </motion.div>

              {/* Verified Observation Sites Ribbon */}
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.24, ease: cinematicEase }}
                className="pt-5 border-t border-[rgba(148,170,195,0.12)] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#AAB8C8]">
                    Observation Targets
                  </span>
                  <span className="text-[11px] font-mono text-[#6E8096]">
                    Click to orbit & focus
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GLOBAL_DISASTERS.slice(0, 5).map((spot) => {
                    const isSelected = selectedDisaster.id === spot.id;
                    return (
                      <button
                        key={spot.id}
                        onClick={() => setSelectedDisaster(spot)}
                        className={`px-3 py-1.5 text-xs rounded-[10px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[rgba(57,184,200,0.14)] text-[#39B8C8] border border-[#39B8C8] font-medium shadow-[0_2px_8px_rgba(57,184,200,0.18)]'
                            : 'bg-[rgba(16,25,37,0.78)] text-[#AAB8C8] hover:text-[#F3F5F7] border border-[rgba(148,170,195,0.16)] hover:border-[rgba(57,184,200,0.3)] hover:bg-[rgba(22,34,49,0.85)] hover:-translate-y-[1px]'
                        }`}
                      >
                        <Crosshair className={`w-3 h-3 ${isSelected ? 'text-[#39B8C8]' : 'text-[#6E8096]'}`} />
                        <span>{spot.country}: {spot.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

            </div>

            {/* Hero Right: Integrated 3D Earth Visualization (Globe rendering unchanged) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: cinematicEase }}
              className="lg:col-span-7 h-[460px] sm:h-[540px] lg:h-[600px] w-full flex items-center justify-center relative"
            >
              <OrbitalEarth3D
                className="w-full h-full"
                activeHotspotId={selectedDisaster.id}
                onSelectHotspot={(spot) => {
                  setSelectedDisaster(spot);
                  onNavigate('map');
                }}
              />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME 3D TOPOGRAPHY & FLOOD INUNDATION SIMULATOR                   */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-[rgba(148,170,195,0.12)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl text-left space-y-2">
            <div className="text-xs font-mono font-medium text-[#39B8C8] uppercase tracking-wider">
              Digital Elevation Modeling
            </div>
            <h2 className="text-2xl font-semibold text-[#F3F5F7] tracking-tight">
              Interactive 3D Topographic Simulation
            </h2>
            <p className="text-sm text-[#AAB8C8] leading-relaxed">
              Explore flood stage inundation over digital elevation representations. Inspect hydraulic water columns, adjust elevation thresholds, and inspect submerged terrain.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-end">
            <span className="px-3 py-1.5 rounded-[9px] bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] text-xs font-mono text-[#AAB8C8]">
              Target: <span className="text-[#F3F5F7] font-medium">{selectedDisaster.name}</span>
            </span>
          </div>
        </div>

        {/* 3D Extruded Terrain Surface in Glass Panel */}
        <div className="rounded-xl border border-[rgba(148,170,195,0.16)] bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.36)] overflow-hidden p-2.5 transition-all duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)]">
          <ExtrudedFloodTerrainR3F
            key={selectedDisaster.id}
            selectedLocation={`${selectedDisaster.name}, ${selectedDisaster.country}`}
            terrainType={selectedDisaster.terrainType}
            floodCoveragePercent={35}
            initialWaterLevel={0.45}
            extrusionScale={2.0}
            className="w-full"
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. VERIFICATION PIPELINE ARCHITECTURE                                     */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-[rgba(148,170,195,0.12)] space-y-10">
        <div className="max-w-2xl text-left space-y-2">
          <div className="text-xs font-mono font-medium text-[#39B8C8] uppercase tracking-wider">
            Data Architecture & Safety
          </div>
          <h2 className="text-2xl font-semibold text-[#F3F5F7] tracking-tight">
            Verification-First Pipeline
          </h2>
          <p className="text-sm text-[#AAB8C8] leading-relaxed">
            Strict server-side verification gates ensure only authentic multi-spectral rasters enter machine-learning inference.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-xl bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.85)] hover:border-[rgba(57,184,200,0.32)] hover:-translate-y-[1px] transition-all duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)] text-left space-y-3">
            <div className="w-8 h-8 rounded-[9px] bg-[rgba(22,34,49,0.8)] border border-[rgba(148,170,195,0.16)] flex items-center justify-center text-[#39B8C8]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#F3F5F7]">01. Raster Verification</h3>
            <p className="text-xs text-[#AAB8C8] leading-relaxed">
              Validates GeoTIFF bit depth, 3-band Optical (B4/B3/B2) channel mapping, coordinate transforms, and non-null pixel bounds.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.85)] hover:border-[rgba(57,184,200,0.32)] hover:-translate-y-[1px] transition-all duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)] text-left space-y-3">
            <div className="w-8 h-8 rounded-[9px] bg-[rgba(22,34,49,0.8)] border border-[rgba(148,170,195,0.16)] flex items-center justify-center text-[#39B8C8]">
              <Satellite className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#F3F5F7]">02. Server Authorization</h3>
            <p className="text-xs text-[#AAB8C8] leading-relaxed">
              Generates cryptographic verification tokens. Rejects unverified or corrupted inputs before reaching inference routines.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.85)] hover:border-[rgba(57,184,200,0.32)] hover:-translate-y-[1px] transition-all duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)] text-left space-y-3">
            <div className="w-8 h-8 rounded-[9px] bg-[rgba(22,34,49,0.8)] border border-[rgba(148,170,195,0.16)] flex items-center justify-center text-[#39B8C8]">
              <Waves className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#F3F5F7]">03. U-Net Segmentation</h3>
            <p className="text-xs text-[#AAB8C8] leading-relaxed">
              Executes ResNet-34 U-Net neural network to extract pixel-level water probabilities, benchmarked against Sen1Floods11 splits.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-[rgba(22,34,49,0.85)] hover:border-[rgba(57,184,200,0.32)] hover:-translate-y-[1px] transition-all duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)] text-left space-y-3">
            <div className="w-8 h-8 rounded-[9px] bg-[rgba(22,34,49,0.8)] border border-[rgba(148,170,195,0.16)] flex items-center justify-center text-[#39B8C8]">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#F3F5F7]">04. Geodesic Calculations</h3>
            <p className="text-xs text-[#AAB8C8] leading-relaxed">
              Computes physical flood surface hectarage strictly using exact embedded raster geotransforms and CRS metadata.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SCIENTIFIC HONESTY & ZERO-FABRICATION GUARANTEE                         */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="p-6 sm:p-8 rounded-xl bg-[rgba(22,34,49,0.82)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_36px_rgba(0,0,0,0.4)] text-left space-y-3 max-w-4xl transition-all duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)]">
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#39B8C8] uppercase tracking-wider">
            <FileCheck2 className="w-4 h-4" />
            <span>Scientific Disclosure & Governance</span>
          </div>
          <h3 className="text-lg font-semibold text-[#F3F5F7]">
            Zero-Fabrication Commitment
          </h3>
          <p className="text-sm text-[#AAB8C8] leading-relaxed">
            FloodSight AI never fabricates flood masks, synthetic coverage percentages, or unverified infrastructure impacts. Every measurement is derived deterministically from verified satellite inputs and documented model checkpoints.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('about')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#39B8C8] hover:text-[#55CAD6] hover:-translate-y-[0.5px] cursor-pointer transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)]"
            >
              <span>Explore Dataset Contract & Methodology Documentation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

    </motion.div>
  );
};
