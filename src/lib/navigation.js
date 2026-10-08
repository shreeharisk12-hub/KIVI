// Accept only application paths, including when a URL was supplied by the browser.
export function safeReturnPath(value, fallback = '/') {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return fallback
  const url = new URL(value, 'https://kivi.invalid')
  if (
    url.origin !== 'https://kivi.invalid' ||
    !/^\/(?:products\/[a-z0-9-]+|catalog|cart|checkout|account|orders(?:\/[a-f0-9-]+)?|wishlist|admin)?\/?$/.test(
      url.pathname,
    )
  )
    return fallback
  return `${url.pathname}${url.search}${url.hash}`
}
export function authPath(destination) {
  return `/auth?next=${encodeURIComponent(safeReturnPath(destination))}`
}
export function productPath(product, variant, quantity = 1, prefix = '') {
  const params = new URLSearchParams({ variant: variant.id, quantity: String(quantity) })
  return `${prefix}/products/${product.slug}?${params}`
}
