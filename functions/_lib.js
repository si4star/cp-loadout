// functions/api/_lib.js
// Shared helpers. Files starting with "_" aren't routed, only imported.

export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });

// Admin endpoints require: Authorization: Bearer <ADMIN_TOKEN>
export function authed(request, env) {
  const h = request.headers.get("authorization") || "";
  return Boolean(env.ADMIN_TOKEN) && h === `Bearer ${env.ADMIN_TOKEN}`;
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
export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY || !to) return;
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
    }),
  });
}

export const gbp = (p) => "£" + (Number(p || 0) / 100).toFixed(2);
