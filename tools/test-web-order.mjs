// Checks that every item the website can put in a basket is understood by the
// web-order function, at the right price. Run after changing website prices:
//   node tools/test-web-order.mjs ../kafeo-website/index.html
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseLine, buildItems } from '../supabase/functions/web-order/catalog.js';

const file = process.argv[2];
if (!file) { console.error('Usage: node tools/test-web-order.mjs <path to website index.html>'); process.exit(2); }
const html = readFileSync(file, 'utf8');
const grab = (start, end = '];') => {
  const i = html.indexOf(start);
  if (i < 0) throw new Error('Not found in website: ' + start);
  return html.slice(i, html.indexOf(end, i) + end.length);
};
const src = [
  grab('const MENU = ['), grab('const DEALS=['),
  grab('const SPICE='), grab('const OPTS={', '\n};'),
  grab('function pizzaAdds(', '}\n'),
  'const TOPS=' + grab('const TOPS=[').slice('const TOPS='.length),
  'globalThis.out={MENU,DEALS,OPTS,pizzaAdds,TOPS};'
].join('\n');
const ctx = {};
vm.runInNewContext(src.replace(/const TOPS=\s*const TOPS=/, 'const TOPS='), ctx);
const { MENU, DEALS, OPTS, pizzaAdds, TOPS } = ctx.out;

let n = 0, bad = 0;
const check = (name, price) => {
  n++;
  const p = parseLine(name);
  if (!p.base || p.problems.length || p.expected !== price) {
    bad++; console.log('FAIL', JSON.stringify(name), price, '→', p.base ? p.expected : 'no match', p.problems.join('; '));
  }
};
const customs = (name, price, cat, size) => {
  const o = OPTS[cat]; if (!o) return;
  const adds = o.add === 'pizza' ? pizzaAdds(size) : o.add;
  // every add-on alone, all add-ons together, every non-default choice alone
  adds.forEach(([v, p]) => check(`${name} (+ ${v})`, price + p));
  if (adds.length) check(`${name} (${adds.map(([v]) => '+ ' + v).join(', ')})`, price + adds.reduce((a, [, p]) => a + p, 0));
  o.groups.forEach(([g, list, single]) => list.forEach((v, i) => { if (!(single && i === 0)) check(`${name} (${v})`, price); }));
  if (o.groups.length && adds.length) check(`${name} (${o.groups[0][1].at(-1)}, + ${adds[0][0]})`, price + adds[0][1]);
};

for (const c of MENU) {
  for (const [nm, p] of c.items) {
    if (c.sized) {
      p.forEach((pp, k) => {
        const s = ['S', 'M', 'L'][k];
        const name = `${nm} Pizza (${s})`;
        check(name, pp);
        customs(name, pp, 'pizza', s);
        // pizza builder
        TOPS.forEach(([, tn, tp]) => check(`${name} + ${tn}`, pp + tp[k]));
        check(`${name} + ${TOPS.map((t) => t[1]).join(', ')}`, pp + TOPS.reduce((a, t) => a + t[2][k], 0));
      });
    } else {
      check(nm, p);
      customs(nm, p, c.id);
    }
  }
}
for (const [nm, p] of DEALS) check('Deal: ' + nm, p);
check('Custom: Caramel Iced Latte (2x Espresso shot, Milk, Caramel, Ice)', 800);
for (const [nm, p] of [['Mint Margarita', 325], ['Coke / Sprite 345 ml', 100], ['KAFEO Iced Latte', 800], ['Crimson Mist', 375]]) check(nm, p);

// Things that MUST be flagged
const menu = new Map([['b6', { name: 'Zinger', station: 'kitchen', counts: null, active: true }], ['a4', { name: 'Cheese Slice', station: 'kitchen', active: true }]]);
const t1 = buildItems([{ name: 'Zinger Burger', price: 1, qty: 1 }], menu);
const t2 = buildItems([{ name: 'Mystery Item', price: 500, qty: 2 }], menu);
const t3 = buildItems([{ name: 'Zinger Burger (Extra spicy, + Cheese slice)', price: 619, qty: 2 }], menu);
const ok = (cond, msg) => { n++; if (!cond) { bad++; console.log('FAIL', msg); } };
ok(t1.flags.length === 1 && t1.items[0].price === 1, 'tampered price is flagged and kept visible');
ok(t2.flags.length === 1 && t2.subtotal === 1000 && t2.items[0].name === 'Mystery Item', 'unknown item kept and flagged');
ok(t3.flags.length === 0 && t3.items.length === 2 && t3.items[0].name === 'Zinger' && t3.items[0].note === 'Extra spicy'
  && t3.items[1].name === 'Cheese Slice' && t3.items[1].price === 70 && t3.items[1].qty === 2 && t3.subtotal === 1238, 'add-on split into its own line');
ok(t3.items.reduce((a, l) => a + l.price * l.qty, 0) === t3.subtotal, 'lines add up to subtotal');

console.log(`${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
