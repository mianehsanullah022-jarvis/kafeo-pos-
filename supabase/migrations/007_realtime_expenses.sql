-- KAFEO POS · live updates for expenses (so the Dashboard's Expenses and Sales − expenses update by themselves).
-- Safe to run more than once. Already applied to the KAFEO project.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses') then
    alter publication supabase_realtime add table public.expenses;
  end if;
end $$;
