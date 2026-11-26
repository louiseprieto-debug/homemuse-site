/* Home Muse Studio: Lou's private iPad app for client visits.
   Local-first: every project lives in this iPad's IndexedDB and works offline.
   When Supabase is connected (Settings), projects and photos sync to Lou's private cloud account.
   The archetype quiz (/quiz/) and the onboarding questionnaire (/clarity/) open inside the app;
   their answers come back by postMessage and are saved to the project, then emailed via FormSubmit. */
(function () {
'use strict';
const I = window.HMI, D = window.Draw;
const INBOX = 'contact@homemuse.fr';
const ROOMS = ['Entrance', 'Living room', 'Kitchen', 'Dining room', 'Bedroom', 'Bathroom', 'Office', 'Kids’ room', 'Terrace', 'Garden', 'Other'];
const STATUSES = ['Visit booked', 'Visited', 'Proposal sent', 'In progress', 'Done'];
const SERVICES = ['Design audit', 'Home staging', 'Other services'];

/* ---------- small helpers ---------- */
const root = document.getElementById('root');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : D.uid() + D.uid());
const sid = () => D.uid();
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => { if (!d) return ''; const x = new Date(d.length === 10 ? d + 'T12:00:00' : d); return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtTime = t => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
let toastT = 0;
function toast(msg, ms = 2600) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* A small form dialog. fields: [{k,label,type,value,placeholder,options}] */
function dialog({ title, text, fields = [], ok = 'Save', cancel = 'Cancel', danger = false }) {
  return new Promise(res => {
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}
      ${fields.map(f => `<label class="f">${esc(f.label || '')}${f.type === 'textarea' ? `<textarea name="${f.k}" placeholder="${esc(f.placeholder || '')}" style="min-height:90px">${esc(f.value || '')}</textarea>`
        : f.type === 'select' ? `<select name="${f.k}">${f.options.map(o => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        : `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''} autocomplete="off">`}</label>`).join('')}
      <div class="acts">${cancel ? `<button class="btn ghost" value="cancel" formnovalidate>${esc(cancel)}</button>` : ''}<button class="btn${danger ? ' danger' : ''}" value="ok">${esc(ok)}</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => {
      const out = d.returnValue === 'ok' ? Object.fromEntries(fields.map(f => [f.k, d.querySelector(`[name="${f.k}"]`).value])) : null;
      d.remove(); res(out);
    });
    d.showModal();
    const first = d.querySelector('input,textarea'); if (first) setTimeout(() => first.focus(), 50);
  });
}
const confirmBox = (title, text, ok = 'Delete') => dialog({ title, text, ok, danger: true }).then(r => !!r);

/* ---------- IndexedDB ---------- */
const DB = (() => {
  let db;
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('homemuse-studio', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('projects', { keyPath: 'id' }); d.createObjectStore('blobs'); d.createObjectStore('outbox', { keyPath: 'id' }); d.createObjectStore('kv'); };
    r.onsuccess = () => { db = r.result; res(db); }; r.onerror = () => rej(r.error);
  });
  const tx = (store, mode, fn) => new Promise((res, rej) => {
    const t = db.transaction(store, mode), s = t.objectStore(store); let out; const r = fn(s);
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
  return {
    open,
    get: (s, k) => tx(s, 'readonly', st => st.get(k)),
    all: s => tx(s, 'readonly', st => st.getAll()),
    put: (s, v, k) => tx(s, 'readwrite', st => k === undefined ? st.put(v) : st.put(v, k)),
    del: (s, k) => tx(s, 'readwrite', st => st.delete(k))
  };
})();

/* ---------- projects in memory ---------- */
const mem = new Map();
const live = () => [...mem.values()].filter(p => !p.deleted);
function newProject(f) {
  const t = Date.now();
  return { id: uid(), v: 1, createdAt: t, updatedAt: t, deleted: 0,
    client: { name: f.name || '', email: f.email || '', phone: '', address: f.address || '' },
    visit: f.visit || today(), status: 'Visit booked', service: '', lang: 'fr', brief: '',
    notes: [], sheets: [], photos: [], trash: [], quiz: null, clarity: null, clarityDraft: null };
}
async function save(p, quiet) {
  p.updatedAt = Date.now(); p._dirty = 1;
  await DB.put('projects', p);
  if (!quiet) syncSoon();
}
const saveSoon = (() => { const m = new Map(); return p => { clearTimeout(m.get(p.id)); m.set(p.id, setTimeout(() => save(p), 700)); }; })();
const clean = p => { const o = Object.assign({}, p); delete o._dirty; return o; };
async function purgeLocal(p) {
  for (const ph of p.photos || []) { await DB.del('blobs', 'p:' + ph.id); await DB.del('blobs', 't:' + ph.id); urlCache.delete('p:' + ph.id); urlCache.delete('t:' + ph.id); }
  await DB.del('projects', p.id); mem.delete(p.id); lsSet('hm-studio-clarity-' + p.id, null);
}

/* ---------- photos ---------- */
const urlCache = new Map();
async function photoURL(p, ph, kind = 't') {
  const key = kind + ':' + ph.id;
  if (urlCache.has(key)) return urlCache.get(key);
  let blob = await DB.get('blobs', key);
  if (!blob && ph.synced && Cloud.ready() && navigator.onLine) {
    try { blob = await Cloud.download(`${Cloud.sess.uid}/${p.id}/${ph.id}${kind === 't' ? '_t' : ''}.jpg`); await DB.put('blobs', blob, key); } catch (e) { console.warn(e); }
  }
  if (!blob && kind === 't') return photoURL(p, ph, 'p');
  if (!blob) return '';
  const u = URL.createObjectURL(blob); urlCache.set(key, u); return u;
}
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function resize(img, max, q) {
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { blob: await new Promise(r => c.toBlob(r, 'image/jpeg', q)), w: c.width, h: c.height };
}
async function addPhotos(p, files, room) {
  let n = 0;
  for (const f of files) {
    if (!/^image\//.test(f.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)) continue;
    const u = URL.createObjectURL(f);
    try {
      const img = await loadImage(u);
      const full = await resize(img, 2560, 0.85), th = await resize(img, 520, 0.78);
      const ph = { id: sid(), room: room || 'Other', caption: '', w: full.w, h: full.h, at: Date.now(), synced: 0 };
      await DB.put('blobs', full.blob, 'p:' + ph.id); await DB.put('blobs', th.blob, 't:' + ph.id);
      p.photos.push(ph); n++;
    } catch (e) { toast('One photo could not be read (' + f.name + ')'); }
    URL.revokeObjectURL(u);
  }
  if (n) { await save(p); toast(n === 1 ? 'Photo saved' : n + ' photos saved'); }
  return n;
}
async function shareBlob(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const safeName = s => (s || 'home-muse').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'home-muse';

/* ---------- Supabase (REST, no library) ---------- */
const Cloud = {
  get cfg() { return lsGet('hm-studio-cloud', {}); },
  set cfg(v) { lsSet('hm-studio-cloud', v); },
  get sess() { return lsGet('hm-studio-session', null); },
  set sess(v) { lsSet('hm-studio-session', v); },
  configured() { const c = this.cfg; return !!(c.url && c.key); },
  ready() { return this.configured() && !!this.sess; },
  async auth(body, grant) {
    const c = this.cfg;
    const r = await fetch(c.url + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error_description || j.msg || j.message || ('Sign-in failed (' + r.status + ')')); e.status = r.status; throw e; }
    const s = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, uid: j.user && j.user.id, email: j.user && j.user.email };
    this.sess = s; return s;
  },
  signIn(email, password) { return this.auth({ email, password }, 'password'); },
  async token() {
    let s = this.sess; if (!s) throw new Error('Not signed in');
    if (Date.now() > s.exp - 60000) {
      try { s = await this.auth({ refresh_token: s.refresh }, 'refresh_token'); }
      catch (e) { if (e.status === 400 || e.status === 401) { this.sess = null; syncErr = 'Signed out: please sign in again in Settings'; } throw e; }
    }
    return s.access;
  },
  async req(path, opt = {}) {
    const c = this.cfg, t = await this.token();
    const r = await fetch(c.url + path, Object.assign({}, opt, { headers: Object.assign({ apikey: c.key, Authorization: 'Bearer ' + t }, opt.headers || {}) }));
    if (!r.ok) { const txt = await r.text().catch(() => ''); throw new Error(r.status + ' ' + txt.slice(0, 240)); }
    return r;
  },
  upload(path, blob) { return this.req('/storage/v1/object/studio/' + path, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob }); },
  async download(path) { return (await this.req('/storage/v1/object/authenticated/studio/' + path)).blob(); },
  remove(paths) { return this.req('/storage/v1/object/studio', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }) }); }
};

/* ---------- sync ---------- */
let syncing = false, again = false, lastSync = lsGet('hm-studio-lastsync', 0), syncErr = '';
const syncSoon = debounce(() => sync(), 3000);
async function sync(manual) {
  if (!Cloud.ready() || !navigator.onLine) { pill(); if (manual) toast(Cloud.ready() ? 'You’re offline. Everything is saved on this iPad.' : 'Cloud sync is not set up yet (Settings).'); return; }
  if (syncing) { again = true; return; }
  syncing = true; syncErr = ''; pill();
  let pulled = false;
  try {
    const me = Cloud.sess.uid;
    /* 1. pull what changed in the cloud */
    let cur = (await DB.get('kv', 'cursor')) || '1970-01-01T00:00:00Z';
    for (;;) {
      const rows = await (await Cloud.req(`/rest/v1/projects?select=id,data,deleted,synced_at&synced_at=gt.${encodeURIComponent(cur)}&order=synced_at.asc&limit=200`)).json();
      for (const row of rows) {
        const loc = mem.get(row.id), rd = row.data || {};
        if (row.deleted) { if (loc) { await purgeLocal(loc); pulled = true; } }
        else if (!loc || (rd.updatedAt || 0) > (loc.updatedAt || 0)) {
          if (loc) { Object.keys(loc).forEach(k => delete loc[k]); Object.assign(loc, rd); } else mem.set(row.id, rd);
          await DB.put('projects', mem.get(row.id)); pulled = true;
        }
        cur = row.synced_at;
      }
      await DB.put('kv', cur, 'cursor');
      if (rows.length < 200) break;
    }
    /* 2. upload new photos, delete removed ones */
    for (const p of [...mem.values()]) {
      let touched = false;
      for (const ph of p.photos || []) {
        if (ph.synced || p.deleted) continue;
        const full = await DB.get('blobs', 'p:' + ph.id), th = await DB.get('blobs', 't:' + ph.id);
        if (!full) continue;
        await Cloud.upload(`${me}/${p.id}/${ph.id}.jpg`, full);
        if (th) await Cloud.upload(`${me}/${p.id}/${ph.id}_t.jpg`, th);
        ph.synced = 1; touched = true;
      }
      if (p.trash && p.trash.length) { await Cloud.remove(p.trash.flatMap(id => [`${me}/${p.id}/${id}.jpg`, `${me}/${p.id}/${id}_t.jpg`])); p.trash = []; touched = true; }
      if (touched) { p._dirty = 1; await DB.put('projects', p); }
    }
    /* 3. push changed projects */
    for (const p of [...mem.values()].filter(x => x._dirty)) {
      const at = p.updatedAt;
      await Cloud.req('/rest/v1/projects?on_conflict=id', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ id: p.id, data: clean(p), updated_at: new Date(at).toISOString(), deleted: !!p.deleted }]) });
      if (p.deleted) await purgeLocal(p);
      else if (p.updatedAt === at) { p._dirty = 0; await DB.put('projects', p); }
    }
    lastSync = Date.now(); lsSet('hm-studio-lastsync', lastSync);
  } catch (e) {
    console.warn('sync', e);
    syncErr = syncErr || (/Failed to fetch|NetworkError|Load failed/i.test(e.message) ? 'Could not reach the cloud' : 'Sync problem: ' + e.message.slice(0, 120));
  }
  syncing = false; pill();
  flushOutbox();
  if (pulled) onRemoteChange();
  if (again) { again = false; sync(); }
  if (manual) toast(syncErr || 'All synced');
}
function onRemoteChange() {
  const h = location.hash;
  if (!h || h === '#/' || h === '#') route();
  const typing = document.activeElement && document.activeElement.matches('input,textarea,select');
  if (/^#\/p\/[^/]+(\/(overview|plans|photos))?$/.test(h) && !typing && !document.querySelector('.ed,.lb,dialog[open]')) route();
}
function pillState() {
  if (syncing) return ['busy', 'Syncing…'];
  if (!Cloud.configured()) return ['', 'On this iPad'];
  if (!Cloud.ready()) return ['err', 'Sign in to sync'];
  if (!navigator.onLine) return ['', 'Offline · saved on iPad'];
  if (syncErr) return ['err', 'Sync problem'];
  const dirty = [...mem.values()].some(p => p._dirty);
  if (dirty) return ['busy', 'Waiting to sync'];
  return ['ok', lastSync ? 'Synced ' + new Date(lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Synced'];
}
function pill() { document.querySelectorAll('.sync').forEach(el => { const [s, t] = pillState(); el.dataset.s = s; el.querySelector('span').textContent = t; el.title = syncErr || t; }); }
const pillHTML = () => `<button class="sync" data-go="settings" aria-label="Sync status"><i></i><span></span></button>`;

/* ---------- email outbox (FormSubmit, same as the website) ---------- */
async function queueEmail(payload) { await DB.put('outbox', { id: sid(), payload, at: Date.now() }); flushOutbox(); }
let flushing = false;
async function flushOutbox() {
  if (flushing || !navigator.onLine) return; flushing = true;
  try {
    for (const m of await DB.all('outbox')) {
      try {
        const r = await fetch('https://formsubmit.co/ajax/' + INBOX, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(m.payload) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && String(j.success) !== 'false') await DB.del('outbox', m.id);
      } catch (e) { break; }
    }
  } finally { flushing = false; }
}

/* ---------- answers coming back from the quiz and questionnaire ---------- */
const draftSave = debounce(p => save(p), 1500);
window.addEventListener('message', async e => {
  if (e.origin !== location.origin || !e.data || e.data.type !== 'hm-studio') return;
  const d = e.data, p = mem.get(d.pid); if (!p) return;
  const fill = (k, v) => { if (v && !p.client[k]) p.client[k] = v; };
  if (d.kind === 'quiz') {
    p.quiz = Object.assign({}, d.result, { at: Date.now() });
    fill('name', d.result.name); fill('email', d.result.email);
    await save(p);
    if (d.email) queueEmail(Object.assign({ 'Source': 'Home Muse Studio (in person)' }, d.email));
    toast('Archetype saved to ' + (p.client.name || 'the project') + ': ' + d.result.names.main.en);
    refreshTabs(p);
  } else if (d.kind === 'clarity-draft') {
    p.clarityDraft = { answers: d.answers, review: d.review, lang: d.lang, at: Date.now() };
    draftSave(p);
  } else if (d.kind === 'clarity') {
    p.clarity = { answers: d.answers, review: d.review, lang: d.lang, at: Date.now() };
    p.clarityDraft = null;
    fill('name', d.answers.name); fill('email', d.answers.email); fill('phone', d.answers.phone);
    await save(p);
    if (d.email) queueEmail(Object.assign({ 'Source': 'Home Muse Studio (in person)' }, d.email));
    toast('Onboarding answers saved to the project');
    refreshTabs(p);
  }
});

/* ======================================================================
   Views
   ====================================================================== */
let cur = null; // current project
function top({ back, title, kick }) {
  return `<header class="top">
    ${back ? `<a class="iconbtn" href="${back}" aria-label="Back">${I.back}</a>` : ''}
    <div class="title"><h1>${title}</h1>${kick ? `<span class="kick">${esc(kick)}</span>` : ''}</div>
    ${pillHTML()}
    ${back ? '' : `<a class="iconbtn" href="#/settings" aria-label="Settings">${I.gear}</a>`}
  </header>`;
}
function bindCommon() { root.querySelectorAll('[data-go=settings]').forEach(b => b.onclick = () => { location.hash = '#/settings'; }); pill(); }

/* ---------- home ---------- */
function home(q = '') {
  cur = null;
  const list = live().sort((a, b) => (b.visit || '').localeCompare(a.visit || '') || b.updatedAt - a.updatedAt);
  const hr = new Date().getHours(), hello = hr < 18 ? 'Bonjour Lou' : 'Bonsoir Lou';
  root.innerHTML = top({ title: 'Home Muse <i style="color:var(--gold-ink)">Studio</i>' }) + `
  <main class="wrap">
    <div class="hello"><div><h2>${hello}</h2><p>${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${list.length} ${list.length === 1 ? 'project' : 'projects'}</p></div>
      ${list.length > 3 ? `<input type="search" class="search" placeholder="Search clients" value="${esc(q)}" aria-label="Search clients">` : ''}</div>
    <div class="projects">
      <button class="pcard new" id="newp">${I.plus}New client visit</button>
      ${list.filter(p => !q || JSON.stringify([p.client, p.brief]).toLowerCase().includes(q.toLowerCase())).map(p => `
      <a class="pcard" href="#/p/${p.id}" style="text-decoration:none;color:inherit">
        <div class="cover" data-cover="${p.id}"><span class="mono">${esc(initials(p.client.name))}</span></div>
        <div class="body"><h3>${esc(p.client.name || 'Unnamed client')}</h3>
          <div class="meta"><span>${esc(fmtDate(p.visit))}</span>${p.client.address ? `<span>${esc(p.client.address.split(',')[0])}</span>` : ''}</div>
          <div class="meta" style="margin-top:8px">${p.quiz ? `<span class="badge"><i style="background:${esc(p.quiz.color)}"></i>${esc(p.quiz.names.main.en)}</span>` : ''}<span class="badge">${esc(p.status)}</span></div>
        </div></a>`).join('')}
    </div>
    ${list.length ? '' : `<div class="empty"><h2>Your first visit</h2><p>Create a project for each client. Inside you’ll find the archetype quiz, the onboarding questionnaire, your notes, layout plans and photos of the house.</p></div>`}
  </main>`;
  bindCommon();
  document.getElementById('newp').onclick = newProjectFlow;
  const s = root.querySelector('.search'); if (s) s.oninput = debounce(() => { home(s.value); const n = root.querySelector('.search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250);
  list.forEach(async p => {
    const ph = p.photos[0]; if (!ph) return;
    const u = await photoURL(p, ph); const el = root.querySelector(`[data-cover="${p.id}"]`);
    if (u && el) el.innerHTML = `<img src="${u}" alt="">`;
  });
}
async function newProjectFlow() {
  const r = await dialog({ title: 'New client visit', ok: 'Create', fields: [
    { k: 'name', label: 'Client name', required: true, placeholder: 'e.g. Claire Martin' },
    { k: 'address', label: 'Address or area (optional)', placeholder: 'e.g. Villefranche-sur-Mer' },
    { k: 'visit', label: 'Visit date', type: 'date', value: today() }] });
  if (!r || !r.name.trim()) return;
  const p = newProject({ name: r.name.trim(), address: r.address.trim(), visit: r.visit });
  mem.set(p.id, p); await save(p);
  location.hash = '#/p/' + p.id + '/overview';
}

/* ---------- project ---------- */
const TABS = [['overview', 'Client', 'user'], ['archetype', 'Archetype quiz', 'arch'], ['onboarding', 'Onboarding', 'clip'], null, ['notes', 'Notes', 'note'], ['plans', 'Layout plans', 'plan'], ['photos', 'Photos', 'camera']];
function tabCount(p, k) {
  if (k === 'notes') return p.notes.length + p.sheets.filter(s => s.kind === 'page').length;
  if (k === 'plans') return p.sheets.filter(s => s.kind === 'plan').length;
  if (k === 'photos') return p.photos.length;
  if (k === 'archetype') return p.quiz ? '✓' : 0;
  if (k === 'onboarding') return p.clarity ? '✓' : 0;
  return 0;
}
function tabsHTML(p, tab) {
  return `<nav class="tabs" role="tablist">${TABS.map(t => t ? `<a class="tab" role="tab" href="#/p/${p.id}/${t[0]}" aria-selected="${t[0] === tab}" style="text-decoration:none">${I[t[2]]}${t[1]}${tabCount(p, t[0]) ? `<span class="n">${tabCount(p, t[0])}</span>` : ''}</a>` : '<span class="sep"></span>').join('')}</nav>`;
}
function refreshTabs(p) { if (cur !== p) return; const n = root.querySelector('.tabs'); if (n) { const t = n.querySelector('[aria-selected=true]'); n.outerHTML = tabsHTML(p, t ? t.getAttribute('href').split('/').pop() : 'overview'); } }

function projectView(p, tab) {
  cur = p;
  root.innerHTML = top({ back: '#/', title: esc(p.client.name || 'Unnamed client'), kick: fmtDate(p.visit) }) + tabsHTML(p, tab) + `<div id="pane"></div>`;
  bindCommon();
  const pane = document.getElementById('pane');
  ({ overview, archetype: embed, onboarding: embed, notes, plans, photos }[tab] || overview)(p, pane, tab);
  window.scrollTo(0, 0);
}

/* ---------- client overview ---------- */
function overview(p, pane) {
  const c = p.client, q = p.quiz, cl = p.clarity, dr = p.clarityDraft;
  const answered = r => r ? r.reduce((n, s) => n + s.f.filter(f => f.a).length, 0) : 0;
  const total = r => r ? r.reduce((n, s) => n + s.f.length, 0) : 0;
  pane.innerHTML = `<main class="wrap"><div class="grid2">
    <section class="card"><h2>Client</h2>
      <label class="f">Name<input type="text" data-c="name" value="${esc(c.name)}" autocomplete="off"></label>
      <div class="row"><label class="f">Email<input type="email" data-c="email" value="${esc(c.email)}" autocomplete="off"></label>
      <label class="f">Phone<input type="tel" data-c="phone" value="${esc(c.phone)}" autocomplete="off"></label></div>
      <label class="f">Address<input type="text" data-c="address" value="${esc(c.address)}" autocomplete="off"></label>
      <div class="row"><label class="f">Visit date<input type="date" data-k="visit" value="${esc(p.visit)}"></label>
      <label class="f">Status<select data-k="status">${STATUSES.map(s => `<option${s === p.status ? ' selected' : ''}>${s}</option>`).join('')}</select></label></div>
      <div class="f" style="margin-bottom:14px"><span class="small muted">Service</span><div class="chips" style="margin-top:6px">${SERVICES.map(s => `<button class="chip" data-svc="${esc(s)}" aria-pressed="${p.service === s}">${s}</button>`).join('')}</div></div>
      <div class="f" style="margin-bottom:14px"><span class="small muted">Client’s language (for the quiz and questionnaire)</span><div class="chips" style="margin-top:6px"><button class="chip" data-lang="fr" aria-pressed="${p.lang === 'fr'}">Français</button><button class="chip" data-lang="en" aria-pressed="${p.lang === 'en'}">English</button></div></div>
      <label class="f">The project in a few words<textarea data-k="brief" placeholder="What they want, rooms concerned, budget, timing…" style="min-height:90px">${esc(p.brief)}</textarea></label>
    </section>
    <div class="stack">
      <section class="card">
        <div class="sectionhead" style="margin:0 0 10px"><h2 style="margin:0">Home archetype</h2><a class="btn ghost sm" href="#/p/${p.id}/archetype">${q ? 'Retake' : 'Start the quiz'}</a></div>
        ${q ? `<div class="arch-card"><img src="/quiz/img/${esc(q.main)}.jpg" alt="">
          <div><h3>${esc(q.names.main.en)}</h3><div class="muted small">${esc(q.names.main.fr)} · with a touch of ${esc(q.names.second.en)}</div>
          ${q.quote ? `<p class="q">${esc(q.quote.en)}</p>` : ''}
          ${q.swatches ? `<div class="sw">${q.swatches.map(s => `<span style="background:${esc(s[0])}" title="${esc(s[2])}"></span>`).join('')}</div>` : ''}
          <p class="small muted" style="margin:8px 0 0">Taken ${esc(fmtTime(q.at))}${q.guide ? ' · <b style="color:var(--gold-ink)">Full guide requested (€19.99)</b>' : ''}</p></div></div>
          ${q.tips ? `<details style="margin-top:12px"><summary>Portrait, strength and first ideas</summary><p>${esc(q.portrait && q.portrait.en)}</p><p><b>Strength:</b> ${esc(q.strength && q.strength.en)}</p><p><b>Shadow:</b> ${esc(q.shadow && q.shadow.en)}</p><ol>${(q.tips.en || []).map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>` : ''}`
        : `<p class="muted" style="margin:0">Not taken yet. Hand the iPad to your client: it takes five minutes, and the result is saved here.</p>`}
      </section>
      <section class="card">
        <div class="sectionhead" style="margin:0 0 10px"><h2 style="margin:0">Onboarding</h2><a class="btn ghost sm" href="#/p/${p.id}/onboarding">${cl ? 'Edit answers' : dr ? 'Continue' : 'Start'}</a></div>
        ${cl ? `<p class="small muted" style="margin:0 0 6px">Completed ${esc(fmtTime(cl.at))} · ${answered(cl.review)} of ${total(cl.review)} questions answered</p>${reviewHTML(cl.review, true)}`
          : dr ? `<p class="muted" style="margin:0">In progress: ${answered(dr.review)} of ${total(dr.review)} questions answered.</p>${reviewHTML(dr.review, true)}`
          : `<p class="muted" style="margin:0">Not started. Go through the questionnaire together during the visit, or let your client fill it in.</p>`}
      </section>
      <section class="card"><h2>This visit</h2>
        <div class="stats">
          <a class="stat" href="#/p/${p.id}/notes" style="text-decoration:none;color:inherit"><b>${tabCount(p, 'notes')}</b><span>notes</span></a>
          <a class="stat" href="#/p/${p.id}/plans" style="text-decoration:none;color:inherit"><b>${tabCount(p, 'plans')}</b><span>plans</span></a>
          <a class="stat" href="#/p/${p.id}/photos" style="text-decoration:none;color:inherit"><b>${p.photos.length}</b><span>photos</span></a>
        </div>
        <p style="margin:18px 0 0"><button class="btn danger sm" id="delp">${I.trash} Delete this project</button></p>
      </section>
    </div></div></main>`;
  pane.querySelectorAll('[data-c]').forEach(i => i.oninput = () => { p.client[i.dataset.c] = i.value; if (i.dataset.c === 'name') root.querySelector('.top h1').textContent = i.value || 'Unnamed client'; saveSoon(p); });
  pane.querySelectorAll('[data-k]').forEach(i => i.oninput = i.onchange = () => { p[i.dataset.k] = i.value; if (i.dataset.k === 'visit') root.querySelector('.top .kick').textContent = fmtDate(i.value); saveSoon(p); });
  pane.querySelectorAll('[data-svc]').forEach(b => b.onclick = () => { p.service = p.service === b.dataset.svc ? '' : b.dataset.svc; pane.querySelectorAll('[data-svc]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.svc === p.service))); save(p); });
  pane.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { p.lang = b.dataset.lang; pane.querySelectorAll('[data-lang]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.lang === p.lang))); save(p); });
  document.getElementById('delp').onclick = async () => {
    if (!await confirmBox('Delete this project?', `Everything for ${p.client.name || 'this client'} goes: notes, plans, photos and answers${Cloud.ready() ? ', on this iPad and in the cloud' : ''}. This can’t be undone.`)) return;
    p.deleted = 1; p.trash = (p.trash || []).concat(p.photos.filter(x => x.synced).map(x => x.id));
    if (Cloud.configured()) { await save(p); for (const ph of p.photos) { await DB.del('blobs', 'p:' + ph.id); await DB.del('blobs', 't:' + ph.id); } }
    else await purgeLocal(p);
    toast('Project deleted'); location.hash = '#/';
  };
}
function reviewHTML(r, collapsed) {
  if (!r) return '';
  const body = `<div class="review">${r.map(s => `<h4>${esc(s.s)}</h4><dl>${s.f.map(f => `<dt>${esc(f.q)}</dt><dd class="${f.a ? '' : 'none'}">${esc(f.a || 'No answer')}</dd>`).join('')}</dl>`).join('')}</div>`;
  return collapsed ? `<details style="margin-top:8px"><summary>See all answers</summary>${body}</details>` : body;
}

/* ---------- quiz and questionnaire, inside the app ---------- */
function embed(p, pane, tab) {
  const quiz = tab === 'archetype';
  const prm = new URLSearchParams({ studio: p.id, lang: p.lang || 'fr', name: quiz ? (p.client.name || '').split(' ')[0] : (p.client.name || ''), email: p.client.email || '' });
  if (!quiz && p.client.phone) prm.set('phone', p.client.phone);
  if (!quiz) { const a = (p.clarity || p.clarityDraft || {}).answers; lsSet('hm-studio-clarity-' + p.id, a ? { A: a, lang: (p.clarity || p.clarityDraft).lang || p.lang } : null); }
  const src = (quiz ? '/quiz/?' : '/clarity/?') + prm.toString();
  const who = esc((p.client.name || 'your client').split(' ')[0]);
  const status = quiz ? (p.quiz ? `Saved result: <b>${esc(p.quiz.names.main.en)}</b>. Taking it again replaces it.` : `Hand the iPad to ${who}. The result is saved to this project and emailed to you.`)
    : (p.clarity ? `Answers saved ${esc(fmtTime(p.clarity.at))}. Changes are saved again when you send.` : `Fill it in together, or hand the iPad to ${who}. Every answer is saved as you go.`);
  pane.innerHTML = `<div class="embedbar"><p>${status}</p><div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn ghost sm" id="restart">${I.refresh} ${quiz ? 'Restart' : 'Reload'}</button>
      <button class="btn sm" id="cm">${I.expand} Client mode</button></div></div>
    <div id="ew"><iframe class="embed" title="${quiz ? 'Archetype quiz' : 'Onboarding questionnaire'}" src="${esc(src)}"></iframe>
    <button class="holdexit" hidden aria-label="Hold to leave client mode">${I.lock}</button></div>`;
  const fr = pane.querySelector('iframe'), ew = document.getElementById('ew'), hx = pane.querySelector('.holdexit');
  fr.addEventListener('load', () => { try { fr.contentDocument.querySelectorAll('a[href]').forEach(a => { if (!/^mailto:/.test(a.getAttribute('href'))) { a.removeAttribute('href'); a.style.pointerEvents = 'none'; } }); } catch (e) {} });
  document.getElementById('restart').onclick = async () => {
    if (!quiz && !await confirmBox('Reload the questionnaire?', 'Answers already typed are kept.', 'Reload')) return;
    if (!quiz) { const a = (p.clarity || p.clarityDraft || {}).answers; lsSet('hm-studio-clarity-' + p.id, a ? { A: a, lang: p.lang } : null); }
    fr.src = src;
  };
  document.getElementById('cm').onclick = () => { ew.classList.add('clientmode'); hx.hidden = false; toast('Client mode: hold the lock button for 1 second to come back', 3500); };
  let ht = 0;
  const start = e => { e.preventDefault(); hx.classList.add('holding'); ht = setTimeout(() => { ew.classList.remove('clientmode'); hx.hidden = true; hx.classList.remove('holding'); }, 1200); };
  const stop = () => { clearTimeout(ht); hx.classList.remove('holding'); };
  hx.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => hx.addEventListener(t, stop));
}

/* ---------- notes ---------- */
function notes(p, pane) {
  const pages = p.sheets.filter(s => s.kind === 'page');
  pane.innerHTML = `<main class="wrap">
    <div class="sectionhead"><h2>Visit notes</h2><button class="btn" id="addn">${I.plus} New note</button></div>
    <p class="muted small" style="margin:-6px 0 16px">Tip: write with the Apple Pencil straight into a note and iPad turns your handwriting into text.</p>
    <div class="stack" id="nlist">${p.notes.length ? '' : `<div class="empty" style="padding:24px"><p>No notes yet. One note per room works well.</p></div>`}</div>
    <div class="sectionhead" style="margin-top:36px"><h2>Handwritten pages</h2></div>
    <div class="sheets">${sheetCards(pages)}<button class="sheet new" id="addpg">${I.pen}New handwritten page</button></div>
  </main>`;
  const list = document.getElementById('nlist');
  const sorted = [...p.notes].sort((a, b) => b.at - a.at);
  sorted.forEach(n => {
    const el = document.createElement('article'); el.className = 'note';
    el.innerHTML = `<div class="nh"><input type="text" value="${esc(n.title)}" placeholder="Room or topic" aria-label="Note title" list="rooms"><span class="when">${esc(fmtTime(n.at))}</span><button class="iconbtn" aria-label="Delete note" style="border:0;background:none">${I.trash}</button></div>
      <textarea placeholder="Write here…" aria-label="Note">${esc(n.body)}</textarea>`;
    const [ti, , del] = el.querySelector('.nh').children, ta = el.querySelector('textarea');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(140, ta.scrollHeight + 4) + 'px'; };
    ti.oninput = () => { n.title = ti.value; saveSoon(p); };
    ta.oninput = () => { n.body = ta.value; grow(); saveSoon(p); };
    del.onclick = async () => { if (n.body.trim() && !await confirmBox('Delete this note?', n.title || 'This note will be removed.')) return; p.notes = p.notes.filter(x => x !== n); await save(p); notes(p, pane); refreshTabs(p); };
    list.appendChild(el); requestAnimationFrame(grow);
  });
  pane.insertAdjacentHTML('beforeend', `<datalist id="rooms">${ROOMS.map(r => `<option value="${esc(r)}">`).join('')}</datalist>`);
  document.getElementById('addn').onclick = async () => { p.notes.push({ id: sid(), title: '', body: '', at: Date.now() }); await save(p); notes(p, pane); refreshTabs(p); const i = pane.querySelector('.note input'); if (i) i.focus(); };
  document.getElementById('addpg').onclick = () => newSheet(p, 'page', 'Page ' + (pages.length + 1), () => notes(p, pane));
  bindSheetCards(p, pane, () => notes(p, pane));
}

/* ---------- plans ---------- */
function plans(p, pane) {
  const list = p.sheets.filter(s => s.kind === 'plan');
  pane.innerHTML = `<main class="wrap">
    <div class="sectionhead"><h2>Layout plans</h2></div>
    <p class="muted small" style="margin:-6px 0 16px">Draw walls to scale (they snap to 5 cm and show their length), add doors, windows and furniture, then sketch on top with the Pencil. One square of the grid is 1 m.</p>
    <div class="sheets">${sheetCards(list)}<button class="sheet new" id="addpl">${I.plan}New layout plan</button></div></main>`;
  document.getElementById('addpl').onclick = async () => {
    const r = await dialog({ title: 'New layout plan', ok: 'Create', fields: [{ k: 'name', label: 'Name', value: list.length ? 'Plan ' + (list.length + 1) : 'Living room', placeholder: 'e.g. Ground floor' }] });
    if (r) newSheet(p, 'plan', r.name || 'Plan', () => plans(p, pane));
  };
  bindSheetCards(p, pane, () => plans(p, pane));
}
function sheetCards(list) {
  return list.sort((a, b) => b.updatedAt - a.updatedAt).map(s => `<div class="sheet" data-s="${s.id}" role="button" tabindex="0"><img class="th" alt="" data-th="${s.id}"><div class="b"><b>${esc(s.name || 'Untitled')}</b><span>${esc(fmtDate(new Date(s.updatedAt).toISOString()))}</span><button class="iconbtn" data-del="${s.id}" aria-label="Delete" style="border:0;background:none;min-height:36px;min-width:36px;padding:0">${I.trash}</button></div></div>`).join('');
}
const thumbCache = new Map();
function bindSheetCards(p, pane, rerender) {
  pane.querySelectorAll('[data-s]').forEach(el => {
    const s = p.sheets.find(x => x.id === el.dataset.s); if (!s) return;
    el.onclick = e => { if (e.target.closest('[data-del]')) return; openSheet(p, s, rerender); };
    el.onkeydown = e => { if (e.key === 'Enter') openSheet(p, s, rerender); };
    el.querySelector('[data-del]').onclick = async () => { if (!await confirmBox('Delete “' + (s.name || 'this drawing') + '”?', 'The drawing will be removed from the project.')) return; p.sheets = p.sheets.filter(x => x !== s); await save(p); rerender(); refreshTabs(p); };
    sheetThumb(p, s).then(u => { const im = el.querySelector('img'); if (im && u) im.src = u; });
  });
}
async function sheetThumb(p, s) {
  const key = s.id + ':' + s.updatedAt;
  if (thumbCache.has(key)) return thumbCache.get(key);
  let img = null;
  if (s.bg === 'photo') { const ph = p.photos.find(x => x.id === s.photoId); if (ph) { const u = await photoURL(p, ph, 'p'); if (u) img = await loadImage(u).catch(() => null); } }
  const u = D.thumb(s, img); thumbCache.set(key, u); return u;
}
async function newSheet(p, kind, name, rerender, extra = {}) {
  const s = Object.assign({ id: sid(), kind, name, bg: kind === 'plan' ? 'grid' : kind === 'page' ? 'lines' : 'photo', items: [], updatedAt: Date.now() }, extra);
  p.sheets.push(s); await save(p); refreshTabs(p);
  openSheet(p, s, rerender);
}
async function openSheet(p, s, rerender) {
  let img = null;
  if (s.bg === 'photo') {
    const ph = p.photos.find(x => x.id === s.photoId);
    const u = ph && await photoURL(p, ph, 'p');
    if (!u) { toast('The photo for this drawing is not on this iPad yet. Connect to the internet to download it.'); return; }
    img = await loadImage(u);
  }
  const host = document.createElement('div'); document.body.appendChild(host);
  document.body.style.overflow = 'hidden';
  D.open(host, s, {
    img,
    ask: (t, v) => dialog({ title: t, fields: [{ k: 'v', type: 'textarea', value: v }], ok: 'OK' }).then(r => r && r.v.trim()),
    onChange: sh => { sh.updatedAt = Date.now(); saveSoon(p); },
    onExport: (blob, sh) => shareBlob(blob, safeName((p.client.name || '') + ' ' + (sh.name || 'drawing')) + (sh.bg === 'photo' ? '.jpg' : '.png')),
    onClose: () => { host.remove(); document.body.style.overflow = ''; save(p); if (rerender) rerender(); }
  });
}

/* ---------- photos ---------- */
let newRoom = lsGet('hm-studio-room', 'Living room');
function photos(p, pane) {
  const marks = p.sheets.filter(s => s.kind === 'markup');
  const rooms = [...new Set(p.photos.map(x => x.room))].sort((a, b) => ROOMS.indexOf(a) - ROOMS.indexOf(b));
  pane.innerHTML = `<main class="wrap">
    <div class="sectionhead"><h2>Photos of the house</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <label class="small muted" style="display:flex;align-items:center;gap:8px">Room <select id="room" style="margin:0;min-height:44px;width:auto">${roomOptions(p, newRoom)}</select></label>
        <label class="btn ghost" style="cursor:pointer">${I.camera} Take photo<input type="file" accept="image/*" capture="environment" hidden id="cam"></label>
        <label class="btn" style="cursor:pointer">${I.plus} Add photos<input type="file" accept="image/*" multiple hidden id="lib"></label>
      </div></div>
    <div class="drop" id="drop" ${p.photos.length ? 'hidden' : ''}><p style="margin:0">Choose a room, then take photos or add them from your library. They’re saved in this project${Cloud.ready() ? ' and backed up to your cloud' : ''}.</p></div>
    ${marks.length ? `<div class="roomhead">Drawn on<span>${marks.length}</span></div><div class="sheets">${sheetCards(marks)}</div>` : ''}
    ${rooms.map(r => { const l = p.photos.filter(x => x.room === r); return `<div class="roomhead">${esc(r)}<span>${l.length}</span></div><div class="photos">${l.map(ph => `<button class="ph" data-ph="${ph.id}" aria-label="${esc(ph.caption || r)}"><img alt="" data-img="${ph.id}">${ph.caption ? `<span class="cap">${esc(ph.caption)}</span>` : ''}${ph.synced ? `<span class="cloud" title="Backed up">${I.cloud}</span>` : ''}</button>`).join('')}</div>`; }).join('')}
  </main>`;
  const sel = document.getElementById('room');
  sel.onchange = async () => {
    if (sel.value === '__new') { const r = await dialog({ title: 'New room', fields: [{ k: 'n', label: 'Room name', placeholder: 'e.g. Guest bedroom' }], ok: 'Add' }); if (r && r.n.trim()) { newRoom = r.n.trim(); p.rooms = [...new Set([...(p.rooms || []), newRoom])]; await save(p); } sel.innerHTML = roomOptions(p, newRoom); }
    else newRoom = sel.value;
    lsSet('hm-studio-room', newRoom);
  };
  const onFiles = async inp => { const fs = [...inp.files]; inp.value = ''; if (!fs.length) return; toast('Saving ' + fs.length + (fs.length === 1 ? ' photo…' : ' photos…'), 8000); await addPhotos(p, fs, newRoom); photos(p, pane); refreshTabs(p); };
  document.getElementById('cam').onchange = e => onFiles(e.target);
  document.getElementById('lib').onchange = e => onFiles(e.target);
  const dz = pane.querySelector('main');
  dz.addEventListener('dragover', e => { e.preventDefault(); document.getElementById('drop').classList.add('over'); });
  dz.addEventListener('drop', async e => { e.preventDefault(); await addPhotos(p, [...e.dataTransfer.files], newRoom); photos(p, pane); refreshTabs(p); });
  const order = rooms.flatMap(r => p.photos.filter(x => x.room === r));
  pane.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => lightbox(p, order, order.findIndex(x => x.id === b.dataset.ph), () => photos(p, pane)));
  p.photos.forEach(async ph => { const u = await photoURL(p, ph); const im = pane.querySelector(`[data-img="${ph.id}"]`); if (im && u) im.src = u; });
  bindSheetCards(p, pane, () => photos(p, pane));
}
function roomOptions(p, current) {
  const all = [...new Set([...ROOMS, ...(p.rooms || []), ...p.photos.map(x => x.room)])];
  if (!all.includes(current)) all.push(current);
  return all.map(r => `<option${r === current ? ' selected' : ''}>${esc(r)}</option>`).join('') + '<option value="__new">+ New room…</option>';
}
function lightbox(p, list, i, rerender) {
  const ov = document.createElement('div'); ov.className = 'lb'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  let dirty = false;
  const close = () => { ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', key); if (dirty) save(p); rerender(); };
  const key = e => { if (e.target.matches('input,select')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
  document.addEventListener('keydown', key);
  function go(d) { if (!list.length) return close(); i = (i + d + list.length) % list.length; show(); }
  async function show() {
    const ph = list[i]; if (!ph) return close();
    ov.innerHTML = `<div class="lbtop"><button class="iconbtn" data-a="close" aria-label="Close">${I.x}</button><span class="grow small" style="opacity:.75">${i + 1} / ${list.length} · ${esc(fmtTime(ph.at))}</span>
        <button class="btn ghost sm" data-a="draw">${I.pen} Draw on photo</button><button class="btn ghost sm" data-a="share">${I.share} Share</button><button class="btn ghost sm" data-a="del" aria-label="Delete photo">${I.trash}</button></div>
      <div class="stage"><img alt="${esc(ph.caption)}">${list.length > 1 ? `<button class="nav prev" data-a="prev" aria-label="Previous">${I.back}</button><button class="nav next" data-a="next" aria-label="Next">${I.next}</button>` : ''}</div>
      <div class="lbbot"><input class="cap" type="text" value="${esc(ph.caption)}" placeholder="Add a caption (what to change, measurements…)" aria-label="Caption"><select class="roomsel" aria-label="Room">${roomOptions(p, ph.room).replace('<option value="__new">+ New room…</option>', '')}</select></div>`;
    const im = ov.querySelector('.stage img');
    im.src = await photoURL(p, ph, 't'); photoURL(p, ph, 'p').then(u => { if (u && list[i] === ph) im.src = u; });
    ov.querySelector('.cap').oninput = e => { ph.caption = e.target.value; dirty = true; };
    ov.querySelector('.roomsel').onchange = e => { ph.room = e.target.value; dirty = true; };
    let sx = null; const st = ov.querySelector('.stage');
    st.onpointerdown = e => { sx = e.clientX; }; st.onpointerup = e => { if (sx != null && Math.abs(e.clientX - sx) > 60) go(e.clientX < sx ? 1 : -1); sx = null; };
  }
  ov.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return; const ph = list[i];
    if (a.dataset.a === 'close') close();
    if (a.dataset.a === 'prev') go(-1);
    if (a.dataset.a === 'next') go(1);
    if (a.dataset.a === 'share') { const b = await DB.get('blobs', 'p:' + ph.id) || await fetch(await photoURL(p, ph, 'p')).then(r => r.blob()); shareBlob(b, safeName((p.client.name || '') + ' ' + ph.room) + '.jpg'); }
    if (a.dataset.a === 'del') {
      if (!await confirmBox('Delete this photo?', 'It will be removed from the project.')) return;
      p.photos = p.photos.filter(x => x !== ph); if (ph.synced) p.trash = (p.trash || []).concat(ph.id);
      await DB.del('blobs', 'p:' + ph.id); await DB.del('blobs', 't:' + ph.id); urlCache.delete('p:' + ph.id); urlCache.delete('t:' + ph.id);
      list.splice(i, 1); dirty = true; refreshTabs(p); if (!list.length) close(); else go(0);
    }
    if (a.dataset.a === 'draw') {
      if (dirty) await save(p);
      ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', key);
      newSheet(p, 'markup', (ph.caption || ph.room) + ' (drawn)', rerender, { photoId: ph.id, pw: ph.w, ph: ph.h });
    }
  });
  show();
}

/* ---------- settings ---------- */
const SQL = `-- Home Muse Studio: run once in Supabase > SQL Editor
create table if not exists public.projects (
  id uuid primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index if not exists projects_owner_synced on public.projects (owner, synced_at);
create or replace function public.touch_synced_at() returns trigger language plpgsql as $$
begin new.synced_at = clock_timestamp(); return new; end $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before insert or update on public.projects
  for each row execute function public.touch_synced_at();
alter table public.projects enable row level security;
drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Private photo storage: each user only sees their own folder
insert into storage.buckets (id, name, public) values ('studio', 'studio', false)
  on conflict (id) do nothing;
drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects for all to authenticated
  using (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);`;

async function settings() {
  cur = null;
  const c = Cloud.cfg, s = Cloud.sess, out = (await DB.all('outbox')).length;
  let est = null; try { est = navigator.storage && await navigator.storage.estimate(); } catch (e) {}
  const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted().catch(() => false) : false;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  root.innerHTML = top({ back: '#/', title: 'Settings' }) + `<main class="wrap"><div class="grid2">
    <section class="card"><h2>Cloud sync</h2>
      ${Cloud.ready() ? `<p class="okline">${I.check.replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px"')} Signed in as ${esc(s.email)}</p>
        <p class="muted small">${lastSync ? 'Last sync ' + esc(fmtTime(lastSync)) : 'Not synced yet'}${syncErr ? ' · <span style="color:var(--danger)">' + esc(syncErr) + '</span>' : ''}</p>
        <p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="syncnow">${I.refresh} Sync now</button><button class="btn ghost" id="signout">Sign out</button></p>`
      : `<p class="muted">Projects and photos are saved on this iPad. Connect your own Supabase account to back them up and see them on other devices. Only you can sign in and read them.</p>
        <details ${c.url ? '' : 'open'}><summary><b style="font-weight:500">How to set it up (10 minutes, once)</b></summary>
          <ol class="steps small" style="margin-top:10px">
            <li>Create a free account at <b>supabase.com</b> and a new project (region: Europe).</li>
            <li>Open <b>SQL Editor</b>, paste the script below and press <b>Run</b>. <button class="btn ghost sm" id="copysql">${I.copy} Copy script</button></li>
            <li>Open <b>Authentication → Users → Add user</b>, and create yourself with your email and a password. Tick “Auto confirm”.</li>
            <li>Open <b>Authentication → Sign In / Providers</b> and turn off <b>Allow new users to sign up</b>, so nobody else can create an account.</li>
            <li>Open <b>Project Settings → API</b> (or <b>Data API</b>) and copy the <b>Project URL</b> and the <b>publishable</b> (or <b>anon public</b>) key into the fields below.</li>
          </ol>
          <details class="small"><summary>Show the script</summary><pre style="white-space:pre-wrap;font-size:12px;background:var(--bg);padding:10px;border:1px solid var(--line);border-radius:4px">${esc(SQL)}</pre></details>
        </details>
        <form id="cloudf" style="margin-top:16px">
          <label class="f">Project URL<input type="text" inputmode="url" autocapitalize="off" spellcheck="false" name="url" value="${esc(c.url || '')}" placeholder="https://xxxx.supabase.co" required autocomplete="off"></label>
          <label class="f">Publishable / anon key<input type="text" autocapitalize="off" spellcheck="false" name="key" value="${esc(c.key || '')}" placeholder="sb_publishable_… or eyJ…" required autocomplete="off"></label>
          <div class="row"><label class="f">Your email<input type="email" name="email" value="${esc(c.email || '')}" required autocomplete="username"></label>
          <label class="f">Password<input type="password" name="pw" required autocomplete="current-password"></label></div>
          <p class="err small" id="cerr" style="color:var(--danger)" hidden></p>
          <button class="btn" type="submit">${I.cloud} Connect</button>
        </form>`}
    </section>
    <div class="stack">
      <section class="card"><h2>On this iPad</h2>
        ${standalone ? '' : `<p><b style="font-weight:500">Add to Home Screen:</b> in Safari tap ${I.share.replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px"')} then “Add to Home Screen”. Studio then opens full screen like an app, works offline, and iPad keeps its data safe.</p>`}
        <p class="muted small" style="margin:0 0 10px">${live().length} project${live().length === 1 ? '' : 's'}${est ? ' · ' + (est.usage / 1048576).toFixed(0) + ' MB used' : ''}${persisted ? ' · protected storage' : ''}${out ? ` · ${out} email${out > 1 ? 's' : ''} waiting for a connection` : ''}</p>
        <p style="display:flex;gap:8px;flex-wrap:wrap;margin:0"><button class="btn ghost" id="backup">${I.download} Download a backup</button>
        <label class="btn ghost" style="cursor:pointer">${I.share} Restore a backup<input type="file" accept=".json,application/json" hidden id="restore"></label></p>
        <p class="muted small" style="margin:10px 0 0">The backup file holds every project with its photos. Save it to iCloud Drive or Files.</p>
      </section>
      <section class="card"><h2>Drawing</h2>
        <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="finger" ${(() => { try { return localStorage.getItem('hm-finger') === '1'; } catch (e) { return false; } })() ? 'checked' : ''} style="width:22px;height:22px"> Draw with my finger as well as the Pencil</label>
        <p class="muted small" style="margin:8px 0 0">When off, one finger scrolls the page and only the Apple Pencil draws. Two fingers always move and zoom.</p>
      </section>
    </div></div></main>`;
  bindCommon();
  const q = id => document.getElementById(id);
  if (q('copysql')) q('copysql').onclick = async e => { e.preventDefault(); try { await navigator.clipboard.writeText(SQL); toast('Script copied'); } catch (err) { toast('Select the script below and copy it'); } };
  if (q('cloudf')) q('cloudf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), err = q('cerr'); err.hidden = true;
    let url = String(f.get('url')).trim().replace(/\/+$/, ''); if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    Cloud.cfg = { url, key: String(f.get('key')).trim(), email: String(f.get('email')).trim() };
    const b = e.target.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Connecting…';
    try { await Cloud.signIn(Cloud.cfg.email, String(f.get('pw'))); toast('Connected. Syncing your projects…'); syncErr = ''; await sync(); settings(); }
    catch (x) { err.textContent = /Failed to fetch|Load failed/i.test(x.message) ? 'Could not reach that address. Check the Project URL and your connection.' : x.message; err.hidden = false; b.disabled = false; b.innerHTML = I.cloud + ' Connect'; }
  };
  if (q('syncnow')) q('syncnow').onclick = async () => { await sync(true); settings(); };
  if (q('signout')) q('signout').onclick = async () => { if (!await confirmBox('Sign out of cloud sync?', 'Your projects stay on this iPad. Changes will sync again when you sign back in.', 'Sign out')) return; Cloud.sess = null; settings(); };
  q('finger').onchange = e => { try { localStorage.setItem('hm-finger', e.target.checked ? '1' : '0'); } catch (x) {} };
  q('backup').onclick = backup;
  q('restore').onchange = e => restore(e.target.files[0]);
}
const toDataURL = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
async function backup() {
  toast('Preparing the backup…', 10000);
  const parts = ['{"app":"homemuse-studio","v":1,"exportedAt":' + JSON.stringify(new Date().toISOString()) + ',"projects":', JSON.stringify(live().map(clean)), ',"photos":{'];
  let first = true;
  for (const p of live()) for (const ph of p.photos) {
    let b = await DB.get('blobs', 'p:' + ph.id);
    if (!b && ph.synced && Cloud.ready()) { try { b = await Cloud.download(`${Cloud.sess.uid}/${p.id}/${ph.id}.jpg`); } catch (e) {} }
    if (!b) continue;
    parts.push((first ? '' : ',') + JSON.stringify(ph.id) + ':' + JSON.stringify(await toDataURL(b))); first = false;
  }
  parts.push('}}');
  await shareBlob(new Blob(parts, { type: 'application/json' }), 'home-muse-studio-backup-' + today() + '.json');
}
async function restore(file) {
  if (!file) return;
  let j; try { j = JSON.parse(await file.text()); } catch (e) { toast('That file is not a Studio backup'); return; }
  if (j.app !== 'homemuse-studio') { toast('That file is not a Studio backup'); return; }
  let n = 0;
  for (const p of j.projects || []) {
    const loc = mem.get(p.id);
    if (loc && loc.updatedAt >= p.updatedAt) continue;
    for (const ph of p.photos) { const d = j.photos && j.photos[ph.id]; if (d) { const b = await (await fetch(d)).blob(); await DB.put('blobs', b, 'p:' + ph.id); const img = await loadImage(d); await DB.put('blobs', (await resize(img, 520, 0.78)).blob, 't:' + ph.id); ph.synced = 0; } }
    if (loc) { Object.keys(loc).forEach(k => delete loc[k]); Object.assign(loc, p); } else mem.set(p.id, p);
    await save(mem.get(p.id), true); n++;
  }
  toast(n ? `Restored ${n} project${n > 1 ? 's' : ''}` : 'Nothing newer in that backup'); syncSoon(); settings();
}

/* ---------- router ---------- */
function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  if (!parts.length) return home();
  if (parts[0] === 'settings') return settings();
  if (parts[0] === 'p') { const p = mem.get(parts[1]); if (!p || p.deleted) { location.hash = '#/'; return; } return projectView(p, parts[2] || 'overview'); }
  location.hash = '#/';
}

/* ---------- start ---------- */
(async function start() {
  try { await DB.open(); }
  catch (e) { root.innerHTML = `<main class="wrap"><div class="empty"><h2>Storage is blocked</h2><p>Studio needs this browser’s storage. On iPad, open it in Safari (not a private window).</p></div></main>`; return; }
  for (const p of await DB.all('projects')) mem.set(p.id, p);
  window.addEventListener('hashchange', route);
  route();
  window.addEventListener('online', () => { pill(); sync(); flushOutbox(); });
  window.addEventListener('offline', pill);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  setInterval(() => { if (!document.hidden) sync(); }, 120000);
  sync(); flushOutbox();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/studio-sw.js', { scope: '/' }).catch(() => {});
})();
})();
