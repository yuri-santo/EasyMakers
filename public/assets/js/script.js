async function loadBundle() {
  try {
    const response = await fetch("/api/content/site", { credentials: "same-origin" });
    if (!response.ok) throw new Error("bundle");
    return await response.json();
  } catch {
    const [site, community] = await Promise.all([
      fetch("/assets/data/site.json").then((res) => res.json()),
      fetch("/assets/data/community.json").then((res) => res.json()),
    ]);
    return { site, community, comments: [], projects: [] };
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && value) element.textContent = value;
}

function setLinkText(id, href, label) {
  const element = document.getElementById(id);
  if (!element) return;
  if (href) element.href = href;
  if (label) element.querySelector("span")?.replaceChildren(document.createTextNode(label));
}

function refreshShell() {
  window.EasyMakersShell?.refreshReveals?.();
  window.EasyMakersShell?.refreshGlow?.();
  window.EasyMakersShell?.refreshSearch?.();
}

function renderCommunityPreview(bundle) {
  const host = document.getElementById("home-community-preview");
  if (!host) return;

  const faqs = bundle.community?.faqs || [];
  const comments = bundle.comments || [];

  const items = [
    ...faqs.slice(0, 2).map((item) => ({
      meta: item.category,
      title: item.question,
      text: item.answer,
    })),
    ...comments.slice(0, 2).map((item) => ({
      meta: item.author,
      title: item.company || "Comentario da comunidade",
      text: item.message,
    })),
  ];

  host.innerHTML = (items.length
    ? items
    : [
        {
          meta: "Comunidade",
          title: "Espaco aberto para duvidas",
          text: "O blog recebe perguntas frequentes, comentarios e observacoes enviadas pelos clientes.",
        },
      ])
    .map(
      (item, index) => `
        <article class="premium-card home-community-card home-community-item" data-reveal data-reveal-delay="${index * 60}">
          <span class="home-community-item__meta">${item.meta}</span>
          <h4>${item.title}</h4>
          <p>${item.text}</p>
        </article>
      `
    )
    .join("");

  refreshShell();
}

async function boot() {
  const bundle = await loadBundle();

  setText("hero-title", bundle.site?.hero?.title);
  setText("hero-lead", bundle.site?.hero?.lead);
  setLinkText("hero-cta", "#contato", bundle.site?.hero?.ctaLabel);

  setText("about-title", bundle.site?.about?.title);
  setText("about-text", bundle.site?.about?.text);
  setText("contact-title", bundle.site?.contact?.title);
  setText("contact-text", bundle.site?.contact?.text);
  setLinkText("contact-email", `mailto:${bundle.site?.contact?.email || "contato@easymakers.com.br"}`, "Enviar e-mail");

  renderCommunityPreview(bundle);
  window.EasyMakersShell?.refreshSearch?.();
}

boot();
