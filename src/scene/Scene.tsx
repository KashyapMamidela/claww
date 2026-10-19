import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { attachOf, PLATES, smoothstep, store } from '../story';
import { plateFaceTexture } from './plateFace';

// The barbell, built from primitives at real-plate proportions. The bar lies
// along X. Plates seat outward from the collars; the left side mirrors the right.

const SHAFT_HALF = 1.6;
const SLEEVE_LEN = 1.05;
const SLEEVE_R = 0.11;
const HOLE_R = 0.118;
const COLLAR_W = 0.07;

const chrome = new THREE.MeshStandardMaterial({ color: '#eef1f4', metalness: 1, roughness: 0.2 });
const shaftMat = new THREE.MeshStandardMaterial({ color: '#d5dae0', metalness: 1, roughness: 0.42 });

/** A plate's cross-section turned on a lathe: raised hub, thinner face, full-width rounded rim. */
function plateGeometry(radius: number, thick: number) {
  const h = thick / 2;
  const face = h * 0.62;
  const hub = Math.min(0.2, radius * 0.45);
  const pts: [number, number][] = [
    [HOLE_R, -h],
    [hub, -h],
    [hub + 0.02, -face],
    [radius - 0.05, -face],
    [radius - 0.012, -h],
    [radius, -h * 0.55],
    [radius, h * 0.55],
    [radius - 0.012, h],
    [radius - 0.05, face],
    [hub + 0.02, face],
    [hub, h],
    [HOLE_R, h],
    [HOLE_R, -h],
  ];
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 96);
  g.rotateZ(-Math.PI / 2); // lathe axis Y -> bar axis X
  return g;
}

function useFontReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([document.fonts.load('900 80px Archivo'), document.fonts.ready]).finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** One plate on one side. `side` is +1 (right) or -1 (left). */
function PlateMesh({ index, side, seatX, fontReady }: { index: number; side: 1 | -1; seatX: number; fontReady: boolean }) {
  const p = PLATES[index];
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => plateGeometry(p.radius, p.thick), [p.radius, p.thick]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.62, metalness: 0.05 }), [p.color]);
  const face = useMemo(() => {
    if (!fontReady) return null;
    const inner = Math.min(0.2, p.radius * 0.45) + 0.02;
    return { tex: plateFaceTexture(p.kg, inner, p.radius - 0.05), inner, outer: p.radius - 0.05 };
  }, [fontReady, p.kg, p.radius]);
  const faceX = (p.thick / 2) * 0.62 + 0.0015;

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const a = attachOf(index, smoothPos.value);
    const off = (1 - a) * 3.2;
    g.position.x = side * (seatX + off);
    g.position.y = (1 - a) * 0.35;
    g.rotation.x = side * (1 - a) * 5.5;
    g.visible = a > 0.001;
  });

  return (
    <group ref={ref}>
      <mesh geometry={geo} material={mat} castShadow />
      {/* chrome hub insert */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={chrome}>
        <cylinderGeometry args={[HOLE_R + 0.045, HOLE_R + 0.045, p.thick + 0.004, 48, 1, true]} />
      </mesh>
      {face ? (
        <mesh position={[side * faceX, 0, 0]} rotation={[0, side * Math.PI / 2, 0]}>
          <ringGeometry args={[face.inner, face.outer, 96]} />
          <meshStandardMaterial map={face.tex} transparent roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ) : null}
    </group>
  );
}

/** The story position, smoothed once per frame and shared by everything in the scene. */
const smoothPos = { value: 0 };

function StorySmoother() {
  useFrame((_, dt) => {
    smoothPos.value = store.reducedMotion ? store.pos : THREE.MathUtils.damp(smoothPos.value, store.pos, 5, dt);
  });
  return null;
}

function Barbell({ offsetX, scale }: { offsetX: number; scale: number }) {
  const ref = useRef<THREE.Group>(null);
  const fontReady = useFontReady();

  const seats = useMemo(() => {
    let x = SHAFT_HALF + COLLAR_W + 0.004;
    return PLATES.map((p) => {
      const seat = x + p.thick / 2;
      x += p.thick + 0.006;
      return seat;
    });
  }, []);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const pos = smoothPos.value;
    const t = state.clock.elapsedTime;
    const idle = store.reducedMotion ? 0 : Math.sin(t * 0.5) * 0.025;
    const targetY = -0.38 + pos * 0.1 + store.pointerX * 0.06;
    const targetX = 0.12 + idle - store.pointerY * 0.04;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, dt);
    // at the finale the bar lifts a little, like it has just been picked up
    g.position.y = smoothstep(4.3, 5, pos) * 0.18 + (store.reducedMotion ? 0 : Math.sin(t * 0.8) * 0.01);
  });

  return (
    <group position={[offsetX, 0, 0]} scale={scale}>
      <group ref={ref}>
        {/* shaft */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={shaftMat}>
          <cylinderGeometry args={[0.055, 0.055, SHAFT_HALF * 2, 48]} />
        </mesh>
        {[1, -1].map((side) => (
          <group key={side}>
            {/* collar */}
            <mesh position={[side * (SHAFT_HALF + COLLAR_W / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
              <cylinderGeometry args={[0.16, 0.16, COLLAR_W, 64]} />
            </mesh>
            {/* sleeve */}
            <mesh position={[side * (SHAFT_HALF + COLLAR_W + SLEEVE_LEN / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
              <cylinderGeometry args={[SLEEVE_R, SLEEVE_R, SLEEVE_LEN, 64]} />
            </mesh>
            {/* end cap */}
            <mesh position={[side * (SHAFT_HALF + COLLAR_W + SLEEVE_LEN + 0.01), 0, 0]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
              <cylinderGeometry args={[SLEEVE_R + 0.008, SLEEVE_R + 0.008, 0.02, 64]} />
            </mesh>
            {PLATES.map((_, i) => (
              <PlateMesh key={i} index={i} side={side as 1 | -1} seatX={seats[i]} fontReady={fontReady} />
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

/** Camera framing per chapter: wide on the empty bar, close on each plate as it goes on, wide again at the end. */
const SHOTS: { cam: [number, number, number]; look: [number, number, number] }[] = [
  { cam: [5.6, 1.5, 6.2], look: [0.9, -0.05, 0] }, // empty bar, receding diagonally away from the copy
  { cam: [5.0, 1.0, 2.7], look: [2.0, 0, 0] }, // the 15 kg plate goes on
  { cam: [4.3, 1.9, 3.2], look: [2.05, 0.05, 0] }, // recovery plate, from above
  { cam: [5.2, 0.35, 2.2], look: [2.1, 0, 0] }, // player plate, low and close
  { cam: [4.2, -0.35, 2.9], look: [2.2, 0.05, 0] }, // the small green plate, from below
  { cam: [6.4, 1.9, 7.2], look: [0.7, 0.1, 0] }, // the loaded bar
];

function CameraRig({ offsetX, distance }: { offsetX: number; distance: number }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(...SHOTS[0].look));
  const tmpCam = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  useFrame((_, dt) => {
    const pos = Math.min(SHOTS.length - 1, Math.max(0, smoothPos.value));
    const i = Math.min(SHOTS.length - 2, Math.floor(pos));
    const f = smoothstep(0, 1, pos - i);
    const a = SHOTS[i];
    const b = SHOTS[i + 1];
    tmpCam.set(...a.cam).lerp(new THREE.Vector3(...b.cam), f);
    tmpLook.set(...a.look).lerp(new THREE.Vector3(...b.look), f);
    // shots are authored for the desktop framing; on narrow screens pull the camera back along the same line
    tmpCam.sub(tmpLook).multiplyScalar(distance).add(tmpLook).add(new THREE.Vector3(offsetX, 0, 0));
    tmpLook.add(new THREE.Vector3(offsetX, 0, 0));
    const k = store.reducedMotion ? 1 : 1 - Math.exp(-4 * dt);
    camera.position.lerp(tmpCam, k);
    look.current.lerp(tmpLook, k);
    camera.lookAt(look.current);
  });
  return null;
}

/** Chalk dust hanging in the light. */
function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 420;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.3) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 7;
      arr[i * 3 + 2] = (Math.random() - 0.6) * 8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    if (!ref.current || store.reducedMotion) return;
    ref.current.rotation.y += dt * 0.012;
    ref.current.position.y = ((ref.current.position.y + dt * 0.03 + 1) % 2) - 1;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.018} color="#ffffff" transparent opacity={0.75} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Rig() {
  const { size, camera } = useThree();
  const narrow = size.width < 820;
  const aspect = size.width / Math.max(1, size.height);
  const offsetX = narrow ? -0.4 : 0.15;

  // Slide the rendered image into whatever space the copy leaves free: the right half on
  // wide screens, the top of the screen on phones (the copy sits on a panel at the bottom).
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (narrow) cam.setViewOffset(size.width, size.height, 0, size.height * 0.24, size.width, size.height);
    else cam.setViewOffset(size.width, size.height, -size.width * 0.2, 0, size.width, size.height);
    cam.updateProjectionMatrix();
  }, [camera, narrow, size.width, size.height]);

  // keep the whole bar in frame however narrow the screen is
  const distance = narrow ? Math.min(2.6, Math.max(1.3, 1.25 / aspect)) : aspect < 1.5 ? 1.25 : 1;
  return (
    <>
      <StorySmoother />
      <CameraRig offsetX={offsetX} distance={distance} />
      <Barbell offsetX={offsetX} scale={1} />
      <ContactShadows position={[offsetX, -0.78, 0]} opacity={0.32} scale={10} blur={2.8} far={2.2} color="#1A1D23" />
    </>
  );
}

export function Scene() {
  // Once the page covers the stage (the features section is opaque), stop rendering frames.
  const [live, setLive] = useState(true);
  useEffect(() => {
    const onStage = (e: Event) => setLive((e as CustomEvent<boolean>).detail);
    window.addEventListener('claww:stage', onStage);
    return () => window.removeEventListener('claww:stage', onStage);
  }, []);
  return (
    <Canvas frameloop={live ? 'always' : 'never'} dpr={[1, 2]} camera={{ fov: 30, position: [5.6, 1.5, 6.2], near: 0.1, far: 60 }} gl={{ antialias: true, alpha: true }} aria-hidden>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <directionalLight position={[-5, 2, -3]} intensity={0.35} color="#cfd8ff" />
      {/* Studio light, built in code (no HDR download): two long softboxes and a rim. */}
      <Environment resolution={256}>
        <color attach="background" args={['#cfd5dc']} />
        <Lightformer form="rect" intensity={2.4} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[10, 2.2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[5, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[6, 1.2, 1]} color="#dfe6ff" />
        <Lightformer form="ring" intensity={1.2} position={[0, -3, 3]} scale={3} />
      </Environment>
      <Rig />
      <Dust />
    </Canvas>
  );
}
