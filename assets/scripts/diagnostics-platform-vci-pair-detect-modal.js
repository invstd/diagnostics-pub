/**
 * VCI Pairing and Auto-Detect modal: three sequential states with mock delays.
 * Triggers: #vci-pair-detect-trigger (index), #vehicle-connect-btn (vehicle-selection).
 * 
 * Two paths:
 * 1. Auto-detect (from index): picks a random real vehicle from the curated Garage list (see
 *    vci-detectable-vehicles-data) — so it's a "real" vehicleId with real session history, not a
 *    fabricated unknown one.
 * 2. Manual selection (from vehicle-selection): uses selected vehicle details. Matched against the
 *    same curated list by brand+model (see findCuratedMatch) — if the pick happens to be a real
 *    curated vehicle (any year/engine), it gets that vehicle's real id+vin, so Finish Session/
 *    live-session tracking work exactly like Auto-detect. Otherwise VIN is fabricated and there's
 *    no vehicleId, same as before — an arbitrary pick with no curated match has nowhere real for a
 *    session to live.
 *
 * Both paths redirect to diagnostics-dashboard with vehicle data in URL params.
 */
(function () {
  var DIALOG_ID = "vci-pair-detect-dialog";
  var TRIGGER_ID = "vci-pair-detect-trigger";
  var VEHICLE_CONNECT_BTN_ID = "vehicle-connect-btn";

  // Forked from vci-pair-detect-modal.js — hardcoded to this folder rather than pattern-matched
  // from the URL, since this copy only ever runs on diagnostics-platform/ pages (see "Important
  // decisions" #2 in the diagnostics-platform task).
  function currentAppPath() {
    return "diagnostics-platform";
  }

  // Auto-detect/Capture VIN pick a random REAL curated Garage vehicle rather than fabricating an
  // unknown one — that vehicle already has real session history and (often) a real Repair Order,
  // so "Finish Session" lands somewhere convincing instead of a single-event stub. Data comes from
  // vci-detectable-vehicles-data (emitted once by vci-pair-detect-modal.njk, see
  // vciDetectableVehicles in .eleventy.js); this file and scan-vin-modal.js both read the same tag.
  function isTrucksMode() {
    return typeof localStorage !== "undefined" && localStorage.getItem("automechanika-vehicle-type") === "trucks";
  }

  function readDetectableVehicles() {
    var el = document.getElementById("vci-detectable-vehicles-data");
    if (!el) return { cars: [], trucks: [] };
    try { return JSON.parse(el.textContent) || { cars: [], trucks: [] }; } catch (e) { return { cars: [], trucks: [] }; }
  }

  // Real WMI (VIN prefix) per brand — src/_data/vinPrefixes.js, emitted by vci-pair-detect-modal.njk
  // as vin-prefixes-data, so a manually-selected non-curated vehicle still gets a brand-matching VIN.
  function readVinPrefixes() {
    var el = document.getElementById("vin-prefixes-data");
    if (!el) return {};
    try { return JSON.parse(el.textContent) || {}; } catch (e) { return {}; }
  }

  function generateRandomVIN(brand) {
    var chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    var wmi = (brand && readVinPrefixes()[brand]) || "XXX";
    var vin = wmi;
    for (var i = 0; i < 17 - wmi.length; i++) {
      vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
  }

  function generateRandomVehicle() {
    var list = readDetectableVehicles()[isTrucksMode() ? "trucks" : "cars"];
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Manual selection's brand/model come from brands_models*/​.json's own clean names (e.g. "308",
  // "XC60"), the same names curated Garage vehicles use — so this matches exactly (brand+model,
  // case-insensitive), unlike vehicleSessions.js's fuzzier match against its own more descriptive
  // model strings ("308 T9"). Year/engine aren't part of the match — curated Garage only has one
  // trim per model, so a narrower match would rarely succeed at all.
  function findCuratedMatch(brand, model) {
    var list = readDetectableVehicles()[isTrucksMode() ? "trucks" : "cars"];
    if (!list || !list.length) return null;
    var b = (brand || "").trim().toLowerCase();
    var m = (model || "").trim().toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if ((list[i].brand || "").trim().toLowerCase() === b && (list[i].model || "").trim().toLowerCase() === m) return list[i];
    }
    return null;
  }

  var currentVehicle = null; // Stores the vehicle data for redirect

  // Builds the redirect query string, including vehicleId when the vehicle is a real curated one
  // (Path 1 always is; Path 2/manual selection only is when findCuratedMatch found one — see
  // runFlow() above) — live-session tracking/Finish Session only apply when vehicleId is present.
  function buildVehicleParams(vehicle) {
    var params = new URLSearchParams();
    params.set("vin", vehicle.vin);
    params.set("brand", vehicle.brand);
    params.set("brandSlug", vehicle.brandSlug);
    params.set("model", vehicle.model);
    params.set("year", vehicle.year);
    if (vehicle.engine) params.set("engine", vehicle.engine);
    if (vehicle.id) params.set("vehicleId", vehicle.id);
    return params;
  }

  var dialog;
  var progressFill;
  var statusEl;
  var vinEl;
  var titleEl;
  var state1El;
  var state2El;
  var state3El;
  var state1AlertEl;
  var state1StatusEl;
  var vehicleDetailsEl;
  var manualLink;
  var manualFallbackEl;
  var basePath;
  var timeouts = [];
  var devControlsEl;
  var isDevMode;

  function clearTimeouts() {
    timeouts.forEach(function (t) { clearTimeout(t); });
    timeouts = [];
  }

  function showState(stateNum) {
    state1El.classList.toggle("hidden", stateNum !== 1);
    state2El.classList.toggle("hidden", stateNum !== 2);
    state3El.classList.toggle("hidden", stateNum !== 3);
    if (stateNum === 2 && manualFallbackEl) {
      var fromVehicleSelection = dialog && dialog.getAttribute("data-from-vehicle-selection") === "1";
      manualFallbackEl.classList.toggle("hidden", fromVehicleSelection);
    }
    if (stateNum === 1 || stateNum === 2 || stateNum === 3) {
      titleEl.textContent = "";
      titleEl.classList.add("hidden");
    } else {
      titleEl.classList.remove("hidden");
    }
  }

  function setProgress(pct, durationMs) {
    if (!progressFill) return;
    progressFill.style.transitionDuration = (durationMs / 1000) + "s";
    progressFill.style.width = pct + "%";
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  /** Go to state n (1–3), stop auto-flow, set progress/status/vin for that state. */
  function goToState(n) {
    clearTimeouts();
    showState(n);
    if (n === 2) {
      setProgress(50, 0);
      setStatus("Scanning protocols...");
    } else if (n === 1) {
      setProgress(0, 0);
      setStatus("Initializing...");
    } else if (n === 3) {
      if (!currentVehicle) currentVehicle = generateRandomVehicle();
      if (vinEl) vinEl.textContent = currentVehicle.vin;
    }
  }

  function closeAndReset() {
    clearTimeouts();
    if (dialog) {
      dialog.removeAttribute("data-from-vehicle-selection");
      dialog.removeAttribute("data-vehicle-details");
      dialog.close();
    }
    showState(1);
    setProgress(0, 0);
    setStatus("Initializing...");
    if (vinEl) vinEl.textContent = "";
    if (state1AlertEl) state1AlertEl.classList.remove("hidden");
    if (state1StatusEl) state1StatusEl.textContent = "Connecting...";
    if (vehicleDetailsEl) {
      vehicleDetailsEl.classList.add("hidden");
      vehicleDetailsEl.textContent = "";
    }
  }

  function redirect(path) {
    var base = (dialog && dialog.getAttribute("data-base-path")) || "/";
    var normalized = base.replace(/\/?$/, "") + (path.indexOf("/") === 0 ? path : "/" + path);
    window.location.href = normalized;
  }

  function isOnboardingDemo() {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem("launchpad-onboarding-demo") === "1";
  }

  function setOnboardingStep(n) {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("launchpad-onboarding-step", String(n));
  }

  function setOnboardingCompleted() {
    if (typeof localStorage !== "undefined") localStorage.setItem("launchpad-onboarding-completed", "1");
  }

  function runFlow() {
    if (isDevMode) {
      goToState(1);
      return;
    }
    var fromVehicleSelection = dialog && dialog.getAttribute("data-from-vehicle-selection") === "1";
    var vehicleDetailsJson = dialog && dialog.getAttribute("data-vehicle-details");
    var isDemo = isOnboardingDemo();

    // Determine vehicle data based on path
    if (fromVehicleSelection && vehicleDetailsJson) {
      // Path 2: Manual Selection - use the selected vehicle details
      try {
        var vd = JSON.parse(vehicleDetailsJson);
        var curatedMatch = findCuratedMatch(vd.brandLabel, vd.model);
        currentVehicle = {
          brand: vd.brandLabel || "",
          brandSlug: vd.brandSlug || (vd.brandLabel || "").toLowerCase().replace(/\s+/g, "-"),
          model: vd.model || "",
          year: vd.year || "",
          engine: vd.engine || "",
          vin: curatedMatch ? curatedMatch.vin : generateRandomVIN(vd.brandLabel) // Real VIN when matched, so it agrees with the Garage row Finish Session lands on
        };
        if (curatedMatch) currentVehicle.id = curatedMatch.id;
      } catch (e) {
        currentVehicle = generateRandomVehicle();
      }
    } else {
      // Path 1: Auto-detect - generate random vehicle
      currentVehicle = generateRandomVehicle();
    }

    clearTimeouts();
    showState(1);
    setProgress(0, 0);
    setStatus("Initializing...");
    if (vinEl) vinEl.textContent = "";

    if (fromVehicleSelection) {
      if (state1AlertEl) state1AlertEl.classList.add("hidden");
      if (state1StatusEl) state1StatusEl.textContent = "Checking connection...";
    } else {
      if (state1AlertEl) state1AlertEl.classList.remove("hidden");
      if (state1StatusEl) state1StatusEl.textContent = "Connecting...";
    }

    var state1Delay = isDemo ? 400 : (fromVehicleSelection ? 1000 : 2000);

    // State 1 → State 2
    timeouts.push(setTimeout(function () {
      showState(2);
      setProgress(0, 0);
      setStatus("Initializing...");
      
      // Show vehicle details in state 2 only for Path 2 (manual selection). Path 1 (auto-detect) does not have brand/model/year until VIN is read and decoded in state 3.
      if (fromVehicleSelection && vehicleDetailsEl && currentVehicle) {
        var parts = [currentVehicle.brand, currentVehicle.model, currentVehicle.year, currentVehicle.engine].filter(Boolean);
        if (parts.length) {
          vehicleDetailsEl.textContent = parts.join(" · ");
          vehicleDetailsEl.classList.remove("hidden");
        }
      } else if (vehicleDetailsEl) {
        vehicleDetailsEl.classList.add("hidden");
        vehicleDetailsEl.textContent = "";
      }

      if (isDemo) {
        setProgress(100, 400);
        setStatus("Requesting Vehicle Data...");
        timeouts.push(setTimeout(function () {
          showState(3);
          if (vinEl) vinEl.textContent = currentVehicle.vin;
          timeouts.push(setTimeout(function () {
            setOnboardingStep(1);
            var vehicleParams = buildVehicleParams(currentVehicle);
            closeAndReset();
            redirect(currentAppPath() + "/diagnostics-dashboard/?" + vehicleParams.toString());
          }, 500));
        }, 800));
      } else {
      // Step-wise progress with easing: 0→25% (2s), 25→75% (4s), 75→100% (2s)
      timeouts.push(setTimeout(function () {
        setProgress(25, 2000);
      }, 0));
      timeouts.push(setTimeout(function () {
        setStatus("Scanning protocols...");
        setProgress(75, 4000);
      }, 2000));
      timeouts.push(setTimeout(function () {
        setStatus("Requesting Vehicle Data...");
        setProgress(100, 2000);
      }, 6000));

      // State 2 → State 3 after 8s
      timeouts.push(setTimeout(function () {
        showState(3);
        if (vinEl) vinEl.textContent = currentVehicle.vin;

        // State 3: hold 1.5s then close and go to diagnostics-dashboard
        timeouts.push(setTimeout(function () {
          var vehicleParams = buildVehicleParams(currentVehicle);
          closeAndReset();
          redirect(currentAppPath() + "/diagnostics-dashboard/?" + vehicleParams.toString());
        }, 1500));
      }, 8000));
      }
    }, state1Delay));
  }

  function init() {
    dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return;

    basePath = dialog.getAttribute("data-base-path") || "/";
    progressFill = document.getElementById("vci-modal-progress-fill");
    statusEl = document.getElementById("vci-modal-status");
    vinEl = document.getElementById("vci-modal-vin");
    titleEl = document.getElementById("vci-modal-title");
    state1El = document.getElementById("vci-modal-state-1");
    state2El = document.getElementById("vci-modal-state-2");
    state3El = document.getElementById("vci-modal-state-3");
    state1AlertEl = document.getElementById("vci-modal-state-1-alert");
    state1StatusEl = document.getElementById("vci-modal-state-1-status");
    vehicleDetailsEl = document.getElementById("vci-modal-vehicle-details");
    manualLink = document.getElementById("vci-modal-manual");
    manualFallbackEl = document.getElementById("vci-modal-state-2-manual-fallback");
    devControlsEl = document.getElementById("vci-modal-dev-controls");
    isDevMode = typeof URLSearchParams !== "undefined" && new URLSearchParams(window.location.search).get("modal-dev") === "1";
    if (devControlsEl && isDevMode) devControlsEl.classList.remove("hidden");

    function openAndRunFlow(fromVehicleSelection, vehicleDetails) {
      if (fromVehicleSelection) {
        dialog.setAttribute("data-from-vehicle-selection", "1");
        if (vehicleDetails) dialog.setAttribute("data-vehicle-details", JSON.stringify(vehicleDetails));
      } else {
        dialog.removeAttribute("data-from-vehicle-selection");
        dialog.removeAttribute("data-vehicle-details");
      }
      dialog.showModal();
      runFlow();
    }

    var trigger = document.getElementById(TRIGGER_ID);
    if (trigger) {
      trigger.addEventListener("click", function () {
        openAndRunFlow(false);
      });
    }

    var vehicleConnectBtn = document.getElementById(VEHICLE_CONNECT_BTN_ID);
    if (vehicleConnectBtn) {
      vehicleConnectBtn.addEventListener("click", function () {
        var params = new URLSearchParams(window.location.search);
        var brandSlug = params.get("brand") || "";
        var brandLabel = "";
        if (typeof window.__vehicleSelectionBrands !== "undefined" && Array.isArray(window.__vehicleSelectionBrands)) {
          var opt = window.__vehicleSelectionBrands.find(function (o) { return o.value === brandSlug; });
          if (opt) brandLabel = opt.label || "";
        }
        function getChipLabel(triggerId) {
          var t = document.getElementById(triggerId);
          var w = t && t.closest && t.closest(".filter-select");
          var chip = w && w.querySelector(".filter-select-chip-label");
          return chip ? (chip.textContent || "").trim() : "";
        }
        var model = getChipLabel("vehicle-model-trigger");
        var year = getChipLabel("vehicle-year-trigger");
        var engine = getChipLabel("vehicle-engine-trigger");
        openAndRunFlow(true, { brandLabel: brandLabel, brandSlug: brandSlug, model: model, year: year, engine: engine });
      });
    }

    dialog.addEventListener("cancel", closeAndReset);
    dialog.addEventListener("close", closeAndReset);

    [].forEach.call(document.querySelectorAll("[data-vci-modal-cancel]"), function (btn) {
      btn.addEventListener("click", function () {
        closeAndReset();
        dialog.close();
      });
    });

    if (manualLink) {
      manualLink.addEventListener("click", function (e) {
        e.preventDefault();
        closeAndReset();
        dialog.close();
        redirect(currentAppPath() + "/vehicle-selection/");
      });
    }

    [].forEach.call(document.querySelectorAll("[data-vci-dev-state]"), function (btn) {
      btn.addEventListener("click", function () {
        goToState(parseInt(btn.getAttribute("data-vci-dev-state"), 10));
      });
    });
    var prevBtn = document.querySelector("[data-vci-dev-prev]");
    var nextBtn = document.querySelector("[data-vci-dev-next]");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        var current = state1El.classList.contains("hidden") ? (state2El.classList.contains("hidden") ? 3 : 2) : 1;
        goToState(current > 1 ? current - 1 : 3);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var current = state1El.classList.contains("hidden") ? (state2El.classList.contains("hidden") ? 3 : 2) : 1;
        goToState(current < 3 ? current + 1 : 1);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
