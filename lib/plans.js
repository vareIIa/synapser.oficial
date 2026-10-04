export const OFFERS = {
  pro: { title: "Pro", usdCents: 990, context: "2M", model: "GPT 6 Models" },
  max: { title: "Max", usdCents: 1990, context: "20M", model: "GPT 6.1 Models" },
};

export async function brlQuote() {
  const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
  if (!response.ok) throw new Error("Não foi possível converter o dólar para o real.");
  const body = await response.json();
  const rate = Number(body?.USDBRL?.bid);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Cotação do dólar inválida.");
  return rate;
}

export function brlCents(usdCents, rate) {
  return Math.round((usdCents / 100) * rate * 100);
}

export function money(cents) {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
