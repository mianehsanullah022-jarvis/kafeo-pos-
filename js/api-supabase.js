// Live backend: Supabase (logins + database + real-time sync).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export function createSupabaseApi(url, key) {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  // The database sends at most 1,000 rows per request, so long date ranges are fetched in pages.
  async function allPages(build, cap) {
    const out = [];
    for (let from = 0; from < cap; from += 1000) {
      const page = must(await build().range(from, Math.min(from + 999, cap - 1)));
      out.push(...page);
      if (page.length < 1000) break;
    }
    return out;
  }

  async function profileFor(user) {
    if (!user) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    return data;
  }

  return {
    demo: false,

    async session() {
      const { data } = await sb.auth.getSession();
      const user = data.session?.user || null;
      if (!user) return null;
      const profile = await profileFor(user);
      return { user, profile };
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or password' : error.message);
      const profile = await profileFor(data.user);
      return { user: data.user, profile };
    },
    async signOut() { await sb.auth.signOut(); },
    async changePassword(pw) { must(await sb.auth.updateUser({ password: pw })); },

    async loadMenu() {
      const categories = must(await sb.from('menu_categories').select('*').order('sort'));
      const items = must(await sb.from('menu_items').select('*').order('sort'));
      return { categories, items };
    },
    async saveMenuItem(item) { return must(await sb.from('menu_items').upsert(item).select().single()); },
    // Upload a (already resized) photo for a menu item; returns its public link.
    async uploadImage(blob, itemId) {
      const path = `${itemId}-${Date.now()}.jpg`;
      const { error } = await sb.storage.from('menu').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error(/bucket|not found/i.test(error.message) ? 'Photo storage isn’t set up yet — run supabase/migrations/003_menu_photos.sql' : error.message);
      return sb.storage.from('menu').getPublicUrl(path).data.publicUrl;
    },

    async loadSettings() { return must(await sb.from('settings').select('data').eq('id', 1).single()).data; },
    async saveSettings(data) { must(await sb.from('settings').upsert({ id: 1, data, updated_at: new Date().toISOString() })); },

    async listRiders() { return must(await sb.from('riders').select('*').order('name')); },
    async saveRider(r) { return must(await sb.from('riders').upsert(r).select().single()); },
    async listStaff() { return must(await sb.from('profiles').select('*').order('name')); },

    async createOrder(o) { return must(await sb.from('orders').insert(o).select().single()); },
    async updateOrder(id, patch) { return must(await sb.from('orders').update(patch).eq('id', id).select().single()); },
    async ordersBetween(fromIso, toIso) {
      return allPages(() => sb.from('orders').select('*').gte('created_at', fromIso).lt('created_at', toIso).order('created_at', { ascending: false }).order('id', { ascending: false }), 50000);
    },
    async payLaterOrders() {
      // Every unpaid "Pay later" order, however old.
      return allPages(() => sb.from('orders').select('*').eq('payment', 'Pay later').eq('paid', false).neq('status', 'cancelled').order('created_at', { ascending: true }).order('id', { ascending: true }), 50000);
    },
    async openOrders() {
      // Anything not finished, plus unpaid bills, from the last 3 days.
      const since = new Date(Date.now() - 3 * 864e5).toISOString();
      return must(await sb.from('orders').select('*').gte('created_at', since)
        .or('status.in.(new,preparing,ready,out),and(paid.eq.false,status.neq.cancelled)')
        .order('created_at', { ascending: true }));
    },
    async ordersForPhone(phone) {
      return must(await sb.from('orders').select('*').eq('customer_phone', phone).order('created_at', { ascending: false }).limit(20));
    },
    // Website orders: change only if still waiting, so two counters can't both accept one.
    async updateIfPending(id, patch) {
      return must(await sb.from('orders').update(patch).eq('id', id).eq('status', 'pending').select().maybeSingle());
    },
    async deleteOrder(id) {
      const rows = must(await sb.from('orders').delete().eq('id', id).select('id'));
      if (!rows.length) throw new Error('Only the owner can delete orders');
    },
    async getOrder(id) { return must(await sb.from('orders').select('*').eq('id', id).maybeSingle()); },

    // ---- inventory ----
    async listStock() { return must(await sb.from('stock_items').select('*').order('category').order('name')); },
    async saveStockItem(it) { return must(await sb.from('stock_items').upsert(it).select().single()); },
    async addStockItems(rows) { return must(await sb.from('stock_items').insert(rows).select()); },
    async upsertStockItems(rows) { return rows.length ? must(await sb.from('stock_items').upsert(rows).select()) : []; },
    async deleteStockItems(ids) { if (ids.length) must(await sb.from('stock_items').delete().in('id', ids)); },
    async replaceAllRecipes(rows) {
      must(await sb.from('recipes').delete().gt('id', 0));
      for (let i = 0; i < rows.length; i += 500) must(await sb.from('recipes').insert(rows.slice(i, i + 500)));
    },
    async listRecipes() { return must(await sb.from('recipes').select('*')); },
    async saveRecipe(menuItemId, optionKey, rows) {
      must(await sb.from('recipes').delete().eq('menu_item_id', menuItemId).eq('option_key', optionKey));
      if (rows.length) must(await sb.from('recipes').insert(rows.map((r) => ({ menu_item_id: menuItemId, option_key: optionKey, stock_item_id: r.stock_item_id, qty: r.qty }))));
    },
    async addMoves(moves) { if (moves.length) must(await sb.from('stock_moves').insert(moves)); },
    async movesBetween(fromIso, toIso) {
      return allPages(() => sb.from('stock_moves').select('*').gte('created_at', fromIso).lt('created_at', toIso).order('created_at', { ascending: true }).order('id', { ascending: true }), 100000);
    },
    // ---- expenses ----
    async expensesBetween(fromIso, toIso) {
      // Real (paid) expenses only — "Pay later" bills are kept out of every total until marked paid.
      return allPages(() => sb.from('expenses').select('*').neq('method', 'Pay later').gte('created_at', fromIso).lt('created_at', toIso).order('created_at', { ascending: true }).order('id', { ascending: true }), 50000);
    },
    async payLaterExpenses() {
      return allPages(() => sb.from('expenses').select('*').eq('method', 'Pay later').order('created_at', { ascending: true }).order('id', { ascending: true }), 50000);
    },
    async addExpense(e) { return must(await sb.from('expenses').insert(e).select().single()); },
    async updateExpense(id, patch) { return must(await sb.from('expenses').update(patch).eq('id', id).select().single()); },
    async deleteExpense(id) { must(await sb.from('expenses').delete().eq('id', id)); },
    // ---- shift closing ----
    async listClosings(limit = 60) { return must(await sb.from('shift_closings').select('*').order('shift_to', { ascending: false }).limit(limit)); },
    async addClosing(c) { return must(await sb.from('shift_closings').insert(c).select().single()); },
    async deleteClosing(id) { must(await sb.from('shift_closings').delete().eq('id', id)); },
    async listMoves(limit = 300) { return must(await sb.from('stock_moves').select('*').order('created_at', { ascending: false }).limit(limit)); },

    async getCustomer(phone) { return must(await sb.from('customers').select('*').eq('phone', phone).maybeSingle()); },
    async saveCustomer(c) { return must(await sb.from('customers').upsert(c).select().single()); },
    async listCustomers(search) {
      let q = sb.from('customers').select('*').order('last_visit', { ascending: false, nullsFirst: false }).limit(200);
      if (search) {
        const s = search.replace(/[%,()]/g, '');
        q = q.or(`phone.ilike.%${s}%,name.ilike.%${s}%`);
      }
      return must(await q);
    },

    // cb(kind) — kind: 'orders' | 'menu' | 'settings'
    subscribe(cb) {
      const ch = sb.channel('kafeo-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (p) => cb('orders', p.new || p.old))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => cb('menu'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => cb('settings'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => cb('stock'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => cb('expenses'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_closings' }, () => cb('closings'))
        .subscribe((status) => cb('status', status));
      return () => sb.removeChannel(ch);
    }
  };
}
