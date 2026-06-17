// functions/api/webhook.js
// Point a Stripe webhook endpoint at https://cploadout.com/api/webhook
// listening for: checkout.session.completed
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY,
//      FROM_EMAIL, ADMIN_EMAIL, and the D1 binding "DB".

import { json, stripe, sendEmail, gbp } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  if (!(await verify(body, sig, env.STRIPE_WEBHOOK_SECRET))) {
    return json({ error: "bad signature" }, 400);
  }

  const event = JSON.parse(body);
  if (event.type !== "checkout.session.completed") {
    return json({ received: true });
  }

  // Pull the full session with the bits we need.
  const s = await stripe(
    env,
    `checkout/sessions/${event.data.object.id}` +
      `?expand[]=line_items&expand[]=customer_details&expand[]=shipping_cost.shipping_rate`
  );

  const ship = s.collected_information?.shipping_details || s.shipping_details || {};
  const addr = ship.address || s.customer_details?.address || {};
  const items = (s.line_items?.data || []).map((li) => ({
    name: li.description,
    qty: li.quantity,
    amount: li.amount_total,
  }));

  const o = {
    session_id: s.id,
    payment_intent: s.payment_intent || "",
    created_at: new Date().toISOString(),
    customer_name: s.customer_details?.name || ship.name || "",
    customer_email: s.customer_details?.email || "",
    ship_name: ship.name || s.customer_details?.name || "",
    ship_line1: addr.line1 || "",
    ship_line2: addr.line2 || "",
    ship_city: addr.city || "",
    ship_postcode: addr.postal_code || "",
    ship_country: addr.country || "",
    items_json: JSON.stringify(items),
    shipping_method: s.shipping_cost?.shipping_rate?.display_name || "",
    amount_total: s.amount_total || 0,
    currency: s.currency || "gbp",
  };

  let res;
  try {
    res = await env.DB.prepare(
      `INSERT OR IGNORE INTO orders
       (session_id,payment_intent,created_at,customer_name,customer_email,ship_name,
        ship_line1,ship_line2,ship_city,ship_postcode,ship_country,items_json,
        shipping_method,amount_total,currency,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'paid')`
    )
      .bind(
        o.session_id, o.payment_intent, o.created_at, o.customer_name, o.customer_email,
        o.ship_name, o.ship_line1, o.ship_line2, o.ship_city, o.ship_postcode,
        o.ship_country, o.items_json, o.shipping_method, o.amount_total, o.currency
      )
      .run();
  } catch (e) {
    // Real DB error — return 500 so Stripe retries and we don't lose the order.
    return json({ error: "db" }, 500);
  }

  // Duplicate webhook delivery (row already existed) — don't email again.
  if (!res?.meta?.changes) return json({ received: true, duplicate: true });

  const itemsHtml = items.map((i) => `${i.qty} × ${i.name} — ${gbp(i.amount)}`).join("<br>");
  const addressHtml = [o.ship_name, o.ship_line1, o.ship_line2, o.ship_city, o.ship_postcode, o.ship_country]
    .filter(Boolean)
    .join("<br>");

  // Customer receipt
  await sendEmail(env, {
    to: o.customer_email,
    subject: "Your CP Loadout order is confirmed",
    html:
      `<h2>Thanks for your order</h2><p>${itemsHtml}</p>` +
      `<p><strong>Delivery:</strong> ${o.shipping_method}</p>` +
      `<p><strong>Total paid:</strong> ${gbp(o.amount_total)}</p>` +
      `<p>Everything's made to order — we'll email you the moment it's on its way by DPD.</p>`,
  });

  // Admin notification
  await sendEmail(env, {
    to: env.ADMIN_EMAIL || env.FROM_EMAIL,
    subject: `New CP Loadout order — ${gbp(o.amount_total)}`,
    html:
      `<p><strong>${o.customer_name}</strong> (${o.customer_email})</p>` +
      `<p>${itemsHtml}</p><p><strong>${o.shipping_method}</strong></p>` +
      `<p>${addressHtml}</p>`,
  });

  return json({ received: true });
}

// Verify a Stripe signature header with Web Crypto (no SDK).
async function verify(payload, header, secret) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const { t, v1 } = parts;
  if (!t || !v1) return false;

  // Reject stale events (replay protection): 5-minute tolerance.
  const age = Math.floor(Date.now() / 1000) - Number(t);
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
