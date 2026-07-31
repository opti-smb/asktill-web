import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import styles from "./HeroScene.module.css";

type SceneProps = { scrollProgress?: number };

function StatementStack() {
  const group = useRef<THREE.Group>(null);
  const cards = useMemo(
    () => [
      { y: 0.28, z: -0.12, rot: -0.18, color: "#1e3a6e", label: "BANK" },
      { y: 0.05, z: 0.02, rot: 0.08, color: "#164a3a", label: "POS" },
      { y: -0.2, z: 0.16, rot: -0.05, color: "#3a2a12", label: "ECOM" },
    ],
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.35) * 0.2;
    group.current.position.y = Math.sin(t * 0.6) * 0.06;
  });

  return (
    <Float speed={1.4} floatIntensity={0.35} rotationIntensity={0.15}>
      <group ref={group} position={[-1.55, 0.35, 0.2]}>
        {cards.map((c) => (
          <group key={c.label} position={[0, c.y, c.z]} rotation={[0.2, c.rot, 0.08]}>
            <RoundedBox args={[1.15, 0.72, 0.06]} radius={0.06} smoothness={4}>
              <meshStandardMaterial
                color={c.color}
                metalness={0.55}
                roughness={0.25}
                emissive={c.color}
                emissiveIntensity={0.35}
              />
            </RoundedBox>
            <mesh position={[-0.28, 0.18, 0.04]}>
              <boxGeometry args={[0.28, 0.16, 0.02]} />
              <meshStandardMaterial
                color="#7cffb2"
                emissive="#7cffb2"
                emissiveIntensity={0.9}
              />
            </mesh>
            <mesh position={[0.12, -0.05, 0.04]}>
              <boxGeometry args={[0.7, 0.06, 0.015]} />
              <meshStandardMaterial color="#9ec0ff" transparent opacity={0.7} />
            </mesh>
            <mesh position={[0.05, -0.18, 0.04]}>
              <boxGeometry args={[0.55, 0.05, 0.015]} />
              <meshStandardMaterial color="#5b8cff" transparent opacity={0.55} />
            </mesh>
          </group>
        ))}
      </group>
    </Float>
  );
}

function CashBars() {
  const group = useRef<THREE.Group>(null);
  const heights = useMemo(() => [0.55, 0.95, 0.7, 1.35, 0.9, 1.2, 0.65], []);
  const colors = ["#5b8cff", "#7cffb2", "#5b8cff", "#7cffb2", "#ffc857", "#7cffb2", "#ff6b4a"];

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = 0.25 + Math.sin(t * 0.4) * 0.12;
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const base = heights[i] ?? 0.8;
      const pulse = 0.1 * Math.sin(t * 2.2 + i * 0.55);
      const h = base + pulse;
      mesh.scale.y = h;
      mesh.position.y = h / 2;
    });
  });

  return (
    <Float speed={1.2} floatIntensity={0.25} rotationIntensity={0.1}>
      <group ref={group} position={[0.15, -0.55, 0.4]}>
        <RoundedBox args={[2.6, 0.08, 1.1]} radius={0.04} position={[0, -0.02, 0]}>
          <meshStandardMaterial
            color="#0e2248"
            metalness={0.6}
            roughness={0.3}
            emissive="#1e4dff"
            emissiveIntensity={0.2}
          />
        </RoundedBox>
        {heights.map((_, i) => (
          <mesh key={i} position={[(i - 3) * 0.32, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 1, 0.22]} />
            <meshStandardMaterial
              color={colors[i]}
              emissive={colors[i]}
              emissiveIntensity={0.65}
              metalness={0.4}
              roughness={0.18}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function LetterPlate() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = -0.2 + Math.sin(t * 0.5) * 0.05;
    ref.current.rotation.y = -0.35 + Math.sin(t * 0.35) * 0.08;
    ref.current.position.y = 0.55 + Math.sin(t * 0.7) * 0.08;
  });

  return (
    <Float speed={1.5} floatIntensity={0.4} rotationIntensity={0.2}>
      <group ref={ref} position={[1.35, 0.55, 0.15]}>
        <RoundedBox args={[1.55, 1.95, 0.08]} radius={0.08} smoothness={6}>
          <meshStandardMaterial
            color="#f4f6f9"
            metalness={0.15}
            roughness={0.35}
          />
        </RoundedBox>
        <RoundedBox args={[1.55, 0.42, 0.09]} radius={0.08} position={[0, 0.76, 0.01]}>
          <meshStandardMaterial
            color="#1b2a4a"
            emissive="#2f5bff"
            emissiveIntensity={0.25}
            metalness={0.4}
            roughness={0.3}
          />
        </RoundedBox>
        {[0.35, 0.15, -0.05, -0.25].map((y, i) => (
          <mesh key={y} position={[0, y, 0.05]}>
            <boxGeometry args={[1.15 - i * 0.08, 0.07, 0.02]} />
            <meshStandardMaterial color="#c5d0e0" />
          </mesh>
        ))}
        <mesh position={[0.35, -0.55, 0.06]}>
          <boxGeometry args={[0.55, 0.14, 0.03]} />
          <meshStandardMaterial
            color="#7cffb2"
            emissive="#7cffb2"
            emissiveIntensity={1.1}
          />
        </mesh>
      </group>
    </Float>
  );
}

function RewardCoins() {
  const group = useRef<THREE.Group>(null);
  const coins = useMemo(
    () => [
      { p: [1.7, -0.35, 0.7] as const, c: "#f5c451", s: 1.1 },
      { p: [1.35, -0.7, 0.95] as const, c: "#7cffb2", s: 0.85 },
      { p: [2.0, -0.6, 0.55] as const, c: "#5b8cff", s: 0.75 },
      { p: [1.55, -0.15, 1.05] as const, c: "#ffc857", s: 0.65 },
    ],
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      child.rotation.y = t * (1.2 + i * 0.25);
      child.rotation.x = Math.sin(t * 0.8 + i) * 0.25;
      child.position.y = coins[i].p[1] + Math.sin(t * 1.5 + i) * 0.08;
    });
  });

  return (
    <group ref={group}>
      {coins.map((coin) => (
        <mesh key={coin.c + coin.p.join()} position={coin.p} castShadow>
          <cylinderGeometry args={[0.18 * coin.s, 0.18 * coin.s, 0.04, 40]} />
          <meshStandardMaterial
            color={coin.c}
            metalness={0.9}
            roughness={0.15}
            emissive={coin.c}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

function OrbitRings() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = t * 0.12;
    ref.current.rotation.x = 0.45 + Math.sin(t * 0.2) * 0.06;
  });

  return (
    <group ref={ref} position={[0.2, 0.1, -0.8]}>
      <mesh>
        <torusGeometry args={[2.35, 0.022, 16, 120]} />
        <meshStandardMaterial
          color="#5b8cff"
          emissive="#5b8cff"
          emissiveIntensity={0.85}
          transparent
          opacity={0.65}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.3, 0.35, 0]}>
        <torusGeometry args={[1.75, 0.018, 16, 100]} />
        <meshStandardMaterial
          color="#7cffb2"
          emissive="#7cffb2"
          emissiveIntensity={0.95}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh rotation={[1.1, -0.4, 0.3]}>
        <torusGeometry args={[2.9, 0.012, 12, 100]} />
        <meshStandardMaterial
          color="#ffc857"
          emissive="#ffc857"
          emissiveIntensity={0.55}
          transparent
          opacity={0.35}
        />
      </mesh>
    </group>
  );
}

function Orbs() {
  const ref = useRef<THREE.Group>(null);
  const orbs = useMemo(
    () => [
      { pos: [-2.1, 1.2, -0.5] as const, color: "#7cffb2", s: 0.26 },
      { pos: [2.15, 0.95, -0.8] as const, color: "#5b8cff", s: 0.32 },
      { pos: [1.7, -1.15, 0.4] as const, color: "#ff6b4a", s: 0.2 },
      { pos: [-1.7, -0.95, 0.15] as const, color: "#ffc857", s: 0.18 },
      { pos: [0.35, 1.55, -1.2] as const, color: "#9ec0ff", s: 0.12 },
    ],
    [],
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.15;
    ref.current.children.forEach((child, i) => {
      child.position.y += Math.sin(t * 1.5 + i) * 0.0012;
    });
  });

  return (
    <group ref={ref}>
      {orbs.map((o) => (
        <mesh key={o.color + o.pos.join()} position={o.pos}>
          <sphereGeometry args={[o.s, 32, 32]} />
          <meshStandardMaterial
            color={o.color}
            emissive={o.color}
            emissiveIntensity={0.9}
            metalness={0.25}
            roughness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

function Particles() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 5.5;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.y = state.clock.elapsedTime * 0.05;
    points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.04;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.032} color="#b8d4ff" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function SceneContent() {
  return (
    <>
      <fog attach="fog" args={["#06101f", 9, 18]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 7, 4]} intensity={1.55} />
      <pointLight position={[2.2, 2, 3]} intensity={2.3} color="#7cffb2" />
      <pointLight position={[-2.2, 1.2, 2]} intensity={1.9} color="#5b8cff" />
      <pointLight position={[0.5, -2, 2.2]} intensity={1.15} color="#ffc857" />

      <group position={[0.35, 0.05, 0]} scale={1.12}>
        <OrbitRings />
        <StatementStack />
        <CashBars />
        <LetterPlate />
        <RewardCoins />
        <Orbs />
        <Particles />
      </group>
    </>
  );
}

export default function HeroScene(_props: SceneProps) {
  return (
    <div className={styles.root}>
      <div className={styles.cssMotion} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobA}`} />
        <span className={`${styles.blob} ${styles.blobB}`} />
        <span className={`${styles.blob} ${styles.blobC}`} />
      </div>

      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [1.55, 0.3, 4.6], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
