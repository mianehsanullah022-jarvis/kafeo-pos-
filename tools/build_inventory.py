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

# name: (category, unit, cost per unit, source)
STOCK = {}
def add(cat, src, *rows):
    for n, u, c in rows: STOCK[n] = (cat, u, c, src)

add('Spices', RL,
    ('Black pepper', 'g', 2.8), ('White pepper', 'g', 3.6), ('Red chilli', 'g', 0.9), ('Chilli flakes', 'g', 0.9),
    ('Tikka masala', 'g', 1.5), ('Salt', 'g', 0.1), ('Oregano', 'g', 1.6), ('Chicken powder', 'g', 1.7),
    ('Demi glace', 'g', 2.6), ('Crispy coating', 'g', 1.7), ('Ginger powder', 'g', 1.6), ('Garlic powder', 'g', 1.4),
    ('Chat masala', 'g', 1.5), ('Kachri powder', 'g', 1.0), ('Black salt', 'g', 0.2), ('Cardamom (whole)', 'g', 13))
add('Spices', WK, ('Paprika powder', 'g', 0), ('Zeera powder', 'g', 0), ('Dhaniya powder', 'g', 0), ('Garam masala', 'g', 0))
add('Spices', 'Crave Lab list', ('Sesame seeds (white)', 'g', 0.65))
add("K&N's", RL,
    ('Zinger thigh', 'g', 1.0), ('Wings', 'g', 0.55), ('Chicken strips', 'g', 1.15), ('Chicken nuggets', 'g', 1.0),
    ('Sausages', 'g', 1.2), ('Fiery fillet', 'pcs', 190), ('Crispy patty', 'pcs', 76), ('Tender pops', 'g', 1.15))
add('Chicken', 'Crave Lab list', ('Boneless chicken', 'g', 0.93))
add('Chicken', RS, ('Neck qeema', 'g', 0.5))
add('Soft drinks', RL,
    ('Coke 345ml', 'pcs', 65), ('Coke 500ml', 'pcs', 80), ('Coke 1L', 'pcs', 125), ('Coke 1.5L', 'pcs', 155),
    ('Sprite 345ml', 'pcs', 60), ('Sprite 500ml', 'pcs', 80), ('Sprite 1L', 'pcs', 125), ('Sprite 1.5L', 'pcs', 155),
    ('Water small (500ml)', 'pcs', 38), ('Water large (1.5L)', 'pcs', 100))
add('Horeca', RL,
    ('Creamy mayo', 'g', 0.5), ('Real mayo', 'g', 0.65), ('Chilli garlic ketchup', 'g', 0.22), ('Pizza sauce', 'g', 1.0),
    ('Ketchup sachet', 'pcs', 4), ('Nurpur milk', 'ml', 0.35), ('Cheese slice', 'pcs', 32), ('Fettuccine pasta', 'g', 1.2),
    ('Spring pasta', 'g', 0), ('Lemon juice', 'ml', 0.5), ('Vinegar', 'ml', 0.2), ('Bread crumbs', 'g', 0.5),
    ('Icing sugar', 'g', 0.35), ('Pizza cheese', 'g', 1.2), ('French fries', 'g', 0.36), ('Sugar sachet', 'pcs', 2.5),
    ('Dry yeast', 'g', 2.0), ('Eka-300', 'g', 1.0), ('Soya sauce', 'ml', 0.24), ('Chilli sauce', 'ml', 0.24),
    ('Pizza flour', 'g', 0.16), ('Dalda oil', 'ml', 0.6), ('Honey', 'g', 1.0), ('Eggs', 'pcs', 30),
    ('Mustard paste', 'g', 2.0), ('Butter', 'g', 1.35), ('Black olives', 'g', 1.8), ('Jalapeno', 'g', 1.0),
    ('Mushrooms', 'g', 1.8), ('BBQ sauce', 'g', 0.88), ('Peri peri sauce (bottle)', 'g', 1.0),
    ('Grill patty (chicken)', 'pcs', 70))
add('Horeca', 'Crave Lab list', ('Bologna slices', 'pack', 636))
add('Horeca', RS, ('Chipotle sauce', 'g', 1.0), ('Cheddar cheese', 'g', 1.3), ('Ketchup (bulk)', 'g', 0.6),
    ('Cheese sticks (frozen)', 'pcs', 80), ('Onion rings (frozen)', 'pcs', 17))
add('Disposable', RL,
    ('Dips', 'pcs', 4), ('Cold cups', 'pcs', 10), ('Hot cups', 'pcs', 10), ('Bin liner', 'g', 0.5),
    ('Food bag (S)', 'pcs', 6), ('Food bag (L)', 'pcs', 12), ('F1 packing', 'pcs', 12), ('F2 packing', 'pcs', 25),
    ('Pizza table', 'pcs', 3), ('Spoon small', 'pcs', 1.2), ('Spoon large', 'pcs', 1.5), ('Disposable fork', 'pcs', 2),
    ('Disposable knife', 'pcs', 2), ('Straw', 'pcs', 1), ('Takeaway bag', 'g', 0.8), ('Tissue', 'pcs', 2),
    ('Pizza box (L)', 'pcs', 25), ('Pizza box (M)', 'pcs', 18), ('Pizza box (S)', 'pcs', 12),
    ('Cling film', 'roll', 450), ('Disposable glass', 'pcs', 2.5), ('Butter paper', 'kg', 850))
add('Disposable', RS, ('Stirrer', 'pcs', 2))
add('Disposable', 'Crave Lab list', ('Aluminium foil', 'roll', 0), ('Gloves', 'box', 850))
add('Bar', RL,
    ('Apple juice', 'ml', 0.33), ('Pineapple juice', 'ml', 0.46), ('Chaunsa (mango) juice', 'ml', 0.37),
    ('Lemon powder', 'g', 2.75), ('Sugar', 'g', 0.2), ('Oreo biscuit', 'pcs', 10), ('KitKat stick', 'pcs', 60),
    ('Vanilla ice cream', 'g', 1.0), ('Chocolate ice cream', 'g', 1.0), ('Strawberry ice cream', 'g', 1.0),
    ('Chocolate topping', 'ml', 1.05), ('Caramel topping', 'ml', 1.05), ('Strawberry topping', 'ml', 1.05),
    ('Mint', 'g', 0.5), ('Ice', 'kg', 0))
add('Nestle', RL,
    ('Dry milk', 'g', 2.0), ('Coffee', 'g', 17), ('Karak chai', 'g', 2.4), ('Cardamom chai', 'g', 2.24),
    ('Peach powder', 'g', 1.36), ('Orange powder', 'g', 1.26), ('Dessert magic', 'g', 1.76),
    ('Whitening powder (Everyday)', 'g', 2.0), ('Cream (200ml pack)', 'ml', 1.15), ('Green tea (bags)', 'pcs', 8),
    ('Tea (loose)', 'g', 2.2))
add('Veggies', RL,
    ('Shimla (capsicum)', 'g', 0.22), ('Onion', 'g', 0.1), ('Tomato', 'g', 0.25), ('Iceberg', 'g', 0.4),
    ('Garlic', 'g', 0.5), ('Ginger', 'g', 0.5), ('Green chilli', 'g', 0.2), ('Carrot', 'g', 0.14),
    ('Maarru', 'g', 0.25), ('Cucumber', 'g', 0.1))
add('Dawn (bakery)', RL, ('Potato bun', 'pcs', 55), ('Bun 4 inch', 'pcs', 30), ('Brioche bun', 'pcs', 0),
    ('Bread slice', 'pcs', 18), ('Tortilla', 'pcs', 43))
add('Desserts', RL, ('Nutella brownie', 'pcs', 240), ('Belgian brownie', 'pcs', 240), ('Nuts brownie', 'pcs', 240))
add('Cleaning & other', 'Crave Lab list', ('Dusters', 'kg', 400), ('Match box', 'pack', 50))
# made in the KAFEO kitchen (cost per unit from the recipe sheet)
add('Kitchen-made', RS,
    ('Pizza dough', 'g', 0.25), ('Tikka topping', 'g', 1.2), ('Fajita topping', 'g', 1.2), ('Malai boti topping', 'g', 1.2),
    ('Chicken fillet (marinated)', 'g', 1.4), ('Zinger breading', 'g', 0.2),
    ('Saute veggies', 'portion', 60), ('Burger sauce', 'g', 0.43), ('Honey mustard sauce', 'g', 0.8),
    ('Garlic mayo sauce', 'g', 0.7), ('Peri peri sauce (house)', 'g', 0.75))

# recipe-book name -> real stock name, and how many stock units one book unit is
MAP = {
    'Pizza dough': 'Pizza dough', 'Marinated chicken fillet': 'Chicken fillet (marinated)',
    'Chicken patty (in-house)': 'Grill patty (chicken)', 'Saute veggies': 'Saute veggies',
    'Burger sauce': 'Burger sauce', 'Honey mustard sauce': 'Honey mustard sauce', 'Garlic mayo sauce': 'Garlic mayo sauce',
    'Peri peri sauce': 'Peri peri sauce (house)', 'Zinger breading': 'Zinger breading',
    'Chicken patty K&N': ('Crispy patty', 1 / 80),        # 80 g = 1 K&N patty
    'Fiery fillet': 'Fiery fillet', 'Chicken thigh': 'Zinger thigh',
    'Chicken wings': ('Wings', 40), 'Chicken strips': ('Chicken strips', 40), 'Chicken nuggets': ('Chicken nuggets', 25),
    'Tender pops': 'Tender pops', 'Sausages': 'Sausages', 'Fries': 'French fries',
    'Cheese sticks': 'Cheese sticks (frozen)', 'Onion rings (frozen)': 'Onion rings (frozen)',
    'Cheese': 'Pizza cheese', 'Cheddar cheese': 'Cheddar cheese', 'Cheese slice': 'Cheese slice', 'Egg': 'Eggs',
    'Milk': 'Nurpur milk', 'Cream': 'Cream (200ml pack)', 'Butter': 'Butter',
    'Potato bun': 'Potato bun', 'Bread slice': 'Bread slice', 'Tortilla wrap': 'Tortilla',
    'Pizza sauce': 'Pizza sauce', 'BBQ sauce': 'BBQ sauce', 'Creamy mayo': 'Creamy mayo', 'Chipotle sauce': 'Chipotle sauce',
    'Chilli garlic sauce': 'Chilli garlic ketchup', 'Demi glace': 'Demi glace', 'Ketchup (bulk)': 'Ketchup (bulk)',
    'Olives': 'Black olives', 'Jalapeno': 'Jalapeno', 'Mushroom': 'Mushrooms', 'Onion': 'Onion',
    'Capsicum': 'Shimla (capsicum)', 'Tomato': 'Tomato', 'Iceberg': 'Iceberg', 'Cucumber': 'Cucumber', 'Carrot': 'Carrot',
    'Garlic': 'Garlic', 'Ginger': 'Ginger', 'Green chilli': 'Green chilli', 'Raw onion (rings)': 'Onion', 'Mint': 'Mint',
    'Fettuccine pasta': 'Fettuccine pasta', 'Bread crumbs': 'Bread crumbs', 'Pizza flour': 'Pizza flour',
    'Cooking oil': 'Dalda oil', 'Sugar': 'Sugar', 'Black pepper': 'Black pepper', 'White pepper': 'White pepper',
    'Chicken powder': 'Chicken powder', 'Oregano': 'Oregano', 'Chilli flakes': 'Chilli flakes', 'Salt': 'Salt',
    'Masala': 'Chat masala', 'Sesame seeds': 'Sesame seeds (white)',
    'Coffee': 'Coffee', 'Everyday powder': 'Whitening powder (Everyday)', 'Karak chai powder': 'Karak chai',
    'Cardamom chai powder': 'Cardamom chai', 'Tea bag': 'Green tea (bags)', 'Dessert magic': 'Dessert magic',
    'Chocolate syrup': 'Chocolate topping', 'Strawberry syrup': 'Strawberry topping', 'Caramel syrup': 'Caramel topping',
    'Kit Kat stick': 'KitKat stick', 'Oreo biscuit': 'Oreo biscuit', 'Lemon powder': 'Lemon powder',
    'Peach ice powder': 'Peach powder', 'Orange ice powder': 'Orange powder', 'Nestle apple juice': 'Apple juice',
    'Nestle pineapple juice': 'Pineapple juice', 'Nestle mango juice': 'Chaunsa (mango) juice',
    'Mineral water (bar)': ('Water small (500ml)', 1 / 500),
    'Coke/Sprite 345ml': 'Sprite 345ml',                   # only the mocktails use it from the book
    'Ketchup sachet': 'Ketchup sachet', 'Disposable cup': 'Hot cups', 'Sugar sachet': 'Sugar sachet', 'Stirrer': 'Stirrer',
    'Ice cream': 'Vanilla ice cream',
}

def conv(rows, over=None):
    out = {}
    for n, q in rows.items():
        if over and n in over: n2, f = over[n], 1
        else:
            m = MAP[n]; n2, f = (m, 1) if isinstance(m, str) else m
        out[n2] = round(out.get(n2, 0) + q * f, 4)
    return out

TOPPING = {'p1': 'Tikka topping', 'p2': 'Tikka topping', 'p3': 'Tikka topping', 'p4': 'Malai boti topping',
           'p5': 'Tikka topping', 'f3': 'Tikka topping'}
R = {}
for (mid, opt), rows in book.R.items():
    if mid.startswith('d') or mid in ('k12', 'k13', 'e1', 'e2', 'e3'): continue
    over = {}
    if 'Marinated chicken chunks' in rows: over['Marinated chicken chunks'] = TOPPING.get(mid, 'Tikka topping')
    R[(mid, opt)] = conv(rows, over)
# shakes use the matching ice-cream flavour
for mid, flav in (('k4', 'Chocolate ice cream'), ('k5', 'Strawberry ice cream')):
    R[(mid, '')][flav] = R[(mid, '')].pop('Vanilla ice cream')
# brownies by type, soft drinks by brand
R[('e1', '')] = {'Nutella brownie': 1}; R[('e2', '')] = {'Belgian brownie': 1}; R[('e3', '')] = {'Nuts brownie': 1}
R[('k13', '500ml')] = {'Water small (500ml)': 1}; R[('k13', '1.5L')] = {'Water large (1.5L)': 1}
SIZES = ('345ml', '500ml', '1L', '1.5L')
for s in SIZES:
    R[('k12', s)] = {f'Coke {s}': 1}
    R[('k14', s)] = {f'Sprite {s}': 1}

def plus(*parts):
    out = {}
    for p in parts:
        for k, v in p.items(): out[k] = round(out.get(k, 0) + v, 4)
    return out
S = lambda mid, opt='': R[(mid, opt)]
R[('d1', '')] = plus(S('b6'), {'Coke 345ml': 1})
R[('d2', '')] = plus(S('b6'), S('b5'), {'Coke 500ml': 1})
R[('d3', '')] = plus(S('p5', 'S'), S('g3'), S('k10'))
R[('d4', '')] = plus(S('p1', 'M'), S('g3'), S('f7'), S('k10'), S('k10'))
R[('d5', '')] = plus(S('p5', 'L'), S('f1'), {'Coke 1.5L': 1})
R[('d6', '')] = plus(S('p1', 'L'), S('f1'), S('b7'), S('w4'), S('f9'), {'Coke 1.5L': 1})
R[('d7', '')] = plus(S('p5', 'L'), S('p5', 'L'), {'Honey mustard sauce': 60, 'Dips': 2}, {'Coke 1.5L': 1})

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
    for key in [('p1', 'L'), ('b6', ''), ('g3', ''), ('k4', ''), ('d1', '')]:
        print(key, round(sum(STOCK[s][2] * v for s, v in R[key].items()), 1))
