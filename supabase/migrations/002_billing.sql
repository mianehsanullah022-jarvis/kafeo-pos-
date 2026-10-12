-- KAFEO POS update 2: discounts, service charge, tax rate, rounding and payment details on each order.
-- Safe to run more than once.
alter table public.orders
  add column if not exists service_charge numeric not null default 0,
  add column if not exists tax_rate numeric not null default 0,
  add column if not exists round_off numeric not null default 0,
  add column if not exists cash_received numeric not null default 0,
  add column if not exists change_due numeric not null default 0,
  add column if not exists meta jsonb not null default '{}'::jsonb;  -- {discount:{scope,type,value,reason,bank}, serviceOn, by}
