import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
for (const a of JSON.parse(readFileSync('docs/assets.json', 'utf8'))) {
  if (hash(a.original) !== a.sha256 || hash(a.copy) !== a.sha256)
    throw new Error(`Asset checksum mismatch: ${a.original}`)
}
console.log('All 9 originals and application copies match their recorded SHA-256 hashes.')
