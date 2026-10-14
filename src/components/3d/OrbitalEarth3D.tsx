import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLOBAL_DISASTERS, GlobalDisasterLocation } from '../../data/globalDisasters';
import { Globe, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

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
  const [hoveredHotspot, setHoveredHotspot] = useState<GlobalDisasterLocation | null>(null);
  const [webGlAvailable, setWebGlAvailable] = useState<boolean>(true);

  // References for Three.js scene communication
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isAnimatingFlightRef = useRef<boolean>(false);
  const flightProgressRef = useRef<number>(1.0);
  const flightStartRotationRef = useRef<{ x: number; y: number }>({ x: 0.35, y: -0.8 });
  const flightTargetRotationRef = useRef<{ x: number; y: number }>({ x: 0.35, y: -0.8 });
  const flightStartZoomRef = useRef<number>(2.9);
  const flightTargetZoomRef = useRef<number>(2.9);
  const currentCameraZRef = useRef<number>(2.9);

  // Smoothly rotate globe and transition camera to focus on coordinates
  const focusOnCoordinates = useCallback((lat: number, lon: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const globeGroup = globeGroupRef.current;
    const currentRotY = globeGroup ? globeGroup.rotation.y : -0.8;
    const currentRotX = globeGroup ? globeGroup.rotation.x : 0.35;

    let targetY = -theta + Math.PI / 2;
    const targetX = (lat * Math.PI) / 180 * 0.45;

    const twoPi = Math.PI * 2;
    let deltaY = (targetY - currentRotY) % twoPi;
    if (deltaY > Math.PI) deltaY -= twoPi;
    if (deltaY < -Math.PI) deltaY += twoPi;

    flightStartRotationRef.current = { x: currentRotX, y: currentRotY };
    flightTargetRotationRef.current = { x: targetX, y: currentRotY + deltaY };
    flightStartZoomRef.current = currentCameraZRef.current;
    flightTargetZoomRef.current = 1.95;

    flightProgressRef.current = 0.0;
    isAnimatingFlightRef.current = true;
  }, []);

  const resetView = useCallback(() => {
    const globeGroup = globeGroupRef.current;
    const currentRotY = globeGroup ? globeGroup.rotation.y : -0.8;
    const currentRotX = globeGroup ? globeGroup.rotation.x : 0.35;

    flightStartRotationRef.current = { x: currentRotX, y: currentRotY };
    flightTargetRotationRef.current = { x: 0.3, y: currentRotY + 0.3 };
    flightStartZoomRef.current = currentCameraZRef.current;
    flightTargetZoomRef.current = 2.9;

    flightProgressRef.current = 0.0;
    isAnimatingFlightRef.current = true;
    setActiveHotspot(null);
  }, []);

  const zoomIn = useCallback(() => {
    if (cameraRef.current) {
      currentCameraZRef.current = Math.max(1.6, currentCameraZRef.current - 0.35);
      cameraRef.current.position.z = currentCameraZRef.current;
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (cameraRef.current) {
      currentCameraZRef.current = Math.min(4.0, currentCameraZRef.current + 0.35);
      cameraRef.current.position.z = currentCameraZRef.current;
    }
  }, []);

  const handleSelectSpot = useCallback((spot: GlobalDisasterLocation) => {
    setActiveHotspot(spot);
    focusOnCoordinates(spot.lat, spot.lon);
    onSelectHotspot?.(spot);
  }, [focusOnCoordinates, onSelectHotspot]);

  useEffect(() => {
    if (activeHotspotId) {
      const target = GLOBAL_DISASTERS.find((d) => d.id === activeHotspotId);
      if (target) {
        setActiveHotspot(target);
        focusOnCoordinates(target.lat, target.lon);
      }
    }
  }, [activeHotspotId, focusOnCoordinates]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setWebGlAvailable(false);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.z = currentCameraZRef.current;
    cameraRef.current = camera;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    // Tilt to show Europe, Africa, Atlantic, and Americas naturally
    globeGroup.rotation.x = 0.35;
    globeGroup.rotation.y = -0.8;
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // Natural lighting: Sun from upper right + soft ambient
    const sunLight = new THREE.DirectionalLight(0xfff6ea, 2.8);
    sunLight.position.set(6, 3.5, 4.5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x182032, 0.85);
    scene.add(ambientLight);

    const textureLoader = new THREE.TextureLoader();

    // 1. Genuine NASA Blue Marble Earth Texture & Specular Map
    const earthTexture = textureLoader.load('/textures/earth_atmos_2048.jpg');
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const specularTexture = textureLoader.load('/textures/earth_specular_2048.jpg');

    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specularMap: specularTexture,
      specular: new THREE.Color(0x384c68),
      shininess: 18,
      bumpScale: 0.02,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // 2. Realistic Semi-Transparent Cloud Layer
    const cloudsTexture = textureLoader.load('/textures/earth_clouds_1024.png');
    const cloudsGeo = new THREE.SphereGeometry(1.006, 64, 64);
    const cloudsMat = new THREE.MeshLambertMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.78,
      blending: THREE.NormalBlending,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    globeGroup.add(cloudsMesh);
    cloudsRef.current = cloudsMesh;

    // 3. Physically Plausible Atmospheric Rayleigh Rim Shader
    const atmosphereGeo = new THREE.SphereGeometry(1.055, 48, 48);
    const atmosphereMat = new THREE.ShaderMaterial({
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
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.6);
          gl_FragColor = vec4(0.35, 0.65, 0.95, 0.45) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 4. Subtle, Real Geographic Location Markers
    const pinGroup = new THREE.Group();
    globeGroup.add(pinGroup);

    const hotspotMeshes: THREE.Object3D[] = [];

    GLOBAL_DISASTERS.forEach((hotspot) => {
      const phi = (90 - hotspot.lat) * (Math.PI / 180);
      const theta = (hotspot.lon + 180) * (Math.PI / 180);

      const rBase = 1.006;
      const rTip = 1.05;

      const xBase = -(rBase * Math.sin(phi) * Math.cos(theta));
      const zBase = (rBase * Math.sin(phi) * Math.sin(theta));
      const yBase = (rBase * Math.cos(phi));

      const xTip = -(rTip * Math.sin(phi) * Math.cos(theta));
      const zTip = (rTip * Math.sin(phi) * Math.sin(theta));
      const yTip = (rTip * Math.cos(phi));

      const posVec = new THREE.Vector3(xTip, yTip, zTip);
      const baseVec = new THREE.Vector3(xBase, yBase, zBase);

      // Hairline stem connecting surface to pin head
      const stemGeo = new THREE.BufferGeometry().setFromPoints([baseVec, posVec]);
      const stemMat = new THREE.LineBasicMaterial({
        color: hotspot.severity === 'Catastrophic' ? 0xf43f5e : 0x38bdf8,
        transparent: true,
        opacity: 0.65,
      });
      const stemLine = new THREE.Line(stemGeo, stemMat);
      pinGroup.add(stemLine);

      // Clean pin head
      const pinGeo = new THREE.SphereGeometry(0.016, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: hotspot.severity === 'Catastrophic' ? 0xf43f5e : 0x0284c7,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(posVec);
      pinMesh.userData = { hotspot };

      pinGroup.add(pinMesh);
      hotspotMeshes.push(pinMesh);
    });

    // 5. Interactive Drag & Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    let dragDistance = 0;
    let previousMousePosition = { x: 0, y: 0 };

    const getNDCCoordinates = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragDistance = 0;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const ndc = getNDCCoordinates(e);
      mouse.x = ndc.x;
      mouse.y = ndc.y;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

        if (globeGroup) {
          globeGroup.rotation.y += deltaX * 0.005;
          globeGroup.rotation.x = Math.max(-1.1, Math.min(1.1, globeGroup.rotation.x + deltaY * 0.005));
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(hotspotMeshes, false);

        if (intersects.length > 0) {
          const targetSpot = intersects[0].object.userData?.hotspot as GlobalDisasterLocation | undefined;
          if (targetSpot) {
            container.style.cursor = 'pointer';
            setHoveredHotspot(targetSpot);
          }
        } else {
          container.style.cursor = 'grab';
          setHoveredHotspot(null);
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragDistance < 5) {
        const ndc = getNDCCoordinates(e);
        mouse.x = ndc.x;
        mouse.y = ndc.y;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(hotspotMeshes, false);

        if (intersects.length > 0) {
          const clickedSpot = intersects[0].object.userData?.hotspot as GlobalDisasterLocation | undefined;
          if (clickedSpot) {
            handleSelectSpot(clickedSpot);
          }
        }
      }
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      currentCameraZRef.current = Math.max(1.6, Math.min(4.0, currentCameraZRef.current + e.deltaY * 0.002));
      camera.position.z = currentCameraZRef.current;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Render loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera flight transition (600-800ms smooth easing)
      if (isAnimatingFlightRef.current) {
        flightProgressRef.current += 0.022;
        if (flightProgressRef.current >= 1.0) {
          flightProgressRef.current = 1.0;
          isAnimatingFlightRef.current = false;
        }

        const t = flightProgressRef.current;
        // Cubic ease curve
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        if (globeGroup) {
          globeGroup.rotation.x = flightStartRotationRef.current.x + (flightTargetRotationRef.current.x - flightStartRotationRef.current.x) * ease;
          globeGroup.rotation.y = flightStartRotationRef.current.y + (flightTargetRotationRef.current.y - flightStartRotationRef.current.y) * ease;
        }

        const arcBonus = Math.sin(t * Math.PI) * 0.35;
        const baseZ = flightStartZoomRef.current + (flightTargetZoomRef.current - flightStartZoomRef.current) * ease;
        currentCameraZRef.current = baseZ + arcBonus;
        camera.position.z = currentCameraZRef.current;
      } else if (!isDragging && !prefersReducedMotion && globeGroup) {
        // Slow natural planetary rotation
        globeGroup.rotation.y += 0.0008;
      }

      // Clouds rotate slightly faster for realistic atmospheric depth
      if (cloudsRef.current && !prefersReducedMotion) {
        cloudsRef.current.rotation.y += 0.0002;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      cloudsGeo.dispose();
      cloudsMat.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      earthTexture.dispose();
      specularTexture.dispose();
      cloudsTexture.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handleSelectSpot]);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      
      {/* 3D WebGL Canvas Stage */}
      <div
        ref={mountRef}
        className="w-full h-full min-h-[460px] lg:min-h-[580px] cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {!webGlAvailable && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Globe className="w-8 h-8 text-[#6E8096]" />
            <p className="text-xs text-[#AAB8C8]">WebGL Acceleration Unavailable</p>
          </div>
        )}

        {/* Quiet Elevated Glass Hover Tooltip */}
        {hoveredHotspot && (
          <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 px-3 py-1.5 rounded-[10px] bg-[rgba(22,34,49,0.85)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] text-xs text-[#F3F5F7] shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-[#F3F5F7]">{hoveredHotspot.name}</span>
            <span className="text-[#6E8096]">·</span>
            <span className="text-[#AAB8C8]">{hoveredHotspot.country}</span>
          </div>
        )}

        {/* Selected Location Card in Elevated Glass - Perfectly Positioned, Never Clips */}
        {activeHotspot && (
          <div className="absolute bottom-16 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-auto sm:max-w-[290px] p-4 rounded-xl bg-[rgba(22,34,49,0.82)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.45)] text-left space-y-2.5 z-20 transition-all duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)]">
            <div className="flex items-center justify-between border-b border-[rgba(148,170,195,0.14)] pb-2">
              <span className="text-xs font-semibold text-[#F3F5F7] tracking-tight">{activeHotspot.name}</span>
              <button
                onClick={() => {
                  setActiveHotspot(null);
                  resetView();
                }}
                className="text-[#AAB8C8] hover:text-[#F3F5F7] p-0.5 cursor-pointer transition-colors duration-[160ms]"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-[#AAB8C8] flex items-center justify-between">
              <span>{activeHotspot.country}</span>
              <span className="font-mono text-[#39B8C8] font-medium tabular-nums">{activeHotspot.estimatedInundationHa.toLocaleString()} ha</span>
            </div>
            <p className="text-[11px] text-[#AAB8C8] leading-relaxed">{activeHotspot.event}</p>
          </div>
        )}
      </div>

      {/* Understated Zoom & Reset Controls */}
      <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 flex items-center gap-1 z-20 bg-[rgba(16,25,37,0.78)] backdrop-blur-[18px] backdrop-saturate-[135%] border border-[rgba(148,170,195,0.16)] shadow-[0_4px_16px_rgba(0,0,0,0.3)] rounded-[10px] p-1 text-[#AAB8C8]">
        <button
          onClick={zoomIn}
          title="Zoom in"
          className="p-1.5 hover:text-[#F3F5F7] hover:bg-[rgba(22,34,49,0.85)] rounded-[8px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom out"
          className="p-1.5 hover:text-[#F3F5F7] hover:bg-[rgba(22,34,49,0.85)] rounded-[8px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-3.5 bg-[rgba(148,170,195,0.16)] my-auto mx-0.5" />
        <button
          onClick={resetView}
          title="Reset globe view"
          className="p-1.5 hover:text-[#F3F5F7] hover:bg-[rgba(22,34,49,0.85)] rounded-[8px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
