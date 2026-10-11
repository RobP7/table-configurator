// Vercel serverless function — GET /api/shopify-oauth-callback
//
// Finishes the one-time OAuth handshake started by /api/shopify-install:
// verifies the request really came from Shopify, exchanges the authorization
// code for a real Admin API access token, and shows it on screen ONCE so you
// can copy it into SHOPIFY_ADMIN_API_TOKEN in Vercel. Delete both this file
// and shopify-install.ts once you've done that — their job is done.
//
// Required environment variables (set in Vercel project settings — never
// commit these or paste them in chat):
//   SHOPIFY_STORE_DOMAIN  e.g. "ufavp1-z0.myshopify.com"
//   SHOPIFY_CLIENT_ID     from the app's Credentials page
//   SHOPIFY_CLIENT_SECRET from the app's Credentials page

import crypto from "crypto";

interface VercelRequest {
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
}

function htmlPage(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Shopify connection</title>
<style>body{font:15px/1.5 -apple-system,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#1e1c19}
code{background:#f0efe9;padding:2px 6px;border-radius:4px;word-break:break-all}
.token{display:block;background:#f0efe9;padding:14px;border-radius:8px;margin:12px 0;font-family:monospace;word-break:break-all}</style>
</head><body>${body}</body></html>`;
}

function getParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "text/html");

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!storeDomain || !clientId || !clientSecret) {
    res.status(500).send(htmlPage("<p>Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET in Vercel env vars.</p>"));
    return;
  }

  const code = getParam(req.query.code);
  const shop = getParam(req.query.shop);
  const hmac = getParam(req.query.hmac);
  const state = getParam(req.query.state);

  if (!code || !shop || !hmac) {
    res.status(400).send(htmlPage("<p>Missing code/shop/hmac in callback — did you reach this page directly instead of via /api/shopify-install?</p>"));
    return;
  }

  if (shop !== storeDomain) {
    res.status(400).send(htmlPage(`<p>Unexpected shop (${shop}) — expected ${storeDomain}.</p>`));
    return;
  }

  const cookieHeader = getParam(req.headers["cookie"]) ?? "";
  const cookieState = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("shopify_oauth_state="))
    ?.split("=")[1];
  if (!state || state !== cookieState) {
    res.status(400).send(htmlPage("<p>State mismatch — this request didn't originate from /api/shopify-install. Start again there.</p>"));
    return;
  }

  // Verify Shopify actually signed this request, per Shopify's documented
  // HMAC verification algorithm (sorted params, excluding hmac/signature).
  const params = { ...req.query };
  delete params.hmac;
  delete params.signature;
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${getParam(params[key])}`)
    .join("&");
  const computedHmac = crypto.createHmac("sha256", clientSecret).update(message).digest("hex");
  if (computedHmac !== hmac) {
    res.status(400).send(htmlPage("<p>HMAC verification failed — this request may not be from Shopify.</p>"));
    return;
  }

  const tokenRes = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    res.status(502).send(htmlPage(`<p>Shopify rejected the token exchange:</p><pre>${errorText}</pre>`));
    return;
  }

  const data = (await tokenRes.json()) as { access_token?: string };
  if (!data.access_token) {
    res.status(502).send(htmlPage("<p>Shopify did not return an access token.</p>"));
    return;
  }

  res.status(200).send(
    htmlPage(`
      <h1>Connected ✓</h1>
      <p>Copy this token into Vercel → Project Settings → Environment Variables, as <code>SHOPIFY_ADMIN_API_TOKEN</code>:</p>
      <code class="token">${data.access_token}</code>
      <p>Then redeploy, and delete <code>api/shopify-install.ts</code> and <code>api/shopify-oauth-callback.ts</code> from the repo — they've done their job and shouldn't stay live.</p>
    `)
  );
}
