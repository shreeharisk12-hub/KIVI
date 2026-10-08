import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Minus, Plus, ShoppingBag, Check, ArrowLeft, Heart } from 'lucide-react'
import { useStore } from '../hooks/useStore'
import { ProductImage, Swatches, Busy, Notice } from '../components/UI'
import { authPath, productPath } from '../lib/navigation'
import { defaultVariant, money } from '../lib/utils'
export default function Product() {
  const { slug } = useParams(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams()
  const purchaseLock = useRef(false)
  const {
    products,
    loading,
    error,
    prefix,
    preview,
    changeCart,
    setToast,
    wishlist,
    wishlistBusy,
    toggleWishlist,
  } = useStore()
  const product = products.find((p) => p.slug === slug)
  const [selectedId, setSelectedId] = useState(null),
    [quantity, setQuantity] = useState(1),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('')
  const variant = product?.variants.find((v) => v.id === selectedId) || defaultVariant(product)
  useEffect(() => {
    const chosen =
      product?.variants.find((v) => v.id === params.get('variant')) || defaultVariant(product)
    setSelectedId(chosen?.id)
    setQuantity(Math.max(1, Math.min(Number(params.get('quantity')) || 1, chosen?.stock || 1, 99)))
    setFailure('')
  }, [product?.id, params.get('variant'), params.get('quantity')])
  if (loading) return <Busy />
  if (error)
    return (
      <main className="page">
        <Notice>{error}</Notice>
      </main>
    )
  if (!product || !variant)
    return (
      <main className="page empty">
        <h1>Headphone not found.</h1>
        <Link to={`${prefix}/catalog`}>Explore the collection</Link>
      </main>
    )
  async function add(buy) {
    if (preview) {
      navigate(authPath(productPath(product, variant, quantity)))
      return
    }
    if (purchaseLock.current) return
    purchaseLock.current = true
    setBusy(true)
    setFailure('')
    try {
      await changeCart(variant.id, quantity, 'add')
      setToast(`${product.name} in ${variant.color_name} added to your bag.`)
      if (buy) navigate(`${prefix}/checkout`)
    } catch (e) {
      setFailure(e.message)
    } finally {
      purchaseLock.current = false
      setBusy(false)
    }
  }
  return (
    <main className="page">
      <Link className="back-link" to={`${prefix}/catalog`}>
        <ArrowLeft size={16} />
        The collection
      </Link>
      <div className="product-detail">
        <div className="detail-image">
          <ProductImage name={product.name} variant={variant} />
          <span className="eyebrow">{variant.color_name}</span>
        </div>
        <div className="detail-info">
          <div className="eyebrow">{product.category}</div>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="detail-price">
            {money(variant.price)}
            <small>Demo catalog price</small>
          </div>
          <div className="detail-color">
            <strong>Finish — {variant.color_name}</strong>
            <Swatches
              variants={product.variants}
              selected={variant}
              onSelect={(v) => {
                setSelectedId(v.id)
                setQuantity(1)
                setParams({ variant: v.id, quantity: '1' }, { replace: true })
              }}
            />
          </div>
          <p className={`stock ${variant.stock > 0 ? 'available' : ''}`}>
            <Check size={15} />
            {preview
              ? 'Preview inventory (illustrative)'
              : variant.stock > 0
                ? `${variant.stock} available`
                : 'Currently sold out'}
          </p>
          <div className="quantity">
            <button
              aria-label="Decrease quantity"
              disabled={busy || quantity <= 1}
              onClick={() => setQuantity((q) => q - 1)}
            >
              <Minus size={16} />
            </button>
            <span>{quantity}</span>
            <button
              aria-label="Increase quantity"
              disabled={busy || quantity >= Math.min(variant.stock, 99)}
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus size={16} />
            </button>
          </div>
          {failure && <Notice>{failure}</Notice>}
          <div className="detail-buttons">
            <button
              className="button"
              disabled={busy || (!preview && !variant.stock)}
              onClick={() => add(false)}
            >
              <ShoppingBag size={17} />
              {busy ? 'Updating bag…' : 'Add to bag'}
            </button>
            <button
              className="button button-outline"
              disabled={busy || (!preview && !variant.stock)}
              onClick={() => add(true)}
            >
              Buy now
              <ArrowRight size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={
                wishlist.includes(product.id) ? 'Remove from wishlist' : 'Save to wishlist'
              }
              aria-pressed={wishlist.includes(product.id)}
              disabled={wishlistBusy.includes(product.id)}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart size={19} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
          {preview && (
            <p className="muted">
              Choose a finish, then sign in to save it to your bag and place a demo order.
            </p>
          )}
          <div className="demo-note">
            {product.brand === 'SONY'
              ? 'Supplied project imagery, not an official Sony asset claim. Retailer demo price.'
              : 'Fictional KIVI concept. Specifications and prices are illustrative demo data.'}
          </div>
        </div>
      </div>
      <section className="specifications">
        <div>
          <div className="eyebrow">A CLOSER LOOK</div>
          <h2>The details.</h2>
        </div>
        <dl>
          {Object.entries(product.specifications || {}).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
