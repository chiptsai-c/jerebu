// The announcements page served at /admin. Static: all data comes from /admin/api/* after you enter the password.
export const ADMIN_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Jerebu announcements</title>
<style>
  :root {
    --ground: #eef0f1; --surface: #ffffff; --ink: #172026; --muted: #5b666d; --line: #d3d8db;
    --accent: #0f5f73; --accent-ink: #ffffff; --danger: #a11d22; --ok: #1d6b35; --warn-bg: #fff4e5;
    --font: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
    --mono: ui-monospace, Consolas, "Cascadia Mono", monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --ground: #151a1d; --surface: #1d2428; --ink: #e3e8ea; --muted: #9aa6ac; --line: #2f383d;
      --accent: #5cc0d6; --accent-ink: #0d1a1f; --danger: #ff8a8f; --ok: #7fd19a; --warn-bg: #3a2a14;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ground); color: var(--ink); font: 15px/1.5 var(--font); padding: 0 16px; }
  main { max-width: 760px; margin: 0 auto; padding-block: 32px 64px; display: grid; gap: 20px; }
  h1 { margin: 0; font-size: 26px; letter-spacing: -0.02em; }
  h2 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  p { margin: 0; }
  .muted { color: var(--muted); font-size: 13px; }
  section { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; display: grid; gap: 12px; }
  label { display: grid; gap: 4px; font-weight: 600; font-size: 14px; }
  input[type=text], input[type=password], textarea, select {
    font: inherit; color: var(--ink); background: var(--ground); border: 1px solid var(--line);
    border-radius: 8px; padding: 9px 11px; width: 100%;
  }
  textarea { min-height: 84px; resize: vertical; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: end; }
  .row > * { flex: 1 1 200px; }
  .langs { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
  .lang { display: grid; gap: 10px; align-content: start; }
  .count { font: 12px var(--mono); color: var(--muted); font-weight: 400; justify-self: end; }
  .count.over { color: var(--danger); }
  .targets { display: grid; gap: 8px; }
  .targets > label, .choice { display: flex; gap: 8px; align-items: center; font-weight: 500; }
  .states { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 6px 16px; padding-left: 26px; }
  .states label { font-weight: 400; display: flex; gap: 8px; align-items: center; }
  .states small { color: var(--muted); font-variant-numeric: tabular-nums; }
  .indent { padding-left: 26px; display: grid; gap: 8px; }
  button {
    font: inherit; font-weight: 600; border-radius: 8px; padding: 10px 16px; cursor: pointer;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink);
  }
  button.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  button.confirm { background: var(--danger); color: #fff; border-color: var(--danger); }
  button:disabled { opacity: 0.5; cursor: default; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .status { padding: 10px 12px; border-radius: 8px; background: var(--ground); font-size: 14px; }
  .status.error { color: var(--danger); }
  .status.ok { color: var(--ok); }
  .stat { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .note { background: var(--warn-bg); border-radius: 8px; padding: 10px 12px; font-size: 13px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <header>
    <h1>Jerebu announcements</h1>
    <p class="muted">Send a notification to phones that have haze alerts switched on.</p>
  </header>

  <section id="login">
    <h2>Sign in</h2>
    <div class="row">
      <label for="password">Admin password
        <input id="password" type="password" autocomplete="current-password">
      </label>
      <button id="unlock" class="primary" type="button" style="flex:0 0 auto">Sign in</button>
    </div>
    <p id="login-status" class="status" hidden></p>
  </section>

  <div id="app" hidden style="display:grid;gap:20px">
    <section>
      <h2>Audience</h2>
      <div class="row" style="align-items:center">
        <div><div class="stat" id="phones">0</div><p class="muted">phones with alerts on</p></div>
        <button id="reload" type="button" style="flex:0 0 auto">Refresh</button>
      </div>
    </section>

    <section>
      <h2>Message</h2>
      <div class="langs">
        <div class="lang">
          <strong>English (required)</strong>
          <label for="en-title">Title <input id="en-title" type="text" maxlength="65"></label>
          <span class="count" data-for="en-title" data-max="65"></span>
          <label for="en-body">Message <textarea id="en-body" maxlength="240"></textarea></label>
          <span class="count" data-for="en-body" data-max="240"></span>
        </div>
        <div class="lang">
          <strong>Bahasa Melayu (optional)</strong>
          <label for="bm-title">Tajuk <input id="bm-title" type="text" maxlength="65"></label>
          <span class="count" data-for="bm-title" data-max="65"></span>
          <label for="bm-body">Mesej <textarea id="bm-body" maxlength="240"></textarea></label>
          <span class="count" data-for="bm-body" data-max="240"></span>
        </div>
      </div>
      <p class="muted">Phones set to BM get the BM version. If you leave BM empty, everyone gets English.</p>
    </section>

    <section>
      <h2>Send to</h2>
      <div class="targets">
        <label><input type="radio" name="target" value="token" checked> One phone (test)</label>
        <div class="indent" id="token-box">
          <label for="token">Push token <input id="token" type="text" placeholder="ExponentPushToken[...]" spellcheck="false"></label>
          <label class="choice" for="token-lang">Language
            <select id="token-lang" style="width:auto"><option value="en">English</option><option value="bm">BM</option></select>
          </label>
          <p class="muted">Copy the token from the Alerts tab of a development build.</p>
        </div>
        <label><input type="radio" name="target" value="states"> Phones following stations in these states</label>
        <div class="states" id="states" hidden></div>
        <label><input type="radio" name="target" value="all"> Everyone with alerts on</label>
      </div>
    </section>

    <section>
      <div class="actions">
        <button id="check" type="button">Check reach</button>
        <button id="send" class="primary" type="button">Send</button>
        <button id="cancel" type="button" hidden>Cancel</button>
      </div>
      <p id="status" class="status" hidden></p>
      <p class="note">Notifications can't be recalled once sent. Send a test to your own phone first.</p>
    </section>
  </div>
</main>

<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var password = '';
  try { password = sessionStorage.getItem('jerebu-admin') || ''; } catch (e) {}
  var pendingReach = null; // set after the first click on Send, cleared on any change

  function api(path, body) {
    return fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Authorization': 'Bearer ' + password, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Server returned ' + res.status));
        return data;
      });
    });
  }

  function show(el, text, kind) {
    el.textContent = text;
    el.className = 'status' + (kind ? ' ' + kind : '');
    el.hidden = !text;
  }

  function loadSummary() {
    return api('/admin/api/summary').then(function (data) {
      $('phones').textContent = data.phones;
      var box = $('states');
      var checked = Array.prototype.map.call(box.querySelectorAll('input:checked'), function (i) { return i.value; });
      box.textContent = '';
      data.states.forEach(function (s) {
        var label = document.createElement('label');
        var input = document.createElement('input');
        input.type = 'checkbox'; input.value = s.state; input.checked = checked.indexOf(s.state) >= 0;
        var small = document.createElement('small');
        small.textContent = s.phones + (s.phones === 1 ? ' phone' : ' phones');
        label.append(input, document.createTextNode(s.state + ' '), small);
        box.append(label);
      });
    });
  }

  function unlock() {
    password = $('password').value || password;
    show($('login-status'), 'Signing in…');
    loadSummary().then(function () {
      try { sessionStorage.setItem('jerebu-admin', password); } catch (e) {}
      $('login').hidden = true;
      $('app').hidden = false;
    }).catch(function (e) {
      show($('login-status'), e.message, 'error');
    });
  }

  function target() {
    var type = document.querySelector('input[name=target]:checked').value;
    if (type === 'token') return { type: 'token', token: $('token').value, lang: $('token-lang').value };
    if (type === 'states') {
      return { type: 'states', states: Array.prototype.map.call($('states').querySelectorAll('input:checked'), function (i) { return i.value; }) };
    }
    return { type: 'all' };
  }

  function payload(dryRun) {
    return {
      en: { title: $('en-title').value, body: $('en-body').value },
      bm: { title: $('bm-title').value, body: $('bm-body').value },
      target: target(),
      dryRun: dryRun
    };
  }

  function resetConfirm() {
    pendingReach = null;
    $('send').textContent = 'Send';
    $('send').className = 'primary';
    $('cancel').hidden = true;
  }

  function busy(on) { $('check').disabled = on; $('send').disabled = on; }

  function phones(n) { return n + (n === 1 ? ' phone' : ' phones'); }

  $('check').addEventListener('click', function () {
    busy(true);
    api('/admin/api/send', payload(true)).then(function (r) {
      show($('status'), 'This would reach ' + phones(r.phones) + '.');
    }).catch(function (e) { show($('status'), e.message, 'error'); }).then(function () { busy(false); });
  });

  $('send').addEventListener('click', function () {
    busy(true);
    if (pendingReach === null) {
      // First click: count recipients and ask for confirmation.
      api('/admin/api/send', payload(true)).then(function (r) {
        if (r.phones === 0) { show($('status'), 'Nobody to send to. Choose another audience.', 'error'); return; }
        pendingReach = r.phones;
        $('send').textContent = 'Confirm: send to ' + phones(r.phones);
        $('send').className = 'confirm';
        $('cancel').hidden = false;
        show($('status'), '');
      }).catch(function (e) { show($('status'), e.message, 'error'); }).then(function () { busy(false); });
      return;
    }
    api('/admin/api/send', payload(false)).then(function (r) {
      var text = 'Sent to ' + phones(r.sent) + '.';
      if (r.failed) text += ' ' + r.failed + ' failed (' + r.errors.join(', ') + ').';
      show($('status'), text, r.failed ? 'error' : 'ok');
      resetConfirm();
      return loadSummary();
    }).catch(function (e) { show($('status'), e.message, 'error'); resetConfirm(); }).then(function () { busy(false); });
  });

  $('cancel').addEventListener('click', function () { resetConfirm(); show($('status'), ''); });
  $('unlock').addEventListener('click', unlock);
  $('password').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
  $('reload').addEventListener('click', function () { loadSummary().catch(function (e) { show($('status'), e.message, 'error'); }); });

  // Any edit cancels a pending confirmation, so the count you confirmed always matches what is sent.
  document.addEventListener('input', resetConfirm);
  document.addEventListener('change', function (e) {
    resetConfirm();
    if (e.target.name === 'target') {
      $('states').hidden = e.target.value !== 'states';
      $('token-box').hidden = e.target.value !== 'token';
    }
  });

  function updateCounts() {
    Array.prototype.forEach.call(document.querySelectorAll('.count'), function (c) {
      var len = $(c.getAttribute('data-for')).value.length, max = +c.getAttribute('data-max');
      c.textContent = len + ' / ' + max;
      c.classList.toggle('over', len > max);
    });
  }
  document.addEventListener('input', updateCounts);
  updateCounts();

  if (password) unlock();
})();
</script>
</body>
</html>`;
