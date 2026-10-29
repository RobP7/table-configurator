// Vercel serverless function — POST /api/create-draft-order
//
// Takes the customer's selected ids (shape/size/range/color/leg/leg finish),
// recomputes the price SERVER-SIDE from the same catalog the app uses (never
// trusts a price sent from the browser — that would let anyone edit the
// price in devtools before checking out), creates a Shopify Draft Order via
// the Admin API with that price and the full configuration attached as
// readable line-item properties, and returns the invoice_url the customer
// should be sent to in order to pay.
//
// Required environment variables (set in Vercel project settings — never
// commit these or paste them in chat):
//   SHOPIFY_STORE_DOMAIN     e.g. "your-store.myshopify.com"
//   SHOPIFY_ADMIN_API_TOKEN  Admin API access token with write_draft_orders scope
//   ALLOWED_ORIGIN           (optional) storefront origin to allow via CORS,
//                            e.g. "https://your-store.myshopify.com" — defaults to "*"
//
// The catalog data below is duplicated from src/config/options.ts rather
// than imported. This project's Vercel deployment does not bundle/trace
// ANY local file import between /api functions — even a one-line sibling
// import causes every invocation to fail with FUNCTION_INVOCATION_FAILED
// before the handler runs (confirmed experimentally: a bare OPTIONS request
// crashed, and a diagnostic function importing a single trivial constant
// from a sibling file crashed the same way). Each /api file must be fully
// self-contained. Keep this data in sync with src/config/options.ts by hand
// whenever products/prices change.

type ShapeId = "rectangular" | "oval" | "round";
type MaterialId = "steel" | "oak";

interface SizeOption {
  id: string;
  label: string;
  shapeId: ShapeId;
  length: number; // cm
  priceModifier: number;
  compatibleRanges?: string[];
}

interface TopRangeOption {
  id: string;
  label: string;
  shapeId: ShapeId;
}

interface TopColorOption {
  id: string;
  label: string;
  priceModifier: number;
  compatibleRanges: string[];
}

interface LegStyleOption {
  id: string;
  label: string;
  material: MaterialId;
  compatibleShapes: ShapeId[];
  compatibleSizes?: string[];
  compatibleRanges?: string[];
  tableLengthRange?: [number, number];
  compatibleFinishes?: string[];
  priceModifier: number;
}

interface LegFinishOption {
  id: string;
  label: string;
  material: MaterialId;
  priceModifier: number;
}

interface ShapeOption {
  id: ShapeId;
  label: string;
  basePrice: number;
}

const SHAPES: ShapeOption[] = [
  { id: "rectangular", label: "Rectangular", basePrice: 899 },
  { id: "oval", label: "Oval", basePrice: 999 },
  { id: "round", label: "Round", basePrice: 849 },
];

const SIZES: SizeOption[] = [
  { id: "caradoc-160x100", label: "160 x 100 cm", shapeId: "rectangular", length: 160, priceModifier: 1300, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-180x100", label: "180 x 100 cm", shapeId: "rectangular", length: 180, priceModifier: 1583, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-200x100", label: "200 x 100 cm", shapeId: "rectangular", length: 200, priceModifier: 1867, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-220x100", label: "220 x 100 cm", shapeId: "rectangular", length: 220, priceModifier: 2150, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-240x100", label: "240 x 100 cm", shapeId: "rectangular", length: 240, priceModifier: 2433, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-260x100", label: "260 x 100 cm", shapeId: "rectangular", length: 260, priceModifier: 2717, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-280x100", label: "280 x 100 cm", shapeId: "rectangular", length: 280, priceModifier: 3000, compatibleRanges: ["the-caradoc"] },

  { id: "haughmond-160", label: "160cm", shapeId: "rectangular", length: 160, priceModifier: 1600, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-180", label: "180cm", shapeId: "rectangular", length: 180, priceModifier: 1796, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-200", label: "200cm", shapeId: "rectangular", length: 200, priceModifier: 1996, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-220", label: "220cm", shapeId: "rectangular", length: 220, priceModifier: 2200, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-240", label: "240cm", shapeId: "rectangular", length: 240, priceModifier: 2490, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-260", label: "260cm", shapeId: "rectangular", length: 260, priceModifier: 2680, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-280", label: "280cm", shapeId: "rectangular", length: 280, priceModifier: 2876, compatibleRanges: ["the-haughmond"] },
  { id: "haughmond-300", label: "300cm", shapeId: "rectangular", length: 300, priceModifier: 3086, compatibleRanges: ["the-haughmond"] },

  { id: "wrekin-160", label: "160cm", shapeId: "rectangular", length: 160, priceModifier: 1200, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-180", label: "180cm", shapeId: "rectangular", length: 180, priceModifier: 1396, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-200", label: "200cm", shapeId: "rectangular", length: 200, priceModifier: 1600, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-220", label: "220cm", shapeId: "rectangular", length: 220, priceModifier: 1790, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-240", label: "240cm", shapeId: "rectangular", length: 240, priceModifier: 1990, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-260", label: "260cm", shapeId: "rectangular", length: 260, priceModifier: 2200, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-280", label: "280cm", shapeId: "rectangular", length: 280, priceModifier: 2396, compatibleRanges: ["the-wrekin"] },
  { id: "wrekin-300", label: "300cm", shapeId: "rectangular", length: 300, priceModifier: 2600, compatibleRanges: ["the-wrekin"] },

  { id: "oval-130x70", label: "130 x 70 cm", shapeId: "oval", length: 130, priceModifier: 0 },
  { id: "oval-200x100", label: "200 x 100 cm", shapeId: "oval", length: 200, priceModifier: 120 },
  { id: "oval-200x110", label: "200 x 110 cm", shapeId: "oval", length: 200, priceModifier: 140 },
  { id: "oval-220x110", label: "220 x 110 cm", shapeId: "oval", length: 220, priceModifier: 170 },
  { id: "oval-240x100", label: "240 x 100 cm", shapeId: "oval", length: 240, priceModifier: 190 },
  { id: "oval-240x110", label: "240 x 110 cm", shapeId: "oval", length: 240, priceModifier: 210 },
  { id: "oval-260x120", label: "260 x 120 cm", shapeId: "oval", length: 260, priceModifier: 250 },
  { id: "oval-280x120", label: "280 x 120 cm", shapeId: "oval", length: 280, priceModifier: 290 },
  { id: "oval-300x120", label: "300 x 120 cm", shapeId: "oval", length: 300, priceModifier: 330 },

  { id: "round-100", label: "Ø 100 cm", shapeId: "round", length: 100, priceModifier: 500 },
  { id: "round-110", label: "Ø 110 cm", shapeId: "round", length: 110, priceModifier: 746 },
  { id: "round-120", label: "Ø 120 cm", shapeId: "round", length: 120, priceModifier: 846 },
];

const TOP_RANGES: TopRangeOption[] = [
  { id: "the-mynd", label: "The Mynd", shapeId: "round" },
  { id: "the-caradoc", label: "The Caradoc - Live Edge", shapeId: "rectangular" },
  { id: "the-haughmond", label: "The Haughmond", shapeId: "rectangular" },
  { id: "the-wrekin", label: "The Wrekin", shapeId: "rectangular" },
];

const TOP_COLORS: TopColorOption[] = [
  { id: "mynd-pure", label: "Pure", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-natural", label: "Natural", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-charcoal", label: "Charcoal", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-white-5", label: "White 5%", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-chocolate", label: "Chocolate", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dunes", label: "Dunes", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-shell-grey", label: "Shell Grey", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-macchiato", label: "Macchiato", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-affogato", label: "Affogato", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-almond", label: "Almond", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-arabica", label: "Arabica", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-ash-grey", label: "Ash Grey", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-black", label: "Black", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-bourbon", label: "Bourbon", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-castle-brown", label: "Castle Brown", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-cortado", label: "Cortado", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-cocoa", label: "Cocoa", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-cotton-white", label: "Cotton White", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dark-oak", label: "Dark Oak", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dark-roast", label: "Dark Roast", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-dulce", label: "Dulce", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-fern", label: "Fern", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-golden-hour", label: "Golden Hour", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-hazelnut", label: "Hazelnut", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-honey", label: "Honey", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-light-roast", label: "Light Roast", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-linen", label: "Linen", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-midnight-sky", label: "Midnight Sky", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-mist", label: "Mist", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-mist-5", label: "Mist 5%", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-mocha", label: "Mocha", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-oyster", label: "Oyster", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-red-velvet", label: "Red Velvet", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-smoke", label: "Smoke", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-smoke-5", label: "Smoke 5%", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-super-white", label: "Super White", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-vanilla", label: "Vanilla", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-vienna", label: "Vienna", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-walnut", label: "Walnut", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "mynd-white", label: "White", priceModifier: 0, compatibleRanges: ["the-mynd", "the-haughmond", "the-wrekin"] },
  { id: "caradoc-pure", label: "Pure", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-natural", label: "Natural", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-charcoal", label: "Charcoal", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-white-5", label: "White 5%", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-chocolate", label: "Chocolate", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dunes", label: "Dunes", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-shell-grey", label: "Shell Grey", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-macchiato", label: "Macchiato", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-affogato", label: "Affogato", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-almond", label: "Almond", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-arabica", label: "Arabica", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-ash-grey", label: "Ash Grey", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-black", label: "Black", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-bourbon", label: "Bourbon", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-castle-brown", label: "Castle Brown", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-cortado", label: "Cortado", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-cocoa", label: "Cocoa", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-cotton-white", label: "Cotton White", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dark-oak", label: "Dark Oak", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dark-roast", label: "Dark Roast", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-dulce", label: "Dulce", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-fern", label: "Fern", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-golden-hour", label: "Golden Hour", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-hazelnut", label: "Hazelnut", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-honey", label: "Honey", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-light-roast", label: "Light Roast", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-mist", label: "Mist", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-mist-5", label: "Mist 5%", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-mocha", label: "Mocha", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-oyster", label: "Oyster", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-red-velvet", label: "Red Velvet", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-smoke", label: "Smoke", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-smoke-5", label: "Smoke 5%", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-super-white", label: "Super White", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-vanilla", label: "Vanilla", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-vienna", label: "Vienna", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-white", label: "White", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-linen", label: "Linen", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-walnut", label: "Walnut", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
  { id: "caradoc-midnight-sky", label: "Midnight Sky", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
];

// The Haughmond's wooden trestle leg comes in the same palette as the top.
const WOOD_LEG_FINISHES: LegFinishOption[] = TOP_COLORS.filter((c) => c.id.startsWith("mynd-")).map(
  (c) => ({
    id: `wood-leg-${c.id.slice("mynd-".length)}`,
    label: c.label,
    material: "oak" as const,
    priceModifier: 0,
  })
);

const STEEL_LEG_FINISH_IDS = ["steel-black", "steel-white"];

const LEG_STYLES: LegStyleOption[] = [
  {
    id: "mynd-pedestal",
    label: "The Mynd Pedestal",
    material: "steel",
    compatibleShapes: ["round"],
    compatibleFinishes: ["steel-black", "steel-white"],
    priceModifier: 0,
  },
  {
    id: "haughmond-trestle",
    label: "Wooden Trestle",
    material: "oak",
    compatibleShapes: ["rectangular"],
    compatibleRanges: ["the-haughmond"],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "haughmond-metal-u",
    label: "Steel U-Frame",
    material: "steel",
    compatibleShapes: ["rectangular"],
    compatibleRanges: ["the-haughmond"],
    compatibleFinishes: ["steel-black"],
    priceModifier: 0,
  },
  {
    id: "wrekin-star",
    label: "Steel Star Base",
    material: "steel",
    compatibleShapes: ["rectangular"],
    compatibleRanges: ["the-wrekin"],
    compatibleFinishes: ["steel-black"],
    priceModifier: 0,
  },
  {
    id: "bold-center-double-x",
    label: "Triple X-Base",
    material: "steel",
    compatibleShapes: ["rectangular"],
    compatibleFinishes: ["steel-bronze-patina", "steel-black", "steel-white"],
    priceModifier: 0,
  },
  {
    id: "ul-u",
    label: "Ultra Light U",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "ul-trapez",
    label: "Ultra Light Trapez",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "ul-spider-long",
    label: "Ultra Light Spider Long",
    material: "steel",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "ul-x",
    label: "Ultra Light X",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "ul-3d-spider-long",
    label: "Ultra Light 3D Spider Long",
    material: "steel",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "ul-3d-x",
    label: "Ultra Light 3D X",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "ul-3d-butterfly",
    label: "Ultra Light 3D Butterfly",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "ul-3d-quattro",
    label: "Ultra Light 3D Quattro",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-x-steel",
    label: "Light X (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [160, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-u-steel",
    label: "Light U (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [160, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-quattro",
    label: "Light Quattro",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-trapez-steel",
    label: "Light Trapez (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-a-steel",
    label: "Light A (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-spider-steel",
    label: "Light Spider (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-spider-slim-steel",
    label: "Light Spider Slim (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-spider-round-bar-steel",
    label: "Light Spider Round Bar (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "conference-adjust",
    label: "Conference Adjust",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "bold-x-steel",
    label: "Bold X (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "bold-center-x",
    label: "Bold Center X",
    material: "steel",
    compatibleShapes: ["rectangular"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "bold-spider-steel",
    label: "Bold Spider (Steel)",
    material: "steel",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: STEEL_LEG_FINISH_IDS,
    priceModifier: 0,
  },
  {
    id: "light-x-oak",
    label: "Light X (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "light-u-oak",
    label: "Light U (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "light-a-oak",
    label: "Light A (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "light-spider-oak-140",
    label: "Light Spider 140 (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "light-spider-oak-180",
    label: "Light Spider 180 (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular", "oval"],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "light-trapez-oak",
    label: "Light Trapez (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "bold-x-oak",
    label: "Bold X (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "bold-a-oak",
    label: "Bold A (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "bold-h-oak",
    label: "Bold H (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [200, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
  {
    id: "bold-tempel-oak",
    label: "Bold Tempel (Oak)",
    material: "oak",
    compatibleShapes: ["rectangular"],
    tableLengthRange: [180, 300],
    compatibleFinishes: WOOD_LEG_FINISHES.map((f) => f.id),
    priceModifier: 0,
  },
];

const LEG_FINISHES: LegFinishOption[] = [
  { id: "steel-black", label: "Matte Black Steel", material: "steel", priceModifier: 0 },
  { id: "steel-white", label: "Matte White Steel", material: "steel", priceModifier: 0 },
  { id: "steel-brass", label: "Brushed Brass", material: "steel", priceModifier: 70 },
  { id: "steel-bronze-patina", label: "Aged Bronze Steel", material: "steel", priceModifier: 0 },
  { id: "wood-oak", label: "Natural Oak (matching top)", material: "oak", priceModifier: 0 },
  { id: "wood-black", label: "Black Stained Oak", material: "oak", priceModifier: 40 },
  ...WOOD_LEG_FINISHES,
];

interface OrderRequestBody {
  shapeId?: string;
  sizeId?: string;
  topRangeId?: string;
  topColorId?: string;
  legStyleId?: string;
  legFinishId?: string;
}

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: () => void;
}

function resolveConfig(body: OrderRequestBody) {
  const shape = SHAPES.find((s) => s.id === body.shapeId);
  const size = SIZES.find((s) => s.id === body.sizeId);
  const topRange = TOP_RANGES.find((r) => r.id === body.topRangeId);
  const topColor = TOP_COLORS.find((c) => c.id === body.topColorId);
  const legStyle = LEG_STYLES.find((l) => l.id === body.legStyleId);
  const legFinish = LEG_FINISHES.find((f) => f.id === body.legFinishId);

  if (!shape || !size || !topRange || !topColor || !legStyle || !legFinish) {
    return null;
  }

  // Basic consistency checks so a tampered/stale request can't slip through
  // with mismatched pieces (e.g. a round size with a rectangular-only leg).
  if (size.shapeId !== shape.id || topRange.shapeId !== shape.id) return null;
  if (size.compatibleRanges && !size.compatibleRanges.includes(topRange.id)) return null;
  if (!topColor.compatibleRanges.includes(topRange.id)) return null;
  if (!legStyle.compatibleShapes.includes(shape.id)) return null;
  if (legStyle.compatibleRanges && !legStyle.compatibleRanges.includes(topRange.id)) return null;
  if (legStyle.compatibleSizes && !legStyle.compatibleSizes.includes(size.id)) return null;
  if (
    legStyle.tableLengthRange &&
    (size.length < legStyle.tableLengthRange[0] || size.length > legStyle.tableLengthRange[1])
  ) {
    return null;
  }
  if (legFinish.material !== legStyle.material) return null;
  if (legStyle.compatibleFinishes && !legStyle.compatibleFinishes.includes(legFinish.id)) {
    return null;
  }

  const total =
    shape.basePrice +
    size.priceModifier +
    topColor.priceModifier +
    legStyle.priceModifier +
    legFinish.priceModifier;

  return { shape, size, topRange, topColor, legStyle, legFinish, total };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const adminToken = process.env.SHOPIFY_ADMIN_API_TOKEN?.trim();
  if (!storeDomain || !adminToken) {
    const missing = [
      !storeDomain && "SHOPIFY_STORE_DOMAIN",
      !adminToken && "SHOPIFY_ADMIN_API_TOKEN",
    ].filter(Boolean);
    res.status(500).json({
      error: "Server is not configured (missing Shopify credentials)",
      missing,
    });
    return;
  }

  const body = (req.body ?? {}) as OrderRequestBody;
  const resolved = resolveConfig(body);
  if (!resolved) {
    res.status(400).json({ error: "Invalid or incompatible configuration" });
    return;
  }

  const { shape, size, topRange, topColor, legStyle, legFinish, total } = resolved;

  const shopifyRes = await fetch(
    `https://${storeDomain}/admin/api/2024-01/draft_orders.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({
        draft_order: {
          line_items: [
            {
              title: `Custom Table — ${topRange.label}`,
              price: total.toFixed(2),
              quantity: 1,
              properties: [
                { name: "Shape", value: shape.label },
                { name: "Size", value: size.label },
                { name: "Range", value: topRange.label },
                { name: "Finish", value: topColor.label },
                { name: "Leg Style", value: legStyle.label },
                { name: "Leg Finish", value: legFinish.label },
              ],
            },
          ],
          use_customer_default_address: true,
        },
      }),
    }
  );

  if (!shopifyRes.ok) {
    const errorText = await shopifyRes.text();
    res.status(502).json({ error: "Shopify rejected the draft order", details: errorText });
    return;
  }

  const data = await shopifyRes.json();
  const checkoutUrl = data?.draft_order?.invoice_url;
  if (!checkoutUrl) {
    res.status(502).json({ error: "Shopify did not return a checkout URL" });
    return;
  }

  res.status(200).json({ checkoutUrl, total });
}
