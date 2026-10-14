import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Satellite, 
  Waves, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Database,
  RefreshCw,
  Compass,
  FileCheck
} from 'lucide-react';
import { HydrologyObservation, SatelliteCatalogProduct } from '../../types';
import { formatFreshness } from '../../services/dataFreshness';

interface DataQualityPanelProps {
  locationName: string;
  lat?: number | null;
  lon?: number | null;
  hydrology?: HydrologyObservation | null;
  satelliteProduct?: SatelliteCatalogProduct | null;
  isModelAvailable?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  locationName,
  lat,
  lon,
  hydrology,
  satelliteProduct,
  isModelAvailable = false,
  onRefresh,
  isRefreshing = false
}) => {
  const hasValidCoords = lat != null && lon != null && (lat !== 0 || lon !== 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-cyan-950/80 border border-cyan-800/60 rounded-lg text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
              Continuous Verification & Data Quality Audit
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Zero-Fabrication Mode
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                Strict Scientific Governance
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live provenance audit for {locationName} {hasValidCoords ? `(${lat!.toFixed(4)}°, ${lon!.toFixed(4)}°)` : '(Unreferenced Coordinates)'}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            {isRefreshing ? 'Checking...' : 'Refresh Audit'}
          </button>
        )}
      </div>

      {/* Grid of Verified Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Satellite Observation (Copernicus CDSE) */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              Copernicus Sentinel-2 MSI
            </span>
            {satelliteProduct?.found ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </span>
            ) : satelliteProduct?.status === 'SOURCE UNAVAILABLE' ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> UNAVAILABLE
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                PENDING PASS
              </span>
            )}
          </div>

          <div className="text-[11px] space-y-1 font-mono text-slate-400">
            <div>
              <span className="text-slate-500">Platform:</span>{' '}
              <span className="text-slate-200">{satelliteProduct?.platform || 'Sentinel-2 (ESA)'}</span>
            </div>
            <div>
              <span className="text-slate-500">Acquisition (UTC):</span>{' '}
              <span className="text-cyan-300">{satelliteProduct?.acquisition_timestamp ? satelliteProduct.acquisition_timestamp.replace('T', ' ').slice(0, 19) + ' UTC' : 'Querying STAC...'}</span>
            </div>
            <div>
              <span className="text-slate-500">Freshness:</span>{' '}
              <span className="text-slate-300">{formatFreshness(satelliteProduct?.acquisition_timestamp)}</span>
            </div>
            <div>
              <span className="text-slate-500">Cloud Cover:</span>{' '}
              <span className="text-slate-200">{satelliteProduct?.cloud_cover_percent != null ? `${satelliteProduct.cloud_cover_percent}%` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">Resolution (GSD):</span>{' '}
              <span className="text-slate-200">10.0 meters / pixel</span>
            </div>
          </div>
        </div>

        {/* Card 2: Hydrological Cross-Check (ECMWF GloFAS) */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-blue-400" />
              ECMWF GloFAS River Feed
            </span>
            {hydrology?.status === 'FRESH' ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> FRESH
              </span>
            ) : hydrology?.status === 'STALE DATA' ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                <Clock className="w-3 h-3" /> STALE DATA
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> UNAVAILABLE
              </span>
            )}
          </div>

          <div className="text-[11px] space-y-1 font-mono text-slate-400">
            <div>
              <span className="text-slate-500">River Discharge:</span>{' '}
              <span className="text-blue-300 font-bold">
                {hydrology?.current_river_discharge_m3s != null ? `${hydrology.current_river_discharge_m3s} m³/s` : 'SOURCE UNAVAILABLE'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Rainfall Rate:</span>{' '}
              <span className="text-slate-200">
                {hydrology?.current_precipitation_rate != null ? `${hydrology.current_precipitation_rate} ${hydrology.precipitation_unit}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Observation Time:</span>{' '}
              <span className="text-slate-200">{hydrology?.source_timestamp ? hydrology.source_timestamp.slice(0, 10) + ' 00:00 UTC' : 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">Retrieval Freshness:</span>{' '}
              <span className="text-slate-300">{formatFreshness(hydrology?.retrieval_timestamp)}</span>
            </div>
            <div>
              <span className="text-slate-500">Model Provider:</span>{' '}
              <span className="text-slate-300 text-[10px]">Copernicus EMS GloFAS 4.0</span>
            </div>
          </div>
        </div>

        {/* Card 3: Model & Checkpoint Integrity */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              Segmentation Model Gate
            </span>
            {isModelAvailable ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> READY
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> MODEL NOT AVAILABLE
              </span>
            )}
          </div>

          <div className="text-[11px] space-y-1 font-mono text-slate-400">
            <div>
              <span className="text-slate-500">Target Model:</span>{' '}
              <span className="text-slate-200">FloodSight U-Net ResNet-34</span>
            </div>
            <div>
              <span className="text-slate-500">Checkpoint Status:</span>{' '}
              <span className={isModelAvailable ? 'text-emerald-400' : 'text-rose-400'}>
                {isModelAvailable ? 'Verified Weight File Loaded' : 'CHECKPOINT MISSING / NOT TRAINED'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Input Contract:</span>{' '}
              <span className="text-slate-300">512x512 · 3-Band Optical (B4/B3/B2)</span>
            </div>
            <div>
              <span className="text-slate-500">Conversion Pipeline:</span>{' '}
              <span className="text-emerald-400">Validated 13/12/4-band S2 mapping</span>
            </div>
            <div>
              <span className="text-slate-500">Inference Authorization:</span>{' '}
              <span className="text-slate-300">Fail-Closed Server Gate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disclosures & Scientific Validity Footer */}
      <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-slate-300 font-medium">
            Zero-Fabrication Policy Enforced:
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            FloodSight AI does not draw mathematical sine-wave polygons or simulate flood extents. Map inundation layers are strictly displayed when verified model inference has completed on genuine satellite rasters. Emergency road severed vectors and shelter networks remain disabled until ground-truth DOT/OSM infrastructure intersection datasets are validated.
          </p>
        </div>
      </div>
    </div>
  );
};
