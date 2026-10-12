// KAFEO starting menu (from Kafeo-Menu-final). Used to seed the database
// and by demo mode. After setup, edit prices from the Menu screen in the app.
//
// opts:    sizes/variants with price in PKR. One option with k:'' = single price.
// station: 'kitchen' or 'bar' — which kitchen-display filter the item shows under.
// counts:  'pizza' | 'steak' | 'drink' | null — which staff-incentive pool it counts toward.

export const CATEGORIES = [
  { id: 'deals', label: 'Deals', sort: 1 },
  { id: 'pizza', label: 'Pizza', sort: 2 },
  { id: 'burgers', label: 'Burgers', sort: 3 },
  { id: 'steak', label: 'Steak & Pasta', sort: 4 },
  { id: 'sand', label: 'Sandwich & Wraps', sort: 5 },
  { id: 'sides', label: 'Fries & Wings', sort: 6 },
  { id: 'coffee', label: 'Coffee & Chai', sort: 7 },
  { id: 'drinks', label: 'Shakes & Drinks', sort: 8 },
  { id: 'dessert', label: 'Desserts', sort: 9 },
  { id: 'addons', label: 'Add-ons', sort: 10 }
];

const sml = (s, m, l) => [{ k: 'S', p: s }, { k: 'M', p: m }, { k: 'L', p: l }];
const one = (p) => [{ k: '', p }];
let n = 0;
const it = (cat, id, name, opts, extra = {}) => ({
  id, cat, name, opts, note: extra.note || '', station: extra.station || 'kitchen',
  counts: extra.counts || null, sort: ++n
});
const bar = (cat, id, name, opts, note) => it(cat, id, name, opts, { station: 'bar', counts: 'drink', note });

export const ITEMS = [
  it('deals', 'd1', 'Starter Boost', one(649), { note: 'Zinger + Coke' }),
  it('deals', 'd2', 'Buddy Boost', one(1298), { note: 'Zinger + Fiery Fillet + Coke 500ml' }),
  it('deals', 'd3', 'Pizza Power-Up', one(1473), { note: 'Tikka S + Crispy Wings + Mint Margretta' }),
  it('deals', 'd4', 'Pizza Combo', one(2947), { note: 'Kafeo M + Crispy Wings + Plain Fries + 2 Mint Margretta' }),
  it('deals', 'd5', 'Fries Frenzy', one(1999), { note: 'Tikka/Fajita L + Loaded Fries + 1.5L' }),
  it('deals', 'd6', 'Kafeo Gathering', one(4972), { note: 'Kafeo L, Loaded Fries, Hot & Crispy, Grill Sandwich, Nuggets, Coke 1.5L' }),
  it('deals', 'd7', 'Pizza Party Special', one(2999), { note: '2 L Tikka/Fajita + 2 dips + 1.5L' }),

  it('pizza', 'p1', 'Kafeo Special', sml(999, 1549, 2399), { counts: 'pizza' }),
  it('pizza', 'p2', 'Supreme', sml(899, 1449, 2249), { counts: 'pizza' }),
  it('pizza', 'p3', 'Peri Peri', sml(849, 1349, 2149), { counts: 'pizza' }),
  it('pizza', 'p4', 'Malai Boti', sml(749, 1299, 1999), { counts: 'pizza' }),
  it('pizza', 'p5', 'Tikka & Fajita', sml(699, 1149, 1899), { counts: 'pizza' }),
  it('pizza', 'p6', 'Sausages', sml(649, 1099, 1699), { counts: 'pizza' }),
  it('pizza', 'p7', 'Cheese Lover', sml(649, 1099, 1699), { counts: 'pizza' }),
  it('pizza', 'p8', 'Veggies Lover', sml(649, 1099, 1699), { counts: 'pizza' }),

  it('burgers', 'b1', 'Molten Lava', one(1099)),
  it('burgers', 'b2', 'Steak Burger', one(949)),
  it('burgers', 'b3', 'Out of Control', one(749)),
  it('burgers', 'b4', 'Swiss Mushroom', one(680)),
  it('burgers', 'b5', 'Fiery Fillet', one(599)),
  it('burgers', 'b6', 'Zinger', one(549)),
  it('burgers', 'b7', 'Hot & Crispy', one(499)),
  it('burgers', 'b8', 'Patty Burger', one(399)),

  it('steak', 's1', 'Mushroom Steak', one(1349), { counts: 'steak' }),
  it('steak', 's2', 'Jalapeno Steak', one(1249), { counts: 'steak' }),
  it('steak', 's3', 'Mexican Steak', one(1199), { counts: 'steak' }),
  it('steak', 's4', 'BBQ Steak', one(1099), { counts: 'steak' }),
  it('steak', 's5', 'Black Pepper Steak', one(1099), { counts: 'steak' }),
  it('steak', 's6', 'Baked Mushroom Pasta', one(1099)),
  it('steak', 's7', 'Red Sauce Pasta', one(1099)),
  it('steak', 's8', 'Fettuccine', one(999)),

  it('sand', 'w1', 'Cheese Lover Sandwich', one(799)),
  it('sand', 'w2', 'Cocktail Sandwich', one(774)),
  it('sand', 'w3', 'Club Sandwich', one(749)),
  it('sand', 'w4', 'Grilled Chicken Sandwich', one(674)),
  it('sand', 'w5', 'Grilled Chicken Wrap', one(674)),
  it('sand', 'w6', 'Cheese Wrap', one(674)),
  it('sand', 'w7', 'Crunchy Wrap', one(549)),

  it('sides', 'f1', 'Loaded Fries', one(699)),
  it('sides', 'f2', 'Masala Fries', one(675)),
  it('sides', 'f3', 'Pizza Fries', one(675)),
  it('sides', 'f4', 'Jalapeno Cheese Fries', one(599)),
  it('sides', 'f5', 'Mayo Cheese Fries', one(449)),
  it('sides', 'f6', 'Garlic Mayo Fries', one(399)),
  it('sides', 'f7', 'Plain Fries', one(299)),
  it('sides', 'f8', 'Chicken Strips 4pc', one(449)),
  it('sides', 'f9', 'Nuggets 5pc', one(399)),
  it('sides', 'f10', 'Cheese Sticks 2pc', one(399)),
  it('sides', 'f11', 'Onion Rings 6pc', one(249)),
  it('sides', 'g1', 'Baked Wings 6pc', one(449)),
  it('sides', 'g2', 'Honey Wings 5pc', one(449)),
  it('sides', 'g3', 'Crispy Wings 6pc', one(449)),
  it('sides', 'g4', 'BBQ Wings 5pc', one(449)),

  bar('coffee', 'c1', 'Cappuccino', one(349)),
  bar('coffee', 'c2', 'Latte', one(399)),
  bar('coffee', 'c3', 'Espresso', one(245)),
  bar('coffee', 'c4', 'Long Black', one(245)),
  bar('coffee', 'c5', 'Iced Latte', one(800), 'New launch'),
  bar('coffee', 'c6', 'Iced Caramel Latte', one(800), 'New launch'),
  bar('coffee', 'c7', 'Iced Chocolate Latte', one(800), 'New launch'),
  bar('coffee', 'c8', 'Caramel Coffee', one(649)),
  bar('coffee', 'c9', 'Oreo Coffee', one(599)),
  bar('coffee', 'c10', 'Karak Chai', one(280)),
  bar('coffee', 'c11', 'Cardamom Tea', one(299)),
  bar('coffee', 'c12', 'Kashmiri Chai', one(320)),
  bar('coffee', 'c13', 'Green Tea', one(150)),

  bar('drinks', 'k1', 'KitKat Shake', one(649)),
  bar('drinks', 'k2', 'Oreo Shake', one(499)),
  bar('drinks', 'k3', 'Vanilla Shake', one(499)),
  bar('drinks', 'k4', 'Chocolate Shake', one(499)),
  bar('drinks', 'k5', 'Strawberry Shake', one(499)),
  bar('drinks', 'k6', 'Jade Valley', one(375), 'Mocktail'),
  bar('drinks', 'k7', 'Crimson Mist', one(375), 'Mocktail'),
  bar('drinks', 'k8', 'Blond Bomb Shell', one(375), 'Mocktail'),
  bar('drinks', 'k9', 'Fresh Lime', one(299)),
  bar('drinks', 'k10', 'Mint Margretta', one(325)),
  bar('drinks', 'k11', 'Iced Peach Tea', one(325)),
  it('drinks', 'k12', 'Coke / Sprite', [{ k: '345ml', p: 100 }, { k: '500ml', p: 150 }, { k: '1L', p: 220 }, { k: '1.5L', p: 300 }], { station: 'bar' }),
  it('drinks', 'k13', 'Water', [{ k: '500ml', p: 60 }, { k: '1.5L', p: 100 }], { station: 'bar' }),

  it('dessert', 'e1', 'Nutella Brownie', one(399)),
  it('dessert', 'e2', 'Belgian Chocolate Brownie', one(399)),
  it('dessert', 'e3', 'Nuts Brownie', one(399)),

  it('addons', 'a1', 'Extra Cheese', sml(70, 130, 200), { note: 'Pizza topping' }),
  it('addons', 'a2', 'Extra Chicken', sml(70, 130, 200), { note: 'Pizza topping' }),
  it('addons', 'a3', 'Sausage Topping', sml(40, 80, 120), { note: 'Pizza topping' }),
  it('addons', 'a4', 'Cheese Slice', one(70)),
  it('addons', 'a5', 'Olives', one(50)),
  it('addons', 'a6', 'Jalapeno', one(50)),
  it('addons', 'a7', 'Mushrooms', one(70)),
  it('addons', 'a8', 'Chicken Patty', one(200)),
  it('addons', 'a9', 'Chicken Fillet', one(180)),
  it('addons', 'a10', 'Honey Mustard Dip', one(70)),
  it('addons', 'a11', 'Peri Peri Dip', one(90))
];

// Starting settings. Tax, service charge and delivery fee are 0 until the owner sets them in Settings.
export const DEFAULT_SETTINGS = {
  // GST / PRA sales tax: one rate for cash, a (usually lower) rate for card & mobile wallets
  tax_cash_pct: 0,
  tax_digital_pct: 0,
  prices_include_tax: false,     // true = menu prices already include tax (tax shown as "included")
  tax_number: '',                // PRA / NTN shown on receipts
  service_pct: 0,                // dine-in service charge %
  service_default_on: true,
  round_to: 0,                   // round the total to nearest 0 (off) / 5 / 10
  cashier_max_discount_pct: 20,  // cashiers can't give more than this (owner can)
  quick_discounts: [5, 10, 15, 20, 25, 30, 50],
  discount_reasons: ['Bank / card offer', 'Friend & family', 'Regular customer', 'Staff meal', 'Complaint / recovery', 'Owner special'],
  banks: ['HBL', 'Meezan', 'UBL', 'MCB', 'Alfalah', 'Standard Chartered'],
  delivery_fee: 0,
  // Printing
  kot_auto: true,                // print a kitchen ticket when an order is added / paid
  kot_split: true,               // separate slips for kitchen and bar
  receipt_footer: 'Thank you for visiting KAFEO — see you again!',
  receipt_loyalty: true,         // show the customer's stamps on the receipt
  paper: '80safe',               // '80safe' (64mm print), '80full' (72mm), '58' (46mm)
  print_offset_mm: 0,
  loyalty_stamps: 5,
  loyalty_discount_pct: 50,
  tables: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'H1', 'H2'],
  // Buy More Save More: spend threshold → free item name (added at Rs 0)
  bmsm: [
    { min: 3500, reward: 'Free dessert' },
    { min: 2500, reward: 'Free fries' },
    { min: 1500, reward: 'Free drink' }
  ],
  // Staff incentive tiers (policy v1.0): [minCount, amount]
  incentives: {
    pizza: { label: 'Head chef · pizzas', tiers: [[11, 200], [16, 300], [21, 400]] },
    steak: { label: 'Kitchen · steak pool', tiers: [[11, 300], [15, 400], [20, 500]] },
    drink: { label: 'Servers · drinks pool', tiers: [[36, 200], [46, 300], [61, 400]] }
  },
  incentive_daily_cap: 1300
};
