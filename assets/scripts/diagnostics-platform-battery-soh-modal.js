(function () {
  "use strict";
  var dialog = document.getElementById("battery-soh-dialog");
  if (!dialog) return;

  var state1 = document.getElementById("battery-soh-state-1");
  var state2 = document.getElementById("battery-soh-state-2");
  var continueBtn = document.getElementById("battery-soh-continue");
  var cancelBtns = Array.prototype.slice.call(document.querySelectorAll("[data-battery-soh-cancel]"));
  var progressStatusEl = document.getElementById("battery-soh-progress-status");

  // Forked from battery-soh-modal.js — this copy only ever runs on diagnostics-platform/ pages,
  // so the root is matched against that folder instead of automechanika/ (see "Important
  // decisions" #2 in the diagnostics-platform task).
  function getBasePath() {
    var m = window.location.pathname.match(/^(.*?\/)diagnostics-platform\//);
    return m ? m[1] : "/";
  }

  // The engine type isn't known at build time — it's set on the URL by vehicle-selection
  // (from the brand/model JSON's engine_types, e.g. "Petrol", "Electric", "Plug-in Hybrid")
  // once a real vehicle is picked. No param (e.g. navigating here directly) falls back to
  // the combustion variant. Same test as bms-dtc-library.js's callers elsewhere.
  function activeVariant() {
    var engine = new URLSearchParams(window.location.search).get("engine") || "";
    return /electric|hybrid/i.test(engine) ? "ev" : "ice";
  }

  // Live progress steps, matching the real Autocom ICON app's own wording (screen recording
  // Vedran supplied 2026-08-26) — "Connecting to VCI" (no count) -> "Scanning ...-systems (n/N)"
  // -> "Reading SoH parameters... (n/N)". Combustion has no real reference to match, so it reuses
  // the same three-phase shape with smaller, plausible counts rather than inventing a fourth
  // phase.
  var STEP_TABLES = {
    ev: [
      { label: "Connecting to VCI", count: 0 },
      { label: "Scanning EV-systems", count: 8 },
      { label: "Reading SoH parameters...", count: 7 }
    ],
    ice: [
      { label: "Connecting to VCI", count: 0 },
      { label: "Scanning battery systems", count: 4 },
      { label: "Reading SoH parameters...", count: 3 }
    ]
  };
  var TICK_MS = 240;
  var CONNECT_MS = 1100;

  var progressTimers = [];

  function clearProgressTimers() {
    progressTimers.forEach(function (t) { clearTimeout(t); });
    progressTimers = [];
  }

  function showState(n) {
    state1.classList.toggle("hidden", n !== 1);
    state2.classList.toggle("hidden", n !== 2);
  }

  // Steps through Connecting -> Scanning (n/N) -> Reading (n/N) for the given variant, then
  // calls onDone once the last count lands.
  function runProgress(variant, onDone) {
    clearProgressTimers();
    var steps = STEP_TABLES[variant] || STEP_TABLES.ice;
    var elapsed = 0;

    steps.forEach(function (step) {
      if (step.count === 0) {
        progressTimers.push(setTimeout(function () {
          if (progressStatusEl) progressStatusEl.textContent = step.label;
        }, elapsed));
        elapsed += CONNECT_MS;
        return;
      }
      for (var i = 1; i <= step.count; i++) {
        (function (n) {
          progressTimers.push(setTimeout(function () {
            if (progressStatusEl) progressStatusEl.textContent = step.label + " (" + n + "/" + step.count + ")";
          }, elapsed));
        })(i);
        elapsed += TICK_MS;
      }
    });

    progressTimers.push(setTimeout(onDone, elapsed + 400));
  }

  // Logged once progress genuinely completes (not on OK click), same as the rest of this app's
  // "log real outcomes, not intent" convention — mirrors runVehicleTask/logResult elsewhere.
  function logResult(variant) {
    if (!window.AutocomLiveSession) return;
    var urlParams = new URLSearchParams(window.location.search);
    var vehicleId = urlParams.get("vehicleId");
    if (!vehicleId) return;
    var brand = urlParams.get("brand") || "";
    var model = urlParams.get("model") || "";
    var data = window.BmsDtcLibrary
      ? (variant === "ev" ? window.BmsDtcLibrary.lookup(brand, model) : null)
      : null;
    var soh = data ? data.batteryHealthPercent : (variant === "ev" ? 92 : 88);
    var tone = soh >= 80 ? "success" : (soh >= 50 ? "warning" : "error");
    window.AutocomLiveSession.append(vehicleId, { icon: "battery", label: "Battery SoH Check", tone: tone, value: soh + "%" });
    if (typeof window.refreshCurrentSessionBadgeFromLiveSession === "function") window.refreshCurrentSessionBadgeFromLiveSession();
  }

  window.openBatterySohModal = function () {
    showState(1);
    dialog.showModal();
  };

  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      var variant = activeVariant();
      showState(2);
      if (progressStatusEl) progressStatusEl.textContent = "Connecting to VCI";
      runProgress(variant, function () {
        logResult(variant);
        var params = new URLSearchParams(window.location.search);
        var reportParams = new URLSearchParams();
        ["vin", "brand", "brandSlug", "model", "year", "engine"].forEach(function (key) {
          var value = params.get(key);
          if (value) reportParams.set(key, value);
        });
        // Close before navigating so the dialog isn't still open mid-progress if the browser
        // restores this page from bfcache on Back — window.location.href never fires the
        // dialog's own "close" event on its own, so without this the dashboard would come back
        // frozen on "Reading SoH parameters... (n/N)".
        dialog.close();
        window.location.href = getBasePath() + "diagnostics-platform/battery-soh-report/?" + reportParams.toString();
      });
    });
  }

  cancelBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      dialog.close();
    });
  });

  dialog.addEventListener("close", function () {
    clearProgressTimers();
    showState(1);
  });

  // Belt-and-suspenders: if the browser still restores this page from bfcache with the dialog
  // open despite the close() above (behaviour varies by browser), force it closed on restore.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted && dialog.open) {
      dialog.close();
    }
  });
})();
