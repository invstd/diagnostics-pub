// Symptom Check (AI Patterns, Pattern 2: Guided symptom check — src/ai-patterns/PLAN.md §6).
// Page: src/ai-patterns/symptom-check.njk. Content: ai-patterns-symptom-library.js.
// AI element pieces (source tags, sparkle, draft badge, confidence tones) come from
// ai-patterns-ai-assist.js, so both patterns label things the same way.
//
// State is kept in sessionStorage ("ai-patterns-symptom-check") so the check survives going to the
// dashboard and back, and so Layered AI Assist can cite the answers after the targeted scan.
(function () {
  "use strict";

  var root = document.querySelector("[data-symptom-check]");
  var LIB = window.AiPatternsSymptomLibrary;
  if (!root || !LIB) return;

  // Switched off in Internal demo controls (ai-patterns-pattern-toggles.js): the nav item is hidden,
  // and a direct visit says so instead of showing the check.
  if (window.AiPatternsToggles && !window.AiPatternsToggles.isOn("symptomCheck")) {
    root.innerHTML = '<div class="card bg-base-100 border border-base-200 shadow-sm"><div class="card-body">' +
      '<h1 class="card-title text-xl">Symptom Check is turned off</h1>' +
      '<p class="text-sm text-base-content/70">It can be switched back on in Internal demo controls (AI patterns).</p></div></div>';
    var bar = document.querySelector("[data-sc-bar]");
    if (bar) bar.parentElement.remove();
    return;
  }

  var UI = (window.AiPatternsAiAssist && window.AiPatternsAiAssist.ui) || {
    sourceTag: function () { return ""; }, sparkle: "", draftBadge: "", confidenceTones: {}
  };
  var STORAGE_KEY = "ai-patterns-symptom-check";
  var FUEL_LABELS = { diesel: "Diesel", petrol: "Petrol", hybrid: "Hybrid", electric: "Electric" };
  // Every path's causes and questions by id (ids are unique across paths), plus the complaint.
  var CAUSES = {};
  var QUESTIONS = { complaint: LIB.complaint };
  Object.keys(LIB.paths).forEach(function (id) {
    LIB.paths[id].causes.forEach(function (c) { CAUSES[c.id] = c; });
    LIB.paths[id].questions.forEach(function (q) { QUESTIONS[q.id] = q; });
  });

  // The complaint picks the path (engine, adas, …): its causes, questions, known cases and systems.
  function pathOf(s) {
    var chip = LIB.complaint.chips.filter(function (c) { return c.id === s.answers.complaint; })[0];
    return chip ? LIB.paths[chip.path] : null;
  }

  function getBasePath() {
    var m = window.location.pathname.match(/^(.*?\/)ai-patterns\//);
    return m ? m[1] : "/";
  }
  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; });
  }
  function normalizeFuel(engineType) {
    var e = (engineType || "").toLowerCase();
    if (!e) return "";
    if (e.indexOf("hybrid") !== -1) return "hybrid";
    if (e.indexOf("electric") !== -1) return "electric";
    if (e.indexOf("diesel") !== -1) return "diesel";
    if (e.indexOf("petrol") !== -1) return "petrol";
    return "";
  }

  // ----- State -----
  // vehicle: whatever is known (all optional). answers: questionId -> chipId, or "skip" (Not sure).
  // current: a question the mechanic picked (to edit or answer out of order); null = best next one.
  var state = load() || emptyState();
  function emptyState() {
    // prefill: set when the check started from a repair order (see applyRepairOrder).
    return { vehicle: { id: "", vin: "", brand: "", brandSlug: "", model: "", year: "", fuel: "" }, answers: {}, current: null, prefill: null };
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { return null; }
  }
  function save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ----- Ranking -----
  function fuelOf(s) { return s.vehicle.fuel || ""; }

  function context(s, top) {
    return {
      complaint: s.answers.complaint && s.answers.complaint !== "skip" ? s.answers.complaint : "",
      fuel: fuelOf(s),
      // Engine type set in the vehicle card (not through the question): the question isn't needed.
      vehicleFuel: !!s.vehicle.fuel && s.answers.fuel === undefined,
      answers: s.answers,
      top: top || []
    };
  }

  function applies(q, ctx) {
    return !q.applies || q.applies(ctx);
  }

  function visibleChips(q, fuel) {
    return q.chips.filter(function (c) { return !c.fuels || !fuel || c.fuels.indexOf(fuel) !== -1; });
  }

  // Weights for every cause from the complaint, the answers and the model knowledge. Returns the
  // ranked causes (probabilities sum to 1) and the ones ruled out, with the reason.
  function compute(s) {
    var ctx = context(s);
    var path = pathOf(s);
    if (!ctx.complaint || !path) return null;
    var fuel = ctx.fuel;
    var weights = {};
    var notes = {};
    var ruledOut = [];
    var prior = path.priors[ctx.complaint] || {};
    path.causes.forEach(function (c) {
      if (fuel && c.fuels && c.fuels.indexOf(fuel) === -1) {
        ruledOut.push({ cause: c, reason: fuel === "electric" ? "No combustion engine." : "Only on diesel engines." });
        return;
      }
      weights[c.id] = prior[c.id] || 1;
      notes[c.id] = [];
    });

    path.questions.forEach(function (q) {
      var answer = s.answers[q.id];
      if (!answer || answer === "skip" || q.id === "complaint" || q.setsFuel) return;
      if (!applies(q, ctx)) return;
      var chip = q.chips.filter(function (c) { return c.id === answer; })[0];
      if (!chip || !chip.effects) return;
      Object.keys(chip.effects).forEach(function (id) {
        if (weights[id] !== undefined) weights[id] *= chip.effects[id];
      });
    });

    var v = { brandSlug: s.vehicle.brandSlug, model: s.vehicle.model, year: s.vehicle.year, fuel: fuel };
    var knowledge = path.modelKnowledge.filter(function (k) { return k.matches(v); })[0] || null;
    if (knowledge) {
      knowledge.items.forEach(function (item) {
        if (weights[item.cause] === undefined) return;
        if (item.when && !item.when(v)) return;
        if (item.ruleOut) {
          delete weights[item.cause];
          ruledOut.push({ cause: CAUSES[item.cause], reason: item.note + ".", source: item.source });
          return;
        }
        weights[item.cause] *= item.factor;
        notes[item.cause].push(item);
      });
    }

    var total = Object.keys(weights).reduce(function (sum, id) { return sum + weights[id]; }, 0);
    var ranked = Object.keys(weights).map(function (id) {
      return { cause: CAUSES[id], p: total ? weights[id] / total : 0, notes: notes[id] };
    }).sort(function (a, b) { return b.p - a.p; });
    return { path: path, ranked: ranked, ruledOut: ruledOut, knowledge: knowledge };
  }

  function probs(result) {
    var map = {};
    if (result) result.ranked.forEach(function (r) { map[r.cause.id] = r.p; });
    return map;
  }

  function withAnswer(s, qid, chipId) {
    var next = JSON.parse(JSON.stringify(s));
    next.answers[qid] = chipId;
    if (QUESTIONS[qid].setsFuel) next.vehicle.fuel = chipId;
    return next;
  }

  // How much each possible answer would move the ranking, averaged over the answers. The question
  // with the biggest expected shift is the one that best separates the remaining causes.
  function separation(s, q, result) {
    var before = probs(result);
    var chips = visibleChips(q, fuelOf(s));
    if (!chips.length) return 0;
    var totalShift = chips.reduce(function (sum, chip) {
      var after = probs(compute(withAnswer(s, q.id, chip.id)));
      var ids = Object.keys(before).concat(Object.keys(after));
      return sum + ids.reduce(function (d, id) { return d + Math.abs((after[id] || 0) - (before[id] || 0)); }, 0);
    }, 0);
    return totalShift / chips.length;
  }

  function openQuestions(s, result) {
    var top = result ? result.ranked.map(function (r) { return r.cause.id; }) : [];
    var ctx = context(s, top);
    var path = pathOf(s);
    return (path ? path.questions : []).filter(function (q) {
      return s.answers[q.id] === undefined && applies(q, ctx);
    });
  }

  function nextQuestion(s, result) {
    if (s.answers.complaint === undefined) return QUESTIONS.complaint;
    var candidates = openQuestions(s, result);
    var best = null;
    var bestScore = -1;
    candidates.forEach(function (q) {
      var score = separation(s, q, result);
      if (score > bestScore + 0.001) { best = q; bestScore = score; }
    });
    // Questions that wouldn't change anything aren't worth the mechanic's time.
    return bestScore > 0.01 ? best : null;
  }

  // Which two of the current top causes this question pulls apart the most, for the hint.
  function separatesPair(s, q, result) {
    // The complaint sets the start, and the engine type rules causes out rather than separating two.
    if (!result || q.id === "complaint" || q.setsFuel) return null;
    var before = probs(result);
    var top = result.ranked.slice(0, 4).map(function (r) { return r.cause.id; });
    var best = null;
    visibleChips(q, fuelOf(s)).forEach(function (chip) {
      var after = probs(compute(withAnswer(s, q.id, chip.id)));
      for (var i = 0; i < top.length; i++) {
        for (var j = i + 1; j < top.length; j++) {
          var a = top[i], b = top[j];
          var ra = (after[a] || 0.0001) / before[a];
          var rb = (after[b] || 0.0001) / before[b];
          var gap = Math.abs(Math.log(ra) - Math.log(rb));
          if (!best || gap > best.gap) best = { gap: gap, a: a, b: b };
        }
      }
    });
    return best && best.gap > 0.3 ? [CAUSES[best.a], CAUSES[best.b]] : null;
  }

  // Never "high": a symptom check narrows things down, the scan and the checks confirm.
  function confidence(s, result) {
    var answered = Object.keys(s.answers).filter(function (k) { return s.answers[k] !== "skip" && k !== "complaint"; }).length;
    // Partly known: the engine type for the engine path, the brand for the others.
    var vehicleLevel = s.vehicle.brand && s.vehicle.model ? 2 : ((result.path.usesFuel ? fuelOf(s) : s.vehicle.brand) ? 1 : 0);
    var gap = result.ranked.length > 1 ? result.ranked[0].p - result.ranked[1].p : 1;
    if (vehicleLevel === 2 && answered >= 4 && gap > 0.1) {
      return { level: "medium-high", label: "Medium-high confidence", reason: "The vehicle is known, model-specific cases are included, and your answers clearly favour the top cause. The scan and the first checks confirm it." };
    }
    if (vehicleLevel >= 1 && answered >= 3 && gap > 0.06) {
      return { level: "medium", label: "Medium confidence", reason: "Enough answers to separate the main causes" + (vehicleLevel === 1 ? ", but without the brand and model, known issues for this vehicle aren't included." : ", but the top causes are still close.") };
    }
    return { level: "low", label: "Low confidence", reason: vehicleLevel === 0 ? "No vehicle details yet, so these are general causes. Each answer, and the vehicle details, narrow them down." : "Only a few answers so far. Each answer narrows the causes down." };
  }

  function likelihood(p) {
    if (p >= 0.3) return { label: "Most likely", cls: "badge-primary" };
    if (p >= 0.18) return { label: "Likely", cls: "badge-info" };
    if (p >= 0.08) return { label: "Possible", cls: "badge-ghost" };
    return { label: "Less likely", cls: "badge-ghost" };
  }

  // ----- Rendering -----
  var questionEl = root.querySelector("[data-sc-question]");
  var answersWrap = root.querySelector("[data-sc-answers-wrap]");
  var answersEl = root.querySelector("[data-sc-answers]");
  var otherWrap = root.querySelector("[data-sc-other-wrap]");
  var otherEl = root.querySelector("[data-sc-other]");
  var otherTitle = root.querySelector("[data-sc-other-title]");
  var panelEl = root.querySelector("[data-sc-panel]");
  var sheet = document.querySelector("[data-sc-sheet]");
  var sheetPanel = document.querySelector("[data-sc-sheet-panel]");
  var barBtn = document.querySelector("[data-sc-bar]");
  var barContent = document.querySelector("[data-sc-bar-content]");
  var vehicleSummary = root.querySelector("[data-sc-vehicle-summary]");

  var EDIT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 shrink-0 text-base-content/40" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var INFO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';

  function chipLabel(q, id) {
    if (id === "skip") return "Not sure";
    var chip = q.chips.filter(function (c) { return c.id === id; })[0];
    return chip ? chip.label : id;
  }

  function aiTag(label) {
    return '<span class="badge badge-soft badge-primary badge-xs gap-1 shrink-0">' + UI.sparkle + label + "</span>";
  }

  function renderVehicleSummary() {
    var v = state.vehicle;
    var parts = [];
    if (v.brand) parts.push(v.brand + (v.model ? " " + v.model : ""));
    if (v.year) parts.push(v.year);
    if (v.fuel) parts.push(FUEL_LABELS[v.fuel]);
    vehicleSummary.textContent = parts.length ? parts.join(" · ") : "Not specified";
  }

  // The reading for an answer, only while it's still the answer read from the repair order (a changed
  // answer is the mechanic's own and loses the tag).
  function readFromRepairOrder(qid) {
    var read = state.prefill && state.prefill.read[qid];
    return read && state.answers[qid] === read.answer ? read : null;
  }

  var roBanner = root.querySelector("[data-sc-ro-banner]");
  function renderRepairOrderBanner() {
    var pf = state.prefill;
    roBanner.classList.toggle("hidden", !pf);
    if (!pf) { roBanner.innerHTML = ""; return; }
    var count = Object.keys(pf.read).length;
    roBanner.innerHTML =
      '<div class="rounded-box border border-primary/30 bg-primary/5 p-3 flex flex-col gap-1.5">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<p class="text-sm text-base-content"><span class="font-semibold">' + esc(pf.number) + "</span> · " + esc(pf.vehicleLabel) + "</p>" +
          '<button type="button" class="link link-hover text-xs text-base-content/60 shrink-0" data-sc-ro-clear>Remove</button>' +
        "</div>" +
        '<p class="text-sm text-base-content/80 italic">“' + esc(pf.text) + "”</p>" +
        '<p class="text-xs text-base-content/70 flex flex-wrap items-center gap-1.5">' +
          (count
            ? '<span class="badge badge-soft badge-primary badge-xs gap-1">' + UI.sparkle + "AI</span>" + count + (count === 1 ? " answer" : " answers") + " read from this text. Check them below; the rest is asked as usual."
            : "Nothing in the complaint text matched the questions, so only the vehicle was filled in.") +
        "</p>" +
      "</div>";
  }

  function renderAnswers(result) {
    var top = result ? result.ranked.map(function (r) { return r.cause.id; }) : [];
    var ctx = context(state, top);
    var path = pathOf(state);
    var rows = [LIB.complaint].concat(path ? path.questions : []).filter(function (q) {
      return state.answers[q.id] !== undefined && (q.setsFuel || applies(q, ctx));
    });
    answersWrap.classList.toggle("hidden", !rows.length);
    answersEl.innerHTML = rows.map(function (q) {
      var editing = state.current === q.id;
      var read = readFromRepairOrder(q.id);
      return (
        '<li><button type="button" class="w-full flex items-center gap-3 rounded-box border ' + (editing ? "border-primary" : "border-base-200") + ' bg-base-100 px-3 py-2 text-left hover:bg-base-200/60" data-sc-edit="' + q.id + '" aria-label="Change answer: ' + esc(q.label) + '">' +
          '<span class="text-xs text-base-content/60 w-32 shrink-0">' + esc(q.label) + "</span>" +
          '<span class="flex-1 min-w-0">' +
            '<span class="block text-sm ' + (state.answers[q.id] === "skip" ? "text-base-content/50 italic" : "text-base-content") + '">' + esc(chipLabel(q, state.answers[q.id])) + "</span>" +
            // Read from the repair order's text (AI, so the sparkle), with the phrase it came from.
            (read ? '<span class="flex flex-wrap items-center gap-1.5 mt-1"><span class="badge badge-soft badge-primary badge-xs gap-1">' + UI.sparkle + "Read from repair order</span>" +
              '<span class="text-xs text-base-content/60 italic">“' + esc(read.quote) + "”</span></span>" : "") +
          "</span>" +
          EDIT_SVG +
        "</button></li>"
      );
    }).join("");
  }

  function renderQuestion(result) {
    var q = state.current ? QUESTIONS[state.current] : nextQuestion(state, result);
    var fuel = fuelOf(state);
    if (!q) {
      questionEl.innerHTML =
        '<div class="card-body p-5 gap-3">' +
          '<p class="text-base font-semibold text-base-content">No more questions would change the ranking.</p>' +
          '<p class="text-sm text-base-content/70">Change any answer above, or add vehicle details, to refine it further.</p>' +
          '<button type="button" class="btn btn-primary btn-sm self-start lg:hidden" data-sc-open-sheet>See the plan</button>' +
        "</div>";
      return null;
    }
    var pair = separatesPair(state, q, result);
    var selected = state.answers[q.id];
    // Chips are answers, not actions: sentence case in the body font, overriding the theme's all-caps
    // headline font for .btn (a deliberate exception to the button spec, PLAN.md §10).
    // Long answers wrap inside the chip instead of widening the page on phones.
    var CHIP = "btn btn-sm h-auto min-h-9 py-1.5 rounded-full font-normal normal-case! [font-family:inherit]! whitespace-normal! max-w-full ";
    var chips = visibleChips(q, fuel).map(function (c) {
      var on = selected === c.id;
      return '<button type="button" class="' + CHIP + (on ? "btn-primary" : "btn-outline border-base-300") + '" data-sc-answer="' + c.id + '" aria-pressed="' + on + '">' + esc(c.label) + "</button>";
    });
    if (!q.noSkip) {
      var skipOn = selected === "skip";
      chips.push('<button type="button" class="' + CHIP + (skipOn ? "btn-neutral" : "btn-ghost text-base-content/70") + '" data-sc-answer="skip" aria-pressed="' + skipOn + '">Not sure</button>');
    }
    var answersHtml = '<div class="flex flex-wrap gap-2" role="group" aria-labelledby="sc-question-text">' + chips.join("") + "</div>";
    if (q.groups) answersHtml = complaintGroupsHtml(q, selected, fuel, CHIP);
    questionEl.innerHTML =
      '<div class="card-body p-5 gap-4">' +
        "<div>" +
          '<p class="text-lg font-semibold text-base-content" id="sc-question-text">' + esc(q.text) + "</p>" +
          '<div class="flex items-start gap-1.5 text-xs text-base-content/70 mt-2">' + INFO_SVG +
            '<p class="flex-1"><span class="font-medium text-base-content/80">Why I\'m asking: </span>' + esc(q.hint) +
              (pair ? " Helps tell <strong class=\"font-medium\">" + esc(pair[0].short) + "</strong> and <strong class=\"font-medium\">" + esc(pair[1].short) + "</strong> apart." : "") +
            "</p>" +
            (q.id !== "complaint" ? aiTag("AI") : "") +
            (q.draft ? UI.draftBadge : "") +
          "</div>" +
        "</div>" +
        answersHtml +
        (state.current && selected !== undefined ? '<button type="button" class="link link-hover text-xs text-base-content/60 self-start" data-sc-cancel-edit>Keep this answer</button>' : "") +
      "</div>";
    return q;
  }

  // The complaint list, grouped. Complaints not scripted in the prototype are shown disabled, so the
  // breadth of the real list is visible; ones that don't exist on this engine type are hidden.
  function complaintGroupsHtml(q, selected, fuel, chipClass) {
    return '<div class="flex flex-col gap-4">' + q.groups.map(function (g) {
      var groupChips = g.chips.filter(function (c) { return !c.fuels || !fuel || c.fuels.indexOf(fuel) !== -1; });
      if (!groupChips.length) return "";
      return '<div role="group" aria-label="' + esc(g.label) + '">' +
        '<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">' + esc(g.label) + "</p>" +
        '<div class="flex flex-wrap gap-2">' + groupChips.map(function (c) {
          if (!c.path) {
            return '<button type="button" class="' + chipClass + 'btn-outline border-base-300" disabled title="Not in this prototype">' + esc(c.label) + "</button>";
          }
          var on = selected === c.id;
          return '<button type="button" class="' + chipClass + (on ? "btn-primary" : "btn-outline border-base-300") + '" data-sc-answer="' + c.id + '" aria-pressed="' + on + '">' + esc(c.label) + "</button>";
        }).join("") + "</div></div>";
    }).join("") +
    '<p class="text-xs text-base-content/50">Greyed-out complaints aren\'t scripted in this prototype yet.</p></div>';
  }

  function renderOther(result, current) {
    var list = openQuestions(state, result).filter(function (q) { return !current || q.id !== current.id; });
    otherWrap.classList.toggle("hidden", !list.length || state.answers.complaint === undefined);
    otherTitle.textContent = "Other questions (" + list.length + ")";
    otherEl.innerHTML = list.map(function (q) {
      return '<li><button type="button" class="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-base-200" data-sc-pick="' + q.id + '">' + esc(q.text) + "</button></li>";
    }).join("");
  }

  function vehicleReadyForScan() {
    return !!(state.vehicle.brand && state.vehicle.model);
  }

  function scanUrl() {
    var v = state.vehicle;
    var params = new URLSearchParams();
    if (v.id) params.set("vehicleId", v.id);
    params.set("brand", v.brand);
    params.set("brandSlug", v.brandSlug);
    params.set("model", v.model);
    if (v.year) params.set("year", v.year);
    if (v.fuel) params.set("engine", FUEL_LABELS[v.fuel]);
    if (v.vin) params.set("vin", v.vin);
    params.set("scan", Object.keys(pathOf(state).systems).join(","));
    return getBasePath() + "ai-patterns/diagnostics-dashboard/?" + params.toString();
  }

  function panelHtml(result) {
    var fuel = fuelOf(state);
    var html = '<div class="flex items-center justify-between gap-2">' +
      '<h2 class="text-base font-semibold text-base-content">Likely causes</h2>' + aiTag("AI ranking") + "</div>";

    if (!result) {
      return html + '<p class="text-sm text-base-content/60">Answer the first question to see likely causes.</p>';
    }
    var path = result.path;
    if (!result.ranked.length) {
      return html + '<div class="alert alert-soft alert-info text-sm">The causes scripted for this complaint are for combustion engines. An electric vehicle\'s version isn\'t in the prototype yet.</div>';
    }

    var conf = confidence(state, result);
    var v = state.vehicle;
    var scope;
    if (result.knowledge) scope = "Includes known cases for the " + result.knowledge.label + ".";
    else if (path.usesFuel && fuel) scope = "General " + FUEL_LABELS[fuel].toLowerCase() + " causes" + (v.brand ? ", no known cases for this model in the prototype." : ". Add the brand and model to include known cases.");
    else if (v.brand) scope = "General causes, no known cases for this model in the prototype.";
    else scope = "General causes, vehicle not specified.";
    if (path.scriptedFor && fuel && path.scriptedFor.indexOf(fuel) === -1) {
      scope += " The questions are scripted for " + path.scriptedFor.map(function (f) { return FUEL_LABELS[f].toLowerCase(); }).join(" and ") + " engines, so this ranking is incomplete.";
    }

    html +=
      '<div class="flex flex-col gap-1.5">' +
        '<button type="button" class="badge badge-soft gap-1 cursor-pointer self-start ' + (UI.confidenceTones[conf.level] || "") + '" data-sc-confidence aria-expanded="false">' + conf.label + "</button>" +
        '<p class="text-xs text-base-content/70 hidden" data-sc-confidence-reason>' + esc(conf.reason) + "</p>" +
        '<p class="text-xs text-base-content/60">' + esc(scope) + "</p>" +
      "</div>";

    // Top five stay in view; the rest fold away so the plan stays close.
    var max = result.ranked.length ? result.ranked[0].p : 1;
    function causeRow(r) {
      var like = likelihood(r.p);
      return (
        '<li class="rounded-box -mx-2 px-2 py-1 transition-colors duration-700" data-cause-id="' + r.cause.id + '">' +
          '<div class="flex items-center justify-between gap-2">' +
            '<span class="text-sm font-medium text-base-content">' + esc(r.cause.name) + "</span>" +
            '<span class="badge badge-soft badge-xs shrink-0 ' + like.cls + '">' + like.label + "</span>" +
          "</div>" +
          '<div class="h-1.5 rounded-full bg-base-200 mt-1.5 overflow-hidden"><div class="h-full rounded-full bg-primary transition-[width] duration-500" style="width:' + Math.max(4, Math.round(r.p / max * 100)) + '%"></div></div>' +
          // A scan won't find these: said on the cause itself, so a clean scan isn't read as "not this".
          (r.cause.noCode ? '<p class="text-xs text-base-content/50 mt-1">Usually no fault code</p>' : "") +
          r.notes.map(function (n) {
            return '<p class="text-xs text-base-content/70 mt-1.5 flex flex-wrap items-center gap-1.5">' +
              '<a class="link link-hover" href="' + n.source.url + '" target="_blank" rel="noopener">' + esc(n.note) + "</a>" + UI.sourceTag(n.source.trust) + "</p>";
          }).join("") +
        "</li>"
      );
    }
    var shown = result.ranked.slice(0, 5);
    var folded = result.ranked.slice(5);
    html += '<ul class="flex flex-col gap-3" data-sc-causes>' + shown.map(causeRow).join("") + "</ul>";
    if (folded.length) {
      html += '<details class="group" data-sc-more' + (moreOpen ? " open" : "") + '>' +
        '<summary class="text-xs text-base-content/60 cursor-pointer list-none flex items-center gap-1 hover:text-base-content">' +
          '<span class="group-open:hidden">Show ' + folded.length + " less likely</span><span class=\"hidden group-open:inline\">Hide less likely</span></summary>" +
        '<ul class="flex flex-col gap-3 mt-3">' + folded.map(causeRow).join("") + "</ul></details>";
    }

    var ruledForVehicle = result.ruledOut.filter(function (r) { return r.source; });
    if (ruledForVehicle.length) {
      html += '<div><p class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">Ruled out for this vehicle</p>' +
        ruledForVehicle.map(function (r) {
          return '<div class="rounded-box border border-dashed border-base-300 p-2.5 mb-2">' +
            '<p class="text-sm font-medium text-base-content/60 line-through decoration-base-content/30">' + esc(r.cause.name) + "</p>" +
            '<p class="text-xs text-base-content/60 mt-1 flex flex-wrap items-center gap-1.5"><a class="link link-hover" href="' + r.source.url + '" target="_blank" rel="noopener">' + esc(r.reason) + "</a>" + UI.sourceTag(r.source.trust) + "</p>" +
          "</div>";
        }).join("") + "</div>";
    }
    var ruledByFuel = result.ruledOut.filter(function (r) { return !r.source; });
    if (ruledByFuel.length) {
      html += '<p class="text-xs text-base-content/50">Not possible on a ' + FUEL_LABELS[fuel].toLowerCase() + ": " + ruledByFuel.map(function (r) { return esc(r.cause.short); }).join(", ") + ".</p>";
    }

    // The plan: what to check first and what to scan. Suggestions only; the mechanic runs everything.
    var checks = result.ranked.slice(0, 2);
    html += '<div class="border-t border-base-200 pt-4 flex flex-col gap-3">' +
      '<h3 class="text-sm font-semibold text-base-content">Plan</h3>' +
      '<div><p class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-1.5">Check first</p>' +
        '<ol class="list-decimal list-outside pl-5 text-sm text-base-content/80 flex flex-col gap-1.5">' + checks.map(function (r) {
          return "<li><span class=\"font-medium text-base-content\">" + esc(r.cause.short) + ":</span> " + esc(r.cause.check) + (r.cause.checkDraft ? " " + UI.draftBadge : "") + "</li>";
        }).join("") + "</ol></div>" +
      '<div><p class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-1.5">Scan</p>' +
        '<p class="text-sm text-base-content/80">' + Object.keys(path.systems).map(function (id) { return esc(path.systems[id].label); }).join(", ") +
        (path.scanNote ? ". " + esc(path.scanNote) : ": the likely causes above store their fault codes there.") + "</p></div>" +
      (vehicleReadyForScan()
        ? '<a class="btn btn-primary btn-sm" href="' + esc(scanUrl()) + '" data-sc-scan>Scan ' + esc(Object.keys(path.systems).map(function (id) { return path.systems[id].label; }).join(" + ")) + "</a>"
        : '<button type="button" class="btn btn-outline btn-sm" data-sc-add-vehicle>Add vehicle to scan</button>') +
      '<p class="text-xs text-base-content/50">Suggestions to narrow things down, not a diagnosis. Answers marked “Not sure” are left out.</p>' +
    "</div>";
    return html;
  }

  function barHtml(result) {
    if (!result || !result.ranked.length) {
      return '<span class="block text-sm text-base-content/70">' + (result ? "No scripted causes for this vehicle" : "Likely causes appear after the first answer") + "</span>";
    }
    var max = result.ranked[0].p;
    return '<span class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-1.5">Likely causes ' + UI.sparkle + "</span>" +
      '<span class="grid grid-cols-3 gap-3">' + result.ranked.slice(0, 3).map(function (r) {
        return '<span class="min-w-0" data-cause-id="' + r.cause.id + '">' +
          '<span class="block text-xs font-medium text-base-content truncate">' + esc(r.cause.short) + "</span>" +
          '<span class="block h-1 rounded-full bg-base-200 mt-1 overflow-hidden"><span class="block h-full rounded-full bg-primary transition-[width] duration-500" style="width:' + Math.max(6, Math.round(r.p / max * 100)) + '%"></span></span>' +
        "</span>";
      }).join("") + "</span>";
  }

  // FLIP: causes slide to their new place, and one that moved up flashes, so the re-ranking is seen.
  function renderWithMotion(container, html) {
    var before = {};
    container.querySelectorAll("[data-cause-id]").forEach(function (el) { before[el.getAttribute("data-cause-id")] = el.getBoundingClientRect(); });
    var oldOrder = Array.prototype.map.call(container.querySelectorAll("[data-cause-id]"), function (el) { return el.getAttribute("data-cause-id"); });
    container.innerHTML = html;
    var newEls = container.querySelectorAll("[data-cause-id]");
    newEls.forEach(function (el, index) {
      var id = el.getAttribute("data-cause-id");
      var old = before[id];
      if (!old) return;
      var now = el.getBoundingClientRect();
      var dx = old.left - now.left;
      var dy = old.top - now.top;
      if (!dx && !dy) return;
      el.style.transform = "translate(" + dx + "px," + dy + "px)";
      el.getBoundingClientRect();
      el.style.transition = "transform 450ms cubic-bezier(.2,.8,.2,1)";
      el.style.transform = "";
      if (oldOrder.indexOf(id) > index) {
        el.classList.add("bg-primary/10");
        setTimeout(function () { el.classList.remove("bg-primary/10"); }, 900);
      }
    });
  }

  var confidenceOpen = false;
  var moreOpen = false; // "Show N less likely" stays as the mechanic left it between answers
  function render() {
    var result = compute(state);
    renderVehicleSummary();
    renderRepairOrderBanner();
    renderAnswers(result);
    var current = renderQuestion(result);
    renderOther(result, current);
    var html = panelHtml(result);
    renderWithMotion(panelEl, html);
    if (sheetPanel) renderWithMotion(sheetPanel, html);
    if (barContent) renderWithMotion(barContent, barHtml(result));
    document.querySelectorAll("[data-sc-confidence-reason]").forEach(function (el) { el.classList.toggle("hidden", !confidenceOpen); });
    document.querySelectorAll("[data-sc-confidence]").forEach(function (el) { el.setAttribute("aria-expanded", String(confidenceOpen)); });
    save();
  }

  // ----- Interaction -----
  function answer(qid, chipId) {
    var q = QUESTIONS[qid];
    state.answers[qid] = chipId;
    if (q.setsFuel) {
      state.vehicle.fuel = chipId === "skip" ? "" : chipId;
      syncEngineSelect();
    }
    state.current = null;
    render();
  }

  root.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-sc-answer]");
    if (chip) {
      var q = state.current ? QUESTIONS[state.current] : nextQuestion(state, compute(state));
      if (q) answer(q.id, chip.getAttribute("data-sc-answer"));
      return;
    }
    var edit = e.target.closest("[data-sc-edit]");
    if (edit) {
      var id = edit.getAttribute("data-sc-edit");
      state.current = state.current === id ? null : id;
      render();
      questionEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    var pick = e.target.closest("[data-sc-pick]");
    if (pick) {
      state.current = pick.getAttribute("data-sc-pick");
      otherWrap.open = false;
      render();
      questionEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    if (e.target.closest("[data-sc-cancel-edit]")) {
      state.current = null;
      render();
      return;
    }
    if (e.target.closest("[data-sc-restart]")) {
      state = emptyState();
      confidenceOpen = false;
      resetVehicleSelects();
      setVehicleOpen(true);
      render();
      return;
    }
    if (e.target.closest("[data-sc-open-sheet]") && sheet) sheet.showModal();
    // "Remove" on the repair order line: drop the answers read from it, keep the vehicle.
    if (e.target.closest("[data-sc-ro-clear]")) {
      Object.keys(state.prefill.read).forEach(function (qid) {
        if (readFromRepairOrder(qid)) delete state.answers[qid];
      });
      state.prefill = null;
      state.current = null;
      clearSilently("sc-ro");
      render();
    }
  });

  function onPanelClick(e) {
    if (e.target.closest("[data-sc-confidence]")) {
      confidenceOpen = !confidenceOpen;
      document.querySelectorAll("[data-sc-confidence-reason]").forEach(function (el) { el.classList.toggle("hidden", !confidenceOpen); });
      document.querySelectorAll("[data-sc-confidence]").forEach(function (el) { el.setAttribute("aria-expanded", String(confidenceOpen)); });
    }
    if (e.target.closest("[data-sc-add-vehicle]")) {
      if (sheet && sheet.open) sheet.close();
      setVehicleOpen(true);
      var brand = document.getElementById("sc-brand-trigger");
      root.querySelector("[data-sc-vehicle]").scrollIntoView({ block: "start", behavior: "smooth" });
      if (brand) brand.focus();
    }
  }
  function onMoreToggle(e) {
    if (e.target.matches && e.target.matches("[data-sc-more]")) moreOpen = e.target.open;
  }
  panelEl.addEventListener("toggle", onMoreToggle, true);
  if (sheetPanel) sheetPanel.addEventListener("toggle", onMoreToggle, true);
  panelEl.addEventListener("click", onPanelClick);
  if (sheetPanel) sheetPanel.addEventListener("click", onPanelClick);
  if (barBtn && sheet) barBtn.addEventListener("click", function () { sheet.showModal(); });

  // ----- Vehicle card (optional, any field on its own) -----
  var recent = [];
  try { recent = JSON.parse(document.getElementById("symptom-check-recent-data").textContent) || []; } catch (e) {}
  var vehicleBody = root.querySelector("[data-sc-vehicle-body]");
  var vehicleToggle = root.querySelector("[data-sc-vehicle-toggle]");
  var modelData = []; // current brand's models (from assets/data/brands_models)
  var ALL_YEARS = [];
  for (var y = 2026; y >= 2000; y--) ALL_YEARS.push(String(y));

  function setVehicleOpen(open) {
    vehicleBody.classList.toggle("hidden", !open);
    vehicleToggle.textContent = open ? "Done" : (state.vehicle.brand || state.vehicle.fuel || state.vehicle.year ? "Change" : "Add");
    vehicleToggle.setAttribute("aria-expanded", String(open));
  }
  vehicleToggle.addEventListener("click", function () { setVehicleOpen(vehicleBody.classList.contains("hidden")); });

  function onSelect(id, handler) {
    var trigger = document.getElementById(id + "-trigger");
    if (trigger) trigger.closest(".filter-select").addEventListener("filter-select-change", function (e) { handler(e.detail.value, e.detail.label); });
  }
  function setSelect(id, value, label) {
    if (value) window.filterSelectSetValue(id, value, label || value);
    else if (window.filterSelectClearSilently) window.filterSelectClearSilently(id);
    else clearSilently(id);
  }
  // filterSelectClear() fires a change event; clearing as a side effect of another change must not.
  function clearSilently(id) {
    var trigger = document.getElementById(id + "-trigger");
    if (!trigger) return;
    var wrapper = trigger.closest(".filter-select");
    wrapper.querySelector(".filter-select-placeholder").classList.remove("hidden");
    wrapper.querySelector("[data-filter-chip]").classList.add("hidden");
    var check = wrapper.querySelector("[data-filter-check]");
    if (check) check.classList.add("hidden");
    wrapper.querySelector("[data-value-input]").value = "";
  }

  function yearOptions() {
    var m = modelData.filter(function (x) { return x.model === state.vehicle.model; })[0];
    return m ? m.years.slice().reverse().map(String) : ALL_YEARS;
  }
  function engineOptions() {
    var m = modelData.filter(function (x) { return x.model === state.vehicle.model; })[0];
    if (!m) return ["Diesel", "Petrol", "Hybrid", "Electric"];
    var seen = {};
    return m.engine_types.map(function (t) { return FUEL_LABELS[normalizeFuel(t)]; }).filter(function (t) {
      if (!t || seen[t]) return false;
      seen[t] = true;
      return true;
    });
  }

  function loadModels(brandSlug) {
    modelData = [];
    window.filterSelectSetOptions("sc-model", []);
    if (!brandSlug) return Promise.resolve();
    return fetch(getBasePath() + "assets/data/brands_models/" + encodeURIComponent(brandSlug) + "_models.json")
      .then(function (r) { return r.ok ? r.json() : { models: [] }; })
      .catch(function () { return { models: [] }; })
      .then(function (data) {
        modelData = data.models || [];
        window.filterSelectSetOptions("sc-model", modelData.map(function (m) { return m.model; }));
        window.filterSelectSetOptions("sc-year", yearOptions());
        window.filterSelectSetOptions("sc-engine", engineOptions());
      });
  }

  function syncEngineSelect() {
    setSelect("sc-engine", state.vehicle.fuel ? FUEL_LABELS[state.vehicle.fuel] : "");
  }

  // Engine type is the same data as the "What does it run on?" answer: keep both in step.
  function setFuel(fuel) {
    state.vehicle.fuel = fuel;
    if (state.answers.fuel !== undefined) {
      if (fuel) state.answers.fuel = fuel;
      else delete state.answers.fuel;
    }
  }

  function clearRecent() {
    state.vehicle.id = "";
    state.vehicle.vin = "";
    clearSilently("sc-recent");
    dropPrefillIfOtherVehicle();
  }

  // Fills the vehicle card from a Garage vehicle (recent vehicle or repair order).
  function applyVehicle(v) {
    state.vehicle = { id: v.id, vin: v.vin || "", brand: v.brand, brandSlug: v.brandSlug || "", model: v.model, year: v.year, fuel: "" };
    setFuel(normalizeFuel(v.engineType));
    setSelect("sc-recent", v.id, v.brand + " " + v.model + " · " + v.year + " · " + v.engineType);
    setSelect("sc-brand", v.brandSlug, v.brand);
    loadModels(v.brandSlug).then(function () {
      setSelect("sc-model", v.model);
      window.filterSelectSetOptions("sc-year", yearOptions());
      window.filterSelectSetOptions("sc-engine", engineOptions());
      setSelect("sc-year", v.year);
      syncEngineSelect();
    });
    setVehicleOpen(false);
  }

  // Starting from a repair order is a new check: the vehicle, plus the answers its complaint text
  // clearly gives (LIB.repairOrderReadings), each with the phrase it was read from.
  function applyRepairOrder(ro) {
    state = emptyState();
    confidenceOpen = false;
    applyVehicle({ id: ro.vehicleId, vin: ro.vin, brand: ro.brand, brandSlug: ro.brandSlug, model: ro.model, year: ro.year, engineType: ro.engineType });
    var read = {};
    (LIB.repairOrderReadings[ro.vehicleId] || []).forEach(function (r) {
      state.answers[r.question] = r.answer;
      read[r.question] = { answer: r.answer, quote: r.quote };
    });
    state.prefill = {
      vehicleId: ro.vehicleId,
      number: ro.number,
      vehicleLabel: ro.brand + " " + ro.model + " (" + ro.year + ")",
      text: [ro.description, ro.notes].filter(Boolean).join(" "),
      read: read
    };
    setSelect("sc-ro", ro.vehicleId, roLabel(ro));
    render();
  }

  // A different vehicle than the repair order's: the answers stay, but they're no longer "read from" it.
  function dropPrefillIfOtherVehicle() {
    if (state.prefill && state.vehicle.id !== state.prefill.vehicleId) {
      state.prefill = null;
      clearSilently("sc-ro");
    }
  }

  onSelect("sc-recent", function (value) {
    var v = recent.filter(function (r) { return r.id === value; })[0];
    if (!v) { clearRecent(); dropPrefillIfOtherVehicle(); render(); return; }
    applyVehicle(v);
    dropPrefillIfOtherVehicle();
    render();
  });

  var repairOrders = [];
  try { repairOrders = JSON.parse(document.getElementById("symptom-check-ro-data").textContent) || []; } catch (e) {}
  // Open ones only: a car that's ready for pickup or done isn't being diagnosed.
  repairOrders = repairOrders.filter(function (ro) { return ro.number && ro.status !== "Ready for Pickup" && ro.status !== "Completed"; });
  function roLabel(ro) {
    return ro.number + " · " + ro.brand + " " + ro.model + " · " + ro.description;
  }
  onSelect("sc-ro", function (value) {
    var ro = repairOrders.filter(function (r) { return r.vehicleId === value; })[0];
    if (ro) applyRepairOrder(ro);
    else { state.prefill = null; render(); }
  });
  onSelect("sc-brand", function (value, label) {
    clearRecent();
    state.vehicle.brandSlug = value;
    state.vehicle.brand = value ? label : "";
    state.vehicle.model = "";
    clearSilently("sc-model");
    loadModels(value);
    render();
  });
  onSelect("sc-model", function (value) {
    clearRecent();
    state.vehicle.model = value;
    window.filterSelectSetOptions("sc-year", yearOptions());
    window.filterSelectSetOptions("sc-engine", engineOptions());
    render();
  });
  onSelect("sc-year", function (value) {
    clearRecent();
    state.vehicle.year = value;
    render();
  });
  onSelect("sc-engine", function (value) {
    clearRecent();
    setFuel(normalizeFuel(value));
    render();
  });

  function resetVehicleSelects() {
    ["sc-ro", "sc-recent", "sc-brand", "sc-model", "sc-year", "sc-engine"].forEach(clearSilently);
    modelData = [];
    window.filterSelectSetOptions("sc-model", []);
    window.filterSelectSetOptions("sc-year", ALL_YEARS);
    window.filterSelectSetOptions("sc-engine", ["Diesel", "Petrol", "Hybrid", "Electric"]);
  }

  // ----- Init -----
  // filter-select.njk defines its window.filterSelect* helpers on DOMContentLoaded.
  function init() {
  window.filterSelectSetOptions("sc-recent", recent.map(function (v) {
    return { value: v.id, label: v.brand + " " + v.model + " · " + v.year + " · " + v.engineType };
  }));
  window.filterSelectSetOptions("sc-ro", repairOrders.map(function (ro) { return { value: ro.vehicleId, label: roLabel(ro) }; }));
  window.filterSelectSetOptions("sc-year", ALL_YEARS);
  // Opened from a repair order in the Garage (?ro=<vehicle id>): start a new check from it, then
  // drop the param so a reload keeps the mechanic's changes.
  var params = new URLSearchParams(window.location.search);
  var roFromUrl = params.get("ro") && repairOrders.filter(function (r) { return r.vehicleId === params.get("ro"); })[0];
  if (params.has("ro")) {
    params.delete("ro");
    history.replaceState(null, "", window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
  }
  if (roFromUrl) { applyRepairOrder(roFromUrl); return; }
  // Restore a check in progress (e.g. back from the dashboard).
  var v0 = state.vehicle;
  if (state.prefill) {
    var ro0 = repairOrders.filter(function (r) { return r.vehicleId === state.prefill.vehicleId; })[0];
    if (ro0) setSelect("sc-ro", ro0.vehicleId, roLabel(ro0));
  }
  if (v0.id) setSelect("sc-recent", v0.id, (recent.filter(function (r) { return r.id === v0.id; })[0] || {}).brand ? v0.brand + " " + v0.model + " · " + v0.year : v0.id);
  if (v0.brandSlug) {
    setSelect("sc-brand", v0.brandSlug, v0.brand);
    loadModels(v0.brandSlug).then(function () {
      if (v0.model) setSelect("sc-model", v0.model);
      window.filterSelectSetOptions("sc-year", yearOptions());
      window.filterSelectSetOptions("sc-engine", engineOptions());
    });
  }
  if (v0.year) setSelect("sc-year", v0.year);
  syncEngineSelect();
  setVehicleOpen(!(v0.brand || v0.fuel || v0.year));
  render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
