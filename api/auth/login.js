import { checkPassword, cors, currentUser, json, openSession, readJson } from "../../lib/auth.js";
import { db } from "../../lib/db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "POST") return json(res, 405, { error: "Método inválido." });
  try {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const sql = await db();
    const rows = await sql`select id, password_hash from users where email = ${email} limit 1`;
    const user = rows[0];
    if (!user || !checkPassword(password, user.password_hash)) {
      return json(res, 401, { error: "E-mail ou senha não conferem." });
    }
    const token = await openSession(res, user.id);
    const session = await currentUser({ headers: { authorization: `Bearer ${token}` } });
    return json(res, 200, { token, user: session });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Não foi possível entrar." });
  }
}
