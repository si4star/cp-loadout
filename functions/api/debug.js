// functions/api/debug.js — TEMPORARY. Delete after diagnosing.
// Dumps exact variable NAMES present at runtime (no values), plus which
// branch/deployment is serving — to spot typos, trailing spaces, or a
// preview-vs-production mismatch.
export async function onRequestGet({ env }) {
  const names = Object.keys(env || {}).sort();
  const body = {
    keyNames: names,
    branch: env.CF_PAGES_BRANCH ?? null,
    deploymentUrl: env.CF_PAGES_URL ?? null,
    lengths: {
      STRIPE_PUBLISHABLE_KEY: (env.STRIPE_PUBLISHABLE_KEY || "").length,
      STRIPE_SECRET_KEY: (env.STRIPE_SECRET_KEY || "").length,
      FROM_EMAIL: (env.FROM_EMAIL || "").length,
    },
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
