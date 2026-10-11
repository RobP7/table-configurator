// Vercel serverless function — GET /api/shopify-install
//
// One-time helper: redirects to Shopify's OAuth consent screen so we can get
// a real Admin API access token without hunting for a "reveal token" button
// that doesn't exist for this app type. Visit this URL once in a browser,
// approve on your store, and /api/shopify-oauth-callback shows you the token.
//
// Required environment variables (set in Vercel project settings — never
// commit these or paste them in chat):
//   SHOPIFY_STORE_DOMAIN  e.g. "ufavp1-z0.myshopify.com"
//   SHOPIFY_CLIENT_ID     from the app's Credentials page
//   SHOPIFY_CLIENT_SECRET from the app's Credentials page

import crypto from "crypto";

interface VercelRequest {
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!storeDomain || !clientId) {
    res.status(500).send("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_CLIENT_ID in Vercel env vars.");
    return;
  }

  const host = req.headers["x-forwarded-host"] ?? req.headers["host"];
  const redirectUri = `https://${host}/api/shopify-oauth-callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const authorizeUrl = new URL(`https://${storeDomain}/admin/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", "write_draft_orders");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  res.setHeader("Set-Cookie", `shopify_oauth_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`);
  res.status(302);
  res.setHeader("Location", authorizeUrl.toString());
  res.send("");
}
