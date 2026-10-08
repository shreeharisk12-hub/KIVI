-- Run with the owner-authorized Supabase SQL connector. Everything is rolled back.
-- Exercises hosted RLS/RPCs using temporary Auth rows, with no email or retained account.
begin;
select set_config('kivi.test_uid',gen_random_uuid()::text,true);
insert into auth.users(id,raw_user_meta_data) values(current_setting('kivi.test_uid')::uuid,'{"display_name":"KIVI transaction verification"}');
select set_config('request.jwt.claim.sub',current_setting('kivi.test_uid'),true);
set local role authenticated;
do $$ declare v_variant uuid;v_product uuid;v_order uuid;v_key uuid:=gen_random_uuid();v_price numeric;v_total numeric;v_stock integer;v_address jsonb:='{"full_name":"Demo Listener","phone":"9999999999","line1":"123 Test Street","city":"Pune","state":"Maharashtra","postal_code":"411001"}';begin
  select v.id,v.product_id,v.price,v.stock into v_variant,v_product,v_price,v_stock from public.product_variants v where v.stock>=2 order by v.id limit 1;
  if v_variant is null then raise exception 'No testable stocked variant';end if;
  if (select count(*) from public.profiles)<>1 then raise exception 'Profile owner visibility failed';end if;
  update public.profiles set display_name='Verified Listener',theme='dark' where id=auth.uid();
  if not exists(select 1 from public.profiles where id=auth.uid() and display_name='Verified Listener' and theme='dark') then raise exception 'Profile preference update failed';end if;
  insert into public.wishlist_items(user_id,product_id) values(auth.uid(),v_product) on conflict(user_id,product_id) do nothing;
  insert into public.wishlist_items(user_id,product_id) values(auth.uid(),v_product) on conflict(user_id,product_id) do nothing;
  if (select count(*) from public.wishlist_items)<>1 then raise exception 'Wishlist uniqueness failed';end if;
  perform public.set_cart_item(v_variant,1,'add');perform public.set_cart_item(v_variant,1,'add');
  if (select quantity from public.cart_items)<>2 then raise exception 'Cart duplicate merging failed';end if;
  insert into public.addresses(user_id,full_name,phone,line1,city,state,postal_code) values(auth.uid(),'Demo Listener','9999999999','123 Test Street','Pune','Maharashtra','411001');
  update public.addresses set line2='Suite 2' where user_id=auth.uid();
  if not exists(select 1 from public.addresses where line2='Suite 2') then raise exception 'Address update failed';end if;
  v_order:=public.place_demo_order(v_address||'{"total":1}',v_key);
  if public.place_demo_order(v_address,v_key)<>v_order then raise exception 'Checkout idempotency failed';end if;
  select total into v_total from public.orders where id=v_order;
  if v_total<>(2*v_price+(case when 2*v_price>=20000 then 0 else 199 end)) then raise exception 'Authoritative prices failed';end if;
  if exists(select 1 from public.cart_items) then raise exception 'Cart was not cleared';end if;
  if (select stock from public.product_variants where id=v_variant)<>v_stock-2 then raise exception 'Inventory was not reserved';end if;
  if (select count(*) from public.order_status_history where order_id=v_order)<>1 then raise exception 'Tracking history missing';end if;
  begin perform public.admin_update_order_status(v_order,'Confirmed');raise exception 'Unauthorized status update accepted';exception when others then if sqlerrm not like 'Administrator access required%' then raise;end if;end;
  delete from public.addresses where user_id=auth.uid();
  if exists(select 1 from public.addresses) then raise exception 'Address deletion failed';end if;
  perform set_config('kivi.test_variant',v_variant::text,true);
  perform set_config('kivi.test_stock',v_stock::text,true);
  perform set_config('kivi.test_order',v_order::text,true);
end $$;
reset role;
insert into app_private.user_roles(user_id,role) values(current_setting('kivi.test_uid')::uuid,'admin');
set local role authenticated;
select public.admin_update_order_status(current_setting('kivi.test_order')::uuid,'Confirmed');
select public.admin_update_order_status(current_setting('kivi.test_order')::uuid,'Cancelled');
select public.admin_update_order_status(current_setting('kivi.test_order')::uuid,'Cancelled');
do $$ declare v_variant jsonb;begin
 if (select stock from public.product_variants where id=current_setting('kivi.test_variant')::uuid)<>current_setting('kivi.test_stock')::integer then raise exception 'Cancellation did not restore stock exactly once';end if;
 select to_jsonb(v) into v_variant from public.product_variants v where id=current_setting('kivi.test_variant')::uuid;
 perform public.admin_save_variant(v_variant||'{"is_default":true}');
 if (select count(*) from public.product_variants where product_id=(v_variant->>'product_id')::uuid and is_default)<>1 then raise exception 'Atomic default color update failed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.orders) or exists(select 1 from public.wishlist_items) or exists(select 1 from public.addresses) or exists(select 1 from public.cart_items) then raise exception 'Cross-account isolation failed';end if;
end $$;
reset role;
select 'Hosted cart, wishlist, address, transactional checkout, inventory, idempotency, tracking, admin authorization and account isolation passed. All test changes rolled back.' as verification;
rollback;
