(function() {
// ===== Vehicle Data from URL Params =====
// Read vehicle info from URL params (passed from VCI pairing flow)
const urlParams = new URLSearchParams(window.location.search);
const vehicleData = {
  vehicleId: urlParams.get('vehicleId') || '',
  vin: urlParams.get('vin') || '',
  brand: urlParams.get('brand') || '',
  brandSlug: urlParams.get('brandSlug') || '',
  model: urlParams.get('model') || '',
  year: urlParams.get('year') || '',
  engine: urlParams.get('engine') || ''
};

// Forked from diagnostics-dashboard.js — this copy only ever runs on diagnostics-platform/ pages,
// so the root is matched against that folder instead of automechanika/ (see "Important decisions"
// #2 in the diagnostics-platform task). Shared by the ECU-detail nav handler and the Finish
// Session handler below — both need to link to another page under this same
// /diagnostics-platform/ root, regardless of basePath this build is served from.
function getBasePath() {
  const basePathMatch = window.location.pathname.match(/^(.*?\/)diagnostics-platform\//);
  return basePathMatch ? basePathMatch[1] : '/';
}

// Vehicle image mapping - maps brand/model to available image files
// Keys use URL brand param (dataSlug, e.g. fiat, alfa_romeo). Model slugs: lowercase, spaces → hyphens.
const vehicleImageMap = {
  "volkswagen": {
    "touareg": "Volkswagen_Touareg_2023.png",
    "golf": "Volkswagen_Golf_2024.png",
    "golf-2018": "Volkswagen_Golf__2018.png",
    "t-cross": "Volkswagen_T-Cross_2022.png",
    "_default": "Volkswagen_Touareg_2023.png"
  },
  "audi": {
    "a3": "Audi_A3_sedan_2024.png",
    "a4": "Audi_A4_2017.png",
    "a6": "Audi_A6_sedan_S-Line_2023.png",
    "_default": "Audi_A6_sedan_S-Line_2023.png"
  },
  "bmw": {
    "_default": "Volkswagen_Touareg_2023.png"
  },
  "mercedes-benz": {
    "_default": "Volkswagen_Touareg_2023.png"
  },
  "toyota": {
    "corolla": "Toyota_Corolla_E210_sedan_Hybrid_2019.png",
    "corolla-e210-hybrid": "Toyota_Corolla_E210_hybrid_2018.png",
    "_default": "Toyota_Corolla_E210_sedan_Hybrid_2019.png"
  },
  "ford": {
    "focus": "Ford_Focus_Titanium_2018.png",
    "focus-st-line": "Ford_Focus_ST_Line_2018.png",
    "focus-titanium": "Ford_Focus_Titanium_2018.png",
    "_default": "Ford_Focus_Titanium_2018.png"
  },
  "opel": {
    "astra": "Opel_Astra_K_2016.png",
    "astra-k": "Opel_Astra_K_2016.png",
    "astra-l-hybrid": "Opel_Astra_L_Hybrid_2021.png",
    "_default": "Opel_Astra_K_2016.png"
  },
  "skoda": {
    "octavia": "Skoda_Octavia_liftback_2013.png",
    "octavia-5e": "Skoda_Octavia_5E_liftback_2017.png",
    "octavia-1z": "Skoda_Octavia_1Z_liftback_2005.png",
    "_default": "Skoda_Octavia_liftback_2013.png"
  },
  "renault": {
    "megane": "Renault_Megane_hatchback_2014.png",
    "megane-hatchback": "Renault_Megane_hatchback_2014.png",
    "megane-sedan": "Renault_Megane_sedan_2020.png",
    "clio": "Renault_Megane_hatchback_2014.png",
    "_default": "Renault_Megane_hatchback_2014.png"
  },
  "peugeot": {
    "308": "Peugeot_308_T9_2017.png",
    "308-t9": "Peugeot_308_T9_2017.png",
    "308-t9-sedan": "Peugeot_308_T9_sedan_2017.png",
    "308-p5-hybrid": "Peugeot_308_P5_HYBRID_2021.png",
    "_default": "Peugeot_308_T9_2017.png"
  },
  "hyundai": {
    "i30": "Hyundai_i30_PD_2024.png",
    "i30-pd": "Hyundai_i30_PD_2024.png",
    "i30-gd": "Hyundai_i30_GD_2015.png",
    "_default": "Hyundai_i30_PD_2024.png"
  },
  "kia": {
    "ceed": "Kia_Ceed_hatchback_2018.png",
    "sportage": "Kia_Ceed_hatchback_2018.png",
    "_default": "Kia_Ceed_hatchback_2018.png"
  },
  "volvo": {
    "xc60": "Volvo_XC60_T6_2017.png",
    "xc40": "Volvo_XC60_T6_2017.png",
    "v60": "Volvo_V60_D4_2015.png",
    "_default": "Volvo_XC60_T6_2017.png"
  },
  "mazda": {
    "mazda3": "Mazda_3_sedan_2019.png",
    "3": "Mazda_3_sedan_2019.png",
    "cx-5": "Mazda_3_sedan_2019.png",
    "_default": "Mazda_3_sedan_2019.png"
  },
  "honda": {
    "civic": "Honda_Civic_coupe_2016.png",
    "cr-v": "Honda_Civic_coupe_2016.png",
    "_default": "Honda_Civic_coupe_2016.png"
  },
  "nissan": {
    "qashqai": "Nissan_Qashqai_2017.png",
    "_default": "Nissan_Qashqai_2017.png"
  },
  "dacia": {
    "duster": "Dacia_Duster_Extreme_2024.png",
    "sandero": "Dacia_Sandero_2021.png",
    "_default": "Dacia_Sandero_2021.png"
  },
  "seat": {
    "leon": "Seat_Leon_FR_eHybrid_2020.png",
    "leon-5f-fr": "Seat_Leon_5F_FR_2016.png",
    "leon-fr-ehybrid": "Seat_Leon_FR_eHybrid_2020.png",
    "_default": "Seat_Leon_FR_eHybrid_2020.png"
  },
  "citroen": {
    "c3": "Citroen_C3_2017.png",
    "c3-l-sedan": "Citroen_C3_L_sedan_2020.png",
    "c4-cactus": "Citroen_C4_Cactus_2015.png",
    "c4-picasso": "Citroen_C4_Picasso_2016.png",
    "_default": "Citroen_C3_2017.png"
  },
  "fiat": {
    "argo": "Fiat_Argo_2017.png",
    "panda-cross": "Fiat_Panda_Cross_2014.png",
    "pulse-impetus": "Fiat_Pulse_Impetus_2021.png",
    "tipo": "Fiat_Tipo_2020.png",
    "_default": "Fiat_Tipo_2020.png"
  },
  "alfa_romeo": {
    "_default": "Volkswagen_Touareg_2023.png"
  },
  "_default": "Volkswagen_Touareg_2023.png"
};

// Trucks brand/vehicle images live in separate brands-trucks/ and vehicles-trucks/ folders, not
// brands/ and vehicles/ (see [[trucks-feature-wabco-weasy]] — car "Volvo" already exists, so
// truck brand data uses its own namespace and its own image folders to avoid colliding with it).
const vehicleImageMapTrucks = {
  "volvo_trucks": {
    "fh": "volvo-fh-xl-chassis-truck-4-axle-2025.png",
    "_default": "volvo-fh-xl-chassis-truck-4-axle-2025.png"
  },
  "man_trucks": {
    "_default": "man-truck-demo.png"
  },
  "_default": "volvo-fh-xl-chassis-truck-4-axle-2025.png"
};

// Cars/Trucks is a Settings preference, not something the diagnostics-dashboard URL params say
// directly — same source of truth used by the sidebar/vehicle-selection redirect gates.
const isTrucksMode = localStorage.getItem('automechanika-vehicle-type') === 'trucks';
const brandsImageFolder = isTrucksMode ? 'brands-trucks' : 'brands';
const vehiclesImageFolder = isTrucksMode ? 'vehicles-trucks' : 'vehicles';

function getVehicleImage(brandSlug, model) {
  const map = isTrucksMode ? vehicleImageMapTrucks : vehicleImageMap;
  const brandImages = map[brandSlug] || map["_default"];
  if (typeof brandImages === 'string') return brandImages;
  const modelSlug = (model || '').toLowerCase().replace(/\s+/g, '-');
  return brandImages[modelSlug] || brandImages["_default"] || map["_default"];
}

// Update vehicle display if URL params are present
if (vehicleData.vin || vehicleData.model || vehicleData.brandSlug) {
  const brandLogo = document.querySelector('[data-vehicle-brand-logo]');
  const vehicleTitle = document.querySelector('[data-vehicle-title]');
  const vehicleVin = document.querySelector('[data-vehicle-vin]');
  const vehicleImage = document.querySelector('[data-vehicle-image]');
  const vehicleImageWrapper = document.querySelector('[data-car-image-wrapper]');

  // Brand logo: URL may pass dataSlug (e.g. alfa_romeo); image files use logoSlug (e.g. alfa-romeo)
  if (brandLogo && vehicleData.brandSlug) {
    const basePath = brandLogo.dataset.basePath || '/';
    const logoSlug = vehicleData.brandSlug.replace(/_/g, '-');
    brandLogo.src = basePath + 'assets/images/' + brandsImageFolder + '/' + logoSlug + '.png';
    brandLogo.alt = vehicleData.brand;
  }
  
  if (vehicleTitle && (vehicleData.model || vehicleData.year)) {
    const parts = [];
    if (vehicleData.model) parts.push(vehicleData.model);
    if (vehicleData.year) parts.push('(' + vehicleData.year + ')');
    vehicleTitle.textContent = parts.join(' ');
  }
  
  if (vehicleVin && vehicleData.vin) {
    vehicleVin.textContent = vehicleData.vin;
  }
  
  // Update vehicle image based on brand/model
  if (vehicleImage && vehicleData.brandSlug) {
    const basePath = vehicleImage.dataset.basePath || '/';
    const imageName = getVehicleImage(vehicleData.brandSlug, vehicleData.model);
    vehicleImage.src = basePath + 'assets/images/' + vehiclesImageFolder + '/' + imageName;
    vehicleImage.alt = vehicleData.brand + ' ' + vehicleData.model + (vehicleData.year ? ' ' + vehicleData.year : '');
    // Car photos are pre-cropped to roughly match the 16:10 frame, so object-cover fills it
    // edge-to-edge on purpose. The truck photo (and likely future ones) is a square studio shot —
    // object-cover was cutting off the cab roof and rear wheels to force it into that wide, short
    // frame. object-contain alone fixed the cropping but then shrank the image a lot to fit inside
    // the same wide/short box, leaving big empty gutters on both sides. Squaring the wrapper's own
    // aspect ratio for trucks (below) instead of just changing object-fit means the image fills
    // the frame at full size, correct regardless of the source photo's own aspect ratio.
    vehicleImage.classList.toggle('object-cover', !isTrucksMode);
    vehicleImage.classList.toggle('object-contain', isTrucksMode);
  }

  // Tailwind's aspect-[16/10]/aspect-square utilities don't reliably win here — main.css has a
  // hand-written .diagnostics-dashboard-vehicle-image rule at the same specificity that also sets
  // aspect-ratio/max-height, so toggling Tailwind classes was fighting a coin-flip on source
  // order. A dedicated CSS class (see main.css) sidesteps that instead of trying to out-order it.
  if (vehicleImageWrapper) {
    vehicleImageWrapper.classList.toggle('diagnostics-dashboard-vehicle-image--trucks', isTrucksMode);
  }
}

// Simulated battery voltage reading — single source of truth for the status-badge-row's badge
// text/color and the low-voltage notification below, so all three always agree. Same red/amber
// (orange)/green severity language as everywhere else in the app (notifications, VCI unstable).
//
// Heavy trucks run a 24V electrical system (two 12V batteries in series), not a car's 12V system —
// showing a car-style ~11-12V reading on a truck dashboard would be wrong. Nominal voltage and
// thresholds scale with isTrucksMode; the mock reading keeps the same proportional "slightly low"
// deficit (~5% under nominal) either way, so both land in the same warning severity for the demo.
//
// Suppressed demos (Settings' "Notifications" toggle) get a healthy reading at nominal voltage
// instead — a demonstrator running a live audience through this shouldn't have to explain an
// amber battery badge that's only there to justify a notification they've already turned off.
const nominalVoltage = isTrucksMode ? 24 : 12;
const notificationsSuppressed = localStorage.getItem('launchpad-notifications-suppressed') === '1';
const mockVoltage = notificationsSuppressed ? nominalVoltage : (isTrucksMode ? 22.8 : 11.4);
const voltageBadge = document.getElementById('vehicle-voltage-stat-badge');
if (voltageBadge) {
  voltageBadge.textContent = mockVoltage.toFixed(1) + 'V';
  let voltageBadgeClass = 'badge-success';
  if (mockVoltage < nominalVoltage - 2) {
    voltageBadgeClass = 'badge-error';
  } else if (mockVoltage < nominalVoltage) {
    voltageBadgeClass = 'badge-warning';
  }
  voltageBadge.className = 'badge ' + voltageBadgeClass + ' badge-sm shrink-0';
}

// Surfaced as a notification shortly after landing on the dashboard (mirrors a real VCI
// reporting voltage once connected), only when the reading is actually low. Deduped per VIN so
// revisiting the same vehicle in-session doesn't re-fire it. AutocomNotifications loads via a
// script tag later in the document, so the check happens inside the timeout, not at parse time.
if (mockVoltage < nominalVoltage) {
  setTimeout(function () {
    if (!window.AutocomNotifications) return;
    window.AutocomNotifications.push(
      'voltage',
      'Low battery voltage detected',
      'This vehicle\'s battery is reading ' + mockVoltage.toFixed(1) + 'V, below the healthy ' + nominalVoltage + 'V+ range. Check the battery or charging system before your next scan.',
      { dedupeKey: 'voltage-' + (vehicleData.vin || 'unknown') }
    );
  }, 2000);
}

// ===== Live session: real dashboard actions → this vehicle's Garage session history =====
// See live-session.js for the storage/append contract. Every append site below reuses that one
// function so there's a single place that decides what "logging an event" means.
const currentSessionBadge = document.querySelector('[data-current-session-badge]');
const currentSessionText = document.querySelector('[data-current-session-text]');
const finishSessionWrap = document.querySelector('[data-finish-session-wrap]');
const finishSessionBtn = document.querySelector('[data-finish-session-btn]');

function refreshCurrentSessionBadge() {
  if (!currentSessionBadge || !window.AutocomLiveSession || !vehicleData.vehicleId) return;
  const label = window.AutocomLiveSession.summaryLabel(vehicleData.vehicleId);
  if (label) {
    if (currentSessionText) currentSessionText.textContent = label.replace('Current session · ', '');
    currentSessionBadge.classList.remove('hidden');
  } else {
    currentSessionBadge.classList.add('hidden');
  }
  if (finishSessionWrap) finishSessionWrap.classList.toggle('hidden', !label);
}

// Finish Session — purely navigational (see diagnostics-dashboard.njk's sticky-footer comment for
// why it doesn't end/clear the live session). Lands on this vehicle's Garage session, where
// garage.js's ?vehicleId= handling selects the right row and garage-live-session.js's own row
// already opens expanded with a "Generate Report" button — no session data needs to travel in the
// URL beyond which vehicle to select.
if (finishSessionBtn) {
  finishSessionBtn.addEventListener('click', function () {
    const garagePage = isTrucksMode ? 'my-garage-trucks' : 'my-garage';
    const params = new URLSearchParams({ tab: 'sessions', vehicleId: vehicleData.vehicleId });
    window.location.href = getBasePath() + 'diagnostics-platform/' + garagePage + '/?' + params.toString();
  });
}

// icon/label/tone/value match the exact event shape genSessions() produces in
// garageVehiclesCars.js/-Trucks.js (icon, label, tone, value) — no second shape to keep in sync.
function logLiveEvent(iconName, label, tone, value) {
  if (!window.AutocomLiveSession || !vehicleData.vehicleId) return;
  window.AutocomLiveSession.append(vehicleData.vehicleId, { icon: iconName, label: label, tone: tone, value: value });
  refreshCurrentSessionBadge();
}

refreshCurrentSessionBadge();
// Exposed so other modals (Battery SoH, Data Lists) can refresh the badge immediately after
// logging their own event, instead of waiting for the next dashboard action to do it.
window.refreshCurrentSessionBadgeFromLiveSession = refreshCurrentSessionBadge;

// ===== Scan state persistence =====
// Every result a scan produces (ok/warning/error per system, DTC codes) lived only in this page's
// in-memory DOM state — clicking into a system's own detail page (a real navigation, not an
// in-page panel) and coming back via its own back arrow reset everything to "pending", as if the
// scan never ran. sessionStorage (not localStorage — this is "my current visit," not something
// that should still be sitting there stale next week) now keeps the last scan's result per vehicle,
// restored once on load (restoreScanState() is called at the very end of this file — it reads
// filterControls/errorCountBadge/etc., module-level `const`s declared further down, so it can't run
// any earlier without a temporal-dead-zone error) — before a user could plausibly act on the page.
function scanStateStorageKey() {
  const idPart = vehicleData.vehicleId || vehicleData.vin;
  if (!idPart) return null;
  return 'automechanika-scan-state-' + (isTrucksMode ? 'trucks' : 'cars') + '-' + idPart;
}

// Single choke point (called from syncSystemListItem, same as updateGroupProgress) so every path
// that changes a system's state — scan in progress, scan complete, Clear DTCs — persists it the
// same way with no extra call sites to remember. 'scanning' is deliberately not persisted: it's
// never a final result, and persisting it could restore a permanently-stuck spinner if a tab closed
// mid-scan.
function persistNodeScanState(nodeId, state, dtcCodes) {
  const key = scanStateStorageKey();
  if (!key || state === 'scanning') return;
  let stored = {};
  try { stored = JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch (e) {}
  stored[nodeId] = { state: state, dtcCodes: dtcCodes || [] };
  try { sessionStorage.setItem(key, JSON.stringify(stored)); } catch (e) {}
}

// Runs once on load. Replays every persisted system state through the exact same
// syncSystemListItem() a live scan uses, so status icons, DTC badges, and group-accordion progress
// (updateGroupProgress) all come back identically — then recomputes the filter controls and health
// gauge from those restored states, same math startScanDemo() itself uses at scan-complete.
function restoreScanState() {
  const key = scanStateStorageKey();
  if (!key) return;
  let stored = null;
  try { stored = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
  if (!stored) return;

  let restoredAny = false;
  Object.keys(stored).forEach((nodeId) => {
    const entry = stored[nodeId];
    if (!entry || !entry.state || entry.state === 'pending') return;
    const item = document.querySelector(`.system-list-item[data-system-id="${nodeId}"]`);
    if (!item) return;
    syncSystemListItem(nodeId, entry.state, entry.dtcCodes || []);
    restoredAny = true;
  });
  if (!restoredAny) return;

  // OBD is always 'ok' once any scan has run — not persisted per-node (it's not a real system,
  // deterministic either way), just restored alongside everything else.
  const obd = document.querySelector('[data-node-id="obd"]');
  if (obd) obd.dataset.state = 'ok';

  updateFilterControls();
  applySystemsListFilters();

  const counts = { ok: 0, warning: 0, error: 0 };
  document.querySelectorAll('.system-list-item[data-system-id]').forEach((el) => {
    if (counts[el.dataset.state] !== undefined) counts[el.dataset.state]++;
  });
  const total = counts.ok + counts.warning + counts.error;
  if (total > 0) {
    const healthScore = Math.max(0, 100 - (counts.warning * 5) - (counts.error * 15));
    const segments = [
      { value: (counts.ok / total) * 100, color: 'success' },
      { value: (counts.warning / total) * 100, color: 'warning' },
      { value: (counts.error / total) * 100, color: 'error' }
    ].filter((s) => s.value > 0);
    healthGaugeSetResult(healthScore, segments);
  }
}

// Generic handler for Diagnostic Function tiles that don't have their own real flow (everything
// except BMS, which opens the Battery SoH modal). These tiles have no per-function simulated
// behavior to speak of, so "performing" one just confirms + logs it — same "believable outcome,
// not a full wizard" scope call as the rest of this restructuring (see PROGRESS.md).
window.runVehicleTask = function (id, label, iconName) {
  logLiveEvent(iconName, label, 'success', 'Completed');
  if (window.AutocomNotifications) {
    window.AutocomNotifications.push('task', label + ' completed', 'Logged to this session’s event history.');
  }
};

const page = document.querySelector('.diagnostics-dashboard-page');
const tabs = document.querySelector('[data-diagnostics-tabs]');
const scanBtn = document.querySelector('[data-scan-btn]');
const stopBtn = document.querySelector('[data-stop-btn]');
const filterControls = document.querySelector('[data-filter-controls]');
const errorsOnlyToggle = document.querySelector('[data-errors-only-toggle]');
const errorCountBadge = document.querySelector('[data-error-count]');
const clearDtcsBtn = document.querySelector('[data-clear-dtcs-btn]');
// Renamed from systems-search-input: this box no longer filters the Systems list — per Autocom
// feedback it's now a Functions search (see initFunctionsSearch below), scoped to Demo systems
// since that's the only content it can honestly search (functions-library.js's curated islands).
const functionsSearchInput = document.getElementById('functions-search-input');

// Health gauge elements (main dashboard gauge only; overlay has its own in #scan-complete-gauge)
const gauge = document.querySelector('[data-health-gauge-wrapper] .health-gauge');
const gaugeSvg = gauge ? gauge.querySelector('.health-gauge-svg') : null;
const gaugeProgress = gauge ? gauge.querySelector('.health-gauge-progress') : null;
const gaugeSegments = gauge ? gauge.querySelector('.health-gauge-segments') : null;
const gaugeValue = gauge ? gauge.querySelector('.health-gauge-value') : null;
const gaugeLabel = gauge ? gauge.querySelector('.health-gauge-label') : null;

// Throttle gauge elements
const throttleGauge = document.querySelector('.throttle-gauge');
const throttleNeedle = throttleGauge ? throttleGauge.querySelector('.throttle-gauge-needle') : null;

// Scan effect overlay
const scanEffect = document.querySelector('[data-scan-effect]');
const vciStatusBadge = document.getElementById('vci-status-indicator-badge');

// Scan complete overlay (hero moment)
const scanCompleteDialog = document.getElementById('scan-complete-dialog');
const scanCompleteWarningsEl = document.querySelector('[data-scan-complete-warnings]');
const scanCompleteWarningsSuffixEl = document.querySelector('[data-scan-complete-warnings-suffix]');
const scanCompleteErrorsEl = document.querySelector('[data-scan-complete-errors]');
const scanCompleteErrorsSuffixEl = document.querySelector('[data-scan-complete-errors-suffix]');
const scanCompleteBox = document.querySelector('[data-scan-complete-close]');

// System selection elements
const scanCountEl = document.querySelector('[data-scan-count]');
const systemListWrapper = document.querySelector('[data-system-list-wrapper]');
const systemCheckboxes = document.querySelectorAll('.system-select-checkbox');
const masterCheckbox = document.querySelector('.system-master-checkbox');
const masterCheckboxLabel = document.getElementById('system-master-checkbox-label');
const collapseList = document.querySelector('.collapse-list');
let customModeActive = false;

if (!tabs || !page) return;

// Sample DTC codes for demo
const sampleDtcCodes = [
  'P0301', 'P0302', 'P0420', 'P0171', 'P0174', 'P0300', 'P0455', 'P0442',
  'B1234', 'B1001', 'B0100', 'C0035', 'C0040', 'C0050', 'U0100', 'U0121'
];

function getRandomDtcCodes(count) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(sampleDtcCodes[Math.floor(Math.random() * sampleDtcCodes.length)]);
  }
  return codes;
}

// AutocomDtcLibrary (dtc-library.js) is scoped by vehicle type first, then systemId — Cars and
// Trucks can both have an "engine" systemId that means a different real system, so they don't
// share one lookup table (see dtc-library.js's header comment).
function getDtcLibraryForVehicleType() {
  const library = window.AutocomDtcLibrary || {};
  return library[isTrucksMode ? 'trucks' : 'cars'] || {};
}

// Systems with curated content in AutocomDtcLibrary (dtc-library.js) surface those real,
// deterministic codes instead of the random sample above — see dtc-detail-modal.njk for why.
function getDtcCodesForSystem(nodeId, count) {
  const libraryEntries = getDtcLibraryForVehicleType()[nodeId] || [];
  if (libraryEntries.length > 0) {
    return libraryEntries.map(function (entry) { return entry.code; });
  }
  return getRandomDtcCodes(count);
}

// Curated systems (ones with real drill-down content in AutocomDtcLibrary) get a deterministic
// "appears every other scan, once it first appears" pattern instead of a fresh coin flip each
// scan — built for trade-show demos, so a demonstrator can run one scan showing a fault + AI Assist
// explanation, then a follow-up scan showing it resolved, reliably. Systems with no curated
// content (most of them) keep the original random 80/15/5 roll below, unchanged — there's no
// drill-down story to walk through for those, so predictable alternation wouldn't add anything
// and would just look repetitive over several demo runs.
function getScanCount() {
  return parseInt(localStorage.getItem('automechanika-scan-count') || '0', 10);
}

function isCuratedSystem(nodeId) {
  const entries = getDtcLibraryForVehicleType()[nodeId];
  return !!(entries && entries.length > 0);
}

function shouldCuratedSystemFail(nodeId, scanCount) {
  const key = 'automechanika-fault-parity-' + nodeId;
  const storedParity = localStorage.getItem(key);
  if (storedParity !== null) {
    return (scanCount % 2) === parseInt(storedParity, 10);
  }
  // Parity not decided yet: this scan is a coin flip. If it fails, lock in this scan's parity
  // so future scans alternate predictably from here on.
  if (Math.random() < 0.5) {
    localStorage.setItem(key, String(scanCount % 2));
    return true;
  }
  return false;
}

// ===== Health Gauge API =====

// Get gauge geometry from CSS variables (optional gauge element, default main gauge)
function getGaugeGeometry(gaugeEl) {
  const el = gaugeEl || gauge;
  if (!el) return null;
  const style = getComputedStyle(el);
  return {
    size: parseFloat(style.getPropertyValue('--gauge-size')),
    thickness: parseFloat(style.getPropertyValue('--gauge-thickness')),
    radius: parseFloat(style.getPropertyValue('--gauge-radius')),
    circumference: parseFloat(style.getPropertyValue('--gauge-circumference')),
    arcLength: parseFloat(style.getPropertyValue('--gauge-arc-length'))
  };
}

// Set any gauge element to result mode (score + segments with stagger). Used for main gauge and overlay gauge.
// labelOpt: optional; if omitted, "Health score". Pass "" to hide label (e.g. overlay).
function setGaugeResult(gaugeEl, score, segments, labelOpt) {
  if (!gaugeEl) return;
  const geo = getGaugeGeometry(gaugeEl);
  if (!geo) return;

  const gaugeProgressEl = gaugeEl.querySelector('.health-gauge-progress');
  const gaugeSegmentsEl = gaugeEl.querySelector('.health-gauge-segments');
  const gaugeValueEl = gaugeEl.querySelector('.health-gauge-value');
  const gaugeLabelEl = gaugeEl.querySelector('.health-gauge-label');
  const gaugeSvgEl = gaugeEl.querySelector('.health-gauge-svg');

  gaugeEl.dataset.state = 'result';
  gaugeEl.dataset.health = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'error';

  if (gaugeProgressEl) gaugeProgressEl.style.strokeDasharray = '0 9999';

  if (gaugeSegmentsEl) {
    gaugeSegmentsEl.innerHTML = '';
    const center = geo.size / 2;
    let currentOffset = 0;
    const segmentStaggerMs = 200;
    segments.forEach(function (seg, i) {
      if (seg.value <= 0) return;
      const segmentArc = (seg.value / 100) * geo.arcLength;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'health-gauge-segment');
      circle.setAttribute('data-color', seg.color);
      circle.setAttribute('cx', center);
      circle.setAttribute('cy', center);
      circle.setAttribute('r', geo.radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke-width', geo.thickness);
      circle.setAttribute('stroke-linecap', i === segments.length - 1 ? 'round' : 'butt');
      circle.setAttribute('transform', 'rotate(135 ' + center + ' ' + center + ')');
      circle.style.strokeDasharray = '0 ' + geo.circumference;
      circle.style.strokeDashoffset = '-' + currentOffset;
      gaugeSegmentsEl.appendChild(circle);
      const offset = currentOffset;
      currentOffset += segmentArc;
      setTimeout(function () {
        circle.style.strokeDasharray = segmentArc + ' ' + geo.circumference;
        circle.style.strokeDashoffset = '-' + offset;
      }, i * segmentStaggerMs);
    });
  }
  if (gaugeValueEl) gaugeValueEl.textContent = Math.round(score);
  if (gaugeLabelEl) gaugeLabelEl.textContent = labelOpt !== undefined ? labelOpt : 'Health score';
  if (gaugeSvgEl) gaugeSvgEl.setAttribute('aria-valuenow', Math.round(score));
}

// Reset gauge to idle state
function healthGaugeReset() {
  if (!gauge) return;
  gauge.dataset.state = 'idle';
  gauge.removeAttribute('data-health');
  if (gaugeProgress) {
    gaugeProgress.style.strokeDasharray = '0 9999';
  }
  if (gaugeSegments) {
    gaugeSegments.innerHTML = '';
  }
  if (gaugeValue) {
    gaugeValue.textContent = 'READY';
  }
  if (gaugeLabel) {
    gaugeLabel.textContent = '';
  }
  if (gaugeSvg) {
    gaugeSvg.setAttribute('aria-valuenow', '0');
  }
}

// Set gauge to scanning mode with progress 0-100
function healthGaugeSetProgress(value) {
  if (!gauge) return;
  const geo = getGaugeGeometry();
  if (!geo) return;
  
  gauge.dataset.state = 'scanning';
  gauge.removeAttribute('data-health');
  
  // Calculate progress arc length
  const progress = Math.max(0, Math.min(100, value));
  const progressArc = (progress / 100) * geo.arcLength;
  
  if (gaugeProgress) {
    gaugeProgress.style.strokeDasharray = `${progressArc} ${geo.circumference}`;
  }
  if (gaugeSegments) {
    gaugeSegments.innerHTML = '';
  }
  if (gaugeValue) {
    gaugeValue.textContent = `${Math.round(progress)}%`;
  }
  if (gaugeLabel) {
    gaugeLabel.textContent = 'Scanning';
  }
  if (gaugeSvg) {
    gaugeSvg.setAttribute('aria-valuenow', Math.round(progress));
  }
}

// Set gauge to result mode with health score and segments (uses main dashboard gauge)
// segments = [{ value: 80, color: 'success' }, { value: 15, color: 'warning' }, { value: 5, color: 'error' }]
function healthGaugeSetResult(score, segments) {
  setGaugeResult(gauge, score, segments);
  if (gaugeLabel) gaugeLabel.textContent = 'Scan Health Score';
}

// ===== VCI connection status + live scan progress =====
// Scan progress lives inside the VCI status row itself now (status-badge-row.njk, Launchpad 2's
// diagnostics dashboard only — vciProgressBar is null on Launchpad 1, so these no-op there via
// the null checks, same defensive pattern as the rest of this shared script): the badge shows a
// live percentage instead of "IN PROCESS" while scanning, plus a thin bottom progress bar. No
// numeric score is shown on completion (dropped per usability research); it just reverts to
// "READY".
const vciProgressBar = document.getElementById('vci-status-indicator-progress-bar');
let vciUnstableActive = false;
let lastScanProgress = 0;

function vciConnectionSetScanning(value) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  lastScanProgress = v;
  if (vciProgressBar) vciProgressBar.style.width = v + '%';
  // Don't clobber the "UNSTABLE" badge text/color while the connection wobble is showing —
  // the bar keeps advancing underneath, the badge resumes showing % once it recovers.
  if (vciUnstableActive) return;
  if (vciStatusBadge) {
    vciStatusBadge.textContent = v + '%';
    vciStatusBadge.className = 'badge badge-success badge-sm shrink-0';
  }
}

function vciConnectionSetReady() {
  lastScanProgress = 0;
  vciUnstableActive = false;
  if (vciProgressBar) vciProgressBar.style.width = '0%';
  if (vciStatusBadge) {
    vciStatusBadge.textContent = 'READY';
    vciStatusBadge.className = 'badge badge-info badge-sm shrink-0';
  }
}

// Show scan-complete overlay (hero moment). Auto-dismiss 3s, tap to close.
// healthScore is unused here (the overlay no longer shows a health-score gauge — dropped per
// usability research finding it wasn't valued); kept as a param so callers still computing it
// for the main dashboard gauge don't need to change their call site.
function showScanCompleteOverlay(healthScore, scanResults) {
  if (!scanCompleteDialog) return;

  const w = scanResults.warning || 0;
  const e = scanResults.error || 0;
  if (scanCompleteWarningsEl) scanCompleteWarningsEl.textContent = String(w);
  if (scanCompleteWarningsSuffixEl) scanCompleteWarningsSuffixEl.textContent = w === 1 ? 'Warning DTC' : 'Warning DTCs';
  if (scanCompleteErrorsEl) scanCompleteErrorsEl.textContent = String(e);
  if (scanCompleteErrorsSuffixEl) scanCompleteErrorsSuffixEl.textContent = e === 1 ? 'Critical DTC' : 'Critical DTCs';

  scanCompleteDialog.showModal();

  let autoCloseId = null;
  function closeOverlay() {
    scanCompleteDialog.close();
  }
  function cleanup() {
    if (autoCloseId) clearTimeout(autoCloseId);
    scanCompleteDialog.removeEventListener('click', closeOverlay);
    scanCompleteDialog.removeEventListener('close', cleanup);
    if (typeof window.onboardingFireConfettiFromFinishButton === 'function') {
      window.onboardingFireConfettiFromFinishButton();
    }
  }

  autoCloseId = setTimeout(closeOverlay, 3000);
  scanCompleteDialog.addEventListener('click', closeOverlay);
  scanCompleteDialog.addEventListener('close', cleanup);
}

// ===== Throttle Gauge API =====

let throttleAnimationId = null;
let throttleStartTime = 0;

// Reset throttle gauge to idle and stop animation
function throttleGaugeReset() {
  if (throttleAnimationId) {
    cancelAnimationFrame(throttleAnimationId);
    throttleAnimationId = null;
  }
  if (!throttleGauge) return;
  throttleGauge.dataset.state = 'idle';
  if (throttleNeedle) {
    const size = parseFloat(getComputedStyle(throttleGauge).getPropertyValue('--throttle-size')) || 40;
    const center = size / 2;
    throttleNeedle.setAttribute('transform', `rotate(-135 ${center} ${center})`);
  }
}

// Set throttle gauge value (0-100) - updates needle position
function throttleGaugeSetValue(value) {
  if (!throttleGauge || !throttleNeedle) return;
  throttleGauge.dataset.state = 'scanning';
  
  const size = parseFloat(getComputedStyle(throttleGauge).getPropertyValue('--throttle-size')) || 40;
  const center = size / 2;
  
  // Map 0-100 to -135 to +135 degrees (270 degree arc)
  const angle = -135 + (Math.max(0, Math.min(100, value)) / 100) * 270;
  throttleNeedle.setAttribute('transform', `rotate(${angle} ${center} ${center})`);
}

// Start continuous throttle animation (smooth wave pattern)
function throttleGaugeStartAnimation() {
  if (throttleAnimationId) return; // Already running
  throttleStartTime = performance.now();
  
  function animate(currentTime) {
    const elapsed = (currentTime - throttleStartTime) / 1000; // seconds
    
    // Create smooth oscillating pattern:
    // - Primary wave: slow oscillation (period ~3s)
    // - Secondary wave: faster ripple (period ~0.8s)  
    // - Base level around 60%, oscillates between ~30% and ~95%
    const primaryWave = Math.sin(elapsed * 2.1) * 0.3;
    const secondaryWave = Math.sin(elapsed * 7.8) * 0.08;
    const value = 60 + (primaryWave + secondaryWave) * 100;
    
    throttleGaugeSetValue(Math.max(20, Math.min(95, value)));
    throttleAnimationId = requestAnimationFrame(animate);
  }
  
  throttleAnimationId = requestAnimationFrame(animate);
}

// Stop throttle animation
function throttleGaugeStopAnimation() {
  throttleGaugeReset();
}

// Initialize throttle gauge on page load
throttleGaugeReset();

// ===== System Selection Management =====

// Update selection count display
function updateSelectionCount() {
  const allItems = document.querySelectorAll('.system-list-item');
  const selectedItems = document.querySelectorAll('.system-list-item[data-selected="true"]');
  const total = allItems.length;
  const selected = selectedItems.length;
  
  if (scanCountEl) {
    scanCountEl.textContent = selected === total ? 'all' : selected;
  }
}

// Toggle system selection
function toggleSystemSelection(systemItem, checked) {
  systemItem.dataset.selected = checked ? 'true' : 'false';
  const checkbox = systemItem.querySelector('.system-select-checkbox');
  if (checkbox) checkbox.checked = checked;
  updateSelectionCount();
}

// Enable/disable custom mode (checkboxes editable)
function setCustomMode(enabled) {
  customModeActive = enabled;
  if (systemListWrapper) {
    systemListWrapper.dataset.customMode = enabled ? 'true' : 'false';
  }
  if (enabled && masterCheckbox) {
    updateMasterCheckboxState();
  }
}

// Sync master checkbox to checked / indeterminate / unchecked based on item checkboxes
function updateMasterCheckboxState() {
  if (!masterCheckbox || !systemCheckboxes.length) return;
  const checkedCount = Array.from(systemCheckboxes).filter(cb => cb.checked).length;
  if (checkedCount === 0) {
    masterCheckbox.checked = false;
    masterCheckbox.indeterminate = false;
  } else if (checkedCount === systemCheckboxes.length) {
    masterCheckbox.checked = true;
    masterCheckbox.indeterminate = false;
  } else {
    masterCheckbox.checked = false;
    masterCheckbox.indeterminate = true;
  }
  updateMasterCheckboxLabel();
}

function updateMasterCheckboxLabel() {
  if (!masterCheckboxLabel || !masterCheckbox) return;
  masterCheckboxLabel.textContent = masterCheckbox.checked ? 'Unselect all systems' : 'Select all systems';
}

// Custom toggle (sticky footer, next to Scan): replaces the old group-preset filter bar
// (All/Powertrain/Safety/Body/Comfort/Custom), which stopped making sense once systems became 15
// real, individually-named ECUs instead of a handful of broad categories. Toggling ON reveals
// checkboxes at both LV1 and LV2 and starts every ECU deselected — with up to 28 functional groups
// under one ECU (CEM), "start full and uncheck what you don't want" would be far more clicks than
// "start empty and check the few things you do" for the realistic case of picking 2-3 ECUs to
// scan. Toggling OFF always resets to "everything selected" (i.e. off = scan everything, same as
// this page's default before Custom exists at all) rather than remembering a partial pick.
const customToggleBtn = document.querySelector('[data-custom-toggle-btn]');
function setAllSystemsSelected(selected) {
  document.querySelectorAll('.system-list-item').forEach(item => toggleSystemSelection(item, selected));
  document.querySelectorAll('.subsystem-select-checkbox').forEach(cb => { cb.checked = false; });
}
if (customToggleBtn) {
  customToggleBtn.addEventListener('click', () => {
    const enabling = !customModeActive;
    // Selection state must land before setCustomMode() runs — it syncs the master "select
    // all"/"unselect all" checkbox from the row checkboxes' current state, so doing this in the
    // other order made it briefly show stale state (checked/"Unselect all" right as everything
    // was actually being cleared to deselected).
    setAllSystemsSelected(!enabling);
    setCustomMode(enabling);
    customToggleBtn.classList.toggle('btn-primary', enabling);
    customToggleBtn.classList.toggle('btn-outline', !enabling);
    customToggleBtn.setAttribute('aria-pressed', String(enabling));
  });
}

// A functional-group (LV2) checkbox implies its parent ECU should be scanned — a real OBD scan
// reads a whole ECU's fault memory at once, there's no such thing as scanning just one function
// within it, so checking any of an ECU's functional groups is really shorthand for checking that
// ECU. One-directional on purpose (unchecking a functional group does not auto-uncheck the
// parent): the parent might still be wanted for its own sake or for another checked group under
// it, and inferring "should the parent come off too" would need real tri-state tracking for very
// little benefit here.
document.addEventListener('change', (e) => {
  const cb = e.target.closest('.subsystem-select-checkbox');
  if (!cb || !cb.checked) return;
  const lv2Panel = cb.closest('[data-lv2-panel]');
  if (!lv2Panel) return;
  const parentRow = document.querySelector(`.system-list-item[data-system-id="${lv2Panel.dataset.lv2Panel}"]`);
  if (parentRow) toggleSystemSelection(parentRow, true);
});

// Handle individual checkbox changes
systemCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Only allow changes in custom mode
    if (!customModeActive) {
      e.preventDefault();
      return;
    }
  });
  
  checkbox.addEventListener('change', (e) => {
    // Only process changes in custom mode
    if (!customModeActive) {
      // Revert the checkbox state
      e.target.checked = e.target.closest('.system-list-item')?.dataset.selected === 'true';
      return;
    }
    
    const systemItem = e.target.closest('.system-list-item');
    if (systemItem) {
      systemItem.dataset.selected = e.target.checked ? 'true' : 'false';
      updateSelectionCount();
      updateMasterCheckboxState();
    }
  });
});

// Master checkbox: select all / deselect all
if (masterCheckbox) {
  masterCheckbox.addEventListener('change', () => {
    if (!customModeActive) return;
    const allItems = document.querySelectorAll('.system-list-item');
    allItems.forEach(item => toggleSystemSelection(item, masterCheckbox.checked));
    updateSelectionCount();
    updateMasterCheckboxLabel();
  });
}

// Initialize selection count
updateSelectionCount();

// ===== Systems list: LV1 <-> LV2 drill-down =====
// Replaces the old accordion-per-row interaction (see collapse-list.njk's header comment): LV1
// (the flat ECU/category list) and LV2 (one item's functional groups/subsystems) are two sibling
// panels, only one visible at a time, swapped by JS rather than DaisyUI collapse state.
const lv1List = document.querySelector('[data-lv1-list]');

function showLv1() {
  if (lv1List) lv1List.classList.remove('hidden');
  document.querySelectorAll('[data-lv2-panel]').forEach(p => { p.classList.add('hidden'); p.classList.remove('flex'); });
  if (filterControls) filterControls.classList.toggle('hidden', errorCountBadge && errorCountBadge.textContent === '0');
  if (systemListWrapper) delete systemListWrapper.dataset.drillMode;
}

function showLv2(systemId) {
  const panel = document.querySelector(`[data-lv2-panel="${systemId}"]`);
  if (!panel) return;
  if (lv1List) lv1List.classList.add('hidden');
  document.querySelectorAll('[data-lv2-panel]').forEach(p => { p.classList.add('hidden'); p.classList.remove('flex'); });
  panel.classList.remove('hidden');
  panel.classList.add('flex');
  if (filterControls) filterControls.classList.add('hidden');
  if (systemListWrapper) systemListWrapper.dataset.drillMode = 'lv2';
}

if (lv1List) {
  lv1List.addEventListener('click', (e) => {
    if (e.target.closest('.system-select-checkbox')) return;
    const row = e.target.closest('.system-list-item[data-system-id]');
    if (!row) return;
    showLv2(row.dataset.systemId);
  });
}
document.querySelectorAll('[data-lv2-back]').forEach(btn => btn.addEventListener('click', showLv1));

// ecu-detail.njk's back arrow is a true "back" (LV3 -> LV2), not a reset to the top of the list —
// it keeps `systemId` in the URL when returning here specifically so this page knows which ECU's
// functional-group view to reopen, instead of always landing back on LV1.
const drillToSystemId = urlParams.get('systemId');
if (drillToSystemId) {
  showLv2(drillToSystemId);
  urlParams.delete('systemId');
  const cleanUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
  window.history.replaceState(null, '', cleanUrl);
}

// ===== Systems list: group accordion (Automechanika only — see collapse-list.njk's
// groupedList() macro) =====
// Replaces the LV1<->LV2 panel-swap above for this markup only: launchpad-1/2 still render the
// older `list()` macro (data-lv1-list, data-lv2-panel) and keep using showLv1/showLv2 untouched.
// This markup instead has a fixed accordion of groups (data-group-toggle/data-group-panel, one per
// diagnosticSystemGroups.js entry) — each expands/collapses independently in place — and every
// `.system-list-item` row inside is a direct link to its own detail page (ecu-detail.njk), matching
// the real app's own two-tap interaction (tap group -> tap real module) confirmed against Vedran's
// Figma mockups. No LV2 panel exists in this markup: a system's `functionalGroups` (if any) are
// that detail page's own content now, not a second list level here.
const groupAccordionList = document.querySelector('[data-group-accordion-list]');
if (groupAccordionList) {
  const setGroupExpanded = (groupId, expanded) => {
    const panel = groupAccordionList.querySelector(`[data-group-panel="${groupId}"]`);
    const header = groupAccordionList.querySelector(`[data-group-toggle="${groupId}"]`);
    const chevron = groupAccordionList.querySelector(`[data-group-chevron="${groupId}"] svg`);
    if (panel) panel.classList.toggle('hidden', !expanded);
    if (header) header.setAttribute('aria-expanded', String(expanded));
    if (chevron) chevron.classList.toggle('-rotate-90', !expanded);
  };

  groupAccordionList.addEventListener('click', (e) => {
    if (e.target.closest('.system-select-checkbox')) return;

    const header = e.target.closest('[data-group-toggle]');
    if (header) {
      setGroupExpanded(header.dataset.groupToggle, header.getAttribute('aria-expanded') !== 'true');
      return;
    }

    // A system row's own click navigates straight to its detail page — same vehicle-context params
    // this page was loaded with, same URL this app already builds elsewhere (see the old
    // subsystem-item handler below, kept for launchpad-1/2).
    const row = e.target.closest('.system-list-item[data-system-id]');
    if (!row) return;
    const ecuParams = new URLSearchParams(window.location.search);
    ecuParams.set('systemId', row.dataset.systemId);
    ecuParams.delete('subsystemId');
    window.location.href = getBasePath() + 'diagnostics-platform/ecu-detail/?' + ecuParams.toString();
  });

  // Returning from ecu-detail.njk's back arrow: re-expand the group the system we came from
  // belongs to, rather than landing back with everything collapsed.
  if (drillToSystemId) {
    const row = groupAccordionList.querySelector(`.system-list-item[data-system-id="${drillToSystemId}"]`);
    const panel = row && row.closest('[data-group-panel]');
    if (panel) {
      setGroupExpanded(panel.dataset.groupPanel, true);
      panel.scrollIntoView({ block: 'nearest' });
    }
  }

  // "Only errors" hides non-matching `.system-list-item` rows (existing logic below, unchanged) —
  // without this, a match inside a collapsed group would be invisible with no signal anything
  // matched at all. While active, auto-expand groups with a visible match and collapse groups
  // without one; clearing the filter resets every group back to collapsed. Search used to
  // participate here too, before it became the Functions search below (functionsSearchInput no
  // longer touches the Systems list at all).
  const syncGroupAccordionToFilters = () => {
    const filterActive = errorsOnlyToggle && errorsOnlyToggle.checked;
    groupAccordionList.querySelectorAll('[data-group-panel]').forEach((panel) => {
      if (!filterActive) { setGroupExpanded(panel.dataset.groupPanel, false); return; }
      const hasVisibleMatch = Array.from(panel.querySelectorAll('.system-list-item')).some((row) => !row.classList.contains('hidden'));
      setGroupExpanded(panel.dataset.groupPanel, hasVisibleMatch);
    });
  };
  if (errorsOnlyToggle) errorsOnlyToggle.addEventListener('change', syncGroupAccordionToFilters);
}

// Tab switching
tabs.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (!tab) return;
  
  tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
  tab.classList.add('tab-active');
  
  const tabName = tab.dataset.tab;
  if (tabName === 'topology') {
    page.dataset.view = 'topology';
  } else {
    page.dataset.view = 'default';
  }
  // Leaving/returning to the Systems list shouldn't strand it drilled into whatever ECU was open
  // before — reset to LV1 on every tab switch (a no-op if already there).
  showLv1();
  applySystemsListFilters();
});

// Scan button demo (toggle scan/stop)
if (scanBtn && stopBtn) {
  scanBtn.addEventListener('click', () => {
    scanBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    if (filterControls) filterControls.classList.add('hidden');
    startScanDemo();
  });
  
  stopBtn.addEventListener('click', () => {
    stopBtn.classList.add('hidden');
    scanBtn.classList.remove('hidden');
    stopScanDemo();
  });
}

// Clear DTCs button — this is the dashboard's real "erase fault codes" action, matching the
// EVENT_TEMPLATES entry of the same name in garageVehiclesCars.js/-Trucks.js.
if (clearDtcsBtn) {
  clearDtcsBtn.addEventListener('click', () => {
    // Set all topology nodes with errors/warnings to 'cleared' state
    document.querySelectorAll('.topology-node[data-node-id]').forEach(n => {
      if (n.dataset.state === 'error' || n.dataset.state === 'warning') {
        n.dataset.state = 'cleared';
      }
    });
    // Set all system list items with errors/warnings to 'cleared' state, counting how many
    // actually had DTCs to erase so the logged event reflects real work done, not a no-op click.
    let erasedCount = 0;
    document.querySelectorAll('.system-list-item[data-system-id]').forEach(item => {
      if (item.dataset.state === 'error' || item.dataset.state === 'warning') {
        erasedCount++;
        syncSystemListItem(item.dataset.systemId, 'cleared', []);
      }
    });
    updateFilterControls();
    applySystemsListFilters();
    if (erasedCount > 0) {
      logLiveEvent('alert-octagon', 'Erase fault codes', 'error', erasedCount + ' DTC erased');
    }
  });
}

// Errors only toggle: in Systems list view hide non-error items (like presets); in Topology view dim nodes
// Was applyErrorsFilter, then briefly took on the systems-search filter too — search moved on to
// become the Functions search (initFunctionsSearch below) and no longer touches these rows, so
// this is back to being errors-only again.
function applySystemsListFilters() {
  const showErrorsOnly = errorsOnlyToggle ? errorsOnlyToggle.checked : false;
  const isSystemsListView = page && page.dataset.view !== 'topology';

  // Topology nodes: dim when errors-only.
  document.querySelectorAll('.topology-node[data-node-id]').forEach(n => {
    const state = n.dataset.state;
    const hasIssue = state === 'error' || state === 'warning';
    if (showErrorsOnly && !hasIssue) {
      n.style.opacity = '0.25';
      n.style.pointerEvents = 'none';
    } else {
      n.style.opacity = '';
      n.style.pointerEvents = '';
    }
  });

  // System list items: errors-only hides (Systems list view) or dims (Topology view) non-issue rows.
  document.querySelectorAll('.system-list-item[data-system-id]').forEach(item => {
    const state = item.dataset.state;
    const hasIssue = state === 'error' || state === 'warning';

    if (!showErrorsOnly) {
      item.style.opacity = '';
      item.style.pointerEvents = '';
      item.classList.remove('hidden');
      return;
    }
    if (isSystemsListView) {
      if (hasIssue) {
        item.classList.remove('hidden');
        item.style.opacity = '';
        item.style.pointerEvents = '';
      } else {
        item.classList.add('hidden');
      }
    } else {
      if (hasIssue) {
        item.style.opacity = '';
        item.style.pointerEvents = '';
        item.classList.remove('hidden');
      } else {
        item.style.opacity = '0.25';
        item.style.pointerEvents = 'none';
        item.classList.remove('hidden');
      }
    }
  });

  // Bus-group headers (collapse-list.njk): hide any left with zero visible rows underneath —
  // same "hide empty group header" pattern garage.js already uses for its own search filter.
  document.querySelectorAll('.collapse-list-bus-header').forEach(header => {
    let sibling = header.nextElementSibling;
    let hasVisibleRow = false;
    while (sibling && !sibling.classList.contains('collapse-list-bus-header')) {
      if (!sibling.classList.contains('hidden')) hasVisibleRow = true;
      sibling = sibling.nextElementSibling;
    }
    header.classList.toggle('hidden', !hasVisibleRow);
  });
}

if (errorsOnlyToggle) {
  errorsOnlyToggle.addEventListener('change', applySystemsListFilters);
}

// Update filter controls visibility based on scan results
function updateFilterControls() {
  // Count issues from system list items (primary source for user-facing count)
  const systemItems = document.querySelectorAll('.system-list-item[data-system-id]');
  let errorCount = 0;
  let warningCount = 0;
  
  systemItems.forEach(item => {
    if (item.dataset.state === 'error') errorCount++;
    if (item.dataset.state === 'warning') warningCount++;
  });
  
  const totalIssues = errorCount + warningCount;
  
  if (filterControls && errorCountBadge) {
    if (totalIssues > 0) {
      filterControls.classList.remove('hidden');
      errorCountBadge.textContent = totalIssues;
    } else {
      filterControls.classList.add('hidden');
      if (errorsOnlyToggle) errorsOnlyToggle.checked = false;
    }
  }
}

// Group accordion progress (see collapse-list.njk's groupedList() macro): while a group is
// collapsed its leaf rows' own spinners/checkmarks are invisible, so a scan in progress can look
// like nothing is happening. Spinner while any of the group's systems is still 'scanning';
// otherwise an "n/total" badge for how many have reached a result, once at least one has — reset
// (hidden) once every system is back to 'pending' (a fresh scan start, or resetSystemList()).
function updateGroupProgress(nodeId) {
  const row = document.querySelector(`.system-list-item[data-system-id="${nodeId}"]`);
  const panel = row && row.closest('[data-group-panel]');
  if (!panel) return;
  const groupId = panel.dataset.groupPanel;
  const rows = panel.querySelectorAll('.system-list-item[data-system-id]');
  const total = rows.length;
  const scanning = Array.from(rows).some((r) => r.dataset.state === 'scanning');
  const done = Array.from(rows).filter((r) => r.dataset.state && r.dataset.state !== 'pending' && r.dataset.state !== 'scanning').length;
  const errorCount = Array.from(rows).filter((r) => r.dataset.state === 'error').length;
  const warningCount = Array.from(rows).filter((r) => r.dataset.state === 'warning').length;
  const issueCount = errorCount + warningCount;

  const wrap = document.querySelector(`[data-group-progress="${groupId}"]`);
  if (!wrap) return;
  const spinnerEl = wrap.querySelector('[data-group-progress-spinner]');
  const issueEl = wrap.querySelector('[data-group-issue-count]');
  const fractionEl = wrap.querySelector('[data-group-progress-fraction]');
  if (spinnerEl) spinnerEl.classList.toggle('hidden', !scanning);
  if (issueEl) {
    const show = !scanning && issueCount > 0;
    issueEl.classList.toggle('hidden', !show);
    if (show) {
      issueEl.textContent = String(issueCount);
      issueEl.className = 'badge badge-sm ' + (errorCount > 0 ? 'badge-error' : 'badge-warning');
    }
  }
  if (fractionEl) {
    const show = !scanning && done > 0;
    fractionEl.classList.toggle('hidden', !show);
    if (show) fractionEl.textContent = `${done}/${total}`;
  }
}

// Sync system list item state with topology node
function syncSystemListItem(nodeId, state, dtcCodes) {
  const systemItem = document.querySelector(`.system-list-item[data-system-id="${nodeId}"]`);
  if (!systemItem) return;

  systemItem.dataset.state = state;
  updateGroupProgress(nodeId);
  persistNodeScanState(nodeId, state, dtcCodes);

  // Get status indicator elements
  const spinner = systemItem.querySelector('.system-status-spinner');
  const okIcon = systemItem.querySelector('.system-status-ok');
  const warningIcon = systemItem.querySelector('.system-status-warning');
  const errorIcon = systemItem.querySelector('.system-status-error');
  const clearedIcon = systemItem.querySelector('.system-status-cleared');
  const badges = systemItem.querySelector('.system-status-badges');
  
  // Hide all first
  [spinner, okIcon, warningIcon, errorIcon, clearedIcon, badges].forEach(el => {
    if (el) el.classList.add('hidden');
  });
  
  // Show appropriate indicator based on state
  switch (state) {
    case 'scanning':
      if (spinner) spinner.classList.remove('hidden');
      break;
    case 'ok':
      if (okIcon) okIcon.classList.remove('hidden');
      break;
    case 'warning':
      if (warningIcon) warningIcon.classList.remove('hidden');
      if (badges && dtcCodes.length > 0) {
        badges.classList.remove('hidden');
        renderDtcBadges(badges, dtcCodes, 'warning', nodeId);
      }
      break;
    case 'error':
      if (errorIcon) errorIcon.classList.remove('hidden');
      if (badges && dtcCodes.length > 0) {
        badges.classList.remove('hidden');
        renderDtcBadges(badges, dtcCodes, 'error', nodeId);
      }
      break;
    case 'cleared':
      if (clearedIcon) clearedIcon.classList.remove('hidden');
      break;
    case 'pending':
    default:
      // No indicator for pending
      break;
  }
  
  // Update the LV2 panel's functional-group/subsystem rows for this ECU
  syncSubsystemItems(nodeId, state, dtcCodes);
}

// Highlights the specific functional-group row a DTC actually belongs to (dtc-library.js's
// `functionalGroupId`, real only for the two curated codes) — no more random assignment across
// every row for codes we don't have real data about, which invented a precision the app doesn't
// have (see PROGRESS.md's real-ECU restructuring notes). Rows live in the LV2 drill-down panel
// now, not nested inside the LV1 row (see collapse-list.njk), so this looks the panel up by nodeId
// directly rather than being handed the LV1 element.
function syncSubsystemItems(nodeId, parentState, dtcCodes) {
  const panel = document.querySelector(`[data-lv2-panel="${nodeId}"]`);
  if (!panel) return;
  const subsystems = panel.querySelectorAll('.subsystem-item');
  if (subsystems.length === 0) return;

  // Reset all subsystems first
  subsystems.forEach(sub => {
    sub.removeAttribute('data-status');
    const statusEl = sub.querySelector('.subsystem-status');
    if (statusEl) statusEl.textContent = '';
  });

  if (parentState === 'warning' || parentState === 'error') {
    const libraryEntries = getDtcLibraryForVehicleType()[nodeId] || [];
    dtcCodes.forEach(function (code) {
      const entry = libraryEntries.find(function (e) { return e.code === code; });
      if (!entry || !entry.functionalGroupId) return;
      const row = panel.querySelector(`.subsystem-item[data-subsystem="${entry.functionalGroupId}"]`);
      if (!row) return;
      row.dataset.status = parentState;
      const statusEl = row.querySelector('.subsystem-status');
      if (statusEl) statusEl.textContent = code;
    });
  }
}

// Every LV2 row (functional group / legacy subsystem, see collapse-list.njk) is a real link to
// its ECU detail page (ecu-detail.njk), carrying the same vehicle-context params this page was
// loaded with. `data-nav-mode="direct"` (Cars' real-ECU shape — every functional group belongs to
// the one ECU already identified by the LV2 panel's own systemId, so no further id is needed) vs
// `data-nav-mode="subsystem"` (Trucks/legacy shape — each row is treated as its own separate
// "ECU", so subsystemId is required to tell them apart). One delegated listener (rows are re-used
// across scans, only their status changes) rather than re-binding per sync.
document.querySelectorAll('.subsystem-item[data-subsystem]').forEach(function (sub) {
  sub.classList.add('subsystem-item--clickable');
});
document.addEventListener('click', function (e) {
  if (e.target.closest('.subsystem-select-checkbox')) return;
  const sub = e.target.closest('.subsystem-item[data-subsystem]');
  if (!sub) return;
  const lv2Panel = sub.closest('[data-lv2-panel]');
  if (!lv2Panel) return;
  e.stopPropagation();
  const ecuParams = new URLSearchParams(window.location.search);
  ecuParams.set('systemId', lv2Panel.dataset.lv2Panel);
  if (sub.dataset.navMode === 'subsystem') {
    ecuParams.set('subsystemId', sub.dataset.subsystem);
  } else {
    ecuParams.delete('subsystemId');
  }
  window.location.href = getBasePath() + 'diagnostics-platform/ecu-detail/?' + ecuParams.toString();
});

// Render DTC code badges. Codes backed by AutocomDtcLibrary[nodeId] (see dtc-library.js) render
// as clickable buttons opening the DTC detail modal; other codes stay plain, non-interactive badges.
function renderDtcBadges(container, codes, severity, nodeId) {
  container.innerHTML = '';
  const badgeClass = severity === 'error' ? 'badge-error' : 'badge-warning';
  const libraryCodes = new Set(
    (getDtcLibraryForVehicleType()[nodeId] || []).map(function (e) { return e.code; })
  );

  if (codes.length === 0) return;

  function makeBadge(code, extraClass) {
    const isClickable = libraryCodes.has(code) && typeof window.openDtcDetailModal === 'function';
    const el = document.createElement(isClickable ? 'button' : 'span');
    if (isClickable) {
      el.type = 'button';
      // relative z-10: collapse-arrow's invisible toggle checkbox sits at z-index:1 covering the
      // whole .collapse-title row (DaisyUI, by design) — without this, real clicks land on the
      // checkbox (toggling expand/collapse) instead of this button.
      el.className = `badge badge-sm ${extraClass} cursor-pointer relative z-10`;
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        window.openDtcDetailModal(code, nodeId);
      });
    } else {
      el.className = `badge badge-sm ${extraClass}`;
    }
    el.textContent = code;
    return el;
  }

  // First code badge
  container.appendChild(makeBadge(codes[0], badgeClass));

  // "+N more" badge if multiple codes
  if (codes.length > 1) {
    const moreBadge = document.createElement('span');
    moreBadge.className = `badge badge-sm badge-outline ${badgeClass}`;
    moreBadge.textContent = `+${codes.length - 1}`;
    container.appendChild(moreBadge);
  }
}

// Reset all system list items to pending
function resetSystemList() {
  document.querySelectorAll('.system-list-item[data-system-id]').forEach(item => {
    syncSystemListItem(item.dataset.systemId, 'pending', []);
  });
}

// Demo scan progression
let scanTimeout;
let scanResults = { ok: 0, warning: 0, error: 0 };

// Simulates a real risk research flagged: Wi-Fi/Bluetooth can fluctuate mid-scan and affect
// readings. Fires once per scan run, partway through, then recovers — same "unstable" VCI
// status badge state used by the header indicator on every page that renders it.
function triggerConnectionWobble() {
  vciUnstableActive = true;
  if (vciStatusBadge) {
    vciStatusBadge.textContent = 'UNSTABLE';
    vciStatusBadge.className = 'badge badge-warning badge-sm shrink-0';
  }
  if (window.AutocomNotifications) {
    window.AutocomNotifications.push(
      'connection',
      'Connection unstable during scan',
      'Wi-Fi/Bluetooth signal fluctuated mid-scan — some readings may be affected. Re-scan affected systems if results look off.'
    );
  }
  setTimeout(() => {
    vciUnstableActive = false;
    // Only resume if nothing else (completion/stop) has already changed the badge meanwhile.
    if (vciStatusBadge && vciStatusBadge.textContent.trim() === 'UNSTABLE') {
      vciConnectionSetScanning(lastScanProgress);
    }
  }, 1400);
}

function startScanDemo() {
  // Get all system list items and check selection state
  const allSystemItems = document.querySelectorAll('.system-list-item');
  const selectedSystems = Array.from(document.querySelectorAll('.system-list-item[data-selected="true"]'))
    .map(item => item.dataset.systemId)
    .filter(Boolean);
  
  // Check if all systems are selected
  const allSelected = selectedSystems.length === allSystemItems.length;
  
  // Get all topology nodes
  const allNodes = document.querySelectorAll('.topology-node[data-node-id]');
  let nodes;
  
  if (allSelected) {
    // When all systems selected, scan ALL topology nodes
    nodes = Array.from(allNodes);
  } else {
    // When partial selection, filter to selected systems only
    nodes = Array.from(allNodes).filter(node => {
      const nodeId = node.dataset.nodeId;
      // Always include OBD and gateway nodes, include if system is selected
      return nodeId === 'obd' || nodeId === 'gateway' || selectedSystems.includes(nodeId);
    });
  }
  
  const totalNodes = nodes.length;
  let index = 0;
  let connectionWobbleTriggered = false;

  if (totalNodes === 0 || (selectedSystems.length === 0 && !allSelected)) {
    alert('Please select at least one system to scan.');
    return;
  }
  
  // Advance the persisted scan counter once per full scan run — drives shouldCuratedSystemFail's
  // "appears every other scan" pattern below.
  const scanCount = getScanCount() + 1;
  localStorage.setItem('automechanika-scan-count', String(scanCount));

  // Reset scan results
  scanResults = { ok: 0, warning: 0, error: 0 };
  
  // Reset toggle state and clear any dimming
  if (errorsOnlyToggle) {
    errorsOnlyToggle.checked = false;
  }
  applySystemsListFilters();
  
  // Reset all nodes and system list items to pending
  allNodes.forEach(n => {
    n.dataset.state = 'pending';
  });
  resetSystemList();
  
  // Reset and start health gauge
  healthGaugeReset();
  healthGaugeSetProgress(0);

  // Start throttle gauge animation
  throttleGaugeStartAnimation();

  // Start scan effect overlay
  if (scanEffect) scanEffect.classList.add('scanning');

  // VCI status: live percentage + progress bar while scanning (Launchpad 2's merged row)
  vciConnectionSetScanning(0);

  // Set OBD to ok (always connected)
  const obd = document.querySelector('[data-node-id="obd"]');
  if (obd) obd.dataset.state = 'ok';

  function scanNext() {
    if (index >= totalNodes) {
      // Scan complete - show results
      stopBtn.classList.add('hidden');
      scanBtn.classList.remove('hidden');
      updateFilterControls();

      // VCI status: back to "Ready"
      vciConnectionSetReady();

      // Stop scan effect overlay
      if (scanEffect) scanEffect.classList.remove('scanning');

      // Notify onboarding drawer to show congratulations step if tutorial is on "Perform scan" step
      if (typeof window.onboardingAdvanceAfterScan === 'function') window.onboardingAdvanceAfterScan();

      // Calculate health score and segments
      const total = scanResults.ok + scanResults.warning + scanResults.error;
      if (total > 0) {
        // Health score: 100% if all ok, reduced by warnings (-5 each) and errors (-15 each)
        const healthScore = Math.max(0, 100 - (scanResults.warning * 5) - (scanResults.error * 15));
        
        // Segment percentages
        const segments = [
          { value: (scanResults.ok / total) * 100, color: 'success' },
          { value: (scanResults.warning / total) * 100, color: 'warning' },
          { value: (scanResults.error / total) * 100, color: 'error' }
        ].filter(s => s.value > 0);
        
        healthGaugeSetResult(healthScore, segments);

        // Stop throttle gauge animation when scan completes
        throttleGaugeStopAnimation();

        // Real dashboard action → this vehicle's live session, same "System Scan" event shape
        // genSessions() already produces for the mocked history.
        const issues = scanResults.warning + scanResults.error;
        logLiveEvent('search', 'System Scan', scanResults.error > 0 ? 'error' : (scanResults.warning > 0 ? 'warning' : 'success'), issues > 0 ? issues + ' DTC found' : 'No DTC\'s');

        // Hero moment: show scan-complete overlay (auto-dismiss 3s, tap to close)
        showScanCompleteOverlay(healthScore, scanResults);
      }
      return;
    }

    // Mid-scan connection wobble: fires once, roughly 40% through, then self-recovers. Skipped
    // entirely when notifications are suppressed — demonstrators found the VCI badge flipping to
    // "UNSTABLE" mid-demo confusing, and suppressing just the notification wasn't enough since
    // the badge itself still flipped.
    if (!connectionWobbleTriggered && !notificationsSuppressed && totalNodes > 2 && index === Math.floor(totalNodes * 0.4)) {
      connectionWobbleTriggered = true;
      triggerConnectionWobble();
    }

    const node = nodes[index];
    const nodeId = node.dataset.nodeId;

    // Update gauge progress
    const progress = ((index + 1) / totalNodes) * 100;
    healthGaugeSetProgress(progress);
    vciConnectionSetScanning(progress);

    // Set scanning state
    node.dataset.state = 'scanning';
    syncSystemListItem(nodeId, 'scanning', []);
    
    scanTimeout = setTimeout(() => {
      // Check if this node has a matching system list item
      const hasSystemItem = document.querySelector(`.system-list-item[data-system-id="${nodeId}"]`);
      
      let state = 'ok';
      let dtcCodes = [];
      
      // Only assign error/warning states to nodes with matching system items
      if (hasSystemItem && isCuratedSystem(nodeId)) {
        // Deterministic "every other scan" pattern — see shouldCuratedSystemFail's comment.
        if (shouldCuratedSystemFail(nodeId, scanCount)) {
          state = 'error';
          dtcCodes = getDtcCodesForSystem(nodeId, 1);
          scanResults.error++;
        } else {
          scanResults.ok++;
        }
      } else if (hasSystemItem) {
        // Random result: 80% ok, 15% warning, 5% error
        const rand = Math.random();

        if (rand > 0.95) {
          state = 'error';
          dtcCodes = getDtcCodesForSystem(nodeId, Math.floor(Math.random() * 3) + 1);
          scanResults.error++;
        } else if (rand > 0.8) {
          state = 'warning';
          dtcCodes = getDtcCodesForSystem(nodeId, Math.floor(Math.random() * 2) + 1);
          scanResults.warning++;
        } else {
          scanResults.ok++;
        }
      }
      // Topology-only nodes (no system item) always get 'ok' state
      
      node.dataset.state = state;
      syncSystemListItem(nodeId, state, dtcCodes);
      
      index++;
      scanNext();
    }, 300 + Math.random() * 400);
  }
  
  scanNext();
}

function stopScanDemo() {
  clearTimeout(scanTimeout);
  // Stop scan effect overlay
  if (scanEffect) scanEffect.classList.remove('scanning');
  // VCI status: back to "Ready"
  vciConnectionSetReady();
  // Stop throttle gauge animation
  throttleGaugeStopAnimation();
  // Show partial results if stopped mid-scan
  const total = scanResults.ok + scanResults.warning + scanResults.error;
  if (total > 0) {
    const healthScore = Math.max(0, 100 - (scanResults.warning * 5) - (scanResults.error * 15));
    const segments = [
      { value: (scanResults.ok / total) * 100, color: 'success' },
      { value: (scanResults.warning / total) * 100, color: 'warning' },
      { value: (scanResults.error / total) * 100, color: 'error' }
    ].filter(s => s.value > 0);
    healthGaugeSetResult(healthScore, segments);
    const issues = scanResults.warning + scanResults.error;
    logLiveEvent('search', 'System Scan', scanResults.error > 0 ? 'error' : (scanResults.warning > 0 ? 'warning' : 'success'), issues > 0 ? issues + ' DTC found' : 'No DTC\'s');
  }
}

// ===== Functions search (autocomplete) =====
// Per Autocom feedback this box no longer filters the Systems list by name — it searches curated
// Demo functions (functions-library.js) instead, since that's the only content honest enough to
// search (its "curated islands" coverage is the scope, not a separate allowlist to keep in sync —
// see that file's header comment). Selecting a result jumps to that function's ECU detail page
// with the row highlighted (ecu-detail.js reads ?openFunction=<id>) — it never auto-runs the
// function itself; the demonstrator decides whether to click Start from there.
(function initFunctionsSearch() {
  if (!functionsSearchInput) return;
  const resultsEl = document.getElementById('functions-search-results');
  const wrap = functionsSearchInput.closest('[data-functions-search-wrap]');
  if (!resultsEl || !wrap) return;

  const systemsEl = document.getElementById('ecu-diagnostic-systems-' + (isTrucksMode ? 'trucks' : 'cars'));
  const allSystems = systemsEl ? JSON.parse(systemsEl.textContent) : [];
  const functionsLibraryRoot = (window.AutocomFunctionsLibrary || {})[isTrucksMode ? 'trucks' : 'cars'] || {};

  const TYPE_LABEL = { adjustment: 'Adjustment', activation: 'Activation', test: 'Test', calibration: 'Calibration' };

  // Flat index: one entry per curated function, cross-referenced with its system/group for the
  // dropdown's label + breadcrumb.
  const index = [];
  Object.keys(functionsLibraryRoot).forEach((systemId) => {
    const system = allSystems.find((s) => s.systemId === systemId);
    if (!system) return;
    const groupsById = {};
    (system.functionalGroups || []).forEach((g) => { groupsById[g.id] = g; });
    const byGroup = functionsLibraryRoot[systemId];
    Object.keys(byGroup).forEach((groupId) => {
      const group = groupsById[groupId];
      (byGroup[groupId] || []).forEach((fn) => {
        index.push({ fn, systemId, systemLabel: system.label, groupLabel: group ? group.label : '' });
      });
    });
  });

  let currentMatches = [];
  let activeIndex = -1;

  function closeResults() {
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    functionsSearchInput.setAttribute('aria-expanded', 'false');
    currentMatches = [];
    activeIndex = -1;
  }

  function navigateTo(entry) {
    const params = new URLSearchParams(window.location.search);
    params.set('systemId', entry.systemId);
    params.delete('subsystemId');
    params.set('openFunction', entry.fn.id);
    window.location.href = getBasePath() + 'diagnostics-platform/ecu-detail/?' + params.toString();
  }

  function setActive(i) {
    const buttons = resultsEl.querySelectorAll('.functions-search-result');
    buttons.forEach((b) => b.classList.remove('bg-base-200'));
    activeIndex = i;
    if (i >= 0 && buttons[i]) {
      buttons[i].classList.add('bg-base-200');
      buttons[i].scrollIntoView({ block: 'nearest' });
    }
  }

  function renderResults(matches) {
    currentMatches = matches;
    activeIndex = -1;
    if (matches.length === 0) {
      resultsEl.innerHTML = '<div class="px-3 py-3 text-sm text-base-content/60">No matching Demo functions.</div>';
    } else {
      resultsEl.innerHTML = matches.map((entry, i) => (
        '<button type="button" class="functions-search-result w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-base-200 last:border-b-0 hover:bg-base-200" role="option" data-result-index="' + i + '">' +
          '<span class="flex-1 min-w-0">' +
            '<span class="block text-sm text-base-content truncate">' + entry.fn.label + '</span>' +
            '<span class="block text-xs text-base-content/50 truncate">' + entry.systemLabel + (entry.groupLabel ? ' › ' + entry.groupLabel : '') + '</span>' +
          '</span>' +
          '<span class="badge badge-ghost badge-sm shrink-0">' + (TYPE_LABEL[entry.fn.type] || entry.fn.type) + '</span>' +
        '</button>'
      )).join('');
    }
    resultsEl.classList.remove('hidden');
    functionsSearchInput.setAttribute('aria-expanded', 'true');
  }

  functionsSearchInput.addEventListener('input', () => {
    const query = functionsSearchInput.value.trim().toLowerCase();
    if (!query) { closeResults(); return; }
    renderResults(index.filter((entry) => entry.fn.label.toLowerCase().indexOf(query) !== -1).slice(0, 8));
  });

  functionsSearchInput.addEventListener('keydown', (e) => {
    if (resultsEl.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, currentMatches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && currentMatches[activeIndex]) {
      e.preventDefault();
      navigateTo(currentMatches[activeIndex]);
    } else if (e.key === 'Escape') {
      closeResults();
    }
  });

  resultsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-result-index]');
    const entry = btn && currentMatches[parseInt(btn.dataset.resultIndex, 10)];
    if (entry) navigateTo(entry);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeResults();
  });
})();

// Runs last (all of this file's other top-level const/let bindings are initialized by now — see
// restoreScanState()'s own comment above for why this can't run any earlier).
restoreScanState();
})();
