// Live backend: Supabase (logins + database + real-time sync).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export function createSupabaseApi(url, key) {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

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
      return must(await sb.from('orders').select('*').gte('created_at', fromIso).lt('created_at', toIso).order('created_at', { ascending: false }).limit(5000));
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
    async getOrder(id) { return must(await sb.from('orders').select('*').eq('id', id).maybeSingle()); },

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
        .subscribe((status) => cb('status', status));
      return () => sb.removeChannel(ch);
    }
  };
}
