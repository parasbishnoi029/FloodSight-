import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { verifySatelliteImage, runVerifiedFloodAnalysis } from '../services/api';
import { 
  VerificationResponse, 
  FloodAnalysisResult, 
  NavigationTab,
  HealthStatus
} from '../types';
import { calculateHectares, isValidGeospatial, generateFloodGeoJson } from '../utils/geospatial';
import { SensorSwathScanner3D, ExtrudedFloodTerrainR3F } from '../components/3d';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../data/globalDisasters';
import { DataQualityPanel } from '../components/common/DataQualityPanel';
import { 
  UploadCloud, 
  Satellite, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info, 
  ArrowRight,
  FileCheck,
  Radar,
  Crosshair,
  Layers,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Waves,
  Sliders,
  Sparkles,
  MapPin,
  Mountain,
  Globe,
  Download
} from 'lucide-react';

interface AnalyzeProps {
  onAnalyzeSuccess?: (result: FloodAnalysisResult, file: File) => void;
  onNavigate: (tab: NavigationTab) => void;
  health?: HealthStatus | null;
}

export const Analyze: React.FC<AnalyzeProps> = ({ onAnalyzeSuccess, onNavigate, health }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  
  // Pipeline States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  
  const [isInferring, setIsInferring] = useState(false);
  const [threshold, setThreshold] = useState<number>(0.50);
  const [analysisResult, setAnalysisResult] = useState<FloodAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [osmInfra, setOsmInfra] = useState<any | null>(null);

  React.useEffect(() => {
    if (!analysisResult) return;
    if (analysisResult.crs_type === 'UNREFERENCED' || analysisResult.origin_lat == null || analysisResult.origin_lon == null) {
      setOsmInfra({
        status: 'SOURCE_UNAVAILABLE',
        provenance: 'OPENSTREETMAP OVERPASS (UNREFERENCED SCENE)',
        submerged_road_km: null,
        affected_bridges_count: null,
        isolated_settlements: []
      });
      return;
    }

    const lat = analysisResult.origin_lat;
    const lon = analysisResult.origin_lon;
    const d = 0.02;
    const south = lat - d;
    const north = lat + d;
    const west = lon - d;
    const east = lon + d;

    fetch(`/api/external/osm-infrastructure?south=${south.toFixed(4)}&west=${west.toFixed(4)}&north=${north.toFixed(4)}&east=${east.toFixed(4)}`)
      .then(res => res.json())
      .then(data => setOsmInfra(data))
      .catch(() => setOsmInfra({
        status: 'SOURCE_UNAVAILABLE',
        provenance: 'OPENSTREETMAP OVERPASS (SOURCE UNAVAILABLE)',
        submerged_road_km: null,
        affected_bridges_count: null,
        isolated_settlements: []
      }));
  }, [analysisResult]);

  const handleDownloadGeoJson = () => {
    if (!analysisResult) return;
    const zones = analysisResult.spatial_zones || [];
    const geoMeta = {
      has_geotags: analysisResult.crs_type !== 'UNREFERENCED',
      crs_type: analysisResult.crs_type || 'UNREFERENCED',
      epsg_code: analysisResult.epsg_code || null,
      epsg_urn: analysisResult.epsg_urn || null,
      pixel_scale: analysisResult.pixel_scale || null,
      tie_point: null,
      origin_lat: analysisResult.origin_lat ?? null,
      origin_lon: analysisResult.origin_lon ?? null,
      pixel_area_ha: null,
      method: analysisResult.area_calculation_method || 'WGS84_ROW_INTEGRATED_ELLIPSOIDAL',
      notes: ''
    };
    const provenance = {
      analysis_id: analysisResult.analysis_id,
      verification_id: analysisResult.verification_id,
      file_hash_sha256: analysisResult.file_hash_sha256,
      threshold: analysisResult.threshold_used,
      physical_area_ha: analysisResult.physical_area_ha,
      area_calculation_method: analysisResult.area_calculation_method || 'WGS84_ROW_INTEGRATED_ELLIPSOIDAL'
    };

    const geojson = generateFloodGeoJson(zones, geoMeta, provenance);
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flood_mask_${analysisResult.analysis_id || 'scene'}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedHotspot, setSelectedHotspot] = useState<GlobalDisasterLocation | null>(null);

  const filteredSamples = selectedContinent === 'All'
    ? GLOBAL_DISASTERS
    : GLOBAL_DISASTERS.filter((d) => d.continent === selectedContinent);

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    setVerificationResult(null);
    setAnalysisResult(null);

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = (sample: GlobalDisasterLocation) => {
    setErrorMsg(null);
    setSelectedHotspot(sample);
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setVerificationResult(null);
    setAnalysisResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Step 1: Run Server-Side Verification
  const handleVerify = async () => {
    if (!selectedFile) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await verifySatelliteImage(selectedFile);
      setVerificationResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'System verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: Run Verified U-Net Inference
  const handleRunInference = async () => {
    if (!selectedFile || !verificationResult) return;

    if (health && !health.model_available) {
      setErrorMsg('FLOOD_MODEL_UNAVAILABLE: Inference is blocked because no trained model weights exist at models/flood_segmentation/floodsight_unet_resnet34_best.pth.');
      return;
    }

    setIsInferring(true);
    setErrorMsg(null);

    try {
      const res = await runVerifiedFloodAnalysis(selectedFile, verificationResult.verification_id, threshold);
      setAnalysisResult(res);
      onAnalyzeSuccess?.(res, selectedFile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Flood model inference failed.');
    } finally {
      setIsInferring(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left"
    >
      
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GLOBAL VERIFICATION GATEWAY & FLOOD INFERENCE</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">SEN1FLOODS11 MODEL CONTRACT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-sans">
            Pre-Inference Raster Verification & Flood Segmentation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative server-side inspection validates file integrity, dimensions, channels, and geospatial metadata before U-Net inference.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <Satellite className={`w-3.5 h-3.5 ${health?.model_available ? 'text-cyan-400' : 'text-amber-400'}`} />
          <span>MODEL: FloodSight-UNet-ResNet34</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
            health?.model_available 
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
              : 'bg-amber-950 text-amber-300 border border-amber-800/60'
          }`}>
            {health?.model_available ? 'READY' : 'CHECKPOINT ABSENT'}
          </span>
        </div>
      </div>

      {/* Main Grid: Upload & Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Acquisition & Verification Controls */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Quick Select Benchmark Chips with Continent Filter */}
          <div className="p-4 rounded-2xl glass-panel space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                SELECT VERIFIED SEN1FLOODS11 BENCHMARK CHIP:
              </span>
              <span className="text-[10px] font-mono text-cyan-400">{filteredSamples.length} GLOBAL SITES</span>
            </div>

            {/* Continent Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'].map((cont) => (
                <button
                  key={cont}
                  onClick={() => setSelectedContinent(cont)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                    selectedContinent === cont
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cont}
                </button>
              ))}
            </div>

            {/* Benchmark Samples Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {filteredSamples.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleLoadSample(sample)}
                  className={`p-2.5 rounded-xl text-left text-xs font-mono transition-colors flex items-start gap-2 cursor-pointer border ${
                    selectedHotspot?.id === sample.id
                      ? 'bg-cyan-950/80 border-cyan-500/80 text-white font-bold'
                      : 'bg-slate-950 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 border-slate-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold leading-snug">{sample.country}: {sample.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{sample.benchmarkChipName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Hotspot Specifications Card */}
          {selectedHotspot && (
            <div className="p-4 rounded-2xl glass-panel-cyan space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedHotspot.country}: {selectedHotspot.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Copernicus EMS: {selectedHotspot.copernicusCode || 'EMSR'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>Target Chip: <code className="text-cyan-300">{selectedHotspot.benchmarkChipName}</code></div>
                <div>Sensor & Resolution: {selectedHotspot.sensor} ({selectedHotspot.gsdMeters}m GSD)</div>
                <div>Coordinates: {selectedHotspot.lat.toFixed(4)}°, {selectedHotspot.lon.toFixed(4)}°</div>
                <p className="text-[10px] text-amber-300/90 pt-1 leading-relaxed">
                  Notice: Under Zero-Fabrication governance, synthetic in-memory TIFF generation is disabled. Please upload the genuine satellite raster or downloaded Sen1Floods11 chip below.
                </p>
              </div>
            </div>
          )}

          {/* Upload Viewport */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all relative group ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/30'
                  : 'border-slate-800 hover:border-cyan-500/60 bg-slate-950/60 hover:bg-slate-950/90'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".tif,.tiff,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Satellite className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Drop Satellite Raster or Click to Browse
                  </h3>
                  <p className="text-xs text-slate-400">
                    Supports Sentinel-2 GeoTIFF (.tif) or Optical True-Color RGB (Max 50 MB)
                  </p>
                </div>
                <span className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-xl bg-slate-800 text-cyan-300 border border-slate-700">
                  Select Local File
                </span>
              </div>
            </div>
          ) : (
            /* Selected File Card */
            <div className="p-5 rounded-2xl glass-panel space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span className="truncate max-w-[240px]">{selectedFile.name}</span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Eject</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">FILE SIZE</span>
                  <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">CONTAINER TYPE</span>
                  <span className="truncate">{selectedFile.type || 'image/tiff'}</span>
                </div>
              </div>

              {/* Verify Trigger Button */}
              {!verificationResult && (
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full py-3.5 px-4 text-xs font-mono font-bold uppercase rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying File Integrity & Raster Contract...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Run System Verification Check</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Verification Verdict Box */}
          {verificationResult && (
            <div className="p-5 rounded-2xl glass-panel space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  System Verification Result
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    verificationResult.status === 'VERIFIED_SATELLITE_INPUT'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                      : verificationResult.status === 'SUPPORTED_BUT_UNVERIFIED'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                      : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                  }`}
                >
                  {verificationResult.status}
                </span>
              </div>

              {/* Real Check Checklist */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900/60 flex items-center justify-between">
                  <span className="text-slate-400">File Integrity:</span>
                  <span className={verificationResult.checks.file_integrity.passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {verificationResult.checks.file_integrity.passed ? '✓ Valid' : '✕ Corrupt'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 flex items-center justify-between">
                  <span className="text-slate-400">Image Decoding:</span>
                  <span className={verificationResult.checks.image_decode.passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {verificationResult.checks.image_decode.passed ? '✓ Decoded' : '✕ Error'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 flex items-center justify-between">
                  <span className="text-slate-400">Dimensions:</span>
                  <span className={verificationResult.checks.dimensions.passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {verificationResult.checks.dimensions.passed ? '✓ 512×512' : '✕ Out of bounds'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 flex items-center justify-between">
                  <span className="text-slate-400">Channel Count:</span>
                  <span className={verificationResult.checks.channels.passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {verificationResult.checks.channels.passed ? '✓ 3 Optical' : '✕ Mismatch'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 flex items-center justify-between">
                  <span className="text-slate-400">Data Type:</span>
                  <span className={verificationResult.checks.dtype.passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {verificationResult.checks.dtype.passed ? '✓ Float32' : '✕ Incompatible'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 flex items-center justify-between">
                  <span className="text-slate-400">Geospatial CRS:</span>
                  <span className={verificationResult.checks.geospatial_metadata.passed ? 'text-emerald-400' : 'text-amber-400'}>
                    {verificationResult.checks.geospatial_metadata.passed ? '✓ Georeferenced' : 'Unreferenced'}
                  </span>
                </div>
              </div>

              {/* Warning Notice for Unreferenced Images */}
              {verificationResult.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200/90 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Provenance Warning:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {verificationResult.warnings[0]}
                  </p>
                </div>
              )}

              {/* Rejection Notice */}
              {!verificationResult.accepted_for_inference && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Input Rejected:</span>
                  </div>
                  {verificationResult.reasons.map((r, i) => (
                    <p key={i} className="text-[11px] leading-relaxed">• {r}</p>
                  ))}
                </div>
              )}

              {/* Step 2: Flood Segmentation Trigger */}
              {verificationResult.accepted_for_inference && !analysisResult && (
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Probability Decision Threshold (&tau;):</span>
                    <span className="text-cyan-400 font-bold tabular-nums">{threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="0.70"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  {health && !health.model_available && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200/90 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Zero-Fabrication Enforcement:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Trained segmentation checkpoint is currently absent (<code className="text-amber-200">floodsight_unet_resnet34_best.pth</code>). Simulated or hardcoded predictions are strictly forbidden. Running inference will fail-closed with HTTP 503 until Phase 2 model training is executed.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleRunInference}
                    disabled={isInferring || Boolean(health && !health.model_available)}
                    className={`w-full py-3.5 px-4 text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${
                      health && !health.model_available
                        ? 'bg-slate-900 border border-amber-900/60 text-amber-300/80 cursor-not-allowed opacity-80'
                        : isInferring
                        ? 'bg-cyan-600 text-slate-950 cursor-wait opacity-70'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    }`}
                  >
                    {isInferring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Running U-Net ResNet-34 Segmentation...</span>
                      </>
                    ) : health && !health.model_available ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Inference Blocked — Checkpoint Absent</span>
                      </>
                    ) : (
                      <>
                        <Waves className="w-4 h-4" />
                        <span>Proceed to Flood Analysis</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
              errorMsg.includes('FLOOD_MODEL_UNAVAILABLE')
                ? 'bg-amber-950/60 border border-amber-800 text-amber-200'
                : 'bg-rose-950/60 border border-rose-800 text-rose-200'
            }`}>
              {errorMsg.includes('FLOOD_MODEL_UNAVAILABLE') ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">
                  {errorMsg.includes('FLOOD_MODEL_UNAVAILABLE')
                    ? 'Model Checkpoint Unavailable (HTTP 503):'
                    : 'Error:'}
                </div>
                <div>{errorMsg}</div>
                {errorMsg.includes('FLOOD_MODEL_UNAVAILABLE') && (
                  <p className="text-[11px] text-amber-300/80 pt-1 leading-relaxed">
                    In accordance with FloodSight AI Zero-Fabrication Governance, inference is blocked because no trained model weights exist at <code className="text-amber-200">models/flood_segmentation/floodsight_unet_resnet34_best.pth</code>. Fake or mock flood masks are never returned.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: 3D Swath Scanner & Inference Results */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* 3D Multispectral Swath Scanner */}
          <SensorSwathScanner3D />

          {/* Segmentation Results Panel */}
          {analysisResult && (
            <div className="p-6 rounded-2xl glass-panel space-y-5 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>FLOOD SEGMENTATION COMPLETED</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <span>Latency: <strong className="text-slate-200">{analysisResult.inference_latency_ms} ms</strong></span>
                  <span className="text-slate-600">·</span>
                  <span>Threshold: <strong className="text-slate-200">{analysisResult.threshold_used}</strong></span>
                </div>
              </div>

              {/* Provenance and Current Analysis Identity Bar */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 uppercase block text-[9px]">Analysis Run ID</span>
                  <span className="text-cyan-300 font-bold select-all break-all">{analysisResult.analysis_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase block text-[9px]">Input Scene & Verified Token</span>
                  <span className="text-slate-300 truncate block">{analysisResult.filename}</span>
                  <span className="text-slate-500 text-[10px] select-all truncate block">Token: {analysisResult.verification_id}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 block">Flood Surface</span>
                  <span className="text-base font-bold text-cyan-400 tabular-nums">
                    {analysisResult.coverage_percent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    fraction: {analysisResult.flooded_pixel_fraction ?? (analysisResult.coverage_percent / 100).toFixed(4)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 block">Flood Pixels</span>
                  <span className="text-base font-bold text-white tabular-nums">
                    {analysisResult.flood_pixel_count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    of {analysisResult.valid_pixel_count?.toLocaleString() ?? analysisResult.total_pixels.toLocaleString()} valid
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 block">Confidence</span>
                  <span className="text-base font-bold text-emerald-400 tabular-nums">
                    {(analysisResult.confidence_mean * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">mean positive prob</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 block">Inundation Zones</span>
                  <span className="text-base font-bold text-white tabular-nums">
                    {analysisResult.connected_regions}
                  </span>
                  <span className="text-[10px] text-slate-500 block">discrete water bodies</span>
                </div>
              </div>

              {/* Physical Area Readout with Method and Resolution */}
              {(() => {
                const computedAreaHa = analysisResult
                  ? (analysisResult.physical_area_ha ??
                     calculateHectares(
                       analysisResult.flood_pixel_count,
                       analysisResult.pixel_scale,
                       { origin_lat: analysisResult.origin_lat, origin_lon: analysisResult.origin_lon },
                       analysisResult.crs_type,
                       { originLat: analysisResult.origin_lat ?? undefined }
                     ))
                  : null;

                return (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Physical Inundated Area:</span>
                      <span className="text-cyan-300 font-bold">
                        {isValidGeospatial(analysisResult) && computedAreaHa !== null
                          ? `${computedAreaHa} hectares`
                          : 'NOT AVAILABLE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Calculation Method:</span>
                      <span className="text-slate-300 font-mono">{analysisResult.area_calculation_method || 'NOT_CALCULATED'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>CRS System:</span>
                      <span className="text-slate-300 font-mono">{analysisResult.crs_type || 'UNREFERENCED'}</span>
                    </div>
                    {analysisResult.angular_resolution_deg && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Source Angular Scale:</span>
                        <span className="text-slate-300 font-mono">
                          {analysisResult.angular_resolution_deg[0].toFixed(8)}° × {analysisResult.angular_resolution_deg[1].toFixed(8)}°
                        </span>
                      </div>
                    )}
                    {analysisResult.approx_ground_resolution_m && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Approx. Ground Resolution:</span>
                        <span className="text-slate-300 font-mono">
                          ~{analysisResult.approx_ground_resolution_m[0]}m × ~{analysisResult.approx_ground_resolution_m[1]}m
                        </span>
                      </div>
                    )}
                    {analysisResult.projected_resolution_m && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Projected Ground GSD:</span>
                        <span className="text-slate-300 font-mono">
                          {analysisResult.projected_resolution_m[0]}m × {analysisResult.projected_resolution_m[1]}m
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      {analysisResult.physical_area_notes}
                    </p>
                  </div>
                );
              })()}

              {/* OpenStreetMap Overpass Live Vector Infrastructure Intersect Card */}
              {osmInfra && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      OSM Vector Infrastructure Intersect
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {osmInfra.provenance}
                    </span>
                  </div>
                  {osmInfra.status === 'SUCCESS' ? (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Submerged Roads:</span>
                        <span className="text-cyan-300 font-bold">{osmInfra.submerged_road_km ?? '0'} km</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Affected Bridges:</span>
                        <span className="text-amber-400 font-bold">{osmInfra.affected_bridges_count ?? '0'} / {osmInfra.total_bridges_count ?? '0'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Isolated Settlements:</span>
                        <span className="text-slate-200">
                          {osmInfra.isolated_settlements?.length > 0
                            ? osmInfra.isolated_settlements.map((s: any) => s.name).join(', ')
                            : 'None detected in bounding area'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400/90 pt-1">
                      {osmInfra.provenance}: Road network intersection unavailable.
                    </div>
                  )}
                </div>
              )}

              {/* Data Quality & Source Integrity Panel */}
              <DataQualityPanel
                locationName={selectedHotspot?.name || analysisResult.filename}
                lat={selectedHotspot?.lat ?? analysisResult.origin_lat ?? null}
                lon={selectedHotspot?.lon ?? analysisResult.origin_lon ?? null}
                isModelAvailable={true}
              />

              {/* GeoJSON Export Button & Navigate Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDownloadGeoJson}
                  disabled={analysisResult.crs_type === 'UNREFERENCED'}
                  title={analysisResult.crs_type === 'UNREFERENCED' ? 'Requires georeferenced GeoTIFF tags' : 'Export vector flood polygons as GeoJSON'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Flood Mask (.geojson)</span>
                </button>

                <button
                  onClick={() => onNavigate('map')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer"
                >
                  <Mountain className="w-3.5 h-3.5" />
                  <span>Inspect in 3D Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Embedded 3D Extruded Flood Topography Section (Active when analysis is complete) */}
      {analysisResult && (
        <section className="space-y-4 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                3D SPATIAL INUNDATION EXTRUSION
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                Extruded Topographic Flood Mask View
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Coverage: <strong className="text-cyan-400">{analysisResult.coverage_percent}%</strong>
            </div>
          </div>

          <ExtrudedFloodTerrainR3F
            selectedLocation={analysisResult.filename}
            floodCoveragePercent={analysisResult.coverage_percent}
            initialWaterLevel={Math.min(0.85, Math.max(0.2, analysisResult.coverage_percent / 50))}
            extrusionScale={2.2}
            analysisResult={analysisResult}
          />
        </section>
      )}

    </motion.div>
  );
};
