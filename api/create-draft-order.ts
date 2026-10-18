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
  priceModifier: number;
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
  { id: "rect-160x90", label: "160 x 90 cm", shapeId: "rectangular", priceModifier: 0 },
  { id: "rect-180x90", label: "180 x 90 cm", shapeId: "rectangular", priceModifier: 40 },
  { id: "rect-200x100", label: "200 x 100 cm", shapeId: "rectangular", priceModifier: 90 },
  { id: "rect-220x100", label: "220 x 100 cm", shapeId: "rectangular", priceModifier: 140 },
  { id: "rect-240x100", label: "240 x 100 cm", shapeId: "rectangular", priceModifier: 190 },
  { id: "rect-260x110", label: "260 x 110 cm", shapeId: "rectangular", priceModifier: 240 },
  { id: "rect-280x110", label: "280 x 110 cm", shapeId: "rectangular", priceModifier: 290 },
  { id: "rect-300x110", label: "300 x 110 cm", shapeId: "rectangular", priceModifier: 340 },

  { id: "oval-130x70", label: "130 x 70 cm", shapeId: "oval", priceModifier: 0 },
  { id: "oval-200x100", label: "200 x 100 cm", shapeId: "oval", priceModifier: 120 },
  { id: "oval-200x110", label: "200 x 110 cm", shapeId: "oval", priceModifier: 140 },
  { id: "oval-220x110", label: "220 x 110 cm", shapeId: "oval", priceModifier: 170 },
  { id: "oval-240x100", label: "240 x 100 cm", shapeId: "oval", priceModifier: 190 },
  { id: "oval-240x110", label: "240 x 110 cm", shapeId: "oval", priceModifier: 210 },
  { id: "oval-260x120", label: "260 x 120 cm", shapeId: "oval", priceModifier: 250 },
  { id: "oval-280x120", label: "280 x 120 cm", shapeId: "oval", priceModifier: 290 },
  { id: "oval-300x120", label: "300 x 120 cm", shapeId: "oval", priceModifier: 330 },

  { id: "round-100", label: "Ø 100 cm", shapeId: "round", priceModifier: 500 },
  { id: "round-110", label: "Ø 110 cm", shapeId: "round", priceModifier: 746 },
  { id: "round-120", label: "Ø 120 cm", shapeId: "round", priceModifier: 846 },
];

const TOP_RANGES: TopRangeOption[] = [
  { id: "the-mynd", label: "The Mynd", shapeId: "round" },
  { id: "the-caradoc", label: "The Caradoc - Live Edge", shapeId: "rectangular" },
];

const TOP_COLORS: TopColorOption[] = [
  { id: "mynd-pure", label: "Pure", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-natural", label: "Natural", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-charcoal", label: "Charcoal", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-white-5", label: "White 5%", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-chocolate", label: "Chocolate", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-dunes", label: "Dunes", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-shell-grey", label: "Shell Grey", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-macchiato", label: "Macchiato", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-affogato", label: "Affogato", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-almond", label: "Almond", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-arabica", label: "Arabica", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-ash-grey", label: "Ash Grey", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-black", label: "Black", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-bourbon", label: "Bourbon", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-castle-brown", label: "Castle Brown", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-cortado", label: "Cortado", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-cocoa", label: "Cocoa", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-cotton-white", label: "Cotton White", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-dark-oak", label: "Dark Oak", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-dark-roast", label: "Dark Roast", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-dulce", label: "Dulce", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-fern", label: "Fern", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-golden-hour", label: "Golden Hour", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-hazelnut", label: "Hazelnut", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-honey", label: "Honey", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-light-roast", label: "Light Roast", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-linen", label: "Linen", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-midnight-sky", label: "Midnight Sky", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-mist", label: "Mist", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-mist-5", label: "Mist 5%", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-mocha", label: "Mocha", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-oyster", label: "Oyster", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-red-velvet", label: "Red Velvet", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-smoke", label: "Smoke", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-smoke-5", label: "Smoke 5%", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-super-white", label: "Super White", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-vanilla", label: "Vanilla", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-vienna", label: "Vienna", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-walnut", label: "Walnut", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "mynd-white", label: "White", priceModifier: 0, compatibleRanges: ["the-mynd"] },
  { id: "caradoc-natural", label: "Natural Oak", priceModifier: 0, compatibleRanges: ["the-caradoc"] },
];

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
    id: "caradoc-triple-x",
    label: "Triple X-Base",
    material: "steel",
    compatibleShapes: ["rectangular"],
    compatibleFinishes: ["steel-bronze-patina"],
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
  if (!topColor.compatibleRanges.includes(topRange.id)) return null;
  if (!legStyle.compatibleShapes.includes(shape.id)) return null;
  if (legStyle.compatibleSizes && !legStyle.compatibleSizes.includes(size.id)) return null;
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
