begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,20971520,array['image/png','image/webp','image/jpeg']) on conflict(id) do nothing;
create policy kivi_public_images on storage.objects for select to anon,authenticated using(bucket_id='product-images');
create policy kivi_admin_image_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_admin());
create policy kivi_admin_image_update on storage.objects for update to authenticated using(bucket_id='product-images' and public.is_admin()) with check(bucket_id='product-images' and public.is_admin());
create policy kivi_admin_image_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_admin());
commit;
