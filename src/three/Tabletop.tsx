import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  DoubleSide,
  ExtrudeGeometry,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  type BufferGeometry,
} from "three";
import type { ShapeId, TopEdgeStyle } from "../config/options";

interface TabletopProps {
  shapeId: ShapeId;
  edgeStyle: TopEdgeStyle;
  length: number; // meters
  width: number; // meters
  thickness: number; // meters
  color: string;
  roughness: number;
  metalness: number;
  y: number;
  image?: string; // real swatch/finish photo — textured onto the top surface
}

// Extrudes a flat 2D outline into a slab centered on the origin, with the
// extrusion depth becoming the vertical (Y) axis.
function extrudeFlat(shape: Shape, thickness: number, extraOptions?: object): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    // 48, not 1 — curveSegments tessellates curved portions of the outline
    // (full circles for round/oval tops, corner fillets for rectangular).
    // 1 segment degenerates a circle into a malformed sliver.
    curveSegments: 48,
    ...extraOptions,
  });
  geometry.translate(0, 0, -thickness / 2);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function rectangleShape(length: number, width: number): Shape {
  const halfL = length / 2;
  const halfW = width / 2;
  const shape = new Shape();
  shape.moveTo(-halfL, -halfW);
  shape.lineTo(halfL, -halfW);
  shape.lineTo(halfL, halfW);
  shape.lineTo(-halfL, halfW);
  shape.closePath();
  return shape;
}

// Natural "live edge" (Baumkante) — long sides undulate like a tree's
// natural edge, short ends stay straight.
function treeEdgeShape(length: number, width: number): Shape {
  const halfL = length / 2;
  const halfW = width / 2;
  const segments = 20;
  const amp = Math.min(width * 0.05, 0.02);

  const wavyEdge = (dir: 1 | -1): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = -halfL + length * t;
      const wobble =
        (Math.sin(t * Math.PI * 4.3 + dir * 2) * 0.6 + Math.sin(t * Math.PI * 9 + dir) * 0.4) *
        amp;
      pts.push([x, dir * halfW + wobble]);
    }
    return pts;
  };

  const back = wavyEdge(-1);
  const front = wavyEdge(1).reverse();

  const shape = new Shape();
  shape.moveTo(back[0][0], back[0][1]);
  back.slice(1).forEach(([x, z]) => shape.lineTo(x, z));
  front.forEach(([x, z]) => shape.lineTo(x, z));
  shape.closePath();
  return shape;
}

// Organic asymmetric "pebble" silhouette (Chalet Kieselform).
function pebbleShape(length: number, width: number): Shape {
  const rx = length / 2;
  const ry = width / 2;
  const segments = 20;
  const shape = new Shape();
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const wobble = 1 + 0.13 * Math.sin(t * 3 + 1.3) + 0.07 * Math.sin(t * 5 + 0.6);
    const x = Math.cos(t) * rx * wobble;
    const y = Math.sin(t) * ry * wobble;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function useRectangularGeometry(
  edgeStyle: TopEdgeStyle,
  length: number,
  width: number,
  thickness: number
): BufferGeometry {
  return useMemo(() => {
    if (edgeStyle === "tree") {
      return extrudeFlat(treeEdgeShape(length, width), thickness);
    }
    if (edgeStyle === "chamfer") {
      const bevelSize = Math.min(thickness * 0.9, Math.min(length, width) * 0.08);
      const depth = Math.max(thickness - bevelSize * 2, thickness * 0.4);
      return extrudeFlat(rectangleShape(length, width), depth, {
        bevelEnabled: true,
        bevelThickness: bevelSize,
        bevelSize,
        bevelSegments: 1,
      });
    }
    // straight / bevel / roundedCorners: sharp box (bevel + roundedCorners
    // get their soft look from the corner radius applied via a rounded rect
    // outline, since RoundedBox can't carry a per-shape outline).
    const halfL = length / 2;
    const halfW = width / 2;
    const radius =
      edgeStyle === "roundedCorners"
        ? Math.min(length, width) * 0.12
        : edgeStyle === "bevel"
          ? Math.min(length, width) * 0.03
          : 0;
    if (radius === 0) {
      return extrudeFlat(rectangleShape(length, width), thickness);
    }
    const shape = new Shape();
    shape.moveTo(-halfL + radius, -halfW);
    shape.lineTo(halfL - radius, -halfW);
    shape.quadraticCurveTo(halfL, -halfW, halfL, -halfW + radius);
    shape.lineTo(halfL, halfW - radius);
    shape.quadraticCurveTo(halfL, halfW, halfL - radius, halfW);
    shape.lineTo(-halfL + radius, halfW);
    shape.quadraticCurveTo(-halfL, halfW, -halfL, halfW - radius);
    shape.lineTo(-halfL, -halfW + radius);
    shape.quadraticCurveTo(-halfL, -halfW, -halfL + radius, -halfW);
    shape.closePath();
    return extrudeFlat(shape, thickness);
  }, [edgeStyle, length, width, thickness]);
}

function useRoundGeometry(
  shapeId: "oval" | "round",
  edgeStyle: TopEdgeStyle,
  length: number,
  width: number,
  thickness: number
): BufferGeometry {
  return useMemo(() => {
    if (edgeStyle === "pebble") {
      return extrudeFlat(pebbleShape(length, width), thickness);
    }
    const radius = width / 2;
    const scaleX = shapeId === "oval" ? length / width : 1;
    const shape = new Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const geometry = extrudeFlat(shape, thickness);
    geometry.scale(scaleX, 1, 1);
    return geometry;
  }, [shapeId, edgeStyle, length, width, thickness]);
}

function TopSurfacePhoto({
  shapeId,
  edgeStyle,
  length,
  width,
  y,
  image,
}: {
  shapeId: ShapeId;
  edgeStyle: TopEdgeStyle;
  length: number;
  width: number;
  y: number;
  image: string;
}) {
  const texture = useTexture(image);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(Math.max(length / width, 1), 1);
    texture.needsUpdate = true;
  }, [texture, length, width]);

  // Inset slightly on organic/live edges so the photo doesn't overflow past
  // the irregular silhouette, leaving a thin rim of the base wood color.
  const inset = edgeStyle === "tree" || edgeStyle === "pebble" ? 0.94 : 1;
  const overlayLength = length * inset;
  const overlayWidth = width * inset;

  if (shapeId === "round" || shapeId === "oval") {
    const radius = overlayWidth / 2;
    const scaleX = shapeId === "oval" ? overlayLength / overlayWidth : 1;
    return (
      <mesh position={[0, y, 0]} scale={[scaleX, 1, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial map={texture} roughness={0.7} side={DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[overlayLength, overlayWidth]} />
      <meshStandardMaterial map={texture} roughness={0.7} side={DoubleSide} />
    </mesh>
  );
}

export function Tabletop({
  shapeId,
  edgeStyle,
  length,
  width,
  thickness,
  color,
  roughness,
  metalness,
  y,
  image,
}: TabletopProps) {
  // DoubleSide guards against any extrusion winding producing a normal that
  // faces away from the camera — the slab stays visible from every angle
  // regardless of the underlying shape's winding direction.
  const material = (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      side={DoubleSide}
    />
  );

  // Both geometry hooks always run (rules of hooks) — the inactive branch
  // gets safe non-zero placeholder dimensions since a zero-size Shape can
  // produce a degenerate/invalid geometry. Only the active one is rendered.
  const rectGeometry = useRectangularGeometry(
    edgeStyle,
    shapeId === "rectangular" ? length : 1,
    shapeId === "rectangular" ? width : 1,
    thickness
  );
  const roundGeometry = useRoundGeometry(
    shapeId === "round" ? "round" : "oval",
    edgeStyle,
    shapeId !== "rectangular" ? length : 1,
    shapeId !== "rectangular" ? width : 1,
    thickness
  );

  const geometry = shapeId === "rectangular" ? rectGeometry : roundGeometry;
  const topSurfaceY = useMemo(() => y + thickness / 2 + 0.0015, [y, thickness]);

  return (
    <group>
      <mesh geometry={geometry} position={[0, y, 0]} castShadow receiveShadow>
        {material}
      </mesh>
      {image && (
        <TopSurfacePhoto
          shapeId={shapeId}
          edgeStyle={edgeStyle}
          length={length}
          width={width}
          y={topSurfaceY}
          image={image}
        />
      )}
    </group>
  );
}
