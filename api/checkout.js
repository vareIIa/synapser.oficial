import { randomUUID } from "node:crypto";
import { cors, cpfDigits, currentUser, json, phoneParts, readJson } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { createCardCheckout, createPixOrder } from "../lib/pagbank.js";
import { OFFERS, brlCents, brlQuote } from "../lib/plans.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "POST") return json(res, 405, { error: "Método inválido." });
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: "Entre para assinar." });
    const body = await readJson(req);
    const offer = OFFERS[body.plan];
    const method = body.method === "card" ? "card" : body.method === "pix" ? "pix" : "";
    if (!offer || !method) return json(res, 400, { error: "Escolha Pro ou Max, no PIX ou no cartão." });
    const cpf = cpfDigits(body.cpf);
    const phone = phoneParts(body.phone);
    if (!cpf) return json(res, 400, { error: "CPF inválido." });
    if (!phone) return json(res, 400, { error: "Celular inválido." });
    const rate = await brlQuote();
    const cents = brlCents(offer.usdCents, rate);
    const id = randomUUID();
    const sql = await db();
    await sql`update users set cpf = ${cpf}, phone = ${phone.digits} where id = ${user.id}`;
    const origin = "https://synapseroficial.vercel.app";
    const customer = {
      name: user.name,
      email: user.email,
      tax_id: cpf,
      phones: [{ country: phone.country, area: phone.area, number: phone.number, type: "MOBILE" }],
    };
    const item = { reference_id: id, name: `Synapser ${offer.title}`, quantity: 1, unit_amount: cents };
    const notifyUrl = `${origin}/api/webhooks/pagbank`;
    const created = method === "pix"
      ? await createPixOrder({ reference: id, customer, item, brlCents: cents, notifyUrl })
      : await createCardCheckout({ reference: id, customer, item, notifyUrl, returnUrl: `${origin}/#planos?pedido=${id}` });
    await sql`
      insert into orders (id, user_id, plan, method, status, usd_cents, brl_cents, fx_rate, provider_order_id, pix_text, pix_png, checkout_url)
      values (${id}, ${user.id}, ${body.plan}, ${method}, 'pending', ${offer.usdCents}, ${cents}, ${rate}, ${created.id}, ${created.text || null}, ${created.png || null}, ${created.url || null})
    `;
    return json(res, 201, {
      id,
      plan: body.plan,
      method,
      status: "pending",
      usd: offer.usdCents,
      brl: cents,
      rate,
      pixText: created.text || "",
      pixPng: created.png || "",
      checkoutUrl: created.url || "",
    });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Não foi possível abrir o pagamento." });
  }
}
