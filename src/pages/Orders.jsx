import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowUpRight, Check, Package } from 'lucide-react'
import { store } from '../services/store'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../hooks/useStore'
import { money, date, statuses, paymentMethods } from '../lib/utils'
import { Busy, Notice, ProductImage } from '../components/UI'
export default function Orders() {
  const { id } = useParams(),
    { prefix, preview } = useStore(),
    location = useLocation(),
    { user } = useAuth()
  const [orders, setOrders] = useState([]),
    [loading, setLoading] = useState(!preview),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0)
  useEffect(() => {
    if (preview) return
    setLoading(true)
    setError('')
    let alive = true
    store
      .orders(user.id)
      .then((o) => {
        if (alive) setOrders(o)
      })
      .catch((e) => {
        if (alive) setError(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [preview, id, reload, user?.id])
  const order = orders.find((o) => o.id === id)
  if (loading) return <Busy text="Finding your orders…" />
  return (
    <main className="page">
      <div className="eyebrow">YOUR LISTENING JOURNEY</div>
      <h1>{id ? 'Follow your frequency.' : 'Your orders.'}</h1>
      {location.state?.placed && (
        <div className="success" role="status">
          Your demo order is placed. No payment was collected.
        </div>
      )}
      <button className="text-button" onClick={() => setReload((n) => n + 1)}>
        Refresh order status
      </button>
      {error && <Notice>{error}</Notice>}
      {preview && (
        <Notice>
          Order history and tracking are available in your authenticated account after backend
          setup.
        </Notice>
      )}
      {id && order ? (
        <>
          <div className="order-heading">
            <div>
              <strong>Order {order.id.slice(0, 8).toUpperCase()}</strong>
              <p>{date(order.created_at)}</p>
            </div>
            <span className="status-pill">{order.status}</span>
            <strong>{money(order.total)}</strong>
          </div>
          <div className="demo-banner">
            <Package size={20} />
            <p>
              Demo tracking — status updates are entered by KIVI administrators. No real courier
              shipment.
            </p>
          </div>
          <ol className="tracking">
            {statuses.map((s, i) => {
              const history = order.order_status_history.find((h) => h.status === s)
              return (
                <li key={s} className={history ? 'complete' : ''}>
                  <span>{history ? <Check size={15} /> : i + 1}</span>
                  <strong>{s}</strong>
                  <small>{history ? date(history.created_at) : 'Pending'}</small>
                </li>
              )
            })}
          </ol>
          {order.status === 'Cancelled' && <Notice>This demo order was cancelled.</Notice>}
          <div className="order-detail-grid">
            <section>
              <h2>Your headphones.</h2>
              {order.order_items.map((x) => (
                <div className="cart-item" key={x.id}>
                  <ProductImage
                    name={x.product_name}
                    variant={{
                      image_path: x.image_path,
                      image_source: x.image_source,
                      color_name: x.color_name,
                    }}
                  />
                  <div>
                    <h3>{x.product_name}</h3>
                    <p>
                      {x.color_name} · Quantity {x.quantity}
                    </p>
                    <p className="muted">{money(x.unit_price)} each</p>
                  </div>
                  <strong>{money(x.unit_price * x.quantity)}</strong>
                </div>
              ))}
              <div className="summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(order.subtotal)}</strong>
                </div>
                <div>
                  <span>Shipping</span>
                  <strong>{money(order.shipping)}</strong>
                </div>
                <div>
                  <span>Demo order total</span>
                  <strong>{money(order.total)}</strong>
                </div>
              </div>
            </section>
            <aside>
              <h2>Delivery details.</h2>
              <address>
                {order.shipping_address.full_name}
                <br />
                {order.shipping_address.line1}
                <br />
                {order.shipping_address.line2 && (
                  <>
                    {order.shipping_address.line2}
                    <br />
                  </>
                )}
                {order.shipping_address.city}, {order.shipping_address.state}
                <br />
                {order.shipping_address.postal_code}
                <br />
                {order.shipping_address.phone}
              </address>
              <p className="muted">
                {order.estimated_delivery
                  ? `Demo estimate: ${date(order.estimated_delivery)}`
                  : 'No estimated delivery date has been provided.'}
              </p>
              <h3>Payment details</h3>
              <p>
                {paymentMethods[order.payment_method] || 'Demo checkout'} · No payment collected
              </p>
              <h3>Status history</h3>
              <ul className="history">
                {[...order.order_status_history]
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                  .map((h) => (
                    <li key={h.id}>
                      <span>{h.status}</span>
                      <small>{new Date(h.created_at).toLocaleString('en-IN')}</small>
                    </li>
                  ))}
              </ul>
            </aside>
          </div>
        </>
      ) : id ? (
        <div className="empty">Order not found or unavailable to your account.</div>
      ) : orders.length ? (
        <div className="orders-list">
          {orders.map((o) => (
            <Link to={`${prefix}/orders/${o.id}`} key={o.id}>
              <div>
                <strong>Order {o.id.slice(0, 8).toUpperCase()}</strong>
                <small>
                  {date(o.created_at)} · {o.order_items.length} item types
                </small>
              </div>
              <span className="status-pill">{o.status}</span>
              <strong>{money(o.total)}</strong>
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Package size={35} />
          <h2>Your first listen is still ahead.</h2>
          <p>No orders yet.</p>
          <Link className="button" to={`${prefix}/catalog`}>
            Explore headphones
          </Link>
        </div>
      )}
    </main>
  )
}
