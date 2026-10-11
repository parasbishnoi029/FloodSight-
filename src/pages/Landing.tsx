import React from 'react';
import { OrbitalEarth3D, ExtrudedFloodTerrainR3F } from '../components/3d';
import { NavigationTab } from '../types';
import { 
  ArrowRight, 
  Satellite, 
  Waves, 
  MapPinOff, 
  FileText,
  ShieldCheck,
  Radar,
  Mountain,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Crosshair
} from 'lucide-react';

interface LandingProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      
      {/* Hero Section with Interactive 3D Orbital Earth */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center border-b border-slate-900 bg-radial-[at_50%_40%] from-cyan-950/20 via-slate-950 to-slate-950 px-4 sm:px-6 lg:px-8">
        
        {/* Subtle Geodetic Grid Background */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 py-12">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Mission Category Kicker */}
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>EARTH OBSERVATION TRACK B</span>
              <span className="text-slate-600">·</span>
              <span>20 GLOBAL SITES</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">SEN1FLOODS11 BENCHMARK</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-sans leading-[1.1]">
                FloodSight <span className="text-cyan-400">AI</span>
              </h1>
              <p className="text-xl sm:text-2xl font-light text-slate-300 font-sans leading-snug">
                Global 3D Extruded Topography & Verified Satellite Flood Intelligence
              </p>
            </div>

            {/* Mission Problem Statement */}
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              When catastrophic floods wash away roads and submerge critical infrastructure, arbitrary AI guesses cost lives. FloodSight AI transforms multi-spectral satellite imagery into authoritative 3D extruded flood topographies, strictly enforcing server-side verification before inference.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('analyze')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-bold font-mono uppercase tracking-wider rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] cursor-pointer"
              >
                <span>Verify & Analyze Raster</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('map')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-bold font-mono uppercase tracking-wider rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Mountain className="w-4 h-4 text-cyan-400" />
                <span>Explore 3D Global Map</span>
              </button>
            </div>

            {/* Technical Parameters (4 Core Pillars) */}
            <div className="pt-4 border-t border-slate-900 grid grid-cols-3 gap-4 text-xs font-mono text-slate-400">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Modality</span>
                <span className="text-slate-200 font-semibold">Sentinel-2 Optical B4/B3/B2 (10m GSD)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Verification Gate</span>
                <span className="text-cyan-400 font-semibold">Server-Side Strict Contract</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Area Metric</span>
                <span className="text-amber-300 font-semibold">GeoTIFF Resolution Only</span>
              </div>
            </div>

          </div>

          {/* Hero Right: Interactive 3D Orbital Earth */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <div className="w-full max-w-[480px] aspect-square rounded-2xl bg-gradient-to-b from-slate-900/40 to-slate-950/80 border border-slate-800/80 p-2 shadow-2xl relative overflow-hidden flex items-center justify-center">
              <OrbitalEarth3D className="w-full h-full" onSelectHotspot={() => onNavigate('map')} />
              
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/40 pointer-events-none" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-500/40 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-500/40 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/40 pointer-events-none" />
            </div>
          </div>

        </div>
      </section>

      {/* Global 3D Extruded Topography & Flood Inundation Engine Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
              PHYSICS-BASED SPATIAL SIMULATION
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Global 3D Extruded Topography & Flood Inundation Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Interact directly with the 3D Digital Elevation Model. Drag the flood water stage slider, adjust vertical terrain exaggeration, probe submerged depth columns, and inspect critical infrastructure status in real time.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <Mountain className="w-4 h-4 text-cyan-400" />
            <span>React Three Fiber 3D Spatial Engine</span>
          </div>
        </div>

        <ExtrudedFloodTerrainR3F
          selectedLocation="Volta River Basin & Accra, Ghana"
          terrainType="alluvial"
          floodCoveragePercent={28.4}
          initialWaterLevel={0.42}
          extrusionScale={2.0}
        />
      </section>

      {/* 4-Stage Verification-First Architecture Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            STRICT VERIFICATION PIPELINE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            How FloodSight AI Prevents False Inferences
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="p-6 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">01. Raster Inspection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strictly verifies file integrity, bit depth, channel counts (3-band Optical B4/B3/B2), NaN/Inf bounds, and GeoTIFF geodetic coordinate headers.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <Satellite className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">02. Contract Gate</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Issues an authoritative server-signed verification token. Unverified or arbitrary images are rejected before reaching any ML inference code.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Waves className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">03. U-Net Segmentation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Executes the ResNet-34 U-Net model on normalized reflectance tensors to output pixel-level water probability maps (benchmarked against Sen1Floods11 locked test split with zero fabrication).
            </p>
          </div>

          <div className="p-6 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">04. Honest Geospatial Metrics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates surface hectarage strictly when valid GeoTIFF resolution metadata is embedded—no fabricated estimates on unreferenced images.
            </p>
          </div>

        </div>
      </section>

      {/* Scientific Integrity Guarantee */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
            <span>SCIENTIFIC RIGOR & TECHNICAL HONESTY</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Built for Real Emergency Operations, Grounded in Verified Benchmark Data
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
            In crisis response, fabricated data costs human lives. FloodSight AI strictly separates verified satellite inputs from unreferenced graphics, runs real trained neural network checkpoints, and clearly declares missing geospatial tags rather than inventing false numbers.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('about')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Read full dataset contract & model documentation →
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
