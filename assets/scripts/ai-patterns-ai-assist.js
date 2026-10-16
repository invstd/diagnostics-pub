// Layered AI Assist (AI Patterns experiment, src/ai-patterns/PLAN.md §5) — shared by every
// ai-patterns page that shows AI Assist (Battery SoH report, Diagnostics dashboard, ECU detail).
// Markup: components/ai-patterns-ai-assist-modal.njk. Opened with
//   window.AiPatternsAiAssist.open(faultCode)
// where faultCode = { code, description, aiAssist: {...} } — the aiAssist shape is documented in
// ai-patterns-bms-dtc-library.js (C1A5) and ai-patterns-dtc-library.js (C12B354).
// Extracted from ai-patterns-battery-soh-report.js once a second page needed it.
(function () {
  "use strict";

  function setText(scope, field, value) {
    var el = scope.querySelector('[data-field="' + field + '"]');
    if (el) el.textContent = value;
  }

  // ----- Layered AI Assist (PLAN.md §5) -----
  // Content is curated, static library data (ai-patterns-bms-dtc-library.js), so building it with
  // innerHTML is the same trust level as the original modal.

  // Same sparkle path as icon.njk's sparkle.svg (can't call that Nunjucks macro from client-side
  // JS — keep in sync if that icon ever changes). Used ONLY on AI-derived content, so the sparkle
  // keeps meaning "this is AI" (PLAN.md §2.5).
  var SPARKLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 shrink-0" aria-hidden="true"><path d="M12 2c.44 3.07 1.1 5.24 2.03 6.5C15.06 9.86 16.87 10.7 19.5 11c-2.63.3-4.44 1.14-5.47 2.5-.93 1.26-1.59 3.43-2.03 6.5-.44-3.07-1.1-5.24-2.03-6.5C8.94 12.14 7.13 11.3 4.5 11c2.63-.3 4.44-1.14 5.47-2.5C10.9 7.24 11.56 5.07 12 2Z"/></svg>';

  // Where a claim comes from. Vehicle data and official sources never carry the sparkle.
  var SOURCE_TAGS = {
    vehicle: { label: "Vehicle data", cls: "badge-neutral" },
    ai: { label: "AI inference", cls: "badge-primary", sparkle: true },
    manufacturer: { label: "Manufacturer", cls: "badge-success" },
    recall: { label: "Official recall", cls: "badge-info" },
    verified: { label: "Verified technical", cls: "badge-success" },
    community: { label: "Community", cls: "badge-warning" },
    illustration: { label: "Simplified illustration", cls: "badge-neutral" }, // drawn for the prototype, not OEM
    history: { label: "Repair order", cls: "badge-neutral" }, // this vehicle's own records (Garage)
    symptoms: { label: "Symptom check", cls: "badge-neutral" } // the mechanic's own answers in Symptom Check (Pattern 2)
  };
  function sourceTag(key) {
    var t = SOURCE_TAGS[key];
    if (!t) return "";
    return '<span class="badge badge-soft badge-xs gap-1 shrink-0 ' + t.cls + '">' + (t.sparkle ? SPARKLE_SVG : "") + t.label + "</span>";
  }

  // Prototype-content marker (not product UX): content not yet confirmed by research.
  var DRAFT_BADGE = '<span class="badge badge-dash badge-xs shrink-0">Draft — to verify</span>';
  var CONFIDENCE_TONES = { high: "badge-success", "medium-high": "badge-info", medium: "badge-warning", low: "badge-error" };

  function sectionTitle(text, extra) {
    return '<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2 flex items-center gap-2">' + text + (extra || "") + "</p>";
  }
  function bulletList(items) {
    return '<ul class="list-disc list-outside pl-5 text-sm text-base-content/80 flex flex-col gap-1">' + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>";
  }

  function renderOverview(ai) {
    var o = ai.overview;
    return (
      '<div class="flex flex-col gap-5">' +
        "<div>" + sectionTitle("What it is") + '<p class="text-sm text-base-content/80">' + o.whatItIs + "</p></div>" +
        '<div class="flex items-center gap-2 text-sm">' +
          '<span class="text-base-content/60">Severity</span>' +
          '<span class="badge badge-soft badge-sm badge-' + o.severity.tone + '">' + o.severity.label + "</span>" +
          '<span class="text-base-content/70">' + o.severity.note + "</span>" +
        "</div>" +
        "<div>" + sectionTitle("Most likely fix") +
          '<ol class="list-decimal list-outside pl-5 text-sm text-base-content/80 flex flex-col gap-1">' + o.likelyFix.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ol>" +
          '<button type="button" class="link link-primary text-sm mt-2" data-ai-goto="fix">See full fix steps</button>' +
        "</div>" +
        "<div>" + sectionTitle("Why AI thinks so") +
          '<ul class="flex flex-col gap-2">' + o.why.map(function (w) {
            return '<li class="flex items-start justify-between gap-3 text-sm text-base-content/80"><span>' + w.text + "</span>" + sourceTag(w.source) + "</li>";
          }).join("") + "</ul>" +
        "</div>" +
      "</div>"
    );
  }

  function renderTechnical(ai) {
    var t = ai.technical;
    var html = '<div class="flex flex-col gap-5">';
    html += "<div>" + sectionTitle("How the fault happens") +
      (t.causeIntro ? '<p class="text-sm text-base-content/70 mb-2">' + t.causeIntro + "</p>" : "") +
      '<div class="flex flex-col gap-2">' + t.causePoints.map(function (p) {
        return '<p class="text-sm text-base-content/80"><span class="font-medium text-base-content">' + p.label + ":</span> " + p.text + "</p>";
      }).join("") + "</div></div>";
    if (t.symptoms && t.symptoms.length) html += "<div>" + sectionTitle("Symptoms on the dashboard") + bulletList(t.symptoms) + "</div>";
    if (t.relatedSystems && t.relatedSystems.length) {
      html += "<div>" + sectionTitle("Related systems") + '<div class="flex flex-wrap gap-1.5">' +
        t.relatedSystems.map(function (r) { return '<span class="badge badge-outline badge-sm">' + r + "</span>"; }).join("") + "</div></div>";
    }
    // Other causes the AI considered and ranked lower for THIS vehicle — shown with the reason, so
    // the mechanic can overrule the ranking rather than just trust it.
    if (t.otherCauses && t.otherCauses.items.length) {
      html += "<div>" + sectionTitle("Other possible causes") +
        (t.otherCauses.intro ? '<p class="text-sm text-base-content/70 mb-2">' + t.otherCauses.intro + "</p>" : "") +
        '<ul class="flex flex-col gap-2">' + t.otherCauses.items.map(function (c) {
          return '<li class="text-sm text-base-content/80"><span class="font-medium text-base-content">' + c.label + ":</span> " + c.text + "</li>";
        }).join("") + "</ul></div>";
    }
    if (t.notes && t.notes.length) {
      html += "<div>" + sectionTitle("Good to know") + t.notes.map(function (n) { return '<p class="text-sm text-base-content/80">' + n + "</p>"; }).join("") + "</div>";
    }
    if (t.checks && t.checks.items.length) {
      html += "<div>" + sectionTitle("What to look at in the scan data", t.checks.draft ? DRAFT_BADGE : "") +
        '<div class="flex flex-col gap-2">' + t.checks.items.map(function (c) {
          return '<p class="text-sm text-base-content/80"><span class="font-medium text-base-content">' + c.label + ":</span> " + c.text + "</p>";
        }).join("") + "</div></div>";
    }
    return html + "</div>";
  }

  // A fix step can point at one of the app's own functions (e.g. Forward Camera Calibration). It
  // opens the ECU detail page's Functions tab with that function highlighted (ai-patterns-ecu-detail.js
  // `openFunction` deep link) — it never starts the function: the AI suggests, the mechanic runs it.
  // Current vehicle params are carried over so the ECU page shows the same vehicle.
  var ARROW_RIGHT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 rotate-180" aria-hidden="true"><path d="M19 12H5M5 12L12 19M5 12L12 5"/></svg>';
  function functionLink(action) {
    var base = (window.location.pathname.match(/^(.*?\/)ai-patterns\//) || [null, "/"])[1];
    var params = new URLSearchParams(window.location.search);
    params.set("systemId", action.systemId);
    params.delete("subsystemId");
    params.set("openFunction", action.functionId);
    return (
      '<a class="btn btn-outline btn-primary btn-sm gap-1.5 mt-3" href="' + base + "ai-patterns/ecu-detail/?" + params.toString() + '">' +
        action.label + ARROW_RIGHT_SVG +
      "</a>"
    );
  }

  function renderFixSteps(ai) {
    var f = ai.fixSteps;
    var html = '<div class="flex flex-col gap-4">';
    html += f.steps.map(function (step, i) {
      var tag = step.type === "unordered" ? "ul" : "ol";
      var listClass = step.type === "unordered" ? "list-disc" : "list-decimal";
      return (
        '<div class="rounded-box border border-base-200 p-4">' +
          '<div class="flex items-start justify-between gap-3 mb-1">' +
            '<p class="text-sm font-semibold text-base-content">' + (i + 1) + ". " + step.title + "</p>" +
            (step.time ? '<span class="badge badge-ghost badge-sm shrink-0">' + step.time + "</span>" : "") +
          "</div>" +
          (step.intro ? '<p class="text-sm text-base-content/70 mb-2">' + step.intro + "</p>" : "") +
          "<" + tag + ' class="' + listClass + ' list-outside pl-5 text-sm text-base-content/80 flex flex-col gap-1">' +
            step.items.map(function (item) { return "<li>" + item + "</li>"; }).join("") +
          "</" + tag + ">" +
          (step.action ? functionLink(step.action) : "") +
        "</div>"
      );
    }).join("");
    // Steps the AI deliberately left out for this vehicle, with the reason (e.g. "clear the code
    // and test drive" when the history says the calibration was dropped on purpose). Visible, so
    // the mechanic can disagree.
    if (f.skipped && f.skipped.length) {
      html += "<div>" + sectionTitle("Not suggested for this vehicle") + f.skipped.map(function (k) {
        return (
          '<div class="rounded-box border border-dashed border-base-300 p-3 mb-2">' +
            '<p class="text-sm font-medium text-base-content/70 line-through decoration-base-content/30">' + k.title + "</p>" +
            '<p class="text-xs text-base-content/60 mt-1">' + k.reason + "</p>" +
          "</div>"
        );
      }).join("") + "</div>";
    }
    if (f.parts && f.parts.items.length) html += "<div>" + sectionTitle("Likely parts", f.parts.draft ? DRAFT_BADGE : "") + bulletList(f.parts.items) + "</div>";
    return html + "</div>";
  }

  // Sources/media that relate to a symptom but don't support this code's answer carry a
  // `relation` label (e.g. "Related symptom") — shown, but not counted as a basis for the answer.
  // `match` works the same visually but IS counted as a basis (e.g. "Same fault, different model").
  function relationBadge(item) {
    var label = item.relation || item.match;
    return label ? '<span class="badge badge-outline badge-xs shrink-0">' + label + "</span>" : "";
  }
  function supportingSources(ai) {
    return (ai.sources || []).filter(function (src) { return !src.relation; });
  }

  function renderSources(ai) {
    return '<ul class="flex flex-col gap-2">' + ai.sources.map(function (src) {
      return (
        '<li class="rounded-box border border-base-200 p-3 flex flex-col gap-1.5">' +
          '<div class="flex flex-wrap items-center gap-1.5">' + sourceTag(src.trust) + relationBadge(src) + (src.draft ? DRAFT_BADGE : "") + "</div>" +
          '<p class="text-sm font-medium text-base-content">' + (src.url ? '<a class="link" href="' + src.url + '" target="_blank" rel="noopener">' + src.title + "</a>" : src.title) + "</p>" +
          (src.publisher ? '<p class="text-xs text-base-content/60 -mt-1">' + src.publisher + "</p>" : "") +
          (src.note ? '<p class="text-xs text-base-content/60">' + src.note + "</p>" : "") +
        "</li>"
      );
    }).join("") + "</ul>";
  }

  // Media. Videos are YouTube embeds (youtube-nocookie, needs internet): the card shows the real
  // thumbnail until played, then swaps in a larger player (still beside the chapters on sm+). Chapters seek within the playing video via the IFrame API's postMessage
  // commands (enablejsapi=1) — no extra script needed. The diagram is still a placeholder.
  var PLAY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 ml-0.5" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';

  function mediaHeader(m) {
    return '<div class="flex flex-wrap items-center gap-1.5">' + sourceTag(m.trust) + relationBadge(m) + (m.draft ? DRAFT_BADGE : "") + "</div>";
  }

  function toSeconds(time) {
    return time.split(":").reduce(function (total, part) { return total * 60 + parseInt(part, 10); }, 0);
  }

  // Compact media rows: thumbnail left, details right on sm+ (stacked on phones), so a few items
  // don't turn the tab into a long scroll of full-width frames.
  function renderMedia(ai) {
    return '<div class="flex flex-col gap-3">' + ai.media.map(function (m) {
      var isVideo = m.type === "video";
      var thumb = isVideo
        ? '<button type="button" class="relative aspect-video w-full sm:w-52 shrink-0 rounded-box bg-base-300 overflow-hidden flex items-center justify-center cursor-pointer" data-ai-video-frame aria-label="Play video: ' + m.title.replace(/"/g, "&quot;") + '">' +
            (m.youtubeId ? '<img src="https://i.ytimg.com/vi/' + m.youtubeId + '/hqdefault.jpg" alt="" class="absolute inset-0 w-full h-full object-cover" loading="lazy">' : "") +
            '<span class="relative w-10 h-10 rounded-full bg-base-100/90 text-base-content flex items-center justify-center shadow-sm">' + PLAY_SVG + "</span>" +
            '<span class="absolute bottom-1.5 right-1.5 badge badge-xs bg-base-100/90 border-0">' + m.length + "</span>" +
          "</button>"
        : '<button type="button" class="relative w-full sm:w-52 shrink-0 aspect-[13/8] rounded-box overflow-hidden bg-base-200 cursor-pointer group" data-ai-diagram-open="' + m.diagramId + '" aria-label="Open diagram: ' + m.title.replace(/"/g, "&quot;") + '">' +
            diagramSvg(m.diagramId) +
            '<span class="absolute bottom-1.5 right-1.5 badge badge-xs bg-base-100/90 border-0 gap-1">' + EXPAND_SVG + "Open</span>" +
          "</button>";
      var chapters = isVideo && m.chapters && m.chapters.length
        ? "<div>" + sectionTitle("Jump to") + '<div class="flex flex-col -mx-2">' + m.chapters.map(function (c) {
            return '<button type="button" class="btn btn-ghost btn-xs justify-start gap-2.5 font-normal" data-ai-video-chapter="' + toSeconds(c.time) + '">' +
              '<span class="font-mono text-primary">' + c.time + "</span>" + c.label + "</button>";
          }).join("") + "</div></div>"
        : "";
      return (
        '<div class="rounded-box border border-base-200 p-3 flex flex-col sm:flex-row gap-3"' + (isVideo ? ' data-ai-video data-youtube-id="' + (m.youtubeId || "") + '"' : "") + ">" +
          thumb +
          '<div class="flex flex-col gap-1.5 min-w-0">' +
            mediaHeader(m) +
            '<p class="text-sm font-medium text-base-content">' + m.title + "</p>" +
            (m.channel ? '<p class="text-xs text-base-content/60 -mt-1">' + m.channel + "</p>" : "") +
            (m.caption ? '<p class="text-xs text-base-content/60">' + m.caption + "</p>" : "") +
            (m.relevance ? '<p class="text-xs text-base-content/70 bg-base-200 rounded-box px-2.5 py-1.5">' + m.relevance + "</p>" : "") +
            chapters +
          "</div>" +
        "</div>"
      );
    }).join("") + "</div>";
  }

  // Starts a video card's player at `seconds` — first play swaps the thumbnail for the embed and
  // widens the card; later calls seek the existing player instead of reloading it.
  function playVideo(card, seconds) {
    var id = card.getAttribute("data-youtube-id");
    if (!id) return;
    var src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&enablejsapi=1&rel=0&start=" + seconds;
    var iframe = card.querySelector("iframe");
    if (iframe) {
      // Commands sent before the player has answered are dropped (and throw inside YouTube's
      // script), so until then a chapter click just restarts the embed at the new time.
      if (iframe.dataset.ready) {
        postToPlayer(iframe, "seekTo", [seconds, true]);
        postToPlayer(iframe, "playVideo", []);
      } else {
        iframe.src = src;
      }
      return;
    }
    var frame = card.querySelector("[data-ai-video-frame]");
    var wrap = document.createElement("div");
    // Playing: the video grows but stays beside the chapters on sm+, so the "jump to" list and
    // the picture are visible together (full width pushed the video out of view on a chapter click).
    wrap.className = "aspect-video w-full sm:w-3/5 shrink-0 self-start rounded-box overflow-hidden bg-black";
    wrap.innerHTML = '<iframe class="w-full h-full" src="' + src +
      '" title="Video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    frame.replaceWith(wrap);
    // IFrame API handshake: announce we're listening once the embed loads; its first reply (see
    // the window message listener below) marks the player ready for commands.
    wrap.firstChild.addEventListener("load", function () {
      if (this.contentWindow) this.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
    });
  }
  function postToPlayer(iframe, func, args) {
    if (iframe.contentWindow) iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args }), "*");
  }
  function pauseAllVideos() {
    if (!aiDialog) return;
    aiDialog.querySelectorAll("[data-ai-video] iframe").forEach(function (f) {
      if (f.dataset.ready) postToPlayer(f, "pauseVideo", []);
      else f.dataset.pendingPause = "1"; // not answering yet — pause as soon as it does
    });
  }
  window.addEventListener("message", function (e) {
    if (!/^https:\/\/(www\.)?youtube(-nocookie)?\.com$/.test(e.origin)) return;
    document.querySelectorAll("[data-ai-video] iframe").forEach(function (f) {
      if (f.contentWindow !== e.source || f.dataset.ready) return;
      f.dataset.ready = "1";
      if (f.dataset.pendingPause) {
        delete f.dataset.pendingPause;
        postToPlayer(f, "pauseVideo", []);
      }
    });
  });

  // ----- Diagram viewer (Media tab) -----
  // Same controls as Technical Data's Wiring Diagram (tech-data-wiring-diagram.js: −/%/+ zoom,
  // expand/collapse) so diagrams behave the same across the app, plus two things for this pattern:
  // drag/pinch to pan and zoom (workshop tablets), and opening zoomed on the part the fault is about
  // (the SVG's [data-diagram-focus] group) with "Show all" to zoom out — the diagram equivalent of
  // the video's "Jump to" chapters. Opens as a layer covering the whole AI Assist window (still the
  // same dialog, not a second one on top) because the fixed header leaves too little height inside
  // a tab. The safety warning is repeated on that layer so it's never out of sight (PLAN.md §5).
  var EXPAND_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  var COLLAPSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
  var ARROW_LEFT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5" aria-hidden="true"><path d="M19 12H5M5 12L12 19M5 12L12 5"/></svg>';
  var PLUS_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var CROSSHAIR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5" aria-hidden="true"><path d="M22 12C22 17.5228 17.5228 22 12 22M22 12C22 6.47715 17.5228 2 12 2M22 12H18M12 22C6.47715 22 2 17.5228 2 12M12 22V18M2 12C2 6.47715 6.47715 2 12 2M2 12H6M12 2V6"/></svg>';

  var ZOOM_MIN = 1;
  var ZOOM_MAX = 3;
  var ZOOM_STEP = 0.25;
  var FOCUS_ZOOM = 2.25;
  var EXPANDED_CLASSES = ["max-w-[min(92vw,64rem)]", "h-[90vh]"];
  var NORMAL_CLASSES = ["max-w-2xl", "h-[min(46rem,90vh)]"];

  var currentAi = null; // the open code's aiAssist, so Back can re-render the media list
  var view = null;      // { viewport, stage, scale, tx, ty } for the open diagram

  function diagramSvg(id) {
    return (window.AiPatternsDiagrams && window.AiPatternsDiagrams[id]) || "";
  }

  function renderDiagramViewer(m, ai) {
    return (
      '<div class="absolute inset-0 z-10 bg-base-100 rounded-box flex flex-col gap-2.5 p-5" data-ai-diagram-viewer>' +
        '<div class="flex items-center justify-between gap-2">' +
          '<button type="button" class="btn btn-ghost btn-sm gap-1.5 -ml-2" data-ai-diagram-back>' + ARROW_LEFT_SVG + "Back to AI Assist</button>" +
          '<button type="button" class="btn btn-sm btn-circle btn-ghost hidden sm:inline-flex" aria-label="Expand" data-ai-diagram-expand>' + EXPAND_SVG.replace("w-3 h-3", "w-4 h-4") + "</button>" +
        "</div>" +
        (ai.safety ? '<div role="alert" class="alert alert-soft alert-error text-xs py-2">' + ai.safety + "</div>" : "") +
        "<div>" + mediaHeader(m) + '<p class="text-sm font-medium text-base-content mt-1.5">' + m.title + "</p>" +
          (m.caption ? '<p class="text-xs text-base-content/60 mt-1">' + m.caption + "</p>" : "") +
        "</div>" +
        '<div class="flex flex-wrap items-center justify-between gap-2">' +
          '<div class="flex items-center gap-1 -ml-2">' +
            '<button type="button" class="btn btn-ghost btn-xs gap-1.5" data-ai-diagram-focus>' + CROSSHAIR_SVG + (m.focusLabel || "Focus") + "</button>" +
            '<button type="button" class="btn btn-ghost btn-xs" data-ai-diagram-all>Show all</button>' +
          "</div>" +
          '<div class="flex items-center gap-1">' +
            '<button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Zoom out" data-ai-diagram-zoom-out>−</button>' +
            '<span class="text-xs text-base-content/60 w-10 text-center" data-ai-diagram-zoom-level>100%</span>' +
            '<button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Zoom in" data-ai-diagram-zoom-in>' + PLUS_SVG + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="relative flex-1 min-h-40 w-full rounded-box overflow-hidden border border-base-300 bg-base-200 cursor-grab active:cursor-grabbing touch-none select-none" data-ai-diagram-viewport>' +
          '<div class="absolute inset-0 origin-top-left" data-ai-diagram-stage>' + diagramSvg(m.diagramId) + "</div>" +
          '<span class="absolute bottom-2 left-2 badge badge-xs bg-base-100/90 border-0 pointer-events-none">Drag to move · pinch to zoom</span>' +
        "</div>" +
      "</div>"
    );
  }

  // Keeps the scaled stage covering the viewport (no empty gaps when panned to an edge).
  function clampView() {
    var w = view.viewport.clientWidth, h = view.viewport.clientHeight;
    view.tx = Math.min(0, Math.max(w - w * view.scale, view.tx));
    view.ty = Math.min(0, Math.max(h - h * view.scale, view.ty));
  }
  function applyView() {
    clampView();
    view.stage.style.transform = "translate(" + view.tx + "px," + view.ty + "px) scale(" + view.scale + ")";
    var panel = view.viewport.closest("[data-ai-diagram-viewer]");
    panel.querySelector("[data-ai-diagram-zoom-level]").textContent = Math.round(view.scale * 100) + "%";
    panel.querySelector("[data-ai-diagram-zoom-out]").disabled = view.scale <= ZOOM_MIN;
    panel.querySelector("[data-ai-diagram-zoom-in]").disabled = view.scale >= ZOOM_MAX;
  }
  // Zoom to `scale`, keeping the viewport point (px, py) fixed on screen.
  function zoomAt(scale, px, py) {
    scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
    view.tx = px - (px - view.tx) * (scale / view.scale);
    view.ty = py - (py - view.ty) * (scale / view.scale);
    view.scale = scale;
    applyView();
  }
  function zoomCentered(scale) {
    view.mode = "manual";
    zoomAt(scale, view.viewport.clientWidth / 2, view.viewport.clientHeight / 2);
  }
  // Centres the fault area at FOCUS_ZOOM. Works from where the focus group actually renders (the
  // SVG letterboxes inside a viewport of any shape), converted back to unscaled stage coordinates.
  function focusDiagram() {
    var target = view.stage.querySelector("[data-diagram-focus]");
    if (!target) return;
    var vp = view.viewport.getBoundingClientRect();
    var r = target.getBoundingClientRect();
    var cx = (r.left + r.width / 2 - vp.left - view.tx) / view.scale;
    var cy = (r.top + r.height / 2 - vp.top - view.ty) / view.scale;
    view.scale = FOCUS_ZOOM;
    view.tx = vp.width / 2 - cx * view.scale;
    view.ty = vp.height / 2 - cy * view.scale;
    view.mode = "focus";
    applyView();
  }
  function showAll() {
    view.scale = 1; view.tx = 0; view.ty = 0;
    view.mode = "all";
    applyView();
  }

  function openDiagram(id) {
    var m = (currentAi.media || []).filter(function (item) { return item.diagramId === id; })[0];
    if (!m) return;
    pauseAllVideos();
    var box = aiDialog.querySelector(".modal-box");
    box.insertAdjacentHTML("beforeend", renderDiagramViewer(m, currentAi));
    var layer = box.querySelector("[data-ai-diagram-viewer]");
    var viewport = layer.querySelector("[data-ai-diagram-viewport]");
    view = { viewport: viewport, stage: layer.querySelector("[data-ai-diagram-stage]"), scale: 1, tx: 0, ty: 0, mode: "all" };
    bindPanZoom(viewport);
    focusDiagram(); // open on the part the fault is about
    layer.querySelector("[data-ai-diagram-back]").focus();
  }
  function closeDiagram() {
    view = null;
    setExpanded(false);
    var layer = aiDialog.querySelector("[data-ai-diagram-viewer]");
    if (layer) layer.remove();
    var opener = aiDialog.querySelector("[data-ai-diagram-open]");
    if (opener) opener.focus();
  }
  function setExpanded(on) {
    var box = aiDialog.querySelector(".modal-box");
    EXPANDED_CLASSES.forEach(function (c) { box.classList.toggle(c, on); });
    NORMAL_CLASSES.forEach(function (c) { box.classList.toggle(c, !on); });
    var btn = aiDialog.querySelector("[data-ai-diagram-expand]");
    if (btn) {
      btn.innerHTML = on ? COLLAPSE_SVG : EXPAND_SVG.replace("w-3 h-3", "w-4 h-4");
      btn.setAttribute("aria-label", on ? "Collapse" : "Expand");
    }
    // The viewport changes size — re-apply whatever the mechanic last chose (focus / show all);
    // after a manual pan or zoom, just keep the view inside the new bounds.
    if (view) {
      requestAnimationFrame(function () {
        if (!view) return;
        if (view.mode === "focus") focusDiagram();
        else if (view.mode === "all") showAll();
        else applyView();
      });
    }
  }

  // Drag to pan (one pointer), pinch to zoom (two pointers). Pointer events cover mouse, pen and
  // touch alike; touch-none on the viewport stops the browser scrolling the panel instead.
  function bindPanZoom(viewport) {
    var pointers = {};
    var last = null; // { x, y } for a one-pointer drag, or { dist, mx, my } for a pinch
    function snapshot() {
      var ids = Object.keys(pointers);
      if (ids.length === 1) return { x: pointers[ids[0]].x, y: pointers[ids[0]].y };
      var a = pointers[ids[0]], b = pointers[ids[1]];
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
    viewport.addEventListener("pointerdown", function (e) {
      try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* not an active pointer — drag still works inside the viewport */ }
      var r = viewport.getBoundingClientRect();
      pointers[e.pointerId] = { x: e.clientX - r.left, y: e.clientY - r.top };
      last = snapshot();
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId] || !view) return;
      var r = viewport.getBoundingClientRect();
      pointers[e.pointerId] = { x: e.clientX - r.left, y: e.clientY - r.top };
      var now = snapshot();
      if (now.dist !== undefined && last.dist !== undefined) {
        view.tx += now.mx - last.mx; view.ty += now.my - last.my;
        view.mode = "manual";
        zoomAt(view.scale * (now.dist / last.dist), now.mx, now.my);
      } else if (now.dist === undefined && last.dist === undefined) {
        view.tx += now.x - last.x; view.ty += now.y - last.y;
        view.mode = "manual";
        applyView();
      }
      last = now;
    });
    function release(e) {
      delete pointers[e.pointerId];
      last = Object.keys(pointers).length ? snapshot() : null;
    }
    viewport.addEventListener("pointerup", release);
    viewport.addEventListener("pointercancel", release);

    // Trackpad gestures never arrive as pointers. Chrome/Edge/Firefox report a pinch as a wheel
    // event with ctrlKey set, and a two-finger scroll as a plain wheel event; Safari reports a pinch
    // as its own gesture* events. Without preventDefault (hence passive: false) the browser zooms
    // the whole page instead of the diagram.
    viewport.addEventListener("wheel", function (e) {
      if (!view) return;
      e.preventDefault();
      var r = viewport.getBoundingClientRect();
      if (e.ctrlKey) {
        view.mode = "manual";
        zoomAt(view.scale * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      } else {
        view.tx -= e.deltaX; view.ty -= e.deltaY;
        view.mode = "manual";
        applyView();
      }
    }, { passive: false });
    var gestureStartScale = 1;
    viewport.addEventListener("gesturestart", function (e) {
      e.preventDefault();
      if (view) gestureStartScale = view.scale;
    });
    viewport.addEventListener("gesturechange", function (e) {
      e.preventDefault();
      if (!view) return;
      var r = viewport.getBoundingClientRect();
      view.mode = "manual";
      zoomAt(gestureStartScale * e.scale, e.clientX - r.left, e.clientY - r.top);
    });
    viewport.addEventListener("gestureend", function (e) { e.preventDefault(); });
  }

  var aiDialog = document.getElementById("ai-patterns-ai-assist-dialog");

  function selectTab(name) {
    if (!aiDialog) return;
    if (name !== "media") pauseAllVideos(); // a hidden panel's video would keep playing audio
    aiDialog.querySelectorAll("[data-ai-tab]").forEach(function (tab) {
      var active = tab.getAttribute("data-ai-tab") === name;
      tab.classList.toggle("tab-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    aiDialog.querySelectorAll("[data-ai-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-ai-panel") !== name;
    });
  }

  if (aiDialog) {
    aiDialog.querySelectorAll("[data-ai-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () { selectTab(tab.getAttribute("data-ai-tab")); });
    });
    // In-panel links that jump to another tab (e.g. Overview → Fix steps).
    aiDialog.addEventListener("click", function (e) {
      var goto = e.target.closest("[data-ai-goto]");
      if (goto) selectTab(goto.getAttribute("data-ai-goto"));
      // Diagram viewer controls.
      var diagramOpen = e.target.closest("[data-ai-diagram-open]");
      if (diagramOpen) openDiagram(diagramOpen.getAttribute("data-ai-diagram-open"));
      if (e.target.closest("[data-ai-diagram-back]")) closeDiagram();
      if (view) {
        if (e.target.closest("[data-ai-diagram-zoom-in]")) zoomCentered(view.scale + ZOOM_STEP);
        if (e.target.closest("[data-ai-diagram-zoom-out]")) zoomCentered(view.scale - ZOOM_STEP);
        if (e.target.closest("[data-ai-diagram-focus]")) focusDiagram();
        if (e.target.closest("[data-ai-diagram-all]")) showAll();
        if (e.target.closest("[data-ai-diagram-expand]")) setExpanded(!aiDialog.querySelector(".modal-box").classList.contains(EXPANDED_CLASSES[0]));
      }
      // Thumbnail → play from the start; chapter → play/seek to that chapter and mark it.
      var frameBtn = e.target.closest("[data-ai-video-frame]");
      if (frameBtn) playVideo(frameBtn.closest("[data-ai-video]"), 0);
      var chapter = e.target.closest("[data-ai-video-chapter]");
      if (chapter) {
        var card = chapter.closest("[data-ai-video]");
        card.querySelectorAll("[data-ai-video-chapter]").forEach(function (c) { c.classList.toggle("btn-active", c === chapter); });
        playVideo(card, parseInt(chapter.getAttribute("data-ai-video-chapter"), 10));
        // Stacked layout (phones): the list sits below the video — bring the picture back into view.
        card.querySelector("iframe").scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
    // Closing must stop playback — the dialog is only hidden, so an embedded player would keep
    // playing. Panels are re-rendered on every open, so removing the players is enough.
    aiDialog.addEventListener("close", function () {
      aiDialog.querySelectorAll("[data-ai-video] iframe").forEach(function (f) { f.remove(); });
      view = null;
      setExpanded(false);
      var layer = aiDialog.querySelector("[data-ai-diagram-viewer]");
      if (layer) layer.remove();
    });
    var confidenceToggle = aiDialog.querySelector("[data-ai-confidence-toggle]");
    var confidenceReason = aiDialog.querySelector("[data-ai-confidence-reason]");
    confidenceToggle.addEventListener("click", function () {
      var open = confidenceReason.classList.toggle("hidden") === false;
      confidenceToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    aiDialog.querySelectorAll("[data-ai-feedback-value]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        aiDialog.querySelectorAll("[data-ai-feedback-value]").forEach(function (b) {
          var on = b === btn && b.getAttribute("aria-pressed") !== "true";
          b.setAttribute("aria-pressed", on ? "true" : "false");
          b.classList.toggle("btn-active", on);
        });
      });
    });
  }

  // Pattern 2 hand-off: if Symptom Check ran for this same vehicle (sessionStorage, written by
  // ai-patterns-symptom-check.js), the answers that support this code go first in "Why AI thinks so",
  // tagged as the mechanic's own observations. Only answers listed in the code's `symptomWhy` count.
  function symptomReasons(fc) {
    var ai = fc.aiAssist;
    if (!ai.symptomWhy || !fc.vehicle) return [];
    if (window.AiPatternsToggles && !window.AiPatternsToggles.isOn("symptomCheck")) return [];
    var check = null;
    try { check = JSON.parse(sessionStorage.getItem("ai-patterns-symptom-check") || "null"); } catch (e) {}
    if (!check || !check.vehicle || !check.answers) return [];
    var same = (check.vehicle.brand || "").toLowerCase() === fc.vehicle.brand.toLowerCase() &&
      (check.vehicle.model || "").toLowerCase() === fc.vehicle.model.toLowerCase();
    if (!same) return [];
    return ai.symptomWhy.filter(function (w) {
      return w.answers.indexOf(check.answers[w.question]) !== -1;
    }).map(function (w) { return { text: w.text, source: "symptoms" }; });
  }

  function openAiAssist(fc) {
    if (!aiDialog) return;
    var ai = fc.aiAssist;
    currentAi = ai;
    var extraWhy = symptomReasons(fc);
    if (extraWhy.length && ai.overview) {
      ai = Object.assign({}, ai, { overview: Object.assign({}, ai.overview, { why: extraWhy.concat(ai.overview.why) }) });
    }

    setText(aiDialog, "ai-code", fc.code);
    setText(aiDialog, "ai-scanner-description", fc.description);
    setText(aiDialog, "ai-title", ai.title);

    var confidenceToggle = aiDialog.querySelector("[data-ai-confidence-toggle]");
    confidenceToggle.className = "badge badge-soft gap-1 cursor-pointer " + (CONFIDENCE_TONES[ai.confidence.level] || "");
    confidenceToggle.setAttribute("aria-expanded", "false");
    setText(aiDialog, "ai-confidence", ai.confidence.label);
    var confidenceReason = aiDialog.querySelector("[data-ai-confidence-reason]");
    confidenceReason.textContent = ai.confidence.reason;
    confidenceReason.classList.add("hidden");

    var sourceCount = (ai.sources || []).length;
    var basisCount = supportingSources(ai).length; // related-symptom sources don't count as a basis
    setText(aiDialog, "ai-source-count", basisCount ? "Based on " + basisCount + (basisCount === 1 ? " source" : " sources") : "");

    aiDialog.querySelector("[data-ai-scope-wrap]").classList.toggle("hidden", !ai.scope);
    setText(aiDialog, "ai-scope", ai.scope || "");
    aiDialog.querySelector("[data-ai-safety-wrap]").classList.toggle("hidden", !ai.safety);
    setText(aiDialog, "ai-safety", ai.safety || "");

    var panels = {
      overview: ai.overview ? renderOverview(ai) : "",
      technical: ai.technical ? renderTechnical(ai) : "",
      fix: ai.fixSteps && ai.fixSteps.steps.length ? renderFixSteps(ai) : "",
      sources: sourceCount ? renderSources(ai) : "",
      media: ai.media && ai.media.length ? renderMedia(ai) : ""
    };
    var counts = { sources: sourceCount, media: (ai.media || []).length };
    Object.keys(panels).forEach(function (name) {
      aiDialog.querySelector('[data-ai-panel="' + name + '"]').innerHTML = panels[name];
      var tab = aiDialog.querySelector('[data-ai-tab="' + name + '"]');
      tab.classList.toggle("hidden", !panels[name]); // empty tabs are hidden, not shown empty
      var countEl = tab.querySelector("[data-ai-tab-count]");
      if (countEl) countEl.textContent = counts[name] || "";
    });

    aiDialog.querySelectorAll("[data-ai-feedback-value]").forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
      b.classList.remove("btn-active");
    });

    selectTab("overview");
    aiDialog.showModal();
  }

  window.AiPatternsAiAssist = {
    open: openAiAssist,
    // The shared AI element pieces (PLAN.md §7), reused by Symptom Check so both patterns look and
    // label things the same way.
    ui: { sourceTag: sourceTag, sparkle: SPARKLE_SVG, draftBadge: DRAFT_BADGE, confidenceTones: CONFIDENCE_TONES }
  };
})();
