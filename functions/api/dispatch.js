// functions/api/dispatch.js — admin: mark dispatched + email customer. Auth required.
// POST /api/dispatch  { "id": 123, "tracking": "1550..." }
import { json, authed, sendEmail } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  if (!(await authed(request, env))) return json({ error: "unauthorized" }, 401);

  const { id, tracking } = await request.json();
  let order;
  try {
    order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  } catch (e) {
    console.error("dispatch db error:", e.message);
    return json({ error: "Database unavailable — try again in a minute" }, 503);
  }
  if (!order) return json({ error: "not found" }, 404);

  try {
    await env.DB.prepare(
      "UPDATE orders SET status = 'dispatched', tracking = ?, dispatched_at = ? WHERE id = ?"
    ).bind(tracking || "", new Date().toISOString(), id).run();
  } catch (e) {
    console.error("dispatch db error:", e.message);
    return json({ error: "Database unavailable — order NOT marked dispatched, no email sent" }, 503);
  }

  const trackHtml = tracking
    ? `<p>Evri tracking: <strong>${tracking}</strong><br>` +
      `<a href="https://www.evri.com/track-a-parcel#/reference/${encodeURIComponent(tracking)}">Track your parcel</a></p>`
    : "";

  await sendEmail(env, {
    to: order.customer_email,
    subject: "Your CP Loadout order is on its way",
    html: `<p>Good news — your order has been dispatched by Evri.</p>${trackHtml}`,
  });

  return json({ ok: true });
}
