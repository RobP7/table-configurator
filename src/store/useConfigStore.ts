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
  type SizeOption,
  type TopColorOption,
  type TopRangeOption,
} from "../config/options";

function firstForShape<T extends { shapeId: ShapeId }>(list: T[], shapeId: ShapeId): T | undefined {
  return list.find((item) => item.shapeId === shapeId);
}

// Sizes/legs can be scoped to specific ranges (compatibleRanges) now that a
// shape can have more than one range. A null range (shape with no product
// yet) only matches entries that aren't range-scoped.
function sizeFits(size: SizeOption, shapeId: ShapeId, rangeId: string | null): boolean {
  if (size.shapeId !== shapeId) return false;
  if (size.compatibleRanges && (!rangeId || !size.compatibleRanges.includes(rangeId))) return false;
  return true;
}

function firstFittingSize(shapeId: ShapeId, rangeId: string | null): SizeOption {
  return (
    SIZES.find((s) => sizeFits(s, shapeId, rangeId)) ?? SIZES.find((s) => s.shapeId === shapeId)!
  );
}

function legFits(
  leg: LegStyleOption,
  shapeId: ShapeId,
  sizeId: string,
  rangeId: string | null
): boolean {
  if (!leg.compatibleShapes.includes(shapeId)) return false;
  if (leg.compatibleRanges && (!rangeId || !leg.compatibleRanges.includes(rangeId))) return false;
  if (leg.compatibleSizes && !leg.compatibleSizes.includes(sizeId)) return false;
  return true;
}

function firstFittingLeg(
  shapeId: ShapeId,
  sizeId: string,
  rangeId: string | null
): LegStyleOption | undefined {
  return LEG_STYLES.find((l) => legFits(l, shapeId, sizeId, rangeId));
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
  // Null when the current shape has no product range yet — oval starts out
  // this way until a real range is added for it.
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

// Round is the default on load (The Mynd was the first real product).
const initialShape: ShapeId = "round";
const initialTopRange = firstForShape(TOP_RANGES, initialShape);
const initialSizeId = firstFittingSize(initialShape, initialTopRange?.id ?? null).id;
const initialTopColor = initialTopRange ? firstFittingColor(initialTopRange) : undefined;
const initialLegStyle = firstFittingLeg(initialShape, initialSizeId, initialTopRange?.id ?? null);

// Re-validates size/colour/leg/leg finish after the shape or range changes,
// keeping whatever still fits and otherwise falling back to the first fit.
function reconcile(
  state: {
    sizeId: string;
    topColorId: string | null;
    legStyleId: string | null;
    legFinishId: string | null;
  },
  shapeId: ShapeId,
  range: TopRangeOption | undefined,
  reasonLabel: string,
  // When the range itself was switched, start on that range's own first leg
  // rather than carrying over a leg that merely also fits (e.g. the Caradoc's
  // triple X-base is allowed on the Haughmond but isn't its default).
  resetLeg = false
) {
  const rangeId = range?.id ?? null;
  const currentSize = SIZES.find((s) => s.id === state.sizeId);
  const sizeId =
    currentSize && sizeFits(currentSize, shapeId, rangeId)
      ? state.sizeId
      : firstFittingSize(shapeId, rangeId).id;

  const currentColor = TOP_COLORS.find((c) => c.id === state.topColorId);
  const topColorId = range
    ? currentColor && colorFits(currentColor, range.id)
      ? state.topColorId
      : (firstFittingColor(range)?.id ?? null)
    : null;

  const currentLeg = LEG_STYLES.find((l) => l.id === state.legStyleId);
  const legStillFits = currentLeg ? legFits(currentLeg, shapeId, sizeId, rangeId) : false;
  const newLegStyle =
    legStillFits && !resetLeg ? currentLeg : firstFittingLeg(shapeId, sizeId, rangeId);
  const legFinishId = newLegStyle
    ? legFinishFits(newLegStyle, state.legFinishId)
      ? state.legFinishId
      : firstFittingFinish(newLegStyle)
    : null;

  return {
    sizeId,
    topRangeId: rangeId,
    topColorId,
    legStyleId: newLegStyle?.id ?? null,
    legFinishId,
    legChangeNotice:
      currentLeg && newLegStyle && !legStillFits
        ? { fromLabel: currentLeg.label, toLabel: newLegStyle.label, reasonLabel }
        : null,
  };
}

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
      const shape = SHAPES.find((s) => s.id === id)!;
      const newTopRange = firstForShape(TOP_RANGES, id);
      return {
        shapeId: id,
        ...reconcile(state, id, newTopRange, `a ${shape.label} top`),
      };
    }),

  setSize: (id) =>
    set((state) => {
      const currentLeg = LEG_STYLES.find((l) => l.id === state.legStyleId);
      const legStillFits = currentLeg
        ? legFits(currentLeg, state.shapeId, id, state.topRangeId)
        : false;
      const newLegStyle = legStillFits
        ? currentLeg
        : firstFittingLeg(state.shapeId, id, state.topRangeId);
      const legFinishId = newLegStyle
        ? legFinishFits(newLegStyle, state.legFinishId)
          ? state.legFinishId
          : firstFittingFinish(newLegStyle)
        : null;
      const size = SIZES.find((s) => s.id === id)!;

      return {
        sizeId: id,
        legStyleId: newLegStyle?.id ?? null,
        legFinishId,
        legChangeNotice:
          currentLeg && newLegStyle && !legStillFits
            ? { fromLabel: currentLeg.label, toLabel: newLegStyle.label, reasonLabel: size.label }
            : null,
      };
    }),

  setTopRange: (id) =>
    set((state) => {
      const newRange = TOP_RANGES.find((r) => r.id === id)!;
      return reconcile(state, state.shapeId, newRange, newRange.label, true);
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
