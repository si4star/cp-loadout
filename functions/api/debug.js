// functions/api/debug.js  — TEMPORARY. Delete after diagnosing.
// Returns which env vars are present at runtime (booleans only, no secret
// values) so we can see what the Functions actually receive.
export async function onRequestGet({ env }) {
  const keys = [
    "STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD",
    "FROM_EMAIL", "ADMIN_EMAIL", "SITE_URL",
  ];
  const present = {};
  for (const k of keys) present[k] = typeof env[k] === "string" && env[k].length > 0;
  const body = {
    present,
    pubKeyLength: (env.STRIPE_PUBLISHABLE_KEY || "").length,
    hasDB_binding: !!env.DB,
    envKeyCount: Object.keys(env || {}).length,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
