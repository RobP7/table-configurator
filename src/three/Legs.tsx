import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { LatheGeometry, Quaternion, RepeatWrapping, SRGBColorSpace, Vector2, Vector3 } from "three";
import type { LegRenderStyle } from "../config/options";

interface LegMaterialProps {
  color: string;
  roughness: number;
  metalness: number;
}

interface LegsProps extends LegMaterialProps {
  renderStyle: LegRenderStyle;
  length: number; // meters
  width: number; // meters
  tableHeight: number; // meters
  topThickness: number; // meters
  image?: string; // real leg photo — texture-mapped on styles that support it
}

// Wraps the real leg photo around a beam's cylindrical surface — the
// default cylinder UV (U = around the circumference, V = along the
// length) tiles cleanly, unlike trying to wrap a photo around the
// irregular rectangular tabletop edge.
function TexturedBeamMaterial({
  image,
  len,
  radius,
  roughness,
  metalness,
}: {
  image: string;
  len: number;
  radius: number;
  roughness: number;
  metalness: number;
}) {
  const texture = useTexture(image);
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    // Tile roughly square-ish patches around the beam rather than one
    // giant stretched image.
    const circumference = Math.PI * 2 * radius;
    texture.repeat.set(Math.max(circumference / 0.05, 2), Math.max(len / 0.05, 1));
    texture.needsUpdate = true;
  }, [texture, len, radius]);

  return <meshStandardMaterial map={texture} roughness={roughness} metalness={metalness} />;
}

function TexturedPlateMaterial({
  image,
  plateLength,
  plateWidth,
  roughness,
  metalness,
}: {
  image: string;
  plateLength: number;
  plateWidth: number;
  roughness: number;
  metalness: number;
}) {
  const texture = useTexture(image);
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(Math.max(plateLength / 0.12, 2), Math.max(plateWidth / 0.12, 1));
    texture.needsUpdate = true;
  }, [texture, plateLength, plateWidth]);

  return <meshStandardMaterial map={texture} roughness={roughness} metalness={metalness} />;
}

function Beam({
  x,
  y0,
  z0,
  y1,
  z1,
  radius,
  color,
  roughness,
  metalness,
  image,
}: LegMaterialProps & {
  x: number;
  y0: number;
  z0: number;
  y1: number;
  z1: number;
  radius: number;
  image?: string;
}) {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.sqrt(dy * dy + dz * dz);
  const angle = Math.atan2(dz, dy);
  const midY = (y0 + y1) / 2;
  const midZ = (z0 + z1) / 2;

  return (
    <mesh position={[x, midY, midZ]} rotation={[angle, 0, 0]} castShadow>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      {image ? (
        <TexturedBeamMaterial image={image} len={len} radius={radius} roughness={roughness} metalness={metalness} />
      ) : (
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      )}
    </mesh>
  );
}

// General beam between two arbitrary 3D points — needed for "spider" hub legs,
// which radiate diagonally (varying x and z at once), unlike Beam's per-end legs.
function Leg3D({
  from,
  to,
  radius,
  color,
  roughness,
  metalness,
}: LegMaterialProps & {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
}) {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = new Vector3().subVectors(end, start);
  const length = direction.length();
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
  const quaternion = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize()
  );

  return (
    <mesh position={mid} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

export function Legs({
  renderStyle,
  length,
  width,
  tableHeight,
  topThickness,
  color,
  roughness,
  metalness,
  image,
}: LegsProps) {
  const legHeight = tableHeight - topThickness;
  const inset = 0.08;
  const halfL = Math.max(length / 2 - inset, 0.15);
  const halfW = Math.max(width / 2 - inset, 0.15);
  const mat: LegMaterialProps = { color, roughness, metalness };
  const sides: number[] = [-halfL, halfL];

  // Called unconditionally (rules of hooks) even though only the "pedestal"
  // branch below uses it — a smooth curved trumpet/tulip profile revolved
  // around the vertical axis, not stacked flat discs.
  const pedestalGeometry = useMemo(() => {
    const H = legHeight;
    const points = [
      new Vector2(0.3, 0),
      new Vector2(0.29, 0.015),
      new Vector2(0.2, H * 0.085),
      new Vector2(0.11, H * 0.18),
      new Vector2(0.065, H * 0.34),
      new Vector2(0.048, H * 0.48),
      new Vector2(0.044, H * 0.58),
      new Vector2(0.05, H * 0.7),
      new Vector2(0.075, H * 0.82),
      new Vector2(0.12, H * 0.93),
      new Vector2(0.165, H),
    ];
    return new LatheGeometry(points, 48);
  }, [legHeight]);

  if (renderStyle === "uframe") {
    const barRadius = 0.025;
    return (
      <group>
        {sides.map((x, i) => (
          <group key={i}>
            <Beam x={x} y0={0} z0={-halfW} y1={legHeight} z1={-halfW} radius={barRadius} {...mat} />
            <Beam x={x} y0={0} z0={halfW} y1={legHeight} z1={halfW} radius={barRadius} {...mat} />
            <Beam x={x} y0={0} z0={-halfW} y1={0} z1={halfW} radius={barRadius} {...mat} />
          </group>
        ))}
      </group>
    );
  }

  if (renderStyle === "xframe") {
    const barRadius = 0.02;
    return (
      <group>
        {sides.map((x, i) => (
          <group key={i}>
            <Beam x={x} y0={legHeight} z0={-halfW} y1={0} z1={halfW} radius={barRadius} {...mat} />
            <Beam x={x} y0={legHeight} z0={halfW} y1={0} z1={-halfW} radius={barRadius} {...mat} />
            <Beam
              x={x}
              y0={legHeight * 0.08}
              z0={-halfW}
              y1={legHeight * 0.08}
              z1={halfW}
              radius={barRadius * 0.8}
              {...mat}
            />
          </group>
        ))}
      </group>
    );
  }

  if (renderStyle === "aframe") {
    const barRadius = 0.022;
    return (
      <group>
        {sides.map((x, i) => (
          <group key={i}>
            <Beam x={x} y0={legHeight} z0={0} y1={0} z1={-halfW} radius={barRadius} {...mat} />
            <Beam x={x} y0={legHeight} z0={0} y1={0} z1={halfW} radius={barRadius} {...mat} />
            <Beam
              x={x}
              y0={legHeight * 0.42}
              z0={-halfW * 0.45}
              y1={legHeight * 0.42}
              z1={halfW * 0.45}
              radius={barRadius * 0.75}
              {...mat}
            />
          </group>
        ))}
      </group>
    );
  }

  if (renderStyle === "trapez") {
    const barRadius = 0.025;
    const topHalfW = halfW * 0.55;
    return (
      <group>
        {sides.map((x, i) => (
          <group key={i}>
            <Beam x={x} y0={legHeight} z0={-topHalfW} y1={0} z1={-halfW} radius={barRadius} {...mat} />
            <Beam x={x} y0={legHeight} z0={topHalfW} y1={0} z1={halfW} radius={barRadius} {...mat} />
            <Beam x={x} y0={0} z0={-halfW} y1={0} z1={halfW} radius={barRadius} {...mat} />
          </group>
        ))}
      </group>
    );
  }

  if (renderStyle === "hframe") {
    const barRadius = 0.024;
    return (
      <group>
        {sides.map((x, i) => (
          <group key={i}>
            <Beam x={x} y0={0} z0={-halfW} y1={legHeight} z1={-halfW} radius={barRadius} {...mat} />
            <Beam x={x} y0={0} z0={halfW} y1={legHeight} z1={halfW} radius={barRadius} {...mat} />
            <Beam
              x={x}
              y0={legHeight * 0.5}
              z0={-halfW}
              y1={legHeight * 0.5}
              z1={halfW}
              radius={barRadius * 0.85}
              {...mat}
            />
          </group>
        ))}
      </group>
    );
  }

  if (renderStyle === "tempel") {
    const barRadius = 0.022;
    const posts = [-halfW, 0, halfW];
    return (
      <group>
        {sides.map((x, i) => (
          <group key={i}>
            {posts.map((z, j) => (
              <Beam key={j} x={x} y0={0} z0={z} y1={legHeight} z1={z} radius={barRadius} {...mat} />
            ))}
            <Beam
              x={x}
              y0={legHeight - 0.02}
              z0={-halfW}
              y1={legHeight - 0.02}
              z1={halfW}
              radius={barRadius * 0.8}
              {...mat}
            />
          </group>
        ))}
      </group>
    );
  }

  if (renderStyle === "trestle") {
    const barRadius = 0.03;
    const trestleSides: number[] = [-halfL + 0.1, halfL - 0.1];
    const footSpan = halfW * 0.9;
    return (
      <group>
        {trestleSides.map((x, i) => (
          <group key={i}>
            <Beam x={x} y0={legHeight} z0={0} y1={0} z1={-footSpan} radius={barRadius} {...mat} />
            <Beam x={x} y0={legHeight} z0={0} y1={0} z1={footSpan} radius={barRadius} {...mat} />
            <Beam x={x} y0={legHeight * 0.7} z0={-footSpan * 0.5} y1={legHeight * 0.7} z1={footSpan * 0.5} radius={barRadius * 0.7} {...mat} />
          </group>
        ))}
        <mesh
          position={[0, legHeight - 0.02, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.03, 0.03, trestleSides[1] - trestleSides[0], 12]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      </group>
    );
  }

  if (renderStyle === "spider") {
    const barRadius = 0.028;
    const apex: [number, number, number] = [0, legHeight, 0];
    const spanL = Math.min(halfL * 0.4, 0.5);
    const spanW = halfW * 0.85;
    const feet: [number, number, number][] = [
      [-spanL, 0, -spanW],
      [-spanL, 0, spanW],
      [spanL, 0, -spanW],
      [spanL, 0, spanW],
    ];
    return (
      <group>
        {feet.map((foot, i) => (
          <Leg3D key={i} from={apex} to={foot} radius={barRadius} {...mat} />
        ))}
        <mesh position={[0, legHeight - 0.015, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      </group>
    );
  }

  const columnRadius = 0.045;

  if (renderStyle === "tripleX") {
    // Three X-crosses standing on one shared steel base plate, centered
    // under the table rather than at the two ends (unlike "xframe", which
    // is two separate X legs with no connecting plate).
    const barRadius = 0.02;
    const plateThickness = 0.02;
    const xSpan = Math.min(halfL * 0.9, halfL - 0.05);
    const xPositions = [-xSpan * 0.55, 0, xSpan * 0.55];
    const footZ = Math.min(halfW * 0.8, halfW - 0.05);
    const plateLength = xSpan * 1.25;
    const plateWidth = footZ * 2 * 1.05;

    return (
      <group>
        <mesh position={[0, plateThickness / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[plateLength, plateThickness, plateWidth]} />
          {image ? (
            <TexturedPlateMaterial
              image={image}
              plateLength={plateLength}
              plateWidth={plateWidth}
              roughness={roughness}
              metalness={metalness}
            />
          ) : (
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          )}
        </mesh>
        {xPositions.map((x, i) => (
          <group key={i}>
            <Beam x={x} y0={legHeight} z0={-footZ} y1={plateThickness} z1={footZ} radius={barRadius} image={image} {...mat} />
            <Beam x={x} y0={legHeight} z0={footZ} y1={plateThickness} z1={-footZ} radius={barRadius} image={image} {...mat} />
          </group>
        ))}
      </group>
    );
  }

  if (renderStyle === "pedestal") {
    // Fixed base size regardless of table diameter — a single pedestal base
    // supports a small size range on the real product, only the top resizes.
    // Smooth curved trumpet/tulip profile (not stacked flat discs). LatheGeometry
    // doesn't cap its ends, so the top is capped explicitly — otherwise the
    // hollow opening lets the (double-sided) tabletop underside show through.
    return (
      <group>
        <mesh geometry={pedestalGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
        <mesh position={[0, legHeight - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <circleGeometry args={[0.165, 48]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      </group>
    );
  }

  // crossbase
  const footRadius = Math.min(halfW, halfL) * 0.55;
  const barLength = Math.min(halfW, halfL) * 1.7;
  return (
    <group>
      <mesh position={[0, legHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[columnRadius, columnRadius, legHeight, 24]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={[0, legHeight - 0.01, 0]} castShadow>
        <cylinderGeometry args={[footRadius * 0.7, footRadius * 0.7, 0.02, 32]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
      {[Math.PI / 4, -Math.PI / 4].map((rot, i) => (
        <mesh key={i} position={[0, 0.02, 0]} rotation={[0, rot, 0]} castShadow receiveShadow>
          <boxGeometry args={[barLength, 0.04, 0.08]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </mesh>
      ))}
    </group>
  );
}
