/**
 * Add your VCI (mocked): precheck -> discovery (pick by serial) -> pairing (Bluetooth) ->
 * configuring (Wi-Fi) -> done (device details). One-time first-run pairing, distinct from the
 * recurring per-session Auto-detect on Quick Connect (vci-pair-detect-modal.js) which assumes
 * the VCI is already paired.
 */
(function () {
  var root = document.getElementById('add-vci-card');
  if (!root) return;

  var basePath = root.getAttribute('data-base-path') || '/';

  function showState(id) {
    root.querySelectorAll('.add-vci-state').forEach(function (el) {
      el.classList.toggle('hidden', el.id !== id);
    });
  }

  function goToQuickConnect() {
    // Forked from add-vci.js — hardcoded to this folder rather than pattern-matched from the URL,
    // since this copy only ever runs on diagnostics-platform/ pages (see "Important decisions" #2
    // in the diagnostics-platform task).
    window.location.href = basePath + 'diagnostics-platform/';
  }

  function checkmarkSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-success"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>';
  }

  // ----- State 1: Precheck (staged, mirrors install.js's requirements checklist) -----
  var precheckContinue = document.getElementById('add-vci-precheck-continue');
  var precheckDelays = { bluetooth: 900, power: 1700 };
  var precheckDone = { bluetooth: false, power: false };

  Object.keys(precheckDelays).forEach(function (name) {
    setTimeout(function () {
      var el = root.querySelector('[data-precheck="' + name + '"] .add-vci-check-icon');
      if (el) {
        el.classList.remove('loading', 'loading-spinner', 'loading-sm', 'text-primary');
        el.innerHTML = checkmarkSvg();
      }
      precheckDone[name] = true;
      if (precheckDone.bluetooth && precheckDone.power) precheckContinue.disabled = false;
    }, precheckDelays[name]);
  });

  precheckContinue.addEventListener('click', function () {
    showState('add-vci-discovery');
    startDiscoveryScan();
  });

  document.getElementById('add-vci-later').addEventListener('click', goToQuickConnect);

  // ----- State 2: Discovery (devices appear one by one, each detected before it resolves) -----
  var scanningIndicator = document.getElementById('add-vci-scanning-indicator');
  var discoveryStarted = false;

  function startDiscoveryScan() {
    if (discoveryStarted) return;
    discoveryStarted = true;

    var rows = root.querySelectorAll('.add-vci-discovery-row');
    scanningIndicator.classList.remove('hidden');

    var appearDelay = 500;
    var resolveDelay = 700;
    var lastRowResolvesAt = 0;

    rows.forEach(function (row, i) {
      var appearAt = appearDelay + i * 900;
      var resolveAt = appearAt + resolveDelay;
      lastRowResolvesAt = Math.max(lastRowResolvesAt, resolveAt);

      setTimeout(function () {
        row.classList.remove('hidden');
      }, appearAt);

      setTimeout(function () {
        row.querySelector('.add-vci-row-detecting').classList.add('hidden');
        row.querySelector('.add-vci-row-resolved').classList.remove('hidden');
      }, resolveAt);
    });

    setTimeout(function () {
      scanningIndicator.classList.add('hidden');
    }, lastRowResolvesAt + 100);
  }

  document.getElementById('add-vci-discovery-back').addEventListener('click', function () {
    showState('add-vci-precheck');
  });
  document.getElementById('add-vci-discovery-later').addEventListener('click', goToQuickConnect);

  // ----- State 3: Pick a device by serial -----
  var pairingSerialEl = document.getElementById('add-vci-pairing-serial');
  var configuringSerialEl = document.getElementById('add-vci-configuring-serial');
  var doneSerialEl = document.getElementById('add-vci-done-serial');

  root.querySelectorAll('.add-vci-device-row').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var serial = btn.getAttribute('data-serial');
      pairingSerialEl.textContent = serial;
      configuringSerialEl.textContent = serial;
      doneSerialEl.textContent = serial.replace('-', ' - ');

      showState('add-vci-pairing');
      setTimeout(function () {
        showState('add-vci-configuring');
        if (window.AutocomNotifications) {
          window.AutocomNotifications.push(
            'connection',
            'Connection issue detected',
            'Wi-Fi setup needed a couple of retries while pairing your VCI. Keep your device close to the router for the most reliable connection.',
            { dedupeKey: 'add-vci-wifi-retry' }
          );
        }
        setTimeout(function () {
          showState('add-vci-done');
        }, 1600);
      }, 1400);
    });
  });

  document.getElementById('add-vci-continue').addEventListener('click', goToQuickConnect);

  showState('add-vci-precheck');
})();
