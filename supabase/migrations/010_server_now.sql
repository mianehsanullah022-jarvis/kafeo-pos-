-- KAFEO POS update 10: the POS reads the server's clock, so a counter PC with the wrong date/time
-- still shows the right "today". Safe to run more than once. Already applied to the KAFEO project.
create or replace function public.server_now() returns timestamptz language sql stable as $$ select now() $$;
grant execute on function public.server_now() to anon, authenticated;
