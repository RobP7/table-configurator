import type { ReactElement } from "react";
import type { ShapeId } from "../../config/options";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

function RectangularIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <rect x="8" y="16" width="40" height="24" rx="2" {...stroke} />
    </svg>
  );
}

function OvalIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <ellipse cx="28" cy="28" rx="22" ry="13" {...stroke} />
    </svg>
  );
}

function RoundIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <circle cx="28" cy="28" r="18" {...stroke} />
    </svg>
  );
}

export const SHAPE_ICONS: Record<ShapeId, () => ReactElement> = {
  rectangular: RectangularIcon,
  oval: OvalIcon,
  round: RoundIcon,
};

export function ShapeIcon({ shapeId }: { shapeId: ShapeId }) {
  const Icon = SHAPE_ICONS[shapeId];
  return <Icon />;
}
