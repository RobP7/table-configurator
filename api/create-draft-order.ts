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

import {
  SHAPES,
  SIZES,
  TOP_RANGES,
  TOP_COLORS,
  LEG_STYLES,
  LEG_FINISHES,
} from "./catalog";

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

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!storeDomain || !adminToken) {
    res.status(500).json({ error: "Server is not configured (missing Shopify credentials)" });
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
