import { clearSession, cors, endSession, json } from "../../lib/auth.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "POST") return json(res, 405, { error: "Método inválido." });
  try {
    await endSession(req);
  } catch {
    /* sair localmente mesmo se o banco falhar */
  }
  clearSession(res);
  return json(res, 200, { ok: true });
}
