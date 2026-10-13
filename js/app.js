// KAFEO POS — the app. Screens: Order, Kitchen, Delivery, Loyalty, Reports, Menu, Settings.
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_VERSION } from './config.js?v=2026.10.13-2204';
import { createDemoApi, DEMO_EMAILS, DEMO_PASSWORD } from './api-demo.js?v=2026.10.13-2204';
import { DEFAULT_SETTINGS } from './menu-seed.js?v=2026.10.13-2204';
import {
  fmt, num, TYPE_LABEL, STATUS_LABEL, PAY_METHODS, isDigital, taxRateFor, lineDiscount, computeBill, discountShare,
  cashSuggestions, bmsmReward, loyaltyAfterPayment, rewardReady, cleanPhone, phoneOk, waLink, summarize, incentives,
  minutesSince, startOfDay
} from './logic.js?v=2026.10.13-2204';
import { REPORTS, REPORT_GROUPS, toHtml, toThermal, toCsv, toPdfDoc, dt as rdt } from './reports.js?v=2026.10.13-2204';
import { pdfBlob } from './pdf.js?v=2026.10.13-2204';
import { KAFEO_STOCK, KAFEO_RECIPES, DRINK_SIZES } from './kafeo-inventory.js?v=2026.10.13-2204';

const LIVE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const api = LIVE
  ? (await import('./api-supabase.js?v=2026.10.13-2204')).createSupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY)
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
  box: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
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
  { id: 'inventory', label: 'Stock', roles: ['owner', 'cashier', 'kitchen'], icon: 'box' },
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
  inv: { ready: null, stock: [], recipes: [], moves: [], tab: 'stock', q: '', filter: 'all', rCat: null, rItem: null, draft: {}, histKind: 'all', movesLoaded: false },
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
  setTimeout(() => { logoImg(); }, 1500);
}

async function loadAll() {
  const [menu, settings, riders] = await Promise.all([api.loadMenu(), api.loadSettings(), api.listRiders()]);
  S.menu = menu;
  S.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  S.riders = riders;
  await refreshOrders();
  await loadInventory();
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
  if (kind === 'stock') return run(async () => { await loadInventory(); S.inv.movesLoaded = false; if (S.route === 'inventory' && !S.m) renderScreen(); });
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
    `<a href="#${r.id}" class="${S.route === r.id ? 'on' : ''}" ${S.route === r.id ? 'aria-current="page"' : ''}>${icon(r.icon || r.id)}${r.label}${r.id === 'orders' ? '<b class="rail-badge" id="rail-orders"></b>' : r.id === 'inventory' ? '<b class="rail-badge hidden" id="rail-inventory"></b>' : ''}</a>`).join('');
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
  renderInvBadge();
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
  const map = { inventory: renderInventory, order: renderOrder, orders: renderOrders, kitchen: renderKitchen, delivery: renderDelivery, reports: renderReports, customers: renderCustomers, menu: renderMenu, settings: renderSettings };
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
  else S.cart.push({ id: i.id, opt: o.k || '', name, price: Number(o.p), qty: 1, station: i.station, counts: i.counts || null, note: '' });
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
    return { id: l.id, opt: optOf(l), name: l.name, price: l.price, qty: l.qty, station: l.station, counts: l.counts, note: l.note || '', disc: l.disc || null, added };
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
    const prevItems = S.editing ? S.editing.items : [];
    if (S.editing) r = await api.updateOrder(S.editing.id, data);
    else r = await api.createOrder({ ...data, created_by: LIVE ? S.me.user.id : null });
    syncStock(r, prevItems, r.items);   // runs in the background; never blocks the order
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
    cart: o.items.map((l) => ({ id: l.id, opt: optOf(l), name: l.name, price: Number(l.price), qty: l.qty, station: l.station, counts: l.counts, note: l.note || '', disc: l.disc || null, sentQty: l.qty }))
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
      <button type="button" class="btn btn-lg" data-act="expenses">Add expense</button>
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
// REPORTS CENTER — pick a report, choose start & end date/time, view / PDF / print / Excel
// =====================================================================
const pad2 = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
function businessDayStart(ref = new Date()) {
  const h = Number(S.settings.day_start_hour ?? 6);
  const d = new Date(ref); d.setHours(h, 0, 0, 0);
  if (ref < d) d.setDate(d.getDate() - 1);
  return d;
}
function presetRange(p) {
  const h = Number(S.settings.day_start_hour ?? 6);
  const day = businessDayStart();
  const plusDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  if (p === 'today') return [day, plusDays(day, 1)];
  if (p === 'yesterday') return [plusDays(day, -1), day];
  if (p === 'last7') return [plusDays(day, -6), plusDays(day, 1)];
  if (p === 'week') { const mon = plusDays(day, -((day.getDay() + 6) % 7)); return [mon, plusDays(mon, 7)]; }
  if (p === 'month') { const a = new Date(day.getFullYear(), day.getMonth(), 1, h); return [a, new Date(day.getFullYear(), day.getMonth() + 1, 1, h)]; }
  if (p === 'lastMonth') { const a = new Date(day.getFullYear(), day.getMonth() - 1, 1, h); return [a, new Date(day.getFullYear(), day.getMonth(), 1, h)]; }
  return null;
}
function rcInit() {
  if (S.rc) return;
  const [a, b] = presetRange('today');
  S.rc = { id: 'full', preset: 'today', from: toLocalInput(a), to: toLocalInput(b), f: { type: 'all', method: 'all', category: 'all', stockItem: '' }, result: null, busy: false, warn: '' };
}
const rcRangeText = () => {
  const def = REPORTS[S.rc.id];
  if (def.noDates) return 'As of ' + rdt(new Date());
  return `${rdt(new Date(S.rc.from))}  -  ${rdt(new Date(S.rc.to))}`;
};
async function rcLoad() {
  const rc = S.rc, def = REPORTS[rc.id];
  const from = new Date(rc.from), to = new Date(rc.to);
  if (!def.noDates && !(from < to)) throw new Error('The end date/time must be after the start');
  rc.busy = true; rc.warn = ''; renderScreen();
  const data = { orders: [], expenses: [], moves: [], movesAfter: [] };
  try {
    const jobs = [];
    if (def.needs.includes('orders')) jobs.push(api.ordersBetween(from.toISOString(), to.toISOString()).then((x) => { data.orders = x; }));
    if (def.needs.includes('expenses')) jobs.push(api.expensesBetween(from.toISOString(), to.toISOString()).then((x) => { data.expenses = x; }).catch(() => { rc.warn = 'Expenses aren’t set up yet (run supabase/migrations/005_expenses.sql) — shown as zero.'; }));
    if (def.needs.includes('moves')) {
      jobs.push(api.movesBetween(from.toISOString(), to.toISOString()).then((x) => { data.moves = x; }));
      if (rc.id === 'stockItem') jobs.push(api.movesBetween(to.toISOString(), new Date(Date.now() + 864e5).toISOString()).then((x) => { data.movesAfter = x; }));
    }
    if (def.needs.includes('inventory') || def.needs.includes('moves')) jobs.push(loadInventory());
    await Promise.all(jobs);
    if ((def.needs.includes('inventory') || def.needs.includes('moves')) && !S.inv.ready) throw new Error('Inventory isn’t set up yet — run supabase/migrations/004_inventory.sql');
    rc.result = def.build(data, rc.f, { menu: S.menu, settings: S.settings, stock: S.inv.stock, recipes: S.inv.recipes });
    rc.builtFor = rc.id + rc.from + rc.to + JSON.stringify(rc.f);
  } finally { rc.busy = false; }
  renderScreen();
}
const rcFileName = (ext) => `KAFEO-${REPORTS[S.rc.id].title.replace(/[^\w]+/g, '-')}-${S.rc.from.slice(0, 10)}${REPORTS[S.rc.id].noDates ? '' : '-to-' + S.rc.to.slice(0, 10)}.${ext}`;
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function rcEnsure() {
  const rc = S.rc;
  if (!rc.result || rc.builtFor !== rc.id + rc.from + rc.to + JSON.stringify(rc.f)) await rcLoad();
  return rc.result;
}
function printA4(html, landscape) {
  const area = $('#print-area');
  area.innerHTML = `<style>@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }</style><div class="a4">${html}</div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
}

function renderReportsCenter(el) {
  rcInit();
  const rc = S.rc, def = REPORTS[rc.id];
  const fl = def.filters || [];
  el.innerHTML = `
    <div class="rc">
      <nav class="rc-list" aria-label="Reports">${REPORT_GROUPS.map(([g, ids]) => `<div class="rc-group">${g}</div>${ids.map((id) =>
        `<button type="button" class="${rc.id === id ? 'on' : ''}" data-act="rcPick" data-id="${id}"><b>${esc(REPORTS[id].title)}</b><small>${esc(REPORTS[id].desc)}</small></button>`).join('')}`).join('')}</nav>
      <section class="rc-main">
        <div class="panel stack">
          <div class="row wrap"><div class="grow"><h2 style="margin:0;font-size:20px">${esc(def.title)}</h2><div class="muted small">${esc(def.desc)}</div></div></div>
          ${def.noDates ? '' : `
          <div class="chips">${[['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['last7', 'Last 7 days'], ['month', 'This month'], ['lastMonth', 'Last month']].map(([v, l]) =>
            `<button type="button" class="chip-sm ${rc.preset === v ? 'on' : ''}" data-act="rcPreset" data-v="${v}">${l}</button>`).join('')}</div>
          <div class="cols">
            <label class="field">Start date & time<input type="datetime-local" data-rc="from" value="${esc(rc.from)}"></label>
            <label class="field">End date & time<input type="datetime-local" data-rc="to" value="${esc(rc.to)}"></label>
          </div>
          <div class="muted small">“Today” runs ${Number(S.settings.day_start_hour ?? 6)}:00 AM to ${Number(S.settings.day_start_hour ?? 6)}:00 AM next day, so late-night sales count in the same day.</div>`}
          ${fl.length ? `<div class="cols">
            ${fl.includes('category') ? `<label class="field">Category<select data-rcf="category"><option value="all">All categories</option>${S.menu.categories.map((c) => `<option value="${esc(c.id)}" ${rc.f.category === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>` : ''}
            ${fl.includes('type') ? `<label class="field">Order type<select data-rcf="type">${[['all', 'All types'], ['dine', 'Dine-in'], ['take', 'Takeaway'], ['deliv', 'Delivery']].map(([v, l]) => `<option value="${v}" ${rc.f.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
            ${fl.includes('method') ? `<label class="field">Payment method<select data-rcf="method">${[['all', 'All methods'], ...PAY_METHODS.map((m) => [m, m])].map(([v, l]) => `<option value="${esc(v)}" ${rc.f.method === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>` : ''}
            ${fl.includes('stockItem') ? `<label class="field">Stock item<select data-rcf="stockItem"><option value="">Choose…</option>${S.inv.stock.map((s) => `<option value="${s.id}" ${String(rc.f.stockItem) === String(s.id) ? 'selected' : ''}>${esc(s.name)} (${esc(s.unit)})</option>`).join('')}</select></label>` : ''}
          </div>` : ''}
          <div class="row wrap rc-actions">
            <button type="button" class="btn btn-dark btn-lg" data-act="rcView" ${rc.busy ? 'disabled' : ''}>${rc.busy ? 'Loading…' : 'View report'}</button>
            <button type="button" class="btn btn-primary btn-lg" data-act="rcPdf" ${rc.busy ? 'disabled' : ''}>${icon('print', 18)} Download PDF</button>
            <button type="button" class="btn btn-lg" data-act="rcA4" ${rc.busy ? 'disabled' : ''}>Print A4</button>
            <button type="button" class="btn btn-lg" data-act="rcThermal" ${rc.busy ? 'disabled' : ''}>Thermal print</button>
            <button type="button" class="btn btn-lg" data-act="rcCsv" ${rc.busy ? 'disabled' : ''}>Excel (CSV)</button>
          </div>
          ${rc.warn ? `<div class="error">${esc(rc.warn)}</div>` : ''}
        </div>
        <div class="rc-preview">${rc.result && rc.builtFor === rc.id + rc.from + rc.to + JSON.stringify(rc.f) ? toHtml(rc.id, rc.result, rcRangeText()) : `<div class="empty panel">Choose the dates and press <b>View report</b> — or go straight to <b>Download PDF</b>.</div>`}</div>
      </section>
    </div>`;
}

// ----- expenses (any staff) -----
async function openExpenses() {
  const from = businessDayStart(), to = new Date(from.getTime() + 864e5);
  let list = [], ready = true;
  try { list = await api.expensesBetween(from.toISOString(), to.toISOString()); } catch { ready = false; }
  S.m = { kind: 'expense', amount: '', method: 'Cash', type: (S.settings.expense_types || [])[0] || 'Other', description: '', list, ready };
  renderExpenseModal();
}
function renderExpenseModal() {
  const m = S.m;
  const types = S.settings.expense_types || ['Other'];
  openModal('md', `
    ${modalHead('Add expense', 'Money paid out — it’s taken off the cash balance in reports and the Z-report')}
    <div class="mb stack">
      ${m.ready ? '' : '<div class="error">Expenses need a one-time database update: run supabase/migrations/005_expenses.sql in Supabase.</div>'}
      <label class="field">Amount (Rs)<input data-m="amount" type="number" min="1" step="1" inputmode="numeric" value="${esc(m.amount)}" autofocus></label>
      <div><div class="lbl">Type</div><div class="chips">${types.map((t) => `<button type="button" class="chip-sm ${m.type === t ? 'on' : ''}" data-act="expType" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
      <div><div class="lbl">Paid by</div><div class="chips">${PAY_METHODS.map((pm) => `<button type="button" class="chip-sm ${m.method === pm ? 'on' : ''}" data-act="expMethod" data-v="${pm}">${pm}</button>`).join('')}</div></div>
      <label class="field">Description<input data-m="description" value="${esc(m.description)}" placeholder="e.g. 2 crates milk from Nestle rider"></label>
      ${m.list.length ? `<div><div class="lbl">Today’s expenses · ${fmt(m.list.reduce((a, e) => a + Number(e.amount), 0))}</div>
        <div class="tbl-wrap"><table class="tbl compact"><tbody>${m.list.slice().reverse().map((e) => `<tr><td>${new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td><td>${esc(e.type)}<div class="muted small">${esc(e.description)}</div></td><td>${esc(e.method)}</td><td class="num"><b>${fmt(e.amount)}</b></td>
          <td class="num">${isOwner() ? `<button type="button" class="icon-btn" style="width:34px;height:34px" data-act="expDel" data-id="${e.id}" aria-label="Delete expense">${icon('trash', 16)}</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    </div>
    <footer class="mf"><span class="grow"></span><button type="button" class="btn btn-lg" data-act="closeModal">Close</button>
      <button type="button" class="btn btn-primary btn-lg" data-act="expSave" ${m.ready ? '' : 'disabled'}>Save expense</button></footer>`);
}

// =====================================================================
// INVENTORY — stock, recipes & food cost, history
// =====================================================================
const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'pack', 'dozen', 'bottle', 'can'];
const MOVE_LABEL = { purchase: 'Stock in', sale: 'Used in order', return: 'Returned (order changed)', waste: 'Waste', adjust: 'Count correction', opening: 'Opening stock' };
const WASTE_REASONS = ['Expired', 'Spoiled', 'Spilled / dropped', 'Burnt / remade', 'Staff meal', 'Sample / tasting'];
const STARTER_STOCK = [
  ['Pizza dough — small', 'Bakery', 'pcs'], ['Pizza dough — medium', 'Bakery', 'pcs'], ['Pizza dough — large', 'Bakery', 'pcs'], ['Burger buns', 'Bakery', 'pcs'], ['Sandwich bread', 'Bakery', 'pcs'], ['Tortilla wraps', 'Bakery', 'pcs'],
  ['Mozzarella cheese', 'Dairy', 'g'], ['Cheese slices', 'Dairy', 'pcs'], ['Milk', 'Dairy', 'ml'], ['Cream', 'Dairy', 'ml'], ['Ice cream', 'Dairy', 'ml'],
  ['Chicken tikka (marinated)', 'Meat', 'g'], ['Chicken fajita (marinated)', 'Meat', 'g'], ['Chicken breast', 'Meat', 'g'], ['Zinger fillets', 'Meat', 'pcs'], ['Beef patties', 'Meat', 'pcs'], ['Beef steak', 'Meat', 'g'], ['Sausages', 'Meat', 'g'], ['Chicken wings', 'Meat', 'pcs'], ['Nuggets', 'Meat', 'pcs'],
  ['Fries (frozen)', 'Frozen', 'g'], ['Onion rings', 'Frozen', 'pcs'], ['Pasta', 'Dry goods', 'g'],
  ['Pizza sauce', 'Sauces', 'g'], ['Mayonnaise', 'Sauces', 'g'], ['Mushrooms', 'Produce', 'g'], ['Olives', 'Produce', 'g'], ['Jalapenos', 'Produce', 'g'], ['Onions', 'Produce', 'g'], ['Lemons', 'Produce', 'pcs'], ['Mint', 'Produce', 'g'],
  ['Coffee beans', 'Coffee & tea', 'g'], ['Tea leaves', 'Coffee & tea', 'g'], ['Sugar', 'Coffee & tea', 'g'], ['Caramel syrup', 'Syrups', 'ml'], ['Chocolate syrup', 'Syrups', 'ml'], ['Strawberry syrup', 'Syrups', 'ml'], ['Mango syrup', 'Syrups', 'ml'],
  ['Coke 345ml', 'Soft drinks', 'can'], ['Coke 1.5L', 'Soft drinks', 'bottle'], ['Sprite 345ml', 'Soft drinks', 'can'], ['Water 500ml', 'Soft drinks', 'bottle'],
  ['Takeaway pizza boxes', 'Packaging', 'pcs'], ['Takeaway cups', 'Packaging', 'pcs'], ['Delivery bags', 'Packaging', 'pcs']
];

const invQty = (n) => { const v = Number(n) || 0; return Math.abs(v) >= 100 || Number.isInteger(v) ? num(v) : v.toFixed(2).replace(/\.?0+$/, ''); };
const stockById = (id) => S.inv.stock.find((x) => x.id === id);
const stockState = (it) => (Number(it.qty) <= 0 ? 'out' : Number(it.low_level) > 0 && Number(it.qty) <= Number(it.low_level) ? 'low' : 'ok');
// Items that need buying: only those with an alert level set (untouched starter items don't nag).
const lowStock = () => S.inv.stock.filter((it) => it.active !== false && Number(it.low_level) > 0 && stockState(it) !== 'ok');
const optOf = (l) => l.opt ?? (l.name.match(/\(([^)]+)\)$/)?.[1] || '');
const recipeFor = (menuId, opt) => {
  let r = S.inv.recipes.filter((x) => x.menu_item_id === menuId && x.option_key === (opt || ''));
  if (!r.length && opt) r = S.inv.recipes.filter((x) => x.menu_item_id === menuId && x.option_key === '');
  return r;
};
function foodCost(menuId, opt) {
  return recipeFor(menuId, opt).reduce((a, r) => a + Number(r.qty) * Number(stockById(r.stock_item_id)?.cost || 0), 0);
}

async function loadInventory() {
  try {
    const [stock, recipes] = await Promise.all([api.listStock(), api.listRecipes()]);
    S.inv.stock = stock; S.inv.recipes = recipes; S.inv.ready = true;
  } catch (e) {
    S.inv.ready = false;   // inventory tables not set up yet — orders keep working
    console.warn('Inventory not available:', e.message);
  }
  renderInvBadge();
}
function renderInvBadge() {
  const el = $('#rail-inventory'); if (!el) return;
  const n = S.inv.ready ? lowStock().length : 0;
  el.textContent = n || ''; el.classList.toggle('hidden', !n);
}

// Keep stock in step with orders: compare old and new item quantities, deduct the difference.
async function syncStock(order, prevItems, newItems) {
  if (!S.inv.ready || !S.inv.recipes.length) return;
  const key = (l) => l.id + '|' + optOf(l) + '|' + l.name;
  const delta = new Map();
  prevItems.forEach((l) => delta.set(key(l), { l, d: -(l.qty || 0) }));
  newItems.forEach((l) => { const k = key(l); const e = delta.get(k) || { l, d: 0 }; e.d += l.qty || 0; e.l = l; delta.set(k, e); });
  const per = new Map();
  for (const { l, d } of delta.values()) {
    if (!d) continue;
    for (const r of recipeFor(l.id, optOf(l))) per.set(r.stock_item_id, (per.get(r.stock_item_id) || 0) + Number(r.qty) * d);
  }
  const moves = [...per].filter(([, q]) => q).map(([sid, q]) => ({
    stock_item_id: sid, change: -q, kind: q > 0 ? 'sale' : 'return', order_id: order.id,
    note: `Order #${order.id}${q < 0 ? ' changed / cancelled' : ''}`, by_name: S.me.profile.name
  }));
  try { await api.addMoves(moves); await loadInventory(); } catch (e) { console.warn('Stock not updated:', e.message); }
}

function renderInventory(el) {
  el.className = 'screen';
  if (S.inv.ready === null) { el.innerHTML = '<div class="empty">Loading stock…</div>'; run(async () => { await loadInventory(); renderScreen(); }); return; }
  if (S.inv.ready === false) {
    el.innerHTML = `<div class="screen-head"><h1>Inventory</h1></div>
      <div class="panel stack"><h2>One-time setup needed</h2>
      <div>Inventory needs a small database update. In Supabase open <b>SQL Editor</b>, paste the file <b>supabase/migrations/004_inventory.sql</b> from your GitHub repo and press <b>Run</b>, then refresh this page.</div>
      <div><button type="button" class="btn" data-act="invRetry">I’ve done it — check again</button></div></div>`;
    return;
  }
  const tab = S.inv.tab;
  el.innerHTML = `
    <div class="screen-head"><div><h1>Inventory</h1><div class="muted">Stock goes down automatically when orders are added, using each item’s recipe.</div></div>
      <span class="grow"></span>
      <div class="seg" role="tablist" style="min-width:420px">
        ${[['stock', 'Stock'], ['recipes', 'Recipes & food cost'], ['history', 'History']].map(([v, l]) => `<button type="button" class="${tab === v ? 'on' : ''}" data-act="invTab" data-v="${v}">${l}</button>`).join('')}
      </div></div>
    <div id="inv-body"></div>`;
  ({ stock: renderStockTab, recipes: renderRecipeTab, history: renderHistoryTab })[tab]($('#inv-body'));
}

function renderStockTab(el) {
  const all = S.inv.stock.filter((it) => it.active !== false);
  const q = S.inv.q.trim().toLowerCase();
  const f = S.inv.filter;
  const list = all.filter((it) => (!q || it.name.toLowerCase().includes(q) || (it.category || '').toLowerCase().includes(q) || (it.supplier || '').toLowerCase().includes(q))
    && (f === 'all' || stockState(it) === f || (f === 'low' && stockState(it) === 'out')));
  const value = all.reduce((a, it) => a + Math.max(0, Number(it.qty)) * Number(it.cost || 0), 0);
  const low = all.filter((it) => stockState(it) === 'low').length, out = all.filter((it) => stockState(it) === 'out').length;
  const cats = [...new Set(list.map((it) => it.category || 'General'))];
  el.innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="l">Stock items</div><div class="v">${all.length}</div></div>
      <div class="kpi"><div class="l">Need to buy</div><div class="v" style="color:${lowStock().length ? 'var(--warn)' : 'inherit'}">${lowStock().length}</div><div class="s">items at or below alert level</div></div>
      <div class="kpi"><div class="l">Running low</div><div class="v" style="color:${low ? 'var(--accent)' : 'inherit'}">${low}</div></div>
      <div class="kpi"><div class="l">Out of stock</div><div class="v" style="color:${out ? 'var(--warn)' : 'inherit'}">${out}</div></div>
      <div class="kpi"><div class="l">Stock value (at cost)</div><div class="v">${fmt(value)}</div></div>
    </div>
    <div class="row wrap" style="margin:14px 0">
      <label class="search" style="max-width:360px">${icon('search', 18)}<span class="sr">Search stock</span><input data-bind="invq" type="search" placeholder="Search item, category, supplier" value="${esc(S.inv.q)}" autocomplete="off"></label>
      ${[['all', 'All'], ['low', 'Low & out'], ['out', 'Out']].map(([v, l]) => `<button type="button" class="pill ${f === v ? 'on' : ''}" data-act="invFilter" data-v="${v}">${l}</button>`).join('')}
      <span class="grow"></span>
      ${isOwner() && !S.inv.stock.length ? '<button type="button" class="btn" data-act="invStarter">Add starter list</button>' : ''}
      ${isOwner() ? '<button type="button" class="btn" data-act="invKafeo">Load KAFEO stock &amp; recipes</button>' : ''}
      ${isOwner() ? '<button type="button" class="btn btn-primary" data-act="invEdit" data-id="">+ Add stock item</button>' : ''}
    </div>
    ${list.length ? cats.map((cat) => `
      <h3 class="inv-cat">${esc(cat)}</h3>
      <div class="tbl-wrap"><table class="tbl inv">
        <thead><tr><th>Item</th><th class="num">In stock</th><th class="num">Alert at</th><th class="num">Cost / unit</th><th class="num">Value</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.filter((it) => (it.category || 'General') === cat).map((it) => {
          const st = stockState(it);
          return `<tr class="st-${st}">
            <td><b>${esc(it.name)}</b>${it.supplier ? `<div class="muted small">${esc(it.supplier)}</div>` : ''}</td>
            <td class="num"><b class="qty-${st}">${invQty(it.qty)}</b> ${esc(it.unit)}</td>
            <td class="num muted">${Number(it.low_level) ? invQty(it.low_level) + ' ' + esc(it.unit) : '—'}</td>
            <td class="num">${Number(it.cost) ? 'Rs ' + (Number(it.cost) < 10 ? Number(it.cost).toFixed(2) : num(it.cost)) : '—'}</td>
            <td class="num">${fmt(Math.max(0, Number(it.qty)) * Number(it.cost || 0))}</td>
            <td>${st === 'out' ? '<span class="tag warn">Out of stock</span>' : st === 'low' ? '<span class="tag">Running low</span>' : '<span class="tag ok">OK</span>'}</td>
            <td class="num"><div class="row" style="justify-content:flex-end">
              <button type="button" class="btn btn-sm btn-primary" data-act="invMove" data-id="${it.id}" data-k="purchase">+ Stock in</button>
              <button type="button" class="btn btn-sm" data-act="invMove" data-id="${it.id}" data-k="waste">Waste</button>
              <button type="button" class="btn btn-sm" data-act="invMove" data-id="${it.id}" data-k="adjust">Count</button>
              ${isOwner() ? `<button type="button" class="icon-btn" style="width:36px;height:36px" data-act="invEdit" data-id="${it.id}" aria-label="Edit ${esc(it.name)}">${icon('edit', 16)}</button>` : ''}
            </div></td></tr>`;
        }).join('')}</tbody></table></div>`).join('')
      : `<div class="empty panel">${S.inv.stock.length ? 'No stock items match.' : 'No stock items yet. Add your ingredients and packaging — or tap <b>Add starter list</b> for common café items (all at zero, edit to suit).'}</div>`}`;
}

function renderRecipeTab(el) {
  const cats = S.menu.categories;
  S.inv.rCat = S.inv.rCat || cats[0]?.id;
  const items = S.menu.items.filter((i) => i.category_id === S.inv.rCat);
  if (!S.inv.rItem || !S.menu.items.find((i) => i.id === S.inv.rItem && i.category_id === S.inv.rCat)) S.inv.rItem = items[0]?.id || null;
  const item = S.menu.items.find((i) => i.id === S.inv.rItem);
  const hasRecipe = (i) => S.inv.recipes.some((r) => r.menu_item_id === i.id);
  const draft = S.inv.draft || {};
  el.innerHTML = `
    <div class="row wrap" style="margin:14px 0">${cats.map((c) => `<button type="button" class="pill ${S.inv.rCat === c.id ? 'on' : ''}" data-act="rCat" data-id="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>
    <div class="recipe-wrap">
      <nav class="recipe-items" aria-label="Menu items">${items.map((i) => `<button type="button" class="${i.id === S.inv.rItem ? 'on' : ''}" data-act="rItem" data-id="${esc(i.id)}">
        <span>${esc(i.name)}</span>${hasRecipe(i) ? '<span class="tag ok">Recipe</span>' : '<span class="tag">No recipe</span>'}</button>`).join('')}</nav>
      <section class="stack" style="flex:1;min-width:0">
        ${!S.inv.stock.length ? '<div class="panel muted">Add stock items first (Stock tab), then set what each menu item uses.</div>' : ''}
        ${item ? item.options.map((o) => {
          const k = o.k || '';
          const rows = draft[item.id + '|' + k] || recipeFor(item.id, k).filter((r) => r.option_key === k).map((r) => ({ stock_item_id: r.stock_item_id, qty: r.qty }));
          const cost = rows.reduce((a, r) => a + Number(r.qty || 0) * Number(stockById(Number(r.stock_item_id))?.cost || 0), 0);
          const margin = o.p ? ((o.p - cost) / o.p) * 100 : 0;
          return `<div class="panel recipe">
            <div class="row"><h2 style="margin:0">${esc(item.name)}${k ? ' · ' + esc(k) : ''}</h2><span class="grow"></span><span class="muted">Price ${fmt(o.p)}</span></div>
            <table class="tbl compact"><thead><tr><th>Ingredient</th><th style="width:170px">Amount used</th><th class="num">Cost</th><th></th></tr></thead><tbody>
              ${rows.map((r, idx) => { const st = stockById(Number(r.stock_item_id)); return `<tr>
                <td>${isOwner() ? `<select class="input" data-rf="sid" data-key="${esc(item.id + '|' + k)}" data-i="${idx}" aria-label="Ingredient">
                  <option value="">Choose…</option>${S.inv.stock.filter((s) => s.active !== false).map((s) => `<option value="${s.id}" ${Number(r.stock_item_id) === s.id ? 'selected' : ''}>${esc(s.name)} (${esc(s.unit)})</option>`).join('')}</select>` : esc(st?.name || '?')}</td>
                <td>${isOwner() ? `<div class="row"><input class="input" style="width:100px" type="number" min="0" step="any" data-rf="qty" data-key="${esc(item.id + '|' + k)}" data-i="${idx}" value="${esc(r.qty)}" aria-label="Amount"><span class="muted">${esc(st?.unit || '')}</span></div>` : `${invQty(r.qty)} ${esc(st?.unit || '')}`}</td>
                <td class="num">${st && Number(st.cost) ? fmt(Number(r.qty || 0) * Number(st.cost)) : '—'}</td>
                <td class="num">${isOwner() ? `<button type="button" class="icon-btn" style="width:36px;height:36px" data-act="rDel" data-key="${esc(item.id + '|' + k)}" data-i="${idx}" aria-label="Remove ingredient">${icon('x', 16)}</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">No ingredients yet.</td></tr>'}
            </tbody></table>
            <div class="row wrap">
              ${isOwner() ? `<button type="button" class="btn btn-sm" data-act="rAdd" data-key="${esc(item.id + '|' + k)}">+ Add ingredient</button>` : ''}
              <span class="grow"></span>
              <span>Food cost <b>${fmt(cost)}</b></span>
              <span class="tag ${margin >= 60 ? 'ok' : margin >= 40 ? '' : 'warn'}">${cost ? `Margin ${margin.toFixed(0)}% · cost ${(100 - margin).toFixed(0)}%` : 'Cost not set'}</span>
              ${isOwner() ? `<button type="button" class="btn btn-sm btn-primary" data-act="rSave" data-key="${esc(item.id + '|' + k)}">Save recipe</button>` : ''}
            </div></div>`;
        }).join('') : '<div class="empty">No items in this category.</div>'}
        <div class="muted small">Food cost uses each ingredient’s latest cost price (updated when you record a purchase). Margin = price minus food cost.</div>
      </section>
    </div>`;
}

function renderHistoryTab(el) {
  if (!S.inv.movesLoaded) { el.innerHTML = '<div class="empty">Loading…</div>'; run(async () => { S.inv.moves = await api.listMoves(400); S.inv.movesLoaded = true; renderScreen(); }); return; }
  const k = S.inv.histKind;
  const list = S.inv.moves.filter((m) => k === 'all' || m.kind === k);
  el.innerHTML = `
    <div class="row wrap" style="margin:14px 0">${[['all', 'All'], ['purchase', 'Stock in'], ['sale', 'Used in orders'], ['waste', 'Waste'], ['adjust', 'Counts'], ['return', 'Returns']].map(([v, l]) =>
      `<button type="button" class="pill ${k === v ? 'on' : ''}" data-act="histKind" data-v="${v}">${l}</button>`).join('')}
      <span class="grow"></span><button type="button" class="btn" data-act="histReload">Refresh</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Item</th><th class="num">Change</th><th>Type</th><th>Note</th><th>By</th></tr></thead><tbody>
      ${list.map((m) => { const it = stockById(m.stock_item_id); const ch = Number(m.change); return `<tr>
        <td>${new Date(m.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${esc(it?.name || 'Deleted item')}</td>
        <td class="num"><b class="${ch < 0 ? 'err-text' : 'ok-text'}">${ch > 0 ? '+' : '−'}${invQty(Math.abs(ch))}</b> ${esc(it?.unit || '')}</td>
        <td><span class="tag ${m.kind === 'purchase' ? 'ok' : m.kind === 'waste' ? 'warn' : ''}">${MOVE_LABEL[m.kind] || m.kind}</span></td>
        <td class="small">${[esc(m.note), Number(m.unit_cost) ? `Rs ${esc(m.unit_cost)}/unit` : ''].filter(Boolean).join(' · ')}</td><td class="small">${esc(m.by_name)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">No stock movements yet.</td></tr>'}
    </tbody></table></div>`;
}

// ----- pop-ups: stock in / waste / count, and add/edit item -----
function openStockMove(id, kind) {
  const it = stockById(id); if (!it) return;
  S.m = { kind: 'stockMove', id, move: kind, qty: '', cost: kind === 'purchase' ? (it.cost || '') : '', note: '', reason: '' };
  renderStockMove();
}
function renderStockMove() {
  const m = S.m, it = stockById(m.id);
  const titles = { purchase: 'Stock in (purchase)', waste: 'Record waste', adjust: 'Stock count' };
  const after = m.move === 'adjust' ? Number(m.qty || 0) : Number(it.qty) + (m.move === 'waste' ? -1 : 1) * Number(m.qty || 0);
  openModal('sm', `
    ${modalHead(titles[m.move], `${esc(it.name)} · now ${invQty(it.qty)} ${esc(it.unit)}`)}
    <div class="mb stack">
      <label class="field">${m.move === 'adjust' ? `Counted on the shelf (${esc(it.unit)})` : `Quantity (${esc(it.unit)})`}<input data-m="qty" type="number" min="0" step="any" inputmode="decimal" value="${esc(m.qty)}" autofocus></label>
      ${m.move === 'purchase' ? `<label class="field">Cost per ${esc(it.unit)} (Rs)<input data-m="cost" type="number" min="0" step="any" inputmode="decimal" value="${esc(m.cost)}"></label>
        <label class="field">Supplier / bill no. (optional)<input data-m="note" value="${esc(m.note)}" placeholder="${esc(it.supplier || 'e.g. Metro, bill 4521')}"></label>` : ''}
      ${m.move === 'waste' ? `<div class="chips">${WASTE_REASONS.map((r) => `<button type="button" class="chip-sm ${m.reason === r ? 'on' : ''}" data-act="wasteReason" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        <label class="field">Note (optional)<input data-m="note" value="${esc(m.note)}"></label>` : ''}
      ${m.move === 'adjust' ? `<label class="field">Note (optional)<input data-m="note" value="${esc(m.note)}" placeholder="e.g. weekly count"></label>` : ''}
      <div class="change" style="background:var(--soft);color:var(--ink)" id="mv-after"><span>Stock after</span><b>${invQty(after)} ${esc(it.unit)}</b></div>
    </div>
    <footer class="mf"><span class="grow"></span><button type="button" class="btn btn-lg" data-act="closeModal">Cancel</button>
      <button type="button" class="btn btn-primary btn-lg" data-act="invMoveSave">Save</button></footer>`);
}
function openStockEdit(id) {
  const it = id ? stockById(Number(id)) : { name: '', category: 'General', unit: 'g', low_level: 0, cost: 0, supplier: '', active: true };
  S.m = { kind: 'stockEdit', id: id ? Number(id) : null };
  const cats = [...new Set(S.inv.stock.map((s) => s.category).concat(['Bakery', 'Dairy', 'Meat', 'Produce', 'Sauces', 'Coffee & tea', 'Syrups', 'Soft drinks', 'Packaging']))];
  openModal('md', `
    ${modalHead(id ? 'Edit stock item' : 'Add stock item')}
    <form class="mb stack" data-submit="stockEdit" id="stock-form">
      <label class="field">Name<input name="name" required value="${esc(it.name)}" placeholder="e.g. Mozzarella cheese"></label>
      <div class="cols">
        <label class="field">Category<input name="category" list="cat-list" value="${esc(it.category)}"><datalist id="cat-list">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label class="field">Unit<select name="unit">${UNITS.map((u) => `<option ${it.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      </div>
      <div class="cols">
        <label class="field">Warn me when stock is at or below<input name="low_level" type="number" min="0" step="any" value="${esc(it.low_level)}"></label>
        <label class="field">Cost price per unit (Rs)<input name="cost" type="number" min="0" step="any" value="${esc(it.cost)}"></label>
      </div>
      ${id ? '' : '<label class="field">Opening stock (how much you have now)<input name="opening" type="number" min="0" step="any" value="0"></label>'}
      <label class="field">Usual supplier (optional)<input name="supplier" value="${esc(it.supplier)}"></label>
      ${id ? `<label class="check"><input type="checkbox" name="active" ${it.active !== false ? 'checked' : ''}> In use (untick to hide)</label>` : ''}
    </form>
    <footer class="mf"><span class="grow"></span><button type="button" class="btn btn-lg" data-act="closeModal">Cancel</button>
      <button type="submit" form="stock-form" class="btn btn-primary btn-lg">${id ? 'Save' : 'Add item'}</button></footer>`);
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
  const tab = S.rep.tab || 'center';
  el.innerHTML = `<div class="screen-head"><h1>Reports</h1><span class="grow"></span>
    <div class="seg" role="tablist" style="min-width:360px">
      <button type="button" class="${tab === 'center' ? 'on' : ''}" data-act="repTab" data-v="center">Reports center</button>
      <button type="button" class="${tab === 'dash' ? 'on' : ''}" data-act="repTab" data-v="dash">Live dashboard</button></div></div>
    <div id="rep-body"></div>`;
  if (tab === 'center') renderReportsCenter($('#rep-body')); else renderReportsDash($('#rep-body'));
}
function renderReportsDash(el) {
  el.className = 'stack';
  if (!S.rep.loaded) { el.innerHTML = '<div class="empty">Loading report…</div>'; run(async () => { await loadReport(); renderScreen(); }); return; }
  const r = summarize(S.rep.orders);
  const inc = incentives(S.today, S.settings.incentives, S.settings.incentive_daily_cap);
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => r.byHour[h] || (h >= 11 && h <= 23));
  const maxH = Math.max(1, ...hours.map((h) => r.byHour[h] || 0));
  const payTotal = Object.values(r.byPay).reduce((s, v) => s + v, 0) || 1;
  const typeTotal = r.orders || 1;
  const hl = (h) => (h % 12 || 12) + (h < 12 ? 'a' : 'p');
  el.innerHTML = `
    <div class="screen-head"><span class="muted">Quick view of sales</span><span class="grow"></span>
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
      <div class="cols">
        <label class="field">Tables (comma separated)<input name="tables" value="${esc((s.tables || []).join(', '))}"></label>
        <label class="field">Business day starts at (for “Today” in reports)<select name="day_start_hour">${Array.from({ length: 13 }, (_, h) => `<option value="${h}" ${Number(s.day_start_hour ?? 6) === h ? 'selected' : ''}>${h === 0 ? '12:00 midnight' : h + ':00 AM'}</option>`).join('')}</select></label>
      </div>
      <label class="field">Expense types — one per line<textarea name="expense_types" style="min-height:70px">${esc((s.expense_types || []).join('\n'))}</textarea></label>
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
      <div class="cols">
        <label class="field">Receipt paper<select name="paper">${Object.entries(PAPER).map(([k, v]) => `<option value="${k}" ${(s.paper || '80safe') === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <label class="field">Move print left/right (mm, if it’s still cut off)<input name="print_offset_mm" type="number" min="0" max="10" step="1" value="${esc(s.print_offset_mm || 0)}"></label>
      </div>
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
    <div class="mb muted small" style="padding-top:0">App version ${esc(APP_VERSION)} · if this looks old, press Ctrl + Shift + R</div>
    <footer class="mf"><button type="button" class="btn btn-dark btn-lg grow" data-act="signOut">Sign out</button></footer>`);
}

// =====================================================================
// PRINTING (80mm thermal or any printer)
// =====================================================================
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
const invoiceNo = (o) => 'KF-' + String(o.id).padStart(6, '0');
const typeText = (o) => o.type === 'dine' ? `Dine-in · ${esc(o.table_no)}` : o.type === 'take' ? 'Takeaway' : 'Delivery';
const whereText = (o) => o.type === 'dine' ? `TABLE ${esc(o.table_no)}` : o.type === 'take' ? 'TAKEAWAY' : 'DELIVERY';

// KAFEO wordmark with the coffee-cup "O" (prints crisp at any size).
const LOGO_SVG = `<svg class="logo" viewBox="0 0 260 64" xmlns="http://www.w3.org/2000/svg" aria-label="KAFEO">
  <text x="2" y="52" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="58" textLength="188" lengthAdjust="spacingAndGlyphs" fill="#000">KAFE</text>
  <g transform="translate(204 10)" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 10h34v18a16 16 0 0 1-16 16h-2A16 16 0 0 1 2 28z"></path>
    <path d="M36 15h4a7 7 0 0 1 0 14h-4"></path>
    <path d="M12 0c-2 3 2 4 0 7 M22 0c-2 3 2 4 0 7"></path>
  </g></svg>`;

// The logo as a solid picture (PNG). Thermal printer drivers sometimes drop thin vector
// lines — a picture always prints, so the coffee cup can't go missing.
let logoPng = null;
async function logoImg() {
  if (logoPng) return `<img class="logo" src="${logoPng}" alt="KAFEO">`;
  try {
    try { await document.fonts?.load('700 200px Fraunces'); } catch { /* use fallback serif */ }
    const W = 1040, H = 256, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#000'; g.strokeStyle = '#000';
    g.font = '700 210px Fraunces, Georgia, "Times New Roman", serif';
    g.textBaseline = 'alphabetic';
    const word = 'KAFE', track = 18;
    const widths = [...word].map((ch) => g.measureText(ch).width);
    const textW = widths.reduce((a, w) => a + w, 0) + track * (word.length - 1);
    const cupW = 190, gap = 44, total = textW + gap + cupW;
    let x = (W - total) / 2;
    const base = 205;
    [...word].forEach((ch, i) => { g.fillText(ch, x, base); x += widths[i] + track; });
    // coffee cup — thick strokes, sized to the capital letters
    const cx = x - track + gap, top = 62, cupH = 143;
    g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(cx, top + 26);
    g.lineTo(cx + 140, top + 26);
    g.lineTo(cx + 140, top + 26 + 58);
    g.bezierCurveTo(cx + 140, top + cupH, cx + 108, top + cupH, cx + 70, top + cupH);
    g.bezierCurveTo(cx + 32, top + cupH, cx, top + cupH, cx, top + 26 + 58);
    g.closePath(); g.stroke();
    g.beginPath(); g.arc(cx + 150, top + 70, 28, -Math.PI / 2, Math.PI / 2); g.stroke();   // handle
    g.lineWidth = 14;
    [cx + 45, cx + 95].forEach((sx) => {                                                    // steam
      g.beginPath(); g.moveTo(sx, top + 2); g.bezierCurveTo(sx - 14, top - 18, sx + 14, top - 30, sx, top - 50); g.stroke();
    });
    logoPng = c.toDataURL('image/png');
    return `<img class="logo" src="${logoPng}" alt="KAFEO">`;
  } catch { return LOGO_SVG; }
}

// Rupees in words, Pakistani style (thousand / lakh / crore).
function amountInWords(n) {
  n = Math.round(Math.abs(Number(n) || 0));
  if (!n) return 'Rupees Zero Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => (x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? '-' + a[x % 10] : ''));
  const three = (x) => [x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' : '', two(x % 100)].filter(Boolean).join(' ');
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(three(crore) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (thousand) parts.push(two(thousand) + ' Thousand');
  if (n) parts.push(three(n));
  return 'Rupees ' + parts.join(' ') + ' Only';
}

// Code 128 (set B) barcode as SVG — scannable invoice number.
const C128 = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
function barcodeSvg(text) {
  const vals = [...text].map((ch) => ch.charCodeAt(0) - 32);
  const check = vals.reduce((sum, v, i) => sum + v * (i + 1), 104) % 103;
  const codes = [104, ...vals, check, 106];
  let x = 10, bars = '';
  for (const c of codes) {
    [...C128[c]].forEach((w, i) => { w = Number(w); if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="40"></rect>`; x += w; });
  }
  return `<svg class="barcode" viewBox="0 0 ${x + 10} 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-label="${esc(text)}"><g fill="#000">${bars}</g></svg>`;
}

// QR code (WhatsApp ordering link). Loads a small library once; prints without it if offline.
let qrLib = null;
function loadQr() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrLib) {
    qrLib = new Promise((resolve) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
      sc.onload = () => resolve(window.qrcode || null);
      sc.onerror = () => { qrLib = null; resolve(null); };
      document.head.appendChild(sc);
      setTimeout(() => resolve(window.qrcode || null), 2500);
    });
  }
  return qrLib;
}
async function qrSvg(text) {
  try {
    const lib = await loadQr();
    if (!lib) return '';
    const q = lib(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  } catch { return ''; }
}

// Customer receipt (paid) or bill (unpaid). opts: { reprint, customer, qr }
function receiptHtml(o, opts = {}) {
  const s = S.settings;
  const d = o.meta?.discount;
  const inclusive = o.meta?.inclusive ?? !!s.prices_include_tax;
  const c = opts.customer;
  const qtyTotal = o.items.reduce((a, l) => a + l.qty, 0);
  const net = Number(o.subtotal) - Number(o.discount);
  const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
  const row = (l, r, cls = '') => `<div class="r ${cls}"><span>${l}</span><span>${r}</span></div>`;
  const doc = o.status === 'cancelled' ? 'CANCELLED' : !o.paid ? 'PRE-BILL' : Number(o.tax) > 0 ? 'SALES TAX INVOICE' : 'SALES RECEIPT';
  return `<div class="slip rcpt">
    <header class="c">
      ${opts.logo || LOGO_SVG}
      <div class="tagline">COFFEE · FOOD · MOTIVATION</div>
      <div class="addr">${esc(CAFE.address)}<br>Tel / WhatsApp ${esc(CAFE.phone)}${s.tax_number ? `<br>PRA / NTN: ${esc(s.tax_number)}` : ''}</div>
    </header>
    <div class="doc">${doc}${opts.reprint ? ' · DUPLICATE' : ''}</div>
    <section class="info">
      ${kv('Invoice', invoiceNo(o))}${kv('Date', fmtDate(o.created_at))}
      ${kv('Order', typeText(o))}${kv('Time', fmtTime(o.paid ? o.updated_at || o.created_at : o.created_at))}
      ${o.meta?.by ? kv('Cashier', esc(o.meta.by)) : ''}${o.paid ? kv('Payment', esc(o.payment)) : kv('Status', 'Unpaid')}
    </section>
    ${o.customer_name || o.customer_phone ? `<div class="cust">Customer:&nbsp;<b>${esc(o.customer_name || '—')}</b>${o.customer_phone ? '&nbsp;·&nbsp;' + esc(o.customer_phone) : ''}${o.address ? `<br>Deliver to: ${esc(o.address)}` : ''}</div>` : ''}
    <table class="lines">
      <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${o.items.map((l, i) => {
        const ld = d?.scope === 'items' ? lineDiscount(l) : 0;
        return `<tr><td>${i + 1}</td><td>${esc(l.name)}${l.note ? `<small>${esc(l.note)}</small>` : ''}${ld ? `<small>Item discount −${num(ld)}</small>` : ''}</td><td>${l.qty}</td><td>${num(l.price)}</td><td>${num(l.price * l.qty - ld)}</td></tr>`;
      }).join('')}
      ${o.reward ? `<tr><td>${o.items.length + 1}</td><td>${esc(o.reward)}<small>Complimentary · Buy More, Save More</small></td><td>1</td><td>0</td><td>0</td></tr>` : ''}</tbody>
    </table>
    <div class="count">Items: ${o.items.length} &nbsp;|&nbsp; Quantity: ${qtyTotal}</div>
    <section class="sums">
      ${row('Gross amount', num(o.subtotal))}
      ${Number(o.discount) ? row(`Discount${d?.scope === 'bill' && d.type === 'pct' ? ` (${num(d.value)}%)` : ''}${o.discount_label ? `<small>${esc(o.discount_label)}</small>` : ''}`, '− ' + num(o.discount)) + row('Net amount', num(net)) : ''}
      ${Number(o.service_charge) ? row(`Service charge${o.meta?.serviceOn !== false && Number(s.service_pct) ? ` (${num(s.service_pct)}%)` : ''}`, num(o.service_charge)) : ''}
      ${Number(o.tax) ? row(`Sales tax ${num(o.tax_rate)}%${inclusive ? ' (included)' : ''}<small>${isDigital(o.payment) ? 'Card / digital rate' : 'Cash rate'} · PRA</small>`, inclusive ? `(${num(o.tax)})` : num(o.tax)) : ''}
      ${Number(o.delivery_fee) ? row('Delivery charges', num(o.delivery_fee)) : ''}
      ${Number(o.round_off) ? row('Rounding', (Number(o.round_off) > 0 ? '+ ' : '− ') + num(Math.abs(o.round_off))) : ''}
    </section>
    <div class="payable"><span>${o.paid ? 'TOTAL PAID' : 'NET PAYABLE'}</span><span>Rs ${num(o.total)}</span></div>
    <div class="words">${amountInWords(o.total)}</div>
    ${o.paid && Number(o.cash_received) ? `<section class="sums">${row('Cash received', num(o.cash_received))}${row('Change returned', num(o.change_due))}</section>` : ''}
    ${!o.paid && o.status !== 'cancelled' ? '<div class="notice">Please check your bill and pay at the counter.</div>' : ''}
    ${c && s.receipt_loyalty !== false ? `<div class="loyal">
      <div class="lt">KAFEO LOYALTY · ${c.stamps || 0} of ${req()} stamps</div>
      <div class="dots">${Array.from({ length: req() }, (_, i) => `<span class="${i < (c.stamps || 0) ? 'on' : ''}"></span>`).join('')}</div>
      <div>${rewardReady(c, req()) ? `Card complete — enjoy ${loyalPct()}% off on your next visit!` : `${req() - (c.stamps || 0)} more visit${req() - (c.stamps || 0) === 1 ? '' : 's'} to ${loyalPct()}% off`}</div></div>` : ''}
    <footer>
      ${opts.qr ? `<div class="qr-row"><div class="qr">${opts.qr}</div><div><b>Order again on WhatsApp</b><br>Scan the code or message<br>${esc(CAFE.phone)}<br>${esc(CAFE.web)} · ${esc(CAFE.insta)}</div></div>`
        : `<div class="c small-line">Order on WhatsApp ${esc(CAFE.phone)} · ${esc(CAFE.web)} · ${esc(CAFE.insta)}</div>`}
      <div class="thanks">${esc(s.receipt_footer || 'Thank you for visiting KAFEO')}</div>
      ${barcodeSvg(invoiceNo(o))}
      <div class="c inv">${invoiceNo(o)}</div>
      <div class="c powered">${inclusive ? 'Prices include sales tax · ' : ''}Printed ${fmtDate(new Date())} ${fmtTime(new Date())}</div>
    </footer>
  </div>`;
}

// Kitchen order ticket — no prices, big text, tick boxes. opts: { station, onlyNew }
function kotHtml(o, opts = {}) {
  let items = o.items.filter((l) => !opts.station || l.station === opts.station);
  if (opts.onlyNew) items = items.filter((l) => l.added > 0).map((l) => ({ ...l, qty: l.added }));
  if (!items.length) return '';
  const label = opts.station === 'bar' ? 'BAR / COFFEE' : 'KITCHEN';
  return `<div class="slip kot">
    <div class="kot-top"><span>KAFEO</span><span>KITCHEN ORDER TICKET</span></div>
    <div class="kot-head"><span>${label}</span><span>KOT #${o.id}</span></div>
    ${opts.onlyNew ? '<div class="kot-addon">★ ADD-ON · NEW ITEMS ONLY ★</div>' : ''}
    <div class="kot-where">${whereText(o)}</div>
    ${o.type !== 'dine' && o.customer_name ? `<div class="kot-cust">${esc(o.customer_name)}</div>` : ''}
    <div class="kot-meta"><span>${fmtTime(new Date())}</span><span>${o.meta?.by ? 'By ' + esc(o.meta.by) : ''}</span></div>
    <table class="kot-items"><tbody>${items.map((l) => `<tr><td class="q">${l.qty}</td><td>${esc(l.name)}${l.note ? `<small>» ${esc(l.note)}</small>` : ''}</td><td class="tick"><span></span></td></tr>`).join('')}</tbody></table>
    ${o.notes ? `<div class="kot-note"><b>ORDER NOTE</b><br>${esc(o.notes)}</div>` : ''}
    ${o.reward && !opts.onlyNew && opts.station !== 'bar' ? `<div class="kot-note"><b>COMPLIMENTARY</b><br>${esc(o.reward)}</div>` : ''}
    <div class="kot-foot"><span>${items.reduce((a, l) => a + l.qty, 0)} item(s)</span><span>${fmtDate(new Date())}</span></div>
  </div>`;
}
function kotSlips(o, onlyNew) {
  const split = S.settings.kot_split !== false;
  const slips = split ? [kotHtml(o, { station: 'kitchen', onlyNew }), kotHtml(o, { station: 'bar', onlyNew })] : [kotHtml(o, { onlyNew })];
  return slips.filter(Boolean);
}
// Paper sizes: printable width is a little less than the roll so nothing is cut off on the right.
const PAPER = {
  '80safe': { roll: 80, width: 64, label: '80mm roll — narrow (recommended)' },
  '80full': { roll: 80, width: 72, label: '80mm roll — full width' },
  '58': { roll: 58, width: 46, label: '58mm roll' }
};
function printHtml(html) {
  if (!html) return;
  const p = PAPER[S.settings.paper] || PAPER['80safe'];
  const left = Math.max(0, Number(S.settings.print_offset_mm) || 0);
  const area = $('#print-area');
  area.innerHTML = `<style>@page { size: ${p.roll}mm auto; margin: 0; } #print-area { --slip-w: ${p.width}mm; --slip-left: ${left}mm; }</style>
    <div class="paper-${p.roll}">${html}</div>`;
  // Wait until the logo / pictures are fully drawn, otherwise the printer gets a blank space.
  const imgs = [...area.querySelectorAll('img')];
  Promise.all(imgs.map((img) => (img.complete && img.naturalWidth ? (img.decode ? img.decode().catch(() => {}) : null)
    : new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 3000); }))))
    .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    .then(() => window.print());
}
async function customerFor(o) {
  if (!o.customer_phone || S.settings.receipt_loyalty === false) return null;
  try { return await api.getCustomer(o.customer_phone); } catch { return null; }
}
const waOrderLink = () => 'https://wa.me/92' + cleanPhone(CAFE.phone).slice(1);
async function fullReceipt(o, opts = {}) {
  const [customer, qr, logo] = await Promise.all([customerFor(o), qrSvg(waOrderLink()), logoImg()]);
  return receiptHtml(o, { ...opts, customer, qr, logo });
}
async function printReceipt(o, opts = {}) { printHtml(await fullReceipt(o, opts)); }
function printKot(o, onlyNew = false) {
  const slips = kotSlips(o, onlyNew);
  if (!slips.length) return toast('Nothing new to send to the kitchen');
  printHtml(slips.join(''));
}
// After an order is added / paid: kitchen ticket(s) and, if asked, the receipt — one print job.
async function printAfterSave(o, { kot, onlyNew, receipt }) {
  const parts = [];
  if (kot && S.settings.kot_auto !== false) parts.push(...kotSlips(o, onlyNew));
  if (receipt) parts.push(await fullReceipt(o));
  printHtml(parts.join(''));
}
async function printZ() {
  const logo = await logoImg();
  let exp = [];
  try { const a = startOfDay(); exp = await api.expensesBetween(a.toISOString(), new Date(a.getTime() + 864e5).toISOString()); } catch { exp = []; }
  const cashExp = exp.filter((e) => e.method === 'Cash').reduce((a, e) => a + Number(e.amount), 0);
  const allExp = exp.reduce((a, e) => a + Number(e.amount), 0);
  const r = summarize(S.today);
  const inc = incentives(S.today, S.settings.incentives, S.settings.incentive_daily_cap);
  printHtml(`<div class="slip rcpt"><div class="c">${logo}<div class="doc">Z-REPORT · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div class="sm">Printed ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} by ${esc(S.me.profile.name)}</div></div><hr>
    <div class="r big"><span>Net sales</span><span>${num(r.net)}</span></div>
    <div class="r"><span>Paid orders</span><span>${r.orders}</span></div>
    <div class="r"><span>Discounts</span><span>${num(r.discounts)}</span></div>
    <div class="r"><span>Service charge</span><span>${num(r.service)}</span></div>
    <div class="r"><span>Tax collected</span><span>${num(r.tax)}</span></div>
    <div class="r"><span>Delivery fees</span><span>${num(r.fees)}</span></div><hr>
    ${Object.entries(r.byPay).map(([k, v]) => `<div class="r"><span>${esc(k)}</span><span>${num(v)}</span></div>`).join('')}<hr>
    ${Object.entries(r.byReason).map(([k, v]) => `<div class="r sm"><span>Disc: ${esc(k)}</span><span>${num(v)}</span></div>`).join('')}
    <div class="r"><span>Expenses (all)</span><span>${num(allExp)}</span></div>
    <div class="r big"><span>Expected cash in drawer</span><span>${num((r.byPay['Cash'] || 0) + (r.byPay['Cash (COD)'] || 0) - cashExp)}</span></div>
    <div class="sm">= cash sales ${num((r.byPay['Cash'] || 0) + (r.byPay['Cash (COD)'] || 0))} - cash expenses ${num(cashExp)}</div><hr>
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
    run(async () => {
      const o = findOrder(Number(d.id));
      await api.updateOrder(Number(d.id), { status: 'cancelled' });
      if (o && o.status !== 'cancelled') syncStock(o, o.items, []);
      await refreshOrders(); renderBillsBadge(); renderScreen(); toast(`Order #${d.id} cancelled`); });
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
    if (d.v === 'kot') printKot(sample); else Promise.all([qrSvg(waOrderLink()), logoImg()]).then(([qr, logo]) => printHtml(receiptHtml(sample, { customer: { stamps: 3 }, qr, logo })));
  },
  repTab: (d) => { S.rep.tab = d.v; renderScreen(); },
  rcPick: (d) => { S.rc.id = d.id; S.rc.result = null; renderScreen(); },
  rcPreset: (d) => { const r = presetRange(d.v); S.rc.preset = d.v; S.rc.from = toLocalInput(r[0]); S.rc.to = toLocalInput(r[1]); S.rc.result = null; renderScreen(); },
  rcView: () => run(rcLoad),
  rcPdf: () => run(async () => {
    const res = await rcEnsure();
    saveBlob(pdfBlob(toPdfDoc(S.rc.id, res, rcRangeText())), rcFileName('pdf'));
    toast('PDF downloaded');
  }),
  rcA4: () => run(async () => { const res = await rcEnsure(); printA4(toHtml(S.rc.id, res, rcRangeText()), !!REPORTS[S.rc.id].landscape); }),
  rcThermal: () => run(async () => { const res = await rcEnsure(); printHtml(toThermal(S.rc.id, res, rcRangeText())); }),
  rcCsv: () => run(async () => { const res = await rcEnsure(); saveBlob(new Blob([toCsv(res)], { type: 'text/csv' }), rcFileName('csv')); toast('Excel file downloaded'); }),
  expenses: () => run(openExpenses),
  expType: (d) => { S.m.type = d.v; renderExpenseModal(); },
  expMethod: (d) => { S.m.method = d.v; renderExpenseModal(); },
  expSave: () => run(async () => {
    const m = S.m, amount = Math.round(Number(m.amount));
    if (!(amount > 0)) throw new Error('Enter the amount');
    const e = await api.addExpense({ amount, method: m.method, type: m.type, description: m.description.trim(), by_name: S.me.profile.name, created_by: LIVE ? S.me.user.id : null });
    m.list.push(e); m.amount = ''; m.description = '';
    renderExpenseModal(); toast(`Expense saved · ${fmt(amount)}`);
  }),
  expDel: (d) => {
    if (!confirm('Delete this expense?')) return;
    run(async () => { await api.deleteExpense(Number(d.id)); S.m.list = S.m.list.filter((e) => e.id !== Number(d.id)); renderExpenseModal(); });
  },
  invRetry: () => run(async () => { S.inv.ready = null; renderScreen(); }),
  invTab: (d) => { S.inv.tab = d.v; renderScreen(); },
  invFilter: (d) => { S.inv.filter = d.v; renderScreen(); },
  invEdit: (d) => openStockEdit(d.id),
  invMove: (d) => openStockMove(Number(d.id), d.k),
  wasteReason: (d) => { S.m.reason = S.m.reason === d.v ? '' : d.v; renderStockMove(); },
  invMoveSave: () => run(async () => {
    const m = S.m, it = stockById(m.id), q = Number(m.qty);
    if (m.qty === '' || !(q >= 0) || (m.move !== 'adjust' && !(q > 0))) throw new Error('Enter a quantity');
    const change = m.move === 'adjust' ? q - Number(it.qty) : m.move === 'waste' ? -q : q;
    if (!change) { closeModal(); return toast('No change — stock already matches'); }
    await api.addMoves([{ stock_item_id: it.id, change, kind: m.move, unit_cost: m.move === 'purchase' ? Number(m.cost) || 0 : 0,
      note: [m.reason, m.note.trim()].filter(Boolean).join(' · '), by_name: S.me.profile.name }]);
    closeModal(); await loadInventory(); S.inv.movesLoaded = false; renderScreen();
    toast(`${it.name}: now ${invQty(stockById(it.id).qty)} ${it.unit}`);
  }),
  invStarter: () => {
    if (!confirm(`Add ${STARTER_STOCK.length} common café stock items (all at zero)? You can edit or hide any of them.`)) return;
    run(async () => { await api.addStockItems(STARTER_STOCK.map(([name, category, unit]) => ({ name, category, unit }))); await loadInventory(); renderScreen(); toast('Starter list added — now enter what you have with Count'); });
  },
  // Loads KAFEO's full stock list (rate list + kitchen-made items) and every Recipe Book recipe.
  // Items that already exist (same name) keep their stock; old unused items with no history are removed.
  invKafeo: () => {
    if (!confirm(`Load the full KAFEO stock list (${KAFEO_STOCK.length} items) and all ${Object.keys(KAFEO_RECIPES).length} menu recipes?\n\nStock you already entered is kept. All recipes are replaced with the KAFEO Recipe Book.`)) return;
    run(async () => {
      toast('Loading KAFEO stock list…');
      await loadInventory();
      const old = S.inv.stock, byName = new Map(old.map((it) => [it.name.toLowerCase(), it]));
      const moved = new Set((await api.listMoves(10000)).map((m) => m.stock_item_id));
      const wanted = new Set(KAFEO_STOCK.map(([n]) => n.toLowerCase()));
      // 1) Coke and Sprite as two menu items (stock must know which one was sold)
      const coke = S.menu.items.find((i) => i.id === 'k12');
      if (coke) {
        const { image_url, ...base } = coke;
        await api.saveMenuItem({ ...base, name: 'Coke', options: DRINK_SIZES });
        if (!S.menu.items.find((i) => i.id === 'k14')) await api.saveMenuItem({ ...base, id: 'k14', name: 'Sprite', note: '', options: DRINK_SIZES, active: true });
        S.menu = await api.loadMenu();
      }
      // 2) stock items: update matches, add the rest, remove unused old ones
      const upd = [], add = [];
      for (const [name, category, unit, cost, supplier] of KAFEO_STOCK) {
        const it = byName.get(name.toLowerCase());
        if (it) upd.push({ id: it.id, name, category, unit, cost: Number(it.cost) > 0 && moved.has(it.id) ? Number(it.cost) : cost, supplier, active: true });
        else add.push({ name, category, unit, cost, supplier });
      }
      await api.upsertStockItems(upd);
      if (add.length) await api.addStockItems(add);
      const drop = old.filter((it) => !wanted.has(it.name.toLowerCase()) && !moved.has(it.id) && !Number(it.qty)).map((it) => it.id);
      const keep = old.filter((it) => !wanted.has(it.name.toLowerCase()) && !drop.includes(it.id));
      if (keep.length) await api.upsertStockItems(keep.map((it) => ({ id: it.id, name: it.name, category: 'Old list (check)', active: true })));
      await api.deleteStockItems(drop);
      // 3) recipes
      await loadInventory();
      const idOf = new Map(S.inv.stock.map((it) => [it.name.toLowerCase(), it.id]));
      const rows = [];
      for (const [key, lines] of Object.entries(KAFEO_RECIPES)) {
        const [menu_item_id, option_key] = key.split('|');
        if (!S.menu.items.find((i) => i.id === menu_item_id)) continue;
        for (const [name, qty] of lines) { const sid = idOf.get(name.toLowerCase()); if (sid) rows.push({ menu_item_id, option_key, stock_item_id: sid, qty }); }
      }
      await api.replaceAllRecipes(rows);
      await loadInventory(); S.inv.movesLoaded = false; renderScreen();
      toast(`Done — ${S.inv.stock.length} stock items, ${new Set(rows.map((r) => r.menu_item_id + '|' + r.option_key)).size} recipes loaded`);
    });
  },
  rCat: (d) => { S.inv.rCat = d.id; S.inv.rItem = null; renderScreen(); },
  rItem: (d) => { S.inv.rItem = d.id; renderScreen(); },
  rAdd: (d) => { S.inv.draft[d.key] = recipeRows(d.key).concat([{ stock_item_id: '', qty: '' }]); renderScreen(); },
  rDel: (d) => { const rows = recipeRows(d.key); rows.splice(Number(d.i), 1); S.inv.draft[d.key] = rows; renderScreen(); },
  rSave: (d) => run(async () => {
    const [itemId, k] = splitKey(d.key);
    const rows = recipeRows(d.key).filter((r) => Number(r.stock_item_id) && Number(r.qty) > 0).map((r) => ({ stock_item_id: Number(r.stock_item_id), qty: Number(r.qty) }));
    const ids = rows.map((r) => r.stock_item_id);
    if (new Set(ids).size !== ids.length) throw new Error('The same ingredient is listed twice — combine them into one line');
    await api.saveRecipe(itemId, k, rows);
    delete S.inv.draft[d.key];
    await loadInventory(); renderScreen(); toast('Recipe saved');
  }),
  histKind: (d) => { S.inv.histKind = d.v; renderScreen(); },
  histReload: () => { S.inv.movesLoaded = false; renderScreen(); },
  resetDemo: () => { if (confirm('Clear all demo orders and customers?')) { api.resetDemo(); location.reload(); } }
};

const splitKey = (key) => { const i = key.lastIndexOf('|'); return [key.slice(0, i), key.slice(i + 1)]; };
function recipeRows(key) {
  if (S.inv.draft[key]) return S.inv.draft[key].map((r) => ({ ...r }));
  const [itemId, k] = splitKey(key);
  return S.inv.recipes.filter((r) => r.menu_item_id === itemId && r.option_key === k).map((r) => ({ stock_item_id: r.stock_item_id, qty: r.qty }));
}
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
      tables: csvList(form.tables.value), day_start_hour: Number(form.day_start_hour.value) || 0,
      expense_types: form.expense_types.value.split('\n').map((l) => l.trim()).filter(Boolean),
      cashier_max_discount_pct: pct(form.cashier_max_discount_pct.value),
      quick_discounts: csvList(form.quick_discounts.value).map(Number).filter((n) => n > 0 && n <= 100),
      banks: csvList(form.banks.value),
      discount_reasons: form.discount_reasons.value.split('\n').map((l) => l.trim()).filter(Boolean),
      kot_auto: form.kot_auto.checked, kot_split: form.kot_split.checked, receipt_loyalty: form.receipt_loyalty.checked,
      receipt_footer: form.receipt_footer.value.trim(),
      paper: form.paper.value, print_offset_mm: Math.max(0, Math.min(10, Number(form.print_offset_mm.value) || 0)),
      loyalty_stamps: Number(form.loyalty_stamps.value) || 5, loyalty_discount_pct: Number(form.loyalty_discount_pct.value) || 50, bmsm
    };
    await api.saveSettings(data); S.settings = data; toast('Settings saved');
  }),
  stockEdit: (form) => run(async () => {
    const id = S.m?.id;
    const row = { name: form.name.value.trim(), category: form.category.value.trim() || 'General', unit: form.unit.value,
      low_level: Math.max(0, Number(form.low_level.value) || 0), cost: Math.max(0, Number(form.cost.value) || 0), supplier: form.supplier.value.trim() };
    if (!row.name) throw new Error('Name is required');
    if (id) { row.id = id; row.active = form.active.checked; }
    const saved = await api.saveStockItem(row);
    const opening = id ? 0 : Number(form.opening?.value) || 0;
    if (opening > 0) await api.addMoves([{ stock_item_id: saved.id, change: opening, kind: 'opening', unit_cost: row.cost, note: 'Opening stock', by_name: S.me.profile.name }]);
    closeModal(); await loadInventory(); renderScreen(); toast(id ? `${row.name} saved` : `${row.name} added`);
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
  invq: () => {
    const el = $('#inv-body'); if (!el) return;
    const pos = $('[data-bind=invq]')?.selectionStart;
    renderStockTab(el);
    const inp = $('[data-bind=invq]'); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch { /* ignore */ } }
  },
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
    if (k === 'csq') S.cs.q = t.value; else if (k === 'invq') S.inv.q = t.value; else S[k] = t.value;
    BIND[k]?.();
    return;
  }
  if (t.dataset.m && S.m) {               // field inside a pop-up
    S.m[t.dataset.m] = t.value;
    if (S.m.kind === 'discount') {
      if (t.dataset.m === 'custom' && t.value) { S.m.reason = ''; document.querySelectorAll('#dlg [data-act=dReason]').forEach((b) => b.classList.remove('on')); }
      refreshDiscountPreview();
    }
    if (S.m.kind === 'stockMove' && t.dataset.m === 'qty') {
      const it = stockById(S.m.id), q = Number(t.value || 0);
      const after = S.m.move === 'adjust' ? q : Number(it.qty) + (S.m.move === 'waste' ? -q : q);
      const b = $('#mv-after b'); if (b) b.textContent = `${invQty(after)} ${it.unit}`;
    }
    if (S.m.kind === 'pay' && t.dataset.m === 'received') { const c = $('#change'); if (c) c.innerHTML = changeHtml(payBill()); document.querySelectorAll('#dlg [data-act=pCash]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === Number(t.value))); }
    return;
  }
  if (t.dataset.ml !== undefined && S.m?.kind === 'discount') { S.m.lines[Number(t.dataset.ml)].value = t.value; refreshDiscountPreview(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.mc && S.m) { S.m[t.dataset.mc] = t.checked; return; }
  if (t.dataset.rc && S.rc) { S.rc[t.dataset.rc] = t.value; S.rc.preset = 'custom'; S.rc.result = null; renderScreen(); return; }
  if (t.dataset.rcf && S.rc) { S.rc.f[t.dataset.rcf] = t.value; S.rc.result = null; renderScreen(); return; }
  if (t.dataset.rf) {
    const rows = recipeRows(t.dataset.key);
    rows[Number(t.dataset.i)][t.dataset.rf === 'sid' ? 'stock_item_id' : 'qty'] = t.value;
    S.inv.draft[t.dataset.key] = rows; renderScreen();
    return;
  }
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
