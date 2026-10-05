const account = document.querySelector("#account");
const accountForm = document.querySelector("#account-form");
const accountTitle = document.querySelector("#account-title");
const accountLead = document.querySelector("#account-lead");
const accountNote = document.querySelector("#account-note");
const accountUser = document.querySelector("#account-user");
const accountFields = document.querySelector("#account-fields");
const accountName = document.querySelector("#account-name-label");
const accountSubmit = document.querySelector("#account-submit");
const accountSwitch = document.querySelector("#account-switch");
const pay = document.querySelector("#pagamento");
const payTitle = document.querySelector("#pay-title");
const payAmount = document.querySelector("#pay-amount");
const payHelp = document.querySelector("#pay-help");
const payNote = document.querySelector("#pay-note");
const payForm = document.querySelector("#pay-form");
const payResult = document.querySelector("#pay-result");
const payQr = document.querySelector("#pay-qr");
const payCopy = document.querySelector("#pay-copy");
const payStatus = document.querySelector("#pay-status");
const offers = {
  pro: { title: "Pro", amount: "US$ 9,90" },
  max: { title: "Max", amount: "US$ 19,90" },
};

let mode = "login";
let method = "pix";
let selected = "pro";
let poll;

function token() {
  return localStorage.getItem("synapse.account") || "";
}

function authHeaders() {
  const current = token();
  return current ? { authorization: `Bearer ${current}`, "content-type": "application/json" } : { "content-type": "application/json" };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Não foi possível concluir.");
  return body;
}

function paintAccount(user) {
  const button = document.querySelector("#open-account");
  if (!user) {
    button.textContent = "Entrar";
    accountUser.hidden = true;
    accountFields.hidden = false;
    accountSubmit.hidden = false;
    accountSwitch.hidden = false;
    return;
  }
  button.textContent = user.name.split(" ")[0];
  accountTitle.textContent = user.name;
  accountLead.textContent = user.role === "admin"
    ? "Admin. O Synapser usa a chave GPT-6 Luna guardada neste PC."
    : user.plan === "free" ? "Plano Free. O Synapser entra no Pro ou no Max." : `Plano ${user.plan === "max" ? "Max" : "Pro"} liberado.`;
  accountUser.hidden = false;
  accountUser.textContent = user.email;
  accountFields.hidden = true;
  accountSubmit.hidden = true;
  accountSwitch.hidden = true;
}

function openAccount() {
  accountNote.textContent = "";
  if (typeof account.showModal === "function") account.showModal();
  else account.setAttribute("open", "");
}

document.querySelector("#open-account")?.addEventListener("click", openAccount);
document.querySelector("#open-account-sheet")?.addEventListener("click", () => {
  document.querySelector("#mobile-menu")?.setAttribute("hidden", "");
  openAccount();
});
document.querySelector("#account-close")?.addEventListener("click", () => account.close());
accountSwitch?.addEventListener("click", () => {
  mode = mode === "login" ? "register" : "login";
  accountTitle.textContent = mode === "login" ? "Entrar" : "Criar conta";
  accountSubmit.textContent = mode === "login" ? "Entrar" : "Criar conta";
  accountSwitch.textContent = mode === "login" ? "Criar conta" : "Já tenho conta";
  accountName.hidden = mode === "login";
});

accountForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (accountFields.hidden) return;
  accountNote.textContent = "Salvando…";
  const data = new FormData(accountForm);
  try {
    const body = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    localStorage.setItem("synapse.account", body.token);
    paintAccount(body.user);
    accountNote.textContent = "Conta pronta.";
  } catch (error) {
    accountNote.textContent = error.message;
  }
});

function showMethod(next) {
  method = next;
  document.querySelector("#tab-pix").setAttribute("aria-selected", next === "pix" ? "true" : "false");
  document.querySelector("#tab-card").setAttribute("aria-selected", next === "card" ? "true" : "false");
  payHelp.textContent = next === "pix"
    ? "O PagBank gera um QR Code PIX. O plano libera só quando o pagamento consta como pago."
    : "O cartão abre o checkout do PagBank. O número não passa pelo Synapser. O plano libera quando o PagBank confirma.";
}

document.querySelector("#tab-pix")?.addEventListener("click", () => showMethod("pix"));
document.querySelector("#tab-card")?.addEventListener("click", () => showMethod("card"));

document.querySelectorAll("[data-checkout]").forEach((button) => {
  button.addEventListener("click", async () => {
    selected = button.dataset.checkout;
    const offer = offers[selected];
    if (!token()) {
      openAccount();
      accountNote.textContent = "Entre para assinar.";
      return;
    }
    payTitle.textContent = offer.title;
    payAmount.textContent = offer.amount;
    pay.hidden = false;
    payForm.hidden = false;
    payResult.hidden = true;
    payNote.textContent = "";
    pay.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

function watch(id) {
  clearInterval(poll);
  poll = setInterval(async () => {
    try {
      const body = await api(`/api/payments/${id}`);
      if (body.status === "paid") {
        clearInterval(poll);
        payStatus.textContent = `Pagamento confirmado. Plano ${body.plan === "max" ? "Max" : "Pro"} liberado.`;
        const me = await api("/api/me");
        paintAccount(me.user);
      }
    } catch (error) {
      payStatus.textContent = error.message;
    }
  }, 4000);
}

payForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  payNote.textContent = "Abrindo o PagBank…";
  const data = new FormData(payForm);
  try {
    const body = await api("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        plan: selected,
        method,
        cpf: data.get("cpf"),
        phone: data.get("phone"),
      }),
    });
    payForm.hidden = true;
    payResult.hidden = false;
    payAmount.textContent = `R$ ${(body.brl / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    if (body.checkoutUrl) {
      payStatus.textContent = "Redirecionando para o cartão…";
      window.location.assign(body.checkoutUrl);
      return;
    }
    if (body.pixPng) {
      payQr.hidden = false;
      payQr.src = body.pixPng;
    }
    if (body.pixText) {
      payCopy.hidden = false;
      payCopy.textContent = body.pixText;
    }
    payStatus.textContent = "Aguardando o PagBank confirmar o PIX.";
    watch(body.id);
  } catch (error) {
    payNote.textContent = error.message;
  }
});

const returned = new URLSearchParams(location.hash.split("?")[1] || location.search).get("pedido");
if (returned && token()) watch(returned);

api("/api/me").then((body) => paintAccount(body.user)).catch(() => paintAccount(null));
