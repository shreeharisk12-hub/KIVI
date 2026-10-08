import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
const user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  admin = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const variant = '20000000-0000-4000-8000-000000000001'
const address = {
  full_name: 'Test Listener',
  phone: '9999999999',
  line1: '123 Demo Street',
  line2: '',
  city: 'Pune',
  state: 'Maharashtra',
  postal_code: '411001',
}
let order
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;`,
  )
  for (const f of [
    'supabase/migrations/20261008063943_kivi_relational_commerce.sql',
    'supabase/migrations/20261008064001_kivi_product_storage.sql',
    'supabase/migrations/20261008064009_kivi_wishlists_and_catalog.sql',
    'supabase/migrations/20261008064202_kivi_explicit_rpc_grants.sql',
    'supabase/migrations/20261008073000_demo_payment_methods.sql',
    'supabase/seed.sql',
  ])
    await db.exec(readFileSync(f, 'utf8'))
  await db.query('insert into auth.users(id) values($1),($2),($3)', [user, other, admin])
  await db.query("insert into app_private.user_roles(user_id,role) values($1,'admin')", [admin])
})
after(() => db.close())
async function as(id, fn, role = 'authenticated') {
  await db.exec(`set role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ''])
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}
test('Public catalog contains 3 products, 9 variants; Auth trigger creates owned profile and cart', async () => {
  const p = await as('', () => db.query('select id from public.products'), 'anon')
  assert.equal(p.rows.length, 3)
  const v = await as('', () => db.query('select id from public.product_variants'), 'anon')
  assert.equal(v.rows.length, 9)
  const profiles = await as(user, () => db.query('select id from public.profiles'))
  assert.equal(profiles.rows.length, 1)
  assert.equal(profiles.rows[0].id, user)
  const carts = await as(user, () => db.query('select id from public.carts'))
  assert.equal(carts.rows.length, 1)
})
test('User cannot alter catalog prices, forge orders, promote their role, or alter another profile', async () => {
  const attempted = await as(user, () =>
    db.query('update public.product_variants set price=1 where id=$1 returning id', [variant]),
  )
  assert.equal(attempted.rows.length, 0)
  assert.equal(
    Number(
      (await db.query('select price from public.product_variants where id=$1', [variant])).rows[0]
        .price,
    ),
    34990,
  )
  await assert.rejects(
    as(user, () =>
      db.query(
        "insert into public.orders(user_id,idempotency_key,shipping_address,subtotal,shipping,total) values($1,gen_random_uuid(),'{}',0,0,0)",
        [user],
      ),
    ),
    /permission/,
  )
  await assert.rejects(
    as(user, () => db.query("insert into app_private.user_roles values($1,'admin')", [user])),
    /permission/,
  )
  const changed = await as(user, () =>
    db.query("update public.profiles set display_name='Hacked' where id=$1 returning id", [other]),
  )
  assert.equal(changed.rows.length, 0)
  assert.equal(
    (await as(user, () => db.query('select public.is_admin() as admin'))).rows[0].admin,
    false,
  )
})
test('Cart RPC rejects invalid stock, preserves variants, and combines duplicate additions', async () => {
  await assert.rejects(
    as(user, () => db.query("select public.set_cart_item($1,21,'set')", [variant])),
    /stock/,
  )
  await as(user, () => db.query("select public.set_cart_item($1,1,'add')", [variant]))
  await as(user, () => db.query("select public.set_cart_item($1,1,'add')", [variant]))
  const items = await as(user, () => db.query('select * from public.cart_items'))
  assert.equal(items.rows.length, 1)
  assert.equal(items.rows[0].quantity, 2)
  assert.equal(items.rows[0].variant_id, variant)
  assert.equal((await as(other, () => db.query('select * from public.cart_items'))).rows.length, 0)
  await assert.rejects(
    as(user, () => db.query('update public.cart_items set quantity=99')),
    /permission/,
  )
})
test('Checkout rejects invalid address then computes authoritative price, reserves stock and clears only own cart', async () => {
  await assert.rejects(
    as(user, () => db.query('select public.place_demo_order($1,gen_random_uuid())', [{}])),
    /field/,
  )
  await as(other, () => db.query("select public.set_cart_item($1,1,'add')", [variant]))
  const idempotency = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const result = await as(user, () =>
    db.query('select public.place_demo_order($1,$2) as id', [
      { ...address, total: 1, unit_price: 1 },
      idempotency,
    ]),
  )
  order = result.rows[0].id
  const same = await as(user, () =>
    db.query('select public.place_demo_order($1,$2) as id', [address, idempotency]),
  )
  assert.equal(same.rows[0].id, order)
  const orders = await as(user, () => db.query('select * from public.orders'))
  assert.equal(orders.rows.length, 1)
  assert.equal(Number(orders.rows[0].total), 69980)
  assert.equal(orders.rows[0].status, 'Placed')
  assert.equal(
    (await db.query('select stock from public.product_variants where id=$1', [variant])).rows[0]
      .stock,
    18,
  )
  assert.equal((await as(user, () => db.query('select * from public.cart_items'))).rows.length, 0)
  assert.equal((await as(other, () => db.query('select * from public.cart_items'))).rows.length, 1)
  const item = await as(user, () => db.query('select * from public.order_items'))
  assert.equal(Number(item.rows[0].unit_price), 34990)
  assert.equal(item.rows[0].quantity, 2)
})
test('Cross-user order/item/history access is blocked; non-admin cannot update tracking', async () => {
  for (const t of ['orders', 'order_items', 'order_status_history'])
    assert.equal((await as(other, () => db.query(`select * from public.${t}`))).rows.length, 0)
  await assert.rejects(
    as(other, () => db.query("select public.admin_update_order_status($1,'Confirmed')", [order])),
    /Administrator/,
  )
  await assert.rejects(
    as(user, () => db.query("update public.orders set status='Delivered'")),
    /permission/,
  )
})
test('Failed inventory checkout is atomic, and admin cancellation restocks once', async () => {
  await db.query('update public.product_variants set stock=0 where id=$1', [variant])
  await assert.rejects(
    as(other, () => db.query('select public.place_demo_order($1,gen_random_uuid())', [address])),
    /Inventory/,
  )
  assert.equal((await as(other, () => db.query('select * from public.orders'))).rows.length, 0)
  assert.equal((await as(other, () => db.query('select * from public.cart_items'))).rows.length, 1)
  await db.query('update public.product_variants set stock=18 where id=$1', [variant])
  await assert.rejects(
    as(admin, () => db.query("select public.admin_update_order_status($1,'Shipped')", [order])),
    /one status/,
  )
  await as(admin, () =>
    db.query("select public.admin_update_order_status($1,'Confirmed')", [order]),
  )
  await as(admin, () =>
    db.query("select public.admin_update_order_status($1,'Cancelled')", [order]),
  )
  await as(admin, () =>
    db.query("select public.admin_update_order_status($1,'Cancelled')", [order]),
  )
  assert.equal(
    (await db.query('select stock from public.product_variants where id=$1', [variant])).rows[0]
      .stock,
    20,
  )
  assert.equal(
    (await as(user, () => db.query('select * from public.order_status_history'))).rows.length,
    3,
  )
})
test('Address and storage policies reject writes for other users and unauthorised uploads', async () => {
  await assert.rejects(
    as(user, () =>
      db.query(
        'insert into public.addresses(user_id,full_name,phone,line1,city,state,postal_code) values($1,$2,$3,$4,$5,$6,$7)',
        [
          other,
          address.full_name,
          address.phone,
          address.line1,
          address.city,
          address.state,
          address.postal_code,
        ],
      ),
    ),
    /row-level security/,
  )
  await assert.rejects(
    as(user, () => db.query("insert into storage.objects(bucket_id) values('product-images')")),
    /row-level security/,
  )
  await as(admin, () => db.query("insert into storage.objects(bucket_id) values('product-images')"))
  assert.equal(
    (await as('', () => db.query('select * from storage.objects'), 'anon')).rows.length,
    1,
  )
})
test('Assistant quota is enforced per user in the database', async () => {
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await as(user, () => db.query('select public.consume_ai_request() as allowed'))).rows[0]
        .allowed,
      true,
    )
  assert.equal(
    (await as(user, () => db.query('select public.consume_ai_request() as allowed'))).rows[0]
      .allowed,
    false,
  )
  assert.equal(
    (await as(other, () => db.query('select public.consume_ai_request() as allowed'))).rows[0]
      .allowed,
    true,
  )
})

test('Wishlists persist once per product and remain private to their owner', async () => {
  const product = '10000000-0000-4000-8000-000000000001'
  await as(user, () =>
    db.query(
      'insert into public.wishlist_items(user_id,product_id) values($1,$2) on conflict(user_id,product_id) do nothing',
      [user, product],
    ),
  )
  await as(user, () =>
    db.query(
      'insert into public.wishlist_items(user_id,product_id) values($1,$2) on conflict(user_id,product_id) do nothing',
      [user, product],
    ),
  )
  assert.equal(
    (await as(user, () => db.query('select * from public.wishlist_items'))).rows.length,
    1,
  )
  assert.equal(
    (await as(other, () => db.query('select * from public.wishlist_items'))).rows.length,
    0,
  )
  assert.equal(
    (await as(other, () => db.query('delete from public.wishlist_items returning id'))).rows.length,
    0,
  )
  await assert.rejects(
    as(other, () =>
      db.query('insert into public.wishlist_items(user_id,product_id) values($1,$2)', [
        user,
        product,
      ]),
    ),
    /row-level security/,
  )
  await as(user, () => db.query('delete from public.wishlist_items'))
})
test('Default finish changes are atomic, role-gated, and retain stock and image location', async () => {
  const v = (
    await db.query('select * from public.product_variants where id=$1', [
      '20000000-0000-4000-8000-000000000002',
    ])
  ).rows[0]
  await assert.rejects(
    as(user, () => db.query('select public.admin_save_variant($1)', [{ ...v, is_default: true }])),
    /Administrator/,
  )
  await as(admin, () =>
    db.query('select public.admin_save_variant($1)', [
      { ...v, is_default: true, image_source: 'storage' },
    ]),
  )
  const defaults = await db.query(
    'select id from public.product_variants where product_id=$1 and is_default',
    [v.product_id],
  )
  assert.deepEqual(
    defaults.rows.map((x) => x.id),
    [v.id],
  )
  await assert.rejects(
    as(admin, () =>
      db.query('select public.admin_save_variant($1)', [
        { ...v, id: variant, is_default: true, price: -1 },
      ]),
    ),
    /check constraint/,
  )
  assert.deepEqual(
    (
      await db.query('select id from public.product_variants where product_id=$1 and is_default', [
        v.product_id,
      ])
    ).rows.map((x) => x.id),
    [v.id],
  )
  assert.equal(
    (await db.query('select image_source from public.product_variants where id=$1', [v.id])).rows[0]
      .image_source,
    'storage',
  )
})
test('Anonymous callers cannot execute cart, checkout, quota or administrator mutation RPCs', async () => {
  for (const query of [
    "select public.set_cart_item(null,1,'add')",
    "select public.place_demo_order('{}',gen_random_uuid())",
    'select public.consume_ai_request()',
    "select public.admin_save_variant('{}')",
    "select public.admin_update_order_status(null,'Confirmed')",
  ])
    await assert.rejects(
      as('', () => db.query(query), 'anon'),
      /permission/,
    )
})

test('Demo payment choices persist; invalid methods and forged paid states are rejected', async () => {
  for (const method of ['demo_card', 'demo_upi', 'demo_cod']) {
    await as(user, () => db.query("select public.set_cart_item($1,1,'set')", [variant]))
    const key = crypto.randomUUID()
    const id = (
      await as(user, () =>
        db.query('select public.place_demo_order($1,$2,$3) as id', [
          { ...address, payment_status: 'paid', total: 1 },
          key,
          method,
        ]),
      )
    ).rows[0].id
    const saved = (
      await as(user, () =>
        db.query('select payment_method,payment_status,total from public.orders where id=$1', [id]),
      )
    ).rows[0]
    assert.equal(saved.payment_method, method)
    assert.equal(saved.payment_status, 'not_collected')
    assert.equal(Number(saved.total), 34990)
    const same = (
      await as(user, () =>
        db.query('select public.place_demo_order($1,$2,$3) as id', [address, key, method]),
      )
    ).rows[0].id
    assert.equal(same, id)
    await assert.rejects(
      as(user, () => db.query("update public.orders set payment_status='paid' where id=$1", [id])),
      /permission/,
    )
    await as(admin, () => db.query("select public.admin_update_order_status($1,'Cancelled')", [id]))
  }
  await as(user, () => db.query("select public.set_cart_item($1,1,'set')", [variant]))
  const before = (await as(user, () => db.query('select count(*) as n from public.orders'))).rows[0]
    .n
  await assert.rejects(
    as(user, () =>
      db.query('select public.place_demo_order($1,gen_random_uuid(),$2)', [
        address,
        'real_payment',
      ]),
    ),
    /supported demo payment/,
  )
  assert.equal(
    (await as(user, () => db.query('select count(*) as n from public.orders'))).rows[0].n,
    before,
  )
  assert.equal((await as(user, () => db.query('select * from public.cart_items'))).rows.length, 1)
})
