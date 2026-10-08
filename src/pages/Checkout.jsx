import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useStore } from '../hooks/useStore'
import { useAuth } from '../hooks/useAuth'
import { store } from '../services/store'
import { money, paymentMethods } from '../lib/utils'
import { Notice, ProductImage, Busy } from '../components/UI'
const addressFields = [
  ['full_name', 'Full name', 'name'],
  ['phone', 'Phone number', 'tel'],
  ['line1', 'Street address', 'address-line1'],
  ['line2', 'Apartment, suite (optional)', 'address-line2'],
  ['city', 'City', 'address-level2'],
  ['state', 'State', 'address-level1'],
  ['postal_code', 'Postal code', 'postal-code'],
]
export function AddressFields({ values = {}, onChange }) {
  return (
    <div className="address-fields">
      {addressFields.map(([key, label, autocomplete]) => (
        <label key={key}>
          {label}
          <input
            name={key}
            autoComplete={autocomplete}
            type={key === 'phone' ? 'tel' : 'text'}
            maxLength={key === 'postal_code' ? 10 : key === 'phone' ? 20 : 160}
            minLength={key === 'postal_code' ? 3 : undefined}
            required={key !== 'line2'}
            {...(onChange
              ? {
                  value: values[key] || '',
                  onChange: (e) => onChange({ ...values, [key]: e.target.value }),
                }
              : { defaultValue: values[key] || '' })}
          />
        </label>
      ))}
    </div>
  )
}
export default function Checkout() {
  const { cart, cartLoading, cartError, refreshCart, prefix, preview } = useStore(),
    { user } = useAuth(),
    navigate = useNavigate()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [addresses, setAddresses] = useState([]),
    [values, setValues] = useState({}),
    [paymentMethod, setPaymentMethod] = useState('demo_card')
  const inFlight = useRef(false)
  useEffect(() => {
    if (!preview)
      store
        .addresses()
        .then(setAddresses)
        .catch((e) => setError(e.message))
  }, [preview])
  const unavailable = cart.some((x) => !x.product_variants?.products)
  const subtotal = cart.reduce(
      (s, x) => s + x.quantity * Number(x.product_variants?.price || 0),
      0,
    ),
    shipping = subtotal >= 20000 ? 0 : 199
  async function submit(e) {
    e.preventDefault()
    if (inFlight.current || preview) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      if (!user) throw new Error('Sign in before placing an order.')
      const signature =
        JSON.stringify(values) +
        paymentMethod +
        JSON.stringify(cart.map((x) => [x.variant_id, x.quantity]))
      let pending
      try {
        pending = JSON.parse(sessionStorage.getItem('kivi-checkout') || 'null')
      } catch {}
      const key = pending?.signature === signature ? pending.key : crypto.randomUUID()
      sessionStorage.setItem('kivi-checkout', JSON.stringify({ key, signature }))
      const id = await store.checkout({ ...values, country: 'India' }, key, paymentMethod)
      sessionStorage.removeItem('kivi-checkout')
      await refreshCart()
      navigate(`${prefix}/orders/${id}`, { state: { placed: true } })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      inFlight.current = false
    }
  }
  if (cartLoading) return <Busy text="Preparing your checkout…" />
  return (
    <main className="page">
      <div className="eyebrow">ONE STEP CLOSER</div>
      <h1>Make it yours.</h1>
      <div className="demo-banner">
        <ShieldCheck size={20} />
        <div>
          <strong>Demo checkout</strong>
          <p>No real payment or shipment. This creates a demo order and reserves demo inventory.</p>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      {cartError && (
        <Notice>
          Your bag could not load: {cartError}{' '}
          <button className="text-button" onClick={refreshCart}>
            Try again
          </button>
        </Notice>
      )}
      {unavailable && (
        <Notice>
          A headphone in your bag is unavailable.{' '}
          <Link to={`${prefix}/cart`}>Remove it before checkout.</Link>
        </Notice>
      )}
      {!cart.length ? (
        <div className="empty">
          <p>Your bag is empty.</p>
          <Link className="button" to={`${prefix}/catalog`}>
            Explore the collection
          </Link>
        </div>
      ) : (
        <form className="checkout-layout" onSubmit={submit}>
          <section>
            <h2>Where should it go?</h2>
            {addresses.length > 0 && (
              <label>
                Saved address
                <select
                  defaultValue=""
                  onChange={(e) => setValues(addresses.find((a) => a.id === e.target.value) || {})}
                >
                  <option value="">Use a new address</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} · {a.line1}, {a.city}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <AddressFields values={values} onChange={setValues} />
            <h2 className="payment-title">Payment method.</h2>
            <label>
              Demo payment method
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={busy}
              >
                {Object.entries(paymentMethods)
                  .filter(([key]) => key !== 'demo')
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <p className="muted">
              All choices are demo only. No card details, UPI ID or money are collected. Your choice
              is saved with the order.
            </p>
          </section>
          <aside className="summary">
            <h2>Your selection.</h2>
            {cart
              .filter((x) => x.product_variants?.products)
              .map((x) => (
                <div className="checkout-line" key={x.id}>
                  <ProductImage
                    variant={x.product_variants}
                    name={x.product_variants.products.name}
                  />
                  <span>
                    <strong>{x.product_variants.products.name}</strong>
                    <small>
                      {x.product_variants.color_name} × {x.quantity}
                    </small>
                  </span>
                  <b>{money(x.quantity * x.product_variants.price)}</b>
                </div>
              ))}
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div>
              <span>Demo shipping</span>
              <span>{shipping ? money(shipping) : 'Complimentary'}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(subtotal + shipping)}</strong>
            </div>
            <button
              className="button"
              disabled={busy || preview || unavailable || Boolean(cartError)}
            >
              {busy ? 'Placing your demo order…' : 'Place demo order'}
              <ArrowRight size={17} />
            </button>
            <small>The server confirms current prices and inventory.</small>
          </aside>
        </form>
      )}
    </main>
  )
}
