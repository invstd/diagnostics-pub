/**
 * Scan VIN modal: three states (wait for capture → VIN + decoding → decoded vehicle), then redirect to diagnostics-dashboard.
 * Trigger: #scan-vin-trigger (e.g. USE CAMERA card on Quick Connect).
 * Mock flow: delays, then picks a random REAL curated Garage vehicle (see the matching comment in
 * vci-pair-detect-modal.js — same vci-detectable-vehicles-data source, both scripts read it) so
 * "Finish Session" on the dashboard afterward lands on a vehicle with real session history instead
 * of a fabricated unknown one. SELECT MANUALLY sends to vehicle-selection.
 */
(function () {
  var DIALOG_ID = "scan-vin-dialog";
  var TRIGGER_ID = "scan-vin-trigger";

  // Forked from scan-vin-modal.js — hardcoded to this folder rather than pattern-matched from
  // the URL, since this copy only ever runs on diagnostics-platform/ pages (see "Important
  // decisions" #2 in the diagnostics-platform task).
  function currentAppPath() {
    return "diagnostics-platform";
  }

  function isTrucksMode() {
    return typeof localStorage !== "undefined" && localStorage.getItem("automechanika-vehicle-type") === "trucks";
  }

  function readDetectableVehicles() {
    var el = document.getElementById("vci-detectable-vehicles-data");
    if (!el) return { cars: [], trucks: [] };
    try { return JSON.parse(el.textContent) || { cars: [], trucks: [] }; } catch (e) { return { cars: [], trucks: [] }; }
  }

  function generateRandomVehicle() {
    var list = readDetectableVehicles()[isTrucksMode() ? "trucks" : "cars"];
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  var currentVehicle = null;
  var dialog;
  var progressFill;
  var statusEl;
  var vinDisplayEl;
  var decodedVehicleEl;
  var state1El;
  var state2El;
  var state3El;
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
  }

  function setProgress(pct, durationMs) {
    if (!progressFill) return;
    progressFill.style.transitionDuration = (durationMs / 1000) + "s";
    progressFill.style.width = pct + "%";
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function goToState(n) {
    clearTimeouts();
    showState(n);
    if (n === 2) {
      setProgress(0, 0);
      setStatus("Decoding...");
      if (vinDisplayEl && currentVehicle) vinDisplayEl.textContent = currentVehicle.vin;
    } else if (n === 1) {
      setProgress(0, 0);
      if (vinDisplayEl) vinDisplayEl.textContent = "";
    } else if (n === 3 && decodedVehicleEl && currentVehicle) {
      decodedVehicleEl.textContent = [currentVehicle.brand, currentVehicle.model, currentVehicle.year, currentVehicle.engine].join(" · ");
    }
  }

  function closeAndReset() {
    clearTimeouts();
    if (dialog) dialog.close();
    showState(1);
    setProgress(0, 0);
    setStatus("Decoding...");
    if (vinDisplayEl) vinDisplayEl.textContent = "";
    if (decodedVehicleEl) decodedVehicleEl.textContent = "";
    currentVehicle = null;
  }

  function redirect(path) {
    var base = (dialog && dialog.getAttribute("data-base-path")) || "/";
    var normalized = base.replace(/\/?$/, "") + (path.indexOf("/") === 0 ? path : "/" + path);
    window.location.href = normalized;
  }

  // Builds the redirect query string, including vehicleId since generateRandomVehicle() above
  // always returns a real curated vehicle here (unlike vci-pair-detect-modal.js's Path 2).
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

  function isOnboardingDemo() {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem("launchpad-onboarding-demo") === "1";
  }

  function setOnboardingStep(n) {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("launchpad-onboarding-step", String(n));
  }

  function setOnboardingCompleted() {
    if (typeof localStorage !== "undefined") localStorage.setItem("launchpad-onboarding-completed", "1");
  }

  /** Runs state 2 → state 3 → redirect. Requires currentVehicle set and state 2 visible. */
  function runDecodeAndRedirect() {
    setProgress(0, 0);
    setStatus("Decoding...");
    if (vinDisplayEl && currentVehicle) vinDisplayEl.textContent = currentVehicle.vin;

    var isDemo = isOnboardingDemo();
    var decodeDelay = isDemo ? 600 : 100;
    var state3Delay = isDemo ? 800 : 2500;

    timeouts.push(setTimeout(function () {
      setProgress(100, isDemo ? 400 : 2000);
      setStatus("Done");
    }, decodeDelay));

    timeouts.push(setTimeout(function () {
      showState(3);
      if (decodedVehicleEl && currentVehicle) {
        decodedVehicleEl.textContent = [currentVehicle.brand, currentVehicle.model, currentVehicle.year, currentVehicle.engine].join(" · ");
      }
      timeouts.push(setTimeout(function () {
        if (isDemo) setOnboardingStep(1);
        var params = buildVehicleParams(currentVehicle);
        closeAndReset();
        redirect(currentAppPath() + "/diagnostics-dashboard/?" + params.toString());
      }, isDemo ? 500 : 1500));
    }, state3Delay));
  }

  function runFlow() {
    if (isDevMode) {
      goToState(1);
      return;
    }
    currentVehicle = generateRandomVehicle();
    clearTimeouts();
    showState(1);

    var isDemo = isOnboardingDemo();
    var state1Delay = isDemo ? 800 : 3500;

    // State 1 → State 2
    timeouts.push(setTimeout(function () {
      showState(2);
      runDecodeAndRedirect();
    }, state1Delay));
  }

  function init() {
    dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return;

    basePath = (dialog.getAttribute("data-base-path") || "/").replace(/\/?$/, "/");
    progressFill = document.getElementById("scan-vin-progress-fill");
    statusEl = document.getElementById("scan-vin-status");
    vinDisplayEl = document.getElementById("scan-vin-display-vin");
    decodedVehicleEl = document.getElementById("scan-vin-decoded-vehicle");
    state1El = document.getElementById("scan-vin-state-1");
    state2El = document.getElementById("scan-vin-state-2");
    state3El = document.getElementById("scan-vin-state-3");
    devControlsEl = document.getElementById("scan-vin-dev-controls");
    isDevMode = typeof URLSearchParams !== "undefined" && new URLSearchParams(window.location.search).get("modal-dev") === "1";
    if (devControlsEl && isDevMode) devControlsEl.classList.remove("hidden");

    var trigger = document.getElementById(TRIGGER_ID);
    if (trigger) {
      trigger.addEventListener("click", function () {
        dialog.showModal();
        runFlow();
      });
    }

    dialog.addEventListener("cancel", closeAndReset);
    dialog.addEventListener("close", closeAndReset);

    [].forEach.call(document.querySelectorAll("[data-scan-vin-cancel]"), function (btn) {
      btn.addEventListener("click", function () {
        closeAndReset();
        dialog.close();
      });
    });

    [].forEach.call(document.querySelectorAll("[data-scan-vin-manual]"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        closeAndReset();
        dialog.close();
        redirect(currentAppPath() + "/vehicle-selection/");
      });
    });

    [].forEach.call(document.querySelectorAll("[data-scan-vin-dev-state]"), function (btn) {
      btn.addEventListener("click", function () {
        var n = parseInt(btn.getAttribute("data-scan-vin-dev-state"), 10);
        if (n === 2 && !currentVehicle) currentVehicle = generateRandomVehicle();
        if (n === 3 && !currentVehicle) currentVehicle = generateRandomVehicle();
        goToState(n);
      });
    });

    /**
     * Public entry point: open Scan VIN modal at state 2 with the given VIN (e.g. from hero input).
     * @param {string} vinString - 17-character VIN (will be normalised to uppercase).
     */
    window.runScanVinFromVin = function (vinString) {
      if (!dialog || !vinDisplayEl) return;
      var raw = (vinString || "").trim().toUpperCase().replace(/\s/g, "");
      var normalized = raw.length === 17 ? raw : raw.slice(0, 17);
      if (normalized.length !== 17) return;
      currentVehicle = generateRandomVehicle();
      currentVehicle.vin = normalized;
      clearTimeouts();
      dialog.showModal();
      showState(2);
      runDecodeAndRedirect();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
