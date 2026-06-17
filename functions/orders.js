// functions/api/orders.js — admin: list orders. Auth required.
// GET /api/orders?from=YYYY-MM-DD&to=YYYY-MM-DD&status=paid
import { json, authed } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);

  const u = new URL(request.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const status = u.searchParams.get("status");

  let sql = "SELECT * FROM orders WHERE 1=1";
  const b = [];
  if (from)   { sql += " AND created_at >= ?"; b.push(from); }
  if (to)     { sql += " AND created_at <= ?"; b.push(to + "T23:59:59.999Z"); }
  if (status) { sql += " AND status = ?";      b.push(status); }
  sql += " ORDER BY created_at DESC LIMIT 500";

  const { results } = await env.DB.prepare(sql).bind(...b).all();
  return json({ orders: results });
}
