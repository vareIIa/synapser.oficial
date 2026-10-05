import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db.js";

const SESSION_DAYS = 30;

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function cors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = origin === "https://synapseroficial.vercel.app"
    || origin.startsWith("http://127.0.0.1")
    || origin.startsWith("http://localhost");
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function checkPassword(password, stored) {
  const [kind, salt, hash] = String(stored).split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function cpfDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return null;
  const check = (length) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(digits[i]) * (length + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  if (check(9) !== Number(digits[9]) || check(10) !== Number(digits[10])) return null;
  return digits;
}

export function phoneParts(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length < 10 || local.length > 11) return null;
  return { country: "55", area: local.slice(0, 2), number: local.slice(2), digits: local };
}

export async function openSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  const sql = await db();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${hashToken(token)}, ${userId}, ${expires.toISOString()})`;
  const secure = process.env.VERCEL ? " Secure;" : "";
  res.setHeader("Set-Cookie", `syn_session=${token}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`);
  return token;
}

export function clearSession(res) {
  const secure = process.env.VERCEL ? " Secure;" : "";
  res.setHeader("Set-Cookie", `syn_session=; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=0`);
}

function tokenFrom(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)syn_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function currentUser(req) {
  const token = tokenFrom(req);
  if (!token) return null;
  const sql = await db();
  const rows = await sql`
    select u.id, u.name, u.email, u.cpf, u.phone, coalesce(e.plan, 'free') as plan
    from sessions s
    join users u on u.id = s.user_id
    left join entitlements e on e.user_id = u.id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now()
    limit 1
  `;
  return rows[0] || null;
}

export async function endSession(req) {
  const token = tokenFrom(req);
  if (!token) return;
  const sql = await db();
  await sql`delete from sessions where token_hash = ${hashToken(token)}`;
}
