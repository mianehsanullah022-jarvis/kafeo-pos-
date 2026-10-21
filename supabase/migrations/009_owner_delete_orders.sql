-- KAFEO POS update 9: the owner can permanently delete an order (e.g. a paid order entered by mistake).
-- Safe to run more than once. Already applied to the KAFEO project.
drop policy if exists "owner delete orders" on public.orders;
create policy "owner delete orders" on public.orders for delete using (public.is_owner());
