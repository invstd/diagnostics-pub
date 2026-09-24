/**
 * Install Apex (mocked): minimum-requirements check -> install progress -> done.
 * Meaningful here (unlike the account-creation flow) because this represents a website
 * download for either macOS or Windows, not an app-store install — nothing has verified this
 * machine can run Apex yet. Completion persists per device (air-app-installed) so returning
 * visitors skip straight past this; welcome.njk redirects here if that flag isn't set.
 */
(function () {
  var root = document.getElementById('install-card');
  if (!root) return;

  function showState(id) {
    root.querySelectorAll('.install-state').forEach(function (el) {
      el.classList.toggle('hidden', el.id !== id);
    });
  }

  function checkmarkSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-success"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>';
  }

  function warningSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-warning"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  }

  function markCheck(name, ok) {
    var el = root.querySelector('[data-check="' + name + '"] .install-check-icon');
    if (!el) return;
    el.classList.remove('loading', 'loading-spinner', 'loading-sm', 'text-primary');
    el.innerHTML = ok ? checkmarkSvg() : warningSvg();
  }

  // ----- Detect OS for a believable detail line (this is a real gate here, unlike an app-store install) -----
  var osLabel = document.getElementById('install-check-os-label');
  var osDetailEl = document.getElementById('install-check-os-detail');
  function detectOS() {
    var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    if (/Mac/i.test(ua)) {
      var m = ua.match(/Mac OS X ([\d_]+)/);
      return m ? 'macOS ' + m[1].replace(/_/g, '.') : 'macOS';
    }
    if (/Win/i.test(ua)) {
      return /Windows NT 10\.0/.test(ua) ? 'Windows 10/11' : 'Windows';
    }
    return '';
  }
  if (osDetailEl) osDetailEl.textContent = detectOS();

  // ----- Requirements checklist -----
  var continueBtn = document.getElementById('install-requirements-continue');
  var doneMsg = document.getElementById('install-requirements-done-msg');
  var timeEstimate = document.getElementById('install-requirements-time-estimate');
  var requirementsDivider = document.getElementById('install-requirements-divider');
  var staticChecks = ['os', 'hardware', 'disk'];
  var delays = [900, 1900, 3000];
  var staticChecksPassed = false;

  function refreshInternetCheck() {
    var online = typeof navigator === 'undefined' || navigator.onLine !== false;
    markCheck('internet', online);
    var ready = staticChecksPassed && online;
    doneMsg.classList.toggle('hidden', !ready);
    if (timeEstimate) timeEstimate.classList.toggle('hidden', !ready);
    if (requirementsDivider) requirementsDivider.classList.toggle('hidden', !ready);
    continueBtn.disabled = !ready;
  }

  staticChecks.forEach(function (name, i) {
    setTimeout(function () {
      markCheck(name, true);
      if (name === 'os' && osLabel) osLabel.textContent = 'OS — supported';
      if (i === staticChecks.length - 1) {
        staticChecksPassed = true;
        refreshInternetCheck();
      }
    }, delays[i]);
  });

  window.addEventListener('online', refreshInternetCheck);
  window.addEventListener('offline', refreshInternetCheck);
  setTimeout(refreshInternetCheck, delays[delays.length - 1] + 50);

  // Mocked, but paced closer to a real install (~15s) instead of ~3s, with rotating status text
  // by stage so it reads as actual work happening rather than a bar filling for its own sake.
  var progressStages = [
    { at: 0, text: 'Downloading installer…' },
    { at: 25, text: 'Verifying package…' },
    { at: 45, text: 'Copying files…' },
    { at: 70, text: 'Configuring Diagnostics Platform…' },
    { at: 90, text: 'Finishing up…' }
  ];

  continueBtn.addEventListener('click', function () {
    showState('install-progress');
    var bar = document.getElementById('install-progress-bar');
    var statusEl = document.getElementById('install-progress-status');
    var pct = 0;
    var stageIndex = 0;
    if (statusEl) statusEl.textContent = progressStages[0].text;
    var timer = setInterval(function () {
      pct += 1;
      bar.value = pct;
      if (statusEl && stageIndex < progressStages.length - 1 && pct >= progressStages[stageIndex + 1].at) {
        stageIndex++;
        statusEl.textContent = progressStages[stageIndex].text;
      }
      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(function () {
          if (typeof localStorage !== 'undefined') localStorage.setItem('air-app-installed', '1');
          showState('install-done');
        }, 300);
      }
    }, 150);
  });

  var openAppBtn = document.getElementById('install-open-app');
  if (openAppBtn) {
    openAppBtn.addEventListener('click', function () {
      var base = root.getAttribute('data-base-path') || '/';
      // Forked from install.js — hardcoded to this folder rather than pattern-matched from the
      // URL, since this copy only ever runs on diagnostics-platform/ pages (see "Important
      // decisions" #2 in the diagnostics-platform task).
      window.location.href = base + 'diagnostics-platform/welcome/';
    });
  }

  showState('install-requirements');
})();
