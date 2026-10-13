# Builds KAFEO stock items + recipes SQL from the kitchen spec chart (Kitchen_Specs_chart.xlsx),
# PASTAS sheet, and the Food Cost Nov-23 "New" sheet (unit costs).
# Costs are per unit (per g / ml / pcs). note: where the cost came from.
import json

N23 = 'Food Cost Nov-23'
EST = 'ESTIMATE - please update with Stock in'
UNK = 'Cost not known - enter with Stock in'

# name: (category, unit, cost per unit, note)
STOCK = {
  # prepared / kitchen-level items (match the daily consumption report)
  'Pizza dough':                ('Prepared', 'g', 0.24, EST + ' (from dough recipe, 2023 prices)'),
  'Cheese (Cheez Mix)':         ('Dairy', 'g', 1.30, N23),
  'Chicken pizza topping':      ('Prepared', 'g', 0.80, EST + ' (tikka/fajita chunks)'),
  'Malai Boti topping':         ('Prepared', 'g', 0.85, EST),
  'Chicken fillet (marinated)': ('Prepared', 'g', 0.75, EST + ' (boneless 700/kg + marinade)'),
  'Chicken patty (in-house)':   ('Prepared', 'g', 0.75, EST),
  'Zinger thigh':               ('Meat', 'g', 0.85, N23 + ' (Marinato thigh K&N)'),
  'Fiery fillet':               ('Meat', 'g', 0, UNK),
  'Crispy patty K&N':           ('Meat', 'pcs', 72.5, N23),
  'Chicken sausages':           ('Meat', 'g', 0, UNK),
  'Nuggets':                    ('Meat', 'pcs', 22.6, N23),
  'Chicken strips K&N':         ('Meat', 'pcs', 42, N23),
  'Wings K&N':                  ('Meat', 'pcs', 25, N23),
  'Fries':                      ('Frozen', 'g', 0.32, N23),
  'Onion rings':                ('Frozen', 'pcs', 0, UNK),
  'Bun 4 inch':                 ('Bakery', 'pcs', 35, N23),
  'Brioche bun':                ('Bakery', 'pcs', 0, UNK),
  'Bread slice':                ('Bakery', 'pcs', 16, N23),
  'Tortilla wrap':              ('Bakery', 'pcs', 37, N23),
  'Cheese slice':               ('Dairy', 'pcs', 29, N23),
  'Egg':                        ('Dairy', 'pcs', 27, N23),
  'Milk':                       ('Dairy', 'ml', 0.265, N23 + ' (Milkpak 1L)'),
  'Cream':                      ('Dairy', 'ml', 1.0, N23 + ' (UHT cream 1L)'),
  'Butter':                     ('Dairy', 'g', 1.35, N23),
  # sauces
  'Pizza sauce':                ('Sauces', 'g', 0.54, N23),
  'Burger sauce':               ('Sauces', 'g', 0.70, EST + ' (mayo based)'),
  'Honey mustard':              ('Sauces', 'g', 0.90, EST),
  'Classic mayo':               ('Sauces', 'g', 0.65, N23 + ' (plain mayo)'),
  'Chipotle sauce':             ('Sauces', 'g', 0.70, EST),
  'Peri peri sauce':            ('Sauces', 'g', 0.70, EST + ' (mayo + peri peri)'),
  'BBQ sauce':                  ('Sauces', 'g', 0.485, N23),
  'Chilli garlic sauce':        ('Sauces', 'g', 0.20, N23),
  'Demi glace':                 ('Sauces', 'g', 2.0, N23),
  'Italian base':               ('Sauces', 'g', 0, UNK),
  'Ketchup sachet':             ('Packaging', 'pcs', 4, N23),
  'Dips':                       ('Packaging', 'pcs', 3.2, N23),
  # produce
  'Iceberg':                    ('Produce', 'g', 0.36, N23),
  'Tomato':                     ('Produce', 'g', 0.12, N23),
  'Onion':                      ('Produce', 'g', 0.113, N23),
  'Capsicum':                   ('Produce', 'g', 0.22, N23),
  'Carrot':                     ('Produce', 'g', 0.125, N23),
  'Cucumber':                   ('Produce', 'g', 0, UNK),
  'Fresh garlic':               ('Produce', 'g', 0.45, N23),
  'Saute veggies':              ('Prepared', 'g', 0.20, EST),
  'Black olives':               ('Produce', 'g', 2.0, N23),
  'Jalapeno':                   ('Produce', 'g', 1.153, N23),
  'Mushroom':                   ('Produce', 'g', 1.6, N23),
  # dry
  'Fettuccine pasta':           ('Dry goods', 'g', 0.70, EST + ' (10,500 for 15 packs)'),
  'Penne pasta':                ('Dry goods', 'g', 1.42, N23),
  'Pizza flour':                ('Dry goods', 'g', 0.165, N23),
  'Bread crumbs':               ('Dry goods', 'g', 0.50, N23),
  'Zinger breading':            ('Prepared', 'g', 0.25, EST + ' (maida + spices)'),
  'Black pepper':               ('Spices', 'g', 1.65, N23),
  'White pepper':               ('Spices', 'g', 2.7, N23),
  'Chicken powder':             ('Spices', 'g', 1.3, N23),
  'Oregano':                    ('Spices', 'g', 1.7, N23),
  'Chilli flakes':              ('Spices', 'g', 0.8, N23),
  'Salt':                       ('Spices', 'g', 0.1, N23),
  'Cooking oil':                ('Dry goods', 'ml', 0.59, N23),
  # drinks
  'Coke/Sprite 345ml':          ('Soft drinks', 'pcs', 60, N23),
  'Coke/Sprite 500ml':          ('Soft drinks', 'pcs', 90, N23),
  'Coke/Sprite 1L':             ('Soft drinks', 'pcs', 143, N23),
  'Coke/Sprite 1.5L':           ('Soft drinks', 'pcs', 190, N23),
  'Water 500ml':                ('Soft drinks', 'pcs', 57, N23),
  'Water 1.5L':                 ('Soft drinks', 'pcs', 95, N23),
}

def pizza(dough, topping, tq, cheese, sauce, extras):
    return [('Pizza dough', dough), (topping, tq), ('Cheese (Cheez Mix)', cheese), ('Pizza sauce', sauce)] + extras if topping else \
           [('Pizza dough', dough), ('Cheese (Cheez Mix)', cheese), ('Pizza sauce', sauce)] + extras

D = {'S': 140, 'M': 270, 'L': 370}
PS = {'S': 20, 'M': 40, 'L': 60}
R = {}  # (menu_id, option) -> [(stock, qty)]
for k, i in (('S', 0), ('M', 1), ('L', 2)):
    sm = lambda a, b, c: (a, b, c)[i]
    ch = sm(70, 100, 180); top = sm(70, 100, 180)
    R[('p1', k)] = pizza(D[k], 'Chicken pizza topping', top, sm(100, 140, 250), PS[k], [
        ('Burger sauce', sm(10, 20, 30)), ('Honey mustard', sm(20, 30, 50)), ('Black olives', sm(5, 7, 10)), ('Jalapeno', sm(5, 7, 10)),
        ('Onion', sm(15, 25, 35)), ('Capsicum', sm(15, 25, 35)), ('Mushroom', sm(10, 20, 30)), ('Ketchup sachet', sm(4, 6, 8))])
    R[('p2', k)] = pizza(D[k], 'Chicken pizza topping', top, ch, PS[k], [
        ('Chicken sausages', sm(12, 24, 48)), ('Black olives', sm(5, 7, 10)), ('Jalapeno', sm(5, 7, 10)), ('Onion', sm(15, 25, 35)),
        ('Tomato', sm(15, 25, 35)), ('Capsicum', sm(15, 25, 35)), ('Mushroom', sm(10, 20, 30)), ('Ketchup sachet', sm(4, 6, 8))])
    R[('p3', k)] = pizza(D[k], 'Chicken pizza topping', top, ch, PS[k], [
        ('Peri peri sauce', sm(30, 60, 90)), ('Jalapeno', sm(5, 7, 10)), ('Onion', sm(15, 25, 35)), ('Capsicum', sm(15, 25, 35)),
        ('Tomato', sm(15, 25, 35)), ('Ketchup sachet', sm(4, 6, 8))])
    R[('p4', k)] = pizza(D[k], 'Malai Boti topping', top, ch, PS[k], [
        ('Burger sauce', sm(10, 20, 30)), ('Onion', sm(15, 25, 35)), ('Black olives', sm(5, 7, 10)), ('Ketchup sachet', sm(2, 6, 8))])
    R[('p5', k)] = pizza(D[k], 'Chicken pizza topping', top, ch, PS[k], [
        ('Onion', sm(15, 25, 35)), ('Tomato', sm(15, 25, 35)), ('Ketchup sachet', sm(4, 6, 8))])
    R[('p6', k)] = pizza(D[k], None, 0, ch, PS[k], [
        ('Chicken sausages', sm(24, 48, 72)), ('Burger sauce', sm(10, 20, 30)), ('Ketchup sachet', sm(4, 6, 8))])
    R[('p7', k)] = pizza(D[k], None, 0, sm(90, 120, 200), PS[k], [
        ('Burger sauce', sm(10, 20, 30)), ('Ketchup sachet', sm(4, 6, 8))])
    R[('p8', k)] = pizza(D[k], None, 0, ch, PS[k], [
        ('Black olives', sm(5, 7, 10)), ('Jalapeno', sm(5, 7, 10)), ('Onion', sm(15, 25, 35)), ('Tomato', sm(15, 25, 35)),
        ('Capsicum', sm(15, 25, 35)), ('Mushroom', sm(10, 20, 30)), ('Ketchup sachet', sm(4, 6, 8))])

F50 = [('Fries', 50), ('Ketchup sachet', 2)]
R[('b8', '')] = [('Crispy patty K&N', 1), ('Bun 4 inch', 1), ('Tomato', 10), ('Iceberg', 15), ('Burger sauce', 40), ('Ketchup sachet', 2)]
R[('b7', '')] = [('Chicken patty (in-house)', 90), ('Bread crumbs', 25), ('Egg', 1), ('Bun 4 inch', 1), ('Tomato', 15), ('Iceberg', 15), ('Chilli garlic sauce', 20), ('Burger sauce', 30), ('Ketchup sachet', 2)]
R[('b6', '')] = [('Zinger thigh', 120), ('Zinger breading', 20), ('Bun 4 inch', 1), ('Iceberg', 20), ('Classic mayo', 35)] + F50
R[('b5', '')] = [('Fiery fillet', 110), ('Bun 4 inch', 1), ('Iceberg', 15), ('Burger sauce', 15), ('Chipotle sauce', 20)] + F50
R[('b4', '')] = [('Chicken patty (in-house)', 110), ('Cheese (Cheez Mix)', 20), ('Brioche bun', 1), ('Iceberg', 15), ('Burger sauce', 20), ('Honey mustard', 35), ('Mushroom', 20)] + F50
R[('b2', '')] = [('Chicken fillet (marinated)', 120), ('Cheese slice', 1), ('Brioche bun', 1), ('Black olives', 5), ('Jalapeno', 5), ('Tomato', 20), ('Onion', 15), ('Iceberg', 15), ('BBQ sauce', 30), ('Burger sauce', 30)] + F50
R[('b3', '')] = [('Chicken fillet (marinated)', 120), ('Chicken patty (in-house)', 90), ('Cheese slice', 1), ('Brioche bun', 1), ('Black olives', 5), ('Jalapeno', 5), ('Tomato', 20), ('Onion', 15), ('Iceberg', 15), ('BBQ sauce', 20), ('Burger sauce', 20), ('Honey mustard', 20)] + F50
R[('b1', '')] = [('Chicken patty (in-house)', 180), ('Cheese (Cheez Mix)', 50), ('Egg', 1), ('Bread crumbs', 30), ('Cheese slice', 1), ('Brioche bun', 1), ('Onion rings', 2), ('Tomato', 15), ('Burger sauce', 20)] + F50

R[('w4', '')] = [('Chicken fillet (marinated)', 120), ('Bread slice', 3), ('Tomato', 20), ('Iceberg', 20), ('BBQ sauce', 30), ('Burger sauce', 50)] + F50
R[('w3', '')] = [('Chicken fillet (marinated)', 100), ('Egg', 1), ('Bread slice', 3), ('Tomato', 20), ('Cucumber', 30), ('Iceberg', 20), ('Burger sauce', 60), ('Chilli garlic sauce', 30)] + F50
R[('w2', '')] = [('Chicken fillet (marinated)', 100), ('Cheese slice', 1), ('Bread slice', 3), ('Black olives', 5), ('Jalapeno', 5), ('Tomato', 20), ('Onion', 15), ('Iceberg', 20), ('Burger sauce', 40), ('Honey mustard', 30), ('BBQ sauce', 20)] + F50
R[('w1', '')] = [('Chicken fillet (marinated)', 100), ('Cheese slice', 2), ('Bread slice', 3), ('Iceberg', 20), ('Honey mustard', 40), ('Burger sauce', 50)] + F50
R[('w7', '')] = [('Zinger thigh', 120), ('Zinger breading', 20), ('Tortilla wrap', 1), ('Iceberg', 20), ('Burger sauce', 40), ('Chilli garlic sauce', 20), ('Ketchup sachet', 2)]
R[('w5', '')] = [('Chicken fillet (marinated)', 120), ('Tortilla wrap', 1), ('Black olives', 10), ('Jalapeno', 10), ('Tomato', 20), ('Iceberg', 20), ('BBQ sauce', 20), ('Burger sauce', 40), ('Ketchup sachet', 2)]
R[('w6', '')] = [('Chicken fillet (marinated)', 120), ('Tortilla wrap', 1), ('Cheese slice', 1), ('Iceberg', 20), ('Burger sauce', 30), ('Honey mustard', 30), ('Ketchup sachet', 2)]

STEAK = [('Chicken fillet (marinated)', 200), ('Fresh garlic', 3), ('Saute veggies', 50), ('Fries', 70)]
R[('s5', '')] = STEAK + [('Butter', 30), ('Black pepper', 3), ('Demi glace', 25), ('Onion', 15)]
R[('s4', '')] = STEAK + [('Butter', 30), ('White pepper', 2), ('BBQ sauce', 120), ('Onion', 15)]
R[('s3', '')] = STEAK + [('Butter', 40), ('Chicken powder', 5), ('Capsicum', 10), ('Tomato', 10), ('Onion', 30), ('Black olives', 7), ('Pizza sauce', 50), ('Chilli garlic sauce', 25)]
R[('s2', '')] = STEAK + [('Butter', 40), ('White pepper', 3), ('Chicken powder', 8), ('Jalapeno', 20), ('Onion', 15), ('Milk', 100), ('Cream', 40), ('Pizza flour', 12)]
R[('s1', '')] = STEAK + [('Butter', 30), ('White pepper', 3), ('Demi glace', 25), ('Cream', 40), ('Mushroom', 40), ('Onion', 15)]
PASTA_W = [('Chicken fillet (marinated)', 60), ('Milk', 200), ('Cheese (Cheez Mix)', 50), ('Butter', 40), ('Black pepper', 2), ('White pepper', 1), ('Oregano', 2), ('Salt', 2)]
R[('s8', '')] = [('Fettuccine pasta', 170)] + PASTA_W + [('Chilli flakes', 2), ('Chicken powder', 4)]
R[('s6', '')] = [('Fettuccine pasta', 170)] + PASTA_W + [('Mushroom', 20), ('Chilli flakes', 4), ('Chicken powder', 2)]
R[('s7', '')] = [('Penne pasta', 170), ('Chicken fillet (marinated)', 60), ('Carrot', 40), ('Capsicum', 40), ('Butter', 50), ('Chilli garlic sauce', 180), ('Italian base', 130), ('Chicken powder', 2), ('Oregano', 2)]

R[('f8', '')] = [('Chicken strips K&N', 4)]
R[('f9', '')] = [('Nuggets', 5)]
R[('f11', '')] = [('Onion rings', 6)]
R[('g1', '')] = [('Wings K&N', 6)]
R[('g2', '')] = [('Wings K&N', 5)]
R[('g3', '')] = [('Wings K&N', 6)]
R[('g4', '')] = [('Wings K&N', 5)]
R[('a4', '')] = [('Cheese slice', 1)]
for size in ('345ml', '500ml', '1L', '1.5L'):
    R[('k12', size)] = [(f'Coke/Sprite {size}', 1)]
R[('k13', '500ml')] = [('Water 500ml', 1)]
R[('k13', '1.5L')] = [('Water 1.5L', 1)]

def combine(*parts):
    out = {}
    for mult, rows in parts:
        for s, q in rows:
            out[s] = out.get(s, 0) + q * mult
    return list(out.items())
# Deals = their parts (drinks/fries parts without a recipe are left out)
R[('d1', '')] = combine((1, R[('b6', '')]), (1, R[('k12', '345ml')]))
R[('d2', '')] = combine((1, R[('b6', '')]), (1, R[('b5', '')]), (1, R[('k12', '500ml')]))
R[('d3', '')] = combine((1, R[('p5', 'S')]), (1, R[('g3', '')]))
R[('d4', '')] = combine((1, R[('p1', 'M')]), (1, R[('g3', '')]))
R[('d5', '')] = combine((1, R[('p5', 'L')]), (1, R[('k12', '1.5L')]))
R[('d6', '')] = combine((1, R[('p1', 'L')]), (1, R[('b7', '')]), (1, R[('w4', '')]), (1, R[('f9', '')]), (1, R[('k12', '1.5L')]))
R[('d7', '')] = combine((2, R[('p5', 'L')]), (1, [('Dips', 2)]), (1, R[('k12', '1.5L')]))

# sanity: every ingredient exists
missing = {s for rows in R.values() for s, _ in rows if s not in STOCK}
assert not missing, missing

q = lambda s: "'" + str(s).replace("'", "''") + "'"
sql = ["-- KAFEO stock items + recipes from Kitchen Specs chart (generated)",
       "insert into public.stock_items (name, category, unit, cost, supplier) values"]
sql.append(',\n'.join(f"  ({q(n)}, {q(c)}, {q(u)}, {cost}, {q(note)})" for n, (c, u, cost, note) in STOCK.items()) + ';')
vals = []
for (mid, opt), rows in R.items():
    for s, qty in rows:
        vals.append(f"({q(mid)}, {q(opt)}, {q(s)}, {round(qty, 3)})")
sql.append("insert into public.recipes (menu_item_id, option_key, stock_item_id, qty)\nselect v.mid, v.opt, s.id, v.qty from (values\n  " + ',\n  '.join(vals) + "\n) as v(mid, opt, sname, qty) join public.stock_items s on s.name = v.sname\non conflict (menu_item_id, option_key, stock_item_id) do update set qty = excluded.qty;")
open('./load_recipes.sql', 'w').write('\n'.join(sql) + '\n')
json.dump({'stock': STOCK, 'recipes': {f'{k[0]}|{k[1]}': v for k, v in R.items()}}, open('./recipes.json', 'w'), indent=1)
print(len(STOCK), 'stock items;', len(R), 'recipes;', len(vals), 'recipe lines')
