/**
 * Vehicle selection page: steps, brand search, cascade form (model/year/engine), detail score.
 * Depends on: #vehicle-selection-brands-data (JSON), filter-select globals (filterSelectSetValue, etc.).
 */
(function() {
  // Forked from vehicle-selection.js — hardcoded to this folder rather than pattern-matched from
  // the URL, since this copy only ever runs on diagnostics-platform/ pages (see "Important
  // decisions" #2 in the diagnostics-platform task).
  function currentAppPath() {
    return "diagnostics-platform";
  }

  // Detects which vehicle-selection page (cars vs. trucks) is currently active, so this one
  // shared script can redirect back to whichever page it's already on instead of always the
  // cars one — used by the mobile brand-select redirect below.
  function currentPageSlug() {
    var m = window.location.pathname.match(/\/(vehicle-selection(?:-trucks)?)\//);
    return m ? m[1] : "vehicle-selection";
  }

  // Read brands from page (injected by Nunjucks)
  var brandsEl = document.getElementById("vehicle-selection-brands-data");
  window.__vehicleSelectionBrands = brandsEl ? JSON.parse(brandsEl.textContent) : [];

  // Curated Garage vehicles (same vci-detectable-vehicles-data tag vci-pair-detect-modal.js reads)
  // — used to badge individual MODEL options once a brand is picked, same "Demo" signal the brand
  // grid already shows but one level more precise: a brand can be curated (e.g. Ford) without every
  // model being (Garage only has Focus, not Puma/Fiesta/...), so knowing the brand alone isn't
  // enough to tell whether a specific pick will get Finish Session/session tracking.
  var detectableVehiclesEl = document.getElementById("vci-detectable-vehicles-data");
  var detectableVehicles = { cars: [], trucks: [] };
  try { detectableVehicles = detectableVehiclesEl ? (JSON.parse(detectableVehiclesEl.textContent) || detectableVehicles) : detectableVehicles; } catch (e) {}
  function curatedModelsForBrand(brandLabel) {
    var isTrucksPage = /vehicle-selection-trucks/.test(window.location.pathname);
    var list = detectableVehicles[isTrucksPage ? "trucks" : "cars"] || [];
    var b = (brandLabel || "").trim().toLowerCase();
    var models = {};
    list.forEach(function(v) { if ((v.brand || "").trim().toLowerCase() === b) models[(v.model || "").trim().toLowerCase()] = true; });
    return models;
  }

  // Reads a filter-select's current value by its trigger id (e.g. "vehicle-model-trigger").
  // Shared by the detail score and the Show socket gate below.
  function getFilterSelectValue(triggerId) {
    var tr = document.getElementById(triggerId);
    if (!tr) return "";
    var wr = tr.closest(".filter-select");
    var input = wr && wr.querySelector("[data-value-input]");
    return input ? (input.value || "").trim() : "";
  }

  // ----- Steps -----
  function getCurrentStep() {
    var params = new URLSearchParams(window.location.search);
    var hasBrand = !!params.get("brand");
    if (hasBrand) return 3;
    return 2;
  }
  function updateSteps() {
    var wrapper = document.querySelector(".content-header .steps-compact");
    if (!wrapper) return;
    var currentStep = getCurrentStep();
    wrapper.querySelectorAll(".step[data-step-index]").forEach(function(li) {
      var i = parseInt(li.getAttribute("data-step-index"), 10);
      var completed = i < currentStep;
      var active = i === currentStep;
      li.classList.remove("step-primary", "step-success", "step-neutral");
      li.classList.add(completed ? "step-success" : (active ? "step-primary" : "step-neutral"));
      li.setAttribute("data-content", (i === 1 || completed) ? "\u2713" : String(i));
      li.setAttribute("data-current", active ? "true" : "false");
    });
  }
  updateSteps();
  document.addEventListener("filter-select-change", function(e) {
    var trigger = e.target && e.target.querySelector && e.target.querySelector("summary[id]");
    var id = trigger && trigger.id;
    if (id === "vehicle-model-trigger" || id === "vehicle-year-trigger" || id === "vehicle-engine-trigger" || id === "vehicle-brand-mobile-trigger") updateSteps();
  });
  document.addEventListener("click", function(e) {
    if (e.target && e.target.closest && e.target.closest("[data-filter-clear]")) setTimeout(updateSteps, 0);
  });

  // ----- Brand search (desktop) + mobile filter init -----
  var searchWrap = document.getElementById("vehicle-brand-search-desktop-wrap");
  var searchInput = document.getElementById("vehicle-brand-search-desktop");
  var selectionRow = document.getElementById("vehicle-brand-selection-desktop");
  var chipLabel = document.getElementById("vehicle-brand-chip-label");
  var area = document.querySelector("[data-brand-selection-area]");
  var grid = document.querySelector("[data-brand-grid]");
  var brandOptions = window.__vehicleSelectionBrands || [];
  var params = new URLSearchParams(window.location.search);
  var brandSlug = params.get("brand");

  // ----- Brand grid presets: All / Preferred / Custom -----
  var PREFERRED_STORAGE_KEY = "launchpad1-preferred-brands";
  var wrapper = document.querySelector("[data-brand-grid-wrapper]");
  var presetBtns = wrapper ? wrapper.querySelectorAll("[data-brand-presets] [data-preset]") : [];
  var masterCheckbox = wrapper ? wrapper.querySelector(".brand-master-checkbox") : null;
  var masterLabel = document.getElementById("brand-master-checkbox-label");
  var brandItems = wrapper ? wrapper.querySelectorAll(".brand-grid-item") : [];
  var brandCheckboxes = wrapper ? wrapper.querySelectorAll(".brand-select-checkbox") : [];
  var emptyPreferredEl = wrapper ? wrapper.querySelector("[data-brand-empty-preferred]") : null;
  var masterRow = wrapper ? wrapper.querySelector("[data-master-checkbox-row]") : null;

  function getPreferredSlugs() {
    try {
      var raw = localStorage.getItem(PREFERRED_STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function setPreferredSlugs(slugs) {
    try {
      localStorage.setItem(PREFERRED_STORAGE_KEY, JSON.stringify(slugs));
    } catch (e) {}
  }
  function getSelectedSlugs() {
    var slugs = [];
    brandItems.forEach(function(item) {
      if (item.getAttribute("data-selected") === "true")
        slugs.push(item.getAttribute("data-brand-slug"));
    });
    return slugs;
  }
  function setBrandItemSelected(item, selected) {
    item.setAttribute("data-selected", selected ? "true" : "false");
    var cb = item.querySelector(".brand-select-checkbox");
    if (cb) cb.checked = !!selected;
  }
  function updateBrandMasterState() {
    if (!masterCheckbox || !brandCheckboxes.length) return;
    var n = brandCheckboxes.length;
    var checked = Array.from(brandCheckboxes).filter(function(c) { return c.checked; }).length;
    if (checked === 0) {
      masterCheckbox.checked = false;
      masterCheckbox.indeterminate = false;
    } else if (checked === n) {
      masterCheckbox.checked = true;
      masterCheckbox.indeterminate = false;
    } else {
      masterCheckbox.checked = false;
      masterCheckbox.indeterminate = true;
    }
    if (masterLabel) masterLabel.textContent = masterCheckbox.checked ? "Unselect all brands" : "Select all brands";
  }
  function applyPreset(preset) {
    if (!wrapper) return;
    var customMode = preset === "custom";
    wrapper.setAttribute("data-preset", preset);
    wrapper.setAttribute("data-custom-mode", customMode ? "true" : "false");
    wrapper.classList.toggle("brand-grid-custom-mode", customMode);
    var preferred = getPreferredSlugs();
    var slugSet = {};
    preferred.forEach(function(s) { slugSet[s] = true; });
    if (preset === "all") {
      brandItems.forEach(function(item) { setBrandItemSelected(item, true); });
      if (emptyPreferredEl) emptyPreferredEl.classList.add("hidden");
      if (grid) grid.style.display = "";
    } else if (preset === "preferred") {
      brandItems.forEach(function(item) {
        var slug = item.getAttribute("data-brand-slug");
        setBrandItemSelected(item, !!slugSet[slug]);
      });
      if (emptyPreferredEl && grid) {
        if (preferred.length === 0) {
          emptyPreferredEl.classList.remove("hidden");
          grid.style.display = "none";
        } else {
          emptyPreferredEl.classList.add("hidden");
          grid.style.display = "";
        }
      }
      updateBrandMasterState();
    } else {
      brandItems.forEach(function(item) {
        var slug = item.getAttribute("data-brand-slug");
        setBrandItemSelected(item, preferred.length ? !!slugSet[slug] : true);
      });
      if (emptyPreferredEl) emptyPreferredEl.classList.add("hidden");
      if (grid) grid.style.display = "";
      updateBrandMasterState();
    }
    presetBtns.forEach(function(btn) {
      var p = btn.getAttribute("data-preset");
      btn.classList.toggle("btn-primary", p === preset);
      btn.classList.toggle("btn-ghost", p !== preset);
    });
    // Force visibility via inline styles so checkboxes and master row show in Custom mode
    if (masterRow) masterRow.style.display = customMode ? "flex" : "none";
    brandCheckboxes.forEach(function(cb) {
      cb.style.display = customMode ? "inline-block" : "none";
    });
  }
  if (wrapper && presetBtns.length) {
    presetBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var preset = btn.getAttribute("data-preset");
        if (wrapper.getAttribute("data-preset") === "custom")
          setPreferredSlugs(getSelectedSlugs());
        applyPreset(preset);
      });
    });
    if (masterCheckbox) {
      masterCheckbox.addEventListener("change", function() {
        if (wrapper.getAttribute("data-custom-mode") !== "true") return;
        brandItems.forEach(function(item) {
          setBrandItemSelected(item, masterCheckbox.checked);
        });
        setPreferredSlugs(getSelectedSlugs());
        updateBrandMasterState();
      });
    }
    brandCheckboxes.forEach(function(cb) {
      cb.addEventListener("click", function(e) { e.stopPropagation(); });
      cb.addEventListener("change", function() {
        if (wrapper.getAttribute("data-custom-mode") !== "true") return;
        var item = cb.closest(".brand-grid-item");
        if (item) {
          item.setAttribute("data-selected", cb.checked ? "true" : "false");
          setPreferredSlugs(getSelectedSlugs());
          updateBrandMasterState();
        }
      });
    });
    // In custom mode, clicking anywhere on the tile toggles the checkbox (except when clicking the checkbox itself)
    brandItems.forEach(function(item) {
      item.addEventListener("click", function(e) {
        if (wrapper.getAttribute("data-custom-mode") !== "true") return;
        if (e.target.closest && e.target.closest(".brand-select-checkbox")) return;
        e.preventDefault();
        var cb = item.querySelector(".brand-select-checkbox");
        if (cb) {
          cb.checked = !cb.checked;
          item.setAttribute("data-selected", cb.checked ? "true" : "false");
          setPreferredSlugs(getSelectedSlugs());
          updateBrandMasterState();
        }
      });
    });
    applyPreset("all");
  }
  if (emptyPreferredEl) {
    var customLink = emptyPreferredEl.querySelector("[data-preset=\"custom\"]");
    if (customLink) customLink.addEventListener("click", function() { applyPreset("custom"); });
  }

  if (area && searchWrap && selectionRow && chipLabel) {
    if (brandSlug && brandOptions.length) {
      var opt = brandOptions.find(function(o) { return o.value === brandSlug; });
      if (opt) {
        chipLabel.textContent = opt.label;
        searchWrap.classList.add("hidden");
        selectionRow.classList.remove("hidden");
      }
    }
    if (grid && searchInput) {
      searchInput.addEventListener("input", function() {
        var q = this.value.trim().toLowerCase();
        var cards = grid.querySelectorAll("[data-brand-name]");
        cards.forEach(function(el) {
          var name = (el.getAttribute("data-brand-name") || "").toLowerCase();
          el.style.display = !q || name.indexOf(q) !== -1 ? "" : "none";
        });
      });
    }
  }

  var trigger = document.getElementById("vehicle-brand-mobile-trigger");
  if (trigger) {
    var panel = trigger.closest("[data-base-path]");
    var basePathMobile = (panel && panel.getAttribute("data-base-path")) || "";
    function runAfterInit(fn) {
      if (typeof filterSelectSetValue === "function") return fn();
      setTimeout(function() { runAfterInit(fn); }, 50);
    }
    runAfterInit(function() {
      var paramsM = new URLSearchParams(window.location.search);
      var brandSlugM = paramsM.get("brand");
      if (brandSlugM && brandOptions.length) {
        var optM = brandOptions.find(function(o) { return o.value === brandSlugM; });
        if (optM && typeof filterSelectSetValue === "function") {
          filterSelectSetValue("vehicle-brand-mobile", optM.value, optM.label);
        }
      }
    });
    var filterSelectWrapper = trigger.closest(".filter-select");
    if (filterSelectWrapper) {
      filterSelectWrapper.addEventListener("filter-select-change", function(e) {
        if (e.detail && e.detail.value) {
          var url = basePathMobile + currentAppPath() + "/" + currentPageSlug() + "/?brand=" + encodeURIComponent(e.detail.value);
          setTimeout(function() { window.location = url; }, 120);
        }
      });
    }
  }

  // ----- Cascade (model / year / engine) -----
  var NOT_SURE = "Not sure";
  var card = document.getElementById("vehicle-cascade-card");
  var promptEl = document.getElementById("vehicle-cascade-prompt");
  var formEl = document.getElementById("vehicle-cascade-form");
  if (card && promptEl && formEl) {
    var basePath = (card.getAttribute("data-base-path") || "").replace(/\/?$/, "/");
    // Cars and trucks brand JSON live in separate folders (brand names can collide across the
    // two — e.g. Volvo Cars vs. Volvo Trucks — so they can't safely share one folder). Defaults
    // to the cars folder; the trucks page sets data-brands-models-path to override it.
    var brandsModelsPath = (card.getAttribute("data-brands-models-path") || "assets/data/brands_models/").replace(/\/?$/, "/");
    var brandSlugC = new URLSearchParams(window.location.search).get("brand");
    var brandData = null;

    function showPrompt() {
      promptEl.classList.remove("hidden");
      formEl.classList.add("hidden");
    }
    function showForm(skipPulse) {
      promptEl.classList.add("hidden");
      formEl.classList.remove("hidden");
      if (!skipPulse) {
        card.classList.add("attention-pulse");
        setTimeout(function() { card.classList.remove("attention-pulse"); }, 750);
      }
    }
    function uniqueSorted(arr) {
      return Array.from(new Set(arr)).sort(function(a, b) { return (typeof a === "number" ? a - b : String(a).localeCompare(b)); });
    }
    function onModelChange(e) {
      var value = e.detail && e.detail.value;
      if (typeof filterSelectClear !== "function") return;
      filterSelectClear("vehicle-year");
      filterSelectClear("vehicle-engine");
      if (!value || !brandData) {
        filterSelectSetOptions("vehicle-year", []);
        filterSelectSetOptions("vehicle-engine", []);
        return;
      }
      if (value === NOT_SURE) {
        var allYears = [];
        var allEngines = [];
        brandData.models.forEach(function(m) {
          (m.years || []).forEach(function(y) { allYears.push(y); });
          (m.engine_types || []).forEach(function(et) { allEngines.push(et); });
        });
        filterSelectSetOptions("vehicle-year", uniqueSorted(allYears).map(function(y) { return { value: y, label: String(y) }; }));
        filterSelectSetOptions("vehicle-engine", uniqueSorted(allEngines).map(function(et) { return { value: et, label: et }; }));
        return;
      }
      var modelItem = brandData.models.find(function(m) { return m.model === value; });
      if (!modelItem) return;
      var years = (modelItem.years || []).map(function(y) { return { value: y, label: String(y) }; });
      var engines = (modelItem.engine_types || []).map(function(et) { return { value: et, label: et }; });
      filterSelectSetOptions("vehicle-year", years);
      filterSelectSetOptions("vehicle-engine", engines);
    }

    if (!brandSlugC) {
      showPrompt();
    } else {
      showForm(true);
      fetch(basePath + brandsModelsPath + encodeURIComponent(brandSlugC) + "_models.json")
        .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error("Brand data not found")); })
        .then(function(data) {
          brandData = data;
          var curatedModels = curatedModelsForBrand(data.brand_name);
          var modelOptions = (data.models || []).map(function(m) {
            return { value: m.model, label: m.model, badge: curatedModels[m.model.trim().toLowerCase()] ? "Demo" : null };
          });
          modelOptions.push({ value: NOT_SURE, label: NOT_SURE });
          if (typeof filterSelectSetOptions === "function") filterSelectSetOptions("vehicle-model", modelOptions);
          filterSelectSetOptions("vehicle-year", []);
          filterSelectSetOptions("vehicle-engine", []);
          card.classList.add("attention-pulse");
          setTimeout(function() { card.classList.remove("attention-pulse"); }, 750);
          var modelWrapper = document.getElementById("vehicle-model-trigger") && document.getElementById("vehicle-model-trigger").closest(".filter-select");
          if (modelWrapper) modelWrapper.addEventListener("filter-select-change", onModelChange);
        })
        .catch(function() {
          showPrompt();
          promptEl.textContent = "Could not load data for this brand. Select another from the grid.";
        });
    }
  }

  // ----- Detail score -----
  var scoreEl = document.getElementById("vehicle-detail-score");
  var timeEl = document.getElementById("vehicle-estimated-time");
  if (scoreEl && timeEl) {
    var LEVELS = [
      { score: 0,   time: null },
      { score: 15,  time: 135 },
      { score: 40,  time: 100 },
      { score: 80,  time: 52 },
      { score: 100, time: 15 }
    ];
    function formatScoreWithVariance(score) {
      if (score === 0) return "0%";
      var band = score >= 100 ? 3 : Math.min(6, Math.floor(score / 15) + 2);
      var delta = Math.round((2 * Math.random() - 1) * band);
      return Math.max(0, Math.min(100, score + delta)) + "%";
    }
    function formatTimeWithVariance(sec) {
      if (sec == null) return "—";
      var pct = 0.1;
      var delta = sec * pct * (2 * Math.random() - 1);
      var total = Math.max(1, Math.round(sec + delta));
      var min = Math.floor(total / 60);
      var s = total % 60;
      return min + ":" + (s < 10 ? "0" : "") + s;
    }
    function getDetailLevel() {
      var paramsD = new URLSearchParams(window.location.search);
      var hasBrand = !!paramsD.get("brand");
      var hasModel = !!getFilterSelectValue("vehicle-model-trigger");
      var hasYear = !!getFilterSelectValue("vehicle-year-trigger");
      var hasEngine = !!getFilterSelectValue("vehicle-engine-trigger");
      if (!hasBrand) return 0;
      if (!hasModel) return 1;
      if (!hasYear) return 2;
      if (!hasEngine) return 3;
      return 4;
    }
    function triggerStatFeedback() {
      [scoreEl, timeEl].forEach(function(el) {
        el.classList.add("attention-pulse");
        setTimeout(function() { el.classList.remove("attention-pulse"); }, 750);
      });
    }
    function updateDetailScore(skipFeedback) {
      var level = getDetailLevel();
      var L = LEVELS[level];
      scoreEl.textContent = formatScoreWithVariance(L.score);
      timeEl.textContent = formatTimeWithVariance(L.time);
      if (!skipFeedback) triggerStatFeedback();
    }
    updateDetailScore(true);
    setTimeout(function() { updateDetailScore(true); }, 400);
    document.addEventListener("filter-select-change", function(e) {
      var triggerD = e.target && e.target.querySelector && e.target.querySelector("summary[id]");
      var idD = triggerD && triggerD.id;
      if (idD === "vehicle-model-trigger" || idD === "vehicle-year-trigger" || idD === "vehicle-engine-trigger") updateDetailScore(false);
    });
    document.addEventListener("click", function(e) {
      if (e.target && e.target.closest && e.target.closest("[data-filter-clear]")) setTimeout(function() { updateDetailScore(false); }, 0);
    });
  }

  // ----- Vehicle-detail-gated info triggers (Show socket location, Show VIN location — both
  // need brand/model/[year]/engine to know which vehicle they're describing before opening their
  // dialog; Trucks pages have no Year step, so that check is skipped when #vehicle-year-trigger
  // isn't on the page) -----
  var vehicleGatedHint = document.getElementById("vehicle-gated-hint");
  function isVehicleFullySpecified() {
    var gatedParams = new URLSearchParams(window.location.search);
    var hasBrand = !!gatedParams.get("brand");
    var hasModel = !!getFilterSelectValue("vehicle-model-trigger");
    var hasYearStep = !!document.getElementById("vehicle-year-trigger");
    var hasYear = !hasYearStep || !!getFilterSelectValue("vehicle-year-trigger");
    var hasEngine = !!getFilterSelectValue("vehicle-engine-trigger");
    return hasBrand && hasModel && hasYear && hasEngine;
  }
  [].forEach.call(document.querySelectorAll("[data-vehicle-gated-dialog]"), function(btn) {
    btn.addEventListener("click", function() {
      if (isVehicleFullySpecified()) {
        if (vehicleGatedHint) vehicleGatedHint.classList.add("hidden");
        var dialog = document.getElementById(btn.getAttribute("data-vehicle-gated-dialog"));
        if (dialog && dialog.showModal) dialog.showModal();
      } else if (vehicleGatedHint) {
        vehicleGatedHint.classList.remove("hidden");
        vehicleGatedHint.classList.add("attention-pulse");
        setTimeout(function() { vehicleGatedHint.classList.remove("attention-pulse"); }, 750);
      }
    });
  });
})();
