/* Home Muse Studio offline support. Registered only by /studio/ (Lou's iPad), never by the public site.
   It answers only for the Studio, the archetype quiz and the onboarding questionnaire;
   every other page of homemuse.fr goes straight to the network as usual. */
const CACHE = 'hm-studio-v1';
const SHELL = [
  '/studio/', '/studio/studio.css?v=1', '/studio/draw.js?v=1', '/studio/app.js?v=1', '/studio/manifest.webmanifest', '/studio/icon-180.png', '/studio/icon-512.png',
  '/quiz/', '/clarity/', '/favicon.svg', '/assets/consent.js?v=2',
  '/quiz/img/logo.png', '/quiz/img/REF.jpg', '/quiz/img/TAB.jpg', '/quiz/img/CAB.jpg', '/quiz/img/GAL.jpg', '/quiz/img/ATE.jpg', '/quiz/img/NID.jpg', '/quiz/img/SOL.jpg'
];
const MINE = /^\/(studio\/|quiz\/|clarity\/|favicon\.svg|assets\/consent\.js)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hm-studio-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === location.origin ? !MINE.test(url.pathname) : !fonts) return;
  if (fonts) { // fonts: cache first
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
    return;
  }
  // Studio, quiz, questionnaire: network first (so updates arrive), cache when offline
  e.respondWith((async () => {
    try {
      const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      return hit || caches.match(url.pathname.replace(/index\.html$/, ''), { ignoreSearch: true }) || Response.error();
    }
  })());
});
