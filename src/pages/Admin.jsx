import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../hooks/useStore'
import { store } from '../services/store'
import { statuses, money, paymentMethods } from '../lib/utils'
import { Notice, Dialog, Busy } from '../components/UI'
export default function Admin() {
  const { admin, adminLoading } = useAuth(),
    { refresh, setToast } = useStore()
  const [products, setProducts] = useState([])
  const [tab, setTab] = useState('products'),
    [orders, setOrders] = useState([]),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(null),
    [kind, setKind] = useState('product'),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    if (admin) {
      store
        .allOrders()
        .then(setOrders)
        .catch((e) => setError(e.message))
      store
        .adminProducts()
        .then(setProducts)
        .catch((e) => setError(e.message))
    }
  }, [admin])
  if (adminLoading) return <Busy text="Checking administrator access…" />
  if (!admin)
    return (
      <main className="page empty">
        <h1>Administrator access required.</h1>
        <p>Your account is not authorized to manage this store.</p>
      </main>
    )
  function edit(value, type) {
    setKind(type)
    setEditing(value)
  }
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const form = new FormData(e.currentTarget)
      const f = Object.fromEntries([...form].filter(([key]) => key !== 'image_file'))
      let values
      if (kind === 'product') {
        values = {
          ...f,
          id: editing.id || crypto.randomUUID(),
          position: Number(f.position),
          active: f.active === 'true',
          is_demo: true,
          specifications: JSON.parse(f.specifications || '{}'),
        }
        if (!values.slug.match(/^[a-z0-9-]+$/))
          throw new Error('Use lowercase letters, numbers, and hyphens in the product slug.')
        await store.saveProduct(values)
      } else {
        values = {
          ...f,
          id: editing.id || crypto.randomUUID(),
          product_id: editing.product_id,
          image_source: f.image_source || editing.image_source || 'local',
          price: Number(f.price),
          stock: Number(f.stock),
          position: Number(f.position),
          is_default: f.is_default === 'true',
        }
        const file = form.get('image_file')
        if (file?.size) {
          await store.uploadImage(values.image_path, file)
          values.image_source = 'storage'
        }
        await store.saveVariant(values)
      }
      await refresh()
      setProducts(await store.adminProducts())
      setEditing(null)
      setToast('Catalog updated.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function uploadProjectImages() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/preview-catalog.json')
      if (!response.ok) throw new Error('Project asset list could not load.')
      const catalog = await response.json()
      const current = await store.adminProducts()
      for (const original of catalog)
        for (const asset of original.variants) {
          const variant = current.flatMap((p) => p.variants).find((v) => v.id === asset.id)
          if (!variant) continue
          const image = await fetch(`/products/${asset.image_path}`)
          if (!image.ok) throw new Error(`The original ${asset.color_name} image could not load.`)
          await store.uploadImage(asset.image_path, await image.blob())
          await store.saveVariant({
            ...variant,
            image_path: asset.image_path,
            image_source: 'storage',
          })
        }
      setProducts(await store.adminProducts())
      await refresh({ quiet: true })
      setToast('Project images uploaded to Supabase Storage.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function status(id, status) {
    setBusy(true)
    setError('')
    try {
      await store.status(id, status)
      setOrders(await store.allOrders())
      setToast('Demo order status updated.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="page">
      <div className="eyebrow">KIVI STUDIO</div>
      <h1>A considered collection, managed.</h1>
      <div className="tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Products & variants
        </button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
          Demo orders
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {tab === 'products' ? (
        <>
          <button
            className="button admin-add"
            onClick={() =>
              edit(
                {
                  name: '',
                  brand: 'KIVI',
                  category: 'Wireless Headphones',
                  background: '#142e40',
                  accent: '#90b4c6',
                  position: products.length,
                  active: true,
                  specifications: {},
                },
                'product',
              )
            }
          >
            Add product
          </button>
          <button
            className="button button-outline admin-add"
            disabled={busy}
            onClick={uploadProjectImages}
          >
            {busy ? 'Updating…' : 'Upload the nine project images'}
          </button>
          <div className="admin-products">
            {products.map((p) => (
              <article className="panel" key={p.id}>
                <div className="admin-title">
                  <h2>
                    {p.name}
                    {!p.active && <small> · Hidden</small>}
                  </h2>
                  <button className="text-button" onClick={() => edit(p, 'product')}>
                    Edit product
                  </button>
                </div>
                {p.variants.map((v) => (
                  <div className="admin-variant" key={v.id}>
                    <span style={{ background: v.color_hex }} />
                    <strong>{v.color_name}</strong>
                    <span>{money(v.price)}</span>
                    <span>{v.stock} in stock</span>
                    <button className="text-button" onClick={() => edit(v, 'variant')}>
                      Edit
                    </button>
                  </div>
                ))}
                <button
                  className="text-button"
                  onClick={() =>
                    edit(
                      {
                        product_id: p.id,
                        color_name: '',
                        color_hex: '#333333',
                        stock: 0,
                        price: 0,
                        position: p.variants.length,
                        is_default: false,
                      },
                      'variant',
                    )
                  }
                >
                  Add color variant
                </button>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <article className="panel" key={o.id}>
              <div className="admin-title">
                <strong>
                  {o.id.slice(0, 8)} · {o.shipping_address.full_name}
                </strong>
                <strong>{money(o.total)}</strong>
              </div>
              <p>
                {o.order_items
                  .map((x) => `${x.product_name} (${x.color_name}) × ${x.quantity}`)
                  .join(', ')}
              </p>
              <p className="muted">
                {o.shipping_address.line1}, {o.shipping_address.city}
              </p>
              <p className="muted">
                {paymentMethods[o.payment_method] || 'Demo checkout'} · No payment collected
              </p>
              <label>
                Demo status
                <select
                  value={o.status}
                  disabled={busy || o.status === 'Cancelled' || o.status === 'Delivered'}
                  onChange={(e) => status(o.id, e.target.value)}
                >
                  {[...statuses, 'Cancelled'].map((s) => (
                    <option
                      key={s}
                      disabled={
                        s !== o.status &&
                        s !== 'Cancelled' &&
                        statuses.indexOf(s) !== statuses.indexOf(o.status) + 1
                      }
                    >
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
          {!orders.length && <p className="empty">No demo orders yet.</p>}
        </div>
      )}
      {editing && (
        <Dialog
          title={kind === 'product' ? 'Product details' : 'Color variant'}
          close={() => {
            if (!busy) setEditing(null)
          }}
        >
          <form onSubmit={save} className="admin-form">
            {kind === 'product' ? (
              <>
                {[
                  ['name', 'Product name'],
                  ['slug', 'URL slug'],
                  ['brand', 'Brand'],
                  ['category', 'Category'],
                  ['display_name', 'Hero display name'],
                  ['headline', 'Hero headline'],
                  ['description', 'Description'],
                  ['keywords', 'Search keywords'],
                  ['background', 'Hero background (hex)'],
                  ['accent', 'Accent (hex)'],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      defaultValue={editing[key] || ''}
                      required
                      maxLength={key === 'description' ? 1000 : 200}
                    />
                  </label>
                ))}
                <label>
                  Specifications (JSON)
                  <textarea
                    name="specifications"
                    defaultValue={JSON.stringify(editing.specifications || {}, null, 2)}
                    rows={5}
                  />
                </label>
                <label>
                  Catalog visibility
                  <select name="active" defaultValue={String(editing.active)}>
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                {[
                  ['color_name', 'Color name'],
                  ['color_hex', 'Swatch hex'],
                  ['image_path', 'Storage path (product/variant.png)'],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input name={key} defaultValue={editing[key] || ''} required maxLength={200} />
                  </label>
                ))}
                <label>
                  Upload an image (optional)
                  <input name="image_file" type="file" accept="image/png,image/jpeg,image/webp" />
                </label>
                <label>
                  Image location
                  <select name="image_source" defaultValue={editing.image_source || 'local'}>
                    <option value="local">Local project asset</option>
                    <option value="storage">Supabase Storage</option>
                  </select>
                </label>
                <label>
                  Price (INR)
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={editing.price}
                    required
                  />
                </label>
                <label>
                  Available inventory
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={editing.stock}
                    required
                  />
                </label>
                <label>
                  Default color
                  <select name="is_default" defaultValue={String(editing.is_default)}>
                    <option value="false">No</option>
                    <option value="true">Yes (replaces the current default)</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Display order
              <input
                name="position"
                type="number"
                min="0"
                defaultValue={editing.position || 0}
                required
              />
            </label>
            {error && <Notice>{error}</Notice>}
            <button className="button" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </Dialog>
      )}
    </main>
  )
}
