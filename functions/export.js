// functions/api/export.js — admin: CSV export with date filter. Auth required.
// GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD
import { authed } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) return new Response("unauthorized", { status: 401 });

  const u = new URL(request.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");

  let sql = "SELECT * FROM orders WHERE 1=1";
  const b = [];
  if (from) { sql += " AND created_at >= ?"; b.push(from); }
  if (to)   { sql += " AND created_at <= ?"; b.push(to + "T23:59:59.999Z"); }
  sql += " ORDER BY created_at DESC";

  const { results } = await env.DB.prepare(sql).bind(...b).all();

  const cols = [
    "created_at", "customer_name", "customer_email", "items_json", "shipping_method",
    "amount_total", "status", "tracking", "ship_name", "ship_line1", "ship_line2",
    "ship_city", "ship_postcode", "ship_country", "session_id",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = results.map((r) => cols.map((c) => esc(r[c])).join(","));
  const csv = [cols.join(","), ...rows].join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="cploadout-orders.csv"`,
    },
  });
}
