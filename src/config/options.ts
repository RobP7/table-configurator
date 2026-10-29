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
  // Per-leg-style galleries (keyed by LEG_STYLES id), used instead of
  // photoGallery when the selected leg has its own real photos. A leg with
  // no entry falls back to photoGallery with an "illustrative" note.
  legGalleries?: Record<string, string[]>;
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
  // If set, restricts this leg to only these TopRangeOption ids. Omitted
  // means it fits every range of its compatible shape(s).
  compatibleRanges?: string[];
  // If set, only offered for table lengths (cm) within [min, max] — from the
  // supplier's stated span for that frame.
  tableLengthRange?: [number, number];
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
  image?: string; // swatch photo — shown as a compact swatch grid when set
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
  // The Caradoc — 160cm to 280cm, listed in ascending order (the first entry
  // is the default selection when switching to this shape). Rectangular
  // basePrice is £899, so these modifiers give £2199 (160cm) to £3899 (280cm)
  // in near-even steps (£283-284 per 20cm, rounded to whole pounds).
  { id: "caradoc-160x100", label: "160 x 100 cm", shapeId: "rectangular", length: 160, width: 100, priceModifier: 1300, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-180x100", label: "180 x 100 cm", shapeId: "rectangular", length: 180, width: 100, priceModifier: 1583, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-200x100", label: "200 x 100 cm", shapeId: "rectangular", length: 200, width: 100, priceModifier: 1867, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-220x100", label: "220 x 100 cm", shapeId: "rectangular", length: 220, width: 100, priceModifier: 2150, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-240x100", label: "240 x 100 cm", shapeId: "rectangular", length: 240, width: 100, priceModifier: 2433, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-260x100", label: "260 x 100 cm", shapeId: "rectangular", length: 260, width: 100, priceModifier: 2717, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-280x100", label: "280 x 100 cm", shapeId: "rectangular", length: 280, width: 100, priceModifier: 3000, compatibleRanges: ["the-caradoc"] },

  // The Haughmond — 160cm to 300cm. Rectangular basePrice is £899, so the
  // modifiers give the real price list: £2,499 (160cm) up to £3,985 (300cm).
  // Width isn't specified for this range; 100 is only used if a 3D render
  // is ever shown (the Haughmond uses real photos).
  { id: "haughmond-160", label: "160cm", shapeId: "rectangular", length: 160, width: 100, priceModifier: 1600, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-180", label: "180cm", shapeId: "rectangular", length: 180, width: 100, priceModifier: 1796, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-200", label: "200cm", shapeId: "rectangular", length: 200, width: 100, priceModifier: 1996, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-220", label: "220cm", shapeId: "rectangular", length: 220, width: 100, priceModifier: 2200, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-240", label: "240cm", shapeId: "rectangular", length: 240, width: 100, priceModifier: 2490, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-260", label: "260cm", shapeId: "rectangular", length: 260, width: 100, priceModifier: 2680, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-280", label: "280cm", shapeId: "rectangular", length: 280, width: 100, priceModifier: 2876, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-300", label: "300cm", shapeId: "rectangular", length: 300, width: 100, priceModifier: 3086, compatibleRanges: ["the-haughmond"] },

  // The Wrekin — 160cm to 300cm. Rectangular basePrice is £899, so these
  // modifiers give the real price list: £2,099 (160cm) up to £3,499 (300cm).
  { id: "wrekin-160", label: "160cm", shapeId: "rectangular", length: 160, width: 100, priceModifier: 1200, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-180", label: "180cm", shapeId: "rectangular", length: 180, width: 100, priceModifier: 1396, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-200", label: "200cm", shapeId: "rectangular", length: 200, width: 100, priceModifier: 1600, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-220", label: "220cm", shapeId: "rectangular", length: 220, width: 100, priceModifier: 1790, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-240", label: "240cm", shapeId: "rectangular", length: 240, width: 100, priceModifier: 1990, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-260", label: "260cm", shapeId: "rectangular", length: 260, width: 100, priceModifier: 2200, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-280", label: "280cm", shapeId: "rectangular", length: 280, width: 100, priceModifier: 2396, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-300", label: "300cm", shapeId: "rectangular", length: 300, width: 100, priceModifier: 2600, compatibleRanges: ["the-wrekin"] },

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
    // The photos show this leg; any other leg gets the "illustrative" note.
    legGalleries: {
      "bold-center-double-x": [
        "/caradoc-real/angle-1.jpg",
        "/caradoc-real/angle-2.jpg",
        "/caradoc-real/angle-3.jpg",
        "/caradoc-real/angle-4.jpg",
        "/caradoc-real/angle-5.jpg",
        "/caradoc-real/angle-6.jpg",
      ],
    },
  },
  {
    id: "the-haughmond",
    label: "The Haughmond",
    shapeId: "rectangular",
    description: "Thick rustic plank dining table on wooden trestle or steel U-frame legs",
    edgeStyle: "straight",
    image: "/tops/the-haughmond.jpg",
    // Shown when the selected leg has no photos of its own (e.g. the
    // triple X-base) — with an "illustrative" note.
    photoGallery: [
      "/haughmond-real/metal-1.jpg",
      "/haughmond-real/metal-2.jpg",
      "/haughmond-real/metal-3.jpg",
      "/haughmond-real/metal-4.jpg",
    ],
    legGalleries: {
      "haughmond-trestle": ["/haughmond-real/trestle-1.jpg"],
      "haughmond-metal-u": [
        "/haughmond-real/metal-1.jpg",
        "/haughmond-real/metal-2.jpg",
        "/haughmond-real/metal-3.jpg",
        "/haughmond-real/metal-4.jpg",
      ],
    },
  },
  {
    id: "the-wrekin",
    label: "The Wrekin",
    shapeId: "rectangular",
    description: "Solid oak plank dining table on a black steel star base",
    edgeStyle: "straight",
    image: "/tops/the-wrekin.jpg",
    photoGallery: [
      "/wrekin-real/angle-1.jpg",
      "/wrekin-real/angle-2.jpg",
      "/wrekin-real/angle-3.jpg",
      "/wrekin-real/angle-4.jpg",
    ],
    legGalleries: {
      "wrekin-star": [
        "/wrekin-real/angle-1.jpg",
        "/wrekin-real/angle-2.jpg",
        "/wrekin-real/angle-3.jpg",
        "/wrekin-real/angle-4.jpg",
      ],
    },
  },
];

// Colors are a shared palette — compatibleRanges scopes each one to the
// range(s) it's actually offered on, so a new range can either reuse this
// Rubio palette (add its id to the relevant entries) or bring its own.
export const TOP_COLORS: TopColorOption[] = [
  // --- The Mynd \u2014 40 Rubio oil finish colors ---
  { id: "mynd-pure", label: "Pure", color: "#d9a874", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-pure.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-natural", label: "Natural", color: "#deb990", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-natural.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-charcoal", label: "Charcoal", color: "#4d4036", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-charcoal.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-white-5", label: "White 5%", color: "#dfbc99", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-white-5.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-chocolate", label: "Chocolate", color: "#6a4838", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-chocolate.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dunes", label: "Dunes", color: "#cb9e66", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dunes.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-shell-grey", label: "Shell Grey", color: "#876a4d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-shell-grey.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-macchiato", label: "Macchiato", color: "#c49a69", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-macchiato.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-affogato", label: "Affogato", color: "#8d673f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-affogato.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-almond", label: "Almond", color: "#b57743", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-almond.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-arabica", label: "Arabica", color: "#8a5035", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-arabica.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-ash-grey", label: "Ash Grey", color: "#765c45", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-ash-grey.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-black", label: "Black", color: "#5f4d3c", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-black.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-bourbon", label: "Bourbon", color: "#d09e6c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-bourbon.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-castle-brown", label: "Castle Brown", color: "#ae8158", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-castle-brown.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-cortado", label: "Cortado", color: "#855a39", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cortado.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-cocoa", label: "Cocoa", color: "#7d5334", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cocoa.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-cotton-white", label: "Cotton White", color: "#dfc0a3", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-cotton-white.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dark-oak", label: "Dark Oak", color: "#9e6e3b", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dark-oak.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dark-roast", label: "Dark Roast", color: "#57423a", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-dark-roast.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dulce", label: "Dulce", color: "#c5965c", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-dulce.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-fern", label: "Fern", color: "#465045", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-fern.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-golden-hour", label: "Golden Hour", color: "#b97940", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-golden-hour.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-hazelnut", label: "Hazelnut", color: "#af7d47", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-hazelnut.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-honey", label: "Honey", color: "#bd8345", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-honey.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-light-roast", label: "Light Roast", color: "#bf8f66", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-light-roast.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-linen", label: "Linen", color: "#c19d7d", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-linen.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-midnight-sky", label: "Midnight Sky", color: "#416474", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-midnight-sky.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-mist", label: "Mist", color: "#cea476", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mist.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-mist-5", label: "Mist 5%", color: "#cd9f75", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mist-5.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-mocha", label: "Mocha", color: "#be9466", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-mocha.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-oyster", label: "Oyster", color: "#b78d66", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-oyster.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-red-velvet", label: "Red Velvet", color: "#893e35", roughness: 0.6, metalness: 0, priceModifier: 0, image: "/tops/finish-red-velvet.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-smoke", label: "Smoke", color: "#d9b289", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-smoke.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-smoke-5", label: "Smoke 5%", color: "#d2a97f", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-smoke-5.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-super-white", label: "Super White", color: "#debd9b", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-super-white.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-vanilla", label: "Vanilla", color: "#d1a978", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-vanilla.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-vienna", label: "Vienna", color: "#b98661", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-vienna.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-walnut", label: "Walnut", color: "#b58c54", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-walnut.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-white", label: "White", color: "#e3c6ad", roughness: 0.62, metalness: 0, priceModifier: 0, image: "/tops/finish-white.jpg", compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },

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

// The Haughmond's wooden trestle leg comes in the same Rubio palette as
// the top (reusing the Mynd's original swatch photos).
const WOOD_LEG_FINISHES: LegFinishOption[] = TOP_COLORS.filter((c) => c.id.startsWith("mynd-")).map(
  (c) => ({
    id: `wood-leg-${c.id.slice("mynd-".length)}`,
    label: c.label,
    material: "oak" as const,
    color: c.color,
    roughness: c.roughness,
    metalness: c.metalness,
    priceModifier: 0,
    image: c.image,
  })
);

// Steel frames come in the two finishes the supplier's frames are offered in.
const STEEL_LEG_FINISH_IDS = ["steel-black", "steel-white"];

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
    id: "haughmond-trestle",
    label: "Wooden Trestle",
    description: "Turned wooden trestle legs, any finish colour",
    material: "oak",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular"],
    compatibleRanges: ["the-haughmond"],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/haughmond-trestle.jpg",
  },
  {
    id: "haughmond-metal-u",
    label: "Steel U-Frame",
    description: "Black steel U-frame legs",
    material: "steel",
    renderStyle: "uframe",
    compatibleShapes: ["rectangular"],
    compatibleRanges: ["the-haughmond"],
    compatibleFinishes: ["steel-black"],
    priceModifier: 0,
    image: "/legs/haughmond-metal-u.jpg",
  },
  {
    id: "wrekin-star",
    label: "Steel Star Base",
    description: "Black steel star base",
    material: "steel",
    renderStyle: "spider",
    compatibleShapes: ["rectangular"],
    compatibleRanges: ["the-wrekin"],
    compatibleFinishes: ["steel-black"],
    priceModifier: 0,
    image: "/legs/wrekin-star.jpg",
  },
  {
    id: "bold-center-double-x",
    label: "Triple X-Base",
    description: "Three crossed steel X-legs on a shared base plate",
    material: "steel",
    renderStyle: "tripleX",
    compatibleShapes: ["rectangular"],
    compatibleFinishes: ["steel-bronze-patina", "steel-black", "steel-white"],
    priceModifier: 0,
    image: "/legs/bold-center-double-x.jpg",
    textureImage: "/legs/caradoc-triple-x-texture.jpg",
  },

  // --- Original TischDirekt frames (restored from the archive), offered on
  // every rectangular range. priceModifier is 0 until real upcharges are set.
  {
    id: "ul-u",
    label: "Ultra Light U",
    description: "Two U-shaped steel end frames, 10x2cm, 180-300cm tops",
    material: "steel",
    renderStyle: "uframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-u.png",
  },
  {
    id: "ul-trapez",
    label: "Ultra Light Trapez",
    description: "Angled steel end frames, 10x2cm, 200-300cm tops",
    material: "steel",
    renderStyle: "trapez",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-trapez.png",
  },
  {
    id: "ul-spider-long",
    label: "Ultra Light Spider Long",
    description: "Center steel frame with splayed legs, 150cm, 10x2cm",
    material: "steel",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-spider-long.png",
  },
  {
    id: "ul-x",
    label: "Ultra Light X",
    description: "Crossed steel end frames, 10x2cm, 180-300cm tops",
    material: "steel",
    renderStyle: "xframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-x.png",
  },
  {
    id: "ul-3d-spider-long",
    label: "Ultra Light 3D Spider Long",
    description: "Sculpted center steel frame, 190cm",
    material: "steel",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-3d-spider-long.png",
  },
  {
    id: "ul-3d-x",
    label: "Ultra Light 3D X",
    description: "Sculpted crossed steel end frames, 10x1cm, 180-300cm tops",
    material: "steel",
    renderStyle: "xframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-3d-x.png",
  },
  {
    id: "ul-3d-butterfly",
    label: "Ultra Light 3D Butterfly",
    description: "Sculpted steel end frames, 2x2cm, 180-300cm tops",
    material: "steel",
    renderStyle: "xframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-3d-butterfly.jpg",
  },
  {
    id: "ul-3d-quattro",
    label: "Ultra Light 3D Quattro",
    description: "Four-point sculpted steel end frames, 10x1cm, 200-300cm tops",
    material: "steel",
    renderStyle: "uframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/ul-3d-quattro.jpg",
  },
  {
    id: "light-x-steel",
    label: "Light X (Steel)",
    description: "Crossed steel end frames, 10x4cm, 160-300cm tops",
    material: "steel",
    renderStyle: "xframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [160, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-x-steel.png",
  },
  {
    id: "light-u-steel",
    label: "Light U (Steel)",
    description: "Two U-shaped steel end frames, 10x4cm, 160-300cm tops",
    material: "steel",
    renderStyle: "uframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [160, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-u-steel.png",
  },
  {
    id: "light-quattro",
    label: "Light Quattro",
    description: "Four-point steel end frames, 5x2.5-7.8cm, 180-300cm tops",
    material: "steel",
    renderStyle: "uframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-quattro.png",
  },
  {
    id: "light-trapez-steel",
    label: "Light Trapez (Steel)",
    description: "Angled steel end frames, 10x4cm, 200-300cm tops",
    material: "steel",
    renderStyle: "trapez",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-trapez-steel.png",
  },
  {
    id: "light-a-steel",
    label: "Light A (Steel)",
    description: "A-shaped steel end frames, 10x4cm, 180-300cm tops",
    material: "steel",
    renderStyle: "aframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-a-steel.png",
  },
  {
    id: "light-spider-steel",
    label: "Light Spider (Steel)",
    description: "Center steel frame with splayed legs, 140/180cm, 15x5cm",
    material: "steel",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-spider-steel.png",
  },
  {
    id: "light-spider-slim-steel",
    label: "Light Spider Slim (Steel)",
    description: "Slim center steel frame, 140cm, 4x3.5-7cm",
    material: "steel",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-spider-slim-steel.png",
  },
  {
    id: "light-spider-round-bar-steel",
    label: "Light Spider Round Bar (Steel)",
    description: "Round-bar center steel frame, 172/196cm, Ø4.2cm",
    material: "steel",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/light-spider-round-bar-steel.png",
  },
  {
    id: "conference-adjust",
    label: "Conference Adjust",
    description: "Height-adjustable steel end frames, 67-116cm height, 200-300cm tops",
    material: "steel",
    renderStyle: "uframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/conference-adjust.png",
  },
  {
    id: "bold-x-steel",
    label: "Bold X (Steel)",
    description: "Heavy crossed steel end frames, 10x10cm, 180-300cm tops",
    material: "steel",
    renderStyle: "xframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/bold-x-steel.png",
  },
  {
    id: "bold-center-x",
    label: "Bold Center X",
    description: "Single heavy center steel post, 102/121cm, 10x10cm",
    material: "steel",
    renderStyle: "pedestal",
    compatibleShapes: ["rectangular"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/bold-center-x.jpg",
  },
  {
    id: "bold-spider-steel",
    label: "Bold Spider (Steel)",
    description: "Heavy center steel frame with splayed legs, 140cm, 10x10cm",
    material: "steel",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
    image: "/legs/bold-spider-steel.png",
  },
  {
    id: "light-x-oak",
    label: "Light X (Oak)",
    description: "Crossed solid oak end frames, 10x4cm, 180-300cm tops",
    material: "oak",
    renderStyle: "xframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/light-x-oak.png",
  },
  {
    id: "light-u-oak",
    label: "Light U (Oak)",
    description: "Two U-shaped solid oak end frames, 10x4cm, 180-300cm tops",
    material: "oak",
    renderStyle: "uframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/light-u-oak.png",
  },
  {
    id: "light-a-oak",
    label: "Light A (Oak)",
    description: "A-shaped solid oak end frames, 10x4cm, 180-300cm tops",
    material: "oak",
    renderStyle: "aframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/light-a-oak.png",
  },
  {
    id: "light-spider-oak-140",
    label: "Light Spider 140 (Oak)",
    description: "Solid oak center frame, 140x90cm, 16x6cm",
    material: "oak",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/light-spider-oak-140.png",
  },
  {
    id: "light-spider-oak-180",
    label: "Light Spider 180 (Oak)",
    description: "Solid oak center frame, 180x90cm, 16x6cm",
    material: "oak",
    renderStyle: "trestle",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/light-spider-oak-180.png",
  },
  {
    id: "light-trapez-oak",
    label: "Light Trapez (Oak)",
    description: "Angled solid oak end frames, 94cm, 10x6cm, 200-300cm tops",
    material: "oak",
    renderStyle: "trapez",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/light-trapez-oak.png",
  },
  {
    id: "bold-x-oak",
    label: "Bold X (Oak)",
    description: "Heavy crossed solid oak end frames, 12x12cm, 180-300cm tops",
    material: "oak",
    renderStyle: "xframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/bold-x-oak.png",
  },
  {
    id: "bold-a-oak",
    label: "Bold A (Oak)",
    description: "Heavy A-shaped solid oak end frames, 88cm, 12x12cm, 200-300cm tops",
    material: "oak",
    renderStyle: "aframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/bold-a-oak.png",
  },
  {
    id: "bold-h-oak",
    label: "Bold H (Oak)",
    description: "Heavy H-shaped solid oak end frames, 88cm, 12x12cm, 200-300cm tops",
    material: "oak",
    renderStyle: "hframe",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/bold-h-oak.png",
  },
  {
    id: "bold-tempel-oak",
    label: "Bold Tempel (Oak)",
    description: "Colonnade-style solid oak end frames, 78cm, 180-300cm tops",
    material: "oak",
    renderStyle: "tempel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
    image: "/legs/bold-tempel-oak.png",
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
  ...WOOD_LEG_FINISHES,
];

export const DEFAULT_TABLE_HEIGHT = 75; // cm
export const CURRENCY = "£";

// Whether a leg can be offered for this shape/size/range combination.
export function legAvailable(
  leg: LegStyleOption,
  shapeId: ShapeId,
  size: SizeOption,
  rangeId: string | null
): boolean {
  if (!leg.compatibleShapes.includes(shapeId)) return false;
  if (leg.compatibleRanges && (!rangeId || !leg.compatibleRanges.includes(rangeId))) return false;
  if (leg.compatibleSizes && !leg.compatibleSizes.includes(size.id)) return false;
  if (leg.tableLengthRange && (size.length < leg.tableLengthRange[0] || size.length > leg.tableLengthRange[1])) return false;
  return true;
}
