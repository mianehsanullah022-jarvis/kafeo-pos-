// KAFEO starting menu (from KAFEO-Menu-FINAL-Print, 29 Oct 2026). Used to seed the database
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
const sl = (st, lg) => [...(st != null ? [{ k: 'S', p: st }] : []), { k: 'L', p: lg }];   // Standard / Large drinks
let n = 0;
const it = (cat, id, name, opts, extra = {}) => ({
  id, cat, name, opts, note: extra.note || '', station: extra.station || 'kitchen',
  counts: extra.counts || null, sort: ++n
});
const bar = (cat, id, name, opts, note) => it(cat, id, name, opts, { station: 'bar', counts: 'drink', note });

export const ITEMS = [
  it('deals', 'd1', 'Starter Boost', one(549), { note: 'Zinger + Coke' }),
  it('deals', 'd2', 'Buddy Boost', one(1049), { note: 'Zinger + Fiery Fillet + Coke 500ml' }),
  it('deals', 'd3', 'Pizza Power-Up', one(1249), { note: 'Tikka S + Crispy Wings + Mint Margretta' }),
  it('deals', 'd4', 'Pizza Combo', one(2499), { note: 'Kafeo M + Crispy Wings + Plain Fries + 2 Mint Margretta' }),
  it('deals', 'd5', 'Fries Frenzy', one(1999), { note: 'Tikka/Fajita L + Loaded Fries + 1.5L' }),
  it('deals', 'd6', 'Kafeo Gathering', one(3999), { note: 'Kafeo L, Loaded Fries, Hot & Crispy, Grill Sandwich, Nuggets, Coke 1.5L' }),
  it('deals', 'd7', 'Pizza Party Special', one(2999), { note: '2 L Tikka/Fajita + 2 dips + 1.5L' }),

  it('pizza', 'p1', 'Kafeo Special', sml(1100, 1649, 2549), { counts: 'pizza' }),
  it('pizza', 'p2', 'Chicken Supreme', sml(1049, 1599, 2399), { counts: 'pizza' }),
  it('pizza', 'p3', 'Peri Peri', sml(999, 1499, 2249), { counts: 'pizza' }),
  it('pizza', 'p4', 'Malai Boti', sml(849, 1449, 2149), { counts: 'pizza' }),
  it('pizza', 'p5', 'Tikka & Fajita', sml(799, 1249, 1999), { counts: 'pizza' }),
  it('pizza', 'p6', 'Sausage', sml(699, 1149, 1749), { counts: 'pizza' }),
  it('pizza', 'p7', 'Cheese Lover', sml(699, 1099, 1599), { counts: 'pizza' }),
  it('pizza', 'p8', 'Veggie Lover', sml(749, 1199, 1649), { counts: 'pizza' }),

  it('burgers', 'b1', 'Molten Lava', one(1099)),
  it('burgers', 'b2', 'Steak Burger', one(849)),
  it('burgers', 'b3', 'Out of Control', one(999)),
  it('burgers', 'b4', 'Swiss Mushroom', one(849)),
  it('burgers', 'b5', 'Fiery Fillet', one(699)),
  it('burgers', 'b6', 'Zinger', one(599)),
  it('burgers', 'b7', 'Hot & Crispy', one(599)),
  it('burgers', 'b8', 'Patty Burger', one(474)),

  it('steak', 's1', 'Mushroom Steak', one(1599), { counts: 'steak' }),
  it('steak', 's2', 'Jalapeno Steak', one(1449), { counts: 'steak' }),
  it('steak', 's3', 'Mexican Steak', one(1449), { counts: 'steak' }),
  it('steak', 's4', 'BBQ Steak', one(1299), { counts: 'steak' }),
  it('steak', 's5', 'Black Pepper Steak', one(1299), { counts: 'steak' }),
  it('steak', 's6', 'Baked Mushroom Pasta', one(1249)),
  it('steak', 's7', 'Red Sauce Pasta', one(1099)),
  it('steak', 's8', 'Alfredo', one(1199)),

  it('sand', 'w1', 'Cheese Lover Sandwich', one(849)),
  it('sand', 'w2', 'Cocktail Sandwich', one(899)),
  it('sand', 'w3', 'Club Sandwich', one(799)),
  it('sand', 'w4', 'Grilled Chicken Sandwich', one(749)),
  it('sand', 'w5', 'Grill Wrap', one(749)),
  it('sand', 'w6', 'Cheese Wrap', one(749)),
  it('sand', 'w7', 'Crunchy Wrap', one(699)),

  it('sides', 'f1', 'Loaded Fries', one(674)),
  it('sides', 'f2', 'Masala Fries', one(374)),
  it('sides', 'f3', 'Pizza Fries', one(825)),
  it('sides', 'f4', 'Jalapeno Cheese Fries', one(674)),
  it('sides', 'f5', 'Mayo Cheese Fries', one(674)),
  it('sides', 'f6', 'Garlic Mayo Fries', one(474)),
  it('sides', 'f7', 'Plain Fries', one(374)),
  it('sides', 'f8', 'Chicken Strips 4pc', one(574)),
  it('sides', 'f9', 'Nuggets 5pc', one(499)),
  it('sides', 'f10', 'Cheese Sticks 2pc', one(449)),
  it('sides', 'f11', 'Onion Rings 6pc', one(399)),
  it('sides', 'g1', 'Baked Wings 6pc', one(549)),
  it('sides', 'g2', 'Honey Wings 5pc', one(499)),
  it('sides', 'g3', 'Crispy Wings 6pc', one(549)),
  it('sides', 'g4', 'BBQ Wings 5pc', one(499)),

  bar('coffee', 'c1', 'Cappuccino', one(449)),
  bar('coffee', 'c2', 'Latte', one(499)),
  bar('coffee', 'c3', 'Espresso', one(345)),
  bar('coffee', 'c4', 'Long Black', one(345)),
  bar('coffee', 'c5', 'Kafeo Iced Latte', one(800), 'New launch'),
  bar('coffee', 'c6', 'Caramel Cloud Latte', one(800), 'New launch'),
  bar('coffee', 'c7', 'Chocolate Velvet Latte', one(800), 'New launch'),
  bar('coffee', 'c8', 'Caramel Coffee', sl(749, 800)),
  bar('coffee', 'c9', 'Oreo Coffee', sl(749, 800)),
  bar('coffee', 'c16', 'Lotus Coffee', sl(null, 950), 'Large only'),
  bar('coffee', 'c17', 'Mocha', one(399)),
  bar('coffee', 'c18', 'Hot Chocolate', one(549)),
  bar('coffee', 'c10', 'Karak Chai', one(325)),
  bar('coffee', 'c11', 'Cardamom Tea', one(325)),
  it('coffee', 'c14', 'Mix Karak', one(280), { counts: 'drink' }),
  it('coffee', 'c15', 'Mix Cardamom', one(300), { counts: 'drink' }),
  bar('coffee', 'c12', 'Kashmiri Chai', one(399)),
  bar('coffee', 'c13', 'Green Tea', one(150)),

  bar('drinks', 'k1', 'KitKat Shake', sl(699, 950)),
  bar('drinks', 'k2', 'Oreo Shake', sl(675, 800)),
  bar('drinks', 'k3', 'Vanilla Shake', sl(625, 700)),
  bar('drinks', 'k4', 'Chocolate Shake', sl(625, 700)),
  bar('drinks', 'k5', 'Strawberry Shake', sl(625, 700)),
  bar('drinks', 'k15', 'Lotus Biscoff Shake', sl(null, 900), 'Large only'),
  bar('drinks', 'k6', 'Jade Valley', sl(375, 500), 'Mocktail'),
  bar('drinks', 'k7', 'Crimson Mist', sl(399, 500), 'Mocktail'),
  bar('drinks', 'k8', 'Blond Bomb Shell', sl(375, 500), 'Mocktail'),
  bar('drinks', 'k16', 'Pink Zest', one(399), 'Mocktail · New'),
  bar('drinks', 'k17', 'Golden Fizz Mango Mojito', one(399), 'Mocktail · New'),
  bar('drinks', 'k18', 'Blueberry Lemon Spark', one(399), 'Mocktail · New'),
  bar('drinks', 'k9', 'Fresh Lime', sl(349, 375)),
  bar('drinks', 'k10', 'Mint Margarita', sl(349, 400)),
  bar('drinks', 'k11', 'Iced Peach Tea', sl(325, 400)),
  it('drinks', 'k12', 'Coke', [{ k: '345ml', p: 120 }, { k: '500ml', p: 160 }, { k: '1L', p: 260 }, { k: '1.5L', p: 320 }], { station: 'bar' }),
  it('drinks', 'k14', 'Sprite', [{ k: '345ml', p: 120 }, { k: '500ml', p: 160 }, { k: '1L', p: 260 }, { k: '1.5L', p: 320 }], { station: 'bar' }),
  it('drinks', 'k13', 'Water', [{ k: '500ml', p: 80 }, { k: '1.5L', p: 190 }], { station: 'bar' }),

  it('dessert', 'e1', 'Nutella Brownie', one(449)),
  it('dessert', 'e2', 'Belgian Chocolate Brownie', one(449)),
  it('dessert', 'e3', 'Nuts Brownie', one(449)),
  it('dessert', 'e5', 'Any Brownie + Ice Cream', one(599)),
  it('dessert', 'e4', 'Vanilla Ice Cream', one(350), { note: '2 scoops' }),

  it('addons', 'a1', 'Extra Cheese', sml(80, 150, 220), { note: 'Pizza topping' }),
  it('addons', 'a2', 'Extra Chicken', sml(90, 150, 220), { note: 'Pizza topping' }),
  it('addons', 'a3', 'Sausage Topping', sml(50, 90, 130), { note: 'Pizza topping' }),
  it('addons', 'a4', 'Cheese Slice', one(90)),
  it('addons', 'a5', 'Olives', one(59)),
  it('addons', 'a6', 'Jalapeno', one(59)),
  it('addons', 'a7', 'Mushrooms', one(69)),
  it('addons', 'a8', 'Chicken Patty', one(225)),
  it('addons', 'a9', 'Chicken Fillet', one(199)),
  it('addons', 'a10', 'Honey Mustard Dip', one(99)),
  it('addons', 'a11', 'Peri Peri Dip', one(99)),
  it('addons', 'a12', 'Garlic Mayo Sauce', one(89)),
  it('addons', 'a13', 'BBQ Sauce', one(89)),
  it('addons', 'a14', 'Chipotle Sauce', one(89)),
  it('addons', 'a15', 'Burger Sauce', one(89)),
  it('addons', 'a16', 'Creamy Mayo Sauce', one(89))
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
  day_start_hour: 6,             // business day runs 6 AM to 6 AM (late-night sales count for the same day)
  expense_types: ['Supplies', 'Groceries', 'Utilities', 'Salary / advance', 'Rent', 'Maintenance', 'Transport / fuel', 'Marketing', 'Other'],
  // suggestions for "Paid to" on the Expenses screen (KAFEO Vendor List)
  expense_vendors: ['Abbas LPG Gas', 'Accha Cheez', 'BBQ Vendor', 'Chicken', 'Chicken Tvental Market', 'Coke', 'Dawn', 'Dessert', 'Fresh Pota Fries',
    'Hico Ice Cream', 'Horeca Solution', 'Jalal Sons', "K&N's", 'Packing Vendor', 'Pasta Cream Vendor', 'Prema Milk', 'Printing Vendor',
    'Sabrosoo', 'Sawera Store', 'Vagi BBQ', 'Vegetable', 'Vines Ice'],
  paper: '80safe',               // '80safe' (64mm print), '80full' (72mm), '58' (46mm)
  print_offset_mm: 0,
  loyalty_stamps: 5,
  loyalty_discount_pct: 50,
  tables: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'H1', 'H2'],   // old flat list (kept for older saved settings)
  // KAFEO floor plan: 14 tables in the hall + 4 outdoor tables on the ground floor
  table_areas: [
    { name: 'Hall', tables: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12', 'H13', 'H14'] },
    { name: 'Outdoor (ground floor)', tables: ['O1', 'O2', 'O3', 'O4'] }
  ],
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
