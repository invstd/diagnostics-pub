// AI Patterns experiment (src/ai-patterns/PLAN.md §8 step 7): switch each pattern on or off, so test
// sessions can compare the app with and without it. Loaded by layouts/ai-patterns-app.njk before
// any page script; set from Internal demo controls, or from a test link (?aiPatterns=…).
//
//   layeredAssist - Pattern 1, Layered AI Assist. Off = the app as it was before the experiment:
//                   codes that had the original DTC modal (e.g. P010000) open that, the others show
//                   no AI help.
//   symptomCheck  - Pattern 2, Symptom Check. Off = no nav item, the page says it's off, and AI
//                   Assist doesn't cite symptom answers.
//
// Both are on by default. Stored in localStorage "ai-patterns-patterns" (namespaced, PROGRESS.md
// Important decisions #6).
(function () {
  "use strict";

  var KEY = "ai-patterns-patterns";
  var PATTERNS = ["layeredAssist", "symptomCheck"];
  // URL form, for test links: comma-separated slugs, or "none".
  var SLUGS = { layeredAssist: "layered-assist", symptomCheck: "symptom-check" };

  function read() {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    var state = {};
    PATTERNS.forEach(function (p) { state[p] = !stored || stored[p] !== false; });
    return state;
  }
  function write(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // A test link sets the patterns once, then the param is removed so a reload keeps the tester's state.
  var params = new URLSearchParams(window.location.search);
  if (params.has("aiPatterns")) {
    var on = params.get("aiPatterns").split(",");
    var fromLink = {};
    PATTERNS.forEach(function (p) { fromLink[p] = on.indexOf(SLUGS[p]) !== -1; });
    write(fromLink);
    params.delete("aiPatterns");
    var query = params.toString();
    history.replaceState(null, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
  }

  window.AiPatternsToggles = {
    isOn: function (pattern) { return read()[pattern] !== false; },
    set: function (pattern, value) {
      var state = read();
      state[pattern] = !!value;
      write(state);
    },
    // For the test link: "layered-assist,symptom-check", or "none".
    toParam: function () {
      var state = read();
      var list = PATTERNS.filter(function (p) { return state[p]; }).map(function (p) { return SLUGS[p]; });
      return list.length ? list.join(",") : "none";
    }
  };

  // Nav items that belong to a pattern carry data-ai-pattern="<pattern>".
  function hideNav() {
    document.querySelectorAll("[data-ai-pattern]").forEach(function (el) {
      el.classList.toggle("hidden", !window.AiPatternsToggles.isOn(el.getAttribute("data-ai-pattern")));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hideNav);
  else hideNav();
})();
