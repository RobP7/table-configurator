import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { TableModel } from "./TableModel";

function Loader() {
  return (
    <Html center>
      <div className="loader-pill">Loading table…</div>
    </Html>
  );
}

export function Scene() {
  return (
    <Canvas shadows dpr={[1, 2]} className="scene-canvas">
      <color attach="background" args={["#eef0ef"]} />
      <PerspectiveCamera makeDefault position={[2.6, 1.6, 2.6]} fov={35} />
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        position={[3, 4, 2]}
        intensity={1.4}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} />

      <Suspense fallback={<Loader />}>
        <TableModel />
        <Environment preset="apartment" />
      </Suspense>

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.55}
        scale={6}
        blur={2.2}
        far={2}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.4}
        maxDistance={5}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.49}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0.4, 0]}
      />
    </Canvas>
  );
}
