import { useMemo } from "react";
import {
  DEFAULT_TABLE_HEIGHT,
  LEG_FINISHES,
  LEG_STYLES,
  SHAPES,
  SIZES,
  TOP_COLORS,
  TOP_RANGES,
} from "../config/options";
import { useConfigStore } from "../store/useConfigStore";
import { Tabletop } from "./Tabletop";
import { Legs } from "./Legs";

// Measured against the real product photos (edge-thickness/diameter ratio),
// cross-checked against typical solid-top tulip table proportions.
const TOP_THICKNESS = 0.05; // meters (5cm)

export function TableModel() {
  const { shapeId, sizeId, topRangeId, topColorId, legStyleId, legFinishId } = useConfigStore();

  const size = useMemo(() => SIZES.find((s) => s.id === sizeId)!, [sizeId]);
  const topRange = useMemo(
    () => TOP_RANGES.find((r) => r.id === topRangeId)!,
    [topRangeId]
  );
  const topColor = useMemo(
    () => TOP_COLORS.find((c) => c.id === topColorId)!,
    [topColorId]
  );
  const legFinish = useMemo(
    () => LEG_FINISHES.find((f) => f.id === legFinishId)!,
    [legFinishId]
  );
  const legStyle = useMemo(
    () => LEG_STYLES.find((l) => l.id === legStyleId)!,
    [legStyleId]
  );

  const lengthM = size.length / 100;
  const widthM = size.width / 100;
  const tableHeightM = DEFAULT_TABLE_HEIGHT / 100;
  const topY = tableHeightM - TOP_THICKNESS / 2;

  return (
    <group position={[0, 0, 0]}>
      <Tabletop
        shapeId={shapeId}
        edgeStyle={topRange.edgeStyle}
        length={lengthM}
        width={widthM}
        thickness={TOP_THICKNESS}
        color={topColor.color}
        roughness={topColor.roughness}
        metalness={topColor.metalness}
        y={topY}
        image={topColor.image}
      />
      <Legs
        renderStyle={legStyle.renderStyle}
        length={lengthM}
        width={widthM}
        tableHeight={tableHeightM}
        topThickness={TOP_THICKNESS}
        color={legFinish.color}
        roughness={legFinish.roughness}
        metalness={legFinish.metalness}
        image={legStyle.textureImage}
      />
    </group>
  );
}

export const shapeLabel = (id: string) => SHAPES.find((s) => s.id === id)?.label ?? "";
export const legStyleLabel = (id: string) => LEG_STYLES.find((s) => s.id === id)?.label ?? "";
