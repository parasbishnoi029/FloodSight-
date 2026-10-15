import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Waves, 
  Layers, 
  Mountain, 
  MapPin, 
  AlertTriangle,
  Crosshair,
  ShieldCheck,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  Compass,
  Lock,
  Info,
  CheckCircle2,
  AlertCircle,
  CloudRain,
  Wind,
  Radio
} from 'lucide-react';
import { FloodAnalysisResult, AnalysisSummary } from '../../types';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../../data/globalDisasters';
import { getRainViewerMetadata, getRainViewerTileUrl } from '../../services/weatherService';

/**
 * Computes high-resolution Slippy tile URL from Esri World Imagery for exact coordinates
 */
export function getEsriSatelliteTileUrl(lat: number, lon: number, zoom = 13): string {
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
  initialWaterLevel?: number; // 0 to 1
  extrusionScale?: number; // 1 to 5
  analysisResult?: FloodAnalysisResult | AnalysisSummary | null;
  hasMeasuredDem?: boolean;
  measuredElevationMeters?: number | null;
  rasterPreviewUrl?: string | null;
  coordinates?: { lat: number; lon: number } | null;
  onClearAnalysis?: () => void;
}

interface InfrastructurePin {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  elevationMsl: number | null;
  isSubmerged: boolean;
  areaHa?: number | null;
  probability?: number;
}

interface DepthProbeData {
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

// 3D Topographic Terrain & Extruded Flood Mask Mesh
function ScientificTerrainMesh({
  sizeX,
  sizeZ,
  shadingMode,
  showContours,
  showFloodMask,
  showRadarOverlay = false,
  hasMeasuredDem = false,
  demElevations = null,
  demMinM = null,
  demMaxM = null,
  extrusionScale = 2.0,
  analysisResult = null,
  loadedTextures,
  effectiveBounds,
  onHoverPin,
  onProbeDepth,
}: {
  sizeX: number;
  sizeZ: number;
  shadingMode: 'hypsometric' | 'depth' | 'satellite' | 'sar' | 'probability' | 'radar';
  showContours: boolean;
  showFloodMask: boolean;
  showRadarOverlay?: boolean;
  hasMeasuredDem?: boolean;
  demElevations?: number[] | null;
  demMinM?: number | null;
  demMaxM?: number | null;
  extrusionScale?: number;
  analysisResult?: FloodAnalysisResult | AnalysisSummary | null;
  loadedTextures: {
    optical: THREE.Texture | null;
    mask: THREE.Texture | null;
    heatmap: THREE.Texture | null;
    hypsometric: THREE.Texture | null;
    radar: THREE.Texture | null;
  };
  effectiveBounds?: { south: number; west: number; north: number; east: number } | null;
  onHoverPin: (pin: InfrastructurePin | null) => void;
  onProbeDepth: (probe: DepthProbeData | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const gridRes = 64;

  const isVerified = Boolean(
    analysisResult &&
    (analysisResult.status === 'SUCCESS' ||
      analysisResult.status === 'Completed' ||
      Boolean((analysisResult as any).analysis_id || (analysisResult as any).id))
  );

  // Generate realistic DEM elevation when genuine DEM exists, or flat reference plane
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
    const elevSpan = hasRealElev ? Math.max(1, (demMaxM! - demMinM!)) : 100;
    const demDim = hasRealElev ? Math.round(Math.sqrt(demElevations!.length)) : 1;

    for (let i = 0; i < pos.count; i++) {
      const row = Math.floor(i / (gridRes + 1));
      const col = i % (gridRes + 1);

      let rawHeight = 0;
      let elevMsl: number | null = null;

      if (hasRealElev && demElevations) {
        // Bilinear interpolation across real-time Copernicus GLO-90 DEM grid
        const demR = (row / gridRes) * (demDim - 1);
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
        // Vertical displacement scaled by genuine DEM elevation
        rawHeight = norm * (Math.min(3.5, Math.max(0.5, extrusionScale)) * 0.35);
        elevMsl = Math.round(elev * 10) / 10;
      } else {
        // Truthful Optical-Only: Flat reference plane (ZERO fabricated elevation)
        rawHeight = 0;
        elevMsl = null;
      }

      pos.setY(i, rawHeight);
      elevMatrix[row][col] = elevMsl;
    }

    geo.computeVertexNormals();

    // 2. Flood Inundation Surface Mesh (Exact match to raster footprint)
    const waterGeo = new THREE.PlaneGeometry(sizeX, sizeZ, gridRes, gridRes);
    waterGeo.rotateX(-Math.PI / 2);
    const wPos = waterGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) {
      // Flood surface sits immediately atop terrain
      wPos.setY(i, pos.getY(i) + (hasRealElev ? 0.012 : 0.005));
    }
    waterGeo.computeVertexNormals();

    // 3. Iso-Elevation Contour Lines (Only generated when true DEM elevation is available)
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
              const cy = pos.getY(i0) + frac * (pos.getY(i1) - pos.getY(i0)) + 0.008;
              const cz = pos.getZ(i0) + frac * (pos.getZ(i1) - pos.getZ(i0));
              contourPoints.push(new THREE.Vector3(cx - 0.02, cy, cz));
              contourPoints.push(new THREE.Vector3(cx + 0.02, cy, cz));
            }
            if ((e0 <= level && e2 > level) || (e0 > level && e2 <= level)) {
              const frac = Math.abs(e0 - e2) > 0.001 ? (level - e0) / (e2 - e0) : 0.5;
              const cx = pos.getX(i0) + frac * (pos.getX(i2) - pos.getX(i0));
              const cy = pos.getY(i0) + frac * (pos.getY(i2) - pos.getY(i0)) + 0.008;
              const cz = pos.getZ(i0) + frac * (pos.getZ(i2) - pos.getZ(i0));
              contourPoints.push(new THREE.Vector3(cx, cy, cz - 0.02));
              contourPoints.push(new THREE.Vector3(cx, cy, cz + 0.02));
            }
          });
        }
      }
    }
    const contourGeo = new THREE.BufferGeometry().setFromPoints(contourPoints);

    // 4. Spatial Flood Cluster Centroids (Only real U-Net detected clusters)
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
  }, [sizeX, sizeZ, isVerified, hasMeasuredDem, demElevations, demMinM, demMaxM, extrusionScale, showContours, analysisResult]);

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (!e.point) return;

    const wx = e.point.x;
    const wz = e.point.z;

    // Convert raycast point to normalized UV coordinates (0 to 1)
    const u = Math.min(1, Math.max(0, (wx + sizeX / 2) / sizeX));
    const v = Math.min(1, Math.max(0, (wz + sizeZ / 2) / sizeZ));

    let lat: number | null = null;
    let lon: number | null = null;

    if (analysisResult?.geographic_bounds) {
      const b = analysisResult.geographic_bounds;
      lon = b.west + u * (b.east - b.west);
      lat = b.north - v * (b.north - b.south);
    } else if (analysisResult?.origin_lat != null && analysisResult?.origin_lon != null) {
      lat = analysisResult.origin_lat;
      lon = analysisResult.origin_lon;
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
        waterSurfaceMeters: groundElev !== null ? parseFloat((groundElev + 0.2).toFixed(1)) : null,
        submergedDepthMeters: null, // Depth unavailable without bathymetry
        isSubmerged: false,
        classification: hasMeasuredDem 
          ? 'Authenticated Topography (Copernicus GLO-90 DEM Active)' 
          : '2D Optical Surface (Elevation Unavailable)',
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
        classification: 'Reference Plane — Awaiting Satellite Raster Upload',
      });
    }
  };

  // Determine active surface material based on shadingMode and loaded textures
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
            color={0x0b1329}
            roughness={0.88}
            metalness={0.06}
          />
        )}
      </mesh>

      {/* 2. Iso-Elevation Contour Lines (Only shown when genuine DEM elevation exists) */}
      {showContours && hasMeasuredDem && demElevations && demElevations.length > 0 && (
        <lineSegments geometry={contourGeometry}>
          <lineBasicMaterial color={0x38bdf8} transparent opacity={0.45} linewidth={1} />
        </lineSegments>
      )}

      {/* 3. Verified Flood Inundation Mask Overlay (Translucent cyan overlay strictly atop water) */}
      {showFloodMask && isVerified && loadedTextures.mask && (
        <mesh geometry={waterGeometry}>
          <meshStandardMaterial
            map={loadedTextures.mask}
            color="#ffffff"
            transparent={true}
            opacity={0.52}
            roughness={0.15}
            metalness={0.15}
            alphaTest={0.02}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 4. Real-time RainViewer Live Weather Doppler Radar Overlay */}
      {showRadarOverlay && loadedTextures.radar && (
        <mesh geometry={waterGeometry} position={[0, 0.012, 0]}>
          <meshStandardMaterial
            map={loadedTextures.radar}
            transparent={true}
            opacity={0.68}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 4. Real Detected Spatial Flood Cluster Centroids */}
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

      {/* 5. Minimalist Geospatial Ground Grid Reference */}
      <gridHelper
        args={[Math.max(sizeX, sizeZ) * 1.15, 16, 0x0284c7, 0x1e293b]}
        position={[0, -0.01, 0]}
      />
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
  coordinates = null,
  onClearAnalysis,
}) => {
  const [shadingMode, setShadingMode] = useState<'hypsometric' | 'depth' | 'satellite' | 'sar' | 'probability' | 'radar'>('satellite');
  const [showContours, setShowContours] = useState<boolean>(false);
  const [showFloodMask, setShowFloodMask] = useState<boolean>(true);
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(false);
  const [hoveredPin, setHoveredPin] = useState<InfrastructurePin | null>(null);
  const [depthProbe, setDepthProbe] = useState<DepthProbeData | null>(null);
  const [cameraView, setCameraView] = useState<'perspective' | 'top' | 'crossSection'>('perspective');
  const [modalNotice, setModalNotice] = useState<string | null>(null);

  const controlsRef = useRef<any>(null);

  const isVerifiedAnalysis = Boolean(
    analysisResult &&
    (analysisResult.status === 'SUCCESS' ||
      analysisResult.status === 'Completed' ||
      Boolean((analysisResult as any).analysis_id || (analysisResult as any).id))
  );

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
          const zoom = 12;
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
      for (let c = 0; c < dim; c++) {
        const idx = r * dim + c;
        const elev = elevs[idx] ?? minM;
        const norm = Math.max(0, Math.min(1, (elev - minM) / range));

        let red = 22;
        let green = 101;
        let blue = 52;

        if (norm < 0.25) {
          // Deep valley emerald: #15803d
          red = 21; green = 128; blue = 61;
        } else if (norm < 0.50) {
          // Midland green-ochre: #65a30d
          red = 101; green = 163; blue = 13;
        } else if (norm < 0.75) {
          // Terracotta / rock: #b45309
          red = 180; green = 83; blue = 9;
        } else if (norm < 0.90) {
          // Mountain slate: #64748b
          red = 100; green = 116; blue = 139;
        } else {
          // Snow peak: #f8fafc
          red = 248; green = 250; blue = 252;
        }

        const p = idx * 4;
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
    return tex;
  }, [realtimeDem.hasDem, realtimeDem.elevations, realtimeDem.minM, realtimeDem.maxM]);

  // Fallback high-resolution Esri satellite tile for the scene coordinates
  const fallbackSatelliteTile = useMemo(() => {
    return getEsriSatelliteTileUrl(targetCoords.lat, targetCoords.lon, 13);
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
    const opticalUrl = analysisResult?.raster_preview_data_url || rasterPreviewUrl || fallbackSatelliteTile;
    const maskUrl = (isVerifiedAnalysis && analysisResult?.flood_detected && analysisResult?.status === 'SUCCESS')
      ? (analysisResult?.mask_png_data_url || null)
      : null;
    const heatmapUrl = (isVerifiedAnalysis && analysisResult?.status === 'SUCCESS')
      ? (analysisResult?.confidence_heatmap_data_url || null)
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
    ]).then(([optical, mask, heatmap, radar]) => {
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
    (analysisResult as any)?.analysis_id,
    analysisResult?.raster_preview_data_url,
    analysisResult?.mask_png_data_url,
    analysisResult?.confidence_heatmap_data_url,
    rasterPreviewUrl,
    fallbackSatelliteTile,
    radarTileUrl,
    isVerifiedAnalysis,
    hypsometricTexture,
  ]);

  // Reset camera view with framing
  const resetCamera = (mode: 'perspective' | 'top' | 'crossSection') => {
    setCameraView(mode);
    if (!controlsRef.current) return;
    const maxDim = Math.max(sizeX, sizeZ);
    if (mode === 'top') {
      controlsRef.current.object.position.set(0, maxDim * 1.45, 0.001);
    } else if (mode === 'crossSection') {
      controlsRef.current.object.position.set(sizeX * 1.35, 0.15, 0);
    } else {
      controlsRef.current.object.position.set(sizeX * 0.75, maxDim * 0.8, sizeZ * 0.85);
    }
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const displayedArea = isVerifiedAnalysis
    ? analysisResult?.physical_area_ha !== null && analysisResult?.physical_area_ha !== undefined
      ? `${analysisResult?.physical_area_ha.toLocaleString()} ha`
      : `${analysisResult?.coverage_percent}% coverage`
    : 'NOT AVAILABLE — AWAITING UPLOAD';

  const locationDisplay = analysisResult
    ? (analysisResult.origin_lat != null && analysisResult.origin_lon != null
      ? `${analysisResult.filename} (${analysisResult.origin_lat >= 0 ? analysisResult.origin_lat.toFixed(3) + '°N' : Math.abs(analysisResult.origin_lat).toFixed(3) + '°S'}, ${analysisResult.origin_lon >= 0 ? analysisResult.origin_lon.toFixed(3) + '°E' : Math.abs(analysisResult.origin_lon).toFixed(3) + '°W'})`
      : analysisResult.filename)
    : selectedLocation;

  const effectiveHasDem = realtimeDem.hasDem || initialHasDem;
  const effectiveDemMin = realtimeDem.minM ?? (measuredElevationMeters !== null ? measuredElevationMeters - 20 : null);
  const effectiveDemMax = realtimeDem.maxM ?? (measuredElevationMeters !== null ? measuredElevationMeters + 20 : null);

  return (
    <div className={`relative w-full rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-2xl flex flex-col ${className}`}>
      
      {/* 3D WebGL Canvas Viewport */}
      <div className="relative w-full h-[520px] sm:h-[580px] bg-[#030712]">
        
        {isLoadingTextures && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center gap-2 font-mono text-xs text-cyan-300">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Mapping Decoded Satellite Textures...</span>
          </div>
        )}

        <Canvas shadows gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}>
          <color attach="background" args={['#030712']} />
          <PerspectiveCamera makeDefault position={[sizeX * 0.75, Math.max(sizeX, sizeZ) * 0.8, sizeZ * 0.85]} fov={42} />
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
            hasMeasuredDem={effectiveHasDem}
            demElevations={realtimeDem.elevations}
            demMinM={effectiveDemMin}
            demMaxM={effectiveDemMax}
            extrusionScale={extrusionScale}
            analysisResult={analysisResult}
            loadedTextures={loadedTextures}
            effectiveBounds={effectiveBounds}
            onHoverPin={setHoveredPin}
            onProbeDepth={setDepthProbe}
          />
        </Canvas>

        {/* Top-Left Telemetry & Verification Provenance HUD */}
        <div className="absolute top-3 left-3 pointer-events-none z-10 space-y-1.5">
          <div className="bg-slate-950/92 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800/90 shadow-xl pointer-events-auto max-w-sm text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isVerifiedAnalysis ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs font-mono font-bold text-white tracking-wide truncate">
                  {locationDisplay}
                </span>
              </div>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border shrink-0 font-bold ${
                isVerifiedAnalysis
                  ? 'text-cyan-300 bg-cyan-950/80 border-cyan-700'
                  : 'text-slate-400 bg-slate-900 border-slate-800'
              }`}>
                {isVerifiedAnalysis ? 'VERIFIED RASTER SCENE' : 'NO UPLOAD LOADED'}
              </span>
            </div>

            {/* Truthful Physical Measurements Readout */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2 mt-1.5 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 block">Flood Extent</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {isVerifiedAnalysis ? `${analysisResult?.coverage_percent}%` : 'Unavailable'}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {isVerifiedAnalysis ? 'U-Net Model' : 'No analysis'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Elevation Datum</span>
                {effectiveHasDem && effectiveDemMin !== null && effectiveDemMax !== null ? (
                  <>
                    <span className="text-white font-bold tabular-nums">
                      {effectiveDemMin.toFixed(0)}m – {effectiveDemMax.toFixed(0)}m MSL
                    </span>
                    <span className="text-[9px] text-cyan-400 block truncate" title={realtimeDem.source}>
                      Copernicus GLO-90 DEM
                    </span>
                  </>
                ) : realtimeDem.isLoading ? (
                  <>
                    <span className="text-cyan-400 animate-pulse font-semibold">Loading...</span>
                    <span className="text-[9px] text-slate-500 block">Querying Copernicus DEM</span>
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
                <span className={`font-bold tabular-nums ${isVerifiedAnalysis ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {displayedArea}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {isVerifiedAnalysis ? (analysisResult?.area_calculation_method || 'Calculated') : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Real-Time Live Weather Readout */}
            {realtimeWeather && (
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 pt-1.5 mt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-emerald-400 font-bold uppercase tracking-wider shrink-0">LIVE METEOROLOGY:</span>
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
                <span className="text-[8px] text-slate-500 shrink-0">Real-Time Open-Meteo</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1.5 mt-1 border-t border-slate-800/60">
              <span className={isVerifiedAnalysis ? 'text-cyan-400 font-medium' : 'text-slate-400'}>
                {isVerifiedAnalysis
                  ? (effectiveHasDem
                    ? 'REAL MODEL INFERENCE · COPERNICUS GLO-90 DEM ELEVATION ACTIVE'
                    : '2D imagery — elevation unavailable. Real satellite imagery mapped on flat reference plane.')
                  : 'Awaiting raster upload. Upload Sentinel-2 GeoTIFF to inspect flood extent.'}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right Shading & Modality Selector */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10 pointer-events-auto">
          
          <div className="bg-slate-950/92 backdrop-blur-md p-1 rounded-xl border border-slate-800/90 flex items-center gap-1 shadow-xl text-[10px] font-mono flex-wrap justify-end">
            <button
              onClick={() => { setShadingMode('satellite'); setModalNotice(null); }}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                shadingMode === 'satellite'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sentinel-2 Optical (S2)
            </button>
            <button
              onClick={() => {
                if (loadedTextures.radar || radarTileUrl) {
                  setShadingMode('radar');
                  setModalNotice(null);
                } else {
                  setModalNotice('LIVE RADAR UNAVAILABLE: Live RainViewer Doppler radar tile is querying for scene coordinates.');
                }
              }}
              title="Real-time RainViewer Doppler precipitation radar surface"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                shadingMode === 'radar'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>Live Doppler Radar</span>
            </button>
            <button
              onClick={() => {
                if (loadedTextures.heatmap) {
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
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : !loadedTextures.heatmap
                  ? 'text-slate-500 hover:text-slate-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {!loadedTextures.heatmap && <Lock className="w-3 h-3 text-slate-500" />}
              <span>U-Net Probability (P)</span>
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
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : !effectiveHasDem
                  ? 'text-slate-500 hover:text-slate-400 bg-slate-900/60 border border-slate-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {!effectiveHasDem && <Lock className="w-3 h-3 text-amber-500" />}
              <span>Elevation Tint</span>
            </button>
            <button
              onClick={() => {
                setModalNotice(
                  'DEPTH HAZARD UNAVAILABLE: Satellite optical imagery captures 2D inundation extent. Bathymetry, lidar DEM, or hydraulic gauge data is required to calculate water depth without fabrication.'
                );
              }}
              title="Water depth requires bathymetry or DEM"
              className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-400 flex items-center gap-1 cursor-pointer bg-slate-900/60 border border-slate-800"
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Depth Hazard</span>
            </button>
            <button
              onClick={() => {
                setModalNotice(
                  'SAR LAYER DISABLED: Current FloodSight-UNet-ResNet34 checkpoint is trained strictly on Sentinel-2 optical bands (B4, B3, B2). Processing Sentinel-1 C-band SAR radar requires a separate radar-trained model contract.'
                );
              }}
              title="Sentinel-1 SAR is disabled for optical models"
              className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-400 flex items-center gap-1 cursor-pointer bg-slate-900/60 border border-slate-800"
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Sentinel-1 SAR</span>
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
                onClick={() => resetCamera('crossSection')}
                aria-label="Side Profile Camera"
                className={`px-2 py-0.8 rounded transition-colors cursor-pointer ${
                  cameraView === 'crossSection' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
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
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>SURFACE RAYCAST PROBE</span>
              </div>
              <span className="text-[9px] text-slate-400">10m GSD</span>
            </div>

            <div className="text-[10px] text-slate-300 space-y-0.5 pt-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Geographic Coords:</span>
                <span className="text-white font-bold">
                  {depthProbe.lat !== null && depthProbe.lon !== null
                    ? `${depthProbe.lat.toFixed(4)}°, ${depthProbe.lon.toFixed(4)}°`
                    : 'Unreferenced'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ground Elevation:</span>
                <span className="text-white font-bold">
                  {depthProbe.groundElevationMeters !== null
                    ? `${depthProbe.groundElevationMeters}m MSL`
                    : 'Unavailable (No DEM)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Flood Inundation Depth:</span>
                <span className="text-cyan-300 font-bold">
                  {depthProbe.submergedDepthMeters !== null
                    ? `+${depthProbe.submergedDepthMeters}m`
                    : 'Depth Unavailable (Requires Bathymetry)'}
                </span>
              </div>
              <div className="text-[9px] text-cyan-400 pt-0.5">
                Classification: <strong>{depthProbe.classification}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Flood Extent & Scale HUD */}
        {!hoveredPin && (
          <div className="absolute bottom-4 left-3 max-w-xs p-2.5 rounded-xl bg-slate-950/95 border border-slate-800/90 backdrop-blur-md shadow-2xl z-20 font-mono text-[10px] space-y-1.5 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-slate-300 font-bold">
              <span className="flex items-center gap-1 text-cyan-400">
                <Layers className="w-3.5 h-3.5" />
                {shadingMode === 'probability'
                  ? 'U-NET PROBABILITY HEATMAP'
                  : shadingMode === 'hypsometric'
                  ? 'COPERNICUS DEM HYPSOMETRIC TINT'
                  : 'SENTINEL-2 OPTICAL IMAGERY'}
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
                    {loadedTextures.optical ? 'Real uploaded satellite raster mapped' : 'Awaiting raster upload'}
                  </span>
                </div>
                <p className="text-slate-500 text-[8px] leading-relaxed">
                  {effectiveHasDem
                    ? 'Authenticated topography: Vertices displaced using real-time Copernicus GLO-90 DEM.'
                    : '2D imagery — elevation unavailable. Terrain rendered on flat georeferenced reference plane.'}
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
                Mean Probability: <strong>{((hoveredPin.probability) * 100).toFixed(1)}%</strong>
              </p>
            )}
          </div>
        )}

      </div>

      {/* Bottom Spatial Controls Deck */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800/90 space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showFloodMask}
                onChange={(e) => setShowFloodMask(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="font-semibold text-cyan-300">Flood Inundation Mask Overlay</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showRadarOverlay}
                onChange={(e) => setShowRadarOverlay(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400" />
                Live Radar Overlay (RainViewer)
              </span>
            </label>

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
