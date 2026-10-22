// Pure business rules — no screen or database code here, so they can be tested on their own.

export const fmt = (n) => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-US');
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export const TYPE_LABEL = { dine: 'Dine-in', take: 'Takeaway', deliv: 'Delivery' };
export const STATUS_LABEL = {
  pending: 'Website · waiting', new: 'New', preparing: 'Preparing', ready: 'Ready', out: 'Out for delivery', done: 'Done', cancelled: 'Cancelled'
};

// Buy More Save More: highest threshold reached wins.
export function bmsmReward(subtotal, rules) {
  const sorted = [...(rules || [])].sort((a, b) => b.min - a.min);
  const hit = sorted.find((r) => subtotal >= r.min);
  return hit ? hit.reward : '';
}

// Payment methods. "Digital" ones get the reduced PRA rate (card / mobile wallet / bank).
export const PAY_METHODS = ['Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank transfer'];
// Expenses can also be "Pay later" (a bill owed to a vendor). Those are NOT counted as expenses
// anywhere until they are marked paid — then they become a normal expense on the day they're paid.
export const PAY_LATER = 'Pay later';
export const EXP_METHODS = [...PAY_METHODS, PAY_LATER];
export const isDigital = (method) => !!method && method !== 'Cash' && method !== 'Cash (COD)';
export const taxRateFor = (method, s) => Number(isDigital(method) ? s.tax_digital_pct : s.tax_cash_pct) || 0;

// Discount on one cart line: {type:'pct'|'amt', value}
export function lineDiscount(line) {
  const gross = line.price * line.qty;
  const d = line.disc;
  if (!d || !(Number(d.value) > 0)) return 0;
  return Math.min(gross, d.type === 'pct' ? gross * Math.min(100, Number(d.value)) / 100 : Number(d.value));
}

/*
  Full bill. Order of operations:
    subtotal → item discounts → bill discount → net
    + service charge (dine-in, % of net)
    + tax on (net + service) — added on top, or shown as "included" when menu prices include tax
    + delivery fee → rounding → total
  ctx: { type, method, discount:{scope:'bill'|'items', type:'pct'|'amt', value}, serviceOn, deliveryFee, settings }
*/
export function computeBill(lines, ctx) {
  const s = ctx.settings || {};
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const d = ctx.discount;
  const itemDisc = d && d.scope === 'items' ? lines.reduce((a, l) => a + lineDiscount(l), 0) : 0;
  let billDisc = 0;
  if (d && d.scope === 'bill' && Number(d.value) > 0) {
    const base = subtotal - itemDisc;
    billDisc = Math.min(base, d.type === 'pct' ? base * Math.min(100, Number(d.value)) / 100 : Number(d.value));
  }
  const discount = Math.round(itemDisc + billDisc);
  const net = subtotal - discount;
  const servicePct = Number(s.service_pct) || 0;
  const service = ctx.type === 'dine' && ctx.serviceOn && servicePct > 0 ? Math.round(net * servicePct / 100) : 0;
  const taxRate = taxRateFor(ctx.method || 'Cash', s);
  const taxBase = net + service;
  const inclusive = !!s.prices_include_tax;
  const tax = taxRate > 0 ? Math.round(inclusive ? taxBase * taxRate / (100 + taxRate) : taxBase * taxRate / 100) : 0;
  const fee = ctx.type === 'deliv' && subtotal > 0 ? Math.max(0, Number(ctx.deliveryFee) || 0) : 0;
  const raw = net + service + (inclusive ? 0 : tax) + fee;
  const step = Number(s.round_to) || 0;
  const total = step > 0 ? Math.round(raw / step) * step : Math.round(raw);
  return { subtotal, itemDisc: Math.round(itemDisc), billDisc: Math.round(billDisc), discount, net, service, servicePct, taxRate, tax, inclusive, fee, roundOff: total - raw, total };
}

// Effective discount as % of subtotal (used for the cashier limit).
export const discountShare = (bill) => (bill.subtotal ? (bill.discount / bill.subtotal) * 100 : 0);

// Quick cash amounts for the payment screen.
export function cashSuggestions(total) {
  const out = new Set([total]);
  [100, 500, 1000].forEach((step) => out.add(Math.ceil(total / step) * step));
  [1000, 5000].forEach((note) => { if (note > total) out.add(note); });
  return [...out].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 5);
}

// Loyalty after a paid order. usedReward = this order took the loyalty discount.
export function loyaltyAfterPayment(customer, order, required) {
  const c = { ...customer };
  c.visits = (c.visits || 0) + 1;
  c.total_spent = (Number(c.total_spent) || 0) + Number(order.total || 0);
  c.last_visit = new Date().toISOString();
  if (order.discount_label === 'Loyalty') {
    c.stamps = 0;
    c.rewards_used = (c.rewards_used || 0) + 1;
  } else {
    c.stamps = Math.min((c.stamps || 0) + 1, required);
  }
  return c;
}

export const rewardReady = (customer, required) => !!customer && (customer.stamps || 0) >= required;

// Normalise a Pakistani mobile number to 03xxxxxxxxx (11 digits) when possible.
export function cleanPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('92') && d.length === 12) d = '0' + d.slice(2);
  if (d.length === 10 && d.startsWith('3')) d = '0' + d;
  return d;
}
export const phoneOk = (p) => /^03\d{9}$/.test(p);
export const waLink = (phone, text) => 'https://wa.me/92' + cleanPhone(phone).slice(1) + '?text=' + encodeURIComponent(text);

const counted = (o) => o.status !== 'cancelled';
const sold = (o) => o.status !== 'cancelled' && o.paid;

// Sales summary over paid, non-cancelled orders.
export function summarize(orders) {
  const paid = orders.filter(sold);
  const out = {
    net: 0, orders: paid.length, discounts: 0, tax: 0, fees: 0, service: 0, roundOff: 0, loyaltyUsed: 0, byReason: {},
    byPay: {}, byType: { dine: 0, take: 0, deliv: 0 }, byHour: {}, top: [], unpaid: 0, unpaidCount: 0, cancelled: 0
  };
  const items = {};
  for (const o of paid) {
    out.net += Number(o.total);
    out.discounts += Number(o.discount);
    out.tax += Number(o.tax);
    out.fees += Number(o.delivery_fee);
    out.service += Number(o.service_charge || 0);
    out.roundOff += Number(o.round_off || 0);
    if (Number(o.discount) > 0) {
      const why = o.discount_label || 'Other';
      out.byReason[why] = (out.byReason[why] || 0) + Number(o.discount);
    }
    if (o.discount_label === 'Loyalty') out.loyaltyUsed++;
    out.byPay[o.payment || 'Other'] = (out.byPay[o.payment || 'Other'] || 0) + Number(o.total);
    out.byType[o.type] = (out.byType[o.type] || 0) + 1;
    const h = new Date(o.created_at).getHours();
    out.byHour[h] = (out.byHour[h] || 0) + Number(o.total);
    for (const l of o.items || []) {
      const k = l.name;
      items[k] = items[k] || { name: k, qty: 0, value: 0 };
      items[k].qty += l.qty;
      items[k].value += l.price * l.qty;
    }
  }
  for (const o of orders) {
    if (o.status === 'cancelled') out.cancelled++;
    else if (!o.paid) { out.unpaid += Number(o.total); out.unpaidCount++; }
  }
  out.avg = out.orders ? out.net / out.orders : 0;
  out.top = Object.values(items).sort((a, b) => b.value - a.value).slice(0, 10);
  return out;
}

// Staff incentives for one day's orders (policy v1.0).
export function incentives(orders, cfg, cap) {
  const counts = { pizza: 0, steak: 0, drink: 0 };
  for (const o of orders.filter(counted)) {
    for (const l of o.items || []) if (l.counts && counts[l.counts] !== undefined) counts[l.counts] += l.qty;
  }
  const pools = Object.keys(cfg).map((key) => {
    const tiers = [...cfg[key].tiers].sort((a, b) => a[0] - b[0]);
    const n = counts[key] || 0;
    let earned = 0, tierIdx = -1;
    tiers.forEach((t, i) => { if (n >= t[0]) { earned = t[1]; tierIdx = i; } });
    const next = tiers[tierIdx + 1];
    const top = tiers[tiers.length - 1][0];
    return {
      key, label: cfg[key].label, count: n, earned,
      next: next ? `${next[0] - n} more → Rs ${next[1]}` : 'Top tier reached',
      pct: Math.min(100, Math.round((n / top) * 100))
    };
  });
  const raw = pools.reduce((s, p) => s + p.earned, 0);
  return { pools, total: Math.min(raw, cap), raw, cap };
}

export function minutesSince(iso, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
