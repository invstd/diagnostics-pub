/**
 * VCI Setup wizard, opened as a full-screen <dialog> from Quick Connect (vci-setup/home.njk)
 * rather than its own routed page — see home.njk's header comment for why. All state-machine
 * logic below is unchanged from when this was a standalone page; only how it opens/closes moved.
 *
 * Entry (2026-09-24): Quick Connect always shows its normal hero. While unpaired, clicking the
 * Auto-detect card opens this dialog instead of vehicle detection (the click is intercepted below,
 * so diagnostics-platform-vci-pair-detect-modal.js stays untouched). Every open starts on an intro screen
 * ("Let's connect your VCI"); its "+ Add VCI" button starts the flow below.
 *
 * Flow: intro -> [Bluetooth permission gate] -> precheck -> discovery (pick by serial) -> [firmware check
 * -> firmware update if mid-gen] -> pairing (Bluetooth) -> configure Wi-Fi (real form, with a
 * "browse networks" sub-flow gated on a mocked location permission) -> connecting -> wait for
 * uplink -> done. If discovery finds nothing, routes to a photo-based "which VCI do you have"
 * identification step instead of a dead end: picking the black/legacy device goes to a "needs
 * replacement" screen (dead-gen hardware can't be fixed by firmware), picking the blue ICON device
 * goes to a BLE troubleshooting checklist. A failed uplink check goes to a merged connectivity-
 * troubleshooting screen (same experience whether the cause was "hotspot never worked" or a
 * generic timeout) with a retry.
 *
 * Which of these branches plays out is controlled by a `?scenario=` URL param on this page, not an
 * in-flow switcher — same "shareable link per scenario" convention as Settings' Test Link
 * elsewhere in this app. Values: happy (default) / firmware-update / dead-gen / bt-denied /
 * timeout. The dialog never auto-opens (2026-09-24): scenario links land on Quick Connect with the
 * scenario armed, and it plays out once Auto-detect is clicked while unpaired. The Bluetooth/location
 * permission gates and the "already in workshop" discovery row aren't scenario-gated — they're
 * real OS/product states any run can hit.
 *
 * Every terminal "Set up later"/skip exit just closes the dialog. The Done screen's "Continue"
 * persists the paired state (`vci-setup-paired` in localStorage, see vci-setup-home.js), closes
 * the dialog back onto Quick Connect, and shows a success toast — Auto-detect then works normally.
 */
(function () {
  var root = document.getElementById('add-vci-card');
  var dialog = document.getElementById('vci-setup-dialog');
  if (!root || !dialog) return;

  var basePath = root.getAttribute('data-base-path') || '/';
  var searchParams = new URLSearchParams(window.location.search);
  var scenario = searchParams.get('scenario') || 'happy';

  // First-run Bluetooth permission gate — in-memory, not localStorage, same "persists for this
  // visit only" treatment as locationGranted further down. Real permission would persist across
  // reloads too, but this matches the existing precedent rather than inventing a new persistence
  // mechanism for one flag.
  var bluetoothGranted = false;

  // Shared Back button (2026-09-21, flagged by Vedran: Back should sit on the same line as the ×
  // close button, not as its own inline row per state) — one button in the DOM instead of the 6
  // separate ones + 6 separate click handlers this replaced. showState() shows/hides it based on
  // whether the state being shown has an entry here; showWifiForm is referenced before its own
  // declaration further down, safe because function declarations (not expressions) are hoisted.
  var backBtn = document.getElementById('add-vci-back');
  var BACK_TARGETS = {
    'add-vci-bt-request': 'add-vci-intro',
    'add-vci-bt-denied': 'add-vci-intro',
    'add-vci-precheck': 'add-vci-intro',
    'add-vci-discovery': 'add-vci-precheck',
    'add-vci-identify': 'add-vci-discovery',
    'add-vci-troubleshoot': 'add-vci-identify',
    'add-vci-replace': 'add-vci-identify',
    'add-vci-no-vci': 'add-vci-identify',
    'add-vci-location-denied': showWifiForm,
    'add-vci-network-list': showWifiForm
  };

  function showState(id) {
    root.querySelectorAll('.add-vci-state').forEach(function (el) {
      el.classList.toggle('hidden', el.id !== id);
    });
    backBtn.classList.toggle('hidden', !BACK_TARGETS[id]);
  }

  backBtn.addEventListener('click', function () {
    var current = root.querySelector('.add-vci-state:not(.hidden)');
    var target = current && BACK_TARGETS[current.id];
    if (typeof target === 'function') target();
    else if (target) showState(target);
  });

  function closeUnpaired() {
    dialog.close();
  }
  function closePaired() {
    localStorage.setItem('vci-setup-paired', '1');
    var recentVehicles = document.getElementById('vci-quick-connect-recent-vehicles');
    if (recentVehicles) recentVehicles.classList.remove('hidden');
    // Same live update vci-setup-home.js does on load — needed here too since that script only
    // runs once on page load and can't react to pairing finishing later in the same visit.
    var sidebarBadge = document.getElementById('vci-sidebar-status-badge');
    if (sidebarBadge) {
      sidebarBadge.textContent = 'READY';
      sidebarBadge.className = 'badge badge-info badge-sm shrink-0';
    }
    dialog.close();
    showPairedToast();
  }

  // Success toast after pairing (2026-09-24, flagged by Vedran). Rendered straight into the
  // layout's shared #notification-toast-container rather than via AutocomNotifications.push(),
  // which only has warning/info types and would also persist this into the notification panel —
  // this is a one-off confirmation, not something to keep in the inbox.
  function showPairedToast() {
    var container = document.getElementById('notification-toast-container');
    if (!container) return;
    var el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.className = 'alert alert-success shadow-lg max-w-xs items-start';
    el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 shrink-0 mt-0.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>' +
      '<div class="min-w-0"><p class="font-semibold text-sm">VCI added</p><p class="text-xs opacity-80"></p></div>';
    el.querySelector('p.text-xs').textContent = (currentSerial || 'Your VCI') + ' is paired and ready to use.';
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 6000);
  }

  function checkmarkSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-success"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>';
  }

  // ----- State 0: Bluetooth permission request (first run only, see markup comment) -----
  document.getElementById('add-vci-bt-request-allow').addEventListener('click', function () {
    bluetoothGranted = true;
    showState('add-vci-precheck');
  });
  document.getElementById('add-vci-bt-request-later').addEventListener('click', closeUnpaired);

  // ----- State: Bluetooth access not allowed (real OS permission gate) -----
  var btAllowBtn = document.getElementById('add-vci-bt-allow');
  btAllowBtn.addEventListener('click', function () {
    // Resolves both the radio being off and the app not having permission — see this state's
    // markup comment for why a single combined action, not just a permission grant, is needed.
    // Brief visible confirmation (status flips to Enabled) before moving on, same "show the state
    // actually changed" treatment as precheck's own checklist, rather than an instant jump that
    // gives no indication anything happened.
    var btStatus = document.getElementById('add-vci-bt-denied-status');
    btAllowBtn.disabled = true;
    bluetoothGranted = true;
    if (btStatus) btStatus.textContent = 'Enabled';
    setTimeout(function () {
      showState('add-vci-discovery');
      startDiscoveryScan();
      btAllowBtn.disabled = false;
    }, 500);
  });

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

  document.getElementById('add-vci-later').addEventListener('click', closeUnpaired);

  // ----- State 2: Discovery (devices appear one by one, each detected before it resolves) -----
  // dead-gen scenario: the scan simulates finding nothing (a first-gen VCI won't advertise the
  // way this discovery list assumes), routing into the identify-by-photo step instead.
  var scanningIndicator = document.getElementById('add-vci-scanning-indicator');
  var discoveryEmpty = document.getElementById('add-vci-discovery-empty');
  var discoveryKnownRow = document.querySelector('.add-vci-static-known-row');
  var discoveryStarted = false;

  function startDiscoveryScan() {
    if (discoveryStarted) return;
    discoveryStarted = true;
    discoveryEmpty.classList.add('hidden');

    if (scenario === 'dead-gen') {
      scanningIndicator.classList.remove('hidden');
      setTimeout(function () {
        scanningIndicator.classList.add('hidden');
        discoveryEmpty.classList.remove('hidden');
      }, 2200);
      return;
    }

    var rows = root.querySelectorAll('.add-vci-discovery-row');
    scanningIndicator.classList.remove('hidden');
    discoveryKnownRow.classList.remove('hidden');
    rows.forEach(function (row) {
      row.classList.add('hidden');
      row.querySelector('.add-vci-row-detecting').classList.remove('hidden');
      row.querySelector('.add-vci-row-resolved').classList.add('hidden');
    });

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

  document.getElementById('add-vci-discovery-later').addEventListener('click', closeUnpaired);
  document.getElementById('add-vci-discovery-identify').addEventListener('click', function () {
    showState('add-vci-identify');
  });

  // ----- State 2b: Identify by photo (only reachable after an empty scan) -----
  document.getElementById('add-vci-identify-icon').addEventListener('click', function () {
    showState('add-vci-troubleshoot');
  });
  document.getElementById('add-vci-identify-legacy').addEventListener('click', function () {
    showState('add-vci-replace');
  });
  document.getElementById('add-vci-identify-none').addEventListener('click', function () {
    showState('add-vci-no-vci');
  });

  // ----- State: BLE troubleshooting (blue ICON, still not found) -----
  document.getElementById('add-vci-troubleshoot-retry').addEventListener('click', function () {
    discoveryStarted = false;
    showState('add-vci-discovery');
    startDiscoveryScan();
  });

  // ----- State: dead-gen -> needs replacement -----
  document.getElementById('add-vci-replace-later').addEventListener('click', closeUnpaired);

  // ----- State: no / non-Autocom VCI -----
  document.getElementById('add-vci-no-vci-later').addEventListener('click', closeUnpaired);

  // ----- State 3: pick a device by serial (found path) -----
  var pairingSerialEl = document.getElementById('add-vci-pairing-serial');
  var wifiFormSerialEl = document.getElementById('add-vci-wifi-form-serial');
  var configuringSerialEl = document.getElementById('add-vci-configuring-serial');
  var doneSerialEl = document.getElementById('add-vci-done-serial');
  var currentSerial = '';

  root.querySelectorAll('.add-vci-device-row').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentSerial = btn.getAttribute('data-serial');
      pairingSerialEl.textContent = currentSerial;
      configuringSerialEl.textContent = currentSerial;
      doneSerialEl.textContent = currentSerial.replace('-', ' - ');

      showState('add-vci-pairing');
      setTimeout(function () {
        showState('add-vci-firmware-check');
        setTimeout(afterFirmwareCheck, 900);
      }, 1400);
    });
  });

  function afterFirmwareCheck() {
    if (scenario === 'firmware-update') {
      showState('add-vci-firmware-updating');
      setTimeout(showWifiForm, 2000);
    } else {
      showWifiForm();
    }
  }

  // ----- State: Configure Wi-Fi (real form) -----
  var wifiSsid = document.getElementById('add-vci-wifi-ssid');
  var wifiPassword = document.getElementById('add-vci-wifi-password');
  var wifiConnect = document.getElementById('add-vci-wifi-connect');
  var wifiPasswordToggle = document.getElementById('add-vci-wifi-password-toggle');
  var wifi5ghzWarning = document.getElementById('add-vci-network-5ghz-warning');
  var locationGranted = false;

  function showWifiForm() {
    wifiFormSerialEl.textContent = currentSerial;
    showState('add-vci-wifi-form');
  }

  function syncWifiConnectEnabled() {
    wifiConnect.disabled = !(wifiSsid.value.trim() && wifiPassword.value.trim());
  }
  wifiSsid.addEventListener('input', syncWifiConnectEnabled);
  wifiPassword.addEventListener('input', syncWifiConnectEnabled);

  wifiPasswordToggle.addEventListener('click', function () {
    var showing = wifiPassword.type === 'text';
    wifiPassword.type = showing ? 'password' : 'text';
    wifiPasswordToggle.textContent = showing ? 'Show' : 'Hide';
  });

  document.getElementById('add-vci-wifi-browse').addEventListener('click', function () {
    showState(locationGranted ? 'add-vci-network-list' : 'add-vci-location-denied');
  });
  document.getElementById('add-vci-location-allow').addEventListener('click', function () {
    locationGranted = true;
    showState('add-vci-network-list');
  });

  root.querySelectorAll('.add-vci-network-row').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-band') === '5ghz') {
        wifi5ghzWarning.classList.remove('hidden');
        return;
      }
      wifi5ghzWarning.classList.add('hidden');
      wifiSsid.value = btn.getAttribute('data-ssid');
      syncWifiConnectEnabled();
      showWifiForm();
    });
  });

  wifiConnect.addEventListener('click', function () {
    // No "Connection issue detected" notification here any more (2026-09-24, flagged by Vedran):
    // it fired on every run, happy path included, and landed right next to the "VCI added" toast.
    // Real connectivity failures are covered in-flow by add-vci-connectivity-trouble (timeout).
    showState('add-vci-configuring');
    setTimeout(function () {
      showState('add-vci-uplink-wait');
      setTimeout(afterUplinkWait, 1200);
    }, 1600);
  });

  // Only the first uplink check fails for the timeout scenario — retrying succeeds, so the demo
  // shows the recovery path rather than a true dead end.
  var uplinkAttempted = false;
  function afterUplinkWait() {
    if (scenario === 'timeout' && !uplinkAttempted) {
      uplinkAttempted = true;
      showState('add-vci-connectivity-trouble');
    } else {
      showState('add-vci-done');
    }
  }

  document.getElementById('add-vci-connectivity-retry').addEventListener('click', function () {
    showState('add-vci-uplink-wait');
    setTimeout(afterUplinkWait, 1200);
  });

  document.getElementById('add-vci-continue').addEventListener('click', closePaired);
  document.getElementById('vci-setup-dialog-close').addEventListener('click', closeUnpaired);

  // ----- Open / reset -----
  // A user can back out mid-flow ("Set up later", the × close button) and reopen from Quick
  // Connect later, so every open resets to a clean first screen rather than resuming wherever they
  // left off — real OS permission grants (Bluetooth having been allowed, location access) are the
  // one exception, since those genuinely persist across a session in real life.
  function resetWizard() {
    discoveryStarted = false;
    uplinkAttempted = false;
    currentSerial = '';
    wifiSsid.value = '';
    wifiPassword.value = '';
    wifiPassword.type = 'password';
    wifiPasswordToggle.textContent = 'Show';
    wifi5ghzWarning.classList.add('hidden');
    syncWifiConnectEnabled();
    showState('add-vci-intro');
  }

  // Intro's "+ Add VCI" — routes into the first real setup step.
  function startSetup() {
    // bt-denied is an explicit demo link for the "denied/revoked" recovery case and always wins;
    // otherwise show the real first-run permission ask until it's been granted once this visit.
    showState(
      scenario === 'bt-denied' ? 'add-vci-bt-denied' :
      bluetoothGranted ? 'add-vci-precheck' :
      'add-vci-bt-request'
    );
  }

  document.getElementById('add-vci-intro-start').addEventListener('click', startSetup);

  // Auto-detect gate: while unpaired, open this dialog instead of vehicle detection. Capture-phase
  // listener on document so it runs before diagnostics-platform-vci-pair-detect-modal.js's own
  // click handler on the card (diagnostics-platform's file, deliberately not edited) and can stop
  // it from firing.
  document.addEventListener('click', function (e) {
    if (localStorage.getItem('vci-setup-paired') === '1') return;
    if (!e.target.closest('#vci-pair-detect-trigger')) return;
    e.stopPropagation();
    e.preventDefault();
    resetWizard();
    dialog.showModal();
  }, true);

  resetWizard();
})();
