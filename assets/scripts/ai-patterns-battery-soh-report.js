// ai-patterns/ copy of battery-soh-report.js (AI Patterns experiment, see src/ai-patterns/PLAN.md).
// Only difference: AI Assist opens the shared Layered AI Assist (ai-patterns-ai-assist.js, PLAN.md §5).
(function () {
  "use strict";
  var root = document.querySelector("[data-battery-soh-report]");
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var vin = params.get("vin") || "";
  var brand = params.get("brand") || "";
  var model = params.get("model") || "";
  var year = params.get("year") || "";
  var engine = params.get("engine") || "";
  var variant = /electric|hybrid/i.test(engine) ? "ev" : "ice";

  // `scope` matters: both the ev and ice variant blocks share field names (health-percent,
  // health-badge, health-note) since only one is ever visible at a time — but a plain
  // document-wide querySelector always finds the ev block's copy first regardless of which
  // variant is actually active, silently writing into a hidden element. Every call below scopes
  // to the active variant's own root; only the shared vehicle/test-info fields (unique names,
  // outside either variant block) use the page root.
  function setText(scope, field, value) {
    var el = scope.querySelector('[data-field="' + field + '"]');
    if (el) el.textContent = value;
  }

  // Poor/Good cutoffs for both the category label and the health card's threshold bar (Fair is
  // the gap between them) — named here so the bar's tick positions/labels can't drift out of sync
  // with the category logic itself.
  var HEALTH_THRESHOLDS = { poorMax: 50, goodMin: 80 };

  function healthCategory(percent) {
    if (percent >= HEALTH_THRESHOLDS.goodMin) {
      return { label: "Good", tone: "success", title: "Battery is in good condition", note: "Above " + HEALTH_THRESHOLDS.goodMin + "% — low expected range degradation." };
    }
    if (percent >= HEALTH_THRESHOLDS.poorMax) {
      return { label: "Fair", tone: "warning", title: "Battery is in fair condition", note: HEALTH_THRESHOLDS.poorMax + "–" + HEALTH_THRESHOLDS.goodMin + "% — moderate expected range degradation." };
    }
    return { label: "Poor", tone: "error", title: "Battery is in poor condition", note: "Below " + HEALTH_THRESHOLDS.poorMax + "% — significant expected range degradation." };
  }

  function applyBadge(scope, field, category) {
    var el = scope.querySelector('[data-field="' + field + '"]');
    if (!el) return;
    el.textContent = category.label;
    el.className = "badge badge-outline badge-sm shrink-0 badge-" + category.tone;
  }

  // Fills the threshold bar to `percent` (in the category's tone color) and positions the
  // Poor/Good tick marks + labels at their actual threshold percentages, so the bar always reads
  // correctly even if HEALTH_THRESHOLDS above ever changes.
  function renderHealthBar(scope, percent, category) {
    var barEl = scope.querySelector("[data-health-bar]");
    if (!barEl) return;

    var fillEl = barEl.querySelector("[data-health-bar-fill]");
    if (fillEl) {
      fillEl.style.width = Math.max(0, Math.min(100, percent)) + "%";
      fillEl.className = "h-full rounded-full bg-" + category.tone;
    }

    barEl.querySelectorAll("[data-health-bar-tick]").forEach(function (tickEl) {
      var pos = tickEl.getAttribute("data-health-bar-tick") === "poor" ? HEALTH_THRESHOLDS.poorMax : HEALTH_THRESHOLDS.goodMin;
      tickEl.style.left = pos + "%";
    });

    var poorLabelEl = barEl.querySelector("[data-health-bar-poor-label]");
    if (poorLabelEl) {
      poorLabelEl.textContent = "Poor < " + HEALTH_THRESHOLDS.poorMax + "%";
      poorLabelEl.style.left = HEALTH_THRESHOLDS.poorMax + "%";
    }

    var goodLabelEl = barEl.querySelector("[data-health-bar-good-label]");
    if (goodLabelEl) {
      goodLabelEl.textContent = "Good ≥ " + HEALTH_THRESHOLDS.goodMin + "%";
      goodLabelEl.style.left = HEALTH_THRESHOLDS.goodMin + "%";
    }
  }


  // Software version reflects the active Branding (Settings), not a hardcoded "Autocom ICON" —
  // same brand-extraction as automechanika-nav.js's OEM Integration reveal (localStorage 'theme',
  // "<Brand> Light|Dark"). Real product names only for brands with reference material behind
  // them: Autocom ICON and WOW! LOOQIT (this file's header comment), and WabcoWürth's W.EASY
  // (the real app name referenced throughout the Trucks feature work, e.g.
  // diagnostics-dashboard-trucks.njk, data-lists-library.js) — not a generic placeholder.
  var PRODUCT_NAME_BY_BRAND = {
    Autocom: "Autocom ICON",
    WOW: "WOW! LOOQIT",
    Wabco: "WabcoWürth W.EASY"
  };
  var themeBrandMatch = /^(.+) (Light|Dark)$/.exec(localStorage.getItem("theme") || "");
  var themeBrand = themeBrandMatch ? themeBrandMatch[1] : "Autocom";
  var productName = PRODUCT_NAME_BY_BRAND[themeBrand] || PRODUCT_NAME_BY_BRAND.Autocom;

  // ----- Vehicle / Test information (shared by both variants) -----
  setText(root, "brand-model", [brand, model].filter(Boolean).join(" ") + (year ? " (" + year + ")" : ""));
  setText(root, "vin", vin || "—");
  setText(root, "test-date", new Date().toLocaleString());
  setText(root, "software-version", productName + " 2026.08x");
  setText(root, "vci-serial", "130600");

  // ----- Show the matching variant -----
  var evEl = root.querySelector('[data-report-variant="ev"]');
  var iceEl = root.querySelector('[data-report-variant="ice"]');
  if (variant === "ev" && evEl) {
    evEl.classList.remove("hidden");

    var data = window.BmsDtcLibrary ? window.BmsDtcLibrary.lookup(brand, model) : { batteryHealthPercent: 92, capacity: { initialKwh: 77, currentKwh: 71, lossPercent: 7.8 }, cellVoltage: { minV: 3.82, maxV: 3.84 }, temperature: { minC: 22, maxC: 24 }, faultCodes: [] };

    var healthCat = healthCategory(data.batteryHealthPercent);
    setText(evEl, "health-percent", data.batteryHealthPercent + "%");
    setText(evEl, "health-title", healthCat.title);
    applyBadge(evEl, "health-badge", healthCat);
    setText(evEl, "health-note", healthCat.note);
    renderHealthBar(evEl, data.batteryHealthPercent, healthCat);

    var faultCount = data.faultCodes.length;

    setText(evEl, "capacity-initial", data.capacity.initialKwh.toFixed(1));
    setText(evEl, "capacity-current", data.capacity.currentKwh.toFixed(1));
    setText(evEl, "capacity-loss", data.capacity.lossPercent.toFixed(1));

    setText(evEl, "voltage-min", data.cellVoltage.minV.toFixed(2));
    setText(evEl, "voltage-max", data.cellVoltage.maxV.toFixed(2));
    setText(evEl, "voltage-diff", Math.round((data.cellVoltage.maxV - data.cellVoltage.minV) * 1000));

    setText(evEl, "temp-min", data.temperature.minC);
    setText(evEl, "temp-max", data.temperature.maxC);
    setText(evEl, "temp-diff", data.temperature.maxC - data.temperature.minC);

    var listEl = evEl.querySelector("[data-fault-codes-list]");
    var emptyEl = evEl.querySelector("[data-fault-codes-empty]");
    if (listEl) {
      if (faultCount === 0) {
        if (emptyEl) emptyEl.classList.remove("hidden");
      } else {
        listEl.innerHTML = data.faultCodes.map(function (fc, i) {
          var badge = fc.status
            ? '<span class="badge badge-sm ' + (fc.status === "PERMANENT" ? "badge-error" : "badge-warning") + '">' + fc.status + "</span>"
            : "";
          // Same sparkle path as icon.njk's sparkle.svg (can't call that Nunjucks macro from
          // client-side JS, so it's inlined here — keep in sync if that icon ever changes).
          // Hidden when Layered AI Assist is switched off in Internal demo controls.
          var layeredOn = !window.AiPatternsToggles || window.AiPatternsToggles.isOn("layeredAssist");
          var aiAssistBtn = fc.aiAssist && layeredOn
            ? '<button type="button" class="btn btn-xs btn-outline btn-primary gap-1 shrink-0" data-ai-assist-trigger data-ai-assist-index="' + i + '">' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" aria-hidden="true"><path d="M12 2c.44 3.07 1.1 5.24 2.03 6.5C15.06 9.86 16.87 10.7 19.5 11c-2.63.3-4.44 1.14-5.47 2.5-.93 1.26-1.59 3.43-2.03 6.5-.44-3.07-1.1-5.24-2.03-6.5C8.94 12.14 7.13 11.3 4.5 11c2.63-.3 4.44-1.14 5.47-2.5C10.9 7.24 11.56 5.07 12 2Z"/></svg>' +
                "AI Assist" +
              "</button>"
            : "";
          return (
            '<div class="card bg-base-200 p-3">' +
              '<p class="text-xs text-base-content/60">' + fc.ecu + "</p>" +
              '<div class="flex items-center gap-2 mt-1">' +
                '<span class="font-mono font-bold text-base-content">' + fc.code + "</span>" +
                badge +
              "</div>" +
              '<div class="flex items-center justify-between gap-3 mt-0.5">' +
                '<p class="text-sm text-base-content/70">' + fc.description + "</p>" +
                aiAssistBtn +
              "</div>" +
            "</div>"
          );
        }).join("");

        listEl.querySelectorAll("[data-ai-assist-trigger]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var fc = data.faultCodes[parseInt(btn.getAttribute("data-ai-assist-index"), 10)];
            if (fc && fc.aiAssist && window.AiPatternsAiAssist) window.AiPatternsAiAssist.open(fc);
          });
        });
      }
    }
  } else if (iceEl) {
    iceEl.classList.remove("hidden");
    var iceCategory = healthCategory(74);
    setText(iceEl, "health-percent", "74%");
    setText(iceEl, "health-title", iceCategory.title);
    applyBadge(iceEl, "health-badge", iceCategory);
    setText(iceEl, "health-note", iceCategory.note);
    renderHealthBar(iceEl, 74, iceCategory);
    setText(iceEl, "ice-voltage", "11.4");
    setText(iceEl, "ice-cca", "410");
    setText(iceEl, "ice-cca-rated", "520");
    setText(iceEl, "ice-resistance", "18");
    setText(iceEl, "ice-temp", "21");
  }

  // ----- Print masthead timestamp -----
  var printTimestampEl = root.querySelector("[data-print-timestamp]");
  if (printTimestampEl) printTimestampEl.textContent = new Date().toLocaleString();

  // ----- Optional editable fields: mirrored into their print-only text counterparts just before
  // printing, since the inputs themselves are hidden in print (a filled text input doesn't render
  // its value in most browsers' print output the way plain text does). -----
  var PRINT_FIELD_INPUTS = {
    mileage: "battery-soh-mileage-input",
    "reg-number": "battery-soh-reg-number-input",
    "reg-date": "battery-soh-reg-date-input",
    technician: "battery-soh-technician-input",
    "workshop-name": "battery-soh-workshop-name-input",
    "workshop-address": "battery-soh-workshop-address-input",
    "workshop-phone": "battery-soh-workshop-phone-input",
    "workshop-email": "battery-soh-workshop-email-input"
  };
  window.addEventListener("beforeprint", function () {
    Object.keys(PRINT_FIELD_INPUTS).forEach(function (field) {
      var input = document.getElementById(PRINT_FIELD_INPUTS[field]);
      var printEl = root.querySelector('[data-print-field="' + field + '"]');
      if (input && printEl) printEl.textContent = input.value || "—";
    });
  });
})();
