import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
// Supply these only to this server-side script, never through a VITE_ variable.
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key)
  throw new Error(
    'Set server-side SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload the existing image copies.',
  )
const client = createClient(url, key, { auth: { persistSession: false } })
const catalog = JSON.parse(readFileSync('supabase/seed/catalog.json', 'utf8'))
for (const p of catalog)
  for (const v of p.variants) {
    const { error } = await client.storage
      .from('product-images')
      .upload(v.image_path, readFileSync(`public/products/${v.image_path}`), {
        contentType: 'image/png',
        upsert: true,
      })
    if (error) throw new Error(`Upload failed for ${v.image_path}: ${error.message}`)
    const result = await client
      .from('product_variants')
      .update({ image_source: 'storage' })
      .eq('id', v.id)
      .select('id')
      .single()
    if (result.error) throw result.error
    console.log(`Uploaded ${v.image_path}`)
  }
