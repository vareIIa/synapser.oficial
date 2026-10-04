import { cors, currentUser, json } from "../../lib/auth.js";
import { settleOrder } from "../../lib/settle.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") return json(res, 405, { error: "Método inválido." });
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: "Entre para ver o pagamento." });
    const id = String(req.query.id || "");
    const order = await settleOrder(id, user.id);
    if (!order) return json(res, 404, { error: "Pagamento não encontrado." });
    return json(res, 200, {
      id: order.id,
      plan: order.plan,
      status: order.status,
      method: order.method,
      brl: order.brl_cents,
    });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Não foi possível consultar o pagamento." });
  }
}
