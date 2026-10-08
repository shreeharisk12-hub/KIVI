export const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
export const date = (value) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value))
export const statuses = [
  'Placed',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
]
export function defaultVariant(product) {
  return (
    product?.variants?.find((v) => v.is_default && v.stock > 0) ||
    product?.variants?.find((v) => v.stock > 0) ||
    product?.variants?.[0]
  )
}
export function nextProduct(index, direction, length) {
  return length ? (index + direction + length) % length : 0
}
export function imageUrl(variant) {
  if (!variant) return ''
  if (variant.image_url) return variant.image_url
  if (variant.image_source === 'storage' && import.meta.env?.VITE_SUPABASE_URL)
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${variant.image_path}`
  return `/products/${variant.image_path}`
}
export function normalizeProduct(p) {
  return {
    ...p,
    variants: (p.product_variants || p.variants || []).sort((a, b) => a.position - b.position),
  }
}
export function errorMessage(e) {
  return e?.message || 'Something went wrong. Please try again.'
}

export const paymentMethods = {
  demo: 'Demo checkout',
  demo_card: 'Demo card',
  demo_upi: 'Demo UPI',
  demo_cod: 'Demo cash on delivery',
}
