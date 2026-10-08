import { client } from '../lib/supabase'
import { normalizeProduct } from '../lib/utils'
async function result(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}
export const store = {
  products: async () =>
    (
      await result(
        client()
          .from('products')
          .select('*, product_variants(*)')
          .eq('active', true)
          .order('position'),
      )
    ).map(normalizeProduct),
  search: async (term) =>
    (
      await result(
        client()
          .from('products')
          .select('*, product_variants(*)')
          .eq('active', true)
          .textSearch('search_vector', term, { type: 'websearch', config: 'simple' })
          .limit(8),
      )
    ).map(normalizeProduct),
  profile: (id) => result(client().from('profiles').select('*').eq('id', id).single()),
  updateProfile: (id, values) =>
    result(client().from('profiles').update(values).eq('id', id).select().single()),
  isAdmin: () => result(client().rpc('is_admin')),
  cart: async () =>
    await result(
      client().from('cart_items').select('*, product_variants(*, products(*))').order('created_at'),
    ),
  mutateCart: (variantId, quantity, mode = 'set') =>
    result(
      client().rpc('set_cart_item', { p_variant: variantId, p_quantity: quantity, p_mode: mode }),
    ),
  checkout: (address, key, paymentMethod = 'demo') =>
    result(
      client().rpc('place_demo_order', {
        p_address: address,
        p_idempotency_key: key,
        p_payment_method: paymentMethod,
      }),
    ),
  orders: (userId) =>
    result(
      client()
        .from('orders')
        .select('*, order_items(*), order_status_history(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ),
  addresses: () =>
    result(client().from('addresses').select('*').order('created_at', { ascending: false })),
  saveAddress: (values) => result(client().from('addresses').insert(values).select().single()),
  updateAddress: (id, values) =>
    result(client().from('addresses').update(values).eq('id', id).select().single()),
  deleteAddress: (id) => result(client().from('addresses').delete().eq('id', id)),
  allOrders: () =>
    result(
      client()
        .from('orders')
        .select('*, order_items(*), order_status_history(*)')
        .order('created_at', { ascending: false }),
    ),
  status: (id, status) =>
    result(client().rpc('admin_update_order_status', { p_order: id, p_status: status })),
  adminProducts: async () =>
    (
      await result(client().from('products').select('*, product_variants(*)').order('position'))
    ).map(normalizeProduct),
  saveProduct: (values) => result(client().from('products').upsert(values).select().single()),
  saveVariant: (values) => result(client().rpc('admin_save_variant', { p_variant: values })),
  wishlist: () => result(client().from('wishlist_items').select('product_id').order('created_at')),
  addWishlist: (userId, productId) =>
    result(
      client()
        .from('wishlist_items')
        .upsert(
          { user_id: userId, product_id: productId },
          { onConflict: 'user_id,product_id', ignoreDuplicates: true },
        ),
    ),
  removeWishlist: (productId) =>
    result(client().from('wishlist_items').delete().eq('product_id', productId)),
  uploadImage: async (path, file) => {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/.test(path))
      throw new Error(
        'Use a product/finish.png, .jpg or .webp path with lowercase letters and hyphens.',
      )
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    )
      throw new Error('Choose a PNG, JPEG or WebP image under 20 MB.')
    return result(
      client()
        .storage.from('product-images')
        .upload(path, file, { upsert: true, contentType: file.type }),
    )
  },
  chat: async (messages) => {
    const { data, error } = await client().functions.invoke('shopping-assistant', {
      body: { messages },
    })
    if (error) {
      let message = error.message
      try {
        const body = await error.context.json()
        message = body.error || message
      } catch {}
      throw new Error(message)
    }
    return data.reply
  },
}
