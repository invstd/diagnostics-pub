(function () {
  const wrapper = document.querySelector('.ecu-detail-wrapper');
  if (!wrapper) return;
  const basePath = wrapper.getAttribute('data-base-path') || '/';

  const params = new URLSearchParams(window.location.search);
  const systemId = params.get('systemId') || '';
  const vehicleId = params.get('vehicleId') || '';
  const vin = params.get('vin') || '';
  const isTrucksMode = localStorage.getItem('automechanika-vehicle-type') === 'trucks';

  // Same sessionStorage key diagnostics-dashboard.js's scan-state persistence uses (see that
  // file's header comment) — read here so a demoReady system's real DTC content only shows once
  // an actual scan found it, instead of unconditionally, which made visiting the ECU page before
  // ever scanning show a fault that hadn't happened yet. Non-curated systems are untouched by this
  // (dtc-library.js has no entries for them either way — their scan-assigned DTCs are a random,
  // deliberately non-deterministic touch, not something to make predictable).
  function currentSystemScanState() {
    const idPart = vehicleId || vin;
    if (!idPart) return null;
    const key = 'automechanika-scan-state-' + (isTrucksMode ? 'trucks' : 'cars') + '-' + idPart;
    let stored = null;
    try { stored = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
    return (stored && stored[systemId]) || null;
  }

  // Back link: same vehicle-context params, back to the right dashboard (Cars vs Trucks). Keeps
  // `systemId` in the URL so the dashboard's group accordion re-expands the group we came from
  // (see diagnostics-dashboard.js's drillToSystemId handling) instead of landing fully collapsed.
  const backLink = document.querySelector('[data-ecu-back-link]');
  if (backLink) {
    // Forked from ecu-detail.js — hardcoded to this folder rather than pattern-matched from the
    // URL, since this copy only ever runs on diagnostics-platform/ pages (see "Important
    // decisions" #2 in the diagnostics-platform task).
    backLink.href = basePath + 'diagnostics-platform/diagnostics-dashboard' + (isTrucksMode ? '-trucks' : '') + '/?' + params.toString();
  }

  const allSystems = JSON.parse(document.getElementById('ecu-diagnostic-systems-' + (isTrucksMode ? 'trucks' : 'cars')).textContent);
  const allGroups = JSON.parse(document.getElementById('ecu-diagnostic-system-groups').textContent);
  const system = allSystems.find(function (s) { return s.systemId === systemId; });
  const ecu = system;

  const titleEl = document.querySelector('[data-ecu-title]');
  const subtitleEl = document.querySelector('[data-ecu-vehicle-subtitle]');
  if (titleEl) titleEl.textContent = (ecu && ecu.label) || 'ECU';
  if (subtitleEl) {
    const brand = params.get('brand') || '';
    const model = params.get('model') || '';
    const year = params.get('year') || '';
    subtitleEl.textContent = [brand, model, year ? '(' + year + ')' : ''].filter(Boolean).join(' ');
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value || '—';
  }
  const groupMeta = ecu && allGroups.find(function (g) { return g.id === ecu.group; });
  setText('[data-ecu-type]', ecu && ecu.type);
  setText('[data-ecu-group]', groupMeta && groupMeta.label);
  setText('[data-ecu-address]', ecu && ecu.moduleAddress);
  setText('[data-ecu-hardware]', ecu && ecu.hardwareNumber);
  setText('[data-ecu-software]', ecu && ecu.softwareVersion);
  setText('[data-ecu-serial]', ecu && ecu.serialNumber);
  setText('[data-ecu-last-comm]', (ecu && ecu.moduleAddress) ? 'Active now' : '—');
  setText('[data-ecu-vin]', params.get('vin'));
  setText('[data-ecu-mileage]', params.get('mileage'));

  // ===== Tabs =====
  const tabsWrap = document.querySelector('[data-ecu-tabs]');
  if (tabsWrap) {
    tabsWrap.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-ecu-tab]');
      if (!btn) return;
      tabsWrap.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('tab-active'); });
      btn.classList.add('tab-active');
      const target = btn.getAttribute('data-ecu-tab');
      document.querySelectorAll('[data-ecu-tab-panel]').forEach(function (panel) {
        panel.classList.toggle('hidden', panel.getAttribute('data-ecu-tab-panel') !== target);
      });
    });
  }

  const FUNCTIONAL_GROUP_LABEL = {};
  (system && system.functionalGroups || []).forEach(function (g) { FUNCTIONAL_GROUP_LABEL[g.id] = g.label; });

  // ===== DTC tab =====
  const dtcLibrary = ((window.AutocomDtcLibrary || {})[isTrucksMode ? 'trucks' : 'cars'] || {})[systemId] || [];
  // Only shown once an actual scan found it here (state 'error' or 'warning') — see
  // currentSystemScanState() above. No scan yet, a clean scan, or a cleared result all read as "no
  // DTCs" rather than always surfacing the demo fault regardless of whether it was ever detected.
  const scanState = currentSystemScanState();
  const dtcEntries = (scanState && (scanState.state === 'error' || scanState.state === 'warning')) ? dtcLibrary : [];
  const dtcList = document.querySelector('[data-ecu-dtc-list]');
  const dtcEmpty = document.querySelector('[data-ecu-dtc-empty]');
  const dtcCountBadge = document.querySelector('[data-ecu-dtc-count]');
  if (dtcCountBadge) {
    dtcCountBadge.textContent = String(dtcEntries.length);
    dtcCountBadge.className = 'badge badge-sm ' + (dtcEntries.length > 0 ? 'badge-error' : 'badge-ghost');
  }
  if (dtcEntries.length === 0) {
    if (dtcEmpty) dtcEmpty.classList.remove('hidden');
  } else if (dtcList) {
    dtcEntries.forEach(function (entry) {
      const groupLabel = entry.functionalGroupId && FUNCTIONAL_GROUP_LABEL[entry.functionalGroupId];
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'flex items-center justify-between gap-3 px-3 py-2.5 border border-base-200 rounded-box text-left hover:bg-base-200 cursor-pointer';
      row.innerHTML = '<span class="min-w-0">' +
        (groupLabel ? '<span class="block text-xs text-base-content/50 truncate">' + groupLabel + '</span>' : '') +
        '<span class="font-semibold text-base-content">' + entry.code + '</span>' +
        '<span class="block text-sm text-base-content/70 truncate">' + entry.title + '</span></span>' +
        '<span class="badge badge-warning badge-sm shrink-0">' + (entry.status || 'Pending') + '</span>';
      row.addEventListener('click', function () { window.openDtcDetailModal(entry.code, systemId); });
      dtcList.appendChild(row);
    });
  }

  // ===== Live Data tab =====
  // The interactive live-simulated view stays category/ECU-scoped (data-lists-library.js has no
  // per-functional-group data) — every functional group under a curated ECU shows the same
  // trigger. What's new: a static, grouped list of the parameters that ECU actually exposes
  // (diagnosticSystemsCars.js's `livePids`, real for ECM's 8 groups) — informational context even
  // where no live-simulated view exists yet.
  const dataListsLibrary = (window.AutocomDataListsLibrary || {})[isTrucksMode ? 'trucks' : 'cars'] || {};
  const hasLiveData = !!(dataListsLibrary[systemId] && dataListsLibrary[systemId].length);
  const liveDataAvailable = document.querySelector('[data-ecu-live-data-available]');
  const liveDataEmpty = document.querySelector('[data-ecu-live-data-empty]');
  const pidGroups = (system && system.functionalGroups || []).filter(function (g) { return g.livePids && g.livePids.length; });
  if (liveDataAvailable) liveDataAvailable.classList.toggle('hidden', !hasLiveData);
  if (liveDataEmpty) liveDataEmpty.classList.toggle('hidden', hasLiveData || pidGroups.length > 0);
  const openLiveDataBtn = document.querySelector('[data-ecu-open-live-data]');
  if (openLiveDataBtn) {
    openLiveDataBtn.addEventListener('click', function () {
      if (typeof window.openDataListsModal === 'function') window.openDataListsModal(systemId);
    });
  }
  const pidGroupsEl = document.querySelector('[data-ecu-pid-groups]');
  if (pidGroupsEl && pidGroups.length) {
    pidGroups.forEach(function (group) {
      const section = document.createElement('div');
      section.className = 'mb-4 last:mb-0';
      const heading = document.createElement('p');
      heading.className = 'text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-1.5';
      heading.textContent = group.label;
      section.appendChild(heading);
      const list = document.createElement('div');
      list.className = 'flex flex-col border border-base-200 rounded-box overflow-hidden';
      group.livePids.forEach(function (pid) {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between gap-3 px-3 py-2 border-b border-base-200 last:border-b-0 text-sm';
        row.innerHTML = '<span class="text-base-content">' + pid.label + '</span>' +
          '<span class="text-base-content/50 shrink-0">' + (pid.unit || '') + '</span>';
        list.appendChild(row);
      });
      section.appendChild(list);
      pidGroupsEl.appendChild(section);
    });
  }

  // ===== Functions tab =====
  const functionsLibraryRoot = (window.AutocomFunctionsLibrary || {})[isTrucksMode ? 'trucks' : 'cars'] || {};
  const functionsList = document.querySelector('[data-ecu-functions-list]');
  const functionsEmpty = document.querySelector('[data-ecu-functions-empty]');
  const TYPE_LABEL = { adjustment: 'Adjustment', activation: 'Activation', test: 'Test', calibration: 'Calibration' };

  function buildFunctionRow(fn) {
    const row = document.createElement('button');
    row.type = 'button';
    row.dataset.functionId = fn.id;
    row.className = 'flex items-center gap-3 px-3 py-2.5 border-b border-base-200 last:border-b-0 text-left hover:bg-base-200 cursor-pointer w-full';
    const iconSpan = document.querySelector('[data-icon-pool] [data-icon-name="' + fn.icon + '"] .icon');
    if (iconSpan) row.appendChild(iconSpan.cloneNode(true));
    row.innerHTML += '<span class="flex-1 text-sm text-base-content">' + fn.label + '</span>' +
      '<span class="badge badge-ghost badge-sm shrink-0">' + (TYPE_LABEL[fn.type] || fn.type) + '</span>';
    // `onclick` (a global function NAME, e.g. "openAdasCalibrationModal" — see
    // functions-library.js's header comment) routes to a dedicated modal instead of the generic
    // Start/Stop dialog, for functions that need richer state (a rig dependency check, a
    // multi-state result) than that dialog supports. Falls back to the generic dialog when absent.
    row.addEventListener('click', function () {
      if (fn.onclick && typeof window[fn.onclick] === 'function') window[fn.onclick](fn);
      else openFunctionDialog(fn);
    });
    return row;
  }

  let totalFunctions = 0;
  if (functionsList) {
    // Grouped by functional group, matching how the ECU's own DTC/Live Data content is organized —
    // a group with no curated functions is skipped rather than shown empty. A system with no
    // functionalGroups at all (most non-curated systems) naturally ends up with zero functions.
    const byGroup = functionsLibraryRoot[systemId] || {};
    (system && system.functionalGroups || []).forEach(function (group) {
      const fns = byGroup[group.id] || [];
      if (fns.length === 0) return;
      totalFunctions += fns.length;
      const heading = document.createElement('p');
      heading.className = 'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/50 mt-3 first:mt-0 mb-1 px-1';
      heading.innerHTML = '<span>' + group.label + '</span>' +
        (group.demoReady ? '<span class="badge badge-xs badge-secondary normal-case">Demo</span>' : '');
      functionsList.appendChild(heading);
      fns.forEach(function (fn) { functionsList.appendChild(buildFunctionRow(fn)); });
    });
  }
  if (totalFunctions === 0 && functionsEmpty) functionsEmpty.classList.remove('hidden');

  // Deep link from the dashboard's Functions search (diagnostics-dashboard.js's initFunctionsSearch):
  // switch to this tab and highlight the specific row so the demonstrator sees exactly what the
  // search found, then decides whether to open it — this never auto-opens the dialog or
  // auto-starts the function itself.
  const openFunctionId = params.get('openFunction');
  if (openFunctionId && functionsList) {
    const targetRow = functionsList.querySelector('[data-function-id="' + openFunctionId + '"]');
    if (targetRow) {
      const functionsTabBtn = document.querySelector('[data-ecu-tab="functions"]');
      if (functionsTabBtn) functionsTabBtn.click();
      targetRow.scrollIntoView({ block: 'center' });
      targetRow.classList.add('attention-pulse');
      setTimeout(function () { targetRow.classList.remove('attention-pulse'); }, 750);
    }
  }

  // ===== Function detail dialog =====
  const fnDialog = document.getElementById('ecu-function-dialog');
  const fnType = document.querySelector('[data-ecu-function-type]');
  const fnTitle = document.querySelector('[data-ecu-function-title]');
  const fnDescription = document.querySelector('[data-ecu-function-description]');
  const fnNotesWrap = document.querySelector('[data-ecu-function-notes-wrap]');
  const fnNotes = document.querySelector('[data-ecu-function-notes]');
  const fnPrereqWrap = document.querySelector('[data-ecu-function-prereq-wrap]');
  const fnPrereq = document.querySelector('[data-ecu-function-prereq]');
  const fnProcedureWrap = document.querySelector('[data-ecu-function-procedure-wrap]');
  const fnProcedure = document.querySelector('[data-ecu-function-procedure]');
  const fnStateWrap = document.querySelector('[data-ecu-function-state-wrap]');
  const fnStateRing = document.querySelector('[data-ecu-function-state-ring]');
  const fnStateText = document.querySelector('[data-ecu-function-state-text]');
  const fnFailNote = document.querySelector('[data-ecu-function-fail-note]');
  const fnStartBtn = document.querySelector('[data-ecu-function-start]');
  const fnStopBtn = document.querySelector('[data-ecu-function-stop]');

  function fillList(el, items) {
    el.innerHTML = '';
    (items || []).forEach(function (t) {
      const li = document.createElement('li');
      li.textContent = t;
      el.appendChild(li);
    });
  }

  function logFunctionRun(fn, value) {
    if (!window.AutocomLiveSession || !vehicleId) return;
    window.AutocomLiveSession.append(vehicleId, { icon: fn.icon, label: fn.label, tone: 'success', value: value });
    if (window.AutocomNotifications) {
      window.AutocomNotifications.push('task', fn.label + ' completed', 'Logged to this session’s event history.');
    }
  }

  function openFunctionDialog(fn) {
    fnType.textContent = TYPE_LABEL[fn.type] || fn.type;
    fnTitle.textContent = fn.title || fn.label;
    fnDescription.textContent = fn.description || '';
    fnNotesWrap.classList.toggle('hidden', !(fn.notes && fn.notes.length));
    if (fn.notes) fillList(fnNotes, fn.notes);
    fnPrereqWrap.classList.toggle('hidden', !(fn.prerequisites && fn.prerequisites.length));
    if (fn.prerequisites) fillList(fnPrereq, fn.prerequisites);
    fnProcedureWrap.classList.toggle('hidden', !(fn.procedure && fn.procedure.length));
    if (fn.procedure) fillList(fnProcedure, fn.procedure);
    fnFailNote.classList.add('hidden');
    fnStateWrap.classList.toggle('hidden', fn.type !== 'activation');
    if (fn.type === 'activation') {
      fnStateRing.className = 'flex items-center justify-center size-28 rounded-full border-4 border-base-300';
      fnStateText.textContent = 'OFF';
      fnStateText.className = 'font-semibold text-base-content/60';
    }
    fnStartBtn.classList.remove('hidden');
    fnStartBtn.textContent = 'Start';
    fnStopBtn.classList.add('hidden');

    // Every function run re-establishes the comms protocol with the ECU first — a real mechanic
    // flagged the absence of this "connecting" moment as the one thing breaking the simulation's
    // feel (Activation previously had zero delay/feedback at all). Matches ADAS Calibration's own
    // "Connecting to rig" opening step (adas-calibration-modal.js).
    fnStartBtn.onclick = function () {
      fnStartBtn.disabled = true;
      if (fn.type === 'activation') {
        fnStateRing.className = 'flex items-center justify-center size-28 rounded-full border-4 border-base-300 animate-pulse';
        fnStateText.textContent = 'Connecting…';
        fnStateText.className = 'font-semibold text-base-content/60 text-sm';
        setTimeout(function () {
          fnStateRing.className = 'flex items-center justify-center size-28 rounded-full border-4 border-success';
          fnStateText.textContent = 'ON';
          fnStateText.className = 'font-semibold text-success';
          fnStartBtn.disabled = false;
          fnStartBtn.classList.add('hidden');
          fnStopBtn.classList.remove('hidden');
          logFunctionRun(fn, 'Activated');
        }, 600);
      } else {
        fnStartBtn.textContent = 'Connecting…';
        setTimeout(function () {
          fnStartBtn.textContent = 'Running…';
          setTimeout(function () {
            fnStartBtn.disabled = false;
            fnStartBtn.textContent = 'Start';
            logFunctionRun(fn, 'Completed');
            fnDialog.close();
          }, 700);
        }, 500);
      }
    };
    fnStopBtn.onclick = function () {
      fnStateRing.className = 'flex items-center justify-center size-28 rounded-full border-4 border-base-300';
      fnStateText.textContent = 'OFF';
      fnStateText.className = 'font-semibold text-base-content/60';
      fnStopBtn.classList.add('hidden');
      fnStartBtn.classList.remove('hidden');
    };

    fnDialog.showModal();
  }
})();
