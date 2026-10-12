// Pure business rules — no screen or database code here, so they can be tested on their own.

export const fmt = (n) => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-US');
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export const TYPE_LABEL = { dine: 'Dine-in', take: 'Takeaway', deliv: 'Delivery' };
export const STATUS_LABEL = {
  new: 'New', preparing: 'Preparing', ready: 'Ready', out: 'Out for delivery', done: 'Done', cancelled: 'Cancelled'
};

// Buy More Save More: highest threshold reached wins.
export function bmsmReward(subtotal, rules) {
  const sorted = [...(rules || [])].sort((a, b) => b.min - a.min);
  const hit = sorted.find((r) => subtotal >= r.min);
  return hit ? hit.reward : '';
}

// cart: [{price, qty}]; opts: {discPct, taxPct, deliveryFee, type}
export function computeTotals(cart, opts) {
  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = Math.round(subtotal * (opts.discPct || 0) / 100);
  const tax = Math.round((subtotal - discount) * (opts.taxPct || 0) / 100);
  const fee = opts.type === 'deliv' && subtotal > 0 ? Number(opts.deliveryFee) || 0 : 0;
  return { subtotal, discount, tax, fee, total: subtotal - discount + tax + fee };
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
    net: 0, orders: paid.length, discounts: 0, tax: 0, fees: 0, loyaltyUsed: 0,
    byPay: {}, byType: { dine: 0, take: 0, deliv: 0 }, byHour: {}, top: [], unpaid: 0, unpaidCount: 0, cancelled: 0
  };
  const items = {};
  for (const o of paid) {
    out.net += Number(o.total);
    out.discounts += Number(o.discount);
    out.tax += Number(o.tax);
    out.fees += Number(o.delivery_fee);
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
