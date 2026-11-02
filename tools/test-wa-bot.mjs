// Checks the WhatsApp bot's plain logic: bills use POS prices, delivery rules,
// opening hours, bookings. Run: node tools/test-wa-bot.mjs
import assert from 'node:assert/strict';
import { menuText, priceItems, deliveryCheck, openNow, checkBooking, localPhone, statusMessage, systemPrompt, TOOLS } from '../supabase/functions/wa-bot/brain.js';

const rows = [
  { id: 'p1', category_id: 'pizza', name: 'Kafeo Special', note: '', options: [{ k: 'S', p: 1100 }, { k: 'M', p: 1649 }, { k: 'L', p: 2549 }], active: true, sort: 1 },
  { id: 'b6', category_id: 'burgers', name: 'Zinger', note: '', options: [{ k: '', p: 599 }], active: true, sort: 6 },
  { id: 'k12', category_id: 'drinks', name: 'Coke', note: '', options: [{ k: '345ml', p: 120 }, { k: '500ml', p: 160 }, { k: '1L', p: 260 }, { k: '1.5L', p: 320 }], active: true, sort: 1 },
  { id: 'xmvgkj05s', category_id: 'addons', name: 'delivery charges', note: '', options: [{ k: '', p: 100 }], active: true, sort: 9 },
  { id: 'old', category_id: 'burgers', name: 'Old Burger', note: '', options: [{ k: '', p: 1 }], active: false, sort: 9 }
];
const cats = [{ id: 'pizza', label: 'Pizza', sort: 1 }, { id: 'burgers', label: 'Burgers', sort: 2 }, { id: 'drinks', label: 'Drinks', sort: 3 }, { id: 'addons', label: 'Add-ons', sort: 4 }];
const map = new Map(rows.map((r) => [r.id, r]));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };

t('menu text hides internal charges and inactive items', () => {
  const m = menuText(rows, cats);
  assert.match(m, /p1 \| Kafeo Special \| Rs S 1,100 · M 1,649 · L 2,549/);
  assert.doesNotMatch(m, /charges|Old Burger/);
});
t('bill uses POS prices, sizes by word or key', () => {
  const b = priceItems([{ menu_id: 'p1', size: 'Large', qty: 1 }, { menu_id: 'b6', qty: 2, note: 'extra spicy' }, { menu_id: 'k12', size: '1.5 L', qty: 1 }], map);
  assert.deepEqual(b.errors, []);
  assert.equal(b.subtotal, 2549 + 1198 + 320);
  assert.equal(b.items[0].name, 'Kafeo Special (L)');
  assert.equal(b.items[1].note, 'extra spicy');
});
t('bill refuses unknown, hidden, sizeless and silly quantities', () => {
  const b = priceItems([{ menu_id: 'zz', qty: 1 }, { menu_id: 'xmvgkj05s', qty: 1 }, { menu_id: 'p1', qty: 1 }, { menu_id: 'b6', qty: 0 }, { menu_id: 'old', qty: 1 }], map);
  assert.equal(b.items.length, 0);
  assert.equal(b.errors.length, 5);
});
t('delivery rules', () => {
  assert.equal(deliveryCheck(999).ok, false);
  assert.match(deliveryCheck(1500).fee_text, /depends on distance/);
  assert.match(deliveryCheck(2000).fee_text, /Free/);
});
t('opening hours (Pakistan time)', () => {
  const pk = (s) => new Date(s + '+05:00');
  assert.equal(openNow(pk('2026-11-03T10:59:00')), false);   // Tue
  assert.equal(openNow(pk('2026-11-03T11:00:00')), true);
  assert.equal(openNow(pk('2026-11-03T23:59:00')), true);
  assert.equal(openNow(pk('2026-11-04T00:30:00')), false);   // Wed 00:30 — Tue closed at 12
  assert.equal(openNow(pk('2026-11-07T00:30:00')), true);    // Sat 00:30 — Fri open till 1
  assert.equal(openNow(pk('2026-11-07T01:00:00')), false);
  assert.equal(openNow(pk('2026-11-09T00:45:00')), true);    // Mon 00:45 — Sun open till 1
});
t('bookings', () => {
  const now = new Date('2026-11-03T12:00:00+05:00');
  assert.equal(checkBooking({ day: '2026-11-05', time: '19:30', people: 4 }, now).ok, true);
  assert.equal(checkBooking({ day: '2026-11-05', time: '23:30', people: 4 }, now).ok, false); // Thu closes 12 → last 23:00
  assert.equal(checkBooking({ day: '2026-11-06', time: '23:30', people: 4 }, now).ok, true);  // Fri open till 1
  assert.equal(checkBooking({ day: '2026-11-03', time: '12:10', people: 2 }, now).ok, false); // too soon
  assert.equal(checkBooking({ day: '2026-11-05', time: '09:00', people: 2 }, now).ok, false);
  assert.equal(checkBooking({ day: 'next friday', time: '7pm', people: 2 }, now).ok, false);
});
t('phone numbers', () => { assert.equal(localPhone('923001234567'), '03001234567'); });
t('status messages', () => {
  assert.match(statusMessage({ id: 5, status: 'new', total: 2400, delivery_fee: 100, meta: { pay_pref: 'JazzCash' } }), /#5 is confirmed[\s\S]*Rs 2,400[\s\S]*JazzCash/);
  assert.match(statusMessage({ id: 5, status: 'cancelled', meta: { reject_reason: 'out of beef' } }), /out of beef/);
  assert.equal(statusMessage({ id: 5, status: 'ready', type: 'deliv', meta: {} }), null);
  assert.match(statusMessage({ id: 5, status: 'out', meta: {} }), /on the way/);
});
t('prompt + tools are well formed', () => {
  const s = systemPrompt({ menu: menuText(rows, cats), now: new Date('2026-11-03T02:00:00+05:00') });
  assert.match(s, /CLOSED/); assert.match(s, /do NOT place orders/);
  JSON.stringify(TOOLS); assert.equal(TOOLS.length, 5);
});
console.log(`\nAll ${n} checks passed.`);
