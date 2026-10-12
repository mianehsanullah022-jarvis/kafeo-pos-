// Demo backend: same functions as the live one, but data stays in this browser
// (localStorage). Other tabs of the same browser update live, so you can open
// the counter in one tab and the kitchen in another to try the flow.
import { CATEGORIES, ITEMS, DEFAULT_SETTINGS } from './menu-seed.js?v=2026.10.13-0125';

const KEY = 'kafeo-pos-demo-v1';
const DEMO_USERS = [
  { email: 'owner@demo', name: 'Owner (demo)', role: 'owner' },
  { email: 'cashier@demo', name: 'Cashier (demo)', role: 'cashier' },
  { email: 'kitchen@demo', name: 'Kitchen (demo)', role: 'kitchen' },
  { email: 'rider@demo', name: 'Rider (demo)', role: 'rider' }
];
export const DEMO_PASSWORD = 'kafeo123';
export const DEMO_EMAILS = DEMO_USERS.map((u) => u.email);

function fresh() {
  return {
    categories: CATEGORIES.map((c) => ({ ...c })),
    items: ITEMS.map((i) => ({ id: i.id, category_id: i.cat, name: i.name, note: i.note, options: i.opts, station: i.station, counts: i.counts, active: true, sort: i.sort })),
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    riders: [{ id: 1, name: 'Rider 1', phone: '', active: true }, { id: 2, name: 'Rider 2', phone: '', active: true }],
    customers: {},
    orders: [],
    stock: [], recipes: [], moves: [], nextStock: 1, nextRecipe: 1, nextMove: 1,
    nextOrder: 1001,
    session: null
  };
}

export function createDemoApi() {
  let db;
  const load = () => {
    try { db = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { db = fresh(); }
    return db;
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } };
  load();
  let bc = null;
  try { bc = new BroadcastChannel('kafeo-pos-demo'); } catch { bc = null; }
  const listeners = new Set();
  const notify = (kind) => { save(); listeners.forEach((f) => f(kind)); bc?.postMessage(kind); };
  bc && (bc.onmessage = (e) => { load(); listeners.forEach((f) => f(e.data)); });
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const userFor = (email) => DEMO_USERS.find((u) => u.email === email);
  const asSession = (email) => {
    const u = userFor(email);
    return u ? { user: { id: 'demo-' + u.role, email: u.email }, profile: { id: 'demo-' + u.role, name: u.name, role: u.role, active: true } } : null;
  };

  return {
    demo: true,
    // Login is per browser tab in demo mode, so one tab can be the counter and another the kitchen.
    async session() { let e = null; try { e = sessionStorage.getItem(KEY + '-who'); } catch { e = null; } return e ? asSession(e) : null; },
    async signIn(email, password) {
      const e = email.trim().toLowerCase();
      if (!userFor(e) || password !== DEMO_PASSWORD) throw new Error('Wrong email or password');
      try { sessionStorage.setItem(KEY + '-who', e); } catch { /* blocked storage: stays signed in until refresh */ }
      return asSession(e);
    },
    async signOut() { try { sessionStorage.removeItem(KEY + '-who'); } catch { /* ignore */ } },
    async changePassword() { throw new Error('Not available in demo mode'); },

    async loadMenu() { load(); return clone({ categories: db.categories, items: db.items }); },
    async saveMenuItem(item) {
      const i = db.items.findIndex((x) => x.id === item.id);
      if (i >= 0) db.items[i] = { ...db.items[i], ...item }; else db.items.push(item);
      notify('menu'); return clone(item);
    },
    // Demo: keep the (small, resized) photo inside the browser as a data link.
    async uploadImage(blob) {
      return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    },
    async loadSettings() { load(); return clone(db.settings); },
    async saveSettings(data) { db.settings = clone(data); notify('settings'); },
    async listRiders() { load(); return clone(db.riders); },
    async saveRider(r) {
      if (!r.id) { r = { ...r, id: Math.max(0, ...db.riders.map((x) => x.id)) + 1 }; db.riders.push(r); }
      else db.riders = db.riders.map((x) => (x.id === r.id ? { ...x, ...r } : x));
      notify('settings'); return clone(r);
    },
    async listStaff() { return DEMO_USERS.map((u) => ({ id: 'demo-' + u.role, name: u.name, role: u.role, active: true })); },

    async createOrder(o) {
      load();
      const now = new Date().toISOString();
      const row = { status: 'new', paid: false, rider_id: null, reward: '', notes: '', ...o, id: db.nextOrder++, created_at: now, updated_at: now };
      db.orders.push(row); notify('orders'); return clone(row);
    },
    async updateOrder(id, patch) {
      load();
      const i = db.orders.findIndex((x) => x.id === id);
      if (i < 0) throw new Error('Order not found');
      db.orders[i] = { ...db.orders[i], ...patch, updated_at: new Date().toISOString() };
      notify('orders'); return clone(db.orders[i]);
    },
    async ordersBetween(fromIso, toIso) {
      load();
      return clone(db.orders.filter((o) => o.created_at >= fromIso && o.created_at < toIso).reverse());
    },
    async openOrders() {
      load();
      const since = new Date(Date.now() - 3 * 864e5).toISOString();
      return clone(db.orders.filter((o) => o.created_at >= since &&
        (['new', 'preparing', 'ready', 'out'].includes(o.status) || (!o.paid && o.status !== 'cancelled'))));
    },
    async ordersForPhone(phone) { load(); return clone(db.orders.filter((o) => o.customer_phone === phone).reverse().slice(0, 20)); },
    async getOrder(id) { load(); return clone(db.orders.find((o) => o.id === id) || null); },

    // ---- inventory ----
    async listStock() { load(); return clone(db.stock || []); },
    async saveStockItem(it) {
      load(); db.stock = db.stock || [];
      if (!it.id) { it = { qty: 0, active: true, category: 'General', unit: 'pcs', low_level: 0, cost: 0, supplier: '', ...it, id: db.nextStock++ }; db.stock.push(it); }
      else db.stock = db.stock.map((x) => (x.id === it.id ? { ...x, ...it } : x));
      notify('stock'); return clone(db.stock.find((x) => x.id === it.id));
    },
    async addStockItems(rows) { const out = []; for (const r of rows) out.push(await this.saveStockItem({ ...r })); return out; },
    async listRecipes() { load(); return clone(db.recipes || []); },
    async saveRecipe(menuItemId, optionKey, rows) {
      load(); db.recipes = (db.recipes || []).filter((r) => !(r.menu_item_id === menuItemId && r.option_key === optionKey));
      rows.forEach((r) => db.recipes.push({ id: db.nextRecipe++, menu_item_id: menuItemId, option_key: optionKey, stock_item_id: r.stock_item_id, qty: Number(r.qty) }));
      notify('stock');
    },
    async addMoves(moves) {
      load(); db.moves = db.moves || []; db.stock = db.stock || [];
      for (const m of moves) {
        const row = { note: '', order_id: null, unit_cost: 0, by_name: '', ...m, id: db.nextMove++, created_at: new Date().toISOString() };
        db.moves.push(row);
        const it = db.stock.find((x) => x.id === m.stock_item_id);
        if (it) { it.qty = Number(it.qty) + Number(m.change); if (m.kind === 'purchase' && Number(m.unit_cost) > 0) it.cost = Number(m.unit_cost); }
      }
      notify('stock');
    },
    async movesBetween(fromIso, toIso) { load(); return clone((db.moves || []).filter((m) => m.created_at >= fromIso && m.created_at < toIso)); },
    async expensesBetween(fromIso, toIso) { load(); return clone((db.expenses || []).filter((e) => e.created_at >= fromIso && e.created_at < toIso)); },
    async addExpense(e) {
      load(); db.expenses = db.expenses || []; db.nextExpense = db.nextExpense || 1;
      const row = { method: 'Cash', type: 'Other', description: '', by_name: '', ...e, id: db.nextExpense++, created_at: new Date().toISOString() };
      db.expenses.push(row); notify('expenses'); return clone(row);
    },
    async deleteExpense(id) { load(); db.expenses = (db.expenses || []).filter((e) => e.id !== id); notify('expenses'); },
    async listMoves(limit = 300) { load(); return clone((db.moves || []).slice().reverse().slice(0, limit)); },

    async getCustomer(phone) { load(); return clone(db.customers[phone] || null); },
    async saveCustomer(c) { load(); db.customers[c.phone] = { ...(db.customers[c.phone] || {}), ...c }; notify('customers'); return clone(db.customers[c.phone]); },
    async listCustomers(search) {
      load();
      const s = (search || '').toLowerCase();
      return clone(Object.values(db.customers)
        .filter((c) => !s || c.phone.includes(s) || (c.name || '').toLowerCase().includes(s))
        .sort((a, b) => String(b.last_visit || '').localeCompare(String(a.last_visit || ''))));
    },
    subscribe(cb) {
      listeners.add(cb);
      setTimeout(() => cb('status', 'SUBSCRIBED'), 0);
      return () => listeners.delete(cb);
    },
    resetDemo() { db = fresh(); save(); bc?.postMessage('orders'); }
  };
}
