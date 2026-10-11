import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Satellite, Scan, Eye, Activity } from 'lucide-react';

interface SensorSwathScanner3DProps {
  className?: string;
}

export const SensorSwathScanner3D: React.FC<SensorSwathScanner3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeBand, setActiveBand] = useState<'rgb' | 'ndwi' | 'mask'>('rgb');
  const activeBandRef = useRef<'rgb' | 'ndwi' | 'mask'>(activeBand);
  activeBandRef.current = activeBand;

  const targetMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020712, 0.22);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(1.8, 1.8, 2.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Ground Satellite Tile Surface (512x512 grid representation)
    const groundGeo = new THREE.PlaneGeometry(1.8, 1.8, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);

    // Create a dynamic canvas texture to simulate satellite optical tile & flood overlay
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background terrain
      ctx.fillStyle = '#0f291e';
      ctx.fillRect(0, 0, 256, 256);

      // River / Flood surface in cyan
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.bezierCurveTo(90, 140, 160, 40, 256, 120);
      ctx.lineTo(256, 190);
      ctx.bezierCurveTo(150, 120, 80, 210, 0, 160);
      ctx.closePath();
      ctx.fill();

      // Additional flood overflow basin
      ctx.beginPath();
      ctx.arc(180, 80, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    const groundTex = new THREE.CanvasTexture(canvas);
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTex,
      wireframe: false,
    });
    targetMaterialRef.current = groundMat;

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.2;
    rootGroup.add(groundMesh);

    // Coordinate grid overlay on ground
    const gridHelper = new THREE.GridHelper(1.8, 16, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.198;
    rootGroup.add(gridHelper);

    // 2. 3D Sentinel-2 Satellite Model
    const satGroup = new THREE.Group();
    const satBodyGeo = new THREE.BoxGeometry(0.12, 0.05, 0.05);
    const satBodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.2 });
    const satBody = new THREE.Mesh(satBodyGeo, satBodyMat);
    satGroup.add(satBody);

    const solarGeo = new THREE.PlaneGeometry(0.24, 0.08);
    const solarMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    const solar1 = new THREE.Mesh(solarGeo, solarMat);
    solar1.position.x = -0.18;
    const solar2 = new THREE.Mesh(solarGeo, solarMat);
    solar2.position.x = 0.18;
    satGroup.add(solar1);
    satGroup.add(solar2);

    satGroup.position.set(0, 0.8, 0);
    rootGroup.add(satGroup);

    // 3. Volumetric Radar/Optical Scanning Pyramid Beam
    const beamGeo = new THREE.ConeGeometry(0.65, 1.0, 4, 1, true);
    beamGeo.rotateX(Math.PI);
    beamGeo.translate(0, -0.5, 0);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const scanBeam = new THREE.Mesh(beamGeo, beamMat);
    satGroup.add(scanBeam);

    // 4. Ground Scan Line (Sweeping Cyan Laser Line)
    const scanLineGeo = new THREE.PlaneGeometry(1.8, 0.02);
    scanLineGeo.rotateX(-Math.PI / 2);
    const scanLineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const scanLine = new THREE.Mesh(scanLineGeo, scanLineMat);
    scanLine.position.y = -0.19;
    rootGroup.add(scanLine);

    // 5. Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight.position.set(2, 4, 2);
    scene.add(dirLight);

    // 6. Interactive Drag
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotY = 0.3;
    let rotX = 0.1;
    let scanPos = -0.8;
    let scanDir = 1;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      rotY += dx * 0.008;
      rotX = Math.max(-0.2, Math.min(0.6, rotX + dy * 0.008));
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!prefersReducedMotion) {
        // Sweep scan line and satellite
        scanPos += 0.008 * scanDir;
        if (scanPos > 0.8) scanDir = -1;
        if (scanPos < -0.8) scanDir = 1;

        satGroup.position.z = scanPos;
        scanLine.position.z = scanPos;

        if (!isDragging) {
          rotY += 0.002;
        }
      }

      rootGroup.rotation.y += (rotY - rootGroup.rotation.y) * 0.06;
      rootGroup.rotation.x += (rotX - rootGroup.rotation.x) * 0.06;

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
      groundGeo.dispose();
      groundMat.dispose();
      groundTex.dispose();
      satBodyGeo.dispose();
      satBodyMat.dispose();
      solarGeo.dispose();
      solarMat.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      scanLineGeo.dispose();
      scanLineMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl ${className}`}>
      <div
        ref={mountRef}
        className="w-full h-[320px] sm:h-[380px] cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      />

      {/* Top Header Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded border border-slate-800 text-left">
          <div className="flex items-center gap-2">
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Multispectral Swath Scanner
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Sentinel-2 MSI 290 km Swath Width · 5-Day Revisit
          </p>
        </div>

        <div className="text-[10px] font-mono text-cyan-400 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800 pointer-events-auto">
          SWATH ANGLE: 20.6°
        </div>
      </div>

      {/* Spectral Band Selector */}
      <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <Satellite className="w-4 h-4 text-cyan-400" />
          <span>Optical Spectral View:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveBand('rgb')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeBand === 'rgb'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            True Color (B4,B3,B2)
          </button>
          <button
            onClick={() => setActiveBand('ndwi')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeBand === 'ndwi'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            NDWI Water Index
          </button>
          <button
            onClick={() => setActiveBand('mask')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeBand === 'mask'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Inundation Mask
          </button>
        </div>
      </div>
    </div>
  );
};
