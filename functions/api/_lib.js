// functions/api/_lib.js
// Shared helpers. Files starting with "_" aren't routed, only imported.

export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });

// Admin endpoints are gated by Cloudflare Access. We verify the Access JWT
// (set when you log in at the Access-protected /admin page) on every call, so
// the endpoints stay protected even if someone hits the raw *.pages.dev URL.
// Env: CF_ACCESS_TEAM_DOMAIN  e.g. "yourteam.cloudflareaccess.com"
//      CF_ACCESS_AUD          the Access application's Audience (AUD) tag
let _certs = { keys: null, at: 0 };

const b64urlBytes = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const b64urlStr = (s) => new TextDecoder().decode(b64urlBytes(s));

function accessToken(request) {
  const h = request.headers.get("Cf-Access-Jwt-Assertion");
  if (h) return h;
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? m[1] : null;
}

async function certs(team) {
  if (_certs.keys && Date.now() - _certs.at < 3600_000) return _certs.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  const data = await res.json();
  _certs = { keys: data.keys || [], at: Date.now() };
  return _certs.keys;
}

export async function authed(request, env) {
  const team = env.CF_ACCESS_TEAM_DOMAIN;
  if (!team) return false; // fail closed if Access isn't configured
  const token = accessToken(request);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(b64urlStr(parts[0]));
    const payload = JSON.parse(b64urlStr(parts[1]));
    if (payload.iss !== `https://${team}`) return false;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return false;
    if (env.CF_ACCESS_AUD) {
      const aud = payload.aud;
      const ok = Array.isArray(aud) ? aud.includes(env.CF_ACCESS_AUD) : aud === env.CF_ACCESS_AUD;
      if (!ok) return false;
    }
    const key = (await certs(team)).find((k) => k.kid === header.kid);
    if (!key) return false;
    const pub = await crypto.subtle.importKey(
      "jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
    );
    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", pub, b64urlBytes(parts[2]),
      new TextEncoder().encode(parts[0] + "." + parts[1])
    );
  } catch {
    return false;
  }
}

// Thin Stripe REST helper.
export async function stripe(env, path, method = "GET", form = null) {
  const opts = { method, headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } };
  if (form) {
    opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    opts.body = form.toString();
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe error");
  return data;
}

// Send mail via Resend. No-ops if no key set, so dev testing doesn't error.
export async function sendEmail(env, { to, subject, html, text }) {
  if (!env.RESEND_API_KEY || !to) return;
  const plain = text || String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "orders@cploadout.com",
      to,
      subject,
      html,
      text: plain,
    }),
  });
}

export const gbp = (p) => "£" + (Number(p || 0) / 100).toFixed(2);

// Token pick & mix master list (source: Simon's CSV, 2026-07-18).
// All tokens double-sided. sys: "gen" = fits both systems.
// per: physical tokens per pick (default 1) — a pick of a set counts per
// tokens toward the cap and costs per × TOKEN_PRICE.
export const TOKEN_PRICE = 30; // pence per token
export const TOKEN_CAP = 60;   // Token Holder rack capacity
export const TOKENS = {
  // Generic
  "hit":           { name: "Hit +/−",                            sys: "gen" },
  "wound":         { name: "Wound +/−",                          sys: "gen" },
  "generic-1-6":   { name: "Set of Numbered 1–6",                sys: "gen", per: 6 },
  "damage":        { name: "Damage +/−",                         sys: "gen" },
  "save":          { name: "Save +/−",                           sys: "gen" },
  // Warhammer 40,000
  "reroll-hits":   { name: "Reroll Hits / Reroll Wounds",        sys: "40k" },
  "cover":         { name: "Cover / Reroll Saves",               sys: "40k" },
  "moved":         { name: "Moved / Remained Stationary",        sys: "40k" },
  "advanced":      { name: "Advanced / Fell Back",               sys: "40k" },
  "hidden":        { name: "Hidden / Action",                    sys: "40k" },
  "secured":       { name: "Secured / Charged",                  sys: "40k" },
  "half-strength": { name: "Half Strength / Battle Shocked",     sys: "40k" },
  // Age of Sigmar
  "rend":          { name: "Rend +/−",                           sys: "aos" },
  "ward-6":        { name: "Ward 6 / No Ward",                   sys: "aos" },
  "ward-5":        { name: "Ward 5 / No Ward",                   sys: "aos" },
  "ward-4":        { name: "Ward 4 / No Ward",                   sys: "aos" },
  "ward-3":        { name: "Ward 3 / No Ward",                   sys: "aos" },
  "attack":        { name: "Attack +/−",                         sys: "aos" },
  "run-charge":    { name: "Run & Charge / Run, Shoot & Charge", sys: "aos" },
  "cast":          { name: "Cast +/−",                           sys: "aos" },
  "strikes":       { name: "Strikes First / Strikes Last",       sys: "aos" },
  "fugitive":      { name: "Fugitive / Hideout",                 sys: "aos" },
  "poisoned":      { name: "Poisoned",                           sys: "aos" },
  "finest-hour":   { name: "Finest Hour",                        sys: "aos" },
  "obscured":      { name: "Obscured / Overgrown",               sys: "aos" },
};

// "hit:10,wound:5" → [["hit",10],["wound",5]] (unknown ids dropped)
export const parseTokenManifest = (str) =>
  String(str || "")
    .split(",")
    .map((p) => p.split(":"))
    .filter(([id, q]) => TOKENS[id] && parseInt(q) > 0)
    .map(([id, q]) => [id, parseInt(q)]);
