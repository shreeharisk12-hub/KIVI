-- KIVI: relational catalog, RLS, transactional demo commerce.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public;
create table app_private.user_roles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null check (role='admin'));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from app_private.user_roles where user_id=auth.uid() and role='admin'); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=80),
 theme text not null default 'system' check(theme in ('system','light','dark')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.products (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
 name text not null check(length(name) between 1 and 200), brand text not null, category text not null,
 description text not null default '', specifications jsonb not null default '{}' check(jsonb_typeof(specifications)='object'),
 display_name text not null, headline text not null, background text not null default '#142e40' check(background ~ '^#[0-9A-Fa-f]{6}$'),
 accent text not null default '#90b4c6' check(accent ~ '^#[0-9A-Fa-f]{6}$'), keywords text not null default '',
 active boolean not null default true, is_demo boolean not null default true, position integer not null default 0,
 search_vector tsvector generated always as (to_tsvector('simple',coalesce(name,'')||' '||coalesce(brand,'')||' '||coalesce(category,'')||' '||coalesce(keywords,''))) stored,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index products_search_idx on public.products using gin(search_vector);
create table public.product_variants (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete restrict,
 color_name text not null check(length(color_name)>0),color_hex text not null check(color_hex ~ '^#[0-9A-Fa-f]{6}$'),
 image_path text not null, image_source text not null default 'local' check(image_source in ('local','storage')),
 price numeric(12,2) not null check(price>0),stock integer not null default 0 check(stock between 0 and 1000000),
 is_default boolean not null default false, position integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(product_id,color_name)
);
create index variants_product_idx on public.product_variants(product_id);
create unique index one_default_variant on public.product_variants(product_id) where is_default;
create table public.carts (id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id) on delete cascade,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.cart_items (
 id uuid primary key default gen_random_uuid(),cart_id uuid not null references public.carts(id) on delete cascade,
 variant_id uuid not null references public.product_variants(id) on delete restrict,
 quantity integer not null check(quantity between 1 and 99),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(cart_id,variant_id)
);
create index cart_items_variant_idx on public.cart_items(variant_id);
create table public.addresses (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 full_name text not null check(length(trim(full_name)) between 2 and 160),phone text not null check(phone ~ '^[+0-9 ()-]{7,20}$'),
 line1 text not null check(length(trim(line1)) between 3 and 160),line2 text not null default '' check(length(line2)<=160),
 city text not null check(length(trim(city)) between 2 and 160),state text not null check(length(trim(state)) between 2 and 160),
 postal_code text not null check(postal_code ~ '^[A-Za-z0-9 -]{3,10}$'),country text not null default 'India',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);
create table public.orders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete restrict,
 idempotency_key uuid not null, status text not null default 'Placed' check(status in ('Placed','Confirmed','Packed','Shipped','Out for Delivery','Delivered','Cancelled')),
 shipping_address jsonb not null check(jsonb_typeof(shipping_address)='object'),
 subtotal numeric(12,2) not null check(subtotal>=0),shipping numeric(12,2) not null check(shipping>=0),total numeric(12,2) not null check(total=subtotal+shipping),
 is_demo boolean not null default true check(is_demo),estimated_delivery date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,idempotency_key)
);
create index orders_user_date_idx on public.orders(user_id,created_at desc);
create table public.order_items (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
 variant_id uuid not null references public.product_variants(id) on delete restrict,
 product_name text not null,color_name text not null,image_path text not null,image_source text not null default 'local',
 quantity integer not null check(quantity between 1 and 99),unit_price numeric(12,2) not null check(unit_price>0),created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_variant_idx on public.order_items(variant_id);
create table public.order_status_history (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
 status text not null check(status in ('Placed','Confirmed','Packed','Shipped','Out for Delivery','Delivered','Cancelled')),
 changed_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
create index order_history_order_idx on public.order_status_history(order_id,created_at);
create table app_private.ai_limits (user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null,request_count integer not null default 0,day_start date not null default current_date,day_count integer not null default 0);

create function app_private.touch_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end; $$;
do $$ declare t text;begin foreach t in array array['profiles','products','product_variants','carts','cart_items','addresses','orders'] loop execute format('create trigger touch_updated before update on public.%I for each row execute function app_private.touch_updated()',t);end loop;end $$;
create function app_private.handle_signup() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),80));
 insert into public.carts(user_id) values(new.id);return new;end; $$;
create trigger kivi_signup after insert on auth.users for each row execute function app_private.handle_signup();
insert into public.profiles(id,display_name) select id,left(coalesce(raw_user_meta_data->>'display_name',''),80) from auth.users on conflict do nothing;
insert into public.carts(user_id) select id from auth.users on conflict do nothing;

do $$ declare t text;begin foreach t in array array['profiles','products','product_variants','carts','cart_items','addresses','orders','order_items','order_status_history'] loop execute format('alter table public.%I enable row level security',t);end loop;end $$;
alter table app_private.user_roles enable row level security;
alter table app_private.ai_limits enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy product_read on public.products for select to anon,authenticated using(active or (auth.uid() is not null and public.is_admin()));
create policy product_admin on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy variant_read on public.product_variants for select to anon,authenticated using(exists(select 1 from public.products where id=product_id and active) or (auth.uid() is not null and public.is_admin()));
create policy variant_admin on public.product_variants for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy cart_read on public.carts for select to authenticated using(user_id=auth.uid());
create policy cart_item_read on public.cart_items for select to authenticated using(exists(select 1 from public.carts where id=cart_id and user_id=auth.uid()));
create policy address_owner on public.addresses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy order_read on public.orders for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy order_item_read on public.order_items for select to authenticated using(exists(select 1 from public.orders where id=order_id and (user_id=auth.uid() or public.is_admin())));
create policy history_read on public.order_status_history for select to authenticated using(exists(select 1 from public.orders where id=order_id and (user_id=auth.uid() or public.is_admin())));
-- Remove Supabase default broad grants. Checkout and cart mutation are RPC-only.
revoke all on public.profiles,public.products,public.product_variants,public.carts,public.cart_items,public.addresses,public.orders,public.order_items,public.order_status_history from anon,authenticated;
grant select on public.products,public.product_variants to anon,authenticated;
grant insert,update,delete on public.products,public.product_variants to authenticated;
grant select on public.profiles,public.carts,public.cart_items,public.addresses,public.orders,public.order_items,public.order_status_history to authenticated;
grant update(display_name,theme) on public.profiles to authenticated;
grant insert,update,delete on public.addresses to authenticated;

create function public.set_cart_item(p_variant uuid,p_quantity integer,p_mode text default 'set') returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_cart uuid;v_stock integer;v_quantity integer;begin
 if v_user is null then raise exception 'Sign in to update your bag.';end if;
 if p_quantity is null or p_quantity<0 or p_quantity>99 or p_mode not in ('set','add') or p_mode is null then raise exception 'Choose a quantity between 0 and 99.';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 insert into public.carts(user_id) values(v_user) on conflict(user_id) do nothing;
 select id into v_cart from public.carts where user_id=v_user;
 if p_quantity=0 and p_mode='set' then delete from public.cart_items where cart_id=v_cart and variant_id=p_variant;return;end if;
 select v.stock into v_stock from public.product_variants v join public.products p on p.id=v.product_id where v.id=p_variant and p.active for update of v;
 if not found then raise exception 'This headphone is no longer available.';end if;
 v_quantity:=p_quantity;
 if p_mode='add' then select coalesce((select quantity from public.cart_items where cart_id=v_cart and variant_id=p_variant),0)+p_quantity into v_quantity;end if;
 if v_quantity<1 or v_quantity>99 or v_quantity>v_stock then raise exception 'Not enough stock for that quantity. Currently available: %.',v_stock;end if;
 insert into public.cart_items(cart_id,variant_id,quantity) values(v_cart,p_variant,v_quantity) on conflict(cart_id,variant_id) do update set quantity=excluded.quantity;
end; $$;

create function public.place_demo_order(p_address jsonb,p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_cart uuid;v_order uuid;v_subtotal numeric(12,2):=0;v_shipping numeric(12,2);v_address jsonb;v_key text;v_value text;r record;begin
 if v_user is null then raise exception 'Sign in before placing a demo order.';end if;
 if p_idempotency_key is null then raise exception 'A unique checkout identifier is required.';end if;
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
 insert into public.orders(user_id,idempotency_key,shipping_address,subtotal,shipping,total) values(v_user,p_idempotency_key,v_address,v_subtotal,v_shipping,v_subtotal+v_shipping) returning id into v_order;
 insert into public.order_items(order_id,variant_id,product_name,color_name,image_path,image_source,quantity,unit_price) select v_order,v.id,p.name,v.color_name,v.image_path,v.image_source,ci.quantity,v.price from public.cart_items ci join public.product_variants v on v.id=ci.variant_id join public.products p on p.id=v.product_id where ci.cart_id=v_cart;
 update public.product_variants v set stock=v.stock-ci.quantity from public.cart_items ci where ci.cart_id=v_cart and ci.variant_id=v.id;
 insert into public.order_status_history(order_id,status,changed_by) values(v_order,'Placed',v_user);
 delete from public.cart_items where cart_id=v_cart;
 return v_order;
end; $$;

create function public.admin_update_order_status(p_order uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_current text;v_statuses text[]:=array['Placed','Confirmed','Packed','Shipped','Out for Delivery','Delivered'];begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required.';end if;
 if p_status is null or p_status not in ('Placed','Confirmed','Packed','Shipped','Out for Delivery','Delivered','Cancelled') then raise exception 'Invalid demo order status.';end if;
 select status into v_current from public.orders where id=p_order for update;
 if not found then raise exception 'Order not found.';end if;
 if v_current=p_status then return;end if;
 if v_current in ('Delivered','Cancelled') then raise exception 'This order is already final.';end if;
 if p_status<>'Cancelled' and array_position(v_statuses,p_status)<>array_position(v_statuses,v_current)+1 then raise exception 'Move orders forward one status at a time.';end if;
 if p_status='Cancelled' then
  perform v.id from public.product_variants v join public.order_items oi on oi.variant_id=v.id where oi.order_id=p_order order by v.id for update of v;
  update public.product_variants v set stock=v.stock+oi.quantity from public.order_items oi where oi.order_id=p_order and oi.variant_id=v.id;
 end if;
 update public.orders set status=p_status where id=p_order;
 insert into public.order_status_history(order_id,status,changed_by) values(p_order,p_status,auth.uid());
end; $$;

create function public.consume_ai_request() returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_count integer;v_daily integer;begin
 if v_user is null then raise exception 'Sign in to use the assistant.';end if;
 insert into app_private.ai_limits(user_id,window_start,request_count,day_count) values(v_user,now(),1,1)
 on conflict(user_id) do update set request_count=case when app_private.ai_limits.window_start<now()-interval '1 minute' then 1 else app_private.ai_limits.request_count+1 end,window_start=case when app_private.ai_limits.window_start<now()-interval '1 minute' then now() else app_private.ai_limits.window_start end,day_count=case when app_private.ai_limits.day_start<current_date then 1 else app_private.ai_limits.day_count+1 end,day_start=current_date
 returning request_count,day_count into v_count,v_daily;
 return v_count<=10 and v_daily<=200;
end; $$;
revoke all on function public.set_cart_item(uuid,integer,text),public.place_demo_order(jsonb,uuid),public.admin_update_order_status(uuid,text),public.consume_ai_request() from public;
grant execute on function public.set_cart_item(uuid,integer,text),public.place_demo_order(jsonb,uuid),public.admin_update_order_status(uuid,text),public.consume_ai_request() to authenticated;
commit;
