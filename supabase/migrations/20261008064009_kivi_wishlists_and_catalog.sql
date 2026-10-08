begin;
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index wishlist_product_idx on public.wishlist_items(product_id);
alter table public.wishlist_items enable row level security;
create policy wishlist_read on public.wishlist_items for select to authenticated using (user_id = auth.uid());
create policy wishlist_add on public.wishlist_items for insert to authenticated with check (
  user_id = auth.uid() and exists(select 1 from public.products p where p.id = product_id and p.active)
);
create policy wishlist_remove on public.wishlist_items for delete to authenticated using (user_id = auth.uid());
revoke all on public.wishlist_items from anon, authenticated;
grant select, insert, delete on public.wishlist_items to authenticated;

-- Setting a default finish is atomic; a partially updated catalog is never exposed.
create function public.admin_save_variant(p_variant jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_product uuid;
  v_existing_product uuid;
  v_default boolean;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required.'; end if;
  if p_variant is null or jsonb_typeof(p_variant) <> 'object' then raise exception 'Enter valid variant details.'; end if;
  v_id := coalesce(nullif(p_variant->>'id','')::uuid, gen_random_uuid());
  v_product := (p_variant->>'product_id')::uuid;
  v_default := coalesce((p_variant->>'is_default')::boolean, false);
  perform id from public.products where id = v_product for update;
  if not found then raise exception 'Product not found.'; end if;
  select product_id into v_existing_product from public.product_variants where id = v_id;
  if found and v_existing_product <> v_product then raise exception 'A color variant cannot be moved to another product.'; end if;
  if v_default then update public.product_variants set is_default = false where product_id = v_product and id <> v_id and is_default; end if;
  insert into public.product_variants(id,product_id,color_name,color_hex,image_path,image_source,price,stock,is_default,position)
  values (v_id,v_product,trim(p_variant->>'color_name'),p_variant->>'color_hex',p_variant->>'image_path',coalesce(p_variant->>'image_source','local'),(p_variant->>'price')::numeric,(p_variant->>'stock')::integer,v_default,coalesce((p_variant->>'position')::integer,0))
  on conflict(id) do update set color_name=excluded.color_name,color_hex=excluded.color_hex,image_path=excluded.image_path,image_source=excluded.image_source,price=excluded.price,stock=excluded.stock,is_default=excluded.is_default,position=excluded.position;
  return v_id;
end; $$;
revoke all on function public.admin_save_variant(jsonb) from public;
grant execute on function public.admin_save_variant(jsonb) to authenticated;
commit;
