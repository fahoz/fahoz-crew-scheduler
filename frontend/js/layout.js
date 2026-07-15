// ==========================================================
// Ortak sidebar render fonksiyonu — her sayfada çağrılır.
// ==========================================================

function renderSidebar(activePage) {
  // Sayfa /pages/ klasörü altında mı yoksa kökte mi çalışıyor tespit edilir,
  // böylece linkler her iki konumdan da doğru çalışır.
  const inPagesFolder = window.location.pathname.includes("/pages/");
  const rootPrefix = inPagesFolder ? "../" : "";
  const pagesPrefix = inPagesFolder ? "" : "pages/";

  const items = [
    { key: "dashboard", label: "Dashboard", href: `${rootPrefix}index.html` },
    { key: "crew", label: "Ekip Yönetimi", href: `${pagesPrefix}crew.html` },
    { key: "flights", label: "Uçuş Planlama & Atama", href: `${pagesPrefix}flights.html` },
    { key: "atc", label: "ATC Kontrol Kulesi", href: `${pagesPrefix}atc.html` },
  ];

  const linksHtml = items
    .map(
      (item) => `
      <a class="nav-link ${item.key === activePage ? "active" : ""}" href="${item.href}">
        <span class="dot"></span> ${item.label}
      </a>`
    )
    .join("");

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-name">Fahoz Air Ops</div>
        <div class="brand-sub">Crew Schedule System</div>
      </div>
      <nav style="flex:1;">${linksHtml}</nav>
      <div style="padding: 16px 24px; border-top: 1px solid var(--border-color);">
        <button class="btn btn-ghost btn-sm" style="width:100%; justify-content:center;" onclick="logout()">Çıkış Yap</button>
      </div>
    </aside>
  `;
}

function mountSidebar(activePage) {
  const el = document.getElementById("sidebar-slot");
  if (el) el.outerHTML = renderSidebar(activePage);
}
