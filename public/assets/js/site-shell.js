const NAV_LINKS = [
  { key: "home", label: "Inicio", href: "/" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio" },
  { key: "blog", label: "Blog", href: "/blog" },
  { key: "sobre", label: "Sobre", href: "/#sobre" },
  { key: "servicos", label: "Servicos", href: "/#servicos" },
  { key: "contato", label: "Contato", href: "/#contato" },
];

const PAGE_SEARCH_SELECTORS = {
  home: [".hero-copy", ".overview-shell", ".trust-metric", ".service-card", ".metric-card", ".process-card", ".community-note", ".home-community-card", ".contact-box"],
  portfolio: [".portfolio-hero", ".portfolio-card"],
  blog: [".community-hero", ".faq-item", ".testimonial-card", ".comment-card"],
  privacy: [".privacy-hero", ".topics .card", ".legal-card"],
};

const GLOW_SELECTOR = [
  "button",
  ".btn",
  ".chip",
  ".nav-btn",
  ".site-shell-cta",
  ".site-shell-search-toggle",
  "a.button-link",
].join(", ");

function resolvePageHref(page, href) {
  if (page === "home" && href.startsWith("/#")) {
    return href.slice(1);
  }

  return href;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compactText(value, max = 120) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}...`;
}

function readFirstText(root, selectors) {
  for (const selector of selectors) {
    const target = root.matches(selector) ? root : root.querySelector(selector);
    const text = target?.textContent?.replace(/\s+/g, " ").trim();
    if (text) return text;
  }

  return "";
}

function ensureSearchHref(element, page, index) {
  const directHref = element.getAttribute("href");
  if (directHref && directHref.startsWith("#")) return directHref;

  if (!element.id) {
    element.id = `shell-search-${page}-${index + 1}`;
  }

  element.setAttribute("data-shell-search-item", "true");
  return `#${element.id}`;
}

function isActiveLink(page, link) {
  return (
    (page === "home" && link.key === "home") ||
    (page === "portfolio" && link.key === "portfolio") ||
    (page === "blog" && link.key === "blog")
  );
}

function getSearchItems(page) {
  if (!PAGE_SEARCH_SELECTORS[page]) return [];

  const items = [];
  const seen = new Set();

  PAGE_SEARCH_SELECTORS[page].forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.closest("#site-shell-nav, .site-footer")) return;
      if (!element.textContent?.trim()) return;
      if (element.offsetParent === null && getComputedStyle(element).position !== "fixed") return;

      const label =
        readFirstText(element, ["h1", "h2", "h3", "h4", ".title", "strong", ".portfolio-card__client", ".faq-item__meta"]) ||
        compactText(element.textContent, 72);
      const subtitle =
        readFirstText(element, [
          "p",
          ".desc",
          ".muted",
          ".portfolio-card__summary",
          ".testimonial-card__author",
          ".comment-card__author",
          "li",
        ]) || compactText(element.textContent, 120);
      const href = ensureSearchHref(element, page, items.length);
      const signature = `${href}|${label}|${subtitle}`;

      if (seen.has(signature)) return;
      seen.add(signature);
      items.push({
        label: compactText(label, 70),
        subtitle: compactText(subtitle === label ? element.textContent : subtitle, 120),
        href,
        keywords: [element.textContent],
      });
    });
  });

  return items.slice(0, 48);
}

function renderSearchResults(nav, items, query) {
  const host = nav.querySelector(".site-shell-search-results");
  if (!host) return;

  const normalized = normalize(query);

  const matches = items.filter((item) => {
    if (!normalized) return true;
    const haystack = normalize([item.label, item.subtitle, ...(item.keywords || [])].join(" "));
    return haystack.includes(normalized);
  });

  host.innerHTML = matches.length
    ? matches
        .slice(0, 8)
        .map(
          (item) => `
            <a class="site-shell-search-result" href="${item.href}">
              <strong>${item.label}</strong>
              <span>${item.subtitle}</span>
            </a>
          `
        )
        .join("")
    : `<div class="site-shell-search-empty">Nenhum item desta pagina encontrado.</div>`;
}

function refreshSearchItems(nav) {
  if (!nav) return;

  const page = nav.dataset.page || "home";
  const items = getSearchItems(page);
  nav.__searchItems = items;

  const input = nav.querySelector("#site-shell-search-input");
  renderSearchResults(nav, items, input?.value || "");
}

function renderShell() {
  const host = document.getElementById("site-shell-nav");
  if (!host) return null;

  const page = document.body.dataset.page || "home";
  const panelHref = page === "login" ? "/login" : "/admin";
  const ctaLabel = page === "login" ? "Entrar" : "Painel";
  const showSearch = !["admin", "login"].includes(page);

  const nav = document.createElement("header");
  nav.className = "site-shell-nav";
  nav.dataset.page = page;
  nav.innerHTML = `
    <div class="site-shell-inner">
      <a class="site-shell-brand" href="/">
        <img src="/assets/img/logo.png" alt="EasyMakers" />
        <span class="site-shell-brand-copy">
          <strong>EasyMakers</strong>
          <span>Automação, produto e operacao sem atrito</span>
        </span>
      </a>

      <div class="site-shell-menu">
        <nav class="site-shell-links" aria-label="Principal">
          ${NAV_LINKS.map((link) => {
            const href = resolvePageHref(page, link.href);
            const isActive = isActiveLink(page, link);
            return `<a class="site-shell-link ${isActive ? "is-active" : ""}" href="${href}">${link.label}</a>`;
          }).join("")}
        </nav>
        <a class="site-shell-cta" href="${panelHref}">${ctaLabel}</a>
      </div>

      <div class="site-shell-actions">
        ${
          showSearch
            ? `<button class="site-shell-search-toggle" type="button" aria-expanded="false" aria-label="Abrir busca">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6"></circle>
            <path d="M20 20L16.65 16.65"></path>
          </svg>
        </button>`
            : ""
        }

        <button class="site-shell-toggle" type="button" aria-expanded="false" aria-label="Abrir navegacao">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>

    ${
      showSearch
        ? `<div class="site-shell-search-shell">
      <div class="site-shell-search-panel">
        <label class="site-shell-search-field" for="site-shell-search-input">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6"></circle>
            <path d="M20 20L16.65 16.65"></path>
          </svg>
          <input id="site-shell-search-input" type="search" placeholder="Buscar itens desta pagina..." autocomplete="off" />
        </label>
        <div class="site-shell-search-results"></div>
      </div>
    </div>`
        : ""
    }
  `;

  host.replaceWith(nav);
  const brandCopy = nav.querySelector(".site-shell-brand-copy span");
  if (brandCopy) {
    brandCopy.textContent = "Automacao, produto e operacao sem atrito";
  }
  nav.__searchItems = [];
  return nav;
}

function syncNavHeight(nav) {
  if (!nav) return;

  const setHeight = () => {
    const inner = nav.querySelector(".site-shell-inner");
    const height = Math.ceil(inner?.getBoundingClientRect().height || nav.getBoundingClientRect().height || 86);
    document.documentElement.style.setProperty("--shell-nav-height", `${height}px`);
  };

  setHeight();
  const observer = new ResizeObserver(setHeight);
  observer.observe(nav);
  window.addEventListener("resize", setHeight, { passive: true });
  window.addEventListener("load", setHeight, { once: true });
}

function updateNavSurface(nav) {
  if (!nav) return;
  const page = nav.dataset.page || "home";
  const transparentEnabled = !["admin", "login"].includes(page);
  const shouldBeTransparent = transparentEnabled && window.scrollY < 50 && !nav.classList.contains("is-open");

  nav.classList.toggle("is-top", shouldBeTransparent);
  nav.classList.toggle("scrolled", !shouldBeTransparent);
}

function setMenuOpen(nav, next) {
  const toggle = nav.querySelector(".site-shell-toggle");
  if (next) {
    setSearchOpen(nav, false);
  }
  nav.classList.toggle("is-open", next);
  if (toggle) toggle.setAttribute("aria-expanded", String(next));
  updateNavSurface(nav);
}

function setSearchOpen(nav, next) {
  const toggle = nav.querySelector(".site-shell-search-toggle");
  const input = nav.querySelector("#site-shell-search-input");
  if (!toggle || !input) return;
  if (next) {
    nav.classList.remove("is-open");
    nav.querySelector(".site-shell-toggle")?.setAttribute("aria-expanded", "false");
    refreshSearchItems(nav);
  }
  nav.classList.toggle("is-search-open", next);
  if (toggle) toggle.setAttribute("aria-expanded", String(next));
  if (next) {
    input?.focus();
  } else if (input) {
    input.value = "";
    renderSearchResults(nav, nav.__searchItems || [], "");
  }
  updateNavSurface(nav);
}

function initMenu(nav) {
  if (!nav) return;

  const toggle = nav.querySelector(".site-shell-toggle");
  toggle?.addEventListener("click", () => {
    const next = !nav.classList.contains("is-open");
    setMenuOpen(nav, next);
  });

  nav.querySelectorAll(".site-shell-link, .site-shell-cta").forEach((link) => {
    link.addEventListener("click", () => {
      setMenuOpen(nav, false);
      setSearchOpen(nav, false);
    });
  });
}

function initSearch(nav) {
  if (!nav) return;

  const toggle = nav.querySelector(".site-shell-search-toggle");
  const input = nav.querySelector("#site-shell-search-input");
  if (!toggle || !input) return;

  toggle?.addEventListener("click", () => {
    const next = !nav.classList.contains("is-search-open");
    setSearchOpen(nav, next);
  });

  input?.addEventListener("input", (event) => {
    refreshSearchItems(nav);
    renderSearchResults(nav, nav.__searchItems || [], event.target.value || "");
  });

  nav.querySelector(".site-shell-search-results")?.addEventListener("click", (event) => {
    if (event.target.closest("a[href]")) {
      setSearchOpen(nav, false);
      setMenuOpen(nav, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName;
    if (event.key === "/" && activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
      event.preventDefault();
      setSearchOpen(nav, true);
      return;
    }

    if (event.key === "Escape") {
      setSearchOpen(nav, false);
      setMenuOpen(nav, false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target)) {
      setSearchOpen(nav, false);
      setMenuOpen(nav, false);
    }
  });
}

function observeReveals() {
  const items = [...document.querySelectorAll("[data-reveal]")];
  if (!items.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  items.forEach((item) => {
    item.classList.add("reveal-up");
    const delay = Number(item.getAttribute("data-reveal-delay") || "0");
    item.style.setProperty("--reveal-delay", `${Math.max(0, delay)}ms`);
    if (reducedMotion) item.classList.add("in-view");
  });

  if (reducedMotion) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("in-view", entry.isIntersecting);
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.12,
    }
  );

  items.forEach((item) => observer.observe(item));
}

function applyGlow() {
  const candidates = [...document.querySelectorAll(GLOW_SELECTOR)];
  candidates.forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.classList.contains("button-glow")) return;
    if (
      element.matches(".btn-close, .drawer__close, .modal-x, .portfolio-modal__close, .swiper-button-next, .swiper-button-prev")
    ) {
      return;
    }

    element.classList.add("button-glow");
  });
}

function initPageTransitions() {
  const overlay = document.getElementById("page-transition-layer");
  if (!overlay) return;

  window.requestAnimationFrame(() => {
    document.body.classList.remove("is-navigating");
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const rawHref = link.getAttribute("href") || "";
    if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) {
      return;
    }

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) return;
    if (url.pathname === window.location.pathname && url.hash) return;

    event.preventDefault();
    document.body.classList.add("is-navigating");
    window.setTimeout(() => {
      window.location.assign(url.href);
    }, 220);
  });
}

function syncFooterYear() {
  document.querySelectorAll("#current-year").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
}

function boot() {
  document.body.classList.add("site-shell-body");
  const nav = renderShell();
  syncNavHeight(nav);
  syncFooterYear();
  initMenu(nav);
  initSearch(nav);
  observeReveals();
  applyGlow();
  initPageTransitions();
  updateNavSurface(nav);
  refreshSearchItems(nav);
  window.addEventListener("scroll", () => updateNavSurface(nav), { passive: true });

  window.EasyMakersShell = {
    refreshReveals: observeReveals,
    refreshGlow: applyGlow,
    refreshSearch: () => refreshSearchItems(nav),
    refreshNavSurface: () => updateNavSurface(nav),
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
