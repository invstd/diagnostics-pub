/**
 * Determines whether a VCI is "paired" for this isolated prototype and shows/hides Quick Connect's
 * Recent Vehicles section accordingly. Persisted via a dedicated `vci-setup-paired` localStorage
 * flag (not just a URL param) so the state survives a reload — the wizard's Done screen sets it
 * directly, see vci-setup.js. `?paired=1`/`?paired=0` on the URL force-set the stored value first,
 * for direct-linking either state without clearing devtools storage by hand.
 * Recent Vehicles hides when unpaired (2026-09-21) — it's curated demo data, not real session
 * history, so showing it on a genuine first-run visit implied a VCI had been used before.
 * The hero itself no longer changes with pairing state (2026-09-24) — see home.njk's header comment.
 *
 * Doesn't sync the sidebar's VCI status indicator (2026-09-23) despite reading the same flag —
 * this script's tag sits at the bottom of this page's own content, which the layout renders
 * *before* the sidebar (vci-setup-app.njk includes {{ content }} ahead of the sidebar include), so
 * the sidebar's badge element doesn't exist in the DOM yet when this runs. getElementById on it
 * here silently returns null. That sync lives in vci-setup-sidebar.njk's own inline script instead
 * (guaranteed to run after its own markup), and again in vci-setup.js's closePaired() for the live
 * "Continue" case.
 */
(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('paired') === '1') localStorage.setItem('vci-setup-paired', '1');
  if (params.get('paired') === '0') localStorage.removeItem('vci-setup-paired');

  var isPaired = localStorage.getItem('vci-setup-paired') === '1';
  var recentVehicles = document.getElementById('vci-quick-connect-recent-vehicles');
  if (recentVehicles) recentVehicles.classList.toggle('hidden', !isPaired);
})();
