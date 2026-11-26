/* Home Muse Studio: drawing editor for layout plans, handwritten pages and photo markup.
   Vector items, so plans stay sharp at any zoom and every wall or piece of furniture can be moved later.
   Units: on a plan, 1 world unit = 1 cm. On a photo, 1 unit = 1 image pixel. On a page, 1 unit = 1 px at 100%. */
(function () {
'use strict';

/* ---------- icons (shared with app.js) ---------- */
const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = window.HMI = {
  back: P('<path d="M15 18l-6-6 6-6"/>'),
  next: P('<path d="M9 18l6-6-6-6"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  x: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  cloud: P('<path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19z"/>'),
  check: P('<path d="M20 6L9 17l-5-5"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  arch: P('<path d="M5 21V11a7 7 0 0 1 14 0v10"/><path d="M3 21h18"/><circle cx="12" cy="10" r="1.6"/>'),
  clip: P('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
  note: P('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  plan: P('<path d="M3 3h18v18H3z"/><path d="M3 12h7v9M10 3v5M14 21v-6h7"/>'),
  camera: P('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  select: P('<path d="M5 3l14 8-6 1.5L10 19z"/>'),
  pen: P('<path d="M16.5 3.5l4 4L8 20H4v-4z"/><path d="M14 6l4 4"/>'),
  hl: P('<path d="M9 11l-5 5v3h6l5-5"/><path d="M14 4l6 6-6 6-6-6z"/>'),
  eraser: P('<path d="M7 21h13"/><path d="M5.5 14.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H8z"/><path d="M9 11l5 5"/>'),
  wall: P('<path d="M4 20V6h16"/><path d="M4 6l3-3M8 6l3-3M12 6l3-3M16 6l3-3"/>'),
  ruler: P('<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'),
  arrow: P('<path d="M5 19L19 5M10 5h9v9"/>'),
  circle: P('<ellipse cx="12" cy="12" rx="9" ry="7"/>'),
  text: P('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  sofa: P('<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 12a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 17v2M19 17v2"/>'),
  undo: P('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: P('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  hand: P('<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 10V3.5a1.5 1.5 0 0 1 3 0V10M14 10V5a1.5 1.5 0 0 1 3 0v8"/><path d="M17 9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 15.5a1.6 1.6 0 0 1 2.5-2L8 15"/>'),
  share: P('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
  trash: P('<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>'),
  copy: P('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
  rotl: P('<path d="M3 4v5h5"/><path d="M3.5 13a8.5 8.5 0 1 0 2-7L3 9"/>'),
  rotr: P('<path d="M21 4v5h-5"/><path d="M20.5 13a8.5 8.5 0 1 1-2-7L21 9"/>'),
  expand: P('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  lock: P('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  fit: P('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  grid: P('<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>'),
  download: P('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
  refresh: P('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  edit: P('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')
};

/* ---------- constants ---------- */
const INK = '#2b3328';
const COLORS = ['#2b3328', '#9c7a45', '#4f6b45', '#a2483a', '#3d6a8f', '#8a8578', '#ffffff'];
const HL = ['#f4d35e', '#a8d5a2', '#f2b8b5', '#9cc8e8'];
const WIDTHS = [1.6, 3.2, 6.4];
const PAPER = '#fbf8f1';
const FONT = 'Jost, "Helvetica Neue", Arial, sans-serif';

/* Furniture library: key, label, default width x depth in cm. */
const FURN = [
  ['sofa', 'Sofa', 220, 95], ['armchair', 'Armchair', 85, 85], ['bed2', 'Double bed', 160, 200], ['bed1', 'Single bed', 90, 200],
  ['dining', 'Dining table', 180, 90], ['round', 'Round table', 110, 110], ['coffee', 'Coffee table', 110, 60], ['side', 'Side table', 45, 45],
  ['rug', 'Rug', 200, 300], ['desk', 'Desk', 120, 60], ['wardrobe', 'Wardrobe', 120, 60], ['sideboard', 'Sideboard', 160, 45],
  ['shelf', 'Bookshelf', 80, 30], ['tv', 'TV unit', 160, 40], ['plant', 'Plant', 45, 45], ['lamp', 'Floor lamp', 35, 35],
  ['door', 'Door', 80, 80], ['window', 'Window', 120, 15], ['counter', 'Kitchen run', 240, 62], ['island', 'Island', 180, 90],
  ['bath', 'Bathtub', 170, 75], ['shower', 'Shower', 90, 90], ['wc', 'Toilet', 40, 65], ['basin', 'Basin', 60, 45],
  ['stairs', 'Stairs', 100, 260], ['box', 'Rectangle', 100, 60], ['disc', 'Circle', 60, 60]
];
const FURN_BY = Object.fromEntries(FURN.map(f => [f[0], f]));

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const fmtLen = cm => (cm / 100).toFixed(2).replace('.', ',') + ' m';

/* ---------- geometry ---------- */
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function toLocal(it, x, y) {
  const a = -(it.r || 0) * Math.PI / 180, dx = x - it.x, dy = y - it.y;
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}
function fromLocal(it, lx, ly) {
  const a = (it.r || 0) * Math.PI / 180;
  return [it.x + lx * Math.cos(a) - ly * Math.sin(a), it.y + lx * Math.sin(a) + ly * Math.cos(a)];
}
function textBox(it) {
  const lines = String(it.text || '').split('\n'), sz = it.size || 18;
  const w = Math.max(...lines.map(l => l.length), 1) * sz * 0.56, h = lines.length * sz * 1.25;
  return [it.x, it.y, w, h];
}
function hit(it, x, y, tol) {
  switch (it.t) {
    case 'stroke': {
      const p = it.pts, w = it.w / 2 * (it.hl ? 1 : 1.2);
      if (p.length < 6) return Math.hypot(x - p[0], y - p[1]) <= tol + w;
      for (let i = 3; i < p.length; i += 3) if (distSeg(x, y, p[i - 3], p[i - 2], p[i], p[i + 1]) <= tol + w) return true;
      return false;
    }
    case 'wall': return distSeg(x, y, it.a[0], it.a[1], it.b[0], it.b[1]) <= tol + (it.th || 10) / 2;
    case 'dim': case 'arrow': return distSeg(x, y, it.a[0], it.a[1], it.b[0], it.b[1]) <= tol + (it.w || 2);
    case 'text': { const [bx, by, w, h] = textBox(it); return x >= bx - tol && x <= bx + w + tol && y >= by - tol && y <= by + h + tol; }
    case 'ell': case 'f': { const [lx, ly] = toLocal(it, x, y); return Math.abs(lx) <= it.w / 2 + tol && Math.abs(ly) <= it.h / 2 + tol; }
  }
  return false;
}
function bounds(items) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y, m = 0) => { x0 = Math.min(x0, x - m); y0 = Math.min(y0, y - m); x1 = Math.max(x1, x + m); y1 = Math.max(y1, y + m); };
  for (const it of items) {
    if (it.t === 'stroke') for (let i = 0; i < it.pts.length; i += 3) add(it.pts[i], it.pts[i + 1], it.w);
    else if (it.a) { add(it.a[0], it.a[1], (it.th || 10)); add(it.b[0], it.b[1], (it.th || 10)); }
    else if (it.t === 'text') { const [bx, by, w, h] = textBox(it); add(bx, by); add(bx + w, by + h); }
    else if (it.w != null) { [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const [px, py] = fromLocal(it, sx * it.w / 2, sy * it.h / 2); add(px, py); }); if (it.t === 'f' && /^(dining|round|desk)$/.test(it.k)) { const [cx, cy] = [it.x, it.y]; add(cx, cy, Math.max(it.w, it.h) / 2 + 45); } }
  }
  return x0 === Infinity ? null : [x0, y0, x1, y1];
}
function moveItem(it, dx, dy) {
  if (it.t === 'stroke') { for (let i = 0; i < it.pts.length; i += 3) { it.pts[i] = r1(it.pts[i] + dx); it.pts[i + 1] = r1(it.pts[i + 1] + dy); } }
  else if (it.a) { it.a = [r1(it.a[0] + dx), r1(it.a[1] + dy)]; it.b = [r1(it.b[0] + dx), r1(it.b[1] + dy)]; }
  else { it.x = r1(it.x + dx); it.y = r1(it.y + dy); }
}

/* ---------- drawing primitives ---------- */
function rr(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function box(c, x, y, w, h, r = 0) { rr(c, x, y, w, h, r); c.fill(); c.stroke(); }
function line(c, ax, ay, bx, by) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circ(c, x, y, r, fill = true) { c.beginPath(); c.arc(x, y, Math.max(r, 0.1), 0, Math.PI * 2); if (fill) c.fill(); c.stroke(); }

/* Furniture symbols, drawn centred on 0,0 with width w (x) and depth h (y). */
function drawFurn(c, k, w, h, lw) {
  const L = -w / 2, T = -h / 2, R = w / 2, B = h / 2;
  switch (k) {
    case 'sofa': case 'armchair': {
      const bd = h * 0.24, aw = Math.min(w * 0.14, 22);
      box(c, L, T, w, h, 6); line(c, L + aw, T + bd, R - aw, T + bd);
      line(c, L + aw, T + bd, L + aw, B); line(c, R - aw, T + bd, R - aw, B);
      const n = k === 'armchair' ? 1 : Math.max(1, Math.round((w - 2 * aw) / 70));
      for (let i = 1; i < n; i++) { const x = L + aw + i * (w - 2 * aw) / n; line(c, x, T + bd, x, B); }
      break;
    }
    case 'bed1': case 'bed2': {
      box(c, L, T, w, h, 4);
      const n = k === 'bed2' && w >= 120 ? 2 : 1, ph = Math.min(30, h * 0.15), gap = 8, pw = (w - gap * (n + 1)) / n;
      for (let i = 0; i < n; i++) box(c, L + gap + i * (pw + gap), T + gap, pw, ph, 6);
      const y = T + h * 0.3; line(c, L, y, R, y); line(c, L, y + 18, L + 24, y);
      break;
    }
    case 'dining': {
      const n = Math.max(1, Math.floor(w / 65)), cw = 44, cd = 40;
      for (let i = 0; i < n; i++) { const x = L + (i + 0.5) * w / n - cw / 2; box(c, x, T - cd + 8, cw, cd, 6); box(c, x, B - 8, cw, cd, 6); }
      if (h >= 80) { box(c, L - cd + 8, -cw / 2, cd, cw, 6); box(c, R - 8, -cw / 2, cd, cw, 6); }
      box(c, L, T, w, h, 2);
      break;
    }
    case 'round': {
      const rad = w / 2, n = Math.max(3, Math.round(Math.PI * w / 70));
      for (let i = 0; i < n; i++) { c.save(); c.rotate(i * 2 * Math.PI / n); box(c, -22, -rad - 32, 44, 40, 6); c.restore(); }
      c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      break;
    }
    case 'coffee': box(c, L, T, w, h, 8); break;
    case 'side': case 'disc': c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.stroke(); break;
    case 'plant': {
      c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * Math.PI / 3); c.beginPath(); c.ellipse(0, -h * 0.22, w * 0.1, h * 0.2, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
      break;
    }
    case 'lamp': c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.stroke(); line(c, L * 0.7, T * 0.7, R * 0.7, B * 0.7); line(c, R * 0.7, T * 0.7, L * 0.7, B * 0.7); break;
    case 'rug': {
      c.save(); c.setLineDash([lw * 4, lw * 3]); box(c, L, T, w, h, 2); c.restore();
      rr(c, L + 10, T + 10, w - 20, h - 20, 2); c.stroke();
      for (let x = L + 6; x < R; x += 10) { line(c, x, T, x, T - 6); line(c, x, B, x, B + 6); }
      break;
    }
    case 'desk': circ(c, 0, B + 22, 22); box(c, L, T, w, h, 2); break;
    case 'wardrobe': box(c, L, T, w, h, 1); line(c, 0, T, 0, B); line(c, L, T, 0, B); line(c, 0, T, L, B); line(c, 0, T, R, B); line(c, R, T, 0, B); break;
    case 'sideboard': case 'counter': box(c, L, T, w, h, 1); rr(c, L + 4, T + 4, w - 8, h - 8, 1); c.stroke(); if (k === 'counter') { box(c, L + w * 0.62, T + 8, Math.min(55, w * 0.25), h - 16, 6); circ(c, L + w * 0.2, 0, Math.min(10, h * 0.16)); circ(c, L + w * 0.32, 0, Math.min(10, h * 0.16)); } break;
    case 'island': box(c, L, T, w, h, 2); rr(c, L + 6, T + 6, w - 12, h - 12, 2); c.stroke(); break;
    case 'shelf': box(c, L, T, w, h, 1); for (let x = L + w / 4; x < R - 1; x += w / 4) line(c, x, T, x, B); break;
    case 'tv': box(c, L, T, w, h, 1); c.save(); c.lineWidth = lw * 2.2; line(c, L + w * 0.15, T + h * 0.3, R - w * 0.15, T + h * 0.3); c.restore(); break;
    case 'door': {
      c.save(); c.fillStyle = 'transparent';
      line(c, L, B, L, T); c.setLineDash([lw * 3, lw * 3]); c.beginPath(); c.arc(L, B, w, -Math.PI / 2, 0); c.stroke(); c.setLineDash([]);
      c.globalAlpha *= 0.5; line(c, L, B, R, B); c.restore();
      break;
    }
    case 'window': box(c, L, T, w, h, 0); line(c, L, 0, R, 0); line(c, L, T + h * 0.25, R, T + h * 0.25); line(c, L, B - h * 0.25, R, B - h * 0.25); break;
    case 'bath': box(c, L, T, w, h, 8); rr(c, L + 7, T + 7, w - 14, h - 14, Math.min(h, w) * 0.4); c.stroke(); circ(c, L + w * 0.15, 0, 3); break;
    case 'shower': box(c, L, T, w, h, 1); line(c, L, T, R, B); line(c, R, T, L, B); circ(c, 0, 0, 4); break;
    case 'wc': box(c, L + w * 0.05, T, w * 0.9, h * 0.28, 3); c.beginPath(); c.ellipse(0, T + h * 0.28 + h * 0.36, w / 2, h * 0.36, 0, 0, Math.PI * 2); c.fill(); c.stroke(); break;
    case 'basin': box(c, L, T, w, h, 4); c.beginPath(); c.ellipse(0, h * 0.06, w * 0.34, h * 0.3, 0, 0, Math.PI * 2); c.stroke(); circ(c, 0, T + h * 0.14, 2.5); break;
    case 'stairs': {
      box(c, L, T, w, h, 0); for (let y = T + 26; y < B - 1; y += 26) line(c, L, y, R, y);
      c.save(); c.lineWidth = lw * 1.2; line(c, 0, B - 12, 0, T + 16); line(c, -8, T + 28, 0, T + 16); line(c, 8, T + 28, 0, T + 16); c.restore();
      break;
    }
    default: box(c, L, T, w, h, 2);
  }
}

/* ---------- render ---------- */
function drawBackground(c, sheet, view, W, H) {
  const s = view.s;
  if (sheet.bg === 'photo') { c.fillStyle = '#2a2925'; c.fillRect(0, 0, W, H); }
  else { c.fillStyle = PAPER; c.fillRect(0, 0, W, H); }
  if (sheet.bg === 'grid') {
    const steps = [[10, 'rgba(156,122,69,.10)'], [50, 'rgba(156,122,69,.16)'], [100, 'rgba(156,122,69,.32)']];
    for (const [st, col] of steps) {
      if (st * s < 7) continue;
      c.strokeStyle = col; c.lineWidth = 1; c.beginPath();
      const x0 = Math.floor(view.x / st) * st, y0 = Math.floor(view.y / st) * st;
      for (let x = x0; x < view.x + W / s; x += st) { const sx = Math.round((x - view.x) * s) + .5; c.moveTo(sx, 0); c.lineTo(sx, H); }
      for (let y = y0; y < view.y + H / s; y += st) { const sy = Math.round((y - view.y) * s) + .5; c.moveTo(0, sy); c.lineTo(W, sy); }
      c.stroke();
    }
  } else if (sheet.bg === 'lines') {
    const st = 36; c.strokeStyle = 'rgba(61,106,143,.20)'; c.lineWidth = 1; c.beginPath();
    for (let y = Math.floor(view.y / st) * st; y < view.y + H / s; y += st) { const sy = Math.round((y - view.y) * s) + .5; c.moveTo(0, sy); c.lineTo(W, sy); }
    c.stroke();
    const mx = (60 - view.x) * s; c.strokeStyle = 'rgba(162,72,58,.25)'; c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx, H); c.stroke();
  }
}

function labelAlong(c, ax, ay, bx, by, text, off, px, color) {
  let ang = Math.atan2(by - ay, bx - ax); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  c.save(); c.translate(mx, my); c.rotate(ang); c.translate(0, -off);
  c.font = `500 ${px}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
  const tw = c.measureText(text).width;
  c.fillStyle = 'rgba(251,248,241,.85)'; c.fillRect(-tw / 2 - px * .25, -px * 1.15, tw + px * .5, px * 1.2);
  c.fillStyle = color; c.fillText(text, 0, 0); c.restore();
}

function drawItem(c, it, s, sheet) {
  const px = 1 / s; // one screen pixel in world units
  c.lineCap = 'round'; c.lineJoin = 'round';
  const col = it.c || INK;
  switch (it.t) {
    case 'stroke': {
      const p = it.pts, n = p.length / 3;
      c.strokeStyle = col; c.fillStyle = col;
      if (it.hl) {
        c.save(); c.globalAlpha = 0.38; c.globalCompositeOperation = 'multiply'; c.lineWidth = it.w;
        c.beginPath(); c.moveTo(p[0], p[1]);
        if (n === 1) c.lineTo(p[0] + .01, p[1]);
        for (let i = 1; i < n - 1; i++) { const mx = (p[i * 3] + p[i * 3 + 3]) / 2, my = (p[i * 3 + 1] + p[i * 3 + 4]) / 2; c.quadraticCurveTo(p[i * 3], p[i * 3 + 1], mx, my); }
        if (n > 1) c.lineTo(p[(n - 1) * 3], p[(n - 1) * 3 + 1]);
        c.stroke(); c.restore(); break;
      }
      if (n === 1) { c.beginPath(); c.arc(p[0], p[1], it.w * (0.35 + p[2]) / 2, 0, Math.PI * 2); c.fill(); break; }
      if (!it.pr) { // constant width
        c.lineWidth = it.w; c.beginPath(); c.moveTo(p[0], p[1]);
        for (let i = 1; i < n - 1; i++) { const mx = (p[i * 3] + p[i * 3 + 3]) / 2, my = (p[i * 3 + 1] + p[i * 3 + 4]) / 2; c.quadraticCurveTo(p[i * 3], p[i * 3 + 1], mx, my); }
        c.lineTo(p[(n - 1) * 3], p[(n - 1) * 3 + 1]); c.stroke(); break;
      }
      let lx = p[0], ly = p[1];
      for (let i = 1; i < n; i++) {
        const x = p[i * 3], y = p[i * 3 + 1], pr = p[i * 3 + 2];
        const nx = i < n - 1 ? (x + p[i * 3 + 3]) / 2 : x, ny = i < n - 1 ? (y + p[i * 3 + 4]) / 2 : y;
        c.lineWidth = it.w * (0.35 + pr * 1.1); c.beginPath(); c.moveTo(lx, ly); c.quadraticCurveTo(x, y, nx, ny); c.stroke();
        lx = nx; ly = ny;
      }
      break;
    }
    case 'wall': {
      const [ax, ay] = it.a, [bx, by] = it.b, th = it.th || 10;
      c.strokeStyle = col; c.lineWidth = th; c.lineCap = 'square'; line(c, ax, ay, bx, by);
      const len = Math.hypot(bx - ax, by - ay);
      if (len * s > 30) labelAlong(c, ax, ay, bx, by, it.label || fmtLen(len), th / 2 + 5 * px, 13 * px, '#5f6656');
      break;
    }
    case 'dim': {
      const [ax, ay] = it.a, [bx, by] = it.b, ang = Math.atan2(by - ay, bx - ax), tk = 7 * px;
      const nx = -Math.sin(ang) * tk, ny = Math.cos(ang) * tk;
      c.strokeStyle = col; c.lineWidth = 1.4 * px;
      line(c, ax, ay, bx, by); line(c, ax - nx, ay - ny, ax + nx, ay + ny); line(c, bx - nx, by - ny, bx + nx, by + ny);
      const txt = it.label || (sheet.bg === 'grid' ? fmtLen(Math.hypot(bx - ax, by - ay)) : '');
      if (txt) labelAlong(c, ax, ay, bx, by, txt, 4 * px, 14 * px, col);
      break;
    }
    case 'arrow': {
      const [ax, ay] = it.a, [bx, by] = it.b, ang = Math.atan2(by - ay, bx - ax), hs = Math.max(it.w * 4, 12 * px);
      c.strokeStyle = col; c.lineWidth = it.w; line(c, ax, ay, bx, by);
      c.beginPath(); c.moveTo(bx - hs * Math.cos(ang - .45), by - hs * Math.sin(ang - .45)); c.lineTo(bx, by); c.lineTo(bx - hs * Math.cos(ang + .45), by - hs * Math.sin(ang + .45)); c.stroke();
      break;
    }
    case 'ell': {
      c.strokeStyle = col; c.lineWidth = it.lw || 3; c.beginPath(); c.ellipse(it.x, it.y, Math.abs(it.w / 2), Math.abs(it.h / 2), (it.r || 0) * Math.PI / 180, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'text': {
      const sz = it.size || 18; c.fillStyle = col; c.font = `400 ${sz}px ${FONT}`; c.textBaseline = 'top'; c.textAlign = 'left';
      String(it.text || '').split('\n').forEach((l, i) => c.fillText(l, it.x, it.y + i * sz * 1.25));
      break;
    }
    case 'f': {
      c.save(); c.translate(it.x, it.y); c.rotate((it.r || 0) * Math.PI / 180);
      c.strokeStyle = col; c.fillStyle = 'rgba(255,253,248,.92)'; c.lineWidth = 1.5 * px;
      drawFurn(c, it.k, it.w, it.h, 1.5 * px);
      if (it.label && Math.min(it.w, it.h) * s > 26) {
        const fs = 12 * px, rot = ((it.r || 0) % 360 + 360) % 360; if (rot > 90 && rot <= 270) c.rotate(Math.PI);
        c.font = `400 ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(it.label, 0, 0);
      }
      c.restore();
      break;
    }
  }
}

function render(c, sheet, view, W, H, opt = {}) {
  const dpr = opt.dpr || 1, s = view.s;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(c, sheet, view, W, H);
  c.setTransform(dpr * s, 0, 0, dpr * s, -view.x * s * dpr, -view.y * s * dpr);
  if (sheet.bg === 'photo' && opt.img) c.drawImage(opt.img, 0, 0, sheet.pw || opt.img.naturalWidth, sheet.ph || opt.img.naturalHeight);
  for (const it of sheet.items) if (it !== opt.skip) drawItem(c, it, s, sheet);
  if (opt.extra) drawItem(c, opt.extra, s, sheet);
  if (opt.sel) drawSelection(c, opt.sel, s);
}

function handles(it, s) {
  const px = 1 / s, out = [];
  if (it.a) { out.push(['a', it.a[0], it.a[1]], ['b', it.b[0], it.b[1]]); }
  else if (it.t === 'f' || it.t === 'ell') {
    const [sx, sy] = fromLocal(it, it.w / 2, it.h / 2); out.push(['size', sx, sy]);
    const [rx, ry] = fromLocal(it, 0, -it.h / 2 - 28 * px); out.push(['rot', rx, ry]);
  }
  return out;
}
function drawSelection(c, it, s) {
  const px = 1 / s;
  c.save(); c.strokeStyle = '#9c7a45'; c.lineWidth = 1.5 * px; c.setLineDash([5 * px, 4 * px]);
  if (it.t === 'f' || it.t === 'ell') {
    c.translate(it.x, it.y); c.rotate((it.r || 0) * Math.PI / 180);
    c.strokeRect(-it.w / 2 - 4 * px, -it.h / 2 - 4 * px, it.w + 8 * px, it.h + 8 * px);
    c.setLineDash([]); line(c, 0, -it.h / 2 - 4 * px, 0, -it.h / 2 - 28 * px);
  } else if (it.a) {
    /* endpoints only */
  } else {
    const b = bounds([it]); if (b) c.strokeRect(b[0] - 4 * px, b[1] - 4 * px, b[2] - b[0] + 8 * px, b[3] - b[1] + 8 * px);
  }
  c.restore();
  c.save(); c.setLineDash([]);
  for (const [k, x, y] of handles(it, s)) {
    c.beginPath(); c.arc(x, y, 9 * px, 0, Math.PI * 2); c.fillStyle = k === 'rot' ? '#fff' : '#9c7a45'; c.fill();
    c.lineWidth = 2 * px; c.strokeStyle = k === 'rot' ? '#9c7a45' : '#fff'; c.stroke();
  }
  c.restore();
}

/* Fit a view so that the given world rect fills W x H with a margin. */
function fitView(rect, W, H, margin = 40, maxS = 3) {
  const [x0, y0, x1, y1] = rect, w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1);
  const s = Math.min((W - margin * 2) / w, (H - margin * 2) / h, maxS);
  return { s, x: (x0 + x1) / 2 - W / 2 / s, y: (y0 + y1) / 2 - H / 2 / s };
}
function sheetRect(sheet) {
  if (sheet.bg === 'photo') return [0, 0, sheet.pw || 1000, sheet.ph || 750];
  const b = bounds(sheet.items);
  if (!b) return sheet.bg === 'grid' ? [-300, -220, 300, 220] : [0, 0, 800, 600];
  return b;
}

/* Thumbnail data URL (for lists) */
function thumb(sheet, img, W = 400, H = 300) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  render(c, sheet, fitView(sheetRect(sheet), W, H, sheet.bg === 'photo' ? 0 : 18, 2), W, H, { img });
  return cv.toDataURL('image/jpeg', 0.8);
}

/* Full-resolution PNG export */
function exportBlob(sheet, img, name) {
  const r = sheetRect(sheet), maxSide = 2400;
  const photo = sheet.bg === 'photo';
  const pad = photo ? 0 : 80, rw = r[2] - r[0] + pad * 2, rh = r[3] - r[1] + pad * 2;
  const s = Math.min(maxSide / rw, maxSide / rh, photo ? maxSide / rw : 4);
  const W = Math.round(rw * s), H = Math.round(rh * s) + (photo ? 0 : 60);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  render(c, sheet, { s, x: r[0] - pad, y: r[1] - pad }, W, H, { img });
  if (!photo) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#5f6656'; c.font = `400 22px ${FONT}`; c.textBaseline = 'bottom';
    c.fillText((name || 'Home Muse') + (sheet.bg === 'grid' ? '  ·  grid: 1 square = 1 m' : ''), 28, H - 22);
    c.textAlign = 'right'; c.font = `italic 500 26px "Cormorant Garamond", Georgia, serif`; c.fillStyle = '#9c7a45'; c.fillText('Home Muse', W - 28, H - 20);
  }
  return new Promise(res => cv.toBlob(res, photo ? 'image/jpeg' : 'image/png', 0.9));
}

/* ======================================================================
   Editor
   ====================================================================== */
function open(host, sheet, opt) {
  const plan = sheet.bg === 'grid', photo = sheet.bg === 'photo';
  const unit = photo ? Math.max(sheet.pw || 1000, sheet.ph || 750) / 900 : 1;
  const ask = opt.ask || ((t, v) => Promise.resolve(window.prompt(t, v || '')));
  let fingerPref = null; try { fingerPref = localStorage.getItem('hm-finger'); } catch (e) {}
  let penSeen = false; try { penSeen = localStorage.getItem('hm-pen') === '1'; } catch (e) {}
  const fingerDraws = () => fingerPref === '1' || (fingerPref !== '0' && !penSeen);

  const st = {
    tool: 'pen', color: INK, hlColor: HL[0], width: 1, sel: null,
    view: { s: 1, x: 0, y: 0 }, undo: [], redo: []
  };

  const TOOLS = [
    ['select', 'Select and move', I.select],
    ['pen', 'Pen', I.pen],
    ['hl', 'Highlighter', I.hl],
    ['eraser', 'Eraser', I.eraser],
    null,
    plan && ['wall', 'Wall', I.wall],
    ['dim', plan ? 'Measurement' : 'Measurement (you type the size)', I.ruler],
    ['arrow', 'Arrow', I.arrow],
    ['ell', 'Circle', I.circle],
    ['text', 'Text', I.text],
    plan && ['furn', 'Furniture', I.sofa]
  ].filter(x => x !== false);

  host.innerHTML = `<div class="ed" role="dialog" aria-label="Drawing">
    <div class="bar">
      <button class="iconbtn" data-a="close" aria-label="Done">${I.back}<span>Done</span></button>
      <input class="nm" value="" aria-label="Name">
      <button class="iconbtn" data-a="undo" aria-label="Undo">${I.undo}</button>
      <button class="iconbtn" data-a="redo" aria-label="Redo">${I.redo}</button>
      <button class="iconbtn" data-a="finger" aria-label="Draw with finger" title="Draw with finger">${I.hand}<span class="fl"></span></button>
      <button class="iconbtn" data-a="share" aria-label="Export image">${I.share}<span>Export</span></button>
    </div>
    <div class="cv">
      <canvas></canvas>
      <div class="tools" role="toolbar" aria-label="Tools">${TOOLS.map(t => t ? `<button class="tool" data-t="${t[0]}" aria-label="${t[1]}" title="${t[1]}">${t[2]}</button>` : '<hr>').join('')}</div>
      <div class="style"></div>
      <div class="zoomind"><button data-a="fit" aria-label="Fit to screen">${I.fit}</button><button data-a="zoom" class="zl">100%</button></div>
      <div class="props" hidden></div>
      <div class="palette" hidden></div>
      <div class="hint" hidden></div>
    </div></div>`;
  const root = host.firstElementChild, cv = root.querySelector('canvas'), wrap = root.querySelector('.cv');
  const ctx = cv.getContext('2d');
  const $ = s => root.querySelector(s);
  const nm = $('.nm'); nm.value = sheet.name || '';
  nm.oninput = () => { sheet.name = nm.value; changed(); };

  let W = 0, H = 0, dpr = 1, raf = 0, base = null;
  function resize() {
    const r = wrap.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); draw();
  }
  function draw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); }
  function paint() {
    if (base && action && (action.kind === 'stroke')) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr * st.view.s, 0, 0, dpr * st.view.s, -st.view.x * st.view.s * dpr, -st.view.y * st.view.s * dpr);
      drawItem(ctx, action.item, st.view.s, sheet);
    } else {
      render(ctx, sheet, st.view, W, H, { dpr, img: opt.img, sel: st.sel, extra: action && action.preview });
    }
    $('.zl').textContent = plan ? zoomLabel() : Math.round(st.view.s / (photo ? fitScale() : 1) * 100) + '%';
  }
  function zoomLabel() { const m = 100 * st.view.s; return m >= 100 ? '1 m = ' + Math.round(m) + ' px' : Math.round(st.view.s * 100) + '%'; }
  function fitScale() { return fitView(sheetRect(sheet), W, H, 0, 50).s; }
  function fit() {
    if (plan && !sheet.items.length) st.view = { s: 1.4, x: -W / 2 / 1.4, y: -H / 2 / 1.4 };
    else st.view = fitView(sheetRect(sheet), W, H, photo ? 10 : 70, photo ? 50 : 2.2);
    draw();
  }

  /* ---------- history ---------- */
  const snap = () => { st.undo.push(JSON.stringify(sheet.items)); if (st.undo.length > 100) st.undo.shift(); st.redo = []; };
  function undo() { if (!st.undo.length) return; st.redo.push(JSON.stringify(sheet.items)); sheet.items = JSON.parse(st.undo.pop()); st.sel = null; props(); changed(); draw(); }
  function redo() { if (!st.redo.length) return; st.undo.push(JSON.stringify(sheet.items)); sheet.items = JSON.parse(st.redo.pop()); st.sel = null; props(); changed(); draw(); }
  let chT = 0;
  function changed() { clearTimeout(chT); chT = setTimeout(() => opt.onChange && opt.onChange(sheet), 400); }

  /* ---------- toolbar ---------- */
  function setTool(t) {
    if (t === 'furn') { togglePalette(); return; }
    st.tool = t; if (t !== 'select') { st.sel = null; props(); }
    $('.palette').hidden = true;
    root.querySelectorAll('.tool').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
    styleBar(); draw();
  }
  function styleBar() {
    const isHl = st.tool === 'hl';
    const cols = isHl ? HL : COLORS, cur = isHl ? st.hlColor : st.color;
    const showW = /^(pen|hl|arrow|ell)$/.test(st.tool);
    $('.style').innerHTML = cols.map(c => `<button class="dot" data-c="${c}" aria-label="Colour ${c}" aria-pressed="${c === cur}"><i style="background:${c};${c === '#ffffff' ? 'box-shadow:inset 0 0 0 1px #ccc' : ''}"></i></button>`).join('') +
      (showW ? '<span class="vsep"></span>' + WIDTHS.map((w, i) => `<button class="wbtn" data-w="${i}" aria-label="Thickness ${i + 1}" aria-pressed="${i === st.width}"><i style="height:${2 + i * 3}px"></i></button>`).join('') : '');
    $('.style').querySelectorAll('.dot').forEach(b => b.onclick = () => {
      if (isHl) st.hlColor = b.dataset.c; else st.color = b.dataset.c;
      if (st.sel && !st.sel.hl) { snap(); st.sel.c = b.dataset.c; changed(); }
      styleBar(); draw();
    });
    $('.style').querySelectorAll('.wbtn').forEach(b => b.onclick = () => { st.width = +b.dataset.w; styleBar(); });
  }
  function fingerLabel() { const b = $('[data-a=finger]'); b.setAttribute('aria-pressed', String(fingerDraws())); b.querySelector('.fl').textContent = fingerDraws() ? 'Finger draws' : 'Finger scrolls'; }
  root.querySelectorAll('.tool').forEach(b => b.onclick = () => setTool(b.dataset.t));
  root.querySelector('.bar').addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    const k = a.dataset.a;
    if (k === 'close') close();
    if (k === 'undo') undo();
    if (k === 'redo') redo();
    if (k === 'finger') { fingerPref = fingerDraws() ? '0' : '1'; try { localStorage.setItem('hm-finger', fingerPref); } catch (e2) {} fingerLabel(); }
    if (k === 'share') { const b = await exportBlob(sheet, opt.img, sheet.name); opt.onExport && opt.onExport(b, sheet); }
  });
  $('.zoomind').addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'fit') fit();
    if (a.dataset.a === 'zoom') zoomAt(W / 2, H / 2, st.view.s * 1.5 > (plan ? 8 : 20) ? (fitScale() || 1) : 1.5);
  });

  function togglePalette() {
    const p = $('.palette');
    if (!p.hidden) { p.hidden = true; return; }
    p.innerHTML = `<h4>Add furniture</h4><div class="pg">${FURN.map(f => `<button data-k="${f[0]}"><canvas width="128" height="96"></canvas>${f[1]}<span class="muted small">${f[2]}×${f[3]}</span></button>`).join('')}</div>`;
    p.querySelectorAll('button').forEach(b => {
      const f = FURN_BY[b.dataset.k], c = b.querySelector('canvas').getContext('2d');
      const sc = Math.min(100 / (f[2] + 60), 70 / (f[3] + 60));
      c.setTransform(sc, 0, 0, sc, 64, 48); c.strokeStyle = INK; c.fillStyle = '#fff'; c.lineWidth = 1.6 / sc; c.lineJoin = 'round';
      drawFurn(c, f[0], f[2], f[3], 1.6 / sc);
      b.onclick = () => {
        snap();
        const cx = st.view.x + W / 2 / st.view.s, cy = st.view.y + H / 2 / st.view.s;
        const it = { id: uid(), t: 'f', k: f[0], x: Math.round(cx / 5) * 5, y: Math.round(cy / 5) * 5, w: f[2], h: f[3], r: 0, c: INK };
        sheet.items.push(it); p.hidden = true; setTool('select'); st.sel = it; props(); changed(); draw();
      };
    });
    p.hidden = false;
  }

  /* ---------- properties panel for the selected item ---------- */
  function props() {
    const p = $('.props'), it = st.sel;
    if (!it) { p.hidden = true; p.innerHTML = ''; return; }
    const name = it.t === 'f' ? (FURN_BY[it.k] || [0, 'Shape'])[1] : { wall: 'Wall', dim: 'Measurement', arrow: 'Arrow', ell: 'Circle', text: 'Text', stroke: it.hl ? 'Highlight' : 'Pen stroke' }[it.t];
    let h = `<h4>${name}</h4>`;
    if (it.t === 'f') h += `<label class="f">Label<input type="text" data-p="label" value="${esc(it.label || '')}" placeholder="e.g. Velvet sofa"></label>
      <div class="two"><label class="f">Width (cm)<input type="number" inputmode="decimal" data-p="w" value="${Math.round(it.w)}"></label><label class="f">Depth (cm)<input type="number" inputmode="decimal" data-p="h" value="${Math.round(it.h)}"></label></div>
      <div class="acts"><button class="btn ghost sm" data-x="rotl" aria-label="Rotate left">${I.rotl}</button><button class="btn ghost sm" data-x="rotr" aria-label="Rotate right">${I.rotr}</button></div>`;
    if (it.t === 'wall' || (it.t === 'dim' && plan)) {
      const len = Math.hypot(it.b[0] - it.a[0], it.b[1] - it.a[1]) / 100;
      h += `<label class="f">Length (m)<input type="number" step="0.01" inputmode="decimal" data-p="len" value="${len.toFixed(2)}"></label>`;
      if (it.t === 'wall') h += `<label class="f">Thickness (cm)<input type="number" inputmode="decimal" data-p="th" value="${it.th || 10}"></label>`;
    }
    if (it.t === 'dim' && !plan) h += `<label class="f">Size written on it<input type="text" data-p="label" value="${esc(it.label || '')}" placeholder="e.g. 2,40 m"></label>`;
    if (it.t === 'text') h += `<label class="f">Text<textarea data-p="text" style="min-height:80px">${esc(it.text || '')}</textarea></label>
      <div class="acts"><button class="btn ghost sm" data-x="smaller">A−</button><button class="btn ghost sm" data-x="bigger">A+</button></div>`;
    h += `<div class="acts"><button class="btn ghost sm" data-x="dup">${I.copy} Duplicate</button><button class="btn danger sm" data-x="del">${I.trash} Delete</button></div>`;
    p.innerHTML = h; p.hidden = false;
    let snapped = false;
    p.querySelectorAll('[data-p]').forEach(inp => {
      inp.addEventListener('focus', () => { snapped = false; });
      inp.addEventListener('input', () => {
        if (!snapped) { snap(); snapped = true; }
        const k = inp.dataset.p, v = inp.value;
        if (k === 'label' || k === 'text') it[k] = v;
        else if (k === 'len') { const L = parseFloat(String(v).replace(',', '.')) * 100; if (L > 0) { const ang = Math.atan2(it.b[1] - it.a[1], it.b[0] - it.a[0]); it.b = [r1(it.a[0] + L * Math.cos(ang)), r1(it.a[1] + L * Math.sin(ang))]; } }
        else { const n = parseFloat(String(v).replace(',', '.')); if (n > 0) { it[k] = n; if (it.k === 'door' && k === 'w') it.h = n; } }
        changed(); draw();
      });
    });
    p.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
      const x = b.dataset.x; snap();
      if (x === 'del') { sheet.items = sheet.items.filter(i => i !== it); st.sel = null; }
      if (x === 'dup') { const c = JSON.parse(JSON.stringify(it)); c.id = uid(); moveItem(c, 30 / st.view.s, 30 / st.view.s); sheet.items.push(c); st.sel = c; }
      if (x === 'rotl') it.r = ((it.r || 0) - 90 + 360) % 360;
      if (x === 'rotr') it.r = ((it.r || 0) + 90) % 360;
      if (x === 'bigger') it.size = (it.size || 18) * 1.25;
      if (x === 'smaller') it.size = (it.size || 18) / 1.25;
      props(); changed(); draw();
    });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ---------- snapping ---------- */
  function snapEnd(pt, from, skip) {
    const tol = 16 / st.view.s;
    let best = null, bd = tol;
    for (const it of sheet.items) {
      if (it === skip || !(it.t === 'wall' || it.t === 'dim')) continue;
      for (const q of [it.a, it.b]) { const d = Math.hypot(q[0] - pt[0], q[1] - pt[1]); if (d < bd) { bd = d; best = [q[0], q[1]]; } }
    }
    if (best) return best;
    if (!plan) return pt;
    if (from) {
      let dx = pt[0] - from[0], dy = pt[1] - from[1], len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const step = Math.PI / 4, near = Math.round(ang / step) * step;
      if (Math.abs(ang - near) < 7 * Math.PI / 180) ang = near;
      len = Math.round(len / 5) * 5;
      return [r1(from[0] + len * Math.cos(ang)), r1(from[1] + len * Math.sin(ang))];
    }
    return [Math.round(pt[0] / 10) * 10, Math.round(pt[1] / 10) * 10];
  }

  /* ---------- pointer handling ---------- */
  const ptrs = new Map();
  let action = null, gesture = null;
  const toWorld = (sx, sy) => [st.view.x + sx / st.view.s, st.view.y + sy / st.view.s];
  const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function zoomAt(sx, sy, ns) {
    ns = clamp(ns, photo ? 0.02 : 0.08, photo ? 40 : 12);
    const [wx, wy] = toWorld(sx, sy); st.view.s = ns; st.view.x = wx - sx / ns; st.view.y = wy - sy / ns; draw();
  }
  function hint(t) { const h = $('.hint'); if (!t) { h.hidden = true; return; } h.textContent = t; h.hidden = false; }

  function startGesture() {
    const ts = [...ptrs.values()].filter(p => p.type === 'touch' || ptrs.size > 1);
    if (!ts.length) return;
    const cx = ts.reduce((a, p) => a + p.x, 0) / ts.length, cy = ts.reduce((a, p) => a + p.y, 0) / ts.length;
    const d = ts.length > 1 ? Math.hypot(ts[0].x - ts[1].x, ts[0].y - ts[1].y) : 0;
    gesture = { s0: st.view.s, w: toWorld(cx, cy), d0: d, n: ts.length };
  }
  function moveGesture() {
    const ts = [...ptrs.values()];
    if (!gesture || !ts.length) return;
    if (ts.length !== gesture.n) { startGesture(); return; }
    const cx = ts.reduce((a, p) => a + p.x, 0) / ts.length, cy = ts.reduce((a, p) => a + p.y, 0) / ts.length;
    let s = gesture.s0;
    if (ts.length > 1 && gesture.d0 > 10) s = clamp(gesture.s0 * Math.hypot(ts[0].x - ts[1].x, ts[0].y - ts[1].y) / gesture.d0, photo ? 0.02 : 0.08, photo ? 40 : 12);
    st.view.s = s; st.view.x = gesture.w[0] - cx / s; st.view.y = gesture.w[1] - cy / s; draw();
  }
  const last = () => st.undo[st.undo.length - 1];
  function cancelAction() {
    if (!action) return;
    if (action.snapshot != null) { sheet.items = JSON.parse(action.snapshot); st.undo.pop(); st.sel = null; props(); }
    action = null; base = null; hint(); draw();
  }

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    const [x, y] = local(e);
    if (e.pointerType === 'pen' && !penSeen) { penSeen = true; try { localStorage.setItem('hm-pen', '1'); } catch (e2) {} fingerLabel(); }
    if (e.pointerType === 'touch' && action && action.type === 'pen') return; // palm while the pencil draws
    if (e.pointerType === 'pen' && action && action.type === 'touch') cancelAction(); // a palm landed first
    if (e.pointerType === 'pen' && gesture) { gesture = null; for (const [k, v] of ptrs) if (v.type === 'touch') ptrs.delete(k); } // the touches were a resting palm
    try { cv.setPointerCapture(e.pointerId); } catch (e2) {}
    ptrs.set(e.pointerId, { x, y, type: e.pointerType });
    $('.palette').hidden = true;
    const touches = [...ptrs.values()].filter(p => p.type === 'touch').length;
    if (e.pointerType === 'touch' && (touches > 1 || !fingerDraws())) {
      if (action && action.type === 'touch') cancelAction();
      startGesture(); return;
    }
    if (e.button === 1 || e.button === 2) { startGesture(); return; }
    begin(e, x, y);
  });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const [x, y] = local(e); p.x = x; p.y = y;
    if (gesture) { moveGesture(); return; }
    if (action && action.id === e.pointerId) {
      let evs = action.kind === 'stroke' && e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (!evs || !evs.length) evs = [e];
      for (const ev of evs) { const [lx, ly] = local(ev); step(ev, lx, ly); }
    }
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (gesture) { if (!ptrs.size) gesture = null; else startGesture(); return; }
    if (action && action.id === e.pointerId) { if (e.type === 'pointercancel') cancelAction(); else end(); }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => {
    e.preventDefault(); const [x, y] = local(e);
    if (e.ctrlKey || e.metaKey) zoomAt(x, y, st.view.s * Math.exp(-e.deltaY / 200));
    else { st.view.x += e.deltaX / st.view.s; st.view.y += e.deltaY / st.view.s; draw(); }
  }, { passive: false });
  cv.addEventListener('dblclick', e => { if (st.sel && (st.sel.t === 'text' || st.sel.a)) { const i = $('.props [data-p]'); if (i) { i.focus(); i.select && i.select(); } } });

  function begin(e, sx, sy) {
    const [x, y] = toWorld(sx, sy), id = e.pointerId, type = e.pointerType;
    const pr = type === 'pen' ? (e.pressure || 0.5) : 0.5;
    const tol = (type === 'touch' ? 14 : 9) / st.view.s;
    const t = st.tool;
    if (t === 'pen' || t === 'hl') {
      const hl = t === 'hl';
      const item = { id: uid(), t: 'stroke', c: hl ? st.hlColor : st.color, w: r1(WIDTHS[st.width] * unit * (hl ? 5 : 1)), pts: [r1(x), r1(y), r1(pr)] };
      if (type === 'pen' && !hl) item.pr = 1;
      if (hl) item.hl = 1;
      snap(); action = { kind: 'stroke', id, type, item, snapshot: last() };
      base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
      render(base.getContext('2d'), sheet, st.view, W, H, { dpr, img: opt.img }); draw();
      return;
    }
    if (t === 'eraser') { snap(); action = { kind: 'erase', id, type, removed: 0, snapshot: last() }; eraseAt(x, y, tol); return; }
    if (t === 'wall' || t === 'dim' || t === 'arrow') {
      const a = (t === 'arrow') ? [r1(x), r1(y)] : snapEnd([x, y]);
      const item = t === 'wall' ? { id: uid(), t: 'wall', a, b: a.slice(), th: 10, c: INK }
        : t === 'dim' ? { id: uid(), t: 'dim', a, b: a.slice(), c: st.color === '#ffffff' && !photo ? INK : st.color }
        : { id: uid(), t: 'arrow', a, b: a.slice(), c: st.color, w: r1(WIDTHS[st.width] * unit) };
      action = { kind: 'line', id, type, preview: item }; draw(); return;
    }
    if (t === 'ell') { action = { kind: 'ell', id, type, x0: x, y0: y, preview: { id: uid(), t: 'ell', x, y, w: 0, h: 0, r: 0, c: st.color, lw: r1(WIDTHS[st.width] * unit) } }; return; }
    if (t === 'text') { addText(x, y); return; }
    if (t === 'select') {
      if (st.sel) {
        for (const [k, hx, hy] of handles(st.sel, st.view.s)) {
          if (Math.hypot((hx - x) * st.view.s, (hy - y) * st.view.s) <= 22) { snap(); action = { kind: 'handle', h: k, id, type, item: st.sel, snapshot: last() }; return; }
        }
      }
      let found = null;
      for (let i = sheet.items.length - 1; i >= 0; i--) if (hit(sheet.items[i], x, y, tol)) { found = sheet.items[i]; break; }
      if (found) { st.sel = found; props(); snap(); action = { kind: 'move', id, type, item: found, last: [x, y], moved: false, snapshot: last() }; draw(); return; }
      st.sel = null; props(); draw();
      ptrs.set(id, { x: sx, y: sy, type: 'touch' }); startGesture(); // drag on empty paper pans
    }
  }
  function step(e, sx, sy) {
    const [x, y] = toWorld(sx, sy), a = action;
    if (a.kind === 'stroke') {
      const p = a.item.pts, lx = p[p.length - 3], ly = p[p.length - 2];
      if (Math.hypot((x - lx) * st.view.s, (y - ly) * st.view.s) < 1.2) return;
      p.push(r1(x), r1(y), r1(a.type === 'pen' ? (e.pressure || 0.5) : 0.5)); draw(); return;
    }
    if (a.kind === 'erase') { eraseAt(x, y, (a.type === 'touch' ? 14 : 10) / st.view.s); return; }
    if (a.kind === 'line') {
      const it = a.preview;
      it.b = it.t === 'arrow' ? [r1(x), r1(y)] : snapEnd([x, y], it.a);
      const len = Math.hypot(it.b[0] - it.a[0], it.b[1] - it.a[1]);
      if (plan && it.t !== 'arrow') hint(fmtLen(len));
      draw(); return;
    }
    if (a.kind === 'ell') { const it = a.preview; it.x = (a.x0 + x) / 2; it.y = (a.y0 + y) / 2; it.w = Math.abs(x - a.x0); it.h = Math.abs(y - a.y0); draw(); return; }
    if (a.kind === 'move') {
      const dx = x - a.last[0], dy = y - a.last[1];
      if (!a.moved && Math.hypot(dx * st.view.s, dy * st.view.s) < 3) return;
      a.moved = true; moveItem(a.item, dx, dy); a.last = [x, y]; draw(); return;
    }
    if (a.kind === 'handle') {
      const it = a.item;
      if (a.h === 'a' || a.h === 'b') {
        const other = a.h === 'a' ? it.b : it.a;
        it[a.h] = it.t === 'arrow' ? [r1(x), r1(y)] : snapEnd([x, y], other, it);
        if (plan && it.t !== 'arrow') hint(fmtLen(Math.hypot(it.b[0] - it.a[0], it.b[1] - it.a[1])));
      } else if (a.h === 'size') {
        const [lx, ly] = toLocal(it, x, y);
        let w = Math.max(Math.abs(lx) * 2, 10), h = Math.max(Math.abs(ly) * 2, 10);
        if (plan) { w = Math.round(w / 5) * 5; h = Math.round(h / 5) * 5; }
        if (/^(door|plant|side|lamp)$/.test(it.k)) { w = h = Math.max(w, h); }
        it.w = w; it.h = h;
        if (it.t === 'f') hint(`${Math.round(w)} × ${Math.round(h)} cm`);
      } else if (a.h === 'rot') {
        let ang = Math.atan2(y - it.y, x - it.x) * 180 / Math.PI + 90;
        const near = Math.round(ang / 15) * 15; if (Math.abs(ang - near) < 5) ang = near;
        it.r = Math.round(((ang % 360) + 360) % 360); hint(it.r + '°');
      }
      draw();
    }
  }
  async function end() {
    const a = action; action = null; base = null; hint();
    if (!a) return;
    if (a.kind === 'stroke') { sheet.items.push(a.item); changed(); draw(); return; }
    if (a.kind === 'erase') { if (!a.removed) st.undo.pop(); else changed(); draw(); return; }
    if (a.kind === 'line') {
      const it = a.preview, len = Math.hypot(it.b[0] - it.a[0], it.b[1] - it.a[1]) * st.view.s;
      if (len < 12) { draw(); return; }
      snap(); sheet.items.push(it);
      if (it.t === 'dim' && !plan) { draw(); const v = await ask('What size should this measurement show?', ''); if (v) it.label = v; }
      changed(); draw(); return;
    }
    if (a.kind === 'ell') { const it = a.preview; if (it.w * st.view.s > 8 || it.h * st.view.s > 8) { snap(); sheet.items.push(it); changed(); } draw(); return; }
    if (a.kind === 'move') { if (!a.moved) st.undo.pop(); else changed(); props(); draw(); return; }
    if (a.kind === 'handle') { changed(); props(); draw(); }
  }
  function eraseAt(x, y, tol) {
    const before = sheet.items.length;
    sheet.items = sheet.items.filter(it => !hit(it, x, y, tol));
    if (sheet.items.length !== before) { action.removed += before - sheet.items.length; draw(); }
  }
  async function addText(x, y) {
    const v = await ask('Text', '');
    if (!v) return;
    snap(); const it = { id: uid(), t: 'text', x: r1(x), y: r1(y), text: v, c: st.color === '#ffffff' && !photo ? INK : st.color, size: r1(20 / st.view.s) };
    sheet.items.push(it); changed(); draw();
  }

  function onKey(e) {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.key === 'Backspace' || e.key === 'Delete') && st.sel) { snap(); sheet.items = sheet.items.filter(i => i !== st.sel); st.sel = null; props(); changed(); draw(); }
    else if (e.key === 'Escape') { st.sel = null; props(); draw(); }
  }
  document.addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => { const keep = W; resize(); if (!keep) fit(); });
  ro.observe(wrap);

  function close() {
    clearTimeout(chT); opt.onChange && opt.onChange(sheet);
    document.removeEventListener('keydown', onKey); ro.disconnect(); cancelAnimationFrame(raf);
    host.innerHTML = ''; opt.onClose && opt.onClose(sheet);
  }

  setTool(plan ? 'wall' : 'pen');
  fingerLabel();
  if (plan && !sheet.items.length) hint('Drag to draw walls. Two fingers to move and zoom.'), setTimeout(() => hint(), 4000);
  return { close };
}

window.Draw = { open, thumb, exportBlob, render, FURN, uid, fmtLen };
})();
