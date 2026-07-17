// functions/api/refund.js — admin: cancel & refund an order. Auth required.
// POST /api/refund  { "id": 123 }
import { json, authed, stripe, sendEmail, gbp } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  if (!(await authed(request, env))) return json({ error: "unauthorized" }, 401);

  const { id } = await request.json();
  let order;
  try {
    order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  } catch (e) {
    console.error("refund db error:", e.message);
    return json({ error: "Database unavailable — no refund issued, try again in a minute" }, 503);
  }
  if (!order) return json({ error: "not found" }, 404);
  if (order.status === "refunded") return json({ error: "already refunded" }, 400);
  if (!order.payment_intent) return json({ error: "no payment to refund" }, 400);

  const form = new URLSearchParams();
  form.append("payment_intent", order.payment_intent);
  await stripe(env, "refunds", "POST", form);

  try {
    await env.DB.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").bind(id).run();
  } catch (e) {
    // Stripe refund HAS been issued at this point — say so explicitly.
    console.error("refund db error after Stripe refund:", e.message);
    return json({ error: "Refund WAS issued via Stripe, but the order status couldn't be saved (database unavailable). Do not refund again — update the status once the database is back." }, 500);
  }

  await sendEmail(env, {
    to: order.customer_email,
    subject: "Your CP Loadout order has been cancelled & refunded",
    html:
      `<p>We've cancelled and refunded your order for ${gbp(order.amount_total)}.</p>` +
      `<p>The refund should land back on your card within a few working days.</p>`,
  });

  return json({ ok: true });
}
