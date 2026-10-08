import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { groundResponse } from '../supabase/functions/shopping-assistant/grounding.js'
const catalog = JSON.parse(readFileSync('supabase/seed/catalog.json', 'utf8')).map(
  ({ variants, ...p }) => ({ ...p, product_variants: variants }),
)
test('Assistant refuses invented product IDs and unsupported intents', () => {
  assert.throws(() => groundResponse({ intent: 'recommend', product_ids: ['invented'] }, catalog))
  assert.throws(() => groundResponse({ intent: 'sql', product_ids: [] }, catalog))
})
test('Model-authored stock, prices and specifications never appear in the grounded answer', () => {
  const answer = groundResponse(
    {
      intent: 'availability',
      product_ids: [catalog[0].id],
      explanation: 'Fake headphones cost ₹1 and have 99999 stock.',
    },
    catalog,
  )
  assert.ok(answer.includes('₹34,990'))
  assert.ok(answer.includes('20 available'))
  assert.ok(!answer.includes('99999'))
  assert.ok(!answer.includes('Fake headphones'))
})
test('Comparisons use the database specs and respond correctly to sold-out inventory', () => {
  const modified = structuredClone(catalog)
  modified[1].product_variants[0].stock = 0
  const answer = groundResponse(
    { intent: 'compare', product_ids: [modified[1].id, modified[2].id] },
    modified,
  )
  assert.ok(answer.includes('Arctic: ₹14,990 · out of stock'))
  assert.ok(answer.includes('Fictional product.'))
  assert.ok(answer.includes('50 mm dynamic'))
  assert.ok(answer.includes('45 mm dynamic'))
})
