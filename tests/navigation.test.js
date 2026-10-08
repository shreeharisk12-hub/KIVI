import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnPath, authPath, productPath } from '../src/lib/navigation.js'
test('Sign-in continuation stays inside KIVI and retains the selected finish', () => {
  const path = productPath({ slug: 'aether-x1' }, { id: 'variant-crimson' }, 2)
  assert.equal(safeReturnPath(path), path)
  assert.equal(new URLSearchParams(authPath(path).split('?')[1]).get('next'), path)
  for (const value of [
    'https://evil.invalid',
    '//evil.invalid',
    '/\\evil.invalid',
    '/auth',
    '/preview',
    '/%2f%2fevil.invalid',
    '/account\n',
  ])
    assert.equal(safeReturnPath(value), '/')
  assert.equal(safeReturnPath('/checkout'), '/checkout')
})
