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
  | "spider"
  | "tripleX";

export interface SizeOption {
  id: string;
  label: string;
  shapeId: ShapeId;
  length: number; // cm (diameter for round tops)
  width: number; // cm (equals length for round tops)
  priceModifier: number; // placeholder — replace with real price list
  // If set, restricts this size to only these TopRangeOption ids (within
  // shapeId) — used once a shape has more than one range with different
  // size spans. Omitted means compatible with every range of that shape.
  compatibleRanges?: string[];
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
  // A set of real uploaded photos of the actual product from different
  // angles, shown as a clickable gallery instead of any 3D render. Used
  // when the procedural geometry can't be trusted to match the real
  // product closely enough — the photos are the source of truth here, not
  // an approximation of them.
  photoGallery?: string[];
  // Shown under the Size step when this range's catalog sizes have a
  // largest-available cap but bigger bespoke orders are still possible.
  bespokeSizeNote?: string;
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
  image?: string; // option-card product photo, path under /public, e.g. "/legs/light-x-oak.png"
  // A clean close-up crop of just the metal/wood surface (no background, no
  // seams), texture-mapped onto the 3D leg geometry — distinct from `image`
  // above, which is the full product photo shown in the option card.
  textureImage?: string;
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
  // The Caradoc — 160cm to 280cm. 180cm listed first since that's the
  // exact size shown in the real reference photos (used as this range's
  // default). Larger bespoke sizes beyond 280cm are handled via
  // TOP_RANGES["the-caradoc"].bespokeSizeNote, not a catalog entry.
  { id: "caradoc-180x100", label: "180 x 100 cm", shapeId: "rectangular", length: 180, width: 100, priceModifier: 40, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-160x100", label: "160 x 100 cm", shapeId: "rectangular", length: 160, width: 100, priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-200x100", label: "200 x 100 cm", shapeId: "rectangular", length: 200, width: 100, priceModifier: 90, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-220x100", label: "220 x 100 cm", shapeId: "rectangular", length: 220, width: 100, priceModifier: 140, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-240x100", label: "240 x 100 cm", shapeId: "rectangular", length: 240, width: 100, priceModifier: 190, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-260x100", label: "260 x 100 cm", shapeId: "rectangular", length: 260, width: 100, priceModifier: 240, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-280x100", label: "280 x 100 cm", shapeId: "rectangular", length: 280, width: 100, priceModifier: 290, compatibleRanges: ["the-caradoc"] },

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

// Ranges are shape-scoped product lines, added one at a time as real
// products come in.
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
  {
    id: "the-caradoc",
    label: "The Caradoc - Live Edge",
    shapeId: "rectangular",
    description: "Rectangular live-edge oak dining table on a triple steel X-base",
    edgeStyle: "tree",
    image: "/tops/the-caradoc.jpg",
    bespokeSizeNote: "Need something longer than 280cm? Larger bespoke sizes are available on request — get in touch.",
    photoGallery: [
      "/caradoc-real/angle-1.jpg",
      "/caradoc-real/angle-2.jpg",
      "/caradoc-real/angle-3.jpg",
      "/caradoc-real/angle-4.jpg",
      "/caradoc-real/angle-5.jpg",
      "/caradoc-real/angle-6.jpg",
    ],
  },
];

// Colors are a shared palette — compatibleRanges scopes each one to the
// range(s) it's actually offered on, so a new range can either reuse this
// Rubio palette (add its id to the relevant entries) or bring its own.
export const TOP_COLORS: TopColorOption[] = [
  // --- The Mynd \u2014 40 Rubio oil finish colors ---
  { id: "mynd-pure", label: "Pure", color: "#d9a874", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-pure.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-natural", label: "Natural", color: "#deb990", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-natural.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-charcoal", label: "Charcoal", color: "#4d4036", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-charcoal.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-white-5", label: "White 5%", color: "#dfbc99", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-white-5.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-chocolate", label: "Chocolate", color: "#6a4838", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-chocolate.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dunes", label: "Dunes", color: "#cb9e66", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dunes.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-shell-grey", label: "Shell Grey", color: "#876a4d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-shell-grey.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-macchiato", label: "Macchiato", color: "#c49a69", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-macchiato.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-affogato", label: "Affogato", color: "#8d673f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-affogato.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-almond", label: "Almond", color: "#b57743", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-almond.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-arabica", label: "Arabica", color: "#8a5035", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-arabica.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-ash-grey", label: "Ash Grey", color: "#765c45", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-ash-grey.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-black", label: "Black", color: "#5f4d3c", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-black.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-bourbon", label: "Bourbon", color: "#d09e6c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-bourbon.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-castle-brown", label: "Castle Brown", color: "#ae8158", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-castle-brown.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-cortado", label: "Cortado", color: "#855a39", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cortado.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-cocoa", label: "Cocoa", color: "#7d5334", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cocoa.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-cotton-white", label: "Cotton White", color: "#dfc0a3", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cotton-white.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dark-oak", label: "Dark Oak", color: "#9e6e3b", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dark-oak.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dark-roast", label: "Dark Roast", color: "#57423a", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-dark-roast.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-dulce", label: "Dulce", color: "#c5965c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dulce.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-fern", label: "Fern", color: "#465045", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-fern.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-golden-hour", label: "Golden Hour", color: "#b97940", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-golden-hour.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-hazelnut", label: "Hazelnut", color: "#af7d47", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-hazelnut.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-honey", label: "Honey", color: "#bd8345", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-honey.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-light-roast", label: "Light Roast", color: "#bf8f66", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-light-roast.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-linen", label: "Linen", color: "#c19d7d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-linen.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-midnight-sky", label: "Midnight Sky", color: "#416474", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-midnight-sky.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-mist", label: "Mist", color: "#cea476", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mist.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-mist-5", label: "Mist 5%", color: "#cd9f75", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mist-5.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-mocha", label: "Mocha", color: "#be9466", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mocha.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-oyster", label: "Oyster", color: "#b78d66", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-oyster.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-red-velvet", label: "Red Velvet", color: "#893e35", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-red-velvet.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-smoke", label: "Smoke", color: "#d9b289", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-smoke.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-smoke-5", label: "Smoke 5%", color: "#d2a97f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-smoke-5.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-super-white", label: "Super White", color: "#debd9b", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-super-white.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-vanilla", label: "Vanilla", color: "#d1a978", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-vanilla.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-vienna", label: "Vienna", color: "#b98661", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-vienna.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-walnut", label: "Walnut", color: "#b58c54", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-walnut.jpg", compatibleRanges: ["the-mynd"] },
  { id: "mynd-white", label: "White", color: "#e3c6ad", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-white.jpg", compatibleRanges: ["the-mynd"] },

  // --- The Caradoc — 40 Rubio Monocoat Oil Plus 2C finish colors, cropped
  // and color-sampled from the real "Knot & Grain Dining" reference sheets ---
  { id: "caradoc-pure", label: "Pure", color: "#d8a576", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-pure.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-natural", label: "Natural", color: "#dcb18a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-natural.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-charcoal", label: "Charcoal", color: "#6f5d50", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-charcoal.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-white-5", label: "White 5%", color: "#d9b69d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-white-5.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-chocolate", label: "Chocolate", color: "#805641", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-chocolate.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dunes", label: "Dunes", color: "#9d7a5e", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-dunes.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-shell-grey", label: "Shell Grey", color: "#9f7c62", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-shell-grey.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-macchiato", label: "Macchiato", color: "#c28b5a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-macchiato.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-affogato", label: "Affogato", color: "#9a6a48", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-affogato.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-almond", label: "Almond", color: "#ba8057", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-almond.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-arabica", label: "Arabica", color: "#ac704b", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-arabica.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-ash-grey", label: "Ash Grey", color: "#947e6f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-ash-grey.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-black", label: "Black", color: "#473c38", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-black.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-bourbon", label: "Bourbon", color: "#ae744a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-bourbon.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-castle-brown", label: "Castle Brown", color: "#a1704e", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-castle-brown.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-cortado", label: "Cortado", color: "#9d6b4a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-cortado.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-cocoa", label: "Cocoa", color: "#a06d4a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-cocoa.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-cotton-white", label: "Cotton White", color: "#debc9c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-cotton-white.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dark-oak", label: "Dark Oak", color: "#865d42", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-dark-oak.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dark-roast", label: "Dark Roast", color: "#775440", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-dark-roast.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dulce", label: "Dulce", color: "#cf9a61", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-dulce.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-fern", label: "Fern", color: "#626752", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-fern.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-golden-hour", label: "Golden Hour", color: "#bf824d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-golden-hour.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-hazelnut", label: "Hazelnut", color: "#b78055", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-hazelnut.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-honey", label: "Honey", color: "#c68952", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-honey.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-light-roast", label: "Light Roast", color: "#c78e5d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-light-roast.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-mist", label: "Mist", color: "#ba9c86", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-mist.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-mist-5", label: "Mist 5%", color: "#cd9d73", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-mist-5.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-mocha", label: "Mocha", color: "#b88159", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-mocha.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-oyster", label: "Oyster", color: "#cbaa8d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-oyster.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-red-velvet", label: "Red Velvet", color: "#974a41", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-red-velvet.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-smoke", label: "Smoke", color: "#c2a893", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-smoke.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-smoke-5", label: "Smoke 5%", color: "#d6b18f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-smoke-5.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-super-white", label: "Super White", color: "#dcc4b0", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-super-white.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-vanilla", label: "Vanilla", color: "#dfbd9a", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-vanilla.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-vienna", label: "Vienna", color: "#b97a53", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-vienna.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-white", label: "White", color: "#d6baa6", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-white.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-linen", label: "Linen", color: "#d2aa84", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-linen.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-walnut", label: "Walnut", color: "#a17050", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-walnut.jpg", compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-midnight-sky", label: "Midnight Sky", color: "#435664", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/caradoc-finish-midnight-sky.jpg", compatibleRanges: ["the-caradoc"] },
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
  {
    id: "caradoc-triple-x",
    label: "Triple X-Base",
    description: "Three crossed steel X-legs on a shared base plate",
    material: "steel",
    renderStyle: "tripleX",
    compatibleShapes: ["rectangular"],
    compatibleFinishes: ["steel-bronze-patina"],
    priceModifier: 0,
    image: "/legs/caradoc-triple-x.jpg",
    textureImage: "/legs/caradoc-triple-x-texture.jpg",
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
    id: "steel-bronze-patina",
    label: "Aged Bronze Steel",
    material: "steel",
    color: "#423b3a",
    roughness: 0.45,
    metalness: 0.6,
    priceModifier: 0,
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
