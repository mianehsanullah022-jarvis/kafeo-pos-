// KAFEO POS — the app. Screens: Order, Kitchen, Delivery, Loyalty, Reports, Menu, Settings.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createDemoApi, DEMO_EMAILS, DEMO_PASSWORD } from './api-demo.js';
import { DEFAULT_SETTINGS } from './menu-seed.js';
import {
  fmt, num, TYPE_LABEL, STATUS_LABEL, PAY_METHODS, isDigital, taxRateFor, lineDiscount, computeBill, discountShare,
  cashSuggestions, bmsmReward, loyaltyAfterPayment, rewardReady, cleanPhone, phoneOk, waLink, summarize, incentives,
  minutesSince, startOfDay
} from './logic.js';

const LIVE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const api = LIVE
  ? (await import('./api-supabase.js')).createSupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createDemoApi();

const CAFE = { address: '97-Shadman-1, Shadman Chowk, Jail Road, Lahore', phone: '0304 2077720', web: 'kafeo.com.pk', insta: '@kafeo_official' };
const LATE_MIN = 15;
const NOTE_CHIPS = ['No onions', 'Extra spicy', 'Less spicy', 'Extra cheese', 'No mayo', 'Well done', 'Less sugar', 'No ice'];

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  order: 'M6 3h12l-1 18H7L6 3z M9 8h6',
  kitchen: 'M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3z M9 7V4 M15 7V4 M12 7V3',
  delivery: 'M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M9 17h6l-3-8h4l2 8 M12 9H8',
  reports: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  customers: 'M5 8a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M2 21a7 7 0 0 1 14 0 M17 4l1.2 2.4L21 7l-2 2 .5 3-2.5-1.4',
  menu: 'M4 6h16 M4 12h16 M4 18h10',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M12 2v3 M12 19v3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M2 12h3 M19 12h3 M4.9 19.1L7 17 M17 7l2.1-2.1',
  me: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8 M4 21a8 8 0 0 1 16 0',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M20 20l-4-4',
  bills: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2z M9 7h6 M9 11h6 M9 15h4',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
  percent: 'M19 5L5 19 M6.5 9a2.5 2.5 0 1 0 0-5a2.5 2.5 0 1 0 0 5 M17.5 20a2.5 2.5 0 1 0 0-5a2.5 2.5 0 1 0 0 5',
  table: 'M3 8h18 M5 8v11 M19 8v11 M8 8l1-4h6l1 4',
  user: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8 M4 21a8 8 0 0 1 16 0',
  note: 'M5 4h14v16H5z M9 9h6 M9 13h6',
  x: 'M6 6l12 12 M18 6L6 18',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z M13 7l4 4',
  print: 'M7 9V3h10v6 M7 17H4v-7h16v7h-3 M7 14h10v7H7z',
  check: 'M5 12l5 5 9-10',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'
};
const icon = (k, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[k]}"></path></svg>`;

// Each menu category gets its own colour and drawing, used on item cards without a photo.
const CAT_LOOK = {
  deals: ['#F3E1C7', '#8C5517', 'M3 12V4h8l10 10-8 8L3 12z M7.5 7.5h.01'],
  pizza: ['#F6D9C8', '#A0441E', 'M4 6c5-3 11-3 16 0L12 21 4 6z M9 10h.01 M14 11h.01 M12 15h.01'],
  burgers: ['#F1E3BF', '#7A5A12', 'M4 11a8 6 0 0 1 16 0z M3 14h18 M4 17h16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1z'],
  steak: ['#EBD6D1', '#6E2A20', 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M9 10c1-2 5-2 6 0s-1 5-3 5-4-3-3-5z'],
  sand: ['#E9E5CB', '#5C5A1E', 'M3 15l9-9 9 9z M3 15v3h18v-3'],
  sides: ['#F5E6B8', '#8A6410', 'M6 9h12l-2 12H8L6 9z M8 9V3 M11 9V2 M14 9V3 M16 9V5'],
  coffee: ['#E8DACB', '#5B3A22', 'M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8z M17 10h1.5a2.5 2.5 0 0 1 0 5H17 M9 3v2 M13 3v2'],
  drinks: ['#D9E8E1', '#2F5E4C', 'M7 3h10l-1 18H8L7 3z M7.5 9h9 M14 3l2-2'],
  dessert: ['#EEDCE6', '#6B3354', 'M4 21h16 M5 21v-7h14v7 M5 14c2 2 4 2 7 0s5-2 7 0 M12 10V7'],
  addons: ['#E6E2DC', '#4F4741', 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M12 8v8 M8 12h8']
};
const FALLBACK_LOOK = [['#EDE3D5', '#5E3A10'], ['#DDE6EE', '#2C4A63'], ['#E7E0EF', '#4E3A66'], ['#E3EBD9', '#3F5A26']];
function catLook(catId) {
  if (CAT_LOOK[catId]) return CAT_LOOK[catId];
  const h = [...String(catId)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return [...FALLBACK_LOOK[h % FALLBACK_LOOK.length], 'M5 8h14v11H5z M8 8V5h8v3'];
}
function itemPic(i, cls = 'pic') {
  const [bg, fg, d] = catLook(i.category_id);
  if (i.image_url) return `<span class="${cls} photo"><img src="${esc(i.image_url)}" alt="" loading="lazy"></span>`;
  return `<span class="${cls}" style="background:${bg};color:${fg}"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg></span>`;
}
// Shrink a photo before upload so cards load fast (max 640px, JPEG).
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
}

const ROUTES = [
  { id: 'order', label: 'New order', roles: ['owner', 'cashier'], icon: 'order' },
  { id: 'orders', label: 'Orders', roles: ['owner', 'cashier'], icon: 'bills' },
  { id: 'kitchen', label: 'Kitchen', roles: ['owner', 'cashier', 'kitchen'] },
  { id: 'delivery', label: 'Delivery', roles: ['owner', 'cashier', 'rider'] },
  { id: 'customers', label: 'Loyalty', roles: ['owner', 'cashier'] },
  { id: 'reports', label: 'Reports', roles: ['owner'] },
  { id: 'menu', label: 'Menu', roles: ['owner'] },
  { id: 'settings', label: 'Settings', roles: ['owner'] }
];

// ---------- state ----------
const S = {
  me: null, menu: { categories: [], items: [] }, settings: { ...DEFAULT_SETTINGS }, riders: [], staff: [],
  open: [], today: [], route: 'order', live: 'connecting', seenNew: null, busy: false,
  // order screen
  cat: null, q: '', cart: [], type: 'dine', table: '', phone: '', custName: '', address: '', notes: '',
  discount: null, serviceOn: true, feeOverride: null, customer: null, editing: null,
  ordersTab: 'open', ordersFilter: 'all',
  m: null,        // state of the open pop-up
  station: 'all',
  rep: { range: 'today', orders: [], loaded: false },
  cs: { q: '', list: [], sel: null, orders: [] },
  mcat: null
};
const role = () => S.me?.profile?.role;
const isOwner = () => role() === 'owner';
const canSee = (id) => ROUTES.find((r) => r.id === id)?.roles.includes(role());
const homeRoute = () => ({ owner: 'order', cashier: 'order', kitchen: 'kitchen', rider: 'delivery' }[role()] || 'order');
const req = () => Number(S.settings.loyalty_stamps) || 5;
const loyalPct = () => Number(S.settings.loyalty_discount_pct) || 50;

// ---------- toast ----------
let toastTimer, toastAction = null;
function toast(msg, opts = {}) {
  const el = $('#toast');
  toastAction = opts.action?.fn || null;
  el.innerHTML = `<div class="t ${opts.err ? 'err' : ''}">${opts.err ? '' : icon('check', 18)}<span>${esc(msg)}</span>${opts.action ? `<button type="button" data-act="toastAct">${esc(opts.action.label)}</button>` : ''}</div>`;
  el.className = 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; toastAction = null; }, opts.action ? 9000 : 3500);
}
async function run(fn) {
  try { return await fn(); } catch (e) { console.error(e); toast(e.message || 'Something went wrong', { err: true }); }
}

// ---------- boot ----------
async function boot() {
  try { S.me = await api.session(); } catch { S.me = null; }
  if (!S.me) return renderLogin();
  return startApp();
}

function renderLogin(error = '') {
  $('#app').innerHTML = `
  <main class="login">
    <form class="login-card" data-submit="login" autocomplete="on">
      <div class="brand">KAFEO<small>POS</small></div>
      <div class="muted">Staff sign in</div>
      ${error ? `<div class="error" role="alert">${esc(error)}</div>` : ''}
      <label class="field">Email<input name="email" type="email" autocomplete="username" required></label>
      <label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Sign in</button>
      ${LIVE ? '<div class="muted small">Forgot your password? Ask the owner to reset it.</div>' : `
      <div class="demo-note"><b>Demo mode</b> — the database isn't connected, so data stays in this browser.<br>
      Password for all demo logins: <b>${DEMO_PASSWORD}</b><br>
      ${DEMO_EMAILS.map((e) => `<button type="button" class="btn btn-sm" style="margin:6px 6px 0 0" data-act="demoFill" data-email="${e}">${e}</button>`).join('')}</div>`}
    </form>
  </main>`;
  $('input[name=email]')?.focus();
}

function renderNoProfile() {
  $('#app').innerHTML = `
  <main class="login"><div class="login-card">
    <div class="brand">KAFEO<small>POS</small></div>
    <div class="error" role="alert">Your login works, but it isn't set up as KAFEO staff yet. Ask the owner to add you.</div>
    <button class="btn btn-block" data-act="signOut">Sign out</button>
  </div></main>`;
}

let unsub = null;
async function startApp() {
  if (!S.me.profile || !S.me.profile.active) return renderNoProfile();
  $('#app').innerHTML = '<div class="boot">Loading menu and orders…</div>';
  await run(loadAll);
  S.cat = S.cat || S.menu.categories[0]?.id || null;
  S.mcat = S.mcat || S.cat;
  S.serviceOn = S.settings.service_default_on !== false;
  S.seenNew = new Set(S.open.filter((o) => o.status === 'new').map((o) => o.id));
  unsub?.();
  unsub = api.subscribe(onLive);
  routeFromHash();
  renderShell();
}

async function loadAll() {
  const [menu, settings, riders] = await Promise.all([api.loadMenu(), api.loadSettings(), api.listRiders()]);
  S.menu = menu;
  S.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  S.riders = riders;
  await refreshOrders();
}

async function refreshOrders() {
  const from = startOfDay();
  const to = new Date(from.getTime() + 864e5);
  const [open, today] = await Promise.all([api.openOrders(), api.ordersBetween(from.toISOString(), to.toISOString())]);
  S.open = open;
  S.today = today;
}

// ---------- live updates ----------
let refreshTimer = null;
function onLive(kind, payload) {
  if (kind === 'status') {
    S.live = payload === 'SUBSCRIBED' ? 'on' : (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(payload) ? 'off' : 'connecting');
    if (S.live === 'on') scheduleRefresh();
    return renderLiveDot();
  }
  if (kind === 'menu') return run(async () => { S.menu = await api.loadMenu(); if (S.route === 'order') { renderCats(); renderGrid(); } else rerenderIf(['menu']); });
  if (kind === 'settings') return run(async () => {
    S.settings = { ...DEFAULT_SETTINGS, ...(await api.loadSettings()) };
    S.riders = await api.listRiders();
    if (S.route === 'order') renderSummary(); else rerenderIf(['delivery', 'settings']);
  });
  if (kind === 'orders' || kind === 'customers') scheduleRefresh();
}
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => run(async () => {
    await refreshOrders();
    checkNewOrders();
    renderBillsBadge();
    if (S.route === 'order') { /* summary unaffected */ }
    else if (S.route === 'reports' && S.rep.range === 'today') { await loadReport(); renderScreen(); }
    else if (S.route === 'customers' && S.cs.sel) { await selectCustomer(S.cs.sel.phone, true); }
    else rerenderIf(['kitchen', 'delivery', 'orders']);
  }), 250);
}
function checkNewOrders() {
  const fresh = S.open.filter((o) => o.status === 'new' && !S.seenNew.has(o.id));
  fresh.forEach((o) => S.seenNew.add(o.id));
  if (fresh.length && S.route === 'kitchen') beep();
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* sound needs one tap on the screen first */ }
}
function rerenderIf(routes) { if (routes.includes(S.route)) renderScreen(); }

setInterval(() => { if (S.me?.profile) scheduleRefresh(); if (S.route === 'kitchen') renderScreen(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me?.profile) scheduleRefresh(); });

// ---------- shell & routing ----------
function routeFromHash() {
  const h = location.hash.replace('#', '');
  S.route = canSee(h) ? h : homeRoute();
}
window.addEventListener('hashchange', () => {
  if (!S.me?.profile) return;
  routeFromHash();
  renderShell();
});

function renderShell() {
  const links = ROUTES.filter((r) => canSee(r.id)).map((r) =>
    `<a href="#${r.id}" class="${S.route === r.id ? 'on' : ''}" ${S.route === r.id ? 'aria-current="page"' : ''}>${icon(r.icon || r.id)}${r.label}${r.id === 'orders' ? '<b class="rail-badge" id="rail-orders"></b>' : ''}</a>`).join('');
  $('#app').innerHTML = `
  <div class="shell">
    <nav class="rail" aria-label="POS sections">
      <div class="k">K</div>
      ${links}
      <div class="spacer"></div>
      <div class="live-dot" id="live-dot"></div>
      <button type="button" data-act="account" aria-label="My account">${icon('me')}Me</button>
    </nav>
    <div class="main">
      ${LIVE ? '' : '<div class="demo-bar">DEMO MODE — data stays in this browser. Connect the database to go live (see README).</div>'}
      <div id="screen"></div>
    </div>
  </div>
  <dialog id="dlg" aria-labelledby="dlg-title"></dialog>`;
  $('#dlg').addEventListener('close', () => {
    const kind = S.m?.kind;
    S.m = null;
    if (kind === 'details' && S.route === 'order') renderSummary();
  });
  renderLiveDot();
  renderScreen();
  renderBillsBadge();
}
function renderLiveDot() {
  const el = $('#live-dot');
  if (!el) return;
  el.className = 'live-dot ' + S.live;
  el.innerHTML = `<i></i>${S.live === 'on' ? 'Live' : S.live === 'off' ? 'Offline' : 'Connecting'}`;
}
function renderScreen() {
  const el = $('#screen');
  if (!el) return;
  const map = { order: renderOrder, orders: renderOrders, kitchen: renderKitchen, delivery: renderDelivery, reports: renderReports, customers: renderCustomers, menu: renderMenu, settings: renderSettings };
  (map[S.route] || renderOrder)(el);
}

// ---------- pop-up (dialog) helpers ----------
function openModal(size, html) {
  const d = $('#dlg');
  d.className = size;
  d.innerHTML = html;
  if (!d.open) d.showModal();
}
function closeModal() { const d = $('#dlg'); if (d?.open) d.close(); else S.m = null; }
const modalHead = (title, sub = '') => `
  <header class="mh"><div><h2 id="dlg-title">${title}</h2>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>
  <button type="button" class="icon-btn" data-act="closeModal" aria-label="Close">${icon('x', 20)}</button></header>`;

// =====================================================================
// ORDER & BILLING
// =====================================================================
const itemsIn = (cat) => S.menu.items.filter((i) => i.active && i.category_id === cat);
function visibleItems() {
  const q = S.q.trim().toLowerCase();
  if (q) return S.menu.items.filter((i) => i.active && (i.name.toLowerCase().includes(q) || (i.note || '').toLowerCase().includes(q)));
  return itemsIn(S.cat);
}
const unpaidBills = () => S.open.filter((o) => !o.paid && o.status !== 'cancelled');
const loyaltyAvailable = () => phoneOk(cleanPhone(S.phone)) && rewardReady(S.customer, req());
const deliveryFee = () => (S.feeOverride ?? Number(S.settings.delivery_fee)) || 0;
const ctxNow = (method = 'Cash') => ({ type: S.type, method, discount: S.discount, serviceOn: S.serviceOn, deliveryFee: deliveryFee(), settings: S.settings });
function ctxForOrder(o, method) {
  const m = o.meta || {};
  const disc = m.discount || (Number(o.discount) > 0 ? { scope: 'bill', type: 'amt', value: Number(o.discount), reason: o.discount_label } : null);
  return { type: o.type, method, discount: disc, serviceOn: m.serviceOn ?? Number(o.service_charge) > 0, deliveryFee: Number(o.delivery_fee) || 0, settings: S.settings };
}
function discountLabel(d) {
  if (!d) return '';
  if (d.reason === 'Loyalty reward') return 'Loyalty';
  return [d.reason || 'Discount', d.bank].filter(Boolean).join(' · ');
}
const discountText = (d) => !d ? '' : d.scope === 'items' ? 'Item-wise' : d.type === 'pct' ? `${num(d.value)}%` : fmt(d.value);

function renderOrder(el) {
  el.className = 'order';
  el.innerHTML = `
  <nav class="catbar" aria-label="Menu categories" id="cats"></nav>
  <section class="order-menu" aria-label="Menu">
    <div class="toolbar">
      <label class="search">${icon('search', 18)}<span class="sr">Search menu</span>
        <input data-bind="q" type="search" placeholder="Search menu… e.g. zinger, latte" value="${esc(S.q)}" autocomplete="off"></label>
      <a class="tool" href="#orders">${icon('bills', 20)}<span>Running orders</span><b class="badge" id="bills-badge">0</b></a>
    </div>
    <div class="grid" id="grid"></div>
  </section>
  <aside class="sum-panel" aria-label="Order summary" id="summary"></aside>`;
  renderCats(); renderGrid(); renderSummary(); renderBillsBadge();
}
function renderBillsBadge() {
  const n = unpaidBills().length;
  const b = $('#bills-badge'); if (b) { b.textContent = n; b.classList.toggle('zero', !n); }
  const r = $('#rail-orders'); if (r) { r.textContent = n || ''; r.classList.toggle('hidden', !n); }
}

function renderCats() {
  const el = $('#cats'); if (!el) return;
  el.innerHTML = S.menu.categories.map((c) => {
    const on = !S.q && S.cat === c.id;
    return `<button type="button" class="${on ? 'on' : ''}" aria-pressed="${on}" data-act="cat" data-id="${esc(c.id)}"><span>${esc(c.label)}</span><small>${itemsIn(c.id).length}</small></button>`;
  }).join('');
}
function renderGrid() {
  const el = $('#grid'); if (!el) return;
  const items = visibleItems();
  const inCart = (id) => S.cart.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);
  el.innerHTML = items.length ? items.map((i) => {
    const n = inCart(i.id);
    const qty = n ? `<span class="in-cart" aria-label="${n} in order">${n}</span>` : '';
    const note = i.note ? `<span class="nt">${esc(i.note)}</span>` : '';
    if (i.options.length === 1 && !i.options[0].k) {
      return `<button type="button" class="icard single" data-act="add" data-id="${esc(i.id)}" data-o="0">${qty}${itemPic(i)}
        <span class="body"><span class="nm">${esc(i.name)}</span>${note}<span class="pr">${fmt(i.options[0].p)}<i aria-hidden="true">+</i></span></span></button>`;
    }
    return `<div class="icard">${qty}${itemPic(i)}<span class="body"><span class="nm">${esc(i.name)}</span>${note}
      <span class="sizes">${i.options.map((o, idx) => `<button type="button" data-act="add" data-id="${esc(i.id)}" data-o="${idx}" aria-label="Add ${esc(i.name)} ${esc(o.k)}"><b>${esc(o.k)}</b>${num(o.p)}</button>`).join('')}</span></span></div>`;
  }).join('') : '<div class="empty">No items match.</div>';
}

// ----- order summary (right panel) -----
function renderSummary() {
  const el = $('#summary'); if (!el) return;
  const bill = computeBill(S.cart, ctxNow('Cash'));
  const count = S.cart.reduce((a, l) => a + l.qty, 0);
  const types = [['dine', 'Dine-in'], ['take', 'Takeaway'], ['deliv', 'Delivery']];
  const c = S.customer;
  const p = cleanPhone(S.phone);
  const custChip = phoneOk(p) || S.custName
    ? `${icon('user', 16)}<span>${esc(S.custName || c?.name || p)}</span>${c ? `<em>${c.stamps || 0}/${req()}${rewardReady(c, req()) ? ' ★' : ''}</em>` : ''}`
    : `${icon('user', 16)}<span>${S.type === 'deliv' ? 'Add customer *' : 'Customer'}</span>`;
  const reward = bmsmReward(bill.subtotal, S.settings.bmsm);
  const servicePct = Number(S.settings.service_pct) || 0;
  const taxCash = Number(S.settings.tax_cash_pct) || 0, taxDig = Number(S.settings.tax_digital_pct) || 0;
  el.innerHTML = `
    <div class="sp-head">
      <div class="row">
        ${S.editing ? `<h2>Editing #${S.editing.id}</h2><button type="button" class="btn btn-sm" data-act="cancelEdit">Stop editing</button>`
          : `<h2>Order summary</h2><span class="muted small">${count} item${count === 1 ? '' : 's'}</span>`}
        <span class="grow"></span>
        <button type="button" class="icon-btn" data-act="clearCart" aria-label="Clear order" ${S.cart.length || S.editing ? '' : 'disabled'}>${icon('trash', 20)}</button>
      </div>
      <div class="seg" role="group" aria-label="Order type">${types.map(([v, l]) =>
        `<button type="button" class="${S.type === v ? 'on' : ''}" aria-pressed="${S.type === v}" data-act="type" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="chips-row">
        ${S.type === 'dine' ? `<button type="button" class="chip ${S.table ? 'set' : 'need'}" data-act="details" data-focus="table">${icon('table', 16)}<span>${S.table ? 'Table ' + esc(S.table) : 'Pick table *'}</span></button>` : ''}
        <button type="button" class="chip ${phoneOk(p) || S.custName ? 'set' : S.type === 'deliv' ? 'need' : ''}" data-act="details" data-focus="phone">${custChip}</button>
        <button type="button" class="chip ${S.notes ? 'set' : ''}" data-act="details" data-focus="notes">${icon('note', 16)}<span>${S.notes ? 'Note ✓' : 'Note'}</span></button>
      </div>
      ${loyaltyAvailable() && S.discount?.reason !== 'Loyalty reward' ? `<button type="button" class="loyal-banner" data-act="applyLoyalty">${icon('star', 18)}<span><b>Loyalty reward ready</b> — tap to give ${loyalPct()}% off</span></button>` : ''}
    </div>

    <div class="sp-lines" id="lines">
      ${S.cart.length ? S.cart.map((l, idx) => {
        const ld = S.discount?.scope === 'items' ? lineDiscount(l) : 0;
        return `<div class="ln">
          <button type="button" class="ln-main" data-act="editLine" data-i="${idx}">
            <span class="ln-name">${esc(l.name)}${l.sentQty ? ` <em class="tag">${l.qty > l.sentQty ? '+' + (l.qty - l.sentQty) + ' new' : 'sent'}</em>` : ''}</span>
            <span class="ln-sub">${fmt(l.price)} each${l.note ? ` · <b>${esc(l.note)}</b>` : ''}${ld ? ` · <span class="ok-text">−${fmt(ld)}</span>` : ''}</span>
          </button>
          <div class="qty">
            <button type="button" data-act="qty" data-i="${idx}" data-d="-1" aria-label="One less ${esc(l.name)}">−</button>
            <span>${l.qty}</span>
            <button type="button" data-act="qty" data-i="${idx}" data-d="1" aria-label="One more ${esc(l.name)}">+</button>
          </div>
          <div class="ln-amt">${fmt(l.price * l.qty - ld)}</div>
        </div>`;
      }).join('') : `<div class="empty-cart">${icon('order', 36)}<b>No items yet</b><span>Tap items on the left to start the order</span></div>`}
    </div>

    <div class="sp-foot">
      <div class="adj">
        <button type="button" class="adj-btn ${S.discount ? 'on' : ''}" data-act="discount" ${S.cart.length ? '' : 'disabled'}>${icon('percent', 18)}<span>${S.discount ? `Discount <b>${esc(discountText(S.discount))}</b>` : 'Discount'}</span></button>
        ${S.type === 'dine' && servicePct ? `<button type="button" class="adj-btn ${S.serviceOn ? 'on' : ''}" data-act="toggleService" aria-pressed="${S.serviceOn}"><span>Service ${num(servicePct)}%</span><b>${S.serviceOn ? 'ON' : 'OFF'}</b></button>` : ''}
        ${S.type === 'deliv' ? `<button type="button" class="adj-btn" data-act="details" data-focus="fee"><span>Delivery fee</span><b>${fmt(deliveryFee())}</b></button>` : ''}
      </div>
      <dl class="tot">
        <div><dt>Subtotal</dt><dd>${fmt(bill.subtotal)}</dd></div>
        ${bill.discount ? `<div class="ok-text"><dt>Discount${S.discount?.reason ? ' · ' + esc(discountLabel(S.discount)) : ''}</dt><dd>− ${fmt(bill.discount)}</dd></div>` : ''}
        ${bill.service ? `<div><dt>Service charge ${num(bill.servicePct)}%</dt><dd>${fmt(bill.service)}</dd></div>` : ''}
        ${taxCash || taxDig ? `<div><dt>${bill.inclusive ? 'Incl. tax' : 'Tax'} ${num(taxCash)}% cash${taxDig !== taxCash ? ` · ${num(taxDig)}% card` : ''}</dt><dd>${fmt(bill.tax)}</dd></div>` : ''}
        ${bill.fee ? `<div><dt>Delivery fee</dt><dd>${fmt(bill.fee)}</dd></div>` : ''}
        ${bill.roundOff ? `<div><dt>Round off</dt><dd>${bill.roundOff > 0 ? '+' : '−'} ${fmt(Math.abs(bill.roundOff))}</dd></div>` : ''}
        <div class="grand"><dt>Total</dt><dd>${fmt(bill.total)}</dd></div>
      </dl>
      ${reward ? `<div class="reward">${icon('star', 16)} Buy More, Save More: <b>${esc(reward)}</b></div>` : ''}
      <div class="go">
        <button type="button" class="btn btn-dark btn-lg" data-act="saveOrder" ${S.cart.length && !S.busy ? '' : 'disabled'}>${S.editing ? 'Update order' : 'Add order'}<small>${S.type === 'deliv' ? 'cash on delivery' : 'pay after food'}</small></button>
        <button type="button" class="btn btn-primary btn-lg" data-act="payNow" ${S.cart.length && !S.busy ? '' : 'disabled'}>Pay ${fmt(bill.total)}<small>${S.editing ? 'update & take payment' : 'take payment now'}</small></button>
      </div>
    </div>`;
}

function addToCart(itemId, optIdx) {
  const i = S.menu.items.find((x) => x.id === itemId);
  const o = i?.options[optIdx];
  if (!o) return;
  const name = i.name + (o.k ? ` (${o.k})` : '');
  const line = S.cart.find((l) => l.id === i.id && l.name === name && !l.note && !l.disc);
  if (line) line.qty++;
  else S.cart.push({ id: i.id, name, price: Number(o.p), qty: 1, station: i.station, counts: i.counts || null, note: '' });
  renderSummary(); renderGrid();
  const lines = $('#lines'); if (lines) lines.scrollTop = lines.scrollHeight;
}

function validateOrder() {
  const p = cleanPhone(S.phone);
  if (!S.cart.length) return 'Add items first';
  if (S.type === 'dine' && !S.table) return 'Pick a table';
  if (S.phone && !phoneOk(p)) return 'Phone should be 11 digits, like 03001234567';
  if (S.type === 'deliv' && !phoneOk(p)) return 'Delivery needs the customer’s phone';
  if (S.type === 'deliv' && !S.address.trim()) return 'Add the delivery address';
  if (S.discount?.reason === 'Loyalty reward' && !loyaltyAvailable()) return 'This customer’s loyalty card isn’t full yet';
  return '';
}
function needsDetails(msg) { toast(msg, { err: true }); if (/table|phone|address|loyalty/i.test(msg)) openDetails(/table/i.test(msg) ? 'table' : /address/i.test(msg) ? 'address' : 'phone'); }

// Build the order row from the current screen.
function orderFromState(method, paid, payExtra = {}) {
  const bill = computeBill(S.cart, ctxNow(method || 'Cash'));
  const p = cleanPhone(S.phone);
  const prev = S.editing;
  const items = S.cart.map((l) => {
    const added = prev ? (l.sentQty ? Math.max(0, l.qty - l.sentQty) : l.qty) : 0;
    return { id: l.id, name: l.name, price: l.price, qty: l.qty, station: l.station, counts: l.counts, note: l.note || '', disc: l.disc || null, added };
  });
  const anyAdded = items.some((i) => i.added > 0) || (prev && items.some((i) => !prev.items.find((x) => x.name === i.name)));
  return {
    type: S.type, table_no: S.type === 'dine' ? S.table : '',
    customer_phone: phoneOk(p) ? p : '', customer_name: S.custName.trim() || S.customer?.name || '',
    address: S.type === 'deliv' ? S.address.trim() : '', items, notes: S.notes.trim(),
    subtotal: bill.subtotal, discount: bill.discount, discount_label: discountLabel(S.discount),
    service_charge: bill.service, tax: bill.tax, tax_rate: bill.taxRate, delivery_fee: bill.fee, round_off: bill.roundOff, total: bill.total,
    payment: paid ? method : (S.type === 'deliv' ? 'Cash (COD)' : ''), paid,
    status: prev ? (anyAdded && prev.status !== 'new' ? 'new' : prev.status) : 'new',
    reward: bmsmReward(bill.subtotal, S.settings.bmsm),
    meta: { discount: S.discount, serviceOn: S.serviceOn, inclusive: bill.inclusive, by: S.me.profile.name },
    ...payExtra
  };
}

async function saveOrder(method = null, payExtra = {}) {
  if (S.busy) return null;
  const problem = validateOrder();
  if (problem) { needsDetails(problem); return null; }
  const paid = !!method;
  const data = orderFromState(method, paid, payExtra);
  S.busy = true; renderSummary();
  const row = await run(async () => {
    let r;
    if (S.editing) r = await api.updateOrder(S.editing.id, data);
    else r = await api.createOrder({ ...data, created_by: LIVE ? S.me.user.id : null });
    if (r.customer_phone) await saveCustomerAfter(r, paid);
    resetOrder();
    await refreshOrders();
    return r;
  });
  S.busy = false;
  if (S.route === 'order') renderOrder($('#screen'));
  return row || null;
}
function resetOrder() {
  Object.assign(S, { cart: [], table: '', phone: '', custName: '', address: '', notes: '', discount: null, customer: null, editing: null, feeOverride: null, q: '' });
  S.serviceOn = S.settings.service_default_on !== false;
}
function loadForEdit(o) {
  Object.assign(S, {
    editing: o, type: o.type, table: o.table_no, phone: o.customer_phone, custName: o.customer_name, address: o.address, notes: o.notes,
    discount: ctxForOrder(o, 'Cash').discount, serviceOn: o.meta?.serviceOn ?? Number(o.service_charge) > 0,
    feeOverride: o.type === 'deliv' ? Number(o.delivery_fee) : null, customer: null,
    cart: o.items.map((l) => ({ id: l.id, name: l.name, price: Number(l.price), qty: l.qty, station: l.station, counts: l.counts, note: l.note || '', disc: l.disc || null, sentQty: l.qty }))
  });
  if (phoneOk(o.customer_phone)) api.getCustomer(o.customer_phone).then((c) => { S.customer = c; renderSummary(); }).catch(() => {});
}

// Creates/updates the customer card; gives a stamp when paid.
async function saveCustomerAfter(order, paid) {
  let c = (await api.getCustomer(order.customer_phone)) || { phone: order.customer_phone, stamps: 0, visits: 0, total_spent: 0, rewards_used: 0 };
  if (order.customer_name) c.name = order.customer_name;
  if (order.address) c.address = order.address;
  if (paid) c = loyaltyAfterPayment(c, order, req());
  await api.saveCustomer(c);
}

// Pay an order that's already saved (open bill / delivery).
async function payExisting(o, method, extra = {}) {
  const bill = computeBill(o.items, ctxForOrder(o, method));
  const patch = {
    paid: true, payment: method, subtotal: bill.subtotal, discount: bill.discount, service_charge: bill.service,
    tax: bill.tax, tax_rate: bill.taxRate, delivery_fee: bill.fee, round_off: bill.roundOff, total: bill.total, ...extra
  };
  if (o.type === 'deliv' && o.status === 'out') patch.status = 'done';
  const r = await api.updateOrder(o.id, patch);
  if (r.customer_phone) await saveCustomerAfter(r, true);
  await refreshOrders();
  return r;
}

// ----- Order details pop-up: table, customer, note, delivery fee -----
function openDetails(focus = 'phone') {
  S.m = { kind: 'details', focus };
  renderDetails();
  setTimeout(() => { const f = $(`#dlg [data-mf="${focus}"]`); f?.focus?.(); }, 30);
}
function renderDetails() {
  const busyTables = new Map(S.open.filter((o) => o.type === 'dine' && o.status !== 'cancelled' && (!o.paid || o.status !== 'done') && (!S.editing || o.id !== S.editing.id)).map((o) => [o.table_no, o.id]));
  openModal('md', `
    ${modalHead('Order details', TYPE_LABEL[S.type])}
    <div class="mb stack">
      ${S.type === 'dine' ? `<div><div class="lbl">Table</div><div class="table-grid" role="group" aria-label="Table">${(S.settings.tables || []).map((t) => {
        const busy = busyTables.get(t);
        return `<button type="button" class="${S.table === t ? 'on' : ''} ${busy ? 'busy' : ''}" aria-pressed="${S.table === t}" data-act="pickTable" data-v="${esc(t)}" data-mf="${t === (S.settings.tables || [])[0] ? 'table' : ''}">${esc(t)}${busy ? `<small>#${busy}</small>` : ''}</button>`;
      }).join('')}</div><div class="muted small">Tables with a number already have an open bill.</div></div>` : ''}
      <label class="field">Customer phone ${S.type === 'deliv' ? '*' : '(for loyalty)'}<input data-mf="phone" data-bind="phone" type="tel" inputmode="tel" placeholder="03xx xxxxxxx" value="${esc(S.phone)}" autocomplete="off"></label>
      <div id="guest">${guestHtml()}</div>
      <label class="field">Customer name<input data-mf="name" data-bind="custName" value="${esc(S.custName)}" autocomplete="off"></label>
      ${S.type === 'deliv' ? `<label class="field">Delivery address *<input data-mf="address" data-bind="address" value="${esc(S.address)}" placeholder="House, street, area" autocomplete="off"></label>
        <label class="field">Delivery fee (Rs)<input data-mf="fee" data-bind="feeOverride" type="number" min="0" step="10" value="${deliveryFee()}"></label>` : ''}
      <label class="field">Order note for kitchen<input data-mf="notes" data-bind="notes" value="${esc(S.notes)}" placeholder="e.g. birthday — bring candle with dessert" autocomplete="off"></label>
    </div>
    <footer class="mf"><span class="grow"></span><button type="button" class="btn btn-primary btn-lg" data-act="closeModal">Done</button></footer>`);
}
function guestHtml() {
  const p = cleanPhone(S.phone);
  if (!phoneOk(p)) return '';
  const c = S.customer;
  if (!c) return '<div class="guest new">New customer — this order starts their loyalty card.</div>';
  const st = c.stamps || 0;
  return `<div class="guest"><div class="stamps" aria-hidden="true">${Array.from({ length: req() }, (_, i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</div>
    <div><b>${esc(c.name || 'Returning guest')}</b> · ${st} of ${req()} stamps · ${c.visits || 0} visits<br>
    <span style="color:var(--gold)">${rewardReady(c, req()) ? `Reward ready — ${loyalPct()}% off this order` : `${req() - st} more paid visit${req() - st === 1 ? '' : 's'} to ${loyalPct()}% off`}</span>${c.notes ? `<br>Note: ${esc(c.notes)}` : ''}</div></div>`;
}
let phoneTimer = null;
function onPhoneInput() {
  const p = cleanPhone(S.phone);
  clearTimeout(phoneTimer);
  if (!phoneOk(p)) { S.customer = null; const g = $('#guest'); if (g) g.innerHTML = ''; return; }
  phoneTimer = setTimeout(() => run(async () => {
    S.customer = await api.getCustomer(p);
    if (S.customer) {
      const n = $('[data-bind=custName]'); if (n && !n.value && S.customer.name) { n.value = S.customer.name; S.custName = S.customer.name; }
      const a = $('[data-bind=address]'); if (a && !a.value && S.customer.address) { a.value = S.customer.address; S.address = S.customer.address; }
    }
    const g = $('#guest'); if (g) g.innerHTML = guestHtml();
  }), 250);
}

// ----- Line pop-up: quantity, item note, remove -----
function openLine(idx) {
  const l = S.cart[idx]; if (!l) return;
  S.m = { kind: 'line', idx, qty: l.qty, note: l.note || '' };
  renderLineModal();
}
function renderLineModal() {
  const m = S.m, l = S.cart[m.idx];
  openModal('sm', `
    ${modalHead(esc(l.name), fmt(l.price) + ' each')}
    <div class="mb stack">
      <div class="row" style="justify-content:center;gap:16px">
        <button type="button" class="qty-big" data-act="lineQty" data-d="-1" aria-label="One less">−</button>
        <b style="font-size:32px;min-width:48px;text-align:center" aria-live="polite">${m.qty}</b>
        <button type="button" class="qty-big" data-act="lineQty" data-d="1" aria-label="One more">+</button>
      </div>
      <label class="field">Note for this item<input data-m="note" value="${esc(m.note)}" placeholder="e.g. no onions" autocomplete="off"></label>
      <div class="chips">${NOTE_CHIPS.map((n) => `<button type="button" class="chip-sm" data-act="lineNote" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>
    </div>
    <footer class="mf"><button type="button" class="btn btn-danger" data-act="lineRemove">${icon('trash', 18)} Remove item</button><span class="grow"></span>
      <button type="button" class="btn btn-primary btn-lg" data-act="lineSave">Save · ${fmt(l.price * m.qty)}</button></footer>`);
}

// ----- Discount pop-up -----
function openDiscount() {
  const d = S.discount || {};
  S.m = {
    kind: 'discount', scope: d.scope || 'bill', type: d.type || 'pct', value: d.scope === 'bill' ? (d.value ?? '') : '',
    reason: d.reason || '', bank: d.bank || '', custom: d.reason && !S.settings.discount_reasons.includes(d.reason) && d.reason !== 'Loyalty reward' ? d.reason : '',
    lines: S.cart.map((l) => ({ type: l.disc?.type || 'pct', value: l.disc?.value ?? '' }))
  };
  renderDiscount();
}
function draftDiscount() {
  const m = S.m;
  const reason = m.custom.trim() || m.reason;
  if (m.scope === 'bill') return Number(m.value) > 0 ? { scope: 'bill', type: m.type, value: Number(m.value), reason, bank: m.reason === 'Bank / card offer' ? m.bank : '' } : null;
  const any = m.lines.some((x) => Number(x.value) > 0);
  return any ? { scope: 'items', type: 'pct', value: 0, reason, bank: m.reason === 'Bank / card offer' ? m.bank : '' } : null;
}
function draftLines() {
  const m = S.m;
  return S.cart.map((l, i) => ({ ...l, disc: m.scope === 'items' && Number(m.lines[i].value) > 0 ? { type: m.lines[i].type, value: Number(m.lines[i].value) } : null }));
}
function discountPreview() {
  const d = draftDiscount();
  const before = computeBill(S.cart, { ...ctxNow('Cash'), discount: null });
  const after = computeBill(draftLines(), { ...ctxNow('Cash'), discount: d });
  const share = discountShare(after);
  const cap = Number(S.settings.cashier_max_discount_pct) || 0;
  const over = !isOwner() && d && d.reason !== 'Loyalty reward' && cap > 0 && share > cap + 0.01;
  return { before, after, share, over, cap, d };
}
function renderDiscount() {
  const m = S.m, s = S.settings;
  const v = discountPreview();
  const reasons = s.discount_reasons || [];
  openModal('lg', `
    ${modalHead('Discount', 'Choose how much, then why')}
    <div class="mb disc">
      <div class="disc-left stack">
        ${loyaltyAvailable() ? `<button type="button" class="loyal-banner" data-act="applyLoyalty">${icon('star', 18)}<span><b>Loyalty reward ready</b> — ${esc(S.customer.name || 'this customer')} has a full card. Apply ${loyalPct()}% off</span></button>` : ''}
        <div class="seg" role="group" aria-label="Discount on">
          <button type="button" class="${m.scope === 'bill' ? 'on' : ''}" data-act="dScope" data-v="bill">Whole bill</button>
          <button type="button" class="${m.scope === 'items' ? 'on' : ''}" data-act="dScope" data-v="items">Item-wise</button>
        </div>
        ${m.scope === 'bill' ? `
          <div class="seg" role="group" aria-label="Discount type">
            <button type="button" class="${m.type === 'pct' ? 'on' : ''}" data-act="dType" data-v="pct">Percentage %</button>
            <button type="button" class="${m.type === 'amt' ? 'on' : ''}" data-act="dType" data-v="amt">Fixed amount Rs</button>
          </div>
          <div class="chips">${(m.type === 'pct' ? (s.quick_discounts || []) : [50, 100, 200, 300, 500, 1000]).map((q) =>
            `<button type="button" class="chip-lg ${Number(m.value) === Number(q) ? 'on' : ''}" data-act="dQuick" data-v="${q}">${m.type === 'pct' ? q + '%' : 'Rs ' + num(q)}</button>`).join('')}</div>
          <label class="field">${m.type === 'pct' ? 'Custom percentage' : 'Custom amount (Rs)'}<input data-m="value" type="number" min="0" ${m.type === 'pct' ? 'max="100"' : ''} step="1" value="${esc(m.value)}" inputmode="decimal"></label>`
        : `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Item</th><th class="num">Amount</th><th>Type</th><th>Value</th><th class="num">Off</th></tr></thead><tbody>
            ${S.cart.map((l, i) => {
              const ln = m.lines[i];
              const off = lineDiscount({ ...l, disc: Number(ln.value) > 0 ? { type: ln.type, value: Number(ln.value) } : null });
              return `<tr><td>${l.qty}× ${esc(l.name)}</td><td class="num">${fmt(l.price * l.qty)}</td>
                <td><div class="seg mini"><button type="button" class="${ln.type === 'pct' ? 'on' : ''}" data-act="dLineType" data-i="${i}" data-v="pct">%</button><button type="button" class="${ln.type === 'amt' ? 'on' : ''}" data-act="dLineType" data-i="${i}" data-v="amt">Rs</button></div></td>
                <td><input class="input" style="width:90px" data-ml="${i}" type="number" min="0" value="${esc(ln.value)}" aria-label="Discount for ${esc(l.name)}" inputmode="decimal"></td>
                <td class="num ok-text" id="off-${i}">${off ? '−' + fmt(off) : '—'}</td></tr>`;
            }).join('')}</tbody></table></div>`}
        <div>
          <div class="lbl">Reason</div>
          <div class="chips">${reasons.map((r) => `<button type="button" class="chip-sm ${m.reason === r && !m.custom ? 'on' : ''}" data-act="dReason" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>
          ${m.reason === 'Bank / card offer' && !m.custom ? `<div class="lbl" style="margin-top:12px">Which bank?</div><div class="chips">${(s.banks || []).map((b) => `<button type="button" class="chip-sm ${m.bank === b ? 'on' : ''}" data-act="dBank" data-v="${esc(b)}">${esc(b)}</button>`).join('')}</div>` : ''}
          <label class="field" style="margin-top:10px">Or type a reason<input data-m="custom" value="${esc(m.custom)}" placeholder="e.g. birthday" autocomplete="off"></label>
        </div>
      </div>
      <aside class="disc-right" id="disc-preview">${discPreviewHtml(v)}</aside>
    </div>
    <footer class="mf">
      ${S.discount ? '<button type="button" class="btn btn-danger" data-act="dRemove">Remove discount</button>' : ''}
      <span class="grow"></span>
      <button type="button" class="btn btn-lg" data-act="closeModal">Cancel</button>
      <button type="button" class="btn btn-primary btn-lg" data-act="dApply" id="d-apply" ${v.d && !v.over ? '' : 'disabled'}>Apply discount</button>
    </footer>`);
}
function discPreviewHtml(v) {
  return `<div class="lbl">Preview</div>
    <dl class="tot">
      <div><dt>Subtotal</dt><dd>${fmt(v.after.subtotal)}</dd></div>
      <div class="ok-text"><dt>Discount${v.after.subtotal ? ` (${v.share.toFixed(v.share % 1 ? 1 : 0)}%)` : ''}</dt><dd>− ${fmt(v.after.discount)}</dd></div>
      ${v.after.service ? `<div><dt>Service charge</dt><dd>${fmt(v.after.service)}</dd></div>` : ''}
      ${v.after.tax ? `<div><dt>${v.after.inclusive ? 'Incl. tax' : 'Tax'} (cash)</dt><dd>${fmt(v.after.tax)}</dd></div>` : ''}
      ${v.after.fee ? `<div><dt>Delivery</dt><dd>${fmt(v.after.fee)}</dd></div>` : ''}
      <div class="was"><dt>Was</dt><dd><s>${fmt(v.before.total)}</s></dd></div>
      <div class="grand"><dt>New total</dt><dd>${fmt(v.after.total)}</dd></div>
    </dl>
    ${v.over ? `<div class="error">Cashiers can give up to ${v.cap}%. This is ${v.share.toFixed(0)}% — ask the owner.</div>` : ''}
    ${v.d && !v.d.reason ? '<div class="muted small">Tip: pick a reason so reports show why discounts were given.</div>' : ''}`;
}
function refreshDiscountPreview() {
  const v = discountPreview();
  const el = $('#disc-preview'); if (el) el.innerHTML = discPreviewHtml(v);
  const b = $('#d-apply'); if (b) b.disabled = !(v.d && !v.over);
  S.m.lines.forEach((ln, i) => {
    const c = $('#off-' + i); if (!c) return;
    const off = lineDiscount({ ...S.cart[i], disc: Number(ln.value) > 0 ? { type: ln.type, value: Number(ln.value) } : null });
    c.textContent = off ? '−' + fmt(off) : '—';
  });
}

// ----- Payment pop-up -----
function openPayment(target) {
  // target: null = the order on screen; or an existing order object
  if (!target) { const problem = validateOrder(); if (problem) return needsDetails(problem); }
  let pr = true; try { pr = localStorage.getItem('kafeo-print') !== '0'; } catch { pr = true; }
  S.m = { kind: 'pay', target, method: 'Cash', received: '', print: pr };
  renderPayment();
}
function payBill() {
  const m = S.m;
  return m.target ? computeBill(m.target.items, ctxForOrder(m.target, m.method)) : computeBill(S.cart, ctxNow(m.method));
}
function renderPayment() {
  const m = S.m, s = S.settings;
  const bill = payBill();
  const t = m.target;
  openModal('lg', `
    ${modalHead(t ? `Take payment · Order #${t.id}` : 'Take payment', t ? (t.type === 'dine' ? 'Table ' + esc(t.table_no) : TYPE_LABEL[t.type]) : (S.type === 'dine' ? 'Table ' + esc(S.table) : TYPE_LABEL[S.type]))}
    <div class="mb pay">
      <div class="stack">
        <div class="lbl">Payment method</div>
        <div class="methods">${PAY_METHODS.map((pm) => `<button type="button" class="${m.method === pm ? 'on' : ''}" aria-pressed="${m.method === pm}" data-act="pMethod" data-v="${pm}">
          <b>${pm}</b><small>${taxRateFor(pm, s) ? `Tax ${num(taxRateFor(pm, s))}%` : 'No tax'}</small></button>`).join('')}</div>
        ${m.method === 'Cash' ? `
          <label class="field">Cash received (Rs)<input data-m="received" type="number" min="0" step="10" inputmode="numeric" value="${esc(m.received)}" placeholder="${bill.total}"></label>
          <div class="chips">${cashSuggestions(bill.total).map((v) => `<button type="button" class="chip-lg ${Number(m.received) === v ? 'on' : ''}" data-act="pCash" data-v="${v}">${v === bill.total ? 'Exact' : 'Rs ' + num(v)}</button>`).join('')}</div>
          <div class="change" id="change">${changeHtml(bill)}</div>` : `<div class="muted">Confirm the ${esc(m.method)} payment of <b>${fmt(bill.total)}</b> has gone through before completing.</div>`}
        <label class="check"><input type="checkbox" data-mc="print" ${m.print ? 'checked' : ''}> Print receipt</label>
      </div>
      <aside class="disc-right">
        <div class="lbl">Bill</div>
        <dl class="tot">
          <div><dt>Subtotal</dt><dd>${fmt(bill.subtotal)}</dd></div>
          ${bill.discount ? `<div class="ok-text"><dt>Discount</dt><dd>− ${fmt(bill.discount)}</dd></div>` : ''}
          ${bill.service ? `<div><dt>Service charge ${num(bill.servicePct)}%</dt><dd>${fmt(bill.service)}</dd></div>` : ''}
          <div><dt>${bill.inclusive ? 'Incl. tax' : 'Tax'} ${num(bill.taxRate)}% (${isDigital(m.method) ? 'card/digital' : 'cash'})</dt><dd>${fmt(bill.tax)}</dd></div>
          ${bill.fee ? `<div><dt>Delivery fee</dt><dd>${fmt(bill.fee)}</dd></div>` : ''}
          ${bill.roundOff ? `<div><dt>Round off</dt><dd>${bill.roundOff > 0 ? '+' : '−'} ${fmt(Math.abs(bill.roundOff))}</dd></div>` : ''}
          <div class="grand"><dt>To pay</dt><dd>${fmt(bill.total)}</dd></div>
        </dl>
        ${Number(s.tax_cash_pct) !== Number(s.tax_digital_pct) ? `<div class="muted small">Tax changes with the payment method (cash ${num(s.tax_cash_pct)}% · card/wallet ${num(s.tax_digital_pct)}%).</div>` : ''}
      </aside>
    </div>
    <footer class="mf"><span class="grow"></span>
      <button type="button" class="btn btn-lg" data-act="closeModal">Cancel</button>
      <button type="button" class="btn btn-primary btn-lg" data-act="pComplete" id="p-go">Complete payment · ${fmt(bill.total)}</button></footer>`);
}
function changeHtml(bill) {
  const r = Number(S.m.received);
  if (!S.m.received) return `<span>Change to return</span><b>Rs 0</b>`;
  if (r < bill.total) return `<span class="err-text">Short by</span><b class="err-text">${fmt(bill.total - r)}</b>`;
  return `<span>Change to return</span><b>${fmt(r - bill.total)}</b>`;
}
async function completePayment() {
  const m = S.m;
  const bill = payBill();
  const received = m.method === 'Cash' ? (m.received === '' ? bill.total : Number(m.received)) : bill.total;
  if (received < bill.total) return toast(`Cash received is less than ${fmt(bill.total)}`, { err: true });
  const extra = { cash_received: m.method === 'Cash' ? received : 0, change_due: m.method === 'Cash' ? received - bill.total : 0 };
  try { localStorage.setItem('kafeo-print', m.print ? '1' : '0'); } catch { /* ignore */ }
  const btn = $('#p-go'); if (btn) btn.disabled = true;
  const print = m.print, target = m.target, wasEdit = !!S.editing;
  let row;
  if (target) row = await run(() => payExisting(target, m.method, extra));
  else row = await saveOrder(m.method, extra);
  if (!row) { if (btn) btn.disabled = false; return; }
  closeModal();
  renderBillsBadge();
  if (S.route !== 'order') renderScreen();
  toast(`Order #${row.id} paid by ${row.payment}${row.change_due ? ` · change ${fmt(row.change_due)}` : ''}`, { action: { label: 'Print receipt', fn: () => printReceipt(row, { reprint: true }) } });
  // New order paid at the counter → kitchen ticket too. Paying a running bill → receipt only.
  await printAfterSave(row, { kot: !target, onlyNew: wasEdit, receipt: print });
}

// =====================================================================
// ORDERS — running bills (pay after food) + paid today
// =====================================================================
const whereOf = (o) => o.type === 'dine' ? `Table ${esc(o.table_no)}` : `${TYPE_LABEL[o.type]}${o.customer_name ? ' · ' + esc(o.customer_name) : ''}`;
function renderOrders(el) {
  el.className = 'screen';
  const bills = unpaidBills();
  const paidToday = S.today.filter((o) => o.paid && o.status !== 'cancelled');
  const f = S.ordersFilter;
  const shown = bills.filter((o) => f === 'all' || o.type === f);
  const due = bills.reduce((a, o) => a + Number(o.total), 0);
  const byTable = new Map();
  bills.filter((o) => o.type === 'dine').forEach((o) => { const t = byTable.get(o.table_no) || []; t.push(o); byTable.set(o.table_no, t); });
  const counts = { all: bills.length, dine: 0, take: 0, deliv: 0 };
  bills.forEach((o) => { counts[o.type]++; });
  const kitchenTag = (o) => {
    const map = { new: ['In queue', ''], preparing: ['Preparing', 'warn'], ready: ['Ready to serve', 'ok'], out: ['Out for delivery', ''], done: ['Served', 'ok'] };
    const [t, c] = map[o.status] || [STATUS_LABEL[o.status], ''];
    return `<span class="tag ${c}">${t}</span>`;
  };
  el.innerHTML = `
    <div class="screen-head">
      <div><h1>Orders</h1><div class="muted">Customers who pay after their food. Add items any time, take payment when they’re done.</div></div>
      <span class="grow"></span>
      <div class="kpi"><div class="l">Running bills</div><div class="v">${bills.length}</div></div>
      <div class="kpi"><div class="l">Waiting to be paid</div><div class="v">${fmt(due)}</div></div>
      <a class="btn btn-primary btn-lg" href="#order">+ New order</a>
    </div>
    <div class="seg" role="tablist" style="max-width:420px">
      <button type="button" class="${S.ordersTab === 'open' ? 'on' : ''}" data-act="ordersTab" data-v="open">Running (${bills.length})</button>
      <button type="button" class="${S.ordersTab === 'paid' ? 'on' : ''}" data-act="ordersTab" data-v="paid">Paid today (${paidToday.length})</button>
    </div>
    ${S.ordersTab === 'open' ? `
    <section class="panel">
      <div class="row" style="margin-bottom:12px"><h2 style="margin:0">Tables</h2><span class="grow"></span>
        <span class="legend"><i class="free"></i>Free</span><span class="legend"><i class="busy"></i>Has a bill</span></div>
      <div class="tables-map">${(S.settings.tables || []).map((t) => {
        const list = byTable.get(t) || [];
        const amt = list.reduce((a, o) => a + Number(o.total), 0);
        return list.length
          ? `<button type="button" class="tmap busy" data-act="tableBill" data-v="${esc(t)}"><b>${esc(t)}</b><span>${fmt(amt)}</span><small>${minutesSince(list[0].created_at)} min · #${list.map((o) => o.id).join(', #')}</small></button>`
          : `<button type="button" class="tmap" data-act="tableNew" data-v="${esc(t)}"><b>${esc(t)}</b><span>Free</span><small>Tap to start order</small></button>`;
      }).join('')}</div>
    </section>
    <div class="row wrap">${[['all', 'All'], ['dine', 'Dine-in'], ['take', 'Takeaway'], ['deliv', 'Delivery']].map(([v, l]) =>
      `<button type="button" class="pill ${f === v ? 'on' : ''}" aria-pressed="${f === v}" data-act="ordersFilter" data-v="${v}">${l} · ${counts[v]}</button>`).join('')}</div>
    <div class="bills-grid">${shown.length ? shown.map((o) => `
      <article class="bill" id="bill-${o.id}">
        <div class="row"><b class="bill-where">${whereOf(o)}</b><span class="grow"></span>${kitchenTag(o)}</div>
        <div class="row muted small"><span>Order #${o.id}</span><span>·</span><span>${minutesSince(o.created_at)} min ago</span>${o.meta?.by ? `<span>·</span><span>${esc(o.meta.by)}</span>` : ''}</div>
        <ul class="bill-items">${o.items.map((l) => `<li><span>${l.qty}× ${esc(l.name)}${l.note ? ` <em>${esc(l.note)}</em>` : ''}</span><span>${num(l.price * l.qty)}</span></li>`).join('')}</ul>
        ${o.discount_label ? `<div class="small ok-text">Discount: ${esc(o.discount_label)} (−${fmt(o.discount)})</div>` : ''}
        <div class="bill-total"><span>Total</span><b>${fmt(o.total)}</b></div>
        <div class="bill-actions">
          <button type="button" class="btn btn-primary btn-lg" data-act="payOpen" data-id="${o.id}">Take payment</button>
          <button type="button" class="btn" data-act="editOpen" data-id="${o.id}">${icon('edit', 18)} Add items</button>
          <button type="button" class="btn" data-act="print" data-id="${o.id}">${icon('print', 18)} Print bill</button>
          <button type="button" class="btn" data-act="printKot" data-id="${o.id}" aria-label="Reprint kitchen ticket for order ${o.id}">KOT</button>
          ${isOwner() ? `<button type="button" class="btn btn-danger" data-act="cancelOrder" data-id="${o.id}" aria-label="Cancel order ${o.id}">${icon('x', 18)}</button>` : ''}
        </div>
      </article>`).join('') : `<div class="empty panel">No running ${f === 'all' ? '' : TYPE_LABEL[f].toLowerCase() + ' '}orders. Use <b>+ New order</b> → add items → <b>Add order</b>.</div>`}</div>`
    : (paidToday.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Time</th><th>Where</th><th>Items</th><th>Paid by</th><th class="num">Total</th><th></th></tr></thead><tbody>${paidToday.map((o) => `
        <tr><td>#${o.id}</td><td>${new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td><td>${whereOf(o)}</td>
        <td class="small">${o.items.map((l) => `${l.qty}× ${esc(l.name)}`).join(', ')}</td><td>${esc(o.payment)}</td><td class="num">${fmt(o.total)}</td>
        <td class="num"><button type="button" class="btn btn-sm" data-act="print" data-id="${o.id}">Receipt</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty panel">Nothing paid yet today.</div>')}`;
}

// =====================================================================
// KITCHEN DISPLAY
// =====================================================================
function renderKitchen(el) {
  el.className = 'screen kds';
  const active = S.open.filter((o) => ['new', 'preparing', 'ready'].includes(o.status));
  const filt = (o) => o.items.filter((i) => S.station === 'all' || i.station === S.station);
  const col = (status, title, dot) => {
    const list = active.filter((o) => o.status === status && filt(o).length);
    return `<section class="kcol" aria-label="${title}">
      <h2><i style="background:${dot}"></i>${title} <span class="muted">${list.length}</span></h2>
      ${list.map((o) => ticketK(o, filt(o))).join('') || '<div class="muted small" style="padding:8px">Nothing here</div>'}
    </section>`;
  };
  el.innerHTML = `
    <div class="screen-head">
      <h1>Kitchen</h1><span class="muted">New orders beep · tickets turn red after ${LATE_MIN} min</span>
      <span class="grow"></span>
      ${[['all', 'All stations'], ['kitchen', 'Kitchen'], ['bar', 'Bar & coffee']].map(([v, l]) =>
        `<button type="button" class="pill ${S.station === v ? 'on' : ''}" aria-pressed="${S.station === v}" data-act="station" data-v="${v}">${l}</button>`).join('')}
    </div>
    <div class="kcols">${col('new', 'New', 'var(--gold)')}${col('preparing', 'Preparing', '#F0A35E')}${col('ready', 'Ready', '#7BC47F')}</div>`;
}
function ticketK(o, items) {
  const age = minutesSince(o.created_at);
  const late = age >= LATE_MIN && o.status !== 'ready';
  const where = o.type === 'dine' ? `Table ${esc(o.table_no)}` : o.type === 'take' ? `Takeaway${o.customer_name ? ' · ' + esc(o.customer_name) : ''}` : 'Delivery';
  let btn;
  if (o.status === 'new') btn = `<button type="button" class="btn kbtn-start" data-act="kstatus" data-id="${o.id}" data-v="preparing">Start preparing</button>`;
  else if (o.status === 'preparing') btn = `<button type="button" class="btn kbtn-ready" data-act="kstatus" data-id="${o.id}" data-v="ready">Mark ready</button>`;
  else if (o.type === 'deliv') btn = '<span class="tag dark">Waiting for rider</span>';
  else btn = `<button type="button" class="btn kbtn-done" data-act="kstatus" data-id="${o.id}" data-v="done">${o.type === 'take' ? 'Picked up' : 'Served'}</button>`;
  return `<article class="ktk ${late ? 'late' : ''}">
    <div class="row"><span class="no">#${o.id}</span><span class="tag dark">${where}</span><span class="age">${age} min</span><button type="button" class="kprint" data-act="printKot" data-id="${o.id}" aria-label="Print kitchen ticket">${icon('print', 16)}</button></div>
    ${items.map((i) => `<div class="it ${i.added ? 'added' : ''}"><b>${i.qty}×</b><span>${esc(i.name)}${i.added ? ` <em class="tag new">+${i.added} NEW</em>` : ''}${i.note ? `<small>${esc(i.note)}</small>` : ''}</span></div>`).join('')}
    ${o.notes ? `<div class="knote">Note: ${esc(o.notes)}</div>` : ''}
    ${o.reward ? `<div class="knote">Add free: ${esc(o.reward)}</div>` : ''}
    ${btn}
  </article>`;
}

// =====================================================================
// DELIVERY
// =====================================================================
function renderDelivery(el) {
  el.className = 'screen';
  const active = S.open.filter((o) => o.type === 'deliv' && !['done', 'cancelled'].includes(o.status));
  const doneToday = S.today.filter((o) => o.type === 'deliv' && o.status === 'done');
  const riders = S.riders.filter((r) => r.active);
  const riderName = (id) => S.riders.find((r) => r.id === id)?.name || '—';
  const canAssign = role() !== 'rider';
  const codToCollect = active.filter((o) => !o.paid).reduce((s, o) => s + Number(o.total), 0);
  el.innerHTML = `
    <div class="screen-head"><h1>Delivery</h1><span class="grow"></span>
      <div class="kpi"><div class="l">Active</div><div class="v">${active.length}</div></div>
      <div class="kpi"><div class="l">Out now</div><div class="v">${active.filter((o) => o.status === 'out').length}</div></div>
      <div class="kpi"><div class="l">Cash to collect</div><div class="v">${fmt(codToCollect)}</div></div></div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Order</th><th>Customer</th><th class="num">Total</th><th>Status</th><th>Rider</th><th></th></tr></thead>
      <tbody>${active.length ? active.map((o) => `
        <tr>
          <td><b>#${o.id}</b><div class="muted small">${minutesSince(o.created_at)} min ago</div></td>
          <td><b>${esc(o.customer_name || 'Customer')}</b><div class="small"><a href="tel:${esc(o.customer_phone)}">${esc(o.customer_phone)}</a></div><div class="muted small">${esc(o.address)}</div></td>
          <td class="num"><b>${fmt(o.total)}</b><div class="small ${o.paid ? '' : 'muted'}">${o.paid ? 'Paid · ' + esc(o.payment) : 'Collect cash'}</div></td>
          <td><span class="tag ${o.status === 'ready' ? 'ok' : ''}">${STATUS_LABEL[o.status]}</span></td>
          <td>${canAssign ? `<label class="sr" for="rd${o.id}">Rider for order ${o.id}</label><select id="rd${o.id}" class="input" style="min-width:130px" data-change="rider" data-id="${o.id}">
              <option value="">Assign…</option>${riders.map((r) => `<option value="${r.id}" ${o.rider_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>`
            : esc(riderName(o.rider_id))}</td>
          <td class="num">${o.status === 'out'
            ? `<button type="button" class="btn btn-ok btn-sm" data-act="delivered" data-id="${o.id}">Delivered${o.paid ? '' : ' + cash'}</button>`
            : `<button type="button" class="btn btn-sm" data-act="outFor" data-id="${o.id}">Out for delivery</button>`}</td>
        </tr>`).join('') : '<tr><td colspan="6" class="empty">No active deliveries.</td></tr>'}</tbody>
    </table></div>
    <h2 style="margin:4px 0 0;font-size:16px">Riders today</h2>
    <div class="kpis">${riders.map((r) => {
      const mine = doneToday.filter((o) => o.rider_id === r.id);
      const cash = mine.filter((o) => o.payment === 'Cash (COD)').reduce((s, o) => s + Number(o.total), 0);
      const onTrip = active.find((o) => o.rider_id === r.id && o.status === 'out');
      return `<div class="kpi"><div class="l">${esc(r.name)}</div><div class="v">${mine.length} trips</div>
        <div class="s">${onTrip ? `On route · #${onTrip.id}` : 'At café'} · cash collected ${fmt(cash)}</div></div>`;
    }).join('') || '<div class="muted">No riders yet. The owner can add them in Settings.</div>'}</div>`;
}

// =====================================================================
// REPORTS
// =====================================================================
async function loadReport() {
  const days = { today: 1, week: 7, month: 30 }[S.rep.range] || 1;
  const to = new Date(startOfDay().getTime() + 864e5);
  const from = new Date(to.getTime() - days * 864e5);
  S.rep.orders = await api.ordersBetween(from.toISOString(), to.toISOString());
  S.rep.loaded = true;
}
function renderReports(el) {
  el.className = 'screen';
  if (!S.rep.loaded) { el.innerHTML = '<div class="empty">Loading report…</div>'; run(async () => { await loadReport(); renderScreen(); }); return; }
  const r = summarize(S.rep.orders);
  const inc = incentives(S.today, S.settings.incentives, S.settings.incentive_daily_cap);
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => r.byHour[h] || (h >= 11 && h <= 23));
  const maxH = Math.max(1, ...hours.map((h) => r.byHour[h] || 0));
  const payTotal = Object.values(r.byPay).reduce((s, v) => s + v, 0) || 1;
  const typeTotal = r.orders || 1;
  const hl = (h) => (h % 12 || 12) + (h < 12 ? 'a' : 'p');
  el.innerHTML = `
    <div class="screen-head"><h1>Reports</h1><span class="grow"></span>
      <div class="seg" role="group" aria-label="Period" style="min-width:300px">${[['today', 'Today'], ['week', '7 days'], ['month', '30 days']].map(([v, l]) =>
        `<button type="button" class="${S.rep.range === v ? 'on' : ''}" aria-pressed="${S.rep.range === v}" data-act="range" data-v="${v}">${l}</button>`).join('')}</div>
      <button type="button" class="btn" data-act="csv">Download orders (CSV)</button>
      <button type="button" class="btn btn-primary" data-act="zreport">Print Z-report</button></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Net sales</div><div class="v">${fmt(r.net)}</div><div class="s">paid orders, after discounts</div></div>
      <div class="kpi"><div class="l">Orders</div><div class="v">${r.orders}</div><div class="s">${r.byType.dine} dine-in · ${r.byType.take} takeaway · ${r.byType.deliv} delivery</div></div>
      <div class="kpi"><div class="l">Average bill</div><div class="v">${fmt(r.avg)}</div><div class="s">per paid order</div></div>
      <div class="kpi"><div class="l">Tax collected</div><div class="v">${fmt(r.tax)}</div><div class="s">service charge ${fmt(r.service)}</div></div>
      <div class="kpi"><div class="l">Discounts given</div><div class="v">${fmt(r.discounts)}</div><div class="s">${r.loyaltyUsed} loyalty reward${r.loyaltyUsed === 1 ? '' : 's'}</div></div>
      <div class="kpi"><div class="l">Unpaid / cancelled</div><div class="v">${fmt(r.unpaid)}</div><div class="s">${r.unpaidCount} unpaid · ${r.cancelled} cancelled</div></div>
    </div>
    <div class="cols">
      <section class="panel"><h2>Sales by hour</h2>
        <div class="bars">${hours.map((h) => { const v = r.byHour[h] || 0; return `<div title="${hl(h)}: ${fmt(v)}"><span>${v ? (v / 1000).toFixed(1) + 'k' : ''}</span><span class="b ${v === maxH && v ? 'top' : ''}" style="height:${Math.round(v / maxH * 80)}%"></span>${hl(h)}</div>`; }).join('')}</div>
      </section>
      <section class="panel"><h2>Payments</h2>
        ${Object.entries(r.byPay).map(([k, v]) => `<div class="meter"><span style="width:110px">${esc(k)}</span><span class="track"><span style="width:${Math.round(v / payTotal * 100)}%"></span></span><b style="width:90px" class="right">${fmt(v)}</b></div>`).join('') || '<div class="muted">No paid orders yet.</div>'}
        <h2 style="margin-top:16px">Order type</h2>
        ${['dine', 'take', 'deliv'].map((k) => `<div class="meter"><span style="width:110px">${TYPE_LABEL[k]}</span><span class="track"><span style="width:${Math.round(r.byType[k] / typeTotal * 100)}%;background:var(--ink)"></span></span><b style="width:90px" class="right">${r.byType[k]}</b></div>`).join('')}
        <h2 style="margin-top:16px">Discounts by reason</h2>
        ${Object.entries(r.byReason).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="meter"><span style="flex:1">${esc(k)}</span><b class="right">${fmt(v)}</b></div>`).join('') || '<div class="muted">No discounts.</div>'}
      </section>
      <section class="panel inc"><h2>Staff incentives today</h2>
        <div class="muted small" style="margin:-6px 0 10px">Counted from today's orders · policy v1.0 · verify before paying</div>
        ${inc.pools.map((p) => `<div class="pool"><div class="row"><b>${esc(p.label)}</b><span class="grow"></span><b style="color:var(--gold)">${fmt(p.earned)}</b></div>
          <div class="small muted">${p.count} counted</div><div class="track"><span style="width:${p.pct}%"></span></div><div class="small muted">${esc(p.next)}</div></div>`).join('')}
        <div class="row" style="border-top:1px solid var(--night-line);padding-top:10px"><span>Total today</span><span class="grow"></span><b style="color:var(--gold)">${fmt(inc.total)} / max ${fmt(inc.cap)}</b></div>
      </section>
    </div>
    <section class="panel"><h2>Top sellers</h2>
      ${r.top.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Item</th><th class="num">Sold</th><th class="num">Sales</th></tr></thead><tbody>
        ${r.top.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.name)}</td><td class="num">${t.qty}</td><td class="num">${fmt(t.value)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted">No sales yet.</div>'}
    </section>
    <section class="panel"><h2>Orders</h2>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Time</th><th>Type</th><th>Items</th><th>Discount</th><th>Payment</th><th class="num">Total</th><th></th></tr></thead><tbody>
      ${S.rep.orders.slice(0, 150).map((o) => `<tr>
        <td>#${o.id}</td><td>${new Date(o.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${TYPE_LABEL[o.type]}${o.table_no ? ' · ' + esc(o.table_no) : ''}</td>
        <td class="small">${o.items.map((l) => `${l.qty}× ${esc(l.name)}`).join(', ')}</td>
        <td class="small">${Number(o.discount) ? `${fmt(o.discount)}<br><span class="muted">${esc(o.discount_label)}</span>` : '—'}</td>
        <td>${o.status === 'cancelled' ? '<span class="tag warn">Cancelled</span>' : o.paid ? esc(o.payment) : '<span class="tag">Unpaid</span>'}</td>
        <td class="num">${fmt(o.total)}</td>
        <td class="num"><button type="button" class="btn btn-sm" data-act="print" data-id="${o.id}">Receipt</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No orders in this period.</td></tr>'}
      </tbody></table></div>
    </section>`;
}

function downloadCsv() {
  const head = ['order', 'date', 'type', 'table', 'customer', 'phone', 'items', 'subtotal', 'discount', 'discount_reason', 'service_charge', 'tax_rate', 'tax', 'delivery_fee', 'round_off', 'total', 'payment', 'cash_received', 'change', 'paid', 'status'];
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = S.rep.orders.map((o) => [o.id, o.created_at, TYPE_LABEL[o.type], o.table_no, o.customer_name, o.customer_phone,
    o.items.map((l) => `${l.qty}x ${l.name}`).join('; '), o.subtotal, o.discount, o.discount_label, o.service_charge || 0, o.tax_rate || 0, o.tax, o.delivery_fee,
    o.round_off || 0, o.total, o.payment, o.cash_received || 0, o.change_due || 0, o.paid ? 'yes' : 'no', o.status].map(q).join(','));
  const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kafeo-orders-${S.rep.range}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// =====================================================================
// CUSTOMERS & LOYALTY
// =====================================================================
async function loadCustomers() { S.cs.list = await api.listCustomers(S.cs.q.trim()); }
async function selectCustomer(phone, quiet) {
  S.cs.sel = await api.getCustomer(phone);
  S.cs.orders = S.cs.sel ? await api.ordersForPhone(phone) : [];
  if (!quiet || S.route === 'customers') renderScreen();
}
function renderCustomers(el) {
  el.className = 'cust';
  if (!S.cs.loaded) { S.cs.loaded = true; run(async () => { await loadCustomers(); renderScreen(); }); }
  const c = S.cs.sel;
  el.innerHTML = `
    <section class="cust-list" aria-label="Customer list">
      <h1 style="margin:0;font-size:24px">Customers</h1>
      <label class="search" style="max-width:none">${icon('search', 18)}<span class="sr">Search customers</span>
        <input data-bind="csq" type="search" placeholder="Search by phone or name" value="${esc(S.cs.q)}" autocomplete="off"></label>
      <div class="list" id="cust-rows">${custRows()}</div>
    </section>
    <section class="screen" aria-label="Customer details">
      ${c ? `
      <div class="screen-head"><div><h1>${esc(c.name || 'Customer')}</h1><div class="muted">${esc(c.phone)}${c.address ? ' · ' + esc(c.address) : ''}</div></div>
        <span class="grow"></span>
        <a class="btn btn-ok" target="_blank" rel="noopener" href="${esc(waLink(c.phone, rewardReady(c, req())
          ? `Assalam o Alaikum${c.name ? ' ' + c.name : ''}! Your KAFEO loyalty card is full — enjoy ${loyalPct()}% off on your next visit. See you soon at KAFEO, Shadman.`
          : `Assalam o Alaikum${c.name ? ' ' + c.name : ''}! You have ${c.stamps || 0} of ${req()} stamps on your KAFEO loyalty card. ${req() - (c.stamps || 0)} more visit(s) and you get ${loyalPct()}% off!`))}">WhatsApp reminder</a>
        <button type="button" class="btn btn-primary" data-act="orderFor" data-phone="${esc(c.phone)}">Start order</button></div>
      <div class="cols">
        <div class="loyal-card" aria-label="Loyalty card, ${c.stamps || 0} of ${req()} stamps">
          <div class="row"><span class="brand">KAFEO</span><span class="grow"></span><span class="small" style="letter-spacing:2px;color:var(--night-muted)">LOYALTY</span></div>
          <div class="small" style="color:var(--night-muted)">Coffee • Food • Motivation</div>
          <div class="dots">${Array.from({ length: req() }, (_, i) => `<i class="${i < (c.stamps || 0) ? 'on' : ''}">${i < (c.stamps || 0) ? '✓' : i === req() - 1 ? loyalPct() + '%' : ''}</i>`).join('')}</div>
          <div class="row small" style="color:var(--night-muted)"><span>${req()} stamps = ${loyalPct()}% off</span><span class="grow"></span><span>${c.stamps || 0} of ${req()}</span></div>
        </div>
        <div class="kpis" style="align-content:start">
          <div class="kpi"><div class="l">Visits</div><div class="v">${c.visits || 0}</div></div>
          <div class="kpi"><div class="l">Total spent</div><div class="v">${fmt(c.total_spent)}</div></div>
          <div class="kpi"><div class="l">Rewards used</div><div class="v">${c.rewards_used || 0}</div></div>
          <div class="kpi"><div class="l">Last visit</div><div class="v" style="font-size:18px">${c.last_visit ? new Date(c.last_visit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</div></div>
        </div>
      </div>
      <form class="panel stack" data-submit="saveCustomer">
        <h2>Details</h2>
        <div class="cols">
          <label class="field">Name<input name="name" value="${esc(c.name)}"></label>
          <label class="field">Address<input name="address" value="${esc(c.address)}"></label>
        </div>
        <label class="field">Notes (allergies, usual requests)<input name="notes" value="${esc(c.notes)}"></label>
        <div class="row wrap"><button class="btn btn-primary" type="submit">Save details</button>
          ${isOwner() ? `<span class="grow"></span><button type="button" class="btn" data-act="stamp" data-d="-1">− Stamp</button><button type="button" class="btn" data-act="stamp" data-d="1">+ Stamp</button>` : ''}</div>
      </form>
      <section class="panel"><h2>Recent orders</h2>
        ${S.cs.orders.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${S.cs.orders.map((o) => `<tr><td>#${o.id}</td>
          <td>${new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td><td class="small">${o.items.map((l) => `${l.qty}× ${esc(l.name)}`).join(', ')}</td>
          <td>${TYPE_LABEL[o.type]}</td><td class="num">${fmt(o.total)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted">No orders yet.</div>'}
      </section>` : '<div class="empty">Pick a customer to see their loyalty card and history. Customers are added automatically when the counter enters a phone number on an order.</div>'}
    </section>`;
}
function custRows() {
  return S.cs.list.length ? S.cs.list.map((p) => `
    <button type="button" class="cust-row ${S.cs.sel?.phone === p.phone ? 'on' : ''}" data-act="pickCust" data-phone="${esc(p.phone)}">
      <span class="avatar">${esc((p.name || '#').trim().charAt(0).toUpperCase() || '#')}</span>
      <span class="grow"><b style="display:block">${esc(p.name || 'No name')}</b><span class="muted small">${esc(p.phone)}</span></span>
      <span class="tag ${rewardReady(p, req()) ? 'ok' : ''}">${p.stamps || 0}/${req()}</span>
    </button>`).join('') : '<div class="empty">No customers found.</div>';
}

// =====================================================================
// MENU EDITOR (owner)
// =====================================================================
function renderMenu(el) {
  el.className = 'screen';
  const items = S.menu.items.filter((i) => i.category_id === S.mcat);
  const optsText = (i) => i.options.map((o) => (o.k ? `${o.k}=${o.p}` : `${o.p}`)).join(', ');
  el.innerHTML = `
    <div class="screen-head"><h1>Menu & prices</h1><span class="muted">Changes show on every counter instantly. Add a photo to show it on the order screen.</span></div>
    <div class="row wrap">${S.menu.categories.map((c) =>
      `<button type="button" class="pill ${S.mcat === c.id ? 'on' : ''}" data-act="mcat" data-id="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Photo</th><th>On menu</th><th>Name</th><th>Description</th><th>Prices</th><th>Station</th><th>Incentive</th><th></th></tr></thead>
      <tbody>${items.map((i) => `
        <tr data-row="${esc(i.id)}">
          <td><div class="row">${itemPic(i, 'thumb')}
            <label class="btn btn-sm">${i.image_url ? 'Change' : 'Upload'}<input type="file" accept="image/*" data-photo="${esc(i.id)}" class="sr"></label>
            ${i.image_url ? `<button type="button" class="btn btn-sm btn-danger" data-act="removePhoto" data-id="${esc(i.id)}" aria-label="Remove photo">${icon('x', 16)}</button>` : ''}</div></td>
          <td><label class="check"><input type="checkbox" data-f="active" ${i.active ? 'checked' : ''}><span class="sr">Show ${esc(i.name)}</span></label></td>
          <td><input class="input" data-f="name" value="${esc(i.name)}" aria-label="Name" style="min-width:170px"></td>
          <td><input class="input" data-f="note" value="${esc(i.note)}" aria-label="Description" style="min-width:160px"></td>
          <td><input class="input" data-f="options" value="${esc(optsText(i))}" aria-label="Prices" style="min-width:170px" title="Single price: 549 · Sizes: S=999, M=1549, L=2399"></td>
          <td><select class="input" data-f="station" aria-label="Station">${['kitchen', 'bar'].map((s) => `<option ${i.station === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td><select class="input" data-f="counts" aria-label="Incentive pool"><option value="">—</option>${['pizza', 'steak', 'drink'].map((s) => `<option ${i.counts === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td><button type="button" class="btn btn-sm btn-primary" data-act="saveItem" data-id="${esc(i.id)}">Save</button></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <form class="panel stack" data-submit="addItem">
      <h2>Add an item to “${esc(S.menu.categories.find((c) => c.id === S.mcat)?.label || '')}”</h2>
      <div class="cols">
        <label class="field">Name<input name="name" required></label>
        <label class="field">Prices — single: 549 · sizes: S=999, M=1549, L=2399<input name="options" required></label>
        <label class="field">Description (optional)<input name="note"></label>
      </div>
      <div><button class="btn btn-primary" type="submit">Add item</button></div>
    </form>`;
}
async function setPhoto(id, url) {
  const item = S.menu.items.find((i) => i.id === id);
  let saved;
  try { saved = await api.saveMenuItem({ ...item, image_url: url }); }
  catch (e) { throw new Error(/image_url/.test(e.message) ? 'Photos need a one-time database update — run supabase/migrations/003_menu_photos.sql' : e.message); }
  S.menu.items = S.menu.items.map((i) => (i.id === saved.id ? saved : i));
  renderScreen();
}
function parseOptions(text) {
  const parts = String(text).split(',').map((s) => s.trim()).filter(Boolean);
  const opts = parts.map((p) => {
    const m = p.match(/^(.*?)\s*[=:]\s*(\d+)$/);
    if (m) return { k: m[1].trim(), p: Number(m[2]) };
    if (/^\d+$/.test(p)) return { k: '', p: Number(p) };
    return null;
  });
  if (!opts.length || opts.some((o) => !o) || (opts.length > 1 && opts.some((o) => !o.k))) {
    throw new Error('Prices should look like 549 or S=999, M=1549, L=2399');
  }
  return opts;
}

// =====================================================================
// SETTINGS (owner)
// =====================================================================
function renderSettings(el) {
  el.className = 'screen';
  const s = S.settings;
  if (!S.staffLoaded) { S.staffLoaded = true; run(async () => { S.staff = await api.listStaff(); renderScreen(); }); }
  el.innerHTML = `
    <div class="screen-head"><h1>Settings</h1></div>
    <form class="panel stack" data-submit="saveSettings">
      <h2>Tax (GST / PRA)</h2>
      <div class="cols">
        <label class="field">Tax on cash payments %<input name="tax_cash_pct" type="number" min="0" max="30" step="0.5" value="${esc(s.tax_cash_pct)}"></label>
        <label class="field">Tax on card / JazzCash / Easypaisa / bank %<input name="tax_digital_pct" type="number" min="0" max="30" step="0.5" value="${esc(s.tax_digital_pct)}"></label>
        <label class="field">PRA / NTN number (printed on receipts)<input name="tax_number" value="${esc(s.tax_number)}"></label>
      </div>
      <label class="check"><input type="checkbox" name="prices_include_tax" ${s.prices_include_tax ? 'checked' : ''}> Menu prices already include tax (receipt shows “incl. tax”)</label>
      <div class="muted small">Check the current PRA rates with your accountant before going live.</div>
      <h2>Charges</h2>
      <div class="cols">
        <label class="field">Service charge on dine-in %<input name="service_pct" type="number" min="0" max="25" step="0.5" value="${esc(s.service_pct)}"></label>
        <label class="field">Delivery fee (Rs)<input name="delivery_fee" type="number" min="0" step="10" value="${esc(s.delivery_fee)}"></label>
        <label class="field">Round the total to nearest<select name="round_to">${[[0, 'Off (exact)'], [5, 'Rs 5'], [10, 'Rs 10']].map(([v, l]) => `<option value="${v}" ${Number(s.round_to) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <label class="check"><input type="checkbox" name="service_default_on" ${s.service_default_on !== false ? 'checked' : ''}> Add service charge to dine-in orders by default (cashier can switch it off per order)</label>
      <label class="field">Tables (comma separated)<input name="tables" value="${esc((s.tables || []).join(', '))}"></label>
      <h2>Discounts</h2>
      <div class="cols">
        <label class="field">Most a cashier can give (%) — owner has no limit<input name="cashier_max_discount_pct" type="number" min="0" max="100" value="${esc(s.cashier_max_discount_pct)}"></label>
        <label class="field">Quick % buttons (comma separated)<input name="quick_discounts" value="${esc((s.quick_discounts || []).join(', '))}"></label>
        <label class="field">Banks for card offers (comma separated)<input name="banks" value="${esc((s.banks || []).join(', '))}"></label>
      </div>
      <label class="field">Discount reasons — one per line<textarea name="discount_reasons">${esc((s.discount_reasons || []).join('\n'))}</textarea></label>
      <h2>Printing</h2>
      <label class="check"><input type="checkbox" name="kot_auto" ${s.kot_auto !== false ? 'checked' : ''}> Print a kitchen ticket (KOT) automatically when an order is added or paid</label>
      <label class="check"><input type="checkbox" name="kot_split" ${s.kot_split !== false ? 'checked' : ''}> Separate tickets for Kitchen and Bar / Coffee</label>
      <label class="check"><input type="checkbox" name="receipt_loyalty" ${s.receipt_loyalty !== false ? 'checked' : ''}> Show the customer's loyalty stamps on the receipt</label>
      <label class="field">Message at the bottom of the receipt<input name="receipt_footer" value="${esc(s.receipt_footer)}" maxlength="120"></label>
      <div class="row wrap"><button type="button" class="btn" data-act="testPrint" data-v="receipt">${icon('print', 18)} Test receipt</button>
        <button type="button" class="btn" data-act="testPrint" data-v="kot">${icon('print', 18)} Test kitchen ticket</button></div>
      <h2>Loyalty</h2>
      <div class="cols">
        <label class="field">Stamps for a reward<input name="loyalty_stamps" type="number" min="2" max="20" value="${esc(s.loyalty_stamps)}"></label>
        <label class="field">Reward discount %<input name="loyalty_discount_pct" type="number" min="5" max="100" value="${esc(s.loyalty_discount_pct)}"></label>
      </div>
      <label class="field">Buy More, Save More — one per line, “amount = reward”
        <textarea name="bmsm">${esc((s.bmsm || []).map((b) => `${b.min} = ${b.reward}`).join('\n'))}</textarea></label>
      <div><button class="btn btn-primary btn-lg" type="submit">Save settings</button></div>
    </form>
    <section class="panel stack"><h2>Riders</h2>
      ${S.riders.map((r) => `<div class="row wrap">
        <input class="input" style="max-width:220px" data-rider="${r.id}" data-f="name" value="${esc(r.name)}" aria-label="Rider name">
        <input class="input" style="max-width:180px" data-rider="${r.id}" data-f="phone" value="${esc(r.phone)}" aria-label="Rider phone" placeholder="Phone">
        <label class="check"><input type="checkbox" data-rider="${r.id}" data-f="active" ${r.active ? 'checked' : ''}>Active</label>
        <button type="button" class="btn btn-sm" data-act="saveRider" data-id="${r.id}">Save</button></div>`).join('')}
      <form class="row wrap" data-submit="addRider"><input class="input" style="max-width:220px" name="name" placeholder="New rider name" required aria-label="New rider name">
        <input class="input" style="max-width:180px" name="phone" placeholder="Phone" aria-label="New rider phone"><button class="btn btn-sm btn-primary" type="submit">Add rider</button></form>
    </section>
    <section class="panel stack"><h2>Staff logins</h2>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>
        ${S.staff.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${p.active ? '<span class="tag ok">Active</span>' : '<span class="tag warn">Blocked</span>'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="muted small">To add a staff member or reset a password, follow “Add staff logins” in the README (done in Supabase, takes 1 minute).</div>
    </section>
    ${LIVE ? '' : `<section class="panel stack"><h2>Demo data</h2><div class="muted small">Clears all demo orders and customers in this browser.</div>
      <div><button type="button" class="btn btn-danger" data-act="resetDemo">Reset demo data</button></div></section>`}`;
}

// =====================================================================
// ACCOUNT
// =====================================================================
function openAccount() {
  S.m = { kind: 'account' };
  openModal('sm', `
    ${modalHead(esc(S.me.profile.name), `${esc(S.me.user.email)} · ${esc(S.me.profile.role)}`)}
    <form class="mb stack" data-submit="changePw">
      ${LIVE ? `<label class="field">New password (8+ characters)<input name="pw" type="password" minlength="8" autocomplete="new-password"></label>
        <button class="btn" type="submit">Change password</button>` : '<div class="muted">Demo login.</div>'}
    </form>
    <footer class="mf"><button type="button" class="btn btn-dark btn-lg grow" data-act="signOut">Sign out</button></footer>`);
}

// =====================================================================
// PRINTING (80mm thermal or any printer)
// =====================================================================
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
const whereText = (o) => o.type === 'dine' ? `TABLE ${esc(o.table_no)}` : o.type === 'take' ? 'TAKEAWAY' : 'DELIVERY';

// Customer receipt (paid) or bill (unpaid). opts: { reprint, customer }
function receiptHtml(o, opts = {}) {
  const s = S.settings;
  const d = o.meta?.discount;
  const inclusive = o.meta?.inclusive ?? !!s.prices_include_tax;
  const c = opts.customer;
  const qtyTotal = o.items.reduce((a, l) => a + l.qty, 0);
  const row = (l, r, cls = '') => `<div class="r ${cls}"><span>${l}</span><span>${r}</span></div>`;
  return `<div class="slip rcpt">
    <div class="c">
      <div class="brand">KAFEO</div>
      <div class="tagline">COFFEE • FOOD • MOTIVATION</div>
      <div class="sm">${esc(CAFE.address)}</div>
      <div class="sm">Tel / WhatsApp: ${esc(CAFE.phone)}</div>
      ${s.tax_number ? `<div class="sm">PRA / NTN: ${esc(s.tax_number)}</div>` : ''}
    </div>
    <div class="title">${o.status === 'cancelled' ? 'CANCELLED' : o.paid ? 'SALES RECEIPT' : 'BILL — PLEASE PAY AT COUNTER'}${opts.reprint ? '<br><span class="sm">*** REPRINT ***</span>' : ''}</div>
    <div class="meta">
      ${row(`Order <b>#${o.id}</b>`, `<b>${whereText(o)}</b>`)}
      ${row(fmtDate(o.created_at), fmtTime(o.paid ? o.updated_at || o.created_at : o.created_at))}
      ${o.meta?.by ? row('Cashier', esc(o.meta.by)) : ''}
      ${o.customer_name || o.customer_phone ? row('Customer', `${esc(o.customer_name)} ${esc(o.customer_phone)}`.trim()) : ''}
      ${o.address ? `<div class="sm">Deliver to: ${esc(o.address)}</div>` : ''}
    </div>
    <div class="items">
      <div class="ih"><span>Qty</span><span>Item</span><span>Rate</span><span>Amount</span></div>
      ${o.items.map((l) => {
        const ld = d?.scope === 'items' ? lineDiscount(l) : 0;
        return `<div class="ir"><span>${l.qty}</span><span>${esc(l.name)}${l.note ? `<i>${esc(l.note)}</i>` : ''}${ld ? `<i>discount −${num(ld)}</i>` : ''}</span><span>${num(l.price)}</span><span>${num(l.price * l.qty - ld)}</span></div>`;
      }).join('')}
      ${o.reward ? `<div class="ir"><span>1</span><span>${esc(o.reward)}<i>Buy More, Save More</i></span><span>0</span><span>0</span></div>` : ''}
      <div class="sm right">${o.items.length} item${o.items.length === 1 ? '' : 's'} · ${qtyTotal} pcs</div>
    </div>
    <div class="totals">
      ${row('Subtotal', num(o.subtotal))}
      ${Number(o.discount) ? row(`Discount${d?.scope === 'bill' && d.type === 'pct' ? ' ' + num(d.value) + '%' : ''}${o.discount_label ? `<br><span class="sm">${esc(o.discount_label)}</span>` : ''}`, '−' + num(o.discount)) : ''}
      ${Number(o.service_charge) ? row('Service charge', num(o.service_charge)) : ''}
      ${Number(o.tax) ? row(`${inclusive ? 'Incl. ' : ''}${isDigital(o.payment) ? 'Card' : 'Cash'} tax ${num(o.tax_rate)}%`, num(o.tax)) : ''}
      ${Number(o.delivery_fee) ? row('Delivery charges', num(o.delivery_fee)) : ''}
      ${Number(o.round_off) ? row('Round off', (Number(o.round_off) > 0 ? '+' : '−') + num(Math.abs(o.round_off))) : ''}
      ${row('TOTAL', 'Rs ' + num(o.total), 'grand')}
      ${o.paid ? row('Paid by', esc(o.payment)) : ''}
      ${Number(o.cash_received) ? row('Cash received', num(o.cash_received)) + row('Change returned', num(o.change_due)) : ''}
    </div>
    ${c && s.receipt_loyalty !== false ? `<div class="loyal"><div>LOYALTY CARD · ${c.stamps || 0} / ${req()}</div>
      <div class="dots">${Array.from({ length: req() }, (_, i) => `<span class="${i < (c.stamps || 0) ? 'on' : ''}"></span>`).join('')}</div>
      <div class="sm">${rewardReady(c, req()) ? `Card full! ${loyalPct()}% off on your next visit` : `${req() - (c.stamps || 0)} more visit${req() - (c.stamps || 0) === 1 ? '' : 's'} for ${loyalPct()}% off`}</div></div>` : ''}
    <div class="c foot">
      <div class="thanks">${esc(s.receipt_footer || 'Thank you for visiting KAFEO')}</div>
      <div class="sm">Order on WhatsApp ${esc(CAFE.phone)}</div>
      <div class="sm">${esc(CAFE.web)} · ${esc(CAFE.insta)}</div>
    </div>
  </div>`;
}

// Kitchen order ticket — no prices, big text. opts: { station: 'kitchen'|'bar'|null, onlyNew }
function kotHtml(o, opts = {}) {
  let items = o.items.filter((l) => !opts.station || l.station === opts.station);
  if (opts.onlyNew) items = items.filter((l) => l.added > 0).map((l) => ({ ...l, qty: l.added }));
  if (!items.length) return '';
  const label = opts.station === 'bar' ? 'BAR / COFFEE' : 'KITCHEN';
  return `<div class="slip kot">
    <div class="kot-head"><span>${label}</span><span>#${o.id}</span></div>
    ${opts.onlyNew ? '<div class="kot-addon">ADD-ON · NEW ITEMS ONLY</div>' : ''}
    <div class="kot-where">${whereText(o)}${o.type !== 'dine' && o.customer_name ? `<div class="kot-cust">${esc(o.customer_name)}</div>` : ''}</div>
    <div class="r sm"><span>${fmtTime(new Date())}</span><span>${o.meta?.by ? 'By ' + esc(o.meta.by) : ''}</span></div>
    <div class="kot-items">${items.map((l) => `<div class="ki"><b>${l.qty}</b><span>${esc(l.name)}${l.note ? `<i>» ${esc(l.note)}</i>` : ''}</span></div>`).join('')}</div>
    ${o.notes ? `<div class="kot-note">NOTE: ${esc(o.notes)}</div>` : ''}
    ${o.reward && !opts.onlyNew && opts.station !== 'bar' ? `<div class="kot-note">FREE: ${esc(o.reward)}</div>` : ''}
    <div class="c sm">${items.reduce((a, l) => a + l.qty, 0)} item(s)</div>
  </div>`;
}
function kotSlips(o, onlyNew) {
  const split = S.settings.kot_split !== false;
  const slips = split ? [kotHtml(o, { station: 'kitchen', onlyNew }), kotHtml(o, { station: 'bar', onlyNew })] : [kotHtml(o, { onlyNew })];
  return slips.filter(Boolean);
}
function printHtml(html) { if (!html) return; $('#print-area').innerHTML = html; window.print(); }
async function customerFor(o) {
  if (!o.customer_phone || S.settings.receipt_loyalty === false) return null;
  try { return await api.getCustomer(o.customer_phone); } catch { return null; }
}
async function printReceipt(o, opts = {}) { printHtml(receiptHtml(o, { ...opts, customer: await customerFor(o) })); }
function printKot(o, onlyNew = false) {
  const slips = kotSlips(o, onlyNew);
  if (!slips.length) return toast('Nothing new to send to the kitchen');
  printHtml(slips.join(''));
}
// After an order is added / paid: kitchen ticket(s) and, if asked, the receipt — one print job.
async function printAfterSave(o, { kot, onlyNew, receipt }) {
  const parts = [];
  if (kot && S.settings.kot_auto !== false) parts.push(...kotSlips(o, onlyNew));
  if (receipt) parts.push(receiptHtml(o, { customer: await customerFor(o) }));
  printHtml(parts.join(''));
}
function printZ() {
  const r = summarize(S.today);
  const inc = incentives(S.today, S.settings.incentives, S.settings.incentive_daily_cap);
  printHtml(`<div class="rcpt"><div class="c"><div class="brand">KAFEO</div><div>Z-REPORT · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div class="sm">Printed ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} by ${esc(S.me.profile.name)}</div></div><hr>
    <div class="r big"><span>Net sales</span><span>${num(r.net)}</span></div>
    <div class="r"><span>Paid orders</span><span>${r.orders}</span></div>
    <div class="r"><span>Discounts</span><span>${num(r.discounts)}</span></div>
    <div class="r"><span>Service charge</span><span>${num(r.service)}</span></div>
    <div class="r"><span>Tax collected</span><span>${num(r.tax)}</span></div>
    <div class="r"><span>Delivery fees</span><span>${num(r.fees)}</span></div><hr>
    ${Object.entries(r.byPay).map(([k, v]) => `<div class="r"><span>${esc(k)}</span><span>${num(v)}</span></div>`).join('')}<hr>
    ${Object.entries(r.byReason).map(([k, v]) => `<div class="r sm"><span>Disc: ${esc(k)}</span><span>${num(v)}</span></div>`).join('')}
    <div class="r"><span>Unpaid bills (${r.unpaidCount})</span><span>${num(r.unpaid)}</span></div>
    <div class="r"><span>Cancelled orders</span><span>${r.cancelled}</span></div><hr>
    ${inc.pools.map((p) => `<div class="r"><span>${esc(p.label)} (${p.count})</span><span>${num(p.earned)}</span></div>`).join('')}
    <div class="r"><span>Incentives total</span><span>${num(inc.total)}</span></div><hr>
    <div class="sm">Cash counted: ____________<br><br>Signature: ____________</div></div>`);
}

// =====================================================================
// EVENTS
// =====================================================================
const findOrder = (id) => S.open.find((x) => x.id === id) || S.today.find((x) => x.id === id) || S.rep.orders.find((x) => x.id === id);
const ACT = {
  toastAct: () => { const f = toastAction; $('#toast').className = ''; f?.(); },
  demoFill: (d) => { $('input[name=email]').value = d.email; $('input[name=password]').value = DEMO_PASSWORD; },
  signOut: () => run(async () => { unsub?.(); unsub = null; closeModal(); await api.signOut(); S.me = null; location.hash = ''; renderLogin(); }),
  account: () => openAccount(),
  closeModal: () => closeModal(),

  // order screen
  cat: (d) => { S.cat = d.id; S.q = ''; const q = $('[data-bind=q]'); if (q) q.value = ''; renderCats(); renderGrid(); },
  add: (d) => addToCart(d.id, Number(d.o)),
  qty: (d) => {
    const l = S.cart[Number(d.i)]; if (!l) return;
    l.qty += Number(d.d);
    if (l.qty <= 0) S.cart.splice(Number(d.i), 1);
    renderSummary(); renderGrid();
  },
  type: (d) => { S.type = d.v; renderSummary(); },
  details: (d) => openDetails(d.focus),
  pickTable: (d) => { S.table = d.v; renderDetails(); },
  toggleService: () => { S.serviceOn = !S.serviceOn; renderSummary(); },
  clearCart: () => {
    if (S.cart.length && !confirm(S.editing ? 'Stop editing this bill? Changes won’t be saved.' : 'Clear this order?')) return;
    resetOrder(); renderSummary(); renderGrid();
  },
  cancelEdit: () => { resetOrder(); renderSummary(); renderGrid(); },
  applyLoyalty: () => {
    if (!loyaltyAvailable()) return;
    S.discount = { scope: 'bill', type: 'pct', value: loyalPct(), reason: 'Loyalty reward', bank: '' };
    S.cart.forEach((l) => { l.disc = null; });
    if (S.m?.kind === 'discount') closeModal();
    renderSummary(); toast(`Loyalty reward applied — ${loyalPct()}% off`);
  },
  saveOrder: () => run(async () => {
    const wasEdit = !!S.editing;
    const row = await saveOrder(null);
    if (!row) return;
    toast(wasEdit ? `Order #${row.id} updated — customer pays from Orders` : `Order #${row.id} added — customer pays after food from Orders`, { action: { label: 'Print bill', fn: () => printReceipt(row) } });
    await printAfterSave(row, { kot: true, onlyNew: wasEdit, receipt: false });
  }),
  payNow: () => openPayment(null),

  // line pop-up
  editLine: (d) => openLine(Number(d.i)),
  lineQty: (d) => { S.m.qty = Math.max(1, S.m.qty + Number(d.d)); renderLineModal(); },
  lineNote: (d) => { S.m.note = S.m.note ? (S.m.note.includes(d.v) ? S.m.note : S.m.note + ', ' + d.v) : d.v; renderLineModal(); },
  lineRemove: () => { S.cart.splice(S.m.idx, 1); closeModal(); renderSummary(); renderGrid(); },
  lineSave: () => { const l = S.cart[S.m.idx]; l.qty = S.m.qty; l.note = S.m.note.trim(); closeModal(); renderSummary(); renderGrid(); },

  // discount pop-up
  discount: () => openDiscount(),
  dScope: (d) => { S.m.scope = d.v; renderDiscount(); },
  dType: (d) => { S.m.type = d.v; S.m.value = ''; renderDiscount(); },
  dQuick: (d) => { S.m.value = Number(d.v); renderDiscount(); },
  dLineType: (d) => { S.m.lines[Number(d.i)].type = d.v; renderDiscount(); },
  dReason: (d) => { S.m.reason = S.m.reason === d.v ? '' : d.v; S.m.custom = ''; renderDiscount(); },
  dBank: (d) => { S.m.bank = d.v; renderDiscount(); },
  dRemove: () => { S.discount = null; S.cart.forEach((l) => { l.disc = null; }); closeModal(); renderSummary(); toast('Discount removed'); },
  dApply: () => {
    const v = discountPreview();
    if (!v.d || v.over) return;
    S.discount = v.d;
    const lines = draftLines();
    S.cart.forEach((l, i) => { l.disc = lines[i].disc; });
    closeModal(); renderSummary(); toast(`Discount applied · −${fmt(v.after.discount)}`);
  },

  // payment pop-up
  pMethod: (d) => { S.m.method = d.v; renderPayment(); },
  pCash: (d) => { S.m.received = Number(d.v); renderPayment(); },
  pComplete: () => completePayment(),

  // bills drawer
  ordersTab: (d) => { S.ordersTab = d.v; renderScreen(); },
  ordersFilter: (d) => { S.ordersFilter = d.v; renderScreen(); },
  tableNew: (d) => {
    if (S.cart.length && !confirm('There are items on the New order screen. Start this table and keep them?')) return;
    if (S.editing) resetOrder();
    S.type = 'dine'; S.table = d.v; location.hash = '#order';
  },
  tableBill: (d) => {
    const o = unpaidBills().find((x) => x.type === 'dine' && x.table_no === d.v);
    if (o) { S.ordersFilter = 'all'; renderScreen(); document.getElementById('bill-' + o.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  },
  payOpen: (d) => { const o = findOrder(Number(d.id)); if (o) openPayment(o); },
  editOpen: (d) => {
    const o = findOrder(Number(d.id)); if (!o) return;
    if (S.cart.length && !S.editing && !confirm('Replace the order on screen with this bill?')) return;
    loadForEdit(o);
    if (S.route !== 'order') location.hash = '#order'; else { renderSummary(); renderGrid(); }
    toast(`Editing order #${o.id} — add items, then Update or Pay`);
  },
  print: (d) => run(async () => { const o = findOrder(Number(d.id)) || await api.getOrder(Number(d.id)); if (o) await printReceipt(o, { reprint: o.paid }); }),
  printKot: (d) => run(async () => { const o = findOrder(Number(d.id)) || await api.getOrder(Number(d.id)); if (o) printKot(o, false); }),
  cancelOrder: (d) => {
    if (!confirm(`Cancel order #${d.id}? It stays in reports as cancelled.`)) return;
    run(async () => { await api.updateOrder(Number(d.id), { status: 'cancelled' }); await refreshOrders(); renderBillsBadge(); renderScreen(); toast(`Order #${d.id} cancelled`); });
  },

  // kitchen & delivery
  station: (d) => { S.station = d.v; renderScreen(); },
  kstatus: (d) => run(async () => { await api.updateOrder(Number(d.id), { status: d.v }); await refreshOrders(); renderScreen(); }),
  outFor: (d) => {
    const o = S.open.find((x) => x.id === Number(d.id));
    if (!o?.rider_id) return toast('Assign a rider first', { err: true });
    run(async () => { await api.updateOrder(o.id, { status: 'out' }); await refreshOrders(); renderScreen(); });
  },
  delivered: (d) => run(async () => {
    const o = S.open.find((x) => x.id === Number(d.id)); if (!o) return;
    if (!o.paid) await payExisting(o, 'Cash (COD)');
    await api.updateOrder(o.id, { status: 'done' });
    await refreshOrders(); renderScreen(); toast(`Order #${o.id} delivered`);
  }),

  // reports, customers, menu, settings
  range: (d) => { S.rep.range = d.v; S.rep.loaded = false; renderScreen(); },
  csv: () => downloadCsv(),
  zreport: () => printZ(),
  pickCust: (d) => run(() => selectCustomer(d.phone)),
  orderFor: (d) => {
    const c = S.cs.sel;
    resetOrder();
    Object.assign(S, { phone: d.phone, customer: c, custName: c?.name || '', address: c?.address || '' });
    location.hash = '#order';
  },
  stamp: (d) => run(async () => {
    const c = { ...S.cs.sel, stamps: Math.max(0, Math.min(req(), (S.cs.sel.stamps || 0) + Number(d.d))) };
    await api.saveCustomer(c); await selectCustomer(c.phone); await loadCustomers(); renderScreen();
  }),
  mcat: (d) => { S.mcat = d.id; renderScreen(); },
  saveItem: (d) => run(async () => {
    const row = document.querySelector(`[data-row="${CSS.escape(d.id)}"]`);
    const f = (k) => row.querySelector(`[data-f="${k}"]`);
    const item = S.menu.items.find((i) => i.id === d.id);
    const name = f('name').value.trim(); if (!name) throw new Error('Name is required');
    const saved = await api.saveMenuItem({
      ...item, name, note: f('note').value.trim(), options: parseOptions(f('options').value),
      active: f('active').checked, station: f('station').value, counts: f('counts').value || null
    });
    S.menu.items = S.menu.items.map((i) => (i.id === saved.id ? saved : i));
    toast(`${saved.name} saved`);
  }),
  saveRider: (d) => run(async () => {
    const g = (k) => document.querySelector(`[data-rider="${d.id}"][data-f="${k}"]`);
    await api.saveRider({ id: Number(d.id), name: g('name').value.trim(), phone: g('phone').value.trim(), active: g('active').checked });
    S.riders = await api.listRiders(); toast('Rider saved');
  }),
  removePhoto: (d) => { if (confirm('Remove this photo?')) run(async () => { await setPhoto(d.id, ''); toast('Photo removed'); }); },
  testPrint: (d) => {
    const now = new Date().toISOString();
    const sample = {
      id: 1234, created_at: now, updated_at: now, type: 'dine', table_no: 'T4', customer_name: 'Sample customer', customer_phone: '03001234567', address: '',
      items: [
        { name: 'Kafeo Special (L)', price: 2399, qty: 1, station: 'kitchen', note: 'Extra cheese', added: 0 },
        { name: 'Loaded Fries', price: 699, qty: 1, station: 'kitchen', note: '', added: 0 },
        { name: 'Iced Caramel Latte', price: 800, qty: 2, station: 'bar', note: 'Less sugar', added: 0 }
      ],
      notes: 'Birthday — candle with dessert', subtotal: 4698, discount: 470, discount_label: 'Friend & family', service_charge: 0,
      tax: 0, tax_rate: 0, delivery_fee: 0, round_off: 0, total: 4228, payment: 'Cash', paid: true, cash_received: 5000, change_due: 772,
      reward: 'Free dessert', status: 'done', meta: { by: S.me.profile.name, discount: { scope: 'bill', type: 'pct', value: 10 } }
    };
    if (d.v === 'kot') printKot(sample); else printHtml(receiptHtml(sample, { customer: { stamps: 3 } }));
  },
  resetDemo: () => { if (confirm('Clear all demo orders and customers?')) { api.resetDemo(); location.reload(); } }
};

const csvList = (v) => String(v).split(',').map((t) => t.trim()).filter(Boolean);
const SUBMIT = {
  login: async (form) => {
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      S.me = await api.signIn(form.email.value, form.password.value);
      await startApp();
    } catch (e) { renderLogin(e.message); }
  },
  changePw: (form) => run(async () => {
    const pw = form.pw.value;
    if (pw.length < 8) throw new Error('Use at least 8 characters');
    await api.changePassword(pw); form.pw.value = ''; closeModal(); toast('Password changed');
  }),
  saveCustomer: (form) => run(async () => {
    const c = { ...S.cs.sel, name: form.name.value.trim(), address: form.address.value.trim(), notes: form.notes.value.trim() };
    await api.saveCustomer(c); await selectCustomer(c.phone); await loadCustomers(); renderScreen(); toast('Customer saved');
  }),
  addItem: (form) => run(async () => {
    const opts = parseOptions(form.options.value);
    const cat = S.menu.categories.find((c) => c.id === S.mcat);
    const isBar = ['coffee', 'drinks'].includes(S.mcat);
    const item = {
      id: 'x' + Date.now().toString(36), category_id: S.mcat, name: form.name.value.trim(), note: form.note.value.trim(),
      options: opts, station: isBar ? 'bar' : 'kitchen', counts: S.mcat === 'pizza' ? 'pizza' : isBar ? 'drink' : null,
      active: true, sort: Math.max(0, ...S.menu.items.map((i) => i.sort || 0)) + 1
    };
    const saved = await api.saveMenuItem(item);
    S.menu.items.push(saved); renderScreen(); toast(`${saved.name} added to ${cat?.label || 'menu'}`);
  }),
  saveSettings: (form) => run(async () => {
    const bmsm = form.bmsm.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^(\d+)\s*=\s*(.+)$/); if (!m) throw new Error(`Couldn’t read “${l}” — use: 3500 = Free dessert`);
      return { min: Number(m[1]), reward: m[2].trim() };
    });
    const pct = (v) => Math.max(0, Math.min(100, Number(v) || 0));
    const data = {
      ...S.settings,
      tax_cash_pct: pct(form.tax_cash_pct.value), tax_digital_pct: pct(form.tax_digital_pct.value),
      prices_include_tax: form.prices_include_tax.checked, tax_number: form.tax_number.value.trim(),
      service_pct: pct(form.service_pct.value), service_default_on: form.service_default_on.checked,
      delivery_fee: Math.max(0, Number(form.delivery_fee.value) || 0), round_to: Number(form.round_to.value) || 0,
      tables: csvList(form.tables.value),
      cashier_max_discount_pct: pct(form.cashier_max_discount_pct.value),
      quick_discounts: csvList(form.quick_discounts.value).map(Number).filter((n) => n > 0 && n <= 100),
      banks: csvList(form.banks.value),
      discount_reasons: form.discount_reasons.value.split('\n').map((l) => l.trim()).filter(Boolean),
      kot_auto: form.kot_auto.checked, kot_split: form.kot_split.checked, receipt_loyalty: form.receipt_loyalty.checked,
      receipt_footer: form.receipt_footer.value.trim(),
      loyalty_stamps: Number(form.loyalty_stamps.value) || 5, loyalty_discount_pct: Number(form.loyalty_discount_pct.value) || 50, bmsm
    };
    await api.saveSettings(data); S.settings = data; toast('Settings saved');
  }),
  addRider: (form) => run(async () => {
    await api.saveRider({ name: form.name.value.trim(), phone: form.phone.value.trim(), active: true });
    S.riders = await api.listRiders(); renderScreen(); toast('Rider added');
  })
};

let custTimer = null;
const BIND = {
  q: () => { renderCats(); renderGrid(); },
  phone: () => onPhoneInput(),
  feeOverride: () => { S.feeOverride = S.feeOverride === '' ? null : Math.max(0, Number(S.feeOverride) || 0); },
  csq: () => { clearTimeout(custTimer); custTimer = setTimeout(() => run(async () => { await loadCustomers(); const el = $('#cust-rows'); if (el) el.innerHTML = custRows(); }), 250); }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.disabled) return;
  e.preventDefault();
  fn(el.dataset, el, e);
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.bind) {
    const k = t.dataset.bind;
    if (k === 'csq') S.cs.q = t.value; else S[k] = t.value;
    BIND[k]?.();
    return;
  }
  if (t.dataset.m && S.m) {               // field inside a pop-up
    S.m[t.dataset.m] = t.value;
    if (S.m.kind === 'discount') {
      if (t.dataset.m === 'custom' && t.value) { S.m.reason = ''; document.querySelectorAll('#dlg [data-act=dReason]').forEach((b) => b.classList.remove('on')); }
      refreshDiscountPreview();
    }
    if (S.m.kind === 'pay' && t.dataset.m === 'received') { const c = $('#change'); if (c) c.innerHTML = changeHtml(payBill()); document.querySelectorAll('#dlg [data-act=pCash]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === Number(t.value))); }
    return;
  }
  if (t.dataset.ml !== undefined && S.m?.kind === 'discount') { S.m.lines[Number(t.dataset.ml)].value = t.value; refreshDiscountPreview(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.mc && S.m) { S.m[t.dataset.mc] = t.checked; return; }
  if (t.dataset.photo && t.files?.[0]) {
    const id = t.dataset.photo, file = t.files[0];
    run(async () => {
      toast('Uploading photo…');
      const url = await api.uploadImage(await shrinkImage(file), id);
      await setPhoto(id, url);
      toast('Photo saved');
    });
    return;
  }
  const el = t.closest('[data-change="rider"]');
  if (!el) return;
  run(async () => { await api.updateOrder(Number(el.dataset.id), { rider_id: el.value ? Number(el.value) : null }); await refreshOrders(); renderScreen(); });
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-submit]');
  if (!form) return;
  e.preventDefault();
  SUBMIT[form.dataset.submit]?.(form);
});
// Keyboard: Esc closes the bills drawer (the pop-up closes itself).

boot();
