import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  Waves,
  Layers,
  Mountain,
  MapPin,
  Eye,
  RotateCcw,
  Compass,
  Lock,
  Info,
  CheckCircle2,
  AlertCircle,
  Radio,
  Grid
} from 'lucide-react';
import { FloodAnalysisResult, AnalysisSummary } from '../../types';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../../data/globalDisasters';
import { getRainViewerMetadata, getRainViewerTileUrl } from '../../services/weatherService';
import { MapLayerConfig } from '../map/LayerControl';

export type SceneMode = 'catalog-reference' | 'uploaded-imagery' | 'validated-analysis';

export interface InfrastructurePin {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  elevationMsl: number | null;
  isSubmerged: boolean;
  areaHa?: number;
  probability?: number;
}

export interface DepthProbeData {
  worldX: number;
  worldZ: number;
  lat: number | null;
  lon: number | null;
  groundElevationMeters: number | null;
  waterSurfaceMeters: number | null;
  submergedDepthMeters: number | null;
  isSubmerged: boolean;
  classification: string;
}

/**
 * Creates a clean neutral terrain texture without artificial cyan grids, text, or concentric circles.
 */
export function createProceduralTerrainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(0.35, '#1e293b');
    grad.addColorStop(0.7, '#14332b');
    grad.addColorStop(1, '#0f291e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.flipY = true;
  return tex;
}

/**
 * Computes high-resolution Slippy tile URL from Esri World Imagery for exact coordinates
 */
export function getEsriSatelliteTileUrl(lat: number, lon: number, zoom = 11): string {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}

export interface ExtrudedFloodTerrainProps {
  className?: string;
  selectedLocation?: string;
  terrainType?: 'delta' | 'canyon' | 'alluvial' | 'coastal';
  floodCoveragePercent?: number;
  initialWaterLevel?: number;
  extrusionScale?: number;
  analysisResult?: FloodAnalysisResult | AnalysisSummary | null;
  hasMeasuredDem?: boolean;
  measuredElevationMeters?: number | null;
  rasterPreviewUrl?: string | null;
  layerConfig?: MapLayerConfig;
  coordinates?: { lat: number; lon: number } | null;
  onClearAnalysis?: () => void;
}

interface ScientificTerrainMeshProps {
  sizeX: number;
  sizeZ: number;
  shadingMode: 'hypsometric' | 'depth' | 'satellite' | 'sar' | 'probability' | 'radar';
  showContours: boolean;
  showFloodMask: boolean;
  showRadarOverlay: boolean;
  showGrid: boolean;
  sceneMode: SceneMode;
  hasMeasuredDem: boolean;
  demElevations: number[] | null;
  demMinM: number | null;
  demMaxM: number | null;
  extrusionScale: number;
  analysisResult: FloodAnalysisResult | AnalysisSummary | null;
  loadedTextures: {
    optical: THREE.Texture | null;
    mask: THREE.Texture | null;
    heatmap: THREE.Texture | null;
    hypsometric: THREE.Texture | null;
    radar: THREE.Texture | null;
  };
  effectiveBounds: { south: number; west: number; north: number; east: number };
  waterStageOffset: number;
  onHoverPin: (pin: InfrastructurePin | null) => void;
  onProbeDepth: (probe: DepthProbeData | null) => void;
}

function ScientificTerrainMesh({
  sizeX,
  sizeZ,
  shadingMode,
  showContours,
  showFloodMask,
  showRadarOverlay,
  showGrid,
  sceneMode,
  hasMeasuredDem,
  demElevations,
  demMinM,
  demMaxM,
  extrusionScale,
  analysisResult,
  loadedTextures,
  effectiveBounds,
  waterStageOffset,
  onHoverPin,
  onProbeDepth,
}: ScientificTerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const waterMeshRef = useRef<THREE.Mesh>(null);
  const gridRes = 64;

  useFrame((state) => {
    if (!waterMeshRef.current) return;
    const t = state.clock.elapsedTime;
    const pos = waterMeshRef.current.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const wave = Math.sin(t * 3.0 + x * 4.0 + z * 4.0) * 0.0025;
      pos.setY(i, (pos.getY(i) || 0) + wave * 0.015);
    }
    pos.needsUpdate = true;
  });

  const isVerified = sceneMode === 'validated-analysis';

  const { terrainGeometry, waterGeometry, contourGeometry, pins, elevationMatrix } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(sizeX, sizeZ, gridRes, gridRes);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;

    const elevMatrix: (number | null)[][] = [];
    for (let r = 0; r <= gridRes; r++) {
      elevMatrix.push([]);
    }

    const hasRealElev = Boolean(
      hasMeasuredDem && demElevations && demElevations.length > 0 && demMinM !== null && demMaxM !== null
    );
    const elevSpan = hasRealElev ? Math.max(1, demMaxM! - demMinM!) : 100;
    const demDim = hasRealElev ? Math.round(Math.sqrt(demElevations!.length)) : 1;

    for (let i = 0; i < pos.count; i++) {
      const row = Math.floor(i / (gridRes + 1));
      const col = i % (gridRes + 1);

      let rawHeight = 0;
      let elevMsl: number | null = null;

      if (hasRealElev && demElevations) {
        // True North-Up DEM Alignment:
        // row 0 in PlaneGeometry corresponds to -sizeZ/2 (North).
        // The Open-Meteo elevation grid has row 0 at South and row (demDim-1) at North.
        // Therefore, row 0 (North) must map to (demDim - 1).
        const demR = ((gridRes - row) / gridRes) * (demDim - 1);
        const demC = (col / gridRes) * (demDim - 1);

        const r0 = Math.floor(demR);
        const r1 = Math.min(demDim - 1, r0 + 1);
        const c0 = Math.floor(demC);
        const c1 = Math.min(demDim - 1, c0 + 1);

        const rf = demR - r0;
        const cf = demC - c0;

        const e00 = demElevations[r0 * demDim + c0] ?? demMinM!;
        const e01 = demElevations[r0 * demDim + c1] ?? demMinM!;
        const e10 = demElevations[r1 * demDim + c0] ?? demMinM!;
        const e11 = demElevations[r1 * demDim + c1] ?? demMinM!;

        const elev = (1 - rf) * ((1 - cf) * e00 + cf * e01) + rf * ((1 - cf) * e10 + cf * e11);
        const norm = Math.max(0, Math.min(1, (elev - demMinM!) / elevSpan));

        rawHeight = norm * (Math.min(3.5, Math.max(0.5, extrusionScale)) * 0.35);
        elevMsl = Math.round(elev * 10) / 10;
      } else {
        // Zero-Fabrication Fallback: Flat reference plane
        rawHeight = 0;
        elevMsl = null;
      }

      pos.setY(i, rawHeight);
      elevMatrix[row][col] = elevMsl;
    }

    geo.computeVertexNormals();

    // Flood Inundation Surface Mesh (Exact match to raster footprint)
    const waterGeo = new THREE.PlaneGeometry(sizeX, sizeZ, gridRes, gridRes);
    waterGeo.rotateX(-Math.PI / 2);
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) {
      wPos.setY(i, pos.getY(i) + (hasRealElev ? 0.012 : 0.005) + waterStageOffset * 0.05);
    }
    waterGeo.computeVertexNormals();

    // Iso-Elevation Contour Lines (Only generated when true DEM elevation is available)
    const contourPoints: THREE.Vector3[] = [];
    if (showContours && hasRealElev && demMinM !== null && demMaxM !== null) {
      const step = Math.max(5, Math.round(elevSpan / 8));
      const contourIntervals: number[] = [];
      for (let c = Math.ceil(demMinM / step) * step; c <= demMaxM; c += step) {
        contourIntervals.push(c);
      }

      for (let r = 0; r < gridRes; r++) {
        for (let c = 0; c < gridRes; c++) {
          const e0 = elevMatrix[r][c];
          const e1 = elevMatrix[r][c + 1];
          const e2 = elevMatrix[r + 1][c];
          if (e0 === null || e1 === null || e2 === null) continue;

          const i0 = r * (gridRes + 1) + c;
          const i1 = r * (gridRes + 1) + (c + 1);
          const i2 = (r + 1) * (gridRes + 1) + c;

          contourIntervals.forEach((level) => {
            if ((e0 <= level && e1 > level) || (e0 > level && e1 <= level)) {
              const frac = Math.abs(e0 - e1) > 0.001 ? (level - e0) / (e1 - e0) : 0.5;
              const cx = pos.getX(i0) + frac * (pos.getX(i1) - pos.getX(i0));
              const cy = pos.getY(i0) + frac * (pos.getY(i1) - pos.getY(i0)) + 0.006;
              const cz = pos.getZ(i0) + frac * (pos.getZ(i1) - pos.getZ(i0));
              contourPoints.push(new THREE.Vector3(cx - 0.015, cy, cz));
              contourPoints.push(new THREE.Vector3(cx + 0.015, cy, cz));
            }
            if ((e0 <= level && e2 > level) || (e0 > level && e2 <= level)) {
              const frac = Math.abs(e0 - e2) > 0.001 ? (level - e0) / (e2 - e0) : 0.5;
              const cx = pos.getX(i0) + frac * (pos.getX(i2) - pos.getX(i0));
              const cy = pos.getY(i0) + frac * (pos.getY(i2) - pos.getY(i0)) + 0.006;
              const cz = pos.getZ(i0) + frac * (pos.getZ(i2) - pos.getZ(i0));
              contourPoints.push(new THREE.Vector3(cx, cy, cz - 0.015));
              contourPoints.push(new THREE.Vector3(cx, cy, cz + 0.015));
            }
          });
        }
      }
    }
    const contourGeo = new THREE.BufferGeometry().setFromPoints(contourPoints);

    // Spatial Flood Cluster Centroids (Only validated U-Net detected clusters)
    const rawPins: InfrastructurePin[] = [];
    if (isVerified && analysisResult?.spatial_zones && analysisResult.spatial_zones.length > 0 && analysisResult.geographic_bounds) {
      const b = analysisResult.geographic_bounds;
      const dLon = b.east - b.west;
      const dLat = b.north - b.south;

      analysisResult.spatial_zones.slice(0, 5).forEach((zone) => {
        if (!zone.centroid_latlng) return;
        const [cLat, cLon] = zone.centroid_latlng;
        const u = dLon > 0 ? (cLon - b.west) / dLon : 0.5;
        const v = dLat > 0 ? (b.north - cLat) / dLat : 0.5;
        const px = (u - 0.5) * sizeX;
        const pz = (v - 0.5) * sizeZ;

        const gridR = Math.min(gridRes, Math.max(0, Math.round(v * gridRes)));
        const gridC = Math.min(gridRes, Math.max(0, Math.round(u * gridRes)));
        const elevAtPin = elevMatrix[gridR]?.[gridC] ?? null;

        rawPins.push({
          id: `zone-${zone.zone_id}`,
          name: `Inundation Cluster #${zone.zone_id} (${zone.category.replace(/_/g, ' ')})`,
          type: 'Detected Inundation Zone',
          position: [px, (pos.getY(gridR * (gridRes + 1) + gridC) || 0) + 0.1, pz],
          elevationMsl: elevAtPin,
          isSubmerged: true,
          areaHa: zone.area_ha,
          probability: zone.mean_probability,
        });
      });
    }

    return {
      terrainGeometry: geo,
      waterGeometry: waterGeo,
      contourGeometry: contourGeo,
      pins: rawPins,
      elevationMatrix: elevMatrix,
    };
  }, [sizeX, sizeZ, isVerified, hasMeasuredDem, demElevations, demMinM, demMaxM, extrusionScale, showContours, analysisResult, waterStageOffset]);

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (!e.point) return;
    const wx = e.point.x;
    const wz = e.point.z;

    const u = Math.min(1, Math.max(0, (wx + sizeX / 2) / sizeX));
    const v = Math.min(1, Math.max(0, (wz + sizeZ / 2) / sizeZ));

    let lat: number | null = null;
    let lon: number | null = null;

    if (analysisResult?.geographic_bounds) {
      const b = analysisResult.geographic_bounds;
      lon = b.west + u * (b.east - b.west);
      lat = b.north - v * (b.north - b.south);
    } else if (effectiveBounds) {
      lon = effectiveBounds.west + u * (effectiveBounds.east - effectiveBounds.west);
      lat = effectiveBounds.north - v * (effectiveBounds.north - effectiveBounds.south);
    }

    const gridR = Math.min(gridRes, Math.max(0, Math.round(v * gridRes)));
    const gridC = Math.min(gridRes, Math.max(0, Math.round(u * gridRes)));
    const groundElev = elevationMatrix[gridR]?.[gridC] ?? null;

    if (lat !== null && lon !== null) {
      onProbeDepth({
        worldX: wx,
        worldZ: wz,
        lat: parseFloat(lat.toFixed(5)),
        lon: parseFloat(lon.toFixed(5)),
        groundElevationMeters: groundElev,
        waterSurfaceMeters: null,
        submergedDepthMeters: null,
        isSubmerged: false,
        classification: hasMeasuredDem
          ? `Open-Meteo Point Elevation Samples (~90m GLO-90 DEM, ${demMinM ?? 0}m – ${demMaxM ?? 100}m MSL)`
          : '2D Optical Surface (DEM Unavailable · Flat Reference Plane)',
      });
    } else {
      onProbeDepth({
        worldX: wx,
        worldZ: wz,
        lat: null,
        lon: null,
        groundElevationMeters: null,
        waterSurfaceMeters: null,
        submergedDepthMeters: null,
        isSubmerged: false,
        classification: 'Reference Scene · Flat Reference Plane',
      });
    }
  };

  const activeTexture = useMemo(() => {
    if (shadingMode === 'hypsometric' && loadedTextures.hypsometric) {
      return loadedTextures.hypsometric;
    }
    if (shadingMode === 'probability' && loadedTextures.heatmap) {
      return loadedTextures.heatmap;
    }
    if (shadingMode === 'radar' && loadedTextures.radar) {
      return loadedTextures.radar;
    }
    return loadedTextures.optical;
  }, [shadingMode, loadedTextures]);

  return (
    <group onPointerMove={handlePointerMove} onPointerLeave={() => onProbeDepth(null)}>
      {/* 1. Base Terrain Mesh with Real Satellite Raster Texture */}
      <mesh ref={meshRef} geometry={terrainGeometry} receiveShadow castShadow>
        {activeTexture ? (
          <meshStandardMaterial
            map={activeTexture}
            color="#ffffff"
            transparent={true}
            alphaTest={0.01}
            roughness={0.65}
            metalness={0.05}
          />
        ) : (
          <meshStandardMaterial
            color={0x0f172a}
            roughness={0.88}
            metalness={0.06}
          />
        )}
      </mesh>

      {/* 2. Iso-Elevation Contour Lines (Only shown when genuine DEM elevation exists) */}
      {showContours && hasMeasuredDem && demElevations && demElevations.length > 0 && (
        <lineSegments geometry={contourGeometry}>
          <lineBasicMaterial color={0x38bdf8} transparent opacity={0.4} linewidth={1} />
        </lineSegments>
      )}

      {/* 3. Verified Flood Inundation Mask Overlay (Translucent cyan overlay strictly atop water) */}
      {showFloodMask && isVerified && loadedTextures.mask && (
        <mesh ref={waterMeshRef} geometry={waterGeometry}>
          <meshStandardMaterial
            map={loadedTextures.mask}
            color="#ffffff"
            transparent={true}
            opacity={0.55}
            roughness={0.15}
            metalness={0.15}
            alphaTest={0.02}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 4. Live Doppler Radar Overlay */}
      {showRadarOverlay && loadedTextures.radar && (
        <mesh geometry={waterGeometry} position={[0, 0.012, 0]}>
          <meshStandardMaterial
            map={loadedTextures.radar}
            transparent={true}
            opacity={0.65}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 5. Detected Spatial Flood Cluster Centroids */}
      {pins.map((pin) => (
        <group
          key={pin.id}
          position={pin.position}
          onPointerOver={() => onHoverPin(pin)}
          onPointerOut={() => onHoverPin(null)}
        >
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshStandardMaterial
              color={0x06b6d4}
              emissive={0x0284c7}
              emissiveIntensity={0.8}
            />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}

      {/* 6. Subtle, Clean Geospatial Reference Ground Grid */}
      {showGrid && (
        <gridHelper
          args={[Math.max(sizeX, sizeZ) * 1.15, 16, 0x334155, 0x1e293b]}
          position={[0, -0.01, 0]}
        />
      )}
    </group>
  );
}

export const ExtrudedFloodTerrainR3F: React.FC<ExtrudedFloodTerrainProps> = ({
  className = '',
  selectedLocation = 'Satellite Raster Scene',
  terrainType = 'alluvial',
  floodCoveragePercent = 0,
  initialWaterLevel = 0.2,
  extrusionScale = 2.0,
  analysisResult = null,
  hasMeasuredDem: initialHasDem = false,
  measuredElevationMeters = null,
  rasterPreviewUrl = null,
  layerConfig,
  coordinates = null,
  onClearAnalysis,
}) => {
  const [shadingMode, setShadingMode] = useState<'hypsometric' | 'depth' | 'satellite' | 'sar' | 'probability' | 'radar'>('satellite');
  const [showContours, setShowContours] = useState<boolean>(false);
  const [showFloodMask, setShowFloodMask] = useState<boolean>(true);
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(false);
  const [showSpatialGrid, setShowSpatialGrid] = useState<boolean>(true);
  const [hoveredPin, setHoveredPin] = useState<InfrastructurePin | null>(null);
  const [depthProbe, setDepthProbe] = useState<DepthProbeData | null>(null);
  const [cameraView, setCameraView] = useState<'perspective' | 'top' | 'crossSection'>('perspective');
  const [modalNotice, setModalNotice] = useState<string | null>(null);
  const [waterStageOffset, setWaterStageOffset] = useState<number>(0.0);

  // Single Authoritative Scene State (No Contradictions)
  const sceneMode: SceneMode = useMemo(() => {
    if (
      analysisResult &&
      (analysisResult.status === 'SUCCESS' || analysisResult.status === 'Completed') &&
      analysisResult.mask_png_data_url
    ) {
      return 'validated-analysis';
    }
    if (analysisResult?.raster_preview_data_url || rasterPreviewUrl) {
      return 'uploaded-imagery';
    }
    return 'catalog-reference';
  }, [analysisResult, rasterPreviewUrl]);

  // Sync with global layerConfig if provided
  useEffect(() => {
    if (layerConfig) {
      setShowFloodMask(layerConfig.floodMask.enabled);
      if (layerConfig.confidenceHeatmap.enabled) {
        setShadingMode('probability');
      } else if (shadingMode === 'probability') {
        setShadingMode('satellite');
      }
    }
  }, [layerConfig]);

  const controlsRef = useRef<any>(null);

  // Match selectedLocation to known global disaster catalog coordinates
  const matchedSpot = useMemo(() => {
    return (
      GLOBAL_DISASTERS.find(
        (d) =>
          selectedLocation.toLowerCase().includes(d.name.toLowerCase()) ||
          selectedLocation.toLowerCase().includes(d.country.toLowerCase()) ||
          selectedLocation.toLowerCase().includes(d.id.toLowerCase())
      ) || GLOBAL_DISASTERS[0]
    );
  }, [selectedLocation]);

  // Determine authoritative scene coordinates from analysis result or catalog spot
  const targetCoords = useMemo(() => {
    if (analysisResult?.origin_lat != null && analysisResult?.origin_lon != null) {
      return { lat: analysisResult.origin_lat, lon: analysisResult.origin_lon };
    }
    if (analysisResult?.geographic_bounds) {
      return {
        lat: (analysisResult.geographic_bounds.north + analysisResult.geographic_bounds.south) / 2,
        lon: (analysisResult.geographic_bounds.east + analysisResult.geographic_bounds.west) / 2,
      };
    }
    if (coordinates?.lat != null && coordinates?.lon != null) {
      return coordinates;
    }
    return { lat: matchedSpot.lat, lon: matchedSpot.lon };
  }, [analysisResult, coordinates, matchedSpot]);

  // Effective geographic bounding box for real-time DEM and imagery queries
  const effectiveBounds = useMemo(() => {
    if (
      analysisResult?.geographic_bounds &&
      analysisResult.geographic_bounds.south != null &&
      analysisResult.geographic_bounds.north != null
    ) {
      return analysisResult.geographic_bounds;
    }
    const delta = 0.035; // ~7.5km tile footprint
    return {
      south: targetCoords.lat - delta,
      west: targetCoords.lon - delta,
      north: targetCoords.lat + delta,
      east: targetCoords.lon + delta,
    };
  }, [analysisResult?.geographic_bounds, targetCoords]);

  // Real-time Copernicus GLO-90 DEM State
  const [realtimeDem, setRealtimeDem] = useState<{
    hasDem: boolean;
    elevations: number[] | null;
    minM: number | null;
    maxM: number | null;
    source: string;
    isLoading: boolean;
  }>({
    hasDem: false,
    elevations: null,
    minM: null,
    maxM: null,
    source: 'None',
    isLoading: false,
  });

  // Real-time Live Weather Telemetry State
  const [realtimeWeather, setRealtimeWeather] = useState<{
    temperatureC: number | null;
    weatherCode: number | null;
    weatherDesc: string | null;
    precipMmPerHour: number | null;
    windSpeedKmh: number | null;
    humidity: number | null;
    timestamp: string | null;
    isLoading: boolean;
  } | null>(null);

  // Real-time RainViewer Radar Tile URL State
  const [radarTileUrl, setRadarTileUrl] = useState<string | null>(null);

  // 1. Fetch authenticated real-time Copernicus GLO-90 DEM for the effective scene bounds
  useEffect(() => {
    if (effectiveBounds.south == null || effectiveBounds.north == null || effectiveBounds.west == null || effectiveBounds.east == null) {
      setRealtimeDem({
        hasDem: false,
        elevations: null,
        minM: null,
        maxM: null,
        source: 'Unavailable',
        isLoading: false,
      });
      return;
    }

    let isCancelled = false;
    setRealtimeDem((prev) => ({ ...prev, isLoading: true }));

    const fetchDem = async () => {
      try {
        const res = await fetch(
          `/api/external/elevation?south=${effectiveBounds.south}&west=${effectiveBounds.west}&north=${effectiveBounds.north}&east=${effectiveBounds.east}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'SUCCESS' && Array.isArray(data.elevations) && data.elevations.length > 0) {
            if (!isCancelled) {
              setRealtimeDem({
                hasDem: true,
                elevations: data.elevations,
                minM: data.min_elevation_m ?? Math.min(...data.elevations),
                maxM: data.max_elevation_m ?? Math.max(...data.elevations),
                source: data.provenance || 'Copernicus GLO-90 DEM (Open-Meteo)',
                isLoading: false,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Real-time DEM fetch failed:', err);
      }
      if (!isCancelled) {
        setRealtimeDem({
          hasDem: false,
          elevations: null,
          minM: null,
          maxM: null,
          source: 'Unavailable',
          isLoading: false,
        });
      }
    };

    fetchDem();
    return () => {
      isCancelled = true;
    };
  }, [
    effectiveBounds.south,
    effectiveBounds.north,
    effectiveBounds.west,
    effectiveBounds.east,
  ]);

  // 2. Fetch authenticated real-time Weather Telemetry for the scene coordinates
  useEffect(() => {
    const lat = targetCoords.lat;
    const lon = targetCoords.lon;
    let isCancelled = false;

    const fetchWeather = async () => {
      try {
        const res = await fetch(`/api/external/weather-forecast?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'SUCCESS' && data.current) {
            if (!isCancelled) {
              setRealtimeWeather({
                temperatureC: data.current.temperature_c ?? null,
                weatherCode: data.current.weather_code ?? null,
                weatherDesc: data.current.weather_description ?? 'Observed Conditions',
                precipMmPerHour: data.current.precipitation_mm ?? 0,
                windSpeedKmh: data.current.wind_speed_kmh ?? null,
                humidity: data.current.humidity ?? null,
                timestamp: data.current.timestamp ?? new Date().toISOString(),
                isLoading: false,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Live weather telemetry fetch failed:', err);
      }
      if (!isCancelled) {
        setRealtimeWeather(null);
      }
    };

    fetchWeather();
    return () => {
      isCancelled = true;
    };
  }, [targetCoords.lat, targetCoords.lon]);

  // 3. Fetch real-time RainViewer Live Doppler Radar tile for scene coordinates
  useEffect(() => {
    let isCancelled = false;
    const fetchRadar = async () => {
      try {
        const meta = await getRainViewerMetadata();
        if (meta && meta.radar?.past && meta.radar.past.length > 0) {
          const latest = meta.radar.past[meta.radar.past.length - 1];
          const zoom = 10;
          const n = Math.pow(2, zoom);
          const tileX = Math.floor(((targetCoords.lon + 180) / 360) * n);
          const latRad = (targetCoords.lat * Math.PI) / 180;
          const tileY = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
          const url = getRainViewerTileUrl(meta.host, latest.path, zoom, tileX, tileY, 2, 1, 1);
          if (!isCancelled) {
            setRadarTileUrl(url);
          }
        }
      } catch (e) {
        console.warn('RainViewer live radar tile fetch failed:', e);
      }
    };

    fetchRadar();
    return () => {
      isCancelled = true;
    };
  }, [targetCoords.lat, targetCoords.lon]);

  // Compute truthful aspect ratio from actual raster footprint
  const { sizeX, sizeZ } = useMemo(() => {
    const baseDim = 7.2;
    if (analysisResult?.geographic_bounds) {
      const b = analysisResult.geographic_bounds;
      const dLat = Math.abs(b.north - b.south);
      const dLon = Math.abs(b.east - b.west);
      const midLatRad = (((b.north + b.south) / 2) * Math.PI) / 180;
      const dEast = dLon * Math.cos(midLatRad);
      if (dLat > 0 && dEast > 0) {
        const ratio = dEast / dLat;
        const clamped = Math.min(2.4, Math.max(0.42, ratio));
        if (clamped >= 1) {
          return { sizeX: baseDim, sizeZ: baseDim / clamped };
        } else {
          return { sizeX: baseDim * clamped, sizeZ: baseDim };
        }
      }
    }
    return { sizeX: baseDim, sizeZ: baseDim };
  }, [analysisResult?.geographic_bounds]);

  // Generate hypsometric elevation texture when Copernicus DEM is active
  const hypsometricTexture = useMemo(() => {
    if (!realtimeDem.hasDem || !realtimeDem.elevations || realtimeDem.elevations.length === 0) {
      return null;
    }
    const elevs = realtimeDem.elevations;
    const dim = Math.round(Math.sqrt(elevs.length));
    const minM = realtimeDem.minM ?? 0;
    const maxM = realtimeDem.maxM ?? 100;
    const range = Math.max(1, maxM - minM);

    const canvas = document.createElement('canvas');
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(dim, dim);
    for (let r = 0; r < dim; r++) {
      // Invert row indexing so North (top of canvas) maps to North of elevation data
      const demRow = dim - 1 - r;
      for (let c = 0; c < dim; c++) {
        const idx = demRow * dim + c;
        const elev = elevs[idx] ?? minM;
        const norm = Math.max(0, Math.min(1, (elev - minM) / range));

        let red = 22;
        let green = 101;
        let blue = 52;

        if (norm < 0.25) {
          red = 21; green = 128; blue = 61;
        } else if (norm < 0.50) {
          red = 101; green = 163; blue = 13;
        } else if (norm < 0.75) {
          red = 180; green = 83; blue = 9;
        } else if (norm < 0.90) {
          red = 100; green = 116; blue = 139;
        } else {
          red = 248; green = 250; blue = 252;
        }

        const p = (r * dim + c) * 4;
        imgData.data[p] = red;
        imgData.data[p + 1] = green;
        imgData.data[p + 2] = blue;
        imgData.data[p + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.flipY = true;
    return tex;
  }, [realtimeDem.hasDem, realtimeDem.elevations, realtimeDem.minM, realtimeDem.maxM]);

  // Fallback high-resolution Esri satellite tile for the scene coordinates
  const fallbackSatelliteTile = useMemo(() => {
    return getEsriSatelliteTileUrl(targetCoords.lat, targetCoords.lon, 11);
  }, [targetCoords.lat, targetCoords.lon]);

  // Load and cache real textures with clean lifecycle disposal
  const [loadedTextures, setLoadedTextures] = useState<{
    optical: THREE.Texture | null;
    mask: THREE.Texture | null;
    heatmap: THREE.Texture | null;
    hypsometric: THREE.Texture | null;
    radar: THREE.Texture | null;
  }>({ optical: null, mask: null, heatmap: null, hypsometric: null, radar: null });

  const [isLoadingTextures, setIsLoadingTextures] = useState<boolean>(false);

  // Sync hypsometric texture into loadedTextures whenever DEM completes
  useEffect(() => {
    if (hypsometricTexture) {
      setLoadedTextures((prev) => ({
        ...prev,
        hypsometric: hypsometricTexture,
      }));
    }
  }, [hypsometricTexture]);

  useEffect(() => {
    const opticalUrl =
      sceneMode === 'catalog-reference'
        ? fallbackSatelliteTile
        : analysisResult?.raster_preview_data_url || rasterPreviewUrl || fallbackSatelliteTile;

    const maskUrl =
      sceneMode === 'validated-analysis' && analysisResult?.mask_png_data_url
        ? analysisResult.mask_png_data_url
        : null;

    const heatmapUrl =
      sceneMode === 'validated-analysis' && analysisResult?.confidence_heatmap_data_url
        ? analysisResult.confidence_heatmap_data_url
        : null;

    let isCancelled = false;
    setIsLoadingTextures(true);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    const loadAsync = (url: string | null | undefined): Promise<THREE.Texture | null> => {
      if (!url) return Promise.resolve(null);
      return new Promise((resolve) => {
        loader.load(
          url,
          (tex) => {
            if (isCancelled) {
              tex.dispose();
              resolve(null);
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.flipY = true;
            tex.needsUpdate = true;
            resolve(tex);
          },
          undefined,
          (err) => {
            console.warn('3D Texture failed to load:', err);
            resolve(null);
          }
        );
      });
    };

    Promise.all([
      loadAsync(opticalUrl),
      loadAsync(maskUrl),
      loadAsync(heatmapUrl),
      loadAsync(radarTileUrl),
    ]).then(([opticalTex, mask, heatmap, radar]) => {
      const optical = opticalTex || createProceduralTerrainTexture();
      if (!isCancelled) {
        setLoadedTextures((prev) => {
          prev.optical?.dispose();
          prev.mask?.dispose();
          prev.heatmap?.dispose();
          prev.radar?.dispose();
          return { optical, mask, heatmap, hypsometric: hypsometricTexture, radar };
        });
        setIsLoadingTextures(false);
      } else {
        optical?.dispose();
        mask?.dispose();
        heatmap?.dispose();
        radar?.dispose();
      }
    });

    return () => {
      isCancelled = true;
      setIsLoadingTextures(false);
    };
  }, [
    sceneMode,
    (analysisResult as any)?.analysis_id,
    analysisResult?.raster_preview_data_url,
    analysisResult?.mask_png_data_url,
    analysisResult?.confidence_heatmap_data_url,
    rasterPreviewUrl,
    fallbackSatelliteTile,
    radarTileUrl,
    hypsometricTexture,
  ]);

  // Reset camera view with framing
  const resetCamera = (mode: 'perspective' | 'top' | 'crossSection') => {
    setCameraView(mode);
    if (!controlsRef.current) return;
    const maxDim = Math.max(sizeX, sizeZ);
    if (mode === 'top') {
      // Top Nadir: Camera directly above center looking down, with up=(0, 0, -1) so North is UP on screen
      controlsRef.current.object.up.set(0, 0, -1);
      controlsRef.current.object.position.set(0, maxDim * 1.5, 0.0001);
    } else if (mode === 'crossSection') {
      controlsRef.current.object.up.set(0, 1, 0);
      controlsRef.current.object.position.set(sizeX * 1.35, 0.25, 0);
    } else {
      // 3D Perspective: Centered on X, positioned South looking North towards -Z
      controlsRef.current.object.up.set(0, 1, 0);
      controlsRef.current.object.position.set(0, maxDim * 0.95, sizeZ * 1.15);
    }
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const effectiveHasDem = realtimeDem.hasDem || initialHasDem;
  const effectiveDemMin = realtimeDem.minM ?? (measuredElevationMeters !== null ? measuredElevationMeters - 20 : null);
  const effectiveDemMax = realtimeDem.maxM ?? (measuredElevationMeters !== null ? measuredElevationMeters + 20 : null);

  // Formulate authoritative location and area readouts based strictly on sceneMode
  const locationDisplay = useMemo(() => {
    if (sceneMode === 'validated-analysis' || sceneMode === 'uploaded-imagery') {
      if (analysisResult?.filename) {
        if (analysisResult.origin_lat != null && analysisResult.origin_lon != null) {
          const latStr = analysisResult.origin_lat >= 0 ? `${analysisResult.origin_lat.toFixed(3)}°N` : `${Math.abs(analysisResult.origin_lat).toFixed(3)}°S`;
          const lonStr = analysisResult.origin_lon >= 0 ? `${analysisResult.origin_lon.toFixed(3)}°E` : `${Math.abs(analysisResult.origin_lon).toFixed(3)}°W`;
          return `${analysisResult.filename} (${latStr}, ${lonStr})`;
        }
        return analysisResult.filename;
      }
    }
    return `${matchedSpot.name}, ${matchedSpot.country}`;
  }, [sceneMode, analysisResult, matchedSpot]);

  const displayedArea = useMemo(() => {
    if (sceneMode === 'validated-analysis') {
      if (analysisResult?.physical_area_ha != null) {
        return `${analysisResult.physical_area_ha.toFixed(1)} ha`;
      }
      return 'Calculating...';
    }
    if (sceneMode === 'uploaded-imagery') {
      return 'Not Run';
    }
    return `${matchedSpot.estimatedInundationHa.toLocaleString()} ha (Historical Benchmark)`;
  }, [sceneMode, analysisResult, matchedSpot]);

  return (
    <div className={`relative w-full rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* 3D WebGL Canvas Viewport */}
      <div className="relative w-full h-[520px] sm:h-[580px] bg-[#030712]">
        {isLoadingTextures && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center gap-2 font-mono text-xs text-cyan-300">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Mapping Satellite Textures...</span>
          </div>
        )}

        <Canvas shadows gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}>
          <color attach="background" args={['#030712']} />
          <PerspectiveCamera
            makeDefault
            position={[0, Math.max(sizeX, sizeZ) * 0.95, sizeZ * 1.15]}
            fov={42}
          />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={2.0}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2.02}
          />
          <ambientLight intensity={1.5} color="#f8fafc" />
          <directionalLight
            position={[sizeX * 0.8, 12, sizeZ * 0.7]}
            intensity={2.0}
            castShadow
            shadow-mapSize={[1024, 1024]}
            color="#ffffff"
          />
          <directionalLight position={[-sizeX * 0.6, 6, -sizeZ * 0.6]} intensity={0.6} color="#38bdf8" />

          <ScientificTerrainMesh
            sizeX={sizeX}
            sizeZ={sizeZ}
            shadingMode={shadingMode}
            showContours={showContours}
            showFloodMask={showFloodMask}
            showRadarOverlay={showRadarOverlay}
            showGrid={showSpatialGrid}
            sceneMode={sceneMode}
            hasMeasuredDem={effectiveHasDem}
            demElevations={realtimeDem.elevations}
            demMinM={effectiveDemMin}
            demMaxM={effectiveDemMax}
            extrusionScale={extrusionScale}
            analysisResult={analysisResult}
            loadedTextures={loadedTextures}
            effectiveBounds={effectiveBounds}
            waterStageOffset={waterStageOffset}
            onHoverPin={setHoveredPin}
            onProbeDepth={setDepthProbe}
          />
        </Canvas>

        {/* Side Profile Elevation Cross-Section View Overlay */}
        {cameraView === 'crossSection' && effectiveHasDem && realtimeDem.elevations && (
          <div className="absolute inset-0 z-35 bg-slate-950/96 p-6 flex flex-col justify-between font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Mountain className="w-4 h-4" />
                <span>BASIN TOPOGRAPHIC CROSS-SECTION (5KM TRANSECT)</span>
              </div>
              <button
                onClick={() => resetCamera('perspective')}
                className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                Return to 3D View
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              <svg className="w-full h-48 overflow-visible" viewBox="0 0 600 200">
                {[0, 50, 100, 150, 200].map((y, idx) => (
                  <line key={idx} x1="0" y1={y} x2="600" y2={y} stroke="#1e293b" strokeDasharray="4,4" />
                ))}
                <path
                  d={
                    `M 0 200 ` +
                    realtimeDem.elevations.slice(0, 30).map((e, i) => {
                      const minE = realtimeDem.minM || 0;
                      const maxE = realtimeDem.maxM || 100;
                      const span = Math.max(1, maxE - minE);
                      const norm = (e - minE) / span;
                      const x = (i / 29) * 600;
                      const y = 180 - norm * 140;
                      return `L ${x} ${y}`;
                    }).join(' ') +
                    ` L 600 200 Z`
                  }
                  fill="rgba(6, 182, 212, 0.15)"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />
                <line
                  x1="0"
                  y1={80 - waterStageOffset * 20}
                  x2="600"
                  y2={80 - waterStageOffset * 20}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                />
                <text x="10" y="70" fill="#38bdf8" fontSize="10">
                  Simulation Water Surface (+{waterStageOffset.toFixed(1)}m)
                </text>
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-2">
              <span>Transect Start: West Catchment Boundary</span>
              <span className="text-cyan-300 font-bold">
                Relief: {((realtimeDem.maxM || 100) - (realtimeDem.minM || 0)).toFixed(1)}m MSL
              </span>
              <span>Transect End: East Catchment Boundary</span>
            </div>
          </div>
        )}

        {/* Top-Left Telemetry & Verification Provenance HUD */}
        <div className="absolute top-3 left-3 pointer-events-none z-10 space-y-1.5">
          <div className="bg-slate-950/92 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800/90 shadow-xl pointer-events-auto max-w-sm text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    sceneMode === 'validated-analysis'
                      ? 'bg-cyan-400'
                      : sceneMode === 'uploaded-imagery'
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="text-xs font-mono font-bold text-white tracking-wide truncate">
                  {locationDisplay}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded border shrink-0 font-bold ${
                  sceneMode === 'validated-analysis'
                    ? 'text-cyan-300 bg-cyan-950/80 border-cyan-700'
                    : sceneMode === 'uploaded-imagery'
                    ? 'text-amber-300 bg-amber-950/80 border-amber-700'
                    : 'text-slate-400 bg-slate-900 border-slate-800'
                }`}
              >
                {sceneMode === 'validated-analysis'
                  ? 'VALIDATED U-NET ANALYSIS'
                  : sceneMode === 'uploaded-imagery'
                  ? 'UPLOADED RASTER SCENE'
                  : 'CATALOG REFERENCE'}
              </span>
            </div>

            {/* Physical Measurements Readout */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2 mt-1.5 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 block">Flood Extent</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {sceneMode === 'validated-analysis'
                    ? `${analysisResult?.coverage_percent}%`
                    : sceneMode === 'uploaded-imagery'
                    ? 'Pending'
                    : 'Historical'}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {sceneMode === 'validated-analysis'
                    ? 'U-Net Model'
                    : sceneMode === 'uploaded-imagery'
                    ? 'Awaiting Inference'
                    : 'Reference Catalog'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Elevation Datum</span>
                {effectiveHasDem && effectiveDemMin !== null && effectiveDemMax !== null ? (
                  <>
                    <span className="text-white font-bold tabular-nums">
                      {effectiveDemMin.toFixed(0)}m – {effectiveDemMax.toFixed(0)}m MSL
                    </span>
                    <span
                      className="text-[9px] text-cyan-400 block truncate"
                      title="Open-Meteo unauthenticated Elevation API (~90m point elevation sampling, Copernicus GLO-90 DEM). Discrete point samples; not a continuous raster DEM."
                    >
                      Point Samples (~90m)
                    </span>
                  </>
                ) : realtimeDem.isLoading ? (
                  <>
                    <span className="text-cyan-400 font-semibold">Loading...</span>
                    <span className="text-[9px] text-slate-500 block">Querying Elevation Samples</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-300 font-semibold">Unavailable</span>
                    <span className="text-[9px] text-slate-500 block">Flat Optical Plane</span>
                  </>
                )}
              </div>
              <div>
                <span className="text-slate-400 block">Flooded Area</span>
                <span
                  className={`font-bold tabular-nums truncate block ${
                    sceneMode === 'validated-analysis' ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                  title={displayedArea}
                >
                  {displayedArea}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {sceneMode === 'validated-analysis'
                    ? analysisResult?.area_calculation_method || 'Calculated'
                    : sceneMode === 'uploaded-imagery'
                    ? 'Inference Required'
                    : 'Historical Benchmark'}
                </span>
              </div>
            </div>

            {/* Real-Time Live Weather Readout */}
            {realtimeWeather && (
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 pt-1.5 mt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-bold uppercase tracking-wider shrink-0">METEOROLOGY:</span>
                  <span className="truncate">{realtimeWeather.weatherDesc}</span>
                  <span>·</span>
                  <span className="text-white font-bold shrink-0">{realtimeWeather.temperatureC}°C</span>
                  {realtimeWeather.precipMmPerHour !== null && realtimeWeather.precipMmPerHour > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-cyan-300 font-bold shrink-0">{realtimeWeather.precipMmPerHour} mm/h</span>
                    </>
                  )}
                </div>
                <span className="text-[8px] text-slate-500 shrink-0">Open-Meteo</span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right Shading & Modality Selector */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10 pointer-events-auto">
          <div className="bg-slate-950/92 backdrop-blur-md p-1 rounded-xl border border-slate-800/90 flex items-center gap-1 shadow-xl text-[10px] font-mono flex-wrap justify-end">
            <button
              onClick={() => { setShadingMode('satellite'); setModalNotice(null); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                shadingMode === 'satellite'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite Imagery
            </button>
            <button
              onClick={() => {
                if (loadedTextures.radar || radarTileUrl) {
                  setShadingMode('radar');
                  setModalNotice(null);
                } else {
                  setModalNotice('LIVE RADAR UNAVAILABLE: RainViewer Doppler radar tile unavailable for scene coordinates.');
                }
              }}
              title="Real-time RainViewer Doppler precipitation radar surface"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                shadingMode === 'radar'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>Weather Radar</span>
            </button>
            <button
              onClick={() => {
                if (sceneMode === 'validated-analysis' && loadedTextures.heatmap) {
                  setShadingMode('probability');
                  setModalNotice(null);
                } else {
                  setModalNotice(
                    'PROBABILITY HEATMAP UNAVAILABLE: Model probability heatmap requires a completed U-Net segmentation run on a supported 3-band input.'
                  );
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                shadingMode === 'probability'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : !loadedTextures.heatmap || sceneMode !== 'validated-analysis'
                  ? 'text-slate-500 hover:text-slate-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {(!loadedTextures.heatmap || sceneMode !== 'validated-analysis') && <Lock className="w-3 h-3 text-slate-500" />}
              <span>Flood Probability</span>
            </button>
            <button
              onClick={() => {
                if (effectiveHasDem) {
                  setShadingMode('hypsometric');
                  setModalNotice(null);
                } else {
                  setModalNotice(
                    'ELEVATION TINT UNAVAILABLE: Copernicus DEM is currently unreferenced or unavailable for this raster tile. Terrain rendered on flat reference plane.'
                  );
                }
              }}
              title={effectiveHasDem ? 'Switch to Copernicus DEM hypsometric tinting' : 'Elevation tint requires DEM'}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                shadingMode === 'hypsometric'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : !effectiveHasDem
                  ? 'text-slate-500 hover:text-slate-400 bg-slate-900/60 border border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {!effectiveHasDem && <Lock className="w-3 h-3 text-amber-500" />}
              <span>Elevation Tint</span>
            </button>
          </div>

          {/* Modal / Analytical Notice Banner */}
          {modalNotice && (
            <div className="bg-amber-950/95 border border-amber-500/60 rounded-xl p-2.5 max-w-sm text-left font-mono text-[10px] text-amber-200 shadow-xl flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold leading-relaxed">{modalNotice}</p>
                <button
                  onClick={() => setModalNotice(null)}
                  className="text-[9px] underline text-amber-300 hover:text-amber-100 cursor-pointer"
                >
                  Dismiss notice
                </button>
              </div>
            </div>
          )}

          {/* Camera View Presets */}
          <div className="flex items-center gap-1.5">
            <div className="bg-slate-950/92 backdrop-blur-md p-1 rounded-lg border border-slate-800/90 flex items-center gap-1 shadow-lg text-[10px] font-mono">
              <button
                onClick={() => resetCamera('perspective')}
                aria-label="3D Perspective Camera"
                className={`px-2 py-0.8 rounded transition-colors cursor-pointer ${
                  cameraView === 'perspective' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D Perspective
              </button>
              <button
                onClick={() => resetCamera('top')}
                aria-label="Top Nadir Camera"
                className={`px-2 py-0.8 rounded transition-colors cursor-pointer ${
                  cameraView === 'top' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Top Nadir
              </button>
              <button
                onClick={() => {
                  if (effectiveHasDem && realtimeDem.elevations) {
                    resetCamera('crossSection');
                  } else {
                    setModalNotice('Side profile cross-section requires authenticated elevation data (Copernicus DEM).');
                  }
                }}
                aria-label="Side Profile Camera"
                className={`px-2 py-0.8 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  cameraView === 'crossSection'
                    ? 'bg-slate-800 text-cyan-300 font-bold'
                    : effectiveHasDem && realtimeDem.elevations
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                Side Profile
              </button>
              <button
                onClick={() => resetCamera('perspective')}
                title="Reset Camera View"
                aria-label="Reset Camera View"
                className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-Time Interactive 3D Depth Probe Tooltip */}
        {depthProbe && (
          <div className="absolute top-28 left-3 p-3 rounded-xl bg-slate-950/95 border border-cyan-500/50 backdrop-blur-md shadow-2xl text-left space-y-1 z-20 pointer-events-none font-mono text-xs max-w-xs">
            <div className="flex items-center justify-between text-cyan-300 font-bold text-[10px] pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>COORDINATE PROBE</span>
              </span>
              <span>
                {depthProbe.lat !== null && depthProbe.lon !== null
                  ? `${depthProbe.lat.toFixed(4)}°, ${depthProbe.lon.toFixed(4)}°`
                  : 'Relative Grid'}
              </span>
            </div>
            <div className="space-y-0.5 text-[10px] pt-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Ground Elevation:</span>
                <span className="text-white font-bold tabular-nums">
                  {depthProbe.groundElevationMeters !== null
                    ? `${depthProbe.groundElevationMeters}m MSL`
                    : 'Unavailable (Flat Plane)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Water Depth:</span>
                <span className="text-amber-300 font-semibold">
                  Unavailable (Requires Bathymetry)
                </span>
              </div>
              <div className="text-[9px] text-cyan-400 pt-0.5 truncate">
                Status: <strong>{depthProbe.classification}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Truthful Scene Status Readout Box */}
        {!hoveredPin && (
          <div className="absolute bottom-4 left-3 max-w-xs p-2.5 rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md shadow-2xl z-20 font-mono text-[10px] space-y-1.5 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-slate-300 font-bold">
              <span className="flex items-center gap-1 text-cyan-400">
                <Layers className="w-3.5 h-3.5" />
                {sceneMode === 'validated-analysis'
                  ? 'VALIDATED FLOOD ANALYSIS'
                  : sceneMode === 'uploaded-imagery'
                  ? 'UPLOADED SATELLITE RASTER'
                  : 'CATALOG REFERENCE BASEMAP'}
              </span>
              <span className="text-[9px] text-slate-500">
                {effectiveHasDem ? 'Copernicus DEM' : 'Flat Reference Plane'}
              </span>
            </div>

            {shadingMode === 'probability' ? (
              <div className="space-y-1">
                <div className="h-2.5 w-44 rounded overflow-hidden flex border border-slate-800">
                  <div className="h-full w-1/3 bg-[#1f242e]" title="<0.25 Unlikely" />
                  <div className="h-full w-1/3 bg-[#2673d9]" title="0.25 - 0.75 Moderate" />
                  <div className="h-full w-1/3 bg-[#0fb8f2]" title=">0.75 High Confidence" />
                </div>
                <div className="flex justify-between text-[8px] text-slate-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span className="text-cyan-300 font-bold">100% Flood Prob</span>
                </div>
              </div>
            ) : shadingMode === 'hypsometric' ? (
              <div className="space-y-1">
                <div className="h-2.5 w-44 rounded overflow-hidden flex border border-slate-800">
                  <div className="h-full w-1/5 bg-[#15803d]" title="Valley Low" />
                  <div className="h-full w-1/5 bg-[#65a30d]" title="Midland" />
                  <div className="h-full w-1/5 bg-[#b45309]" title="Highland" />
                  <div className="h-full w-1/5 bg-[#64748b]" title="Mountain" />
                  <div className="h-full w-1/5 bg-[#f8fafc]" title="Snow Peak" />
                </div>
                <div className="flex justify-between text-[8px] text-slate-400">
                  <span>{effectiveDemMin?.toFixed(0) || '0'}m</span>
                  <span>Mid</span>
                  <span className="text-white font-bold">{effectiveDemMax?.toFixed(0) || '100'}m MSL</span>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {sceneMode === 'validated-analysis'
                      ? 'Validated U-Net analysis mapped'
                      : sceneMode === 'uploaded-imagery'
                      ? 'Decoded satellite raster mapped (North-Up)'
                      : 'Satellite basemap reference mapped'}
                  </span>
                </div>
                <p className="text-slate-500 text-[8px] leading-relaxed">
                  {sceneMode === 'catalog-reference'
                    ? 'Catalog reference scene showing baseline satellite imagery. Upload a Sentinel-2 GeoTIFF to run active flood detection.'
                    : sceneMode === 'uploaded-imagery'
                    ? (effectiveHasDem
                        ? 'Authenticated topography: Vertices displaced using real-time Copernicus GLO-90 DEM.'
                        : 'Elevation unavailable. Decoded raster rendered on flat georeferenced reference plane.')
                    : (effectiveHasDem
                        ? 'Authenticated topography: Vertices displaced using real-time Copernicus GLO-90 DEM.'
                        : 'Elevation unavailable. Analysis mask rendered on flat georeferenced reference plane.')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Hovered Infrastructure / Flood Zone Detail Box */}
        {hoveredPin && (
          <div className="absolute bottom-4 left-3 max-w-xs p-3 rounded-xl bg-slate-950/95 border border-cyan-500/50 backdrop-blur-md shadow-2xl text-left space-y-1 z-20 pointer-events-none font-mono">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">{hoveredPin.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                VERIFIED CLUSTER
              </span>
            </div>
            {hoveredPin.areaHa != null && (
              <p className="text-[10px] text-slate-300">
                Area: <strong className="text-cyan-400">{hoveredPin.areaHa.toFixed(1)} ha</strong>
              </p>
            )}
            {hoveredPin.probability != null && (
              <p className="text-[10px] text-slate-400">
                Mean Probability: <strong>{(hoveredPin.probability * 100).toFixed(1)}%</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Spatial Controls Deck */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800/90 space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Flood Inundation Mask Toggle */}
            <label
              className={`flex items-center gap-1.5 ${
                sceneMode === 'validated-analysis' ? 'text-slate-300 cursor-pointer' : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
              title={
                sceneMode === 'validated-analysis'
                  ? 'Toggle verified flood mask overlay'
                  : 'Flood mask overlay requires a completed model analysis'
              }
            >
              <input
                type="checkbox"
                checked={showFloodMask && sceneMode === 'validated-analysis'}
                disabled={sceneMode !== 'validated-analysis'}
                onChange={(e) => setShowFloodMask(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 disabled:opacity-40"
              />
              <span className={`font-semibold ${sceneMode === 'validated-analysis' ? 'text-cyan-300' : 'text-slate-500'}`}>
                Flood Inundation Mask Overlay
              </span>
            </label>

            {/* Live Weather Radar Overlay */}
            <label
              className={`flex items-center gap-1.5 ${
                loadedTextures.radar || radarTileUrl ? 'text-slate-300 cursor-pointer' : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
              title={loadedTextures.radar || radarTileUrl ? 'Toggle RainViewer live Doppler radar (Attribution: RainViewer under ODbL · Contextual precipitation only, never modifies flood model predictions or area)' : 'Radar data unavailable for current extent'}
            >
              <input
                type="checkbox"
                checked={showRadarOverlay && Boolean(loadedTextures.radar || radarTileUrl)}
                disabled={!loadedTextures.radar && !radarTileUrl}
                onChange={(e) => setShowRadarOverlay(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 disabled:opacity-40"
              />
              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400" />
                Live Radar Overlay (RainViewer)
              </span>
            </label>

            {/* Elevation Contours Toggle */}
            {effectiveHasDem && (
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => setShowContours(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Elevation Contours</span>
              </label>
            )}

            {/* Spatial Reference Grid Toggle */}
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSpatialGrid}
                onChange={(e) => setShowSpatialGrid(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Grid className="w-3 h-3 text-slate-400" />
                <span>Spatial Grid</span>
              </span>
            </label>

            {/* Hypothetical Simulation Water Stage Slider */}
            <div
              className="flex items-center gap-2 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-800"
              title="Hypothetical scenario parameter for visualization simulation only. Analytical water depth requires calibrated bathymetry or stream gauge data."
            >
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                <span>Water Stage:</span>
              </span>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={waterStageOffset}
                onChange={(e) => setWaterStageOffset(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800"
              />
              <span className="text-[11px] font-bold text-white tabular-nums">+{waterStageOffset.toFixed(1)}m</span>
              <span className="text-[9px] text-amber-400/90 font-sans border border-amber-500/20 px-1 py-0.5 rounded bg-amber-950/30">
                Simulation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <button
              onClick={() => resetCamera('perspective')}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Camera</span>
            </button>
            <span className="text-slate-600">·</span>
            <span>DRAG TO ORBIT · SCROLL TO ZOOM · HOVER SURFACE FOR COORDINATES</span>
          </div>
        </div>
      </div>
    </div>
  );
};
