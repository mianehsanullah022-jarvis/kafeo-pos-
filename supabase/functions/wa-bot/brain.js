// KAFEO WhatsApp bot — the plain-logic part (menu text, bills, hours, bookings).
// No network calls here, so the same file runs in the Edge Function (Deno) and in
// the local test (node tools/test-wa-bot.mjs).
//
// Prices ALWAYS come from the POS menu (menu_items). The AI never decides a price.

export const CAFE = {
  name: 'KAFEO Café',
  address: '97-Shadman-1, Shadman Chowk, Jail Road, Lahore',
  phone: '0304 2077720',
  website: 'https://kafeo.com.pk',
  instagram: '@kafeo_official',
  // Opening hours, Pakistan time. Close past midnight = 24+ (e.g. 25 = 1 AM next day).
  hours: { 1: [11, 24], 2: [11, 24], 3: [11, 24], 4: [11, 24], 5: [11, 25], 6: [11, 25], 0: [11, 25] },
  hoursText: 'Mon–Thu 11 AM – 12 AM (midnight), Fri–Sun 11 AM – 1 AM',
  delivery: {
    radiusKm: '5–6 km from Shadman',
    minOrder: 1000,
    freeFrom: 2000
  },
  dealsUntil: '30 December 2026',
  maxQtyPerLine: 30,
  maxLines: 25
};

// Menu rows the bot must never offer (internal POS buttons, not real food).
const HIDE = /charges?/i;
export const visibleMenu = (rows) => rows.filter((m) => m.active !== false && !HIDE.test(m.name));

const num = (n) => Number(n).toLocaleString('en-US');
const SIZE_WORD = { S: 'Small', M: 'Medium', L: 'Large' };

/** The menu as short text lines for the AI: "p1 | Kafeo Special | S 1,100 · M 1,649 · L 2,549". */
export function menuText(rows, cats) {
  const byCat = new Map();
  for (const m of visibleMenu(rows)) {
    if (!byCat.has(m.category_id)) byCat.set(m.category_id, []);
    byCat.get(m.category_id).push(m);
  }
  const order = [...cats].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const out = [];
  for (const c of order) {
    const list = (byCat.get(c.id) || []).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    if (!list.length) continue;
    out.push(`## ${c.label}`);
    for (const m of list) {
      const opts = (m.options || []).map((o) => (o.k ? `${o.k} ${num(o.p)}` : num(o.p))).join(' · ');
      out.push(`${m.id} | ${m.name} | Rs ${opts}${m.note ? ` | ${m.note}` : ''}`);
    }
  }
  return out.join('\n');
}

/**
 * Turn what the AI asked for into POS order lines, using POS prices.
 * want: [{ menu_id, size, qty, note }]
 * menu: Map(id → menu row)
 * Returns { items, subtotal, errors, summary }
 */
export function priceItems(want, menu) {
  const errors = [];
  const items = [];
  if (!Array.isArray(want) || !want.length) return { items, subtotal: 0, errors: ['No items in the order'], summary: '' };
  if (want.length > CAFE.maxLines) errors.push(`Too many lines (max ${CAFE.maxLines}) — ask the customer to call`);
  for (const w of want.slice(0, CAFE.maxLines)) {
    const id = String(w?.menu_id ?? '').trim();
    const m = menu.get(id);
    if (!m || m.active === false || HIDE.test(m.name)) { errors.push(`"${id}" is not on the menu`); continue; }
    const qty = Number(w?.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > CAFE.maxQtyPerLine) { errors.push(`${m.name}: quantity must be 1–${CAFE.maxQtyPerLine}`); continue; }
    const opts = m.options || [];
    let size = String(w?.size ?? '').trim();
    // Accept "Small/Medium/Large", "s", "1.5 l" …
    const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
    let opt = opts.find((o) => norm(o.k) === norm(size)) ||
      opts.find((o) => SIZE_WORD[o.k] && norm(SIZE_WORD[o.k]) === norm(size));
    if (!opt && opts.length === 1) opt = opts[0];
    if (!opt) { errors.push(`${m.name}: choose a size (${opts.map((o) => o.k).join(' / ')})`); continue; }
    const note = String(w?.note ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120);
    items.push({
      id: m.id, opt: opt.k, name: m.name + (opt.k ? ` (${opt.k})` : ''), price: Number(opt.p), qty,
      station: m.station || 'kitchen', counts: m.counts || null, note, disc: null, added: 0
    });
  }
  const subtotal = items.reduce((a, l) => a + l.price * l.qty, 0);
  const summary = items.map((l) => `${l.qty}× ${l.name}${l.note ? ` (${l.note})` : ''} — Rs ${num(l.price * l.qty)}`).join('\n') +
    (items.length ? `\nSubtotal: Rs ${num(subtotal)}` : '');
  return { items, subtotal, errors, summary };
}

/** Delivery rules → { ok, fee_text, problem } */
export function deliveryCheck(subtotal) {
  const d = CAFE.delivery;
  if (subtotal < d.minOrder) return { ok: false, problem: `Minimum order for delivery is Rs ${num(d.minOrder)} (this order is Rs ${num(subtotal)}).` };
  if (subtotal >= d.freeFrom) return { ok: true, fee_text: 'Free delivery (order is Rs 2,000 or more).' };
  return { ok: true, fee_text: 'Delivery charge depends on distance — our team will confirm it before sending.' };
}

/** Pakistan time parts for a Date. */
export function pkParts(date = new Date()) {
  const t = new Date(date.getTime() + 5 * 3600 * 1000);   // PKT = UTC+5, no daylight saving
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay(), h: t.getUTCHours(), mi: t.getUTCMinutes() };
}
const pad = (n) => String(n).padStart(2, '0');
export const pkDateText = (p) => `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Is the café open right now? Handles the after-midnight hours of the day before. */
export function openNow(date = new Date()) {
  const p = pkParts(date);
  const mins = p.h * 60 + p.mi;
  const [o, c] = CAFE.hours[p.dow];
  if (mins >= o * 60 && mins < c * 60) return true;
  const prev = CAFE.hours[(p.dow + 6) % 7];                 // e.g. Saturday 00:30 belongs to Friday night
  return prev[1] > 24 && mins < (prev[1] - 24) * 60;
}

/** Check a booking request. day "YYYY-MM-DD", time "HH:MM" (24h). */
export function checkBooking({ day, time, people }, now = new Date()) {
  const problems = [];
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
  const tm = /^(\d{1,2}):(\d{2})$/.exec(String(time || ''));
  if (!dm) problems.push('Date must look like 2026-11-20');
  if (!tm) problems.push('Time must look like 19:30');
  const n = Number(people);
  if (!Number.isInteger(n) || n < 1 || n > 60) problems.push('People must be 1–60');
  if (problems.length) return { ok: false, problems };
  const h = Number(tm[1]), mi = Number(tm[2]);
  // Booking moment in UTC (PKT − 5h).
  const at = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], h - 5, mi);
  const dow = new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3])).getUTCDay();
  const [o, c] = CAFE.hours[dow];
  const mins = h * 60 + mi;
  // Last booking 1 hour before closing. After-midnight times (00:00–00:59) count for the night before.
  const lateOk = mins < 60 && CAFE.hours[(dow + 6) % 7][1] - 1 > 24 + mins / 60;
  if (!lateOk && !(mins >= o * 60 && mins <= (c - 1) * 60)) problems.push(`We take bookings from 11:00 until 1 hour before closing (${CAFE.hoursText})`);
  if (at < now.getTime() + 30 * 60000) problems.push('That time has passed or is too soon — bookings need at least 30 minutes');
  if (at > now.getTime() + 60 * 86400000) problems.push('We take bookings up to 60 days ahead');
  return problems.length ? { ok: false, problems } : { ok: true, label: `${DAYS[dow]} ${dm[3]}/${dm[2]}/${dm[1]} at ${time}` };
}

/** WhatsApp number (923001234567) → POS phone (03001234567). */
export function localPhone(waId) {
  let d = String(waId ?? '').replace(/\D/g, '');
  if (d.startsWith('92') && d.length === 12) d = '0' + d.slice(2);
  return d;
}

/** The AI's instructions. Everything it needs to know about KAFEO, in one place. */
export function systemPrompt({ menu, now = new Date(), customer = null }) {
  const p = pkParts(now);
  const open = openNow(now);
  return `You are the WhatsApp assistant of ${CAFE.name}, Lahore. You chat with customers on the café's WhatsApp number.

# Right now
Pakistan time: ${DAYS[p.dow]} ${pkDateText(p)} ${pad(p.h)}:${pad(p.mi)}. The café is ${open ? 'OPEN' : 'CLOSED'}.
${customer?.name ? `Customer's saved name: ${customer.name}.` : ''}${customer?.stamps != null ? ` Loyalty stamps: ${customer.stamps}/5.` : ''}

# Café facts (only use these — never invent anything)
- Address: ${CAFE.address}. Google Maps: https://maps.google.com/?q=KAFEO+Cafe+Shadman+Lahore
- Phone / WhatsApp: ${CAFE.phone}. Website: ${CAFE.website}. Instagram: ${CAFE.instagram}
- Hours: ${CAFE.hoursText}
- Service: dine-in, takeaway, delivery
- Delivery: only within ${CAFE.delivery.radiusKm}. Minimum order Rs ${num(CAFE.delivery.minOrder)}. Free delivery on Rs ${num(CAFE.delivery.freeFrom)}+. Below that the charge depends on distance and the team confirms it.
- Payment: cash (cash on delivery) or JazzCash. If they choose JazzCash, the team sends the JazzCash details after accepting the order.
- Every burger and sandwich comes with fries. Steaks: 220 g fillet with sautéed veggies & fries.
- Deals are limited time, valid until ${CAFE.dealsUntil}.
- Loyalty cards: Food card = 50% off the next food order after 5 visits. Bar card = a free bar item after 5 visits. Weekend special: 20% off with either card, Saturday & Sunday 2–6 PM. Stamps are given at the café.
- New: signature iced lattes (Kafeo Iced Latte, Caramel Cloud Latte, Chocolate Velvet Latte) and beef burgers.

# Menu (id | name | price in Rs by size | note). Use the id when ordering.
${menu}

# How to talk
- Reply in the customer's language: Urdu script → Urdu, Roman Urdu → Roman Urdu, English → English. Warm, short, polite (Assalam o Alaikum / JazakAllah are fine). Use the customer's name if known.
- WhatsApp style: short messages, no markdown headings or tables. *bold* with single stars is OK. A few emojis at most.
- Don't paste the whole menu. Give the 4–8 most relevant items with prices, or a category when asked. Offer the website for the full menu with pictures: ${CAFE.website}
- Never invent items, prices, discounts, times or promises. If you don't know, say a team member will reply, and use call_staff.
- Only talk about KAFEO. Politely decline anything unrelated.

# Taking an order
1. Find out: items (with size where needed), order type (delivery / takeaway / dine-in), name, and for delivery the full address (a location pin helps), and payment (cash or JazzCash).
2. Call make_bill to get the exact bill. Never add up prices yourself.
3. Send the customer the bill (items, subtotal, delivery note) and ask them to confirm with "yes / haan".
4. Only after a clear yes, call place_order with exactly the same items. Then tell them the order number and that the café will confirm in a few minutes.
${open ? '' : '- The café is CLOSED now: do NOT place orders. Tell them the hours and offer a table booking or to order when we open.\n'}- To change an order that is already placed, use call_staff.

# Table booking
Ask for name, date, time, number of people, and any seating wish (e.g. VIP seating) or occasion. Then call book_table. Tell them the team will confirm.

# Hand over to a person
Use call_staff when: the customer asks for a person, is upset or complaining, wants a big event / catering / the upstairs hall, asks about a refund or a problem with an order, or anything you can't answer from the facts above. After calling it, tell them a team member will reply soon.`;
}

/** Tools the AI can use. */
const LINE = {
  type: 'object',
  properties: {
    menu_id: { type: 'string', description: 'id from the menu, e.g. p1' },
    size: { type: 'string', description: 'size key from the menu (S, M, L, 500ml …). Empty if the item has one price.' },
    qty: { type: 'integer', minimum: 1 },
    note: { type: 'string', description: 'e.g. extra spicy, no onion. Optional.' }
  },
  required: ['menu_id', 'qty']
};
export const TOOLS = [
  {
    name: 'make_bill',
    description: 'Get the exact bill for a list of items using the official menu prices. Use before showing any total.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: LINE
        },
        order_type: { type: 'string', enum: ['delivery', 'takeaway', 'dine_in'] }
      },
      required: ['items']
    }
  },
  {
    name: 'place_order',
    description: 'Send the confirmed order to the café. Only call after the customer clearly said yes to the bill.',
    input_schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: LINE },
        order_type: { type: 'string', enum: ['delivery', 'takeaway', 'dine_in'] },
        customer_name: { type: 'string' },
        address: { type: 'string', description: 'Full delivery address. Required for delivery.' },
        payment: { type: 'string', enum: ['cash', 'jazzcash'] },
        notes: { type: 'string', description: 'Anything else for the kitchen or rider. Optional.' },
        customer_confirmed: { type: 'boolean', description: 'true only if the customer said yes to the bill' }
      },
      required: ['items', 'order_type', 'customer_name', 'payment', 'customer_confirmed']
    }
  },
  {
    name: 'book_table',
    description: 'Save a table booking request for the café team to confirm.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: '24-hour HH:MM, e.g. 19:30' },
        people: { type: 'integer', minimum: 1 },
        area: { type: 'string', description: 'Seating wish, e.g. VIP seating. Optional.' },
        notes: { type: 'string', description: 'Occasion or special request. Optional.' }
      },
      required: ['name', 'date', 'time', 'people']
    }
  },
  {
    name: 'my_orders',
    description: "Look up this customer's recent orders, their status, and loyalty stamps.",
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'call_staff',
    description: 'Hand the chat to a human team member. The bot then stays quiet in this chat for 2 hours.',
    input_schema: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'Short reason for the team' } },
      required: ['reason']
    }
  }
];

/** Customer-facing text for an order status change. */
export function statusMessage(order) {
  const no = `#${order.id}`;
  const m = order.meta || {};
  switch (order.status) {
    case 'new': {
      const fee = Number(order.delivery_fee) || 0;
      const pay = m.pay_pref === 'JazzCash' ? '\nThe team will send you the JazzCash details now.' : '';
      return `✅ Your KAFEO order ${no} is confirmed and the kitchen has started!\nTotal: Rs ${num(order.total)}${fee ? ` (incl. delivery Rs ${num(fee)})` : ''}.${pay}\nJazakAllah for ordering 🤎`;
    }
    case 'cancelled':
      return `Sorry, we couldn't take order ${no}${m.reject_reason ? ` — ${m.reject_reason}` : ''}. Reply here or call ${CAFE.phone} and we'll help.`;
    case 'ready':
      return order.type === 'take' ? `🍽️ Order ${no} is ready for pickup at KAFEO, Shadman Chowk.` : null;
    case 'out':
      return `🛵 Order ${no} is on the way to you!`;
    default:
      return null;
  }
}
