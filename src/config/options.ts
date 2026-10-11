export type ShapeId = "rectangular" | "oval" | "round";
export type MaterialId = "steel" | "oak";

// Which parametric 3D geometry a leg entry renders with. Several catalog
// entries share a geometry family since they're visually near-identical builds;
// the option card's real product photo carries the exact visual identity.
export type LegRenderStyle =
  | "xframe"
  | "uframe"
  | "aframe"
  | "trapez"
  | "hframe"
  | "tempel"
  | "trestle"
  | "pedestal"
  | "crossbase"
  | "spider";

export interface SizeOption {
  id: string;
  label: string;
  shapeId: ShapeId;
  length: number; // cm (diameter for round tops)
  width: number; // cm (equals length for round tops)
  priceModifier: number; // placeholder — replace with real price list
}

// Real edge/silhouette profile per series — drives which procedural 3D
// geometry gets built, since a flat photo alone can't convey a live edge,
// bevel, chamfer, or organic silhouette.
export type TopEdgeStyle = "straight" | "bevel" | "tree" | "chamfer" | "roundedCorners" | "pebble";

// A Range is a product line (e.g. "The Mynd") — its shape, silhouette, and
// reference photo. A Color is a finish applied on top of a range (e.g. one
// of 40 Rubio oil colors) — kept as a separate, shareable list so multiple
// ranges can reuse the same color palette via compatibleRanges.
export interface TopRangeOption {
  id: string;
  label: string;
  shapeId: ShapeId;
  description: string;
  edgeStyle: TopEdgeStyle;
  image?: string; // product reference photo, path under /public
  // Real photos of the actual product, keyed by LEG_FINISHES id, shown in
  // the main viewer instead of a 3D render when available for this range.
  heroImages?: Record<string, string>;
}

export interface TopColorOption {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  priceModifier: number; // placeholder — replace with real price list
  compatibleRanges: string[]; // TopRangeOption ids this color applies to
  image?: string; // real swatch photo, path under /public, e.g. "/tops/finish-walnut.jpg"
}

export interface LegStyleOption {
  id: string;
  label: string;
  description: string;
  material: MaterialId;
  renderStyle: LegRenderStyle;
  compatibleShapes: ShapeId[];
  // If set, restricts this leg to only these SIZES ids (within compatibleShapes).
  // Omitted means compatible with every size of the compatible shape(s) —
  // used for legs whose source spec didn't give an exact supported span.
  compatibleSizes?: string[];
  // If set, restricts the Leg Finish step to only these LEG_FINISHES ids
  // (e.g. a pedestal that only comes in black/white, not the full steel
  // palette). Omitted means every finish matching this leg's material.
  compatibleFinishes?: string[];
  priceModifier: number; // placeholder — replace with real price list
  image?: string; // path under /public, e.g. "/legs/light-x-oak.png"
}

export interface LegFinishOption {
  id: string;
  label: string;
  material: MaterialId;
  color: string;
  roughness: number;
  metalness: number;
  priceModifier: number; // placeholder — replace with real price list
}

export interface ShapeOption {
  id: ShapeId;
  label: string;
  description: string;
  basePrice: number; // placeholder — replace with real price list
}

export const SHAPES: ShapeOption[] = [
  {
    id: "rectangular",
    label: "Rectangular",
    description: "Classic straight-edged tabletop",
    basePrice: 899,
  },
  {
    id: "oval",
    label: "Oval",
    description: "Elongated oval silhouette",
    basePrice: 999,
  },
  {
    id: "round",
    label: "Round",
    description: "Circular tabletop",
    basePrice: 849,
  },
];

// Sizes are shape-scoped: a round top only ever offers diameters, an oval
// top offers its own length x width range, etc. Filtered by shapeId in the UI.
export const SIZES: SizeOption[] = [
  // Rectangular
  { id: "rect-160x90", label: "160 x 90 cm", shapeId: "rectangular", length: 160, width: 90, priceModifier: 0 },
  { id: "rect-180x90", label: "180 x 90 cm", shapeId: "rectangular", length: 180, width: 90, priceModifier: 40 },
  { id: "rect-200x100", label: "200 x 100 cm", shapeId: "rectangular", length: 200, width: 100, priceModifier: 90 },
  { id: "rect-220x100", label: "220 x 100 cm", shapeId: "rectangular", length: 220, width: 100, priceModifier: 140 },
  { id: "rect-240x100", label: "240 x 100 cm", shapeId: "rectangular", length: 240, width: 100, priceModifier: 190 },
  { id: "rect-260x110", label: "260 x 110 cm", shapeId: "rectangular", length: 260, width: 110, priceModifier: 240 },
  { id: "rect-280x110", label: "280 x 110 cm", shapeId: "rectangular", length: 280, width: 110, priceModifier: 290 },
  { id: "rect-300x110", label: "300 x 110 cm", shapeId: "rectangular", length: 300, width: 110, priceModifier: 340 },

  // Oval
  { id: "oval-130x70", label: "130 x 70 cm", shapeId: "oval", length: 130, width: 70, priceModifier: 0 },
  { id: "oval-200x100", label: "200 x 100 cm", shapeId: "oval", length: 200, width: 100, priceModifier: 120 },
  { id: "oval-200x110", label: "200 x 110 cm", shapeId: "oval", length: 200, width: 110, priceModifier: 140 },
  { id: "oval-220x110", label: "220 x 110 cm", shapeId: "oval", length: 220, width: 110, priceModifier: 170 },
  { id: "oval-240x100", label: "240 x 100 cm", shapeId: "oval", length: 240, width: 100, priceModifier: 190 },
  { id: "oval-240x110", label: "240 x 110 cm", shapeId: "oval", length: 240, width: 110, priceModifier: 210 },
  { id: "oval-260x120", label: "260 x 120 cm", shapeId: "oval", length: 260, width: 120, priceModifier: 250 },
  { id: "oval-280x120", label: "280 x 120 cm", shapeId: "oval", length: 280, width: 120, priceModifier: 290 },
  { id: "oval-300x120", label: "300 x 120 cm", shapeId: "oval", length: 300, width: 120, priceModifier: 330 },

  // Round (diameter) — The Mynd's three confirmed sizes.
  // priceModifier is relative to the round shape's £849 basePrice, so the
  // total comes out to the real price list: £1349 / £1595 / £1695.
  { id: "round-100", label: "Ø 100 cm", shapeId: "round", length: 100, width: 100, priceModifier: 500 },
  { id: "round-110", label: "Ø 110 cm", shapeId: "round", length: 110, width: 110, priceModifier: 746 },
  { id: "round-120", label: "Ø 120 cm", shapeId: "round", length: 120, width: 120, priceModifier: 846 },
];

// Ranges are shape-scoped product lines. Rectangular and oval have none yet
// \u2014 they're added one at a time as real products come in. The Mynd is the
// first real one.
export const TOP_RANGES: TopRangeOption[] = [
  {
    id: "the-mynd",
    label: "The Mynd",
    shapeId: "round",
    description: "Round pedestal dining table on a central tulip base",
    edgeStyle: "bevel",
    image: "/tops/the-mynd.jpg",
    heroImages: {
      "steel-black": "/tops/the-mynd-black.jpg",
      "steel-white": "/tops/the-mynd-white.jpg",
    },
  },
];

// Colors are a shared palette — compatibleRanges scopes each one to the
// range(s) it's actually offered on, so a new range can either reuse this
// Rubio palette (add its id to the relevant entries) or bring its own.
export const TOP_COLORS: TopColorOption[] = [
  // --- The Mynd \u2014 40 Rubio oil finish colors ---
  { id: "mynd-pure", label: "Pure", color: "#d4b483", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-pure.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-natural", label: "Natural", color: "#d9bc8c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-natural.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-charcoal", label: "Charcoal", color: "#3d352c", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-charcoal.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-white-5", label: "White 5%", color: "#e8d9bc", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-white-5.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-chocolate", label: "Chocolate", color: "#5c3a2e", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-chocolate.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dunes", label: "Dunes", color: "#b89368", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dunes.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-shell-grey", label: "Shell Grey", color: "#c9b89a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-shell-grey.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-macchiato", label: "Macchiato", color: "#c89a5f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-macchiato.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-affogato", label: "Affogato", color: "#a9815a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-affogato.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-almond", label: "Almond", color: "#c17f3f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-almond.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-arabica", label: "Arabica", color: "#a68a6a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-arabica.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-ash-grey", label: "Ash Grey", color: "#8c8275", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-ash-grey.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-black", label: "Black", color: "#241f1c", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-black.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-bourbon", label: "Bourbon", color: "#9a6a3c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-bourbon.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-castle-brown", label: "Castle Brown", color: "#8a6440", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-castle-brown.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-cortado", label: "Cortado", color: "#7c5a3c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cortado.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-cocoa", label: "Cocoa", color: "#6b4428", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cocoa.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-cotton-white", label: "Cotton White", color: "#e6d9c3", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cotton-white.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dark-oak", label: "Dark Oak", color: "#7a5530", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dark-oak.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dark-roast", label: "Dark Roast", color: "#4a3222", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-dark-roast.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dulce", label: "Dulce", color: "#c89a5f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dulce.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-fern", label: "Fern", color: "#3d4a3a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-fern.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-golden-hour", label: "Golden Hour", color: "#c8863c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-golden-hour.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-hazelnut", label: "Hazelnut", color: "#a9713f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-hazelnut.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-honey", label: "Honey", color: "#c9893f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-honey.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-light-roast", label: "Light Roast", color: "#b37a42", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-light-roast.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-linen", label: "Linen", color: "#d6c4a3", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-linen.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-midnight-sky", label: "Midnight Sky", color: "#2e3a4a", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-midnight-sky.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-mist", label: "Mist", color: "#d8c7a8", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mist.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-mist-5", label: "Mist 5%", color: "#cdb996", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mist-5.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-mocha", label: "Mocha", color: "#8a6245", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mocha.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-oyster", label: "Oyster", color: "#c9b99e", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-oyster.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-red-velvet", label: "Red Velvet", color: "#6e2430", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-red-velvet.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-smoke", label: "Smoke", color: "#9c8a76", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-smoke.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-smoke-5", label: "Smoke 5%", color: "#b5a68e", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-smoke-5.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-super-white", label: "Super White", color: "#e8ddc8", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-super-white.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-vanilla", label: "Vanilla", color: "#d9c49c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-vanilla.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-vienna", label: "Vienna", color: "#8a5a3c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-vienna.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-walnut", label: "Walnut", color: "#6b4a2e", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-walnut.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-white", label: "White", color: "#e3d6bb", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-white.jpg", compatibleRanges: ["the-mynd"] },
];

export const LEG_STYLES: LegStyleOption[] = [
  {
    id: "mynd-pedestal",
    label: "The Mynd Pedestal",
    description: "Central pedestal base, \u00d8110-120cm tops",
    material: "steel",
    renderStyle: "pedestal",
    compatibleShapes: ["round"],
    compatibleFinishes: ["steel-black", "steel-white"],
    priceModifier: 0,
  },
];

export const LEG_FINISHES: LegFinishOption[] = [
  {
    id: "steel-black",
    label: "Matte Black Steel",
    material: "steel",
    color: "#1c1c1e",
    roughness: 0.4,
    metalness: 0.7,
    priceModifier: 0,
  },
  {
    id: "steel-white",
    label: "Matte White Steel",
    material: "steel",
    color: "#e9e7e2",
    roughness: 0.4,
    metalness: 0.6,
    priceModifier: 0,
  },
  {
    id: "steel-brass",
    label: "Brushed Brass",
    material: "steel",
    color: "#b08d57",
    roughness: 0.35,
    metalness: 0.85,
    priceModifier: 70,
  },
  {
    id: "wood-oak",
    label: "Natural Oak (matching top)",
    material: "oak",
    color: "#c9a06b",
    roughness: 0.65,
    metalness: 0,
    priceModifier: 0,
  },
  {
    id: "wood-black",
    label: "Black Stained Oak",
    material: "oak",
    color: "#232019",
    roughness: 0.55,
    metalness: 0,
    priceModifier: 40,
  },
];

export const DEFAULT_TABLE_HEIGHT = 75; // cm
export const CURRENCY = "£";
