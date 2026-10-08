begin;
-- Hosted Supabase defaults may grant anon EXECUTE directly, independently of PUBLIC.
revoke all on function public.set_cart_item(uuid,integer,text), public.place_demo_order(jsonb,uuid), public.admin_update_order_status(uuid,text), public.consume_ai_request(), public.admin_save_variant(jsonb) from public, anon;
grant execute on function public.set_cart_item(uuid,integer,text), public.place_demo_order(jsonb,uuid), public.admin_update_order_status(uuid,text), public.consume_ai_request(), public.admin_save_variant(jsonb) to authenticated;
revoke all on schema app_private from anon, authenticated;
revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;
commit;
