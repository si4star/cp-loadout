// functions/api/checkout.js
// Cloudflare Pages Function — creates a Stripe embedded Checkout Session.
// Same shape as your Comic Stencils checkout. Server computes the price so
// the client can't tamper with it.
//
// Required env vars (Cloudflare Pages > Settings > Environment variables):
//   STRIPE_SECRET_KEY   sk_live_...
//   SITE_URL            https://cploadout.com   (for the return URL)

const PRICES = { tray: 2500, aos: 1500 }; // pence — keep in sync with the front-end

// TODO: real parcel postage. This is a boxed parcel, not a large letter,
// so the Comic Stencils £2.00 / £3.50 rates do NOT apply. Options:
//   (a) one flat parcel rate, or
//   (b) Stripe shipping_options with proper Royal Mail/Evri pricing.
const POSTAGE_PENCE = 0; // <-- set this

export async function onRequestPost({ request, env }) {
  try {
    const { items } = await request.json();
    const qtyTray = Math.max(0, parseInt(items?.tray) || 0);
    const qtyAos  = Math.max(0, parseInt(items?.aos)  || 0);
    if (qtyTray + qtyAos === 0) {
      return json({ error: "Cart is empty" }, 400);
    }

    const line_items = [];
    if (qtyTray) line_items.push(lineItem("The Loadout Tray", PRICES.tray, qtyTray));
    if (qtyAos)  line_items.push(lineItem("Age of Sigmar Token Set", PRICES.aos, qtyAos));
    if (POSTAGE_PENCE > 0) line_items.push(lineItem("Postage", POSTAGE_PENCE, 1));

    // Build the Stripe Checkout Session (embedded UI mode).
    const body = new URLSearchParams();
    body.append("mode", "payment");
    body.append("ui_mode", "embedded");
    body.append("return_url", `${env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`);
    body.append("shipping_address_collection[allowed_countries][0]", "GB");
    // Shared Stripe account with Comic Stencils — tag the order so you can tell
    // the two stores apart in the dashboard and in your webhook handler.
    body.append("metadata[site]", "cp-loadout");
    // So the customer's bank statement reads CP LOADOUT, not COMIC STENCILS.
    // NOTE: appended to your account's statement-descriptor prefix; total is
    // capped at 22 chars, so trim if Stripe rejects it.
    body.append("payment_intent_data[statement_descriptor_suffix]", "CP LOADOUT");
    line_items.forEach((li, i) => {
      body.append(`line_items[${i}][quantity]`, li.quantity);
      body.append(`line_items[${i}][price_data][currency]`, "gbp");
      body.append(`line_items[${i}][price_data][unit_amount]`, li.unit_amount);
      body.append(`line_items[${i}][price_data][product_data][name]`, li.name);
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const session = await res.json();
    if (!res.ok) throw new Error(session.error?.message || "Stripe error");

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

const lineItem = (name, unit_amount, quantity) => ({ name, unit_amount, quantity });
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
