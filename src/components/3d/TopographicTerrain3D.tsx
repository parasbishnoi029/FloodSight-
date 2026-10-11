import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Waves, Sliders, Eye, RotateCcw, Mountain } from 'lucide-react';

interface TopographicTerrain3DProps {
  className?: string;
  initialWaterLevel?: number; // 0.0 to 1.0 normalized
}

export const TopographicTerrain3D: React.FC<TopographicTerrain3DProps> = ({
  className = '',
  initialWaterLevel = 0.35,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [waterLevel, setWaterLevel] = useState<number>(initialWaterLevel);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [webGlAvailable, setWebGlAvailable] = useState<boolean>(true);

  // References to communicate with the active Three.js scene
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const terrainMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const autoRotateRef = useRef<boolean>(autoRotate);
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId = 0;

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
    scene.fog = new THREE.FogExp2(0x020712, 0.28);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.4, 2.0, 2.6);
    camera.lookAt(0, 0.1, 0);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.8);
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

    // 2. Procedural Topographic DEM Terrain Geometry
    const gridRes = 64;
    const terrainGeo = new THREE.PlaneGeometry(2.4, 2.4, gridRes, gridRes);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];

    // Realistic elevation function simulating valley, riverbed, and mountain ridges
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Multi-octave Perlin-style sinusoidal elevation
      const d = Math.sqrt(x * x + z * z);
      const riverBed = Math.sin(x * 2.5 + z * 1.8) * 0.15;
      const ridges = Math.cos(x * 3.5) * Math.sin(z * 3.5) * 0.22;
      const mountainPeak = Math.exp(-((x - 0.5) ** 2 + (z + 0.4) ** 2) * 2.5) * 0.45;
      const valley = (1 - Math.exp(-(d ** 2) * 1.5)) * 0.35;

      const y = Math.max(-0.25, riverBed + ridges + mountainPeak + valley * 0.3 - 0.18);
      posAttr.setY(i, y);

      // Topographic hypsometric color ramp: (Deep Valley Green -> Slate Rock -> Snow Peak)
      if (y < 0.0) {
        colors.push(0.04, 0.22, 0.18); // Low riverbed / alluvial basin
      } else if (y < 0.2) {
        colors.push(0.12, 0.32, 0.24); // Vegetated valley
      } else if (y < 0.35) {
        colors.push(0.33, 0.38, 0.44); // Rocky outcrop
      } else {
        colors.push(0.75, 0.85, 0.95); // High peak
      }
    }
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      wireframe: false,
    });
    terrainMatRef.current = terrainMat;

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    modelGroup.add(terrainMesh);

    // 3. Contour Elevation Grid Lines
    const wireGeo = new THREE.WireframeGeometry(terrainGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.12,
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    modelGroup.add(wireMesh);

    // 4. Dynamic Inundation Water Plane
    const waterGeo = new THREE.PlaneGeometry(2.4, 2.4, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.72,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.15 + initialWaterLevel * 0.45;
    waterMeshRef.current = waterMesh;
    modelGroup.add(waterMesh);

    // 5. Inundation Basin Floor & Edge Bounding Box
    const boxGeo = new THREE.BoxGeometry(2.4, 0.6, 2.4);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const boundingBox = new THREE.Mesh(boxGeo, boxMat);
    boundingBox.position.y = 0.05;
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

    // 8. Animation Loop with Animated Water Waves
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Dynamic water ripple sine wave
      const waterPos = waterGeo.attributes.position;
      for (let i = 0; i < waterPos.count; i++) {
        const u = waterPos.getX(i);
        const v = waterPos.getZ(i);
        const wave = Math.sin(u * 5.0 + elapsedTime * 2.0) * Math.cos(v * 5.0 + elapsedTime * 1.5) * 0.008;
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

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update water plane elevation when slider changes
  const handleWaterSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setWaterLevel(val);
    if (waterMeshRef.current) {
      // Scale from minimum valley (-0.15) to high inundation (0.35)
      waterMeshRef.current.position.y = -0.15 + val * 0.45;
    }
  };

  const toggleWireframe = () => {
    const next = !wireframeMode;
    setWireframeMode(next);
    if (terrainMatRef.current) {
      terrainMatRef.current.wireframe = next;
    }
  };

  const estimatedDepthMeters = (waterLevel * 12.0).toFixed(1);
  const submergedPercent = Math.min(100, Math.round(waterLevel * 78 + 4));

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
            Topographic DEM terrain visualizer is operating in telemetry simulation mode. Use the elevation slider below to inspect flood inundation contours.
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
        <div className="bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded border border-slate-800 text-left">
          <div className="flex items-center gap-2">
            <Mountain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              3D Digital Elevation Model
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Procedural Topographic Inundation Simulator
          </p>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={toggleWireframe}
            className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              wireframeMode
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {wireframeMode ? 'Shaded Mesh' : 'DEM Wireframe'}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 text-xs font-mono rounded border transition-colors ${
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
      <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
            <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-semibold">Simulated Flood Inundation Stage:</span>
            <span className="text-white font-bold tabular-nums">+{estimatedDepthMeters}m MSL</span>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Submerged Valley: <span className="text-cyan-400 font-semibold tabular-nums">{submergedPercent}%</span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400">Baseline (0m)</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={waterLevel}
            onChange={handleWaterSliderChange}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[11px] font-mono text-red-400">Severe Inundation (+12m)</span>
        </div>
      </div>

    </div>
  );
};
