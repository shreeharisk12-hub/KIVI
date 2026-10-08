begin;
-- Store demo choices only. No card numbers, UPI identifiers or real transactions.
alter table public.orders add column payment_method text not null default 'demo' check(payment_method in ('demo','demo_card','demo_upi','demo_cod'));
alter table public.orders add column payment_status text not null default 'not_collected' check(payment_status='not_collected');
drop function public.place_demo_order(jsonb,uuid);
create function public.place_demo_order(p_address jsonb,p_idempotency_key uuid,p_payment_method text default 'demo') returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_cart uuid;v_order uuid;v_subtotal numeric(12,2):=0;v_shipping numeric(12,2);v_address jsonb;v_key text;v_value text;r record;begin
 if v_user is null then raise exception 'Sign in before placing a demo order.';end if;
 if p_idempotency_key is null then raise exception 'A unique checkout identifier is required.';end if;
 if p_payment_method is null or p_payment_method not in ('demo','demo_card','demo_upi','demo_cod') then raise exception 'Choose a supported demo payment method.';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select id into v_order from public.orders where user_id=v_user and idempotency_key=p_idempotency_key;
 if found then return v_order;end if;
 if p_address is null or jsonb_typeof(p_address)<>'object' then raise exception 'Enter a valid shipping address.';end if;
 foreach v_key in array array['full_name','phone','line1','city','state','postal_code'] loop
  v_value:=trim(coalesce(p_address->>v_key,''));
  if length(v_value)<2 or length(v_value)>160 then raise exception 'Complete the % field in your address.',v_key;end if;
 end loop;
 if p_address->>'phone' !~ '^[+0-9 ()-]{7,20}$' or p_address->>'postal_code' !~ '^[A-Za-z0-9 -]{3,10}$' or length(trim(p_address->>'line1'))<3 or length(coalesce(p_address->>'line2',''))>160 then raise exception 'Check your phone, street address, and postal code.';end if;
 v_address:=jsonb_build_object('full_name',trim(p_address->>'full_name'),'phone',trim(p_address->>'phone'),'line1',trim(p_address->>'line1'),'line2',trim(coalesce(p_address->>'line2','')),'city',trim(p_address->>'city'),'state',trim(p_address->>'state'),'postal_code',trim(p_address->>'postal_code'),'country','India');
 select id into v_cart from public.carts where user_id=v_user for update;
 if v_cart is null or not exists(select 1 from public.cart_items where cart_id=v_cart) then raise exception 'Your shopping bag is empty.';end if;
 -- Lock every variant in a stable order before inspecting stock or prices.
 perform v.id from public.product_variants v join public.cart_items ci on ci.variant_id=v.id where ci.cart_id=v_cart order by v.id for update of v;
 for r in select ci.quantity,v.id,v.stock,v.price,p.active from public.cart_items ci join public.product_variants v on v.id=ci.variant_id join public.products p on p.id=v.product_id where ci.cart_id=v_cart loop
  if not r.active then raise exception 'An item in your bag is no longer available.';end if;
  if r.quantity>r.stock then raise exception 'Inventory changed. Update your shopping bag and try again.';end if;
  v_subtotal:=v_subtotal+r.quantity*r.price;
 end loop;
 v_shipping:=case when v_subtotal>=20000 then 0 else 199 end;
 insert into public.orders(user_id,idempotency_key,shipping_address,subtotal,shipping,total,payment_method,payment_status) values(v_user,p_idempotency_key,v_address,v_subtotal,v_shipping,v_subtotal+v_shipping,p_payment_method,'not_collected') returning id into v_order;
 insert into public.order_items(order_id,variant_id,product_name,color_name,image_path,image_source,quantity,unit_price) select v_order,v.id,p.name,v.color_name,v.image_path,v.image_source,ci.quantity,v.price from public.cart_items ci join public.product_variants v on v.id=ci.variant_id join public.products p on p.id=v.product_id where ci.cart_id=v_cart;
 update public.product_variants v set stock=v.stock-ci.quantity from public.cart_items ci where ci.cart_id=v_cart and ci.variant_id=v.id;
 insert into public.order_status_history(order_id,status,changed_by) values(v_order,'Placed',v_user);
 delete from public.cart_items where cart_id=v_cart;
 return v_order;
end; $$;

revoke all on function public.place_demo_order(jsonb,uuid,text) from public,anon;
grant execute on function public.place_demo_order(jsonb,uuid,text) to authenticated;
comment on column public.orders.payment_method is 'Demonstration choice; never a processed payment.';
comment on column public.orders.payment_status is 'No real money is collected in KIVI v1.';
commit;
