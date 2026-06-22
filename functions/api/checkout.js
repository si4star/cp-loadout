// functions/api/checkout.js
const CATALOG = {
  "tray:aos": { name: "The Loadout — Age of Sigmar",       price: 3600 },
  "tray:40k": { name: "The Loadout — Warhammer 40,000",    price: 3600 },
  "box":      { name: "Really Useful Tray A4",              price: 400  },
  "tok:aos":  { name: "Token Set — Age of Sigmar",          price: 1500 },
  "tok:40k":  { name: "Token Set — Warhammer 40,000",       price: 1500 },
};

const SHIPPING = [
  { name: "Evri — 2–4 working days", amount: 329, min: 2, max: 4 },
];

export async function onRequestPost({ request, env }) {
  try {
    const { items } = await request.json();

    const line_items = [];
    for (const sku in (items || {})) {
      if (!CATALOG[sku]) continue;
      const qty = Math.min(50, Math.max(0, parseInt(items[sku]) || 0));
      if (qty > 0) line_items.push(lineItem(CATALOG[sku].name, CATALOG[sku].price, qty));
    }
    if (line_items.length === 0) {
      return json({ error: "Cart is empty" }, 400);
    }

    const body = new URLSearchParams();
    body.append("mode", "payment");
    body.append("ui_mode", "embedded_page");
    body.append("return_url", `${env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`);
    body.append("shipping_address_collection[allowed_countries][0]", "GB");
    body.append("metadata[site]", "cp-loadout");
    body.append("custom_fields[0][key]", "mobile");
    body.append("custom_fields[0][label][type]", "custom");
    body.append("custom_fields[0][label][custom]", "Mobile number");
    body.append("custom_fields[0][type]", "text");
    body.append("custom_fields[0][optional]", "true");
    body.append("payment_intent_data[statement_descriptor_suffix]", "CP LOADOUT");
    line_items.forEach((li, i) => {
      body.append(`line_items[${i}][quantity]`, li.quantity);
      body.append(`line_items[${i}][price_data][currency]`, "gbp");
      body.append(`line_items[${i}][price_data][unit_amount]`, li.unit_amount);
      body.append(`line_items[${i}][price_data][product_data][name]`, li.name);
    });

    SHIPPING.forEach((s, i) => {
      const p = `shipping_options[${i}][shipping_rate_data]`;
      body.append(`${p}[type]`, "fixed_amount");
      body.append(`${p}[fixed_amount][amount]`, s.amount);
      body.append(`${p}[fixed_amount][currency]`, "gbp");
      body.append(`${p}[display_name]`, s.name);
      body.append(`${p}[delivery_estimate][minimum][unit]`, "business_day");
      body.append(`${p}[delivery_estimate][minimum][value]`, s.min);
      body.append(`${p}[delivery_estimate][maximum][unit]`, "business_day");
      body.append(`${p}[delivery_estimate][maximum][value]`, s.max);
    });

    body.append("allow_promotion_codes", "true");

    body.append("custom_text[submit][message]",
      "Made to order — dispatch can take longer during busy periods. We'll email you when your order is on its way.");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const session = await res.json();

    if (!res.ok) {
      console.error("Stripe error response:", JSON.stringify(session));
      throw new Error(session.error?.message || "Stripe error");
    }

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("checkout exception:", err.message);
    return json({ error: err.message }, 500);
  }
}

const lineItem = (name, unit_amount, quantity) => ({ name, unit_amount, quantity });
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
