import { create } from "zustand";
import {
  LEG_FINISHES,
  LEG_STYLES,
  SHAPES,
  SIZES,
  TOP_COLORS,
  TOP_RANGES,
  type LegStyleOption,
  type ShapeId,
  type TopColorOption,
  type TopRangeOption,
} from "../config/options";

function firstForShape<T extends { shapeId: ShapeId }>(list: T[], shapeId: ShapeId): T | undefined {
  return list.find((item) => item.shapeId === shapeId);
}

function legFits(leg: LegStyleOption, shapeId: ShapeId, sizeId: string): boolean {
  if (!leg.compatibleShapes.includes(shapeId)) return false;
  if (leg.compatibleSizes && !leg.compatibleSizes.includes(sizeId)) return false;
  return true;
}

function firstFittingLeg(shapeId: ShapeId, sizeId: string): LegStyleOption | undefined {
  return (
    LEG_STYLES.find((l) => legFits(l, shapeId, sizeId)) ??
    LEG_STYLES.find((l) => l.compatibleShapes.includes(shapeId))
  );
}

function legFinishFits(leg: LegStyleOption, finishId: string | null): boolean {
  const finish = LEG_FINISHES.find((f) => f.id === finishId);
  if (!finish || finish.material !== leg.material) return false;
  if (leg.compatibleFinishes && !leg.compatibleFinishes.includes(finishId!)) return false;
  return true;
}

function firstFittingFinish(leg: LegStyleOption): string {
  return (
    LEG_FINISHES.find((f) => legFinishFits(leg, f.id))?.id ??
    LEG_FINISHES.find((f) => f.material === leg.material)!.id
  );
}

function colorFits(color: TopColorOption, rangeId: string): boolean {
  return color.compatibleRanges.includes(rangeId);
}

function firstFittingColor(range: TopRangeOption): TopColorOption | undefined {
  return TOP_COLORS.find((c) => colorFits(c, range.id));
}

export interface LegChangeNotice {
  fromLabel: string;
  toLabel: string;
  reasonLabel: string;
}

interface ConfigState {
  shapeId: ShapeId;
  sizeId: string;
  // Null when the current shape has no product range yet — rectangular and
  // oval start out this way until a real range is added for them.
  topRangeId: string | null;
  topColorId: string | null;
  legStyleId: string | null;
  legFinishId: string | null;
  legChangeNotice: LegChangeNotice | null;
  setShape: (id: ShapeId) => void;
  setSize: (id: string) => void;
  setTopRange: (id: string) => void;
  setTopColor: (id: string) => void;
  setLegStyle: (id: string) => void;
  setLegFinish: (id: string) => void;
  dismissLegChangeNotice: () => void;
}

// Round is the only shape with a real range right now (The Mynd), so it's
// the default on load rather than SHAPES[0] (rectangular, which is empty).
const initialShape: ShapeId = "round";
const initialSizeId = firstForShape(SIZES, initialShape)!.id;
const initialTopRange = firstForShape(TOP_RANGES, initialShape);
const initialTopColor = initialTopRange ? firstFittingColor(initialTopRange) : undefined;
const initialLegStyle = firstFittingLeg(initialShape, initialSizeId);

export const useConfigStore = create<ConfigState>((set) => ({
  shapeId: initialShape,
  sizeId: initialSizeId,
  topRangeId: initialTopRange?.id ?? null,
  topColorId: initialTopColor?.id ?? null,
  legStyleId: initialLegStyle?.id ?? null,
  legFinishId: initialLegStyle ? firstFittingFinish(initialLegStyle) : null,
  legChangeNotice: null,

  setShape: (id) =>
    set((state) => {
      const size = SIZES.find((s) => s.id === state.sizeId)!;
      const shape = SHAPES.find((s) => s.id === id)!;
      const currentLeg = LEG_STYLES.find((l) => l.id === state.legStyleId);
      const currentColor = TOP_COLORS.find((c) => c.id === state.topColorId);

      const sizeId = size.shapeId === id ? state.sizeId : firstForShape(SIZES, id)!.id;

      const newTopRange = firstForShape(TOP_RANGES, id);
      const topColorId = newTopRange
        ? (currentColor && colorFits(currentColor, newTopRange.id)
            ? state.topColorId
            : firstFittingColor(newTopRange)?.id ?? null)
        : null;

      const legStillFits = currentLeg ? legFits(currentLeg, id, sizeId) : false;
      const newLegStyle = legStillFits ? currentLeg : firstFittingLeg(id, sizeId);
      const legFinishId = newLegStyle
        ? (legFinishFits(newLegStyle, state.legFinishId) ? state.legFinishId : firstFittingFinish(newLegStyle))
        : null;

      return {
        shapeId: id,
        sizeId,
        topRangeId: newTopRange?.id ?? null,
        topColorId,
        legStyleId: newLegStyle?.id ?? null,
        legFinishId,
        legChangeNotice:
          currentLeg && newLegStyle && !legStillFits
            ? {
                fromLabel: currentLeg.label,
                toLabel: newLegStyle.label,
                reasonLabel: `a ${shape.label} top`,
              }
            : null,
      };
    }),

  setSize: (id) =>
    set((state) => {
      const currentLeg = LEG_STYLES.find((l) => l.id === state.legStyleId);
      const legStillFits = currentLeg ? legFits(currentLeg, state.shapeId, id) : false;
      const newLegStyle = legStillFits ? currentLeg : firstFittingLeg(state.shapeId, id);
      const legFinishId = newLegStyle
        ? (legFinishFits(newLegStyle, state.legFinishId) ? state.legFinishId : firstFittingFinish(newLegStyle))
        : null;
      const size = SIZES.find((s) => s.id === id)!;

      return {
        sizeId: id,
        legStyleId: newLegStyle?.id ?? null,
        legFinishId,
        legChangeNotice:
          currentLeg && newLegStyle && !legStillFits
            ? {
                fromLabel: currentLeg.label,
                toLabel: newLegStyle.label,
                reasonLabel: size.label,
              }
            : null,
      };
    }),

  setTopRange: (id) =>
    set((state) => {
      const newRange = TOP_RANGES.find((r) => r.id === id)!;
      const currentColor = TOP_COLORS.find((c) => c.id === state.topColorId);
      const topColorId = currentColor && colorFits(currentColor, id)
        ? state.topColorId
        : firstFittingColor(newRange)?.id ?? null;
      return { topRangeId: id, topColorId };
    }),

  setTopColor: (id) => set({ topColorId: id }),
  dismissLegChangeNotice: () => set({ legChangeNotice: null }),

  setLegStyle: (id) =>
    set((state) => {
      const newLeg = LEG_STYLES.find((l) => l.id === id)!;
      const legFinishId = legFinishFits(newLeg, state.legFinishId)
        ? state.legFinishId
        : firstFittingFinish(newLeg);
      return { legStyleId: id, legFinishId, legChangeNotice: null };
    }),

  setLegFinish: (id) => set({ legFinishId: id }),
}));

export function usePrice() {
  const { shapeId, sizeId, topRangeId, topColorId, legStyleId, legFinishId } = useConfigStore();
  const shape = SHAPES.find((s) => s.id === shapeId)!;
  const size = SIZES.find((s) => s.id === sizeId)!;
  const topRange = topRangeId ? TOP_RANGES.find((r) => r.id === topRangeId) : undefined;
  const topColor = topColorId ? TOP_COLORS.find((c) => c.id === topColorId) : undefined;
  const legStyle = legStyleId ? LEG_STYLES.find((l) => l.id === legStyleId) : undefined;
  const legFinish = legFinishId ? LEG_FINISHES.find((l) => l.id === legFinishId) : undefined;

  const total =
    topRange && topColor && legStyle && legFinish
      ? shape.basePrice + size.priceModifier + topColor.priceModifier + legStyle.priceModifier + legFinish.priceModifier
      : null;

  return { total, shape, size, topRange, topColor, legStyle, legFinish };
}
