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
  ['Kafeo Special', 'p1', [1100, 1649, 2549], 'pizza'],
  ['Supreme', 'p2', [1049, 1599, 2399], 'pizza'],
  ['Peri Peri', 'p3', [999, 1499, 2249], 'pizza'],
  ['Malai Boti', 'p4', [849, 1449, 2149], 'pizza'],
  ['Tikka', 'p5', [799, 1249, 1999], 'pizza', 'Flavour: Tikka'],
  ['Fajita', 'p5', [799, 1249, 1999], 'pizza', 'Flavour: Fajita'],
  ['Sausages', 'p6', [699, 1149, 1749], 'pizza'],
  ['Cheese Lover', 'p7', [699, 1099, 1599], 'pizza'],
  ['Veggies Lover', 'p8', [749, 1199, 1649], 'pizza'],
  // Burgers
  ['Molten Lava Burger', 'b1', 1099, 'burgers'],
  ['Steak Burger', 'b2', 849, 'burgers'],
  ['Out of Control Burger', 'b3', 999, 'burgers'],
  ['Swiss Mushroom Burger', 'b4', 849, 'burgers'],
  ['Fiery Fillet Burger', 'b5', 699, 'burgers'],
  ['Zinger Burger', 'b6', 599, 'burgers'],
  ['Hot & Crispy Burger', 'b7', 599, 'burgers'],
  ['Patty Burger', 'b8', 474, 'burgers'],
  ['Smoky Beef Burger', 'b9', 1049, 'burgers'],
  ['Smoke House Beef Burger', 'b10', 1249, 'burgers'],
  ['Double Smoky Beef Burger', 'b11', 1499, 'burgers'],
  ['Dip & Drown Burger', 'b12', 1499, 'burgers'],
  // Steaks
  ['Mushroom Steak', 's1', 1599, 'steak'],
  ['Jalapeño Steak', 's2', 1449, 'steak'],
  ['Mexican Steak', 's3', 1449, 'steak'],
  ['BBQ Steak', 's4', 1299, 'steak'],
  ['Black Pepper Steak', 's5', 1299, 'steak'],
  // Pasta
  ['Baked Mushroom Pasta', 's6', 1249, 'pasta'],
  ['Red Sauce Pasta', 's7', 1099, 'pasta'],
  ['Alfredo', 's8', 1199, 'pasta'],
  // Sandwiches & wraps
  ['Cheese Lover Sandwich', 'w1', 849, 'sandwich'],
  ['Cocktail Sandwich', 'w2', 899, 'sandwich'],
  ['Club Sandwich', 'w3', 799, 'sandwich'],
  ['Grilled Chicken Sandwich', 'w4', 749, 'sandwich'],
  ['Grilled Chicken Wrap', 'w5', 749, 'sandwich'],
  ['Cheese Wrap', 'w6', 749, 'sandwich'],
  ['Crunchy Wrap', 'w7', 699, 'sandwich'],
  // Fries & sides
  ['Loaded Fries', 'f1', 674, 'sides'],
  ['Masala Fries', 'f2', 374, 'sides'],
  ['Pizza Fries', 'f3', 825, 'sides'],
  ['Jalapeño Cheese Fries', 'f4', 674, 'sides'],
  ['Mayo Cheese Fries', 'f5', 674, 'sides'],
  ['Garlic Mayo Fries', 'f6', 474, 'sides'],
  ['Plain Fries', 'f7', 374, 'sides'],
  ['Chicken Strips (4 pc)', 'f8', 574, 'sides'],
  ['Cheese Sticks (2 pc)', 'f10', 449, 'sides'],
  ['Nuggets (5 pc)', 'f9', 499, 'sides'],
  ['Onion Rings (6 pc)', 'f11', 399, 'sides'],
  // Wings
  ['Baked Wings (6 pc)', 'g1', 549, 'wings'],
  ['Crispy Wings (6 pc)', 'g3', 549, 'wings'],
  ['Honey Wings (5 pc)', 'g2', 499, 'wings'],
  ['BBQ Wings (5 pc)', 'g4', 499, 'wings'],
  // Coffee & tea
  ['Caramel Cloud Latte (iced)', 'c6', 800, 'coffee'],
  ['Chocolate Velvet Latte (iced)', 'c7', 800, 'coffee'],
  ['KAFEO Iced Latte', 'c5', 800, 'coffee'],
  ['Latte', 'c2', 499, 'coffee'],
  ['Cappuccino', 'c1', 449, 'coffee'],
  ['Espresso', 'c3', 345, 'coffee'],
  ['Long Black', 'c4', 345, 'coffee'],
  ['Mocha', 'c17', 399, 'coffee'],
  ['Hot Chocolate', 'c18', 549, 'coffee'],
  ['Kashmiri Chai', 'c12', 399, 'coffee'],
  ['Cardamom Tea', 'c11', 325, 'coffee'],
  ['Karak Chai', 'c10', 325, 'coffee'],
  ['Mix Karak', 'c14', 280, 'coffee'],
  ['Mix Cardamom', 'c15', 300, 'coffee'],
  ['Green Tea', 'c13', 150, 'coffee'],
  // Cold coffee & shakes
  // Standard / Large drinks: { S: price, L: price } → "Name (S)" / "Name (L)".
  // The plain name (old saved baskets) is read as the Standard size.
  ['Caramel Cold Coffee', 'c8', { S: 749, L: 800 }, 'shakes'],
  ['Oreo Cold Coffee', 'c9', { S: 749, L: 800 }, 'shakes'],
  ['Lotus Coffee', 'c16', { L: 950 }, 'shakes'],
  ['KitKat Shake', 'k1', { S: 699, L: 950 }, 'shakes'],
  ['Oreo Shake', 'k2', { S: 675, L: 800 }, 'shakes'],
  ['Vanilla Shake', 'k3', { S: 625, L: 700 }, 'shakes'],
  ['Chocolate Shake', 'k4', { S: 625, L: 700 }, 'shakes'],
  ['Strawberry Shake', 'k5', { S: 625, L: 700 }, 'shakes'],
  ['Lotus Shake', 'k15', { L: 900 }, 'shakes'],
  // Mocktails & drinks
  ['Crimson Mist', 'k7', { S: 399, L: 500 }, 'mocktails'],
  ['Jade Valley', 'k6', { S: 375, L: 500 }, 'mocktails'],
  ['Blond Bomb Shell', 'k8', { S: 375, L: 500 }, 'mocktails'],
  ['Pink Zest', 'k16', 399, 'mocktails'],
  ['Golden Fizz Mango Mojito', 'k17', 399, 'mocktails'],
  ['Blueberry Lemon Spark', 'k18', 399, 'mocktails'],
  ['Mint Margarita', 'k10', { S: 349, L: 400 }, 'mocktails'],
  ['Iced Peach Tea', 'k11', { S: 325, L: 400 }, 'mocktails'],
  ['Fresh Lime', 'k9', { S: 349, L: 375 }, 'mocktails'],
  ['Coke / Sprite 345 ml', 'k12', 120, 'mocktails', 'Coke or Sprite — ask customer', '345ml'],
  ['Coke / Sprite 500 ml', 'k12', 160, 'mocktails', 'Coke or Sprite — ask customer', '500ml'],
  ['Coke / Sprite 1 L', 'k12', 260, 'mocktails', 'Coke or Sprite — ask customer', '1L'],
  ['Coke / Sprite 1.5 L', 'k12', 320, 'mocktails', 'Coke or Sprite — ask customer', '1.5L'],
  ['Water 500 ml', 'k13', 80, 'mocktails', '', '500ml'],
  ['Water 1.5 L', 'k13', 190, 'mocktails', '', '1.5L'],
  // Desserts
  ['Nutella Brownie', 'e1', 449, 'desserts'],
  ['Belgian Chocolate Brownie', 'e2', 449, 'desserts'],
  ['Nuts Brownie', 'e3', 449, 'desserts'],
  ['Brownie with Ice Cream', 'xmvtbkmu0', 599, 'desserts'],
  ['Vanilla Ice Cream', 'e4', 350, 'desserts']
];

// Website deals ("Deal: <name>") at the website price.
const DEALS = [
  ['Starter Boost', 'd1', 549],
  ['Buddy Boost', 'd2', 1049],
  ['Pizza Power-Up', 'd3', 1249],
  ['Fries Frenzy', 'd5', 1999],
  ['Pizza Combo', 'd4', 2499],
  ['Pizza Party Special', 'd7', 2999],
  ['Kafeo Gathering', 'd6', 3999]
];

// Add-ons: website name → [POS id ('' = not on the POS menu), price or [S, M, L], name to print]
const ADDONS = {
  'Extra cheese': ['a1', [80, 150, 220], 'Extra Cheese'],
  'Extra chicken': ['a2', [90, 150, 220], 'Extra Chicken'],
  'Extra sausage': ['a3', [50, 90, 130], 'Sausage Topping'],
  'Olives': ['a5', 59, 'Olives'],
  'Jalapeño': ['a6', 59, 'Jalapeno'],
  'Mushrooms': ['a7', 69, 'Mushrooms'],
  'Cheese slice': ['a4', 90, 'Cheese Slice'],
  'Extra chicken patty': ['a8', 225, 'Chicken Patty'],
  'Chicken fillet': ['a9', 199, 'Chicken Fillet'],
  'Garlic mayo sauce': ['a12', 89, 'Garlic Mayo Sauce'],
  'BBQ sauce': ['a13', 89, 'BBQ Sauce'],
  'Chipotle sauce': ['a14', 89, 'Chipotle Sauce'],
  'Burger sauce': ['a15', 89, 'Burger Sauce'],
  'Creamy mayo sauce': ['a16', 89, 'Creamy Mayo Sauce'],
  'Honey mustard sauce': ['a10', 99, 'Honey Mustard Dip'],
  'Peri peri sauce': ['a11', 99, 'Peri Peri Dip']
};
// Which add-ons each category offers on the website (anything else is flagged).
const CAT_ADDONS = {
  pizza: ['Extra cheese', 'Extra chicken', 'Extra sausage', 'Olives', 'Jalapeño', 'Mushrooms'],
  burgers: ['Cheese slice', 'Jalapeño', 'Mushrooms', 'Extra chicken patty', 'Chicken fillet'],
  sandwich: ['Cheese slice', 'Jalapeño'],
  steak: ['Mushrooms', 'Jalapeño', 'Cheese slice'],
  pasta: ['Mushrooms', 'Olives'],
  sides: ['Garlic mayo sauce', 'BBQ sauce', 'Chipotle sauce', 'Burger sauce', 'Creamy mayo sauce', 'Honey mustard sauce', 'Peri peri sauce'],
  wings: ['BBQ sauce', 'Garlic mayo sauce', 'Honey mustard sauce', 'Peri peri sauce']
};
const CUSTOM_DRINK = { id: 'c5', price: 800 };
const SIZES = ['S', 'M', 'L'];

const baseByName = new Map();
for (const [name, id, price, cat, note = '', opt = ''] of BASE) {
  if (Array.isArray(price)) {
    price.forEach((p, i) => baseByName.set(`${name} Pizza (${SIZES[i]})`, { id, opt: SIZES[i], price: p, cat, note, size: i }));
  } else if (price && typeof price === 'object') {
    for (const [k, p] of Object.entries(price)) baseByName.set(`${name} (${k})`, { id, opt: k, price: p, cat, note });
    const std = price.S != null ? 'S' : Object.keys(price)[0];
    baseByName.set(name, { id, opt: std, price: price[std], cat, note });
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
