import { cors, currentUser, json } from "../lib/auth.js";
import { db } from "../lib/db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") return json(res, 405, { error: "Método inválido." });
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: "Entre para continuar." });
    const sql = await db();
    const orders = await sql`
      select id, plan, method, status, usd_cents, brl_cents, created_at, paid_at
      from orders
      where user_id = ${user.id}
      order by created_at desc
      limit 8
    `;
    return json(res, 200, { user, orders });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Não foi possível ler a conta." });
  }
}
