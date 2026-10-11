import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { GLOBAL_DISASTERS } from '../../data/globalDisasters';

// High-Density Global Continental Point Cloud
function GlobalContinentalParticles() {
  const [positions, colors] = useMemo(() => {
    const dotCount = 3000;
    const pos: number[] = [];
    const col: number[] = [];

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

        pos.push(x, y, z);
        const rnd = Math.random();
        const c = rnd > 0.6 ? cyanColor : (rnd > 0.2 ? deepBlueColor : emeraldColor);
        col.push(c.r, c.g, c.b);
      }
    }
    return [new Float32Array(pos), new Float32Array(col)];
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.015} vertexColors transparent opacity={0.88} />
    </points>
  );
}

// Global Disaster 3D Epicenter Pins
function GlobalDisasterPins() {
  const pinPositions = useMemo(() => {
    return GLOBAL_DISASTERS.map((spot) => {
      const phi = (90 - spot.lat) * (Math.PI / 180);
      const theta = (spot.lon + 180) * (Math.PI / 180);

      const r = 1.02;
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = (r * Math.sin(phi) * Math.sin(theta));
      const y = (r * Math.cos(phi));

      return {
        id: spot.id,
        country: spot.country,
        name: spot.name,
        severity: spot.severity,
        position: [x, y, z] as [number, number, number],
      };
    });
  }, []);

  return (
    <group>
      {pinPositions.map((pin) => (
        <group key={pin.id} position={pin.position}>
          <mesh>
            <sphereGeometry args={[0.02, 12, 12]} />
            <meshBasicMaterial
              color={pin.severity === 'Catastrophic' ? 0xef4444 : 0x06b6d4}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Sentinel-2 Polar Orbiting Satellite with Downlink Beam
function OrbitingSatellite() {
  const satRef = useRef<THREE.Group>(null);
  const orbitRadius = 1.48;
  const angleRef = useRef(0);

  const orbitPoints = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius * 0.94, 0, 2 * Math.PI, false, 0);
    const pts = curve.getPoints(100);
    return pts.map((p) => {
      const v = new THREE.Vector3(p.x, 0, p.y);
      v.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 3.8);
      v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 5.2);
      return v;
    });
  }, []);

  const [beamPoints, setBeamPoints] = React.useState<[THREE.Vector3, THREE.Vector3]>([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ]);

  useFrame((_, delta) => {
    angleRef.current += delta * 0.5;

    const satX = orbitRadius * Math.cos(angleRef.current);
    const satZ = (orbitRadius * 0.94) * Math.sin(angleRef.current);

    const satPos = new THREE.Vector3(satX, 0, satZ);
    satPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 3.8);
    satPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 5.2);

    if (satRef.current) {
      satRef.current.position.copy(satPos);
      satRef.current.lookAt(0, 0, 0);
    }

    const targetPos = satPos.clone().normalize().multiplyScalar(1.0);
    setBeamPoints([satPos, targetPos]);
  });

  return (
    <group>
      <Line
        points={orbitPoints}
        color="#38bdf8"
        lineWidth={1}
        dashed
        dashScale={50}
        dashSize={1}
        gapSize={1}
        transparent
        opacity={0.45}
      />
      <Line
        points={beamPoints}
        color="#22d3ee"
        lineWidth={1.5}
        transparent
        opacity={0.4}
      />
      <group ref={satRef}>
        <mesh>
          <boxGeometry args={[0.045, 0.022, 0.022]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[-0.068, 0, 0]}>
          <planeGeometry args={[0.09, 0.028]} />
          <meshBasicMaterial color="#0284c7" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.068, 0, 0]}>
          <planeGeometry args={[0.09, 0.028]} />
          <meshBasicMaterial color="#0284c7" side={THREE.DoubleSide} />
        </mesh>
        <pointLight color="#38bdf8" intensity={2} distance={1.0} />
      </group>
    </group>
  );
}

// Atmospheric Glow Mesh
function AtmosphericGlow() {
  const glowShader = useMemo(
    () => ({
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
    }),
    []
  );

  return (
    <Sphere args={[1.18, 32, 32]}>
      <shaderMaterial
        vertexShader={glowShader.vertexShader}
        fragmentShader={glowShader.fragmentShader}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
      />
    </Sphere>
  );
}

// Earth Globe Assembly
function EarthModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.35, 0, 0]}>
      <Sphere args={[1, 64, 64]}>
        <meshBasicMaterial color="#020712" transparent opacity={0.98} />
      </Sphere>
      <Sphere args={[1.002, 32, 18]}>
        <meshBasicMaterial color="#0284c7" wireframe transparent opacity={0.15} />
      </Sphere>
      <GlobalContinentalParticles />
      <GlobalDisasterPins />
      <OrbitingSatellite />
    </group>
  );
}

export const EarthCanvasR3F: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-full select-none cursor-grab active:cursor-grabbing ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 2.9], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <EarthModel />
        <AtmosphericGlow />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.5}
          dampingFactor={0.06}
        />
      </Canvas>

      <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-cyan-400/90 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>GLOBAL CONSTELLATION: SENTINEL-2A</span>
        </div>
        <p className="text-slate-400 text-[9px]">20 GLOBAL SITES · ALT: 786 KM · 10M GSD</p>
      </div>

      <div className="absolute bottom-3 right-3 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 backdrop-blur">
        <span>GLOBAL 3D ROTATION · 60 FPS</span>
      </div>
    </div>
  );
};
