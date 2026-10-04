const PRODUCTION = "https://api.pagseguro.com";
const SANDBOX = "https://sandbox.api.pagseguro.com";

function base() {
  return process.env.PAGBANK_ENV === "production" ? PRODUCTION : SANDBOX;
}

function token() {
  const value = process.env.PAGBANK_TOKEN || "";
  if (!value) {
    const error = new Error("O PagBank ainda não está configurado.");
    error.status = 503;
    throw error;
  }
  return value;
}

async function pagbank(path, options = {}) {
  const response = await fetch(`${base()}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token()}`,
      accept: "application/json",
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const detail = body?.error_messages?.[0]?.description || body?.message || "O PagBank recusou o pedido.";
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return body;
}

export function isPaid(order) {
  const charges = Array.isArray(order?.charges) ? order.charges : [];
  if (charges.some((charge) => charge.status === "PAID")) return true;
  const qr = Array.isArray(order?.qr_codes) ? order.qr_codes : [];
  return qr.some((code) => code.status === "PAID");
}

export async function createPixOrder(input) {
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const order = await pagbank("/orders", {
    method: "POST",
    body: JSON.stringify({
      reference_id: input.reference,
      customer: input.customer,
      items: [input.item],
      qr_codes: [{ amount: { value: input.brlCents }, expiration_date: expires }],
      notification_urls: [input.notifyUrl],
    }),
  });
  const qr = order.qr_codes?.[0] || {};
  const png = (qr.links || []).find((link) => link.rel === "QRCODE.PNG")?.href || "";
  return { id: order.id, text: qr.text || "", png };
}

export async function createCardCheckout(input) {
  const checkout = await pagbank("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      reference_id: input.reference,
      customer: input.customer,
      items: [input.item],
      payment_methods: [{ type: "CREDIT_CARD" }, { type: "DEBIT_CARD" }],
      notification_urls: [input.notifyUrl],
      return_url: input.returnUrl,
    }),
  });
  const pay = (checkout.links || []).find((link) => link.rel === "PAY")?.href || "";
  if (!pay) throw new Error("O PagBank não devolveu o link do cartão.");
  return { id: checkout.id, url: pay };
}

export async function readOrder(id) {
  if (String(id).startsWith("CHEC_")) return pagbank(`/checkouts/${id}`);
  return pagbank(`/orders/${id}`);
}
