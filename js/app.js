// KAFEO POS — the app. Screens: Order, Kitchen, Delivery, Reports, Customers, Menu, Settings.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createDemoApi, DEMO_EMAILS, DEMO_PASSWORD } from './api-demo.js';
import { DEFAULT_SETTINGS } from './menu-seed.js';
import {
  fmt, num, TYPE_LABEL, STATUS_LABEL, bmsmReward, computeTotals, loyaltyAfterPayment, rewardReady,
  cleanPhone, phoneOk, waLink, summarize, incentives, minutesSince, startOfDay
} from './logic.js';

const LIVE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const api = LIVE
  ? (await import('./api-supabase.js')).createSupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createDemoApi();

const CAFE = {
  address: '97-Shadman-1, Shadman Chowk, Jail Road, Lahore',
  phone: '0304 2077720',
  web: 'kafeo.com.pk',
  insta: '@kafeo_official'
};
const PAY_METHODS = ['Cash', 'Card', 'JazzCash', 'Easypaisa'];
const LATE_MIN = 15;

// ---------- small helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  order: 'M6 3h12l-1 18H7L6 3z M9 8h6',
  kitchen: 'M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3z M9 7V4 M15 7V4 M12 7V3',
  delivery: 'M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M9 17h6l-3-8h4l2 8 M12 9H8',
  reports: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  customers: 'M5 8a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M2 21a7 7 0 0 1 14 0 M17 4l1.2 2.4L21 7l-2 2 .5 3-2.5-1.4',
  menu: 'M4 6h16 M4 12h16 M4 18h10',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  me: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8 M4 21a8 8 0 0 1 16 0',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M20 20l-4-4'
};
const icon = (k, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[k]}"></path></svg>`;

const ROUTES = [
  { id: 'order', label: 'Order', roles: ['owner', 'cashier'] },
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
  disc: 'none', pay: 'Cash', customer: null, billsOpen: false,
  // kitchen
  station: 'all',
  // reports
  rep: { range: 'today', orders: [], loaded: false },
  // customers
  cs: { q: '', list: [], sel: null, orders: [] },
  // menu editor
  mcat: null
};
const role = () => S.me?.profile?.role;
const isOwner = () => role() === 'owner';
const canSee = (id) => ROUTES.find((r) => r.id === id)?.roles.includes(role());
const homeRoute = () => ({ owner: 'order', cashier: 'order', kitchen: 'kitchen', rider: 'delivery' }[role()] || 'order');

// ---------- toast ----------
let toastTimer, toastAction = null;
function toast(msg, opts = {}) {
  const el = $('#toast');
  toastAction = opts.action?.fn || null;
  el.innerHTML = `<div class="t ${opts.err ? 'err' : ''}"><span>${esc(msg)}</span>${opts.action ? `<button type="button" data-act="toastAct">${esc(opts.action.label)}</button>` : ''}</div>`;
  el.className = 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; toastAction = null; }, opts.action ? 9000 : 3500);
}
async function run(fn) {
  try { return await fn(); } catch (e) { console.error(e); toast(e.message || 'Something went wrong', { err: true }); }
}

// ---------- boot ----------
async function boot() {
  try { S.me = await api.session(); } catch (e) { S.me = null; }
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
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
      ${LIVE ? '<div class="muted small">Forgot your password? Ask the owner to reset it.</div>' : `
      <div class="demo-note"><b>Demo mode</b> — the database isn't connected yet, so data stays in this browser.<br>
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
  if (kind === 'menu') return run(async () => { S.menu = await api.loadMenu(); rerenderIf(['order', 'menu']); });
  if (kind === 'settings') return run(async () => {
    S.settings = { ...DEFAULT_SETTINGS, ...(await api.loadSettings()) };
    S.riders = await api.listRiders();
    rerenderIf(['order', 'delivery', 'settings']);
  });
  if (kind === 'orders' || kind === 'customers') scheduleRefresh();
}
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => run(async () => {
    await refreshOrders();
    checkNewOrders();
    if (S.route === 'order') { renderBillsBadge(); if (S.billsOpen) renderDrawer(); }
    else if (S.route === 'reports' && S.rep.range === 'today') { await loadReport(); renderScreen(); }
    else if (S.route === 'customers' && S.cs.sel) { await selectCustomer(S.cs.sel.phone, true); }
    else rerenderIf(['kitchen', 'delivery']);
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
  } catch { /* sound not allowed until the screen is tapped once */ }
}
function rerenderIf(routes) { if (routes.includes(S.route)) renderScreen(); }

// Safety net: refresh every minute and when the tablet wakes up.
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
  S.billsOpen = false;
  renderShell();
});

function renderShell() {
  const links = ROUTES.filter((r) => canSee(r.id)).map((r) =>
    `<a href="#${r.id}" class="${S.route === r.id ? 'on' : ''}" ${S.route === r.id ? 'aria-current="page"' : ''}>${icon(r.id)}${r.label}</a>`).join('');
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
  <div id="drawer"></div>
  <dialog id="dlg"></dialog>`;
  renderLiveDot();
  renderScreen();
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
  const map = { order: renderOrder, kitchen: renderKitchen, delivery: renderDelivery, reports: renderReports, customers: renderCustomers, menu: renderMenu, settings: renderSettings };
  (map[S.route] || renderOrder)(el);
}

// =====================================================================
// ORDER & BILLING
// =====================================================================
const itemsIn = (cat) => S.menu.items.filter((i) => i.active && i.category_id === cat);
function visibleItems() {
  const q = S.q.trim().toLowerCase();
  if (q) return S.menu.items.filter((i) => i.active && (i.name.toLowerCase().includes(q) || (i.note || '').toLowerCase().includes(q)));
  return itemsIn(S.cat);
}
function discPct() {
  if (S.disc === 'ten') return 10;
  if (S.disc === 'loyal') return Number(S.settings.loyalty_discount_pct) || 0;
  return 0;
}
const cartTotals = () => computeTotals(S.cart, { discPct: discPct(), taxPct: S.settings.tax_pct, deliveryFee: S.settings.delivery_fee, type: S.type });
const unpaidBills = () => S.open.filter((o) => !o.paid && o.status !== 'cancelled');

function renderOrder(el) {
  el.className = 'order';
  el.innerHTML = `
  <div class="order-menu">
    <div class="order-top">
      <label class="search">${icon('search', 18)}<span class="sr">Search menu</span>
        <input data-bind="q" type="search" placeholder="Search menu — e.g. zinger, latte" value="${esc(S.q)}" autocomplete="off"></label>
      <span class="grow"></span>
      <button type="button" class="btn" data-act="bills">Open bills <span class="tag" id="bills-badge"></span></button>
    </div>
    <div class="cats" id="cats" role="tablist" aria-label="Menu categories"></div>
    <div class="grid" id="grid"></div>
  </div>
  <aside class="ticket" aria-label="Current order">
    <div class="ticket-head" id="thead"></div>
    <div class="lines" id="lines"></div>
    <div class="totals" id="totals"></div>
  </aside>`;
  renderCats(); renderGrid(); renderThead(); renderLines(); renderTotals(); renderBillsBadge();
  if (S.billsOpen) renderDrawer();
}
function renderBillsBadge() { const b = $('#bills-badge'); if (b) b.textContent = unpaidBills().length; }

function renderCats() {
  const el = $('#cats'); if (!el) return;
  el.innerHTML = S.menu.categories.map((c) =>
    `<button type="button" role="tab" aria-selected="${!S.q && S.cat === c.id}" class="pill ${!S.q && S.cat === c.id ? 'on' : ''}" data-act="cat" data-id="${esc(c.id)}">${esc(c.label)}</button>`).join('');
}
function renderGrid() {
  const el = $('#grid'); if (!el) return;
  const items = visibleItems();
  el.innerHTML = items.length ? items.map((i) => `
    <div class="card">
      <b>${esc(i.name)}</b>
      ${i.note ? `<div class="note">${esc(i.note)}</div>` : ''}
      <div class="opts">${i.options.map((o, idx) =>
        `<button type="button" class="opt" data-act="add" data-id="${esc(i.id)}" data-o="${idx}" aria-label="Add ${esc(i.name)}${o.k ? ' ' + esc(o.k) : ''}">${o.k ? esc(o.k) + ' · ' + num(o.p) : '+ ' + fmt(o.p)}</button>`).join('')}</div>
    </div>`).join('') : '<div class="empty">No items match.</div>';
}

function renderThead() {
  const el = $('#thead'); if (!el) return;
  const count = S.cart.reduce((s, l) => s + l.qty, 0);
  const types = [['dine', 'Dine-in'], ['take', 'Takeaway'], ['deliv', 'Delivery']];
  el.innerHTML = `
    <div class="row"><b style="font-size:18px">New order</b><span class="grow"></span><span class="muted small">${count} item${count === 1 ? '' : 's'}</span></div>
    <div class="seg" role="group" aria-label="Order type">${types.map(([v, l]) =>
      `<button type="button" class="${S.type === v ? 'on' : ''}" aria-pressed="${S.type === v}" data-act="type" data-v="${v}">${l}</button>`).join('')}</div>
    ${S.type === 'dine' ? `<div class="tables" role="group" aria-label="Table">${(S.settings.tables || []).map((t) =>
      `<button type="button" class="${S.table === t ? 'on' : ''}" aria-pressed="${S.table === t}" data-act="table" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <label class="field">Customer phone (for loyalty${S.type === 'deliv' ? ' &amp; delivery' : ''})
      <input data-bind="phone" type="tel" inputmode="tel" placeholder="03xx xxxxxxx" value="${esc(S.phone)}" autocomplete="off"></label>
    <div id="guest"></div>
    ${S.type !== 'dine' ? `<label class="field">Customer name<input data-bind="custName" value="${esc(S.custName)}" autocomplete="off"></label>` : ''}
    ${S.type === 'deliv' ? `<label class="field">Delivery address<input data-bind="address" value="${esc(S.address)}" placeholder="House, street, area" autocomplete="off"></label>` : ''}
    <label class="field">Kitchen note<input data-bind="notes" value="${esc(S.notes)}" placeholder="e.g. no onions, extra spicy" autocomplete="off"></label>`;
  renderGuest();
}
function renderGuest() {
  const el = $('#guest'); if (!el) return;
  const p = cleanPhone(S.phone);
  const req = Number(S.settings.loyalty_stamps) || 5;
  if (!phoneOk(p)) { el.innerHTML = ''; return; }
  const c = S.customer;
  if (!c) { el.innerHTML = '<div class="guest new">New customer — this order starts their loyalty card.</div>'; return; }
  const st = c.stamps || 0;
  const dots = Array.from({ length: req }, (_, i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('');
  el.innerHTML = `<div class="guest"><div class="stamps" aria-hidden="true">${dots}</div>
    <div>${esc(c.name || 'Returning guest')} · ${st} of ${req} stamps<br>
    <span style="color:var(--gold)">${rewardReady(c, req) ? `Reward ready — tap “Loyalty ${S.settings.loyalty_discount_pct}%”` : `${req - st} more paid visit${req - st === 1 ? '' : 's'} to ${S.settings.loyalty_discount_pct}% off`}</span></div></div>`;
}

function renderLines() {
  const el = $('#lines'); if (!el) return;
  el.innerHTML = S.cart.length ? S.cart.map((l) => `
    <div class="line">
      <div class="grow"><div class="nm">${esc(l.name)}</div><div class="muted small">${fmt(l.price)} each</div></div>
      <div class="qty">
        <button type="button" data-act="qty" data-k="${esc(l.key)}" data-d="-1" aria-label="One less ${esc(l.name)}">−</button>
        <span>${l.qty}</span>
        <button type="button" data-act="qty" data-k="${esc(l.key)}" data-d="1" aria-label="One more ${esc(l.name)}">+</button>
      </div>
      <div class="amt">${fmt(l.price * l.qty)}</div>
    </div>`).join('') : '<div class="empty">Tap menu items to start an order</div>';
}

function renderTotals() {
  const el = $('#totals'); if (!el) return;
  const t = cartTotals();
  const req = Number(S.settings.loyalty_stamps) || 5;
  const canLoyal = rewardReady(S.customer, req) && phoneOk(cleanPhone(S.phone));
  if (S.disc === 'loyal' && !canLoyal) S.disc = 'none';
  const reward = bmsmReward(t.subtotal, S.settings.bmsm);
  const discs = [['none', 'No discount', true], ['ten', '10%', true], ['loyal', `Loyalty ${S.settings.loyalty_discount_pct}%`, canLoyal]];
  el.innerHTML = `
    <div class="discs" role="group" aria-label="Discount">${discs.map(([v, l, ok]) =>
      `<button type="button" class="${S.disc === v ? 'on' : ''}" aria-pressed="${S.disc === v}" data-act="disc" data-v="${v}" ${ok ? '' : 'disabled'}>${l}</button>`).join('')}</div>
    <div>
      <div class="sum"><span>Subtotal</span><span>${fmt(t.subtotal)}</span></div>
      ${t.discount ? `<div class="sum"><span>Discount</span><span>− ${fmt(t.discount)}</span></div>` : ''}
      <div class="sum"><span>Tax (${Number(S.settings.tax_pct) || 0}%)</span><span>${fmt(t.tax)}</span></div>
      ${S.type === 'deliv' ? `<div class="sum"><span>Delivery fee</span><span>${fmt(t.fee)}</span></div>` : ''}
      <div class="sum total"><span>Total</span><span>${fmt(t.total)}</span></div>
    </div>
    ${reward ? `<div class="reward">Buy More, Save More: ${esc(reward)} — add it to the order at Rs 0</div>` : ''}
    <div class="pays" role="group" aria-label="Payment method">${PAY_METHODS.map((p) =>
      `<button type="button" class="${S.pay === p ? 'on' : ''}" aria-pressed="${S.pay === p}" data-act="pay" data-v="${p}">${p}</button>`).join('')}</div>
    <div class="go">
      <button type="button" class="btn grow" data-act="place" data-paid="0" ${S.cart.length && !S.busy ? '' : 'disabled'}>${S.type === 'deliv' ? 'Send · cash on delivery' : 'Send · pay later'}</button>
      <button type="button" class="btn btn-primary grow" style="flex:1.5" data-act="place" data-paid="1" ${S.cart.length && !S.busy ? '' : 'disabled'}>Charge ${fmt(t.total)}</button>
    </div>`;
}

function addToCart(itemId, optIdx) {
  const i = S.menu.items.find((x) => x.id === itemId);
  const o = i?.options[optIdx];
  if (!o) return;
  const key = i.id + '|' + o.k;
  const line = S.cart.find((l) => l.key === key);
  if (line) line.qty++;
  else S.cart.push({ key, id: i.id, name: i.name + (o.k ? ` (${o.k})` : ''), price: Number(o.p), qty: 1, station: i.station, counts: i.counts || null });
  renderLines(); renderTotals(); renderThead();
}

let phoneTimer = null;
function onPhoneInput() {
  const p = cleanPhone(S.phone);
  clearTimeout(phoneTimer);
  if (!phoneOk(p)) { S.customer = null; renderGuest(); renderTotals(); return; }
  phoneTimer = setTimeout(() => run(async () => {
    S.customer = await api.getCustomer(p);
    if (S.customer) {
      const n = $('[data-bind=custName]'); if (n && !n.value && S.customer.name) { n.value = S.customer.name; S.custName = S.customer.name; }
      const a = $('[data-bind=address]'); if (a && !a.value && S.customer.address) { a.value = S.customer.address; S.address = S.customer.address; }
    }
    renderGuest(); renderTotals();
  }), 250);
}

async function placeOrder(payNow) {
  if (S.busy) return;
  const p = cleanPhone(S.phone);
  if (!S.cart.length) return toast('Add items first', { err: true });
  if (S.type === 'dine' && !S.table) return toast('Pick a table', { err: true });
  if (S.phone && !phoneOk(p)) return toast('Phone should be 11 digits, like 03001234567', { err: true });
  if (S.type === 'deliv' && !phoneOk(p)) return toast('Delivery needs the customer’s phone', { err: true });
  if (S.type === 'deliv' && !S.address.trim()) return toast('Add the delivery address', { err: true });
  const t = cartTotals();
  const order = {
    created_by: LIVE ? S.me.user.id : null,
    type: S.type, table_no: S.type === 'dine' ? S.table : '',
    customer_phone: phoneOk(p) ? p : '', customer_name: S.custName.trim() || S.customer?.name || '', address: S.type === 'deliv' ? S.address.trim() : '',
    items: S.cart.map(({ id, name, price, qty, station, counts }) => ({ id, name, price, qty, station, counts })),
    notes: S.notes.trim(), subtotal: t.subtotal, discount: t.discount,
    discount_label: S.disc === 'loyal' ? 'Loyalty' : S.disc === 'ten' ? '10%' : '',
    tax: t.tax, delivery_fee: t.fee, total: t.total,
    payment: payNow ? S.pay : (S.type === 'deliv' ? 'Cash (COD)' : ''), paid: payNow, status: 'new',
    reward: bmsmReward(t.subtotal, S.settings.bmsm)
  };
  S.busy = true; renderTotals();
  await run(async () => {
    const row = await api.createOrder(order);
    if (row.customer_phone) await saveCustomerAfter(row, payNow);
    Object.assign(S, { cart: [], table: '', phone: '', custName: '', address: '', notes: '', disc: 'none', customer: null, q: '' });
    await refreshOrders();
    S.busy = false;
    renderOrder($('#screen'));
    toast(payNow ? `Order #${row.id} paid · ${fmt(row.total)}` : `Order #${row.id} sent to kitchen`,
      { action: { label: payNow ? 'Print receipt' : 'Print bill', fn: () => printReceipt(row) } });
  });
  if (S.busy) { S.busy = false; renderTotals(); }
}

// Creates/updates the customer card; gives a stamp when paid.
async function saveCustomerAfter(order, paid) {
  const req = Number(S.settings.loyalty_stamps) || 5;
  let c = (await api.getCustomer(order.customer_phone)) || { phone: order.customer_phone, stamps: 0, visits: 0, total_spent: 0, rewards_used: 0 };
  if (order.customer_name) c.name = order.customer_name;
  if (order.address) c.address = order.address;
  if (paid) c = loyaltyAfterPayment(c, order, req);
  await api.saveCustomer(c);
}

async function payBill(id, method) {
  const before = S.open.find((o) => o.id === id) || await api.getOrder(id);
  if (!before || before.paid) return;
  const patch = { paid: true, payment: method };
  if (before.type === 'deliv' && before.status === 'out') patch.status = 'done';
  const o = await api.updateOrder(id, patch);
  if (o.customer_phone) await saveCustomerAfter(o, true);
  await refreshOrders();
  return o;
}

// ---------- open bills drawer ----------
function renderDrawer() {
  const el = $('#drawer'); if (!el) return;
  if (!S.billsOpen) { el.innerHTML = ''; return; }
  const bills = unpaidBills();
  const paidToday = S.today.filter((o) => o.paid && o.status !== 'cancelled').slice(0, 15);
  const where = (o) => o.type === 'dine' ? `Table ${esc(o.table_no)}` : `${TYPE_LABEL[o.type]}${o.customer_name ? ' · ' + esc(o.customer_name) : ''}`;
  el.innerHTML = `
  <div class="drawer-bg" data-act="closeBills">
    <section class="drawer" role="dialog" aria-modal="true" aria-label="Open bills" data-stop="1">
      <div class="drawer-head"><h2>Open bills (${bills.length})</h2><button type="button" class="btn btn-sm" data-act="closeBills">Close</button></div>
      <div class="drawer-body">
        ${bills.length ? bills.map((o) => `
          <div class="bill">
            <div class="row"><b style="font-size:17px">#${o.id}</b><span class="tag">${where(o)}</span><span class="tag ${o.status === 'done' ? 'ok' : ''}">${STATUS_LABEL[o.status]}</span><span class="grow"></span><b>${fmt(o.total)}</b></div>
            <div class="items">${o.items.map((l) => `${l.qty}× ${esc(l.name)}`).join(', ')}${o.discount_label ? ` · discount ${esc(o.discount_label)}` : ''}</div>
            <div class="pays">${PAY_METHODS.map((m) => `<button type="button" data-act="payBill" data-id="${o.id}" data-v="${m}">${m}</button>`).join('')}</div>
            <div class="row"><button type="button" class="btn btn-sm" data-act="print" data-id="${o.id}">Print bill</button>
              <span class="grow muted small">${minutesSince(o.created_at)} min ago</span>
              ${isOwner() ? `<button type="button" class="btn btn-sm btn-danger" data-act="cancelOrder" data-id="${o.id}">Cancel order</button>` : ''}</div>
          </div>`).join('') : '<div class="empty">No unpaid bills.</div>'}
        <h3 style="margin:8px 0 0">Paid today</h3>
        ${paidToday.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${paidToday.map((o) => `
          <tr><td>#${o.id}</td><td>${where(o)}</td><td>${esc(o.payment)}</td><td class="num">${fmt(o.total)}</td>
          <td class="num"><button type="button" class="btn btn-sm" data-act="print" data-id="${o.id}">Receipt</button></td></tr>`).join('')}</tbody></table></div>`
          : '<div class="muted small">Nothing paid yet today.</div>'}
      </div>
    </section>
  </div>`;
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
    <div class="row"><span class="no">#${o.id}</span><span class="tag dark">${where}</span><span class="age">${age} min</span></div>
    ${items.map((i) => `<div class="it"><b>${i.qty}×</b><span>${esc(i.name)}</span></div>`).join('')}
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
      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Rider</th><th></th></tr></thead>
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
      <div class="kpi"><div class="l">Discounts given</div><div class="v">${fmt(r.discounts)}</div><div class="s">${r.loyaltyUsed} loyalty reward${r.loyaltyUsed === 1 ? '' : 's'}</div></div>
      <div class="kpi"><div class="l">Unpaid / cancelled</div><div class="v">${fmt(r.unpaid)}</div><div class="s">${r.unpaidCount} unpaid · ${r.cancelled} cancelled</div></div>
    </div>
    <div class="cols">
      <section class="panel"><h2>Sales by hour</h2>
        <div class="bars">${hours.map((h) => { const v = r.byHour[h] || 0; return `<div title="${hl(h)}: ${fmt(v)}"><span>${v ? (v / 1000).toFixed(1) + 'k' : ''}</span><span class="b ${v === maxH && v ? 'top' : ''}" style="height:${Math.round(v / maxH * 80)}%"></span>${hl(h)}</div>`; }).join('')}</div>
      </section>
      <section class="panel"><h2>Payments</h2>
        ${Object.entries(r.byPay).map(([k, v]) => `<div class="meter"><span style="width:90px">${esc(k)}</span><span class="track"><span style="width:${Math.round(v / payTotal * 100)}%"></span></span><b style="width:90px" class="right">${fmt(v)}</b></div>`).join('') || '<div class="muted">No paid orders yet.</div>'}
        <h2 style="margin-top:16px">Order type</h2>
        ${['dine', 'take', 'deliv'].map((k) => `<div class="meter"><span style="width:90px">${TYPE_LABEL[k]}</span><span class="track"><span style="width:${Math.round(r.byType[k] / typeTotal * 100)}%;background:var(--ink)"></span></span><b style="width:90px" class="right">${r.byType[k]}</b></div>`).join('')}
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
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Time</th><th>Type</th><th>Items</th><th>Payment</th><th class="num">Total</th><th></th></tr></thead><tbody>
      ${S.rep.orders.slice(0, 100).map((o) => `<tr>
        <td>#${o.id}</td><td>${new Date(o.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${TYPE_LABEL[o.type]}${o.table_no ? ' · ' + esc(o.table_no) : ''}</td>
        <td class="small">${o.items.map((l) => `${l.qty}× ${esc(l.name)}`).join(', ')}</td>
        <td>${o.status === 'cancelled' ? '<span class="tag warn">Cancelled</span>' : o.paid ? esc(o.payment) : '<span class="tag">Unpaid</span>'}</td>
        <td class="num">${fmt(o.total)}</td>
        <td class="num"><button type="button" class="btn btn-sm" data-act="print" data-id="${o.id}">Receipt</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No orders in this period.</td></tr>'}
      </tbody></table></div>
    </section>`;
}

function downloadCsv() {
  const head = ['order', 'date', 'type', 'table', 'customer', 'phone', 'items', 'subtotal', 'discount', 'tax', 'delivery_fee', 'total', 'payment', 'paid', 'status'];
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = S.rep.orders.map((o) => [o.id, o.created_at, TYPE_LABEL[o.type], o.table_no, o.customer_name, o.customer_phone,
    o.items.map((l) => `${l.qty}x ${l.name}`).join('; '), o.subtotal, o.discount, o.tax, o.delivery_fee, o.total, o.payment, o.paid ? 'yes' : 'no', o.status].map(q).join(','));
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
  const req = Number(S.settings.loyalty_stamps) || 5;
  const c = S.cs.sel;
  el.innerHTML = `
    <section class="cust-list" aria-label="Customer list">
      <h1 style="margin:0;font-size:24px">Customers</h1>
      <label class="search" style="max-width:none">${icon('search', 18)}<span class="sr">Search customers</span>
        <input data-bind="csq" type="search" placeholder="Search by phone or name" value="${esc(S.cs.q)}" autocomplete="off"></label>
      <div class="list" id="cust-rows">${custRows(req)}</div>
    </section>
    <section class="screen" aria-label="Customer details">
      ${c ? `
      <div class="screen-head"><div><h1>${esc(c.name || 'Customer')}</h1><div class="muted">${esc(c.phone)}${c.address ? ' · ' + esc(c.address) : ''}</div></div>
        <span class="grow"></span>
        <a class="btn btn-ok" target="_blank" rel="noopener" href="${esc(waLink(c.phone, rewardReady(c, req)
          ? `Assalam o Alaikum${c.name ? ' ' + c.name : ''}! Your KAFEO loyalty card is full — enjoy ${S.settings.loyalty_discount_pct}% off on your next visit. See you soon at KAFEO, Shadman.`
          : `Assalam o Alaikum${c.name ? ' ' + c.name : ''}! You have ${c.stamps || 0} of ${req} stamps on your KAFEO loyalty card. ${req - (c.stamps || 0)} more visit(s) and you get ${S.settings.loyalty_discount_pct}% off!`))}">WhatsApp reminder</a>
        <button type="button" class="btn btn-primary" data-act="orderFor" data-phone="${esc(c.phone)}">Start order</button></div>
      <div class="cols">
        <div class="loyal-card" aria-label="Loyalty card, ${c.stamps || 0} of ${req} stamps">
          <div class="row"><span class="brand">KAFEO</span><span class="grow"></span><span class="small" style="letter-spacing:2px;color:var(--night-muted)">LOYALTY</span></div>
          <div class="small" style="color:var(--night-muted)">Coffee • Food • Motivation</div>
          <div class="dots">${Array.from({ length: req }, (_, i) => `<i class="${i < (c.stamps || 0) ? 'on' : ''}">${i < (c.stamps || 0) ? '✓' : i === req - 1 ? S.settings.loyalty_discount_pct + '%' : ''}</i>`).join('')}</div>
          <div class="row small" style="color:var(--night-muted)"><span>${req} stamps = ${S.settings.loyalty_discount_pct}% off</span><span class="grow"></span><span>${c.stamps || 0} of ${req}</span></div>
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
function custRows(req) {
  return S.cs.list.length ? S.cs.list.map((p) => `
    <button type="button" class="cust-row ${S.cs.sel?.phone === p.phone ? 'on' : ''}" data-act="pickCust" data-phone="${esc(p.phone)}">
      <span class="avatar">${esc((p.name || '#').trim().charAt(0).toUpperCase() || '#')}</span>
      <span class="grow"><b style="display:block">${esc(p.name || 'No name')}</b><span class="muted small">${esc(p.phone)}</span></span>
      <span class="tag ${rewardReady(p, req) ? 'ok' : ''}">${p.stamps || 0}/${req}</span>
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
    <div class="screen-head"><h1>Menu & prices</h1><span class="muted">Changes show on every counter instantly.</span></div>
    <div class="cats" style="padding:0">${S.menu.categories.map((c) =>
      `<button type="button" class="pill ${S.mcat === c.id ? 'on' : ''}" data-act="mcat" data-id="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>On menu</th><th>Name</th><th>Description</th><th>Prices</th><th>Station</th><th>Incentive</th><th></th></tr></thead>
      <tbody>${items.map((i) => `
        <tr data-row="${esc(i.id)}">
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
      <h2>Billing</h2>
      <div class="cols">
        <label class="field">Tax % (PRA) — check your current rate<input name="tax_pct" type="number" min="0" max="30" step="0.5" value="${esc(s.tax_pct)}"></label>
        <label class="field">Delivery fee (Rs)<input name="delivery_fee" type="number" min="0" step="10" value="${esc(s.delivery_fee)}"></label>
        <label class="field">Tables (comma separated)<input name="tables" value="${esc((s.tables || []).join(', '))}"></label>
      </div>
      <h2>Loyalty</h2>
      <div class="cols">
        <label class="field">Stamps for a reward<input name="loyalty_stamps" type="number" min="2" max="20" value="${esc(s.loyalty_stamps)}"></label>
        <label class="field">Reward discount %<input name="loyalty_discount_pct" type="number" min="5" max="100" value="${esc(s.loyalty_discount_pct)}"></label>
      </div>
      <label class="field">Buy More, Save More — one per line, “amount = reward”
        <textarea name="bmsm">${esc((s.bmsm || []).map((b) => `${b.min} = ${b.reward}`).join('\n'))}</textarea></label>
      <div><button class="btn btn-primary" type="submit">Save settings</button></div>
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
      <div class="muted small">To add a staff member or reset a password, follow “Add a staff login” in the README (done in Supabase, takes 1 minute). To block someone at once, set them inactive there.</div>
    </section>
    ${LIVE ? '' : `<section class="panel stack"><h2>Demo data</h2><div class="muted small">Clears all demo orders and customers in this browser.</div>
      <div><button type="button" class="btn btn-danger" data-act="resetDemo">Reset demo data</button></div></section>`}`;
}

// =====================================================================
// ACCOUNT DIALOG
// =====================================================================
function openAccount() {
  const d = $('#dlg');
  d.innerHTML = `<form class="dlg" data-submit="changePw" method="dialog">
    <h2>${esc(S.me.profile.name)}</h2>
    <div class="muted">Signed in as ${esc(S.me.user.email)} · ${esc(S.me.profile.role)}</div>
    ${LIVE ? `<label class="field">New password (8+ characters)<input name="pw" type="password" minlength="8" autocomplete="new-password"></label>
      <button class="btn" type="submit">Change password</button>` : ''}
    <div class="row"><button type="button" class="btn btn-dark grow" data-act="signOut">Sign out</button>
      <button type="button" class="btn grow" data-act="closeDlg">Close</button></div>
  </form>`;
  d.showModal();
}

// =====================================================================
// PRINTING (80mm thermal or any printer)
// =====================================================================
function receiptHtml(o) {
  const when = new Date(o.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const where = o.type === 'dine' ? `Table ${esc(o.table_no)}` : TYPE_LABEL[o.type];
  return `<div class="rcpt">
    <div class="c"><div class="brand">KAFEO</div><div class="sm">Coffee • Food • Motivation</div><div class="sm">${esc(CAFE.address)}<br>${esc(CAFE.phone)}</div></div>
    <hr><div class="r"><span>Order #${o.id}</span><span>${where}</span></div><div class="r sm"><span>${when}</span><span>${o.paid ? 'PAID' : 'BILL — UNPAID'}</span></div>
    ${o.customer_name || o.customer_phone ? `<div class="sm">${esc(o.customer_name)} ${esc(o.customer_phone)}</div>` : ''}
    ${o.address ? `<div class="sm">${esc(o.address)}</div>` : ''}
    <hr>${o.items.map((l) => `<div class="r"><span>${l.qty} × ${esc(l.name)}</span><span>${num(l.price * l.qty)}</span></div>`).join('')}
    ${o.reward ? `<div class="r"><span>1 × ${esc(o.reward)}</span><span>0</span></div>` : ''}
    <hr><div class="r"><span>Subtotal</span><span>${num(o.subtotal)}</span></div>
    ${Number(o.discount) ? `<div class="r"><span>Discount ${esc(o.discount_label)}</span><span>-${num(o.discount)}</span></div>` : ''}
    ${Number(o.tax) ? `<div class="r"><span>Tax</span><span>${num(o.tax)}</span></div>` : ''}
    ${Number(o.delivery_fee) ? `<div class="r"><span>Delivery</span><span>${num(o.delivery_fee)}</span></div>` : ''}
    <div class="r big"><span>TOTAL</span><span>Rs ${num(o.total)}</span></div>
    ${o.paid ? `<div class="r"><span>Paid by</span><span>${esc(o.payment)}</span></div>` : ''}
    <hr><div class="c sm">Thank you for visiting KAFEO<br>Order on WhatsApp: ${esc(CAFE.phone)}<br>${esc(CAFE.web)} · ${esc(CAFE.insta)}</div>
  </div>`;
}
function printHtml(html) { $('#print-area').innerHTML = html; window.print(); }
const printReceipt = (o) => printHtml(receiptHtml(o));
function printZ() {
  const r = summarize(S.today);
  const inc = incentives(S.today, S.settings.incentives, S.settings.incentive_daily_cap);
  printHtml(`<div class="rcpt"><div class="c"><div class="brand">KAFEO</div><div>Z-REPORT · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div class="sm">Printed ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} by ${esc(S.me.profile.name)}</div></div><hr>
    <div class="r big"><span>Net sales</span><span>${num(r.net)}</span></div>
    <div class="r"><span>Paid orders</span><span>${r.orders}</span></div>
    <div class="r"><span>Discounts</span><span>${num(r.discounts)}</span></div>
    <div class="r"><span>Tax</span><span>${num(r.tax)}</span></div>
    <div class="r"><span>Delivery fees</span><span>${num(r.fees)}</span></div><hr>
    ${Object.entries(r.byPay).map(([k, v]) => `<div class="r"><span>${esc(k)}</span><span>${num(v)}</span></div>`).join('')}<hr>
    <div class="r"><span>Unpaid bills (${r.unpaidCount})</span><span>${num(r.unpaid)}</span></div>
    <div class="r"><span>Cancelled orders</span><span>${r.cancelled}</span></div><hr>
    ${inc.pools.map((p) => `<div class="r"><span>${esc(p.label)} (${p.count})</span><span>${num(p.earned)}</span></div>`).join('')}
    <div class="r"><span>Incentives total</span><span>${num(inc.total)}</span></div><hr>
    <div class="sm">Cash counted: ____________<br><br>Signature: ____________</div></div>`);
}

// =====================================================================
// EVENTS
// =====================================================================
const ACT = {
  toastAct: () => { const f = toastAction; $('#toast').className = ''; f?.(); },
  demoFill: (d) => { $('input[name=email]').value = d.email; $('input[name=password]').value = DEMO_PASSWORD; },
  signOut: () => run(async () => { unsub?.(); unsub = null; await api.signOut(); S.me = null; location.hash = ''; $('#dlg')?.close?.(); renderLogin(); }),
  account: () => openAccount(),
  closeDlg: () => $('#dlg').close(),
  cat: (d) => { S.cat = d.id; S.q = ''; const q = $('[data-bind=q]'); if (q) q.value = ''; renderCats(); renderGrid(); },
  add: (d) => addToCart(d.id, Number(d.o)),
  qty: (d) => {
    const l = S.cart.find((x) => x.key === d.k); if (!l) return;
    l.qty += Number(d.d);
    if (l.qty <= 0) S.cart = S.cart.filter((x) => x !== l);
    renderLines(); renderTotals(); renderThead();
  },
  type: (d) => { S.type = d.v; renderThead(); renderTotals(); },
  table: (d) => { S.table = d.v; renderThead(); },
  disc: (d) => { S.disc = d.v; renderTotals(); },
  pay: (d) => { S.pay = d.v; renderTotals(); },
  place: (d) => placeOrder(d.paid === '1'),
  bills: () => { S.billsOpen = true; renderDrawer(); },
  closeBills: (d, el, e) => { if (e.target.closest('[data-stop]') && !el.matches('button')) return; S.billsOpen = false; renderDrawer(); },
  payBill: (d) => run(async () => {
    const o = await payBill(Number(d.id), d.v);
    renderBillsBadge(); renderDrawer();
    if (o) toast(`Order #${o.id} paid by ${o.payment}`, { action: { label: 'Print receipt', fn: () => printReceipt(o) } });
  }),
  print: (d) => run(async () => { const o = S.open.find((x) => x.id === Number(d.id)) || S.today.find((x) => x.id === Number(d.id)) || S.rep.orders.find((x) => x.id === Number(d.id)) || await api.getOrder(Number(d.id)); if (o) printReceipt(o); }),
  cancelOrder: (d) => {
    if (!confirm(`Cancel order #${d.id}? It will be kept in reports as cancelled.`)) return;
    run(async () => { await api.updateOrder(Number(d.id), { status: 'cancelled' }); await refreshOrders(); renderBillsBadge(); renderDrawer(); toast(`Order #${d.id} cancelled`); });
  },
  station: (d) => { S.station = d.v; renderScreen(); },
  kstatus: (d) => run(async () => { await api.updateOrder(Number(d.id), { status: d.v }); await refreshOrders(); renderScreen(); }),
  outFor: (d) => {
    const o = S.open.find((x) => x.id === Number(d.id));
    if (!o?.rider_id) return toast('Assign a rider first', { err: true });
    run(async () => { await api.updateOrder(o.id, { status: 'out' }); await refreshOrders(); renderScreen(); });
  },
  delivered: (d) => run(async () => {
    const o = S.open.find((x) => x.id === Number(d.id)); if (!o) return;
    if (!o.paid) await payBill(o.id, 'Cash (COD)');
    await api.updateOrder(o.id, { status: 'done' });
    await refreshOrders(); renderScreen(); toast(`Order #${o.id} delivered`);
  }),
  range: (d) => { S.rep.range = d.v; S.rep.loaded = false; renderScreen(); },
  csv: () => downloadCsv(),
  zreport: () => printZ(),
  pickCust: (d) => run(() => selectCustomer(d.phone)),
  orderFor: (d) => {
    const c = S.cs.sel;
    Object.assign(S, { phone: d.phone, customer: c, custName: c?.name || '', address: c?.address || '', cart: [], disc: 'none' });
    location.hash = '#order';
  },
  stamp: (d) => run(async () => {
    const req = Number(S.settings.loyalty_stamps) || 5;
    const c = { ...S.cs.sel, stamps: Math.max(0, Math.min(req, (S.cs.sel.stamps || 0) + Number(d.d))) };
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
  resetDemo: () => { if (confirm('Clear all demo orders and customers?')) { api.resetDemo(); location.reload(); } }
};

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
    await api.changePassword(pw); form.pw.value = ''; $('#dlg').close(); toast('Password changed');
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
      options: opts, station: isBar ? 'bar' : 'kitchen', counts: S.mcat === 'pizza' ? 'pizza' : S.mcat === 'steak' ? null : isBar ? 'drink' : null,
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
    const data = {
      ...S.settings,
      tax_pct: Number(form.tax_pct.value) || 0, delivery_fee: Number(form.delivery_fee.value) || 0,
      tables: form.tables.value.split(',').map((t) => t.trim()).filter(Boolean),
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
  csq: () => { clearTimeout(custTimer); custTimer = setTimeout(() => run(async () => { await loadCustomers(); const el = $('#cust-rows'); if (el) el.innerHTML = custRows(Number(S.settings.loyalty_stamps) || 5); }), 250); }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.dataset.act === 'closeBills' && el.classList.contains('drawer-bg') && e.target.closest('[data-stop]')) return;
  e.preventDefault();
  fn(el.dataset, el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-bind]');
  if (!el) return;
  const k = el.dataset.bind;
  if (k === 'csq') S.cs.q = el.value; else S[k] = el.value;
  BIND[k]?.();
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change="rider"]');
  if (!el) return;
  run(async () => { await api.updateOrder(Number(el.dataset.id), { rider_id: el.value ? Number(el.value) : null }); await refreshOrders(); renderScreen(); });
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-submit]');
  if (!form) return;
  e.preventDefault();
  SUBMIT[form.dataset.submit]?.(form);
});

boot();
