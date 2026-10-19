// KAFEO website → POS menu map, and the parser that turns a website basket line
// ("Zinger Burger (Extra spicy, + Cheese slice)") into POS order lines.
//
// Prices here are the WEBSITE prices (what the customer saw and agreed to).
// If you change a price on the website, change it here too — otherwise the order
// still arrives on the POS, but with a yellow "price check" warning for the cashier.
//
// Plain JavaScript so the same file runs in the Supabase Edge Function (Deno)
// and in the local test (node tools/test-web-order.mjs).

// [website name, POS menu id, website price (or [S, M, L] for pizza), website category, extra note]
const BASE = [
  // Pizza (sized S / M / L)
  ['Kafeo Special', 'p1', [999, 1549, 2399], 'pizza'],
  ['Supreme', 'p2', [899, 1449, 2249], 'pizza'],
  ['Peri Peri', 'p3', [849, 1349, 2149], 'pizza'],
  ['Malai Boti', 'p4', [749, 1299, 1999], 'pizza'],
  ['Tikka', 'p5', [699, 1149, 1899], 'pizza', 'Flavour: Tikka'],
  ['Fajita', 'p5', [699, 1149, 1899], 'pizza', 'Flavour: Fajita'],
  ['Sausages', 'p6', [649, 1099, 1699], 'pizza'],
  ['Cheese Lover', 'p7', [649, 1099, 1699], 'pizza'],
  ['Veggies Lover', 'p8', [649, 1099, 1699], 'pizza'],
  // Burgers
  ['Molten Lava Burger', 'b1', 1099, 'burgers'],
  ['Steak Burger', 'b2', 949, 'burgers'],
  ['Out of Control Burger', 'b3', 749, 'burgers'],
  ['Swiss Mushroom Burger', 'b4', 680, 'burgers'],
  ['Fiery Fillet Burger', 'b5', 599, 'burgers'],
  ['Zinger Burger', 'b6', 549, 'burgers'],
  ['Hot & Crispy Burger', 'b7', 499, 'burgers'],
  ['Patty Burger', 'b8', 399, 'burgers'],
  // Steaks
  ['Mushroom Steak', 's1', 1349, 'steak'],
  ['Jalapeño Steak', 's2', 1249, 'steak'],
  ['Mexican Steak', 's3', 1199, 'steak'],
  ['BBQ Steak', 's4', 1099, 'steak'],
  ['Black Pepper Steak', 's5', 1099, 'steak'],
  // Pasta
  ['Baked Mushroom Pasta', 's6', 1099, 'pasta'],
  ['Red Sauce Pasta', 's7', 1099, 'pasta'],
  ['Fettuccine', 's8', 999, 'pasta'],
  // Sandwiches & wraps
  ['Cheese Lover Sandwich', 'w1', 799, 'sandwich'],
  ['Cocktail Sandwich', 'w2', 774, 'sandwich'],
  ['Club Sandwich', 'w3', 749, 'sandwich'],
  ['Grilled Chicken Sandwich', 'w4', 674, 'sandwich'],
  ['Grilled Chicken Wrap', 'w5', 674, 'sandwich'],
  ['Cheese Wrap', 'w6', 674, 'sandwich'],
  ['Crunchy Wrap', 'w7', 549, 'sandwich'],
  // Fries & sides
  ['Loaded Fries', 'f1', 699, 'sides'],
  ['Masala Fries', 'f2', 299, 'sides'],
  ['Pizza Fries', 'f3', 299, 'sides'],
  ['Jalapeño Cheese Fries', 'f4', 599, 'sides'],
  ['Mayo Cheese Fries', 'f5', 449, 'sides'],
  ['Garlic Mayo Fries', 'f6', 399, 'sides'],
  ['Plain Fries', 'f7', 299, 'sides'],
  ['Chicken Strips (4 pc)', 'f8', 449, 'sides'],
  ['Cheese Sticks (2 pc)', 'f10', 399, 'sides'],
  ['Nuggets (5 pc)', 'f9', 399, 'sides'],
  ['Onion Rings (6 pc)', 'f11', 249, 'sides'],
  // Wings
  ['Baked Wings (6 pc)', 'g1', 449, 'wings'],
  ['Crispy Wings (6 pc)', 'g3', 449, 'wings'],
  ['Honey Wings (5 pc)', 'g2', 449, 'wings'],
  ['BBQ Wings (5 pc)', 'g4', 449, 'wings'],
  // Coffee & tea
  ['Caramel Cloud Latte (iced)', 'c6', 800, 'coffee'],
  ['Chocolate Velvet Latte (iced)', 'c7', 800, 'coffee'],
  ['KAFEO Iced Latte', 'c5', 800, 'coffee'],
  ['Latte', 'c2', 399, 'coffee'],
  ['Cappuccino', 'c1', 349, 'coffee'],
  ['Espresso', 'c3', 245, 'coffee'],
  ['Long Black', 'c4', 245, 'coffee'],
  ['Kashmiri Chai', 'c12', 320, 'coffee'],
  ['Cardamom Tea', 'c11', 299, 'coffee'],
  ['Karak Chai', 'c10', 280, 'coffee'],
  ['Mix Karak', 'c14', 280, 'coffee'],
  ['Mix Cardamom', 'c15', 300, 'coffee'],
  ['Green Tea', 'c13', 150, 'coffee'],
  // Cold coffee & shakes
  ['Caramel Cold Coffee', 'c8', 649, 'shakes'],
  ['Oreo Cold Coffee', 'c9', 599, 'shakes'],
  ['KitKat Shake', 'k1', 649, 'shakes'],
  ['Oreo Shake', 'k2', 499, 'shakes'],
  ['Vanilla Shake', 'k3', 499, 'shakes'],
  ['Chocolate Shake', 'k4', 499, 'shakes'],
  ['Strawberry Shake', 'k5', 499, 'shakes'],
  // Mocktails & drinks
  ['Crimson Mist', 'k7', 375, 'mocktails'],
  ['Jade Valley', 'k6', 375, 'mocktails'],
  ['Blond Bomb Shell', 'k8', 375, 'mocktails'],
  ['Mint Margarita', 'k10', 325, 'mocktails'],
  ['Iced Peach Tea', 'k11', 325, 'mocktails'],
  ['Fresh Lime', 'k9', 299, 'mocktails'],
  ['Coke / Sprite 345 ml', 'k12', 100, 'mocktails', 'Coke or Sprite — ask customer', '345ml'],
  ['Coke / Sprite 500 ml', 'k12', 150, 'mocktails', 'Coke or Sprite — ask customer', '500ml'],
  ['Coke / Sprite 1 L', 'k12', 220, 'mocktails', 'Coke or Sprite — ask customer', '1L'],
  ['Coke / Sprite 1.5 L', 'k12', 300, 'mocktails', 'Coke or Sprite — ask customer', '1.5L'],
  ['Water 500 ml', 'k13', 60, 'mocktails', '', '500ml'],
  ['Water 1.5 L', 'k13', 100, 'mocktails', '', '1.5L'],
  // Desserts
  ['Nutella Brownie', 'e1', 399, 'desserts'],
  ['Belgian Chocolate Brownie', 'e2', 399, 'desserts'],
  ['Nuts Brownie', 'e3', 399, 'desserts']
];

// Website deals ("Deal: <name>") at the website price.
const DEALS = [
  ['Starter Boost', 'd1', 549],
  ['Buddy Boost', 'd2', 1049],
  ['Pizza Power-Up', 'd3', 1249],
  ['Fries Frenzy', 'd5', 1999],
  ['Pizza Combo', 'd4', 2449],
  ['Pizza Party Special', 'd7', 2999],
  ['Kafeo Gathering', 'd6', 3999]
];

// Add-ons: website name → [POS id ('' = not on the POS menu), price or [S, M, L], name to print]
const ADDONS = {
  'Extra cheese': ['a1', [70, 130, 200], 'Extra Cheese'],
  'Extra chicken': ['a2', [70, 130, 200], 'Extra Chicken'],
  'Extra sausage': ['a3', [40, 80, 120], 'Sausage Topping'],
  'Olives': ['a5', 50, 'Olives'],
  'Jalapeño': ['a6', 50, 'Jalapeno'],
  'Mushrooms': ['a7', 70, 'Mushrooms'],
  'Cheese slice': ['a4', 70, 'Cheese Slice'],
  'Extra chicken patty': ['a8', 200, 'Chicken Patty'],
  'Garlic mayo sauce': ['', 70, 'Garlic Mayo Sauce'],
  'BBQ sauce': ['', 70, 'BBQ Sauce'],
  'Chipotle sauce': ['', 70, 'Chipotle Sauce'],
  'Honey mustard sauce': ['a10', 90, 'Honey Mustard Dip'],
  'Peri peri sauce': ['a11', 90, 'Peri Peri Dip']
};
// Which add-ons each category offers on the website (anything else is flagged).
const CAT_ADDONS = {
  pizza: ['Extra cheese', 'Extra chicken', 'Extra sausage', 'Olives', 'Jalapeño', 'Mushrooms'],
  burgers: ['Cheese slice', 'Jalapeño', 'Mushrooms', 'Extra chicken patty'],
  sandwich: ['Cheese slice', 'Jalapeño'],
  steak: ['Mushrooms', 'Jalapeño', 'Cheese slice'],
  pasta: ['Mushrooms', 'Olives'],
  sides: ['Garlic mayo sauce', 'BBQ sauce', 'Chipotle sauce', 'Honey mustard sauce', 'Peri peri sauce'],
  wings: ['BBQ sauce', 'Garlic mayo sauce', 'Honey mustard sauce', 'Peri peri sauce']
};
const CUSTOM_DRINK = { id: 'c5', price: 800 };
const SIZES = ['S', 'M', 'L'];

const baseByName = new Map();
for (const [name, id, price, cat, note = '', opt = ''] of BASE) {
  if (Array.isArray(price)) {
    price.forEach((p, i) => baseByName.set(`${name} Pizza (${SIZES[i]})`, { id, opt: SIZES[i], price: p, cat, note, size: i }));
  } else {
    baseByName.set(name, { id, opt, price, cat, note });
  }
}
for (const [name, id, price] of DEALS) baseByName.set('Deal: ' + name, { id, opt: '', price, cat: 'deals', note: '' });
// Longest names first so "Cheese Lover Sandwich" wins over "Cheese Lover".
const baseNames = [...baseByName.keys()].sort((a, b) => b.length - a.length);

const addonPrice = (a, size) => (Array.isArray(a[1]) ? a[1][size ?? 1] : a[1]);

/**
 * Parse one website basket line.
 * Returns { base, mods: [text], adds: [{ key, id, name, price }], expected, problems: [text] }
 * base is null when the item isn't on the website menu any more.
 */
export function parseLine(rawName) {
  const name = String(rawName || '').trim();
  const out = { base: null, mods: [], adds: [], expected: null, problems: [] };

  // Drink builder: "Custom: Caramel Iced Latte (2x Espresso shot, Milk, Caramel)"
  if (name.startsWith('Custom: ')) {
    out.base = { id: CUSTOM_DRINK.id, opt: '', price: CUSTOM_DRINK.price, cat: 'coffee', note: name.slice(8), custom: true };
    out.expected = CUSTOM_DRINK.price;
    return out;
  }

  let rest = null;
  // Pizza builder: "Kafeo Special Pizza (M) + Extra cheese, Olives"
  const plus = name.indexOf(' + ');
  if (plus > 0 && baseByName.has(name.slice(0, plus)) && baseByName.get(name.slice(0, plus)).cat === 'pizza') {
    out.base = baseByName.get(name.slice(0, plus));
    rest = name.slice(plus + 3).split(', ').map((s) => '+ ' + s.trim());
  } else if (baseByName.has(name)) {
    out.base = baseByName.get(name);
    rest = [];
  } else {
    // Customised: "<base> (<choice>, <choice>, + <add-on>)"
    const b = baseNames.find((n) => name.startsWith(n + ' (') && name.endsWith(')'));
    if (b) {
      out.base = baseByName.get(b);
      rest = name.slice(b.length + 2, -1).split(', ').map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!out.base) { out.problems.push('Not on the website menu'); return out; }

  let expected = out.base.price;
  const allowed = CAT_ADDONS[out.base.cat] || [];
  for (const bit of rest) {
    if (bit.startsWith('+ ')) {
      const key = bit.slice(2);
      const a = ADDONS[key];
      if (!a || !allowed.includes(key)) { out.problems.push(`Unknown add-on "${key}"`); out.mods.push(bit); continue; }
      const price = addonPrice(a, out.base.size);
      out.adds.push({ key, id: a[0], name: a[2], price, opt: Array.isArray(a[1]) ? out.base.opt : '' });
      expected += price;
    } else {
      out.mods.push(bit);
    }
  }
  out.expected = expected;
  return out;
}

/**
 * Turn the website basket into POS order lines.
 * menu: Map(posId → { name, station, counts, active })  (from the POS database)
 * lines: [{ name, price, qty }]  (exactly what the website sent)
 * Returns { items, subtotal, flags }
 */
export function buildItems(lines, menu) {
  const items = [];
  const flags = [];
  let subtotal = 0;
  const posName = (id, opt, fallback) => {
    const m = menu.get(id);
    const n = m ? m.name : fallback;
    return n + (opt ? ` (${opt})` : '');
  };
  const lineFor = (id, opt, name, price, qty, note) => {
    const m = menu.get(id);
    return {
      id, opt, name, price, qty,
      station: m?.station || 'kitchen', counts: m?.counts || null,
      note, disc: null, added: 0
    };
  };

  for (const l of lines) {
    const qty = l.qty;
    const sent = l.price;
    subtotal += sent * qty;
    const p = parseLine(l.name);

    if (!p.base) {
      flags.push(`“${l.name}” isn’t on the POS menu — check with the customer`);
      items.push(lineFor('', '', l.name, sent, qty, 'Website item — not matched'));
      continue;
    }
    if (p.base.id && !menu.has(p.base.id)) flags.push(`“${l.name}” is missing from the POS menu (id ${p.base.id})`);
    else if (p.base.id && menu.get(p.base.id).active === false) flags.push(`“${l.name}” is hidden on the POS menu — is it available?`);
    p.problems.forEach((x) => flags.push(`“${l.name}”: ${x}`));

    const baseName = p.base.custom ? 'Custom Latte' : posName(p.base.id, p.base.opt, l.name);
    const note = [p.base.note, ...p.mods].filter(Boolean).join(' · ');

    if (p.expected !== sent || p.problems.length) {
      // Price doesn't match the website menu: keep it as ONE line at the price the
      // customer saw, with every choice in the note, and warn the cashier.
      if (p.expected !== sent) flags.push(`“${l.name}”: website charged Rs ${sent}, menu price is Rs ${p.expected}`);
      const allNote = [note, ...p.adds.map((a) => '+ ' + a.name)].filter(Boolean).join(' · ');
      items.push(lineFor(p.base.id, p.base.opt, baseName, sent, qty, allNote));
      continue;
    }

    items.push(lineFor(p.base.id, p.base.opt, baseName, p.base.price, qty, note));
    for (const a of p.adds) {
      const n = a.id ? posName(a.id, a.opt, a.name) : a.name + (a.opt ? ` (${a.opt})` : '');
      items.push(lineFor(a.id, a.opt, n, a.price, qty, 'for ' + baseName));
    }
  }
  return { items, subtotal, flags };
}

export const _test = { BASE, DEALS, ADDONS, CAT_ADDONS, baseByName };
