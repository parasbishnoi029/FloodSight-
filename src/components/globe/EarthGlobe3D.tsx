import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface EarthGlobe3DProps {
  className?: string;
}

export const EarthGlobe3D: React.FC<EarthGlobe3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.8;

    // 2. WebGL Renderer with High-DPI support
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Root rotation group with Earth axial tilt (~23.5 deg = 0.41 rad)
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.38;
    scene.add(globeGroup);

    // 3. Earth Core Sphere (Deep Dark Obsidian/Navy)
    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x030a16,
      transparent: true,
      opacity: 0.96,
    });
    const earthSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthSphere);

    // 4. Geodetic Lat/Long Wireframe Rings
    const wireframeGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(1.002, 24, 18));
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.15,
    });
    const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    globeGroup.add(wireframe);

    // 5. Continental Landmass Particle Matrix
    const dotCount = 2000;
    const positions: number[] = [];
    const colors: number[] = [];

    const cyanColor = new THREE.Color(0x38bdf8);
    const brightColor = new THREE.Color(0x06b6d4);

    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / dotCount);
      const theta = Math.sqrt(dotCount * Math.PI) * phi;

      const lat = (Math.PI / 2 - phi) * (180 / Math.PI);
      const lon = (theta * (180 / Math.PI)) % 360 - 180;

      // Realistic continental landmass filter
      const isLand =
        (lat > 10 && lat < 70 && lon > -165 && lon < -50) || // North America
        (lat > -55 && lat < 12 && lon > -82 && lon < -34) ||  // South America
        (lat > 35 && lat < 70 && lon > -10 && lon < 60) ||    // Europe
        (lat > -35 && lat < 37 && lon > -18 && lon < 52) ||   // Africa
        (lat > 5 && lat < 75 && lon > 60 && lon < 150) ||     // Asia
        (lat > -45 && lat < -10 && lon > 110 && lon < 155);   // Australia

      if (isLand || Math.random() < 0.07) {
        const r = 1.006;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        positions.push(x, y, z);

        const c = Math.random() > 0.25 ? cyanColor : brightColor;
        colors.push(c.r, c.g, c.b);
      }
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pointGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const pointMat = new THREE.PointsMaterial({
      size: 0.016,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    const pointCloud = new THREE.Points(pointGeo, pointMat);
    globeGroup.add(pointCloud);

    // 6. Atmospheric Glow Shader Rim
    const glowGeo = new THREE.SphereGeometry(1.15, 32, 32);
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
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.06, 0.75, 0.95, 1.0) * intensity * 0.75;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(glowGeo, glowMat);
    scene.add(atmosphere);

    // 7. Satellite Orbital Ring & Beacon
    const orbitRadius = 1.45;
    const orbitCurve = new THREE.EllipseCurve(
      0, 0,
      orbitRadius, orbitRadius * 0.92,
      0, 2 * Math.PI,
      false,
      0
    );
    const orbitPoints = orbitCurve.getPoints(100);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(
      orbitPoints.map((p) => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.05,
      gapSize: 0.03,
      transparent: true,
      opacity: 0.5,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    orbitLine.rotation.x = Math.PI / 4;
    orbitLine.rotation.y = Math.PI / 6;
    scene.add(orbitLine);

    // Satellite Model
    const satGroup = new THREE.Group();
    const satBodyGeo = new THREE.BoxGeometry(0.04, 0.02, 0.02);
    const satBodyMat = new THREE.MeshBasicMaterial({ color: 0xf0f9ff });
    const satMesh = new THREE.Mesh(satBodyGeo, satBodyMat);
    satGroup.add(satMesh);

    // Solar panels
    const panelGeo = new THREE.PlaneGeometry(0.08, 0.025);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x0369a1, side: THREE.DoubleSide });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.x = -0.06;
    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.x = 0.06;
    satGroup.add(leftPanel);
    satGroup.add(rightPanel);

    // Satellite point light
    const satLight = new THREE.PointLight(0x38bdf8, 2, 0.8);
    satGroup.add(satLight);

    // Downlink observation beam line (Satellite -> Earth center)
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.3,
    });
    const beamLine = new THREE.Line(beamGeo, beamMat);
    scene.add(beamLine);

    scene.add(satGroup);

    // 8. Mouse Drag & Inertial Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0;
    let targetRotationX = 0.38;
    let orbitAngle = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        const rect = container.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / width - 0.5;
        const normY = (e.clientY - rect.top) / height - 0.5;
        targetRotationX = 0.38 + normY * 0.2;
        targetRotationY += normX * 0.002;
        return;
      }

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      globeGroup.rotation.y += deltaX * 0.006;
      globeGroup.rotation.x += deltaY * 0.006;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. 60 FPS Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!prefersReducedMotion && !isDragging) {
        globeGroup.rotation.y += 0.0022;
        globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.05;
      }

      // Satellite orbital trajectory
      if (!prefersReducedMotion) {
        orbitAngle += 0.01;
      }
      const satX = orbitRadius * Math.cos(orbitAngle);
      const satZ = (orbitRadius * 0.92) * Math.sin(orbitAngle);

      const satPos = new THREE.Vector3(satX, 0, satZ);
      satPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 4);
      satPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
      satGroup.position.copy(satPos);
      satGroup.lookAt(0, 0, 0);

      // Update observation beam position from satellite to earth surface
      const targetPos = satPos.clone().normalize().multiplyScalar(1.0);
      beamGeo.setFromPoints([satPos, targetPos]);

      renderer.render(scene, camera);
    };

    animate();

    // 10. Memory Cleanup
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
      {/* Tactical Telemetry HUD Overlay */}
      <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-cyan-400/90 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>ORBITAL CONSTELLATION: SENTINEL-2A</span>
        </div>
        <p className="text-slate-400 text-[9px]">ALT: 786 KM · INC: 98.2° · GSD: 10M / 0.5M</p>
      </div>

      <div className="absolute bottom-3 right-3 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 backdrop-blur">
        <span>INTERACTIVE ROTATION · 60 FPS</span>
      </div>
    </div>
  );
};
