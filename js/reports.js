// KAFEO Reports Center — every report is built as plain data (title, key figures, tables),
// then shown on screen, saved as PDF, printed on A4 or thermal, or exported to Excel (CSV).
import { lineDiscount } from './logic.js?v=2026.10.21-0009';

const n0 = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const rs = (n) => 'Rs ' + n0(n);
const qty = (n) => { const v = Number(n) || 0; return Number.isInteger(v) || Math.abs(v) >= 100 ? n0(v) : v.toFixed(2).replace(/\.?0+$/, ''); };
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '-');
export const dt = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/, (\d{1,2}:\d{2})/, ' $1');
const tm = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const TYPE = { dine: 'Dine-in', take: 'Takeaway', deliv: 'Delivery' };
const inv = (o) => 'KF-' + String(o.id).padStart(6, '0');
const where = (o) => o.type === 'dine' ? `Dine-in ${o.table_no}` : TYPE[o.type];
const by = (o) => o.meta?.by || '-';
const isPaid = (o) => o.paid && o.status !== 'cancelled';
const optOf = (l) => l.opt ?? (l.name.match(/\(([^)]+)\)$/)?.[1] || '');
const methodGroup = (m) => (!m ? 'Unpaid' : m === 'Cash (COD)' ? 'Cash' : m);
const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const L = (label, align) => ({ label, align });
const R = (label) => ({ label, align: 'right' });

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) { const k = keyFn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}
function itemLines(orders, ctx, filters = {}) {
  const out = [];
  for (const o of orders) {
    if (filters.type && filters.type !== 'all' && o.type !== filters.type) continue;
    if (filters.method && filters.method !== 'all' && methodGroup(o.payment) !== filters.method) continue;
    const d = o.meta?.discount;
    const billShare = Number(o.subtotal) ? (Number(o.discount) - (d?.scope === 'items' ? sum(o.items, lineDiscount) : 0)) / Number(o.subtotal) : 0;
    for (const l of o.items) {
      const mi = ctx.menu.items.find((i) => i.id === l.id);
      const cat = ctx.menu.categories.find((c) => c.id === mi?.category_id)?.label || 'Other';
      if (filters.category && filters.category !== 'all' && mi?.category_id !== filters.category) continue;
      const gross = l.price * l.qty;
      const disc = (d?.scope === 'items' ? lineDiscount(l) : 0) + gross * Math.max(0, billShare);
      out.push({ o, l, id: l.id, opt: optOf(l), name: l.name, cat, qty: l.qty, gross, disc, net: gross - disc });
    }
  }
  return out;
}
function foodCostOf(ctx, id, opt) {
  let r = ctx.recipes.filter((x) => x.menu_item_id === id && x.option_key === (opt || ''));
  if (!r.length && opt) r = ctx.recipes.filter((x) => x.menu_item_id === id && x.option_key === '');
  return r.reduce((a, x) => a + Number(x.qty) * Number(ctx.stock.find((s) => s.id === x.stock_item_id)?.cost || 0), 0);
}
const ordersTotals = (list) => ({
  n: list.length, sub: sum(list, (o) => o.subtotal), disc: sum(list, (o) => o.discount), svc: sum(list, (o) => o.service_charge),
  tax: sum(list, (o) => o.tax), fee: sum(list, (o) => o.delivery_fee), round: sum(list, (o) => o.round_off), total: sum(list, (o) => o.total)
});
const summaryCols = [L('Type'), R('Orders'), R('Subtotal'), R('Discount'), R('Service'), R('Tax'), R('Delivery'), R('Grand total')];
const summaryRow = (label, t, extra = {}) => Object.assign([label, n0(t.n), n0(t.sub), n0(t.disc), n0(t.svc), n0(t.tax), n0(t.fee), rs(t.total)], extra);

// ---------------------------------------------------------------------------------------
// Report catalogue. needs: which data to load. filters: which pickers to show.
// ---------------------------------------------------------------------------------------
export const REPORT_GROUPS = [
  ['Sales', ['full', 'orders', 'orderDetails', 'items', 'categoryItems', 'hourly', 'payments']],
  ['Money & tax', ['profitLoss', 'tax', 'discounts', 'expenses']],
  ['Control', ['voids', 'unpaid', 'staff']],
  ['Inventory', ['consumption', 'purchases', 'stock', 'stockItem']]
];

export const REPORTS = {
  full: {
    title: 'Full Report', desc: 'Everything for the period: all paid orders, summaries by order type and payment method, expenses, cash balance and control figures.',
    needs: ['orders', 'expenses'], landscape: true,
    build(d) {
      const paid = d.orders.filter(isPaid).sort((a, b) => a.created_at.localeCompare(b.created_at));
      const T = ordersTotals(paid);
      const exp = d.expenses;
      const expTotal = sum(exp, (e) => e.amount);
      const byType = groupBy(paid, (o) => o.type);
      const byMethod = groupBy(paid, (o) => methodGroup(o.payment));
      const expByMethod = groupBy(exp, (e) => e.method);
      const methods = [...new Set([...byMethod.keys(), ...expByMethod.keys()])];
      const cancelled = d.orders.filter((o) => o.status === 'cancelled');
      const unpaid = d.orders.filter((o) => !o.paid && o.status !== 'cancelled');
      return {
        kv: [['Net sales', rs(T.total)], ['Paid orders', n0(T.n)], ['Average bill', rs(T.n ? T.total / T.n : 0)], ['Discounts', rs(T.disc)],
          ['Tax collected', rs(T.tax)], ['Service charge', rs(T.svc)], ['Expenses', rs(expTotal)], ['Balance (sales - expenses)', rs(T.total - expTotal)]],
        tables: [
          { heading: 'Orders', columns: [R('No.'), L('Invoice'), L('Date / time'), L('Cashier'), L('Type'), R('Subtotal'), R('Discount'), R('Service'), R('Tax'), R('Delivery'), L('Method'), R('Total')],
            rows: paid.map((o, i) => [String(i + 1), inv(o), dt(o.created_at), by(o), where(o), n0(o.subtotal), n0(o.discount), n0(o.service_charge), n0(o.tax), n0(o.delivery_fee), o.payment, n0(o.total)]),
            total: ['', '', '', '', `${T.n} orders`, n0(T.sub), n0(T.disc), n0(T.svc), n0(T.tax), n0(T.fee), '', rs(T.total)], thermal: [1, 11] },
          { heading: 'Misc expenses', columns: [R('No.'), L('Date / time'), L('Staff'), L('Type'), L('Method'), L('Description'), R('Amount')],
            rows: exp.map((e, i) => [String(i + 1), dt(e.created_at), e.by_name || '-', e.type, e.method, e.description || '-', n0(e.amount)]),
            total: ['', '', '', '', '', `${exp.length} expenses`, rs(expTotal)], thermal: [3, 6] },
          { heading: 'Orders summary — by order type', columns: summaryCols,
            rows: ['dine', 'take', 'deliv'].map((k) => summaryRow(TYPE[k], ordersTotals(byType.get(k) || []))), total: summaryRow('All', T), thermal: [0, 1, 7] },
          { heading: 'Orders summary — by payment method', columns: summaryCols.map((c, i) => (i === 0 ? L('Method') : c)),
            rows: [...byMethod].map(([m, list]) => summaryRow(m, ordersTotals(list))), total: summaryRow('All', T), thermal: [0, 1, 7] },
          { heading: 'Expenses summary', columns: [L('Expense type'), R('No. of expenses'), ...['Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank transfer'].map(R), R('Total')],
            rows: [...groupBy(exp, (e) => e.type)].map(([t, list]) => [t, n0(list.length), ...['Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank transfer'].map((m) => n0(sum(list.filter((e) => e.method === m), (e) => e.amount))), rs(sum(list, (e) => e.amount))]),
            total: ['Total', n0(exp.length), ...['Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank transfer'].map((m) => n0(sum(exp.filter((e) => e.method === m), (e) => e.amount))), rs(expTotal)], thermal: [0, 7] },
          { heading: 'Balance summary (cash drawer & accounts)', columns: [L('Method'), R('Total sales'), R('No. of expenses'), R('Expense amount'), R('Balance')],
            rows: methods.map((m) => { const s = sum(byMethod.get(m) || [], (o) => o.total); const e = expByMethod.get(m) || []; const ea = sum(e, (x) => x.amount); return [m, rs(s), n0(e.length), rs(ea), rs(s - ea)]; }),
            total: ['All', rs(T.total), n0(exp.length), rs(expTotal), rs(T.total - expTotal)], thermal: [0, 1, 4] },
          { heading: 'Additional stats', columns: [L('Metric'), R('Orders'), R('Amount')],
            rows: [['Cancelled / void orders', n0(cancelled.length), rs(sum(cancelled, (o) => o.total))], ['Unpaid (open) bills', n0(unpaid.length), rs(sum(unpaid, (o) => o.total))],
              ['Orders with discount', n0(paid.filter((o) => Number(o.discount) > 0).length), rs(T.disc)], ['Loyalty rewards used', n0(paid.filter((o) => o.discount_label === 'Loyalty').length), rs(sum(paid.filter((o) => o.discount_label === 'Loyalty'), (o) => o.discount))],
              ['Complimentary items (Buy More, Save More)', n0(paid.filter((o) => o.reward).length), '-'], ['Rounding', '-', rs(T.round)]], thermal: [0, 1, 2] }
        ]
      };
    }
  },

  orders: {
    title: 'Order Report', desc: 'Every order in the period with status, payment and totals — including unpaid and cancelled.',
    needs: ['orders'], landscape: true, filters: ['type', 'method'],
    build(d, f) {
      const list = d.orders.filter((o) => (f.type === 'all' || o.type === f.type) && (f.method === 'all' || methodGroup(o.payment) === f.method))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const paid = list.filter(isPaid), T = ordersTotals(paid);
      return {
        kv: [['Orders', n0(list.length)], ['Paid', n0(paid.length)], ['Unpaid', n0(list.filter((o) => !o.paid && o.status !== 'cancelled').length)], ['Cancelled', n0(list.filter((o) => o.status === 'cancelled').length)], ['Paid total', rs(T.total)]],
        tables: [{ heading: 'Orders', columns: [L('Invoice'), L('Date / time'), L('Type'), L('Customer'), L('Cashier'), R('Items'), R('Subtotal'), R('Discount'), R('Tax'), R('Total'), L('Payment'), L('Status')],
          rows: list.map((o) => [inv(o), dt(o.created_at), where(o), [o.customer_name, o.customer_phone].filter(Boolean).join(' ') || '-', by(o), n0(sum(o.items, (l) => l.qty)), n0(o.subtotal), n0(o.discount), n0(o.tax), n0(o.total), o.status === 'cancelled' ? '-' : o.paid ? o.payment : 'Unpaid', o.status === 'cancelled' ? 'Cancelled' : o.paid ? 'Paid' : 'Open']),
          total: ['', '', '', '', '', '', n0(T.sub), n0(T.disc), n0(T.tax), rs(T.total), 'paid only', ''], thermal: [0, 9, 11] }]
      };
    }
  },

  orderDetails: {
    title: 'Order Detail Report', desc: 'Each paid order with every item, quantity, rate and amount.',
    needs: ['orders'], filters: ['type', 'method'],
    build(d, f) {
      const list = d.orders.filter(isPaid).filter((o) => (f.type === 'all' || o.type === f.type) && (f.method === 'all' || methodGroup(o.payment) === f.method))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const rows = [];
      for (const o of list) {
        rows.push(Object.assign([`${inv(o)}  ${tm(o.created_at)}  ${where(o)}  ${o.payment}`, '', '', rs(o.total)], { bold: true }));
        for (const l of o.items) rows.push(Object.assign([`${l.name}${l.note ? ' (' + l.note + ')' : ''}`, n0(l.qty), n0(l.price), n0(l.price * l.qty)], { indent: true }));
        if (Number(o.discount)) rows.push(Object.assign([`Discount${o.discount_label ? ' - ' + o.discount_label : ''}`, '', '', '-' + n0(o.discount)], { indent: true }));
        if (Number(o.tax)) rows.push(Object.assign([`Tax ${o.tax_rate}%`, '', '', n0(o.tax)], { indent: true }));
      }
      return { kv: [['Orders', n0(list.length)], ['Items sold', n0(sum(list, (o) => sum(o.items, (l) => l.qty)))], ['Total', rs(sum(list, (o) => o.total))]],
        tables: [{ heading: 'Orders and items', columns: [L('Order / item'), R('Qty'), R('Rate'), R('Amount')], rows, total: ['All orders', '', '', rs(sum(list, (o) => o.total))], thermal: [0, 1, 3] }] };
    }
  },

  items: {
    title: 'Items Report', desc: 'How many of each menu item sold and how much it brought in (after its share of discounts).',
    needs: ['orders'], filters: ['type', 'method'],
    build(d, f, ctx) {
      const lines = itemLines(d.orders.filter(isPaid), ctx, f);
      const g = [...groupBy(lines, (x) => x.name)].map(([name, ls]) => ({ name, cat: ls[0].cat, qty: sum(ls, (x) => x.qty), gross: sum(ls, (x) => x.gross), net: sum(ls, (x) => x.net) })).sort((a, b) => b.net - a.net);
      const tot = sum(g, (x) => x.net);
      return { kv: [['Different items', n0(g.length)], ['Quantity sold', n0(sum(g, (x) => x.qty))], ['Item sales', rs(tot)]],
        tables: [{ heading: 'Items (best sellers first)', columns: [R('#'), L('Item'), L('Category'), R('Qty'), R('Gross'), R('Net sales'), R('Share')],
          rows: g.map((x, i) => [String(i + 1), x.name, x.cat, n0(x.qty), n0(x.gross), n0(x.net), pct(x.net, tot)]),
          total: ['', 'All items', '', n0(sum(g, (x) => x.qty)), n0(sum(g, (x) => x.gross)), rs(tot), '100%'], thermal: [1, 3, 5] }] };
    }
  },

  categoryItems: {
    title: 'Category Wise Item Report', desc: 'Item sales grouped by menu category, with category subtotals. Filter by category, order type and payment method.',
    needs: ['orders'], filters: ['category', 'type', 'method'],
    build(d, f, ctx) {
      const lines = itemLines(d.orders.filter(isPaid), ctx, f);
      const rows = [];
      const cats = [...groupBy(lines, (x) => x.cat)].sort((a, b) => sum(b[1], (x) => x.net) - sum(a[1], (x) => x.net));
      for (const [cat, ls] of cats) {
        rows.push(Object.assign([cat, n0(sum(ls, (x) => x.qty)), n0(sum(ls, (x) => x.gross)), rs(sum(ls, (x) => x.net))], { bold: true }));
        [...groupBy(ls, (x) => x.name)].map(([name, l2]) => ({ name, q: sum(l2, (x) => x.qty), g: sum(l2, (x) => x.gross), n: sum(l2, (x) => x.net) }))
          .sort((a, b) => b.n - a.n).forEach((x) => rows.push(Object.assign([x.name, n0(x.q), n0(x.g), n0(x.n)], { indent: true })));
      }
      return { kv: [['Categories', n0(cats.length)], ['Quantity', n0(sum(lines, (x) => x.qty))], ['Net sales', rs(sum(lines, (x) => x.net))]],
        tables: [{ heading: 'By category', columns: [L('Category / item'), R('Qty'), R('Gross'), R('Net sales')], rows,
          total: ['All', n0(sum(lines, (x) => x.qty)), n0(sum(lines, (x) => x.gross)), rs(sum(lines, (x) => x.net))], thermal: [0, 1, 3] }] };
    }
  },

  hourly: {
    title: 'Hourly Sales Report', desc: 'Orders and sales for each hour of the day — find your rush hours.',
    needs: ['orders'],
    build(d) {
      const paid = d.orders.filter(isPaid);
      const g = groupBy(paid, (o) => new Date(o.created_at).getHours());
      const hours = [...g.keys()].sort((a, b) => ((a + 18) % 24) - ((b + 18) % 24));
      const lab = (h) => `${(h % 12) || 12}:00 ${h < 12 ? 'AM' : 'PM'} - ${((h + 1) % 12) || 12}:00 ${(h + 1) % 24 < 12 ? 'AM' : 'PM'}`;
      const tot = sum(paid, (o) => o.total);
      return { kv: [['Paid orders', n0(paid.length)], ['Sales', rs(tot)], ['Busiest hour', hours.length ? lab(hours.reduce((a, h) => (sum(g.get(h), (o) => o.total) > sum(g.get(a), (o) => o.total) ? h : a), hours[0])) : '-']],
        tables: [{ heading: 'By hour', columns: [L('Hour'), R('Orders'), R('Sales'), R('Average bill'), R('Share')],
          rows: hours.map((h) => { const l = g.get(h); const s = sum(l, (o) => o.total); return [lab(h), n0(l.length), n0(s), n0(s / l.length), pct(s, tot)]; }),
          total: ['All', n0(paid.length), rs(tot), n0(paid.length ? tot / paid.length : 0), '100%'], thermal: [0, 1, 2] }] };
    }
  },

  payments: {
    title: 'Payment Method Report', desc: 'Cash, card, JazzCash, Easypaisa and bank totals — split by order type.',
    needs: ['orders'],
    build(d) {
      const paid = d.orders.filter(isPaid);
      const g = groupBy(paid, (o) => methodGroup(o.payment));
      const tot = sum(paid, (o) => o.total);
      const rows = [];
      for (const [m, list] of g) {
        rows.push(Object.assign([m, n0(list.length), rs(sum(list, (o) => o.total)), pct(sum(list, (o) => o.total), tot)], { bold: true }));
        for (const k of ['dine', 'take', 'deliv']) { const l2 = list.filter((o) => o.type === k); if (l2.length) rows.push(Object.assign([TYPE[k], n0(l2.length), n0(sum(l2, (o) => o.total)), pct(sum(l2, (o) => o.total), tot)], { indent: true })); }
      }
      const cash = paid.filter((o) => methodGroup(o.payment) === 'Cash');
      return { kv: [['Total received', rs(tot)], ['Cash (incl. COD)', rs(sum(cash, (o) => o.total))], ['Card & digital', rs(tot - sum(cash, (o) => o.total))], ['Cash handed back as change', rs(sum(paid, (o) => o.change_due))]],
        tables: [{ heading: 'By payment method', columns: [L('Method / type'), R('Orders'), R('Amount'), R('Share')], rows, total: ['All', n0(paid.length), rs(tot), '100%'], thermal: [0, 1, 2] }] };
    }
  },

  profitLoss: {
    title: 'Profit / Loss Report', desc: 'Sales minus tax, food cost (from your recipes) and expenses — your estimated profit for the period.',
    needs: ['orders', 'expenses', 'inventory'],
    build(d, f, ctx) {
      const paid = d.orders.filter(isPaid);
      const T = ordersTotals(paid);
      const lines = itemLines(paid, ctx, {});
      const g = [...groupBy(lines, (x) => x.name)].map(([name, ls]) => {
        const cost = sum(ls, (x) => foodCostOf(ctx, x.id, x.opt) * x.qty);
        return { name, qty: sum(ls, (x) => x.qty), net: sum(ls, (x) => x.net), cost, hasRecipe: ls.some((x) => foodCostOf(ctx, x.id, x.opt) > 0) };
      }).sort((a, b) => (b.net - b.cost) - (a.net - a.cost));
      const food = sum(g, (x) => x.cost);
      const exp = sum(d.expenses, (e) => e.amount);
      const salesExTax = T.total - T.tax;
      const gross = salesExTax - food;
      const missing = g.filter((x) => !x.hasRecipe).length;
      return {
        kv: [['Sales (after discounts)', rs(T.total)], ['Less: sales tax (owed to PRA)', rs(T.tax)], ['Sales excl. tax', rs(salesExTax)], ['Less: food cost', rs(food)],
          ['Gross profit', rs(gross)], ['Less: expenses', rs(exp)], ['Net profit (estimate)', rs(gross - exp)], ['Net margin', pct(gross - exp, salesExTax)]],
        tables: [{ heading: 'Profit by item', columns: [L('Item'), R('Qty'), R('Net sales'), R('Food cost'), R('Profit'), R('Margin')],
          rows: g.map((x) => [x.name + (x.hasRecipe ? '' : ' *'), n0(x.qty), n0(x.net), x.hasRecipe ? n0(x.cost) : '-', n0(x.net - x.cost), x.hasRecipe ? pct(x.net - x.cost, x.net) : '-']),
          total: ['All items', n0(sum(g, (x) => x.qty)), n0(sum(g, (x) => x.net)), n0(food), rs(sum(g, (x) => x.net - x.cost)), pct(sum(g, (x) => x.net - x.cost), sum(g, (x) => x.net))],
          note: missing ? `* ${missing} item(s) have no recipe yet, so their food cost counts as zero. Add recipes in Stock > Recipes for an accurate profit.` : 'Food cost uses current ingredient cost prices.', thermal: [0, 2, 4] }]
      };
    }
  },

  tax: {
    title: 'Sales Tax Report (PRA)', desc: 'Taxable sales and tax collected, split by tax rate and payment method — for your PRA return.',
    needs: ['orders'],
    build(d, f, ctx) {
      const paid = d.orders.filter(isPaid);
      const g = groupBy(paid, (o) => `${Number(o.tax_rate) || 0}|${['Cash', 'Cash (COD)'].includes(o.payment) ? 'Cash' : 'Card / digital'}`);
      const rows = [...g].map(([k, list]) => { const [rate, kind] = k.split('|'); const taxable = sum(list, (o) => Number(o.subtotal) - Number(o.discount) + Number(o.service_charge || 0)); return [`${rate}%`, kind, n0(list.length), n0(taxable), n0(sum(list, (o) => o.tax)), n0(sum(list, (o) => o.total))]; });
      const taxable = sum(paid, (o) => Number(o.subtotal) - Number(o.discount) + Number(o.service_charge || 0));
      return { kv: [['Taxable sales', rs(taxable)], ['Tax collected', rs(sum(paid, (o) => o.tax))], ['Invoices', n0(paid.length)], ['PRA / NTN', ctx.settings.tax_number || 'not set']],
        tables: [{ heading: 'By rate and payment type', columns: [L('Tax rate'), L('Paid by'), R('Invoices'), R('Taxable amount'), R('Tax'), R('Invoice total')], rows,
          total: ['All', '', n0(paid.length), n0(taxable), rs(sum(paid, (o) => o.tax)), rs(sum(paid, (o) => o.total))], thermal: [0, 1, 4] },
        { heading: 'Invoices', columns: [L('Invoice'), L('Date / time'), L('Paid by'), R('Taxable'), R('Rate'), R('Tax'), R('Total')],
          rows: paid.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((o) => [inv(o), dt(o.created_at), o.payment, n0(Number(o.subtotal) - Number(o.discount) + Number(o.service_charge || 0)), (Number(o.tax_rate) || 0) + '%', n0(o.tax), n0(o.total)]),
          total: ['', '', '', n0(taxable), '', n0(sum(paid, (o) => o.tax)), n0(sum(paid, (o) => o.total))], thermal: [0, 5, 6] }] };
    }
  },

  discounts: {
    title: 'Discount Report', desc: 'Every discount given — who gave it, why, and how much — plus totals by reason.',
    needs: ['orders'],
    build(d) {
      const list = d.orders.filter((o) => isPaid(o) && Number(o.discount) > 0).sort((a, b) => a.created_at.localeCompare(b.created_at));
      const g = groupBy(list, (o) => o.discount_label || 'No reason given');
      const tot = sum(list, (o) => o.discount);
      return { kv: [['Discounted orders', n0(list.length)], ['Total discount', rs(tot)], ['Average discount', rs(list.length ? tot / list.length : 0)], ['Share of gross sales', pct(tot, sum(d.orders.filter(isPaid), (o) => o.subtotal))]],
        tables: [{ heading: 'By reason', columns: [L('Reason'), R('Orders'), R('Discount'), R('Share')], rows: [...g].map(([r, l]) => [r, n0(l.length), rs(sum(l, (o) => o.discount)), pct(sum(l, (o) => o.discount), tot)]), total: ['All', n0(list.length), rs(tot), '100%'], thermal: [0, 1, 2] },
          { heading: 'Discounted orders', columns: [L('Invoice'), L('Date / time'), L('Cashier'), L('Reason'), L('Discount'), R('Gross'), R('Discount Rs'), R('Paid')],
            rows: list.map((o) => { const dd = o.meta?.discount; return [inv(o), dt(o.created_at), by(o), o.discount_label || '-', dd ? (dd.scope === 'items' ? 'Item-wise' : dd.type === 'pct' ? dd.value + '%' : 'Rs ' + n0(dd.value)) : '-', n0(o.subtotal), n0(o.discount), n0(o.total)]; }),
            total: ['', '', '', '', '', n0(sum(list, (o) => o.subtotal)), rs(tot), n0(sum(list, (o) => o.total))], thermal: [0, 3, 6] }] };
    }
  },

  expenses: {
    title: 'Expense Report', desc: 'All expenses paid in the period, by type and payment method.',
    needs: ['expenses'],
    build(d) {
      const exp = d.expenses;
      const tot = sum(exp, (e) => e.amount);
      return { kv: [['Expenses', n0(exp.length)], ['Total', rs(tot)], ['Paid in cash', rs(sum(exp.filter((e) => e.method === 'Cash'), (e) => e.amount))]],
        tables: [{ heading: 'By type', columns: [L('Type'), R('Count'), R('Amount'), R('Share')], rows: [...groupBy(exp, (e) => e.type)].map(([t, l]) => [t, n0(l.length), rs(sum(l, (e) => e.amount)), pct(sum(l, (e) => e.amount), tot)]), total: ['All', n0(exp.length), rs(tot), '100%'], thermal: [0, 2] },
          { heading: 'All expenses', columns: [L('Date / time'), L('Type'), L('Description'), L('Method'), L('By'), R('Amount')], rows: exp.map((e) => [dt(e.created_at), e.type, e.description || '-', e.method, e.by_name || '-', n0(e.amount)]), total: ['', '', '', '', 'Total', rs(tot)], thermal: [1, 5] }] };
    }
  },

  voids: {
    title: 'Void / Cancelled Report', desc: 'Orders that were cancelled, with their items and value — watch for misuse.',
    needs: ['orders'],
    build(d) {
      const list = d.orders.filter((o) => o.status === 'cancelled').sort((a, b) => a.created_at.localeCompare(b.created_at));
      return { kv: [['Cancelled orders', n0(list.length)], ['Value', rs(sum(list, (o) => o.total))], ['Items', n0(sum(list, (o) => sum(o.items, (l) => l.qty)))]],
        tables: [{ heading: 'Cancelled orders', columns: [L('Invoice'), L('Created'), L('Last change'), L('Type'), L('Cashier'), L('Items'), R('Value')],
          rows: list.map((o) => [inv(o), dt(o.created_at), dt(o.updated_at || o.created_at), where(o), by(o), o.items.map((l) => `${l.qty}x ${l.name}`).join(', '), n0(o.total)]),
          total: ['', '', '', '', '', `${list.length} orders`, rs(sum(list, (o) => o.total))], thermal: [0, 6] }] };
    }
  },

  unpaid: {
    title: 'Unpaid Bills Report', desc: 'Bills created in the period that are still not paid.',
    needs: ['orders'],
    build(d) {
      const list = d.orders.filter((o) => !o.paid && o.status !== 'cancelled').sort((a, b) => a.created_at.localeCompare(b.created_at));
      return { kv: [['Open bills', n0(list.length)], ['Amount due', rs(sum(list, (o) => o.total))]],
        tables: [{ heading: 'Open bills', columns: [L('Invoice'), L('Created'), L('Type'), L('Customer'), L('Cashier'), R('Amount')],
          rows: list.map((o) => [inv(o), dt(o.created_at), where(o), [o.customer_name, o.customer_phone].filter(Boolean).join(' ') || '-', by(o), n0(o.total)]),
          total: ['', '', '', '', 'Total due', rs(sum(list, (o) => o.total))], thermal: [0, 2, 5] }] };
    }
  },

  staff: {
    title: 'Staff / Cashier Report', desc: 'Sales, orders and discounts by each staff member, plus incentive counts.',
    needs: ['orders'],
    build(d, f, ctx) {
      const paid = d.orders.filter(isPaid);
      const g = groupBy(paid, (o) => by(o));
      const counts = { pizza: 0, steak: 0, drink: 0 };
      paid.forEach((o) => o.items.forEach((l) => { if (counts[l.counts] !== undefined) counts[l.counts] += l.qty; }));
      const inc = ctx.settings.incentives || {};
      return { kv: [['Staff', n0(g.size)], ['Paid orders', n0(paid.length)], ['Sales', rs(sum(paid, (o) => o.total))]],
        tables: [{ heading: 'By staff member', columns: [L('Staff'), R('Orders'), R('Sales'), R('Average bill'), R('Discounts given'), R('Discounted orders'), R('Cancelled')],
          rows: [...g].map(([name, l]) => [name, n0(l.length), n0(sum(l, (o) => o.total)), n0(sum(l, (o) => o.total) / l.length), n0(sum(l, (o) => o.discount)), n0(l.filter((o) => Number(o.discount) > 0).length), n0(d.orders.filter((o) => o.status === 'cancelled' && by(o) === name).length)]),
          total: ['All', n0(paid.length), rs(sum(paid, (o) => o.total)), '', n0(sum(paid, (o) => o.discount)), '', ''], thermal: [0, 1, 2] },
        { heading: 'Incentive pools (counted items)', columns: [L('Pool'), R('Items counted')], rows: Object.keys(counts).map((k) => [inc[k]?.label || k, n0(counts[k])]),
          note: 'Incentive tiers are per day — for amounts, run this report for a single day.', thermal: [0, 1] }] };
    }
  },

  consumption: {
    title: 'Inventory Consumption Report', desc: 'How much of each ingredient was used by orders, wasted and bought in the period — with cost.',
    needs: ['moves', 'inventory'],
    build(d, f, ctx) {
      const g = groupBy(d.moves, (m) => m.stock_item_id);
      const rows = [];
      let used$ = 0, waste$ = 0, bought$ = 0;
      for (const [sid, ms] of g) {
        const it = ctx.stock.find((s) => s.id === sid) || { name: 'Deleted item', unit: '', cost: 0, category: '' };
        const used = -sum(ms.filter((m) => m.kind === 'sale' || m.kind === 'return'), (m) => m.change);
        const waste = -sum(ms.filter((m) => m.kind === 'waste'), (m) => m.change);
        const bought = sum(ms.filter((m) => m.kind === 'purchase'), (m) => m.change);
        const adj = sum(ms.filter((m) => m.kind === 'adjust' || m.kind === 'opening'), (m) => m.change);
        used$ += used * Number(it.cost || 0); waste$ += waste * Number(it.cost || 0); bought$ += sum(ms.filter((m) => m.kind === 'purchase'), (m) => m.change * (Number(m.unit_cost) || Number(it.cost) || 0));
        rows.push([it.name, it.category || '-', it.unit, qty(used), qty(waste), qty(bought), qty(adj), n0(used * Number(it.cost || 0))]);
      }
      rows.sort((a, b) => Number(String(b[7]).replace(/,/g, '')) - Number(String(a[7]).replace(/,/g, '')));
      return { kv: [['Used in orders (at cost)', rs(used$)], ['Wasted (at cost)', rs(waste$)], ['Bought', rs(bought$)], ['Ingredients moved', n0(g.size)]],
        tables: [{ heading: 'By ingredient', columns: [L('Ingredient'), L('Category'), L('Unit'), R('Used'), R('Wasted'), R('Bought'), R('Count adj.'), R('Used cost')], rows,
          total: ['All', '', '', '', '', '', '', rs(used$)], thermal: [0, 3, 7] }] };
    }
  },

  purchases: {
    title: 'Purchase Report', desc: 'Every stock-in (purchase) with quantity, unit cost, value and supplier note.',
    needs: ['moves', 'inventory'],
    build(d, f, ctx) {
      const list = d.moves.filter((m) => m.kind === 'purchase');
      const val = (m) => Number(m.change) * (Number(m.unit_cost) || Number(ctx.stock.find((s) => s.id === m.stock_item_id)?.cost) || 0);
      const tot = sum(list, val);
      const g = groupBy(list, (m) => ctx.stock.find((s) => s.id === m.stock_item_id)?.category || 'Other');
      return { kv: [['Purchases', n0(list.length)], ['Total value', rs(tot)]],
        tables: [{ heading: 'By category', columns: [L('Category'), R('Entries'), R('Value')], rows: [...g].map(([c, l]) => [c, n0(l.length), rs(sum(l, val))]), total: ['All', n0(list.length), rs(tot)], thermal: [0, 2] },
          { heading: 'All purchases', columns: [L('Date / time'), L('Item'), R('Quantity'), R('Unit cost'), R('Value'), L('Supplier / note'), L('By')],
            rows: list.map((m) => { const it = ctx.stock.find((s) => s.id === m.stock_item_id); return [dt(m.created_at), it?.name || '?', `${qty(m.change)} ${it?.unit || ''}`, Number(m.unit_cost) ? String(m.unit_cost) : '-', n0(val(m)), m.note || '-', m.by_name || '-']; }),
            total: ['', '', '', '', rs(tot), '', ''], thermal: [1, 2, 4] }] };
    }
  },

  stock: {
    title: 'Stocks Report', desc: 'Current stock of every item right now, with value and status. (No dates needed.)',
    needs: ['inventory'], noDates: true,
    build(d, f, ctx) {
      const list = ctx.stock.filter((s) => s.active !== false).sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
      const st = (s) => (Number(s.qty) <= 0 ? 'Out of stock' : Number(s.low_level) > 0 && Number(s.qty) <= Number(s.low_level) ? 'Low' : 'OK');
      const val = sum(list, (s) => Math.max(0, Number(s.qty)) * Number(s.cost || 0));
      return { kv: [['Items', n0(list.length)], ['Stock value', rs(val)], ['Low', n0(list.filter((s) => st(s) === 'Low').length)], ['Out of stock', n0(list.filter((s) => st(s) === 'Out of stock').length)]],
        tables: [{ heading: 'Stock on hand', columns: [L('Item'), L('Category'), R('In stock'), L('Unit'), R('Alert at'), R('Cost / unit'), R('Value'), L('Status')],
          rows: list.map((s) => [s.name, s.category || '-', qty(s.qty), s.unit, Number(s.low_level) ? qty(s.low_level) : '-', Number(s.cost) ? String(s.cost) : '-', n0(Math.max(0, Number(s.qty)) * Number(s.cost || 0)), st(s)]),
          total: ['All', '', '', '', '', '', rs(val), ''], thermal: [0, 2, 7] }] };
    }
  },

  stockItem: {
    title: 'Specific Stock Item Report', desc: 'Every movement of one ingredient in the period with a running balance.',
    needs: ['moves', 'inventory'], filters: ['stockItem'],
    build(d, f, ctx) {
      const it = ctx.stock.find((s) => String(s.id) === String(f.stockItem));
      if (!it) return { kv: [], tables: [], message: 'Choose a stock item.' };
      const ms = d.moves.filter((m) => m.stock_item_id === it.id);
      const after = d.movesAfter.filter((m) => m.stock_item_id === it.id);
      const closing = Number(it.qty) - sum(after, (m) => m.change);
      const opening = closing - sum(ms, (m) => m.change);
      let bal = opening;
      const LBL = { purchase: 'Stock in', sale: 'Used in order', return: 'Returned', waste: 'Waste', adjust: 'Count correction', opening: 'Opening stock' };
      return { kv: [['Item', `${it.name} (${it.unit})`], ['Opening', qty(opening)], ['In', qty(sum(ms.filter((m) => m.change > 0), (m) => m.change))], ['Out', qty(-sum(ms.filter((m) => m.change < 0), (m) => m.change))], ['Closing', qty(closing)]],
        tables: [{ heading: `Movements — ${it.name}`, columns: [L('Date / time'), L('Type'), L('Note'), L('By'), R('In'), R('Out'), R('Balance')],
          rows: [['', 'Opening balance', '', '', '', '', qty(opening)], ...ms.map((m) => { bal += Number(m.change); return [dt(m.created_at), LBL[m.kind] || m.kind, m.note || '-', m.by_name || '-', m.change > 0 ? qty(m.change) : '', m.change < 0 ? qty(-m.change) : '', qty(bal)]; })],
          total: ['', 'Closing balance', '', '', qty(sum(ms.filter((m) => m.change > 0), (m) => m.change)), qty(-sum(ms.filter((m) => m.change < 0), (m) => m.change)), qty(closing)], thermal: [1, 4, 5, 6] }] };
    }
  }
};

// ---------------------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------------------
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toPdfDoc(id, result, rangeText, landscapeOverride) {
  const def = REPORTS[id];
  const blocks = [];
  if (result.kv?.length) blocks.push({ type: 'kv', items: result.kv });
  for (const t of result.tables || []) {
    blocks.push({ type: 'heading', text: t.heading });
    blocks.push({ type: 'table', columns: t.columns, rows: t.rows, total: t.total, note: t.note });
  }
  if (result.message) blocks.push({ type: 'text', text: result.message });
  return { title: def.title, meta: rangeText, landscape: landscapeOverride ?? !!def.landscape, blocks,
    footer: `KAFEO Cafe, 97-Shadman-1, Jail Road, Lahore  |  Generated ${dt(new Date())}  |  KAFEO POS` };
}

// Screen preview and A4 print (same HTML).
export function toHtml(id, result, rangeText) {
  const def = REPORTS[id];
  return `<div class="rep">
    <div class="rep-head"><div><div class="rep-brand">KAFEO</div><div class="rep-sub">Coffee · Food · Motivation</div></div>
      <div class="rep-title"><b>${h(def.title)}</b><span>${h(rangeText)}</span></div></div>
    ${result.message ? `<p class="rep-msg">${h(result.message)}</p>` : ''}
    ${result.kv?.length ? `<div class="rep-kv">${result.kv.map(([k, v]) => `<div><span>${h(k)}</span><b>${h(v)}</b></div>`).join('')}</div>` : ''}
    ${(result.tables || []).map((t) => `<h3>${h(t.heading)}</h3>
      <div class="rep-tbl"><table><thead><tr>${t.columns.map((c) => `<th class="${c.align === 'right' ? 'n' : ''}">${h(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map((r) => `<tr class="${r.bold ? 'b' : ''}">${r.map((v, i) => `<td class="${t.columns[i].align === 'right' ? 'n' : ''}${r.indent && i === 0 ? ' in' : ''}">${h(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${t.columns.length}" class="none">No records in this period</td></tr>`}</tbody>
      ${t.total ? `<tfoot><tr>${t.total.map((v, i) => `<td class="${t.columns[i].align === 'right' ? 'n' : ''}">${h(v)}</td>`).join('')}</tr></tfoot>` : ''}</table></div>
      ${t.note ? `<p class="rep-note">${h(t.note)}</p>` : ''}`).join('')}
    <div class="rep-foot">KAFEO Café · Shadman, Lahore · Generated ${h(dt(new Date()))} · KAFEO POS</div>
  </div>`;
}

// 80mm thermal: key figures + the most important columns of each table.
export function toThermal(id, result, rangeText) {
  const def = REPORTS[id];
  return `<div class="slip rcpt rep-th">
    <div class="c"><b style="font-size:16px;letter-spacing:3px">KAFEO</b><div class="doc">${h(def.title.toUpperCase())}</div><div class="sm">${h(rangeText)}</div></div>
    ${(result.kv || []).map(([k, v]) => `<div class="r"><span>${h(k)}</span><span><b>${h(v)}</b></span></div>`).join('')}
    ${(result.tables || []).map((t) => {
      const idx = t.thermal || [0, t.columns.length - 1];
      return `<div class="th-h">${h(t.heading)}</div>
        <table class="th-t"><thead><tr>${idx.map((i) => `<th class="${t.columns[i].align === 'right' ? 'n' : ''}">${h(t.columns[i].label)}</th>`).join('')}</tr></thead>
        <tbody>${t.rows.slice(0, 300).map((r) => `<tr class="${r.bold ? 'b' : ''}">${idx.map((i) => `<td class="${t.columns[i].align === 'right' ? 'n' : ''}">${h(r[i])}</td>`).join('')}</tr>`).join('')}</tbody>
        ${t.total ? `<tfoot><tr>${idx.map((i) => `<td class="${t.columns[i].align === 'right' ? 'n' : ''}">${h(t.total[i])}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
    }).join('')}
    <div class="c sm" style="margin-top:8px">Printed ${h(dt(new Date()))}</div>
  </div>`;
}

export function toCsv(result) {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const out = [];
  if (result.kv?.length) { out.push('Summary'); result.kv.forEach(([k, v]) => out.push([q(k), q(v)].join(','))); out.push(''); }
  for (const t of result.tables || []) {
    out.push(q(t.heading));
    out.push(t.columns.map((c) => q(c.label)).join(','));
    t.rows.forEach((r) => out.push(r.map(q).join(',')));
    if (t.total) out.push(t.total.map(q).join(','));
    out.push('');
  }
  return '﻿' + out.join('\n');
}
