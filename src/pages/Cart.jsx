import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useStore } from '../hooks/useStore'
import { ProductImage, Notice, Busy } from '../components/UI'
import { authPath, productPath } from '../lib/navigation'
import { money } from '../lib/utils'
export default function Cart() {
  const { cart, cartLoading, cartError, refreshCart, prefix, changeCart, preview } = useStore()
  const [busy, setBusy] = useState(null),
    [error, setError] = useState('')
  const total = cart.reduce((s, x) => s + Number(x.product_variants?.price || 0) * x.quantity, 0)
  async function update(item, quantity) {
    setBusy(item.id)
    setError('')
    try {
      await changeCart(item.variant_id, quantity)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }
  if (cartLoading) return <Busy text="Opening your bag…" />
  return (
    <main className="page">
      <div className="eyebrow">YOUR NEXT LISTEN</div>
      <h1>Your shopping bag.</h1>
      {preview && (
        <Notice>
          Sign in to keep your bag across visits.{' '}
          <Link to={authPath('/cart')}>Open your account bag →</Link>
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      {cartError && (
        <Notice>
          Your bag could not load: {cartError}{' '}
          <button className="text-button" onClick={refreshCart}>
            Try again
          </button>
        </Notice>
      )}
      {!cart.length ? (
        <div className="empty">
          <ShoppingBag size={35} />
          <h2>Make room for better sound.</h2>
          <p>Your bag is empty.</p>
          <Link className="button" to={`${prefix}/catalog`}>
            Explore headphones <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {cart.map((item) => {
              const v = item.product_variants
              if (!v || !v.products)
                return (
                  <article className="cart-item" key={item.id}>
                    <div>
                      <h3>This headphone is no longer available.</h3>
                      <p>Remove it from your bag to continue.</p>
                    </div>
                    <button
                      className="text-button"
                      disabled={Boolean(busy)}
                      onClick={() => update(item, 0)}
                    >
                      Remove
                    </button>
                  </article>
                )
              return (
                <article className="cart-item" key={item.id}>
                  <ProductImage variant={v} name={v.products.name} />
                  <div>
                    <Link to={productPath(v.products, v, item.quantity, prefix)}>
                      <h3>{v.products.name}</h3>
                    </Link>
                    <p className="muted">
                      {v.color_name} · {money(v.price)} each
                    </p>
                    <div className="quantity">
                      <button
                        aria-label={`Decrease ${v.products.name} quantity`}
                        disabled={Boolean(busy) || item.quantity <= 1}
                        onClick={() => update(item, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`Increase ${v.products.name} quantity`}
                        disabled={Boolean(busy) || item.quantity >= Math.min(v.stock, 99)}
                        onClick={() => update(item, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-price">
                    <strong>{money(v.price * item.quantity)}</strong>
                    <button
                      className="text-button"
                      aria-label={`Remove ${v.products.name}`}
                      disabled={Boolean(busy)}
                      onClick={() => update(item, 0)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              )
            })}
            <Link className="text-button" to={`${prefix}/catalog`}>
              Continue exploring <ArrowRight size={17} />
            </Link>
          </div>
          <aside className="summary">
            <h2>A good choice.</h2>
            <div>
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Demo shipping</span>
              <span>{total >= 20000 ? 'Complimentary' : money(199)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(total + (total >= 20000 ? 0 : 199))}</strong>
            </div>
            <Link className="button" to={`${prefix}/checkout`}>
              Demo checkout <ArrowRight size={17} />
            </Link>
            <p className="muted">
              No payment will be collected. Prices and availability are checked again at checkout.
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}
