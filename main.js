const burger = document.querySelector(".burger");
const menu = document.querySelector("#mobile-menu");
const overlay = document.querySelector(".overlay");
const navLinks = document.querySelectorAll("[data-nav]");
const video = document.querySelector(".bg-video");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (video) {
  video.muted = true;
  video.loop = true;
  const start = video.play();
  if (start) start.catch(() => undefined);
}

function setOpen(open) {
  burger.setAttribute("aria-expanded", open ? "true" : "false");
  burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  menu.hidden = !open;
  overlay.hidden = !open;
  document.body.classList.toggle("menu-open", open);
}

function activate(name) {
  navLinks.forEach((item) => {
    const on = item.dataset.nav === name;
    item.classList.toggle("active", on);
    if (on) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

burger.addEventListener("click", () => {
  setOpen(burger.getAttribute("aria-expanded") !== "true");
});

overlay.addEventListener("click", () => setOpen(false));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setOpen(false);
});

menu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setOpen(false));
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 720) setOpen(false);
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => activate(link.dataset.nav));
});

const sections = document.querySelectorAll("[data-section]");

if ("IntersectionObserver" in window) {
  const spy = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activate(visible.target.dataset.section);
    },
    { rootMargin: "-28% 0px -52% 0px", threshold: [0.1, 0.25, 0.5] },
  );
  sections.forEach((section) => spy.observe(section));
}

function format(value, decimals) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function runCount(el) {
  const target = Number(el.dataset.target);
  const decimals = Number(el.dataset.decimals);
  const suffix = el.dataset.suffix || "";
  const index = Number(el.dataset.index);
  const paint = (value) => {
    el.textContent = format(value, decimals) + suffix;
  };
  if (reduce) {
    paint(target);
    return;
  }
  paint(0);
  const delay = 480 + index * 90;
  const duration = 1500 + index * 80;
  const startAt = performance.now() + delay;
  const frame = (now) => {
    if (now < startAt) {
      requestAnimationFrame(frame);
      return;
    }
    const progress = Math.min(1, (now - startAt) / duration);
    const eased = 1 - (1 - progress) ** 3;
    paint(target * eased);
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

const stats = document.querySelectorAll(".stat");
const values = document.querySelectorAll(".stat-value");

if (!("IntersectionObserver" in window)) {
  values.forEach((el) => runCount(el));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const value = entry.target.querySelector(".stat-value");
        if (value) runCount(value);
      });
    },
    { threshold: 0.25 },
  );
  stats.forEach((stat) => observer.observe(stat));
}

const revealables = document.querySelectorAll(".chapter .anim");

if (reduce || !("IntersectionObserver" in window)) {
  revealables.forEach((el) => el.classList.add("in"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        entry.target.classList.add("in");
      });
    },
    { threshold: 0.2 },
  );
  revealables.forEach((el) => revealObserver.observe(el));
}

const pay = document.querySelector("#pagamento");
const payTitle = document.querySelector("#pay-title");
const payAmount = document.querySelector("#pay-amount");
const pixKey = "31985975200";
const offers = {
  pro: { title: "Pro", amount: "US$ 9,90" },
  max: { title: "Max", amount: "US$ 19,90" },
};

function showPane(name) {
  const pix = document.querySelector("#pay-pix");
  const card = document.querySelector("#pay-card");
  const pixTab = document.querySelector("#tab-pix");
  const cardTab = document.querySelector("#tab-card");
  const pixOn = name === "pix";
  pix.hidden = !pixOn;
  card.hidden = pixOn;
  pixTab.setAttribute("aria-selected", pixOn ? "true" : "false");
  cardTab.setAttribute("aria-selected", pixOn ? "false" : "true");
}

async function copyKey(note) {
  try {
    await navigator.clipboard.writeText(pixKey);
    note.textContent = "Chave copiada.";
  } catch {
    note.textContent = "A chave é 31985975200.";
  }
}

document.querySelectorAll("[data-checkout]").forEach((button) => {
  button.addEventListener("click", () => {
    const offer = offers[button.dataset.checkout];
    if (!offer || !pay) return;
    payTitle.textContent = offer.title;
    payAmount.textContent = offer.amount;
    pay.hidden = false;
    showPane("pix");
    pay.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  });
});

document.querySelector("#tab-pix")?.addEventListener("click", () => showPane("pix"));
document.querySelector("#tab-card")?.addEventListener("click", () => showPane("card"));
document.querySelector("#pix-copy")?.addEventListener("click", () => copyKey(document.querySelector("#pix-note")));
document.querySelector("#card-copy")?.addEventListener("click", () => copyKey(document.querySelector("#card-note")));
