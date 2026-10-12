-- KAFEO POS update 3: item photos on the order screen.
-- Adds a photo link to each menu item and a public "menu" photo store that only the owner can upload to.
-- Safe to run more than once.
alter table public.menu_items add column if not exists image_url text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu', 'menu', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "owner uploads menu photos" on storage.objects;
create policy "owner uploads menu photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and public.is_owner());
drop policy if exists "owner updates menu photos" on storage.objects;
create policy "owner updates menu photos" on storage.objects for update to authenticated
  using (bucket_id = 'menu' and public.is_owner()) with check (bucket_id = 'menu' and public.is_owner());
drop policy if exists "owner deletes menu photos" on storage.objects;
create policy "owner deletes menu photos" on storage.objects for delete to authenticated
  using (bucket_id = 'menu' and public.is_owner());
