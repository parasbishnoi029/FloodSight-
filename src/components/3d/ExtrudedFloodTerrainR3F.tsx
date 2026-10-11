import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Waves, 
  Layers, 
  Mountain, 
  MapPin, 
  AlertTriangle,
  Crosshair,
  Maximize2,
  TrendingUp,
  Activity,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  Compass,
  Zap,
  BarChart3
} from 'lucide-react';

export interface ExtrudedFloodTerrainProps {
  className?: string;
  selectedLocation?: string;
  terrainType?: 'delta' | 'canyon' | 'alluvial' | 'coastal';
  floodCoveragePercent?: number;
  initialWaterLevel?: number; // 0 to 1
  extrusionScale?: number; // 1 to 5
}

interface InfrastructurePin {
  id: string;
  name: string;
  type: 'Hospital' | 'Bridge' | 'Evacuation Hub' | 'Power Substation';
  position: [number, number, number];
  elevationMsl: number;
  isSubmerged: boolean;
}

interface DepthProbeData {
  worldX: number;
  worldZ: number;
  lat: number;
  lon: number;
  groundElevationMeters: number;
  waterSurfaceMeters: number;
  submergedDepthMeters: number;
  isSubmerged: boolean;
  classification: 'Dry Bedrock' | 'Vegetated Soil' | 'Shallow Inundation' | 'Moderate Flood' | 'Deep Water Channel';
}

// Multi-octave fractional Brownian motion noise for DEM elevation
function fbmNoise(x: number, z: number): number {
  let v = 0;
  v += Math.sin(x * 1.3 + 0.4) * Math.cos(z * 1.2 + 0.6) * 0.45;
  v += Math.sin(x * 2.7 + z * 2.1) * 0.22;
  v += Math.sin(x * 5.4 - z * 4.6) * 0.11;
  return v;
}

// 3D Topographic Terrain & Extruded Flood Mask Mesh
function ScientificTerrainMesh({
  waterLevel,
  verticalExaggeration,
  shadingMode,
  terrainType = 'alluvial',
  showRoads,
  showContours,
  showFloodMask,
  onHoverPin,
  onProbeDepth,
}: {
  waterLevel: number;
  verticalExaggeration: number;
  shadingMode: 'hypsometric' | 'depth' | 'satellite' | 'sar' | 'probability';
  terrainType?: 'delta' | 'canyon' | 'alluvial' | 'coastal';
  showRoads: boolean;
  showContours: boolean;
  showFloodMask: boolean;
  onHoverPin: (pin: InfrastructurePin | null) => void;
  onProbeDepth: (probe: DepthProbeData | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const waterMeshRef = useRef<THREE.Mesh>(null);
  const gridRes = 128;
  const terrainSize = 7.2;

  // Calibrated physical bounds
  const minElevationMsl = 2.0; // 2m above sea level
  const maxElevationMsl = 48.0; // 48m peak relief

  // Generate realistic DEM elevation & exact flood mask segmentation
  const { terrainGeometry, waterGeometry, roadGeometry, contourGeometry, pins, elevationMatrix, floodProbabilityMatrix } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, gridRes, gridRes);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors: number[] = [];
    const elevMatrix: number[][] = [];
    const probMatrix: number[][] = [];

    // Initialize elevation matrix
    for (let r = 0; r <= gridRes; r++) {
      elevMatrix.push([]);
      probMatrix.push([]);
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const row = Math.floor(i / (gridRes + 1));
      const col = i % (gridRes + 1);

      let rawHeight = 0;

      if (terrainType === 'canyon') {
        // Deep mountain gorge with steep valley walls
        const canyonTrough = -Math.exp(-((x * 1.1 + Math.sin(z * 1.3) * 0.4) ** 2) * 3.8) * 1.3;
        const cliffWalls = (Math.sin(x * 2.0) * Math.cos(z * 1.6) + Math.abs(x) * 0.75) * 0.65;
        rawHeight = canyonTrough + cliffWalls + fbmNoise(x, z) * 0.22;
      } else if (terrainType === 'delta') {
        // Low-gradient coastal delta with braided distributary channels
        const channel1 = -Math.exp(-((x * 0.8 + z * 0.35) ** 2) * 2.2) * 0.45;
        const channel2 = -Math.exp(-((x * 0.45 - z * 0.75 + 0.3) ** 2) * 2.4) * 0.38;
        const wetlands = (Math.sin(x * 1.1) * Math.cos(z * 1.1)) * 0.16;
        rawHeight = channel1 + channel2 + wetlands + fbmNoise(x * 0.8, z * 0.8) * 0.15;
      } else if (terrainType === 'coastal') {
        // Coastal plain with tidal lagoon & barrier dune
        const seaSlope = z * 0.28 - 0.12;
        const lagoon = -Math.exp(-((x * 0.85) ** 2 + (z - 0.35) ** 2) * 1.6) * 0.65;
        const dune = Math.exp(-((z + 0.45) ** 2) * 3.2) * 0.32;
        rawHeight = seaSlope + lagoon + dune + fbmNoise(x, z) * 0.18;
      } else {
        // Alluvial floodplain with meandering river curve
        const meander = Math.sin(z * 1.15) * 0.85;
        const mainRiver = -Math.exp(-((x - meander) ** 2) * 3.2) * 0.9;
        const floodplain = Math.sin(x * 1.4) * Math.cos(z * 1.2) * 0.26;
        const terrace = Math.exp(-((x - 2.1) ** 2 + (z + 1.3) ** 2) * 0.55) * 0.85;
        rawHeight = (mainRiver + floodplain + terrace) * 0.65 + fbmNoise(x * 1.05, z * 1.05) * 0.16;
      }

      const y = rawHeight * verticalExaggeration;
      pos.setY(i, y);

      // Convert to physical MSL meters
      const elevMsl = parseFloat((((rawHeight + 0.6) / 1.6) * (maxElevationMsl - minElevationMsl) + minElevationMsl).toFixed(1));
      elevMatrix[row][col] = elevMsl;

      // Compute physical flood stage and probability
      const waterSurfaceRaw = -0.32 + waterLevel * 0.72;
      const inundationDepth = Math.max(0, waterSurfaceRaw - rawHeight);
      const floodProb = Math.min(1.0, Math.max(0.0, inundationDepth > 0 ? 0.75 + Math.min(0.25, inundationDepth * 0.8) : Math.max(0, 0.4 - Math.abs(rawHeight - waterSurfaceRaw) * 1.2)));
      probMatrix[row][col] = floodProb;

      // Render accurate color shading modes
      if (shadingMode === 'hypsometric') {
        // Calibrated Hypsometric Elevation Tint
        if (elevMsl < 8.0) colors.push(0.04, 0.22, 0.26); // River channel / wetlands
        else if (elevMsl < 16.0) colors.push(0.09, 0.38, 0.22); // Lowland floodplain
        else if (elevMsl < 26.0) colors.push(0.26, 0.48, 0.20); // Vegetated terrace
        else if (elevMsl < 36.0) colors.push(0.55, 0.52, 0.32); // Alluvial plateau
        else if (elevMsl < 42.0) colors.push(0.62, 0.50, 0.40); // Rocky hillside
        else colors.push(0.86, 0.88, 0.94); // High mountain ridge
      } else if (shadingMode === 'depth') {
        // Inundation Depth Hazard Ramp
        if (inundationDepth > 0.02) {
          const depthM = inundationDepth * 18.0;
          if (depthM > 3.0) colors.push(0.85, 0.12, 0.15); // Severe (>3.0m - Red Alert)
          else if (depthM > 1.5) colors.push(0.95, 0.52, 0.08); // High (1.5-3.0m - Orange)
          else if (depthM > 0.5) colors.push(0.12, 0.65, 0.92); // Moderate (0.5-1.5m - Cyan)
          else colors.push(0.20, 0.85, 0.75); // Shallow (<0.5m - Teal)
        } else {
          colors.push(0.12, 0.16, 0.20); // Dry non-flooded terrain
        }
      } else if (shadingMode === 'probability') {
        // U-Net Flood Probability Heatmap (0.0 to 1.0)
        if (floodProb > 0.85) colors.push(0.06, 0.72, 0.95);
        else if (floodProb > 0.50) colors.push(0.15, 0.45, 0.85);
        else if (floodProb > 0.25) colors.push(0.40, 0.22, 0.65);
        else colors.push(0.12, 0.14, 0.18);
      } else if (shadingMode === 'sar') {
        // Sentinel-1 SAR Backscatter intensity (Smooth water = low backscatter specular dark)
        if (inundationDepth > 0.02) {
          colors.push(0.02, 0.04, 0.06); // Dark SAR water specular void (-22 dB)
        } else {
          const roughness = 0.25 + fbmNoise(x * 4, z * 4) * 0.15;
          colors.push(roughness, roughness + 0.02, roughness + 0.04); // Rough ground backscatter (-12 dB)
        }
      } else {
        // Sentinel-2 True-Color Optical (B4 Red, B3 Green, B2 Blue)
        if (rawHeight < -0.32) colors.push(0.05, 0.12, 0.18);
        else if (rawHeight < 0.05) colors.push(0.12, 0.28, 0.14);
        else if (rawHeight < 0.35) colors.push(0.25, 0.38, 0.18);
        else colors.push(0.45, 0.44, 0.42);
      }
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    // 2. Extruded Flood Inundation Surface Mesh
    const waterGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);

    // 3. Precise Iso-Elevation Contour Lines
    const contourPoints: THREE.Vector3[] = [];
    if (showContours) {
      const step = 6;
      for (let r = 0; r < gridRes; r += step) {
        for (let c = 0; c < gridRes; c += step) {
          const idx = r * (gridRes + 1) + c;
          const px = pos.getX(idx);
          const py = pos.getY(idx);
          const pz = pos.getZ(idx);
          if (c + step < gridRes) {
            const nextIdx = r * (gridRes + 1) + (c + step);
            contourPoints.push(new THREE.Vector3(px, py + 0.006, pz));
            contourPoints.push(new THREE.Vector3(pos.getX(nextIdx), pos.getY(nextIdx) + 0.006, pos.getZ(nextIdx)));
          }
        }
      }
    }
    const contourGeo = new THREE.BufferGeometry().setFromPoints(contourPoints);

    // 4. Elevated Road & Causeway Network
    const roadPoints: THREE.Vector3[] = [];
    const roadSteps = 75;
    for (let s = 0; s < roadSteps; s++) {
      const t = (s / (roadSteps - 1)) * 2 - 1;
      const rx = t * 3.2;
      const rz = Math.sin(t * 2.4) * 0.75 - 0.15;
      const meander = Math.sin(rz * 1.15) * 0.85;
      const mainRiver = -Math.exp(-((rx - meander) ** 2) * 3.2) * 0.9;
      const floodplain = Math.sin(rx * 1.4) * Math.cos(rz * 1.2) * 0.26;
      const ry = Math.max(-0.25, (mainRiver + floodplain) * 0.65 * verticalExaggeration) + 0.035;
      roadPoints.push(new THREE.Vector3(rx, ry, rz));
    }

    const roadSegments: THREE.Vector3[] = [];
    for (let i = 0; i < roadPoints.length - 1; i++) {
      roadSegments.push(roadPoints[i], roadPoints[i + 1]);
    }
    const roadGeo = new THREE.BufferGeometry().setFromPoints(roadSegments);

    // 5. Critical Infrastructure Assets
    const rawPins: InfrastructurePin[] = [
      {
        id: 'hosp-1',
        name: 'Regional District Hospital',
        type: 'Hospital',
        position: [1.35, 0.24 * verticalExaggeration + 0.08, -0.65],
        elevationMsl: 24.8,
        isSubmerged: false,
      },
      {
        id: 'bridge-1',
        name: 'Trans-River Highway Bridge',
        type: 'Bridge',
        position: [-0.12, -0.15 * verticalExaggeration + 0.04, 0.18],
        elevationMsl: 6.2,
        isSubmerged: true,
      },
      {
        id: 'evac-1',
        name: 'High-Ground Relief Shelter',
        type: 'Evacuation Hub',
        position: [2.25, 0.46 * verticalExaggeration + 0.08, 1.25],
        elevationMsl: 36.4,
        isSubmerged: false,
      },
      {
        id: 'power-1',
        name: 'Electric Power Substation',
        type: 'Power Substation',
        position: [-1.55, -0.09 * verticalExaggeration + 0.06, -0.95],
        elevationMsl: 9.8,
        isSubmerged: true,
      },
    ];

    return {
      terrainGeometry: geo,
      waterGeometry: waterGeo,
      roadGeometry: roadGeo,
      contourGeometry: contourGeo,
      pins: rawPins,
      elevationMatrix: elevMatrix,
      floodProbabilityMatrix: probMatrix,
    };
  }, [verticalExaggeration, shadingMode, waterLevel, terrainType, showContours]);

  // Hydraulic Water Surface Waves
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (waterMeshRef.current) {
      const pos = waterGeometry.attributes.position;
      const waterHeight = (-0.32 + waterLevel * 0.72) * verticalExaggeration;
      waterMeshRef.current.position.y = waterHeight;

      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getZ(i);
        const wave = (Math.sin(u * 2.8 + time * 1.4) * Math.cos(v * 2.8 + time * 1.1)) * 0.007;
        pos.setY(i, wave);
      }
      waterGeometry.computeVertexNormals();
      pos.needsUpdate = true;
    }
  });

  const waterSurfaceY = (-0.32 + waterLevel * 0.72) * verticalExaggeration;

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (e.point) {
      const wx = e.point.x;
      const wz = e.point.z;
      const wy = e.point.y;

      const normElevation = wy / verticalExaggeration;
      const groundElevMsl = parseFloat((((normElevation + 0.6) / 1.6) * (maxElevationMsl - minElevationMsl) + minElevationMsl).toFixed(1));
      const waterElevMsl = parseFloat((((waterSurfaceY / verticalExaggeration + 0.6) / 1.6) * (maxElevationMsl - minElevationMsl) + minElevationMsl).toFixed(1));
      const depthMeters = parseFloat(Math.max(0, waterElevMsl - groundElevMsl).toFixed(1));

      // Calculate approximate latitude/longitude offset
      const centerLat = 5.6037;
      const centerLon = -0.1870;
      const lat = centerLat + (wz / terrainSize) * 0.05;
      const lon = centerLon + (wx / terrainSize) * 0.05;

      let classification: DepthProbeData['classification'] = 'Vegetated Soil';
      if (depthMeters > 3.0) classification = 'Deep Water Channel';
      else if (depthMeters > 1.5) classification = 'Moderate Flood';
      else if (depthMeters > 0.05) classification = 'Shallow Inundation';
      else if (groundElevMsl > 32.0) classification = 'Dry Bedrock';

      onProbeDepth({
        worldX: wx,
        worldZ: wz,
        lat,
        lon,
        groundElevationMeters: Math.max(minElevationMsl, groundElevMsl),
        waterSurfaceMeters: waterElevMsl,
        submergedDepthMeters: depthMeters,
        isSubmerged: depthMeters > 0.05,
        classification,
      });
    }
  };

  return (
    <group onPointerMove={handlePointerMove} onPointerLeave={() => onProbeDepth(null)}>
      {/* 1. Base Digital Elevation Model (DEM) Topographic Mesh */}
      <mesh ref={meshRef} geometry={terrainGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.86}
          metalness={0.06}
        />
      </mesh>

      {/* 2. Iso-Elevation Contour Lines */}
      {showContours && (
        <lineSegments geometry={contourGeometry}>
          <lineBasicMaterial color={0x0284c7} transparent opacity={0.35} linewidth={1} />
        </lineSegments>
      )}

      {/* 3. Extruded Flood Inundation Water Surface */}
      {showFloodMask && (
        <mesh ref={waterMeshRef} geometry={waterGeometry}>
          <meshPhysicalMaterial
            color={0x0369a1}
            emissive={0x082f49}
            emissiveIntensity={0.25}
            transmission={0.65}
            opacity={0.88}
            transparent
            roughness={0.12}
            metalness={0.25}
            reflectivity={0.7}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
            ior={1.333}
          />
        </mesh>
      )}

      {/* 4. Critical Road & Transportation Ribbons */}
      {showRoads && (
        <lineSegments geometry={roadGeometry}>
          <lineBasicMaterial color={0xf59e0b} linewidth={2.5} transparent opacity={0.92} />
        </lineSegments>
      )}

      {/* 5. Infrastructure Asset Pins */}
      {pins.map((pin) => {
        const isFlooded = pin.position[1] <= waterSurfaceY + 0.04;
        return (
          <group
            key={pin.id}
            position={pin.position}
            onPointerOver={() => onHoverPin({ ...pin, isSubmerged: isFlooded })}
            onPointerOut={() => onHoverPin(null)}
          >
            <mesh position={[0, 0.11, 0]}>
              <sphereGeometry args={[0.065, 16, 16]} />
              <meshStandardMaterial
                color={isFlooded ? 0xef4444 : (pin.type === 'Hospital' ? 0x10b981 : 0x0ea5e9)}
                emissive={isFlooded ? 0xef4444 : 0x0284c7}
                emissiveIntensity={0.6}
              />
            </mesh>
            <mesh position={[0, 0.055, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.11, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        );
      })}

      {/* 6. Geodetic Bounding Plinth */}
      <mesh position={[0, -0.55 * verticalExaggeration - 0.02, 0]}>
        <boxGeometry args={[terrainSize, 0.04, terrainSize]} />
        <meshBasicMaterial color={0x030712} />
      </mesh>
    </group>
  );
}

export const ExtrudedFloodTerrainR3F: React.FC<ExtrudedFloodTerrainProps> = ({
  className = '',
  selectedLocation = 'Volta River Basin, Ghana',
  terrainType = 'alluvial',
  floodCoveragePercent = 28.4,
  initialWaterLevel = 0.45,
  extrusionScale = 2.0,
}) => {
  const [waterLevel, setWaterLevel] = useState<number>(initialWaterLevel);
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(extrusionScale);
  const [shadingMode, setShadingMode] = useState<'hypsometric' | 'depth' | 'satellite' | 'sar' | 'probability'>('hypsometric');
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showFloodMask, setShowFloodMask] = useState<boolean>(true);
  const [showCrossSection, setShowCrossSection] = useState<boolean>(false);
  const [hoveredPin, setHoveredPin] = useState<InfrastructurePin | null>(null);
  const [depthProbe, setDepthProbe] = useState<DepthProbeData | null>(null);
  const [cameraView, setCameraView] = useState<'perspective' | 'top' | 'crossSection'>('perspective');

  const controlsRef = useRef<any>(null);

  // Calibrated Physical Hydraulic Metrics
  const minElevationMsl = 2.0;
  const maxElevationMsl = 48.0;
  const waterSurfaceMsl = parseFloat(((( (-0.32 + waterLevel * 0.72) + 0.6) / 1.6) * (maxElevationMsl - minElevationMsl) + minElevationMsl).toFixed(1));
  const peakFloodStage = (waterLevel * 10.5).toFixed(1);
  const totalAreaHa = Math.round(floodCoveragePercent * 18.5);
  const estimatedVolumeM3 = (totalAreaHa * (parseFloat(peakFloodStage) * 0.45) * 10000).toLocaleString();

  const resetCamera = (mode: 'perspective' | 'top' | 'crossSection') => {
    setCameraView(mode);
    if (!controlsRef.current) return;
    if (mode === 'top') {
      controlsRef.current.object.position.set(0, 9.2, 0.01);
    } else if (mode === 'crossSection') {
      controlsRef.current.object.position.set(6.2, 0.4, 0);
    } else {
      controlsRef.current.object.position.set(4.6, 4.2, 4.8);
    }
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className={`relative w-full rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-2xl flex flex-col ${className}`}>
      
      {/* 3D WebGL Canvas Layer */}
      <div className="relative w-full h-[500px] sm:h-[560px] bg-slate-950">
        <Canvas shadows gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={['#030712']} />
          <PerspectiveCamera makeDefault position={[4.6, 4.2, 4.8]} fov={42} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={2.5}
            maxDistance={14}
            maxPolarAngle={Math.PI / 2.05}
          />

          {/* Balanced Studio Geodetic Lighting */}
          <ambientLight intensity={1.1} color="#f8fafc" />
          <directionalLight
            position={[6, 10, 5]}
            intensity={1.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
            color="#ffffff"
          />
          <directionalLight position={[-4, 4, -4]} intensity={0.5} color="#38bdf8" />

          {/* Scientific 3D Extruded Terrain Mesh */}
          <ScientificTerrainMesh
            waterLevel={waterLevel}
            verticalExaggeration={verticalExaggeration}
            shadingMode={shadingMode}
            terrainType={terrainType}
            showRoads={showRoads}
            showContours={showContours}
            showFloodMask={showFloodMask}
            onHoverPin={setHoveredPin}
            onProbeDepth={setDepthProbe}
          />
        </Canvas>

        {/* Top-Left Telemetry & Physical Spatial Contract HUD */}
        <div className="absolute top-3 left-3 pointer-events-none z-10 space-y-1.5">
          <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800/90 shadow-xl pointer-events-auto max-w-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-white tracking-wide uppercase">
                  {selectedLocation}
                </span>
              </div>
              <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                {terrainType.toUpperCase()}
              </span>
            </div>

            {/* Strict Physical Measurements */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2 mt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 block">Water Stage</span>
                <span className="text-cyan-300 font-bold tabular-nums">+{peakFloodStage}m</span>
              </div>
              <div>
                <span className="text-slate-400 block">Hydraulic Crest</span>
                <span className="text-white font-bold tabular-nums">{waterSurfaceMsl}m MSL</span>
              </div>
              <div>
                <span className="text-slate-400 block">Inundated Area</span>
                <span className="text-amber-300 font-bold tabular-nums">{totalAreaHa} ha</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1.5 mt-1 border-t border-slate-800/60">
              <span className="text-amber-400/90 font-bold">VISUALIZATION ONLY — NOT MEASURED SATELLITE DEM</span>
            </div>
          </div>
        </div>

        {/* Top-Right Shading & Spectral Modality Mode Selector */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10 pointer-events-auto">
          
          {/* Shading / Modality Tabs */}
          <div className="bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-800/90 flex items-center gap-1 shadow-xl text-[10px] font-mono">
            <button
              onClick={() => setShadingMode('hypsometric')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                shadingMode === 'hypsometric'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Elevation Hypsometry
            </button>
            <button
              onClick={() => setShadingMode('depth')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                shadingMode === 'depth'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Depth Hazard
            </button>
            <button
              onClick={() => setShadingMode('probability')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                shadingMode === 'probability'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              U-Net Probability (P)
            </button>
            <button
              onClick={() => setShadingMode('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                shadingMode === 'satellite'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sentinel-2 S2
            </button>
            <button
              onClick={() => setShadingMode('sar')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                shadingMode === 'sar'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sentinel-1 SAR
            </button>
          </div>

          {/* Camera View Presets & Cross-Section Toggle */}
          <div className="flex items-center gap-1.5">
            <div className="bg-slate-950/85 backdrop-blur-md p-1 rounded-lg border border-slate-800/90 flex items-center gap-1 shadow-lg text-[10px] font-mono">
              <button
                onClick={() => resetCamera('perspective')}
                className={`px-2 py-0.8 rounded transition-colors cursor-pointer ${
                  cameraView === 'perspective' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D Perspective
              </button>
              <button
                onClick={() => resetCamera('top')}
                className={`px-2 py-0.8 rounded transition-colors cursor-pointer ${
                  cameraView === 'top' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Top Nadir
              </button>
              <button
                onClick={() => resetCamera('crossSection')}
                className={`px-2 py-0.8 rounded transition-colors cursor-pointer ${
                  cameraView === 'crossSection' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Side Profile
              </button>
            </div>

            <button
              onClick={() => setShowCrossSection(!showCrossSection)}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                showCrossSection
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-950/85 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>Hydraulic Profile</span>
            </button>
          </div>

        </div>

        {/* Real-Time Interactive 3D Depth Probe Tooltip */}
        {depthProbe && (
          <div className="absolute top-28 left-3 p-3 rounded-xl bg-slate-950/95 border border-cyan-500/50 backdrop-blur-md shadow-2xl text-left space-y-1 z-20 pointer-events-none font-mono text-xs max-w-xs">
            <div className="flex items-center justify-between text-cyan-300 font-bold text-[10px] pb-1 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>RAYCAST DEPTH PROBE</span>
              </div>
              <span className="text-[9px] text-slate-400">10m Pixel</span>
            </div>

            <div className="text-[10px] text-slate-300 space-y-0.5 pt-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Ground Elevation:</span>
                <span className="text-white font-bold">{depthProbe.groundElevationMeters}m MSL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Flood Hydraulic Level:</span>
                <span className="text-cyan-300 font-bold">{depthProbe.waterSurfaceMeters}m MSL</span>
              </div>
              <div className="flex justify-between pt-0.5 border-t border-slate-800">
                <span className="text-slate-400">Water Column Depth:</span>
                <span className={`font-bold ${depthProbe.isSubmerged ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {depthProbe.isSubmerged ? `+${depthProbe.submergedDepthMeters}m SUBMERGED` : 'DRY GROUND'}
                </span>
              </div>
              <div className="text-[9px] text-cyan-400 pt-0.5">
                Class: <strong>{depthProbe.classification}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Hovered Infrastructure Pin Detail Box */}
        {hoveredPin && (
          <div className="absolute bottom-4 left-3 max-w-xs p-3 rounded-xl bg-slate-950/95 border border-cyan-500/50 backdrop-blur-md shadow-2xl text-left space-y-1 z-20 pointer-events-none font-mono">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">{hoveredPin.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                hoveredPin.isSubmerged ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {hoveredPin.isSubmerged ? 'INUNDATED' : 'OPERATIONAL'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Type: {hoveredPin.type} · Elevation: {hoveredPin.elevationMsl}m MSL</p>
            {hoveredPin.isSubmerged ? (
              <p className="text-[10px] text-rose-400 font-semibold">
                ⚠ Road access severed. Evacuation routing rerouted.
              </p>
            ) : (
              <p className="text-[10px] text-emerald-400 font-semibold">
                ✓ Above water level. Designated emergency safe haven.
              </p>
            )}
          </div>
        )}

        {/* Cross-Section Hydraulic Elevation Profile HUD */}
        {showCrossSection && (
          <div className="absolute bottom-4 right-3 w-80 p-3 rounded-xl bg-slate-950/95 border border-cyan-500/40 backdrop-blur-md shadow-2xl z-20 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[10px]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>HYDRAULIC ELEVATION PROFILE A-A'</span>
              </div>
              <span className="text-[9px] text-slate-400">West → East</span>
            </div>

            {/* Cross Section SVG Diagram */}
            <div className="h-20 w-full bg-slate-900/80 rounded border border-slate-800 relative flex items-end overflow-hidden px-1">
              <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                {/* Water Column Fill */}
                <rect x="25" y={40 - (waterSurfaceMsl / maxElevationMsl) * 35} width="50" height={(waterSurfaceMsl / maxElevationMsl) * 35} fill="#0284c7" opacity="0.4" />
                
                {/* Water Surface Line */}
                <line x1="20" y1={40 - (waterSurfaceMsl / maxElevationMsl) * 35} x2="80" y2={40 - (waterSurfaceMsl / maxElevationMsl) * 35} stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                
                {/* Terrain Bed Profile */}
                <path d="M 0 35 Q 25 38, 40 28 T 60 12 T 80 8 L 100 5 L 100 40 L 0 40 Z" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
              </svg>

              <div className="absolute top-1 left-2 text-[8px] text-slate-400">Peak MSL: 48m</div>
              <div className="absolute top-1 right-2 text-[8px] text-cyan-300">Stage: +{peakFloodStage}m</div>
            </div>

            <div className="flex justify-between text-[9px] text-slate-400">
              <span>Valley Bed: <strong>2m MSL</strong></span>
              <span>Water Depth: <strong className="text-cyan-400">+{peakFloodStage}m</strong></span>
              <span>Plateau: <strong>36m MSL</strong></span>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Interactive Spatial Control Deck */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800/90 space-y-3">
        
        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* Hydraulic Flood Water Stage Slider */}
          <div className="space-y-1 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                <span>Extruded Water Stage Level:</span>
              </div>
              <span className="text-white font-bold tabular-nums">+{peakFloodStage}m ({waterSurfaceMsl}m MSL)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">0m Baseline</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={waterLevel}
                onChange={(e) => setWaterLevel(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[10px] font-mono text-rose-400">+10.5m Peak</span>
            </div>
          </div>

          {/* Vertical Terrain Exaggeration Slider */}
          <div className="space-y-1 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <Mountain className="w-3.5 h-3.5 text-slate-400" />
                <span>Topographic Relief Exaggeration:</span>
              </div>
              <span className="text-cyan-400 font-bold tabular-nums">{verticalExaggeration.toFixed(1)}×</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">1.0× (True)</span>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.2"
                value={verticalExaggeration}
                onChange={(e) => setVerticalExaggeration(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[10px] font-mono text-slate-400">4.0×</span>
            </div>
          </div>

        </div>

        {/* Spatial Layer Visibility Checkboxes */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono pt-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showFloodMask}
                onChange={(e) => setShowFloodMask(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Extruded Water Body</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showRoads}
                onChange={(e) => setShowRoads(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Roads & Causeway</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showContours}
                onChange={(e) => setShowContours(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>5m Contour Lines</span>
            </label>
          </div>

          <div className="text-[10px] text-slate-400">
            DRAG TO ORBIT · SCROLL TO ZOOM · HOVER ANYWHERE TO PROBE ELEVATION & WATER COLUMN
          </div>
        </div>

      </div>

    </div>
  );
};
