// Builds supabase/schema.sql = schema-base.sql + menu/settings seed from js/menu-seed.js
// Run: node tools/build-sql.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { CATEGORIES, ITEMS, DEFAULT_SETTINGS } from '../js/menu-seed.js';

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const base = readFileSync(new URL('../supabase/schema-base.sql', import.meta.url), 'utf8');

const cats = CATEGORIES.map((c) => `  (${q(c.id)}, ${q(c.label)}, ${c.sort})`).join(',\n');
const items = ITEMS.map((i) =>
  `  (${q(i.id)}, ${q(i.cat)}, ${q(i.name)}, ${q(i.note)}, ${q(JSON.stringify(i.opts))}::jsonb, ${q(i.station)}, ${i.counts ? q(i.counts) : 'null'}, ${i.sort})`
).join(',\n');

const seed = `
-- ---------- Starting menu & settings (only if empty) ----------
do $$
begin
  if not exists (select 1 from public.menu_categories) then
    insert into public.menu_categories (id, label, sort) values
${cats};
  end if;
  if not exists (select 1 from public.menu_items) then
    insert into public.menu_items (id, category_id, name, note, options, station, counts, sort) values
${items};
  end if;
  if not exists (select 1 from public.settings) then
    insert into public.settings (id, data) values (1, ${q(JSON.stringify(DEFAULT_SETTINGS))}::jsonb);
  end if;
end $$;
`;

const extras = ['002_billing.sql', '003_menu_photos.sql', '004_inventory.sql', '005_expenses.sql', '006_website_orders.sql']
  .map((f) => `\n-- ===== ${f} =====\n` + readFileSync(new URL('../supabase/migrations/' + f, import.meta.url), 'utf8')).join('');
writeFileSync(new URL('../supabase/schema.sql', import.meta.url), base + seed + extras);
console.log(`schema.sql written: ${CATEGORIES.length} categories, ${ITEMS.length} items`);
