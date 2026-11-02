// KAFEO POS · wa-bot
// The KAFEO WhatsApp bot. Meta (WhatsApp Cloud API) sends every customer message here;
// the bot answers with Claude, using the live POS menu and prices.
//
//  • Orders go on the POS as 'pending' (like website orders). A cashier taps Accept.
//  • When the order status changes on the POS, the database pings this function
//    (see migration 010) and the customer gets a WhatsApp update.
//  • If a staff member replies from the WhatsApp Business app on the café phone,
//    the bot stays quiet in that chat for 2 hours.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   WA_TOKEN            WhatsApp Cloud API access token (permanent System User token)
//   WA_PHONE_ID         Phone number ID of 0304 2077720 in Meta
//   WA_VERIFY_TOKEN     any word you choose; type the same in Meta's webhook setup
//   WA_APP_SECRET       Meta app secret (checks every message really comes from Meta)
//   ANTHROPIC_API_KEY   Claude API key
// Optional:
//   WA_BOT_OFF=1        switch the bot off without deleting anything
//   CALLMEBOT_PHONE / CALLMEBOT_APIKEY   alert to the owner's personal WhatsApp (same as web-order)
//   WA_TEST_KEY         lets you test the bot without WhatsApp: POST {"test":true,"phone":"03001234567","text":"menu"}
//                       with header x-test-key: <WA_TEST_KEY> → returns the reply as JSON
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  CAFE, TOOLS, menuText, priceItems, deliveryCheck, openNow, checkBooking, localPhone, systemPrompt, statusMessage, visibleMenu
} from './brain.js';

const env = (k: string) => Deno.env.get(k) || '';
const GRAPH = `https://graph.facebook.com/${env('WA_GRAPH_VERSION') || 'v23.0'}`;
const MODEL = env('WA_MODEL') || 'claude-haiku-5-5';
const HISTORY = 20;                 // messages of memory per chat (last 24 h)
const PAUSE_MIN = 120;              // quiet time after staff take over
const MAX_MSGS_PER_HOUR = 40;       // per customer — keeps AI costs safe
const MAX_ORDERS_PER_30MIN = 3;

const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const ok = (body: unknown = { ok: true }, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
// deno-lint-ignore no-explicit-any
const later = (p: Promise<unknown>) => (globalThis as any).EdgeRuntime?.waitUntil?.(p) ?? p;

// ---------- WhatsApp send ----------
async function waSend(to: string, text: string) {
  const body = text.length > 4000 ? text.slice(0, 3990) + '…' : text;
  const r = await fetch(`${GRAPH}/${env('WA_PHONE_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('WA_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body } })
  });
  if (!r.ok) console.error('whatsapp send failed', r.status, (await r.text()).slice(0, 500));
  return r.ok;
}
function waRead(messageId: string) {   // blue ticks + "typing…" while the bot thinks
  return fetch(`${GRAPH}/${env('WA_PHONE_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('WA_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } })
  }).catch(() => {});
}
function ownerAlert(text: string) {
  const phone = env('CALLMEBOT_PHONE'), key = env('CALLMEBOT_APIKEY');
  if (!phone || !key) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text.slice(0, 1500))}&apikey=${encodeURIComponent(key)}`;
  later(fetch(url).then((r) => r.text()).catch((e) => console.error('owner alert failed', e)));
}

// ---------- security ----------
async function validSignature(raw: string, header: string | null) {
  const secret = env('WA_APP_SECRET');
  if (!secret || !header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  const got = header.slice(7);
  if (got.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

// ---------- menu (cached for 2 minutes) ----------
// deno-lint-ignore no-explicit-any
let menuCache: { at: number; text: string; map: Map<string, any> } | null = null;
async function getMenu() {
  if (menuCache && Date.now() - menuCache.at < 120000) return menuCache;
  const [items, cats] = await Promise.all([
    sb.from('menu_items').select('id,category_id,name,note,options,station,counts,active,sort'),
    sb.from('menu_categories').select('id,label,sort')
  ]);
  if (items.error || cats.error) throw new Error('menu load failed');
  menuCache = { at: Date.now(), text: menuText(items.data, cats.data), map: new Map(visibleMenu(items.data).map((m) => [m.id, m])) };
  return menuCache;
}

// ---------- the tools the AI can call ----------
type Ctx = { phone: string; waId: string; name: string; geo: null | { lat: number; lng: number; link: string } };
// deno-lint-ignore no-explicit-any
async function runTool(name: string, input: any, ctx: Ctx): Promise<string> {
  const menu = await getMenu();
  if (name === 'make_bill') {
    const b = priceItems(input.items, menu.map);
    const parts = [];
    if (b.errors.length) parts.push('PROBLEMS (fix with the customer first):\n' + b.errors.join('\n'));
    if (b.items.length) parts.push('BILL:\n' + b.summary);
    if (input.order_type === 'delivery' && b.items.length) {
      const d = deliveryCheck(b.subtotal);
      parts.push(d.ok ? d.fee_text : 'DELIVERY NOT POSSIBLE: ' + d.problem);
    }
    return parts.join('\n\n') || 'Empty order';
  }

  if (name === 'place_order') {
    if (!openNow()) return `NOT PLACED: the café is closed. Hours: ${CAFE.hoursText}.`;
    if (input.customer_confirmed !== true) return 'NOT PLACED: show the bill and get a clear yes first.';
    const type = { delivery: 'deliv', takeaway: 'take', dine_in: 'dine' }[input.order_type as string];
    if (!type) return 'NOT PLACED: order_type must be delivery, takeaway or dine_in.';
    const b = priceItems(input.items, menu.map);
    if (b.errors.length || !b.items.length) return 'NOT PLACED:\n' + (b.errors.join('\n') || 'No items');
    const address = String(input.address || '').trim().slice(0, 300);
    if (type === 'deliv') {
      const d = deliveryCheck(b.subtotal);
      if (!d.ok) return 'NOT PLACED: ' + d.problem;
      if (!address && !ctx.geo) return 'NOT PLACED: delivery needs the full address (or a location pin).';
    }
    const since = new Date(Date.now() - 30 * 60000).toISOString();
    const recent = await sb.from('orders').select('id', { count: 'exact', head: true })
      .eq('meta->>source', 'whatsapp').eq('customer_phone', ctx.phone).gte('created_at', since);
    if ((recent.count ?? 0) >= MAX_ORDERS_PER_30MIN) return 'NOT PLACED: too many orders from this number in 30 minutes — use call_staff.';

    const ref = 'WA-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const custName = String(input.customer_name || ctx.name || '').trim().slice(0, 60);
    const pay = input.payment === 'jazzcash' ? 'JazzCash' : 'Cash';
    const row = {
      type, table_no: '', customer_phone: ctx.phone, customer_name: custName, address: type === 'deliv' ? address : '',
      items: b.items, notes: String(input.notes || '').trim().slice(0, 500),
      subtotal: b.subtotal, discount: 0, discount_label: '', tax: 0, tax_rate: 0, service_charge: 0,
      delivery_fee: 0, round_off: 0, total: b.subtotal, payment: '', paid: false, status: 'pending', reward: '', created_by: null,
      meta: {
        source: 'whatsapp', web_ref: ref, by: 'WhatsApp bot', discount: null, serviceOn: false, inclusive: false,
        pay_pref: pay, delivery_note: '', geo: type === 'deliv' ? ctx.geo : null, distance_km: null, flags: [],
        wa_id: ctx.waId, placed_at: new Date().toISOString()
      }
    };
    const ins = await sb.from('orders').insert(row).select('id').single();
    if (ins.error) { console.error('order insert failed', ins.error.message); return 'NOT PLACED: system error — use call_staff.'; }
    // Save the name for next time.
    if (custName) await sb.from('wa_contacts').update({ name: custName }).eq('phone', ctx.phone);
    ownerAlert(`🟢 New WhatsApp order #${ins.data.id} (${ref})\n${input.order_type} · Rs ${b.subtotal.toLocaleString('en-US')} · ${pay}\n${b.summary}\n${custName} · ${ctx.phone}` +
      (type === 'deliv' ? `\n${address}${ctx.geo ? '\n' + ctx.geo.link : ''}` : '') + '\nAccept it on the POS.');
    return `PLACED. Order number #${ins.data.id}. Subtotal Rs ${b.subtotal.toLocaleString('en-US')}. ` +
      `Tell the customer the café will confirm in a few minutes and they'll get a WhatsApp message when it's accepted.`;
  }

  if (name === 'book_table') {
    const c = checkBooking({ day: input.date, time: input.time, people: input.people });
    if (!c.ok) return 'NOT BOOKED:\n' + c.problems.join('\n');
    const ins = await sb.from('bookings').insert({
      source: 'whatsapp', phone: ctx.phone, name: String(input.name || '').slice(0, 60), day: input.date, time: input.time,
      people: input.people, area: String(input.area || '').slice(0, 80), notes: String(input.notes || '').slice(0, 300)
    }).select('id').single();
    if (ins.error) { console.error('booking insert failed', ins.error.message); return 'NOT BOOKED: system error — use call_staff.'; }
    ownerAlert(`📅 New table booking #${ins.data.id}\n${input.name} · ${input.people} people\n${c.label}${input.area ? ' · ' + input.area : ''}${input.notes ? '\n' + input.notes : ''}\n${ctx.phone}\nPlease confirm with the customer.`);
    return `SAVED as booking request #${ins.data.id} for ${c.label}, ${input.people} people. Tell the customer the team will confirm it on WhatsApp.`;
  }

  if (name === 'my_orders') {
    const [ords, cust] = await Promise.all([
      sb.from('orders').select('id,created_at,status,total,type').eq('customer_phone', ctx.phone).order('created_at', { ascending: false }).limit(3),
      sb.from('customers').select('name,stamps,visits').eq('phone', ctx.phone).maybeSingle()
    ]);
    const word: Record<string, string> = { pending: 'waiting for the café to accept', new: 'accepted, in the kitchen', preparing: 'being prepared', ready: 'ready', out: 'out for delivery', done: 'completed', cancelled: 'cancelled' };
    const lines = (ords.data || []).map((o) => `#${o.id} · ${new Date(o.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' })} · Rs ${Number(o.total).toLocaleString('en-US')} · ${word[o.status] || o.status}`);
    return (lines.length ? 'Recent orders:\n' + lines.join('\n') : 'No orders found for this number.') +
      (cust.data ? `\nLoyalty stamps: ${cust.data.stamps}/5, visits: ${cust.data.visits}.` : '\nNo loyalty card on this number yet.');
  }

  if (name === 'call_staff') {
    await sb.from('wa_contacts').update({ paused_until: new Date(Date.now() + PAUSE_MIN * 60000).toISOString() }).eq('phone', ctx.phone);
    ownerAlert(`🙋 Customer needs a person on WhatsApp\n${ctx.name || 'Customer'} · ${ctx.phone}\nReason: ${String(input.reason || '').slice(0, 300)}\nReply from the KAFEO WhatsApp app.`);
    return 'Done — the team has been told and the bot is now quiet in this chat. Tell the customer a team member will reply soon.';
  }
  return 'Unknown tool';
}

// ---------- ask Claude ----------
// deno-lint-ignore no-explicit-any
async function claude(system: string, messages: any[]) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 900, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], tools: TOOLS, messages })
  });
  if (!r.ok) throw new Error(`claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return await r.json();
}

async function think(ctx: Ctx, userText: string): Promise<string> {
  const menu = await getMenu();
  const cust = await sb.from('customers').select('name,stamps').eq('phone', ctx.phone).maybeSingle();
  const system = systemPrompt({ menu: menu.text, customer: { name: ctx.name || cust.data?.name || '', stamps: cust.data?.stamps ?? null } });

  // Chat memory: last messages from the last 24 hours.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const hist = await sb.from('wa_messages').select('role,body').eq('phone', ctx.phone).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(HISTORY + 1);
  const past = (hist.data || []).reverse();
  if (past.length && past[past.length - 1].role === 'user' && past[past.length - 1].body === userText) past.pop(); // the message we just saved
  // deno-lint-ignore no-explicit-any
  const messages: any[] = [];
  for (const m of past) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    const body = m.role === 'staff' ? `[KAFEO team member wrote]: ${m.body}` : m.body;
    if (messages.length && messages[messages.length - 1].role === role) messages[messages.length - 1].content += '\n' + body;
    else messages.push({ role, content: body });
  }
  if (messages.length && messages[0].role !== 'user') messages.shift();
  if (messages.length && messages[messages.length - 1].role === 'user') messages[messages.length - 1].content += '\n' + userText;
  else messages.push({ role: 'user', content: userText });

  for (let round = 0; round < 5; round++) {
    const res = await claude(system, messages);
    // deno-lint-ignore no-explicit-any
    const uses = res.content.filter((c: any) => c.type === 'tool_use');
    // deno-lint-ignore no-explicit-any
    const text = res.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim();
    if (!uses.length) return text;
    messages.push({ role: 'assistant', content: res.content });
    const results = [];
    for (const u of uses) {
      let out: string;
      try { out = await runTool(u.name, u.input || {}, ctx); } catch (e) { console.error('tool failed', u.name, e); out = 'System error — use call_staff.'; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: out });
    }
    messages.push({ role: 'user', content: results });
  }
  return 'Sorry, something went wrong on our side. A team member will reply soon 🙏';
}

// ---------- one incoming customer message ----------
// deno-lint-ignore no-explicit-any
function readMessage(msg: any): { text: string; geo: Ctx['geo'] } {
  switch (msg.type) {
    case 'text': return { text: String(msg.text?.body || ''), geo: null };
    case 'location': {
      const lat = Number(msg.location?.latitude), lng = Number(msg.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { text: '[sent a location]', geo: null };
      const link = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
      const label = [msg.location?.name, msg.location?.address].filter(Boolean).join(', ');
      return { text: `[Sent a location pin for delivery${label ? ': ' + label : ''} — ${link}]`, geo: { lat, lng, link } };
    }
    case 'button': return { text: String(msg.button?.text || ''), geo: null };
    case 'interactive': return { text: String(msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || ''), geo: null };
    case 'audio': return { text: '[sent a voice note — the bot cannot listen to voice notes]', geo: null };
    case 'image': return { text: `[sent a picture${msg.image?.caption ? ' with caption: ' + msg.image.caption : ''} — the bot cannot see pictures]`, geo: null };
    default: return { text: `[sent a ${msg.type} message the bot cannot read]`, geo: null };
  }
}

// deno-lint-ignore no-explicit-any
async function handleIncoming(msg: any, profileName: string, test = false): Promise<string | null> {
  const waId = String(msg.from || '');
  const phone = localPhone(waId);
  const { text, geo } = readMessage(msg);
  if (!text.trim()) return null;

  // Save the message (the unique wamid stops Meta's retries from getting two answers).
  if (msg.id) {
    const ins = await sb.from('wa_messages').insert({ phone, role: 'user', body: text.slice(0, 2000), wamid: msg.id });
    if (ins.error) { if (ins.error.code === '23505') return null; console.error('save msg failed', ins.error.message); }
  } else {
    await sb.from('wa_messages').insert({ phone, role: 'user', body: text.slice(0, 2000) });
  }
  const contact = await sb.from('wa_contacts').upsert({ phone, wa_id: waId, last_in: new Date().toISOString() }, { onConflict: 'phone' })
    .select('name,paused_until').single();
  const name = contact.data?.name || String(profileName || '').slice(0, 60);
  if (!contact.data?.name && profileName) await sb.from('wa_contacts').update({ name }).eq('phone', phone);

  // Staff are handling this chat → stay quiet.
  if (contact.data?.paused_until && new Date(contact.data.paused_until) > new Date()) return null;

  // Cost guard.
  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const cnt = await sb.from('wa_messages').select('id', { count: 'exact', head: true }).eq('phone', phone).eq('role', 'user').gte('created_at', hourAgo);
  if ((cnt.count ?? 0) > MAX_MSGS_PER_HOUR) return null;

  if (!test && msg.id) later(waRead(msg.id));
  let reply: string;
  try {
    reply = await think({ phone, waId, name, geo }, text);
  } catch (e) {
    console.error('think failed', e);
    reply = `Sorry, our assistant is having a problem right now. Please call ${CAFE.phone} or a team member will reply here soon 🙏`;
    ownerAlert(`⚠️ WhatsApp bot error for ${phone}. Please reply to this customer from the KAFEO WhatsApp app.`);
  }
  if (!reply) return null;
  await sb.from('wa_messages').insert({ phone, role: 'assistant', body: reply.slice(0, 4000) });
  if (!test) await waSend(waId, reply);
  return reply;
}

// ---------- order status → customer ----------
async function handleNotify(orderId: number) {
  const o = await sb.from('orders').select('id,status,type,total,delivery_fee,meta').eq('id', orderId).maybeSingle();
  if (!o.data || o.data.meta?.source !== 'whatsapp' || !o.data.meta?.wa_id) return;
  const sent: string[] = o.data.meta.wa_sent || [];
  if (sent.includes(o.data.status)) return;
  const text = statusMessage(o.data);
  if (!text) return;
  if (await waSend(o.data.meta.wa_id, text)) {
    await sb.from('orders').update({ meta: { ...o.data.meta, wa_sent: [...sent, o.data.status] } }).eq('id', orderId);
    await sb.from('wa_messages').insert({ phone: localPhone(o.data.meta.wa_id), role: 'assistant', body: text });
  }
}

// ---------- the web endpoint ----------
Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Meta checks the webhook once when you set it up.
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.mode') === 'subscribe' && env('WA_VERIFY_TOKEN') && url.searchParams.get('hub.verify_token') === env('WA_VERIFY_TOKEN')) {
      return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
    }
    return new Response('KAFEO WhatsApp bot', { status: 200 });
  }
  if (req.method !== 'POST') return ok({ ok: false }, 405);
  const raw = await req.text();
  if (raw.length > 200000) return ok({ ok: false }, 413);

  // 1) Order status ping from the database.
  const notifyKey = req.headers.get('x-kafeo-notify');
  if (notifyKey) {
    const cfg = await sb.from('wa_config').select('notify_secret').eq('id', 1).single();
    if (!cfg.data || cfg.data.notify_secret !== notifyKey) return ok({ ok: false }, 401);
    try { const b = JSON.parse(raw); await handleNotify(Number(b.notify)); } catch (e) { console.error('notify failed', e); }
    return ok();
  }

  // 2) Test without WhatsApp.
  const testKey = req.headers.get('x-test-key');
  if (testKey) {
    if (!env('WA_TEST_KEY') || testKey !== env('WA_TEST_KEY')) return ok({ ok: false }, 401);
    const b = JSON.parse(raw);
    const wa = '92' + String(b.phone || '03000000000').replace(/\D/g, '').replace(/^0/, '');
    const reply = await handleIncoming({ from: wa, type: b.type || 'text', text: { body: String(b.text || '') }, location: b.location }, String(b.name || ''), true);
    return ok({ ok: true, reply });
  }

  // 3) Real WhatsApp messages from Meta.
  if (!(await validSignature(raw, req.headers.get('x-hub-signature-256')))) return ok({ ok: false }, 401);
  if (env('WA_BOT_OFF') === '1') return ok();
  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = JSON.parse(raw); } catch { return ok(); }

  const jobs: Promise<unknown>[] = [];
  for (const entry of body.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      if (ch.field === 'messages') {
        if (v.metadata?.phone_number_id && env('WA_PHONE_ID') && v.metadata.phone_number_id !== env('WA_PHONE_ID')) continue;
        const names = new Map((v.contacts || []).map((c: { wa_id: string; profile?: { name?: string } }) => [c.wa_id, c.profile?.name || '']));
        for (const m of v.messages || []) jobs.push(handleIncoming(m, String(names.get(m.from) || '')).catch((e) => console.error('message failed', e)));
      }
      // A team member replied from the WhatsApp Business app → the bot steps back for 2 hours.
      if (ch.field === 'smb_message_echoes') {
        for (const m of v.message_echoes || []) {
          const phone = localPhone(m.to);
          const txt = m.type === 'text' ? String(m.text?.body || '') : `[${m.type}]`;
          jobs.push((async () => {
            await sb.from('wa_contacts').upsert({ phone, wa_id: String(m.to || ''), paused_until: new Date(Date.now() + PAUSE_MIN * 60000).toISOString() }, { onConflict: 'phone' });
            await sb.from('wa_messages').insert({ phone, role: 'staff', body: txt.slice(0, 2000), wamid: m.id || null });
          })().catch((e) => console.error('echo failed', e)));
        }
      }
    }
  }
  // Answer Meta at once; keep working in the background.
  later(Promise.all(jobs));
  return ok();
});
