import React from 'react';
import { 
  Satellite, 
  Waves, 
  Milestone, 
  MapPinOff, 
  Activity, 
  Layers, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Database,
  ShieldCheck
} from 'lucide-react';

export const About: React.FC = () => {
  const pipelineSteps = [
    {
      title: '01. Satellite & Aerial Imagery',
      desc: 'Ingests optical & multispectral imagery (Sentinel-2, PlanetScope, Maxar, or UAV orthomosaics) with geospatial metadata.',
      icon: <Satellite className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: '02. AI Flood Detection',
      desc: 'Calculates multi-spectral water indices (NDWI/MNDWI), applies adaptive thresholding, and segments flood boundaries.',
      icon: <Waves className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: '03. Infrastructure Analysis',
      desc: 'Executes 2D spatial polygon intersections against OpenStreetMap road vectors, bridges, and building footprints.',
      icon: <Milestone className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: '04. Accessibility & Isolation Analysis',
      desc: 'Models the transportation network as a topological graph, removes submerged edges, and identifies cut-off community nodes.',
      icon: <MapPinOff className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: '05. Explainable Priority Triage',
      desc: 'Generates a deterministic 4-factor risk score (0–100) weighting flood coverage, egress loss, and critical facility exposure.',
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: '06. Interactive Geospatial Map',
      desc: 'Visualizes multi-layer raster masks, affected vector segments, isolated clusters, and priority hotspots with click inspection.',
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: '07. Disaster Briefing Report',
      desc: 'Synthesizes verified CV metrics into standard Incident Command System (ICS) disaster briefings with zero fabricated data.',
      icon: <FileText className="w-5 h-5 text-cyan-400" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Overview & Problem */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <span>PROJECT VISION & METHODOLOGY</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white font-sans">
          About FloodSight AI
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed">
          <span className="font-semibold text-cyan-300">Track B — Mapping Flood Damage From Space: </span>
          When catastrophic floods destroy terrestrial roads, bridges, and cellular towers, first responders must operate in the dark. FloodSight AI transforms raw satellite and aerial imagery into actionable, georeferenced flood damage intelligence in minutes.
        </p>
      </div>

      {/* Why Flood Damage Mapping Matters */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h2 className="text-base font-bold text-slate-100">Why Rapid Satellite Mapping Matters</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          During extreme hydrological events, ground recon is dangerous, slow, and frequently blocked by debris. Spaceborne sensors provide a wide-area, non-intrusive lens. By combining multi-spectral water detection with road network topology, responders can immediately identify <span className="text-cyan-300 font-semibold">isolated population pockets</span> before cellular batteries deplete or floodwaters rise further.
        </p>
      </div>

      {/* How the System Works — Step by Step */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-100">End-to-End Analysis Workflow</h2>
        <div className="grid grid-cols-1 gap-3">
          {pipelineSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-start gap-4"
            >
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-mono font-bold text-slate-200">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset & Open Science Standard */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <Database className="w-4 h-4" />
          <span className="font-semibold">Open Datasets & Scientific Benchmark Grounding</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          FloodSight AI benchmarks algorithms against verified public Earth observation archives, including <span className="text-slate-100 font-mono">Sen1Floods11</span> (Sentinel-1 SAR / Sentinel-2 MSI), <span className="text-slate-100 font-mono">SpaceNet 8</span>, and the <span className="text-slate-100 font-mono">Copernicus Emergency Management Service</span>.
        </p>
      </div>

      {/* Explicit Disclaimer (Blocking Requirement) */}
      <div className="p-5 rounded-lg bg-amber-950/40 border border-amber-800/70 text-amber-200 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-amber-300 uppercase tracking-wider font-mono">
            Research Prototype Disclaimer
          </span>
          <p className="leading-relaxed">
            FloodSight AI is a hackathon prototype designed for research and technical evaluation. It does <span className="font-bold underline">not</span> replace official emergency response command platforms, certified hydrological warning systems, or on-the-ground rescue dispatch authorities.
          </p>
        </div>
      </div>

    </div>
  );
};
