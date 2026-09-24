(function () {
  "use strict";
  // Forked from vehicle-search.js — hardcoded hrefs point at diagnostics-platform/ rather than
  // automechanika/ (see "Important decisions" #2 in the diagnostics-platform task).
  var wrap = document.querySelector("[data-truck-search-wrap]");
  if (!wrap) return;

  var input = document.getElementById("truck-search-input");
  var resultsEl = wrap.querySelector("[data-truck-search-results]");
  var indexEl = document.getElementById("truck-search-index");
  var index = indexEl ? JSON.parse(indexEl.textContent) : [];
  var basePath = wrap.getAttribute("data-base-path") || "/";

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function hide() {
    resultsEl.classList.add("hidden");
    resultsEl.innerHTML = "";
  }

  function render(matches, query) {
    if (!matches.length) {
      resultsEl.innerHTML =
        '<div class="p-4 text-sm text-base-content/60">No matches for "' + escapeHtml(query) + '". ' +
        '<a class="link link-primary" href="' + basePath + 'diagnostics-platform/vehicle-selection-trucks/">Browse manually</a></div>';
      resultsEl.classList.remove("hidden");
      return;
    }
    resultsEl.innerHTML = matches.map(function (m) {
      var href = basePath + "diagnostics-platform/vehicle-selection-trucks/?brand=" + encodeURIComponent(m.brandSlug);
      return (
        '<a href="' + href + '" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200 text-base-content no-underline border-b border-base-200 last:border-b-0">' +
        '<span class="font-medium">' + escapeHtml(m.label) + "</span>" +
        (m.type ? '<span class="text-xs text-base-content/50">' + escapeHtml(m.type) + "</span>" : "") +
        "</a>"
      );
    }).join("");
    resultsEl.classList.remove("hidden");
  }

  if (input) {
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        hide();
        return;
      }
      var matches = index.filter(function (item) {
        return item.label.toLowerCase().indexOf(q) !== -1;
      });
      render(matches, q);
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) hide();
    });
  }
})();
