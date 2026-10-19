-- KAFEO POS · website orders
-- Orders placed on the KAFEO website arrive through the `web-order` Edge Function
-- with status 'pending'. They stay out of the kitchen until a cashier taps Accept
-- on the POS (then they become 'new' like any counter order). Rejected ones are 'cancelled'.
-- Safe to run more than once.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'new', 'preparing', 'ready', 'out', 'done', 'cancelled'));

-- One POS order per website order reference (the website may retry if the signal drops).
create unique index if not exists orders_web_ref_uidx
  on public.orders ((meta->>'web_ref'))
  where meta ? 'web_ref';

-- Fast look-ups for the anti-spam limits in the Edge Function.
create index if not exists orders_source_created_idx
  on public.orders ((meta->>'source'), created_at desc);
