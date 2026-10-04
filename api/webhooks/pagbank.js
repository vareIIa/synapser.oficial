import { json, readJson } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { settleOrder } from "../../lib/settle.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Método inválido." });
  try {
    const body = await readJson(req);
    const providerId = body.id || body.charges?.[0]?.id || "";
    const reference = body.reference_id || "";
    const sql = await db();
    const rows = await sql`
      select id from orders
      where provider_order_id = ${providerId} or id = ${reference}
      limit 1
    `;
    if (rows[0]) await settleOrder(rows[0].id);
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Webhook não aplicado." });
  }
}
