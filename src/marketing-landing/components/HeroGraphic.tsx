import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import styles from "./HeroGraphic.module.css";

function AnimatedBars() {
  const group = useRef<THREE.Group>(null);
  const heights = useMemo(() => [0.75, 1.2, 0.9, 1.65, 1.1, 1.4, 0.8], []);
  const colors = ["#5b8cff", "#7cffb2", "#5b8cff", "#7cffb2", "#ffc857", "#7cffb2", "#ff6b4a"];

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const base = heights[i] ?? 0.8;
      const pulse = 0.1 * Math.sin(t * 2 + i * 0.55);
      const h = base + pulse;
      mesh.scale.y = h;
      mesh.position.y = h / 2 - 0.05;
    });
  });

  return (
    <group ref={group} position={[0, -0.15, 0.55]}>
      {heights.map((_, i) => (
        <mesh key={i} position={[(i - 3) * 0.34, 0, 0]} castShadow>
          <boxGeometry args={[0.26, 1, 0.26]} />
          <meshStandardMaterial
            color={colors[i]}
            emissive={colors[i]}
            emissiveIntensity={0.55}
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function FinanceTray() {
  const card = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!card.current) return;
    const t = state.clock.elapsedTime;
    card.current.rotation.x = -0.22 + Math.sin(t * 0.4) * 0.05;
    card.current.rotation.y = 0.42 + Math.sin(t * 0.35) * 0.08;
    card.current.position.y = Math.sin(t * 0.65) * 0.08;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
      <group ref={card} scale={1.25}>
        <RoundedBox args={[2.9, 1.95, 0.1]} radius={0.14} smoothness={6} position={[0, 0, -0.05]}>
          <meshStandardMaterial
            color="#1a3fd4"
            emissive="#2f5bff"
            emissiveIntensity={0.45}
            metalness={0.35}
            roughness={0.35}
            transparent
            opacity={0.45}
          />
        </RoundedBox>

        <RoundedBox args={[2.6, 1.7, 0.16]} radius={0.12} smoothness={8} castShadow>
          <meshStandardMaterial
            color="#14306a"
            metalness={0.7}
            roughness={0.18}
            emissive="#1e4dff"
            emissiveIntensity={0.22}
          />
        </RoundedBox>

        <RoundedBox args={[2.35, 1.45, 0.05]} radius={0.1} position={[0, 0, 0.1]}>
          <meshStandardMaterial
            color="#0e2248"
            metalness={0.5}
            roughness={0.25}
            emissive="#0b1b3a"
            emissiveIntensity={0.35}
          />
        </RoundedBox>

        <mesh position={[-0.85, 0.42, 0.15]}>
          <boxGeometry args={[0.5, 0.34, 0.04]} />
          <meshStandardMaterial
            color="#ffc857"
            emissive="#ffb020"
            emissiveIntensity={0.4}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>

        <mesh position={[0.7, -0.48, 0.15]}>
          <boxGeometry args={[1.05, 0.1, 0.03]} />
          <meshStandardMaterial
            color="#7cffb2"
            emissive="#7cffb2"
            emissiveIntensity={1}
            metalness={0.3}
            roughness={0.25}
          />
        </mesh>

        <AnimatedBars />
      </group>
    </Float>
  );
}

function OrbitRings() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = t * 0.12;
    ref.current.rotation.x = 0.42 + Math.sin(t * 0.2) * 0.06;
  });

  return (
    <group ref={ref} position={[0.1, 0.05, -0.7]}>
      <mesh>
        <torusGeometry args={[2.3, 0.02, 16, 120]} />
        <meshStandardMaterial
          color="#5b8cff"
          emissive="#5b8cff"
          emissiveIntensity={0.7}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.35, 0.35, 0]}>
        <torusGeometry args={[1.7, 0.016, 16, 100]} />
        <meshStandardMaterial
          color="#7cffb2"
          emissive="#7cffb2"
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}

function Orbs() {
  const items = useMemo(
    () => [
      { p: [-1.9, 1.1, -0.3] as const, c: "#7cffb2", s: 0.22 },
      { p: [2.0, 0.9, -0.6] as const, c: "#5b8cff", s: 0.28 },
      { p: [1.55, -1.05, 0.35] as const, c: "#ff6b4a", s: 0.16 },
      { p: [-1.5, -0.9, 0.2] as const, c: "#ffc857", s: 0.15 },
    ],
    [],
  );
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.12;
  });

  return (
    <group ref={ref}>
      {items.map((o) => (
        <mesh key={o.c + o.p.join()} position={o.p}>
          <sphereGeometry args={[o.s, 28, 28]} />
          <meshStandardMaterial
            color={o.c}
            emissive={o.c}
            emissiveIntensity={0.75}
            metalness={0.25}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 4]} intensity={1.5} />
      <pointLight position={[2, 2, 3]} intensity={2} color="#7cffb2" />
      <pointLight position={[-2, 1, 2]} intensity={1.6} color="#5b8cff" />
      <group position={[0.2, 0.05, 0]} scale={1.2}>
        <OrbitRings />
        <FinanceTray />
        <Orbs />
        <Sparkles count={36} scale={[6, 4, 4]} size={2.2} speed={0.3} opacity={0.45} color="#b8d4ff" />
      </group>
    </>
  );
}

export default function HeroGraphic() {
  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [1.4, 0.25, 4.5], fov: 36 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <Scene />
        </Canvas>
      </div>
    </div>
  );
}
