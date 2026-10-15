import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Waves, Eye, RotateCcw, Mountain, Layers, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';

export interface TopographicTerrain3DProps {
  className?: string;
  initialWaterLevel?: number; // 0.0 to 1.0 normalized
  bounds?: { south: number; west: number; north: number; east: number } | null;
  elevationData?: number[] | null;
  minElevationMeters?: number | null;
  maxElevationMeters?: number | null;
  noDataValue?: number | null;
  verticalExaggeration?: number;
}

export const TopographicTerrain3D: React.FC<TopographicTerrain3DProps> = ({
  className = '',
  initialWaterLevel = 0.35,
  bounds = null,
  elevationData = null,
  minElevationMeters = null,
  maxElevationMeters = null,
  noDataValue = -9999,
  verticalExaggeration: initialExaggeration = 1.8,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [waterLevel, setWaterLevel] = useState<number>(initialWaterLevel);
  const [verticalAdjustment, setVerticalAdjustment] = useState<number>(initialExaggeration);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [webGlAvailable, setWebGlAvailable] = useState<boolean>(true);

  // Validated DEM State
  const [demStatus, setDemStatus] = useState<{
    hasValidatedDem: boolean;
    elevations: number[] | null;
    minM: number | null;
    maxM: number | null;
    badge: string;
    source: string;
  }>({
    hasValidatedDem: false,
    elevations: null,
    minM: null,
    maxM: null,
    badge: 'NO VALIDATED DEM DETECTED · FLAT REFERENCE PLANE',
    source: 'None',
  });

  // Fetch or validate DEM elevation data
  useEffect(() => {
    // 1. Direct elevationData prop takes precedence
    if (elevationData && elevationData.length > 0) {
      const validElevs = elevationData.filter(
        (v) => v !== null && !isNaN(v) && v !== noDataValue && v > -9000
      );
      const minM = minElevationMeters ?? (validElevs.length > 0 ? Math.min(...validElevs) : 0);
      const maxM = maxElevationMeters ?? (validElevs.length > 0 ? Math.max(...validElevs) : 100);

      setDemStatus({
        hasValidatedDem: true,
        elevations: elevationData,
        minM,
        maxM,
        badge: 'AUTHENTICATED DEM: USER VALIDATED ELEVATION RASTER',
        source: 'Validated DEM Input',
      });
      return;
    }

    // 2. Fetch Copernicus DEM from authoritative backend API if geographic bounds exist
    if (!bounds || bounds.south == null || bounds.north == null || bounds.west == null || bounds.east == null) {
      setDemStatus({
        hasValidatedDem: false,
        elevations: null,
        minM: null,
        maxM: null,
        badge: 'NO VALIDATED DEM DETECTED · FLAT REFERENCE PLANE',
        source: 'Unavailable',
      });
      return;
    }

    let isCancelled = false;

    const fetchElev = async () => {
      try {
        const res = await fetch(
          `/api/external/elevation?south=${bounds.south}&west=${bounds.west}&north=${bounds.north}&east=${bounds.east}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'SUCCESS' && Array.isArray(data.elevations) && data.elevations.length > 0) {
            if (!isCancelled) {
              setDemStatus({
                hasValidatedDem: true,
                elevations: data.elevations,
                minM: data.min_elevation_m ?? Math.min(...data.elevations),
                maxM: data.max_elevation_m ?? Math.max(...data.elevations),
                badge: 'AUTHENTICATED DEM: COPERNICUS GLO-90 (OPEN-METEO)',
                source: 'Copernicus GLO-90 DEM',
              });
              return;
            }
          }
        }
      } catch {
        // Fall through to unvalidated state
      }

      if (!isCancelled) {
        setDemStatus({
          hasValidatedDem: false,
          elevations: null,
          minM: null,
          maxM: null,
          badge: 'ELEVATION SOURCE UNAVAILABLE · FLAT REFERENCE PLANE',
          source: 'Unavailable',
        });
      }
    };

    fetchElev();

    return () => {
      isCancelled = true;
    };
  }, [bounds, elevationData, minElevationMeters, maxElevationMeters, noDataValue]);

  // Active Three.js References
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const terrainMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const terrainGeoRef = useRef<THREE.PlaneGeometry | null>(null);
  const wireMeshRef = useRef<THREE.LineSegments | null>(null);
  const alphaTexRef = useRef<THREE.CanvasTexture | null>(null);

  const autoRotateRef = useRef<boolean>(autoRotate);
  autoRotateRef.current = autoRotate;

  const verticalAdjustmentRef = useRef<number>(verticalAdjustment);
  verticalAdjustmentRef.current = verticalAdjustment;

  const demStatusRef = useRef(demStatus);
  demStatusRef.current = demStatus;

  // Initialize and update Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animId = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebGlAvailable(false);
      return;
    }

    // 1. Scene, Camera & Lighting
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020712, 0.25);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.4, 2.0, 2.6);
    camera.lookAt(0, 0.05, 0);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    sunLight.position.set(3, 5, 2);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Group for 3D rotation
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // 2. Terrain Mesh Construction
    const gridRes = 64;
    const terrainGeo = new THREE.PlaneGeometry(2.4, 2.4, gridRes, gridRes);
    terrainGeo.rotateX(-Math.PI / 2);
    terrainGeoRef.current = terrainGeo;

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
      alphaTest: 0.02,
    });
    terrainMatRef.current = terrainMat;

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMeshRef.current = terrainMesh;
    modelGroup.add(terrainMesh);

    // 3. Contour Elevation Wireframe
    const wireGeo = new THREE.WireframeGeometry(terrainGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.15,
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    wireMeshRef.current = wireMesh;
    modelGroup.add(wireMesh);

    // 4. Dynamic Inundation Water Plane
    const waterGeo = new THREE.PlaneGeometry(2.4, 2.4, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.72,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.15 + initialWaterLevel * 0.45;
    waterMeshRef.current = waterMesh;
    modelGroup.add(waterMesh);

    // 5. Inundation Basin Floor & Edge Bounding Box
    const boxGeo = new THREE.BoxGeometry(2.42, 0.55, 2.42);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const boundingBox = new THREE.Mesh(boxGeo, boxMat);
    boundingBox.position.y = 0.02;
    modelGroup.add(boundingBox);

    // 6. Interactive Orbit & Drag
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let targetRotY = 0.4;
    let targetRotX = 0.15;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;

      targetRotY += deltaX * 0.008;
      targetRotX = Math.max(-0.2, Math.min(0.8, targetRotX + deltaY * 0.008));

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 7. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Dynamic water ripple sine wave
      const waterPos = waterGeo.attributes.position;
      for (let i = 0; i < waterPos.count; i++) {
        const u = waterPos.getX(i);
        const v = waterPos.getZ(i);
        const wave = Math.sin(u * 5.0 + elapsedTime * 2.0) * Math.cos(v * 5.0 + elapsedTime * 1.5) * 0.006;
        waterPos.setY(i, wave);
      }
      waterGeo.computeVertexNormals();
      waterPos.needsUpdate = true;

      // Auto rotation
      if (autoRotateRef.current && !isDragging && !prefersReducedMotion) {
        targetRotY += 0.002;
      }

      modelGroup.rotation.y += (targetRotY - modelGroup.rotation.y) * 0.08;
      modelGroup.rotation.x += (targetRotX - modelGroup.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      boxGeo.dispose();
      boxMat.dispose();
      if (alphaTexRef.current) {
        alphaTexRef.current.dispose();
      }

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [initialWaterLevel]);

  // Recompute DEM-based vertical displacement, NoData transparent alpha masking, and colors
  const updateTerrainGeometry = useCallback(() => {
    const geo = terrainGeoRef.current;
    const mat = terrainMatRef.current;
    if (!geo || !mat) return;

    const posAttr = geo.attributes.position;
    const count = posAttr.count;
    const colors: number[] = [];
    const gridRes = 64;

    const currentDem = demStatusRef.current;
    const vertAdj = verticalAdjustmentRef.current;

    // Create 2D canvas for transparent NoData masking
    const canvas = document.createElement('canvas');
    canvas.width = gridRes;
    canvas.height = gridRes;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, gridRes, gridRes);
    }

    if (currentDem.hasValidatedDem && currentDem.elevations && currentDem.elevations.length > 0) {
      // 1. TRUE DEM TERRAIN GENERATION (Only occurs when validated elevation data exists)
      const elevs = currentDem.elevations;
      const demDim = Math.round(Math.sqrt(elevs.length));
      const minM = currentDem.minM ?? 0;
      const maxM = currentDem.maxM ?? 100;
      const rangeM = Math.max(1, maxM - minM);

      for (let r = 0; r < gridRes; r++) {
        const demR = (r / (gridRes - 1)) * (demDim - 1);
        const r0 = Math.floor(demR);
        const r1 = Math.min(demDim - 1, r0 + 1);
        const rFrac = demR - r0;

        for (let c = 0; c < gridRes; c++) {
          const idx = r * (gridRes + 1) + c;
          const demC = (c / (gridRes - 1)) * (demDim - 1);
          const c0 = Math.floor(demC);
          const c1 = Math.min(demDim - 1, c0 + 1);
          const cFrac = demC - c0;

          // Sample elevation from 2D DEM grid
          const v00 = elevs[r0 * demDim + c0];
          const v01 = elevs[r0 * demDim + c1];
          const v10 = elevs[r1 * demDim + c0];
          const v11 = elevs[r1 * demDim + c1];

          // Check for NoData values
          const isNoData =
            v00 === noDataValue || v00 <= -9000 || isNaN(v00) ||
            v01 === noDataValue || v01 <= -9000 || isNaN(v01) ||
            v10 === noDataValue || v10 <= -9000 || isNaN(v10) ||
            v11 === noDataValue || v11 <= -9000 || isNaN(v11);

          if (isNoData) {
            // NoData Transparent Masking: Displace below ground & mask alpha to 0
            posAttr.setY(idx, -0.35);
            colors.push(0, 0, 0);
            if (ctx) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.0)';
              ctx.fillRect(c, r, 1, 1);
            }
          } else {
            // Bilinear interpolation of genuine DEM elevation
            const top = v00 * (1 - cFrac) + v01 * cFrac;
            const bottom = v10 * (1 - cFrac) + v11 * cFrac;
            const elevationM = top * (1 - rFrac) + bottom * rFrac;

            // Normalized vertical displacement with user-controlled DEM vertical adjustment
            const normY = (elevationM - minM) / rangeM;
            const physicalY = (normY - 0.25) * 0.45 * (vertAdj / 1.8);
            posAttr.setY(idx, physicalY);

            // Topographic Hypsometric Color Ramp based on actual MSL elevation
            if (normY < 0.2) {
              colors.push(0.04, 0.22, 0.18); // Low riverbed / alluvial basin
            } else if (normY < 0.45) {
              colors.push(0.12, 0.35, 0.25); // Vegetated valley
            } else if (normY < 0.75) {
              colors.push(0.35, 0.42, 0.46); // Rocky plateau
            } else {
              colors.push(0.78, 0.88, 0.95); // High mountain ridge
            }

            if (ctx) {
              ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
              ctx.fillRect(c, r, 1, 1);
            }
          }
        }
      }
    } else {
      // 2. FLAT REFERENCE PLANE (Zero elevation fabrication when validated DEM is absent)
      for (let i = 0; i < count; i++) {
        posAttr.setY(i, 0); // Strictly flat: 0.0
        colors.push(0.18, 0.22, 0.28);
      }
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fillRect(0, 0, gridRes, gridRes);
      }
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    posAttr.needsUpdate = true;

    // Apply transparent NoData alpha texture map
    if (alphaTexRef.current) {
      alphaTexRef.current.dispose();
    }
    const alphaTexture = new THREE.CanvasTexture(canvas);
    alphaTexture.minFilter = THREE.LinearFilter;
    alphaTexture.magFilter = THREE.NearestFilter;
    alphaTexRef.current = alphaTexture;

    mat.alphaMap = alphaTexture;
    mat.needsUpdate = true;
  }, [noDataValue]);

  // Trigger geometry update when DEM status or vertical adjustment changes
  useEffect(() => {
    updateTerrainGeometry();
  }, [demStatus, verticalAdjustment, updateTerrainGeometry]);

  // Update water plane position relative to DEM vertical adjustment
  const handleWaterSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setWaterLevel(val);
    if (waterMeshRef.current) {
      if (demStatus.hasValidatedDem) {
        // Position relative to DEM vertical scale
        const scaledY = (-0.18 + val * 0.45) * (verticalAdjustment / 1.8);
        waterMeshRef.current.position.y = scaledY;
      } else {
        // Flat reference plane: visual water layer sits directly on surface
        waterMeshRef.current.position.y = val * 0.05;
      }
    }
  };

  const handleVerticalAdjustmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVerticalAdjustment(val);
    if (waterMeshRef.current && demStatus.hasValidatedDem) {
      waterMeshRef.current.position.y = (-0.18 + waterLevel * 0.45) * (val / 1.8);
    }
  };

  const toggleWireframe = () => {
    const next = !wireframeMode;
    setWireframeMode(next);
    if (terrainMatRef.current) {
      terrainMatRef.current.wireframe = next;
    }
  };

  // Truthful physical metrics calculation
  const physicalStageMeters = useMemo(() => {
    if (!demStatus.hasValidatedDem || demStatus.minM == null || demStatus.maxM == null) {
      return null;
    }
    const range = demStatus.maxM - demStatus.minM;
    return (demStatus.minM + waterLevel * range).toFixed(1);
  }, [demStatus, waterLevel]);

  const submergedPercent = useMemo(() => {
    if (!demStatus.hasValidatedDem || !demStatus.elevations || demStatus.minM == null || demStatus.maxM == null) {
      return Math.round(waterLevel * 100);
    }
    const targetElev = demStatus.minM + waterLevel * (demStatus.maxM - demStatus.minM);
    const valid = demStatus.elevations.filter((v) => v !== noDataValue && v > -9000 && !isNaN(v));
    if (valid.length === 0) return 0;
    const below = valid.filter((v) => v <= targetElev).length;
    return Math.round((below / valid.length) * 100);
  }, [demStatus, waterLevel, noDataValue]);

  return (
    <div className={`relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl ${className}`}>
      
      {/* 3D WebGL Canvas Container */}
      {!webGlAvailable && (
        <div className="w-full h-[380px] sm:h-[440px] flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-2">
          <Waves className="w-10 h-10 text-cyan-400 opacity-60 animate-pulse" />
          <p className="text-xs font-mono font-bold text-slate-200">
            WebGL Context Unavailable
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm">
            Topographic DEM visualizer requires active WebGL. Running in fail-safe telemetry mode.
          </p>
        </div>
      )}
      <div
        ref={mountRef}
        className={`w-full h-[380px] sm:h-[440px] cursor-grab active:cursor-grabbing select-none ${!webGlAvailable ? 'hidden' : ''}`}
        style={{ touchAction: 'none' }}
      />

      {/* Top Floating Telemetry & Mode Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800 text-left max-w-md">
          <div className="flex items-center gap-2">
            <Mountain className={`w-3.5 h-3.5 ${demStatus.hasValidatedDem ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              3D Digital Elevation Model
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            {demStatus.hasValidatedDem ? (
              <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
            )}
            <p className="text-[10px] text-cyan-300 font-mono font-semibold tracking-tight truncate">
              {demStatus.badge}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={toggleWireframe}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
              wireframeMode
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {wireframeMode ? 'Shaded Mesh' : 'DEM Wireframe'}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle Auto Rotation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Interactive Inundation Slider & Physical Stats */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800 backdrop-blur space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <Waves className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <span className="font-semibold">Flood Inundation Stage:</span>
            <span className="text-white font-bold tabular-nums">
              {demStatus.hasValidatedDem && physicalStageMeters !== null
                ? `${physicalStageMeters}m MSL`
                : 'Stage Unavailable (Requires Validated DEM)'}
            </span>
          </div>
          <div className="text-slate-400 text-xs">
            Submerged Area: <span className="text-cyan-400 font-semibold tabular-nums">{submergedPercent}%</span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Water Stage Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{demStatus.hasValidatedDem && demStatus.minM != null ? `${demStatus.minM}m Base` : '0m Base'}</span>
              <span className="text-cyan-300 font-semibold">Simulated Stage Level</span>
              <span className="text-rose-400">{demStatus.hasValidatedDem && demStatus.maxM != null ? `${demStatus.maxM}m Peak` : 'High Inundation'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={waterLevel}
              onChange={handleWaterSliderChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* DEM Vertical Adjustment / Relief Exaggeration Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1.0× (True Relief)</span>
              <span className="text-cyan-300 font-semibold">DEM Vertical Exaggeration: {verticalAdjustment.toFixed(1)}×</span>
              <span>4.0× Peak</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.1"
              value={verticalAdjustment}
              onChange={handleVerticalAdjustmentChange}
              disabled={!demStatus.hasValidatedDem}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 ${
                demStatus.hasValidatedDem ? 'bg-slate-800' : 'bg-slate-900 opacity-40 cursor-not-allowed'
              }`}
            />
          </div>
        </div>

        {/* NoData Masking & Provenance Disclosure */}
        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <span>
            {demStatus.hasValidatedDem
              ? `Source: ${demStatus.source} · Transparent NoData collar masking active.`
              : 'Zero-Fabrication Policy: Procedural mountain generation disabled without verified DEM datum.'}
          </span>
          <span className="text-slate-400">
            {demStatus.hasValidatedDem && demStatus.minM != null && demStatus.maxM != null
              ? `Relief: ${demStatus.minM.toFixed(1)}m – ${demStatus.maxM.toFixed(1)}m MSL`
              : 'Surface: Flat Reference Plane'}
          </span>
        </div>
      </div>

    </div>
  );
};
