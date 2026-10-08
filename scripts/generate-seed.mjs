import { readFileSync, writeFileSync } from 'node:fs'
const products = JSON.parse(readFileSync('supabase/seed/catalog.json', 'utf8'))
const value = (v) =>
  v === null
    ? 'null'
    : typeof v === 'boolean' || typeof v === 'number'
      ? String(v)
      : `'${(typeof v === 'object' ? JSON.stringify(v) : v).replaceAll("'", "''")}'`
let sql =
  '-- Project assets; fictional KIVI concepts; all prices are demo retailer prices.\nbegin;\n'
for (const { variants, ...p } of products) {
  const keys = Object.keys(p)
  sql += `insert into public.products (${keys.join(',')}) values (${keys.map((k) => value(p[k])).join(',')}) on conflict(id) do nothing;\n`
  for (const v of variants) {
    const keys = Object.keys(v)
    sql += `insert into public.product_variants (${keys.join(',')}) values (${keys.map((k) => value(v[k])).join(',')}) on conflict(id) do nothing;\n`
  }
}
sql += 'commit;\n'
writeFileSync('supabase/seed.sql', sql)
