(() => {
  const pages = [...document.querySelectorAll("[data-page]")];
  const nav = document.getElementById("nav");
  const menuButton = document.getElementById("menuBtn");

  function route() {
    const requestedPage = window.location.hash.slice(1) || "inicio";
    const target = pages.find(page => page.dataset.page === requestedPage)
      || pages.find(page => page.dataset.page === "inicio");

    if (!target) return;

    pages.forEach(page => {
      page.hidden = page !== target;
    });

    document.querySelectorAll("#nav a[data-r]").forEach(link => {
      const active = link.dataset.r === target.dataset.page;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    if (menuButton && nav) {
      menuButton.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
    }

    window.scrollTo(0, 0);
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const expanded = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open", !expanded);
    });
  }

  window.addEventListener("hashchange", route);
  route();
})();
