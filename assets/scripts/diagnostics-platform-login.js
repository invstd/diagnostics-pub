/**
 * Login (returning user): credentials -> single SMS code w/ inline trust-device -> redirect.
 * Lighter than get-started.js on purpose: no ID verification (account-level, done once ever),
 * no dedicated system-check step (connectivity-check.js handles that quietly in the background).
 */
(function () {
  var card = document.getElementById('login-card');
  if (!card) return;

  function showState(id) {
    card.querySelectorAll('.login-state').forEach(function (el) {
      el.classList.toggle('hidden', el.id !== id);
    });
  }

  // ----- Credentials -----
  var email = document.getElementById('login-email');
  var password = document.getElementById('login-password');
  var loginContinue = document.getElementById('login-continue');

  function updateLoginButton() {
    loginContinue.disabled = email.value.trim().length === 0 || password.value.trim().length === 0;
  }
  [email, password].forEach(function (input) { input.addEventListener('input', updateLoginButton); });

  loginContinue.addEventListener('click', function () {
    loginContinue.disabled = true;
    var label = loginContinue.textContent;
    loginContinue.textContent = 'Signing in…';
    setTimeout(function () {
      loginContinue.textContent = label;
      showState('login-verify');
    }, 600);
  });

  // ----- SMS verify -----
  var codeInput = document.getElementById('login-code-input');
  var verifyContinue = document.getElementById('login-verify-continue');
  var resendBtn = document.getElementById('login-resend');

  codeInput.addEventListener('input', function () {
    verifyContinue.disabled = codeInput.value.trim().length === 0;
  });

  resendBtn.addEventListener('click', function () {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Code resent';
    setTimeout(function () {
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend code';
    }, 1500);
  });

  verifyContinue.addEventListener('click', function () {
    verifyContinue.disabled = true;
    var label = verifyContinue.textContent;
    verifyContinue.textContent = 'Verifying…';
    setTimeout(function () {
      // Session-level (not device-level): lets welcome.njk skip straight to Quick Connect
      // next time this device opens the app, instead of showing Login/Create account again.
      if (typeof localStorage !== 'undefined') localStorage.setItem('air-session-active', '1');
      var base = (card.getAttribute('data-base-path')) || '/';
      // Forked from login.js — this copy only ever runs on diagnostics-platform/ pages, so the
      // folder is hardcoded rather than pattern-matched from the URL (see "Important decisions"
      // #2 in the diagnostics-platform task).
      window.location.href = base + 'diagnostics-platform/';
    }, 700);
  });

  showState('login-credentials');
})();
