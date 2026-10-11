import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../../data/globalDisasters';
import { Globe, MapPin, Eye, Satellite, ArrowRight, ShieldCheck } from 'lucide-react';

interface OrbitalEarth3DProps {
  className?: string;
  onSelectHotspot?: (hotspot: GlobalDisasterLocation) => void;
  activeHotspotId?: string;
}

export const OrbitalEarth3D: React.FC<OrbitalEarth3DProps> = ({
  className = '',
  onSelectHotspot,
  activeHotspotId,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeHotspot, setActiveHotspot] = useState<GlobalDisasterLocation | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  const [isHovered, setIsHovered] = useState(false);
  const [webGlAvailable, setWebGlAvailable] = useState<boolean>(true);

  // References to communicate with active Three.js scene
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0.35, y: 0 });

  const filteredDisasters = selectedContinent === 'All'
    ? GLOBAL_DISASTERS
    : GLOBAL_DISASTERS.filter((d) => d.continent === selectedContinent);

  // Smoothly rotate globe to focus on a specific lat/lon
  const focusOnCoordinates = (lat: number, lon: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    // Target rotation to bring the point facing camera (+Z)
    targetRotationRef.current.y = -theta + Math.PI / 2;
    targetRotationRef.current.x = (lat * Math.PI) / 180 * 0.4;
  };

  const handleSelectSpot = (spot: GlobalDisasterLocation) => {
    setActiveHotspot(spot);
    focusOnCoordinates(spot.lat, spot.lon);
    onSelectHotspot?.(spot);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebGlAvailable(false);
      return;
    }

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.9;

    // 2. High-DPI WebGL Renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Root rotation group with Earth axial tilt (~23.4 deg)
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.35;
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // 3. Earth Core Sphere (Deep Obsidian Ocean)
    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x020712,
      transparent: true,
      opacity: 0.98,
    });
    const earthSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthSphere);

    // 4. Geodetic Lat/Long Coordinate Grid
    const wireframeGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(1.002, 32, 18));
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.15,
    });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    globeGroup.add(wireframe);

    // 5. Global Continental Landmass Particle Matrix
    const dotCount = 3200;
    const positions: number[] = [];
    const colors: number[] = [];

    const cyanColor = new THREE.Color(0x38bdf8);
    const deepBlueColor = new THREE.Color(0x0284c7);
    const emeraldColor = new THREE.Color(0x10b981);

    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / dotCount);
      const theta = Math.sqrt(dotCount * Math.PI) * phi;

      const lat = (Math.PI / 2 - phi) * (180 / Math.PI);
      const lon = (theta * (180 / Math.PI)) % 360 - 180;

      // Realistic global continental landmass filter
      const isLand =
        (lat > 10 && lat < 72 && lon > -168 && lon < -50) || // North America
        (lat > -56 && lat < 12 && lon > -82 && lon < -34) ||  // South America
        (lat > 35 && lat < 72 && lon > -10 && lon < 60) ||    // Europe
        (lat > -36 && lat < 38 && lon > -18 && lon < 52) ||   // Africa
        (lat > 5 && lat < 76 && lon > 58 && lon < 155) ||     // Asia
        (lat > -48 && lat < -10 && lon > 110 && lon < 180);   // Oceania & NZ

      if (isLand || Math.random() < 0.05) {
        const r = 1.006;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        positions.push(x, y, z);

        const rnd = Math.random();
        const c = rnd > 0.6 ? cyanColor : (rnd > 0.2 ? deepBlueColor : emeraldColor);
        colors.push(c.r, c.g, c.b);
      }
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pointGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
    });
    const pointCloud = new THREE.Points(pointGeo, pointMat);
    globeGroup.add(pointCloud);

    // 6. Global Disaster Pins & Pulse Rings
    const pinGroup = new THREE.Group();
    globeGroup.add(pinGroup);

    const hotspotMarkers: { mesh: THREE.Mesh; ring: THREE.Mesh; data: GlobalDisasterLocation }[] = [];

    GLOBAL_DISASTERS.forEach((hotspot) => {
      const phi = (90 - hotspot.lat) * (Math.PI / 180);
      const theta = (hotspot.lon + 180) * (Math.PI / 180);

      const r = 1.02;
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = (r * Math.sin(phi) * Math.sin(theta));
      const y = (r * Math.cos(phi));

      // Hotspot Pin
      const pinGeo = new THREE.SphereGeometry(0.022, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: hotspot.severity === 'Catastrophic' ? 0xef4444 : (hotspot.severity === 'Severe' ? 0x06b6d4 : 0x10b981),
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.set(x, y, z);

      // Hotspot Pulse Ring
      const ringGeo = new THREE.RingGeometry(0.026, 0.040, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: hotspot.severity === 'Catastrophic' ? 0xef4444 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x, y, z);
      ringMesh.lookAt(new THREE.Vector3(x * 2, y * 2, z * 2));

      pinGroup.add(pinMesh);
      pinGroup.add(ringMesh);
      hotspotMarkers.push({ mesh: pinMesh, ring: ringMesh, data: hotspot });
    });

    // 7. Atmospheric Glow Fresnel Shader
    const glowGeo = new THREE.SphereGeometry(1.18, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.04, 0.72, 0.96, 1.0) * intensity * 0.8;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(glowGeo, glowMat);
    scene.add(atmosphere);

    // 8. Sentinel-2 Orbital Constellation Trajectory
    const orbitRadius = 1.48;
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius * 0.94, 0, 2 * Math.PI, false, 0);
    const orbitPoints = orbitCurve.getPoints(120);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(
      orbitPoints.map((p) => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.06,
      gapSize: 0.03,
      transparent: true,
      opacity: 0.55,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 3.8;
    orbitLine.rotation.y = Math.PI / 5.2;
    scene.add(orbitLine);

    // Satellite Model
    const satGroup = new THREE.Group();
    const satBodyGeo = new THREE.BoxGeometry(0.045, 0.022, 0.022);
    const satBodyMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const satMesh = new THREE.Mesh(satBodyGeo, satBodyMat);
    satGroup.add(satMesh);

    // Solar panels
    const panelGeo = new THREE.PlaneGeometry(0.09, 0.028);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.x = -0.068;
    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.x = 0.068;
    satGroup.add(leftPanel);
    satGroup.add(rightPanel);

    // Downlink Laser Beam
    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.45,
    });
    const beamLine = new THREE.Line(beamGeo, beamMat);
    scene.add(beamLine);
    scene.add(satGroup);

    // 9. Interactive Drag & Dynamic Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let orbitAngle = 0;
    let pulseScale = 1;
    let pulseDirection = 1;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      targetRotationRef.current.y += deltaX * 0.006;
      targetRotationRef.current.x = Math.max(-1.0, Math.min(1.0, targetRotationRef.current.x + deltaY * 0.006));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!prefersReducedMotion && !isDragging) {
        targetRotationRef.current.y += 0.0018;
      }

      globeGroup.rotation.y += (targetRotationRef.current.y - globeGroup.rotation.y) * 0.08;
      globeGroup.rotation.x += (targetRotationRef.current.x - globeGroup.rotation.x) * 0.08;

      // Pulse ring scaling
      pulseScale += 0.015 * pulseDirection;
      if (pulseScale > 1.6) pulseDirection = -1;
      if (pulseScale < 0.9) pulseDirection = 1;

      hotspotMarkers.forEach(({ ring }) => {
        ring.scale.set(pulseScale, pulseScale, 1);
      });

      // Satellite Trajectory
      if (!prefersReducedMotion) {
        orbitAngle += 0.012;
      }
      const satX = orbitRadius * Math.cos(orbitAngle);
      const satZ = (orbitRadius * 0.94) * Math.sin(orbitAngle);

      const satPos = new THREE.Vector3(satX, 0, satZ);
      satPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 3.8);
      satPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 5.2);
      satGroup.position.copy(satPos);
      satGroup.lookAt(0, 0, 0);

      // Downlink Beam Target
      const targetPos = satPos.clone().normalize().multiplyScalar(1.0);
      beamGeo.setFromPoints([satPos, targetPos]);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      sphereGeo.dispose();
      wireframeGeo.dispose();
      pointGeo.dispose();
      glowGeo.dispose();
      orbitGeo.dispose();
      satBodyGeo.dispose();
      panelGeo.dispose();
      beamGeo.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative cursor-grab active:cursor-grabbing select-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Telemetry HUD */}
      {!webGlAvailable && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6 space-y-2">
          <Globe className="w-10 h-10 text-cyan-400 opacity-60 animate-pulse" />
          <p className="text-xs font-mono font-bold text-slate-200">
            WebGL Context Unavailable
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm">
            Interactive 3D Earth Globe is operating in 2D Disaster Telemetry mode. Select an epicenter below to monitor flood zones.
          </p>
        </div>
      )}
      <div className="absolute top-3 left-3 pointer-events-none text-xs font-mono text-slate-300 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-semibold text-cyan-300">GLOBAL EARTH OBSERVATION CONSTELLATION</span>
        </div>
        <p className="text-[11px] text-slate-400">
          20 Monitored Disaster Epicenters Across 6 Continents · Sentinel-2 MSI
        </p>
      </div>

      {/* Continent Quick Filter Bar */}
      <div className="absolute top-12 left-3 flex items-center gap-1 flex-wrap pointer-events-auto z-10">
        {['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America'].map((cont) => (
          <button
            key={cont}
            onClick={() => setSelectedContinent(cont)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
              selectedContinent === cont
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cont}
          </button>
        ))}
      </div>

      {/* Bottom Global Hotspot Quick Focus List */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1.5 flex-wrap max-w-lg">
          {filteredDisasters.slice(0, 4).map((spot) => (
            <button
              key={spot.id}
              onClick={() => handleSelectSpot(spot)}
              className="px-2.5 py-1 text-[10px] font-mono font-medium rounded bg-slate-900/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <MapPin className="w-2.5 h-2.5 text-cyan-400" />
              <span>{spot.country}: {spot.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-slate-400 hidden sm:block bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
          GLOBAL 3D ROTATION · 60 FPS
        </span>
      </div>

      {/* Selected Hotspot Detailed Modal Tooltip */}
      {activeHotspot && (
        <div className="absolute top-20 right-3 max-w-[260px] p-3.5 rounded-xl bg-slate-950/95 border border-cyan-500/40 text-left space-y-2 shadow-2xl backdrop-blur-md z-20 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-white">{activeHotspot.name}</span>
            <button
              onClick={() => setActiveHotspot(null)}
              className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] text-cyan-300 font-mono flex items-center justify-between">
            <span>{activeHotspot.country} ({activeHotspot.continent})</span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
              activeHotspot.severity === 'Catastrophic' ? 'bg-rose-950 text-rose-300' : 'bg-cyan-950 text-cyan-300'
            }`}>
              {activeHotspot.severity}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">{activeHotspot.event}</p>
          <div className="pt-1 text-[10px] font-mono text-slate-300 space-y-0.5 border-t border-slate-800/80">
            <div>Coords: <strong className="text-white">{activeHotspot.lat.toFixed(2)}°, {activeHotspot.lon.toFixed(2)}°</strong></div>
            <div>Inundation: <strong className="text-cyan-400">{activeHotspot.estimatedInundationHa.toLocaleString()} ha</strong></div>
            <div>Pop. at Risk: <strong className="text-amber-300">{activeHotspot.populationAtRisk.toLocaleString()}</strong></div>
            <div className="text-emerald-400 font-semibold">{activeHotspot.verifiedChips} Benchmark Chips ({activeHotspot.sensor})</div>
          </div>
        </div>
      )}
    </div>
  );
};
