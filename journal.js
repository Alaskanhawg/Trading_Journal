import { projectUrl, publishableKey } from './supabase-config.js';

if (projectUrl && publishableKey) {
  const api = projectUrl.replace(/\/$/, '');
  const editorMode = new URLSearchParams(location.search).get('edit') === '1';
  const main = document.querySelector('main');
  const template = main.querySelector('.trade').cloneNode(true);
  const panel = document.createElement('section');
  panel.className = 'editor';
  const notice = document.createElement('p');
  notice.setAttribute('role', 'status');
  main.prepend(panel, notice);
  let token;

  async function request(path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set('apikey', publishableKey);
    if (token) headers.set('Authorization', 'Bearer ' + token);
    const response = await fetch(api + path, { ...options, headers });
    if (!response.ok) throw new Error('The server rejected the request (' + response.status + ').');
    return response.status === 204 ? null : response.json();
  }

  function json(method, data) {
    return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  }

  function renderTrade(trade) {
    const entry = template.cloneNode(true);
    entry.dataset.outcome = trade.outcome ?? '';
    const date = entry.querySelector('time');
    date.dateTime = trade.traded_on;
    date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(trade.traded_on + 'T00:00:00Z'));
    const label = [trade.side, trade.outcome].filter(Boolean).map(value => value[0].toUpperCase() + value.slice(1));
    entry.querySelector('.meta').firstChild.textContent = label.join(' · ') + ' ';
    entry.querySelector('h3').textContent = trade.title;
    const image = entry.querySelector('img');
    const url = trade.chart.startsWith('screenshots/')
      ? new URL(trade.chart, location.href)
      : new URL(api + '/storage/v1/object/public/trade-charts/' + encodeURIComponent(trade.chart));
    image.src = url.href;
    image.alt = 'Chart for ' + trade.title;
    image.removeAttribute('width');
    image.removeAttribute('height');
    entry.querySelector('figure a').href = url.href;
    const notes = entry.querySelector('.notes');
    notes.querySelectorAll('p').forEach(paragraph => paragraph.remove());
    notes.hidden = !trade.notes;
    for (const text of trade.notes.split(/\n\s*\n/).filter(Boolean)) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      notes.append(paragraph);
    }
    if (token) entry.append(tradeForm(trade));
    return entry;
  }

  async function loadTrades() {
    const trades = await request('/rest/v1/journal_trades?select=*&order=traded_on.desc,created_at.desc,id.desc');
    const entries = trades.map(renderTrade);
    main.querySelectorAll('.trade').forEach(entry => entry.remove());
    main.append(...entries);
    updateTradeStats();
  }

  function tradeForm(trade) {
    const form = document.createElement('form');
    form.className = 'editor';
    form.innerHTML = `
      <label>Trade title<input name="title" required maxlength="160"></label>
      <label>Trade date<input type="date" name="traded_on" required></label>
      <label>Side<select name="side"><option value="short">Short</option><option value="long">Long</option></select></label>
      <label>Outcome<select name="outcome"><option value="">Unconfirmed</option><option value="win">Win</option><option value="loss">Loss</option></select></label>
      <label>My notes<textarea name="notes" rows="4" maxlength="10000"></textarea></label>
      <button>${trade ? 'Save changes' : 'Publish trade'}</button>`;
    if (!trade) {
      const label = document.createElement('label');
      label.innerHTML = 'Chart screenshot (public)<input type="file" name="chart" accept="image/png,image/jpeg,image/webp" required>';
      form.querySelector('button').before(label);
    } else {
      for (const key of ['title', 'traded_on', 'side', 'outcome', 'notes']) form.elements.namedItem(key).value = trade[key] ?? '';
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      notice.textContent = '';
      try {
        const data = Object.fromEntries(new FormData(form));
        data.title = data.title.trim();
        if (!data.title) throw new Error('Enter a trade title.');
        data.outcome ||= null;
        if (!trade) {
          const file = data.chart;
          const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
          if (!extension || !file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose a PNG, JPEG, or WebP image of up to 10 MB.');
          data.chart = crypto.randomUUID() + '.' + extension;
          await request('/storage/v1/object/trade-charts/' + data.chart, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file
          });
        }
        const suffix = trade ? '?id=eq.' + encodeURIComponent(trade.id) : '';
        const options = json(trade ? 'PATCH' : 'POST', data);
        options.headers.Prefer = 'return=representation';
        const saved = await request('/rest/v1/journal_trades' + suffix, options);
        if (saved.length !== 1) throw new Error('No trade was saved. Check your owner access.');
        if (!trade) form.reset();
        notice.textContent = trade ? 'Trade updated.' : 'Trade published.';
        try {
          await loadTrades();
        } catch {
          notice.textContent += ' Reload to see the update.';
        }
      } catch (error) {
        notice.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    return form;
  }

  function showSignIn() {
    panel.innerHTML = '<form class="editor"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></form>';
    panel.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const session = await request('/auth/v1/token?grant_type=password', json('POST', Object.fromEntries(new FormData(form))));
        token = session.access_token;
        if (await request('/rest/v1/rpc/is_journal_owner', json('POST', {})) !== true) throw new Error('This account cannot edit the journal.');
        await loadTrades();
        panel.replaceChildren(tradeForm());
        const signOut = document.createElement('button');
        signOut.textContent = 'Sign out';
        signOut.addEventListener('click', () => location.reload());
        panel.prepend(signOut);
        notice.textContent = '';
      } catch (error) {
        token = undefined;
        notice.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  if (editorMode) showSignIn();
  loadTrades().catch(() => { notice.textContent = 'Could not load the latest trades. Showing the saved journal.'; });
} else if (new URLSearchParams(location.search).get('edit') === '1') {
  import('./editor.js');
}
