// KAFEO POS · web-order
// Receives an order from the KAFEO website and puts it on the POS as a
// "pending" website order. A cashier accepts it on the POS before it goes to the kitchen.
//
// Public endpoint (the website has no login), so it: checks every field, re-checks
// prices against the website menu (catalog.js), never trusts the total sent by the
// browser, limits how many orders one phone / connection can send, and ignores
// repeats of the same order (same web reference).
//
// Optional WhatsApp alert to the owner via CallMeBot — set these secrets to switch it on:
//   CALLMEBOT_PHONE   e.g. 923042077720
//   CALLMEBOT_APIKEY  the key CallMeBot sends you on WhatsApp
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildItems } from './catalog.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Max-Age': '86400'
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const TYPES: Record<string, string> = { Delivery: 'deliv', Takeaway: 'take', 'Dine-in': 'dine', deliv: 'deliv', take: 'take', dine: 'dine' };
// Website launch offer: 10% off EVERY website order (delivery, takeaway, dine-in),
// from 1 Nov 2026 00:00 Pakistan time. The server decides — never the browser.
// Keep in step with WEB_PROMO in kafeo-website/index.html.
const WEB_PROMO = { start: Date.parse('2026-11-01T00:00:00+05:00'), pct: 10, reason: 'Website order 10%' };
const webPromoOn = (now = Date.now()) => now >= WEB_PROMO.start;
const LIMIT_WINDOW_MIN = 15;
const LIMIT_PER_PHONE = 4;
const LIMIT_PER_IP = 10;

const str = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
function cleanPhone(raw: unknown) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(2);
  if (d.startsWith('92') && d.length === 12) d = '0' + d.slice(2);
  if (d.length === 10 && d.startsWith('3')) d = '0' + d;
  return d;
}
async function sha(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' });

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 30000) return json(413, { ok: false, error: 'Order too large' });
    body = JSON.parse(text);
  } catch { return json(400, { ok: false, error: 'Bad request' }); }

  // Bots fill every field; people never see this one.
  if (str(body.website, 50)) return json(200, { ok: true, id: null });

  const ref = str(body.ref, 24).toUpperCase();
  if (!/^KF-[A-Z0-9]{4,16}$/.test(ref)) return json(400, { ok: false, error: 'Missing order reference' });
  const type = TYPES[str(body.type, 20)];
  if (!type) return json(400, { ok: false, error: 'Choose delivery, takeaway or dine-in' });
  const phone = cleanPhone(body.phone);
  if (!/^03\d{9}$/.test(phone)) return json(400, { ok: false, error: 'Please enter a valid mobile number, like 0300 1234567' });
  const name = str(body.name, 60);
  const address = str(body.address, 300);
  const note = str(body.note, 500);
  const payPref = str(body.payment, 60);
  const deliveryNote = str(body.delivery, 120);
  const g = (body.geo || {}) as Record<string, unknown>;
  const lat = Number(g.lat), lng = Number(g.lng);
  const geo = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng, link: `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}` } : null;
  const km = Number(body.distance_km);
  if (type === 'deliv' && !address && !geo) return json(400, { ok: false, error: 'Delivery needs an address' });

  const raw = Array.isArray(body.items) ? body.items : [];
  if (!raw.length) return json(400, { ok: false, error: 'Your order is empty' });
  if (raw.length > 40) return json(400, { ok: false, error: 'Too many different items — please call us' });
  const lines = [];
  for (const it of raw as Record<string, unknown>[]) {
    const qty = Number(it?.qty), price = Number(it?.price);
    const nm = str(it?.name, 200);
    if (!nm || !Number.isInteger(qty) || qty < 1 || qty > 99 || !Number.isFinite(price) || price < 0 || price > 100000) {
      return json(400, { ok: false, error: 'Something in the order looks wrong — please refresh and try again' });
    }
    lines.push({ name: nm, qty, price: Math.round(price) });
  }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Same order sent twice (weak signal / retry)? Return the one we already have.
  const dup = await sb.from('orders').select('id,status').eq('meta->>web_ref', ref).maybeSingle();
  if (dup.data) return json(200, { ok: true, id: dup.data.id, ref, duplicate: true });

  // Anti-spam limits.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ipHash = await sha('kafeo|' + ip);
  const since = new Date(Date.now() - LIMIT_WINDOW_MIN * 60000).toISOString();
  const [byPhone, byIp] = await Promise.all([
    sb.from('orders').select('id', { count: 'exact', head: true }).eq('meta->>source', 'website').eq('customer_phone', phone).gte('created_at', since),
    sb.from('orders').select('id', { count: 'exact', head: true }).eq('meta->>source', 'website').eq('meta->>ip', ipHash).gte('created_at', since)
  ]);
  if ((byPhone.count ?? 0) >= LIMIT_PER_PHONE || (byIp.count ?? 0) >= LIMIT_PER_IP) {
    return json(429, { ok: false, error: 'You have sent a few orders already — please WhatsApp or call us on 0304 2077720' });
  }

  const menuRes = await sb.from('menu_items').select('id,name,station,counts,active');
  if (menuRes.error) return json(500, { ok: false, error: 'Could not reach the menu' });
  const menu = new Map(menuRes.data.map((m) => [m.id, m]));
  const { items, subtotal, flags } = buildItems(lines, menu);

  const clientTotal = Number(body.total);
  if (Number.isFinite(clientTotal) && Math.round(clientTotal) !== subtotal) flags.push(`Website showed total Rs ${Math.round(clientTotal)}, items add up to Rs ${subtotal}`);

  // Same rounding as the POS (computeBill: Math.round of the % of the subtotal).
  const promo = webPromoOn();
  const discount = promo ? Math.round(subtotal * WEB_PROMO.pct / 100) : 0;
  const discMeta = promo ? { scope: 'bill', type: 'pct', value: WEB_PROMO.pct, reason: WEB_PROMO.reason, bank: '' } : null;
  const clientDisc = Number(body.discount);
  if (Number.isFinite(clientDisc) && Math.round(clientDisc) !== discount) flags.push(`Website showed discount Rs ${Math.round(clientDisc)}, POS discount is Rs ${discount}`);

  const row = {
    type, table_no: '', customer_phone: phone, customer_name: name, address: type === 'deliv' ? address : '',
    items, notes: note, subtotal, discount, discount_label: promo ? WEB_PROMO.reason : '', tax: 0, tax_rate: 0, service_charge: 0,
    delivery_fee: 0, round_off: 0, total: subtotal - discount, payment: '', paid: false, status: 'pending', reward: '',
    created_by: null,
    meta: {
      source: 'website', web_ref: ref, by: 'Website', discount: discMeta, serviceOn: false, inclusive: false,
      pay_pref: payPref, delivery_note: type === 'deliv' ? deliveryNote : '', geo: type === 'deliv' ? geo : null,
      distance_km: type === 'deliv' && Number.isFinite(km) && km >= 0 && km < 100 ? Math.round(km * 10) / 10 : null,
      flags, ip: ipHash, placed_at: new Date().toISOString()
    }
  };
  const ins = await sb.from('orders').insert(row).select('id').single();
  if (ins.error) {
    if (ins.error.code === '23505') { // raced with a retry of the same order
      const again = await sb.from('orders').select('id').eq('meta->>web_ref', ref).maybeSingle();
      if (again.data) return json(200, { ok: true, id: again.data.id, ref, duplicate: true });
    }
    console.error('insert failed', ins.error.message);
    return json(500, { ok: false, error: 'Could not save the order' });
  }

  // Optional WhatsApp alert to the owner (only if the secrets are set).
  const waPhone = Deno.env.get('CALLMEBOT_PHONE'), waKey = Deno.env.get('CALLMEBOT_APIKEY');
  if (waPhone && waKey) {
    const label = { deliv: 'Delivery', take: 'Takeaway', dine: 'Dine-in' }[type];
    const text = `🔔 New website order #${ins.data.id} (${ref})\n${label} · Rs ${(subtotal - discount).toLocaleString('en-US')}${discount ? ` (10% off Rs ${subtotal.toLocaleString('en-US')})` : ''}\n` +
      lines.map((l) => `${l.qty}× ${l.name}`).join('\n') +
      `\n${name || 'Customer'} · ${phone}` + (type === 'deliv' && address ? `\n${address}` : '') + (geo ? `\n${geo.link}` : '') +
      (note ? `\nNote: ${note}` : '') + (flags.length ? `\n⚠️ Check on POS: ${flags.length} warning(s)` : '') + '\nAccept it on the POS.';
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(waPhone)}&text=${encodeURIComponent(text.slice(0, 1500))}&apikey=${encodeURIComponent(waKey)}`;
    const p = fetch(url).then((r) => r.text()).catch((e) => console.error('whatsapp alert failed', e));
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(p);
  }

  return json(200, { ok: true, id: ins.data.id, ref, discount, total: subtotal - discount, warnings: flags.length });
});
