import React from 'react';
import { motion } from 'motion/react';
import { 
  Satellite, 
  Waves, 
  Milestone, 
  MapPinOff, 
  Activity, 
  Layers, 
  FileText, 
  AlertTriangle,
  Database,
  FileCheck2
} from 'lucide-react';

export const About: React.FC = () => {
  const cinematicEase = [0.2, 0, 0, 1] as const;

  const pipelineSteps = [
    {
      title: '01. Multi-Spectral Satellite Ingestion',
      desc: 'Ingests optical Sentinel-2 MSI rasters (B4 Red, B3 Green, B2 Blue) with verified geospatial header tags and non-null pixel bounds.',
      icon: <Satellite className="w-4 h-4 text-[#39B8C8]" />,
    },
    {
      title: '02. Cryptographic Verification Gate',
      desc: 'Enforces fail-closed validation on bit depth, band ordering, and valid affine coordinate transforms before inference.',
      icon: <FileCheck2 className="w-4 h-4 text-[#39B8C8]" />,
    },
    {
      title: '03. ResNet-34 U-Net Segmentation',
      desc: 'Executes pixel-level water segmentation benchmarked on Sen1Floods11 splits, producing positive-class probability maps.',
      icon: <Waves className="w-4 h-4 text-[#39B8C8]" />,
    },
    {
      title: '04. Strict Geodesic Hectarage Computation',
      desc: 'Calculates physical surface area strictly from embedded raster coordinate reference systems without synthetic approximations.',
      icon: <Layers className="w-4 h-4 text-[#39B8C8]" />,
    },
    {
      title: '05. Transportation Topology Intersections',
      desc: 'Assesses potential infrastructure exposure against verified vector geometry, reporting features only when authenticated data exists.',
      icon: <Milestone className="w-4 h-4 text-[#39B8C8]" />,
    },
    {
      title: '06. Community Isolation & Access Loss',
      desc: 'Models road graph reachability, isolating cut-off settlements with zero fabricated population metrics.',
      icon: <MapPinOff className="w-4 h-4 text-[#39B8C8]" />,
    },
    {
      title: '07. Deterministic Response Triage',
      desc: 'Evaluates priority based exclusively on available, verified observations with transparent disclosures of missing data.',
      icon: <Activity className="w-4 h-4 text-[#39B8C8]" />,
    },
    {
      title: '08. Incident Command System (ICS) Briefings',
      desc: 'Synthesizes verified metrics into standardized emergency briefings with complete data provenance and zero-fabrication guarantees.',
      icon: <FileText className="w-4 h-4 text-[#39B8C8]" />,
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: cinematicEase }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 font-sans text-left"
    >
      
      {/* Overview & Problem */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#39B8C8]">
          <span>PROJECT VISION & SCIENTIFIC METHODOLOGY</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-[#F3F5F7]">
          About FloodSight AI
        </h1>
        <p className="text-[#AAB8C8] text-sm md:text-base leading-relaxed">
          <span className="font-semibold text-[#39B8C8]">Track B — Mapping Flood Damage From Space: </span>
          When catastrophic floods destroy terrestrial roads, bridges, and communications, first responders must navigate fragmented information. FloodSight AI transforms raw multi-spectral satellite imagery into verifiable flood extent and infrastructure intelligence with zero fabricated outputs.
        </p>
      </div>

      {/* Why Flood Damage Mapping Matters */}
      <div className="p-6 rounded-xl border border-[rgba(148,170,195,0.16)] bg-[rgba(16,25,37,0.76)] backdrop-blur-[18px] backdrop-saturate-[135%] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.3)] space-y-3">
        <h2 className="text-base font-semibold text-[#F3F5F7]">Why Rapid Satellite Mapping Matters</h2>
        <p className="text-xs text-[#AAB8C8] leading-relaxed">
          During extreme hydrological events, ground reconnaissance is slow and frequently dangerous. Spaceborne sensors provide a wide-area, non-intrusive lens. By combining multi-spectral water detection with rigorous coordinate reference systems, responders can understand physical inundation without guesswork.
        </p>
      </div>

      {/* How the System Works — Step by Step */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[#F3F5F7]">End-to-End Analysis Pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pipelineSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[rgba(16,25,37,0.72)] backdrop-blur-[16px] border border-[rgba(148,170,195,0.16)] hover:bg-[rgba(22,34,49,0.85)] hover:border-[rgba(57,184,200,0.3)] hover:-translate-y-[1px] transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] flex items-start gap-3.5"
            >
              <div className="p-2 rounded-[8px] bg-[rgba(22,34,49,0.85)] border border-[rgba(148,170,195,0.18)] shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-mono font-semibold text-[#F3F5F7]">{step.title}</h3>
                <p className="text-xs text-[#AAB8C8] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset & Open Science Standard */}
      <div className="p-6 rounded-xl border border-[rgba(148,170,195,0.16)] bg-[rgba(16,25,37,0.76)] backdrop-blur-[18px] backdrop-saturate-[135%] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.3)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#39B8C8]">
          <Database className="w-4 h-4" />
          <span className="font-semibold">Open Datasets & Scientific Benchmark Grounding</span>
        </div>
        <p className="text-xs text-[#AAB8C8] leading-relaxed">
          FloodSight AI benchmarks algorithms against verified public Earth observation archives, including <span className="text-[#F3F5F7] font-mono">Sen1Floods11</span> (Sentinel-1 SAR / Sentinel-2 MSI), <span className="text-[#F3F5F7] font-mono">SpaceNet 8</span>, and the <span className="text-[#F3F5F7] font-mono">Copernicus Emergency Management Service</span>.
        </p>
      </div>

      {/* Official Documentation & User Manual Card */}
      <div className="p-6 rounded-xl border border-[rgba(148,170,195,0.18)] bg-[rgba(22,34,49,0.82)] backdrop-blur-[18px] backdrop-saturate-[135%] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.35)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#39B8C8]">
            <FileText className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">OFFICIAL SYSTEM MANUAL</span>
            <span className="text-[#6E8096]">·</span>
            <span className="text-[#AAB8C8]">v1.0.0-sen1floods11</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/FloodSight_AI_User_Manual.pdf"
              download="FloodSight_AI_User_Manual.pdf"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[9px] bg-[#39B8C8] hover:bg-[#55CAD6] active:bg-[#269AA9] text-[#080D14] text-xs font-semibold shadow-[0_2px_8px_rgba(57,184,200,0.2)] hover:-translate-y-[1px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download User Manual (PDF)</span>
            </a>
          </div>
        </div>

        <div className="space-y-2 text-left">
          <h3 className="text-sm font-semibold text-[#F3F5F7]">
            FloodSight AI — Comprehensive Operations & User Manual
          </h3>
          <p className="text-xs text-[#AAB8C8] leading-relaxed">
            The complete 11-chapter operational manual covers multi-spectral satellite ingestion, pre-inference verification gates (<code className="text-[#39B8C8] font-mono">/api/verify-image</code>), fail-closed model guardrails, live RainViewer radar telemetry, 3D topographic stage simulation, geodesic area formulas, and ICS-209 incident reporting.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono text-[#AAB8C8]">
          <div className="p-2 rounded-[8px] bg-[rgba(16,25,37,0.78)] border border-[rgba(148,170,195,0.12)]">
            <span className="text-[#39B8C8] block font-semibold">Ch. 1–3</span>
            <span>Interface & 3D Globe</span>
          </div>
          <div className="p-2 rounded-[8px] bg-[rgba(16,25,37,0.78)] border border-[rgba(148,170,195,0.12)]">
            <span className="text-[#39B8C8] block font-semibold">Ch. 4–5</span>
            <span>Analysis & Live Radar</span>
          </div>
          <div className="p-2 rounded-[8px] bg-[rgba(16,25,37,0.78)] border border-[rgba(148,170,195,0.12)]">
            <span className="text-[#39B8C8] block font-semibold">Ch. 6–8</span>
            <span>3D DEM & Hectarage</span>
          </div>
          <div className="p-2 rounded-[8px] bg-[rgba(16,25,37,0.78)] border border-[rgba(148,170,195,0.12)]">
            <span className="text-[#39B8C8] block font-semibold">Ch. 9–11</span>
            <span>Diagnostics & Matrix</span>
          </div>
        </div>
      </div>

      {/* Explicit Disclaimer (Blocking Requirement) */}
      <div className="p-5 rounded-xl bg-[rgba(22,34,49,0.85)] backdrop-blur-[16px] border border-[#E9B866]/35 text-xs flex items-start gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
        <AlertTriangle className="w-5 h-5 text-[#E9B866] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-[#E9B866] uppercase tracking-wider font-mono">
            Research Prototype Disclaimer
          </span>
          <p className="text-[#AAB8C8] leading-relaxed">
            FloodSight AI is a hackathon prototype designed for research and technical evaluation. It does <span className="font-semibold underline">not</span> replace official emergency response command platforms, certified hydrological warning systems, or on-the-ground rescue dispatch authorities.
          </p>
        </div>
      </div>

    </motion.div>
  );
};
