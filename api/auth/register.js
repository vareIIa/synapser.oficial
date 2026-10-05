import { randomUUID } from "node:crypto";
import { cors, hashPassword, json, openSession, readJson } from "../../lib/auth.js";
import { db } from "../../lib/db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "POST") return json(res, 405, { error: "Método inválido." });
  try {
    const body = await readJson(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (name.length < 2 || name.length > 80) return json(res, 400, { error: "Diga seu nome." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: "E-mail inválido." });
    if (password.length < 8 || password.length > 80) return json(res, 400, { error: "A senha precisa de 8 caracteres." });
    const sql = await db();
    const existing = await sql`select id from users where email = ${email} limit 1`;
    if (existing.length) return json(res, 409, { error: "Esse e-mail já tem conta." });
    const id = randomUUID();
    await sql`insert into users (id, name, email, password_hash) values (${id}, ${name}, ${email}, ${hashPassword(password)})`;
    const token = await openSession(res, id);
    return json(res, 201, { token, user: { id, name, email, plan: "free", role: "user" } });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Não foi possível criar a conta." });
  }
}
