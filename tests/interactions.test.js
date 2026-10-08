import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { defaultVariant, nextProduct, normalizeProduct } from '../src/lib/utils.js'
const products = JSON.parse(readFileSync('supabase/seed/catalog.json', 'utf8')).map(
  normalizeProduct,
)
test('Three products and nine color variants use exactly the provided asset paths', () => {
  assert.equal(products.length, 3)
  assert.equal(products.flatMap((p) => p.variants).length, 9)
  for (const p of products)
    for (const v of p.variants) {
      assert.ok(readFileSync(`public/products/${v.image_path}`).length > 0)
      assert.equal(v.product_id, p.id)
    }
})
test('Product navigation wraps in both directions', () => {
  assert.equal(nextProduct(2, 1, 3), 0)
  assert.equal(nextProduct(0, -1, 3), 2)
  assert.equal(nextProduct(0, 1, 0), 0)
})
test('Product switch resets to its own available default finish', () => {
  assert.equal(defaultVariant(products[0]).color_name, 'Midnight Blue')
  assert.equal(defaultVariant(products[1]).color_name, 'Obsidian')
  assert.equal(defaultVariant(products[2]).color_name, 'Heritage Gold')
  const soldOut = structuredClone(products[0])
  soldOut.variants.find((v) => v.is_default).stock = 0
  assert.equal(defaultVariant(soldOut).color_name, 'Matte Black')
})
