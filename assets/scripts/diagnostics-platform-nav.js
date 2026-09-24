(function () {
  "use strict";
  // Forked from automechanika-nav.js so the home-link rewrite matches this folder's own path
  // instead of automechanika/ (see "Important decisions" #2 in the diagnostics-platform task).
  // Trucks mode has its own "Quick Connect" landing page (vehicle-search.njk, not index.njk) —
  // every link meant to return "home" (sidebar logo, mobile top-bar logo, sidebar's first nav
  // item — anything marked data-automechanika-home-link) should point there instead. See
  // [[trucks-feature-wabco-weasy]]. Runs immediately where the script tag sits in the sidebar
  // markup (after both the sidebar and the earlier-in-document mobile top bar exist), not on
  // DOMContentLoaded, to keep the "wrong" link's flash as brief as possible.
  if (localStorage.getItem("automechanika-vehicle-type") === "trucks") {
    document.querySelectorAll("[data-automechanika-home-link]").forEach(function (el) {
      var href = el.getAttribute("href");
      if (href) el.setAttribute("href", href.replace(/diagnostics-platform\/$/, "diagnostics-platform/vehicle-search/"));
    });

    var homeLink = document.getElementById("automechanika-nav-home");
    if (homeLink) {
      homeLink.querySelectorAll("[data-nav-home-cars]").forEach(function (el) { el.classList.add("hidden"); });
      homeLink.querySelectorAll("[data-nav-home-trucks]").forEach(function (el) { el.classList.remove("hidden"); });
    }
  }

  // OEM Integrations nav item — depends on the selected Branding (Settings), not vehicle type:
  // WabcoWürth only for now (see automechanika-sidebar.njk's header comment), on both Cars and
  // Commercial Vehicles. Theme names are "<Brand> Light"/"<Brand> Dark" or bare "Hi-Tech" (see
  // main.css / automechanika-theme-toggle.js) — same brand-extraction as everywhere else that
  // needs it.
  var theme = localStorage.getItem("theme") || "";
  var brandMatch = /^(.+) (Light|Dark)$/.exec(theme);
  var brand = brandMatch ? brandMatch[1] : theme;
  if (brand === "Wabco") {
    document.querySelectorAll("[data-nav-wabco-only]").forEach(function (el) { el.classList.remove("hidden"); });
  }
})();
