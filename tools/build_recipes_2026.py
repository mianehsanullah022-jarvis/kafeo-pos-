#!/usr/bin/env python3
"""Build supabase/seed/kafeo_recipes_2026.sql from the parsed
"Reciepe Sheet - Updated 20-06-26" (blocks2026.json).

Usage: python3 tools/build_recipes_2026.py /path/to/blocks2026.json
Writes the SQL seed and prints a food-cost table.
"""
import json, re, sys, pathlib

BLOCKS = json.load(open(sys.argv[1]))
OUT = pathlib.Path(__file__).resolve().parent.parent / 'supabase/seed/kafeo_recipes_2026.sql'
SRC = 'Recipe Sheet 20-06-26'
RATE = 'Items Rate List (new)'

# name: (category, unit, cost, source)
STOCK = {
  # prepared in-house
  'Pizza dough': ('Prepared', 'g', 0.25, SRC),
  'Marinated chicken chunks': ('Prepared', 'g', 1.2, SRC),
  'Marinated chicken fillet': ('Prepared', 'g', 1.4, SRC),
  'Chicken patty (in-house)': ('Prepared', 'pcs', 67, SRC),
  'Saute veggies': ('Prepared', 'portion', 60, SRC),
  'Burger sauce': ('Prepared', 'g', 0.43, SRC),
  'Honey mustard sauce': ('Prepared', 'g', 0.8, SRC),
  'Garlic mayo sauce': ('Prepared', 'g', 0.7, SRC),
  'Peri peri sauce': ('Prepared', 'g', 0.75, SRC),
  'Zinger breading': ('Prepared', 'g', 0.2, SRC),
  # meat & frozen
  'Chicken patty K&N': ('Meat', 'g', 1.0, SRC),
  'Fiery fillet': ('Meat', 'pcs', 170, SRC),
  'Chicken thigh': ('Meat', 'g', 1.0, SRC),
  'Chicken wings': ('Meat', 'pcs', 25, SRC),
  'Chicken strips': ('Meat', 'pcs', 48, SRC),
  'Chicken nuggets': ('Meat', 'pcs', 25, SRC),
  'Tender pops': ('Meat', 'g', 1.2, SRC),
  'Sausages': ('Meat', 'g', 1.2, SRC),
  'Fries': ('Frozen', 'g', 0.38, SRC),
  'Cheese sticks': ('Frozen', 'pcs', 80, SRC),
  'Onion rings (frozen)': ('Frozen', 'pcs', 17, SRC),
  # dairy
  'Cheese': ('Dairy', 'g', 1.25, SRC),
  'Cheddar cheese': ('Dairy', 'g', 1.3, SRC),
  'Cheese slice': ('Dairy', 'pcs', 32, SRC),
  'Egg': ('Dairy', 'pcs', 40, SRC),
  'Milk': ('Dairy', 'ml', 0.3, SRC),
  'Cream': ('Dairy', 'ml', 1.2, SRC),
  'Butter': ('Dairy', 'g', 1.4, SRC),
  'Ice cream': ('Dairy', 'g', 0.92, SRC),
  # bakery
  'Potato bun': ('Bakery', 'pcs', 55, SRC),
  'Bread slice': ('Bakery', 'pcs', 18, SRC),
  'Tortilla wrap': ('Bakery', 'pcs', 40, SRC),
  # bought sauces
  'Pizza sauce': ('Sauces', 'g', 1.0, SRC),
  'BBQ sauce': ('Sauces', 'g', 0.75, SRC),
  'Creamy mayo': ('Sauces', 'g', 0.5, SRC),
  'Chipotle sauce': ('Sauces', 'g', 1.0, SRC),
  'Chilli garlic sauce': ('Sauces', 'g', 0.2, SRC),
  'Demi glace': ('Sauces', 'g', 2.4, SRC),
  'Ketchup (bulk)': ('Sauces', 'g', 0.6, SRC),
  # produce
  'Olives': ('Produce', 'g', 1.8, SRC),
  'Jalapeno': ('Produce', 'g', 1.0, SRC),
  'Mushroom': ('Produce', 'g', 1.8, SRC),
  'Onion': ('Produce', 'g', 0.3, SRC),
  'Capsicum': ('Produce', 'g', 0.4, SRC),
  'Tomato': ('Produce', 'g', 0.2, SRC),
  'Iceberg': ('Produce', 'g', 0.5, SRC),
  'Cucumber': ('Produce', 'g', 0.2, SRC),
  'Carrot': ('Produce', 'g', 0.5, SRC),
  'Garlic': ('Produce', 'g', 1.0, SRC),
  'Ginger': ('Produce', 'g', 1.0, SRC),
  'Green chilli': ('Produce', 'g', 0.2, SRC),
  'Raw onion (rings)': ('Produce', 'g', 0.3, SRC),
  'Mint': ('Produce', 'g', 0.5, SRC),
  # dry goods & spices
  'Fettuccine pasta': ('Dry goods', 'g', 1.2, SRC),
  'Bread crumbs': ('Dry goods', 'g', 0.5, SRC),
  'Pizza flour': ('Dry goods', 'g', 0.2, SRC),
  'Cooking oil': ('Dry goods', 'ml', 0.6, SRC),
  'Sugar': ('Dry goods', 'g', 0.2, SRC),
  'Black pepper': ('Spices', 'g', 2.8, SRC),
  'White pepper': ('Spices', 'g', 4.0, SRC),
  'Chicken powder': ('Spices', 'g', 1.5, SRC),
  'Oregano': ('Spices', 'g', 1.0, SRC),
  'Chilli flakes': ('Spices', 'g', 1.0, SRC),
  'Salt': ('Spices', 'g', 0.1, SRC),
  'Masala': ('Spices', 'g', 1.5, SRC),
  'Sesame seeds': ('Spices', 'g', 1.0, SRC),
  # bar
  'Coffee': ('Bar', 'g', 15, SRC),
  'Everyday powder': ('Bar', 'g', 2.0, SRC),
  'Coco powder': ('Bar', 'g', 2.3, SRC),
  'Karak chai powder': ('Bar', 'g', 2.2, SRC),
  'Cardamom chai powder': ('Bar', 'g', 2.2, SRC),
  'Tea bag': ('Bar', 'pcs', 15, SRC),
  'Dessert magic': ('Bar', 'g', 1.8, SRC),
  'Chocolate syrup': ('Bar', 'ml', 1.0, SRC),
  'Strawberry syrup': ('Bar', 'ml', 1.0, SRC),
  'Caramel syrup': ('Bar', 'ml', 1.0, SRC),
  'Kit Kat stick': ('Bar', 'pcs', 60, SRC),
  'Oreo biscuit': ('Bar', 'pcs', 8, SRC),
  'Lemon powder': ('Bar', 'g', 2.5, SRC),
  'Peach ice powder': ('Bar', 'g', 1.3, SRC),
  'Orange ice powder': ('Bar', 'g', 1.3, SRC),
  'Nestle apple juice': ('Bar', 'ml', 0.4, SRC),
  'Nestle pineapple juice': ('Bar', 'ml', 0.45, SRC),
  'Nestle mango juice': ('Bar', 'ml', 0.4, SRC),
  'Mineral water (bar)': ('Bar', 'ml', 0.12, SRC),
  # soft drinks & desserts
  'Coke/Sprite 345ml': ('Soft drinks', 'pcs', 65, RATE),
  'Coke/Sprite 500ml': ('Soft drinks', 'pcs', 80, RATE),
  'Coke/Sprite 1L': ('Soft drinks', 'pcs', 125, RATE),
  'Coke/Sprite 1.5L': ('Soft drinks', 'pcs', 155, RATE),
  'Water 500ml': ('Soft drinks', 'pcs', 38, RATE),
  'Water 1.5L': ('Soft drinks', 'pcs', 100, RATE),
  'Brownie': ('Desserts', 'pcs', 240, RATE),
  # packaging
  'Ketchup sachet': ('Packaging', 'pcs', 5, SRC),
  'Disposable cup': ('Packaging', 'pcs', 15, SRC),
  'Sugar sachet': ('Packaging', 'pcs', 2, SRC),
  'Stirrer': ('Packaging', 'pcs', 2, SRC),
}

# sheet spelling (lower-case, single spaces) -> stock name; None = not tracked
ALIAS = {
  'dough': 'Pizza dough', 'merinated chicken chunks': 'Marinated chicken chunks',
  'chicken tikka topping': 'Marinated chicken chunks',
  'merinated chicken fillet': 'Marinated chicken fillet', 'chicken petty': 'Chicken patty (in-house)',
  'saute vagies': 'Saute veggies', 'burger sauce': 'Burger sauce', 'burger suce': 'Burger sauce',
  'honey mustred': 'Honey mustard sauce', 'honey musterd': 'Honey mustard sauce',
  'garlic mayo sauce': 'Garlic mayo sauce', 'gm sauce': 'Garlic mayo sauce',
  'peri peri sauce': 'Peri peri sauce', 'zinger breading': 'Zinger breading',
  'chicken petty k&n': 'Chicken patty K&N', 'fiery fillet': 'Fiery fillet', 'chicken thigh': 'Chicken thigh',
  'chicken wings': 'Chicken wings', 'chicken strips 4 pcs': 'Chicken strips', 'chicken nuggets': 'Chicken nuggets',
  'tender pops': 'Tender pops', 'sausages': 'Sausages', 'fries': 'Fries', 'fries 50g': 'Fries', 'frise': 'Fries',
  'cheese stick 02': 'Cheese sticks', 'onion ring': 'Onion rings (frozen)',
  'cheese': 'Cheese', 'cheese shredded': 'Cheese', 'chedder cheese 30g': 'Cheddar cheese',
  'cheese slice': 'Cheese slice', 'cheez slice': 'Cheese slice', 'egg': 'Egg', 'fried egg': 'Egg',
  'milk': 'Milk', 'milkpak': 'Milk', 'cream': 'Cream', 'butter': 'Butter', 'yellow butter': 'Butter',
  'ice cream': 'Ice cream', 'potato bun': 'Potato bun', 'bread slice': 'Bread slice', 'tortilla wrap': 'Tortilla wrap',
  'pizza sauce': 'Pizza sauce', 'bbq sauce': 'BBQ sauce', 'creamy mayo': 'Creamy mayo',
  'chipotle sauce': 'Chipotle sauce', 'chilli garlic': 'Chilli garlic sauce', 'chili garlic': 'Chilli garlic sauce',
  'demi glace': 'Demi glace', 'ketchup': 'Ketchup (bulk)',
  'olives': 'Olives', 'olive': 'Olives', 'jalapeno': 'Jalapeno', 'jalapino': 'Jalapeno', 'jalepeno': 'Jalapeno',
  'mushroom': 'Mushroom', 'mushrooms': 'Mushroom', 'onion': 'Onion', 'capsicum': 'Capsicum', 'capcicum': 'Capsicum',
  'shimla': 'Capsicum', 'tomato': 'Tomato', 'tomatos': 'Tomato', 'tamatos': 'Tomato', 'ice burg': 'Iceberg',
  'cucumber': 'Cucumber', 'carrot': 'Carrot', 'garlic': 'Garlic', 'crush garlic': 'Garlic', 'ginger': 'Ginger',
  'green chili': 'Green chilli', 'raw onion rings': 'Raw onion (rings)', 'mint': 'Mint',
  'fettuccine pasta': 'Fettuccine pasta', 'bread crums': 'Bread crumbs', 'bread crums thin': 'Bread crumbs',
  'pizza floor': 'Pizza flour', 'cooking oil': 'Cooking oil', 'sugar': 'Sugar', 'suger': 'Sugar',
  'black pepper': 'Black pepper', 'black pepper crush': 'Black pepper', 'white pepper': 'White pepper',
  'white pepper crush': 'White pepper', 'chicken powder': 'Chicken powder', 'oregano': 'Oregano',
  'chilli flakes': 'Chilli flakes', 'chili flakes': 'Chilli flakes', 'salt': 'Salt', 'masala': 'Masala',
  'seasame seeds': 'Sesame seeds',
  'coffee': 'Coffee', 'everyday powder': 'Everyday powder', 'coco powder': 'Coco powder',
  'karak chai powder': 'Karak chai powder', 'cardmom chai powder': 'Cardamom chai powder', 'tea bag': 'Tea bag',
  'dessert magic': 'Dessert magic', 'chocolate syp': 'Chocolate syrup', 'strawbery syp': 'Strawberry syrup',
  'caramel syp': 'Caramel syrup', 'kit kat stick': 'Kit Kat stick', 'oreo biscuit': 'Oreo biscuit',
  'lemon powder': 'Lemon powder', 'peach ice powder': 'Peach ice powder', 'orange ice powder': 'Orange ice powder',
  'nestle apple juice': 'Nestle apple juice', 'nestle pineapple juice': 'Nestle pineapple juice',
  'nestle mango juice': 'Nestle mango juice', 'miniral water': 'Mineral water (bar)',
  'sprite': 'Coke/Sprite 345ml', 'sprite 345ml': 'Coke/Sprite 345ml',
  'ketchup sachet': 'Ketchup sachet', 'd. cup': 'Disposable cup', 'sugar sachet': 'Sugar sachet', 'stirrer': 'Stirrer',
  'ice': None, 'water': None,
}

def norm(s): return re.sub(r'\s+', ' ', s.strip().lower())

def block(title):
    for b in BLOCKS:
        if norm(b['title']) == norm(title): return b
    raise KeyError(title)

def lines(title, mult=1):
    out = {}
    for name, price, qty, _ in block(title)['rows']:
        key = norm(name)
        if key not in ALIAS: raise KeyError(f'{title}: unmapped ingredient {name!r}')
        s = ALIAS[key]
        if s is None or not qty: continue
        out[s] = out.get(s, 0) + qty * mult
    return out

def add(*parts):
    out = {}
    for p in parts:
        for k, v in p.items(): out[k] = out.get(k, 0) + v
    return out

# POS menu id + size -> sheet recipe title
SIMPLE = {
  ('k1', ''): 'Kit Kat Shake', ('k2', ''): 'Oreo Shake', ('k3', ''): 'Vanilla Ice Cream Shake',
  ('k4', ''): 'Chocolate Ice Cream Shake', ('k5', ''): 'Strawberry Ice Cream Shake',
  ('k6', ''): 'Jade Valley', ('k7', ''): 'Crimson Mist', ('k8', ''): 'Blond Bomb Shell',
  ('k9', ''): 'Fresh Lime', ('k10', ''): 'Mint Margretta', ('k11', ''): 'Iced Peach Tea',
  ('c1', ''): 'Cappuccino', ('c2', ''): 'Latte', ('c3', ''): 'Espresso', ('c4', ''): 'Long Black',
  ('c8', ''): 'Caramel Coffee', ('c9', ''): 'Orea Mocha', ('c10', ''): 'Karak Chai', ('c11', ''): 'Cardmom Tea',
  ('c13', ''): 'Green Tea',
  ('s1', ''): 'Premium Mushroom Steak', ('s2', ''): 'Premium Jalapeno Steak', ('s3', ''): 'Mexican Steak',
  ('s4', ''): 'BBQ Steak', ('s5', ''): 'Black Pepper Steak', ('s6', ''): 'Baked Mushroom Pasta',
  ('s7', ''): 'Red Sauce Pasta', ('s8', ''): 'Alfredo Pasta',
  ('b1', ''): 'Molten Lava Burger', ('b2', ''): 'Steak Burger', ('b3', ''): 'Out of Control Burger',
  ('b4', ''): 'Swiss Mashroom Burger', ('b5', ''): 'Fiery Fillet Burger', ('b6', ''): 'Zinger Burger',
  ('b7', ''): 'Hot & Crispy Burger', ('b8', ''): 'Petty Burger',
  ('w1', ''): 'Cheesy Lover', ('w2', ''): 'Cocktail Sandwich', ('w3', ''): 'Club Sandwich',
  ('w4', ''): 'Grilled Sandwich', ('w5', ''): 'Grilled Wrap', ('w6', ''): 'Cheesey Wrap', ('w7', ''): 'Crunchy Wrap',
  ('f1', ''): 'Loaded Fries', ('f2', ''): 'Masala Fries', ('f3', ''): 'Pizza Fries',
  ('f4', ''): 'Cheese Jalapeno Fries', ('f5', ''): 'Cheese Mayo Fries', ('f6', ''): 'Garlic Mayo Fries',
  ('f7', ''): 'Regular Fries', ('f8', ''): 'Chicken Strips 4 pcs', ('f9', ''): 'Chicken Nuggets 5 pcs',
  ('f10', ''): 'Cheese Sticks 2 pcs', ('f11', ''): 'Onion Rings 6 Pcs',
  ('g1', ''): 'Baked Wings 6 pcs', ('g2', ''): 'Honey Wings 5 pcs', ('g3', ''): 'Crispy Wings 6 pcs',
  ('g4', ''): 'BBQ Wings 5 pcs',
}
PIZZA = {'p1': 'KAFEO Special', 'p2': 'Supreme', 'p3': 'Peri Peri', 'p4': 'Malai Boti',
         'p5': 'Tikka', 'p6': 'Sausages', 'p7': 'Cheese Lover', 'p8': 'Veggies Lover'}
SIZE = {'S': 'Small', 'M': 'Medium', 'L': 'Large'}

R = {}
for key, title in SIMPLE.items(): R[key] = lines(title)
for pid, base in PIZZA.items():
    for k, word in SIZE.items(): R[(pid, k)] = lines(f'{base} {word}')

# Not on the 2026 sheet
# Kashmiri Tea: no recipe on file (Kitchen Recipe Book p.15) - left empty on purpose
for k in ('345ml', '500ml', '1L', '1.5L'): R[('k12', k)] = {f'Coke/Sprite {k}': 1}
for k in ('500ml', '1.5L'): R[('k13', k)] = {f'Water {k}': 1}
for e in ('e1', 'e2', 'e3'): R[(e, '')] = {'Brownie': 1}
R[('a4', '')] = {'Cheese slice': 1}
R[('a8', '')] = {'Chicken patty (in-house)': 1}
# Onion rings: the Kitchen Recipe Book adds 2 ketchup sachets
R[('f11', '')]['Ketchup sachet'] = 2
# Add-on portions from the KAFEO Kitchen Recipe Book (Add-on Portions table)
for k, g in zip('SML', (20, 40, 60)):
    R[('a1', k)] = {'Cheese': g}
    R[('a2', k)] = {'Marinated chicken chunks': g}
for k, g in zip('SML', (15, 30, 45)): R[('a3', k)] = {'Sausages': g}
R[('a5', '')] = {'Olives': 7}
R[('a6', '')] = {'Jalapeno': 7}
R[('a7', '')] = {'Mushroom': 15}
R[('a9', '')] = {'Marinated chicken fillet': 60}
R[('a10', '')] = {'Honey mustard sauce': 40}
R[('a11', '')] = {'Peri peri sauce': 40}

# Deals = their parts
S = lambda mid, opt='': R[(mid, opt)]
R[('d1', '')] = add(S('b6'), S('k12', '345ml'))
R[('d2', '')] = add(S('b6'), S('b5'), S('k12', '500ml'))
R[('d3', '')] = add(S('p5', 'S'), S('g3'), S('k10'))
R[('d4', '')] = add(S('p1', 'M'), S('g3'), S('f7'), S('k10'), S('k10'))
R[('d5', '')] = add(S('p5', 'L'), S('f1'), S('k12', '1.5L'))
R[('d6', '')] = add(S('p1', 'L'), S('f1'), S('b7'), S('w4'), S('f9'), S('k12', '1.5L'))
R[('d7', '')] = add(S('p5', 'L'), S('p5', 'L'), {'Honey mustard sauce': 60}, S('k12', '1.5L'))

# sanity: every used stock item exists
for key, rows in R.items():
    for s in rows:
        if s not in STOCK: raise KeyError(f'{key}: {s} not in STOCK')

def q(s): return "'" + s.replace("'", "''") + "'"
def num(x): return ('%.3f' % x).rstrip('0').rstrip('.')

sql = ['-- KAFEO stock items + recipes from "Reciepe Sheet - Updated 20-06-26" (generated by tools/build_recipes_2026.py).',
       '-- Replaces the 2023 recipe data. Safe only while no stock movements have been recorded.',
       'begin;',
       'do $$ begin if exists (select 1 from public.stock_moves) then',
       "  raise exception 'Stock movements already exist - not replacing stock items'; end if; end $$;",
       'delete from public.recipes;', 'delete from public.stock_items;',
       'insert into public.stock_items (name, category, unit, cost, supplier) values']
sql.append(',\n'.join(f'  ({q(n)}, {q(c)}, {q(u)}, {num(p)}, {q(src)})' for n, (c, u, p, src) in STOCK.items()) + ';')
sql.append('insert into public.recipes (menu_item_id, option_key, stock_item_id, qty)')
sql.append('select v.mid, v.opt, s.id, v.qty from (values')
vals = []
for (mid, opt), rows in R.items():
    for s, qty in rows.items(): vals.append(f'  ({q(mid)}, {q(opt)}, {q(s)}, {num(qty)})')
sql.append(',\n'.join(vals))
sql.append(') as v(mid, opt, sname, qty) join public.stock_items s on s.name = v.sname;')
sql.append('commit;')
OUT.write_text('\n'.join(sql) + '\n')

# report
menu = open(pathlib.Path(__file__).resolve().parent.parent / 'js/menu-seed.js').read()
price = {}
for m in re.finditer(r"'(\w+)', '([^']+)', (sml\(([\d, ]+)\)|one\((\d+)\)|\[[^\]]*\])", menu):
    mid = m.group(1)
    if m.group(4):
        for k, p in zip('SML', m.group(4).split(',')): price[(mid, k)] = (m.group(2), int(p))
    elif m.group(5): price[(mid, '')] = (m.group(2), int(m.group(5)))
    else:
        for k, p in re.findall(r"k: '([^']+)', p: (\d+)", m.group(3)): price[(mid, k)] = (m.group(2), int(p))
print(f'{len(STOCK)} stock items, {len(R)} recipes, {len(vals)} lines -> {OUT}')
for key, rows in R.items():
    cost = sum(STOCK[s][2] * qn for s, qn in rows.items())
    name, p = price.get(key, ('?', 0))
    print(f'{key[0]:>4} {key[1]:<6} {name:<26} cost {cost:7.1f}  price {p:5}  food {100*cost/p if p else 0:5.1f}%')
missing = [k for k in price if k not in R]
print('No recipe:', missing)
