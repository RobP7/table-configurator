import type { ReactElement } from "react";
import type { LegRenderStyle } from "../../config/options";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

function XFrameIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M10 10 L46 46 M46 10 L10 46 M10 30 L46 30" {...stroke} />
    </svg>
  );
}

function UFrameIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M14 8 V44 H42 V8" {...stroke} />
    </svg>
  );
}

function AFrameIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M28 8 L12 46 M28 8 L44 46 M20 28 H36" {...stroke} />
    </svg>
  );
}

function TrapezIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M20 8 L12 46 H44 L36 8" {...stroke} />
    </svg>
  );
}

function HFrameIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M14 8 V46 M42 8 V46 M14 27 H42" {...stroke} />
    </svg>
  );
}

function TempelIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M14 12 H42 M14 12 V46 M28 12 V46 M42 12 V46" {...stroke} />
    </svg>
  );
}

function TrestleIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path
        d="M8 14 H48 M16 14 L8 46 M16 14 L24 46 M40 14 L32 46 M40 14 L48 46"
        {...stroke}
      />
    </svg>
  );
}

function PedestalIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M28 10 V42" {...stroke} />
      <ellipse cx="28" cy="10" rx="7" ry="2" {...stroke} />
      <ellipse cx="28" cy="44" rx="15" ry="3.5" {...stroke} />
    </svg>
  );
}

function CrossBaseIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path d="M28 8 V38 M12 32 L44 44 M44 32 L12 44" {...stroke} />
    </svg>
  );
}

function TripleXIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path
        d="M8 14 L22 44 M22 14 L8 44 M17 14 L31 44 M31 14 L17 44 M26 14 L40 44 M40 14 L26 44 M4 46 H44"
        {...stroke}
      />
    </svg>
  );
}

function SpiderIcon() {
  return (
    <svg viewBox="0 0 56 56" width="28" height="28">
      <path
        d="M28 10 L10 44 M28 10 L22 48 M28 10 L34 48 M28 10 L46 44"
        {...stroke}
      />
    </svg>
  );
}

export const LEG_ICONS: Record<LegRenderStyle, () => ReactElement> = {
  xframe: XFrameIcon,
  uframe: UFrameIcon,
  aframe: AFrameIcon,
  trapez: TrapezIcon,
  hframe: HFrameIcon,
  tempel: TempelIcon,
  trestle: TrestleIcon,
  pedestal: PedestalIcon,
  crossbase: CrossBaseIcon,
  spider: SpiderIcon,
  tripleX: TripleXIcon,
};

export function LegStyleIcon({ renderStyle }: { renderStyle: LegRenderStyle }) {
  const Icon = LEG_ICONS[renderStyle];
  return <Icon />;
}
