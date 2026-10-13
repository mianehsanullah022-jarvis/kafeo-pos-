#!/usr/bin/env python3
"""KAFEO full inventory + recipes.

Stock list = everything KAFEO buys (ITEMS RATE LIST UPDATED New / Inventory sheet,
weekly stock lists, Crave Lab list) + the things the kitchen makes itself
(dough, toppings, sauces, patty). Recipes = KAFEO Kitchen Recipe Book (20-06-26),
pointed at those real stock names.

Usage: python3 tools/build_inventory.py   -> writes supabase/RUN-ME-inventory.sql
"""
import pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_recipes_2026 as book  # recipe-book quantities (sheet names)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'supabase/RUN-ME-inventory.sql'
RL, RS, WK = 'Rate list', 'Recipe sheet', 'Weekly list - enter cost'

# Stock list = KAFEO "Inventory sheet" (ITEMS RATE LIST UPDATED New) item for item, numbered as there,
# + the 6 rate-list items the sheet skips, + only what the Recipe Book needs that the sheet does not have.
# name: (category, unit, cost per unit, source)
STOCK = {}
def add(cat, *rows):
    for no, n, u, c in rows: STOCK[n] = (cat, u, c, f'Inventory sheet #{no}' if isinstance(no, int) else no)

RLO = 'Rate list (not on inventory sheet)'
BOOK = 'Needed by Recipe Book'
add('Spices', (1, 'Black pepper', 'g', 2.8), (2, 'White pepper', 'g', 3.6), (3, 'Red chilli', 'g', 0.9), (4, 'Chilli flakes', 'g', 0.9),
    (5, 'Tikka masala', 'g', 1.5), (6, 'Salt', 'g', 0.1), (7, 'Oregano', 'g', 1.6), (8, 'Chicken powder', 'g', 1.7),
    (9, 'Demi glace', 'g', 2.6), (10, 'Crispy coating', 'g', 1.7), (11, 'Ginger powder', 'g', 1.6), (12, 'Garlic powder', 'g', 1.4),
    (13, 'Chat masala', 'g', 1.5), (14, 'Kachri powder', 'g', 1.0))
add("K&N's", (15, 'Zinger thigh', 'g', 1.0), (16, 'Wings', 'g', 0.55), (17, 'Chicken strips', 'g', 1.15), (18, 'Chicken nuggets', 'g', 1.0),
    (19, 'Sausages', 'g', 1.2), (20, 'Fiery fillet', 'pcs', 190), (21, 'Crispy patty', 'pcs', 76), (22, 'Tender pops', 'g', 1.15))
add('Coke', (23, 'Coke 1.5L', 'pcs', 155), (RLO, 'Coke 1L', 'pcs', 125), (24, 'Coke 500ml', 'pcs', 80), (25, 'Coke 345ml', 'pcs', 65),
    (26, 'Sprite 1.5L', 'pcs', 155), (RLO, 'Sprite 1L', 'pcs', 125), (27, 'Sprite 500ml', 'pcs', 80), (28, 'Sprite 345ml', 'pcs', 60),
    (29, 'Water large', 'pcs', 100), (30, 'Water small', 'pcs', 38))
add('Horeca', (31, 'Creamy mayo', 'g', 0.5), (32, 'Real mayo', 'g', 0.65), (33, 'Chilli garlic ketchup', 'g', 0.22), (34, 'Pizza sauce', 'g', 1.0),
    (35, 'Ketchup sachet', 'pcs', 4), (36, 'Nurpur milk', 'ml', 0.35), (37, 'Cheese slice', 'pcs', 32), (38, 'Fettuccine pasta', 'g', 1.2),
    (39, 'Spring pasta', 'g', 0), (40, 'Lemon juice', 'ml', 0.5), (41, 'Vinegar', 'ml', 0.2), (42, 'Bread crumbs', 'g', 0.5),
    (43, 'Icing sugar', 'g', 0.35), (44, 'Pizza cheese', 'g', 1.2), (45, 'French fries', 'g', 0.36), (46, 'Sugar pack (sachet)', 'pcs', 2.5),
    (47, 'Dry yeast', 'g', 2.0), (48, 'Eka-300', 'g', 1.0), (49, 'Soya sauce', 'ml', 0.24), (50, 'Chilli sauce', 'ml', 0.24),
    (51, 'Pizza flour', 'g', 0.16), (52, 'Dalda oil', 'ml', 0.6), (53, 'Honey', 'g', 1.0), (54, 'Eggs', 'pcs', 30),
    (55, 'Mustard paste', 'g', 2.0), (56, 'Green tea', 'pcs', 8), (57, 'Tea', 'g', 2.2), (58, 'Butter', 'g', 1.35),
    (59, 'Brownies (nuts)', 'pcs', 240), (60, 'Black olives', 'g', 1.8), (61, 'Jalapeno', 'g', 1.0), (62, 'Mushrooms', 'g', 1.8),
    (63, 'Cardamom', 'g', 13), (64, 'BBQ sauce', 'g', 0.88), (65, 'Grill patty', 'pcs', 70), (66, 'Peri peri sauce', 'g', 1.0))
add('Disposable', (67, 'Dips', 'pcs', 4), (68, 'Cold cups', 'pcs', 10), (69, 'Hot cups', 'pcs', 10), (70, 'Bin liner', 'g', 0.5),
    (71, 'Food bag (S)', 'pcs', 6), (72, 'Food bag (L)', 'pcs', 12), (73, 'F1 packing', 'pcs', 12), (74, 'F2 packing', 'pcs', 25),
    (75, 'Pizza table', 'pcs', 3), (76, 'Spoon small', 'pcs', 1.2), (77, 'Spoon large', 'pcs', 1.5), (78, 'Disposable fork', 'pcs', 2),
    (79, 'Disposable knife', 'pcs', 2), (80, 'Straw', 'pcs', 1), (81, 'Takeaway bag', 'g', 0.8), (82, 'Tissue', 'pcs', 2),
    (83, 'Pizza box (L)', 'pcs', 25), (84, 'Pizza box (M)', 'pcs', 18), (85, 'Pizza box (S)', 'pcs', 12),
    (RLO, 'Cling film', 'roll', 450), (RLO, 'Disposable glass', 'pcs', 2.5), (RLO, 'Butter paper', 'kg', 850))
add('Bar', (90, 'Apple juice', 'ml', 0.33), (91, 'Pineapple juice', 'ml', 0.46), (92, 'Chaunsa juice', 'ml', 0.37),
    (93, 'Lemon powder', 'g', 2.75), (94, 'Sugar', 'g', 0.2), (95, 'Black salt', 'g', 0.2), (96, 'Oreo biscuit', 'pcs', 10),
    (97, 'Syrup topping', 'ml', 1.05), (98, 'KitKat', 'pcs', 60), (99, 'Ice cream', 'g', 1.0))
add('Nestle', (103, 'Dry milk', 'g', 2.0), (104, 'Coffee', 'g', 17), (105, 'Karak chai', 'g', 2.4), (106, 'Cardamom chai', 'g', 2.24),
    (108, 'Peach powder', 'g', 1.36), (109, 'Orange powder', 'g', 1.26), (110, 'Dessert magic', 'g', 1.76), (111, 'Cream', 'ml', 1.15))
add('Veggies', (115, 'Shimla', 'g', 0.22), (116, 'Onion', 'g', 0.1), (117, 'Tomato', 'g', 0.25), (118, 'Iceberg', 'g', 0.4),
    (119, 'Garlic', 'g', 0.5), (120, 'Ginger', 'g', 0.5), (121, 'Green chilli', 'g', 0.2), (122, 'Carrot', 'g', 0.14),
    (123, 'Maarru', 'g', 0.25), (124, 'Mint', 'g', 0.5), (125, 'Cucumber', 'g', 0.1))
add('Dawn', (126, 'Bun 4 inch', 'pcs', 30), (127, 'Brioche bun', 'pcs', 0), (128, 'Bread slice', 'pcs', 18), (129, 'Tortilla', 'pcs', 43),
    (RLO, 'Potato bun', 'pcs', 55))
add('Dessert', (130, 'Nutella brownie', 'pcs', 240), (131, 'Belgian brownie', 'pcs', 240))
# Recipe Book needs these and the inventory sheet has no line for them
add('Recipe extras', (BOOK + ' (Cheese Sticks)', 'Cheddar cheese', 'g', 1.3), (BOOK + ' (Fiery Fillet burger)', 'Chipotle sauce', 'g', 1.0),
    (BOOK + ' (Honey/BBQ wings)', 'Sesame seeds', 'g', 0.65), (BOOK + ' (hot drinks)', 'Stirrer', 'pcs', 2),
    (BOOK + ' (Cappuccino/Latte)', 'Whitening powder', 'g', 2.0))
# toppings the kitchen makes and counts daily (Inventory Consumption report)
add('Toppings (kitchen-made)', ('Consumption report #3', 'Tikka topping', 'g', 1.2), ('Consumption report #4', 'Fajita topping', 'g', 1.2),
    ('Consumption report #5', 'Malai boti', 'g', 1.2), ('Consumption report #6', 'Chicken fillet', 'g', 1.4))

# Kitchen-made things that are NOT stock lines: a sale takes their raw ingredients instead (Recipe Book batches).
def per(batch):
    tot = sum(v for k, v in batch.items() if not k.startswith('_')) + batch.get('_extra', 0)
    return {k: v / tot for k, v in batch.items() if not k.startswith('_')}
DOUGH = {'Pizza flour': 1000, 'Dalda oil': 50, 'Icing sugar': 20, 'Dry milk': 20, 'Dry yeast': 14, 'Eka-300': 10, 'Salt': 10, '_extra': 420 + 50}
DOUGH_PER_G = per(DOUGH); DOUGH_PER_G['Eggs'] = 1 / 1544          # 1 kg flour batch = about 1.5 kg dough, 1 egg
EXPAND = {
    'Pizza dough': DOUGH_PER_G,
    'Burger sauce': per({'Creamy mayo': 1000, 'Chilli garlic ketchup': 400}),
    'Honey mustard sauce': per({'Real mayo': 1000, 'Honey': 65, 'Mustard paste': 65, 'Black pepper': 3}),
    'Garlic mayo sauce': per({'Real mayo': 1000, 'Garlic': 50, 'Oregano': 3}),
    'Peri peri sauce (house)': per({'Real mayo': 1000, 'Peri peri sauce': 260, 'Chilli garlic ketchup': 120, 'Chilli flakes': 8, 'Oregano': 4}),
    # 1 portion = 80 g mixed veggies + 10 g butter + 3 g salt + 3 g black pepper (veg split assumed: carrot / shimla / maarru)
    'Saute veggies': {'Carrot': 30, 'Shimla': 25, 'Maarru': 25, 'Butter': 10, 'Salt': 3, 'Black pepper': 3},
    # zinger breading = flour + crispy coating (mix assumed 9 : 1)
    'Zinger breading': {'Pizza flour': 0.9, 'Crispy coating': 0.1},
}

# recipe-book name -> stock name (or (stock name, stock units per book unit))
MAP = {
    'Pizza dough': 'Pizza dough', 'Marinated chicken fillet': 'Chicken fillet',
    'Chicken patty (in-house)': 'Grill patty', 'Saute veggies': 'Saute veggies',
    'Burger sauce': 'Burger sauce', 'Honey mustard sauce': 'Honey mustard sauce', 'Garlic mayo sauce': 'Garlic mayo sauce',
    'Peri peri sauce': 'Peri peri sauce (house)', 'Zinger breading': 'Zinger breading',
    'Chicken patty K&N': ('Crispy patty', 1 / 80),        # 80 g = 1 K&N patty
    'Fiery fillet': 'Fiery fillet', 'Chicken thigh': 'Zinger thigh',
    'Chicken wings': ('Wings', 40), 'Chicken strips': ('Chicken strips', 40), 'Chicken nuggets': ('Chicken nuggets', 25),
    'Tender pops': 'Tender pops', 'Sausages': 'Sausages', 'Fries': 'French fries',
    'Cheese': 'Pizza cheese', 'Cheddar cheese': 'Cheddar cheese', 'Cheese slice': 'Cheese slice', 'Egg': 'Eggs',
    'Milk': 'Nurpur milk', 'Cream': 'Cream', 'Butter': 'Butter',
    'Potato bun': 'Potato bun', 'Bread slice': 'Bread slice', 'Tortilla wrap': 'Tortilla',
    'Pizza sauce': 'Pizza sauce', 'BBQ sauce': 'BBQ sauce', 'Creamy mayo': 'Creamy mayo', 'Chipotle sauce': 'Chipotle sauce',
    'Chilli garlic sauce': 'Chilli garlic ketchup', 'Demi glace': 'Demi glace', 'Ketchup (bulk)': 'Chilli garlic ketchup',
    'Olives': 'Black olives', 'Jalapeno': 'Jalapeno', 'Mushroom': 'Mushrooms', 'Onion': 'Onion',
    'Capsicum': 'Shimla', 'Tomato': 'Tomato', 'Iceberg': 'Iceberg', 'Cucumber': 'Cucumber', 'Carrot': 'Carrot',
    'Garlic': 'Garlic', 'Ginger': 'Ginger', 'Green chilli': 'Green chilli', 'Raw onion (rings)': 'Onion', 'Mint': 'Mint',
    'Fettuccine pasta': 'Fettuccine pasta', 'Bread crumbs': 'Bread crumbs', 'Pizza flour': 'Pizza flour',
    'Cooking oil': 'Dalda oil', 'Sugar': 'Sugar', 'Black pepper': 'Black pepper', 'White pepper': 'White pepper',
    'Chicken powder': 'Chicken powder', 'Oregano': 'Oregano', 'Chilli flakes': 'Chilli flakes', 'Salt': 'Salt',
    'Masala': 'Chat masala', 'Sesame seeds': 'Sesame seeds',
    'Coffee': 'Coffee', 'Everyday powder': 'Whitening powder', 'Karak chai powder': 'Karak chai',
    'Cardamom chai powder': 'Cardamom chai', 'Tea bag': 'Green tea', 'Dessert magic': 'Dessert magic',
    'Chocolate syrup': 'Syrup topping', 'Strawberry syrup': 'Syrup topping', 'Caramel syrup': 'Syrup topping',
    'Kit Kat stick': 'KitKat', 'Oreo biscuit': 'Oreo biscuit', 'Lemon powder': 'Lemon powder',
    'Peach ice powder': 'Peach powder', 'Orange ice powder': 'Orange powder', 'Nestle apple juice': 'Apple juice',
    'Nestle pineapple juice': 'Pineapple juice', 'Nestle mango juice': 'Chaunsa juice',
    'Mineral water (bar)': ('Water small', 1 / 500),
    'Coke/Sprite 345ml': 'Sprite 345ml',                   # only the mocktails use it from the book
    'Ketchup sachet': 'Ketchup sachet', 'Disposable cup': 'Hot cups', 'Sugar sachet': 'Sugar pack (sachet)', 'Stirrer': 'Stirrer',
    'Ice cream': 'Ice cream',
}

def conv(rows, over=None):
    out = {}
    for n, q in rows.items():
        if over and n in over: n2, f = over[n], 1
        else:
            m = MAP[n]; n2, f = (m, 1) if isinstance(m, str) else m
        for n3, f3 in (EXPAND[n2].items() if n2 in EXPAND else [(n2, 1)]):
            out[n3] = round(out.get(n3, 0) + q * f * f3, 4)
    return out

TOPPING = {'p1': 'Tikka topping', 'p2': 'Tikka topping', 'p3': 'Tikka topping', 'p4': 'Malai boti',
           'p5': 'Tikka topping', 'f3': 'Tikka topping'}
R = {}
for (mid, opt), rows in book.R.items():
    if mid.startswith('d') or mid in ('k12', 'k13', 'e1', 'e2', 'e3', 'b1'): continue
    over = {}
    if 'Marinated chicken chunks' in rows: over['Marinated chicken chunks'] = TOPPING.get(mid, 'Tikka topping')
    R[(mid, opt)] = conv(rows, over)
def plus(*parts):
    out = {}
    for p in parts:
        for k, v in p.items(): out[k] = round(out.get(k, 0) + v, 4)
    return out
def scale(rows, f, drop=('Ketchup sachet',)): return {k: v * f for k, v in rows.items() if k not in drop}
# Molten Lava: its 2 cheese sticks and 2 onion rings are made in-house (Cheese Sticks 2 pcs, Onion Rings 6 pcs recipes)
lava = {k: v for k, v in book.R[('b1', '')].items() if k not in ('Cheese sticks', 'Onion rings (frozen)')}
R[('b1', '')] = plus(conv(lava), scale(R[('f10', '')], 1), scale(R[('f11', '')], 2 / 6))
# brownies by type, soft drinks by brand
R[('e1', '')] = {'Nutella brownie': 1}; R[('e2', '')] = {'Belgian brownie': 1}; R[('e3', '')] = {'Brownies (nuts)': 1}
R[('k13', '500ml')] = {'Water small': 1}; R[('k13', '1.5L')] = {'Water large': 1}
SIZES = ('345ml', '500ml', '1L', '1.5L')
for s in SIZES:
    R[('k12', s)] = {f'Coke {s}': 1}
    R[('k14', s)] = {f'Sprite {s}': 1}
S = lambda mid, opt='': R[(mid, opt)]
R[('d1', '')] = plus(S('b6'), {'Coke 345ml': 1})
R[('d2', '')] = plus(S('b6'), S('b5'), {'Coke 500ml': 1})
R[('d3', '')] = plus(S('p5', 'S'), S('g3'), S('k10'))
R[('d4', '')] = plus(S('p1', 'M'), S('g3'), S('f7'), S('k10'), S('k10'))
R[('d5', '')] = plus(S('p5', 'L'), S('f1'), {'Coke 1.5L': 1})
R[('d6', '')] = plus(S('p1', 'L'), S('f1'), S('b7'), S('w4'), S('f9'), {'Coke 1.5L': 1})
R[('d7', '')] = plus(S('p5', 'L'), S('p5', 'L'), conv({'Honey mustard sauce': 60}), {'Dips': 2}, {'Coke 1.5L': 1})
for key in R: R[key] = {k: round(v, 4) for k, v in R[key].items() if round(v, 4) > 0}

for key, rows in R.items():
    for s in rows:
        if s not in STOCK: raise KeyError(f'{key}: {s}')

DRINK_OPTS = [{'k': s, 'p': p} for s, p in zip(SIZES, (100, 150, 220, 300))]

def q(s): return "'" + str(s).replace("'", "''") + "'"
def num(x): return ('%.4f' % x).rstrip('0').rstrip('.')

if __name__ == '__main__':
    import json
    stock_sql = ',\n'.join(f'({q(n)},{q(c)},{q(u)},{num(p)},{q(src)})' for n, (c, u, p, src) in STOCK.items())
    rec = ';'.join(f'{m}|{o}|' + ','.join(f'{n}={num(v)}' for n, v in rows.items()) for (m, o), rows in R.items())
    sql = f"""-- KAFEO full inventory (everything KAFEO buys + kitchen-made items) and all menu recipes.
-- Generated by tools/build_inventory.py. Paste the whole file into Supabase > SQL Editor > Run.
-- Stock already entered (stock in, counts, waste) is kept and moved onto the new list by item name.
-- If an entered item has no match in the new list, it stops without changing anything.
begin;
create temp table keep_moves on commit drop as
  select m.created_at, m.change, m.kind, m.note, m.order_id, m.unit_cost, m.by_name, s.name
  from public.stock_moves m join public.stock_items s on s.id = m.stock_item_id;
-- Coke and Sprite become two separate menu items (same sizes and prices) so stock knows which was sold
update public.menu_items set name = 'Coke', options = {q(json.dumps(DRINK_OPTS))}::jsonb where id = 'k12';
insert into public.menu_items (id, category_id, name, note, options, station, counts, active, sort)
select 'k14', category_id, 'Sprite', '', {q(json.dumps(DRINK_OPTS))}::jsonb, station, counts, true, sort
from public.menu_items where id = 'k12'
on conflict (id) do update set name = excluded.name, options = excluded.options, active = true;
delete from public.recipes;
delete from public.stock_moves;
delete from public.stock_items;
insert into public.stock_items (name, category, unit, cost, supplier) values
{stock_sql};
do $$ declare missing text; begin
  select string_agg(distinct k.name, ', ') into missing from keep_moves k
   where not exists (select 1 from public.stock_items s where s.name = k.name);
  if missing is not null then raise exception 'These items have stock entered but are not in the new list: %', missing; end if;
end $$;
insert into public.stock_moves (created_at, stock_item_id, change, kind, note, order_id, unit_cost, by_name)
select k.created_at, s.id, k.change, k.kind, k.note, k.order_id, k.unit_cost, k.by_name
from keep_moves k join public.stock_items s on s.name = k.name order by k.created_at;
with r as (select split_part(x, '|', 1) mid, split_part(x, '|', 2) opt, split_part(x, '|', 3) ings
           from unnest(string_to_array({q(rec)}, ';')) x),
     l as (select mid, opt, split_part(i, '=', 1) sname, split_part(i, '=', 2)::numeric qty
           from r, unnest(string_to_array(ings, ',')) i)
insert into public.recipes (menu_item_id, option_key, stock_item_id, qty)
select l.mid, l.opt, s.id, l.qty from l join public.stock_items s on s.name = l.sname;
commit;
select (select count(*) from public.stock_items) as stock_items,
       (select count(distinct (menu_item_id, option_key)) from public.recipes) as recipes,
       (select count(*) from public.recipes) as recipe_lines,
       (select count(*) from public.stock_moves) as stock_entries_kept;
"""
    OUT.write_text(sql)
    js = ['// KAFEO stock list + recipes (generated by tools/build_inventory.py — edit that, not this file).',
          '// Used by Inventory > "Load KAFEO stock & recipes".',
          '// [name, category, unit, cost per unit, source]',
          'export const KAFEO_STOCK = ' + json.dumps([[n, c, u, p, src] for n, (c, u, p, src) in STOCK.items()], ensure_ascii=False) + ';',
          "// 'menuId|size': [[stock name, qty], ...]",
          'export const KAFEO_RECIPES = ' + json.dumps({f'{m}|{o}': [[n, v] for n, v in rows.items()] for (m, o), rows in R.items()}, ensure_ascii=False) + ';',
          'export const DRINK_SIZES = ' + json.dumps(DRINK_OPTS) + ';']
    (ROOT / 'js/kafeo-inventory.js').write_text('\n'.join(js) + '\n')
    used = {s for rows in R.values() for s in rows}
    print(f'{len(STOCK)} stock items ({len(used)} used by recipes), {len(R)} recipes, '
          f'{sum(len(r) for r in R.values())} lines -> {OUT.name} ({len(sql)} bytes)')
    cats = {}
    for n, (c, *_r) in STOCK.items(): cats[c] = cats.get(c, 0) + 1
    print(cats)
    for key in [('p1', 'L'), ('b1', ''), ('b6', ''), ('g3', ''), ('k4', ''), ('d1', ''), ('s5', '')]:
        print(key, round(sum(STOCK[s][2] * v for s, v in R[key].items()), 1), R[key] if key in (('p1','L'),('b1','')) else '')
    print('unused:', [n for n in STOCK if n not in used])
