// functions/api/dispatch.js — admin: mark dispatched + email customer. Auth required.
// POST /api/dispatch  { "id": 123, "tracking": "1550..." }
import { json, authed, sendEmail } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);

  const { id, tracking } = await request.json();
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  if (!order) return json({ error: "not found" }, 404);

  await env.DB.prepare(
    "UPDATE orders SET status = 'dispatched', tracking = ?, dispatched_at = ? WHERE id = ?"
  ).bind(tracking || "", new Date().toISOString(), id).run();

  const trackHtml = tracking
    ? `<p>DPD tracking: <strong>${tracking}</strong><br>` +
      `<a href="https://track.dpd.co.uk/search/${encodeURIComponent(tracking)}">Track your parcel</a></p>`
    : "";

  await sendEmail(env, {
    to: order.customer_email,
    subject: "Your CP Loadout order is on its way",
    html: `<p>Good news — your order has been dispatched by DPD.</p>${trackHtml}`,
  });

  return json({ ok: true });
}
